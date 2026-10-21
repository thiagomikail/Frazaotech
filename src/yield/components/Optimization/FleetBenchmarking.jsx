import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { BarChart2 } from 'lucide-react';
import { Panel, PanelHeader } from '../ui';
import { useColors } from '../../lib/colors';

const FleetBenchmarking = () => {
    const c = useColors();
    const data = [
        { subject: 'Thermal eff.', A: 120, B: 110, fullMark: 150 },
        { subject: 'Uptime', A: 98, B: 130, fullMark: 150 },
        { subject: 'Cost/ton', A: 86, B: 130, fullMark: 150 },
        { subject: 'Emissions', A: 99, B: 100, fullMark: 150 },
        { subject: 'Safety', A: 85, B: 90, fullMark: 150 },
    ];

    return (
        <Panel className="h-full">
            <PanelHeader icon={BarChart2} title="Fleet benchmarking" />

            <div className="relative min-h-0 flex-1 overflow-hidden px-2">
                <ResponsiveContainer width="99%" height="100%" minHeight={150}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                        <PolarGrid stroke={c.grid} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: c.ink2, fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />

                        <Radar
                            name="Furnace 1 (best)"
                            dataKey="A"
                            stroke={c.accent}
                            strokeWidth={2}
                            fill={c.accent}
                            fillOpacity={0.14}
                            isAnimationActive={false}
                        />
                        <Radar
                            name="Furnace 2"
                            dataKey="B"
                            stroke={c.ink3}
                            strokeWidth={2}
                            strokeDasharray="5 3"
                            fill={c.ink3}
                            fillOpacity={0.1}
                            isAnimationActive={false}
                        />

                        <Legend
                            iconType="square"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 11 }}
                            formatter={(value) => <span className="text-ink-2">{value}</span>}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            <div className="px-3 pb-3 pt-1">
                <div className="rounded-sm border border-line bg-field px-3 py-2 text-center text-[12px] text-ink-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.06em]">Top performer:</span>{' '}
                    <span className="font-semibold text-ink">Furnace 1</span> (<span className="font-mono">+12%</span> vs fleet avg)
                </div>
            </div>
        </Panel>
    );
};

export default FleetBenchmarking;
