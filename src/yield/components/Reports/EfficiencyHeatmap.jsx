import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { Panel, PanelHeader } from '../ui';

const EfficiencyHeatmap = () => {
    // Simulate a year of data (12 months x 4 weeks approx)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate mock heatmap data
    const generateMonthData = () => {
        return Array.from({ length: 4 }, () => Math.random() > 0.3 ? 'good' : Math.random() > 0.5 ? 'avg' : 'bad');
    };

    // Drawn once: generated on every render, the year reshuffled whenever anything re-rendered it.
    const heatmapData = useMemo(() => months.map(month => ({
        name: month,
        weeks: generateMonthData()
    })), []);

    // HTML cells, so the theme's classes carry the color in both appearances.
    const getColor = (status) => {
        if (status === 'good') return 'bg-green/70';
        if (status === 'avg') return 'bg-orange';
        return 'bg-red';
    };

    return (
        <Panel className="h-full">
            <PanelHeader icon={Calendar} title="Yearly efficiency heatmap" />

            <div className="flex min-h-0 flex-1 flex-col p-3">
                {/* Legend */}
                <div className="mb-2 flex flex-wrap justify-end gap-x-4 gap-y-1 text-[11px] text-ink-2">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 bg-green/70" />
                        <span><span className="font-mono">&gt; 95%</span> eff.</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 bg-orange" />
                        <span><span className="font-mono">85–95%</span> eff.</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 bg-red" />
                        <span><span className="font-mono">&lt; 85%</span> eff.</span>
                    </span>
                </div>

                {/* Grid: one column per month, one cell per week */}
                <div className="grid min-h-[150px] flex-1 grid-cols-12 gap-1">
                    {heatmapData.map((month, mIdx) => (
                        <div key={mIdx} className="flex min-w-0 flex-col gap-1">
                            <div className="truncate text-center text-[9px] font-bold uppercase tracking-[0.04em] text-ink-2 sm:text-[10px]">{month.name}</div>
                            {month.weeks.map((status, wIdx) => (
                                <div
                                    key={wIdx}
                                    className={`min-h-[14px] flex-1 cursor-pointer border border-black/15 opacity-90 transition-opacity hover:opacity-100 ${getColor(status)}`}
                                    title={`Week ${wIdx + 1}: ${status}`}
                                ></div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </Panel>
    );
};

export default EfficiencyHeatmap;
