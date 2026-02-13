"""
Consensus Engine - Confidence-Weighted Voting Implementation

Core voting logic for multi-agent decision-making.
Agents provide (decision, confidence) pairs; votes are weighted by confidence.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from abc import ABC, abstractmethod
import json


class Decision(Enum):
    """Binary decision options"""
    YES = 1
    NO = -1
    ABSTAIN = 0


@dataclass
class Vote:
    """Single agent vote"""
    agent_id: str
    decision: Decision
    confidence: float  # 0.0 to 1.0
    reasoning: str = ""

    def weight(self) -> float:
        """Convert vote to weighted value"""
        if self.decision == Decision.ABSTAIN:
            return 0.0
        return self.decision.value * self.confidence

    def to_dict(self) -> Dict[str, Any]:
        """Serialize vote"""
        return {
            "agent_id": self.agent_id,
            "decision": self.decision.name,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
        }


@dataclass
class ConsensusResult:
    """Result of consensus voting"""
    final_decision: Decision
    weighted_score: float  # -1.0 to 1.0
    confidence_level: float  # 0.0 to 1.0 (how unanimous)
    vote_breakdown: Dict[str, int]  # {"YES": 3, "NO": 2, "ABSTAIN": 0}
    individual_votes: List[Vote]
    reasoning: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Serialize result"""
        return {
            "final_decision": self.final_decision.name,
            "weighted_score": round(self.weighted_score, 3),
            "confidence_level": round(self.confidence_level, 3),
            "vote_breakdown": self.vote_breakdown,
            "individual_votes": [v.to_dict() for v in self.individual_votes],
            "reasoning": self.reasoning,
        }


class ConsensusEngine:
    """Confidence-weighted voting engine for agent consensus"""

    def __init__(self, confidence_calibration: float = 1.0):
        """
        Initialize engine.

        Args:
            confidence_calibration: Multiply all confidences by this factor.
                                   Default 1.0 (no adjustment).
                                   Use 0.8-0.9 to counteract overconfidence.
        """
        self.confidence_calibration = confidence_calibration

    def collect_votes(self, votes: List[Vote]) -> ConsensusResult:
        """
        Aggregate votes and compute consensus.

        Args:
            votes: List of Vote objects from agents

        Returns:
            ConsensusResult with final decision and metadata
        """
        if not votes:
            raise ValueError("No votes to process")

        # Apply calibration to all confidences
        calibrated_votes = self._calibrate_votes(votes)

        # Compute weighted sum
        weighted_sum = sum(v.weight() for v in calibrated_votes)

        # Determine final decision
        final_decision = self._decide_from_score(weighted_sum)

        # Calculate confidence (unanimity metric)
        confidence_level = self._calculate_confidence(calibrated_votes)

        # Build breakdown
        vote_breakdown = self._count_votes(votes)

        # Generate reasoning
        reasoning = self._generate_reasoning(
            calibrated_votes, weighted_sum, final_decision, confidence_level
        )

        return ConsensusResult(
            final_decision=final_decision,
            weighted_score=weighted_sum,
            confidence_level=confidence_level,
            vote_breakdown=vote_breakdown,
            individual_votes=votes,
            reasoning=reasoning,
        )

    def _calibrate_votes(self, votes: List[Vote]) -> List[Vote]:
        """Apply confidence calibration to votes"""
        if self.confidence_calibration == 1.0:
            return votes

        calibrated = []
        for vote in votes:
            calib_vote = Vote(
                agent_id=vote.agent_id,
                decision=vote.decision,
                confidence=min(1.0, vote.confidence * self.confidence_calibration),
                reasoning=vote.reasoning,
            )
            calibrated.append(calib_vote)
        return calibrated

    def _decide_from_score(self, weighted_sum: float) -> Decision:
        """Convert weighted sum to decision"""
        if weighted_sum > 0:
            return Decision.YES
        elif weighted_sum < 0:
            return Decision.NO
        else:
            return Decision.ABSTAIN

    def _calculate_confidence(self, votes: List[Vote]) -> float:
        """
        Calculate confidence as unanimity metric.
        - 1.0 = perfect unanimity
        - 0.0 = perfect split
        """
        if not votes:
            return 0.0

        yes_weight = sum(
            v.confidence for v in votes if v.decision == Decision.YES
        )
        no_weight = sum(v.confidence for v in votes if v.decision == Decision.NO)
        total_weight = yes_weight + no_weight

        if total_weight == 0:
            return 0.0

        max_weight = max(yes_weight, no_weight)
        confidence = (max_weight - (total_weight - max_weight)) / total_weight
        return max(0.0, min(1.0, confidence))

    def _count_votes(self, votes: List[Vote]) -> Dict[str, int]:
        """Count votes by type"""
        counts = {"YES": 0, "NO": 0, "ABSTAIN": 0}
        for vote in votes:
            counts[vote.decision.name] += 1
        return counts

    def _generate_reasoning(
        self,
        votes: List[Vote],
        weighted_sum: float,
        decision: Decision,
        confidence: float,
    ) -> str:
        """Generate human-readable reasoning for decision"""
        yes_votes = [v for v in votes if v.decision == Decision.YES]
        no_votes = [v for v in votes if v.decision == Decision.NO]

        yes_weight = sum(v.confidence for v in yes_votes)
        no_weight = sum(v.confidence for v in no_votes)

        reasoning = (
            f"Decision: {decision.name} | "
            f"Weighted score: {weighted_sum:.2f} | "
            f"Unanimity: {confidence:.1%} | "
            f"Pro ({yes_weight:.2f}): {len(yes_votes)} agents | "
            f"Con ({no_weight:.2f}): {len(no_votes)} agents"
        )
        return reasoning


class VotingStrategy(ABC):
    """Abstract base for different voting strategies"""

    @abstractmethod
    def vote(self, decision: Decision, confidence: float) -> Vote:
        """Generate a vote"""
        pass


# Utility functions for multi-agent integration

def run_consensus(votes: List[Vote], calibration: float = 1.0) -> ConsensusResult:
    """
    Convenience function: create engine and run voting in one call.

    Args:
        votes: List of Vote objects
        calibration: Confidence calibration factor (default 1.0)

    Returns:
        ConsensusResult
    """
    engine = ConsensusEngine(confidence_calibration=calibration)
    return engine.collect_votes(votes)


def votes_from_dict(data: List[Dict[str, Any]]) -> List[Vote]:
    """Convert JSON-like data to Vote objects"""
    votes = []
    for item in data:
        decision = Decision[item["decision"].upper()]
        vote = Vote(
            agent_id=item["agent_id"],
            decision=decision,
            confidence=float(item["confidence"]),
            reasoning=item.get("reasoning", ""),
        )
        votes.append(vote)
    return votes
