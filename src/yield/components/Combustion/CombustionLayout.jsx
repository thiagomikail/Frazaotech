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
        <div className="grid gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[240px_minmax(0,1fr)_320px] xl:grid-cols-[270px_minmax(0,1fr)_360px] 2xl:grid-cols-[300px_minmax(0,1fr)_400px]">
            {/* --- coluna 1: frota de sistemas regenerativos --- */}
            <Panel className="lg:min-h-0">
                <PanelHeader icon={Flame} title="Regenerative systems" />
                <PanelBody className="space-y-3">
                    <div className="rounded-sm border border-line bg-field px-3 py-2.5">
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">Fleet score</div>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className={`font-mono text-[28px] font-medium leading-none tabular-nums ${TONE[GRADE_TONE[fleetGrade.grade]].text}`}>
                                {fleetScore.toFixed(0)}
                            </span>
                            <Badge tone={GRADE_TONE[fleetGrade.grade]}>Grade {fleetGrade.grade}</Badge>
                        </div>
                        <div className="mt-1 text-[12px] text-ink-2">
                            <span className="font-mono font-medium tabular-nums text-ink">${(fleetRecoverable / 1000).toFixed(0)}k/yr</span> recoverable
                        </div>
                    </div>

                    <div className="divide-y divide-line overflow-hidden rounded-sm border border-line bg-field">

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
                                className={`block w-full border-l-4 px-3 py-2.5 text-left transition-colors ${
                                    isActive ? 'border-l-accent bg-accent/10' : 'border-l-transparent hover:bg-fill'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full border border-black/25 ${STATUS_DOT[s.status] || 'bg-ink-3'}`} />
                                    <span className={`min-w-0 flex-1 truncate text-[14px] font-semibold ${isActive ? 'text-accent' : 'text-ink'}`}>
                                        {s.name}
                                    </span>
                                    <span className={`font-mono text-[16px] font-medium tabular-nums ${tone.text}`}>
                                        {sc.total.toFixed(0)}
                                    </span>
                                </div>

                                <div className="mt-0.5 pl-[18px] text-[12px] text-ink-2">{s.asset}</div>

                                <div className="mt-2 h-2 overflow-hidden rounded-sm border border-line bg-surface">
                                    <div
                                        className={`h-full transition-[width] duration-300 ${tone.bg}`}
                                        style={{ width: `${sc.total}%` }}
                                    />
                                </div>

                                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                                    <span className={`font-bold uppercase tracking-[0.06em] ${tone.text}`}>{sentence(sc.label)}</span>
                                    {s.analysis.recoverableUsdPerYear > 0 && (
                                        <span className="font-mono tabular-nums text-ink-2">
                                            ${(s.analysis.recoverableUsdPerYear / 1000).toFixed(0)}k/yr
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                    </div>
                </PanelBody>
            </Panel>

            {/* --- coluna 2: score e ciclo --- */}
            <div className="grid gap-3 lg:min-h-0 lg:grid-rows-[minmax(0,1.25fr)_minmax(0,1fr)]">
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

/** Tab strip for the right column, with a lamp when a view needs a look. */
const ViewSwitch = ({ options, value, onChange }) => (
    <div className="flex shrink-0 overflow-hidden rounded-sm border border-line bg-raised" role="tablist">
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
                    className={`relative flex h-8 flex-1 items-center justify-center gap-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors not-first:border-l not-first:border-line ${
                        on ? 'bg-thumb text-on-thumb' : 'text-ink-2 hover:bg-fill'
                    }`}
                >
                    {o.label}
                    {o.dot && <span className={`h-2 w-2 rounded-full border border-black/25 ${o.dot}`} aria-hidden="true" />}
                </button>
            );
        })}
    </div>
);

export default CombustionLayout;
