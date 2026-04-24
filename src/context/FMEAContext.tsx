import React, { createContext, useContext, useState } from 'react';
import { SystemData, ComponentData, FMEARowData } from '../types';
import { calculateRPN, calculateActionPriority } from '../utils/calculations';

// Hot Rolling Mill FMEA Data (imported from Aluminum_Hot_Mill_FMEA.xlsx)
const initialSystems: SystemData[] = [
  {
    id: 'sys-plant',
    name: 'Aluminum Hot Rolling Mill',
    subsystems: [
      {
        id: 'sub-1',
        name: "Reheat Furnace – Walking Beam Mechanism",
        components: [
          {
            id: 'comp-1',
            name: "Walking beam hydraulic lift cylinder",
            fmeaRows: [
              {
                id: 'row-1',
                function: "Lift and advance ingot through furnace without surface marking",
                failureMode: "Internal leak across piston seal",
                effect: "Loss of position hold; beam creep; Ingot mispositioning; extended pre-heat cycle; non-uniform heating; Downgrade hot-mill feed; possible furnace stall",
                severity: 7,
                cause: "Filtration below ISO 17/15/12; insufficient seal material for elevated temperature",
                occurrence: 5,
                control: "Fire-resistant fluid (HFC/HFDU), filtration to ISO 17/15/12, OEM-qualified seal kits | Cylinder drift test; pressure-decay test; oil analysis (ISO particle count + water)",
                detection: 5,
                rpn: calculateRPN(7, 5, 5),
                actionPriority: calculateActionPriority(7, 5, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-2',
        name: "Reheat Furnace – Combustion",
        components: [
          {
            id: 'comp-2',
            name: "Regenerative/recuperative burner",
            fmeaRows: [
              {
                id: 'row-2',
                function: "Deliver controlled combustion heat profile across zones",
                failureMode: "Burner tip erosion; flame-detector fouling; valve stick",
                effect: "Dead zone or cold zone in furnace; Non-uniform ingot temperature; hot mill load imbalance; roll wear asymmetry; Quality downgrade; NOx compliance event",
                severity: 7,
                cause: "Operating beyond design turndown; poor combustion air filtration; lack of burner maintenance cycle",
                occurrence: 6,
                control: "SIL-rated BMS interlocks; flame-scanner cleaning schedule; combustion air filtration | UV flame detection; combustion O2/CO analyzers; thermographic surveys through peephole",
                detection: 4,
                rpn: calculateRPN(7, 6, 4),
                actionPriority: calculateActionPriority(7, 6, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-3',
        name: "Reheat Furnace – Skid System",
        components: [
          {
            id: 'comp-3',
            name: "Water-cooled skid rail tube",
            fmeaRows: [
              {
                id: 'row-3',
                function: "Support ingot and convey cooling water",
                failureMode: "Tube wall rupture",
                effect: "Water leak into hot zone; steam explosion risk; Ingot surface defect (&apos;black mark&apos;); possible emergency shutdown; Major safety event if rupture; significant repair",
                severity: 9,
                cause: "Degraded skid insulation (hot-skid condition); poor water treatment; overpressure",
                occurrence: 3,
                control: "Skid insulation (hot skids); water treatment program; overpressure protection | Skid water flow + differential-pressure trending; leak detection in exhaust; visual inspection",
                detection: 6,
                rpn: calculateRPN(9, 3, 6),
                actionPriority: calculateActionPriority(9, 3, 6),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-4',
        name: "Reheat Furnace – Homogenization Interface",
        components: [
          {
            id: 'comp-4',
            name: "Soaking pit thermocouple + recirculation fan",
            fmeaRows: [
              {
                id: 'row-4',
                function: "Deliver homogenized, dimensionally-stable ingot to scalper",
                failureMode: "Temperature-profile drift; TC failure; recirculation fan degradation",
                effect: "Zone temperature deviation; airflow imbalance; Coarse intermetallics; inferior grain structure; Hot-mill roll-force surprises; edge cracking; downstream anisotropy (severe on 5xxx / 6xxx auto)",
                severity: 7,
                cause: "Lack of dual redundancy; no TC calibration program; fan run-to-failure",
                occurrence: 4,
                control: "Dual redundant TCs per zone; calibration program; model-based L2 | TC voting logic; oxygen/dew-point monitoring; fan vibration trending",
                detection: 5,
                rpn: calculateRPN(7, 4, 5),
                actionPriority: calculateActionPriority(7, 4, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-5',
        name: "Scalper – Spindle Drive",
        components: [
          {
            id: 'comp-5',
            name: "Cutter-head spindle bearings",
            fmeaRows: [
              {
                id: 'row-5',
                function: "Support cutter head at high speed without radial/axial play",
                failureMode: "Bearing race spalling and seizure",
                effect: "Spindle unable to rotate at spec; Scalper spindle damage; ingot surface defect; Scalper down; hot mill feed constraint",
                severity: 7,
                cause: "Failed labyrinth / lip seal; inadequate oil-mist purge pressure",
                occurrence: 4,
                control: "Sealed double-row cylindrical roller bearings with oil-mist; sealing upgrade | SPM HD at 32 kHz; bearing temperature monitoring; oil analysis",
                detection: 5,
                rpn: calculateRPN(7, 4, 5),
                actionPriority: calculateActionPriority(7, 4, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-6',
        name: "Scalper – Cutting Tool",
        components: [
          {
            id: 'comp-6',
            name: "Cutter-head insert",
            fmeaRows: [
              {
                id: 'row-6',
                function: "Remove 2-15 mm of cast ingot surface",
                failureMode: "Carbide insert fracture or rapid adhesive wear",
                effect: "Tool fracture; Deep gouge in ingot surface; Ingot scrap or re-work",
                severity: 6,
                cause: "Running past tonnage limit; incorrect coolant; alloy transition without insert change",
                occurrence: 6,
                control: "Insert tonnage tracking; alloy-specific insert selection; coolant flow verification | Spindle-current signature analysis; acoustic emission; post-cut visual",
                detection: 6,
                rpn: calculateRPN(6, 6, 6),
                actionPriority: calculateActionPriority(6, 6, 6),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-7',
        name: "Scalper – Measurement",
        components: [
          {
            id: 'comp-7',
            name: "Laser ingot-surface measurement head",
            fmeaRows: [
              {
                id: 'row-7',
                function: "Measure ingot surface profile to calibrate scalp depth",
                failureMode: "Traversing-head mechanical wear; laser/optic drift",
                effect: "Incorrect measured thickness; Over-scalping (&apos;safety margin&apos;) → yield loss; Metal yield loss 0.3-0.8%",
                severity: 5,
                cause: "Legacy moving-head design without fixed-mount replacement; inadequate air-purge",
                occurrence: 7,
                control: "Convert to LMI fixed-mount multi-sensor line; air-purge optics | Calibration piece check; system self-diagnosis",
                detection: 5,
                rpn: calculateRPN(5, 7, 5),
                actionPriority: calculateActionPriority(5, 7, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-8',
        name: "Scalper – Chip Handling",
        components: [
          {
            id: 'comp-8',
            name: "Chip crusher hammer rotor",
            fmeaRows: [
              {
                id: 'row-8',
                function: "Reduce aluminum chip size for pneumatic conveyance",
                failureMode: "Hammer wear → unbalance → bearing damage; aluminum fines + oil ignition",
                effect: "Vibration rise; possible duct fire; Chip conveyance loss; scalper stop; fire risk; Aluminum fine dust fire (known industry hazard)",
                severity: 8,
                cause: "Hammer run past wear limit; residual oil above flash point; duct spark sources",
                occurrence: 4,
                control: "FR fluid on hydraulic couplings; spark arrestors; NFPA 484 dust control | Rotor vibration; duct thermography; CO detector in duct",
                detection: 5,
                rpn: calculateRPN(8, 4, 5),
                actionPriority: calculateActionPriority(8, 4, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-9',
        name: "Reversing Mill – Work Rolls",
        components: [
          {
            id: 'comp-9',
            name: "Forged 5Cr/5Cr-Mo work roll barrel",
            fmeaRows: [
              {
                id: 'row-9',
                function: "Reduce ingot thickness while maintaining surface finish and profile",
                failureMode: "Circumferential ribbon spall on roll barrel",
                effect: "Roll surface loss; strip surface defect; Mill stop to change roll pair; downgraded coil; 8-24 h unplanned stop; $100-300k event cost",
                severity: 8,
                cause: "Campaign tonnage beyond fatigue life; inadequate eddy-current inspection before re-mount",
                occurrence: 5,
                control: "Campaign tonnage tracking; eddy-current before remount; chamfer re-grind spec | Ultrasonic + eddy-current roll inspection every grind; surface-crack depth trending",
                detection: 6,
                rpn: calculateRPN(8, 5, 6),
                actionPriority: calculateActionPriority(8, 5, 6),
              }
            ]
          },
          {
            id: 'comp-10',
            name: "Work roll (subsurface integrity)",
            fmeaRows: [
              {
                id: 'row-10',
                function: "Reduce thickness without catastrophic barrel failure",
                failureMode: "Large-area flake separation from sub-surface defect",
                effect: "Catastrophic roll loss; potential projectile risk; Mill housing damage; multi-stand roll change; &gt;72 h stop; potential chock/neck collateral damage",
                severity: 9,
                cause: "Manufacturing defect escaped incoming QA; sub-zero treatment omitted",
                occurrence: 3,
                control: "Stringent incoming-roll QA; 100% UT at receipt; sub-zero treatment | Incoming UT + retained-austenite metallography; in-service periodic UT",
                detection: 7,
                rpn: calculateRPN(9, 3, 7),
                actionPriority: calculateActionPriority(9, 3, 7),
              }
            ]
          },
          {
            id: 'comp-11',
            name: "Work roll surface (aluminum pickup)",
            fmeaRows: [
              {
                id: 'row-11',
                function: "Maintain low-roughness roll surface free of transferred metal",
                failureMode: "Adhesive-wear metal transfer from strip to roll",
                effect: "Roll surface roughens; Pickup transfers to strip as streaks; Strip surface defect; coil downgrade",
                severity: 6,
                cause: "Low emulsion concentration (&lt;3%); no EP additive; worn work-roll brushes",
                occurrence: 7,
                control: "Work-roll brushes; emulsion concentration control (&gt;3%); phosphate-ester EP additive | Strip surface inspection; roll-surface replica-tape; emulsion IR-FTIR",
                detection: 4,
                rpn: calculateRPN(6, 7, 4),
                actionPriority: calculateActionPriority(6, 7, 4),
              }
            ]
          },
          {
            id: 'comp-12',
            name: "Work roll (thermal/fire cracking)",
            fmeaRows: [
              {
                id: 'row-12',
                function: "Maintain barrel surface integrity under thermal cycling",
                failureMode: "Craze cracking pattern from thermal shock",
                effect: "Surface crack network; Strip surface defect transfer; Early roll change; quality downgrade",
                severity: 7,
                cause: "Insufficient roll cooling; asymmetric emulsion flow; roughing stand heat input",
                occurrence: 5,
                control: "Emulsion flow symmetry; roll-cooling header flow test | Eddy-current surface inspection; visual",
                detection: 5,
                rpn: calculateRPN(7, 5, 5),
                actionPriority: calculateActionPriority(7, 5, 5),
              }
            ]
          },
          {
            id: 'comp-13',
            name: "Work roll neck",
            fmeaRows: [
              {
                id: 'row-13',
                function: "Transmit torque from spindle without fatigue failure",
                failureMode: "Transverse fracture at neck fillet",
                effect: "Roll and spindle damage; Stand disabled; collateral damage to chock and bearings; 24-72 h stop; potential mill housing damage",
                severity: 10,
                cause: "Drive-acceleration above 1.20 rot/s² optimum; worn universal spindle; biting misstep",
                occurrence: 2,
                control: "Drive-acceleration control (1.20 rot/s²); spindle maintenance; biting model | Telemetric torque monitoring; motor current anomaly",
                detection: 8,
                rpn: calculateRPN(10, 2, 8),
                actionPriority: calculateActionPriority(10, 2, 8),
              }
            ]
          },
          {
            id: 'comp-14',
            name: "Work roll journal (under bearing)",
            fmeaRows: [
              {
                id: 'row-14',
                function: "Provide clean hydrodynamic surface for MORGOIL sleeve",
                failureMode: "Journal surface corrosion pitting or scoring",
                effect: "Journal surface damage; Accelerated MORGOIL sleeve wear; premature bearing failure; Premature BUR change; potential catastrophic bearing failure",
                severity: 8,
                cause: "Failed DF seal; free water accumulation in lube oil",
                occurrence: 5,
                control: "DF seal integrity program; water-in-oil sensor; bulk-oil breather | Oil analysis (water, Fe); journal inspection at grind",
                detection: 6,
                rpn: calculateRPN(8, 5, 6),
                actionPriority: calculateActionPriority(8, 5, 6),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-10',
        name: "Reversing Mill – Backup Rolls",
        components: [
          {
            id: 'comp-15',
            name: "Backup roll barrel (chamfer)",
            fmeaRows: [
              {
                id: 'row-15',
                function: "Provide rigid back-support to work roll",
                failureMode: "Fatigue crack propagation from chamfer edge",
                effect: "Edge chunk separation; Immediate BUR change; possible WR damage; &gt;24 h stop; $200-500k event",
                severity: 9,
                cause: "Non-optimized chamfer contour; hardness trending ignored; tonnage above fatigue threshold",
                occurrence: 4,
                control: "Optimized chamfer (VCRplus); hardness trending at chamfer; tonnage-based early change | Off-line UT every change; hardness map; chamfer geometry check",
                detection: 6,
                rpn: calculateRPN(9, 4, 6),
                actionPriority: calculateActionPriority(9, 4, 6),
              }
            ]
          },
          {
            id: 'comp-16',
            name: "BUR journal",
            fmeaRows: [
              {
                id: 'row-16',
                function: "Transmit load to MORGOIL sleeve without galling",
                failureMode: "Journal surface pitting from cyclic contact with WR chock",
                effect: "Journal surface damage; Sleeve damage; premature bearing failure; Unplanned BUR change",
                severity: 7,
                cause: "Start-up before oil pressure; chock alignment error",
                occurrence: 5,
                control: "Interlock pump start before mill start; chock alignment procedure | Journal visual at change; oil analysis Fe trend",
                detection: 6,
                rpn: calculateRPN(7, 5, 6),
                actionPriority: calculateActionPriority(7, 5, 6),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-11',
        name: "Reversing Mill – MORGOIL Bearings",
        components: [
          {
            id: 'comp-17',
            name: "MORGOIL sleeve / KLX",
            fmeaRows: [
              {
                id: 'row-17',
                function: "Support BUR with full hydrodynamic oil film",
                failureMode: "Metal-to-metal contact and sleeve wipe",
                effect: "BUR cannot rotate; Stand down; chock/neck crack possible; &gt;72 h stop; multi-component damage",
                severity: 9,
                cause: "Pump not running before mill start; low-pressure trip disabled; severe contamination",
                occurrence: 3,
                control: "Interlocked pump start before mill start; min-pressure trip; DF seal condition | Pressure monitoring; temperature rise; oil analysis",
                detection: 6,
                rpn: calculateRPN(9, 3, 6),
                actionPriority: calculateActionPriority(9, 3, 6),
              }
            ]
          },
          {
            id: 'comp-18',
            name: "MORGOIL sleeve (capacity)",
            fmeaRows: [
              {
                id: 'row-18',
                function: "Support BUR at design load without wear",
                failureMode: "Dimensional wear of sleeve ID",
                effect: "Increased clearance; eccentricity; Poor gauge control; AGC limit reached; Quality degradation; early BUR change",
                severity: 7,
                cause: "Production loads increased without bearing audit; misalignment from worn chock liners",
                occurrence: 5,
                control: "Bearing capacity audit; KL → KLX upgrade (+25% capacity same envelope) | Eccentricity monitoring; load-cell vs HGC signature",
                detection: 6,
                rpn: calculateRPN(7, 5, 6),
                actionPriority: calculateActionPriority(7, 5, 6),
              }
            ]
          },
          {
            id: 'comp-19',
            name: "MORGOIL DF seal",
            fmeaRows: [
              {
                id: 'row-19',
                function: "Prevent mill cooling water and contamination from entering bearing",
                failureMode: "Seal wear allowing water ingress",
                effect: "Water contaminates MORGOIL oil; Lube-oil emulsification; bearing failures avg $30k+ each; Multiple bearing losses across campaign",
                severity: 8,
                cause: "Tonnage beyond seal life; design gap under full mill cooling pressure",
                occurrence: 7,
                control: "Water removal elements (Hy-Pro); online water-in-oil sensor; tonnage seal replacement | Online water-in-oil sensor; Karl-Fischer oil sample; visual decant",
                detection: 5,
                rpn: calculateRPN(8, 7, 5),
                actionPriority: calculateActionPriority(8, 7, 5),
              }
            ]
          },
          {
            id: 'comp-20',
            name: "MORGOIL oil system",
            fmeaRows: [
              {
                id: 'row-20',
                function: "Supply clean, filtered oil at correct pressure and temperature",
                failureMode: "Aluminum fines or scale ingress to bearing",
                effect: "Progressive sleeve wear; Early BUR bearing replacement; Rising bearing replacement cost",
                severity: 6,
                cause: "Filter bypass; kit changeout without filtering make-up oil",
                occurrence: 7,
                control: "DFE-rated filter elements; FSL offline filter skid; bulk-oil breather | ISO 4406 particle counter; filter ΔP",
                detection: 5,
                rpn: calculateRPN(6, 7, 5),
                actionPriority: calculateActionPriority(6, 7, 5),
              }
            ]
          },
          {
            id: 'comp-21',
            name: "Oil-film eccentricity compensation",
            fmeaRows: [
              {
                id: 'row-21',
                function: "Compensate oil-film thickness variation in AGC feed-forward",
                failureMode: "AGC feed-forward model diverges from bearing behavior",
                effect: "Gauge deviation; Off-gauge material; Coil downgrade",
                severity: 6,
                cause: "Model not re-calibrated after bearing change; temperature not accounted",
                occurrence: 4,
                control: "AGBG feed-forward recalibration procedure | Gauge trend vs setpoint; feed-forward error log",
                detection: 4,
                rpn: calculateRPN(6, 4, 4),
                actionPriority: calculateActionPriority(6, 4, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-12',
        name: "Reversing Mill – Housing",
        components: [
          {
            id: 'comp-22',
            name: "Mill housing liner",
            fmeaRows: [
              {
                id: 'row-22',
                function: "Maintain precise clearance between chock and housing window",
                failureMode: "Clearance increase &gt;spec",
                effect: "Roll shift under load; Strip tracking problems; flatness deviation; Quality downgrade; mistracking cobble risk",
                severity: 6,
                cause: "Tonnage-induced wear; lubrication film loss",
                occurrence: 5,
                control: "Liner lubrication program; wear measurement at outage | Four-corner clearance measurement",
                detection: 5,
                rpn: calculateRPN(6, 5, 5),
                actionPriority: calculateActionPriority(6, 5, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-13',
        name: "Reversing Mill – Chocks",
        components: [
          {
            id: 'comp-23',
            name: "WR chock rolling-element bearing",
            fmeaRows: [
              {
                id: 'row-23',
                function: "Support work roll at neck with low friction",
                failureMode: "Rolling-element spalling",
                effect: "Bearing vibration; Chatter mark transfer to strip; Coil surface defects; chatter investigation",
                severity: 7,
                cause: "Chocking/dechocking damage (documented chatter source); inadequate grease",
                occurrence: 6,
                control: "Bearing press alignment procedure; grease programs | Envelope/SPM HD vibration; temperature",
                detection: 4,
                rpn: calculateRPN(7, 6, 4),
                actionPriority: calculateActionPriority(7, 6, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-14',
        name: "Hydraulic Systems – AGC Servo Valve",
        components: [
          {
            id: 'comp-24',
            name: "AGC servo valve",
            fmeaRows: [
              {
                id: 'row-24',
                function: "Closed-loop control of HGC position for thickness regulation",
                failureMode: "Valve spool stick or null shift",
                effect: "Non-linear response; control oscillation; AGC loss of linearity; off-gauge strip; Off-gauge coil; customer claim",
                severity: 8,
                cause: "ISO cleanliness &gt;16/14/11; varnish formation; extended run without flushing",
                occurrence: 6,
                control: "ISO 16/14/11 cleanliness target; 2 µm pressure-line filter; monthly null-current trend | Null current trend (10 mA nominal ±1.5 mA); step-response test",
                detection: 4,
                rpn: calculateRPN(8, 6, 4),
                actionPriority: calculateActionPriority(8, 6, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-15',
        name: "Hydraulic Systems – HGC Capsule",
        components: [
          {
            id: 'comp-25',
            name: "HGC capsule seals",
            fmeaRows: [
              {
                id: 'row-25',
                function: "Contain hydraulic pressure while permitting position control",
                failureMode: "Piston-seal leak",
                effect: "Loss of gap position; leak masks in steady state; Gap drift under load; AGC compensation limit; Off-gauge material; stand shutdown",
                severity: 9,
                cause: "Tonnage beyond seal life; contamination wear",
                occurrence: 4,
                control: "Daily pressure-decay test; tonnage-based seal replacement | Pressure-decay test; position drift at hold",
                detection: 5,
                rpn: calculateRPN(9, 4, 5),
                actionPriority: calculateActionPriority(9, 4, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-16',
        name: "Hydraulic Systems – HGC Feedback",
        components: [
          {
            id: 'comp-26',
            name: "LVDT position transducer",
            fmeaRows: [
              {
                id: 'row-26',
                function: "Provide precise HGC capsule position feedback",
                failureMode: "LVDT zero-offset drift; mechanical damage",
                effect: "Incorrect position feedback; Gauge deviation not detected by AGC; Off-gauge coil",
                severity: 7,
                cause: "Single-LVDT (no redundancy); no calibration after roll change",
                occurrence: 5,
                control: "Dual-transducer voting; calibration at every roll change | LVDT voting deviation; zero drift log",
                detection: 5,
                rpn: calculateRPN(7, 5, 5),
                actionPriority: calculateActionPriority(7, 5, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-17',
        name: "Hydraulic Systems – HGC Safety",
        components: [
          {
            id: 'comp-27',
            name: "HGC overpressure vent",
            fmeaRows: [
              {
                id: 'row-27',
                function: "Safely vent HGC on mill-stop / strip-break event",
                failureMode: "Vent valve stick or interlock failure",
                effect: "Capsule retains full pressure post-stop; Potential damage to rolls / housing; Catastrophic energy release; safety event",
                severity: 10,
                cause: "Lack of SIL rating; interlock not periodically tested",
                occurrence: 2,
                control: "SIL-rated venting system; Safety PLC verification | Functional test; pressure telemetry post-event",
                detection: 6,
                rpn: calculateRPN(10, 2, 6),
                actionPriority: calculateActionPriority(10, 2, 6),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-18',
        name: "Hydraulic Systems – Bending Cylinder Feedback",
        components: [
          {
            id: 'comp-28',
            name: "Bending proportional valve feedback",
            fmeaRows: [
              {
                id: 'row-28',
                function: "Provide closed-loop feedback for roll-bending force",
                failureMode: "Wire fatigue or connector corrosion",
                effect: "Feedback drop-out; Profile/flatness deviation; Shape defect; coil downgrade",
                severity: 6,
                cause: "Connector IP &lt;66 in emulsion environment; no strain relief",
                occurrence: 5,
                control: "IP69K connectors; strain relief; redundant feedback | Feedback telemetry; shape meter feedback loop",
                detection: 5,
                rpn: calculateRPN(6, 5, 5),
                actionPriority: calculateActionPriority(6, 5, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-19',
        name: "Hydraulic Systems – HPU Pump",
        components: [
          {
            id: 'comp-29',
            name: "Main pressure pump (variable displacement)",
            fmeaRows: [
              {
                id: 'row-29',
                function: "Deliver hydraulic flow at required pressure to all consumers",
                failureMode: "Pump internal wear (valve plate, pistons)",
                effect: "Flow-at-zero-pressure falls; System pressure hunting; temperature rise; AGC oscillation; quality degradation",
                severity: 7,
                cause: "ISO cleanliness violation; low inlet head",
                occurrence: 6,
                control: "Bulk-oil filtration; particle-count monitoring | Flow-at-zero-pressure test; motor current at constant demand",
                detection: 4,
                rpn: calculateRPN(7, 6, 4),
                actionPriority: calculateActionPriority(7, 6, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-20',
        name: "Hydraulic Systems – HPU Filtration",
        components: [
          {
            id: 'comp-30',
            name: "Return-line filter",
            fmeaRows: [
              {
                id: 'row-30',
                function: "Capture contamination before tank return",
                failureMode: "Bypass valve open under ΔP",
                effect: "Unfiltered oil returned; System-wide contamination event affecting all downstream consumers; Rising AGC servo-valve null drift; multi-component risk",
                severity: 8,
                cause: "Change-out interval too long; contamination event",
                occurrence: 5,
                control: "ΔP transducer with CMMS alarm at 70% bypass pressure | ΔP online; particle count trend",
                detection: 4,
                rpn: calculateRPN(8, 5, 4),
                actionPriority: calculateActionPriority(8, 5, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-21',
        name: "Hydraulic Systems – HPU Accumulator",
        components: [
          {
            id: 'comp-31',
            name: "Bladder accumulator",
            fmeaRows: [
              {
                id: 'row-31',
                function: "Smooth pressure ripple and supply transient demand",
                failureMode: "Bladder rupture or pre-charge leak",
                effect: "Loss of pre-charge; Pressure ripple increase; dynamic response degraded; AGC response lag; coil quality impact",
                severity: 6,
                cause: "Pre-charge not verified; bladder age beyond life",
                occurrence: 6,
                control: "Monthly pre-charge check; life-cycle bladder replacement | Pre-charge pressure gauge; ripple signature",
                detection: 5,
                rpn: calculateRPN(6, 6, 5),
                actionPriority: calculateActionPriority(6, 6, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-22',
        name: "Hydraulic Systems – HPU Fluid",
        components: [
          {
            id: 'comp-32',
            name: "Hydraulic fluid (fire risk)",
            fmeaRows: [
              {
                id: 'row-32',
                function: "Transmit power and resist ignition near hot process",
                failureMode: "Spray-ignition fire",
                effect: "Spray fire; Mill area fire; Catastrophic — Novelis Oswego Sep-2025 and Nov-2025 pattern",
                severity: 10,
                cause: "Mineral oil in use instead of FR fluid; poor leak management",
                occurrence: 3,
                control: "HFC water-glycol or HFDU synthetic ester FR fluid; FM-6930 Group-1 | Heat detectors; flame/spark detectors in cellar",
                detection: 5,
                rpn: calculateRPN(10, 3, 5),
                actionPriority: calculateActionPriority(10, 3, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-23',
        name: "Finishing Tandem – Work Rolls F3-F4",
        components: [
          {
            id: 'comp-33',
            name: "Tandem finishing work roll",
            fmeaRows: [
              {
                id: 'row-33',
                function: "Deliver final gauge and surface for downstream cold mill",
                failureMode: "Aluminum adhesive wear + surface degradation",
                effect: "Rapid roll surface degradation; Shortened campaign; pickup transfer to strip; Frequent roll changes; quality constraint",
                severity: 7,
                cause: "Insufficient lubricant film strength; emulsion chemistry drift",
                occurrence: 7,
                control: "Tighter emulsion control; EP additive; work-roll brushes | Strip surface inspection; emulsion IR-FTIR",
                detection: 4,
                rpn: calculateRPN(7, 7, 4),
                actionPriority: calculateActionPriority(7, 7, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-24',
        name: "Finishing Tandem – Interstand Cooling",
        components: [
          {
            id: 'comp-34',
            name: "ISV cooling header",
            fmeaRows: [
              {
                id: 'row-34',
                function: "Deliver symmetric cooling between stands",
                failureMode: "Nozzle or zone flow imbalance",
                effect: "Zone flow deviation; Thermal crown mismatch; flatness excursion; Flatness defect; coil downgrade",
                severity: 7,
                cause: "Emulsion debris; no nozzle flow test",
                occurrence: 6,
                control: "Per-nozzle flow test; ISV valve exercise | Shape meter feedback; flow meter trend",
                detection: 4,
                rpn: calculateRPN(7, 6, 4),
                actionPriority: calculateActionPriority(7, 6, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-25',
        name: "Finishing Tandem – Looper",
        components: [
          {
            id: 'comp-35',
            name: "Looper or bridle roll",
            fmeaRows: [
              {
                id: 'row-35',
                function: "Control interstand tension",
                failureMode: "Looper position or tension deviation",
                effect: "Tension oscillation; Strip break or cobble risk; Cobble; mill damage potential",
                severity: 7,
                cause: "Lack of maintenance on looper bearing; worn sensor",
                occurrence: 5,
                control: "Looper bearing CBM; sensor redundancy | Position/force sensor trend",
                detection: 5,
                rpn: calculateRPN(7, 5, 5),
                actionPriority: calculateActionPriority(7, 5, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-26',
        name: "Finishing Tandem – Edge Drop Control",
        components: [
          {
            id: 'comp-36',
            name: "Inductive edge heater / HES",
            fmeaRows: [
              {
                id: 'row-36',
                function: "Control edge temperature and drop profile",
                failureMode: "Heater coil burn-out or emulsion fouling",
                effect: "Heater dropout; Wedge or edge-drop excursion; Trim scrap increase",
                severity: 5,
                cause: "Coil past end-of-life; emulsion tramp-oil chemistry",
                occurrence: 6,
                control: "Coil life tracking; emulsion chemistry monitoring | Thermal imaging; electrical parameters",
                detection: 5,
                rpn: calculateRPN(5, 6, 5),
                actionPriority: calculateActionPriority(5, 6, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-27',
        name: "Main Drive Line – Main Motor Stator",
        components: [
          {
            id: 'comp-37',
            name: "Stator winding insulation",
            fmeaRows: [
              {
                id: 'row-37',
                function: "Carry MV current to produce torque without insulation breakdown",
                failureMode: "Stator-to-ground or phase-to-phase fault",
                effect: "Dielectric failure; Motor trip; stand down; &gt;$1M motor cost + 2-4 weeks lost production",
                severity: 9,
                cause: "Thermal cycling above Class F/H limits; cooling water dirty; no PD monitoring",
                occurrence: 4,
                control: "Partial-discharge monitoring; tan-δ; offline HiPot; cooling water treatment | Online PD monitoring; annual HiPot",
                detection: 4,
                rpn: calculateRPN(9, 4, 4),
                actionPriority: calculateActionPriority(9, 4, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-28',
        name: "Main Drive Line – Main Motor Rotor",
        components: [
          {
            id: 'comp-38',
            name: "AC induction/synchronous rotor",
            fmeaRows: [
              {
                id: 'row-38',
                function: "Convert MV power to torque without rotor bar fatigue",
                failureMode: "Broken rotor bar",
                effect: "Local heating; current imbalance; Torque pulsation; eventual motor failure; Motor replacement; multi-week outage",
                severity: 8,
                cause: "High duty cycle; starting current repeated; pole-face stress",
                occurrence: 3,
                control: "Soft-start; duty-cycle review; rotor monitoring | Motor Current Signature Analysis (MCSA) at slip sidebands",
                detection: 4,
                rpn: calculateRPN(8, 3, 4),
                actionPriority: calculateActionPriority(8, 3, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-29',
        name: "Main Drive Line – Main Motor Bearings",
        components: [
          {
            id: 'comp-39',
            name: "DE/NDE motor bearings",
            fmeaRows: [
              {
                id: 'row-39',
                function: "Support motor rotor with low friction",
                failureMode: "Outer/inner race spalling",
                effect: "Bearing spalling; Vibration rise; motor damage; Motor replacement; long lead time",
                severity: 8,
                cause: "VFD common-mode voltage (no shaft grounding); lubrication regime",
                occurrence: 5,
                control: "Shaft grounding ring; insulated NDE bearing; lubrication program | SPM HD at 32 kHz; shaft voltage monitoring; thermography",
                detection: 3,
                rpn: calculateRPN(8, 5, 3),
                actionPriority: calculateActionPriority(8, 5, 3),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-30',
        name: "Main Drive Line – Main Motor Cooler",
        components: [
          {
            id: 'comp-40',
            name: "Air-to-water heat exchanger",
            fmeaRows: [
              {
                id: 'row-40',
                function: "Remove motor heat to maintain winding temperature",
                failureMode: "Reduced heat transfer",
                effect: "Motor temperature rise; Motor derate or trip; Reduced mill speed",
                severity: 5,
                cause: "Water treatment program; lack of cleaning cycle",
                occurrence: 7,
                control: "Water treatment; air filter program | ΔT trending across cooler",
                detection: 3,
                rpn: calculateRPN(5, 7, 3),
                actionPriority: calculateActionPriority(5, 7, 3),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-31',
        name: "Main Drive Line – Gearbox Gearing",
        components: [
          {
            id: 'comp-41',
            name: "Pinion/gear tooth flank",
            fmeaRows: [
              {
                id: 'row-41',
                function: "Transmit torque between motor and mill without tooth damage",
                failureMode: "Pitting / micropitting of tooth flanks",
                effect: "Surface damage; vibration rise; Gear-mesh frequency amplitude increase; Gearbox replacement; 6-18 month lead time",
                severity: 8,
                cause: "Incorrect oil viscosity grade; high water content; additive depletion",
                occurrence: 5,
                control: "Oil analysis program (Fe, Cu, Mn, PQ index); correct ISO VG grade | Oil analysis; vibration at gear-mesh + sidebands",
                detection: 4,
                rpn: calculateRPN(8, 5, 4),
                actionPriority: calculateActionPriority(8, 5, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-32',
        name: "Main Drive Line – Gearbox Shaft",
        components: [
          {
            id: 'comp-42',
            name: "Output shaft",
            fmeaRows: [
              {
                id: 'row-42',
                function: "Transmit torque to pinion stand",
                failureMode: "Torsional fatigue fracture",
                effect: "Shaft fracture; Complete drive loss; Multi-week outage; major repair",
                severity: 9,
                cause: "Acceleration above optimum; drive-train backlash accumulation",
                occurrence: 2,
                control: "Acceleration control (1.20 rot/s²); torque telemetry; backlash diagnostics | Torque signature from motor current; strain-gauge telemetry (rare)",
                detection: 7,
                rpn: calculateRPN(9, 2, 7),
                actionPriority: calculateActionPriority(9, 2, 7),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-33',
        name: "Main Drive Line – Universal Spindle",
        components: [
          {
            id: 'comp-43',
            name: "Cross bearing (universal spindle)",
            fmeaRows: [
              {
                id: 'row-43',
                function: "Accommodate angular misalignment while transmitting torque",
                failureMode: "Roller corrosion and fracture; seal failure",
                effect: "Bearing seizure; Spindle lockup; drive-train damage; Documented: life reduced from 12 to 6 months (TATA Steel)",
                severity: 9,
                cause: "Seal wear; water/emulsion pressure against seal",
                occurrence: 5,
                control: "Seal inspection every roll change; oil moisture sensor; calendar/tonnage replacement | Oil analysis; vibration; torque signature",
                detection: 6,
                rpn: calculateRPN(9, 5, 6),
                actionPriority: calculateActionPriority(9, 5, 6),
              }
            ]
          },
          {
            id: 'comp-44',
            name: "Slipper pad (legacy)",
            fmeaRows: [
              {
                id: 'row-44',
                function: "Transmit torque with sliding contact",
                failureMode: "Adhesive wear and pitting",
                effect: "Pad loss; Torque transmission irregularity; Spindle replacement; secondary roll-chock damage",
                severity: 8,
                cause: "Angle &gt;3°; grease regime",
                occurrence: 6,
                control: "Angle spec compliance; grease program | Torque telemetry; pad inspection",
                detection: 5,
                rpn: calculateRPN(8, 6, 5),
                actionPriority: calculateActionPriority(8, 6, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-34',
        name: "Main Drive Line – Pinion Stand",
        components: [
          {
            id: 'comp-45',
            name: "Pinion-stand gear tooth",
            fmeaRows: [
              {
                id: 'row-45',
                function: "Split motor torque between top and bottom work rolls",
                failureMode: "Tooth pitting, spalling, or fracture",
                effect: "Tooth damage; Torque imbalance between rolls; Pinion replacement",
                severity: 8,
                cause: "Oil additive depletion; misalignment",
                occurrence: 4,
                control: "Alignment; oil analysis | Gear-mesh vibration sidebands; oil analysis",
                detection: 4,
                rpn: calculateRPN(8, 4, 4),
                actionPriority: calculateActionPriority(8, 4, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-35',
        name: "Main Drive Line – Couplings",
        components: [
          {
            id: 'comp-46',
            name: "Motor-end coupling",
            fmeaRows: [
              {
                id: 'row-46',
                function: "Connect motor to gearbox with alignment tolerance",
                failureMode: "Parallel or angular misalignment",
                effect: "Vibration rise; Bearing life reduction; Collateral bearing damage",
                severity: 6,
                cause: "No laser alignment; thermal offset not applied",
                occurrence: 6,
                control: "Laser alignment; thermal growth compensation | Vibration 1x/2x; thermography",
                detection: 4,
                rpn: calculateRPN(6, 6, 4),
                actionPriority: calculateActionPriority(6, 6, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-36',
        name: "Main Drive Line – Drive Train Dynamics",
        components: [
          {
            id: 'comp-47',
            name: "Drive-train torsional mode",
            fmeaRows: [
              {
                id: 'row-47',
                function: "Transmit torque without resonance at rolling speed",
                failureMode: "Torsional vibration at 10-30 Hz mode",
                effect: "Torque oscillation; Gear fatigue; spindle loading; TAF amplification; Accelerated wear of drive-train",
                severity: 7,
                cause: "Drive acceleration not optimized; backlash accumulated",
                occurrence: 6,
                control: "DC-drive acceleration at 1.20 rot/s²; MAGIC framework signal-based agents | Motor current torque signature; strain telemetry",
                detection: 5,
                rpn: calculateRPN(7, 6, 5),
                actionPriority: calculateActionPriority(7, 6, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-37',
        name: "Downcoiler – Mandrel",
        components: [
          {
            id: 'comp-48',
            name: "Mandrel expansion segments",
            fmeaRows: [
              {
                id: 'row-48',
                function: "Grip coil inner diameter and transmit coiling torque",
                failureMode: "Mechanical fatigue and collapse",
                effect: "Mandrel deformation; Cannot coil; strip jam; Mandrel replacement; long outage",
                severity: 9,
                cause: "Tonnage beyond fatigue life; inadequate NDT",
                occurrence: 2,
                control: "Tonnage tracking; NDT of segments; MPI | NDT; expansion pressure anomaly",
                detection: 7,
                rpn: calculateRPN(9, 2, 7),
                actionPriority: calculateActionPriority(9, 2, 7),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-38',
        name: "Downcoiler – Wrapper Rolls",
        components: [
          {
            id: 'comp-49',
            name: "Wrapper roll bearing",
            fmeaRows: [
              {
                id: 'row-49',
                function: "Wrap first wrap onto mandrel cleanly",
                failureMode: "Rolling element fatigue",
                effect: "Vibration rise; First-wrap surface mark; bearing seizure; Downcoiler stop; coil quality issue",
                severity: 7,
                cause: "Limited accessibility in legacy design; grease regime",
                occurrence: 6,
                control: "Easy-to-Maintain concept design; CBM | Envelope/SPM HD; thermography",
                detection: 4,
                rpn: calculateRPN(7, 6, 4),
                actionPriority: calculateActionPriority(7, 6, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-39',
        name: "Downcoiler – Automatic Step Control",
        components: [
          {
            id: 'comp-50',
            name: "ASC system",
            fmeaRows: [
              {
                id: 'row-50',
                function: "Eliminate first-wrap step at mandrel",
                failureMode: "First-wrap surface mark transferred through coil",
                effect: "Step at first wrap; Surface defect propagates through coil; Coil downgrade on whole coil",
                severity: 6,
                cause: "Sensor fault; PLC timing drift; actuator wear",
                occurrence: 5,
                control: "Sensor verification; PLC sync check | Post-coil inspection; ASC timing log",
                detection: 5,
                rpn: calculateRPN(6, 5, 5),
                actionPriority: calculateActionPriority(6, 5, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-40',
        name: "Downcoiler – Pinch Rolls",
        components: [
          {
            id: 'comp-51',
            name: "Coiler pinch roll surface",
            fmeaRows: [
              {
                id: 'row-51',
                function: "Feed strip into mandrel without surface mark",
                failureMode: "Chatter marks or pickup transferred to strip",
                effect: "Roll surface degradation; Chatter/pickup marks on coil; Coil downgrade",
                severity: 6,
                cause: "Lack of grind schedule; emulsion residue",
                occurrence: 6,
                control: "Pinch-roll grind schedule; cleaning | Post-coil inspection",
                detection: 5,
                rpn: calculateRPN(6, 6, 5),
                actionPriority: calculateActionPriority(6, 6, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-41',
        name: "Downcoiler – Coil Handling",
        components: [
          {
            id: 'comp-52',
            name: "Hot coil post-coiling",
            fmeaRows: [
              {
                id: 'row-52',
                function: "Maintain coil integrity during cooling and transport",
                failureMode: "Gravity-induced sag of hot soft coil",
                effect: "Coil deformation; Coil quality loss; Coil downgrade or scrap",
                severity: 6,
                cause: "Transport before temperature drops; insufficient saddle",
                occurrence: 6,
                control: "Cooling time before handling; saddle design | Coil-geometry scanning post-cool",
                detection: 6,
                rpn: calculateRPN(6, 6, 6),
                actionPriority: calculateActionPriority(6, 6, 6),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-42',
        name: "Shears – Crop Shear",
        components: [
          {
            id: 'comp-53',
            name: "Crop shear blade",
            fmeaRows: [
              {
                id: 'row-53',
                function: "Crop head and tail squarely",
                failureMode: "Cutting edge wear or chip",
                effect: "Poor cut quality; burr; Cobble risk at finishing mill entry; Cobble event",
                severity: 7,
                cause: "Tonnage tracking; material hardness variation",
                occurrence: 7,
                control: "Blade inspection every roll change; tonnage tracking | Cut-quality camera; post-shear visual",
                detection: 4,
                rpn: calculateRPN(7, 7, 4),
                actionPriority: calculateActionPriority(7, 7, 4),
              }
            ]
          },
          {
            id: 'comp-54',
            name: "Flywheel clutch/brake",
            fmeaRows: [
              {
                id: 'row-54',
                function: "Rapidly engage/release drum drive for timed cut",
                failureMode: "Pneumatic clutch/brake slip or fail-to-release",
                effect: "Timing error; Mis-timed cut; cobble; Cobble at finishing stand threading",
                severity: 6,
                cause: "Cycle-count beyond rated life",
                occurrence: 6,
                control: "Cycle-count tracking; friction material change | Engagement time trending",
                detection: 5,
                rpn: calculateRPN(6, 6, 5),
                actionPriority: calculateActionPriority(6, 6, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-43',
        name: "Shears – Side Trimmer",
        components: [
          {
            id: 'comp-55',
            name: "Side trimmer knife",
            fmeaRows: [
              {
                id: 'row-55',
                function: "Trim strip edge to width",
                failureMode: "Knife wear producing burr",
                effect: "Edge burr; Coil edge quality; fire risk on downstream cold mill; Coil downgrade; cold-mill fire incident potential",
                severity: 7,
                cause: "Knife past life; alignment drift",
                occurrence: 6,
                control: "Knife life tracking; alignment | Edge-quality inspection",
                detection: 5,
                rpn: calculateRPN(7, 6, 5),
                actionPriority: calculateActionPriority(7, 6, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-44',
        name: "Emulsion System – Emulsion Chemistry",
        components: [
          {
            id: 'comp-56',
            name: "Rolling emulsion",
            fmeaRows: [
              {
                id: 'row-56',
                function: "Lubricate, cool, and flush roll bite",
                failureMode: "Phase separation",
                effect: "Free oil on surface; cloudiness; Lubrication loss; surface defects (streaks, brown stains after anneal); Widespread surface quality issue",
                severity: 7,
                cause: "Poor make-up water quality; hydraulic oil ingress; biocide lapse",
                occurrence: 6,
                control: "Daily concentration, conductivity, pH, droplet size, free-oil kinematic viscosity; biocide dosing | IR-FTIR; droplet size; dip-slide microbial count",
                detection: 5,
                rpn: calculateRPN(7, 6, 5),
                actionPriority: calculateActionPriority(7, 6, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-45',
        name: "Emulsion System – Spray Headers",
        components: [
          {
            id: 'comp-57',
            name: "Emulsion spray nozzle",
            fmeaRows: [
              {
                id: 'row-57',
                function: "Deliver emulsion at specified flow and pattern",
                failureMode: "Partial or full blockage",
                effect: "Zone flow drop; Uneven cooling; thermal crown mismatch; flatness excursion; Flatness defect; strip bend",
                severity: 6,
                cause: "Filtration upstream; emulsion debris loading",
                occurrence: 7,
                control: "Magnetic separator + cyclone + plate filter; nozzle CV test | Individual nozzle flow test; shape meter feedback",
                detection: 4,
                rpn: calculateRPN(6, 7, 4),
                actionPriority: calculateActionPriority(6, 7, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-46',
        name: "Emulsion System – Filtration",
        components: [
          {
            id: 'comp-58',
            name: "Plate filter / Schneider",
            fmeaRows: [
              {
                id: 'row-58',
                function: "Remove aluminum fines and particulates from emulsion",
                failureMode: "Media fatigue allowing bypass",
                effect: "Debris in clean loop; Downstream bearing damage; nozzle clog; Multi-component wear event",
                severity: 7,
                cause: "ΔP cycles; media replacement schedule",
                occurrence: 4,
                control: "ΔP monitoring; element change schedule | ΔP online; downstream particle count",
                detection: 4,
                rpn: calculateRPN(7, 4, 4),
                actionPriority: calculateActionPriority(7, 4, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-47',
        name: "Emulsion System – Contamination",
        components: [
          {
            id: 'comp-59',
            name: "Tramp-oil removal (centrifuge)",
            fmeaRows: [
              {
                id: 'row-59',
                function: "Remove tramp hydraulic/lube oil from emulsion",
                failureMode: "Tramp oil accumulation",
                effect: "Emulsion free-oil rising; Emulsion instability; fire risk; Reformulation and fire risk exposure",
                severity: 7,
                cause: "Upstream leak rate exceeds centrifuge capacity",
                occurrence: 6,
                control: "Upstream leak reduction; centrifuge capacity audit | IR-FTIR free-oil; centrifuge throughput log",
                detection: 4,
                rpn: calculateRPN(7, 6, 4),
                actionPriority: calculateActionPriority(7, 6, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-48',
        name: "Emulsion System – Fire Prevention",
        components: [
          {
            id: 'comp-60',
            name: "Emulsion fume extraction (OPTIPURE/Vapor Shield)",
            fmeaRows: [
              {
                id: 'row-60',
                function: "Remove oily vapor before ignition source reaches it",
                failureMode: "Oily vapor accumulation in mill housing area",
                effect: "Vapor cloud; Ignition potential from strip-break, motor arc, or hot surface; CATASTROPHIC — Novelis Oswego pattern",
                severity: 10,
                cause: "Extractor fan failure; duct fouling; fire suppression design gap",
                occurrence: 3,
                control: "OPTIPURE / Vapor Shield extraction; FR hydraulic fluid; automatic low-pressure CO2 + foam-water deluge per AXA XL PRC-17.13.1 | Duct flow; combustible gas; heat/flame detectors",
                detection: 5,
                rpn: calculateRPN(10, 3, 5),
                actionPriority: calculateActionPriority(10, 3, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-49',
        name: "Emulsion System – Microbial Control",
        components: [
          {
            id: 'comp-61',
            name: "Biocide program",
            fmeaRows: [
              {
                id: 'row-61',
                function: "Control microbial growth in emulsion",
                failureMode: "Bacterial/fungal colonization",
                effect: "Foul odor; pH drop; Emulsion failure; Reformulation; skin exposure risk",
                severity: 4,
                cause: "Biocide dosing lapse; pH drift",
                occurrence: 7,
                control: "Scheduled biocide; pH control | Dip-slide counts; pH trend",
                detection: 6,
                rpn: calculateRPN(4, 7, 6),
                actionPriority: calculateActionPriority(4, 7, 6),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-50',
        name: "Automation – Thickness Gauge",
        components: [
          {
            id: 'comp-62',
            name: "X-ray gauge RM 215 HM",
            fmeaRows: [
              {
                id: 'row-62',
                function: "Provide feedback for AGC on strip thickness",
                failureMode: "Detector cooling loss; ion-chamber degradation",
                effect: "Reading drift; AGC feeds error into gauge control; Off-gauge coil",
                severity: 7,
                cause: "Daily standardization lapse; replacement schedule not followed",
                occurrence: 5,
                control: "Daily standardization; cooling system PM | Standardization trend; source vs detector ratio",
                detection: 4,
                rpn: calculateRPN(7, 5, 4),
                actionPriority: calculateActionPriority(7, 5, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-51',
        name: "Automation – Profile Gauge",
        components: [
          {
            id: 'comp-63',
            name: "SIPRO simultaneous profile gauge",
            fmeaRows: [
              {
                id: 'row-63',
                function: "Measure full-width strip profile",
                failureMode: "Mechanical vibration; water-jacket leak",
                effect: "Profile measurement noise; Profile control degraded; Profile quality issue",
                severity: 7,
                cause: "Water cooling maintenance; vibration isolation",
                occurrence: 5,
                control: "Water-jacket inspection; vibration isolation | Self-diagnostics; calibration check",
                detection: 4,
                rpn: calculateRPN(7, 5, 4),
                actionPriority: calculateActionPriority(7, 5, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-52',
        name: "Automation – Shape Meter",
        components: [
          {
            id: 'comp-64',
            name: "ABSM flatness measurement roll",
            fmeaRows: [
              {
                id: 'row-64',
                function: "Measure strip flatness across width",
                failureMode: "Air bearing seizure or sensor wire break",
                effect: "Sensor channel loss; Flatness measurement gap; Flatness control degraded",
                severity: 6,
                cause: "Air filter maintenance; wiring harness fatigue",
                occurrence: 5,
                control: "Air supply filtration; wiring harness maintenance | Channel diagnostic; zero-cross trend",
                detection: 5,
                rpn: calculateRPN(6, 5, 5),
                actionPriority: calculateActionPriority(6, 5, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-53',
        name: "Automation – Pyrometer",
        components: [
          {
            id: 'comp-65',
            name: "Multi-wavelength pyrometer (MWx/SPOT AL)",
            fmeaRows: [
              {
                id: 'row-65',
                function: "Measure strip exit temperature",
                failureMode: "Emissivity compensation error; sight-tube fouling",
                effect: "Temperature reading bias; L2 pass schedule error; Quality excursion",
                severity: 7,
                cause: "Aluminum&apos;s variable emissivity; inadequate sight path purge",
                occurrence: 6,
                control: "Sight-tube air purge; seasonal calibration with contact TC | Cross-check against contact TC; pyrometer self-diagnostic",
                detection: 4,
                rpn: calculateRPN(7, 6, 4),
                actionPriority: calculateActionPriority(7, 6, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-54',
        name: "Automation – Width Measurement",
        components: [
          {
            id: 'comp-66',
            name: "CCD/laser width gauge",
            fmeaRows: [
              {
                id: 'row-66',
                function: "Measure strip width continuously",
                failureMode: "Measurement drift",
                effect: "Width reading error; Width control degraded; Trim scrap",
                severity: 5,
                cause: "No air purge; lens cleaning lapse",
                occurrence: 6,
                control: "Air-purge cleaning; calibration schedule | Standard-piece calibration",
                detection: 5,
                rpn: calculateRPN(5, 6, 5),
                actionPriority: calculateActionPriority(5, 6, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-55',
        name: "Automation – L2 Setup",
        components: [
          {
            id: 'comp-67',
            name: "Pass Schedule Calculation (X-Pact PSC)",
            fmeaRows: [
              {
                id: 'row-67',
                function: "Calculate optimal pass schedule for alloy/gauge",
                failureMode: "Incorrect pass schedule",
                effect: "Setup error; Force/torque excursion; roll wear imbalance; Off-spec coil or cobble",
                severity: 6,
                cause: "Change management gap; no adaptive learning",
                occurrence: 4,
                control: "Model change management; adaptive learning | Force/torque vs predicted trend",
                detection: 5,
                rpn: calculateRPN(6, 4, 5),
                actionPriority: calculateActionPriority(6, 4, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-56',
        name: "Automation – Surface Inspection",
        components: [
          {
            id: 'comp-68',
            name: "Strip surface inspection system",
            fmeaRows: [
              {
                id: 'row-68',
                function: "Detect and classify surface defects",
                failureMode: "Lens fouling, LED bar drift",
                effect: "Defect missed or misclassified; Quality escape; Customer claim",
                severity: 6,
                cause: "Cleaning schedule lapse",
                occurrence: 5,
                control: "Cleaning schedule; LED intensity monitoring | System self-diagnostics",
                detection: 5,
                rpn: calculateRPN(6, 5, 5),
                actionPriority: calculateActionPriority(6, 5, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-57',
        name: "Electrical – MV Transformer",
        components: [
          {
            id: 'comp-69',
            name: "Main substation transformer",
            fmeaRows: [
              {
                id: 'row-69',
                function: "Step down utility MV to plant MV",
                failureMode: "Winding-to-ground fault",
                effect: "Dielectric failure; Plant loss of power; Mill blackout; long restart",
                severity: 9,
                cause: "DGA program gap; tap-changer maintenance schedule",
                occurrence: 2,
                control: "DGA monitoring; annual bushing test; tap-changer overhaul | Dissolved Gas Analysis; sweep frequency response; PD",
                detection: 3,
                rpn: calculateRPN(9, 2, 3),
                actionPriority: calculateActionPriority(9, 2, 3),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-58',
        name: "Electrical – VFD",
        components: [
          {
            id: 'comp-70',
            name: "SINAMICS SL150 cycloconverter",
            fmeaRows: [
              {
                id: 'row-70',
                function: "Drive main mill motor with variable speed",
                failureMode: "Power electronic component failure",
                effect: "Drive trip; Mill stop; Production loss; restart time",
                severity: 8,
                cause: "Cooling fan maintenance; capacitor life",
                occurrence: 5,
                control: "Cooling fan program; capacitor replacement schedule | Drive diagnostics; thermography",
                detection: 4,
                rpn: calculateRPN(8, 5, 4),
                actionPriority: calculateActionPriority(8, 5, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-59',
        name: "Roll Shop – Grinder",
        components: [
          {
            id: 'comp-71',
            name: "Roll grinder wheel",
            fmeaRows: [
              {
                id: 'row-71',
                function: "Grind roll to specified surface and geometry",
                failureMode: "Wheel vibration transfers to roll surface",
                effect: "Roll surface chatter (1st, 3rd, 5th octave); Chatter marks transferred to strip; Mill quality issue (documented 7% production impact)",
                severity: 7,
                cause: "Wheel not dynamically balanced; vibration isolation inadequate",
                occurrence: 6,
                control: "In-machine dynamic balance; GrinderMon vibration monitoring | Real-time wheel vibration; roll replica tape",
                detection: 5,
                rpn: calculateRPN(7, 6, 5),
                actionPriority: calculateActionPriority(7, 6, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-60',
        name: "Roll Shop – NDT",
        components: [
          {
            id: 'comp-72',
            name: "UT / eddy-current roll inspection",
            fmeaRows: [
              {
                id: 'row-72',
                function: "Detect surface and subsurface defects before remount",
                failureMode: "Subsurface crack not detected",
                effect: "Defective roll mounted; In-service spalling; Catastrophic roll failure in stand",
                severity: 9,
                cause: "Calibration block program; 2-inspector rule",
                occurrence: 3,
                control: "Calibration blocks; automated scanning; 2-inspector rule | Calibration check; procedure audit",
                detection: 5,
                rpn: calculateRPN(9, 3, 5),
                actionPriority: calculateActionPriority(9, 3, 5),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-61',
        name: "Safety – Fire Suppression",
        components: [
          {
            id: 'comp-73',
            name: "CO2 + foam-water deluge",
            fmeaRows: [
              {
                id: 'row-73',
                function: "Suppress oil-spray fire",
                failureMode: "Delayed or insufficient discharge",
                effect: "Fire escalation; Multi-zone fire; CATASTROPHIC — Novelis Oswego pattern reference",
                severity: 10,
                cause: "Detector placement; suppression sizing; fuel cut-off interlock",
                occurrence: 2,
                control: "Quarterly functional test; CO2 storage sized for ≥2 discharges; heat-actuated pump interlocks | Heat/flame detectors; system diagnostic",
                detection: 4,
                rpn: calculateRPN(10, 2, 4),
                actionPriority: calculateActionPriority(10, 2, 4),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-62',
        name: "Safety – Emergency Stop",
        components: [
          {
            id: 'comp-74',
            name: "E-stop loop",
            fmeaRows: [
              {
                id: 'row-74',
                function: "Enable personnel to stop mill from any position",
                failureMode: "Button stuck or loop break",
                effect: "E-stop ineffective in zone; Personnel at risk in dead zone; Safety event potential",
                severity: 9,
                cause: "No routine functional test",
                occurrence: 3,
                control: "Monthly functional test; coverage map | Functional test; SIL diagnostics",
                detection: 3,
                rpn: calculateRPN(9, 3, 3),
                actionPriority: calculateActionPriority(9, 3, 3),
              }
            ]
          }
        ]
      },
      {
        id: 'sub-63',
        name: "Safety – Cellar Gas Detection",
        components: [
          {
            id: 'comp-75',
            name: "Combustible / CO / O2 monitor",
            fmeaRows: [
              {
                id: 'row-75',
                function: "Detect hazardous atmospheres before entry",
                failureMode: "Sensor ageing; calibration drift",
                effect: "False negative; Personnel enter unsafe atmosphere; Safety event",
                severity: 9,
                cause: "Calibration schedule gap",
                occurrence: 4,
                control: "Monthly calibration; bump test | Bump test; fixed vs portable verification",
                detection: 3,
                rpn: calculateRPN(9, 4, 3),
                actionPriority: calculateActionPriority(9, 4, 3),
              }
            ]
          }
        ]
      }
    ]
  }
];

interface FMEAContextType {
  systems: SystemData[];
  selectedComponentId: string | null;
  selectedRowId: string | null;
  editingRowId: string | null;
  setSelectedComponentId: (id: string | null) => void;
  setSelectedRowId: (id: string | null) => void;
  setEditingRowId: (id: string | null) => void;
  updateFMEARow: (componentId: string, rowId: string, updatedData: Partial<FMEARowData>) => void;
  addFMEARow: (componentId: string, rowData: Omit<FMEARowData, 'id' | 'rpn' | 'actionPriority'>) => void;
}

const FMEAContext = createContext<FMEAContextType | undefined>(undefined);

export const FMEAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systems, setSystems] = useState<SystemData[]>(initialSystems);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const updateFMEARow = (componentId: string, rowId: string, updatedData: Partial<FMEARowData>) => {
    setSystems(prevSystems => {
      const newSystems = JSON.parse(JSON.stringify(prevSystems)); // Deep copy for simplicity
      for (const sys of newSystems) {
        for (const sub of sys.subsystems) {
          for (const comp of sub.components) {
            if (comp.id === componentId) {
              const rowIndex = comp.fmeaRows.findIndex((r: any) => r.id === rowId);
              if (rowIndex > -1) {
                const row = comp.fmeaRows[rowIndex];
                const updatedRow = { ...row, ...updatedData };
                
                // Recalculate RPN and AP if relevant fields changed
                if (updatedData.severity !== undefined || updatedData.occurrence !== undefined || updatedData.detection !== undefined) {
                  updatedRow.rpn = calculateRPN(updatedRow.severity, updatedRow.occurrence, updatedRow.detection);
                  updatedRow.actionPriority = calculateActionPriority(updatedRow.severity, updatedRow.occurrence, updatedRow.detection);
                }
                
                comp.fmeaRows[rowIndex] = updatedRow;
              }
            }
          }
        }
      }
      return newSystems;
    });
  };

  const addFMEARow = (componentId: string, rowData: Omit<FMEARowData, 'id' | 'rpn' | 'actionPriority'>) => {
    setSystems(prevSystems => {
      const newSystems = JSON.parse(JSON.stringify(prevSystems));
      for (const sys of newSystems) {
        for (const sub of sys.subsystems) {
          for (const comp of sub.components) {
            if (comp.id === componentId) {
              const newRow: FMEARowData = {
                ...rowData,
                id: `row-${Date.now()}`,
                rpn: calculateRPN(rowData.severity, rowData.occurrence, rowData.detection),
                actionPriority: calculateActionPriority(rowData.severity, rowData.occurrence, rowData.detection),
              };
              comp.fmeaRows.push(newRow);
            }
          }
        }
      }
      return newSystems;
    });
  };

  return (
    <FMEAContext.Provider value={{
      systems,
      selectedComponentId,
      selectedRowId,
      editingRowId,
      setSelectedComponentId,
      setSelectedRowId,
      setEditingRowId,
      updateFMEARow,
      addFMEARow
    }}>
      {children}
    </FMEAContext.Provider>
  );
};

export const useFMEA = () => {
  const context = useContext(FMEAContext);
  if (context === undefined) {
    throw new Error('useFMEA must be used within a FMEAProvider');
  }
  return context;
};
