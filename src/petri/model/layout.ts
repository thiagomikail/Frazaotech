import dagre from '@dagrejs/dagre';
import type { Arc, Direction, PetriNet, Place, Point, Transition } from './types';

export const PLACE_R = 20;
export const BAR_LONG = 44;
export const BAR_SHORT = 10;

/** Size of a transition bar: horizontal in a top-down flow (like SFC), vertical left-to-right. */
export const barSize = (dir: Direction) =>
  dir === 'TB' ? { w: BAR_LONG, h: BAR_SHORT } : { w: BAR_SHORT, h: BAR_LONG };

// ─── Labels: what the canvas prints next to each node, and how wide it gets ──

export const LABEL_MAX = { name: 22, guard: 30, actions: 34 };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function placeLabel(p: Place) {
  return {
    title: clip(p.name !== p.id ? p.name : '', LABEL_MAX.name),
    sub: clip(p.actions.join(' · '), LABEL_MAX.actions),
  };
}

export function transitionLabel(t: Transition, delayText: string) {
  const guard = clip(t.guard.trim(), LABEL_MAX.guard);
  return {
    title: clip(t.name !== t.id ? t.name : '', LABEL_MAX.name),
    sub: [guard, delayText].filter(Boolean).join('  '),
  };
}

/** Rough text width: 12 px sans for titles, 10 px mono for the second line. */
export function labelWidth(id: string, title: string, sub: string): number {
  return Math.min(190, Math.max(id.length * 6 + 4 + title.length * 6.7, sub.length * 6.1));
}

const delayGuess = (t: Transition) => (t.delayMs > 0 ? '⏱ 00 s' : '');

/** Half extents of each node including its label, for layout and for framing. */
export function nodeExtent(n: Place | Transition, kind: 'place' | 'transition', dir: Direction) {
  const lbl = kind === 'place' ? placeLabel(n as Place) : transitionLabel(n as Transition, delayGuess(n as Transition));
  const w = labelWidth(n.id, lbl.title, lbl.sub);
  const bar = barSize(dir);
  const halfW = kind === 'place' ? PLACE_R : bar.w / 2;
  const halfH = kind === 'place' ? PLACE_R : bar.h / 2;
  if (dir === 'TB') return { left: halfW, right: halfW + 9 + w, up: Math.max(halfH, 14), down: Math.max(halfH, 16) };
  return { left: Math.max(halfW, w / 2), right: Math.max(halfW, w / 2), up: halfH, down: halfH + 32 };
}

/**
 * Layered auto layout. Nodes go in breadth-first from the marked places, so
 * the layout's cycle breaking starts at the initial state: the machine reads
 * top to bottom like an SFC chart.
 *
 * Each node reserves room for its label on both sides (dagre centers edges on
 * the node, so the reservation must be symmetric or the arcs zig-zag). Arcs
 * that go back up — the return to the initial step — are not left to dagre:
 * they run down a channel on the left (above, left-to-right), clear of the
 * labels, and enter their target from the start of the flow.
 */
export function layoutNet(net: PetriNet, direction: Direction = net.layout?.direction ?? 'TB'): PetriNet {
  if (net.places.length + net.transitions.length === 0) return { ...net, layout: { direction, routes: {} } };
  const tb = direction === 'TB';

  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph(
    tb
      ? { rankdir: 'TB', nodesep: 14, ranksep: 26, edgesep: 14, marginx: 30, marginy: 30 }
      : { rankdir: 'LR', nodesep: 14, ranksep: 54, edgesep: 14, marginx: 30, marginy: 30 },
  );
  g.setDefaultEdgeLabel(() => ({}));

  const extent = new Map<string, ReturnType<typeof nodeExtent>>();
  for (const p of net.places) extent.set(p.id, nodeExtent(p, 'place', direction));
  for (const t of net.transitions) extent.set(t.id, nodeExtent(t, 'transition', direction));

  const outs = new Map<string, string[]>();
  for (const a of net.arcs) outs.set(a.from, [...(outs.get(a.from) ?? []), a.to]);
  const order: string[] = [];
  const seen = new Set<string>();
  const starts = net.places.filter((p) => p.tokens > 0).map((p) => p.id);
  for (const start of [...starts, ...net.places.map((p) => p.id), ...net.transitions.map((t) => t.id)]) {
    if (seen.has(start)) continue;
    const q = [start];
    seen.add(start);
    while (q.length) {
      const id = q.shift()!;
      order.push(id);
      for (const nx of outs.get(id) ?? []) if (!seen.has(nx) && extent.has(nx)) (seen.add(nx), q.push(nx));
    }
  }
  for (const id of order) {
    const e = extent.get(id)!;
    g.setNode(
      id,
      tb
        ? { width: 2 * Math.max(e.left, e.right), height: e.up + e.down }
        : { width: e.left + e.right, height: 2 * Math.max(e.up, e.down) },
    );
  }
  // Back edges close the cycles, and they stay out of the layout entirely: left in, they pull
  // the initial step sideways toward their return path. An arc into a place that starts with
  // tokens is a return to the initial state — that settles most of them, and puts shared
  // resources on top, between the cycles that use them. Depth-first search breaks the rest.
  const adj = new Map<string, Arc[]>();
  for (const a of net.arcs) adj.set(a.from, [...(adj.get(a.from) ?? []), a]);
  const initial = new Set(starts);
  const backEdges = new Set(net.arcs.filter((a) => initial.has(a.to)).map((a) => a.id));
  const mark = new Map<string, 1 | 2>();
  const visit = (id: string) => {
    mark.set(id, 1);
    for (const a of adj.get(id) ?? []) {
      if (backEdges.has(a.id)) continue;
      const m = mark.get(a.to);
      if (m === 1) backEdges.add(a.id);
      else if (!m && extent.has(a.to)) visit(a.to);
    }
    mark.set(id, 2);
  };
  for (const id of order) if (!mark.has(id)) visit(id);

  for (const a of net.arcs)
    if (extent.has(a.from) && extent.has(a.to) && !backEdges.has(a.id))
      g.setEdge(a.from, a.to, { weight: a.inhibitor ? 0 : 1 }, a.id);

  dagre.layout(g);

  const pos = new Map<string, Point>();
  for (const id of order) {
    const n = g.node(id);
    pos.set(id, { x: Math.round(n.x), y: Math.round(n.y) });
  }

  const twin = (from: string, to: string) => net.arcs.some((o) => o.from === to && o.to === from);
  const routes: Record<string, Point[]> = {};
  const orthogonal: string[] = [];
  const back: { id: string; from: string; to: string; span: number }[] = [];

  for (const a of net.arcs) {
    const s = pos.get(a.from);
    const t = pos.get(a.to);
    if (!s || !t) continue;
    if (twin(a.from, a.to)) continue; // read arcs: drawn as a bent pair, no route
    if (backEdges.has(a.id)) {
      back.push({ id: a.id, from: a.from, to: a.to, span: Math.abs(tb ? s.y - t.y : s.x - t.x) });
      continue;
    }
    const e = g.edge({ v: a.from, w: a.to, name: a.id });
    if (e?.points?.length) {
      const pts = e.points.map((p: Point) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
      // Anchor the ends on the shapes: dagre puts them on the label-wide boxes.
      routes[a.id] = [s, ...pts.slice(1, -1), t];
    }
  }

  const bar = barSize(direction);
  const isPlace = new Set(net.places.map((p) => p.id));
  const half = (id: string) => (isPlace.has(id) ? { w: PLACE_R, h: PLACE_R } : { w: bar.w / 2, h: bar.h / 2 });
  // A return runs on the side of the diagram where it starts and ends: a right-hand
  // branch loops on the right, clear of the labels, instead of crossing the chart.
  const xs = [...pos.values()].map((p) => (tb ? p.x : p.y));
  const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
  const lane = { near: 0, far: 0 };
  back.sort((x, y) => x.span - y.span);
  for (const b of back) {
    const s = pos.get(b.from)!;
    const t = pos.get(b.to)!;
    const hs = half(b.from);
    const ht = half(b.to);
    const far = (tb ? s.x + t.x : s.y + t.y) / 2 > middle + 1;
    const k = far ? lane.far++ : lane.near++;
    if (tb) {
      const inSpan = [...pos].filter(([, p]) => p.y >= t.y - 1 && p.y <= s.y + 1);
      const x = far
        ? Math.max(...inSpan.map(([id, p]) => p.x + extent.get(id)!.right)) + 18 + 14 * k
        : Math.min(...inSpan.map(([id, p]) => p.x - half(id).w)) - 28 - 14 * k;
      const ys = s.y + hs.h + 12;
      const yt = t.y - ht.h - 12;
      routes[b.id] = [s, { x: s.x, y: ys }, { x, y: ys }, { x, y: yt }, { x: t.x, y: yt }, t];
    } else {
      const inSpan = [...pos].filter(([, p]) => p.x >= t.x - 1 && p.x <= s.x + 1);
      const y = far
        ? Math.max(...inSpan.map(([id, p]) => p.y + extent.get(id)!.down)) + 18 + 14 * k
        : Math.min(...inSpan.map(([id, p]) => p.y - half(id).h)) - 28 - 14 * k;
      const xs0 = s.x + hs.w + 12;
      const xt = t.x - ht.w - 12;
      routes[b.id] = [s, { x: xs0, y: s.y }, { x: xs0, y }, { x: xt, y }, { x: xt, y: t.y }, t];
    }
    orthogonal.push(b.id);
  }

  return {
    ...net,
    places: net.places.map((p) => ({ ...p, ...pos.get(p.id) })),
    transitions: net.transitions.map((t) => ({ ...t, ...pos.get(t.id) })),
    layout: { direction, routes, orthogonal },
  };
}

export const needsLayout = (net: PetriNet) =>
  [...net.places, ...net.transitions].some((n) => n.x === undefined || n.y === undefined);
