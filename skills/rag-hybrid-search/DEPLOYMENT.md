# RAG Hybrid Search - Deployment Guide

Complete guide for deploying and integrating hybrid search into your RAG pipeline.

---

## Prerequisites

### 1. Episodic Memory System

Hybrid search builds on top of episodic memory. Ensure it's set up first:

```bash
# Check if episodic memory database exists
ls -la .episodic-memory-db/

# If not, index your memory files
node skills/episodic-memory/index.js index
```

### 2. Environment Variables

The OpenAI API key must be available. Three options:

#### Option A: From OpenClaw Config (Recommended)

OpenClaw stores the API key in its config. To use it:

```bash
# On Windows PowerShell
$env:OPENAI_API_KEY = (node -e "console.log(require('fs').readFileSync(process.env.USERPROFILE + '/.openclaw/config.json', 'utf8'))" | ConvertFrom-Json).openai.apiKey

# On Unix/Linux/Mac
export OPENAI_API_KEY=$(node -e "console.log(require('fs').readFileSync(process.env.HOME + '/.openclaw/config.json', 'utf8'))" | jq -r '.openai.apiKey')
```

#### Option B: Manual Export

```bash
# Windows PowerShell
$env:OPENAI_API_KEY = "sk-..."

# Unix/Linux/Mac
export OPENAI_API_KEY="sk-..."
```

#### Option C: .env File

Create `.env` in workspace root:

```bash
OPENAI_API_KEY=sk-...
```

Then load it in your script:
```javascript
require('dotenv').config();
```

---

## Installation Steps

### Step 1: Install Dependencies

```bash
cd skills/rag-hybrid-search
npm install --legacy-peer-deps
```

**Installed packages:**
- `@lancedb/lancedb` - Vector database
- `apache-arrow` - Columnar data
- `openai` - OpenAI API client

### Step 2: Set Environment Variables

Choose one of the methods above to set `OPENAI_API_KEY`.

### Step 3: Build BM25 Index

```bash
node skills/rag-hybrid-search/index.js build-index
```

**Expected output:**
```
Building BM25 index from episodic memory...
Fetched 42 documents from vector database
✓ BM25 index built: 42 documents, 387 unique terms
✓ BM25 index saved to C:\Users\DEI\.openclaw\workspace\.bm25-index.json

✓ BM25 index build complete
```

**Troubleshooting:**
- If "OPENAI_API_KEY not set" error: Configure environment variable
- If "Cannot read table episodic_memory": Index episodic memory first
- If "ENOENT .episodic-memory-db": Run episodic memory indexing

### Step 4: Verify Installation

Test with a simple search:

```bash
node skills/rag-hybrid-search/index.js search "optimization"
```

Should return results in <1 second.

### Step 5: Run Test Suite

```bash
node skills/rag-hybrid-search/test.js
```

**Expected:** All tests pass (45+ assertions).

---

## Integration Patterns

### Pattern 1: Simple RAG Query Function

```javascript
// rag-query.js
const {
  hybridSearch,
  loadBM25Index,
  initializeVectorDB
} = require('./skills/rag-hybrid-search/index.js');
const { OpenAI } = require('openai');

async function ragQuery(question) {
  // Initialize (can be cached/reused)
  const { table } = await initializeVectorDB();
  const bm25Index = await loadBM25Index(table);
  const openai = new OpenAI();

  // Retrieve context
  const searchResult = await hybridSearch(table, bm25Index, question, {
    limit: 5,
    fusionMethod: 'rrf',
    minScore: 0.7
  });

  if (searchResult.results.length === 0) {
    return "I don't have enough information to answer that.";
  }

  // Build context
  const context = searchResult.results
    .map((r, i) => `[${i+1}] ${r.source}\n${r.text}`)
    .join('\n\n');

  // Generate answer
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'Answer based on context. Cite sources.' },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
    ]
  });

  return completion.choices[0].message.content;
}

// Usage
ragQuery('What optimizations were implemented?')
  .then(answer => console.log(answer));
```

### Pattern 2: Cached Search Service

```javascript
// cached-search-service.js
class HybridSearchService {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    const {
      loadBM25Index,
      initializeVectorDB
    } = require('./skills/rag-hybrid-search/index.js');

    const { table } = await initializeVectorDB();
    this.table = table;
    this.bm25Index = await loadBM25Index(table);
    this.initialized = true;

    console.log('✓ Hybrid search service initialized');
  }

  async search(query, options = {}) {
    if (!this.initialized) await this.init();

    const { hybridSearch } = require('./skills/rag-hybrid-search/index.js');
    return await hybridSearch(this.table, this.bm25Index, query, {
      limit: 8,
      fusionMethod: 'rrf',
      ...options
    });
  }
}

// Singleton instance
const searchService = new HybridSearchService();

module.exports = { searchService };
```

Usage:
```javascript
const { searchService } = require('./cached-search-service.js');

// First call initializes (one-time cost)
const results = await searchService.search('optimization');

// Subsequent calls reuse connections (fast)
const moreResults = await searchService.search('performance');
```

### Pattern 3: OpenClaw Agent Integration

```javascript
// In your agent skill
async function semanticMemorySearch(query) {
  const {
    hybridSearch,
    loadBM25Index,
    initializeVectorDB
  } = require('./skills/rag-hybrid-search/index.js');

  const { table } = await initializeVectorDB();
  const bm25Index = await loadBM25Index(table);

  const result = await hybridSearch(table, bm25Index, query, {
    limit: 8,
    fusionMethod: 'rrf',
    minScore: 0.7
  });

  // Format for agent context
  return result.results.map(r => ({
    text: r.text,
    source: r.source,
    date: r.date,
    relevance: r.fused_score
  }));
}

// Use in agent decision-making
const relevantMemories = await semanticMemorySearch('Shawn preferences');
// Use relevantMemories to inform response...
```

---

## Production Deployment

### Configuration

Create `rag-hybrid-search.config.js`:

```javascript
module.exports = {
  // Search defaults
  search: {
    defaultLimit: 8,
    minScore: 0.7,
    fusionMethod: 'rrf',  // or 'weighted', 'max'
    vectorWeight: 0.5,    // for weighted fusion
    bm25Weight: 0.5
  },

  // BM25 parameters
  bm25: {
    k1: 1.2,
    b: 0.75
  },

  // Performance
  performance: {
    cacheEmbeddings: true,
    maxCacheSize: 1000
  },

  // Maintenance
  maintenance: {
    autoRebuildBM25: true,
    rebuildInterval: '24h'  // Rebuild daily
  }
};
```

### Monitoring

Add logging and metrics:

```javascript
const { hybridSearch } = require('./skills/rag-hybrid-search/index.js');

async function monitoredSearch(query, options) {
  const startTime = Date.now();

  try {
    const result = await hybridSearch(table, bm25Index, query, options);

    // Log success metrics
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      query,
      queryTime: result.stats.query_time_ms,
      resultsCount: result.results.length,
      vectorResults: result.stats.vector_results,
      bm25Results: result.stats.bm25_results,
      fusionMethod: result.stats.fusion_method,
      status: 'success'
    }));

    return result;
  } catch (error) {
    // Log error
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      query,
      error: error.message,
      duration: Date.now() - startTime,
      status: 'error'
    }));

    throw error;
  }
}
```

### Scheduled Maintenance

Add to cron or task scheduler:

```bash
# Rebuild BM25 index daily at 3 AM
0 3 * * * cd /path/to/workspace && node skills/rag-hybrid-search/index.js build-index --force
```

Or use Node cron:

```javascript
const cron = require('node-cron');
const { buildBM25Index, initializeVectorDB } = require('./skills/rag-hybrid-search/index.js');

// Rebuild BM25 index daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  console.log('Starting scheduled BM25 index rebuild...');
  try {
    const { table } = await initializeVectorDB();
    await buildBM25Index(table);
    console.log('✓ BM25 index rebuilt successfully');
  } catch (error) {
    console.error('Error rebuilding BM25 index:', error);
  }
});
```

---

## Performance Optimization

### 1. Connection Pooling

Reuse database connections:

```javascript
let cachedConnections = null;

async function getConnections() {
  if (!cachedConnections) {
    const { table } = await initializeVectorDB();
    const bm25Index = await loadBM25Index(table);
    cachedConnections = { table, bm25Index };
  }
  return cachedConnections;
}
```

### 2. Embedding Caching

Cache frequently used query embeddings:

```javascript
const embeddingCache = new Map();

async function getCachedEmbedding(text) {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text);
  }

  const embedding = await generateEmbedding(text);
  embeddingCache.set(text, embedding);

  // Limit cache size
  if (embeddingCache.size > 1000) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }

  return embedding;
}
```

### 3. Batch Processing

Process multiple queries efficiently:

```javascript
async function batchSearch(queries, options) {
  const { table, bm25Index } = await getConnections();

  // Process all in parallel
  return await Promise.all(
    queries.map(q => hybridSearch(table, bm25Index, q, options))
  );
}
```

---

## Testing in Production

### A/B Testing Fusion Methods

```javascript
async function abTestSearch(query) {
  const { table, bm25Index } = await getConnections();

  // Try both methods
  const [rrfResults, weightedResults] = await Promise.all([
    hybridSearch(table, bm25Index, query, { fusionMethod: 'rrf' }),
    hybridSearch(table, bm25Index, query, {
      fusionMethod: 'weighted',
      vectorWeight: 0.6,
      bm25Weight: 0.4
    })
  ]);

  // Compare results
  const comparison = {
    rrf: {
      time: rrfResults.stats.query_time_ms,
      topScore: rrfResults.results[0]?.fused_score || 0,
      count: rrfResults.results.length
    },
    weighted: {
      time: weightedResults.stats.query_time_ms,
      topScore: weightedResults.results[0]?.fused_score || 0,
      count: weightedResults.results.length
    }
  };

  console.log('A/B Test Results:', comparison);

  // Return preferred method (e.g., RRF as default)
  return rrfResults;
}
```

---

## Troubleshooting Production Issues

### Issue: High Latency (>2s queries)

**Diagnosis:**
```javascript
const result = await hybridSearch(table, bm25Index, query, options);
console.log('Stats:', result.stats);
// Check: query_time_ms, vector_results, bm25_results
```

**Solutions:**
1. Reduce candidate limits
2. Enable embedding caching
3. Check network latency to OpenAI
4. Profile BM25 index performance

### Issue: Poor Result Quality

**Diagnosis:**
```bash
# Compare methods
node index.js compare "problematic query"
```

**Solutions:**
1. Try different fusion methods
2. Tune weights (weighted fusion)
3. Check if BM25 index is stale
4. Rebuild index: `build-index --force`

### Issue: Memory Usage Growing

**Cause:** Embedding cache or result cache growing unbounded

**Solution:** Implement LRU cache with size limits

```javascript
class LRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }
}
```

---

## Checklist for Production

- [ ] Episodic memory indexed
- [ ] BM25 index built
- [ ] Environment variables configured
- [ ] Test suite passing
- [ ] Performance benchmarks acceptable (<2s)
- [ ] Monitoring/logging in place
- [ ] Error handling implemented
- [ ] Scheduled maintenance configured
- [ ] Connection pooling enabled
- [ ] Caching strategy implemented
- [ ] A/B testing plan for fusion methods

---

## Next Steps

1. **Integrate into main agent:** Use hybrid search for memory retrieval
2. **Monitor performance:** Track query times and result quality
3. **Tune as needed:** Adjust fusion methods and weights based on usage
4. **Expand testing:** Add domain-specific test cases
5. **Consider enhancements:** Query expansion, reranking, etc.

---

**Ready to deploy?** Follow this checklist and you'll have production-ready hybrid search!
