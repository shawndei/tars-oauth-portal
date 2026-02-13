/**
 * Performance Regression Detection
 * Compares current benchmark results against baseline to detect regressions
 */

const fs = require('fs');
const path = require('path');

class RegressionDetector {
  constructor(baselinePath = null) {
    this.baselinePath = baselinePath || path.join(__dirname, '../baselines/baseline.json');
    this.baseline = null;
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
      memory: {
        critical: 0.50,    // 50% more memory
        warning: 0.25,     // 25% more memory
        acceptable: 0.10   // 10% more memory
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
    try {
      if (fs.existsSync(this.baselinePath)) {
        const data = fs.readFileSync(this.baselinePath, 'utf8');
        this.baseline = JSON.parse(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load baseline:', error.message);
      return false;
    }
  }

  /**
   * Save baseline to file
   */
  saveBaseline(stats, version = '1.0') {
    const baseline = {
      version,
      created: this.baseline?.created || new Date().toISOString(),
      last_updated: new Date().toISOString(),
      benchmarks: stats
    };

    try {
      // Ensure directory exists
      const dir = path.dirname(this.baselinePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Archive old baseline if it exists
      if (fs.existsSync(this.baselinePath)) {
        const archiveDir = path.join(dir, 'archive');
        if (!fs.existsSync(archiveDir)) {
          fs.mkdirSync(archiveDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = path.join(archiveDir, `baseline-${timestamp}.json`);
        fs.copyFileSync(this.baselinePath, archivePath);
      }

      // Write new baseline
      fs.writeFileSync(this.baselinePath, JSON.stringify(baseline, null, 2));
      this.baseline = baseline;
      return true;
    } catch (error) {
      console.error('Failed to save baseline:', error.message);
      return false;
    }
  }

  /**
   * Detect regressions by comparing current stats against baseline
   */
  detectRegressions(currentStats) {
    if (!this.baseline || !this.baseline.benchmarks) {
      return {
        hasBaseline: false,
        message: 'No baseline found. Run with --create-baseline to establish baseline.',
        regressions: []
      };
    }

    const regressions = [];

    for (const [testName, current] of Object.entries(currentStats)) {
      const base = this.baseline.benchmarks[testName];
      
      if (!base) {
        // New test, no baseline to compare
        continue;
      }

      // Check latency regression
      if (current.latency && base.latency) {
        const latencyRegression = this.checkMetricRegression(
          'latency',
          testName,
          current.latency.p50,
          base.latency.p50,
          this.thresholds.latency,
          'ms'
        );
        if (latencyRegression) regressions.push(latencyRegression);

        const p95Regression = this.checkMetricRegression(
          'latency_p95',
          testName,
          current.latency.p95,
          base.latency.p95,
          this.thresholds.latency,
          'ms'
        );
        if (p95Regression) regressions.push(p95Regression);
      }

      // Check throughput regression
      if (current.throughput && base.throughput) {
        const throughputRegression = this.checkMetricRegression(
          'throughput',
          testName,
          current.throughput.ops_per_sec,
          base.throughput.ops_per_sec,
          this.thresholds.throughput,
          'ops/sec',
          true // Lower is worse
        );
        if (throughputRegression) regressions.push(throughputRegression);
      }

      // Check cost regression
      if (current.cost && base.cost) {
        const costRegression = this.checkMetricRegression(
          'cost',
          testName,
          current.cost.cost_per_op,
          base.cost.cost_per_op,
          this.thresholds.cost,
          '$'
        );
        if (costRegression) regressions.push(costRegression);
      }

      // Check memory regression
      if (current.memory && base.memory) {
        const memoryRegression = this.checkMetricRegression(
          'memory',
          testName,
          current.memory.mean_heap_used,
          base.memory.mean_heap_used,
          this.thresholds.memory,
          'bytes'
        );
        if (memoryRegression) regressions.push(memoryRegression);
      }

      // Check accuracy regression
      if (current.accuracy && base.accuracy) {
        const accuracyRegression = this.checkMetricRegression(
          'accuracy',
          testName,
          current.accuracy.success_rate,
          base.accuracy.success_rate,
          this.thresholds.accuracy,
          '%',
          true // Lower is worse
        );
        if (accuracyRegression) regressions.push(accuracyRegression);
      }
    }

    return {
      hasBaseline: true,
      hasRegressions: regressions.length > 0,
      criticalCount: regressions.filter(r => r.severity === 'CRITICAL').length,
      warningCount: regressions.filter(r => r.severity === 'WARNING').length,
      regressions,
      baselineDate: this.baseline.last_updated
    };
  }

  /**
   * Check if a single metric has regressed
   */
  checkMetricRegression(metricName, testName, current, baseline, thresholds, unit, lowerIsWorse = false) {
    if (baseline === 0) return null; // Can't calculate percentage change
    
    const change = (current - baseline) / baseline;
    const absChange = Math.abs(change);
    
    // Determine if this is a regression based on whether lower is worse
    const isRegression = lowerIsWorse ? (change < 0) : (change > 0);
    
    if (!isRegression) return null; // Improvement, not regression
    
    let severity = null;
    
    if (absChange >= thresholds.critical) {
      severity = 'CRITICAL';
    } else if (absChange >= thresholds.warning) {
      severity = 'WARNING';
    } else if (absChange >= thresholds.acceptable) {
      severity = 'ACCEPTABLE';
    }
    
    if (!severity) return null; // Change within acceptable range
    
    return {
      test: testName,
      metric: metricName,
      severity,
      change: `${(change * 100).toFixed(1)}%`,
      changeValue: change,
      baseline: baseline,
      current: current,
      unit,
      message: `${testName} ${metricName}: ${current.toFixed(2)}${unit} vs baseline ${baseline.toFixed(2)}${unit} (${(change * 100).toFixed(1)}% ${change > 0 ? 'increase' : 'decrease'})`
    };
  }

  /**
   * Check if current results represent an improvement over baseline
   */
  detectImprovements(currentStats) {
    if (!this.baseline || !this.baseline.benchmarks) {
      return { hasImprovements: false, improvements: [] };
    }

    const improvements = [];
    const improvementThreshold = 0.10; // 10% improvement

    for (const [testName, current] of Object.entries(currentStats)) {
      const base = this.baseline.benchmarks[testName];
      if (!base) continue;

      // Check latency improvement
      if (current.latency && base.latency) {
        const change = (current.latency.p50 - base.latency.p50) / base.latency.p50;
        if (change < -improvementThreshold) {
          improvements.push({
            test: testName,
            metric: 'latency',
            improvement: `${(-change * 100).toFixed(1)}%`,
            baseline: base.latency.p50,
            current: current.latency.p50
          });
        }
      }

      // Check cost improvement
      if (current.cost && base.cost && base.cost.cost_per_op > 0) {
        const change = (current.cost.cost_per_op - base.cost.cost_per_op) / base.cost.cost_per_op;
        if (change < -improvementThreshold) {
          improvements.push({
            test: testName,
            metric: 'cost',
            improvement: `${(-change * 100).toFixed(1)}%`,
            baseline: base.cost.cost_per_op,
            current: current.cost.cost_per_op
          });
        }
      }
    }

    return {
      hasImprovements: improvements.length > 0,
      improvements
    };
  }

  /**
   * Generate regression report
   */
  generateReport(regressionResult, improvements) {
    const report = {
      timestamp: new Date().toISOString(),
      hasBaseline: regressionResult.hasBaseline,
      summary: {
        totalRegressions: regressionResult.regressions?.length || 0,
        criticalRegressions: regressionResult.criticalCount || 0,
        warningRegressions: regressionResult.warningCount || 0,
        totalImprovements: improvements?.improvements?.length || 0
      },
      regressions: regressionResult.regressions || [],
      improvements: improvements?.improvements || [],
      baselineDate: regressionResult.baselineDate || null
    };

    return report;
  }
}

module.exports = RegressionDetector;
