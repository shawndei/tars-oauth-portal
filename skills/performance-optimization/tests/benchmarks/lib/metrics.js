/**
 * Metrics Collection Library
 * Collects latency, throughput, memory, and cost metrics for benchmark operations
 */

class MetricsCollector {
  constructor() {
    this.metrics = [];
    this.startTime = null;
    this.memoryBaseline = null;
  }

  /**
   * Start collecting metrics for an operation
   */
  startOperation(operationName, metadata = {}) {
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.startTime = Date.now();
    this.memoryBaseline = process.memoryUsage();
    
    return {
      operationId,
      operationName,
      startTime: this.startTime,
      metadata
    };
  }

  /**
   * End operation and record metrics
   */
  endOperation(operationContext, result = {}) {
    const endTime = Date.now();
    const latency = endTime - operationContext.startTime;
    const memoryAfter = process.memoryUsage();
    
    const metric = {
      operationId: operationContext.operationId,
      operationName: operationContext.operationName,
      timestamp: new Date().toISOString(),
      latency: latency, // milliseconds
      memory: {
        heapUsed: memoryAfter.heapUsed - this.memoryBaseline.heapUsed,
        heapTotal: memoryAfter.heapTotal,
        external: memoryAfter.external - this.memoryBaseline.external,
        rss: memoryAfter.rss - this.memoryBaseline.rss
      },
      cost: result.cost || 0,
      tokens: result.tokens || 0,
      success: result.success !== false,
      error: result.error || null,
      metadata: operationContext.metadata
    };
    
    this.metrics.push(metric);
    return metric;
  }

  /**
   * Calculate statistics for a set of metrics
   */
  calculateStats(metrics) {
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const latencies = metrics.map(m => m.latency).sort((a, b) => a - b);
    const costs = metrics.map(m => m.cost);
    const tokens = metrics.map(m => m.tokens);
    const memoryUsages = metrics.map(m => m.memory.heapUsed);
    const successCount = metrics.filter(m => m.success).length;

    return {
      count: metrics.length,
      latency: {
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        mean: this.mean(latencies),
        median: this.percentile(latencies, 50),
        p50: this.percentile(latencies, 50),
        p90: this.percentile(latencies, 90),
        p95: this.percentile(latencies, 95),
        p99: this.percentile(latencies, 99),
        stddev: this.stddev(latencies)
      },
      throughput: {
        ops_per_sec: this.calculateThroughput(metrics),
        requests_per_min: this.calculateThroughput(metrics) * 60
      },
      cost: {
        total: this.sum(costs),
        mean: this.mean(costs),
        cost_per_op: this.mean(costs),
        min: Math.min(...costs),
        max: Math.max(...costs)
      },
      tokens: {
        total: this.sum(tokens),
        mean: this.mean(tokens),
        tokens_per_op: this.mean(tokens),
        min: Math.min(...tokens),
        max: Math.max(...tokens)
      },
      memory: {
        mean_heap_used: this.mean(memoryUsages),
        max_heap_used: Math.max(...memoryUsages),
        min_heap_used: Math.min(...memoryUsages)
      },
      accuracy: {
        success_rate: successCount / metrics.length,
        error_rate: (metrics.length - successCount) / metrics.length,
        success_count: successCount,
        error_count: metrics.length - successCount
      }
    };
  }

  /**
   * Group metrics by operation name
   */
  groupByOperation() {
    const grouped = {};
    
    for (const metric of this.metrics) {
      if (!grouped[metric.operationName]) {
        grouped[metric.operationName] = [];
      }
      grouped[metric.operationName].push(metric);
    }
    
    return grouped;
  }

  /**
   * Get aggregated statistics for all operations
   */
  getAggregatedStats() {
    const grouped = this.groupByOperation();
    const stats = {};
    
    for (const [operation, metrics] of Object.entries(grouped)) {
      stats[operation] = this.calculateStats(metrics);
    }
    
    return stats;
  }

  /**
   * Clear all collected metrics
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Export metrics as JSON
   */
  export() {
    return {
      metrics: this.metrics,
      stats: this.getAggregatedStats(),
      timestamp: new Date().toISOString(),
      totalOperations: this.metrics.length
    };
  }

  // Statistical helper functions
  
  sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
  }

  mean(arr) {
    if (arr.length === 0) return 0;
    return this.sum(arr) / arr.length;
  }

  percentile(sortedArr, p) {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, index)];
  }

  stddev(arr) {
    if (arr.length === 0) return 0;
    const avg = this.mean(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  calculateThroughput(metrics) {
    if (metrics.length === 0) return 0;
    
    const times = metrics.map(m => new Date(m.timestamp).getTime());
    const duration = (Math.max(...times) - Math.min(...times)) / 1000; // seconds
    
    if (duration === 0) return metrics.length; // All in same millisecond
    return metrics.length / duration;
  }
}

module.exports = MetricsCollector;
