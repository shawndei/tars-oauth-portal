/**
 * TemporalDecay - Manages time-based weighting and decay
 */
export class TemporalDecay {
  constructor(graph, options = {}) {
    this.graph = graph;
    this.options = {
      decayRate: options.decayRate || 0.00001, // per millisecond
      decayInterval: options.decayInterval || 3600000, // 1 hour
      forgettingCurve: options.forgettingCurve || 'exponential', // exponential, linear, power
      ...options
    };
  }

  /**
   * Calculate decay factor based on time and forgetting curve
   */
  calculateDecayFactor(age, curve = this.options.forgettingCurve) {
    const rate = this.options.decayRate;
    
    switch (curve) {
      case 'exponential':
        return Math.exp(-rate * age);
      
      case 'linear':
        return Math.max(0, 1 - rate * age);
      
      case 'power':
        // Power law forgetting (more realistic)
        return Math.pow(1 + rate * age, -1);
      
      case 'logarithmic':
        return 1 / Math.log(2 + rate * age);
      
      default:
        return Math.exp(-rate * age);
    }
  }

  /**
   * Apply temporal decay to all nodes and edges
   */
  applyDecay(currentTime = Date.now()) {
    for (const node of this.graph.nodes.values()) {
      // Decay node importance
      const age = currentTime - node.metadata.lastAccessed;
      const decayFactor = this.calculateDecayFactor(age);
      
      // Update importance with access recency boost
      const accessBoost = Math.log(node.metadata.accessCount + 1) / 20;
      node.metadata.importance = Math.max(
        0.01,
        node.metadata.importance * decayFactor + accessBoost
      );

      // Decay edge weights
      for (const [targetId, edge] of node.edges) {
        const edgeAge = currentTime - edge.created;
        const edgeDecay = this.calculateDecayFactor(edgeAge);
        
        // Edges strengthen with use
        const edgeBoost = Math.log(edge.accessCount + 1) / 20;
        edge.weight = Math.max(
          0.01,
          Math.min(1.0, edge.weight * edgeDecay + edgeBoost)
        );
      }
    }
  }

  /**
   * Get nodes that need attention (low relevance but high access count)
   */
  getAtRiskNodes(threshold = 0.2) {
    const currentTime = Date.now();
    
    return Array.from(this.graph.nodes.values())
      .map(node => ({
        node,
        relevance: node.calculateRelevance(currentTime, this.options.decayRate),
        accessCount: node.metadata.accessCount
      }))
      .filter(({ relevance, accessCount }) => 
        relevance < threshold && accessCount > 5
      )
      .sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Boost importance of recently accessed nodes (rehearsal effect)
   */
  rehearse(nodeId, boostFactor = 0.2) {
    const node = this.graph.getNode(nodeId);
    if (!node) return false;

    node.metadata.importance = Math.min(1.0, node.metadata.importance + boostFactor);
    node.recordAccess();
    
    // Also boost connected nodes slightly (priming effect)
    for (const neighborId of node.edges.keys()) {
      const neighbor = this.graph.getNode(neighborId);
      if (neighbor) {
        neighbor.metadata.importance = Math.min(
          1.0,
          neighbor.metadata.importance + boostFactor * 0.1
        );
      }
    }

    return true;
  }

  /**
   * Calculate memory retention rate
   */
  getRetentionRate(timeWindow = 86400000) { // 24 hours default
    const currentTime = Date.now();
    const cutoff = currentTime - timeWindow;
    
    let recentAccesses = 0;
    let totalNodes = 0;
    
    for (const node of this.graph.nodes.values()) {
      totalNodes++;
      if (node.metadata.lastAccessed > cutoff) {
        recentAccesses++;
      }
    }
    
    return totalNodes > 0 ? recentAccesses / totalNodes : 0;
  }

  /**
   * Implement spaced repetition schedule
   */
  getNextReviewTime(nodeId) {
    const node = this.graph.getNode(nodeId);
    if (!node) return null;

    const reviewCount = node.metadata.reviewCount || 0;
    const lastReview = node.metadata.lastAccessed;
    
    // Fibonacci-like spacing: 1h, 1d, 2d, 4d, 7d, 14d, 30d
    const intervals = [
      3600000,      // 1 hour
      86400000,     // 1 day
      172800000,    // 2 days
      345600000,    // 4 days
      604800000,    // 7 days
      1209600000,   // 14 days
      2592000000    // 30 days
    ];
    
    const intervalIndex = Math.min(reviewCount, intervals.length - 1);
    return lastReview + intervals[intervalIndex];
  }

  /**
   * Get nodes due for review (spaced repetition)
   */
  getDueForReview(currentTime = Date.now()) {
    return Array.from(this.graph.nodes.values())
      .filter(node => {
        const nextReview = this.getNextReviewTime(node.id);
        return nextReview && nextReview <= currentTime;
      })
      .map(node => ({
        node,
        nextReview: this.getNextReviewTime(node.id),
        overdue: currentTime - this.getNextReviewTime(node.id)
      }))
      .sort((a, b) => b.overdue - a.overdue);
  }
}
