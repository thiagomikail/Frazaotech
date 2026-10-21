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
                fill: c.ink3 // gray: what leaves without doing work
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

            <PanelBody className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-sm border border-line bg-field px-3 py-2.5">
                        <Stat label="Total loss" value={`-${asset.energy.totalLoss}`} unit="MMBtu/hr" />
                    </div>
                    <div className="rounded-sm border border-line bg-field px-3 py-2.5">
                        <Stat label="Efficiency" value={`${efficiency.toFixed(1)}%`} tone={efficiencyTone} hint="Target: 48%" />
                    </div>
                </div>

                <div className="overflow-hidden rounded-sm border border-line bg-field">
                    <div className="flex items-baseline justify-between border-b border-line bg-strip px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">
                        <span>Loss factor</span>
                        <span>MMBtu/hr</span>
                    </div>
                    <ul className="divide-y divide-line">
                        {asset.losses.map((loss) => (
                            <li key={loss.id} className="px-3 py-2">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-[14px] font-semibold text-ink">{loss.name}</span>
                                    <span className="shrink-0 font-mono text-[13px] font-medium tabular-nums text-ink">
                                        -{loss.value.toFixed(2)}
                                    </span>
                                </div>
                                <div className="mt-1.5 h-2 overflow-hidden rounded-sm border border-line bg-surface">
                                    <div className="h-full bg-ink-3" style={{ width: `${(loss.value / 6) * 100}%` }} />
                                </div>
                                <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.04em] text-ink-3">
                                    {loss.category}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <SectionTitle>Energy flow diagram</SectionTitle>
                    <div className="relative h-[260px] w-full rounded-sm border border-line bg-field">
                        <SankeyDiagram data={getSankeyData()} />
                    </div>
                </div>
            </PanelBody>
        </>
    );
};

export default LossPanel;
