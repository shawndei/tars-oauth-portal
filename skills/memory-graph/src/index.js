/**
 * Memory Graph - Graph-based memory networks with associative recall
 * 
 * Main exports for the memory graph skill
 */

import { MemoryNode } from './MemoryNode.js';
import { MemoryGraph } from './MemoryGraph.js';
import { GraphTraversal } from './GraphTraversal.js';
import { TemporalDecay } from './TemporalDecay.js';
import { Consolidation } from './Consolidation.js';

export { MemoryNode, MemoryGraph, GraphTraversal, TemporalDecay, Consolidation };

/**
 * Create a complete memory system with all components
 */
export function createMemorySystem(options = {}) {
  const graph = new MemoryGraph(options);
  const traversal = new GraphTraversal(graph);
  const decay = new TemporalDecay(graph, options);
  const consolidation = new Consolidation(graph, options);

  return {
    graph,
    traversal,
    decay,
    consolidation,

    // Convenience methods
    remember(content, metadata) {
      return graph.createNode(content, metadata);
    },

    recall(nodeId, options) {
      return traversal.temporalRecall(nodeId, options);
    },

    associate(nodeId1, nodeId2, weight, type) {
      return graph.associate(nodeId1, nodeId2, weight, type);
    },

    maintain(options) {
      decay.applyDecay();
      return consolidation.autoMaintenance(Date.now(), options);
    },

    export() {
      return graph.toJSON();
    },

    import(data) {
      const imported = MemoryGraph.fromJSON(data);
      Object.assign(graph, imported);
      return graph;
    }
  };
}
