import React, { useState } from 'react';
import { Settings, Gauge, Play } from 'lucide-react';
import { Button, IconBadge, Panel, PanelBody, PanelHeader } from '../ui';

/** One labeled slider: name and value above, range ends below. */
const Control = ({ label, value, unit, min, max, onChange, testId }) => (
    <div>
        <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">
            {label}
            <span className="font-mono text-[15px] font-medium normal-case tracking-normal tabular-nums text-ink">
                {value}
                {unit}
            </span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={onChange}
            className="w-full cursor-pointer"
            data-testid={testId}
        />
        <div className="flex justify-between font-mono text-[11px] tabular-nums text-ink-3">
            <span>{min}{unit}</span>
            <span>{max}{unit}</span>
        </div>
    </div>
);

const DigitalTwinSim = () => {
    // Simulation State
    const [tempCheck, setTempCheck] = useState(720);
    const [speedLine, setSpeedLine] = useState(100);

    // Derived values mock logic
    const baseSavings = 1200;
    const projectedSavings = baseSavings + ((720 - tempCheck) * 50) + ((speedLine - 100) * 20);
    const change = projectedSavings / baseSavings * 100 - 100;

    return (
        <Panel className="h-full">
            <PanelHeader icon={Settings} title="Digital twin simulator" />

            <PanelBody className="flex flex-col gap-4 sm:flex-row">
                {/* Controls (Left) */}
                <div className="flex flex-1 flex-col gap-4">
                    <Control
                        label="Global holding temp"
                        value={tempCheck}
                        unit="°C"
                        min={680}
                        max={760}
                        onChange={(e) => setTempCheck(Number(e.target.value))}
                        testId="twin-temp"
                    />
                    <Control
                        label="Line speed multiplier"
                        value={speedLine}
                        unit="%"
                        min={80}
                        max={120}
                        onChange={(e) => setSpeedLine(Number(e.target.value))}
                        testId="twin-speed"
                    />

                    <Button variant="run" className="mt-auto w-full" data-testid="twin-run">
                        <Play size={12} fill="currentColor" />
                        Run simulation model
                    </Button>
                </div>

                {/* Visualization (Right) */}
                <div
                    className="relative flex min-h-[170px] flex-1 items-center justify-center overflow-hidden rounded-sm border border-line bg-field"
                    style={{ backgroundImage: 'radial-gradient(var(--color-line) 1px, transparent 1px)', backgroundSize: '12px 12px' }}
                >
                    <div className="flex flex-col items-center border border-line bg-field px-5 py-3 text-center">
                        <IconBadge icon={Gauge} tone="gray" size={32} />
                        <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">Projected monthly savings</div>
                        <div className="font-mono text-[32px] font-medium leading-tight tabular-nums text-ink">
                            <span className="mr-0.5 font-sans text-[20px] font-medium text-ink-2">$</span>
                            {projectedSavings.toLocaleString()}
                        </div>
                        <div className={`mt-0.5 text-[12px] font-medium ${change >= 0 ? 'text-green-ink' : 'text-red-ink'}`}>
                            <span className="font-mono tabular-nums">{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span> vs baseline
                        </div>
                    </div>
                </div>
            </PanelBody>
        </Panel>
    );
};

export default DigitalTwinSim;
