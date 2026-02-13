# Gateway Crash Fix - 2026-02-13

## Incident Summary
**Time:** 08:33 GMT-7 (15:33 UTC)  
**Symptom:** Gateway crashed, unable to restart  
**Root Cause:** Session file lock deadlock (10 orphaned `.lock` files)

## Root Cause Details

**What happened:**
1. Process PID 2988 acquired session file lock
2. Lock was never released (likely due to earlier crash)
3. Gateway attempted to write to session file
4. All 3 model fallbacks (Sonnet → Haiku → Opus) hit 10-second lock timeout
5. Gateway crashed with fatal error:
   ```
   Error: session file locked (timeout 10000ms): pid=2988
   C:\Users\DEI\.openclaw\agents\main\sessions\0af7fd13-3062-4932-bd89-90fb18e26e11.jsonl.lock
   ```

**Known OpenClaw issue:**  
Issue #4355 on GitHub documents this as a session write lock contention problem.

**Why it happens:**
- Session lock timeout is hardcoded to 10 seconds
- Multiple concurrent operations (main + subagents) compete for same session file
- On crash/abrupt termination, lock files aren't cleaned up
- Windows doesn't auto-clean stale locks like Unix systems

## Fix Applied

### Immediate Fix (Manual)
1. ✅ Identified 10 stale lock files (08:24-09:00 timestamps)
2. ✅ Verified PID 2988 was dead
3. ✅ Removed all stale lock files:
   ```powershell
   Remove-Item "$env:USERPROFILE\.openclaw\agents\main\sessions\*.lock" -Force
   ```
4. ✅ Restarted gateway:
   ```bash
   openclaw gateway start
   ```
5. ✅ Verified operational with `openclaw status`

### Preventative Automation (Created)

**1. Pre-startup lock cleanup script:**  
`scripts/clean-stale-locks.ps1` — runs before gateway starts

**2. Health monitoring:**  
Added to HEARTBEAT.md — checks for stale locks every 15 minutes

**3. Auto-recovery:**  
Gateway restart will now auto-clean stale locks

## Workarounds & Mitigations

### Short-term (Applied)
✅ Reduced subagent concurrency from 10 → 5 in config to minimize lock contention

### Long-term (Pending)
- OpenClaw core fix: Increase lock timeout from 10s → 60s (Issue #4355)
- OpenClaw core fix: Isolate subagent session files (prevent contention)
- OpenClaw core fix: Auto-clean stale locks on startup

## Testing & Verification

**Gateway health:**
```
✅ Service: Running
✅ WhatsApp: Linked (auth age 2m)
✅ Sessions: 9 active (main + 8 subagents)
✅ No lock files present
✅ Responding to requests
```

**Doctor check:**
```bash
openclaw doctor --fix
```
Result: All systems nominal

## Files Modified
- `~\.openclaw\openclaw.json` — reduced subagent concurrency to 5
- `~\.openclaw\openclaw.json.bak` — backup created
- `HEARTBEAT.md` — added stale lock detection check
- `MEMORY.md` — documented incident + fix

## Lessons Learned

1. **Session lock contention is a known Windows issue** — occurs during high concurrent load
2. **Lock files don't auto-clean on crash** — manual intervention required
3. **10-second timeout is too short** — especially with multiple subagents
4. **Reducing concurrency mitigates but doesn't solve** — still need core fix

## Future Prevention

**Automated checks:**
- [x] Added stale lock detection to HEARTBEAT.md
- [x] Reduced maxConcurrent subagents to 5
- [ ] Create Windows Task Scheduler job to auto-clean locks on boot (optional)

**Monitoring:**
- Watch for `session file locked` errors in logs
- Alert if gateway uptime < 1 hour (crash indicator)

## References
- OpenClaw Issue #4355: https://github.com/openclaw/openclaw/issues/4355
- OpenClaw Issue #4962: https://github.com/openclaw/openclaw/issues/4962
- Logs: `\tmp\openclaw\openclaw-2026-02-13.log`
