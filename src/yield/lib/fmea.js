/**
 * FMEA de queimadores e sistemas regenerativos.
 * ---------------------------------------------------------------------------
 * Um FMEA de planilha envelhece no dia em que e' assinado: a Ocorrencia fica
 * congelada num numero que alguem estimou numa sala de reuniao, e ninguem
 * revisita ate' a proxima auditoria.
 *
 * Aqui a Ocorrencia e' recalculada a cada leitura. Cada modo de falha carrega
 * uma funcao `evidence(reading)` que procura, nos dados que o supervisorio ja'
 * entrega, a assinatura daquela falha especifica. Leito com dP em 171% e
 * chamine a 372 C nao e' mais "ocorrencia 3, historico" - e' a falha
 * acontecendo agora, e o RPN sobe sozinho.
 *
 * Por isso a tabela se reordena quando se mexe no simulador: o FMEA le' do
 * mesmo motor que o score e o plano de acao.
 *
 * Escalas seguem a convencao AIAG/VDA (1-10). RPN = S x O x D. A regra de
 * severidade alta tambem vale: S >= 9 pede acao independente do RPN, porque
 * RPN baixo por deteccao boa nao torna a consequencia aceitavel.
 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Interpola 0..1 conforme o valor caminha de `from` (sem sintoma) a `to` (sintoma pleno). */
const ramp = (value, from, to) => clamp((value - from) / (to - from), 0, 1);

// ---------------------------------------------------------------------------
// Catalogo de modos de falha
// ---------------------------------------------------------------------------
// severity   - consequencia se a falha ocorre. Nao muda com leitura.
// baseOccurrence - taxa de base do parque, sem sintoma nenhum.
// detection  - capacidade dos controles atuais de pegar a falha ANTES do
//              efeito. 1 = pega sempre, 10 = so' se descobre no efeito.
// evidence   - o quanto as leituras de agora apontam para esta falha (0..1).

export const FAILURE_MODES = [
    // --- valvula de reversao ------------------------------------------------
    {
        id: 'valve-leak',
        component: 'Reversal Valve',
        functionText: 'Alternate combustion air and flue gas paths between side A and side B every cycle',
        failureMode: 'Seat leakage — valve passing',
        effect: 'Part of the combustion air bypasses the hot media bed and reaches the burner cold, while unburned fuel can short-circuit to the stack. Preheat falls on one side and fuel rate climbs to hold furnace temperature.',
        severity: 7,
        cause: 'Seat wear from thermal cycling. At a 30 s cycle the valve actuates roughly 2,900 times per day, so seat life is consumed in months, not years. Dross particulate carried into the seat accelerates it.',
        currentControls: 'Side A vs side B preheat comparison each cycle; combustion air flow trend',
        detection: 4,
        baseOccurrence: 3,
        evidence: (r) => {
            const level = ramp(Math.abs(r.cycleImbalancePct), 6, 16);
            return {
                level,
                note: `A/B imbalance ${r.cycleImbalancePct.toFixed(1)}% (flag above 10%)`
            };
        },
        recommendedAction: 'Log preheat on both sides across ten full cycles and compare actuator travel and seat time. Replace seat kit if the imbalance holds. Add a per-side preheat deviation alarm at 8%.',
        targetOccurrence: 2
    },
    {
        id: 'valve-stuck',
        component: 'Reversal Valve',
        functionText: 'Complete each reversal within the commanded stroke time',
        failureMode: 'Failure to reverse — valve stuck mid-travel',
        effect: 'One bed stops being regenerated. Combustion air arrives cold, the opposite bed overheats past its sintering limit, and the furnace loses temperature control. Worst case the burner fires into a blocked exhaust path.',
        severity: 9,
        cause: 'Actuator failure, loss of instrument air, thermal distortion of the valve body, or debris jamming the disc',
        currentControls: 'Position feedback and reversal timeout alarm in the burner management system',
        detection: 3,
        baseOccurrence: 2,
        evidence: (r) => {
            const level = Math.max(
                ramp(Math.abs(r.cycleImbalancePct), 12, 22),
                ramp(r.cycleTimeS, 75, 110)
            );
            return {
                level,
                note: `cycle ${r.cycleTimeS.toFixed(0)} s, imbalance ${r.cycleImbalancePct.toFixed(1)}%`
            };
        },
        recommendedAction: 'Verify instrument air pressure and actuator stroke time against spec. Function-test the reversal timeout interlock. Keep a seat/actuator kit in stores — this one stops production.',
        targetOccurrence: 1
    },

    // --- leito ceramico -----------------------------------------------------
    {
        id: 'bed-blinding',
        component: 'Regenerator Media Bed',
        functionText: 'Store flue gas heat and release it to the combustion air on the next reversal',
        failureMode: 'Channel blinding — oxide and dross carry-over',
        effect: 'Blocked honeycomb channels force flow through the remaining open ones. Heat transfer area drops, preheat falls and stack temperature rises. Pressure drop climbs and the combustion air fan runs out of margin.',
        severity: 6,
        cause: 'Aluminium oxide and dross carried from the charge well into the exhaust path, condensing on the cold face of the media. Worsens with flame impingement on the bath, which makes more dross — the loop feeds itself.',
        currentControls: 'Bed differential pressure trend per side; stack temperature after the regenerator',
        detection: 3,
        baseOccurrence: 4,
        evidence: (r) => {
            const level = Math.max(
                ramp(r.bedDeltaPPct, 115, 175),
                ramp(r.stackTempC, 210, 360)
            );
            return {
                level,
                note: `bed dP ${r.bedDeltaPPct.toFixed(0)}% of baseline, stack ${r.stackTempC.toFixed(0)} C`
            };
        },
        recommendedAction: 'Trend dP per side to isolate the affected bed, then backflush or replace the blinded blocks. Attack the source as well: check flame impingement and dross generation at the charge well, or the bed blinds again.',
        targetOccurrence: 2
    },
    {
        id: 'bed-cracking',
        component: 'Regenerator Media Bed',
        functionText: 'Survive the thermal swing of every reversal without mechanical damage',
        failureMode: 'Thermal shock cracking and spalling',
        effect: 'Fragments break away and settle, opening bypass paths through the bed. Air crosses without exchanging heat, so preheat drops even with pressure drop looking normal — the failure hides from the dP control.',
        severity: 6,
        cause: 'Cycle time too short for the media mass, so the ceramic never reaches a stable gradient. Cordierite tolerates the swing far better than dense alumina, but not an under-tuned cycle.',
        currentControls: 'Preheat temperature trend; borescope inspection at scheduled outages',
        detection: 6,
        baseOccurrence: 3,
        evidence: (r, a) => {
            const shortCycle = ramp(20 - r.cycleTimeS, 0, 10);
            // preheat baixo sem dP alto e' a assinatura: perdeu troca sem entupir
            const lowEffNoDp = a
                ? Math.min(ramp(0.80 - a.effectiveness, 0, 0.18), ramp(125 - r.bedDeltaPPct, 0, 20))
                : 0;
            return {
                level: Math.max(shortCycle, lowEffNoDp),
                note: a
                    ? `effectiveness ${(a.effectiveness * 100).toFixed(0)}% with dP only ${r.bedDeltaPPct.toFixed(0)}%`
                    : `cycle ${r.cycleTimeS.toFixed(0)} s`
            };
        },
        recommendedAction: 'Borescope both beds for fractured or displaced blocks. Confirm cycle time against the media supplier curve for this bed mass before blaming the material.',
        targetOccurrence: 2
    },
    {
        id: 'bed-sintering',
        component: 'Regenerator Media Bed',
        functionText: 'Hold geometry and porosity at working temperature',
        failureMode: 'Media sintering — channels fused closed',
        effect: 'Permanent loss of exchange area. Unlike blinding this does not backflush out: the bed has to be replaced.',
        severity: 8,
        cause: 'Bed face driven past its service limit by excessive furnace temperature, or by a long cycle that lets the hot face soak without relief',
        currentControls: 'Furnace temperature limit; bed face thermocouple where fitted',
        detection: 7,
        baseOccurrence: 2,
        evidence: (r) => {
            const level = Math.max(
                ramp(r.furnaceTempC, 1200, 1290),
                ramp(r.cycleTimeS, 80, 120) * 0.6
            );
            return {
                level,
                note: `furnace ${r.furnaceTempC.toFixed(0)} C, cycle ${r.cycleTimeS.toFixed(0)} s`
            };
        },
        recommendedAction: 'Cap furnace setpoint at the media service limit and alarm on approach. Where no bed face thermocouple exists, fit one — this failure is invisible until the bed is scrap.',
        targetOccurrence: 1
    },

    // --- queimador ----------------------------------------------------------
    {
        id: 'nozzle-fouling',
        component: 'Burner Nozzle',
        functionText: 'Meter and mix fuel with preheated combustion air',
        failureMode: 'Gas orifice fouling or partial blockage',
        effect: 'Fuel flow falls below demand and the ratio runs air-rich on that burner. Furnace temperature drags and the control loop pushes more air chasing it, compounding the loss.',
        severity: 5,
        cause: 'Pipe scale and gas-side deposits; carbon build-up where the nozzle runs hot at low fire',
        currentControls: 'Gas pressure drop across the burner; O2 trend',
        detection: 4,
        baseOccurrence: 3,
        evidence: (r) => ({
            level: ramp(r.o2Pct, 4.5, 8.5),
            note: `flue O2 ${r.o2Pct.toFixed(1)}% — air-rich`
        }),
        recommendedAction: 'Pull and inspect the nozzle at the next opportunity; verify gas orifice bore against drawing. Log burner gas dP so the drift is visible before O2 moves.',
        targetOccurrence: 2
    },
    {
        id: 'flame-impingement',
        component: 'Burner Nozzle',
        functionText: 'Direct the flame envelope without touching the charge',
        failureMode: 'Flame impingement on the bath surface',
        effect: 'Local overheating oxidises the aluminium, generating dross. Metal yield falls and the dross is carried into the regenerator, blinding the bed — so this failure causes another one downstream.',
        severity: 7,
        cause: 'Nozzle misalignment after maintenance, burner tile erosion, or firing rate above the burner design envelope',
        currentControls: 'Visual inspection through the sight port; dross generation rate per heat',
        detection: 6,
        baseOccurrence: 3,
        evidence: (r) => ({
            level: Math.max(
                ramp(r.bedDeltaPPct, 125, 175) * 0.8,
                ramp(r.furnaceTempC, 1190, 1280) * 0.6
            ),
            note: `bed dP ${r.bedDeltaPPct.toFixed(0)}% suggests carry-over upstream`
        }),
        recommendedAction: 'Inspect burner tile and nozzle alignment against the installation drawing. Correlate dross rate per heat with firing rate — impingement usually shows up as both at once.',
        targetOccurrence: 2
    },

    // --- ar de combustao ----------------------------------------------------
    {
        id: 'ratio-drift',
        component: 'Combustion Air Control',
        functionText: 'Hold the air/fuel ratio across the full firing range',
        failureMode: 'Ratio drift — excess air above the control window',
        effect: 'Every extra cubic metre of air is heated to furnace temperature and thrown out the stack. This is the single largest recoverable loss on a healthy regenerative system.',
        severity: 5,
        cause: 'Linkage wear, damper characterisation drifting from the commissioned curve, or ratio regulator set once at high fire and never checked at mid and low',
        currentControls: 'Continuous O2 measurement with alarm; annual combustion tuning',
        detection: 2,
        baseOccurrence: 5,
        evidence: (r) => ({
            level: Math.max(ramp(r.o2Pct, 3.2, 8), ramp(1.5 - r.o2Pct, 0, 1)),
            note: `flue O2 ${r.o2Pct.toFixed(1)}% (window 1.5-3.0%)`
        }),
        recommendedAction: 'Re-tune the ratio curve at high, mid and low fire — not just high. Verify CO stays under 100 ppm after the trim. This is low effort and usually the fastest money on the list.',
        targetOccurrence: 2
    },
    {
        id: 'sub-stoich',
        component: 'Combustion Air Control',
        functionText: 'Keep combustion above the stoichiometric threshold at all firing rates',
        failureMode: 'Sub-stoichiometric operation — air starvation',
        effect: 'Unburned fuel and CO leave the chamber and reach a media bed sitting near 1000 C. Beyond the energy thrown away, this is an ignition hazard in the exhaust path.',
        severity: 9,
        cause: 'Air damper restriction, fan degradation, or a ratio setting pushed lean on fuel cost without watching CO',
        currentControls: 'O2 low alarm; CO measurement where fitted',
        detection: 3,
        baseOccurrence: 2,
        evidence: (r) => ({
            level: Math.max(ramp(1.6 - r.o2Pct, 0, 1.1), ramp(r.coPpm, 150, 450)),
            note: `O2 ${r.o2Pct.toFixed(1)}%, CO ${r.coPpm.toFixed(0)} ppm`
        }),
        recommendedAction: 'Interlock minimum O2 rather than relying on operator discipline. Verify CO measurement is live and alarmed — O2 alone will not catch a mixing problem.',
        targetOccurrence: 1
    },

    // --- instrumentacao -----------------------------------------------------
    {
        id: 'o2-drift',
        component: 'O2 Analyser',
        functionText: 'Measure oxygen in the flue gas as the input to ratio control',
        failureMode: 'Calibration drift or probe poisoning',
        effect: 'Ratio control acts on a wrong number. The system can sit well outside the window while the screen shows it in the middle — every downstream control decision inherits the error.',
        severity: 6,
        cause: 'Zirconia cell ageing, sulphur or silicone poisoning, reference air path blocked, condensation in the sample line',
        currentControls: 'Scheduled calibration against a portable analyser',
        detection: 5,
        baseOccurrence: 4,
        evidence: (r) => ({
            // O2 improvavelmente estavel no fundo de escala e' suspeito de sonda morta
            level: r.o2Pct < 0.8 ? 0.7 : ramp(r.o2Pct, 6, 9) * 0.5,
            note: `reading ${r.o2Pct.toFixed(1)}% — verify against portable analyser`
        }),
        recommendedAction: 'Cross-check against a portable analyser before acting on any O2-driven finding. Shorten the calibration interval if drift between checks exceeds 0.5%.',
        targetOccurrence: 2
    },
    {
        id: 'tc-drift',
        component: 'Preheat Thermocouple',
        functionText: 'Measure combustion air temperature leaving the regenerator',
        failureMode: 'Drift, sheath degradation or wrong immersion depth',
        effect: 'Regenerator effectiveness is computed from this reading, so a bad thermocouple either hides a degrading bed or invents a problem that is not there. The score and the action plan both inherit it.',
        severity: 5,
        cause: 'Thermal ageing of the junction, oxidation of the sheath, or a probe reinstalled at the wrong depth after maintenance',
        currentControls: 'Comparison against the opposite side; step change at reversal',
        detection: 6,
        baseOccurrence: 3,
        evidence: (r, a) => ({
            level: a ? ramp(0.70 - a.effectiveness, 0, 0.2) * 0.7 : 0,
            note: a
                ? `effectiveness ${(a.effectiveness * 100).toFixed(0)}% — confirm the probe before condemning the bed`
                : 'no analysis context'
        }),
        recommendedAction: 'Verify immersion depth and junction integrity before scheduling bed work. A bed replacement ordered on a bad thermocouple is an expensive way to find out.',
        targetOccurrence: 2
    },

    // --- seguranca ----------------------------------------------------------
    {
        id: 'flame-detection',
        component: 'Flame Safety System',
        functionText: 'Detect flame presence and trip the fuel valve on loss',
        failureMode: 'Scanner fouling — false flame or missed flame loss',
        effect: 'A missed flame loss admits fuel into a hot chamber with no ignition. A false flame-loss trip stops production and thermally shocks the beds on an unplanned cooldown.',
        severity: 10,
        cause: 'Soot or dust on the scanner lens, sight tube misalignment, scanner ageing, purge air loss to the sight tube',
        currentControls: 'Burner management system self-check each cycle; flame signal strength trend',
        detection: 2,
        baseOccurrence: 2,
        evidence: (r) => ({
            level: ramp(r.coPpm, 180, 450) * 0.6,
            note: `CO ${r.coPpm.toFixed(0)} ppm — poor combustion also fouls the scanner`
        }),
        recommendedAction: 'Keep the scheduled proof test — this is the one mode where a low RPN is not permission to relax. Trend flame signal strength so fouling is visible before the trip.',
        targetOccurrence: 1
    },

    // --- ciclo e emissoes ---------------------------------------------------
    {
        id: 'cycle-drift',
        component: 'Cycle Controller',
        functionText: 'Command reversal at the interval matched to the media mass',
        failureMode: 'Cycle time drifted outside the design window',
        effect: 'Long cycles let the bed saturate, so air leaves cold at the end of each period. Short cycles waste the dead volume gas at every reversal and consume valve life for nothing.',
        severity: 4,
        cause: 'Timer changed during commissioning trials and never restored, or adjusted to mask a different problem',
        currentControls: 'Cycle time displayed on the HMI; preheat profile within the cycle',
        detection: 3,
        baseOccurrence: 4,
        evidence: (r) => ({
            level: Math.max(ramp(r.cycleTimeS, 62, 100), ramp(20 - r.cycleTimeS, 0, 9)),
            note: `cycle ${r.cycleTimeS.toFixed(0)} s (window 20-60 s)`
        }),
        recommendedAction: 'Restore the commissioned cycle time and record it as a controlled parameter. If it was changed to mask another symptom, that symptom is the real finding.',
        targetOccurrence: 2
    },
    {
        id: 'nox',
        component: 'Combustion System',
        functionText: 'Meet the permitted NOx limit while running high air preheat',
        failureMode: 'Thermal NOx above permit limit',
        effect: 'Permit exceedance and the reporting that comes with it. The fuel saving is real but it is not worth trading for a compliance finding.',
        severity: 8,
        cause: 'High air preheat raises flame temperature, and thermal NOx follows it exponentially. Without staged or diluted air injection the gain arrives with the penalty.',
        currentControls: 'Continuous NOx monitoring corrected to 3% O2',
        detection: 2,
        baseOccurrence: 4,
        evidence: (r) => ({
            level: ramp(r.noxPpm, 150, 330),
            note: `NOx ${r.noxPpm.toFixed(0)} ppm @3% O2 (limit reference 150)`
        }),
        recommendedAction: 'Enable staged or diluted air injection on the burner pair, then re-measure corrected to 3% O2. Verify flame stability and temperature uniformity after staging.',
        targetOccurrence: 2
    }
];

// ---------------------------------------------------------------------------
// Avaliacao
// ---------------------------------------------------------------------------

export const RISK_BANDS = [
    { min: 200, label: 'CRITICAL', color: '#ef4444' },
    { min: 120, label: 'HIGH', color: '#f59e0b' },
    { min: 60, label: 'MEDIUM', color: '#00e5ff' },
    { min: 0, label: 'LOW', color: '#22c55e' }
];

export const riskBand = (rpn) => RISK_BANDS.find(b => rpn >= b.min) || RISK_BANDS[RISK_BANDS.length - 1];

/**
 * Avalia um modo de falha contra a leitura atual.
 *
 * A Ocorrencia parte da taxa de base e caminha para 10 conforme a evidencia
 * nas leituras aumenta. Sem sintoma, o item fica no historico; com sintoma
 * pleno, vai ao topo da lista sozinho.
 */
export function evaluateFailureMode(fm, reading, analysis) {
    const ev = fm.evidence(reading, analysis);
    const level = clamp(ev.level, 0, 1);

    const occurrence = clamp(Math.round(fm.baseOccurrence + level * (10 - fm.baseOccurrence)), 1, 10);
    const rpn = fm.severity * occurrence * fm.detection;
    const rpnAfter = fm.severity * fm.targetOccurrence * fm.detection;

    return {
        ...fm,
        occurrence,
        baseRpn: fm.severity * fm.baseOccurrence * fm.detection,
        rpn,
        rpnAfter,
        band: riskBand(rpn),
        evidenceLevel: level,
        evidenceNote: ev.note,
        // S >= 9 pede acao mesmo com RPN baixo: deteccao boa nao reduz a
        // consequencia, so' a chance de ser pego a tempo
        severityFlag: fm.severity >= 9,
        active: level >= 0.35
    };
}

/** FMEA completo de um sistema, ordenado por risco. */
export function evaluateFmea(reading, analysis) {
    // Ordena por RPN puro. A regra de severidade alta nao reordena a tabela -
    // ela marca o item, e o resumo conta quantos existem. Empurrar um RPN 40
    // para cima de um RPN 336 so' porque S=9 esconde o risco que esta' ativo
    // agora, que e' exatamente o que esta tela precisa mostrar primeiro.
    const rows = FAILURE_MODES
        .map(fm => evaluateFailureMode(fm, reading, analysis))
        .sort((a, b) => b.rpn - a.rpn);

    const active = rows.filter(r => r.active);
    const highest = rows.reduce((m, r) => Math.max(m, r.rpn), 0);

    return {
        rows,
        active,
        counts: {
            critical: rows.filter(r => r.rpn >= 200).length,
            high: rows.filter(r => r.rpn >= 120 && r.rpn < 200).length,
            medium: rows.filter(r => r.rpn >= 60 && r.rpn < 120).length,
            low: rows.filter(r => r.rpn < 60).length,
            severityFlagged: rows.filter(r => r.severityFlag).length
        },
        highestRpn: highest,
        // quanto do risco total sairia se todas as acoes fossem executadas
        totalRpn: rows.reduce((s, r) => s + r.rpn, 0),
        totalRpnAfter: rows.reduce((s, r) => s + r.rpnAfter, 0)
    };
}
