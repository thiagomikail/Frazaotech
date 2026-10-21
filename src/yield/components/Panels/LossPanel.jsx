import React from 'react';
import { Activity } from 'lucide-react';
import SankeyDiagram from '../Sankey/SankeyDiagram';
import { PanelBody, PanelHeader, SectionTitle, Stat } from '../ui';
import { useColors } from '../../lib/colors';

const LossPanel = ({ asset }) => {
    const c = useColors();

    if (!asset) {
        return (
            <div className="flex h-full items-center justify-center p-4 text-center text-[13px] text-ink-3">
                Select an asset to view losses
            </div>
        );
    }

    // Transform asset data for Sankey
    const getSankeyData = () => {
        const nodes = [
            { name: 'Total Input' }, // 0
            { name: 'Useful' },      // 1
            ...asset.losses.map(l => ({ name: l.name })) // 2...N
        ];

        const links = [
            // Input -> Useful
            {
                source: 0,
                target: 1,
                value: parseFloat(asset.energy.usefulEnergy),
                fill: 'url(#gradientUseful)'
            },
            // Input -> Losses
            ...asset.losses.map((loss, idx) => ({
                source: 0,
                target: idx + 2,
                value: typeof loss.value === 'string' ? parseFloat(loss.value) : loss.value,
                fill: c.red // Red for losses
            }))
        ];
        return { nodes, links };
    };

    const efficiency = asset.energy.usefulEnergy / asset.energy.currentLoad * 100;
    // Target is 48%: below it is a warning, far below it is a problem.
    const efficiencyTone = efficiency >= 48 ? 'green' : efficiency >= 25 ? 'orange' : 'red';

    return (
        <>
            <PanelHeader icon={Activity} title="Energy loss breakdown" subtitle={asset.name} />

            <PanelBody className="flex flex-col gap-5 pt-2">
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-fill/60 px-3.5 py-3">
                        <Stat label="Total loss" value={`-${asset.energy.totalLoss}`} unit="MMBtu/hr" tone="red" />
                    </div>
                    <div className="rounded-xl bg-fill/60 px-3.5 py-3">
                        <Stat label="Efficiency" value={`${efficiency.toFixed(1)}%`} tone={efficiencyTone} hint="Target: 48%" />
                    </div>
                </div>

                <div>
                    <div className="flex items-baseline justify-between border-b border-line pb-1.5 text-[12px] text-ink-2">
                        <span className="font-semibold">Loss factor</span>
                        <span>Value (MMBtu/hr)</span>
                    </div>
                    <ul className="divide-y divide-line">
                        {asset.losses.map((loss) => (
                            <li key={loss.id} className="py-2.5">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-[14px] font-medium text-ink">{loss.name}</span>
                                    <span className="shrink-0 text-[14px] font-semibold tabular-nums text-red-ink">
                                        -{loss.value.toFixed(2)}
                                    </span>
                                </div>
                                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fill">
                                    <div
                                        className="h-full rounded-full bg-red"
                                        style={{ width: `${(loss.value / 6) * 100}%` }}
                                    />
                                </div>
                                <div className="mt-1 text-[11px] text-ink-3">{loss.category}</div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <SectionTitle>Energy flow diagram</SectionTitle>
                    <div className="relative h-[260px] w-full">
                        <SankeyDiagram data={getSankeyData()} />
                    </div>
                </div>
            </PanelBody>
        </>
    );
};

export default LossPanel;
