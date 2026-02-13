/**
 * Self-Healing Error Recovery Engine
 * Automatically recovers from tool failures with adaptive strategies
 */

const fs = require('fs').promises;
const path = require('path');
const Strategies = require('./strategies');

class SelfHealingEngine {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 2000; // 2 seconds
    this.strategies = new Strategies();
    this.errorLog = [];
    this.recoveryStats = {
      attempts: 0,
      successes: 0,
      failures: 0,
      averageRecoveryTime: 0
    };
  }

  /**
   * Execute a tool call with self-healing recovery
   * @param {Function} toolCall - Function to execute
   * @param {object} context - Execution context (tool name, params, etc.)
   * @returns {Promise} Tool result or throws after max retries
   */
  async execute(toolCall, context = {}) {
    const { tool, maxRetries = this.maxRetries } = context;
    let lastError = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.recoveryStats.attempts++;

        // Execute the tool call
        const result = await toolCall();

        // Success!
        if (attempt > 0) {
          // This was a recovery success
          this.recoveryStats.successes++;
          const recoveryTime = Date.now() - startTime;
          this.updateRecoveryTime(recoveryTime);
          
          await this.logRecovery({
            tool,
            attempt,
            recoveryTime,
            strategy: context.currentStrategy,
            success: true
          });
        }

        return result;

      } catch (error) {
        lastError = error;
        this.recoveryStats.failures++;

        // Log the error
        await this.logError({
          tool,
          error: error.message,
          stack: error.stack,
          attempt,
          timestamp: new Date().toISOString(),
          context
        });

        // Last attempt - no more retries
        if (attempt === maxRetries - 1) {
          await this.logFinalFailure({
            tool,
            error: error.message,
            attempts: maxRetries,
            totalTime: Date.now() - startTime
          });
          throw error;
        }

        // Diagnose and adapt strategy
        const diagnosis = this.diagnoseError(error, tool, context);
        const adaptedContext = await this.adaptStrategy(diagnosis, context, attempt);

        // Update the tool call for next attempt
        context.currentStrategy = adaptedContext.strategy;
        context = { ...context, ...adaptedContext };

        // Exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);

        console.log(`[Self-Healing] Retry ${attempt + 1}/${maxRetries} with strategy: ${adaptedContext.strategy}`);
      }
    }

    // Should never reach here, but just in case
    throw lastError;
  }

  /**
   * Diagnose the root cause of an error
   */
  diagnoseError(error, tool, context) {
    const errorMessage = error.message.toLowerCase();
    const errorCode = error.code;

    // Common error patterns
    const diagnosis = {
      tool,
      originalError: error.message,
      category: 'unknown',
      cause: 'unknown',
      severity: 'medium'
    };

    // Browser errors
    if (tool === 'browser') {
      if (errorMessage.includes('timeout')) {
        diagnosis.category = 'timeout';
        diagnosis.cause = 'Browser operation exceeded timeout limit';
        diagnosis.severity = 'medium';
      } else if (errorMessage.includes('crash') || errorMessage.includes('disconnected')) {
        diagnosis.category = 'crash';
        diagnosis.cause = 'Browser process crashed or disconnected';
        diagnosis.severity = 'high';
      } else if (errorMessage.includes('navigation')) {
        diagnosis.category = 'navigation';
        diagnosis.cause = 'Failed to navigate to URL';
        diagnosis.severity = 'low';
      }
    }

    // Exec errors
    if (tool === 'exec') {
      if (errorMessage.includes('not found') || errorMessage.includes('command not recognized')) {
        diagnosis.category = 'command_not_found';
        diagnosis.cause = 'Command not in PATH or does not exist';
        diagnosis.severity = 'high';
      } else if (errorMessage.includes('permission denied') || errorCode === 'EACCES') {
        diagnosis.category = 'permission';
        diagnosis.cause = 'Insufficient permissions to execute';
        diagnosis.severity = 'high';
      } else if (errorMessage.includes('timeout')) {
        diagnosis.category = 'timeout';
        diagnosis.cause = 'Command execution exceeded timeout';
        diagnosis.severity = 'medium';
      }
    }

    // Network errors
    if (errorMessage.includes('econnrefused') || errorMessage.includes('network')) {
      diagnosis.category = 'network';
      diagnosis.cause = 'Network connection failed';
      diagnosis.severity = 'high';
    }

    // API rate limits
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      diagnosis.category = 'rate_limit';
      diagnosis.cause = 'API rate limit exceeded';
      diagnosis.severity = 'medium';
    }

    // File system errors
    if (errorCode === 'ENOENT') {
      diagnosis.category = 'file_not_found';
      diagnosis.cause = 'File or directory does not exist';
      diagnosis.severity = 'medium';
    } else if (errorCode === 'EACCES') {
      diagnosis.category = 'permission';
      diagnosis.cause = 'Permission denied';
      diagnosis.severity = 'high';
    }

    return diagnosis;
  }

  /**
   * Adapt execution strategy based on diagnosis
   */
  async adaptStrategy(diagnosis, context, attempt) {
    const strategy = this.strategies.getStrategy(diagnosis, context, attempt);
    
    return {
      strategy: strategy.name,
      modifications: strategy.modifications,
      ...strategy.adaptedContext
    };
  }

  /**
   * Log error to errors.jsonl
   */
  async logError(errorData) {
    this.errorLog.push(errorData);

    const logPath = path.join(
      process.env.OPENCLAW_WORKSPACE || './',
      'errors.jsonl'
    );

    const logEntry = JSON.stringify(errorData) + '\n';

    try {
      await fs.appendFile(logPath, logEntry, 'utf-8');
    } catch (error) {
      console.error('Failed to log error:', error.message);
    }
  }

  /**
   * Log successful recovery
   */
  async logRecovery(recoveryData) {
    const logPath = path.join(
      process.env.OPENCLAW_WORKSPACE || './',
      'logs',
      'recoveries.jsonl'
    );

    const logEntry = JSON.stringify({
      ...recoveryData,
      timestamp: new Date().toISOString()
    }) + '\n';

    try {
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, logEntry, 'utf-8');
    } catch (error) {
      console.error('Failed to log recovery:', error.message);
    }
  }

  /**
   * Log final failure after all retries exhausted
   */
  async logFinalFailure(failureData) {
    const logPath = path.join(
      process.env.OPENCLAW_WORKSPACE || './',
      'logs',
      'unrecoverable-errors.jsonl'
    );

    const logEntry = JSON.stringify({
      ...failureData,
      timestamp: new Date().toISOString()
    }) + '\n';

    try {
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, logEntry, 'utf-8');
    } catch (error) {
      console.error('Failed to log final failure:', error.message);
    }
  }

  /**
   * Update average recovery time
   */
  updateRecoveryTime(recoveryTime) {
    const total = this.recoveryStats.averageRecoveryTime * (this.recoveryStats.successes - 1);
    this.recoveryStats.averageRecoveryTime = (total + recoveryTime) / this.recoveryStats.successes;
  }

  /**
   * Get recovery statistics
   */
  getStats() {
    const successRate = this.recoveryStats.attempts > 0
      ? (this.recoveryStats.successes / this.recoveryStats.attempts * 100).toFixed(1)
      : 0;

    return {
      ...this.recoveryStats,
      successRate: `${successRate}%`,
      averageRecoveryTime: `${(this.recoveryStats.averageRecoveryTime / 1000).toFixed(1)}s`
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SelfHealingEngine;
