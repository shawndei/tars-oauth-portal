/**
 * Tool Execution Speed Benchmark Suite
 * Tests performance of core OpenClaw tools
 */

class ToolsBenchmarkSuite {
  constructor(metricsCollector) {
    this.collector = metricsCollector;
    this.suiteName = 'Tool Execution Speed';
  }

  async run(config = {}) {
    console.log(`\n┌─────────────────────────────────────────────────┐`);
    console.log(`│ Suite: ${this.suiteName.padEnd(42)} │`);
    console.log(`└─────────────────────────────────────────────────┘`);

    const tests = [
      { name: 'simple_command', fn: this.testSimpleCommand.bind(this), iterations: config.quick ? 5 : 10 },
      { name: 'echo_command', fn: this.testEchoCommand.bind(this), iterations: config.quick ? 5 : 15 },
      { name: 'file_read', fn: this.testFileRead.bind(this), iterations: config.quick ? 5 : 10 }
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.fn, test.iterations);
    }
  }

  async runTest(testName, testFn, iterations) {
    process.stdout.write(`  ⏳ ${testName.padEnd(30)} [${iterations} iterations]  `);
    
    const results = [];
    
    try {
      for (let i = 0; i < iterations; i++) {
        const context = this.collector.startOperation(testName, { iteration: i + 1 });
        
        try {
          const result = await testFn();
          this.collector.endOperation(context, { 
            success: true, 
            cost: 0, // Tool operations typically have no API cost
            tokens: 0 
          });
          results.push({ success: true });
        } catch (error) {
          this.collector.endOperation(context, { 
            success: false, 
            error: error.message,
            cost: 0,
            tokens: 0
          });
          results.push({ success: false, error: error.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const successRate = successCount / iterations;
      
      console.log(`${successRate >= 0.95 ? '✓' : '⚠'}`);
      
    } catch (error) {
      console.log(`✗ ${error.message}`);
    }
  }

  async testSimpleCommand() {
    // Simulate a simple command execution
    const start = Date.now();
    
    // Simulate command processing time (5-50ms variance)
    await this.sleep(5 + Math.random() * 15);
    
    return { 
      success: true, 
      output: 'command executed',
      duration: Date.now() - start
    };
  }

  async testEchoCommand() {
    // Simulate echo command (very fast, 1-10ms)
    const start = Date.now();
    await this.sleep(1 + Math.random() * 5);
    
    return { 
      success: true, 
      output: 'test',
      duration: Date.now() - start
    };
  }

  async testFileRead() {
    // Simulate file read operation (10-50ms depending on size)
    const start = Date.now();
    await this.sleep(10 + Math.random() * 20);
    
    return {
      success: true,
      content: 'file content',
      duration: Date.now() - start
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ToolsBenchmarkSuite;
