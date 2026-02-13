"""
local_embeddings.py - High-Performance Local Embedding Service

Provides free, private embeddings using Hugging Face sentence-transformers.
Eliminates dependency on OpenAI embeddings while maintaining quality.

Author: OpenClaw Agent
Date: 2026-02-13
"""

from sentence_transformers import SentenceTransformer
from typing import List, Union, Optional
import numpy as np
import time
import hashlib
import json
from pathlib import Path
from dataclasses import dataclass, asdict
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)


@dataclass
class EmbeddingResult:
    """Result of an embedding operation."""
    embedding: np.ndarray
    text: str
    latency_ms: float
    cached: bool
    timestamp: float


@dataclass
class BatchEmbeddingResult:
    """Result of a batch embedding operation."""
    embeddings: np.ndarray
    texts: List[str]
    total_latency_ms: float
    per_text_latency_ms: float
    cache_hits: int
    cache_misses: int
    timestamp: float


class LocalEmbeddingService:
    """
    High-performance local embedding service with caching.
    
    Features:
    - Lazy model loading (fast initialization)
    - Automatic caching for repeated texts
    - Efficient batch processing
    - Cosine similarity computation
    - OpenAI-compatible output
    
    Example:
        service = LocalEmbeddingService()
        embedding = service.embed("Hello world")
        print(f"Shape: {embedding.shape}")  # (384,)
    """
    
    def __init__(
        self, 
        model_name: str = "all-MiniLM-L6-v2",
        cache_dir: str = "./cache/embeddings",
        device: Optional[str] = None
    ):
        """
        Initialize the embedding service.
        
        Args:
            model_name: Hugging Face model identifier
                - all-MiniLM-L6-v2: Fast, 384-dim (default)
                - all-mpnet-base-v2: High quality, 768-dim
                - multi-qa-MiniLM-L6-cos-v1: Q&A optimized
            cache_dir: Directory for embedding cache
            device: 'cpu', 'cuda', or None (auto-detect)
        """
        self.model_name = model_name
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.device = device
        
        # Lazy load model on first use
        self._model = None
        self._model_loaded = False
        self._model_load_time = None
        
        # Statistics
        self.stats = {
            "embeddings_generated": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "total_latency_ms": 0
        }
        
        print(f"[OK] LocalEmbeddingService initialized")
        print(f"  Model: {model_name}")
        print(f"  Cache: {self.cache_dir}")
        print(f"  Device: {device or 'auto-detect'}")
    
    @property
    def model(self) -> SentenceTransformer:
        """Lazy-load model on first access."""
        if not self._model_loaded:
            print(f"\n[LOADING] Model '{self.model_name}'...")
            start = time.time()
            
            self._model = SentenceTransformer(
                self.model_name, 
                device=self.device
            )
            
            self._model_load_time = time.time() - start
            self._model_loaded = True
            
            print(f"[OK] Model loaded in {self._model_load_time:.2f}s")
            print(f"  Dimensions: {self.get_embedding_dim()}")
            print(f"  Device: {self._model.device}")
            
        return self._model
    
    def embed(
        self, 
        text: str, 
        normalize: bool = True,
        use_cache: bool = True,
        return_result: bool = False
    ) -> Union[np.ndarray, EmbeddingResult]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Input text to embed
            normalize: Whether to L2-normalize (required for cosine similarity)
            use_cache: Whether to use cached embeddings
            return_result: Whether to return detailed result object
        
        Returns:
            Embedding vector as numpy array (or EmbeddingResult if return_result=True)
        """
        start_time = time.time()
        cached = False
        
        # Try cache first
        if use_cache:
            cached_emb = self._get_cached(text)
            if cached_emb is not None:
                self.stats["cache_hits"] += 1
                cached = True
                embedding = cached_emb
        
        # Generate embedding if not cached
        if not cached:
            self.stats["cache_misses"] += 1
            embedding = self.model.encode(
                text, 
                normalize_embeddings=normalize,
                show_progress_bar=False,
                convert_to_numpy=True
            )
            
            # Cache result
            if use_cache:
                self._set_cached(text, embedding)
        
        # Update statistics
        latency_ms = (time.time() - start_time) * 1000
        self.stats["embeddings_generated"] += 1
        self.stats["total_latency_ms"] += latency_ms
        
        if return_result:
            return EmbeddingResult(
                embedding=embedding,
                text=text,
                latency_ms=latency_ms,
                cached=cached,
                timestamp=time.time()
            )
        
        return embedding
    
    def embed_batch(
        self, 
        texts: List[str], 
        normalize: bool = True,
        batch_size: int = 32,
        show_progress: bool = False,
        return_result: bool = False
    ) -> Union[np.ndarray, BatchEmbeddingResult]:
        """
        Generate embeddings for multiple texts efficiently.
        
        Args:
            texts: List of input texts
            normalize: Whether to L2-normalize embeddings
            batch_size: Number of texts to process in parallel
            show_progress: Whether to show progress bar
            return_result: Whether to return detailed result object
        
        Returns:
            Matrix of embeddings (n_texts x embedding_dim)
        """
        start_time = time.time()
        cache_hits = 0
        cache_misses = 0
        
        # Check cache for all texts
        embeddings_list = []
        uncached_indices = []
        
        for idx, text in enumerate(texts):
            cached_emb = self._get_cached(text)
            if cached_emb is not None:
                embeddings_list.append(cached_emb)
                cache_hits += 1
            else:
                embeddings_list.append(None)
                uncached_indices.append(idx)
                cache_misses += 1
        
        # Generate embeddings for uncached texts
        if uncached_indices:
            uncached_texts = [texts[i] for i in uncached_indices]
            
            uncached_embs = self.model.encode(
                uncached_texts,
                normalize_embeddings=normalize,
                batch_size=batch_size,
                show_progress_bar=show_progress,
                convert_to_numpy=True
            )
            
            # Insert back into list and cache
            for idx, emb in zip(uncached_indices, uncached_embs):
                embeddings_list[idx] = emb
                self._set_cached(texts[idx], emb)
        
        # Convert to numpy array
        embeddings = np.array(embeddings_list)
        
        # Update statistics
        total_latency_ms = (time.time() - start_time) * 1000
        per_text_latency_ms = total_latency_ms / len(texts) if texts else 0
        
        self.stats["embeddings_generated"] += len(texts)
        self.stats["cache_hits"] += cache_hits
        self.stats["cache_misses"] += cache_misses
        self.stats["total_latency_ms"] += total_latency_ms
        
        if not show_progress:
            print(f"[OK] Embedded {len(texts)} texts in {total_latency_ms:.1f}ms "
                  f"({per_text_latency_ms:.1f}ms/text, {cache_hits} cached)")
        
        if return_result:
            return BatchEmbeddingResult(
                embeddings=embeddings,
                texts=texts,
                total_latency_ms=total_latency_ms,
                per_text_latency_ms=per_text_latency_ms,
                cache_hits=cache_hits,
                cache_misses=cache_misses,
                timestamp=time.time()
            )
        
        return embeddings
    
    def similarity(
        self, 
        text1: str, 
        text2: str,
        use_cache: bool = True
    ) -> float:
        """
        Compute cosine similarity between two texts.
        
        Args:
            text1: First text
            text2: Second text
            use_cache: Whether to use cached embeddings
        
        Returns:
            Cosine similarity score (0-1, higher = more similar)
        """
        emb1 = self.embed(text1, normalize=True, use_cache=use_cache)
        emb2 = self.embed(text2, normalize=True, use_cache=use_cache)
        
        # Cosine similarity (normalized vectors = dot product)
        similarity = np.dot(emb1, emb2)
        return float(similarity)
    
    def find_similar(
        self,
        query: str,
        candidates: List[str],
        top_k: int = 5,
        threshold: float = 0.0
    ) -> List[dict]:
        """
        Find most similar texts from a list of candidates.
        
        Args:
            query: Query text
            candidates: List of candidate texts
            top_k: Number of top results to return
            threshold: Minimum similarity threshold (0-1)
        
        Returns:
            List of dicts with 'text', 'score', 'rank'
        """
        # Embed query and candidates
        query_emb = self.embed(query, normalize=True)
        candidate_embs = self.embed_batch(candidates, normalize=True)
        
        # Compute similarities
        similarities = candidate_embs @ query_emb
        
        # Filter by threshold
        valid_indices = np.where(similarities >= threshold)[0]
        
        # Sort and get top-k
        sorted_indices = valid_indices[np.argsort(similarities[valid_indices])[::-1]]
        top_indices = sorted_indices[:top_k]
        
        results = [
            {
                "text": candidates[idx],
                "score": float(similarities[idx]),
                "rank": rank + 1,
                "index": int(idx)
            }
            for rank, idx in enumerate(top_indices)
        ]
        
        return results
    
    def _get_cached(self, text: str) -> Optional[np.ndarray]:
        """Retrieve cached embedding if exists."""
        cache_key = self._hash_text(text)
        cache_file = self.cache_dir / f"{cache_key}.npy"
        
        if cache_file.exists():
            try:
                return np.load(cache_file)
            except Exception as e:
                print(f"Warning: Failed to load cache {cache_key}: {e}")
                return None
        return None
    
    def _set_cached(self, text: str, embedding: np.ndarray):
        """Store embedding in cache."""
        cache_key = self._hash_text(text)
        cache_file = self.cache_dir / f"{cache_key}.npy"
        
        try:
            np.save(cache_file, embedding)
        except Exception as e:
            print(f"Warning: Failed to cache embedding {cache_key}: {e}")
    
    def _hash_text(self, text: str) -> str:
        """Generate hash key for text."""
        # Use model name in hash to avoid conflicts between models
        content = f"{self.model_name}:{text}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def get_embedding_dim(self) -> int:
        """Return the dimensionality of embeddings."""
        return self.model.get_sentence_embedding_dimension()
    
    def clear_cache(self):
        """Clear all cached embeddings."""
        count = 0
        for cache_file in self.cache_dir.glob("*.npy"):
            cache_file.unlink()
            count += 1
        print(f"[OK] Cache cleared: {count} files removed from {self.cache_dir}")
    
    def get_stats(self) -> dict:
        """Get service statistics."""
        avg_latency = (
            self.stats["total_latency_ms"] / self.stats["embeddings_generated"]
            if self.stats["embeddings_generated"] > 0
            else 0
        )
        
        cache_hit_rate = (
            self.stats["cache_hits"] / 
            (self.stats["cache_hits"] + self.stats["cache_misses"])
            if (self.stats["cache_hits"] + self.stats["cache_misses"]) > 0
            else 0
        )
        
        return {
            **self.stats,
            "avg_latency_ms": avg_latency,
            "cache_hit_rate": cache_hit_rate,
            "model_loaded": self._model_loaded,
            "model_load_time_s": self._model_load_time
        }
    
    def print_stats(self):
        """Print formatted statistics."""
        stats = self.get_stats()
        print("\n[STATS] Embedding Service Statistics")
        print(f"  Embeddings generated: {stats['embeddings_generated']}")
        print(f"  Average latency: {stats['avg_latency_ms']:.1f}ms")
        print(f"  Cache hit rate: {stats['cache_hit_rate']:.1%}")
        print(f"  Cache hits: {stats['cache_hits']}")
        print(f"  Cache misses: {stats['cache_misses']}")
        if stats['model_loaded']:
            print(f"  Model load time: {stats['model_load_time_s']:.2f}s")


class OpenAICompatibleEmbeddings:
    """
    Drop-in replacement for OpenAI's embeddings API.
    Allows easy migration from OpenAI to local embeddings.
    
    Example:
        embeddings = OpenAICompatibleEmbeddings()
        response = embeddings.create(input="Hello world")
        vector = response["data"][0]["embedding"]
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.service = LocalEmbeddingService(model_name=model_name)
        self.model = model_name
    
    def create(
        self, 
        input: Union[str, List[str]], 
        model: Optional[str] = None,
        encoding_format: str = "float"
    ) -> dict:
        """
        OpenAI-compatible embedding creation.
        
        Args:
            input: Text or list of texts to embed
            model: Model name (ignored, uses local model)
            encoding_format: "float" or "base64"
        
        Returns:
            OpenAI-compatible response dict
        """
        # Handle single text or list
        texts = [input] if isinstance(input, str) else input
        
        # Generate embeddings
        embeddings = self.service.embed_batch(texts)
        
        # Format response like OpenAI
        data = [
            {
                "object": "embedding",
                "index": idx,
                "embedding": emb.tolist()
            }
            for idx, emb in enumerate(embeddings)
        ]
        
        return {
            "object": "list",
            "data": data,
            "model": self.model,
            "usage": {
                "prompt_tokens": sum(len(t.split()) for t in texts),
                "total_tokens": sum(len(t.split()) for t in texts)
            }
        }


# Convenience function for quick usage
def embed(text: str, model: str = "all-MiniLM-L6-v2") -> np.ndarray:
    """
    Quick embedding generation (creates service on first call).
    
    Args:
        text: Text to embed
        model: Model name
    
    Returns:
        Embedding vector
    """
    global _default_service
    
    if '_default_service' not in globals():
        _default_service = LocalEmbeddingService(model_name=model)
    
    return _default_service.embed(text)


if __name__ == "__main__":
    # Demo usage
    print("=" * 60)
    print("Local Embedding Service Demo")
    print("=" * 60)
    
    # Initialize service
    service = LocalEmbeddingService()
    
    # Single embedding
    print("\n1. Single Embedding")
    text = "OpenClaw is an AI agent framework"
    embedding = service.embed(text)
    print(f"   Text: '{text}'")
    print(f"   Embedding shape: {embedding.shape}")
    print(f"   First 5 values: {embedding[:5]}")
    
    # Batch embeddings
    print("\n2. Batch Embeddings")
    texts = [
        "Machine learning model training",
        "Neural network architecture design",
        "Data preprocessing pipeline",
        "Model evaluation metrics"
    ]
    embeddings = service.embed_batch(texts)
    print(f"   Texts: {len(texts)}")
    print(f"   Embeddings shape: {embeddings.shape}")
    
    # Similarity
    print("\n3. Semantic Similarity")
    pairs = [
        ("cat", "feline"),
        ("car", "automobile"),
        ("happy", "sad"),
        ("python", "programming")
    ]
    for text1, text2 in pairs:
        sim = service.similarity(text1, text2)
        print(f"   '{text1}' ↔ '{text2}': {sim:.3f}")
    
    # Find similar
    print("\n4. Find Similar Documents")
    query = "How to train a neural network?"
    documents = [
        "Neural network training requires labeled data and backpropagation",
        "Cookie recipes for chocolate chip cookies",
        "Training deep learning models on GPU clusters",
        "Baking tips for beginners"
    ]
    results = service.find_similar(query, documents, top_k=3)
    print(f"   Query: '{query}'")
    for result in results:
        print(f"   {result['rank']}. [{result['score']:.3f}] {result['text']}")
    
    # Statistics
    service.print_stats()
    
    print("\n" + "=" * 60)
    print("✓ Demo complete!")
    print("=" * 60)
