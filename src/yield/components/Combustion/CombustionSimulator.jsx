import React from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { SIM_PARAMS } from '../../data/regenerativeData';
import { TARGETS } from '../../lib/combustion';
import { Button, PanelBody, PanelHeader } from '../ui';

/**
 * Simulador: mexe nos parametros e o score, o ciclo e o plano de acao
 * recalculam na hora, porque todos leem do mesmo motor.
 *
 * A pergunta que ele responde e' a que aparece em reuniao de orcamento: "se eu
 * so' ajustar o ratio control, sem trocar o leito, quanto sobra?". Da' para
 * mover um parametro de cada vez e ver o dinheiro se mexer.
 *
 * O delta contra a leitura de campo fica sempre visivel, para nao se perder o
 * fio entre o que e' medido e o que e' hipotese.
 */

/** Marca visual de onde esta' o alvo em cada parametro. */
const TARGET_HINT = {
    o2Pct: `${TARGETS.o2Min}–${TARGETS.o2Max}%`,
    stackTempC: `≤ ${TARGETS.stackTempC} °C`,
    cycleTimeS: `${TARGETS.cycleMinS}–${TARGETS.cycleMaxS} s`,
    cycleImbalancePct: `≤ ${TARGETS.imbalanceMaxPct}%`,
    bedDeltaPPct: `≤ ${TARGETS.bedDeltaPPct}%`,
    coPpm: `≤ ${TARGETS.coPpm} ppm`,
    noxPpm: `≤ ${TARGETS.noxPpm} ppm`
};

/** The data says "C"; the screen says "°C". */
const unitLabel = (unit) => (unit === 'C' ? '°C' : unit);

const CombustionSimulator = ({ reading, baseline, onChange, onReset, dirty }) => {
    return (
        <>
            <PanelHeader icon={SlidersHorizontal} title="Parameters" subtitle="Move a reading; the score and plan follow" />

            <PanelBody>
                {dirty && (
                    <div className="sticky top-0 z-10 -mx-5 mb-3 bg-surface px-5 pb-1" data-testid="sim-banner">
                        <div className="flex items-center gap-2 rounded-xl bg-orange/15 py-1.5 pl-3 pr-1.5">
                            <span className="min-w-0 flex-1 text-[12px] font-medium leading-snug text-orange-ink">
                                Simulated — values differ from the field reading
                            </span>
                            <Button size="sm" variant="secondary" onClick={onReset} data-testid="reset-to-field">
                                <RotateCcw size={12} /> Reset to field
                            </Button>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {SIM_PARAMS.map(p => {
                        const value = reading[p.key];
                        const baseValue = baseline[p.key];
                        const delta = value - baseValue;
                        const changed = Math.abs(delta) > 1e-9;

                        return (
                            <div key={p.key}>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[13px] font-medium text-ink">{p.label}</span>
                                    {TARGET_HINT[p.key] && (
                                        <span className="text-[11px] tabular-nums text-ink-3">target {TARGET_HINT[p.key]}</span>
                                    )}
                                    <span className="ml-auto text-[15px] font-semibold tabular-nums text-ink">
                                        {value.toFixed(p.step < 1 ? 1 : 0)}
                                        <span className="text-[12px] font-normal text-ink-2"> {unitLabel(p.unit)}</span>
                                    </span>
                                </div>

                                <input
                                    type="range"
                                    className="mt-1.5 block w-full cursor-pointer"
                                    min={p.min}
                                    max={p.max}
                                    step={p.step}
                                    value={value}
                                    onChange={(e) => onChange(p.key, parseFloat(e.target.value))}
                                    aria-label={p.label}
                                    data-testid="sim-slider"
                                />

                                <div className="mt-0.5 flex items-center justify-between text-[11px] tabular-nums">
                                    <span className="text-ink-3">{p.min}</span>
                                    {changed ? (
                                        <span className={`font-semibold ${delta > 0 ? 'text-orange-ink' : 'text-accent'}`}>
                                            {delta > 0 ? '+' : ''}{delta.toFixed(p.step < 1 ? 1 : 0)} vs field
                                        </span>
                                    ) : (
                                        <span className="text-ink-3">field value</span>
                                    )}
                                    <span className="text-ink-3">{p.max}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </PanelBody>
        </>
    );
};

export default CombustionSimulator;
