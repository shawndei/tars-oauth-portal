# Agent Testing Framework

Comprehensive automated testing for agent systems with quality metrics, regression detection, and CI/CD integration.

## Quick Links

- 🚀 **Quick Start**: See `QUICK_START.md`
- 📖 **Full Documentation**: See `AGENT_TESTING_FRAMEWORK.md`
- 📋 **Delivery Summary**: See `../AGENT_TESTING_FRAMEWORK_COMPLETE.md`

## What's Included

### Test Infrastructure

| File | Purpose | Size |
|------|---------|------|
| `agent-test-harness.js` | Core testing harness | 11.7 KB |
| `agent-test-suite.js` | Test definitions for 5 agents | 19.6 KB |
| `quality-metrics.js` | Metrics collection & analysis | 14.7 KB |
| `regression-test-suite.js` | Regression & trend detection | 13.2 KB |
| `test-runner.js` | Main orchestrator | 9.1 KB |

### Documentation

| File | Purpose | Size |
|------|---------|------|
| `QUICK_START.md` | Get started in 5 minutes | 8.4 KB |
| `AGENT_TESTING_FRAMEWORK.md` | Full reference guide | 15.6 KB |
| `README.md` | This file | ~ KB |

### Data Storage

| Directory | Purpose |
|-----------|---------|
| `results/` | Test execution results |
| `metrics/` | Quality metrics data |
| `regression-results/` | Regression test reports |
| `baselines/` | Baseline metrics for regression |

## Getting Started (2 min)

```bash
# Run all tests
node tests/test-runner.js

# Or run specific type
node tests/test-runner.js --integration
node tests/test-runner.js --regression

# View latest results
ls -t results/ | head -1
```

## Test Coverage

**20 Tests Per Suite Type**

- 5 Agents × 4 Tests Each
- Agents: Researcher, Analyst, Coder, Writer, Coordinator
- Tests: Unit, Integration, Regression

## Quality Metrics

Tracks 6 dimensions:
- **Accuracy** (Target: ≥95%)
- **Latency** (Target: ≤5000ms)
- **Cost** (Target: ≤$0.25)
- **Coherence** (Target: ≥95%)
- **Reliability** (Target: ≥99%)
- **Throughput** (Target: ≥20 tasks/min)

## CI/CD Integration

Tests run automatically on:
- Every push to main/develop
- Every pull request
- Daily at 2 AM UTC
- Manual trigger

Workflow: `.github/workflows/test-agents.yml`

## Common Commands

```bash
# Run all tests
npm test
# or
node tests/test-runner.js

# Run specific suite
node tests/test-runner.js --integration
node tests/test-runner.js --regression

# Quiet mode
node tests/test-runner.js --quiet

# View results
cat results/test-results-*.json | tail -1

# View metrics
cat metrics/agent-test-metrics-*.json | tail -1

# Check agent performance
node -e "const {QualityMetrics} = require('./quality-metrics'); console.log(new QualityMetrics().generateReport())"
```

## Test Types

### Unit Tests (30 min)
- Basic functionality
- Error handling
- Input/output validation
- **Scope**: 2 tests per agent (10 total)

### Integration Tests (45 min)
- Multi-agent workflows
- Result synthesis
- Error recovery
- **Scope**: 4 tests per agent (20 total)

### Regression Tests (60 min)
- Breaking change detection
- Performance trends
- API stability
- **Scope**: 4 tests per agent (20 total)

## Agent Tests

### Researcher
1. Simple query research
2. Topic synthesis
3. Fact-checking
4. Data aggregation

### Analyst
1. Data analysis & trends
2. Pattern recognition
3. Metrics calculation
4. Report generation

### Coder
1. Code generation
2. Bug fixing
3. Architecture design
4. Code review

### Writer
1. Content creation
2. Documentation
3. Text editing
4. Summarization

### Coordinator
1. Task decomposition
2. Agent delegation
3. Result synthesis
4. Quality validation

## Usage Examples

### Run All Tests
```bash
node tests/test-runner.js
```

Output:
```
🚀 Starting comprehensive agent testing framework

📝 Running unit tests...
✓ Unit tests: 10/10 passed
  Average latency: 2345ms
  Total cost: $0.0234

🔗 Running integration tests...
✓ Integration tests: 20/20 passed
  Success rate: 100%

🔄 Running regression tests...
✓ Regression tests: 20/20 passed
  Regressions detected: 0

✅ Test suite completed in 125.34s
```

### Create Custom Test
```javascript
const { AgentTestHarness } = require('./agent-test-harness');

const harness = new AgentTestHarness();

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

console.log(result.status);  // 'passed' or 'failed'
```

### Check Quality Metrics
```javascript
const { QualityMetrics } = require('./quality-metrics');
const metrics = new QualityMetrics();
const report = metrics.generateReport();

console.log(report.overallHealth);
// { score: '0.92', status: 'excellent' }

console.log(report.metrics.accuracy);
// { min: 0.85, max: 0.98, avg: 0.92, status: 'excellent' }
```

### Detect Regressions
```javascript
const { RegressionTestSuite } = require('./regression-test-suite');
const suite = new RegressionTestSuite();

const baseline = suite.loadBaseline('my-test');
const comparison = suite.compareWithBaseline('my-test', current);

if (comparison.hasRegression) {
  console.log('Regression detected!');
  console.log(comparison.changes);
}
```

## Troubleshooting

### Tests timing out?
```bash
AGENT_TIMEOUT=120000 node tests/test-runner.js
```

### Dependencies missing?
```bash
npm ci
```

### Want to clear results?
```bash
rm -rf results/* metrics/* regression-results/*
```

### Need verbose output?
```bash
node tests/test-runner.js  # Default is verbose
# Use --quiet to suppress
node tests/test-runner.js --quiet
```

## Performance

- **Unit Tests**: ~30 seconds
- **Integration Tests**: ~45 seconds
- **Regression Tests**: ~60 seconds
- **Total Suite**: ~2 minutes

*With mock agents. Real API calls will be slower.*

## Architecture

```
Test Runner
    ├── Unit Tests (2 per agent)
    │   └── Agent Harness
    │       ├── Spawn Agent
    │       ├── Execute
    │       ├── Validate
    │       └── Record Metrics
    │
    ├── Integration Tests (4 per agent)
    │   └── Multi-agent workflows
    │
    └── Regression Tests (4 per agent)
        ├── Load Baseline
        ├── Compare Metrics
        ├── Detect Regressions
        └── Report Results
```

## Metrics Explained

### Accuracy
How correct is the output? (0-100%)
```
accuracy = (matching_tokens / expected_tokens) * 100
```

### Latency
How fast does it run? (milliseconds)
```
latency = end_time - start_time
```

### Cost
How expensive? (dollars)
```
cost = (tokens_used / 1000) * cost_per_k_token
```

### Coherence
Is output logical? (0-100%)
Based on:
- Sentence structure
- Vocabulary richness
- Logical connections
- Error indicators

### Reliability
Does it consistently succeed? (0-100%)
```
reliability = (passed_tests / total_tests) * 100
```

### Throughput
How many tasks/minute?
```
throughput = tasks_completed / duration_minutes
```

## Files Overview

```
tests/
├── agent-test-harness.js       # Core harness (11.7 KB)
│   └── AgentTestHarness        # Main class
│   └── MockAgent               # For testing
│
├── agent-test-suite.js         # Test definitions (19.6 KB)
│   └── AgentTestSuiteFactory   # Creates test suites
│
├── quality-metrics.js          # Metrics (14.7 KB)
│   └── QualityMetrics          # Metrics system
│
├── regression-test-suite.js    # Regression (13.2 KB)
│   ├── RegressionTestSuite     # Main suite
│   └── ContinuousRegressionMonitor
│
├── test-runner.js              # Orchestrator (9.1 KB)
│   └── TestRunner              # Main runner
│
├── results/                    # Test results (JSON)
├── metrics/                    # Metrics data (JSON)
├── regression-results/         # Regression reports (JSON)
├── baselines/                  # Baseline metrics (JSON)
│
├── QUICK_START.md              # 5-min start guide
├── AGENT_TESTING_FRAMEWORK.md  # Full reference
└── README.md                   # This file
```

## Next Steps

1. ✅ Run tests: `node tests/test-runner.js`
2. ✅ View results: `ls -t results/`
3. ✅ Read docs: `AGENT_TESTING_FRAMEWORK.md`
4. ✅ Add custom tests: Extend `agent-test-suite.js`
5. ✅ Set up CI/CD: Commit `.github/workflows/test-agents.yml`
6. ✅ Monitor metrics: Run tests regularly

## Support

- **Documentation**: `AGENT_TESTING_FRAMEWORK.md`
- **Quick Start**: `QUICK_START.md`
- **Inline Help**: JSDoc in source files
- **Examples**: Throughout documentation

## Version

- **Framework**: 1.0
- **Status**: Production Ready
- **Last Updated**: 2026-02-13

---

**Start testing now!**
```bash
node tests/test-runner.js
```
