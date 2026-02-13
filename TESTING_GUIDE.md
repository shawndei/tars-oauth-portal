# TARS Testing Guide
## Comprehensive Validation of All Capabilities

**Last Updated:** 2026-02-12 23:20 GMT-7  
**Total Capabilities:** 26 (19 from earlier + 7 new)

---

## Quick Test Commands

### 1. Task Decomposition
```
Test: "Research top 5 AI frameworks and create comparison table"
Expected: Task auto-decomposes into sub-tasks, executes sequentially
Verify: Check TASKS.md for decomposed tasks
```

### 2. Self-Healing Error Recovery
```
Test: Trigger browser timeout (visit slow site)
Expected: Auto-retry with increased timeout, fallback to web_fetch
Verify: Check logs/recoveries.jsonl for recovery attempts
```

### 3. Context-Aware Triggers
```
Test: Check triggers.json patterns (cost alert, morning check)
Expected: Triggers fire based on conditions (cost >80%, time matching)
Verify: Heartbeat logs show trigger evaluations
```

### 4. Deep Research
```
Test: "Deep research on OpenClaw 2026 capabilities"
Expected: Visits 10-20 sources, cross-references, creates cited report
Verify: research-reports/ directory contains JSON report
```

### 5. Predictive Scheduling
```
Test: Analyze memory patterns (run after 7+ days of usage)
Expected: Detects recurring tasks, predicts optimal times
Verify: predictions.json shows detected patterns with confidence scores
```

### 6. Rate Limiting
```
Test: Simulate high-cost session
Expected: At 80% budget → warning, 90% → switch to haiku, 100% → block
Verify: Check rate-limits.jsonl for enforcement actions
```

### 7. Notification Routing
```
Test: Trigger P0, P1, P2, P3 notifications
Expected: P0 → all channels, P1 → WhatsApp, P2/P3 → email/batched
Verify: logs/notifications.jsonl shows routing decisions
```

### 8. Webhook Automation
```
Test: Send webhook POST to localhost:18790/webhooks/task
Expected: Task added to TASKS.md automatically
Verify: Task appears in Pending section
```

### 9. Multi-Agent Orchestration
```
Test: "@researcher: Research AI safety"
Expected: Spawns haiku researcher agent, completes task
Verify: multi-agent-memory.json shows agent status
```

### 10. Continuous Learning
```
Test: Give 👎 reaction to verbose response
Expected: Learning system records feedback, adapts after pattern (3+ times)
Verify: learning-patterns.json updates with preference
```

### 11. Proactive Intelligence
```
Test: Use TARS daily for 3-5 days
Expected: Detects routines, sends proactive suggestions
Verify: proactive-patterns.json shows detected patterns
```

### 12. Memory Search
```
Test: memory_search("optimization phases configuration")
Expected: Returns relevant snippets from MEMORY.md with citations
Verify: Results include file paths and line numbers
```

---

## Detailed Test Procedures

### Task Decomposition Test

**Setup:**
1. Clear TASKS.md pending section
2. Add complex goal

**Execute:**
```
Add to TASKS.md:
- [ ] Research top 5 AI frameworks, compare features, create table (Priority: High)
```

**Wait:** 15 minutes (1 heartbeat cycle)

**Verify:**
- Task decomposed into 5-8 sub-tasks
- Sub-tasks have estimated durations
- Execution log shows sequential progress
- Completed tasks moved to "Completed" section

**Success Criteria:**
- ✅ Task decomposed automatically
- ✅ Each sub-task concrete and measurable
- ✅ Sequential execution with validation
- ✅ Final result meets expected output

---

### Self-Healing Test

**Setup:**
1. Configure intentional failure scenario
2. Monitor recovery attempts

**Execute:**
```javascript
// Simulate browser timeout
browser.navigate("https://extremely-slow-site.com", { timeout: 1000 })
```

**Expected Behavior:**
1. Initial attempt fails (timeout)
2. Diagnosis: "Browser timeout"
3. Strategy adaptation: Increase timeout 2x, enable headless
4. Retry attempt 1: Modified approach
5. If still fails: Fallback to web_fetch

**Verify:**
- logs/recoveries.jsonl contains recovery record
- errors.jsonl shows original error + diagnosis
- Final success or graceful failure with explanation

**Success Criteria:**
- ✅ Error caught and diagnosed
- ✅ Strategy adapted intelligently
- ✅ Retry with modifications
- ✅ Recovery logged with details

---

### Webhook Automation Test

**Setup:**
1. Start webhook server: `node skills/webhook-automation/webhook-server.js`
2. Prepare test payload

**Execute (PowerShell):**
```powershell
$headers = @{
  "Authorization" = "Bearer wh_7K9mP3nQ2rX8vL4jB6hY5tF1cN0gZ9sA"
  "Content-Type" = "application/json"
}

$body = @{
  action = "add_task"
  task = "Test webhook: Research latest OpenClaw updates"
  priority = "high"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:18790/webhooks/task" -Method POST -Headers $headers -Body $body
```

**Verify:**
- Response: `{"success": true, "taskId": "task-...", "message": "Task added to queue"}`
- TASKS.md updated with new task
- logs/webhooks.jsonl contains request log

**Success Criteria:**
- ✅ Webhook authenticates correctly
- ✅ Task added to TASKS.md
- ✅ Response returned immediately
- ✅ Request logged

---

### Multi-Agent Orchestration Test

**Setup:**
1. Verify multi-agent-config.json loaded
2. Check specialist definitions

**Execute:**
```
Test 1: "@researcher: Research AI safety developments"
Expected: Haiku researcher agent spawned

Test 2: "@coder: Write Python script to parse JSON"
Expected: Sonnet coder agent spawned (better code quality)

Test 3: Complex task requiring coordination
Expected: Coordinator spawns multiple specialists
```

**Verify:**
- multi-agent-memory.json shows agent status
- logs/multi-agent.jsonl contains spawn records
- Correct model used (haiku vs sonnet based on specialist)
- Load balancing works (max concurrent respected)

**Success Criteria:**
- ✅ Correct specialist selected
- ✅ Appropriate model used (cost optimization)
- ✅ Agent spawned successfully
- ✅ Shared memory updated

---

### Continuous Learning Test

**Setup:**
1. Reset learning-patterns.json (optional)
2. Prepare test feedback scenarios

**Execute:**
```
Scenario 1: Format preference
- Request information
- Give 👎 to verbose paragraph response
- Repeat 3x with varied queries
- On 4th request, expect bullet list format

Scenario 2: Timing preference
- Check for updates at 8:30 AM daily for 5 days
- On day 6, expect proactive update at 8:15 AM

Scenario 3: Explicit correction
- Say: "I prefer shorter responses"
- Verify immediate adaptation (no need for 3x pattern)
```

**Verify:**
- learning-patterns.json updates after feedback
- Confidence scores increase with consistent feedback
- Adaptations apply when confidence >75%
- MEMORY.md logs significant learnings

**Success Criteria:**
- ✅ Feedback captured correctly
- ✅ Pattern detection works (3+ occurrences)
- ✅ Confidence calculated accurately
- ✅ Behavior adapts when threshold met

---

### Proactive Intelligence Test

**Setup:**
1. Use TARS regularly for 3-5 days
2. Establish routines (check email, research topics, etc.)

**Execute:**
```
Day 1-3: Establish patterns
- Check email at 8:30 AM daily
- Research AI topics 2-3x per week
- Ask about weather before outdoor plans

Day 4+: Observe proactive actions
- Expect email summary at 8:15 AM (before usual time)
- Expect AI news digest weekly
- Expect weather forecast when outdoor event on calendar
```

**Verify:**
- proactive-patterns.json shows detected patterns with confidence
- HEARTBEAT triggers proactive actions at predicted times
- Suggestions appear contextually appropriate
- User can disable unwanted proactive actions

**Success Criteria:**
- ✅ Patterns detected accurately (3+ occurrences)
- ✅ Confidence scores calculated
- ✅ Proactive actions fire at optimal times
- ✅ Context-aware suggestions relevant

---

## Integration Testing

### End-to-End Workflow Test

**Scenario:** Complex multi-step project  
**Goal:** Verify all systems work together seamlessly

**Test Case:**
```
User: "Research top 10 CRM systems, analyze features, and create buying guide"

Expected Flow:
1. Task decomposition: Breaks into research → analysis → writing
2. Multi-agent orchestration: 
   - Spawns 2-3 Researcher agents (parallel, haiku)
   - Spawns Analyst agent (haiku)
   - Spawns Writer agent (sonnet for quality)
3. Self-healing: Recovers from any failures automatically
4. Progress tracking: Updates multi-agent-memory.json
5. Cost optimization: Uses haiku where possible (93% savings)
6. Notification: Sends completion alert (P2 priority)
7. Learning: Captures feedback on final output
8. Memory: Stores insights in MEMORY.md
```

**Verify All Systems:**
- ✅ Task decomposition works
- ✅ Multi-agent coordination successful
- ✅ Error recovery (if any failures)
- ✅ Cost optimization applied
- ✅ Notification routed correctly
- ✅ Learning system ready for feedback
- ✅ Memory persisted
- ✅ Total time reasonable (parallel execution)
- ✅ Output quality high

---

## Performance Benchmarks

### Target Metrics

| Capability | Target | Measurement |
|-----------|--------|-------------|
| Task decomposition | <5 seconds | Time from TASKS.md update to execution start |
| Error recovery | 95% success rate | Successful recoveries / total errors |
| Deep research | 20-50 sources in <30 min | Source count & completion time |
| Webhook response | <200ms | Request to response time |
| Multi-agent spawn | <3 seconds | Sessions_spawn call to agent ready |
| Memory search | <1 second | Query to results return |
| Pattern detection | 3-5 occurrences | Minimum samples for confidence >75% |
| Proactive accuracy | >80% | Relevant suggestions / total suggestions |

---

## Automated Test Suite

**Location:** `tests/` directory

**Run All Tests:**
```powershell
# Test task decomposition
node tests/test-task-decomp.js

# Test self-healing
node tests/test-self-healing.js

# Test webhooks
node tests/test-webhooks.js

# Test multi-agent
node tests/test-multi-agent.js

# Integration test
node tests/test-integration.js
```

**Expected Output:**
```
✅ Task Decomposition: PASS (5/5 tests)
✅ Self-Healing: PASS (8/8 tests)
✅ Webhooks: PASS (6/6 tests)
✅ Multi-Agent: PASS (10/10 tests)
✅ Integration: PASS (15/15 tests)

Total: 44/44 tests passed (100%)
```

---

## Issue Reporting

**If test fails:**

1. **Capture context:**
   - Exact command/input used
   - Expected vs actual behavior
   - Error messages (if any)
   - Relevant log files

2. **Check logs:**
   - errors.jsonl
   - task-executions.jsonl
   - webhooks.jsonl
   - multi-agent.jsonl
   - recoveries.jsonl

3. **Document issue:**
   - Create `ISSUES.md` entry
   - Include reproduction steps
   - Attach relevant logs
   - Propose fix if obvious

4. **Iterate until perfect:**
   - Fix identified issue
   - Re-run test
   - Verify fix works
   - Update documentation

---

## Manual Acceptance Testing

**User (Shawn) should verify:**

1. **Usability:**
   - Are responses helpful and accurate?
   - Is autonomous operation smooth?
   - Do proactive actions feel natural?

2. **Reliability:**
   - Do systems recover from errors gracefully?
   - Are there any crashes or stuck states?
   - Is data persisted correctly?

3. **Performance:**
   - Are response times acceptable?
   - Is cost optimization working (check costs.json)?
   - Are resources used efficiently?

4. **Safety:**
   - No unintended external actions?
   - Data privacy maintained?
   - Appropriate confirmation for sensitive ops?

---

**Testing Status:** Ready for comprehensive validation  
**Next:** Run all tests, document results, iterate on failures  
**Goal:** 100% pass rate before marking implementation complete
