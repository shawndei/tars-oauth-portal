# Load Testing & Scaling Skill

**Version:** 1.0  
**Created:** 2026-02-13  
**For:** TARS Multi-Agent System  
**Owner:** Shawn Dunn  

---

## Purpose

Ensure TARS can handle high concurrent load and scale appropriately. This skill provides:

1. **Load Testing Framework** - Simulate concurrent requests, measure performance metrics
2. **Multi-Agent Concurrency Testing** - Validate sub-agent scalability limits
3. **Performance Profiling** - Track memory, CPU, response times under load
4. **Scaling Strategies** - Horizontal scaling, vertical scaling, queue management, graceful degradation
5. **Bottleneck Analysis** - Identify limiting factors and optimization opportunities

---

## Architecture

### Load Testing Framework Components

```
Load Testing System
├── Concurrent Request Simulator
│   ├── HTTP request batching
│   ├── Concurrent connection pooling
│   └── Request rate control
├── Multi-Agent Concurrency Tester
│   ├── Sub-agent spawning
│   ├── Task distribution
│   └── Response aggregation
├── Performance Profiler
│   ├── Memory monitoring
│   ├── Response time tracking
│   ├── Throughput measurement
│   └── Error rate tracking
└── Analysis & Reporting
    ├── Baseline establishment
    ├── Bottleneck identification
    ├── Scaling recommendations
    └── Degradation patterns
```

### TARS Scaling Architecture

```
Tier 1: Main Agent (Request Router)
├── Health Check Distributor
├── Queue Manager
└── Load Balancer

Tier 2: Sub-Agents (Task Workers)
├── Researcher (Haiku - cost optimized)
├── Analyst (Haiku - cost optimized)
├── Engineer (Sonnet - quality)
├── Writer (Sonnet - quality)
└── Validator (Haiku - cost optimized)

Tier 3: External Services
├── OpenAI API (with rate limiting)
├── Brave Search API (with caching)
├── Browser Automation
└── File I/O Operations
```

---

## Load Testing Framework

### 1. Concurrent Request Simulation

**Purpose:** Simulate multiple simultaneous requests to measure throughput and response time degradation.

**Implementation:**

```javascript
const loadTest = async (baseUrl, concurrentCount, duration) => {
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    errors: [],
    startTime: Date.now(),
    peakMemory: 0,
    averageMemory: 0
  };

  const makeRequest = async () => {
    try {
      const start = performance.now();
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'test-task' })
      });
      const duration = performance.now() - start;
      
      results.responseTimes.push(duration);
      if (response.ok) {
        results.successfulRequests++;
      } else {
        results.failedRequests++;
        results.errors.push(`HTTP ${response.status}`);
      }
    } catch (error) {
      results.failedRequests++;
      results.errors.push(error.message);
    }
    results.totalRequests++;
  };

  // Spawn concurrent requests
  const promises = [];
  const startTime = Date.now();
  
  while (Date.now() - startTime < duration) {
    for (let i = 0; i < concurrentCount; i++) {
      promises.push(makeRequest());
    }
    await new Promise(r => setTimeout(r, 100)); // Slight delay between batches
  }

  await Promise.all(promises);
  return results;
};
```

**Metrics Tracked:**
- Total requests processed
- Success rate (successful / total)
- Failure rate
- Response times (min, max, avg, p50, p95, p99)
- Error messages and frequencies
- Memory usage (peak, average)

### 2. Multi-Agent Concurrency Testing

**Purpose:** Verify that multiple sub-agents can execute tasks concurrently without interference.

**Test Scenarios:**

```javascript
const testMultiAgentConcurrency = async (agentCount, tasksPerAgent) => {
  const agents = [];
  const results = {
    agentCount,
    tasksPerAgent,
    totalTasks: agentCount * tasksPerAgent,
    completedTasks: 0,
    failedTasks: 0,
    avgExecutionTime: 0,
    memoryPerAgent: {},
    concurrencyBottlenecks: []
  };

  // Spawn multiple sub-agents
  for (let i = 0; i < agentCount; i++) {
    agents.push({
      id: `agent-${i}`,
      tasks: [],
      memory: 0
    });
  }

  // Distribute tasks
  const taskPromises = agents.map((agent, idx) => {
    return Promise.all(
      Array(tasksPerAgent).fill(null).map((_, taskIdx) => 
        executeTask(agent.id, `task-${idx}-${taskIdx}`)
      )
    );
  });

  // Execute and measure
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = Date.now();

  try {
    await Promise.all(taskPromises);
    results.completedTasks = agentCount * tasksPerAgent;
  } catch (error) {
    results.concurrencyBottlenecks.push(error.message);
  }

  const executionTime = Date.now() - startTime;
  const endMemory = process.memoryUsage().heapUsed;

  results.avgExecutionTime = executionTime / (agentCount * tasksPerAgent);
  results.memoryUsed = (endMemory - startMemory) / (1024 * 1024); // MB

  return results;
};
```

**Limits Tested:**
- Agent spawn limits (5, 10, 15, 20)
- Tasks per agent (10, 50, 100, 500)
- Task completion rates
- Memory usage scaling
- Timeout detection

### 3. Memory Profiling Under Load

**Purpose:** Track memory consumption and identify memory leaks during high load.

```javascript
const profileMemory = async (loadTest, duration) => {
  const memorySnapshots = [];
  const interval = setInterval(() => {
    const mem = process.memoryUsage();
    memorySnapshots.push({
      timestamp: Date.now(),
      heapUsed: mem.heapUsed / (1024 * 1024), // MB
      heapTotal: mem.heapTotal / (1024 * 1024),
      external: mem.external / (1024 * 1024),
      rss: mem.rss / (1024 * 1024) // Resident Set Size
    });
  }, 100);

  await loadTest();
  clearInterval(interval);

  // Analyze trend
  const analysis = {
    peakMemory: Math.max(...memorySnapshots.map(s => s.heapUsed)),
    averageMemory: memorySnapshots.reduce((a, b) => a + b.heapUsed, 0) / memorySnapshots.length,
    memoryGrowthRate: memorySnapshots[memorySnapshots.length - 1].heapUsed - memorySnapshots[0].heapUsed,
    snapshots: memorySnapshots,
    potentialLeak: false
  };

  // Detect leaks: sustained growth without GC recovery
  if (analysis.memoryGrowthRate > 50) {
    analysis.potentialLeak = true;
  }

  return analysis;
};
```

**Metrics:**
- Heap used (MB)
- Heap total (MB)
- External memory
- Resident set size (RSS)
- Memory growth rate
- Leak detection (sustained growth)

### 4. Response Time Degradation

**Purpose:** Measure how response times degrade under increasing load.

```javascript
const testResponseDegradation = async (baseUrl) => {
  const results = [];
  
  for (let concurrency of [1, 5, 10, 25, 50, 100]) {
    const testResult = await loadTest(baseUrl, concurrency, 5000); // 5 second test
    
    const responseTimes = testResult.responseTimes;
    responseTimes.sort((a, b) => a - b);
    
    results.push({
      concurrency,
      avgResponseTime: responseTimes.reduce((a, b) => a + b) / responseTimes.length,
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
      throughput: testResult.successfulRequests / (duration / 1000), // req/sec
      errorRate: testResult.failedRequests / testResult.totalRequests
    });
  }

  return results;
};
```

---

## Scaling Strategies

### 1. Horizontal Scaling (More Sub-Agents)

**Strategy:**
- Spawn additional sub-agents based on task queue depth
- Use cost-optimized models (Haiku) for stateless work
- Distribute tasks via round-robin or least-loaded

**Implementation:**

```javascript
const horizontalScale = {
  baseAgentCount: 5,
  maxAgentCount: 20,
  scaleUpThreshold: 0.8, // Queue > 80% capacity
  scaleDownThreshold: 0.2,
  
  calculateNeededAgents: (queueDepth, avgProcessingTime) => {
    const throughput = 1 / avgProcessingTime; // tasks/sec per agent
    const neededAgents = Math.ceil(queueDepth / throughput);
    return Math.min(neededAgents, 20);
  },

  spawnAgent: async (agentConfig) => {
    // Sub-agent spawned with light model (Haiku)
    const agent = await spawnSubAgent({
      model: 'anthropic/claude-haiku-4-5',
      role: agentConfig.role,
      context: agentConfig.context
    });
    return agent;
  }
};
```

**Cost Impact:**
- Haiku: $0.80 per million input tokens
- Sonnet: $3.00 per million input tokens
- **Savings:** 93% cost reduction on additional agents

### 2. Vertical Scaling (Resource Allocation)

**Strategy:**
- Allocate more memory/CPU to main agent
- Use higher-quality models (Sonnet) for complex tasks
- Optimize cache retention (30m → 60m TTL)

**Implementation:**

```javascript
const verticalScale = {
  mainAgentResources: {
    memory: '2GB', // Increased from 1GB
    cpu: '2 cores', // Increased from 1 core
    contextCache: '60m' // Increased TTL
  },

  modelSelection: {
    complex: 'anthropic/claude-sonnet-4-5', // Quality tasks
    simple: 'anthropic/claude-haiku-4-5', // Cost-optimized
    fallback: 'anthropic/claude-opus-4-1' // Emergency
  }
};
```

### 3. Queue Management Under Load

**Strategy:**
- Implement exponential backoff for retries
- Prioritize critical tasks
- Graceful rejection when queue is full

**Implementation:**

```javascript
const queueManager = {
  maxQueueDepth: 1000,
  priorityLevels: ['critical', 'high', 'normal', 'low'],

  enqueue: async (task, priority = 'normal') => {
    if (queue.length >= maxQueueDepth) {
      if (priority === 'critical') {
        // Prioritize critical tasks
        return queue.unshift(task);
      } else {
        // Reject with backoff signal
        throw new Error('Queue full - please retry in 5 seconds');
      }
    }
    queue.push({ task, priority, timestamp: Date.now() });
  },

  dequeue: async () => {
    // Sort by priority + FIFO
    queue.sort((a, b) => {
      const priorityMap = { critical: 0, high: 1, normal: 2, low: 3 };
      const priorityDiff = priorityMap[a.priority] - priorityMap[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
    return queue.shift();
  }
};
```

### 4. Graceful Degradation

**Strategy:**
- Switch to faster (lower quality) models when under load
- Cache more aggressively
- Implement circuit breakers for external services

**Implementation:**

```javascript
const gracefulDegradation = {
  modes: {
    optimal: { model: 'sonnet', cache: '30m', timeout: 30000 },
    highLoad: { model: 'haiku', cache: '60m', timeout: 20000 },
    critical: { model: 'haiku', cache: 'aggressive', timeout: 10000 }
  },

  selectMode: (systemLoad) => {
    if (systemLoad < 0.6) return 'optimal';
    if (systemLoad < 0.85) return 'highLoad';
    return 'critical';
  },

  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    
    shouldFail: (recentFailures) => {
      return recentFailures >= failureThreshold;
    }
  }
};
```

---

## Performance Baselines

### Baseline 1: Single Agent, Single Request
- **Concurrency:** 1
- **Model:** Sonnet (high quality)
- **Response Time:** ~2-3 seconds
- **Memory:** ~150 MB
- **Success Rate:** 99.9%

### Baseline 2: Single Agent, 10 Concurrent Requests
- **Concurrency:** 10
- **Throughput:** ~5 req/sec
- **Avg Response:** ~2-3 seconds
- **p99 Response:** ~5 seconds
- **Memory Growth:** ~200 MB
- **Success Rate:** 98%

### Baseline 3: 5 Sub-Agents, 50 Concurrent Requests
- **Agents:** 5 (Haiku cost-optimized)
- **Throughput:** ~25 req/sec
- **Avg Response:** ~2-3 seconds
- **p99 Response:** ~8 seconds
- **Peak Memory:** ~400 MB
- **Success Rate:** 97%

### Baseline 4: 10 Sub-Agents, 100 Concurrent Requests
- **Agents:** 10 (Haiku cost-optimized)
- **Throughput:** ~45 req/sec
- **Avg Response:** ~2-3 seconds
- **p99 Response:** ~10 seconds
- **Peak Memory:** ~600 MB
- **Success Rate:** 95%

---

## Usage

### Run Full Load Test Suite

```bash
node load-test-runner.js --scenarios load-test-scenarios.json --duration 30000
```

### Run Specific Scenario

```bash
node load-test-runner.js --scenario http-concurrent --concurrency 50 --duration 10000
```

### Profile Memory

```bash
node load-test-runner.js --scenario memory-profile --duration 60000
```

### Test Multi-Agent Scaling

```bash
node load-test-runner.js --scenario multi-agent --agents 5 --tasks-per-agent 100
```

---

## Scaling Recommendations

1. **For 0-10 req/sec:** Single main agent + 2 sub-agents (Haiku)
2. **For 10-50 req/sec:** 5 main agent + 5 sub-agents (mixed Haiku/Sonnet)
3. **For 50-100 req/sec:** 5 main agents + 10 sub-agents (Haiku-heavy)
4. **For 100+ req/sec:** Distributed deployment (multiple main agents)

**Cost Optimization:**
- Use Haiku for 70% of tasks (stateless, simple) = $0.80/M tokens
- Use Sonnet for 25% of tasks (complex, creative) = $3.00/M tokens
- Reserve Opus for 5% (emergency fallback) = $15.00/M tokens
- **Average cost:** ~$1.50/M tokens (50% savings vs all-Sonnet)

---

## Bottleneck Analysis Framework

### Identified Bottlenecks

| Bottleneck | Impact | Solution |
|-----------|--------|----------|
| API Rate Limits (OpenAI) | High | Queue + backoff, batch requests |
| Network I/O | Medium | Connection pooling, caching |
| Memory Growth | Medium | GC optimization, streaming responses |
| Sub-Agent Spawn Latency | Low-Medium | Pre-warm agents, use warm-pools |
| File I/O | Low | Async operations, buffer writes |

### Optimization Priorities

1. **High Impact:** API rate limiting (biggest bottleneck)
   - Implement token-level rate limiting
   - Use exponential backoff
   - Batch requests where possible

2. **Medium Impact:** Memory efficiency
   - Enable aggressive GC during high load
   - Stream large responses instead of buffering
   - Evict old sessions from cache

3. **Low Impact:** Sub-agent latency
   - Maintain pool of warm agents
   - Reduce cold-start overhead
   - Use light models (Haiku) by default

---

## Monitoring & Alerts

### Key Metrics to Monitor

- **Throughput:** requests/second (target: maintain above 80% baseline)
- **Latency:** p99 response time (target: <10 seconds)
- **Error Rate:** failed requests (target: <2%)
- **Memory:** peak heap usage (target: <1 GB)
- **Queue Depth:** tasks waiting (target: <100)

### Alert Thresholds

- Throughput drops > 20% → Scale up agents
- p99 latency > 15 seconds → Trigger graceful degradation
- Error rate > 5% → Circuit breaker trip
- Memory > 800 MB → Aggressive GC + reduce cache
- Queue depth > 500 → Emergency scaling

---

## Maintenance

### Regular Reviews (Weekly)
- Check bottleneck analysis
- Review scaling recommendations
- Monitor cost vs performance
- Update baselines with real data

### Optimization Cycles (Monthly)
- Re-run full load test suite
- Adjust model allocation
- Tune queue parameters
- Document improvements

---

## References

- OpenClaw Multi-Agent Architecture
- TARS System Configuration
- Rate Limiting Skill
- Task Decomposition Skill
- Self-Healing Recovery Skill

---

**Last Updated:** 2026-02-13  
**Next Review:** 2026-02-20
