/**
 * Feedback Capture System
 * Captures and categorizes user feedback signals from interactions
 */

const fs = require('fs');
const path = require('path');

/**
 * Feedback signal types and their strength
 */
const SIGNAL_TYPES = {
  // Explicit feedback (highest value)
  EXPLICIT_CORRECTION: { category: 'explicit', strength: 1.0 },
  EXPLICIT_PREFERENCE: { category: 'explicit', strength: 1.0 },
  EXPLICIT_POSITIVE: { category: 'explicit', strength: 0.9 },
  EXPLICIT_NEGATIVE: { category: 'explicit', strength: -0.9 },
  
  // Implicit signals (high value)
  REACTION_POSITIVE: { category: 'implicit', strength: 0.8 },
  REACTION_NEGATIVE: { category: 'implicit', strength: -0.8 },
  REACTION_CONFUSED: { category: 'implicit', strength: -0.6 },
  IMMEDIATE_CORRECTION: { category: 'implicit', strength: 0.9 },
  FOLLOW_UP_REQUEST: { category: 'implicit', strength: -0.5 },
  ARTIFACT_USED: { category: 'implicit', strength: 0.7 },
  RESPONSE_ABANDONED: { category: 'implicit', strength: -0.7 },
  
  // Pattern signals (medium value)
  TIME_OF_DAY: { category: 'pattern', strength: 0.4 },
  TOOL_PREFERENCE: { category: 'pattern', strength: 0.6 },
  REPEATED_REQUEST: { category: 'pattern', strength: -0.8 },
  QUICK_ENGAGEMENT: { category: 'pattern', strength: 0.5 }
};

/**
 * Learning categories matching SKILL.md
 */
const LEARNING_CATEGORIES = {
  OUTPUT_FORMAT: 'outputFormat',
  COMMUNICATION_STYLE: 'communicationStyle',
  DIRECTNESS: 'directness',
  TOOL_PREFERENCES: 'toolPreferences',
  TIMING_PROACTIVITY: 'timingProactivity',
  CONFIDENCE_SIGNALING: 'confidenceSignaling',
  SPECIFICITY: 'specificity',
  SOURCE_VERIFICATION: 'sourceVerification',
  CONTENT_DEPTH: 'contentDepth',
  AUTONOMY: 'autonomy'
};

/**
 * Feedback signal class
 */
class FeedbackSignal {
  constructor(type, category, context, metadata = {}) {
    this.type = type;
    this.category = category;
    this.strength = SIGNAL_TYPES[type]?.strength || 0;
    this.signalCategory = SIGNAL_TYPES[type]?.category || 'unknown';
    this.context = context;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
  
  toJSON() {
    return {
      type: this.type,
      category: this.category,
      strength: this.strength,
      signalCategory: this.signalCategory,
      context: this.context,
      metadata: this.metadata,
      timestamp: this.timestamp
    };
  }
}

/**
 * Main feedback capture engine
 */
class FeedbackCapture {
  constructor(workspacePath) {
    this.workspacePath = workspacePath;
    this.learningPath = path.join(workspacePath, 'skills', 'continuous-learning');
    this.signals = [];
  }
  
  /**
   * Capture explicit correction from user
   */
  captureCorrection(originalResponse, correction, context = {}) {
    const signal = new FeedbackSignal(
      'EXPLICIT_CORRECTION',
      this._categorizeCorrection(correction),
      {
        original: originalResponse,
        correction: correction,
        ...context
      }
    );
    
    this.signals.push(signal);
    return signal;
  }
  
  /**
   * Capture explicit preference statement
   */
  capturePreference(preference, context = {}) {
    const signal = new FeedbackSignal(
      'EXPLICIT_PREFERENCE',
      this._categorizePreference(preference),
      {
        preference: preference,
        ...context
      }
    );
    
    this.signals.push(signal);
    return signal;
  }
  
  /**
   * Capture reaction (emoji)
   */
  captureReaction(emoji, messageId, context = {}) {
    let type;
    if (['👍', '✅', '❤️', '🙌'].includes(emoji)) {
      type = 'REACTION_POSITIVE';
    } else if (['👎', '❌'].includes(emoji)) {
      type = 'REACTION_NEGATIVE';
    } else if (['😕', '🤔', '❓'].includes(emoji)) {
      type = 'REACTION_CONFUSED';
    } else {
      return null; // Not a feedback signal
    }
    
    const signal = new FeedbackSignal(
      type,
      LEARNING_CATEGORIES.OUTPUT_FORMAT, // Default, can be refined
      {
        emoji: emoji,
        messageId: messageId,
        ...context
      }
    );
    
    this.signals.push(signal);
    return signal;
  }
  
  /**
   * Capture follow-up request (indicates unclear response)
   */
  captureFollowUp(originalQuestion, followUp, context = {}) {
    const signal = new FeedbackSignal(
      'FOLLOW_UP_REQUEST',
      this._categorizeFollowUp(followUp),
      {
        originalQuestion: originalQuestion,
        followUp: followUp,
        ...context
      }
    );
    
    this.signals.push(signal);
    return signal;
  }
  
  /**
   * Capture artifact usage (positive signal)
   */
  captureArtifactUsage(artifactType, usedImmediately, context = {}) {
    const signal = new FeedbackSignal(
      'ARTIFACT_USED',
      LEARNING_CATEGORIES.OUTPUT_FORMAT,
      {
        artifactType: artifactType,
        usedImmediately: usedImmediately,
        ...context
      }
    );
    
    this.signals.push(signal);
    return signal;
  }
  
  /**
   * Capture tool preference signal
   */
  captureToolPreference(toolUsed, userFeedback, context = {}) {
    const signal = new FeedbackSignal(
      'TOOL_PREFERENCE',
      LEARNING_CATEGORIES.TOOL_PREFERENCES,
      {
        tool: toolUsed,
        feedback: userFeedback,
        ...context
      }
    );
    
    this.signals.push(signal);
    return signal;
  }
  
  /**
   * Capture time-of-day pattern
   */
  captureTimePattern(action, hour, context = {}) {
    const signal = new FeedbackSignal(
      'TIME_OF_DAY',
      LEARNING_CATEGORIES.TIMING_PROACTIVITY,
      {
        action: action,
        hour: hour,
        ...context
      }
    );
    
    this.signals.push(signal);
    return signal;
  }
  
  /**
   * Save captured signals to episodic memory
   */
  async saveToMemory() {
    if (this.signals.length === 0) return;
    
    const memoryFile = path.join(
      this.workspacePath, 
      'memory',
      `${this._getTodayDate()}.md`
    );
    
    const signalSummary = this._summarizeSignals();
    const entry = `\n## Feedback Signals Captured (${new Date().toISOString()})\n\n${signalSummary}\n`;
    
    try {
      await fs.promises.appendFile(memoryFile, entry);
      console.log(`Saved ${this.signals.length} feedback signals to ${memoryFile}`);
      this.signals = []; // Clear after saving
    } catch (error) {
      console.error('Failed to save feedback signals:', error);
    }
  }
  
  /**
   * Get all captured signals
   */
  getSignals() {
    return this.signals;
  }
  
  /**
   * Clear signals
   */
  clearSignals() {
    this.signals = [];
  }
  
  // Private helper methods
  
  _categorizeCorrection(correction) {
    const text = correction.toLowerCase();
    
    if (text.includes('format') || text.includes('table') || text.includes('bullet')) {
      return LEARNING_CATEGORIES.OUTPUT_FORMAT;
    } else if (text.includes('detail') || text.includes('depth') || text.includes('specific')) {
      return LEARNING_CATEGORIES.CONTENT_DEPTH;
    } else if (text.includes('direct') || text.includes('concise') || text.includes('tldr')) {
      return LEARNING_CATEGORIES.DIRECTNESS;
    } else if (text.includes('tone') || text.includes('style') || text.includes('formal')) {
      return LEARNING_CATEGORIES.COMMUNICATION_STYLE;
    } else if (text.includes('source') || text.includes('citation') || text.includes('reference')) {
      return LEARNING_CATEGORIES.SOURCE_VERIFICATION;
    }
    
    return LEARNING_CATEGORIES.OUTPUT_FORMAT; // Default
  }
  
  _categorizePreference(preference) {
    const text = preference.toLowerCase();
    
    if (text.includes('always') || text.includes('never')) {
      if (text.includes('search') || text.includes('memory') || text.includes('tool')) {
        return LEARNING_CATEGORIES.TOOL_PREFERENCES;
      }
    }
    
    if (text.includes('prefer') || text.includes('like')) {
      if (text.includes('format')) return LEARNING_CATEGORIES.OUTPUT_FORMAT;
      if (text.includes('style')) return LEARNING_CATEGORIES.COMMUNICATION_STYLE;
      if (text.includes('detail')) return LEARNING_CATEGORIES.CONTENT_DEPTH;
    }
    
    return LEARNING_CATEGORIES.OUTPUT_FORMAT; // Default
  }
  
  _categorizeFollowUp(followUp) {
    const text = followUp.toLowerCase();
    
    if (text.includes('more detail') || text.includes('explain')) {
      return LEARNING_CATEGORIES.CONTENT_DEPTH;
    } else if (text.includes('clearer') || text.includes('simpler')) {
      return LEARNING_CATEGORIES.DIRECTNESS;
    } else if (text.includes('source') || text.includes('where')) {
      return LEARNING_CATEGORIES.SOURCE_VERIFICATION;
    }
    
    return LEARNING_CATEGORIES.OUTPUT_FORMAT; // Default
  }
  
  _summarizeSignals() {
    const summary = this.signals.map(signal => {
      return `- **${signal.type}** (${signal.category}): ${signal.strength >= 0 ? '+' : ''}${signal.strength.toFixed(2)} strength\n  Context: ${JSON.stringify(signal.context, null, 2)}`;
    }).join('\n');
    
    return summary;
  }
  
  _getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

module.exports = {
  FeedbackCapture,
  FeedbackSignal,
  SIGNAL_TYPES,
  LEARNING_CATEGORIES
};
