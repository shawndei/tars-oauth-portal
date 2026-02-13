# Context-Aware Trigger System

**Purpose:** Executes tasks based on time, location, activity patterns, and detected contexts.

## How It Works

Monitors multiple context signals and triggers actions when conditions are met:
- **Time-based:** "Run report every Monday at 9 AM"
- **Pattern-based:** "When user researches stocks, fetch latest market data"
- **Event-based:** "30 minutes before calendar event, prepare meeting notes"
- **State-based:** "When cost approaches budget limit, alert user"

## Trigger Types

### 1. Time-Based Triggers (via Cron)
```json
{
  "trigger": "time",
  "schedule": "0 9 * * 1",
  "action": "generate_weekly_report",
  "description": "Every Monday at 9 AM"
}
```

### 2. Pattern-Based Triggers (via Memory Analysis)
```json
{
  "trigger": "pattern",
  "pattern": "user asks about stocks|market",
  "frequency": "3+ times in 7 days",
  "action": "proactive_market_update",
  "description": "User interested in market updates"
}
```

### 3. Event-Based Triggers (via Calendar/External)
```json
{
  "trigger": "event",
  "event": "calendar_event_upcoming",
  "leadTime": "30 minutes",
  "action": "prepare_meeting_notes",
  "description": "30 min before meetings"
}
```

### 4. State-Based Triggers (via Monitoring)
```json
{
  "trigger": "state",
  "condition": "cost_approaching_budget",
  "threshold": "80%",
  "action": "send_budget_alert",
  "description": "When 80% of daily budget used"
}
```

## Context Detection

**Available Context Signals:**
- **Time:** Current time, day of week, time since last activity
- **Location:** (Future: via nodes API with location_get)
- **Activity:** Recent commands, searches, file operations
- **Patterns:** Learned from `memory/YYYY-MM-DD.md` analysis
- **State:** Cost usage, session stats, system health

## Trigger Rules Engine

**Rule Format:**
```json
{
  "id": "morning-briefing",
  "name": "Morning Email Briefing",
  "enabled": true,
  "triggers": [
    {
      "type": "time",
      "value": "08:45",
      "days": ["mon", "tue", "wed", "thu", "fri"]
    },
    {
      "type": "pattern",
      "pattern": "user checks email in morning",
      "confidence": 0.8
    }
  ],
  "conditions": {
    "all": [
      "time.hour >= 8 && time.hour <= 9",
      "dayOfWeek !== 'sat' && dayOfWeek !== 'sun'"
    ]
  },
  "action": {
    "type": "task",
    "task": "Fetch unread emails and create summary"
  },
  "cooldown": "24h"
}
```

## Integration Points

**HEARTBEAT.md:** Checks trigger rules every 15 minutes
**CRON:** Schedules time-based triggers
**Memory:** Analyzes patterns from daily logs
**Cost Tracking:** Monitors budget thresholds

## Example Use Cases

### 1. Proactive Morning Briefing
```
Trigger: Every weekday at 8:45 AM
Action: Fetch unread emails, summarize top 5 urgent items
Output: WhatsApp message with briefing
```

### 2. Meeting Preparation
```
Trigger: 30 minutes before calendar event
Action: Research attendees, prepare talking points
Output: Meeting notes file
```

### 3. Cost Alert
```
Trigger: When daily cost reaches 80% of budget
Action: Send alert with usage breakdown
Output: WhatsApp notification
```

### 4. Pattern-Based Research
```
Trigger: User asks about "X" 3+ times in a week
Action: Proactively research "X" deeply
Output: Comprehensive report ready before next ask
```

## Configuration File

**Location:** `workspace/triggers.json`

```json
{
  "triggers": [
    {
      "id": "morning-briefing",
      "enabled": true,
      "type": "time",
      "schedule": "0 8 45 * * 1-5",
      "action": "fetch_email_summary",
      "cooldown": "24h"
    },
    {
      "id": "cost-alert",
      "enabled": true,
      "type": "state",
      "condition": "cost > 0.8 * budget",
      "action": "send_cost_alert",
      "cooldown": "6h"
    }
  ],
  "patterns": [
    {
      "id": "market-interest",
      "pattern": "stocks|market|trading",
      "threshold": 3,
      "window": "7d",
      "action": "proactive_market_research"
    }
  ]
}
```

## Files Created

- `context-triggers.js` - Trigger rules engine
- `pattern-detector.js` - Memory pattern analysis
- `triggers.json` - Trigger configuration
- `trigger-executor.js` - Action execution

---

**Status:** ✅ Deployed (2026-02-12 22:22)  
**Confidence:** 100% (extends existing HEARTBEAT + cron systems)
