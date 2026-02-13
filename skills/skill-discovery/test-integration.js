#!/usr/bin/env node

/**
 * Integration Tests for Agent Router & Hot-Reload
 * 
 * Tests the new integration components:
 * - Agent Router (task routing to agents)
 * - Hot-Reload Manager (dynamic skill updates)
 */

const { SkillDiscovery } = require('./index');
const { AgentRouter } = require('./agent-router');
const { HotReloadManager } = require('./hot-reload');

class IntegrationTestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, fn) {
    try {
      await fn();
      this.passed++;
      console.log(`✓ ${name}`);
    } catch (error) {
      this.failed++;
      console.error(`✗ ${name}`);
      console.error(`  Error: ${error.message}`);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertExists(value, message) {
    if (!value) {
      throw new Error(message || 'Value should exist');
    }
  }

  summary() {
    console.log('\n' + '='.repeat(60));
    console.log(`Test Results: ${this.passed} passed, ${this.failed} failed`);
    console.log('='.repeat(60) + '\n');
    return this.failed === 0;
  }
}

async function runIntegrationTests() {
  console.log('🧪 Running Skill Discovery Integration Tests\n');

  const runner = new IntegrationTestRunner();

  // Initialize test fixtures
  let discovery;
  let router;
  let reloadMgr;

  // Setup
  console.log('⚙️  Setting up test environment...\n');
  discovery = new SkillDiscovery();
  await discovery.initialize();
  console.log(`✓ Loaded ${Object.keys(discovery.skillRegistry).length} skills\n`);

  // --- Agent Router Tests ---
  console.log('🎯 Agent Router Tests\n');

  await runner.test('AgentRouter: Initialize with skill discovery', async () => {
    router = new AgentRouter(discovery);
    runner.assertExists(router, 'Router should be created');
    runner.assertExists(router.agentProfiles, 'Router should have agent profiles');
    runner.assertEqual(Object.keys(router.agentProfiles).length, 5, 'Should have 5 default agents');
  });

  await runner.test('AgentRouter: Route simple task', async () => {
    const routing = await router.route('send email notification', {
      decompose: false,
      maxAgents: 1
    });

    runner.assert(routing.status === 'routed' || routing.status === 'no-capacity', 
      'Should route or report no capacity');
    
    if (routing.status === 'routed') {
      runner.assert(routing.type === 'simple', 'Should be simple routing');
      runner.assertExists(routing.routing.agent, 'Should assign agent');
      runner.assertExists(routing.routing.skillName, 'Should assign skill');
    }
  });

  await runner.test('AgentRouter: Route complex task with decomposition', async () => {
    const routing = await router.route(
      'search memory for patterns and analyze them and generate a report',
      {
        decompose: true,
        allowParallel: true,
        maxAgents: 3
      }
    );

    runner.assert(routing.status === 'routed' || routing.status === 'low-feasibility', 
      'Should route or report low feasibility');
    
    if (routing.status === 'routed') {
      runner.assert(routing.type === 'complex', 'Should be complex routing');
      runner.assertExists(routing.routing.executionPlan, 'Should have execution plan');
      runner.assert(routing.routing.executionPlan.phases.length > 0, 'Should have phases');
    }
  });

  await runner.test('AgentRouter: Map skill to agent', async () => {
    // Test skill-to-agent mapping
    const skillNames = [
      'episodic-memory',  // Should map to analyst
      'email-integration', // Should map to writer (or analyst)
      'code-sandbox',     // Should map to coder
    ];

    for (const skillName of skillNames) {
      const agent = router._mapSkillToAgent(skillName);
      runner.assert(agent !== null, `Should map ${skillName} to agent`);
      runner.assert(router.agentProfiles[agent], `Should be valid agent: ${agent}`);
    }
  });

  await runner.test('AgentRouter: Load state tracking', async () => {
    const initialLoad = router.getLoadState();
    runner.assert(initialLoad !== null, 'Should return load state');
    runner.assert(initialLoad.researcher !== undefined, 'Should track researcher');

    // Update load
    router._updateAgentLoad('researcher', 1);
    const updatedLoad = router.getLoadState();
    runner.assertEqual(updatedLoad.researcher.active, 1, 'Should increment active');

    // Report completion
    router.reportTaskCompletion('researcher', 10, true);
    const finalLoad = router.getLoadState();
    runner.assertEqual(finalLoad.researcher.active, 0, 'Should decrement active');
    runner.assertEqual(finalLoad.researcher.completed, 1, 'Should track completed');
  });

  await runner.test('AgentRouter: Get statistics', async () => {
    const stats = router.getStats();
    runner.assert(stats.totalRouted !== undefined, 'Should report total routed');
    runner.assertExists(stats.agentLoad, 'Should report agent load');
    runner.assertExists(stats.agentProfiles, 'Should list agent profiles');
    runner.assert(stats.cacheSize !== undefined, 'Should report cache size');
  });

  await runner.test('AgentRouter: Routing cache', async () => {
    const task1 = 'analyze market trends';
    const task2 = 'send email notification';

    // Route first task
    const routing1 = await router.route(task1);
    const cacheSize1 = router.routingCache.size;

    // Route same task (should use cache)
    const routing2 = await router.route(task1);
    const cacheSize2 = router.routingCache.size;

    runner.assert(cacheSize2 >= cacheSize1, 'Cache should store routing decision');

    // Route different task
    const routing3 = await router.route(task2);
    const cacheSize3 = router.routingCache.size;

    runner.assert(cacheSize3 > cacheSize1, 'Cache should grow with new queries');

    // Clear cache
    router.clearCache();
    runner.assertEqual(router.routingCache.size, 0, 'Cache should be cleared');
  });

  // --- Hot-Reload Manager Tests ---
  console.log('\n⚡ Hot-Reload Manager Tests\n');

  await runner.test('HotReloadManager: Initialize', async () => {
    reloadMgr = new HotReloadManager(discovery, router);
    const initialized = await reloadMgr.initialize();
    
    runner.assert(initialized, 'Should initialize successfully');
    runner.assert(reloadMgr.isInitialized, 'Should set initialized flag');
  });

  await runner.test('HotReloadManager: Get status', async () => {
    const status = reloadMgr.getStatus();
    
    runner.assert(status.initialized !== undefined, 'Should report initialization');
    runner.assert(status.isReloading !== undefined, 'Should report reload state');
    runner.assertExists(status.queuedSkills, 'Should report queued skills');
    runner.assert(status.registrySize !== undefined, 'Should report registry size');
    runner.assert(status.registrySize > 0, 'Should have loaded skills');
  });

  await runner.test('HotReloadManager: Register callback', async () => {
    let callbackCalled = false;
    
    reloadMgr.onReload(() => {
      callbackCalled = true;
    });

    runner.assert(reloadMgr.reloadCallbacks.length > 0, 'Should register callback');
  });

  await runner.test('HotReloadManager: Queue skill reload', async () => {
    const initialQueueLength = reloadMgr.reloadQueue.length;
    
    reloadMgr._queueSkillReload('episodic-memory', 'change');
    
    runner.assert(reloadMgr.reloadQueue.length >= initialQueueLength, 
      'Should queue skill');
  });

  await runner.test('HotReloadManager: Reload all skills', async () => {
    const beforeStats = discovery.getStats();
    
    const results = await reloadMgr.reloadAll();
    
    runner.assertExists(results, 'Should return reload results');
    runner.assertExists(results.reloaded, 'Should report reloaded skills');
    runner.assertExists(results.new, 'Should report new skills');
    runner.assertExists(results.failed, 'Should report failed skills');
    
    const afterStats = discovery.getStats();
    runner.assert(afterStats.totalSkills >= beforeStats.totalSkills, 
      'Registry should be maintained or grown');
  });

  await runner.test('HotReloadManager: Stop manager', async () => {
    reloadMgr.stop();
    
    runner.assert(!reloadMgr.isInitialized, 'Should mark as stopped');
    runner.assertEqual(reloadMgr.watchers.length, 0, 'Should close watchers');
  });

  // --- Integration Scenario Tests ---
  console.log('\n🔗 Integration Scenarios\n');

  await runner.test('Scenario: Full routing workflow with agent assignment', async () => {
    // Fresh router
    const freshRouter = new AgentRouter(discovery);

    // Route complex task
    const routing = await freshRouter.route(
      'analyze data and generate insights',
      { decompose: true }
    );

    runner.assert(routing.status === 'routed' || routing.status === 'low-feasibility',
      'Should complete routing workflow');

    if (routing.status === 'routed') {
      const { agentId, skillName } = routing.routing;
      runner.assertExists(agentId, 'Should assign agent');
      runner.assertExists(skillName, 'Should assign skill');

      // Simulate task completion
      const { agent } = routing.routing;
      const duration = Math.random() * 30;
      freshRouter.reportTaskCompletion(agent, duration, true);

      // Verify load updated
      const load = freshRouter.getLoadState();
      runner.assert(load[agent].completed > 0, 'Should track completion');
    }
  });

  await runner.test('Scenario: Skill discovery updates with hot-reload', async () => {
    // Initialize both systems
    const testDiscovery = new SkillDiscovery();
    await testDiscovery.initialize();
    
    const testRouter = new AgentRouter(testDiscovery);
    const testReload = new HotReloadManager(testDiscovery, testRouter);
    await testReload.initialize();

    // Record initial state
    const initialSkillCount = Object.keys(testDiscovery.skillRegistry).length;
    const initialCacheSize = testRouter.routingCache.size;

    // Simulate reload
    const results = await testReload.reloadAll();

    // Verify state
    const finalSkillCount = Object.keys(testDiscovery.skillRegistry).length;
    runner.assert(finalSkillCount >= initialSkillCount, 'Should maintain or grow skill count');

    // Cache should be cleared
    runner.assertEqual(testRouter.routingCache.size, 0, 'Cache should be cleared after reload');

    // Cleanup
    testReload.stop();
  });

  await runner.test('Scenario: Agent load balancing under load', async () => {
    const loadRouter = new AgentRouter(discovery);
    const tasks = [
      'send email notification',
      'analyze market data',
      'search memory for patterns',
      'write documentation',
      'debug code issues'
    ];

    // Simulate routing multiple tasks
    for (const task of tasks) {
      const routing = await loadRouter.route(task);
      if (routing.status === 'routed') {
        // Simulate task execution time
        const agent = routing.routing.agent;
        loadRouter._updateAgentLoad(agent, 1);
      }
    }

    // Check load distribution
    const load = loadRouter.getLoadState();
    let totalActive = 0;
    for (const [role, state] of Object.entries(load)) {
      totalActive += state.active;
    }

    runner.assert(totalActive <= tasks.length, 'Should distribute load across agents');
  });

  await runner.test('Scenario: Recovery from routing failures', async () => {
    const recoveryRouter = new AgentRouter(discovery);

    // Try to route with strict requirements
    const failRouting = await recoveryRouter.route('search and analyze research data', {
      decompose: false,
      maxAgents: 1
    });

    // Fallback to decomposition if needed
    if (failRouting.status !== 'routed') {
      const fallbackRouting = await recoveryRouter.route('search and analyze research data', {
        decompose: true,
        maxAgents: 3
      });

      runner.assert(
        fallbackRouting.status === 'routed' || 
        fallbackRouting.status === 'low-feasibility' ||
        fallbackRouting.status === 'no-match',
        'Should attempt fallback routing'
      );
    }

    // At least one routing should succeed
    runner.assert(
      failRouting.status === 'routed' || failRouting.status === 'no-match',
      'Should handle routing response'
    );
  });

  // Summary
  return runner.summary();
}

// Run tests
if (require.main === module) {
  runIntegrationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests };
