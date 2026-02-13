# TARS Troubleshooting Guide

**Version:** 1.0.0  
**Last Updated:** 2026-02-13

## Quick Reference

| Issue | Quick Fix | Section |
|-------|-----------|---------|
| Skill timeout | Increase timeout value | [Timeouts](#timeouts) |
| High error rate | Check error logs, reduce load | [Error Handling](#error-handling) |
| Notifications failing | Verify channel config | [Notifications](#notifications) |
| Rate limiting too strict | Adjust rate limits | [Rate Limiting](#rate-limiting) |
| Memory usage high | Enable cleanup, reduce cache | [Performance](#performance) |
| Task decomposition failing | Check task complexity | [Task Decomposition](#task-decomposition) |

---

## Common Issues

### Timeouts

**Symptoms**:
- Operations not completing
- `TimeoutError` in logs
- Blocked workflows

**Root Causes**:
- Timeout value too low
- External service slow
- Network latency
- Insufficient resources

**Solutions**:

1. **Increase Timeout**
```javascript
const result = await manager.execute('skill', input, {
  timeout: 60000 // 60 seconds
});
```

2. **Check External Services**
```bash
# Test API response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.example.com

# Monitor network latency
ping -c 10 api.example.com
```

3. **Reduce Task Complexity**
```javascript
// Break into smaller subtasks
const subtasks = await decomposer.execute({
  title: 'Large task',
  complexity: 'medium' // Lower complexity = faster
});
```

4. **Scale Resources**
```javascript
// Increase worker threads
const config = {
  workers: 8,        // More parallel workers
  maxConcurrent: 20  // Higher concurrency
};
```

**Prevention**:
- Monitor execution time
- Set realistic timeouts based on SLA
- Use timeout monitoring alerts

---

### Error Handling

**Symptoms**:
- Many operation failures
- Repeated error patterns
- Cascading failures

**Root Causes**:
- External service errors
- Invalid input data
- Resource constraints
- Configuration issues

**Solutions**:

1. **Enable Debug Logging**
```javascript
logger.setLevel('debug');

// Log all operations
eventBus.on('skill-error', (data) => {
  logger.error('Skill error', {
    skill: data.skill,
    input: data.input,
    error: data.error.stack
  });
});
```

2. **Implement Error Recovery**
```javascript
const result = await recovery.execute({
  operation: async () => riskyOperation(),
  strategy: 'retry-exponential',
  maxRetries: 5,
  onError: async (error) => {
    logger.error('Operation failed', error);
    // Try fallback
    return await fallbackOperation();
  }
});
```

3. **Check Input Validation**
```javascript
// Add input validation
async function execute(input) {
  if (!this.validateInput(input)) {
    throw new Error('Invalid input: ' + JSON.stringify(input));
  }
  // ... proceed
}

validateInput(input) {
  return input &&
    typeof input === 'object' &&
    'requiredField' in input &&
    typeof input.requiredField === 'string';
}
```

4. **Verify Dependencies**
```bash
# Check service status
curl https://api.example.com/health

# Monitor resource usage
top -b -n 1 | head -20
free -h
du -sh ./*
```

**Prevention**:
- Implement comprehensive input validation
- Add health checks
- Monitor error rates
- Set up alerts

---

### Notifications

**Symptoms**:
- Messages not delivered
- Silent operation failures
- Notification errors in logs

**Root Causes**:
- Channel misconfiguration
- Invalid recipient addresses
- Service authentication issues
- Rate limiting

**Solutions**:

1. **Verify Channel Configuration**
```javascript
// Check channel setup
const channels = {
  email: {
    provider: 'gmail',
    from: 'notifications@example.com',
    auth: process.env.EMAIL_PASSWORD
  },
  slack: {
    token: process.env.SLACK_TOKEN,
    channel: '#notifications'
  }
};

// Validate config
for (const [channel, config] of Object.entries(channels)) {
  if (!config || !config.auth) {
    console.warn(`Channel ${channel} not configured`);
  }
}
```

2. **Test Channels**
```javascript
// Send test notification
await notifier.test({
  channels: ['email', 'slack'],
  recipient: 'test@example.com',
  message: 'Test message'
});

// Check logs
logger.info('Notification test result', result);
```

3. **Verify Recipient Addresses**
```javascript
// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email) {
  return emailRegex.test(email);
}

// Check Slack channel format
const channelRegex = /^#[\w-]+$/;
function isValidChannel(channel) {
  return channelRegex.test(channel);
}
```

4. **Check Authentication**
```bash
# Test email credentials
curl -X POST smtp.gmail.com \
  -u notifications@example.com:password

# Test Slack token
curl -H "Authorization: Bearer xoxb-token" \
  https://slack.com/api/auth.test
```

**Prevention**:
- Test channels regularly
- Implement delivery confirmation
- Monitor notification logs
- Set up alerts for failed deliveries

---

### Rate Limiting

**Symptoms**:
- Operations extremely slow
- Delayed task execution
- `RateLimitError` responses

**Root Causes**:
- Limits too restrictive
- Misconfigured strategy
- Burst size too small
- Wrong window size

**Solutions**:

1. **Analyze Rate Limits**
```javascript
// Monitor rate limiter
const metrics = limiter.getMetrics();
console.log('Requests/sec:', metrics.requestsPerSecond);
console.log('Avg wait time:', metrics.avgWaitTime);
console.log('Queue depth:', metrics.queueDepth);

// Adjust if needed
if (metrics.avgWaitTime > 1000) {
  console.log('Rate limiter too strict');
}
```

2. **Adjust Configuration**
```javascript
// Before: Too restrictive
const limiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 1000 // 10 req/sec
});

// After: More permissive
const limiter = new RateLimiter({
  strategy: 'token-bucket',
  tokensPerSecond: 100,
  maxBurst: 200 // Allow bursts
});
```

3. **Use Appropriate Strategy**
```javascript
// Fixed window: Good for API quotas
config.strategy = 'fixed-window';

// Sliding window: Better distribution
config.strategy = 'sliding-window';

// Token bucket: Flexible, allows bursts
config.strategy = 'token-bucket';
```

4. **Implement Smart Batching**
```javascript
// Instead of individual requests
for (const item of items) {
  await limiter.execute(() => processItem(item));
}

// Use batch processing
const batches = Utils.chunk(items, 100);
for (const batch of batches) {
  await limiter.execute(() => processBatch(batch));
}
```

**Prevention**:
- Understand API rate limits
- Load test rate limiter
- Monitor queue depth
- Adjust dynamically based on load

---

### Task Decomposition

**Symptoms**:
- Cannot decompose complex tasks
- Subtask generation fails
- Estimation errors

**Root Causes**:
- Task not suitable for decomposition
- Complexity too high
- Missing task metadata
- Invalid task structure

**Solutions**:

1. **Provide Clear Task Definition**
```javascript
// Before: Vague definition
const task = {
  title: 'Do something'
};

// After: Detailed definition
const task = {
  title: 'Deploy application',
  description: 'Build, test, and deploy to production',
  complexity: 'high',
  estimatedDuration: 3600000,
  dependencies: ['backend-build', 'frontend-build'],
  successCriteria: ['tests pass', 'deployment succeeds']
};
```

2. **Check Task Complexity**
```javascript
// Validate complexity level
const complexityLevels = ['low', 'medium', 'high'];
if (!complexityLevels.includes(task.complexity)) {
  task.complexity = 'medium'; // Default
}

// Estimate subtasks based on complexity
const estimatedSubtasks = {
  low: 2,
  medium: 5,
  high: 10
};
```

3. **Validate Task Structure**
```javascript
// Ensure required fields
const requiredFields = ['title'];
for (const field of requiredFields) {
  if (!task[field]) {
    throw new Error(`Missing required field: ${field}`);
  }
}

// Check for circular dependencies
if (hasCyclicDependencies(task.dependencies)) {
  throw new Error('Circular dependencies detected');
}
```

4. **Manual Decomposition**
```javascript
// If automatic fails, decompose manually
const subtasks = [
  { title: 'Step 1', priority: 'high' },
  { title: 'Step 2', priority: 'normal' },
  { title: 'Step 3', priority: 'normal' }
];

// Execute manually
for (const subtask of subtasks) {
  await executor.execute(subtask);
}
```

**Prevention**:
- Write clear task descriptions
- Set appropriate complexity levels
- Track estimation accuracy
- Learn from past decompositions

---

### Performance Issues

**Symptoms**:
- High CPU usage
- Memory leaks
- Slow responses
- Resource exhaustion

**Root Causes**:
- Inefficient algorithms
- Memory leaks
- Excessive caching
- Unbounded queues
- Concurrent operations too high

**Solutions**:

1. **Monitor Resource Usage**
```javascript
// CPU and memory monitoring
const os = require('os');
setInterval(() => {
  const cpuUsage = process.cpuUsage();
  const memUsage = process.memoryUsage();
  
  console.log({
    user: cpuUsage.user / 1000000,
    system: cpuUsage.system / 1000000,
    heapUsed: memUsage.heapUsed / 1024 / 1024,
    heapTotal: memUsage.heapTotal / 1024 / 1024
  });
}, 5000);
```

2. **Optimize Cache**
```javascript
// Limit cache size
class CachedSkill {
  constructor(config = {}) {
    this.cache = new Map();
    this.maxCacheSize = config.maxCacheSize || 1000;
    this.ttl = config.ttl || 300000; // 5 min
  }

  async execute(input) {
    // Implement cache eviction
    if (this.cache.size > this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    // ... rest of logic
  }
}
```

3. **Control Concurrency**
```javascript
// Limit concurrent operations
const limiter = new PLimit(5); // Max 5 concurrent

const results = await Promise.all(
  items.map(item =>
    limiter(() => processItem(item))
  )
);
```

4. **Enable Garbage Collection**
```javascript
// Run garbage collection periodically
if (global.gc) {
  setInterval(() => {
    global.gc();
    console.log('Garbage collection completed');
  }, 60000); // Every minute
}

// Start with: node --expose-gc
```

**Prevention**:
- Set resource limits
- Monitor metrics
- Profile code
- Load test

---

### Configuration Issues

**Symptoms**:
- Skills not loading
- Wrong behavior
- Missing features

**Root Causes**:
- Invalid configuration
- Missing environment variables
- Type mismatches
- Schema validation errors

**Solutions**:

1. **Validate Configuration**
```javascript
// Schema validation
const schema = {
  timeout: { type: 'number', min: 100, max: 300000 },
  retries: { type: 'number', min: 0, max: 10 },
  debug: { type: 'boolean' }
};

function validateConfig(config, schema) {
  for (const [key, spec] of Object.entries(schema)) {
    const value = config[key];
    if (value === undefined) continue;
    
    if (typeof value !== spec.type) {
      throw new Error(`${key}: expected ${spec.type}, got ${typeof value}`);
    }
    
    if (spec.min !== undefined && value < spec.min) {
      throw new Error(`${key}: must be >= ${spec.min}`);
    }
    
    if (spec.max !== undefined && value > spec.max) {
      throw new Error(`${key}: must be <= ${spec.max}`);
    }
  }
}
```

2. **Check Environment Variables**
```javascript
// Verify required env vars
const requiredEnv = [
  'SLACK_TOKEN',
  'EMAIL_PASSWORD',
  'API_KEY'
];

for (const env of requiredEnv) {
  if (!process.env[env]) {
    console.error(`Missing required env var: ${env}`);
    process.exit(1);
  }
}
```

3. **Debug Configuration**
```javascript
// Print effective configuration
console.log('Effective config:', manager.getConfig('my-skill'));

// Check config source
console.log('Config sources:');
console.log('- defaults:', getDefaults());
console.log('- env:', getEnvConfig());
console.log('- file:', getFileConfig());
```

**Prevention**:
- Document all configuration options
- Provide config examples
- Validate on startup
- Log configuration during initialization

---

## Diagnostic Commands

### Check Skill Status

```javascript
// List all skills
const skills = manager.list();
console.table(skills.map(s => ({
  name: s.name,
  version: s.version,
  status: s.status || 'active',
  capabilities: s.capabilities.length
})));

// Get skill metadata
const metadata = manager.getSkillMetadata('task-decomposer');
console.log(JSON.stringify(metadata, null, 2));
```

### View Logs

```bash
# View error logs
tail -f ./logs/error.log

# Search for specific error
grep "TimeoutError" ./logs/*.log

# View last 100 lines
tail -100 ./logs/application.log
```

### Test External Services

```bash
# Test API endpoint
curl -v https://api.example.com/health

# Test email service
telnet smtp.gmail.com 587

# Test Slack API
curl -H "Authorization: Bearer token" \
  https://slack.com/api/auth.test

# Check DNS
nslookup api.example.com
```

### System Resources

```bash
# CPU and memory
top -b -n 1 | head -20

# Disk usage
df -h
du -sh ./logs

# Network connections
netstat -an | grep ESTABLISHED

# Process info
ps aux | grep node
```

---

## Getting Help

### 1. Check Documentation
- [User Guide](./USER-GUIDE.md)
- [Developer Guide](./DEVELOPER-GUIDE.md)
- [API Reference](./API-REFERENCE.md)
- Individual skill documentation in `./skills/*/SKILL.md`

### 2. Check Logs
```bash
# Enable debug logging
LOG_LEVEL=debug node app.js

# Search for errors
grep -i "error\|failed" ./logs/*.log

# View stack traces
grep -A 20 "Error:" ./logs/error.log
```

### 3. Run Diagnostics
```bash
# Test configuration
node -e "console.log(require('./config'))"

# List registered skills
node -e "console.log(manager.list())"

# Test skill
node -e "manager.execute('task-decomposer', {...})"
```

### 4. Enable Detailed Output
```javascript
// Add event logging
eventBus.on('*', (event, data) => {
  console.log(`[${event}]`, JSON.stringify(data, null, 2));
});

// Add performance tracking
const start = Date.now();
await manager.execute('skill', input);
console.log(`Execution time: ${Date.now() - start}ms`);
```

---

## Error Reference

### E001: SkillNotFoundError

**Message**: "Skill 'name' not found"

**Causes**:
- Skill not registered
- Typo in skill name
- Skill not loaded

**Fix**:
```javascript
// Register skill first
manager.register({ name: 'skill-name', constructor: SkillClass });

// Or check spelling
console.log(manager.list().map(s => s.name));
```

### E002: SkillExecutionError

**Message**: "Skill execution failed: ..."

**Causes**:
- Skill logic error
- Invalid input
- Missing dependencies

**Fix**:
```javascript
// Check error details
try {
  await manager.execute('skill', input);
} catch (error) {
  console.error('Details:', error.details);
  console.error('Stack:', error.stack);
}
```

### E003: TimeoutError

**Message**: "Operation timed out after Xms"

**Causes**:
- Timeout too short
- External service slow
- Resource constraints

**Fix**: Increase timeout or optimize operation

### E009: RateLimitError

**Message**: "Rate limit exceeded"

**Causes**:
- Too many concurrent requests
- Rate limit too strict
- Burst exceeded

**Fix**: Adjust rate limit configuration

---

## FAQ

**Q: How do I increase debug logging?**
A: Set `LOG_LEVEL=debug` environment variable

**Q: Why is my skill timing out?**
A: Increase the timeout value or reduce task complexity

**Q: How do I test a skill?**
A: Use `manager.execute('skill-name', testInput)`

**Q: What's the best recovery strategy?**
A: Use `retry-exponential` for most cases

**Q: How do I monitor performance?**
A: Enable event logging and track execution times

---

**Last Updated**: 2026-02-13  
**Version**: 1.0.0  
**Status**: Production Ready
