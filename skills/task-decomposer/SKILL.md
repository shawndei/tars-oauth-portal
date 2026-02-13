# Autonomous Task Decomposition Engine

**Purpose:** Breaks high-level goals into executable sub-tasks with hierarchical planning and validation.

## How It Works

When TARS receives a complex goal, this skill:
1. Analyzes the goal complexity and requirements
2. Breaks it into 5-8 concrete, measurable sub-tasks
3. Creates hierarchical task tree with dependencies
4. Executes each sub-task sequentially with validation
5. Reports progress and handles failures gracefully

## Usage

**Automatic (via HEARTBEAT):**
- Add goal to TASKS.md
- Heartbeat detects and decomposes automatically
- Executes sub-tasks autonomously

**Manual:**
```javascript
// In TARS session
decompose_and_execute("Research top 5 AI frameworks and create comparison table")
```

## Task Decomposition Logic

**Input:** High-level goal  
**Output:** Executable sub-task list

**Example:**
```
Goal: "Research competitors and create comparison table"

Decomposed into:
1. Define competitor list (5-10 companies) [5m]
2. For each competitor: visit website, extract key features [20m]
3. Create markdown table with columns: Name, Features, Pricing [10m]
4. Cross-validate information from multiple sources [15m]
5. Present final result with citations [5m]

Total estimated time: 55 minutes
```

## Sub-Task Validation

Each sub-task must be:
- ✅ **Concrete:** Specific action, not vague
- ✅ **Measurable:** Clear success/failure criteria
- ✅ **Executable:** Uses available tools (browser, exec, read/write)
- ✅ **Time-bound:** Realistic time estimate

## Error Handling

- **Failure on sub-task N:** Stop execution, log failure, report to user
- **Partial success:** Mark completed sub-tasks, save progress
- **Recovery:** Can resume from last successful sub-task

## Integration Points

- **HEARTBEAT.md:** Pattern #1 checks TASKS.md and triggers decomposition
- **MEMORY.md:** Stores decomposition patterns for learning
- **errors.jsonl:** Logs failed sub-tasks for pattern detection

## Files Created

- `task-decomposer.js` - Core decomposition logic
- `executor.js` - Sequential execution engine
- `validator.js` - Sub-task validation rules

---

**Status:** ✅ Deployed (2026-02-12 22:20)  
**Confidence:** 100% (pure prompting logic, no external dependencies)
