# OpenClaw Performance Benchmarking Framework

Automated performance monitoring, regression detection, and optimization validation.

## Quick Start

### Run Benchmarks

```bash
# Full benchmark suite
npm run benchmark

# Quick mode (reduced iterations)
npm run benchmark:quick

# Specific suites
npm run benchmark:tools
npm run benchmark:models
npm run benchmark:memory
```

### Direct Usage

```bash
# Full suite
node tests/benchmarks/benchmark-runner.js

# Quick mode
node tests/benchmarks/benchmark-runner.js --quick

# Specific suite
node tests/benchmarks/benchmark-runner.js --suite=tools

# Compare with baseline
node tests/benchmarks/benchmark-runner.js --compare

# Create new baseline
node tests/benchmarks/benchmark-runner.js --create-baseline
```

## What Gets Tested

### 1. Tool Execution Speed (4 tests)
- Simple command execution
- Directory operations
- File read operations
- File existence checks

### 2. Model Inference Time (4 tests)
- Haiku simple queries
- Haiku medium tasks
- Sonnet complex reasoning
- Sonnet code generation

### 3. Memory Operations (4 tests)
- Simple keyword search
- Complex semantic search
- Recent memory retrieval
- Embedding generation

### 4. Multi-Agent Coordination (4 tests)
- Simple agent spawn
- Complex agent spawn
- Agent messaging
- Coordination overhead

### 5. System Integration E2E (3 tests)
- Simple single-step tasks
- File workflow (read/process/write)
- Multi-step coordination

**Total:** 19 benchmark tests

## Metrics Collected

- **Latency:** p50, p90, p95, p99, min, max, mean, stddev
- **Throughput:** Operations per second, requests per minute
- **Cost:** Total cost, cost per operation, tokens used
- **Accuracy:** Success rate, error rate

## Reports Generated

- **HTML Report:** Interactive charts with Chart.js
- **JSON Report:** Machine-readable for CI/CD
- **Baseline:** Performance baseline for regression detection

Reports saved to: `tests/benchmarks/reports/`

## Regression Detection

Automatically compares against baseline and detects:

- **Critical:** > 30% performance degradation
- **Warning:** > 15% performance degradation  
- **Improvement:** > 10% performance gain

## Files

```
tests/benchmarks/
├── benchmark-runner.js       # Main CLI entry point
├── lib/
│   ├── metrics.js           # Metrics collection
│   ├── regression.js        # Regression detection
│   └── reporter.js          # Report generation
├── suites/
│   ├── tools.js             # Tool benchmarks
│   ├── models.js            # Model benchmarks
│   ├── memory.js            # Memory benchmarks
│   ├── agents.js            # Agent benchmarks
│   └── integration.js       # E2E benchmarks
├── baselines/
│   └── baseline.json        # Current baseline
├── reports/
│   ├── latest.html          # Latest HTML report
│   └── latest.json          # Latest JSON report
├── README.md                # This file
└── TEST_RESULTS.md          # Comprehensive test results
```

## Documentation

See `skills/performance-optimization/BENCHMARK.md` for complete documentation.

## Status

✅ **Production Ready**  
- All 19 tests passing
- 100% success rate
- Baseline established
- Reports generating
- Regression detection working

## Last Run

**Date:** 2026-02-13 09:56:05  
**Tests:** 19/19 passed  
**Duration:** 42.4s  
**Mode:** Quick

View detailed results: `TEST_RESULTS.md`
