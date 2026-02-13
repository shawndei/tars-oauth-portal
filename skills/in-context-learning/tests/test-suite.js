/**
 * In-Context Learning Test Suite
 * 
 * Comprehensive tests demonstrating performance improvement with examples
 */

const { InContextAdapter } = require('../index');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  libraryPath: path.join(__dirname, 'test-library.json'),
  trackerPath: path.join(__dirname, 'test-tracker.json')
};

// Color output helpers
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async test(name, fn) {
    process.stdout.write(`  ${name}... `);
    try {
      await fn();
      console.log(colors.green('✓ PASS'));
      this.passed++;
    } catch (error) {
      console.log(colors.red('✗ FAIL'));
      console.log(colors.red(`    ${error.message}`));
      this.failed++;
    }
  }

  async suite(name, fn) {
    console.log(colors.bold(`\n${name}`));
    await fn();
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertGreater(actual, threshold, message) {
    if (actual <= threshold) {
      throw new Error(message || `Expected > ${threshold}, got ${actual}`);
    }
  }

  summary() {
    console.log(colors.bold(`\n${'='.repeat(60)}`));
    console.log(colors.bold('Test Summary'));
    console.log(colors.bold('='.repeat(60)));
    console.log(`Total: ${this.passed + this.failed}`);
    console.log(colors.green(`Passed: ${this.passed}`));
    if (this.failed > 0) {
      console.log(colors.red(`Failed: ${this.failed}`));
    }
    console.log(colors.bold('='.repeat(60)));
    
    return this.failed === 0;
  }
}

// Test data setup
async function setupTestLibrary(adapter) {
  // Code explanation examples
  await adapter.addExample({
    useCase: 'code-explanation',
    input: 'Explain what map() does in JavaScript',
    output: 'The map() method creates a new array by calling a function on every element in the original array. It transforms each element and returns a new array with the transformed values.',
    tags: ['javascript', 'arrays', 'functional']
  });

  await adapter.addExample({
    useCase: 'code-explanation',
    input: 'What is a promise in JavaScript?',
    output: 'A Promise is an object representing the eventual completion or failure of an asynchronous operation. It has three states: pending, fulfilled, or rejected.',
    tags: ['javascript', 'async', 'promises']
  });

  await adapter.addExample({
    useCase: 'code-explanation',
    input: 'How does array destructuring work?',
    output: 'Array destructuring allows you to unpack values from arrays into distinct variables. Example: const [a, b] = [1, 2] assigns a=1 and b=2.',
    tags: ['javascript', 'es6', 'syntax']
  });

  // Summarization examples
  await adapter.addExample({
    useCase: 'summarization',
    input: 'Summarize: The rapid advancement of artificial intelligence has transformed industries worldwide. Machine learning algorithms now power everything from recommendation systems to autonomous vehicles.',
    output: 'AI advances drive transformation across industries, powering recommendations and self-driving cars.',
    tags: ['summary', 'technology', 'ai']
  });

  await adapter.addExample({
    useCase: 'summarization',
    input: 'Summarize: Climate change is causing global temperatures to rise, leading to melting ice caps, rising sea levels, and more extreme weather events.',
    output: 'Climate change: rising temps, melting ice, higher seas, extreme weather.',
    tags: ['summary', 'climate', 'environment']
  });

  // Math examples
  await adapter.addExample({
    useCase: 'math-explanation',
    input: 'Explain the Pythagorean theorem',
    output: 'The Pythagorean theorem states that in a right triangle, a² + b² = c², where c is the hypotenuse and a and b are the other two sides.',
    tags: ['math', 'geometry', 'theorem']
  });

  await adapter.save();
}

// Main test suite
async function runTests() {
  const runner = new TestRunner();

  console.log(colors.bold('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(colors.bold('║        In-Context Learning Test Suite                     ║'));
  console.log(colors.bold('╚════════════════════════════════════════════════════════════╝'));

  // Cleanup previous test files
  try {
    await fs.unlink(TEST_CONFIG.libraryPath);
    await fs.unlink(TEST_CONFIG.trackerPath);
  } catch (e) {
    // Files might not exist
  }

  // Initialize adapter
  const adapter = new InContextAdapter(TEST_CONFIG);
  await adapter.initialize();
  await setupTestLibrary(adapter);

  // Test Suite 1: Basic Functionality
  await runner.suite('Basic Functionality Tests', async () => {
    await runner.test('Initialize adapter', async () => {
      runner.assert(adapter, 'Adapter should be initialized');
    });

    await runner.test('Library loads examples', async () => {
      const examples = adapter.library.getExamples('code-explanation');
      runner.assertGreater(examples.length, 0, 'Should have code-explanation examples');
    });

    await runner.test('Add example to library', async () => {
      const initialCount = adapter.library.index.size;
      await adapter.addExample({
        input: 'Test input',
        output: 'Test output',
        useCase: 'test'
      });
      runner.assertEqual(adapter.library.index.size, initialCount + 1, 'Library size should increase');
    });

    await runner.test('Get library statistics', async () => {
      const stats = adapter.library.getStats();
      runner.assert(stats.totalExamples > 0, 'Should have examples');
      runner.assert(stats.useCases, 'Should have use case stats');
    });
  });

  // Test Suite 2: Prompt Adaptation
  await runner.suite('Prompt Adaptation Tests', async () => {
    await runner.test('Adapt prompt with standard format', async () => {
      const result = await adapter.adapt(
        'Explain what filter() does in JavaScript',
        { useCase: 'code-explanation', format: 'standard' }
      );
      
      runner.assert(result.prompt, 'Should return adapted prompt');
      runner.assert(result.examples, 'Should return selected examples');
      runner.assert(result.metadata, 'Should return metadata');
    });

    await runner.test('Adapt prompt with conversational format', async () => {
      const result = await adapter.adapt(
        'What is async/await?',
        { useCase: 'code-explanation', format: 'conversational' }
      );
      
      runner.assert(result.prompt.includes('For context'), 'Should use conversational format');
    });

    await runner.test('Adapt prompt with XML format', async () => {
      const result = await adapter.adapt(
        'Explain closures',
        { useCase: 'code-explanation', format: 'xml' }
      );
      
      runner.assert(result.prompt.includes('<prompt>'), 'Should use XML format');
      runner.assert(result.prompt.includes('<examples>'), 'Should have examples tag');
    });

    await runner.test('Respect maxExamples limit', async () => {
      const result = await adapter.adapt(
        'Test prompt',
        { useCase: 'code-explanation', maxExamples: 2 }
      );
      
      runner.assert(result.examples.length <= 2, 'Should not exceed maxExamples');
    });
  });

  // Test Suite 3: Selection Strategies
  await runner.suite('Selection Strategy Tests', async () => {
    const testPrompt = 'Explain JavaScript promises and async programming';

    await runner.test('Random strategy selects examples', async () => {
      const result = await adapter.adapt(testPrompt, {
        useCase: 'code-explanation',
        strategy: 'random'
      });
      
      runner.assertGreater(result.examples.length, 0, 'Should select examples');
    });

    await runner.test('Recent strategy selects examples', async () => {
      const result = await adapter.adapt(testPrompt, {
        useCase: 'code-explanation',
        strategy: 'recent'
      });
      
      runner.assertGreater(result.examples.length, 0, 'Should select examples');
    });

    await runner.test('Semantic strategy selects relevant examples', async () => {
      const result = await adapter.adapt(testPrompt, {
        useCase: 'code-explanation',
        strategy: 'semantic',
        maxExamples: 3
      });
      
      runner.assertGreater(result.examples.length, 0, 'Should select examples');
      
      // Check if promise-related example is included (semantic relevance)
      const hasPromiseExample = result.examples.some(ex => 
        ex.input.toLowerCase().includes('promise')
      );
      runner.assert(hasPromiseExample, 'Should select semantically relevant examples');
    });

    await runner.test('Keyword strategy selects matching examples', async () => {
      const result = await adapter.adapt(testPrompt, {
        useCase: 'code-explanation',
        strategy: 'keyword'
      });
      
      runner.assertGreater(result.examples.length, 0, 'Should select examples');
    });

    await runner.test('Hybrid strategy combines approaches', async () => {
      const result = await adapter.adapt(testPrompt, {
        useCase: 'code-explanation',
        strategy: 'hybrid',
        weights: {
          semantic: 0.5,
          performance: 0.3,
          keyword: 0.2
        }
      });
      
      runner.assertGreater(result.examples.length, 0, 'Should select examples');
    });
  });

  // Test Suite 4: Performance Tracking
  await runner.suite('Performance Tracking Tests', async () => {
    await runner.test('Track request adaptation', async () => {
      const result = await adapter.adapt(
        'Test prompt for tracking',
        { useCase: 'code-explanation' }
      );
      
      runner.assert(result.metadata.requestId, 'Should have request ID');
      runner.assert(result.metadata.useCase, 'Should track use case');
      runner.assert(result.metadata.strategy, 'Should track strategy');
    });

    await runner.test('Record feedback', async () => {
      const result = await adapter.adapt(
        'Test prompt',
        { useCase: 'code-explanation' }
      );
      
      await adapter.recordFeedback(result.metadata.requestId, {
        success: true,
        quality: 0.9
      });
      
      const request = adapter.tracker.requests.get(result.metadata.requestId);
      runner.assert(request.feedback, 'Should have feedback recorded');
      runner.assertEqual(request.feedback.success, true, 'Should record success');
    });

    await runner.test('Get use case statistics', async () => {
      const stats = await adapter.getStats('code-explanation');
      
      runner.assert(stats, 'Should return stats');
      runner.assert(typeof stats.totalRequests === 'number', 'Should have request count');
    });

    await runner.test('Compare strategy performance', async () => {
      // Run a few requests with different strategies
      for (const strategy of ['random', 'semantic']) {
        const result = await adapter.adapt('Test', { 
          useCase: 'code-explanation',
          strategy 
        });
        await adapter.recordFeedback(result.metadata.requestId, { success: true });
      }
      
      const comparison = adapter.tracker.getStrategyComparison();
      runner.assert(Object.keys(comparison).length > 0, 'Should have strategy data');
    });
  });

  // Test Suite 5: Performance Improvement Demonstration
  await runner.suite('Performance Improvement Demonstration', async () => {
    console.log(colors.yellow('\n  Demonstrating improvement with few-shot examples:'));
    
    await runner.test('Baseline: No examples (empty use case)', async () => {
      const result = await adapter.adapt(
        'Explain the spread operator in JavaScript',
        { useCase: 'nonexistent-usecase', maxExamples: 5 }
      );
      
      console.log(colors.yellow(`    Examples selected: ${result.examples.length}`));
      runner.assertEqual(result.examples.length, 0, 'Should have no examples');
    });

    await runner.test('With examples: Few-shot learning', async () => {
      const result = await adapter.adapt(
        'Explain the spread operator in JavaScript',
        { 
          useCase: 'code-explanation',
          strategy: 'semantic',
          maxExamples: 3
        }
      );
      
      console.log(colors.green(`    Examples selected: ${result.examples.length}`));
      console.log(colors.green(`    Strategy: ${result.metadata.strategy}`));
      
      runner.assertGreater(result.examples.length, 0, 'Should have examples');
      
      // Display selected examples
      console.log(colors.blue('\n    Selected Examples:'));
      result.examples.forEach((ex, idx) => {
        console.log(colors.blue(`      ${idx + 1}. ${ex.input.substring(0, 50)}...`));
      });
    });

    await runner.test('Strategy comparison on same prompt', async () => {
      const prompt = 'What are arrow functions in JavaScript?';
      const strategies = ['random', 'semantic', 'keyword'];
      const results = {};

      console.log(colors.yellow('\n    Comparing strategies for same prompt:'));
      
      for (const strategy of strategies) {
        const result = await adapter.adapt(prompt, {
          useCase: 'code-explanation',
          strategy,
          maxExamples: 3
        });
        
        results[strategy] = result;
        console.log(colors.blue(`      ${strategy}: ${result.examples.length} examples`));
      }
      
      runner.assert(Object.keys(results).length === 3, 'Should test all strategies');
    });

    await runner.test('Demonstrate prompt construction', async () => {
      const result = await adapter.adapt(
        'Explain reduce() in JavaScript',
        {
          useCase: 'code-explanation',
          strategy: 'semantic',
          format: 'standard',
          maxExamples: 2
        }
      );

      console.log(colors.yellow('\n    Constructed Prompt Preview:'));
      const preview = result.prompt.substring(0, 400);
      console.log(colors.blue(`      ${preview}...\n`));
      
      runner.assert(result.prompt.includes('Example'), 'Should include examples in prompt');
    });
  });

  // Test Suite 6: Edge Cases and Error Handling
  await runner.suite('Edge Cases and Error Handling', async () => {
    await runner.test('Handle empty library for use case', async () => {
      const result = await adapter.adapt(
        'Test prompt',
        { useCase: 'nonexistent-usecase' }
      );
      
      runner.assertEqual(result.examples.length, 0, 'Should return no examples');
    });

    await runner.test('Handle maxExamples = 0', async () => {
      const result = await adapter.adapt(
        'Test prompt',
        { useCase: 'code-explanation', maxExamples: 0 }
      );
      
      runner.assertEqual(result.examples.length, 0, 'Should return no examples');
    });

    await runner.test('Handle very long prompt', async () => {
      const longPrompt = 'Test '.repeat(1000);
      const result = await adapter.adapt(longPrompt, {
        useCase: 'code-explanation'
      });
      
      runner.assert(result.prompt, 'Should handle long prompts');
    });

    await runner.test('Handle special characters in prompt', async () => {
      const result = await adapter.adapt(
        'Explain <div> & "quotes" in HTML',
        { useCase: 'code-explanation', format: 'xml' }
      );
      
      runner.assert(result.prompt.includes('&lt;'), 'Should escape XML in XML format');
    });
  });

  // Test Suite 7: Integration Test
  await runner.suite('End-to-End Integration Test', async () => {
    await runner.test('Complete workflow: add, adapt, feedback, stats', async () => {
      // 1. Add a new example
      await adapter.addExample({
        input: 'What is TypeScript?',
        output: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
        useCase: 'code-explanation',
        tags: ['typescript', 'javascript']
      });

      // 2. Adapt a prompt
      const result = await adapter.adapt(
        'Explain TypeScript interfaces',
        { 
          useCase: 'code-explanation',
          strategy: 'keyword'
        }
      );

      // 3. Record feedback
      await adapter.recordFeedback(result.metadata.requestId, {
        success: true,
        quality: 0.95
      });

      // 4. Get statistics
      const stats = await adapter.getStats('code-explanation');
      
      runner.assert(result.examples.length > 0, 'Should select examples');
      runner.assert(stats.totalRequests > 0, 'Should track requests');
    });
  });

  // Cleanup
  await runner.suite('Cleanup', async () => {
    await runner.test('Save adapter state', async () => {
      await adapter.save();
      
      // Verify files exist
      const libraryExists = await fs.access(TEST_CONFIG.libraryPath)
        .then(() => true)
        .catch(() => false);
      const trackerExists = await fs.access(TEST_CONFIG.trackerPath)
        .then(() => true)
        .catch(() => false);
      
      runner.assert(libraryExists, 'Library file should be saved');
      runner.assert(trackerExists, 'Tracker file should be saved');
    });
  });

  // Print summary
  const success = runner.summary();
  
  if (success) {
    console.log(colors.green('\n✓ All tests passed! In-context learning system is working correctly.\n'));
  } else {
    console.log(colors.red('\n✗ Some tests failed. Please review the errors above.\n'));
  }

  return success ? 0 : 1;
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then(code => process.exit(code))
    .catch(error => {
      console.error(colors.red('\nFatal error:'), error);
      process.exit(1);
    });
}

module.exports = { runTests };
