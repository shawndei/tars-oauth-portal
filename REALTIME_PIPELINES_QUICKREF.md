# Real-Time Data Pipelines - Quick Reference

**TL;DR:** The system automatically polls RSS feeds, APIs, and files every 15 minutes via HEARTBEAT, processes the data through transformation rules, stores results, and sends alerts.

---

## One-Minute Setup

1. ✅ System is **already deployed** and **active**
2. ✅ HEARTBEAT automatically polls every **15 minutes**
3. ✅ Data stored in `data/pipelines/*/current.jsonl`
4. ✅ Triggers fire notifications automatically

**You're done!** The system is running. Customize as needed.

---

## Check Status

```bash
# What pipelines are active?
cat pipelines.json | jq '.pipelines[] | {id, name, enabled}'

# What data is stored?
ls -lh data/pipelines/*/current.jsonl

# How much data?
wc -l data/pipelines/*/current.jsonl

# Is it working?
tail logs/pipelines.log
```

---

## Stored Data Examples

**Tech News Pipeline:** `data/pipelines/tech-news-monitor/current.jsonl`
```json
{"id":"hn-1","title":"JavaScript async patterns","relevanceScore":0.95}
```

**Weather Pipeline:** `data/pipelines/weather-monitor/current.jsonl`
```json
{"temp":15,"condition":"Cloudy","tempAlert":"normal"}
```

**View Latest Items:**
```bash
tail -5 data/pipelines/*/current.jsonl | jq '.'
```

---

## Customize: Add New Pipeline

Edit `pipelines.json`, add to `pipelines` array:

```json
{
  "id": "my-pipeline",
  "name": "My Custom Pipeline",
  "enabled": true,
  "pollInterval": "15m",
  "sources": [
    {
      "id": "my-api",
      "type": "api",
      "url": "https://api.example.com/data",
      "pollInterval": "15m"
    }
  ],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "id": "$.id",
        "title": "$.title",
        "value": "$.value"
      }
    },
    {
      "type": "filter",
      "condition": "value > 100"
    }
  ],
  "storage": {
    "path": "data/pipelines/my-pipeline"
  },
  "triggers": []
}
```

Then restart HEARTBEAT or run:
```bash
node skills/realtime-pipelines/realtime-pipelines.js
```

---

## Customize: Add New Alert Trigger

Edit `triggers.json`, add to `triggers` array:

```json
{
  "id": "my-alert",
  "name": "My Alert",
  "type": "pipeline",
  "pipeline": "my-pipeline",
  "condition": "value > 500",
  "action": "send_notification",
  "target": ["whatsapp"],
  "template": "Alert! Value is {{value}}",
  "priority": "high",
  "cooldown": "5m",
  "enabled": true
}
```

Conditions use JavaScript: `value > 500`, `category === 'urgent'`, etc.

---

## Data Source Types

### RSS/Atom Feeds
```json
{
  "type": "rss",
  "url": "https://example.com/feed.xml",
  "pollInterval": "15m"
}
```

### HTTP API
```json
{
  "type": "api",
  "url": "https://api.example.com/data",
  "method": "GET",
  "auth": {"type": "bearer", "token": "env:API_TOKEN"},
  "pollInterval": "30m"
}
```

### Web Scraping
```json
{
  "type": "scrape",
  "url": "https://example.com",
  "selectors": {"title": "h1", "price": "span.price"},
  "pollInterval": "1h"
}
```

### File Watcher
```json
{
  "type": "file",
  "path": "/data/incoming",
  "pattern": "*.json",
  "watchInterval": "5m"
}
```

---

## Transformation Types

### Extract Fields
```json
{
  "type": "extract",
  "fields": {
    "title": "$.title",
    "price": "$.price"
  }
}
```

### Score by Keywords
```json
{
  "type": "enrich",
  "enrichments": [{
    "name": "relevance",
    "type": "keyword_match",
    "fields": ["title", "description"],
    "keywords": ["important", "urgent", "critical"]
  }]
}
```

### Filter by Condition
```json
{
  "type": "filter",
  "condition": "relevance >= 0.7 && price < 100"
}
```

### Remove Duplicates
```json
{
  "type": "deduplicate",
  "fields": ["title", "id"]
}
```

---

## Trigger Conditions

Simple JavaScript expressions:

```javascript
// Numeric comparisons
value > 100
price < 50
score >= 0.85

// String matching
category === "security"
title.includes("javascript")
status !== "ok"

// Logical operators
(value > 100 && urgent) || critical
category === "alert" && score > 0.8

// Array operations
items.length > 5
```

---

## Common Patterns

### Daily Email Digest
```json
{
  "id": "daily-digest",
  "type": "pipeline",
  "pipeline": "tech-news",
  "condition": "relevanceScore >= 0.6",
  "action": "send_email_digest",
  "deliveryTime": "09:00"
}
```

### Immediate Alert on Critical Item
```json
{
  "id": "critical-alert",
  "type": "pipeline",
  "pipeline": "health-monitor",
  "condition": "status === 'critical'",
  "action": "send_notification",
  "priority": "critical",
  "cooldown": "0m"
}
```

### Price Change Notification
```json
{
  "id": "price-alert",
  "type": "pipeline",
  "pipeline": "market",
  "condition": "Math.abs(priceChange) > 5",
  "action": "send_notification",
  "template": "{{symbol}}: {{priceChange}}%"
}
```

### Count-Based Alert
```json
{
  "id": "bulk-alert",
  "type": "pipeline",
  "pipeline": "items",
  "condition": "items.length > 100",
  "action": "send_notification",
  "template": "{{items.length}} new items!"
}
```

---

## Query Data Programmatically

```javascript
const Engine = require('./skills/realtime-pipelines/realtime-pipelines.js');
const engine = new Engine('./');

// Get all items
const all = engine.getPipelineData('my-pipeline');

// With filters
const filtered = engine.getPipelineData('my-pipeline', {
  minScore: 0.7,
  keyword: 'javascript',
  limit: 10
});

// Check health
const health = engine.checkPipelineHealth();
console.log(health.pipelines['my-pipeline']);
```

---

## View Logs

```bash
# Recent executions
tail -20 logs/pipelines.log

# Execution metrics
cat logs/pipelines-metrics.json | jq '.executions[-5:]'

# Full metrics
cat logs/pipelines-metrics.json | jq '.'

# Check errors
grep ERROR logs/pipelines.log
```

---

## Test a Pipeline

```bash
# Run once (manual)
node skills/realtime-pipelines/realtime-pipelines.js

# Check results
cat data/pipelines/my-pipeline/current.jsonl | jq '.'

# Count items
wc -l data/pipelines/my-pipeline/current.jsonl
```

---

## Performance Tips

| Need | Action |
|------|--------|
| More frequent updates | Reduce `pollInterval` (e.g., "5m") |
| Less data storage | Set `retention: "7d"` |
| Fewer alerts | Increase trigger cooldown |
| Real-time monitoring | Use `pollInterval: "1m"` |
| Archive data | Pipelines auto-archive to `archive/` |

---

## Environment Variables

Store API keys in `.env` or environment:

```bash
export OPENWEATHER_API_KEY="..."
export MY_API_TOKEN="..."
export TWITTER_API_KEY="..."
```

Reference in config:
```json
{
  "auth": {
    "token": "env:MY_API_TOKEN"
  }
}
```

---

## Example: Add Twitter Monitoring

```json
{
  "id": "twitter-monitor",
  "name": "Twitter Monitoring",
  "enabled": true,
  "sources": [{
    "id": "twitter-api",
    "type": "api",
    "url": "https://api.twitter.com/2/tweets/search/recent",
    "auth": {"type": "bearer", "token": "env:TWITTER_API_KEY"},
    "params": {"query": "\"my-product\""},
    "pollInterval": "5m"
  }],
  "transformations": [{
    "type": "extract",
    "fields": {
      "id": "$.id",
      "text": "$.text",
      "author": "$.author_id",
      "likes": "$.public_metrics.like_count"
    }
  }],
  "triggers": [{
    "id": "viral-tweet",
    "condition": "likes > 100",
    "action": "send_notification"
  }]
}
```

---

## Example: Add Job Board Scraper

```json
{
  "id": "job-monitor",
  "name": "Job Board Monitor",
  "enabled": true,
  "sources": [{
    "id": "job-scraper",
    "type": "scrape",
    "url": "https://jobs.example.com",
    "selectors": {
      "title": "h2.job-title",
      "company": "span.company",
      "salary": "span.salary"
    },
    "pollInterval": "1h"
  }],
  "triggers": [{
    "id": "high-salary",
    "condition": "salary > 100000",
    "action": "send_notification",
    "priority": "high"
  }]
}
```

---

## Debugging

### Nothing is storing
1. Run: `node skills/realtime-pipelines/realtime-pipelines.js`
2. Check output for errors
3. Verify `data/pipelines/` exists
4. Check filters aren't rejecting everything

### Triggers not firing
1. Check condition syntax is valid JavaScript
2. Verify data contains the fields
3. Check trigger is enabled: `"enabled": true`
4. Check cooldown isn't blocking: `"cooldown": "5m"`
5. Review logs: `tail logs/pipelines.log`

### API/Source errors
1. Test URL manually with curl
2. Check API credentials (environment variables)
3. Verify rate limits
4. Check network connectivity

---

## File Locations

| File | Purpose |
|------|---------|
| `pipelines.json` | Pipeline configuration |
| `triggers.json` | Trigger & notification rules |
| `data/pipelines/` | Stored pipeline data |
| `logs/pipelines.log` | Execution log |
| `logs/pipelines-metrics.json` | Performance metrics |
| `skills/realtime-pipelines/` | System code |

---

## Key Concepts

**Pipeline** = Data source + transformations + storage  
**Source** = RSS feed, API endpoint, file watcher  
**Transformation** = Extract, enrich, filter, deduplicate  
**Trigger** = When condition matches, execute action  
**JSONL** = One JSON object per line (searchable, appends fast)  
**HEARTBEAT** = Automatic polling every ~15 minutes  

---

## Pro Tips

1. **Deduplicate early** - Add deduplication in transformations to save storage
2. **Filter early** - Filter unwanted items before storing
3. **Use keywords** - Keyword scoring makes filtering easier
4. **Archive data** - Set retention period to auto-delete old data
5. **Test manually** - Run `node skills/realtime-pipelines/realtime-pipelines.js` to test
6. **Monitor logs** - Check `logs/pipelines.log` if things seem off
7. **Start simple** - Begin with 1-2 pipelines, add complexity later
8. **Cooldown alerts** - Use `cooldown: "5m"` to prevent alert spam

---

## Next Steps

1. **Verify it's working** - Check logs: `tail logs/pipelines.log`
2. **Add a custom pipeline** - Edit `pipelines.json`
3. **Set up alerts** - Add triggers to `triggers.json`
4. **Monitor data** - Check `data/pipelines/*/current.jsonl`
5. **Iterate** - Adjust thresholds and keywords based on results

---

## Getting Help

1. Check `INTEGRATION_GUIDE.md` for detailed setup
2. Review `REALTIME_PIPELINES_EXAMPLE.md` for use cases
3. Check `logs/pipelines.log` for error messages
4. Verify JSON syntax with: `jq . pipelines.json`
5. Test source URLs with curl

---

**System Status:** ✅ **Running & Operational**  
**Next Poll:** ~15 minutes via HEARTBEAT  
**Stored Data:** Check `data/pipelines/*/current.jsonl`
