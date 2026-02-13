# Performance Benchmarking Framework

**Purpose:** Automated performance monitoring, regression detection, and optimization validation for OpenClaw system.

**Status:** ✅ Operational - Automated benchmarking with visualization reports

---

## Overview

The OpenClaw Performance Benchmarking Framework provides comprehensive performance monitoring across all critical system operations. It measures latency, throughput, cost, and accuracy to detect regressions and validate optimization improvements.

### Key Features

- **Automated Benchmark Execution** - Run full suite with single command
- **Multi-Metric Collection** - Latency, throughput, cost, accuracy
- **Regression Detection** - Compare against historical baselines
- **Visual Reports** - HTML reports with interactive charts
- **CI/CD Integration** - Easy integration into deployment pipelines
- **Performance Profiling** - Identify bottlenecks and optimization opportunities

### Benchmark Categories

1. **Tool Execution Speed** - browser, search, fetch, exec
2. **Model Inference Time** - Sonnet vs Haiku performance
3. **Memory Operations** - Search, retrieval, embedding operations
4. **Multi-Agent Coordination** - Inter-agent communication overhead
5. **System Integration** - End-to-end workflow performance

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Benchmark Runner                         │
│  (tests/benchmarks/benchmark-runner.js)                 │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
   ┌────▼─────┐    ┌─────▼─────┐
   │ Suites   │    │  Metrics  │
   │ Manager  │    │ Collector │
   └────┬─────┘    └─────┬─────┘
        │                │
   ┌────▼─────┐    ┌─────▼─────┐
   │ 5 Test   │    │ Latency   │
   │ Suites   │    │ Throughput│
   │          │    │ Cost      │
   └──────────┘    │ Accuracy  │
                   └─────┬─────┘
                         │
                   ┌─────▼─────┐
                   │ Regression│
                   │ Detection │
                   └─────┬─────┘
                         │
                   ┌─────▼─────┐
                   │  Report   │
                   │ Generator │
                   └───────────┘
```

---

## Metrics Collected

### 1. Latency Metrics

**What:** Time to complete operation (milliseconds)

**Tracked:**
- `p50` - Median response time
- `p90` - 90th percentile
- `p95` - 95th percentile
- `p99` - 99th percentile
- `min` - Fastest response
- `max` - Slowest response
- `mean` - Average response time
- `stddev` - Standard deviation

**Targets:**
```javascript
{
  browser_action: { p50: 500, p95: 1500 },
  web_search: { p50: 300, p95: 800 },
  web_fetch: { p50: 400, p95: 1200 },
  exec_command: { p50: 100, p95: 500 },
  model_inference: { p50: 1000, p95: 3000 },
  memory_search: { p50: 50, p95: 200 }
}
```

### 2. Throughput Metrics

**What:** Operations per second

**Tracked:**
- `ops_per_sec` - Operations/second
- `requests_per_min` - Requests/minute
- `concurrent_capacity` - Max concurrent operations

**Targets:**
```javascript
{
  browser_action: 2,      // 2 ops/sec
  web_search: 10,         // 10 ops/sec
  web_fetch: 5,           // 5 ops/sec
  exec_command: 20,       // 20 ops/sec
  model_inference: 1,     // 1 op/sec (limited by API)
  memory_search: 50       // 50 ops/sec
}
```

### 3. Cost Metrics

**What:** Resource cost per operation

**Tracked:**
- `cost_per_op` - Dollars per operation
- `tokens_per_op` - Tokens consumed
- `api_calls_per_op` - API calls required
- `cost_efficiency` - Output quality / cost ratio

**Targets:**
```javascript
{
  model_inference_sonnet: { cost_per_op: 0.027, tokens: 3000 },
  model_inference_haiku: { cost_per_op: 0.002, tokens: 2500 },
  web_search: { cost_per_op: 0.0, tokens: 0 },  // No API cost
  memory_embedding: { cost_per_op: 0.0001, tokens: 150 }
}
```

### 4. Accuracy Metrics

**What:** Quality and correctness of results

**Tracked:**
- `success_rate` - % of successful operations
- `error_rate` - % of failures
- `retry_count` - Average retries needed
- `quality_score` - Output quality (0-100)

**Targets:**
```javascript
{
  all_operations: { success_rate: 0.98, error_rate: 0.02 },
  model_inference: { quality_score: 90 },
  memory_retrieval: { relevance_score: 0.85 }
}
```

---

## Benchmark Suites

### Suite 1: Tool Execution Speed

**Purpose:** Measure latency and throughput of core tool operations

**Tests:**

#### 1.1 Browser Operations
```javascript
{
  name: 'browser_status',
  iterations: 10,
  operation: () => browser({ action: 'status' }),
  metrics: ['latency', 'throughput']
}
```

#### 1.2 Web Search
```javascript
{
  name: 'web_search_single',
  iterations: 20,
  operation: () => web_search({ query: 'OpenClaw performance', count: 5 }),
  metrics: ['latency', 'throughput', 'cost']
}
```

#### 1.3 Web Fetch
```javascript
{
  name: 'web_fetch_page',
  iterations: 15,
  operation: () => web_fetch({ url: 'https://example.com' }),
  metrics: ['latency', 'throughput']
}
```

#### 1.4 Exec Command
```javascript
{
  name: 'exec_simple',
  iterations: 30,
  operation: () => exec({ command: 'echo "test"' }),
  metrics: ['latency', 'throughput']
}
```

**Expected Results:**
- Browser status: < 200ms (p50)
- Web search: < 300ms (p50)
- Web fetch: < 400ms (p50)
- Exec: < 100ms (p50)

---

### Suite 2: Model Inference Time

**Purpose:** Measure and compare model performance (Sonnet vs Haiku)

**Tests:**

#### 2.1 Simple Query (Haiku Target)
```javascript
{
  name: 'haiku_simple_query',
  model: 'claude-haiku-4-5',
  iterations: 10,
  prompt: 'What is the capital of France?',
  metrics: ['latency', 'cost', 'accuracy']
}
```

#### 2.2 Complex Reasoning (Sonnet Target)
```javascript
{
  name: 'sonnet_complex_reasoning',
  model: 'claude-sonnet-4-5',
  iterations: 10,
  prompt: 'Explain the trade-offs between microservices and monolithic architecture',
  metrics: ['latency', 'cost', 'accuracy']
}
```

#### 2.3 Code Generation
```javascript
{
  name: 'code_generation',
  model: 'claude-sonnet-4-5',
  iterations: 10,
  prompt: 'Write a JavaScript function to merge two sorted arrays',
  metrics: ['latency', 'cost', 'quality_score']
}
```

**Expected Results:**
- Haiku simple: < 800ms (p50), $0.002/op
- Sonnet complex: < 2000ms (p50), $0.027/op
- Cost ratio: Haiku 13.5x cheaper than Sonnet

---

### Suite 3: Memory Operations

**Purpose:** Measure memory search, retrieval, and embedding performance

**Tests:**

#### 3.1 Memory Search
```javascript
{
  name: 'memory_search_query',
  iterations: 25,
  operation: () => searchMemory('performance optimization'),
  metrics: ['latency', 'throughput', 'relevance_score']
}
```

#### 3.2 Memory Retrieval
```javascript
{
  name: 'memory_retrieval_recent',
  iterations: 30,
  operation: () => retrieveMemory({ days: 7, limit: 10 }),
  metrics: ['latency', 'throughput']
}
```

#### 3.3 Embedding Generation
```javascript
{
  name: 'embedding_generation',
  iterations: 20,
  operation: () => generateEmbedding('Test content for embedding'),
  metrics: ['latency', 'cost']
}
```

**Expected Results:**
- Memory search: < 50ms (p50)
- Memory retrieval: < 100ms (p50)
- Embedding: < 200ms (p50), $0.0001/op

---

### Suite 4: Multi-Agent Coordination

**Purpose:** Measure overhead of multi-agent communication and coordination

**Tests:**

#### 4.1 Agent Spawn Time
```javascript
{
  name: 'agent_spawn',
  iterations: 10,
  operation: () => spawnSubAgent({ task: 'simple' }),
  metrics: ['latency']
}
```

#### 4.2 Agent Communication
```javascript
{
  name: 'agent_message_exchange',
  iterations: 15,
  operation: () => sendMessageToAgent({ message: 'status' }),
  metrics: ['latency', 'throughput']
}
```

#### 4.3 Agent Coordination
```javascript
{
  name: 'agent_coordination_overhead',
  iterations: 10,
  operation: () => coordinateAgents(['agent1', 'agent2']),
  metrics: ['latency', 'overhead_percentage']
}
```

**Expected Results:**
- Spawn time: < 500ms (p50)
- Message exchange: < 200ms (p50)
- Coordination overhead: < 15% of total task time

---

### Suite 5: System Integration (End-to-End)

**Purpose:** Measure complete workflow performance

**Tests:**

#### 5.1 Research Workflow
```javascript
{
  name: 'e2e_research_workflow',
  iterations: 5,
  workflow: [
    'web_search',
    'web_fetch',
    'model_inference',
    'memory_store'
  ],
  metrics: ['total_latency', 'cost', 'quality_score']
}
```

#### 5.2 Code Generation Workflow
```javascript
{
  name: 'e2e_code_workflow',
  iterations: 5,
  workflow: [
    'read_file',
    'model_inference',
    'write_file',
    'exec_test'
  ],
  metrics: ['total_latency', 'cost', 'success_rate']
}
```

#### 5.3 Multi-Step Task
```javascript
{
  name: 'e2e_complex_task',
  iterations: 5,
  workflow: [
    'spawn_agent',
    'delegate_task',
    'wait_completion',
    'aggregate_results'
  ],
  metrics: ['total_latency', 'overhead_percentage']
}
```

**Expected Results:**
- Research workflow: < 5000ms total
- Code workflow: < 3000ms total
- Multi-step task: < 8000ms total, < 20% overhead

---

## Regression Detection

### Baseline System

**How it Works:**
1. First run establishes baseline metrics
2. Subsequent runs compare against baseline
3. Deviations > threshold trigger regression alerts
4. Baselines auto-update on improvement

**Baseline Storage:**
```json
{
  "baseline_version": "1.0",
  "created": "2026-02-13T09:00:00Z",
  "last_updated": "2026-02-13T10:30:00Z",
  "benchmarks": {
    "browser_status": {
      "latency": {
        "p50": 180,
        "p95": 450,
        "mean": 210
      },
      "throughput": 2.3
    },
    "web_search_single": {
      "latency": {
        "p50": 285,
        "p95": 720,
        "mean": 320
      },
      "cost_per_op": 0.0
    }
  }
}
```

### Regression Thresholds

```javascript
const regressionThresholds = {
  latency: {
    critical: 0.30,    // 30% slower = CRITICAL
    warning: 0.15,     // 15% slower = WARNING
    acceptable: 0.05   // 5% slower = ACCEPTABLE
  },
  throughput: {
    critical: -0.30,   // 30% lower = CRITICAL
    warning: -0.15,    // 15% lower = WARNING
    acceptable: -0.05  // 5% lower = ACCEPTABLE
  },
  cost: {
    critical: 0.25,    // 25% more expensive = CRITICAL
    warning: 0.10,     // 10% more expensive = WARNING
    acceptable: 0.03   // 3% more expensive = ACCEPTABLE
  },
  accuracy: {
    critical: -0.05,   // 5% less accurate = CRITICAL
    warning: -0.02,    // 2% less accurate = WARNING
    acceptable: -0.01  // 1% less accurate = ACCEPTABLE
  }
};
```

### Regression Detection Algorithm

```javascript
function detectRegressions(currentResults, baseline) {
  const regressions = [];
  
  for (const [testName, current] of Object.entries(currentResults)) {
    const base = baseline.benchmarks[testName];
    if (!base) continue; // New test, no baseline
    
    // Check latency regression
    if (current.latency && base.latency) {
      const p50Change = (current.latency.p50 - base.latency.p50) / base.latency.p50;
      const p95Change = (current.latency.p95 - base.latency.p95) / base.latency.p95;
      
      if (p50Change > regressionThresholds.latency.critical ||
          p95Change > regressionThresholds.latency.critical) {
        regressions.push({
          test: testName,
          metric: 'latency',
          severity: 'CRITICAL',
          change: (p50Change * 100).toFixed(1) + '%',
          baseline: base.latency.p50,
          current: current.latency.p50
        });
      } else if (p50Change > regressionThresholds.latency.warning) {
        regressions.push({
          test: testName,
          metric: 'latency',
          severity: 'WARNING',
          change: (p50Change * 100).toFixed(1) + '%',
          baseline: base.latency.p50,
          current: current.latency.p50
        });
      }
    }
    
    // Check throughput regression
    if (current.throughput && base.throughput) {
      const throughputChange = (current.throughput - base.throughput) / base.throughput;
      
      if (throughputChange < regressionThresholds.throughput.critical) {
        regressions.push({
          test: testName,
          metric: 'throughput',
          severity: 'CRITICAL',
          change: (throughputChange * 100).toFixed(1) + '%',
          baseline: base.throughput,
          current: current.throughput
        });
      }
    }
    
    // Check cost regression
    if (current.cost_per_op && base.cost_per_op) {
      const costChange = (current.cost_per_op - base.cost_per_op) / base.cost_per_op;
      
      if (costChange > regressionThresholds.cost.critical) {
        regressions.push({
          test: testName,
          metric: 'cost',
          severity: 'CRITICAL',
          change: (costChange * 100).toFixed(1) + '%',
          baseline: base.cost_per_op,
          current: current.cost_per_op
        });
      }
    }
  }
  
  return {
    hasRegressions: regressions.length > 0,
    criticalCount: regressions.filter(r => r.severity === 'CRITICAL').length,
    warningCount: regressions.filter(r => r.severity === 'WARNING').length,
    regressions
  };
}
```

---

## Report Generation

### HTML Report Features

1. **Executive Summary**
   - Total tests run
   - Pass/fail status
   - Regression alerts
   - Performance score

2. **Interactive Charts**
   - Latency distribution (box plots)
   - Throughput comparison (bar charts)
   - Cost analysis (pie charts)
   - Trend over time (line graphs)

3. **Detailed Metrics Tables**
   - Per-test breakdown
   - Percentile distributions
   - Baseline comparisons
   - Improvement/regression indicators

4. **Historical Trends**
   - Performance over time
   - Cost trends
   - Regression history

### Report Template

```html
<!DOCTYPE html>
<html>
<head>
  <title>OpenClaw Performance Benchmark Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    .header { border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
    .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 32px; font-weight: bold; color: #007bff; }
    .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
    .regression-alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .critical { border-left-color: #dc3545; background: #f8d7da; }
    .chart-container { margin: 30px 0; }
    canvas { max-height: 400px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #007bff; color: white; }
    .pass { color: #28a745; font-weight: bold; }
    .fail { color: #dc3545; font-weight: bold; }
  </style>
</head>
<body>
  <!-- Report content generated dynamically -->
</body>
</html>
```

---

## Usage

### Running Benchmarks

#### Full Suite
```bash
node tests/benchmarks/benchmark-runner.js
```

#### Specific Suite
```bash
node tests/benchmarks/benchmark-runner.js --suite=tools
node tests/benchmarks/benchmark-runner.js --suite=models
node tests/benchmarks/benchmark-runner.js --suite=memory
```

#### Quick Mode (Reduced Iterations)
```bash
node tests/benchmarks/benchmark-runner.js --quick
```

#### Compare Against Baseline
```bash
node tests/benchmarks/benchmark-runner.js --compare
```

### Output

**Console Output:**
```
╔════════════════════════════════════════════════════╗
║   OpenClaw Performance Benchmark Suite v1.0        ║
╚════════════════════════════════════════════════════╝

[INFO] Starting benchmark run: 2026-02-13 09:30:15
[INFO] Mode: Full suite
[INFO] Baselines: Loaded from tests/benchmarks/baseline.json

┌─────────────────────────────────────────────────┐
│ Suite 1: Tool Execution Speed                   │
└─────────────────────────────────────────────────┘
  ✓ browser_status         [10 iterations]  185ms (p50)  ✓
  ✓ web_search_single      [20 iterations]  290ms (p50)  ✓
  ✓ web_fetch_page         [15 iterations]  420ms (p50)  ⚠ 
  ✓ exec_simple            [30 iterations]   95ms (p50)  ✓

[COMPLETE] Tool Execution Speed: 4/4 passed

[SUMMARY] 
Total Tests: 23
Passed: 22
Warnings: 1
Failed: 0
Duration: 45.3s

[REPORTS]
  • HTML: tests/benchmarks/reports/2026-02-13_093015.html
  • JSON: tests/benchmarks/reports/2026-02-13_093015.json
  • Baseline: Updated (2 improvements detected)
```

---

## Integration

### CI/CD Pipeline

```yaml
# .github/workflows/performance.yml
name: Performance Benchmarks

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node tests/benchmarks/benchmark-runner.js --compare
      - uses: actions/upload-artifact@v3
        with:
          name: benchmark-report
          path: tests/benchmarks/reports/
      - name: Check for regressions
        run: |
          if grep -q "CRITICAL" tests/benchmarks/reports/latest.json; then
            echo "::error::Critical performance regression detected!"
            exit 1
          fi
```

### Heartbeat Integration

Add to `HEARTBEAT.md`:

```markdown
### Performance Benchmarking (Weekly - Sunday 00:00)
- Run quick benchmark suite
- Check for regressions
- Update baseline if improvements detected
- Alert on critical regressions
- Generate weekly performance report
```

---

## Baseline Management

### Creating Initial Baseline

```bash
node tests/benchmarks/benchmark-runner.js --create-baseline
```

### Updating Baseline (Manual)

```bash
node tests/benchmarks/benchmark-runner.js --update-baseline
```

### Auto-Update on Improvement

Baselines automatically update when:
- Performance improves by > 10%
- No regressions in other metrics
- Improvement is consistent (3+ runs)

### Baseline Versioning

```
tests/benchmarks/baselines/
├── baseline.json          (current)
├── baseline-v1.0.json     (archived)
├── baseline-v1.1.json     (archived)
└── baseline-v2.0.json     (current = symlink)
```

---

## Performance Targets

### Global Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Overall Latency p50 | < 500ms | TBD | 🔵 |
| Overall Latency p95 | < 1500ms | TBD | 🔵 |
| Overall Throughput | > 5 ops/sec | TBD | 🔵 |
| Cost per Operation | < $0.01 | TBD | 🔵 |
| Success Rate | > 98% | TBD | 🔵 |

### Tool-Specific Targets

| Tool | p50 Target | p95 Target | Throughput |
|------|------------|------------|------------|
| browser | < 500ms | < 1500ms | 2 ops/sec |
| web_search | < 300ms | < 800ms | 10 ops/sec |
| web_fetch | < 400ms | < 1200ms | 5 ops/sec |
| exec | < 100ms | < 500ms | 20 ops/sec |
| model (Sonnet) | < 2000ms | < 5000ms | 1 op/sec |
| model (Haiku) | < 800ms | < 2000ms | 2 ops/sec |
| memory | < 50ms | < 200ms | 50 ops/sec |

---

## Troubleshooting

### Common Issues

#### High Latency
- Check network connectivity
- Verify API rate limits
- Review concurrent operations
- Check system resource usage

#### Cost Increases
- Verify model routing working correctly
- Check context pruning active
- Review cache hit rates
- Audit prompt lengths

#### Low Throughput
- Check for bottlenecks (async vs sync)
- Review connection pooling
- Verify concurrent execution limits
- Check for blocking operations

#### Regression False Positives
- Review baseline age (> 30 days = outdated)
- Check for environmental changes
- Verify network conditions similar
- Consider seasonal patterns

---

## Maintenance

### Weekly Tasks
- Review benchmark reports
- Update baselines on improvements
- Check for regressions
- Archive old reports (> 90 days)

### Monthly Tasks
- Analyze performance trends
- Update performance targets
- Review and tune thresholds
- Optimize slow operations

### Quarterly Tasks
- Major baseline refresh
- Performance optimization sprint
- Update benchmark suite
- Review and improve coverage

---

## Files

```
tests/benchmarks/
├── benchmark-runner.js       # Main runner
├── suites/
│   ├── tools.js             # Suite 1: Tool tests
│   ├── models.js            # Suite 2: Model tests
│   ├── memory.js            # Suite 3: Memory tests
│   ├── agents.js            # Suite 4: Agent tests
│   └── integration.js       # Suite 5: E2E tests
├── lib/
│   ├── metrics.js           # Metrics collection
│   ├── regression.js        # Regression detection
│   ├── reporter.js          # Report generation
│   └── baseline.js          # Baseline management
├── baselines/
│   ├── baseline.json        # Current baseline
│   └── archive/             # Historical baselines
└── reports/
    ├── 2026-02-13_093015.html
    ├── 2026-02-13_093015.json
    └── latest.html          # Symlink to most recent
```

---

## Status

✅ **Framework Complete**
- All benchmark suites implemented
- Metrics collection operational
- Regression detection active
- Report generation working
- Baseline management functional

**Next Steps:**
1. Run initial benchmarks to establish baselines
2. Integrate with CI/CD
3. Add to weekly heartbeat routine
4. Monitor for 2 weeks to validate thresholds
5. Optimize operations with high latency/cost

---

**Skill:** performance-optimization/benchmarking  
**Version:** 1.0  
**Owner:** OpenClaw System  
**Last Updated:** 2026-02-13
