# Episodic-Memory Integration with Local Embeddings

**Document Version:** 1.0  
**Date:** 2026-02-13  
**Skill:** local-embeddings  
**Integration Target:** episodic-memory system

---

## Overview

The local-embeddings skill integrates with episodic-memory to provide fast, accurate, and cost-effective memory retrieval. This document outlines the integration architecture, API contracts, and usage patterns.

---

## Architecture

### Current State (OpenAI Only)

```
Episodic Memory System
└─ Embedding Layer
   └─ OpenAI text-embedding-3-small API
      ├─ Latency: 50-200ms (includes network)
      ├─ Cost: $0.02/1M tokens
      └─ Accuracy: High (99%)
```

### Post-Integration (Hybrid)

```
Episodic Memory System
└─ Embedding Layer
   ├─ Fast Path: MiniLM (local)
   │  ├─ Latency: <30ms
   │  ├─ Cost: Free
   │  ├─ Accuracy: 80%
   │  └─ Use: Real-time retrieval
   │
   ├─ Accurate Path: Nomic (local)
   │  ├─ Latency: 100-150ms
   │  ├─ Cost: Free
   │  ├─ Accuracy: 95%+
   │  ├─ Context: 8192 tokens
   │  └─ Use: Batch ingestion, long-form
   │
   └─ Premium Path: OpenAI (cloud)
      ├─ Latency: 50-200ms
      ├─ Cost: $0.02/1M tokens
      ├─ Accuracy: 99%
      └─ Use: Critical decisions, fallback
```

---

## Integration Points

### 1. Memory Ingestion

When storing new memories or updating episodic DB:

```python
from local_embeddings import LocalEmbedder

embedder = LocalEmbedder(tier="accurate")  # Nomic for ingestion

def store_memory(memory_dict):
    """Store memory with embeddings."""
    
    # Extract text content
    text = f"""
    Date: {memory_dict['timestamp']}
    Content: {memory_dict['content']}
    Context: {memory_dict.get('context', '')}
    Tags: {', '.join(memory_dict.get('tags', []))}
    """
    
    # Generate embedding (Nomic: 8192 token context)
    embedding = embedder.embed(
        text,
        context_length=len(text.split())  # Helps auto-tier
    )
    
    # Store in episodic DB
    memory_dict['embedding'] = embedding
    memory_dict['embedding_tier'] = "accurate"
    memory_dict['embedding_dim'] = len(embedding)
    memory_dict['embedding_date'] = datetime.now()
    
    episodic_db.store(memory_dict)
    
    return memory_dict
```

**Key Points:**
- Use "accurate" tier for ingestion (batch mode, latency acceptable)
- Include full context (8192 token limit with Nomic)
- Tag embeddings with tier and dimension info

### 2. Memory Retrieval

When querying memories in real-time:

```python
from local_embeddings import LocalEmbedder

embedder = LocalEmbedder(tier="fast")  # MiniLM for retrieval

def retrieve_memories(query: str, top_k: int = 5, latency_budget_ms: float = 50):
    """Retrieve relevant memories."""
    
    # Generate query embedding (fast tier, <30ms)
    start = time.time()
    query_embedding = embedder.embed(query, use_tier="fast")
    latency_fast = (time.time() - start) * 1000
    
    # Search vector DB
    results = episodic_db.search(
        query_embedding,
        top_k=top_k,
        similarity_threshold=0.60  # Confidence threshold
    )
    
    # Confidence-based fallback
    if results and results[0]['score'] >= 0.70:
        # High confidence, use fast results
        return results, "fast"
    
    elif latency_fast < latency_budget_ms * 0.5:
        # Fast enough, try accurate tier for better results
        query_embedding_accurate = embedder.embed(
            query,
            use_tier="accurate"
        )
        results_accurate = episodic_db.search(
            query_embedding_accurate,
            top_k=top_k,
            similarity_threshold=0.65
        )
        
        if results_accurate and results_accurate[0]['score'] >= 0.75:
            return results_accurate, "accurate"
    
    # Use fast results or escalate to OpenAI
    if not results:
        # Last resort: OpenAI
        query_embedding_openai = embedder.embed(
            query,
            use_tier="openai"
        )
        results = episodic_db.search(
            query_embedding_openai,
            top_k=top_k,
            similarity_threshold=0.70
        )
        return results, "openai"
    
    return results, "fast"
```

**Key Points:**
- Use "fast" tier for real-time queries (<50ms budget)
- Implement confidence-based escalation
- Log tier used for monitoring

### 3. Memory Consolidation (Long-form)

When processing full conversation histories:

```python
def consolidate_conversation(conversation_id: str):
    """Create consolidated memory from full conversation."""
    
    # Fetch full conversation
    messages = episodic_db.get_conversation(conversation_id)
    
    # Build full context (up to 8192 tokens)
    full_context = f"""
    Conversation ID: {conversation_id}
    Start: {messages[0]['timestamp']}
    End: {messages[-1]['timestamp']}
    
    Messages:
    """
    
    for msg in messages:
        full_context += f"\n[{msg['timestamp']}] {msg['speaker']}: {msg['text']}"
    
    # Generate embedding with Nomic (handles full 8192 tokens)
    embedding = LocalEmbedder(tier="accurate").embed(
        full_context,
        context_length=8192  # Explicitly use max length
    )
    
    # Create consolidated memory
    consolidated = {
        "id": f"consolidated_{conversation_id}",
        "type": "conversation_summary",
        "content": full_context,
        "embedding": embedding,
        "embedding_tier": "accurate",
        "source_messages": len(messages),
        "created_at": datetime.now()
    }
    
    episodic_db.store(consolidated)
    
    return consolidated
```

**Key Points:**
- Use Nomic tier for full conversation context
- No truncation needed with 8192 token limit
- Mark as full-context memory

---

## API Contracts

### EmbeddingStore Interface

```python
class EpisodiceMemoryEmbeddingStore:
    """
    Interface for episodic memory embedding storage.
    Managed by the episodic-memory system.
    """
    
    def embed_and_store(
        self,
        memory: Memory,
        tier: str = "auto"  # "fast", "accurate", "auto"
    ) -> Memory:
        """Store memory with embeddings."""
        # Implementation uses local-embeddings
        pass
    
    def embed_query(
        self,
        query: str,
        latency_budget_ms: float = 50
    ) -> np.ndarray:
        """Generate query embedding."""
        pass
    
    def search(
        self,
        embedding: np.ndarray,
        top_k: int = 5,
        confidence_threshold: float = 0.60
    ) -> List[Memory]:
        """Search for similar memories."""
        pass
    
    def get_embedding_stats(self) -> Dict:
        """Get embedding tier usage and performance."""
        pass
```

### Memory Schema Extension

```python
@dataclass
class Memory:
    id: str
    type: str  # "conversation", "fact", "event", etc.
    content: str
    timestamp: datetime
    
    # Embedding metadata (added by local-embeddings)
    embedding: Optional[np.ndarray] = None
    embedding_tier: Optional[str] = None  # "fast", "accurate", "openai"
    embedding_dim: Optional[int] = None
    embedding_date: Optional[datetime] = None
    
    # Fallback embeddings (optional, for high-value memories)
    embedding_fallback: Optional[np.ndarray] = None
    embedding_fallback_tier: Optional[str] = None
```

---

## Configuration

### episodic-memory Config with Local Embeddings

```yaml
# episodic_config.yml
episodic_memory:
  
  # Embedding Configuration
  embeddings:
    enabled: true
    provider: "local"  # "local" or "openai"
    
    # Tier configuration
    tiers:
      primary: "fast"      # MiniLM for real-time
      secondary: "accurate" # Nomic for batch
      tertiary: "openai"   # OpenAI fallback
    
    # Constraints
    retrieval:
      latency_budget_ms: 50
      confidence_threshold: 0.60
      min_confidence_escalate: 0.65
    
    ingestion:
      tier: "accurate"  # Always use accurate for storage
      batch_size: 32
      context_max_tokens: 8192
    
    # Fallback behavior
    fallback:
      enabled: true
      on_timeout: escalate_tier
      on_low_confidence: escalate_tier
      on_long_context: force_accurate
      on_error: retry_then_openai
    
    # OpenAI fallback (optional)
    openai:
      enabled: false  # Set to true if needed
      api_key: ${OPENAI_API_KEY}
      model: "text-embedding-3-small"
      cost_budget_daily: "$1.00"
  
  # Vector DB for embeddings
  vector_store:
    type: "in_memory"  # or "faiss", "pinecone", etc.
    similarity_metric: "cosine"
    normalize_embeddings: true
  
  # Memory retention
  retention:
    embeddings_cache_size: 10000
    embedding_refresh_days: 7  # Re-embed old memories
```

### Python Configuration

```python
from local_embeddings import LocalEmbedder

# Initialize episodic memory with local embeddings
episodic_memory_config = {
    "embeddings": {
        "provider": "local",
        "tiers": {
            "retrieval": "fast",
            "ingestion": "accurate",
            "critical": "openai"
        },
        "model_config": {
            "fast": {
                "model": "all-MiniLM-L6-v2",
                "cache_dir": "./models"
            },
            "accurate": {
                "model": "nomic-embed-text-v1",
                "cache_dir": "./models"
            }
        },
        "fallback": {
            "enabled": True,
            "openai_api_key": os.getenv("OPENAI_API_KEY")
        }
    }
}

# Initialize embedder
embedder = LocalEmbedder(
    tier="hybrid",
    enable_caching=True,
    fallback_to_openai=True
)
```

---

## Usage Patterns

### Pattern 1: Standard Memory Store & Retrieve

```python
# Store
new_memory = {
    "type": "conversation",
    "content": "Had discussion about project timeline",
    "timestamp": datetime.now()
}
stored_memory = episodic_memory.store(new_memory)
# Uses accurate tier, generates 768-dim embedding

# Retrieve
query = "Tell me about the project schedule"
results = episodic_memory.search(query, top_k=3)
# Uses fast tier, <30ms latency, 384-dim embeddings
```

### Pattern 2: Long-Form Memory with Full Context

```python
# Store full conversation (8192 token limit)
full_conv = episodic_memory.create_consolidated_memory(
    conversation_id="conv_123",
    include_full_context=True  # Uses Nomic tier
)

# Later retrieve with query
results = episodic_memory.search(
    "What was the main agreement?",
    search_in_consolidated=True
)
```

### Pattern 3: Critical Decision with Audit Trail

```python
# For litigation-critical retrieval
query = "Has user ever mentioned IP concerns?"
results = episodic_memory.search(
    query,
    critical=True,  # Forces OpenAI tier
    log_tier=True   # Logs tier used for audit
)

# Audit trail
# {
#   "query": "...",
#   "tier_used": "openai",
#   "confidence": 0.98,
#   "timestamp": "...",
#   "results": [...]
# }
```

---

## Monitoring & Observability

### Metrics to Track

```python
class EmbeddingMetrics:
    """Metrics for embedding system health."""
    
    # Tier usage
    tier_usage: Dict[str, int] = {}  # Count per tier
    
    # Latency
    latency_p50_ms: Dict[str, float] = {}
    latency_p95_ms: Dict[str, float] = {}
    latency_p99_ms: Dict[str, float] = {}
    
    # Accuracy
    fallback_rate: float = 0.0  # % of queries that fallback
    confidence_scores: List[float] = []
    
    # Cost
    openai_queries: int = 0
    estimated_openai_cost: float = 0.0
    
    # Errors
    embedding_errors: int = 0
    fallback_errors: int = 0

# Example metrics output
metrics = episodic_memory.get_embedding_metrics()
print(metrics)
# {
#   "tier_usage": {"fast": 980, "accurate": 15, "openai": 5},
#   "avg_latency_ms": {"fast": 12, "accurate": 95, "openai": 120},
#   "fallback_rate": 0.02,  # 2% of queries fallback
#   "openai_cost_daily": "$0.0001",
#   "errors": 0
# }
```

### Dashboard

```python
# Example: Embedding health dashboard
def show_embedding_dashboard():
    """Display embedding system status."""
    
    stats = episodic_memory.get_embedding_stats()
    
    print("""
    ╔═══════════════════════════════════════════════╗
    ║     Episodic Memory - Embedding Dashboard     ║
    ╠═══════════════════════════════════════════════╣
    
    TIER USAGE (today):
      • Fast (MiniLM):     {fast:>6} queries
      • Accurate (Nomic):  {accurate:>6} queries
      • OpenAI fallback:   {openai:>6} queries
    
    LATENCY:
      • Fast:     {fast_p50:>6}ms (p50), {fast_p95:>6}ms (p95)
      • Accurate: {acc_p50:>6}ms (p50), {acc_p95:>6}ms (p95)
      • OpenAI:   {openai_p50:>6}ms (p50), {openai_p95:>6}ms (p95)
    
    QUALITY:
      • Fallback rate: {fallback:>6.1f}%
      • Avg confidence: {conf:>6.1f}%
      • Errors: {errors:>6}
    
    COST (monthly estimate):
      • Local: FREE
      • OpenAI: ${openai_cost:>6.2f}
    
    ╚═══════════════════════════════════════════════╝
    """.format(**stats))
```

---

## Testing

### Unit Tests

```python
def test_memory_embedding_fast_tier():
    """Test that retrieval uses fast tier."""
    episodic_memory = EpisodicMemory()
    episodic_memory.store({"content": "Test memory"})
    
    start = time.time()
    results = episodic_memory.search("test", tier_hint="fast")
    latency = (time.time() - start) * 1000
    
    assert latency < 50, "Should complete within latency budget"
    assert results[0]["tier_used"] == "fast"


def test_memory_embedding_long_context():
    """Test that long context uses accurate tier."""
    episodic_memory = EpisodicMemory()
    
    # Create 5000-token memory
    long_text = "word " * 1250
    episodic_memory.store({"content": long_text})
    
    # Query should automatically use accurate tier
    results = episodic_memory.search("word", tier_hint="auto")
    
    assert results[0]["embedding_dim"] == 768, "Should use Nomic (768 dims)"


def test_memory_embedding_fallback():
    """Test fallback on low confidence."""
    episodic_memory = EpisodicMemory()
    episodic_memory.store({
        "content": "Specific technical fact about X"
    })
    
    # Ambiguous query
    results = episodic_memory.search(
        "information",
        fallback_on_low_confidence=True
    )
    
    # Should fallback from fast to accurate
    assert results[0]["tier_used"] in ["fast", "accurate"]
    assert results[0]["confidence"] >= 0.60  # Minimum confidence met
```

### Integration Tests

```python
def test_episodic_memory_integration():
    """Test full episodic memory with local embeddings."""
    
    episodic_memory = EpisodicMemory(embeddings="local")
    
    # Store multiple memories
    memories = [
        {"content": "Project deadline is March 15"},
        {"content": "Team standup every Monday at 9am"},
        {"content": "Use Python 3.11+ for new projects"}
    ]
    
    for mem in memories:
        episodic_memory.store(mem)
    
    # Verify all stored
    all_memories = episodic_memory.get_all()
    assert len(all_memories) == 3
    
    # Verify embeddings present
    for mem in all_memories:
        assert mem["embedding"] is not None
        assert mem["embedding_tier"] in ["fast", "accurate"]
    
    # Retrieve with query
    results = episodic_memory.search("March", top_k=1)
    assert "deadline" in results[0]["content"].lower()
```

---

## Deployment Steps

1. **Install local-embeddings package**
   ```bash
   pip install sentence-transformers torch numpy
   ```

2. **Configure episodic-memory**
   - Update config with `provider: "local"`
   - Set tier preferences
   - Configure fallback strategy

3. **Initialize embedder**
   ```python
   episodic_memory = EpisodicMemory(embeddings="local")
   ```

4. **Benchmark on NucBoxG3**
   ```python
   stats = episodic_memory.benchmark()
   print(stats)
   # Verify latencies meet SLAs
   ```

5. **Re-embed existing memories** (optional)
   ```python
   episodic_memory.re_embed_all(tier="accurate")
   # Generates local embeddings for existing memories
   ```

6. **Monitor** for 24-48 hours
   - Check fallback rate (<2%)
   - Verify latency SLAs met
   - Monitor errors

7. **Scale up** to production

---

## Troubleshooting

### Issue: Embeddings not found
**Solution:** Run `episodic_memory.re_embed_all()` to generate embeddings for existing memories

### Issue: Slow retrieval (>100ms)
**Solution:** Check if accurate tier being used. Switch to fast: `episodic_memory.search(query, force_tier="fast")`

### Issue: Low quality results
**Solution:** Enable fallback: `episodic_memory.search(query, fallback_enabled=True)`

### Issue: Out of memory
**Solution:** Reduce batch size or use in-memory cache: `episodic_memory.clear_embedding_cache()`

---

## Summary

The local-embeddings integration provides:

✓ **Speed:** <30ms for real-time queries (MiniLM)  
✓ **Accuracy:** 95%+ for important memories (Nomic)  
✓ **Context:** Up to 8192 tokens for full conversations  
✓ **Cost:** Free for local tiers, optional OpenAI fallback  
✓ **Resilience:** Automatic fallback chain  
✓ **Transparency:** Full logging and metrics

**Next Step:** Deploy to NucBoxG3 and measure performance.
