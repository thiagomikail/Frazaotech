import React from 'react';
import { Gauge } from 'lucide-react';
import { gradeFor } from '../../lib/combustion';
import { useColors } from '../../lib/colors';
import { PanelBody, PanelHeader, SectionTitle } from '../ui';

/**
 * Gauge do score composto mais o detalhamento que o gerou.
 *
 * O arco e' SVG puro: um score precisa ser lido em um relance do outro lado da
 * sala de controle, e isso e' um arco com um numero grande no meio - nao um
 * grafico de biblioteca com legenda.
 *
 * Cada barra do breakdown mostra o peso junto, porque "82 em emissoes" e
 * "82 em recuperacao termica" nao valem a mesma coisa no total.
 */

/**
 * Grade from the engine (A-D) to a state color, so the score reads the same
 * everywhere. HMI rule: color only for state — acceptable (B) is normal, so it
 * stays gray; blue is kept for selection.
 */
export const GRADE_TONE = { A: 'green', B: 'gray', C: 'orange', D: 'red' };

/** Classes per tone: `text` for numbers and labels, `bg` for bars and dots; `key` picks the SVG color. */
export const TONE = {
    green: { text: 'text-green-ink', bg: 'bg-green', key: 'green' },
    gray: { text: 'text-ink', bg: 'bg-ink-3', key: 'ink2' },
    blue: { text: 'text-accent', bg: 'bg-accent', key: 'accent' },
    orange: { text: 'text-orange-ink', bg: 'bg-orange', key: 'orange' },
    red: { text: 'text-red-ink', bg: 'bg-red', key: 'red' },
};

const ARC_RADIUS = 64;
const ARC_SPAN = 300; // varredura, deixando 60 graus de folga embaixo
const ARC_START = 210;

const polar = (cx, cy, r, deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (cx, cy, r, startDeg, sweepDeg) => {
    const start = polar(cx, cy, r, startDeg);
    const end = polar(cx, cy, r, startDeg + sweepDeg);
    const largeArc = sweepDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

const sentence = (s) => s.charAt(0) + s.slice(1).toLowerCase();

/** A compact figure for the 2×2 grid under the gauge. */
const Figure = ({ label, value, className = 'text-ink' }) => (
    <div className="min-w-0">
        <div className="truncate text-[10px] font-bold uppercase tracking-[0.04em] text-ink-2">{label}</div>
        <div className={`mt-0.5 font-mono text-[16px] font-medium leading-tight tabular-nums ${className}`}>{value}</div>
    </div>
);

const RegenScoreCard = ({ system, analysis }) => {
    const c = useColors();
    const { score } = analysis;
    const tone = TONE[GRADE_TONE[score.grade]];
    const cx = 90;
    const cy = 84;
    const sweep = (score.total / 100) * ARC_SPAN;

    return (
        <>
            <PanelHeader
                icon={Gauge}
                title="Combustion score"
                action={<span className="truncate font-mono text-[12px] text-ink-2">{system.name}</span>}
            />

            <PanelBody className="@container">
                <div className="flex flex-col gap-5 @xl:flex-row @xl:items-start">
                    {/* --- gauge --- */}
                    <div className="flex shrink-0 flex-col items-center gap-3 @xl:w-[228px]">
                        <div className="relative h-[148px] w-[180px]">
                            <svg viewBox="0 0 180 148" className="absolute inset-0 h-full w-full" aria-hidden="true">
                                <path
                                    d={arcPath(cx, cy, ARC_RADIUS, ARC_START, ARC_SPAN)}
                                    fill="none"
                                    stroke={c.grid}
                                    strokeWidth="12"
                                    strokeLinecap="butt"
                                />
                                <path
                                    d={arcPath(cx, cy, ARC_RADIUS, ARC_START, Math.max(sweep, 0.1))}
                                    fill="none"
                                    stroke={c[tone.key]}
                                    strokeWidth="12"
                                    strokeLinecap="butt"
                                    style={{ transition: 'stroke 0.3s, d 0.3s' }}
                                />
                            </svg>
                            <div className="absolute inset-x-0 top-[50px] text-center">
                                <div
                                    className={`font-mono text-[44px] font-medium leading-none tabular-nums ${tone.text}`}
                                    data-testid="score-number"
                                >
                                    {score.total.toFixed(0)}
                                </div>
                                <div className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">Grade {score.grade}</div>
                            </div>
                            <div className={`absolute inset-x-0 bottom-1 text-center text-[12px] font-bold uppercase tracking-[0.06em] ${tone.text}`}>
                                {sentence(score.label)}
                            </div>
                        </div>

                        {/* --- indicadores termodinamicos --- */}
                        <div className="grid w-full max-w-[360px] grid-cols-2 gap-x-3 gap-y-3 rounded-sm border border-line bg-field px-2.5 py-2.5">
                            <Figure label="Available heat" value={`${(analysis.availableHeat * 100).toFixed(1)}%`} />
                            <Figure label="Effectiveness" value={`${(analysis.effectiveness * 100).toFixed(1)}%`} />
                            <Figure label="Excess air" value={`${analysis.excessAir.toFixed(0)}%`} />
                            <Figure
                                label="vs cold air"
                                value={`−${(analysis.savingVsColdAir * 100).toFixed(0)}%`}
                                className="text-green-ink"
                            />
                        </div>
                    </div>

                    {/* --- breakdown --- */}
                    <div className="min-w-0 flex-1">
                        <SectionTitle>What makes the score</SectionTitle>
                        <div className="space-y-3">
                            {score.breakdown.map(b => {
                                const bt = TONE[GRADE_TONE[gradeFor(b.score).grade]];
                                return (
                                    <div key={b.key}>
                                        <div className="flex items-baseline gap-2">
                                            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{b.label}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-3">
                                                weight <span className="font-mono tabular-nums">{b.weight}</span>
                                            </span>
                                            <span className={`w-8 text-right font-mono text-[15px] font-medium tabular-nums ${bt.text}`}>
                                                {b.score.toFixed(0)}
                                            </span>
                                        </div>
                                        <div className="mt-1.5 h-2 overflow-hidden rounded-sm border border-line bg-field">
                                            <div
                                                className={`h-full transition-[width] duration-300 ${bt.bg}`}
                                                style={{ width: `${b.score}%` }}
                                            />
                                        </div>
                                        <div className="mt-1 text-[11px] leading-snug text-ink-2">{b.detail}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </PanelBody>
        </>
    );
};

export default RegenScoreCard;
