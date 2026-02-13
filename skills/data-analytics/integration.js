/**
 * Data Analytics Integration Module
 * High-level API for using the analytics system
 */

const analyzer = require('./analyzer');
const fs = require('fs');
const path = require('path');

/**
 * Main Analytics Engine
 */
class AnalyticsEngine {
  constructor(configPath = './analytics-config.json') {
    this.config = this.loadConfig(configPath);
    this.cache = new Map();
  }
  
  loadConfig(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.warn(`Config not found at ${configPath}, using defaults`);
      return { analytics: { enabled: true } };
    }
  }
  
  /**
   * Load and analyze cost data
   */
  analyzeCosts(costPath = './costs.json') {
    const cacheKey = `costs:${costPath}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const data = analyzer.parseJSON(costPath);
    if (data.error) return { error: data.error };
    
    const analysis = {
      raw: data,
      summary: analyzer.analyzeCosts(data),
      trends: this.analyzeCostTrends(data),
      anomalies: this.detectCostAnomalies(data),
      alerts: this.generateCostAlerts(data)
    };
    
    this.cache.set(cacheKey, analysis);
    return analysis;
  }
  
  /**
   * Detect cost trends
   */
  analyzeCostTrends(costData) {
    const dailyData = Object.entries(costData)
      .filter(([key]) => !['summary'].includes(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        cost: data.daily?.cost || 0,
        tokens: data.daily?.tokens || 0,
        calls: data.daily?.apiCalls || 0
      }));
    
    const values = dailyData.map(d => d.cost);
    const trend = analyzer.detectTrends(values, 2);
    
    return {
      dailyBreakdown: dailyData,
      costTrend: trend,
      tokenTrend: analyzer.detectTrends(dailyData.map(d => d.tokens), 2),
      callTrend: analyzer.detectTrends(dailyData.map(d => d.calls), 2)
    };
  }
  
  /**
   * Detect cost anomalies
   */
  detectCostAnomalies(costData) {
    const dailyCosts = Object.entries(costData)
      .filter(([key]) => !['summary'].includes(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => data.daily?.cost || 0);
    
    const hourlyData = costData['2026-02-13']?.perHour || {};
    const hourlyCosts = Object.values(hourlyData).map(h => h.cost);
    
    return {
      daily: analyzer.detectAnomalies(dailyCosts, 'zscore', 2.0),
      hourly: analyzer.detectAnomalies(hourlyCosts, 'zscore', 2.0)
    };
  }
  
  /**
   * Generate cost alerts
   */
  generateCostAlerts(costData) {
    const summary = costData.summary || {};
    const alerts = [];
    
    const budgetUsage = (summary.totalCost / summary.monthlyBudget) * 100;
    
    if (budgetUsage > 100) {
      alerts.push({
        severity: 'CRITICAL',
        message: `Budget exceeded: $${(summary.totalCost - summary.monthlyBudget).toFixed(2)} over`,
        threshold: 100,
        current: budgetUsage
      });
    } else if (budgetUsage > 75) {
      alerts.push({
        severity: 'WARNING',
        message: `High budget usage: ${budgetUsage.toFixed(0)}%`,
        threshold: 75,
        current: budgetUsage
      });
    }
    
    if (summary.projectedMonthlyAtCurrentRate > summary.monthlyBudget) {
      alerts.push({
        severity: 'WARNING',
        message: `Projected month will exceed budget: $${summary.projectedMonthlyAtCurrentRate.toFixed(2)}`,
        threshold: summary.monthlyBudget,
        projected: summary.projectedMonthlyAtCurrentRate
      });
    }
    
    return alerts;
  }
  
  /**
   * Generate comprehensive report
   */
  generateReport(reportType = 'summary', costPath = './costs.json') {
    const costData = analyzer.parseJSON(costPath);
    return analyzer.generateReport(costData, reportType);
  }
  
  /**
   * Export analysis as JSON
   */
  exportJSON(analysis, outputPath) {
    try {
      fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
      return { success: true, path: outputPath };
    } catch (err) {
      return { error: err.message };
    }
  }
  
  /**
   * Export analysis as markdown
   */
  exportMarkdown(analysis, outputPath) {
    let markdown = '# Data Analytics Report\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Summary
    markdown += '## Cost Summary\n\n';
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Cost | $${analysis.summary.summary.totalCost.toFixed(2)} |\n`;
    markdown += `| Daily Average | $${analysis.summary.summary.averageDailyCost.toFixed(2)} |\n`;
    markdown += `| Budget Usage | ${analysis.summary.summary.budgetUsagePercent}% |\n`;
    markdown += `| Status | ${analysis.summary.summary.status} |\n\n`;
    
    // Alerts
    if (analysis.alerts.length > 0) {
      markdown += '## Alerts\n\n';
      analysis.alerts.forEach(alert => {
        markdown += `- **${alert.severity}**: ${alert.message}\n`;
      });
      markdown += '\n';
    }
    
    // Trends
    markdown += '## Trends\n\n';
    markdown += `- Cost Trend: ${analysis.trends.costTrend.direction} (${analysis.trends.costTrend.growthRate}% change)\n`;
    markdown += `- Token Efficiency Trend: ${analysis.trends.tokenTrend.direction}\n\n`;
    
    try {
      fs.writeFileSync(outputPath, markdown);
      return { success: true, path: outputPath };
    } catch (err) {
      return { error: err.message };
    }
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

/**
 * Quick analysis functions
 */
const QuickAnalyze = {
  /**
   * Quick cost summary
   */
  costSummary(costPath = './costs.json') {
    const engine = new AnalyticsEngine();
    const analysis = engine.analyzeCosts(costPath);
    return analysis.summary?.summary;
  },
  
  /**
   * Quick cost trend
   */
  costTrend(costPath = './costs.json') {
    const engine = new AnalyticsEngine();
    const analysis = engine.analyzeCosts(costPath);
    return analysis.trends?.costTrend;
  },
  
  /**
   * Quick anomaly check
   */
  checkAnomalies(costPath = './costs.json') {
    const engine = new AnalyticsEngine();
    const analysis = engine.analyzeCosts(costPath);
    return analysis.anomalies;
  },
  
  /**
   * Quick alerts check
   */
  checkAlerts(costPath = './costs.json') {
    const engine = new AnalyticsEngine();
    const analysis = engine.analyzeCosts(costPath);
    return analysis.alerts;
  }
};

/**
 * Visualization helpers
 */
const Visualizations = {
  /**
   * Display cost trend chart
   */
  showCostChart(costPath = './costs.json') {
    const data = analyzer.parseJSON(costPath);
    const dailyCosts = Object.entries(data)
      .filter(([key]) => !['summary'].includes(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, d]) => d.daily?.cost || 0);
    
    return analyzer.plotLineChart(dailyCosts, {
      width: 80,
      title: 'Daily Cost Trend'
    });
  },
  
  /**
   * Display hourly breakdown
   */
  showHourlyChart(costPath = './costs.json') {
    const data = analyzer.parseJSON(costPath);
    const hourlyData = data['2026-02-13']?.perHour || {};
    
    const rows = Object.entries(hourlyData).map(([hour, h]) => ({
      hour: hour.padStart(2, '0') + ':00',
      cost: h.cost,
      tokens: h.tokens,
      calls: h.apiCalls
    }));
    
    return analyzer.formatTable(rows, ['hour', 'cost', 'tokens', 'calls']);
  },
  
  /**
   * Display session summary
   */
  showSessionSummary(costPath = './costs.json') {
    const data = analyzer.parseJSON(costPath);
    const sessions = data['2026-02-13']?.sessions || {};
    
    const rows = Object.entries(sessions).map(([id, s]) => ({
      session: id.substring(0, 20),
      model: s.model,
      cost: s.cost,
      tokens: s.tokens,
      calls: s.apiCalls
    }));
    
    return analyzer.formatTable(rows, ['session', 'model', 'cost', 'tokens', 'calls']);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  AnalyticsEngine,
  QuickAnalyze,
  Visualizations,
  analyzer
};
