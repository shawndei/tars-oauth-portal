# Integration Guide

How to integrate Local Embeddings skill into OpenClaw agents and other projects.

## For OpenClaw Agents

### 1. Import the Skill

```javascript
import { createEmbeddingService } from './skills/local-embeddings/src/embeddings.js';
```

### 2. Initialize in Agent Setup

```javascript
// In your agent initialization
class MyAgent {
  constructor() {
    this.embedder = createEmbeddingService({
      useLocal: true,
      autoFallback: true,
      openaiApiKey: process.env.OPENAI_API_KEY
    });
  }

  async initialize() {
    await this.embedder.initialize();
    console.log('Embeddings service ready');
  }
}
```

### 3. Use in Agent Tools

#### Tool: Semantic Search

```javascript
async function semanticSearch(query, documents) {
  const results = await this.embedder.findSimilar(
    query,
    documents.map(doc => ({ text: doc })),
    5  // Top 5 results
  );
  
  return results.map(r => ({
    document: r.text,
    relevance: r.similarity
  }));
}
```

#### Tool: Memory Retrieval

```javascript
async function findRelevantMemories(query, memories) {
  // Pre-compute embeddings for memories (cache these)
  if (!memories[0].embedding) {
    const texts = memories.map(m => m.content);
    const embeddings = await this.embedder.embed(texts);
    memories.forEach((m, i) => m.embedding = embeddings[i]);
  }

  // Find relevant memories
  const results = await this.embedder.findSimilar(query, memories, 10);
  return results.filter(r => r.similarity > 0.7);  // Threshold
}
```

#### Tool: Duplicate Detection

```javascript
async function detectDuplicates(newItem, existingItems, threshold = 0.85) {
  const newEmbedding = await this.embedder.embed(newItem);
  const existingEmbeddings = await this.embedder.embed(existingItems);

  const duplicates = [];
  for (let i = 0; i < existingItems.length; i++) {
    const similarity = this.embedder.cosineSimilarity(
      newEmbedding,
      existingEmbeddings[i]
    );
    
    if (similarity > threshold) {
      duplicates.push({
        item: existingItems[i],
        similarity
      });
    }
  }

  return duplicates;
}
```

### 4. Caching Strategy

For large corpora, pre-compute and cache embeddings:

```javascript
import fs from 'fs';

class EmbeddingCache {
  constructor(embedder, cacheFile = 'embeddings-cache.json') {
    this.embedder = embedder;
    this.cacheFile = cacheFile;
    this.cache = this.load();
  }

  load() {
    if (fs.existsSync(this.cacheFile)) {
      return JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
    }
    return { embeddings: {}, model: null };
  }

  save() {
    fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
  }

  async getEmbedding(text) {
    // Check cache
    if (this.cache.embeddings[text] && 
        this.cache.model === this.embedder.modelName) {
      return this.cache.embeddings[text];
    }

    // Generate and cache
    const embedding = await this.embedder.embed(text);
    this.cache.embeddings[text] = embedding;
    this.cache.model = this.embedder.modelName;
    this.save();

    return embedding;
  }

  async getEmbeddings(texts) {
    const results = [];
    const toCompute = [];
    const toComputeIndices = [];

    // Check what's cached
    for (let i = 0; i < texts.length; i++) {
      if (this.cache.embeddings[texts[i]] && 
          this.cache.model === this.embedder.modelName) {
        results[i] = this.cache.embeddings[texts[i]];
      } else {
        toCompute.push(texts[i]);
        toComputeIndices.push(i);
      }
    }

    // Compute missing
    if (toCompute.length > 0) {
      const newEmbeddings = await this.embedder.embed(toCompute);
      for (let i = 0; i < toCompute.length; i++) {
        const text = toCompute[i];
        const embedding = newEmbeddings[i];
        this.cache.embeddings[text] = embedding;
        results[toComputeIndices[i]] = embedding;
      }
      this.cache.model = this.embedder.modelName;
      this.save();
    }

    return results;
  }

  clear() {
    this.cache = { embeddings: {}, model: null };
    this.save();
  }
}

// Usage
const cache = new EmbeddingCache(embedder);
const embedding = await cache.getEmbedding("text to embed");
```

## Integration Patterns

### Pattern 1: RAG (Retrieval-Augmented Generation)

```javascript
async function rag(question, knowledgeBase) {
  // 1. Find relevant documents
  const relevant = await embedder.findSimilar(
    question,
    knowledgeBase.map(doc => ({ text: doc.content, ...doc })),
    5
  );

  // 2. Build context from top results
  const context = relevant
    .map(r => r.text)
    .join('\n\n---\n\n');

  // 3. Generate answer with LLM using context
  const answer = await llm.generate({
    prompt: `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer:`,
    temperature: 0.7
  });

  return {
    answer,
    sources: relevant.map(r => ({ text: r.text, relevance: r.similarity }))
  };
}
```

### Pattern 2: Incremental Indexing

```javascript
class IncrementalIndex {
  constructor(embedder) {
    this.embedder = embedder;
    this.documents = [];
    this.embeddings = [];
  }

  async add(document) {
    const embedding = await this.embedder.embed(document.text);
    this.documents.push(document);
    this.embeddings.push(embedding);
  }

  async addBatch(documents) {
    const embeddings = await this.embedder.embed(
      documents.map(d => d.text)
    );
    this.documents.push(...documents);
    this.embeddings.push(...embeddings);
  }

  async search(query, topK = 5) {
    const queryEmb = await this.embedder.embed(query);
    
    const results = this.documents.map((doc, i) => ({
      ...doc,
      similarity: this.embedder.cosineSimilarity(queryEmb, this.embeddings[i])
    }));

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  save(filepath) {
    fs.writeFileSync(filepath, JSON.stringify({
      documents: this.documents,
      embeddings: this.embeddings,
      model: this.embedder.modelName
    }));
  }

  load(filepath) {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    this.documents = data.documents;
    this.embeddings = data.embeddings;
    
    if (data.model !== this.embedder.modelName) {
      console.warn('Loaded embeddings from different model:', data.model);
    }
  }
}
```

### Pattern 3: Multi-language Support

```javascript
// Use multilingual model
const multilingualEmbedder = createEmbeddingService({
  modelName: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
  useLocal: true
});

await multilingualEmbedder.initialize();

// Now works across languages
const query = "hello";  // English
const corpus = [
  { text: "bonjour", lang: "fr" },
  { text: "hola", lang: "es" },
  { text: "hello", lang: "en" },
  { text: "ciao", lang: "it" }
];

const results = await multilingualEmbedder.findSimilar(query, corpus, 4);
// Returns similar greetings across languages
```

## Performance Tips

### 1. Batch Everything

```javascript
// ❌ Slow: One at a time
for (const text of texts) {
  await embedder.embed(text);
}

// ✅ Fast: Batch processing
await embedder.embed(texts);
```

### 2. Pre-compute Static Embeddings

```javascript
// At startup, embed static content once
const staticDocs = loadDocuments();
const staticEmbeddings = await embedder.embed(staticDocs.map(d => d.text));

// Store for later use
staticDocs.forEach((doc, i) => {
  doc.embedding = staticEmbeddings[i];
});
```

### 3. Use Appropriate Batch Sizes

```javascript
// For local models (limited by RAM)
const embeddings = await embedder.embed(largeTextArray, {
  batchSize: 32  // Adjust based on available memory
});

// For OpenAI (limited by API rate limits)
const embeddings = await embedder.embed(largeTextArray, {
  batchSize: 100  // Higher is fine for API
});
```

### 4. Monitor Performance

```javascript
// Check stats periodically
setInterval(() => {
  const stats = embedder.getStats();
  console.log(`Embeddings: ${stats.totalTexts} texts, ` +
              `${stats.localCalls} local, ${stats.remoteCalls} remote, ` +
              `${stats.avgLocalTime.toFixed(0)}ms avg`);
}, 60000);  // Every minute
```

## Environment Configuration

### .env File

```bash
# OpenAI fallback (optional but recommended)
OPENAI_API_KEY=sk-...

# Model selection (optional)
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Performance tuning (optional)
EMBEDDING_BATCH_SIZE=32
EMBEDDING_USE_LOCAL=true
EMBEDDING_AUTO_FALLBACK=true
```

### Loading Configuration

```javascript
import dotenv from 'dotenv';
dotenv.config();

const embedder = createEmbeddingService({
  modelName: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
  useLocal: process.env.EMBEDDING_USE_LOCAL !== 'false',
  autoFallback: process.env.EMBEDDING_AUTO_FALLBACK !== 'false',
  maxBatchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '32'),
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
});
```

## Testing Integration

```javascript
// integration-test.js
import { createEmbeddingService } from './skills/local-embeddings/src/embeddings.js';

async function testIntegration() {
  const embedder = createEmbeddingService();
  await embedder.initialize();

  // Test basic functionality
  const embedding = await embedder.embed("test");
  console.assert(Array.isArray(embedding), 'Should return array');
  console.assert(embedding.length > 0, 'Should have dimensions');

  console.log('✅ Integration test passed');
}

testIntegration();
```

## Troubleshooting

### Model Not Loading

If local model fails to load:

1. Check internet connection (first download)
2. Check disk space (~100MB needed)
3. Verify Node.js version (18+)
4. Check logs for specific error
5. Use OpenAI fallback as backup

### Memory Issues

If running out of memory:

1. Reduce batch size: `maxBatchSize: 16`
2. Process in smaller chunks
3. Clear embeddings cache periodically
4. Increase Node.js heap: `node --max-old-space-size=4096`

### Performance Problems

If embeddings are slow:

1. Use smaller model (all-MiniLM-L6-v2)
2. Increase batch size
3. Pre-compute static embeddings
4. Cache frequently-used embeddings
5. Consider GPU acceleration (future)

## Support

For issues or questions:
- Review [SKILL.md](./SKILL.md) documentation
- Check [examples.js](./examples.js) for usage patterns
- Run test suite: `npm test`
- Review test source for advanced examples
