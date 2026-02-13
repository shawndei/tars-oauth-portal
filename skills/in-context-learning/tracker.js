/**
 * Performance Tracker
 * 
 * Tracks performance metrics for in-context learning requests
 * to enable data-driven optimization.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class PerformanceTracker {
  constructor(trackerPath) {
    this.trackerPath = trackerPath || path.join(__dirname, 'examples', 'performance.json');
    this.requests = new Map(); // requestId -> request data
    this.useCases = new Map(); // useCase -> stats
    this.strategies = new Map(); // strategy -> stats
  }

  /**
   * Load tracker state from disk
   */
  async load() {
    try {
      const data = await fs.readFile(this.trackerPath, 'utf8');
      const parsed = JSON.parse(data);

      // Restore requests (keep only recent ones, e.g., last 1000)
      const requests = parsed.requests || [];
      requests.slice(-1000).forEach(req => {
        this.requests.set(req.id, req);
      });

      // Restore aggregated stats
      if (parsed.useCases) {
        this.useCases = new Map(Object.entries(parsed.useCases));
      }
      if (parsed.strategies) {
        this.strategies = new Map(Object.entries(parsed.strategies));
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist yet, that's ok
    }
  }

  /**
   * Save tracker state to disk
   */
  async save() {
    const data = {
      updated: new Date().toISOString(),
      requests: Array.from(this.requests.values()),
      useCases: Object.fromEntries(this.useCases),
      strategies: Object.fromEntries(this.strategies)
    };

    await fs.mkdir(path.dirname(this.trackerPath), { recursive: true });
    await fs.writeFile(this.trackerPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Start tracking a new request
   * 
   * @param {string} useCase - The use case
   * @param {string} prompt - The prompt
   * @returns {string} - Request ID
   */
  startRequest(useCase, prompt) {
    const id = this._generateId();
    
    const request = {
      id,
      useCase,
      prompt: prompt.substring(0, 200), // Store truncated for privacy
      timestamp: Date.now(),
      status: 'pending'
    };

    this.requests.set(id, request);
    return id;
  }

  /**
   * Record the adaptation details for a request
   * 
   * @param {string} requestId - Request ID
   * @param {Object} details - Adaptation details
   */
  recordAdaptation(requestId, details) {
    const request = this.requests.get(requestId);
    if (!request) return;

    request.examples = details.examples;
    request.strategy = details.strategy;
    request.status = 'adapted';
    request.adaptedAt = Date.now();
  }

  /**
   * Record feedback for a request
   * 
   * @param {string} requestId - Request ID
   * @param {Object} feedback - Feedback data
   */
  async recordFeedback(requestId, feedback) {
    const request = this.requests.get(requestId);
    if (!request) return;

    request.feedback = feedback;
    request.status = 'complete';
    request.completedAt = Date.now();

    // Update aggregated statistics
    await this._updateStats(request);
    await this.save();
  }

  /**
   * Record an error for a request
   * 
   * @param {string} requestId - Request ID
   * @param {Error} error - Error object
   */
  recordError(requestId, error) {
    const request = this.requests.get(requestId);
    if (!request) return;

    request.status = 'error';
    request.error = error.message;
    request.erroredAt = Date.now();
  }

  /**
   * Get statistics for a specific use case
   * 
   * @param {string} useCase - Use case to analyze
   * @returns {Object} - Statistics
   */
  async getStats(useCase) {
    const stats = this.useCases.get(useCase) || this._initStats();
    
    // Calculate recent performance (last 50 requests)
    const recentRequests = Array.from(this.requests.values())
      .filter(r => r.useCase === useCase && r.status === 'complete')
      .slice(-50);

    if (recentRequests.length > 0) {
      const recentSuccess = recentRequests.filter(r => 
        r.feedback && r.feedback.success
      ).length;

      stats.recent = {
        requests: recentRequests.length,
        successRate: recentSuccess / recentRequests.length,
        avgExamples: recentRequests.reduce((sum, r) => sum + (r.examples || 0), 0) / recentRequests.length
      };
    }

    return stats;
  }

  /**
   * Get strategy comparison data
   * 
   * @returns {Object} - Strategy performance comparison
   */
  getStrategyComparison() {
    const comparison = {};

    for (const [strategy, stats] of this.strategies.entries()) {
      comparison[strategy] = {
        totalRequests: stats.totalRequests,
        successRate: stats.successRate,
        avgResponseTime: stats.avgResponseTime
      };
    }

    return comparison;
  }

  /**
   * Update aggregated statistics
   * @private
   */
  async _updateStats(request) {
    if (request.status !== 'complete' || !request.feedback) return;

    // Update use case stats
    const useCaseStats = this.useCases.get(request.useCase) || this._initStats();
    this._incrementStats(useCaseStats, request);
    this.useCases.set(request.useCase, useCaseStats);

    // Update strategy stats
    const strategyStats = this.strategies.get(request.strategy) || this._initStats();
    this._incrementStats(strategyStats, request);
    this.strategies.set(request.strategy, strategyStats);
  }

  /**
   * Initialize stats object
   * @private
   */
  _initStats() {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      successRate: 0,
      avgExamples: 0,
      avgResponseTime: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * Increment stats with new request data
   * @private
   */
  _incrementStats(stats, request) {
    const n = stats.totalRequests;
    stats.totalRequests += 1;

    const success = request.feedback && request.feedback.success ? 1 : 0;
    stats.successfulRequests += success;
    stats.successRate = stats.successfulRequests / stats.totalRequests;

    const responseTime = request.completedAt - request.timestamp;
    stats.avgResponseTime = (stats.avgResponseTime * n + responseTime) / (n + 1);

    const examples = request.examples || 0;
    stats.avgExamples = (stats.avgExamples * n + examples) / (n + 1);

    stats.lastUpdated = Date.now();
  }

  /**
   * Generate a unique request ID
   * @private
   */
  _generateId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Get recent request history
   * 
   * @param {number} limit - Maximum number of requests to return
   * @returns {Array} - Recent requests
   */
  getRecentRequests(limit = 20) {
    return Array.from(this.requests.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Export all tracking data for analysis
   * 
   * @returns {Object} - Complete tracking data
   */
  exportData() {
    return {
      requests: Array.from(this.requests.values()),
      useCases: Object.fromEntries(this.useCases),
      strategies: Object.fromEntries(this.strategies),
      summary: {
        totalRequests: this.requests.size,
        useCaseCount: this.useCases.size,
        strategyCount: this.strategies.size
      }
    };
  }
}

module.exports = { PerformanceTracker };
