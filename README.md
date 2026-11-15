# IGNIS-PSI — Microgravity Combustion & Exploration Fire Safety Intelligence Dashboard

Built for the **2026 NASA Space Apps Challenge ("Flame in Freefall")**.

IGNIS-PSI ingests real NASA Physical Sciences Informatics (PSI) ISA-Tab metadata (`PSI-20`, `PSI-25`, `PSI-39`, `PSI-47`, `PSI-60`, `PSI-62`, `PSI-68`, `PSI-98`, `PSI-99`, `PSI-100`, `PSI-102`, `PSI-106`, `PSI-159`) and NASA's *A Researcher's Guide to ISS Combustion Science* (`NP-2015-10-034-JSC`) plus the *SAME EIRD* into an explicit context-injected scientific retrieval, ranking, and exploration-atmosphere simulation workbench.

## Architecture

- **Data Ingestion Pipeline (`backend/ingest_psi.py`)**: Parses tab-delimited NASA ISA-Tab `i_Investigation.txt` files and NASA PDFs, extracting exact DOIs, PIs, publications, hardware, objectives, hypotheses, approaches, and research impacts, and prepending structured telemetry headers (`[Study_ID | Acronym | Hardware | Safety_Pillar | Fuel_Phase | O2_Range | Pressure_psia | Airflow_cm_s | Gravity_Regime]`).
- **SI Scientific Ranking & Predictive Modeling Backend (`backend/`)**:
  - `engine/ranker.py`: Multi-factor hybrid relevance ranker combining TF-IDF/cosine similarity with physical parameter proximity (O2%, pressure, airflow cm/s, fuel phase, safety pillar).
  - `engine/simulator.py`: Exploration Atmosphere & Partial-Gravity Bounding Simulator (`14.7 psia/21% O2` Earth/ISS, `10.2 psia/26.5% O2` Intermediate, `8.2 psia/34% O2` Lunar Habitat/Rover, `4.3 psia/100% O2` Spacesuit, `0–40 cm/s` BASS-II Goldilocks ventilation curve, and 0g–1g bounding envelopes with ACME E-FIELD Flames proxies for 1/6g Lunar and 3/8g Martian targets).
  - `engine/interpreter.py`: Gemini-powered (`google-genai`, with deterministic structured fallback) side-by-side comparison, SI Engineer Q&A, and terrestrial spin-off synthesis grounded in `[PSI-XX | Acronym | DOI]` citations.
- **Mission Control Engineering Dashboard (`frontend/`)**: React + Vite + Tailwind CSS + Recharts + Lucide telemetry workbench with 4 interactive tabs and a persistent "Ask SI Engineer" citation drawer.

## Quickstart

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python ingest_psi.py
python -m unittest discover -s tests -v
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Ingested NASA Data Summary
- **13 PSI ISA-Tab Investigations**: `PSI-20` (ACME BRE), `PSI-25` (BASS-II), `PSI-39` (CFI), `PSI-47` (DAFT/DAFT-2), `PSI-60` (SPICE-Analysis), `PSI-62` (BASS-FGM), `PSI-68` (FLEX-2), `PSI-98` (SAFFIRE-I), `PSI-99` (SAFFIRE-II), `PSI-100` (SAFFIRE-III), `PSI-102` (SAME), `PSI-106` (SLICE), `PSI-159` (ACME CFI-G)
- **6 ISS Guide Supplementary Studies**: `PDF-EFIELD` (ACME E-FIELD Flames), `PDF-MIST` (Water Mist Extinguisher STS-107), `PDF-SAMER` (SAME/SAME-R), `PDF-FLAME-DESIGN`, `PDF-SFLAME`, `PDF-CLD`
- **78 Explicit Context-Injected Chunks**, **6 Hardware Racks** (`CIR`, `MDCA`, `ACME`, `SoFIE`, `MSG`, `SAFFIRE`), and **140 Peer-Reviewed Publications/DOIs**.

