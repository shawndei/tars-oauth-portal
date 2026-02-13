/**
 * Episodic Memory Integration
 * Integrates continuous learning with episodic memory system
 */

const fs = require('fs');
const path = require('path');

/**
 * Episodic memory integration class
 */
class EpisodicIntegration {
  constructor(workspacePath) {
    this.workspacePath = workspacePath;
    this.memoryPath = path.join(workspacePath, 'memory');
    this.learningPath = path.join(workspacePath, 'skills', 'continuous-learning');
  }
  
  /**
   * Scan recent episodic memory for feedback signals
   */
  async scanRecentMemory(daysBack = 3) {
    const signals = [];
    
    for (let i = 0; i < daysBack; i++) {
      const date = this._getDateOffset(i);
      const memoryFile = path.join(this.memoryPath, `${date}.md`);
      
      try {
        const content = await fs.promises.readFile(memoryFile, 'utf8');
        const extracted = this._extractFeedbackSignals(content, date);
        signals.push(...extracted);
      } catch (error) {
        // File doesn't exist, skip
        continue;
      }
    }
    
    return signals;
  }
  
  /**
   * Store learning adaptation in episodic memory
   */
  async logAdaptationToMemory(adaptation) {
    const date = this._getTodayDate();
    const memoryFile = path.join(this.memoryPath, `${date}.md`);
    
    const entry = `
## Learning Adaptation (${new Date().toISOString()})

**Category:** ${adaptation.category}
**Confidence:** ${(adaptation.confidence * 100).toFixed(1)}%
**Threshold:** ${adaptation.threshold}

**Preference:**
${JSON.stringify(adaptation.preference, null, 2)}

**Evidence:**
- Total observations: ${adaptation.preference.observations?.total || 0}
- Positive signals: ${adaptation.preference.observations?.positive || 0}
- Negative signals: ${adaptation.preference.observations?.negative || 0}

---
`;
    
    try {
      await fs.promises.appendFile(memoryFile, entry);
    } catch (error) {
      console.error('Failed to log adaptation to memory:', error);
    }
  }
  
  /**
   * Update MEMORY.md with learned pattern
   */
  async updateLongTermMemory(adaptation) {
    const memoryFile = path.join(this.workspacePath, 'MEMORY.md');
    
    try {
      let content;
      try {
        content = await fs.promises.readFile(memoryFile, 'utf8');
      } catch (error) {
        // File doesn't exist, create it
        content = '# Long-Term Memory\n\n';
      }
      
      // Check if Learning section exists
      const learningSectionMatch = content.match(/## Learned Preferences\s*/);
      
      const entry = `
### ${this._getCategoryName(adaptation.category)} (${(adaptation.confidence * 100).toFixed(0)}% confidence)
- **Learned:** ${adaptation.preference.description}
- **Evidence:** ${adaptation.preference.observations?.total || 0} observations
- **Last updated:** ${new Date().toISOString().split('T')[0]}
`;
      
      if (learningSectionMatch) {
        // Add to existing section
        const insertPos = learningSectionMatch.index + learningSectionMatch[0].length;
        content = content.slice(0, insertPos) + entry + content.slice(insertPos);
      } else {
        // Create new section at end
        content += `\n\n## Learned Preferences\n${entry}`;
      }
      
      await fs.promises.writeFile(memoryFile, content);
    } catch (error) {
      console.error('Failed to update MEMORY.md:', error);
    }
  }
  
  /**
   * Extract patterns from conversation history
   */
  async extractConversationPatterns(sessionHistory) {
    const patterns = {
      corrections: [],
      preferences: [],
      reactions: [],
      followUps: []
    };
    
    for (const message of sessionHistory) {
      // Detect corrections
      if (this._isCorrection(message.content)) {
        patterns.corrections.push({
          message: message.content,
          timestamp: message.timestamp,
          context: message.context
        });
      }
      
      // Detect preference statements
      if (this._isPreferenceStatement(message.content)) {
        patterns.preferences.push({
          message: message.content,
          timestamp: message.timestamp
        });
      }
      
      // Detect follow-up requests
      if (this._isFollowUpRequest(message.content, sessionHistory)) {
        patterns.followUps.push({
          message: message.content,
          timestamp: message.timestamp
        });
      }
    }
    
    return patterns;
  }
  
  /**
   * Store pattern in learning log
   */
  async storeLearningLog(pattern, category, confidence) {
    const logFile = path.join(this.learningPath, 'LEARNING_LOG.md');
    
    const entry = `
### ${new Date().toISOString()}
**Category:** ${category}
**Confidence:** ${(confidence * 100).toFixed(1)}%
**Pattern:** ${JSON.stringify(pattern, null, 2)}

---
`;
    
    try {
      await fs.promises.appendFile(logFile, entry);
    } catch (error) {
      console.error('Failed to store learning log:', error);
    }
  }
  
  // Private helper methods
  
  _extractFeedbackSignals(content, date) {
    const signals = [];
    
    // Extract explicit corrections (lines with "actually", "correction", "I meant")
    const correctionPatterns = [
      /actually,?\s+(.*)/gi,
      /correction:?\s+(.*)/gi,
      /i meant\s+(.*)/gi,
      /no,?\s+i mean\s+(.*)/gi
    ];
    
    for (const pattern of correctionPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        signals.push({
          type: 'EXPLICIT_CORRECTION',
          content: match[1],
          date: date,
          source: 'episodic_memory'
        });
      }
    }
    
    // Extract preference statements
    const preferencePatterns = [
      /i prefer\s+(.*)/gi,
      /always\s+(.*)/gi,
      /never\s+(.*)/gi,
      /i like\s+(.*)/gi
    ];
    
    for (const pattern of preferencePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        signals.push({
          type: 'EXPLICIT_PREFERENCE',
          content: match[1],
          date: date,
          source: 'episodic_memory'
        });
      }
    }
    
    // Extract follow-up patterns
    if (content.includes('more detail') || content.includes('explain')) {
      signals.push({
        type: 'FOLLOW_UP_REQUEST',
        content: 'Request for more detail',
        date: date,
        source: 'episodic_memory'
      });
    }
    
    return signals;
  }
  
  _isCorrection(content) {
    const correctionWords = ['actually', 'correction', 'i meant', 'no, i mean'];
    const lower = content.toLowerCase();
    return correctionWords.some(word => lower.includes(word));
  }
  
  _isPreferenceStatement(content) {
    const preferenceWords = ['i prefer', 'always', 'never', 'i like', 'please'];
    const lower = content.toLowerCase();
    return preferenceWords.some(word => lower.includes(word));
  }
  
  _isFollowUpRequest(content, history) {
    const followUpPhrases = ['more detail', 'explain', 'clarify', 'what do you mean'];
    const lower = content.toLowerCase();
    return followUpPhrases.some(phrase => lower.includes(phrase));
  }
  
  _getCategoryName(category) {
    const names = {
      outputFormat: 'Output Format',
      communicationStyle: 'Communication Style',
      directness: 'Directness Level',
      toolPreferences: 'Tool Preferences',
      timingProactivity: 'Timing & Proactivity',
      confidenceSignaling: 'Confidence Signaling',
      specificity: 'Specificity & Precision',
      sourceVerification: 'Source Verification',
      contentDepth: 'Content Depth',
      autonomy: 'Autonomy Level'
    };
    return names[category] || category;
  }
  
  _getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  _getDateOffset(daysBack) {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

module.exports = { EpisodicIntegration };
