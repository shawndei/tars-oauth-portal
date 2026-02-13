#!/usr/bin/env node

/**
 * Agent Testing Framework - Index
 * Exports all testing components for use in other modules
 */

const { AgentTestHarness, MockAgent } = require('./agent-test-harness');
const { AgentTestSuiteFactory } = require('./agent-test-suite');
const { QualityMetrics } = require('./quality-metrics');
const { RegressionTestSuite, ContinuousRegressionMonitor } = require('./regression-test-suite');
const { TestRunner } = require('./test-runner');

/**
 * Main testing framework exports
 */
module.exports = {
  // Core harness
  AgentTestHarness,
  MockAgent,

  // Test suites
  AgentTestSuiteFactory,

  // Quality metrics
  QualityMetrics,

  // Regression testing
  RegressionTestSuite,
  ContinuousRegressionMonitor,

  // Test runner
  TestRunner,

  /**
   * Quick start helper
   */
  async runTests(config = {}) {
    const runner = new TestRunner(config);
    return runner.runAllTests();
  },

  /**
   * Get metrics report
   */
  getMetricsReport() {
    const metrics = new QualityMetrics();
    return metrics.generateReport();
  },

  /**
   * Create test harness
   */
  createHarness(config = {}) {
    return new AgentTestHarness(config);
  },

  /**
   * Get all available tests
   */
  getAllTests() {
    return AgentTestSuiteFactory.getAllTests();
  },

  /**
   * Get tests by agent
   */
  getTestsByAgent(agentId) {
    return AgentTestSuiteFactory.getTestsByAgent(agentId);
  }
};

// CLI entry point
if (require.main === module) {
  require('./test-runner');
}
