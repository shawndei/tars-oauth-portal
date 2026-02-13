/**
 * Metrics Collection Library
 * Collects latency, throughput, cost, and accuracy metrics
 */

class MetricsCollector {
  constructor() {
    this.metrics = {
      latency: [],
      cost: 0,
      tokens: 0,
      errors: 0,
      successes: 0
    };
  }

  /**
   * Record a single operation
   */
  async measureOperation(operation, metadata = {}) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    let result;
    let error = null;
    
    try {
      result = await operation();
      this.metrics.successes++;
    } catch (err) {
      error = err;
      this.metrics.errors++;
    }
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const latency = endTime - startTime;
    const memoryDelta = endMemory - startMemory;
    
    this.metrics.latency.push(latency);
    
    return {
      success: !error,
      latency,
      memoryDelta,
      error,
      result,
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  /**
   * Run multiple iterations of an operation
   */
  async runIterations(operation, iterations, metadata = {}) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await this.measureOperation(operation, {
        ...metadata,
        iteration: i + 1,
        totalIterations: iterations
      });
      results.push(result);
      
      // Small delay between iterations to avoid rate limits
      if (i < iterations - 1) {
        await this.delay(100);
      }
    }
    
    return results;
  }

  /**
   * Calculate statistical metrics
   */
  calculateStats() {
    const latencies = this.metrics.latency.sort((a, b) => a - b);
    const total = latencies.length;
    
    if (total === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        stddev: 0
      };
    }
    
    const sum = latencies.reduce((a, b) => a + b, 0);
    const mean = sum / total;
    
    // Calculate standard deviation
    const squaredDiffs = latencies.map(l => Math.pow(l - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / total;
    const stddev = Math.sqrt(variance);
    
    return {
      count: total,
      min: latencies[0],
      max: latencies[total - 1],
      mean: parseFloat(mean.toFixed(2)),
      median: this.percentile(latencies, 50),
      p50: this.percentile(latencies, 50),
      p90: this.percentile(latencies, 90),
      p95: this.percentile(latencies, 95),
      p99: this.percentile(latencies, 99),
      stddev: parseFloat(stddev.toFixed(2))
    };
  }

  /**
   * Calculate percentile
   */
  percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    
    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    
    return parseFloat((sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight).toFixed(2));
  }

  /**
   * Calculate throughput
   */
  calculateThroughput(durationMs) {
    const durationSec = durationMs / 1000;
    const opsPerSec = this.metrics.successes / durationSec;
    
    return {
      operations: this.metrics.successes,
      duration_ms: durationMs,
      duration_sec: parseFloat(durationSec.toFixed(2)),
      ops_per_sec: parseFloat(opsPerSec.toFixed(2)),
      requests_per_min: parseFloat((opsPerSec * 60).toFixed(2))
    };
  }

  /**
   * Calculate accuracy metrics
   */
  calculateAccuracy() {
    const total = this.metrics.successes + this.metrics.errors;
    if (total === 0) return { success_rate: 0, error_rate: 0 };
    
    return {
      total_operations: total,
      successes: this.metrics.successes,
      errors: this.metrics.errors,
      success_rate: parseFloat((this.metrics.successes / total).toFixed(4)),
      error_rate: parseFloat((this.metrics.errors / total).toFixed(4))
    };
  }

  /**
   * Get complete metrics summary
   */
  getSummary(startTime, endTime) {
    const duration = endTime - startTime;
    
    return {
      latency: this.calculateStats(),
      throughput: this.calculateThroughput(duration),
      accuracy: this.calculateAccuracy(),
      cost: {
        total: this.metrics.cost,
        per_operation: this.metrics.successes > 0 
          ? parseFloat((this.metrics.cost / this.metrics.successes).toFixed(6))
          : 0,
        tokens_used: this.metrics.tokens,
        tokens_per_op: this.metrics.successes > 0
          ? Math.round(this.metrics.tokens / this.metrics.successes)
          : 0
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update cost tracking
   */
  addCost(tokens, costPerMToken = 3.0) {
    this.metrics.tokens += tokens;
    this.metrics.cost += (tokens / 1000000) * costPerMToken;
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      latency: [],
      cost: 0,
      tokens: 0,
      errors: 0,
      successes: 0
    };
  }

  /**
   * Utility: delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MetricsCollector;
