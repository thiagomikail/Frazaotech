import React, { useState } from 'react';
import { Table2, Download, AlertTriangle } from 'lucide-react';
import { Button, IconBadge, Modal } from '../ui';
import { BAND_TONE } from './FmeaPanel';
import { TONE } from './RegenScoreCard';

/**
 * Matriz FMEA completa, no formato de tabela que um engenheiro de processo
 * reconhece de imediato: componente, funcao, modo de falha, efeito, S, causa,
 * O, controles, D, RPN, acao e RPN residual.
 *
 * O filtro por banda existe porque a conversa muda conforme a sala: numa
 * reuniao de manutencao interessa Critical e High; numa auditoria, a tabela
 * inteira.
 *
 * O CSV sai com o cabecalho na mesma ordem, para colar direto na planilha de
 * FMEA que a planta ja' mantem.
 */

const FmeaMatrixModal = ({ system, fmea, onClose }) => {
    const [filter, setFilter] = useState('all'); // all | active | critical

    const rows = fmea.rows.filter(r => {
        if (filter === 'active') return r.active;
        if (filter === 'critical') return r.rpn >= 120 || r.severityFlag;
        return true;
    });

    const exportCsv = () => {
        const head = [
            'Component', 'Function', 'Failure Mode', 'Effect of Failure', 'SEV',
            'Cause', 'OCC', 'Current Controls', 'DET', 'RPN',
            'Recommended Action', 'Target OCC', 'RPN After', 'Evidence Now'
        ];
        const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
        const lines = [
            head.map(esc).join(','),
            ...fmea.rows.map(r => [
                r.component, r.functionText, r.failureMode, r.effect, r.severity,
                r.cause, r.occurrence, r.currentControls, r.detection, r.rpn,
                r.recommendedAction, r.targetOccurrence, r.rpnAfter,
                r.active ? r.evidenceNote : ''
            ].map(esc).join(','))
        ];

        const blob = new Blob(['﻿' + lines.join('\n')], {
            type: 'text/csv;charset=utf-8;'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FMEA_${system.name.replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const actionCount = fmea.rows.filter(r => r.rpn >= 120 || r.severityFlag).length;
    const filters = [
        { k: 'all', label: `All (${fmea.rows.length})`, testId: 'matrix-filter-all' },
        { k: 'critical', label: `Action required (${actionCount})`, testId: 'matrix-filter-action' },
        { k: 'active', label: `Active now (${fmea.active.length})`, testId: 'matrix-filter-active' }
    ];

    return (
        <Modal
            title={`FMEA — ${system.name}`}
            subtitle={`${system.asset} · ${system.mediaType} · commissioned ${system.commissioned}`}
            icon={<IconBadge icon={Table2} tone="gray" size={28} />}
            onClose={onClose}
            size="lg"
            footer={
                <>
                    <span className="mr-auto text-[12px] leading-snug text-ink-2">
                        Occurrence marked <span className="font-semibold text-orange-ink">↑</span> was raised above
                        its baseline by the current reading — the failure is signalling now.
                    </span>
                    <span className="text-[12px] text-ink-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.06em]">Total RPN</span>{' '}
                        <strong className="font-mono font-medium tabular-nums text-ink">{fmea.totalRpn}</strong> →{' '}
                        <strong className="font-mono font-medium tabular-nums text-green-ink">{fmea.totalRpnAfter}</strong> if all
                        actions close
                    </span>
                    <Button size="sm" onClick={exportCsv}>
                        <Download size={13} /> Export CSV
                    </Button>
                </>
            }
        >
            <div className="sticky left-0 top-0 z-20 flex h-12 items-center overflow-x-auto border-b border-line bg-surface px-3">
                <div className="flex shrink-0 overflow-hidden rounded-sm border border-line bg-raised" role="tablist">
                    {filters.map(f => {
                        const on = filter === f.k;
                        return (
                            <button
                                key={f.k}
                                type="button"
                                role="tab"
                                aria-selected={on}
                                onClick={() => setFilter(f.k)}
                                data-testid={f.testId}
                                className={`h-7 whitespace-nowrap px-3 text-[11px] font-bold uppercase tracking-[0.06em] tabular-nums transition-colors not-first:border-l not-first:border-line ${
                                    on ? 'bg-thumb text-on-thumb' : 'text-ink-2 hover:bg-fill'
                                }`}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <table className="w-full min-w-[1040px] table-fixed border-collapse text-left text-[12px] leading-snug" data-testid="fmea-matrix">
                <thead>
                    <tr className="[&>th]:sticky [&>th]:top-12 [&>th]:z-10 [&>th]:border-b [&>th]:border-line [&>th]:bg-strip [&>th]:px-2 [&>th]:py-2 [&>th]:text-[10px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.06em] [&>th]:text-ink-2">
                        <th className="w-[9%] pl-3!">Component</th>
                        <th className="w-[10%]">Function</th>
                        <th className="w-[12%]">Failure mode</th>
                        <th className="w-[14%]">Effect</th>
                        <th className="w-[4%] text-center">Sev</th>
                        <th className="w-[11%]">Cause</th>
                        <th className="w-[4%] text-center">Occ</th>
                        <th className="w-[11%]">Current controls</th>
                        <th className="w-[4%] text-center">Det</th>
                        <th className="w-[4%] text-center">RPN</th>
                        <th className="w-[13%]">Recommended action</th>
                        <th className="w-[4%] pr-3! text-center">RPN after</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {rows.map(r => {
                        const tone = BAND_TONE[r.band.label] || 'gray';
                        return (
                            <tr
                                key={r.id}
                                className={`align-top text-ink-2 [&>td]:px-2 [&>td]:py-2 ${r.active ? 'bg-orange/10' : ''}`}
                            >
                                <td className="pl-3! font-semibold text-ink">
                                    {r.component}
                                    {r.severityFlag && (
                                        <span
                                            className="ml-1 inline-flex align-middle text-red"
                                            title="Severity ≥ 9 — control required regardless of RPN"
                                        >
                                            <AlertTriangle size={11} />
                                        </span>
                                    )}
                                </td>
                                <td>{r.functionText}</td>
                                <td className="font-semibold text-ink">
                                    {r.failureMode}
                                    {r.active && (
                                        <div className="mt-1 text-[11px] font-normal text-orange-ink">{r.evidenceNote}</div>
                                    )}
                                </td>
                                <td>{r.effect}</td>
                                <td className="text-center font-mono tabular-nums text-ink">{r.severity}</td>
                                <td>{r.cause}</td>
                                <td className="text-center font-mono tabular-nums text-ink">
                                    {r.occurrence}
                                    {r.occurrence > r.baseOccurrence && (
                                        <span
                                            className="ml-0.5 font-semibold text-orange-ink"
                                            title={`Base occurrence ${r.baseOccurrence}, raised by current readings`}
                                        >
                                            ↑
                                        </span>
                                    )}
                                </td>
                                <td>{r.currentControls}</td>
                                <td className="text-center font-mono tabular-nums text-ink">{r.detection}</td>
                                <td className="text-center">
                                    <span className={`font-mono text-[13px] font-medium tabular-nums ${TONE[tone].text}`}>{r.rpn}</span>
                                </td>
                                <td>{r.recommendedAction}</td>
                                <td className="pr-3! text-center font-mono font-medium tabular-nums text-green-ink">{r.rpnAfter}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </Modal>
    );
};

export default FmeaMatrixModal;
