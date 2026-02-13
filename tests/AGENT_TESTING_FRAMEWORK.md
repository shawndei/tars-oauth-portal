# Automated Testing Framework for Agent Systems

A comprehensive testing framework for validating agent behavior, reliability, and quality across 5 specialist agents (Researcher, Analyst, Coder, Writer, Coordinator).

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Usage](#usage)
5. [Test Suites](#test-suites)
6. [Quality Metrics](#quality-metrics)
7. [Regression Testing](#regression-testing)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)

## Overview

### What is It?

The framework provides:

- **Agent Test Harness**: Spawn agents, provide input, capture output, validate results
- **Comprehensive Test Suites**: Unit and integration tests for all 5 agents
- **Quality Metrics**: Accuracy, latency, cost, and coherence measurement
- **Regression Testing**: Catch breaking changes and performance degradation
- **CI/CD Integration**: Automated testing on every push/PR

### Key Features

✅ Multi-agent testing support  
✅ Automatic metric collection  
✅ Baseline comparison and regression detection  
✅ Cost tracking and optimization  
✅ Detailed quality reports  
✅ GitHub Actions integration  

## Architecture

```
┌─────────────────────────────────────────┐
│         Test Runner (CLI Entry)         │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┬─────────────┬──────────────┐
    │          │             │              │
    ▼          ▼             ▼              ▼
┌────────┐ ┌─────────┐ ┌──────────┐ ┌───────────┐
│ Unit   │ │ Integ.  │ │Regression│ │ Quality   │
│ Tests  │ │ Tests   │ │ Tests    │ │ Metrics   │
└────┬───┘ └────┬────┘ └────┬─────┘ └─────┬─────┘
     │          │           │             │
     └──────────┼───────────┴─────────────┘
                │
                ▼
        ┌──────────────────┐
        │  Agent Harness   │
        │  - Mock Agents   │
        │  - Execution     │
        │  - Validation    │
        └────────┬─────────┘
                 │
          ┌──────┴──────┐
          ▼             ▼
      ┌────────┐   ┌─────────┐
      │ Metrics│   │Regression│
      │ Store  │   │ Store    │
      └────────┘   └─────────┘
```

## Components

### 1. Agent Test Harness (`agent-test-harness.js`)

Core testing infrastructure.

```javascript
const { AgentTestHarness } = require('./agent-test-harness');

const harness = new AgentTestHarness({
  timeout: 60000,           // Max execution time
  maxRetries: 3,            // Retry failed tests
  captureVerbose: true,     // Detailed logging
  resultDir: './results'    // Where to save results
});

// Execute a single test
const result = await harness.executeTest('my-test', {
  agentId: 'researcher-primary',
  input: { query: 'What is AI?' },
  expectedOutput: { type: 'research-result' },
  validator: async (output, expected) => {
    return {
      passed: output.text.length > 50,
      reason: 'Text too short'
    };
  }
});

// Run full test suite
const suiteResults = await harness.runTestSuite(testCases);
console.log(suiteResults.successRate);
```

**Key Methods:**
- `spawnAgent(agentId, config)` - Create agent instance
- `executeTest(name, testCase)` - Run single test
- `runTestSuite(tests, options)` - Run multiple tests
- `teardown()` - Clean up resources

### 2. Test Suite Factory (`agent-test-suite.js`)

Pre-built test suites for all agents.

```javascript
const { AgentTestSuiteFactory } = require('./agent-test-suite');

// Get all tests
const allTests = AgentTestSuiteFactory.getAllTests();
// {
//   researcher: [...],
//   analyst: [...],
//   coder: [...],
//   writer: [...],
//   coordinator: [...]
// }

// Get tests by agent
const researcherTests = AgentTestSuiteFactory.getTestsByAgent('researcher-primary');
```

**Available Test Types:**

**Researcher (4 tests):**
- Simple query research
- Synthesis of multiple topics
- Fact-checking
- Data aggregation

**Analyst (4 tests):**
- Data analysis and trends
- Pattern recognition
- Metrics calculation
- Report generation

**Coder (4 tests):**
- Code generation
- Bug fixing
- Architecture design
- Code review

**Writer (4 tests):**
- Content creation
- Documentation
- Text editing
- Summarization

**Coordinator (4 tests):**
- Task decomposition
- Agent delegation
- Result synthesis
- Quality validation

### 3. Quality Metrics (`quality-metrics.js`)

Measures and tracks quality across 6 dimensions.

```javascript
const { QualityMetrics } = require('./quality-metrics');

const metrics = new QualityMetrics();

// Record measurements
metrics.recordMetric('accuracy', 0.95, { agentId: 'researcher' });
metrics.recordMetric('latency', 2500, { agentId: 'researcher' });
metrics.recordMetric('cost', 0.025, { agentId: 'researcher' });

// Calculate specific metrics
const accuracy = metrics.calculateAccuracy(actual, expected);
const latency = metrics.calculateLatency(startTime, endTime);
const cost = metrics.calculateCost(tokensUsed, 'anthropic/claude-haiku-4-5');
const coherence = metrics.calculateCoherence(outputText);

// Get summary
const summary = metrics.getSummaryMetrics();
const report = metrics.generateReport();
await metrics.saveMetrics('metrics.json');
```

**Metric Definitions:**

| Metric | Type | Target | Status |
|--------|------|--------|--------|
| Accuracy | % | ≥95% | Measures output correctness |
| Latency | ms | ≤5000ms | End-to-end execution time |
| Cost | $ | ≤$0.25 | Per-task cost |
| Coherence | % | ≥95% | Output logical flow |
| Reliability | % | ≥99% | Success rate |
| Throughput | tasks/min | ≥20 | Performance rate |

### 4. Regression Test Suite (`regression-test-suite.js`)

Detects breaking changes and performance degradation.

```javascript
const { RegressionTestSuite } = require('./regression-test-suite');

const regressionSuite = new RegressionTestSuite({
  baselineDir: './baselines',
  tolerancePercentage: 10  // Allow 10% deviation
});

// Run regression tests
const results = await regressionSuite.runRegressionSuite(testCases);

// Check results
if (results.regressions > 0) {
  console.error('Regressions detected!');
}

// Generate report
const report = regressionSuite.generateRegressionReport();
```

**How It Works:**

1. **Baseline**: First run establishes baseline metrics
2. **Comparison**: Subsequent runs compare against baseline
3. **Tolerance**: Allows configurable deviation (default 10%)
4. **Regression**: Flags metrics that exceed tolerance
5. **Improvement**: Tracks performance improvements

### 5. Test Runner (`test-runner.js`)

Orchestrates all testing phases.

```bash
# Run all tests
node tests/test-runner.js

# Run specific test type
node tests/test-runner.js --integration
node tests/test-runner.js --regression

# Quiet mode
node tests/test-runner.js --quiet
```

## Usage

### Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific type
npm run test:unit
npm run test:integration
npm run test:regression
```

### Add to package.json

```json
{
  "scripts": {
    "test": "node tests/test-runner.js",
    "test:unit": "node tests/test-runner.js",
    "test:integration": "node tests/test-runner.js --integration",
    "test:regression": "node tests/test-runner.js --regression",
    "test:metrics": "node tests/test-runner.js && node -e \"console.log(require('./tests/quality-metrics').generateReport())\""
  }
}
```

### Create Custom Tests

```javascript
const testCase = {
  name: 'my-custom-test',
  agentId: 'researcher-primary',
  input: {
    query: 'What are the latest trends?',
    type: 'research'
  },
  expectedOutput: {
    type: 'research-result',
    hasContext: true
  },
  validator: async (output, expected) => {
    const passed = output && output.text && output.text.length > 100;
    return {
      passed,
      reason: passed ? 'Valid' : 'Too short',
      checks: {
        hasText: !!output.text,
        isComplete: output.text.length > 100
      }
    };
  }
};

const harness = new AgentTestHarness();
const result = await harness.executeTest(testCase.name, testCase);
```

## Test Suites

### Unit Tests

**Purpose:** Validate individual agent capabilities

**Scope:** First 2 tests per agent

**Coverage:**
- Basic functionality
- Error handling
- Input/output validation

**Example Output:**
```
✓ Unit tests: 10/10 passed
  Average latency: 2345ms
  Total cost: $0.0234
```

### Integration Tests

**Purpose:** Validate multi-agent workflows and interactions

**Scope:** All 4 tests per agent (20 total)

**Coverage:**
- Agent cooperation
- Result synthesis
- Error recovery
- Performance under load

**Example Output:**
```
✓ Integration tests: 20/20 passed
  Success rate: 100%
  Average cost: $0.00312
```

### Regression Tests

**Purpose:** Detect breaking changes and performance degradation

**Scope:** All 4 tests per agent (20 total)

**Coverage:**
- Baseline comparison
- Performance trends
- API stability
- Output format changes

**Example Output:**
```
✓ Regression tests: 20/20 passed
  Regressions: 0
  Improvements: 3
```

## Quality Metrics

### Accuracy

**Definition:** How closely actual output matches expected output

**Range:** 0-100%

**Target:** ≥95%

**Calculation:**
```
accuracy = (matching_tokens / expected_tokens) * 100
```

### Latency

**Definition:** Total time from input to output

**Range:** milliseconds

**Target:** ≤5000ms

**Components:**
- Agent initialization: ~100ms
- Model inference: ~2000ms
- Output validation: ~500ms

### Cost

**Definition:** Estimated API cost per task

**Range:** dollars

**Target:** ≤$0.25

**Model Costs:**
- Haiku: $0.008/KToken
- Sonnet: $0.18/KToken
- Opus: $0.75/KToken

### Coherence

**Definition:** Logical flow and consistency of output

**Range:** 0-100%

**Target:** ≥95%

**Factors:**
- Sentence structure
- Vocabulary richness
- Logical connections
- Error indicators

### Reliability

**Definition:** Consistent success across runs

**Range:** 0-100%

**Target:** ≥99%

**Calculation:**
```
reliability = (passed_tests / total_tests) * 100
```

### Throughput

**Definition:** Tasks completed per minute

**Range:** tasks/minute

**Target:** ≥20

**Calculation:**
```
throughput = (completed_tasks / duration_minutes)
```

## Regression Testing

### Baseline Management

```javascript
// Load baseline
const baseline = regressionSuite.loadBaseline('my-test');

// Save baseline
await regressionSuite.saveBaseline('my-test', metrics);

// Compare
const comparison = regressionSuite.compareWithBaseline('my-test', current);
if (comparison.hasRegression) {
  console.error('Regression detected!');
}
```

### Continuous Monitoring

```javascript
const { ContinuousRegressionMonitor } = require('./regression-test-suite');

const monitor = new ContinuousRegressionMonitor({
  windowSize: 10  // Track last 10 results
});

// Record results
monitor.recordResult('my-test', metrics);

// Detect trends
const trends = monitor.detectTrends('my-test');
// { metric: 'improving'|'stable'|'degrading' }

// Get health report
const report = monitor.getHealthReport();
```

## CI/CD Integration

### GitHub Actions Workflow

The framework includes a complete GitHub Actions workflow (`.github/workflows/test-agents.yml`) that:

1. **Unit Tests** (30 min timeout)
   - Runs on: every push, every PR, daily schedule
   - Tests: Basic functionality
   - Artifacts: Test results

2. **Integration Tests** (45 min timeout)
   - Depends on: Unit tests passing
   - Tests: Multi-agent workflows
   - Artifacts: Quality metrics

3. **Regression Tests** (60 min timeout)
   - Depends on: Integration tests passing
   - Tests: Breaking changes detection
   - Artifacts: Regression results

4. **Quality Check** (15 min timeout)
   - Validates: All metrics within targets
   - Fails on: Critical issues

5. **Reporting** (10 min timeout)
   - Generates: Summary report
   - Notifies: On failure

### Trigger Events

```yaml
# Every push to main/develop
on:
  push:
    branches: [ main, develop ]

# Every pull request
on:
  pull_request:
    branches: [ main, develop ]

# Daily at 2 AM UTC
schedule:
  - cron: '0 2 * * *'

# Manual trigger
workflow_dispatch:
  inputs:
    testType:
      description: 'Type of test (all, unit, integration, regression)'
```

### Environment Variables

```yaml
NODE_VERSION: '18'
AGENT_TIMEOUT: '60000'
CI: true
```

### PR Comments

The workflow automatically comments on PRs with test results:

```
## 📊 Agent Test Results

**Unit Tests**: 10/10 passed
**Success Rate**: 100%
```

## Troubleshooting

### Common Issues

**Issue: Tests timing out**
```
Solution: Increase AGENT_TIMEOUT environment variable
export AGENT_TIMEOUT=120000
```

**Issue: Cost metrics not recording**
```
Solution: Ensure model costs are configured in QualityMetrics
getModelCost('anthropic/claude-haiku-4-5')  // Should return 0.008
```

**Issue: Regression false positives**
```
Solution: Increase tolerance percentage
new RegressionTestSuite({ tolerancePercentage: 15 })
```

**Issue: Agent spawn failures**
```
Solution: Check agent configuration in multi-agent-config.json
Verify agent IDs match: researcher-primary, analyst-primary, etc.
```

### Debug Mode

```javascript
const harness = new AgentTestHarness({
  captureVerbose: true,  // Detailed logging
  mockMode: false        // Use real agents
});

harness.on('test-completed', (result) => {
  console.log('Test completed:', result);
});

harness.on('agent-spawned', ({ agentId, timestamp }) => {
  console.log(`Agent ${agentId} spawned at ${timestamp}`);
});
```

### View Detailed Results

```bash
# List all results
ls tests/results/

# View latest result
cat tests/results/test-results-*.json | tail -1

# View metrics
cat tests/metrics/agent-test-metrics-*.json

# View regression results
cat tests/regression-results/regression-results-*.json
```

## Performance Optimization

### Parallel Execution

```javascript
// Run tests in parallel with limit
await harness.runTestSuite(tests, {
  parallel: true,
  parallelLimit: 4
});
```

### Model Selection

```javascript
// Use cheaper models for tests
const testConfig = {
  agentId: 'researcher-primary',
  agentConfig: {
    model: 'anthropic/claude-haiku-4-5'  // Cheaper, faster
  }
};
```

### Result Caching

```javascript
// Cache results to avoid re-computation
const cachedResults = new Map();

if (cachedResults.has(testId)) {
  return cachedResults.get(testId);
}

const result = await harness.executeTest(name, testCase);
cachedResults.set(testId, result);
```

## Best Practices

1. **Run tests before committing**
   ```bash
   npm test
   ```

2. **Review quality metrics regularly**
   ```bash
   node -e "const {QualityMetrics} = require('./tests/quality-metrics'); console.log(new QualityMetrics().generateReport())"
   ```

3. **Monitor regressions actively**
   - Check CI/CD workflow results
   - Review baselines monthly
   - Update tolerances as needed

4. **Maintain test baselines**
   - Commit `tests/baselines/` to version control
   - Update when intentional changes are made
   - Never delete baselines

5. **Add tests for new features**
   - Create test case for each agent capability
   - Define clear expected outputs
   - Include validator function

## Support & Documentation

- **Tests Location:** `tests/`
- **Test Harness:** `tests/agent-test-harness.js`
- **Test Suites:** `tests/agent-test-suite.js`
- **Quality Metrics:** `tests/quality-metrics.js`
- **Regression Suite:** `tests/regression-test-suite.js`
- **Test Runner:** `tests/test-runner.js`
- **CI/CD:** `.github/workflows/test-agents.yml`

For issues or questions, refer to the inline documentation in each file.
