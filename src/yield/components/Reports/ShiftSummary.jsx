import React from 'react';
import { FileText, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button, Panel, PanelBody, PanelHeader } from '../ui';

const ShiftSummary = () => {
    return (
        <Panel className="h-full">
            <PanelHeader icon={FileText} title="Shift handoff summary" />

            <PanelBody className="text-[14px] leading-relaxed text-ink-2">

                <div className="mb-4 border-b border-line pb-4">
                    <div className="text-[12px] text-ink-2">Current shift</div>
                    <div className="text-[17px] font-semibold tracking-tight text-ink">Shift A – Day ops</div>
                    <div className="text-[12px] tabular-nums text-ink-3">06:00 – 14:00 · Operator: M. Thompson</div>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-green/10 p-3">
                        <div className="text-[12px] font-medium text-green-ink">Total output</div>
                        <div className="text-[20px] font-semibold tracking-tight tabular-nums text-ink">
                            420 <span className="text-[13px] font-normal text-ink-2">tons</span>
                        </div>
                    </div>
                    <div className="rounded-xl bg-red/10 p-3">
                        <div className="text-[12px] font-medium text-red-ink">Total loss</div>
                        <div className="text-[20px] font-semibold tracking-tight tabular-nums text-ink">
                            12.5 <span className="text-[13px] font-normal text-ink-2">MMBtu</span>
                        </div>
                    </div>
                </div>

                <div className="mb-5">
                    <h4 className="mb-1.5 text-[15px] font-semibold tracking-tight text-ink">Operational highlights</h4>
                    <p className="mb-2">
                        Furnace 1 operated at nominal capacity. Minor deviation in zone 3 temperature stabilization corrected by auto-tune loop at 09:30.
                    </p>
                    <p>
                        <span className="font-semibold text-orange-ink">Attention:</span> Furnace 2 burner &apos;A&apos; requires maintenance lock-out during Shift B turnover. Pre-checks completed.
                    </p>
                </div>

                <div>
                    <h4 className="mb-1.5 text-[15px] font-semibold tracking-tight text-ink">Action log</h4>
                    <ul className="space-y-2 text-[13px]">
                        <li className="flex items-center gap-2 text-ink">
                            <CheckCircle size={15} className="shrink-0 text-green" />
                            <span>Authorized salt reduction protocol</span>
                        </li>
                        <li className="flex items-center gap-2 text-ink">
                            <CheckCircle size={15} className="shrink-0 text-green" />
                            <span>Optimized holding temp (-5°C)</span>
                        </li>
                        <li className="flex items-center gap-2 text-ink-2">
                            <AlertTriangle size={15} className="shrink-0 text-orange" />
                            <span>Pending: burner A valve check</span>
                        </li>
                    </ul>
                </div>

            </PanelBody>

            <div className="border-t border-line p-4">
                <Button variant="primary" size="lg" className="w-full">
                    <Download size={17} />
                    Export shift report (PDF)
                </Button>
            </div>
        </Panel>
    );
};

export default ShiftSummary;
