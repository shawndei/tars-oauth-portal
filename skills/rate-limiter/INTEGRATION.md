# Cost Tracking System Integration Guide

## Overview

The cost tracking system has been rebuilt to capture real-time token usage and record actual session costs to `costs.json`.

## Components

### 1. **cost-tracker.js** - Core Cost Recording Engine
- Calculates token costs based on model pricing
- Records session data with daily/hourly breakdown
- Fires budget alerts when thresholds are crossed
- Maintains both `costs.json` and `analytics/costs.json`

### 2. **session-cost-hook.js** - Session Lifecycle Integration
- Hooks into session start/end events
- Captures token counts at session completion
- Triggers cost recording automatically
- Handles session metadata tracking

## How It Works

### Session Flow

```
[Session Starts]
  ↓
onSessionStart()
  ├─ Store session metadata (id, model, task type)
  ├─ Record start time
  └─ Track initial state
  
[Session Executes]
  ├─ Process requests
  ├─ Consume tokens
  └─ Make API calls
  
[Session Ends]
  ↓
onSessionEnd()
  ├─ Collect final token counts (input/output)
  ├─ Calculate actual cost
  ├─ Record to costs.json (main structure)
  │   ├─ daily totals
  │   ├─ session detail
  │   ├─ per-hour breakdown
  │   └─ summary projection
  ├─ Update analytics/costs.json (live data feed)
  ├─ Check budget thresholds
  ├─ Fire alerts if needed
  │   ├─ Budget warning (80%)
  │   ├─ Degradation alert (90%)
  │   ├─ Critical alert (95%)
  │   └─ Blocked alert (100%)
  └─ Return cost summary
```

## Integration Points

### For Main Agent

Add this to your session initialization code:

```javascript
const SessionCostHook = require('./skills/rate-limiter/session-cost-hook');
const costHook = new SessionCostHook({
  workspaceRoot: process.env.OPENCLAW_WORKSPACE
});

// At session start
costHook.onSessionStart({
  sessionId: currentSessionId,
  sessionKey: currentSessionKey,
  model: currentModel,
  taskType: 'agent_execution'
});

// At session end (in finally block or session cleanup)
await costHook.onSessionEnd({
  sessionId: currentSessionId,
  sessionKey: currentSessionKey,
  inputTokens: endTokenCounts.input,
  outputTokens: endTokenCounts.output,
  totalTokens: endTokenCounts.total,
  apiCalls: endTokenCounts.apiCalls,
  model: currentModel
});
```

### For Subagents

```javascript
// Each subagent gets automatic tracking
costHook.onSessionStart({
  sessionId: subagentSessionId,
  sessionKey: 'agent:main:subagent:xyz',
  model: 'claude-haiku-4-5',  // Often uses haiku for cost savings
  taskType: 'subagent'
});

// When subagent completes
await costHook.onSessionEnd({
  sessionId: subagentSessionId,
  sessionKey: 'agent:main:subagent:xyz',
  inputTokens: finalTokens.input,
  outputTokens: finalTokens.output,
  apiCalls: apiCallCount,
  model: 'claude-haiku-4-5'
});
```

## Data Structure

### costs.json (Main Record)

```json
{
  "2026-02-13": {
    "daily": {
      "cost": 8.5,
      "tokens": 850000,
      "apiCalls": 234,
      "timestamp": "2026-02-13T15:30:00Z"
    },
    "sessions": {
      "main:abc123": {
        "cost": 3.2,
        "tokens": 320000,
        "inputTokens": 150000,
        "outputTokens": 170000,
        "apiCalls": 85,
        "startTime": "2026-02-13T08:00:00Z",
        "endTime": "2026-02-13T09:15:00Z",
        "model": "sonnet",
        "taskType": "agent_execution"
      },
      "agent:main:subagent:xyz": {
        "cost": 0.45,
        "tokens": 45000,
        "inputTokens": 20000,
        "outputTokens": 25000,
        "apiCalls": 12,
        "startTime": "2026-02-13T09:20:00Z",
        "endTime": "2026-02-13T09:45:00Z",
        "model": "haiku",
        "taskType": "subagent"
      }
    },
    "perHour": {
      "00": { "cost": 0.5, "tokens": 50000, "apiCalls": 12 },
      "01": { "cost": 0.8, "tokens": 80000, "apiCalls": 19 },
      "08": { "cost": 2.1, "tokens": 210000, "apiCalls": 58 },
      "09": { "cost": 1.8, "tokens": 180000, "apiCalls": 48 }
    }
  },
  "summary": {
    "totalCost": 25.8,
    "totalTokens": 2580000,
    "totalApiCalls": 699,
    "periodStart": "2026-02-11",
    "periodEnd": "2026-02-13",
    "daysElapsed": 3,
    "averageDailyCost": 8.6,
    "projectedMonthlyAtCurrentRate": 258,
    "monthlyBudget": 200,
    "status": "exceeding_limit"
  }
}
```

### analytics/costs.json (Live Feed)

```json
{
  "daily_budget": 10,
  "weekly_budget": 50,
  "monthly_budget": 200,
  "current_month": "2026-02",
  "sessions": [
    {
      "sessionKey": "main:abc123",
      "date": "2026-02-13",
      "cost": 3.2,
      "tokens": 320000,
      "inputTokens": 150000,
      "outputTokens": 170000,
      "model": "sonnet",
      "timestamp": "2026-02-13T09:15:00Z"
    },
    {
      "sessionKey": "agent:main:subagent:xyz",
      "date": "2026-02-13",
      "cost": 0.45,
      "tokens": 45000,
      "inputTokens": 20000,
      "outputTokens": 25000,
      "model": "haiku",
      "timestamp": "2026-02-13T09:45:00Z"
    }
  ],
  "last_updated": "2026-02-13T15:30:00Z"
}
```

## Budget Thresholds & Alerts

| Percentage | Level | Status | Action |
|-----------|-------|--------|--------|
| <80% | Normal | ✓ OK | Execute normally |
| 80-90% | Warning | ⚠️ | Alert user, log warning |
| 90-95% | Degradation | 🟠 | Switch to Haiku model |
| 95-100% | Critical | 🔴 | Queue non-urgent tasks |
| 100%+ | Blocked | 🛑 | Block all non-critical requests |

### Alert Messages

When budget thresholds are crossed:

```
⚠️ WARNING: $8.00 / $10.00 (80.0%) - $2.00 remaining
→ Logged to monitoring_logs/budget-status.log
→ Recorded in monitoring_logs/cost-alerts.jsonl

🟠 DEGRADATION: $9.00 / $10.00 (90.0%) - Switched to Haiku mode
→ Logged to monitoring_logs/budget-status.log
→ Model automatically switches to haiku for new tasks
→ Cost savings: ~93% per task

🔴 CRITICAL: $9.50 / $10.00 (95.0%) - Only $0.50 remaining
→ Logged to monitoring_logs/critical-alerts.log
→ Non-urgent tasks queued for next day
→ Admin notified

🛑 BLOCKED: $10.00 / $10.00 (100%) - Daily budget exhausted
→ Logged to monitoring_logs/blocked-requests.log
→ All normal requests blocked with 429 error
→ Critical requests still allowed with admin approval
→ Admin immediately notified
```

## Log Files

### monitoring_logs/budget-status.log
Standard budget status updates (warnings, degradation, critical)

```
[2026-02-13T15:30:00Z] ⚠️ WARNING: $8.00 / $10.00 (80.0%) - $2.00 remaining
[2026-02-13T15:45:00Z] 🟠 DEGRADATION: $9.00 / $10.00 (90.0%) - Switched to Haiku mode
[2026-02-13T16:00:00Z] 🔴 CRITICAL: $9.50 / $10.00 (95.0%) - Only $0.50 remaining
```

### monitoring_logs/cost-alerts.jsonl
Machine-readable alert records

```json
{"timestamp":"2026-02-13T15:30:00Z","date":"2026-02-13","level":"warning","status":"warning","cost":8.00,"budget":10.00,"percentage":80.0,"message":"⚠️ WARNING: $8.00 / $10.00 (80.0%) - $2.00 remaining"}
{"timestamp":"2026-02-13T15:45:00Z","date":"2026-02-13","level":"warning","status":"degradation","cost":9.00,"budget":10.00,"percentage":90.0,"message":"🟠 DEGRADATION: $9.00 / $10.00 (90.0%) - Switched to Haiku mode"}
```

## Model Pricing

The system uses current pricing:

- **claude-sonnet-4-5**: $3/$15 per 1M tokens (default)
- **claude-haiku-4-5**: $0.80/$4 per 1M tokens (93% cheaper, used at 90%+ threshold)
- **claude-opus-4-5**: $15/$75 per 1M tokens (premium, for critical work)

Cost calculation:
```
cost = (input_tokens / 1M × input_rate) + (output_tokens / 1M × output_rate)
```

## Testing

### Test Manual Cost Recording

```javascript
const SessionCostHook = require('./skills/rate-limiter/session-cost-hook');
const hook = new SessionCostHook();

// Record a test session
const result = await hook.recordManualCost({
  sessionId: 'test-123',
  sessionKey: 'test:session',
  model: 'claude-sonnet-4-5',
  inputTokens: 100000,
  outputTokens: 50000,
  apiCalls: 25,
  taskType: 'test'
});

console.log(result);
// {
//   success: true,
//   cost: 0.375,
//   tokens: 150000,
//   status: 'normal'
// }
```

### Check Budget Status

```javascript
const hook = new SessionCostHook();
const summary = await hook.getCostsSummary();
console.log(summary);
// {
//   totalCost: 25.8,
//   totalTokens: 2580000,
//   averageDailyCost: 8.6,
//   projectedMonthlyAtCurrentRate: 258,
//   monthlyBudget: 200,
//   status: 'exceeding_limit'
// }
```

## Verification Checklist

- ✅ costs.json populated with daily/session/hourly breakdown
- ✅ analytics/costs.json contains live session feed
- ✅ Budget warnings fire at 80%+
- ✅ Model switches to Haiku at 90%
- ✅ Critical alerts fire at 95%
- ✅ Request blocking at 100%
- ✅ Alert logs contain all threshold events
- ✅ Session detail includes token counts
- ✅ Summary shows monthly projection

## Troubleshooting

### Issue: costs.json not updating

**Check:**
1. Is `onSessionEnd()` being called? Add console.log to verify
2. Does the session have token counts? Check sessionInfo passed to hook
3. Are there file permission issues? Check monitoring_logs directory

### Issue: analytics/costs.json still empty

**Fix:**
1. Make sure CostTracker.updateAnalyticsCosts() is being called
2. Verify the directory `analytics/` exists
3. Check file permissions

### Issue: Budget alerts not firing

**Check:**
1. Is `checkBudgetAndAlert()` being called?
2. Are costs.json values being read correctly?
3. Check monitoring_logs/budget-status.log for entries
4. Verify budget threshold values in rate-limits.json

## Next Steps

1. Integrate SessionCostHook into OpenClaw agent session management
2. Call `onSessionStart()` at session begin
3. Call `onSessionEnd()` at session completion
4. Monitor monitoring_logs/ for alert firing
5. Verify costs.json structure with test data
6. Test threshold transitions (80% → 90% → 95% → 100%)
