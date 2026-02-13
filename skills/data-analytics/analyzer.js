/**
 * Data Analytics & Business Intelligence System
 * Comprehensive data analysis, visualization, and metrics generation
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// DATA OPERATIONS
// ============================================================================

/**
 * Parse JSON file with validation and error handling
 */
function parseJSON(filepath, options = {}) {
  try {
    const content = fs.readFileSync(filepath, options.encoding || 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return { error: `Failed to parse JSON: ${err.message}` };
  }
}

/**
 * Parse CSV with basic handling
 */
function parseCSV(filepath, options = {}) {
  try {
    const content = fs.readFileSync(filepath, options.encoding || 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const delimiter = options.delimiter || ',';
    
    if (lines.length === 0) return { error: 'Empty CSV file' };
    
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim());
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || null;
      });
      return row;
    });
    
    return { headers, rows };
  } catch (err) {
    return { error: `Failed to parse CSV: ${err.message}` };
  }
}

/**
 * Aggregate data by time period or dimension
 */
function aggregateData(data, groupBy = 'date', metrics = []) {
  const result = {};
  
  if (Array.isArray(data)) {
    data.forEach(item => {
      const key = item[groupBy] || 'unknown';
      if (!result[key]) result[key] = {};
      
      metrics.forEach(metric => {
        const value = parseFloat(item[metric]) || 0;
        result[key][metric] = (result[key][metric] || 0) + value;
      });
    });
  } else {
    // Handle object-based data (like costs.json)
    Object.entries(data).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const daily = value.daily || value;
        metrics.forEach(metric => {
          if (daily[metric] !== undefined) {
            if (!result[key]) result[key] = {};
            result[key][metric] = daily[metric];
          }
        });
      }
    });
  }
  
  return result;
}

/**
 * Calculate statistical measures for a dataset
 */
function calculateStatistics(values) {
  const data = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (data.length === 0) return {};
  
  data.sort((a, b) => a - b);
  
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / data.length;
  const median = data.length % 2 === 0 
    ? (data[data.length / 2 - 1] + data[data.length / 2]) / 2 
    : data[Math.floor(data.length / 2)];
  
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  // Percentiles
  const percentile = (p) => {
    const index = (p / 100) * data.length;
    return data[Math.floor(index)];
  };
  
  return {
    count: data.length,
    sum,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    min: data[0],
    max: data[data.length - 1],
    stdDev: Math.round(stdDev * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    p25: percentile(25),
    p50: percentile(50),
    p75: percentile(75),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99)
  };
}

/**
 * Detect trends using moving averages
 */
function detectTrends(values, window = 7) {
  const data = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (data.length < window) return { error: 'Insufficient data for trend detection' };
  
  // Simple Moving Average
  const sma = [];
  for (let i = window - 1; i < data.length; i++) {
    const window_data = data.slice(i - window + 1, i + 1);
    const avg = window_data.reduce((a, b) => a + b) / window;
    sma.push(Math.round(avg * 100) / 100);
  }
  
  // Trend direction
  const recent = sma.slice(-3);
  let direction = 'stable';
  if (recent[2] > recent[0] * 1.02) direction = 'upward';
  else if (recent[2] < recent[0] * 0.98) direction = 'downward';
  
  // Growth rate (percentage change)
  const growthRate = ((sma[sma.length - 1] - sma[0]) / sma[0]) * 100;
  
  return {
    sma,
    direction,
    growthRate: Math.round(growthRate * 100) / 100,
    current: data[data.length - 1],
    average: sma[sma.length - 1]
  };
}

/**
 * Detect anomalies in dataset
 */
function detectAnomalies(values, method = 'zscore', threshold = 2.0) {
  const data = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (data.length < 3) return { error: 'Insufficient data for anomaly detection', anomalies: [] };
  
  const anomalies = [];
  
  if (method === 'zscore') {
    const stats = calculateStatistics(data);
    data.forEach((value, index) => {
      const zscore = Math.abs((value - stats.mean) / stats.stdDev);
      if (zscore > threshold) {
        anomalies.push({ index, value, zscore: Math.round(zscore * 100) / 100 });
      }
    });
  } else if (method === 'iqr') {
    const stats = calculateStatistics(data);
    const iqr = stats.p75 - stats.p25;
    const lower = stats.p25 - (1.5 * iqr);
    const upper = stats.p75 + (1.5 * iqr);
    
    data.forEach((value, index) => {
      if (value < lower || value > upper) {
        anomalies.push({ index, value, deviation: Math.round((value - stats.mean) * 100) / 100 });
      }
    });
  }
  
  return {
    method,
    threshold,
    anomalyCount: anomalies.length,
    anomalyPercentage: Math.round((anomalies.length / data.length) * 100 * 100) / 100,
    anomalies
  };
}

// ============================================================================
// VISUALIZATION
// ============================================================================

/**
 * Generate ASCII line chart
 */
function plotLineChart(values, options = {}) {
  const {
    width = 80,
    height = 15,
    title = 'Chart'
  } = options;
  
  const data = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (data.length === 0) return 'No data to chart';
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const blocks = '▁▂▃▄▅▆▇█';
  
  let output = `\n${title}\n`;
  output += `${'─'.repeat(width)}\n`;
  
  // Scale data points to fit width
  const step = Math.ceil(data.length / width);
  let chart = '';
  
  for (let i = 0; i < width && i * step < data.length; i++) {
    const value = data[i * step];
    const normalized = (value - min) / range;
    const blockIndex = Math.min(7, Math.floor(normalized * 8));
    chart += blocks[blockIndex];
  }
  
  output += chart + '\n';
  output += `${'─'.repeat(width)}\n`;
  output += `Min: ${min.toFixed(2)} | Max: ${max.toFixed(2)} | Avg: ${(data.reduce((a, b) => a + b) / data.length).toFixed(2)}\n`;
  
  return output;
}

/**
 * Format data as ASCII table
 */
function formatTable(data, columns, options = {}) {
  const {
    borders = true,
    maxRows = 50
  } = options;
  
  if (!data || Object.keys(data).length === 0) return 'No data';
  
  // Convert object to array format if needed
  let rows = [];
  if (Array.isArray(data)) {
    rows = data;
  } else {
    rows = Object.entries(data).map(([key, value]) => {
      return { ...value, _key: key };
    });
  }
  
  // Select columns
  const cols = columns || Object.keys(rows[0] || {});
  const displayRows = rows.slice(0, maxRows);
  
  // Calculate column widths
  const widths = {};
  cols.forEach(col => {
    widths[col] = Math.max(
      col.length,
      Math.max(...displayRows.map(row => String(row[col] || '').length))
    );
  });
  
  // Build table
  let table = '';
  if (borders) {
    table += '┌' + cols.map(col => '─'.repeat(widths[col] + 2)).join('┬') + '┐\n';
  }
  
  // Header
  table += '│ ' + cols.map(col => col.padEnd(widths[col])).join(' │ ') + ' │\n';
  
  if (borders) {
    table += '├' + cols.map(col => '─'.repeat(widths[col] + 2)).join('┼') + '┤\n';
  }
  
  // Rows
  displayRows.forEach(row => {
    table += '│ ' + cols.map(col => {
      const val = String(row[col] || '');
      return col.includes('cost') || col.includes('tokens') 
        ? val.padStart(widths[col])
        : val.padEnd(widths[col]);
    }).join(' │ ') + ' │\n';
  });
  
  if (borders) {
    table += '└' + cols.map(col => '─'.repeat(widths[col] + 2)).join('┴') + '┘\n';
  }
  
  return table;
}

/**
 * Generate trend indicator with arrow
 */
function generateTrendIndicator(current, previous, metric = '') {
  const change = current - previous;
  const pctChange = ((change / previous) * 100);
  const arrow = change > 0 ? '↗' : change < 0 ? '↘' : '→';
  const sign = change > 0 ? '+' : '';
  
  return {
    value: current,
    change: Math.round(change * 100) / 100,
    percentChange: Math.round(pctChange * 100) / 100,
    indicator: `${arrow} ${sign}${pctChange.toFixed(1)}%`,
    metric
  };
}

// ============================================================================
// BUSINESS METRICS
// ============================================================================

/**
 * Analyze cost data
 */
function analyzeCosts(costData) {
  const summary = costData.summary || {};
  const daily = costData['2026-02-13']?.daily || {};
  const sessions = costData['2026-02-13']?.sessions || {};
  const perHour = costData['2026-02-13']?.perHour || {};
  
  // Calculate metrics
  const sessionMetrics = Object.entries(sessions).map(([id, session]) => ({
    id,
    cost: session.cost,
    tokens: session.tokens,
    apiCalls: session.apiCalls,
    costPerToken: Math.round((session.cost / session.tokens) * 1000000) / 1000000,
    costPerCall: Math.round((session.cost / session.apiCalls) * 100) / 100
  }));
  
  // Hourly analysis
  const hourlyMetrics = Object.entries(perHour).map(([hour, data]) => ({
    hour: hour.padStart(2, '0') + ':00',
    cost: data.cost,
    tokens: data.tokens,
    apiCalls: data.apiCalls
  }));
  
  // Budget status
  const monthlyBudget = summary.monthlyBudget || 200;
  const projected = summary.projectedMonthlyAtCurrentRate || 258;
  const budgetUsage = Math.round((summary.totalCost / monthlyBudget) * 100);
  
  return {
    daily,
    sessions: sessionMetrics,
    hourly: hourlyMetrics,
    summary: {
      totalCost: summary.totalCost,
      totalTokens: summary.totalTokens,
      totalApiCalls: summary.totalApiCalls,
      averageDailyCost: summary.averageDailyCost,
      projectedMonthly: projected,
      monthlyBudget,
      budgetUsagePercent: budgetUsage,
      status: budgetUsage > 100 ? 'CRITICAL' : budgetUsage > 75 ? 'WARNING' : 'OK'
    }
  };
}

/**
 * Analyze performance metrics
 */
function analyzePerformance(costData) {
  const sessions = costData['2026-02-13']?.sessions || {};
  
  const metrics = Object.entries(sessions).map(([id, session]) => {
    const duration = new Date(session.endTime) - new Date(session.startTime);
    const durationMs = duration;
    
    return {
      sessionId: id,
      model: session.model,
      tokenEfficiency: Math.round((session.tokens / session.apiCalls) * 100) / 100,
      costPerToken: Math.round((session.cost / session.tokens) * 1000000) / 1000000,
      costPerCall: Math.round((session.cost / session.apiCalls) * 100) / 100,
      durationMs,
      callsPerMinute: Math.round((session.apiCalls / (durationMs / 60000)) * 100) / 100
    };
  });
  
  return {
    sessions: metrics,
    averages: {
      tokenEfficiency: Math.round((metrics.reduce((s, m) => s + m.tokenEfficiency, 0) / metrics.length) * 100) / 100,
      costPerToken: Math.round((metrics.reduce((s, m) => s + m.costPerToken, 0) / metrics.length) * 1000000) / 1000000,
      costPerCall: Math.round((metrics.reduce((s, m) => s + m.costPerCall, 0) / metrics.length) * 100) / 100
    }
  };
}

/**
 * Analyze usage patterns
 */
function analyzeUsage(costData) {
  const daily = costData['2026-02-13']?.daily || {};
  const perHour = costData['2026-02-13']?.perHour || {};
  const sessions = costData['2026-02-13']?.sessions || {};
  
  const hourlyData = Object.entries(perHour).map(([hour, data]) => ({
    hour: parseInt(hour),
    calls: data.apiCalls
  }));
  
  const peakHour = hourlyData.reduce((max, h) => h.calls > max.calls ? h : max);
  const avgCallsPerHour = hourlyData.reduce((s, h) => s + h.calls, 0) / hourlyData.length;
  
  return {
    dailyApiCalls: daily.apiCalls || 0,
    totalSessions: Object.keys(sessions).length,
    hourlyBreakdown: hourlyData,
    peakHour: `${peakHour.hour.toString().padStart(2, '0')}:00`,
    peakCalls: peakHour.calls,
    averageCallsPerHour: Math.round(avgCallsPerHour * 100) / 100,
    usage: {
      low: hourlyData.filter(h => h.calls < avgCallsPerHour * 0.5).length,
      normal: hourlyData.filter(h => h.calls >= avgCallsPerHour * 0.5 && h.calls <= avgCallsPerHour * 1.5).length,
      peak: hourlyData.filter(h => h.calls > avgCallsPerHour * 1.5).length
    }
  };
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Generate comprehensive report
 */
function generateReport(costData, reportType = 'summary') {
  let report = '';
  
  if (reportType === 'summary' || reportType === 'all') {
    const costs = analyzeCosts(costData);
    const perf = analyzePerformance(costData);
    const usage = analyzeUsage(costData);
    
    report += '\n╔═══════════════════════════════════════════════════════════════╗\n';
    report += '║         DATA ANALYTICS & BUSINESS INTELLIGENCE REPORT        ║\n';
    report += '╚═══════════════════════════════════════════════════════════════╝\n';
    
    // Cost Summary
    report += '\n📊 COST ANALYSIS\n';
    report += '─'.repeat(60) + '\n';
    report += `Total Cost (3-day period): $${costs.summary.totalCost.toFixed(2)}\n`;
    report += `Average Daily Cost: $${costs.summary.averageDailyCost.toFixed(2)}\n`;
    report += `Projected Monthly: $${costs.summary.projectedMonthly.toFixed(2)}\n`;
    report += `Budget: $${costs.summary.monthlyBudget.toFixed(2)}\n`;
    report += `Budget Usage: ${costs.summary.budgetUsagePercent}%\n`;
    report += `Status: ${costs.summary.status}\n`;
    
    if (costs.summary.budgetUsagePercent > 100) {
      report += `⚠️  WARNING: Over budget by $${(costs.summary.totalCost - costs.summary.monthlyBudget).toFixed(2)}\n`;
    }
    
    // Session breakdown
    report += '\n💾 SESSION BREAKDOWN (Today)\n';
    report += '─'.repeat(60) + '\n';
    report += formatTable(costs.sessions, ['id', 'cost', 'tokens', 'apiCalls', 'costPerToken']);
    
    // Hourly breakdown
    report += '\n⏰ HOURLY BREAKDOWN\n';
    report += '─'.repeat(60) + '\n';
    report += formatTable(costs.hourly, ['hour', 'cost', 'tokens', 'apiCalls']);
    
    // Performance
    report += '\n⚡ PERFORMANCE METRICS\n';
    report += '─'.repeat(60) + '\n';
    report += `Average Token Efficiency: ${perf.averages.tokenEfficiency} tokens/call\n`;
    report += `Average Cost per Token: $${perf.averages.costPerToken.toFixed(6)}\n`;
    report += `Average Cost per Call: $${perf.averages.costPerCall.toFixed(2)}\n`;
    
    // Usage
    report += '\n📈 USAGE ANALYTICS\n';
    report += '─'.repeat(60) + '\n';
    report += `Daily API Calls: ${usage.dailyApiCalls}\n`;
    report += `Peak Hour: ${usage.peakHour} (${usage.peakCalls} calls)\n`;
    report += `Average Calls/Hour: ${usage.averageCallsPerHour}\n`;
    report += `Low Usage Hours: ${usage.usage.low}\n`;
    report += `Normal Usage Hours: ${usage.usage.normal}\n`;
    report += `Peak Usage Hours: ${usage.usage.peak}\n`;
  }
  
  return report;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Data operations
  parseJSON,
  parseCSV,
  aggregateData,
  calculateStatistics,
  detectTrends,
  detectAnomalies,
  
  // Visualization
  plotLineChart,
  formatTable,
  generateTrendIndicator,
  
  // Business metrics
  analyzeCosts,
  analyzePerformance,
  analyzeUsage,
  
  // Reporting
  generateReport
};
