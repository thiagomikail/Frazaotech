/**
 * Guard expressions: boolean logic over input names, in IEC 61131-3 syntax.
 *
 *   start AND NOT estop
 *   (sensor_a OR sensor_b) AND door_closed
 *
 * Also accepted, because people and LLMs type them: && || ! & | ^ ~ 1 0.
 * Precedence follows IEC 61131-3: NOT > AND > XOR > OR.
 * Identifiers are case-insensitive, like in every IEC PLC.
 */

export type Expr =
  | { k: 'var'; name: string }
  | { k: 'const'; v: boolean }
  | { k: 'not'; e: Expr }
  | { k: 'and' | 'or' | 'xor'; args: Expr[] };

export interface ExprError {
  message: string;
  pos: number;
}

export type ParseResult = { ok: true; expr: Expr } | { ok: false; error: ExprError };

type TokKind = 'id' | 'and' | 'or' | 'xor' | 'not' | 'true' | 'false' | 'lp' | 'rp' | 'end';
interface Tok {
  t: TokKind;
  v: string;
  pos: number;
}

const WORDS: Record<string, TokKind> = {
  and: 'and',
  or: 'or',
  xor: 'xor',
  not: 'not',
  true: 'true',
  false: 'false',
};

function tokenize(src: string): Tok[] | ExprError {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const word = src.slice(i, j);
      toks.push({ t: WORDS[word.toLowerCase()] ?? 'id', v: word, pos: i });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === '&&' || two === '||') {
      toks.push({ t: two === '&&' ? 'and' : 'or', v: two, pos: i });
      i += 2;
      continue;
    }
    if ((c === '1' || c === '0') && !/[A-Za-z0-9_]/.test(src[i + 1] ?? '')) {
      toks.push({ t: c === '1' ? 'true' : 'false', v: c, pos: i });
      i++;
      continue;
    }
    const single: Record<string, TokKind> = {
      '&': 'and',
      '|': 'or',
      '^': 'xor',
      '!': 'not',
      '~': 'not',
      '(': 'lp',
      ')': 'rp',
    };
    if (single[c]) {
      toks.push({ t: single[c], v: c, pos: i });
      i++;
      continue;
    }
    return { message: `unexpected "${c}"`, pos: i };
  }
  toks.push({ t: 'end', v: '', pos: src.length });
  return toks;
}

export function parseExpr(src: string): ParseResult {
  if (!src.trim()) return { ok: true, expr: { k: 'const', v: true } };
  const toks = tokenize(src);
  if (!Array.isArray(toks)) return { ok: false, error: toks };
  let p = 0;
  const peek = () => toks[p];
  const fail = (message: string): never => {
    throw { message, pos: peek().pos } satisfies ExprError;
  };

  function binary(kind: 'or' | 'xor' | 'and', next: () => Expr): () => Expr {
    return () => {
      const args = [next()];
      while (peek().t === kind) {
        p++;
        args.push(next());
      }
      return args.length === 1 ? args[0] : { k: kind, args };
    };
  }

  function unary(): Expr {
    if (peek().t === 'not') {
      p++;
      return { k: 'not', e: unary() };
    }
    return primary();
  }

  function primary(): Expr {
    const tok = peek();
    if (tok.t === 'id') {
      p++;
      return { k: 'var', name: tok.v };
    }
    if (tok.t === 'true' || tok.t === 'false') {
      p++;
      return { k: 'const', v: tok.t === 'true' };
    }
    if (tok.t === 'lp') {
      p++;
      const e = or();
      if (peek().t !== 'rp') fail('missing ")"');
      p++;
      return e;
    }
    return fail(tok.t === 'end' ? 'incomplete expression' : `unexpected "${tok.v}"`);
  }

  const and = binary('and', unary);
  const xor = binary('xor', and);
  const or = binary('or', xor);

  try {
    const expr = or();
    if (peek().t !== 'end') fail(`unexpected "${peek().v}"`);
    return { ok: true, expr };
  } catch (e) {
    return { ok: false, error: e as ExprError };
  }
}

export function evalExpr(e: Expr, value: (name: string) => boolean): boolean {
  switch (e.k) {
    case 'var':
      return value(e.name);
    case 'const':
      return e.v;
    case 'not':
      return !evalExpr(e.e, value);
    case 'and':
      return e.args.every((a) => evalExpr(a, value));
    case 'or':
      return e.args.some((a) => evalExpr(a, value));
    case 'xor':
      return e.args.reduce((acc, a) => acc !== evalExpr(a, value), false);
  }
}

/** Variable names in the expression, lowercased, without repeats. */
export function varsOf(e: Expr, out = new Set<string>()): Set<string> {
  if (e.k === 'var') out.add(e.name.toLowerCase());
  else if (e.k === 'not') varsOf(e.e, out);
  else if (e.k !== 'const') e.args.forEach((a) => varsOf(a, out));
  return out;
}

/** Constant folding and flattening, so generated code never reads `x AND TRUE`. */
export function simplify(e: Expr): Expr {
  switch (e.k) {
    case 'var':
    case 'const':
      return e;
    case 'not': {
      const inner = simplify(e.e);
      if (inner.k === 'const') return { k: 'const', v: !inner.v };
      if (inner.k === 'not') return inner.e;
      return { k: 'not', e: inner };
    }
    case 'and':
    case 'or': {
      const neutral = e.k === 'and';
      const args: Expr[] = [];
      for (const raw of e.args) {
        const a = simplify(raw);
        if (a.k === 'const') {
          if (a.v === neutral) continue;
          return { k: 'const', v: !neutral };
        }
        if (a.k === e.k) args.push(...a.args);
        else args.push(a);
      }
      if (args.length === 0) return { k: 'const', v: neutral };
      return args.length === 1 ? args[0] : { k: e.k, args };
    }
    case 'xor': {
      let parity = false;
      const args: Expr[] = [];
      for (const raw of e.args) {
        const a = simplify(raw);
        if (a.k === 'const') parity = parity !== a.v;
        else args.push(a);
      }
      if (args.length === 0) return { k: 'const', v: parity };
      const core: Expr = args.length === 1 ? args[0] : { k: 'xor', args };
      return parity ? simplify({ k: 'not', e: core }) : core;
    }
  }
}

export interface PrintStyle {
  ident: (name: string) => string;
  trueLit: string;
  falseLit: string;
}

export const IEC_STYLE: PrintStyle = { ident: (n) => n, trueLit: 'TRUE', falseLit: 'FALSE' };

const isBinary = (e: Expr) => e.k === 'and' || e.k === 'or' || e.k === 'xor';

/**
 * A binary operand of a different operator always gets parentheses —
 * `(a AND b) OR c` instead of leaning on precedence — because that is how
 * people read ladder-minded ST.
 */
export function printExpr(e: Expr, style: PrintStyle = IEC_STYLE): string {
  switch (e.k) {
    case 'var':
      return style.ident(e.name);
    case 'const':
      return e.v ? style.trueLit : style.falseLit;
    case 'not': {
      const inner = printExpr(e.e, style);
      return isBinary(e.e) ? `NOT (${inner})` : `NOT ${inner}`;
    }
    case 'and':
    case 'or':
    case 'xor':
      return e.args
        .map((a) => {
          const s = printExpr(a, style);
          return isBinary(a) && a.k !== e.k ? `(${s})` : s;
        })
        .join(` ${e.k.toUpperCase()} `);
  }
}

/** Rewrites identifiers (e.g. to their canonical spelling). */
export function mapVars(e: Expr, fn: (name: string) => string): Expr {
  switch (e.k) {
    case 'var':
      return { k: 'var', name: fn(e.name) };
    case 'const':
      return e;
    case 'not':
      return { k: 'not', e: mapVars(e.e, fn) };
    default:
      return { k: e.k, args: e.args.map((a) => mapVars(a, fn)) };
  }
}

const MAX_SOLVE_VARS = 14;

/**
 * The input assignment closest to `current` (fewest flips) that makes `e` true.
 * Used by the simulator: clicking a transition switches on whatever its guard
 * needs. Null when unsatisfiable or too many variables to search.
 */
export function satisfy(e: Expr, current: (name: string) => boolean): Map<string, boolean> | null {
  const vars = [...varsOf(e)];
  if (vars.length > MAX_SOLVE_VARS) return null;
  const base = vars.map((v) => current(v));
  let best: { mask: number; flips: number } | null = null;
  for (let mask = 0; mask < 1 << vars.length; mask++) {
    let flips = 0;
    for (let i = 0; i < vars.length; i++) if (mask & (1 << i)) flips++;
    if (best && flips >= best.flips) continue;
    const values = new Map(vars.map((v, i) => [v, base[i] !== Boolean(mask & (1 << i))]));
    if (evalExpr(e, (n) => values.get(n.toLowerCase()) ?? false)) best = { mask, flips };
  }
  if (!best) return null;
  const { mask } = best;
  return new Map(vars.map((v, i) => [v, base[i] !== Boolean(mask & (1 << i))]));
}

/** Can both expressions be true at once? Null when there are too many variables to tell. */
export function canBothHold(a: Expr, b: Expr): boolean | null {
  const both: Expr = { k: 'and', args: [a, b] };
  if (varsOf(both).size > MAX_SOLVE_VARS) return null;
  return satisfy(both, () => false) !== null;
}
