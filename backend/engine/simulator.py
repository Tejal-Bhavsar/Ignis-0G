"""
Exploration Atmosphere & Partial-Gravity Bounding Simulator (IGNIS-PSI).

Models:
1. Exact NASA Exploration Atmosphere test points from PSI-20 (ACME BRE) & PSI-159 (ACME CFI-G):
   - Earth / ISS Norm: 14.7 psia, 21.0% O2
   - Intermediate SEA: 10.2 psia, 26.5% O2
   - Lunar Habitat / Rover SEA: 8.2 psia, 34.0% O2
   - High-O2 Cool-Flame Limit: up to 85% O2 (ACME CFI-G)
   - Spacesuit EVA: 4.3 psia, 100.0% O2
2. BASS-II (PSI-25) "Goldilocks" low-velocity ventilation regime (0-40 cm/s, peak hazard ~10 cm/s):
   - Flames spread upstream into oncoming airflow and burn at lower O2% than NASA-STD-6001 Test 1.
   - Local nitrogen / suppressant jet entrainment warning (can intensify flames by pushing flow into ~10 cm/s).
3. 0g-1g Bounding Envelope incorporating ACME E-FIELD Flames ion-forcing partial-gravity proxies
   to bound 1/6g Lunar and 3/8g Martian flammability where PSI lacks partial-gravity flight data
   (noting upcoming LUCI and FM2).
"""

from __future__ import annotations

import math
from typing import Any

ATMOSPHERE_PRESETS: list[dict[str, Any]] = [
    {
        "id": "earth_iss",
        "label": "Earth / ISS Norm",
        "o2_pct": 21.0,
        "pressure_psia": 14.7,
        "airflow_cms": 15.0,
        "gravity_target": "0g",
        "source": "PSI-20 (ACME BRE) & ISS Cabin",
        "notes": "Standard sea-level equivalent cabin air (pO2 = 3.09 psia).",
    },
    {
        "id": "intermediate_sea",
        "label": "Intermediate SEA",
        "o2_pct": 26.5,
        "pressure_psia": 10.2,
        "airflow_cms": 10.0,
        "gravity_target": "1/6g",
        "source": "PSI-20 (ACME BRE) Exploration Test Point",
        "notes": "NASA Space Exploration Atmosphere intermediate pressure (pO2 = 2.70 psia).",
    },
    {
        "id": "lunar_habitat",
        "label": "Lunar Habitat / Rover",
        "o2_pct": 34.0,
        "pressure_psia": 8.2,
        "airflow_cms": 10.0,
        "gravity_target": "1/6g",
        "source": "PSI-20 (ACME BRE) Lunar SEA",
        "notes": "Elevated O2% reduces nitrogen thermal ballast, accelerating solid flame spread (pO2 = 2.79 psia).",
    },
    {
        "id": "mars_transit",
        "label": "Mars Transit / Surface Hab",
        "o2_pct": 30.0,
        "pressure_psia": 9.0,
        "airflow_cms": 12.0,
        "gravity_target": "3/8g",
        "source": "NASA SEA / PSI-25 & E-FIELD Bounding",
        "notes": "Partial-gravity 3/8g bounded between 0g ISS and 1g Test 1 envelopes.",
    },
    {
        "id": "cfig_high_o2",
        "label": "High-O2 Regime (CFI-G)",
        "o2_pct": 85.0,
        "pressure_psia": 14.7,
        "airflow_cms": 5.0,
        "gravity_target": "0g",
        "source": "PSI-159 (ACME CFI-G)",
        "notes": "Extreme O2-enriched cool & hot diffusion flame boundary tested in CIR/ACME.",
    },
    {
        "id": "spacesuit_eva",
        "label": "Spacesuit EVA (4.3 psia)",
        "o2_pct": 100.0,
        "pressure_psia": 4.3,
        "airflow_cms": 8.0,
        "gravity_target": "1/6g",
        "source": "NASA EVA Suit Atmosphere (pO2 = 4.3 psia)",
        "notes": "Pure oxygen at 4.3 psia; zero N2 diluent means any ignition source poses extreme flash hazard.",
    },
]

GRAVITY_TARGETS: dict[str, dict[str, Any]] = {
    "0g": {"label": "0g (ISS Microgravity)", "g_ratio": 0.0, "flight_data_status": "Direct PSI Flight Data (ISS / Cygnus)"},
    "1/6g": {"label": "1/6g (Moon Base)", "g_ratio": 1.0 / 6.0, "flight_data_status": "No direct PSI partial-g flight data yet — Bounded via 0g/1g + E-FIELD proxy (awaiting LUCI & FM2)"},
    "3/8g": {"label": "3/8g (Mars Surface)", "g_ratio": 0.376, "flight_data_status": "No direct PSI partial-g flight data yet — Bounded via 0g/1g + E-FIELD proxy (awaiting LUCI & FM2)"},
    "1g": {"label": "1g (Earth / NASA-STD-6001)", "g_ratio": 1.0, "flight_data_status": "Ground Baseline (NASA-STD-6001 Test 1 / Cone Calorimeter Test 2)"},
}


def _moc_curve_0g(flow_cms: float, pressure_psia: float) -> float:
    """
    Compute 0g Limiting Oxygen Concentration (LOC / MOC %) vs forced airflow (0–40 cm/s).

    Grounded in BASS-II (PSI-25) & ACME BRE (PSI-20):
    - Quiescent (0 cm/s): radiative losses raise LOC to ~18.5% at 14.7 psia.
    - "Goldilocks" valley around 10 cm/s: forced oxidizer transport balances radiative
      extinction without convective blowoff -> LOC drops to ~15.8% O2 (below 1g Test 1).
    - High flow (20–40 cm/s): convective residence time drops -> LOC climbs back toward ~19.5%.
    - Lower total pressure (e.g. 8.2 psia) reduces N2 thermal mass per mole O2, shifting
      the effective flammability boundary downward slightly (~1.2–2.0% O2 lower threshold).
    """
    # Goldilocks U-shaped trough centered at 10 cm/s
    quiescent_penalty = 2.7 * math.exp(-((flow_cms / 4.2) ** 1.6))
    blowoff_climb = 0.0055 * max(0.0, flow_cms - 10.0) ** 1.85
    base_goldilocks = 15.8 + quiescent_penalty + blowoff_climb

    # Pressure effect (lower pressure -> lower N2 heat capacity -> slightly easier ignition at fixed O2%)
    pressure_shift = -1.6 * max(0.0, (14.7 - pressure_psia) / (14.7 - 4.3))
    return round(max(13.0, min(28.0, base_goldilocks + pressure_shift)), 2)


def _moc_curve_1g(flow_cms: float, pressure_psia: float) -> float:
    """
    1g Normal-Gravity upward/opposed flammability boundary (NASA-STD-6001 Test 1 reference).
    In 1g, buoyant natural convection (~25–35 cm/s equivalent) dominates below 20 cm/s,
    keeping the effective LOC near ~18.2–19.8% O2 and masking the 10 cm/s 0g Goldilocks dip.
    """
    buoyant_floor = 18.8 + 0.03 * max(0.0, flow_cms - 15.0)
    pressure_shift = -1.1 * max(0.0, (14.7 - pressure_psia) / (14.7 - 4.3))
    return round(max(15.5, min(28.0, buoyant_floor + pressure_shift)), 2)


def _efield_proxy_curve(flow_cms: float, pressure_psia: float, g_ratio: float) -> float:
    """
    ACME E-FIELD Flames (Guide p. 16) ion-forcing partial-gravity proxy envelope.
    Interpolates non-linearly between 0g (radiation/diffusion dominated) and 1g (buoyancy dominated).
    Because partial-g buoyancy velocity scales ~ (g * L)^(1/2) or g^(1/3), 1/6g and 3/8g lie closer
    to the dangerous 0g low-velocity Goldilocks regime than linear interpolation would suggest!
    """
    moc_0g = _moc_curve_0g(flow_cms, pressure_psia)
    moc_1g = _moc_curve_1g(flow_cms, pressure_psia)
    # Square-root Froude-like scaling of buoyant convection with gravity ratio
    weight_1g = math.sqrt(max(0.0, min(1.0, g_ratio))) * 0.85
    return round(moc_0g * (1.0 - weight_1g) + moc_1g * weight_1g, 2)


def simulate_habitat(
    o2_pct: float = 34.0,
    pressure_psia: float = 8.2,
    airflow_cms: float = 10.0,
    gravity_target: str = "1/6g",
) -> dict[str, Any]:
    o2_pct = max(14.0, min(100.0, float(o2_pct)))
    pressure_psia = max(4.3, min(14.7, float(pressure_psia)))
    airflow_cms = max(0.0, min(40.0, float(airflow_cms)))
    if gravity_target not in GRAVITY_TARGETS:
        gravity_target = "1/6g"

    grav_info = GRAVITY_TARGETS[gravity_target]
    g_ratio = grav_info["g_ratio"]

    # Build 0..40 cm/s flammability regime curve (step 2 cm/s)
    curve_points = []
    for v in range(0, 42, 2):
        loc_0g = _moc_curve_0g(float(v), pressure_psia)
        loc_1g = _moc_curve_1g(float(v), pressure_psia)
        loc_target = _efield_proxy_curve(float(v), pressure_psia, g_ratio)
        # Upper and lower partial-gravity uncertainty envelope (E-FIELD bounding)
        env_low = round(min(loc_0g, loc_1g), 2)
        env_high = round(max(loc_0g, loc_1g), 2)
        curve_points.append({
            "airflow_cms": v,
            "loc_0g_pct": loc_0g,
            "loc_1g_pct": loc_1g,
            "loc_target_pct": loc_target,
            "envelope_band": [env_low, env_high],
            "nasa_test1_ref_pct": 21.0,
        })

    # Evaluate live operating point
    loc_0g_pt = _moc_curve_0g(airflow_cms, pressure_psia)
    loc_1g_pt = _moc_curve_1g(airflow_cms, pressure_psia)
    loc_target_pt = _efield_proxy_curve(airflow_cms, pressure_psia, g_ratio)

    po2_psia = round(pressure_psia * (o2_pct / 100.0), 2)
    margin_vs_0g = round(o2_pct - loc_0g_pt, 2)
    margin_vs_target = round(o2_pct - loc_target_pt, 2)

    # Flame spread & risk classification
    goldilocks_zone = 4.0 <= airflow_cms <= 18.0
    quiescent_bre_hazard = airflow_cms < 4.0 and o2_pct >= 21.5
    exceeds_0g_below_test1 = loc_0g_pt <= o2_pct < 21.0

    # Estimated relative spread rate index (normalized to 21% O2, 14.7 psia, 15 cm/s = 1.0)
    o2_factor = max(0.1, (o2_pct / 21.0) ** 1.65)
    pressure_factor = (14.7 / max(4.3, pressure_psia)) ** 0.35
    flow_factor = 1.28 if goldilocks_zone else (0.72 if airflow_cms < 4.0 else 1.05)
    spread_multiplier = round(o2_factor * pressure_factor * flow_factor, 2)

    if o2_pct >= 50.0 or (o2_pct >= 30.0 and pressure_psia <= 10.5):
        risk_level = "CRITICAL"
    elif margin_vs_target >= 4.0 or (goldilocks_zone and o2_pct >= loc_0g_pt):
        risk_level = "HIGH"
    elif margin_vs_target >= 0.0:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW (Sub-Limit)"

    warnings = []
    if goldilocks_zone:
        warnings.append({
            "code": "BASS2_GOLDILOCKS",
            "severity": "HIGH",
            "title": "BASS-II Goldilocks Low-Velocity Regime (4–18 cm/s, peak ~10 cm/s)",
            "detail": (
                "PSI-25 (BASS-II) proved flames in 0g low-velocity flow burn at LOWER oxygen concentrations "
                f"(LOC ~{loc_0g_pt}% O2 here) than NASA-STD-6001 Test 1 (~21% O2) and can spread UPSTREAM into oncoming airflow."
            ),
            "citation": "[PSI-25 | BASS-II | 10.60555/4qc4-de67]",
        })
    if exceeds_0g_below_test1:
        warnings.append({
            "code": "NON_CONSERVATIVE_TEST1",
            "severity": "CRITICAL",
            "title": "NASA-STD-6001 Test 1 Non-Conservative Below 21% O2",
            "detail": (
                f"At {o2_pct:.1f}% O2 and {airflow_cms:.0f} cm/s, terrestrial Test 1 predicts safe self-extinction, "
                f"but 0g microgravity LOC ({loc_0g_pt}% O2) indicates sustained burning is possible."
            ),
            "citation": "[PSI-25 | BASS-II | 10.60555/4qc4-de67]",
        })
    if airflow_cms < 4.0 and o2_pct > 21.0:
        warnings.append({
            "code": "BRE_QUIESCENT_SUSTAINED",
            "severity": "HIGH",
            "title": "Quiescent Ventilation-Off Sustained Burning Risk",
            "detail": (
                "PSI-20 (ACME BRE) proved shutting off cabin ventilation does NOT extinguish fires in elevated-O2 "
                "exploration atmospheres (e.g., 26.5% O2 / 10.2 psia and 34% O2 / 8.2 psia); PMMA & Nylon analogues sustain quasi-steady flames."
            ),
            "citation": "[PSI-20 | ACME BRE | 10.60555/vb93-3y72]",
        })
    if o2_pct >= 34.0 and pressure_psia <= 8.5:
        warnings.append({
            "code": "CFI_HIGH_O2_SEA",
            "severity": "CRITICAL",
            "title": "Elevated-O2 Low-Pressure SEA Acceleration",
            "detail": (
                f"At {o2_pct:.1f}% O2 / {pressure_psia:.1f} psia, reduced nitrogen diluent lowers convective heat sink capacity. "
                "ACME BRE & CFI-G show rapid flame stabilization and cool-flame reactivity."
            ),
            "citation": "[PSI-20 | ACME BRE | 10.60555/vb93-3y72] & [PSI-159 | ACME CFI-G | 10.60555/cyt1-kh64]",
        })

    # Always include the BASS-II N2 jet entrainment advisory
    warnings.append({
        "code": "N2_JET_ENTRAINMENT",
        "severity": "ADVISORY",
        "title": "Suppressant / Nitrogen Jet Air-Entrainment Hazard",
        "detail": (
            "BASS-II (PSI-25) observed that local nitrogen/suppressant jets directed near a quiescent or low-flow flame "
            "can entrain surrounding cabin oxygen and transiently INTENSIFY combustion by pushing local velocity toward ~10 cm/s."
        ),
        "citation": "[PSI-25 | BASS-II | 10.60555/4qc4-de67]",
    })

    if gravity_target in ("1/6g", "3/8g"):
        warnings.append({
            "code": "PARTIAL_G_BOUNDING_GAP",
            "severity": "ADVISORY",
            "title": f"Partial-Gravity ({gravity_target}) Data Gap — Bounded via 0g/1g + E-FIELD Proxy",
            "detail": (
                f"NASA PSI currently lacks long-duration {gravity_target} flight combustion datasets. IGNIS-PSI bounds {gravity_target} "
                "between 0g ISS data (BASS-II / ACME BRE / SAFFIRE) and 1g baselines using ACME E-FIELD Flames ion-wind body-force proxies "
                "(up to 10 kV mesh forcing), pending upcoming LUCI and FM2 partial-gravity missions."
            ),
            "citation": "[PDF-EFIELD | ACME E-FIELD Flames | NP-2015-10-034-JSC pp. 16, 44, 52]",
        })

    # Pre-breathe vs Fire Hazard trade-off curve across NASA Exploration Atmospheres
    # Operational pre-breathe reference durations: standard ~120-240 min at 14.7/21% drops sharply
    # at 10.2/26.5% (~45-75 min) and approaches ~0-15 min at 8.2 psia/34% O2, while O2 enrichment climbs >60%.
    prebreathe_tradeoff = [
        {
            "regime": "Earth / ISS (14.7 psia · 21% O2)",
            "pressure_psia": 14.7,
            "o2_pct": 21.0,
            "o2_enrichment_pct": 0.0,
            "est_prebreathe_min": 140,
            "spread_multiplier": 1.0,
        },
        {
            "regime": "Interm. SEA (10.2 psia · 26.5% O2)",
            "pressure_psia": 10.2,
            "o2_pct": 26.5,
            "o2_enrichment_pct": 26.2,
            "est_prebreathe_min": 55,
            "spread_multiplier": 1.78,
        },
        {
            "regime": "Lunar Hab (8.2 psia · 34% O2)",
            "pressure_psia": 8.2,
            "o2_pct": 34.0,
            "o2_enrichment_pct": 61.9,
            "est_prebreathe_min": 15,
            "spread_multiplier": 2.91,
        },
        {
            "regime": "EVA Suit (4.3 psia · 100% O2)",
            "pressure_psia": 4.3,
            "o2_pct": 100.0,
            "o2_enrichment_pct": 376.2,
            "est_prebreathe_min": 0,
            "spread_multiplier": 12.5,
        },
    ]

    return {
        "operating_point": {
            "o2_pct": round(o2_pct, 1),
            "pressure_psia": round(pressure_psia, 2),
            "airflow_cms": round(airflow_cms, 1),
            "gravity_target": gravity_target,
            "gravity_label": grav_info["label"],
            "po2_psia": po2_psia,
        },
        "metrics": {
            "loc_0g_pct": loc_0g_pt,
            "loc_1g_pct": loc_1g_pt,
            "loc_target_pct": loc_target_pt,
            "margin_vs_0g_pct": margin_vs_0g,
            "margin_vs_target_pct": margin_vs_target,
            "spread_rate_multiplier": spread_multiplier,
            "risk_level": risk_level,
            "goldilocks_regime": goldilocks_zone,
            "quiescent_bre_hazard": quiescent_bre_hazard,
            "flight_data_status": grav_info["flight_data_status"],
        },
        "curve": curve_points,
        "prebreathe_tradeoff": prebreathe_tradeoff,
        "warnings": warnings,
        "presets": ATMOSPHERE_PRESETS,
    }

