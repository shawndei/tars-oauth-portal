/**
 * Confidence Scoring System
 * 
 * Calculates confidence scores for detected patterns based on:
 * - Number of occurrences
 * - Consistency factor
 * - Temporal validity
 * - Pattern type
 * 
 * Formula:
 * confidence = (occurrences / minimum_required) × consistency_factor × temporal_validity
 * 
 * @version 1.0.0
 */

class ConfidenceScorer {
  constructor() {
    this.minimumRequired = {
      'time-based': 7,      // 7 occurrences for 85%+ confidence
      'sequence': 4,        // 4 occurrences for 85%+ confidence
      'context': 3,         // 3 occurrences for 85%+ confidence
      'interest': 5         // 5 occurrences for 85%+ confidence
    };
    
    this.maxConfidence = 0.95; // Cap at 95% to acknowledge uncertainty
  }

  /**
   * Calculate overall confidence score for a pattern
   */
  calculateConfidence(pattern) {
    const occurrenceScore = this.calculateOccurrenceScore(pattern);
    const consistencyFactor = this.getConsistencyFactor(pattern);
    const temporalValidity = this.calculateTemporalValidity(pattern);
    
    const rawConfidence = occurrenceScore * consistencyFactor * temporalValidity;
    
    // Cap at maximum confidence
    return Math.min(rawConfidence, this.maxConfidence);
  }

  /**
   * Calculate score based on number of occurrences
   */
  calculateOccurrenceScore(pattern) {
    const minRequired = this.minimumRequired[pattern.type] || 5;
    const occurrences = pattern.occurrences || 0;
    
    // Linear scaling up to minimum required, then logarithmic
    if (occurrences < minRequired) {
      return occurrences / minRequired;
    }
    
    // Logarithmic scaling beyond minimum (diminishing returns)
    const excess = occurrences - minRequired;
    const logBonus = Math.log(1 + excess) / Math.log(10); // log base 10
    
    return Math.min(1.0 + (logBonus * 0.1), 1.2); // Max 120% of base
  }

  /**
   * Get consistency factor from pattern metadata
   */
  getConsistencyFactor(pattern) {
    if (!pattern.metadata) return 0.7; // Default moderate consistency
    
    switch (pattern.type) {
      case 'time-based':
        return pattern.metadata.consistencyFactor || 0.7;
      
      case 'sequence':
        // Sequence consistency based on how often the same sequence appears
        const uniqueProjects = new Set(pattern.metadata.projects || []).size;
        const totalOccurrences = pattern.occurrences;
        
        // Higher consistency if same sequence appears across multiple projects
        return Math.min(uniqueProjects / totalOccurrences + 0.5, 1.0);
      
      case 'context':
        return pattern.metadata.behaviorConsistency || 0.7;
      
      case 'interest':
        // Interest consistency based on frequency
        const freq = pattern.metadata.frequencyPerDay || 0;
        if (freq >= 3) return 1.0;  // High consistency: 3+ mentions per day
        if (freq >= 1) return 0.85; // Medium consistency: 1+ per day
        return 0.6;                 // Low consistency: less than daily
      
      default:
        return 0.7;
    }
  }

  /**
   * Calculate temporal validity (recent patterns score higher)
   */
  calculateTemporalValidity(pattern) {
    if (!pattern.metadata || !pattern.metadata.dates) {
      return 0.8; // Default if no date info
    }
    
    const dates = pattern.metadata.dates;
    const mostRecentDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    const now = new Date();
    
    // Calculate days since last occurrence
    const daysSinceLastOccurrence = Math.floor(
      (now.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Temporal validity decreases with time
    if (daysSinceLastOccurrence <= 1) return 1.0;   // Today or yesterday: full validity
    if (daysSinceLastOccurrence <= 3) return 0.95;  // Within 3 days: 95%
    if (daysSinceLastOccurrence <= 7) return 0.90;  // Within week: 90%
    if (daysSinceLastOccurrence <= 14) return 0.80; // Within 2 weeks: 80%
    
    return 0.70; // Older than 2 weeks: 70%
  }

  /**
   * Get confidence threshold for action
   */
  getActionThreshold(actionType) {
    const thresholds = {
      'execute': 0.85,    // Automatic execution
      'suggest': 0.60,    // Queue suggestion
      'monitor': 0.45,    // Continue monitoring
      'ignore': 0.30      // Below this, ignore pattern
    };
    
    return thresholds[actionType] || 0.60;
  }

  /**
   * Determine action category based on confidence
   */
  categorizeConfidence(confidence) {
    if (confidence >= 0.85) return 'execute';
    if (confidence >= 0.60) return 'suggest';
    if (confidence >= 0.45) return 'monitor';
    return 'ignore';
  }

  /**
   * Calculate confidence interval (estimate uncertainty)
   */
  calculateConfidenceInterval(pattern, confidence) {
    // More occurrences = narrower interval (more certainty)
    const occurrences = pattern.occurrences || 1;
    const baseMargin = 0.15; // ±15% base margin
    
    // Margin decreases with more data
    const margin = baseMargin / Math.sqrt(occurrences);
    
    return {
      lower: Math.max(0, confidence - margin),
      upper: Math.min(1, confidence + margin),
      margin: margin
    };
  }

  /**
   * Predict future confidence trajectory
   */
  predictConfidenceTrend(pattern, currentConfidence) {
    const occurrences = pattern.occurrences || 0;
    const minRequired = this.minimumRequired[pattern.type] || 5;
    
    if (occurrences >= minRequired) {
      return {
        trend: 'stable',
        expectedDaysTo85: 0,
        message: 'Pattern is stable or declining'
      };
    }
    
    // Calculate how many more occurrences needed
    const needed = minRequired - occurrences;
    
    // Estimate based on current frequency
    const totalDays = pattern.totalDays || 1;
    const occurrencesPerDay = occurrences / totalDays;
    
    const expectedDaysTo85 = Math.ceil(needed / Math.max(occurrencesPerDay, 0.5));
    
    return {
      trend: 'rising',
      expectedDaysTo85: expectedDaysTo85,
      neededOccurrences: needed,
      message: `Need ${needed} more occurrences (est. ${expectedDaysTo85} days)`
    };
  }

  /**
   * Generate confidence report for pattern
   */
  generateConfidenceReport(pattern, confidence) {
    const category = this.categorizeConfidence(confidence);
    const interval = this.calculateConfidenceInterval(pattern, confidence);
    const trend = this.predictConfidenceTrend(pattern, confidence);
    
    return {
      confidence: confidence,
      confidencePercent: `${Math.round(confidence * 100)}%`,
      category: category,
      interval: {
        lower: `${Math.round(interval.lower * 100)}%`,
        upper: `${Math.round(interval.upper * 100)}%`,
        margin: `±${Math.round(interval.margin * 100)}%`
      },
      trend: trend,
      breakdown: {
        occurrenceScore: this.calculateOccurrenceScore(pattern),
        consistencyFactor: this.getConsistencyFactor(pattern),
        temporalValidity: this.calculateTemporalValidity(pattern)
      }
    };
  }

  /**
   * Compare two patterns and determine which is more reliable
   */
  comparePatterns(pattern1, confidence1, pattern2, confidence2) {
    // If confidence differs by >10%, use that
    if (Math.abs(confidence1 - confidence2) > 0.1) {
      return confidence1 > confidence2 ? pattern1 : pattern2;
    }
    
    // If confidence is similar, prefer:
    // 1. More occurrences
    if (pattern1.occurrences !== pattern2.occurrences) {
      return pattern1.occurrences > pattern2.occurrences ? pattern1 : pattern2;
    }
    
    // 2. More recent
    const days1 = this.calculateTemporalValidity(pattern1);
    const days2 = this.calculateTemporalValidity(pattern2);
    
    return days1 > days2 ? pattern1 : pattern2;
  }

  /**
   * Adjust confidence based on user feedback
   */
  adjustConfidenceFromFeedback(pattern, feedback) {
    // Feedback types: 'correct', 'incorrect', 'premature', 'useful', 'annoying'
    
    const adjustments = {
      'correct': 1.1,      // Boost confidence by 10%
      'useful': 1.05,      // Boost confidence by 5%
      'incorrect': 0.7,    // Reduce confidence by 30%
      'premature': 0.85,   // Reduce confidence by 15%
      'annoying': 0.8      // Reduce confidence by 20%
    };
    
    const multiplier = adjustments[feedback] || 1.0;
    const currentConfidence = this.calculateConfidence(pattern);
    const adjustedConfidence = Math.min(currentConfidence * multiplier, this.maxConfidence);
    
    return {
      before: currentConfidence,
      after: adjustedConfidence,
      change: adjustedConfidence - currentConfidence,
      feedback: feedback
    };
  }

  /**
   * Calculate overall system confidence (average of all patterns)
   */
  calculateSystemConfidence(patterns) {
    if (!patterns || patterns.length === 0) {
      return {
        average: 0,
        median: 0,
        high: 0,
        medium: 0,
        low: 0
      };
    }
    
    const confidences = patterns.map(p => this.calculateConfidence(p));
    const sorted = [...confidences].sort((a, b) => a - b);
    
    const average = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const high = confidences.filter(c => c >= 0.85).length;
    const medium = confidences.filter(c => c >= 0.60 && c < 0.85).length;
    const low = confidences.filter(c => c < 0.60).length;
    
    return {
      average: average,
      median: median,
      high: high,
      medium: medium,
      low: low,
      total: patterns.length
    };
  }
}

module.exports = ConfidenceScorer;
