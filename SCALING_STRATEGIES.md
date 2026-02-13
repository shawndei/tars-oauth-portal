# TARS Scaling Strategies & Implementation Guide

**Version:** 1.0  
**Created:** 2026-02-13  
**For:** Shawn's TARS Multi-Agent System  

---

## Executive Summary

TARS can scale from 0-1000+ req/sec through combination of **horizontal scaling** (more agents), **vertical scaling** (better resources), **queue management**, and **graceful degradation**. This guide provides specific implementation strategies for each load tier.

---

## Part 1: Horizontal Scaling (More Sub-Agents)

### Strategy Overview

**Principle:** Add more parallel workers (sub-agents) as load increases

**Benefits:**
- Linear throughput improvement
- Distributed load processing
- Cost-effective (use cheap Haiku model)
- Easy to implement and monitor

**Trade-offs:**
- More processes = more memory overhead
- Agent management complexity increases
- Coordination latency (inter-agent communication)

### Implementation Tiers

#### Tier 1: Baseline (Development/Testing)

**Configuration:**
```
Main Agent: 1 (coordinator)
Sub-Agents: 2 (Haiku)
Total Capacity: 2 parallel workers
```

**Target Load:** 0-10 req/sec  
**Target Concurrency:** 1-10 concurrent requests  
**Hardware:** Single machine (2+ GB RAM)

**Setup:**
```javascript
const agentPool = new AgentPool({
  size: 2,
  model: 'anthropic/claude-haiku-4-5',
  warmPoolSize: 1,
  maxIdleTime: 5 * 60 * 1000  // 5 minute TTL
});
```

**Cost:** $1-2/M tokens  
**Throughput:** 0.5-7 req/sec  
**Reliability:** 99%+

---

#### Tier 2: Small Production

**Configuration:**
```
Main Agent: 1 (request router)
Sub-Agents: 5 (Haiku x4, Sonnet x1)
Total Capacity: 5 parallel workers
Model Mix: 80% Haiku, 20% Sonnet
```

**Target Load:** 10-50 req/sec  
**Target Concurrency:** 10-50 concurrent requests  
**Hardware:** Single machine (4+ GB RAM)

**Setup:**
```javascript
const agentPool = new AgentPool({
  agents: [
    { model: 'haiku', role: 'researcher', count: 2 },
    { model: 'haiku', role: 'analyst', count: 2 },
    { model: 'sonnet', role: 'engineer', count: 1 }
  ],
  warmPoolSize: 2,
  maxIdleTime: 30 * 60 * 1000  // 30 minute TTL,
  costRouter: true  // Route to Haiku by default
});
```

**Cost:** $1.50/M tokens  
**Throughput:** 7-28 req/sec  
**Reliability:** 96%+  
**Memory:** 300-400 MB peak

**Deployment Checklist:**
- ✅ Set up monitoring (memory, response times)
- ✅ Configure backoff for API rate limits
- ✅ Implement graceful shutdown
- ✅ Enable agent health checks

---

#### Tier 3: Medium Production

**Configuration:**
```
Main Agent: 1 (load balancer + coordinator)
Sub-Agents: 10 (Haiku x8, Sonnet x2)
Total Capacity: 10 parallel workers
Model Mix: 80% Haiku, 20% Sonnet
```

**Target Load:** 50-100 req/sec  
**Target Concurrency:** 50-100 concurrent requests  
**Hardware:** 2-4 GB RAM, 4+ CPU cores

**Setup:**
```javascript
const agentPool = new AgentPool({
  size: 10,
  models: {
    'haiku': { count: 8, roles: ['research', 'analysis', 'validation'] },
    'sonnet': { count: 2, roles: ['engineering', 'writing'] }
  },
  loadBalancing: 'least-loaded',
  healthCheck: true,
  autoScale: {
    enabled: true,
    minAgents: 5,
    maxAgents: 10,
    scaleUpThreshold: 0.8,  // Queue > 80% full
    scaleDownThreshold: 0.2  // Queue < 20% full
  }
});
```

**Cost:** $1.30/M tokens (97% savings vs all-Sonnet)  
**Throughput:** 28-47 req/sec  
**Reliability:** 95%+  
**Memory:** 400-600 MB peak

**Auto-Scaling Logic:**
```javascript
if (queueDepth / maxQueueSize > 0.8 && activeAgents < maxAgents) {
  // Spawn new agents
  for (let i = 0; i < 2; i++) {
    spawnNewAgent('haiku');
  }
}

if (queueDepth / maxQueueSize < 0.2 && activeAgents > minAgents) {
  // Shutdown excess agents
  shutdownIdleAgent();
}
```

---

#### Tier 4: Large Production

**Configuration:**
```
Main Agents: 2-3 (distributed coordinators)
Sub-Agents: 20+ (Haiku x16, Sonnet x4)
Total Capacity: 20+ parallel workers
Model Mix: 85% Haiku, 10% Sonnet, 5% Opus
```

**Target Load:** 100-500 req/sec  
**Target Concurrency:** 100-500 concurrent requests  
**Hardware:** Kubernetes cluster, 8+ GB per node

**Setup:**
```javascript
const distributedPool = new DistributedAgentPool({
  nodes: [
    { hostname: 'node-1', capacity: 10 },
    { hostname: 'node-2', capacity: 10 },
    { hostname: 'node-3', capacity: 10 }
  ],
  models: {
    'haiku': { count: 16, roles: ['*'] },
    'sonnet': { count: 4, roles: ['critical', 'complex'] },
    'opus': { count: 1, roles: ['emergency'] }
  },
  loadBalancing: 'round-robin',
  sharding: {
    enabled: true,
    strategy: 'user-id',  // Consistent routing
    replicationFactor: 2
  },
  resilience: {
    nodeFailover: true,
    circuitBreaker: true,
    fallbackModel: 'haiku'
  }
});
```

**Cost:** $1.20/M tokens (97% savings)  
**Throughput:** 100-500 req/sec  
**Reliability:** 99.5%+  
**Memory:** 2-4 GB per node

---

#### Tier 5: Enterprise

**Configuration:**
```
Main Agents: 5-10 (distributed across regions)
Sub-Agents: 100+ (globally distributed)
Total Capacity: 100+ parallel workers
Model Mix: 85% Haiku, 10% Sonnet, 5% Opus
Regional Deployment: USA, EU, Asia
```

**Target Load:** 500-1000+ req/sec  
**Target Concurrency:** 500+ concurrent requests  
**Hardware:** Multi-region Kubernetes

**Architecture:**
```
┌─────────────────────────────────────────┐
│ Global Load Balancer (CloudFlare)       │
└─────────────────────────────────────────┘
           ├─ USA Region ──────┐
           │                   │
           ├─ EU Region ──────┐
           │                  │
           └─ Asia Region ────┐
           
Region Structure:
┌──────────────────────┐
│ Regional Coordinator │
├──────────────────────┤
│ Agent Pool (20-30)   │
│ - Haiku (18-25)      │
│ - Sonnet (2-4)       │
│ - Opus (1)           │
├──────────────────────┤
│ Local Cache (Redis)  │
│ Queue Service (RMQ)  │
│ Monitoring (Prom)    │
└──────────────────────┘
```

**Cost:** <$1.00/M tokens (97%+ savings)  
**Throughput:** 500-1000+ req/sec  
**Reliability:** 99.9%+  
**Latency:** <2 second p99 (regional)

---

### Horizontal Scaling Checklist

- [ ] Baseline testing complete (single agent)
- [ ] Haiku model cost savings verified
- [ ] Agent pool implementation
- [ ] Health checks working
- [ ] Auto-scaling thresholds tuned
- [ ] Load balancing strategy chosen
- [ ] Distributed coordinator implemented
- [ ] Regional failover tested
- [ ] Cost monitoring dashboard
- [ ] Capacity planning model

---

## Part 2: Vertical Scaling (Resource Allocation)

### Strategy Overview

**Principle:** Improve efficiency of existing resources

**Benefits:**
- Reduced deployment complexity
- Lower operational overhead
- Faster development cycle
- Better debugging and monitoring

**Trade-offs:**
- Limited by single-machine capacity
- Maximum ~100 req/sec per node
- Higher cost per request
- Single point of failure

### Optimization Tactics

#### 1. Memory Optimization

**Current:** 2 GB Node.js heap  
**Optimized:** 4 GB Node.js heap

**Configuration:**
```bash
node --max-old-space-size=4096 \
     --expose-gc \
     --gc-global \
     --trace-gc \
     app.js
```

**Impact:**
- +40% increase in concurrent capacity
- +$20/month for extra memory
- No code changes required

**Monitoring:**
```javascript
const memThreshold = 3.2 * 1024 * 1024 * 1024;  // 3.2 GB
const memUsed = process.memoryUsage().heapUsed;

if (memUsed > memThreshold) {
  console.warn('Memory pressure high, triggering GC');
  global.gc();  // Manual garbage collection
}
```

---

#### 2. Context Cache Optimization

**Current:** 30-minute TTL, 1000 max entries  
**Optimized:** 60-minute TTL, 5000 max entries

**Configuration:**
```javascript
const contextCache = new LRUCache({
  max: 5000,                      // Increased from 1000
  maxSize: 200 * 1024 * 1024,    // 200 MB cache
  ttl: 60 * 60 * 1000,           // 60 min TTL (vs 30)
  updateAgeOnGet: true,          // Reset TTL on access
  updateAgeOnHas: false          // Don't reset on check
});
```

**Impact:**
- +30-40% response time improvement (cache hit)
- +100 MB memory overhead
- +$5/month storage cost
- 70-80% cache hit rate expected

**ROI:** At 100 req/sec with 75% cache hits:
- Tokens saved: 2-3M per day
- Cost saved: $6-9 per day = $180-270/month
- Net savings: $175/month

---

#### 3. Connection Pool Tuning

**Current:** 10 connections per service  
**Optimized:** 50 connections (OpenAI), 25 (Brave), 10 (others)

**Configuration:**
```javascript
const openaiAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,          // Increased from 10
  maxFreeSockets: 25,      // Increased from 5
  timeout: 60000
});

const braveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 25,          // Increased from 10
  maxFreeSockets: 10,
  timeout: 30000
});
```

**Impact:**
- +20-30% throughput improvement
- +50-100 ms faster per request (avoid TLS handshake)
- +30 MB memory overhead
- No cost increase

---

#### 4. Model Quality Tuning

**Current:** Mix of Haiku (cheap) and Sonnet (quality)  
**Optimized:** Dynamic routing based on task complexity

**Configuration:**
```javascript
const routeModel = (task) => {
  const complexity = analyzeComplexity(task);
  
  if (complexity < 0.3) return 'haiku';      // Simple tasks
  if (complexity < 0.7) return 'sonnet';     // Normal tasks
  return 'opus';                              // Complex tasks (rare)
};
```

**Impact:**
- 90% of requests use Haiku (cheapest)
- 9% use Sonnet (balanced)
- 1% use Opus (best)
- Cost: ~$1.20/M tokens (best case)

---

#### 5. Response Streaming

**Current:** Buffer entire response in memory  
**Optimized:** Stream response chunks as they arrive

**Before:**
```javascript
const response = await llm.generate(prompt);  // Full response in memory
res.send(response.text);                       // Send to client
```

**After:**
```javascript
const stream = llm.generateStream(prompt);
stream.pipe(res);                             // Stream directly to client
```

**Impact:**
- 60-70% memory reduction for large responses
- +5% latency (streaming overhead)
- Better user experience (data appears sooner)
- Reduced API latency (don't wait for full response)

---

### Vertical Scaling Checklist

- [ ] Node.js heap increased to 4GB
- [ ] GC monitoring configured
- [ ] Context cache optimized (60-min TTL)
- [ ] Connection pools tuned (50 max sockets)
- [ ] Model routing implemented
- [ ] Response streaming enabled
- [ ] Memory alerts configured
- [ ] Performance baseline captured

---

## Part 3: Queue Management Under Load

### Strategy Overview

**Principle:** Manage task queue to prevent overload

**Benefits:**
- Prevents out-of-memory crashes
- Backpressure signals to clients
- Fair task distribution
- Graceful degradation

### Implementation

#### Queue Configuration

```javascript
class PriorityQueue {
  constructor() {
    this.queues = {
      'critical': new LinkedList(),   // Real-time, no delay
      'high': new LinkedList(),       // Important, 1-2 sec delay
      'normal': new LinkedList(),     // Regular, 5-10 sec delay
      'low': new LinkedList()         // Background, 30+ sec delay
    };
    
    this.maxDepth = 1000;
    this.maxDepthPerPriority = {
      'critical': 100,
      'high': 300,
      'normal': 500,
      'low': 100
    };
  }

  enqueue(task, priority = 'normal') {
    const queue = this.queues[priority];
    
    // Check capacity
    if (queue.size >= this.maxDepthPerPriority[priority]) {
      throw new Error(`Queue full for ${priority} tasks`);
    }
    
    if (Object.values(this.queues).reduce((a, q) => a + q.size, 0) >= this.maxDepth) {
      throw new Error('Global queue full');
    }
    
    queue.add({
      task,
      priority,
      enqueueTime: Date.now(),
      attempts: 0
    });
  }

  dequeue() {
    // FIFO within priority
    for (const priority of ['critical', 'high', 'normal', 'low']) {
      const queue = this.queues[priority];
      if (queue.size > 0) {
        return queue.remove();
      }
    }
    return null;
  }
}
```

#### Backpressure Signaling

```javascript
app.post('/api/task', (req, res) => {
  const queueDepth = queue.totalSize();
  const maxQueueDepth = 1000;
  const utilization = queueDepth / maxQueueDepth;

  // Send backpressure header
  res.set('X-Queue-Depth', queueDepth);
  res.set('X-Queue-Utilization', (utilization * 100).toFixed(1) + '%');
  res.set('X-Retry-After', calculateRetryAfter(utilization));

  // Reject if too full
  if (utilization > 0.95) {
    return res.status(503).json({
      error: 'Service unavailable',
      retryAfter: 60,  // seconds
      queueDepth
    });
  }

  // Accept task
  try {
    queue.enqueue(req.body, req.body.priority);
    res.status(202).json({ taskId: generateId() });
  } catch (error) {
    res.status(429).json({
      error: error.message,
      retryAfter: calculateRetryAfter(utilization)
    });
  }
});
```

#### Worker Processing

```javascript
class WorkerPool {
  constructor(queueManager, agentPool, concurrency = 5) {
    this.queue = queueManager;
    this.agents = agentPool;
    this.concurrency = concurrency;
    this.activeWorkers = 0;
  }

  async start() {
    for (let i = 0; i < this.concurrency; i++) {
      this.processQueue();
    }
  }

  async processQueue() {
    while (true) {
      const task = this.queue.dequeue();
      
      if (!task) {
        await sleep(100);  // Wait for tasks
        continue;
      }

      try {
        this.activeWorkers++;
        
        const agent = await this.agents.getAvailableAgent();
        const result = await agent.process(task.task);
        
        task.callback?.(null, result);
        this.activeWorkers--;
        
      } catch (error) {
        task.attempts++;
        
        if (task.attempts < 3) {
          // Retry with backoff
          const delay = Math.pow(2, task.attempts) * 1000;
          await sleep(delay);
          this.queue.enqueue(task.task, task.priority);
        } else {
          task.callback?.(error);
          this.activeWorkers--;
        }
      }
    }
  }
}
```

### Queue Management Checklist

- [ ] Priority queue implemented
- [ ] Backpressure headers added to API
- [ ] Queue depth monitoring
- [ ] Retry logic with exponential backoff
- [ ] Dead letter queue for failed tasks
- [ ] Queue metrics dashboard
- [ ] Alert on queue > 500
- [ ] Client-side retry implementation

---

## Part 4: Graceful Degradation

### Strategy Overview

**Principle:** Reduce quality/features to maintain availability under overload

### Degradation Modes

#### Mode 1: Optimal (Normal Operation)

```
Conditions:
- Queue depth < 50%
- Memory < 60%
- API success rate > 98%

Behavior:
- Use Sonnet model (best quality)
- 30-min context cache
- Full feature set
- 30-second timeout
```

#### Mode 2: High Load (Moderate Overload)

```
Conditions:
- Queue depth 50-80%
- Memory 60-80%
- API success rate > 95%

Behavior:
- Switch to Haiku model (30% faster)
- Increase context cache to 60-min
- Disable non-critical features
- Reduce timeout to 20 seconds
- Cost reduction: -40% per request
```

#### Mode 3: Critical (Severe Overload)

```
Conditions:
- Queue depth > 80%
- Memory > 80%
- API success rate < 95%

Behavior:
- Use only Haiku model
- Aggressive caching (only cached results)
- Minimal features only
- 10-second timeout
- Auto-reject non-critical tasks
- Cost reduction: -70% per request
```

### Implementation

```javascript
class DegradationController {
  constructor() {
    this.mode = 'OPTIMAL';
    this.metrics = {};
    this.config = {
      'OPTIMAL': {
        model: 'sonnet',
        cacheTTL: 30 * 60 * 1000,
        timeout: 30000,
        features: ['full']
      },
      'HIGHLOAD': {
        model: 'haiku',
        cacheTTL: 60 * 60 * 1000,
        timeout: 20000,
        features: ['core', 'search']
      },
      'CRITICAL': {
        model: 'haiku',
        cacheTTL: 24 * 60 * 60 * 1000,
        timeout: 10000,
        features: ['core']
      }
    };
  }

  updateMetrics(queueDepth, memUsage, apiSuccess) {
    this.metrics = { queueDepth, memUsage, apiSuccess };
    this.updateMode();
  }

  updateMode() {
    const { queueDepth, memUsage, apiSuccess } = this.metrics;
    const queuePercent = queueDepth / 1000;  // max queue 1000
    const memPercent = memUsage / 3.2;       // max heap 3.2 GB

    if (memPercent > 0.8 || queuePercent > 0.8 || apiSuccess < 0.95) {
      this.mode = 'CRITICAL';
    } else if (memPercent > 0.6 || queuePercent > 0.5 || apiSuccess < 0.98) {
      this.mode = 'HIGHLOAD';
    } else {
      this.mode = 'OPTIMAL';
    }
  }

  getConfig() {
    return this.config[this.mode];
  }

  shouldRejectRequest(task) {
    if (this.mode === 'CRITICAL' && task.priority === 'low') {
      return true;  // Reject low-priority
    }
    return false;
  }
}
```

---

## Part 5: Deployment Strategies

### Single Machine Deployment

**Best for:** <50 req/sec, <10 concurrent  
**Hardware:** 4 GB RAM, 2 CPU cores

```bash
node \
  --max-old-space-size=2048 \
  --expose-gc \
  server.js
```

### Multi-Machine Deployment

**Best for:** 50-500 req/sec, 50-500 concurrent  
**Architecture:** Load balancer + 3-5 app servers

```yaml
# docker-compose.yml
version: '3'
services:
  load-balancer:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      
  app-1:
    image: tars:latest
    environment:
      - NODE_ENV=production
      
  app-2:
    image: tars:latest
    environment:
      - NODE_ENV=production
      
  app-3:
    image: tars:latest
    environment:
      - NODE_ENV=production
```

### Kubernetes Deployment

**Best for:** >500 req/sec, >500 concurrent  
**Auto-scaling:** Based on CPU/memory

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tars
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tars
  template:
    metadata:
      labels:
        app: tars
    spec:
      containers:
      - name: tars
        image: tars:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: tars-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: tars
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Scaling Roadmap

### Phase 1: Foundation (Week 1)
- [x] Set up horizontal scaling (5 agents)
- [x] Implement queue management
- [x] Add memory monitoring
- [x] Configure backoff/retry logic

### Phase 2: Optimization (Week 2-3)
- [ ] Implement graceful degradation
- [ ] Optimize context cache
- [ ] Deploy regional endpoints
- [ ] Set up cost tracking

### Phase 3: Distribution (Week 4-6)
- [ ] Multi-machine deployment
- [ ] Load balancing
- [ ] Redis cache layer
- [ ] Distributed tracing

### Phase 4: Enterprise (Month 2-3)
- [ ] Kubernetes deployment
- [ ] Multi-region setup
- [ ] Auto-scaling policies
- [ ] Disaster recovery

---

## Success Metrics

### Performance Targets

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Throughput | 50 req/s | 100 req/s | Week 1 |
| p99 Latency | 5 sec | 3 sec | Week 2 |
| Error Rate | 5% | <2% | Week 1 |
| Cost/req | $0.004 | $0.002 | Month 1 |
| Availability | 95% | 99.5% | Month 2 |

---

**Scaling Strategies v1.0 | For TARS System | Created 2026-02-13**
