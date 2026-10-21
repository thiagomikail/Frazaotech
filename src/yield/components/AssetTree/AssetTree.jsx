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

/** Share of the plant's energy bill: a label, a reading and an analog bar. */
const Meter = ({ label, value }) => (
    <div>
        <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="font-medium text-ink-2">{label}</span>
            <span className="font-mono font-medium tabular-nums text-ink">{value}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-sm border border-line bg-field">
            <div className="h-full bg-ink-3" style={{ width: `${value}%` }} />
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

            <div className="shrink-0 p-3">
                <SectionTitle className="flex items-center gap-1.5">
                    <Zap size={13} className="text-ink-2" />
                    Consumption
                </SectionTitle>
                <div className="space-y-2.5">
                    <Meter label="Natural gas" value={78} />
                    <Meter label="Electricity" value={22} />
                </div>
            </div>

            <PanelBody className="border-t border-line">
                <SectionTitle>Plant assets</SectionTitle>
                <ul className="divide-y divide-line overflow-hidden rounded-sm border border-line bg-field">
                    {data.map(asset => {
                        const on = selectedId === asset.id;
                        return (
                            <li key={asset.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(asset.id)}
                                    aria-current={on ? 'true' : undefined}
                                    data-testid={`asset-${asset.id}`}
                                    className={`flex w-full items-center gap-3 px-2.5 py-2 text-left transition-colors ${
                                        on ? 'bg-thumb text-on-thumb' : 'text-ink hover:bg-fill'
                                    }`}
                                >
                                    <span
                                        title={STATUS_LABEL[asset.status]}
                                        className={`h-2.5 w-2.5 shrink-0 rounded-full border border-black/25 ${STATUS_DOT[asset.status]} ${on ? 'ring-2 ring-white/70' : ''}`}
                                    />
                                    <span className={`min-w-0 flex-1 truncate text-[14px] ${on ? 'font-bold' : 'font-semibold'}`}>
                                        {asset.name}
                                    </span>
                                    <span className="shrink-0 text-right leading-tight">
                                        <span className="block font-mono text-[13px] font-medium tabular-nums">
                                            {asset.energy.currentLoad}
                                        </span>
                                        <span className={`block text-[10px] font-medium ${on ? 'text-on-thumb/80' : 'text-ink-3'}`}>
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
