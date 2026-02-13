# RAG Hybrid Search - Usage Examples

Practical examples showing how to use hybrid search for different scenarios.

---

## Example 1: Basic Hybrid Search

**Scenario:** Find documents about optimization work.

```bash
node skills/rag-hybrid-search/index.js search "optimization improvements"
```

**Output:**
```
Searching: "optimization improvements"
Fusion method: rrf

  Vector: 8 results, BM25: 12 results

=== HYBRID SEARCH RESULTS ===

Query time: 847ms
Total candidates: 15
Vector results: 8, BM25 results: 12
Returned: 8 results

1. [MEMORY.md] (fused: 0.034, vec: 0.892, bm25: 8.73)
   ### Phase 3 Optimization — Sub-agent cost routing (93% savings)...

2. [2026-02-12.md] (fused: 0.031, vec: 0.856, bm25: 6.42)
   **Phase 1 Complete:** 7 optimizations implemented...
```

**Why hybrid works better:**
- Finds "optimization" keyword (BM25)
- Understands "improvements" semantically (vector)
- Combines both signals for best ranking

---

## Example 2: Semantic Query (Favor Vector)

**Scenario:** Conceptual query about feelings or abstract concepts.

```bash
node skills/rag-hybrid-search/index.js search "things that make Shawn happy" \
  --fusion=weighted --vector-weight=0.8 --bm25-weight=0.2
```

**Why this works:**
- Abstract concept ("things that make happy") needs semantic understanding
- Vector search captures meaning better than keywords
- BM25 still helps find "Shawn" entity name

**Use weighted fusion with high vector weight (0.8) for:**
- Abstract concepts
- Sentiment/emotion queries
- Paraphrased questions
- Conceptual similarity

---

## Example 3: Keyword Query (Favor BM25)

**Scenario:** Looking for specific phase or version.

```bash
node skills/rag-hybrid-search/index.js search "Phase 1 optimizations" \
  --fusion=weighted --vector-weight=0.3 --bm25-weight=0.7
```

**Why this works:**
- "Phase 1" is a specific identifier (keyword match critical)
- Vector might conflate Phase 1, Phase 2, Phase 3
- BM25 finds exact "Phase 1" occurrences

**Use weighted fusion with high BM25 weight (0.7) for:**
- Version numbers ("v1.0", "Phase 2")
- Entity names ("Shawn", "OpenClaw")
- Technical terms ("BM25", "RRF")
- Codes/IDs ("ticket #1234")

---

## Example 4: Technical Terms

**Scenario:** Find documents about specific technical concepts.

```bash
node skills/rag-hybrid-search/index.js search "LanceDB vector embeddings"
```

**Why hybrid excels:**
- "LanceDB" is a specific term (keyword match)
- "vector embeddings" has semantic meaning
- Hybrid catches both exact terms and related concepts

**Result quality:**
- More precise than vector-only (won't miss "LanceDB" mentions)
- More recall than keyword-only (finds semantic variations)

---

## Example 5: Programmatic RAG Pipeline

**Scenario:** Build a complete question-answering system.

```javascript
const {
  hybridSearch,
  loadBM25Index,
  initializeVectorDB
} = require('./skills/rag-hybrid-search/index.js');
const { OpenAI } = require('openai');

async function answerQuestion(question) {
  // 1. Initialize search
  const { table } = await initializeVectorDB();
  const bm25Index = await loadBM25Index(table);
  const openai = new OpenAI();

  // 2. Retrieve relevant context (hybrid search)
  const searchResult = await hybridSearch(table, bm25Index, question, {
    limit: 5,
    fusionMethod: 'rrf',
    minScore: 0.7
  });

  if (searchResult.results.length === 0) {
    return {
      answer: "I don't have enough information to answer that question.",
      sources: []
    };
  }

  // 3. Build context from top results
  const context = searchResult.results
    .map((r, i) => `[${i+1}] Source: ${r.source}\n${r.text}`)
    .join('\n\n---\n\n');

  // 4. Generate answer using GPT-4
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant. Answer questions based on the provided context. 
                  Cite sources by number (e.g., [1], [2]). If the context doesn't contain 
                  enough information, say so.`
      },
      {
        role: 'user',
        content: `Context:\n\n${context}\n\n---\n\nQuestion: ${question}\n\nAnswer:`
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });

  // 5. Return answer with sources
  return {
    answer: completion.choices[0].message.content,
    sources: searchResult.results.map((r, i) => ({
      number: i + 1,
      source: r.source,
      date: r.date,
      fused_score: r.fused_score,
      vector_score: r.vector_score,
      bm25_score: r.bm25_score,
      text: r.text.substring(0, 200) + '...'
    })),
    stats: searchResult.stats
  };
}

// Example usage
async function main() {
  const questions = [
    "What optimizations were implemented in Phase 1?",
    "How does the episodic memory system work?",
    "What are Shawn's communication preferences?"
  ];

  for (const question of questions) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Q: ${question}`);
    console.log('='.repeat(60));

    const result = await answerQuestion(question);

    console.log(`\nA: ${result.answer}\n`);
    console.log('Sources:');
    result.sources.forEach(s => {
      console.log(`  [${s.number}] ${s.source} (fused: ${s.fused_score.toFixed(3)})`);
      console.log(`      ${s.text}\n`);
    });

    console.log(`Query time: ${result.stats.query_time_ms}ms`);
  }
}

main();
```

**Output:**
```
============================================================
Q: What optimizations were implemented in Phase 1?
============================================================

A: Based on the context, Phase 1 optimizations included:
1. Memory search improvements [1]
2. Model failover capabilities [1]
3. Concurrency enhancements [2]
4. Memory flush optimization [1]
5. Context size optimization [2]

These optimizations resulted in significant performance and cost improvements.

Sources:
  [1] 2026-02-12.md (fused: 0.036)
      **Phase 1 Complete:** 7 optimizations (memory search, model failover, 
      concurrency, memory flush, context optimization...

  [2] MEMORY.md (fused: 0.032)
      ### Phase 1 Optimization — Memory search, model failover, concurrency...

Query time: 891ms
```

---

## Example 6: Comparing Fusion Methods

**Scenario:** Test different fusion strategies to find the best for your query.

```javascript
const {
  hybridSearch,
  loadBM25Index,
  initializeVectorDB
} = require('./skills/rag-hybrid-search/index.js');

async function compareFusionMethods(query) {
  const { table } = await initializeVectorDB();
  const bm25Index = await loadBM25Index(table);

  const fusionMethods = ['rrf', 'weighted', 'max'];
  const results = {};

  for (const method of fusionMethods) {
    const options = {
      limit: 5,
      fusionMethod: method
    };

    if (method === 'weighted') {
      options.vectorWeight = 0.6;
      options.bm25Weight = 0.4;
    }

    results[method] = await hybridSearch(table, bm25Index, query, options);
  }

  // Compare results
  console.log(`\nQuery: "${query}"\n`);
  
  for (const method of fusionMethods) {
    const result = results[method];
    console.log(`${method.toUpperCase()}:`);
    console.log(`  Time: ${result.stats.query_time_ms}ms`);
    console.log(`  Results: ${result.results.length}`);
    console.log(`  Top 3:`);
    
    result.results.slice(0, 3).forEach((r, i) => {
      console.log(`    ${i+1}. [${r.source}] (score: ${r.fused_score.toFixed(3)})`);
    });
    console.log('');
  }
}

// Test with different query types
compareFusionMethods('optimization performance improvements');
compareFusionMethods('Phase 1 specific features');
compareFusionMethods('Shawn personal preferences style');
```

---

## Example 7: Batch RAG Queries

**Scenario:** Process multiple questions efficiently.

```javascript
const {
  hybridSearch,
  loadBM25Index,
  initializeVectorDB
} = require('./skills/rag-hybrid-search/index.js');

async function batchRAGQueries(questions) {
  // Initialize once (reuse across queries)
  const { table } = await initializeVectorDB();
  const bm25Index = await loadBM25Index(table);

  const results = [];

  for (const question of questions) {
    const searchResult = await hybridSearch(table, bm25Index, question, {
      limit: 3,
      fusionMethod: 'rrf'
    });

    results.push({
      question,
      context: searchResult.results.map(r => r.text).join('\n\n'),
      sources: searchResult.results.map(r => r.source),
      query_time: searchResult.stats.query_time_ms
    });
  }

  return results;
}

// Example: FAQ answering
const faqs = [
  "What is episodic memory?",
  "How does hybrid search work?",
  "What are the benefits of BM25?",
  "How to use RAG with OpenClaw?"
];

batchRAGQueries(faqs).then(results => {
  results.forEach(r => {
    console.log(`\nQ: ${r.question}`);
    console.log(`Sources: ${r.sources.join(', ')}`);
    console.log(`Time: ${r.query_time}ms`);
    console.log(`Context preview: ${r.context.substring(0, 100)}...`);
  });
});
```

---

## Example 8: Custom BM25 Scoring

**Scenario:** Tune BM25 parameters for your document collection.

```javascript
const { BM25Index } = require('./skills/rag-hybrid-search/index.js');

// Create custom BM25 index with different parameters
class CustomBM25Index extends BM25Index {
  constructor(k1 = 1.5, b = 0.85) {
    super();
    this.k1 = k1;  // Higher = more weight to term frequency
    this.b = b;    // Higher = more length normalization
  }

  score(doc, queryTerms) {
    let score = 0;

    queryTerms.forEach(term => {
      const tf = doc.termFrequency.get(term) || 0;
      if (tf === 0) return;

      const idf = this.idf(term);
      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (doc.docLength / this.avgDocLength));

      score += idf * (numerator / denominator);
    });

    return score;
  }
}

// Test different parameter combinations
async function tuneBM25() {
  const { initializeVectorDB } = require('./skills/rag-hybrid-search/index.js');
  const { table } = await initializeVectorDB();
  
  const allDocs = await table.toArray();
  const testQuery = 'optimization performance';

  const configurations = [
    { k1: 1.2, b: 0.75, name: 'Default' },
    { k1: 1.5, b: 0.85, name: 'High normalization' },
    { k1: 0.9, b: 0.5, name: 'Low saturation' }
  ];

  for (const config of configurations) {
    const bm25 = new CustomBM25Index(config.k1, config.b);
    bm25.buildIndex(allDocs);
    
    const results = bm25.search(testQuery, 5);
    
    console.log(`\n${config.name} (k1=${config.k1}, b=${config.b}):`);
    console.log(`  Top result score: ${results[0]?.bm25_score.toFixed(3) || 'N/A'}`);
    console.log(`  Total results: ${results.length}`);
  }
}
```

---

## Example 9: Real-time Search with Caching

**Scenario:** Optimize for repeated queries.

```javascript
const {
  hybridSearch,
  loadBM25Index,
  initializeVectorDB,
  generateEmbedding
} = require('./skills/rag-hybrid-search/index.js');

class CachedHybridSearch {
  constructor() {
    this.embeddingCache = new Map();
    this.resultCache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  async initialize() {
    const { table } = await initializeVectorDB();
    const bm25Index = await loadBM25Index(table);
    this.table = table;
    this.bm25Index = bm25Index;
  }

  async search(query, options = {}) {
    const cacheKey = JSON.stringify({ query, options });

    // Check result cache
    if (this.resultCache.has(cacheKey)) {
      this.cacheHits++;
      console.log(`Cache hit! (${this.cacheHits} hits, ${this.cacheMisses} misses)`);
      return this.resultCache.get(cacheKey);
    }

    this.cacheMisses++;

    // Check embedding cache
    let queryEmbedding;
    if (this.embeddingCache.has(query)) {
      queryEmbedding = this.embeddingCache.get(query);
      console.log('Using cached embedding');
    } else {
      queryEmbedding = await generateEmbedding(query);
      this.embeddingCache.set(query, queryEmbedding);
    }

    // Perform search
    const result = await hybridSearch(this.table, this.bm25Index, query, options);

    // Cache result
    this.resultCache.set(cacheKey, result);

    return result;
  }

  clearCache() {
    this.embeddingCache.clear();
    this.resultCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  stats() {
    return {
      embeddingsCached: this.embeddingCache.size,
      resultsCached: this.resultCache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(1) + '%'
    };
  }
}

// Usage
async function main() {
  const search = new CachedHybridSearch();
  await search.initialize();

  // First query (cache miss)
  await search.search('optimization performance');

  // Repeat query (cache hit)
  await search.search('optimization performance');

  // Similar query (embedding cached, but different options)
  await search.search('optimization performance', { limit: 10 });

  console.log('\nCache stats:', search.stats());
}
```

---

## Example 10: Multi-Query Fusion

**Scenario:** Improve recall by searching with multiple query variations.

```javascript
const {
  hybridSearch,
  loadBM25Index,
  initializeVectorDB,
  reciprocalRankFusion
} = require('./skills/rag-hybrid-search/index.js');

async function multiQuerySearch(queries, options = {}) {
  const { table } = await initializeVectorDB();
  const bm25Index = await loadBM25Index(table);

  // Search with each query variation
  const allResults = await Promise.all(
    queries.map(q => hybridSearch(table, bm25Index, q, {
      ...options,
      limit: 20  // Get more candidates per query
    }))
  );

  // Collect all unique documents
  const docMap = new Map();
  allResults.forEach(result => {
    result.results.forEach(r => {
      if (!docMap.has(r.id)) {
        docMap.set(r.id, r);
      }
    });
  });

  // Apply RRF across all query results
  const rankedLists = allResults.map(result => 
    result.results.map(r => ({ id: r.id }))
  );
  const rrfScores = reciprocalRankFusion(rankedLists, 60);

  // Merge RRF scores with documents
  const finalResults = Array.from(docMap.values()).map(doc => ({
    ...doc,
    multi_query_score: rrfScores.get(doc.id) || 0
  }));

  // Sort by multi-query score
  finalResults.sort((a, b) => b.multi_query_score - a.multi_query_score);

  return finalResults.slice(0, options.limit || 8);
}

// Example: Search with query variations
const queryVariations = [
  'optimization improvements performance',
  'speed enhancements efficiency gains',
  'system optimizations speed up'
];

multiQuerySearch(queryVariations, { fusionMethod: 'rrf' })
  .then(results => {
    console.log('\nMulti-query fusion results:');
    results.forEach((r, i) => {
      console.log(`${i+1}. [${r.source}] (score: ${r.multi_query_score.toFixed(3)})`);
      console.log(`   ${r.text.substring(0, 100)}...\n`);
    });
  });
```

---

## Best Practices Summary

### When to Use Each Fusion Method

**RRF (Reciprocal Rank Fusion)** - Default choice
- ✅ Mixed query types
- ✅ Don't want to tune weights
- ✅ Robust and research-backed

**Weighted Fusion** - For specific optimizations
- ✅ Know query characteristics
- ✅ Can A/B test weights
- ✅ Want fine control

**Max Fusion** - Conservative retrieval
- ✅ Diverse queries
- ✅ Don't want to miss results
- ✅ Safety-first approach

### Performance Tips

1. **Reuse connections:** Initialize DB/index once, search many times
2. **Cache embeddings:** Especially for repeated queries
3. **Batch queries:** Process multiple questions together
4. **Limit candidates:** Don't retrieve too many from each source
5. **Monitor query time:** Track and optimize slow queries

### Quality Tips

1. **Use hybrid for RAG:** Almost always better than vector-only
2. **Cite sources:** Always show where information came from
3. **Handle no results:** Gracefully handle when nothing found
4. **Tune for your domain:** Test different fusion methods
5. **Compare regularly:** Benchmark hybrid vs vector-only

---

## More Examples

See also:
- `test.js` - Comprehensive test suite with more examples
- `SKILL.md` - Full documentation
- `README.md` - Quick start guide

---

**Questions?** Check the troubleshooting section in SKILL.md or run the test suite to see everything in action.
