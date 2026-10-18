import { evalExpr, satisfy } from './expr';
import { enabledAt, fireAt, type CompiledNet } from './net';

/**
 * The simulator runs the exact algorithm the generated PLC code runs, one
 * scan at a time. If the two ever disagree, the simulation is lying — the
 * test suite runs both side by side.
 *
 * One scan:
 *   1. on-delay timers look at the marking as it was when the scan started;
 *   2. transitions fire in priority order; each consumes only tokens that
 *      existed when the scan started, so a token moves at most one step per
 *      scan, and a token two transitions compete for goes to the first one;
 *   3. produced tokens land at the end of the scan;
 *   4. outputs = OR of the actions of every marked place.
 */

export interface SimState {
  marking: Record<string, number>;
  inputs: Record<string, boolean>;
  /** Per timed transition: simulated time its on-delay started. Absent = not running. */
  timerStart: Record<string, number>;
  /** Simulated milliseconds. */
  time: number;
  scans: number;
  /** Transitions fired by the last scan (or by the last manual click). */
  lastFired: string[];
}

export function initialSim(c: CompiledNet, keepInputs: Record<string, boolean> = {}): SimState {
  const inputs: Record<string, boolean> = {};
  for (const s of c.inputs.values()) inputs[s.name] = keepInputs[s.name] ?? false;
  return {
    marking: Object.fromEntries(c.places.map((p, i) => [p.id, c.m0[i]])),
    inputs,
    timerStart: {},
    time: 0,
    scans: 0,
    lastFired: [],
  };
}

const markingArray = (c: CompiledNet, s: SimState) => c.places.map((p) => s.marking[p.id] ?? 0);

const guardHolds = (c: CompiledNet, s: SimState, t: number) => {
  const g = c.guards[t];
  return g !== null && evalExpr(g, (n) => s.inputs[n] ?? false);
};

/** Step rule: inputs from tokens not yet consumed; inhibitors and capacities against what the scan has produced so far. */
function canFireInStep(c: CompiledNet, cur: number[], pending: number[], t: number): boolean {
  for (const [p, w] of c.pre[t]) if (cur[p] < w) return false;
  for (const [p, w] of c.inh[t]) if (cur[p] + pending[p] >= w) return false;
  for (const [p, w] of c.post[t]) {
    if (!c.cap[p]) continue;
    const consumed = c.pre[t].find(([q]) => q === p)?.[1] ?? 0;
    if (cur[p] + pending[p] - consumed + w > c.cap[p]) return false;
  }
  return true;
}

export function scan(c: CompiledNet, s: SimState, dtMs: number): SimState {
  const now = s.time;
  const m0 = markingArray(c, s);
  const timerStart = { ...s.timerStart };
  const timerDone: boolean[] = [];

  // 1. Timers
  c.transitions.forEach((t, i) => {
    if (t.delayMs <= 0) return;
    const on = enabledAt(c, m0, i) && guardHolds(c, s, i);
    if (!on) delete timerStart[t.id];
    else if (timerStart[t.id] === undefined) timerStart[t.id] = now;
    timerDone[i] = on && now - timerStart[t.id] >= t.delayMs;
  });

  // 2. Firing, in priority order
  const cur = [...m0];
  const pending = m0.map(() => 0);
  const fired: string[] = [];
  for (const i of c.order) {
    const t = c.transitions[i];
    const ready = t.delayMs > 0 ? timerDone[i] : guardHolds(c, s, i);
    if (!ready || !canFireInStep(c, cur, pending, i)) continue;
    for (const [p, w] of c.pre[i]) cur[p] -= w;
    for (const [p, w] of c.post[i]) pending[p] += w;
    if (t.delayMs > 0) delete timerStart[t.id];
    fired.push(t.id);
  }

  // 3. Production
  const marking = Object.fromEntries(c.places.map((p, k) => [p.id, cur[k] + pending[k]]));
  return { marking, inputs: s.inputs, timerStart, time: now + dtMs, scans: s.scans + 1, lastFired: fired };
}

export type ManualFireResult =
  | { ok: true; state: SimState; changedInputs: string[] }
  | { ok: false; reason: 'not-enabled' | 'guard-unsat' | 'invalid' };

/**
 * A click on a transition: if the marking allows it, switch on whatever the
 * guard needs (closest to the current inputs), fire right away — the on-delay
 * is skipped, the click is the operator saying "time passed" — and let go of
 * the push buttons it pressed.
 */
export function fireManual(c: CompiledNet, s: SimState, transitionId: string): ManualFireResult {
  const i = c.tIndex.get(transitionId);
  if (i === undefined || c.guards[i] === null) return { ok: false, reason: 'invalid' };
  const m0 = markingArray(c, s);
  if (!enabledAt(c, m0, i)) return { ok: false, reason: 'not-enabled' };

  const inputs = { ...s.inputs };
  const changed: string[] = [];
  if (!guardHolds(c, s, i)) {
    const lower = new Map(Object.keys(inputs).map((k) => [k.toLowerCase(), k]));
    const solution = satisfy(c.guards[i]!, (n) => inputs[lower.get(n.toLowerCase()) ?? n] ?? false);
    if (!solution) return { ok: false, reason: 'guard-unsat' };
    for (const [lname, v] of solution) {
      const name = lower.get(lname) ?? lname;
      if ((inputs[name] ?? false) !== v) {
        inputs[name] = v;
        changed.push(name);
      }
    }
  }

  const next = fireAt(c, m0, i);
  const timerStart = { ...s.timerStart };
  delete timerStart[transitionId];
  for (const name of changed) if (c.inputs.get(name.toLowerCase())?.kind === 'button') inputs[name] = false;

  return {
    ok: true,
    changedInputs: changed,
    state: {
      ...s,
      inputs,
      timerStart,
      marking: Object.fromEntries(c.places.map((p, k) => [p.id, next[k]])),
      lastFired: [transitionId],
    },
  };
}

export function outputsOf(c: CompiledNet, marking: Record<string, number>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [name, places] of c.drivers) out[name] = places.some((p) => (marking[c.places[p].id] ?? 0) > 0);
  return out;
}

export type TransitionStatus = 'invalid' | 'disabled' | 'blocked' | 'timing' | 'ready';

/** What the diagram shows on each bar, from the current marking and inputs. */
export function statusOf(
  c: CompiledNet,
  s: SimState,
  transitionId: string,
): { status: TransitionStatus; progress: number } {
  const i = c.tIndex.get(transitionId);
  if (i === undefined || c.guards[i] === null) return { status: 'invalid', progress: 0 };
  if (!enabledAt(c, markingArray(c, s), i)) return { status: 'disabled', progress: 0 };
  if (!guardHolds(c, s, i)) return { status: 'blocked', progress: 0 };
  const t = c.transitions[i];
  if (t.delayMs > 0) {
    const start = s.timerStart[t.id];
    const progress = start === undefined ? 0 : Math.min(1, (s.time - start) / t.delayMs);
    if (progress < 1) return { status: 'timing', progress };
  }
  return { status: 'ready', progress: 1 };
}
