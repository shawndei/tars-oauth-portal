/**
 * Heartbeat Integration for Performance Benchmarking
 * 
 * This script can be called from HEARTBEAT.md to run periodic performance checks
 * 
 * Usage in HEARTBEAT.md:
 *   ### Performance Benchmarking (Weekly - Sunday 00:00)
 *   - Run quick benchmark suite
 *   - Check for regressions
 *   - Alert on critical issues
 *   - Update baseline if improvements detected
 * 
 *   ```bash
 *   node skills/performance-optimization/heartbeat-integration.js
 *   ```
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class HeartbeatBenchmark {
  constructor() {
    this.benchmarkDir = path.join(__dirname, 'tests/benchmarks');
    this.reportPath = path.join(this.benchmarkDir, 'reports/latest.json');
    this.stateFile = path.join(__dirname, 'heartbeat-state.json');
  }

  async run() {
    console.log('[HEARTBEAT] Running performance benchmarks...\n');

    try {
      // Check when last benchmark was run
      const state = this.loadState();
      const now = Date.now();
      const hoursSinceLastRun = (now - (state.lastRun || 0)) / (1000 * 60 * 60);

      // Only run if it's been at least 24 hours (unless forced)
      if (hoursSinceLastRun < 24 && !process.argv.includes('--force')) {
        console.log(`[HEARTBEAT] Last run was ${hoursSinceLastRun.toFixed(1)} hours ago. Skipping.`);
        console.log('[HEARTBEAT] Use --force to run anyway.');
        return;
      }

      // Run quick benchmark with comparison
      console.log('[HEARTBEAT] Executing benchmark suite...');
      
      try {
        execSync(
          'node tests/benchmarks/benchmark-runner.js --quick --compare',
          { 
            cwd: __dirname,
            stdio: 'inherit'
          }
        );
      } catch (error) {
        // Benchmark runner exits with code 1 on critical regressions
        console.log('[HEARTBEAT] ⚠️ Benchmark completed with warnings or regressions');
      }

      // Load and analyze results
      const report = this.loadReport();
      
      if (!report) {
        console.error('[HEARTBEAT] ❌ Failed to load benchmark report');
        return;
      }

      // Check for critical regressions
      if (report.regressions?.criticalCount > 0) {
        console.log(`\n[HEARTBEAT] 🔴 ALERT: ${report.regressions.criticalCount} critical regressions detected!`);
        
        report.regressions.regressions
          .filter(r => r.severity === 'CRITICAL')
          .forEach(r => {
            console.log(`  - ${r.test} (${r.metric}): ${r.change}`);
          });

        // TODO: Send notification via message tool
        this.sendAlert(report);
      } else if (report.regressions?.warningCount > 0) {
        console.log(`\n[HEARTBEAT] 🟡 WARNING: ${report.regressions.warningCount} performance warnings`);
      } else {
        console.log('\n[HEARTBEAT] ✅ No performance regressions detected');
      }

      // Check for improvements
      if (report.summary?.improvements > 0) {
        console.log(`[HEARTBEAT] 📈 ${report.summary.improvements} performance improvements detected`);
        
        // Auto-update baseline on improvements
        console.log('[HEARTBEAT] Updating baseline...');
        try {
          execSync(
            'node tests/benchmarks/benchmark-runner.js --update-baseline',
            { cwd: __dirname, stdio: 'inherit' }
          );
          console.log('[HEARTBEAT] ✓ Baseline updated');
        } catch (error) {
          console.error('[HEARTBEAT] Failed to update baseline:', error.message);
        }
      }

      // Update state
      this.saveState({
        lastRun: now,
        lastReport: report,
        lastStatus: report.regressions?.criticalCount > 0 ? 'critical' : 'ok'
      });

      console.log('\n[HEARTBEAT] Performance check complete');
      
    } catch (error) {
      console.error('[HEARTBEAT] Error running benchmarks:', error.message);
    }
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      }
    } catch (error) {
      console.warn('[HEARTBEAT] Failed to load state:', error.message);
    }
    return {};
  }

  saveState(state) {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('[HEARTBEAT] Failed to save state:', error.message);
    }
  }

  loadReport() {
    try {
      if (fs.existsSync(this.reportPath)) {
        return JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
      }
    } catch (error) {
      console.error('[HEARTBEAT] Failed to load report:', error.message);
    }
    return null;
  }

  sendAlert(report) {
    // TODO: Integrate with OpenClaw message system
    // This would use the message tool to send alerts to configured channels
    
    const alertMessage = `
🔴 PERFORMANCE ALERT

Critical performance regressions detected in benchmarks:

${report.regressions.regressions
  .filter(r => r.severity === 'CRITICAL')
  .map(r => `• ${r.test} (${r.metric}): ${r.change}`)
  .join('\n')}

Total Tests: ${report.summary.totalTests}
Critical Regressions: ${report.regressions.criticalCount}

View full report: tests/benchmarks/reports/latest.html
    `.trim();

    console.log('\n[HEARTBEAT] Alert message:\n', alertMessage);
    
    // Example integration (uncomment when ready):
    // const { message } = require('../../../tools/message');
    // message({ 
    //   action: 'send', 
    //   target: 'admin',
    //   message: alertMessage 
    // });
  }
}

// Run if called directly
if (require.main === module) {
  const benchmark = new HeartbeatBenchmark();
  benchmark.run().catch(error => {
    console.error('[HEARTBEAT] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = HeartbeatBenchmark;
