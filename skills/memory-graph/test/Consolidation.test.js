import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MemoryGraph } from '../src/MemoryGraph.js';
import { Consolidation } from '../src/Consolidation.js';

describe('Consolidation', () => {
  it('should prune low-relevance nodes', () => {
    const graph = new MemoryGraph();
    const consolidation = new Consolidation(graph, { minImportance: 0.3 });

    const node1 = graph.createNode('Important', { importance: 0.8 });
    const node2 = graph.createNode('Low importance', { importance: 0.1 });
    const node3 = graph.createNode('Medium', { importance: 0.5 });

    // Make node2 old
    node2.metadata.lastAccessed = Date.now() - 100000000;
    node2.metadata.timestamp = Date.now() - 100000000;

    const result = consolidation.pruneNodes(Date.now(), {
      minRelevance: 0.2,
      protectRecent: 0
    });

    assert.ok(result.pruned > 0);
    assert.ok(result.nodes.some(n => n.id === node2.id));
  });

  it('should protect recent nodes from pruning', () => {
    const graph = new MemoryGraph();
    const consolidation = new Consolidation(graph);

    const recent = graph.createNode('Recent', { importance: 0.1 });
    const old = graph.createNode('Old', { importance: 0.1 });
    
    old.metadata.timestamp = Date.now() - 200000000;
    old.metadata.lastAccessed = Date.now() - 200000000;

    const result = consolidation.pruneNodes(Date.now(), {
      minRelevance: 0.3,
      protectRecent: 86400000 // 24h
    });

    // Old node should be pruned, recent protected
    assert.ok(!graph.getNode(old.id) || result.nodes.some(n => n.id === old.id));
    assert.ok(graph.getNode(recent.id));
  });

  it('should prune weak edges', () => {
    const graph = new MemoryGraph();
    const consolidation = new Consolidation(graph, { minEdgeWeight: 0.3 });

    const node1 = graph.createNode('Node 1');
    const node2 = graph.createNode('Node 2');
    const node3 = graph.createNode('Node 3');

    graph.associate(node1.id, node2.id, 0.8); // Strong
    graph.associate(node1.id, node3.id, 0.1); // Weak

    const result = consolidation.pruneEdges({
      minWeight: 0.3
    });

    assert.ok(result.pruned > 0);
    assert.ok(node1.getEdge(node2.id)); // Strong edge preserved
    assert.ok(!node1.getEdge(node3.id)); // Weak edge removed
  });

  it('should support dry-run mode', () => {
    const graph = new MemoryGraph();
    const consolidation = new Consolidation(graph);

    const node = graph.createNode('Test', { importance: 0.05 });
    node.metadata.timestamp = Date.now() - 100000000;
    node.metadata.lastAccessed = Date.now() - 100000000;

    const result = consolidation.pruneNodes(Date.now(), {
      minRelevance: 0.2,
      protectRecent: 0,
      dryRun: true
    });

    assert.ok(result.dryRun);
    assert.ok(result.pruned > 0);
    // Node should still exist
    assert.ok(graph.getNode(node.id));
  });

  it('should consolidate similar nodes', () => {
    const graph = new MemoryGraph();
    const consolidation = new Consolidation(graph);

    const node1 = graph.createNode({ text: 'similar content', id: 1 });
    const node2 = graph.createNode({ text: 'similar content', id: 2 });
    const node3 = graph.createNode({ text: 'different content', id: 3 });

    // Simple similarity function based on text
    const similarityFn = (content1, content2) => {
      if (content1.text === content2.text) return 1.0;
      return 0.0;
    };

    const result = consolidation.consolidateSimilarNodes(similarityFn, 0.9);

    assert.ok(result.consolidated > 0);
    // One of the similar nodes should be merged
    const remaining = [node1, node2, node3].filter(n => graph.getNode(n.id));
    assert.ok(remaining.length < 3);
  });

  it('should merge edges during consolidation', () => {
    const graph = new MemoryGraph();
    const consolidation = new Consolidation(graph);

    const node1 = graph.createNode({ text: 'duplicate', id: 1 });
    const node2 = graph.createNode({ text: 'duplicate', id: 2 });
    const target = graph.createNode({ text: 'target', id: 3 });

    graph.associate(node1.id, target.id, 0.5);
    graph.associate(node2.id, target.id, 0.3);

    const similarityFn = (c1, c2) => c1.text === c2.text ? 1.0 : 0.0;
    consolidation.consolidateSimilarNodes(similarityFn, 0.9);

    // The remaining node should have combined edge weight
    const survivor = graph.getNode(node1.id) || graph.getNode(node2.id);
    assert.ok(survivor);
    
    const edge = survivor.getEdge(target.id);
    assert.ok(edge);
    assert.ok(edge.weight > 0.5); // Should be boosted from merge
  });

  it('should enforce node limit', () => {
    const graph = new MemoryGraph();
    const consolidation = new Consolidation(graph, { maxNodes: 5 });

    // Create more nodes than limit
    for (let i = 0; i < 10; i++) {
      const node = graph.createNode(`Memory ${i}`, { importance: Math.random() });
      node.metadata.lastAccessed = Date.now() - i * 1000000;
    }

    const result = consolidation.enforceNodeLimit(5);

    assert.strictEqual(graph.nodes.size, 5);
    assert.strictEqual(result.pruned, 5);
  });

  it('should keep most relevant nodes when enforcing limit', () => {
    const graph = new MemoryGraph();
    const consolidation = new Consolidation(graph, { maxNodes: 3 });

    const important = graph.createNode('Important', { importance: 0.9 });
    const medium = graph.createNode('Medium', { importance: 0.5 });
    const low1 = graph.createNode('Low 1', { importance: 0.2 });
    const low2 = graph.createNode('Low 2', { importance: 0.1 });

    consolidation.enforceNodeLimit(2);

    assert.ok(graph.getNode(important.id));
    assert.ok(graph.getNode(medium.id) || graph.getNode(low1.id));
    assert.strictEqual(graph.nodes.size, 2);
  });

  it('should reinforce important paths', () => {
    const graph = new MemoryGraph();
    const consolidation = new Consolidation(graph);

    const hub = graph.createNode('Hub');
    const spoke1 = graph.createNode('Spoke 1');
    const spoke2 = graph.createNode('Spoke 2');

    graph.associate(hub.id, spoke1.id, 0.4);
    graph.associate(hub.id, spoke2.id, 0.5);

    const result = consolidation.reinforceImportantPaths([hub], 1);

    assert.ok(result.reinforced > 0);
    
    // Edges should be strengthened
    const edge1 = hub.getEdge(spoke1.id);
    const edge2 = hub.getEdge(spoke2.id);
    assert.ok(edge1.weight > 0.4);
    assert.ok(edge2.weight > 0.5);
  });

  it('should provide consolidation recommendations', () => {
    const graph = new MemoryGraph({ maxNodes: 10 });
    const consolidation = new Consolidation(graph);

    // Create conditions for recommendations
    for (let i = 0; i < 8; i++) {
      const node = graph.createNode(`Memory ${i}`, { importance: 0.05 });
      node.metadata.lastAccessed = Date.now() - 100000000;
    }

    const node1 = graph.createNode('Node 1');
    const node2 = graph.createNode('Node 2');
    graph.associate(node1.id, node2.id, 0.01); // Weak edge

    const recommendations = consolidation.getRecommendations();

    assert.ok(Array.isArray(recommendations));
    assert.ok(recommendations.length > 0);
    assert.ok(recommendations.every(r => r.type && r.priority && r.description));
  });

  it('should run automatic maintenance', () => {
    const graph = new MemoryGraph({ maxNodes: 5 });
    const consolidation = new Consolidation(graph, { maxNodes: 5 });

    // Create test data with old timestamps
    const now = Date.now();
    for (let i = 0; i < 8; i++) {
      const node = graph.createNode({ text: `Memory`, id: i }, { importance: 0.1 });
      node.metadata.lastAccessed = now - 100000000; // Make them old
      if (i > 0) {
        const firstNode = Array.from(graph.nodes.values())[0];
        graph.associate(node.id, firstNode.id, 0.01);
      }
    }

    const result = consolidation.autoMaintenance(now, {
      aggressive: true
    });

    assert.ok(result.operations.length > 0);
    assert.ok(result.nodesPruned >= 0 || result.edgesPruned >= 0);
    assert.ok(graph.nodes.size <= 5);
  });
});
