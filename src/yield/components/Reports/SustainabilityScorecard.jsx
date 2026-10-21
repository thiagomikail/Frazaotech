import React from 'react';
import { Leaf, Award, TrendingDown, Target } from 'lucide-react';
import { Badge, IconBadge, Panel, PanelBody, PanelHeader } from '../ui';

const SustainabilityScorecard = () => {
    return (
        <Panel className="h-full">
            <PanelHeader icon={Leaf} title="Annual sustainability & ESG" />

            <PanelBody className="flex flex-col gap-4">

                {/* Score Header */}
                <div className="rounded-sm border border-line bg-field px-3 pb-4 pt-3 text-center">
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">ISO 50001 compliance score</div>
                    <div className="font-mono text-[52px] font-medium leading-none tabular-nums text-ink">
                        94<span className="font-sans text-[24px] text-ink-2">%</span>
                    </div>
                    <Badge tone="green" className="mt-3 px-2 py-1 text-[11px]">
                        <Award size={13} />
                        Platinum tier
                    </Badge>
                </div>

                {/* Key Metrics */}
                <div className="divide-y divide-line overflow-hidden rounded-sm border border-line bg-field">
                    <div className="flex items-center justify-between gap-3 px-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <IconBadge icon={TrendingDown} tone="gray" size={32} />
                            <div className="min-w-0">
                                <div className="font-mono text-[20px] font-medium leading-tight tabular-nums text-ink">
                                    1,240 <span className="font-sans text-[13px] font-normal text-ink-2">tons</span>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">CO₂ emissions avoided</div>
                            </div>
                        </div>
                        <div className="shrink-0 text-[12px] font-semibold text-green-ink">
                            <span className="font-mono tabular-nums">-12%</span> YoY
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 px-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <IconBadge icon={Target} tone="gray" size={32} />
                            <div className="min-w-0">
                                <div className="font-mono text-[20px] font-medium leading-tight tabular-nums text-ink">
                                    3.4 <span className="font-sans text-[13px] font-normal text-ink-2">MMBtu/ton</span>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">Energy intensity</div>
                            </div>
                        </div>
                        <div className="shrink-0 text-[12px] font-semibold text-green-ink">
                            <span className="font-mono tabular-nums">-8%</span> YoY
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="mt-auto text-center text-[11px] leading-relaxed text-ink-3">
                    Data verified by 3rd party audit (GreenCert Inc.) on Dec 1st, 2024. Next audit scheduled for Q2.
                </div>

            </PanelBody>
        </Panel>
    );
};

export default SustainabilityScorecard;
