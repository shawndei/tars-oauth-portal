# Real-Time Event Streams - Quick Start Guide

**Get started in 5 minutes** with real-time data monitoring!

---

## Installation

### 1. Install Dependencies

```bash
cd skills/realtime-pipelines
npm install
```

**Dependencies:**
- `rss-parser` - Parse RSS/Atom feeds
- `axios` - HTTP requests for APIs
- `jsdom` / `cheerio` - Web scraping
- `jest` (dev) - Testing framework

---

## Quick Start Examples

### Example 1: Monitor Weather (Simplest)

**Create pipeline configuration:**

```json
{
  "id": "my-weather",
  "name": "My Weather Monitor",
  "enabled": true,
  "sources": [{
    "id": "weather-api",
    "type": "api",
    "url": "https://api.openweathermap.org/data/2.5/weather",
    "method": "GET",
    "params": {
      "q": "London",
      "units": "metric",
      "appid": "YOUR_API_KEY"
    },
    "pollInterval": "1h"
  }],
  "transformations": [{
    "type": "extract",
    "fields": {
      "temp": "$.main.temp",
      "condition": "$.weather[0].main",
      "humidity": "$.main.humidity"
    }
  }],
  "storage": {
    "path": "data/pipelines/my-weather",
    "format": "jsonl"
  }
}
```

**Run it:**

```bash
export WORKSPACE="/path/to/workspace"
node realtime-pipelines.js
```

**Check results:**

```bash
cat data/pipelines/my-weather/current.jsonl | jq '.'
```

---

### Example 2: Watch Files for Changes

**Create pipeline:**

```json
{
  "id": "file-watcher",
  "name": "File Watcher",
  "enabled": true,
  "sources": [{
    "id": "logs-folder",
    "type": "file",
    "path": "data/incoming",
    "pattern": "*.json",
    "watchInterval": "5m"
  }],
  "transformations": [{
    "type": "extract",
    "fields": {
      "filename": "filename",
      "content": "$"
    }
  }],
  "storage": {
    "path": "data/pipelines/files",
    "format": "jsonl"
  }
}
```

**Create test file:**

```bash
mkdir -p data/incoming
echo '{"event":"test","timestamp":"2026-01-01T00:00:00Z"}' > data/incoming/test.json
```

**Run and verify:**

```bash
node realtime-pipelines.js
cat data/pipelines/files/current.jsonl
```

---

### Example 3: Monitor RSS Feed

**Create pipeline:**

```json
{
  "id": "news-feed",
  "name": "News Monitor",
  "enabled": true,
  "sources": [{
    "id": "hn-rss",
    "type": "rss",
    "url": "https://news.ycombinator.com/rss",
    "pollInterval": "15m"
  }],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "title": "$.title",
        "link": "$.link",
        "pubDate": "$.pubDate"
      }
    },
    {
      "type": "filter",
      "condition": "true"
    }
  ],
  "storage": {
    "path": "data/pipelines/news",
    "format": "jsonl"
  }
}
```

**Note:** Filter condition set to `"true"` to accept all items (workaround for enrichment field access issue)

---

## Configuration Patterns

### Pattern 1: Simple API Poll

**Use Case:** Check an API every N minutes

```json
{
  "sources": [{
    "type": "api",
    "url": "https://api.example.com/data",
    "pollInterval": "30m"
  }],
  "transformations": [{
    "type": "extract",
    "fields": { "value": "$.result" }
  }]
}
```

---

### Pattern 2: Filter by Value

**Use Case:** Only store items meeting criteria

```json
{
  "transformations": [
    {
      "type": "extract",
      "fields": { "value": "$.price" }
    },
    {
      "type": "filter",
      "condition": "item.value > 100"
    }
  ]
}
```

**⚠️ Important:** Use `item.fieldName` in conditions to avoid reference errors

---

### Pattern 3: Multiple Sources

**Use Case:** Aggregate data from multiple APIs

```json
{
  "sources": [
    {
      "id": "source-1",
      "type": "api",
      "url": "https://api1.example.com/data"
    },
    {
      "id": "source-2",
      "type": "api",
      "url": "https://api2.example.com/data"
    }
  ]
}
```

All sources polled concurrently, results merged.

---

### Pattern 4: File + API Combination

**Use Case:** Process files and poll API simultaneously

```json
{
  "sources": [
    {
      "id": "local-files",
      "type": "file",
      "path": "data/incoming",
      "pattern": "*.json"
    },
    {
      "id": "remote-api",
      "type": "api",
      "url": "https://api.example.com/feed"
    }
  ]
}
```

---

## Running Pipelines

### Manual Execution

```bash
# Set workspace path
export WORKSPACE="/path/to/workspace"

# Run all enabled pipelines
node skills/realtime-pipelines/realtime-pipelines.js
```

### From Heartbeat

Add to `HEARTBEAT.md`:

```markdown
## Pipeline Polling (every 15 min)

Run pipeline engine:
- Check for new data from all sources
- Process and store items
- Evaluate triggers
```

### Scheduled with Cron

```bash
# Every 15 minutes
*/15 * * * * cd /path/to/workspace && node skills/realtime-pipelines/realtime-pipelines.js
```

---

## Querying Data

### Using jq (Command Line)

```bash
# View all data
cat data/pipelines/my-pipeline/current.jsonl | jq '.'

# Filter by field
cat data/pipelines/my-pipeline/current.jsonl | jq 'select(.temp > 20)'

# Get last 5 items
tail -5 data/pipelines/my-pipeline/current.jsonl | jq '.'

# Count items
wc -l data/pipelines/my-pipeline/current.jsonl
```

### Using Node.js

```javascript
const fs = require('fs');

// Read all items
const data = fs.readFileSync('data/pipelines/my-pipeline/current.jsonl', 'utf-8')
  .split('\n')
  .filter(line => line.trim())
  .map(line => JSON.parse(line));

// Filter items
const filtered = data.filter(item => item.temp > 20);

// Latest item
const latest = data[data.length - 1];
```

### Using the API

```javascript
const Engine = require('./skills/realtime-pipelines/realtime-pipelines.js');
const engine = new Engine(process.env.WORKSPACE);

// Get all data
const allData = engine.getPipelineData('my-pipeline');

// Filter by criteria
const filtered = engine.getPipelineData('my-pipeline', {
  minScore: 0.8,
  keyword: 'javascript',
  limit: 10
});

// Check health
const health = engine.checkPipelineHealth();
console.log(health);
```

---

## Common Recipes

### Recipe 1: Price Alert System

Monitor price changes and alert when threshold crossed.

```json
{
  "id": "price-monitor",
  "sources": [{
    "type": "api",
    "url": "https://api.coinbase.com/v2/prices/BTC-USD/spot",
    "pollInterval": "5m"
  }],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "price": "$.data.amount",
        "currency": "$.data.currency"
      }
    },
    {
      "type": "filter",
      "condition": "parseFloat(item.price) > 50000"
    }
  ],
  "storage": {
    "path": "data/pipelines/btc-price"
  },
  "triggers": [{
    "id": "price-spike",
    "condition": "parseFloat(item.price) > 60000",
    "action": "send_notification",
    "template": "🚨 BTC price: ${{price}}"
  }]
}
```

---

### Recipe 2: Log File Monitor

Watch log directory for errors.

```json
{
  "id": "log-monitor",
  "sources": [{
    "type": "file",
    "path": "logs",
    "pattern": "*.log",
    "watchInterval": "1m"
  }],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "filename": "filename",
        "level": "$.level",
        "message": "$.message"
      }
    },
    {
      "type": "filter",
      "condition": "item.level === 'ERROR'"
    }
  ],
  "triggers": [{
    "id": "error-alert",
    "condition": "item.level === 'ERROR'",
    "action": "send_notification",
    "priority": "high"
  }]
}
```

---

### Recipe 3: Multi-Source News Aggregator

Combine multiple news sources with relevance scoring.

```json
{
  "id": "news-aggregator",
  "sources": [
    {
      "id": "hn",
      "type": "rss",
      "url": "https://news.ycombinator.com/rss"
    },
    {
      "id": "dev-to",
      "type": "rss",
      "url": "https://dev.to/feed"
    },
    {
      "id": "reddit",
      "type": "api",
      "url": "https://www.reddit.com/r/programming.json"
    }
  ],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "title": "$.title",
        "link": "$.link || $.url",
        "source": "source"
      }
    },
    {
      "type": "filter",
      "condition": "item.title.length > 0"
    }
  ],
  "storage": {
    "path": "data/pipelines/tech-news",
    "retention": "30d"
  }
}
```

---

### Recipe 4: Website Change Detector

Monitor webpage for changes.

```json
{
  "id": "site-monitor",
  "sources": [{
    "type": "scrape",
    "url": "https://example.com/status",
    "schedule": "0 */6 * * *",
    "selectors": {
      "status": ".status-message",
      "timestamp": ".last-update"
    }
  }],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "status": "$.status",
        "hash": "hash($.status)"
      }
    },
    {
      "type": "deduplicate",
      "fields": ["hash"]
    }
  ],
  "triggers": [{
    "id": "status-changed",
    "condition": "true",
    "action": "send_notification",
    "template": "Status changed: {{status}}"
  }]
}
```

---

## Troubleshooting

### Pipeline Not Running

**Problem:** Pipeline doesn't execute

**Solutions:**
1. Check `enabled: true` in config
2. Verify `WORKSPACE` environment variable
3. Check logs: `cat logs/pipelines.log`
4. Test manually: `node realtime-pipelines.js`

---

### No Data Stored

**Problem:** Pipeline runs but no data saved

**Solutions:**
1. Check filter conditions (may be too restrictive)
2. Simplify filter to `"condition": "true"` temporarily
3. Verify extraction fields match source data structure
4. Check permissions on `data/pipelines/` directory

---

### Filter Errors

**Problem:** `Filter condition failed: field is not defined`

**Solution:** Use `item.fieldName` in conditions:

```json
// ❌ Wrong
"condition": "relevanceScore >= 0.5"

// ✅ Correct
"condition": "item.relevanceScore >= 0.5"

// ✅ Simple workaround
"condition": "true"
```

---

### Source Not Polling

**Problem:** Specific source doesn't work

**Solutions:**
1. Check API URL is correct
2. Verify API key in environment variables
3. Test URL manually with curl
4. Check rate limits
5. Review `timeout` setting

---

## Next Steps

1. ✅ **Start simple** - Begin with Example 1 (weather)
2. ✅ **Add sources** - Expand to multiple data streams
3. ✅ **Configure triggers** - Set up alerts
4. ✅ **Monitor health** - Check logs regularly
5. ✅ **Optimize** - Tune poll intervals and filters

---

## Additional Resources

- **Full Documentation:** `SKILL.md`
- **Integration Guide:** `INTEGRATION_GUIDE.md`
- **Test Results:** `TEST_RESULTS.md`
- **Configuration Reference:** See `pipelines.json` examples

---

## Support

**Issues?**
- Check logs: `logs/pipelines.log`
- Review metrics: `logs/pipelines-metrics.json`
- Verify config: `pipelines.json`

**Questions?**
- See `INTEGRATION_GUIDE.md` for detailed explanations
- Review test results in `TEST_RESULTS.md`

---

**Get started now:** Copy an example, customize it, and run!

✅ **System Status:** Operational  
🚀 **Ready for:** Production use  
📊 **Tested with:** Weather API, file watching, RSS feeds
