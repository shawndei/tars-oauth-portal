/**
 * Proactive Intelligence System
 * 
 * Main orchestrator for pattern detection, confidence scoring, and proactive action execution.
 * Integrates with heartbeat system to monitor memory files and detect user behavior patterns.
 * 
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const PatternDetectors = require('./pattern-detectors');
const ConfidenceScorer = require('./confidence-scorer');

class ProactiveIntelligence {
  constructor(workspaceRoot = process.env.OPENCLAW_WORKSPACE || process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.patternsFile = path.join(workspaceRoot, 'proactive-patterns.json');
    this.memoryDir = path.join(workspaceRoot, 'memory');
    this.detectors = new PatternDetectors();
    this.scorer = new ConfidenceScorer();
    this.patterns = null;
  }

  /**
   * Main heartbeat entry point
   * Called every 15 minutes from HEARTBEAT.md
   */
  async runHeartbeatCheck() {
    try {
      await this.loadPatterns();
      
      // Get memory files from last 7 days
      const memoryFiles = await this.getRecentMemoryFiles(7);
      
      // Run all pattern detectors
      const detectedPatterns = await this.detectPatterns(memoryFiles);
      
      // Update confidence scores
      this.updateConfidenceScores(detectedPatterns);
      
      // Determine actions to take
      const actions = this.determineActions();
      
      // Save updated patterns
      await this.savePatterns();
      
      return {
        patternsDetected: detectedPatterns.length,
        highConfidence: this.patterns.patterns.filter(p => p.confidence >= 0.85).length,
        mediumConfidence: this.patterns.patterns.filter(p => p.confidence >= 0.60 && p.confidence < 0.85).length,
        actions: actions
      };
    } catch (error) {
      console.error('Proactive Intelligence heartbeat error:', error);
      return { error: error.message };
    }
  }

  /**
   * Load existing patterns from JSON file
   */
  async loadPatterns() {
    try {
      const data = await fs.readFile(this.patternsFile, 'utf8');
      this.patterns = JSON.parse(data);
    } catch (error) {
      // Initialize new patterns file if it doesn't exist
      this.patterns = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        patterns: []
      };
    }
  }

  /**
   * Save patterns back to JSON file
   */
  async savePatterns() {
    this.patterns.lastUpdated = new Date().toISOString();
    await fs.writeFile(
      this.patternsFile,
      JSON.stringify(this.patterns, null, 2),
      'utf8'
    );
  }

  /**
   * Get memory files from last N days
   */
  async getRecentMemoryFiles(days = 7) {
    const files = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const filePath = path.join(this.memoryDir, `${dateStr}.md`);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        files.push({
          date: dateStr,
          path: filePath,
          content: content
        });
      } catch (error) {
        // File doesn't exist for this day, skip
        continue;
      }
    }
    
    return files;
  }

  /**
   * Run all pattern detection algorithms
   */
  async detectPatterns(memoryFiles) {
    const allPatterns = [];
    
    // 1. Time-based patterns
    const timePatterns = this.detectors.detectTimePatterns(memoryFiles);
    allPatterns.push(...timePatterns);
    
    // 2. Sequence patterns
    const sequencePatterns = this.detectors.detectSequencePatterns(memoryFiles);
    allPatterns.push(...sequencePatterns);
    
    // 3. Context patterns
    const contextPatterns = this.detectors.detectContextPatterns(memoryFiles);
    allPatterns.push(...contextPatterns);
    
    // 4. Interest patterns
    const interestPatterns = this.detectors.detectInterestPatterns(memoryFiles);
    allPatterns.push(...interestPatterns);
    
    return allPatterns;
  }

  /**
   * Update confidence scores for detected patterns
   */
  updateConfidenceScores(detectedPatterns) {
    for (const detected of detectedPatterns) {
      const existing = this.patterns.patterns.find(p => p.id === detected.id);
      
      if (existing) {
        // Update existing pattern
        existing.occurrences = detected.occurrences;
        existing.totalDays = detected.totalDays;
        existing.lastSeen = new Date().toISOString();
        existing.confidence = this.scorer.calculateConfidence(detected);
        
        // Merge metadata
        if (detected.metadata) {
          existing.metadata = { ...existing.metadata, ...detected.metadata };
        }
      } else {
        // Add new pattern
        detected.confidence = this.scorer.calculateConfidence(detected);
        detected.lastSeen = new Date().toISOString();
        detected.actionEnabled = true; // Default enabled
        this.patterns.patterns.push(detected);
      }
    }
    
    // Clean up old patterns (not seen in 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    this.patterns.patterns = this.patterns.patterns.filter(p => {
      const lastSeen = new Date(p.lastSeen);
      return lastSeen >= fourteenDaysAgo;
    });
  }

  /**
   * Determine what actions to take based on confidence levels
   */
  determineActions() {
    const actions = {
      execute: [],    // >85% confidence - execute automatically
      suggest: [],    // 60-85% confidence - queue suggestion
      monitor: []     // 45-60% confidence - continue monitoring
    };
    
    const now = new Date();
    
    for (const pattern of this.patterns.patterns) {
      if (!pattern.actionEnabled) continue;
      
      if (pattern.confidence >= 0.85) {
        // Check if it's time to execute
        if (this.shouldExecuteNow(pattern, now)) {
          actions.execute.push({
            id: pattern.id,
            type: pattern.type,
            action: pattern.action,
            confidence: pattern.confidence
          });
        }
      } else if (pattern.confidence >= 0.60) {
        actions.suggest.push({
          id: pattern.id,
          type: pattern.type,
          action: pattern.action,
          confidence: pattern.confidence
        });
      } else if (pattern.confidence >= 0.45) {
        actions.monitor.push({
          id: pattern.id,
          type: pattern.type,
          confidence: pattern.confidence
        });
      }
    }
    
    return actions;
  }

  /**
   * Check if a pattern should execute now
   */
  shouldExecuteNow(pattern, now) {
    // For time-based patterns, check if we're within the execution window
    if (pattern.type === 'time-based' && pattern.metadata?.meanTime) {
      const meanTime = pattern.metadata.meanTime; // Format: "HH:MM"
      const [hour, minute] = meanTime.split(':').map(Number);
      
      // Execute 10 minutes before expected time
      const targetHour = hour;
      const targetMinute = minute - 10;
      
      const nowHour = now.getHours();
      const nowMinute = now.getMinutes();
      
      // Check if we're within ±5 minutes of target time
      const targetTotalMinutes = targetHour * 60 + targetMinute;
      const nowTotalMinutes = nowHour * 60 + nowMinute;
      
      return Math.abs(nowTotalMinutes - targetTotalMinutes) <= 5;
    }
    
    // For sequence patterns, check if the trigger condition is met
    if (pattern.type === 'sequence' && pattern.metadata?.lastStepCompleted) {
      return true; // Would need to check actual step completion in real implementation
    }
    
    // For context patterns, check if the context is active
    if (pattern.type === 'context' && pattern.metadata?.contextActive) {
      return true;
    }
    
    return false;
  }

  /**
   * Get current status for reporting
   */
  async getStatus() {
    await this.loadPatterns();
    
    const stats = {
      totalPatterns: this.patterns.patterns.length,
      byType: {},
      byConfidence: {
        high: 0,    // >85%
        medium: 0,  // 60-85%
        low: 0      // <60%
      }
    };
    
    for (const pattern of this.patterns.patterns) {
      // Count by type
      stats.byType[pattern.type] = (stats.byType[pattern.type] || 0) + 1;
      
      // Count by confidence
      if (pattern.confidence >= 0.85) {
        stats.byConfidence.high++;
      } else if (pattern.confidence >= 0.60) {
        stats.byConfidence.medium++;
      } else {
        stats.byConfidence.low++;
      }
    }
    
    return stats;
  }

  /**
   * Disable a specific pattern
   */
  async disablePattern(patternId) {
    await this.loadPatterns();
    const pattern = this.patterns.patterns.find(p => p.id === patternId);
    if (pattern) {
      pattern.actionEnabled = false;
      await this.savePatterns();
      return true;
    }
    return false;
  }

  /**
   * Enable a specific pattern
   */
  async enablePattern(patternId) {
    await this.loadPatterns();
    const pattern = this.patterns.patterns.find(p => p.id === patternId);
    if (pattern) {
      pattern.actionEnabled = true;
      await this.savePatterns();
      return true;
    }
    return false;
  }
}

module.exports = ProactiveIntelligence;

// CLI interface for testing
if (require.main === module) {
  const pi = new ProactiveIntelligence();
  
  const command = process.argv[2];
  
  if (command === 'heartbeat') {
    pi.runHeartbeatCheck().then(result => {
      console.log(JSON.stringify(result, null, 2));
    });
  } else if (command === 'status') {
    pi.getStatus().then(status => {
      console.log(JSON.stringify(status, null, 2));
    });
  } else if (command === 'disable' && process.argv[3]) {
    pi.disablePattern(process.argv[3]).then(success => {
      console.log(success ? 'Pattern disabled' : 'Pattern not found');
    });
  } else if (command === 'enable' && process.argv[3]) {
    pi.enablePattern(process.argv[3]).then(success => {
      console.log(success ? 'Pattern enabled' : 'Pattern not found');
    });
  } else {
    console.log('Usage: node proactive-intelligence.js [heartbeat|status|disable <id>|enable <id>]');
  }
}
