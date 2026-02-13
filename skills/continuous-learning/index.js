/**
 * Continuous Learning System - Main Entry Point
 * Orchestrates feedback capture, pattern analysis, and adaptation
 */

const { FeedbackCapture, SIGNAL_TYPES, LEARNING_CATEGORIES } = require('./feedback-capture');
const { PatternAnalysis, CONFIDENCE_THRESHOLDS } = require('./pattern-analysis');
const { EpisodicIntegration } = require('./episodic-integration');
const { LearningMetrics } = require('./learning-metrics');

/**
 * Main continuous learning system
 */
class ContinuousLearning {
  constructor(workspacePath) {
    this.workspacePath = workspacePath;
    this.feedbackCapture = new FeedbackCapture(workspacePath);
    this.patternAnalysis = new PatternAnalysis(workspacePath);
    this.episodicIntegration = new EpisodicIntegration(workspacePath);
    this.metrics = new LearningMetrics(workspacePath);
    this.initialized = false;
  }
  
  /**
   * Initialize the learning system
   */
  async initialize() {
    await this.patternAnalysis.loadPatterns();
    await this.metrics.loadMetrics();
    this.initialized = true;
    console.log('✅ Continuous Learning System initialized');
  }
  
  /**
   * Process user message and capture feedback signals
   */
  async processMessage(message, context = {}) {
    if (!this.initialized) await this.initialize();
    
    // Auto-detect feedback signals in message
    const signals = this._detectSignals(message, context);
    
    // Process signals
    for (const signal of signals) {
      await this.metrics.recordSignal(signal.type, signal.category, signal.strength);
    }
    
    // Analyze patterns
    const adaptations = await this.patternAnalysis.processSignals(signals);
    
    // Log adaptations
    for (const adaptation of adaptations) {
      await this.metrics.recordAdaptation(
        adaptation.category,
        adaptation.newConfidence
      );
      await this.episodicIntegration.logAdaptationToMemory(adaptation);
      
      // Update long-term memory if high confidence
      if (adaptation.newConfidence >= CONFIDENCE_THRESHOLDS.HIGH) {
        await this.episodicIntegration.updateLongTermMemory(adaptation);
      }
    }
    
    return {
      signalsDetected: signals.length,
      adaptationsApplied: adaptations.length,
      adaptations: adaptations
    };
  }
  
  /**
   * Capture explicit correction
   */
  async captureCorrection(originalResponse, correction, context = {}) {
    if (!this.initialized) await this.initialize();
    
    const signal = this.feedbackCapture.captureCorrection(
      originalResponse,
      correction,
      context
    );
    
    await this.metrics.recordSignal(signal.type, signal.category, signal.strength);
    await this.metrics.recordCorrection(signal.category);
    
    // Process immediately
    const adaptations = await this.patternAnalysis.processSignals([signal]);
    
    return {
      signal: signal,
      adaptations: adaptations
    };
  }
  
  /**
   * Capture user reaction
   */
  async captureReaction(emoji, messageId, context = {}) {
    if (!this.initialized) await this.initialize();
    
    const signal = this.feedbackCapture.captureReaction(emoji, messageId, context);
    if (!signal) return null;
    
    await this.metrics.recordSignal(signal.type, signal.category, signal.strength);
    
    // Track satisfaction
    const isPositive = signal.strength > 0;
    await this.metrics.recordSatisfaction(isPositive);
    
    return { signal: signal };
  }
  
  /**
   * Get current high-confidence preferences
   */
  async getActivePreferences() {
    if (!this.initialized) await this.initialize();
    
    return this.patternAnalysis.getHighConfidencePreferences(
      CONFIDENCE_THRESHOLDS.MODERATE
    );
  }
  
  /**
   * Get learning summary
   */
  async getSummary() {
    if (!this.initialized) await this.initialize();
    
    const patternSummary = this.patternAnalysis.getSummary();
    const metricsSummary = this.metrics.getSummary();
    
    return {
      patterns: patternSummary,
      metrics: metricsSummary
    };
  }
  
  /**
   * Validate adaptation based on user feedback
   */
  async validateAdaptation(category, successful) {
    if (!this.initialized) await this.initialize();
    
    await this.patternAnalysis.validateAdaptation(category, successful);
    await this.metrics.recordAdaptation(category, null, successful);
  }
  
  /**
   * Scan episodic memory for patterns
   */
  async scanMemory(daysBack = 3) {
    if (!this.initialized) await this.initialize();
    
    const signals = await this.episodicIntegration.scanRecentMemory(daysBack);
    
    // Convert to feedback signals
    const feedbackSignals = signals.map(s => {
      if (s.type === 'EXPLICIT_CORRECTION') {
        return this.feedbackCapture.captureCorrection('', s.content, {
          source: 'episodic_scan',
          date: s.date
        });
      } else if (s.type === 'EXPLICIT_PREFERENCE') {
        return this.feedbackCapture.capturePreference(s.content, {
          source: 'episodic_scan',
          date: s.date
        });
      }
      return null;
    }).filter(s => s !== null);
    
    // Process signals
    if (feedbackSignals.length > 0) {
      const adaptations = await this.patternAnalysis.processSignals(feedbackSignals);
      return {
        signalsFound: feedbackSignals.length,
        adaptations: adaptations
      };
    }
    
    return {
      signalsFound: 0,
      adaptations: []
    };
  }
  
  /**
   * Generate metrics report
   */
  async generateReport() {
    if (!this.initialized) await this.initialize();
    
    return await this.metrics.generateReport();
  }
  
  // Private helper methods
  
  _detectSignals(message, context) {
    const signals = [];
    const text = message.toLowerCase();
    
    // Detect corrections
    if (text.includes('actually') || text.includes('correction') || 
        text.includes('i meant') || text.includes('no, i mean')) {
      signals.push(this.feedbackCapture.captureCorrection('', message, context));
    }
    
    // Detect preferences
    if (text.includes('prefer') || text.includes('always') || 
        text.includes('never') || text.includes('i like')) {
      signals.push(this.feedbackCapture.capturePreference(message, context));
    }
    
    // Detect follow-ups requesting more detail
    if (text.includes('more detail') || text.includes('explain') ||
        text.includes('clarify') || text.includes('what do you mean')) {
      signals.push(this.feedbackCapture.captureFollowUp('', message, context));
    }
    
    // Detect positive feedback
    if (text.includes('perfect') || text.includes('exactly') ||
        text.includes('great') || text.includes('helpful')) {
      signals.push(new (require('./feedback-capture').FeedbackSignal)(
        'EXPLICIT_POSITIVE',
        LEARNING_CATEGORIES.OUTPUT_FORMAT,
        { message: message, ...context }
      ));
    }
    
    return signals.filter(s => s !== null);
  }
}

// Export everything
module.exports = {
  ContinuousLearning,
  FeedbackCapture,
  PatternAnalysis,
  EpisodicIntegration,
  LearningMetrics,
  SIGNAL_TYPES,
  LEARNING_CATEGORIES,
  CONFIDENCE_THRESHOLDS
};
