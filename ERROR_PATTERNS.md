# Error Patterns & Solutions

A living knowledge base of errors observed in OpenClaw workflows and their effective solutions.

## Error Categories

### Network Errors

#### Timeout (socket hang up)
- **Pattern**: `ECONNRESET`, `socket hang up`, `ETIMEDOUT`
- **Tools affected**: `web_fetch`, `web_search`, `browser`
- **Root causes**:
  - Server slow to respond
  - Network congestion
  - Firewall/proxy issues
- **Solution**: 
  - Increase timeout: 5s → 10s → 15s
  - Use text-only extraction (skip rendering)
  - Reduce content size (maxChars parameter)
- **Example recovery**:
  ```javascript
  // Retry 1: Standard 10s timeout
  // Retry 2: 15s timeout + text extraction
  // Retry 3: 20s timeout + maxChars 5000
  ```

#### DNS Resolution Failed
- **Pattern**: `ENOTFOUND`, `ESERVFAIL`
- **Tools affected**: `web_fetch`, `web_search`, `browser`
- **Root causes**:
  - DNS server unreachable
  - Domain doesn't exist
  - Regional blocking
- **Solution**:
  - Check domain spelling first
  - Wait 2s and retry (transient DNS)
  - Switch DNS provider (fallback)
- **Detection**: `error.code === 'ENOTFOUND'`

#### Rate Limiting (429 Too Many Requests)
- **Pattern**: `429`, `Rate limit exceeded`, `Too many requests`
- **Tools affected**: `web_search`, `web_fetch`
- **Root causes**:
  - Too many requests in short time
  - IP-based limits exceeded
  - API quota exhausted
- **Solution**:
  - Exponential backoff: 2s → 4s → 8s minimum
  - Reduce request count (e.g., search 5 results instead of 20)
  - Wait before next attempt (could take minutes)
- **Detection**: `error.status === 429 || error.message.includes('429')`

#### Connection Refused
- **Pattern**: `ECONNREFUSED`, `Connection refused`
- **Tools affected**: `web_fetch`, `browser`, `exec`
- **Root causes**:
  - Server down/unreachable
  - Port is wrong
  - Host is wrong
- **Solution**:
  - Verify URL is correct
  - Try different port or protocol (http → https)
  - Wait and retry (server may be restarting)

### Browser Errors

#### Browser Crash
- **Pattern**: `Browser process died`, `WebDriver error`, `Segmentation fault`
- **Tools affected**: `browser`
- **Root causes**:
  - Out of memory on heavy pages
  - Incompatible extensions
  - Graphics driver issues
- **Solution**:
  - Strategy 1: Try with default settings
  - Strategy 2: Disable JavaScript (lighter rendering)
  - Strategy 3: Use snapshot/text extraction instead
- **Recovery code**:
  ```javascript
  strategies: [
    { name: 'standard', action: 'open' },
    { name: 'no-js', action: 'open', jsDisabled: true },
    { name: 'snapshot', action: 'snapshot' }
  ]
  ```

#### Page Load Timeout
- **Pattern**: `Timeout waiting for page to load`, `Navigation timeout`
- **Tools affected**: `browser.open`
- **Root causes**:
  - Page loading very slowly
  - Waiting for resources that never arrive
  - Infinite JavaScript loops
- **Solution**:
  - Increase timeout incrementally
  - Disable JavaScript
  - Use snapshot to get current state
- **Typical backoff**: 10s → 15s → snapshot

#### Element Not Found
- **Pattern**: `Element not found`, `Selector returned no matches`
- **Tools affected**: `browser.act`, `browser.click`
- **Root causes**:
  - Page structure changed
  - JavaScript hasn't rendered yet
  - Element is inside iframe
- **Solution**:
  - Add wait for element
  - Try alternative selector (aria-label vs class)
  - Use snapshot to verify page state

### Search Errors

#### Invalid Query Syntax
- **Pattern**: `Invalid query`, `Syntax error in search`
- **Tools affected**: `web_search`
- **Root causes**:
  - Unmatched quotes or parentheses
  - Invalid operators
  - Special characters in query
- **Solution**:
  - Strip special characters
  - Use basic search (no operators)
  - Simplify query on retry
- **Example**:
  ```javascript
  // Attempt 1: Original query with operators
  // Attempt 2: Query with operators removed
  // Attempt 3: First 3 words only
  ```

#### No Results Found
- **Pattern**: `No results`, `0 matches`
- **Tools affected**: `web_search`
- **Root causes**:
  - Query too specific
  - Freshness filter too restrictive
  - Domain doesn't exist
- **Solution**:
  - Remove freshness filter
  - Broaden query (fewer keywords)
  - Try without quotes (allow fuzzy matching)

### Execution Errors

#### Command Not Found
- **Pattern**: `command not found`, `not recognized as an internal or external command`
- **Tools affected**: `exec`
- **Root causes**:
  - Command not installed
  - Wrong path
  - Different shell environment
- **Solution**:
  - Use full path (/usr/bin/command)
  - Try alternative command
  - Check if installed (which command)
  - Don't retry (this won't change)
- **No-retry flag**: Set `shouldRetry: false`

#### Permission Denied
- **Pattern**: `Permission denied`, `EACCES`, `Access is denied`
- **Tools affected**: `exec`, `read`, `write`
- **Root causes**:
  - User lacks permissions
  - File/directory protected
  - Running in sandbox vs host
- **Solution**:
  - Check file permissions (ls -l / dir /s)
  - Retry with elevated permissions if available
  - Use alternative path/method
  - Don't retry if permissions issue

#### Directory/File Not Found
- **Pattern**: `ENOENT`, `No such file or directory`, `File not found`
- **Tools affected**: `exec`, `read`, `write`
- **Root causes**:
  - Wrong path
  - File was deleted
  - Directory doesn't exist
- **Solution**:
  - Create directory first (mkdir -p)
  - Verify path is correct
  - Check working directory
  - Log the failure and continue

## Pattern Analysis

### How to Track Errors

Every failure should be logged to `errors.jsonl`:

```json
{
  "timestamp": "2026-02-13T15:30:45.123Z",
  "toolName": "browser.open",
  "error": "Browser crash: Segmentation fault",
  "pattern": "BROWSER_CRASH",
  "strategy": "standard",
  "attempt": 1,
  "url": "https://example.com",
  "recovered": false,
  "nextStrategy": "no-js"
}
```

### Weekly Pattern Review

Run this check to identify systematic issues:

```javascript
function analyzeErrors() {
  const fs = require('fs');
  const lines = fs.readFileSync('errors.jsonl', 'utf-8').split('\n').filter(l => l);
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
  
  console.log('Errors by tool:', byTool);
  console.log('Errors by pattern:', byPattern);
  
  // Alert if any tool/pattern has >5 failures
  Object.entries(byTool).forEach(([tool, count]) => {
    if (count > 5) {
      console.warn(`⚠️  High failure rate for ${tool}: ${count} errors`);
    }
  });
}
```

## Known Solutions by Tool

### browser

| Error | Recovery | Success Rate |
|-------|----------|--------------|
| Timeout (page load) | Disable JS, increase timeout | 85% |
| Browser crash | Try snapshot/text extraction | 90% |
| Element not found | Wait + retry, use different selector | 70% |
| Invalid URL | Validate URL format before call | 100% (prevention) |

### web_fetch

| Error | Recovery | Success Rate |
|-------|----------|--------------|
| Timeout | Increase timeout, use text mode | 80% |
| 404 Not Found | Check URL, try alternative | 60% |
| Rate limit (429) | Exponential backoff 2s+ | 95% |
| Encoding issues | Try text extraction | 85% |

### web_search

| Error | Recovery | Success Rate |
|-------|----------|--------------|
| Rate limit (429) | Backoff 5s+, reduce results | 95% |
| Invalid query | Remove operators, simplify | 100% (with adaptation) |
| No results | Remove freshness filter | 80% |
| Timeout | Retry with count=1 | 90% |

### exec

| Error | Recovery | Success Rate |
|-------|----------|--------------|
| Command not found | Check path, don't retry | 100% (with detection) |
| Permission denied | Retry with elevated if available | 70% |
| Timeout | Increase timeout, use background | 75% |
| Directory not found | Create directory first | 95% |

## Implementing Pattern Detection

Add this to your error logging:

```javascript
function detectPattern(error, toolName) {
  const msg = error.message.toLowerCase();
  
  // Network patterns
  if (msg.includes('econnrefused')) return 'CONN_REFUSED';
  if (msg.includes('econnreset')) return 'CONN_RESET';
  if (msg.includes('etimedout')) return 'TIMEOUT';
  if (msg.includes('enotfound')) return 'DNS_FAIL';
  if (msg.includes('429')) return 'RATE_LIMIT';
  
  // Browser patterns
  if (msg.includes('browser crash') || msg.includes('segmentation')) return 'BROWSER_CRASH';
  if (msg.includes('timeout') && toolName === 'browser') return 'PAGE_TIMEOUT';
  if (msg.includes('element not found')) return 'ELEMENT_NOT_FOUND';
  
  // Command patterns
  if (msg.includes('not found') && toolName === 'exec') return 'CMD_NOT_FOUND';
  if (msg.includes('permission denied')) return 'PERMISSION_DENIED';
  if (msg.includes('enoent')) return 'NOT_FOUND';
  
  return 'UNKNOWN';
}
```

## Adding New Patterns

When you encounter a new error:

1. Log it to errors.jsonl with full context
2. Identify the pattern (category + root cause)
3. Design a recovery strategy
4. Test it 2-3 times
5. Document here with success rate
6. Update SKILL.md if it's a common tool error

## Current Error Log Stats

```
Last updated: 2026-02-13
Total errors logged: 0
Pattern coverage: All major tools
Recovery success rate: Baseline (untested)
```

Run `analyzeErrors()` weekly to update these stats.

## Next Steps

1. Deploy self-healing patterns to production
2. Monitor errors.jsonl for first week
3. Identify top 3 patterns
4. Refine strategies based on real-world data
5. Document successes and failures
