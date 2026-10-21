import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Badge, PanelBody, PanelHeader } from '../ui';

/**
 * O ciclo de reversao desenhado.
 *
 * Um regenerativo so' faz sentido quando se ve' que sao dois caminhos
 * alternando: o lado que queima esta' puxando ar pelo leito que ficou quente no
 * ciclo anterior, enquanto o outro lado carrega o seu leito com os gases de
 * saida. A cada reversao os papeis trocam.
 *
 * A animacao anda no tempo de ciclo real do sistema selecionado - se o operador
 * poe 68 s, o desenho fica 68 s de cada lado. O desbalanco A/B aparece como
 * diferenca de temperatura entre os dois leitos, que e' exatamente como o
 * sintoma chega no supervisorio.
 */
const RegenCycleDiagram = ({ system, analysis }) => {
    const { cycleTimeS, cycleImbalancePct, airPreheatC, furnaceTempC, stackTempC } = system.reading;
    const [firing, setFiring] = useState('A');

    // Acelera a animacao para caber na tela: 1 s de ciclo real = 60 ms aqui,
    // com piso para o ciclo nao ficar epiletico em sistemas rapidos.
    useEffect(() => {
        const ms = Math.max(cycleTimeS * 60, 900);
        const t = setInterval(() => setFiring(s => (s === 'A' ? 'B' : 'A')), ms);
        return () => clearInterval(t);
    }, [cycleTimeS]);

    // O lado fraco entrega menos preaquecimento - e' assim que o desbalanco
    // de valvula se manifesta na temperatura do ar.
    const imbalance = cycleImbalancePct / 100;
    const preheatA = airPreheatC * (1 + imbalance / 2);
    const preheatB = airPreheatC * (1 - imbalance / 2);
    const weakSide = preheatA >= preheatB ? 'B' : 'A';
    const isDegraded = Math.abs(cycleImbalancePct) > 10;

    const Side = ({ id, preheat }) => {
        const isFiring = firing === id;
        const isWeak = isDegraded && weakSide === id;

        return (
            <div
                className={`flex min-w-0 flex-col gap-1.5 rounded-sm border bg-field p-2.5 transition-colors duration-500 ${
                    isFiring ? 'border-green' : 'border-line'
                }`}
            >
                <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                        <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full border border-black/25 transition-colors duration-500 ${
                                isFiring ? 'bg-green' : 'bg-fill-strong'
                            }`}
                            aria-hidden="true"
                        />
                        Side {id}
                    </span>
                    <Badge tone={isFiring ? 'green' : 'gray'}>{isFiring ? 'Firing' : 'Exhausting'}</Badge>
                </div>

                {/* leito ceramico: os blocos aquecem quando exaurem e
                    descarregam quando o ar passa para queimar */}
                <div className="flex flex-col gap-0.5 rounded-sm border border-line bg-surface p-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-1.5 bg-ink-2 transition-opacity duration-700"
                            style={{
                                opacity: isFiring ? 0.75 - i * 0.11 : 0.18 + i * 0.11,
                                transitionDelay: `${i * 40}ms`
                            }}
                        />
                    ))}
                </div>
                <div className="text-center text-[10px] font-bold uppercase tracking-[0.06em] text-ink-3">Ceramic media bed</div>

                <div className="space-y-1 text-[12px]">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">
                            {isFiring ? 'Air preheat out' : 'Flue gas in'}
                        </span>
                        <span className={`font-mono font-medium tabular-nums ${isWeak ? 'text-orange-ink' : 'text-ink'}`}>
                            {isFiring ? `${preheat.toFixed(0)} °C` : `${furnaceTempC.toFixed(0)} °C`}
                        </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">
                            {isFiring ? 'Fuel firing' : 'Stack out'}
                        </span>
                        <span className="font-mono font-medium tabular-nums text-ink">
                            {isFiring
                                ? `${system.reading.fuelFlowMMBtu.toFixed(1)} MMBtu/hr`
                                : `${stackTempC.toFixed(0)} °C`}
                        </span>
                    </div>
                </div>

                {isWeak && (
                    <div className="rounded-sm border border-orange bg-orange/20 px-2 py-1 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-orange-ink">
                        Valve suspect · <span className="font-mono">{Math.abs(cycleImbalancePct).toFixed(1)}%</span> low
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <PanelHeader
                icon={RefreshCw}
                title="Regenerative cycle"
                action={
                    <Badge tone={isDegraded ? 'orange' : 'gray'}>
                        <span className="font-mono normal-case">{cycleTimeS.toFixed(0)} s</span> reversal
                    </Badge>
                }
            />

            <PanelBody className="@container">
                <div className="grid grid-cols-1 items-stretch gap-3 @md:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)]">
                    <Side id="A" preheat={preheatA} />

                    <div className="flex items-center justify-center gap-4 @md:flex-col @md:gap-3">
                        <div className="rounded-sm border border-line bg-field px-5 py-3 text-center @md:w-full @md:px-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">Furnace</div>
                            <div className="font-mono text-[22px] font-medium leading-tight tabular-nums text-ink">
                                {furnaceTempC.toFixed(0)}
                            </div>
                            <div className="text-[11px] text-ink-2">°C</div>
                        </div>
                        <div className="text-[24px] leading-none text-ink-2" aria-hidden="true">
                            <span className="@md:hidden">{firing === 'A' ? '↓' : '↑'}</span>
                            <span className="hidden @md:inline">{firing === 'A' ? '→' : '←'}</span>
                        </div>
                    </div>

                    <Side id="B" preheat={preheatB} />
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-3">
                    <div className="rounded-sm border border-line bg-field px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">Recovered</div>
                        <div className="mt-0.5 text-[13px] font-medium text-green-ink">
                            <span className="font-mono tabular-nums">{(analysis.savingVsColdAir * 100).toFixed(0)}%</span> fuel vs cold air
                        </div>
                    </div>
                    <div className="rounded-sm border border-line bg-field px-3 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-2">Still on the table</div>
                        <div
                            className={`mt-0.5 text-[13px] font-medium ${
                                analysis.gapToIdeal > 0.02 ? 'text-orange-ink' : 'text-green-ink'
                            }`}
                        >
                            <span className="font-mono tabular-nums">{(analysis.gapToIdeal * 100).toFixed(1)}%</span> to target
                        </div>
                    </div>
                </div>
            </PanelBody>
        </>
    );
};

export default RegenCycleDiagram;
