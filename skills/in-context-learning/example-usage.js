/**
 * In-Context Learning - Practical Usage Example
 * 
 * This example demonstrates how to use the in-context learning system
 * in a real-world scenario.
 */

const { InContextAdapter } = require('./index');

async function main() {
  console.log('='.repeat(60));
  console.log('In-Context Learning - Practical Example');
  console.log('='.repeat(60));

  // Initialize the adapter
  console.log('\n1. Initializing adapter...');
  const adapter = new InContextAdapter({
    strategy: 'semantic',
    maxExamples: 3
  });
  await adapter.initialize();
  console.log('✓ Adapter initialized');

  // Add custom examples for a specific use case
  console.log('\n2. Adding custom examples for "api-documentation" use case...');
  
  await adapter.addExample({
    input: 'Document this function: getUserById(id)',
    output: '```\ngetUserById(id: string): Promise<User>\n\nFetches a user by their unique ID.\n\nParameters:\n- id: User unique identifier\n\nReturns: Promise resolving to User object\n\nThrows: UserNotFoundError if user doesn\'t exist\n```',
    useCase: 'api-documentation',
    tags: ['function', 'async', 'documentation']
  });

  await adapter.addExample({
    input: 'Document this API endpoint: POST /users',
    output: '```\nPOST /users\n\nCreates a new user account.\n\nRequest Body:\n- email: string (required)\n- name: string (required)\n- password: string (required, min 8 chars)\n\nResponse: 201 Created\n- userId: string\n- email: string\n- name: string\n\nErrors:\n- 400: Invalid input\n- 409: Email already exists\n```',
    useCase: 'api-documentation',
    tags: ['api', 'rest', 'documentation']
  });

  console.log('✓ Added 2 examples');

  // Use case 1: Code explanation with few-shot learning
  console.log('\n3. Example 1: Code Explanation');
  console.log('-'.repeat(60));
  
  const codeQuery = 'Explain what Promise.race() does in JavaScript';
  console.log(`Query: "${codeQuery}"`);
  
  const codeResult = await adapter.adapt(codeQuery, {
    useCase: 'code-explanation',
    strategy: 'semantic',
    maxExamples: 2
  });

  console.log(`\nSelected ${codeResult.examples.length} examples using "${codeResult.metadata.strategy}" strategy:`);
  codeResult.examples.forEach((ex, idx) => {
    console.log(`  ${idx + 1}. ${ex.input.substring(0, 50)}...`);
  });

  console.log('\nConstructed Prompt (first 300 chars):');
  console.log(codeResult.prompt.substring(0, 300) + '...\n');

  // Record feedback
  await adapter.recordFeedback(codeResult.metadata.requestId, {
    success: true,
    quality: 0.9,
    notes: 'Great examples provided'
  });

  // Use case 2: API documentation with conversational format
  console.log('\n4. Example 2: API Documentation (Conversational Format)');
  console.log('-'.repeat(60));
  
  const apiQuery = 'Document this function: async deleteUser(userId)';
  console.log(`Query: "${apiQuery}"`);
  
  const apiResult = await adapter.adapt(apiQuery, {
    useCase: 'api-documentation',
    strategy: 'hybrid',
    format: 'conversational',
    maxExamples: 2,
    weights: {
      semantic: 0.6,
      keyword: 0.3,
      performance: 0.1
    }
  });

  console.log(`\nSelected ${apiResult.examples.length} examples using hybrid strategy`);
  console.log('\nConstructed Prompt (conversational format):');
  console.log(apiResult.prompt.substring(0, 400) + '...\n');

  await adapter.recordFeedback(apiResult.metadata.requestId, {
    success: true,
    quality: 0.95
  });

  // Use case 3: Compare different strategies
  console.log('\n5. Strategy Comparison');
  console.log('-'.repeat(60));
  
  const testQuery = 'Explain JavaScript arrow functions';
  console.log(`Query: "${testQuery}"\n`);

  const strategies = ['random', 'recent', 'semantic', 'keyword'];
  
  for (const strategy of strategies) {
    const result = await adapter.adapt(testQuery, {
      useCase: 'code-explanation',
      strategy,
      maxExamples: 3
    });
    
    console.log(`  ${strategy.padEnd(12)}: ${result.examples.length} examples selected`);
    
    // Record some feedback
    await adapter.recordFeedback(result.metadata.requestId, {
      success: Math.random() > 0.3, // Simulate varied success
      quality: 0.7 + Math.random() * 0.3
    });
  }

  // Get performance statistics
  console.log('\n6. Performance Statistics');
  console.log('-'.repeat(60));
  
  const stats = await adapter.getStats('code-explanation');
  console.log('\nCode Explanation Use Case:');
  console.log(`  Total Requests: ${stats.totalRequests}`);
  console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`  Avg Examples Used: ${stats.avgExamples.toFixed(1)}`);
  
  if (stats.recent) {
    console.log(`\nRecent Performance (last ${stats.recent.requests} requests):`);
    console.log(`  Success Rate: ${(stats.recent.successRate * 100).toFixed(1)}%`);
    console.log(`  Avg Examples: ${stats.recent.avgExamples.toFixed(1)}`);
  }

  // Strategy comparison
  console.log('\n7. Strategy Performance Comparison');
  console.log('-'.repeat(60));
  
  const comparison = adapter.tracker.getStrategyComparison();
  console.log();
  Object.entries(comparison).forEach(([strategy, data]) => {
    console.log(`  ${strategy.padEnd(12)}: ${data.totalRequests} requests, ${(data.successRate * 100).toFixed(1)}% success`);
  });

  // Library statistics
  console.log('\n8. Example Library Statistics');
  console.log('-'.repeat(60));
  
  const libStats = adapter.library.getStats();
  console.log(`\nTotal Examples: ${libStats.totalExamples}`);
  console.log('\nExamples by Use Case:');
  Object.entries(libStats.useCases).forEach(([useCase, data]) => {
    console.log(`  ${useCase}: ${data.count} examples`);
  });

  // Save state
  console.log('\n9. Saving adapter state...');
  await adapter.save();
  console.log('✓ State saved to disk');

  // Export tracking data
  console.log('\n10. Exporting tracking data for analysis...');
  const exportData = adapter.tracker.exportData();
  console.log(`✓ Exported ${exportData.requests.length} requests, ${exportData.useCaseCount} use cases, ${exportData.strategyCount} strategies`);

  console.log('\n' + '='.repeat(60));
  console.log('Example completed successfully!');
  console.log('='.repeat(60));
  console.log('\nKey Takeaways:');
  console.log('• In-context learning improves model performance with examples');
  console.log('• Multiple strategies available for different use cases');
  console.log('• Performance tracking enables data-driven optimization');
  console.log('• Example library grows and improves over time');
  console.log('• Feedback loop ensures continuous improvement');
  console.log();
}

// Run the example
if (require.main === module) {
  main()
    .then(() => {
      console.log('✓ Example execution complete\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('✗ Error:', error);
      process.exit(1);
    });
}

module.exports = { main };
