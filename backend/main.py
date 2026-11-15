"""
IGNIS-PSI FastAPI Backend.

Loads (or builds on startup) `backend/data/indexed_psi.json` and exposes:
- GET  /api/health
- GET  /api/studies
- GET  /api/hardware
- POST /api/rank
- POST /api/simulate
- POST /api/compare
- POST /api/ask
- GET  /api/detection-suppression
- GET  /api/spinoffs
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR.parent / ".env")

from engine.interpreter import SIInterpreter  # noqa: E402
from engine.ranker import MultiFactorRanker  # noqa: E402
from engine.simulator import ATMOSPHERE_PRESETS, simulate_habitat  # noqa: E402
from ingest_psi import OUT_PATH, run_ingestion  # noqa: E402

app = FastAPI(
    title="IGNIS-PSI API",
    description="SI-Powered Microgravity Combustion & Exploration Fire Safety Intelligence Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_or_ingest() -> dict[str, Any]:
    if OUT_PATH.exists():
        with OUT_PATH.open("r", encoding="utf-8") as f:
            return json.load(f)
    return run_ingestion()


DATASET = _load_or_ingest()
RANKER = MultiFactorRanker(DATASET["studies"], DATASET["chunks"])
INTERPRETER = SIInterpreter(DATASET["studies"], RANKER)


class RankRequest(BaseModel):
    query: str = ""
    o2_pct: float | None = Field(default=None, ge=10.0, le=100.0)
    pressure_psia: float | None = Field(default=None, ge=1.0, le=80.0)
    airflow_cms: float | None = Field(default=None, ge=0.0, le=50.0)
    safety_pillar: str | None = None
    fuel_phase: str | None = None
    hardware: str | None = None
    limit: int = Field(default=19, ge=1, le=50)


class SimulateRequest(BaseModel):
    o2_pct: float = Field(default=34.0, ge=14.0, le=100.0)
    pressure_psia: float = Field(default=8.2, ge=4.3, le=14.7)
    airflow_cms: float = Field(default=10.0, ge=0.0, le=40.0)
    gravity_target: str = Field(default="1/6g")


class CompareRequest(BaseModel):
    study_ids: list[str] = Field(min_length=1, max_length=3)


class AskRequest(BaseModel):
    question: str = Field(min_length=2)
    o2_pct: float | None = None
    pressure_psia: float | None = None
    airflow_cms: float | None = None
    gravity_target: str | None = None


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "counts": DATASET["counts"],
        "generated_at": DATASET["generated_at"],
        "gemini_enabled": INTERPRETER.client is not None,
    }


@app.get("/api/studies")
def list_studies() -> dict[str, Any]:
    return {
        "counts": DATASET["counts"],
        "studies": DATASET["studies"],
    }


@app.get("/api/hardware")
def list_hardware() -> dict[str, Any]:
    return {
        "hardware_racks": DATASET["hardware_racks"],
    }


@app.post("/api/rank")
def rank_studies(req: RankRequest) -> dict[str, Any]:
    results = RANKER.rank_studies(
        query=req.query,
        o2_pct=req.o2_pct,
        pressure_psia=req.pressure_psia,
        airflow_cms=req.airflow_cms,
        safety_pillar=req.safety_pillar,
        fuel_phase=req.fuel_phase,
        hardware=req.hardware,
        limit=req.limit,
    )
    return {
        "total_matched": len(results),
        "results": results,
    }


@app.post("/api/simulate")
def simulate(req: SimulateRequest) -> dict[str, Any]:
    sim = simulate_habitat(
        o2_pct=req.o2_pct,
        pressure_psia=req.pressure_psia,
        airflow_cms=req.airflow_cms,
        gravity_target=req.gravity_target,
    )
    ranked_evidence = RANKER.rank_studies(
        query="flammability spread extinction atmosphere oxygen airflow",
        o2_pct=req.o2_pct,
        pressure_psia=req.pressure_psia,
        airflow_cms=req.airflow_cms,
        limit=5,
    )
    return {
        **sim,
        "ranked_evidence": ranked_evidence,
    }


@app.get("/api/presets")
def get_presets() -> dict[str, Any]:
    return {"presets": ATMOSPHERE_PRESETS}


@app.post("/api/compare")
def compare(req: CompareRequest) -> dict[str, Any]:
    return INTERPRETER.compare_studies(req.study_ids)


@app.post("/api/ask")
def ask_si_engineer(req: AskRequest) -> dict[str, Any]:
    return INTERPRETER.ask_engineer(
        question=req.question,
        o2_pct=req.o2_pct,
        pressure_psia=req.pressure_psia,
        airflow_cms=req.airflow_cms,
        gravity_target=req.gravity_target,
    )


@app.get("/api/detection-suppression")
def detection_suppression() -> dict[str, Any]:
    """Structured Detection (SAME/DAFT) & Suppression (FLEX-2/CFI/BASS-II/MIST) telemetry."""
    same_metrics = DATASET["same_eird_metrics"]
    return {
        "aerosol_detection": {
            "source": same_metrics["source"],
            "crossover_um": same_metrics["crossover_threshold_um"],
            "detector_physics": same_metrics["detector_physics"],
            "particulate_comparison": same_metrics["particulate_comparison"],
            "dust_vs_smoke_challenge": {
                "ard_test_standard": "Arizona Red Dust (ARD) aerosolized with GN2 in 15-liter Mylar bags (analog for Lunar regolith / cabin nuisance dust)",
                "ptrak_modification": "TSI P-Trak condenser tube redesigned to use capillary forces for recycling isopropyl alcohol; mercury orientation switch removed (PSI-47 DAFT/DAFT-2).",
                "coagulation_shift": "In 0g, lack of buoyancy extends smoke residence time (tens of minutes), causing nucleation, condensation & coagulation into larger droplets/aggregates (223–976 nm) that push past the 0.2 µm ionization threshold and confuse STS particle-size separators.",
                "citations": [
                    "[PSI-47 | DAFT / DAFT-2 | 10.60555/ztgj-d202]",
                    "[PSI-102 | SAME | 10.60555/gd4k-8h62]",
                    "[PDF-SAMER | SAME / SAME-R | NP-2015-10-034-JSC pp. 26, 35, 45]",
                ],
            },
            # Chart-ready size distribution & detector response comparison (nm)
            "detector_response_curve": [
                {"diameter_nm": 30, "ionization_resp": 0.78, "photoelectric_resp": 0.04, "regime": "1g Flaming Soot"},
                {"diameter_nm": 75, "ionization_resp": 0.85, "photoelectric_resp": 0.14, "regime": "0g Kapton Primary (76 nm)"},
                {"diameter_nm": 136, "ionization_resp": 0.72, "photoelectric_resp": 0.36, "regime": "0g Teflon Primary (136 nm)"},
                {"diameter_nm": 200, "ionization_resp": 0.55, "photoelectric_resp": 0.55, "regime": "0.2 µm Crossover"},
                {"diameter_nm": 350, "ionization_resp": 0.38, "photoelectric_resp": 0.79, "regime": "0g Coagulated Smoke"},
                {"diameter_nm": 662, "ionization_resp": 0.24, "photoelectric_resp": 0.94, "regime": "0g Teflon Aggregate (662 nm)"},
                {"diameter_nm": 976, "ionization_resp": 0.17, "photoelectric_resp": 0.98, "regime": "0g Candle Aggregate (976 nm)"},
                {"diameter_nm": 1500, "ionization_resp": 0.12, "photoelectric_resp": 0.99, "regime": "ARD / Lunar Regolith Dust (>1 µm)"},
            ],
        },
        "cool_flames_reignition": {
            "summary": (
                "FLEX-2 (PSI-68), CFI (PSI-39), and ACME CFI-G (PSI-159) revealed that after visible hot flames radiatively extinguish in 0g, "
                "low-temperature (~500–800 K) invisible 'cool flames' can continue burning for prolonged durations and spontaneously re-ignite!"
            ),
            "fuels_tested": [
                "n-heptane & n-decane droplets (FLEX-2, PSI-68, 0.5–3.0 atm)",
                "n-dodecane, iso-dodecane & farnesane droplets (CFI, PSI-39, 0.25–5.0 atm)",
                "Propane, n-butane, n-pentane spherical porous burners (ACME CFI-G, PSI-159)",
            ],
            "operational_implications": [
                "Visual confirmation or standard visible-spectrum cameras CANNOT verify fire extinction in microgravity.",
                "UV / OH* chemiluminescence or radiometric sensors + post-suppression gas monitoring are mandatory before declaring fire-out.",
                "Unburned fuel vapor cloud persists around droplets/surfaces after hot extinction, risking delayed secondary ignition.",
            ],
            "citations": [
                "[PSI-39 | CFI | 10.60555/m6pj-a914]",
                "[PSI-68 | FLEX-2 | 10.60555/byp8-h018]",
                "[PSI-159 | ACME CFI-G | 10.60555/cyt1-kh64]",
                "[GUIDE-COOL-FLAMES | NP-2015-10-034-JSC p. 34]",
            ],
        },
        "suppression_tradeoffs": [
            {
                "agent": "Nitrogen (N2) Local Jet",
                "mechanism": "Oxygen vitiation / inerting",
                "microgravity_behavior": "BASS-II (PSI-25) showed local N2 jets can ENTRAIN cabin air into the reaction zone, transiently pushing velocity toward ~10 cm/s and intensifying flames before extinguishing.",
                "toxicity_eclss_impact": "Safe for ECLSS (already 78% of air), but requires high mass & sealed compartment flooding rather than pointed nozzle jets.",
                "rating": "Caution (Jet Entrainment Risk)",
                "citation": "[PSI-25 | BASS-II | 10.60555/4qc4-de67]",
            },
            {
                "agent": "Carbon Dioxide (CO2) Extinguisher",
                "mechanism": "Oxygen displacement + moderate heat capacity",
                "microgravity_behavior": "Used historically on ISS; FLEX-2 & BRE tested O2/CO2 extinction limits. However, CO2 gas jets disperse rapidly in 0g and leave toxic CO2 concentrations.",
                "toxicity_eclss_impact": "High crew asphyxiation/hypercapnia risk in closed habitats; heavy ECLSS scrubbing burden post-discharge.",
                "rating": "Legacy (Being Replaced on ISS)",
                "citation": "[PSI-68 | FLEX-2 | 10.60555/byp8-h018] & [PDF-MIST | p. 26]",
            },
            {
                "agent": "Helium (He) Dilution",
                "mechanism": "High thermal diffusivity / radiative-convective quenching",
                "microgravity_behavior": "Tested in CFI (PSI-39) & FLEX-2 (PSI-68); Helium's high thermal conductivity alters droplet Lewis number and cool-flame transition limits compared to N2.",
                "toxicity_eclss_impact": "Non-toxic, low molecular weight, but leaks easily through seals and alters crew speech/thermal comfort.",
                "rating": "Research / Specialty Diluent",
                "citation": "[PSI-39 | CFI | 10.60555/m6pj-a914] & [PSI-68 | FLEX-2 | 10.60555/byp8-h018]",
            },
            {
                "agent": "Fine Water Mist (ISS Portable PFE)",
                "mechanism": "Latent heat of vaporization + local steam O2 displacement",
                "microgravity_behavior": "Validated on STS-107 MIST (T. McKinnon); droplets remain suspended in 0g rather than falling out, maximizing cooling surface area.",
                "toxicity_eclss_impact": "Non-toxic, zero Halon byproducts, minimal ECLSS burden (humidity condensed by cabin heat exchangers). First 2 deployed to ISS Dec 2015.",
                "rating": "Recommended (ISS Standard)",
                "citation": "[PDF-MIST | MIST (STS-107) | NP-2015-10-034-JSC p. 26]",
            },
        ],
    }


@app.get("/api/spinoffs")
def spinoffs() -> dict[str, Any]:
    return {"spinoffs": INTERPRETER.get_spinoffs()}


@app.get("/api/briefing-context")
def briefing_context() -> dict[str, Any]:
    """Historical spaceflight fire incidents mapped to PSI evidence & challenge scope."""
    return {
        "scope_note": (
            "Scope Boundary: High-velocity combustion inside rocket engines and propellants is effectively independent of gravity "
            "and outside PSI's scope; IGNIS-PSI focuses on habitable crewed environments (spacecraft, ISS, Moon Bases, pressurized rovers, Mars habitats)."
        ),
        "historical_incidents": [
            {
                "id": "apollo-1",
                "year": "1967",
                "mission": "Apollo 1",
                "event": "Fatal pre-launch cabin fire in a 100% pure-oxygen pressurized spacecraft.",
                "physics_lesson": "Pure/enriched O2 without nitrogen thermal ballast causes catastrophic flash spread across Velcro, wiring, and fabrics.",
                "psi_links": ["PSI-20", "PSI-159", "PSI-98"],
            },
            {
                "id": "apollo-13",
                "year": "1970",
                "mission": "Apollo 13",
                "event": "Oxygen tank rupture & electrical insulation fire risk en route to the Moon.",
                "physics_lesson": "Demonstrated extreme severity of stored O2 energy and polymer wire-insulation pyrolysis in low-g spacecraft.",
                "psi_links": ["PSI-102", "PSI-68", "PSI-39"],
            },
            {
                "id": "mir-1997",
                "year": "1997",
                "mission": "Mir Space Station",
                "event": "Solid-fuel oxygen generator (SFOG) malfunction ignited an intense onboard fire; crew survived using extinguishers & respirators.",
                "physics_lesson": "Elevated local O2 + ventilation airflow drives intense microgravity burning; led directly to ISS Water Mist Extinguisher (STS-107) and BASS-II suppression research.",
                "psi_links": ["PDF-MIST", "PSI-25", "PSI-20"],
            },
            {
                "id": "artemis-ii",
                "year": "2026",
                "mission": "Artemis II",
                "event": "Smoke alarm activated ~80,000 miles from Earth — illustrating zero margin for nuisance dust alarms or delayed pyrolysis detection far from home.",
                "physics_lesson": "SAME/SAME-R & DAFT-2 distinguish genuine low-g smoke coagulation (>0.2 µm) from spacecraft/lunar regolith nuisance dust.",
                "psi_links": ["PSI-102", "PSI-47", "PDF-SAMER"],
            },
        ],
    }

