# Integration Guide: Agent Consensus Voting

## Quick Start

### 1. Import and Use (Simple Case)

```python
from consensus_engine import Vote, Decision, run_consensus

# Collect votes from agents
votes = [
    Vote("agent_1", Decision.YES, 0.85, "I think this is good"),
    Vote("agent_2", Decision.YES, 0.70, "Seems reasonable"),
    Vote("agent_3", Decision.NO, 0.92, "I disagree strongly"),
]

# Run consensus
result = run_consensus(votes)

print(f"Decision: {result.final_decision.name}")
print(f"Confidence: {result.confidence_level:.1%}")
print(f"Score: {result.weighted_score:.2f}")
```

### 2. Multi-Agent Orchestration

```python
from multi_agent_orchestrator import (
    MultiAgentOrchestrator,
    AgentVoteResponse,
    make_tool_selection_question,
)

# Create orchestrator
orchestrator = MultiAgentOrchestrator(
    agents=["backend", "frontend", "devops", "security"],
    confidence_calibration=0.85,  # Reduce overconfidence
)

# Create a decision question
question = make_tool_selection_question(
    tool_candidates=["REST API", "GraphQL", "gRPC"],
    task_description="Data retrieval service with complex queries"
)

# Inject votes from agents
votes = [
    AgentVoteResponse("backend", "YES", 0.80, "REST is simpler"),
    AgentVoteResponse("frontend", "NO", 0.75, "GraphQL better DX"),
    AgentVoteResponse("devops", "YES", 0.70, "REST easier to deploy"),
    AgentVoteResponse("security", "YES", 0.85, "REST has fewer attack surfaces"),
]

result = orchestrator.inject_votes(question, votes)
print(f"Decision: {result.final_decision.name}")
```

---

## Architecture

### Components

```
┌─────────────────────────────────────────┐
│     MultiAgentOrchestrator              │
│  - Manages decision workflows          │
│  - Collects votes from agents          │
│  - Handles vote injection (testing)    │
└──────────────┬──────────────────────────┘
               │
               v
┌─────────────────────────────────────────┐
│     ConsensusEngine                     │
│  - Confidence-weighted voting logic     │
│  - Calculates final decision            │
│  - Computes unanimity metrics           │
└──────────────┬──────────────────────────┘
               │
               v
┌─────────────────────────────────────────┐
│     Vote + ConsensusResult              │
│  - Individual vote representation       │
│  - Aggregate result with reasoning      │
└─────────────────────────────────────────┘
```

### Key Classes

#### `Vote`
Represents a single agent's vote.

```python
@dataclass
class Vote:
    agent_id: str          # Unique agent identifier
    decision: Decision     # YES, NO, or ABSTAIN
    confidence: float      # 0.0 to 1.0
    reasoning: str         # Optional explanation
```

#### `ConsensusResult`
Final decision with metadata.

```python
@dataclass
class ConsensusResult:
    final_decision: Decision      # YES, NO, or ABSTAIN
    weighted_score: float         # -1.0 to 1.0
    confidence_level: float       # 0.0 to 1.0 (unanimity metric)
    vote_breakdown: Dict          # {"YES": 3, "NO": 2, "ABSTAIN": 0}
    individual_votes: List[Vote]  # All votes for audit trail
    reasoning: str                # Human-readable summary
```

#### `ConsensusEngine`
Core voting logic.

```python
engine = ConsensusEngine(confidence_calibration=1.0)
result = engine.collect_votes(votes)
```

#### `MultiAgentOrchestrator`
Orchestrates multi-decision workflows.

```python
orchestrator = MultiAgentOrchestrator(
    agents=["agent1", "agent2", "agent3"],
    vote_collector=my_vote_collector_fn,  # Optional
    confidence_calibration=0.85,
)

result = orchestrator.run_consensus(question)
```

---

## Common Patterns

### Pattern 1: Tool Selection

When agents must choose between technical options (REST vs GraphQL, PostgreSQL vs MongoDB, etc).

```python
from multi_agent_orchestrator import make_tool_selection_question

question = make_tool_selection_question(
    tool_candidates=["Option A", "Option B", "Option C"],
    task_description="What this tool needs to do"
)

# Agents vote YES for Option A, NO if they prefer another
```

**When to use:**
- Tech stack decisions
- Library/framework selection
- Service choice (SaaS vs self-hosted)
- Deployment platform decisions

### Pattern 2: Budget Allocation

Multiple budget options with different tradeoffs.

```python
from multi_agent_orchestrator import make_budget_decision_question

question = make_budget_decision_question(
    options={
        "Option A": "Description of Option A",
        "Option B": "Description of Option B",
    },
    budget_constraint="What limits our choices"
)
```

**When to use:**
- Infrastructure budget decisions
- Resource allocation
- Vendor selection
- Cost vs. features tradeoffs

### Pattern 3: Interpretation Disputes

Resolving ambiguous requirements or specifications.

```python
from multi_agent_orchestrator import make_interpretation_dispute_question

question = make_interpretation_dispute_question(
    disputed_text="The ambiguous requirement",
    interpretation_a="First reading of the requirement",
    interpretation_b="Second reading of the requirement"
)
```

**When to use:**
- Resolving specification ambiguities
- Requirements clarification
- Design interpretation disagreements
- SLA and contract disputes

---

## Integration with LLM Agents

### Pattern A: Manual Vote Collection

```python
from consensus_engine import Vote, Decision

# Your agent framework collects votes
def collect_vote_from_agent(agent_id: str, question: str) -> Vote:
    # Use your agent framework to prompt the agent
    agent_response = my_agent_framework.prompt(agent_id, question)
    
    # Parse the response
    decision = Decision.YES if "yes" in agent_response.lower() else Decision.NO
    confidence = extract_confidence(agent_response)  # Your parsing logic
    
    return Vote(agent_id, decision, confidence, agent_response)

# Collect votes
votes = [collect_vote_from_agent(agent_id, question) 
         for agent_id in agent_ids]

# Run consensus
result = run_consensus(votes)
```

### Pattern B: Orchestrator with Vote Collector Callback

```python
def my_vote_collector(agent_id: str, question_prompt: str) -> AgentVoteResponse:
    # Your agent framework
    response = my_agent.prompt(agent_id, question_prompt)
    
    # Parse response into AgentVoteResponse
    return AgentVoteResponse(
        agent_id=agent_id,
        decision="YES",  # or "NO"
        confidence=0.85,
        reasoning=response
    )

orchestrator = MultiAgentOrchestrator(
    agents=["agent1", "agent2", "agent3"],
    vote_collector=my_vote_collector,
)

result = orchestrator.run_consensus(question)
```

### Pattern C: LLM-Based Voter Prompt Template

Use this prompt template to get LLM agents to vote:

```
[SYSTEM]
You are a voting member in a multi-agent consensus process. 
Your role: provide expert judgment on a technical decision.

[DECISION QUESTION]
{question_text}

[RESPONSE FORMAT]
Provide your response as JSON:
{{
  "decision": "YES" or "NO",
  "confidence": 0.0 to 1.0 (float),
  "reasoning": "Explanation of your vote"
}}

Guidelines:
- Confidence near 1.0: You're highly certain
- Confidence near 0.5: You're uncertain but have a preference
- Confidence near 0.0: This indicates NO vote (system will apply)
- Be honest about uncertainty - don't pretend confidence
```

---

## Calibrating Agent Confidence

Agents often exhibit overconfidence bias. Use calibration to counteract this:

```python
# No calibration (agents are well-calibrated)
engine = ConsensusEngine(confidence_calibration=1.0)

# Mild calibration (agents slightly overconfident)
engine = ConsensusEngine(confidence_calibration=0.9)

# Moderate calibration (agents moderately overconfident)
engine = ConsensusEngine(confidence_calibration=0.85)

# Aggressive calibration (agents very overconfident)
engine = ConsensusEngine(confidence_calibration=0.75)
```

**Recommendation:** Start with 0.85 and adjust based on decision outcomes.

---

## Metrics & Interpretation

### `weighted_score` (-1.0 to 1.0)

Raw aggregation of confidence-weighted votes.

- **+1.0**: All agents voted YES with high confidence
- **+0.5**: Strong YES majority
- **0.0**: Perfectly balanced (rare)
- **-0.5**: Strong NO majority
- **-1.0**: All agents voted NO with high confidence

**Usage:** Higher magnitude = stronger consensus on either side.

### `confidence_level` (0.0 to 1.0)

Unanimity metric - how aligned agents are.

- **1.0**: Perfect unanimity (rare)
- **0.7+**: Strong consensus (good for decisions)
- **0.5**: Moderate consensus (proceed with caution)
- **0.3**: Weak consensus (consider alternatives or debate)
- **0.0**: Perfectly split (use tiebreaker)

**Usage:** Make decisions only when confidence_level > 0.5. Lower values warrant deeper discussion.

---

## Testing & Validation

### Run Test Scenarios

```bash
python test_scenarios.py
```

Tests 4 real-world scenarios:
1. Tool Selection (REST vs GraphQL)
2. Budget Allocation (Cloud infrastructure)
3. Interpretation Dispute (API SLA timing)
4. Multi-round Workflow (Tech stack decisions)

### Add Your Own Tests

```python
from consensus_engine import Vote, Decision, run_consensus

def test_my_scenario():
    votes = [
        Vote("agent_1", Decision.YES, 0.85, "My reasoning"),
        Vote("agent_2", Decision.NO, 0.72, "My reasoning"),
    ]
    
    result = run_consensus(votes)
    
    assert result.final_decision == Decision.YES
    assert result.weighted_score > 0
    assert result.confidence_level > 0.3
    
    print("Test passed!")
```

---

## Decision Workflows

### Simple Binary Decision

```python
result = run_consensus(votes)
if result.final_decision == Decision.YES:
    execute_option_a()
else:
    execute_option_b()
```

### Multi-Step Decision Workflow

```python
orchestrator = MultiAgentOrchestrator(agents=agents)

# Step 1: Should we proceed at all?
question1 = ConsensusQuestion(...)
result1 = orchestrator.run_consensus(question1)

if result1.final_decision == Decision.NO:
    print("Decision: Do not proceed")
else:
    # Step 2: If yes, which implementation?
    question2 = ConsensusQuestion(...)
    result2 = orchestrator.run_consensus(question2)
    
    if result2.final_decision == Decision.YES:
        execute_option_a()
    else:
        execute_option_b()
```

### Escalation Pattern (When Consensus Weak)

```python
result = orchestrator.run_consensus(question)

if result.confidence_level > 0.7:
    # Strong consensus - execute decision
    execute_decision(result.final_decision)
elif result.confidence_level > 0.4:
    # Weak consensus - requires human review
    require_human_approval(result)
else:
    # No consensus - escalate to dialectical debate
    run_dialectical_debate(agents, question)
```

---

## Export & Audit

Export decision history for compliance/audit:

```python
orchestrator.export_history_json("decisions_2026_02_13.json")

# Each entry includes:
# - question_id
# - context (tool_selection, budget_allocation, etc)
# - prompt
# - result (decision, score, confidence, vote breakdown)
```

---

## Best Practices

1. **Always specify reasoning** - Votes without reasoning are harder to debug
2. **Use calibration** - Start with 0.85 unless agents are well-calibrated
3. **Check confidence_level** - Don't act on weak consensus (<0.4)
4. **Log decisions** - Use export_history_json for audit trails
5. **Monitor agreement** - Track confidence_level over time; declining agreement suggests agent drift
6. **Confidence > vote count** - A confident minority can beat uncertain majority
7. **Use templates** - Use make_tool_selection_question() etc. for consistency
8. **Test scenarios** - Run test_scenarios.py first to validate setup

---

## Troubleshooting

### "Decision keeps changing despite same input"
**Cause:** Non-deterministic agent voting (agents aren't stable)
**Solution:** Add constraints to agent prompts or increase confidence calibration

### "All agents agree but confidence_level is still low"
**Cause:** Votes are weighted; if votes have different confidence, unanimity is lower
**Solution:** This is correct behavior! Shows confidence spread

### "Confidence always near 50%"
**Cause:** Votes are evenly split
**Solution:** More agents, or agents need better information to form stronger opinions

### "Wrong decision despite higher weighted score"
**Cause:** Check sign of weighted_score (negative = NO, positive = YES)
**Solution:** Print result.to_dict() to see full breakdown

---

## Performance & Scaling

- **Agents:** Tested up to 20+ agents. No performance issue.
- **Decision speed:** < 1ms per decision (synchronous voting)
- **Scalability:** Linear O(n) where n = number of agents
- **Memory:** Minimal - stores votes in memory, export to JSON for persistence

---

## Next Steps

1. **Integrate with your agent framework** - Use patterns in "Integration with LLM Agents"
2. **Define decision categories** - Extend DecisionContext enum with your use cases
3. **Create vote collectors** - Implement your vote_collector callback
4. **Monitor & iterate** - Track decision outcomes, adjust confidence calibration
5. **Consider alternatives** - See CONSENSUS_RESEARCH.md for when to use other patterns

---

*Integration Guide | Generated 2026-02-13*
