# Context-Aware Trigger Examples

This document explains common trigger patterns and how to implement them for your TARS system.

## Table of Contents
1. [Time-Based Triggers](#time-based-triggers)
2. [Pattern-Based Triggers](#pattern-based-triggers)
3. [Event-Based Triggers](#event-based-triggers)
4. [State-Based Triggers](#state-based-triggers)
5. [Real-World Examples](#real-world-examples)

---

## Time-Based Triggers

**Purpose:** Execute actions at specific times or recurring schedules.

**When to Use:** Daily/weekly routines, scheduled reports, consistent workflows

### Example 1: Morning Briefing (Weekdays at 8:45 AM)

```json
{
  "id": "morning-briefing",
  "name": "Morning Intelligence Briefing",
  "type": "time",
  "enabled": true,
  "schedule": "08:45",
  "days": ["mon", "tue", "wed", "thu", "fri"],
  "action": "morning_intelligence_briefing",
  "priority": "high",
  "cooldown": "24h",
  "description": "Every weekday at 8:45 AM - fetch emails, calendar events, news"
}
```

**What happens:**
- ⏰ 8:45 AM Monday-Friday triggers automatically
- 📧 Fetches unread emails (top 5 urgent)
- 📅 Lists upcoming calendar events (next 24 hours)
- 📰 Gets personalized news based on interests
- 📱 Sends summary via WhatsApp
- ⏳ 24h cooldown prevents duplicate triggers

**Skill Used:** `proactive-intelligence`

---

### Example 2: Afternoon Standup (2:30 PM Weekdays)

```json
{
  "id": "afternoon-standup",
  "type": "time",
  "schedule": "14:30",
  "days": ["mon", "tue", "wed", "thu", "fri"],
  "action": "afternoon_progress_check"
}
```

**What happens:**
- 📊 Summarize work completed since morning
- 📋 List outstanding tasks/blockers
- ⏱️ Time remaining in workday
- 🎯 Suggest next priority tasks

---

## Pattern-Based Triggers

**Purpose:** Detect repeated interests or behaviors and take proactive action.

**When to Use:** Anticipatory assistance, proactive research, context preparation

### Example 1: Market Interest Detection

```json
{
  "id": "market-interest",
  "name": "Market/Finance Interest Pattern",
  "type": "pattern",
  "pattern": "stocks|market|trading|portfolio|crypto|investment|finance",
  "threshold": 2,
  "window": "7d",
  "action": "proactive_market_update"
}
```

**How it works:**
1. **Scanning:** Every heartbeat, analyzes memory files from last 7 days
2. **Counting:** Matches keywords: "stocks", "market", "trading", etc.
3. **Threshold:** Triggers when 2+ matches found
4. **Action:** Fetches latest market data, trends, portfolio insights

**Example scenario:**
```
Day 1: User asks "What's the S&P 500 doing?" [1 match]
Day 3: User asks "How are tech stocks?" [2 matches]
→ TRIGGER FIRES!
→ Fetch market snapshot + tech sector trends
→ Have ready for next market question
```

---

### Example 2: Research Interest Detection

```json
{
  "id": "research-pattern",
  "name": "Deep Research Interest",
  "pattern": "research|analyze|investigate|study|deep-dive",
  "threshold": 3,
  "window": "7d",
  "action": "suggest_deep_research"
}
```

**How it works:**
- Detects when user is in "research mode"
- 3+ research-related queries in 7 days = pattern match
- Proactively prepares comprehensive research on the topic
- Suggests deep-researcher skill usage

---

## Event-Based Triggers

**Purpose:** Respond to calendar events and scheduled activities.

**When to Use:** Meeting prep, event-driven workflows, time-sensitive actions

### Example 1: Meeting Preparation (30 min before)

```json
{
  "id": "meeting-prep-30min",
  "name": "Meeting Prep Trigger",
  "type": "event",
  "event": "calendar_event_upcoming",
  "leadTime": "30m",
  "eventType": "meeting",
  "action": "prepare_meeting_briefing",
  "priority": "high"
}
```

**What happens 30 min before a meeting:**
1. 🔍 Research meeting attendees
2. 📄 Load relevant context/previous notes
3. 💡 Prepare talking points
4. 📊 Gather relevant data/reports
5. 📝 Create meeting notes template

**Example scenario:**
```
📅 Calendar Event: "Quarterly Planning with Finance Team" at 2:00 PM
↓ 1:30 PM trigger fires
→ Load Q4 financials
→ Research attendee backgrounds
→ Prepare agenda items
→ Create notes template
→ Ready for meeting!
```

---

## State-Based Triggers

**Purpose:** Respond to system state changes (cost, metrics, thresholds).

**When to Use:** Cost control, resource management, alerts

### Example 1: Budget Alert (80% of daily limit)

```json
{
  "id": "cost-alert-80",
  "name": "Cost Budget Alert",
  "type": "state",
  "condition": "cost >= 0.8 * budget",
  "threshold": 80,
  "action": "send_cost_alert",
  "priority": "high",
  "cooldown": "6h"
}
```

**What happens when cost hits 80%:**
- 🚨 Alert user: "You've used 80% of daily budget ($8 of $10)"
- 💰 Breakdown by API: OpenAI $5, web search $2, etc.
- ⏰ Time remaining before budget reset
- 💡 Suggestion: "Consider using haiku model for remaining tasks"
- ⏳ 6h cooldown prevents spam alerts

**Daily budget:** $10 (configurable)
**80% threshold:** $8
**90% threshold:** $9 (triggers model switch)

---

### Example 2: Cost Critical (90% + Switch to Haiku)

```json
{
  "id": "cost-alert-90",
  "name": "Cost Critical - Switch to Haiku",
  "type": "state",
  "condition": "cost >= 0.9 * budget",
  "action": "switch_to_haiku_model",
  "priority": "critical",
  "cooldown": "2h"
}
```

**What happens when cost hits 90%:**
- 🔴 CRITICAL alert sent
- 🔄 Automatically switch to haiku model (saves ~75% cost)
- 📝 Log action to memory
- ⚠️ Notify user of model downgrade
- 💬 All subsequent queries use haiku until budget resets

---

## Real-World Examples

### Scenario 1: "When home office location detected, show work tasks"

**Implementation:**

```json
{
  "id": "home-office-context",
  "name": "Home Office Context Trigger",
  "type": "pattern",
  "pattern": "home office|working from home|home base",
  "threshold": 1,
  "action": "load_work_context",
  "description": "When location context indicates home office"
}
```

**How it works:**
1. Memory mentions "home office" or user is at home location
2. Automatically load work-related context
3. Show work tasks, calendar, project status
4. Hide personal/casual content
5. Switch to work communication style

---

### Scenario 2: "30 minutes before calendar event, prepare briefing"

**Already shown in Event-Based section above.** This is the `meeting-prep-30min` trigger.

**Full flow:**
```
[Calendar: "Board Meeting" at 3:00 PM]
↓ 2:30 PM trigger fires
→ Fetch board member bios
→ Load Q3 performance data
→ Prepare key talking points
→ Create agenda document
→ Queue message: "Meeting briefing ready"
→ Wait for user to review
→ [3:00 PM] Meeting starts, briefing accessible
```

---

### Scenario 3: "When costs exceed 80%, switch to haiku model"

**Implementation:**

See State-Based Examples above - this is the `cost-alert-80` trigger.

**Full flow:**
```
[Cost tracking: $0.01 per API call]
[Daily budget: $10]
[Current spend: $8.50]
↓ Cost hits 80% ($8.00)
→ TRIGGER: cost-alert-80
→ Send alert: "80% of budget used"
→ Log in trigger-executions.json
→ Set 6h cooldown
→ Suggest switching to haiku
↓ When cost hits 90% ($9.00)
→ TRIGGER: cost-alert-90
→ AUTO-SWITCH model to haiku
→ Notify user of switch
→ Remaining $1.00 uses haiku (75% savings)
```

---

## How to Add Your Own Trigger

### Step 1: Identify the Pattern

Ask yourself:
- **What should trigger?** (time, pattern, event, state)
- **When/how often?** (schedule, frequency, condition)
- **What should happen?** (action to execute)
- **How urgent?** (priority level)

### Step 2: Write the Trigger JSON

```json
{
  "id": "my-trigger-id",
  "name": "My Trigger Name",
  "enabled": true,
  "type": "time|pattern|event|state",
  "... type-specific fields ...",
  "action": "action_name_here",
  "priority": "low|medium|high|critical",
  "cooldown": "1h|6h|24h",
  "description": "What this trigger does"
}
```

### Step 3: Add Action Definition

In `triggers.json` under `actions`:

```json
"action_name_here": {
  "description": "What the action does",
  "executor": "builtin|skill",
  "method": "or skill name",
  "timeout": "30s"
}
```

### Step 4: Test It

1. Add trigger to `triggers.json`
2. Run heartbeat cycle
3. Check `trigger-executions.json` for log entry
4. Verify action executed correctly

---

## Debugging Triggers

### Check Execution Log

```bash
cat trigger-executions.json
```

Look for:
- When trigger last fired
- What action executed
- Status (success/failed)
- Next eligible execution time

### Enable Verbose Logging

In `triggers.json` config:
```json
"config": {
  "logExecutions": true,
  "enableMetrics": true
}
```

### Manual Trigger Test

Run directly in heartbeat or via CLI:
```javascript
const ctx = require('./skills/context-triggers/context-triggers.js');
const triggers = new ctx();
await triggers.load();
const actions = await triggers.checkTriggers({
  cost: 8.5,
  budget: 10,
  time: new Date()
});
console.log('Triggered actions:', actions);
```

---

## Cooldown Rules

**Purpose:** Prevent the same trigger from firing repeatedly

| Cooldown | Use Case |
|----------|----------|
| 0 / None | Events that should fire every time (meetings) |
| 1h | Frequent checks (cost monitoring) |
| 6h | Alerts that shouldn't spam (cost threshold) |
| 24h | Daily routines (morning briefing) |

**Example:**
```
Trigger: cost-alert-80 with 6h cooldown
[10:00 AM] Cost hits 80% → FIRES, next eligible 4:00 PM
[12:00 PM] Cost still at 85% → BLOCKED (on cooldown)
[4:00 PM] Cost at 92% → FIRES, next eligible 10:00 PM
```

---

## Performance Notes

- **Evaluation:** Happens every 15 minutes (configurable)
- **Memory scanning:** Efficient regex matching, scans 7-day window
- **Cost:** Negligible (uses haiku model for evaluation)
- **Latency:** <100ms per trigger check

---

## Common Mistakes

❌ **Don't:**
- Set 0 cooldown on alerts (causes spam)
- Use overly broad patterns (too many false positives)
- Create overlapping triggers (cause duplicate actions)
- Forget to enable the trigger

✅ **Do:**
- Test new triggers in "enabled: false" first
- Use specific patterns (stocks vs market)
- Set appropriate cooldowns
- Document your triggers
- Monitor trigger-executions.json

---

## Resources

- **SKILL.md** - Technical implementation details
- **triggers.json** - Active trigger configuration
- **HEARTBEAT.md** - Evaluation logic
- **trigger-executions.json** - Execution history and logs
