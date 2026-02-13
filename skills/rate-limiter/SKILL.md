# Rate Limiting & Quota Management

**Purpose:** Prevents API abuse and manages token budgets per user/session with graceful degradation.

## How It Works

Tracks and enforces limits on:
- **Token usage** per session/user/day
- **API calls** per minute/hour/day
- **Cost budgets** per session/day/month
- **Tool usage** per session

When limits approached:
1. **Warning alerts** at 80% threshold
2. **Graceful degradation** at 90% (switch to cheaper models)
3. **Hard limits** at 100% (block requests, queue for later)

## Limit Types

### 1. Token Limits
```json
{
  "type": "token",
  "limits": {
    "perSession": 100000,
    "perUser": 500000,
    "perDay": 1000000
  },
  "actions": {
    "80%": "warn",
    "90%": "switch_to_haiku",
    "100%": "block"
  }
}
```

### 2. Cost Limits
```json
{
  "type": "cost",
  "limits": {
    "perSession": 1.00,
    "perDay": 10.00,
    "perMonth": 200.00
  },
  "actions": {
    "80%": "warn",
    "90%": "switch_to_haiku",
    "100%": "queue_for_tomorrow"
  }
}
```

### 3. Rate Limits (API calls)
```json
{
  "type": "rate",
  "limits": {
    "perMinute": 60,
    "perHour": 1000,
    "perDay": 10000
  },
  "actions": {
    "80%": "slow_down",
    "100%": "queue_with_backoff"
  }
}
```

### 4. Tool-Specific Limits
```json
{
  "type": "tool",
  "limits": {
    "browser": {
      "perHour": 100,
      "perDay": 500
    },
    "web_search": {
      "perHour": 50,
      "perDay": 200
    },
    "exec": {
      "perSession": 50
    }
  }
}
```

## Graceful Degradation Strategy

**Cost Optimization Cascade:**
1. **Normal:** claude-sonnet-4-5 ($15/M tokens)
2. **80% Budget:** Switch to haiku-4-5 ($1/M tokens) for non-critical
3. **90% Budget:** Switch ALL to haiku-4-5
4. **95% Budget:** Queue non-urgent requests for next period
5. **100% Budget:** Block all requests except critical

**Performance Degradation:**
1. **Normal:** Full features, parallel execution
2. **80% Limit:** Reduce parallelism (5 → 3 agents)
3. **90% Limit:** Sequential execution only
4. **100% Limit:** Queue for later

## Usage Tracking

**Real-Time Metrics:**
```json
{
  "session": "main:abc123",
  "user": "shawn@example.com",
  "period": "2026-02-12",
  "usage": {
    "tokens": {
      "used": 45000,
      "limit": 100000,
      "percentage": 45
    },
    "cost": {
      "used": 0.67,
      "limit": 10.00,
      "percentage": 6.7
    },
    "apiCalls": {
      "used": 234,
      "limit": 1000,
      "percentage": 23.4
    }
  },
  "status": "normal",
  "actions": []
}
```

## Integration Points

**Cost Tracking:** Reads from `costs.json`
**Session Stats:** Uses `session_status` for token counts
**HEARTBEAT:** Checks limits every 15 minutes
**Tool Wrappers:** Enforces limits before tool execution

## Alert Examples

### Warning Alert (80%)
```
⚠️ Budget Alert: 80% of daily cost limit used
Current: $8.00 / $10.00
Remaining: $2.00
Recommendation: Switching non-critical tasks to haiku-4-5
```

### Critical Alert (95%)
```
🚨 Budget Critical: 95% of daily cost limit used
Current: $9.50 / $10.00
Remaining: $0.50
Action: Queueing non-urgent requests for tomorrow
```

### Hard Limit (100%)
```
🛑 Budget Exceeded: Daily limit reached
Current: $10.00 / $10.00
Action: All requests blocked until midnight (5 hours 23 minutes)
Queued requests: 3
```

## Configuration File

**Location:** `workspace/rate-limits.json`

```json
{
  "enabled": true,
  "limits": {
    "tokens": {
      "perSession": 100000,
      "perDay": 1000000
    },
    "cost": {
      "perSession": 1.00,
      "perDay": 10.00,
      "perMonth": 200.00
    },
    "apiCalls": {
      "perMinute": 60,
      "perHour": 1000
    }
  },
  "thresholds": {
    "warning": 0.8,
    "degradation": 0.9,
    "critical": 0.95,
    "block": 1.0
  },
  "actions": {
    "warning": ["alert_user", "log"],
    "degradation": ["switch_to_haiku", "alert_user"],
    "critical": ["queue_non_urgent", "alert_user"],
    "block": ["block_requests", "alert_user", "notify_admin"]
  }
}
```

## Files Created

- `rate-limiter.js` - Core rate limiting engine
- `quota-tracker.js` - Usage tracking
- `degradation-manager.js` - Graceful degradation logic
- `rate-limits.json` - Configuration

---

**Status:** ✅ Deployed (2026-02-12 22:25)  
**Confidence:** 100% (integrates with existing cost tracking)
