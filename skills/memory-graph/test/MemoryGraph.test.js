import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MemoryGraph } from '../src/MemoryGraph.js';

describe('MemoryGraph', () => {
  it('should create nodes', () => {
    const graph = new MemoryGraph();
    const node = graph.createNode('Test memory', { type: 'fact' });

    assert.ok(node);
    assert.ok(node.id);
    assert.strictEqual(node.content, 'Test memory');
    assert.strictEqual(graph.nodes.size, 1);
  });

  it('should return existing node for duplicate content', () => {
    const graph = new MemoryGraph();
    const node1 = graph.createNode('Same content');
    const node2 = graph.createNode('Same content');

    assert.strictEqual(node1.id, node2.id);
    assert.strictEqual(graph.nodes.size, 1);
    assert.strictEqual(node1.metadata.accessCount, 1); // Second create = access
  });

  it('should create bidirectional associations', () => {
    const graph = new MemoryGraph();
    const node1 = graph.createNode('Node 1');
    const node2 = graph.createNode('Node 2');

    graph.associate(node1.id, node2.id, 0.8, 'causal');

    assert.ok(node1.getEdge(node2.id));
    assert.ok(node2.getEdge(node1.id));
    assert.strictEqual(node1.getEdge(node2.id).weight, 0.8);
    assert.strictEqual(node1.getEdge(node2.id).type, 'causal');
  });

  it('should create directed associations', () => {
    const graph = new MemoryGraph();
    const node1 = graph.createNode('Source');
    const node2 = graph.createNode('Target');

    graph.associateDirected(node1.id, node2.id, 0.7);

    assert.ok(node1.getEdge(node2.id));
    assert.ok(!node2.getEdge(node1.id));
  });

  it('should reinforce connections', () => {
    const graph = new MemoryGraph();
    const node1 = graph.createNode('Node 1');
    const node2 = graph.createNode('Node 2');

    graph.associate(node1.id, node2.id, 0.5);
    graph.reinforceConnection(node1.id, node2.id, 0.3);

    assert.strictEqual(node1.getEdge(node2.id).weight, 0.8);
    assert.strictEqual(node2.getEdge(node1.id).weight, 0.8);
  });

  it('should find nodes by tag', () => {
    const graph = new MemoryGraph();
    graph.createNode('Memory 1', { tags: ['important', 'work'] });
    graph.createNode('Memory 2', { tags: ['important'] });
    graph.createNode('Memory 3', { tags: ['personal'] });

    const important = graph.findByTag('important');
    assert.strictEqual(important.length, 2);

    const work = graph.findByTag('work');
    assert.strictEqual(work.length, 1);
  });

  it('should find nodes by type', () => {
    const graph = new MemoryGraph();
    graph.createNode('Fact 1', { type: 'fact' });
    graph.createNode('Fact 2', { type: 'fact' });
    graph.createNode('Episode 1', { type: 'episodic' });

    const facts = graph.findByType('fact');
    assert.strictEqual(facts.length, 2);
  });

  it('should get neighbors', () => {
    const graph = new MemoryGraph();
    const node1 = graph.createNode('Center');
    const node2 = graph.createNode('Neighbor 1');
    const node3 = graph.createNode('Neighbor 2');
    const node4 = graph.createNode('Isolated');

    graph.associate(node1.id, node2.id);
    graph.associate(node1.id, node3.id);

    const neighbors = graph.getNeighbors(node1.id);
    assert.strictEqual(neighbors.length, 2);
    assert.ok(neighbors.some(n => n.id === node2.id));
    assert.ok(neighbors.some(n => n.id === node3.id));
  });

  it('should delete nodes and cleanup edges', () => {
    const graph = new MemoryGraph();
    const node1 = graph.createNode('Node 1');
    const node2 = graph.createNode('Node 2');
    const node3 = graph.createNode('Node 3');

    graph.associate(node1.id, node2.id);
    graph.associate(node2.id, node3.id);

    // Delete middle node
    graph.deleteNode(node2.id);

    assert.strictEqual(graph.nodes.size, 2);
    assert.ok(!graph.getNode(node2.id));
    assert.ok(!node1.getEdge(node2.id)); // Edge should be removed
    assert.ok(!node3.getEdge(node2.id));
  });

  it('should get graph statistics', () => {
    const graph = new MemoryGraph();
    const node1 = graph.createNode('Node 1');
    const node2 = graph.createNode('Node 2');
    const node3 = graph.createNode('Node 3');

    graph.associate(node1.id, node2.id);
    graph.associate(node1.id, node3.id);
    graph.associate(node2.id, node3.id);

    const stats = graph.getStats();
    assert.strictEqual(stats.nodeCount, 3);
    assert.strictEqual(stats.edgeCount, 6); // Bidirectional = 2 edges each
    assert.ok(stats.avgEdgesPerNode > 0);
  });

  it('should serialize and deserialize graph', () => {
    const graph = new MemoryGraph({ maxNodes: 5000 });
    const node1 = graph.createNode('Memory 1', { type: 'fact' });
    const node2 = graph.createNode('Memory 2', { type: 'episodic' });
    graph.associate(node1.id, node2.id, 0.9);

    const json = graph.toJSON();
    const restored = MemoryGraph.fromJSON(json);

    assert.strictEqual(restored.nodes.size, 2);
    assert.strictEqual(restored.options.maxNodes, 5000);
    
    const restoredNode1 = restored.getNode(node1.id);
    assert.ok(restoredNode1);
    assert.ok(restoredNode1.getEdge(node2.id));
  });
});
