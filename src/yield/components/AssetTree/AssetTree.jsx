import React from 'react';
import { LayoutDashboard, Zap } from 'lucide-react';
import { PanelBody, PanelHeader, SectionTitle } from '../ui';

const STATUS_DOT = {
    running: 'bg-green',
    warning: 'bg-orange',
    maintenance: 'bg-red',
};

const STATUS_LABEL = {
    running: 'Running',
    warning: 'Warning',
    maintenance: 'Maintenance',
};

/** Share of the plant's energy bill, as a label, a percentage and a thin bar. */
const Meter = ({ label, value, bar, text }) => (
    <div>
        <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="text-ink-2">{label}</span>
            <span className={`font-semibold tabular-nums ${text}`}>{value}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-fill">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${value}%` }} />
        </div>
    </div>
);

const AssetTree = ({ data, selectedId, onSelect }) => {
    return (
        <>
            <PanelHeader
                icon={LayoutDashboard}
                title="Overview"
                subtitle={
                    <>
                        Plant status: <span className="font-medium text-green-ink">Good</span>
                    </>
                }
            />

            <div className="shrink-0 px-5 pb-4 pt-2">
                <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <Zap size={15} className="text-orange" />
                    Consumption
                </div>
                <div className="space-y-2.5">
                    <Meter label="Natural gas" value={78} bar="bg-orange" text="text-orange-ink" />
                    <Meter label="Electricity" value={22} bar="bg-accent" text="text-accent" />
                </div>
            </div>

            <PanelBody className="border-t border-line pt-4">
                <SectionTitle>Plant assets</SectionTitle>
                <ul className="-mx-2 space-y-0.5">
                    {data.map(asset => {
                        const on = selectedId === asset.id;
                        return (
                            <li key={asset.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(asset.id)}
                                    aria-current={on ? 'true' : undefined}
                                    data-testid={`asset-${asset.id}`}
                                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                                        on ? 'bg-accent text-on-accent' : 'text-ink hover:bg-fill'
                                    }`}
                                >
                                    <span
                                        title={STATUS_LABEL[asset.status]}
                                        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[asset.status]} ${on ? 'ring-2 ring-white/70' : ''}`}
                                    />
                                    <span className={`min-w-0 flex-1 truncate text-[14px] ${on ? 'font-semibold' : 'font-medium'}`}>
                                        {asset.name}
                                    </span>
                                    <span className="shrink-0 text-right leading-tight">
                                        <span className="block text-[13px] font-semibold tabular-nums">
                                            {asset.energy.currentLoad}
                                        </span>
                                        <span className={`block text-[10px] ${on ? 'text-on-accent/80' : 'text-ink-3'}`}>
                                            MMBtu/hr
                                        </span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </PanelBody>
        </>
    );
};

export default AssetTree;
