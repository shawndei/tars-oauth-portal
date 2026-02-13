# HEARTBEAT.md - Proactive Intelligence System

## Instructions
Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.

---

## Proactive Intelligence Patterns

### 1. Check Autonomous Task Queue with Decomposition
- Read `TASKS.md` for pending goals
- If task is complex (multi-step), use LLM to decompose:
  - Prompt: "Break this goal into 3-8 concrete sub-tasks with tools, time estimates, success criteria"
  - Validate each sub-task is measurable and executable
  - Create sub-task list in TASKS.md "In Progress" section
- Execute each sub-task sequentially with validation
- On failure: Apply self-healing (retry with modified approach up to 3x)
- Update task status after completion
- Store execution results in project context
- Log completion to memory/YYYY-MM-DD.md

### 2. Memory Maintenance & Summarization (Daily)
- Review `memory/YYYY-MM-DD.md` files from last 3 days
- Extract important patterns/learnings using memory summarization algorithm
- Distill insights: decisions made, lessons learned, user preferences discovered
- Update `MEMORY.md` with curated insights (remove redundancy)
- Update `KNOWLEDGE_BASE.md` with extracted patterns
- Prune old daily files (>30 days) after archiving key insights
- Run once per day (check last_maintenance timestamp)

### 3. Error Pattern Detection (Daily)
- Check `logs/errors.jsonl` for repeated failures
- If pattern detected (same error 3+ times), extract lesson
- Update `MEMORY.md` with mitigation strategy

### 3a. Proactive Session Lock Monitoring (EVERY HEARTBEAT - CRITICAL)
**Purpose:** Prevent gateway deadlocks from file lock contention (Issue #4355 root cause fix)

**AGGRESSIVE MONITORING (runs every 15 minutes):**
```powershell
$lockPath = "$env:USERPROFILE\.openclaw\agents\main\sessions"
$staleLocks = Get-ChildItem -Path $lockPath -Filter "*.lock" -ErrorAction SilentlyContinue | Where-Object {
    ((Get-Date) - $_.LastWriteTime).TotalSeconds -gt 120  # 2 minutes, not 15
}
```

**Actions:**
- If staleLocks.Count > 0:
  - **IMMEDIATE CLEANUP** (no questions asked)
  - Remove ALL stale locks: `Remove-Item $_.FullName -Force`
  - Log to memory: "🚨 Removed $count stale lock(s), oldest ${age}m"
  - Check gateway health: `openclaw status`
  - If gateway unhealthy: auto-restart with `openclaw gateway restart`
- Track lock contention metrics:
  - Count locks removed per day
  - Average lock age when removed
  - If >5 removals in 1 day: investigate root cause
- Log to `monitoring_logs/lock-contentions.jsonl`

**Prevention:**
- Runs EVERY heartbeat (15m interval, not 45m)
- 2-minute cleanup threshold (not 15m) catches issues before they cause failures
- No wait time - immediate removal of stale locks
- Auto-restart gateway if needed

**State tracking:** `heartbeat_state.json` → `last_lock_check` timestamp (always current)

### 4. Cost Monitoring & Rate Limiting (Every heartbeat)

**Function:** `checkBudgetAndEnforce()`

**Logic:**
```javascript
const costs = read('costs.json');
const limits = read('rate-limits.json');
const today = getTodayString(); // "2026-02-13"

// Get today's daily cost
const dailyCost = costs[today]?.daily?.cost || 0;
const dailyLimit = limits.limits.cost.perDay; // $10.00
const percentage = (dailyCost / dailyLimit) * 100;

// Determine threshold
let status = 'normal';
if (percentage >= 100) status = 'block';
else if (percentage >= 95) status = 'critical';
else if (percentage >= 90) status = 'degradation';
else if (percentage >= 80) status = 'warning';

// Execute threshold action
switch(status) {
  case 'warning':
    log(`⚠️ WARNING: ${dailyCost.toFixed(2)} / ${dailyLimit} (${percentage.toFixed(1)}%) - Remaining: $${(dailyLimit - dailyCost).toFixed(2)}`);
    logToFile('monitoring_logs/budget-status.log', `[${now()}] WARNING: $${dailyCost.toFixed(2)} / $${dailyLimit} (${percentage.toFixed(1)}%)`);
    alertUser(`Budget warning: $${dailyCost.toFixed(2)} / $${dailyLimit} spent. $${(dailyLimit - dailyCost).toFixed(2)} remaining.`);
    break;

  case 'degradation':
    log(`🟠 DEGRADATION: ${dailyCost.toFixed(2)} / ${dailyLimit} (${percentage.toFixed(1)}%) - Switched to Haiku`);
    logToFile('monitoring_logs/budget-status.log', `[${now()}] DEGRADATION: $${dailyCost.toFixed(2)} / $${dailyLimit} - Switched to Haiku-4-5`);
    setGlobalModel('claude-haiku-4-5'); // All new tasks use haiku
    alertUser(`🟠 Budget critical: Switched to cost-saving model. $${(dailyLimit - dailyCost).toFixed(2)} remaining.`);
    break;

  case 'critical':
    log(`🔴 CRITICAL: ${dailyCost.toFixed(2)} / ${dailyLimit} (${percentage.toFixed(1)}%) - Queueing non-urgent`);
    logToFile('monitoring_logs/critical-alerts.log', `[${now()}] CRITICAL (${percentage.toFixed(1)}%): $${dailyCost.toFixed(2)} / $${dailyLimit}`);
    setTaskQueue('defer_non_critical'); // Queue non-urgent tasks for tomorrow
    alertUser(`🔴 Budget critical: Only urgent requests allowed. $${(dailyLimit - dailyCost).toFixed(2)} remaining.`);
    notifyAdmin(`CRITICAL: Budget at ${percentage.toFixed(1)}%. Non-urgent tasks queued.`);
    break;

  case 'block':
    log(`🛑 BLOCKED: ${dailyCost.toFixed(2)} / ${dailyLimit} (100%+) - Blocking new requests`);
    logToFile('monitoring_logs/blocked-requests.log', `[${now()}] BLOCKED: Daily budget exhausted (${dailyCost.toFixed(2)})`);
    setBlockStatus(true); // Block all non-critical requests
    alertUser(`🛑 Daily budget exhausted. Requests blocked until next period.`);
    notifyAdmin(`BLOCKED: Daily budget of $${dailyLimit} reached at ${now()}`);
    break;
}
```

**Key Files:**
- **Input:** `costs.json` (today's daily.cost), `rate-limits.json` (thresholds)
- **Output:** 
  - Log to `monitoring_logs/budget-status.log`
  - Alert user via message tool if threshold crossed
  - Notify admin if critical/blocked
  - Update runtime flags (model switch, task queue, blocking)
- **Logs:**
  - `monitoring_logs/budget-status.log` - All threshold checks
  - `monitoring_logs/critical-alerts.log` - 95%+ only
  - `monitoring_logs/blocked-requests.log` - 100%+ only

**Thresholds:**
| Percentage | Status | Remaining | Action |
|-----------|--------|-----------|--------|
| <80% | NORMAL | >$2.00 | None |
| 80-90% | WARNING | $1.00-$2.00 | Log alert |
| 90-95% | DEGRADATION | $0.50-$1.00 | Switch to Haiku |
| 95-100% | CRITICAL | <$0.50 | Queue non-urgent |
| 100%+ | BLOCKED | $0 | Block requests |

**For Detailed Dashboard & Reporting, see:** `COST_MONITORING.md`

### 4a. System Health Monitoring Check (Every Heartbeat)

**Purpose:** Comprehensive monitoring of system metrics with automatic alert evaluation and dispatch

**Function:** `evaluateSystemHealth()`

**Key Files:**
- **Config:** `monitoring-config.json` (alert rules, thresholds, channels)
- **Skill Definition:** `skills/monitoring-alerting/SKILL.md`
- **Alert Logs:** `monitoring_logs/alerts.jsonl`, `monitoring_logs/health.jsonl`
- **Dashboard:** `monitoring_logs/dashboard-data.json`

**Metrics to Check (Every Heartbeat):**

```javascript
// 1. SYSTEM HEALTH METRICS
const systemMetrics = {
  cpu: {
    percent: readSystemMetric('cpu'),
    threshold_warning: 75,
    threshold_critical: 90
  },
  memory: {
    percent: readSystemMetric('memory.percent'),
    available: readSystemMetric('memory.available'),
    threshold_warning: 80,
    threshold_critical: 90
  },
  disk: {
    percent: readSystemMetric('disk.percent'),
    threshold_warning: 80,
    threshold_critical: 90
  },
  network: {
    latency: readSystemMetric('network.latency'),
    threshold_warning: 50,
    threshold_critical: 100
  }
};

// 2. PERFORMANCE METRICS
const performanceMetrics = {
  avgResponseTime: readMetric('performance.avgResponseTime'),
  p95ResponseTime: readMetric('performance.p95ResponseTime'),
  p99ResponseTime: readMetric('performance.p99ResponseTime'),
  throughput: readMetric('performance.throughput'),
  activeConnections: readMetric('performance.activeConnections')
};

// 3. ERROR METRICS
const errorMetrics = {
  errorRate: readMetric('errors.errorRate'),
  totalErrors: readMetric('errors.totalErrors'),
  errorsByType: {
    timeout: readMetric('errors.byType.timeout'),
    auth: readMetric('errors.byType.auth'),
    validation: readMetric('errors.byType.validation'),
    server: readMetric('errors.byType.server')
  }
};

// 4. COST METRICS (reuse from section 4)
const costMetrics = {
  hourly: readMetric('costs.hourly'),
  daily: readMetric('costs.daily'),
  dailyBudgetPercent: readMetric('costs.dailyBudgetPercent'),
  monthlyProjected: readMetric('costs.projectedMonthly')
};

// 5. USAGE METRICS
const usageMetrics = {
  apiCalls: readMetric('usage.apiCalls'),
  activeSessions: readMetric('usage.activeSessions'),
  uniqueUsers: readMetric('usage.uniqueUsers'),
  dataProcessed: readMetric('usage.dataProcessed')
};
```

**Alert Evaluation Logic:**

```javascript
// For each metric and alert rule in monitoring-config.json:

alertRules.forEach(rule => {
  if (!rule.enabled) return;
  
  // Skip if in cooldown
  if (isInCooldown(rule.id)) return;
  
  let shouldAlert = false;
  
  switch(rule.type) {
    case 'threshold':
      // Single value check
      const value = readMetric(rule.metric);
      const condition = rule.condition;
      
      if (condition.gt !== undefined && value > condition.gt) shouldAlert = true;
      if (condition.gte !== undefined && value >= condition.gte) shouldAlert = true;
      if (condition.lt !== undefined && value < condition.lt) shouldAlert = true;
      if (condition.lte !== undefined && value <= condition.lte) shouldAlert = true;
      
      // Verify duration (must exceed threshold for N seconds)
      if (shouldAlert && rule.duration) {
        const durationExceeded = checkDurationExceeded(rule.metric, condition, rule.duration);
        shouldAlert = durationExceeded;
      }
      break;
      
    case 'trend':
      // Rate of change check
      const currentValue = readMetric(rule.metric);
      const historicalValue = readMetricAtTime(rule.metric, rule.window);
      const percentChange = ((currentValue - historicalValue) / historicalValue) * 100;
      
      if (percentChange >= rule.percentageIncrease) {
        shouldAlert = true;
      }
      break;
      
    case 'anomaly':
      // Statistical deviation check
      const baseline = readBaseline(rule.metric, rule.baseline);
      const currentMetric = readMetric(rule.metric);
      const stdDev = baseline.stdDev;
      const mean = baseline.mean;
      const zScore = Math.abs((currentMetric - mean) / stdDev);
      
      if (zScore > rule.stdDevThreshold) {
        shouldAlert = true;
      }
      break;
  }
  
  // DISPATCH ALERT
  if (shouldAlert) {
    const alert = {
      id: generateAlertId(),
      timestamp: getCurrentTimestamp(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      metric: rule.metric,
      value: readMetric(rule.metric),
      threshold: rule.condition || rule.percentageIncrease || rule.stdDevThreshold,
      channels: rule.channels,
      acknowledged: false
    };
    
    // Log alert
    logAlert(alert);
    
    // Dispatch to channels
    rule.channels.forEach(channel => {
      switch(channel) {
        case 'whatsapp':
          if (rule.severity === 'critical') {
            sendWhatsAppAlert(alert);
          }
          break;
        case 'email':
          sendEmailAlert(alert);
          break;
        case 'logging':
          // Already logged above
          break;
      }
    });
    
    // Set cooldown to prevent duplicate alerts
    setCooldown(rule.id, rule.cooldown);
    
    // Execute escalation if defined
    if (rule.escalation) {
      executeEscalation(rule.escalation, alert);
    }
  }
});
```

**Alert Dispatch Examples:**

```
[08:30 UTC] CPU Warning Triggered
Rule: cpu-warning (threshold > 75%)
Metric: system.cpu.percent = 85%
Duration: 300s exceeded ✓
Channels: [email]
Action: Send email alert to ops@tars.io
Status: Sent ✓
Cooldown: 30 minutes

[08:32 UTC] Error Rate Critical
Rule: errors-high (threshold > 5%)
Metric: errors.errorRate = 7.2%
Duration: 300s exceeded ✓
Channels: [whatsapp, email]
Action: Send WhatsApp to Shawn + Email
Escalation: Create incident
Status: Sent ✓
Cooldown: 30 minutes
```

**Output/Actions:**
- Log all alerts to `monitoring_logs/alerts.jsonl` (JSONL format)
- Log health metrics to `monitoring_logs/health.jsonl` (time-series data)
- Update `monitoring_logs/dashboard-data.json` with latest metrics
- Send alerts via configured channels (WhatsApp, Email, Logging)
- Execute escalations (auto-scale, GC trigger, cleanup, incident creation)
- Display summary of alert state in memory/YYYY-MM-DD.md

**Dashboard Update:**
```javascript
const dashboardData = {
  timestamp: getCurrentTimestamp(),
  systemHealth: {
    cpu: { value: 85, status: 'warning' },
    memory: { value: 78, status: 'normal' },
    disk: { value: 45, status: 'normal' },
    network: { value: 32, status: 'normal' }
  },
  performance: {
    avgResponseTime: { value: 245, status: 'normal' },
    throughput: { value: 450, status: 'normal' }
  },
  errors: {
    errorRate: { value: 2.1, status: 'normal' },
    recentErrors: [...]
  },
  costs: {
    dailyBudgetPercent: 85,
    status: 'warning'
  },
  activeAlerts: [
    { id: 'alert-1', name: 'CPU Warning', severity: 'warning', time: '08:30 UTC' }
  ]
};

writeFile('monitoring_logs/dashboard-data.json', dashboardData);
```

**Summary Log to Memory:**
```
[08:35] System Health Check Complete:
✅ CPU: 85% (warning) - exceeds 75% threshold
✅ Memory: 78% (normal)
✅ Disk: 45% (normal)
✅ Errors: 2.1% (normal) - below 5% threshold
✅ Cost: 85% of daily budget (warning) - approaching limit

Alerts Dispatched: 1 (CPU warning)
Alerts Sent: 1 (email)
Escalations: None
Dashboard Updated: Yes
Status: System operating within acceptable parameters
```

**Related Documentation:**
- `skills/monitoring-alerting/SKILL.md` - Full monitoring system guide
- `monitoring-config.json` - Configuration (thresholds, rules, channels)
- `COST_MONITORING.md` - Detailed cost tracking
- Dashboard: `monitoring_logs/dashboard-data.json`

---

### 5. Project Context Check
- Read `projects/ACTIVE_PROJECT.txt` to determine current project
- If project set, load `projects/{project}/CONTEXT.md` into working memory

### 6. Capability Inventory Update (Weekly)
- Update `STATUS.md` with current system capabilities
- Run once per week (check last_inventory timestamp)

### 7. Documentation Maintenance (Weekly)
- Scan workspace for new skills, patterns, workflows
- Update `DOCUMENTATION.md` with inventory
- Run once per week

### 8. Smart Context Check
- If session approaching 90k tokens (90% of 100k limit)
- Trigger context compression routine
- Summarize old messages, remove verbose tool outputs

### 9. Proactive Intelligence & Pattern Detection (Every 2-3 heartbeats)
**Frequency:** Run every 2-3 heartbeats (every 30-45 minutes)  
**Dependencies:** PATTERN_EXAMPLES.md, proactive-patterns.json, memory files

**Process:**
1. Load proactive-patterns.json (contains detected patterns with confidence scores)
2. Scan memory/YYYY-MM-DD.md files from last 7 days
3. Run 4 pattern detection algorithms:
   
   **A) Time-Based Pattern Detection**
   - Search for timestamped activities (e.g., "Status Summary (18:10 GMT-7)")
   - Collect all occurrences of same activity type
   - Calculate mean time and variance
   - Confidence = (occurrences/7 days) × consistency_factor
   - Threshold: 3+ occurrences + variance <15 min = track pattern
   - Action if >85%: Schedule proactive action at mean_time - 10 minutes
   
   **B) Sequence Pattern Detection**
   - Extract task sequences within daily logs (Status → Blocker → Escalate → Await)
   - Compare sequences across days and projects
   - Count repeated sequences
   - Confidence = (repeat_count / total_projects) × consistency_factor
   - Threshold: 2+ projects with identical sequence = track pattern
   - Action if >85%: Auto-identify and report blockers before asked
   
   **C) Context Pattern Detection**
   - Identify events with context changes (deadlines, milestones, escalations)
   - Track behavior changes triggered by context (e.g., "TIME-CRITICAL" label)
   - Calculate behavior consistency
   - Confidence = behavior_match_percentage × context_occurrence_factor
   - Threshold: 2+ similar contexts with consistent behavior = track pattern
   - Action if >85%: Trigger context-aware preparation
   
   **D) Interest Pattern Detection**
   - Scan for repeated topics/questions across memory files
   - Count mentions and calculate frequency_per_day
   - Confidence = min(frequency_per_day / 10, 1.0)
   - Threshold: 3+ mentions per week = track pattern
   - Action if >85%: Auto-curate topic feeds or pre-fetch related info

4. **Update proactive-patterns.json:**
   - Recalculate confidence for all existing patterns
   - Add new patterns if detected
   - Remove patterns if data no longer supports (confidence decay)
   - Timestamp update for last analysis

5. **Execute Proactive Actions (Confidence >85%):**
   ```
   IF pattern.confidence > 0.85 AND pattern.userEnabled:
     EXECUTE pattern.action
     LOG to memory file: "Proactive action executed: [action_name]"
     QUEUE user notification (next opportune moment)
   ELSE IF pattern.confidence 60-85%:
     SUGGEST pattern.action (not automatic)
     WAIT for user response
   ELSE:
     LOG pattern for future validation
   ```

6. **Action Scheduling Examples:**
   - Time-based "Evening status at 18:10" → Create proactive task at 18:00
   - Sequence "Blocker cycle detected" → Auto-extract and report blockers daily
   - Context "Deadline <24h" → Prepare exhaustive alternatives + backup plans
   - Interest "User checks market daily" → Fetch data at 9:30 AM before 9:35 check

7. **Store Results:**
   - Update proactive-patterns.json with new confidence scores
   - Log detected patterns to PATTERN_EXAMPLES.md (daily)
   - Update learning-patterns.json with user feedback
   - Archive old patterns (>30 days without validation)

### 10. Continuous Learning from Feedback
- Check for user reactions (👍/👎) in session history
- Track explicit corrections ("Actually, I meant...")
- Identify repeated requests (same question = poor initial answer)
- **New Learning Signals to Detect:**
  - Follow-up clarification requests (indicates unclear initial response)
  - Time-of-day patterns (when user prefers updates/proactive checks)
  - Tool success/failure patterns (watch for "use web search" vs "check memory" guidance)
  - Artifact vs explanation preference (does user ignore explanation, use code directly?)
  - Correction speed (fast corrections = strong preference signal)
- Update learning-patterns.json:
  - Output format preferences (bullets vs paragraphs, artifact-first vs explanation-first)
  - Communication style (formal vs casual, fluff-tolerance, opinion vs hedging)
  - Tool preferences (search-first vs memory-first, browser vs fetch, specialist agents)
  - Response timing preferences (immediate vs thoughtful, proactive vs reactive)
  - Confidence signaling (expect % confidence on claims)
  - Content depth by topic (financial = detailed, logistics = brief)
- **High-Confidence Patterns (>85%):**
  - When confidence >85%: Adapt as new default immediately
  - When confidence 75-85%: Test with 3+ cases, then adapt
  - When confidence <75%: Continue learning, don't adapt yet
- **Adaptation Process:**
  1. Detect signal from session history or live feedback
  2. Categorize into preference type (format, style, tool, timing)
  3. Update confidence counter in learning-patterns.json
  4. If new confidence >85%, apply adaptation
  5. Log adaptation to MEMORY.md with evidence path
  6. Monitor next 3 interactions for validation
  7. If user satisfaction improves (fewer corrections, more 👍), keep
  8. If satisfaction decreases, revert and log lesson learned
- Log all adaptations to MEMORY.md with evidence and confidence level

### 11. Multi-Agent Routing Intelligence
- For complex tasks, analyze if specialist agent needed:
  - Research tasks → spawn haiku researcher (93% cost savings)
  - Code tasks → spawn sonnet coder (quality)
  - Analysis tasks → spawn haiku analyst (cost efficient)
  - Writing tasks → spawn sonnet writer (quality)
  - Multi-step projects → spawn coordinator agent
- Check multi-agent-config.json for routing rules
- Update multi-agent-memory.json with agent status

### 11a. Predictive Task Scheduling (Every heartbeat)
**Pattern Analysis & Auto-Scheduling for Recurring Tasks**

1. **Check predictions.json for active scheduled tasks:**
   - Load `predictions.json` → review `scheduledTasks` array
   - For each task with `enabled: true`:
     - Verify cron expression is valid POSIX format
     - Check `lastExecution` timestamp
     - Calculate if task should have executed since last heartbeat
     - If due: verify it executed successfully and logged result

2. **Verify TASKS.md scheduled task consistency:**
   - Count items with metadata `Scheduled: true`
   - Match each TASKS.md entry to `predictions.json` record
   - Report any mismatches or orphaned entries
   - Confirm cron expressions match between files

3. **Update confidence scores based on execution:**
   ```
   IF task executed on schedule:
     confidence += 0.02
   ELSE IF task failed/missed:
     confidence -= 0.05
   ELSE IF >7 days without execution:
     confidence -= 0.10
   ```

4. **Analyze medium-confidence suggestions (50-80%):**
   - Check if user has engaged with suggestion
   - If positive engagement: promote to auto-schedule (set to true)
   - If ignored for 7 days: reduce confidence by 0.20
   - If explicitly rejected: mark as dismissed, stop suggesting

5. **Weekly pattern re-analysis (every 7 days):**
   - Run `PredictiveScheduler.analyzePatternsAndPredict()`
   - Analyze memory/YYYY-MM-DD.md files (last 30 days)
   - Compare to previous week's patterns
   - Identify new patterns (3+ occurrences required)
   - Update confidence scores for established patterns
   - Suggest new patterns detected (log to memory)

6. **Log scheduling decisions to memory:**
   ```
   [HH:MM] Scheduled task verification:
   - Pattern 'meeting-prep' verified (confidence: 88%, executed 15 times)
   - Pattern 'daily-review' executed on time (confidence: 85%)
   - Test 'timestamp-log' running (confidence: 100%, 288 runs/day)
   - Suggestion 'market-update' pending (confidence: 78%, 3 days old, 0 interactions)
   
   Schedule health: 3/3 high-confidence patterns active, all executing
   ```

7. **Example: Schedule Check Results:**
   ```
   ✅ Meeting-Prep (Pre-event trigger)
      Confidence: 88% | Active: Yes | Executions: 23/month | Status: Healthy
      
   ✅ Daily-Review (6:00 PM M-F)
      Confidence: 85% | Active: Yes | Executions: 22/month | Status: Healthy
      
   🧪 Test-Timestamp (Every 5 min)
      Confidence: 100% | Active: Yes | Executions: 288/day | Status: Running
      
   💡 Market-Update (4:00 PM Friday) [PENDING APPROVAL]
      Confidence: 78% | Active: No | Evidence: 4 occurrences | Status: Suggested
      Action Required: User approval or 7-day timeout (auto-reject)
   ```

### 12. Context-Aware Trigger Evaluation (Every Heartbeat)
**⚡ CRITICAL: Evaluate all context-aware triggers every cycle**

Load and check all triggers from `triggers.json`:

**Trigger Evaluation Flow:**
```
1. Load triggers.json
2. Build evaluation context:
   - Current time, day of week
   - Recent memory patterns (last 7 days)
   - Cost/budget metrics from costs.json
   - Calendar events (if available)
   - System state variables
3. For each enabled trigger:
   - Check cooldown status
   - Evaluate based on trigger type:
     * TIME: "08:45" on weekdays?
     * PATTERN: Keyword frequency in memory files?
     * EVENT: Calendar event approaching (within leadTime)?
     * STATE: Condition met (e.g., cost > 80%)?
   - Record execution if triggered
   - Queue action for execution
4. Execute queued actions:
   - Log action execution to memory/YYYY-MM-DD.md
   - Store execution metadata in trigger-executions.json
   - Respect action priority and rate limits
5. Report:
   - If triggers fired: Log which ones and what actions
   - If not: HEARTBEAT_OK
```

**Example Trigger Fire (Time-based):**
```
[08:45 weekday] Morning briefing trigger fires
→ Load unread emails + calendar
→ Prepare briefing
→ Queue message action
→ Execute if user online
→ Log: "Morning briefing sent" to memory/2026-02-13.md
```

**Example Trigger Fire (State-based):**
```
[Cost check] Daily spend = 80% of budget
→ Cost alert trigger fires
→ Send notification: "80% of daily budget used"
→ Log in memory and trigger-executions.json
→ Set 6h cooldown to prevent spam
```

---

## Execution Logic

```
IF context-aware triggers need evaluation (every cycle):
    Load triggers.json
    Build evaluation context (time, patterns, costs, events)
    Check each enabled trigger for match
    IF any triggers fire:
        Execute actions
        Log to memory/YYYY-MM-DD.md
        Return trigger execution report
    ELSE:
        Continue to next checks

IF pending tasks in TASKS.md:
    Execute autonomously
ELSE IF daily maintenance needed:
    Run maintenance routines (memory, errors, docs)
ELSE IF cost alert triggered:
    Notify user of budget status
ELSE IF project context changed:
    Load new project context
ELSE:
    Reply HEARTBEAT_OK
```

---

## State Tracking

Store last execution timestamps in `heartbeat_state.json`:
```json
{
  "last_maintenance": 1770957600,
  "last_inventory": 1770871200,
  "last_documentation": 1770871200,
  "tasks_checked": 1770958800,
  "last_trigger_eval": 1770958800,
  "trigger_cooldowns": {
    "morning-check": 1770871200,
    "cost-alert": 1770930600
  }
}
```

**Trigger Execution Record** (trigger-executions.json):
```json
{
  "executions": [
    {
      "id": "morning-check",
      "timestamp": "2026-02-13T08:45:00Z",
      "type": "time",
      "action": "morning_intelligence_briefing",
      "status": "executed",
      "next_eligible": "2026-02-14T08:45:00Z"
    },
    {
      "id": "cost-alert",
      "timestamp": "2026-02-13T14:23:45Z",
      "type": "state",
      "action": "send_cost_alert",
      "status": "executed",
      "reason": "Daily cost reached 80%",
      "next_eligible": "2026-02-13T20:23:45Z"
    }
  ]
}
```
