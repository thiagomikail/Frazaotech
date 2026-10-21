import { barSize, nodeExtent, PLACE_R } from '../model/layout';
import type { Arc, Direction, PetriNet, Point } from '../model/types';

export const MONO = "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export interface NodeInfo {
  kind: 'place' | 'transition';
  x: number;
  y: number;
}

export function nodeIndex(net: PetriNet): Map<string, NodeInfo> {
  const m = new Map<string, NodeInfo>();
  for (const p of net.places) m.set(p.id, { kind: 'place', x: p.x ?? 0, y: p.y ?? 0 });
  for (const t of net.transitions) m.set(t.id, { kind: 'transition', x: t.x ?? 0, y: t.y ?? 0 });
  return m;
}

/** Where a ray from the node center toward `to` leaves the node outline. */
export function boundary(node: NodeInfo, to: Point, dir: Direction, gap = 1.5): Point {
  const dx = to.x - node.x;
  const dy = to.y - node.y;
  const len = Math.hypot(dx, dy) || 1;
  if (node.kind === 'place')
    return { x: node.x + (dx / len) * (PLACE_R + gap), y: node.y + (dy / len) * (PLACE_R + gap) };
  const { w, h } = barSize(dir);
  const s = Math.min((w / 2 + gap) / Math.abs(dx || 1e-9), (h / 2 + gap) / Math.abs(dy || 1e-9));
  return { x: node.x + dx * s, y: node.y + dy * s };
}

/** Smooth curve through the points (Catmull–Rom as cubic Béziers). */
function spline(pts: Point[]): string {
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x},${p2.y}`;
  }
  return d;
}

export interface ArcShape {
  d: string;
  /** Where the weight label goes. */
  mid: Point;
}

/** Polyline with rounded corners, for the return channels. */
function rounded(pts: Point[], r = 10): string {
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const lin = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const lout = Math.hypot(c.x - b.x, c.y - b.y) || 1;
    const k = Math.min(r, lin / 2, lout / 2);
    const p1 = { x: b.x - ((b.x - a.x) / lin) * k, y: b.y - ((b.y - a.y) / lin) * k };
    const p2 = { x: b.x + ((c.x - b.x) / lout) * k, y: b.y + ((c.y - b.y) / lout) * k };
    d += ` L${p1.x.toFixed(1)},${p1.y.toFixed(1)} Q${b.x},${b.y} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last.x},${last.y}`;
}

/**
 * The drawn path of an arc: the auto layout's bend points while both ends
 * are where the layout put them, a straight line otherwise — bent a little
 * when the opposite arc exists, so the pair doesn't overlap.
 */
export function arcShape(net: PetriNet, arc: Arc, nodes: Map<string, NodeInfo>, dir: Direction): ArcShape | null {
  const a = nodes.get(arc.from);
  const b = nodes.get(arc.to);
  if (!a || !b) return null;
  const route = net.layout?.routes?.[arc.id];
  const near = (p: Point, n: NodeInfo) => Math.hypot(p.x - n.x, p.y - n.y) < 34;
  const inner =
    route && route.length >= 3 && near(route[0], a) && near(route[route.length - 1], b) ? route.slice(1, -1) : [];

  if (inner.length === 0) {
    const twin = net.arcs.some((o) => o.from === arc.to && o.to === arc.from);
    if (twin) {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ctrl = { x: mx + ((b.y - a.y) / len) * 22, y: my - ((b.x - a.x) / len) * 22 };
      const s = boundary(a, ctrl, dir);
      const e = boundary(b, ctrl, dir);
      return {
        d: `M${s.x},${s.y} Q${ctrl.x},${ctrl.y} ${e.x},${e.y}`,
        mid: { x: (s.x + 2 * ctrl.x + e.x) / 4, y: (s.y + 2 * ctrl.y + e.y) / 4 },
      };
    }
    const s = boundary(a, b, dir);
    const e = boundary(b, a, dir);
    return { d: spline([s, e]), mid: { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 } };
  }

  const s = boundary(a, inner[0], dir);
  const e = boundary(b, inner[inner.length - 1], dir);
  const pts = [s, ...inner, e];
  const square = net.layout?.orthogonal?.includes(arc.id);
  return { d: square ? rounded(pts) : spline(pts), mid: inner[Math.floor((inner.length - 1) / 2)] };
}

/** Space the net takes, labels included, for framing the view. */
export function netBounds(net: PetriNet, dir: Direction) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const nodes = [
    ...net.places.map((n) => ({ n, e: nodeExtent(n, 'place', dir) })),
    ...net.transitions.map((n) => ({ n, e: nodeExtent(n, 'transition', dir) })),
  ];
  for (const { n, e } of nodes) {
    const x = n.x ?? 0;
    const y = n.y ?? 0;
    minX = Math.min(minX, x - e.left);
    maxX = Math.max(maxX, x + e.right);
    minY = Math.min(minY, y - e.up - 6);
    maxY = Math.max(maxY, y + e.down + 6);
  }
  for (const pts of Object.values(net.layout?.routes ?? {}))
    for (const p of pts) {
      minX = Math.min(minX, p.x - 12);
      maxX = Math.max(maxX, p.x + 12);
      minY = Math.min(minY, p.y - 12);
      maxY = Math.max(maxY, p.y + 12);
    }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
  return { minX, minY, maxX, maxY };
}
