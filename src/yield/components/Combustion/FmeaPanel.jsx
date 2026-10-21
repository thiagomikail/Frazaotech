import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronRight, Table2, AlertTriangle } from 'lucide-react';
import { Badge, Button, PanelBody, PanelHeader } from '../ui';
import { TONE } from './RegenScoreCard';

/**
 * FMEA do sistema selecionado, priorizado por RPN.
 *
 * A lista e' a leitura do dia a dia; a matriz completa (botao Full matrix)
 * e' a tabela classica, para revisao de engenharia e auditoria.
 *
 * O detalhe que muda o uso: os modos com evidencia nas leituras atuais
 * carregam um marcador Active e a barra de evidencia. O engenheiro nao esta'
 * lendo uma estimativa de dois anos atras - esta' vendo qual falha o forno
 * esta' sinalizando agora.
 */

/** Risk band from the engine to a system color; the band list mirrors RISK_BANDS. */
export const BAND_TONE = { CRITICAL: 'red', HIGH: 'orange', MEDIUM: 'blue', LOW: 'green' };

const BAND_EDGE = { red: 'border-l-red', orange: 'border-l-orange', blue: 'border-l-accent', green: 'border-l-green' };

/** Tinted tile behind the RPN of an expanded card. */
const TINT = { red: 'bg-red/12', orange: 'bg-orange/15', blue: 'bg-accent/12', green: 'bg-green/15' };

const SOD = ({ label, value, title, className = 'bg-fill', valueClass = 'text-ink' }) => (
    <div className={`rounded-lg px-2 py-1.5 text-center ${className}`} title={title} data-testid="sod-cell">
        <div className="text-[10px] font-medium text-ink-2">{label}</div>
        <div className={`text-[17px] font-semibold leading-tight tabular-nums ${valueClass}`}>{value}</div>
    </div>
);

const Field = ({ label, children }) => (
    <div>
        <div className="text-[11px] font-semibold text-ink-2">{label}</div>
        <div className="mt-0.5 text-[13px] leading-snug text-ink">{children}</div>
    </div>
);

const FmeaPanel = ({ fmea, onOpenMatrix }) => {
    const [open, setOpen] = useState(null);
    const { rows, counts, totalRpn, totalRpnAfter } = fmea;

    const reduction = totalRpn > 0
        ? Math.round(((totalRpn - totalRpnAfter) / totalRpn) * 100)
        : 0;

    return (
        <>
            <PanelHeader
                icon={ShieldAlert}
                title="FMEA"
                subtitle="Ranked by RPN, live readings"
                action={
                    <Button size="sm" variant="tinted" onClick={onOpenMatrix} data-testid="full-matrix">
                        <Table2 size={13} /> Full matrix
                    </Button>
                }
            />

            <PanelBody>
                {/* --- resumo de risco --- */}
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { k: 'critical', label: 'Critical', tone: 'red' },
                        { k: 'high', label: 'High', tone: 'orange' },
                        { k: 'medium', label: 'Medium', tone: 'blue' },
                        { k: 'low', label: 'Low', tone: 'green' }
                    ].map(b => (
                        <div key={b.k} className="rounded-xl bg-fill px-2 py-2 text-center">
                            <div className={`text-[20px] font-semibold leading-tight tabular-nums ${TONE[b.tone].text}`}>
                                {counts[b.k]}
                            </div>
                            <div className="text-[11px] text-ink-2">{b.label}</div>
                        </div>
                    ))}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-fill px-3 py-2 text-[13px]">
                    <span className="text-ink-2">Total RPN</span>
                    <span className="font-semibold tabular-nums text-ink">{totalRpn}</span>
                    <span className="text-ink-3" aria-hidden="true">→</span>
                    <span className="font-semibold tabular-nums text-green-ink">{totalRpnAfter}</span>
                    <Badge tone="green" className="ml-auto">−{reduction}% if actioned</Badge>
                </div>

                {counts.severityFlagged > 0 && (
                    <div className="mt-2 flex items-start gap-2 rounded-xl bg-red/10 px-3 py-2 text-[12px] leading-snug text-red-ink">
                        <AlertTriangle size={14} className="mt-px shrink-0" />
                        <span>
                            {counts.severityFlagged} modes at severity ≥ 9 — these require control
                            regardless of RPN
                        </span>
                    </div>
                )}

                {/* --- lista --- */}
                <div className="mt-3 space-y-2">
                    {rows.map((r, i) => {
                        const isOpen = open === r.id;
                        const tone = BAND_TONE[r.band.label] || 'blue';
                        return (
                            <div
                                key={r.id}
                                className={`overflow-hidden rounded-xl border border-l-[3px] border-line ${BAND_EDGE[tone]} ${r.active ? 'bg-orange/6' : ''}`}
                                data-testid="fmea-card"
                                data-active={r.active ? 'true' : 'false'}
                            >
                                <button
                                    type="button"
                                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-fill"
                                    onClick={() => setOpen(isOpen ? null : r.id)}
                                    aria-expanded={isOpen}
                                    data-testid="fmea-card-head"
                                >
                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fill text-[12px] font-semibold tabular-nums text-ink-2">
                                        {i + 1}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <div className="text-[14px] font-medium leading-snug text-ink">{r.failureMode}</div>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-2">
                                            <span>{r.component}</span>
                                            {r.active && <Badge tone="orange">Active</Badge>}
                                            {r.severityFlag && <Badge tone="red">S ≥ 9</Badge>}
                                        </div>
                                    </div>

                                    <div className="shrink-0 text-right">
                                        <div className={`text-[17px] font-semibold leading-tight tabular-nums ${TONE[tone].text}`}>
                                            {r.rpn}
                                        </div>
                                        <div className="text-[10px] text-ink-3">RPN</div>
                                    </div>

                                    {isOpen ? (
                                        <ChevronDown size={16} className="mt-1 shrink-0 text-ink-3" />
                                    ) : (
                                        <ChevronRight size={16} className="mt-1 shrink-0 text-ink-3" />
                                    )}
                                </button>

                                {isOpen && (
                                    <div className="space-y-3 border-t border-line px-3 pb-3 pt-2.5">
                                        <div className="grid grid-cols-4 gap-2">
                                            <SOD label="Sev" value={r.severity} title="Severity of the effect" />
                                            <SOD label="Occ" value={r.occurrence} title="Occurrence, adjusted by current readings" />
                                            <SOD label="Det" value={r.detection} title="Detection — 1 catches it, 10 misses it" />
                                            <SOD
                                                label="RPN"
                                                value={r.rpn}
                                                title="Severity × occurrence × detection"
                                                className={TINT[tone]}
                                                valueClass={TONE[tone].text}
                                            />
                                        </div>

                                        {r.active && (
                                            <div className="rounded-xl bg-fill px-3 py-2">
                                                <div className="flex items-baseline justify-between text-[12px]">
                                                    <span className="font-semibold text-ink-2">Evidence in current reading</span>
                                                    <span className={`font-semibold tabular-nums ${TONE[tone].text}`}>
                                                        {(r.evidenceLevel * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fill-strong">
                                                    <div
                                                        className={`h-full rounded-full ${TONE[tone].bg}`}
                                                        style={{ width: `${r.evidenceLevel * 100}%` }}
                                                    />
                                                </div>
                                                <div className="mt-1.5 text-[12px] leading-snug text-ink-2">{r.evidenceNote}</div>
                                            </div>
                                        )}

                                        <Field label="Function">{r.functionText}</Field>
                                        <Field label="Effect of failure">{r.effect}</Field>
                                        <Field label="Cause">{r.cause}</Field>
                                        <Field label="Current controls">{r.currentControls}</Field>
                                        <Field label="Recommended action">{r.recommendedAction}</Field>

                                        <div className="text-[12px] text-ink-2">
                                            RPN after action:{' '}
                                            <strong className="font-semibold tabular-nums text-green-ink">{r.rpnAfter}</strong>
                                            <span className="text-ink-3">
                                                {' '}(occurrence {r.occurrence} → {r.targetOccurrence})
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </PanelBody>
        </>
    );
};

export default FmeaPanel;
