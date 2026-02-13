# Error Tracking & Pattern Detection

## Purpose
Centralized error logging with automatic pattern detection and learning.

---

## Error Log Format

`logs/errors.jsonl` structure:
```json
{
  "timestamp": "2026-02-12T21:58:00Z",
  "error_type": "exec_failure",
  "command": "...",
  "error_message": "...",
  "context": "...",
  "recovery_attempted": true,
  "recovery_successful": false,
  "pattern_id": "hash-of-error"
}
```

---

## Pattern Detection

**Automatic Analysis (via HEARTBEAT):**
1. Group errors by `pattern_id` (hash of error type + message)
2. If same pattern occurs 3+ times → Extract lesson
3. Update `MEMORY.md` with mitigation strategy
4. Add to `ERRORS_LEARNED.md` for future reference

---

## Error Categories

1. **Tool Execution** - exec, browser, process failures
2. **API Failures** - Web search, fetch, LLM timeouts
3. **File Operations** - Read/write permission errors
4. **Validation Failures** - Quality checks not met
5. **Resource Limits** - Memory, token, timeout exceeded

---

## Recovery Strategies by Category

### Tool Execution
- Retry with modified parameters
- Try alternative tool
- Request user intervention if critical

### API Failures
- Exponential backoff retry (3 attempts)
- Fallback to cached result if available
- Skip non-critical operations

### File Operations
- Check path existence
- Verify permissions
- Use alternative locations

### Validation Failures
- Revise output addressing specific issues
- Request clarification if requirements unclear

### Resource Limits
- Compress context
- Break task into smaller chunks
- Use cheaper model for sub-tasks

---

## Lessons Learned

<!-- Auto-populated from pattern analysis -->

