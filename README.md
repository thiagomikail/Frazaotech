# FrazaoTech — Reliability Engineering FMEA Platform

A dynamic, AI-assisted Failure Mode and Effects Analysis (FMEA) application for reliability engineers. Built to replace static spreadsheets with an interactive, real-time tool following **AIAG-VDA 2026** standards.

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
git clone https://github.com/YOUR_USERNAME/FrazaoTech.git
cd FrazaoTech

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
Interface in Portuguese and English.

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

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_API_KEY` | Google AI Studio API key for Gemini (FMEA and PetriPLC) |

## License

MIT

---

Built by **FrazaoTech** — Reliability Engineering, reimagined.
