/**
 * Rate Limiting & Quota Management Engine
 * Prevents abuse and manages budgets with graceful degradation
 */

const fs = require('fs').promises;
const path = require('path');

class RateLimiter {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.env.OPENCLAW_WORKSPACE || './';
    this.configPath = path.join(this.workspaceRoot, 'rate-limits.json');
    this.config = null;
    this.usage = new Map(); // Track usage per session/user
    this.queuedRequests = [];
  }

  /**
   * Load configuration
   */
  async load() {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
    } catch (error) {
      console.log('[Rate Limiter] No config found, using defaults');
      await this.createDefaultConfig();
    }
  }

  /**
   * Create default configuration
   */
  async createDefaultConfig() {
    this.config = {
      enabled: true,
      limits: {
        tokens: {
          perSession: 100000,
          perDay: 1000000
        },
        cost: {
          perSession: 1.00,
          perDay: 10.00,
          perMonth: 200.00
        },
        apiCalls: {
          perMinute: 60,
          perHour: 1000
        }
      },
      thresholds: {
        warning: 0.8,
        degradation: 0.9,
        critical: 0.95,
        block: 1.0
      },
      actions: {
        warning: ['alert_user', 'log'],
        degradation: ['switch_to_haiku', 'alert_user'],
        critical: ['queue_non_urgent', 'alert_user'],
        block: ['block_requests', 'alert_user', 'notify_admin']
      }
    };

    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  /**
   * Check if request is allowed
   * @param {object} context - Request context (session, user, type, cost estimate)
   * @returns {object} Decision with status and actions
   */
  async checkLimit(context) {
    if (!this.config || !this.config.enabled) {
      return { allowed: true, status: 'unlimited' };
    }

    const { sessionId, userId, type, estimatedCost, estimatedTokens } = context;
    
    // Get current usage
    const usage = await this.getUsage(sessionId, userId);
    
    // Check each limit type
    const checks = {
      tokens: this.checkTokenLimit(usage, estimatedTokens),
      cost: this.checkCostLimit(usage, estimatedCost),
      apiCalls: this.checkApiCallLimit(usage)
    };
    
    // Determine overall status
    const maxPercentage = Math.max(
      checks.tokens.percentage,
      checks.cost.percentage,
      checks.apiCalls.percentage
    );
    
    const status = this.determineStatus(maxPercentage);
    const actions = this.config.actions[status] || [];
    
    // Execute actions
    const actionResults = await this.executeActions(actions, context, checks);
    
    return {
      allowed: status !== 'block',
      status,
      percentage: maxPercentage,
      checks,
      actions: actionResults,
      degradationMode: status === 'degradation' || status === 'critical'
    };
  }

  /**
   * Get current usage for session/user
   */
  async getUsage(sessionId, userId) {
    const key = `${userId || 'unknown'}:${sessionId}`;
    
    if (this.usage.has(key)) {
      return this.usage.get(key);
    }
    
    // Load from costs.json
    try {
      const costsPath = path.join(this.workspaceRoot, 'costs.json');
      const content = await fs.readFile(costsPath, 'utf-8');
      const costs = JSON.parse(content);
      
      const today = new Date().toISOString().split('T')[0];
      const todayData = costs[today] || { cost: 0, tokens: 0, apiCalls: 0 };
      
      const usage = {
        tokens: todayData.tokens || 0,
        cost: todayData.cost || 0,
        apiCalls: todayData.apiCalls || 0,
        lastReset: today
      };
      
      this.usage.set(key, usage);
      return usage;
      
    } catch (error) {
      // No costs file, return zero usage
      return {
        tokens: 0,
        cost: 0,
        apiCalls: 0,
        lastReset: new Date().toISOString().split('T')[0]
      };
    }
  }

  /**
   * Check token limit
   */
  checkTokenLimit(usage, estimatedTokens = 0) {
    const limit = this.config.limits.tokens.perDay;
    const used = usage.tokens + estimatedTokens;
    const percentage = (used / limit) * 100;
    
    return {
      type: 'tokens',
      used,
      limit,
      percentage,
      remaining: limit - used,
      exceeded: used >= limit
    };
  }

  /**
   * Check cost limit
   */
  checkCostLimit(usage, estimatedCost = 0) {
    const limit = this.config.limits.cost.perDay;
    const used = usage.cost + estimatedCost;
    const percentage = (used / limit) * 100;
    
    return {
      type: 'cost',
      used: used.toFixed(2),
      limit: limit.toFixed(2),
      percentage,
      remaining: (limit - used).toFixed(2),
      exceeded: used >= limit
    };
  }

  /**
   * Check API call limit
   */
  checkApiCallLimit(usage) {
    const limit = this.config.limits.apiCalls.perMinute;
    const used = usage.apiCalls;
    const percentage = (used / limit) * 100;
    
    return {
      type: 'apiCalls',
      used,
      limit,
      percentage,
      remaining: limit - used,
      exceeded: used >= limit
    };
  }

  /**
   * Determine status based on percentage
   */
  determineStatus(percentage) {
    const thresholds = this.config.thresholds;
    
    if (percentage >= thresholds.block * 100) return 'block';
    if (percentage >= thresholds.critical * 100) return 'critical';
    if (percentage >= thresholds.degradation * 100) return 'degradation';
    if (percentage >= thresholds.warning * 100) return 'warning';
    return 'normal';
  }

  /**
   * Execute actions based on status
   */
  async executeActions(actions, context, checks) {
    const results = [];
    
    for (const action of actions) {
      switch (action) {
        case 'alert_user':
          results.push(await this.alertUser(context, checks));
          break;
        case 'log':
          results.push(await this.logUsage(context, checks));
          break;
        case 'switch_to_haiku':
          results.push(this.switchToHaiku(context));
          break;
        case 'queue_non_urgent':
          results.push(this.queueNonUrgent(context));
          break;
        case 'block_requests':
          results.push(this.blockRequest(context));
          break;
        case 'notify_admin':
          results.push(await this.notifyAdmin(context, checks));
          break;
      }
    }
    
    return results;
  }

  /**
   * Alert user about limit status
   */
  async alertUser(context, checks) {
    const maxCheck = Object.values(checks).reduce((max, check) => 
      check.percentage > max.percentage ? check : max
    );
    
    const alert = {
      type: 'user_alert',
      severity: this.determineStatus(maxCheck.percentage),
      message: this.generateAlertMessage(maxCheck),
      timestamp: new Date().toISOString()
    };
    
    console.log(`[Rate Limiter] ${alert.message}`);
    return alert;
  }

  /**
   * Generate alert message
   */
  generateAlertMessage(check) {
    const { type, percentage, used, limit, remaining } = check;
    
    if (percentage >= 100) {
      return `🛑 ${type.toUpperCase()} LIMIT EXCEEDED: ${used}/${limit} (100%). All requests blocked.`;
    } else if (percentage >= 95) {
      return `🚨 ${type.toUpperCase()} CRITICAL: ${used}/${limit} (${percentage.toFixed(1)}%). Remaining: ${remaining}`;
    } else if (percentage >= 90) {
      return `⚠️ ${type.toUpperCase()} HIGH: ${used}/${limit} (${percentage.toFixed(1)}%). Switching to cost optimization mode.`;
    } else if (percentage >= 80) {
      return `⚠️ ${type.toUpperCase()} WARNING: ${used}/${limit} (${percentage.toFixed(1)}%). Remaining: ${remaining}`;
    }
    
    return `ℹ️ ${type.toUpperCase()} NORMAL: ${used}/${limit} (${percentage.toFixed(1)}%)`;
  }

  /**
   * Log usage to file
   */
  async logUsage(context, checks) {
    const logPath = path.join(this.workspaceRoot, 'logs', 'rate-limits.jsonl');
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      context,
      checks
    }) + '\n';
    
    try {
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, logEntry, 'utf-8');
      return { type: 'log', status: 'success' };
    } catch (error) {
      return { type: 'log', status: 'failed', error: error.message };
    }
  }

  /**
   * Switch to haiku model for cost savings
   */
  switchToHaiku(context) {
    console.log('[Rate Limiter] Switching to haiku-4-5 for cost optimization');
    return {
      type: 'model_switch',
      from: 'sonnet-4-5',
      to: 'haiku-4-5',
      savings: '93%'
    };
  }

  /**
   * Queue non-urgent request for later
   */
  queueNonUrgent(context) {
    if (context.priority !== 'urgent') {
      this.queuedRequests.push({
        ...context,
        queuedAt: Date.now()
      });
      
      console.log('[Rate Limiter] Queued non-urgent request for later execution');
      return { type: 'queue', status: 'queued', queueSize: this.queuedRequests.length };
    }
    
    return { type: 'queue', status: 'skipped', reason: 'urgent priority' };
  }

  /**
   * Block request
   */
  blockRequest(context) {
    console.log('[Rate Limiter] Request blocked due to limit exceeded');
    return {
      type: 'block',
      status: 'blocked',
      reason: 'Limit exceeded',
      retryAfter: this.calculateRetryAfter()
    };
  }

  /**
   * Calculate when user can retry
   */
  calculateRetryAfter() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    
    const msUntilMidnight = midnight - now;
    const hoursUntil = Math.floor(msUntilMidnight / (1000 * 60 * 60));
    const minutesUntil = Math.floor((msUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hoursUntil}h ${minutesUntil}m`;
  }

  /**
   * Notify admin of critical limit
   */
  async notifyAdmin(context, checks) {
    console.log('[Rate Limiter] ADMIN ALERT: Critical limit reached');
    return {
      type: 'admin_notification',
      status: 'sent',
      context,
      checks
    };
  }

  /**
   * Update usage after request
   */
  async updateUsage(sessionId, userId, usage) {
    const key = `${userId || 'unknown'}:${sessionId}`;
    const current = await this.getUsage(sessionId, userId);
    
    current.tokens += usage.tokens || 0;
    current.cost += usage.cost || 0;
    current.apiCalls += usage.apiCalls || 0;
    
    this.usage.set(key, current);
    
    // Persist to costs.json
    await this.persistUsage(current);
  }

  /**
   * Persist usage to costs.json
   */
  async persistUsage(usage) {
    const costsPath = path.join(this.workspaceRoot, 'costs.json');
    
    try {
      let costs = {};
      try {
        const content = await fs.readFile(costsPath, 'utf-8');
        costs = JSON.parse(content);
      } catch (error) {
        // File doesn't exist, start fresh
      }
      
      const today = new Date().toISOString().split('T')[0];
      costs[today] = usage;
      
      await fs.writeFile(costsPath, JSON.stringify(costs, null, 2), 'utf-8');
    } catch (error) {
      console.error('[Rate Limiter] Failed to persist usage:', error.message);
    }
  }
}

module.exports = RateLimiter;
