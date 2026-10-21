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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line bg-strip px-2 py-1.5 text-[12px]">
      <div className="flex items-center gap-1">
        <button
          onClick={() => dispatch({ type: 'sim/run', running: !running })}
          className={`flex h-8 items-center gap-1.5 rounded-sm border px-3 text-[12px] font-semibold uppercase tracking-[0.04em] transition-colors ${
            running ? 'border-orange bg-orange text-black' : 'border-green bg-green text-white hover:opacity-90'
          }`}
          data-testid="sim-run"
        >
          {running ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
          {t(running ? 'sim.pause' : 'sim.run')}
        </button>
        <button
          onClick={() => dispatch({ type: 'sim/scan', compiled, dt: SCAN_MS * speed })}
          disabled={running}
          className="flex h-8 items-center gap-1.5 rounded-sm border px-3 text-[12px] font-semibold uppercase tracking-[0.04em] transition-colors border-line bg-raised text-ink hover:bg-fill-strong disabled:opacity-40"
          data-testid="sim-step"
        >
          <StepForward size={13} />
          {t('sim.step')}
        </button>
        <button
          onClick={() => dispatch({ type: 'sim/reset', compiled })}
          className="flex h-8 items-center gap-1.5 rounded-sm border px-3 text-[12px] font-semibold uppercase tracking-[0.04em] transition-colors border-line bg-raised text-ink hover:bg-fill-strong"
          data-testid="sim-reset"
        >
          <RotateCcw size={13} />
          {t('sim.reset')}
        </button>
      </div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">
        {t('sim.speed')}
        <select
          value={speed}
          onChange={(e) => dispatch({ type: 'sim/speed', speed: Number(e.target.value) })}
          className="h-8 rounded-sm border border-line bg-field px-1.5 font-mono text-[12px] font-normal normal-case tracking-normal text-ink focus:border-accent focus:outline-none"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </label>
      <span
        className="rounded-sm border border-line bg-field px-2 py-1 font-mono text-[12px] tabular-nums text-ink"
        data-testid="sim-clock"
      >
        {clock(sim.time)}{' '}
        <span className="text-ink-3">
          · {sim.scans} {t('sim.scans')}
        </span>
      </span>
      {fired && (
        <span className="min-w-0 truncate text-ink-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em]">{t('sim.fired')}</span>{' '}
          <span className="font-mono text-green-ink">{fired}</span>
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
    <div className="flex flex-col gap-2 border-t border-line bg-surface px-3 pb-2.5 pt-2 text-[12px] sm:flex-row sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">{t('io.inputs')}</div>
        <div className="flex flex-wrap gap-1.5">
          {net.inputs.length === 0 && <span className="text-ink-3">{t('io.none')}</span>}
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
                className={`flex h-7 items-center gap-1.5 rounded-sm border bg-raised px-2 font-mono text-[11px] text-ink transition-colors hover:bg-fill-strong ${
                  pulse ? 'border-dashed border-ink-3' : 'border-line'
                }`}
                data-testid={`input-${s.name}`}
                {...(pulse ? { 'aria-pressed': on } : { role: 'switch', 'aria-checked': on })}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-[1px] border ${
                    on ? 'border-green bg-green' : 'border-ink-3 bg-field'
                  }`}
                />
                {s.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-w-0 sm:max-w-[45%]">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">{t('io.outputs')}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
          {net.outputs.length === 0 && <span className="text-ink-3">{t('io.none')}</span>}
          {net.outputs.map((s) => {
            const on = outputs[s.name] ?? false;
            return (
              <span
                key={s.name}
                title={s.description}
                className="flex items-center gap-1.5 font-mono text-[11px]"
                data-testid={`output-${s.name}`}
                data-on={on}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full border transition-colors ${
                    on ? 'border-black/30 bg-green' : 'border-line bg-fill-strong'
                  }`}
                />
                <span className={on ? 'text-ink' : 'text-ink-2'}>{s.name}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
