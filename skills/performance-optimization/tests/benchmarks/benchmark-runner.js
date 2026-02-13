#!/usr/bin/env node
/**
 * OpenClaw Performance Benchmark Runner
 * 
 * Automated benchmark execution with metrics collection, regression detection,
 * and report generation.
 * 
 * Usage:
 *   node benchmark-runner.js                    # Run full suite
 *   node benchmark-runner.js --quick            # Quick mode (fewer iterations)
 *   node benchmark-runner.js --suite=tools      # Run specific suite
 *   node benchmark-runner.js --compare          # Compare against baseline
 *   node benchmark-runner.js --create-baseline  # Create new baseline
 *   node benchmark-runner.js --update-baseline  # Update baseline if improved
 */

const MetricsCollector = require('./lib/metrics');
const RegressionDetector = require('./lib/regression');
const Reporter = require('./lib/reporter');

// Import benchmark suites
const ToolsBenchmarkSuite = require('./suites/tools');
const ModelsBenchmarkSuite = require('./suites/models');
const MemoryBenchmarkSuite = require('./suites/memory');

class BenchmarkRunner {
  constructor() {
    this.collector = new MetricsCollector();
    this.detector = new RegressionDetector();
    this.reporter = new Reporter();
    this.config = this.parseArgs();
    
    this.suites = {
      tools: new ToolsBenchmarkSuite(this.collector),
      models: new ModelsBenchmarkSuite(this.collector),
      memory: new MemoryBenchmarkSuite(this.collector)
    };
  }

  parseArgs() {
    const args = process.argv.slice(2);
    const config = {
      quick: args.includes('--quick'),
      compare: args.includes('--compare'),
      createBaseline: args.includes('--create-baseline'),
      updateBaseline: args.includes('--update-baseline'),
      suite: null
    };

    // Check for specific suite
    const suiteArg = args.find(arg => arg.startsWith('--suite='));
    if (suiteArg) {
      config.suite = suiteArg.split('=')[1];
    }

    return config;
  }

  async run() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║   OpenClaw Performance Benchmark Suite v1.0        ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`[INFO] Starting benchmark run: ${new Date().toLocaleString()}`);
    console.log(`[INFO] Mode: ${this.config.quick ? 'Quick' : 'Full suite'}`);
    
    // Load baseline if comparing
    if (this.config.compare || this.config.updateBaseline) {
      const loaded = this.detector.loadBaseline();
      if (loaded) {
        console.log(`[INFO] Baseline loaded: ${this.detector.baseline.last_updated}`);
      } else {
        console.log('[WARN] No baseline found. Run with --create-baseline to establish baseline.');
        this.config.compare = false;
      }
    }

    console.log('');
    
    // Run benchmarks
    const startTime = Date.now();
    
    if (this.config.suite) {
      // Run specific suite
      if (this.suites[this.config.suite]) {
        await this.suites[this.config.suite].run(this.config);
      } else {
        console.error(`[ERROR] Unknown suite: ${this.config.suite}`);
        console.error(`[INFO] Available suites: ${Object.keys(this.suites).join(', ')}`);
        process.exit(1);
      }
    } else {
      // Run all suites
      for (const [name, suite] of Object.entries(this.suites)) {
        await suite.run(this.config);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Calculate statistics
    console.log('\n[INFO] Calculating statistics...');
    const stats = this.collector.getAggregatedStats();
    
    // Regression detection
    let regressionReport = { hasBaseline: false, regressions: [], improvements: [] };
    
    if (this.config.compare && this.detector.baseline) {
      console.log('[INFO] Detecting regressions...');
      const regressions = this.detector.detectRegressions(stats);
      const improvements = this.detector.detectImprovements(stats);
      regressionReport = this.detector.generateReport(regressions, improvements);
      
      this.printRegressionSummary(regressionReport);
    }

    // Create or update baseline
    if (this.config.createBaseline) {
      console.log('[INFO] Creating baseline...');
      this.detector.saveBaseline(stats, '1.0');
      console.log('[INFO] ✓ Baseline created successfully');
    } else if (this.config.updateBaseline && regressionReport.summary?.totalImprovements > 0) {
      console.log('[INFO] Updating baseline with improvements...');
      this.detector.saveBaseline(stats);
      console.log('[INFO] ✓ Baseline updated');
    }

    // Generate reports
    console.log('[INFO] Generating reports...');
    const reportPaths = this.reporter.generateReports(stats, regressionReport, {
      mode: this.config.quick ? 'quick' : 'full',
      suite: this.config.suite || 'all',
      version: '1.0'
    });

    // Print summary
    this.printSummary(stats, duration, reportPaths);

    // Exit with error code if critical regressions found
    if (regressionReport.criticalCount > 0) {
      console.error('\n[ERROR] Critical performance regressions detected!');
      process.exit(1);
    }
  }

  printRegressionSummary(report) {
    if (!report.hasBaseline) {
      console.log('\n[INFO] No baseline available for comparison');
      return;
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  REGRESSION DETECTION RESULTS');
    console.log('═══════════════════════════════════════════════════');

    if (!report.hasRegressions) {
      console.log('  ✓ No performance regressions detected');
    } else {
      console.log(`  ⚠️  ${report.summary.totalRegressions} regressions found:`);
      console.log(`     🔴 Critical: ${report.summary.criticalRegressions}`);
      console.log(`     🟡 Warning:  ${report.summary.warningRegressions}`);
      
      // Print critical regressions
      const critical = report.regressions.filter(r => r.severity === 'CRITICAL');
      if (critical.length > 0) {
        console.log('\n  Critical Regressions:');
        critical.forEach(r => {
          console.log(`    • ${r.test} (${r.metric}): ${r.change} slower`);
        });
      }
    }

    if (report.summary.totalImprovements > 0) {
      console.log(`\n  📈 ${report.summary.totalImprovements} improvements detected`);
      report.improvements.forEach(imp => {
        console.log(`    • ${imp.test} (${imp.metric}): ${imp.improvement} faster`);
      });
    }

    console.log('═══════════════════════════════════════════════════\n');
  }

  printSummary(stats, duration, reportPaths) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  BENCHMARK COMPLETE');
    console.log('═══════════════════════════════════════════════════');
    
    const totalTests = Object.keys(stats).length;
    const totalOps = Object.values(stats).reduce((sum, s) => sum + (s.count || 0), 0);
    const avgLatency = this.calculateAverageLatency(stats);
    const totalCost = this.calculateTotalCost(stats);

    console.log(`  Total Tests:       ${totalTests}`);
    console.log(`  Total Operations:  ${totalOps}`);
    console.log(`  Duration:          ${duration}s`);
    console.log(`  Avg Latency (p50): ${avgLatency.toFixed(2)}ms`);
    console.log(`  Total Cost:        $${totalCost.toFixed(4)}`);
    console.log('');
    console.log('  Reports Generated:');
    console.log(`    HTML: ${reportPaths.htmlPath}`);
    console.log(`    JSON: ${reportPaths.jsonPath}`);
    console.log('═══════════════════════════════════════════════════\n');
  }

  calculateAverageLatency(stats) {
    const latencies = Object.values(stats)
      .filter(s => s.latency && s.latency.p50)
      .map(s => s.latency.p50);
    
    if (latencies.length === 0) return 0;
    return latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
  }

  calculateTotalCost(stats) {
    return Object.values(stats)
      .reduce((sum, s) => sum + (s.cost?.total || 0), 0);
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new BenchmarkRunner();
  runner.run().catch(error => {
    console.error('[ERROR]', error);
    process.exit(1);
  });
}

module.exports = BenchmarkRunner;
