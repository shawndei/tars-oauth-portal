# Quick Integration Guide for Main Agent

**For:** Integrating skill discovery + routing into main TARS agent  
**Time:** ~5 minutes to integrate

---

## Copy-Paste Integration

### Step 1: Import in Your Main Agent

```javascript
const { SkillDiscovery } = require('./skills/skill-discovery');
const { AgentRouter } = require('./skills/skill-discovery/agent-router');
const { HotReloadManager } = require('./skills/skill-discovery/hot-reload');

class MainAgent {
  constructor() {
    this.discovery = null;
    this.router = null;
    this.reloadMgr = null;
  }

  async initialize() {
    console.log('🚀 Initializing TARS with Skill Discovery...');

    // Load skill registry
    this.discovery = new SkillDiscovery();
    await this.discovery.initialize();
    console.log(`✓ Loaded ${Object.keys(this.discovery.skillRegistry).length} skills`);

    // Initialize routing
    this.router = new AgentRouter(this.discovery);
    console.log('✓ Agent router ready');

    // Start hot-reload monitoring
    this.reloadMgr = new HotReloadManager(this.discovery, this.router);
    await this.reloadMgr.initialize();
    
    // Listen for skill updates
    this.reloadMgr.onReload((results) => {
      console.log(`🔄 Skills updated: ${results.reloaded.length} reloaded, ${results.new.length} new`);
      // Update dashboard, logs, metrics...
    });

    console.log('✓ System ready with hot-reload enabled');
    return this;
  }

  async handleUserRequest(request) {
    console.log(`\n📝 Request: "${request}"\n`);

    // Get routing decision
    const routing = await this.router.route(request, {
      decompose: true,      // Enable complex decomposition
      allowParallel: false, // Keep sequential for now
      maxAgents: 2
    });

    if (routing.status !== 'routed') {
      return {
        success: false,
        error: routing.error || 'No suitable agent found'
      };
    }

    // Execute based on routing type
    if (routing.type === 'simple') {
      return await this._executeSingle(routing);
    } else {
      return await this._executeChain(routing);
    }
  }

  async _executeSingle(routing) {
    const { agent, skillName, estimatedDuration } = routing.routing;
    console.log(`🎯 Routing: ${agent} agent → ${skillName}`);
    console.log(`⏱️  Estimated: ${estimatedDuration}s\n`);

    const startTime = Date.now();

    try {
      // TODO: Invoke actual agent with skill
      // const result = await this.invokeAgent(agent, skillName, routing.task);
      
      // For now, simulate
      const result = {
        status: 'completed',
        skill: skillName,
        agent: agent,
        timestamp: new Date().toISOString()
      };

      const duration = (Date.now() - startTime) / 1000;
      
      // Report completion
      this.router.reportTaskCompletion(agent, duration, true);

      return {
        success: true,
        agent,
        skill: skillName,
        duration,
        result
      };

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.router.reportTaskCompletion(agent, duration, false);

      return {
        success: false,
        error: error.message,
        agent
      };
    }
  }

  async _executeChain(routing) {
    const { executionPlan, subTasks } = routing.routing;
    console.log(`⛓️  Chain: ${subTasks} sub-tasks in ${executionPlan.phases.length} phases\n`);

    const results = [];
    const startTime = Date.now();

    try {
      // Execute each phase
      for (let i = 0; i < executionPlan.phases.length; i++) {
        const phase = executionPlan.phases[i];
        console.log(`📍 Phase ${i + 1}/${executionPlan.phases.length}:`);

        for (const step of phase.steps) {
          if (step.error) {
            console.log(`  ✗ ${step.skill}: ${step.error}`);
            continue;
          }

          const agent = step.agent.role;
          const skill = step.skill;
          const task = step.task;

          console.log(`  ⚙️  ${agent} → ${skill}`);

          // TODO: Invoke agent
          // const result = await this.invokeAgent(agent, skill, task);
          
          // Simulate
          const result = { status: 'completed', task };
          results.push(result);
        }
      }

      // Report all completions
      for (const phase of executionPlan.phases) {
        for (const step of phase.steps) {
          if (step.agent) {
            this.router.reportTaskCompletion(step.agent.role, 5, true);
          }
        }
      }

      const duration = (Date.now() - startTime) / 1000;

      return {
        success: true,
        phases: executionPlan.phases.length,
        duration,
        results
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        phases: executionPlan.phases.length
      };
    }
  }

  getStatus() {
    return {
      agent: 'TARS',
      skillDiscovery: {
        skills: Object.keys(this.discovery.skillRegistry).length,
        lastScan: this.discovery.lastScanTime
      },
      routing: this.router.getStats(),
      hotReload: this.reloadMgr.getStatus()
    };
  }

  async shutdown() {
    console.log('🛑 Shutting down TARS...');
    
    // Wait for pending tasks
    const load = this.router.getLoadState();
    while (Object.values(load).some(l => l.active > 0)) {
      console.log('  Waiting for agents to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Stop hot-reload
    this.reloadMgr.stop();
    
    console.log('✓ Shutdown complete');
  }
}

// Usage
(async () => {
  const agent = new MainAgent();
  await agent.initialize();

  // Handle requests
  const result = await agent.handleUserRequest('send email notifications');
  console.log(`\nResult:`, result);

  // Check status
  console.log('\nSystem Status:');
  console.log(agent.getStatus());

  // Shutdown
  // await agent.shutdown();
})();
```

---

## Integration Points

### In Your Main Agent Loop

```javascript
async function processUserInput(userMessage) {
  try {
    const routing = await mainAgent.router.route(userMessage, {
      decompose: true,
      allowParallel: false
    });

    if (routing.status === 'routed') {
      // Route to appropriate agent/skill
      return await executeRouting(routing);
    } else {
      // Handle routing failure
      return {
        response: `I couldn't find a suitable approach. Error: ${routing.error}`,
        error: true
      };
    }

  } catch (error) {
    console.error('Routing error:', error);
    return {
      response: 'System error processing request',
      error: true
    };
  }
}
```

### Monitor Agent Load

```javascript
setInterval(() => {
  const stats = mainAgent.router.getStats();
  
  // Log to monitoring system
  console.log('Agent Load:', stats.agentLoad);
  
  // Alert if overloaded
  for (const [role, load] of Object.entries(stats.agentLoad)) {
    const util = load.active / 3;  // Assume max 3 concurrent
    if (util > 0.9) {
      console.warn(`⚠️  ${role} at ${(util * 100).toFixed(0)}% capacity`);
    }
  }
}, 10000);  // Every 10 seconds
```

### Handle Hot-Reload Events

```javascript
mainAgent.reloadMgr.onReload((results) => {
  // Update dashboard/UI
  if (results.new.length > 0) {
    console.log(`✨ New skills available: ${results.new.join(', ')}`);
    notifyUser('New capabilities added');
  }

  if (results.removed.length > 0) {
    console.log(`🗑️  Skills removed: ${results.removed.join(', ')}`);
    rerouteInprogressTasks(results.removed);
  }

  // Update metrics
  const stats = mainAgent.router.getStats();
  metrics.gauge('system.skills', stats.agentProfiles.length);
});
```

---

## Minimal Example (30 seconds)

```javascript
const { SkillDiscovery } = require('./skills/skill-discovery');
const { AgentRouter } = require('./skills/skill-discovery/agent-router');

// Initialize
const discovery = new SkillDiscovery();
await discovery.initialize();

const router = new AgentRouter(discovery);

// Use
const routing = await router.route('send email notifications');
console.log(`Route to: ${routing.routing.agent}`);
```

---

## Testing Your Integration

### Test Routing

```javascript
async function testIntegration() {
  const testCases = [
    'send email notification',
    'analyze market trends',
    'search memory for patterns',
    'generate documentation',
    'debug code issues'
  ];

  console.log('Testing routing...\n');

  for (const task of testCases) {
    const routing = await mainAgent.router.route(task);
    
    if (routing.status === 'routed') {
      const { agent, skillName, priority } = routing.routing;
      console.log(`✓ ${task}`);
      console.log(`  → ${agent} (${skillName}, priority: ${priority})\n`);
    } else {
      console.log(`✗ ${task}`);
      console.log(`  Error: ${routing.error}\n`);
    }
  }
}
```

### Test Hot-Reload

```javascript
async function testHotReload() {
  console.log('Testing hot-reload...\n');

  // Register callback
  let callCount = 0;
  mainAgent.reloadMgr.onReload(() => {
    callCount++;
    console.log(`Reload event #${callCount} triggered`);
  });

  console.log('Now modify a SKILL.md file in skills/ directory...');
  console.log('The system will automatically detect and reload it.\n');

  // Monitor for 30 seconds
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (callCount > 0) {
      console.log(`✓ Hot-reload working! (${callCount} reload(s))`);
      return;
    }
  }

  console.log('⚠️  No reload detected in 30 seconds (you may need to save a SKILL.md)');
}
```

---

## Common Patterns

### Chain Multiple Skills

```javascript
const routing = await router.route(
  'search memory, analyze patterns, and generate report',
  {
    decompose: true,
    allowParallel: false,
    maxAgents: 3
  }
);

// routing.type === 'complex'
// routing.routing.executionPlan.phases contains ordered steps
```

### Load Balancing

```javascript
const load = router.getLoadState();

// Find most available agent
const available = Object.entries(load)
  .filter(([role, state]) => state.active < 3)
  .sort((a, b) => b[1].completed - a[1].completed)
  [0];

if (available) {
  const [role] = available;
  console.log(`Using ${role} agent (best available)`);
}
```

### Error Recovery

```javascript
async function robustRoute(task, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const routing = await router.route(task);
    
    if (routing.status === 'routed') {
      return routing;
    }

    if (i < maxRetries - 1) {
      console.log(`Attempt ${i + 1} failed, retrying...`);
      await sleep(1000);
    }
  }

  return null;  // All retries exhausted
}
```

---

## Configuration

### Custom Agent Profiles

```javascript
const customProfiles = {
  'ml-specialist': {
    id: 'ml-001',
    role: 'ml-specialist',
    capabilities: ['ml', 'train', 'predict'],
    maxConcurrent: 1,
    costPerMToken: 50,
    qualityScore: 0.99
  }
};

const router = new AgentRouter(discovery, customProfiles);
```

### Routing Options

```javascript
// Aggressive (fast, parallel)
await router.route(task, {
  decompose: true,
  allowParallel: true,
  maxAgents: 5
});

// Conservative (safe, sequential)
await router.route(task, {
  decompose: false,
  allowParallel: false,
  maxAgents: 1
});
```

---

## Support

- See `INTEGRATION.md` for detailed API reference
- See `EXAMPLES.md` for advanced usage
- See `test-integration.js` for complete test examples
- Run `node test.js` for core functionality tests
- Run `node test-integration.js` for routing/reload tests

---

**Ready to integrate?** Start with the minimal example above, then build up as needed.
