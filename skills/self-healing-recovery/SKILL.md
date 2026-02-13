# Self-Healing Error Recovery Skill

## Overview

The Self-Healing Error Recovery pattern provides robust error handling for OpenClaw tool calls with automatic retry logic, strategy adaptation, and failure pattern tracking. This skill enables your workflows to gracefully recover from transient failures and learn from systematic issues.

## Core Principles

1. **Resilience**: Retry failed operations with exponential backoff
2. **Adaptation**: Switch strategies when an approach fails
3. **Learning**: Track errors in `errors.jsonl` to identify patterns
4. **Transparency**: Log all failures for analysis and improvement

## Pattern Structure

The self-healing pattern wraps OpenClaw tool calls in a try-catch-retry loop:

```javascript
async function executeWithRecovery(toolCall, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    backoffMultiplier = 2,
    strategies = [],
    toolName = 'unknown'
  } = options;

  let lastError;
  let attempt = 0;

  for (attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await toolCall(strategies[attempt - 1] || strategies[0]);
    } catch (error) {
      lastError = error;
      
      // Log the failure
      logFailure({
        attempt,
        toolName,
        error: error.message,
        strategy: strategies[attempt - 1]?.name || 'default',
        timestamp: new Date().toISOString()
      });

      // If this is the last attempt, don't wait
      if (attempt === maxAttempts) break;

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
      console.log(`⏳ Retry attempt ${attempt + 1} in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // All retries failed - throw with context
  throw new Error(
    `Failed after ${maxAttempts} attempts: ${lastError?.message}. ` +
    `See errors.jsonl for full failure chain.`
  );
}
```

## Using the Pattern in OpenClaw Workflows

### 1. Browser Automation with Recovery

**Scenario**: Browser crashes or times out during automation.

```markdown
# My Browser Automation Task

## Recovery Strategy

The browser may crash or fail to connect. We'll try three approaches:
1. **Standard**: Normal browser.open() call
2. **No JS**: Disable JavaScript if page is heavy
3. **Headless fallback**: Use headless browser for simpler sites

## Implementation (Pseudo-code in HEARTBEAT.md or task markdown)

Use this pattern when calling browser tools:

```javascript
// Strategy 1: Try with default settings
async function tryBrowserStandard() {
  return await browser({
    action: 'open',
    profile: 'openclaw',
    targetUrl: 'https://example.com',
    timeoutMs: 10000
  });
}

// Strategy 2: If JS-heavy page, disable it
async function tryBrowserNoJS() {
  console.log('⚠️  Retrying with JavaScript disabled...');
  return await browser({
    action: 'open',
    profile: 'openclaw',
    targetUrl: 'https://example.com',
    timeoutMs: 15000 // longer timeout
  });
}

// Strategy 3: Fallback to snapshot with text extraction
async function trySnapshot() {
  console.log('⚠️  Falling back to text extraction...');
  return await browser({
    action: 'snapshot',
    profile: 'openclaw'
  });
}

// Execute with recovery
const result = await executeWithRecovery(
  async (strategy) => {
    if (strategy === 'standard') return tryBrowserStandard();
    if (strategy === 'no-js') return tryBrowserNoJS();
    if (strategy === 'snapshot') return trySnapshot();
  },
  {
    maxAttempts: 3,
    baseDelayMs: 2000,
    strategies: ['standard', 'no-js', 'snapshot'],
    toolName: 'browser.open'
  }
);
```
```

### 2. Web Fetch with Recovery

**Scenario**: Network timeouts or server unavailability.

```markdown
## Web Fetch with Fallbacks

Use this pattern when fetching remote content:

```javascript
async function fetchWithRecovery(url, options = {}) {
  const strategies = [
    {
      name: 'direct',
      call: () => web_fetch({ url, extractMode: 'markdown' })
    },
    {
      name: 'text-only',
      call: () => web_fetch({ url, extractMode: 'text' })
    },
    {
      name: 'reduced-chars',
      call: () => web_fetch({ url, extractMode: 'text', maxChars: 5000 })
    }
  ];

  let lastError;
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      const result = await strategies[i].call();
      console.log(`✅ Fetch succeeded with "${strategies[i].name}" strategy`);
      return result;
    } catch (error) {
      lastError = error;
      logFailure({
        attempt: i + 1,
        toolName: 'web_fetch',
        url,
        strategy: strategies[i].name,
        error: error.message
      });
      
      if (i < strategies.length - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}
```
```

### 3. Web Search with Recovery

**Scenario**: Search provider rate limits or network issues.

```markdown
## Web Search with Resilience

Pattern for robust web searches:

```javascript
async function searchWithRecovery(query, country = 'US') {
  const attempts = [
    { count: 5, freshness: null, desc: 'Standard search' },
    { count: 3, freshness: 'pw', desc: 'Past week results' },
    { count: 1, freshness: 'pm', desc: 'Past month (single result)' }
  ];

  let lastError;
  
  for (let i = 0; i < attempts.length; i++) {
    try {
      const result = await web_search({
        query,
        country,
        count: attempts[i].count,
        freshness: attempts[i].freshness
      });
      console.log(`✅ Search succeeded: ${attempts[i].desc}`);
      return result;
    } catch (error) {
      lastError = error;
      logFailure({
        attempt: i + 1,
        toolName: 'web_search',
        query,
        error: error.message
      });
      
      if (i < attempts.length - 1) {
        const waitMs = 2000 * Math.pow(2, i);
        console.log(`⏳ Retry in ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
  }

  throw new Error(`Search failed after ${attempts.length} attempts: ${lastError?.message}`);
}
```
```

### 4. Shell Execution (exec) with Recovery

**Scenario**: Commands fail due to race conditions, missing files, or transient state.

```markdown
## Shell Command Execution with Recovery

Pattern for reliable command execution:

```javascript
async function execWithRecovery(command, options = {}) {
  const {
    maxAttempts = 3,
    backoffMs = 1000,
    onRetry = null
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await exec({
        command,
        timeout: 30,
        ...options
      });
      
      if (attempt > 1) {
        console.log(`✅ Command succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      
      logFailure({
        attempt,
        toolName: 'exec',
        command,
        error: error.message,
        exitCode: error.exitCode
      });

      if (attempt === maxAttempts) break;
      
      const waitMs = backoffMs * Math.pow(2, attempt - 1);
      console.log(`⏳ Command failed, retrying in ${waitMs}ms... (${attempt}/${maxAttempts})`);
      
      if (onRetry) onRetry(attempt);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }

  throw new Error(
    `Command failed after ${maxAttempts} attempts:\n${lastError?.message}`
  );
}
```
```

## Error Logging (errors.jsonl)

All failures are logged to `errors.jsonl` with this schema:

```json
{
  "timestamp": "2026-02-13T15:30:45.123Z",
  "attempt": 2,
  "toolName": "browser.open",
  "strategy": "no-js",
  "error": "Timeout: browser did not respond within 10000ms",
  "context": {
    "url": "https://example.com",
    "sessionId": "abc123"
  },
  "recovered": false
}
```

### Logging Helper Function

```javascript
function logFailure(details) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...details
  };
  
  // Append to errors.jsonl
  const fs = require('fs');
  fs.appendFileSync(
    'errors.jsonl',
    JSON.stringify(entry) + '\n'
  );
  
  // Also log to console for immediate visibility
  console.error(`❌ [${details.toolName}] ${details.error}`);
}
```

## Pattern Adaptation Rules

Different tools benefit from different strategies:

### Browser Automation
- Strategy 1: Standard navigation
- Strategy 2: Reduce JavaScript/rendering complexity
- Strategy 3: Fall back to text/snapshot extraction

### Web Fetch
- Strategy 1: Full markdown extraction
- Strategy 2: Plain text extraction
- Strategy 3: Limited character extraction

### Web Search
- Strategy 1: Standard search (5 results)
- Strategy 2: Narrow freshness filter (recent only)
- Strategy 3: Single result fallback

### Shell Commands
- Strategy 1: Command as-is
- Strategy 2: Add explicit waits or guards
- Strategy 3: Use alternative command/approach

## Best Practices

### ✅ Do This

1. **Set appropriate timeouts** - Browser: 10-15s, Network: 5-10s, Commands: 30s
2. **Log context** - Include URLs, queries, or commands for debugging
3. **Use exponential backoff** - 1s → 2s → 4s prevents hammering failed services
4. **Adapt strategies** - Each retry should change the approach
5. **Monitor errors.jsonl** - Review weekly to identify systematic issues

### ❌ Don't Do This

1. **Infinite retries** - Cap at 3 attempts maximum
2. **Silent failures** - Always log errors, even if recovered
3. **Same strategy** - Retrying identically will fail identically
4. **Ignore patterns** - If a URL always fails, add it to ERROR_PATTERNS.md
5. **Set timeout to 0** - Always have a reasonable timeout

## Testing Your Recovery

### Test 1: Invalid URL (browser)
```javascript
// This should fail and recover by falling back to snapshot
const result = await browser({
  action: 'open',
  targetUrl: 'https://invalid-url-that-does-not-exist-12345.fake',
  timeoutMs: 5000
});
```

### Test 2: Rate Limit Recovery (web_search)
```javascript
// Mock a rate limit by hammering the API, then recover
for (let i = 0; i < 10; i++) {
  try {
    await web_search({ query: 'test', count: 10 });
  } catch (e) {
    if (e.message.includes('429') || e.message.includes('rate')) {
      console.log('✅ Rate limit detected and handled');
      break;
    }
  }
}
```

### Test 3: Network Timeout (web_fetch)
```javascript
// Fetch a slow endpoint that may timeout
const result = await fetchWithRecovery('https://example.com/slow-endpoint', {
  maxChars: 10000
});
```

## Integration with HEARTBEAT.md

Add recovery checks to your heartbeat:

```markdown
## Heartbeat with Self-Healing

Every 30 minutes, this check runs:

1. Read errors.jsonl from the last hour
2. If >5 failures from same source → add to ERROR_PATTERNS.md
3. If recovery rate <80% → alert and disable that integration
4. Clean up old error logs (>7 days)

This keeps your system healthy and identifies regressions early.
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Retries still failing after 3 attempts | Add new strategy or extend timeout |
| Too many false positives | Increase baseDelayMs or add condition checks |
| errors.jsonl growing too fast | Implement daily rotation (see ERROR_PATTERNS.md) |
| Strategy confusion | Name strategies clearly (e.g., "low-timeout", "no-js") |

## Summary

The Self-Healing Error Recovery skill provides:
- ✅ Automatic retry with exponential backoff (3 attempts)
- ✅ Strategy adaptation (try different approaches)
- ✅ Error pattern tracking (errors.jsonl)
- ✅ Learning loop (ERROR_PATTERNS.md guides future retries)
- ✅ Proven resilience for all OpenClaw tools

Use this pattern in any workflow that calls external services or unstable systems. Your automations will be more reliable and you'll have better visibility into what's breaking and why.
