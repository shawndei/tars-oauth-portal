/**
 * Report Generation Library
 * Generates HTML and JSON reports with charts
 */

const fs = require('fs');
const path = require('path');

class Reporter {
  constructor(outputDir) {
    this.outputDir = outputDir;
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Generate full report (HTML + JSON)
   */
  generateReport(results, comparison, metadata = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const htmlPath = path.join(this.outputDir, `${timestamp}.html`);
    const jsonPath = path.join(this.outputDir, `${timestamp}.json`);
    
    // Generate JSON report
    const jsonReport = this.generateJSONReport(results, comparison, metadata);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(results, comparison, metadata);
    fs.writeFileSync(htmlPath, htmlReport);
    
    // Create/update latest symlinks
    const latestHtml = path.join(this.outputDir, 'latest.html');
    const latestJson = path.join(this.outputDir, 'latest.json');
    
    if (fs.existsSync(latestHtml)) fs.unlinkSync(latestHtml);
    if (fs.existsSync(latestJson)) fs.unlinkSync(latestJson);
    
    // Copy files to latest (Windows doesn't support symlinks easily)
    fs.copyFileSync(htmlPath, latestHtml);
    fs.copyFileSync(jsonPath, latestJson);
    
    return {
      html: htmlPath,
      json: jsonPath,
      timestamp
    };
  }

  /**
   * Generate JSON report
   */
  generateJSONReport(results, comparison, metadata) {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      metadata: {
        system: 'OpenClaw',
        runtime: metadata.runtime || 'unknown',
        mode: metadata.mode || 'full',
        ...metadata
      },
      summary: this.generateSummary(results, comparison),
      results,
      comparison,
      regressions: comparison.regressions || [],
      improvements: comparison.improvements || []
    };
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(results, comparison, metadata) {
    const summary = this.generateSummary(results, comparison);
    const chartData = this.prepareChartData(results);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenClaw Performance Benchmark Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f7fa;
      color: #2c3e50;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .header .subtitle {
      font-size: 16px;
      opacity: 0.9;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
      transition: transform 0.2s;
    }
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.12);
    }
    .metric-label {
      font-size: 14px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .metric-value {
      font-size: 36px;
      font-weight: bold;
      color: #2c3e50;
    }
    .metric-value.success { color: #27ae60; }
    .metric-value.warning { color: #f39c12; }
    .metric-value.danger { color: #e74c3c; }
    .metric-subtitle {
      font-size: 14px;
      color: #95a5a6;
      margin-top: 5px;
    }
    .alert {
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid;
    }
    .alert.critical {
      background: #fadbd8;
      border-color: #e74c3c;
      color: #c0392b;
    }
    .alert.warning {
      background: #fcf3cf;
      border-color: #f39c12;
      color: #d68910;
    }
    .alert.success {
      background: #d4edda;
      border-color: #27ae60;
      color: #1e8449;
    }
    .alert-title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .alert-list {
      list-style: none;
      margin: 10px 0;
    }
    .alert-list li {
      padding: 5px 0;
      padding-left: 20px;
      position: relative;
    }
    .alert-list li:before {
      content: "•";
      position: absolute;
      left: 5px;
    }
    .section {
      background: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .section-title {
      font-size: 24px;
      margin-bottom: 20px;
      color: #2c3e50;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 10px;
    }
    .chart-container {
      position: relative;
      height: 400px;
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ecf0f1;
    }
    th {
      background: #34495e;
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge.pass { background: #d4edda; color: #155724; }
    .badge.fail { background: #fadbd8; color: #721c24; }
    .badge.warn { background: #fcf3cf; color: #856404; }
    .footer {
      text-align: center;
      color: #95a5a6;
      padding: 30px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 OpenClaw Performance Benchmark Report</h1>
      <div class="subtitle">
        Generated ${new Date().toLocaleString()} | 
        ${Object.keys(results).length} tests completed |
        ${metadata.mode || 'Full'} mode
      </div>
    </div>

    ${this.renderAlerts(comparison)}
    
    <div class="summary-grid">
      <div class="metric-card">
        <div class="metric-label">Total Tests</div>
        <div class="metric-value">${summary.total_tests}</div>
        <div class="metric-subtitle">Across ${summary.suite_count} suites</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Success Rate</div>
        <div class="metric-value success">${(summary.success_rate * 100).toFixed(1)}%</div>
        <div class="metric-subtitle">${summary.passed} passed, ${summary.failed} failed</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Latency (p50)</div>
        <div class="metric-value">${summary.avg_latency_p50.toFixed(0)}ms</div>
        <div class="metric-subtitle">p95: ${summary.avg_latency_p95.toFixed(0)}ms</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Regressions</div>
        <div class="metric-value ${comparison.criticalCount > 0 ? 'danger' : comparison.warningCount > 0 ? 'warning' : 'success'}">
          ${comparison.regressions ? comparison.regressions.length : 0}
        </div>
        <div class="metric-subtitle">
          ${comparison.criticalCount || 0} critical, ${comparison.warningCount || 0} warnings
        </div>
      </div>
    </div>

    ${this.renderCharts(chartData)}
    ${this.renderResultsTable(results)}
    ${this.renderRegressionDetails(comparison)}

    <div class="footer">
      OpenClaw Performance Benchmarking Framework v1.0<br>
      Report generated on ${new Date().toISOString()}
    </div>
  </div>

  <script>
    ${this.generateChartScripts(chartData)}
  </script>
</body>
</html>`;
  }

  /**
   * Render alerts section
   */
  renderAlerts(comparison) {
    const alerts = [];
    
    if (comparison.criticalCount > 0) {
      alerts.push(`
        <div class="alert critical">
          <div class="alert-title">⚠️ Critical Regressions Detected</div>
          <p>${comparison.criticalCount} test(s) show critical performance degradation.</p>
          <ul class="alert-list">
            ${comparison.regressions
              .filter(r => r.severity === 'CRITICAL')
              .map(r => `<li><strong>${r.test}</strong>: ${r.message}</li>`)
              .join('')}
          </ul>
        </div>
      `);
    }
    
    if (comparison.warningCount > 0) {
      alerts.push(`
        <div class="alert warning">
          <div class="alert-title">⚠ Performance Warnings</div>
          <p>${comparison.warningCount} test(s) show minor performance degradation.</p>
        </div>
      `);
    }
    
    if (comparison.hasImprovements) {
      alerts.push(`
        <div class="alert success">
          <div class="alert-title">✨ Performance Improvements</div>
          <p>${comparison.improvements.length} test(s) show performance improvements.</p>
          <ul class="alert-list">
            ${comparison.improvements
              .slice(0, 5)
              .map(i => `<li><strong>${i.test}</strong>: ${i.message}</li>`)
              .join('')}
          </ul>
        </div>
      `);
    }
    
    if (!comparison.hasBaseline) {
      alerts.push(`
        <div class="alert warning">
          <div class="alert-title">ℹ️ No Baseline Available</div>
          <p>This is the first run. Results will be saved as the baseline for future comparisons.</p>
        </div>
      `);
    }
    
    return alerts.join('');
  }

  /**
   * Render charts
   */
  renderCharts(chartData) {
    return `
      <div class="section">
        <h2 class="section-title">Performance Charts</h2>
        
        <div class="chart-container">
          <canvas id="latencyChart"></canvas>
        </div>
        
        <div class="chart-container">
          <canvas id="throughputChart"></canvas>
        </div>
      </div>
    `;
  }

  /**
   * Render results table
   */
  renderResultsTable(results) {
    const rows = Object.entries(results).map(([name, result]) => {
      const status = result.accuracy.success_rate >= 0.98 ? 'pass' : 'fail';
      const statusBadge = status === 'pass' ? 
        '<span class="badge pass">✓ Pass</span>' : 
        '<span class="badge fail">✗ Fail</span>';
      
      return `
        <tr>
          <td><strong>${name}</strong></td>
          <td>${result.latency.p50}ms</td>
          <td>${result.latency.p95}ms</td>
          <td>${result.throughput.ops_per_sec}</td>
          <td>${(result.accuracy.success_rate * 100).toFixed(1)}%</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
    
    return `
      <div class="section">
        <h2 class="section-title">Detailed Results</h2>
        <table>
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Latency (p50)</th>
              <th>Latency (p95)</th>
              <th>Throughput</th>
              <th>Success Rate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render regression details
   */
  renderRegressionDetails(comparison) {
    if (!comparison.regressions || comparison.regressions.length === 0) {
      return '';
    }
    
    const rows = comparison.regressions.map(r => `
      <tr>
        <td><strong>${r.test}</strong></td>
        <td><span class="badge ${r.severity === 'CRITICAL' ? 'fail' : 'warn'}">${r.severity}</span></td>
        <td>${r.metric}</td>
        <td>${r.message}</td>
        <td>${r.change_percent}%</td>
      </tr>
    `).join('');
    
    return `
      <div class="section">
        <h2 class="section-title">Regression Details</h2>
        <table>
          <thead>
            <tr>
              <th>Test</th>
              <th>Severity</th>
              <th>Metric</th>
              <th>Description</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Prepare chart data
   */
  prepareChartData(results) {
    const tests = Object.keys(results);
    
    return {
      labels: tests,
      latency: {
        p50: tests.map(t => results[t].latency.p50),
        p95: tests.map(t => results[t].latency.p95)
      },
      throughput: tests.map(t => results[t].throughput.ops_per_sec)
    };
  }

  /**
   * Generate chart scripts
   */
  generateChartScripts(data) {
    return `
      // Latency Chart
      const latencyCtx = document.getElementById('latencyChart').getContext('2d');
      new Chart(latencyCtx, {
        type: 'bar',
        data: {
          labels: ${JSON.stringify(data.labels)},
          datasets: [
            {
              label: 'p50 (median)',
              data: ${JSON.stringify(data.latency.p50)},
              backgroundColor: 'rgba(102, 126, 234, 0.6)',
              borderColor: 'rgba(102, 126, 234, 1)',
              borderWidth: 1
            },
            {
              label: 'p95',
              data: ${JSON.stringify(data.latency.p95)},
              backgroundColor: 'rgba(237, 100, 166, 0.6)',
              borderColor: 'rgba(237, 100, 166, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Latency Comparison (ms)', font: { size: 18 } },
            legend: { position: 'top' }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Milliseconds' } }
          }
        }
      });

      // Throughput Chart
      const throughputCtx = document.getElementById('throughputChart').getContext('2d');
      new Chart(throughputCtx, {
        type: 'bar',
        data: {
          labels: ${JSON.stringify(data.labels)},
          datasets: [{
            label: 'Operations per Second',
            data: ${JSON.stringify(data.throughput)},
            backgroundColor: 'rgba(46, 213, 115, 0.6)',
            borderColor: 'rgba(46, 213, 115, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Throughput Comparison', font: { size: 18 } },
            legend: { position: 'top' }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Ops/Second' } }
          }
        }
      });
    `;
  }

  /**
   * Generate summary statistics
   */
  generateSummary(results, comparison) {
    const tests = Object.values(results);
    const total = tests.length;
    const passed = tests.filter(t => t.accuracy.success_rate >= 0.98).length;
    const failed = total - passed;
    
    const avgLatencyP50 = tests.reduce((sum, t) => sum + t.latency.p50, 0) / total;
    const avgLatencyP95 = tests.reduce((sum, t) => sum + t.latency.p95, 0) / total;
    const avgSuccessRate = tests.reduce((sum, t) => sum + t.accuracy.success_rate, 0) / total;
    
    // Count unique suites
    const suites = new Set(Object.keys(results).map(name => name.split('_')[0]));
    
    return {
      total_tests: total,
      passed,
      failed,
      success_rate: avgSuccessRate,
      avg_latency_p50: avgLatencyP50,
      avg_latency_p95: avgLatencyP95,
      suite_count: suites.size,
      has_regressions: comparison.hasRegressions,
      regression_count: comparison.regressions ? comparison.regressions.length : 0,
      improvement_count: comparison.improvements ? comparison.improvements.length : 0
    };
  }
}

module.exports = Reporter;
