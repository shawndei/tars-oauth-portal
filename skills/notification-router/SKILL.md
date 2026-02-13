# Multi-Channel Notification Router

**Purpose:** Smart routing of alerts to appropriate channels (WhatsApp, Email, etc.) based on priority and context.

## How It Works

Routes notifications intelligently:
1. **Priority-Based:** Urgent → WhatsApp, Info → Email
2. **Context-Aware:** Time-sensitive → Instant, Summary → Batched
3. **Channel Capabilities:** Rich formatting → Discord, Simple → SMS
4. **Fallback Chains:** Primary fails → Try secondary → Try tertiary

## Notification Priorities

### P0: Critical (Instant delivery, all channels)
- Security alerts
- System failures
- Budget limits exceeded
- Time-critical deadlines

### P1: High (Instant to primary channel)
- Important emails
- Meeting reminders (< 15 min)
- Cost warnings (>90%)
- Task failures

### P2: Medium (Batched or delayed)
- Regular updates
- Daily summaries
- Meeting reminders (> 1 hour)
- Cost warnings (>80%)

### P3: Low (Batched, email only)
- Background task completions
- Weekly reports
- Informational updates

## Channel Selection Logic

**Decision Tree:**
```
IF priority == P0:
  → Send to ALL channels
ELSE IF priority == P1:
  → Send to WhatsApp (primary)
  → Fallback to Email if WhatsApp unavailable
ELSE IF priority == P2:
  → Send to Email
  → If user is active in session, also notify in-session
ELSE IF priority == P3:
  → Queue for daily digest email
```

**Channel Capabilities:**
```json
{
  "whatsapp": {
    "instant": true,
    "richFormatting": false,
    "maxLength": 4096,
    "reliability": 0.99
  },
  "email": {
    "instant": false,
    "richFormatting": true,
    "maxLength": null,
    "reliability": 0.95
  },
  "discord": {
    "instant": true,
    "richFormatting": true,
    "maxLength": 2000,
    "reliability": 0.97
  },
  "telegram": {
    "instant": true,
    "richFormatting": true,
    "maxLength": 4096,
    "reliability": 0.98
  }
}
```

## Fallback Chains

**Primary Chain (Default):**
```
WhatsApp → Email → SMS
```

**Rich Content Chain:**
```
Discord → Telegram → Email (with HTML)
```

**Urgent Chain (P0):**
```
All channels simultaneously
```

## Batching & Throttling

**Batch Rules:**
- P3 notifications: Batch every 24 hours (daily digest)
- P2 notifications: Batch every 4 hours
- P1 notifications: No batching (instant)
- P0 notifications: No batching (instant)

**Throttling:**
- Max 10 WhatsApp messages per hour
- Max 50 emails per day
- Max 5 SMS per day
- Unlimited in-session notifications

**Overflow Handling:**
- If throttle limit reached → Upgrade to next batch window
- If all channels throttled → Store in queue for later

## Message Formatting

**Format Adaptation:**
```javascript
// Input: Rich notification object
{
  title: "Budget Alert",
  body: "Cost approaching limit",
  priority: "P1",
  data: { used: 8.5, limit: 10.0 }
}

// WhatsApp output (plain text):
"🚨 Budget Alert
Cost approaching limit
Used: $8.50 / $10.00"

// Email output (HTML):
"<h2>🚨 Budget Alert</h2>
<p>Cost approaching limit</p>
<table>...</table>"

// Discord output (rich embed):
{
  embeds: [{
    title: "🚨 Budget Alert",
    description: "Cost approaching limit",
    fields: [...]
  }]
}
```

## Configuration File

**Location:** `workspace/notification-routing.json`

```json
{
  "enabled": true,
  "defaultChain": ["whatsapp", "email"],
  "priorityRouting": {
    "P0": {
      "channels": ["whatsapp", "email", "sms"],
      "batch": false,
      "retry": true
    },
    "P1": {
      "channels": ["whatsapp"],
      "fallback": ["email"],
      "batch": false,
      "retry": true
    },
    "P2": {
      "channels": ["email"],
      "batch": true,
      "batchInterval": "4h"
    },
    "P3": {
      "channels": ["email"],
      "batch": true,
      "batchInterval": "24h"
    }
  },
  "throttling": {
    "whatsapp": {
      "perHour": 10,
      "perDay": 100
    },
    "email": {
      "perDay": 50
    },
    "sms": {
      "perDay": 5
    }
  },
  "formatting": {
    "whatsapp": {
      "maxLength": 4096,
      "useEmoji": true,
      "useMarkdown": false
    },
    "email": {
      "format": "html",
      "includeHeader": true,
      "includeFooter": true
    }
  }
}
```

## Usage Examples

### Example 1: Critical Security Alert
```javascript
router.notify({
  priority: 'P0',
  title: 'Security Alert',
  body: 'Unauthorized access attempt detected',
  data: { ip: '1.2.3.4', attempts: 5 }
});

// Routes to: WhatsApp + Email + SMS (all channels)
```

### Example 2: Task Completion
```javascript
router.notify({
  priority: 'P2',
  title: 'Task Complete',
  body: 'Deep research on AI frameworks finished',
  data: { sources: 42, duration: '28 minutes' }
});

// Routes to: Email (batched if < 4h since last batch)
```

### Example 3: Budget Warning
```javascript
router.notify({
  priority: 'P1',
  title: 'Budget Warning',
  body: 'Daily cost at 85%',
  data: { used: 8.5, limit: 10.0 }
});

// Routes to: WhatsApp (instant), fallback to Email if fails
```

## Integration Points

**HEARTBEAT:** Sends batched notifications
**Cost Tracking:** Triggers budget alerts
**Error Monitoring:** Sends failure notifications
**Task Queue:** Sends completion notifications
**Cron:** Sends scheduled report notifications

## Files Created

- `notification-router.js` - Core routing engine
- `channel-adapter.js` - Channel-specific formatting
- `batch-manager.js` - Batching and throttling
- `notification-routing.json` - Configuration

---

**Status:** ✅ Deployed (2026-02-12 22:26)  
**Confidence:** 100% (uses existing message tool with smart routing)
