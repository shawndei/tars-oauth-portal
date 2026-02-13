# Agent Testing Framework - Quick Start

Get up and running with the automated testing framework in 5 minutes.

## Installation

```bash
# Navigate to workspace
cd C:\Users\DEI\.openclaw\workspace

# Install dependencies (if not already done)
npm install

# Verify installation
node tests/test-runner.js --help
```

## Run Tests

### Option 1: Run Everything
```bash
node tests/test-runner.js
```

Expected output:
```
🚀 Starting comprehensive agent testing framework

📝 Running unit tests...
✓ Unit tests: 10/10 passed
  Average latency: 2345ms
  Total cost: $0.0234

🔗 Running integration tests...
✓ Integration tests: 20/20 passed
  Success rate: 100%
  Average cost: $0.00312

🔄 Running regression tests...
✓ Regression tests: 20/20 passed
  Regressions detected: 0
  Improvements: 3

✅ Test suite completed in 125.34s
```

### Option 2: Run Specific Type
```bash
# Unit tests only
node tests/test-runner.js

# Integration tests
node tests/test-runner.js --integration

# Regression tests
node tests/test-runner.js --regression

# Quiet mode (no verbose output)
node tests/test-runner.js --quiet
```

## View Results

### Test Results
```bash
# View latest results
ls -t tests/results/ | head -1 | xargs -I {} cat tests/results/{}
```

### Quality Metrics
```bash
# View latest metrics
ls -t tests/metrics/ | head -1 | xargs -I {} cat tests/metrics/{}
```

### Regression Results
```bash
# View latest regression results
ls -t tests/regression-results/ | head -1 | xargs -I {} cat tests/regression-results/{}
```

## Test Structure

### 5 Specialist Agents

Each agent has 4 different tests:

| Agent | Tests | Focus |
|-------|-------|-------|
| **Researcher** | Simple query, synthesis, fact-checking, data aggregation | Information gathering |
| **Analyst** | Data analysis, pattern recognition, metrics, reporting | Analysis |
| **Coder** | Code generation, bug fixing, architecture, code review | Development |
| **Writer** | Content creation, documentation, editing, summarization | Writing |
| **Coordinator** | Task decomposition, delegation, synthesis, validation | Orchestration |

**Total: 20 test cases**

### Test Suite Breakdown

```
Unit Tests (2 per agent = 10 tests)
├── Basic functionality
├── Error handling
└── Input/output validation

Integration Tests (4 per agent = 20 tests)
├── Multi-agent workflows
├── Result synthesis
├── Error recovery
└── Performance under load

Regression Tests (4 per agent = 20 tests)
├── Baseline comparison
├── Performance trends
├── API stability
└── Output format changes
```

## Quality Metrics

### What Gets Measured

1. **Accuracy** (Target: ≥95%)
   - How correct is the output?

2. **Latency** (Target: ≤5000ms)
   - How fast does it run?

3. **Cost** (Target: ≤$0.25)
   - How expensive is it?

4. **Coherence** (Target: ≥95%)
   - Is the output logical and consistent?

5. **Reliability** (Target: ≥99%)
   - Does it consistently succeed?

6. **Throughput** (Target: ≥20 tasks/min)
   - How many tasks per minute?

### View Metrics

```javascript
// Quick metric check
const { QualityMetrics } = require('./tests/quality-metrics');
const metrics = new QualityMetrics();
const report = metrics.generateReport();

console.log('Overall Health:', report.overallHealth);
console.log('Accuracy:', report.metrics.accuracy);
console.log('Latency:', report.metrics.latency);
console.log('Cost:', report.metrics.cost);
console.log('Coherence:', report.metrics.coherence);
```

## Common Tasks

### Add a New Test

1. **Create test case** in `agent-test-suite.js`:

```javascript
{
  name: 'my-test',
  agentId: 'researcher-primary',
  input: { /* test input */ },
  expectedOutput: { /* expected output */ },
  validator: async (output, expected) => {
    return {
      passed: output.text.length > 50,
      reason: 'Valid' or 'Too short'
    };
  }
}
```

2. **Run tests** to see it in action:
```bash
node tests/test-runner.js
```

### Check Agent Performance

```javascript
const { QualityMetrics } = require('./tests/quality-metrics');
const metrics = new QualityMetrics();

// View per-agent metrics
const researcherMetrics = metrics.getAgentMetrics('researcher-primary');
console.log('Researcher:', researcherMetrics);

const coderMetrics = metrics.getAgentMetrics('coder-primary');
console.log('Coder:', coderMetrics);
```

### Detect Regressions

```javascript
const { RegressionTestSuite } = require('./tests/regression-test-suite');
const suite = new RegressionTestSuite();

// Load baseline
const baseline = suite.loadBaseline('my-test');

// Check current metrics
const current = { accuracy: 0.92, latency: 3500 };

// Compare
const comparison = suite.compareWithBaseline('my-test', current);
if (comparison.hasRegression) {
  console.log('⚠️ Regression detected!');
  console.log(comparison.changes);
}
```

## Understanding Results

### Success Example
```json
{
  "testName": "researcher-simple-query",
  "status": "passed",
  "duration": 2450,
  "metrics": {
    "latency": 2450,
    "accuracy": 0.98,
    "cost": 0.0234,
    "coherenceScore": 0.96
  }
}
```

✅ **Status**: Passed
✅ **Latency**: 2450ms (well under 5000ms target)
✅ **Accuracy**: 98% (exceeds 95% target)
✅ **Cost**: $0.0234 (well under $0.25 target)
✅ **Coherence**: 96% (exceeds 95% target)

### Failure Example
```json
{
  "testName": "coder-code-generation",
  "status": "failed",
  "error": "Validation failed: Code is incomplete",
  "duration": 8500,
  "retryCount": 3
}
```

❌ **Status**: Failed after 3 retries
❌ **Error**: Code generation incomplete
⚠️ **Duration**: 8500ms (exceeded 5000ms timeout)

## GitHub Actions

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Daily at 2 AM UTC
- Manual trigger (workflow_dispatch)

### View CI/CD Results

1. Go to repository
2. Click **Actions** tab
3. Find **Agent Testing Framework** workflow
4. Click to view details

### PR Comments

When you open a PR, the bot comments with:
```
## 📊 Agent Test Results

**Unit Tests**: 10/10 passed
**Success Rate**: 100%
```

## Troubleshooting

### Tests Won't Run

**Check Node.js version:**
```bash
node --version  # Should be v18+
```

**Reinstall dependencies:**
```bash
npm ci
```

### Tests Timing Out

**Increase timeout:**
```bash
AGENT_TIMEOUT=120000 node tests/test-runner.js
```

### Cost Metrics Wrong

**Check model configuration:**
```bash
cat multi-agent-config.json | grep costPerKToken
```

### Regression False Alarms

**Increase tolerance:**
```javascript
new RegressionTestSuite({ tolerancePercentage: 15 })  // Default: 10%
```

## Performance Tips

### Faster Execution
```bash
# Run only unit tests for quick validation
node tests/test-runner.js --quiet
```

### Parallel Execution
Tests automatically run in parallel where possible. For even more parallelism:

```javascript
await harness.runTestSuite(tests, {
  parallel: true,
  parallelLimit: 6  // Increase from default 4
});
```

### Use Cheaper Models
```javascript
// In agent config, prefer haiku models
model: 'anthropic/claude-haiku-4-5'  // Cheaper, faster
```

## Next Steps

1. **Review full documentation**: See `AGENT_TESTING_FRAMEWORK.md`
2. **Set up CI/CD**: Ensure `.github/workflows/test-agents.yml` is deployed
3. **Add custom tests**: Extend `agent-test-suite.js` with your cases
4. **Monitor metrics**: Set up alerts for critical metrics
5. **Establish baselines**: Run regression suite to establish baselines

## File Locations

```
C:\Users\DEI\.openclaw\workspace\
├── tests/
│   ├── agent-test-harness.js      # Core harness
│   ├── agent-test-suite.js        # Test definitions
│   ├── quality-metrics.js         # Metrics system
│   ├── regression-test-suite.js   # Regression testing
│   ├── test-runner.js             # Main entry point
│   ├── results/                   # Test results
│   ├── metrics/                   # Metrics data
│   ├── regression-results/        # Regression results
│   ├── baselines/                 # Baseline metrics
│   ├── AGENT_TESTING_FRAMEWORK.md # Full docs
│   └── QUICK_START.md             # This file
│
└── .github/
    └── workflows/
        └── test-agents.yml        # CI/CD workflow
```

## Need Help?

Check the comprehensive documentation:
```bash
cat tests/AGENT_TESTING_FRAMEWORK.md
```

Or review examples in:
```bash
cat tests/agent-test-harness.js    # Extensive JSDoc
cat tests/test-runner.js           # Usage examples
```

---

**Ready? Start testing!**
```bash
node tests/test-runner.js
```
