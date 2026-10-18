import { mapVars, parseExpr, printExpr } from './expr';
import { isPlaceId, isTransitionId, nextId, toIdent } from './net';
import type { Arc, InputSignal, OutputSignal, PetriNet, Place, Point, Transition } from './types';

/** Pure edits on a net. Every function returns a new net; nothing mutates. */

export type ElementKind = 'place' | 'transition' | 'arc';

export function addPlace(net: PetriNet, at: Point): { net: PetriNet; id: string } {
  const id = nextId(net, 'P');
  const place: Place = { id, name: id, description: '', tokens: 0, capacity: 0, actions: [], x: at.x, y: at.y };
  return { net: { ...net, places: [...net.places, place] }, id };
}

export function addTransition(net: PetriNet, at: Point): { net: PetriNet; id: string } {
  const id = nextId(net, 'T');
  const priority = net.transitions.reduce((m, t) => Math.max(m, t.priority), 0) + 1;
  const tr: Transition = { id, name: id, description: '', guard: '', delayMs: 0, priority, x: at.x, y: at.y };
  return { net: { ...net, transitions: [...net.transitions, tr] }, id };
}

export function addArc(
  net: PetriNet,
  from: string,
  to: string,
): { ok: true; net: PetriNet; id: string } | { ok: false; reason: 'invalid' | 'exists' } {
  const valid = (isPlaceId(from) && isTransitionId(to)) || (isTransitionId(from) && isPlaceId(to));
  if (!valid) return { ok: false, reason: 'invalid' };
  if (net.arcs.some((a) => a.from === from && a.to === to && !a.inhibitor)) return { ok: false, reason: 'exists' };
  const id = nextId(net, 'A');
  return { ok: true, net: { ...net, arcs: [...net.arcs, { id, from, to, weight: 1 }] }, id };
}

export function removeElement(net: PetriNet, kind: ElementKind, id: string): PetriNet {
  if (kind === 'arc') return { ...net, arcs: net.arcs.filter((a) => a.id !== id) };
  return {
    ...net,
    places: kind === 'place' ? net.places.filter((p) => p.id !== id) : net.places,
    transitions: kind === 'transition' ? net.transitions.filter((t) => t.id !== id) : net.transitions,
    arcs: net.arcs.filter((a) => a.from !== id && a.to !== id),
  };
}

/** Moving a node drops the bend points of its arcs: they were drawn for the old spot. */
export function moveNode(net: PetriNet, id: string, at: Point): PetriNet {
  const routes = { ...(net.layout?.routes ?? {}) };
  const touched = new Set(net.arcs.filter((a) => a.from === id || a.to === id).map((a) => a.id));
  for (const arcId of touched) delete routes[arcId];
  return {
    ...net,
    places: net.places.map((p) => (p.id === id ? { ...p, x: at.x, y: at.y } : p)),
    transitions: net.transitions.map((t) => (t.id === id ? { ...t, x: at.x, y: at.y } : t)),
    layout: {
      direction: net.layout?.direction ?? 'TB',
      routes,
      orthogonal: (net.layout?.orthogonal ?? []).filter((arcId) => !touched.has(arcId)),
    },
  };
}

export const updatePlace = (net: PetriNet, id: string, patch: Partial<Place>): PetriNet => ({
  ...net,
  places: net.places.map((p) => (p.id === id ? { ...p, ...patch, id } : p)),
});

export const updateTransition = (net: PetriNet, id: string, patch: Partial<Transition>): PetriNet => ({
  ...net,
  transitions: net.transitions.map((t) => (t.id === id ? { ...t, ...patch, id } : t)),
});

export const updateArc = (net: PetriNet, id: string, patch: Partial<Arc>): PetriNet => ({
  ...net,
  arcs: net.arcs.map((a) => (a.id === id ? { ...a, ...patch, id } : a)),
});

const signalTaken = (net: PetriNet, name: string, except?: string) =>
  [...net.inputs, ...net.outputs].some(
    (s) => s.name.toLowerCase() === name.toLowerCase() && s.name.toLowerCase() !== except?.toLowerCase(),
  );

function freeSignalName(net: PetriNet, base: string): string {
  let name = base;
  for (let n = 2; signalTaken(net, name); n++) name = `${base}_${n}`;
  return name;
}

export function addInput(net: PetriNet, base = 'in'): PetriNet {
  const sig: InputSignal = { name: freeSignalName(net, base), description: '', kind: 'sensor' };
  return { ...net, inputs: [...net.inputs, sig] };
}

export function addOutput(net: PetriNet, base = 'out'): PetriNet {
  const sig: OutputSignal = { name: freeSignalName(net, base), description: '' };
  return { ...net, outputs: [...net.outputs, sig] };
}

/** Rewrites a guard with an identifier renamed; leaves unparsable guards to a word-boundary replace. */
function renameInGuard(guard: string, from: string, to: string): string {
  const parsed = parseExpr(guard);
  if (parsed.ok && guard.trim()) {
    return printExpr(mapVars(parsed.expr, (n) => (n.toLowerCase() === from.toLowerCase() ? to : n)));
  }
  const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return guard.replace(new RegExp(`\\b${esc}\\b`, 'gi'), to);
}

/** Renames an input everywhere. Returns null when the new name is not usable. */
export function renameInput(net: PetriNet, from: string, raw: string): PetriNet | null {
  const to = toIdent(raw, 'in');
  if (!raw.trim() || signalTaken(net, to, from)) return null;
  return {
    ...net,
    inputs: net.inputs.map((s) => (s.name === from ? { ...s, name: to } : s)),
    transitions: net.transitions.map((t) => ({ ...t, guard: renameInGuard(t.guard, from, to) })),
  };
}

export function renameOutput(net: PetriNet, from: string, raw: string): PetriNet | null {
  const to = toIdent(raw, 'out');
  if (!raw.trim() || signalTaken(net, to, from)) return null;
  return {
    ...net,
    outputs: net.outputs.map((s) => (s.name === from ? { ...s, name: to } : s)),
    places: net.places.map((p) => ({
      ...p,
      actions: p.actions.map((a) => (a.toLowerCase() === from.toLowerCase() ? to : a)),
    })),
  };
}

export const removeInput = (net: PetriNet, name: string): PetriNet => ({
  ...net,
  inputs: net.inputs.filter((s) => s.name !== name),
});

export const removeOutput = (net: PetriNet, name: string): PetriNet => ({
  ...net,
  outputs: net.outputs.filter((s) => s.name !== name),
  places: net.places.map((p) => ({ ...p, actions: p.actions.filter((a) => a.toLowerCase() !== name.toLowerCase()) })),
});

/** Ids, guards, delays, weights — what the simulation depends on. Names and positions are not in it. */
export function semanticKey(net: PetriNet): string {
  return JSON.stringify([
    net.places.map((p) => [p.id, p.tokens, p.capacity]),
    net.transitions.map((t) => [t.id, t.guard, t.delayMs, t.priority]),
    net.arcs.map((a) => [a.from, a.to, a.weight, Boolean(a.inhibitor)]),
    net.inputs.map((s) => [s.name, s.kind]),
  ]);
}
