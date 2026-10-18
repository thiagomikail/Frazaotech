import type { Lang } from '../i18n';
import { placeIsBool, type Analysis } from '../model/analyze';
import type { Expr } from '../model/expr';
import { toIdent, type CompiledNet } from '../model/net';

/**
 * Dialect-neutral program: the one place where the Petri-net semantics turn
 * into PLC statements. The printers (IEC ST, Siemens SCL, Rockwell ST,
 * PLCopen XML) only change syntax, so the four outputs behave the same — and
 * the same as the simulator, which runs this exact algorithm.
 */

export type VarType = 'BOOL' | 'INT' | 'TIMER';
export type VarGroup = 'reset' | 'input' | 'output' | 'place' | 'pending' | 'fired' | 'timer';

export interface Decl {
  name: string;
  type: VarType;
  group: VarGroup;
  init?: boolean | number;
  comment: string;
  /** The comment without the "place P1" prefix, for tables that already show the name. */
  detail: string;
  /** Preset of a timer, in ms. */
  ptMs?: number;
}

export type IExpr =
  | { k: 'ref'; name: string }
  | { k: 'bool'; v: boolean }
  | { k: 'int'; v: number }
  | { k: 'not'; e: IExpr }
  | { k: 'and' | 'or' | 'xor'; args: IExpr[] }
  | { k: 'cmp'; op: '>=' | '<=' | '<' | '>'; a: IExpr; b: IExpr }
  | { k: 'add' | 'sub'; a: IExpr; b: IExpr }
  | { k: 'timerDone'; timer: string };

export type IStmt =
  | { k: 'assign'; name: string; e: IExpr }
  | { k: 'if'; cond: IExpr; then: IStmt[]; else?: IStmt[] }
  | { k: 'timer'; timer: string; in: IExpr; ptMs: number }
  | { k: 'comment'; text: string }
  | { k: 'blank' };

export interface Program {
  fbName: string;
  netName: string;
  description: string;
  date: string;
  lang: Lang;
  decls: Decl[];
  reset: string;
  init: IStmt[];
  timers: IStmt[];
  firing: IStmt[];
  produce: IStmt[];
  outputs: IStmt[];
  stats: { places: number; transitions: number; boolPlaces: number; intPlaces: number; timers: number };
  /** Places whose INT can overflow (unbounded net). */
  unbounded: string[];
}

/** Words no generated name may take, in any of the target dialects. */
const RESERVED = new Set(
  `ACTION END_ACTION ARRAY OF AT CASE ELSE END_CASE CONFIGURATION END_CONFIGURATION CONSTANT DO ELSIF END_IF
  END_FOR END_WHILE END_REPEAT EXIT FALSE TRUE FOR FROM FUNCTION END_FUNCTION FUNCTION_BLOCK END_FUNCTION_BLOCK
  IF THEN INITIAL_STEP NOT AND OR XOR MOD PROGRAM END_PROGRAM R_EDGE F_EDGE READ_ONLY READ_WRITE REPEAT UNTIL
  RESOURCE END_RESOURCE RETAIN NON_RETAIN RETURN STEP END_STEP STRUCT END_STRUCT TASK TRANSITION END_TRANSITION
  TO TYPE END_TYPE VAR END_VAR VAR_INPUT VAR_OUTPUT VAR_IN_OUT VAR_TEMP VAR_EXTERNAL VAR_ACCESS VAR_CONFIG
  VAR_GLOBAL WHILE WITH BY ON PRIORITY SINGLE INTERVAL BOOL BYTE WORD DWORD LWORD SINT INT DINT LINT USINT UINT
  UDINT ULINT REAL LREAL TIME DATE TIME_OF_DAY TOD DATE_AND_TIME DT STRING WSTRING ANY TON TOF TP CTU CTD CTUD
  R_TRIG F_TRIG SR RS EN ENO IN PT Q ET BEGIN REGION END_REGION GOTO CONTINUE VERSION TITLE AUTHOR FAMILY NAME
  ORGANIZATION_BLOCK DATA_BLOCK VOID TON_TIME IEC_TIMER XIC XIO OTE OTL OTU ONS OSR OSF RTO RES MOV ADD SUB MUL
  DIV CPT JSR RET SBR TONR TOFR RTOR FBD_TIMER S FS`
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase()),
);

class Namer {
  private used = new Set(RESERVED);
  take(base: string): string {
    let name = base;
    for (let n = 2; this.used.has(name.toLowerCase()); n++) name = `${base}_${n}`;
    this.used.add(name.toLowerCase());
    return name;
  }
}

const TEXT = {
  pt: {
    reset: 'volta a rede à marcação inicial',
    place: 'lugar',
    initial: 'inicial',
    pending: 'fichas a entrar em',
    fired: 'disparou neste ciclo',
    timer: 'atraso de',
    delay: 'atraso',
    noDriver: 'nenhum lugar aciona esta saída',
  },
  en: {
    reset: 'brings the net back to its initial marking',
    place: 'place',
    initial: 'initial',
    pending: 'tokens about to enter',
    fired: 'fired this scan',
    timer: 'on-delay of',
    delay: 'delay',
    noDriver: 'no place drives this output',
  },
} as const;

/** AND/OR with constants folded: no `x AND TRUE` in the output. */
function junction(k: 'and' | 'or', items: IExpr[]): IExpr {
  const neutral = k === 'and';
  const args: IExpr[] = [];
  for (const e of items) {
    if (e.k === 'bool') {
      if (e.v === neutral) continue;
      return { k: 'bool', v: !neutral };
    }
    if (e.k === k) args.push(...e.args);
    else args.push(e);
  }
  return args.length === 0 ? { k: 'bool', v: neutral } : args.length === 1 ? args[0] : { k, args };
}
const and = (args: IExpr[]) => junction('and', args);
const or = (args: IExpr[]) => junction('or', args);
const ref = (name: string): IExpr => ({ k: 'ref', name });
const int = (v: number): IExpr => ({ k: 'int', v });

function guardToIr(e: Expr, inputName: (n: string) => string): IExpr {
  switch (e.k) {
    case 'var':
      return ref(inputName(e.name));
    case 'const':
      return { k: 'bool', v: e.v };
    case 'not':
      return { k: 'not', e: guardToIr(e.e, inputName) };
    default:
      return { k: e.k, args: e.args.map((a) => guardToIr(a, inputName)) };
  }
}

export function describeTransition(c: CompiledNet, t: number, arrow = '->'): string {
  const tr = c.transitions[t];
  const ins = c.pre[t].map(([p, w]) => `${w > 1 ? `${w}x` : ''}${c.places[p].id}`);
  const outs = c.post[t].map(([p, w]) => `${w > 1 ? `${w}x` : ''}${c.places[p].id}`);
  return `${tr.id} ${tr.name}: ${ins.join(' + ') || '-'} ${arrow} ${outs.join(' + ') || '-'}`;
}

export interface BuildOptions {
  fbName: string;
  lang: Lang;
  date: string;
}

export function buildProgram(c: CompiledNet, a: Analysis, opts: BuildOptions): Program {
  if (c.issues.some((i) => i.level === 'error'))
    throw new Error('The net has errors; fix them before generating code.');
  const tx = TEXT[opts.lang];
  const namer = new Namer();
  const decls: Decl[] = [];
  const reset = namer.take('Reset');
  decls.push({ name: reset, type: 'BOOL', group: 'reset', comment: tx.reset, detail: tx.reset });

  const inputName = new Map<string, string>();
  for (const s of c.net.inputs) {
    const name = namer.take(toIdent(s.name, 'in'));
    inputName.set(s.name.toLowerCase(), name);
    decls.push({ name, type: 'BOOL', group: 'input', comment: s.description, detail: s.description });
  }
  const outputName = new Map<string, string>();
  for (const s of c.net.outputs) {
    const name = namer.take(toIdent(s.name, 'out'));
    outputName.set(s.name, name);
    decls.push({ name, type: 'BOOL', group: 'output', comment: s.description, detail: s.description });
  }

  const isBool = c.places.map((_, p) => placeIsBool(c, a, p));
  const receives = c.places.map((_, p) => c.post.some((arcs) => arcs.some(([q]) => q === p)));
  const placeVar = c.places.map((pl, p) => {
    const label = toIdent(pl.name, 'P');
    const name = namer.take(label.toLowerCase() === pl.id.toLowerCase() ? pl.id : toIdent(`${pl.id}_${pl.name}`));
    const init = isBool[p] ? c.m0[p] > 0 : c.m0[p];
    const details = [pl.name !== pl.id ? pl.name : '', pl.description].filter(Boolean).join(' - ');
    decls.push({
      name,
      type: isBool[p] ? 'BOOL' : 'INT',
      group: 'place',
      init,
      comment: `${tx.place} ${pl.id}${details ? ` - ${details}` : ''}`,
      detail: details,
    });
    return name;
  });
  const pendingVar = c.places.map((pl, p) => {
    if (!receives[p]) return '';
    const name = namer.take(`N_${pl.id}`);
    const comment = `${tx.pending} ${pl.id}`;
    decls.push({ name, type: isBool[p] ? 'BOOL' : 'INT', group: 'pending', comment, detail: comment });
    return name;
  });
  const firedVar = c.transitions.map((tr) => {
    const label = toIdent(tr.name, 'T');
    const name = namer.take(label.toLowerCase() === tr.id.toLowerCase() ? tr.id : toIdent(`${tr.id}_${tr.name}`));
    const comment = `${tr.id} ${tx.fired}`;
    decls.push({ name, type: 'BOOL', group: 'fired', comment, detail: comment });
    return name;
  });
  const timerVar = c.transitions.map((tr) => {
    if (tr.delayMs <= 0) return '';
    const name = namer.take(`TON_${tr.id}`);
    const comment = `${tx.timer} ${tr.id}`;
    decls.push({ name, type: 'TIMER', group: 'timer', comment, detail: comment, ptMs: tr.delayMs });
    return name;
  });

  // Marking expressions. A BOOL place is "the token"; an INT place counts them.
  const virtual = (p: number): IExpr => {
    const own = ref(placeVar[p]);
    if (!pendingVar[p]) return own;
    return isBool[p] ? { k: 'or', args: [own, ref(pendingVar[p])] } : { k: 'add', a: own, b: ref(pendingVar[p]) };
  };
  const notVirtual = (p: number): IExpr => ({ k: 'not', e: virtual(p) });

  const enabling = (t: number): IExpr[] => {
    const conds: IExpr[] = [];
    for (const [p, w] of c.pre[t])
      conds.push(isBool[p] ? ref(placeVar[p]) : { k: 'cmp', op: '>=', a: ref(placeVar[p]), b: int(w) });
    for (const [p, w] of c.inh[t])
      conds.push(isBool[p] ? notVirtual(p) : { k: 'cmp', op: '<', a: virtual(p), b: int(w) });
    for (const [p, w] of c.post[t]) {
      const cap = c.cap[p];
      if (!cap) continue;
      const consumed = c.pre[t].find(([q]) => q === p)?.[1] ?? 0;
      if (isBool[p]) {
        if (cap === 1 && consumed === 0) conds.push(notVirtual(p));
      } else {
        const limit = cap + consumed - w;
        conds.push(limit < 0 ? { k: 'bool', v: false } : { k: 'cmp', op: '<=', a: virtual(p), b: int(limit) });
      }
    }
    return conds;
  };

  const guardOf = (t: number): IExpr => guardToIr(c.guards[t]!, (n) => inputName.get(n.toLowerCase()) ?? n);

  const timers: IStmt[] = [];
  c.transitions.forEach((tr, t) => {
    if (!timerVar[t]) return;
    timers.push({ k: 'timer', timer: timerVar[t], in: and([...enabling(t), guardOf(t)]), ptMs: tr.delayMs });
  });

  const firing: IStmt[] = [];
  for (const t of c.order) {
    const tr = c.transitions[t];
    const guardText = c.guards[t] && !(c.guards[t]!.k === 'const' && c.guards[t]!.v) ? ` | ${tr.guard}` : '';
    const delayText = tr.delayMs > 0 ? ` | ${tx.delay} ${tr.delayMs} ms` : '';
    if (firing.length) firing.push({ k: 'blank' });
    firing.push({ k: 'comment', text: `${describeTransition(c, t)}${guardText}${delayText}` });
    const cond = and([...enabling(t), timerVar[t] ? { k: 'timerDone', timer: timerVar[t] } : guardOf(t)]);
    firing.push({ k: 'assign', name: firedVar[t], e: cond });
    const body: IStmt[] = [];
    for (const [p, w] of c.pre[t])
      body.push({
        k: 'assign',
        name: placeVar[p],
        e: isBool[p] ? { k: 'bool', v: false } : { k: 'sub', a: ref(placeVar[p]), b: int(w) },
      });
    for (const [p, w] of c.post[t])
      body.push({
        k: 'assign',
        name: pendingVar[p],
        e: isBool[p] ? { k: 'bool', v: true } : { k: 'add', a: ref(pendingVar[p]), b: int(w) },
      });
    if (timerVar[t]) body.push({ k: 'timer', timer: timerVar[t], in: { k: 'bool', v: false }, ptMs: tr.delayMs });
    firing.push({ k: 'if', cond: ref(firedVar[t]), then: body });
  }

  const produce: IStmt[] = [];
  c.places.forEach((_, p) => {
    if (!pendingVar[p]) return;
    produce.push(
      isBool[p]
        ? { k: 'assign', name: placeVar[p], e: { k: 'or', args: [ref(placeVar[p]), ref(pendingVar[p])] } }
        : { k: 'assign', name: placeVar[p], e: { k: 'add', a: ref(placeVar[p]), b: ref(pendingVar[p]) } },
      { k: 'assign', name: pendingVar[p], e: isBool[p] ? { k: 'bool', v: false } : int(0) },
    );
  });

  const outputs: IStmt[] = [];
  for (const s of c.net.outputs) {
    const drivers = c.drivers.get(s.name) ?? [];
    if (drivers.length === 0) outputs.push({ k: 'comment', text: `${outputName.get(s.name)}: ${tx.noDriver}` });
    outputs.push({
      k: 'assign',
      name: outputName.get(s.name)!,
      e: or(drivers.map((p) => (isBool[p] ? ref(placeVar[p]) : { k: 'cmp', op: '>', a: ref(placeVar[p]), b: int(0) }))),
    });
  }

  const init: IStmt[] = [];
  c.places.forEach((_, p) =>
    init.push({ k: 'assign', name: placeVar[p], e: isBool[p] ? { k: 'bool', v: c.m0[p] > 0 } : int(c.m0[p]) }),
  );
  c.places.forEach((_, p) => {
    if (pendingVar[p]) init.push({ k: 'assign', name: pendingVar[p], e: isBool[p] ? { k: 'bool', v: false } : int(0) });
  });
  c.transitions.forEach((tr, t) => {
    init.push({ k: 'assign', name: firedVar[t], e: { k: 'bool', v: false } });
    if (timerVar[t]) init.push({ k: 'timer', timer: timerVar[t], in: { k: 'bool', v: false }, ptMs: tr.delayMs });
  });

  return {
    fbName: opts.fbName,
    netName: c.net.name,
    description: c.net.description,
    date: opts.date,
    lang: opts.lang,
    decls,
    reset,
    init,
    timers,
    firing,
    produce,
    outputs,
    stats: {
      places: c.places.length,
      transitions: c.transitions.length,
      boolPlaces: isBool.filter(Boolean).length,
      intPlaces: isBool.filter((b) => !b).length,
      timers: timerVar.filter(Boolean).length,
    },
    unbounded: c.places.filter((pl) => a.bounds[pl.id] === null).map((pl) => pl.id),
  };
}

/** IEC duration literal: 1500 → T#1s500ms. */
export function timeLiteral(ms: number): string {
  const parts: string[] = [];
  let rest = Math.max(0, Math.round(ms));
  for (const [unit, size] of [
    ['d', 86_400_000],
    ['h', 3_600_000],
    ['m', 60_000],
    ['s', 1000],
  ] as const) {
    if (rest >= size) {
      parts.push(`${Math.floor(rest / size)}${unit}`);
      rest %= size;
    }
  }
  if (rest || parts.length === 0) parts.push(`${rest}ms`);
  return `T#${parts.join('')}`;
}

/** Text that goes inside a comment must not close it. */
export const safeComment = (s: string) =>
  s
    .replace(/\*\)/g, '* )')
    .replace(/\(\*/g, '( *')
    .replace(/[\r\n]+/g, ' ');

export const sanitizeFbName = (raw: string) => {
  const base = toIdent(raw || 'FB_PetriNet', 'FB');
  return RESERVED.has(base.toLowerCase()) ? `FB_${base}` : base;
};
