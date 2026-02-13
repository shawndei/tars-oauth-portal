# Predictive Task Scheduling Skill

Smart automation that learns recurring patterns and schedules tasks to execute proactively.

## Quick Start

### What It Does
- **Detects** recurring patterns from your memory files (3+ occurrences)
- **Scores** patterns by confidence (0-100%)
- **Schedules** high-confidence patterns (>80%) to run automatically
- **Suggests** medium-confidence patterns (50-80%) for approval
- **Executes** on exact cron schedules with perfect timing

### Files in This Skill

| File | Purpose |
|------|---------|
| **SKILL.md** | Complete technical documentation |
| **TEST_EXECUTION.md** | Test results and verification |
| **README.md** | This file |
| **predictive-scheduler.js** | Pattern analysis engine |

### How to Use

#### Automatic (Recommended)
HEARTBEAT automatically:
1. Analyzes memory files weekly
2. Detects new patterns
3. Scores confidence
4. Schedules patterns >80%
5. Tracks execution

**No action needed** — patterns auto-schedule.

#### Manual Approval
For medium-confidence patterns (50-80%):
1. Review suggestion in HEARTBEAT output
2. React ✅ to approve, ❌ to reject
3. Or edit `predictions.json` directly

---

## Detected Patterns (Current)

### 1. Pre-Meeting Preparation ⭐⭐⭐⭐
- **Confidence:** 88%
- **Schedule:** 35 min before calendar events
- **Status:** ✅ Auto-Active
- **Result:** Briefing prepared before every meeting

### 2. End-of-Day Summary ⭐⭐⭐⭐
- **Confidence:** 85%
- **Schedule:** 6:00 PM Monday-Friday
- **Status:** ✅ Auto-Active
- **Result:** Daily accomplishments + pending tasks logged

### 3. Weekly Market Update ⭐⭐⭐
- **Confidence:** 78%
- **Schedule:** 4:00 PM every Friday
- **Status:** 💡 Suggested (awaiting approval)
- **Result:** Market trends & portfolio analysis

### 4. Test: 5-Minute Logger ✓
- **Confidence:** 100%
- **Schedule:** Every 5 minutes
- **Status:** 🧪 Running
- **Result:** Verifies scheduler works (288 runs/day)

---

## How Patterns Get Created

```
Your Memory Files (30 days)
         ↓
   Pattern Analysis
   (Cluster similar activities)
         ↓
 Confidence Scoring
 (Frequency, Consistency, Recency)
         ↓
        Decision
      ↙      ↘
   >80%    50-80%    <50%
   ↓         ↓         ↓
  Auto     Suggest    Skip
 Schedule           
   ↓
  Cron Job
   ↓
  Execution
```

---

## Files This Skill Creates/Uses

| File | Created By | Used By | Purpose |
|------|-----------|---------|---------|
| predictions.json | Scheduler | HEARTBEAT | Stores all predictions & scheduled tasks |
| memory/scheduled-test.log | Test Task | Verification | Logs execution test results |
| TASKS.md | System | User + HEARTBEAT | Lists scheduled tasks |
| memory/YYYY-MM-DD.md | Scheduler | Analysis | Logs scheduling decisions |
| heartbeat_state.json | HEARTBEAT | HEARTBEAT | Tracks last analysis time |

---

## Configuration

Edit at top of `predictive-scheduler.js`:

```javascript
{
  analysisWindow: 30,          // Days to analyze
  minOccurrences: 3,           // Minimum pattern hits
  confidenceThreshold: 0.80,   // Auto-schedule if >this
  suggestionThreshold: 0.50    // Suggest if >this
}
```

---

## Safety & Control

### Auto-Schedule Guardrails
- ✅ Only >80% confidence patterns auto-schedule
- ✅ All scheduling decisions logged
- ✅ Medium-confidence patterns need user approval
- ✅ Maximum 5 new auto-schedules per week
- ✅ Can be disabled anytime (set `enabled: false`)

### Disable a Schedule
Edit `predictions.json`:
```json
{
  "id": "pred-weekly-market",
  "enabled": false  ← Add this
}
```

### Monitor Execution
```bash
# View current predictions
cat predictions.json

# Check test task logs
cat memory/scheduled-test.log

# See scheduling decisions
grep "Scheduled task" memory/2026-02-*.md
```

---

## Examples

### Pattern Example 1: Morning Routine
If memory shows:
- Feb 1: Checked email at 8:45 AM
- Feb 2: Checked email at 8:50 AM
- Feb 3: Checked email at 8:42 AM
- (3+ occurrences)

**Result:** System auto-schedules "8:45 AM daily - Email check"

### Pattern Example 2: Friday Habit
If memory shows:
- Jan 17, 24, 31, Feb 7: Requested market data ~4:00 PM Friday

**Result:** System suggests "4:00 PM Fridays - Market update" (78% confidence)

### Pattern Example 3: Meeting Prep
If memory shows:
- 15 times: Reviewed notes 30-45 min before calendar events

**Result:** System auto-schedules "-35 min before each event - Meeting prep"

---

## Testing

### Test Task: 5-Minute Logger
Runs every 5 minutes to verify scheduler works.

**View logs:**
```bash
tail -f memory/scheduled-test.log
```

**Expected:** New entry every 5 minutes  
**Runs per day:** 288  
**Duration:** Continuous

**Check success:**
```bash
# Should show 288 entries per 24 hours
grep "✓ Timestamp" memory/scheduled-test.log | wc -l
```

---

## Troubleshooting

### Pattern Not Detected
- Minimum 3 occurrences required
- Check memory files have timestamps
- Verify activity is consistent (not random)

### Low Confidence Score
- Need more occurrences (5+ = higher confidence)
- Timing must be consistent (±15 min window)
- Recent activity weighted more heavily

### Task Not Executing
- Check if `enabled: true` in predictions.json
- Verify cron expression is valid
- Check HEARTBEAT is running (every 15 min)
- See memory/YYYY-MM-DD.md for execution log

### Too Many Auto-Schedules
- System limits 5/week to prevent spam
- Medium-confidence patterns wait for approval
- Can disable specific schedules anytime

---

## Integration

### With TASKS.md
Scheduled tasks appear with special metadata:
```markdown
- [x] Pattern Name (Priority: Auto, Schedule: time)
  Scheduled: true | Cron: expr | Confidence: %
```

### With HEARTBEAT.md
Every 15 minutes:
1. Check if scheduled tasks executed
2. Update confidence scores
3. Verify cron jobs active
4. Weekly: re-analyze patterns
5. Log results to memory

### With predictions.json
Central storage:
- All detected patterns
- Confidence scores
- Scheduled tasks
- Execution history
- User feedback

---

## Key Concepts

### Confidence Score
`0.4×frequency + 0.3×consistency + 0.2×accuracy + 0.1×recency`

- **>80%:** Auto-schedule
- **50-80%:** Suggest
- **<50%:** Log only

### Pattern Types
1. **Time-based:** Same time every day
2. **Frequency-based:** Same day/time weekly
3. **Event-based:** Relative to calendar events
4. **Sequence-based:** After specific events
5. **Context-based:** Seasonal or date-based

### Cron Expressions
```
Minute Hour Day Month DayOfWeek
  */5   *    *    *      *        = Every 5 min
   0    18   *    *     1-5       = 6 PM weekdays
   0    16   *    *      5        = 4 PM Fridays
  30   -1  1-7  Jan     *        = 1:30 AM (pre-meeting)
```

---

## Status

✅ **Operational**  
✅ **Tested** (10+ pattern detection tests passed)  
✅ **Monitored** (HEARTBEAT checks every 15 min)  
✅ **Safe** (>80% confidence required for auto-schedule)  

**System Ready:** Yes

---

## Support

See full documentation in:
- **SKILL.md** — Technical deep-dive
- **TEST_EXECUTION.md** — Test results
- **SCHEDULE_EXAMPLES.md** — Real examples

---

**Version:** 1.0.0  
**Status:** Production-Ready ✅  
**Last Updated:** 2026-02-13 08:14 GMT-7
