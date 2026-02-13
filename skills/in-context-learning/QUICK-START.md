# In-Context Learning - Quick Start Guide

## 🚀 30-Second Start

```javascript
const { InContextAdapter } = require('./skills/in-context-learning');

const icl = new InContextAdapter();
await icl.initialize();

const result = await icl.adapt('Your prompt', { useCase: 'code-explanation' });
// Use result.prompt with your LLM
```

## 📦 What You Get

- ✅ **6 Selection Strategies** (semantic, keyword, hybrid, random, recent, performance)
- ✅ **3 Prompt Formats** (standard, conversational, XML)
- ✅ **Example Library** (add, search, track usage)
- ✅ **Performance Tracking** (per use case & strategy)
- ✅ **27 Passing Tests** (100% coverage)

## 🎯 Main Use Cases

### 1. Code Explanation
```javascript
await icl.adapt('Explain async/await', { 
  useCase: 'code-explanation',
  strategy: 'semantic' 
});
```

### 2. API Documentation
```javascript
await icl.adapt('Document this function: getUserById(id)', { 
  useCase: 'api-documentation',
  maxExamples: 3 
});
```

### 3. Summarization
```javascript
await icl.adapt('Summarize: [long text]', { 
  useCase: 'summarization',
  format: 'conversational' 
});
```

## 📚 Add Custom Examples

```javascript
await icl.addExample({
  input: 'Question example',
  output: 'Answer example',
  useCase: 'my-task',
  tags: ['relevant', 'keywords']
});
```

## 📊 Track Performance

```javascript
// Record feedback
await icl.recordFeedback(requestId, { 
  success: true, 
  quality: 0.9 
});

// Get stats
const stats = await icl.getStats('my-task');
console.log(stats.successRate); // 0.85
```

## 🧪 Test It

```bash
# Run full test suite (27 tests)
node skills/in-context-learning/tests/test-suite.js

# Run practical example
node skills/in-context-learning/example-usage.js
```

## 📖 Full Docs

See `SKILL.md` for complete documentation (12KB guide).

## ✨ Key Benefit

**Baseline:** Model uses only training data  
**With ICL:** Model receives task-specific examples → Better results

---

**Status:** Production Ready ✅  
**Location:** `skills/in-context-learning/`
