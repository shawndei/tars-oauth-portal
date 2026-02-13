/**
 * Report Generator
 * Creates HTML and JSON reports for benchmark results
 */

const fs = require('fs');
const path = require('path');

class Reporter {
  constructor(outputDir) {
    this.outputDir = outputDir || path.join(__dirname, '../reports');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate both HTML and JSON reports
   */
  generateReports(stats, regressionReport, metadata = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('-')[0];
    
    const jsonPath = path.join(this.outputDir, `${timestamp}.json`);
    const htmlPath = path.join(this.outputDir, `${timestamp}.html`);
    
    // Generate JSON report
    const jsonReport = this.generateJSONReport(stats, regressionReport, metadata);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(stats, regressionReport, metadata, jsonReport);
    fs.writeFileSync(htmlPath, htmlReport);
    
    // Create/update latest symlink (or copy for Windows)
    const latestJsonPath = path.join(this.outputDir, 'latest.json');
    const latestHtmlPath = path.join(this.outputDir, 'latest.html');
    
    try {
      if (fs.existsSync(latestJsonPath)) fs.unlinkSync(latestJsonPath);
      if (fs.existsSync(latestHtmlPath)) fs.unlinkSync(latestHtmlPath);
      fs.copyFileSync(jsonPath, latestJsonPath);
      fs.copyFileSync(htmlPath, latestHtmlPath);
    } catch (err) {
      // Ignore symlink errors on Windows
    }
    
    return {
      jsonPath,
      htmlPath,
      timestamp
    };
  }

  /**
   * Generate JSON report
   */
  generateJSONReport(stats, regressionReport, metadata) {
    return {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        ...metadata
      },
      summary: {
        totalTests: Object.keys(stats).length,
        totalOperations: Object.values(stats).reduce((sum, s) => sum + (s.count || 0), 0),
        hasRegressions: regressionReport.hasRegressions,
        criticalRegressions: regressionReport.criticalCount || 0,
        warningRegressions: regressionReport.warningCount || 0,
        improvements: regressionReport.summary?.totalImprovements || 0
      },
      statistics: stats,
      regressions: regressionReport,
      charts: this.prepareChartData(stats)
    };
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(stats, regressionReport, metadata, jsonData) {
    const hasRegressions = regressionReport.hasRegressions;
    const criticalCount = regressionReport.criticalCount || 0;
    const warningCount = regressionReport.warningCount || 0;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenClaw Performance Benchmark Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #333; }
    .container { max-width: 1400px; margin: 0 auto; padding: 30px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .metric-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s; }
    .metric-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
    .metric-value { font-size: 36px; font-weight: bold; margin-bottom: 8px; }
    .metric-value.success { color: #10b981; }
    .metric-value.warning { color: #f59e0b; }
    .metric-value.critical { color: #ef4444; }
    .metric-label { font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .section { background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section-title { font-size: 22px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
    .regression-alert { padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid; }
    .regression-alert.critical { background: #fef2f2; border-color: #ef4444; }
    .regression-alert.warning { background: #fffbeb; border-color: #f59e0b; }
    .regression-alert.acceptable { background: #f0f9ff; border-color: #3b82f6; }
    .regression-title { font-weight: 600; margin-bottom: 8px; }
    .regression-details { font-size: 14px; color: #6b7280; }
    .improvement { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .chart-container { margin: 25px 0; min-height: 400px; }
    .chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 25px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 14px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; font-size: 13px; text-transform: uppercase; color: #6b7280; }
    tr:hover { background: #f9fafb; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge.pass { background: #d1fae5; color: #065f46; }
    .badge.fail { background: #fee2e2; color: #991b1b; }
    .badge.warning { background: #fef3c7; color: #92400e; }
    canvas { max-height: 350px; }
    .no-regressions { text-align: center; padding: 40px; color: #10b981; font-size: 18px; }
    .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Performance Benchmark Report</h1>
      <p>Generated: ${new Date().toLocaleString()} | Version: ${metadata.version || '1.0'}</p>
    </div>

    <div class="summary">
      <div class="metric-card">
        <div class="metric-value ${hasRegressions ? 'warning' : 'success'}">${Object.keys(stats).length}</div>
        <div class="metric-label">Total Tests</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${criticalCount > 0 ? 'critical' : 'success'}">${criticalCount}</div>
        <div class="metric-label">Critical Regressions</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${warningCount > 0 ? 'warning' : 'success'}">${warningCount}</div>
        <div class="metric-label">Warning Regressions</div>
      </div>
      <div class="metric-card">
        <div class="metric-value success">${regressionReport.summary?.totalImprovements || 0}</div>
        <div class="metric-label">Improvements</div>
      </div>
    </div>

    ${this.renderRegressions(regressionReport)}
    ${this.renderImprovements(regressionReport)}
    ${this.renderCharts(stats)}
    ${this.renderDetailedTable(stats)}

    <div class="footer">
      <p>OpenClaw Performance Benchmarking Framework v1.0</p>
      <p>Baseline: ${regressionReport.baselineDate ? new Date(regressionReport.baselineDate).toLocaleString() : 'None'}</p>
    </div>
  </div>

  <script>
    const chartData = ${JSON.stringify(this.prepareChartData(stats))};
    
    // Latency comparison chart
    if (document.getElementById('latencyChart')) {
      new Chart(document.getElementById('latencyChart'), {
        type: 'bar',
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: 'p50 (ms)',
              data: chartData.latency.p50,
              backgroundColor: 'rgba(59, 130, 246, 0.8)'
            },
            {
              label: 'p95 (ms)',
              data: chartData.latency.p95,
              backgroundColor: 'rgba(239, 68, 68, 0.8)'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Latency Distribution', font: { size: 16 } },
            legend: { position: 'top' }
          }
        }
      });
    }

    // Throughput chart
    if (document.getElementById('throughputChart')) {
      new Chart(document.getElementById('throughputChart'), {
        type: 'bar',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: 'Operations/sec',
            data: chartData.throughput,
            backgroundColor: 'rgba(16, 185, 129, 0.8)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Throughput Comparison', font: { size: 16 } },
            legend: { display: false }
          }
        }
      });
    }

    // Cost chart
    if (document.getElementById('costChart')) {
      new Chart(document.getElementById('costChart'), {
        type: 'pie',
        data: {
          labels: chartData.labels,
          datasets: [{
            data: chartData.cost,
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Cost Distribution', font: { size: 16 } },
            legend: { position: 'right' }
          }
        }
      });
    }
  </script>
</body>
</html>`;
  }

  renderRegressions(regressionReport) {
    if (!regressionReport.hasRegressions || !regressionReport.regressions || regressionReport.regressions.length === 0) {
      return `
    <div class="section">
      <h2 class="section-title">🎉 Regressions</h2>
      <div class="no-regressions">✓ No performance regressions detected</div>
    </div>`;
    }

    const critical = regressionReport.regressions.filter(r => r.severity === 'CRITICAL');
    const warnings = regressionReport.regressions.filter(r => r.severity === 'WARNING');
    const acceptable = regressionReport.regressions.filter(r => r.severity === 'ACCEPTABLE');

    return `
    <div class="section">
      <h2 class="section-title">⚠️ Performance Regressions</h2>
      ${critical.map(r => `
        <div class="regression-alert critical">
          <div class="regression-title">🔴 CRITICAL: ${r.test} - ${r.metric}</div>
          <div class="regression-details">${r.message}</div>
        </div>
      `).join('')}
      ${warnings.map(r => `
        <div class="regression-alert warning">
          <div class="regression-title">🟡 WARNING: ${r.test} - ${r.metric}</div>
          <div class="regression-details">${r.message}</div>
        </div>
      `).join('')}
      ${acceptable.map(r => `
        <div class="regression-alert acceptable">
          <div class="regression-title">🔵 ACCEPTABLE: ${r.test} - ${r.metric}</div>
          <div class="regression-details">${r.message}</div>
        </div>
      `).join('')}
    </div>`;
  }

  renderImprovements(regressionReport) {
    if (!regressionReport.improvements || regressionReport.improvements.length === 0) {
      return '';
    }

    return `
    <div class="section">
      <h2 class="section-title">📈 Performance Improvements</h2>
      ${regressionReport.improvements.map(imp => `
        <div class="improvement">
          <strong>${imp.test} - ${imp.metric}:</strong> Improved by ${imp.improvement}
          (${imp.baseline.toFixed(2)} → ${imp.current.toFixed(2)})
        </div>
      `).join('')}
    </div>`;
  }

  renderCharts(stats) {
    return `
    <div class="section">
      <h2 class="section-title">📊 Performance Metrics</h2>
      <div class="chart-grid">
        <div class="chart-container">
          <canvas id="latencyChart"></canvas>
        </div>
        <div class="chart-container">
          <canvas id="throughputChart"></canvas>
        </div>
      </div>
      <div class="chart-container">
        <canvas id="costChart"></canvas>
      </div>
    </div>`;
  }

  renderDetailedTable(stats) {
    return `
    <div class="section">
      <h2 class="section-title">📋 Detailed Results</h2>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Operations</th>
            <th>p50 Latency</th>
            <th>p95 Latency</th>
            <th>Throughput</th>
            <th>Cost/Op</th>
            <th>Success Rate</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(stats).map(([name, stat]) => `
            <tr>
              <td><strong>${name}</strong></td>
              <td>${stat.count || 0}</td>
              <td>${stat.latency?.p50?.toFixed(2) || 'N/A'} ms</td>
              <td>${stat.latency?.p95?.toFixed(2) || 'N/A'} ms</td>
              <td>${stat.throughput?.ops_per_sec?.toFixed(2) || 'N/A'} ops/s</td>
              <td>$${stat.cost?.cost_per_op?.toFixed(4) || '0.0000'}</td>
              <td>${((stat.accuracy?.success_rate || 0) * 100).toFixed(1)}%</td>
              <td><span class="badge ${(stat.accuracy?.success_rate || 0) >= 0.95 ? 'pass' : 'warning'}">${(stat.accuracy?.success_rate || 0) >= 0.95 ? 'PASS' : 'WARN'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
  }

  prepareChartData(stats) {
    const labels = Object.keys(stats);
    
    return {
      labels,
      latency: {
        p50: labels.map(name => stats[name].latency?.p50 || 0),
        p95: labels.map(name => stats[name].latency?.p95 || 0)
      },
      throughput: labels.map(name => stats[name].throughput?.ops_per_sec || 0),
      cost: labels.map(name => stats[name].cost?.total || 0)
    };
  }
}

module.exports = Reporter;
