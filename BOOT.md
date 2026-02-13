# BOOT.md - Gateway Startup Automation

## Purpose
Runs automatically when gateway starts (via boot-md hook).

---

## Startup Checklist

### 1. System Verification
- ✓ Check OpenClaw version: 2026.2.9
- ✓ Verify workspace accessible: `~/.openclaw/workspace`
- ✓ Confirm memory files present: `MEMORY.md`, `AGENTS.md`, `SOUL.md`

### 2. Context Loading
- ✓ Read active project: `projects/ACTIVE_PROJECT.txt`
- ✓ Load project context if not default
- ✓ Check for urgent tasks in `TASKS.md`

### 3. Health Checks
- ✓ Verify hooks enabled: command-logger, session-memory, boot-md
- ✓ Check last heartbeat state: `heartbeat_state.json`
- ✓ Validate error log accessibility: `logs/errors.jsonl`

### 4. Pending Actions
- ✓ Check for incomplete tasks from last session
- ✓ Review error patterns from `logs/errors.jsonl`
- ✓ Load cost tracking data: `analytics/costs.json`

### 5. Status Report
- ✓ Log boot completion to `logs/boot.log`
- ✓ Report any issues detected
- ✓ Confirm ready for operations

---

## Boot Completion

After successful boot:
```
[BOOT COMPLETE]
- OpenClaw 2026.2.9 operational
- Active project: [project-name]
- Pending tasks: [count]
- System status: All checks passed
```

If issues detected:
```
[BOOT WARNING]
- Issue: [description]
- Impact: [severity]
- Recommended action: [mitigation]
```

---

## Execution

This file is processed by the boot-md hook automatically.  
No user intervention required.

**Note:** Keep this file concise to minimize boot time.
