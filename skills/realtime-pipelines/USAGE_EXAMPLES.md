# Real-Time Event Streams - Usage Examples

Practical, real-world examples for common use cases.

---

## Example 1: Weather Monitoring with Alerts

**Use Case:** Monitor local weather and alert on severe conditions

### Configuration

```json
{
  "id": "local-weather",
  "name": "☀️ Local Weather Monitor",
  "enabled": true,
  "sources": [{
    "id": "openweather",
    "type": "api",
    "url": "https://api.openweathermap.org/data/2.5/weather",
    "method": "GET",
    "params": {
      "q": "London",
      "units": "metric",
      "appid": "env:OPENWEATHER_API_KEY"
    },
    "pollInterval": "1h"
  }],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "temp": "$.main.temp",
        "condition": "$.weather[0].main",
        "description": "$.weather[0].description",
        "humidity": "$.main.humidity",
        "windSpeed": "$.wind.speed"
      }
    },
    {
      "type": "filter",
      "condition": "true"
    }
  ],
  "storage": {
    "path": "data/pipelines/weather",
    "retention": "90d"
  },
  "triggers": [
    {
      "id": "cold-alert",
      "condition": "item.temp < 5",
      "action": "send_notification",
      "template": "❄️ Cold Alert!\nTemp: {{temp}}°C\n{{description}}",
      "priority": "high",
      "enabled": true
    },
    {
      "id": "rain-alert",
      "condition": "item.condition === 'Rain'",
      "action": "send_notification",
      "template": "🌧️ Rain detected: {{description}}",
      "cooldown": "2h",
      "enabled": true
    }
  ]
}
```

### Setup

```bash
# 1. Get API key from openweathermap.org
export OPENWEATHER_API_KEY="your-key-here"

# 2. Add to pipelines.json
cat >> pipelines.json

# 3. Test
node skills/realtime-pipelines/realtime-pipelines.js

# 4. Check data
cat data/pipelines/weather/current.jsonl | jq '.'
```

### Query Historical Data

```javascript
// Get all readings
const readings = require('./skills/realtime-pipelines/realtime-pipelines.js');
const engine = new readings(process.env.WORKSPACE);
const data = engine.getPipelineData('local-weather');

// Calculate average temp
const avgTemp = data.reduce((sum, r) => sum + r.temp, 0) / data.length;
console.log(`Average temperature: ${avgTemp}°C`);
```

---

## Example 2: Application Log Monitor

**Use Case:** Watch log directory for errors and warnings

### Configuration

```json
{
  "id": "log-monitor",
  "name": "📋 Application Log Monitor",
  "enabled": true,
  "sources": [{
    "id": "app-logs",
    "type": "file",
    "path": "logs/app",
    "pattern": "*.log.json",
    "watchInterval": "1m"
  }],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "level": "$.level",
        "message": "$.message",
        "service": "$.service",
        "timestamp": "$.timestamp"
      }
    },
    {
      "type": "filter",
      "condition": "item.level === 'ERROR' || item.level === 'WARN'"
    }
  ],
  "storage": {
    "path": "data/pipelines/errors",
    "retention": "30d"
  },
  "triggers": [
    {
      "id": "error-alert",
      "condition": "item.level === 'ERROR'",
      "action": "send_notification",
      "template": "🚨 ERROR in {{service}}:\n{{message}}",
      "cooldown": "5m",
      "priority": "high",
      "enabled": true
    }
  ]
}
```

### Test Data

```bash
# Create test log
mkdir -p logs/app
echo '{"level":"ERROR","message":"Database connection failed","service":"api","timestamp":"2026-02-13T10:00:00Z"}' > logs/app/test.log.json

# Run pipeline
node skills/realtime-pipelines/realtime-pipelines.js

# Check results
cat data/pipelines/errors/current.jsonl
```

---

## Example 3: Cryptocurrency Price Tracker

**Use Case:** Track Bitcoin price and alert on significant changes

### Configuration

```json
{
  "id": "crypto-tracker",
  "name": "₿ Bitcoin Price Tracker",
  "enabled": true,
  "sources": [{
    "id": "coinbase",
    "type": "api",
    "url": "https://api.coinbase.com/v2/prices/BTC-USD/spot",
    "pollInterval": "5m"
  }],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "price": "$.data.amount",
        "currency": "$.data.currency",
        "timestamp": "_now"
      }
    }
  ],
  "storage": {
    "path": "data/pipelines/btc-price",
    "retention": "90d"
  },
  "triggers": [
    {
      "id": "price-milestone",
      "condition": "parseFloat(item.price) > 60000",
      "action": "send_notification",
      "template": "🚀 BTC > $60k!\nCurrent: ${{price}}",
      "cooldown": "1h",
      "enabled": true
    }
  ]
}
```

### Price Analysis

```bash
# Get current price
tail -1 data/pipelines/btc-price/current.jsonl | jq '.price'

# Price history (last 24 hours)
tail -288 data/pipelines/btc-price/current.jsonl | jq '[.price] | @csv'

# Calculate 24h change
cat data/pipelines/btc-price/current.jsonl | jq -s '[.[0].price, .[-1].price] | .[1] - .[0]'
```

---

## Example 4: GitHub Repository Monitor

**Use Case:** Track new releases and issues for repositories

### Configuration

```json
{
  "id": "github-releases",
  "name": "🐙 GitHub Release Monitor",
  "enabled": true,
  "sources": [{
    "id": "nodejs-releases",
    "type": "api",
    "url": "https://api.github.com/repos/nodejs/node/releases",
    "method": "GET",
    "headers": {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "TARS/1.0"
    },
    "pollInterval": "6h"
  }],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "version": "$.tag_name",
        "name": "$.name",
        "published": "$.published_at",
        "url": "$.html_url",
        "body": "$.body"
      }
    },
    {
      "type": "filter",
      "condition": "true"
    }
  ],
  "storage": {
    "path": "data/pipelines/nodejs-releases",
    "retention": "365d"
  },
  "triggers": [
    {
      "id": "new-release",
      "condition": "true",
      "action": "send_notification",
      "template": "🎉 New Node.js Release!\n{{version}}: {{name}}\n🔗 {{url}}",
      "cooldown": "12h",
      "enabled": true
    }
  ]
}
```

---

## Example 5: Website Change Detector

**Use Case:** Monitor webpage and notify when content changes

### Configuration

```json
{
  "id": "website-monitor",
  "name": "🌐 Website Change Monitor",
  "enabled": true,
  "sources": [{
    "id": "status-page",
    "type": "scrape",
    "url": "https://status.example.com",
    "schedule": "*/30 * * * *",
    "selectors": {
      "status": ".status-indicator",
      "message": ".status-message",
      "lastUpdate": ".timestamp"
    }
  }],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "status": "$.status",
        "message": "$.message",
        "lastUpdate": "$.lastUpdate"
      }
    },
    {
      "type": "deduplicate",
      "fields": ["message"]
    }
  ],
  "storage": {
    "path": "data/pipelines/website-changes"
  },
  "triggers": [
    {
      "id": "status-changed",
      "condition": "true",
      "action": "send_notification",
      "template": "🔄 Status Update:\n{{status}}\n{{message}}",
      "enabled": true
    }
  ]
}
```

---

## Example 6: RSS News Aggregator

**Use Case:** Collect tech news from multiple sources with relevance filtering

### Configuration

```json
{
  "id": "tech-news",
  "name": "📰 Tech News Aggregator",
  "enabled": true,
  "sources": [
    {
      "id": "hackernews",
      "type": "rss",
      "url": "https://news.ycombinator.com/rss",
      "pollInterval": "30m"
    },
    {
      "id": "dev-to",
      "type": "rss",
      "url": "https://dev.to/feed",
      "pollInterval": "1h"
    },
    {
      "id": "reddit-programming",
      "type": "api",
      "url": "https://www.reddit.com/r/programming.json",
      "pollInterval": "1h"
    }
  ],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "title": "$.title",
        "link": "$.link || $.url",
        "source": "source",
        "published": "$.pubDate || $.created"
      }
    },
    {
      "type": "filter",
      "condition": "item.title.length > 10"
    },
    {
      "type": "deduplicate",
      "fields": ["title"]
    }
  ],
  "storage": {
    "path": "data/pipelines/tech-news",
    "retention": "30d"
  },
  "triggers": [
    {
      "id": "daily-digest",
      "condition": "true",
      "action": "queue_daily_digest",
      "deliveryTime": "09:00",
      "maxItems": 15,
      "enabled": true
    }
  ]
}
```

### Daily Digest Query

```bash
# Get today's items
TODAY=$(date +%Y-%m-%d)
cat data/pipelines/tech-news/current.jsonl | \
  jq -r 'select(._storedAt | startswith("'$TODAY'")) | "- [\(.title)](\(.link))"'
```

---

## Example 7: System Metrics Monitor

**Use Case:** Collect metrics from multiple servers

### Configuration

```json
{
  "id": "system-metrics",
  "name": "📊 System Metrics Monitor",
  "enabled": true,
  "sources": [
    {
      "id": "server-1-metrics",
      "type": "api",
      "url": "http://server1.local:9090/metrics",
      "pollInterval": "5m"
    },
    {
      "id": "server-2-metrics",
      "type": "api",
      "url": "http://server2.local:9090/metrics",
      "pollInterval": "5m"
    }
  ],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "cpu": "$.cpu_usage",
        "memory": "$.memory_usage",
        "disk": "$.disk_usage",
        "server": "source"
      }
    },
    {
      "type": "filter",
      "condition": "item.cpu > 80 || item.memory > 80 || item.disk > 90"
    }
  ],
  "storage": {
    "path": "data/pipelines/metrics"
  },
  "triggers": [
    {
      "id": "high-cpu",
      "condition": "item.cpu > 90",
      "action": "send_notification",
      "template": "⚠️ High CPU on {{server}}: {{cpu}}%",
      "priority": "high",
      "cooldown": "15m",
      "enabled": true
    },
    {
      "id": "disk-full",
      "condition": "item.disk > 95",
      "action": "send_notification",
      "template": "🚨 Disk almost full on {{server}}: {{disk}}%",
      "priority": "critical",
      "enabled": true
    }
  ]
}
```

---

## Example 8: API Rate Limit Monitor

**Use Case:** Track API usage and warn before hitting limits

### Configuration

```json
{
  "id": "api-usage",
  "name": "🔧 API Usage Monitor",
  "enabled": true,
  "sources": [{
    "id": "api-stats",
    "type": "api",
    "url": "https://api.example.com/usage",
    "method": "GET",
    "auth": {
      "type": "bearer",
      "token": "env:API_TOKEN"
    },
    "pollInterval": "15m"
  }],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "calls": "$.usage.calls",
        "limit": "$.usage.limit",
        "resetTime": "$.usage.reset"
      }
    }
  ],
  "storage": {
    "path": "data/pipelines/api-usage"
  },
  "triggers": [
    {
      "id": "usage-warning",
      "condition": "item.calls / item.limit > 0.8",
      "action": "send_notification",
      "template": "⚠️ API usage at {{calls}}/{{limit}}\nResets: {{resetTime}}",
      "cooldown": "1h",
      "priority": "high",
      "enabled": true
    }
  ]
}
```

---

## Example 9: E-commerce Price Tracker

**Use Case:** Monitor product prices across multiple sites

### Configuration

```json
{
  "id": "price-tracker",
  "name": "💰 Product Price Tracker",
  "enabled": true,
  "sources": [
    {
      "id": "amazon-product",
      "type": "scrape",
      "url": "https://www.amazon.com/dp/B08N5WRWNW",
      "schedule": "0 */6 * * *",
      "selectors": {
        "price": ".a-price-whole",
        "availability": "#availability span",
        "rating": ".a-icon-star span"
      }
    },
    {
      "id": "bestbuy-product",
      "type": "scrape",
      "url": "https://www.bestbuy.com/site/123456",
      "schedule": "0 */6 * * *",
      "selectors": {
        "price": ".priceView-hero-price span",
        "availability": ".fulfillment-add-to-cart-button"
      }
    }
  ],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "price": "$.price",
        "available": "$.availability",
        "store": "source"
      }
    }
  ],
  "storage": {
    "path": "data/pipelines/prices"
  },
  "triggers": [
    {
      "id": "price-drop",
      "condition": "parseFloat(item.price) < 299",
      "action": "send_notification",
      "template": "🎉 Price drop at {{store}}!\nNow: ${{price}}",
      "priority": "high",
      "enabled": true
    }
  ]
}
```

---

## Example 10: Social Media Mentions

**Use Case:** Track mentions of your brand/product

### Configuration

```json
{
  "id": "social-mentions",
  "name": "📱 Social Media Monitor",
  "enabled": true,
  "sources": [
    {
      "id": "twitter-search",
      "type": "api",
      "url": "https://api.twitter.com/2/tweets/search/recent",
      "method": "GET",
      "auth": {
        "type": "bearer",
        "token": "env:TWITTER_BEARER_TOKEN"
      },
      "params": {
        "query": "YourBrand OR #YourHashtag",
        "max_results": 10
      },
      "pollInterval": "15m"
    },
    {
      "id": "reddit-mentions",
      "type": "api",
      "url": "https://www.reddit.com/search.json",
      "params": {
        "q": "YourBrand",
        "sort": "new",
        "limit": 25
      },
      "pollInterval": "30m"
    }
  ],
  "transformations": [
    {
      "type": "extract",
      "fields": {
        "text": "$.text || $.title",
        "author": "$.author_id || $.author",
        "url": "$.url",
        "source": "source"
      }
    },
    {
      "type": "deduplicate",
      "fields": ["text"]
    }
  ],
  "storage": {
    "path": "data/pipelines/mentions"
  },
  "triggers": [
    {
      "id": "new-mention",
      "condition": "true",
      "action": "send_notification",
      "template": "💬 New mention on {{source}}:\n{{text}}\n🔗 {{url}}",
      "cooldown": "30m",
      "enabled": true
    }
  ]
}
```

---

## Testing Tips

### 1. Start with Simulation

Before connecting real APIs, test with simulated data:

```javascript
// In realtime-pipelines.js, pollAPISource() returns demo data
// Verify transformations work before adding real endpoints
```

### 2. Use Small Poll Intervals for Testing

```json
{
  "pollInterval": "1m"  // Test mode
  // Change to "15m" or "1h" for production
}
```

### 3. Test Filters Separately

```bash
# Check what data looks like before filtering
cat data/pipelines/my-pipeline/current.jsonl | jq '.'

# Adjust filter condition based on actual data structure
```

### 4. Monitor Logs

```bash
# Watch logs in real-time
tail -f logs/pipelines.log

# Check for errors
grep ERROR logs/pipelines.log
```

---

## Performance Optimization

### 1. Stagger Poll Intervals

Don't poll all sources simultaneously:

```json
{
  "sources": [
    { "pollInterval": "15m" },  // Polls at :00, :15, :30, :45
    { "pollInterval": "17m" },  // Polls at different times
    { "pollInterval": "20m" }
  ]
}
```

### 2. Use Appropriate Retention

```json
{
  "storage": {
    "retention": "7d"   // Short-term data
    // vs
    "retention": "365d" // Long-term analytics
  }
}
```

### 3. Filter Early

Put filter transformations before expensive operations:

```json
{
  "transformations": [
    { "type": "extract" },
    { "type": "filter" },      // Filter first
    { "type": "enrich" }       // Then enrich (expensive)
  ]
}
```

---

## Integration Patterns

### Pattern 1: Heartbeat Integration

Add to `HEARTBEAT.md`:

```markdown
## Data Pipeline Check (every 15 min)

Check: Run pipeline polling
Action: node skills/realtime-pipelines/realtime-pipelines.js
```

### Pattern 2: Cron Job

```cron
*/15 * * * * cd /workspace && WORKSPACE=/workspace node skills/realtime-pipelines/realtime-pipelines.js >> logs/cron.log 2>&1
```

### Pattern 3: Trigger-Based

Use triggers system to invoke on specific events.

---

## Troubleshooting Guide

### Issue: No data collected

**Check:**
1. Is pipeline `enabled: true`?
2. Are sources returning data? (check logs)
3. Is filter too restrictive? (try `"condition": "true"`)
4. Check `WORKSPACE` environment variable

### Issue: Duplicate data

**Solution:** Add deduplication:

```json
{
  "transformations": [
    {
      "type": "deduplicate",
      "fields": ["id"]
    }
  ]
}
```

### Issue: API rate limiting

**Solution:** Increase poll interval:

```json
{
  "pollInterval": "1h"  // Instead of "5m"
}
```

---

## Next Steps

1. ✅ Pick an example closest to your use case
2. ✅ Customize the configuration
3. ✅ Test with simulated data
4. ✅ Add real API credentials
5. ✅ Monitor and refine

---

## See Also

- **Quick Start:** `QUICKSTART.md`
- **Configuration Reference:** `CONFIGURATION_REFERENCE.md`
- **Test Results:** `TEST_RESULTS.md`
- **Integration Guide:** `INTEGRATION_GUIDE.md`

---

**Ready to build?** Start with the weather example and customize from there!
