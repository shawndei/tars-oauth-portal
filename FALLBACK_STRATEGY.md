# Fallback Strategy: Local Fast + OpenAI Accurate

**Document Version:** 1.0  
**Date:** 2026-02-13  
**System:** episodic-memory with local-embeddings

---

## Strategy Overview

The fallback strategy implements a **3-tier decision tree** for embedding generation:

```
Query Arrives
    │
    ├─→ Tier 1: Local Fast (MiniLM) ─────────────────┐
    │   Latency: <30ms                               │
    │   Accuracy: 80% (vs OpenAI)                    │
    │   Use: Real-time retrieval, most queries      │
    │   Cost: Free (local)                          │
    │                                                 │
    ├─→ Falls back on:                               │
    │   • Timeout (>50ms) → Next tier                │
    │   • Low confidence (<0.65 similarity)          │
    │   • Long context (>4000 tokens)                │
    │                                                 │
    ├─→ Tier 2: Local Accurate (Nomic) ──────────────┤
    │   Latency: 100-150ms                           │
    │   Accuracy: 95%+ (vs OpenAI)                   │
    │   Use: Batch processing, long-form memory     │
    │   Cost: Free (local)                          │
    │   Context: 8192 tokens (full conversations)   │
    │                                                 │
    ├─→ Falls back on:                               │
    │   • Error (GPU memory, tokenizer issue)       │
    │   • Network available & critical accuracy     │
    │                                                 │
    ├─→ Tier 3: OpenAI Fallback ────────────────────┤
    │   Latency: 50-200ms (includes network)        │
    │   Accuracy: 99% (SOTA)                        │
    │   Use: Critical decisions, litigation-grade   │
    │   Cost: $0.02/1M tokens                       │
    │   Requires: Network + API key                 │
    │                                                 │
    └─→ Final Result ────────────────────────────────┘
        (Embeddings with quality tier metadata)
```

---

## Decision Logic

### Rule 1: Context Length (tokens)

```python
if estimated_tokens < 512:
    use_tier = "fast"              # MiniLM sufficient
elif estimated_tokens < 4000:
    use_tier = "fast_or_accurate"  # Either works, prefer fast
elif estimated_tokens <= 8192:
    use_tier = "accurate"          # Nomic only option
else:
    use_tier = "chunked"           # Split into 8192 chunks
    # Use Nomic per chunk
```

**Implementation:**
```python
def estimate_tokens(text: str) -> int:
    """Rough estimate: 1 token ≈ 4 characters."""
    return len(text) // 4

def select_tier_by_length(text: str) -> str:
    tokens = estimate_tokens(text)
    if tokens > 4000:
        return "accurate"
    return "fast"
```

### Rule 2: Latency Constraints

```python
if latency_budget_ms < 50:
    use_tier = "fast"              # MiniLM only
elif latency_budget_ms < 150:
    use_tier = "fast"              # Prefer fast, allow Accurate if needed
else:
    use_tier = "hybrid"            # Auto-select, time permitting
```

**Implementation:**
```python
def select_tier_by_latency(budget_ms: float) -> str:
    if budget_ms < 50:
        return "fast"
    elif budget_ms < 150:
        return "fast"  # Or fallback to Nomic on error
    else:
        return "hybrid"
```

### Rule 3: Accuracy Requirements

```python
if accuracy_critical:
    if network_available:
        use_tier = "openai"         # Maximum accuracy
    else:
        use_tier = "accurate"       # Best local option
else:
    use_tier = "fast"               # Speed over accuracy
```

**Implementation:**
```python
def select_tier_by_accuracy(critical: bool, network_ok: bool) -> str:
    if critical and network_ok:
        return "openai"
    elif critical:
        return "accurate"
    else:
        return "fast"
```

### Rule 4: Confidence-Based Fallback

```python
embeddings = embed_tier1(query)
similarities = compute_similarities(embeddings)

if max(similarities) < 0.65:
    # Low confidence, try higher tier
    embeddings = embed_tier2(query)
    similarities = compute_similarities(embeddings)
    
if max(similarities) < 0.50:
    # Still low confidence, escalate to OpenAI
    embeddings = embed_openai(query)
    similarities = compute_similarities(embeddings)
```

**Implementation:**
```python
def embed_with_confidence_fallback(
    text: str,
    vector_db,
    confidence_threshold: float = 0.65
) -> Tuple[np.ndarray, str, float]:
    """
    Embed with automatic tier fallback on low confidence.
    
    Returns:
        (embeddings, tier_used, max_confidence)
    """
    # Try fast tier
    embeddings = embedder.embed(text, use_tier="fast")
    sims = vector_db.search(embeddings)
    max_sim = np.max(sims) if sims else 0
    
    if max_sim >= confidence_threshold:
        return embeddings, "fast", max_sim
    
    # Fallback to accurate
    embeddings = embedder.embed(text, use_tier="accurate")
    sims = vector_db.search(embeddings)
    max_sim = np.max(sims) if sims else 0
    
    if max_sim >= confidence_threshold:
        return embeddings, "accurate", max_sim
    
    # Final fallback to OpenAI
    embeddings = embedder.embed(text, use_tier="openai")
    sims = vector_db.search(embeddings)
    max_sim = np.max(sims) if sims else 0
    
    return embeddings, "openai", max_sim
```

---

## Error Handling

### Scenario 1: MiniLM Timeout

```python
try:
    embeddings, latency = embedder.embed(
        text,
        use_tier="fast",
        return_latency=True
    )
    if latency > 100:  # Unexpected slowness
        logger.warning(f"MiniLM slow: {latency}ms, falling back")
        embeddings = embedder.embed(text, use_tier="accurate")
except Exception as e:
    logger.error(f"MiniLM failed: {e}, falling back to Nomic")
    embeddings = embedder.embed(text, use_tier="accurate")
```

### Scenario 2: Out of Memory (Nomic)

```python
try:
    embeddings = embedder.encode_batch(texts, use_tier="accurate")
except OutOfMemoryError:
    logger.warning("Nomic OOM, using MiniLM + chunking")
    # Fall back to MiniLM with smaller chunks
    embeddings = embedder.encode_batch(texts, use_tier="fast", batch_size=8)
```

### Scenario 3: Network Unavailable

```python
try:
    embeddings = embedder.embed(text, use_tier="openai")
except ConnectionError:
    logger.warning("Network unavailable, using local fallback")
    embeddings = embedder.embed(text, use_tier="accurate")
```

---

## Cost-Latency Optimization

### For Episodic Ingestion (Batch, Offline)

**Goal:** Maximize accuracy, ignore latency

```python
# Store memories with best embeddings
for memory in memories:
    # Use Nomic for maximum accuracy
    embedding = embedder.embed(
        memory["text"],
        use_tier="accurate"  # Force best local option
    )
    memory["embedding"] = embedding
    memory["tier"] = "accurate"
    
    # Only escalate to OpenAI if budget allows and accuracy critical
    if memory.get("critical"):
        embedding_openai = embedder.embed(
            memory["text"],
            use_tier="openai"
        )
        memory["embedding_fallback"] = embedding_openai
```

### For Episodic Retrieval (Real-time)

**Goal:** Minimize latency, accept some accuracy loss

```python
# Retrieve memories with speed priority
def retrieve_memories(query: str, top_k: int = 5):
    start = time.time()
    
    # Fast tier (should be <30ms)
    query_embedding = embedder.embed(query, use_tier="fast")
    results = vector_db.search(query_embedding, top_k=top_k)
    
    latency = time.time() - start
    
    # Fallback if too slow or low confidence
    if latency > 50 or not results or results[0]["score"] < 0.60:
        query_embedding = embedder.embed(query, use_tier="accurate")
        results = vector_db.search(query_embedding, top_k=top_k)
    
    return results
```

### For Mixed Workloads

**Goal:** Dynamic tier selection based on urgency

```python
def embed_adaptive(
    text: str,
    is_critical: bool = False,
    latency_budget_ms: float = 100
) -> np.ndarray:
    """
    Adaptive embedding with tier selection.
    """
    if is_critical and network_available():
        return embedder.embed(text, use_tier="openai")
    
    if latency_budget_ms < 50:
        return embedder.embed(text, use_tier="fast")
    
    if len(text) > 4000:
        return embedder.embed(text, use_tier="accurate")
    
    # Default: Try fast, fallback to accurate
    try:
        embed, latency = embedder.embed(
            text,
            use_tier="fast",
            return_latency=True
        )
        return embed
    except:
        return embedder.embed(text, use_tier="accurate")
```

---

## Fallback Strategy Configuration

### For NucBoxG3 (CPU-only, Windows)

```yaml
# config.yml
embedding:
  primary_tier: "fast"              # MiniLM (CPU-optimized)
  fallback_tier: "accurate"         # Nomic (when time permits)
  tertiary_tier: "openai"           # Only on explicit request
  
  constraints:
    max_local_latency_ms: 150
    min_similarity_confidence: 0.60
    
  behavior:
    on_timeout: fallback_to_tier_2
    on_low_confidence: fallback_to_tier_2
    on_long_context: force_tier_2
    on_error: retry_tier_2_then_openai
```

### For GPU Systems (If Available)

```yaml
embedding:
  primary_tier: "fast"              # MiniLM still fast
  fallback_tier: "accurate"         # Nomic on GPU (much faster)
  tertiary_tier: "openai"           # Backup
  
  constraints:
    max_local_latency_ms: 50        # Stricter on GPU
    min_similarity_confidence: 0.65
```

---

## Monitoring & Metrics

### Key Metrics to Track

```python
class EmbeddingMetrics:
    def __init__(self):
        self.tier_usage = {}        # Tier used per query
        self.latencies = {}         # Latency per tier
        self.fallback_count = 0     # How often fallback triggered
        self.accuracy_feedback = [] # Query quality
    
    def record(self, tier: str, latency_ms: float, accuracy: str):
        self.tier_usage[tier] = self.tier_usage.get(tier, 0) + 1
        self.latencies.setdefault(tier, []).append(latency_ms)
        if accuracy == "low_confidence":
            self.fallback_count += 1
    
    def report(self):
        return {
            "tier_usage": self.tier_usage,
            "avg_latency_ms": {
                t: np.mean(lats) for t, lats in self.latencies.items()
            },
            "fallback_rate": self.fallback_count / sum(self.tier_usage.values()),
        }
```

### Logging Example

```python
import logging

logger = logging.getLogger("embeddings")

def embed_logged(text: str, tier: str = "fast"):
    """Embed with logging."""
    start = time.time()
    try:
        embeddings, latency = embedder.embed(
            text,
            use_tier=tier,
            return_latency=True
        )
        logger.info(
            f"Embedded with {tier}: {latency:.1f}ms, dim={len(embeddings)}"
        )
        return embeddings
    except Exception as e:
        logger.error(f"Embedding failed with {tier}: {e}")
        # Fallback
        return embed_logged(text, tier="accurate")
```

---

## Testing the Fallback Strategy

### Unit Test Example

```python
def test_fallback_on_low_confidence():
    """Test that fallback triggers on low confidence."""
    embedder = LocalEmbedder(fallback_to_openai=True)
    vector_db = MockVectorDB()  # Returns low similarity scores
    
    embedding, tier_used = embed_with_confidence_fallback(
        "obscure query",
        vector_db,
        confidence_threshold=0.70
    )
    
    assert tier_used in ["accurate", "openai"], \
        "Should fallback from fast tier on low confidence"


def test_long_context_uses_nomic():
    """Test that long context automatically uses Nomic."""
    embedder = LocalEmbedder(tier="hybrid")
    
    long_text = "word " * 2000  # ~8000 tokens
    embedding = embedder.embed(long_text)
    
    # Verify Nomic was used (768 dims vs 384 for MiniLM)
    assert len(embedding) == 768, "Should use Nomic for long context"


def test_timeout_fallback():
    """Test timeout fallback mechanism."""
    embedder = LocalEmbedder(tier="fast")
    
    # Mock slow response
    with patch.object(embedder, 'embed', side_effect=TimeoutError):
        result = embed_with_timeout_fallback(text, timeout_ms=50)
        
        # Should fallback to Nomic
        assert result is not None
```

---

## Deployment Checklist

- [ ] Configure tiers in `config.yml`
- [ ] Set confidence thresholds for your domain
- [ ] Test latency on NucBoxG3 with representative data
- [ ] Set up monitoring/logging
- [ ] Create runbook for troubleshooting
- [ ] Document tier selection logic in your code
- [ ] Load test fallback chains
- [ ] Validate OpenAI fallback works (API key set, quota available)
- [ ] Set cost budget alerts for OpenAI usage
- [ ] Train team on tier selection strategy

---

## Expected Behavior

### Scenario 1: Real-time Chat (User Typing)

```
Query: "What did we discuss yesterday?"
├─ Latency budget: 50ms
├─ Use: MiniLM (fast tier)
├─ Result: ~15ms ✓
└─ Memory retrieved: Similar conversations

If latency > 50ms, fallback to Nomic
```

### Scenario 2: Memory Consolidation (Nightly Batch)

```
Task: Consolidate 1000 daily memories
├─ Latency budget: None (batch mode)
├─ Use: Nomic (accurate tier)
├─ Result: 100-150ms/memory × 1000 = ~2 minutes
└─ Quality: 95%+ accuracy, full 8192-token context

Note: No OpenAI needed; local is enough
```

### Scenario 3: Critical Decision (Litigation)

```
Query: "Has user disclosed IP concerns?"
├─ Accuracy critical: YES
├─ Network available: YES
├─ Use: OpenAI fallback
├─ Result: 100-200ms, 99% accuracy
└─ Tier used: "openai" (logged for audit)
```

---

## Summary

The fallback strategy ensures:

1. **Speed:** Fast tier handles 90%+ of queries (<30ms)
2. **Accuracy:** Escalate to Nomic or OpenAI when needed
3. **Resilience:** Graceful degradation on errors
4. **Cost:** Minimize OpenAI usage, rely on free local models
5. **Transparency:** Log tier selection for debugging

**Rule of Thumb:**
- **Default:** Use "fast" (MiniLM)
- **Long text:** Auto-upgrade to "accurate" (Nomic)
- **Critical:** Fallback to "openai"
- **Monitor:** Track fallback rate and adjust thresholds
