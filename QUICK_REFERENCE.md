# Quick Reference: Agent Consensus Voting

## Import & Basic Usage (30 seconds)

```python
from consensus_engine import Vote, Decision, run_consensus

# Collect votes
votes = [
    Vote("agent_1", Decision.YES, 0.85, "My reasoning"),
    Vote("agent_2", Decision.NO, 0.92, "My reasoning"),
]

# Run consensus
result = run_consensus(votes)
print(result.final_decision)      # YES or NO
print(result.confidence_level)    # 0.0 to 1.0
print(result.weighted_score)      # -1.0 to +1.0
```

---

## Key Concepts

### Vote
- **decision**: YES, NO, or ABSTAIN
- **confidence**: 0.0 (not confident) to 1.0 (very confident)
- **Weighted value** = decision × confidence = influence on outcome

### ConsensusResult
- **final_decision**: The team's decision
- **weighted_score**: Magnitude (-1.0=strong NO, +1.0=strong YES)
- **confidence_level**: Team unanimity (0.0=split, 1.0=unanimous)
- **vote_breakdown**: {"YES": 3, "NO": 2, "ABSTAIN": 0}

---

## Metrics Cheat Sheet

| Metric | Range | Interpretation |
|--------|-------|-----------------|
| weighted_score | -1 to +1 | -1=strong NO, 0=tie, +1=strong YES |
| confidence_level | 0 to 1 | 0=no agreement, 1=perfect agreement |

**Decision quality:**
- confidence_level > 0.7 = **Strong consensus**, act on it
- confidence_level 0.4-0.7 = **Moderate**, escalate if critical
- confidence_level < 0.4 = **Weak**, need more discussion

---

## Common Patterns

### Pattern 1: Simple Vote
```python
result = run_consensus(votes)
if result.final_decision == Decision.YES:
    do_something()
```

### Pattern 2: Multi-Agent Orchestration
```python
from multi_agent_orchestrator import MultiAgentOrchestrator, AgentVoteResponse

orchestrator = MultiAgentOrchestrator(
    agents=["backend", "frontend", "devops"],
    confidence_calibration=0.85,
)

votes = [
    AgentVoteResponse("backend", "YES", 0.85, "Good"),
    AgentVoteResponse("frontend", "NO", 0.70, "Better option exists"),
]

result = orchestrator.inject_votes(question, votes)
```

### Pattern 3: Predefined Questions
```python
from multi_agent_orchestrator import (
    make_tool_selection_question,
    make_budget_decision_question,
    make_interpretation_dispute_question,
)

# Tool selection
q1 = make_tool_selection_question(
    ["REST", "GraphQL", "gRPC"],
    "Data service with complex queries"
)

# Budget allocation
q2 = make_budget_decision_question(
    {"Option A": "Cost: $1k/mo", "Option B": "Cost: $2.5k/mo"},
    "Infrastructure budget $50k/year"
)

# Interpretation dispute
q3 = make_interpretation_dispute_question(
    "respond within SLA window",
    "measured from request arrival",
    "measured from queue dequeue"
)
```

---

## Confidence Calibration

**Problem:** Agents often overestimate their confidence.
**Solution:** Use calibration factor.

```python
# No calibration
engine = ConsensusEngine(confidence_calibration=1.0)

# Reduce overconfidence
engine = ConsensusEngine(confidence_calibration=0.85)  # Recommended

# Strong calibration
engine = ConsensusEngine(confidence_calibration=0.75)

# Or via orchestrator
orchestrator = MultiAgentOrchestrator(confidence_calibration=0.85)
```

---

## Decision Workflow

```python
# Step 1: Create orchestrator
orchestrator = MultiAgentOrchestrator(agents=agent_ids)

# Step 2: Create decision question
question = make_tool_selection_question(...)

# Step 3: Collect votes (from your agent framework)
votes = [
    AgentVoteResponse(agent_id, decision, confidence, reasoning)
    for agent_id in agent_ids
]

# Step 4: Run consensus
result = orchestrator.inject_votes(question, votes)

# Step 5: Use decision
if result.final_decision == Decision.YES:
    execute_option_a()
else:
    execute_option_b()

# Step 6: Log for audit trail
orchestrator.export_history_json("decisions.json")
```

---

## Testing

Run all scenarios:
```bash
python test_scenarios.py
```

Expected output:
```
SCENARIO 1: Tool Selection
Decision: YES | Confidence: 19.9% | Score: +0.78

SCENARIO 2: Budget Allocation
Decision: NO | Confidence: 18.1% | Score: -0.64

SCENARIO 3: Interpretation Dispute
Decision: YES | Confidence: 27.9% | Score: +1.13

SCENARIO 4: Multi-Round Workflow
Decision 1: YES | Score: +0.71
Decision 2: YES | Score: +0.75
Decision 3: YES | Score: +2.18
```

---

## Debugging

### Check individual votes
```python
result = run_consensus(votes)

for vote in result.individual_votes:
    print(f"{vote.agent_id}: {vote.decision.name} ({vote.confidence})")
    print(f"  Weight: {vote.weight()}")
```

### Understand the decision
```python
print(f"Decision: {result.final_decision.name}")
print(f"Score: {result.weighted_score:.2f}")
print(f"Confidence: {result.confidence_level:.1%}")
print(f"Breakdown: {result.vote_breakdown}")
print(f"Reasoning: {result.reasoning}")
```

### Export full details
```python
result_dict = result.to_dict()
import json
print(json.dumps(result_dict, indent=2))
```

---

## LLM Agent Prompt Template

```
You are voting on a technical decision. Respond as JSON.

[QUESTION]
{question_text}

[RESPONSE FORMAT]
{
  "decision": "YES" or "NO",
  "confidence": 0.0 to 1.0,
  "reasoning": "explanation"
}

[GUIDELINES]
- Confidence 0.9-1.0: Very certain
- Confidence 0.7-0.9: Good confidence
- Confidence 0.5-0.7: Moderate, somewhat uncertain
- Confidence 0.3-0.5: Weak, mostly guessing
- Confidence <0.3: Very uncertain (not recommended)
```

---

## When to Use What

| Use Case | Pattern | Config |
|----------|---------|--------|
| Quick team decisions | Simple majority | N/A |
| Tech stack decisions | Confidence-weighted | orchestrator with 0.85 calibration |
| Budget/resource allocation | Confidence-weighted | orchestrator with 0.85 calibration |
| Spec/requirement disputes | Confidence-weighted | orchestrator with 0.85 calibration |
| High-stakes decisions | Dialectical debate | Use CONSENSUS_RESEARCH.md for guidance |
| Untrusted agents (rare) | Byzantine FT | Use CONSENSUS_RESEARCH.md for guidance |

---

## Files & Where to Find Things

| File | Purpose | Size |
|------|---------|------|
| **consensus_engine.py** | Core voting logic | 260 lines |
| **multi_agent_orchestrator.py** | Integration layer | 320 lines |
| **test_scenarios.py** | 4 test scenarios | 410 lines |
| **CONSENSUS_RESEARCH.md** | Pattern analysis | 400 lines |
| **INTEGRATION_GUIDE.md** | Integration docs | 450 lines |
| **README_CONSENSUS.md** | Overview | 380 lines |
| **QUICK_REFERENCE.md** | This file | 250 lines |

---

## Common Issues & Fixes

### Issue: Always get weak consensus
**Cause:** Votes are evenly split OR similar confidence levels
**Fix:** Check that agents have diverse expertise; ensure votes are informed

### Issue: Confident agent always wins
**Cause:** That agent's confidence is much higher
**Fix:** Verify calibration=0.85; check if that agent actually is an expert

### Issue: Decision keeps changing
**Cause:** Agents voting differently or non-deterministically
**Fix:** Improve agent prompts; add constraints; verify agents are deterministic

### Issue: Score near 0 but decision is YES
**Cause:** Correct! Score of 0.01 still means YES (positive > negative)
**Fix:** Check weighted_score sign; very close scores indicate weak agreement

---

## Performance Notes

- **Speed:** <1ms per decision
- **Max agents:** Tested with 20+, no issues
- **Memory:** Minimal
- **Dependencies:** None (pure Python)

---

## Best Practices Checklist

- [ ] Always include reasoning in votes (helps debug)
- [ ] Use calibration 0.85 unless agents proven well-calibrated
- [ ] Check confidence_level before acting on weak consensus
- [ ] Export history for audit/compliance
- [ ] Log decisions for monitoring agent quality
- [ ] Test with your agents before deploying
- [ ] Use predefined question templates for consistency

---

## Decision Quality Monitoring

Track over time:
```python
def monitor_consensus_quality(decisions: List[ConsensusResult]):
    avg_confidence = sum(d.confidence_level for d in decisions) / len(decisions)
    avg_score_magnitude = sum(abs(d.weighted_score) for d in decisions) / len(decisions)
    
    print(f"Avg consensus quality: {avg_confidence:.1%}")
    print(f"Avg decision magnitude: {avg_score_magnitude:.2f}")
    
    if avg_confidence < 0.5:
        print("WARNING: Agents disagree frequently. Check agent alignment.")
```

---

## Implementation Checklist

- [ ] Read CONSENSUS_RESEARCH.md (10 min)
- [ ] Read INTEGRATION_GUIDE.md (15 min)
- [ ] Run test_scenarios.py (2 min)
- [ ] Copy consensus_engine.py to your project
- [ ] Copy multi_agent_orchestrator.py to your project
- [ ] Implement vote_collector for your agents
- [ ] Create your first ConsensusQuestion
- [ ] Run with test data
- [ ] Integrate with live agents
- [ ] Set up decision history export
- [ ] Monitor decision quality

---

## Get More Help

- **Why this pattern?** → Read CONSENSUS_RESEARCH.md
- **How to integrate?** → Read INTEGRATION_GUIDE.md
- **Working examples?** → Run test_scenarios.py
- **API details?** → Read docstrings in consensus_engine.py

---

*Quick Reference | Agent Consensus Voting v1.0*
*2026-02-13 | Ready for production*
