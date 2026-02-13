/**
 * Pattern Analysis Engine
 * Analyzes feedback signals and updates learning patterns
 */

const fs = require('fs');
const path = require('path');

/**
 * Confidence thresholds for adaptation
 */
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.90,      // Apply immediately as new default
  MODERATE: 0.75,  // Test with 3+ cases before adapting
  LOW: 0.50,       // Continue learning, don't adapt yet
  INITIAL: 0.40    // Single observation
};

/**
 * Pattern analysis engine
 */
class PatternAnalysis {
  constructor(workspacePath) {
    this.workspacePath = workspacePath;
    this.learningPath = path.join(workspacePath, 'skills', 'continuous-learning');
    this.patternsFile = path.join(this.learningPath, 'learning-patterns.json');
    this.patterns = null;
  }
  
  /**
   * Load existing patterns from storage
   */
  async loadPatterns() {
    try {
      const data = await fs.promises.readFile(this.patternsFile, 'utf8');
      this.patterns = JSON.parse(data);
      return this.patterns;
    } catch (error) {
      // File doesn't exist yet, initialize
      this.patterns = this._initializePatterns();
      await this.savePatterns();
      return this.patterns;
    }
  }
  
  /**
   * Save patterns to storage
   */
  async savePatterns() {
    if (!this.patterns) return;
    
    this.patterns.lastUpdated = new Date().toISOString();
    
    try {
      await fs.promises.writeFile(
        this.patternsFile,
        JSON.stringify(this.patterns, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save patterns:', error);
    }
  }
  
  /**
   * Process feedback signals and update patterns
   */
  async processSignals(signals) {
    if (!this.patterns) await this.loadPatterns();
    
    const adaptations = [];
    
    for (const signal of signals) {
      const adaptation = await this._processSignal(signal);
      if (adaptation) {
        adaptations.push(adaptation);
      }
    }
    
    await this.savePatterns();
    return adaptations;
  }
  
  /**
   * Calculate confidence for a preference
   */
  calculateConfidence(positive, negative, total) {
    if (total === 0) return 0;
    
    // Bayesian confidence with prior
    const prior = 0.5;
    const priorWeight = 2;
    
    const posterior = (positive + priorWeight * prior) / (total + priorWeight);
    
    // Reduce confidence if contradictory signals exist
    const contradictionPenalty = negative / total;
    const adjustedConfidence = posterior * (1 - contradictionPenalty * 0.5);
    
    return Math.max(0, Math.min(1, adjustedConfidence));
  }
  
  /**
   * Get preferences above confidence threshold
   */
  getHighConfidencePreferences(threshold = CONFIDENCE_THRESHOLDS.HIGH) {
    if (!this.patterns) return [];
    
    const highConfidence = [];
    
    for (const [key, pref] of Object.entries(this.patterns.preferences)) {
      if (pref.confidence >= threshold) {
        highConfidence.push({
          category: key,
          preference: pref
        });
      }
    }
    
    return highConfidence;
  }
  
  /**
   * Check if adaptation should be applied
   */
  shouldAdapt(category) {
    if (!this.patterns) return false;
    
    const pref = this.patterns.preferences[category];
    if (!pref) return false;
    
    return pref.confidence >= CONFIDENCE_THRESHOLDS.MODERATE;
  }
  
  /**
   * Log adaptation to history
   */
  logAdaptation(category, description, confidence, basedOn) {
    if (!this.patterns.adaptationHistory) {
      this.patterns.adaptationHistory = [];
    }
    
    this.patterns.adaptationHistory.push({
      date: new Date().toISOString(),
      category: category,
      adaptation: description,
      basedOn: basedOn,
      confidence: confidence,
      status: 'active'
    });
    
    // Keep only last 50 adaptations
    if (this.patterns.adaptationHistory.length > 50) {
      this.patterns.adaptationHistory = this.patterns.adaptationHistory.slice(-50);
    }
  }
  
  /**
   * Validate adaptation against new feedback
   */
  async validateAdaptation(category, successful) {
    if (!this.patterns) await this.loadPatterns();
    
    const pref = this.patterns.preferences[category];
    if (!pref) return;
    
    if (!pref.validations) {
      pref.validations = { successful: 0, failed: 0 };
    }
    
    if (successful) {
      pref.validations.successful++;
      // Increase confidence slightly
      pref.confidence = Math.min(1.0, pref.confidence * 1.05);
    } else {
      pref.validations.failed++;
      // Decrease confidence
      pref.confidence = Math.max(0, pref.confidence * 0.85);
    }
    
    await this.savePatterns();
  }
  
  /**
   * Get learning summary
   */
  getSummary() {
    if (!this.patterns) return null;
    
    const summary = {
      totalPreferences: Object.keys(this.patterns.preferences).length,
      highConfidence: 0,
      moderateConfidence: 0,
      lowConfidence: 0,
      totalAdaptations: this.patterns.adaptationHistory?.length || 0,
      averageConfidence: 0
    };
    
    let totalConf = 0;
    for (const pref of Object.values(this.patterns.preferences)) {
      totalConf += pref.confidence;
      
      if (pref.confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
        summary.highConfidence++;
      } else if (pref.confidence >= CONFIDENCE_THRESHOLDS.MODERATE) {
        summary.moderateConfidence++;
      } else {
        summary.lowConfidence++;
      }
    }
    
    summary.averageConfidence = totalConf / summary.totalPreferences;
    
    return summary;
  }
  
  // Private helper methods
  
  async _processSignal(signal) {
    const category = signal.category;
    const pref = this.patterns.preferences[category];
    
    if (!pref) {
      console.warn(`Unknown preference category: ${category}`);
      return null;
    }
    
    // Update observation count
    if (!pref.observations) {
      pref.observations = { positive: 0, negative: 0, total: 0 };
    }
    
    pref.observations.total++;
    
    if (signal.strength > 0) {
      pref.observations.positive += Math.abs(signal.strength);
    } else {
      pref.observations.negative += Math.abs(signal.strength);
    }
    
    // Recalculate confidence
    const oldConfidence = pref.confidence;
    pref.confidence = this.calculateConfidence(
      pref.observations.positive,
      pref.observations.negative,
      pref.observations.total
    );
    
    // Add to learned from sources
    if (!pref.learnedFrom) pref.learnedFrom = [];
    pref.learnedFrom.push({
      source: signal.signalCategory,
      signal: signal.type,
      strength: signal.strength,
      timestamp: signal.timestamp,
      context: signal.context
    });
    
    // Keep only last 20 sources
    if (pref.learnedFrom.length > 20) {
      pref.learnedFrom = pref.learnedFrom.slice(-20);
    }
    
    // Check if confidence crossed threshold
    const crossedThreshold = 
      (oldConfidence < CONFIDENCE_THRESHOLDS.MODERATE && 
       pref.confidence >= CONFIDENCE_THRESHOLDS.MODERATE) ||
      (oldConfidence < CONFIDENCE_THRESHOLDS.HIGH && 
       pref.confidence >= CONFIDENCE_THRESHOLDS.HIGH);
    
    if (crossedThreshold) {
      const adaptation = {
        category: category,
        oldConfidence: oldConfidence,
        newConfidence: pref.confidence,
        threshold: pref.confidence >= CONFIDENCE_THRESHOLDS.HIGH ? 'HIGH' : 'MODERATE',
        preference: pref
      };
      
      this.logAdaptation(
        category,
        `Confidence increased from ${(oldConfidence * 100).toFixed(1)}% to ${(pref.confidence * 100).toFixed(1)}%`,
        pref.confidence,
        `${pref.observations.total} observations`
      );
      
      return adaptation;
    }
    
    return null;
  }
  
  _initializePatterns() {
    return {
      lastUpdated: new Date().toISOString(),
      analysisVersion: '1.0',
      preferences: {
        outputFormat: {
          default: null,
          confidence: 0,
          description: 'Output format preferences (artifact-first, explanation-first, etc.)',
          observations: { positive: 0, negative: 0, total: 0 },
          learnedFrom: [],
          adaptations: []
        },
        communicationStyle: {
          default: null,
          confidence: 0,
          description: 'Communication style (formal, casual, direct, etc.)',
          observations: { positive: 0, negative: 0, total: 0 },
          learnedFrom: [],
          adaptations: []
        },
        directness: {
          default: null,
          confidence: 0,
          description: 'Directness level (TL;DR first, answer before explanation)',
          observations: { positive: 0, negative: 0, total: 0 },
          learnedFrom: [],
          adaptations: []
        },
        toolPreferences: {
          default: null,
          confidence: 0,
          description: 'Tool selection preferences (memory-first, web-search-first, etc.)',
          observations: { positive: 0, negative: 0, total: 0 },
          learnedFrom: [],
          adaptations: []
        },
        timingProactivity: {
          default: null,
          confidence: 0,
          description: 'Timing and proactivity preferences',
          observations: { positive: 0, negative: 0, total: 0 },
          learnedFrom: [],
          adaptations: []
        },
        confidenceSignaling: {
          default: null,
          confidence: 0,
          description: 'Confidence signaling in responses',
          observations: { positive: 0, negative: 0, total: 0 },
          learnedFrom: [],
          adaptations: []
        },
        specificity: {
          default: null,
          confidence: 0,
          description: 'Level of precision and specificity',
          observations: { positive: 0, negative: 0, total: 0 },
          learnedFrom: [],
          adaptations: []
        },
        sourceVerification: {
          default: null,
          confidence: 0,
          description: 'Source citation and verification',
          observations: { positive: 0, negative: 0, total: 0 },
          learnedFrom: [],
          adaptations: []
        },
        contentDepth: {
          default: null,
          confidence: 0,
          description: 'Content depth by topic',
          observations: { positive: 0, negative: 0, total: 0 },
          learnedFrom: [],
          adaptations: []
        },
        autonomy: {
          default: null,
          confidence: 0,
          description: 'Autonomous execution vs permission-seeking',
          observations: { positive: 0, negative: 0, total: 0 },
          learnedFrom: [],
          adaptations: []
        }
      },
      detectedPatterns: {
        timePatterns: [],
        taskPatterns: [],
        communicationPatterns: []
      },
      adaptationHistory: []
    };
  }
}

module.exports = {
  PatternAnalysis,
  CONFIDENCE_THRESHOLDS
};
