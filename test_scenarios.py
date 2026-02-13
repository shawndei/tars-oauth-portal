"""
Test Scenarios - Consensus Voting in Real-World Situations

Demonstrates consensus voting on:
1. Tool selection (REST API vs GraphQL)
2. Budget allocation (cloud infrastructure)
3. Interpretation disputes (ambiguous requirements)
"""

import json
from consensus_engine import Vote, Decision, run_consensus
from multi_agent_orchestrator import (
    MultiAgentOrchestrator,
    ConsensusQuestion,
    DecisionContext,
    AgentVoteResponse,
    make_tool_selection_question,
    make_budget_decision_question,
    make_interpretation_dispute_question,
)


# ============================================================================
# Scenario 1: Tool Selection - REST API vs GraphQL
# ============================================================================

def scenario_tool_selection():
    """
    Scenario: Team of agents must decide between REST API and GraphQL
    for a data service that needs:
    - High query flexibility (favors GraphQL)
    - Simple CRUD operations (favors REST)
    - Performance is critical (REST has edge)
    """
    print("\n" + "="*70)
    print("SCENARIO 1: Tool Selection - REST API vs GraphQL")
    print("="*70)

    # Mock agent votes
    votes = [
        Vote(
            agent_id="backend_expert",
            decision=Decision.YES,  # REST preferred
            confidence=0.85,
            reasoning="REST is simpler for CRUD, good caching story",
        ),
        Vote(
            agent_id="data_specialist",
            decision=Decision.NO,  # GraphQL preferred
            confidence=0.92,
            reasoning="GraphQL flexibility worth complexity for data flexibility",
        ),
        Vote(
            agent_id="performance_engineer",
            decision=Decision.YES,  # REST preferred
            confidence=0.78,
            reasoning="REST is faster at scale, fewer parsing concerns",
        ),
        Vote(
            agent_id="frontend_dev",
            decision=Decision.NO,  # GraphQL preferred
            confidence=0.65,
            reasoning="GraphQL better DX for frontend, less over-fetching",
        ),
        Vote(
            agent_id="infrastructure",
            decision=Decision.YES,  # REST preferred
            confidence=0.72,
            reasoning="REST easier to cache, monitor, and scale",
        ),
    ]

    result = run_consensus(votes, calibration=1.0)

    print(f"\nQuestion: Should we use REST API (YES) or GraphQL (NO)?")
    print(f"\nFinal Decision: {result.final_decision.name}")
    print(f"Weighted Score: {result.weighted_score:.3f}")
    print(f"Unanimity Level: {result.confidence_level:.1%}")
    print(f"\nVote Breakdown: {result.vote_breakdown}")
    print(f"\nReasoning: {result.reasoning}")

    print("\n--- Individual Votes ---")
    for vote in result.individual_votes:
        print(
            f"  {vote.agent_id:20s} {vote.decision.name:6s} "
            f"(confidence: {vote.confidence:.2f}) - {vote.reasoning}"
        )

    return result


# ============================================================================
# Scenario 2: Budget Allocation - Cloud Infrastructure
# ============================================================================

def scenario_budget_allocation():
    """
    Scenario: Allocate $50k budget across infrastructure options:
    - Option A: Traditional servers ($1.2k/month, needs ops work)
    - Option B: Managed cloud ($2.5k/month, lower ops burden)
    - Option C: Serverless ($1.8k/month, scaling concerns)

    Team votes on Option A (traditional).
    """
    print("\n" + "="*70)
    print("SCENARIO 2: Budget Allocation - Cloud Infrastructure")
    print("="*70)

    votes = [
        Vote(
            agent_id="cfo_proxy",
            decision=Decision.YES,  # Option A (traditional, cheapest)
            confidence=0.88,
            reasoning="Cost is primary concern, saves $16k/year",
        ),
        Vote(
            agent_id="devops_lead",
            decision=Decision.NO,  # Prefers managed (Option B)
            confidence=0.91,
            reasoning="Ops burden on our team not worth 2k/month savings",
        ),
        Vote(
            agent_id="scaling_specialist",
            decision=Decision.NO,  # Prefers serverless (Option C)
            confidence=0.79,
            reasoning="Serverless handles our variable load best, $700/month cheaper",
        ),
        Vote(
            agent_id="compliance_officer",
            decision=Decision.YES,  # Traditional (better audit trail)
            confidence=0.82,
            reasoning="Traditional servers easier to audit and secure",
        ),
        Vote(
            agent_id="architect",
            decision=Decision.NO,  # Managed cloud best architecture
            confidence=0.75,
            reasoning="Managed cloud best long-term technical fit",
        ),
    ]

    result = run_consensus(votes, calibration=0.85)  # Reduce overconfidence

    print(f"\nQuestion: Should we choose Traditional Servers (YES) "
          f"or Managed/Serverless (NO)?")
    print(f"\nFinal Decision: {result.final_decision.name}")
    print(f"Weighted Score (calibrated): {result.weighted_score:.3f}")
    print(f"Unanimity Level: {result.confidence_level:.1%}")
    print(f"\nVote Breakdown: {result.vote_breakdown}")
    print(f"\nReasoning: {result.reasoning}")

    print("\n--- Individual Votes ---")
    for vote in result.individual_votes:
        print(
            f"  {vote.agent_id:20s} {vote.decision.name:6s} "
            f"(confidence: {vote.confidence:.2f}) - {vote.reasoning}"
        )

    return result


# ============================================================================
# Scenario 3: Interpretation Dispute
# ============================================================================

def scenario_interpretation_dispute():
    """
    Scenario: API requirement says "respond within SLA window".
    
    Interpretation A (YES): Respond within SLA window measured from request arrival
    Interpretation B (NO): Respond within SLA window measured from queue dequeue
    
    This affects system design (queue size affects SLA).
    """
    print("\n" + "="*70)
    print("SCENARIO 3: Interpretation Dispute - API SLA Timing")
    print("="*70)

    votes = [
        Vote(
            agent_id="requirements_analyst",
            decision=Decision.YES,  # Interpretation A
            confidence=0.88,
            reasoning="Industry standard: SLA clock starts at request arrival",
        ),
        Vote(
            agent_id="backend_engineer",
            decision=Decision.NO,  # Interpretation B
            confidence=0.81,
            reasoning="From queue dequeue makes more sense operationally",
        ),
        Vote(
            agent_id="client_liaison",
            decision=Decision.YES,  # Interpretation A
            confidence=0.92,
            reasoning="Client expects response from arrival time, that's the contract",
        ),
        Vote(
            agent_id="architect",
            decision=Decision.YES,  # Interpretation A
            confidence=0.79,
            reasoning="Standard practice, arrival-to-response is correct measure",
        ),
        Vote(
            agent_id="qa_lead",
            decision=Decision.NO,  # Interpretation B
            confidence=0.65,
            reasoning="Queue dequeue interpretation easier to test and measure",
        ),
    ]

    result = run_consensus(votes, calibration=1.0)

    print(f"\nDispute: SLA clock starts at REQUEST ARRIVAL (YES) "
          f"or QUEUE DEQUEUE (NO)?")
    print(f"\nFinal Decision: {result.final_decision.name}")
    print(f"Weighted Score: {result.weighted_score:.3f}")
    print(f"Unanimity Level: {result.confidence_level:.1%}")
    print(f"\nVote Breakdown: {result.vote_breakdown}")
    print(f"\nReasoning: {result.reasoning}")

    print("\n--- Individual Votes ---")
    for vote in result.individual_votes:
        print(
            f"  {vote.agent_id:20s} {vote.decision.name:6s} "
            f"(confidence: {vote.confidence:.2f}) - {vote.reasoning}"
        )

    return result


# ============================================================================
# Scenario 4: Multi-Round Decision Workflow (using Orchestrator)
# ============================================================================

def scenario_workflow_orchestration():
    """
    Demonstrate MultiAgentOrchestrator running multiple decisions.
    """
    print("\n" + "="*70)
    print("SCENARIO 4: Multi-Agent Workflow - Tech Stack Decision")
    print("="*70)

    agent_ids = [
        "backend_expert",
        "performance_engineer",
        "developer_experience",
        "devops_lead",
        "cost_specialist",
    ]

    # Create orchestrator (without vote_collector, we'll inject votes)
    orchestrator = MultiAgentOrchestrator(
        agents=agent_ids,
        confidence_calibration=0.85,
    )

    # Decision 1: Language choice (Python vs Go)
    print("\n--- Decision 1: Language Choice (Python vs Go) ---")
    question1 = ConsensusQuestion(
        question_id="tech_lang_01",
        context=DecisionContext.ARCHITECTURAL_CHOICE,
        prompt="Should we use Python (YES) or Go (NO) for the backend service?",
        options=["Python", "Go"],
    )

    votes1 = [
        AgentVoteResponse("backend_expert", "YES", 0.85, "Python has mature ecosystem"),
        AgentVoteResponse("performance_engineer", "NO", 0.88, "Go is faster"),
        AgentVoteResponse("developer_experience", "YES", 0.92, "Python better DX"),
        AgentVoteResponse("devops_lead", "NO", 0.75, "Go deploys easier"),
        AgentVoteResponse("cost_specialist", "YES", 0.70, "Python: more libraries = faster dev"),
    ]

    result1 = orchestrator.inject_votes(question1, votes1)
    print(f"Decision: {result1.final_decision.name} | Score: {result1.weighted_score:.2f}")

    # Decision 2: Database (PostgreSQL vs MongoDB)
    print("\n--- Decision 2: Database (PostgreSQL vs MongoDB) ---")
    question2 = ConsensusQuestion(
        question_id="tech_db_01",
        context=DecisionContext.ARCHITECTURAL_CHOICE,
        prompt="Should we use PostgreSQL (YES) or MongoDB (NO)?",
        options=["PostgreSQL", "MongoDB"],
    )

    votes2 = [
        AgentVoteResponse(
            "backend_expert", "YES", 0.90,
            "PostgreSQL: structured data, better consistency"
        ),
        AgentVoteResponse(
            "performance_engineer", "NO", 0.72,
            "MongoDB: flexible schema, better for rapid iteration"
        ),
        AgentVoteResponse(
            "developer_experience", "NO", 0.80,
            "MongoDB easier to learn, iterate"
        ),
        AgentVoteResponse(
            "devops_lead", "YES", 0.85,
            "PostgreSQL: mature, proven at scale"
        ),
        AgentVoteResponse(
            "cost_specialist", "YES", 0.65,
            "PostgreSQL licensing clearer"
        ),
    ]

    result2 = orchestrator.inject_votes(question2, votes2)
    print(f"Decision: {result2.final_decision.name} | Score: {result2.weighted_score:.2f}")

    # Decision 3: API Framework (FastAPI vs Django)
    print("\n--- Decision 3: API Framework (FastAPI vs Django) ---")
    question3 = ConsensusQuestion(
        question_id="tech_api_01",
        context=DecisionContext.ARCHITECTURAL_CHOICE,
        prompt="Should we use FastAPI (YES) or Django (NO)?",
        options=["FastAPI", "Django"],
    )

    votes3 = [
        AgentVoteResponse(
            "backend_expert", "YES", 0.88,
            "FastAPI: modern, async, type hints built-in"
        ),
        AgentVoteResponse(
            "performance_engineer", "YES", 0.92,
            "FastAPI has best performance, native async"
        ),
        AgentVoteResponse(
            "developer_experience", "YES", 0.85,
            "FastAPI modern and clean"
        ),
        AgentVoteResponse(
            "devops_lead", "NO", 0.78,
            "Django: more ops community, battle-tested"
        ),
        AgentVoteResponse(
            "cost_specialist", "YES", 0.70,
            "FastAPI uses less compute = lower cost"
        ),
    ]

    result3 = orchestrator.inject_votes(question3, votes3)
    print(f"Decision: {result3.final_decision.name} | Score: {result3.weighted_score:.2f}")

    # Summary
    print("\n" + "-"*70)
    print("WORKFLOW SUMMARY")
    print("-"*70)
    print(f"Decisions made: {len(orchestrator.get_history())}")
    for entry in orchestrator.get_history():
        decision = entry["result"]["final_decision"]
        score = entry["result"]["weighted_score"]
        print(f"  - {entry['question_id']:20s} => {decision:6s} ({score:+.2f})")

    return orchestrator


# ============================================================================
# Main: Run all scenarios
# ============================================================================

def run_all_scenarios():
    """Run all test scenarios"""
    print("\n" + "#"*70)
    print("AGENT CONSENSUS VOTING - TEST SCENARIOS")
    print("#"*70)

    results = {}

    # Scenario 1
    results["tool_selection"] = scenario_tool_selection()

    # Scenario 2
    results["budget_allocation"] = scenario_budget_allocation()

    # Scenario 3
    results["interpretation_dispute"] = scenario_interpretation_dispute()

    # Scenario 4
    orchestrator = scenario_workflow_orchestration()

    # Summary table
    print("\n" + "="*70)
    print("SUMMARY TABLE")
    print("="*70)
    print(
        f"{'Scenario':<30} {'Decision':<12} {'Confidence':<15} {'Score'}"
    )
    print("-" * 70)

    for name, result in results.items():
        print(
            f"{name:<30} {result.final_decision.name:<12} "
            f"{result.confidence_level:<15.1%} {result.weighted_score:+.3f}"
        )

    print("\n" + "="*70)
    print("Test scenarios complete!")
    print("="*70)


if __name__ == "__main__":
    run_all_scenarios()
