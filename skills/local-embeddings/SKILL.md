# Local Embeddings Skill

Generate text embeddings locally using Hugging Face transformers, with automatic fallback to OpenAI when local models are unavailable.

## Overview

This skill provides a complete embedding generation solution that:
- ✅ Runs locally without API calls (privacy-friendly)
- ✅ Uses efficient Hugging Face transformers (e.g., all-MiniLM-L6-v2)
- ✅ Optimizes batch processing for performance
- ✅ Automatically falls back to OpenAI when local unavailable
- ✅ Tracks statistics and performance metrics
- ✅ Provides similarity search utilities

## Installation

```bash
cd skills/local-embeddings
npm install
```

**Dependencies:**
- `@xenova/transformers` - Local transformer models (runs in Node.js)
- `openai` - OpenAI API client (for fallback)

## Quick Start

### Basic Usage

```javascript
import { createEmbeddingService } from './skills/local-embeddings/src/embeddings.js';

// Create service instance
const embedder = createEmbeddingService({
  useLocal: true,          // Use local models
  autoFallback: true,      // Fall back to OpenAI if local fails
  openaiApiKey: process.env.OPENAI_API_KEY
});

// Initialize (downloads model on first run)
await embedder.initialize();

// Embed a single text
const embedding = await embedder.embed("Hello world");
console.log(embedding.length); // 384 dimensions

// Embed multiple texts (batched for efficiency)
const embeddings = await embedder.embed([
  "First sentence",
  "Second sentence",
  "Third sentence"
]);
console.log(embeddings.length); // 3
```

### Similarity Search

```javascript
// Find similar documents
const query = "machine learning algorithms";
const corpus = [
  { text: "Neural networks are a type of ML algorithm" },
  { text: "Cooking pasta requires boiling water" },
  { text: "Deep learning is a subset of machine learning" }
];

const results = await embedder.findSimilar(query, corpus, 2);
console.log(results);
// [
//   { text: "Deep learning is...", similarity: 0.89 },
//   { text: "Neural networks...", similarity: 0.82 }
// ]
```

### Calculate Similarity

```javascript
const emb1 = await embedder.embed("cat");
const emb2 = await embedder.embed("kitten");
const emb3 = await embedder.embed("airplane");

console.log(embedder.cosineSimilarity(emb1, emb2)); // ~0.8 (high)
console.log(embedder.cosineSimilarity(emb1, emb3)); // ~0.2 (low)
```

## Configuration Options

```javascript
const embedder = createEmbeddingService({
  // Local model configuration
  modelName: 'Xenova/all-MiniLM-L6-v2',  // Default model
  useLocal: true,                         // Enable local models
  maxBatchSize: 32,                       // Batch size for local processing
  
  // OpenAI fallback configuration
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: 'text-embedding-3-small',  // OpenAI model to use
  autoFallback: true,                     // Auto-fallback to OpenAI
});
```

## Available Models

### Local Models (via Hugging Face)

| Model | Dimensions | Speed | Quality | Use Case |
|-------|-----------|-------|---------|----------|
| `Xenova/all-MiniLM-L6-v2` | 384 | Fast | Good | General purpose (default) |
| `Xenova/all-MiniLM-L12-v2` | 384 | Medium | Better | Higher quality needs |
| `Xenova/paraphrase-multilingual-MiniLM-L12-v2` | 384 | Medium | Good | Multilingual text |
| `Xenova/all-mpnet-base-v2` | 768 | Slower | Best | Highest quality needs |

**Note:** Models are downloaded automatically on first use and cached locally (~100MB per model).

### OpenAI Models (Fallback)

| Model | Dimensions | Cost | Use Case |
|-------|-----------|------|----------|
| `text-embedding-3-small` | 1536 | Low | General purpose (default) |
| `text-embedding-3-large` | 3072 | Medium | Highest quality |
| `text-embedding-ada-002` | 1536 | Low | Legacy support |

## Performance Optimization

### Batch Processing

The service automatically batches requests for efficiency:

```javascript
// Bad: Sequential embedding (slow)
for (const text of texts) {
  const emb = await embedder.embed(text);
  embeddings.push(emb);
}

// Good: Batch embedding (fast)
const embeddings = await embedder.embed(texts);
```

**Performance gains:**
- Local: ~5-10x faster for batches of 32+
- OpenAI: ~2-3x faster due to API batching

### Custom Batch Sizes

```javascript
// Larger batches for better throughput
const embeddings = await embedder.embed(texts, {
  batchSize: 64  // Override default
});
```

**Recommendations:**
- Local: 16-32 for best speed/memory balance
- OpenAI: 100+ (API can handle large batches)

## Statistics and Monitoring

```javascript
// Get performance statistics
const stats = embedder.getStats();
console.log(stats);
// {
//   localCalls: 5,
//   remoteCalls: 2,
//   errors: 0,
//   totalTexts: 350,
//   avgLocalTime: 245,    // ms per call
//   avgRemoteTime: 450,   // ms per call
//   localAvailable: true,
//   modelName: "Xenova/all-MiniLM-L6-v2",
//   openaiModel: "text-embedding-3-small"
// }

// Reset statistics
embedder.resetStats();
```

## Error Handling

The service handles errors gracefully:

```javascript
try {
  const embedding = await embedder.embed("test");
} catch (error) {
  if (error.message.includes('No embedding method available')) {
    // Neither local nor OpenAI available
    console.error('No embedding service available');
  } else if (error.message.includes('Both local and OpenAI embedding failed')) {
    // Both methods failed
    console.error('All embedding methods failed');
  }
}
```

## Use Cases

### 1. Semantic Search

```javascript
// Index documents
const documents = [
  "OpenClaw is an AI automation platform",
  "Embeddings represent text as vectors",
  "Machine learning powers modern AI"
];

const embeddings = await embedder.embed(documents);

// Search
const query = "AI automation tools";
const queryEmb = await embedder.embed(query);

const similarities = embeddings.map((emb, i) => ({
  doc: documents[i],
  score: embedder.cosineSimilarity(queryEmb, emb)
}));

similarities.sort((a, b) => b.score - a.score);
console.log(similarities[0]); // Best match
```

### 2. Duplicate Detection

```javascript
const texts = [
  "The cat sat on the mat",
  "A feline rested on the rug",  // Similar meaning
  "Python is a programming language"
];

const embeddings = await embedder.embed(texts);

// Find duplicates (similarity > 0.8)
for (let i = 0; i < embeddings.length; i++) {
  for (let j = i + 1; j < embeddings.length; j++) {
    const sim = embedder.cosineSimilarity(embeddings[i], embeddings[j]);
    if (sim > 0.8) {
      console.log(`Duplicate: "${texts[i]}" ≈ "${texts[j]}" (${sim.toFixed(2)})`);
    }
  }
}
```

### 3. Clustering and Classification

```javascript
// Cluster documents by similarity
const docs = [/* ... */];
const embeddings = await embedder.embed(docs);

// Use embeddings with clustering algorithms
// (k-means, hierarchical clustering, etc.)
```

### 4. Recommendation Systems

```javascript
// Find similar items
const userHistory = ["sci-fi novels", "space exploration"];
const candidates = [
  "The Martian by Andy Weir",
  "Cooking with herbs",
  "Interstellar travel guide"
];

const historyEmb = await embedder.embed(userHistory);
const candidateEmb = await embedder.embed(candidates);

// Calculate average user interest
const avgHistory = historyEmb[0].map((_, i) => 
  historyEmb.reduce((sum, emb) => sum + emb[i], 0) / historyEmb.length
);

// Rank candidates
const ranked = candidates.map((text, i) => ({
  text,
  score: embedder.cosineSimilarity(avgHistory, candidateEmb[i])
}));

ranked.sort((a, b) => b.score - a.score);
console.log(ranked); // Recommended items
```

## Architecture

### Local Mode (Default)

1. **First run:** Downloads model from Hugging Face (~100MB)
2. **Subsequent runs:** Loads model from cache (~1-2 seconds)
3. **Generation:** Runs locally on CPU (GPU support coming soon)
4. **Privacy:** No data leaves your machine

### Fallback Mode

If local model fails to load (network issues, disk space, etc.):
1. Automatically switches to OpenAI API
2. Logs warning message
3. Continues operation seamlessly

### Hybrid Mode (Recommended)

```javascript
const embedder = createEmbeddingService({
  useLocal: true,       // Try local first
  autoFallback: true,   // Fall back to OpenAI if needed
  openaiApiKey: '...'   // API key for fallback
});
```

**Advantages:**
- Best performance (local is faster for small batches)
- Highest reliability (fallback ensures availability)
- Cost effective (only pays for API when local unavailable)

## Troubleshooting

### Model Download Fails

```
Error: Failed to load local model: NetworkError
```

**Solutions:**
1. Check internet connection (first download requires network)
2. Check disk space (~100MB needed per model)
3. Use OpenAI fallback: `useLocal: false`

### Out of Memory

```
Error: JavaScript heap out of memory
```

**Solutions:**
1. Reduce batch size: `maxBatchSize: 16`
2. Process in smaller chunks
3. Increase Node.js memory: `node --max-old-space-size=4096`

### Slow Performance

**For local embeddings:**
- Use smaller model (all-MiniLM-L6-v2 vs all-mpnet-base-v2)
- Increase batch size (up to 64)
- Use GPU acceleration (future feature)

**For OpenAI fallback:**
- Increase batch size (up to 500)
- Use smaller model (text-embedding-3-small)

## Testing

Run the test suite:

```bash
npm test
```

See `tests/test-embeddings.js` for comprehensive tests including:
- Local vs OpenAI comparison
- Batch processing performance
- Error handling
- Similarity calculations

## Advanced Topics

### Custom Models

You can use any Hugging Face model compatible with `@xenova/transformers`:

```javascript
const embedder = createEmbeddingService({
  modelName: 'Xenova/your-custom-model'
});
```

### Pre-computing Embeddings

For large corpora, pre-compute and cache embeddings:

```javascript
import fs from 'fs';

// Compute once
const texts = [/* large corpus */];
const embeddings = await embedder.embed(texts);

// Save to disk
fs.writeFileSync('embeddings.json', JSON.stringify({
  texts,
  embeddings,
  model: embedder.modelName
}));

// Load later
const cached = JSON.parse(fs.readFileSync('embeddings.json'));
```

### Integration with Vector Databases

```javascript
// Example with a vector database (pseudocode)
const embeddings = await embedder.embed(documents);

for (let i = 0; i < documents.length; i++) {
  await vectorDB.insert({
    id: i,
    text: documents[i],
    embedding: embeddings[i]
  });
}

// Query
const queryEmb = await embedder.embed(query);
const results = await vectorDB.search(queryEmb, { topK: 10 });
```

## API Reference

### `createEmbeddingService(options)`

Creates a new embedding service instance.

**Parameters:**
- `options.modelName` (string): Hugging Face model name
- `options.useLocal` (boolean): Enable local models
- `options.maxBatchSize` (number): Max batch size for local
- `options.openaiApiKey` (string): OpenAI API key
- `options.openaiModel` (string): OpenAI model name
- `options.autoFallback` (boolean): Auto-fallback to OpenAI

**Returns:** `EmbeddingService` instance

### `embedder.initialize()`

Initializes the local model (downloads if needed).

**Returns:** `Promise<boolean>` - true if local model loaded successfully

### `embedder.embed(texts, options)`

Generates embeddings for text(s).

**Parameters:**
- `texts` (string | string[]): Text(s) to embed
- `options.batchSize` (number): Override default batch size
- `options.model` (string): Override OpenAI model (fallback only)

**Returns:** `Promise<Array | Array<Array>>` - Embedding vector(s)

### `embedder.cosineSimilarity(emb1, emb2)`

Calculates cosine similarity between two embeddings.

**Parameters:**
- `emb1` (Array): First embedding vector
- `emb2` (Array): Second embedding vector

**Returns:** `number` - Similarity score (-1 to 1)

### `embedder.findSimilar(query, corpus, topK)`

Finds most similar texts to a query.

**Parameters:**
- `query` (string): Query text
- `corpus` (Array): Array of `{text, embedding?}` objects
- `topK` (number): Number of results to return

**Returns:** `Promise<Array>` - Sorted results with similarity scores

### `embedder.getStats()`

Returns performance statistics.

**Returns:** `Object` - Statistics object

### `embedder.resetStats()`

Resets performance statistics.

## Contributing

To extend this skill:

1. Add new models to the model table
2. Implement GPU acceleration
3. Add distance metrics (Euclidean, Manhattan, etc.)
4. Integrate with vector databases
5. Add dimension reduction (PCA, t-SNE)

## License

MIT

## Support

For issues or questions:
- Check troubleshooting section
- Review test suite for examples
- Open an issue in the repository
