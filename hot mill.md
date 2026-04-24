# Equipment / Maintenance FMEA Knowledge Base — Aluminum Hot Rolling Mill

**Scope:** Hybrid Equipment + Process + Maintenance FMEA structured for AIAG‑VDA-aligned database ingestion. Audience: Reliability team at an aluminum rolling plant. Taxonomy is ISO 14224-compatible (Plant → System → Sub-system → Equipment Unit → Sub-unit → Component → Part) with Function / Functional Failure / Failure Mode / Mechanism / Effects / Controls / Actions fields for every line. Aluminum-specific considerations (300–500 °C rolling temperature, neat-oil vs emulsion lubrication, surface-criticality, alloy-specific tribology) are embedded throughout rather than treated as a footnote.

---

## 1. Framing and Rating Anchors

### 1.1 Aluminum vs. Steel Hot Rolling — FMEA-relevant deltas

Aluminum hot rolling occurs at approximately **300–500 °C** versus **800–1200 °C** for steel, which fundamentally changes the failure physics: work rolls experience lower thermal shock but higher adhesive-wear (pickup) risk; "fire cracks" of the classical steel-mill type are rare, but aluminum oxide smearing and roll coating degradation dominate surface failure modes; emulsion lubrication is mandatory for tribology rather than optional for cooling; and strip surface is the governing quality constraint for can‑stock, auto body sheet (ABS) and lithographic sheet customers [Source: [Innoval – Hot rolling emulsion monitoring](https://www.innovaltec.com/hot-rolling-emulsion-blog/)] [Source: [Alureport – Hot rolling emulsion](https://alureport.com/en/issues/issue-01-24/article/hot-rolling-emulsion)] [Source: [Williamson IR – Aluminum rolling](https://www.williamsonir.com/aluminum/aluminum-rolling-mills/)].

Aluminum hot mills use **oil-in-water emulsions, typically <10% oil phase**, performing three simultaneous duties: (a) lubrication of the roll/strip interface, (b) cooling of work rolls (which absorb roll-bite heat), and (c) flushing of aluminum fines, oxide debris and abrasion products to filtration. Cold and foil mills, in contrast, use neat oil (>90% oil base) [Source: [ResearchGate – Aluminum rolling lubrication](https://www.researchgate.net/publication/290058611_Aluminum_rolling_lubrication)]. Emulsion stability, soap content and additive polarity drive both product surface quality (streaks, stains, sintering marks on annealing) and equipment reliability (emulsion nozzle fouling, filter loading, bacterial growth, oil consumption). Innoval specifically flags monitoring of droplet size, viscosity, ester/acid balance, and free-oil kinetic viscosity as the operational control levers [Source: [Innoval – Aluminium rolling lubrication pt 1](https://www.innovaltec.com/aluminium-rolling-lubrication-blog/)].

Alloy-family considerations that must be reflected in the FMEA:
- **3xxx (can-body, 3003/3104):** high adhesion to work rolls; pick-up and roll-coating growth are dominant surface-defect drivers.
- **5xxx (5052/5083/5182 – can end, marine, auto inner):** higher Mg content increases work-hardening and can drive edge-crack formation and strain localization; hydrogen entrainment and subsurface blistering concerns from water-cooled roll contact are documented [Source: [MDPI – Hydrogen embrittlement precipitation-hardenable Al](https://www.mdpi.com/2075-4701/14/11/1287)].
- **6xxx (6016/6111 – auto outer):** surface appearance and isotropic roughness are critical; hot mill exit temperature and flatness drive subsequent ABS quality.
- **8xxx (foil stock, 8011/8079):** thinnest gauges; flatness and pinhole-free surface dominate — hot mill feeds ultra-demanding downstream cold/foil mills.

Hydrogen embrittlement risk in 5xxx and 7xxx alloys is real: water-cooled rolls and pickling introduce atomic hydrogen which becomes trapped at grain boundaries, Al₃Zr dispersoids, and (Mg,Zn)-rich precipitates, reducing ductility [Source: [PMC – Hydrogen trapping and embrittlement in high-strength Al alloys](https://pmc.ncbi.nlm.nih.gov/articles/PMC8850197/)]. Failure modes such as "blistering on anneal" and "ductility loss after cold-follow-up" must therefore be linked back to hot mill emulsion/water balance in the FMEA.

### 1.2 Aluminum Hot Mill Configurations (defines FMEA scope envelope)

The reference line assumed for this FMEA is the industry-standard 1+4 (one reversing breakdown + four tandem finishing stands) configuration, which SMS, Primetals, and Achenbach all offer; single-stand reversing + twin-coiler (Steckel-style) and 1+N variants are also covered in scope. Capacity ranges typically span **100,000 to 1,000,000 t/y**, with Alunorf (Novelis/Hydro JV) at approximately **1.5–1.6 Mt/y** being the worldwide benchmark [Source: [SMS group – Hot rolling mills for aluminum](https://www.sms-group.com/plants/hot-rolling-mills-for-aluminum)] [Source: [Primetals – Aluminum hot rolling mill](https://www.primetals.com/portfolio/non-ferrous-rolling/aluminum-hot-rolling-mill)] [Source: [SMS – Alunorf Hot Rolling Mill 1 revamp](https://www.sms-group.com/insights/all-insights/succesful-modernization-of-alunorfs-hot-rolling-mill-1)] [Source: [AlCircle – Top five aluminium rolling mills](https://www.alcircle.com/news/top-five-aluminium-rolling-mills-in-the-world-45878)]. Achenbach's OPTIMILL and OPTIROLL portfolios, SMS's CVC®plus technology, SMS SIEFLEX®-HT spindles, and Primetals' MORGOIL® KLX bearings define the typical mechanical/automation boundary and are referenced as the OEM baseline [Source: [Achenbach – OPTIMILL Hot Rolling Mills](https://www.achenbach.de/en/machines-equipment/optimill-rolling-mills/optimill-hot-rolling-mills/)] [Source: [Primetals – MORGOIL Bearings](https://www.primetals.com/en/portfolio/solutions/hot-rolling/morgoil-bearings/)].

### 1.3 Standards Framework for the Database

- **AIAG‑VDA FMEA 7-step methodology (2019, Errata 2020):** The severity (S), occurrence (O), and detection (D) scales remain 1–10, but the new Action Priority (AP) matrix (H/M/L) replaces RPN as the preferred prioritization output. AP weights Severity first, then Occurrence, then Detection [Source: [Quality Digest – Understanding AIAG-VDA FMEA](https://www.qualitydigest.com/inside/lean-article/understanding-aiag-vda-s-fmea-process-and-approach-061820.html)] [Source: [Relyence – FMEA AP (Action Priority)](https://relyence.com/help/user-guide/fmea-ap.html)] [Source: [Quality Assist – Severity in FMEA](https://quasist.com/fmea/severity-in-fmea/)] [Source: [Sri Padhmam – AIAG-VDA DFMEA S/O/D tables](https://sripadhmam.com/wp-content/uploads/2021/08/Design-FMEA-SOD-tables.pdf)].
- **ISO 14224** provides the reliability‑data taxonomy (equipment/failure/maintenance data, levels 1–9, boundary diagrams, standardized failure‑mode vocabulary) — recommend using it as the master reference for CMMS failure coding even though it was originally oil & gas [Source: [ISO 14224:2016](https://www.iso.org/standard/64076.html)] [Source: [Maintenance and Engineering – ISO 14224](https://www.maintenanceandengineering.com/2017/09/01/reliability-and-maintenance-data-improvement-based-on-iso-14224/)] [Source: [Accendo Reliability – ISO 14224 defect elimination](https://accendoreliability.com/understanding-iso-14224-guide-sustainable-defect-elimination/)].
- **ISO 17359 / ISO 10816‑3 (now superseded by ISO 20816‑3) / ISO 13374:** governs the condition-monitoring overlay used for Detection controls throughout the FMEA [Source: [ISO 17359:2018](https://www.iso.org/standard/71194.html)] [Source: [Vibromera – ISO 17359](https://vibromera.eu/glossary/iso-17359/)] [Source: [Vibromera – ISO 10816-3](https://vibromera.eu/glossary/iso-10816-3/)] [Source: [Acoem – Understanding ISO 10816-3](https://acoem.us/blog/other-topics/understanding-the-iso-10816-3-vibration-severity-chart/)].

### 1.4 Severity Scale — Calibrated for Aluminum Hot Mill Context

The AIAG‑VDA severity scale is re-anchored below for a plant where the hot mill feeds captive cold/finishing lines serving automotive, can, and lithographic markets. Severity cannot be reduced by detection or occurrence controls — only by design change [Source: [APiS – FMEA Severity Ranking](https://www.apisnorthamerica.com/fmea-severity-ranking-a-complete-guide-for-risk-prioritization/)].

| S | Effect Class | Plant / Equipment / Safety / Quality / Env anchors (hot mill) |
|---|---|---|
| 10 | Catastrophic, no warning | Hot-metal or emulsion fire with uncontrolled escalation; rupture of HGC capsule at full pressure ejecting high-energy fluid; main drive motor catastrophic failure; fatality-potential event |
| 9 | Catastrophic, with warning | Major equipment loss (gearbox seizure, backup-roll spalling with chock breakage, cobble with cellar fire); >30-day production loss; regulatory non-compliance (Novelis Oswego September 2025 and November 2025 fires are real-world anchors) [Source: [S&P Global – Novelis plant second fire](https://www.spglobal.com/energy/en/news-research/latest-news/metals/112125-major-novelis-aluminum-plant-in-new-york-experiences-second-fire-in-two-months)] [Source: [Automotive Logistics – Novelis restart summer 2026](https://www.automotivelogistics.media/supply-chain/aluminium-supplier-novelis-expects-to-restart-hot-mill-in-summer-2026-after-fires-caused-disruption-in-2025/2607587)] |
| 8 | Very High | Unplanned shutdown >72 h; work-roll spalling requiring multi-stand roll change; major HPU contamination event; 100 % of an in-process rolling sequence scrapped |
| 7 | High | Unplanned shutdown 8–72 h; AGC loss-of-control with out-of-spec gauge; coil cobble with mill damage |
| 6 | Moderate | Unplanned shutdown 1–8 h; coil downgrade or customer claim; recoverable cobble |
| 5 | Low | Minor disruption; single-pass off-gauge material; planned-window extension |
| 4 | Very low | Degraded performance (higher roll wear, reduced speed, longer campaign); no customer impact |
| 3 | Minor | Inconvenience; minor maintenance call; no yield loss |
| 2 | Very Minor | Cosmetic only; detected internally |
| 1 | None | No discernible effect |

> **Calibration rule (AIAG‑VDA):** Severity ≥ 9 always requires action regardless of O and D values [Source: [Quality Assist – Severity](https://quasist.com/fmea/severity-in-fmea/)].

### 1.5 Occurrence Scale — Aluminum Hot Mill Empirical Frequency

Aluminum hot mill world-class availability targets are **93–95 %** against 88–90 % typical. CMMS-driven predictive maintenance programs have documented **30 % reductions in unplanned downtime** and **~70 % of unplanned HSM downtime is traceable to rotating-equipment failures with detectable early signals** [Source: [OxMaint – Hot Strip Mill Predictive Maintenance](https://oxmaint.com/industries/steel-plant/hot-strip-mill-ai-maintenance)] [Source: [OxMaint – Hot Rolling Mill CMMS](https://oxmaint.com/industries/steel-plant/hot-rolling-mill-maintenance-management-software)]. The occurrence table below translates those benchmarks into the FMEA scale.

| O | Qualitative | Typical failure rate for component of this class in an aluminum hot mill |
|---|---|---|
| 10 | Persistent | >1 event per week on the specific component; no effective prevention controls |
| 9 | Very high | 1 event every 2–4 weeks |
| 8 | High | 1 event every 1–3 months |
| 7 | Repeatedly | 1 event every 3–6 months |
| 6 | Moderate | 1–2 events per year |
| 5 | Occasional | 1 event every 1–2 years |
| 4 | Low | 1 event every 2–5 years |
| 3 | Very low | 1 event every 5–10 years |
| 2 | Remote | <1 event every 10 years; best-in-class practice applied |
| 1 | Nearly impossible | Eliminated by design; no known field events |

### 1.6 Detection Scale — Indexed to Condition-Monitoring Technology

| D | Qualitative | Detection capability example |
|---|---|---|
| 10 | None | No inspection; failure discovered by functional loss or cobble |
| 9 | Very remote | Visual only at campaign end; run-to-failure strategy |
| 8 | Remote | Periodic (quarterly) manual vibration/oil sampling; trend only |
| 7 | Very low | Monthly route-based CBM; lagging PLC alarms only |
| 6 | Low | Weekly CBM; overall-level ISO 10816 monitoring |
| 5 | Moderate | Online continuous vibration with ISO 20816 bands; monthly oil analysis |
| 4 | Moderately high | Online vibration with envelope/shock-pulse (SPM HD) + thermography + oil analysis |
| 3 | High | Multi-parameter online CBM (vibration + MCSA + temperature + pressure) integrated to CMMS with auto-generated WO |
| 2 | Very high | Digital-twin/AI anomaly detection with RUL estimation; multiple redundant sensing modalities |
| 1 | Almost certain | Error-proofed design (poka-yoke); interlocked safety system that cannot fail latently |

Shock-Pulse Method (SPM) is specifically recommended for mill bearing early-fault detection: the SPM transducer resonates at **~32 kHz** to capture metal-to-metal shock events from incipient spalling, with normalized HDm/HDc scales that compensate for rpm variation — a critical feature for variable-speed hot mill applications [Source: [SPM Instrument – Shock pulse monitoring](https://www.spminstrument.com/measuring-techniques/shock-pulse-monitoring/)] [Source: [SPM Instrument white paper – SPM HD](http://media.noria.com/sites/WhitePapers/WPFILES/SPM_Instrument201201.pdf)]. Envelope analysis catches bearing defects **1–6 months before functional failure** [Source: [OxMaint – Vibration monitoring steel mill](https://oxmaint.com/industries/steel-plant/vibration-monitoring-steel-mill-equipment)].

### 1.7 Criticality Classification

Apply a three-tier classification driven by Plant-level impact, consistent with ISO 14224 criticality and bad-actor methodology [Source: [Plant Services – What is a bad actor](https://www.plantservices.com/maintenance/article/55245801/what-is-a-bad-actor)] [Source: [Reliabilityweb – Bad Actor Program](https://reliabilityweb.com/articles/entry/bad-actor-program)]:

- **C1 (Mill-critical / Single-point-of-failure):** Loss stops the entire line for >8 h or creates safety/environmental event. Examples: main drive motor, backup rolls, HGC cylinders, mill housings, Level-2 automation.
- **C2 (Production-critical):** Loss reduces capacity or product quality within hours. Examples: work rolls, emulsion circulation, crop shear, downcoiler, AGC servo valves.
- **C3 (Auxiliary):** Redundant or quickly recoverable. Examples: individual spray nozzles, single sensors with voting, lighting, ancillary pumps.

---

## 2. System Hierarchy (Database-Ready Taxonomy)

Below is the hierarchy used for the FMEA line items. Level-1 = Plant (Hot Mill Line); Level-2 = System; Level-3 = Sub-system; Level-4 = Equipment Unit; Level-5 = Sub-unit / Component. Every FMEA line must carry this path plus a unique Asset ID for CMMS/FMEA-software ingestion.

1. **Reheat / Preheat Furnace System** — pusher, walking-beam, or soaking-pit style depending on ingot preheating strategy (aluminum hot-mill "reheat" is typically a continuous walking-beam or pre-heat/homogenization soaking pit) → burners, recuperators, walking beams, skid rails, hydraulic ingot positioners [Source: [YINUO – Walking beam reheating furnace](https://www.industrialfurnaces.net/walking-beam-reheating-furnace-a-comprehensive-overview/)] [Source: [USPTO 6,634,489 – Walking beam conveyor for Al bars](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6634489)] [Source: [Fives – Reheating / heat treatment](https://www.fivesgroup.com/steel/reheating)].
2. **Scalper / Ingot Preparation** — face milling machines (e.g., SNK MS-24-class), edge scalpers, chip extraction, laser ingot-surface measurement [Source: [MAXTON – Aluminum ingot scalping](https://maxtonco.com/hot-rolling-auxiliary-equipment/aluminum-slab-ingot-scalping-machine/)] [Source: [SNK America – Aluminum ingot scalping](https://snkamerica.com/aluminum-ingot-scalping-machines/)] [Source: [MEPCA – Ingot scalping optimisation (LMI)](https://mepca-engineering.com/ingot-scalping-optimisation/)].
3. **Reversing / Breakdown (Roughing) Mill** — 4-High stand with housings, chocks, work rolls, backup rolls, MORGOIL® bearings, HGC, bending/shifting actuators, spindles, pinion stand, main motor [Source: [SMS – Hot rolling mills for aluminum](https://www.sms-group.com/plants/hot-rolling-mills-for-aluminum)] [Source: [Primetals – MORGOIL](https://www.primetals.com/en/portfolio/solutions/hot-rolling/morgoil-bearings/)].
4. **Edger Stand** (if fitted) — vertical rolls for width control, integrated or stand-alone [Source: [SMS – Edging stands](https://www.sms-group.com/plants/hot-rolling-mills-for-aluminum)].
5. **Coilbox / Intermediate Transport** (line-dependent).
6. **Finishing / Tandem Stands (F1–F4)** — same sub-system structure as roughing mill, typically with CVC® plus shifting, work-roll bending, interstand cooling, ISV spray headers [Source: [SMS – CVC plus](https://www.sms-group.com/plants/hot-rolling-mills-for-aluminum)] [Source: [Primetals – ISV spray](https://www.primetals.com/portfolio/non-ferrous-rolling/aluminum-hot-rolling-mill)].
7. **Downcoiler / Hot Coiler(s)** — mandrel, wrapper rolls, pinch rolls, coil car, Automatic Step Control [Source: [SMS – Downcoiler maintainability](https://www.sms-group.com/en-cl/insights/all-insights/new-easy-to-maintain-concept-for-downcoilers)] [Source: [Primetals – Aluminum hot mill](https://www.primetals.com/en/portfolio/solutions/hot-rolling/non-ferrous/aluminum/)].
8. **Shears** — crop shear (entry/exit reversing mill), dividing shear at coiler, side trimmers (often offline or finishing-mill integrated) [Source: [IspatGuru – Shearing process and shears](https://www.ispatguru.com/shearing-process-and-shears/)] [Source: [SMS – Side-trimming shear](https://www.sms-group.com/en-us/press-and-media/press-releases/press-release-detail/henan-yirui-issues-fac-for-the-new-aluminum-hot-rolling-mill-from-sms-group)].
9. **Main Drive Line** — MV motor, air/water cooler, main coupling, gearbox (if present — aluminum reversing mills often gearless, tandem stands typically with), pinion stand, universal spindles (SMS SIEFLEX®-HT or Renold Type-1/2/3 gear spindles), roll-end / motor-end couplings [Source: [SMS – SIEFLEX-HT spindles](https://www.sms-group.com/plants/hot-rolling-mills-for-aluminum)] [Source: [Renold/Ajax – Mill spindles](https://pdf.directindustry.com/pdf/renold/mill-spindles/5242-325505.html)] [Source: [Kop-Flex – Mill gear spindles](https://www.ahrinternational.com/PDF_catalogues/Kop-Flex/Gear_Spindles.pdf)].
10. **Hydraulic Systems** — HGC capsules + servo valves (AGC), work-roll bending (positive/negative), backup-roll balance, roll-change hydraulics, coiler/wrapper hydraulics, side-guide hydraulics; one or more HPUs, reservoir, pumps, filtration, coolers [Source: [TelePro – Rolling Mill Stand Controller](https://www.tpri.com/projects/rolling-mill-stand-controller/)] [Source: [Danieli – HAGC](https://www.danieli.com/en/customer-service/own-brand-products/hagc-hydraulic-automatic-gap-control-cylinders_111_203.htm)] [Source: [OxMaint – Rolling mill hydraulic system maintenance](https://oxmaint.com/industries/steel-plant/rolling-mill-hydraulic-system-maintenance-agc-looper)].
11. **Lubrication Systems** — MORGOIL oil-film bearing lube system (Primetals), gear-oil system for gearboxes, grease-central for rolling contact bearings (coilers, pinch rolls), spindle continuous-oil system (SIEFLEX-HT), oil-mist where used [Source: [SMS – SIEFLEX-HT continuous oil lubrication](https://www.sms-group.com/plants/hot-rolling-mills-for-aluminum)] [Source: [Hy-Pro Filtration – Steel mill lubrication](https://www.hyprofiltration.com/industries/steel-mill)].
12. **Rolling Emulsion / Process Fluid System** — mix tank, circulation pumps, magnetic separators, centrifuges / cyclones, plate-type filters, temperature control, concentration control, fume extraction (OPTIPURE, Vapor Shield), oil recovery [Source: [Achenbach – OPTIPURE media systems](https://www.achenbach.de/en/machines-equipment/optimill-rolling-mills/optimill-hot-rolling-mills/)] [Source: [Primetals – Schneider filter / Vapor Shield](https://www.primetals.com/portfolio/non-ferrous-rolling/aluminum-cold-rolling-mill)] [Source: [Quaker Houghton – Aluminum hot rolling](https://home.quakerhoughton.com/industry/aluminum-hot-rolling/)] [Source: [Alureport – Hot rolling emulsion](https://alureport.com/en/issues/issue-01-24/article/hot-rolling-emulsion)].
13. **Roll Cooling / Strip Cooling Headers** — top and bottom spray headers, ISV (Integrated Solenoid Valve) zones, edge-drop HES (hot edge spray) or inductive edge heating, laminar cooling (if plate).
14. **Roll Shop Interface** — work-roll grinder (GEORG, Farrel, Waldrich), backup-roll grinder, chock mounting station, bearing press, EDT (if equipped for downstream), NDT (ultrasonic, eddy current, MPI) [Source: [GEORG – Roll grinding machines](https://www.georg.com/en/products/roll-grinding-machines/)] [Source: [Tenova – Roll grinding aluminum](https://tenova.com/technologies/aluminum/roll-shops-aluminum/roll-grinding)] [Source: [Alta Solutions – GrinderMon](https://www.altasol.com/roll-grinder-monitoring/)].
15. **Auxiliary Process Equipment** — entry/exit roller tables, pinch rolls, side guides, descaler (aluminum is descaled less aggressively than steel but HP water-rinse and brushes are used), strip-cooling headers, ingot turnover, coil transport cars.
16. **Automation (Level 1 & Level 2)** — PLCs, HMI, drive networks (PROFIBUS/PROFINET/EtherCAT), Level-2 setup/pass-schedule-calculation (X-Pact® PSC, Williamson ESP algorithm integration), X-ray / isotope thickness gauges (RM 215 HM), simultaneous profile gauges (SIPRO), flatness / shape meter rolls (ABSM), pyrometers (MWx, MW, SPOT AL, AST multi-wave), width gauges, hot-metal detectors, width scanners [Source: [SMS – X-Pact](https://www.sms-group.com/plants/hot-rolling-mills-for-aluminum)] [Source: [IspatGuru – Automation and thickness control](https://www.ispatguru.com/automation-and-thickness-control-in-hot-strip-mill/)] [Source: [Thermo Fisher – RM 215 HM / SIPRO](https://www.thermofisher.com/order/catalog/product/115064)] [Source: [Williamson IR – Aluminum hot rolling + reversing](https://www.williamsonir.com/aluminum/aluminum-rolling-mills/)] [Source: [Accurate Sensors – Aluminum hot rolling temp](https://accuratesensors.com/aluminum-hot-rolling/)] [Source: [AMETEK Land – SPOT AL](https://www.ametek-land.com/products/non-contact-infrared-thermometers-pyrometers/spot-aluminium-extrusion-quench-strip-pyrometer)].
17. **Electrical Distribution** — MV incomer, substation transformers, MV switchgear, rectifiers / VFDs for DC & AC drives (Siemens SINAMICS SL150 cycloconverters, SINAMICS DC Master, ABB ACS / MV), aux LV distribution, UPS, harmonic filters [Source: [Primetals – Alunorf KW5 modernization](https://www.primetals.com/press-media/news/primetals-technologies-to-modernize-drive-technology-in-aluminum-cold-rolling-mill-for-alunorf)] [Source: [ABB – Novelis Oswego drive retrofit](https://manufacturing-today.com/news/novelis-to-increase-aluminum-recycling-uptime-with-abb-modernization/)].
18. **Safety / Interlock Systems** — E-stop loops, light curtains around roll-change pit, fire detection and suppression (CO₂ low-pressure + foam-water deluge per AXA XL PRC.17.13.1), hydrogen purge for HPU rooms, cellar gas monitoring [Source: [AXA XL PRC – Aluminum Rolling Mills](https://axaxl.com/-/media/axaxl/files/pdfs/prc-guidelines/prc-17/prc17131aluminumrollingmillsv1.pdf?sc_lang=en&hash=410372FB5813D52444020C03526E0E8F)] [Source: [Risk Logic – Rolling Mills Loss Prevention](https://risklogic.com/rolling-mills/)].

---

## 3. FMEA Line Items — Structured by System

Each line below carries the complete AIAG‑VDA-aligned field set. Ratings are typical values for a mature mill with a modern CBM program; plants should re-rate based on their own historical failure data.

### 3.1 Reheat / Preheat Furnace (Walking Beam) — typical values

| # | Component | Function | Functional Failure | Failure Mode | Mechanism | Local Effect | System Effect | Plant Effect | S | O | D | Prevention | Detection | Recommended Action | PM/PdM & Interval | Spares Strategy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-01 | Walking beam hydraulic lift cylinder | Lift and advance ingot through furnace without surface marking | Fails to lift / drifts | Internal leak across piston seal; scored rod; contamination wear | Ingot positioning error; surface indentation from sliding on skids | Ingot mispositioning; extended pre-heat cycle; non-uniform heating | Downgrade hot-mill feed; possible furnace stall | 7 | 5 | 5 | Fire-resistant fluid (HFC/HFDU), filtration to ISO 17/15/12, servicable seal kits | Cylinder drift test; pressure-decay test; oil analysis (ISO particle count, water) | Move to bag-in / cartridge seal design; install dedicated offline filtration | Monthly drift test; 6-monthly oil analysis; annual seal-kit change on tonnage trigger | 1 spare cylinder per site; seal kits on shelf |
| F-02 | Burner (regenerative or recuperative) | Deliver controlled combustion heat profile | Flame-out; uneven heat; NOx excursion | Burner tip erosion; flame-detector fouling; valve stick; recuperator leak | Dead zone in furnace; cold ingots; CO spike | Ingot hot-spot / cold-spot → hot-mill load imbalance; roll wear asymmetry | Quality downgrade; NOx compliance event | 7 | 6 | 4 | Burner Mgmt System (BMS) with SIL-rated interlocks; regular flame-scanner cleaning | UV flame detection; combustion O₂/CO analyzers; thermographic surveys | Upgrade to low-NOx regenerative burners; add combustion analyzer | Quarterly burner strip-down; annual recuperator eddy-current | Rotable spare burner assemblies |
| F-03 | Skid-rail water-cooled tube | Support ingot; convey cooling water | Rupture; black-mark on ingot bottom | Thermal fatigue of insulation; weld crack; internal scaling | Water into furnace chamber; steam explosion risk | Ingot surface defect ("black mark"); possible emergency shutdown | Major safety event if rupture; significant repair | 9 | 3 | 6 | Skid insulation (hot skids); water treatment; overpressure protection | Skid-water flow + differential pressure trending; leak detection in exhaust | Convert to water-free ceramic support where feasible | Annual skid insulation inspection; bi-annual NDT on welds | Skid-tube sections in kit |
| F-04 | Homogenization soaking pit / batch furnace (interface) | Deliver homogenized, dimensionally-stable ingot to scalper | Under-homogenized ingot | Temperature-profile drift; thermocouple failure; recirculation fan failure | Coarse intermetallics; inferior grain structure | Hot-mill roll-force surprises; edge cracking; downstream anisotropy | Scrap or customer claim; especially severe on 5xxx/6xxx automotive alloys | 7 | 4 | 5 | Dual redundant TCs per zone; calibration program; model-based Level-2 | TC voting logic; oxygen/dew-point monitoring | Integrate homogenization twin model; auto-trigger recook | Monthly TC calibration; annual fan vibration | TC elements in stores |

### 3.2 Scalper / Ingot Preparation

Scalper removes 2–15 mm of the cast surface to eliminate segregation, inverse-segregation zones, oxide skin, and surface cracks, ensuring hot-mill feed quality [Source: [ScienceDirect – Homogenization heat treatment](https://www.sciencedirect.com/topics/engineering/homogenization-heat-treatment)] [Source: [AMETEK – Scalping](https://www.ameteksurfacevision.com/applications/aluminum/aluminum-cold-scalping)].

- **Spindle drive bearings seizure** — wear from chip ingress / inadequate sealing. Effect: scalper spindle damage, ingot surface defect. S=7, O=4, D=5. Action: upgrade to sealed double-row cylindrical roller bearings with oil-mist; SPM HD monitoring at 32 kHz [Source: [MAXTON scalper](https://maxtonco.com/hot-rolling-auxiliary-equipment/aluminum-slab-ingot-scalping-machine/)].
- **Cutter-head insert breakage** — high-Mg 5xxx alloys accelerate adhesive wear. Effect: deep gouge / ingot scrap. S=6, O=6, D=6. Action: insert-condition monitoring via spindle-current signature analysis; tonnage-based insert rotation.
- **Laser ingot-surface measurement drift / traversing-head wear** — previous moving-head systems showed mechanical wear causing production outages; LMI fixed-mount multi-sensor line is the current best practice [Source: [MEPCA – Ingot scalping optimisation](https://mepca-engineering.com/ingot-scalping-optimisation/)]. Effect: "safety" over-scalping → yield loss. S=5, O=7, D=5.
- **Chip crusher hammer rotor unbalance** — aluminum chips + oil, fire risk in duct. S=8, O=4, D=5. Action: vibration trending; FR-fluid hydraulic coupling; fire/explosion protection per AXA XL PRC.

### 3.3 Reversing / Breakdown Mill — Work Rolls

Aluminum hot-mill **work rolls are most commonly forged 5Cr or 5Cr-Mo steel (e.g. 5CRMO, 5CR80MO, TERMA5 D), increasingly semi-HSS 5%Cr or 10%Cr grades pioneered by Union Electric Åkers for improved wear resistance**; ICDP (Indefinite Chill Double Pour) is used for finishing passes in some steel HSM practice and transferred knowledge to aluminum via roll-failure-analysis literature [Source: [Union Electric Åkers – Aluminum mill rolls](https://uniones.com/union-electric-akers/akers-products/aluminum-mill-rolls/)] [Source: [Union Electric Åkers – Hot strip mill work rolls](https://uniones.com/union-electric-akers/akers-products/hot-strip-mill-rolls/)].

**Dominant failure modes (with mechanism specificity):**

1. **Surface-initiated (ribbon) fatigue spalling** — cyclic Hertzian contact stress in the roll barrel, with thermal gradients from roll-cooling cycling. Fatigue arrest marks along the circumferential direction are diagnostic [Source: [Springer – Analysis of Progressive Failure of Work Roll](https://link.springer.com/article/10.1007/s11668-019-00688-w)] [Source: [Springer – Failure Investigation Spalled Work Roll](https://link.springer.com/article/10.1007/s11668-024-01939-1)] [Source: [IspatGuru – Abnormalities and Failures of Rolling Mill Rolls](https://www.ispatguru.com/abnormalities-and-failures-of-rolling-mill-rolls/)]. S=8, O=5, D=6. Detection: ultrasonic and eddy-current roll inspection every grind cycle; surface-crack depth trending.
2. **Subsurface spalling from internal manufacturing defects** — non-metallic inclusions, residual stresses, excessive retained austenite. S=9, O=3, D=7. Prevention: Stringent incoming-roll QA, UT at receipt, sub-zero treatment to reduce retained austenite [Source: [ResearchGate – Spalling Prevention in Hot-Rolling](https://www.researchgate.net/publication/282073120_Spalling_Prevention_and_Wear_Improvement_of_Rolls_in_Steel_Strip_Hot-Rolling_Process)].
3. **Aluminum pickup / roll coating degradation** — adhesive wear driven by high load + low temperature + thin lubricant film; worsens with 3xxx / 1xxx alloys. Effect: roll surface roughens, transfers pickup to strip as streaks [Source: [Innoval – Aluminium rolling lubrication](https://www.innovaltec.com/aluminium-rolling-lubrication-blog/)] [Source: [SMS – Work roll brushes to keep rolls clean](https://www.sms-group.com/plants/hot-rolling-mills-for-aluminum)]. S=6, O=7, D=4. Prevention: work-roll brushes; emulsion concentration control (>3%); EP additives (phosphate esters); roll roughness spec.
4. **Thermal / fire cracking (reverse stand)** — where roll gets heat-soaked from slab and is quenched by emulsion. In aluminum this is milder than in steel but still present on roughing passes. S=7, O=5, D=5 [Source: [IspatGuru – Abnormalities and Failures](https://www.ispatguru.com/abnormalities-and-failures-of-rolling-mill-rolls/)].
5. **Neck break** — from bending overload or shock during biting, especially when inertial torque amplification (TAF) closes drive-train backlash [Source: [ResearchGate – Transient torsional vibrations geared drive trains](https://www.researchgate.net/publication/202043946_Transient_Torsional_Vibrations_Control_in_the_Geared_Drive_Trains_of_the_Hot_Rolling_Mills)]. S=10, O=2, D=8. Action: drive-acceleration control (1.20 rot/s² optimum); telemetric torque monitoring.
6. **Journal wear / corrosion from coolant ingress under bearing** — mill-cooling water defeating the bearing seal. Direct cause of MORGOIL bearing premature failure. S=8, O=5, D=6 [Source: [IspatGuru – Abnormalities and Failures](https://www.ispatguru.com/abnormalities-and-failures-of-rolling-mill-rolls/)].

**Typical signatures / benchmarks:**
- Work-roll campaign length: **40,000–80,000 t per pair** for hot steel (aluminum typically lower at 20,000–40,000 t per pair for tandem; roughing stand longer); extensible 8–15 % through CMMS-based campaign tracking linked to strip-surface feedback [Source: [OxMaint – Hot strip mill CMMS](https://oxmaint.com/industries/steel-plant/hot-strip-mill-maintenance-roughing-finishing-coiler)] [Source: [OxMaint – Hot rolling mill CMMS](https://oxmaint.com/industries/steel-plant/hot-rolling-mill-maintenance-management-software)].
- Work roll grinds before retirement: **80–120** over the roll lifecycle [Source: [OxMaint – Hot rolling mill CMMS](https://oxmaint.com/industries/steel-plant/hot-rolling-mill-maintenance-management-software)].
- Roll-surface fatigue crack propagation: detectable by eddy-current at ~0.1–0.2 mm depth; surface-initiated spalling most commonly ribbon-form.

### 3.4 Backup Rolls (BURs)

BURs are subjected to continuous contact stress for rolling campaigns of **28–42 days** between surface inspections [Source: [PMC – Influence of Work Hardening on BUR surface](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9147539/)].

- **Large-area edge spalling** from work-hardening + roll-bending concentration at the chamfer. Mechanism: fatigue micro-cracks propagate from an initially work-hardened layer. Signature: characteristic beach marks in the fracture surface. S=9, O=4, D=6 [Source: [LMM Group – 1780 BUR spalling](https://lmmworkrolls.com/en/1780-cause-analysis-and-preventive-measures-for-spalling-of-backup-roll-in-hot-continuous-rolling/)] [Source: [PMC – Work Hardening BUR](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9147539/)]. Actions: optimized chamfer design (e.g., VCRplus contour), hardness trending at chamfer, off-line UT every change, early change on tonnage (e.g., 6 Mt).
- **Subsurface inclusion-driven spalling.** S=10, O=2, D=7. Actions: 100% incoming UT, residual-stress measurement.
- **Journal work-hardening / pitting from contact with WR chock.** S=7, O=5, D=6.
- **MORGOIL bearing oil-film collapse** (see §3.5).

**MTBF benchmarks:** Backup-roll service life per set typically **3–6 Mt of rolled product**, with catastrophic failure being "near-zero events per decade in best-practice plants" but high-severity (9–10) when it occurs. The Ternium Siderar experience documents how increasing rolling loads can push original bearings outside rating envelope, leading to progressive BUR neck fatigue cracks [Source: [Primetals – MORGOIL upgrade at Ternium Siderar](https://onetunnel.org/documents/morgoil-bearing-technology-upgrade-at-ternium-siderar-hot-strip-mill)].

### 3.5 MORGOIL® / Oil-Film (Hydrodynamic) BUR Bearings

MORGOIL bearings have been the industry standard since 1932 — hydrodynamic journal bearings with a KL / KLX sleeve, no metal-to-metal contact in operation, and a dedicated lube/cooling oil system [Source: [Wikipedia – MORGOIL Bearings](https://en.wikipedia.org/wiki/MORGOIL_Bearings)] [Source: [Primetals – MORGOIL solutions](https://www.primetals.com/en/portfolio/solutions/hot-rolling/morgoil-bearings/)].

| Failure Mode | Mechanism | Effect | S | O | D | Controls |
|---|---|---|---|---|---|---|
| Sleeve seizure / wipe | Oil-film loss from low pressure at low speed, contamination, incorrect start-up procedure | BUR cannot rotate; stand down; possible chock/neck crack | 9 | 3 | 6 | Interlocked pump start before mill start; min-pressure trip; DF seal condition |
| Sleeve wear (KL → KLX upgrade path) | Over-load beyond design; cyclic misalignment | Increased clearance, eccentricity, poor gauge control | 7 | 5 | 6 | Capacity audit; KL→KLX upgrade (~25% more capacity in same envelope) [Source: [Primetals – MORGOIL KLX](https://www.primetals.com/en/portfolio/solutions/hot-rolling/morgoil-bearings/)] |
| Water ingress through back-up roll bearing seal (DF) | Seal wear; mill cooling water under pressure; decanting free water observed from oil reservoirs at many mills | Lube-oil emulsification, bearing failures averaging $30,000+ each before downtime [Source: [Hy-Pro – Steel mill applications](https://www.hyprofiltration.com/industries/steel-mill)] | 8 | 7 | 5 | Water removal elements on lube system; online water-in-oil sensor; seal replacement on tonnage |
| Contamination (aluminum fines, scale) | Breaches in filtration; top-ups with unfiltered oil | Progressive sleeve wear | 6 | 7 | 5 | DFE-rated filter elements; FSL off-line filter skid; bulk-oil filter/breather on supply tank [Source: [Hy-Pro – Steel mill lubrication](https://www.hyprofiltration.com/industries/steel-mill)] |
| Oil-film thickness / eccentricity compensation loss | Required by AGC feed-forward — oil film compresses under load | Thickness deviation | 6 | 4 | 4 | AGBG feed-forward model in Level-2; eccentricity calibration at start-up [Source: [IspatGuru – Automation and thickness control](https://www.ispatguru.com/automation-and-thickness-control-in-hot-strip-mill/)] |

### 3.6 Mill Housing, Chocks, and Liners

- Housing liner wear → clearance >spec → roll shift under load → strip tracking problems. PM: measure liner wear at four corners per housing each major outage; replace when clearance exceeds spec [Source: [OxMaint – HSM maintenance](https://oxmaint.com/industries/steel-plant/hot-strip-mill-maintenance-roughing-finishing-coiler)]. S=6, O=5, D=5.
- Chock bearing fatigue (rolling-element WR bearings, if not oil-film). Detection: vibration with envelope/SPM HD, temperature trending. S=7, O=6, D=4.
- Chocking/de-chocking induced damage to bearing races — documented cause of chatter defects in a cold mill [Source: [Innoval – Chatter investigation](https://www.innovaltec.com/chatter-cold-rolling-mill-blog/)]. Aluminum hot mills are exposed to the same risk. S=6, O=6, D=5.

### 3.7 HGC (Hydraulic Gap Control) Capsules and AGC Servo System

HGC capsules provide closed-loop position and pressure control of the roll gap. Automatic Gauge Control (AGC) integrates roll-force (load cells), HGC position (LVDT), strip thickness (X-ray), and strip tension (looper/tension meter) inputs to maintain strip gauge within ±0.06 mm typical [Source: [Academia – Hot rolling mill HGC AGC](https://www.academia.edu/24085149/Hot_Rolling_Mill_Hydraulic_Gap_Control_HGC_thickness_control_improvement)] [Source: [TelePro – Mill Stand Controller](https://www.tpri.com/projects/rolling-mill-stand-controller/)].

| Failure Mode | Mechanism | Effect | S | O | D | Controls / Actions |
|---|---|---|---|---|---|---|
| Servo-valve null shift / stick | Silting / varnish / fine contamination | AGC loss of linearity; off-gauge strip | 8 | 6 | 4 | ISO cleanliness target **16/14/11 for AGC oil**; pressure-line 2 µm filtration; monthly null-current trend (e.g., 10 mA nominal; +/-1.5 mA threshold) [Source: [OxMaint – Hydraulic system maintenance](https://oxmaint.com/industries/steel-plant/rolling-mill-hydraulic-system-maintenance-agc-looper)] [Source: [Moog – Servo valve life](https://www.moog.com/news/ideas-in-motion-control/2018/100/Putting_ServoValves_Back_to-Work.html)] |
| HGC capsule seal leak | High cycle seals; thermal; contamination erosion | Loss of gap position; internal leak masks in pressure | 9 | 4 | 5 | Daily pressure-decay test; seal replacement at tonnage trigger |
| LVDT position transducer drift | Temperature drift; mechanical damage | Gauge deviation not detected | 7 | 5 | 5 | LVDT calibration at every roll change; dual-transducer voting |
| HGC overpressure / venting failure at strip break | Interlock failure | Damage to rolls / housing; possible ejection | 10 | 2 | 6 | SIL-rated pressure venting on mill-stop event; Safety PLC verification [Source: [TelePro](https://www.tpri.com/projects/rolling-mill-stand-controller/)] |
| Proportional-valve feedback loss on bending cylinders | Wire fatigue; connector corrosion | Profile/flatness deviation | 6 | 5 | 5 | Redundant feedback; connector IP rating upgrade |

**AGC PM/PdM cadence:** Full AGC step-response test at mill speed every rolling campaign end; servo-valve bypass test monthly; hydraulic oil ISO cleanliness continuously monitored with inline particle counter; pump volumetric-efficiency test quarterly; breather replacement monthly [Source: [OxMaint – Hydraulic system PM](https://oxmaint.com/industries/steel-plant/rolling-mill-hydraulic-system-maintenance-agc-looper)].

### 3.8 HPU / Hydraulic Power Unit

- Pump wear (volumetric efficiency <92%) → system pressure hunting, temperature rise. S=7, O=6, D=4. PdM: monthly flow-at-zero-pressure test; motor current trending at constant demand.
- Return-line filter bypass → contamination event affecting all downstream consumers. Critical because AGC cleanliness target is the plant's weakest link [Source: [OxMaint – HPU maintenance](https://oxmaint.com/industries/steel-plant/rolling-mill-hydraulic-system-maintenance-agc-looper)]. S=8, O=5, D=4. Actions: ΔP transducer with CMMS alarm at 70% bypass pressure; offline polishing skid.
- Accumulator bladder failure / pre-charge loss → pressure ripple, system dynamics degraded. S=6, O=6, D=5. Actions: Monthly pre-charge check; bladder replacement on life cycle basis.
- Fluid selection: aluminum mills should use fire-resistant (HFC water-glycol or HFDU synthetic ester) hydraulic fluids for HGC and nearby systems. Novelis Oswego and similar events demonstrate the consequence of mineral-oil ignition from lubricant/hydraulic leaks onto hot product [Source: [Fluid Power Journal – Fire risks aluminum](https://fluidpowerjournal.com/the-right-hydraulic-fluid-reduces-fire-risks-in-aluminum-plants/)] [Source: [Quaker Houghton – Fire resistant fluids](https://fireresistantfluids.com/)] [Source: [RAN Fire Protection – Novelis case study](https://ranfpe.com/2025/10/14/the-novelis-aluminum-plant-fire-a-case-study-in-the-importance-of-fire-protection-engineering-for-business-continuity/)].

### 3.9 Finishing Tandem Stands (F1–F4)

All the roughing-stand line items repeat per stand, with the following stand-specific adjustments:

- **F3–F4 work-roll wear** is most severe because of thinnest gauge, highest unit pressure; aluminum pickup risk peaks. Shorter campaign targets (~15–25 % shorter than roughing).
- **Interstand cooling header asymmetry** → thermal crown mismatch → flatness excursion. Detection by shape meter feedback; PM nozzle flow test each shutdown [Source: [Primetals – ISV spray](https://www.primetals.com/portfolio/non-ferrous-rolling/aluminum-hot-rolling-mill)].
- **Looper / bridle (if configured)** → tension-control loss → strip break, cobble. S=7, O=5, D=5.
- **Edge drop on thin gauge** is controlled by EDC (edge-drop control) and inductive edge heating (SMS) or hot edge spray [Source: [SMS – Inductive edge heating](https://www.sms-group.com/plants/cold-rolling-mills-for-aluminum)]. Failure: heater coil burn-out or emulsion fouling → wedge increase → trim scrap.

### 3.10 Main Drive Motor and Gearbox

Large DC or AC synchronous mill motors (1,000–15,000 HP). Failure of a main-drive motor can exceed **$1 million in replacement cost alone** and create 2–4 weeks of lost production while sourced [Source: [OxMaint – Predictive maintenance drives](https://oxmaint.com/industries/steel-plant/predictive-maintenance-rolling-mill-gearboxes-drives)]. Finishing-mill gearbox lead times are **6–18 months**, so prevention (not management) is mandatory.

| Failure Mode | Mechanism | S | O | D | Detection Technology |
|---|---|---|---|---|---|
| Stator winding insulation breakdown | Thermal ageing; partial discharge; contamination | 9 | 4 | 4 | Partial-discharge monitoring; tan-δ; offline HiPot annually |
| Rotor bar crack (AC) | Thermal-mechanical fatigue from start/stop | 8 | 3 | 4 | Motor Current Signature Analysis (MCSA) at slip frequency sidebands — non-invasive via CTs at motor control cabinet [Source: [OxMaint – Drivetrain PdM](https://oxmaint.com/industries/steel-plant/predictive-maintenance-rolling-mill-gearboxes-drives)] |
| Bearing failure (DE/NDE) | Fatigue; lubrication; electrical erosion (EDM from VFD) | 8 | 5 | 3 | SPM HD at 32 kHz; shaft-voltage monitoring; thermography |
| Cooler fouling (air-to-water heat exchanger) | Scaling; dust | 5 | 7 | 3 | Inlet/outlet ΔT trending |
| Commutator flash-over (if DC) | Brush wear; moisture; commutator groove wear | 7 | 6 | 4 | Daily brush-length check; humidity control |
| Gearbox tooth pitting / micropitting | Cyclic Hertzian; lubrication breakdown | 8 | 5 | 4 | Oil analysis (Fe, Cu, Mn, PQ index); vibration at gear-mesh frequency and sidebands |
| Gearbox shaft breakage | Torsional fatigue; TAF overload | 9 | 2 | 7 | Strain-gauge telemetry (rare); torque signature from motor current [Source: [Springer – Model Based Monitoring drivelines](https://link.springer.com/chapter/10.1007/978-3-030-57745-2_34)] |
| Bearing outer-race oxide wear path | Progressive RCF | 7 | 5 | 3 | Envelope analysis in the BPFO band |

**MTBF benchmarks:** World-class mill gearbox MTBF is reported in SKF case studies to double with engineered upgrades [Source: [SKF – Rolling mill gearbox MTBF](https://www.skf.com/us/industries/metals/case-studies/rolling-mill-doubles-mtbf-with-skf-engineered-solutions-for-gearboxes)]. Typical targets: main-drive motor MTBF > 10 years; gearbox MTBF > 20 years with oil analysis-driven overhaul; bearing MTBF on large rotating-element bearings is 5–8 years CBM-managed vs 2–3 years calendar-based.

### 3.11 Spindles, Pinion Stands and Couplings

Universal spindle failure is a documented leading cause of HSM unplanned outage. A published case (TATA Steel HSM #1) records a cross-bearing life reduced from **12 to 6 months** because of seal failure allowing water ingress, corrosion, and roller fracture [Source: [ScienceDirect – Cross bearing universal spindle HSM](https://www.sciencedirect.com/science/article/abs/pii/S135063071831063X)].

- Cross bearing corrosion / seizure (universal spindle). S=9, O=5, D=6. Action: seal condition inspection at every roll change; oil analysis on spindle lube (if SIEFLEX-HT, continuous oil); replace at calendar or tonnage whichever first.
- Slipper-type spindle pad wear and spalling (legacy design) — bending angle limit 3°. SMS giant-torque / SIEFLEX-HT are the upgrade path with +40% torque capacity and continuous oil [Source: [SMS – SIEFLEX-HT](https://www.sms-group.com/plants/hot-rolling-mills-for-aluminum)]. S=8, O=6, D=5.
- Pinion-stand gear tooth fatigue. S=8, O=4, D=4. Detection: gear-mesh vibration sidebands, oil analysis.
- Motor-coupling misalignment. S=6, O=6, D=4. Laser alignment annually; coupling thermography.
- Backlash build-up causing torque amplification factor (TAF) excursions — active control by DC-drive acceleration at optimum 1.20 rot/s² demonstrably reduces gearbox dynamic torque [Source: [Academia – Hot rolling mill drive dynamics](https://www.academia.edu/27575456/Hot_rolling_mill_drive_train_dynamics_torsional_vibration_control_and_backlash_diagnostics)].
- Torsional vibration of multi-mass drive train at 10–30 Hz modes — monitored by torque signal from motor current [Source: [ResearchGate – Hot rolling mill drive train dynamics](https://www.researchgate.net/publication/202044159_Hot_rolling_mill_drive_train_dynamics_torsional_vibration_control_and_backlashes_diagnostics)]. Signal-Based Diagnostic Agents (MAGIC framework) have been applied to hot-mill main drives [Source: [ScienceDirect – Signal-based diagnosis HRM drive](https://www.sciencedirect.com/science/article/pii/S1474667017310212)].

### 3.12 Downcoiler / Hot Coiler

Coiler failures are "the most common cause of campaign interruption in hot rolling and cold rolling finishing lines" [Source: [OxMaint – Rolling mill maintenance checklist](https://oxmaint.com/industries/steel-plant/rolling-mill-maintenance-checklist-hot-cold-rolling)].

- Mandrel collapse (mechanical fatigue). S=9, O=2, D=7.
- Wrapper-roll bearing failure. S=7, O=6, D=4. SMS Easy-to-Maintain Downcoiler concept improves accessibility [Source: [SMS – Easy-to-maintain downcoiler](https://www.sms-group.com/en-cl/insights/all-insights/new-easy-to-maintain-concept-for-downcoilers)].
- Automatic Step Control (ASC) failure → first-wrap surface mark. S=6, O=5, D=5.
- Pinch-roll surface defects → transferred chatter marks on coil. Pinch rolls are "highly critical components" in hot strip mills [Source: [Xtek – Pinch rolls](https://www.xtek.com/wp-content/uploads/2018/05/xtek-pinchroll-apps.pdf)].
- Coil telescoping / collapse post-coil → handling damage, especially hot coils sagging under gravity [Source: [USPTO 12,459,021 – Coil collapse mitigation](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12459021)]. S=6, O=6, D=6.

### 3.13 Shears (Crop, Cobble, Side Trimmer)

Aluminum hot-line crop shear at the reversing mill exit / finishing mill entry must crop head and tail squarely to prevent cobbles in finishing stands [Source: [Global Gauge – Crop shear optimization](https://globalgauge.com/blog/crop-shear-optimization-increase-in-yield/)] [Source: [IspatGuru – Shearing process](https://www.ispatguru.com/shearing-process-and-shears/)].

- Blade dulling / chipping. S=7, O=7, D=4. PM: Blade inspection every roll change; blade life by tonnage.
- Drum-drive flywheel-clutch wear (pneumatic clutch/brake). S=6, O=6, D=5.
- PLC timing drift / crop-optimization algorithm misalignment → cobbles at finishing stand threading. Per OxMaint, crop shear timing drift is a contributor to the 10% of cobble-source category [Source: [OxMaint – Hot rolling CMMS](https://oxmaint.com/industries/steel-plant/hot-rolling-mill-maintenance-management-software)]. S=8, O=4, D=5.
- Side trimmer knife wear / edge burr → coil-edge quality / fire risk on cold-mill downstream.

### 3.14 Rolling Emulsion / Coolant System

| Failure Mode | Mechanism | Effect | S | O | D | Controls / Actions |
|---|---|---|---|---|---|---|
| Emulsion destabilization (phase separation) | Electrolyte contamination; tramp oil; bacterial breakdown | Lubrication loss; surface defects (streaks, brown stains) [Source: [Chalco – Al plate defects](https://www.chalcoaluminum.com/blog/aluminum-plate-defects/)] | 7 | 6 | 5 | Daily concentration, conductivity, pH, droplet size, free-oil kinematic viscosity; biocide dosing; infrared spectroscopy [Source: [Innoval – Emulsion monitoring](https://www.innovaltec.com/hot-rolling-emulsion-blog/)] |
| Spray-nozzle clogging | Debris; scale; aluminum fines | Uneven cooling → thermal crown → flatness excursion → strip bend | 6 | 7 | 4 | Magnetic separator; cyclone; plate filter; ISV nozzle CV test; nozzle replacement on tonnage |
| Filter breakthrough (Schneider/plate) | Media fatigue; pressure surges | Contamination event; downstream bearing damage | 7 | 4 | 4 | ΔP monitoring; filter element change on ΔP target [Source: [Primetals – Schneider filter](https://www.primetals.com/en/portfolio/solutions/hot-rolling/non-ferrous/aluminum/)] |
| Tramp-oil / hydraulic-oil ingress | Leaks from HGC, bending cyls | Emulsion instability; fire risk | 7 | 6 | 4 | Centrifuge; IR-FTIR of free oil; leak reduction at source |
| Emulsion mist / fume ignition | Oily vapor + hot slab + spark (strip-break, motor arc) | **Mill fire** (Novelis Oswego pattern) [Source: [S&P Global – Novelis fire](https://www.spglobal.com/energy/en/news-research/latest-news/metals/112125-major-novelis-aluminum-plant-in-new-york-experiences-second-fire-in-two-months)] | 10 | 3 | 5 | OPTIPURE / Vapor Shield extraction; automatic low-pressure CO₂ + manual foam-water deluge per AXA XL PRC.17.13.1 [Source: [AXA XL PRC-17.13.1](https://axaxl.com/-/media/axaxl/files/pdfs/prc-guidelines/prc-17/prc17131aluminumrollingmillsv1.pdf?sc_lang=en&hash=410372FB5813D52444020C03526E0E8F)] [Source: [Risk Logic – Rolling mills](https://risklogic.com/rolling-mills/)] |
| Microbial contamination | Water-oil emulsion is a biocide-supported colony | Foul odor; emulsion failure; skin risk | 4 | 7 | 6 | Biocide program; dip-slide counts weekly |

### 3.15 Automation / Process Instrumentation

- **X-ray gauge (RM 215 HM)** — measurement drift, detector cooling loss. S=7, O=5, D=4. PM: daily standardization; ion-chamber / PMT replacement on trend [Source: [Thermo Fisher RM 215 HM](https://www.thermofisher.com/order/catalog/product/115064)].
- **Simultaneous profile gauge (SIPRO) / stereoscopic profile gauge** — mechanical vibration, water-jacket leak in hot environment. S=7, O=5, D=4 [Source: [Thermo Fisher – SIPRO](https://www.thermofisher.com/order/catalog/product/SIPRO)].
- **Flatness / shapemeter roll (ABSM air-bearing or magneto-elastic)** — air-bearing failure, sensor wire break. S=6, O=5, D=5 [Source: [Primetals – ABSM](https://www.primetals.com/en/portfolio/solutions/hot-rolling/non-ferrous/aluminum/)].
- **Pyrometer (multi-wavelength MWx, SPOT AL)** — non-greybody emissivity variation is the core aluminum-specific difficulty. Failure modes: recipe/offset table drift, sight-tube fouling, wedge technique misalignment. S=7, O=6, D=4. Actions: install dynamic-ESP (Williamson MWx) or AST line-scanner with automatic alloy/thickness algorithm; wedge technique at cold mills [Source: [Williamson IR – MWx](https://www.williamsonir.com/blog/improved-temperature-measurement-accuracy-and-repeatability-for-aluminum-rolling-mills/)] [Source: [AMETEK Land – Aluminium temperature app note](https://www.ametek-land.com/-/media/AmetekLandInstruments/Documentation/Industries/Aluminium/AMETEK_Land_Temperature_Measurements_Aluminium_Production_Application_Note_Rev_4_EN.pdf)].
- **Width gauge / hot metal detector / CCD-based camera (Wedge Camber Expert)** — condensation, debris on optics. S=5, O=6, D=5 [Source: [Primetals – Wedge Camber Expert](https://www.primetals.com/en/portfolio/solutions/hot-rolling/non-ferrous/aluminum/wedge-camber-expert/)].
- **Level-2 PSC / X-Pact® model drift** — incorrect pass-schedule on a new grade. S=6, O=4, D=5 [Source: [SMS – X-Pact PSC](https://www.sms-group.com/en-us/press-and-media/press-releases/press-release-detail/henan-yirui-issues-fac-for-the-new-aluminum-hot-rolling-mill-from-sms-group)].
- **Strip surface inspection system (AMETEK SmartView etc.)** — lens fouling, LED bar drift, DCL failure → missed defect, customer claim. S=6, O=5, D=5 [Source: [AMETEK – Aluminum hot strip inspection](https://www.ameteksurfacevision.com/applications/aluminum/aluminum-hot-hot-strip-mill)].

### 3.16 Electrical Distribution

- MV transformer (oil-filled): DGA (dissolved gas analysis) trending; bushing insulation; tap-changer. S=9, O=2, D=3.
- MV switchgear: breaker wear, VCB interrupter wear; partial discharge. S=8, O=3, D=4.
- VFDs / cycloconverters (SINAMICS SL150, DC Master): IGBT/thyristor failure, DC-link capacitor ageing, cooling-fan wear. S=8, O=5, D=4 [Source: [Primetals – Alunorf KW5](https://www.primetals.com/press-media/news/primetals-technologies-to-modernize-drive-technology-in-aluminum-cold-rolling-mill-for-alunorf)].
- Aux 480V distribution and LV UPS: battery ageing, harmonic resonance. S=5, O=6, D=5.

### 3.17 Roll Shop Interface

Grinder quality directly drives mill quality: Alta Solutions documents a 7% mill-production increase plus elimination of unscheduled BUR changes when grinder vibration monitoring was added [Source: [Alta Solutions – Roll grinder monitoring](https://www.altasol.com/roll-grinder-monitoring/)]. Vibremo case studies confirm the same for aluminum plants [Source: [Vibremo – Mill and grinder chatter](https://www.vibremo.com/chatter-mark-investigation)].

- Grinder wheel imbalance / chatter on roll surface → transferred to strip as chatter marks (1st, 3rd, 5th octave) [Source: [Modern Metals – Reducing chatter](https://www.modernmetals.com/17498-reducing-chatter.html)]. S=7, O=6, D=5. Action: GrinderMon real-time wheel vibration; in-machine wheel balance.
- Roll UT / eddy-current inspection miss — subsurface crack not detected before remount. S=9, O=3, D=5. Action: calibration blocks; automated scanning; minimum 2 inspectors.
- Bearing press damage to chock sets during chocking/de-chocking. S=5, O=6, D=6 [Source: [Innoval – Chatter investigation](https://www.innovaltec.com/chatter-cold-rolling-mill-blog/)].

### 3.18 Safety and Interlock Systems

- Fire suppression inadequate activation time — for oil-spray fires, only fuel cut-off extinguishes; suppression must be ≤10 s discharge per NFPA 12 [Source: [AXA XL PRC-17.13.1](https://axaxl.com/-/media/axaxl/files/pdfs/prc-guidelines/prc-17/prc17131aluminumrollingmillsv1.pdf?sc_lang=en&hash=410372FB5813D52444020C03526E0E8F)] [Source: [Risk Logic – Rolling mills](https://risklogic.com/rolling-mills/)]. S=10, O=2, D=4. Actions: quarterly functional test; CO₂ storage sized for ≥2 discharges; heat-detection-actuated automatic oil-pump interlocks.
- E-stop button coverage / dead-spots. S=9, O=3, D=3.
- Cellar gas detection (CO, combustible, O₂) for oil-cellar entry. S=9, O=4, D=3.

---

## 4. Typical Failure Signatures — Quick-Reference Diagnostic Codebook

| Symptom / Signature | Likely Failure | Confirming Technology |
|---|---|---|
| 3rd-octave resonance, self-excited, growing with speed | Strip-mill chatter (regenerative) | Online vibration on roll chock + strip-thickness spectrum; slow mill |
| 5th-octave barring at 500–1,000 Hz | Forced vibration from WR bearing inner-race defect, gear mesh, spindle unbalance | Envelope analysis at BPFI frequency; roll-end indicator [Source: [Innoval – Cold mill chatter](https://www.innovaltec.com/chatter-cold-rolling-mill-blog/)] |
| Ribbon fatigue marks circumferentially on spalled WR | Surface-initiated RCF | Fracture SEM; Keep tonnage per campaign below threshold |
| Beach marks at BUR chamfer | Edge work-hardening RCF | Hardness HS trending; chamfer redesign |
| Strip stripes 20–25 mm apart (Al) | WR bearing inner-race defect excited at work-roll fundamental | FFT of mill-speed-normalized vibration |
| Brown/red streak on annealed Al surface | Rolling-oil residue sintering | Emulsion cleanliness; DS system [Source: [Chalco – Al plate defects](https://www.chalcoaluminum.com/blog/aluminum-plate-defects/)] |
| Black mark on lower ingot surface | Reheat furnace water-cooled skid pickup | Hot-skid insulation check |
| Herringbone streak | Surface shearing defect from inlet plate / work roll condition [Source: [Aluminum Association – Visual Quality Characteristics](https://www.discountpdh.com/wp-content/themes/discountpdh/pdf-course/how-to-visually-detect-flaws-and-characteristics-in-rolled-aluminum.pdf)] | Surface inspection; roll surface micro-roughness |
| Zipper cracks (edge + center) | Strain concentration; 5xxx alloy; over-reduction [Source: [ResearchGate – Surface defects hot rolling](https://www.researchgate.net/publication/257337093_Occurrence_of_surface_defects_on_strips_during_hot_rolling_process_by_FEM)] | FEM validation; pass-schedule change |
| Milky gearbox oil | Water ingress through breather or seal | Karl-Fischer water test; replace breather |
| Rising motor current at constant demand (HPU pump) | Volumetric-efficiency loss → internal leak | Pump flow test |
| HDm shock-pulse rising but HDc stable | Bearing surface damage early stage | SPM HD — plan replacement within 400–800 op hours [Source: [OxMaint – Hot rolling CMMS](https://oxmaint.com/industries/steel-plant/hot-rolling-mill-maintenance-management-software)] |

---

## 5. MTBF, Availability, and Bad-Actor Benchmarks

- **Industry availability benchmark for aluminum hot rolling line:** 88–90 % typical, 93–95 % best-in-class (CMMS + CBM mature).
- **Unplanned-event frequency:** 15–25 cobbles/year at unmanaged mill; 3–8 with structured maintenance, at ~$191 k/event [Source: [OxMaint – Hot rolling CMMS](https://oxmaint.com/industries/steel-plant/hot-rolling-mill-maintenance-management-software)].
- **Gearbox/motor downtime cost (steel HSM parallels):** $125–260 k/h; catastrophic failures in the $500 k–$3 M range [Source: [OxMaint – Vibration monitoring steel mill](https://oxmaint.com/industries/steel-plant/vibration-monitoring-steel-mill-equipment)] [Source: [OxMaint – Predictive maintenance drivetrains](https://oxmaint.com/industries/steel-plant/predictive-maintenance-rolling-mill-gearboxes-drives)].
- **Novelis Oswego 2025 benchmark (real-world):** Two fires (Sept 16, 2025 and Nov 20, 2025) caused an expected **$1.3–1.6 B free-cash-flow impact** and removal of **150,000–200,000 t of flat-rolled shipments**; Ford reported up to **$2 B earnings headwind** [Source: [Automotive Logistics – Novelis Oswego restart](https://www.automotivelogistics.media/supply-chain/aluminium-supplier-novelis-expects-to-restart-hot-mill-in-summer-2026-after-fires-caused-disruption-in-2025/2607587)] [Source: [Metalnomist – Novelis Oswego delay](https://www.metalnomist.com/2026/04/novelis-oswego-mill-restart-delay.html)] [Source: [Supply Chain Dive – Novelis fire](https://www.supplychaindive.com/news/novelis-factory-closure-fire-auto-supply-chain/802410/)]. Novelis attributes contributory factors to "composition and characteristics of the coil, as well as lubricants in the mill and surrounding structure" [Source: [Novelis – Oswego update](https://novelis.com/oswego/)]. These should be used as worst-case catastrophic-loss anchors in the Severity 9–10 column.

**Classic "bad actors" in hot-mill pareto analyses (roughly Pareto 20% of assets causing 80% of downtime):**
1. Work-roll spalling / surface failure (typically #1 by frequency)
2. AGC hydraulic system (typically #1 by cobble-source with ~34% share) [Source: [OxMaint – Hot rolling CMMS](https://oxmaint.com/industries/steel-plant/hot-rolling-mill-maintenance-management-software)]
3. Roll-surface condition feedback loop (~22%)
4. Looper / tension control (~18%)
5. Cooling-system symmetry (~16%)
6. Descaler / threading / crop shear (~10%)
7. MORGOIL bearings — low frequency but extreme severity when they occur
8. Main gearbox — low frequency, extreme severity, 6–18 month lead time
9. Universal spindle cross bearings — documented halving of service life from seal breach [Source: [ScienceDirect – Universal spindle cross bearing](https://www.sciencedirect.com/science/article/abs/pii/S135063071831063X)]
10. Pinch rolls at coilers — highest-frequency failure on coiler side

---

## 6. Emerging Practices to Embed in the FMEA Layer

- **Digital twin of the hot mill** — Panagou et al. built a DT of a steel-industry rolling mill used to select maintenance-predictive sensors and run hybrid physical/simulated data in a cloud-based maintenance decision platform [Source: [arXiv – Systematic review DT PdM](https://arxiv.org/html/2509.24443v1)] [Source: [PMC – Predictive maintenance and DT](https://pmc.ncbi.nlm.nih.gov/articles/PMC11057655/)] [Source: [ScienceDirect – AI-enhanced DT in maintenance](https://www.sciencedirect.com/science/article/pii/S0278612525001815)]. For aluminum hot mills, practical DT targets are: roll thermal/stress twin for campaign optimization; AGC hydraulic twin for seal-wear RUL; emulsion twin for stability prediction.
- **AI anomaly detection and GenAI fault-signature augmentation** — deep autoencoders and CNN-RNN-attention on vibration/MCSA, cross-trained with GAN-synthesized rare-fault data, are the current frontier; Multi-Scale LSTM with multi-head self-attention has been published specifically for hot strip mill roller RUL prediction [Source: [MDPI – GenAI in AI-based DT for fault diagnosis](https://www.mdpi.com/2076-3417/15/6/3166)] [Source: [PMC – Overview PdM based on DT](https://pmc.ncbi.nlm.nih.gov/articles/PMC10070392/)] [Source: [ResearchGate – Model-Based Monitoring RUL](https://www.researchgate.net/publication/335840517_Model_Based_Monitoring_of_Dynamic_Loads_and_Remaining_Useful_Life_Prediction_in_Rolling_Mills_and_Heavy_Machinery)].
- **Wireless vibration / FBG fiber-optic sensing on mill cage bearings** — embedded FBG on support pins of backup bearings allows thermal and loading measurement where accelerometers can't survive [Source: [MDPI – Smart bearing FBG rolling mill](https://mdpi.com/2076-3417/12/9/4186/htm)].
- **PI / InfluxDB / time-series architecture** — industry direction is toward a data-lake layer receiving SCADA, Level-2, vibration, and oil-analysis streams, with condition-monitoring analytics layered on top and bi-directional hooks to SAP PM / IBM Maximo / OxMaint for auto-generated work orders [Source: [OxMaint – SAP integration](https://oxmaint.com/article/sap-integration-cmms-bridging-erp-maintenance)] [Source: [OxMaint – CMMS vs SAP PM](https://oxmaint.com/industries/steel-plant/cmms-vs-sap-pm-steel-mills-comparison)].
- **CMMS-driven roll lifecycle management** — every work roll and BUR tracked with campaign tonnage, post-grind surface measurements, UT/eddy-current crack depth history, and strip-inspection feedback; enables 8–15% campaign extension and 5–10% roll-lifecycle extension [Source: [OxMaint – Hot rolling CMMS](https://oxmaint.com/industries/steel-plant/hot-rolling-mill-maintenance-management-software)].
- **ABB / SMS / Primetals modernization pattern** — aging DC drives replaced with SINAMICS SL150 cycloconverters and DC Master; MV synchronous motors retrofitted (Novelis Oswego–ABB example) [Source: [Manufacturing Today – Novelis + ABB](https://manufacturing-today.com/news/novelis-to-increase-aluminum-recycling-uptime-with-abb-modernization/)] [Source: [Primetals – Alunorf KW5](https://www.primetals.com/press-media/news/primetals-technologies-to-modernize-drive-technology-in-aluminum-cold-rolling-mill-for-alunorf)].

---

## 7. Database Schema Cheat-Sheet for FMEA Software Ingestion

Recommended field set per FMEA row (table name: `FMEA_ItemMaster`):

1. `AssetID` (PK, string)
2. `PlantID`, `SystemID`, `SubsystemID`, `EquipmentUnitID`, `ComponentID` (FK hierarchy)
3. `ISO14224_TaxonomyLevel` (1–9)
4. `Function` (text)
5. `FunctionalFailure` (text; many-to-one with Function)
6. `FailureMode` (controlled vocabulary; ISO 14224 Table B.6)
7. `FailureMechanism` (controlled vocabulary; ISO 14224 Table B.2: wear, fatigue, corrosion, contamination, misalignment, electrical, hydraulic, etc.)
8. `FailureCause` (specific root cause text)
9. `LocalEffect`, `SystemEffect`, `PlantEffect` (separate columns)
10. `SafetyImpact`, `QualityImpact`, `ProductionImpact`, `EnvironmentalImpact` (enumerated)
11. `Severity` (1–10)
12. `Occurrence` (1–10)
13. `Detection` (1–10)
14. `ActionPriority` (H/M/L per AIAG-VDA AP matrix)
15. `CriticalityClass` (C1/C2/C3)
16. `PreventionControls_Current` (array)
17. `DetectionControls_Current` (array; must include CM technique + ISO standard reference)
18. `RecommendedActions` (array; link to work-order template)
19. `PMTask`, `PMInterval`, `PMTrigger` (calendar / tonnage / condition)
20. `PdMTechnology`, `PdMInterval`, `AlarmBand` (linked to ISO 10816-3 zones or equivalent)
21. `TypicalFailureSignature` (text; vibration freq, oil marker, thermal pattern)
22. `MTBF_Mean`, `MTBF_StdDev`, `DataQuality` (ISO 14224 data quality flag)
23. `SparePartsStrategy` (critical / insurance / stock / rotable / consumable)
24. `LeadTime_Days`, `SpareInventoryQty`
25. `SourceReferences` (array of URL / literature)
26. `LastReviewed_Date`, `ReviewerID`, `AIAG_VDA_Version`

Link tables: `FMEA_Hierarchy` for parent-child system graph; `CBM_SensorMap` linking Asset → SensorID → Tag in PI/Influx; `WorkOrder_History` linking Asset → historical breakdowns for live O rating re-calibration.

---

## 8. Final Recommendations for the Reliability Team

1. **Prioritize the top-10 bad-actor list** (Section 5) using ~12 months of CMMS breakdown + downtime data. Start RCA on the top-3 ("80/20 focus") [Source: [LCE – Steel company OEE case study](https://www.lce.com/Drilling-into-the-Data-Helps-a-Steel-Company-Reduce-Downtime-and-Improve-OEE-2364.html)] [Source: [F7i – Bad Actors in a Factory](https://f7i.ai/blog/how-to-identify-bad-actors-in-a-factory-a-reliability-engineering-framework)].
2. **Use AIAG-VDA Action Priority (not RPN)** for prioritization; enforce "S ≥ 9 = Mandatory action" rule.
3. **Impose ISO cleanliness target 16/14/11 on all AGC hydraulic oil** — the single highest-ROI control in the mill [Source: [OxMaint – Hydraulic](https://oxmaint.com/industries/steel-plant/rolling-mill-hydraulic-system-maintenance-agc-looper)].
4. **Convert mineral-oil HPUs to FM-6930 group-1 fire-resistant fluids** everywhere within 10 m of the hot strip path; install heat-actuated automatic pump interlocks and automatic foam-water deluge per AXA XL PRC.17.13.1 — the Novelis Oswego event is a direct lesson learned.
5. **Deploy SPM HD or equivalent shock-pulse monitoring** on all MORGOIL bearings, all chock bearings on WR/BUR, coiler mandrels, main-drive motor DE/NDE, and gearbox bearings.
6. **Instrument universal-spindle lube with online oil-moisture and Fe-debris sensors** — seal failure is a repeat bad-actor pattern with service-life reductions of 50%.
7. **Instrument main-drive motors with MCSA** (no sensor on the motor itself; current transformers in the drive cabinet) — cost-effective for large-HP aluminum-mill drives.
8. **Track every work-roll and BUR by serial number** with tonnage, grinds, UT crack depth, and linked strip-quality feedback for campaign optimization.
9. **Re-calibrate pyrometers seasonally** using contact thermocouple cross-checks, and deploy multi-wavelength (Williamson MWx Dynamic ESP or AMETEK Land SPOT AL) to eliminate alloy-thickness offset tables.
10. **Integrate CMMS (SAP PM / Maximo / OxMaint) with condition-monitoring middleware** so that CBM alerts auto-generate planned work orders before they become breakdown events — this is the architectural lever that gets a modern aluminum hot mill from 88% to 93–95% availability.
11. **Formally link quality defects to maintenance root causes** in a closed-loop process: chatter mark → grinder/mill bearing diagnosis; streak → emulsion or roll-coat; off-gauge → AGC; edge crack → pass-schedule/homogenization.
12. **Conduct an FMEA refresh every 12 months or after any Severity-9 event**, per AIAG-VDA, updating occurrence ratings from actual CMMS data rather than expert opinion.

---

*This knowledge base is intended as structured input data for an FMEA software system. Each line item can be directly ingested into the relational schema in Section 7; the anchor tables in Section 1 should be loaded as the site-calibrated S/O/D look-ups. The aluminum-specific mechanisms, signatures, and controls are the key departure points from generic steel-mill FMEA templates and should be preserved in any adaptation. Ratings shown are typical mid-range values for a well-instrumented aluminum hot mill and must be re-rated against plant-specific CMMS failure history during implementation.*