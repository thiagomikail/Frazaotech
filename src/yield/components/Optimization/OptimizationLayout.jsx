import React from 'react';
import EnergyScheduler from './EnergyScheduler';
import DigitalTwinSim from './DigitalTwinSim';
import FleetBenchmarking from './FleetBenchmarking';

const OptimizationLayout = () => (
    // Desktop: the scheduler on top, the simulator and the benchmark side by side below,
    // all inside the screen. Narrower: one card after the other and the page scrolls.
    <div className="grid grid-cols-1 gap-3 lg:h-full lg:grid-rows-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-h-[360px] lg:min-h-0">
            <EnergyScheduler />
        </div>
        <div className="grid grid-cols-1 gap-3 lg:min-h-0 lg:grid-cols-2">
            <div className="min-h-[340px] lg:min-h-0">
                <DigitalTwinSim />
            </div>
            <div className="min-h-[340px] lg:min-h-0">
                <FleetBenchmarking />
            </div>
        </div>
    </div>
);

export default OptimizationLayout;
