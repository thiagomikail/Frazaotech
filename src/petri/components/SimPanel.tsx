import { Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { t } from '../strings';
import { outputsOf } from '../model/simulate';
import { useDerived, useStore } from '../state/store';

/** Simulated scan period at 1×. Real PLCs scan faster; 100 ms keeps timers honest and the eye able to follow. */
export const SCAN_MS = 100;
const SPEEDS = [0.5, 1, 2, 5];

/** Runs scans while the simulation is playing. Lives in the app shell so switching tabs doesn't stop it. */
export function useSimLoop() {
  const { state, dispatch } = useStore();
  const { compiled } = useDerived();
  const compiledRef = useRef(compiled);
  compiledRef.current = compiled;
  useEffect(() => {
    if (!state.running) return;
    const id = window.setInterval(
      () => dispatch({ type: 'sim/scan', compiled: compiledRef.current, dt: SCAN_MS * state.speed }),
      SCAN_MS,
    );
    return () => window.clearInterval(id);
  }, [state.running, state.speed, dispatch]);
}

const clock = (ms: number) => {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
};

export function SimBar() {
  const { state, dispatch } = useStore();
  const { compiled } = useDerived();
  const { sim, running, speed } = state;
  const fired = sim.lastFired
    .map((id) => {
      const tr = compiled.transitions.find((x) => x.id === id);
      return tr && tr.name !== tr.id ? `${id} ${tr.name}` : id;
    })
    .join(', ');

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-800 bg-slate-900 px-3 py-2 text-xs">
      <div className="flex items-center gap-1">
        <button
          onClick={() => dispatch({ type: 'sim/run', running: !running })}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors ${
            running
              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
              : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
          }`}
          data-testid="sim-run"
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {t(running ? 'sim.pause' : 'sim.run')}
        </button>
        <button
          onClick={() => dispatch({ type: 'sim/scan', compiled, dt: SCAN_MS * speed })}
          disabled={running}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          data-testid="sim-step"
        >
          <StepForward size={14} />
          {t('sim.step')}
        </button>
        <button
          onClick={() => dispatch({ type: 'sim/reset', compiled })}
          className="flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-slate-200 hover:bg-slate-800"
          data-testid="sim-reset"
        >
          <RotateCcw size={14} />
          {t('sim.reset')}
        </button>
      </div>
      <label className="flex items-center gap-1.5 text-slate-400">
        {t('sim.speed')}
        <select
          value={speed}
          onChange={(e) => dispatch({ type: 'sim/speed', speed: Number(e.target.value) })}
          className="rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-slate-200"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </label>
      <span className="font-mono text-slate-300" data-testid="sim-clock">
        {clock(sim.time)}{' '}
        <span className="text-slate-500">
          · {sim.scans} {t('sim.scans')}
        </span>
      </span>
      {fired && (
        <span className="min-w-0 truncate text-slate-400">
          {t('sim.fired')}: <span className="font-mono text-emerald-300">{fired}</span>
        </span>
      )}
    </div>
  );
}

export function IoPanel() {
  const { state, dispatch } = useStore();
  const { compiled } = useDerived();
  const outputs = useMemo(() => outputsOf(compiled, state.sim.marking), [compiled, state.sim.marking]);
  const net = state.net;

  return (
    <div className="flex flex-col gap-2 border-t border-slate-800 bg-slate-900/95 px-3 py-2 text-xs sm:flex-row sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-1 font-semibold uppercase tracking-wider text-slate-500">{t('io.inputs')}</div>
        <div className="flex flex-wrap gap-1.5">
          {net.inputs.length === 0 && <span className="text-slate-500">{t('io.none')}</span>}
          {net.inputs.map((s) => {
            const on = state.sim.inputs[s.name] ?? false;
            const pulse = s.kind === 'button';
            return (
              <button
                key={s.name}
                title={`${s.description ? `${s.description} — ` : ''}${t(`io.${s.kind}`)}`}
                onClick={() =>
                  pulse
                    ? dispatch({ type: 'sim/input', name: s.name, value: true, pulse: true })
                    : dispatch({ type: 'sim/input', name: s.name, value: !on })
                }
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono transition-colors ${
                  on
                    ? 'border-emerald-400 bg-emerald-400/15 text-emerald-200'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500'
                } ${pulse ? 'border-dashed' : ''}`}
                data-testid={`input-${s.name}`}
                aria-pressed={on}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${on ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                {s.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-w-0 sm:max-w-[45%]">
        <div className="mb-1 font-semibold uppercase tracking-wider text-slate-500">{t('io.outputs')}</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {net.outputs.length === 0 && <span className="text-slate-500">{t('io.none')}</span>}
          {net.outputs.map((s) => {
            const on = outputs[s.name] ?? false;
            return (
              <span
                key={s.name}
                title={s.description}
                className="flex items-center gap-1.5 font-mono"
                data-testid={`output-${s.name}`}
                data-on={on}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full border ${
                    on
                      ? 'border-emerald-300 bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.55)]'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                />
                <span className={on ? 'text-emerald-200' : 'text-slate-400'}>{s.name}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
