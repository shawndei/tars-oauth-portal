#!/usr/bin/env node
/**
 * Complete RAG Pipeline Example
 * Demonstrates end-to-end usage of hybrid search for question answering
 * 
 * Usage:
 *   node example-rag-pipeline.js "What optimizations were implemented?"
 */

const {
  hybridSearch,
  loadBM25Index,
  initializeVectorDB
} = require('./index.js');

/**
 * Simple RAG implementation without OpenAI (for demonstration)
 * In production, you'd use OpenAI/Anthropic/etc for generation
 */
async function simpleRAG(question) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Question: ${question}`);
  console.log('='.repeat(70));

  try {
    // 1. Initialize search system
    console.log('\n[1/4] Initializing search system...');
    const { table } = await initializeVectorDB();
    const bm25Index = await loadBM25Index(table);
    console.log('✓ Search system ready');

    // 2. Retrieve relevant context using hybrid search
    console.log('\n[2/4] Retrieving relevant context...');
    const searchResult = await hybridSearch(table, bm25Index, question, {
      limit: 5,
      fusionMethod: 'rrf',
      minScore: 0.7
    });

    console.log(`✓ Found ${searchResult.results.length} relevant chunks`);
    console.log(`  Query time: ${searchResult.stats.query_time_ms}ms`);
    console.log(`  Vector results: ${searchResult.stats.vector_results}`);
    console.log(`  BM25 results: ${searchResult.stats.bm25_results}`);

    // 3. Build context from results
    console.log('\n[3/4] Building context...');
    if (searchResult.results.length === 0) {
      console.log('✗ No relevant information found');
      return {
        answer: "I don't have enough information to answer that question.",
        confidence: 0,
        sources: []
      };
    }

    const context = searchResult.results
      .map((r, i) => ({
        number: i + 1,
        source: r.source,
        date: r.date,
        text: r.text,
        scores: {
          fused: r.fused_score.toFixed(3),
          vector: r.vector_score.toFixed(3),
          bm25: r.bm25_score.toFixed(2)
        }
      }));

    console.log('✓ Context built from sources:');
    context.forEach(c => {
      console.log(`  [${c.number}] ${c.source} (date: ${c.date})`);
      console.log(`      Scores - Fused: ${c.scores.fused}, Vector: ${c.scores.vector}, BM25: ${c.scores.bm25}`);
    });

    // 4. Generate answer (simplified - in production use LLM)
    console.log('\n[4/4] Generating answer...');
    
    // For this example, we'll just return the context
    // In production, you'd pass this to GPT-4/Claude/etc
    const answer = `Based on ${context.length} relevant sources, here's the information found:\n\n` +
      context.map(c => 
        `[${c.number}] From ${c.source}:\n${c.text.substring(0, 200)}...`
      ).join('\n\n');

    console.log('✓ Answer generated');

    // Return structured result
    return {
      answer,
      confidence: parseFloat(context[0].scores.fused),
      sources: context,
      stats: searchResult.stats
    };

  } catch (error) {
    console.error('\n✗ Error in RAG pipeline:', error.message);
    throw error;
  }
}

/**
 * Advanced RAG with comparison
 */
async function compareRAGMethods(question) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`COMPARING RAG METHODS`);
  console.log(`Question: ${question}`);
  console.log('='.repeat(70));

  const { table } = await initializeVectorDB();
  const bm25Index = await loadBM25Index(table);

  // Try different fusion methods
  const methods = ['rrf', 'weighted', 'max'];
  const results = {};

  for (const method of methods) {
    console.log(`\nTesting ${method.toUpperCase()} fusion...`);
    
    const options = {
      limit: 5,
      fusionMethod: method
    };

    if (method === 'weighted') {
      options.vectorWeight = 0.6;
      options.bm25Weight = 0.4;
    }

    const result = await hybridSearch(table, bm25Index, question, options);
    
    results[method] = {
      time: result.stats.query_time_ms,
      count: result.results.length,
      topScore: result.results[0]?.fused_score || 0,
      topSource: result.results[0]?.source || 'N/A'
    };

    console.log(`  Time: ${results[method].time}ms`);
    console.log(`  Results: ${results[method].count}`);
    console.log(`  Top score: ${results[method].topScore.toFixed(3)}`);
    console.log(`  Top source: ${results[method].topSource}`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON SUMMARY');
  console.log('='.repeat(70));
  
  const fastest = Object.keys(results).reduce((a, b) => 
    results[a].time < results[b].time ? a : b
  );
  const bestScore = Object.keys(results).reduce((a, b) => 
    results[a].topScore > results[b].topScore ? a : b
  );

  console.log(`Fastest: ${fastest.toUpperCase()} (${results[fastest].time}ms)`);
  console.log(`Best top score: ${bestScore.toUpperCase()} (${results[bestScore].topScore.toFixed(3)})`);
  console.log('\nRecommendation: Use RRF fusion (balanced, no tuning needed)');
}

/**
 * Batch processing example
 */
async function batchRAG(questions) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`BATCH RAG PROCESSING (${questions.length} questions)`);
  console.log('='.repeat(70));

  const { table } = await initializeVectorDB();
  const bm25Index = await loadBM25Index(table);

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < questions.length; i++) {
    console.log(`\n[${i+1}/${questions.length}] ${questions[i]}`);
    
    const result = await hybridSearch(table, bm25Index, questions[i], {
      limit: 3,
      fusionMethod: 'rrf'
    });

    results.push({
      question: questions[i],
      resultsCount: result.results.length,
      queryTime: result.stats.query_time_ms,
      topSource: result.results[0]?.source || 'N/A',
      topScore: result.results[0]?.fused_score || 0
    });

    console.log(`  ✓ Found ${result.results.length} results in ${result.stats.query_time_ms}ms`);
    console.log(`    Top: ${results[i].topSource} (score: ${results[i].topScore.toFixed(3)})`);
  }

  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / questions.length;

  console.log('\n' + '='.repeat(70));
  console.log('BATCH SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total questions: ${questions.length}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Average time per question: ${avgTime.toFixed(0)}ms`);
  console.log(`Throughput: ${(questions.length / (totalTime / 1000)).toFixed(1)} queries/second`);
}

/**
 * Main CLI interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
RAG Pipeline Examples

Usage:
  node example-rag-pipeline.js "Your question here"
  node example-rag-pipeline.js --compare "Your question"
  node example-rag-pipeline.js --batch

Examples:
  node example-rag-pipeline.js "What optimizations were implemented?"
  node example-rag-pipeline.js --compare "How does episodic memory work?"
  node example-rag-pipeline.js --batch

Options:
  --compare    Compare different fusion methods
  --batch      Process multiple example questions
`);
    return;
  }

  try {
    if (args[0] === '--compare') {
      const question = args[1] || 'What optimizations were implemented?';
      await compareRAGMethods(question);
    } else if (args[0] === '--batch') {
      const questions = [
        'What optimizations were implemented?',
        'How does episodic memory work?',
        'What is hybrid search?',
        'What are the benefits of BM25?'
      ];
      await batchRAG(questions);
    } else {
      const question = args.join(' ');
      const result = await simpleRAG(question);

      // Display final answer
      console.log('\n' + '='.repeat(70));
      console.log('ANSWER');
      console.log('='.repeat(70));
      console.log(result.answer);
      
      console.log('\n' + '='.repeat(70));
      console.log('METADATA');
      console.log('='.repeat(70));
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Sources used: ${result.sources.length}`);
      console.log(`Query time: ${result.stats.query_time_ms}ms`);
    }

  } catch (error) {
    console.error('\nError:', error.message);
    if (error.message.includes('OPENAI_API_KEY')) {
      console.log('\nNote: Set OPENAI_API_KEY environment variable to use this example.');
    }
    if (error.message.includes('episodic_memory')) {
      console.log('\nNote: Run "node skills/episodic-memory/index.js index" first.');
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for use as module
module.exports = {
  simpleRAG,
  compareRAGMethods,
  batchRAG
};
