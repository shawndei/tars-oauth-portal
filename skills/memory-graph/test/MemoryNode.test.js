import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MemoryNode } from '../src/MemoryNode.js';

describe('MemoryNode', () => {
  it('should create a node with content and metadata', () => {
    const node = new MemoryNode('test-1', 'Test content', {
      importance: 0.8,
      type: 'fact'
    });

    assert.strictEqual(node.id, 'test-1');
    assert.strictEqual(node.content, 'Test content');
    assert.strictEqual(node.metadata.importance, 0.8);
    assert.strictEqual(node.metadata.type, 'fact');
    assert.ok(node.metadata.timestamp);
  });

  it('should add and retrieve edges', () => {
    const node = new MemoryNode('node-1', 'Content');
    node.addEdge('node-2', 0.7, 'causal');

    const edge = node.getEdge('node-2');
    assert.ok(edge);
    assert.strictEqual(edge.weight, 0.7);
    assert.strictEqual(edge.type, 'causal');
  });

  it('should update edge weights', () => {
    const node = new MemoryNode('node-1', 'Content');
    node.addEdge('node-2', 0.5);
    
    node.updateEdgeWeight('node-2', 0.2);
    const edge = node.getEdge('node-2');
    assert.strictEqual(edge.weight, 0.7);
    
    // Should not exceed 1.0
    node.updateEdgeWeight('node-2', 0.5);
    assert.strictEqual(edge.weight, 1.0);
  });

  it('should record access and update metadata', () => {
    const node = new MemoryNode('node-1', 'Content');
    const initialAccess = node.metadata.lastAccessed;
    
    // Wait a bit
    setTimeout(() => {
      node.recordAccess();
      assert.strictEqual(node.metadata.accessCount, 1);
      assert.ok(node.metadata.lastAccessed >= initialAccess);
    }, 10);
  });

  it('should calculate relevance with temporal decay', () => {
    const node = new MemoryNode('node-1', 'Content', { importance: 0.8 });
    
    const currentTime = Date.now();
    const relevance1 = node.calculateRelevance(currentTime);
    
    // Future time should have lower relevance
    const futureTime = currentTime + 10000000; // ~3 hours
    const relevance2 = node.calculateRelevance(futureTime);
    
    assert.ok(relevance2 < relevance1);
  });

  it('should serialize and deserialize', () => {
    const node = new MemoryNode('node-1', 'Test content', {
      importance: 0.9,
      type: 'episodic'
    });
    node.addEdge('node-2', 0.7, 'association');
    node.addEdge('node-3', 0.5, 'temporal');

    const json = node.toJSON();
    const restored = MemoryNode.fromJSON(json);

    assert.strictEqual(restored.id, node.id);
    assert.strictEqual(restored.content, node.content);
    assert.strictEqual(restored.metadata.importance, node.metadata.importance);
    assert.strictEqual(restored.edges.size, 2);
    assert.ok(restored.getEdge('node-2'));
    assert.strictEqual(restored.getEdge('node-2').weight, 0.7);
  });

  it('should remove edges', () => {
    const node = new MemoryNode('node-1', 'Content');
    node.addEdge('node-2', 0.5);
    node.addEdge('node-3', 0.7);

    assert.strictEqual(node.edges.size, 2);
    node.removeEdge('node-2');
    assert.strictEqual(node.edges.size, 1);
    assert.ok(!node.getEdge('node-2'));
    assert.ok(node.getEdge('node-3'));
  });
});
