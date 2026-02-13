"""
local_embeddings.py - Local Embedding Models with Fallback Strategy

Reference implementation for the local-embeddings skill.
Supports fast (MiniLM), accurate (Nomic), and hybrid tiers with OpenAI fallback.
"""

import time
import numpy as np
from typing import Union, List, Tuple, Optional, Dict, Any
import warnings

# Optional imports (graceful degradation)
try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False
    warnings.warn("sentence-transformers not installed. Install with: pip install sentence-transformers")

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


# ============================================================================
# Exceptions
# ============================================================================

class LocalEmbeddingError(Exception):
    """Base exception for local embedding errors."""
    pass


class ModelNotFoundError(LocalEmbeddingError):
    """Model not found or failed to download."""
    pass


class ContextLengthError(LocalEmbeddingError):
    """Text exceeds context length for selected tier."""
    pass


# ============================================================================
# Model Registry
# ============================================================================

MODEL_REGISTRY = {
    "fast": {
        "name": "all-MiniLM-L6-v2",
        "repo": "sentence-transformers/all-MiniLM-L6-v2",
        "dimensions": 384,
        "context_length": 512,
        "size_mb": 34,
        "latency_ms": 15,  # Expected on CPU
        "description": "Ultra-fast, lightweight, real-time"
    },
    "accurate": {
        "name": "nomic-embed-text-v1",
        "repo": "nomic-ai/nomic-embed-text-v1",
        "dimensions": 768,
        "context_length": 8192,
        "size_mb": 274,
        "latency_ms": 100,  # Expected on CPU
        "description": "High accuracy, long context (8192 tokens)"
    },
    "mpnet": {
        "name": "all-mpnet-base-v2",
        "repo": "sentence-transformers/all-mpnet-base-v2",
        "dimensions": 768,
        "context_length": 512,
        "size_mb": 438,
        "latency_ms": 120,  # Expected on CPU
        "description": "Balanced accuracy/speed"
    }
}


# ============================================================================
# LocalEmbedder: Main Class
# ============================================================================

class LocalEmbedder:
    """
    Local embedding generator with automatic tier selection and OpenAI fallback.
    
    Usage:
        embedder = LocalEmbedder(tier="hybrid")
        embeddings = embedder.embed("Hello world")
    """
    
    def __init__(
        self,
        tier: str = "hybrid",
        cache_dir: Optional[str] = None,
        device: str = "cpu",
        fallback_to_openai: bool = False,
        openai_api_key: Optional[str] = None,
        latency_target_ms: float = 50,
        batch_size: int = 32,
        enable_caching: bool = True,
    ):
        """
        Initialize LocalEmbedder.
        
        Args:
            tier: "fast" (MiniLM), "accurate" (Nomic), "hybrid" (auto), "openai"
            cache_dir: Directory to cache models (default: ~/.cache/huggingface)
            device: "cpu", "cuda", "mps"
            fallback_to_openai: Enable fallback to OpenAI on error
            openai_api_key: OpenAI API key (uses env if not provided)
            latency_target_ms: Target latency for auto-tier selection
            batch_size: Batch size for inference
            enable_caching: Cache embeddings for identical inputs
        """
        if not HAS_SENTENCE_TRANSFORMERS and tier != "openai":
            raise LocalEmbeddingError(
                "sentence-transformers not installed. Install with:\n"
                "  pip install sentence-transformers torch"
            )
        
        self.tier = tier
        self.device = device
        self.batch_size = batch_size
        self.enable_caching = enable_caching
        self.fallback_to_openai = fallback_to_openai
        self.latency_target_ms = latency_target_ms
        
        # Model cache
        self._models: Dict[str, Any] = {}
        self._embedding_cache: Dict[str, np.ndarray] = {} if enable_caching else None
        
        # OpenAI setup
        if openai_api_key:
            openai.api_key = openai_api_key
    
    def _load_model(self, tier: str) -> SentenceTransformer:
        """Load model from cache or download."""
        if tier not in self._models:
            if tier not in MODEL_REGISTRY:
                raise LocalEmbeddingError(f"Unknown tier: {tier}")
            
            try:
                model_info = MODEL_REGISTRY[tier]
                self._models[tier] = SentenceTransformer(
                    model_info["repo"],
                    device=self.device,
                )
            except Exception as e:
                raise ModelNotFoundError(f"Failed to load {tier}: {e}")
        
        return self._models[tier]
    
    def embed(
        self,
        texts: Union[str, List[str]],
        context_length: Optional[int] = None,
        return_latency: bool = False,
        use_tier: Optional[str] = None,
    ) -> Union[np.ndarray, Tuple[np.ndarray, float]]:
        """
        Generate embeddings for text(s).
        
        Args:
            texts: Text or list of texts
            context_length: Hint about token count (auto-detects if None)
            return_latency: Return (embeddings, latency_ms)
            use_tier: Override configured tier for this call
        
        Returns:
            Embeddings of shape (n_texts, embedding_dim) or (embedding_dim,)
            If return_latency=True: (embeddings, latency_ms)
        """
        # Normalize input
        if isinstance(texts, str):
            texts = [texts]
            squeeze = True
        else:
            squeeze = False
        
        # Determine tier
        tier = use_tier or self.tier
        if tier == "hybrid":
            tier = self._select_tier(texts, context_length)
        
        # Check cache
        cache_keys = [f"{tier}:{t[:50]}" for t in texts] if self.enable_caching else None
        cached = []
        uncached_indices = []
        
        if self.enable_caching:
            for i, key in enumerate(cache_keys):
                if key in self._embedding_cache:
                    cached.append(self._embedding_cache[key])
                else:
                    uncached_indices.append(i)
        else:
            uncached_indices = list(range(len(texts)))
        
        # Embed
        start_time = time.time()
        
        if tier == "openai":
            embeddings = self._embed_openai(texts)
        else:
            try:
                model = self._load_model(tier)
                uncached_texts = [texts[i] for i in uncached_indices]
                uncached_embeds = model.encode(uncached_texts, batch_size=self.batch_size)
                
                # Restore order and merge cache
                if self.enable_caching:
                    embeddings = [None] * len(texts)
                    for cached_idx, cached_embed in enumerate(cached):
                        embeddings[cached_idx] = cached_embed
                    for uncached_idx_pos, uncached_idx in enumerate(uncached_indices):
                        embeddings[uncached_idx] = uncached_embeds[uncached_idx_pos]
                        # Cache it
                        self._embedding_cache[cache_keys[uncached_idx]] = uncached_embeds[uncached_idx_pos]
                    embeddings = np.array(embeddings)
                else:
                    embeddings = uncached_embeds
            except Exception as e:
                if self.fallback_to_openai:
                    print(f"Local embedding failed: {e}. Falling back to OpenAI.")
                    embeddings = self._embed_openai(texts)
                else:
                    raise LocalEmbeddingError(f"Embedding failed with tier {tier}: {e}")
        
        latency_ms = (time.time() - start_time) * 1000
        
        # Squeeze if single input
        if squeeze:
            embeddings = embeddings[0]
        
        if return_latency:
            return embeddings, latency_ms
        return embeddings
    
    def _select_tier(self, texts: List[str], context_length: Optional[int]) -> str:
        """Auto-select tier based on text characteristics."""
        # Estimate token count (rough approximation: 1 token ≈ 4 chars)
        if context_length is None:
            total_chars = sum(len(t) for t in texts)
            context_length = total_chars // 4
        
        # Decision tree
        if context_length > 4000:
            return "accurate"  # Nomic for long context
        elif context_length < 100 and len(texts) == 1:
            return "fast"  # MiniLM for short, single texts
        else:
            return "fast"  # Default to fast for most use cases
    
    def _embed_openai(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings using OpenAI API."""
        if not HAS_OPENAI:
            raise LocalEmbeddingError("OpenAI not installed. Install with: pip install openai")
        
        try:
            response = openai.Embedding.create(
                input=texts,
                model="text-embedding-3-small"
            )
            return np.array([item["embedding"] for item in response["data"]])
        except Exception as e:
            raise LocalEmbeddingError(f"OpenAI embedding failed: {e}")
    
    def similarity(
        self,
        text1: str,
        text2: str,
        metric: str = "cosine"
    ) -> float:
        """
        Compute similarity between two texts.
        
        Args:
            text1, text2: Texts to compare
            metric: "cosine", "euclidean", "dot"
        
        Returns:
            Similarity score
        """
        embed1, embed2 = self.embed([text1, text2])
        
        if metric == "cosine":
            return np.dot(embed1, embed2) / (np.linalg.norm(embed1) * np.linalg.norm(embed2))
        elif metric == "euclidean":
            return -np.linalg.norm(embed1 - embed2)
        elif metric == "dot":
            return np.dot(embed1, embed2)
        else:
            raise ValueError(f"Unknown metric: {metric}")
    
    def encode_batch(
        self,
        texts: List[str],
        batch_size: Optional[int] = None,
        show_progress: bool = False,
    ) -> np.ndarray:
        """
        Efficiently encode large batches.
        
        Args:
            texts: All texts to encode
            batch_size: Override default batch size
            show_progress: Show progress bar (requires tqdm)
        
        Returns:
            All embeddings
        """
        batch_size = batch_size or self.batch_size
        
        iterator = texts
        if show_progress:
            try:
                from tqdm import tqdm
                iterator = tqdm(texts, desc="Encoding")
            except ImportError:
                pass
        
        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            batch_embeds = self.embed(batch)
            embeddings.extend(batch_embeds)
        
        return np.array(embeddings)
    
    def switch_tier(self, tier: str, force: bool = False) -> None:
        """Switch embedding tier at runtime."""
        if tier not in MODEL_REGISTRY and tier != "openai":
            raise LocalEmbeddingError(f"Unknown tier: {tier}")
        self.tier = tier
    
    def benchmark(
        self,
        text_samples: List[str],
        iterations: int = 3,
    ) -> Dict[str, Dict[str, float]]:
        """
        Benchmark latency across tiers.
        
        Args:
            text_samples: Representative texts to benchmark
            iterations: Number of runs
        
        Returns:
            Dict of tier -> {mean_ms, p95_ms, max_ms}
        """
        results = {}
        
        for tier in ["fast", "accurate"]:
            latencies = []
            for _ in range(iterations):
                _, latency_ms = self.embed(text_samples, use_tier=tier, return_latency=True)
                latencies.append(latency_ms)
            
            latencies = np.array(latencies)
            results[tier] = {
                "mean_ms": float(np.mean(latencies)),
                "p95_ms": float(np.percentile(latencies, 95)),
                "max_ms": float(np.max(latencies)),
                "min_ms": float(np.min(latencies)),
            }
        
        return results
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current configuration and model info."""
        return {
            "current_tier": self.tier,
            "device": self.device,
            "batch_size": self.batch_size,
            "caching_enabled": self.enable_caching,
            "models": {tier: {
                "name": MODEL_REGISTRY[tier]["name"],
                "dimensions": MODEL_REGISTRY[tier]["dimensions"],
                "context_length": MODEL_REGISTRY[tier]["context_length"],
                "size_mb": MODEL_REGISTRY[tier]["size_mb"],
                "expected_latency_ms": MODEL_REGISTRY[tier]["latency_ms"],
            } for tier in ["fast", "accurate", "mpnet"]},
            "cache_size": len(self._embedding_cache) if self.enable_caching else 0,
        }
    
    def clear_cache(self) -> None:
        """Clear embedding cache."""
        if self.enable_caching:
            self._embedding_cache.clear()
    
    def unload_models(self) -> None:
        """Unload all models from memory."""
        self._models.clear()


# ============================================================================
# Convenience Functions
# ============================================================================

def embed(text: Union[str, List[str]], tier: str = "fast") -> np.ndarray:
    """Quick embed with singleton embedder."""
    _embedder = LocalEmbedder(tier=tier)
    return _embedder.embed(text)


def similarity(text1: str, text2: str, tier: str = "fast") -> float:
    """Quick similarity check."""
    _embedder = LocalEmbedder(tier=tier)
    return _embedder.similarity(text1, text2)


# ============================================================================
# If run as script: Simple test
# ============================================================================

if __name__ == "__main__":
    print("Testing LocalEmbedder...")
    
    try:
        embedder = LocalEmbedder(tier="fast")
        
        # Test basic embedding
        texts = [
            "The weather is lovely today",
            "It's sunny outside"
        ]
        
        print(f"\nTesting with {len(texts)} texts...")
        embeddings, latency = embedder.embed(texts, return_latency=True)
        print(f"✓ Generated embeddings: {embeddings.shape}")
        print(f"✓ Latency: {latency:.1f}ms")
        
        # Test similarity
        sim = embedder.similarity(texts[0], texts[1])
        print(f"✓ Similarity: {sim:.3f}")
        
        # Test stats
        stats = embedder.get_stats()
        print(f"✓ Current tier: {stats['current_tier']}")
        print(f"✓ Available models: {list(stats['models'].keys())}")
        
        print("\n✓ All tests passed!")
        
    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
