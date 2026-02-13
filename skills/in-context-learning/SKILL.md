# In-Context Learning Skill

**Tier:** 3  
**Status:** ✅ Active  
**Version:** 1.0.0

## Overview

The In-Context Learning skill provides a sophisticated few-shot learning system that dynamically constructs prompts with relevant examples from a managed library. This enables improved performance on specific tasks by providing contextual examples that guide the model's responses.

## Capabilities

1. **Few-Shot Adapter System** - Dynamically inject relevant examples into prompts
2. **Multiple Selection Strategies** - Choose examples intelligently based on various criteria
3. **Example Library Management** - Organize and maintain a collection of high-quality examples
4. **Performance Tracking** - Monitor effectiveness across use cases and strategies
5. **Dynamic Prompt Construction** - Build prompts in multiple formats (standard, conversational, XML)

## Architecture

```
InContextAdapter (main interface)
├── ExampleLibrary (storage & retrieval)
├── SelectionStrategy (example selection)
└── PerformanceTracker (metrics & optimization)
```

## Quick Start

```javascript
const { InContextAdapter } = require('./skills/in-context-learning');

// Initialize the adapter
const adapter = new InContextAdapter({
  strategy: 'semantic',
  maxExamples: 5
});

await adapter.initialize();

// Adapt a prompt with examples
const result = await adapter.adapt(
  'Explain how async/await works in JavaScript',
  { useCase: 'code-explanation' }
);

console.log(result.prompt); // Prompt with relevant examples
console.log(result.examples); // Selected examples
console.log(result.metadata); // Request metadata

// Record feedback
await adapter.recordFeedback(result.metadata.requestId, {
  success: true,
  quality: 0.9
});
```

## Selection Strategies

### 1. Random (Baseline)
Random selection of examples. Useful for A/B testing and establishing baselines.

```javascript
const result = await adapter.adapt(prompt, { 
  strategy: 'random',
  maxExamples: 3 
});
```

### 2. Recent
Selects most recently added examples. Good for evolving use cases.

```javascript
const result = await adapter.adapt(prompt, { 
  strategy: 'recent' 
});
```

### 3. Performance
Selects examples with the best historical success rates.

```javascript
const result = await adapter.adapt(prompt, { 
  strategy: 'performance' 
});
```

### 4. Semantic (Recommended)
Selects examples most similar to the input prompt using text similarity.

```javascript
const result = await adapter.adapt(prompt, { 
  strategy: 'semantic' 
});
```

### 5. Keyword
Matches examples based on keyword overlap.

```javascript
const result = await adapter.adapt(prompt, { 
  strategy: 'keyword' 
});
```

### 6. Hybrid (Advanced)
Combines multiple strategies with configurable weights.

```javascript
const result = await adapter.adapt(prompt, { 
  strategy: 'hybrid',
  weights: {
    semantic: 0.5,
    performance: 0.3,
    keyword: 0.2
  }
});
```

## Prompt Formats

### Standard Format (Default)
```
Here are some examples to help guide your response:

Example 1:
Input: [example input]
Output: [example output]

Example 2:
Input: [example input]
Output: [example output]

Now, please respond to the following:

[your prompt]
```

### Conversational Format
```
[your prompt]

For context, here are similar examples:

1. "[example input]" → "[example output]"
2. "[example input]" → "[example output]"
```

### XML Format
```xml
<prompt>
  <examples>
    <example>
      <input>[example input]</input>
      <output>[example output]</output>
    </example>
  </examples>
  <task>[your prompt]</task>
</prompt>
```

Usage:
```javascript
const result = await adapter.adapt(prompt, { 
  format: 'conversational' // or 'xml'
});
```

## Example Management

### Adding Examples

```javascript
await adapter.addExample({
  input: 'What is a closure in JavaScript?',
  output: 'A closure is a function that has access to variables in its outer scope, even after the outer function has returned.',
  useCase: 'code-explanation',
  tags: ['javascript', 'closures', 'scope'],
  metadata: {
    difficulty: 'intermediate',
    author: 'expert-dev'
  }
});
```

### Example Structure

```javascript
{
  id: 'auto-generated-hash',
  input: 'string',
  output: 'string',
  useCase: 'string',
  tags: ['array', 'of', 'strings'],
  metadata: { /* custom fields */ },
  created: 'ISO-8601-timestamp',
  usageCount: 0,
  successRate: 0.0
}
```

### Direct Library Access

```javascript
const library = adapter.library;

// Get examples for a use case
const examples = library.getExamples('code-explanation');

// Search by tags
const results = library.searchByTags(['javascript', 'async']);

// Remove an example
await library.removeExample('example-id');

// Get statistics
const stats = library.getStats();
```

## Performance Tracking

### Recording Feedback

```javascript
await adapter.recordFeedback(requestId, {
  success: true,           // Was the result helpful?
  quality: 0.85,          // Quality score 0-1
  responseTime: 1234,     // Optional: response time in ms
  userSatisfaction: 5,    // Optional: 1-5 rating
  notes: 'Excellent explanation'  // Optional
});
```

### Viewing Statistics

```javascript
// Get stats for a use case
const stats = await adapter.getStats('code-explanation');
console.log(stats);
/*
{
  totalRequests: 150,
  successfulRequests: 135,
  successRate: 0.9,
  avgExamples: 3.2,
  avgResponseTime: 1500,
  recent: {
    requests: 50,
    successRate: 0.94,
    avgExamples: 3.5
  }
}
*/

// Compare strategies
const comparison = adapter.tracker.getStrategyComparison();
console.log(comparison);
/*
{
  semantic: { totalRequests: 80, successRate: 0.92, ... },
  random: { totalRequests: 40, successRate: 0.75, ... },
  hybrid: { totalRequests: 30, successRate: 0.95, ... }
}
*/
```

### Exporting Data

```javascript
const data = adapter.tracker.exportData();
// Export to file for external analysis
await fs.writeFile('analysis.json', JSON.stringify(data, null, 2));
```

## Use Cases

### Code Explanation
```javascript
const adapter = new InContextAdapter({ strategy: 'semantic' });
await adapter.initialize();

const result = await adapter.adapt(
  'Explain what Promise.all() does',
  { useCase: 'code-explanation' }
);
```

### Summarization
```javascript
const result = await adapter.adapt(
  'Summarize this article: [long text...]',
  { 
    useCase: 'summarization',
    format: 'conversational',
    maxExamples: 3
  }
);
```

### Translation
```javascript
const result = await adapter.adapt(
  'Translate to French: Hello, how are you?',
  { 
    useCase: 'translation',
    strategy: 'keyword'
  }
);
```

### Classification
```javascript
const result = await adapter.adapt(
  'Classify the sentiment: This product is amazing!',
  { 
    useCase: 'sentiment-analysis',
    strategy: 'performance' // Use historically successful examples
  }
);
```

## Advanced Usage

### Custom Strategy Weights

```javascript
const adapter = new InContextAdapter({
  strategy: 'hybrid'
});

await adapter.initialize();

const result = await adapter.adapt(prompt, {
  strategy: 'hybrid',
  weights: {
    semantic: 0.6,     // Prioritize similarity
    performance: 0.3,  // Consider success rate
    keyword: 0.1       // Light keyword matching
  }
});
```

### Batch Processing

```javascript
const prompts = [
  'Explain recursion',
  'What is a hash table?',
  'How does garbage collection work?'
];

const results = await Promise.all(
  prompts.map(p => adapter.adapt(p, { useCase: 'code-explanation' }))
);

// Record feedback in batch
for (const result of results) {
  await adapter.recordFeedback(result.metadata.requestId, {
    success: true,
    quality: 0.9
  });
}
```

### Dynamic Use Case Selection

```javascript
function determineUseCase(prompt) {
  if (prompt.includes('explain') || prompt.includes('what is')) {
    return 'explanation';
  } else if (prompt.includes('summarize')) {
    return 'summarization';
  }
  return 'general';
}

const useCase = determineUseCase(userPrompt);
const result = await adapter.adapt(userPrompt, { useCase });
```

## Configuration Options

### InContextAdapter Options

```javascript
const adapter = new InContextAdapter({
  libraryPath: './custom/path/library.json',  // Custom library location
  trackerPath: './custom/path/tracker.json',  // Custom tracker location
  strategy: 'semantic',                        // Default selection strategy
  maxExamples: 5                              // Default max examples
});
```

### Adaptation Options

```javascript
const result = await adapter.adapt(prompt, {
  useCase: 'string',           // Required: categorizes the task
  maxExamples: 5,              // Max number of examples to include
  strategy: 'semantic',        // Selection strategy
  format: 'standard',          // Prompt format (standard/conversational/xml)
  weights: { /* ... */ }       // For hybrid strategy
});
```

## Best Practices

### 1. Choose the Right Strategy

- **Semantic**: Best for open-ended tasks with varied inputs
- **Performance**: Best for well-defined tasks with clear success metrics
- **Hybrid**: Best for complex tasks requiring balanced selection
- **Random**: Best for A/B testing and baseline measurement

### 2. Curate Your Examples

- Add diverse examples covering edge cases
- Include both simple and complex examples
- Tag examples thoroughly for better searchability
- Review and remove low-performing examples periodically

### 3. Track Performance

- Always record feedback for completed requests
- Monitor success rates across use cases
- Compare strategies to find optimal approach
- Use tracking data to refine your example library

### 4. Optimize for Context Length

- Start with fewer examples (2-3) and increase if needed
- Monitor token usage to stay within limits
- Use shorter examples when possible
- Consider conversational format for compact prompts

### 5. Iterate and Improve

- Regularly review performance statistics
- Add new examples based on challenging queries
- Prune examples with low success rates
- Experiment with different strategies for each use case

## Testing

See `tests/test-suite.js` for comprehensive tests demonstrating:

- Baseline vs. few-shot performance comparison
- Strategy effectiveness across use cases
- Performance tracking and feedback loops
- Example selection quality

Run tests:
```bash
node skills/in-context-learning/tests/test-suite.js
```

## Files

```
skills/in-context-learning/
├── adapter.js          # Main adapter interface
├── library.js          # Example library management
├── strategies.js       # Selection strategies
├── tracker.js          # Performance tracking
├── index.js           # Module exports
├── SKILL.md           # This documentation
├── examples/          # Data storage
│   ├── library.json   # Example library (auto-generated)
│   └── performance.json # Performance data (auto-generated)
└── tests/
    └── test-suite.js  # Comprehensive test suite
```

## Troubleshooting

### No examples returned
- Verify examples exist for the specified use case: `adapter.library.getExamples(useCase)`
- Check library file exists and is valid JSON
- Try using 'all' as use case to search across all examples

### Low performance improvement
- Add more diverse, high-quality examples
- Experiment with different selection strategies
- Increase maxExamples count
- Review example quality and relevance

### High token usage
- Reduce maxExamples count
- Use shorter examples
- Switch to conversational format
- Pre-filter examples by relevance before adapting

## Future Enhancements

Potential improvements for future versions:

- [ ] Vector embeddings for semantic search (using OpenAI embeddings)
- [ ] Automatic example extraction from successful conversations
- [ ] Multi-modal examples (code + output, images + descriptions)
- [ ] Example clustering and deduplication
- [ ] A/B testing framework for strategy comparison
- [ ] Integration with external knowledge bases
- [ ] Real-time adaptation based on user feedback

## References

- [Few-Shot Learning (OpenAI)](https://platform.openai.com/docs/guides/prompt-engineering/strategy-provide-examples)
- [In-Context Learning Research](https://arxiv.org/abs/2301.00234)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)

---

**Last Updated:** 2026-02-13  
**Maintainer:** OpenClaw Agent System
