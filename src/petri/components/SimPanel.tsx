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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line bg-surface px-3 py-2 text-[13px]">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => dispatch({ type: 'sim/run', running: !running })}
          className={`flex h-8 items-center gap-1.5 rounded-full px-3.5 font-semibold transition-colors ${
            running ? 'bg-orange/15 text-orange-ink hover:bg-orange/25' : 'bg-green/15 text-green-ink hover:bg-green/25'
          }`}
          data-testid="sim-run"
        >
          {running ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          {t(running ? 'sim.pause' : 'sim.run')}
        </button>
        <button
          onClick={() => dispatch({ type: 'sim/scan', compiled, dt: SCAN_MS * speed })}
          disabled={running}
          className="flex h-8 items-center gap-1.5 rounded-full bg-fill px-3.5 font-medium text-ink transition-colors hover:bg-fill-strong disabled:opacity-40"
          data-testid="sim-step"
        >
          <StepForward size={14} />
          {t('sim.step')}
        </button>
        <button
          onClick={() => dispatch({ type: 'sim/reset', compiled })}
          className="flex h-8 items-center gap-1.5 rounded-full bg-fill px-3.5 font-medium text-ink transition-colors hover:bg-fill-strong"
          data-testid="sim-reset"
        >
          <RotateCcw size={14} />
          {t('sim.reset')}
        </button>
      </div>
      <label className="flex items-center gap-1.5 text-ink-2">
        {t('sim.speed')}
        <select
          value={speed}
          onChange={(e) => dispatch({ type: 'sim/speed', speed: Number(e.target.value) })}
          className="h-8 rounded-lg bg-fill px-2 text-ink focus:outline-none"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </label>
      <span className="font-mono tabular-nums text-ink" data-testid="sim-clock">
        {clock(sim.time)}{' '}
        <span className="text-ink-3">
          · {sim.scans} {t('sim.scans')}
        </span>
      </span>
      {fired && (
        <span className="min-w-0 truncate text-ink-2">
          {t('sim.fired')}: <span className="font-mono text-green-ink">{fired}</span>
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
    <div className="flex flex-col gap-2.5 border-t border-line bg-surface px-3 pb-3 pt-2 text-[12px] sm:flex-row sm:gap-6">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 text-[11px] font-semibold text-ink-3">{t('io.inputs')}</div>
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
                className={`flex h-8 items-center gap-2 rounded-full font-mono transition-colors ${
                  pulse
                    ? `border px-3 ${on ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface text-ink shadow-sm hover:bg-fill'}`
                    : 'bg-fill pl-1 pr-3 text-ink hover:bg-fill-strong'
                }`}
                data-testid={`input-${s.name}`}
                {...(pulse ? { 'aria-pressed': on } : { role: 'switch', 'aria-checked': on })}
              >
                {pulse ? (
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full border-2 ${on ? 'border-on-accent' : 'border-ink-3'}`}
                  />
                ) : (
                  <span
                    className={`relative inline-block h-6 w-10 shrink-0 rounded-full transition-colors ${on ? 'bg-green' : 'bg-fill-strong'}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-[left] ${on ? 'left-[18px]' : 'left-0.5'}`}
                    />
                  </span>
                )}
                {s.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-w-0 sm:max-w-[45%]">
        <div className="mb-1.5 text-[11px] font-semibold text-ink-3">{t('io.outputs')}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
          {net.outputs.length === 0 && <span className="text-ink-3">{t('io.none')}</span>}
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
                  className={`inline-block h-2.5 w-2.5 rounded-full transition-colors ${
                    on ? 'bg-green ring-3 ring-green/25' : 'bg-fill-strong'
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
