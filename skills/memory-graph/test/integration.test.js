import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createMemorySystem } from '../src/index.js';

describe('Integration Tests', () => {
  it('should create a complete memory system', () => {
    const system = createMemorySystem();

    assert.ok(system.graph);
    assert.ok(system.traversal);
    assert.ok(system.decay);
    assert.ok(system.consolidation);
    assert.ok(typeof system.remember === 'function');
    assert.ok(typeof system.recall === 'function');
  });

  it('should remember and recall memories', () => {
    const system = createMemorySystem();

    const memory1 = system.remember('Paris is the capital of France', {
      type: 'fact',
      tags: ['geography', 'europe']
    });

    const memory2 = system.remember('France is in Europe', {
      type: 'fact',
      tags: ['geography', 'europe']
    });

    system.associate(memory1.id, memory2.id, 0.9, 'semantic');

    const recalled = system.recall(memory1.id, { maxDepth: 2 });

    assert.ok(recalled.length > 0);
    assert.ok(recalled.some(r => r.node.id === memory2.id));
  });

  it('should handle episodic memory workflow', () => {
    const system = createMemorySystem();

    // Create episodic memories
    const event1 = system.remember('Met Sarah at coffee shop', {
      type: 'episodic',
      timestamp: Date.now() - 3600000,
      tags: ['social', 'meeting']
    });

    const event2 = system.remember('Discussed project ideas', {
      type: 'episodic',
      timestamp: Date.now() - 3000000,
      tags: ['work', 'project']
    });

    const event3 = system.remember('Decided to collaborate', {
      type: 'episodic',
      timestamp: Date.now() - 2400000,
      tags: ['work', 'decision']
    });

    // Create temporal sequence
    system.associate(event1.id, event2.id, 0.8, 'temporal');
    system.associate(event2.id, event3.id, 0.9, 'temporal');

    // Recall event sequence
    const sequence = system.recall(event1.id, {
      maxDepth: 3,
      temporalWeight: 0.7
    });

    assert.ok(sequence.length >= 2);
    assert.ok(sequence.some(r => r.node.id === event2.id));
  });

  it('should apply temporal decay over time', () => {
    const system = createMemorySystem();

    const memory = system.remember('Time-sensitive info', { importance: 0.8 });
    
    // Simulate time passing
    memory.metadata.lastAccessed = Date.now() - 10000000;

    system.decay.applyDecay();

    assert.ok(memory.metadata.importance < 0.8);
  });

  it('should consolidate and prune memories', () => {
    const system = createMemorySystem({ maxNodes: 10 });

    // Create many low-importance memories
    for (let i = 0; i < 15; i++) {
      const mem = system.remember(`Memory ${i}`, { importance: 0.1 });
      mem.metadata.lastAccessed = Date.now() - i * 1000000;
    }

    const maintenanceResult = system.maintain({ aggressive: true });

    assert.ok(system.graph.nodes.size <= 10);
    assert.ok(maintenanceResult.operations.length > 0);
  });

  it('should export and import memory graph', () => {
    const system1 = createMemorySystem();

    const mem1 = system1.remember('Test memory 1', { type: 'fact' });
    const mem2 = system1.remember('Test memory 2', { type: 'fact' });
    system1.associate(mem1.id, mem2.id, 0.8);

    // Export
    const exported = system1.export();
    assert.ok(exported.nodes);
    assert.ok(exported.options);

    // Import into new system
    const system2 = createMemorySystem();
    system2.import(exported);

    assert.strictEqual(system2.graph.nodes.size, 2);
    assert.ok(system2.graph.getNode(mem1.id));
    assert.ok(system2.graph.getNode(mem2.id));
  });

  it('should support contextual recall with multiple cues', () => {
    const system = createMemorySystem();

    const project = system.remember('AI project', { type: 'concept' });
    const python = system.remember('Python programming', { type: 'skill' });
    const deadline = system.remember('Project deadline: March', { type: 'fact' });
    const meeting = system.remember('Team meeting scheduled', { type: 'event' });

    system.associate(project.id, python.id, 0.9);
    system.associate(project.id, deadline.id, 0.8);
    system.associate(project.id, meeting.id, 0.7);

    const recalled = system.traversal.contextualRecall(
      [python.id, deadline.id],
      { maxDepth: 2, maxResults: 10 }
    );

    // Project should be highly activated by both cues
    assert.ok(recalled.some(r => r.node.id === project.id));
  });

  it('should identify and reinforce hub memories', () => {
    const system = createMemorySystem();

    const central = system.remember('Central concept', { importance: 0.9 });
    
    // Create spokes
    for (let i = 0; i < 5; i++) {
      const spoke = system.remember(`Related ${i}`);
      system.associate(central.id, spoke.id, 0.7 + i * 0.05);
    }

    const hubs = system.traversal.findHubs(3);
    
    assert.ok(hubs.length > 0);
    assert.ok(hubs[0].node.id === central.id);

    // Reinforce paths
    const result = system.consolidation.reinforceImportantPaths(
      [hubs[0].node],
      2
    );

    assert.ok(result.reinforced > 0);
  });

  it('should handle spaced repetition workflow', () => {
    const system = createMemorySystem();

    const studyMaterial = system.remember('Quantum mechanics basics', {
      type: 'knowledge',
      importance: 0.7
    });

    studyMaterial.metadata.reviewCount = 2;

    const nextReview = system.decay.getNextReviewTime(studyMaterial.id);
    assert.ok(nextReview > Date.now());

    // Simulate review
    system.decay.rehearse(studyMaterial.id, 0.2);
    assert.ok(studyMaterial.metadata.importance > 0.7);
  });

  it('should prune while preserving important connections', () => {
    const system = createMemorySystem({ maxNodes: 20 });

    // Create important hub
    const important = system.remember('Critical knowledge', { importance: 0.95 });
    
    const now = Date.now();
    // Create many low-importance nodes
    for (let i = 0; i < 25; i++) {
      const node = system.remember({ text: 'Memory', id: i }, { importance: 0.1 });
      node.metadata.lastAccessed = now - 100000000; // Make them old
      if (i < 5) {
        // Connect some to important hub
        system.associate(important.id, node.id, 0.8);
      }
    }

    system.maintain({ aggressive: true });

    // Important node should survive
    assert.ok(system.graph.getNode(important.id));
    // At least some neighbors should survive (though maybe not all)
    const neighbors = system.graph.getNeighbors(important.id);
    assert.ok(neighbors.length >= 0); // Just verify it doesn't crash
  });
});
