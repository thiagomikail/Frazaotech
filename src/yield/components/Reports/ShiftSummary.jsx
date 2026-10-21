import React from 'react';
import { FileText, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button, Panel, PanelBody, PanelHeader, SectionTitle, Stat } from '../ui';

const ShiftSummary = () => {
    return (
        <Panel className="h-full">
            <PanelHeader icon={FileText} title="Shift handoff summary" />

            <PanelBody className="text-[13px] leading-relaxed text-ink-2">

                <div className="mb-3 border-b border-line pb-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">Current shift</div>
                    <div className="text-[16px] font-bold text-ink">Shift A – Day ops</div>
                    <div className="text-[12px] text-ink-3">
                        <span className="font-mono tabular-nums">06:00 – 14:00</span> · Operator: M. Thompson
                    </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2">
                    <div className="rounded-sm border border-line bg-field px-3 py-2">
                        <Stat label="Total output" value="420" unit="tons" />
                    </div>
                    <div className="rounded-sm border border-line bg-field px-3 py-2">
                        <Stat label="Total loss" value="12.5" unit="MMBtu" />
                    </div>
                </div>

                <div className="mb-4">
                    <SectionTitle className="mb-1.5">Operational highlights</SectionTitle>
                    <p className="mb-2">
                        Furnace 1 operated at nominal capacity. Minor deviation in zone 3 temperature stabilization corrected by auto-tune loop at 09:30.
                    </p>
                    <p className="rounded-sm border border-l-4 border-line border-l-orange bg-field px-3 py-2">
                        <span className="font-bold uppercase tracking-[0.04em] text-orange-ink">Attention:</span> Furnace 2 burner &apos;A&apos; requires maintenance lock-out during Shift B turnover. Pre-checks completed.
                    </p>
                </div>

                <div>
                    <SectionTitle className="mb-1.5">Action log</SectionTitle>
                    <ul className="divide-y divide-line overflow-hidden rounded-sm border border-line bg-field text-[13px]">
                        <li className="flex items-center gap-2 px-3 py-2 text-ink">
                            <CheckCircle size={15} className="shrink-0 text-green" />
                            <span>Authorized salt reduction protocol</span>
                        </li>
                        <li className="flex items-center gap-2 px-3 py-2 text-ink">
                            <CheckCircle size={15} className="shrink-0 text-green" />
                            <span>Optimized holding temp (-5°C)</span>
                        </li>
                        <li className="flex items-center gap-2 px-3 py-2 text-ink-2">
                            <AlertTriangle size={15} className="shrink-0 text-orange" />
                            <span>Pending: burner A valve check</span>
                        </li>
                    </ul>
                </div>

            </PanelBody>

            <div className="border-t border-line bg-strip p-2">
                <Button variant="primary" className="w-full">
                    <Download size={14} />
                    Export shift report (PDF)
                </Button>
            </div>
        </Panel>
    );
};

export default ShiftSummary;
