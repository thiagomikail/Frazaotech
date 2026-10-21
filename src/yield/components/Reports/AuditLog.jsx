import React from 'react';
import { List, User, Settings, AlertTriangle } from 'lucide-react';
import { IconBadge, Panel, PanelBody, PanelHeader } from '../ui';

const TYPE = {
    user: { icon: User, tone: 'blue', label: 'User' },
    system: { icon: Settings, tone: 'indigo', label: 'System' },
    alert: { icon: AlertTriangle, tone: 'orange', label: 'Alert' },
};

const AuditLog = () => {
    const logs = [
        { id: 1, time: '13:45', type: 'user', msg: 'Operator adjusted Furnace 2 Damper to 45%', user: 'M. Thompson' },
        { id: 2, time: '13:12', type: 'system', msg: 'SOP "Salt Reduction" Completed', user: 'System' },
        { id: 3, time: '12:30', type: 'alert', msg: 'Peak Pricing Window Alert Triggered', user: 'Auto' },
        { id: 4, time: '11:15', type: 'user', msg: 'Shift Supervisor acknowledged Alarm #404', user: 'S. Sarah' },
        { id: 5, time: '09:30', type: 'system', msg: 'Auto-tune loop engaged Zone 3', user: 'System' },
        { id: 6, time: '08:00', type: 'user', msg: 'Start of Shift Report initialized', user: 'M. Thompson' },
    ];

    return (
        <Panel className="h-full">
            <PanelHeader icon={List} title="Audit & event log" />

            <PanelBody className="pb-2">
                <ul className="divide-y divide-line">
                    {logs.map((log) => {
                        const kind = TYPE[log.type];
                        return (
                            <li key={log.id} className="flex items-center gap-3 py-2.5">
                                <span title={kind.label}>
                                    <IconBadge icon={kind.icon} tone={kind.tone} size={30} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[13px] text-ink">{log.msg}</div>
                                    <div className="truncate text-[12px] text-ink-2">{log.user}</div>
                                </div>
                                <div className="shrink-0 text-[12px] tabular-nums text-ink-3">{log.time}</div>
                            </li>
                        );
                    })}
                </ul>
            </PanelBody>
        </Panel>
    );
};

export default AuditLog;
