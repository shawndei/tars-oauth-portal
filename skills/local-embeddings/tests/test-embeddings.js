/**
 * Test Suite for Local Embeddings Skill
 * Comprehensive tests comparing local vs OpenAI embeddings
 */

import { createEmbeddingService } from '../src/embeddings.js';

// Test configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RUN_OPENAI_TESTS = !!OPENAI_API_KEY;

// Test utilities
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, fn) {
    try {
      console.log(`\n🧪 ${name}`);
      await fn();
      console.log(`   ✅ PASSED`);
      this.passed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      this.failed++;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertApprox(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
      throw new Error(message || `Expected ${actual} to be within ${tolerance} of ${expected}`);
    }
  }

  summary() {
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Summary: ${this.passed} passed, ${this.failed} failed`);
    console.log('='.repeat(50));
    return this.failed === 0;
  }
}

// Main test suite
async function runTests() {
  const runner = new TestRunner();

  console.log('🚀 Starting Local Embeddings Test Suite\n');

  // Test 1: Service initialization
  await runner.test('Service initialization - local only', async () => {
    const embedder = createEmbeddingService({ useLocal: true });
    runner.assert(embedder !== null, 'Service should be created');
    
    const initialized = await embedder.initialize();
    console.log(`   Local model available: ${initialized}`);
    
    if (!initialized) {
      console.log('   ⚠️  Local model not available, some tests will be skipped');
    }
  });

  // Test 2: Single text embedding (local)
  await runner.test('Single text embedding - local', async () => {
    const embedder = createEmbeddingService({ useLocal: true });
    await embedder.initialize();
    
    if (!embedder.localAvailable) {
      console.log('   ⏭️  Skipped (local model not available)');
      return;
    }

    const embedding = await embedder.embed("Hello world");
    
    runner.assert(Array.isArray(embedding), 'Should return an array');
    runner.assert(embedding.length === 384, 'Should have 384 dimensions');
    runner.assert(embedding.every(x => typeof x === 'number'), 'All values should be numbers');
    
    console.log(`   Embedding dimension: ${embedding.length}`);
  });

  // Test 3: Batch embedding (local)
  await runner.test('Batch embedding - local', async () => {
    const embedder = createEmbeddingService({ useLocal: true });
    await embedder.initialize();
    
    if (!embedder.localAvailable) {
      console.log('   ⏭️  Skipped (local model not available)');
      return;
    }

    const texts = [
      "First sentence",
      "Second sentence",
      "Third sentence",
      "Fourth sentence"
    ];

    const embeddings = await embedder.embed(texts);
    
    runner.assert(Array.isArray(embeddings), 'Should return an array');
    runner.assert(embeddings.length === 4, 'Should return 4 embeddings');
    runner.assert(embeddings.every(e => Array.isArray(e) && e.length === 384), 
      'Each embedding should have 384 dimensions');
    
    console.log(`   Generated ${embeddings.length} embeddings`);
  });

  // Test 4: Batch processing performance (local)
  await runner.test('Batch processing performance - local', async () => {
    const embedder = createEmbeddingService({ 
      useLocal: true,
      maxBatchSize: 16 
    });
    await embedder.initialize();
    
    if (!embedder.localAvailable) {
      console.log('   ⏭️  Skipped (local model not available)');
      return;
    }

    const texts = Array(50).fill(0).map((_, i) => `Test sentence number ${i}`);
    
    const start = Date.now();
    const embeddings = await embedder.embed(texts);
    const elapsed = Date.now() - start;
    
    runner.assert(embeddings.length === 50, 'Should return 50 embeddings');
    console.log(`   Generated 50 embeddings in ${elapsed}ms (${(elapsed/50).toFixed(1)}ms per text)`);
  });

  // Test 5: Cosine similarity
  await runner.test('Cosine similarity calculation', async () => {
    const embedder = createEmbeddingService({ useLocal: true });
    await embedder.initialize();
    
    if (!embedder.localAvailable) {
      console.log('   ⏭️  Skipped (local model not available)');
      return;
    }

    const embeddings = await embedder.embed([
      "cat",
      "kitten",
      "dog",
      "airplane"
    ]);

    const catKitten = embedder.cosineSimilarity(embeddings[0], embeddings[1]);
    const catDog = embedder.cosineSimilarity(embeddings[0], embeddings[2]);
    const catAirplane = embedder.cosineSimilarity(embeddings[0], embeddings[3]);

    console.log(`   cat ↔ kitten: ${catKitten.toFixed(3)}`);
    console.log(`   cat ↔ dog: ${catDog.toFixed(3)}`);
    console.log(`   cat ↔ airplane: ${catAirplane.toFixed(3)}`);

    runner.assert(catKitten > catDog, 'cat should be more similar to kitten than dog');
    runner.assert(catDog > catAirplane, 'cat should be more similar to dog than airplane');
    runner.assert(catKitten > 0.5, 'cat-kitten similarity should be > 0.5');
  });

  // Test 6: Similarity search
  await runner.test('Similarity search', async () => {
    const embedder = createEmbeddingService({ useLocal: true });
    await embedder.initialize();
    
    if (!embedder.localAvailable) {
      console.log('   ⏭️  Skipped (local model not available)');
      return;
    }

    const corpus = [
      { text: "Machine learning is a subset of artificial intelligence" },
      { text: "Cooking pasta requires boiling water" },
      { text: "Neural networks are used in deep learning" },
      { text: "The weather is sunny today" },
      { text: "AI algorithms can learn from data" }
    ];

    const query = "artificial intelligence and neural networks";
    const results = await embedder.findSimilar(query, corpus, 3);

    runner.assert(results.length === 3, 'Should return 3 results');
    runner.assert(results[0].similarity > results[1].similarity, 'Results should be sorted');
    runner.assert(results[0].similarity > results[2].similarity, 'Results should be sorted');

    console.log(`   Top result: "${results[0].text}" (${results[0].similarity.toFixed(3)})`);
    console.log(`   Expected ML/AI related content in top results`);
  });

  // Test 7: Statistics tracking
  await runner.test('Statistics tracking', async () => {
    const embedder = createEmbeddingService({ useLocal: true });
    await embedder.initialize();
    
    if (!embedder.localAvailable) {
      console.log('   ⏭️  Skipped (local model not available)');
      return;
    }

    embedder.resetStats();
    
    await embedder.embed("test 1");
    await embedder.embed(["test 2", "test 3"]);
    
    const stats = embedder.getStats();
    
    runner.assert(stats.localCalls === 2, 'Should have 2 local calls');
    runner.assert(stats.totalTexts === 3, 'Should have processed 3 texts');
    runner.assert(stats.errors === 0, 'Should have no errors');
    runner.assert(stats.localAvailable === true, 'Local should be available');

    console.log(`   Stats: ${stats.localCalls} calls, ${stats.totalTexts} texts, ${stats.avgLocalTime.toFixed(0)}ms avg`);
  });

  // OpenAI Tests (only if API key available)
  if (RUN_OPENAI_TESTS) {
    console.log('\n📡 Running OpenAI integration tests...');

    // Test 8: OpenAI embedding
    await runner.test('OpenAI embedding', async () => {
      const embedder = createEmbeddingService({
        useLocal: false,
        openaiApiKey: OPENAI_API_KEY
      });

      const embedding = await embedder.embed("Hello world");
      
      runner.assert(Array.isArray(embedding), 'Should return an array');
      runner.assert(embedding.length === 1536, 'Should have 1536 dimensions (OpenAI default)');
      
      console.log(`   OpenAI embedding dimension: ${embedding.length}`);
    });

    // Test 9: OpenAI batch embedding
    await runner.test('OpenAI batch embedding', async () => {
      const embedder = createEmbeddingService({
        useLocal: false,
        openaiApiKey: OPENAI_API_KEY
      });

      const texts = ["First", "Second", "Third"];
      const embeddings = await embedder.embed(texts);
      
      runner.assert(embeddings.length === 3, 'Should return 3 embeddings');
      runner.assert(embeddings.every(e => e.length === 1536), 'Each should have 1536 dimensions');
      
      console.log(`   Generated ${embeddings.length} OpenAI embeddings`);
    });

    // Test 10: Automatic fallback
    await runner.test('Automatic fallback to OpenAI', async () => {
      const embedder = createEmbeddingService({
        useLocal: true,
        autoFallback: true,
        openaiApiKey: OPENAI_API_KEY,
        modelName: 'Xenova/nonexistent-model' // Force local to fail
      });

      await embedder.initialize();
      
      // Should fall back to OpenAI
      const embedding = await embedder.embed("Fallback test");
      
      runner.assert(Array.isArray(embedding), 'Should return an array via fallback');
      runner.assert(embedding.length === 1536, 'Should use OpenAI (1536 dimensions)');
      
      const stats = embedder.getStats();
      runner.assert(stats.remoteCalls > 0, 'Should have used remote (OpenAI) calls');
      
      console.log(`   Successfully fell back to OpenAI`);
    });

    // Test 11: Local vs OpenAI comparison
    await runner.test('Local vs OpenAI comparison', async () => {
      const localEmbedder = createEmbeddingService({ useLocal: true });
      await localEmbedder.initialize();
      
      const openaiEmbedder = createEmbeddingService({
        useLocal: false,
        openaiApiKey: OPENAI_API_KEY
      });

      const testTexts = [
        "Machine learning",
        "Artificial intelligence",
        "Cooking recipes"
      ];

      if (!localEmbedder.localAvailable) {
        console.log('   ⏭️  Skipped (local model not available)');
        return;
      }

      // Time local
      const localStart = Date.now();
      const localEmbs = await localEmbedder.embed(testTexts);
      const localTime = Date.now() - localStart;

      // Time OpenAI
      const openaiStart = Date.now();
      const openaiEmbs = await openaiEmbedder.embed(testTexts);
      const openaiTime = Date.now() - openaiStart;

      console.log(`   Local: ${localTime}ms (${localEmbs[0].length}d)`);
      console.log(`   OpenAI: ${openaiTime}ms (${openaiEmbs[0].length}d)`);

      // Compare semantic similarity preservation
      // Both should show ML and AI are more similar than to cooking
      const localMLAI = localEmbedder.cosineSimilarity(localEmbs[0], localEmbs[1]);
      const localMLCooking = localEmbedder.cosineSimilarity(localEmbs[0], localEmbs[2]);
      
      const openaiMLAI = openaiEmbedder.cosineSimilarity(openaiEmbs[0], openaiEmbs[1]);
      const openaiMLCooking = openaiEmbedder.cosineSimilarity(openaiEmbs[0], openaiEmbs[2]);

      console.log(`   Local: ML↔AI=${localMLAI.toFixed(3)}, ML↔Cooking=${localMLCooking.toFixed(3)}`);
      console.log(`   OpenAI: ML↔AI=${openaiMLAI.toFixed(3)}, ML↔Cooking=${openaiMLCooking.toFixed(3)}`);

      runner.assert(localMLAI > localMLCooking, 'Local: ML should be closer to AI');
      runner.assert(openaiMLAI > openaiMLCooking, 'OpenAI: ML should be closer to AI');
    });

  } else {
    console.log('\n⚠️  OpenAI tests skipped (no API key)');
    console.log('   Set OPENAI_API_KEY environment variable to run OpenAI tests');
  }

  // Test 12: Error handling
  await runner.test('Error handling - no service available', async () => {
    const embedder = createEmbeddingService({
      useLocal: false,  // Disable local
      autoFallback: false,  // Disable fallback
      openaiApiKey: null  // No API key
    });

    try {
      await embedder.embed("This should fail");
      throw new Error('Should have thrown an error');
    } catch (error) {
      runner.assert(
        error.message.includes('No embedding method available'),
        'Should throw "No embedding method available" error'
      );
      console.log(`   Correctly caught error: ${error.message}`);
    }
  });

  // Test 13: Empty input handling
  await runner.test('Empty input handling', async () => {
    const embedder = createEmbeddingService({ useLocal: true });
    await embedder.initialize();
    
    if (!embedder.localAvailable) {
      console.log('   ⏭️  Skipped (local model not available)');
      return;
    }

    const result = await embedder.embed([]);
    runner.assert(Array.isArray(result) && result.length === 0, 
      'Empty array should return empty array');
    
    console.log('   Empty input handled correctly');
  });

  // Test 14: Large batch processing
  await runner.test('Large batch processing (100 texts)', async () => {
    const embedder = createEmbeddingService({ 
      useLocal: true,
      maxBatchSize: 32
    });
    await embedder.initialize();
    
    if (!embedder.localAvailable) {
      console.log('   ⏭️  Skipped (local model not available)');
      return;
    }

    const texts = Array(100).fill(0).map((_, i) => 
      `This is test sentence number ${i} with varying content and length to simulate real usage.`
    );

    const start = Date.now();
    const embeddings = await embedder.embed(texts);
    const elapsed = Date.now() - start;

    runner.assert(embeddings.length === 100, 'Should return 100 embeddings');
    console.log(`   Processed 100 texts in ${elapsed}ms (${(elapsed/100).toFixed(1)}ms per text)`);
    console.log(`   Throughput: ${(100000/elapsed).toFixed(0)} texts/second`);
  });

  // Test 15: Similarity with pre-computed embeddings
  await runner.test('Similarity search with pre-computed embeddings', async () => {
    const embedder = createEmbeddingService({ useLocal: true });
    await embedder.initialize();
    
    if (!embedder.localAvailable) {
      console.log('   ⏭️  Skipped (local model not available)');
      return;
    }

    // Pre-compute corpus embeddings
    const texts = ["apple", "banana", "car", "train"];
    const embeddings = await embedder.embed(texts);

    const corpus = texts.map((text, i) => ({
      text,
      embedding: embeddings[i]
    }));

    // Search should not re-compute embeddings
    const query = "fruit";
    const results = await embedder.findSimilar(query, corpus, 2);

    runner.assert(results.length === 2, 'Should return 2 results');
    console.log(`   Top: "${results[0].text}" (${results[0].similarity.toFixed(3)})`);
    console.log(`   2nd: "${results[1].text}" (${results[1].similarity.toFixed(3)})`);
  });

  // Summary
  return runner.summary();
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  });
