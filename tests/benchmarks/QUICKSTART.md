# Performance Benchmarking - Quick Start

## 🚀 Run Your First Benchmark (30 seconds)

```bash
npm run benchmark:quick
```

That's it! The benchmark will:
- Run 19 tests across 5 suites
- Complete in ~40 seconds
- Generate HTML and JSON reports
- Create baseline for future comparisons

## 📊 View Results

**HTML Report:** `tests/benchmarks/reports/latest.html`
- Open in browser for interactive charts
- See detailed metrics and visualizations
- Review regression analysis

**Console Output:** See immediate results in terminal

## 🎯 Common Commands

```bash
# Quick benchmark (reduced iterations)
npm run benchmark:quick

# Full benchmark (more iterations)
npm run benchmark

# Specific suite
npm run benchmark:tools
npm run benchmark:models
npm run benchmark:memory

# Compare with baseline
node tests/benchmarks/benchmark-runner.js --compare

# Help
node tests/benchmarks/benchmark-runner.js --help
```

## 📈 What Gets Tested

1. **Tool Execution** (4 tests) - Command and file operations
2. **Model Inference** (4 tests) - Haiku vs Sonnet performance
3. **Memory Operations** (4 tests) - Search, retrieval, embeddings
4. **Agent Coordination** (4 tests) - Spawn, messaging, overhead
5. **End-to-End** (3 tests) - Complete workflows

**Total: 19 benchmarks**

## 🎨 What You Get

✅ **Performance Metrics**
- Latency (p50, p90, p95, p99)
- Throughput (ops/sec)
- Cost per operation
- Success rate

✅ **Regression Detection**
- Automatic baseline comparison
- Alert on performance degradation
- Track improvements

✅ **Visual Reports**
- Interactive charts
- Detailed tables
- Executive summary

## 📁 Key Files

- `BENCHMARK.md` - Complete documentation
- `TEST_RESULTS.md` - Detailed test results
- `reports/latest.html` - Latest benchmark report
- `baselines/baseline.json` - Performance baseline

## 🎓 Next Steps

1. Run initial benchmark: `npm run benchmark:quick`
2. View HTML report: Open `tests/benchmarks/reports/latest.html`
3. Review results: Read `TEST_RESULTS.md`
4. Integrate with CI/CD: Use exit codes and JSON output
5. Schedule weekly runs: Add to heartbeat

## 🆘 Need Help?

- **Full Documentation:** `skills/performance-optimization/BENCHMARK.md`
- **Test Results:** `tests/benchmarks/TEST_RESULTS.md`
- **CLI Help:** `node tests/benchmarks/benchmark-runner.js --help`

## ✅ Current Status

- **Framework:** Production Ready
- **Tests:** 19/19 passing (100%)
- **Documentation:** Complete
- **Baseline:** Established
- **Reports:** Generated

**You're ready to start benchmarking!** 🎉
