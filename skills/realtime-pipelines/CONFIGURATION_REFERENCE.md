# Configuration Reference - Real-Time Event Streams

Complete reference for all configuration options in the Real-Time Data Pipelines system.

---

## Pipeline Configuration Structure

```json
{
  "version": "1.0",
  "lastUpdated": "ISO-8601 timestamp",
  "pipelines": [
    { /* Pipeline object */ }
  ],
  "config": {
    /* Global configuration */
  }
}
```

---

## Pipeline Object

### Top-Level Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✅ Yes | Unique pipeline identifier (lowercase, hyphens) |
| `name` | string | ✅ Yes | Display name (can include emojis) |
| `description` | string | No | Purpose and function description |
| `enabled` | boolean | ✅ Yes | Whether pipeline is active |
| `heartbeatEnabled` | boolean | No | Enable automatic heartbeat polling |
| `pollInterval` | string | No | How often to poll (e.g., "15m", "1h") |
| `sources` | array | ✅ Yes | Data source configurations |
| `transformations` | array | No | Data transformation steps |
| `storage` | object | ✅ Yes | Storage configuration |
| `triggers` | array | No | Trigger conditions and actions |

### Example

```json
{
  "id": "example-pipeline",
  "name": "📊 Example Pipeline",
  "description": "Monitors example data source",
  "enabled": true,
  "heartbeatEnabled": true,
  "pollInterval": "15m",
  "sources": [ /* ... */ ],
  "transformations": [ /* ... */ ],
  "storage": { /* ... */ },
  "triggers": [ /* ... */ ]
}
```

---

## Source Configurations

### Common Source Properties

All source types share these properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✅ Yes | Unique source identifier |
| `name` | string | No | Display name |
| `type` | string | ✅ Yes | Source type: `rss`, `api`, `scrape`, `file` |
| `pollInterval` | string | No | Override global poll interval |
| `timeout` | string | No | Request timeout (e.g., "10s") |
| `deduplication` | string | No | Field to use for deduplication |
| `retryPolicy` | object | No | Retry configuration |

---

### RSS/Atom Feed Source

**Type:** `rss`

```json
{
  "id": "example-rss",
  "name": "Example RSS Feed",
  "type": "rss",
  "url": "https://example.com/feed.xml",
  "pollInterval": "15m",
  "deduplication": "guid",
  "timeout": "10s",
  "retryPolicy": {
    "maxRetries": 3,
    "backoffMultiplier": 2,
    "initialDelay": "1m"
  }
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `url` | string | ✅ Yes | RSS/Atom feed URL |
| `pollInterval` | string | No | Poll frequency |
| `deduplication` | string | No | Field for dedup: `guid`, `link`, `id` |
| `timeout` | string | No | Request timeout |

**Deduplication Options:**
- `guid` - Use feed item GUID (recommended)
- `link` - Use item URL
- `id` - Use item ID
- `title|link` - Combination of fields

---

### HTTP API Source

**Type:** `api`

```json
{
  "id": "example-api",
  "name": "Example API",
  "type": "api",
  "url": "https://api.example.com/data",
  "method": "GET",
  "auth": {
    "type": "bearer",
    "token": "env:API_TOKEN"
  },
  "headers": {
    "User-Agent": "TARS/1.0",
    "Accept": "application/json"
  },
  "params": {
    "limit": 50,
    "format": "json"
  },
  "pollInterval": "30m",
  "timeout": "10s",
  "deduplication": "id",
  "dataPath": "$.results[*]"
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `url` | string | ✅ Yes | API endpoint URL |
| `method` | string | No | HTTP method (default: "GET") |
| `auth` | object | No | Authentication configuration |
| `headers` | object | No | Custom HTTP headers |
| `params` | object | No | Query parameters or POST body |
| `dataPath` | string | No | JSONPath to data array in response |
| `pollInterval` | string | No | Poll frequency |
| `timeout` | string | No | Request timeout |

**Authentication Types:**

```json
// Bearer Token
{
  "type": "bearer",
  "token": "env:TOKEN_VAR"
}

// API Key (Header)
{
  "type": "api_key",
  "header": "X-API-Key",
  "key": "env:API_KEY"
}

// Query Parameter
{
  "type": "query_param",
  "param": "appid",
  "token": "env:API_KEY"
}

// Basic Auth
{
  "type": "basic",
  "username": "env:USERNAME",
  "password": "env:PASSWORD"
}
```

**Environment Variables:**
- Use `env:VAR_NAME` to reference environment variables
- Never hardcode credentials in config files

---

### Web Scraping Source

**Type:** `scrape`

```json
{
  "id": "example-scrape",
  "name": "Example Website",
  "type": "scrape",
  "url": "https://example.com/page",
  "schedule": "0 9 * * *",
  "selectors": {
    "title": "h1.headline",
    "date": "span.publish-date",
    "content": "div.article-body",
    "link": "a[href]"
  },
  "deduplication": "title|date"
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `url` | string | ✅ Yes | Page URL to scrape |
| `schedule` | string | No | Cron expression for scheduling |
| `selectors` | object | ✅ Yes | CSS selectors for data extraction |
| `deduplication` | string | No | Fields for deduplication |
| `timeout` | string | No | Page load timeout |

**Cron Schedule Examples:**
- `"0 9 * * *"` - Every day at 9:00 AM
- `"0 */6 * * *"` - Every 6 hours
- `"*/30 * * * *"` - Every 30 minutes
- `"0 0 * * 0"` - Every Sunday at midnight

**CSS Selectors:**
```json
{
  "title": "h1",                    // First h1 element
  "link": "a[href]",                // First link with href
  "date": ".post-date",             // Element with class
  "author": "#author-name",         // Element with id
  "content": "article > p:first-child"  // Complex selector
}
```

---

### File System Source

**Type:** `file`

```json
{
  "id": "example-files",
  "name": "File Watcher",
  "type": "file",
  "path": "data/incoming",
  "pattern": "*.json",
  "recursive": false,
  "watchInterval": "5m",
  "deduplication": "hash",
  "timeout": "5s"
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `path` | string | ✅ Yes | Directory path (absolute or relative to workspace) |
| `pattern` | string | ✅ Yes | File name pattern (glob) |
| `recursive` | boolean | No | Watch subdirectories (default: false) |
| `watchInterval` | string | No | Check frequency |
| `deduplication` | string | No | Dedup strategy: `hash`, `filename`, field name |
| `timeout` | string | No | File read timeout |

**Pattern Examples:**
- `"*.json"` - All JSON files
- `"log-*.txt"` - Files starting with "log-"
- `"**/*.csv"` - All CSV files recursively (if `recursive: true`)

**Deduplication Options:**
- `hash` - File content hash (default)
- `filename` - File name
- Field name from JSON content (e.g., `id`)

---

## Transformations

### Transformation Order

Transformations execute in order of `step` number:

```json
{
  "transformations": [
    { "step": 1, "type": "extract" },
    { "step": 2, "type": "enrich" },
    { "step": 3, "type": "filter" },
    { "step": 4, "type": "deduplicate" }
  ]
}
```

---

### 1. Extract Transformation

**Purpose:** Extract specific fields from source data

```json
{
  "step": 1,
  "type": "extract",
  "description": "Extract key fields",
  "fields": {
    "id": "$.id",
    "title": "$.title",
    "value": "$.data.value",
    "timestamp": "$.createdAt",
    "source": "source"
  }
}
```

**Field Mapping Syntax:**

| Syntax | Description | Example |
|--------|-------------|---------|
| `"fieldName"` | Direct field access | `"title"` → `item.title` |
| `"$.path"` | JSONPath (nested) | `"$.data.value"` → `item.data.value` |
| `"source"` | Built-in field | Adds source ID |

**JSONPath Examples:**
- `"$.title"` - Top-level field
- `"$.data.items[0]"` - First array element
- `"$.user.name"` - Nested field
- `"$.weather[0].main"` - First item in weather array

---

### 2. Enrich Transformation

**Purpose:** Add computed fields based on data

```json
{
  "step": 2,
  "type": "enrich",
  "description": "Add relevance scoring",
  "enrichments": [
    {
      "name": "relevanceScore",
      "type": "keyword_match",
      "fields": ["title", "description"],
      "keywords": ["javascript", "node", "react"],
      "weights": {
        "title_match": 2.0,
        "description_match": 1.0,
        "multi_keyword": 1.5
      },
      "threshold": 0.3
    },
    {
      "name": "category",
      "type": "rule_based",
      "field": "title",
      "rules": [
        { "pattern": "security|vulnerability", "value": "security", "weight": 1.0 },
        { "pattern": "performance|optimization", "value": "performance", "weight": 0.8 }
      ]
    },
    {
      "name": "alert",
      "type": "threshold",
      "field": "temperature",
      "rules": [
        { "condition": "temp < 0", "alert": "freeze" },
        { "condition": "temp > 30", "alert": "heat" }
      ]
    }
  ]
}
```

#### Keyword Match Enrichment

**Purpose:** Score items by keyword relevance

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | ✅ Yes | Field name to create |
| `type` | string | ✅ Yes | `"keyword_match"` |
| `fields` | array | ✅ Yes | Fields to search |
| `keywords` | array | ✅ Yes | Keywords to match |
| `weights` | object | No | Field importance weights |
| `threshold` | number | No | Minimum score (0-1) |

**Output:** Number between 0-1 representing relevance

---

#### Rule-Based Enrichment

**Purpose:** Categorize based on patterns

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | ✅ Yes | Field name to create |
| `type` | string | ✅ Yes | `"rule_based"` |
| `field` | string | ✅ Yes | Field to evaluate |
| `rules` | array | ✅ Yes | Pattern matching rules |

**Rule Structure:**
```json
{
  "pattern": "regex-pattern",
  "value": "category-name",
  "weight": 1.0
}
```

**Output:** First matching rule's value, or `null`

---

#### Threshold Enrichment

**Purpose:** Alert based on numeric thresholds

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | ✅ Yes | Field name to create |
| `type` | string | ✅ Yes | `"threshold"` |
| `field` | string | ✅ Yes | Numeric field to check |
| `rules` | array | ✅ Yes | Threshold conditions |

**Condition Syntax:**
- `"temp < 0"` - Less than
- `"temp > 30"` - Greater than
- `"temp between 10 and 20"` - Range

**Output:** Alert level string or `null`

---

### 3. Filter Transformation

**Purpose:** Remove items that don't meet criteria

```json
{
  "step": 3,
  "type": "filter",
  "description": "Keep high-relevance items",
  "condition": "item.relevanceScore >= 0.5",
  "dropLogged": true
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `condition` | string | ✅ Yes | JavaScript expression |
| `dropLogged` | boolean | No | Log dropped items |

**Condition Examples:**

```javascript
// Simple comparison
"item.score >= 0.7"

// Multiple conditions
"item.score >= 0.7 && item.category === 'security'"

// String matching
"item.title.includes('javascript')"

// Accept all (workaround)
"true"

// Reject all
"false"
```

**⚠️ Important:** Use `item.fieldName` to avoid "field not defined" errors

---

### 4. Deduplicate Transformation

**Purpose:** Remove duplicate items

```json
{
  "step": 4,
  "type": "deduplicate",
  "description": "Remove duplicates",
  "strategy": "hash",
  "fields": ["title", "link"]
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `strategy` | string | No | Dedup method (default: "hash") |
| `fields` | array | ✅ Yes | Fields to compare |

**Strategies:**
- `"hash"` - MD5 hash of field values
- `"exact"` - Exact field matching

---

## Storage Configuration

```json
{
  "storage": {
    "path": "data/pipelines/my-pipeline",
    "format": "jsonl",
    "retention": "30d",
    "maxSize": "100MB",
    "archiveOldFiles": true
  }
}
```

**Properties:**

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `path` | string | ✅ Yes | - | Storage directory path |
| `format` | string | No | `"jsonl"` | Storage format |
| `retention` | string | No | `"30d"` | How long to keep data |
| `maxSize` | string | No | `"500MB"` | Max file size |
| `archiveOldFiles` | boolean | No | `true` | Archive old data |

**Format Options:**
- `"jsonl"` - JSON Lines (one object per line) ✅ Recommended
- `"json"` - JSON array (not recommended for large datasets)

**Retention Examples:**
- `"7d"` - 7 days
- `"30d"` - 30 days
- `"90d"` - 90 days
- `"1y"` - 1 year

**Size Limits:**
- `"50MB"` - 50 megabytes
- `"100MB"` - 100 megabytes
- `"1GB"` - 1 gigabyte

---

## Triggers

```json
{
  "triggers": [
    {
      "id": "high-value-alert",
      "name": "High Value Alert",
      "condition": "item.value > 1000",
      "action": "send_notification",
      "target": ["whatsapp", "email"],
      "template": "High value detected: {{value}}",
      "cooldown": "5m",
      "priority": "high",
      "enabled": true
    }
  ]
}
```

**Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✅ Yes | Unique trigger ID |
| `name` | string | ✅ Yes | Display name |
| `condition` | string | ✅ Yes | When to fire |
| `action` | string | ✅ Yes | What to do |
| `target` | array | No | Recipients |
| `template` | string | No | Message template |
| `cooldown` | string | No | Min time between triggers |
| `priority` | string | No | Alert priority |
| `enabled` | boolean | ✅ Yes | Active status |

**Action Types:**
- `"send_notification"` - Send message
- `"send_email"` - Email notification
- `"post_slack"` - Slack message
- `"log_event"` - Log only
- `"queue_daily_digest"` - Add to digest

**Priority Levels:**
- `"critical"` - Immediate, high importance
- `"high"` - Important
- `"medium"` - Normal
- `"low"` - Informational

**Template Syntax:**
```
"🔔 Alert: {{title}}\nValue: {{value}}\n🔗 {{link}}"
```

Use `{{fieldName}}` to insert data fields.

---

## Global Configuration

```json
{
  "config": {
    "globalPollInterval": "15m",
    "maxConcurrentSources": 5,
    "errorHandling": {
      "retryPolicy": "exponential_backoff",
      "maxRetries": 3,
      "initialDelay": "1m",
      "maxDelay": "1h"
    },
    "storageDefaults": {
      "format": "jsonl",
      "retention": "30d",
      "archiveOldFiles": true,
      "maxSize": "500MB"
    },
    "deduplicationDefaults": {
      "strategy": "hash",
      "ttl": "30d"
    },
    "triggers": {
      "evaluationInterval": "15m",
      "maxConcurrentActions": 3,
      "defaultCooldown": "5m"
    },
    "logging": {
      "enabled": true,
      "level": "info",
      "logFile": "logs/pipelines.log",
      "metricsFile": "logs/pipelines-metrics.json"
    },
    "healthCheck": {
      "enabled": true,
      "interval": "1h",
      "alertThreshold": {
        "consecutiveFailures": 3,
        "errorRate": 0.3
      }
    }
  }
}
```

### Error Handling

| Property | Description |
|----------|-------------|
| `retryPolicy` | `"exponential_backoff"` or `"linear"` |
| `maxRetries` | Max retry attempts per source |
| `initialDelay` | First retry delay |
| `maxDelay` | Maximum retry delay |

### Logging Levels

- `"error"` - Errors only
- `"warn"` - Warnings and errors
- `"info"` - Normal operations ✅ Recommended
- `"debug"` - Verbose logging

---

## Time Interval Format

All time intervals use this format:

| Unit | Examples |
|------|----------|
| Seconds | `"30s"`, `"60s"` |
| Minutes | `"5m"`, `"15m"`, `"30m"` |
| Hours | `"1h"`, `"6h"`, `"24h"` |
| Days | `"1d"`, `"7d"`, `"30d"` |
| Weeks | `"1w"`, `"4w"` |
| Years | `"1y"` |

---

## Complete Example

```json
{
  "version": "1.0",
  "pipelines": [
    {
      "id": "complete-example",
      "name": "Complete Configuration Example",
      "description": "Shows all options",
      "enabled": true,
      "heartbeatEnabled": true,
      "pollInterval": "15m",
      "sources": [
        {
          "id": "api-source",
          "type": "api",
          "url": "https://api.example.com/data",
          "method": "GET",
          "auth": {
            "type": "bearer",
            "token": "env:API_TOKEN"
          },
          "pollInterval": "30m",
          "timeout": "10s"
        }
      ],
      "transformations": [
        {
          "step": 1,
          "type": "extract",
          "fields": {
            "id": "$.id",
            "value": "$.data.value"
          }
        },
        {
          "step": 2,
          "type": "filter",
          "condition": "item.value > 0"
        }
      ],
      "storage": {
        "path": "data/pipelines/example",
        "format": "jsonl",
        "retention": "30d"
      },
      "triggers": [
        {
          "id": "alert",
          "name": "Alert",
          "condition": "item.value > 100",
          "action": "send_notification",
          "priority": "high",
          "enabled": true
        }
      ]
    }
  ],
  "config": {
    "globalPollInterval": "15m",
    "logging": {
      "enabled": true,
      "level": "info"
    }
  }
}
```

---

## Environment Variables

**Required for Production:**

```bash
# API Keys
export OPENWEATHER_API_KEY="your-key-here"
export MY_API_TOKEN="your-token-here"

# Workspace Path
export WORKSPACE="/path/to/workspace"
```

**Security Best Practices:**
- Never commit API keys to version control
- Use environment variables for all secrets
- Reference with `env:VAR_NAME` syntax
- Rotate keys regularly

---

## Validation

**Required Fields:**
- ✅ Pipeline must have `id`, `name`, `enabled`, `sources`, `storage`
- ✅ Each source must have `id`, `type`, `url` (or `path` for files)
- ✅ Storage must have `path`

**Recommended:**
- ✅ Set `pollInterval` for each source
- ✅ Use `deduplication` to prevent duplicates
- ✅ Add `description` to document purpose
- ✅ Configure `timeout` for reliability

---

## See Also

- **Quick Start:** `QUICKSTART.md`
- **Integration Guide:** `INTEGRATION_GUIDE.md`
- **Full Documentation:** `SKILL.md`
- **Test Results:** `TEST_RESULTS.md`

---

**Last Updated:** 2026-02-13  
**Version:** 1.0.0
