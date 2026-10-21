import React, { useState } from 'react';
import { ClipboardList, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Badge, PanelBody, PanelHeader, SectionTitle, Stat } from '../ui';

/**
 * Plano de acao do sistema regenerativo.
 *
 * Nada aqui e' texto fixo: cada acao nasce de um sub-indice abaixo do alvo, e o
 * valor em dolar vem de recalcular o calor disponivel com aquele parametro
 * corrigido. Mexer no simulador muda o plano, porque o plano e' consequencia
 * do modelo, nao uma lista escrita a mao.
 *
 * Ordenado por prioridade e depois por dinheiro - que e' a ordem em que a acao
 * compete por um turno de manutencao.
 */

/** Priority from the engine to a badge tone, and to the card's left edge. */
const PRIORITY_TONE = { HIGH: 'red', MEDIUM: 'orange', LOW: 'gray' };
const PRIORITY_EDGE = { HIGH: 'border-l-red', MEDIUM: 'border-l-orange', LOW: 'border-l-ink-3' };

const sentence = (s) => s.charAt(0) + s.slice(1).toLowerCase();

const money = (v) =>
    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`;

const ActionPlan = ({ analysis }) => {
    const [open, setOpen] = useState(null);
    const { actions, recoverableUsdPerYear } = analysis;

    const totalCo2 = actions.reduce((s, a) => s + a.impact.tCo2PerYear, 0);

    return (
        <>
            <PanelHeader
                icon={ClipboardList}
                title="Action plan"
                action={
                    <Badge>
                        <span className="font-mono">{actions.length}</span> {actions.length === 1 ? 'item' : 'items'}
                    </Badge>
                }
            />

            <PanelBody>
                {actions.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                        <CheckCircle2 size={36} className="mb-3 text-green" />
                        <div className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink">System within targets</div>
                        <div className="mt-1 text-[12px] text-ink-2">
                            No corrective action generated at current readings
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-3 grid grid-cols-2 gap-3 rounded-sm border border-line bg-field px-3 py-2.5">
                            <Stat
                                label="Recoverable"
                                value={money(recoverableUsdPerYear)}
                                unit="/yr"
                                tone="green"
                            />
                            <Stat label="Avoided" value={totalCo2.toFixed(0)} unit="tCO₂/yr" />
                        </div>

                        <div className="space-y-2">
                            {actions.map((a, i) => {
                                const isOpen = open === a.id;

                                return (
                                    <div
                                        key={a.id}
                                        className={`overflow-hidden rounded-sm border border-l-4 border-line bg-field ${PRIORITY_EDGE[a.priority] ?? 'border-l-ink-3'}`}
                                        data-testid="plan-card"
                                    >
                                        <button
                                            type="button"
                                            className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-fill"
                                            onClick={() => setOpen(isOpen ? null : a.id)}
                                            aria-expanded={isOpen}
                                        >
                                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-line bg-surface font-mono text-[12px] font-medium tabular-nums text-ink-2">
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[14px] font-semibold leading-snug text-ink">{a.title}</div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-2">
                                                    <Badge tone={PRIORITY_TONE[a.priority]}>{sentence(a.priority)}</Badge>
                                                    <span>{sentence(a.effort)} effort</span>
                                                    <span>{a.owner}</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                {a.impact.usdPerYear > 0 ? (
                                                    <>
                                                        <div className="font-mono text-[15px] font-medium tabular-nums text-green-ink">
                                                            {money(a.impact.usdPerYear)}
                                                            <span className="font-sans text-[11px] font-normal text-ink-2">/yr</span>
                                                        </div>
                                                        <div className="font-mono text-[11px] tabular-nums text-ink-3">
                                                            {a.impact.mmbtuPerHour.toFixed(2)} MMBtu/hr
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-3">compliance / risk</div>
                                                )}
                                            </div>
                                            {isOpen ? (
                                                <ChevronDown size={16} className="mt-1 shrink-0 text-ink-3" />
                                            ) : (
                                                <ChevronRight size={16} className="mt-1 shrink-0 text-ink-3" />
                                            )}
                                        </button>

                                        {isOpen && (
                                            <div className="space-y-3 border-t border-line px-3 pb-3 pt-2.5">
                                                <p className="text-[13px] leading-relaxed text-ink-2">{a.rationale}</p>

                                                <div>
                                                    <SectionTitle className="mb-1">Execution steps</SectionTitle>
                                                    <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-snug text-ink marker:text-ink-3">
                                                        {a.steps.map((s, si) => (
                                                            <li key={si}>{s}</li>
                                                        ))}
                                                    </ol>
                                                </div>

                                                {a.impact.usdPerYear > 0 && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="rounded-sm border border-line bg-surface px-3 py-2">
                                                            <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">Fuel saved</div>
                                                            <div className="mt-0.5 text-[13px] text-ink">
                                                                <span className="font-mono font-medium tabular-nums">{a.impact.mmbtuPerYear.toFixed(0)}</span> MMBtu/yr
                                                            </div>
                                                        </div>
                                                        <div className="rounded-sm border border-line bg-surface px-3 py-2">
                                                            <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">CO₂ avoided</div>
                                                            <div className="mt-0.5 text-[13px] text-ink">
                                                                <span className="font-mono font-medium tabular-nums">{a.impact.tCo2PerYear.toFixed(0)}</span> t/yr
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <Badge>{a.category}</Badge>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </PanelBody>
        </>
    );
};

export default ActionPlan;
