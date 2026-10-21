import React from 'react';
import { ComposedChart, Bar, Cell, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Panel, PanelHeader } from '../ui';
import { axisProps, tooltipProps, useColors } from '../../lib/colors';

const CostDeviationChart = () => {
    const c = useColors();
    const data = [
        { name: '06:00', budget: 400, actual: 380 },
        { name: '07:00', budget: 450, actual: 445 },
        { name: '08:00', budget: 450, actual: 460 },
        { name: '09:00', budget: 450, actual: 510 }, // Spike
        { name: '10:00', budget: 450, actual: 455 },
        { name: '11:00', budget: 420, actual: 410 },
        { name: '12:00', budget: 400, actual: 390 },
        { name: '13:00', budget: 400, actual: 405 },
    ];

    return (
        <Panel className="h-full">
            <PanelHeader
                icon={TrendingUp}
                title="Cost deviation analysis"
                action={
                    <span className="shrink-0 text-[12px] text-ink-2">
                        <span className="hidden text-[10px] font-bold uppercase tracking-[0.06em] sm:inline">Cumulative variance </span>
                        <span className="font-mono font-medium tabular-nums text-orange-ink">+$45.00</span>
                    </span>
                }
            />

            <div className="min-h-0 flex-1 px-3 pb-3 pt-1">
                <ResponsiveContainer width="99%" height="100%" minHeight={200}>
                    <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={c.grid} vertical={false} />
                        <XAxis dataKey="name" {...axisProps(c)} dy={6} />
                        <YAxis
                            {...axisProps(c)}
                            axisLine={false}
                            width={48}
                            tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip {...tooltipProps(c)} />
                        <Legend
                            iconType="square"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                            formatter={(value) => <span className="text-ink-2">{value}</span>}
                        />

                        {/* Gray is normal; an hour more than 5% over budget is the one that turns amber. */}
                        <Bar dataKey="actual" name="Actual cost ($)" barSize={20} fill={c.ink3}>
                            {data.map((d) => (
                                <Cell key={d.name} fill={d.actual > d.budget * 1.05 ? c.orange : c.ink3} />
                            ))}
                        </Bar>
                        <Line type="monotone" dataKey="budget" name="Budget target ($)" stroke={c.ink} strokeWidth={2} strokeDasharray="6 3" dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Panel>
    );
};

export default CostDeviationChart;
