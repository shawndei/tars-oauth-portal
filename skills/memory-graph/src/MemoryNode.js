/**
 * MemoryNode - Represents a single memory node in the graph
 */
export class MemoryNode {
  constructor(id, content, metadata = {}) {
    this.id = id;
    this.content = content;
    this.metadata = {
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      importance: metadata.importance || 0.5,
      type: metadata.type || 'generic',
      tags: metadata.tags || [],
      ...metadata
    };
    this.edges = new Map(); // nodeId -> { weight, type, created }
  }

  /**
   * Add an edge to another node
   */
  addEdge(targetNodeId, weight = 1.0, type = 'association') {
    this.edges.set(targetNodeId, {
      weight,
      type,
      created: Date.now(),
      accessCount: 0
    });
  }

  /**
   * Get edge to a specific node
   */
  getEdge(targetNodeId) {
    return this.edges.get(targetNodeId);
  }

  /**
   * Remove an edge
   */
  removeEdge(targetNodeId) {
    return this.edges.delete(targetNodeId);
  }

  /**
   * Update edge weight
   */
  updateEdgeWeight(targetNodeId, delta) {
    const edge = this.edges.get(targetNodeId);
    if (edge) {
      edge.weight = Math.max(0, Math.min(1, edge.weight + delta));
      edge.accessCount++;
      return true;
    }
    return false;
  }

  /**
   * Mark this node as accessed (for temporal tracking)
   */
  recordAccess() {
    this.metadata.accessCount++;
    this.metadata.lastAccessed = Date.now();
  }

  /**
   * Calculate current relevance based on temporal decay
   */
  calculateRelevance(currentTime, decayRate = 0.00001) {
    const age = currentTime - this.metadata.timestamp;
    const timeSinceAccess = currentTime - this.metadata.lastAccessed;
    
    // Exponential decay with access recency boost
    const temporalFactor = Math.exp(-decayRate * timeSinceAccess);
    const accessBoost = Math.log(this.metadata.accessCount + 1) / 10;
    
    return this.metadata.importance * temporalFactor + accessBoost;
  }

  /**
   * Serialize node to JSON
   */
  toJSON() {
    return {
      id: this.id,
      content: this.content,
      metadata: this.metadata,
      edges: Array.from(this.edges.entries()).map(([targetId, edge]) => ({
        targetId,
        ...edge
      }))
    };
  }

  /**
   * Deserialize node from JSON
   */
  static fromJSON(data) {
    const node = new MemoryNode(data.id, data.content, data.metadata);
    if (data.edges) {
      data.edges.forEach(edge => {
        node.edges.set(edge.targetId, {
          weight: edge.weight,
          type: edge.type,
          created: edge.created,
          accessCount: edge.accessCount || 0
        });
      });
    }
    return node;
  }
}
