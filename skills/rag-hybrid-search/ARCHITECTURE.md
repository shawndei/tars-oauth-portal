# RAG Hybrid Search - Architecture Overview

Detailed technical architecture of the hybrid search system.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER / APPLICATION                       │
│                   (Queries, RAG Pipeline)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                 HYBRID SEARCH INTERFACE                      │
│                   (index.js exports)                         │
│                                                              │
│  • hybridSearch(table, bm25Index, query, options)          │
│  • vectorSearch(table, query, limit)                       │
│  • buildBM25Index(table)                                   │
│  • loadBM25Index(table, force)                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   QUERY PROCESSING                           │
│                                                              │
│  1. Parse query                                             │
│  2. Generate embedding (OpenAI API)                         │
│  3. Tokenize query (BM25)                                   │
└─────────────────┬──────────────────┬────────────────────────┘
                  │                  │
                  ↓                  ↓
    ┌─────────────────────┐  ┌─────────────────────┐
    │  VECTOR SEARCH      │  │   BM25 SEARCH       │
    │  (Semantic)         │  │   (Keyword)         │
    │                     │  │                     │
    │  • LanceDB query    │  │  • In-memory index  │
    │  • Cosine similarity│  │  • TF-IDF scoring   │
    │  • Top-K candidates │  │  • Top-K candidates │
    └──────────┬──────────┘  └──────────┬──────────┘
               │                        │
               └───────────┬────────────┘
                           ↓
              ┌─────────────────────────┐
              │   CANDIDATE MERGING     │
              │                         │
              │  Merge by document ID   │
              │  Preserve both scores   │
              └────────────┬────────────┘
                           ↓
              ┌─────────────────────────┐
              │    SCORE FUSION         │
              │                         │
              │  Choose strategy:       │
              │  • RRF (rank-based)     │
              │  • Weighted (score)     │
              │  • Max (best-of)        │
              └────────────┬────────────┘
                           ↓
              ┌─────────────────────────┐
              │     RERANKING           │
              │                         │
              │  • Sort by fused score  │
              │  • Apply threshold      │
              │  • Return top-K         │
              └────────────┬────────────┘
                           ↓
              ┌─────────────────────────┐
              │   RESULTS + METADATA    │
              │                         │
              │  • Ranked documents     │
              │  • All scores           │
              │  • Source attribution   │
              │  • Query statistics     │
              └─────────────────────────┘
```

---

## Component Details

### 1. Query Processing Layer

**Input:** Natural language query string

**Processing:**
1. Generate embedding via OpenAI API (text-embedding-3-small)
2. Tokenize text for BM25 (lowercase, remove punctuation, split)
3. Prepare for parallel search

**Output:** 
- Embedding vector (1536D float array)
- Token list (array of terms)

---

### 2. Dual Search Engines

#### 2.1 Vector Search (Semantic)

**Technology:** LanceDB (Apache Arrow)

**Process:**
```
Query Embedding (1536D)
    ↓
LanceDB.search(embedding)
    ↓
Cosine Similarity Computation
    ↓
Top-K most similar documents
```

**Characteristics:**
- Understands semantic meaning
- Finds conceptually similar content
- Language model powered (OpenAI)
- Returns similarity scores (0-1)

**Strengths:**
- ✅ Semantic understanding
- ✅ Paraphrase detection
- ✅ Conceptual similarity

**Weaknesses:**
- ❌ May miss exact terms
- ❌ Confuses similar entities
- ❌ Weak with technical jargon

---

#### 2.2 BM25 Search (Keyword)

**Technology:** Custom in-memory implementation (Okapi BM25)

**Process:**
```
Query Tokens [term1, term2, ...]
    ↓
For each document:
  - Calculate TF (term frequency)
  - Calculate IDF (inverse document frequency)
  - Apply length normalization
  - Compute BM25 score
    ↓
Top-K highest scoring documents
```

**Formula:**
```
BM25(D,Q) = Σ IDF(qi) × (f(qi,D) × (k1 + 1)) / 
                        (f(qi,D) + k1 × (1 - b + b × |D|/avgdl))

Where:
  D = document
  Q = query
  qi = query term i
  f(qi,D) = term frequency in document
  IDF(qi) = log((N - df + 0.5) / (df + 0.5) + 1)
  N = total documents
  df = document frequency of term
  |D| = document length
  avgdl = average document length
  k1 = term frequency saturation (default: 1.2)
  b = length normalization (default: 0.75)
```

**Characteristics:**
- Classic probabilistic ranking
- Exact keyword matching
- Length normalization
- Returns relevance scores (0-∞, typically 0-20)

**Strengths:**
- ✅ Exact keyword matches
- ✅ Entity name precision
- ✅ Technical term detection

**Weaknesses:**
- ❌ No semantic understanding
- ❌ Vocabulary mismatch problem
- ❌ Sensitive to exact wording

---

### 3. Score Fusion Layer

Combines results from both search engines.

#### 3.1 Reciprocal Rank Fusion (RRF)

**Formula:**
```
RRF(d) = Σ (1 / (k + rank(d)))

Where:
  d = document
  rank(d) = position in ranked list (0-indexed)
  k = constant (default: 60)
```

**Process:**
1. Get ranking from vector search: [doc1, doc2, doc3, ...]
2. Get ranking from BM25 search: [doc2, doc4, doc1, ...]
3. For each document, sum RRF scores from both lists
4. Higher score = appears in more lists and/or ranked higher

**Example:**
```
Vector ranking: [A, B, C]
BM25 ranking:   [B, A, D]

RRF scores:
- A: 1/(60+0) + 1/(60+1) = 0.01667 + 0.01639 = 0.03306
- B: 1/(60+1) + 1/(60+0) = 0.01639 + 0.01667 = 0.03306
- C: 1/(60+2) = 0.01613
- D: 1/(60+2) = 0.01613

Ranking: [A, B, C, D] (A and B tied, both in both lists)
```

**Advantages:**
- No score normalization needed
- Robust to different scoring scales
- Research-proven effectiveness
- Simple and interpretable

**When to use:** Default choice (recommended)

---

#### 3.2 Weighted Score Fusion

**Formula:**
```
Score(d) = (vector_score × w_vector) + (normalized_bm25 × w_bm25)

Where:
  vector_score ∈ [0, 1]
  normalized_bm25 = min(bm25_score / 10, 1)
  w_vector + w_bm25 = 1
```

**Process:**
1. Normalize BM25 scores to [0, 1] range
2. Multiply vector score by vector weight
3. Multiply BM25 score by BM25 weight
4. Sum weighted scores

**Example:**
```
Document A:
  vector_score = 0.85
  bm25_score = 6.5
  normalized_bm25 = min(6.5/10, 1) = 0.65

With weights: w_vector=0.6, w_bm25=0.4
  fused_score = (0.85 × 0.6) + (0.65 × 0.4)
              = 0.51 + 0.26
              = 0.77
```

**Advantages:**
- Fine-grained control
- Tunable for specific use cases
- Interpretable weights

**When to use:** When you can tune weights for your domain

---

#### 3.3 Max Score Fusion

**Formula:**
```
Score(d) = max(vector_score, normalized_bm25)
```

**Process:**
1. Normalize BM25 scores
2. Take maximum of vector or BM25 score
3. Conservative strategy (won't miss good results)

**Example:**
```
Document A:
  vector_score = 0.85
  normalized_bm25 = 0.65
  fused_score = max(0.85, 0.65) = 0.85

Document B:
  vector_score = 0.60
  normalized_bm25 = 0.95
  fused_score = max(0.60, 0.95) = 0.95
```

**Advantages:**
- Simple and safe
- No parameter tuning
- Won't miss good results

**When to use:** Conservative retrieval, diverse query types

---

### 4. Reranking Layer

Final step before returning results.

**Process:**
1. Sort documents by fused score (descending)
2. Apply minimum score threshold
3. Limit to top-K results
4. Attach metadata (source, scores, stats)

**Output Structure:**
```javascript
{
  results: [
    {
      id: "doc_chunk_1",
      text: "Document content...",
      source: "MEMORY.md",
      date: "2026-02-13",
      chunk_index: 1,
      vector_score: 0.892,
      bm25_score: 8.73,
      fused_score: 0.034
    },
    ...
  ],
  stats: {
    query_time_ms: 847,
    total_candidates: 15,
    vector_results: 8,
    bm25_results: 12,
    fusion_method: "rrf",
    filtered_results: 10,
    returned_results: 8
  }
}
```

---

## Data Structures

### BM25 Index Structure

```javascript
{
  documents: [
    {
      id: "doc_chunk_1",
      text: "Document content...",
      source: "MEMORY.md",
      terms: ["document", "content", ...],
      termFrequency: Map {
        "document" => 3,
        "content" => 2,
        ...
      },
      docLength: 142
    },
    ...
  ],
  docFrequency: Map {
    "document" => 25,  // Appears in 25 documents
    "content" => 18,
    ...
  },
  avgDocLength: 156.7,
  totalDocs: 42
}
```

**Storage:** JSON file (`.bm25-index.json`)

**Size:** ~100KB for typical corpus (30 days memory)

---

### Vector Database Structure

**Technology:** LanceDB (columnar, Apache Arrow)

**Schema:**
```javascript
{
  id: string,              // "doc_chunk_1"
  text: string,            // Document content (800 chars)
  vector: float[1536],     // Embedding
  source: string,          // "MEMORY.md"
  source_type: string,     // "long_term" | "daily_log"
  date: string,            // "2026-02-13"
  chunk_index: int,        // 0, 1, 2, ...
  timestamp: string,       // ISO datetime
  metadata: JSON           // Additional metadata
}
```

**Storage:** LanceDB files (`.episodic-memory-db/`)

**Size:** ~5-20MB for typical corpus

---

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Typical Time |
|-----------|-----------|--------------|
| BM25 index build | O(N×M) | 2-5 sec |
| BM25 search | O(N) | <50 ms |
| Vector search | O(N×D) | 600-700 ms |
| Embedding generation | O(1) | 200-400 ms |
| Score fusion | O(N) | <10 ms |
| Total hybrid search | O(N×D) | 600-900 ms |

Where:
- N = number of documents
- M = average document length
- D = embedding dimensions (1536)

### Space Complexity

| Component | Size |
|-----------|------|
| BM25 index | ~100KB (42 docs) |
| Vector DB | ~5-20MB (42 docs) |
| In-memory BM25 | ~2MB (loaded) |
| Query cache | ~10MB (1000 queries) |

---

## Scaling Characteristics

### Document Count Scaling

| Documents | BM25 Build | BM25 Search | Vector Search | Total |
|-----------|------------|-------------|---------------|-------|
| 100 | 5s | 50ms | 700ms | 750ms |
| 1,000 | 30s | 100ms | 800ms | 900ms |
| 10,000 | 5min | 500ms | 1200ms | 1700ms |
| 100,000 | 50min | 2000ms | 3000ms | 5000ms |

**Note:** These are estimates. Actual performance depends on hardware and document length.

---

## Integration Points

### With Episodic Memory

```
Episodic Memory (skills/episodic-memory/)
    ↓
  LanceDB Vector Database
    ↓
  ┌─────────────────┐
  │ Vector Search   │ ← Used by hybrid search
  └─────────────────┘
    ↓
  ┌─────────────────┐
  │ BM25 Index      │ ← Built from same documents
  └─────────────────┘
    ↓
  Hybrid Search Results
```

**Shared resources:**
- LanceDB database (`.episodic-memory-db/`)
- OpenAI API key (environment)
- Document corpus (MEMORY.md + daily logs)

**Independent resources:**
- BM25 index (`.bm25-index.json`)
- Score fusion logic
- Hybrid search CLI

---

### With RAG Pipeline

```
User Query
    ↓
Hybrid Search (Retrieval)
    ↓
Top-K Documents (Context)
    ↓
LLM (Generation)
    ↓
Answer + Sources
```

**Integration code:**
```javascript
const { hybridSearch } = require('./skills/rag-hybrid-search/index.js');

// Retrieve
const context = await hybridSearch(table, bm25Index, query);

// Generate
const completion = await openai.chat.completions.create({
  messages: [
    { role: 'system', content: 'Answer based on context.' },
    { role: 'user', content: `Context:\n${context}\n\nQ: ${query}` }
  ]
});
```

---

## Design Decisions

### Why BM25?

**Alternatives considered:**
- TF-IDF (simpler but less effective)
- BM25+ (more complex, minimal improvement)
- BM25L (handles long documents, not needed)

**Chosen:** BM25 (classic Okapi)
- Research-proven effectiveness
- Good balance of simplicity and performance
- Standard in information retrieval
- Well-understood tuning parameters

---

### Why RRF as Default?

**Alternatives considered:**
- Linear combination (requires normalization)
- CombSUM/CombMNZ (less robust)
- Learned fusion (complex, needs training data)

**Chosen:** Reciprocal Rank Fusion
- No score normalization needed
- Robust to different scoring scales
- Research-backed (Cormack et al., 2009)
- Simple and interpretable
- Works well without tuning

---

### Why In-Memory BM25?

**Alternatives considered:**
- Elasticsearch (overkill for small corpus)
- SQLite FTS (good but more complex)
- PostgreSQL FTS (requires database setup)

**Chosen:** In-memory JavaScript implementation
- Simple deployment (no external dependencies)
- Fast for small-medium corpus (<100k docs)
- Easy to understand and modify
- Persistent via JSON serialization
- Portable across platforms

---

## Future Enhancements

### Phase 2 (Planned)

1. **Query Expansion**
   - Synonym expansion
   - Related terms
   - Spelling correction

2. **Contextual Reranking**
   - Use LLM to rerank results
   - Context-aware scoring
   - Cross-encoder models

3. **Caching Layer**
   - Query result cache
   - Embedding cache
   - LRU eviction

### Phase 3 (Future)

1. **Learning to Rank**
   - ML-based fusion weights
   - Personalized ranking
   - Feedback loop

2. **Approximate Search**
   - Approximate BM25 (faster)
   - HNSW for vector search
   - Trade accuracy for speed

3. **Streaming Results**
   - Return results as available
   - Progressive enhancement
   - Lower perceived latency

---

## References

### BM25
- Robertson, S. E., & Zaragoza, H. (2009). "The Probabilistic Relevance Framework: BM25 and Beyond". Foundations and Trends in Information Retrieval, 3(4), 333-389.

### Reciprocal Rank Fusion
- Cormack, G. V., Clarke, C. L., & Büttcher, S. (2009). "Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods". SIGIR '09.

### Hybrid Search
- Lin, J., et al. (2021). "Simplifying Dense Retrieval with Hybrid Search". arXiv:2104.07186.

---

**Last Updated:** 2026-02-13  
**Version:** 1.0.0  
**Status:** Production Ready ✅
