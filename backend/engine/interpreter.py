"""
SI Synthesis & Comparison Engine (IGNIS-PSI).

Uses Google Gemini (`google-genai`) when GEMINI_API_KEY is configured, with a
deterministic, physically grounded structured fallback when offline or unkeyed.
Always cites exact `[Study_ID | Acronym | DOI]` identifiers.
"""

from __future__ import annotations

import os
from typing import Any

try:
    from google import genai
except Exception:  # pragma: no cover
    genai = None  # type: ignore

from engine.ranker import MultiFactorRanker


TERRESTRIAL_SPINOFFS: list[dict[str, Any]] = [
    {
        "id": "water-mist-extinguishers",
        "title": "Fine-Water-Mist Fire Extinguishers (Replacing Halon & CO2)",
        "category": "Suppression Technology",
        "earth_sector": "Aviation, Data Centers, Maritime, Museums, Hospitals",
        "microgravity_discovery": (
            "STS-107 Water Mist Fire Suppression (MIST) measured how fine water droplet diameter and mist mass concentration "
            "quench premixed flames without buoyancy sedimentation. Combined with BASS-II (PSI-25) N2 entrainment insights and FLEX-2 (PSI-68) "
            "diluent trade-offs, NASA proved fine mist outperforms gaseous CO2 in enclosed habitats without toxic Halon byproducts."
        ),
        "earth_impact": (
            "Certified non-toxic portable water-mist extinguishers (first launched to ISS Dec 2015 replacing CO2 units) and catalyzed "
            "terrestrial fine-mist suppression systems replacing ozone-depleting Halon in aircraft cargo bays, server rooms, and submersibles."
        ),
        "citations": [
            {"study_id": "PDF-MIST", "acronym": "MIST (STS-107)", "doi": "NP-2015-10-034-JSC p. 26"},
            {"study_id": "PSI-25", "acronym": "BASS-II", "doi": "10.60555/4qc4-de67"},
            {"study_id": "PSI-68", "acronym": "FLEX-2", "doi": "10.60555/byp8-h018"},
        ],
    },
    {
        "id": "nuisance-free-smoke-detectors",
        "title": "Nuisance-Free Smoke vs. Dust Detectors (Mining, Submarines & Lunar Habitats)",
        "category": "Detection & Aerosol Diagnostics",
        "earth_sector": "Underground Mining, Submarines, Cleanrooms, Smart Buildings",
        "microgravity_discovery": (
            "SAME (PSI-102) & SAME EIRD showed 0g pyrolysis doubles primary smoke diameters (Kapton: 76 nm vs 35 nm; Teflon: 136 nm vs 75 nm; "
            "Candle aggregates: 976 nm vs 265 nm) across the 0.2 µm ionization/photoelectric crossover. DAFT/DAFT-2 (PSI-47) modified a TSI P-Trak "
            "with a capillary isopropanol wick and tested Arizona Red Dust (ARD) aerosol standards in 15-L Mylar bags."
        ),
        "earth_impact": (
            "Enables multi-moment optical + condensation-nuclei smoke discriminators for submarines, underwater labs, coal/hard-rock mines, "
            "and dusty industrial bays that eliminate false dust alarms while detecting smoldering electrical fires early."
        ),
        "citations": [
            {"study_id": "PSI-102", "acronym": "SAME", "doi": "10.60555/gd4k-8h62"},
            {"study_id": "PSI-47", "acronym": "DAFT / DAFT-2", "doi": "10.60555/ztgj-d202"},
            {"study_id": "PDF-SAMER", "acronym": "SAME / SAME-R", "doi": "NP-2015-10-034-JSC pp. 26, 35, 45"},
        ],
    },
    {
        "id": "firefighter-gear-and-wildfire-models",
        "title": "Firefighter Turnout Gear, Air Tanks & Next-Gen Fire Spread Models",
        "category": "Personal Protective Equipment & Wildfire Safety",
        "earth_sector": "Municipal Fire Services, Wildland Firefighting, Mass Transit",
        "microgravity_discovery": (
            "BASS-II (PSI-25), BASS-FGM (PSI-62), and SAFFIRE-I/II/III (PSI-98, PSI-99, PSI-100) tested Nomex, Sibal (75% cotton/25% fiberglass, "
            "0.94 m × 0.40 m), silicone, and PMMA flame spread at 0–40 cm/s, exposing non-conservative 1g flammability tests and validating FGM/LES fire models."
        ),
        "earth_impact": (
            "Refines heat-flux and flame-retardant textile screening (Nomex/composite fabrics), informs lightweight high-pressure breathing air cylinders "
            "and thermal-protective firefighter gear, and improves computer models for building fires and wind-driven wildfires."
        ),
        "citations": [
            {"study_id": "PSI-25", "acronym": "BASS-II", "doi": "10.60555/4qc4-de67"},
            {"study_id": "PSI-98", "acronym": "SAFFIRE-I", "doi": "10.60555/0t15-1z43"},
            {"study_id": "PSI-99", "acronym": "SAFFIRE-II", "doi": "10.60555/2chp-m469"},
            {"study_id": "PSI-62", "acronym": "BASS-FGM", "doi": "10.60555/e9xp-ex83"},
        ],
    },
    {
        "id": "clean-hcci-engines-and-burners",
        "title": "Cool-Flame Chemistry for Ultra-Clean HCCI Engines & Low-NOx Burners",
        "category": "Clean Energy & Propulsion",
        "earth_sector": "Automotive HCCI Engines, Aviation Biofuels, Industrial Furnaces",
        "microgravity_discovery": (
            "FLEX-2 (PSI-68), CFI (PSI-39), and ACME CFI-G (PSI-159) discovered and sustained steady-state low-temperature cool flames after hot-flame "
            "extinction in n-dodecane, iso-dodecane, propane, butane, and pentane. SLICE (PSI-106), SPICE (PSI-60), and ACME Flame Design isolated soot-free "
            "diffusion flame regimes free of buoyant turbulence."
        ),
        "earth_impact": (
            "Provides clean chemical-kinetics benchmarks to raise internal combustion thermal efficiency from ~38% toward ~60% via ultra-lean HCCI/low-temperature "
            "combustion while slashing soot and NOx emissions in industrial burners and jet fuels."
        ),
        "citations": [
            {"study_id": "PSI-39", "acronym": "CFI", "doi": "10.60555/m6pj-a914"},
            {"study_id": "PSI-68", "acronym": "FLEX-2", "doi": "10.60555/byp8-h018"},
            {"study_id": "PSI-159", "acronym": "ACME CFI-G", "doi": "10.60555/cyt1-kh64"},
            {"study_id": "PSI-106", "acronym": "SLICE", "doi": "10.60555/pm12-rg61"},
        ],
    },
]


class SIInterpreter:
    def __init__(self, studies: list[dict[str, Any]], ranker: MultiFactorRanker) -> None:
        self.studies = studies
        self.study_by_id = {s["study_id"]: s for s in studies}
        self.ranker = ranker
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.client = genai.Client(api_key=self.api_key) if (genai and self.api_key) else None

    def _call_gemini(self, prompt: str) -> str | None:
        if not self.client:
            return None
        try:
            resp = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            text = getattr(resp, "text", None)
            return text.strip() if text else None
        except Exception:
            return None

    def compare_studies(self, study_ids: list[str]) -> dict[str, Any]:
        selected = [self.study_by_id[sid] for sid in study_ids if sid in self.study_by_id][:3]
        if not selected:
            return {"error": "No valid study IDs provided", "studies": [], "synthesis": ""}

        matrix = []
        for st in selected:
            matrix.append({
                "study_id": st["study_id"],
                "acronym": st["acronym"],
                "title": st["title"],
                "doi": st["doi"],
                "doi_url": st["doi_url"],
                "hardware": st["hardware"],
                "safety_pillar": st["safety_pillar"],
                "fuel_phase": st["fuel_phase"],
                "objective": st["objective"],
                "fuels_geometry": st["fuels_geometry"],
                "test_conditions": f"O2: {st['o2_range']} | Pressure: {st['pressure_psia']} | Flow: {st['airflow_cm_s']} | {st['gravity_regime']}",
                "controlled_variables": st["controlled_variables"],
                "varied_parameters": st["varied_parameters"],
                "within_study_same": st.get("within_study_same", st["controlled_variables"]),
                "within_study_varied": st.get("within_study_varied", st["varied_parameters"]),
                "sensors_diagnostics": st["sensors_diagnostics"],
                "research_impacts": st["research_impacts"],
                "top_publications": st.get("publications", [])[:3],
                "pis": [p["name"] for p in st.get("personnel", [])[:4]],
            })

        cite_list = ", ".join(f"[{s['study_id']} | {s['acronym']} | {s['doi']}]" for s in selected)
        prompt = (
            "You are a NASA Microgravity Combustion & Exploration Fire Safety Systems Engineer.\n"
            "Compare these exact NASA PSI investigations side-by-side based ONLY on the provided metadata.\n"
            "Always cite studies using exact [Study_ID | Acronym | DOI] tags. Highlight complementary safety roles, "
            "test-condition gaps, and implications for Lunar/Martian habitat fire safety.\n\n"
            + "\n\n".join(
                f"[{s['study_id']} | {s['acronym']} | {s['doi']}]\n"
                f"Hardware: {s['hardware']}\nFuels/Geometry: {s['fuels_geometry']}\n"
                f"Conditions: {s['o2_range']}, {s['pressure_psia']}, {s['airflow_cm_s']}\n"
                f"Objective: {s['objective'][:600]}\nImpacts: {s['research_impacts'][:450]}"
                for s in selected
            )
        )

        llm_synthesis = self._call_gemini(prompt)
        if llm_synthesis:
            synthesis = llm_synthesis
            mode = "gemini-2.5-flash"
        else:
            # Deterministic grounded synthesis
            pillars = " vs. ".join(f"{s['study_id']} ({s['safety_pillar']}, {s['fuel_phase']})" for s in selected)
            synthesis = (
                f"**SI Comparative Synthesis ({cite_list}):**\n\n"
                f"1. **Complementary Coverage:** Comparing {pillars} bridges distinct regimes across "
                f"{', '.join(sorted({h for s in selected for h in s.get('hardware_tags', [])}))}. "
                + " ".join(
                    f"[{s['study_id']} | {s['acronym']} | {s['doi']}] probes {s['fuels_geometry']} under {s['o2_range']} at {s['pressure_psia']} ({s['airflow_cm_s']})."
                    for s in selected
                )
                + "\n\n2. **Exploration Habitat Engineering Takeaway:** Combining material flammability limits with diagnostic/suppression telemetry prevents blind spots—such as ventilation-off sustained burning in elevated-O2 SEA atmospheres, Goldilocks low-flow flame spread (~10 cm/s), or post-extinction cool-flame re-ignition."
            )
            mode = "deterministic-grounded"

        return {
            "mode": mode,
            "citations": [{"study_id": s["study_id"], "acronym": s["acronym"], "doi": s["doi"]} for s in selected],
            "matrix": matrix,
            "synthesis": synthesis,
        }

    def ask_engineer(
        self,
        question: str,
        o2_pct: float | None = None,
        pressure_psia: float | None = None,
        airflow_cms: float | None = None,
        gravity_target: str | None = None,
    ) -> dict[str, Any]:
        retrieved = self.ranker.retrieve_chunks(question, top_k=5)
        context_block = "\n\n".join(c["injected_text"][:1100] for c in retrieved)
        hab_str = ""
        if o2_pct is not None and pressure_psia is not None and airflow_cms is not None:
            hab_str = f"Current Habitat Parameters: O2={o2_pct}%, Pressure={pressure_psia} psia, Airflow={airflow_cms} cm/s, Gravity={gravity_target or '0g'}."

        prompt = (
            "You are IGNIS-PSI, NASA's SI-Powered Microgravity Combustion & Fire Safety Engineer.\n"
            "Answer the user's question concisely and rigorously using ONLY the Explicit Context-Injected NASA PSI excerpts below.\n"
            "Every claim must include inline [Study_ID | Acronym | DOI] citations.\n\n"
            f"{hab_str}\n\n"
            f"USER QUESTION: {question}\n\n"
            f"RETRIEVED NASA PSI EXCERPTS:\n{context_block}"
        )

        llm_answer = self._call_gemini(prompt)
        if llm_answer:
            answer = llm_answer
            mode = "gemini-2.5-flash"
        else:
            bullets = []
            for c in retrieved[:4]:
                snippet = c["raw_text"].replace("\n", " ").strip()[:320]
                bullets.append(f"- **[{c['study_id']} | {c['acronym']} | {c['doi']}]** ({c['section']}): {snippet}...")
            hab_prefix = f"**Active Habitat Telemetry:** `{hab_str}`\n\n" if hab_str else ""
            answer = (
                f"{hab_prefix}**Grounded NASA PSI Engineering Findings for:** *\"{question}\"*\n\n"
                + "\n\n".join(bullets)
                + "\n\n*Note: Synthesized deterministically from Explicit Context-Injected PSI metadata and NASA ISS Combustion Guide chunks (set `GEMINI_API_KEY` to enable generative narrative synthesis).*"
            )
            mode = "deterministic-grounded"

        return {
            "mode": mode,
            "question": question,
            "answer": answer,
            "evidence": [
                {
                    "chunk_id": c["chunk_id"],
                    "study_id": c["study_id"],
                    "acronym": c["acronym"],
                    "doi": c["doi"],
                    "section": c["section"],
                    "context_header": c["context_header"],
                    "score": c["score"],
                    "excerpt": c["raw_text"][:360],
                }
                for c in retrieved
            ],
        }

    def get_spinoffs(self) -> list[dict[str, Any]]:
        return TERRESTRIAL_SPINOFFS

