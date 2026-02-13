# Budget Threshold Testing Scenarios

Complete test plan for rate-limiting and budget enforcement at all thresholds.

---

## Test Environment Setup

**Configuration Files:**
- `rate-limits.json` - Thresholds: 0.8 (warning), 0.9 (degradation), 0.95 (critical), 1.0 (block)
- `costs.json` - Daily budget tracking
- `HEARTBEAT.md` - Budget check execution logic

**Daily Budget Limit:** $10.00  
**Per-Session Budget:** $1.00  
**Monthly Budget:** $200.00

---

## Test Scenario 1: 80% Warning Threshold

**Objective:** Verify warning is logged when spending reaches 80% of daily budget.

### Setup
```json
{
  "2026-02-13": {
    "daily": {
      "cost": 8.0,
      "tokens": 800000,
      "apiCalls": 220,
      "timestamp": "2026-02-13T11:15:00Z"
    }
  }
}
```

### Execution
1. Set `costs.json` to the above (80% of $10.00 = $8.00)
2. Trigger heartbeat check
3. Run: `checkBudgetAndEnforce()`

### Expected Results
- ✅ Log entry: `⚠️ WARNING: 8.00 / 10.00 (80.0%) - Remaining: $2.00`
- ✅ File: `monitoring_logs/budget-status.log` contains warning entry
- ✅ User alert sent: Budget warning message
- ✅ Model NOT switched (still sonnet)
- ✅ No task queueing
- ✅ No blocking

### Verification Commands
```bash
# Check log file
cat monitoring_logs/budget-status.log | grep "WARNING"

# Verify model still sonnet
grep -i "model.*sonnet" monitoring_logs/status.log

# Check message was sent
# (Would appear in message queue)
```

### Pass/Fail Criteria
- ✅ PASS: All expected log entries present, no model switch
- ❌ FAIL: Missing log entry or model switched prematurely

---

## Test Scenario 2: 90% Degradation Threshold ⭐ CRITICAL TEST

**Objective:** Verify model switches to Haiku when spending reaches 90% of daily budget.

### Setup
```json
{
  "2026-02-13": {
    "daily": {
      "cost": 9.0,
      "tokens": 900000,
      "apiCalls": 245,
      "timestamp": "2026-02-13T12:00:00Z"
    }
  }
}
```

### Execution
1. Set `costs.json` to the above (90% of $10.00 = $9.00)
2. Trigger heartbeat check
3. Run: `checkBudgetAndEnforce()`
4. Attempt to execute new task (simulated)

### Expected Results
- ✅ Log entry: `🟠 DEGRADATION: 9.00 / 10.00 (90.0%) - Switched to Haiku`
- ✅ File: `monitoring_logs/budget-status.log` contains degradation entry
- ✅ User alert sent: Model switch notification
- ✅ **Model SWITCHED to `claude-haiku-4-5` for new tasks**
- ✅ Next task uses haiku (verify in execution logs)
- ✅ No task queueing yet
- ✅ No blocking

### Verification Commands
```bash
# Check log file
cat monitoring_logs/budget-status.log | grep "DEGRADATION"

# Verify model switched
grep -i "claude-haiku-4-5" monitoring_logs/execution.log

# Simulate new task and verify model
echo "Test: Create function" | invoke --model auto
# Should use haiku, not sonnet

# Check remaining budget
cat costs.json | jq '.["2026-02-13"].daily.cost'
# Should be $9.00
```

### Expected Log Output
```
[2026-02-13T12:00:00Z] 🟠 DEGRADATION: 9.00 / 10.00 (90.0%)
  → Remaining: $1.00
  → Action: Switched to Haiku-4-5 for new tasks
  → Alert: User notified of model switch
```

### Pass/Fail Criteria
- ✅ PASS: Model switched to haiku, all logs present, user notified
- ❌ FAIL: Model not switched OR model not used for next task OR logs missing

---

## Test Scenario 3: 95% Critical Threshold

**Objective:** Verify non-urgent tasks are queued when spending reaches 95% of daily budget.

### Setup
```json
{
  "2026-02-13": {
    "daily": {
      "cost": 9.5,
      "tokens": 950000,
      "apiCalls": 258,
      "timestamp": "2026-02-13T12:30:00Z"
    }
  }
}
```

### Execution
1. Set `costs.json` to the above (95% of $10.00 = $9.50)
2. Trigger heartbeat check
3. Run: `checkBudgetAndEnforce()`
4. Attempt to queue 3 non-urgent tasks

### Expected Results
- ✅ Log entry: `🔴 CRITICAL: 9.50 / 10.00 (95.0%) - Queueing non-urgent`
- ✅ File: `monitoring_logs/critical-alerts.log` created with entry
- ✅ User alert sent: Critical budget warning
- ✅ Admin notified: Critical threshold crossed
- ✅ 3 non-urgent tasks queued for next day
- ✅ Critical tasks still execute immediately
- ✅ No model switch needed (already degraded)

### Verification Commands
```bash
# Check critical alerts log
cat monitoring_logs/critical-alerts.log

# Verify tasks queued
cat TASKS.md | grep -A5 "Queued for 2026-02-14"

# Verify critical task bypasses queue
echo "[CRITICAL] Fix production issue" | submit-task
# Should execute immediately

# Check remaining budget
cat costs.json | jq '.["2026-02-13"].daily.cost'
# Should be $9.50
```

### Expected Log Output
```
[2026-02-13T12:30:00Z] 🔴 CRITICAL (95%): $9.50 / $10.00
  Queued 3 non-urgent tasks:
    - "Generate monthly report" → queued for 2026-02-14
    - "Analyze competitor data" → queued for 2026-02-14
    - "Create presentation" → queued for 2026-02-14
  Only critical requests allowed until reset
```

### Pass/Fail Criteria
- ✅ PASS: Tasks queued, admin notified, critical tasks bypass queue
- ❌ FAIL: Tasks not queued OR critical tasks also queued OR logs missing

---

## Test Scenario 4: 100% Blocked Threshold

**Objective:** Verify all non-critical requests are blocked when spending reaches 100% of daily budget.

### Setup
```json
{
  "2026-02-13": {
    "daily": {
      "cost": 10.0,
      "tokens": 1000000,
      "apiCalls": 270,
      "timestamp": "2026-02-13T13:00:00Z"
    }
  }
}
```

### Execution
1. Set `costs.json` to the above (100% of $10.00 = $10.00)
2. Trigger heartbeat check
3. Run: `checkBudgetAndEnforce()`
4. Attempt multiple requests (normal and critical)

### Expected Results
- ✅ Log entry: `🛑 BLOCKED: 10.00 / 10.00 (100%+) - Blocking new requests`
- ✅ File: `monitoring_logs/blocked-requests.log` created with entries
- ✅ User alert sent: Budget exhausted message
- ✅ Admin notified: Immediate critical notification
- ✅ Normal request: Returns 429 error, queued for 2026-02-14
- ✅ Critical request: Executed immediately (bypasses block)
- ✅ All requests logged in blocked-requests.log

### Verification Commands
```bash
# Check blocked-requests log
cat monitoring_logs/blocked-requests.log

# Attempt normal request (should fail)
echo "Generate report" | submit-task
# Should return: Error 429: Daily budget exhausted

# Verify request queued
cat TASKS.md | grep "Queued for 2026-02-14"

# Attempt critical request (should succeed)
echo "[CRITICAL] Fix production issue" | submit-task --critical
# Should execute and return success

# Check admin notification sent
cat monitoring_logs/admin-alerts.log
```

### Expected Log Output
```
[2026-02-13T13:00:00Z] 🛑 BLOCKED: $10.00 / $10.00 (100%)
  Daily budget exhausted
  
  Request: "Generate monthly report"
    → QUEUED for 2026-02-14 (normal priority)
  Request: "Analyze data"
    → QUEUED for 2026-02-14 (normal priority)
  Request: "Fix production issue" (CRITICAL)
    → ALLOWED (critical bypass)
  
  Next reset: 2026-02-14 00:00:00 UTC
  Admin: 🛑 CRITICAL - Daily budget exhausted
```

### Pass/Fail Criteria
- ✅ PASS: All requests blocked except critical, 429 error returned, logging complete
- ❌ FAIL: Non-critical request allowed OR critical request blocked OR logs missing

---

## Test Scenario 5: Budget Recovery (Next Day)

**Objective:** Verify budget resets at midnight and queued tasks execute.

### Setup
**Starting State (2026-02-13 23:55:00):**
```json
{
  "2026-02-13": {
    "daily": {"cost": 10.0, "tokens": 1000000}
  }
}
```

**Queued Tasks:**
```
- "Generate monthly report" → Queued for 2026-02-14
- "Analyze competitor data" → Queued for 2026-02-14
```

### Execution
1. Verify budget blocked on 2026-02-13
2. Wait for midnight or simulate day change
3. Update costs.json to reflect 2026-02-14 with fresh budget

**New State (2026-02-14 00:05:00):**
```json
{
  "2026-02-14": {
    "daily": {"cost": 0.0, "tokens": 0, "apiCalls": 0}
  }
}
```

4. Trigger heartbeat
5. Verify queued tasks execute

### Expected Results
- ✅ New date entry created in costs.json
- ✅ Budget reset to $0.00 / $10.00 (0%)
- ✅ Status changed from BLOCKED to NORMAL
- ✅ Queued tasks moved from queue to execution
- ✅ 2 tasks executed (cost increases from $0 to ~$0.50)
- ✅ Log entry: `NORMAL: 0.00 / 10.00 (0%)` for new day

### Verification Commands
```bash
# Check new date entry
cat costs.json | jq '.["2026-02-14"]'

# Verify queued tasks executed
cat monitoring_logs/task-execution.log | grep "2026-02-14"

# Verify budget reset
grep "NORMAL: 0.00" monitoring_logs/budget-status.log

# Check tasks no longer in queue
cat TASKS.md | grep -c "Queued"
# Should be 0 (or reduced from 3)
```

### Expected Log Output
```
[2026-02-14T00:05:00Z] NORMAL: $0.00 / $10.00 (0%)
  → New billing period started
  → Executing 2 queued tasks:
    - "Generate monthly report" - EXECUTING
    - "Analyze competitor data" - EXECUTING
  → Budget reset for new day
```

### Pass/Fail Criteria
- ✅ PASS: New day entry created, budget reset, queued tasks executed
- ❌ FAIL: Budget not reset OR queued tasks not executed OR old date data persists

---

## Test Scenario 6: Monthly Budget Check

**Objective:** Verify monthly budget tracking and projection warnings.

### Setup
**Current Monthly Spending (first 13 days of February):**
```json
{
  "summary": {
    "totalCost": 112.0,
    "totalTokens": 11200000,
    "periodStart": "2026-02-01",
    "periodEnd": "2026-02-13",
    "averageDailyCost": 8.62,
    "projectedMonthlyAtCurrentRate": 258,
    "monthlyBudget": 200,
    "status": "exceeding_limit"
  }
}
```

### Execution
1. Read `costs.json` summary section
2. Calculate: (totalCost / daysElapsed) × daysInMonth
3. Compare to monthly budget
4. If exceeding, generate warning

### Expected Results
- ✅ Calculation: ($112 / 13 days) × 28 days = $241 projected
- ✅ Status: "exceeding_limit" flagged in summary
- ✅ Log: Monthly warning generated
- ✅ Alert: User notified of overspend trajectory
- ✅ Recommendation: Increase budget or reduce daily spending

### Verification Commands
```bash
# Check summary
cat costs.json | jq '.summary'

# Verify calculation
python3 -c "print((112/13)*28)"  # Should be ~241

# Check monthly warning logged
cat monitoring_logs/budget-status.log | grep -i "monthly"
```

### Expected Log Output
```
[2026-02-13T15:00:00Z] MONTHLY TREND: Exceeding budget
  Total (13 days): $112.00
  Average Daily: $8.62
  Projected Monthly: $241.00 (at current rate)
  Monthly Budget: $200.00
  Variance: +$41.00 (20% over budget)
  
  Recommendation: Reduce daily spending to ~$7.14/day
  Or: Increase monthly budget to $250.00+
```

### Pass/Fail Criteria
- ✅ PASS: Monthly projection calculated correctly, warning generated
- ❌ FAIL: Projection inaccurate OR warning not generated

---

## Integration Test: Complete Workflow

**Objective:** Simulate real-world budget lifecycle from normal → warning → degraded → critical → blocked → recovered.

### Timeline Simulation

```
Time        Cost    %       Status          Action
-----------------------------------------------
08:00       $0.50   5%      NORMAL          ✓ Proceed
09:00       $2.00   20%     NORMAL          ✓ Proceed
10:00       $4.50   45%     NORMAL          ✓ Proceed
11:00       $7.50   75%     NORMAL          ✓ Proceed
11:30       $8.00   80%     WARNING         ⚠️ Alert user
12:00       $8.50   85%     WARNING         ⚠️ Continue monitoring
12:30       $9.00   90%     DEGRADATION     🟠 Switch to Haiku
13:00       $9.25   92.5%   DEGRADATION     🟠 Continue with Haiku
13:30       $9.50   95%     CRITICAL        🔴 Queue non-urgent
14:00       $9.75   97.5%   CRITICAL        🔴 Only critical allowed
14:15       $10.00  100%    BLOCKED         🛑 Block all requests
23:59       $10.00  100%    BLOCKED         🛑 Still blocked
00:05+1     $0.00   0%      NORMAL (next)   ✓ Reset, resume normal
```

### Step-by-Step Execution

1. **08:00 - Normal ($0.50, 5%)**
   - Set costs.json to $0.50
   - Run heartbeat
   - Verify: NORMAL status, all operations proceed

2. **11:00 - Still Normal ($7.50, 75%)**
   - Set costs.json to $7.50
   - Run heartbeat
   - Verify: NORMAL status, continue

3. **11:30 - Warning ($8.00, 80%)**
   - Set costs.json to $8.00
   - Run heartbeat
   - Verify: WARNING logged, user alerted, no model switch

4. **12:30 - Degradation ($9.00, 90%)**
   - Set costs.json to $9.00
   - Run heartbeat
   - Execute new task
   - Verify: Model switched to haiku

5. **13:30 - Critical ($9.50, 95%)**
   - Set costs.json to $9.50
   - Attempt new non-critical task
   - Verify: Task queued, not executed

6. **14:15 - Blocked ($10.00, 100%)**
   - Set costs.json to $10.00
   - Attempt new normal request
   - Verify: 429 error, request queued

7. **Next Day - Recovery**
   - Create new date entry in costs.json
   - Run heartbeat
   - Verify: Budget reset, queued tasks execute

### Pass/Fail Criteria
- ✅ PASS: All 7 steps execute correctly with proper state transitions
- ❌ FAIL: Any step fails or state transition is incorrect

---

## Test Execution Commands

```bash
# Run all tests in sequence
./run-budget-tests.sh

# Individual test runs
./test-scenario.sh 1  # Warning test
./test-scenario.sh 2  # Degradation test (critical)
./test-scenario.sh 3  # Critical test
./test-scenario.sh 4  # Blocked test
./test-scenario.sh 5  # Recovery test
./test-scenario.sh 6  # Monthly test
./test-scenario.sh 7  # Integration test

# Verify test results
cat monitoring_logs/test-results.log

# Cleanup
rm -rf costs.json.backup
rm -rf monitoring_logs/*
```

---

## Success Criteria Summary

| Scenario | Key Verification | Status |
|----------|------------------|--------|
| 80% Warning | Log entry present, user alerted, no model switch | ⬜ |
| 90% Degradation | Model switched to haiku, used in next task | ⬜ |
| 95% Critical | Non-urgent tasks queued, critical tasks allowed | ⬜ |
| 100% Blocked | All requests blocked except critical, 429 error | ⬜ |
| Recovery | Budget reset, queued tasks execute | ⬜ |
| Monthly | Projection calculated, warning generated | ⬜ |
| Integration | All states transition correctly in sequence | ⬜ |

---

**Test Plan Created:** 2026-02-13  
**Target System:** OpenClaw TARS  
**Owner:** Shawn (Budget Enforcement Implementation)  
**Status:** 📋 Ready for Execution
