/**
 * Local Embeddings - Usage Examples
 * 
 * Run: node examples.js
 */

import { createEmbeddingService } from './src/embeddings.js';

// Example 1: Basic embedding
async function example1_basic() {
  console.log('\n📝 Example 1: Basic Embedding');
  console.log('─'.repeat(50));
  
  const embedder = createEmbeddingService();
  await embedder.initialize();

  const text = "Hello, this is a test sentence.";
  const embedding = await embedder.embed(text);

  console.log(`Text: "${text}"`);
  console.log(`Embedding dimensions: ${embedding.length}`);
  console.log(`First 5 values: [${embedding.slice(0, 5).map(x => x.toFixed(4)).join(', ')}...]`);
}

// Example 2: Batch processing
async function example2_batch() {
  console.log('\n📦 Example 2: Batch Processing');
  console.log('─'.repeat(50));
  
  const embedder = createEmbeddingService();
  await embedder.initialize();

  const texts = [
    "Machine learning is fascinating",
    "I love cooking Italian food",
    "Artificial intelligence is the future",
    "The weather is sunny today",
    "Deep learning uses neural networks"
  ];

  const start = Date.now();
  const embeddings = await embedder.embed(texts);
  const elapsed = Date.now() - start;

  console.log(`Generated ${embeddings.length} embeddings in ${elapsed}ms`);
  console.log(`Average: ${(elapsed / embeddings.length).toFixed(1)}ms per text`);
}

// Example 3: Semantic similarity
async function example3_similarity() {
  console.log('\n🔍 Example 3: Semantic Similarity');
  console.log('─'.repeat(50));
  
  const embedder = createEmbeddingService();
  await embedder.initialize();

  const pairs = [
    ["cat", "kitten"],
    ["cat", "dog"],
    ["cat", "car"],
    ["happy", "joyful"],
    ["happy", "sad"]
  ];

  for (const [word1, word2] of pairs) {
    const [emb1, emb2] = await embedder.embed([word1, word2]);
    const similarity = embedder.cosineSimilarity(emb1, emb2);
    console.log(`"${word1}" ↔ "${word2}": ${similarity.toFixed(3)}`);
  }
}

// Example 4: Document search
async function example4_search() {
  console.log('\n🔎 Example 4: Document Search');
  console.log('─'.repeat(50));
  
  const embedder = createEmbeddingService();
  await embedder.initialize();

  const documents = [
    "Python is a high-level programming language",
    "Machine learning enables computers to learn from data",
    "The Eiffel Tower is located in Paris, France",
    "Neural networks are inspired by biological neurons",
    "Pasta is a staple food of traditional Italian cuisine",
    "Deep learning is a subset of machine learning",
    "The Great Wall of China is over 13,000 miles long"
  ];

  const queries = [
    "artificial intelligence",
    "European landmarks",
    "Italian food"
  ];

  for (const query of queries) {
    console.log(`\nQuery: "${query}"`);
    
    const results = await embedder.findSimilar(
      query,
      documents.map(text => ({ text })),
      3
    );

    results.forEach((result, i) => {
      console.log(`  ${i + 1}. [${result.similarity.toFixed(3)}] ${result.text}`);
    });
  }
}

// Example 5: Duplicate detection
async function example5_duplicates() {
  console.log('\n👯 Example 5: Duplicate Detection');
  console.log('─'.repeat(50));
  
  const embedder = createEmbeddingService();
  await embedder.initialize();

  const texts = [
    "The quick brown fox jumps over the lazy dog",
    "A fast brown fox leaps over a lazy canine",  // Similar meaning
    "Machine learning is a subset of AI",
    "Python is a programming language",
    "ML is a branch of artificial intelligence"  // Similar meaning
  ];

  const embeddings = await embedder.embed(texts);
  const threshold = 0.7;
  const duplicates = [];

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const similarity = embedder.cosineSimilarity(embeddings[i], embeddings[j]);
      if (similarity > threshold) {
        duplicates.push({
          text1: texts[i],
          text2: texts[j],
          similarity
        });
      }
    }
  }

  console.log(`Found ${duplicates.length} potential duplicates (threshold: ${threshold}):\n`);
  duplicates.forEach(dup => {
    console.log(`Similarity: ${dup.similarity.toFixed(3)}`);
    console.log(`  1: "${dup.text1}"`);
    console.log(`  2: "${dup.text2}"`);
    console.log('');
  });
}

// Example 6: Statistics and monitoring
async function example6_stats() {
  console.log('\n📊 Example 6: Statistics & Monitoring');
  console.log('─'.repeat(50));
  
  const embedder = createEmbeddingService();
  await embedder.initialize();

  // Reset stats
  embedder.resetStats();

  // Do some work
  await embedder.embed("Single text");
  await embedder.embed(["Batch", "of", "three", "texts"]);
  await embedder.embed(Array(10).fill("Test"));

  // Check stats
  const stats = embedder.getStats();
  
  console.log('Performance Statistics:');
  console.log(`  Local calls: ${stats.localCalls}`);
  console.log(`  Remote calls: ${stats.remoteCalls}`);
  console.log(`  Total texts: ${stats.totalTexts}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Avg local time: ${stats.avgLocalTime.toFixed(1)}ms`);
  console.log(`  Local available: ${stats.localAvailable}`);
  console.log(`  Model: ${stats.modelName}`);
}

// Example 7: Recommendation system
async function example7_recommendations() {
  console.log('\n🎯 Example 7: Simple Recommendation System');
  console.log('─'.repeat(50));
  
  const embedder = createEmbeddingService();
  await embedder.initialize();

  // User's reading history
  const userHistory = [
    "Introduction to machine learning algorithms",
    "Deep learning with neural networks"
  ];

  // Available articles
  const articles = [
    "Advanced neural network architectures",
    "Cooking recipes for beginners",
    "Reinforcement learning tutorial",
    "History of ancient Rome",
    "Computer vision with CNNs"
  ];

  console.log('User history:');
  userHistory.forEach(h => console.log(`  - ${h}`));

  // Get embeddings
  const historyEmbs = await embedder.embed(userHistory);
  const articleEmbs = await embedder.embed(articles);

  // Calculate average user interest vector
  const avgHistory = historyEmbs[0].map((_, i) =>
    historyEmbs.reduce((sum, emb) => sum + emb[i], 0) / historyEmbs.length
  );

  // Rank articles
  const recommendations = articles.map((text, i) => ({
    text,
    score: embedder.cosineSimilarity(avgHistory, articleEmbs[i])
  }));

  recommendations.sort((a, b) => b.score - a.score);

  console.log('\nRecommended articles:');
  recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. [${rec.score.toFixed(3)}] ${rec.text}`);
  });
}

// Run all examples
async function runAllExamples() {
  console.log('🚀 Local Embeddings - Usage Examples');
  console.log('═'.repeat(50));

  try {
    await example1_basic();
    await example2_batch();
    await example3_similarity();
    await example4_search();
    await example5_duplicates();
    await example6_stats();
    await example7_recommendations();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running examples:', error.message);
    
    if (error.message.includes('No embedding method available')) {
      console.log('\n💡 Tip: Set OPENAI_API_KEY environment variable to enable fallback');
    }
  }
}

// Run
runAllExamples();
