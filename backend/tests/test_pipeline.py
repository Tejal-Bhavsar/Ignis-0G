"""Verification suite for IGNIS-PSI ingestion, ranking, simulation, and API endpoints."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402


class TestIgnisPSI(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_health_and_ingested_counts(self) -> None:
        r = self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        counts = r.json()["counts"]
        self.assertGreaterEqual(counts["psi_isa_tab_studies"], 13)
        self.assertGreaterEqual(counts["pdf_supplementary_studies"], 6)
        self.assertGreaterEqual(counts["total_context_injected_chunks"], 70)

    def test_required_psi_studies_present(self) -> None:
        studies = {s["study_id"]: s for s in self.client.get("/api/studies").json()["studies"]}
        for required_id in [
            "PSI-20", "PSI-25", "PSI-39", "PSI-47", "PSI-60",
            "PSI-62", "PSI-68", "PSI-98", "PSI-99", "PSI-100",
            "PSI-102", "PSI-106", "PSI-159",
            "PDF-EFIELD", "PDF-MIST", "PDF-SAMER",
        ]:
            self.assertIn(required_id, studies)
            self.assertTrue(studies[required_id]["context_header"].startswith("["))

    def test_ranker_sibal_query(self) -> None:
        r = self.client.post(
            "/api/rank",
            json={"query": "Sibal 0.94 m Cygnus", "o2_pct": 21.0, "pressure_psia": 14.7, "airflow_cms": 20.0},
        )
        self.assertEqual(r.status_code, 200)
        top_ids = [x["study"]["study_id"] for x in r.json()["results"][:3]]
        self.assertIn("PSI-98", top_ids)

    def test_simulator_goldilocks_and_sea(self) -> None:
        r = self.client.post(
            "/api/simulate",
            json={"o2_pct": 34.0, "pressure_psia": 8.2, "airflow_cms": 10.0, "gravity_target": "1/6g"},
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["metrics"]["risk_level"], "CRITICAL")
        self.assertTrue(data["metrics"]["goldilocks_regime"])
        codes = {w["code"] for w in data["warnings"]}
        self.assertIn("BASS2_GOLDILOCKS", codes)
        self.assertIn("N2_JET_ENTRAINMENT", codes)
        self.assertIn("PARTIAL_G_BOUNDING_GAP", codes)

    def test_compare_and_ask_citations(self) -> None:
        cmp_res = self.client.post("/api/compare", json={"study_ids": ["PSI-20", "PSI-25", "PSI-98"]})
        self.assertEqual(cmp_res.status_code, 200)
        self.assertEqual(len(cmp_res.json()["matrix"]), 3)

        ask_res = self.client.post(
            "/api/ask",
            json={"question": "Arizona Red Dust P-Trak capillary", "o2_pct": 21.0, "pressure_psia": 14.7, "airflow_cms": 10.0},
        )
        self.assertEqual(ask_res.status_code, 200)
        ev_ids = [e["study_id"] for e in ask_res.json()["evidence"]]
        self.assertIn("PSI-47", ev_ids)

    def test_detection_and_spinoffs(self) -> None:
        det = self.client.get("/api/detection-suppression").json()
        self.assertEqual(det["aerosol_detection"]["crossover_um"], 0.2)
        self.assertEqual(len(det["aerosol_detection"]["particulate_comparison"]), 3)
        self.assertGreaterEqual(len(det["suppression_tradeoffs"]), 4)

        spin = self.client.get("/api/spinoffs").json()
        self.assertGreaterEqual(len(spin["spinoffs"]), 4)


if __name__ == "__main__":
    unittest.main()
