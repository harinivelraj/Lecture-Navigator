from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
import numpy as np
import os
import json
import time
from dotenv import load_dotenv
from typing import List, Dict
from pathlib import Path
from pinecone import Pinecone, ServerlessSpec
import re
from .text_processor import text_processor
# BM25 keyword search store
class BM25Store:
    def __init__(self, path="data/bm25_index"):
        self.metapath = Path(path)
        self.metapath.mkdir(parents=True, exist_ok=True)
        self._meta_file = self.metapath / "metadata.json"
        self._metadatas = []
        self._corpus = []
        self._bm25 = None
        self._build_or_load()

    def _build_or_load(self):
        if os.path.exists(self._meta_file):
            with open(self._meta_file, "r", encoding="utf-8") as f:
                self._metadatas = json.load(f)
            self._corpus = [m.get("text","") for m in self._metadatas]
            self._bm25 = BM25Okapi([self._tokenize(doc) for doc in self._corpus])
        else:
            self._metadatas = []
            self._corpus = []
            self._bm25 = None

    def _save(self):
        with open(self._meta_file, "w", encoding="utf-8") as f:
            json.dump(self._metadatas, f, ensure_ascii=False, indent=2)

    def add_documents(self, docs: List[Dict]):
        # PERFORMANCE OPTIMIZATION: Clear existing data first for fresh ingestion
        self._metadatas = []
        self._corpus = []
        
        print(f"Processing {len(docs)} documents for BM25 index...")
        start_time = time.time()
        
        # PERFORMANCE FIX: Batch process all documents efficiently
        for d in docs:
            self._metadatas.append(d["metadata"])
            self._corpus.append(d["text"])
        
        prep_time = time.time()
        print(f"Documents prepared in {(prep_time - start_time)*1000:.0f}ms - Building BM25 index...")
        
        # PERFORMANCE FIX: Build BM25 index with optimized batch tokenization
        tokenized_docs = []
        for doc in self._corpus:
            tokens = self._tokenize(doc)
            tokenized_docs.append(tokens)
        
        self._bm25 = BM25Okapi(tokenized_docs)
        build_time = time.time()
        print(f"BM25 index built in {(build_time - prep_time)*1000:.0f}ms")
        
        # Save metadata to disk
        save_start = time.time()
        self._save()
        save_time = time.time()
        print(f"Metadata saved in {(save_time - save_start)*1000:.0f}ms")
        
        total_time = (save_time - start_time) * 1000
        print(f"Total BM25 indexing time: {total_time:.0f}ms")

    def search(self, query: str, top_k: int = 10):
        # Removed print statement for performance
        if not self._bm25:
            return []
        
        # Use smart text processing to extract content keywords from query
        processed_query = text_processor.preprocess_search_query(query)
        tokenized_query = self._tokenize(processed_query)
        
        scores = self._bm25.get_scores(tokenized_query)
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)[:top_k]
        results = []
        for idx, score in ranked:
            meta = self._metadatas[idx]
            results.append({"score": float(score), "metadata": meta})
        return results

    def _tokenize(self, text):
        # PERFORMANCE OPTIMIZED: Ultra-fast tokenization for BM25 indexing
        if not text:
            return []
        
        # Convert to lowercase once
        text = text.lower()
        
        # PERFORMANCE: Use split and filter instead of regex for basic cases
        # This is much faster for typical text processing
        words = text.split()
        
        # Pre-defined stop words set for O(1) lookup
        stop_words = {'is', 'are', 'was', 'were', 'be', 'been', 'the', 'a', 'an', 'and', 
                     'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
                     'this', 'that', 'it', 'he', 'she', 'we', 'they', 'you', 'i'}
        
        # Fast filtering: remove punctuation and filter stop words in one pass
        filtered_words = []
        for word in words:
            # Strip punctuation quickly
            clean_word = word.strip('.,!?;:"\'()[]{}')
            if len(clean_word) >= 2 and clean_word not in stop_words:
                filtered_words.append(clean_word)
        
        return filtered_words
    

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

MODEL_NAME = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENV = os.getenv("PINECONE_ENV")
PINECONE_INDEX = os.getenv("PINECONE_INDEX")
print("Loaded PINECONE_INDEX from env:", PINECONE_INDEX)

class VectorStore:
    def __init__(self, dim=None, path="data/vector_index"):
        self.model = SentenceTransformer(MODEL_NAME)
        self.dim = dim or self.model.get_sentence_embedding_dimension()
        self.metapath = Path(path)
        self.metapath.mkdir(parents=True, exist_ok=True)
        self._meta_file = self.metapath / "metadata.json"
        self._metadatas = []
        # Initialize Pinecone
        self.pc = Pinecone(api_key=PINECONE_API_KEY)
        print(f"Available Pinecone indexes: {self.pc.list_indexes().names()}")
        if PINECONE_INDEX not in self.pc.list_indexes().names():
            print(f"Creating Pinecone index: {PINECONE_INDEX} with dim {self.dim}")
            self.pc.create_index(
                name=PINECONE_INDEX,
                dimension=self.dim,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",  # or "gcp" if using Google Cloud
                    region="us-east-1"  # update to your region
                )
            )
        self.index = self.pc.Index(PINECONE_INDEX)
        print(f"Using Pinecone index: {PINECONE_INDEX}")
        self._build_or_load()

    def _build_or_load(self):
        if os.path.exists(self._meta_file):
            with open(self._meta_file, "r", encoding="utf-8") as f:
                self._metadatas = json.load(f)
        else:
            self._metadatas = []

    def _save(self):
        with open(self._meta_file, "w", encoding="utf-8") as f:
            json.dump(self._metadatas, f, ensure_ascii=False, indent=2)

    def clear_index(self):
    # Delete all vectors in the default namespace
        self.index.delete(deleteAll=True, namespace="default")
        self._metadatas = []
        self._save()

    def add_documents(self, docs: List[Dict]):
        """
        docs: list of dicts with keys: text, metadata (including t_start,t_end,video_id)
        """
        texts = [d["text"] for d in docs]
        embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        # Upsert to Pinecone
        pinecone_vectors = []
        for i, (d, emb) in enumerate(zip(docs, embeddings)):
            # Use a unique id for each vector (e.g., str(len(_metadatas)+i))
            vector_id = str(len(self._metadatas) + i)
            pinecone_vectors.append((vector_id, emb.tolist(), d["metadata"]))
            self._metadatas.append(d["metadata"])
        print(f"Upserting {len(pinecone_vectors)} vectors to index {PINECONE_INDEX} in namespace 'default'")
        self.index.upsert(vectors=[(vid, vec, meta) for vid, vec, meta in pinecone_vectors], namespace="default")
        self._save()

    def search(self, query: str, top_k: int = 10):
        q_emb = self.model.encode([query], convert_to_numpy=True)[0]
        # Query Pinecone
        res = self.index.query(vector=q_emb.tolist(), top_k=top_k, include_metadata=True, namespace="default")
        results = []
        for match in res.matches:
            results.append({
                "score": match.score,
                "metadata": match.metadata
            })
        return results
    

