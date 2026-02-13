/**
 * Suite 2: Model Inference Time Benchmarks
 * Tests: Sonnet vs Haiku performance comparison
 */

const MetricsCollector = require('../lib/metrics');

class ModelsBenchmarkSuite {
  constructor() {
    this.name = 'Model Inference Time';
    this.description = 'Measures and compares model performance (Sonnet vs Haiku)';
    
    // Model characteristics (simulated)
    this.models = {
      'claude-haiku-4-5': {
        baseLatency: 600,
        variance: 200,
        costPerMToken: 0.80,
        avgTokens: 2500
      },
      'claude-sonnet-4-5': {
        baseLatency: 1500,
        variance: 500,
        costPerMToken: 9.00,
        avgTokens: 3000
      }
    };
  }

  /**
   * Get all tests in this suite
   */
  getTests(quickMode = false) {
    const iterations = quickMode ? 3 : 8;
    
    return [
      {
        name: 'model_haiku_simple',
        description: 'Haiku: Simple factual query',
        iterations,
        run: () => this.testModelInference('claude-haiku-4-5', 'simple')
      },
      {
        name: 'model_haiku_medium',
        description: 'Haiku: Medium complexity task',
        iterations,
        run: () => this.testModelInference('claude-haiku-4-5', 'medium')
      },
      {
        name: 'model_sonnet_complex',
        description: 'Sonnet: Complex reasoning task',
        iterations,
        run: () => this.testModelInference('claude-sonnet-4-5', 'complex')
      },
      {
        name: 'model_sonnet_code',
        description: 'Sonnet: Code generation',
        iterations,
        run: () => this.testModelInference('claude-sonnet-4-5', 'code')
      }
    ];
  }

  /**
   * Test: Model inference (simulated)
   */
  async testModelInference(modelName, complexity) {
    const model = this.models[modelName];
    
    // Simulate API latency with variance
    const latency = model.baseLatency + (Math.random() * model.variance);
    await this.delay(latency);
    
    // Calculate tokens based on complexity
    let tokens = model.avgTokens;
    if (complexity === 'simple') tokens *= 0.7;
    if (complexity === 'complex') tokens *= 1.3;
    if (complexity === 'code') tokens *= 1.2;
    
    tokens = Math.round(tokens);
    const cost = (tokens / 1000000) * model.costPerMToken;
    
    return {
      success: true,
      model: modelName,
      tokens,
      cost,
      complexity,
      response: `Simulated ${complexity} response from ${modelName}`
    };
  }

  /**
   * Utility: delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ModelsBenchmarkSuite;
