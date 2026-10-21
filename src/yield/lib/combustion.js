/**
 * Motor de combustao para sistemas regenerativos.
 * ---------------------------------------------------------------------------
 * Modulo puro: sem React, sem estado, sem I/O. Recebe leituras de campo e
 * devolve numeros. Isso e' de proposito - o score e o plano de acao precisam
 * ser testaveis e auditaveis sem subir a interface.
 *
 * O queimador regenerativo trabalha em par: enquanto o lado A queima, os gases
 * saem pelo lado B atravessando um leito ceramico que armazena o calor. Na
 * reversao (20-60 s) os papeis invertem e o ar de combustao entra pelo leito
 * quente, chegando ao queimador a 800-1000 C. E' dai que vem a economia: cada
 * grau de ar preaquecido e' combustivel que nao precisa ser queimado.
 *
 * Referencias do modelo: metodologia de "available heat" do US DOE Process
 * Heating (AIRMaster+/PHAST) e balanco de entalpia de gas natural.
 */

// --- constantes de combustao (gas natural) ----------------------------------

/** Poder calorifico inferior do gas natural, kJ/Nm3. */
const LHV_NG = 35800;

/** Ar estequiometrico para gas natural, Nm3 de ar por Nm3 de combustivel. */
const V_AIR_STOICH = 9.57;

/** Produtos de combustao estequiometricos, Nm3 por Nm3 de combustivel. */
const V_FLUE_STOICH = 10.52;

/** Calor especifico medio dos gases de exaustao a alta temperatura, kJ/(Nm3.K). */
const CP_FLUE = 1.45;

/** Calor especifico medio do ar de combustao preaquecido, kJ/(Nm3.K). */
const CP_AIR = 1.36;

/** Temperatura ambiente de referencia, C. */
const T_AMBIENT = 20;

/** Fator de emissao do gas natural, kg CO2 por MMBtu (US EPA). */
const CO2_PER_MMBTU = 53.06;

/** O2 no ar seco, % volume - base do calculo de excesso de ar. */
const O2_IN_AIR = 20.9;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// --- termodinamica ----------------------------------------------------------

/**
 * Excesso de ar a partir do O2 medido na exaustao (base seca).
 * EA% = O2 / (20.9 - O2) x 100
 */
export function excessAirFromO2(o2Pct) {
    const o2 = clamp(o2Pct, 0, 20.5);
    return (o2 / (O2_IN_AIR - o2)) * 100;
}

/**
 * Calor disponivel: fracao do combustivel queimado que fica disponivel para a
 * carga, depois de descontar a entalpia que sai pela chamine e somar de volta
 * o credito do ar preaquecido.
 *
 * AH = (LHV - Q_exaustao + Q_credito_ar) / LHV
 *
 * Com ar frio e forno a 1150 C da' ~47%, que e' o numero de tabela do DOE.
 * Com ar a 950 C passa de 80% - e' a razao de existir do regenerativo.
 */
export function availableHeat({ o2Pct, airPreheatC, furnaceTempC }) {
    const ea = excessAirFromO2(o2Pct) / 100;

    const vAir = V_AIR_STOICH * (1 + ea);
    const vFlue = V_FLUE_STOICH + V_AIR_STOICH * ea;

    const qFlueOut = vFlue * CP_FLUE * (furnaceTempC - T_AMBIENT);
    const qAirCredit = vAir * CP_AIR * (airPreheatC - T_AMBIENT);

    return clamp((LHV_NG - qFlueOut + qAirCredit) / LHV_NG, 0.01, 0.98);
}

/**
 * Eficacia do regenerador: quanto do salto termico disponivel o leito
 * ceramico realmente entrega ao ar de combustao.
 *
 * epsilon = (T_ar_preaquecido - T_ambiente) / (T_gases_entrada - T_ambiente)
 *
 * Leito novo e limpo: 0.80-0.88. Caindo para 0.65 o leito esta' saturado,
 * entupido por oxido/dross, ou ha' by-pass por valvula de reversao vazando.
 */
export function regeneratorEffectiveness({ airPreheatC, furnaceTempC }) {
    const span = furnaceTempC - T_AMBIENT;
    if (span <= 0) return 0;
    return clamp((airPreheatC - T_AMBIENT) / span, 0, 1);
}

/**
 * Economia de combustivel ao mover de uma condicao para outra, em fracao.
 * Sai direto da razao entre os calores disponiveis: para entregar o mesmo
 * calor util, o combustivel cai na proporcao inversa do AH.
 */
export function fuelSavingFraction(ahFrom, ahTo) {
    if (ahTo <= 0) return 0;
    return clamp(1 - ahFrom / ahTo, -1, 1);
}

// --- sub-indices do score ---------------------------------------------------

/**
 * Cada sub-indice devolve 0-100 mais o dado bruto que o gerou, para a
 * interface poder mostrar "porque" a nota e' essa.
 *
 * Os pesos refletem onde o dinheiro esta': recuperacao termica e excesso de ar
 * respondem por mais de metade da conta de combustivel de um regenerativo.
 */
export const SCORE_WEIGHTS = {
    thermalRecovery: 30,
    combustionControl: 25,
    bedIntegrity: 20,
    reversalCycle: 15,
    emissions: 10
};

export const TARGETS = {
    effectiveness: 0.85,
    effectivenessFloor: 0.55,
    o2Ideal: 2.0,
    o2Min: 1.5,
    o2Max: 3.0,
    stackTempC: 200,
    stackTempMaxC: 350,
    bedDeltaPPct: 110,
    bedDeltaPMaxPct: 180,
    cycleMinS: 20,
    cycleMaxS: 60,
    imbalanceMaxPct: 10,
    coPpm: 100,
    coMaxPpm: 400,
    noxPpm: 150,
    noxMaxPpm: 350
};

function scoreThermalRecovery(r) {
    const eps = regeneratorEffectiveness(r);
    const { effectiveness: hi, effectivenessFloor: lo } = TARGETS;
    const score = clamp(((eps - lo) / (hi - lo)) * 100, 0, 100);
    return {
        key: 'thermalRecovery',
        label: 'Thermal recovery',
        score,
        detail: `Regenerator effectiveness ${(eps * 100).toFixed(1)}% (target ${(hi * 100).toFixed(0)}%)`,
        value: eps
    };
}

/**
 * O2 tem janela, nao alvo simples: acima de 3% vira ar frio sendo aquecido a'
 * toa, abaixo de 1.5% comeca CO, fuligem e risco de mistura nao queimada
 * chegando no leito quente. Por isso a nota cai dos dois lados, e mais rapido
 * do lado pobre em oxigenio.
 */
function scoreCombustionControl(r) {
    const o2 = r.o2Pct;
    const { o2Ideal, o2Min, o2Max } = TARGETS;
    let score;

    if (o2 >= o2Min && o2 <= o2Max) {
        const dev = Math.abs(o2 - o2Ideal) / Math.max(o2Ideal - o2Min, o2Max - o2Ideal);
        score = 100 - dev * 10;
    } else if (o2 > o2Max) {
        score = clamp(90 - (o2 - o2Max) * 18, 0, 90);
    } else {
        // sub-estequiometrico: penalidade mais dura, e' risco alem de perda
        score = clamp(85 - (o2Min - o2) * 45, 0, 85);
    }

    const ea = excessAirFromO2(o2);
    return {
        key: 'combustionControl',
        label: 'Combustion control',
        score: clamp(score, 0, 100),
        detail: `O2 ${o2.toFixed(1)}% - excess air ${ea.toFixed(0)}% (window ${o2Min}-${o2Max}%)`,
        value: o2
    };
}

/**
 * Integridade do leito lida por dois sintomas que andam juntos: perda de carga
 * subindo (canal entupindo) e gas saindo mais quente do regenerador (leito nao
 * esta' absorvendo). Vale a pior das duas - um leito pode entupir sem ainda ter
 * perdido troca, e o contrario tambem.
 */
function scoreBedIntegrity(r) {
    const { stackTempC: stackOk, stackTempMaxC, bedDeltaPPct: dpOk, bedDeltaPMaxPct } = TARGETS;

    const stackScore = r.stackTempC <= stackOk
        ? 100
        : clamp(100 - ((r.stackTempC - stackOk) / (stackTempMaxC - stackOk)) * 100, 0, 100);

    const dpScore = r.bedDeltaPPct <= dpOk
        ? 100
        : clamp(100 - ((r.bedDeltaPPct - dpOk) / (bedDeltaPMaxPct - dpOk)) * 100, 0, 100);

    const score = Math.min(stackScore, dpScore);
    return {
        key: 'bedIntegrity',
        label: 'Media bed integrity',
        score,
        detail: `Stack ${r.stackTempC.toFixed(0)} C - bed dP ${r.bedDeltaPPct.toFixed(0)}% of baseline`,
        value: Math.min(stackScore, dpScore)
    };
}

/**
 * Ciclo curto demais gasta atuacao de valvula e perde gas no volume morto a
 * cada reversao; longo demais deixa o leito saturar e o ar sai frio no fim do
 * ciclo. Desbalanco entre os lados A e B e' sintoma classico de valvula de
 * reversao passando - e e' perda direta, gas cru indo para a chamine.
 */
function scoreReversalCycle(r) {
    const { cycleMinS, cycleMaxS, imbalanceMaxPct } = TARGETS;

    let timeScore = 100;
    if (r.cycleTimeS < cycleMinS) timeScore = clamp(100 - (cycleMinS - r.cycleTimeS) * 6, 0, 100);
    else if (r.cycleTimeS > cycleMaxS) timeScore = clamp(100 - (r.cycleTimeS - cycleMaxS) * 2.5, 0, 100);

    const imbScore = clamp(100 - (Math.abs(r.cycleImbalancePct) / imbalanceMaxPct) * 60, 0, 100);

    const score = Math.min(timeScore, imbScore);
    return {
        key: 'reversalCycle',
        label: 'Reversal cycle',
        score,
        detail: `${r.cycleTimeS.toFixed(0)} s cycle - A/B imbalance ${r.cycleImbalancePct.toFixed(1)}%`,
        value: score
    };
}

/**
 * CO e' combustivel jogado fora e sinal de mistura ruim. NOx e' o preco do
 * regenerativo: temperatura de chama alta forma NOx termico, e e' por isso que
 * subir preaquecimento sem staging de ar troca combustivel por multa ambiental.
 */
function scoreEmissions(r) {
    const { coPpm, coMaxPpm, noxPpm, noxMaxPpm } = TARGETS;

    const co = r.coPpm <= coPpm
        ? 100
        : clamp(100 - ((r.coPpm - coPpm) / (coMaxPpm - coPpm)) * 100, 0, 100);

    const nox = r.noxPpm <= noxPpm
        ? 100
        : clamp(100 - ((r.noxPpm - noxPpm) / (noxMaxPpm - noxPpm)) * 100, 0, 100);

    const score = co * 0.5 + nox * 0.5;
    return {
        key: 'emissions',
        label: 'Emissions',
        score,
        detail: `CO ${r.coPpm.toFixed(0)} ppm - NOx ${r.noxPpm.toFixed(0)} ppm @3% O2`,
        value: score
    };
}

const SUB_SCORES = [
    scoreThermalRecovery,
    scoreCombustionControl,
    scoreBedIntegrity,
    scoreReversalCycle,
    scoreEmissions
];

export function gradeFor(score) {
    if (score >= 85) return { grade: 'A', label: 'OPTIMAL', color: '#22c55e' };
    if (score >= 70) return { grade: 'B', label: 'ACCEPTABLE', color: '#00e5ff' };
    if (score >= 55) return { grade: 'C', label: 'DEGRADED', color: '#f59e0b' };
    return { grade: 'D', label: 'CRITICAL', color: '#ef4444' };
}

/**
 * Score composto do sistema regenerativo, 0-100, com o detalhamento por
 * sub-indice que o gerou.
 */
export function combustionScore(reading) {
    const breakdown = SUB_SCORES.map(fn => {
        const s = fn(reading);
        return { ...s, weight: SCORE_WEIGHTS[s.key] };
    });

    const total = breakdown.reduce((sum, s) => sum + s.score * (s.weight / 100), 0);

    return {
        total: Math.round(total * 10) / 10,
        ...gradeFor(total),
        breakdown
    };
}

// --- plano de acao ----------------------------------------------------------

/**
 * Converte um ganho de calor disponivel em dinheiro e carbono por ano.
 * O ganho entra como fracao de combustivel economizada sobre a carga atual.
 */
function annualImpact(savingFraction, reading) {
    const { fuelFlowMMBtu, runHoursPerYear, fuelCostPerMMBtu } = reading;
    const mmbtuPerHour = fuelFlowMMBtu * savingFraction;
    const mmbtuPerYear = mmbtuPerHour * runHoursPerYear;

    return {
        mmbtuPerHour,
        mmbtuPerYear,
        usdPerYear: mmbtuPerYear * fuelCostPerMMBtu,
        tCo2PerYear: (mmbtuPerYear * CO2_PER_MMBTU) / 1000
    };
}

/**
 * Impacto de mover um parametro para o alvo, mantendo o resto onde esta'.
 * Recalcula o calor disponivel no cenario corrigido e mede a diferenca - e'
 * assim que o plano deixa de ser texto e passa a ser numero.
 */
function impactOfMoving(reading, override) {
    const ahNow = availableHeat(reading);
    const ahTarget = availableHeat({ ...reading, ...override });
    return annualImpact(fuelSavingFraction(ahNow, ahTarget), reading);
}

/**
 * Plano de acao derivado dos gaps do score. Cada acao carrega o impacto
 * calculado pelo mesmo modelo que gerou a nota, e nao um valor digitado.
 * Ordenado por dinheiro por ano, que e' como a acao compete por atencao.
 */
export function buildActionPlan(reading) {
    const { breakdown } = combustionScore(reading);
    const by = (k) => breakdown.find(s => s.key === k);
    const actions = [];

    // --- excesso de ar -----------------------------------------------------
    const cc = by('combustionControl');
    if (reading.o2Pct > TARGETS.o2Max) {
        const impact = impactOfMoving(reading, { o2Pct: TARGETS.o2Ideal });
        actions.push({
            id: 'trim-o2',
            title: 'Tune air/fuel ratio to O2 window',
            category: 'Operating Practices',
            priority: cc.score < 60 ? 'HIGH' : 'MEDIUM',
            effort: 'LOW',
            owner: 'Combustion Engineer',
            rationale: `O2 at ${reading.o2Pct.toFixed(1)}% means ${excessAirFromO2(reading.o2Pct).toFixed(0)}% excess air. Every extra Nm3 of air is heated to furnace temperature and thrown out the stack.`,
            steps: [
                'Verify O2 probe calibration against a portable analyser',
                `Trim burner ratio control to ${TARGETS.o2Ideal.toFixed(1)}% O2 at high fire`,
                'Re-check CO stays under 100 ppm after the trim',
                'Repeat at mid and low fire to fix the ratio curve'
            ],
            impact
        });
    } else if (reading.o2Pct < TARGETS.o2Min) {
        actions.push({
            id: 'raise-o2',
            title: 'Raise O2 out of sub-stoichiometric operation',
            category: 'Asset Conditions',
            priority: 'HIGH',
            effort: 'LOW',
            owner: 'Combustion Engineer',
            rationale: `O2 at ${reading.o2Pct.toFixed(1)}% is below the safe window. Unburned fuel reaching a 1000 C media bed is both a loss and an ignition risk.`,
            steps: [
                'Increase combustion air until O2 reaches 2.0%',
                'Confirm CO drops below 100 ppm',
                'Inspect burner nozzle and air damper linkage for drift'
            ],
            impact: annualImpact(0, reading)
        });
    }

    // --- recuperacao termica ----------------------------------------------
    const tr = by('thermalRecovery');
    if (tr.score < 75) {
        const targetPreheat = T_AMBIENT + TARGETS.effectiveness * (reading.furnaceTempC - T_AMBIENT);
        const impact = impactOfMoving(reading, { airPreheatC: targetPreheat });
        actions.push({
            id: 'restore-preheat',
            title: 'Restore air preheat to design effectiveness',
            category: 'Asset Conditions',
            priority: 'HIGH',
            effort: 'MEDIUM',
            owner: 'Maintenance Planner',
            rationale: `Effectiveness at ${(tr.value * 100).toFixed(0)}% against ${(TARGETS.effectiveness * 100).toFixed(0)}% design. Preheat is ${reading.airPreheatC.toFixed(0)} C where it should reach ${targetPreheat.toFixed(0)} C.`,
            steps: [
                'Borescope both media beds for cracked or fused honeycomb',
                'Check reversal valve seat leakage - by-pass air never sees the bed',
                'Verify preheat thermocouple position and response',
                'Plan bed media replacement at the next scheduled outage'
            ],
            impact
        });
    }

    // --- leito -------------------------------------------------------------
    const bi = by('bedIntegrity');
    if (bi.score < 75) {
        const impact = impactOfMoving(reading, { airPreheatC: Math.min(reading.airPreheatC * 1.08, reading.furnaceTempC * 0.88) });
        actions.push({
            id: 'clean-bed',
            title: 'Clean and re-seat regenerator media bed',
            category: 'Asset Conditions',
            priority: bi.score < 50 ? 'HIGH' : 'MEDIUM',
            effort: 'HIGH',
            owner: 'Maintenance Team',
            rationale: `Stack at ${reading.stackTempC.toFixed(0)} C with bed dP at ${reading.bedDeltaPPct.toFixed(0)}% of baseline. Aluminium oxide carry-over blinds the honeycomb channels, so flow short-circuits through the open ones.`,
            steps: [
                'Record dP trend per side to isolate which bed is blinding',
                'Backflush or replace the affected media blocks',
                'Inspect upstream dross/oxide carry-over at the charge well',
                'Reset the dP baseline after the intervention'
            ],
            impact
        });
    }

    // --- ciclo -------------------------------------------------------------
    const rc = by('reversalCycle');
    if (rc.score < 80) {
        const outOfWindow = reading.cycleTimeS < TARGETS.cycleMinS || reading.cycleTimeS > TARGETS.cycleMaxS;
        actions.push({
            id: 'fix-cycle',
            title: Math.abs(reading.cycleImbalancePct) > TARGETS.imbalanceMaxPct
                ? 'Service reversal valve - A/B imbalance'
                : 'Retune reversal cycle time',
            category: 'Operating Practices',
            priority: Math.abs(reading.cycleImbalancePct) > TARGETS.imbalanceMaxPct ? 'HIGH' : 'MEDIUM',
            effort: 'MEDIUM',
            owner: 'Controls / Maintenance',
            rationale: outOfWindow
                ? `Cycle at ${reading.cycleTimeS.toFixed(0)} s sits outside the ${TARGETS.cycleMinS}-${TARGETS.cycleMaxS} s window.`
                : `A/B imbalance of ${reading.cycleImbalancePct.toFixed(1)}% points to a reversal valve passing - part of the charge never crosses the bed.`,
            steps: [
                'Log preheat temperature on both sides across ten full cycles',
                'Compare actuator travel and seat time between A and B',
                `Set cycle time inside the ${TARGETS.cycleMinS}-${TARGETS.cycleMaxS} s window`,
                'Re-check imbalance after the adjustment'
            ],
            impact: impactOfMoving(reading, { airPreheatC: reading.airPreheatC * (1 + Math.min(Math.abs(reading.cycleImbalancePct), 15) / 300) })
        });
    }

    // --- emissoes ----------------------------------------------------------
    const em = by('emissions');
    if (em.score < 75) {
        const noxDriven = reading.noxPpm > TARGETS.noxPpm;
        actions.push({
            id: 'emissions',
            title: noxDriven ? 'Apply air staging to cut thermal NOx' : 'Eliminate CO breakthrough',
            category: 'Operating Practices',
            priority: 'MEDIUM',
            effort: 'MEDIUM',
            owner: 'Process / EHS',
            rationale: noxDriven
                ? `NOx at ${reading.noxPpm.toFixed(0)} ppm. High preheat raises flame temperature, and thermal NOx follows it exponentially - the fuel gain has to be held without buying an emissions problem.`
                : `CO at ${reading.coPpm.toFixed(0)} ppm is unburned fuel leaving the stack.`,
            steps: noxDriven
                ? [
                    'Enable staged / diluted air injection on the burner pair',
                    'Verify flame stability and furnace temperature uniformity',
                    'Re-measure NOx corrected to 3% O2 after staging'
                ]
                : [
                    'Check burner nozzle wear and gas orifice fouling',
                    'Confirm air/fuel ratio across the full firing range',
                    'Verify flame detection and mixing at low fire'
                ],
            impact: annualImpact(0, reading)
        });
    }

    return actions.sort((a, b) => {
        const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
        return b.impact.usdPerYear - a.impact.usdPerYear;
    });
}

/**
 * Resumo do sistema num unico objeto - e' o que a interface consome.
 */
export function analyseSystem(reading) {
    const score = combustionScore(reading);
    const ah = availableHeat(reading);
    const eps = regeneratorEffectiveness(reading);

    // baseline de comparacao: o mesmo forno sem recuperacao nenhuma
    const ahColdAir = availableHeat({ ...reading, airPreheatC: T_AMBIENT });
    const savingVsColdAir = fuelSavingFraction(ahColdAir, ah);

    // potencial ainda na mesa: tudo nos alvos
    const ahIdeal = availableHeat({
        ...reading,
        o2Pct: TARGETS.o2Ideal,
        airPreheatC: T_AMBIENT + TARGETS.effectiveness * (reading.furnaceTempC - T_AMBIENT)
    });
    const gapToIdeal = fuelSavingFraction(ah, ahIdeal);

    const actions = buildActionPlan(reading);
    const recoverable = actions.reduce((s, a) => s + a.impact.usdPerYear, 0);

    return {
        score,
        availableHeat: ah,
        effectiveness: eps,
        excessAir: excessAirFromO2(reading.o2Pct),
        savingVsColdAir,
        gapToIdeal,
        idealImpact: annualImpact(gapToIdeal, reading),
        actions,
        recoverableUsdPerYear: recoverable
    };
}

export const CONSTANTS = { LHV_NG, T_AMBIENT, CO2_PER_MMBTU, V_AIR_STOICH, V_FLUE_STOICH };
