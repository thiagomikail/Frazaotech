# OT Workbench

Tools for operational-technology engineers, on one site. The home page at `/` links to each one:

- **FMEA** at `/fmea/` — AI-assisted Failure Mode and Effects Analysis for reliability engineers, following **AIAG-VDA 2026**.
- **PetriPLC** at `/petri/` — describe a machine, simulate its Petri net, generate IEC 61131-3 code ([below](#petriplc--petri)).
- **Yield** at `/yield/` — furnace energy and regenerative-combustion diagnostics ([below](#yield--yield)).

All the pages share one look (`src/theme.css`), in the spirit of an industrial HMI (ISA-101): gray surfaces,
square corners, a dark title bar, and color only where it means something (blue for selected, green, amber
and red for state). Light or dark follows the device. Text is Barlow, numbers Roboto Mono, both bundled from
Fontsource so the pages look the same on every machine. Components use the theme's names (`bg-surface`,
`text-ink-2`, `bg-accent`…); the Tailwind palette is off.

The home page's hero is a 3D "energy terrain" drawn with three.js (`src/home/terrain.ts`): hot spots rise
and fade while points of data drift across. It loads after the page, pauses when off screen, and shows a
single still frame to visitors who asked their system to reduce motion.

The FMEA was built to replace static spreadsheets with an interactive, real-time tool.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Tailwind](https://img.shields.io/badge/TailwindCSS-4-cyan) ![Gemini](https://img.shields.io/badge/Gemini_AI-2.5-orange)

## Features

- **Three-Pane Dashboard** — Analysis Tree (system hierarchy), FMEA Worksheet (grid view), and AI Assistant panel
- **Critical Risks Dashboard** — Plant-level overview highlighting high-priority action items and critical severities
- **AIAG-VDA Compliant** — Automatic RPN calculation and Action Priority (H/M/L) per 2026 lookup tables with color-coded cells
- **SmartSuggest AI** — Real-time failure mode brainstorming powered by Google Gemini with prompt injection protection
- **Word Import** — Upload `.docx` documents and parse FMEA data via AI
- **Form View Editing** — Double-click any row to open a clean modal editor

## Pre-loaded Knowledge Base

Ships with a comprehensive **Aluminum Hot Rolling Mill FMEA** containing 75 failure modes across 12 major systems:

| System | Key Components |
|--------|---------------|
| Reheat Furnace | Walking Beam, Burners, Skid System |
| Reversing Mill | Work Rolls, MORGOIL Bearings, Housing |
| Hydraulic Systems | AGC, HGC, HPU |
| Finishing Tandem | Work Rolls, Looper, Edge Drop Control |
| Main Drive Line | Motor, Gearbox, Universal Spindles |
| Emulsion System | Chemistry, Spray Headers, Filtration |
| Automation | X-ray Gauge, Shape Meter, L2 Setup |
| Safety | Fire Suppression, E-Stop, Gas Detection |

## Quick Start

```bash
# Clone the repository
git clone <repository-url> ot-workbench
cd ot-workbench

# Install dependencies
npm install

# Configure your Google AI API key
cp .env.example .env.local
# Edit .env.local and add your key from https://aistudio.google.com/apikey

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 4 |
| AI | Google Gemini API (direct fetch, no SDK dependency) |
| Document Parsing | Mammoth.js |

## Project Structure

```
src/
├── components/
│   ├── centerPane/    # FMEA Worksheet, Dashboard, Form Modal
│   ├── leftPane/      # Analysis Tree (system hierarchy)
│   ├── rightPane/     # SmartSuggest AI panel
│   └── layout/        # Toolbar
├── context/           # FMEAContext (state management)
├── types/             # TypeScript interfaces
└── utils/             # Calculations, LLM integration
```

## PetriPLC — `/petri/`

A second tool on the same site: describe a machine in plain language, get an
interpreted Petri net, play with it, check it, and generate IEC 61131-3 code.
Interface in English; the assistant answers in the language you write in.

1. **Describe** — the assistant (Gemini) turns the description into a net:
   places carry the machine state and switch outputs on, transitions fire on
   input conditions (`start AND NOT estop`) and on-delays. Ask for changes in
   the same chat; every change can be undone.
2. **Simulate** — click a transition to fire it (the inputs it needs switch on
   by themselves), or run scans and toggle sensors. Timers, priorities,
   capacities and inhibitor arcs behave as in the PLC.
3. **Check** — reachability analysis: bounded, safe, deadlock-free,
   reversible, dead transitions, token conflicts and who wins them.
4. **Generate** — tick the targets: IEC 61131-3 ST (CODESYS, TwinCAT…),
   Siemens TIA Portal SCL, Rockwell Studio 5000 ST, PLCopen XML.

The generated code runs the simulator's exact scan algorithm (consume at once,
produce at the end of the scan, priority order). Places that provably never
hold more than one token become `BOOL`, the rest `INT`.

Four examples work without an API key. The key is the same
`VITE_GOOGLE_API_KEY`; a user can also paste their own key, kept only in their
browser. Like the FMEA, the key reaches the browser — move the Gemini call
behind a server function before this becomes a product.

```bash
npm run dev            # then open http://localhost:5173/petri/
npm run test:petri     # model, generated ST vs simulator (side by side), Gemini client
npm run test:petri:e2e # the app in Chrome; CHROME_PATH for a non-Mac Chrome
```

`tests/petri/equivalence.test.ts` runs the generated ST through a small
interpreter next to the simulator on every example and 400 random nets and
compares marking, outputs and firings after every scan.
`tests/petri/dump-code.ts <dir>` writes every example in every dialect, for
external checks (the ST parses with [blark](https://github.com/klauer/blark),
the XML validates against the PLCopen TC6 2.01 schema).

## Yield — `/yield/`

Energy and production for melting and rolling furnaces: where the energy goes,
how well the regenerative burners are firing, when to produce, and what the
shift and the year cost. It runs on a demo melt shop (three sidewell furnaces
and a rotary kiln); there is no backend and no key. Moved here from its own
repository (`thiagomikail/Yield`) in October 2026.

| Tab | The question it answers |
|---|---|
| **Monitor** | where the energy is going now, asset by asset |
| **Combustion** | how well each regenerative burner pair fires, what to do, what can fail |
| **Optimization** | when to produce, given the hourly energy price |
| **Reports** | what happened in the shift and in the year |

**Combustion score.** Each burner pair gets 0–100 from the US DOE Process
Heating *available heat* method: natural-gas enthalpy, minus what leaves
through the stack, plus the preheated-air credit. Calibration: a 1150 °C
furnace on cold air gives 47.2 % available heat (DOE table ≈ 47 %), and the
regenerative gain over cold air is 44 % (RCB literature: 40–50 %).

| Axis | Weight | Reads |
|---|---|---|
| Thermal recovery | 30 | regenerator effectiveness (ε) |
| Combustion control | 25 | O₂ in the exhaust / excess air |
| Media bed integrity | 20 | bed ΔP and stack temperature |
| Reversal cycle | 15 | reversal time and A/B imbalance |
| Emissions | 10 | CO and NOx corrected to 3 % O₂ |

The action plan is not fixed text: each item comes from an axis below target,
and its dollar value from recomputing available heat with that parameter
fixed. That is why the simulator works — moving a slider redoes the plan.

**Live FMEA.** 14 failure modes of regenerative burners (reversal valve,
ceramic bed, burner, air control, instrumentation, flame safety, emissions),
AIAG/VDA scales. Occurrence is not frozen: each mode has an
`evidence(reading, analysis)` function that looks for its signature in the
readings, so RPNs rise and reorder as the plant degrades. S ≥ 9 is flagged
regardless of RPN. The full matrix exports CSV (with BOM, opens in Excel).

The engine is pure JavaScript, checkable without the interface:

```bash
node --input-type=module -e "
import { REGEN_SYSTEMS } from './src/yield/data/regenerativeData.js';
import { analyseSystem } from './src/yield/lib/combustion.js';
console.log(analyseSystem(REGEN_SYSTEMS[1].reading).score.total); // 61.9
"
npm run test:yield:e2e   # every tab, the modals, the simulator and the FMEA in Chrome
```

Charts and SVG take their colors from `src/yield/lib/colors.js` (attributes
need real values, so the appearance is picked in JS); everything else uses the
theme classes and the building blocks in `src/yield/components/ui.jsx`.
Recharts' `<Sankey>` calls `data.nodes.map()` without checking anything:
`SankeyDiagram` validates the shape before rendering.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_API_KEY` | Google AI Studio API key for Gemini (FMEA and PetriPLC) |

## License

MIT

---

**OT Workbench** — tools for the people who keep plants running.
