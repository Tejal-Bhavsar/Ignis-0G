"""
Real Scikit-Learn Predictive & Classification Engine (IGNIS-PSI).

Trained strictly on the real ingested NASA PSI dataset (`backend/data/indexed_psi.json`):
1. NLP Safety-Pillar Classifier: `TfidfVectorizer` + `LogisticRegression` trained on all
   real PSI study texts & 78 Explicit Context-Injected chunks to classify any new
   anomaly description or experiment proposal into Prevention / Detection / Suppression / Fundamentals.
2. Physical-Space Hazard & Future Warning Predictor: `RandomForestClassifier` + `StandardScaler`
   `NearestNeighbors` trained on the real documented `(O2%, Pressure psia, Airflow cm/s)` envelopes
   of the 19 NASA studies to predict dominant pillar, fuel-phase vulnerability, future warning
   probabilities, and nearest empirical NASA flight analogues.
"""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler


def _derive_study_warning_flags(st: dict[str, Any]) -> dict[str, int]:
    """Derive ground-truth binary hazard tags directly from real study metadata."""
    text = f"{st.get('title', '')} {st.get('objective', '')} {st.get('research_impacts', '')} {st.get('fuels_geometry', '')}".lower()
    o2_max = float(st.get("o2_max", 21.0))
    o2_min = float(st.get("o2_min", 21.0))
    p_min = float(st.get("pressure_min_psia", 14.7))
    f_max = float(st.get("airflow_max_cms", 0.0))

    return {
        "goldilocks_upstream": int((st.get("fuel_phase") == "Solid" and f_max >= 15.0) or "goldilocks" in text or "bass" in text),
        "elevated_o2_sea": int(o2_max >= 26.5 and p_min <= 10.5),
        "cool_flame_reignition": int("cool flame" in text or "re-ignit" in text or st.get("study_id") in ("PSI-39", "PSI-68", "PSI-159")),
        "aerosol_dust_crossover": int(st.get("safety_pillar") == "Detection" and ("aerosol" in st.get("fuel_phase", "").lower() or "smoke" in text or "dust" in text)),
        "hypoxic_low_o2_burn": int(o2_min <= 18.0),
    }


class PSIMLPredictor:
    def __init__(self, studies: list[dict[str, Any]], chunks: list[dict[str, Any]]) -> None:
        self.studies = studies
        self.chunks = chunks
        self.study_by_id = {s["study_id"]: s for s in studies}

        # 1. Train NLP Safety-Pillar Classifier on real NASA PSI chunks + study records
        nlp_texts: list[str] = []
        nlp_labels: list[str] = []
        for s in studies:
            doc = f"{s.get('title', '')} {s.get('fuels_geometry', '')} {s.get('objective', '')} {s.get('research_impacts', '')}"
            nlp_texts.append(doc)
            nlp_labels.append(s["safety_pillar"])
        for c in chunks:
            raw = c.get("raw_text", "").strip()
            if len(raw) >= 40 and c.get("study_id") in self.study_by_id:
                nlp_texts.append(raw)
                nlp_labels.append(self.study_by_id[c["study_id"]]["safety_pillar"])

        self.tfidf = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=2500)
        X_nlp = self.tfidf.fit_transform(nlp_texts)
        self.nlp_clf = LogisticRegression(max_iter=1000, class_weight="balanced", C=2.0)
        self.nlp_clf.fit(X_nlp, nlp_labels)

        # Honest 5-fold stratified CV score on the real corpus
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(self.nlp_clf, X_nlp, nlp_labels, cv=cv, scoring="accuracy")
        self.nlp_cv_accuracy = round(float(np.mean(cv_scores)), 3)
        self.nlp_sample_count = len(nlp_texts)

        # 2. Train Physical-Space Models on real documented (O2%, psia, cm/s) envelopes
        X_phys_rows: list[list[float]] = []
        y_pillar: list[str] = []
        y_phase: list[str] = []
        y_warnings: dict[str, list[int]] = {
            "goldilocks_upstream": [],
            "elevated_o2_sea": [],
            "cool_flame_reignition": [],
            "aerosol_dust_crossover": [],
        }

        study_centroids: list[list[float]] = []
        self.study_centroid_ids: list[str] = []

        for s in studies:
            o2_lo = float(s.get("o2_min", 21.0))
            o2_hi = float(s.get("o2_max", 21.0))
            p_lo = float(s.get("pressure_min_psia", 14.7))
            p_hi = float(s.get("pressure_max_psia", 14.7))
            f_lo = float(s.get("airflow_min_cms", 0.0))
            f_hi = float(s.get("airflow_max_cms", 0.0))

            o2_mid = 0.5 * (o2_lo + o2_hi)
            p_mid = 0.5 * (p_lo + p_hi)
            f_mid = 0.5 * (f_lo + f_hi)

            study_centroids.append([o2_mid, p_mid, f_mid])
            self.study_centroid_ids.append(s["study_id"])

            flags = _derive_study_warning_flags(s)
            phase_clean = "Gas" if str(s.get("fuel_phase", "")).startswith("Gas") else s.get("fuel_phase", "Solid")

            # Sample real envelope vertices (min, mid, max) documented in each study
            envelope_pts = [
                [o2_lo, p_lo, f_lo],
                [o2_mid, p_mid, f_mid],
                [o2_hi, p_hi, f_hi],
                [o2_hi, p_lo, f_mid],
                [o2_lo, p_hi, f_hi],
            ]
            for pt in envelope_pts:
                X_phys_rows.append(pt)
                y_pillar.append(s["safety_pillar"])
                y_phase.append(phase_clean)
                for wk in y_warnings:
                    y_warnings[wk].append(flags[wk])

        X_phys = np.array(X_phys_rows, dtype=float)
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X_phys)

        self.pillar_rf = RandomForestClassifier(n_estimators=120, random_state=42, class_weight="balanced")
        self.pillar_rf.fit(X_scaled, y_pillar)

        self.phase_rf = RandomForestClassifier(n_estimators=120, random_state=42, class_weight="balanced")
        self.phase_rf.fit(X_scaled, y_phase)

        self.warning_models: dict[str, RandomForestClassifier] = {}
        for wk, y_vec in y_warnings.items():
            clf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight="balanced")
            clf.fit(X_scaled, y_vec)
            self.warning_models[wk] = clf

        # Nearest-Neighbor index over real study centroids in scaled (O2, psia, cm/s) space
        self.centroid_scaler = StandardScaler()
        centroids_scaled = self.centroid_scaler.fit_transform(np.array(study_centroids, dtype=float))
        self.nn = NearestNeighbors(n_neighbors=min(4, len(studies)), metric="euclidean")
        self.nn.fit(centroids_scaled)

    def predict_habitat(
        self,
        o2_pct: float,
        pressure_psia: float,
        airflow_cms: float,
    ) -> dict[str, Any]:
        pt = np.array([[float(o2_pct), float(pressure_psia), float(airflow_cms)]], dtype=float)
        pt_scaled = self.scaler.transform(pt)

        # Pillar probabilities
        p_probs = self.pillar_rf.predict_proba(pt_scaled)[0]
        pillar_dist = sorted(
            [
                {"label": cls, "probability": round(float(prob), 3)}
                for cls, prob in zip(self.pillar_rf.classes_, p_probs)
            ],
            key=lambda x: x["probability"],
            reverse=True,
        )

        # Fuel phase probabilities
        ph_probs = self.phase_rf.predict_proba(pt_scaled)[0]
        phase_dist = sorted(
            [
                {"label": cls, "probability": round(float(prob), 3)}
                for cls, prob in zip(self.phase_rf.classes_, ph_probs)
            ],
            key=lambda x: x["probability"],
            reverse=True,
        )

        # Future warning probabilities
        warning_labels = {
            "goldilocks_upstream": "Goldilocks Upstream Flame Spread",
            "elevated_o2_sea": "Elevated-O2 SEA Rapid Acceleration",
            "cool_flame_reignition": "Invisible Cool-Flame Re-Ignition",
            "aerosol_dust_crossover": "0g Smoke Coagulation / Dust False Alarm",
        }
        warning_forecasts = []
        for wk, clf in self.warning_models.items():
            probs = clf.predict_proba(pt_scaled)[0]
            pos_idx = list(clf.classes_).index(1) if 1 in clf.classes_ else None
            pos_prob = float(probs[pos_idx]) if pos_idx is not None else 0.0
            warning_forecasts.append({
                "id": wk,
                "label": warning_labels[wk],
                "probability": round(pos_prob, 3),
                "risk_band": "HIGH" if pos_prob >= 0.6 else ("MODERATE" if pos_prob >= 0.35 else "LOW"),
            })
        warning_forecasts.sort(key=lambda x: x["probability"], reverse=True)

        # Feature importances from RandomForest
        feat_names = ["O2 Concentration (%)", "Cabin Pressure (psia)", "Airflow Velocity (cm/s)"]
        importances = [
            {"feature": fn, "importance": round(float(imp), 3)}
            for fn, imp in zip(feat_names, self.pillar_rf.feature_importances_)
        ]

        # Nearest real NASA PSI studies in scaled physical space
        pt_cent = self.centroid_scaler.transform(pt)
        dists, idxs = self.nn.kneighbors(pt_cent)
        nearest_studies = []
        for dist, idx in zip(dists[0], idxs[0]):
            sid = self.study_centroid_ids[int(idx)]
            st = self.study_by_id[sid]
            nearest_studies.append({
                "study_id": sid,
                "acronym": st["acronym"],
                "title": st["title"],
                "safety_pillar": st["safety_pillar"],
                "o2_range": st["o2_range"],
                "pressure_psia": st["pressure_psia"],
                "airflow_cm_s": st["airflow_cm_s"],
                "physical_distance": round(float(dist), 3),
            })

        return {
            "model_metadata": {
                "physical_model": "RandomForestClassifier (120 trees) + StandardScaler NearestNeighbors",
                "nlp_model": "TfidfVectorizer (1-2 ngrams) + Balanced LogisticRegression",
                "training_studies": len(self.studies),
                "training_chunks": self.nlp_sample_count,
                "nlp_5fold_cv_accuracy": self.nlp_cv_accuracy,
            },
            "predicted_pillar": pillar_dist[0]["label"],
            "pillar_probabilities": pillar_dist,
            "predicted_fuel_phase": phase_dist[0]["label"],
            "phase_probabilities": phase_dist,
            "warning_forecasts": warning_forecasts,
            "feature_importances": importances,
            "nearest_physical_studies": nearest_studies,
        }

    def classify_text(self, text: str) -> dict[str, Any]:
        """Classify any anomaly description or experiment text into NASA PSI Safety Pillars."""
        cleaned = text.strip()
        if not cleaned:
            return {"error": "Empty text", "probabilities": []}
        X = self.tfidf.transform([cleaned])
        probs = self.nlp_clf.predict_proba(X)[0]
        dist = sorted(
            [
                {"pillar": cls, "probability": round(float(prob), 3)}
                for cls, prob in zip(self.nlp_clf.classes_, probs)
            ],
            key=lambda x: x["probability"],
            reverse=True,
        )
        return {
            "input_text": cleaned,
            "predicted_pillar": dist[0]["pillar"],
            "confidence": dist[0]["probability"],
            "probabilities": dist,
            "model_cv_accuracy": self.nlp_cv_accuracy,
            "training_samples": self.nlp_sample_count,
        }
