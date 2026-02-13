"""
Multi-Agent Orchestrator - Integration Layer for Consensus Voting

Orchestrates consensus decisions across multiple agents in a multi-agent system.
Handles agent prompting, vote collection, and decision routing.
"""

from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional
from enum import Enum
import json

from consensus_engine import (
    ConsensusEngine,
    ConsensusResult,
    Decision,
    Vote,
)


class DecisionContext(Enum):
    """Categories of decisions requiring consensus"""
    TOOL_SELECTION = "tool_selection"
    BUDGET_ALLOCATION = "budget_allocation"
    INTERPRETATION_DISPUTE = "interpretation_dispute"
    ARCHITECTURAL_CHOICE = "architectural_choice"
    CONFLICT_RESOLUTION = "conflict_resolution"


@dataclass
class ConsensusQuestion:
    """A decision that requires agent consensus"""
    question_id: str
    context: DecisionContext
    prompt: str
    options: Optional[List[str]] = None  # For multiple choice
    metadata: Dict[str, Any] = None


@dataclass
class AgentVoteResponse:
    """Agent's response to a consensus question"""
    agent_id: str
    decision: str  # "YES" or "NO"
    confidence: float  # 0.0 to 1.0
    reasoning: str


class MultiAgentOrchestrator:
    """
    Orchestrates consensus voting across multiple agents.

    Usage:
    1. Create orchestrator with list of agents
    2. Submit consensus question
    3. Collect votes from all agents
    4. Compute consensus
    5. Route decision back to agents or external system
    """

    def __init__(
        self,
        agents: List[str],
        vote_collector: Optional[Callable] = None,
        confidence_calibration: float = 1.0,
    ):
        """
        Initialize orchestrator.

        Args:
            agents: List of agent IDs
            vote_collector: Function to collect votes from agents.
                           Signature: vote_collector(agent_id: str, question: str) -> AgentVoteResponse
                           If None, uses stub that requires manual vote injection.
            confidence_calibration: Passed to ConsensusEngine
        """
        self.agents = agents
        self.vote_collector = vote_collector
        self.engine = ConsensusEngine(confidence_calibration=confidence_calibration)
        self.history: List[Dict[str, Any]] = []

    def run_consensus(
        self,
        question: ConsensusQuestion,
        timeout_seconds: Optional[int] = None,
    ) -> ConsensusResult:
        """
        Run full consensus workflow: prompt agents, collect votes, decide.

        Args:
            question: The decision to make
            timeout_seconds: Max time to wait for all votes (not enforced in this stub)

        Returns:
            ConsensusResult with final decision
        """
        if not self.vote_collector:
            raise RuntimeError(
                "vote_collector not set. Either pass it to __init__ "
                "or use inject_votes() for manual testing."
            )

        # Prompt all agents
        votes = []
        for agent_id in self.agents:
            response = self.vote_collector(agent_id, question.prompt)
            vote = self._response_to_vote(response)
            votes.append(vote)

        # Compute consensus
        result = self.engine.collect_votes(votes)

        # Log to history
        self._log_decision(question, result)

        return result

    def inject_votes(
        self,
        question: ConsensusQuestion,
        votes: List[AgentVoteResponse],
    ) -> ConsensusResult:
        """
        Inject votes manually (for testing).

        Args:
            question: The decision being made
            votes: List of AgentVoteResponse objects

        Returns:
            ConsensusResult
        """
        vote_objects = [self._response_to_vote(v) for v in votes]
        result = self.engine.collect_votes(vote_objects)
        self._log_decision(question, result)
        return result

    def _response_to_vote(self, response: AgentVoteResponse) -> Vote:
        """Convert agent response to Vote object"""
        decision = Decision.YES if response.decision.upper() == "YES" else Decision.NO
        return Vote(
            agent_id=response.agent_id,
            decision=decision,
            confidence=response.confidence,
            reasoning=response.reasoning,
        )

    def _log_decision(self, question: ConsensusQuestion, result: ConsensusResult) -> None:
        """Log decision to history"""
        entry = {
            "question_id": question.question_id,
            "context": question.context.value,
            "prompt": question.prompt,
            "result": result.to_dict(),
        }
        self.history.append(entry)

    def get_history(self) -> List[Dict[str, Any]]:
        """Get all past decisions"""
        return self.history

    def export_history_json(self, filepath: str) -> None:
        """Export decision history to JSON"""
        with open(filepath, "w") as f:
            json.dump(self.history, f, indent=2)


# Common decision templates

def make_tool_selection_question(
    tool_candidates: List[str],
    task_description: str,
) -> ConsensusQuestion:
    """
    Create a consensus question for tool selection.

    Args:
        tool_candidates: Tools being considered (e.g., ["REST API", "GraphQL", "gRPC"])
        task_description: Description of what the task requires

    Returns:
        ConsensusQuestion
    """
    tools_str = ", ".join(tool_candidates)
    return ConsensusQuestion(
        question_id=f"tool_select_{hash(tuple(tool_candidates))}",
        context=DecisionContext.TOOL_SELECTION,
        prompt=(
            f"Task: {task_description}\n\n"
            f"Candidate tools: {tools_str}\n\n"
            f"Vote YES if you believe the PRIMARY candidate (first tool) is the best choice. "
            f"Vote NO if you believe an alternative is better. "
            f"Provide confidence as a decimal 0.0-1.0 based on your expertise in this domain."
        ),
        options=tool_candidates,
    )


def make_budget_decision_question(
    options: Dict[str, str],  # {option_name: description}
    budget_constraint: str,
) -> ConsensusQuestion:
    """
    Create a consensus question for budget allocation.

    Args:
        options: Budget options (name -> description)
        budget_constraint: Constraint description

    Returns:
        ConsensusQuestion
    """
    options_str = "\n".join(
        [f"  - {name}: {desc}" for name, desc in options.items()]
    )
    return ConsensusQuestion(
        question_id=f"budget_{hash(tuple(options.keys()))}",
        context=DecisionContext.BUDGET_ALLOCATION,
        prompt=(
            f"Budget decision. Constraint: {budget_constraint}\n\n"
            f"Options:\n{options_str}\n\n"
            f"Vote YES to approve the PRIMARY option (first listed). "
            f"Vote NO if you believe a different option better serves the constraint. "
            f"Confidence: how certain are you about this decision (0.0-1.0)?"
        ),
        options=list(options.keys()),
    )


def make_interpretation_dispute_question(
    disputed_text: str,
    interpretation_a: str,
    interpretation_b: str,
) -> ConsensusQuestion:
    """
    Create a consensus question for interpretation disputes.

    Args:
        disputed_text: The ambiguous text
        interpretation_a: First interpretation (YES vote means this is correct)
        interpretation_b: Second interpretation (NO vote means this is correct)

    Returns:
        ConsensusQuestion
    """
    return ConsensusQuestion(
        question_id=f"interp_{hash(disputed_text)}",
        context=DecisionContext.INTERPRETATION_DISPUTE,
        prompt=(
            f"Interpretation dispute:\n\n"
            f"Text: {disputed_text}\n\n"
            f"Interpretation A: {interpretation_a}\n"
            f"Interpretation B: {interpretation_b}\n\n"
            f"Vote YES if Interpretation A is correct. "
            f"Vote NO if Interpretation B is correct. "
            f"Confidence: how confident are you (0.0-1.0)?"
        ),
        options=["Interpretation A", "Interpretation B"],
    )


# Workflow helpers

def build_voting_workflow(
    orchestrator: MultiAgentOrchestrator,
    decision_points: List[ConsensusQuestion],
) -> List[ConsensusResult]:
    """
    Run a sequence of consensus decisions.

    Args:
        orchestrator: The MultiAgentOrchestrator instance
        decision_points: List of questions to decide on

    Returns:
        List of ConsensusResult for each decision
    """
    results = []
    for question in decision_points:
        try:
            result = orchestrator.run_consensus(question)
            results.append(result)
        except Exception as e:
            print(f"Error processing question {question.question_id}: {e}")
    return results
