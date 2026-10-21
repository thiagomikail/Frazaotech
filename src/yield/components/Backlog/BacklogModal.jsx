import React from 'react';
import { CheckSquare, User, Clock } from 'lucide-react';
import { Badge, IconBadge, Modal } from '../ui';

const MOCK_BACKLOG = [
    { id: 1, action: 'Replace Burner Nozzle #4', asset: 'Sidewell Furnace A', responsible: 'John Doe', status: 'Pending', due: '2023-11-15' },
    { id: 2, action: 'Calibrate O2 Sensors', asset: 'Kiln Rotary', responsible: 'Jane Smith', status: 'In Progress', due: '2023-11-12' },
    { id: 3, action: 'Insulation Repair', asset: 'Sidewell Furnace C', responsible: 'Maintenance Team', status: 'Scheduled', due: '2023-11-20' },
    { id: 4, action: 'Update Control Firmware', asset: 'All Assets', responsible: 'IT Dept', status: 'Pending', due: '2023-11-30' },
];

const statusTone = (status) =>
    status === 'In Progress' ? 'green' : status === 'Pending' ? 'orange' : 'gray';

const BacklogModal = ({ onClose }) => {
    return (
        <Modal
            title="Action backlog"
            subtitle={`${MOCK_BACKLOG.length} actions across the plant`}
            icon={<IconBadge icon={CheckSquare} tone="gray" />}
            onClose={onClose}
            size="lg"
        >
            <div className="overflow-x-auto p-3">
                <table className="w-full min-w-[640px] border border-line bg-field text-left text-[13px]">
                    <thead>
                        <tr className="border-b border-line bg-strip text-[11px] uppercase tracking-[0.06em] text-ink-2">
                            <th className="px-3 py-2 font-bold">Action</th>
                            <th className="px-3 py-2 font-bold">Asset</th>
                            <th className="px-3 py-2 font-bold">Responsible</th>
                            <th className="px-3 py-2 font-bold">Status</th>
                            <th className="px-3 py-2 font-bold">Due date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {MOCK_BACKLOG.map(item => (
                            <tr key={item.id} className="transition-colors hover:bg-fill">
                                <td className="px-3 py-2.5 font-semibold text-ink">{item.action}</td>
                                <td className="px-3 py-2.5 text-ink-2">{item.asset}</td>
                                <td className="px-3 py-2.5 text-ink-2">
                                    <span className="inline-flex items-center gap-1.5">
                                        <User size={14} className="text-ink-3" />
                                        {item.responsible}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5">
                                    <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                                </td>
                                <td className="px-3 py-2.5 text-ink-2">
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[12px] tabular-nums">
                                        <Clock size={14} className="text-ink-3" />
                                        {item.due}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
};

export default BacklogModal;
