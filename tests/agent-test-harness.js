/**
 * Agent Test Harness - Core Testing Framework
 * Spawns agents, provides input, captures output, validates results
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class AgentTestHarness extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
      captureVerbose: config.captureVerbose !== false,
      resultDir: config.resultDir || path.join(__dirname, 'results'),
      mockMode: config.mockMode || false,
      ...config
    };

    this.testResults = [];
    this.sessionId = `harness-${Date.now()}`;
    this.activeAgents = new Map();
    this.metrics = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      totalLatency: 0,
      totalCost: 0,
      startTime: null,
      endTime: null
    };

    // Ensure results directory exists
    if (!fs.existsSync(this.config.resultDir)) {
      fs.mkdirSync(this.config.resultDir, { recursive: true });
    }
  }

  /**
   * Spawn an agent for testing
   * @param {string} agentId - Agent identifier
   * @param {object} agentConfig - Agent configuration
   * @returns {Promise<Agent>}
   */
  async spawnAgent(agentId, agentConfig) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Agent spawn timeout for ${agentId}`));
      }, this.config.timeout);

      try {
        const agent = new MockAgent(agentId, agentConfig, this.config.mockMode);
        
        agent.on('ready', () => {
          clearTimeout(timeout);
          this.activeAgents.set(agentId, agent);
          this.emit('agent-spawned', { agentId, timestamp: Date.now() });
          resolve(agent);
        });

        agent.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        agent.initialize();
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Execute a test case
   * @param {string} testName - Test name
   * @param {object} testCase - Test case definition
   * @returns {Promise<TestResult>}
   */
  async executeTest(testName, testCase) {
    const testId = `${testName}-${Date.now()}`;
    const startTime = Date.now();
    let result = {
      testId,
      testName,
      status: 'pending',
      startTime,
      endTime: null,
      duration: 0,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: null,
      error: null,
      validations: {},
      metrics: {},
      retryCount: 0
    };

    let lastError = null;
    let retryCount = 0;

    while (retryCount < this.config.maxRetries) {
      try {
        result.retryCount = retryCount;

        // Spawn agent
        const agent = await this.spawnAgent(
          testCase.agentId,
          testCase.agentConfig || this.getAgentConfig(testCase.agentId)
        );

        // Execute with timeout
        const output = await this.executeWithTimeout(
          agent,
          testCase.input,
          this.config.timeout
        );

        result.actualOutput = output;

        // Validate output
        if (testCase.validator) {
          const validation = await testCase.validator(output, testCase.expectedOutput);
          result.validations = validation;
          
          if (!validation.passed) {
            throw new Error(`Validation failed: ${validation.reason}`);
          }
        }

        // Collect metrics
        result.metrics = {
          latency: Date.now() - startTime,
          tokensUsed: output.tokensUsed || 0,
          estimatedCost: output.estimatedCost || 0,
          coherenceScore: await this.calculateCoherence(output),
          accuracy: testCase.expectedOutput ? 
            this.calculateAccuracy(output, testCase.expectedOutput) : 1.0
        };

        result.status = 'passed';
        this.metrics.passed++;
        break;

      } catch (error) {
        lastError = error;
        retryCount++;
        result.retryCount = retryCount;

        if (retryCount < this.config.maxRetries) {
          // Exponential backoff before retry
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
        }
      } finally {
        // Clean up agent
        const agent = this.activeAgents.get(testCase.agentId);
        if (agent) {
          await agent.teardown();
          this.activeAgents.delete(testCase.agentId);
        }
      }
    }

    if (result.status === 'pending') {
      result.status = 'failed';
      result.error = lastError?.message || 'Unknown error';
      this.metrics.failed++;
    }

    result.endTime = Date.now();
    result.duration = result.endTime - result.startTime;

    this.testResults.push(result);
    this.metrics.totalLatency += result.duration;
    this.metrics.totalCost += result.metrics.estimatedCost || 0;
    this.metrics.totalTests++;

    this.emit('test-completed', result);

    return result;
  }

  /**
   * Execute with timeout
   * @private
   */
  async executeWithTimeout(agent, input, timeout) {
    return Promise.race([
      agent.execute(input),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      )
    ]);
  }

  /**
   * Calculate coherence score (0-1)
   * @private
   */
  async calculateCoherence(output) {
    if (!output || !output.text) return 0;

    const text = output.text.toString();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length < 2) return 1.0;

    // Check for logical flow - simplified version
    let coherenceScore = 1.0;
    let penaltyApplied = false;

    // Penalize if output is too short/incomplete
    if (text.length < 50) {
      coherenceScore *= 0.8;
      penaltyApplied = true;
    }

    // Penalize if contains error indicators
    if (text.toLowerCase().includes('error') || 
        text.toLowerCase().includes('failed') ||
        text.toLowerCase().includes('unknown')) {
      coherenceScore *= 0.7;
    }

    return Math.max(0, Math.min(1, coherenceScore));
  }

  /**
   * Calculate accuracy against expected output
   * @private
   */
  calculateAccuracy(actual, expected) {
    if (!actual || !expected) return 0;

    const actualStr = JSON.stringify(actual).toLowerCase();
    const expectedStr = JSON.stringify(expected).toLowerCase();

    // Simple string similarity metric
    let matches = 0;
    const expectedWords = expectedStr.split(/\s+/).filter(w => w.length > 0);

    for (const word of expectedWords) {
      if (actualStr.includes(word)) matches++;
    }

    return Math.min(1, matches / Math.max(1, expectedWords.length));
  }

  /**
   * Get agent configuration by ID
   * @private
   */
  getAgentConfig(agentId) {
    const configPath = path.join(__dirname, '..', 'multi-agent-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const agent = config.agents.primary.find(a => a.id === agentId);
      if (agent) return agent;
    }
    return { id: agentId, model: 'anthropic/claude-haiku-4-5' };
  }

  /**
   * Run a full test suite
   * @param {Array} testSuite - Array of test cases
   * @param {object} options - Suite options
   * @returns {Promise<SuiteResults>}
   */
  async runTestSuite(testSuite, options = {}) {
    this.metrics.startTime = Date.now();
    this.emit('suite-started', { totalTests: testSuite.length });

    const results = [];

    for (const testCase of testSuite) {
      if (options.parallel && options.parallelLimit) {
        // Run with concurrency limit
        results.push(await this.executeTest(testCase.name, testCase));
      } else {
        // Run sequentially
        results.push(await this.executeTest(testCase.name, testCase));
      }
    }

    this.metrics.endTime = Date.now();

    const suiteResults = {
      sessionId: this.sessionId,
      totalTests: this.metrics.totalTests,
      passed: this.metrics.passed,
      failed: this.metrics.failed,
      skipped: this.metrics.skipped,
      successRate: this.metrics.totalTests > 0 
        ? (this.metrics.passed / this.metrics.totalTests) 
        : 0,
      averageLatency: this.metrics.totalTests > 0
        ? this.metrics.totalLatency / this.metrics.totalTests
        : 0,
      totalCost: this.metrics.totalCost,
      averageCost: this.metrics.totalTests > 0
        ? this.metrics.totalCost / this.metrics.totalTests
        : 0,
      duration: this.metrics.endTime - this.metrics.startTime,
      results,
      timestamp: new Date().toISOString()
    };

    // Save results
    await this.saveResults(suiteResults);

    this.emit('suite-completed', suiteResults);

    return suiteResults;
  }

  /**
   * Save test results to file
   * @private
   */
  async saveResults(results) {
    const filename = path.join(
      this.config.resultDir,
      `test-results-${Date.now()}.json`
    );

    return new Promise((resolve, reject) => {
      fs.writeFile(filename, JSON.stringify(results, null, 2), (error) => {
        if (error) reject(error);
        else resolve(filename);
      });
    });
  }

  /**
   * Get summary report
   */
  getSummaryReport() {
    const passed = this.metrics.passed;
    const failed = this.metrics.failed;
    const total = this.metrics.totalTests;

    return {
      summary: {
        totalTests: total,
        passed,
        failed,
        successRate: total > 0 ? ((passed / total) * 100).toFixed(2) + '%' : 'N/A',
        averageLatency: (this.metrics.totalLatency / Math.max(1, total)).toFixed(0) + 'ms',
        totalCost: this.metrics.totalCost.toFixed(4),
        averageCost: (this.metrics.totalCost / Math.max(1, total)).toFixed(4),
        duration: ((this.metrics.endTime - this.metrics.startTime) / 1000).toFixed(2) + 's'
      },
      testResults: this.testResults.map(r => ({
        testName: r.testName,
        status: r.status,
        duration: r.duration + 'ms',
        latency: r.metrics.latency + 'ms',
        cost: r.metrics.estimatedCost?.toFixed(4) || 'N/A',
        accuracy: (r.metrics.accuracy * 100).toFixed(1) + '%',
        coherence: (r.metrics.coherenceScore * 100).toFixed(1) + '%'
      }))
    };
  }

  /**
   * Teardown harness
   */
  async teardown() {
    for (const [agentId, agent] of this.activeAgents) {
      try {
        await agent.teardown();
      } catch (error) {
        console.error(`Error tearing down agent ${agentId}:`, error.message);
      }
    }
    this.activeAgents.clear();
    this.emit('harness-closed');
  }
}

/**
 * Mock Agent for testing
 */
class MockAgent extends EventEmitter {
  constructor(id, config, mockMode = false) {
    super();
    this.id = id;
    this.config = config;
    this.mockMode = mockMode;
    this.isReady = false;
  }

  initialize() {
    // Simulate initialization
    setTimeout(() => {
      this.isReady = true;
      this.emit('ready');
    }, 100);
  }

  async execute(input) {
    if (!this.isReady) {
      throw new Error('Agent not ready');
    }

    return new Promise((resolve) => {
      // Simulate execution
      setTimeout(() => {
        resolve({
          agentId: this.id,
          input,
          text: `Processed: ${JSON.stringify(input)}`,
          tokensUsed: Math.floor(Math.random() * 500) + 100,
          estimatedCost: (Math.random() * 0.1).toFixed(4),
          timestamp: Date.now()
        });
      }, Math.random() * 2000 + 500);
    });
  }

  async teardown() {
    this.isReady = false;
    return Promise.resolve();
  }
}

module.exports = { AgentTestHarness, MockAgent };
