/**
 * Pattern Detection Algorithms
 * 
 * Implements 4 types of pattern detection:
 * 1. Time-based patterns (activities at consistent times)
 * 2. Sequence patterns (predictable task order)
 * 3. Context patterns (event-triggered behaviors)
 * 4. Interest patterns (recurring topics/interests)
 * 
 * @version 1.0.0
 */

class PatternDetectors {
  constructor() {
    this.minimumOccurrences = {
      'time-based': 3,
      'sequence': 2,
      'context': 2,
      'interest': 3
    };
  }

  /**
   * 1. Time-Based Pattern Detector
   * Identifies activities that happen at consistent times
   */
  detectTimePatterns(memoryFiles) {
    const patterns = [];
    const activities = {};
    
    for (const file of memoryFiles) {
      const timestampedActivities = this.extractTimestampedActivities(file);
      
      for (const activity of timestampedActivities) {
        const key = activity.type;
        
        if (!activities[key]) {
          activities[key] = [];
        }
        
        activities[key].push({
          timestamp: activity.timestamp,
          date: file.date,
          time: activity.time
        });
      }
    }
    
    // Analyze each activity type
    for (const [activityType, occurrences] of Object.entries(activities)) {
      // Return all patterns found, even those below minimum
      // Confidence scorer will handle filtering by threshold
      if (occurrences.length < 2) {
        continue; // Skip single occurrences
      }
      
      // Calculate mean time and variance
      const times = occurrences.map(o => this.timeToMinutes(o.time));
      const meanTime = this.calculateMean(times);
      const variance = this.calculateStdDev(times);
      const consistencyFactor = this.calculateConsistency(variance);
      
      // Calculate days span
      const dates = [...new Set(occurrences.map(o => o.date))];
      const totalDays = dates.length;
      
      patterns.push({
        id: `time_${activityType.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'time-based',
        action: activityType,
        occurrences: occurrences.length,
        totalDays: totalDays,
        metadata: {
          meanTime: this.minutesToTime(meanTime),
          variance: variance,
          consistencyFactor: consistencyFactor,
          dates: dates
        }
      });
    }
    
    return patterns;
  }

  /**
   * 2. Sequence Pattern Detector
   * Identifies tasks that follow each other in predictable order
   */
  detectSequencePatterns(memoryFiles) {
    const patterns = [];
    const sequences = [];
    
    for (const file of memoryFiles) {
      const projects = this.extractProjects(file);
      
      for (const project of projects) {
        const sequence = this.extractProjectSequence(project);
        
        if (sequence.length >= 2) {
          sequences.push({
            sequence: sequence,
            date: file.date,
            project: project.name
          });
        }
      }
    }
    
    // Find repeated sequences
    const sequenceCounts = this.countSequences(sequences);
    
    for (const [seqKey, occurrences] of Object.entries(sequenceCounts)) {
      // Return all repeated sequences, even those below minimum for 85% confidence
      if (occurrences.length < 2) {
        continue; // Skip unique sequences
      }
      
      const dates = [...new Set(occurrences.map(o => o.date))];
      const totalDays = dates.length;
      
      patterns.push({
        id: `sequence_${this.hashSequence(seqKey)}`,
        type: 'sequence',
        action: seqKey,
        occurrences: occurrences.length,
        totalDays: totalDays,
        metadata: {
          steps: seqKey.split('→'),
          projects: occurrences.map(o => o.project),
          dates: dates
        }
      });
    }
    
    return patterns;
  }

  /**
   * 3. Context Pattern Detector
   * Identifies activities triggered by external events/context
   */
  detectContextPatterns(memoryFiles) {
    const patterns = [];
    const contextTriggers = {};
    
    for (const file of memoryFiles) {
      const events = this.extractContextEvents(file);
      
      for (const event of events) {
        const key = event.contextType;
        
        if (!contextTriggers[key]) {
          contextTriggers[key] = [];
        }
        
        contextTriggers[key].push({
          trigger: event.trigger,
          response: event.response,
          date: file.date,
          timestamp: event.timestamp
        });
      }
    }
    
    // Analyze each context type
    for (const [contextType, occurrences] of Object.entries(contextTriggers)) {
      // Return all context patterns found, even single occurrences
      if (occurrences.length < 1) {
        continue;
      }
      
      // Calculate behavior consistency
      const behaviorConsistency = this.calculateBehaviorConsistency(occurrences);
      const dates = [...new Set(occurrences.map(o => o.date))];
      const totalDays = dates.length;
      
      patterns.push({
        id: `context_${contextType.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'context',
        action: contextType,
        occurrences: occurrences.length,
        totalDays: totalDays,
        metadata: {
          trigger: occurrences[0].trigger,
          responsePattern: this.summarizeResponses(occurrences),
          behaviorConsistency: behaviorConsistency,
          dates: dates
        }
      });
    }
    
    return patterns;
  }

  /**
   * 4. Interest Pattern Detector
   * Identifies topics user repeatedly asks about or is interested in
   */
  detectInterestPatterns(memoryFiles) {
    const patterns = [];
    const topics = {};
    
    for (const file of memoryFiles) {
      const messages = this.extractMessages(file);
      
      for (const message of messages) {
        const extractedTopics = this.extractTopics(message);
        
        for (const topic of extractedTopics) {
          if (!topics[topic]) {
            topics[topic] = [];
          }
          
          topics[topic].push({
            date: file.date,
            context: message.context
          });
        }
      }
    }
    
    // Analyze each topic
    for (const [topic, mentions] of Object.entries(topics)) {
      const totalDays = memoryFiles.length;
      const frequencyPerDay = mentions.length / totalDays;
      
      if (mentions.length < this.minimumOccurrences['interest']) {
        continue;
      }
      
      const dates = [...new Set(mentions.map(m => m.date))];
      
      patterns.push({
        id: `interest_${topic.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'interest',
        action: topic,
        occurrences: mentions.length,
        totalDays: dates.length,
        metadata: {
          frequencyPerDay: frequencyPerDay,
          contexts: mentions.map(m => m.context),
          dates: dates
        }
      });
    }
    
    return patterns;
  }

  // ========== Helper Methods ==========

  /**
   * Extract timestamped activities from memory file
   */
  extractTimestampedActivities(file) {
    const activities = [];
    const lines = file.content.split('\n');
    
    // Pattern: [HH:MM] Activity description
    const timePattern = /\[(\d{2}:\d{2})\]\s+(.+)/;
    
    // Pattern: ## HH:MM - Activity
    const headerTimePattern = /##\s+(\d{1,2}:\d{2})\s+-\s+(.+)/;
    
    for (const line of lines) {
      let match = line.match(timePattern);
      let time, description;
      
      if (!match) {
        match = line.match(headerTimePattern);
      }
      
      if (match) {
        [, time, description] = match;
        
        // Normalize time format (add leading zero if needed)
        if (time.length === 4) {
          time = '0' + time; // 9:30 -> 09:30
        }
        
        // Classify activity type
        const activityType = this.classifyActivity(description);
        
        activities.push({
          time: time,
          timestamp: new Date(`${file.date}T${time}`).getTime(),
          type: activityType,
          description: description.trim()
        });
      }
    }
    
    return activities;
  }

  /**
   * Classify activity type from description
   */
  classifyActivity(description) {
    const lower = description.toLowerCase();
    
    if (lower.includes('status') && (lower.includes('report') || lower.includes('summary'))) {
      return 'status_reporting';
    } else if (lower.includes('email') || lower.includes('inbox')) {
      return 'email_check';
    } else if (lower.includes('calendar') || lower.includes('meeting')) {
      return 'calendar_review';
    } else if (lower.includes('market') || lower.includes('portfolio')) {
      return 'market_check';
    } else if (lower.includes('commit') || lower.includes('push')) {
      return 'code_commit';
    } else if (lower.includes('deploy') || lower.includes('release')) {
      return 'deployment';
    }
    
    return 'general_activity';
  }

  /**
   * Extract projects from memory file
   */
  extractProjects(file) {
    const projects = [];
    const lines = file.content.split('\n');
    let currentProject = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect project headers (### Project Name or **Project Name**)
      if (line.match(/^###\s+(.+)/) || line.match(/^\*\*(.+?)\*\*/)) {
        if (currentProject) {
          projects.push(currentProject);
        }
        
        const name = line.match(/^###\s+(.+)/)
          ? line.match(/^###\s+(.+)/)[1]
          : line.match(/^\*\*(.+?)\*\*/)[1];
        
        currentProject = {
          name: name.trim(),
          content: []
        };
      } else if (currentProject) {
        currentProject.content.push(line);
      }
    }
    
    if (currentProject) {
      projects.push(currentProject);
    }
    
    return projects;
  }

  /**
   * Extract sequence from project content
   */
  extractProjectSequence(project) {
    const sequence = [];
    const content = project.content.join('\n').toLowerCase();
    
    // Common sequence steps
    const steps = [
      { key: 'status', patterns: ['status:', 'current state:', '✅', '🟡', '🔴'] },
      { key: 'blocker', patterns: ['blocker:', 'blocked by:', 'issue:', '⚠️'] },
      { key: 'action', patterns: ['action:', 'next step:', 'escalate', 'updated'] },
      { key: 'await', patterns: ['await', 'pending', 'waiting for'] }
    ];
    
    for (const step of steps) {
      for (const pattern of step.patterns) {
        if (content.includes(pattern)) {
          if (!sequence.includes(step.key)) {
            sequence.push(step.key);
          }
          break;
        }
      }
    }
    
    return sequence;
  }

  /**
   * Count sequence occurrences
   */
  countSequences(sequences) {
    const counts = {};
    
    for (const seq of sequences) {
      const key = seq.sequence.join('→');
      
      if (!counts[key]) {
        counts[key] = [];
      }
      
      counts[key].push(seq);
    }
    
    return counts;
  }

  /**
   * Extract context events from memory file
   */
  extractContextEvents(file) {
    const events = [];
    const lines = file.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect time-critical markers
      if (line.toUpperCase().includes('TIME-CRITICAL') || 
          line.toUpperCase().includes('DEADLINE') ||
          line.includes('⏰')) {
        
        events.push({
          contextType: 'deadline_approaching',
          trigger: 'time_critical_marker',
          response: this.extractResponse(lines, i),
          timestamp: new Date(file.date).getTime()
        });
      }
      
      // Detect error/failure contexts
      if (line.toLowerCase().includes('error') ||
          line.toLowerCase().includes('failed') ||
          line.includes('❌')) {
        
        events.push({
          contextType: 'error_occurred',
          trigger: 'error_marker',
          response: this.extractResponse(lines, i),
          timestamp: new Date(file.date).getTime()
        });
      }
    }
    
    return events;
  }

  /**
   * Extract response pattern around a context trigger
   */
  extractResponse(lines, triggerIndex) {
    const contextWindow = 5; // Look at ±5 lines
    const start = Math.max(0, triggerIndex - contextWindow);
    const end = Math.min(lines.length, triggerIndex + contextWindow);
    
    return lines.slice(start, end).join('\n');
  }

  /**
   * Extract messages from memory file
   */
  extractMessages(file) {
    const messages = [];
    const lines = file.content.split('\n');
    
    for (const line of lines) {
      // Skip headers and empty lines
      if (line.startsWith('#') || line.trim() === '') {
        continue;
      }
      
      messages.push({
        content: line,
        context: line.substring(0, 100), // First 100 chars as context
        date: file.date
      });
    }
    
    return messages;
  }

  /**
   * Extract topics from message
   */
  extractTopics(message) {
    const topics = [];
    const content = message.content.toLowerCase();
    
    // Common topic keywords
    const topicKeywords = {
      'project_status': ['status', 'progress', 'update'],
      'blocker_identification': ['blocker', 'blocked', 'stuck'],
      'deadline_tracking': ['deadline', 'due date', 'timeline'],
      'error_debugging': ['error', 'bug', 'issue', 'debug'],
      'deployment': ['deploy', 'release', 'ship'],
      'code_review': ['review', 'pr', 'pull request']
    };
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          topics.push(topic);
          break;
        }
      }
    }
    
    return topics;
  }

  /**
   * Calculate behavior consistency across occurrences
   */
  calculateBehaviorConsistency(occurrences) {
    if (occurrences.length < 2) return 1.0;
    
    // Compare response patterns using simple string similarity
    const responses = occurrences.map(o => o.response.toLowerCase());
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < responses.length - 1; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        totalSimilarity += this.stringSimilarity(responses[i], responses[j]);
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0.5;
  }

  /**
   * Simple string similarity (Jaccard index on words)
   */
  stringSimilarity(str1, str2) {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Summarize response patterns
   */
  summarizeResponses(occurrences) {
    // Extract common keywords from responses
    const allWords = {};
    
    for (const occ of occurrences) {
      const words = occ.response.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 3) { // Skip short words
          allWords[word] = (allWords[word] || 0) + 1;
        }
      }
    }
    
    // Get top 5 most common words
    const sorted = Object.entries(allWords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
    
    return sorted.join(', ');
  }

  /**
   * Convert time string to minutes since midnight
   */
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes since midnight to time string
   */
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Calculate mean of array
   */
  calculateMean(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(arr) {
    const mean = this.calculateMean(arr);
    const squaredDiffs = arr.map(val => Math.pow(val - mean, 2));
    const variance = this.calculateMean(squaredDiffs);
    return Math.sqrt(variance);
  }

  /**
   * Calculate consistency factor from variance
   */
  calculateConsistency(variance) {
    // Variance < 15 minutes = high consistency (1.0)
    // Variance > 60 minutes = low consistency (0.5)
    const maxVariance = 60;
    const minVariance = 15;
    
    if (variance <= minVariance) return 1.0;
    if (variance >= maxVariance) return 0.5;
    
    // Linear interpolation
    return 1.0 - ((variance - minVariance) / (maxVariance - minVariance)) * 0.5;
  }

  /**
   * Hash sequence for ID generation
   */
  hashSequence(seq) {
    let hash = 0;
    for (let i = 0; i < seq.length; i++) {
      const char = seq.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

module.exports = PatternDetectors;
