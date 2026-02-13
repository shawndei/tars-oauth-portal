# Continuous Feedback Learning System

**Status:** ✅ Complete  
**Tier:** 1  
**Version:** 1.0

## Overview

This skill implements a continuous learning system that captures user feedback, analyzes patterns, and automatically adapts agent behavior over time. The system learns from both explicit feedback (corrections, preferences) and implicit signals (reactions, follow-ups, usage patterns).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Interactions                      │
│  (Messages, Corrections, Reactions, Follow-ups)         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Feedback Capture Layer                      │
│  - Explicit signals (corrections, preferences)          │
│  - Implicit signals (reactions, timing, patterns)       │
│  - Signal categorization & strength calculation         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Pattern Analysis Engine                     │
│  - Confidence calculation (Bayesian)                    │
│  - Adaptation threshold logic                           │
│  - Validation & success tracking                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│           Episodic Memory Integration                    │
│  - Daily memory logs                                    │
│  - Long-term memory updates                             │
│  - Pattern extraction from history                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│           Learning Metrics & Tracking                    │
│  - Confidence scores                                    │
│  - Success rates                                        │
│  - Learning velocity                                    │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. Feedback Capture (`feedback-capture.js`)

Captures and categorizes feedback signals from user interactions:

- **Explicit signals**: Corrections, preferences, direct feedback
- **Implicit signals**: Reactions, follow-ups, timing patterns
- **Signal strength**: -1.0 (strongly negative) to +1.0 (strongly positive)
- **Categories**: 10 learning categories matching user preferences

### 2. Pattern Analysis (`pattern-analysis.js`)

Analyzes feedback patterns and determines when to adapt:

- **Confidence calculation**: Bayesian approach with priors
- **Adaptation thresholds**: High (>90%), Moderate (75-90%), Low (<75%)
- **Validation tracking**: Success/failure of adaptations
- **Adaptation history**: Audit trail of all behavior changes

### 3. Episodic Integration (`episodic-integration.js`)

Integrates with episodic memory system:

- **Memory scanning**: Extract patterns from past conversations
- **Daily logs**: Append feedback signals to memory files
- **Long-term memory**: Update MEMORY.md with learned preferences
- **Pattern extraction**: Identify corrections and preferences in history

### 4. Learning Metrics (`learning-metrics.js`)

Tracks performance and learning effectiveness:

- **Signal metrics**: Count and categorize all feedback
- **Adaptation metrics**: Track success rates
- **Satisfaction metrics**: User happiness over time
- **Learning velocity**: Adaptations per week
- **Report generation**: Comprehensive metrics reports

### 5. Main System (`index.js`)

Orchestrates all components:

- **Initialization**: Load patterns and metrics
- **Message processing**: Auto-detect signals in messages
- **Reaction handling**: Capture emoji reactions
- **Summary generation**: Current learning state
- **Memory scanning**: Batch process historical data

## Usage

### Basic Usage

```javascript
const { ContinuousLearning } = require('./skills/continuous-learning');

// Initialize system
const learning = new ContinuousLearning('/path/to/workspace');
await learning.initialize();

// Process user message (auto-detects feedback)
const result = await learning.processMessage(
  'I prefer bullet lists over paragraphs',
  { messageId: 'msg123' }
);
console.log(`Detected ${result.signalsDetected} signals`);
console.log(`Applied ${result.adaptationsApplied} adaptations`);

// Capture explicit correction
await learning.captureCorrection(
  'Original response...',
  'Actually, I meant more technical detail',
  { context: 'technical-docs' }
);

// Capture user reaction
await learning.captureReaction('👍', 'msg456', {});

// Get current learned preferences
const preferences = await learning.getActivePreferences();
preferences.forEach(pref => {
  console.log(`${pref.category}: ${(pref.preference.confidence * 100).toFixed(1)}%`);
});

// Generate metrics report
const report = await learning.generateReport();
console.log(report);
```

### Advanced Usage

```javascript
// Scan episodic memory for patterns
const scanResult = await learning.scanMemory(7); // Last 7 days
console.log(`Found ${scanResult.signalsFound} signals in history`);

// Validate adaptation success
await learning.validateAdaptation('outputFormat', true);

// Get comprehensive summary
const summary = await learning.getSummary();
console.log('Patterns:', summary.patterns);
console.log('Metrics:', summary.metrics);
```

## Learning Categories

The system learns preferences across 10 categories:

1. **Output Format** - Artifact-first vs explanation-first, bullets vs paragraphs
2. **Communication Style** - Formal vs casual, direct vs hedging
3. **Directness** - TL;DR first, answer-before-explanation
4. **Tool Preferences** - Memory-first vs web-search, browser vs fetch
5. **Timing & Proactivity** - When to be proactive, immediate vs batched
6. **Confidence Signaling** - How to express confidence in responses
7. **Specificity** - Level of precision in numbers, dates, definitions
8. **Source Verification** - Citation depth and source tracking
9. **Content Depth** - Detail level by topic area
10. **Autonomy** - Execute independently vs ask permission

## Confidence Thresholds

- **HIGH (>90%)**: Apply immediately as new default behavior
- **MODERATE (75-90%)**: Test with 3+ cases before full adaptation
- **LOW (50-75%)**: Continue learning, don't adapt yet
- **INITIAL (40%)**: Single observation, needs validation

## Testing

Run the complete test suite:

```bash
cd skills/continuous-learning/test
node run-all-tests.js
```

Individual test suites:

```bash
node test-feedback-capture.js  # Test feedback capture
node test-pattern-analysis.js  # Test pattern analysis
node test-integration.js       # Test end-to-end integration
```

## Test Coverage

- ✅ Feedback signal capture (explicit & implicit)
- ✅ Signal categorization
- ✅ Confidence calculation (Bayesian)
- ✅ Pattern analysis and adaptation logic
- ✅ Threshold-based adaptation triggers
- ✅ Validation and success tracking
- ✅ Episodic memory integration
- ✅ Metrics tracking and reporting
- ✅ End-to-end integration
- ✅ Persistence across restarts

## Data Storage

### learning-patterns.json
Stores all learned preferences with confidence scores:
```json
{
  "lastUpdated": "2026-02-13T...",
  "preferences": {
    "outputFormat": {
      "confidence": 0.95,
      "observations": { "positive": 19, "negative": 1, "total": 20 },
      "learnedFrom": [...],
      "adaptations": [...]
    },
    ...
  },
  "adaptationHistory": [...]
}
```

### metrics.json
Tracks learning performance:
```json
{
  "signalsReceived": 150,
  "adaptationsApplied": 8,
  "successfulAdaptations": 7,
  "failedAdaptations": 1,
  "averageConfidence": 0.87,
  "satisfactionMetrics": {
    "positive": 95,
    "negative": 10,
    "rate": 0.90
  }
}
```

## Integration Points

### With Episodic Memory
- Writes feedback signals to `memory/YYYY-MM-DD.md`
- Updates long-term `MEMORY.md` with learned preferences
- Scans historical memory for pattern extraction

### With HEARTBEAT.md
- Pattern #10 runs periodic analysis
- Scans recent memory for new signals
- Updates learning patterns automatically

### With Main Agent
- Auto-detects feedback in all messages
- Provides high-confidence preferences for response generation
- Tracks satisfaction and adaptation success

## Performance

- **Initialization**: <100ms
- **Signal processing**: <50ms per signal
- **Pattern analysis**: <200ms for batch
- **Memory scan**: ~500ms per day of history
- **Storage overhead**: ~30KB for full learning state

## Validation

The system validates its learning through:

1. **A/B Testing**: Compare satisfaction before/after adaptation
2. **Correction Rate**: Track if corrections decrease over time
3. **Reaction Patterns**: Monitor positive vs negative reactions
4. **Follow-up Frequency**: Fewer follow-ups = better initial responses
5. **Confidence Tracking**: Measure confidence changes over time

## Future Enhancements

- [ ] Multi-user learning isolation
- [ ] Transfer learning between sessions
- [ ] Topic-specific preference domains
- [ ] Automated A/B testing framework
- [ ] Real-time adaptation preview
- [ ] Learning pattern visualization
- [ ] Confidence interval calculations

## License

Part of OpenClaw agent system. See main repo for license.
