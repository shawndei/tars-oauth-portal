/**
 * Context-Aware Trigger System
 * Executes tasks based on time, patterns, events, and state
 */

const fs = require('fs').promises;
const path = require('path');

class ContextTriggers {
  constructor(configPath) {
    this.configPath = configPath || path.join(process.env.OPENCLAW_WORKSPACE || './', 'triggers.json');
    this.triggers = [];
    this.executionHistory = new Map();
  }

  /**
   * Load trigger configuration
   */
  async load() {
    try {
      const config = await fs.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(config);
      this.triggers = parsed.triggers || [];
      this.patterns = parsed.patterns || [];
      return true;
    } catch (error) {
      console.log('[Context-Triggers] No configuration found, using defaults');
      await this.createDefaultConfig();
      return false;
    }
  }

  /**
   * Create default trigger configuration
   */
  async createDefaultConfig() {
    const defaultConfig = {
      triggers: [
        {
          id: 'cost-alert',
          name: 'Cost Budget Alert',
          enabled: true,
          type: 'state',
          condition: 'cost > 0.8 * budget',
          action: 'send_cost_alert',
          cooldown: '6h',
          description: 'Alert when 80% of daily budget used'
        }
      ],
      patterns: [
        {
          id: 'research-pattern',
          name: 'Research Interest Detection',
          pattern: 'research|analyze|investigate',
          threshold: 3,
          window: '7d',
          action: 'suggest_deep_research',
          description: 'Suggest deep research when pattern detected'
        }
      ]
    };

    await fs.writeFile(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    this.triggers = defaultConfig.triggers;
    this.patterns = defaultConfig.patterns;
  }

  /**
   * Check all triggers and return actions to execute
   */
  async checkTriggers(context) {
    const actionsToExecute = [];

    for (const trigger of this.triggers) {
      if (!trigger.enabled) continue;

      // Check cooldown
      if (this.isOnCooldown(trigger.id, trigger.cooldown)) {
        continue;
      }

      // Evaluate trigger based on type
      let shouldTrigger = false;

      switch (trigger.type) {
        case 'time':
          shouldTrigger = this.checkTimeTrigger(trigger, context);
          break;
        case 'pattern':
          shouldTrigger = await this.checkPatternTrigger(trigger, context);
          break;
        case 'event':
          shouldTrigger = await this.checkEventTrigger(trigger, context);
          break;
        case 'state':
          shouldTrigger = this.checkStateTrigger(trigger, context);
          break;
      }

      if (shouldTrigger) {
        actionsToExecute.push({
          triggerId: trigger.id,
          triggerName: trigger.name,
          action: trigger.action,
          context: trigger
        });

        // Record execution time for cooldown
        this.recordExecution(trigger.id);
      }
    }

    return actionsToExecute;
  }

  /**
   * Check time-based trigger
   */
  checkTimeTrigger(trigger, context) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Parse schedule (e.g., "08:45" or cron format)
    if (trigger.schedule.includes(':')) {
      const [hour, minute] = trigger.schedule.split(':').map(Number);
      
      // Check if current time matches (within 15-minute window for heartbeat)
      const timeMatches = currentHour === hour && Math.abs(currentMinute - minute) <= 15;
      
      // Check day restrictions if specified
      if (trigger.days) {
        const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
        const allowedDays = trigger.days.map(d => dayMap[d]);
        return timeMatches && allowedDays.includes(currentDay);
      }
      
      return timeMatches;
    }

    // Cron format would need cron parser (not implemented in this basic version)
    return false;
  }

  /**
   * Check pattern-based trigger
   */
  async checkPatternTrigger(trigger, context) {
    // Analyze recent memory files for pattern
    const recentDays = 7;
    const today = new Date();
    const pattern = new RegExp(trigger.pattern, 'i');
    let matchCount = 0;

    for (let i = 0; i < recentDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const memoryPath = path.join(
          process.env.OPENCLAW_WORKSPACE || './',
          'memory',
          `${dateStr}.md`
        );
        const content = await fs.readFile(memoryPath, 'utf-8');
        
        // Count pattern matches
        const matches = content.match(pattern);
        matchCount += matches ? matches.length : 0;
      } catch (error) {
        // File doesn't exist, skip
        continue;
      }
    }

    return matchCount >= trigger.threshold;
  }

  /**
   * Check event-based trigger
   */
  async checkEventTrigger(trigger, context) {
    // Would integrate with calendar/external events
    // For now, return false (not implemented)
    return false;
  }

  /**
   * Check state-based trigger
   */
  checkStateTrigger(trigger, context) {
    // Evaluate condition expression
    try {
      // Parse condition (e.g., "cost > 0.8 * budget")
      const condition = trigger.condition;
      
      // Replace variables with actual values from context
      const evaluated = condition
        .replace(/cost/g, context.cost || 0)
        .replace(/budget/g, context.budget || 10);
      
      // Evaluate expression (CAUTION: eval is dangerous, use proper parser in production)
      // For safety, only allow basic comparisons
      const match = evaluated.match(/(\d+\.?\d*)\s*([><=]+)\s*(\d+\.?\d*)/);
      if (match) {
        const [, left, operator, right] = match;
        const l = parseFloat(left);
        const r = parseFloat(right);
        
        switch (operator) {
          case '>': return l > r;
          case '<': return l < r;
          case '>=': return l >= r;
          case '<=': return l <= r;
          case '==': return l === r;
          default: return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('[Context-Triggers] Error evaluating state condition:', error);
      return false;
    }
  }

  /**
   * Check if trigger is on cooldown
   */
  isOnCooldown(triggerId, cooldown) {
    if (!cooldown) return false;

    const lastExecution = this.executionHistory.get(triggerId);
    if (!lastExecution) return false;

    const cooldownMs = this.parseCooldown(cooldown);
    const timeSinceExecution = Date.now() - lastExecution;

    return timeSinceExecution < cooldownMs;
  }

  /**
   * Parse cooldown string to milliseconds
   */
  parseCooldown(cooldown) {
    const match = cooldown.match(/(\d+)([hms])/);
    if (!match) return 0;

    const [, value, unit] = match;
    const num = parseInt(value);

    switch (unit) {
      case 'h': return num * 60 * 60 * 1000;
      case 'm': return num * 60 * 1000;
      case 's': return num * 1000;
      default: return 0;
    }
  }

  /**
   * Record trigger execution time
   */
  recordExecution(triggerId) {
    this.executionHistory.set(triggerId, Date.now());
  }

  /**
   * Execute triggered action
   */
  async executeAction(action, context) {
    console.log(`[Context-Triggers] Executing action: ${action}`);
    
    // Action execution would integrate with TARS task system
    // For now, return action details
    return {
      action,
      executed: true,
      timestamp: new Date().toISOString(),
      context
    };
  }
}

module.exports = ContextTriggers;
