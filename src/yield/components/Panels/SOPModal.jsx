import React from 'react';
import { AlertTriangle, CheckCircle, ClipboardList } from 'lucide-react';
import { Badge, Button, IconBadge, Modal, SectionTitle } from '../ui';
import { useColors } from '../../lib/colors';

const SOPModal = ({ action, onClose }) => {
    const c = useColors();
    if (!action) return null;

    // Define content scenarios based on action description or type
    const getContent = () => {
        // SCENARIO 1: Burner Fix (Furnace 2)
        if (action.description.includes('Fix burner')) {
            return {
                id: 'SOP-2024-M-04',
                steps: [
                    "Perform safety lockout on Gas Train A.",
                    "Verify zero energy state on burner controller.",
                    "Inspect Air/Fuel ratio linkage for slippage.",
                    "Adjust damper position to mark 4.5.",
                    "Restart burner and verifying flame color (Blue/Sharp).",
                    "Record O2 levels in combustion log."
                ],
                diagramType: 'BURNER',
                diagramTitle: 'Diagram: BURNER-ASSEMBLY-A',
                safetyMsg: 'LOTO required: gas and electric'
            };
        }

        // SCENARIO 2: Salt Reduction (Default/Furnace 1)
        return {
            id: 'SOP-2024-P-12',
            steps: [
                "Verify furnace temperature is stabilized at 720°C.",
                "Acknowledge alarm at Supervisor Panel.",
                "Reduce salt flow rate to 15% using valve V-204.",
                "Monitor conductivity sensor for 5 minutes.",
                "Log the adjustment in the shift report."
            ],
            diagramType: 'SALT',
            diagramTitle: 'Diagram: SALT-INJECTION-SYS',
            safetyMsg: 'Safety lockout required'
        };
    };

    const content = getContent();

    const renderDiagram = () => {
        if (content.diagramType === 'BURNER') {
            return (
                <svg viewBox="0 0 400 300" className="relative h-auto w-full max-w-[400px]">
                    {/* Burner Housing */}
                    <path d="M 50 100 L 150 100 L 150 200 L 50 200 Z" fill={c.fill} stroke={c.ink3} strokeWidth="2" />
                    <text x="100" y="153" textAnchor="middle" fill={c.ink2} fontSize="11">Burner A</text>

                    {/* Flame */}
                    <path d="M 150 130 Q 250 150 150 170" fill="url(#flameGrad)" />
                    <defs>
                        <radialGradient id="flameGrad">
                            <stop offset="0%" stopColor={c.accent} />
                            <stop offset="100%" stopColor={c.accent} stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {/* Air Intake Pipe */}
                    <path d="M 100 200 L 100 250" stroke={c.ink3} strokeWidth="10" />

                    {/* Damper (Target) */}
                    <rect x="80" y="210" width="40" height="10" fill={c.accent} stroke={c.surface} strokeWidth="1" />
                    <text x="150" y="220" fill={c.ink} fontSize="12" fontWeight="700">DAMPER LINKAGE</text>
                    <line x1="120" y1="215" x2="145" y2="215" stroke={c.accent} strokeWidth="1" strokeDasharray="2,2" />

                    {/* Fuel Line */}
                    <path d="M 20 150 L 50 150" stroke={c.ink2} strokeWidth="4" />
                </svg>
            );
        }

        // Default SALT diagram
        return (
            <svg viewBox="0 0 400 300" className="relative h-auto w-full max-w-[400px]">
                {/* Furnace */}
                <rect x="50" y="100" width="120" height="150" fill={c.fill} stroke={c.ink3} strokeWidth="2" />
                <text x="110" y="180" textAnchor="middle" fill={c.ink2} fontSize="11">Furnace 1</text>

                {/* Pipe */}
                <path d="M 170 150 L 250 150 L 250 100 L 320 100" fill="none" stroke={c.ink2} strokeWidth="4" />

                {/* Valve (Target) */}
                <circle cx="250" cy="150" r="15" fill={c.surface} stroke={c.ink} strokeWidth="2" />
                <path d="M 250 135 L 250 165 M 235 150 L 265 150" stroke={c.ink} strokeWidth="2" />

                {/* Label for Valve */}
                <rect x="220" y="180" width="60" height="24" rx="2" fill={c.surface} stroke={c.accent} strokeWidth="1.5" />
                <text x="250" y="196" textAnchor="middle" fill={c.ink} fontSize="12" fontWeight="700">V-204</text>

                {/* Flow Arrow */}
                <path d="M 190 140 L 210 150 L 190 160" fill={c.ink2} opacity="0.6" />
            </svg>
        );
    };

    return (
        <Modal
            title="Standard operating procedure"
            subtitle={<span className="font-mono">{content.id}</span>}
            icon={<IconBadge icon={ClipboardList} tone="blue" />}
            onClose={onClose}
            size="lg"
        >
            <div className="grid md:grid-cols-[minmax(300px,5fr)_7fr]">
                {/* Left: steps */}
                <div className="border-line p-4 md:border-r">
                    <SectionTitle>Target action</SectionTitle>
                    <p className="text-[17px] font-semibold leading-snug text-ink">{action.description}</p>
                    <Badge tone="orange" className="mt-3">
                        <AlertTriangle size={12} />
                        {content.safetyMsg}
                    </Badge>

                    <ol className="mt-4 divide-y divide-line overflow-hidden rounded-sm border border-line bg-field">
                        {content.steps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-line bg-raised font-mono text-[12px] font-medium tabular-nums text-ink">
                                    {idx + 1}
                                </span>
                                <p className="pt-0.5 text-[14px] leading-relaxed text-ink">{step}</p>
                            </li>
                        ))}
                    </ol>

                    <Button variant="primary" size="lg" className="mt-4 w-full">
                        <CheckCircle size={18} />
                        Confirm completion
                    </Button>
                </div>

                {/* Right: diagram */}
                <div className="flex flex-col gap-3 p-4">
                    <div className="text-right font-mono text-[11px] uppercase text-ink-3">{content.diagramTitle}</div>

                    <div
                        className="relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-sm border border-line bg-field p-4"
                        style={{
                            backgroundImage:
                                'linear-gradient(var(--color-fill-strong) 1px, transparent 1px), linear-gradient(90deg, var(--color-fill-strong) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        }}
                    >
                        {renderDiagram()}
                    </div>

                    <label className="block rounded-sm border border-line bg-field p-3 focus-within:border-accent">
                        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">Operator notes</span>
                        <textarea
                            className="mt-1 h-20 w-full resize-none bg-transparent text-[14px] text-ink placeholder:text-ink-3 focus:outline-none"
                            placeholder="Add optional observations…"
                        />
                    </label>
                </div>
            </div>
        </Modal>
    );
};

export default SOPModal;
