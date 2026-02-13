/**
 * Basic Memory Graph Usage Examples
 */

import { createMemorySystem } from '../src/index.js';

// Example 1: Simple Knowledge Graph
function knowledgeGraphExample() {
  console.log('\n=== Knowledge Graph Example ===\n');
  
  const memory = createMemorySystem();

  // Store facts
  const paris = memory.remember('Paris', { type: 'city', importance: 0.8 });
  const france = memory.remember('France', { type: 'country', importance: 0.8 });
  const europe = memory.remember('Europe', { type: 'continent', importance: 0.7 });
  
  const fact1 = memory.remember('Paris is the capital of France', {
    type: 'fact',
    importance: 0.9
  });
  
  const fact2 = memory.remember('France is in Europe', {
    type: 'fact',
    importance: 0.9
  });

  // Create semantic associations
  memory.associate(paris.id, fact1.id, 0.95, 'describes');
  memory.associate(france.id, fact1.id, 0.95, 'describes');
  memory.associate(france.id, fact2.id, 0.95, 'describes');
  memory.associate(europe.id, fact2.id, 0.95, 'describes');
  
  // Recall from Paris
  const recalled = memory.recall(paris.id, {
    maxDepth: 2,
    temporalWeight: 0.3
  });

  console.log(`Starting from "${paris.content}", recalled:`);
  recalled.slice(0, 5).forEach(r => {
    console.log(`  - ${r.node.content} (score: ${r.combinedScore.toFixed(3)})`);
  });
}

// Example 2: Episodic Memory Sequence
function episodicMemoryExample() {
  console.log('\n=== Episodic Memory Example ===\n');
  
  const memory = createMemorySystem();

  // Create a sequence of events
  const events = [
    { time: 0, text: 'Woke up at 7am', tags: ['morning', 'routine'] },
    { time: 1, text: 'Had breakfast', tags: ['morning', 'meal'] },
    { time: 2, text: 'Read the news', tags: ['morning', 'information'] },
    { time: 3, text: 'Started working on project', tags: ['work', 'coding'] },
    { time: 4, text: 'Had a team meeting', tags: ['work', 'collaboration'] }
  ];

  const eventNodes = events.map((evt, i) => {
    const node = memory.remember(evt.text, {
      type: 'episodic',
      timestamp: Date.now() - (events.length - i) * 3600000,
      tags: evt.tags,
      importance: 0.6 + Math.random() * 0.2
    });
    return node;
  });

  // Link events in temporal sequence
  for (let i = 0; i < eventNodes.length - 1; i++) {
    memory.associate(eventNodes[i].id, eventNodes[i + 1].id, 0.9, 'temporal_next');
  }

  // Recall the morning routine
  console.log('Morning routine events:');
  const morningEvents = memory.graph.findByTag('morning');
  morningEvents.forEach(node => {
    console.log(`  - ${node.content}`);
  });

  // Recall from first event
  console.log('\nRecalling from first event:');
  const sequence = memory.recall(eventNodes[0].id, {
    maxDepth: 5,
    temporalWeight: 0.8
  });
  
  sequence.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.node.content}`);
  });
}

// Example 3: Contextual Recall with Multiple Cues
function contextualRecallExample() {
  console.log('\n=== Contextual Recall Example ===\n');
  
  const memory = createMemorySystem();

  // Create a project network
  const project = memory.remember('AI Assistant Project', { type: 'project' });
  const python = memory.remember('Python', { type: 'language' });
  const nodejs = memory.remember('Node.js', { type: 'language' });
  const nlp = memory.remember('Natural Language Processing', { type: 'domain' });
  const deadline = memory.remember('Deadline: March 15', { type: 'constraint' });
  const team = memory.remember('Team: 5 developers', { type: 'resource' });

  // Create associations
  memory.associate(project.id, python.id, 0.8);
  memory.associate(project.id, nodejs.id, 0.7);
  memory.associate(project.id, nlp.id, 0.9);
  memory.associate(project.id, deadline.id, 0.95);
  memory.associate(project.id, team.id, 0.85);

  // Query with multiple context cues
  const results = memory.traversal.contextualRecall(
    [python.id, nlp.id],
    { maxDepth: 2, maxResults: 10 }
  );

  console.log('Context: Python + NLP');
  console.log('Recalled nodes:');
  results.forEach(r => {
    console.log(`  - ${r.node.content} (activation: ${r.activation.toFixed(3)})`);
  });
}

// Example 4: Temporal Decay and Spaced Repetition
function spacedRepetitionExample() {
  console.log('\n=== Spaced Repetition Example ===\n');
  
  const memory = createMemorySystem();

  // Create study materials
  const concepts = [
    'Quantum entanglement',
    'Schrödinger equation',
    'Wave-particle duality',
    'Heisenberg uncertainty principle'
  ];

  const nodes = concepts.map(concept => {
    return memory.remember(concept, {
      type: 'knowledge',
      importance: 0.7,
      reviewCount: Math.floor(Math.random() * 3)
    });
  });

  // Simulate different last access times
  nodes.forEach((node, i) => {
    node.metadata.lastAccessed = Date.now() - i * 86400000; // Days ago
  });

  console.log('Study materials and next review times:');
  nodes.forEach(node => {
    const nextReview = memory.decay.getNextReviewTime(node.id);
    const daysUntilReview = Math.ceil((nextReview - Date.now()) / 86400000);
    
    console.log(`  - ${node.content}`);
    console.log(`    Review count: ${node.metadata.reviewCount || 0}`);
    console.log(`    Next review: ${daysUntilReview} days\n`);
  });

  // Check what's due now
  const dueNodes = memory.decay.getDueForReview();
  console.log(`Currently due for review: ${dueNodes.length} items`);
}

// Example 5: Memory Maintenance
function maintenanceExample() {
  console.log('\n=== Memory Maintenance Example ===\n');
  
  const memory = createMemorySystem({ maxNodes: 100 });

  // Create lots of memories
  const now = Date.now();
  for (let i = 0; i < 120; i++) {
    const node = memory.remember({ text: 'Memory', id: i }, {
      importance: Math.random(),
      type: i % 3 === 0 ? 'important' : 'routine'
    });
    
    // Make some old
    if (i % 2 === 0) {
      node.metadata.lastAccessed = now - Math.random() * 30 * 86400000;
    }
  }

  console.log(`Created ${memory.graph.nodes.size} memories`);

  // Get maintenance recommendations
  const recommendations = memory.consolidation.getRecommendations();
  console.log('\nMaintenance recommendations:');
  recommendations.forEach(rec => {
    console.log(`  [${rec.priority.toUpperCase()}] ${rec.description}`);
  });

  // Apply maintenance
  const result = memory.maintain({ aggressive: true });
  
  console.log('\nMaintenance results:');
  console.log(`  - Nodes pruned: ${result.nodesPruned}`);
  console.log(`  - Edges pruned: ${result.edgesPruned}`);
  console.log(`  - Final node count: ${memory.graph.nodes.size}`);
  
  const stats = memory.graph.getStats();
  console.log(`  - Average edges per node: ${stats.avgEdgesPerNode.toFixed(2)}`);
}

// Example 6: Graph Statistics and Analysis
function statisticsExample() {
  console.log('\n=== Graph Statistics Example ===\n');
  
  const memory = createMemorySystem();

  // Create a small network
  const concepts = ['AI', 'ML', 'DL', 'NLP', 'CV', 'RL', 'TF', 'PyTorch'];
  const nodes = concepts.map(c => memory.remember(c, { type: 'technology' }));

  // Create connections (AI is connected to everything)
  nodes.slice(1).forEach(node => {
    memory.associate(nodes[0].id, node.id, 0.5 + Math.random() * 0.4);
  });

  // ML connected to DL, NLP, CV
  [2, 3, 4].forEach(i => {
    memory.associate(nodes[1].id, nodes[i].id, 0.7 + Math.random() * 0.2);
  });

  // Get statistics
  const stats = memory.graph.getStats();
  console.log('Graph statistics:');
  console.log(`  - Total nodes: ${stats.nodeCount}`);
  console.log(`  - Total edges: ${stats.edgeCount}`);
  console.log(`  - Avg edges per node: ${stats.avgEdgesPerNode.toFixed(2)}`);
  console.log(`  - Max edges: ${stats.maxEdges}`);
  console.log(`  - Min edges: ${stats.minEdges}`);

  // Find hubs
  const hubs = memory.traversal.findHubs(3);
  console.log('\nTop 3 hub nodes:');
  hubs.forEach((hub, i) => {
    console.log(`  ${i + 1}. ${hub.node.content} (degree: ${hub.degree}, weighted: ${hub.weightedDegree.toFixed(2)})`);
  });

  // Find neighborhood
  const neighborhood = memory.traversal.findNeighborhood(nodes[0].id, 2);
  console.log(`\nNeighborhood of "${nodes[0].content}" (within 2 hops):`);
  neighborhood.forEach(n => {
    console.log(`  - ${n.node.content} (distance: ${n.distance})`);
  });
}

// Run all examples
console.log('╔═══════════════════════════════════════════════╗');
console.log('║     Memory Graph Usage Examples               ║');
console.log('╚═══════════════════════════════════════════════╝');

knowledgeGraphExample();
episodicMemoryExample();
contextualRecallExample();
spacedRepetitionExample();
maintenanceExample();
statisticsExample();

console.log('\n✅ All examples completed!\n');
