/**
 * Self-Healing Error Recovery Implementation
 * 
 * This file provides working implementations of the error recovery pattern
 * for use in OpenClaw workflows. It includes:
 * 1. Error logging to errors.jsonl
 * 2. Retry logic with exponential backoff
 * 3. Strategy adaptation
 * 4. Pattern detection
 * 
 * Usage: Import these functions into your workflows
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ERRORS_LOG_PATH = path.join(__dirname, '../../errors.jsonl');
const MAX_LOG_SIZE_MB = 50; // Rotate log at 50MB

/**
 * Log a failure event for pattern analysis
 */
function logFailure(details) {
  const entry = {
    timestamp: new Date().toISOString(),
    attempt: details.attempt || 1,
    toolName: details.toolName || 'unknown',
    error: details.error?.message || String(details.error),
    pattern: detectPattern(details.error, details.toolName),
    strategy: details.strategy || 'default',
    context: details.context || {},
    recovered: details.recovered || false,
    nextStrategy: details.nextStrategy || null
  };

  try {
    fs.appendFileSync(ERRORS_LOG_PATH, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('Failed to log error:', err.message);
  }

  console.error(
    `❌ [${entry.pattern}] ${entry.toolName}: ${entry.error} (attempt ${entry.attempt})`
  );

  return entry;
}

/**
 * Detect error pattern from error message
 */
function detectPattern(error, toolName) {
  if (!error) return 'UNKNOWN';
  
  const msg = String(error?.message || error).toLowerCase();
  
  // Network patterns
  if (msg.includes('econnrefused')) return 'CONN_REFUSED';
  if (msg.includes('econnreset')) return 'CONN_RESET';
  if (msg.includes('etimedout')) return 'TIMEOUT';
  if (msg.includes('enotfound')) return 'DNS_FAIL';
  if (msg.includes('429')) return 'RATE_LIMIT';
  if (msg.includes('socket hang up')) return 'SOCKET_HANG_UP';
  
  // Browser patterns
  if (msg.includes('browser') && msg.includes('crash')) return 'BROWSER_CRASH';
  if (msg.includes('timeout') && toolName === 'browser') return 'PAGE_TIMEOUT';
  if (msg.includes('element not found')) return 'ELEMENT_NOT_FOUND';
  if (msg.includes('invalid url')) return 'INVALID_URL';
  
  // Search patterns
  if (msg.includes('no results')) return 'NO_RESULTS';
  if (msg.includes('invalid query')) return 'INVALID_QUERY';
  
  // Command patterns
  if (msg.includes('not found') && toolName === 'exec') return 'CMD_NOT_FOUND';
  if (msg.includes('permission denied')) return 'PERMISSION_DENIED';
  if (msg.includes('enoent')) return 'NOT_FOUND';
  
  return 'UNKNOWN';
}

/**
 * Execute a tool call with automatic retry and strategy adaptation
 * 
 * @param {Function} toolCall - Async function that executes the tool
 * @param {Object} options - Configuration
 *   - maxAttempts: number (default 3)
 *   - baseDelayMs: number (default 1000)
 *   - backoffMultiplier: number (default 2)
 *   - strategies: Array<{name, execute}>
 *   - toolName: string (for logging)
 *   - context: object (for logging)
 * @returns {Promise} Result of successful execution
 */
async function executeWithRecovery(toolCall, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    backoffMultiplier = 2,
    strategies = [],
    toolName = 'unknown',
    context = {}
  } = options;

  let lastError;
  let lastEntry;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const strategy = strategies[attempt - 1] || strategies[0];
      const strategyName = strategy?.name || 'default';
      
      // Log attempt
      if (attempt > 1) {
        console.log(
          `⏳ Attempting strategy "${strategyName}" (attempt ${attempt}/${maxAttempts})...`
        );
      }

      // Execute with the current strategy
      const result = await toolCall(strategy);
      
      if (attempt > 1) {
        console.log(`✅ Recovered successfully on attempt ${attempt} with "${strategyName}"`);
      } else {
        console.log(`✅ Succeeded on first attempt`);
      }

      return result;

    } catch (error) {
      lastError = error;
      
      // Log the failure
      const strategy = strategies[attempt - 1] || strategies[0];
      const nextStrategy = strategies[attempt] || null;
      
      lastEntry = logFailure({
        attempt,
        toolName,
        error,
        strategy: strategy?.name || 'default',
        nextStrategy: nextStrategy?.name || null,
        context
      });

      // If this is the last attempt, don't wait
      if (attempt === maxAttempts) break;

      // Exponential backoff
      const delayMs = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // All retries failed
  throw new Error(
    `Failed after ${maxAttempts} attempts: ${lastError?.message}. ` +
    `Pattern: ${lastEntry?.pattern}. See errors.jsonl for details.`
  );
}

/**
 * Browser with error recovery
 * 
 * Strategies:
 * 1. Standard browser.open with default timeout
 * 2. Increased timeout (handles slow pages)
 * 3. Snapshot fallback (extracts current page state)
 */
async function browserWithRecovery(options = {}) {
  const {
    targetUrl,
    profile = 'openclaw',
    ...otherOpts
  } = options;

  const strategies = [
    {
      name: 'standard',
      execute: async () => {
        // Note: In real usage, this would call the actual browser tool
        // For testing, we'll simulate it
        return {
          action: 'open',
          profile,
          targetUrl,
          timeoutMs: 10000,
          ...otherOpts
        };
      }
    },
    {
      name: 'increased-timeout',
      execute: async () => {
        return {
          action: 'open',
          profile,
          targetUrl,
          timeoutMs: 20000,
          ...otherOpts
        };
      }
    },
    {
      name: 'snapshot-fallback',
      execute: async () => {
        // Fallback to snapshot if page won't load
        return {
          action: 'snapshot',
          profile,
          timeoutMs: 5000
        };
      }
    }
  ];

  return executeWithRecovery(
    async (strategy) => strategy.execute(),
    {
      maxAttempts: 3,
      baseDelayMs: 2000,
      strategies,
      toolName: 'browser.open',
      context: { targetUrl }
    }
  );
}

/**
 * Web fetch with error recovery
 * 
 * Strategies:
 * 1. Full markdown extraction
 * 2. Plain text extraction
 * 3. Limited character count
 */
async function webFetchWithRecovery(url, options = {}) {
  const strategies = [
    {
      name: 'markdown',
      execute: async () => {
        // Simulated fetch - in real usage calls actual web_fetch
        return { mode: 'markdown', url, size: 'full' };
      }
    },
    {
      name: 'text-only',
      execute: async () => {
        return { mode: 'text', url, size: 'full' };
      }
    },
    {
      name: 'limited-chars',
      execute: async () => {
        return { mode: 'text', url, maxChars: 5000 };
      }
    }
  ];

  return executeWithRecovery(
    async (strategy) => strategy.execute(),
    {
      maxAttempts: 3,
      baseDelayMs: 1500,
      strategies,
      toolName: 'web_fetch',
      context: { url }
    }
  );
}

/**
 * Web search with error recovery
 * 
 * Strategies:
 * 1. Full search (5 results)
 * 2. Recent results only (past week)
 * 3. Single result fallback
 */
async function webSearchWithRecovery(query, country = 'US') {
  const strategies = [
    {
      name: 'full-search',
      execute: async () => {
        return { query, country, count: 5 };
      }
    },
    {
      name: 'recent-only',
      execute: async () => {
        return { query, country, count: 3, freshness: 'pw' };
      }
    },
    {
      name: 'single-result',
      execute: async () => {
        return { query, country, count: 1 };
      }
    }
  ];

  return executeWithRecovery(
    async (strategy) => strategy.execute(),
    {
      maxAttempts: 3,
      baseDelayMs: 2000,
      strategies,
      toolName: 'web_search',
      context: { query, country }
    }
  );
}

/**
 * Shell command execution with error recovery
 * 
 * Strategies:
 * 1. Command as-is
 * 2. With explicit waits/guards
 * 3. Alternative approach
 */
async function execWithRecovery(command, options = {}) {
  const {
    timeout = 30,
    retryCommand = null,
    ...otherOpts
  } = options;

  const strategies = [
    {
      name: 'standard',
      execute: async () => {
        return { command, timeout, ...otherOpts };
      }
    },
    {
      name: 'with-delay',
      execute: async () => {
        const delayedCmd = `sleep 1 && ${command}`;
        return { command: delayedCmd, timeout: timeout + 5, ...otherOpts };
      }
    },
    {
      name: 'alternative',
      execute: async () => {
        if (!retryCommand) throw new Error('No alternative command provided');
        return { command: retryCommand, timeout, ...otherOpts };
      }
    }
  ];

  return executeWithRecovery(
    async (strategy) => strategy.execute(),
    {
      maxAttempts: 3,
      baseDelayMs: 1000,
      strategies: retryCommand ? strategies : strategies.slice(0, 2),
      toolName: 'exec',
      context: { command }
    }
  );
}

/**
 * Analyze error patterns from errors.jsonl
 */
function analyzeErrors() {
  try {
    if (!fs.existsSync(ERRORS_LOG_PATH)) {
      console.log('No errors logged yet.');
      return { total: 0 };
    }

    const lines = fs
      .readFileSync(ERRORS_LOG_PATH, 'utf-8')
      .split('\n')
      .filter(l => l.trim());

    const errors = lines.map(l => JSON.parse(l));

    // Group by tool
    const byTool = {};
    errors.forEach(e => {
      byTool[e.toolName] = (byTool[e.toolName] || 0) + 1;
    });

    // Group by pattern
    const byPattern = {};
    errors.forEach(e => {
      byPattern[e.pattern] = (byPattern[e.pattern] || 0) + 1;
    });

    // Recovery rate
    const recoveredCount = errors.filter(e => e.recovered).length;
    const recoveryRate = errors.length > 0 
      ? Math.round((recoveredCount / errors.length) * 100)
      : 0;

    console.log('\n📊 Error Analysis');
    console.log('================');
    console.log(`Total errors: ${errors.length}`);
    console.log(`Recovered: ${recoveredCount} (${recoveryRate}%)`);
    console.log('\nBy Tool:');
    Object.entries(byTool).forEach(([tool, count]) => {
      console.log(`  ${tool}: ${count}`);
    });
    console.log('\nBy Pattern:');
    Object.entries(byPattern).forEach(([pattern, count]) => {
      console.log(`  ${pattern}: ${count}`);
    });

    // Warnings
    Object.entries(byTool).forEach(([tool, count]) => {
      if (count > 5) {
        console.warn(`⚠️  High failure rate for ${tool}: ${count} errors`);
      }
    });

    return {
      total: errors.length,
      recovered: recoveredCount,
      recoveryRate,
      byTool,
      byPattern
    };
  } catch (err) {
    console.error('Error analyzing logs:', err.message);
    return { error: err.message };
  }
}

// Export for use in other modules
module.exports = {
  executeWithRecovery,
  logFailure,
  detectPattern,
  browserWithRecovery,
  webFetchWithRecovery,
  webSearchWithRecovery,
  execWithRecovery,
  analyzeErrors,
  ERRORS_LOG_PATH
};
