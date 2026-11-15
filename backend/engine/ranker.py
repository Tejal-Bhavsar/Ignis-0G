"""
Multi-Factor Relevance Ranker for IGNIS-PSI.

Combines TF-IDF lexical/semantic cosine similarity over Explicit Context-Injected
NASA PSI chunks with physical parameter proximity scoring (O2%, pressure psia,
airflow cm/s, fuel phase, hardware rack, and safety pillar).
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class MultiFactorRanker:
    def __init__(self, studies: list[dict[str, Any]], chunks: list[dict[str, Any]]) -> None:
        self.studies = studies
        self.study_by_id = {s["study_id"]: s for s in studies}
        self.chunks = chunks

        corpus = [c["injected_text"] for c in chunks]
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words="english",
            max_features=12000,
            sublinear_tf=True,
        )
        self.chunk_matrix = self.vectorizer.fit_transform(corpus) if corpus else None

        # Precompute chunks grouped by study_id
        self.chunks_by_study: dict[str, list[int]] = {}
        for idx, ch in enumerate(chunks):
            self.chunks_by_study.setdefault(ch["study_id"], []).append(idx)

    @staticmethod
    def _range_proximity(val: float | None, low: float, high: float, scale: float) -> tuple[float, bool]:
        """Return (0..1 proximity score, is_inside_range)."""
        if val is None:
            return 0.5, False
        if low <= val <= high:
            return 1.0, True
        dist = min(abs(val - low), abs(val - high))
        return math.exp(-dist / max(scale, 1e-6)), False

    def retrieve_chunks(
        self,
        query: str,
        top_k: int = 6,
        safety_pillar: str | None = None,
        hardware: str | None = None,
        max_per_study: int = 2,
    ) -> list[dict[str, Any]]:
        if not self.chunks or self.chunk_matrix is None:
            return []

        q_lower = (query or "spacecraft fire safety combustion").lower()
        q_tokens = [t for t in q_lower.replace("/", " ").replace("-", " ").split() if len(t) > 2]
        q_vec = self.vectorizer.transform([query or "spacecraft fire safety combustion"])
        sims = cosine_similarity(q_vec, self.chunk_matrix).flatten()

        scored = []
        for idx, sim in enumerate(sims):
            ch = self.chunks[idx]
            st = self.study_by_id.get(ch["study_id"])
            boost = 0.0
            if st:
                if safety_pillar and safety_pillar.lower() in [p.lower() for p in st.get("safety_pillars", [])]:
                    boost += 0.12
                if hardware and hardware.lower() in [h.lower() for h in st.get("hardware_tags", [])]:
                    boost += 0.12
                title_acr = f"{st['study_id']} {st['acronym']} {st['title']} {st.get('fuels_geometry', '')}".lower()
                for tok in q_tokens:
                    if tok in title_acr:
                        boost += 0.06
            scored.append((float(sim) + boost, float(sim), ch))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        per_study_counts: dict[str, int] = {}
        for total, raw_sim, ch in scored:
            sid = ch["study_id"]
            if per_study_counts.get(sid, 0) >= max_per_study:
                continue
            per_study_counts[sid] = per_study_counts.get(sid, 0) + 1
            results.append({
                **ch,
                "score": round(total, 4),
                "semantic_similarity": round(raw_sim, 4),
            })
            if len(results) >= top_k:
                break
        return results

    def rank_studies(
        self,
        query: str = "",
        o2_pct: float | None = None,
        pressure_psia: float | None = None,
        airflow_cms: float | None = None,
        safety_pillar: str | None = None,
        fuel_phase: str | None = None,
        hardware: str | None = None,
        limit: int = 19,
    ) -> list[dict[str, Any]]:
        """Rank studies using semantic similarity + physical habitat proximity."""
        has_query = bool(query and query.strip())
        if has_query and self.chunk_matrix is not None:
            q_vec = self.vectorizer.transform([query.strip()])
            chunk_sims = cosine_similarity(q_vec, self.chunk_matrix).flatten()
        else:
            chunk_sims = np.zeros(len(self.chunks), dtype=float)

        ranked: list[dict[str, Any]] = []
        for st in self.studies:
            sid = st["study_id"]

            # Hard filters if user selected facet chips
            if safety_pillar and safety_pillar != "All":
                if safety_pillar.lower() not in [p.lower() for p in st.get("safety_pillars", [st.get("safety_pillar", "")])]:
                    continue
            if fuel_phase and fuel_phase != "All":
                if fuel_phase.lower() not in st.get("fuel_phase", "").lower():
                    continue
            if hardware and hardware != "All":
                if not any(hardware.lower() == h.lower() or hardware.lower() in h.lower() for h in st.get("hardware_tags", [])):
                    continue

            # Semantic score from best matching context-injected chunk + exact metadata hit bonus
            c_indices = self.chunks_by_study.get(sid, [])
            best_chunk = None
            sem_score = 0.5
            if c_indices:
                best_idx = max(c_indices, key=lambda i: chunk_sims[i])
                best_chunk = self.chunks[best_idx]
                raw_sim = float(chunk_sims[best_idx])
                q_lower = query.strip().lower()
                q_tokens = [t for t in q_lower.replace("/", " ").split() if len(t) > 2]
                meta_blob = f"{st['study_id']} {st['acronym']} {st['title']} {st.get('fuels_geometry', '')} {st.get('hardware', '')}".lower()
                exact_hits = sum(1 for t in q_tokens if t in meta_blob)
                kw_bonus = min(0.45, exact_hits * 0.14)
                sem_score = min(1.0, raw_sim * 2.4 + kw_bonus) if has_query else 0.55

            # Physical parameter proximity
            matched_params: list[str] = []
            o2_prox, o2_in = self._range_proximity(o2_pct, float(st.get("o2_min", 21)), float(st.get("o2_max", 21)), 12.0)
            if o2_in and o2_pct is not None:
                matched_params.append(f"O2 {o2_pct:.1f}% in range")

            p_prox, p_in = self._range_proximity(pressure_psia, float(st.get("pressure_min_psia", 14.7)), float(st.get("pressure_max_psia", 14.7)), 6.0)
            if p_in and pressure_psia is not None:
                matched_params.append(f"{pressure_psia:.1f} psia in range")

            f_prox, f_in = self._range_proximity(airflow_cms, float(st.get("airflow_min_cms", 0)), float(st.get("airflow_max_cms", 30)), 15.0)
            if f_in and airflow_cms is not None:
                matched_params.append(f"Flow {airflow_cms:.0f} cm/s in range")

            phys_score = 0.40 * o2_prox + 0.30 * p_prox + 0.30 * f_prox

            # Prioritize core PSI ISA-Tab files slightly on tie
            source_bonus = 0.04 if st.get("source_type") == "NASA PSI ISA-Tab" else 0.0

            if has_query:
                total_score = 0.62 * sem_score + 0.38 * phys_score + source_bonus
            else:
                total_score = 0.30 * sem_score + 0.70 * phys_score + source_bonus

            ranked.append({
                "study": st,
                "total_score": round(min(1.0, total_score), 4),
                "semantic_score": round(sem_score, 4),
                "physical_proximity_score": round(phys_score, 4),
                "matched_parameters": matched_params,
                "best_chunk": {
                    "chunk_id": best_chunk["chunk_id"],
                    "section": best_chunk["section"],
                    "context_header": best_chunk["context_header"],
                    "snippet": best_chunk["raw_text"][:280] + ("..." if len(best_chunk["raw_text"]) > 280 else ""),
                } if best_chunk else None,
            })

        ranked.sort(key=lambda r: r["total_score"], reverse=True)
        return ranked[:limit]

