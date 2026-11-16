"""
Coupled Spacecraft Fire-Chain Auditor & NASA PSI Coverage Gap Engine (IGNIS-PSI).

Addresses NASA's core operational bottleneck: PSI investigations are siloed by
hardware, fuel phase, and atmospheric regime. This module:
1. Audits a proposed crew habitat + fuel/material scenario across the coupled
   4-stage fire chain (Ignition/Spread -> Detection -> Suppression -> Re-Ignition).
2. Computes the live NASA PSI Coverage & Evidence Gap Matrix across all 19
   ingested studies, pinpointing untested exploration intersections (e.g.
   large-scale solid + 34% O2 / 8.2 psia + 10 cm/s Goldilocks flow + 1/6g).
"""

from __future__ import annotations

from typing import Any

from engine.simulator import simulate_habitat

MATERIAL_SCENARIOS: dict[str, dict[str, Any]] = {
    "sibal_fabric": {
        "id": "sibal_fabric",
        "label": "Cabin Textiles & Nomex/Sibal Garments",
        "phase": "Solid",
        "primary_studies": ["PSI-25", "PSI-98", "PSI-99", "PSI-62"],
        "notes": "Thermally thin cotton/fiberglass (Sibal 0.94 m × 0.40 m) & Nomex.",
    },
    "pmma_avionics": {
        "id": "pmma_avionics",
        "label": "PMMA / Polymer Avionics & Acrylic Windows",
        "phase": "Solid",
        "primary_studies": ["PSI-20", "PSI-25", "PSI-62"],
        "notes": "Thermally thick PMMA rods/spheres/slabs & ACME BRE gas-burner emulation.",
    },
    "kapton_wiring": {
        "id": "kapton_wiring",
        "label": "Kapton / Teflon Wiring & Smoldering Harness",
        "phase": "Aerosol/Particulate",
        "primary_studies": ["PSI-102", "PSI-47", "PDF-SAMER"],
        "notes": "Overheated spacecraft wire insulation producing 76–662 nm 0g smoke.",
    },
    "liquid_coolant": {
        "id": "liquid_coolant",
        "label": "Hydrocarbon / Liquid Fuel & Aerosolized Mist",
        "phase": "Liquid",
        "primary_studies": ["PSI-39", "PSI-68", "PSI-159"],
        "notes": "n-heptane, n-decane, n-dodecane droplets susceptible to cool flames.",
    },
}


def compute_psi_gap_matrix(studies: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Compute exact empirical coverage of the 19 ingested studies across NASA's
    critical Exploration Fire Safety regimes, exposing blindspots.
    """
    def _matches(st: dict[str, Any], pred) -> bool:
        try:
            return bool(pred(st))
        except Exception:
            return False

    regimes = [
        {
            "id": "iss_baseline",
            "regime": "ISS Cabin Norm (21% O2 · 14.7 psia · 0g)",
            "o2": "21% O2",
            "pressure": "14.7 psia",
            "gravity": "0g",
            "studies": [
                s["study_id"]
                for s in studies
                if _matches(s, lambda x: x["o2_min"] <= 21 <= x["o2_max"] and x["pressure_max_psia"] >= 14.5)
            ],
            "status": "WELL COVERED",
            "gap_note": "Direct ISS CIR, MSG, and Cygnus SAFFIRE flight data available.",
        },
        {
            "id": "goldilocks_flow",
            "regime": "Goldilocks Low-Flow Solids (4–18 cm/s · 0g)",
            "o2": "14–21% O2",
            "pressure": "14.7 psia",
            "gravity": "0g",
            "studies": [
                s["study_id"]
                for s in studies
                if _matches(s, lambda x: x["fuel_phase"] == "Solid" and x["airflow_max_cms"] >= 15)
            ],
            "status": "COVERED (14.7 psia ONLY)",
            "gap_note": "BASS-II & BASS-FGM covered 0–40 cm/s solids at 14.7 psia, NOT at 8.2 psia / 34% O2.",
        },
        {
            "id": "lunar_sea_quiescent",
            "regime": "Lunar SEA Atmosphere (34% O2 · 8.2 psia · Quiescent 0g)",
            "o2": "21–34% O2",
            "pressure": "8.2 psia",
            "gravity": "0g",
            "studies": [
                s["study_id"]
                for s in studies
                if _matches(s, lambda x: x["o2_max"] >= 34 and x["pressure_min_psia"] <= 8.5)
            ],
            "status": "GAS / DROPLET ONLY",
            "gap_note": "ACME BRE (PSI-20), CFI-G (PSI-159), and FLEX-2 (PSI-68) reached >=34% O2 / 8.2 psia, but NOT large-scale flowing solids.",
        },
        {
            "id": "lunar_coupled_gap",
            "regime": "Large-Scale Solid + 34% O2 / 8.2 psia + ~10 cm/s + 1/6g",
            "o2": "34% O2",
            "pressure": "8.2 psia",
            "gravity": "1/6g Moon",
            "studies": [],
            "status": "CRITICAL DATA GAP",
            "gap_note": (
                "ZERO direct flight datasets combine all 4 Lunar Habitat conditions simultaneously: "
                "SAFFIRE (PSI-98/99/100) was 21% O2 / 14.7 psia; BRE (PSI-20) was quiescent gas emulation; "
                "partial-g awaits LUCI & FM2. IGNIS-PSI bridges this via 0g-1g E-FIELD bounding."
            ),
        },
        {
            "id": "martian_partial_g",
            "regime": "Martian Surface Habitat (30% O2 · 9.0 psia · 3/8g)",
            "o2": "30% O2",
            "pressure": "9.0 psia",
            "gravity": "3/8g Mars",
            "studies": [],
            "status": "BOUNDED VIA PROXY",
            "gap_note": "No long-duration 3/8g PSI flight data; bounded between 0g ISS and 1g baselines using ACME E-FIELD (PDF-EFIELD).",
        },
        {
            "id": "dust_smoke_lunar",
            "regime": "Regolith/ARD Dust vs. 0g Coagulated Smoke",
            "o2": "21–34% O2",
            "pressure": "8.2–14.7 psia",
            "gravity": "0g / 1/6g",
            "studies": [
                s["study_id"]
                for s in studies
                if _matches(s, lambda x: x["safety_pillar"] == "Detection" and "Aerosol" in x["fuel_phase"])
            ],
            "status": "PARTIALLY COVERED",
            "gap_note": "SAME (PSI-102) & DAFT-2 (PSI-47) characterized 0.2 µm crossover & ARD at 14.7 psia; 8.2 psia / 1/6g dust settling remains unflown.",
        },
    ]

    covered_count = sum(1 for r in regimes if len(r["studies"]) > 0)
    return {
        "total_regimes": len(regimes),
        "covered_regimes": covered_count,
        "gap_regimes": len(regimes) - covered_count,
        "regimes": regimes,
    }


def compute_mission_audit(
    studies: list[dict[str, Any]],
    o2_pct: float = 34.0,
    pressure_psia: float = 8.2,
    airflow_cms: float = 10.0,
    gravity_target: str = "1/6g",
    material_id: str = "sibal_fabric",
) -> dict[str, Any]:
    """Run an end-to-end 4-stage coupled spacecraft fire-safety audit."""
    sim = simulate_habitat(
        o2_pct=o2_pct,
        pressure_psia=pressure_psia,
        airflow_cms=airflow_cms,
        gravity_target=gravity_target,
    )
    mat = MATERIAL_SCENARIOS.get(material_id, MATERIAL_SCENARIOS["sibal_fabric"])
    metrics = sim["metrics"]

    # Stage 1: Prevention & Screening
    if o2_pct >= 30.0 and pressure_psia <= 10.5:
        s1_status = "FAIL"
        s1_finding = (
            f"Elevated SEA ({o2_pct:.1f}% O2, {pressure_psia:.1f} psia) accelerates flame spread "
            f"({metrics['spread_rate_multiplier']}× ISS norm). Turning off fans will NOT self-extinguish."
        )
    elif metrics["goldilocks_regime"] and o2_pct >= metrics["loc_0g_pct"]:
        s1_status = "CONDITIONAL"
        s1_finding = (
            f"Airflow ({airflow_cms:.0f} cm/s) sits inside the BASS-II Goldilocks valley (0g LOC {metrics['loc_0g_pct']}% O2), "
            "making 1g NASA-STD-6001 Test 1 (21% O2) non-conservative."
        )
    else:
        s1_status = "PASS"
        s1_finding = f"Operating point ({o2_pct:.1f}% O2) stays near or below target LOC ({metrics['loc_target_pct']}% O2)."

    # Stage 2: Detection & False-Alarm Immunity
    if gravity_target in ("1/6g", "3/8g"):
        s2_status = "CONDITIONAL"
        s2_finding = (
            "Surface regolith/dust (>1 µm) overlaps coagulated low-g smoke (223–976 nm) above the 0.2 µm "
            "photoelectric crossover. Dual-moment (Ionization + Photoelectric) or condensation-nuclei discrimination required."
        )
    elif airflow_cms < 5.0:
        s2_status = "CONDITIONAL"
        s2_finding = (
            "Low convective transport delays smoke arrival at duct sensors while extending 0g coagulation time (>200 nm)."
        )
    else:
        s2_status = "PASS"
        s2_finding = "Forced ventilation transports pyrolysis aerosols to duct optical/ionization discriminators."

    # Stage 3: Suppression & Entrainment Safety
    if o2_pct >= 30.0 or metrics["goldilocks_regime"]:
        s3_status = "CONDITIONAL"
        s3_finding = (
            "Avoid pointed N2 gas jets (BASS-II air-entrainment intensifies flames toward ~10 cm/s) and legacy CO2 "
            "(ECLSS hypercapnia burden). Deploy Fine Water Mist (STS-107 MIST / ISS Dec 2015 standard) or full-bay inerting."
        )
    else:
        s3_status = "PASS"
        s3_finding = "Fine Water Mist provides non-toxic quenching without gaseous CO2 ECLSS scrubbing penalty."

    # Stage 4: Cool-Flame Persistence & Re-Ignition Watch
    if material_id == "liquid_coolant" or o2_pct >= 30.0:
        s4_status = "FAIL"
        s4_finding = (
            "High risk of invisible 500–800 K cool flames persisting after hot-flame extinction (CFI, FLEX-2, ACME CFI-G). "
            "Visible cameras cannot verify fire-out; mandate UV / OH* radiometric & gas-sensor clearance."
        )
    else:
        s4_status = "CONDITIONAL"
        s4_finding = "Verify thermal/CO decay before restoring ventilation or removing crew respiratory PPE."

    stages = [
        {
            "stage": "1. Prevention & Material Screening",
            "status": s1_status,
            "finding": s1_finding,
            "citations": ["[PSI-20 | ACME BRE | 10.60555/vb93-3y72]", "[PSI-25 | BASS-II | 10.60555/4qc4-de67]"],
        },
        {
            "stage": "2. Smoke Detection & Dust Immunity",
            "status": s2_status,
            "finding": s2_finding,
            "citations": ["[PSI-102 | SAME | 10.60555/gd4k-8h62]", "[PSI-47 | DAFT-2 | 10.60555/ztgj-d202]"],
        },
        {
            "stage": "3. Suppression & Jet Entrainment",
            "status": s3_status,
            "finding": s3_finding,
            "citations": ["[PDF-MIST | MIST (STS-107) | NP-2015-10-034-JSC p. 26]", "[PSI-25 | BASS-II | 10.60555/4qc4-de67]"],
        },
        {
            "stage": "4. Cool-Flame Re-Ignition Watch",
            "status": s4_status,
            "finding": s4_finding,
            "citations": ["[PSI-39 | CFI | 10.60555/m6pj-a914]", "[PSI-68 | FLEX-2 | 10.60555/byp8-h018]", "[PSI-159 | ACME CFI-G | 10.60555/cyt1-kh64]"],
        },
    ]

    fails = sum(1 for st in stages if st["status"] == "FAIL")
    conds = sum(1 for st in stages if st["status"] == "CONDITIONAL")
    overall_grade = "NO-GO / MITIGATIONS REQUIRED" if fails > 0 else ("CONDITIONAL GO" if conds > 0 else "NOMINAL GO")

    return {
        "overall_grade": overall_grade,
        "fail_count": fails,
        "conditional_count": conds,
        "material": mat,
        "operating_point": sim["operating_point"],
        "metrics": metrics,
        "stages": stages,
        "gap_matrix": compute_psi_gap_matrix(studies),
        "material_options": list(MATERIAL_SCENARIOS.values()),
    }

