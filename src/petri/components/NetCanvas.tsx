import {
  ArrowLeftRight,
  Circle,
  Hand,
  LayoutGrid,
  Maximize2,
  Minus,
  MoveUpRight,
  Plus,
  RectangleHorizontal,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { t } from '../strings';
import { addArc, addPlace, addTransition, moveNode, removeElement } from '../model/edit';
import { examples } from '../model/examples';
import { barSize, LABEL_MAX, layoutNet, PLACE_R, placeLabel, transitionLabel } from '../model/layout';
import { outputsOf, statusOf, type TransitionStatus } from '../model/simulate';
import type { Direction, Place, Point, Transition } from '../model/types';
import { useActions } from '../state/actions';
import { useDerived, useStore, useToast, type Tool } from '../state/store';
import { arcShape, C, MONO, netBounds, nodeIndex } from './geometry';

interface View {
  x: number;
  y: number;
  k: number;
}

type Drag =
  | { kind: 'pan'; sx: number; sy: number; view: View; moved: boolean }
  | { kind: 'node'; id: string; node: 'place' | 'transition'; start: Point; origin: Point; moved: boolean }
  | { kind: 'arc'; id: string; sx: number; sy: number; moved: boolean }
  | { kind: 'pinch'; dist: number; center: Point; view: View };

const STATUS_COLOR: Record<TransitionStatus, string> = {
  ready: C.ready,
  blocked: C.blocked,
  timing: C.timing,
  disabled: C.disabled,
  invalid: C.invalid,
};

const clampK = (k: number) => Math.min(2.5, Math.max(0.25, k));
const snap = (v: number) => Math.round(v / 10) * 10;
const fmtDelay = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} s` : `${ms} ms`;

export default function NetCanvas() {
  const { state, dispatch } = useStore();
  const { compiled } = useDerived();
  const toast = useToast();
  const actions = useActions();
  const { net, sim, mode, tool, selection, arcFrom } = state;
  const dir: Direction = net.layout?.direction ?? 'TB';

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>({ x: 40, y: 40, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, Point>());

  const nodes = useMemo(() => nodeIndex(net), [net]);
  const outputs = useMemo(() => outputsOf(compiled, sim.marking), [compiled, sim.marking]);
  const statuses = useMemo(
    () => new Map(net.transitions.map((tr) => [tr.id, statusOf(compiled, sim, tr.id)])),
    [compiled, sim, net.transitions],
  );

  // Fired-transition flash and token animation restart on every new firing.
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (sim.lastFired.length) setFlash((f) => f + 1);
  }, [sim]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!size.w || !size.h) return;
    const b = netBounds(net, dir);
    // Room for the toolbars on top and the hint/legend at the bottom.
    const pad = { x: 16, top: 52, bottom: 34 };
    const availW = size.w - pad.x * 2;
    const availH = size.h - pad.top - pad.bottom;
    const k = clampK(Math.min(availW / (b.maxX - b.minX), availH / (b.maxY - b.minY), 1.4));
    setView({
      k,
      x: pad.x + (availW - (b.maxX - b.minX) * k) / 2 - b.minX * k,
      y: pad.top + (availH - (b.maxY - b.minY) * k) / 2 - b.minY * k,
    });
  }, [net, dir, size.w, size.h]);

  // Frame the net when asked (new net, example, undo of a chat change) and once the canvas has a size.
  const fitted = useRef({ token: -1, sized: false });
  useEffect(() => {
    if (!size.w || !size.h) return;
    if (fitted.current.token !== state.fitToken || !fitted.current.sized) {
      fitted.current = { token: state.fitToken, sized: true };
      fit();
    }
  }, [state.fitToken, size.w, size.h, fit]);

  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    const k = clampK(v.k * factor);
    const px = cx - rect.left;
    const py = cy - rect.top;
    setView({ k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k });
  }, []);

  const zoomCenter = (factor: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const toWorld = (clientX: number, clientY: number): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (clientX - rect.left - v.x) / v.k, y: (clientY - rect.top - v.y) / v.k };
  };

  // ─── Clicks ────────────────────────────────────────────────────────────────

  const clickNode = (kind: 'place' | 'transition', id: string) => {
    if (mode === 'sim') {
      if (kind === 'transition') actions.fire(id);
      else dispatch({ type: 'ui/select', selection: { kind, id } });
      return;
    }
    if (tool === 'arc') {
      if (!arcFrom) {
        dispatch({ type: 'ui/arcFrom', id });
        return;
      }
      const r = addArc(net, arcFrom, id);
      dispatch({ type: 'ui/arcFrom', id: null });
      if (!r.ok) {
        toast(t(r.reason === 'invalid' ? 'arc.invalid' : 'arc.exists'), 'warn');
        return;
      }
      dispatch({ type: 'net/replace', net: r.net });
      dispatch({ type: 'ui/select', selection: { kind: 'arc', id: r.id } });
      return;
    }
    dispatch({ type: 'ui/select', selection: { kind, id } });
  };

  const clickBackground = (at: Point) => {
    if (mode === 'edit' && (tool === 'place' || tool === 'transition')) {
      const p = { x: snap(at.x), y: snap(at.y) };
      const r = tool === 'place' ? addPlace(net, p) : addTransition(net, p);
      dispatch({ type: 'net/replace', net: r.net });
      dispatch({ type: 'ui/select', selection: { kind: tool, id: r.id } });
      return;
    }
    dispatch({ type: 'ui/arcFrom', id: null });
    dispatch({ type: 'ui/select', selection: null });
  };

  // ─── Pointer handling: pan, pinch, drag, click ─────────────────────────────

  const startPinchIfTwo = () => {
    if (pointers.current.size !== 2) return false;
    const [a, b] = [...pointers.current.values()];
    drag.current = {
      kind: 'pinch',
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      view: viewRef.current,
    };
    return true;
  };

  const onBackgroundDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (startPinchIfTwo()) return;
    drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, view: viewRef.current, moved: false };
  };

  const onNodeDown = (e: React.PointerEvent, node: 'place' | 'transition', id: string) => {
    e.stopPropagation();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (startPinchIfTwo()) return;
    const n = nodes.get(id)!;
    drag.current = {
      kind: 'node',
      id,
      node,
      start: toWorld(e.clientX, e.clientY),
      origin: { x: n.x, y: n.y },
      moved: false,
    };
  };

  const onArcDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    svgRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (startPinchIfTwo()) return;
    drag.current = { kind: 'arc', id, sx: e.clientX, sy: e.clientY, moved: false };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const k = clampK(d.view.k * (dist / d.dist));
      const rect = svgRef.current!.getBoundingClientRect();
      const px = d.center.x - rect.left;
      const py = d.center.y - rect.top;
      setView({
        k,
        x: px - ((px - d.view.x) * k) / d.view.k + (center.x - d.center.x),
        y: py - ((py - d.view.y) * k) / d.view.k + (center.y - d.center.y),
      });
      return;
    }
    if (d.kind === 'pan') {
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) < 4) return;
      d.moved = true;
      setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy });
      return;
    }
    if (d.kind === 'arc') {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
      return;
    }
    const w = toWorld(e.clientX, e.clientY);
    const dx = w.x - d.start.x;
    const dy = w.y - d.start.y;
    if (!d.moved && Math.hypot(dx, dy) * viewRef.current.k < 5) return;
    const first = !d.moved;
    d.moved = true;
    dispatch({
      type: 'net/update',
      fn: (n) => moveNode(n, d.id, { x: snap(d.origin.x + dx), y: snap(d.origin.y + dy) }),
      record: first,
    });
  };

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (pointers.current.size > 0) {
      // One finger left after a pinch: carry on as a pan from here.
      const [p] = [...pointers.current.values()];
      drag.current = { kind: 'pan', sx: p.x, sy: p.y, view: viewRef.current, moved: true };
      return;
    }
    drag.current = null;
    if (!d) return;
    if (d.kind === 'node' && !d.moved) clickNode(d.node, d.id);
    else if (d.kind === 'arc' && !d.moved) dispatch({ type: 'ui/select', selection: { kind: 'arc', id: d.id } });
    else if (d.kind === 'pan' && !d.moved) clickBackground(toWorld(e.clientX, e.clientY));
  };

  // ─── Keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'net/redo' : 'net/undo' });
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ type: 'net/redo' });
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && mode === 'edit' && selection) {
        e.preventDefault();
        dispatch({ type: 'net/update', fn: (n) => removeElement(n, selection.kind, selection.id) });
      } else if (e.key === 'Escape') {
        dispatch({ type: 'ui/tool', tool: 'select' });
        dispatch({ type: 'ui/select', selection: null });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, mode, selection]);

  // ─── Drawing ───────────────────────────────────────────────────────────────

  const firedSet = new Set(sim.lastFired);
  const isSel = (kind: string, id: string) => selection?.kind === kind && selection.id === id;
  const bar = barSize(dir);
  const labelPos =
    dir === 'TB'
      ? { x: PLACE_R + 9, y: -3, anchor: 'start' as const }
      : { x: 0, y: PLACE_R + 15, anchor: 'middle' as const };

  const shapes = net.arcs.map((a) => ({ arc: a, shape: arcShape(net, a, nodes, dir) }));

  const renderPlace = (p: Place) => {
    const n = sim.marking[p.id] ?? 0;
    const marked = n > 0;
    const on = p.actions.filter((a) => outputs[a]);
    // As many outputs as fit the label width; the inspector lists them all.
    const shown: string[] = [];
    for (const a of p.actions) {
      if ([...shown, a].join(' · ').length > LABEL_MAX.actions && shown.length) break;
      shown.push(a);
    }
    return (
      <g
        key={p.id}
        transform={`translate(${p.x ?? 0},${p.y ?? 0})`}
        onPointerDown={(e) => onNodeDown(e, 'place', p.id)}
        style={{ cursor: mode === 'edit' ? 'move' : 'pointer' }}
        data-node={p.id}
      >
        {marked && <circle r={PLACE_R + 7} fill={C.marked} opacity={0.12} />}
        <circle
          r={PLACE_R}
          fill={C.placeFill}
          stroke={marked ? C.marked : C.placeStroke}
          strokeWidth={marked ? 2 : 1.5}
        />
        {isSel('place', p.id) && (
          <circle r={PLACE_R + 5} fill="none" stroke={C.selected} strokeWidth={1.5} strokeDasharray="4 3" />
        )}
        {arcFrom === p.id && <circle r={PLACE_R + 5} fill="none" stroke={C.ready} strokeWidth={2} />}
        <Tokens n={n} />
        {p.capacity > 0 && (
          <text x={PLACE_R - 1} y={-PLACE_R + 1} fontSize={9} fill={C.muted} textAnchor="start">
            ≤{p.capacity}
          </text>
        )}
        <text x={labelPos.x} y={labelPos.y} fontSize={12} fill={C.text} textAnchor={labelPos.anchor}>
          <tspan fill={C.muted} fontFamily={MONO} fontSize={10}>
            {p.id}
          </tspan>{' '}
          {placeLabel(p).title}
        </text>
        {shown.length > 0 && (
          <text x={labelPos.x} y={labelPos.y + 14} fontSize={10} fontFamily={MONO} textAnchor={labelPos.anchor}>
            {shown.map((a, i) => (
              <tspan key={a} fill={on.includes(a) && marked ? C.outOn : C.outOff}>
                {i ? ' · ' : ''}
                {a}
              </tspan>
            ))}
            {shown.length < p.actions.length && <tspan fill={C.outOff}> …</tspan>}
          </text>
        )}
      </g>
    );
  };

  const renderTransition = (tr: Transition) => {
    const st = statuses.get(tr.id) ?? { status: 'disabled' as const, progress: 0 };
    const color = STATUS_COLOR[st.status];
    const lbl =
      dir === 'TB'
        ? { x: bar.w / 2 + 8, y: -1, anchor: 'start' as const }
        : { x: 0, y: bar.h / 2 + 15, anchor: 'middle' as const };
    const label = transitionLabel(tr, tr.delayMs > 0 ? `⏱ ${fmtDelay(tr.delayMs)}` : '');
    const sub = label.sub;
    return (
      <g
        key={tr.id}
        transform={`translate(${tr.x ?? 0},${tr.y ?? 0})`}
        onPointerDown={(e) => onNodeDown(e, 'transition', tr.id)}
        style={{ cursor: mode === 'edit' ? 'move' : 'pointer' }}
        data-node={tr.id}
        data-status={st.status}
      >
        {/* Bigger invisible target: the bar itself is thin for a finger. */}
        <rect x={-bar.w / 2 - 10} y={-bar.h / 2 - 10} width={bar.w + 20} height={bar.h + 20} fill="transparent" />
        {firedSet.has(tr.id) && (
          <rect
            key={`flash-${flash}`}
            className="petri-flash"
            x={-bar.w / 2 - 6}
            y={-bar.h / 2 - 6}
            width={bar.w + 12}
            height={bar.h + 12}
            rx={5}
            fill={C.ready}
          />
        )}
        <rect
          x={-bar.w / 2}
          y={-bar.h / 2}
          width={bar.w}
          height={bar.h}
          rx={2}
          fill={st.status === 'disabled' ? C.disabled : color}
        />
        {st.status === 'blocked' && (
          <rect
            x={-bar.w / 2}
            y={-bar.h / 2}
            width={bar.w}
            height={bar.h}
            rx={2}
            fill={C.placeFill}
            stroke={C.blocked}
            strokeWidth={1.5}
          />
        )}
        {st.status === 'timing' && (
          <>
            <rect
              x={-bar.w / 2}
              y={-bar.h / 2}
              width={bar.w}
              height={bar.h}
              rx={2}
              fill={C.placeFill}
              stroke={C.timing}
              strokeWidth={1.5}
            />
            {dir === 'TB' ? (
              <rect x={-bar.w / 2} y={-bar.h / 2} width={bar.w * st.progress} height={bar.h} rx={2} fill={C.timing} />
            ) : (
              <rect
                x={-bar.w / 2}
                y={bar.h / 2 - bar.h * st.progress}
                width={bar.w}
                height={bar.h * st.progress}
                rx={2}
                fill={C.timing}
              />
            )}
          </>
        )}
        {(isSel('transition', tr.id) || arcFrom === tr.id) && (
          <rect
            x={-bar.w / 2 - 5}
            y={-bar.h / 2 - 5}
            width={bar.w + 10}
            height={bar.h + 10}
            rx={4}
            fill="none"
            stroke={arcFrom === tr.id ? C.ready : C.selected}
            strokeWidth={1.5}
            strokeDasharray={arcFrom === tr.id ? undefined : '4 3'}
          />
        )}
        <text x={lbl.x} y={lbl.y} fontSize={12} fill={C.text} textAnchor={lbl.anchor}>
          <tspan fill={C.muted} fontFamily={MONO} fontSize={10}>
            {tr.id}
          </tspan>{' '}
          {label.title}
        </text>
        {tr.guard.length > LABEL_MAX.guard && <title>{tr.guard}</title>}
        {sub && (
          <text
            x={lbl.x}
            y={lbl.y + 13}
            fontSize={10}
            fontFamily={MONO}
            fill={st.status === 'invalid' ? C.invalid : C.muted}
            textAnchor={lbl.anchor}
          >
            {sub}
          </text>
        )}
      </g>
    );
  };

  const tokenTrips = sim.lastFired.flatMap((tid) =>
    shapes
      .filter(({ arc, shape }) => shape && !arc.inhibitor && (arc.to === tid || arc.from === tid))
      .map(({ arc, shape }) => ({ key: `${flash}-${arc.id}`, d: shape!.d, delay: arc.from === tid ? 0.18 : 0 })),
  );

  const hint =
    mode === 'sim'
      ? t('canvas.hintSim')
      : tool === 'arc'
        ? arcFrom
          ? t('canvas.hintArcFrom', { id: arcFrom })
          : t('canvas.hintArc')
        : tool === 'place'
          ? t('canvas.hintPlace')
          : tool === 'transition'
            ? t('canvas.hintTransition')
            : t('canvas.hintSelect');

  const empty = net.places.length + net.transitions.length === 0;

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden select-none" style={{ background: C.bg }}>
      <svg
        ref={svgRef}
        className="block h-full w-full touch-none"
        onPointerDown={onBackgroundDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        data-testid="net-canvas"
      >
        <defs>
          <pattern
            id="petri-grid"
            width={24}
            height={24}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${view.x},${view.y}) scale(${view.k})`}
          >
            <circle cx={1} cy={1} r={1} fill={C.grid} />
          </pattern>
          <marker
            id="petri-arrow"
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={8}
            markerHeight={8}
            orient="auto-start-reverse"
          >
            <path d="M0,1 L9,5 L0,9 z" fill={C.arc} />
          </marker>
          <marker
            id="petri-arrow-sel"
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={8}
            markerHeight={8}
            orient="auto-start-reverse"
          >
            <path d="M0,1 L9,5 L0,9 z" fill={C.selected} />
          </marker>
          <marker
            id="petri-inhibitor"
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={8}
            markerHeight={8}
            orient="auto"
          >
            <circle cx={5} cy={5} r={3.5} fill={C.bg} stroke={C.arc} strokeWidth={1.6} />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#petri-grid)" />
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {shapes.map(({ arc, shape }) => {
            if (!shape) return null;
            const sel = isSel('arc', arc.id);
            return (
              <g
                key={arc.id}
                onPointerDown={(e) => onArcDown(e, arc.id)}
                style={{ cursor: 'pointer' }}
                data-arc={arc.id}
              >
                <path d={shape.d} fill="none" stroke="transparent" strokeWidth={12} />
                <path
                  d={shape.d}
                  fill="none"
                  stroke={sel ? C.selected : C.arc}
                  strokeWidth={sel ? 2 : 1.4}
                  strokeDasharray={arc.inhibitor ? '5 3' : undefined}
                  markerEnd={`url(#${arc.inhibitor ? 'petri-inhibitor' : sel ? 'petri-arrow-sel' : 'petri-arrow'})`}
                />
                {arc.weight > 1 && (
                  <g transform={`translate(${shape.mid.x},${shape.mid.y})`}>
                    <rect x={-8} y={-8} width={16} height={16} rx={8} fill={C.bg} stroke={C.arc} />
                    <text y={4} fontSize={10} fill={C.text} textAnchor="middle" fontFamily={MONO}>
                      {arc.weight}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {tokenTrips.map((trip) => (
            <TokenTrip key={trip.key} d={trip.d} delay={trip.delay} />
          ))}
          {net.transitions.map(renderTransition)}
          {net.places.map(renderPlace)}
        </g>
      </svg>

      {/* Mode and tools */}
      <div className="pointer-events-none absolute left-2 right-2 top-2 flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-md border border-slate-700 bg-slate-900/90 p-0.5 text-xs font-medium">
            {(['sim', 'edit'] as const).map((m) => (
              <button
                key={m}
                onClick={() => dispatch({ type: 'ui/mode', mode: m })}
                className={`rounded px-2.5 py-1 transition-colors ${mode === m ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
                data-testid={`mode-${m}`}
              >
                {t(m === 'sim' ? 'canvas.sim' : 'canvas.edit')}
              </button>
            ))}
          </div>
          {mode === 'edit' && (
            <div className="flex rounded-md border border-slate-700 bg-slate-900/90 p-0.5">
              {(
                [
                  ['select', Hand, 'tool.select'],
                  ['place', Circle, 'tool.place'],
                  ['transition', RectangleHorizontal, 'tool.transition'],
                  ['arc', MoveUpRight, 'tool.arc'],
                ] as const
              ).map(([id, Icon, label]) => (
                <IconButton
                  key={id}
                  label={t(label)}
                  active={tool === id}
                  onClick={() => dispatch({ type: 'ui/tool', tool: id as Tool })}
                  testId={`tool-${id}`}
                >
                  <Icon size={15} />
                </IconButton>
              ))}
              <IconButton
                label={t('tool.delete')}
                disabled={!selection}
                onClick={() =>
                  selection &&
                  dispatch({ type: 'net/update', fn: (n) => removeElement(n, selection.kind, selection.id) })
                }
                testId="tool-delete"
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
          )}
        </div>
        <div className="pointer-events-auto flex rounded-md border border-slate-700 bg-slate-900/90 p-0.5">
          <IconButton label={t('canvas.zoomOut')} onClick={() => zoomCenter(1 / 1.25)}>
            <Minus size={15} />
          </IconButton>
          <IconButton label={t('canvas.zoomIn')} onClick={() => zoomCenter(1.25)}>
            <Plus size={15} />
          </IconButton>
          <IconButton label={t('canvas.fit')} onClick={fit} testId="canvas-fit">
            <Maximize2 size={15} />
          </IconButton>
          <IconButton
            label={t('canvas.layout')}
            disabled={empty}
            onClick={() => dispatch({ type: 'net/replace', net: layoutNet(net, dir), fit: true })}
            testId="canvas-layout"
          >
            <LayoutGrid size={15} />
          </IconButton>
          <IconButton
            label={t('canvas.direction')}
            disabled={empty}
            onClick={() =>
              dispatch({ type: 'net/replace', net: layoutNet(net, dir === 'TB' ? 'LR' : 'TB'), fit: true })
            }
            testId="canvas-direction"
          >
            <ArrowLeftRight size={15} />
          </IconButton>
        </div>
      </div>

      {empty ? (
        <EmptyState />
      ) : (
        <div className="pointer-events-none absolute bottom-1.5 left-2 right-2 flex items-center gap-3 text-[11px]">
          <p className="min-w-0 flex-1 truncate text-slate-500" title={hint}>
            {hint}
          </p>
          {mode === 'sim' && (
            <div className="hidden shrink-0 gap-2.5 text-slate-500 md:flex">
              {(
                [
                  ['ready', 'legend.ready'],
                  ['blocked', 'legend.blocked'],
                  ['timing', 'legend.timing'],
                  ['disabled', 'legend.disabled'],
                ] as const
              ).map(([s, label]) => (
                <span key={s} className="flex items-center gap-1">
                  <span className="inline-block h-2 w-3.5 rounded-sm" style={{ background: STATUS_COLOR[s] }} />
                  {t(label)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tokens({ n }: { n: number }) {
  const fill = C.token;
  if (n <= 0) return null;
  if (n === 1) return <circle r={5.5} fill={fill} />;
  if (n === 2)
    return (
      <>
        <circle cx={-6} r={4.5} fill={fill} />
        <circle cx={6} r={4.5} fill={fill} />
      </>
    );
  if (n === 3)
    return (
      <>
        <circle cy={-6} r={4} fill={fill} />
        <circle cx={-6} cy={5} r={4} fill={fill} />
        <circle cx={6} cy={5} r={4} fill={fill} />
      </>
    );
  if (n === 4)
    return (
      <>
        {[-5.5, 5.5].flatMap((x) =>
          [-5.5, 5.5].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r={4} fill={fill} />),
        )}
      </>
    );
  return (
    <text y={5} fontSize={14} fontWeight={700} fill={fill} textAnchor="middle" fontFamily={MONO}>
      {n}
    </text>
  );
}

/** A token gliding along an arc when its transition fires. SMIL, restarted by hand: inserted late, begin=0 is already over. */
function TokenTrip({ d, delay }: { d: string; delay: number }) {
  const start = (el: SVGElement | null) => {
    if (!el) return;
    window.setTimeout(() => {
      try {
        (el as SVGAnimationElement).beginElement();
      } catch {
        // Not attached anymore: a newer firing replaced it.
      }
    }, delay * 1000);
  };
  return (
    <circle r={4} fill={C.token} opacity={0} pointerEvents="none">
      <animateMotion ref={start} begin="indefinite" dur="0.32s" path={d} fill="freeze" />
      <animate ref={start} attributeName="opacity" begin="indefinite" dur="0.36s" values="0.95;0.95;0" fill="freeze" />
    </circle>
  );
}

function IconButton({
  label,
  active,
  disabled,
  onClick,
  children,
  testId,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={`flex h-8 w-8 items-center justify-center rounded transition-colors disabled:opacity-35 ${
        active ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  const actions = useActions();
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <PetriMark className="mx-auto mb-4 h-12 w-12 opacity-80" />
        <p className="mb-4 text-sm text-slate-300">{t('canvas.empty')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {examples().map((ex) => (
            <button
              key={ex.id}
              onClick={() => actions.loadExample(ex)}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-500 hover:text-white"
            >
              {ex.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Logo: a place, a transition, a place — the smallest Petri net that does something. */
export function PetriMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx={10} cy={24} r={7} fill="none" stroke="#38bdf8" strokeWidth={2.5} />
      <circle cx={10} cy={24} r={2.6} fill="#e0f2fe" />
      <rect x={22} y={13} width={4} height={22} rx={1} fill="#34d399" />
      <circle cx={38} cy={24} r={7} fill="none" stroke="#7c8aa5" strokeWidth={2.5} />
      <path d="M17.5 24h3M27.5 24h3" stroke="#7c8aa5" strokeWidth={2} />
    </svg>
  );
}
