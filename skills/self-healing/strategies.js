/**
 * Tool-Specific Recovery Strategies
 * Defines how to recover from different types of failures
 */

class RecoveryStrategies {
  constructor() {
    this.strategyHistory = new Map(); // Track which strategies work
  }

  /**
   * Get recovery strategy based on error diagnosis
   */
  getStrategy(diagnosis, context, attempt) {
    const { tool, category } = diagnosis;

    // Browser strategies
    if (tool === 'browser') {
      return this.getBrowserStrategy(category, context, attempt);
    }

    // Exec strategies
    if (tool === 'exec') {
      return this.getExecStrategy(category, context, attempt);
    }

    // Network strategies
    if (category === 'network' || category === 'rate_limit') {
      return this.getNetworkStrategy(category, context, attempt);
    }

    // File system strategies
    if (category === 'file_not_found' || category === 'permission') {
      return this.getFileSystemStrategy(category, context, attempt);
    }

    // Default fallback
    return this.getDefaultStrategy(attempt);
  }

  /**
   * Browser-specific recovery strategies
   */
  getBrowserStrategy(category, context, attempt) {
    switch (category) {
      case 'timeout':
        return {
          name: 'browser_timeout_recovery',
          modifications: [
            'Increase timeout by 2x',
            'Disable images and media',
            'Use headless mode'
          ],
          adaptedContext: {
            timeout: (context.timeout || 30000) * 2,
            headless: true,
            disableImages: true
          }
        };

      case 'crash':
        return {
          name: 'browser_crash_recovery',
          modifications: [
            'Restart browser',
            'Use headless mode',
            'Fallback to web_fetch if possible'
          ],
          adaptedContext: {
            restart: true,
            headless: true,
            fallbackToFetch: context.url ? true : false
          }
        };

      case 'navigation':
        return {
          name: 'browser_navigation_recovery',
          modifications: [
            'Retry with explicit wait',
            'Check URL validity',
            'Try alternative URL formats'
          ],
          adaptedContext: {
            waitUntil: 'networkidle',
            validateUrl: true
          }
        };

      default:
        return {
          name: 'browser_default_recovery',
          modifications: ['Restart browser', 'Reduce timeout'],
          adaptedContext: {
            restart: true,
            timeout: 15000
          }
        };
    }
  }

  /**
   * Exec-specific recovery strategies
   */
  getExecStrategy(category, context, attempt) {
    switch (category) {
      case 'command_not_found':
        return {
          name: 'exec_command_not_found_recovery',
          modifications: [
            'Try absolute path',
            'Check common installation directories',
            'Suggest alternative commands'
          ],
          adaptedContext: {
            useAbsolutePath: true,
            searchPaths: [
              'C:\\Program Files',
              'C:\\Program Files (x86)',
              process.env.LOCALAPPDATA
            ]
          }
        };

      case 'permission':
        return {
          name: 'exec_permission_recovery',
          modifications: [
            'Request elevated permissions',
            'Try alternative location',
            'Check file permissions'
          ],
          adaptedContext: {
            elevated: true,
            checkPermissions: true
          }
        };

      case 'timeout':
        return {
          name: 'exec_timeout_recovery',
          modifications: [
            'Increase timeout by 3x',
            'Run in background',
            'Break into smaller operations'
          ],
          adaptedContext: {
            timeout: (context.timeout || 30000) * 3,
            background: true
          }
        };

      default:
        return {
          name: 'exec_default_recovery',
          modifications: ['Increase timeout', 'Check command syntax'],
          adaptedContext: {
            timeout: (context.timeout || 30000) * 2
          }
        };
    }
  }

  /**
   * Network-specific recovery strategies
   */
  getNetworkStrategy(category, context, attempt) {
    switch (category) {
      case 'network':
        return {
          name: 'network_connection_recovery',
          modifications: [
            `Exponential backoff (${Math.pow(2, attempt + 1)}s)`,
            'Retry with DNS refresh',
            'Try alternative endpoint'
          ],
          adaptedContext: {
            retryDelay: Math.pow(2, attempt + 1) * 1000,
            refreshDns: true
          }
        };

      case 'rate_limit':
        return {
          name: 'rate_limit_recovery',
          modifications: [
            `Wait ${Math.pow(2, attempt + 2)}s`,
            'Reduce batch size by 50%',
            'Use cached data if available'
          ],
          adaptedContext: {
            retryDelay: Math.pow(2, attempt + 2) * 1000,
            batchSize: Math.floor((context.batchSize || 10) / 2),
            useCache: true
          }
        };

      default:
        return {
          name: 'network_default_recovery',
          modifications: ['Exponential backoff', 'Retry request'],
          adaptedContext: {
            retryDelay: Math.pow(2, attempt) * 1000
          }
        };
    }
  }

  /**
   * File system recovery strategies
   */
  getFileSystemStrategy(category, context, attempt) {
    switch (category) {
      case 'file_not_found':
        return {
          name: 'file_not_found_recovery',
          modifications: [
            'Check alternative locations',
            'Search parent directories',
            'Create file if intended for writing'
          ],
          adaptedContext: {
            searchLocations: [
              process.cwd(),
              process.env.OPENCLAW_WORKSPACE,
              process.env.USERPROFILE
            ],
            createIfMissing: context.operation === 'write'
          }
        };

      case 'permission':
        return {
          name: 'file_permission_recovery',
          modifications: [
            'Request elevated permissions',
            'Try user-writable directory',
            'Check file locks'
          ],
          adaptedContext: {
            elevated: true,
            alternativeLocation: path.join(process.env.TEMP, 'openclaw-fallback'),
            checkLocks: true
          }
        };

      default:
        return {
          name: 'filesystem_default_recovery',
          modifications: ['Retry operation', 'Check path validity'],
          adaptedContext: {
            validatePath: true
          }
        };
    }
  }

  /**
   * Default recovery strategy (simple retry with backoff)
   */
  getDefaultStrategy(attempt) {
    return {
      name: 'default_retry',
      modifications: [
        `Retry with ${Math.pow(2, attempt)}s backoff`,
        'No strategy modifications'
      ],
      adaptedContext: {
        retryDelay: Math.pow(2, attempt) * 1000
      }
    };
  }

  /**
   * Track strategy success/failure for learning
   */
  recordStrategyOutcome(strategyName, success) {
    if (!this.strategyHistory.has(strategyName)) {
      this.strategyHistory.set(strategyName, { successes: 0, failures: 0 });
    }

    const stats = this.strategyHistory.get(strategyName);
    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }
  }

  /**
   * Get strategy effectiveness statistics
   */
  getStrategyStats() {
    const stats = {};
    this.strategyHistory.forEach((value, key) => {
      const total = value.successes + value.failures;
      stats[key] = {
        ...value,
        successRate: total > 0 ? ((value.successes / total) * 100).toFixed(1) + '%' : 'N/A'
      };
    });
    return stats;
  }
}

module.exports = RecoveryStrategies;
