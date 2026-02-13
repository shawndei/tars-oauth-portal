/**
 * Test Suite for Performance Benchmarking Framework
 * 
 * Tests metrics collection, regression detection, and reporting
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const MetricsCollector = require('./benchmarks/lib/metrics');
const RegressionDetector = require('./benchmarks/lib/regression');
const Reporter = require('./benchmarks/lib/reporter');

class FrameworkTests {
  constructor() {
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.tests = [];
  }

  async runAll() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  Performance Framework Test Suite                  ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    await this.testMetricsCollection();
    await this.testStatisticalCalculations();
    await this.testRegressionDetection();
    await this.testBaselineManagement();
    await this.testReportGeneration();

    this.printSummary();
    
    return this.testsFailed === 0;
  }

  async test(name, fn) {
    process.stdout.write(`  ${name.padEnd(50)} `);
    try {
      await fn();
      console.log('✓');
      this.testsPassed++;
      return true;
    } catch (error) {
      console.log(`✗\n    Error: ${error.message}`);
      this.testsFailed++;
      return false;
    }
  }

  async testMetricsCollection() {
    console.log('\n[1] Metrics Collection');
    
    await this.test('Should start and end operation', async () => {
      const collector = new MetricsCollector();
      const context = collector.startOperation('test_op');
      
      assert(context.operationId);
      assert(context.operationName === 'test_op');
      assert(context.startTime > 0);
      
      await this.sleep(50);
      
      const metric = collector.endOperation(context, { success: true });
      
      assert(metric.latency >= 50);
      assert(metric.success === true);
      assert(collector.metrics.length === 1);
    });

    await this.test('Should collect multiple metrics', async () => {
      const collector = new MetricsCollector();
      
      for (let i = 0; i < 5; i++) {
        const context = collector.startOperation('test_op');
        await this.sleep(10);
        collector.endOperation(context, { success: true, cost: 0.01, tokens: 100 });
      }
      
      assert(collector.metrics.length === 5);
      
      const grouped = collector.groupByOperation();
      assert(grouped['test_op'].length === 5);
    });

    await this.test('Should track memory usage', async () => {
      const collector = new MetricsCollector();
      const context = collector.startOperation('memory_test');
      
      // Allocate some memory
      const arr = new Array(1000000).fill(0);
      
      const metric = collector.endOperation(context, { success: true });
      
      assert(metric.memory);
      assert(typeof metric.memory.heapUsed === 'number');
    });

    await this.test('Should export metrics correctly', async () => {
      const collector = new MetricsCollector();
      
      const context = collector.startOperation('test');
      collector.endOperation(context, { success: true });
      
      const exported = collector.export();
      
      assert(exported.metrics);
      assert(exported.stats);
      assert(exported.timestamp);
      assert(exported.totalOperations === 1);
    });
  }

  async testStatisticalCalculations() {
    console.log('\n[2] Statistical Calculations');

    await this.test('Should calculate percentiles correctly', async () => {
      const collector = new MetricsCollector();
      
      // Create metrics with known latencies
      const latencies = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      
      for (const latency of latencies) {
        const context = collector.startOperation('test');
        await this.sleep(latency);
        collector.endOperation(context, { success: true });
      }
      
      const stats = collector.getAggregatedStats();
      const testStats = stats['test'];
      
      assert(testStats.latency.p50 >= 450 && testStats.latency.p50 <= 550);
      assert(testStats.latency.p90 >= 850 && testStats.latency.p90 <= 1000);
      assert(testStats.latency.min >= 100);
      assert(testStats.latency.max >= 1000);
    });

    await this.test('Should calculate throughput', async () => {
      const collector = new MetricsCollector();
      
      for (let i = 0; i < 10; i++) {
        const context = collector.startOperation('test');
        await this.sleep(10);
        collector.endOperation(context, { success: true });
      }
      
      const stats = collector.getAggregatedStats();
      assert(stats['test'].throughput.ops_per_sec > 0);
    });

    await this.test('Should calculate cost metrics', async () => {
      const collector = new MetricsCollector();
      
      for (let i = 0; i < 5; i++) {
        const context = collector.startOperation('test');
        collector.endOperation(context, { success: true, cost: 0.01, tokens: 1000 });
      }
      
      const stats = collector.getAggregatedStats();
      
      assert(stats['test'].cost.total === 0.05);
      assert(stats['test'].cost.mean === 0.01);
      assert(stats['test'].tokens.total === 5000);
    });

    await this.test('Should calculate success rate', async () => {
      const collector = new MetricsCollector();
      
      // 8 successes, 2 failures
      for (let i = 0; i < 10; i++) {
        const context = collector.startOperation('test');
        collector.endOperation(context, { success: i < 8 });
      }
      
      const stats = collector.getAggregatedStats();
      
      assert(stats['test'].accuracy.success_rate === 0.8);
      assert(stats['test'].accuracy.error_rate === 0.2);
      assert(stats['test'].accuracy.success_count === 8);
    });
  }

  async testRegressionDetection() {
    console.log('\n[3] Regression Detection');

    await this.test('Should detect latency regression', async () => {
      const detector = new RegressionDetector();
      
      // Create baseline
      const baseline = {
        test_op: {
          latency: { p50: 100, p95: 200 },
          throughput: { ops_per_sec: 10 },
          cost: { cost_per_op: 0.01 }
        }
      };
      
      detector.baseline = { benchmarks: baseline, version: '1.0' };
      
      // Current stats showing 40% regression (critical)
      const current = {
        test_op: {
          latency: { p50: 140, p95: 280 },
          throughput: { ops_per_sec: 10 },
          cost: { cost_per_op: 0.01 }
        }
      };
      
      const result = detector.detectRegressions(current);
      
      assert(result.hasRegressions === true);
      assert(result.criticalCount > 0 || result.warningCount > 0);
    });

    await this.test('Should detect cost regression', async () => {
      const detector = new RegressionDetector();
      
      detector.baseline = {
        benchmarks: {
          test_op: {
            cost: { cost_per_op: 0.01 }
          }
        }
      };
      
      // 30% cost increase (critical threshold is 25%)
      const current = {
        test_op: {
          cost: { cost_per_op: 0.013 }
        }
      };
      
      const result = detector.detectRegressions(current);
      
      assert(result.hasRegressions === true);
      assert(result.criticalCount > 0);
    });

    await this.test('Should detect improvements', async () => {
      const detector = new RegressionDetector();
      
      detector.baseline = {
        benchmarks: {
          test_op: {
            latency: { p50: 1000, p95: 2000 },
            cost: { cost_per_op: 0.05 }
          }
        }
      };
      
      // 50% improvement in latency
      const current = {
        test_op: {
          latency: { p50: 500, p95: 1000 },
          cost: { cost_per_op: 0.025 }
        }
      };
      
      const improvements = detector.detectImprovements(current);
      
      assert(improvements.hasImprovements === true);
      assert(improvements.improvements.length >= 2); // Latency and cost
    });

    await this.test('Should handle no baseline gracefully', async () => {
      const detector = new RegressionDetector();
      
      const current = {
        test_op: { latency: { p50: 100 } }
      };
      
      const result = detector.detectRegressions(current);
      
      assert(result.hasBaseline === false);
      assert(result.regressions.length === 0);
    });
  }

  async testBaselineManagement() {
    console.log('\n[4] Baseline Management');

    const testBasePath = path.join(__dirname, 'benchmarks/baselines/test-baseline.json');

    await this.test('Should save baseline', async () => {
      const detector = new RegressionDetector(testBasePath);
      
      const stats = {
        test_op: {
          latency: { p50: 100, p95: 200 },
          throughput: { ops_per_sec: 10 }
        }
      };
      
      const saved = detector.saveBaseline(stats, '1.0');
      
      assert(saved === true);
      assert(fs.existsSync(testBasePath));
      
      // Clean up
      if (fs.existsSync(testBasePath)) {
        fs.unlinkSync(testBasePath);
      }
    });

    await this.test('Should load baseline', async () => {
      const detector = new RegressionDetector(testBasePath);
      
      // Create baseline
      const stats = {
        test_op: { latency: { p50: 100 } }
      };
      detector.saveBaseline(stats, '1.0');
      
      // Load it
      const loaded = detector.loadBaseline();
      
      assert(loaded === true);
      assert(detector.baseline.benchmarks.test_op.latency.p50 === 100);
      
      // Clean up
      if (fs.existsSync(testBasePath)) {
        fs.unlinkSync(testBasePath);
      }
    });

    await this.test('Should archive old baselines', async () => {
      const detector = new RegressionDetector(testBasePath);
      
      // Create first baseline
      detector.saveBaseline({ test: { latency: { p50: 100 } } }, '1.0');
      
      // Update baseline (should archive old one)
      detector.saveBaseline({ test: { latency: { p50: 90 } } }, '1.1');
      
      const archiveDir = path.join(path.dirname(testBasePath), 'archive');
      
      assert(fs.existsSync(archiveDir));
      
      // Clean up
      if (fs.existsSync(testBasePath)) {
        fs.unlinkSync(testBasePath);
      }
      const archiveFiles = fs.readdirSync(archiveDir);
      archiveFiles.forEach(file => {
        fs.unlinkSync(path.join(archiveDir, file));
      });
      fs.rmdirSync(archiveDir);
    });
  }

  async testReportGeneration() {
    console.log('\n[5] Report Generation');

    const testReportDir = path.join(__dirname, 'benchmarks/reports/test-reports');

    await this.test('Should generate JSON report', async () => {
      const reporter = new Reporter(testReportDir);
      
      const stats = {
        test_op: {
          count: 10,
          latency: { p50: 100, p95: 200 },
          throughput: { ops_per_sec: 10 },
          cost: { total: 0.1, cost_per_op: 0.01 }
        }
      };
      
      const regressionReport = {
        hasRegressions: false,
        regressions: [],
        improvements: []
      };
      
      const paths = reporter.generateReports(stats, regressionReport);
      
      assert(fs.existsSync(paths.jsonPath));
      
      const json = JSON.parse(fs.readFileSync(paths.jsonPath, 'utf8'));
      assert(json.statistics);
      assert(json.summary);
      
      // Clean up
      fs.unlinkSync(paths.jsonPath);
      fs.unlinkSync(paths.htmlPath);
      fs.rmdirSync(testReportDir, { recursive: true });
    });

    await this.test('Should generate HTML report', async () => {
      const reporter = new Reporter(testReportDir);
      
      const stats = {
        test_op: {
          count: 5,
          latency: { p50: 100, p95: 200 },
          throughput: { ops_per_sec: 5 },
          cost: { total: 0.05, cost_per_op: 0.01 },
          accuracy: { success_rate: 0.98 }
        }
      };
      
      const regressionReport = {
        hasRegressions: true,
        criticalCount: 1,
        warningCount: 0,
        regressions: [{
          test: 'test_op',
          metric: 'latency',
          severity: 'CRITICAL',
          message: 'Test regression'
        }],
        improvements: [],
        summary: { totalImprovements: 0 }
      };
      
      const paths = reporter.generateReports(stats, regressionReport);
      
      assert(fs.existsSync(paths.htmlPath));
      
      const html = fs.readFileSync(paths.htmlPath, 'utf8');
      assert(html.includes('Performance Benchmark Report'));
      assert(html.includes('CRITICAL'));
      
      // Clean up
      fs.unlinkSync(paths.jsonPath);
      fs.unlinkSync(paths.htmlPath);
      fs.rmdirSync(testReportDir, { recursive: true });
    });
  }

  printSummary() {
    const total = this.testsPassed + this.testsFailed;
    
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  TEST SUMMARY                                      ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`  Total Tests:  ${total}`);
    console.log(`  Passed:       ${this.testsPassed} ✓`);
    console.log(`  Failed:       ${this.testsFailed} ${this.testsFailed > 0 ? '✗' : ''}`);
    console.log(`  Success Rate: ${((this.testsPassed / total) * 100).toFixed(1)}%`);
    console.log('═════════════════════════════════════════════════════\n');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if called directly
if (require.main === module) {
  const tests = new FrameworkTests();
  tests.runAll().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = FrameworkTests;
