#!/usr/bin/env node

/**
 * Main Test Runner
 * Orchestrates all testing: unit, integration, regression, and quality metrics
 */

const { AgentTestHarness } = require('./agent-test-harness');
const { AgentTestSuiteFactory } = require('./agent-test-suite');
const { QualityMetrics } = require('./quality-metrics');
const { RegressionTestSuite } = require('./regression-test-suite');

class TestRunner {
  constructor(config = {}) {
    this.config = {
      agents: config.agents || ['researcher', 'analyst', 'coder', 'writer', 'coordinator'],
      testTypes: config.testTypes || ['unit', 'integration', 'regression'],
      verbose: config.verbose !== false,
      timeout: config.timeout || 60000,
      ...config
    };

    this.results = {
      unit: null,
      integration: null,
      regression: null,
      metrics: null
    };

    this.harness = new AgentTestHarness({ timeout: this.config.timeout });
    this.metrics = new QualityMetrics();
    this.regressionSuite = new RegressionTestSuite();
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive agent testing framework\n');

    const startTime = Date.now();

    try {
      // Unit tests
      if (this.config.testTypes.includes('unit')) {
        console.log('📝 Running unit tests...');
        await this.runUnitTests();
      }

      // Integration tests
      if (this.config.testTypes.includes('integration')) {
        console.log('\n🔗 Running integration tests...');
        await this.runIntegrationTests();
      }

      // Regression tests
      if (this.config.testTypes.includes('regression')) {
        console.log('\n🔄 Running regression tests...');
        await this.runRegressionTests();
      }

      // Generate reports
      await this.generateReports();

      const duration = (Date.now() - startTime) / 1000;
      console.log(`\n✅ Test suite completed in ${duration.toFixed(2)}s`);

      return this.results;

    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Run unit tests
   */
  async runUnitTests() {
    const unitTests = [];

    for (const agent of this.config.agents) {
      const tests = AgentTestSuiteFactory.getTestsByAgent(`${agent}-primary`);
      // Take first 2 tests per agent for unit testing
      unitTests.push(...tests.slice(0, 2));
    }

    const results = await this.harness.runTestSuite(unitTests);
    this.results.unit = results;

    console.log(`✓ Unit tests: ${results.passed}/${results.totalTests} passed`);
    console.log(`  Average latency: ${results.averageLatency.toFixed(0)}ms`);
    console.log(`  Total cost: $${results.totalCost.toFixed(4)}`);

    // Record metrics
    for (const result of results.results) {
      if (result.status === 'passed') {
        this.metrics.recordMetric('accuracy', result.metrics.accuracy, {
          agentId: result.agentId,
          testName: result.testName
        });
        this.metrics.recordMetric('latency', result.metrics.latency, {
          agentId: result.agentId
        });
        this.metrics.recordMetric('cost', result.metrics.estimatedCost, {
          agentId: result.agentId
        });
        this.metrics.recordMetric('coherence', result.metrics.coherenceScore, {
          agentId: result.agentId
        });
      }
    }
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    const integrationTests = [];

    for (const agent of this.config.agents) {
      const tests = AgentTestSuiteFactory.getTestsByAgent(`${agent}-primary`);
      // Use all tests for integration testing
      integrationTests.push(...tests);
    }

    const results = await this.harness.runTestSuite(integrationTests, {
      parallel: true,
      parallelLimit: 3
    });

    this.results.integration = results;

    console.log(`✓ Integration tests: ${results.passed}/${results.totalTests} passed`);
    console.log(`  Success rate: ${(results.successRate * 100).toFixed(1)}%`);
    console.log(`  Average cost: $${results.averageCost.toFixed(4)}`);

    // Record metrics
    for (const result of results.results) {
      if (result.status === 'passed') {
        this.metrics.recordMetric('accuracy', result.metrics.accuracy, {
          agentId: result.agentId,
          testName: result.testName
        });
        this.metrics.recordMetric('latency', result.metrics.latency, {
          agentId: result.agentId
        });
        this.metrics.recordMetric('cost', result.metrics.estimatedCost, {
          agentId: result.agentId
        });
        this.metrics.recordMetric('coherence', result.metrics.coherenceScore, {
          agentId: result.agentId
        });
      }
    }
  }

  /**
   * Run regression tests
   */
  async runRegressionTests() {
    const regressionTests = [];

    for (const agent of this.config.agents) {
      const tests = AgentTestSuiteFactory.getTestsByAgent(`${agent}-primary`);
      // Use all tests for regression testing
      regressionTests.push(...tests);
    }

    const results = await this.regressionSuite.runRegressionSuite(regressionTests);

    this.results.regression = results;

    console.log(`✓ Regression tests: ${results.passed}/${results.totalTests} passed`);
    console.log(`  Regressions detected: ${results.regressions}`);
    console.log(`  Improvements: ${results.improvements}`);
  }

  /**
   * Generate reports
   */
  async generateReports() {
    const summary = await this.harness.getSummaryReport();
    const metricsReport = this.metrics.generateReport();
    const regressionReport = this.regressionSuite.generateRegressionReport();

    this.results.metrics = {
      summary,
      metrics: metricsReport,
      regression: regressionReport
    };

    // Save to file
    await this.metrics.saveMetrics(`agent-test-metrics-${Date.now()}.json`);
  }

  /**
   * Print summary report
   */
  printSummaryReport() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));

    if (this.results.unit) {
      console.log('\n📋 UNIT TESTS');
      console.log(`  Total: ${this.results.unit.totalTests}`);
      console.log(`  Passed: ${this.results.unit.passed}`);
      console.log(`  Failed: ${this.results.unit.failed}`);
      console.log(`  Success Rate: ${(this.results.unit.successRate * 100).toFixed(1)}%`);
    }

    if (this.results.integration) {
      console.log('\n🔗 INTEGRATION TESTS');
      console.log(`  Total: ${this.results.integration.totalTests}`);
      console.log(`  Passed: ${this.results.integration.passed}`);
      console.log(`  Failed: ${this.results.integration.failed}`);
      console.log(`  Success Rate: ${(this.results.integration.successRate * 100).toFixed(1)}%`);
    }

    if (this.results.regression) {
      console.log('\n🔄 REGRESSION TESTS');
      console.log(`  Total: ${this.results.regression.totalTests}`);
      console.log(`  Passed: ${this.results.regression.passed}`);
      console.log(`  Regressions: ${this.results.regression.regressions}`);
      console.log(`  Improvements: ${this.results.regression.improvements}`);
    }

    if (this.results.metrics) {
      console.log('\n📊 QUALITY METRICS');
      const metrics = this.results.metrics.summary;
      if (metrics.accuracy) {
        console.log(`  Accuracy: ${(metrics.accuracy.avg * 100).toFixed(1)}% (${metrics.accuracy.status})`);
      }
      if (metrics.latency) {
        console.log(`  Latency: ${metrics.latency.avg.toFixed(0)}ms (${metrics.latency.status})`);
      }
      if (metrics.cost) {
        console.log(`  Cost: $${metrics.cost.avg.toFixed(4)} (${metrics.cost.status})`);
      }
      if (metrics.coherence) {
        console.log(`  Coherence: ${(metrics.coherence.avg * 100).toFixed(1)}% (${metrics.coherence.status})`);
      }

      console.log(`\n  Overall Health: ${this.results.metrics.metrics.overallHealth.score} (${this.results.metrics.metrics.overallHealth.status})`);
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Cleanup
   */
  async cleanup() {
    await this.harness.teardown();
    await this.regressionSuite.teardown();
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const config = {
    verbose: !args.includes('--quiet'),
    testTypes: args.includes('--regression') 
      ? ['regression'] 
      : args.includes('--integration')
      ? ['unit', 'integration']
      : ['unit', 'integration', 'regression']
  };

  const runner = new TestRunner(config);

  try {
    await runner.runAllTests();
    runner.printSummaryReport();

    // Exit with success if no regressions
    const hasFailures = runner.results.unit?.failed > 0 || 
                       runner.results.integration?.failed > 0 ||
                       runner.results.regression?.regressions > 0;

    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { TestRunner };
