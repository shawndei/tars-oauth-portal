/**
 * Predictive Task Scheduling Engine
 * Analyzes patterns and predicts optimal execution times
 */

const fs = require('fs').promises;
const path = require('path');

class PredictiveScheduler {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.env.OPENCLAW_WORKSPACE || './';
    this.analysisWindow = options.analysisWindow || 30; // days
    this.minOccurrences = options.minOccurrences || 3;
    this.confidenceThreshold = options.confidenceThreshold || 0.8;
  }

  /**
   * Analyze patterns and generate predictions
   */
  async analyzePatternsAndPredict() {
    console.log('[Predictive Scheduler] Analyzing patterns from last 30 days...');
    
    // Load memory files
    const activities = await this.loadRecentActivities();
    
    // Extract patterns
    const patterns = this.extractPatterns(activities);
    
    // Generate predictions
    const predictions = this.generatePredictions(patterns);
    
    // Save predictions
    await this.savePredictions(predictions);
    
    return predictions;
  }

  /**
   * Load activities from recent memory files
   */
  async loadRecentActivities() {
    const activities = [];
    const today = new Date();
    
    for (let i = 0; i < this.analysisWindow; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const memoryPath = path.join(this.workspaceRoot, 'memory', `${dateStr}.md`);
        const content = await fs.readFile(memoryPath, 'utf-8');
        
        // Parse activities from memory file
        const parsed = this.parseActivities(content, dateStr);
        activities.push(...parsed);
        
      } catch (error) {
        // File doesn't exist, skip
        continue;
      }
    }
    
    return activities;
  }

  /**
   * Parse activities from memory content
   */
  parseActivities(content, dateStr) {
    const activities = [];
    
    // Extract timestamps and activities (simplified parser)
    // In production, this would be more sophisticated
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Look for timestamp patterns (HH:MM format)
      const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
      if (!timeMatch) continue;
      
      const [, hour, minute] = timeMatch;
      const timestamp = `${dateStr}T${hour.padStart(2, '0')}:${minute}:00`;
      
      // Extract activity description
      const description = line.replace(timeMatch[0], '').trim();
      
      if (description.length > 10) {
        activities.push({
          timestamp: new Date(timestamp),
          description,
          date: dateStr,
          hour: parseInt(hour),
          minute: parseInt(minute),
          dayOfWeek: new Date(timestamp).getDay()
        });
      }
    }
    
    return activities;
  }

  /**
   * Extract recurring patterns from activities
   */
  extractPatterns(activities) {
    const patterns = new Map();
    
    // Group by activity type
    for (const activity of activities) {
      const type = this.classifyActivity(activity.description);
      
      if (!patterns.has(type)) {
        patterns.set(type, []);
      }
      
      patterns.get(type).push(activity);
    }
    
    // Analyze each pattern type
    const analyzed = [];
    
    for (const [type, instances] of patterns) {
      if (instances.length < this.minOccurrences) continue;
      
      // Calculate timing statistics
      const timings = instances.map(i => ({ hour: i.hour, minute: i.minute, dayOfWeek: i.dayOfWeek }));
      const stats = this.calculateTimingStats(timings);
      
      analyzed.push({
        type,
        occurrences: instances.length,
        instances,
        timingStats: stats,
        confidence: this.calculateConfidence(instances, stats)
      });
    }
    
    return analyzed;
  }

  /**
   * Classify activity into type categories
   */
  classifyActivity(description) {
    const lower = description.toLowerCase();
    
    if (lower.includes('email')) return 'email-check';
    if (lower.includes('meeting') || lower.includes('calendar')) return 'meeting-prep';
    if (lower.includes('market') || lower.includes('stock')) return 'market-update';
    if (lower.includes('research')) return 'research';
    if (lower.includes('summary') || lower.includes('review')) return 'daily-review';
    
    return 'general';
  }

  /**
   * Calculate timing statistics for pattern
   */
  calculateTimingStats(timings) {
    // Average time
    const avgHour = Math.round(timings.reduce((sum, t) => sum + t.hour, 0) / timings.length);
    const avgMinute = Math.round(timings.reduce((sum, t) => sum + t.minute, 0) / timings.length);
    
    // Time variance (standard deviation)
    const hourVariance = this.calculateVariance(timings.map(t => t.hour));
    const minuteVariance = this.calculateVariance(timings.map(t => t.minute));
    
    // Day of week distribution
    const dayDistribution = {};
    timings.forEach(t => {
      dayDistribution[t.dayOfWeek] = (dayDistribution[t.dayOfWeek] || 0) + 1;
    });
    
    // Most common days
    const commonDays = Object.entries(dayDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([day]) => parseInt(day));
    
    return {
      avgHour,
      avgMinute,
      hourVariance,
      minuteVariance,
      dayDistribution,
      commonDays,
      isWeekdayPattern: commonDays.every(d => d >= 1 && d <= 5)
    };
  }

  /**
   * Calculate variance
   */
  calculateVariance(values) {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length);
  }

  /**
   * Calculate confidence score (0-1)
   */
  calculateConfidence(instances, stats) {
    let confidence = 0;
    
    // Frequency factor (more occurrences = higher confidence)
    const frequencyScore = Math.min(instances.length / 10, 1) * 0.4;
    
    // Consistency factor (low variance = higher confidence)
    const hourConsistency = Math.max(0, 1 - (stats.hourVariance / 12)) * 0.3;
    const minuteConsistency = Math.max(0, 1 - (stats.minuteVariance / 30)) * 0.2;
    
    // Recency factor (recent patterns = higher confidence)
    const mostRecent = instances[instances.length - 1].timestamp;
    const daysSinceRecent = (Date.now() - mostRecent) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (daysSinceRecent / 30)) * 0.1;
    
    confidence = frequencyScore + hourConsistency + minuteConsistency + recencyScore;
    
    return Math.min(confidence, 1);
  }

  /**
   * Generate predictions from patterns
   */
  generatePredictions(patterns) {
    const predictions = [];
    
    for (const pattern of patterns) {
      if (pattern.confidence < 0.5) continue; // Skip low confidence
      
      const prediction = {
        id: `pred-${Date.now()}-${pattern.type}`,
        pattern: pattern.type,
        occurrences: pattern.occurrences,
        confidence: pattern.confidence,
        schedule: this.generateSchedule(pattern.timingStats),
        action: this.suggestAction(pattern.type),
        autoSchedule: pattern.confidence >= this.confidenceThreshold,
        metadata: {
          avgTime: `${pattern.timingStats.avgHour}:${pattern.timingStats.avgMinute.toString().padStart(2, '0')}`,
          dayPattern: pattern.timingStats.isWeekdayPattern ? 'weekdays' : 'varies',
          lastOccurrence: pattern.instances[pattern.instances.length - 1].timestamp
        }
      };
      
      predictions.push(prediction);
    }
    
    // Sort by confidence (highest first)
    predictions.sort((a, b) => b.confidence - a.confidence);
    
    return predictions;
  }

  /**
   * Generate cron schedule from timing stats
   */
  generateSchedule(stats) {
    const { avgHour, avgMinute, isWeekdayPattern } = stats;
    
    // Cron format: minute hour day month dayOfWeek
    const minute = avgMinute;
    const hour = avgHour;
    const dayOfWeek = isWeekdayPattern ? '1-5' : '*';
    
    return {
      cron: `${minute} ${hour} * * ${dayOfWeek}`,
      readable: `${hour}:${minute.toString().padStart(2, '0')} ${isWeekdayPattern ? 'Mon-Fri' : 'daily'}`
    };
  }

  /**
   * Suggest action based on pattern type
   */
  suggestAction(type) {
    const actions = {
      'email-check': 'Fetch unread emails and create summary',
      'meeting-prep': 'Prepare meeting notes for upcoming calendar events',
      'market-update': 'Fetch latest market trends and portfolio updates',
      'research': 'Suggest topics for deep research based on recent interests',
      'daily-review': 'Generate end-of-day summary with accomplishments and pending tasks',
      'general': 'Review and suggest proactive actions'
    };
    
    return actions[type] || actions.general;
  }

  /**
   * Schedule a task via cron system
   */
  async scheduleTask(prediction) {
    // In production, this would call OpenClaw's cron tool
    console.log(`[Predictive Scheduler] Scheduling task: ${prediction.pattern}`);
    console.log(`  Schedule: ${prediction.schedule.readable}`);
    console.log(`  Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
    
    const cronJob = {
      name: `Predicted: ${prediction.pattern}`,
      sessionTarget: 'isolated',
      schedule: {
        kind: 'cron',
        expr: prediction.schedule.cron,
        tz: 'America/Mazatlan'
      },
      payload: {
        kind: 'agentTurn',
        message: prediction.action
      },
      delivery: {
        mode: 'announce'
      },
      metadata: {
        predictedBy: 'pattern-analyzer',
        confidence: prediction.confidence,
        pattern: prediction.pattern,
        predictionId: prediction.id
      }
    };
    
    // Return job definition for cron system
    return cronJob;
  }

  /**
   * Save predictions to file
   */
  async savePredictions(predictions) {
    const filepath = path.join(this.workspaceRoot, 'predictions.json');
    
    try {
      await fs.writeFile(
        filepath,
        JSON.stringify({
          generated: new Date().toISOString(),
          predictions
        }, null, 2),
        'utf-8'
      );
      console.log(`[Predictive Scheduler] Saved ${predictions.length} predictions`);
    } catch (error) {
      console.error('[Predictive Scheduler] Failed to save predictions:', error.message);
    }
  }
}

module.exports = PredictiveScheduler;
