import { canBothHold } from './expr';
import { enabledAt, fireAt, type CompiledNet } from './net';

/**
 * Behavioural checks on the reachability graph — the questions an automation
 * engineer asks before downloading code to a machine:
 *
 * - bounded / safe: no place grows without end (safe = at most one token,
 *   so every place fits in a BOOL);
 * - deadlock: a state from which nothing can ever fire;
 * - reversible: from any state the machine can get back to the initial one;
 * - dead transitions: never enabled, so probably wired wrong;
 * - conflicts: two transitions competing for the same token.
 *
 * Guards and timers are ignored on purpose (classic untimed analysis): an
 * input can always change, so "can this ever happen?" is answered by the
 * structure alone. Unboundedness is detected Karp–Miller style: a new state
 * that strictly covers one of its ancestors can be pumped forever.
 */

export interface DeadlockInfo {
  marking: Record<string, number>;
  /** Transition ids that lead from the initial marking to this state. */
  path: string[];
}

export interface ConflictInfo {
  place: string;
  transitions: string[];
  /** True when the guards can never be true together; null when unknown. */
  exclusive: boolean | null;
  /** The transition the generated code gives the token to. */
  winner: string;
}

export interface Analysis {
  states: number;
  truncated: boolean;
  bounded: boolean | null;
  /** Max tokens per place id; null = unbounded. With `truncated`, a lower bound. */
  bounds: Record<string, number | null>;
  safe: boolean | null;
  deadlocks: DeadlockInfo[];
  deadlockCount: number;
  deadTransitions: string[];
  reversible: boolean | null;
  conflicts: ConflictInfo[];
}

export const MAX_STATES = 20_000;
const MAX_ANCESTORS = 400;
const HUGE = 10_000;

export function analyze(c: CompiledNet, maxStates = MAX_STATES): Analysis {
  const T = c.transitions.length;
  const states: number[][] = [[...c.m0]];
  const parent: number[] = [-1];
  const via: number[] = [-1];
  const index = new Map<string, number>([[c.m0.join(','), 0]]);
  const succ: number[][] = [];
  const maxTok = [...c.m0];
  const unbounded = new Set<number>();
  const everEnabled = new Array<boolean>(T).fill(false);
  const deadlocks: number[] = [];
  const conflictSets = new Map<number, Set<number>>();
  const inhibiting = new Set(c.inh.flatMap((arcs) => arcs.map(([p]) => p)));
  let truncated = false;

  for (let head = 0; head < states.length; head++) {
    const m = states[head];
    const enabled: number[] = [];
    for (let t = 0; t < T; t++) if (enabledAt(c, m, t)) enabled.push(t);
    // A net with no transitions is empty, not stuck.
    if (enabled.length === 0 && T > 0) deadlocks.push(head);

    // Effective conflicts: both enabled here, not enough tokens for both.
    for (let x = 0; x < enabled.length; x++)
      for (let y = x + 1; y < enabled.length; y++)
        for (const [p, w1] of c.pre[enabled[x]]) {
          const w2 = c.pre[enabled[y]].find(([q]) => q === p)?.[1];
          if (w2 !== undefined && m[p] < w1 + w2) {
            const set = conflictSets.get(p) ?? new Set<number>();
            set.add(enabled[x]).add(enabled[y]);
            conflictSets.set(p, set);
          }
        }

    const out: number[] = [];
    for (const t of enabled) {
      everEnabled[t] = true;
      const next = fireAt(c, m, t);
      const key = next.join(',');
      let j = index.get(key);
      if (j === undefined) {
        if (pumps(c, next, head, states, parent, unbounded, inhibiting)) continue;
        if (states.length >= maxStates) {
          truncated = true;
          continue;
        }
        j = states.length;
        states.push(next);
        parent.push(head);
        via.push(t);
        index.set(key, j);
        next.forEach((v, p) => {
          if (v > maxTok[p]) maxTok[p] = v;
        });
      }
      out.push(j);
    }
    succ[head] = out;
  }

  const bounded = unbounded.size > 0 ? false : truncated ? null : true;
  const complete = bounded === true;

  let reversible: boolean | null = null;
  if (complete) {
    const back: number[][] = states.map(() => []);
    succ.forEach((outs, from) => outs.forEach((to) => back[to].push(from)));
    const seen = new Set([0]);
    const queue = [0];
    while (queue.length) for (const prev of back[queue.pop()!]) if (!seen.has(prev)) (seen.add(prev), queue.push(prev));
    reversible = seen.size === states.length;
  }

  const pathTo = (s: number) => {
    const path: string[] = [];
    for (let k = s; parent[k] >= 0; k = parent[k]) path.unshift(c.transitions[via[k]].id);
    return path;
  };

  const conflicts: ConflictInfo[] = [];
  for (const [p, set] of conflictSets) {
    const ts = [...set].sort((a, b) => c.order.indexOf(a) - c.order.indexOf(b));
    let exclusive: boolean | null = true;
    for (let x = 0; x < ts.length && exclusive !== null; x++)
      for (let y = x + 1; y < ts.length; y++) {
        const ga = c.guards[ts[x]];
        const gb = c.guards[ts[y]];
        const both = ga && gb ? canBothHold(ga, gb) : null;
        if (both === null) {
          exclusive = null;
          break;
        }
        if (both) exclusive = false;
      }
    conflicts.push({
      place: c.places[p].id,
      transitions: ts.map((t) => c.transitions[t].id),
      exclusive,
      winner: c.transitions[ts[0]].id,
    });
  }

  return {
    states: states.length,
    truncated,
    bounded,
    bounds: Object.fromEntries(c.places.map((pl, p) => [pl.id, unbounded.has(p) ? null : maxTok[p]])),
    safe: bounded === false ? false : complete ? maxTok.every((v) => v <= 1) : null,
    deadlocks: deadlocks.slice(0, 5).map((s) => ({
      marking: Object.fromEntries(c.places.map((pl, p) => [pl.id, states[s][p]])),
      path: pathTo(s),
    })),
    deadlockCount: deadlocks.length,
    deadTransitions: c.transitions.filter((_, t) => !everEnabled[t]).map((t) => t.id),
    reversible,
    conflicts,
  };
}

/**
 * Does `next` strictly cover the state it came from or one of its ancestors?
 * Then the same firing sequence can repeat forever — unless a place that grew
 * has a capacity or feeds an inhibitor arc: more tokens there can disable a
 * transition, so the cover proves nothing and the search goes on.
 */
function pumps(
  c: CompiledNet,
  next: number[],
  from: number,
  states: number[][],
  parent: number[],
  unbounded: Set<number>,
  inhibiting: Set<number>,
): boolean {
  if (next.some((v) => v > HUGE)) {
    next.forEach((v, p) => v > HUGE && unbounded.add(p));
    return true;
  }
  for (let a = from, steps = 0; a >= 0 && steps < MAX_ANCESTORS; a = parent[a], steps++) {
    const anc = states[a];
    let ge = true;
    let gt = false;
    for (let p = 0; p < next.length && ge; p++) {
      if (next[p] < anc[p]) ge = false;
      else if (next[p] > anc[p]) {
        gt = true;
        if (c.cap[p] || inhibiting.has(p)) ge = false;
      }
    }
    if (ge && gt) {
      next.forEach((v, p) => v > anc[p] && unbounded.add(p));
      return true;
    }
  }
  return false;
}

/**
 * How many tokens each place can hold, for the code generators: a place that
 * provably never holds more than one becomes a BOOL, any other an INT.
 */
export function placeIsBool(c: CompiledNet, a: Analysis, placeIndex: number): boolean {
  const id = c.places[placeIndex].id;
  if (a.bounded !== true || (a.bounds[id] ?? 2) > 1) return false;
  for (let t = 0; t < c.transitions.length; t++)
    for (const arcs of [c.pre[t], c.post[t], c.inh[t]])
      for (const [p, w] of arcs) if (p === placeIndex && w > 1) return false;
  return true;
}
