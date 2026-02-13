# Agent Consensus & Voting

> Multi-agent voting system with consensus algorithms and conflict resolution

## Quick Start

```bash
npm install
npm test
```

## Basic Usage

```javascript
const { ConsensusVoting, ConsensusAlgorithm } = require('./index');

// Create voting system
const voting = new ConsensusVoting({
  algorithm: ConsensusAlgorithm.MAJORITY
});

// Create session and cast votes
const session = voting.createSession('decision-1');
session.castVote('agent-1', 'option-a', { confidence: 0.9 });
session.castVote('agent-2', 'option-a', { confidence: 0.8 });
session.castVote('agent-3', 'option-b', { confidence: 0.7 });

// Get result
const result = session.finalize();
console.log('Winner:', result.winner);
console.log('Consensus reached:', result.consensusReached);
```

## Features

✅ **Multiple consensus algorithms** - majority, weighted, unanimous, confidence-weighted, threshold  
✅ **Confidence weighting** - votes include confidence levels (0-1)  
✅ **Conflict resolution** - intelligent tie-breaking strategies  
✅ **Session management** - multiple concurrent voting sessions  
✅ **Event-driven** - real-time vote updates and completion events  
✅ **Flexible choices** - vote on strings, numbers, objects, anything  
✅ **Integration ready** - works with multi-agent orchestration systems  

## Algorithms

| Algorithm | Description | Best For |
|-----------|-------------|----------|
| `MAJORITY` | Simple >50% wins | Democratic decisions |
| `WEIGHTED` | Weight-based voting | Expert opinions matter |
| `UNANIMOUS` | All must agree | Safety-critical actions |
| `CONFIDENCE_WEIGHTED` | Weight × confidence | Uncertain environments |
| `THRESHOLD` | Configurable % needed | Custom requirements |

## Documentation

- **[SKILL.md](./SKILL.md)** - Complete documentation with examples
- **[tests/](./tests/)** - Comprehensive test suite
- **[examples/](./examples/)** - Integration examples

## Examples

### Quick Vote

```javascript
const { quickVote } = require('./index');

const result = quickVote([
  { agentId: 'a1', choice: 'yes', confidence: 0.9, weight: 1.0 },
  { agentId: 'a2', choice: 'yes', confidence: 0.8, weight: 1.0 },
  { agentId: 'a3', choice: 'no', confidence: 0.7, weight: 1.0 }
]);

console.log(result.winner); // 'yes'
```

### Weighted Voting

```javascript
session.castVote('expert', 'option-a', { weight: 3.0 });
session.castVote('novice-1', 'option-b', { weight: 1.0 });
session.castVote('novice-2', 'option-b', { weight: 1.0 });

const result = session.finalize();
// 'option-a' wins (3.0 > 2.0)
```

### Complex Decisions

```javascript
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

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## License

MIT
