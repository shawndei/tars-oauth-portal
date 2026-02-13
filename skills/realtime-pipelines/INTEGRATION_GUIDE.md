# Real-Time Data Pipelines - Integration Guide

## Overview

The Real-Time Data Pipelines system is now integrated with TARS and ready for use. This guide explains how to:

1. ✅ **Activate pipelines** in the system
2. ✅ **Create custom pipelines** for your data sources
3. ✅ **Integrate with triggers** for notifications
4. ✅ **Use HEARTBEAT integration** for automatic polling
5. ✅ **Query pipeline data** for analysis

## Quick Start

### 1. Current Pipelines (Deployed)

Three example pipelines are active:

#### 🔴 Tech News Monitoring
- **Pipeline ID:** `tech-news-monitor`
- **Sources:** HackerNews RSS, Dev.to API, GitHub Trending (scraped)
- **Updates:** Every 15-30 minutes
- **Data Storage:** `data/pipelines/tech-news/`
- **Triggers:** 
  - 🔥 High relevance (>0.85) → Immediate alert
  - 🚨 Security news (>0.7) → Critical alert
  - 📰 Daily digest (>0.6)

#### ☀️ Weather Monitoring
- **Pipeline ID:** `weather-monitor`
- **Sources:** OpenWeatherMap API
- **Updates:** Every 1 hour
- **Data Storage:** `data/pipelines/weather/`
- **Triggers:**
  - ⚠️ Severe weather → Critical alert
  - ❄️ Freeze warning → High priority

#### 📁 File System Monitor
- **Pipeline ID:** `file-monitor`
- **Sources:** Local files in `data/incoming/*.json`
- **Updates:** Every 5 minutes
- **Data Storage:** `data/pipelines/files/`
- **Triggers:** New file logged

### 2. HEARTBEAT Integration

The pipeline polling is integrated with HEARTBEAT. Every 15 minutes during heartbeat evaluation:

```
1. HEARTBEAT triggers (every ~15 minutes)
2. Evaluates trigger: "pipeline-poll-schedule"
3. Executes action: "poll_all_pipelines"
4. Polls all enabled sources
5. Processes items through transformations
6. Stores in JSONL format
7. Evaluates pipeline-specific triggers
8. Executes notification actions
9. Logs execution and metrics
```

**To verify pipeline polling is working:**
```bash
# Check logs
tail -f logs/pipelines.log

# Check metrics
cat logs/pipelines-metrics.json
```

## Creating Custom Pipelines

### Step 1: Add to pipelines.json

Edit `pipelines.json` and add a new pipeline:

```json
{
  "id": "my-custom-pipeline",
  "name": "My Custom Data Monitor",
  "description": "Monitor my data source",
  "enabled": true,
  "heartbeatEnabled": true,
  "pollInterval": "15m",
  "sources": [
    {
      "id": "my-api",
      "type": "api",
      "url": "https://api.example.com/data",
      "method": "GET",
      "auth": {
        "type": "bearer",
        "token": "env:MY_API_TOKEN"
      },
      "pollInterval": "15m"
    }
  ],
  "transformations": [
    {
      "step": 1,
      "type": "extract",
      "fields": {
        "id": "$.id",
        "title": "$.name",
        "value": "$.value"
      }
    },
    {
      "step": 2,
      "type": "filter",
      "condition": "value > 100"
    }
  ],
  "storage": {
    "path": "data/pipelines/my-custom",
    "format": "jsonl",
    "retention": "30d"
  },
  "triggers": [
    {
      "id": "high-value",
      "condition": "value > 500",
      "action": "send_notification",
      "priority": "high",
      "enabled": true
    }
  ]
}
```

### Step 2: Add Triggers (Optional)

Edit `triggers.json` and add pipeline triggers:

```json
{
  "id": "my-custom-alert",
  "name": "Custom Alert",
  "type": "pipeline",
  "pipeline": "my-custom-pipeline",
  "condition": "value > 500",
  "action": "send_notification",
  "priority": "high",
  "cooldown": "5m"
}
```

### Step 3: Test

Run the pipeline:
```bash
node skills/realtime-pipelines/realtime-pipelines.js
```

## Pipeline Configuration Reference

### Source Types

#### RSS/Atom Feeds
```json
{
  "type": "rss",
  "url": "https://example.com/feed.xml",
  "pollInterval": "15m",
  "deduplication": "guid",
  "timeout": "10s"
}
```

#### HTTP API
```json
{
  "type": "api",
  "url": "https://api.example.com/data",
  "method": "GET|POST",
  "auth": {
    "type": "bearer|api_key|basic",
    "token": "env:TOKEN_VAR"
  },
  "headers": { "User-Agent": "TARS/1.0" },
  "pollInterval": "30m"
}
```

#### Web Scraping
```json
{
  "type": "scrape",
  "url": "https://example.com",
  "schedule": "0 9 * * *",
  "selectors": {
    "title": "h1",
    "content": "div.content"
  }
}
```

#### File System
```json
{
  "type": "file",
  "path": "/data/feeds/*.json",
  "pattern": "*.json",
  "watchInterval": "5m"
}
```

### Transformation Steps

#### Extract
```json
{
  "type": "extract",
  "fields": {
    "fieldName": "$.jsonPathOrFieldName"
  }
}
```

#### Enrich
```json
{
  "type": "enrich",
  "enrichments": [
    {
      "name": "score",
      "type": "keyword_match",
      "fields": ["title"],
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}
```

#### Filter
```json
{
  "type": "filter",
  "condition": "score >= 0.7 && !title.includes('spam')"
}
```

#### Deduplicate
```json
{
  "type": "deduplicate",
  "strategy": "hash",
  "fields": ["title", "id"]
}
```

## Querying Pipeline Data

### Using JavaScript

```javascript
const Engine = require('./skills/realtime-pipelines/realtime-pipelines.js');
const engine = new Engine(process.env.WORKSPACE);

// Get all data
const data = engine.getPipelineData('tech-news-monitor');

// Filter by score
const highRelevance = engine.getPipelineData('tech-news-monitor', {
  minScore: 0.85
});

// Search by keyword
const jsNews = engine.getPipelineData('tech-news-monitor', {
  keyword: 'javascript',
  limit: 10
});

// Check health
const health = engine.checkPipelineHealth();
```

### Using Shell

```bash
# Check what pipelines exist
cat pipelines.json | jq '.pipelines[].id'

# View stored data
cat data/pipelines/weather-monitor/current.jsonl | jq '.'

# Check pipeline status
cat logs/pipelines-metrics.json | jq '.executions[-5:]'

# Watch for new items (Linux/Mac)
tail -f data/pipelines/tech-news/current.jsonl
```

## Data Storage Format

### JSONL Structure

Each line is a complete JSON object:

```jsonl
{"id":"1","title":"Article 1","score":0.85,"timestamp":"2026-02-13T08:30:00Z"}
{"id":"2","title":"Article 2","score":0.72,"timestamp":"2026-02-13T08:35:00Z"}
```

### Directory Structure

```
data/pipelines/
├── tech-news-monitor/
│   ├── current.jsonl          (all items)
│   ├── index.json             (metadata)
│   └── archive/               (daily archives)
│       ├── 2026-02-13.jsonl
│       └── 2026-02-12.jsonl
│
├── weather-monitor/
│   ├── current.jsonl
│   └── index.json
│
└── file-monitor/
    ├── current.jsonl
    └── index.json
```

### Index File Structure

```json
{
  "lastUpdate": "2026-02-13T08:45:00Z",
  "totalItems": 127,
  "hashes": {
    "guid123": "2026-02-13T08:30:00Z"
  }
}
```

## Trigger Examples

### Example 1: Email Digest

Send daily email digest of tech news:

```json
{
  "id": "tech-news-daily",
  "name": "Daily Tech News Digest",
  "type": "pipeline",
  "pipeline": "tech-news-monitor",
  "condition": "relevanceScore >= 0.6",
  "action": "send_email_digest",
  "deliveryTime": "09:00",
  "maxItems": 10,
  "enabled": true
}
```

### Example 2: Slack Notification

Post to Slack when security issues found:

```json
{
  "id": "security-slack",
  "name": "Security Alert to Slack",
  "type": "pipeline",
  "pipeline": "tech-news-monitor",
  "condition": "category === 'security' && score > 0.8",
  "action": "post_slack",
  "channel": "#security-alerts",
  "template": "🚨 {{title}}\n{{description}}",
  "priority": "critical"
}
```

### Example 3: Price Alert

Alert when stock price changes by X%:

```json
{
  "id": "stock-price-alert",
  "name": "Stock Price Alert",
  "type": "pipeline",
  "pipeline": "market-monitor",
  "condition": "priceChange > 5 || priceChange < -5",
  "action": "send_notification",
  "target": ["whatsapp", "email"],
  "template": "🔔 {{symbol}} changed {{priceChange}}%",
  "priority": "high"
}
```

## Monitoring & Debugging

### Check Pipeline Health

```bash
node -e "const Engine = require('./skills/realtime-pipelines/realtime-pipelines.js'); \
new Engine('./').checkPipelineHealth()" | jq '.'
```

### View Recent Executions

```bash
tail -20 logs/pipelines.log
cat logs/pipelines-metrics.json | jq '.executions[-3:]'
```

### Test a Single Pipeline

```bash
# Edit a pipeline and set others to enabled:false
# Then run:
node skills/realtime-pipelines/realtime-pipelines.js
```

## Troubleshooting

### Pipeline not polling

1. Check `pipelines.json` - ensure `"enabled": true`
2. Check `triggers.json` - ensure `"pipeline-poll-schedule"` is enabled
3. Check HEARTBEAT is running - should trigger every 15 minutes
4. Check logs: `tail -f logs/pipelines.log`

### Data not storing

1. Verify `data/pipelines/` directory exists
2. Check transformations - filters may be rejecting all items
3. Run pipeline manually: `node skills/realtime-pipelines/realtime-pipelines.js`
4. Check permissions on `data/` directory

### Triggers not firing

1. Ensure pipeline trigger is in `triggers.json`
2. Verify trigger condition syntax
3. Check that items match condition
4. Check `logs/pipelines-metrics.json` for execution details

### API/Source Errors

1. Verify API URL is correct
2. Check API credentials in environment variables
3. Verify rate limits are respected
4. Check source timeout settings
5. Test source manually with curl

## Advanced Features

### Custom Enrichment Functions

Extend the transformer to add custom enrichment:

```javascript
// In enrichItems() method, add:
case "custom":
  item[enrichment.name] = this.customEnrichment(item, enrichment);
  break;

// Add method:
customEnrichment(item, config) {
  // Your custom logic here
  return result;
}
```

### Real-Time Polling

For real-time sources, reduce `pollInterval`:

```json
{
  "id": "realtime-api",
  "type": "api",
  "url": "https://api.example.com/stream",
  "pollInterval": "1m",  // Check every minute
  "deduplication": "id"
}
```

### Data Archiving

Automatic daily archives are created:

```bash
# Check archives
ls -la data/pipelines/tech-news/archive/

# Query archive from specific date
jq '.' data/pipelines/tech-news/archive/2026-02-13.jsonl
```

## Performance Optimization

### For High-Volume Pipelines

1. Increase deduplication cache size
2. Reduce retention period: `"retention": "7d"`
3. Implement filtering early in transformations
4. Use `maxSize` to limit file growth:
   ```json
   "storage": {
     "maxSize": "50MB",
     "archiveOldFiles": true
   }
   ```

### For Many Pipelines

1. Reduce concurrent sources: 
   ```json
   "config": {
     "maxConcurrentSources": 3
   }
   ```

2. Stagger poll intervals to avoid simultaneous requests

3. Use API rate limiting in source config

## Security Best Practices

1. **API Keys:** Always use environment variables
   ```json
   "auth": {
     "token": "env:MY_SECRET_KEY"
   }
   ```

2. **Data Validation:** Enable in storage config
   ```json
   "storage": {
     "validateSchema": true
   }
   ```

3. **Error Logging:** Don't log sensitive data
   - Errors are logged to `logs/pipelines.log`
   - Redact PII before storing

4. **Access Control:** Protect `data/pipelines/` directory

## Next Steps

1. ✅ **Enable a pipeline** - Set `enabled: true` and let HEARTBEAT poll it
2. ✅ **Create custom triggers** - Add notification rules in `triggers.json`
3. ✅ **Monitor data** - Check `data/pipelines/*/current.jsonl`
4. ✅ **Analyze patterns** - Use stored data for insights
5. ✅ **Optimize performance** - Adjust poll intervals and storage

---

**Status:** ✅ Production Ready  
**Deployed:** 2026-02-13 08:22 GMT-7  
**Last Tested:** 2026-02-13 15:24 GMT-7
