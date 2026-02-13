# Skill Discovery & Routing Integration Guide

**Version:** 1.0.0  
**Last Updated:** 2026-02-13  
**Status:** Complete

---

## Overview

This guide explains how to integrate the Skill Auto-Discovery & Composition system with your multi-agent orchestration platform. It covers:

1. **Agent Router** - Intelligent task routing based on skills
2. **Hot-Reload Manager** - Dynamic skill discovery updates
3. **Integration Examples** - Real-world usage patterns
4. **Best Practices** - Performance and reliability guidance

---

## Quick Start

### 1. Initialize Skill Discovery

```javascript
const { SkillDiscovery } = require('./skills/skill-discovery');

const discovery = new SkillDiscovery();
await discovery.initialize();

console.log(`Loaded ${Object.keys(discovery.skillRegistry).length} skills`);
```

### 2. Create Agent Router

```javascript
const { AgentRouter } = require('./skills/skill-discovery/agent-router');

const router = new AgentRouter(discovery);

// Route a task
const routing = await router.route('send email notifications', {
  decompose: true,
  allowParallel: false,
  maxAgents: 2
});

console.log(`Task routed to: ${routing.routing.agent}`);
```

### 3. Enable Hot-Reload

```javascript
const { HotReloadManager } = require('./skills/skill-discovery/hot-reload');

const reloadMgr = new HotReloadManager(discovery, router);
await reloadMgr.initialize();

// Listen for reload events
reloadMgr.onReload((results) => {
  console.log(`Reloaded ${results.reloaded.length} skills`);
  console.log(`New skills: ${results.new.join(', ')}`);
});
```

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────┐
│         User Request / Task             │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│         Agent Router                     │
│  - Skill recommendation                 │
│  - Agent selection                      │
│  - Load balancing                       │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ↓                 ↓
   ┌─────────┐       ┌─────────┐
   │ Simple  │       │ Complex │
   │ Task    │       │ Task    │
   └────┬────┘       └────┬────┘
        │                 │
        │         ┌───────┴───────┐
        │         │               │
        ↓         ↓               ↓
     ┌──────────────────────────────────┐
     │    Skill Chain Composition       │
     │  - Goal decomposition             │
     │  - Dependency resolution          │
     │  - Execution planning             │
     └────────────────┬─────────────────┘
                      │
                      ↓
        ┌─────────────────────────────┐
        │  Agent Assignment           │
        │  - Role mapping             │
        │  - Load distribution        │
        │  - Capability matching      │
        └─────────────┬───────────────┘
                      │
                      ↓
        ┌─────────────────────────────┐
        │  Multi-Agent Orchestration  │
        │  - Coordinate execution      │
        │  - Handle dependencies       │
        │  - Manage results            │
        └─────────────────────────────┘
```

### Component Interaction

**1. Skill Discovery** → Registry of available skills
**2. Agent Router** → Matches tasks to agents
**3. Hot-Reload Manager** → Updates registry dynamically
**4. Multi-Agent System** → Executes assigned tasks

---

## Detailed Usage

### Agent Router API

#### route(task, options)

Route a single task to the best agent(s).

```javascript
const routing = await router.route('analyze market data', {
  decompose: true,          // Allow complex decomposition
  allowParallel: false,     // Disallow parallel execution
  preferredRole: 'analyst', // Request specific role
  maxAgents: 1,             // Max agents for this task
  timeout: 30000            // Timeout in ms
});

if (routing.status === 'routed') {
  const { agent, skill, estimatedDuration } = routing.routing;
  console.log(`Using ${skill} skill with ${agent} agent`);
  console.log(`Estimated duration: ${estimatedDuration}s`);
} else {
  console.log(`Routing failed: ${routing.error}`);
}
```

**Response for simple task:**

```json
{
  "status": "routed",
  "type": "simple",
  "task": "send email notification",
  "routing": {
    "skillName": "email-integration",
    "skillScore": 0.85,
    "skillReasoning": "handles send operations; works with email",
    "agent": "researcher",
    "agentId": "researcher-001",
    "estimatedDuration": 10,
    "priority": "high"
  }
}
```

**Response for complex task:**

```json
{
  "status": "routed",
  "type": "complex",
  "task": "search memory, analyze patterns, and generate report",
  "routing": {
    "chain": "search memory, analyze patterns, and generate report",
    "subTasks": 3,
    "feasibility": 0.95,
    "executionPlan": {
      "phases": [
        {
          "type": "sequential",
          "steps": [
            {
              "id": 0,
              "skill": "episodic-memory",
              "task": "search memory for patterns",
              "agent": {
                "role": "analyst",
                "id": "analyst-001"
              }
            }
          ]
        },
        {
          "type": "sequential",
          "steps": [
            {
              "id": 1,
              "skill": "data-analytics",
              "task": "analyze patterns",
              "agent": {
                "role": "analyst",
                "id": "analyst-001"
              }
            }
          ]
        }
      ],
      "dependencies": [
        {
          "dependsOn": 0,
          "phase": 1,
          "type": "sequential"
        }
      ]
    },
    "totalDuration": 45,
    "parallelGroups": [],
    "priority": "medium"
  }
}
```

#### reportTaskCompletion(role, duration, success)

Update agent load after task completion.

```javascript
// Task completed successfully
router.reportTaskCompletion('analyst', 23.5, true);

// Task failed
router.reportTaskCompletion('analyst', 15, false);
```

#### getLoadState()

Check current agent load.

```javascript
const loads = router.getLoadState();

console.log(loads);
// {
//   "researcher": { active: 1, completed: 5, failed: 0 },
//   "analyst": { active: 2, completed: 8, failed: 1 },
//   "coder": { active: 0, completed: 3, failed: 0 },
//   ...
// }

// Check if specific agent is available
const analystLoad = loads['analyst'];
if (analystLoad.active < 3) {
  console.log('Analyst has capacity');
}
```

#### getStats()

Get routing and agent statistics.

```javascript
const stats = router.getStats();

console.log(stats);
// {
//   "totalRouted": 42,
//   "agentLoad": {...},
//   "cacheSize": 15,
//   "agentProfiles": ["researcher", "coder", "analyst", "writer", "coordinator"],
//   "researcherSuccessRate": "100.0",
//   "analystSuccessRate": "88.9",
//   ...
// }
```

### Hot-Reload Manager API

#### initialize()

Start monitoring for skill changes.

```javascript
const reloadMgr = new HotReloadManager(discovery, router);

const initialized = await reloadMgr.initialize();
if (initialized) {
  console.log('Hot-reload active');
}
```

#### onReload(callback)

Register callback for reload events.

```javascript
reloadMgr.onReload((results) => {
  console.log('Skills reloaded:');
  console.log(`  Reloaded: ${results.reloaded.join(', ')}`);
  console.log(`  New: ${results.new.join(', ')}`);
  console.log(`  Removed: ${results.removed.join(', ')}`);
  console.log(`  Failed: ${results.failed.length}`);

  // Update UI, log metrics, etc.
  updateDashboard({ reloadResults: results });
});
```

#### reloadAll(force)

Force reload all skills.

```javascript
// Normal reload (skip if already reloading)
const results = await reloadMgr.reloadAll();

// Force reload (interrupt current reload)
const results = await reloadMgr.reloadAll(true);
```

#### reloadSkill(skillName)

Reload a specific skill.

```javascript
const results = await reloadMgr.reloadSkill('email-integration');

if (results.reloaded.includes('email-integration')) {
  console.log('Email integration skill updated');
  
  // Re-route any pending email tasks
  rerouteTasksWithSkill('email-integration');
}
```

#### getStatus()

Get hot-reload status.

```javascript
const status = reloadMgr.getStatus();

console.log(status);
// {
//   "initialized": true,
//   "isReloading": false,
//   "lastReload": "2026-02-13T12:45:30.000Z",
//   "queuedSkills": [],
//   "watchers": 1,
//   "registrySize": 41
// }
```

#### stop() / restart()

Stop or restart hot-reload manager.

```javascript
// Graceful shutdown
reloadMgr.stop();

// Restart after configuration change
await reloadMgr.restart();
```

---

## Integration Examples

### Example 1: Agent-Based Task Router

```javascript
const { SkillDiscovery } = require('./skills/skill-discovery');
const { AgentRouter } = require('./skills/skill-discovery/agent-router');

class AgentTaskRouter {
  constructor() {
    this.discovery = new SkillDiscovery();
    this.router = null;
  }

  async initialize() {
    await this.discovery.initialize();
    this.router = new AgentRouter(this.discovery);
    return this;
  }

  async handleUserRequest(userRequest) {
    console.log(`\n📝 User request: "${userRequest}"`);

    // Get routing decision
    const routing = await this.router.route(userRequest, {
      decompose: true,
      allowParallel: true
    });

    if (routing.status !== 'routed') {
      return {
        success: false,
        error: routing.error
      };
    }

    // Execute routing decision
    const result = await this._executeRouting(routing);
    
    // Report completion
    if (result.success) {
      const { agent, duration } = result;
      this.router.reportTaskCompletion(agent, duration, true);
    }

    return result;
  }

  async _executeRouting(routing) {
    if (routing.type === 'simple') {
      return this._executeSingle(routing);
    } else {
      return this._executeComplex(routing);
    }
  }

  async _executeSingle(routing) {
    const { skill, agent } = routing.routing;
    console.log(`\n🎯 Routing to ${agent} for skill: ${skill}`);

    // Execute with the agent
    const startTime = Date.now();
    const result = await this._invokeAgent(agent, skill, routing.task);
    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      skill,
      agent,
      duration,
      result
    };
  }

  async _executeComplex(routing) {
    const { executionPlan } = routing.routing;
    console.log(`\n⛓️  Composing skill chain with ${executionPlan.phases.length} phases`);

    const results = [];
    const startTime = Date.now();

    // Execute phases in order
    for (let i = 0; i < executionPlan.phases.length; i++) {
      const phase = executionPlan.phases[i];
      console.log(`\n📍 Phase ${i + 1}:`);

      for (const step of phase.steps) {
        if (step.error) {
          console.log(`  ✗ ${step.skill}: ${step.error}`);
          continue;
        }

        console.log(`  ⚙️  ${step.skill} (agent: ${step.agent.role})`);
        
        const result = await this._invokeAgent(
          step.agent.role,
          step.skill,
          step.task
        );

        results.push({
          step: step.id,
          skill: step.skill,
          agent: step.agent.role,
          result
        });
      }
    }

    const duration = (Date.now() - startTime) / 1000;

    return {
      success: true,
      phases: executionPlan.phases.length,
      duration,
      results
    };
  }

  async _invokeAgent(agent, skill, task) {
    // Invoke actual agent (implementation depends on your agent system)
    console.log(`    → Executing ${skill} skill...`);
    
    // Simulated execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      skill,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
  }
}

// Usage
(async () => {
  const router = new AgentTaskRouter();
  await router.initialize();

  const requests = [
    'send email notification to users',
    'analyze market trends and generate report',
    'search memory for recent decisions'
  ];

  for (const request of requests) {
    const result = await router.handleUserRequest(request);
    console.log(`Result: ${result.success ? '✓ Success' : '✗ Failed'}`);
  }
})();
```

### Example 2: Dynamic Skill Updating with Hot-Reload

```javascript
const { SkillDiscovery } = require('./skills/skill-discovery');
const { AgentRouter } = require('./skills/skill-discovery/agent-router');
const { HotReloadManager } = require('./skills/skill-discovery/hot-reload');

class DynamicAgentSystem {
  constructor() {
    this.discovery = new SkillDiscovery();
    this.router = null;
    this.reloadMgr = null;
  }

  async initialize() {
    // Initialize discovery
    await this.discovery.initialize();
    console.log(`✓ Loaded ${Object.keys(this.discovery.skillRegistry).length} skills`);

    // Initialize router
    this.router = new AgentRouter(this.discovery);

    // Initialize hot-reload
    this.reloadMgr = new HotReloadManager(this.discovery, this.router);
    await this.reloadMgr.initialize();

    // Listen for updates
    this.reloadMgr.onReload((results) => {
      this._handleSkillsUpdated(results);
    });

    console.log('✓ Dynamic agent system ready');
  }

  _handleSkillsUpdated(results) {
    console.log('\n🔄 Skill update detected!');

    if (results.new.length > 0) {
      console.log(`  ✨ New skills: ${results.new.join(', ')}`);
      this._notifyNewSkills(results.new);
    }

    if (results.reloaded.length > 0) {
      console.log(`  ♻️  Updated skills: ${results.reloaded.join(', ')}`);
      this._notifyUpdatedSkills(results.reloaded);
    }

    if (results.removed.length > 0) {
      console.log(`  🗑️  Removed skills: ${results.removed.join(', ')}`);
      this._notifyRemovedSkills(results.removed);
    }

    // Log metrics
    const stats = this.router.getStats();
    console.log(`  📊 Registry now has ${stats.agentProfiles.length} agent types`);
  }

  _notifyNewSkills(skills) {
    // Log to monitoring system, update dashboard, etc.
    console.log('    → New skills are immediately available');
  }

  _notifyUpdatedSkills(skills) {
    // Invalidate cached routes for these skills
    console.log('    → Routing cache cleared for updated skills');
  }

  _notifyRemovedSkills(skills) {
    // Find in-progress tasks using these skills
    console.log('    → Rerouting tasks using removed skills');
  }

  async handleRequest(task) {
    const routing = await this.router.route(task, {
      decompose: true,
      allowParallel: true
    });

    return routing;
  }

  getSystemStatus() {
    return {
      discovery: {
        skillCount: Object.keys(this.discovery.skillRegistry).length,
        lastScan: this.discovery.lastScanTime
      },
      router: this.router.getStats(),
      hotReload: this.reloadMgr.getStatus()
    };
  }
}

// Usage
(async () => {
  const system = new DynamicAgentSystem();
  await system.initialize();

  // System is now running with hot-reload enabled
  // Add/modify/delete skills in skills/ directory and watch them update

  // Check status
  const status = system.getSystemStatus();
  console.log('\nSystem Status:');
  console.log(JSON.stringify(status, null, 2));

  // Handle requests
  const routing = await system.handleRequest('search and analyze data');
  console.log('\nRouting decision:');
  console.log(JSON.stringify(routing, null, 2));
})();
```

### Example 3: Load-Balanced Agent Distribution

```javascript
class LoadBalancedRouter {
  constructor(agentRouter) {
    this.router = agentRouter;
    this.pendingTasks = [];
    this.maxQueueSize = 100;
  }

  async handleTask(task, options = {}) {
    // Get routing
    const routing = await this.router.route(task, options);

    if (routing.status !== 'routed') {
      return { ...routing, queued: false };
    }

    // Check agent load
    const load = this.router.getLoadState();
    const agents = Object.entries(load);

    // Find most available agent type
    const mostAvailable = agents.reduce((best, [role, state]) => {
      const available = state.maxConcurrent - state.active;
      if (available > best.available) {
        return { role, available, state };
      }
      return best;
    }, { role: null, available: -1 });

    if (mostAvailable.available > 0) {
      return { ...routing, queued: false, immediate: true };
    }

    // Queue if all agents busy
    if (this.pendingTasks.length < this.maxQueueSize) {
      this.pendingTasks.push({ task, options, timestamp: Date.now() });
      return { ...routing, queued: true, queuePosition: this.pendingTasks.length };
    }

    // Queue full
    return {
      status: 'queue-full',
      error: 'System queue is full, try again later'
    };
  }

  processQueue() {
    const load = this.router.getLoadState();
    
    // Find agents with capacity
    const availableAgents = Object.entries(load)
      .filter(([_, state]) => state.active < state.maxConcurrent)
      .map(([role]) => role);

    // Process pending tasks
    while (this.pendingTasks.length > 0 && availableAgents.length > 0) {
      const { task, options } = this.pendingTasks.shift();
      
      // Re-route with available agents
      this.handleTask(task, { ...options, preferredRole: availableAgents[0] });
    }
  }

  getQueueStatus() {
    return {
      queueLength: this.pendingTasks.length,
      maxQueueSize: this.maxQueueSize,
      utilizationPercent: (this.pendingTasks.length / this.maxQueueSize * 100).toFixed(1),
      oldestTaskAge: this.pendingTasks.length > 0 
        ? Date.now() - this.pendingTasks[0].timestamp 
        : null
    };
  }
}
```

---

## Best Practices

### 1. Cache Invalidation

Clear the routing cache when skills are updated:

```javascript
// Automatic (done by hot-reload)
reloadMgr.onReload(() => {
  router.clearCache();
});

// Manual
router.clearCache();
```

### 2. Monitoring Agent Load

Implement metrics collection:

```javascript
setInterval(() => {
  const stats = router.getStats();
  
  // Send to monitoring system
  metrics.gauge('agent.active.researcher', stats.agentLoad.researcher.active);
  metrics.gauge('agent.active.coder', stats.agentLoad.coder.active);
  
  // Alert if overloaded
  for (const [role, load] of Object.entries(stats.agentLoad)) {
    const utilization = load.active / agentProfiles[role].maxConcurrent;
    if (utilization > 0.9) {
      alerts.warn(`Agent ${role} at ${(utilization * 100).toFixed(0)}% capacity`);
    }
  }
}, 5000);
```

### 3. Error Recovery

Handle routing failures gracefully:

```javascript
async function robustRoute(task) {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const routing = await router.route(task);
    
    if (routing.status === 'routed') {
      return routing;
    }

    if (attempt < maxRetries) {
      console.log(`Routing failed (attempt ${attempt}/${maxRetries}), retrying...`);
      await sleep(1000 * attempt); // Exponential backoff
    }
  }

  // Fall back to coordinator
  return await router.route(task, {
    preferredRole: 'coordinator',
    decompose: true
  });
}
```

### 4. Graceful Shutdown

Properly close all resources:

```javascript
async function shutdown() {
  console.log('Shutting down agent system...');
  
  // Wait for pending tasks
  const load = router.getLoadState();
  while (Object.values(load).some(l => l.active > 0)) {
    console.log('Waiting for agents to complete tasks...');
    await sleep(2000);
  }
  
  // Stop hot-reload
  reloadMgr.stop();
  
  // Save state
  await saveAgentState(router.getStats());
  
  console.log('Shutdown complete');
}
```

### 5. Testing Skill Routes

Test routing before going live:

```javascript
async function testSkillRouting() {
  const testCases = [
    'send email notification',
    'analyze market trends',
    'search memory for patterns',
    'generate documentation'
  ];

  for (const testCase of testCases) {
    const routing = await router.route(testCase);
    
    if (routing.status !== 'routed') {
      console.error(`✗ Failed: ${testCase}`);
      console.error(`  Error: ${routing.error}`);
    } else {
      console.log(`✓ Routed: ${testCase}`);
      console.log(`  → ${routing.routing.agent} agent using ${routing.routing.skillName}`);
    }
  }
}
```

---

## Configuration

### Custom Agent Profiles

```javascript
const customAgents = {
  'ml-specialist': {
    id: 'ml-001',
    role: 'ml-specialist',
    model: 'anthropic/claude-opus-4',
    thinking: 'very-high',
    capabilities: ['ml', 'train', 'predict', 'optimize'],
    maxConcurrent: 1,
    costPerMToken: 50,
    qualityScore: 0.99
  }
};

const router = new AgentRouter(discovery, {
  ...router.agentProfiles,
  ...customAgents
});
```

### Routing Strategy Options

```javascript
const aggressiveRouting = await router.route(task, {
  decompose: true,        // Always decompose complex tasks
  allowParallel: true,    // Maximize parallelism
  maxAgents: 5,           // Use multiple agents
  timeout: 60000          // Long timeout
});

const conservativeRouting = await router.route(task, {
  decompose: false,       // Route to single agent
  allowParallel: false,   // Sequential only
  maxAgents: 1,           // Single agent
  timeout: 10000          // Short timeout
});
```

---

## Troubleshooting

### Issue: "No matching skills found"

**Cause:** Skills don't match task description  
**Solution:** Use broader task descriptions or check if relevant skills exist

```javascript
// Too specific
discovery.recommend('send email via SMTP to user@example.com');

// Better
discovery.recommend('send email notification');
```

### Issue: "All agents at capacity"

**Cause:** System is overloaded  
**Solution:** Implement queue or load shedding

```javascript
const routing = await router.route(task);

if (routing.status === 'no-capacity') {
  // Queue task or reject
  if (pendingTasks.length < MAX_QUEUE) {
    pendingTasks.push(task);
  } else {
    // Reject with error
  }
}
```

### Issue: "Skill changes not detected"

**Cause:** Hot-reload not initialized or skills path incorrect  
**Solution:** Check initialization and path configuration

```javascript
// Verify hot-reload is running
const status = reloadMgr.getStatus();
console.log(status.initialized);  // Should be true

// Manually force reload
await reloadMgr.reloadAll(true);
```

---

## Performance Tuning

### Caching

The system caches routing decisions for 5 minutes:

```javascript
// Reduce cache ttl for faster updates (50ms)
router.routingCache = new Map();  // Clear cache

// Increase cache size
router.cacheSize = 1000;  // Up to 1000 cached routes
```

### Scaling

For large-scale deployments:

```javascript
// Increase agent concurrency
const agentProfiles = router.agentProfiles;
agentProfiles.researcher.maxConcurrent = 10;  // Was 3
agentProfiles.analyst.maxConcurrent = 8;      // Was 3

// Use load balancer in front
const loadBalancer = new LoadBalancedRouter(router);
```

---

## API Summary

### SkillDiscovery
- `initialize(forceRescan)` - Load or scan skills
- `scan()` - Perform full scan
- `search(query, options)` - Search skills
- `recommend(task, options)` - Get recommendations
- `composeChain(goal, options)` - Compose skill chains
- `getSkill(name)` - Get skill details
- `listSkills(filter)` - List all skills

### AgentRouter
- `route(task, options)` - Route a task
- `reportTaskCompletion(role, duration, success)` - Update load
- `getLoadState()` - Current agent loads
- `getStats()` - System statistics

### HotReloadManager
- `initialize()` - Start monitoring
- `onReload(callback)` - Register callback
- `reloadAll(force)` - Force reload all skills
- `reloadSkill(name)` - Reload specific skill
- `getStatus()` - Get status
- `stop()/restart()` - Stop or restart

---

**For questions or issues, see SKILL.md, EXAMPLES.md, or test.js**
