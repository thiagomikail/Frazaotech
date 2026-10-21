/**
 * Sistemas de combustao regenerativa da planta.
 *
 * Cada entrada e' um PAR de queimadores (lado A / lado B) com seu leito
 * ceramico. As leituras sao o que um supervisorio entrega de fato: O2 na
 * exaustao, temperatura do ar preaquecido, temperatura do forno, temperatura
 * de chamine depois do regenerador, tempo de reversao, desbalanco A/B, perda
 * de carga no leito e emissoes.
 *
 * Os quatro sistemas estao deliberadamente em estados diferentes - saudavel,
 * ar em excesso, leito degradado e NOx alto - para que o score e o plano de
 * acao tenham o que dizer em cada um.
 */

export const FUEL_COST_PER_MMBTU = 4.2;
export const RUN_HOURS_PER_YEAR = 8000;

const base = {
    fuelCostPerMMBtu: FUEL_COST_PER_MMBTU,
    runHoursPerYear: RUN_HOURS_PER_YEAR
};

export const REGEN_SYSTEMS = [
    {
        id: 'rb1',
        assetId: 'f1',
        name: 'RB-01 Sidewell A',
        asset: 'Furnace 1',
        burnerPair: 'A/B',
        commissioned: '2019',
        mediaType: 'Honeycomb cordierite',
        status: 'running',
        reading: {
            ...base,
            o2Pct: 2.4,
            airPreheatC: 935,
            furnaceTempC: 1150,
            stackTempC: 185,
            cycleTimeS: 35,
            cycleImbalancePct: 2.1,
            bedDeltaPPct: 104,
            coPpm: 45,
            noxPpm: 128,
            fuelFlowMMBtu: 12.8
        }
    },
    {
        id: 'rb2',
        assetId: 'f2',
        name: 'RB-02 Sidewell B',
        asset: 'Furnace 2',
        burnerPair: 'A/B',
        commissioned: '2018',
        mediaType: 'Honeycomb cordierite',
        status: 'warning',
        reading: {
            ...base,
            // ar sobrando: ratio control fora de ponto desde a ultima parada
            o2Pct: 6.3,
            airPreheatC: 855,
            furnaceTempC: 1140,
            stackTempC: 245,
            cycleTimeS: 42,
            cycleImbalancePct: 4.8,
            bedDeltaPPct: 128,
            coPpm: 30,
            noxPpm: 142,
            fuelFlowMMBtu: 12.3
        }
    },
    {
        id: 'rb3',
        assetId: 'f3',
        name: 'RB-03 Sidewell C',
        asset: 'Furnace 3',
        burnerPair: 'A/B',
        commissioned: '2016',
        mediaType: 'Ball bed alumina',
        status: 'maintenance',
        reading: {
            ...base,
            // leito cego de oxido e valvula de reversao passando
            o2Pct: 5.1,
            airPreheatC: 690,
            furnaceTempC: 1135,
            stackTempC: 372,
            cycleTimeS: 68,
            cycleImbalancePct: 14.6,
            bedDeltaPPct: 171,
            coPpm: 165,
            noxPpm: 118,
            fuelFlowMMBtu: 11.9
        }
    },
    {
        id: 'rb4',
        assetId: 'k1',
        name: 'RB-04 Rotary Kiln',
        asset: 'Rotary Kiln 1',
        burnerPair: 'A/B',
        commissioned: '2021',
        mediaType: 'Honeycomb cordierite',
        status: 'running',
        reading: {
            ...base,
            // recuperacao otima, mas a chama quente cobra o preco em NOx
            o2Pct: 2.0,
            airPreheatC: 1010,
            furnaceTempC: 1210,
            stackTempC: 172,
            cycleTimeS: 28,
            cycleImbalancePct: 1.4,
            bedDeltaPPct: 101,
            coPpm: 22,
            noxPpm: 287,
            fuelFlowMMBtu: 44.2
        }
    }
];

/** Faixas dos sliders do simulador, com unidade e passo. */
export const SIM_PARAMS = [
    { key: 'o2Pct', label: 'Flue O2', unit: '%', min: 0.5, max: 10, step: 0.1 },
    { key: 'airPreheatC', label: 'Air preheat', unit: 'C', min: 200, max: 1100, step: 5 },
    { key: 'furnaceTempC', label: 'Furnace temp', unit: 'C', min: 900, max: 1300, step: 5 },
    { key: 'stackTempC', label: 'Stack temp', unit: 'C', min: 120, max: 450, step: 5 },
    { key: 'cycleTimeS', label: 'Reversal cycle', unit: 's', min: 10, max: 120, step: 1 },
    { key: 'cycleImbalancePct', label: 'A/B imbalance', unit: '%', min: 0, max: 25, step: 0.1 },
    { key: 'bedDeltaPPct', label: 'Bed dP', unit: '% base', min: 95, max: 200, step: 1 },
    { key: 'coPpm', label: 'CO', unit: 'ppm', min: 0, max: 500, step: 5 },
    { key: 'noxPpm', label: 'NOx @3% O2', unit: 'ppm', min: 20, max: 400, step: 5 }
];
