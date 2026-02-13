import { MemoryNode } from './MemoryNode.js';
import crypto from 'crypto';

/**
 * MemoryGraph - Main graph structure for memory storage
 */
export class MemoryGraph {
  constructor(options = {}) {
    this.nodes = new Map();
    this.options = {
      maxNodes: options.maxNodes || 10000,
      defaultDecayRate: options.defaultDecayRate || 0.00001,
      minRelevanceThreshold: options.minRelevanceThreshold || 0.01,
      ...options
    };
  }

  /**
   * Create a new memory node
   */
  createNode(content, metadata = {}) {
    const id = this._generateId(content);
    
    // Check if similar node exists
    const existing = this._findSimilarNode(content);
    if (existing) {
      existing.recordAccess();
      return existing;
    }

    const node = new MemoryNode(id, content, metadata);
    this.nodes.set(id, node);
    
    return node;
  }

  /**
   * Get node by ID
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Delete a node and all edges pointing to it
   */
  deleteNode(id) {
    // Remove edges from other nodes
    for (const node of this.nodes.values()) {
      node.removeEdge(id);
    }
    
    return this.nodes.delete(id);
  }

  /**
   * Create bidirectional association between two nodes
   */
  associate(nodeId1, nodeId2, weight = 1.0, type = 'association') {
    const node1 = this.nodes.get(nodeId1);
    const node2 = this.nodes.get(nodeId2);
    
    if (!node1 || !node2) {
      throw new Error('Both nodes must exist');
    }

    node1.addEdge(nodeId2, weight, type);
    node2.addEdge(nodeId1, weight, type);
  }

  /**
   * Create directed association from source to target
   */
  associateDirected(sourceId, targetId, weight = 1.0, type = 'association') {
    const source = this.nodes.get(sourceId);
    const target = this.nodes.get(targetId);
    
    if (!source || !target) {
      throw new Error('Both nodes must exist');
    }

    source.addEdge(targetId, weight, type);
  }

  /**
   * Strengthen or weaken connections based on co-activation
   */
  reinforceConnection(nodeId1, nodeId2, delta = 0.1) {
    const node1 = this.nodes.get(nodeId1);
    const node2 = this.nodes.get(nodeId2);
    
    if (node1 && node2) {
      node1.updateEdgeWeight(nodeId2, delta);
      node2.updateEdgeWeight(nodeId1, delta);
    }
  }

  /**
   * Find nodes by tag
   */
  findByTag(tag) {
    return Array.from(this.nodes.values())
      .filter(node => node.metadata.tags.includes(tag));
  }

  /**
   * Find nodes by type
   */
  findByType(type) {
    return Array.from(this.nodes.values())
      .filter(node => node.metadata.type === type);
  }

  /**
   * Get all neighbors of a node
   */
  getNeighbors(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    
    return Array.from(node.edges.keys())
      .map(id => this.nodes.get(id))
      .filter(n => n);
  }

  /**
   * Get graph statistics
   */
  getStats() {
    let totalEdges = 0;
    let maxEdges = 0;
    let minEdges = Infinity;
    
    for (const node of this.nodes.values()) {
      const edgeCount = node.edges.size;
      totalEdges += edgeCount;
      maxEdges = Math.max(maxEdges, edgeCount);
      minEdges = Math.min(minEdges, edgeCount);
    }
    
    return {
      nodeCount: this.nodes.size,
      edgeCount: totalEdges,
      avgEdgesPerNode: this.nodes.size > 0 ? totalEdges / this.nodes.size : 0,
      maxEdges,
      minEdges: this.nodes.size > 0 ? minEdges : 0
    };
  }

  /**
   * Export graph to JSON
   */
  toJSON() {
    return {
      options: this.options,
      nodes: Array.from(this.nodes.values()).map(node => node.toJSON())
    };
  }

  /**
   * Import graph from JSON
   */
  static fromJSON(data) {
    const graph = new MemoryGraph(data.options);
    
    if (data.nodes) {
      data.nodes.forEach(nodeData => {
        const node = MemoryNode.fromJSON(nodeData);
        graph.nodes.set(node.id, node);
      });
    }
    
    return graph;
  }

  /**
   * Generate unique ID for content
   */
  _generateId(content) {
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(content) + Date.now())
      .digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * Find similar existing node (basic implementation)
   */
  _findSimilarNode(content) {
    // Simple exact match for now
    // Could be enhanced with semantic similarity
    const contentStr = JSON.stringify(content);
    
    for (const node of this.nodes.values()) {
      if (JSON.stringify(node.content) === contentStr) {
        return node;
      }
    }
    
    return null;
  }
}
