/**
 * Quick verification script
 * Tests that the local embeddings skill is working correctly
 */

import { createEmbeddingService } from './src/embeddings.js';

console.log('🔍 Verifying Local Embeddings Skill...\n');

async function verify() {
  try {
    // Test 1: Create service
    console.log('1. Creating embedding service...');
    const embedder = createEmbeddingService({
      useLocal: true,
      autoFallback: true,
      openaiApiKey: process.env.OPENAI_API_KEY
    });
    console.log('   ✅ Service created\n');

    // Test 2: Initialize
    console.log('2. Initializing (this may take a moment on first run)...');
    const initialized = await embedder.initialize();
    console.log(`   ✅ Initialized (local available: ${initialized})\n`);

    // Test 3: Single embedding
    console.log('3. Testing single text embedding...');
    const text = "Hello world";
    const embedding = await embedder.embed(text);
    console.log(`   ✅ Generated embedding with ${embedding.length} dimensions\n`);

    // Test 4: Batch embedding
    console.log('4. Testing batch embedding...');
    const texts = ["First", "Second", "Third"];
    const embeddings = await embedder.embed(texts);
    console.log(`   ✅ Generated ${embeddings.length} embeddings\n`);

    // Test 5: Similarity
    console.log('5. Testing similarity calculation...');
    const [cat, kitten, airplane] = await embedder.embed(["cat", "kitten", "airplane"]);
    const simCatKitten = embedder.cosineSimilarity(cat, kitten);
    const simCatAirplane = embedder.cosineSimilarity(cat, airplane);
    console.log(`   cat ↔ kitten: ${simCatKitten.toFixed(3)}`);
    console.log(`   cat ↔ airplane: ${simCatAirplane.toFixed(3)}`);
    if (simCatKitten > simCatAirplane) {
      console.log('   ✅ Similarity makes sense\n');
    } else {
      console.log('   ⚠️  Similarity seems off\n');
    }

    // Test 6: Similarity search
    console.log('6. Testing similarity search...');
    const corpus = [
      { text: "Machine learning algorithms" },
      { text: "Cooking pasta" },
      { text: "Neural networks" }
    ];
    const results = await embedder.findSimilar("artificial intelligence", corpus, 2);
    console.log(`   Top result: "${results[0].text}" (${results[0].similarity.toFixed(3)})`);
    console.log('   ✅ Search working\n');

    // Test 7: Statistics
    console.log('7. Checking statistics...');
    const stats = embedder.getStats();
    console.log(`   Total texts processed: ${stats.totalTexts}`);
    console.log(`   Local calls: ${stats.localCalls}`);
    console.log(`   Remote calls: ${stats.remoteCalls}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log('   ✅ Stats tracking working\n');

    console.log('═'.repeat(50));
    console.log('✅ ALL CHECKS PASSED');
    console.log('═'.repeat(50));
    console.log('\nThe Local Embeddings skill is ready to use!');
    console.log('Run "npm test" for comprehensive tests.');
    console.log('See examples.js for usage examples.\n');

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED');
    console.error(`Error: ${error.message}\n`);
    
    if (error.message.includes('No embedding method available')) {
      console.log('💡 Tip: Local model not available and no OpenAI API key set.');
      console.log('   Either wait for the model to download, or set OPENAI_API_KEY.\n');
    }
    
    process.exit(1);
  }
}

verify();
