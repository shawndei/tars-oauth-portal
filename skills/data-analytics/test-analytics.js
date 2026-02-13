#!/usr/bin/env node

/**
 * Data Analytics System - Comprehensive Tests
 * Validates all functionality with real cost data
 */

const analyzer = require('./analyzer');
const fs = require('fs');
const path = require('path');

// ============================================================================
// TEST RUNNER
// ============================================================================

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }
  
  test(name, fn) {
    this.tests.push({ name, fn });
  }
  
  async run() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     DATA ANALYTICS & BUSINESS INTELLIGENCE TEST SUITE        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✓ ${name}`);
      } catch (err) {
        this.failed++;
        console.log(`✗ ${name}`);
        console.log(`  Error: ${err.message}`);
      }
    }
    
    this.summary();
  }
  
  summary() {
    const total = this.passed + this.failed;
    console.log('\n' + '═'.repeat(63));
    console.log(`Tests: ${total} | Passed: ${this.passed} | Failed: ${this.failed}`);
    console.log('═'.repeat(63) + '\n');
    
    if (this.failed === 0) {
      console.log('🎉 All tests passed!\n');
    }
  }
}

const runner = new TestRunner();

// ============================================================================
// TESTS
// ============================================================================

// Test 1: Parse JSON
runner.test('Parse JSON - costs.json', () => {
  const costs = analyzer.parseJSON('./costs.json');
  if (!costs.summary || !costs['2026-02-13']) {
    throw new Error('Invalid cost data structure');
  }
  console.log(`  Loaded ${Object.keys(costs).length} dates from costs.json`);
});

// Test 2: Aggregate data
runner.test('Aggregate Data - Daily costs', () => {
  const costs = analyzer.parseJSON('./costs.json');
  const dailyData = Object.entries(costs)
    .filter(([key]) => !['summary'].includes(key))
    .map(([date, data]) => ({
      date,
      cost: data.daily?.cost || 0
    }));
  
  const stats = analyzer.calculateStatistics(dailyData.map(d => d.cost));
  if (!stats.mean) {
    throw new Error('Failed to aggregate daily costs');
  }
  console.log(`  Daily costs: min=$${stats.min}, max=$${stats.max}, avg=$${stats.mean}`);
});

// Test 3: Calculate statistics
runner.test('Calculate Statistics', () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const stats = analyzer.calculateStatistics(values);
  
  if (stats.mean !== 5.5 || stats.median !== 5.5) {
    throw new Error('Incorrect statistics calculation');
  }
  console.log(`  Mean: ${stats.mean}, Median: ${stats.median}, StdDev: ${stats.stdDev}`);
});

// Test 4: Detect trends
runner.test('Detect Trends', () => {
  const costs = analyzer.parseJSON('./costs.json');
  const dailyCosts = Object.entries(costs)
    .filter(([key]) => !['summary'].includes(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, data]) => data.daily?.cost || 0);
  
  const trend = analyzer.detectTrends(dailyCosts, 2);
  if (!trend.sma || !trend.direction) {
    throw new Error('Failed to detect trends');
  }
  console.log(`  Trend: ${trend.direction}, Growth: ${trend.growthRate}%`);
});

// Test 5: Detect anomalies
runner.test('Detect Anomalies - Z-Score', () => {
  const values = [5, 5.2, 4.8, 5.1, 5, 15, 5.1, 4.9]; // 15 is anomaly
  const anomalies = analyzer.detectAnomalies(values, 'zscore', 2.0);
  
  if (anomalies.anomalyCount === 0) {
    throw new Error('Failed to detect obvious anomaly');
  }
  console.log(`  Found ${anomalies.anomalyCount} anomaly (${anomalies.anomalyPercentage}%)`);
});

// Test 6: Detect anomalies - IQR method
runner.test('Detect Anomalies - IQR', () => {
  const values = [1, 2, 2, 3, 3, 3, 4, 4, 5, 100]; // 100 is anomaly
  const anomalies = analyzer.detectAnomalies(values, 'iqr', 1.5);
  
  if (anomalies.anomalyCount === 0) {
    throw new Error('Failed to detect anomaly with IQR');
  }
  console.log(`  Found ${anomalies.anomalyCount} anomaly via IQR`);
});

// Test 7: Line chart visualization
runner.test('Visualize - Line Chart', () => {
  const costs = analyzer.parseJSON('./costs.json');
  const hourlyData = costs['2026-02-13']?.perHour || {};
  const values = Object.values(hourlyData).map(h => h.cost);
  
  const chart = analyzer.plotLineChart(values, {
    width: 40,
    height: 10,
    title: 'Hourly Cost Trend'
  });
  
  if (!chart.includes('▁') && !chart.includes('█')) {
    throw new Error('Chart visualization failed');
  }
  console.log('\n' + chart);
});

// Test 8: Format table visualization
runner.test('Visualize - Format Table', () => {
  const costs = analyzer.parseJSON('./costs.json');
  const sessions = costs['2026-02-13']?.sessions || {};
  
  const table = analyzer.formatTable(sessions, ['startTime', 'endTime', 'cost', 'tokens']);
  
  if (!table.includes('│') || !table.includes('─')) {
    throw new Error('Table formatting failed');
  }
  console.log('\n' + table);
});

// Test 9: Trend indicator
runner.test('Generate Trend Indicator', () => {
  const indicator = analyzer.generateTrendIndicator(150, 120, 'cost');
  
  if (indicator.change !== 30 || !indicator.indicator.includes('↗')) {
    throw new Error('Trend indicator calculation failed');
  }
  console.log(`  ${indicator.metric}: ${indicator.indicator}`);
});

// Test 10: Analyze costs
runner.test('Analyze Costs - Full Report', () => {
  const costs = analyzer.parseJSON('./costs.json');
  const analysis = analyzer.analyzeCosts(costs);
  
  if (!analysis.summary || !analysis.sessions) {
    throw new Error('Cost analysis failed');
  }
  console.log(`  Total: $${analysis.summary.totalCost}, Status: ${analysis.summary.status}`);
  console.log(`  Budget: ${analysis.summary.budgetUsagePercent}% of $${analysis.summary.monthlyBudget}`);
});

// Test 11: Analyze performance
runner.test('Analyze Performance', () => {
  const costs = analyzer.parseJSON('./costs.json');
  const perf = analyzer.analyzePerformance(costs);
  
  if (!perf.averages || !perf.sessions) {
    throw new Error('Performance analysis failed');
  }
  console.log(`  Token Efficiency: ${perf.averages.tokenEfficiency} tokens/call`);
  console.log(`  Cost per Token: $${perf.averages.costPerToken.toFixed(6)}`);
});

// Test 12: Analyze usage
runner.test('Analyze Usage', () => {
  const costs = analyzer.parseJSON('./costs.json');
  const usage = analyzer.analyzeUsage(costs);
  
  if (!usage.hourlyBreakdown || !usage.peakHour) {
    throw new Error('Usage analysis failed');
  }
  console.log(`  Peak: ${usage.peakHour} with ${usage.peakCalls} calls`);
  console.log(`  Average: ${usage.averageCallsPerHour} calls/hour`);
});

// Test 13: Generate summary report
runner.test('Generate Summary Report', () => {
  const costs = analyzer.parseJSON('./costs.json');
  const report = analyzer.generateReport(costs, 'summary');
  
  if (!report.includes('COST ANALYSIS') || !report.includes('PERFORMANCE METRICS')) {
    throw new Error('Report generation failed');
  }
  console.log('\n' + report);
});

// Test 14: Anomaly detection on cost data
runner.test('Anomaly Detection - Real Cost Data', () => {
  const costs = analyzer.parseJSON('./costs.json');
  const hourlyData = costs['2026-02-13']?.perHour || {};
  const values = Object.values(hourlyData).map(h => h.cost);
  
  const anomalies = analyzer.detectAnomalies(values, 'zscore', 2.0);
  console.log(`  Found ${anomalies.anomalyCount} anomalies in hourly costs`);
  if (anomalies.anomalies.length > 0) {
    anomalies.anomalies.forEach(a => {
      console.log(`    Hour ${a.index}: $${a.value} (z-score: ${a.zscore})`);
    });
  }
});

// Test 15: Session cost comparison
runner.test('Session Cost Comparison', () => {
  const costs = analyzer.parseJSON('./costs.json');
  const sessions = costs['2026-02-13']?.sessions || {};
  
  const sessionMetrics = Object.entries(sessions).map(([id, session]) => {
    return {
      id: id.substring(0, 20),
      cost: session.cost,
      model: session.model,
      costPerToken: (session.cost / session.tokens).toFixed(6)
    };
  });
  
  const table = analyzer.formatTable(sessionMetrics, ['id', 'cost', 'model', 'costPerToken']);
  console.log('\n' + table);
});

// Test 16: Budget tracking
runner.test('Budget Tracking & Alerts', () => {
  const costs = analyzer.parseJSON('./costs.json');
  const summary = costs.summary || {};
  
  const alert = {
    isOverBudget: summary.totalCost > summary.monthlyBudget,
    budgetUsage: Math.round((summary.totalCost / summary.monthlyBudget) * 100),
    overage: Math.max(0, summary.totalCost - summary.monthlyBudget),
    daysRemaining: 28 - 3,
    projectedOverage: Math.max(0, summary.projectedMonthlyAtCurrentRate - summary.monthlyBudget)
  };
  
  console.log(`  Budget: $${summary.monthlyBudget} | Current: $${summary.totalCost}`);
  console.log(`  Usage: ${alert.budgetUsage}% | Overage: $${alert.overage.toFixed(2)}`);
  console.log(`  Projected Month: $${summary.projectedMonthlyAtCurrentRate} | Projected Overage: $${alert.projectedOverage.toFixed(2)}`);
});

// ============================================================================
// EXECUTE TESTS
// ============================================================================

runner.run().catch(console.error);
