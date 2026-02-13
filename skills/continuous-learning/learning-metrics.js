/**
 * Learning Metrics & Tracking
 * Tracks learning performance and adaptation success
 */

const fs = require('fs');
const path = require('path');

/**
 * Metrics tracking class
 */
class LearningMetrics {
  constructor(workspacePath) {
    this.workspacePath = workspacePath;
    this.learningPath = path.join(workspacePath, 'skills', 'continuous-learning');
    this.metricsFile = path.join(this.learningPath, 'metrics.json');
    this.metrics = null;
  }
  
  /**
   * Load metrics from storage
   */
  async loadMetrics() {
    try {
      const data = await fs.promises.readFile(this.metricsFile, 'utf8');
      this.metrics = JSON.parse(data);
      return this.metrics;
    } catch (error) {
      // Initialize new metrics
      this.metrics = this._initializeMetrics();
      await this.saveMetrics();
      return this.metrics;
    }
  }
  
  /**
   * Save metrics to storage
   */
  async saveMetrics() {
    if (!this.metrics) return;
    
    this.metrics.lastUpdated = new Date().toISOString();
    
    try {
      await fs.promises.writeFile(
        this.metricsFile,
        JSON.stringify(this.metrics, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }
  
  /**
   * Record feedback signal received
   */
  async recordSignal(signalType, category, strength) {
    if (!this.metrics) await this.loadMetrics();
    
    this.metrics.signalsReceived++;
    
    if (!this.metrics.signalsByType[signalType]) {
      this.metrics.signalsByType[signalType] = 0;
    }
    this.metrics.signalsByType[signalType]++;
    
    if (!this.metrics.signalsByCategory[category]) {
      this.metrics.signalsByCategory[category] = 0;
    }
    this.metrics.signalsByCategory[category]++;
    
    // Track strength distribution
    if (strength > 0.7) {
      this.metrics.strongSignals++;
    } else if (strength < -0.7) {
      this.metrics.negativeSignals++;
    }
    
    await this.saveMetrics();
  }
  
  /**
   * Record adaptation applied
   */
  async recordAdaptation(category, confidence, successful = null) {
    if (!this.metrics) await this.loadMetrics();
    
    this.metrics.adaptationsApplied++;
    
    if (!this.metrics.adaptationsByCategory[category]) {
      this.metrics.adaptationsByCategory[category] = 0;
    }
    this.metrics.adaptationsByCategory[category]++;
    
    // Track success rate if validation provided
    if (successful !== null) {
      if (successful) {
        this.metrics.successfulAdaptations++;
      } else {
        this.metrics.failedAdaptations++;
      }
    }
    
    // Update average confidence
    const totalAdaptations = this.metrics.adaptationsApplied;
    const currentAvg = this.metrics.averageConfidence;
    this.metrics.averageConfidence = 
      (currentAvg * (totalAdaptations - 1) + confidence) / totalAdaptations;
    
    await this.saveMetrics();
  }
  
  /**
   * Record user satisfaction signal
   */
  async recordSatisfaction(positive) {
    if (!this.metrics) await this.loadMetrics();
    
    if (positive) {
      this.metrics.satisfactionMetrics.positive++;
    } else {
      this.metrics.satisfactionMetrics.negative++;
    }
    
    // Calculate satisfaction rate
    const total = this.metrics.satisfactionMetrics.positive + 
                  this.metrics.satisfactionMetrics.negative;
    this.metrics.satisfactionMetrics.rate = 
      this.metrics.satisfactionMetrics.positive / total;
    
    await this.saveMetrics();
  }
  
  /**
   * Track correction frequency (inverse measure of learning success)
   */
  async recordCorrection(category) {
    if (!this.metrics) await this.loadMetrics();
    
    this.metrics.correctionsReceived++;
    
    if (!this.metrics.correctionsByCategory[category]) {
      this.metrics.correctionsByCategory[category] = 0;
    }
    this.metrics.correctionsByCategory[category]++;
    
    await this.saveMetrics();
  }
  
  /**
   * Calculate learning velocity (adaptations per week)
   */
  calculateLearningVelocity() {
    if (!this.metrics) return 0;
    
    const firstAdaptation = this.metrics.firstAdaptationDate;
    if (!firstAdaptation) return 0;
    
    const daysSinceFirst = (Date.now() - new Date(firstAdaptation).getTime()) / (1000 * 60 * 60 * 24);
    const weeksSinceFirst = daysSinceFirst / 7;
    
    if (weeksSinceFirst < 0.1) return 0;
    
    return this.metrics.adaptationsApplied / weeksSinceFirst;
  }
  
  /**
   * Get success rate of adaptations
   */
  getSuccessRate() {
    if (!this.metrics) return 0;
    
    const total = this.metrics.successfulAdaptations + this.metrics.failedAdaptations;
    if (total === 0) return 0;
    
    return this.metrics.successfulAdaptations / total;
  }
  
  /**
   * Get metrics summary
   */
  getSummary() {
    if (!this.metrics) return null;
    
    return {
      signalsReceived: this.metrics.signalsReceived,
      adaptationsApplied: this.metrics.adaptationsApplied,
      successRate: this.getSuccessRate(),
      averageConfidence: this.metrics.averageConfidence,
      satisfactionRate: this.metrics.satisfactionMetrics.rate,
      satisfactionMetrics: this.metrics.satisfactionMetrics,
      learningVelocity: this.calculateLearningVelocity(),
      correctionsReceived: this.metrics.correctionsReceived,
      topCategories: this._getTopCategories()
    };
  }
  
  /**
   * Generate metrics report
   */
  async generateReport() {
    if (!this.metrics) await this.loadMetrics();
    
    const summary = this.getSummary();
    
    const report = `# Learning Metrics Report
Generated: ${new Date().toISOString()}

## Summary Statistics
- **Total Signals Received:** ${summary.signalsReceived}
- **Adaptations Applied:** ${summary.adaptationsApplied}
- **Success Rate:** ${(summary.successRate * 100).toFixed(1)}%
- **Average Confidence:** ${(summary.averageConfidence * 100).toFixed(1)}%
- **User Satisfaction Rate:** ${(summary.satisfactionRate * 100).toFixed(1)}%
- **Learning Velocity:** ${summary.learningVelocity.toFixed(2)} adaptations/week
- **Corrections Received:** ${summary.correctionsReceived}

## Top Learning Categories
${summary.topCategories.map(cat => 
  `- **${cat.category}:** ${cat.count} adaptations`
).join('\n')}

## Signal Distribution
${Object.entries(this.metrics.signalsByType).map(([type, count]) => 
  `- ${type}: ${count}`
).join('\n')}

## Satisfaction Metrics
- Positive feedback: ${this.metrics.satisfactionMetrics.positive}
- Negative feedback: ${this.metrics.satisfactionMetrics.negative}
- Satisfaction rate: ${(this.metrics.satisfactionMetrics.rate * 100).toFixed(1)}%

## Performance Indicators
- Strong signals: ${this.metrics.strongSignals}
- Negative signals: ${this.metrics.negativeSignals}
- Failed adaptations: ${this.metrics.failedAdaptations}
- Successful adaptations: ${this.metrics.successfulAdaptations}
`;
    
    const reportFile = path.join(this.learningPath, 'metrics-report.md');
    await fs.promises.writeFile(reportFile, report);
    
    return report;
  }
  
  // Private helper methods
  
  _initializeMetrics() {
    return {
      lastUpdated: new Date().toISOString(),
      signalsReceived: 0,
      adaptationsApplied: 0,
      successfulAdaptations: 0,
      failedAdaptations: 0,
      correctionsReceived: 0,
      strongSignals: 0,
      negativeSignals: 0,
      averageConfidence: 0,
      firstAdaptationDate: null,
      signalsByType: {},
      signalsByCategory: {},
      adaptationsByCategory: {},
      correctionsByCategory: {},
      satisfactionMetrics: {
        positive: 0,
        negative: 0,
        rate: 0
      }
    };
  }
  
  _getTopCategories() {
    const categories = Object.entries(this.metrics.adaptationsByCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return categories;
  }
}

module.exports = { LearningMetrics };
