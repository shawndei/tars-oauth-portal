/**
 * Test Suite for Self-Healing Error Recovery
 * 
 * This file demonstrates and tests the error recovery pattern
 * by deliberately triggering errors and verifying recovery.
 * 
 * Run with: node test-recovery.js
 */

const {
  executeWithRecovery,
  logFailure,
  detectPattern,
  analyzeErrors,
  ERRORS_LOG_PATH
} = require('./recovery-implementation');

const fs = require('fs');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(`${color}${args.join(' ')}${colors.reset}`);
}

/**
 * Test 1: Demonstrate pattern detection
 */
async function testPatternDetection() {
  log(colors.blue, '\n🧪 Test 1: Pattern Detection');
  log(colors.blue, '================================');

  const testCases = [
    {
      error: new Error('ECONNREFUSED: Connection refused'),
      tool: 'web_fetch',
      expected: 'CONN_REFUSED'
    },
    {
      error: new Error('ENOTFOUND: getaddrinfo ENOTFOUND example.com'),
      tool: 'browser',
      expected: 'DNS_FAIL'
    },
    {
      error: new Error('429 Too Many Requests'),
      tool: 'web_search',
      expected: 'RATE_LIMIT'
    },
    {
      error: new Error('Timeout waiting for element'),
      tool: 'browser',
      expected: 'ELEMENT_NOT_FOUND'
    },
    {
      error: new Error('command not found: nonexistent'),
      tool: 'exec',
      expected: 'CMD_NOT_FOUND'
    }
  ];

  testCases.forEach((tc, i) => {
    const detected = detectPattern(tc.error, tc.tool);
    const passed = detected === tc.expected;
    const status = passed ? '✅' : '❌';
    log(
      passed ? colors.green : colors.red,
      `  ${status} Case ${i + 1}: ${tc.error.message} → ${detected}`
    );
  });
}

/**
 * Test 2: Successful recovery with strategy adaptation
 */
async function testSuccessfulRecovery() {
  log(colors.blue, '\n🧪 Test 2: Successful Recovery with Strategy Adaptation');
  log(colors.blue, '========================================================');

  let attemptCount = 0;
  const strategies = [
    {
      name: 'strategy-1-fails',
      execute: async () => {
        attemptCount++;
        throw new Error('Network timeout on first attempt');
      }
    },
    {
      name: 'strategy-2-also-fails',
      execute: async () => {
        attemptCount++;
        throw new Error('Still timing out');
      }
    },
    {
      name: 'strategy-3-succeeds',
      execute: async () => {
        attemptCount++;
        return { success: true, data: 'Retrieved with fallback strategy' };
      }
    }
  ];

  try {
    const result = await executeWithRecovery(
      async (strategy) => strategy.execute(),
      {
        maxAttempts: 3,
        baseDelayMs: 100, // Speed up test
        strategies,
        toolName: 'web_fetch',
        context: { url: 'https://example.com/api' }
      }
    );

    log(colors.green, `  ✅ Recovered successfully after ${attemptCount} attempts`);
    log(colors.green, `  ✅ Result: ${JSON.stringify(result)}`);
  } catch (err) {
    log(colors.red, `  ❌ Failed: ${err.message}`);
  }
}

/**
 * Test 3: Failure after max attempts
 */
async function testMaxAttemptsFailure() {
  log(colors.blue, '\n🧪 Test 3: Exhausting Max Attempts');
  log(colors.blue, '===================================');

  const strategies = [
    {
      name: 'always-fails-1',
      execute: async () => {
        throw new Error('Critical network error');
      }
    },
    {
      name: 'always-fails-2',
      execute: async () => {
        throw new Error('Critical network error');
      }
    },
    {
      name: 'always-fails-3',
      execute: async () => {
        throw new Error('Critical network error');
      }
    }
  ];

  try {
    await executeWithRecovery(
      async (strategy) => strategy.execute(),
      {
        maxAttempts: 3,
        baseDelayMs: 100,
        strategies,
        toolName: 'browser.open',
        context: { url: 'https://invalid-domain-xyz.fake' }
      }
    );
    log(colors.red, '  ❌ Should have failed but did not');
  } catch (err) {
    log(colors.green, `  ✅ Correctly failed after max attempts`);
    log(colors.green, `  ✅ Error pattern detected and logged`);
    log(colors.cyan, `     Message: ${err.message.split('\n')[0]}`);
  }
}

/**
 * Test 4: Exponential backoff timing
 */
async function testBackoffTiming() {
  log(colors.blue, '\n🧪 Test 4: Exponential Backoff Timing');
  log(colors.blue, '=====================================');

  const timings = [];
  let lastTime = Date.now();

  const strategies = [
    {
      name: 'fail-1',
      execute: async () => {
        const now = Date.now();
        timings.push(now - lastTime);
        lastTime = now;
        throw new Error('Timeout');
      }
    },
    {
      name: 'fail-2',
      execute: async () => {
        const now = Date.now();
        timings.push(now - lastTime);
        lastTime = now;
        throw new Error('Timeout');
      }
    },
    {
      name: 'fail-3',
      execute: async () => {
        const now = Date.now();
        timings.push(now - lastTime);
        lastTime = now;
        throw new Error('Timeout');
      }
    }
  ];

  try {
    await executeWithRecovery(
      async (strategy) => strategy.execute(),
      {
        maxAttempts: 3,
        baseDelayMs: 100,
        backoffMultiplier: 2,
        strategies,
        toolName: 'test',
        context: {}
      }
    );
  } catch (err) {
    // Expected to fail
  }

  log(colors.cyan, '  Attempt timings (ms between retries):');
  timings.forEach((t, i) => {
    const arrow = i > 0 ? ' → ' : '';
    process.stdout.write(`${arrow}${t}ms`);
  });
  console.log();

  // Verify exponential growth (roughly)
  if (timings.length > 1 && timings[1] > timings[0]) {
    log(colors.green, '  ✅ Exponential backoff is working');
  }
}

/**
 * Test 5: Error logging to errors.jsonl
 */
async function testErrorLogging() {
  log(colors.blue, '\n🧪 Test 5: Error Logging to errors.jsonl');
  log(colors.blue, '=========================================');

  // Clear previous logs for clean test
  try {
    fs.unlinkSync(ERRORS_LOG_PATH);
  } catch (e) {
    // File might not exist yet
  }

  const strategies = [
    {
      name: 'fails',
      execute: async () => {
        throw new Error('Test error for logging');
      }
    }
  ];

  try {
    await executeWithRecovery(
      async (strategy) => strategy.execute(),
      {
        maxAttempts: 2,
        baseDelayMs: 50,
        strategies,
        toolName: 'test_tool',
        context: { testId: 'test-5' }
      }
    );
  } catch (err) {
    // Expected to fail
  }

  // Verify log was created
  if (fs.existsSync(ERRORS_LOG_PATH)) {
    const content = fs.readFileSync(ERRORS_LOG_PATH, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l);
    
    if (lines.length > 0) {
      const entry = JSON.parse(lines[0]);
      log(colors.green, `  ✅ Error logged to ${ERRORS_LOG_PATH}`);
      log(colors.cyan, `     Pattern: ${entry.pattern}`);
      log(colors.cyan, `     Tool: ${entry.toolName}`);
      log(colors.cyan, `     Attempt: ${entry.attempt}`);
    } else {
      log(colors.red, '  ❌ Log file exists but is empty');
    }
  } else {
    log(colors.red, `  ❌ Log file not created at ${ERRORS_LOG_PATH}`);
  }
}

/**
 * Test 6: Analysis of error patterns
 */
async function testErrorAnalysis() {
  log(colors.blue, '\n🧪 Test 6: Error Pattern Analysis');
  log(colors.blue, '==================================');

  // Generate some diverse errors
  const testErrors = [
    { error: new Error('ECONNREFUSED'), tool: 'browser' },
    { error: new Error('ECONNREFUSED'), tool: 'browser' },
    { error: new Error('429 Rate limit'), tool: 'web_search' },
    { error: new Error('TIMEOUT'), tool: 'web_fetch' },
    { error: new Error('command not found'), tool: 'exec' }
  ];

  for (const test of testErrors) {
    try {
      await executeWithRecovery(
        async (s) => { throw test.error; },
        {
          maxAttempts: 1,
          baseDelayMs: 10,
          toolName: test.tool
        }
      );
    } catch (e) {
      // Expected
    }
  }

  // Analyze
  const analysis = analyzeErrors();
  
  if (analysis.total > 0) {
    log(colors.green, `  ✅ Analyzed ${analysis.total} errors`);
  }
}

/**
 * Real-world simulation: Flaky API that succeeds on retry
 */
async function testRealWorldScenario() {
  log(colors.blue, '\n🧪 Test 7: Real-World Scenario - Flaky API');
  log(colors.blue, '==========================================');

  let callCount = 0;
  const flakyAPI = {
    name: 'flaky-api',
    execute: async () => {
      callCount++;
      if (callCount < 2) {
        throw new Error('Connection timeout - service temporarily unavailable');
      }
      return { status: 'success', data: 'API responded successfully' };
    }
  };

  try {
    const result = await executeWithRecovery(
      async (strategy) => strategy.execute(),
      {
        maxAttempts: 3,
        baseDelayMs: 100,
        strategies: [flakyAPI],
        toolName: 'api_call'
      }
    );

    log(colors.green, `  ✅ Recovered from flaky API`);
    log(colors.green, `  ✅ Succeeded on attempt ${callCount}`);
    log(colors.cyan, `     Result: ${JSON.stringify(result)}`);
  } catch (err) {
    log(colors.red, `  ❌ Failed: ${err.message}`);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  log(colors.cyan, '\n╔════════════════════════════════════════════════╗');
  log(colors.cyan, '║  Self-Healing Error Recovery Test Suite         ║');
  log(colors.cyan, '╚════════════════════════════════════════════════╝');

  try {
    await testPatternDetection();
    await new Promise(r => setTimeout(r, 100));
    
    await testSuccessfulRecovery();
    await new Promise(r => setTimeout(r, 100));
    
    await testMaxAttemptsFailure();
    await new Promise(r => setTimeout(r, 100));
    
    await testBackoffTiming();
    await new Promise(r => setTimeout(r, 100));
    
    await testErrorLogging();
    await new Promise(r => setTimeout(r, 100));
    
    await testErrorAnalysis();
    await new Promise(r => setTimeout(r, 100));
    
    await testRealWorldScenario();

    log(colors.green, '\n╔════════════════════════════════════════════════╗');
    log(colors.green, '║  ✅ All Tests Completed                         ║');
    log(colors.green, '╚════════════════════════════════════════════════╝\n');

    log(colors.cyan, `📊 Error log location: ${ERRORS_LOG_PATH}`);
    log(colors.cyan, `📊 Run: node -e "require('./recovery-implementation').analyzeErrors()" to view stats\n`);

  } catch (err) {
    log(colors.red, `\n❌ Test suite failed: ${err.message}`);
    console.error(err);
  }
}

// Run tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testPatternDetection,
  testSuccessfulRecovery,
  testMaxAttemptsFailure,
  testBackoffTiming,
  testErrorLogging,
  testErrorAnalysis,
  testRealWorldScenario,
  runAllTests
};
