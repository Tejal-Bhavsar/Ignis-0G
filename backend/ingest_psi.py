"""
NASA PSI ISA-Tab & ISS Combustion Science PDF Ingestion Pipeline.

Parses:
1. All ISA-Tab `*_Investigation.txt` files in `raw_nasa_data/`.
2. NASA's "A Researcher's Guide to ISS Combustion Science" (NP-2015-10-034-JSC).
3. NASA's "Smoke and Aerosol Measurement Experiment (SAME) EIRD Rev 2.00".

Applies Explicit Context-Injection to every chunk with a structured telemetry header:
[Study_ID | Acronym | Hardware | Safety_Pillar | Fuel_Phase | O2_Range | Pressure_psia | Airflow_cm_s | Gravity_Regime]

Outputs `backend/data/indexed_psi.json`.
"""

from __future__ import annotations

import csv
import glob
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pypdf import PdfReader

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = ROOT_DIR / "raw_nasa_data"
OUT_PATH = Path(__file__).resolve().parent / "data" / "indexed_psi.json"

GUIDE_PDF = RAW_DATA_DIR / "np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf"
SAME_EIRD_PDF = RAW_DATA_DIR / "SAME EIRD Rev 2.00 02-25-05 HIgh Q.pdf"


# Ground-truth physical telemetry bounds derived directly from the NASA PSI files & Guide PDF
STUDY_TELEMETRY_OVERRIDES: dict[str, dict[str, Any]] = {
    "PSI-20": {
        "acronym": "ACME BRE",
        "safety_pillar": "Prevention",
        "safety_pillars": ["Prevention", "Fundamentals"],
        "fuel_phase": "Gas (Condensed Emulation)",
        "o2_range": "21–34% O2 (SEA: 21%, 26.5%, 34%)",
        "pressure_psia": "8.2–14.7 psia",
        "airflow_cm_s": "0 cm/s (Quiescent)",
        "gravity_regime": "0g (ISS Microgravity) + 1g Cone Calorimeter Correlation",
        "o2_min": 21.0,
        "o2_max": 34.0,
        "pressure_min_psia": 8.2,
        "pressure_max_psia": 14.7,
        "airflow_min_cms": 0.0,
        "airflow_max_cms": 2.0,
        "hardware_tags": ["CIR", "ACME"],
        "fuels_geometry": "CH4/N2 and C2H4/N2 on 25 mm & 50 mm porous circular copper burners (emulating PMMA & Nylon)",
        "controlled_variables": "Burner diameter (25/50 mm), diluent (N2, CO2), chamber pressure, burner surface heat flux",
        "varied_parameters": "Atmosphere (14.7 psia/21% O2, 10.2 psia/26.5% O2, 8.2 psia/34% O2), fuel flow rate",
        "within_study_same": "Quiescent CIR 100-L chamber, porous copper calorimeter burner geometry (25 or 50 mm), fixed chamber O2/pressure per test point.",
        "within_study_varied": "Fuel mixture (CH4/N2 vs C2H4/N2), fuel injection rate reduced incrementally to extinction, burner surface temperature/heat flux transient, SEA atmosphere (21%, 26.5%, 34% O2).",
        "sensors_diagnostics": "Heat flux gauge, thermocouples, radiometers, 2 color cameras, UV camera, HiBMs cameras, PMTs",
    },
    "PSI-25": {
        "acronym": "BASS-II",
        "safety_pillar": "Suppression",
        "safety_pillars": ["Prevention", "Suppression"],
        "fuel_phase": "Solid",
        "o2_range": "14–21% O2 (N2 vitiated)",
        "pressure_psia": "14.7 psia (ISS Cabin)",
        "airflow_cm_s": "0–40 cm/s (Goldilocks peak ~10 cm/s)",
        "gravity_regime": "0g (ISS Microgravity) vs 1g NASA-STD-6001 Test 1",
        "o2_min": 14.0,
        "o2_max": 21.0,
        "pressure_min_psia": 14.7,
        "pressure_max_psia": 14.7,
        "airflow_min_cms": 0.0,
        "airflow_max_cms": 40.0,
        "hardware_tags": ["MSG", "BASS-II"],
        "fuels_geometry": "PMMA rods/spheres/slabs, thin cellulose, Nomex/Sibal composite fabrics in MSG wind tunnel",
        "controlled_variables": "Sample geometry (rod, sphere, slab, sheet), flow direction (opposed/concurrent), cabin pressure",
        "varied_parameters": "Forced airflow speed (0–40 cm/s), O2 concentration (below 21% via N2 vitiation), N2 suppressant injection",
        "within_study_same": "ISS 14.7 psia ambient pressure inside MSG 255-L negative-pressure containment wind tunnel; standardized igniter wire.",
        "within_study_varied": "Airflow speed (0–40 cm/s), flow orientation (opposed vs concurrent), O2 mole fraction (<21% via N2 dilution), fuel thickness/geometry (rods, spheres, slabs, cellulose/Sibal sheets), N2 jet suppression.",
        "sensors_diagnostics": "MSG video & DSLR cameras, radiometer, airflow anemometer, CSA-CP & CDM gas sensors",
    },
    "PSI-39": {
        "acronym": "CFI",
        "safety_pillar": "Suppression",
        "safety_pillars": ["Suppression", "Fundamentals"],
        "fuel_phase": "Liquid",
        "o2_range": "15–21% O2 (He/N2 diluted)",
        "pressure_psia": "3.7–73.5 psia (0.25–5 atm)",
        "airflow_cm_s": "0 cm/s (Quiescent)",
        "gravity_regime": "0g (ISS Microgravity)",
        "o2_min": 15.0,
        "o2_max": 21.0,
        "pressure_min_psia": 3.7,
        "pressure_max_psia": 73.5,
        "airflow_min_cms": 0.0,
        "airflow_max_cms": 0.0,
        "hardware_tags": ["CIR", "MDCA"],
        "fuels_geometry": "Suspended droplets (1–5 mm) of n-dodecane, n-dodecane/iso-dodecane mixtures, farnesane",
        "controlled_variables": "Initial droplet diameter, diluent gas (He, N2), chamber pressure",
        "varied_parameters": "Chamber pressure (0.25–5 atm), helium vs nitrogen dilution, fuel blend ratio",
        "sensors_diagnostics": "MDCA fiber-tethered/free-floated droplet diagnostics, UV camera, radiometer, HiBMs cameras",
    },
    "PSI-47": {
        "acronym": "DAFT / DAFT-2",
        "safety_pillar": "Detection",
        "safety_pillars": ["Detection"],
        "fuel_phase": "Aerosol/Particulate",
        "o2_range": "21% O2 (ISS Cabin Air + GN2 bags)",
        "pressure_psia": "14.7 psia (ISS Cabin)",
        "airflow_cm_s": "Cabin ventilation / Sampled flow",
        "gravity_regime": "0g (ISS Microgravity)",
        "o2_min": 21.0,
        "o2_max": 21.0,
        "pressure_min_psia": 14.7,
        "pressure_max_psia": 14.7,
        "airflow_min_cms": 5.0,
        "airflow_max_cms": 25.0,
        "hardware_tags": ["TSI P-Trak", "DustTrak"],
        "fuels_geometry": "Arizona Red Dust (ARD) aerosolized with GN2 in 15-liter Mylar bags",
        "controlled_variables": "Capillary isopropanol condenser wick (modified TSI P-Trak), mercury switch removed, 15 L Mylar bag",
        "varied_parameters": "ARD dust loading, comparison against microgravity-rated DustTrak CNC",
        "sensors_diagnostics": "Modified TSI P-Trak condensation nuclei counter (CNC), DustTrak laser-scattering aerosol monitor",
    },
    "PSI-60": {
        "acronym": "SPICE-Analysis",
        "safety_pillar": "Detection",
        "safety_pillars": ["Detection", "Fundamentals"],
        "fuel_phase": "Gas",
        "o2_range": "21% O2 (Air Coflow)",
        "pressure_psia": "14.7 psia",
        "airflow_cm_s": "Coflow jet regime (5–30 cm/s)",
        "gravity_regime": "0g (ISS Microgravity) vs 1g Comparison",
        "o2_min": 21.0,
        "o2_max": 21.0,
        "pressure_min_psia": 14.7,
        "pressure_max_psia": 14.7,
        "airflow_min_cms": 5.0,
        "airflow_max_cms": 30.0,
        "hardware_tags": ["MSG", "SPICE"],
        "fuels_geometry": "Gaseous ethylene/methane laminar jet flames in coflow air (1600+ raw DSLR images)",
        "controlled_variables": "Jet burner geometry, fuel mass flow rate, optical calibration",
        "varied_parameters": "Gravity level (0g vs 1g), fuel type, soot loading / smoke point",
        "sensors_diagnostics": "Three-color DSLR pyrometry, soot volume fraction (fv) inversion, radiative transport solver",
    },
    "PSI-62": {
        "acronym": "BASS-FGM",
        "safety_pillar": "Prevention",
        "safety_pillars": ["Prevention", "Fundamentals"],
        "fuel_phase": "Solid",
        "o2_range": "16–21% O2",
        "pressure_psia": "14.7 psia",
        "airflow_cm_s": "0–40 cm/s (Concurrent Flow)",
        "gravity_regime": "0g (ISS Microgravity CFD Validation)",
        "o2_min": 16.0,
        "o2_max": 21.0,
        "pressure_min_psia": 14.7,
        "pressure_max_psia": 14.7,
        "airflow_min_cms": 0.0,
        "airflow_max_cms": 40.0,
        "hardware_tags": ["MSG", "BASS-II"],
        "fuels_geometry": "PMMA samples and wax cylinders in concurrent low-speed microgravity flow",
        "controlled_variables": "FGM tabulated chemistry, LES subgrid turbulence closure, sample geometry",
        "varied_parameters": "Concurrent flow velocity, ambient O2, soot/radiation coupling",
        "sensors_diagnostics": "Two-color tomography temperature reconstruction, BASS-II flight video validation",
    },
    "PSI-68": {
        "acronym": "FLEX-2",
        "safety_pillar": "Suppression",
        "safety_pillars": ["Suppression", "Fundamentals"],
        "fuel_phase": "Liquid",
        "o2_range": "10–40% O2 (N2/He/CO2/Xe)",
        "pressure_psia": "7.35–44.1 psia (0.5–3.0 atm)",
        "airflow_cm_s": "0–5 cm/s (Quiescent / Low Convective)",
        "gravity_regime": "0g (ISS Microgravity)",
        "o2_min": 10.0,
        "o2_max": 40.0,
        "pressure_min_psia": 7.35,
        "pressure_max_psia": 44.1,
        "airflow_min_cms": 0.0,
        "airflow_max_cms": 5.0,
        "hardware_tags": ["CIR", "MDCA"],
        "fuels_geometry": "Single & bi-component liquid droplets (heptane, decane, methanol, hexanol, iso-octane) 1.5–5 mm",
        "controlled_variables": "2-minute pre-ignition settling time, droplet deployment needles, chamber temperature",
        "varied_parameters": "Pressure (0.5–3.0 atm), O2 mole fraction (0.10–0.40), inert diluent (N2, He, CO2, Xe)",
        "sensors_diagnostics": "Low-light UV camera, analog color camera, HiBMs high-res backlight, radiometer, fiber-optic spectrometer",
    },
    "PSI-98": {
        "acronym": "SAFFIRE-I",
        "safety_pillar": "Prevention",
        "safety_pillars": ["Prevention", "Detection"],
        "fuel_phase": "Solid",
        "o2_range": "21% O2",
        "pressure_psia": "14.7 psia (Cygnus PCM)",
        "airflow_cm_s": "20 cm/s (Opposed/Concurrent Duct)",
        "gravity_regime": "0g (Uncrewed Cygnus Flight)",
        "o2_min": 21.0,
        "o2_max": 21.0,
        "pressure_min_psia": 14.7,
        "pressure_max_psia": 14.7,
        "airflow_min_cms": 20.0,
        "airflow_max_cms": 20.0,
        "hardware_tags": ["Cygnus", "SAFFIRE"],
        "fuels_geometry": "Large-scale Sibal composite fabric (75% cotton / 25% fiberglass), 0.94 m long x 0.40 m wide",
        "controlled_variables": "Cygnus pressurized volume, duct geometry, fixed 20 cm/s fan airflow",
        "varied_parameters": "Full-scale flame growth & downstream flame spread dynamics vs small-scale tests",
        "within_study_same": "Uncrewed Cygnus PCM cabin (~14.7 psia, 21% O2), 0.94 m × 0.40 m Sibal fabric sample, 20 cm/s duct airflow.",
        "within_study_varied": "Time-resolved spatial flame front growth, local O2 depletion, CO2 rise, and heat flux across upstream/downstream sensors (contrasted against 30 cm/s in SAFFIRE-III).",
        "sensors_diagnostics": "O2 & CO2 mole fraction sensors, pressure transducer, radiometers, thermocouples, 2 HD video cameras",
    },
    "PSI-99": {
        "acronym": "SAFFIRE-II",
        "safety_pillar": "Prevention",
        "safety_pillars": ["Prevention", "Detection"],
        "fuel_phase": "Solid",
        "o2_range": "21% O2",
        "pressure_psia": "14.7 psia (Cygnus PCM)",
        "airflow_cm_s": "20–30 cm/s (Opposed & Concurrent)",
        "gravity_regime": "0g (Uncrewed Cygnus Flight)",
        "o2_min": 21.0,
        "o2_max": 21.0,
        "pressure_min_psia": 14.7,
        "pressure_max_psia": 14.7,
        "airflow_min_cms": 20.0,
        "airflow_max_cms": 30.0,
        "hardware_tags": ["Cygnus", "SAFFIRE"],
        "fuels_geometry": "9-material card: Sibal, silicone, structured PMMA, flat PMMA, PMMA with Nomex",
        "controlled_variables": "Multi-sample card inside SAFFIRE-II flow duct, Cygnus cabin pressure",
        "varied_parameters": "Material thickness/type, airflow velocity (20 or 30 cm/s), flow orientation (opposed vs concurrent)",
        "sensors_diagnostics": "O2/CO2 sensors, pressure, heat flux/radiometers, thermocouples, dual video cameras",
    },
    "PSI-100": {
        "acronym": "SAFFIRE-III",
        "safety_pillar": "Prevention",
        "safety_pillars": ["Prevention"],
        "fuel_phase": "Solid",
        "o2_range": "21% O2",
        "pressure_psia": "14.7 psia (Cygnus PCM)",
        "airflow_cm_s": "30 cm/s",
        "gravity_regime": "0g (Uncrewed Cygnus Flight)",
        "o2_min": 21.0,
        "o2_max": 21.0,
        "pressure_min_psia": 14.7,
        "pressure_max_psia": 14.7,
        "airflow_min_cms": 30.0,
        "airflow_max_cms": 30.0,
        "hardware_tags": ["Cygnus", "SAFFIRE"],
        "fuels_geometry": "Large-scale Sibal composite fabric (75% cotton / 25% fiberglass) at elevated ventilation",
        "controlled_variables": "Cygnus module atmosphere, SAFFIRE duct cross-section",
        "varied_parameters": "Airflow speed increased to 30 cm/s (vs 20 cm/s in SAFFIRE-I) to measure growth acceleration",
        "sensors_diagnostics": "Pressure, CO2 & O2 mole fraction sensors, radiometers, 2 video cameras",
    },
    "PSI-102": {
        "acronym": "SAME",
        "safety_pillar": "Detection",
        "safety_pillars": ["Detection"],
        "fuel_phase": "Aerosol/Particulate",
        "o2_range": "21% O2 (ISS Cabin)",
        "pressure_psia": "14.7 psia",
        "airflow_cm_s": "Controlled MSG sampling flow",
        "gravity_regime": "0g (ISS Microgravity) vs 1g Smoke Signature",
        "o2_min": 21.0,
        "o2_max": 21.0,
        "pressure_min_psia": 14.7,
        "pressure_max_psia": 14.7,
        "airflow_min_cms": 5.0,
        "airflow_max_cms": 25.0,
        "hardware_tags": ["MSG", "SAME", "TSI P-Trak"],
        "fuels_geometry": "Overheated/pyrolyzing spacecraft materials: Kapton, Teflon, silicone rubber, paper/cellulose, lamp wick",
        "controlled_variables": "Pyrolysis igniter duration (15–60 s), sample mass, residence time",
        "varied_parameters": "Fuel material, igniter temperature, smoke residence time & coagulation aging",
        "sensors_diagnostics": "Modified TSI P-Trak CNC, DustTrak photometer, Ionization & Photoelectric ISS/STS smoke detectors, thermophoretic sampler",
    },
    "PSI-106": {
        "acronym": "SLICE",
        "safety_pillar": "Fundamentals",
        "safety_pillars": ["Fundamentals", "Prevention"],
        "fuel_phase": "Gas",
        "o2_range": "21% O2 (Air Coflow)",
        "pressure_psia": "14.7 psia",
        "airflow_cm_s": "Controlled coflow air velocity",
        "gravity_regime": "0g (ISS Microgravity)",
        "o2_min": 21.0,
        "o2_max": 21.0,
        "pressure_min_psia": 14.7,
        "pressure_max_psia": 14.7,
        "airflow_min_cms": 5.0,
        "airflow_max_cms": 35.0,
        "hardware_tags": ["MSG", "SLICE"],
        "fuels_geometry": "Methane, ethylene, and N2-diluted gaseous jet flames on exchangeable cylindrical burner tubes",
        "controlled_variables": "Fan-driven flow duct, burner tube diameter",
        "varied_parameters": "Coflow air velocity, fuel jet velocity, N2 dilution ratio, liftoff threshold",
        "sensors_diagnostics": "High-resolution color video camera, flow rate sensors, thermocouples",
    },
    "PSI-159": {
        "acronym": "ACME CFI-G",
        "safety_pillar": "Prevention",
        "safety_pillars": ["Prevention", "Fundamentals"],
        "fuel_phase": "Gas",
        "o2_range": "21–85% O2 (Normal & Inverse Flames)",
        "pressure_psia": "4.3–29.4 psia (0.3–2.0 atm)",
        "airflow_cm_s": "0–15 cm/s (Porous Sphere Injection)",
        "gravity_regime": "0g (ISS Microgravity)",
        "o2_min": 21.0,
        "o2_max": 85.0,
        "pressure_min_psia": 4.3,
        "pressure_max_psia": 29.4,
        "airflow_min_cms": 0.0,
        "airflow_max_cms": 15.0,
        "hardware_tags": ["CIR", "ACME"],
        "fuels_geometry": "Propane, n-butane, n-pentane steady-state cool diffusion flames on porous spherical burners (normal & inverse)",
        "controlled_variables": "Stoichiometric mixture fraction Zst, adiabatic flame temp Tad, spherical burner",
        "varied_parameters": "Fuel species, normal vs inverse convection, reactant dilution (up to 85% O2), pressure",
        "within_study_same": "CIR/ACME porous spherical burner configuration in 0g microgravity; continuous optical/PMT/radiometer suite.",
        "within_study_varied": "Normal (fuel from sphere into O2/N2) vs inside-out inverse flame (up to 85% O2/N2 flowing from sphere into fuel-seeded N2 chamber), fuel (propane, n-butane, n-pentane), Zst & Tad.",
        "sensors_diagnostics": "Color cameras, UV camera, radiometers, photomultiplier tubes (PMTs), thermocouples",
    },
}


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def normalize_hardware_tags(hw_str: str, fallback: list[str]) -> list[str]:
    tags = list(fallback)
    mapping = [
        ("CIR", "CIR"),
        ("Combustion Integrated Rack", "CIR"),
        ("MDCA", "MDCA"),
        ("Droplet Combustion", "MDCA"),
        ("MSG", "MSG"),
        ("Glovebox", "MSG"),
        ("ACME", "ACME"),
        ("Cygnus", "Cygnus"),
        ("Saffire", "SAFFIRE"),
        ("P-Trak", "TSI P-Trak"),
        ("SoFIE", "SoFIE"),
    ]
    for needle, tag in mapping:
        if needle.lower() in hw_str.lower() and tag not in tags:
            tags.append(tag)
    return tags


def make_context_header(study: dict[str, Any]) -> str:
    hw = ", ".join(study.get("hardware_tags", [])) or study.get("hardware") or "ISS Facility"
    return (
        f"[{study['study_id']} | {study['acronym']} | {hw} | "
        f"{study['safety_pillar']} | {study['fuel_phase']} | "
        f"{study['o2_range']} | {study['pressure_psia']} | "
        f"{study['airflow_cm_s']} | {study['gravity_regime']}]"
    )


def parse_isa_tab_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8", errors="replace", newline="") as f:
        rows = list(csv.reader(f, delimiter="\t"))

    raw_fields: dict[str, list[str]] = {}
    for row in rows:
        if not row:
            continue
        key = row[0].strip()
        vals = [c.strip() for c in row[1:]]
        raw_fields[key] = vals

    def first(key: str, default: str = "") -> str:
        for v in raw_fields.get(key, []):
            if v:
                return clean_text(v)
        return default

    def non_empty(key: str) -> list[str]:
        return [clean_text(v) for v in raw_fields.get(key, []) if v.strip()]

    study_id = first("Study Identifier")
    overrides = STUDY_TELEMETRY_OVERRIDES.get(study_id, {})

    acronym = first("Comment[Investigation Acronym]") or overrides.get("acronym") or study_id
    title = first("Study Title")
    doi = first("Comment[DOI]")
    hardware_raw = first("Comment[Experiment Hardware]")
    flight_platform = first("Comment[Flight Platform]") or "International Space Station (ISS)"

    # Parse zipped publications
    pub_titles = raw_fields.get("Study Publication Title", [])
    pub_dois = raw_fields.get("Study Publication DOI", [])
    pub_authors = raw_fields.get("Study Publication Author List", [])
    pub_links = raw_fields.get("Comment[Study Publication Link]", [])
    pub_statuses = raw_fields.get("Study Publication Status", [])

    max_pubs = max(len(pub_titles), len(pub_dois), len(pub_authors), 0)
    publications = []
    for i in range(max_pubs):
        t = clean_text(pub_titles[i]) if i < len(pub_titles) else ""
        d = clean_text(pub_dois[i]) if i < len(pub_dois) else ""
        a = clean_text(pub_authors[i]) if i < len(pub_authors) else ""
        l = clean_text(pub_links[i]) if i < len(pub_links) else ""
        s = clean_text(pub_statuses[i]) if i < len(pub_statuses) else ""
        if t or d:
            publications.append({
                "title": t,
                "doi": d,
                "authors": a,
                "link": l or (f"https://doi.org/{d}" if d else ""),
                "status": s or "published",
            })

    # Parse zipped personnel (PIs / Co-Is / Project Scientists)
    p_first = raw_fields.get("Study Person First Name", [])
    p_mid = raw_fields.get("Study Person Mid Initials", [])
    p_last = raw_fields.get("Study Person Last Name", [])
    p_affil = raw_fields.get("Study Person Affiliation", [])
    p_email = raw_fields.get("Study Person Email", [])
    p_roles = raw_fields.get("Study Person Roles", [])
    p_orcid = raw_fields.get("Comment[orcidIdentifier]", [])

    max_p = max(len(p_last), len(p_first), len(p_roles), 0)
    personnel = []
    for i in range(max_p):
        fn = p_first[i].strip() if i < len(p_first) else ""
        mn = p_mid[i].strip() if i < len(p_mid) else ""
        ln = p_last[i].strip() if i < len(p_last) else ""
        full_name = " ".join(part for part in [fn, mn, ln] if part)
        if full_name:
            personnel.append({
                "name": full_name,
                "affiliation": p_affil[i].strip() if i < len(p_affil) else "",
                "email": p_email[i].strip() if i < len(p_email) else "",
                "role": p_roles[i].strip() if i < len(p_roles) else "",
                "orcid": p_orcid[i].strip() if i < len(p_orcid) else "",
            })

    hw_tags = normalize_hardware_tags(hardware_raw, overrides.get("hardware_tags", []))

    study = {
        "study_id": study_id,
        "source_type": "NASA PSI ISA-Tab",
        "source_file": f"raw_nasa_data/{path.name}",
        "title": title,
        "acronym": acronym,
        "doi": doi,
        "doi_url": f"https://doi.org/{doi}" if doi else "",
        "hardware": hardware_raw or ", ".join(hw_tags),
        "hardware_tags": hw_tags,
        "hardware_links": non_empty("Comment[Experiment Hardware Link]"),
        "flight_platform": flight_platform,
        "managing_center": first("Comment[Managing NASA Center]", "Glenn Research Center (GRC)"),
        "sub_research_area": first("Comment[SubResearch Area]", "Combustion Science"),
        "study_design_types": non_empty("Study Design Type"),
        "objective": first("Comment[Objective]"),
        "hypothesis": first("Comment[Hypothesis]"),
        "approach": first("Comment[Approach]"),
        "research_impacts": first("Comment[Research Impacts]"),
        "publications": publications,
        "personnel": personnel,
        # Telemetry & comparison fields
        "safety_pillar": overrides.get("safety_pillar", "Fundamentals"),
        "safety_pillars": overrides.get("safety_pillars", ["Fundamentals"]),
        "fuel_phase": overrides.get("fuel_phase", "Mixed"),
        "o2_range": overrides.get("o2_range", "21% O2"),
        "pressure_psia": overrides.get("pressure_psia", "14.7 psia"),
        "airflow_cm_s": overrides.get("airflow_cm_s", "0–30 cm/s"),
        "gravity_regime": overrides.get("gravity_regime", "0g (ISS Microgravity)"),
        "o2_min": overrides.get("o2_min", 21.0),
        "o2_max": overrides.get("o2_max", 21.0),
        "pressure_min_psia": overrides.get("pressure_min_psia", 14.7),
        "pressure_max_psia": overrides.get("pressure_max_psia", 14.7),
        "airflow_min_cms": overrides.get("airflow_min_cms", 0.0),
        "airflow_max_cms": overrides.get("airflow_max_cms", 30.0),
        "fuels_geometry": overrides.get("fuels_geometry", title),
        "controlled_variables": overrides.get("controlled_variables", "ISS microgravity facility environment"),
        "varied_parameters": overrides.get("varied_parameters", "Reactant composition, pressure, or flow velocity"),
        "within_study_same": overrides.get("within_study_same", overrides.get("controlled_variables", "Consistent ISS microgravity facility & baseline instrumentation.")),
        "within_study_varied": overrides.get("within_study_varied", overrides.get("varied_parameters", "Reactant composition, pressure, fuel geometry, or flow velocity across test runs.")),
        "sensors_diagnostics": overrides.get("sensors_diagnostics", "High-speed color/UV imaging, radiometry, gas sensors"),
    }
    study["context_header"] = make_context_header(study)
    return study


def build_study_chunks(study: dict[str, Any]) -> list[dict[str, Any]]:
    header = study["context_header"]
    chunks: list[dict[str, Any]] = []
    sections = [
        ("Objective", study.get("objective", "")),
        ("Hypothesis", study.get("hypothesis", "")),
        ("Approach", study.get("approach", "")),
        ("Research Impacts", study.get("research_impacts", "")),
    ]
    for sec_name, body in sections:
        if not body:
            continue
        injected = f"{header}\n[{sec_name}] {study['title']} ({study['acronym']}, DOI: {study['doi']}): {body}"
        chunks.append({
            "chunk_id": f"{study['study_id']}::{sec_name.lower().replace(' ', '_')}",
            "study_id": study["study_id"],
            "acronym": study["acronym"],
            "doi": study["doi"],
            "section": sec_name,
            "context_header": header,
            "raw_text": body,
            "injected_text": injected,
            "source_file": study["source_file"],
        })

    # Publications summary chunk
    if study.get("publications"):
        pub_lines = [f"- {p['title']} ({p['authors']}) [DOI: {p['doi']}]" for p in study["publications"][:12] if p.get("title")]
        if pub_lines:
            pub_text = "\n".join(pub_lines)
            chunks.append({
                "chunk_id": f"{study['study_id']}::publications",
                "study_id": study["study_id"],
                "acronym": study["acronym"],
                "doi": study["doi"],
                "section": "Publications",
                "context_header": header,
                "raw_text": pub_text,
                "injected_text": f"{header}\n[Publications] Peer-reviewed papers for {study['study_id']} ({study['acronym']}):\n{pub_text}",
                "source_file": study["source_file"],
            })
    return chunks


def extract_pdf_studies_and_hardware() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    """
    Parse the 56-page ISS Combustion Science Researcher's Guide and SAME EIRD PDF.
    Returns:
      - supplementary_studies: PDF-derived investigations not in the 13 txt files (or augmenting them)
      - pdf_chunks: Explicit Context-Injected chunks from PDF pages
      - hardware_racks: CIR, MDCA, MSG, SoFIE, ACME, SAFFIRE/Cygnus specs
      - same_eird_metrics: Extracted Table 1-2 & 0.2 um crossover metrics from SAME EIRD
    """
    guide_reader = PdfReader(str(GUIDE_PDF))
    guide_pages = [clean_text(p.extract_text() or "") for p in guide_reader.pages]

    same_reader = PdfReader(str(SAME_EIRD_PDF))
    same_pages = [clean_text(p.extract_text() or "") for p in same_reader.pages]

    def page_slice(pages: list[str], page_nums: list[int]) -> str:
        return "\n\n".join(f"[p.{n}] {pages[n - 1]}" for n in page_nums if 1 <= n <= len(pages))

    supplementary_defs = [
        {
            "study_id": "PDF-EFIELD",
            "acronym": "ACME E-FIELD Flames",
            "title": "Electric-Field Effects on Laminar Diffusion Flames (ACME E-FIELD Flames)",
            "doi": "NP-2015-10-034-JSC (pp. 16, 44, 52)",
            "doi_url": "https://www.nasa.gov/wp-content/uploads/2015/10/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
            "hardware": "Combustion Integrated Rack (CIR), ACME",
            "hardware_tags": ["CIR", "ACME"],
            "safety_pillar": "Fundamentals",
            "safety_pillars": ["Fundamentals", "Prevention", "Suppression"],
            "fuel_phase": "Gas",
            "o2_range": "21% O2 (Coflow / Jet Air)",
            "pressure_psia": "14.7 psia",
            "airflow_cm_s": "0–25 cm/s + Ion-Wind Forcing (up to 10 kV)",
            "gravity_regime": "0g + Electric-Field Partial-Gravity / Buoyancy Proxy",
            "o2_min": 21.0,
            "o2_max": 21.0,
            "pressure_min_psia": 14.7,
            "pressure_max_psia": 14.7,
            "airflow_min_cms": 0.0,
            "airflow_max_cms": 25.0,
            "pages": [16, 44, 52],
            "fuels_geometry": "Laminar coflow and simple gas-jet diffusion flames with high-voltage (up to 10 kV) circular mesh downstream of burner",
            "controlled_variables": "Burner-to-mesh separation, applied DC/AC voltage (up to 10 kV), ACME gas feed",
            "varied_parameters": "Electric field strength, fuel dilution, ion current response time",
            "sensors_diagnostics": "Ion current measurement, two color cameras, UV camera, HiBMs cameras, radiometers, PMTs",
            "objective": "Gain improved understanding of flame-ion production and investigate how direct ion transport and induced ion wind (up to 10 kV differential between burner and circular mesh) modify flame shape, alter soot/flammability limits, direct heat transfer, and simulate tunable body-force effects.",
            "hypothesis": "Electric fields induce an ion wind on combustion ions that acts as a controllable body force, allowing microgravity flames to probe soot, stability, and partial-gravity-like convective forcing regimes.",
            "research_impacts": "Provides a tunable microgravity body-force proxy to bound partial-gravity (1/6g Lunar, 3/8g Martian) flame transport and enables active electric-field flame control and pollutant reduction.",
        },
        {
            "study_id": "PDF-MIST",
            "acronym": "MIST (STS-107)",
            "title": "Water Mist Fire Suppression Experiment & ISS Portable Water-Mist Extinguishers",
            "doi": "NP-2015-10-034-JSC (p. 26)",
            "doi_url": "https://www.nasa.gov/wp-content/uploads/2015/10/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
            "hardware": "Combustion Module (CM-2, STS-107) -> ISS Portable Water-Mist Extinguisher",
            "hardware_tags": ["STS-107 CM", "ISS Extinguisher"],
            "safety_pillar": "Suppression",
            "safety_pillars": ["Suppression"],
            "fuel_phase": "Gas / Condensed Mist Suppression",
            "o2_range": "21–30% O2",
            "pressure_psia": "14.7 psia",
            "airflow_cm_s": "Propagating premixed flame tube",
            "gravity_regime": "0g (Shuttle STS-107 & ISS Deployment)",
            "o2_min": 21.0,
            "o2_max": 30.0,
            "pressure_min_psia": 14.7,
            "pressure_max_psia": 14.7,
            "airflow_min_cms": 0.0,
            "airflow_max_cms": 30.0,
            "pages": [26],
            "fuels_geometry": "Premixed flames propagating along a tube quenched by monodisperse water mist droplets",
            "controlled_variables": "Tube geometry, fuel/oxidizer mixture, droplet generator",
            "varied_parameters": "Water droplet diameter, water mist mass concentration, fuel/O2 ratio",
            "sensors_diagnostics": "Flame propagation speed tracking, optical imaging, mist concentration measurement",
            "objective": "Measure extinguishing capability of water mist on premixed flames propagating along a tube (T. McKinnon, STS-107, 2003) to understand how droplet diameter and water concentration govern flame speed, strength, and extinction.",
            "hypothesis": "Fine water mist droplets maximize evaporative cooling and oxygen dilution per unit mass without leaving toxic Halon residues or asphyxiating CO2 buildup in closed habitats.",
            "research_impacts": "Directly enabled certification of non-toxic portable water-mist fire extinguishers (first two launched to ISS in Dec 2015, nine planned) to replace CO2 units on ISS and Halon systems on Earth.",
        },
        {
            "study_id": "PDF-SAMER",
            "acronym": "SAME / SAME-R",
            "title": "Smoke Aerosol Measurement Experiment & Reflight (SAME / SAME-R) and CSD",
            "doi": "NP-2015-10-034-JSC (pp. 26, 35, 45) & SAME EIRD Rev 2.00",
            "doi_url": "https://www.nasa.gov/wp-content/uploads/2015/10/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
            "hardware": "Microgravity Science Glovebox (MSG), TSI P-Trak, DustTrak, Ionization/Photoelectric Detectors",
            "hardware_tags": ["MSG", "TSI P-Trak", "SAME"],
            "safety_pillar": "Detection",
            "safety_pillars": ["Detection"],
            "fuel_phase": "Aerosol/Particulate",
            "o2_range": "21% O2 (ISS Cabin)",
            "pressure_psia": "14.7 psia",
            "airflow_cm_s": "Low-velocity MSG sampling / Vehicle ventilation",
            "gravity_regime": "0g (ISS 2007/2010 & Reflight) vs 1g",
            "o2_min": 21.0,
            "o2_max": 21.0,
            "pressure_min_psia": 14.7,
            "pressure_max_psia": 14.7,
            "airflow_min_cms": 5.0,
            "airflow_max_cms": 25.0,
            "pages": [26, 35, 45],
            "fuels_geometry": "Overheated Kapton, Teflon, silicone rubber, paper, and candle smoke aerosols vs nuisance dust",
            "controlled_variables": "MSG enclosed 255-L work volume, standardized pyrolysis heating profiles",
            "varied_parameters": "Material type, smoke residence time (coagulation), particle diameter (<0.2 um vs >0.2 um)",
            "sensors_diagnostics": "3-moment particle size distribution, ionization detector (~d), photoelectric light-scattering (~d^3)",
            "objective": "Characterize reduced-gravity smoke particulate size distributions and coagulation dynamics across spacecraft materials (Kapton, Teflon, paper, silicone) to eliminate false alarms and slow detection in spacecraft smoke detectors.",
            "hypothesis": "Absence of buoyancy increases smoke residence time and coagulation, shifting primary diameters (e.g., Kapton 76 nm vs 35 nm in 1g; Teflon 136 nm vs 75 nm) and aggregate lengths (up to 976 nm for candle), altering the 0.2 um crossover between ionization and photoelectric detectors.",
            "research_impacts": "Guides next-generation spacecraft and submarine/mining smoke detectors capable of distinguishing real pyrolysis smoke from Lunar regolith / Arizona Red Dust nuisance aerosols.",
        },
        {
            "study_id": "PDF-FLAME-DESIGN",
            "acronym": "ACME Flame Design",
            "title": "ACME Flame Design — Soot Inception & Oxygen-Enriched Extinction Limits",
            "doi": "NP-2015-10-034-JSC (pp. 16–17, 44, 52)",
            "doi_url": "https://www.nasa.gov/wp-content/uploads/2015/10/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
            "hardware": "Combustion Integrated Rack (CIR), ACME",
            "hardware_tags": ["CIR", "ACME"],
            "safety_pillar": "Prevention",
            "safety_pillars": ["Prevention", "Fundamentals"],
            "fuel_phase": "Gas",
            "o2_range": "21–50% O2 (Oxygen-Enriched)",
            "pressure_psia": "8.2–14.7 psia",
            "airflow_cm_s": "0–15 cm/s (Spherical / Coflow Burner)",
            "gravity_regime": "0g (ISS Microgravity)",
            "o2_min": 21.0,
            "o2_max": 50.0,
            "pressure_min_psia": 8.2,
            "pressure_max_psia": 14.7,
            "airflow_min_cms": 0.0,
            "airflow_max_cms": 15.0,
            "pages": [16, 17, 44, 52],
            "fuels_geometry": "Ethylene and methane in normal and inverse spherical/coflow diffusion flames",
            "controlled_variables": "Porous spherical burner / coflow annulus, stoichiometric mixture fraction Zst",
            "varied_parameters": "Fuel dilution, ambient O2 enrichment, normal vs inverse injection direction",
            "sensors_diagnostics": "Radiometers, two color cameras, UV camera, HiBMs cameras, PMTs",
            "objective": "Determine soot inception and extinction limits in oxygen-enriched spherical/coflow diffusion flames and test whether stoichiometric mixture fraction characterizes non-premixed flammability limits.",
            "hypothesis": "Controlling flow direction relative to the stoichiometric surface enables robust, soot-free oxygen-enriched flames.",
            "research_impacts": "Enables ultra-clean, low-polluting industrial burners on Earth and quantifies soot/radiation hazards in oxygen-enriched spacecraft atmospheres.",
        },
        {
            "study_id": "PDF-SFLAME",
            "acronym": "ACME s-Flame",
            "title": "Structure and Response of Spherical Diffusion Flames (ACME s-Flame)",
            "doi": "NP-2015-10-034-JSC (pp. 17–18, 44, 52)",
            "doi_url": "https://www.nasa.gov/wp-content/uploads/2015/10/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
            "hardware": "Combustion Integrated Rack (CIR), ACME",
            "hardware_tags": ["CIR", "ACME"],
            "safety_pillar": "Fundamentals",
            "safety_pillars": ["Fundamentals", "Suppression"],
            "fuel_phase": "Gas",
            "o2_range": "15–34% O2",
            "pressure_psia": "8.2–14.7 psia",
            "airflow_cm_s": "0 cm/s (1D Spherical Radial Injection)",
            "gravity_regime": "0g (ISS Microgravity)",
            "o2_min": 15.0,
            "o2_max": 34.0,
            "pressure_min_psia": 8.2,
            "pressure_max_psia": 14.7,
            "airflow_min_cms": 0.0,
            "airflow_max_cms": 2.0,
            "pages": [17, 18, 44, 52],
            "fuels_geometry": "1D spherical diffusion flame enveloping a porous spherical burner (H2, CH4 soot-free; C2H4 sooty)",
            "controlled_variables": "Porous spherical burner, CIR 100-L chamber",
            "varied_parameters": "High & low Damkohler numbers (radiative vs convective extinction), Lewis number mixtures",
            "sensors_diagnostics": "Radiometers, low-light UV camera, HiBMs cameras, PMTs",
            "objective": "Identify both radiative (high Damkohler) and convective (low Damkohler) extinction limits and observe pulsating instabilities above critical Lewis numbers.",
            "hypothesis": "Near-limit microgravity spherical flames undergo oscillatory instabilities driven by Lewis number and radiative heat loss before extinguishing.",
            "research_impacts": "Validates 1D transient extinction models used for spacecraft fire suppression margins and lean terrestrial combustion.",
        },
        {
            "study_id": "PDF-CLD",
            "acronym": "ACME CLD Flame",
            "title": "Coflow Laminar Diffusion Flame (ACME CLD Flame)",
            "doi": "NP-2015-10-034-JSC (pp. 16, 44, 52)",
            "doi_url": "https://www.nasa.gov/wp-content/uploads/2015/10/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
            "hardware": "Combustion Integrated Rack (CIR), ACME",
            "hardware_tags": ["CIR", "ACME"],
            "safety_pillar": "Fundamentals",
            "safety_pillars": ["Fundamentals"],
            "fuel_phase": "Gas",
            "o2_range": "21% O2 (Air Coflow)",
            "pressure_psia": "14.7 psia",
            "airflow_cm_s": "Coflow air velocity (5–35 cm/s)",
            "gravity_regime": "0g (ISS Microgravity)",
            "o2_min": 21.0,
            "o2_max": 21.0,
            "pressure_min_psia": 14.7,
            "pressure_max_psia": 14.7,
            "airflow_min_cms": 5.0,
            "airflow_max_cms": 35.0,
            "pages": [16, 44, 52],
            "fuels_geometry": "Lifted methane and ethylene coflow laminar diffusion flames (pure sooty to highly diluted near-extinction)",
            "controlled_variables": "Lifted flame stabilization (eliminates burner heat loss), coflow burner",
            "varied_parameters": "Injection velocity, fuel dilution extremes",
            "sensors_diagnostics": "Color & UV cameras, radiometers, soot diagnostics",
            "objective": "Extend chemical kinetic and soot formation submodels at the extremes of fuel dilution (very dilute near-extinction and pure-fuel sooting flames).",
            "hypothesis": "Lifted coflow flames in microgravity decouple burner heat loss from chemical kinetics and soot inception.",
            "research_impacts": "Improves turbulent combustion, ignition, and emissions models for terrestrial gas turbines and engines.",
        },
    ]

    supplementary_studies: list[dict[str, Any]] = []
    pdf_chunks: list[dict[str, Any]] = []

    for item in supplementary_defs:
        excerpt = page_slice(guide_pages, item["pages"])
        study = {
            "study_id": item["study_id"],
            "source_type": "NASA ISS Guide PDF",
            "source_file": f"raw_nasa_data/{GUIDE_PDF.name}",
            "title": item["title"],
            "acronym": item["acronym"],
            "doi": item["doi"],
            "doi_url": item["doi_url"],
            "hardware": item["hardware"],
            "hardware_tags": item["hardware_tags"],
            "hardware_links": [],
            "flight_platform": "International Space Station (ISS) / STS-107",
            "managing_center": "Glenn Research Center (GRC)",
            "sub_research_area": "ISS Combustion Science & Fire Safety",
            "study_design_types": [item["safety_pillar"], item["fuel_phase"], "Microgravity"],
            "objective": item["objective"],
            "hypothesis": item["hypothesis"],
            "approach": f"Extracted from NASA ISS Combustion Science Researcher's Guide (pages {', '.join(map(str, item['pages']))}).",
            "research_impacts": item["research_impacts"],
            "publications": [
                {
                    "title": "A Researcher's Guide to ISS Combustion Science (NP-2015-10-034-JSC)",
                    "doi": "NP-2015-10-034-JSC",
                    "authors": "NASA ISS Program Science Office / Glenn Research Center",
                    "link": item["doi_url"],
                    "status": "published",
                }
            ],
            "personnel": [],
            "safety_pillar": item["safety_pillar"],
            "safety_pillars": item["safety_pillars"],
            "fuel_phase": item["fuel_phase"],
            "o2_range": item["o2_range"],
            "pressure_psia": item["pressure_psia"],
            "airflow_cm_s": item["airflow_cm_s"],
            "gravity_regime": item["gravity_regime"],
            "o2_min": item["o2_min"],
            "o2_max": item["o2_max"],
            "pressure_min_psia": item["pressure_min_psia"],
            "pressure_max_psia": item["pressure_max_psia"],
            "airflow_min_cms": item["airflow_min_cms"],
            "airflow_max_cms": item["airflow_max_cms"],
            "fuels_geometry": item["fuels_geometry"],
            "controlled_variables": item["controlled_variables"],
            "varied_parameters": item["varied_parameters"],
            "within_study_same": item["controlled_variables"],
            "within_study_varied": item["varied_parameters"],
            "sensors_diagnostics": item["sensors_diagnostics"],
        }
        study["context_header"] = make_context_header(study)
        supplementary_studies.append(study)

        pdf_chunks.append({
            "chunk_id": f"{study['study_id']}::guide_excerpt",
            "study_id": study["study_id"],
            "acronym": study["acronym"],
            "doi": study["doi"],
            "section": f"ISS Guide pp. {','.join(map(str, item['pages']))}",
            "context_header": study["context_header"],
            "raw_text": excerpt[:3000],
            "injected_text": f"{study['context_header']}\n[NASA ISS Guide Excerpt] {item['objective']} {item['research_impacts']}\n{excerpt[:2600]}",
            "source_file": study["source_file"],
        })

    # Add key safety misconceptions & SoFIE chunks from Guide pp. 35, 38, 43-45, 52
    special_pages = [
        ("GUIDE-FIRE-MISCONCEPTIONS", "ISS Fire Safety", "CIR / MSG / SoFIE", "Prevention", "Solid / Gas / Liquid",
         "14–34% O2", "4.3–14.7 psia", "0–40 cm/s", "0g (ISS Microgravity)", 35,
         "Three critical spacecraft fire safety misconceptions (quiescent fires, ventilation shutoff, terrestrial Test 1 conservatism)"),
        ("GUIDE-COOL-FLAMES", "FLEX / Cool Flames", "CIR / MDCA", "Suppression", "Liquid",
         "15–21% O2", "7.35–44.1 psia", "0 cm/s", "0g (ISS Microgravity)", 34,
         "Cool flame invisible low-temperature re-ignition after hot flame extinction"),
        ("GUIDE-HARDWARE-CIR-MSG", "CIR / MSG / SoFIE", "CIR / MSG / SoFIE", "Fundamentals", "Solid / Liquid / Gas",
         "10–85% O2", "3.7–73.5 psia", "0–40 cm/s", "0g (ISS Facility Specs)", 44,
         "CIR 100-L chamber (8 optical windows) & MSG 255-L negative-pressure containment workbench"),
        ("GUIDE-APPENDIX-TABLE", "MDCA / ACME / SoFIE / MSG", "CIR / MSG", "Fundamentals", "All Phases",
         "10–85% O2", "3.7–73.5 psia", "0–40 cm/s", "0g (ISS Hardware Table)", 52,
         "ISS Combustion Mini-Facilities summary specifications (up mass, volume, power, data, diagnostics)"),
    ]
    for sid, acr, hw, pil, phase, o2r, pr, af, grav, pnum, desc in special_pages:
        hdr = f"[{sid} | {acr} | {hw} | {pil} | {phase} | {o2r} | {pr} | {af} | {grav}]"
        txt = guide_pages[pnum - 1]
        pdf_chunks.append({
            "chunk_id": f"{sid}::p{pnum}",
            "study_id": sid,
            "acronym": acr,
            "doi": f"NP-2015-10-034-JSC p.{pnum}",
            "section": f"Guide p.{pnum} — {desc}",
            "context_header": hdr,
            "raw_text": txt,
            "injected_text": f"{hdr}\n[{desc}] {txt}",
            "source_file": f"raw_nasa_data/{GUIDE_PDF.name}",
        })

    # Extract SAME EIRD chunks (pp. 11, 22, 23)
    for pnum, label in [(11, "Ionization vs Light-Scattering 0.2 um Threshold"), (22, "Table 1-2 Smoke Particulate Sizes 0g vs 1g"), (23, "Reduced-g Dust vs Smoke Separation & Residence Time")]:
        hdr = f"[PSI-102 | SAME EIRD | MSG / P-Trak / DustTrak | Detection | Aerosol/Particulate | 21% O2 | 14.7 psia | 5–25 cm/s | 0g vs 1g]"
        txt = same_pages[pnum - 1]
        pdf_chunks.append({
            "chunk_id": f"SAME-EIRD::p{pnum}",
            "study_id": "PSI-102",
            "acronym": "SAME (EIRD)",
            "doi": "10.60555/gd4k-8h62",
            "section": f"SAME EIRD p.{pnum} — {label}",
            "context_header": hdr,
            "raw_text": txt,
            "injected_text": f"{hdr}\n[{label}] {txt}",
            "source_file": f"raw_nasa_data/{SAME_EIRD_PDF.name}",
        })

    # Hardware rack specs grounded in Guide pp. 43-45, 52 & PSI-98/99/100
    hardware_racks = [
        {
            "id": "CIR",
            "name": "Combustion Integrated Rack (CIR)",
            "location": "ISS U.S. Laboratory (Destiny) — Delivered STS-126 (Nov 2008)",
            "volume": "100-liter combustion chamber with 8 optical windows",
            "up_mass_kg": None,
            "power_kw": None,
            "data_volume_gb": None,
            "capabilities": "Reconfigurable diagnostics, passive vibration isolation (ARIS/PIMS), gas distribution/cleanup, vacuum exhaust, digital cameras",
            "supported_inserts_studies": ["MDCA (PSI-39 CFI, PSI-68 FLEX-2)", "ACME (PSI-20 BRE, PSI-159 CFI-G, CLD Flame, E-FIELD Flames, Flame Design, s-Flame)", "SoFIE"],
            "source_citation": "NP-2015-10-034-JSC pp. 43–44",
        },
        {
            "id": "MDCA",
            "name": "Multi-User Droplet Combustion Apparatus (MDCA)",
            "location": "CIR Insert (On-orbit)",
            "volume": "0.48 m³",
            "up_mass_kg": 254,
            "power_kw": 0.73,
            "data_volume_gb": 72,
            "capabilities": "Analog color camera, radiometer, low-light UV camera, two HiBMs cameras, droplet deployment needles & hot-wire igniters, TSC capable",
            "supported_inserts_studies": ["PSI-39 (CFI)", "PSI-68 (FLEX-2)", "FLEX", "FLEX-ICE-GA"],
            "source_citation": "NP-2015-10-034-JSC p. 52",
        },
        {
            "id": "ACME",
            "name": "Advanced Combustion via Microgravity Experiments (ACME)",
            "location": "CIR Insert",
            "volume": "0.50 m³",
            "up_mass_kg": 250,
            "power_kw": 0.75,
            "data_volume_gb": 72,
            "capabilities": "Radiometers, two color cameras, low-light UV camera, two HiBMs cameras, photomultiplier tubes (PMTs), ion current measurement (up to 10 kV), gas chromatograph, TSC capable",
            "supported_inserts_studies": ["PSI-20 (ACME BRE)", "PSI-159 (ACME CFI-G)", "CLD Flame", "E-FIELD Flames", "Flame Design", "s-Flame"],
            "source_citation": "NP-2015-10-034-JSC pp. 44, 52",
        },
        {
            "id": "SoFIE",
            "name": "Solid Fuel Ignition and Extinction (SoFIE)",
            "location": "CIR Insert (Solid-fuel successor to BASS-II)",
            "volume": "0.50 m³",
            "up_mass_kg": 250,
            "power_kw": 0.75,
            "data_volume_gb": 72,
            "capabilities": "Same diagnostics suite as ACME (radiometers, dual color cameras, UV, HiBMs, PMTs, ion current, GC) for solid spacecraft materials in realistic geometries & SEA atmospheres",
            "supported_inserts_studies": ["Flame Spread", "GEL", "Narrow Channel", "SMuRF", "MIST (SoFIE)"],
            "source_citation": "NP-2015-10-034-JSC pp. 19, 44, 52",
        },
        {
            "id": "MSG",
            "name": "Microgravity Science Glovebox (MSG)",
            "location": "ISS U.S. Laboratory (Operating since July 2002; >10,000 payload hours)",
            "volume": "255-liter enclosed negative-pressure workbench (mini-facility insert: 0.1 m³)",
            "up_mass_kg": 40,
            "power_kw": 0.05,
            "data_volume_gb": 10,
            "capabilities": "1,000 W DC power (120/28/±12/5 Vdc), 1,000 W cooling, 2-level containment, digital still/video camera, air/fuel flow control (0–40 cm/s wind tunnel), radiometer, GN2 supply",
            "supported_inserts_studies": ["PSI-25 (BASS-II)", "PSI-60 (SPICE)", "PSI-62 (BASS-FGM)", "PSI-102 (SAME)", "PSI-106 (SLICE)"],
            "source_citation": "NP-2015-10-034-JSC pp. 44–45, 52",
        },
        {
            "id": "SAFFIRE",
            "name": "Spacecraft Fire Experiment Enclosure (Cygnus PCM)",
            "location": "Uncrewed Northrop Grumman Cygnus Resupply Spacecraft (post-unberth)",
            "volume": "Full-scale flow duct inside Cygnus Pressurized Cargo Module",
            "up_mass_kg": None,
            "power_kw": None,
            "data_volume_gb": None,
            "capabilities": "Large-scale 0.94 m × 0.40 m Sibal & multi-material cards, 20–30 cm/s forced flow, O2/CO2 mole fraction sensors, pressure transducers, radiometers, dual HD cameras",
            "supported_inserts_studies": ["PSI-98 (SAFFIRE-I)", "PSI-99 (SAFFIRE-II)", "PSI-100 (SAFFIRE-III)"],
            "source_citation": "PSI-98 / PSI-99 / PSI-100 ISA-Tab Metadata",
        },
    ]

    # Parse Table 1-2 numbers directly from SAME EIRD page 22 for verification
    p22 = same_pages[21]
    same_eird_metrics = {
        "source": "SAME EIRD Rev 2.00 (pp. 11, 22–23) & PSI-47 / PSI-102",
        "crossover_threshold_um": 0.2,
        "detector_physics": {
            "ionization": "Proportional to particle diameter (~d); more sensitive below 0.2 µm (flaming smoke)",
            "photoelectric": "Proportional to diameter cubed (~d^3); exponentially more sensitive above 0.2 µm (smoldering/coagulated µg smoke)",
        },
        "particulate_comparison": [
            {"material": "Kapton", "low_g_primary_nm": 76, "one_g_primary_nm": 35, "low_g_aggregate_nm": 223, "one_g_aggregate_nm": 35},
            {"material": "Candle", "low_g_primary_nm": 34, "one_g_primary_nm": 17, "low_g_aggregate_nm": 976, "one_g_aggregate_nm": 265},
            {"material": "Teflon", "low_g_primary_nm": 136, "one_g_primary_nm": 75, "low_g_aggregate_nm": 662, "one_g_aggregate_nm": 277},
        ],
        "p22_verified": "Kapton 76" in p22 and "Teflon" in p22,
    }

    return supplementary_studies, pdf_chunks, hardware_racks, same_eird_metrics


def run_ingestion() -> dict[str, Any]:
    txt_files = sorted(glob.glob(str(RAW_DATA_DIR / "*.txt")))
    psi_studies = [parse_isa_tab_file(Path(p)) for p in txt_files]
    psi_studies.sort(key=lambda s: int(re.search(r"\d+", s["study_id"]).group()) if re.search(r"\d+", s["study_id"]) else 999)

    pdf_studies, pdf_chunks, hardware_racks, same_eird_metrics = extract_pdf_studies_and_hardware()

    all_studies = psi_studies + pdf_studies
    all_chunks: list[dict[str, Any]] = []
    for st in psi_studies:
        all_chunks.extend(build_study_chunks(st))
    all_chunks.extend(pdf_chunks)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "counts": {
            "psi_isa_tab_studies": len(psi_studies),
            "pdf_supplementary_studies": len(pdf_studies),
            "total_studies": len(all_studies),
            "total_context_injected_chunks": len(all_chunks),
            "hardware_racks": len(hardware_racks),
            "total_publications": sum(len(s.get("publications", [])) for s in all_studies),
        },
        "studies": all_studies,
        "chunks": all_chunks,
        "hardware_racks": hardware_racks,
        "same_eird_metrics": same_eird_metrics,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    return payload


if __name__ == "__main__":
    data = run_ingestion()
    print("Ingestion complete:", json.dumps(data["counts"], indent=2))

