# SKILL: local-embeddings

Generate embeddings locally using Hugging Face sentence-transformers. Supports fast (MiniLM) and accurate (Nomic) tiers with automatic fallback to OpenAI.

---

## Quick Start

### Installation

```bash
pip install sentence-transformers torch numpy
```

### Basic Usage

```python
from local_embeddings import LocalEmbedder

# Initialize (auto-downloads models on first run)
embedder = LocalEmbedder(tier="fast")  # or "accurate" or "hybrid"

# Get embeddings
texts = [
    "The weather is lovely today",
    "It's sunny outside"
]

embeddings = embedder.embed(texts)
# Returns: np.ndarray of shape (2, 384) for fast, (2, 768) for accurate

# With latency tracking
embeddings, latency_ms = embedder.embed(texts, return_latency=True)
print(f"Embedding took {latency_ms:.1f}ms")
```

---

## Architecture

### Tier System

| Tier | Model | Latency | Accuracy | Context | Use Case |
|------|-------|---------|----------|---------|----------|
| fast | all-MiniLM-L6-v2 | <30ms | 80% | 512 tokens | Real-time queries |
| accurate | nomic-embed-text-v1 | 100-150ms | 95%+ | 8192 tokens | Batch ingestion |
| hybrid | Auto-select | 30-150ms | 85%+ | 512-8192 | Production (default) |
| openai | text-embedding-3-small | 50-200ms | 99% | 8191 tokens | Fallback only |

### Automatic Tier Selection (Hybrid Mode)

```python
embedder = LocalEmbedder(tier="hybrid")
embeddings = embedder.embed(texts)

# Automatically chooses:
# - MiniLM if <50ms required
# - Nomic if long context needed
# - OpenAI if accuracy critical and API available
```

---

## Configuration

### Initialize with Custom Settings

```python
from local_embeddings import LocalEmbedder

embedder = LocalEmbedder(
    tier="hybrid",                    # "fast", "accurate", "hybrid", "openai"
    cache_dir="./models",             # Where to store downloaded models
    device="cpu",                     # "cpu", "cuda", "mps"
    fallback_to_openai=True,         # Enable OpenAI fallback
    openai_api_key="sk-...",         # Explicit API key
    latency_target_ms=50,            # Target latency for auto-selection
    batch_size=32,                    # Inference batch size
    enable_caching=True,              # Cache embeddings for duplicate inputs
)
```

---

## API Reference

### `embed(texts, context_length=None, return_latency=False, use_tier=None)`

Generate embeddings for one or more texts.

**Parameters:**
- `texts` (str | list[str]): Text(s) to embed
- `context_length` (int, optional): Hint about expected token count (auto-detects)
- `return_latency` (bool): Return (embeddings, latency_ms)
- `use_tier` (str, optional): Override configured tier for this call

**Returns:**
- `np.ndarray`: Embeddings of shape (n_texts, embedding_dim)
- `tuple` (if return_latency=True): (embeddings, latency_ms)

**Example:**
```python
# Single text
embed = embedder.embed("Hello world")  # shape: (384,)

# Multiple texts
embeds = embedder.embed(["Hello", "World"])  # shape: (2, 384)

# Long context
long_text = "..." * 100  # 5000+ tokens
embeds = embedder.embed(long_text, context_length=8192)
# Auto-switches to Nomic for long context
```

---

### `similarity(text1, text2, metric="cosine")`

Compute similarity between two texts (convenience function).

**Parameters:**
- `text1, text2` (str): Texts to compare
- `metric` (str): "cosine", "euclidean", "dot"

**Returns:**
- `float`: Similarity score (cosine: -1 to 1)

**Example:**
```python
score = embedder.similarity(
    "The cat sat on the mat",
    "A feline rests on carpet"
)
print(f"Similarity: {score:.3f}")  # ~0.85
```

---

### `encode_batch(texts, batch_size=32, show_progress=False)`

Efficient batch encoding (for large datasets).

**Parameters:**
- `texts` (list[str]): All texts to encode
- `batch_size` (int): Batch size for processing
- `show_progress` (bool): Show progress bar

**Returns:**
- `np.ndarray`: All embeddings

**Example:**
```python
# Encode 10k memories efficiently
embeddings = embedder.encode_batch(
    memories,
    batch_size=64,
    show_progress=True
)
```

---

### `switch_tier(tier, force=False)`

Change embedding tier at runtime.

**Parameters:**
- `tier` (str): Target tier
- `force` (bool): Force switch even if model not downloaded

**Example:**
```python
embedder.switch_tier("accurate")  # Switch to Nomic
embeddings = embedder.embed(text)
embedder.switch_tier("fast")      # Back to MiniLM
```

---

### `benchmark(text_samples, iterations=3)`

Measure actual latency on target hardware.

**Parameters:**
- `text_samples` (list[str]): Representative texts to benchmark
- `iterations` (int): Warm-up runs + measurement runs

**Returns:**
- `dict`: Latency stats per tier

**Example:**
```python
stats = embedder.benchmark(
    [
        "Short text",
        "Medium length text with multiple sentences",
        "Very long text..." * 100
    ]
)
print(stats)
# {
#     "fast": {"mean_ms": 12, "p95_ms": 18, "max_ms": 25},
#     "accurate": {"mean_ms": 95, "p95_ms": 120, "max_ms": 145},
# }
```

---

### `get_stats()`

Get current configuration and model info.

**Returns:**
- `dict`: Model names, sizes, dimensions, current tier

**Example:**
```python
stats = embedder.get_stats()
# {
#     "current_tier": "fast",
#     "models": {
#         "fast": {"name": "all-MiniLM-L6-v2", "dim": 384, "size_mb": 34},
#         "accurate": {"name": "nomic-embed-text-v1", "dim": 768, "size_mb": 274},
#     },
#     "device": "cpu",
#     "cache_dir": "./models"
# }
```

---

## Integration with Episodic-Memory

### Pattern 1: Memory Ingestion (Batch)

```python
from local_embeddings import LocalEmbedder

embedder = LocalEmbedder(tier="accurate")

# When storing new memories
for memory in new_memories:
    embedding = embedder.embed(memory["text"])
    memory["embedding_local"] = embedding
    memory["embedding_dim"] = len(embedding)
    
    # Store in episodic DB
    db.store(memory)
```

### Pattern 2: Memory Retrieval (Real-time)

```python
embedder_fast = LocalEmbedder(tier="fast")

# When retrieving memories
query_embedding = embedder_fast.embed(query_text)

# Fast similarity search
results = db.search(query_embedding, top_k=5, latency_limit_ms=50)
```

### Pattern 3: Hybrid Fallback

```python
embedder = LocalEmbedder(tier="hybrid", fallback_to_openai=True)

# Automatically handles all edge cases
try:
    embedding = embedder.embed(text)
except LocalError:
    # Falls back to OpenAI if local models fail
    embedding = embedder.embed(text, use_tier="openai")
```

### Pattern 4: Long Conversation Context

```python
# Full episodic snapshot with conversation history
full_context = f"""
Memory Date: {timestamp}
Conversation:
{conversation_text}

Current State:
{state_summary}
"""

# Nomic handles 8192 tokens - no truncation needed
embedding = embedder.embed(full_context, context_length=8192)
# Auto-detects long context, uses Nomic tier
```

---

## Error Handling

```python
from local_embeddings import (
    LocalEmbedder,
    ModelNotFoundError,
    ContextLengthError,
    LocalEmbeddingError
)

embedder = LocalEmbedder()

try:
    embeddings = embedder.embed(texts)
except ModelNotFoundError:
    print("Model not downloaded - will auto-download on next call")
except ContextLengthError as e:
    print(f"Text too long for tier: {e}")
    # Switch to tier with longer context
    embeddings = embedder.embed(texts, use_tier="accurate")
except LocalEmbeddingError as e:
    print(f"Embedding failed: {e}")
    # Fallback to OpenAI
    embeddings = embedder.embed(texts, use_tier="openai")
```

---

## Performance Tuning

### For CPU Systems (NucBoxG3)

```python
embedder = LocalEmbedder(
    tier="fast",                  # MiniLM is CPU-optimized
    batch_size=16,                # Reduce batch size for CPU
    device="cpu",
)

# Warm up (recommended)
_ = embedder.embed("warm up")
```

### For GPU Systems (if available)

```python
embedder = LocalEmbedder(
    tier="accurate",              # Use larger model on GPU
    device="cuda",
    batch_size=128,               # Larger batches on GPU
)
```

### Memory Caching

```python
embedder = LocalEmbedder(enable_caching=True)

# Second call to same text is instant
embed1 = embedder.embed("Hello")  # 15ms
embed2 = embedder.embed("Hello")  # <1ms (cached)
```

---

## Benchmarking Results

### NucBoxG3 Expected Performance (Windows CPU)

| Model | Single | Batch-32 | Memory |
|-------|--------|----------|--------|
| MiniLM | 10-20ms | 5-8ms/item | 100MB |
| Nomic | 80-120ms | 40-60ms/item | 350MB |
| MPNet | 120-180ms | 60-90ms/item | 500MB |

### Tier Selection Heuristics

```
if text_length < 512 and latency_budget < 50ms:
    use "fast"          # MiniLM
elif text_length > 4000:
    use "accurate"      # Nomic (only choice for 8192 context)
elif accuracy_critical and openai_available:
    use "openai"        # Fallback
else:
    use "hybrid"        # Auto-select
```

---

## Troubleshooting

### Slow on First Run
**Issue:** Model download takes time  
**Solution:** Models are cached after first download

```bash
python -c "from local_embeddings import LocalEmbedder; LocalEmbedder()"
# Pre-warms all models to cache
```

### Out of Memory
**Issue:** Large batch size causes OOM  
**Solution:** Reduce batch size

```python
embedder = LocalEmbedder(batch_size=8)  # Default is 32
```

### Inconsistent Embeddings Between Tiers
**Note:** MiniLM (384-dim) ≠ Nomic (768-dim)  
**Solution:** Normalize or use within same tier

```python
# Wrong:
embed1 = embedder.embed(text, use_tier="fast")
embed2 = embedder.embed(text, use_tier="accurate")
# Different dimensions!

# Right:
embedder.switch_tier("fast")
embeds = [embedder.embed(text) for text in texts]
# Consistent tier throughout
```

---

## Advanced: Custom Fallback Logic

```python
from local_embeddings import LocalEmbedder

class SmartEmbedder(LocalEmbedder):
    def embed(self, text, **kwargs):
        # Custom logic: use context length to decide tier
        tokens = len(text.split())
        
        if tokens > 5000:
            use_tier = "accurate"
        elif tokens < 200:
            use_tier = "fast"
        else:
            use_tier = "hybrid"
        
        return super().embed(text, use_tier=use_tier, **kwargs)

# Use it
embedder = SmartEmbedder()
embedding = embedder.embed(text)  # Auto-selects based on length
```

---

## FAQ

**Q: Which tier should I use for episodic memory?**  
A: Use "hybrid" (default) for automatic tier selection based on context length and latency requirements.

**Q: Can I use MiniLM and Nomic together?**  
A: Yes! MiniLM for retrieval, Nomic for storage. Dimension mismatch requires normalization.

**Q: What's the disk footprint?**  
A: ~750MB total (all three models). Individual: MiniLM 34MB, Nomic 274MB, MPNet 438MB.

**Q: Does it work offline?**  
A: Yes, after models are downloaded once. No internet needed for inference.

**Q: How do I integrate with episodic-memory?**  
A: See "Integration with Episodic-Memory" section above.

**Q: When should I fallback to OpenAI?**  
A: When accuracy is critical (litigation, high-stakes decisions) or network latency acceptable.

---

## Version History

- **1.0.0** (2026-02-13): Initial release with MiniLM, Nomic, and OpenAI fallback
