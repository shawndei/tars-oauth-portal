# Memory Graph - Graph-Based Memory Networks

**Tier 4 Skill** | Neural-inspired associative memory with temporal dynamics

## Overview

Memory Graph implements a sophisticated graph-based memory system inspired by human cognitive architecture. It provides associative recall, temporal decay, memory consolidation, and intelligent pruning for building persistent, context-aware memory networks.

## Features

### Core Capabilities

1. **Memory Nodes and Edges**
   - Flexible node representation with rich metadata
   - Weighted, typed edges for different relationship kinds
   - Bidirectional and directed associations

2. **Associative Recall**
   - Spreading activation algorithm
   - Context-aware retrieval with multiple cues
   - Hub detection for identifying important memories
   - Shortest path finding between concepts

3. **Temporal Dynamics**
   - Exponential, linear, power-law, and logarithmic decay curves
   - Access-based importance boosting (rehearsal effect)
   - Spaced repetition scheduling
   - Retention rate tracking

4. **Memory Consolidation**
   - Automatic pruning of low-relevance nodes
   - Weak edge removal
   - Similar memory merging
   - Hub reinforcement
   - Capacity management

5. **Integration Ready**
   - Designed for episodic memory integration
   - JSON serialization/deserialization
   - Flexible metadata system
   - Graph statistics and analytics

## Installation

```bash
cd skills/memory-graph
npm install
```

## Quick Start

```javascript
import { createMemorySystem } from './skills/memory-graph/src/index.js';

// Create a complete memory system
const memory = createMemorySystem({
  maxNodes: 10000,
  defaultDecayRate: 0.00001,
  minRelevanceThreshold: 0.1
});

// Store a memory
const node1 = memory.remember('Paris is the capital of France', {
  type: 'fact',
  importance: 0.9,
  tags: ['geography', 'europe']
});

const node2 = memory.remember('France is in Europe', {
  type: 'fact',
  tags: ['geography', 'europe']
});

// Create associations
memory.associate(node1.id, node2.id, 0.9, 'semantic');

// Recall associated memories
const recalled = memory.recall(node1.id, {
  maxDepth: 3,
  maxResults: 10,
  temporalWeight: 0.5
});

console.log('Recalled memories:', recalled);

// Perform maintenance
const maintenanceResult = memory.maintain({
  aggressive: false
});
```

## API Reference

### createMemorySystem(options)

Creates a complete integrated memory system.

**Options:**
- `maxNodes` (number): Maximum nodes in graph (default: 10000)
- `defaultDecayRate` (number): Decay rate per millisecond (default: 0.00001)
- `minRelevanceThreshold` (number): Minimum relevance for retention (default: 0.01)
- `decayInterval` (number): Milliseconds between decay applications (default: 3600000)
- `forgettingCurve` (string): 'exponential', 'linear', 'power', 'logarithmic' (default: 'exponential')

**Returns:** Object with methods:
- `remember(content, metadata)` - Store a new memory
- `recall(nodeId, options)` - Retrieve associated memories
- `associate(id1, id2, weight, type)` - Link memories
- `maintain(options)` - Run automatic maintenance
- `export()` - Serialize to JSON
- `import(data)` - Deserialize from JSON

### MemoryGraph

Core graph structure.

#### Methods

**`createNode(content, metadata)`**
```javascript
const node = graph.createNode('Memory content', {
  type: 'episodic',
  importance: 0.8,
  tags: ['work', 'meeting']
});
```

**`associate(nodeId1, nodeId2, weight, type)`**
```javascript
// Bidirectional association
graph.associate(node1.id, node2.id, 0.9, 'semantic');
```

**`associateDirected(sourceId, targetId, weight, type)`**
```javascript
// Directed edge (cause -> effect)
graph.associateDirected(cause.id, effect.id, 0.8, 'causal');
```

**`reinforceConnection(nodeId1, nodeId2, delta)`**
```javascript
// Strengthen connection through co-activation
graph.reinforceConnection(node1.id, node2.id, 0.1);
```

**`findByTag(tag)` / `findByType(type)`**
```javascript
const workMemories = graph.findByTag('work');
const facts = graph.findByType('fact');
```

**`getNeighbors(nodeId)`**
```javascript
const neighbors = graph.getNeighbors(nodeId);
```

**`getStats()`**
```javascript
const stats = graph.getStats();
// { nodeCount, edgeCount, avgEdgesPerNode, maxEdges, minEdges }
```

### GraphTraversal

Associative recall algorithms.

#### Methods

**`spreadingActivation(startNodeId, options)`**

Core associative recall algorithm.

```javascript
const results = traversal.spreadingActivation(startId, {
  maxDepth: 3,           // How many hops to traverse
  decayFactor: 0.7,      // Activation decay per hop
  minActivation: 0.1,    // Minimum activation threshold
  maxResults: 20         // Maximum results to return
});

// Returns: [{ node, activation }, ...]
```

**`temporalRecall(startNodeId, options)`**

Combines spreading activation with temporal relevance.

```javascript
const results = traversal.temporalRecall(startId, {
  maxDepth: 3,
  maxResults: 20,
  temporalWeight: 0.5  // 0 = only structure, 1 = only temporal
});

// Returns: [{ node, activation, temporalRelevance, combinedScore }, ...]
```

**`contextualRecall(cueNodeIds, options)`**

Recall using multiple context cues.

```javascript
const results = traversal.contextualRecall(
  [cue1.id, cue2.id, cue3.id],
  { maxDepth: 2, maxResults: 10 }
);
```

**`findPath(startNodeId, endNodeId, maxDepth)`**

Find shortest path between two nodes.

```javascript
const path = traversal.findPath(start.id, end.id, 5);
// Returns: [nodeId1, nodeId2, ..., endId] or null
```

**`findNeighborhood(startNodeId, k)`**

Get all nodes within K hops.

```javascript
const neighborhood = traversal.findNeighborhood(nodeId, 2);
// Returns: [{ node, distance }, ...]
```

**`findHubs(limit)`**

Identify most connected nodes.

```javascript
const hubs = traversal.findHubs(10);
// Returns: [{ node, degree, weightedDegree }, ...]
```

### TemporalDecay

Time-based weighting and decay.

#### Methods

**`applyDecay(currentTime)`**

Apply temporal decay to all nodes and edges.

```javascript
decay.applyDecay(Date.now());
```

**`rehearse(nodeId, boostFactor)`**

Boost importance through rehearsal (review).

```javascript
decay.rehearse(nodeId, 0.2);
```

**`getAtRiskNodes(threshold)`**

Find nodes with low relevance but high access count.

```javascript
const atRisk = decay.getAtRiskNodes(0.2);
// Returns: [{ node, relevance, accessCount }, ...]
```

**`getRetentionRate(timeWindow)`**

Calculate memory retention over time window.

```javascript
const rate = decay.getRetentionRate(86400000); // 24 hours
// Returns: 0.0 to 1.0
```

**`getNextReviewTime(nodeId)`**

Calculate next spaced repetition review time.

```javascript
const nextReview = decay.getNextReviewTime(nodeId);
// Returns: timestamp or null
```

**`getDueForReview(currentTime)`**

Get nodes due for spaced repetition review.

```javascript
const dueNodes = decay.getDueForReview();
// Returns: [{ node, nextReview, overdue }, ...]
```

### Consolidation

Memory pruning and consolidation.

#### Methods

**`pruneNodes(currentTime, options)`**

Remove low-relevance nodes.

```javascript
const result = consolidation.pruneNodes(Date.now(), {
  minRelevance: 0.1,
  protectRecent: 86400000,  // Protect last 24h
  dryRun: true              // Preview without changes
});

// Returns: { pruned, nodes, dryRun }
```

**`pruneEdges(options)`**

Remove weak edges.

```javascript
const result = consolidation.pruneEdges({
  minWeight: 0.05,
  minAccessCount: 0,
  dryRun: false
});

// Returns: { pruned, edges, dryRun }
```

**`consolidateSimilarNodes(similarityFn, threshold, options)`**

Merge similar nodes.

```javascript
const similarityFn = (content1, content2) => {
  // Return similarity score 0.0 to 1.0
  return calculateSimilarity(content1, content2);
};

const result = consolidation.consolidateSimilarNodes(
  similarityFn,
  0.8,  // Merge if similarity >= 0.8
  { dryRun: false }
);

// Returns: { consolidated, clusters, dryRun }
```

**`enforceNodeLimit(maxNodes, currentTime)`**

Remove least relevant nodes to enforce limit.

```javascript
const result = consolidation.enforceNodeLimit(5000);
// Returns: { pruned, nodes }
```

**`reinforceImportantPaths(hubNodes, depthLimit)`**

Strengthen connections around hub nodes.

```javascript
const hubs = traversal.findHubs(5);
const result = consolidation.reinforceImportantPaths(hubs, 2);
// Returns: { reinforced }
```

**`autoMaintenance(currentTime, options)`**

Run automatic maintenance operations.

```javascript
const result = consolidation.autoMaintenance(Date.now(), {
  aggressive: false,
  maxOperations: 1000
});

// Returns: { nodesPruned, edgesPruned, consolidated, operations }
```

**`getRecommendations(currentTime)`**

Get maintenance recommendations.

```javascript
const recommendations = consolidation.getRecommendations();
// Returns: [{ type, priority, count, description }, ...]
```

## Usage Patterns

### Episodic Memory

Store and recall event sequences:

```javascript
const memory = createMemorySystem();

// Store events with temporal ordering
const event1 = memory.remember('Met client', {
  type: 'episodic',
  timestamp: Date.now() - 3600000,
  tags: ['work', 'meeting']
});

const event2 = memory.remember('Discussed requirements', {
  type: 'episodic',
  timestamp: Date.now() - 3000000,
  tags: ['work', 'requirements']
});

const event3 = memory.remember('Sent proposal', {
  type: 'episodic',
  timestamp: Date.now() - 2400000,
  tags: ['work', 'proposal']
});

// Link in temporal sequence
memory.associate(event1.id, event2.id, 0.9, 'temporal');
memory.associate(event2.id, event3.id, 0.9, 'temporal');

// Recall the sequence
const sequence = memory.recall(event1.id, {
  maxDepth: 3,
  temporalWeight: 0.7
});
```

### Semantic Knowledge Graph

Build interconnected knowledge:

```javascript
const memory = createMemorySystem();

// Core concepts
const france = memory.remember('France', { type: 'entity' });
const paris = memory.remember('Paris', { type: 'entity' });
const europe = memory.remember('Europe', { type: 'location' });

// Facts
const fact1 = memory.remember('Paris is capital of France', { type: 'fact' });
const fact2 = memory.remember('France is in Europe', { type: 'fact' });

// Semantic links
memory.associate(paris.id, fact1.id, 0.9, 'semantic');
memory.associate(france.id, fact1.id, 0.9, 'semantic');
memory.associate(france.id, fact2.id, 0.9, 'semantic');
memory.associate(europe.id, fact2.id, 0.9, 'semantic');

// Query with context
const recalled = memory.traversal.contextualRecall(
  [paris.id, europe.id],
  { maxDepth: 2 }
);
```

### Periodic Maintenance

Set up regular maintenance:

```javascript
const memory = createMemorySystem({
  maxNodes: 5000,
  defaultDecayRate: 0.00001
});

// In your heartbeat or cron job:
function performMaintenance() {
  // Apply temporal decay
  memory.decay.applyDecay();
  
  // Get recommendations
  const recommendations = memory.consolidation.getRecommendations();
  console.log('Maintenance recommendations:', recommendations);
  
  // Run automatic maintenance if needed
  if (recommendations.some(r => r.priority === 'high')) {
    const result = memory.maintain({ aggressive: true });
    console.log('Maintenance performed:', result);
  }
  
  // Check retention rate
  const retention = memory.decay.getRetentionRate(86400000);
  console.log(`24h retention rate: ${(retention * 100).toFixed(1)}%`);
}

// Run every hour
setInterval(performMaintenance, 3600000);
```

### Spaced Repetition

Implement study/review system:

```javascript
const memory = createMemorySystem();

// Store study material
const material = memory.remember('Quantum entanglement concept', {
  type: 'knowledge',
  importance: 0.7,
  reviewCount: 0
});

// Check what's due for review
function checkReviews() {
  const dueNodes = memory.decay.getDueForReview();
  
  for (const { node, overdue } of dueNodes) {
    console.log(`Review due: ${node.content}`);
    console.log(`Overdue by: ${Math.floor(overdue / 3600000)}h`);
    
    // After user reviews:
    memory.decay.rehearse(node.id, 0.2);
    node.metadata.reviewCount++;
  }
}
```

## Memory Node Metadata

Standard metadata fields:

```javascript
{
  timestamp: 1234567890,       // Creation time
  lastAccessed: 1234567890,    // Last access time
  accessCount: 5,              // Total accesses
  importance: 0.8,             // 0.0 to 1.0
  type: 'episodic',            // Custom type
  tags: ['work', 'meeting'],   // Tags for filtering
  reviewCount: 2,              // For spaced repetition
  // ... custom fields
}
```

## Edge Types

Common edge types:

- `association` - Generic association (default)
- `semantic` - Semantic relationship
- `temporal` - Time-based sequence
- `causal` - Cause and effect
- `hierarchical` - Parent-child
- `similarity` - Similar concepts

## Performance Considerations

**Scalability:**
- Efficient for graphs up to 10,000 nodes
- Spreading activation is O(edges * maxDepth)
- Pruning operations are O(n)

**Memory Usage:**
- ~1KB per node with metadata
- ~100 bytes per edge
- 10,000 nodes ≈ 10-20MB

**Optimization Tips:**
1. Set appropriate `maxDepth` for spreading activation
2. Use `minActivation` to limit traversal
3. Run maintenance regularly to control growth
4. Use `dryRun` to preview before pruning
5. Adjust `temporalWeight` based on use case

## Integration with Episodic Memory

Designed to work seamlessly with episodic memory systems:

```javascript
// Store episodic memory in graph
function storeEpisode(episode, context) {
  const node = memory.remember(episode.content, {
    type: 'episodic',
    timestamp: episode.timestamp,
    tags: episode.tags,
    context: context
  });
  
  // Link to context nodes
  if (context.participants) {
    context.participants.forEach(participant => {
      const participantNode = memory.graph.findByTag(participant)[0];
      if (participantNode) {
        memory.associate(node.id, participantNode.id, 0.8, 'participant');
      }
    });
  }
  
  return node;
}

// Retrieve episodes by context
function recallEpisodes(contextCues) {
  const cueNodes = contextCues
    .map(cue => memory.graph.findByTag(cue))
    .flat();
  
  const cueIds = cueNodes.map(n => n.id);
  
  return memory.traversal.contextualRecall(cueIds, {
    maxDepth: 2,
    temporalWeight: 0.6
  });
}
```

## Testing

Run the test suite:

```bash
npm test
```

Test coverage:
- ✓ MemoryNode creation and operations
- ✓ MemoryGraph associations and queries
- ✓ Spreading activation algorithms
- ✓ Temporal decay and rehearsal
- ✓ Memory consolidation and pruning
- ✓ Integration workflows
- ✓ Serialization/deserialization

## Architecture

```
┌─────────────────────────────────────────────┐
│           Memory System (High-level API)     │
└───────────────┬─────────────────────────────┘
                │
    ┌───────────┼───────────┬──────────────┐
    │           │           │              │
┌───▼────┐  ┌──▼──────┐ ┌──▼────────┐ ┌───▼───────────┐
│ Memory │  │  Graph  │ │ Temporal  │ │ Consolidation │
│ Graph  │  │Traversal│ │  Decay    │ │               │
└───┬────┘  └─────────┘ └───────────┘ └───────────────┘
    │
┌───▼─────────┐
│ MemoryNode  │
└─────────────┘
```

## Future Enhancements

Potential improvements:

1. **Semantic Similarity**
   - Embedding-based similarity matching
   - Automatic concept clustering

2. **Learning Algorithms**
   - Hebbian learning ("neurons that fire together")
   - Adaptive decay rates based on usage

3. **Multi-modal Memory**
   - Image node support
   - Audio/video embeddings

4. **Distributed Storage**
   - Database backend (SQLite, PostgreSQL)
   - Remote graph sync

5. **Query Language**
   - Cypher-like query syntax
   - Pattern matching

## References

Inspired by:
- Spreading activation theory (Collins & Loftus, 1975)
- Forgetting curves (Ebbinghaus, Wixted)
- ACT-R cognitive architecture
- Human episodic memory systems
- Spaced repetition algorithms

## License

MIT

## Contributing

When contributing:
1. Add tests for new features
2. Update SKILL.md documentation
3. Follow existing code style
4. Ensure `npm test` passes

---

**Status:** Production Ready ✓  
**Tier:** 4 (Advanced)  
**Dependencies:** None (pure Node.js)  
**Test Coverage:** Comprehensive
