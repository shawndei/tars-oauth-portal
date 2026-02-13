# TARS System Documentation

**Auto-Generated:** Via HEARTBEAT (weekly scan)  
**Last Updated:** 2026-02-12

---

## Quick Reference

### System Architecture
```
TARS OpenClaw 2026.2.9
├── Core Intelligence (claude-sonnet-4-5)
├── Background Work (claude-haiku-4-5, 93% cost savings)
├── Memory System (OpenAI embeddings + MEMORY.md)
├── Autonomous Execution (no approval gates)
└── Multi-Agent Coordination (5 main + 10 sub)
```

### Key Locations
- **Workspace:** `C:\Users\DEI\.openclaw\workspace`
- **Memory:** `workspace/memory/` + `MEMORY.md`
- **Projects:** `workspace/projects/`
- **Tasks:** `workspace/TASKS.md`
- **Logs:** `workspace/logs/`
- **Analytics:** `workspace/analytics/`

---

## Core Systems

### 1. Autonomous Task Execution
**File:** `TASKS.md`  
**How:** Add goals to pending section → HEARTBEAT executes autonomously  
**Format:**
```
- [ ] Goal description (Priority: High/Medium/Low)
```

### 2. Proactive Intelligence
**File:** `HEARTBEAT.md`  
**Frequency:** Every 15 minutes  
**Functions:**
- Task queue monitoring
- Memory maintenance
- Error pattern detection
- Cost tracking
- Documentation updates

### 3. Projects System
**Location:** `projects/`  
**Current:** `projects/ACTIVE_PROJECT.txt` → default  
**Switch:** Say "Switch to project: [name]"  
**Structure:**
```
projects/[name]/
├── CONTEXT.md    # Project goals and context
├── MEMORY.md     # Project-specific learnings
└── files/        # Project artifacts
```

### 4. Quality Assurance
**File:** `AGENTS.md` (reflection pattern)  
**Process:**
1. Generate response
2. Self-review checklist (6 criteria)
3. Revise if needed
4. Deliver validated output

### 5. Error Learning
**File:** `logs/errors.jsonl`  
**Process:**
1. Log all errors with context
2. Detect patterns (3+ occurrences)
3. Extract lessons → `MEMORY.md`
4. Apply mitigation strategies

### 6. Cost Management
**File:** `analytics/costs.json`  
**Budgets:** $10/day, $50/week, $200/month  
**Alerts:** 80% warning, 100% critical  
**Optimization:** Auto-suggests haiku for sub-agents

### 7. Boot Automation
**File:** `BOOT.md`  
**Hook:** boot-md (enabled)  
**Runs:** On gateway restart  
**Functions:**
- System verification
- Context loading
- Health checks
- Pending actions review

---

## Workflows

### Research Workflow
1. User: "Research [topic]"
2. TARS: Uses Brave Search API + web fetch
3. Visits 10-30 sources
4. Extracts key facts
5. Synthesizes findings
6. Cites sources
7. Validates quality before delivery

### Multi-Step Task Workflow
1. User: High-level goal
2. TARS: Decomposes into sub-tasks
3. Executes each step
4. Validates success
5. Continues or adapts on failure
6. Reports final outcome

### Proactive Workflow
1. HEARTBEAT triggers (every 15 min)
2. Checks `TASKS.md` for pending work
3. Executes autonomously
4. Updates task status
5. Logs completion

### Error Recovery Workflow
1. Tool execution fails
2. Log to `errors.jsonl`
3. Analyze failure
4. Adapt strategy
5. Retry with modification
6. Report if all retries fail

---

## Available Tools

### File Operations
- `read` - Read files
- `write` - Create/overwrite files
- `edit` - Precise text replacement
- `apply_patch` - Multi-file patches

### Execution
- `exec` - Shell commands
- `process` - Manage running processes
- `bash` - Elevated commands (authorized users)

### Browser
- `browser` - Full automation (managed profile)
- `evaluate` - JavaScript execution
- `snapshot` - Page capture

### Web
- `web_search` - Brave API (10 results, verified)
- `web_fetch` - Content extraction (50k chars)

### Intelligence
- `memory_search` - Semantic recall (OpenAI)
- `memory_get` - Retrieve specific memory
- `sessions_spawn` - Multi-agent coordination
- `session_status` - Current session info

### Communication
- `message` - Send to channels (WhatsApp, etc.)
- `tts` - Text-to-speech (ElevenLabs)

---

## Configuration

### Model Selection
- **Main:** claude-sonnet-4-5 (complex reasoning)
- **Sub-agents:** claude-haiku-4-5 (speed + cost)
- **Failover:** haiku-4-5 → opus-4-5

### Concurrency Limits
- Main: 5 concurrent
- Sub-agents: 10 concurrent

### Memory Settings
- Context: 100k tokens
- Cache TTL: 1 hour
- Compaction: Safeguard mode
- Memory flush: Enabled (4k token threshold)

### Cost Budgets
Edit `analytics/costs.json`:
```json
{
  "daily_budget": 10,
  "weekly_budget": 50,
  "monthly_budget": 200
}
```

---

## Maintenance

### Daily (Automatic via HEARTBEAT)
- Memory maintenance
- Error pattern detection
- Cost monitoring

### Weekly (Automatic via HEARTBEAT)
- Documentation update
- Capability inventory refresh
- Weekly cost report

### Manual Tasks
- Review `MEMORY.md` monthly
- Archive old projects
- Clean `logs/` directory (>30 days)
- Update `USER.md` with new preferences

---

## Troubleshooting

### Issue: HEARTBEAT not running
**Check:** `HEARTBEAT.md` exists and has content  
**Fix:** File should not be empty or commented out

### Issue: Tasks not executing
**Check:** `TASKS.md` format correct  
**Fix:** Follow format: `- [ ] Goal (Priority: Level)`

### Issue: High costs
**Check:** `analytics/costs.json` for breakdown  
**Fix:** Use haiku for sub-agents, enable compression

### Issue: Errors repeating
**Check:** `logs/errors.jsonl` for patterns  
**Fix:** Review `MEMORY.md` for learned mitigations

---

## Getting Help

1. Check `STATUS.md` - Current capabilities
2. Check `DOCUMENTATION.md` - This file
3. Check `MEMORY.md` - Learned patterns
4. Ask TARS - Self-documenting system

---

**Documentation Updates:** Auto-generated weekly  
**Manual Refresh:** Request at any time
