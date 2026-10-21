import React, {} from 'react';
import { Calendar, Move, DollarSign } from 'lucide-react';
import { Badge, Panel, PanelHeader } from '../ui';

const EnergyScheduler = () => {
    // Mock Data for 24h timeline
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Price Zones (High = Red, Low = Green)
    const priceZones = [
        { start: 14, end: 19, type: 'peak', label: 'Peak pricing' }, // 2pm - 7pm
        { start: 0, end: 6, type: 'off-peak', label: 'Off-peak' }   // Midnight - 6am
    ];

    // Production Blocks
    const productionBlocks = [
        { id: 1, name: 'Batch A-101', start: 2, duration: 4, type: 'melt', color: 'cyan' },
        { id: 2, name: 'Batch B-205', start: 9, duration: 5, type: 'hold', color: 'purple' },
        { id: 3, name: 'Batch A-102', start: 16, duration: 4, type: 'melt', color: 'cyan', warning: true } // Overlaps peak
    ];

    const getLeft = (h) => `${(h / 24) * 100}%`;
    const getWidth = (d) => `${(d / 24) * 100}%`;

    return (
        <Panel className="h-full">
            <PanelHeader icon={Calendar} title="Production energy scheduler" />

            <div className="flex min-h-0 flex-1 flex-col p-3">
                {/* Legend */}
                <div className="mb-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[11px] text-ink-2">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 border border-orange bg-orange/20" />
                        <span>
                            High cost (<span className="font-mono">$0.18</span>/kWh)
                        </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 border border-green bg-green/15" />
                        <span>
                            Low cost (<span className="font-mono">$0.08</span>/kWh)
                        </span>
                    </span>
                </div>

                {/* Timeline header, aligned with the grid lines below */}
                <div className="mb-1 flex font-mono text-[10px] tabular-nums text-ink-3">
                    <div className="w-12 shrink-0" />
                    <div className="relative h-4 flex-1">
                        {hours.filter(h => h % 3 === 0).map(h => (
                            <span
                                key={h}
                                className={`absolute top-0 ${h === 0 ? '' : '-translate-x-1/2'} ${h % 6 === 0 ? '' : 'hidden sm:inline'}`}
                                style={{ left: getLeft(h) }}
                            >
                                {h}:00
                            </span>
                        ))}
                    </div>
                </div>

                {/* Main Gantt Area */}
                <div className="flex min-h-[180px] flex-1 overflow-hidden rounded-sm border border-line">

                    {/* Left Axis Labels */}
                    <div className="z-10 grid w-12 shrink-0 grid-rows-3 items-center border-r border-line bg-strip pb-2 pt-6 text-center font-mono text-[11px] font-medium text-ink-2">
                        <div>F-1</div>
                        <div>F-2</div>
                        <div>K-1</div>
                    </div>

                    {/* Timeline Grid */}
                    <div className="relative flex-1 bg-field">
                        {/* Hour Grid Lines */}
                        {hours.map(h => (
                            <div
                                key={h}
                                className="absolute inset-y-0 w-px bg-line opacity-50"
                                style={{ left: getLeft(h) }}
                            ></div>
                        ))}

                        {/* Price Zones */}
                        {priceZones.map((zone, idx) => (
                            <div
                                key={idx}
                                className={`absolute inset-y-0 flex justify-center border-x border-dashed pt-1.5 text-[10px] font-bold uppercase tracking-[0.06em] ${
                                    zone.type === 'peak'
                                        ? 'border-orange bg-orange/10 text-orange-ink'
                                        : 'border-green bg-green/10 text-green-ink'
                                }`}
                                style={{ left: getLeft(zone.start), width: getWidth(zone.end - zone.start) }}
                            >
                                <span className="truncate px-1">{zone.label}</span>
                            </div>
                        ))}

                        {/* Blocks: batches 1 and 3 on F-1, batch 2 on F-2, centered on their row label
                            (rows share the height below the 24 px band that holds the price labels) */}
                        {productionBlocks.map(block => (
                            <div
                                key={block.id}
                                className={`absolute z-20 flex h-8 -translate-y-1/2 cursor-grab items-center justify-between gap-1 rounded-sm px-2 font-mono text-[11px] font-medium text-surface ${
                                    block.color === 'cyan' ? 'bg-ink-2' : 'bg-ink-3'
                                } ${block.warning ? 'ring-2 ring-red ring-offset-1 ring-offset-field' : ''}`}
                                style={{
                                    left: getLeft(block.start),
                                    top: `calc(24px + (100% - 32px) * ${((block.id === 2 ? 1 : 0) + 0.5) / 3})`,
                                    width: getWidth(block.duration),
                                }}
                            >
                                <span className="truncate">{block.name}</span>
                                {block.warning && <DollarSign size={12} className="shrink-0 opacity-90" />}
                            </div>
                        ))}

                        {/* Current Time */}
                        <div className="absolute inset-y-0 z-30 w-0.5 bg-ink" style={{ left: '45%' }}>
                            <div className="absolute -left-[3px] -top-0.5 h-2 w-2 rounded-full bg-ink" />
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-3">
                    <div className="flex items-center gap-1.5">
                        <Move size={14} />
                        <span>Drag blocks to optimize</span>
                    </div>
                    <Badge tone="red" className="py-1 text-[11px]">
                        <DollarSign size={13} />
                        Batch A-102 exceeding cost budget
                    </Badge>
                </div>
            </div>
        </Panel>
    );
};

export default EnergyScheduler;
