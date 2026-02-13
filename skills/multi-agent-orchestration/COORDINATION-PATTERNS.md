# Agent Coordination Patterns (TARS)

**Reference Architecture for Multi-Agent Collaboration**

## Table of Contents
1. [Basic Patterns](#basic-patterns)
2. [Advanced Patterns](#advanced-patterns)
3. [Task Chaining](#task-chaining)
4. [Memory Coordination](#memory-coordination)
5. [Error Handling](#error-handling)
6. [Real-World Examples](#real-world-examples)

---

## Basic Patterns

### Pattern 1: Solo Agent (Single Specialist)

**Use Case:** Simple, focused tasks requiring one specialty

**Flow:**
```
User Request
    ↓
Classifier determines task type
    ↓
Route to single specialist agent
    ↓
Agent executes
    ↓
Return result
```

**Example:** User asks "How do I fix this JavaScript error?"
- Classifier recognizes: code + debug keywords
- Routes to: Coder
- Coder debugs and returns fix

**Shared Memory Updates:**
- Task registry: log task with type=code
- Results cache: store solution for future reference

**Cost:** Low (~$0.05-0.30)
**Latency:** <5 seconds
**Success Rate:** >95%

---

### Pattern 2: Parallel Specialists

**Use Case:** Task requires simultaneous work from multiple specialists (no dependencies)

**Flow:**
```
User Request (Complex)
    ↓
Coordinator decomposes into subtasks
    ↓
Task A → Agent 1  ┐
Task B → Agent 2  ├─→ Execute in parallel
Task C → Agent 3  ┘
    ↓
Coordinator synthesizes results
    ↓
Return integrated output
```

**Example:** "Create a tech whitepaper on AI cost optimization"

**Decomposition:**
- Task A: Research AI pricing trends (→ Researcher)
- Task B: Analyze cost data (→ Analyst)
- Task C: Write whitepaper (→ Writer) — waits for A & B

**Shared Memory Updates:**
1. Coordinator logs master task ID
2. Each agent logs subtask to task-registry.json with `depends_on: []` or `depends_on: ["taskA", "taskB"]`
3. As each completes, agent writes to results-cache.json
4. Coordinator monitors and triggers dependent tasks
5. Final synthesis logged with all contributors

**Cost:** Medium (~$0.40-0.60)
**Latency:** <15 seconds (parallel execution)
**Success Rate:** >92%

---

### Pattern 3: Sequential Chain

**Use Case:** Tasks that must execute one after another (strict dependencies)

**Flow:**
```
Task 1: Researcher gathers info
    ↓ (output → input)
Task 2: Analyst identifies patterns
    ↓ (output → input)
Task 3: Writer creates summary
    ↓
Return final document
```

**Example:** "Analyze competitor pricing and write a brief"

**Execution:**
1. Researcher gathers competitor data → stores in results-cache.json
2. Analyst reads cached data, performs analysis → updates results-cache.json
3. Writer reads both results, writes brief → final output

**Shared Memory Updates:**
```json
{
  "taskId": "brief-analysis-2026",
  "chain": [
    {
      "step": 1,
      "agent": "researcher",
      "task": "Gather competitor data",
      "status": "completed",
      "output": "competitor-data.json",
      "timestamp": 1707813720000
    },
    {
      "step": 2,
      "agent": "analyst",
      "task": "Analyze patterns",
      "status": "in-progress",
      "dependencies": [1],
      "input": "competitor-data.json"
    },
    {
      "step": 3,
      "agent": "writer",
      "task": "Write summary",
      "status": "queued",
      "dependencies": [1, 2]
    }
  ]
}
```

**Cost:** Medium (~$0.35-0.50)
**Latency:** <30 seconds (sequential)
**Success Rate:** >90%

---

## Advanced Patterns

### Pattern 4: Map-Reduce (Large Data)

**Use Case:** Distribute analysis across dataset, aggregate results

**Flow:**
```
Large Dataset
    ↓
Split into chunks → Analyst-Sub-1, Analyst-Sub-2, Analyst-Sub-3
    ↓ (parallel analysis)
Results come back
    ↓
Coordinator reduces (aggregates)
    ↓
Final metrics
```

**Example:** "Analyze 10,000 customer records for trends"

**Execution:**
1. Coordinator splits data into 3 chunks
2. Routes to analyst-sub-1, analyst-sub-2, analyst-sub-3 in parallel
3. Each analyzes its chunk independently
4. Coordinator aggregates into summary metrics

**Shared Memory:**
```json
{
  "mapReduceJob": "trend-analysis-2026",
  "status": "in-progress",
  "mapTasks": [
    { "id": "chunk-1", "agent": "analyst-sub-1", "status": "running" },
    { "id": "chunk-2", "agent": "analyst-sub-2", "status": "running" },
    { "id": "chunk-3", "agent": "analyst-sub-3", "status": "queued" }
  ],
  "reduceTasks": [
    { "id": "reduce-1", "agent": "coordinator", "status": "queued", "input": ["chunk-1", "chunk-2", "chunk-3"] }
  ]
}
```

**Cost:** Medium (~$0.25)
**Latency:** <20 seconds
**Success Rate:** >94%

---

### Pattern 5: Hierarchical Orchestration

**Use Case:** Complex nested workflows with sub-delegations

**Flow:**
```
Main Coordinator (Level 1)
    ├─→ Researcher Branch
    │   ├─ Researcher-Sub-1 (web search)
    │   └─ Researcher-Sub-2 (document analysis)
    ├─→ Code Branch
    │   ├─ Coder-Sub-1 (frontend)
    │   └─ Coder-Sub-2 (backend)
    └─→ Synthesis
        └─ Writer (combines all)
```

**Example:** "Design and prototype a new feature from scratch"

**Execution:**
1. Main Coordinator receives request
2. Delegates research to Researcher → spawns 2 sub-researchers
3. Delegates code to Coder → spawns frontend + backend specialists
4. Researcher synthesizes requirements
5. Coder synthesizes architecture
6. Writer creates final design doc

**Coordination Protocol:**
```json
{
  "orchestrationLevel": 1,
  "mainTask": "feature-design",
  "delegations": [
    {
      "agentId": "researcher-primary",
      "role": "branch-lead",
      "subDelegations": [
        { "agentId": "researcher-sub-1", "task": "market-research" },
        { "agentId": "researcher-sub-2", "task": "competitive-analysis" }
      ]
    },
    {
      "agentId": "coder-primary",
      "role": "branch-lead",
      "subDelegations": [
        { "agentId": "coder-sub-1", "task": "ui-design" },
        { "agentId": "coder-sub-2", "task": "api-design" }
      ]
    }
  ],
  "synchronization": "barrier",
  "barrierAfterBranches": true
}
```

**Cost:** High (~$0.70)
**Latency:** <25 seconds
**Success Rate:** >93%

---

## Task Chaining

### Chain Types

**Type 1: Linear Chain**
```
A → B → C → D
```
Used when each task strictly depends on previous output.

**Type 2: Fan-Out**
```
    B
   / \
  A   C
   \ /
    D
```
One task output feeds multiple parallel tasks.

**Type 3: Fan-In**
```
  A
 / \
B   C
 \ /
  D
```
Multiple tasks feed into one aggregation task.

**Type 4: Diamond**
```
    A
   / \
  B   C
   \ /
    D
   / \
  E   F
```
Complex dependency graph.

---

### Chain Definition (JSON)

```json
{
  "chainId": "research-analysis-write-2026",
  "chainType": "linear",
  "tasks": [
    {
      "taskId": "t1",
      "agent": "researcher-primary",
      "instruction": "Research the latest AI pricing models",
      "estimatedTime": 5000,
      "dependencies": [],
      "outputKey": "pricing-research"
    },
    {
      "taskId": "t2",
      "agent": "analyst-primary",
      "instruction": "Analyze cost trends from research",
      "estimatedTime": 3000,
      "dependencies": ["t1"],
      "inputKeys": ["pricing-research"],
      "outputKey": "cost-analysis"
    },
    {
      "taskId": "t3",
      "agent": "writer-primary",
      "instruction": "Write executive summary",
      "estimatedTime": 4000,
      "dependencies": ["t1", "t2"],
      "inputKeys": ["pricing-research", "cost-analysis"],
      "outputKey": "summary"
    }
  ],
  "conditions": [
    {
      "task": "t2",
      "condition": "if t1.quality_score > 0.85",
      "onFalse": "reroute to analyst-sub-1"
    }
  ]
}
```

---

## Memory Coordination

### Shared Memory Structure

```
workspace/memory/shared/
├── task-registry.json          # All active/completed tasks
├── results-cache.json          # Task outputs for reuse
├── load-state.json             # Current agent load
├── coordination.json           # Inter-agent messages
└── metrics.json                # Performance data
```

### Task Registry Entry

```json
{
  "taskId": "research-2026-001",
  "type": "research",
  "status": "in-progress",
  "createdAt": 1707813720000,
  "assignedAgent": "researcher-primary",
  "priority": 75,
  "dependsOn": [],
  "estimatedCost": 0.08,
  "actualCost": 0.04,
  "progress": 60,
  "expectedCompletionTime": 1707813725000,
  "tags": ["market-research", "pricing", "cost-analysis"]
}
```

### Results Cache Entry

```json
{
  "cacheKey": "research-2026-001",
  "taskId": "research-2026-001",
  "agent": "researcher-primary",
  "result": {
    "sources": ["api.example.com", "docs.competitor.com"],
    "findings": [
      "AI model pricing down 15% YoY",
      "Haiku models preferred for cost efficiency"
    ],
    "quality": 0.92
  },
  "createdAt": 1707813724000,
  "expiresAt": 1707900124000,
  "accessCount": 2,
  "reusable": true
}
```

### Coordination Message

```json
{
  "messageId": "coord-msg-2026-001",
  "from": "coordinator-primary",
  "to": ["researcher-primary", "analyst-primary"],
  "type": "task-assignment",
  "timestamp": 1707813720000,
  "payload": {
    "taskId": "master-2026",
    "yourTask": "Gather competitive data",
    "waitFor": [],
    "notifyWhen": "completed",
    "inputFiles": [],
    "outputFile": "competitive-research-2026.json"
  },
  "priority": "high",
  "deadline": 1707813740000
}
```

---

## Error Handling

### Error Recovery Chain

```
Task Execution
    ↓
Validation
    ├─ Success → Return result
    │
    ├─ Retriable Error (e.g., timeout)
    │   → Retry with same agent (backoff)
    │   → On failure → Try fallback agent
    │
    └─ Non-Retriable Error (e.g., bad input)
        → Escalate to Coordinator
        → Coordinator analyzes
        → Coordinator chooses strategy:
            ├─ Modify task + retry
            ├─ Route to different agent
            └─ Return error to user
```

### Error Escalation

```json
{
  "errorId": "err-2026-001",
  "taskId": "research-2026-001",
  "originalAgent": "researcher-primary",
  "errorType": "timeout",
  "errorMessage": "Web search exceeded 10s timeout",
  "timestamp": 1707813735000,
  "retriable": true,
  "suggestedAction": "retry with narrower search",
  "escalatedTo": "coordinator-primary"
}
```

### Coordinator Recovery Decision

```json
{
  "recoveryDecision": {
    "errorId": "err-2026-001",
    "action": "fallback",
    "fallbackAgent": "researcher-sub-1",
    "modification": "reduce search scope",
    "newTask": "Search only official docs",
    "maxRetries": 2
  }
}
```

---

## Real-World Examples

### Example 1: Blog Post with Data (Parallel)

**Request:**
> "Write a blog post about AI cost optimization with the latest data and trends"

**Orchestration:**

```
COORDINATOR receives request
    ↓ Decompose into 3 parallel tasks

RESEARCHER          ANALYST           WRITER (waits)
├─ Find pricing     ├─ Analyze trends
├─ Gather models    └─ Calculate ROI
└─ Collect quotes

    ↓
Researcher completes: stores findings in cache
    ↓
Analyst completes: stores analysis in cache
    ↓
Writer receives both: writes blog post
    ↓
COORDINATOR validates quality and returns
```

**Shared Memory Ops:**
1. Create task-registry entry with 3 subtasks
2. Researcher writes to cache: research-2026-001.json
3. Analyst writes to cache: analysis-2026-001.json
4. Writer reads both, writes output
5. Coordinator logs: blog-post-2026-001.json (final result)

**Estimated Cost:** $0.35 (all haiku + one sonnet for writer)
**Estimated Time:** 12 seconds

---

### Example 2: Feature Development (Sequential Chain)

**Request:**
> "Design and develop a user authentication feature"

**Orchestration:**

```
COORDINATOR decomposes into chain:

Step 1: RESEARCHER
├─ Research authentication best practices
├─ Gather security requirements
└─ Review competitor implementations
   Output: requirements.json

Step 2: ANALYST (waits for Step 1)
├─ Analyze requirements
├─ Identify patterns
└─ Create spec document
   Output: spec.json

Step 3: CODER (waits for Steps 1-2)
├─ Implement authentication
├─ Write unit tests
└─ Create documentation
   Output: auth-feature.zip

Step 4: WRITER (final documentation)
├─ Polish API docs
├─ Create user guide
└─ Release notes
   Output: docs.md
```

**Shared Memory Ops:**
1. Create chain definition in coordination.json
2. Step-by-step execution with dependencies
3. Each step updates task-registry with status
4. Output of each step feeds into results-cache
5. Next step reads from cache and continues
6. Final synthesis creates deliverable

**Estimated Cost:** $0.85 (research + analysis + code + docs)
**Estimated Time:** 28 seconds

---

### Example 3: Data Analysis with Map-Reduce

**Request:**
> "Analyze 100K customer records for spending patterns and provide insights"

**Orchestration:**

```
COORDINATOR receives request
    ↓ Identify: Large data processing task
    ↓ Strategy: Map-Reduce pattern

MAP PHASE (parallel):
├─ Analyst-Sub-1: Process records 1-33K
├─ Analyst-Sub-2: Process records 33-66K
└─ Analyst-Sub-3: Process records 66-100K
   (Each produces: chunk-analysis.json)

    ↓ Wait for all MAP tasks to complete

REDUCE PHASE (sequential):
└─ Coordinator aggregates:
   ├─ Merge insights from all chunks
   ├─ Calculate overall metrics
   └─ Identify cross-cutting patterns
   Output: final-insights.json

    ↓
WRITER creates summary report
```

**Shared Memory Ops:**
1. Create map-reduce job in coordination.json
2. Map tasks store results independently
3. Coordinator monitors completion
4. Reduce phase reads all results from cache
5. Final summary written to results-cache

**Estimated Cost:** $0.15 (3x haiku analysts + coordinator)
**Estimated Time:** 18 seconds

---

## Best Practices for Coordination

1. **Always log to task-registry:** Every task start/completion
2. **Use results-cache aggressively:** Avoid redundant work
3. **Define clear dependencies:** Prevent circular dependencies
4. **Monitor load dynamically:** Scale to sub-agents when needed
5. **Cache intermediate results:** Enable future reuse
6. **Validate at each step:** Catch errors early
7. **Use appropriate agents:** Haiku for cost, Sonnet for quality
8. **Batch small tasks:** Reduce coordination overhead
9. **Implement timeouts:** Prevent hanging chains
10. **Log everything:** For debugging and learning

---

**Version:** 1.0 | **Date:** 2026-02-13 | **For:** TARS Multi-Agent System
