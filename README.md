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

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_API_KEY` | Google AI Studio API key for Gemini |

## License

MIT

---

Built by **FrazaoTech** — Reliability Engineering, reimagined.
