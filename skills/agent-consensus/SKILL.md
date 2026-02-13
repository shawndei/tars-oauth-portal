# Agent Consensus & Voting

Multi-agent voting system with consensus algorithms, result aggregation, and conflict resolution for distributed agent decision-making.

## Overview

This skill enables multiple agents to vote on decisions, reach consensus through various algorithms, and resolve conflicts intelligently. It supports weighted voting, confidence-based aggregation, and flexible conflict resolution strategies.

## Features

- **Multiple Consensus Algorithms**
  - Majority voting (simple >50% threshold)
  - Weighted voting (agents have different vote weights)
  - Unanimous consensus (all must agree)
  - Confidence-weighted voting (weight × confidence scoring)
  - Threshold-based consensus (configurable percentage)
  - Ranked choice voting (placeholder for future expansion)

- **Confidence Weighting**
  - Each vote includes a confidence level (0-1)
  - Aggregate confidence calculated for results
  - Confidence can influence conflict resolution

- **Conflict Resolution Strategies**
  - Highest confidence (default)
  - Random selection
  - Weighted random (proportional to vote weight)
  - First vote priority

- **Session Management**
  - Multiple concurrent voting sessions
  - Session timeouts
  - Event-driven architecture
  - Status tracking and inspection

- **Integration Ready**
  - Works with multi-agent orchestration systems
  - Event emitters for real-time updates
  - Simple API for quick decisions
  - Extensible for custom algorithms

## Installation

```bash
cd skills/agent-consensus
npm install
```

## Usage

### Basic Example

```javascript
const { ConsensusVoting, ConsensusAlgorithm } = require('./skills/agent-consensus');

// Create voting system
const voting = new ConsensusVoting({
  algorithm: ConsensusAlgorithm.MAJORITY
});

// Create a voting session
const session = voting.createSession('resource-allocation');

// Agents cast votes
session.castVote('agent-1', 'option-a', { confidence: 0.9, weight: 1.0 });
session.castVote('agent-2', 'option-a', { confidence: 0.8, weight: 1.0 });
session.castVote('agent-3', 'option-b', { confidence: 0.7, weight: 1.0 });

// Finalize and get result
const result = session.finalize();

console.log('Winner:', result.winner);
console.log('Consensus reached:', result.consensusReached);
console.log('Confidence:', result.confidence);
```

### Quick Vote Helper

For simple one-off votes:

```javascript
const { quickVote, ConsensusAlgorithm } = require('./skills/agent-consensus');

const votes = [
  { agentId: 'agent-1', choice: 'north', confidence: 0.9, weight: 1.0 },
  { agentId: 'agent-2', choice: 'north', confidence: 0.8, weight: 1.0 },
  { agentId: 'agent-3', choice: 'south', confidence: 0.6, weight: 1.0 }
];

const result = quickVote(votes, { algorithm: ConsensusAlgorithm.MAJORITY });
console.log('Direction:', result.winner); // 'north'
```

### Weighted Voting

Give different agents different voting power:

```javascript
const voting = new ConsensusVoting({
  algorithm: ConsensusAlgorithm.WEIGHTED
});

const session = voting.createSession('team-decision');

session.castVote('expert-agent', 'option-a', { weight: 3.0 });
session.castVote('novice-1', 'option-b', { weight: 1.0 });
session.castVote('novice-2', 'option-b', { weight: 1.0 });

const result = session.finalize();
// 'option-a' wins (3.0 > 2.0)
```

### Confidence-Weighted Voting

Combine vote weight with confidence:

```javascript
const voting = new ConsensusVoting({
  algorithm: ConsensusAlgorithm.CONFIDENCE_WEIGHTED,
  threshold: 0.6
});

const session = voting.createSession('risky-decision');

session.castVote('agent-1', 'proceed', { 
  weight: 2.0, 
  confidence: 0.9 
}); // Score: 1.8

session.castVote('agent-2', 'abort', { 
  weight: 3.0, 
  confidence: 0.5 
}); // Score: 1.5

const result = session.finalize();
// 'proceed' wins (1.8 > 1.5)
```

### Unanimous Consensus

Require all agents to agree:

```javascript
const voting = new ConsensusVoting({
  algorithm: ConsensusAlgorithm.UNANIMOUS
});

const session = voting.createSession('critical-action');

session.castVote('agent-1', 'approve');
session.castVote('agent-2', 'approve');
session.castVote('agent-3', 'approve');

const result = session.finalize();
// consensusReached: true, winner: 'approve'
```

### Complex Vote Choices

Votes can be any type - strings, numbers, or objects:

```javascript
const session = voting.createSession('robot-action');

session.castVote('agent-1', {
  action: 'move',
  direction: 'north',
  speed: 'fast'
});

session.castVote('agent-2', {
  action: 'move',
  direction: 'north',
  speed: 'fast'
});

const result = session.finalize();
// result.winner is the full object
```

### Event Handling

Listen to voting events:

```javascript
const session = voting.createSession('monitored-vote');

session.on('vote-cast', (vote) => {
  console.log(`${vote.agentId} voted for ${vote.choice}`);
});

session.on('vote-updated', (vote) => {
  console.log(`${vote.agentId} changed vote to ${vote.choice}`);
});

session.on('complete', (result) => {
  console.log('Voting complete:', result.winner);
});

// System-level events
voting.on('session-complete', ({ sessionId, result }) => {
  console.log(`Session ${sessionId} completed`);
});
```

### Session Timeout

Automatically finalize after a time limit:

```javascript
const session = voting.createSession('time-limited', {
  timeout: 5000 // 5 seconds
});

session.on('timeout', () => {
  console.log('Voting timeout - finalizing with current votes');
});

// Votes must be cast within 5 seconds
```

### Conflict Resolution

Handle ties intelligently:

```javascript
const voting = new ConsensusVoting({
  algorithm: ConsensusAlgorithm.MAJORITY,
  conflictResolution: 'highest-confidence'
});

const session = voting.createSession('tie-breaker');

session.castVote('agent-1', 'A', { confidence: 0.9 });
session.castVote('agent-2', 'B', { confidence: 0.6 });

const result = session.finalize();
// 'A' wins due to higher confidence
// result.metadata.conflict === true
```

Available conflict resolution strategies:
- `highest-confidence` - Choose option with highest average confidence
- `random` - Random selection among tied options
- `weighted-random` - Weighted random based on vote weights
- `first` - First option in the tied list

## API Reference

### ConsensusVoting Class

Main voting system manager.

#### Constructor

```javascript
new ConsensusVoting(options)
```

Options:
- `algorithm` - Consensus algorithm (default: `ConsensusAlgorithm.MAJORITY`)
- `threshold` - Threshold for threshold-based voting (default: 0.5)
- `conflictResolution` - Conflict resolution strategy (default: 'highest-confidence')
- `timeout` - Session timeout in ms (default: null)
- `allowAbstentions` - Allow agents to abstain (default: true)

#### Methods

- `createSession(sessionId, options)` - Create new voting session
- `getSession(sessionId)` - Get existing session
- `closeSession(sessionId)` - Close and remove session
- `listSessions()` - List all active session IDs

#### Events

- `session-complete` - Emitted when a session finalizes
- `session-timeout` - Emitted when a session times out

### VotingSession Class

Individual voting session.

#### Methods

- `castVote(agentId, choice, options)` - Cast or update a vote
  - `options.confidence` - Confidence level (0-1, default: 1.0)
  - `options.weight` - Vote weight (default: 1.0)
  - `options.metadata` - Additional metadata
- `getVotes()` - Get all votes
- `getVoteByAgent(agentId)` - Get specific agent's vote
- `calculateConsensus()` - Calculate result without finalizing
- `finalize()` - Close session and return final result
- `close()` - Close without finalizing
- `getStatus()` - Get session status

#### Events

- `vote-cast` - Emitted when new vote is cast
- `vote-updated` - Emitted when vote is updated
- `complete` - Emitted when session finalizes
- `timeout` - Emitted on timeout

### ConsensusResult Object

Result of consensus calculation:

```javascript
{
  winner: any,              // Winning choice
  consensusReached: bool,   // Whether consensus was achieved
  confidence: number,       // Aggregate confidence (0-1)
  distribution: object,     // Vote distribution by choice
  votes: array,            // All votes cast
  algorithm: string,        // Algorithm used
  metadata: object         // Additional metadata
}
```

### ConsensusAlgorithm Enum

Available algorithms:
- `MAJORITY` - Simple majority (>50%)
- `WEIGHTED` - Weighted by vote weight
- `UNANIMOUS` - All must agree
- `CONFIDENCE_WEIGHTED` - Weight × confidence
- `THRESHOLD` - Configurable threshold percentage
- `RANKED_CHOICE` - Ranked choice (placeholder)

## Integration with Multi-Agent Orchestration

### Example: Coordinated Task Assignment

```javascript
// In your orchestration system
const { ConsensusVoting, ConsensusAlgorithm } = require('./skills/agent-consensus');

class MultiAgentOrchestrator {
  constructor() {
    this.voting = new ConsensusVoting({
      algorithm: ConsensusAlgorithm.CONFIDENCE_WEIGHTED,
      threshold: 0.6
    });
    this.agents = new Map();
  }

  async coordinateTaskAssignment(task, candidateAgents) {
    const sessionId = `task-${task.id}`;
    const session = this.voting.createSession(sessionId, { timeout: 10000 });

    // Ask each agent who they think should handle the task
    const votePromises = candidateAgents.map(async (agent) => {
      const recommendation = await agent.recommendTaskHandler(task, candidateAgents);
      
      return session.castVote(agent.id, recommendation.agentId, {
        confidence: recommendation.confidence,
        weight: agent.expertise,
        metadata: { reasoning: recommendation.reason }
      });
    });

    await Promise.all(votePromises);

    const result = session.finalize();
    
    if (result.consensusReached) {
      const assignedAgent = this.agents.get(result.winner);
      await assignedAgent.assignTask(task);
      return { success: true, agent: result.winner, confidence: result.confidence };
    } else {
      return { success: false, reason: 'No consensus reached' };
    }
  }
}
```

### Example: Distributed Decision Making

```javascript
// Agent swarm coordination
class SwarmCoordinator {
  async makeCollectiveDecision(scenario, agents) {
    const voting = new ConsensusVoting({
      algorithm: ConsensusAlgorithm.CONFIDENCE_WEIGHTED
    });

    const session = voting.createSession('swarm-decision');

    // Collect assessments from all agents
    for (const agent of agents) {
      const assessment = await agent.assessScenario(scenario);
      
      session.castVote(agent.id, assessment.recommendedAction, {
        confidence: assessment.confidence,
        weight: agent.reliability,
        metadata: {
          reasoning: assessment.reasoning,
          risk: assessment.riskLevel
        }
      });
    }

    const result = session.finalize();

    // Execute collective decision
    if (result.consensusReached && result.confidence > 0.7) {
      await this.executeSwarmAction(result.winner, agents);
      return result;
    } else {
      // Escalate to human or re-analyze
      await this.escalateDecision(scenario, result);
      return null;
    }
  }
}
```

## Testing

Run the test suite:

```bash
npm test
```

Run with coverage:

```bash
npm run test:coverage
```

Watch mode for development:

```bash
npm run test:watch
```

## Advanced Usage

### Custom Vote Aggregation

You can extend the system with custom aggregation logic:

```javascript
class CustomVotingSession extends VotingSession {
  calculateCustomConsensus() {
    // Your custom logic here
    const votes = this.getVotes();
    
    // Example: Bayesian aggregation
    const priorBelief = 0.5;
    // ... implement custom algorithm
    
    return this.createResult(winner, consensusReached, confidence, distribution);
  }
}
```

### Vote Validation

Add validation logic:

```javascript
const session = voting.createSession('validated-vote');

session.on('vote-cast', (vote) => {
  // Validate vote authenticity
  if (!validateAgentSignature(vote)) {
    throw new Error('Invalid vote signature');
  }
});
```

### Persistent Sessions

Save and restore sessions:

```javascript
const sessionData = {
  sessionId: session.sessionId,
  votes: session.getVotes(),
  options: session.options,
  status: session.getStatus()
};

// Save to database
await db.saveSessions.save(sessionData);

// Restore later
const restored = voting.createSession(sessionData.sessionId, sessionData.options);
for (const vote of sessionData.votes) {
  restored.castVote(vote.agentId, vote.choice, {
    confidence: vote.confidence,
    weight: vote.weight,
    metadata: vote.metadata
  });
}
```

## Best Practices

1. **Choose the Right Algorithm**
   - Use `MAJORITY` for simple democratic decisions
   - Use `WEIGHTED` when agents have different expertise levels
   - Use `UNANIMOUS` for critical safety decisions
   - Use `CONFIDENCE_WEIGHTED` for uncertain environments

2. **Set Appropriate Thresholds**
   - Higher thresholds (0.7-0.9) for critical decisions
   - Lower thresholds (0.5-0.6) for routine decisions
   - Consider the cost of false positives vs false negatives

3. **Weight Votes Thoughtfully**
   - Base weights on agent expertise, track record, or domain knowledge
   - Don't create extreme weight imbalances (>10x)
   - Consider normalizing weights within sessions

4. **Use Confidence Appropriately**
   - Agents should calibrate confidence based on data quality
   - Low confidence should reflect uncertainty, not disagreement
   - Track confidence calibration over time

5. **Handle Timeouts**
   - Set timeouts for time-critical decisions
   - Have fallback logic for partial votes
   - Log timeout events for analysis

6. **Monitor Consensus Patterns**
   - Track consensus success rates
   - Analyze conflict frequency
   - Identify consistently dissenting agents

## Limitations

- Ranked choice voting is simplified (full implementation pending)
- No built-in vote authentication/signing
- Session state is in-memory (no persistence layer)
- No built-in network communication (bring your own)

## Future Enhancements

- Full ranked choice / instant runoff voting
- Byzantine fault tolerance
- Cryptographic vote verification
- Persistent session storage
- Network-aware voting protocols
- Adaptive weight adjustment based on performance
- Vote explanation and reasoning aggregation

## License

MIT

## Contributing

Contributions welcome! Please ensure all tests pass and add tests for new features.
