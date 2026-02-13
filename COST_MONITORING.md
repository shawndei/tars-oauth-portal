# Cost Monitoring & Budget Dashboard

Real-time budget tracking and reporting for OpenClaw TARS system.

## Quick Status Check

**Current Period:** 2026-02-13  
**Daily Budget:** $10.00  
**Current Spend:** $8.50 (85%)  
**Remaining:** $1.50  
**Status:** ⚠️ WARNING (approaching 90% threshold)

---

## Reading costs.json

### Daily Summary Structure

```json
{
  "2026-02-13": {
    "daily": {
      "cost": 8.5,        // Total daily cost in USD
      "tokens": 850000,   // Total tokens consumed
      "apiCalls": 234,    // Total API calls made
      "timestamp": "..."  // Last update timestamp
    }
  }
}
```

**How to Read:**
- `cost`: Multiply token usage × model pricing to get USD spent
- `tokens`: Total prompt + completion tokens for the day
- `apiCalls`: Number of tool invocations (search, exec, browser, etc.)
- `timestamp`: When this data was last updated

### Per-Session Tracking

```json
{
  "sessions": {
    "main:abc123": {
      "cost": 3.2,
      "tokens": 320000,
      "apiCalls": 85,
      "startTime": "2026-02-13T00:00:00Z",
      "endTime": "2026-02-13T07:57:00Z",
      "model": "sonnet"    // Model used (sonnet or haiku)
    }
  }
}
```

**How to Read:**
- Identifies which session/agent consumed what budget
- `model`: "sonnet" = expensive, "haiku" = cheap (1/9 cost)
- Useful for identifying runaway agents or expensive operations
- Can be used to optimize which tasks run in which sessions

### Per-Hour Granularity

```json
{
  "perHour": {
    "07": {
      "cost": 0.3,
      "tokens": 30000,
      "apiCalls": 8
    }
  }
}
```

**How to Read:**
- Shows hourly usage patterns
- Helps identify peak usage times
- Useful for scheduling expensive tasks to off-peak hours
- Key: "HH" (00-23 in 24-hour format)

---

## Budget Status Calculation

### Formula

```
Percentage = (Daily Cost / Daily Limit) × 100

Daily Limit = $10.00

Threshold Status:
- 0-80%:   NORMAL (green)
- 80-90%:  WARNING (yellow) → Log alert
- 90-95%:  DEGRADED (orange) → Switch to Haiku
- 95-100%: CRITICAL (red) → Queue non-urgent
- 100%+:   BLOCKED (black) → Block all requests
```

### Example Calculations

**Scenario 1: $8.50 spent of $10.00**
```
Percentage = (8.50 / 10.00) × 100 = 85%
Status = WARNING (80% < 85% < 90%)
Remaining = $10.00 - $8.50 = $1.50
Action = Notify user, prepare to switch models
```

**Scenario 2: $9.00 spent of $10.00**
```
Percentage = (9.00 / 10.00) × 100 = 90%
Status = DEGRADED
Remaining = $10.00 - $9.00 = $1.00
Action = Switch all new tasks to Haiku-4-5
```

**Scenario 3: $9.50 spent of $10.00**
```
Percentage = (9.50 / 10.00) × 100 = 95%
Status = CRITICAL
Remaining = $10.00 - $9.50 = $0.50
Action = Queue non-urgent tasks, alert admin
```

---

## Dashboard Metrics

### Daily Metrics
- **Cost Spent:** $8.50 / $10.00
- **Tokens Used:** 850,000 / ∞ (no per-day token limit yet)
- **API Calls:** 234 calls today
- **Average Cost/Call:** $8.50 / 234 = $0.036 per API call

### Session Metrics
- **Main Session:** 3.2 out of 8.5 total (38%)
- **Researcher Agent:** 2.1 out of 8.5 total (25%)
- **Coder Agent:** 3.2 out of 8.5 total (38%)

### Trend Analysis
```
2026-02-11: $7.50  (day 1)
2026-02-12: $9.80  (day 2, +31%)
2026-02-13: $8.50  (day 3, -13%)
Average:    $8.60 per day
Trend:      Increasing (month to date)
```

### Projections
- **Current Rate:** $8.60/day avg
- **Projected Monthly:** $258 (at current rate)
- **Monthly Budget:** $200
- **Status:** ⚠️ **EXCEEDING** budget by ~$58/month
- **Recommendation:** Increase monthly budget or reduce daily spending

---

## Heartbeat Integration

The HEARTBEAT.md script checks costs.json every ~15 minutes:

```markdown
### 4. Cost Monitoring & Rate Limiting (Every heartbeat)
- Read today's date
- Load `costs.json` and find today's entry
- Load `rate-limits.json` thresholds
- Calculate: spent / daily_limit = percentage
- Determine status (normal/warning/degraded/critical/block)
- If threshold crossed, execute action:
  - 80%: Log warning, set flag for model switch
  - 90%: Set model = "haiku", alert user
  - 95%: Queue non-urgent tasks
  - 100%: Block new requests
- Update `monitoring_logs/budget-status.log`
```

---

## Monitoring Logs

Log files are created in `monitoring_logs/` directory:

### budget-status.log
Tracks every threshold check and status change:
```
[2026-02-13T09:15:00Z] NORMAL: $6.50 / $10.00 (65%)
[2026-02-13T10:30:00Z] NORMAL: $7.80 / $10.00 (78%)
[2026-02-13T11:15:00Z] WARNING: $8.00 / $10.00 (80%)
  → Remaining: $2.00
  → Action: Alert user, watch for model switch
[2026-02-13T12:00:00Z] DEGRADATION: $9.00 / $10.00 (90%)
  → Remaining: $1.00
  → Action: Switched to Haiku-4-5 for new tasks
```

### critical-alerts.log
Only logs when threshold ≥ 95%:
```
[2026-02-13T12:45:00Z] CRITICAL (95%): $9.50 / $10.00
  Queued 3 non-urgent tasks:
    - "Generate report" → queued for 2026-02-14
    - "Analyze competitor data" → queued for 2026-02-14
    - "Create presentation" → queued for 2026-02-14
  Only critical requests allowed until reset
```

### blocked-requests.log
Logs only when threshold = 100%:
```
[2026-02-13T13:00:00Z] BLOCKED: $10.00+ / $10.00 (100%)
  Daily budget exhausted
  
  Request: "Generate monthly report"
    → QUEUED for 2026-02-14 (normal priority)
  Request: "Analyze data"
    → QUEUED for 2026-02-14 (normal priority)
  Request: "Fix production issue" (CRITICAL)
    → ALLOWED (critical bypass)
  
  Next reset: 2026-02-14 00:00:00 UTC
```

---

## How to Report Budget Status

### For Users (Simple)
```
📊 Your Daily Budget Status:
• Spent: $8.50 / $10.00 (85%)
• Remaining: $1.50
• Status: ⚠️ Warning - approaching limit
• Recommendation: Limit new tasks until tomorrow
```

### For Admins (Detailed)
```
🔍 Budget Analytics Report

Period: 2026-02-11 to 2026-02-13 (3 days)

Daily Breakdown:
• 2026-02-11: $7.50 (NORMAL)
• 2026-02-12: $9.80 (WARNING) ⚠️
• 2026-02-13: $8.50 (WARNING) ⚠️

Summary:
• Total Spend: $25.80
• Average Daily: $8.60
• Trend: +18% vs. previous 3 days
• Monthly Projection: $258 (20% over budget)

Session Breakdown (2026-02-13):
• main:abc123 (38%): $3.20
• agent:researcher (25%): $2.10
• agent:coder (37%): $3.20

Recommendations:
1. ⚠️ Trending above monthly budget
2. Researcher and Coder agents using equally high budget
3. Consider rate limit adjustments or budget increase
4. Monitor closely over next 3 days
```

---

## Cost Optimization Tips

### 1. Model Selection
- **Sonnet-4-5:** $9/M tokens (default)
- **Haiku-4-5:** $1/M tokens (auto-selected at 90%)
- **Savings:** 89% by using Haiku for simple tasks

### 2. Session Management
- Close completed sessions to stop token accumulation
- Batch similar tasks in same session (better context reuse)
- Use separate sessions for experimental/exploratory work

### 3. Scheduling
- Move expensive tasks (research, code generation) to off-peak hours
- If hourly breakdown shows peak at 05:00, schedule long tasks for 02:00
- Use task queueing at 95%+ threshold

### 4. Tool Efficiency
- `web_search`: ~5K tokens per search
- `browser`: ~10-20K tokens per page
- `exec`: ~2K tokens per command
- Prioritize cheaper tools when possible

---

## Testing the Budget System

### Test 1: Verify 80% Warning
```bash
# Set costs.json daily.cost to $8.00 (80% of $10.00)
# Run heartbeat
# Check: monitoring_logs/budget-status.log shows WARNING
```

### Test 2: Verify 90% Degradation
```bash
# Set costs.json daily.cost to $9.00 (90% of $10.00)
# Run heartbeat
# Check: 
#   1. monitoring_logs shows DEGRADATION
#   2. Next executed task uses claude-haiku-4-5
#   3. User alert generated
```

### Test 3: Verify 95% Critical
```bash
# Set costs.json daily.cost to $9.50 (95% of $10.00)
# Attempt to queue new non-critical task
# Check:
#   1. Task queued for next day (not executed now)
#   2. critical-alerts.log created
#   3. User and admin notified
```

### Test 4: Verify 100% Block
```bash
# Set costs.json daily.cost to $10.00+ (100% of $10.00)
# Attempt new request
# Check:
#   1. Request returns 429 error
#   2. Request queued for next day
#   3. blocked-requests.log created
#   4. Critical requests still allowed
#   5. Admin notified immediately
```

---

## Integration with OpenClaw Tools

### session_status() Tool
Returns current session token usage:
```bash
openclaw session_status
# Returns: tokens_used, tokens_limit, estimated_cost
```

Use in heartbeat to correlate with costs.json:
```javascript
const sessionStatus = getSessionStatus();
const dailyCost = costs[today].daily.cost;
const estimatedCost = sessionStatus.estimated_cost;

// Verify accuracy of cost tracking
if (Math.abs(estimatedCost - dailyCost) > 0.1) {
  log('Warning: Cost tracking discrepancy detected');
}
```

### Message Tool
Alert users of budget status:
```bash
message send \
  --target "user_id" \
  --message "⚠️ Budget warning: $8.00 / $10.00 spent (80%)"
```

---

## Files Structure

```
workspace/
├── costs.json                    (Track daily/session/hourly costs)
├── rate-limits.json             (Thresholds and limits config)
├── COST_MONITORING.md           (This file - reporting docs)
├── HEARTBEAT.md                 (Execution logic that checks budget)
├── monitoring_logs/
│   ├── budget-status.log        (Every heartbeat result)
│   ├── critical-alerts.log      (95%+ threshold breaches)
│   └── blocked-requests.log     (100% blocking events)
└── skills/rate-limiting/
    └── SKILL.md                 (Implementation guide)
```

---

## Summary

1. **Monitor:** Check costs.json in heartbeat every ~15 min
2. **Calculate:** Percentage = cost / $10.00
3. **Alert:** Notify user/admin at thresholds (80%, 90%, 95%, 100%)
4. **Degrade:** Switch to Haiku at 90%
5. **Queue:** Stop non-urgent work at 95%
6. **Block:** Reject new requests at 100%
7. **Report:** Dashboard metrics for users and admins

For implementation details, see `SKILL.md`.
For execution logic, see `HEARTBEAT.md`.

---

**Last Updated:** 2026-02-13  
**Status:** 📊 TRACKING  
**Current Daily Spend:** $8.50 / $10.00 (85%)
