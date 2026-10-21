import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ClipboardList, Clock, Network } from 'lucide-react';
import SOPModal from './SOPModal';
import SupplyChainCalculator from './SupplyChainCalculator';
import { Badge, Button, PanelBody, PanelHeader } from '../ui';

const ActionPanel = ({ asset }) => {
    const [activeSOP, setActiveSOP] = useState(null);
    const [activeCalculator, setActiveCalculator] = useState(null);

    if (!asset) {
        return (
            <div className="flex h-full items-center justify-center p-4 text-center text-[13px] text-ink-3">
                Select an asset to view actions
            </div>
        );
    }

    const handleInitialize = (rec) => {
        if (rec.type === 'Supply Chain Opt.') {
            setActiveCalculator(rec);
        } else {
            setActiveSOP(rec);
        }
    };

    const open = asset.recommendations.length;

    return (
        <>
            <PanelHeader
                icon={ClipboardList}
                title="Recommended actions"
                subtitle={asset.name}
                action={<Badge tone={open ? 'orange' : 'gray'}>{open} open</Badge>}
            />

            <PanelBody className="space-y-3">
                {open === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center py-10 text-ink-3">
                        <CheckCircle size={32} className="mb-2 text-green" />
                        <p className="text-[12px] font-bold uppercase tracking-[0.08em]">System optimal</p>
                    </div>
                ) : (
                    asset.recommendations.map((rec) => {
                        const supply = rec.type === 'Supply Chain Opt.';
                        const urgent = rec.priority === 'Urgent';
                        const Icon = supply ? Network : urgent ? AlertTriangle : Clock;
                        return (
                            <article
                                key={rec.id}
                                className={`rounded-sm border border-line border-l-4 bg-field p-3 ${urgent ? 'border-l-orange' : 'border-l-ink-3'}`}
                                data-testid="action-card"
                            >
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <Badge tone={urgent ? 'orange' : 'gray'}>
                                        <Icon size={12} />
                                        {supply ? 'Supply chain' : rec.priority}
                                    </Badge>
                                    <span className="font-mono text-[11px] font-medium tabular-nums text-ink-2">
                                        SAVE {rec.potentialSaving}
                                    </span>
                                </div>

                                <p className="mb-3 text-[14px] font-medium leading-snug text-ink">{rec.description}</p>

                                {/* Visual sub-steps for supply-chain items */}
                                {rec.actions && (
                                    <div className="mb-3 grid grid-cols-2 gap-2">
                                        {rec.actions.map((act, i) => (
                                            <div key={i} className="rounded-sm border border-line bg-surface px-2.5 py-2">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">{act.asset}</div>
                                                <div className="font-mono text-[13px] font-medium text-ink">{act.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <Button
                                    variant="tinted"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleInitialize(rec)}
                                    data-testid="start-action"
                                >
                                    Start action
                                </Button>
                            </article>
                        );
                    })
                )}
            </PanelBody>

            {activeSOP && <SOPModal action={activeSOP} onClose={() => setActiveSOP(null)} />}

            {activeCalculator && (
                <SupplyChainCalculator action={activeCalculator} onClose={() => setActiveCalculator(null)} />
            )}
        </>
    );
};

export default ActionPanel;
