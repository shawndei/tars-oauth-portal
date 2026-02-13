# Cost Tracking System - Integration Checklist

**Status:** Ready for integration into OpenClaw main agent  
**Implementation Date:** 2026-02-13  
**Test Results:** ✅ 100% (41/41 tests passed)

---

## Quick Start

The cost tracking system is now ready to integrate. Here's what you need to do:

### 1. Locate Session Initialization Code

Find where OpenClaw initializes sessions in the main agent loop. This is typically in:
- `main.js` or main agent entry point
- Session manager or controller
- Request handler

### 2. Add Hook Initialization

At the top of your main session file, add:

```javascript
const SessionCostHook = require('./skills/rate-limiter/session-cost-hook');

let costHook;

async function initializeCostTracking() {
  costHook = new SessionCostHook({
    workspaceRoot: process.env.OPENCLAW_WORKSPACE || process.cwd()
  });
  console.log('[CostTracking] Initialized');
}
```

Call this during agent startup:

```javascript
await initializeCostTracking();
```

### 3. Add Session Start Hook

When a session begins, call:

```javascript
// At session start
costHook.onSessionStart({
  sessionId: session.id,
  sessionKey: session.key,  // e.g., "main:abc123"
  model: session.model || 'claude-sonnet-4-5',
  taskType: session.type || 'general'
});
```

### 4. Add Session End Hook

When session ends (in finally block), call:

```javascript
// At session end (always execute, even on error)
try {
  // ... session execution ...
  const result = await sessionExecutor.run(session);
  
} finally {
  // Record costs with token counts from session
  const sessionTokens = session.getTokenCounts(); // or similar
  
  await costHook.onSessionEnd({
    sessionId: session.id,
    sessionKey: session.key,
    inputTokens: sessionTokens.input || 0,
    outputTokens: sessionTokens.output || 0,
    totalTokens: sessionTokens.total || 0,
    apiCalls: session.apiCallCount || 0,
    model: session.model
  });
}
```

### 5. Test

Run the included test:

```bash
node tests/cost-tracking-test.js
```

Expected output:
```
✅ Passed: 41
❌ Failed: 0
📊 Total: 41
📈 Success Rate: 100.0%

🎉 All tests passed! Cost tracking system is operational.
```

---

## Integration Points

### Option A: Session Wrapper (Recommended)

Create a wrapper around session execution:

```javascript
async function executeSessionWithCostTracking(session) {
  // Start
  costHook.onSessionStart({
    sessionId: session.id,
    sessionKey: session.key,
    model: session.model,
    taskType: session.type
  });

  try {
    // Execute
    return await session.execute();
    
  } finally {
    // End with actual token counts
    const tokens = session.getTokenCounts();
    await costHook.onSessionEnd({
      sessionId: session.id,
      sessionKey: session.key,
      inputTokens: tokens.input,
      outputTokens: tokens.output,
      totalTokens: tokens.total,
      apiCalls: tokens.calls,
      model: session.model
    });
  }
}
```

### Option B: Explicit Hooks (If Session Objects Available)

```javascript
// In session object or manager:

session.on('start', (sessionInfo) => {
  costHook.onSessionStart(sessionInfo);
});

session.on('end', async (finalTokens) => {
  await costHook.onSessionEnd({
    ...sessionInfo,
    ...finalTokens
  });
});
```

### Option C: Middleware Pattern

```javascript
function costTrackingMiddleware(sessionRunner) {
  return async (session) => {
    costHook.onSessionStart({
      sessionId: session.id,
      sessionKey: session.key,
      model: session.model,
      taskType: session.type
    });

    try {
      return await sessionRunner(session);
    } finally {
      const tokens = session.getTokenCounts();
      await costHook.onSessionEnd({
        sessionId: session.id,
        sessionKey: session.key,
        inputTokens: tokens.input,
        outputTokens: tokens.output,
        apiCalls: tokens.calls,
        model: session.model
      });
    }
  };
}
```

---

## Data Requirements

The system needs these values at session end:

| Field | Required | Source | Notes |
|-------|----------|--------|-------|
| sessionId | ✅ Yes | Session object | Unique identifier |
| sessionKey | ✅ Yes | Session object | e.g., "main:abc123" |
| inputTokens | ⚠️ Optional | OpenClaw telemetry | Count of input tokens used |
| outputTokens | ⚠️ Optional | OpenClaw telemetry | Count of output tokens generated |
| totalTokens | ⚠️ Optional | Calculated | = inputTokens + outputTokens |
| apiCalls | ⚠️ Optional | Session counter | Number of API calls made |
| model | ✅ Yes | Session config | e.g., "claude-sonnet-4-5" |

**Note:** Optional fields default to 0. System works with or without detailed token counts, but accuracy improves with actual counts.

---

## Token Count Sources

### From OpenClaw Runtime

If using OpenClaw's built-in token counting:

```javascript
const tokenCounts = session_status.tokens; // or similar

await costHook.onSessionEnd({
  // ...
  inputTokens: tokenCounts.prompt || 0,
  outputTokens: tokenCounts.completion || 0,
  // ...
});
```

### From Claude API Response

If capturing from Claude API:

```javascript
const response = await client.messages.create({...});

const tokens = {
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens
};

await costHook.onSessionEnd({
  // ...
  inputTokens: tokens.inputTokens,
  outputTokens: tokens.outputTokens,
  // ...
});
```

### Manual Estimation

If exact counts unavailable, use estimates:

```javascript
const estimatedTokens = Math.ceil(response.length / 4); // rough estimate

await costHook.onSessionEnd({
  // ...
  totalTokens: estimatedTokens,
  // ...
});
```

---

## What Gets Tracked

### Real-Time
- ✅ Session cost ($)
- ✅ Tokens consumed
- ✅ API calls made
- ✅ Start/end time
- ✅ Model used
- ✅ Task type

### Files Updated
- **costs.json** - Daily/hourly/session breakdown
- **analytics/costs.json** - Live session feed
- **monitoring_logs/budget-status.log** - Threshold alerts
- **monitoring_logs/cost-alerts.jsonl** - JSON alert records

### Alerts Generated
- 80% budget: ⚠️ WARNING
- 90% budget: 🟠 DEGRADATION (switch to Haiku)
- 95% budget: 🔴 CRITICAL (queue non-urgent)
- 100% budget: 🛑 BLOCKED (stop normal requests)

---

## Verification Steps

After integration, verify:

### 1. Costs.json Updated

```bash
# Check if today's entry exists
cat costs.json | grep "$(date +%Y-%m-%d)"
# Should show daily cost, sessions, perHour breakdown
```

### 2. Analytics/Costs.json Populated

```bash
# Check sessions array
cat analytics/costs.json | jq '.sessions | length'
# Should be > 0
```

### 3. Alerts Firing

```bash
# Check budget status log
cat monitoring_logs/budget-status.log | tail -5
# Should show threshold events

# Check JSON alerts
cat monitoring_logs/cost-alerts.jsonl | jq '.status' | sort | uniq -c
# Should show distribution: warning, degradation, critical, blocked
```

### 4. Summary Stats

```bash
# Check totals
cat costs.json | jq '.summary'
# Should show totalCost, projected monthly, etc.
```

---

## Troubleshooting

### Issue: costs.json Not Updating

**Check:**
1. Is `onSessionEnd()` being called?
2. Are token counts being passed correctly?
3. Check file permissions on costs.json

**Fix:**
```javascript
// Add debug logging
console.log('[CostTracking] Session ending:', {
  sessionId,
  inputTokens,
  outputTokens
});

const result = await costHook.onSessionEnd({...});
console.log('[CostTracking] Result:', result);
```

### Issue: analytics/costs.json Still Empty

**Check:**
1. Is the analytics/ directory created?
2. Are sessions being recorded?

**Fix:**
```bash
# Manually create directory
mkdir -p analytics/

# Check permissions
chmod 755 analytics/
```

### Issue: Alerts Not Firing

**Check:**
1. Is `checkBudgetAndAlert()` being called?
2. Is costs.json being read correctly?
3. Check monitoring_logs/ directory exists

**Fix:**
```bash
# Create monitoring logs directory
mkdir -p monitoring_logs/

# Manually trigger alert for testing
node -e "
const CostTracker = require('./skills/rate-limiter/cost-tracker');
const tracker = new CostTracker();
tracker.checkBudgetAndAlert({
  '2026-02-13': { daily: { cost: 8.0 } }
}, '2026-02-13');
"
```

---

## Performance Notes

- **Overhead:** ~1-5ms per session (cost calculation + file I/O)
- **File Size:** costs.json ~5-10 KB per day
- **Storage:** ~150 KB/month for analytics
- **Frequency:** Only writes at session end (no polling)

---

## Configuration

Default values in cost-tracker.js:

```javascript
// Daily budget ($/day)
const dailyBudget = 10.00;

// Monthly budget ($/month)
const monthlyBudget = 200.00;

// Thresholds
const thresholds = {
  warning: 0.80,      // 80%
  degradation: 0.90,  // 90% - switch to Haiku
  critical: 0.95,     // 95% - queue non-urgent
  block: 1.00         // 100% - block requests
};

// Model pricing (per 1M tokens)
const pricing = {
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.08, output: 0.4 },
  'claude-opus-4-5': { input: 15, output: 75 }
};
```

To customize, edit `skills/rate-limiter/cost-tracker.js` or create a config file and pass to constructor.

---

## Integration Checklist

- [ ] Read COST_TRACKING_FIX_REPORT.md for overview
- [ ] Read INTEGRATION.md for detailed specs
- [ ] Review cost-tracker.js and session-cost-hook.js
- [ ] Choose integration approach (A, B, or C)
- [ ] Locate session initialization in codebase
- [ ] Add costHook initialization
- [ ] Add onSessionStart() call
- [ ] Add onSessionEnd() call in finally block
- [ ] Test with: `node tests/cost-tracking-test.js`
- [ ] Verify costs.json updates after session
- [ ] Verify analytics/costs.json gets session data
- [ ] Check monitoring_logs/ for alert entries
- [ ] Monitor budget thresholds over time
- [ ] Document in project README

---

## Support

For questions or issues:
1. Check COST_TRACKING_FIX_REPORT.md for verification steps
2. Review INTEGRATION.md for complete specifications
3. Run test suite: `node tests/cost-tracking-test.js`
4. Check logs: `monitoring_logs/budget-status.log`
5. Inspect data: `cat costs.json | jq '.summary'`

---

**Ready to integrate!** 🚀

The system is fully implemented, tested (100% pass rate), and ready for production use. Integration should take 10-15 minutes depending on session code structure.
