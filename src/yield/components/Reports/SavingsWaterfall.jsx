import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { DollarSign } from 'lucide-react';
import { Panel, PanelHeader } from '../ui';
import { tooltipProps, useColors } from '../../lib/colors';

const SavingsWaterfall = () => {
    const c = useColors();
    const data = [
        { name: 'Burner tuning', value: 125000 },
        { name: 'Salt reduction', value: 85000 },
        { name: 'Charge opt.', value: 210000 },
        { name: 'Scheduling', value: 45000 },
        { name: 'Leak fixes', value: 30000 },
    ];

    const totalSavings = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <Panel className="h-full">
            <PanelHeader
                icon={DollarSign}
                title="ROI & savings waterfall"
                action={
                    <span className="shrink-0 text-[12px] text-ink-2">
                        <span className="hidden text-[10px] font-bold uppercase tracking-[0.06em] sm:inline">Total YTD </span>
                        <span className="font-mono font-medium tabular-nums text-green-ink">${(totalSavings / 1000).toFixed(0)}k</span>
                    </span>
                }
            />

            <div className="min-h-0 flex-1 px-3 pb-3 pt-1">
                <ResponsiveContainer width="99%" height="100%" minHeight={200}>
                    <BarChart data={data} layout="vertical" margin={{ top: 8, right: 48, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke={c.grid} horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={110}
                            tick={{ fill: c.ink, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            {...tooltipProps(c)}
                            formatter={(value) => [`$${value.toLocaleString()}`, 'Savings']}
                        />
                        {/* One gray for every lever: the length is the reading, the value sits at the end in mono. */}
                        <Bar dataKey="value" barSize={18} fill={c.ink3} isAnimationActive={false}>
                            <LabelList
                                dataKey="value"
                                position="right"
                                formatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                                style={{ fill: c.ink2, fontSize: 11, fontFamily: 'var(--font-mono)' }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Panel>
    );
};

export default SavingsWaterfall;
