import React, { useState } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import { Button, IconBadge, Modal, SectionTitle, Stat } from '../ui';

/** A labelled range input with its current value on the right. */
const Slider = ({ label, display, children }) => (
    <label className="mb-5 block">
        <span className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">{label}</span>
            <span className="font-mono text-[13px] font-medium tabular-nums text-ink">{display}</span>
        </span>
        {children}
    </label>
);

const SupplyChainCalculator = ({ onClose }) => {
    const [forecastLoad, setForecastLoad] = useState(85); // %
    const [energyPrice, setEnergyPrice] = useState(4.2); // $

    // Simple simulation logic
    const currentCost = (100 * 4.5).toFixed(2);
    const optimizedCost = ((forecastLoad / 100) * 100 * energyPrice).toFixed(2);
    const savings = (currentCost - optimizedCost).toFixed(2);

    return (
        <Modal
            title="Furnace charge optimizer"
            subtitle={<span className="font-mono">SC-OPT-CALC</span>}
            icon={<IconBadge icon={Calculator} tone="gray" />}
            onClose={onClose}
            size="lg"
            footer={
                <Button variant="primary">
                    <TrendingUp size={16} />
                    Apply charge configuration
                </Button>
            }
        >
            <div className="grid md:grid-cols-2">
                {/* Inputs */}
                <div className="border-line p-4 md:border-r">
                    <SectionTitle className="mb-4">Simulation parameters</SectionTitle>

                    <Slider label="Forecasted demand load" display={`${forecastLoad}%`}>
                        <input
                            type="range"
                            min="50"
                            max="110"
                            value={forecastLoad}
                            onChange={(e) => setForecastLoad(e.target.value)}
                            className="w-full"
                        />
                    </Slider>

                    <Slider label="Projected energy price ($/MMBtu)" display={`$${energyPrice}`}>
                        <input
                            type="range"
                            min="3.0"
                            max="6.0"
                            step="0.1"
                            value={energyPrice}
                            onChange={(e) => setEnergyPrice(e.target.value)}
                            className="w-full"
                        />
                    </Slider>

                    <div className="mt-6 flex items-start gap-3 rounded-sm border border-line border-l-4 border-l-accent bg-field p-3">
                        <Calculator size={18} className="mt-0.5 shrink-0 text-ink-2" />
                        <div>
                            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">Recommendation algorithm</h4>
                            <p className="text-[13px] leading-snug text-ink-2">
                                Based on {forecastLoad}% load, the system suggests consolidating charge to{' '}
                                <strong className="font-semibold text-ink">Sidewell A/C</strong> and idling{' '}
                                <strong className="font-semibold text-ink">Sidewell B</strong> to maximize thermal
                                efficiency curves.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="flex flex-col p-4">
                    <SectionTitle className="mb-4">Projected outcome</SectionTitle>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-sm border border-line bg-field p-3">
                            <Stat label="Baseline cost / hr" value={`$${currentCost}`} />
                        </div>
                        <div className="rounded-sm border border-line bg-field p-3">
                            <Stat label="Optimized cost / hr" value={`$${optimizedCost}`} />
                        </div>
                    </div>

                    <div className="mt-3 flex flex-col items-center justify-center rounded-sm border border-line bg-field p-6 text-center">
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">Potential savings</div>
                        <div className="font-mono text-[40px] font-medium leading-none tabular-nums">
                            <span className={savings >= 0 ? 'text-green-ink' : 'text-red-ink'}>${savings}</span>
                            <span className="ml-2 font-sans text-[15px] font-medium text-ink-2">/ hour</span>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default SupplyChainCalculator;
