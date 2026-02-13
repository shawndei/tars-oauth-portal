/**
 * Cost Tracker - Live Cost Capture & Session Recording
 * Captures actual token usage at session end and records costs with proper structure
 */

const fs = require('fs').promises;
const path = require('path');

class CostTracker {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.env.OPENCLAW_WORKSPACE || './';
    this.costsFilePath = path.join(this.workspaceRoot, 'costs.json');
    this.analyticsCostsPath = path.join(this.workspaceRoot, 'analytics', 'costs.json');
    this.budgetLogsPath = path.join(this.workspaceRoot, 'monitoring_logs', 'budget-status.log');
    this.alertLogsPath = path.join(this.workspaceRoot, 'monitoring_logs', 'cost-alerts.jsonl');
    
    // Model pricing (per 1M tokens)
    // Based on current Claude pricing as of 2026
    this.pricing = {
      'claude-sonnet-4-5': { input: 3, output: 15 },      // $3/$15 per 1M
      'claude-haiku-4-5': { input: 0.08, output: 0.4 },   // $0.08/$0.40 per 1M (95%+ cheaper)
      'claude-opus-4-5': { input: 15, output: 75 }        // $15/$75 per 1M
    };
  }

  /**
   * Calculate cost from token counts
   */
  calculateCost(inputTokens, outputTokens, model = 'claude-sonnet-4-5') {
    const rates = this.pricing[model] || this.pricing['claude-sonnet-4-5'];
    
    const inputCost = (inputTokens / 1000000) * rates.input;
    const outputCost = (outputTokens / 1000000) * rates.output;
    
    return {
      cost: inputCost + outputCost,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      model
    };
  }

  /**
   * Record session cost - Main entry point for session end
   */
  async recordSessionCost(sessionData) {
    const {
      sessionId,
      sessionKey,
      model = 'claude-sonnet-4-5',
      inputTokens = 0,
      outputTokens = 0,
      apiCalls = 1,
      taskType = 'general',
      startTime = new Date().toISOString(),
      endTime = new Date().toISOString()
    } = sessionData;

    try {
      // Calculate cost
      const costData = this.calculateCost(inputTokens, outputTokens, model);
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      const hour = new Date().toISOString().split('T')[1].substring(0, 2);
      
      // Read current costs.json
      const mainCosts = await this.readCostsFile(this.costsFilePath);
      
      // Initialize today's data if not exists
      if (!mainCosts[today]) {
        mainCosts[today] = {
          daily: { cost: 0, tokens: 0, apiCalls: 0, timestamp: endTime },
          sessions: {},
          perHour: {}
        };
      }
      
      // Update daily totals
      mainCosts[today].daily.cost += costData.cost;
      mainCosts[today].daily.tokens += costData.totalTokens;
      mainCosts[today].daily.apiCalls += apiCalls;
      mainCosts[today].daily.timestamp = endTime;
      
      // Add session detail
      mainCosts[today].sessions[sessionKey] = {
        cost: costData.cost,
        tokens: costData.totalTokens,
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        apiCalls,
        startTime,
        endTime,
        model,
        taskType
      };
      
      // Update hourly breakdown
      if (!mainCosts[today].perHour[hour]) {
        mainCosts[today].perHour[hour] = { cost: 0, tokens: 0, apiCalls: 0 };
      }
      mainCosts[today].perHour[hour].cost += costData.cost;
      mainCosts[today].perHour[hour].tokens += costData.totalTokens;
      mainCosts[today].perHour[hour].apiCalls += apiCalls;
      
      // Update summary
      this.updateSummary(mainCosts);
      
      // Write to costs.json
      await this.writeCostsFile(this.costsFilePath, mainCosts);
      
      // Also update analytics/costs.json
      await this.updateAnalyticsCosts(mainCosts[today], today, sessionKey, costData);
      
      // Check budget and fire alerts if needed
      await this.checkBudgetAndAlert(mainCosts, today);
      
      return {
        success: true,
        cost: costData.cost,
        tokens: costData.totalTokens,
        status: await this.getStatus(mainCosts, today)
      };
      
    } catch (error) {
      console.error('[CostTracker] Failed to record session cost:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update summary section
   */
  updateSummary(costs) {
    // Calculate totals across all dates
    let totalCost = 0;
    let totalTokens = 0;
    let totalApiCalls = 0;
    let dates = [];
    
    Object.keys(costs).forEach(date => {
      if (costs[date].daily) {
        totalCost += costs[date].daily.cost || 0;
        totalTokens += costs[date].daily.tokens || 0;
        totalApiCalls += costs[date].daily.apiCalls || 0;
        dates.push(date);
      }
    });
    
    dates.sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];
    const daysElapsed = dates.length;
    
    const averageDailyCost = totalCost / daysElapsed;
    const daysInMonth = 28; // Default to 28-day month for current month
    const projectedMonthly = (averageDailyCost * daysInMonth);
    const monthlyBudget = 200;
    
    costs.summary = {
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalTokens,
      totalApiCalls,
      periodStart,
      periodEnd,
      daysElapsed,
      averageDailyCost: parseFloat(averageDailyCost.toFixed(2)),
      projectedMonthlyAtCurrentRate: parseFloat(projectedMonthly.toFixed(2)),
      monthlyBudget,
      status: projectedMonthly > monthlyBudget ? 'exceeding_limit' : 'approaching_limit'
    };
  }

  /**
   * Check budget and fire alerts
   */
  async checkBudgetAndAlert(costs, today) {
    const dailyBudget = 10.00; // $10/day
    const dailyCost = costs[today]?.daily?.cost || 0;
    const percentage = (dailyCost / dailyBudget) * 100;
    
    let status = 'normal';
    let shouldAlert = false;
    let alertLevel = 'info';
    let message = '';
    
    if (percentage >= 100) {
      status = 'blocked';
      alertLevel = 'critical';
      shouldAlert = true;
      message = `🛑 BLOCKED: $${dailyCost.toFixed(2)} / $${dailyBudget} (${percentage.toFixed(1)}%) - Daily budget exhausted`;
    } else if (percentage >= 95) {
      status = 'critical';
      alertLevel = 'critical';
      shouldAlert = true;
      message = `🔴 CRITICAL: $${dailyCost.toFixed(2)} / $${dailyBudget} (${percentage.toFixed(1)}%) - Only ${(dailyBudget - dailyCost).toFixed(2)} remaining`;
    } else if (percentage >= 90) {
      status = 'degradation';
      alertLevel = 'warning';
      shouldAlert = true;
      message = `🟠 DEGRADATION: $${dailyCost.toFixed(2)} / $${dailyBudget} (${percentage.toFixed(1)}%) - Switched to Haiku mode`;
    } else if (percentage >= 80) {
      status = 'warning';
      alertLevel = 'warning';
      shouldAlert = true;
      message = `⚠️ WARNING: $${dailyCost.toFixed(2)} / $${dailyBudget} (${percentage.toFixed(1)}%) - ${(dailyBudget - dailyCost).toFixed(2)} remaining`;
    }
    
    if (shouldAlert) {
      await this.logBudgetStatus(today, status, dailyCost, dailyBudget, percentage, message);
      await this.recordAlert({
        timestamp: new Date().toISOString(),
        date: today,
        level: alertLevel,
        status,
        cost: dailyCost,
        budget: dailyBudget,
        percentage,
        message
      });
    }
    
    return { status, percentage, message };
  }

  /**
   * Log budget status
   */
  async logBudgetStatus(date, status, cost, budget, percentage, message) {
    try {
      await fs.mkdir(path.dirname(this.budgetLogsPath), { recursive: true });
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;
      await fs.appendFile(this.budgetLogsPath, logEntry);
    } catch (error) {
      console.error('[CostTracker] Failed to log budget status:', error.message);
    }
  }

  /**
   * Record alert to JSONL
   */
  async recordAlert(alertData) {
    try {
      await fs.mkdir(path.dirname(this.alertLogsPath), { recursive: true });
      const entry = JSON.stringify(alertData) + '\n';
      await fs.appendFile(this.alertLogsPath, entry);
    } catch (error) {
      console.error('[CostTracker] Failed to record alert:', error.message);
    }
  }

  /**
   * Update analytics/costs.json
   */
  async updateAnalyticsCosts(dailyData, date, sessionKey, costData) {
    try {
      await fs.mkdir(path.dirname(this.analyticsCostsPath), { recursive: true });
      
      let analytics = {
        daily_budget: 10,
        weekly_budget: 50,
        monthly_budget: 200,
        current_month: date.substring(0, 7),
        sessions: [],
        last_updated: new Date().toISOString()
      };
      
      // Try to read existing
      try {
        const content = await fs.readFile(this.analyticsCostsPath, 'utf-8');
        analytics = JSON.parse(content);
      } catch (e) {
        // File doesn't exist or is invalid, start fresh
      }
      
      // Add session data
      analytics.sessions.push({
        sessionKey,
        date,
        cost: costData.cost,
        tokens: costData.totalTokens,
        inputTokens: costData.inputTokens,
        outputTokens: costData.outputTokens,
        model: costData.model,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 100 sessions
      if (analytics.sessions.length > 100) {
        analytics.sessions = analytics.sessions.slice(-100);
      }
      
      analytics.last_updated = new Date().toISOString();
      
      await fs.writeFile(this.analyticsCostsPath, JSON.stringify(analytics, null, 2), 'utf-8');
    } catch (error) {
      console.error('[CostTracker] Failed to update analytics costs:', error.message);
    }
  }

  /**
   * Get current budget status
   */
  async getStatus(costs, today) {
    const dailyBudget = 10.00;
    const dailyCost = costs[today]?.daily?.cost || 0;
    const percentage = (dailyCost / dailyBudget) * 100;
    
    if (percentage >= 100) return 'blocked';
    if (percentage >= 95) return 'critical';
    if (percentage >= 90) return 'degradation';
    if (percentage >= 80) return 'warning';
    return 'normal';
  }

  /**
   * Read costs.json
   */
  async readCostsFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return {}; // Return empty object if file doesn't exist
    }
  }

  /**
   * Write costs.json
   */
  async writeCostsFile(filePath, data) {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('[CostTracker] Failed to write costs file:', error.message);
      throw error;
    }
  }

  /**
   * Get costs summary
   */
  async getCostsSummary() {
    try {
      const costs = await this.readCostsFile(this.costsFilePath);
      return costs.summary || null;
    } catch (error) {
      console.error('[CostTracker] Failed to read costs summary:', error.message);
      return null;
    }
  }

  /**
   * Get today's costs
   */
  async getTodaysCosts() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const costs = await this.readCostsFile(this.costsFilePath);
      return costs[today] || null;
    } catch (error) {
      console.error('[CostTracker] Failed to read today costs:', error.message);
      return null;
    }
  }
}

module.exports = CostTracker;
