# Integration Guide - Continuous Learning System

This guide shows how to integrate the Continuous Learning system with OpenClaw agent sessions.

## Quick Start

### 1. Initialize in Agent Session

```javascript
const { ContinuousLearning } = require('./skills/continuous-learning');

// In agent initialization (session start)
const learning = new ContinuousLearning(workspacePath);
await learning.initialize();
```

### 2. Process Every User Message

```javascript
// After receiving user message
const result = await learning.processMessage(
  userMessage,
  {
    messageId: messageId,
    source: 'whatsapp', // or 'discord', 'telegram', etc.
    timestamp: new Date().toISOString()
  }
);

// Check if new adaptations were made
if (result.adaptationsApplied > 0) {
  console.log(`Applied ${result.adaptationsApplied} behavior adaptations`);
}
```

### 3. Apply Learned Preferences

```javascript
// Before generating response, load high-confidence preferences
const preferences = await learning.getActivePreferences();

// Apply preferences to response generation
for (const pref of preferences) {
  switch (pref.category) {
    case 'outputFormat':
      if (pref.preference.default === 'artifact_first') {
        responseStrategy = 'artifact-first';
      }
      break;
      
    case 'directness':
      if (pref.preference.default === 'tldr_first') {
        includeTLDR = true;
        tldrPosition = 'top';
      }
      break;
      
    case 'toolPreferences':
      if (pref.preference.default === 'memory_first') {
        searchOrder = ['memory', 'web'];
      }
      break;
      
    // ... handle other categories
  }
}
```

### 4. Capture Reactions

```javascript
// When user reacts to message (WhatsApp, Discord, etc.)
await learning.captureReaction(
  emoji, // '👍', '👎', '😕', etc.
  messageId,
  {
    responseType: 'technical-explanation',
    tokensUsed: 1500
  }
);
```

### 5. Capture Explicit Corrections

```javascript
// Detect corrections in user messages
if (messageContainsCorrection(userMessage)) {
  await learning.captureCorrection(
    previousAgentResponse,
    userMessage,
    {
      messageId: messageId,
      correctionType: 'format' // or 'content', 'tone', etc.
    }
  );
}
```

## Complete Integration Example

```javascript
// agent-session.js
const { ContinuousLearning } = require('./skills/continuous-learning');

class AgentSession {
  constructor(workspacePath) {
    this.workspacePath = workspacePath;
    this.learning = new ContinuousLearning(workspacePath);
    this.conversationHistory = [];
  }
  
  async initialize() {
    await this.learning.initialize();
    
    // Load learned preferences
    this.preferences = await this.learning.getActivePreferences();
    console.log(`Loaded ${this.preferences.length} learned preferences`);
  }
  
  async processMessage(userMessage, metadata = {}) {
    // 1. Capture feedback from message
    const feedbackResult = await this.learning.processMessage(
      userMessage,
      metadata
    );
    
    // 2. Check for new adaptations
    if (feedbackResult.adaptationsApplied > 0) {
      this.preferences = await this.learning.getActivePreferences();
      console.log('Updated preferences due to new learning');
    }
    
    // 3. Generate response using learned preferences
    const response = await this.generateResponse(userMessage);
    
    // 4. Store in conversation history
    this.conversationHistory.push({
      user: userMessage,
      agent: response,
      messageId: metadata.messageId,
      timestamp: new Date().toISOString()
    });
    
    return response;
  }
  
  async generateResponse(userMessage) {
    // Apply learned preferences
    const responseConfig = this.buildResponseConfig();
    
    // Generate response with preferences
    let response;
    
    if (responseConfig.artifactFirst) {
      response = await this.generateArtifactFirstResponse(userMessage);
    } else {
      response = await this.generateExplanationFirstResponse(userMessage);
    }
    
    if (responseConfig.includeTLDR) {
      response = this.addTLDR(response);
    }
    
    return response;
  }
  
  buildResponseConfig() {
    const config = {
      artifactFirst: false,
      includeTLDR: false,
      formalTone: false,
      memoryFirst: true,
      detailLevel: 'medium'
    };
    
    // Apply high-confidence preferences
    for (const pref of this.preferences) {
      if (pref.preference.confidence < 0.75) continue;
      
      switch (pref.category) {
        case 'outputFormat':
          config.artifactFirst = (pref.preference.default === 'artifact_first');
          break;
        case 'directness':
          config.includeTLDR = (pref.preference.default === 'tldr_first');
          break;
        case 'communicationStyle':
          config.formalTone = (pref.preference.default === 'formal');
          break;
        case 'toolPreferences':
          config.memoryFirst = (pref.preference.default === 'memory_first');
          break;
        case 'contentDepth':
          config.detailLevel = pref.preference.default || 'medium';
          break;
      }
    }
    
    return config;
  }
  
  async handleReaction(emoji, messageId) {
    await this.learning.captureReaction(emoji, messageId, {
      source: 'user_reaction'
    });
    
    // Check if satisfaction is dropping
    const summary = await this.learning.getSummary();
    if (summary.metrics.satisfactionMetrics.rate < 0.7) {
      console.warn('User satisfaction is low, reviewing adaptations...');
    }
  }
  
  async periodicAnalysis() {
    // Run during heartbeat or end of day
    const scanResult = await this.learning.scanMemory(1);
    
    if (scanResult.signalsFound > 0) {
      console.log(`Found ${scanResult.signalsFound} new signals in memory`);
    }
    
    if (scanResult.adaptations.length > 0) {
      console.log('New adaptations applied from memory analysis');
      this.preferences = await this.learning.getActivePreferences();
    }
    
    // Generate daily report
    const report = await this.learning.generateReport();
    // Log or send report...
  }
}

module.exports = { AgentSession };
```

## Integration with HEARTBEAT.md

Add to your HEARTBEAT.md:

```markdown
## Continuous Learning Check (every 6 hours)

1. Scan last 6 hours of memory for feedback signals
2. Update learning patterns if new adaptations triggered
3. If confidence in any preference crossed >85% threshold:
   - Log to MEMORY.md with evidence
   - Apply new behavior immediately
4. If satisfaction rate drops below 70%:
   - Review recent adaptations
   - Consider rolling back recent changes
```

Code in heartbeat handler:

```javascript
async function heartbeatLearningCheck(learning) {
  // Scan recent memory
  const result = await learning.scanMemory(0.25); // Last 6 hours
  
  if (result.adaptations.length > 0) {
    console.log('🧠 New learning adaptations:');
    for (const adaptation of result.adaptations) {
      console.log(`   ${adaptation.category}: ${(adaptation.newConfidence * 100).toFixed(1)}%`);
      
      // Log to MEMORY.md if high confidence
      if (adaptation.newConfidence >= 0.85) {
        await learning.episodicIntegration.updateLongTermMemory(adaptation);
      }
    }
  }
  
  // Check satisfaction
  const summary = await learning.getSummary();
  if (summary.metrics.satisfactionMetrics.rate < 0.7) {
    console.warn('⚠️ User satisfaction low, reviewing recent adaptations');
    // Notify user or revert recent changes
  }
}
```

## Message Pattern Detection

Automatically detect feedback in user messages:

```javascript
function detectFeedbackSignals(message) {
  const signals = [];
  const text = message.toLowerCase();
  
  // Corrections
  if (text.includes('actually') || text.includes('i meant')) {
    signals.push({ type: 'correction', content: message });
  }
  
  // Preferences
  if (text.includes('prefer') || text.includes('always')) {
    signals.push({ type: 'preference', content: message });
  }
  
  // Positive feedback
  if (text.includes('perfect') || text.includes('exactly')) {
    signals.push({ type: 'positive', content: message });
  }
  
  // Negative feedback
  if (text.includes('not what i') || text.includes('too much')) {
    signals.push({ type: 'negative', content: message });
  }
  
  // Requests for more detail
  if (text.includes('more detail') || text.includes('explain')) {
    signals.push({ type: 'follow_up', content: message });
  }
  
  return signals;
}
```

## Validation Flow

Continuously validate that adaptations are working:

```javascript
async function validateAdaptations(learning, conversationHistory) {
  // Check if corrections are decreasing
  const recentCorrections = conversationHistory
    .slice(-20)
    .filter(msg => isCorrection(msg.user));
  
  // If corrections decreased, validations are successful
  if (recentCorrections.length < previousCorrectionCount) {
    await learning.validateAdaptation('outputFormat', true);
  }
  
  // Check reaction patterns
  const recentReactions = getRecentReactions(conversationHistory, 10);
  const positiveRate = recentReactions.filter(r => r === '👍').length / recentReactions.length;
  
  if (positiveRate > 0.7) {
    // Successful adaptation
    await learning.validateAdaptation('communicationStyle', true);
  }
}
```

## Best Practices

### 1. Initialize Once Per Session
Don't reinitialize the learning system for every message. Initialize at session start and maintain state.

### 2. Apply Preferences Selectively
Only apply preferences with confidence >75%. Lower confidence preferences should continue learning.

### 3. Validate Regularly
Run validation checks every 10-20 messages to ensure adaptations are improving user satisfaction.

### 4. Log Adaptations
Always log high-confidence adaptations to MEMORY.md for long-term persistence.

### 5. Monitor Satisfaction
Track user satisfaction rate. If it drops below 70%, review recent adaptations.

### 6. Batch Memory Scans
Don't scan memory on every message. Run during heartbeat or end of session.

### 7. Handle Conflicts
If user gives contradictory feedback, the system will naturally reduce confidence. Monitor for this.

### 8. Category-Specific Application
Different preferences apply to different contexts. E.g., technical topics might need more detail than casual chat.

## Performance Considerations

- **Initialization**: ~100ms
- **Process Message**: ~50ms
- **Capture Reaction**: ~20ms
- **Get Preferences**: ~10ms (cached after load)
- **Memory Scan**: ~500ms per day of history
- **Storage**: ~30KB for full learning state

## Troubleshooting

### Low Confidence Scores
- Need more observations (10+ for reliable confidence)
- Check for contradictory signals
- Verify signal categorization is correct

### Adaptations Not Applying
- Check confidence threshold (must be >75%)
- Verify preferences are being loaded
- Confirm response generation uses preferences

### High Correction Rate
- Recent adaptations may be incorrect
- Run validation and revert if needed
- Increase observation threshold before adapting

## Testing Your Integration

```javascript
const assert = require('assert');

async function testIntegration(agent) {
  // Test preference application
  await agent.learning.processMessage('I prefer bullet lists', {});
  const prefs = await agent.learning.getActivePreferences();
  // After enough signals, should learn this preference
  
  // Test reaction capture
  await agent.handleReaction('👍', 'msg123');
  const summary = await agent.learning.getSummary();
  assert(summary.metrics.satisfactionMetrics.positive > 0);
  
  // Test persistence
  const agent2 = new AgentSession(workspacePath);
  await agent2.initialize();
  const prefs2 = await agent2.learning.getActivePreferences();
  assert(prefs2.length === prefs.length); // Should persist
}
```

## Further Reading

- See `SKILL.md` for algorithm details
- See `README.md` for architecture overview
- See `example-usage.js` for code examples
- Run tests: `npm test` in skills/continuous-learning/
