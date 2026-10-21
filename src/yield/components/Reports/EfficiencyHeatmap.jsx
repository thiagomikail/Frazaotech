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
        if (status === 'good') return 'bg-green';
        if (status === 'avg') return 'bg-orange';
        return 'bg-red';
    };

    return (
        <Panel className="h-full">
            <PanelHeader icon={Calendar} title="Yearly efficiency heatmap" />

            <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
                {/* Legend */}
                <div className="mb-3 flex flex-wrap justify-end gap-x-4 gap-y-1 text-[11px] text-ink-2">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-green" /> &gt; 95% eff.</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-orange" /> 85–95% eff.</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-red" /> &lt; 85% eff.</span>
                </div>

                {/* Grid: one column per month, one cell per week */}
                <div className="grid min-h-[150px] flex-1 grid-cols-12 gap-1 sm:gap-1.5">
                    {heatmapData.map((month, mIdx) => (
                        <div key={mIdx} className="flex min-w-0 flex-col gap-1 sm:gap-1.5">
                            <div className="text-center text-[10px] text-ink-3 sm:text-[11px]">{month.name}</div>
                            {month.weeks.map((status, wIdx) => (
                                <div
                                    key={wIdx}
                                    className={`min-h-[14px] flex-1 cursor-pointer rounded-[5px] opacity-85 transition-opacity hover:opacity-100 ${getColor(status)}`}
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
