from typing import List, Dict
from sentence_transformers import CrossEncoder
import os

RERANK_MODEL = os.getenv("RERANK_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")

class ReRanker:
    def __init__(self):
        self.model = CrossEncoder(RERANK_MODEL)

    def rerank(self, query: str, candidates: List[Dict], top_k: int = 3):
        """
        candidates: list of {"metadata": {...}, "score": ...}
        Returns top_k items sorted by cross-encoder score.
        """
        texts = [c["metadata"]["text"] for c in candidates]
        pairs = [[query, t] for t in texts]
        scores = self.model.predict(pairs)
        # attach scores and sort
        for cand, s in zip(candidates, scores):
            cand["rerank_score"] = float(s)
        candidates_sorted = sorted(candidates, key=lambda x: x["rerank_score"], reverse=True)
        return candidates_sorted[:top_k]
