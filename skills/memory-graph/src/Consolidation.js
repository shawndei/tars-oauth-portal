/**
 * Consolidation - Memory pruning and consolidation strategies
 */
export class Consolidation {
  constructor(graph, options = {}) {
    this.graph = graph;
    this.options = {
      minImportance: options.minImportance || 0.1,
      minEdgeWeight: options.minEdgeWeight || 0.05,
      consolidationThreshold: options.consolidationThreshold || 0.8,
      maxNodes: options.maxNodes || 10000,
      ...options
    };
  }

  /**
   * Prune low-relevance nodes
   */
  pruneNodes(currentTime = Date.now(), options = {}) {
    const {
      minRelevance = this.options.minImportance,
      protectRecent = 86400000, // Protect nodes from last 24h
      dryRun = false
    } = options;

    const toRemove = [];
    const protectCutoff = currentTime - protectRecent;

    for (const node of this.graph.nodes.values()) {
      // Don't prune recent nodes
      if (node.metadata.timestamp > protectCutoff) continue;

      const relevance = node.calculateRelevance(currentTime, this.graph.options.defaultDecayRate);
      
      if (relevance < minRelevance) {
        toRemove.push({
          id: node.id,
          relevance,
          age: currentTime - node.metadata.timestamp,
          accessCount: node.metadata.accessCount
        });
      }
    }

    if (!dryRun) {
      toRemove.forEach(({ id }) => this.graph.deleteNode(id));
    }

    return {
      pruned: toRemove.length,
      nodes: toRemove,
      dryRun
    };
  }

  /**
   * Prune weak edges
   */
  pruneEdges(options = {}) {
    const {
      minWeight = this.options.minEdgeWeight,
      minAccessCount = 0,
      dryRun = false
    } = options;

    let prunedCount = 0;
    const prunedEdges = [];

    for (const node of this.graph.nodes.values()) {
      const toRemove = [];
      
      for (const [targetId, edge] of node.edges) {
        if (edge.weight < minWeight || edge.accessCount < minAccessCount) {
          toRemove.push(targetId);
          prunedEdges.push({
            from: node.id,
            to: targetId,
            weight: edge.weight,
            accessCount: edge.accessCount
          });
        }
      }

      if (!dryRun) {
        toRemove.forEach(targetId => node.removeEdge(targetId));
      }
      
      prunedCount += toRemove.length;
    }

    return {
      pruned: prunedCount,
      edges: prunedEdges,
      dryRun
    };
  }

  /**
   * Merge similar nodes (consolidation)
   */
  consolidateSimilarNodes(similarityFn, threshold = 0.8, options = {}) {
    const { dryRun = false } = options;
    const merged = [];
    const processed = new Set();

    const nodes = Array.from(this.graph.nodes.values());

    for (let i = 0; i < nodes.length; i++) {
      if (processed.has(nodes[i].id)) continue;

      const cluster = [nodes[i]];
      processed.add(nodes[i].id);
      
      for (let j = i + 1; j < nodes.length; j++) {
        if (processed.has(nodes[j].id)) continue;

        const similarity = similarityFn(nodes[i].content, nodes[j].content);
        
        if (similarity >= threshold) {
          cluster.push(nodes[j]);
          processed.add(nodes[j].id);
        }
      }

      if (cluster.length > 1) {
        const primary = cluster[0];
        const others = cluster.slice(1);

        merged.push({
          primary: primary.id,
          merged: others.map(n => n.id),
          count: cluster.length
        });

        if (!dryRun) {
          // Merge metadata and edges
          for (const other of others) {
            // Combine access counts
            primary.metadata.accessCount += other.metadata.accessCount;
            
            // Merge edges
            for (const [targetId, edge] of other.edges) {
              // Skip self-reference to primary
              if (targetId === primary.id) continue;
              
              const existingEdge = primary.getEdge(targetId);
              if (existingEdge) {
                existingEdge.weight = Math.min(1.0, existingEdge.weight + edge.weight * 0.5);
                existingEdge.accessCount += edge.accessCount || 0;
              } else {
                primary.addEdge(targetId, edge.weight, edge.type);
              }
            }

            // Remove the merged node
            this.graph.deleteNode(other.id);
          }

          // Update importance
          primary.metadata.importance = Math.min(
            1.0,
            primary.metadata.importance * 1.2
          );
        }
      }
    }

    return {
      consolidated: merged.length,
      clusters: merged,
      dryRun
    };
  }

  /**
   * Enforce node limit by removing least important
   */
  enforceNodeLimit(maxNodes = this.options.maxNodes, currentTime = Date.now()) {
    if (this.graph.nodes.size <= maxNodes) {
      return { pruned: 0, nodes: [] };
    }

    const toRemove = this.graph.nodes.size - maxNodes;
    
    // Sort by relevance
    const nodesByRelevance = Array.from(this.graph.nodes.values())
      .map(node => ({
        node,
        relevance: node.calculateRelevance(currentTime, this.graph.options.defaultDecayRate)
      }))
      .sort((a, b) => a.relevance - b.relevance);

    const removed = [];
    
    for (let i = 0; i < toRemove; i++) {
      const { node, relevance } = nodesByRelevance[i];
      removed.push({
        id: node.id,
        relevance,
        age: currentTime - node.metadata.timestamp
      });
      this.graph.deleteNode(node.id);
    }

    return {
      pruned: removed.length,
      nodes: removed
    };
  }

  /**
   * Identify and strengthen important paths
   */
  reinforceImportantPaths(hubNodes, depthLimit = 2) {
    let reinforced = 0;

    for (const hubNode of hubNodes) {
      const visited = new Set();
      const queue = [{ nodeId: hubNode.id, depth: 0 }];

      while (queue.length > 0) {
        const { nodeId, depth } = queue.shift();
        
        if (visited.has(nodeId) || depth >= depthLimit) continue;
        visited.add(nodeId);

        const node = this.graph.getNode(nodeId);
        if (!node) continue;

        // Strengthen edges from this node
        for (const [targetId, edge] of node.edges) {
          if (edge.weight < 0.8) {
            edge.weight = Math.min(1.0, edge.weight + 0.1);
            reinforced++;
          }
          
          if (depth < depthLimit - 1) {
            queue.push({ nodeId: targetId, depth: depth + 1 });
          }
        }
      }
    }

    return { reinforced };
  }

  /**
   * Get consolidation recommendations
   */
  getRecommendations(currentTime = Date.now()) {
    const recommendations = [];

    // Check if pruning is needed
    const pruneSim = this.pruneNodes(currentTime, { dryRun: true });
    if (pruneSim.pruned > 0) {
      recommendations.push({
        type: 'prune_nodes',
        priority: 'medium',
        count: pruneSim.pruned,
        description: `${pruneSim.pruned} low-relevance nodes can be pruned`
      });
    }

    // Check edge pruning
    const edgeSim = this.pruneEdges({ dryRun: true });
    if (edgeSim.pruned > 0) {
      recommendations.push({
        type: 'prune_edges',
        priority: 'low',
        count: edgeSim.pruned,
        description: `${edgeSim.pruned} weak edges can be pruned`
      });
    }

    // Check capacity
    if (this.graph.nodes.size > this.options.maxNodes * 0.9) {
      recommendations.push({
        type: 'enforce_limit',
        priority: 'high',
        count: this.graph.nodes.size - this.options.maxNodes,
        description: 'Approaching node limit, consider pruning or increasing capacity'
      });
    }

    return recommendations;
  }

  /**
   * Run automatic maintenance
   */
  autoMaintenance(currentTime = Date.now(), options = {}) {
    const {
      aggressive = false,
      maxOperations = 1000
    } = options;

    const results = {
      nodesPruned: 0,
      edgesPruned: 0,
      consolidated: 0,
      operations: []
    };

    // Prune weak edges
    const edgeResult = this.pruneEdges({
      minWeight: aggressive ? 0.1 : this.options.minEdgeWeight
    });
    results.edgesPruned = edgeResult.pruned;
    results.operations.push({ type: 'prune_edges', result: edgeResult });

    // Prune nodes if over limit
    if (this.graph.nodes.size > this.options.maxNodes) {
      const nodeResult = this.enforceNodeLimit(this.options.maxNodes, currentTime);
      results.nodesPruned = nodeResult.pruned;
      results.operations.push({ type: 'enforce_limit', result: nodeResult });
    } else if (aggressive) {
      // Aggressive pruning
      const nodeResult = this.pruneNodes(currentTime, {
        minRelevance: this.options.minImportance * 1.5
      });
      results.nodesPruned = nodeResult.pruned;
      results.operations.push({ type: 'prune_nodes', result: nodeResult });
    }

    return results;
  }
}
