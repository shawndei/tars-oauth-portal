# Real-Time Data Pipelines - Practical Examples

## Overview

This document shows practical, real-world examples of setting up and using the Real-Time Data Pipelines system for different use cases.

---

## Example 1: Tech News Monitoring Pipeline 📰

**Scenario:** You want to stay updated on JavaScript and web development news without constantly checking multiple sources.

### Configuration

**File:** `pipelines.json` (already configured)

```json
{
  "id": "tech-news-monitor",
  "name": "🔴 Tech News Monitoring Pipeline",
  "sources": [
    {
      "id": "hackernews",
      "type": "rss",
      "url": "https://news.ycombinator.com/rss",
      "pollInterval": "15m"
    },
    {
      "id": "dev-to",
      "type": "rss",
      "url": "https://dev.to/api/articles?tag=javascript",
      "pollInterval": "30m"
    }
  ],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "title": "$.title",
        "link": "$.link",
        "description": "$.description"
      }
    },
    {
      "type": "enrich",
      "enrichments": [
        {
          "name": "relevanceScore",
          "type": "keyword_match",
          "fields": ["title", "description"],
          "keywords": ["javascript", "typescript", "react", "async", "performance"],
          "threshold": 0.3
        }
      ]
    },
    {
      "type": "filter",
      "condition": "relevanceScore >= 0.5"
    }
  ]
}
```

### Triggers

**File:** `triggers.json`

```json
{
  "id": "tech-news-high-relevance",
  "name": "🔥 High-Relevance Tech News Alert",
  "type": "pipeline",
  "pipeline": "tech-news-monitor",
  "condition": "relevanceScore >= 0.85",
  "action": "send_notification",
  "target": ["whatsapp"],
  "template": "🔥 High-relevance news: {{title}}\nScore: {{Math.round(relevanceScore*100)}}%\n🔗 {{link}}",
  "priority": "high",
  "cooldown": "5m"
}
```

### How It Works

1. **HEARTBEAT triggers** every 15 minutes
2. **Polls HackerNews and Dev.to** for new articles
3. **Extracts** title, link, and description
4. **Scores relevance** based on keyword matches (JavaScript, React, etc.)
5. **Filters** items with relevance >= 0.5
6. **Stores** in `data/pipelines/tech-news/current.jsonl`
7. **Evaluates triggers**: If relevanceScore >= 0.85, sends WhatsApp alert
8. **Creates daily digest** of moderately relevant items (0.6-0.85)

### Query the Data

```bash
# Get all stored articles
node -e "const Engine = require('./skills/realtime-pipelines/realtime-pipelines.js'); \
  const data = new Engine('./').getPipelineData('tech-news-monitor'); \
  console.log(JSON.stringify(data, null, 2));"

# Get only high-relevance articles
node -e "const Engine = require('./skills/realtime-pipelines/realtime-pipelines.js'); \
  const data = new Engine('./').getPipelineData('tech-news-monitor', {minScore: 0.8}); \
  console.log(data.length + ' high-relevance articles'); \
  data.forEach(a => console.log('- ' + a.title));"

# Get JavaScript-related articles
node -e "const Engine = require('./skills/realtime-pipelines/realtime-pipelines.js'); \
  const data = new Engine('./').getPipelineData('tech-news-monitor', {keyword: 'javascript', limit: 5});"
```

### Expected Output (JSONL Storage)

```jsonl
{"id":"hn-1","title":"JavaScript async/await patterns","link":"https://...","relevanceScore":0.95,"source":"hackernews","_storedAt":"2026-02-13T08:30:00Z"}
{"id":"dev-1","title":"Build React apps with TypeScript","link":"https://...","relevanceScore":0.88,"source":"dev-to","_storedAt":"2026-02-13T08:32:00Z"}
{"id":"hn-2","title":"New performance optimization in Node.js","link":"https://...","relevanceScore":0.82,"source":"hackernews","_storedAt":"2026-02-13T08:35:00Z"}
```

---

## Example 2: Market Price Monitoring 📈

**Scenario:** Monitor crypto prices and alert when significant changes occur.

### Configuration

Add to `pipelines.json`:

```json
{
  "id": "crypto-monitor",
  "name": "💰 Cryptocurrency Price Monitor",
  "enabled": true,
  "pollInterval": "5m",
  "sources": [
    {
      "id": "coingecko-api",
      "type": "api",
      "url": "https://api.coingecko.com/api/v3/simple/price",
      "method": "GET",
      "params": {
        "ids": "bitcoin,ethereum",
        "vs_currencies": "usd",
        "include_24hr_change": "true"
      },
      "pollInterval": "5m",
      "deduplication": "id"
    }
  ],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "id": "asset_id",
        "symbol": "$.symbol",
        "price": "$.price_usd",
        "change24h": "$.percent_change_24h",
        "timestamp": "timestamp"
      }
    },
    {
      "type": "enrich",
      "enrichments": [
        {
          "name": "priceAlert",
          "type": "rule_based",
          "field": "change24h",
          "rules": [
            { "pattern": "> 10", "value": "surge" },
            { "pattern": "< -10", "value": "crash" },
            { "pattern": "between -5 and 5", "value": "stable" }
          ]
        }
      ]
    },
    {
      "type": "filter",
      "condition": "Math.abs(change24h) > 3"
    }
  ],
  "triggers": [
    {
      "id": "price-surge",
      "condition": "priceAlert === 'surge'",
      "action": "send_notification",
      "priority": "high"
    },
    {
      "id": "price-crash",
      "condition": "priceAlert === 'crash'",
      "action": "send_notification",
      "priority": "critical"
    }
  ]
}
```

### Add Triggers

Add to `triggers.json`:

```json
{
  "id": "crypto-price-alert",
  "name": "💥 Crypto Price Alert",
  "type": "pipeline",
  "pipeline": "crypto-monitor",
  "condition": "Math.abs(change24h) > 5",
  "action": "send_notification",
  "target": ["whatsapp"],
  "template": "{{symbol}}: {{priceAlert.toUpperCase()}}\nPrice: ${{Math.round(price)}}\nChange: {{change24h.toFixed(2)}}%",
  "priority": "high",
  "cooldown": "10m"
}
```

### Expected Output

```
Alert: BTC: SURGE
Price: $42,350
Change: +12.34%

Alert: ETH: CRASH
Price: $2,234
Change: -8.56%
```

---

## Example 3: Website Change Detection 🔍

**Scenario:** Monitor a website for content changes (job board, price updates, etc.).

### Configuration

Add to `pipelines.json`:

```json
{
  "id": "website-monitor",
  "name": "🔍 Website Change Detector",
  "enabled": true,
  "pollInterval": "1h",
  "sources": [
    {
      "id": "job-board-scraper",
      "type": "scrape",
      "url": "https://example-jobs.com",
      "schedule": "0 * * * *",
      "selectors": {
        "id": "div.job-id",
        "title": "a.job-title",
        "company": "span.company",
        "location": "span.location",
        "salary": "span.salary",
        "posted": "span.posted-time"
      }
    }
  ],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "id": "$.id",
        "title": "$.title",
        "company": "$.company",
        "location": "$.location",
        "salary": "$.salary",
        "url": "url",
        "checksum": "hash"
      }
    },
    {
      "type": "enrich",
      "enrichments": [
        {
          "name": "isNew",
          "type": "rule_based",
          "field": "posted",
          "rules": [
            { "pattern": "today|just now", "value": true },
            { "pattern": "yesterday", "value": false }
          ]
        }
      ]
    },
    {
      "type": "filter",
      "condition": "isNew === true || salary > 80000"
    },
    {
      "type": "deduplicate",
      "strategy": "hash",
      "fields": ["title", "company"]
    }
  ],
  "triggers": [
    {
      "id": "new-job",
      "condition": "isNew === true",
      "action": "send_notification",
      "priority": "high"
    },
    {
      "id": "high-paying-job",
      "condition": "salary > 100000",
      "action": "send_notification",
      "priority": "critical"
    }
  ]
}
```

### Alert Notifications

Add to `triggers.json`:

```json
[
  {
    "id": "new-job-alert",
    "name": "🆕 New Job Posted",
    "type": "pipeline",
    "pipeline": "website-monitor",
    "condition": "isNew === true",
    "action": "send_notification",
    "template": "📢 {{title}} at {{company}}\n📍 {{location}}\n💰 {{salary}}\n🔗 {{url}}",
    "priority": "high"
  },
  {
    "id": "high-salary-alert",
    "name": "💸 High-Paying Job",
    "type": "pipeline",
    "pipeline": "website-monitor",
    "condition": "salary > 120000",
    "action": "send_notification",
    "target": ["whatsapp", "email"],
    "template": "🎯 {{title}} - {{salary}}\n{{company}} - {{location}}",
    "priority": "critical",
    "cooldown": "30m"
  }
]
```

---

## Example 4: Social Media Monitoring 📱

**Scenario:** Track mentions of your product/brand across sources.

### Configuration

Add to `pipelines.json`:

```json
{
  "id": "brand-monitor",
  "name": "📱 Brand Mention Monitor",
  "enabled": true,
  "pollInterval": "15m",
  "sources": [
    {
      "id": "reddit-api",
      "type": "api",
      "url": "https://api.reddit.com/r/javascript/new",
      "auth": {
        "type": "oauth",
        "credentials": "env:REDDIT_CREDENTIALS"
      },
      "pollInterval": "15m"
    },
    {
      "id": "twitter-search",
      "type": "api",
      "url": "https://api.twitter.com/2/tweets/search/recent",
      "auth": {
        "type": "bearer",
        "token": "env:TWITTER_API_KEY"
      },
      "params": {
        "query": "\"my-product\" OR #my-product",
        "max_results": 100
      },
      "pollInterval": "5m"
    }
  ],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "id": "$.id",
        "text": "$.text || $.title",
        "author": "$.author_id || $.author",
        "source": "source",
        "url": "$.url || $.permalink",
        "likes": "$.public_metrics.like_count || $.score",
        "shares": "$.public_metrics.retweet_count || $.num_comments"
      }
    },
    {
      "type": "enrich",
      "enrichments": [
        {
          "name": "sentiment",
          "type": "rule_based",
          "field": "text",
          "rules": [
            { "pattern": "awesome|great|love|amazing", "value": "positive" },
            { "pattern": "terrible|hate|broken|bug", "value": "negative" },
            { "pattern": "good|ok|decent", "value": "neutral" }
          ]
        },
        {
          "name": "engagement",
          "type": "threshold",
          "field": "likes",
          "rules": [
            { "condition": "likes > 100", "alert": "viral" },
            { "condition": "likes between 10 and 100", "alert": "popular" },
            { "condition": "likes < 10", "alert": "low" }
          ]
        }
      ]
    },
    {
      "type": "filter",
      "condition": "sentiment === 'negative' || engagement === 'viral'"
    }
  ],
  "triggers": [
    {
      "id": "negative-mention",
      "condition": "sentiment === 'negative'",
      "priority": "critical"
    },
    {
      "id": "viral-mention",
      "condition": "engagement === 'viral'",
      "priority": "high"
    }
  ]
}
```

### Triggers

```json
{
  "id": "brand-negative",
  "name": "🚨 Negative Brand Mention",
  "type": "pipeline",
  "pipeline": "brand-monitor",
  "condition": "sentiment === 'negative'",
  "action": "send_notification",
  "target": ["email"],
  "template": "[ALERT] Negative mention from {{source}}:\n\n{{text}}\n\nAuthor: {{author}}\nURL: {{url}}",
  "priority": "critical",
  "cooldown": "5m"
},
{
  "id": "brand-viral",
  "name": "🔥 Viral Mention",
  "type": "pipeline",
  "pipeline": "brand-monitor",
  "condition": "engagement === 'viral'",
  "action": "send_notification",
  "target": ["whatsapp"],
  "template": "🌟 Your product is going viral!\n\n{{text}}\n\n{{likes}} likes, {{shares}} shares\n{{url}}",
  "priority": "high"
}
```

---

## Example 5: Infrastructure Monitoring 🔧

**Scenario:** Monitor application health metrics and system status.

### Configuration

Add to `pipelines.json`:

```json
{
  "id": "health-monitor",
  "name": "🔧 System Health Monitor",
  "enabled": true,
  "pollInterval": "1m",
  "sources": [
    {
      "id": "api-health",
      "type": "api",
      "url": "https://api.myapp.com/health",
      "method": "GET",
      "pollInterval": "1m",
      "timeout": "5s"
    },
    {
      "id": "log-watcher",
      "type": "file",
      "path": "/var/logs/app-errors.log",
      "pattern": "ERROR|CRITICAL",
      "watchInterval": "1m"
    }
  ],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "id": "timestamp",
        "status": "$.status",
        "uptime": "$.uptime",
        "cpu": "$.metrics.cpu",
        "memory": "$.metrics.memory",
        "errorRate": "$.metrics.error_rate"
      }
    },
    {
      "type": "enrich",
      "enrichments": [
        {
          "name": "healthStatus",
          "type": "rule_based",
          "field": "status",
          "rules": [
            { "pattern": "down|offline", "value": "critical" },
            { "pattern": "degraded|warning", "value": "warning" },
            { "pattern": "healthy|ok", "value": "ok" }
          ]
        }
      ]
    },
    {
      "type": "filter",
      "condition": "healthStatus !== 'ok' || cpu > 80 || memory > 85"
    }
  ],
  "triggers": [
    {
      "id": "critical-alert",
      "condition": "healthStatus === 'critical'",
      "action": "send_notification",
      "priority": "critical"
    },
    {
      "id": "resource-alert",
      "condition": "cpu > 90 || memory > 90",
      "action": "send_notification",
      "priority": "high"
    }
  ]
}
```

### Triggers

```json
{
  "id": "api-down",
  "name": "🚨 API DOWN",
  "type": "pipeline",
  "pipeline": "health-monitor",
  "condition": "healthStatus === 'critical'",
  "action": "send_notification",
  "target": ["whatsapp", "email"],
  "template": "🚨 CRITICAL: API is {{healthStatus}}\nUptime: {{uptime}}\nResponse time required!",
  "priority": "critical",
  "cooldown": "2m"
},
{
  "id": "high-resource-usage",
  "name": "⚠️ High Resource Usage",
  "type": "pipeline",
  "pipeline": "health-monitor",
  "condition": "cpu > 85 || memory > 85",
  "action": "send_notification",
  "target": ["email"],
  "template": "Warning: High resource usage\nCPU: {{cpu}}%\nMemory: {{memory}}%",
  "priority": "high"
}
```

---

## Running Pipelines

### Automatic (via HEARTBEAT)

Pipelines run automatically every 15 minutes when HEARTBEAT evaluates triggers:

```
[Every 15 minutes]
→ HEARTBEAT triggered
→ "pipeline-poll-schedule" trigger evaluates
→ "poll_all_pipelines" action executes
→ All enabled pipelines poll sources
→ Data processed and stored
→ Pipeline triggers evaluated
→ Alerts sent if conditions match
```

### Manual Testing

```bash
# Test a specific pipeline
cd workspace
node skills/realtime-pipelines/realtime-pipelines.js

# Check results
cat data/pipelines/tech-news-monitor/current.jsonl | jq '.'

# View latest alerts
tail logs/pipelines-metrics.json
```

---

## Data Analysis Examples

### Finding Top Articles by Relevance

```bash
node -e "
const fs = require('fs');
const lines = fs.readFileSync('data/pipelines/tech-news/current.jsonl', 'utf-8').split('\\n');
const items = lines.map(l => l ? JSON.parse(l) : null).filter(x => x);
items.sort((a, b) => b.relevanceScore - a.relevanceScore);
console.log('Top 5 Articles:');
items.slice(0, 5).forEach(a => 
  console.log(\`- \${a.title.substring(0, 60)}... [\${(a.relevanceScore*100).toFixed(0)}%]\`)
);
"
```

### Monitoring Storage Size

```bash
du -sh data/pipelines/*
# or
ls -lah data/pipelines/*/current.jsonl
```

### Archiving Old Data

```bash
# Archive articles older than 7 days
node scripts/archive-pipeline-data.js --pipeline tech-news-monitor --age 7d
```

---

## Performance Tips

1. **Use keyword filtering** - Filter early in transformations to reduce stored data
2. **Set retention** - Configure `retention: "7d"` to auto-delete old data
3. **Reduce poll frequency** - Increase `pollInterval` if data doesn't change often
4. **Batch triggers** - Combine similar triggers to reduce notifications
5. **Archive daily** - Store monthly archives separately for analysis

---

## Next Steps

1. **Enable a pipeline** from the examples above
2. **Add custom triggers** for your notifications
3. **Monitor the data** - Check `data/pipelines/*/current.jsonl`
4. **Analyze patterns** - Use stored data for insights
5. **Iterate** - Adjust keywords, filters, and alert thresholds based on results

---

**Status:** ✅ Ready to Deploy  
**Created:** 2026-02-13 08:22  
**Last Updated:** 2026-02-13 15:30
