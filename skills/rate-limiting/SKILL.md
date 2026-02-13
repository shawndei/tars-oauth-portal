# Rate Limiting & Budget Enforcement Skill

**Purpose:** Monitor and enforce cost budgets with automatic degradation, queuing, and blocking based on threshold breaches.

## Overview

This skill provides automated budget management for OpenClaw sessions using a tiered response system:

| Threshold | Status | Action | Model |
|-----------|--------|--------|-------|
| 0-80% | Normal | Log costs | Sonnet (default) |
| 80-90% | Warning | Alert user | Sonnet |
| 90-95% | Degraded | Switch to Haiku | Haiku (cost-optimized) |
| 95-100% | Critical | Queue non-urgent | Haiku |
| 100%+ | Blocked | Block new requests | None |

## Core Concepts

### Budget Tiers
1. **Per-Session Limit:** $1.00 (max tokens/cost per conversation)
2. **Per-Day Limit:** $10.00 (daily budget)
3. **Per-Month Limit:** $200.00 (monthly cap)

### Threshold Actions

#### 80% Warning
- **Trigger:** Usage ≥ 80% of daily budget
- **Actions:**
  - Log warning to `monitoring_logs/budget-warnings.log`
  - Alert user with remaining budget
  - No model switch yet; user is warned
- **Example:** $8.00 spent of $10.00 daily = 80% → **Alert: $2.00 remaining**

#### 90% Degradation
- **Trigger:** Usage ≥ 90% of daily budget
- **Actions:**
  - Switch ALL new tasks to `claude-haiku-4-5` (1/15 cost of sonnet)
  - Alert user of model switch
  - Log to monitoring_logs with current spend
  - Reduce token budget per-session proportionally
- **Example:** $9.00 spent of $10.00 daily = 90% → **Switch to Haiku, proceed with caution**

#### 95% Critical
- **Trigger:** Usage ≥ 95% of daily budget
- **Actions:**
  - Queue non-urgent tasks for next billing period
  - Only allow critical/blocking requests
  - Alert admin/user
  - Log to `monitoring_logs/critical-alerts.log`
- **Example:** $9.50 spent of $10.00 daily = 95% → **Queue non-urgent work, only critical requests allowed**

#### 100% Block
- **Trigger:** Usage ≥ 100% of daily budget
- **Actions:**
  - Block ALL new requests except critical
  - Return 429 error with retry-after header
  - Queue request for next billing period
  - Alert admin immediately
  - Log to `monitoring_logs/blocked-requests.log`
- **Example:** $10.00+ spent = **BLOCKED until next billing period**

## Integration Points

### 1. Heartbeat Integration

Add to `HEARTBEAT.md` execution (every heartbeat ~15 min):

```markdown
### 4. Cost Monitoring & Rate Limiting (Every heartbeat)
- Read `costs.json` and `rate-limits.json`
- Calculate current spend vs. daily budget ($10)
- Call checkBudgetStatus() function
- If threshold crossed, execute corresponding action:
  - 80%: Log warning
  - 90%: Switch model context to haiku
  - 95%: Queue non-urgent tasks
  - 100%: Block new requests
- Update `monitoring_logs/budget-status.log` with current status
- If critical (90%+), notify user via message tool
```

### 2. Tool Wrapper Integration

Before executing expensive tools, check budget:

```javascript
async function executeToolWithBudgetCheck(toolName, params) {
  const status = checkBudgetStatus();
  
  if (status.threshold === 'block') {
    throw new Error('Daily budget exhausted');
  }
  
  if (status.threshold === 'degradation') {
    // Switch to haiku for non-critical tools
    if (!params.critical) {
      params.model = 'claude-haiku-4-5';
    }
  }
  
  return executeTool(toolName, params);
}
```

### 3. Session Status Integration

Use OpenClaw's `session_status()` to get real-time token usage:

```bash
openclaw session_status
```

Output includes:
- `tokens_used`: Tokens consumed in current session
- `tokens_limit`: Session token limit
- `cost`: Estimated cost of session

### 4. Costs.json Tracking

Enhanced structure tracks per-session and per-day totals:

```json
{
  "2026-02-13": {
    "daily": {
      "cost": 8.5,
      "tokens": 850000,
      "apiCalls": 234,
      "timestamp": "2026-02-13T07:57:00Z"
    },
    "sessions": {
      "main:abc123": {
        "cost": 3.2,
        "tokens": 320000,
        "apiCalls": 85,
        "startTime": "2026-02-13T00:00:00Z",
        "endTime": "2026-02-13T07:57:00Z",
        "model": "sonnet"
      }
    },
    "perHour": {
      "00": { "cost": 0.5, "tokens": 50000 },
      "01": { "cost": 0.8, "tokens": 80000 },
      "07": { "cost": 2.1, "tokens": 210000 }
    }
  }
}
```

## Monitoring Logs

Create and maintain these log files in `monitoring_logs/`:

### budget-status.log
```
[2026-02-13T09:15:00Z] NORMAL: $6.50 / $10.00 (65%)
[2026-02-13T10:30:00Z] NORMAL: $7.80 / $10.00 (78%)
[2026-02-13T11:15:00Z] WARNING: $8.00 / $10.00 (80%) - Remaining: $2.00
[2026-02-13T12:00:00Z] DEGRADATION: $9.00 / $10.00 (90%) - Switched to Haiku
```

### critical-alerts.log
```
[2026-02-13T12:45:00Z] CRITICAL (95%): $9.50 / $10.00
  Queued 3 non-urgent tasks
  Only critical requests allowed
  Remaining: $0.50
```

### blocked-requests.log
```
[2026-02-13T13:00:00Z] BLOCKED: $10.00+ / $10.00 (100%)
  Request: "Generate report" - QUEUED for 2026-02-14
  Request: "Analyze data" - QUEUED for 2026-02-14
  Critical request: "Fix production issue" - ALLOWED
```

## Implementation Checklist

- [ ] Read `rate-limits.json` at heartbeat startup
- [ ] Implement `checkBudgetStatus()` function in heartbeat logic
- [ ] Create monitoring_logs directory structure
- [ ] Enhance `costs.json` with per-session tracking
- [ ] Add budget check to tool execution wrapper
- [ ] Implement model switching at 90% threshold
- [ ] Implement task queueing at 95% threshold
- [ ] Implement request blocking at 100% threshold
- [ ] Create alerting mechanism (log + user notification)
- [ ] Test degradation at 90% threshold
- [ ] Test blocking at 100% threshold
- [ ] Document in COST_MONITORING.md

## Cost Model Reference

**Claude Models (OpenAI API pricing):**
- `claude-sonnet-4-5`: $3/M input tokens, $15/M output tokens (avg ~$9/M)
- `claude-haiku-4-5`: $0.80/M input tokens, $4/M output tokens (avg ~$1/M)
- **Savings at 90%+:** 89% cost reduction by switching to Haiku

**Effective Cost Calculation:**
```
Daily budget: $10.00
Estimated daily usage at current rate: ~$9.00 (if continued)
Threshold: $10.00 / 0.90 = $9.00 spend triggers 90% warning
```

## Testing Scenarios

### Scenario 1: Approach 80% (Warning)
1. Manually set `costs.json` to `{"2026-02-13": {"daily": {"cost": 8.0}}}`
2. Run heartbeat
3. Verify: Log appears in `monitoring_logs/budget-status.log` with WARNING status
4. Verify: No model switch (still using sonnet)

### Scenario 2: Approach 90% (Degradation)
1. Set `costs.json` to `{"2026-02-13": {"daily": {"cost": 9.0}}}`
2. Run heartbeat
3. Verify: Log appears with DEGRADATION status
4. Verify: New task defaults to `claude-haiku-4-5`
5. Verify: Alert sent to user

### Scenario 3: Approach 95% (Critical)
1. Set `costs.json` to `{"2026-02-13": {"daily": {"cost": 9.5}}}`
2. Attempt to queue new task
3. Verify: Task queued instead of executing
4. Verify: Critical alert logged
5. Verify: Admin notified

### Scenario 4: 100%+ (Blocked)
1. Set `costs.json` to `{"2026-02-13": {"daily": {"cost": 10.0}}}`
2. Attempt new request
3. Verify: 429 error returned with message "Daily budget exhausted"
4. Verify: Request queued for next day
5. Verify: Critical alert and admin notification sent

## Files Modified/Created

1. **HEARTBEAT.md** - Add budget check step
2. **costs.json** - Enhanced structure
3. **COST_MONITORING.md** - Dashboard and reporting logic
4. **monitoring_logs/** - Log storage directory
5. **rate-limits.json** - Configuration (already exists)

## Key Functions to Implement

```javascript
// Check current budget status
function checkBudgetStatus() {
  const costs = readJSON('costs.json');
  const limits = readJSON('rate-limits.json');
  const today = getTodayDateString();
  
  const dailyCost = costs[today]?.daily?.cost || 0;
  const dailyLimit = limits.limits.cost.perDay;
  const percentage = (dailyCost / dailyLimit) * 100;
  
  return {
    spent: dailyCost,
    limit: dailyLimit,
    percentage: percentage,
    remaining: dailyLimit - dailyCost,
    threshold: getThreshold(percentage, limits.thresholds)
  };
}

// Execute threshold action
function executeThresholdAction(status, limits) {
  const action = limits.actions[status.threshold];
  
  switch(status.threshold) {
    case 'warning':
      logWarning(status);
      alertUser(status);
      break;
    case 'degradation':
      switchToHaiku();
      alertUser(status);
      break;
    case 'critical':
      queueNonUrgentTasks();
      alertUser(status);
      notifyAdmin(status);
      break;
    case 'block':
      blockNewRequests();
      alertUser(status);
      notifyAdmin(status);
      break;
  }
}
```

## Status

✅ **Ready for Implementation**
- Configuration structure complete
- Threshold logic defined
- Integration points identified
- Testing scenarios documented

---

**Skill:** rate-limiting  
**Version:** 1.0  
**Last Updated:** 2026-02-13  
**Owner:** TARS System (Shawn)
