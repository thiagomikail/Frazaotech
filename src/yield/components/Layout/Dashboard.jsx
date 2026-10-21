import React, { useState } from 'react';
import AssetTree from '../AssetTree/AssetTree';
import LossPanel from '../Panels/LossPanel';
import ActionPanel from '../Panels/ActionPanel';
import OptimizationLayout from '../Optimization/OptimizationLayout';
import ReportsLayout from '../Reports/ReportsLayout';
import CombustionLayout from '../Combustion/CombustionLayout';
import BottomBar from '../BottomBar/BottomBar';
import { Panel, Segmented } from '../ui';

const TABS = [
    { value: 'monitor', label: 'Monitor' },
    { value: 'combustion', label: 'Combustion' },
    { value: 'optimization', label: 'Optimization' },
    { value: 'reports', label: 'Reports' },
];

const Dashboard = ({ data, onOpenSankey, onOpenBacklog, onTraceValues, isTracing }) => {
    const [selectedAssetId, setSelectedAssetId] = useState(data[0]?.id);
    const [activeTab, setActiveTab] = useState('monitor');

    const selectedAsset = data.find(a => a.id === selectedAssetId);

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <header className="relative z-20 flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-black/40 bg-bar px-3 py-1.5 text-on-bar md:flex-nowrap md:py-0">
                <a href="/" title="OT Workbench home" className="flex shrink-0 items-center gap-2">
                    <img src="/workbench-icon.svg" alt="" className="h-6 w-6" />
                    <span className="hidden text-[12px] font-semibold uppercase tracking-[0.08em] text-on-bar-2 lg:inline">
                        OT Workbench
                    </span>
                </a>
                <div className="h-5 w-px shrink-0 bg-bar-line" />
                <div className="flex shrink-0 items-center gap-2">
                    <img src="/yield-icon.svg" alt="" className="h-6 w-6" />
                    <h1 className="text-[14px] font-bold uppercase tracking-[0.08em] text-on-bar">Yield</h1>
                </div>

                <Segmented
                    tone="bar"
                    options={TABS}
                    value={activeTab}
                    onChange={setActiveTab}
                    testId="yield-tab"
                    className="order-last w-full md:order-none md:mx-auto md:w-[480px]"
                />

                <div className="ml-auto flex shrink-0 items-baseline gap-1.5 md:ml-0">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-on-bar-2">Total load</span>
                    <span className="font-mono text-[14px] font-medium tabular-nums text-on-bar">82.5</span>
                    <span className="text-[11px] text-on-bar-2">MMBtu</span>
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto p-3 lg:overflow-hidden">
                {activeTab === 'monitor' ? (
                    <div className="grid gap-3 lg:h-full lg:grid-cols-[280px_1fr_1fr]">
                        <Panel className="min-h-[420px] lg:min-h-0">
                            <AssetTree data={data} selectedId={selectedAssetId} onSelect={setSelectedAssetId} />
                        </Panel>
                        <Panel className="min-h-[420px] lg:min-h-0">
                            <LossPanel asset={selectedAsset} />
                        </Panel>
                        <Panel className="min-h-[420px] lg:min-h-0">
                            <ActionPanel asset={selectedAsset} />
                        </Panel>
                    </div>
                ) : (
                    <div className="lg:h-full lg:min-h-0">
                        {activeTab === 'combustion' ? (
                            <CombustionLayout />
                        ) : activeTab === 'optimization' ? (
                            <OptimizationLayout />
                        ) : (
                            <ReportsLayout />
                        )}
                    </div>
                )}
            </main>

            <BottomBar
                onOpenSankey={onOpenSankey}
                onOpenBacklog={onOpenBacklog}
                onTraceValues={onTraceValues}
                isTracing={isTracing}
            />
        </div>
    );
};

export default Dashboard;
