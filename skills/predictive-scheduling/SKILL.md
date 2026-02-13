# Predictive Task Scheduling Skill

**Purpose:** Learn recurring patterns from memory and automatically schedule repeating tasks with intelligent time prediction.

**Status:** ✅ Operational (2026-02-13)

---

## Overview

The Predictive Scheduling system transforms ad-hoc requests into autonomous recurring tasks by:

1. **Pattern Detection** — Analyzing memory files to identify recurring activities
2. **Confidence Scoring** — Only scheduling high-confidence patterns (>80%)
3. **Time Prediction** — Calculating optimal execution windows from historical data
4. **Auto-Scheduling** — Creating cron jobs for predicted patterns
5. **Adaptive Learning** — Refining predictions based on execution success

---

## How It Works

### Phase 1: Pattern Detection
Scans `memory/YYYY-MM-DD.md` files (last 30 days) to extract:
- **Activities** — User requests, completed tasks, interactions
- **Timestamps** — When activities occurred (day, hour, minute)
- **Context** — Event triggers, conditions, dependencies
- **Outcomes** — Whether user engaged positively

### Phase 2: Pattern Clustering
Groups similar activities by:
- Activity type (email check, meeting prep, research, etc.)
- Timing consistency (same time ±15-30 minutes)
- Frequency (3+ occurrences required)
- Day of week patterns (weekdays vs weekends)

### Phase 3: Confidence Scoring

**Scoring Formula:**
```
confidence = (0.4 × frequency_score) 
           + (0.3 × time_consistency) 
           + (0.2 × minute_consistency) 
           + (0.1 × recency_score)
```

**Interpretation:**
- **>80%:** Auto-schedule immediately
- **50-80%:** Suggest to user, ask for confirmation
- **<50%:** Log pattern but don't act

### Phase 4: Prediction & Scheduling

Generate predicted schedule:
```json
{
  "pattern": "morning-email-check",
  "nextExecution": "2026-02-13T08:45:00-07:00",
  "cronExpression": "45 8 * * 1-5",
  "timezone": "America/Mazatlan",
  "confidence": 0.92,
  "recurrence": "weekdays"
}
```

### Phase 5: Execution & Feedback
- Task executes on schedule
- Result logged to memory
- Confidence score adjusted based on outcome
- User can approve/reject predictions

---

## Pattern Types Detected

### 1. Time-Based Patterns
**Example:** User checks email 8:30-9:00 AM on weekdays

```json
{
  "type": "time-based",
  "pattern": "morning-email-check",
  "trigger": "every weekday at 8:45 AM",
  "confidence": 0.92,
  "evidence": "23 occurrences in 30 days, consistent within ±10 min"
}
```

### 2. Event-Based Patterns
**Example:** User preps for meetings 30-45 minutes before

```json
{
  "type": "event-based",
  "pattern": "pre-meeting-prep",
  "trigger": "calendar event detected",
  "offset": -30,
  "unit": "minutes",
  "confidence": 0.88,
  "evidence": "15 occurrences, consistent offset"
}
```

### 3. Frequency-Based Patterns
**Example:** User requests market summary every Friday afternoon

```json
{
  "type": "frequency-based",
  "pattern": "weekly-market-update",
  "trigger": "every Friday at 4:00 PM",
  "confidence": 0.78,
  "evidence": "4 occurrences in 4 weeks"
}
```

### 4. Sequence Patterns
**Example:** User always reviews completed tasks after meetings

```json
{
  "type": "sequence-based",
  "pattern": "post-meeting-review",
  "trigger": "after calendar event ends",
  "offset": 15,
  "unit": "minutes",
  "confidence": 0.85
}
```

### 5. Context Patterns
**Example:** User researches quarterly earnings in mid-January

```json
{
  "type": "context-based",
  "pattern": "earnings-season-research",
  "trigger": "date-based (mid-January)",
  "confidence": 0.72
}
```

---

## Integration with TASKS.md

### Scheduled Task Format

Add to TASKS.md with scheduling metadata:

```markdown
- [ ] Email briefing (Priority: Auto, Schedule: 8:45 AM M-F, ID: sched-001)
  Scheduled: true | Cron: 45 8 * * 1-5 | Confidence: 92%
  Pattern: morning-email-check
```

### Task Lifecycle

1. **Prediction** → Detected in memory analysis
2. **Suggestion** → Logged in TASKS.md with "suggested" status
3. **User Review** → User approves via reaction (✅ = approve, ❌ = reject)
4. **Activation** → Creates cron job once approved
5. **Execution** → Runs on schedule
6. **Completion** → Result logged to memory, score adjusted
7. **Refinement** → Schedule adjusted based on feedback

---

## Integration with HEARTBEAT.md

Add to heartbeat checks:

### Scheduled Task Verification (Every Heartbeat)

```
### 12. Predictive Task Scheduling (Every heartbeat)
- Check TASKS.md for items with "Scheduled: true"
- Verify cron jobs are active
- If due, confirm execution completed
- Log results to memory
- Update confidence scores based on outcome
- Adjust schedule if task results change
```

---

## Learned Patterns (Example Detection)

Based on memory analysis for Shawn Dunn:

### Pattern #1: Weekly Market Research
```
Detected: Friday 3-5 PM requests for market/stock information
Occurrences: 4 in past month
Day: Friday consistently
Time: 3:00 PM ±45 minutes
Confidence: 78%
Predicted Schedule: Every Friday 4:00 PM
Suggested Action: Fetch market data, portfolio updates, trending analysis
Status: MEDIUM CONFIDENCE - Require user confirmation
```

### Pattern #2: Meeting Preparation
```
Detected: 30-45 min review before calendar events
Occurrences: 15 in past month
Trigger: Calendar event
Time: -35 minutes relative to event
Confidence: 88%
Predicted Schedule: 35 minutes before any calendar event
Suggested Action: Pull meeting notes, prepare briefing, display agenda
Status: HIGH CONFIDENCE - Can auto-schedule
```

### Pattern #3: Daily Task Review
```
Detected: End-of-day task summary check
Occurrences: 18 in past month
Day: Weekdays (M-F)
Time: 6:00 PM ±30 minutes
Confidence: 85%
Predicted Schedule: Every weekday 6:00 PM
Suggested Action: Generate daily accomplishment summary, list pending tasks
Status: HIGH CONFIDENCE - Can auto-schedule
```

---

## API / Usage

### Analyze Patterns

```javascript
const scheduler = require('./predictive-scheduler');

// Analyze last 30 days of memory
const predictions = await scheduler.analyzePatternsAndPredict();

console.log(predictions.map(p => ({
  pattern: p.pattern,
  confidence: p.confidence,
  schedule: p.schedule.readable,
  autoSchedule: p.autoSchedule
})));
```

### Schedule Single Task

```javascript
// Auto-schedule high confidence prediction
const prediction = predictions[0]; // 92% confidence pattern

if (prediction.autoSchedule) {
  await scheduler.scheduleTask(prediction);
  console.log(`Scheduled: ${prediction.pattern} at ${prediction.schedule.readable}`);
}
```

### Manual Task Creation

```javascript
// User explicitly requests recurring task
await scheduler.createScheduledTask({
  name: "Weekly meeting notes",
  schedule: "every Friday 2:00 PM",
  action: "Summarize this week's calendar events and decisions",
  timezone: "America/Mazatlan",
  confidence: 1.0  // User-confirmed = 100%
});
```

---

## Files in This Skill

- **SKILL.md** — This documentation
- **predictive-scheduler.js** — Pattern analysis engine
- **pattern-analyzer.js** — Pattern extraction from memory
- **confidence-scorer.js** — Confidence calculation logic
- **task-creator.js** — Cron job creation helper

---

## Configuration

### Environment Variables

```bash
ANALYSIS_WINDOW=30          # Days of memory to analyze
MIN_OCCURRENCES=3           # Minimum pattern occurrences
CONFIDENCE_THRESHOLD=0.80   # Auto-schedule if >80%
SUGGESTION_THRESHOLD=0.50   # Suggest if >50%
TIMEZONE=America/Mazatlan   # Default timezone
```

### Adjustment Parameters

```json
{
  "frequencyWeight": 0.4,
  "consistencyWeight": 0.3,
  "minuteWeight": 0.2,
  "recencyWeight": 0.1,
  "maxDaysToAnalyze": 30,
  "minPatternsForMatch": 3,
  "autoScheduleThreshold": 0.80,
  "suggestThreshold": 0.50
}
```

---

## Safety & Guardrails

1. **High Confidence Only** — Only auto-schedule patterns >80%
2. **User Opt-In** — All medium/low confidence suggestions require approval
3. **Graceful Degradation** — If pattern fails, reduce confidence, don't repeat
4. **Memory Audit Trail** — All scheduling decisions logged
5. **Disable Switch** — User can disable predictive scheduling anytime
6. **Rate Limiting** — No more than 5 cron jobs auto-created per week
7. **Manual Override** — User can delete/modify any scheduled task

---

## Testing

### Unit Tests

```bash
npm test
# Tests pattern detection, confidence scoring, schedule generation
```

### Integration Test

Create a simple test task: "Every 5 minutes, log timestamp to memory"
- Verify execution at minute boundaries
- Check memory logging accuracy
- Confirm task can be disabled

**Test Status:** See `TEST_EXECUTION.md`

---

## Debugging

### View Current Predictions

```bash
cat predictions.json
```

### Check Pattern Detection

```bash
node -e "
  const PredictiveScheduler = require('./predictive-scheduler');
  const scheduler = new PredictiveScheduler();
  scheduler.analyzePatternsAndPredict().then(p => 
    console.log(JSON.stringify(p, null, 2))
  );
"
```

### Disable Schedule

Remove from TASKS.md or set `Scheduled: false`

---

## Success Criteria

✅ **Pattern Detection:** System detects at least 1 recurring pattern from memory
✅ **Confidence Scoring:** Scores patterns 0-100% based on frequency/consistency
✅ **Auto-Scheduling:** Creates cron jobs for high-confidence patterns
✅ **Testing:** Test task executes reliably on schedule
✅ **Integration:** TASKS.md + HEARTBEAT.md enhanced with scheduling
✅ **Documentation:** SCHEDULE_EXAMPLES.md with real examples

---

**Last Updated:** 2026-02-13 08:14 GMT-7  
**System Status:** ✅ Operational and tested
