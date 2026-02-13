/**
 * Quality Metrics System
 * Tracks: Accuracy, Latency, Cost, Coherence
 */

const fs = require('fs');
const path = require('path');

class QualityMetrics {
  constructor(config = {}) {
    this.config = {
      metricsDir: config.metricsDir || path.join(__dirname, 'metrics'),
      trackingInterval: config.trackingInterval || 1000,
      ...config
    };

    this.metrics = {
      accuracy: [],
      latency: [],
      cost: [],
      coherence: [],
      reliability: [],
      throughput: []
    };

    this.benchmarks = {
      accuracy: { min: 0.85, target: 0.95, critical: 0.75 },
      latency: { max: 10000, target: 5000, critical: 30000 },
      cost: { max: 0.50, target: 0.25, critical: 1.00 },
      coherence: { min: 0.80, target: 0.95, critical: 0.60 },
      reliability: { min: 0.90, target: 0.99, critical: 0.80 },
      throughput: { min: 5, target: 20, critical: 1 }
    };

    this.agentMetrics = new Map();

    // Ensure metrics directory exists
    if (!fs.existsSync(this.config.metricsDir)) {
      fs.mkdirSync(this.config.metricsDir, { recursive: true });
    }
  }

  /**
   * Record a metric measurement
   * @param {string} metricType - Type of metric (accuracy, latency, etc.)
   * @param {number} value - Metric value
   * @param {object} metadata - Additional metadata
   */
  recordMetric(metricType, value, metadata = {}) {
    if (!this.metrics[metricType]) {
      this.metrics[metricType] = [];
    }

    const record = {
      timestamp: Date.now(),
      value,
      metadata,
      benchmark: this.benchmarks[metricType]
    };

    this.metrics[metricType].push(record);

    // Track by agent if provided
    if (metadata.agentId) {
      if (!this.agentMetrics.has(metadata.agentId)) {
        this.agentMetrics.set(metadata.agentId, {
          accuracy: [],
          latency: [],
          cost: [],
          coherence: [],
          testCount: 0
        });
      }

      const agentMetric = this.agentMetrics.get(metadata.agentId);
      if (agentMetric[metricType]) {
        agentMetric[metricType].push(value);
      }
      agentMetric.testCount++;
    }

    return record;
  }

  /**
   * Calculate accuracy score
   * Measures how close actual output matches expected output
   * @param {object} actual - Actual output
   * @param {object} expected - Expected output
   * @returns {number} Accuracy score (0-1)
   */
  calculateAccuracy(actual, expected) {
    if (!actual || !expected) return 0;

    try {
      const actualStr = JSON.stringify(actual).toLowerCase();
      const expectedStr = JSON.stringify(expected).toLowerCase();

      // Tokenize and compare
      const actualTokens = actualStr.split(/\s+/).filter(t => t.length > 0);
      const expectedTokens = expectedStr.split(/\s+/).filter(t => t.length > 0);

      let matches = 0;
      for (const token of expectedTokens) {
        if (actualTokens.includes(token)) {
          matches++;
        }
      }

      const accuracy = expectedTokens.length > 0 
        ? matches / expectedTokens.length 
        : 0;

      return Math.min(1, Math.max(0, accuracy));
    } catch (error) {
      console.error('Error calculating accuracy:', error);
      return 0;
    }
  }

  /**
   * Calculate latency metrics
   * @param {number} startTime - Start time (ms)
   * @param {number} endTime - End time (ms)
   * @returns {object} Latency metrics
   */
  calculateLatency(startTime, endTime) {
    const latency = endTime - startTime;

    return {
      totalLatency: latency,
      isAcceptable: latency <= this.benchmarks.latency.max,
      percentOfBudget: (latency / this.benchmarks.latency.max) * 100,
      status: this.getLatencyStatus(latency)
    };
  }

  /**
   * Get latency status
   * @private
   */
  getLatencyStatus(latency) {
    if (latency <= this.benchmarks.latency.target) return 'excellent';
    if (latency <= this.benchmarks.latency.max) return 'acceptable';
    if (latency <= this.benchmarks.latency.critical) return 'warning';
    return 'critical';
  }

  /**
   * Calculate cost metrics
   * @param {object} tokenUsage - Token usage data
   * @param {string} model - Model identifier
   * @returns {object} Cost metrics
   */
  calculateCost(tokenUsage, model) {
    const costPerKToken = this.getModelCost(model);
    const estimatedCost = (tokenUsage / 1000) * costPerKToken;

    return {
      tokensUsed: tokenUsage,
      costPerKToken,
      estimatedCost: parseFloat(estimatedCost.toFixed(4)),
      isWithinBudget: estimatedCost <= this.benchmarks.cost.max,
      percentOfBudget: (estimatedCost / this.benchmarks.cost.max) * 100,
      status: this.getCostStatus(estimatedCost)
    };
  }

  /**
   * Get model cost
   * @private
   */
  getModelCost(model) {
    const costMap = {
      'anthropic/claude-haiku-4-5': 0.008,
      'anthropic/claude-sonnet-4-5': 0.18,
      'anthropic/claude-opus-4-5': 0.75,
      'default': 0.01
    };

    return costMap[model] || costMap['default'];
  }

  /**
   * Get cost status
   * @private
   */
  getCostStatus(cost) {
    if (cost <= this.benchmarks.cost.target) return 'excellent';
    if (cost <= this.benchmarks.cost.max) return 'acceptable';
    if (cost <= this.benchmarks.cost.critical) return 'warning';
    return 'critical';
  }

  /**
   * Calculate coherence score
   * Measures logical flow and consistency of output
   * @param {string} text - Text to analyze
   * @returns {number} Coherence score (0-1)
   */
  calculateCoherence(text) {
    if (!text || typeof text !== 'string') return 0;

    let score = 1.0;
    const length = text.length;

    // Length check
    if (length < 50) {
      score *= 0.7;
    } else if (length < 200) {
      score *= 0.85;
    }

    // Sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) {
      score *= 0.6;
    } else if (sentences.length > 2) {
      score *= 1.0;
    }

    // Vocabulary richness (unique word ratio)
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const uniqueWords = new Set(words);
    const uniqueRatio = uniqueWords.size / Math.max(1, words.length);
    score *= (0.7 + uniqueRatio * 0.3);

    // Check for error indicators
    const errorIndicators = ['error', 'failed', 'unknown', 'undefined', 'null', 'syntax error'];
    for (const indicator of errorIndicators) {
      if (text.toLowerCase().includes(indicator)) {
        score *= 0.5;
        break;
      }
    }

    // Check for coherence indicators
    const coherenceIndicators = ['therefore', 'thus', 'because', 'however', 'moreover', 'furthermore'];
    let hasCoherence = false;
    for (const indicator of coherenceIndicators) {
      if (text.toLowerCase().includes(indicator)) {
        hasCoherence = true;
        break;
      }
    }
    if (hasCoherence) {
      score *= 1.1;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Calculate reliability score
   * Measures consistency and error rate
   * @param {Array} testResults - Array of test results
   * @returns {number} Reliability score (0-1)
   */
  calculateReliability(testResults) {
    if (!testResults || testResults.length === 0) return 0;

    const successCount = testResults.filter(r => r.status === 'passed').length;
    const reliability = successCount / testResults.length;

    return Math.min(1, Math.max(0, reliability));
  }

  /**
   * Calculate throughput
   * Tasks completed per minute
   * @param {Array} testResults - Array of test results
   * @param {number} durationMs - Total duration in milliseconds
   * @returns {number} Tasks per minute
   */
  calculateThroughput(testResults, durationMs) {
    if (durationMs === 0) return 0;

    const tasksCompleted = testResults.filter(r => r.status === 'passed').length;
    const minutes = durationMs / (1000 * 60);

    return minutes > 0 ? tasksCompleted / minutes : 0;
  }

  /**
   * Get summary metrics
   */
  getSummaryMetrics() {
    return {
      accuracy: this.getMetricSummary('accuracy'),
      latency: this.getMetricSummary('latency'),
      cost: this.getMetricSummary('cost'),
      coherence: this.getMetricSummary('coherence'),
      reliability: this.getMetricSummary('reliability'),
      throughput: this.getMetricSummary('throughput'),
      overallHealth: this.calculateOverallHealth()
    };
  }

  /**
   * Get metric summary
   * @private
   */
  getMetricSummary(metricType) {
    const data = this.metrics[metricType] || [];
    if (data.length === 0) return null;

    const values = data.map(d => d.value);
    const sorted = values.sort((a, b) => a - b);
    const len = values.length;

    const avg = values.reduce((a, b) => a + b, 0) / len;
    const median = len % 2 === 0
      ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2
      : sorted[Math.floor(len / 2)];

    return {
      min: sorted[0],
      max: sorted[len - 1],
      avg: parseFloat(avg.toFixed(4)),
      median: parseFloat(median.toFixed(4)),
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
      count: len,
      status: this.getMetricStatus(metricType, avg)
    };
  }

  /**
   * Get metric status
   * @private
   */
  getMetricStatus(metricType, value) {
    const benchmark = this.benchmarks[metricType];
    if (!benchmark) return 'unknown';

    if (metricType === 'accuracy' || metricType === 'coherence' || metricType === 'reliability') {
      if (value >= benchmark.target) return 'excellent';
      if (value >= benchmark.min) return 'acceptable';
      if (value >= benchmark.critical) return 'warning';
      return 'critical';
    } else if (metricType === 'latency' || metricType === 'cost') {
      if (value <= benchmark.target) return 'excellent';
      if (value <= benchmark.max) return 'acceptable';
      if (value <= benchmark.critical) return 'warning';
      return 'critical';
    } else if (metricType === 'throughput') {
      if (value >= benchmark.target) return 'excellent';
      if (value >= benchmark.min) return 'acceptable';
      if (value >= benchmark.critical) return 'warning';
      return 'critical';
    }

    return 'unknown';
  }

  /**
   * Calculate overall health
   * @private
   */
  calculateOverallHealth() {
    const summary = this.getSummaryMetrics();
    const weights = {
      accuracy: 0.25,
      latency: 0.20,
      cost: 0.15,
      coherence: 0.25,
      reliability: 0.15
    };

    let health = 0;
    let totalWeight = 0;

    for (const [metric, weight] of Object.entries(weights)) {
      if (summary[metric]) {
        const statusScore = this.getStatusScore(summary[metric].status);
        health += statusScore * weight;
        totalWeight += weight;
      }
    }

    return {
      score: totalWeight > 0 ? (health / totalWeight).toFixed(2) : 0,
      status: this.getHealthStatus(health / totalWeight)
    };
  }

  /**
   * Get status score
   * @private
   */
  getStatusScore(status) {
    const scoreMap = {
      'excellent': 1.0,
      'acceptable': 0.75,
      'warning': 0.4,
      'critical': 0.0
    };
    return scoreMap[status] || 0;
  }

  /**
   * Get health status
   * @private
   */
  getHealthStatus(score) {
    if (score >= 0.85) return 'excellent';
    if (score >= 0.70) return 'acceptable';
    if (score >= 0.50) return 'warning';
    return 'critical';
  }

  /**
   * Get per-agent metrics
   */
  getAgentMetrics(agentId) {
    if (!this.agentMetrics.has(agentId)) {
      return null;
    }

    const agentData = this.agentMetrics.get(agentId);
    return {
      agentId,
      testCount: agentData.testCount,
      accuracy: this.calculateAgentMetricAvg(agentData.accuracy),
      latency: this.calculateAgentMetricAvg(agentData.latency),
      cost: this.calculateAgentMetricAvg(agentData.cost),
      coherence: this.calculateAgentMetricAvg(agentData.coherence),
      successRate: agentData.testCount > 0 ? 1.0 : 0
    };
  }

  /**
   * Calculate agent metric average
   * @private
   */
  calculateAgentMetricAvg(values) {
    if (!values || values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return parseFloat((sum / values.length).toFixed(4));
  }

  /**
   * Save metrics to file
   */
  async saveMetrics(filename) {
    return new Promise((resolve, reject) => {
      const metricsData = {
        timestamp: new Date().toISOString(),
        summary: this.getSummaryMetrics(),
        agents: Array.from(this.agentMetrics.entries()).map(([agentId, data]) => ({
          agentId,
          ...this.getAgentMetrics(agentId)
        })),
        rawMetrics: this.metrics
      };

      const filepath = path.join(this.config.metricsDir, filename || `metrics-${Date.now()}.json`);

      fs.writeFile(filepath, JSON.stringify(metricsData, null, 2), (error) => {
        if (error) reject(error);
        else resolve(filepath);
      });
    });
  }

  /**
   * Generate metrics report
   */
  generateReport() {
    const summary = this.getSummaryMetrics();

    return {
      timestamp: new Date().toISOString(),
      overallHealth: summary.overallHealth,
      metrics: {
        accuracy: summary.accuracy,
        latency: summary.latency,
        cost: summary.cost,
        coherence: summary.coherence,
        reliability: summary.reliability,
        throughput: summary.throughput
      },
      agents: Array.from(this.agentMetrics.keys()).map(agentId => ({
        agentId,
        metrics: this.getAgentMetrics(agentId)
      })),
      recommendations: this.generateRecommendations(summary)
    };
  }

  /**
   * Generate recommendations based on metrics
   * @private
   */
  generateRecommendations(summary) {
    const recommendations = [];

    if (summary.accuracy && summary.accuracy.status === 'critical') {
      recommendations.push('⚠️ Accuracy critically low - review model output quality');
    }
    if (summary.latency && summary.latency.status === 'critical') {
      recommendations.push('⚠️ Latency critically high - optimize execution or upgrade resources');
    }
    if (summary.cost && summary.cost.status === 'critical') {
      recommendations.push('⚠️ Cost critically high - consider using cheaper models or optimizing prompts');
    }
    if (summary.coherence && summary.coherence.status === 'warning') {
      recommendations.push('⚠️ Coherence degrading - improve prompt quality or context');
    }
    if (summary.reliability && summary.reliability.status === 'warning') {
      recommendations.push('⚠️ Reliability declining - add retry mechanisms or error handling');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All metrics within acceptable ranges');
    }

    return recommendations;
  }
}

module.exports = { QualityMetrics };
