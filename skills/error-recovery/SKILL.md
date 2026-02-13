---
name: error-recovery
description: Automatically retries failed operations with adaptive strategy modification
---

# Enhanced Error Recovery System

## Purpose
Wraps all tool executions with intelligent retry logic and adaptive strategy.

## Recovery Strategies

### 1. Exponential Backoff Retry
```
Attempt 1: Execute immediately
Attempt 2: Wait 2 seconds, retry
Attempt 3: Wait 4 seconds, retry with modified approach
Final: Log failure, extract lesson
```

### 2. Strategy Adaptation

**exec failures:**
- Retry 1: Same command
- Retry 2: With elevated permissions (if available)
- Retry 3: Alternative command approach
- Failure: Log to errors.jsonl with full context

**browser failures:**
- Retry 1: Refresh and retry
- Retry 2: Clear cache, retry
- Retry 3: Headless mode toggle
- Failure: Screenshot + DOM dump for debugging

**web_search/fetch failures:**
- Retry 1: Same query
- Retry 2: Simplified query
- Retry 3: Alternative search terms
- Failure: Use cached results if available

**file operation failures:**
- Retry 1: Check permissions
- Retry 2: Alternative path
- Retry 3: Create parent directories
- Failure: Use temp directory fallback

### 3. Error Pattern Learning

After 3 failures of same pattern:
1. Extract error signature (type + message hash)
2. Generate mitigation strategy via LLM
3. Store in `MEMORY.md` under "Error Patterns"
4. Apply mitigation on future occurrences

## Implementation

### Wrapper Function
```python
def execute_with_recovery(tool, params, max_retries=3):
    """
    Universal error recovery wrapper
    """
    for attempt in range(max_retries):
        try:
            result = tool(**params)
            if result.success:
                log_success(tool, params, attempt)
                return result
        except Exception as e:
            if attempt == max_retries - 1:
                # Final failure
                lesson = extract_lesson(tool, params, e)
                log_failure(tool, params, e, lesson)
                raise
            
            # Adapt strategy
            diagnosis = analyze_error(tool, e)
            params = adapt_strategy(params, diagnosis, attempt)
            
            # Exponential backoff
            time.sleep(2 ** attempt)
    
    return None
```

### Error Analysis
```
Error Type → Diagnosis → Adaptation

TimeoutError → "Service slow/unreachable" → Increase timeout, try alt endpoint
PermissionError → "Access denied" → Request elevation, try alt path
FileNotFoundError → "Path invalid" → Create directories, check working dir
NetworkError → "Connection failed" → Check connectivity, retry with backoff
ValidationError → "Output malformed" → Revise prompt, add validation
```

## Recovery Success Tracking

Target: **95% auto-recovery rate**

Tracked in `analytics/recovery_stats.json`:
```json
{
  "total_errors": 100,
  "auto_recovered": 95,
  "manual_intervention": 5,
  "recovery_rate": 0.95,
  "by_tool": {
    "exec": {"errors": 30, "recovered": 29, "rate": 0.97},
    "browser": {"errors": 25, "recovered": 23, "rate": 0.92},
    "web_search": {"errors": 20, "recovered": 19, "rate": 0.95}
  }
}
```

## Integration

Integrated into all tool calls system-wide:
- HEARTBEAT task execution
- Manual task execution
- Sub-agent operations
- Automated routines

## Monitoring

Check recovery performance:
```
Weekly report in analytics/reports/
- Recovery rate by tool
- Common failure patterns
- Mitigation effectiveness
- Areas needing improvement
```
