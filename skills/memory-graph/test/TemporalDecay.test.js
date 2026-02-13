import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MemoryGraph } from '../src/MemoryGraph.js';
import { TemporalDecay } from '../src/TemporalDecay.js';

describe('TemporalDecay', () => {
  it('should calculate decay factors', () => {
    const graph = new MemoryGraph();
    const decay = new TemporalDecay(graph, { decayRate: 0.0001 });

    const factor1 = decay.calculateDecayFactor(0);
    const factor2 = decay.calculateDecayFactor(10000);
    const factor3 = decay.calculateDecayFactor(100000);

    assert.strictEqual(factor1, 1.0);
    assert.ok(factor2 < 1.0);
    assert.ok(factor3 < factor2);
  });

  it('should support different forgetting curves', () => {
    const graph = new MemoryGraph();
    const decay = new TemporalDecay(graph);

    const age = 100000;
    const exponential = decay.calculateDecayFactor(age, 'exponential');
    const linear = decay.calculateDecayFactor(age, 'linear');
    const power = decay.calculateDecayFactor(age, 'power');
    const logarithmic = decay.calculateDecayFactor(age, 'logarithmic');

    assert.ok(exponential < 1.0);
    assert.ok(linear < 1.0);
    assert.ok(power < 1.0);
    assert.ok(logarithmic < 1.0);
  });

  it('should apply decay to nodes and edges', () => {
    const graph = new MemoryGraph();
    const node1 = graph.createNode('Memory 1', { importance: 0.8 });
    const node2 = graph.createNode('Memory 2', { importance: 0.7 });
    graph.associate(node1.id, node2.id, 0.9);

    // Simulate time passing
    node1.metadata.lastAccessed = Date.now() - 1000000;
    node2.metadata.lastAccessed = Date.now() - 500000;

    const decay = new TemporalDecay(graph, { decayRate: 0.0001 });
    decay.applyDecay();

    // Importance should have decayed
    assert.ok(node1.metadata.importance < 0.8);
    assert.ok(node2.metadata.importance < 0.7);
    
    // But should not go below minimum
    assert.ok(node1.metadata.importance >= 0.01);
  });

  it('should identify at-risk nodes', () => {
    const graph = new MemoryGraph();
    const node1 = graph.createNode('Important but old');
    node1.metadata.lastAccessed = Date.now() - 10000000;
    node1.metadata.accessCount = 20;

    const node2 = graph.createNode('Recent');
    node2.metadata.lastAccessed = Date.now();
    node2.metadata.accessCount = 2;

    const decay = new TemporalDecay(graph, { decayRate: 0.0001 });
    const atRisk = decay.getAtRiskNodes(0.5);

    assert.ok(atRisk.some(item => item.node.id === node1.id));
  });

  it('should rehearse nodes and boost importance', () => {
    const graph = new MemoryGraph();
    const node1 = graph.createNode('To rehearse', { importance: 0.5 });
    const node2 = graph.createNode('Connected', { importance: 0.5 });
    graph.associate(node1.id, node2.id);

    const decay = new TemporalDecay(graph);
    const initialImportance = node1.metadata.importance;
    const connectedInitial = node2.metadata.importance;

    decay.rehearse(node1.id, 0.3);

    // Main node should have boosted importance
    assert.ok(node1.metadata.importance > initialImportance);
    assert.strictEqual(node1.metadata.accessCount, 1);
    
    // Connected nodes should have slight boost (priming)
    assert.ok(node2.metadata.importance > connectedInitial);
  });

  it('should calculate retention rate', () => {
    const graph = new MemoryGraph();
    const now = Date.now();

    // Create mix of recent and old nodes
    const recent1 = graph.createNode('Recent 1');
    const recent2 = graph.createNode('Recent 2');
    const old1 = graph.createNode('Old 1');
    const old2 = graph.createNode('Old 2');

    old1.metadata.lastAccessed = now - 200000000; // Very old
    old2.metadata.lastAccessed = now - 200000000;

    const decay = new TemporalDecay(graph);
    const retentionRate = decay.getRetentionRate(86400000); // 24h window

    assert.ok(retentionRate >= 0 && retentionRate <= 1);
    assert.ok(retentionRate < 1); // Some nodes are old
  });

  it('should implement spaced repetition schedule', () => {
    const graph = new MemoryGraph();
    const node = graph.createNode('Study material');
    node.metadata.reviewCount = 0;
    node.metadata.lastAccessed = Date.now();

    const decay = new TemporalDecay(graph);
    
    const nextReview1 = decay.getNextReviewTime(node.id);
    assert.ok(nextReview1);
    
    // Next review should be in the future
    assert.ok(nextReview1 > Date.now());
    
    // Increase review count
    node.metadata.reviewCount = 3;
    const nextReview2 = decay.getNextReviewTime(node.id);
    
    // Later reviews should be further apart
    assert.ok(nextReview2 > nextReview1);
  });

  it('should identify nodes due for review', () => {
    const graph = new MemoryGraph();
    
    const node1 = graph.createNode('Due for review');
    node1.metadata.lastAccessed = Date.now() - 10000000; // Long ago
    node1.metadata.reviewCount = 0;

    const node2 = graph.createNode('Recently reviewed');
    node2.metadata.lastAccessed = Date.now();
    node2.metadata.reviewCount = 1;

    const decay = new TemporalDecay(graph);
    const dueNodes = decay.getDueForReview();

    assert.ok(dueNodes.some(item => item.node.id === node1.id));
  });

  it('should not exceed max importance when boosting', () => {
    const graph = new MemoryGraph();
    const node = graph.createNode('High importance', { importance: 0.95 });

    const decay = new TemporalDecay(graph);
    decay.rehearse(node.id, 0.5);

    assert.ok(node.metadata.importance <= 1.0);
  });
});
