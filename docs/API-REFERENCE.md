# TARS API Reference

**Version:** 1.0.0  
**Last Updated:** 2026-02-13

## Table of Contents

1. [Core API](#core-api)
2. [Skill APIs](#skill-apis)
3. [Event Bus API](#event-bus-api)
4. [Configuration API](#configuration-api)
5. [Utility Functions](#utility-functions)
6. [Data Types](#data-types)
7. [Error Codes](#error-codes)

---

## Core API

### SkillManager

**Module**: `tars/core/skill-manager`

The SkillManager handles skill registration, execution, and lifecycle management.

#### `new SkillManager(options)`

**Description**: Creates a new SkillManager instance

**Parameters**:
- `options` (object, optional):
  - `eventBus` (EventBus): Event bus instance
  - `logger` (Logger): Logger instance
  - `timeout` (number): Default timeout in ms

**Returns**: (SkillManager) Manager instance

**Example**:
```javascript
const manager = new SkillManager({
  timeout: 30000,
  eventBus: eventBus,
  logger: logger
});
```

---

#### `manager.register(skillConfig)`

**Description**: Register a new skill with the manager

**Parameters**:
- `skillConfig` (object):
  - `name` (string, required): Unique skill name
  - `constructor` (class, required): Skill class
  - `version` (string, optional): Skill version
  - `config` (object, optional): Skill configuration
  - `enabled` (boolean, optional): Enable/disable skill

**Returns**: (void)

**Throws**: 
- `SkillAlreadyRegisteredError`: If skill name already registered
- `InvalidSkillError`: If skill doesn't implement interface

**Example**:
```javascript
manager.register({
  name: 'task-decomposer',
  constructor: TaskDecomposer,
  version: '1.0.0',
  config: { timeout: 30000 }
});
```

---

#### `manager.execute(skillName, input, options)`

**Description**: Execute a registered skill

**Parameters**:
- `skillName` (string, required): Name of skill to execute
- `input` (any): Input data for skill
- `options` (object, optional):
  - `timeout` (number): Override default timeout
  - `priority` (string): 'low', 'normal', 'high'
  - `retries` (number): Number of retries on failure

**Returns**: (Promise<any>) Skill output

**Throws**:
- `SkillNotFoundError`: If skill not registered
- `SkillExecutionError`: If skill fails
- `TimeoutError`: If execution exceeds timeout

**Example**:
```javascript
try {
  const result = await manager.execute('task-decomposer', {
    title: 'Complex task',
    complexity: 'high'
  }, {
    timeout: 60000,
    retries: 3
  });
} catch (error) {
  console.error('Skill execution failed:', error);
}
```

---

#### `manager.deregister(skillName)`

**Description**: Unregister a skill

**Parameters**:
- `skillName` (string, required): Name of skill to remove

**Returns**: (void)

**Throws**:
- `SkillNotFoundError`: If skill not registered

**Example**:
```javascript
manager.deregister('deprecated-skill');
```

---

#### `manager.list()`

**Description**: List all registered skills

**Parameters**: None

**Returns**: (Array<SkillMetadata>) Array of skill metadata

**Example**:
```javascript
const skills = manager.list();
skills.forEach(skill => {
  console.log(`${skill.name}@${skill.version}`);
});
```

---

### EventBus

**Module**: `tars/core/event-bus`

The EventBus provides pub/sub messaging between skills.

#### `new EventBus()`

**Description**: Creates a new EventBus instance

**Parameters**: None

**Returns**: (EventBus) EventBus instance

**Example**:
```javascript
const eventBus = new EventBus();
```

---

#### `eventBus.on(event, handler)`

**Description**: Subscribe to an event

**Parameters**:
- `event` (string, required): Event name to listen for
- `handler` (function, required): Handler function

**Returns**: (void)

**Example**:
```javascript
eventBus.on('skill-completed', (data) => {
  console.log('Skill completed:', data.skill);
});

// Listen to all events
eventBus.on('*', (event, data) => {
  console.log('Event:', event, data);
});
```

---

#### `eventBus.emit(event, data)`

**Description**: Publish an event

**Parameters**:
- `event` (string, required): Event name
- `data` (any, optional): Event data

**Returns**: (Promise<void>)

**Example**:
```javascript
await eventBus.emit('task-started', {
  taskId: '12345',
  timestamp: Date.now()
});
```

---

#### `eventBus.off(event, handler)`

**Description**: Unsubscribe from an event

**Parameters**:
- `event` (string, required): Event name
- `handler` (function, required): Handler to remove

**Returns**: (void)

**Example**:
```javascript
const handler = (data) => console.log(data);
eventBus.on('skill-completed', handler);
eventBus.off('skill-completed', handler);
```

---

## Skill APIs

### TaskDecomposer

**Module**: `skills/task-decomposer`

Breaks complex tasks into manageable subtasks.

#### `execute(input)`

**Description**: Decompose a task into subtasks

**Parameters**:
- `input` (object):
  - `title` (string, required): Task title
  - `description` (string, optional): Task description
  - `complexity` (string, optional): 'low', 'medium', 'high'
  - `estimatedDuration` (number, optional): Estimated ms

**Returns**: (Promise<Array<Task>>)

**Example**:
```javascript
const subtasks = await decomposer.execute({
  title: 'Deploy application',
  description: 'Build, test, and deploy to production',
  complexity: 'high',
  estimatedDuration: 3600000 // 1 hour
});

console.log(subtasks); // [{id, title, priority, ...}, ...]
```

---

### ErrorRecovery

**Module**: `skills/error-recovery`

Automatically recover from errors using various strategies.

#### `execute(input)`

**Description**: Execute operation with error recovery

**Parameters**:
- `input` (object):
  - `operation` (function, required): Async function to execute
  - `strategy` (string, optional): Recovery strategy
  - `maxRetries` (number, optional): Max retry attempts
  - `backoffBase` (number, optional): Backoff multiplier
  - `onError` (function, optional): Error handler
  - `fallback` (function, optional): Fallback operation

**Returns**: (Promise<any>) Operation result

**Strategies**:
- `'retry-linear'`: Fixed delay between retries
- `'retry-exponential'`: Exponential backoff
- `'fallback'`: Use fallback operation
- `'graceful-degrade'`: Return partial result

**Example**:
```javascript
const result = await recovery.execute({
  operation: async () => riskyAPI.call(),
  strategy: 'retry-exponential',
  maxRetries: 3,
  backoffBase: 2, // 1s, 2s, 4s...
  onError: async (error) => {
    logger.error('Operation failed:', error);
  }
});
```

---

### MultiChannelNotifier

**Module**: `skills/multi-channel-notifications`

Send notifications across multiple communication channels.

#### `execute(input)`

**Description**: Send notification to multiple channels

**Parameters**:
- `input` (object):
  - `message` (string, required): Message content
  - `channels` (Array<string>, required): Channels to use
  - `recipients` (Array<string>, required): Recipient identifiers
  - `priority` (string, optional): 'low', 'normal', 'high'
  - `metadata` (object, optional): Additional data

**Returns**: (Promise<NotificationResult>)

**Channels**:
- `'email'`: Send via email
- `'slack'`: Send to Slack
- `'sms'`: Send SMS
- `'discord'`: Send to Discord
- `'webhook'`: Send to webhook URL

**Example**:
```javascript
const result = await notifier.execute({
  message: 'Deployment successful',
  channels: ['slack', 'email'],
  recipients: ['#dev-channel', 'team@example.com'],
  priority: 'high',
  metadata: {
    deployment: 'v2.0.0',
    duration: '15 minutes'
  }
});

console.log(result); // {sent: 2, failed: 0, details: [...]}
```

---

### RateLimiter

**Module**: `skills/rate-limiter`

Control request rate and resource usage.

#### `execute(input)`

**Description**: Execute operation with rate limiting

**Parameters**:
- `input` (object):
  - `operation` (function, required): Function to execute
  - `strategy` (string, optional): Limiting strategy
  - `maxRequests` (number, optional): Max requests
  - `windowMs` (number, optional): Time window in ms
  - `tokensPerSecond` (number, optional): Tokens/second
  - `maxBurst` (number, optional): Max burst size

**Returns**: (Promise<any>) Operation result

**Strategies**:
- `'fixed-window'`: Fixed time window limits
- `'sliding-window'`: Continuous sliding window
- `'token-bucket'`: Token bucket algorithm
- `'leaky-bucket'`: Leaky bucket algorithm

**Example**:
```javascript
const limiter = new RateLimiter({
  strategy: 'token-bucket',
  tokensPerSecond: 100,
  maxBurst: 200
});

const result = await limiter.execute({
  operation: async () => apiCall(),
  tokens: 5 // Cost 5 tokens
});
```

---

### SelfHealing

**Module**: `skills/self-healing`

Automatically detect and fix issues.

#### `execute(input)`

**Description**: Execute with automatic healing

**Parameters**:
- `input` (object):
  - `operation` (function, required): Operation to execute
  - `healStrategies` (Array<HealStrategy>): Healing strategies
  - `monitorInterval` (number, optional): Check interval in ms
  - `maxHealAttempts` (number, optional): Max heal tries

**Returns**: (Promise<any>) Result or healed result

**HealStrategy**:
```javascript
{
  condition: 'timeout' | 'memory-leak' | 'connection-lost' | 'custom',
  action: 'restart' | 'cleanup' | 'reconnect' | async function,
  threshold: number, // Trigger threshold
  cooldown: number // Time before retry
}
```

**Example**:
```javascript
const result = await healer.execute({
  operation: async () => service.process(),
  healStrategies: [
    {
      condition: 'timeout',
      action: 'restart',
      threshold: 30000,
      cooldown: 5000
    },
    {
      condition: 'memory-leak',
      action: 'cleanup',
      threshold: 500000000, // 500MB
      cooldown: 10000
    }
  ]
});
```

---

### PredictiveScheduler

**Module**: `skills/predictive-scheduler`

Schedule tasks at optimal times.

#### `findOptimalTime(input)`

**Description**: Find optimal execution time for task

**Parameters**:
- `input` (object):
  - `task` (object): Task to schedule
  - `estimatedDuration` (number): Expected duration in ms
  - `constraints` (object, optional):
    - `avoidHours` (Array<number>): Hours to avoid (0-23)
    - `preferredWindow` (string): Time window preference
    - `timeZone` (string): IANA timezone
    - `maxDelay` (number): Max delay before execution

**Returns**: (Promise<Date>) Optimal execution time

**Example**:
```javascript
const optimalTime = await scheduler.findOptimalTime({
  task: { name: 'backup-database' },
  estimatedDuration: 1800000, // 30 minutes
  constraints: {
    avoidHours: [9, 12, 17, 18], // Avoid business hours
    preferredWindow: 'midnight-6am',
    timeZone: 'UTC',
    maxDelay: 86400000 // 1 day
  }
});

console.log(optimalTime); // 2026-02-14T02:30:00Z
```

---

## Event Bus API

### Standard Events

All events follow this pattern:

```javascript
{
  skill: string,           // Name of skill
  timestamp: number,       // Unix timestamp
  duration: number,        // Operation duration in ms
  status: string,          // 'started', 'completed', 'failed'
  data: any                // Skill-specific data
}
```

### Common Events

#### `skill-started`
Emitted when skill execution begins.

```javascript
eventBus.on('skill-started', (data) => {
  console.log(`${data.skill} started`);
});
```

#### `skill-completed`
Emitted when skill completes successfully.

```javascript
eventBus.on('skill-completed', (data) => {
  console.log(`${data.skill} completed in ${data.duration}ms`);
  console.log('Result:', data.result);
});
```

#### `skill-error`
Emitted when skill fails.

```javascript
eventBus.on('skill-error', (data) => {
  console.error(`${data.skill} failed:`, data.error);
  console.log('Input was:', data.input);
});
```

#### `task-started` / `task-completed` / `task-failed`
Task-level events.

---

## Configuration API

### ConfigManager

**Module**: `tars/core/config`

#### `getConfig(skillName)`

Get skill configuration.

```javascript
const config = configManager.getConfig('my-skill');
console.log(config.timeout); // 30000
```

#### `setConfig(skillName, config)`

Update skill configuration.

```javascript
configManager.setConfig('my-skill', {
  timeout: 60000,
  retries: 5
});
```

#### `getConfigSchema(skillName)`

Get configuration schema for validation.

```javascript
const schema = configManager.getConfigSchema('my-skill');
console.log(schema);
// { timeout: {type: 'number', default: 30000}, ... }
```

---

## Utility Functions

### Logger

**Module**: `tars/core/logger`

```javascript
logger.debug('Debug message', { context: data });
logger.info('Info message', { context: data });
logger.warn('Warning message', { context: data });
logger.error('Error message', { context: data });
```

### Utils.delay()

Pause execution.

```javascript
await Utils.delay(1000); // Sleep 1 second
```

### Utils.retry()

Retry async operation.

```javascript
const result = await Utils.retry(
  () => apiCall(),
  { maxRetries: 3, backoff: 'exponential' }
);
```

### Utils.timeout()

Add timeout to promise.

```javascript
const result = await Utils.timeout(
  slowOperation(),
  5000 // 5 second timeout
);
```

---

## Data Types

### Task

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'running' | 'completed' | 'failed';
  estimatedDuration?: number;
  actualDuration?: number;
  result?: any;
  error?: Error;
  createdAt: Date;
  completedAt?: Date;
  subtasks?: Task[];
}
```

### SkillMetadata

```typescript
interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  status: 'active' | 'beta' | 'deprecated';
  capabilities: string[];
  requiredInputs: string[];
  optionalInputs: string[];
  outputType: string;
  dependencies?: string[];
  configSchema?: Record<string, any>;
}
```

### ExecutionOptions

```typescript
interface ExecutionOptions {
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
  retries?: number;
  concurrent?: boolean;
  cache?: boolean;
  timeout?: number;
}
```

### NotificationResult

```typescript
interface NotificationResult {
  sent: number;
  failed: number;
  results: Array<{
    channel: string;
    recipient: string;
    status: 'sent' | 'failed';
    error?: string;
  }>;
}
```

---

## Error Codes

### Standard Errors

| Code | Message | Cause |
|------|---------|-------|
| `E001` | SkillNotFoundError | Skill not registered |
| `E002` | SkillExecutionError | Skill execution failed |
| `E003` | TimeoutError | Execution exceeded timeout |
| `E004` | InvalidInputError | Invalid input provided |
| `E005` | ConfigurationError | Invalid configuration |
| `E006` | ValidationError | Validation failed |
| `E007` | AuthenticationError | Auth failed |
| `E008` | AuthorizationError | Not authorized |
| `E009` | RateLimitError | Rate limit exceeded |
| `E010` | ResourceError | Resource unavailable |

### Using Error Codes

```javascript
try {
  await manager.execute('skill', input);
} catch (error) {
  if (error.code === 'E001') {
    console.log('Skill not found');
  } else if (error.code === 'E003') {
    console.log('Timeout occurred');
  } else {
    console.log('Unknown error:', error.message);
  }
}
```

---

## Examples

### Complete Workflow Example

```javascript
const manager = new SkillManager();
const eventBus = new EventBus();

// Setup event listeners
eventBus.on('skill-completed', (data) => {
  console.log(`✓ ${data.skill} completed`);
});

eventBus.on('skill-error', (data) => {
  console.error(`✗ ${data.skill} failed:`, data.error);
});

// Register skills
manager.register({
  name: 'decompose',
  constructor: TaskDecomposer,
  config: { eventBus }
});

manager.register({
  name: 'execute',
  constructor: TaskExecutor,
  config: { eventBus }
});

manager.register({
  name: 'notify',
  constructor: MultiChannelNotifier,
  config: { eventBus }
});

// Execute workflow
async function runWorkflow() {
  try {
    // Step 1: Decompose task
    const subtasks = await manager.execute('decompose', {
      title: 'Deploy app',
      complexity: 'high'
    });

    // Step 2: Execute each subtask
    const results = await Promise.all(
      subtasks.map(task => 
        manager.execute('execute', task)
      )
    );

    // Step 3: Notify results
    await manager.execute('notify', {
      message: 'Deployment complete',
      channels: ['slack'],
      recipients: ['#dev'],
      priority: 'high'
    });

    return results;
  } catch (error) {
    console.error('Workflow failed:', error);
  }
}

await runWorkflow();
```

---

## API Versioning

The API follows semantic versioning:
- **Major**: Breaking changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes

Current version: **1.0.0**

---

**Last Updated**: 2026-02-13  
**Version**: 1.0.0  
**Status**: Production Ready
