import { mapVars, parseExpr, printExpr, simplify, varsOf, type Expr } from './expr';
import type { Arc, InputKind, InputSignal, OutputSignal, PetriNet, Place, Transition } from './types';

// ─── Identifiers ────────────────────────────────────────────────────────────

/** Any text → an IEC 61131-3 identifier: no accents, no spaces, no leading digit. */
export function toIdent(raw: string, fallback = 'x'): string {
  let s = raw.normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!s) s = fallback;
  if (/^[0-9]/.test(s)) s = `${fallback}_${s}`;
  return s.slice(0, 32).replace(/_+$/, '');
}

export const isPlaceId = (id: string) => /^P\d+$/.test(id);
export const isTransitionId = (id: string) => /^T\d+$/.test(id);

export function nextId(net: PetriNet, prefix: 'P' | 'T' | 'A'): string {
  const pool: { id: string }[] = prefix === 'P' ? net.places : prefix === 'T' ? net.transitions : net.arcs;
  let max = 0;
  for (const { id } of pool) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${max + 1}`;
}

// ─── Issues ─────────────────────────────────────────────────────────────────

export type IssueCode =
  | 'empty-net'
  | 'arc-dangling'
  | 'arc-same-kind'
  | 'inhibitor-from-transition'
  | 'guard-syntax'
  | 'guard-unknown'
  | 'action-unknown'
  | 'duplicate-signal'
  | 'no-tokens'
  | 'source-transition'
  | 'sink-transition'
  | 'isolated-place'
  | 'unused-input'
  | 'unused-output';

export interface Issue {
  level: 'error' | 'warning';
  code: IssueCode;
  /** Element the issue points at (place, transition or arc id, or a signal name). */
  target?: string;
  params?: Record<string, string | number>;
}

// ─── Compiled form, shared by the simulator, the analysis and the code generators ──

export interface CompiledNet {
  net: PetriNet;
  places: Place[];
  transitions: Transition[];
  pIndex: Map<string, number>;
  tIndex: Map<string, number>;
  /** Per transition: [place index, weight]. */
  pre: [number, number][][];
  post: [number, number][][];
  inh: [number, number][][];
  /** Per place; 0 = unlimited. */
  cap: number[];
  m0: number[];
  /** Per transition, with canonical input names and folded constants. Null = invalid guard. */
  guards: (Expr | null)[];
  /** Transition indices in firing order: priority, then position in the list. */
  order: number[];
  /** Lowercased name → signal. */
  inputs: Map<string, InputSignal>;
  outputs: Map<string, OutputSignal>;
  /** Canonical output name → indices of the places that switch it on. */
  drivers: Map<string, number[]>;
  issues: Issue[];
}

export function compile(net: PetriNet): CompiledNet {
  const issues: Issue[] = [];
  const places = net.places;
  const transitions = net.transitions;
  const pIndex = new Map(places.map((p, i) => [p.id, i]));
  const tIndex = new Map(transitions.map((t, i) => [t.id, i]));

  const inputs = new Map<string, InputSignal>();
  const outputs = new Map<string, OutputSignal>();
  for (const s of net.inputs) {
    const key = s.name.toLowerCase();
    if (inputs.has(key))
      issues.push({ level: 'error', code: 'duplicate-signal', target: s.name, params: { name: s.name } });
    inputs.set(key, s);
  }
  for (const s of net.outputs) {
    const key = s.name.toLowerCase();
    if (outputs.has(key) || inputs.has(key))
      issues.push({ level: 'error', code: 'duplicate-signal', target: s.name, params: { name: s.name } });
    outputs.set(key, s);
  }

  if (places.length === 0 && transitions.length === 0) issues.push({ level: 'warning', code: 'empty-net' });

  const pre: [number, number][][] = transitions.map(() => []);
  const post: [number, number][][] = transitions.map(() => []);
  const inh: [number, number][][] = transitions.map(() => []);
  const touched = new Set<number>();

  for (const a of net.arcs) {
    const fp = pIndex.get(a.from);
    const ft = tIndex.get(a.from);
    const tp = pIndex.get(a.to);
    const tt = tIndex.get(a.to);
    if ((fp === undefined && ft === undefined) || (tp === undefined && tt === undefined)) {
      issues.push({ level: 'error', code: 'arc-dangling', target: a.id, params: { arc: a.id } });
      continue;
    }
    const w = Math.max(1, Math.round(a.weight || 1));
    if (fp !== undefined && tt !== undefined) {
      (a.inhibitor ? inh : pre)[tt].push([fp, w]);
      touched.add(fp);
    } else if (ft !== undefined && tp !== undefined) {
      if (a.inhibitor) {
        issues.push({ level: 'error', code: 'inhibitor-from-transition', target: a.id, params: { arc: a.id } });
        continue;
      }
      post[ft].push([tp, w]);
      touched.add(tp);
    } else {
      issues.push({ level: 'error', code: 'arc-same-kind', target: a.id, params: { from: a.from, to: a.to } });
    }
  }

  const usedInputs = new Set<string>();
  const guards = transitions.map((t) => {
    const parsed = parseExpr(t.guard);
    if (!parsed.ok) {
      issues.push({
        level: 'error',
        code: 'guard-syntax',
        target: t.id,
        params: { transition: t.id, message: parsed.error.message, guard: t.guard },
      });
      return null;
    }
    let valid = true;
    for (const v of varsOf(parsed.expr)) {
      if (inputs.has(v)) usedInputs.add(v);
      else {
        valid = false;
        issues.push({ level: 'error', code: 'guard-unknown', target: t.id, params: { transition: t.id, name: v } });
      }
    }
    if (!valid) return null;
    return simplify(mapVars(parsed.expr, (n) => inputs.get(n.toLowerCase())!.name));
  });

  const drivers = new Map<string, number[]>();
  for (const s of net.outputs) drivers.set(s.name, []);
  places.forEach((p, i) => {
    for (const a of p.actions) {
      const out = outputs.get(a.toLowerCase());
      if (!out) {
        issues.push({ level: 'error', code: 'action-unknown', target: p.id, params: { place: p.id, name: a } });
        continue;
      }
      const list = drivers.get(out.name)!;
      if (!list.includes(i)) list.push(i);
    }
  });

  transitions.forEach((t, i) => {
    if (pre[i].length === 0 && inh[i].length === 0)
      issues.push({ level: 'warning', code: 'source-transition', target: t.id, params: { transition: t.id } });
    if (post[i].length === 0)
      issues.push({ level: 'warning', code: 'sink-transition', target: t.id, params: { transition: t.id } });
  });
  places.forEach((p, i) => {
    if (!touched.has(i))
      issues.push({ level: 'warning', code: 'isolated-place', target: p.id, params: { place: p.id } });
  });
  if (places.length > 0 && places.every((p) => p.tokens === 0)) issues.push({ level: 'warning', code: 'no-tokens' });
  for (const s of net.inputs)
    if (!usedInputs.has(s.name.toLowerCase()))
      issues.push({ level: 'warning', code: 'unused-input', target: s.name, params: { name: s.name } });
  for (const [name, list] of drivers)
    if (list.length === 0) issues.push({ level: 'warning', code: 'unused-output', target: name, params: { name } });

  const order = transitions
    .map((t, i) => ({ i, pr: Number.isFinite(t.priority) ? t.priority : i }))
    .sort((a, b) => a.pr - b.pr || a.i - b.i)
    .map((x) => x.i);

  return {
    net,
    places,
    transitions,
    pIndex,
    tIndex,
    pre,
    post,
    inh,
    cap: places.map((p) => Math.max(0, Math.round(p.capacity || 0))),
    m0: places.map((p) => Math.max(0, Math.round(p.tokens || 0))),
    guards,
    order,
    inputs,
    outputs,
    drivers,
    issues,
  };
}

/**
 * Interleaving semantics, guards ignored: is `t` enabled at marking `m`?
 * This is the classic Petri-net rule the analysis explores.
 */
export function enabledAt(c: CompiledNet, m: ArrayLike<number>, t: number): boolean {
  for (const [p, w] of c.pre[t]) if (m[p] < w) return false;
  for (const [p, w] of c.inh[t]) if (m[p] >= w) return false;
  for (const [p, w] of c.post[t]) {
    if (!c.cap[p]) continue;
    const consumed = c.pre[t].find(([q]) => q === p)?.[1] ?? 0;
    if (m[p] - consumed + w > c.cap[p]) return false;
  }
  return true;
}

export function fireAt(c: CompiledNet, m: ArrayLike<number>, t: number): number[] {
  const next = Array.from(m);
  for (const [p, w] of c.pre[t]) next[p] -= w;
  for (const [p, w] of c.post[t]) next[p] += w;
  return next;
}

// ─── Normalization of untrusted JSON (LLM answers, imported files) ──────────

const str = (v: unknown, max = 200): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '';

const int = (v: unknown, def: number, min: number, max: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def;
};

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

export interface NormalizeReport {
  createdInputs: string[];
  createdOutputs: string[];
  droppedArcs: number;
}

/**
 * Turns whatever JSON arrived into a well-formed net: ids P1…/T1…, canonical
 * signal names, guards re-printed in IEC syntax, arcs that point somewhere.
 * Signals that a guard or an action mentions but nobody declared are created —
 * LLMs forget to list them more often than they get them wrong.
 */
export function normalizeNet(raw: unknown): { net: PetriNet; report: NormalizeReport } {
  const r = rec(raw);
  const report: NormalizeReport = { createdInputs: [], createdOutputs: [], droppedArcs: 0 };
  const taken = new Set<string>();
  const inputs: InputSignal[] = [];
  const outputs: OutputSignal[] = [];
  const inputByKey = new Map<string, InputSignal>();
  const outputByKey = new Map<string, OutputSignal>();

  const uniqueName = (base: string) => {
    let name = base;
    for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base}_${n}`;
    taken.add(name.toLowerCase());
    return name;
  };

  const kindOf = (v: unknown): InputKind => (v === 'button' || v === 'switch' ? v : 'sensor');

  for (const item of list(r.inputs)) {
    const s = rec(item);
    const base = toIdent(str(s.name) || str(s.id), 'in');
    if (inputByKey.has(base.toLowerCase())) continue;
    const sig: InputSignal = { name: uniqueName(base), description: str(s.description, 300), kind: kindOf(s.kind) };
    inputs.push(sig);
    inputByKey.set(base.toLowerCase(), sig);
  }
  for (const item of list(r.outputs)) {
    const s = rec(item);
    const base = toIdent(str(s.name) || str(s.id), 'out');
    if (outputByKey.has(base.toLowerCase())) continue;
    const sig: OutputSignal = { name: uniqueName(base), description: str(s.description, 300) };
    outputs.push(sig);
    outputByKey.set(base.toLowerCase(), sig);
  }

  const inputFor = (name: string) => {
    const key = toIdent(name, 'in').toLowerCase();
    let sig = inputByKey.get(key);
    if (!sig) {
      sig = { name: uniqueName(toIdent(name, 'in')), description: '', kind: 'sensor' };
      inputs.push(sig);
      inputByKey.set(key, sig);
      report.createdInputs.push(sig.name);
    }
    return sig.name;
  };
  const outputFor = (name: string) => {
    const key = toIdent(name, 'out').toLowerCase();
    let sig = outputByKey.get(key);
    if (!sig) {
      sig = { name: uniqueName(toIdent(name, 'out')), description: '' };
      outputs.push(sig);
      outputByKey.set(key, sig);
      report.createdOutputs.push(sig.name);
    }
    return sig.name;
  };

  // Ids: keep P<n>/T<n> when given, number the rest after the highest one.
  const assignIds = (items: Record<string, unknown>[], prefix: 'P' | 'T') => {
    const re = new RegExp(`^${prefix}(\\d+)$`, 'i');
    const used = new Set<string>();
    const out: string[] = [];
    let max = 0;
    for (const it of items) {
      const m = re.exec(str(it.id));
      if (m) max = Math.max(max, Number(m[1]));
    }
    for (const it of items) {
      const m = re.exec(str(it.id));
      let id = m ? `${prefix}${Number(m[1])}` : '';
      if (!id || used.has(id)) id = `${prefix}${++max}`;
      used.add(id);
      out.push(id);
    }
    return out;
  };

  const rawPlaces = list(r.places).map(rec);
  const rawTransitions = list(r.transitions).map(rec);
  const placeIds = assignIds(rawPlaces, 'P');
  const transitionIds = assignIds(rawTransitions, 'T');
  const alias = new Map<string, string>();
  rawPlaces.forEach((p, i) => {
    for (const key of [str(p.id), str(p.name)])
      if (key && !alias.has(key.toLowerCase())) alias.set(key.toLowerCase(), placeIds[i]);
  });
  rawTransitions.forEach((t, i) => {
    for (const key of [str(t.id), str(t.name)])
      if (key && !alias.has(key.toLowerCase())) alias.set(key.toLowerCase(), transitionIds[i]);
  });
  placeIds.forEach((id) => alias.set(id.toLowerCase(), id));
  transitionIds.forEach((id) => alias.set(id.toLowerCase(), id));

  const places: Place[] = rawPlaces.map((p, i) => ({
    id: placeIds[i],
    name: str(p.name, 40) || placeIds[i],
    description: str(p.description ?? p.label, 300),
    tokens: int(p.tokens ?? p.initialTokens ?? p.marking, 0, 0, 999),
    capacity: int(p.capacity, 0, 0, 999),
    actions: [
      ...new Set(
        list(p.actions ?? p.outputs)
          .map((a) => str(a))
          .filter(Boolean)
          .map(outputFor),
      ),
    ],
    ...(num(p.x) !== undefined && num(p.y) !== undefined ? { x: num(p.x), y: num(p.y) } : {}),
  }));

  const transitions: Transition[] = rawTransitions.map((t, i) => {
    const source = str(t.guard ?? t.condition, 1000);
    const parsed = parseExpr(source);
    const guard = parsed.ok ? printExpr(mapVars(parsed.expr, inputFor)) : source;
    return {
      id: transitionIds[i],
      name: str(t.name, 40) || transitionIds[i],
      description: str(t.description ?? t.label, 300),
      guard: guard === 'TRUE' ? '' : guard,
      delayMs: int(t.delayMs ?? t.delay_ms ?? t.delay, 0, 0, 86_400_000),
      priority: int(t.priority, i + 1, 0, 999),
      ...(num(t.x) !== undefined && num(t.y) !== undefined ? { x: num(t.x), y: num(t.y) } : {}),
    };
  });

  const arcs: Arc[] = [];
  const seen = new Set<string>();
  for (const item of list(r.arcs)) {
    const a = rec(item);
    const from = alias.get(str(a.from ?? a.source).toLowerCase());
    const to = alias.get(str(a.to ?? a.target).toLowerCase());
    const inhibitor = a.inhibitor === true;
    const valid =
      from && to && ((isPlaceId(from) && isTransitionId(to)) || (!inhibitor && isTransitionId(from) && isPlaceId(to)));
    const key = `${from}>${to}>${inhibitor}`;
    if (!valid || seen.has(key)) {
      report.droppedArcs++;
      continue;
    }
    seen.add(key);
    arcs.push({
      id: `A${arcs.length + 1}`,
      from: from!,
      to: to!,
      weight: int(a.weight, 1, 1, 99),
      ...(inhibitor ? { inhibitor } : {}),
    });
  }

  const layout = rec(r.layout);
  const net: PetriNet = {
    name: str(r.name, 80),
    description: str(r.description, 600),
    inputs,
    outputs,
    places,
    transitions,
    arcs,
    ...(layout.direction === 'TB' || layout.direction === 'LR'
      ? {
          layout: {
            direction: layout.direction,
            routes: sanitizeRoutes(layout.routes),
            orthogonal: list(layout.orthogonal).filter((x): x is string => typeof x === 'string'),
          },
        }
      : {}),
  };
  return { net, report };
}

function sanitizeRoutes(v: unknown): Record<string, { x: number; y: number }[]> {
  const out: Record<string, { x: number; y: number }[]> = {};
  for (const [k, pts] of Object.entries(rec(v))) {
    const clean = list(pts)
      .map(rec)
      .filter((p) => num(p.x) !== undefined && num(p.y) !== undefined)
      .map((p) => ({ x: p.x as number, y: p.y as number }));
    if (clean.length) out[k] = clean;
  }
  return out;
}

/** The net without positions, for the LLM and for change detection. */
export function structuralJson(net: PetriNet): string {
  return JSON.stringify({
    name: net.name,
    description: net.description,
    inputs: net.inputs,
    outputs: net.outputs,
    places: net.places.map(({ x: _x, y: _y, ...p }) => p),
    transitions: net.transitions.map(({ x: _x, y: _y, ...t }) => t),
    arcs: net.arcs,
  });
}
