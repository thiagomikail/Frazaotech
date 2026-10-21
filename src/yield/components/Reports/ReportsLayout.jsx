import React, { useState } from 'react';
import ShiftSummary from './ShiftSummary';
import CostDeviationChart from './CostDeviationChart';
import AuditLog from './AuditLog';
import SustainabilityScorecard from './SustainabilityScorecard';
import EfficiencyHeatmap from './EfficiencyHeatmap';
import SavingsWaterfall from './SavingsWaterfall';
import { Segmented } from '../ui';

const VIEWS = [
    { value: 'daily', label: 'Daily operations' },
    { value: 'yearly', label: 'Yearly executive' },
];

const ReportsLayout = () => {
    const [timeframe, setTimeframe] = useState('daily'); // 'daily' | 'yearly'

    return (
        <div className="flex flex-col gap-4 lg:h-full">
            {/* View Toggle */}
            <Segmented
                options={VIEWS}
                value={timeframe}
                onChange={setTimeframe}
                testId="reports-view"
                className="w-full shrink-0 self-center sm:w-[360px]"
            />

            {/* Content Grid: one third left, two thirds right */}
            <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                {/* Left Column */}
                <div className="min-h-[420px] lg:min-h-0">
                    {timeframe === 'daily' ? <ShiftSummary /> : <SustainabilityScorecard />}
                </div>

                {/* Right Column */}
                <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:grid-rows-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="min-h-[300px] lg:min-h-0">
                        {timeframe === 'daily' ? <CostDeviationChart /> : <EfficiencyHeatmap />}
                    </div>
                    <div className="min-h-[280px] lg:min-h-0">
                        {timeframe === 'daily' ? <AuditLog /> : <SavingsWaterfall />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsLayout;
