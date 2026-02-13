# Self-Healing Error Recovery Examples

Practical examples of using the self-healing recovery pattern in your OpenClaw workflows.

## Example 1: Browser Automation with Fallback Strategies

**Scenario**: You need to scrape a website that might be slow or crash.

### The Problem
Browser automation can fail due to:
- Pages loading slowly
- Heavy JavaScript rendering
- Browser memory issues
- Network timeouts

### The Solution

Create a task with multiple fallback strategies:

```javascript
// In your workflow script
const { browserWithRecovery } = require('./recovery-implementation');

async function scrapeProductPage(productId) {
  try {
    // Try to open browser with different strategies
    const result = await browserWithRecovery({
      targetUrl: `https://example.com/product/${productId}`,
      profile: 'openclaw',
      timeoutMs: 10000
    });
    
    console.log('✅ Successfully opened product page');
    return result;
    
  } catch (error) {
    console.error('❌ All strategies failed:', error.message);
    // Handle gracefully - maybe notify user or skip this product
    return null;
  }
}
```

### How It Works

1. **Strategy 1 (Standard)**: Opens browser normally with 10s timeout
   - If page is reasonably fast, this works immediately
   - No delay on first try

2. **Strategy 2 (Increased Timeout)**: Same request but 20s timeout
   - For slow pages that just need more time
   - Waits 2 seconds before trying (exponential backoff)

3. **Strategy 3 (Snapshot)**: Extracts current page state as text
   - If browser can't load page, at least get what's there
   - Fallback for very heavy pages

### Example Output

```
✅ Successfully opened product page
(on first attempt with Standard strategy)

OR if slow:

⏳ Attempting strategy "increased-timeout" (attempt 2/3)...
✅ Recovered successfully on attempt 2 with "increased-timeout"

OR if very heavy:

⏳ Attempting strategy "snapshot-fallback" (attempt 3/3)...
✅ Recovered successfully on attempt 3 with "snapshot-fallback"
```

---

## Example 2: Web Scraping with Network Error Recovery

**Scenario**: Fetch article content from multiple sources with unreliable networks.

### The Problem
Network calls can fail due to:
- Temporary DNS failures
- Rate limiting (429 errors)
- Slow or congested networks
- Server overload

### The Solution

```javascript
const { webFetchWithRecovery } = require('./recovery-implementation');

async function fetchArticle(url) {
  try {
    // Fetch with automatic fallback to simpler extraction
    const content = await webFetchWithRecovery(url, {
      maxAttempts: 3
    });
    
    console.log(`✅ Fetched article from ${url}`);
    console.log(`Content length: ${content.length} characters`);
    return content;
    
  } catch (error) {
    console.error(`Failed to fetch ${url}: ${error.message}`);
    return null;
  }
}

// Usage in a batch operation
async function fetchMultipleArticles(urls) {
  const results = [];
  
  for (const url of urls) {
    const content = await fetchArticle(url);
    if (content) {
      results.push({ url, content, status: 'success' });
    } else {
      results.push({ url, content: null, status: 'failed' });
    }
  }
  
  return results;
}

// Example call
fetchMultipleArticles([
  'https://example.com/article1',
  'https://example.com/article2',
  'https://example.com/article3'
]).then(results => {
  console.log(`Fetched ${results.filter(r => r.status === 'success').length}/3 articles`);
});
```

### Recovery Strategies

1. **Markdown Extraction**: Full page with formatting
2. **Text Only**: Plain text (faster, lower bandwidth)
3. **Limited Characters**: Max 5000 chars (handles timeouts)

### Error Patterns Handled

- `ECONNREFUSED` → Retry with text extraction
- `ENOTFOUND` → Wait and retry DNS lookup
- `ETIMEDOUT` → Use limited character extraction
- `429 (Rate Limit)` → Wait longer between retries

---

## Example 3: Search with Progressive Fallback

**Scenario**: Search the web with handling for rate limits and no results.

### The Problem
Web search can fail when:
- API rate limits kick in
- Search has no results
- Network is unreliable

### The Solution

```javascript
const { webSearchWithRecovery } = require('./recovery-implementation');

async function searchTopic(topic, country = 'US') {
  try {
    const results = await webSearchWithRecovery(topic, country);
    
    console.log(`✅ Found ${results.length} results for "${topic}"`);
    return results;
    
  } catch (error) {
    if (error.message.includes('RATE_LIMIT')) {
      console.warn('⚠️  Search rate limited - backing off');
      // Wait longer before next search
      await new Promise(r => setTimeout(r, 5000));
    } else {
      console.error(`Search failed: ${error.message}`);
    }
    return [];
  }
}

// Batch search with smart rate limiting
async function searchTopics(topics) {
  const allResults = {};
  
  for (const topic of topics) {
    console.log(`Searching: ${topic}`);
    const results = await searchTopic(topic);
    allResults[topic] = results;
    
    // Delay between searches to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
  
  return allResults;
}

// Example: Research multiple topics
searchTopics([
  'OpenClaw error recovery',
  'Node.js best practices',
  'API resilience patterns'
]).then(results => {
  Object.entries(results).forEach(([topic, res]) => {
    console.log(`${topic}: ${res.length} results`);
  });
});
```

### Search Strategies

1. **Full Search**: 5 results, any freshness
2. **Recent Only**: 3 results, past week
3. **Single Result**: 1 result fallback

---

## Example 4: Shell Command Execution with Guards

**Scenario**: Run commands that might fail due to race conditions or missing state.

### The Problem
Shell commands can fail when:
- File system is slow to update
- Previous operation didn't complete
- Resources are locked
- Permissions change

### The Solution

```javascript
const { execWithRecovery } = require('./recovery-implementation');

async function createAndCopyFile(sourceFile, destDir) {
  try {
    // Ensure destination directory exists
    await execWithRecovery(
      `mkdir -p "${destDir}"`,
      { timeout: 10 }
    );
    
    console.log('✅ Directory created');
    
    // Copy file with retry on lock
    const result = await execWithRecovery(
      `cp "${sourceFile}" "${destDir}/"`,
      {
        timeout: 30,
        retryCommand: `sleep 1 && cp "${sourceFile}" "${destDir}/"` // with delay
      }
    );
    
    console.log('✅ File copied successfully');
    return result;
    
  } catch (error) {
    console.error(`Failed to copy file: ${error.message}`);
    throw error;
  }
}

// Another example: git operations
async function gitCommitAndPush(message) {
  try {
    // Add all changes
    await execWithRecovery(
      'git add -A',
      { timeout: 10 }
    );
    
    console.log('✅ Changes staged');
    
    // Commit
    await execWithRecovery(
      `git commit -m "${message}"`,
      { timeout: 10 }
    );
    
    console.log('✅ Changes committed');
    
    // Push (with longer timeout and retry)
    await execWithRecovery(
      'git push origin main',
      {
        timeout: 30,
        retryCommand: 'git push -f origin main'
      }
    );
    
    console.log('✅ Pushed to remote');
    
  } catch (error) {
    console.error(`Git operation failed: ${error.message}`);
  }
}
```

### Command Strategies

1. **Standard**: Run as-is
2. **With Delay**: Add `sleep 1 &&` before command
3. **Alternative**: Use backup command if provided

---

## Example 5: Building a Resilient Data Pipeline

**Scenario**: Process data from multiple sources with potential failures.

### The Solution

```javascript
const {
  webFetchWithRecovery,
  webSearchWithRecovery,
  browserWithRecovery,
  logFailure,
  analyzeErrors
} = require('./recovery-implementation');

class ResilientDataPipeline {
  constructor() {
    this.results = [];
    this.failures = [];
  }

  async searchAndFetch(topic) {
    console.log(`\n📊 Processing topic: ${topic}`);
    
    try {
      // Step 1: Search for information
      console.log('  1️⃣  Searching...');
      const searchResults = await webSearchWithRecovery(topic, 'US');
      console.log(`  ✅ Found ${searchResults.length} results`);
      
      // Step 2: Fetch top result
      if (searchResults.length > 0) {
        const topUrl = searchResults[0].url;
        console.log(`  2️⃣  Fetching: ${topUrl}`);
        
        const content = await webFetchWithRecovery(topUrl);
        console.log(`  ✅ Fetched ${content.length} chars`);
        
        this.results.push({
          topic,
          url: topUrl,
          contentLength: content.length,
          timestamp: new Date().toISOString(),
          status: 'success'
        });
      }
      
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      this.failures.push({
        topic,
        error: error.message,
        pattern: error.pattern,
        timestamp: new Date().toISOString()
      });
    }
  }

  async processTopics(topics) {
    console.log(`Processing ${topics.length} topics with auto-recovery...`);
    
    for (const topic of topics) {
      await this.searchAndFetch(topic);
      // Rate limiting between requests
      await new Promise(r => setTimeout(r, 1000));
    }

    this.printReport();
  }

  printReport() {
    console.log('\n📈 Pipeline Report');
    console.log('==================');
    console.log(`Total: ${this.results.length + this.failures.length}`);
    console.log(`Successful: ${this.results.length}`);
    console.log(`Failed: ${this.failures.length}`);
    
    if (this.failures.length > 0) {
      console.log('\nFailures by type:');
      const byPattern = {};
      this.failures.forEach(f => {
        byPattern[f.pattern] = (byPattern[f.pattern] || 0) + 1;
      });
      Object.entries(byPattern).forEach(([pattern, count]) => {
        console.log(`  ${pattern}: ${count}`);
      });
    }

    // Show error analysis from log
    console.log('\n📊 Error Pattern Analysis:');
    analyzeErrors();
  }
}

// Usage
async function main() {
  const pipeline = new ResilientDataPipeline();
  
  await pipeline.processTopics([
    'artificial intelligence',
    'machine learning trends',
    'cloud computing',
    'cybersecurity',
    'blockchain technology'
  ]);
}

main().catch(console.error);
```

### Output Example

```
Processing 5 topics with auto-recovery...

📊 Processing topic: artificial intelligence
  1️⃣  Searching...
  ✅ Found 5 results
  2️⃣  Fetching: https://example.com/ai-article
  ✅ Fetched 12543 chars

📊 Processing topic: machine learning trends
  1️⃣  Searching...
  ✅ Found 5 results
  2️⃣  Fetching: https://example.com/ml-article
⏳ Attempting strategy "text-only" (attempt 2/3)...
  ✅ Fetched 8234 chars

📈 Pipeline Report
==================
Total: 5
Successful: 5
Failed: 0

📊 Error Pattern Analysis:
Total errors: 2
Recovered: 0 (0%)
```

---

## Example 6: Monitoring and Alerting

**Scenario**: Monitor the health of your recovery system.

### The Solution

```javascript
const { analyzeErrors, ERRORS_LOG_PATH } = require('./recovery-implementation');
const fs = require('fs');

function monitorErrorRate() {
  const analysis = analyzeErrors();
  
  // Alert if recovery rate drops
  if (analysis.total > 10 && analysis.recoveryRate < 70) {
    console.error(
      `⚠️  WARNING: Recovery rate dropped to ${analysis.recoveryRate}%`
    );
    console.error('   Consider reviewing ERROR_PATTERNS.md for solutions');
  }
  
  // Alert if any tool has high failure rate
  Object.entries(analysis.byTool || {}).forEach(([tool, count]) => {
    if (count > 10) {
      console.error(
        `⚠️  WARNING: High failure rate for ${tool}: ${count} errors`
      );
    }
  });
  
  return analysis;
}

function rotateErrorLogs() {
  // Keep only last 7 days of logs
  if (fs.existsSync(ERRORS_LOG_PATH)) {
    const stats = fs.statSync(ERRORS_LOG_PATH);
    const ageMs = Date.now() - stats.mtime.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    if (ageDays > 7) {
      console.log(`Rotating log file (age: ${ageDays.toFixed(1)} days)`);
      const archivePath = ERRORS_LOG_PATH.replace('.jsonl', `.${new Date().toISOString().split('T')[0]}.jsonl`);
      fs.copyFileSync(ERRORS_LOG_PATH, archivePath);
      fs.truncateSync(ERRORS_LOG_PATH);
    }
  }
}

// Run monitoring periodically (in HEARTBEAT.md)
function setupMonitoring() {
  console.log('🔍 Monitoring error recovery system...');
  const analysis = monitorErrorRate();
  rotateErrorLogs();
  return analysis;
}

module.exports = { monitorErrorRate, rotateErrorLogs, setupMonitoring };
```

---

## Summary

Use the self-healing recovery pattern for:
- ✅ Browser automation with fallback strategies
- ✅ Network requests with exponential backoff
- ✅ Web searches with progressive simplification
- ✅ Shell commands with guards and delays
- ✅ Data pipelines with multiple sources
- ✅ Monitoring system health

Each example includes:
1. **Automatic retry** - Up to 3 attempts with exponential backoff
2. **Strategy adaptation** - Different approach on each retry
3. **Error logging** - Detailed failures to errors.jsonl
4. **Error analysis** - Pattern detection and reporting
5. **Graceful degradation** - Fallback strategies ensure something works

See SKILL.md for technical details and ERROR_PATTERNS.md for known issues and solutions.
