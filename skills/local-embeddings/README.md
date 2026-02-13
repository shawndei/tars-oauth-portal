# Local Embeddings Skill

🚀 **Generate text embeddings locally without API calls, with automatic OpenAI fallback**

## Quick Install

```bash
cd skills/local-embeddings
npm install
```

## Quick Start

```javascript
import { createEmbeddingService } from './skills/local-embeddings/src/embeddings.js';

const embedder = createEmbeddingService();
await embedder.initialize();

// Single text
const embedding = await embedder.embed("Hello world");

// Multiple texts (batched for performance)
const embeddings = await embedder.embed([
  "First text",
  "Second text",
  "Third text"
]);

// Similarity search
const results = await embedder.findSimilar("AI research", [
  { text: "Machine learning algorithms" },
  { text: "Cooking pasta" },
  { text: "Neural networks" }
], 2);
```

## Features

✅ **Local-first** - Runs on your machine, no API calls needed  
✅ **Fast** - Optimized batch processing for high throughput  
✅ **Reliable** - Auto-fallback to OpenAI when local unavailable  
✅ **Privacy-friendly** - Your data stays on your device  
✅ **Easy to use** - Simple API, works out of the box  
✅ **Well-tested** - Comprehensive test suite included  

## Documentation

- **[SKILL.md](./SKILL.md)** - Complete documentation with examples
- **[tests/test-embeddings.js](./tests/test-embeddings.js)** - Test suite and usage examples

## Test

```bash
npm test
```

## Use Cases

- Semantic search
- Document similarity
- Duplicate detection
- Clustering and classification
- Recommendation systems
- Question answering systems

## Performance

Local embedding generation:
- **Speed:** ~5-20ms per text (batch of 32)
- **Dimensions:** 384 (default model)
- **Quality:** Good for most use cases

OpenAI fallback:
- **Speed:** ~50-200ms per text (depends on network)
- **Dimensions:** 1536 (default model)
- **Quality:** Excellent

## Requirements

- Node.js 18+
- ~100MB disk space (for model cache)
- Optional: OpenAI API key (for fallback)

## License

MIT
