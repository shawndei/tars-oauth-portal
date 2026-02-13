/**
 * Regression Detection Library
 * Compares current results against baselines and detects regressions
 */

const fs = require('fs');
const path = require('path');

class RegressionDetector {
  constructor(baselinePath) {
    this.baselinePath = baselinePath;
    this.baseline = this.loadBaseline();
    
    this.thresholds = {
      latency: {
        critical: 0.30,    // 30% slower
        warning: 0.15,     // 15% slower
        acceptable: 0.05   // 5% slower
      },
      throughput: {
        critical: -0.30,   // 30% lower
        warning: -0.15,    // 15% lower
        acceptable: -0.05  // 5% lower
      },
      cost: {
        critical: 0.25,    // 25% more expensive
        warning: 0.10,     // 10% more expensive
        acceptable: 0.03   // 3% more expensive
      },
      accuracy: {
        critical: -0.05,   // 5% less accurate
        warning: -0.02,    // 2% less accurate
        acceptable: -0.01  // 1% less accurate
      }
    };
  }

  /**
   * Load baseline from file
   */
  loadBaseline() {
    if (!fs.existsSync(this.baselinePath)) {
      return null;
    }
    
    try {
      const data = fs.readFileSync(this.baselinePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn(`Warning: Could not load baseline: ${error.message}`);
      return null;
    }
  }

  /**
   * Save baseline to file
   */
  saveBaseline(results) {
    const baseline = {
      version: '1.0',
      created: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      benchmarks: {}
    };
    
    for (const [testName, result] of Object.entries(results)) {
      baseline.benchmarks[testName] = {
        latency: result.latency,
        throughput: result.throughput,
        cost: result.cost,
        accuracy: result.accuracy
      };
    }
    
    fs.writeFileSync(this.baselinePath, JSON.stringify(baseline, null, 2));
    console.log(`✓ Baseline saved: ${this.baselinePath}`);
    
    return baseline;
  }

  /**
   * Compare current results against baseline
   */
  compare(currentResults) {
    if (!this.baseline || !this.baseline.benchmarks) {
      console.log('ℹ No baseline found - this will become the new baseline');
      return {
        hasBaseline: false,
        hasRegressions: false,
        improvements: [],
        regressions: [],
        summary: 'No baseline available for comparison'
      };
    }
    
    const regressions = [];
    const improvements = [];
    
    for (const [testName, current] of Object.entries(currentResults)) {
      const base = this.baseline.benchmarks[testName];
      
      if (!base) {
        console.log(`ℹ New test detected: ${testName}`);
        continue;
      }
      
      // Check latency
      const latencyCheck = this.checkLatency(testName, current.latency, base.latency);
      if (latencyCheck.regression) {
        regressions.push(latencyCheck);
      } else if (latencyCheck.improvement) {
        improvements.push(latencyCheck);
      }
      
      // Check throughput
      const throughputCheck = this.checkThroughput(testName, current.throughput, base.throughput);
      if (throughputCheck.regression) {
        regressions.push(throughputCheck);
      } else if (throughputCheck.improvement) {
        improvements.push(throughputCheck);
      }
      
      // Check cost
      if (current.cost && base.cost) {
        const costCheck = this.checkCost(testName, current.cost, base.cost);
        if (costCheck.regression) {
          regressions.push(costCheck);
        } else if (costCheck.improvement) {
          improvements.push(costCheck);
        }
      }
      
      // Check accuracy
      const accuracyCheck = this.checkAccuracy(testName, current.accuracy, base.accuracy);
      if (accuracyCheck.regression) {
        regressions.push(accuracyCheck);
      } else if (accuracyCheck.improvement) {
        improvements.push(accuracyCheck);
      }
    }
    
    const criticalCount = regressions.filter(r => r.severity === 'CRITICAL').length;
    const warningCount = regressions.filter(r => r.severity === 'WARNING').length;
    
    return {
      hasBaseline: true,
      hasRegressions: regressions.length > 0,
      hasImprovements: improvements.length > 0,
      criticalCount,
      warningCount,
      regressions,
      improvements,
      summary: this.generateSummary(regressions, improvements)
    };
  }

  /**
   * Check latency for regression/improvement
   */
  checkLatency(testName, current, baseline) {
    if (!current || !baseline) return { regression: false, improvement: false };
    
    const p50Change = (current.p50 - baseline.p50) / baseline.p50;
    const p95Change = (current.p95 - baseline.p95) / baseline.p95;
    
    // Check for regression
    if (p50Change > this.thresholds.latency.critical || p95Change > this.thresholds.latency.critical) {
      return {
        regression: true,
        test: testName,
        metric: 'latency',
        severity: 'CRITICAL',
        change_percent: (p50Change * 100).toFixed(1),
        baseline_p50: baseline.p50,
        current_p50: current.p50,
        baseline_p95: baseline.p95,
        current_p95: current.p95,
        message: `Latency increased by ${(p50Change * 100).toFixed(1)}% (p50: ${baseline.p50}ms → ${current.p50}ms)`
      };
    } else if (p50Change > this.thresholds.latency.warning) {
      return {
        regression: true,
        test: testName,
        metric: 'latency',
        severity: 'WARNING',
        change_percent: (p50Change * 100).toFixed(1),
        baseline_p50: baseline.p50,
        current_p50: current.p50,
        message: `Latency increased by ${(p50Change * 100).toFixed(1)}%`
      };
    }
    
    // Check for improvement
    if (p50Change < -0.10) {  // 10% faster
      return {
        improvement: true,
        test: testName,
        metric: 'latency',
        change_percent: (Math.abs(p50Change) * 100).toFixed(1),
        baseline_p50: baseline.p50,
        current_p50: current.p50,
        message: `Latency improved by ${(Math.abs(p50Change) * 100).toFixed(1)}% (${baseline.p50}ms → ${current.p50}ms)`
      };
    }
    
    return { regression: false, improvement: false };
  }

  /**
   * Check throughput for regression/improvement
   */
  checkThroughput(testName, current, baseline) {
    if (!current || !baseline) return { regression: false, improvement: false };
    
    const change = (current.ops_per_sec - baseline.ops_per_sec) / baseline.ops_per_sec;
    
    if (change < this.thresholds.throughput.critical) {
      return {
        regression: true,
        test: testName,
        metric: 'throughput',
        severity: 'CRITICAL',
        change_percent: (change * 100).toFixed(1),
        baseline: baseline.ops_per_sec,
        current: current.ops_per_sec,
        message: `Throughput decreased by ${(Math.abs(change) * 100).toFixed(1)}%`
      };
    } else if (change < this.thresholds.throughput.warning) {
      return {
        regression: true,
        test: testName,
        metric: 'throughput',
        severity: 'WARNING',
        change_percent: (change * 100).toFixed(1),
        baseline: baseline.ops_per_sec,
        current: current.ops_per_sec,
        message: `Throughput decreased by ${(Math.abs(change) * 100).toFixed(1)}%`
      };
    }
    
    if (change > 0.10) {
      return {
        improvement: true,
        test: testName,
        metric: 'throughput',
        change_percent: (change * 100).toFixed(1),
        baseline: baseline.ops_per_sec,
        current: current.ops_per_sec,
        message: `Throughput improved by ${(change * 100).toFixed(1)}%`
      };
    }
    
    return { regression: false, improvement: false };
  }

  /**
   * Check cost for regression/improvement
   */
  checkCost(testName, current, baseline) {
    if (!current.per_operation || !baseline.per_operation) {
      return { regression: false, improvement: false };
    }
    
    const change = (current.per_operation - baseline.per_operation) / baseline.per_operation;
    
    if (change > this.thresholds.cost.critical) {
      return {
        regression: true,
        test: testName,
        metric: 'cost',
        severity: 'CRITICAL',
        change_percent: (change * 100).toFixed(1),
        baseline: baseline.per_operation,
        current: current.per_operation,
        message: `Cost increased by ${(change * 100).toFixed(1)}%`
      };
    } else if (change > this.thresholds.cost.warning) {
      return {
        regression: true,
        test: testName,
        metric: 'cost',
        severity: 'WARNING',
        change_percent: (change * 100).toFixed(1),
        baseline: baseline.per_operation,
        current: current.per_operation,
        message: `Cost increased by ${(change * 100).toFixed(1)}%`
      };
    }
    
    if (change < -0.10) {
      return {
        improvement: true,
        test: testName,
        metric: 'cost',
        change_percent: (Math.abs(change) * 100).toFixed(1),
        baseline: baseline.per_operation,
        current: current.per_operation,
        message: `Cost reduced by ${(Math.abs(change) * 100).toFixed(1)}%`
      };
    }
    
    return { regression: false, improvement: false };
  }

  /**
   * Check accuracy for regression/improvement
   */
  checkAccuracy(testName, current, baseline) {
    if (!current || !baseline) return { regression: false, improvement: false };
    
    const change = current.success_rate - baseline.success_rate;
    
    if (change < this.thresholds.accuracy.critical) {
      return {
        regression: true,
        test: testName,
        metric: 'accuracy',
        severity: 'CRITICAL',
        change_percent: (change * 100).toFixed(2),
        baseline: baseline.success_rate,
        current: current.success_rate,
        message: `Success rate decreased by ${(Math.abs(change) * 100).toFixed(2)}%`
      };
    } else if (change < this.thresholds.accuracy.warning) {
      return {
        regression: true,
        test: testName,
        metric: 'accuracy',
        severity: 'WARNING',
        change_percent: (change * 100).toFixed(2),
        baseline: baseline.success_rate,
        current: current.success_rate,
        message: `Success rate decreased by ${(Math.abs(change) * 100).toFixed(2)}%`
      };
    }
    
    return { regression: false, improvement: false };
  }

  /**
   * Generate summary text
   */
  generateSummary(regressions, improvements) {
    if (regressions.length === 0 && improvements.length === 0) {
      return 'No significant changes detected';
    }
    
    const parts = [];
    
    if (regressions.length > 0) {
      const critical = regressions.filter(r => r.severity === 'CRITICAL').length;
      const warnings = regressions.filter(r => r.severity === 'WARNING').length;
      parts.push(`${regressions.length} regression(s) detected (${critical} critical, ${warnings} warnings)`);
    }
    
    if (improvements.length > 0) {
      parts.push(`${improvements.length} improvement(s) detected`);
    }
    
    return parts.join('; ');
  }

  /**
   * Should update baseline based on results
   */
  shouldUpdateBaseline(comparison) {
    // Update if no regressions and has significant improvements
    return !comparison.hasRegressions && 
           comparison.hasImprovements && 
           comparison.improvements.length >= 2;
  }
}

module.exports = RegressionDetector;
