/**
 * Regression Test Suite
 * Catches breaking changes and performance degradation
 */

const fs = require('fs');
const path = require('path');
const { AgentTestHarness } = require('./agent-test-harness');
const { QualityMetrics } = require('./quality-metrics');

class RegressionTestSuite {
  constructor(config = {}) {
    this.config = {
      baselineDir: config.baselineDir || path.join(__dirname, 'baselines'),
      resultsDir: config.resultsDir || path.join(__dirname, 'regression-results'),
      tolerancePercentage: config.tolerancePercentage || 10, // Allow 10% deviation
      ...config
    };

    this.harness = new AgentTestHarness(config);
    this.metrics = new QualityMetrics(config);
    this.regressions = [];
    this.improvements = [];

    // Ensure directories exist
    if (!fs.existsSync(this.config.baselineDir)) {
      fs.mkdirSync(this.config.baselineDir, { recursive: true });
    }
    if (!fs.existsSync(this.config.resultsDir)) {
      fs.mkdirSync(this.config.resultsDir, { recursive: true });
    }
  }

  /**
   * Load baseline metrics
   */
  loadBaseline(testName) {
    const baselinePath = path.join(this.config.baselineDir, `${testName}-baseline.json`);
    
    if (!fs.existsSync(baselinePath)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    } catch (error) {
      console.error(`Error loading baseline for ${testName}:`, error.message);
      return null;
    }
  }

  /**
   * Save baseline metrics
   */
  saveBaseline(testName, metrics) {
    const baselinePath = path.join(this.config.baselineDir, `${testName}-baseline.json`);
    
    return new Promise((resolve, reject) => {
      fs.writeFile(baselinePath, JSON.stringify(metrics, null, 2), (error) => {
        if (error) reject(error);
        else resolve(baselinePath);
      });
    });
  }

  /**
   * Compare current metrics with baseline
   */
  compareWithBaseline(testName, currentMetrics) {
    const baseline = this.loadBaseline(testName);

    if (!baseline) {
      return {
        isFirstRun: true,
        hasRegression: false,
        changes: {}
      };
    }

    const changes = {};
    const tolerance = this.config.tolerancePercentage / 100;
    let hasRegression = false;

    // Compare accuracy (should not decrease)
    if (baseline.accuracy !== undefined && currentMetrics.accuracy !== undefined) {
      const change = ((currentMetrics.accuracy - baseline.accuracy) / baseline.accuracy) * 100;
      changes.accuracy = {
        baseline: baseline.accuracy,
        current: currentMetrics.accuracy,
        change: change.toFixed(2) + '%',
        isRegression: currentMetrics.accuracy < (baseline.accuracy * (1 - tolerance))
      };
      if (changes.accuracy.isRegression) hasRegression = true;
    }

    // Compare latency (should not increase significantly)
    if (baseline.latency !== undefined && currentMetrics.latency !== undefined) {
      const change = ((currentMetrics.latency - baseline.latency) / baseline.latency) * 100;
      changes.latency = {
        baseline: baseline.latency,
        current: currentMetrics.latency,
        change: change.toFixed(2) + '%',
        isRegression: currentMetrics.latency > (baseline.latency * (1 + tolerance))
      };
      if (changes.latency.isRegression) hasRegression = true;
    }

    // Compare cost (should not increase significantly)
    if (baseline.cost !== undefined && currentMetrics.cost !== undefined) {
      const change = ((currentMetrics.cost - baseline.cost) / baseline.cost) * 100;
      changes.cost = {
        baseline: baseline.cost,
        current: currentMetrics.cost,
        change: change.toFixed(2) + '%',
        isRegression: currentMetrics.cost > (baseline.cost * (1 + tolerance))
      };
      if (changes.cost.isRegression) hasRegression = true;
    }

    // Compare coherence (should not decrease)
    if (baseline.coherence !== undefined && currentMetrics.coherence !== undefined) {
      const change = ((currentMetrics.coherence - baseline.coherence) / baseline.coherence) * 100;
      changes.coherence = {
        baseline: baseline.coherence,
        current: currentMetrics.coherence,
        change: change.toFixed(2) + '%',
        isRegression: currentMetrics.coherence < (baseline.coherence * (1 - tolerance))
      };
      if (changes.coherence.isRegression) hasRegression = true;
    }

    return {
      isFirstRun: false,
      hasRegression,
      changes
    };
  }

  /**
   * Run a regression test
   */
  async runRegressionTest(testName, testCase) {
    console.log(`Running regression test: ${testName}`);

    try {
      // Execute the test
      const result = await this.harness.executeTest(testName, testCase);

      if (result.status !== 'passed') {
        throw new Error(`Test failed: ${result.error}`);
      }

      // Collect metrics
      const currentMetrics = {
        accuracy: result.metrics.accuracy || 0,
        latency: result.metrics.latency || 0,
        cost: result.metrics.estimatedCost || 0,
        coherence: result.metrics.coherenceScore || 0,
        timestamp: new Date().toISOString()
      };

      // Compare with baseline
      const comparison = this.compareWithBaseline(testName, currentMetrics);

      if (comparison.isFirstRun) {
        // Save as baseline for first run
        await this.saveBaseline(testName, currentMetrics);
        return {
          testName,
          status: 'passed',
          isFirstRun: true,
          message: 'Baseline established',
          metrics: currentMetrics
        };
      }

      if (comparison.hasRegression) {
        this.regressions.push({
          testName,
          changes: comparison.changes,
          timestamp: new Date().toISOString()
        });

        return {
          testName,
          status: 'failed',
          hasRegression: true,
          message: 'Performance regression detected',
          changes: comparison.changes,
          metrics: currentMetrics
        };
      }

      // Check for improvements
      let hasImprovement = false;
      for (const [metric, change] of Object.entries(comparison.changes)) {
        if (metric === 'latency' || metric === 'cost') {
          if (change.change.startsWith('-')) hasImprovement = true;
        } else {
          if (change.change.startsWith('+')) hasImprovement = true;
        }
      }

      if (hasImprovement) {
        this.improvements.push({
          testName,
          changes: comparison.changes,
          timestamp: new Date().toISOString()
        });
      }

      return {
        testName,
        status: 'passed',
        hasRegression: false,
        hasImprovement,
        message: 'Within acceptable tolerance',
        changes: comparison.changes,
        metrics: currentMetrics
      };

    } catch (error) {
      return {
        testName,
        status: 'error',
        message: error.message,
        error: true
      };
    }
  }

  /**
   * Run full regression suite
   */
  async runRegressionSuite(testSuite) {
    const results = [];
    const startTime = Date.now();

    console.log(`Starting regression test suite with ${testSuite.length} tests`);

    for (const testCase of testSuite) {
      const result = await this.runRegressionTest(testCase.name, testCase);
      results.push(result);

      console.log(`✓ ${testCase.name}: ${result.status.toUpperCase()}`);
    }

    const duration = Date.now() - startTime;

    const summary = {
      totalTests: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      errors: results.filter(r => r.status === 'error').length,
      regressions: this.regressions.length,
      improvements: this.improvements.length,
      duration,
      timestamp: new Date().toISOString(),
      results
    };

    // Save results
    await this.saveRegressionResults(summary);

    return summary;
  }

  /**
   * Save regression results
   */
  async saveRegressionResults(summary) {
    const filename = path.join(
      this.config.resultsDir,
      `regression-results-${Date.now()}.json`
    );

    return new Promise((resolve, reject) => {
      fs.writeFile(filename, JSON.stringify(summary, null, 2), (error) => {
        if (error) reject(error);
        else resolve(filename);
      });
    });
  }

  /**
   * Generate regression report
   */
  generateRegressionReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        regressions: this.regressions.length,
        improvements: this.improvements.length,
        status: this.regressions.length > 0 ? 'FAILED' : 'PASSED'
      },
      regressions: this.regressions.map(r => ({
        test: r.testName,
        changes: r.changes,
        timestamp: r.timestamp
      })),
      improvements: this.improvements.map(i => ({
        test: i.testName,
        changes: i.changes,
        timestamp: i.timestamp
      })),
      recommendations: this.generateRegressionRecommendations()
    };

    return report;
  }

  /**
   * Generate recommendations
   */
  generateRegressionRecommendations() {
    const recommendations = [];

    if (this.regressions.length > 0) {
      recommendations.push({
        level: 'critical',
        message: `${this.regressions.length} regression(s) detected - investigate and fix immediately`
      });

      for (const regression of this.regressions) {
        for (const [metric, change] of Object.entries(regression.changes)) {
          if (change.isRegression) {
            recommendations.push({
              level: 'error',
              message: `${regression.testName}: ${metric} regressed by ${change.change}`
            });
          }
        }
      }
    }

    if (this.improvements.length > 0) {
      recommendations.push({
        level: 'info',
        message: `${this.improvements.length} improvement(s) detected - great work!`
      });
    }

    if (this.regressions.length === 0 && this.improvements.length === 0) {
      recommendations.push({
        level: 'success',
        message: 'All tests within acceptable tolerances'
      });
    }

    return recommendations;
  }

  /**
   * Teardown
   */
  async teardown() {
    await this.harness.teardown();
  }
}

/**
 * Continuous Regression Monitoring
 */
class ContinuousRegressionMonitor {
  constructor(config = {}) {
    this.config = {
      checkInterval: config.checkInterval || 3600000, // 1 hour
      windowSize: config.windowSize || 10, // Last 10 results
      ...config
    };

    this.testHistory = new Map();
  }

  /**
   * Record test result
   */
  recordResult(testName, metrics) {
    if (!this.testHistory.has(testName)) {
      this.testHistory.set(testName, []);
    }

    const history = this.testHistory.get(testName);
    history.push({
      metrics,
      timestamp: Date.now()
    });

    // Keep only last N results
    if (history.length > this.config.windowSize) {
      history.shift();
    }
  }

  /**
   * Detect trends
   */
  detectTrends(testName) {
    const history = this.testHistory.get(testName);
    if (!history || history.length < 3) {
      return { trend: 'insufficient-data' };
    }

    // Calculate trend for each metric
    const trends = {};
    const metrics = Object.keys(history[0].metrics);

    for (const metric of metrics) {
      const values = history.map(h => h.metrics[metric]);
      const trend = this.calculateTrend(values);
      trends[metric] = trend;
    }

    return { trends, dataPoints: history.length };
  }

  /**
   * Calculate trend
   */
  calculateTrend(values) {
    if (values.length < 2) return 'insufficient-data';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const changePercent = ((avgSecond - avgFirst) / avgFirst) * 100;

    if (Math.abs(changePercent) < 5) return 'stable';
    if (changePercent > 0) return 'degrading';
    return 'improving';
  }

  /**
   * Get health report
   */
  getHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        totalTests: this.testHistory.size,
        improving: 0,
        stable: 0,
        degrading: 0
      }
    };

    for (const [testName, history] of this.testHistory) {
      const trendInfo = this.detectTrends(testName);

      const testReport = {
        testName,
        dataPoints: trendInfo.dataPoints,
        trends: trendInfo.trends
      };

      report.tests.push(testReport);

      if (trendInfo.trends) {
        for (const trend of Object.values(trendInfo.trends)) {
          if (trend === 'improving') report.summary.improving++;
          else if (trend === 'stable') report.summary.stable++;
          else if (trend === 'degrading') report.summary.degrading++;
        }
      }
    }

    return report;
  }
}

module.exports = { RegressionTestSuite, ContinuousRegressionMonitor };
