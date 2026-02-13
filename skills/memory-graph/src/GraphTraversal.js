/**
 * GraphTraversal - Associative recall via graph traversal
 */
export class GraphTraversal {
  constructor(graph) {
    this.graph = graph;
  }

  /**
   * Spreading activation - core associative recall algorithm
   * Activates a starting node and spreads activation through connected nodes
   */
  spreadingActivation(startNodeId, options = {}) {
    const {
      maxDepth = 3,
      decayFactor = 0.7,
      minActivation = 0.1,
      maxResults = 20
    } = options;

    const activations = new Map();
    const queue = [{ nodeId: startNodeId, activation: 1.0, depth: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
      const { nodeId, activation, depth } = queue.shift();

      if (visited.has(nodeId) || depth > maxDepth || activation < minActivation) {
        continue;
      }

      visited.add(nodeId);
      activations.set(nodeId, (activations.get(nodeId) || 0) + activation);

      const node = this.graph.getNode(nodeId);
      if (!node) continue;

      // Spread to neighbors
      for (const [neighborId, edge] of node.edges) {
        const neighborActivation = activation * edge.weight * decayFactor;
        if (neighborActivation >= minActivation) {
          queue.push({
            nodeId: neighborId,
            activation: neighborActivation,
            depth: depth + 1
          });
        }
      }
    }

    // Convert to sorted results
    return Array.from(activations.entries())
      .map(([nodeId, activation]) => ({
        node: this.graph.getNode(nodeId),
        activation
      }))
      .filter(r => r.node)
      .sort((a, b) => b.activation - a.activation)
      .slice(0, maxResults);
  }

  /**
   * Find shortest path between two nodes (BFS)
   */
  findPath(startNodeId, endNodeId, maxDepth = 5) {
    const queue = [{ nodeId: startNodeId, path: [startNodeId] }];
    const visited = new Set([startNodeId]);

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift();

      if (nodeId === endNodeId) {
        return path;
      }

      if (path.length >= maxDepth) {
        continue;
      }

      const node = this.graph.getNode(nodeId);
      if (!node) continue;

      for (const neighborId of node.edges.keys()) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({
            nodeId: neighborId,
            path: [...path, neighborId]
          });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Find all nodes within K hops of start node
   */
  findNeighborhood(startNodeId, k = 2) {
    const neighborhood = new Map(); // nodeId -> distance
    const queue = [{ nodeId: startNodeId, distance: 0 }];
    neighborhood.set(startNodeId, 0);

    while (queue.length > 0) {
      const { nodeId, distance } = queue.shift();

      if (distance >= k) continue;

      const node = this.graph.getNode(nodeId);
      if (!node) continue;

      for (const neighborId of node.edges.keys()) {
        if (!neighborhood.has(neighborId)) {
          neighborhood.set(neighborId, distance + 1);
          queue.push({ nodeId: neighborId, distance: distance + 1 });
        }
      }
    }

    return Array.from(neighborhood.entries())
      .map(([nodeId, distance]) => ({
        node: this.graph.getNode(nodeId),
        distance
      }))
      .filter(r => r.node);
  }

  /**
   * Find most connected nodes (hub detection)
   */
  findHubs(limit = 10) {
    return Array.from(this.graph.nodes.values())
      .map(node => ({
        node,
        degree: node.edges.size,
        weightedDegree: Array.from(node.edges.values())
          .reduce((sum, edge) => sum + edge.weight, 0)
      }))
      .sort((a, b) => b.weightedDegree - a.weightedDegree)
      .slice(0, limit);
  }

  /**
   * Temporal-weighted recall - combines graph traversal with time decay
   */
  temporalRecall(startNodeId, options = {}) {
    const {
      maxDepth = 3,
      maxResults = 20,
      temporalWeight = 0.5 // 0 = only structure, 1 = only temporal
    } = options;

    const results = this.spreadingActivation(startNodeId, {
      maxDepth,
      maxResults: maxResults * 2 // Get more candidates
    });

    const currentTime = Date.now();

    // Combine activation with temporal relevance
    return results
      .map(({ node, activation }) => {
        const temporalRelevance = node.calculateRelevance(
          currentTime,
          this.graph.options.defaultDecayRate
        );
        
        const combinedScore = 
          (1 - temporalWeight) * activation +
          temporalWeight * temporalRelevance;

        return { node, activation, temporalRelevance, combinedScore };
      })
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, maxResults);
  }

  /**
   * Context-aware recall - uses multiple cues simultaneously
   */
  contextualRecall(cueNodeIds, options = {}) {
    const { maxResults = 20 } = options;
    const activationMaps = new Map();

    // Run spreading activation from each cue
    for (const cueId of cueNodeIds) {
      const results = this.spreadingActivation(cueId, options);
      
      results.forEach(({ node, activation }) => {
        const current = activationMaps.get(node.id) || 0;
        activationMaps.set(node.id, current + activation);
      });
    }

    // Sort by combined activation
    return Array.from(activationMaps.entries())
      .map(([nodeId, activation]) => ({
        node: this.graph.getNode(nodeId),
        activation: activation / cueNodeIds.length // Normalize
      }))
      .filter(r => r.node)
      .sort((a, b) => b.activation - a.activation)
      .slice(0, maxResults);
  }
}
