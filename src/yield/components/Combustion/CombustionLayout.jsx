import React, { useState, useMemo } from 'react';
import { Flame } from 'lucide-react';
import { REGEN_SYSTEMS } from '../../data/regenerativeData';
import { analyseSystem, gradeFor } from '../../lib/combustion';
import { evaluateFmea } from '../../lib/fmea';
import RegenScoreCard from './RegenScoreCard';
import RegenCycleDiagram from './RegenCycleDiagram';
import CombustionSimulator from './CombustionSimulator';
import ActionPlan from './ActionPlan';
import FmeaPanel from './FmeaPanel';
import FmeaMatrixModal from './FmeaMatrixModal';
import { Badge, Panel, PanelBody, PanelHeader } from '../ui';
import { GRADE_TONE, TONE } from './RegenScoreCard';

const STATUS_DOT = { running: 'bg-green', warning: 'bg-orange', maintenance: 'bg-red' };

const sentence = (s) => s.charAt(0) + s.slice(1).toLowerCase();

/**
 * Aba de combustao regenerativa.
 *
 * Tres colunas, na ordem em que a pergunta aparece:
 *   1. qual sistema        - lista com score de cada par de queimadores
 *   2. como ele esta'      - score detalhado e o ciclo de reversao rodando
 *   3. o que fazer         - plano de acao, FMEA e simulador
 *
 * A coluna 3 alterna entre Plan, FMEA e Simulate - a mesma leitura vista de
 * tres angulos. O plano diz o que corrigir agora e quanto vale; o FMEA diz o
 * que pode falhar e com que risco; o simulador deixa mover o parametro e ver
 * os dois se refazerem.
 */
const CombustionLayout = () => {
    const [selectedId, setSelectedId] = useState(REGEN_SYSTEMS[0].id);
    const [rightView, setRightView] = useState('plan'); // 'plan' | 'fmea' | 'simulate'
    const [showMatrix, setShowMatrix] = useState(false);
    const [overrides, setOverrides] = useState({});

    const system = REGEN_SYSTEMS.find(s => s.id === selectedId);

    // A leitura efetiva e' a de campo com o que o simulador mexeu por cima.
    const activeReading = useMemo(
        () => ({ ...system.reading, ...(overrides[selectedId] || {}) }),
        [system, overrides, selectedId]
    );

    const dirty = Object.keys(overrides[selectedId] || {}).length > 0;
    const analysis = useMemo(() => analyseSystem(activeReading), [activeReading]);

    // O FMEA le' a mesma leitura ativa: mexer no simulador reordena a matriz,
    // porque a Ocorrencia de cada modo sai das leituras e nao de um historico.
    const fmea = useMemo(() => evaluateFmea(activeReading, analysis), [activeReading, analysis]);

    // Todos os sistemas pontuados na leitura de campo, para a lista da esquerda.
    const fleet = useMemo(
        () => REGEN_SYSTEMS.map(s => ({
            ...s,
            analysis: analyseSystem(s.id === selectedId ? activeReading : s.reading)
        })),
        [selectedId, activeReading]
    );

    const fleetScore = fleet.reduce((sum, s) => sum + s.analysis.score.total, 0) / fleet.length;
    const fleetRecoverable = fleet.reduce((sum, s) => sum + s.analysis.recoverableUsdPerYear, 0);
    const fleetGrade = gradeFor(fleetScore);

    const handleParamChange = (key, value) => {
        setOverrides(prev => ({
            ...prev,
            [selectedId]: { ...(prev[selectedId] || {}), [key]: value }
        }));
    };

    const handleReset = () => {
        setOverrides(prev => {
            const next = { ...prev };
            delete next[selectedId];
            return next;
        });
    };

    // A leitura simulada muda o sistema, entao o desenho do ciclo tem que ver
    // a mesma coisa que o score - passa o sistema com a leitura ativa.
    const liveSystem = { ...system, reading: activeReading };

    return (
        <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[240px_minmax(0,1fr)_320px] xl:grid-cols-[270px_minmax(0,1fr)_360px] 2xl:grid-cols-[300px_minmax(0,1fr)_400px]">
            {/* --- coluna 1: frota de sistemas regenerativos --- */}
            <Panel className="lg:min-h-0">
                <PanelHeader icon={Flame} title="Regenerative systems" />
                <PanelBody className="space-y-2 px-3!">
                    <div className="mb-3 rounded-xl bg-fill px-3 py-2.5">
                        <div className="text-[12px] text-ink-2">Fleet score</div>
                        <div className="mt-0.5 flex items-baseline gap-2">
                            <span className={`text-[28px] font-semibold leading-none tracking-tight tabular-nums ${TONE[GRADE_TONE[fleetGrade.grade]].text}`}>
                                {fleetScore.toFixed(0)}
                            </span>
                            <Badge tone={GRADE_TONE[fleetGrade.grade]}>Grade {fleetGrade.grade}</Badge>
                        </div>
                        <div className="mt-1 text-[12px] text-ink-2">
                            <span className="font-semibold tabular-nums text-green-ink">${(fleetRecoverable / 1000).toFixed(0)}k/yr</span> recoverable
                        </div>
                    </div>

                    {fleet.map(s => {
                        const isActive = s.id === selectedId;
                        const sc = s.analysis.score;
                        const tone = TONE[GRADE_TONE[sc.grade]];

                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedId(s.id)}
                                aria-pressed={isActive}
                                data-testid="combustion-system"
                                className={`block w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                                    isActive ? 'bg-accent/10 ring-1 ring-accent/40' : 'hover:bg-fill'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[s.status] || 'bg-ink-3'}`} />
                                    <span className={`min-w-0 flex-1 truncate text-[14px] font-medium ${isActive ? 'text-accent' : 'text-ink'}`}>
                                        {s.name}
                                    </span>
                                    <span className={`text-[17px] font-semibold tabular-nums ${tone.text}`}>
                                        {sc.total.toFixed(0)}
                                    </span>
                                </div>

                                <div className="mt-0.5 pl-4 text-[12px] text-ink-2">{s.asset}</div>

                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill">
                                    <div
                                        className={`h-full rounded-full transition-[width] duration-300 ${tone.bg}`}
                                        style={{ width: `${sc.total}%` }}
                                    />
                                </div>

                                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                                    <span className={`font-semibold ${tone.text}`}>{sentence(sc.label)}</span>
                                    {s.analysis.recoverableUsdPerYear > 0 && (
                                        <span className="tabular-nums text-ink-2">
                                            ${(s.analysis.recoverableUsdPerYear / 1000).toFixed(0)}k/yr
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </PanelBody>
            </Panel>

            {/* --- coluna 2: score e ciclo --- */}
            <div className="grid gap-4 lg:min-h-0 lg:grid-rows-[minmax(0,1.25fr)_minmax(0,1fr)]">
                <Panel className="lg:min-h-0">
                    <RegenScoreCard system={liveSystem} analysis={analysis} />
                </Panel>
                <Panel className="lg:min-h-0">
                    <RegenCycleDiagram system={liveSystem} analysis={analysis} />
                </Panel>
            </div>

            {/* --- coluna 3: plano, FMEA ou simulador --- */}
            <div className="flex flex-col gap-3 lg:min-h-0">
                <ViewSwitch
                    value={rightView}
                    onChange={setRightView}
                    options={[
                        { value: 'plan', label: 'Plan', testId: 'combustion-view-plan' },
                        { value: 'fmea', label: 'FMEA', testId: 'combustion-view-fmea', dot: fmea.counts.critical > 0 ? 'bg-red' : null },
                        { value: 'simulate', label: 'Simulate', testId: 'simulate-toggle', dot: dirty ? 'bg-orange' : null },
                    ]}
                />

                <Panel className="min-h-[480px] flex-1 lg:min-h-0">
                    {rightView === 'plan' && <ActionPlan analysis={analysis} />}
                    {rightView === 'fmea' && (
                        <FmeaPanel fmea={fmea} onOpenMatrix={() => setShowMatrix(true)} />
                    )}
                    {rightView === 'simulate' && (
                        <CombustionSimulator
                            reading={activeReading}
                            baseline={system.reading}
                            onChange={handleParamChange}
                            onReset={handleReset}
                            dirty={dirty}
                        />
                    )}
                </Panel>
            </div>

            {showMatrix && (
                <FmeaMatrixModal
                    system={liveSystem}
                    fmea={fmea}
                    onClose={() => setShowMatrix(false)}
                />
            )}
        </div>
    );
};

/** Segmented control for the right column, with a dot when a view needs a look. */
const ViewSwitch = ({ options, value, onChange }) => (
    <div className="flex shrink-0 gap-0.5 rounded-[10px] bg-fill p-0.5" role="tablist">
        {options.map(o => {
            const on = o.value === value;
            return (
                <button
                    key={o.value}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => onChange(o.value)}
                    data-testid={o.testId}
                    className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-[13px] font-medium transition-colors ${
                        on ? 'bg-thumb text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-ink-2 hover:text-ink'
                    }`}
                >
                    {o.label}
                    {o.dot && <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} aria-hidden="true" />}
                </button>
            );
        })}
    </div>
);

export default CombustionLayout;
