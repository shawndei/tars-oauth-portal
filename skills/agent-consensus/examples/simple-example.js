/**
 * Simple Example: Getting Started with Agent Consensus
 */

const { ConsensusVoting, ConsensusAlgorithm, quickVote } = require('../index');

// ============================================================================
// Example 1: Basic Majority Voting
// ============================================================================

console.log('=== Example 1: Basic Majority Voting ===\n');

const voting1 = new ConsensusVoting({
  algorithm: ConsensusAlgorithm.MAJORITY
});

const session1 = voting1.createSession('lunch-decision');

// Three agents vote on where to eat lunch
session1.castVote('alice', 'pizza', { confidence: 0.9 });
session1.castVote('bob', 'pizza', { confidence: 0.8 });
session1.castVote('charlie', 'sushi', { confidence: 0.7 });

const result1 = session1.finalize();

console.log('Winner:', result1.winner);
console.log('Consensus reached:', result1.consensusReached);
console.log('Confidence:', result1.confidence.toFixed(2));
console.log('Vote distribution:', result1.distribution);

// ============================================================================
// Example 2: Weighted Voting (Expert Opinions)
// ============================================================================

console.log('\n=== Example 2: Weighted Voting ===\n');

const voting2 = new ConsensusVoting({
  algorithm: ConsensusAlgorithm.WEIGHTED
});

const session2 = voting2.createSession('technical-decision');

// Senior engineer's vote counts more
session2.castVote('senior-engineer', 'approach-a', { 
  weight: 3.0,
  confidence: 0.9 
});

session2.castVote('junior-dev-1', 'approach-b', { 
  weight: 1.0,
  confidence: 0.7 
});

session2.castVote('junior-dev-2', 'approach-b', { 
  weight: 1.0,
  confidence: 0.6 
});

const result2 = session2.finalize();

console.log('Winner:', result2.winner);
console.log('Consensus reached:', result2.consensusReached);
console.log('(Senior engineer\'s vote weighted 3x more)\n');

// ============================================================================
// Example 3: Unanimous Decision (Safety Critical)
// ============================================================================

console.log('=== Example 3: Unanimous Decision ===\n');

const voting3 = new ConsensusVoting({
  algorithm: ConsensusAlgorithm.UNANIMOUS
});

const session3 = voting3.createSession('emergency-shutdown');

// All safety systems must agree
session3.castVote('safety-system-1', 'APPROVE');
session3.castVote('safety-system-2', 'APPROVE');
session3.castVote('safety-system-3', 'APPROVE');

const result3 = session3.finalize();

console.log('All systems approved:', result3.consensusReached);
console.log('Decision:', result3.winner);
console.log('(All agents must agree for unanimous consensus)\n');

// ============================================================================
// Example 4: Confidence-Weighted Voting
// ============================================================================

console.log('=== Example 4: Confidence-Weighted Voting ===\n');

const voting4 = new ConsensusVoting({
  algorithm: ConsensusAlgorithm.CONFIDENCE_WEIGHTED,
  threshold: 0.5
});

const session4 = voting4.createSession('prediction');

// Agents with higher confidence have more influence
session4.castVote('agent-1', 'outcome-a', { 
  weight: 1.0,
  confidence: 0.95  // Very confident
});

session4.castVote('agent-2', 'outcome-b', { 
  weight: 1.0,
  confidence: 0.6   // Somewhat confident
});

session4.castVote('agent-3', 'outcome-a', { 
  weight: 1.0,
  confidence: 0.8   // Confident
});

const result4 = session4.finalize();

console.log('Winner:', result4.winner);
console.log('Aggregate confidence:', result4.confidence.toFixed(2));
console.log('(Votes weighted by confidence level)\n');

// ============================================================================
// Example 5: Quick Vote Helper
// ============================================================================

console.log('=== Example 5: Quick Vote (One-liner) ===\n');

const quickResult = quickVote([
  { agentId: 'a1', choice: 'yes', confidence: 0.9, weight: 1.0 },
  { agentId: 'a2', choice: 'yes', confidence: 0.8, weight: 1.0 },
  { agentId: 'a3', choice: 'no', confidence: 0.7, weight: 1.0 },
  { agentId: 'a4', choice: 'no', confidence: 0.6, weight: 1.0 }
], { algorithm: ConsensusAlgorithm.MAJORITY });

console.log('Quick vote result:', quickResult.winner);
console.log('Consensus:', quickResult.consensusReached ? 'YES' : 'NO');

// ============================================================================
// Example 6: Complex Vote Objects
// ============================================================================

console.log('\n=== Example 6: Complex Vote Objects ===\n');

const voting6 = new ConsensusVoting();
const session6 = voting6.createSession('robot-action');

// Votes can be any object structure
session6.castVote('robot-1', {
  action: 'move',
  direction: 'north',
  speed: 5,
  priority: 'high'
});

session6.castVote('robot-2', {
  action: 'move',
  direction: 'north',
  speed: 5,
  priority: 'high'
});

session6.castVote('robot-3', {
  action: 'wait',
  duration: 30
});

const result6 = session6.finalize();

console.log('Winning action:', result6.winner);
console.log('(Votes can be any data structure)\n');

// ============================================================================
// Example 7: Event Handling
// ============================================================================

console.log('=== Example 7: Real-time Events ===\n');

const voting7 = new ConsensusVoting();
const session7 = voting7.createSession('monitored-vote');

// Listen to vote events
session7.on('vote-cast', (vote) => {
  console.log(`✓ Vote received from ${vote.agentId}: ${vote.choice}`);
});

session7.on('complete', (result) => {
  console.log(`\n→ Voting complete! Winner: ${result.winner}`);
});

// Cast votes
session7.castVote('agent-a', 'option-1');
session7.castVote('agent-b', 'option-1');
session7.castVote('agent-c', 'option-2');

session7.finalize();

// ============================================================================
// Example 8: Conflict Resolution
// ============================================================================

console.log('\n=== Example 8: Tie Breaking ===\n');

const voting8 = new ConsensusVoting({
  algorithm: ConsensusAlgorithm.MAJORITY,
  conflictResolution: 'highest-confidence'
});

const session8 = voting8.createSession('tie-breaker');

// Two votes, equal weight - tie!
session8.castVote('agent-x', 'option-a', { confidence: 0.95 });
session8.castVote('agent-y', 'option-b', { confidence: 0.60 });

const result8 = session8.finalize();

console.log('Winner (tie-broken):', result8.winner);
console.log('Conflict detected:', result8.metadata.conflict);
console.log('(Higher confidence breaks the tie)\n');

// ============================================================================

console.log('╔════════════════════════════════════════════════════╗');
console.log('║  All examples completed successfully!             ║');
console.log('║  Check SKILL.md for detailed documentation        ║');
console.log('╚════════════════════════════════════════════════════╝');
