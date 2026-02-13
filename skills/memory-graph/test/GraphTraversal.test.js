import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MemoryGraph } from '../src/MemoryGraph.js';
import { GraphTraversal } from '../src/GraphTraversal.js';

describe('GraphTraversal', () => {
  function createTestGraph() {
    const graph = new MemoryGraph();
    
    // Create a small network
    const n1 = graph.createNode('Concept A', { importance: 0.9 });
    const n2 = graph.createNode('Concept B', { importance: 0.8 });
    const n3 = graph.createNode('Concept C', { importance: 0.7 });
    const n4 = graph.createNode('Concept D', { importance: 0.6 });
    const n5 = graph.createNode('Concept E', { importance: 0.5 });

    // Create connections
    graph.associate(n1.id, n2.id, 0.9);
    graph.associate(n1.id, n3.id, 0.7);
    graph.associate(n2.id, n4.id, 0.8);
    graph.associate(n3.id, n4.id, 0.6);
    graph.associate(n4.id, n5.id, 0.5);

    return { graph, nodes: [n1, n2, n3, n4, n5] };
  }

  it('should perform spreading activation', () => {
    const { graph, nodes } = createTestGraph();
    const traversal = new GraphTraversal(graph);

    const results = traversal.spreadingActivation(nodes[0].id, {
      maxDepth: 2,
      maxResults: 10
    });

    assert.ok(results.length > 0);
    assert.ok(results[0].activation <= 1.0);
    
    // Results should be sorted by activation
    for (let i = 1; i < results.length; i++) {
      assert.ok(results[i - 1].activation >= results[i].activation);
    }
  });

  it('should find shortest path between nodes', () => {
    const { graph, nodes } = createTestGraph();
    const traversal = new GraphTraversal(graph);

    const path = traversal.findPath(nodes[0].id, nodes[4].id);
    
    assert.ok(path);
    assert.ok(Array.isArray(path));
    assert.strictEqual(path[0], nodes[0].id);
    assert.strictEqual(path[path.length - 1], nodes[4].id);
  });

  it('should return null when no path exists', () => {
    const graph = new MemoryGraph();
    const n1 = graph.createNode('Isolated 1');
    const n2 = graph.createNode('Isolated 2');
    
    const traversal = new GraphTraversal(graph);
    const path = traversal.findPath(n1.id, n2.id);
    
    assert.strictEqual(path, null);
  });

  it('should find neighborhood within k hops', () => {
    const { graph, nodes } = createTestGraph();
    const traversal = new GraphTraversal(graph);

    const neighborhood = traversal.findNeighborhood(nodes[0].id, 2);
    
    assert.ok(neighborhood.length > 0);
    assert.ok(neighborhood.every(n => n.distance <= 2));
    
    // Should include starting node
    const startNode = neighborhood.find(n => n.node.id === nodes[0].id);
    assert.ok(startNode);
    assert.strictEqual(startNode.distance, 0);
  });

  it('should identify hub nodes', () => {
    const { graph, nodes } = createTestGraph();
    const traversal = new GraphTraversal(graph);

    const hubs = traversal.findHubs(3);
    
    assert.ok(hubs.length > 0);
    assert.ok(hubs.length <= 3);
    
    // Should be sorted by degree
    for (let i = 1; i < hubs.length; i++) {
      assert.ok(hubs[i - 1].weightedDegree >= hubs[i].weightedDegree);
    }
  });

  it('should perform temporal recall', () => {
    const { graph, nodes } = createTestGraph();
    const traversal = new GraphTraversal(graph);

    const results = traversal.temporalRecall(nodes[0].id, {
      maxDepth: 2,
      maxResults: 5,
      temporalWeight: 0.5
    });

    assert.ok(results.length > 0);
    assert.ok(results[0].combinedScore);
    assert.ok(results[0].temporalRelevance);
    assert.ok(results[0].activation);
  });

  it('should perform contextual recall with multiple cues', () => {
    const { graph, nodes } = createTestGraph();
    const traversal = new GraphTraversal(graph);

    const results = traversal.contextualRecall(
      [nodes[0].id, nodes[1].id],
      { maxDepth: 2, maxResults: 5 }
    );

    assert.ok(results.length > 0);
    
    // Nodes connected to both cues should rank higher
    assert.ok(results.every(r => r.activation > 0));
  });

  it('should respect maxDepth in spreading activation', () => {
    const { graph, nodes } = createTestGraph();
    const traversal = new GraphTraversal(graph);

    const shallow = traversal.spreadingActivation(nodes[0].id, {
      maxDepth: 1,
      maxResults: 10
    });

    const deep = traversal.spreadingActivation(nodes[0].id, {
      maxDepth: 3,
      maxResults: 10
    });

    // Deeper search should find more nodes
    assert.ok(deep.length >= shallow.length);
  });

  it('should respect minActivation threshold', () => {
    const { graph, nodes } = createTestGraph();
    const traversal = new GraphTraversal(graph);

    const results = traversal.spreadingActivation(nodes[0].id, {
      maxDepth: 3,
      minActivation: 0.3
    });

    // All results should have activation >= minActivation
    assert.ok(results.every(r => r.activation >= 0.3));
  });
});
