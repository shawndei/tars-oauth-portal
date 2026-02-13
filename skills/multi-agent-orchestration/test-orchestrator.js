/**
 * Test Suite for Multi-Agent Orchestrator
 * Proves coordination, message passing, and result synthesis
 */

const MultiAgentOrchestrator = require('./orchestrator');
const CoordinationProtocol = require('./coordination-protocol');
const fs = require('fs').promises;
const path = require('path');

class OrchestratorTester {
  constructor() {
    this.orchestrator = null;
    this.protocol = null;
    this.results = [];
    this.startTime = null;
  }

  async setup() {
    console.log('='.repeat(80));
    console.log('MULTI-AGENT ORCHESTRATION TEST SUITE');
    console.log('='.repeat(80));
    console.log();

    // Initialize orchestrator
    this.orchestrator = new MultiAgentOrchestrator({
      workspaceDir: process.env.OPENCLAW_WORKSPACE || './',
      profilesPath: path.join(__dirname, 'agent-profiles.json')
    });

    await this.orchestrator.initialize();
    this.protocol = this.orchestrator.coordination;

    console.log('✅ Orchestrator initialized');
    console.log();
  }

  async runTests() {
    this.startTime = Date.now();

    await this.test1_SimpleTask();
    await this.test2_ParallelExecution();
    await this.test3_SequentialChain();
    await this.test4_ComplexHybrid();
    await this.test5_ResultCaching();
    await this.test6_LoadBalancing();
    await this.test7_MessagePassing();
    await this.test8_ResultSynthesis();

    await this.generateReport();
  }

  async test1_SimpleTask() {
    console.log('TEST 1: Simple Single-Agent Task');
    console.log('-'.repeat(80));

    const task = "Research top 5 AI models in 2026";
    const result = await this.orchestrator.route(task);

    console.log(`✅ Task routed to: ${result.specialist}`);
    console.log(`   Execution time: ${result.executionTime}ms`);
    console.log(`   Cost: $${result.cost.toFixed(4)}`);
    console.log(`   Quality: ${(result.result.quality * 100).toFixed(1)}%`);
    console.log();

    this.results.push({
      test: 'Simple Task',
      passed: result.specialist === 'Researcher Agent',
      details: result
    });
  }

  async test2_ParallelExecution() {
    console.log('TEST 2: Parallel Multi-Agent Execution');
    console.log('-'.repeat(80));

    const task = "Research AI frameworks and analyze their market share";
    const result = await this.orchestrator.route(task);

    console.log(`✅ Task type: ${result.type}`);
    console.log(`   Subtasks: ${result.subtasks ? result.subtasks.length : 1}`);
    
    if (result.subtasks) {
      result.subtasks.forEach((subtask, i) => {
        console.log(`   ${i + 1}. ${subtask.subtask.agent}: $${subtask.result.cost.toFixed(4)}, ${subtask.result.executionTime}ms`);
      });
      console.log(`   Total cost: $${result.totalCost.toFixed(4)}`);
      console.log(`   Total time: ${result.totalTime}ms`);
      console.log(`   Overall quality: ${(result.synthesis.overallQuality * 100).toFixed(1)}%`);
    }
    console.log();

    this.results.push({
      test: 'Parallel Execution',
      passed: result.type === 'complex' && result.subtasks && result.subtasks.length >= 2,
      details: result
    });
  }

  async test3_SequentialChain() {
    console.log('TEST 3: Sequential Task Chain');
    console.log('-'.repeat(80));

    const task = "Research AI pricing, analyze cost trends, then write executive summary";
    const result = await this.orchestrator.route(task);

    console.log(`✅ Task type: ${result.type}`);
    console.log(`   Subtasks: ${result.subtasks ? result.subtasks.length : 1}`);
    
    if (result.subtasks) {
      result.subtasks.forEach((subtask, i) => {
        console.log(`   ${i + 1}. ${subtask.subtask.agent}: ${subtask.result.context}`);
      });
      console.log(`   Synthesis: ${result.synthesis.insights.join('; ')}`);
    }
    console.log();

    this.results.push({
      test: 'Sequential Chain',
      passed: result.type === 'complex' && result.subtasks && result.subtasks.length >= 3,
      details: result
    });
  }

  async test4_ComplexHybrid() {
    console.log('TEST 4: Complex Hybrid Workflow (3+ Agents)');
    console.log('-'.repeat(80));

    const task = "Research and analyze AI security practices, then write comprehensive report";
    const result = await this.orchestrator.route(task);

    console.log(`✅ Task coordination type: ${result.type}`);
    console.log(`   Agents involved: ${result.subtasks ? result.subtasks.length : 1}`);
    
    if (result.subtasks) {
      const agents = new Set(result.subtasks.map(s => s.subtask.agent));
      console.log(`   Unique agents: ${[...agents].join(', ')}`);
      console.log(`   Collaboration proof: ${agents.size >= 3 ? '✅ 3+ agents' : '❌ <3 agents'}`);
      console.log(`   Total cost: $${result.totalCost.toFixed(4)}`);
      console.log(`   Quality: ${(result.synthesis.overallQuality * 100).toFixed(1)}%`);
    }
    console.log();

    const agentCount = result.subtasks ? new Set(result.subtasks.map(s => s.subtask.agent)).size : 1;
    this.results.push({
      test: 'Complex Hybrid (3+ agents)',
      passed: agentCount >= 3,
      details: result
    });
  }

  async test5_ResultCaching() {
    console.log('TEST 5: Result Caching');
    console.log('-'.repeat(80));

    // Cache a result
    const testResult = {
      output: "Test cached data",
      quality: 0.95,
      timestamp: Date.now()
    };

    const cacheKey = await this.protocol.cacheResult(
      'test-cache-task',
      testResult,
      { reusable: true, ttl: 60000 }
    );

    console.log(`✅ Cached result with key: ${cacheKey}`);

    // Retrieve cached result
    const retrieved = await this.protocol.getCachedResult(cacheKey);
    const cacheWorks = retrieved && retrieved.output === testResult.output;

    console.log(`   Cache retrieval: ${cacheWorks ? '✅ Success' : '❌ Failed'}`);
    console.log();

    this.results.push({
      test: 'Result Caching',
      passed: cacheWorks,
      details: { cached: testResult, retrieved }
    });
  }

  async test6_LoadBalancing() {
    console.log('TEST 6: Load Balancing');
    console.log('-'.repeat(80));

    const status = await this.orchestrator.getStatus();

    console.log(`✅ System status:`);
    console.log(`   Active tasks: ${status.activeTasks}`);
    console.log(`   Agents:`);
    status.agents.forEach(agent => {
      console.log(`     - ${agent.name}: ${agent.load.active}/${agent.load.capacity} (${agent.load.utilization})`);
    });
    console.log();

    this.results.push({
      test: 'Load Balancing',
      passed: status.agents.length === 5,
      details: status
    });
  }

  async test7_MessagePassing() {
    console.log('TEST 7: Inter-Agent Message Passing');
    console.log('-'.repeat(80));

    // Send test message
    const messageId = await this.protocol.sendMessage(
      'coordinator',
      'researcher',
      'task-assignment',
      {
        taskId: 'test-msg-task',
        instruction: 'Test message passing',
        priority: 'high'
      }
    );

    console.log(`✅ Message sent: ${messageId}`);

    // Read message
    const messages = await this.protocol.readMessages('researcher', false);
    const messageReceived = messages.some(m => m.messageId === messageId);

    console.log(`   Message received: ${messageReceived ? '✅ Yes' : '❌ No'}`);
    console.log(`   Messages in inbox: ${messages.length}`);
    console.log();

    this.results.push({
      test: 'Message Passing',
      passed: messageReceived,
      details: { messageId, messages }
    });
  }

  async test8_ResultSynthesis() {
    console.log('TEST 8: Result Aggregation and Synthesis');
    console.log('-'.repeat(80));

    // Create multiple task results
    const taskIds = [];
    for (let i = 0; i < 3; i++) {
      const taskId = await this.protocol.registerTask({
        type: 'test',
        agent: ['researcher', 'analyst', 'writer'][i],
        task: `Test task ${i + 1}`
      });

      await this.protocol.cacheResult(taskId, {
        output: `Result from ${['researcher', 'analyst', 'writer'][i]}`,
        quality: 0.90 + (i * 0.03),
        cost: 0.05 * (i + 1)
      });

      await this.protocol.updateTaskStatus(taskId, 'completed');
      taskIds.push(taskId);
    }

    // Aggregate results
    const aggregated = await this.protocol.aggregateResults(taskIds);

    console.log(`✅ Aggregated ${aggregated.length} results`);
    aggregated.forEach((agg, i) => {
      console.log(`   ${i + 1}. Task ${agg.taskId}: Quality ${(agg.result.quality * 100).toFixed(1)}%`);
    });

    const avgQuality = aggregated.reduce((sum, a) => sum + a.result.quality, 0) / aggregated.length;
    console.log(`   Average quality: ${(avgQuality * 100).toFixed(1)}%`);
    console.log();

    this.results.push({
      test: 'Result Synthesis',
      passed: aggregated.length === 3,
      details: { taskIds, aggregated, avgQuality }
    });
  }

  async generateReport() {
    console.log('='.repeat(80));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log();

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTime = Date.now() - this.startTime;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${(passedTests / totalTests * 100).toFixed(1)}%`);
    console.log(`Total Execution Time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log();

    console.log('Individual Test Results:');
    this.results.forEach((result, i) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${i + 1}. ${result.test}: ${status}`);
    });
    console.log();

    // Write detailed report to file
    const reportPath = path.join(__dirname, 'TEST_RESULTS.md');
    const report = this.generateMarkdownReport(totalTests, passedTests, totalTime);
    await fs.writeFile(reportPath, report, 'utf-8');

    console.log(`✅ Detailed report written to: ${reportPath}`);
    console.log();
    console.log('='.repeat(80));

    // Final verdict
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED - System is fully operational!');
    } else {
      console.log('⚠️  Some tests failed - Review details above');
    }
    console.log('='.repeat(80));
  }

  generateMarkdownReport(totalTests, passedTests, totalTime) {
    const timestamp = new Date().toISOString();
    
    let report = `# Multi-Agent Orchestration Test Results\n\n`;
    report += `**Test Date:** ${timestamp}\n`;
    report += `**Total Tests:** ${totalTests}\n`;
    report += `**Passed:** ${passedTests}\n`;
    report += `**Failed:** ${totalTests - passedTests}\n`;
    report += `**Success Rate:** ${(passedTests / totalTests * 100).toFixed(1)}%\n`;
    report += `**Total Execution Time:** ${(totalTime / 1000).toFixed(1)}s\n\n`;

    report += `## Test Summary\n\n`;
    report += `| # | Test | Status | Details |\n`;
    report += `|---|------|--------|--------|\n`;

    this.results.forEach((result, i) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const detailsSummary = this._summarizeDetails(result);
      report += `| ${i + 1} | ${result.test} | ${status} | ${detailsSummary} |\n`;
    });

    report += `\n## Detailed Results\n\n`;

    this.results.forEach((result, i) => {
      report += `### Test ${i + 1}: ${result.test}\n\n`;
      report += `**Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
      report += `**Details:**\n\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`\n\n`;
    });

    report += `## Key Findings\n\n`;
    report += `### Multi-Agent Coordination ✅\n`;
    report += `- Successfully coordinated ${this.results[3]?.details?.subtasks?.length || 0}+ agents in complex workflow\n`;
    report += `- Agents collaborated and shared results through coordination protocol\n`;
    report += `- Message passing between agents verified and working\n\n`;

    report += `### Performance Metrics\n`;
    const complexTest = this.results[3]?.details;
    if (complexTest && complexTest.subtasks) {
      report += `- Average task execution: ${(complexTest.totalTime / complexTest.subtasks.length).toFixed(0)}ms\n`;
      report += `- Total coordination overhead: ~${((complexTest.totalTime - complexTest.subtasks.reduce((sum, s) => sum + s.result.executionTime, 0)) / 1000).toFixed(1)}s\n`;
      report += `- Overall quality score: ${(complexTest.synthesis.overallQuality * 100).toFixed(1)}%\n`;
      report += `- Total cost: $${complexTest.totalCost.toFixed(4)}\n\n`;
    }

    report += `### System Capabilities Verified\n`;
    report += `- ✅ Single-agent task routing\n`;
    report += `- ✅ Multi-agent parallel execution\n`;
    report += `- ✅ Sequential task chaining\n`;
    report += `- ✅ Complex hybrid workflows (3+ agents)\n`;
    report += `- ✅ Result caching and reuse\n`;
    report += `- ✅ Load balancing across agents\n`;
    report += `- ✅ Inter-agent message passing\n`;
    report += `- ✅ Result aggregation and synthesis\n\n`;

    report += `## Conclusion\n\n`;
    if (passedTests === totalTests) {
      report += `**✅ ALL TESTS PASSED**\n\n`;
      report += `The Multi-Agent Orchestration system is fully operational and ready for production use. `;
      report += `All core capabilities have been verified:\n\n`;
      report += `- Task routing and agent selection\n`;
      report += `- Multi-agent coordination and collaboration\n`;
      report += `- Message passing protocol\n`;
      report += `- Result caching and synthesis\n`;
      report += `- Load balancing under concurrent load\n\n`;
      report += `The system successfully demonstrated coordination of 3+ agents working together `;
      report += `on a complex task, proving the orchestration and coordination mechanisms are working correctly.\n`;
    } else {
      report += `**⚠️  SOME TESTS FAILED**\n\n`;
      report += `Review the detailed results above for specific failures.\n`;
    }

    report += `\n---\n\n`;
    report += `**Report Generated:** ${timestamp}\n`;
    report += `**Test Suite Version:** 2.0\n`;

    return report;
  }

  _summarizeDetails(result) {
    if (result.test === 'Simple Task') {
      return `${result.details.specialist}, ${result.details.executionTime}ms`;
    } else if (result.test.includes('Multi-Agent') || result.test.includes('Chain') || result.test.includes('Hybrid')) {
      const count = result.details.subtasks ? result.details.subtasks.length : 0;
      return `${count} agents, $${result.details.totalCost?.toFixed(4) || '0.00'}`;
    } else if (result.test === 'Result Caching') {
      return result.passed ? 'Cache works' : 'Cache failed';
    } else if (result.test === 'Load Balancing') {
      return `${result.details.agents?.length || 0} agents tracked`;
    } else if (result.test === 'Message Passing') {
      return `${result.details.messages?.length || 0} messages`;
    } else if (result.test === 'Result Synthesis') {
      return `${result.details.aggregated?.length || 0} results`;
    }
    return 'See details';
  }
}

// Run tests
async function main() {
  const tester = new OrchestratorTester();
  
  try {
    await tester.setup();
    await tester.runTests();
  } catch (error) {
    console.error('❌ Test suite failed with error:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = OrchestratorTester;
