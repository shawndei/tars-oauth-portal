# Skill Discovery - Usage Examples

## Example 1: Finding Skills for a Task

**Scenario:** You need to send email notifications but don't know which skill to use.

```javascript
const { SkillDiscovery } = require('./skills/skill-discovery');

const discovery = new SkillDiscovery();
await discovery.initialize();

// Get recommendations
const recommendations = discovery.recommend('send email notifications', {
  limit: 3,
  includeReasoning: true
});

console.log('Top 3 recommendations:');
for (const rec of recommendations) {
  console.log(`\n${rec.skill.name} (score: ${rec.score.toFixed(2)})`);
  console.log(`  Description: ${rec.skill.description}`);
  console.log(`  Reason: ${rec.reasoning}`);
}
```

**Output:**
```
Top 3 recommendations:

email-integration (score: 0.87)
  Description: Send and receive emails with full automation support
  Reason: handles send operations; works with email; production-ready

notification-router (score: 0.72)
  Description: Route notifications to multiple channels
  Reason: handles send operations; works with notification; production-ready

multi-channel-notifications (score: 0.68)
  Description: Send notifications across multiple channels
  Reason: handles send operations; provides relevant capabilities
```

---

## Example 2: Composing a Multi-Step Workflow

**Scenario:** You want to search memory, analyze patterns, and generate a report.

```javascript
const chain = discovery.composeChain(
  'search memory for patterns and analyze them and generate report',
  {
    maxDepth: 5,
    allowParallel: true,
    optimizeForPerformance: true
  }
);

console.log('Goal:', chain.goal);
console.log('Feasibility:', (chain.feasibility * 100).toFixed(0) + '%');
console.log('Estimated duration:', chain.estimatedDuration, 'seconds');
console.log('\nExecution Plan:');

for (let i = 0; i < chain.executionPlan.phases.length; i++) {
  const phase = chain.executionPlan.phases[i];
  console.log(`\nPhase ${i + 1} (${phase.type}):`);
  
  for (const step of phase.steps) {
    console.log(`  - ${step.skill}: ${step.task}`);
  }
}

if (chain.missingCapabilities.length > 0) {
  console.log('\n⚠️  Missing capabilities:');
  for (const cap of chain.missingCapabilities) {
    console.log(`  - ${cap}`);
  }
}
```

**Output:**
```
Goal: search memory for patterns and analyze them and generate report
Feasibility: 100%
Estimated duration: 90 seconds

Execution Plan:

Phase 1 (sequential):
  - episodic-memory: search memory for patterns

Phase 2 (sequential):
  - data-analytics: analyze them

Phase 3 (sequential):
  - documentation-system: generate report
```

---

## Example 3: Finding Skills by Capability

**Scenario:** You need all skills that can search.

```javascript
// Find all skills with search capability
const searchSkills = discovery.listSkills({ hasCapability: 'search' });

console.log(`Found ${searchSkills.length} skills with search capability:\n`);

for (const skill of searchSkills) {
  console.log(`${skill.name}:`);
  
  // Show relevant capabilities
  const searchCaps = skill.capabilities.filter(cap =>
    cap.toLowerCase().includes('search')
  );
  
  for (const cap of searchCaps) {
    console.log(`  - ${cap}`);
  }
  console.log();
}
```

**Output:**
```
Found 8 skills with search capability:

episodic-memory:
  - Semantic similarity search across all memory files
  - Fast vector search with sub-second query times

rag-hybrid-search:
  - Hybrid keyword + semantic search
  - Multi-source search aggregation

web-search:
  - Search the web using Brave Search API
  - Localized search with country/language support
...
```

---

## Example 4: Analyzing Skill Dependencies

**Scenario:** You want to understand what skills depend on `episodic-memory`.

```javascript
const skill = discovery.getSkill('episodic-memory');

console.log('Skill:', skill.name);
console.log('Description:', skill.description);

// Get dependency metrics
const metrics = discovery.dependencyResolver.getDependencyMetrics(skill.name);

console.log('\nDependency Metrics:');
console.log('  Direct dependencies:', metrics.directDependencies);
console.log('  Total dependencies:', metrics.totalDependencies);
console.log('  Direct dependents:', metrics.directDependents);
console.log('  Dependency depth:', metrics.dependencyDepth);
console.log('  Is critical:', metrics.isCritical);
console.log('  Is leaf:', metrics.isLeaf);

// List skills that depend on this one
const dependents = skill.dependents || [];

if (dependents.length > 0) {
  console.log('\nSkills that depend on this:');
  for (const dep of dependents) {
    console.log(`  - ${dep}`);
  }
} else {
  console.log('\nNo skills depend on this one');
}
```

**Output:**
```
Skill: episodic-memory
Description: Fast vector search over TARS memory

Dependency Metrics:
  Direct dependencies: 0
  Total dependencies: 0
  Direct dependents: 3
  Dependency depth: 0
  Is critical: true
  Is leaf: true

Skills that depend on this:
  - proactive-intelligence
  - rag-hybrid-search
  - continuous-learning
```

---

## Example 5: Detecting Circular Dependencies

**Scenario:** Check if there are any circular dependencies in the skill registry.

```javascript
const circular = discovery.dependencyResolver.detectCircularDependencies();

if (circular.length === 0) {
  console.log('✓ No circular dependencies detected');
} else {
  console.log('⚠️  Circular dependencies found:\n');
  
  for (const issue of circular) {
    console.log(`${issue.skill}:`);
    console.log(`  Cycle: ${issue.cycle.join(' -> ')}`);
    console.log();
  }
}
```

**Output:**
```
✓ No circular dependencies detected
```

---

## Example 6: Finding Related Skills

**Scenario:** You're using `email-integration` and want to find similar skills.

```javascript
const skill = discovery.getSkill('email-integration');
const related = discovery.recommendationEngine.findRelatedSkills(
  skill,
  discovery.skillRegistry,
  5
);

console.log(`Skills related to ${skill.name}:\n`);

for (const rel of related) {
  console.log(`${rel.skill.name} (similarity: ${rel.similarity.toFixed(2)})`);
  console.log(`  ${rel.skill.description}`);
  console.log();
}
```

**Output:**
```
Skills related to email-integration:

notification-router (similarity: 0.78)
  Route notifications to multiple channels including email

multi-channel-notifications (similarity: 0.72)
  Send notifications across email, SMS, Slack, Discord

calendar-integration (similarity: 0.65)
  Integration with calendar systems for scheduling

webhook-automation (similarity: 0.58)
  Automate webhooks for external integrations
```

---

## Example 7: Skill Registry Statistics

**Scenario:** Get an overview of all skills in the workspace.

```javascript
const stats = discovery.getStats();

console.log('Skill Registry Overview\n');
console.log('Total skills:', stats.totalSkills);
console.log('Total capabilities:', stats.totalCapabilities);
console.log('Average capabilities per skill:', stats.averageCapabilitiesPerSkill);
console.log('Skills with dependencies:', stats.skillsWithDependencies);
console.log('Total dependencies:', stats.totalDependencies);

console.log('\nBy Status:');
for (const [status, count] of Object.entries(stats.byStatus)) {
  console.log(`  ${status}: ${count}`);
}

console.log('\nTop Tags:');
const sortedTags = Object.entries(stats.byTag)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

for (const [tag, count] of sortedTags) {
  console.log(`  ${tag}: ${count}`);
}

console.log('\nLast scan:', new Date(stats.lastScanTime).toLocaleString());
```

**Output:**
```
Skill Registry Overview

Total skills: 40
Total capabilities: 347
Average capabilities per skill: 8.68
Skills with dependencies: 12
Total dependencies: 28

By Status:
  production: 35
  development: 3
  experimental: 2

Top Tags:
  domain:email: 3
  domain:webhook: 4
  domain:memory: 5
  action:search: 8
  action:monitor: 6
  action:analyze: 4
  status:production: 35
  integration: 7
  system: 6
  advanced: 5

Last scan: 2/13/2026, 9:22:00 AM
```

---

## Example 8: Real-Time Skill Discovery Integration

**Scenario:** Integrate skill discovery into an agent that dynamically selects skills.

```javascript
class IntelligentAgent {
  constructor() {
    this.discovery = null;
  }
  
  async initialize() {
    this.discovery = new SkillDiscovery();
    await this.discovery.initialize();
    console.log('Agent initialized with skill discovery');
  }
  
  async handleUserRequest(request) {
    console.log(`\nUser request: "${request}"`);
    
    // Step 1: Get recommendations
    const recommendations = this.discovery.recommend(request, {
      limit: 3,
      minScore: 0.6
    });
    
    if (recommendations.length === 0) {
      console.log('No matching skills found');
      
      // Check if we can compose a chain
      const chain = this.discovery.composeChain(request);
      
      if (chain.feasibility > 0.7) {
        console.log('But I can compose a skill chain!');
        console.log('Feasibility:', (chain.feasibility * 100).toFixed(0) + '%');
        return chain;
      }
      
      return null;
    }
    
    // Step 2: Select best skill
    const bestSkill = recommendations[0];
    console.log(`\nUsing: ${bestSkill.skill.name}`);
    console.log(`Confidence: ${(bestSkill.score * 100).toFixed(0)}%`);
    console.log(`Reason: ${bestSkill.reasoning}`);
    
    // Step 3: Execute (placeholder)
    console.log('\nExecuting skill...');
    
    return bestSkill.skill;
  }
}

// Usage
const agent = new IntelligentAgent();
await agent.initialize();

await agent.handleUserRequest('send email to team');
await agent.handleUserRequest('search memory and analyze patterns');
await agent.handleUserRequest('monitor API health');
```

**Output:**
```
Agent initialized with skill discovery

User request: "send email to team"

Using: email-integration
Confidence: 87%
Reason: handles send operations; works with email; production-ready

Executing skill...

User request: "search memory and analyze patterns"

Using: episodic-memory
Confidence: 82%
Reason: handles search operations; works with memory; production-ready

Executing skill...

User request: "monitor API health"

Using: monitoring-alerting
Confidence: 91%
Reason: handles monitor operations; works with api; production-ready

Executing skill...
```

---

## Example 9: Exporting Dependency Graph

**Scenario:** Visualize the dependency graph.

```javascript
// Get topological sort (execution order)
const sorted = discovery.dependencyResolver.getTopologicalSort();

console.log('Skill Execution Order (topological sort):\n');

for (let i = 0; i < sorted.length; i++) {
  const skillName = sorted[i];
  const skill = discovery.getSkill(skillName);
  
  if (skill) {
    console.log(`${i + 1}. ${skillName}`);
    
    const deps = skill.dependencies || [];
    if (deps.length > 0) {
      console.log(`   Dependencies: ${deps.join(', ')}`);
    }
  }
}
```

---

## Example 10: Performance Monitoring

**Scenario:** Measure performance of discovery operations.

```javascript
console.log('Performance Benchmarks\n');

// Benchmark scan
console.log('Testing scan performance...');
const scanStart = Date.now();
await discovery.scan();
const scanDuration = Date.now() - scanStart;
console.log(`  Scan: ${scanDuration}ms`);

// Benchmark search
console.log('Testing search performance...');
const searchStart = Date.now();
const searchResults = discovery.search('email notification');
const searchDuration = Date.now() - searchStart;
console.log(`  Search: ${searchDuration}ms (${searchResults.length} results)`);

// Benchmark recommendation
console.log('Testing recommendation performance...');
const recStart = Date.now();
const recommendations = discovery.recommend('send notifications');
const recDuration = Date.now() - recStart;
console.log(`  Recommendation: ${recDuration}ms (${recommendations.length} results)`);

// Benchmark composition
console.log('Testing composition performance...');
const composeStart = Date.now();
const chain = discovery.composeChain('search and analyze');
const composeDuration = Date.now() - composeStart;
console.log(`  Composition: ${composeDuration}ms (${chain.steps.length} steps)`);

console.log('\n✓ All benchmarks complete');
```

**Output:**
```
Performance Benchmarks

Testing scan performance...
  Scan: 1043ms

Testing search performance...
  Search: 87ms (5 results)

Testing recommendation performance...
  Recommendation: 142ms (3 results)

Testing composition performance...
  Composition: 218ms (2 steps)

✓ All benchmarks complete
```

---

These examples demonstrate the full range of capabilities in the Skill Discovery system!
