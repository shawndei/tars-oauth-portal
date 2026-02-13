#!/usr/bin/env node

/**
 * Load Test Runner for TARS Multi-Agent System
 * Executes load test scenarios and generates performance reports
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const TEST_SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000/api/task';
const SCENARIOS_FILE = path.join(__dirname, '../../load-test-scenarios.json');
const RESULTS_DIR = path.join(__dirname, '../../load-test-results');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

class LoadTestRunner {
  constructor() {
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  async runScenario(scenario) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${scenario.name}`);
    console.log(`Description: ${scenario.description}`);
    console.log(`${'='.repeat(60)}`);

    const result = {
      name: scenario.name,
      type: scenario.type,
      timestamp: new Date().toISOString(),
      config: {
        concurrency: scenario.concurrency,
        duration: scenario.duration,
        agents: scenario.agents,
        tasksPerAgent: scenario.tasksPerAgent
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: [],
        errors: [],
        memorySnapshots: [],
        throughput: 0,
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorRate: 0,
        peakMemory: 0,
        averageMemory: 0
      }
    };

    try {
      switch (scenario.type) {
        case 'sequential':
          await this.runSequentialTest(scenario, result);
          break;
        case 'concurrent':
          await this.runConcurrentTest(scenario, result);
          break;
        case 'ramp-up':
          await this.runRampUpTest(scenario, result);
          break;
        case 'multi-agent':
          await this.runMultiAgentTest(scenario, result);
          break;
        case 'memory-profile':
          await this.runMemoryProfile(scenario, result);
          break;
        case 'degradation-analysis':
          await this.runDegradationAnalysis(scenario, result);
          break;
        default:
          console.log(`Scenario type ${scenario.type} not yet implemented`);
          result.skipped = true;
      }

      this.calculateMetrics(result);
      this.results.push(result);

      // Print summary
      console.log('\n--- Results Summary ---');
      console.log(`Total Requests: ${result.metrics.totalRequests}`);
      console.log(`Successful: ${result.metrics.successfulRequests} (${(result.metrics.successfulRequests / result.metrics.totalRequests * 100).toFixed(2)}%)`);
      console.log(`Failed: ${result.metrics.failedRequests}`);
      console.log(`Avg Response Time: ${result.metrics.avgResponseTime.toFixed(2)}ms`);
      console.log(`p95 Response Time: ${result.metrics.p95ResponseTime.toFixed(2)}ms`);
      console.log(`p99 Response Time: ${result.metrics.p99ResponseTime.toFixed(2)}ms`);
      console.log(`Throughput: ${result.metrics.throughput.toFixed(2)} req/sec`);
      if (result.metrics.peakMemory > 0) {
        console.log(`Peak Memory: ${result.metrics.peakMemory.toFixed(2)} MB`);
        console.log(`Average Memory: ${result.metrics.averageMemory.toFixed(2)} MB`);
      }

    } catch (error) {
      console.error(`Error running scenario: ${error.message}`);
      result.error = error.message;
      this.results.push(result);
    }

    return result;
  }

  async runSequentialTest(scenario, result) {
    console.log(`Sending single request...`);
    const startTime = Date.now();
    const initialMem = this.getCurrentMemory();

    try {
      const response = await this.makeRequest();
      const duration = Date.now() - startTime;
      
      result.metrics.totalRequests = 1;
      result.metrics.successfulRequests = 1;
      result.metrics.responseTimes.push(duration);

      const finalMem = this.getCurrentMemory();
      result.metrics.peakMemory = finalMem;
      result.metrics.averageMemory = (initialMem + finalMem) / 2;

    } catch (error) {
      result.metrics.totalRequests = 1;
      result.metrics.failedRequests = 1;
      result.metrics.errors.push(error.message);
    }
  }

  async runConcurrentTest(scenario, result) {
    const { concurrency, duration } = scenario;
    console.log(`Spawning ${concurrency} concurrent requests for ${duration}ms...`);

    const startTime = Date.now();
    const testEndTime = startTime + duration;
    const initialMem = this.getCurrentMemory();
    let currentMem = initialMem;

    const makeRequestAsync = async () => {
      while (Date.now() < testEndTime) {
        try {
          const reqStart = performance.now();
          const response = await this.makeRequest();
          const reqDuration = performance.now() - reqStart;

          result.metrics.totalRequests++;
          result.metrics.successfulRequests++;
          result.metrics.responseTimes.push(reqDuration);

          currentMem = this.getCurrentMemory();
          result.metrics.memorySnapshots.push({
            timestamp: Date.now(),
            memory: currentMem
          });

        } catch (error) {
          result.metrics.totalRequests++;
          result.metrics.failedRequests++;
          result.metrics.errors.push(error.message);
        }
      }
    };

    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(makeRequestAsync());
    }

    await Promise.all(promises);

    result.metrics.peakMemory = Math.max(initialMem, currentMem);
    result.metrics.averageMemory = (initialMem + currentMem) / 2;
  }

  async runRampUpTest(scenario, result) {
    const { concurrency, duration: totalDuration } = scenario;
    console.log(`Ramping up from 1 to ${concurrency.end} concurrent requests...`);

    let currentConcurrency = concurrency.start;
    const startTime = Date.now();
    const initialMem = this.getCurrentMemory();
    let currentMem = initialMem;

    while (currentConcurrency <= concurrency.end) {
      console.log(`  Running at ${currentConcurrency} concurrency...`);
      const stepEnd = Date.now() + concurrency.stepDuration;

      const makeRequestAsync = async () => {
        while (Date.now() < stepEnd) {
          try {
            const reqStart = performance.now();
            await this.makeRequest();
            const reqDuration = performance.now() - reqStart;

            result.metrics.totalRequests++;
            result.metrics.successfulRequests++;
            result.metrics.responseTimes.push(reqDuration);

            currentMem = this.getCurrentMemory();

          } catch (error) {
            result.metrics.totalRequests++;
            result.metrics.failedRequests++;
          }
        }
      };

      const promises = [];
      for (let i = 0; i < currentConcurrency; i++) {
        promises.push(makeRequestAsync());
      }

      await Promise.all(promises);
      currentConcurrency += concurrency.step;
    }

    result.metrics.peakMemory = Math.max(initialMem, currentMem);
    result.metrics.averageMemory = (initialMem + currentMem) / 2;
  }

  async runMultiAgentTest(scenario, result) {
    const { agents, tasksPerAgent } = scenario;
    console.log(`Simulating ${agents} agents processing ${tasksPerAgent} tasks each...`);

    const startTime = Date.now();
    const initialMem = this.getCurrentMemory();

    const agentTasks = [];
    for (let agentId = 0; agentId < agents; agentId++) {
      const agentPromises = [];
      for (let taskId = 0; taskId < tasksPerAgent; taskId++) {
        agentPromises.push(
          this.makeRequest()
            .then(() => {
              result.metrics.successfulRequests++;
              result.metrics.totalRequests++;
            })
            .catch((error) => {
              result.metrics.failedRequests++;
              result.metrics.totalRequests++;
              result.metrics.errors.push(error.message);
            })
        );
      }
      agentTasks.push(Promise.all(agentPromises));
    }

    await Promise.all(agentTasks);

    const finalMem = this.getCurrentMemory();
    result.metrics.peakMemory = finalMem;
    result.metrics.averageMemory = (initialMem + finalMem) / 2;
  }

  async runMemoryProfile(scenario, result) {
    const { concurrency, duration, samplingInterval } = scenario;
    console.log(`Memory profiling with ${concurrency} concurrency for ${duration}ms (sample every ${samplingInterval}ms)...`);

    const startTime = Date.now();
    const testEndTime = startTime + duration;

    const memoryMonitor = setInterval(() => {
      result.metrics.memorySnapshots.push({
        timestamp: Date.now(),
        memory: this.getCurrentMemory()
      });
    }, samplingInterval);

    const makeRequestAsync = async () => {
      while (Date.now() < testEndTime) {
        try {
          await this.makeRequest();
          result.metrics.totalRequests++;
          result.metrics.successfulRequests++;
        } catch (error) {
          result.metrics.totalRequests++;
          result.metrics.failedRequests++;
        }
      }
    };

    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(makeRequestAsync());
    }

    await Promise.all(promises);
    clearInterval(memoryMonitor);

    if (result.metrics.memorySnapshots.length > 0) {
      result.metrics.peakMemory = Math.max(...result.metrics.memorySnapshots.map(s => s.memory));
      result.metrics.averageMemory = result.metrics.memorySnapshots.reduce((a, b) => a + b.memory, 0) / result.metrics.memorySnapshots.length;
    }
  }

  async runDegradationAnalysis(scenario, result) {
    const { concurrencies, duration } = scenario;
    console.log(`Running degradation analysis at various concurrency levels...`);

    result.metrics.degradationAnalysis = [];

    for (const concurrency of concurrencies) {
      console.log(`  Testing at ${concurrency} concurrent requests...`);

      const analysisResult = {
        concurrency,
        totalRequests: 0,
        successfulRequests: 0,
        responseTimes: [],
        avgResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0
      };

      const testEndTime = Date.now() + duration;

      const makeRequestAsync = async () => {
        while (Date.now() < testEndTime) {
          try {
            const reqStart = performance.now();
            await this.makeRequest();
            const reqDuration = performance.now() - reqStart;

            analysisResult.totalRequests++;
            analysisResult.successfulRequests++;
            analysisResult.responseTimes.push(reqDuration);

          } catch (error) {
            analysisResult.totalRequests++;
          }
        }
      };

      const promises = [];
      for (let i = 0; i < concurrency; i++) {
        promises.push(makeRequestAsync());
      }

      const stepStart = Date.now();
      await Promise.all(promises);
      const stepDuration = (Date.now() - stepStart) / 1000;

      analysisResult.avgResponseTime = analysisResult.responseTimes.reduce((a, b) => a + b, 0) / analysisResult.responseTimes.length || 0;
      analysisResult.throughput = analysisResult.successfulRequests / stepDuration;

      result.metrics.degradationAnalysis.push(analysisResult);
    }
  }

  async makeRequest() {
    // Simulate request (in real scenario, this would be an HTTP request)
    // For now, simulate with a delay and occasional failure
    return new Promise((resolve, reject) => {
      const delay = Math.random() * 2000 + 500; // 500-2500ms
      const failureRate = 0.01; // 1% failure rate

      setTimeout(() => {
        if (Math.random() < failureRate) {
          reject(new Error('Simulated request failure'));
        } else {
          resolve({ status: 200 });
        }
      }, delay);
    });
  }

  getCurrentMemory() {
    const mem = process.memoryUsage();
    return mem.heapUsed / (1024 * 1024); // Convert to MB
  }

  calculateMetrics(result) {
    if (result.metrics.responseTimes.length === 0) return;

    const times = result.metrics.responseTimes.sort((a, b) => a - b);
    const count = times.length;

    result.metrics.avgResponseTime = times.reduce((a, b) => a + b) / count;
    result.metrics.p50ResponseTime = times[Math.floor(count * 0.5)];
    result.metrics.p95ResponseTime = times[Math.floor(count * 0.95)];
    result.metrics.p99ResponseTime = times[Math.floor(count * 0.99)];
    result.metrics.errorRate = (result.metrics.failedRequests / result.metrics.totalRequests * 100).toFixed(2);

    const testDuration = result.metrics.totalRequests > 0 ? (result.config.duration / 1000) : 1;
    result.metrics.throughput = result.metrics.successfulRequests / testDuration;
  }

  async runAllScenarios() {
    const scenarios = this.loadScenarios();
    this.startTime = new Date().toISOString();

    // Run a subset of key scenarios for quick testing
    const keyScenarios = [
      'baseline-single-request',
      'http-concurrent-10',
      'http-concurrent-25',
      'http-concurrent-50',
      'multi-agent-5',
      'memory-profile-short',
      'response-degradation'
    ];

    for (const scenarioName of keyScenarios) {
      if (scenarios.scenarios[scenarioName]) {
        await this.runScenario(scenarios.scenarios[scenarioName]);
      }
    }

    this.endTime = new Date().toISOString();
    this.saveResults();
  }

  loadScenarios() {
    if (fs.existsSync(SCENARIOS_FILE)) {
      const content = fs.readFileSync(SCENARIOS_FILE, 'utf-8');
      return JSON.parse(content);
    }
    return { scenarios: {} };
  }

  saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(RESULTS_DIR, `load-test-results-${timestamp}.json`);

    const report = {
      executionMetadata: {
        startTime: this.startTime,
        endTime: this.endTime,
        totalScenarios: this.results.length
      },
      results: this.results,
      summary: this.generateSummary()
    };

    fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
    console.log(`\n✅ Results saved to: ${resultsFile}`);
    
    return resultsFile;
  }

  generateSummary() {
    return {
      totalScenarios: this.results.length,
      passedScenarios: this.results.filter(r => !r.error).length,
      failedScenarios: this.results.filter(r => r.error).length,
      averageThroughput: (this.results.reduce((a, b) => a + (b.metrics.throughput || 0), 0) / this.results.length).toFixed(2),
      overallSuccessRate: ((this.results.reduce((a, b) => a + b.metrics.successfulRequests, 0) / this.results.reduce((a, b) => a + b.metrics.totalRequests, 0) * 100) || 0).toFixed(2),
      peakMemoryUsed: Math.max(...this.results.filter(r => r.metrics.peakMemory > 0).map(r => r.metrics.peakMemory)).toFixed(2)
    };
  }
}

// Main execution
async function main() {
  const runner = new LoadTestRunner();
  await runner.runAllScenarios();
  
  console.log('\n' + '='.repeat(60));
  console.log('Load Test Execution Complete!');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

module.exports = LoadTestRunner;
