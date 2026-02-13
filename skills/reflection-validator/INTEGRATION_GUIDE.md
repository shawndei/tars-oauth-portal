# Reflection & Self-Correction Loop - Integration Guide

This guide shows how to integrate the Reflection & Self-Correction Loop into your agent's response pipeline.

---

## Quick Start (5 minutes)

### 1. Enable Reflection in AGENTS.md

The reflection checklist is already present in `AGENTS.md` under the **🎯 Reflection & Self-Correction** section. This skill provides the implementation.

### 2. Configure Reflection Behavior

Edit `skills/reflection-validator/reflection-patterns.json`:

```json
{
  "config": {
    "enabled": true,
    "confidence_threshold": 90,  // Adjust based on your needs
    "max_iterations": 2,
    "critique_depth": "medium"
  }
}
```

### 3. Test the System

```bash
cd skills/reflection-validator
node test-reflection.js --scenario=basic
node test-reflection.js --scenario=hallucination
```

---

## Integration Methods

### Method 1: Prompting Pattern (Recommended for OpenClaw)

Since OpenClaw agents work via prompting, integrate reflection as part of your response generation prompt:

```markdown
When generating a response, follow this process:

1. Generate initial response
2. Self-critique using these checks:
   - ✓ Answered the actual question asked?
   - ✓ All factual claims supported or marked as opinion?
   - ✓ No hallucinations?
   - ✓ Proper formatting for {{platform}}?
   - ✓ Complete (nothing missing)?
3. If issues found, revise (max 2 iterations)
4. Deliver final response

Confidence threshold: Skip reflection if confidence >90%
```

This is already integrated into `AGENTS.md` - you're using it automatically!

---

### Method 2: Explicit Reflection Function (For Custom Implementations)

If building custom tooling:

```javascript
// reflection.js
const patterns = require('./reflection-patterns.json');

async function reflect(response, context) {
  // Calculate confidence
  const confidence = calculateConfidence(response, context);
  
  if (confidence >= patterns.config.confidence_threshold) {
    return { response, reflected: false, confidence };
  }
  
  // Apply reflection loop
  let current = response;
  let iteration = 0;
  const issues = [];
  
  while (iteration < patterns.config.max_iterations) {
    iteration++;
    
    // Critique (this would call LLM with critique prompt)
    const critique = await critiqueResponse(current, context);
    
    if (critique.passed) break;
    
    issues.push(...critique.issues);
    
    // Revise
    current = await reviseResponse(current, critique.issues);
  }
  
  return {
    response: current,
    reflected: true,
    confidence,
    iterations: iteration,
    issues
  };
}

module.exports = { reflect };
```

**Usage:**

```javascript
const { reflect } = require('./skills/reflection-validator/reflection');

// In your response pipeline
const initialResponse = await agent.generate(userMessage);
const validated = await reflect(initialResponse, {
  question: userMessage,
  channel: 'whatsapp',
  domain: 'general'
});

return validated.response;
```

---

### Method 3: Pre-Delivery Hook (Advanced)

For OpenClaw custom builds, add reflection as a middleware:

```javascript
// In OpenClaw's response pipeline
agent.addMiddleware('pre-delivery', async (response, context) => {
  const reflectionEnabled = readConfig('reflection.enabled');
  
  if (!reflectionEnabled) return response;
  
  const { reflect } = require('./skills/reflection-validator/reflection');
  const validated = await reflect(response, context);
  
  // Log for monitoring
  if (validated.reflected) {
    logReflection({
      issues: validated.issues,
      iterations: validated.iterations,
      improved: validated.response !== response
    });
  }
  
  return validated.response;
});
```

---

## Configuration Options

### Confidence Thresholds

Tune based on your use case:

```json
{
  "confidence_threshold": 90  // Skip reflection if ≥90% confident
}
```

**Recommendations:**

- **Casual chat:** 95 (high threshold, minimal reflection)
- **General assistance:** 90 (default, balanced)
- **Technical support:** 80 (more reflection)
- **High-stakes domains:** 70 (maximum reflection)

### Critique Depth

```json
{
  "critique_depth": "medium"  // light | medium | comprehensive
}
```

- **light:** Fast, basic checks (~800ms)
- **medium:** Thorough, recommended (~1800ms)
- **comprehensive:** Deep analysis, for critical responses (~4200ms)

### Max Iterations

```json
{
  "max_iterations": 2  // Prevent infinite loops
}
```

**Why 2?**
- Diminishing returns after 2 iterations
- Cost control
- Time constraints (users expect timely responses)

---

## Channel-Specific Configuration

Different channels have different needs:

```javascript
const channelConfig = {
  whatsapp: {
    confidence_threshold: 90,
    depth: 'medium',
    formatting_strict: true  // No markdown tables, no headers
  },
  
  discord: {
    confidence_threshold: 85,
    depth: 'light',
    formatting_strict: false  // Discord supports rich markdown
  },
  
  email: {
    confidence_threshold: 75,  // More formal, higher stakes
    depth: 'comprehensive',
    tone_check: 'professional'
  }
};
```

---

## Domain-Specific Configuration

High-stakes domains need stricter reflection:

```javascript
const domainConfig = {
  medical: {
    confidence_threshold: 60,  // Very low - always reflect
    depth: 'comprehensive',
    require_citations: true,
    human_review: true  // Flag all medical advice for human review
  },
  
  legal: {
    confidence_threshold: 65,
    depth: 'comprehensive',
    disclaimers: true  // Always add "not legal advice" disclaimer
  },
  
  financial: {
    confidence_threshold: 70,
    depth: 'comprehensive',
    require_sources: true
  },
  
  casual: {
    confidence_threshold: 95,
    depth: 'light'
  }
};
```

---

## Monitoring & Logging

### What to Log

Track reflection effectiveness:

```javascript
const reflectionLog = {
  timestamp: Date.now(),
  question: userMessage,
  initialResponse: response,
  finalResponse: validated.response,
  confidence: validated.confidence,
  reflected: validated.reflected,
  iterations: validated.iterations,
  issues: validated.issues.map(i => ({
    type: i.type,
    severity: i.severity,
    message: i.message
  })),
  improved: validated.response !== response,
  userFeedback: null  // Fill in if user provides correction
};

fs.appendFileSync('logs/reflection.jsonl', JSON.stringify(reflectionLog) + '\n');
```

### Metrics to Track

- **Reflection rate:** % of messages that undergo reflection
- **Issue detection rate:** % of reflections that find issues
- **Improvement rate:** % of reflections that change the response
- **False positive rate:** % of correct responses flagged for review
- **User correction rate:** % of responses users correct (tracks real-world accuracy)

### Dashboard Query Examples

```javascript
// False positive rate
const falsePositives = reflectionLogs.filter(log => 
  log.reflected && log.issues.length > 0 && log.userFeedback === 'original_was_correct'
);

const falsePositiveRate = (falsePositives.length / totalReflections) * 100;

// Time saved (prevented corrections)
const preventedCorrections = reflectionLogs.filter(log => 
  log.reflected && log.improved && !log.userFeedback
);

const timeSaved = preventedCorrections.length * avgCorrectionCost;
```

---

## Integration with AGENTS.md

The reflection checklist in `AGENTS.md` provides the agent-facing documentation. This skill provides:

1. **Implementation details** (how it works under the hood)
2. **Configuration options** (tuning reflection behavior)
3. **Test cases** (proof that it works)
4. **Integration patterns** (how to use it in code)

### Keeping Them in Sync

When updating reflection behavior:

1. Update `skills/reflection-validator/reflection-patterns.json` (config)
2. Update `skills/reflection-validator/SKILL.md` (documentation)
3. Update `AGENTS.md` checklist if needed (agent-facing rules)
4. Run tests to verify changes: `node test-reflection.js`

---

## Troubleshooting

### Problem: Reflection is too slow

**Symptoms:** Responses take >5 seconds

**Solutions:**
1. Increase `confidence_threshold` to reduce reflection frequency
2. Use `critique_depth: 'light'` instead of 'medium'
3. Cache critique results for similar responses
4. Run reflection asynchronously for non-urgent responses

### Problem: Too many false positives

**Symptoms:** Correct responses are being flagged and revised incorrectly

**Solutions:**
1. Lower critique depth to 'light'
2. Add common knowledge exemptions
3. Review false positives in logs and add patterns to skip
4. Increase confidence threshold for that domain/channel

### Problem: Missing obvious errors

**Symptoms:** Users still catching errors that reflection missed

**Solutions:**
1. Enable `critique_depth: 'comprehensive'`
2. Add specific error patterns to `reflection-patterns.json`
3. Review user corrections and add them to error patterns
4. Lower confidence threshold to force more reflection

### Problem: Reflection isn't running at all

**Checklist:**
- [ ] Is `enabled: true` in config?
- [ ] Is confidence threshold too high? (Try lowering to 80)
- [ ] Are responses all high-confidence? (Check confidence scores in logs)
- [ ] Is the reflection middleware properly registered?

---

## Advanced Patterns

### Pattern 1: User-Controlled Reflection

Let users request higher quality:

```javascript
if (userMessage.includes('[high-quality]') || userMessage.includes('[careful]')) {
  context.forceReflection = true;
  context.critiqueDepth = 'comprehensive';
}
```

### Pattern 2: Learning from Corrections

When a user corrects your response:

```javascript
if (userMessage.startsWith('Actually,') || userMessage.includes('No, I meant')) {
  // Extract the correction pattern
  const correctionPattern = extractCorrectionPattern(
    previousResponse,
    userMessage
  );
  
  // Add to learning patterns
  addToLearningPatterns(correctionPattern);
  
  // Apply stricter reflection for similar future queries
  updateConfidenceRules(correctionPattern);
}
```

### Pattern 3: Multi-Agent Reflection

Different agents specialize in different aspects:

```javascript
const critiques = await Promise.all([
  accuracyAgent.critique(response),    // Fact-checking specialist
  clarityAgent.critique(response),     // Communication specialist
  technicalAgent.critique(response)    // Technical accuracy specialist
]);

const consolidatedIssues = consolidateCritiques(critiques);
const revised = await revise(response, consolidatedIssues);
```

---

## Performance Optimization

### Caching Critique Results

For repeated similar queries:

```javascript
const critiqueCache = new Map();

function getCachedCritique(response, question) {
  const key = `${question}:${response}`.substring(0, 100);
  
  if (critiqueCache.has(key)) {
    return critiqueCache.get(key);
  }
  
  const critique = performCritique(response, question);
  critiqueCache.set(key, critique);
  
  return critique;
}
```

### Async Reflection for Non-Urgent Messages

```javascript
if (context.priority === 'low' || context.async === true) {
  // Send initial response immediately
  sendResponse(response);
  
  // Reflect asynchronously
  reflect(response, context).then(validated => {
    if (validated.response !== response) {
      sendFollowUp(`I realized I can improve my answer:\n\n${validated.response}`);
    }
  });
}
```

### Batching for Scale

Process multiple responses in parallel:

```javascript
const responses = await Promise.all(
  messages.map(msg => agent.generate(msg))
);

const validated = await Promise.all(
  responses.map((response, idx) => 
    reflect(response, { question: messages[idx] })
  )
);
```

---

## Testing Your Integration

### Unit Tests

```javascript
// test/reflection.test.js
const { reflect } = require('../skills/reflection-validator/reflection');

describe('Reflection', () => {
  it('should skip reflection for high-confidence responses', async () => {
    const result = await reflect('Hello!', { confidence: 95 });
    expect(result.reflected).toBe(false);
  });
  
  it('should catch hallucinated statistics', async () => {
    const result = await reflect(
      '87% of developers prefer TypeScript',
      { question: 'Is TypeScript popular?' }
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ type: 'accuracy' })
    );
  });
});
```

### Integration Tests

```bash
# Run all test scenarios
node test-reflection.js --scenario=basic
node test-reflection.js --scenario=hallucination
node test-reflection.js --scenario=incomplete
node test-reflection.js --scenario=unclear
node test-reflection.js --scenario=formatting
node test-reflection.js --scenario=confidence
```

### Monitoring in Production

```javascript
setInterval(() => {
  const stats = calculateReflectionStats();
  console.log('Reflection Stats (last hour):', {
    totalMessages: stats.total,
    reflectionRate: stats.reflectionRate + '%',
    issueDetectionRate: stats.issueDetectionRate + '%',
    avgIterations: stats.avgIterations,
    falsePositiveRate: stats.falsePositiveRate + '%'
  });
}, 3600000);  // Every hour
```

---

## Next Steps

1. **Try it out:** Run `node test-reflection.js --scenario=basic`
2. **Review logs:** Check what issues are being caught
3. **Tune config:** Adjust thresholds based on your false positive rate
4. **Monitor metrics:** Track reflection effectiveness over time
5. **Add learning:** Enable `learn_from_corrections` to improve over time

---

## Support

- **Documentation:** `SKILL.md` (comprehensive guide)
- **Test Results:** `TEST_RESULTS.md` (proof of effectiveness)
- **Config Reference:** `reflection-patterns.json` (all options)
- **Examples:** `test-reflection.js` (runnable examples)

**Questions?** Check the troubleshooting section or review the test cases for examples.
