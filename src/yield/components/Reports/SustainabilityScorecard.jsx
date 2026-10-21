import React from 'react';
import { Leaf, Award, TrendingDown, Target } from 'lucide-react';
import { Badge, IconBadge, Panel, PanelBody, PanelHeader } from '../ui';

const SustainabilityScorecard = () => {
    return (
        <Panel className="h-full">
            <PanelHeader icon={Leaf} title="Annual sustainability & ESG" />

            <PanelBody className="flex flex-col gap-6">

                {/* Score Header */}
                <div className="border-b border-line pb-5 pt-2 text-center">
                    <div className="mb-1 text-[12px] text-ink-2">ISO 50001 compliance score</div>
                    <div className="text-[56px] font-semibold leading-none tracking-tight tabular-nums text-ink">
                        94<span className="text-[26px] text-green-ink">%</span>
                    </div>
                    <Badge tone="green" className="mt-3 px-2.5 py-1 text-[12px]">
                        <Award size={13} />
                        Platinum tier
                    </Badge>
                </div>

                {/* Key Metrics */}
                <div className="divide-y divide-line">
                    <div className="flex items-center justify-between gap-3 pb-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <IconBadge icon={TrendingDown} tone="green" size={40} />
                            <div className="min-w-0">
                                <div className="text-[20px] font-semibold leading-tight tracking-tight tabular-nums text-ink">1,240 tons</div>
                                <div className="text-[12px] text-ink-2">CO₂ emissions avoided</div>
                            </div>
                        </div>
                        <div className="shrink-0 text-[13px] font-semibold tabular-nums text-green-ink">-12% YoY</div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <IconBadge icon={Target} tone="blue" size={40} />
                            <div className="min-w-0">
                                <div className="text-[20px] font-semibold leading-tight tracking-tight tabular-nums text-ink">
                                    3.4 MMBtu<span className="text-[14px] font-normal text-ink-3">/ton</span>
                                </div>
                                <div className="text-[12px] text-ink-2">Energy intensity</div>
                            </div>
                        </div>
                        <div className="shrink-0 text-[13px] font-semibold tabular-nums text-green-ink">-8% YoY</div>
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
