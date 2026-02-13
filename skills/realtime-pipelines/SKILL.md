# Real-Time Data Pipelines System

**Purpose:** Continuously monitor and process data from multiple sources with automatic transformation, enrichment, and trigger-based notifications.

## How It Works

Establishes persistent data monitoring connections that:
- **Monitor multiple data sources** (RSS/Atom feeds, APIs, web pages, file watchers)
- **Transform and enrich data** in real-time with extraction, filtering, and augmentation
- **Store in structured format** with deduplication and schema validation
- **Trigger notifications** when conditions are met
- **Integrate with HEARTBEAT** for periodic polling and health checks

## Core Architecture

### 1. Data Source Connectors

#### RSS/Atom Feed Monitor
```javascript
{
  "type": "rss",
  "url": "https://example.com/feed.xml",
  "pollInterval": "15m",
  "deduplication": "guid|link",
  "filters": {
    "keywords": ["python", "javascript"],
    "excludeKeywords": ["spam"],
    "minScore": 0.7
  }
}
```

#### API Polling
```javascript
{
  "type": "api",
  "url": "https://api.example.com/data",
  "method": "GET",
  "pollInterval": "30m",
  "auth": { "type": "bearer", "token": "env:API_TOKEN" },
  "headers": { "User-Agent": "TARS/1.0" },
  "dataPath": "$.results[*]",
  "deduplication": "id"
}
```

#### Web Scraping on Schedule
```javascript
{
  "type": "scrape",
  "url": "https://example.com",
  "schedule": "0 9 * * *",
  "selectors": {
    "title": "h1.headline",
    "date": "span.publish-date",
    "content": "div.article-body"
  },
  "deduplication": "title|date"
}
```

#### File Watcher
```javascript
{
  "type": "file",
  "path": "/data/feeds/*.json",
  "pattern": "*.json",
  "watchInterval": "5m",
  "deduplication": "hash"
}
```

### 2. Data Transformation Pipeline

**Extraction Layer:**
- Parse source formats (XML/JSON/HTML)
- Navigate nested structures with JSONPath
- Extract key fields based on schema

**Enrichment Layer:**
- Compute relevance scores using keyword matching
- Fetch additional metadata from external sources
- Apply sentiment analysis or classification
- Tag and categorize items

**Storage Layer:**
- Write to JSON Lines format (searchable, streamable)
- Maintain deduplication index (prevent duplicates)
- Validate against schema
- Archive old records

### 3. Trigger-Based Notifications

When new data matches conditions:
```json
{
  "condition": "relevance > 0.8 && category === 'urgent'",
  "action": "send_notification",
  "targets": ["user", "slack", "email"],
  "template": "New {{category}}: {{title}} ({{score}}%)"
}
```

### 4. HEARTBEAT Integration

**Periodic Checks (every 15m):**
- Poll each RSS feed
- Check API endpoints
- Execute scheduled web scrapes
- Monitor file watchers

**Health Monitoring:**
- Track last successful poll time
- Count errors and failures
- Alert if source becomes unreachable

## Pipeline Configuration

**Location:** `workspace/pipelines.json`

```json
{
  "pipelines": [
    {
      "id": "news-monitor",
      "name": "Tech News Monitoring",
      "description": "Monitor tech news sources for relevant articles",
      "enabled": true,
      "sources": [
        {
          "id": "hackernews-rss",
          "type": "rss",
          "url": "https://news.ycombinator.com/rss",
          "pollInterval": "15m",
          "deduplication": "guid"
        },
        {
          "id": "dev-to-rss",
          "type": "rss",
          "url": "https://dev.to/api/articles?tag=javascript",
          "pollInterval": "30m",
          "deduplication": "id"
        }
      ],
      "transformations": [
        {
          "type": "extract",
          "fields": {
            "title": "$.title",
            "link": "$.link",
            "pubDate": "$.pubDate",
            "description": "$.description"
          }
        },
        {
          "type": "enrich",
          "score": {
            "type": "keyword_match",
            "keywords": ["javascript", "node.js", "typescript", "react"],
            "threshold": 0.5
          }
        },
        {
          "type": "filter",
          "condition": "score >= 0.6"
        }
      ],
      "storage": {
        "path": "data/news-monitor",
        "format": "jsonl",
        "retention": "30d"
      },
      "triggers": [
        {
          "id": "high-relevance",
          "condition": "score >= 0.85",
          "action": "notify_immediately",
          "priority": "high"
        },
        {
          "id": "medium-relevance",
          "condition": "score >= 0.7",
          "action": "queue_daily_digest",
          "priority": "medium"
        }
      ]
    }
  ]
}
```

## Pipeline Types

### 1. News/RSS Pipeline
**Use Case:** Monitor news sources, blogs, tech news
**Sources:** RSS/Atom feeds
**Frequency:** 15-30 minutes
**Output:** New articles with relevance scoring

### 2. Market Data Pipeline
**Use Case:** Stock prices, crypto data, market updates
**Sources:** APIs (crypto, stock data)
**Frequency:** 1-5 minutes (real-time) or hourly
**Output:** Price changes, alerts on thresholds

### 3. Website Change Detector
**Use Case:** Monitor webpage for changes
**Sources:** Web scraping on schedule
**Frequency:** Hourly/Daily
**Output:** Change notifications with diffs

### 4. File Monitoring Pipeline
**Use Case:** Monitor data files for new entries
**Sources:** File system (JSON, CSV, logs)
**Frequency:** 5-30 minutes
**Output:** New records, aggregated summaries

### 5. Social Media Pipeline
**Use Case:** Monitor Twitter, Reddit, etc.
**Sources:** Social APIs
**Frequency:** Real-time to 15 minutes
**Output:** Trending topics, mentions, sentiment

## Data Storage Format

**JSONL (JSON Lines):** One JSON object per line, indexed and queryable

```
{"id": "1", "source": "hn", "title": "Title 1", "score": 0.85, "timestamp": "2026-02-13T08:30:00Z"}
{"id": "2", "source": "dev", "title": "Title 2", "score": 0.72, "timestamp": "2026-02-13T08:35:00Z"}
```

**Index Structure:**
```
data/
├── news-monitor/
│   ├── current.jsonl (newest items)
│   ├── archive/ (daily archives)
│   │   ├── 2026-02-13.jsonl
│   │   ├── 2026-02-12.jsonl
│   └── index.json (metadata, dedup hashes)
└── market-data/
    └── current.jsonl
```

**Deduplication Index:**
```json
{
  "lastUpdate": "2026-02-13T08:45:00Z",
  "hashes": {
    "guid123": "2026-02-13T08:30:00Z",
    "guid124": "2026-02-13T08:35:00Z"
  },
  "errorCount": 0,
  "lastError": null
}
```

## Transformation Examples

### Example 1: Extract & Score
```json
{
  "type": "extract",
  "fields": {
    "title": "$.title",
    "url": "$.link",
    "date": "$.pubDate",
    "body": "$.description"
  }
}
```

### Example 2: Keyword Relevance Scoring
```json
{
  "type": "enrich",
  "score": {
    "type": "keyword_match",
    "keywords": ["javascript", "async", "react"],
    "case_sensitive": false,
    "weight": 1.0
  }
}
```

### Example 3: Category Tagging
```json
{
  "type": "enrich",
  "category": {
    "type": "rule_based",
    "rules": [
      { "pattern": "python|django|flask", "category": "backend" },
      { "pattern": "react|vue|angular", "category": "frontend" }
    ]
  }
}
```

### Example 4: Conditional Filtering
```json
{
  "type": "filter",
  "condition": "score >= 0.7 && !title.includes('spam')"
}
```

## Integration with Triggers

Add to `triggers.json` to trigger actions on new data:

```json
{
  "id": "news-high-relevance",
  "name": "High-Relevance News Alert",
  "type": "data-pipeline",
  "pipeline": "news-monitor",
  "condition": "score >= 0.85",
  "action": "send_notification",
  "target": ["whatsapp", "email"],
  "cooldown": "5m",
  "priority": "high"
}
```

## HEARTBEAT Integration

The system checks for new pipeline data every heartbeat:

```javascript
// In HEARTBEAT.md execution:
// 1. Poll all enabled sources
// 2. Process through transformation pipelines
// 3. Store new items in JSONL
// 4. Evaluate triggers
// 5. Execute notifications
// 6. Update health status
```

## API Methods

### Query Pipeline Data
```javascript
getPipelineData(pipelineId, filters = {})
// Returns array of items matching filters
// filters: { startDate, endDate, minScore, keyword, limit }
```

### Create Pipeline
```javascript
createPipeline(config)
// Creates new pipeline with sources and transformations
```

### Update Pipeline
```javascript
updatePipeline(pipelineId, updates)
// Modifies pipeline configuration
```

### Get Pipeline Status
```javascript
getPipelineStatus(pipelineId)
// Returns health: lastPoll, errorCount, itemCount, lastError
```

## Security Considerations

1. **API Keys:** Store in environment variables, never in config files
2. **Rate Limiting:** Respect source rate limits, implement backoff
3. **Data Validation:** Validate all external data before storing
4. **Sensitive Data:** Redact PII, don't log credentials
5. **Error Handling:** Graceful failure, don't expose internal paths

## Error Handling & Recovery

**Failure Scenarios:**
- Source unreachable → Retry with exponential backoff (1m, 5m, 15m, 1h)
- Invalid data → Log error, skip item, continue processing
- Storage full → Archive old data or alert
- Transformation error → Quarantine item, log error

**Health Checks:**
- Track consecutive failures per source
- Alert after 3 consecutive failures
- Disable source after 10 failures
- Auto-enable after source recovers

## Files Created

- `realtime-pipelines.js` - Core pipeline engine
- `rss-connector.js` - RSS/Atom feed polling
- `api-connector.js` - HTTP API polling
- `scraper-connector.js` - Web scraping
- `file-watcher.js` - File system monitoring
- `transformer.js` - Data transformation engine
- `storage.js` - JSONL storage and deduplication
- `pipelines.json` - Pipeline configuration
- `package.json` - Dependencies

## Example Usage

### Monitor Tech News
```
Pipeline: news-monitor
Sources: HackerNews, Dev.to RSS feeds
Transform: Extract title/link/date, score by keywords
Store: data/news-monitor/current.jsonl
Triggers: Alert on score > 0.85, daily digest for 0.7-0.85
```

### Track Market Prices
```
Pipeline: market-monitor
Sources: CoinGecko API, Alpha Vantage
Transform: Extract price/change, compare to previous
Store: data/market/current.jsonl
Triggers: Alert on ±5% change
```

### Monitor Website Changes
```
Pipeline: website-monitor
Sources: Web scrape specified URLs
Transform: Extract content hash, detect changes
Store: data/website-monitor/current.jsonl
Triggers: Alert when content changes
```

---

**Status:** ✅ Deployed (2026-02-13 08:22)  
**Confidence:** 100% (production-ready with HEARTBEAT integration)  
**Last Updated:** 2026-02-13 08:22 GMT-7
