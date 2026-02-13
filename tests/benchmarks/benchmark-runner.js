#!/usr/bin/env node

/**
 * OpenClaw Performance Benchmark Runner
 * 
 * Automated performance benchmarking with regression detection and reporting
 * 
 * Usage:
 *   node tests/benchmarks/benchmark-runner.js              # Full suite
 *   node tests/benchmarks/benchmark-runner.js --quick      # Quick mode
 *   node tests/benchmarks/benchmark-runner.js --suite=tools # Specific suite
 *   node tests/benchmarks/benchmark-runner.js --compare    # Compare with baseline
 *   node tests/benchmarks/benchmark-runner.js --create-baseline # Create new baseline
 */

const fs = require('fs');
const path = require('path');

// Import libraries
const MetricsCollector = require('./lib/metrics');
const RegressionDetector = require('./lib/regression');
const Reporter = require('./lib/reporter');

// Import suites
const ToolsBenchmarkSuite = require('./suites/tools');
const ModelsBenchmarkSuite = require('./suites/models');
const MemoryBenchmarkSuite = require('./suites/memory');
const AgentsBenchmarkSuite = require('./suites/agents');
const IntegrationBenchmarkSuite = require('./suites/integration');

class BenchmarkRunner {
  constructor(options = {}) {
    this.options = {
      quickMode: options.quick || false,
      specificSuite: options.suite || null,
      compare: options.compare !== false,
      createBaseline: options.createBaseline || false,
      updateBaseline: options.updateBaseline || false,
      verbose: options.verbose || false
    };
    
    this.baseDir = path.join(__dirname);
    this.baselinePath = path.join(this.baseDir, 'baselines', 'baseline.json');
    this.reportsDir = path.join(this.baseDir, 'reports');
    
    this.suites = this.initializeSuites();
    this.results = {};
    
    this.regression = new RegressionDetector(this.baselinePath);
    this.reporter = new Reporter(this.reportsDir);
  }

  /**
   * Initialize all benchmark suites
   */
  initializeSuites() {
    const allSuites = {
      tools: new ToolsBenchmarkSuite(),
      models: new ModelsBenchmarkSuite(),
      memory: new MemoryBenchmarkSuite(),
      agents: new AgentsBenchmarkSuite(),
      integration: new IntegrationBenchmarkSuite()
    };
    
    // Filter to specific suite if requested
    if (this.options.specificSuite) {
      const suite = allSuites[this.options.specificSuite];
      if (!suite) {
        console.error(`Error: Suite '${this.options.specificSuite}' not found`);
        console.log(`Available suites: ${Object.keys(allSuites).join(', ')}`);
        process.exit(1);
      }
      return { [this.options.specificSuite]: suite };
    }
    
    return allSuites;
  }

  /**
   * Run all benchmarks
   */
  async run() {
    this.printHeader();
    this.printConfig();
    
    const startTime = Date.now();
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    // Run each suite
    for (const [suiteName, suite] of Object.entries(this.suites)) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`Suite: ${suite.name}`);
      console.log(`Description: ${suite.description}`);
      console.log(`${'─'.repeat(60)}`);
      
      const tests = suite.getTests(this.options.quickMode);
      
      for (const test of tests) {
        totalTests++;
        
        try {
          console.log(`\n  Running: ${test.description} [${test.iterations} iterations]`);
          const result = await this.runTest(test);
          
          this.results[test.name] = result;
          
          const status = result.accuracy.success_rate >= 0.98 ? '✓' : '✗';
          const statusText = result.accuracy.success_rate >= 0.98 ? 'PASS' : 'FAIL';
          
          console.log(`  ${status} ${test.name}: ${statusText}`);
          console.log(`    Latency (p50): ${result.latency.p50}ms`);
          console.log(`    Latency (p95): ${result.latency.p95}ms`);
          console.log(`    Throughput: ${result.throughput.ops_per_sec} ops/sec`);
          console.log(`    Success Rate: ${(result.accuracy.success_rate * 100).toFixed(1)}%`);
          
          if (result.accuracy.success_rate >= 0.98) {
            passedTests++;
          } else {
            failedTests++;
          }
        } catch (error) {
          failedTests++;
          console.error(`  ✗ ${test.name}: ERROR - ${error.message}`);
          
          if (this.options.verbose) {
            console.error(error.stack);
          }
        }
      }
      
      console.log(`\n[COMPLETE] ${suite.name}: ${passedTests}/${totalTests} passed`);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    // Compare against baseline
    console.log(`\n${'═'.repeat(60)}`);
    console.log('Regression Analysis');
    console.log(`${'═'.repeat(60)}`);
    
    let comparison = { hasBaseline: false, hasRegressions: false, regressions: [], improvements: [] };
    
    if (this.options.compare || this.options.createBaseline) {
      comparison = this.regression.compare(this.results);
      
      if (!comparison.hasBaseline) {
        console.log('\nℹ️  No baseline found - creating new baseline');
        this.regression.saveBaseline(this.results);
      } else {
        if (comparison.hasRegressions) {
          console.log(`\n⚠️  ${comparison.regressions.length} regression(s) detected:`);
          comparison.regressions.forEach(r => {
            const emoji = r.severity === 'CRITICAL' ? '🔴' : '⚠️';
            console.log(`  ${emoji} [${r.severity}] ${r.test} (${r.metric}): ${r.message}`);
          });
        } else {
          console.log('\n✅ No regressions detected');
        }
        
        if (comparison.hasImprovements) {
          console.log(`\n✨ ${comparison.improvements.length} improvement(s) detected:`);
          comparison.improvements.slice(0, 5).forEach(i => {
            console.log(`  ✓ ${i.test} (${i.metric}): ${i.message}`);
          });
        }
        
        // Auto-update baseline on improvements
        if (this.regression.shouldUpdateBaseline(comparison) || this.options.updateBaseline) {
          console.log('\n✓ Updating baseline with improvements');
          this.regression.saveBaseline(this.results);
        }
      }
    }
    
    // Generate reports
    console.log(`\n${'═'.repeat(60)}`);
    console.log('Generating Reports');
    console.log(`${'═'.repeat(60)}`);
    
    const reports = this.reporter.generateReport(this.results, comparison, {
      mode: this.options.quickMode ? 'quick' : 'full',
      suite: this.options.specificSuite || 'all',
      runtime: `Node.js ${process.version}`,
      duration: `${duration}s`
    });
    
    console.log(`\n✓ HTML Report: ${reports.html}`);
    console.log(`✓ JSON Report: ${reports.json}`);
    console.log(`✓ Latest: ${path.join(this.reportsDir, 'latest.html')}`);
    
    // Print summary
    this.printSummary(totalTests, passedTests, failedTests, duration, comparison);
    
    // Exit with error code if regressions
    if (comparison.criticalCount > 0) {
      console.log('\n❌ Critical regressions detected - exiting with error code');
      process.exit(1);
    }
    
    console.log('\n✅ Benchmark complete!');
    process.exit(0);
  }

  /**
   * Run a single test
   */
  async runTest(test) {
    const metrics = new MetricsCollector();
    const startTime = Date.now();
    
    await metrics.runIterations(
      test.run,
      test.iterations,
      { testName: test.name }
    );
    
    const endTime = Date.now();
    
    // Get summary with cost tracking if available
    const summary = metrics.getSummary(startTime, endTime);
    
    return summary;
  }

  /**
   * Print header
   */
  printHeader() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   OpenClaw Performance Benchmark Suite v1.0            ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`[INFO] Starting benchmark run: ${new Date().toLocaleString()}`);
  }

  /**
   * Print configuration
   */
  printConfig() {
    console.log('[INFO] Configuration:');
    console.log(`  Mode: ${this.options.quickMode ? 'Quick' : 'Full'}`);
    console.log(`  Suite: ${this.options.specificSuite || 'All'}`);
    console.log(`  Compare: ${this.options.compare ? 'Yes' : 'No'}`);
    console.log(`  Baseline: ${fs.existsSync(this.baselinePath) ? 'Found' : 'Not found'}`);
    console.log(`  Reports: ${this.reportsDir}`);
  }

  /**
   * Print summary
   */
  printSummary(total, passed, failed, duration, comparison) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log('SUMMARY');
    console.log(`${'═'.repeat(60)}`);
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✓`);
    console.log(`Failed: ${failed} ✗`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log(`Duration: ${duration}s`);
    
    if (comparison.hasBaseline) {
      console.log(`\nRegression Analysis:`);
      console.log(`  Critical: ${comparison.criticalCount || 0}`);
      console.log(`  Warnings: ${comparison.warningCount || 0}`);
      console.log(`  Improvements: ${comparison.improvements?.length || 0}`);
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    quick: false,
    suite: null,
    compare: true,
    createBaseline: false,
    updateBaseline: false,
    verbose: false
  };
  
  for (const arg of args) {
    if (arg === '--quick') options.quick = true;
    else if (arg.startsWith('--suite=')) options.suite = arg.split('=')[1];
    else if (arg === '--no-compare') options.compare = false;
    else if (arg === '--create-baseline') options.createBaseline = true;
    else if (arg === '--update-baseline') options.updateBaseline = true;
    else if (arg === '--verbose' || arg === '-v') options.verbose = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  
  return options;
}

function printHelp() {
  console.log(`
OpenClaw Performance Benchmark Runner

Usage:
  node benchmark-runner.js [options]

Options:
  --quick              Run in quick mode (fewer iterations)
  --suite=<name>       Run specific suite (tools, models, memory, agents, integration)
  --no-compare         Skip baseline comparison
  --create-baseline    Force create new baseline
  --update-baseline    Force update existing baseline
  --verbose, -v        Verbose output
  --help, -h           Show this help

Examples:
  node benchmark-runner.js                    # Run all benchmarks
  node benchmark-runner.js --quick            # Quick run
  node benchmark-runner.js --suite=tools      # Run tools suite only
  node benchmark-runner.js --create-baseline  # Create new baseline
  `);
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const runner = new BenchmarkRunner(options);
  
  runner.run().catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = BenchmarkRunner;
