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
            <header className="relative z-20 flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface/80 px-4 py-2 backdrop-blur-xl backdrop-saturate-150 md:flex-nowrap md:py-0">
                <a href="/" title="OT Workbench home" className="flex shrink-0 items-center gap-2">
                    <img src="/workbench-icon.svg" alt="" className="h-7 w-7" />
                    <span className="hidden text-[15px] font-semibold tracking-tight text-ink lg:inline">OT Workbench</span>
                </a>
                <div className="h-5 w-px shrink-0 bg-line" />
                <div className="flex shrink-0 items-center gap-2">
                    <img src="/yield-icon.svg" alt="" className="h-6 w-6" />
                    <h1 className="text-[15px] font-medium text-ink-2">Yield</h1>
                </div>

                <Segmented
                    options={TABS}
                    value={activeTab}
                    onChange={setActiveTab}
                    testId="yield-tab"
                    className="order-last w-full md:order-none md:mx-auto md:w-[460px]"
                />

                <div className="ml-auto shrink-0 text-right md:ml-0">
                    <div className="text-[11px] text-ink-2">Total load</div>
                    <div className="text-[15px] font-semibold leading-tight tabular-nums text-ink">
                        82.5 <span className="text-[12px] font-normal text-ink-2">MMBtu</span>
                    </div>
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:overflow-hidden">
                {activeTab === 'monitor' ? (
                    <div className="grid gap-4 lg:h-full lg:grid-cols-[280px_1fr_1fr]">
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
