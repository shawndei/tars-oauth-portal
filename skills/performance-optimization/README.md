# Performance Benchmarking Framework

Automated performance monitoring, regression detection, and optimization validation for OpenClaw.

## 🚀 Quick Start

### Run Full Benchmark Suite

```bash
cd skills/performance-optimization
node tests/benchmarks/benchmark-runner.js
```

### Run Tests

```bash
node tests/test-framework.js
```

### Quick Mode (Fewer Iterations)

```bash
node tests/benchmarks/benchmark-runner.js --quick
```

## 📊 Features

### 1. Automated Benchmark Runner

- **Multiple Test Suites:** Tools, models, memory, agents, and integration tests
- **Configurable Iterations:** Quick mode for development, full mode for production
- **Parallel Execution:** Run multiple benchmarks efficiently
- **CLI Interface:** Easy command-line usage

### 2. Comprehensive Metrics Collection

Tracks four key metric categories:

#### Latency Metrics
- p50, p90, p95, p99 percentiles
- Min, max, mean, standard deviation
- Per-operation breakdown

#### Throughput Metrics
- Operations per second
- Requests per minute
- Concurrent capacity

#### Cost Metrics
- Cost per operation
- Token usage per operation
- Total cost tracking
- API call efficiency

#### Accuracy Metrics
- Success rate
- Error rate
- Retry counts
- Quality scores

### 3. Performance Regression Detection

Automatically detects regressions in:

- **Latency:** ≥15% slower triggers warning, ≥30% critical
- **Throughput:** ≥15% lower triggers warning, ≥30% critical
- **Cost:** ≥10% more expensive triggers warning, ≥25% critical
- **Memory:** ≥25% more memory triggers warning, ≥50% critical
- **Accuracy:** ≥2% less accurate triggers warning, ≥5% critical

**Baseline Management:**
- Auto-baseline creation on first run
- Historical baseline archiving
- Auto-update on consistent improvements

### 4. Visual Reporting

#### HTML Reports
- Interactive charts (Chart.js)
- Detailed metrics tables
- Regression highlights
- Historical trends

#### JSON Reports
- Machine-readable format
- CI/CD integration friendly
- Full metrics export
- Programmatic access

### 5. CI/CD Integration

#### GitHub Actions
- Automatic PR benchmarks
- Regression alerts on PRs
- Weekly scheduled runs
- Baseline auto-updates

#### Exit Codes
- `0`: All tests passed, no critical regressions
- `1`: Critical regressions detected

## 🔧 Usage

### Basic Commands

```bash
# Run all benchmarks
node tests/benchmarks/benchmark-runner.js

# Run with baseline comparison
node tests/benchmarks/benchmark-runner.js --compare

# Create baseline
node tests/benchmarks/benchmark-runner.js --create-baseline

# Update baseline if improved
node tests/benchmarks/benchmark-runner.js --update-baseline

# Run specific suite
node tests/benchmarks/benchmark-runner.js --suite=tools
node tests/benchmarks/benchmark-runner.js --suite=models
node tests/benchmarks/benchmark-runner.js --suite=memory

# Quick mode (fewer iterations)
node tests/benchmarks/benchmark-runner.js --quick
```

### Test Framework

```bash
# Run all framework tests
node tests/test-framework.js

# Expected output:
#   ✓ Metrics collection works
#   ✓ Statistical calculations correct
#   ✓ Regression detection accurate
#   ✓ Baseline management functional
#   ✓ Report generation successful
```

## 📁 Project Structure

```
skills/performance-optimization/
├── tests/
│   ├── benchmarks/
│   │   ├── benchmark-runner.js       # Main orchestrator
│   │   ├── lib/
│   │   │   ├── metrics.js            # Metrics collection
│   │   │   ├── regression.js         # Regression detection
│   │   │   └── reporter.js           # Report generation
│   │   ├── suites/
│   │   │   ├── tools.js              # Tool benchmarks
│   │   │   ├── models.js             # Model benchmarks
│   │   │   └── memory.js             # Memory benchmarks
│   │   ├── baselines/
│   │   │   ├── baseline.json         # Current baseline
│   │   │   └── archive/              # Historical baselines
│   │   └── reports/
│   │       ├── latest.html           # Most recent HTML report
│   │       ├── latest.json           # Most recent JSON report
│   │       └── [timestamp].html      # Historical reports
│   └── test-framework.js             # Framework validation tests
├── .github/
│   └── workflows/
│       └── performance-benchmarks.yml # CI/CD integration
├── SKILL.md                          # Skill documentation
├── BENCHMARK.md                      # Benchmarking documentation
└── README.md                         # This file
```

## 📈 Example Output

### Console Output

```
╔════════════════════════════════════════════════════╗
║   OpenClaw Performance Benchmark Suite v1.0        ║
╚════════════════════════════════════════════════════╝

[INFO] Starting benchmark run: 2026-02-13 09:30:15
[INFO] Mode: Full suite
[INFO] Baseline loaded: 2026-02-12T10:00:00Z

┌─────────────────────────────────────────────────┐
│ Suite: Tool Execution Speed                     │
└─────────────────────────────────────────────────┘
  ✓ simple_command               [10 iterations]  ✓
  ✓ echo_command                 [15 iterations]  ✓
  ✓ file_read                    [10 iterations]  ✓

┌─────────────────────────────────────────────────┐
│ Suite: Model Inference Performance              │
└─────────────────────────────────────────────────┘
  ✓ haiku_simple_query           [5 iterations]   ✓
  ✓ haiku_moderate_query         [5 iterations]   ✓
  ✓ sonnet_simple_query          [5 iterations]   ✓
  ✓ sonnet_complex_reasoning     [5 iterations]   ✓

═══════════════════════════════════════════════════
  REGRESSION DETECTION RESULTS
═══════════════════════════════════════════════════
  ✓ No performance regressions detected

  📈 2 improvements detected
    • haiku_simple_query (latency): 15.3% faster
    • file_read (latency): 12.1% faster
═══════════════════════════════════════════════════

═══════════════════════════════════════════════════
  BENCHMARK COMPLETE
═══════════════════════════════════════════════════
  Total Tests:       7
  Total Operations:  55
  Duration:          23.4s
  Avg Latency (p50): 245.32ms
  Total Cost:        $0.0342

  Reports Generated:
    HTML: tests/benchmarks/reports/2026-02-13_093038.html
    JSON: tests/benchmarks/reports/2026-02-13_093038.json
═══════════════════════════════════════════════════
```

### HTML Report

Open `tests/benchmarks/reports/latest.html` in a browser for:

- **Executive Summary** - Total tests, regressions, improvements
- **Interactive Charts** - Latency distributions, throughput comparisons
- **Regression Alerts** - Highlighted critical and warning regressions
- **Detailed Tables** - Per-test metrics breakdown
- **Historical Trends** - Performance over time

## 🎯 Performance Targets

### Latency Targets

| Operation | p50 Target | p95 Target | Current |
|-----------|------------|------------|---------|
| Tool execution | < 100ms | < 500ms | TBD |
| Model (Haiku) | < 800ms | < 2000ms | TBD |
| Model (Sonnet) | < 2000ms | < 5000ms | TBD |
| Memory search | < 50ms | < 200ms | TBD |

### Cost Targets

| Operation | Target Cost | Current |
|-----------|-------------|---------|
| Haiku inference | < $0.002/op | TBD |
| Sonnet inference | < $0.030/op | TBD |
| Overall avg | < $0.010/op | TBD |

### Success Rate

- **Target:** ≥ 98% success rate across all operations
- **Critical Threshold:** < 95% triggers alert

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The framework integrates with GitHub Actions:

1. **On Pull Request:** Runs benchmarks and comments results on PR
2. **On Push to Main:** Updates baseline if improvements detected
3. **Weekly Schedule:** Generates trend analysis report
4. **Manual Trigger:** Can be run on-demand via workflow_dispatch

### Exit Codes

- `0`: Success (no critical regressions)
- `1`: Failure (critical regressions detected)

CI/CD pipelines can block merges on critical regressions.

## 📝 Adding New Benchmarks

### Create New Suite

```javascript
// tests/benchmarks/suites/custom.js
class CustomBenchmarkSuite {
  constructor(metricsCollector) {
    this.collector = metricsCollector;
    this.suiteName = 'Custom Operations';
  }

  async run(config = {}) {
    console.log(`\n┌─────────────────────────────────────────────────┐`);
    console.log(`│ Suite: ${this.suiteName.padEnd(42)} │`);
    console.log(`└─────────────────────────────────────────────────┘`);

    const tests = [
      { name: 'custom_test', fn: this.testCustom.bind(this), iterations: 10 }
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.fn, test.iterations);
    }
  }

  async runTest(testName, testFn, iterations) {
    process.stdout.write(`  ⏳ ${testName.padEnd(30)} [${iterations} iterations]  `);
    
    for (let i = 0; i < iterations; i++) {
      const context = this.collector.startOperation(testName);
      
      try {
        const result = await testFn();
        this.collector.endOperation(context, { 
          success: true, 
          cost: result.cost || 0,
          tokens: result.tokens || 0
        });
      } catch (error) {
        this.collector.endOperation(context, { 
          success: false, 
          error: error.message
        });
      }
    }
    
    console.log(`✓`);
  }

  async testCustom() {
    // Your custom test logic
    const start = Date.now();
    
    // Perform operation
    await this.performOperation();
    
    return {
      success: true,
      cost: 0.001,
      tokens: 100,
      duration: Date.now() - start
    };
  }

  async performOperation() {
    // Custom operation implementation
  }
}

module.exports = CustomBenchmarkSuite;
```

### Register Suite

```javascript
// In benchmark-runner.js
const CustomBenchmarkSuite = require('./suites/custom');

// Add to suites object
this.suites = {
  tools: new ToolsBenchmarkSuite(this.collector),
  models: new ModelsBenchmarkSuite(this.collector),
  memory: new MemoryBenchmarkSuite(this.collector),
  custom: new CustomBenchmarkSuite(this.collector)  // New suite
};
```

## 🐛 Troubleshooting

### Issue: No Baseline Found

**Solution:**
```bash
node tests/benchmarks/benchmark-runner.js --create-baseline
```

### Issue: All Tests Showing Regression

**Problem:** Baseline may be outdated or from different environment

**Solution:**
```bash
# Recreate baseline
node tests/benchmarks/benchmark-runner.js --create-baseline
```

### Issue: Flaky Test Results

**Problem:** High variance in measurements

**Solution:**
- Increase iterations for more stable statistics
- Run on consistent hardware
- Close other applications during benchmarking

### Issue: Reports Not Generated

**Problem:** Report directory permissions or disk space

**Solution:**
```bash
# Check permissions
chmod -R 755 tests/benchmarks/reports/

# Check disk space
df -h
```

## 📚 References

- **SKILL.md** - Performance optimization strategies
- **BENCHMARK.md** - Detailed benchmarking documentation
- **Chart.js** - https://www.chartjs.org/
- **Node.js Performance** - https://nodejs.org/en/docs/guides/simple-profiling/

## 🤝 Contributing

To contribute new benchmarks or improvements:

1. Add tests in appropriate suite file
2. Run test framework: `node tests/test-framework.js`
3. Validate benchmarks: `node tests/benchmarks/benchmark-runner.js --quick`
4. Update documentation if needed
5. Submit PR with benchmark results

## 📄 License

Part of OpenClaw system. See main LICENSE file.

## 🎯 Status

✅ **Framework Complete**
- Automated benchmark runner operational
- Metrics collection working
- Regression detection active
- Report generation functional
- CI/CD integration ready
- Test suite passing

**Version:** 1.0  
**Last Updated:** 2026-02-13  
**Maintainer:** OpenClaw System
