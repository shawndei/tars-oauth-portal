# TARS Knowledge Base

**Auto-Generated:** Via memory pattern extraction  
**Last Updated:** 2026-02-12  
**Purpose:** Curated patterns, techniques, and learnings

---

## How This Works

This knowledge base is automatically built from:
1. `MEMORY.md` - Long-term curated memories
2. `memory/YYYY-MM-DD.md` - Daily interaction logs
3. `logs/errors.jsonl` - Error patterns and lessons
4. Project histories - Successful workflows

**Update Frequency:** Daily via HEARTBEAT memory maintenance

---

## Categories

### 1. User Preferences & Patterns
<!-- Auto-extracted from interactions -->

**Communication Style:**
- Direct, TL;DR format preferred
- Exact numbers and dates required
- Tables and checklists over prose
- Artifact-first outputs (ready to use)

**Decision Making:**
- Probabilistic thinking (Taleb influence)
- Strategic long-term planning (5-10 year horizon)
- Evidence-based with confidence levels
- Systems thinking, integrating multiple factors

### 2. Successful Workflows
<!-- Extracted from completed tasks -->

**Research Workflow:**
1. Define scope and criteria
2. Use web_search for initial discovery (10 sources)
3. Follow links via web_fetch (20-30 sources)
4. Extract and organize findings
5. Cross-reference and validate
6. Create comparison tables
7. Cite all sources

**Multi-Step Task Pattern:**
1. Decompose goal into sub-tasks
2. Validate each step before proceeding
3. Log progress continuously
4. Handle errors with retry logic
5. Synthesize results
6. Update memory with lessons

### 3. Error Patterns & Mitigations
<!-- Auto-extracted from logs/errors.jsonl -->

**Common Errors:**

| Error Type | Frequency | Mitigation |
|------------|-----------|------------|
| exec TimeoutError | 15% | Increase timeout, background execution |
| browser CrashError | 10% | Restart browser, use headless mode |
| web_search RateLimitError | 8% | Implement backoff, cache results |
| FileNotFoundError | 12% | Verify paths, create directories |

### 4. Tool Usage Best Practices
<!-- Learned from experience -->

**browser:**
- Use managed profile for reliability
- Evaluate JS for dynamic content
- Take screenshots before actions (debugging)
- Handle popups and alerts gracefully

**web_search:**
- Use specific queries (better results)
- Limit to 10 results (speed)
- Cache frequent queries (cost savings)
- Fallback to web_fetch if search fails

**exec:**
- Always set timeout (prevent hangs)
- Use background for long operations
- Capture stdout/stderr (debugging)
- Test commands in isolation first

**memory_search:**
- Use semantic queries (not exact match)
- Combine with keyword search when needed
- Set appropriate minScore (0.7 default)
- Review results before presenting

### 5. Cost Optimization Techniques
<!-- Extracted from cost tracking data -->

**Model Selection:**
- haiku: Research, simple queries, sub-agents (93% cheaper)
- sonnet: Complex reasoning, writing, main agent
- opus: Mission-critical only (most expensive)

**Token Management:**
- Context compression at 90k tokens
- Summarize verbose tool outputs
- Remove redundant information
- Cache common queries

**Sub-Agent Strategy:**
- Always use haiku for research
- Use sonnet for coordination
- Never use opus for sub-agents
- Monitor costs via analytics/costs.json

### 6. Project Management Patterns
<!-- Extracted from projects/ -->

**Project Structure:**
```
projects/[name]/
├── CONTEXT.md     # Goals, scope, stakeholders
├── MEMORY.md      # Project-specific learnings
├── research/      # Research findings
├── drafts/        # Work in progress
└── final/         # Completed artifacts
```

**Project Lifecycle:**
1. Create project structure
2. Define context and goals
3. Break goals into tasks (TASKS.md)
4. Execute tasks autonomously
5. Review and iterate
6. Archive when complete

### 7. Quality Assurance Checklist
<!-- From reflection pattern -->

**Before Every Response:**
- [ ] Answered the actual question
- [ ] Specific, actionable information
- [ ] Sources cited if factual
- [ ] No unsupported claims
- [ ] Proper formatting
- [ ] Complete (nothing missing)

**For Complex Tasks:**
- [ ] Break into steps
- [ ] Validate each step
- [ ] Log progress
- [ ] Handle errors gracefully
- [ ] Synthesize results
- [ ] Update knowledge base

### 8. Proactive Intelligence Patterns
<!-- Extracted from HEARTBEAT routines -->

**Daily Checks:**
- Task queue (pending work)
- Memory maintenance (distill insights)
- Error patterns (repeated failures)
- Cost monitoring (budget alerts)

**Weekly Checks:**
- Capability inventory (new tools)
- Documentation updates (keep current)
- Cost trends (optimization opportunities)
- Recovery rate analysis (error handling effectiveness)

**Monthly Checks:**
- Memory pruning (archive old daily files)
- Knowledge base review (remove outdated)
- Performance metrics (track improvements)
- Strategic planning (long-term goals)

---

## Pattern Extraction Algorithm

**How patterns are identified:**

1. **Frequency Analysis**
   - Actions repeated 3+ times
   - Successful workflows (outcome=success)
   - Error mitigations that worked

2. **Semantic Clustering**
   - Group similar interactions
   - Identify common themes
   - Extract representative patterns

3. **Effectiveness Rating**
   - Success rate (>80% = keep)
   - Time to completion (faster = better)
   - Cost efficiency (cheaper = better)

4. **Validation**
   - Test pattern on new tasks
   - Measure improvement
   - Keep if effective, discard if not

---

## Using This Knowledge Base

**Automatic Application:**
- Patterns automatically applied via HEARTBEAT
- Error mitigations looked up before retry
- Workflows referenced for similar tasks

**Manual Reference:**
- Search for specific patterns: "How to handle X error"
- Review successful workflows before complex tasks
- Check user preferences before formatting output

**Continuous Improvement:**
- Knowledge base updates daily
- New patterns added automatically
- Outdated patterns pruned
- Effectiveness tracked over time

---

## Metrics

**Knowledge Base Stats:**
- Total patterns: [auto-updated]
- Success rate: [auto-updated]
- Last effective pattern: [auto-updated]
- Patterns applied today: [auto-updated]

**Quality Indicators:**
- Pattern reuse rate: Target >50%
- Error reduction: Target >30%
- Task completion improvement: Target >20%
- Cost savings: Target >15%

---

**This knowledge base is living documentation - it grows smarter with every interaction.**
