# TARS Developer Guide

**Version:** 1.0.0  
**Last Updated:** 2026-02-13  
**Target Audience:** Developers, System Architects, Skill Creators

## Table of Contents

1. [Architecture](#architecture)
2. [Extending TARS](#extending-tars)
3. [Custom Skill Development](#custom-skill-development)
4. [Best Practices](#best-practices)
5. [API Integration](#api-integration)
6. [Testing](#testing)
7. [Performance](#performance)
8. [Deployment](#deployment)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────┐
│         TARS Core System                │
├─────────────────────────────────────────┤
│  ┌─────────────┐   ┌──────────────┐   │
│  │  Skill 1    │   │   Skill 2    │   │
│  │  (Executor) │   │  (Executor)  │   │
│  └──────┬──────┘   └──────┬───────┘   │
│         │                  │            │
│  ┌──────▼──────────────────▼──────┐   │
│  │    Event Bus / Message Queue   │   │
│  └──────┬──────────────────┬──────┘   │
│         │                  │            │
│  ┌──────▼────┐      ┌──────▼─────┐   │
│  │  Logger   │      │  Monitor   │   │
│  └───────────┘      └────────────┘   │
└─────────────────────────────────────────┘
         ▲                    ▲
         │                    │
    External APIs        Monitoring
```

### Core Components

#### 1. Skill Manager
- Registers and manages skills
- Handles skill lifecycle
- Manages dependencies

```javascript
class SkillManager {
  register(skill) // Register a new skill
  deregister(name) // Unregister skill
  execute(name, input) // Execute skill
  list() // List all skills
}
```

#### 2. Event Bus
- Allows skills to communicate
- Pub/Sub messaging pattern
- Asynchronous event handling

```javascript
class EventBus {
  on(event, handler) // Subscribe to event
  emit(event, data) // Publish event
  off(event, handler) // Unsubscribe
}
```

#### 3. Configuration Manager
- Manages skill configurations
- Environment variable support
- Runtime config updates

#### 4. Logger
- Structured logging
- Multiple log levels
- Log aggregation support

---

## Extending TARS

### Adding New Capabilities

#### Step 1: Create Skill Directory

```bash
mkdir -p ./skills/my-skill
cd ./skills/my-skill
```

#### Step 2: Create package.json

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "Description of your skill",
  "main": "my-skill.js",
  "scripts": {
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "axios": "^1.0.0"
  }
}
```

#### Step 3: Create SKILL.md

```markdown
# My Skill

## Overview
Description of what the skill does

## Capabilities
- Capability 1
- Capability 2

## Usage
How to use the skill

## API Reference
Detailed API docs

## Examples
Usage examples
```

#### Step 4: Implement Skill

Create `my-skill.js`:

```javascript
class MySkill {
  constructor(config = {}) {
    this.config = config;
    this.eventBus = config.eventBus;
    this.logger = config.logger;
  }

  async initialize() {
    this.logger.info('MySkill initialized');
  }

  async execute(input) {
    try {
      this.eventBus.emit('skill-started', { skill: 'my-skill' });
      
      const result = await this.process(input);
      
      this.eventBus.emit('skill-completed', { skill: 'my-skill', result });
      return result;
    } catch (error) {
      this.eventBus.emit('skill-error', { skill: 'my-skill', error });
      throw error;
    }
  }

  async process(input) {
    // Implement your logic here
    return { processed: true, input };
  }

  async shutdown() {
    this.logger.info('MySkill shutting down');
  }
}

module.exports = MySkill;
```

---

## Custom Skill Development

### Skill Interface

Every skill must implement this interface:

```javascript
interface Skill {
  // Initialize the skill
  initialize(): Promise<void>
  
  // Execute the skill
  execute(input: any, options?: any): Promise<any>
  
  // Shutdown the skill
  shutdown(): Promise<void>
  
  // Get skill metadata
  getMetadata(): SkillMetadata
  
  // Validate input
  validateInput(input: any): boolean
}
```

### Required Properties

```javascript
class MySkill {
  // Metadata
  static get metadata() {
    return {
      name: 'my-skill',
      version: '1.0.0',
      description: 'What this skill does',
      capabilities: ['capability1', 'capability2'],
      requiredInputs: ['field1', 'field2'],
      outputType: 'object'
    };
  }

  // Configuration schema
  static get configSchema() {
    return {
      timeout: { type: 'number', default: 30000 },
      retries: { type: 'number', default: 3 },
      debug: { type: 'boolean', default: false }
    };
  }
}
```

### Example: Error Recovery Skill

```javascript
class ErrorRecovery {
  constructor(config = {}) {
    this.config = config;
    this.strategies = {
      'retry-linear': this.retryLinear,
      'retry-exponential': this.retryExponential,
      'fallback': this.fallback,
      'graceful-degrade': this.gracefulDegrade
    };
  }

  async execute(input) {
    const { operation, strategy = 'retry-exponential', maxRetries = 3 } = input;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = this.strategies[strategy](attempt);
        await this.sleep(delay);
      }
    }
  }

  retryLinear(attempt) {
    return 1000 * (attempt + 1); // 1s, 2s, 3s...
  }

  retryExponential(attempt) {
    return 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s...
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ErrorRecovery;
```

### Example: Multi-Channel Notifier Skill

```javascript
class MultiChannelNotifier {
  constructor(config = {}) {
    this.channels = {
      email: new EmailChannel(config.email),
      slack: new SlackChannel(config.slack),
      sms: new SMSChannel(config.sms)
    };
  }

  async execute(input) {
    const { message, channels, recipients, priority } = input;
    
    const results = await Promise.allSettled(
      channels.map(channel => 
        this.sendViaChannel(channel, message, recipients, priority)
      )
    );

    return {
      sent: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results
    };
  }

  async sendViaChannel(channel, message, recipients, priority) {
    const handler = this.channels[channel];
    if (!handler) throw new Error(`Unknown channel: ${channel}`);
    
    return await handler.send({ message, recipients, priority });
  }
}

module.exports = MultiChannelNotifier;
```

---

## Best Practices

### 1. Input Validation

```javascript
async execute(input) {
  // Validate input
  if (!this.validateInput(input)) {
    throw new Error('Invalid input: ' + JSON.stringify(input));
  }

  // Ensure required fields
  const { required_field } = input;
  if (!required_field) {
    throw new Error('required_field is required');
  }

  // Type checking
  if (typeof input.count !== 'number') {
    throw new Error('count must be a number');
  }
}

validateInput(input) {
  return input && 
    typeof input === 'object' &&
    'field1' in input &&
    'field2' in input;
}
```

### 2. Error Handling

```javascript
async execute(input) {
  try {
    // Main operation
    const result = await this.process(input);
    return result;
  } catch (error) {
    // Log with context
    this.logger.error('Operation failed', {
      skill: this.constructor.name,
      input: JSON.stringify(input),
      error: error.message,
      stack: error.stack
    });

    // Emit error event
    this.eventBus.emit('skill-error', {
      skill: this.constructor.name,
      error: error.message
    });

    // Re-throw or return default
    throw error; // Or: return { success: false, error: error.message };
  }
}
```

### 3. Async Operations

```javascript
// Use Promise.allSettled for parallel operations
async execute(input) {
  const tasks = input.items.map(item => this.processItem(item));
  
  const results = await Promise.allSettled(tasks);
  
  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');
  
  return {
    successful: successful.map(r => r.value),
    failed: failed.map(r => r.reason.message)
  };
}
```

### 4. Resource Cleanup

```javascript
async shutdown() {
  // Close connections
  if (this.db) await this.db.close();
  if (this.client) await this.client.disconnect();
  
  // Cancel pending operations
  this.abortController?.abort();
  
  // Clean up resources
  this.cache?.clear();
}
```

### 5. Logging

```javascript
class MySkill {
  async execute(input) {
    this.logger.info('Starting task', { taskId: input.id });
    
    try {
      this.logger.debug('Processing', { input });
      const result = await this.process(input);
      this.logger.info('Task complete', { taskId: input.id, result });
      return result;
    } catch (error) {
      this.logger.error('Task failed', { taskId: input.id, error });
      throw error;
    }
  }
}
```

---

## API Integration

### Registering a Skill

```javascript
const SkillManager = require('./core/skill-manager');
const MySkill = require('./skills/my-skill');

const manager = new SkillManager();

// Register skill
manager.register({
  name: 'my-skill',
  constructor: MySkill,
  config: {
    timeout: 30000,
    retries: 3
  }
});
```

### Executing Skills

```javascript
// Execute single skill
const result = await manager.execute('my-skill', {
  input: 'some input',
  options: { timeout: 5000 }
});

// Chain skills
const step1 = await manager.execute('skill1', input);
const step2 = await manager.execute('skill2', step1);
```

### Event Handling

```javascript
const eventBus = new EventBus();

// Listen to skill events
eventBus.on('skill-completed', (data) => {
  console.log(`${data.skill} completed`, data.result);
});

eventBus.on('skill-error', (data) => {
  console.log(`${data.skill} failed`, data.error);
});

// Listen to all events
eventBus.on('*', (event, data) => {
  logger.debug(`Event: ${event}`, data);
});
```

---

## Testing

### Unit Testing

```javascript
// test/my-skill.test.js
const MySkill = require('../my-skill');

describe('MySkill', () => {
  let skill;

  beforeEach(() => {
    skill = new MySkill({
      eventBus: new EventBus(),
      logger: new MockLogger()
    });
  });

  test('should process valid input', async () => {
    const result = await skill.execute({ field: 'value' });
    expect(result).toBeDefined();
    expect(result.processed).toBe(true);
  });

  test('should validate input', async () => {
    await expect(skill.execute({})).rejects.toThrow();
  });

  test('should handle errors', async () => {
    const skill = new MySkill({
      ...config,
      shouldFail: true
    });
    
    await expect(skill.execute(input)).rejects.toThrow();
  });
});
```

### Integration Testing

```javascript
// test/integration.test.js
const SkillManager = require('../core/skill-manager');

describe('TARS Integration', () => {
  let manager;

  beforeEach(() => {
    manager = new SkillManager();
  });

  test('should execute workflow', async () => {
    const result = await manager.execute('skill1', input);
    const final = await manager.execute('skill2', result);
    
    expect(final).toBeDefined();
  });

  test('should handle skill errors', async () => {
    await expect(
      manager.execute('failing-skill', input)
    ).rejects.toThrow();
  });
});
```

---

## Performance

### Optimization Strategies

#### 1. Parallel Execution

```javascript
// Serial (slow)
async function serial() {
  const r1 = await task1();
  const r2 = await task2();
  const r3 = await task3();
  return { r1, r2, r3 };
}

// Parallel (fast)
async function parallel() {
  const [r1, r2, r3] = await Promise.all([
    task1(),
    task2(),
    task3()
  ]);
  return { r1, r2, r3 };
}
```

#### 2. Caching

```javascript
class CachedSkill {
  constructor() {
    this.cache = new Map();
    this.ttl = 300000; // 5 minutes
  }

  async execute(input) {
    const key = JSON.stringify(input);
    
    if (this.cache.has(key)) {
      const { value, timestamp } = this.cache.get(key);
      if (Date.now() - timestamp < this.ttl) {
        return value;
      }
    }

    const result = await this.process(input);
    this.cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  }
}
```

#### 3. Streaming

```javascript
// For large datasets, use streaming
async execute(input) {
  return fs.createReadStream(input.file)
    .pipe(transformStream)
    .pipe(outputStream);
}
```

---

## Deployment

### Package Structure

```
my-skill/
├── my-skill.js          # Main implementation
├── package.json         # Dependencies
├── SKILL.md             # Documentation
├── config/
│   └── default.json     # Default config
├── lib/
│   ├── helper1.js       # Helper functions
│   └── helper2.js
├── test/
│   ├── my-skill.test.js # Unit tests
│   └── integration.test.js
└── README.md            # Development guide
```

### Creating a Release

```bash
# Version bump
npm version patch

# Run tests
npm test

# Create tag
git tag v1.0.1

# Push release
git push origin v1.0.1 --tags
```

### Distribution

```bash
# Publish to npm (if public)
npm publish

# Or distribute as tarball
tar czf my-skill-1.0.0.tar.gz my-skill/
```

---

## Advanced Topics

### Custom Event Bus

```javascript
class CustomEventBus {
  constructor() {
    this.handlers = new Map();
    this.middleware = [];
  }

  use(fn) {
    this.middleware.push(fn);
  }

  async emit(event, data) {
    // Run middleware
    for (const fn of this.middleware) {
      data = await fn(event, data);
    }

    // Call handlers
    if (this.handlers.has(event)) {
      for (const handler of this.handlers.get(event)) {
        await handler(data);
      }
    }
  }
}
```

### Skill Composition

```javascript
class CompositeSkill {
  constructor(skills) {
    this.skills = skills;
  }

  async execute(input) {
    let current = input;
    
    for (const skill of this.skills) {
      current = await skill.execute(current);
    }
    
    return current;
  }
}

// Usage
const workflow = new CompositeSkill([
  new ValidateSkill(),
  new ProcessSkill(),
  new NotifySkill()
]);

const result = await workflow.execute(input);
```

### Skill Versioning

```javascript
class SkillRegistry {
  constructor() {
    this.skills = new Map();
  }

  register(name, version, constructor) {
    const key = `${name}@${version}`;
    this.skills.set(key, constructor);
  }

  get(name, version = 'latest') {
    if (version === 'latest') {
      // Get most recent version
    }
    return this.skills.get(`${name}@${version}`);
  }
}
```

---

## Troubleshooting

### Skill not loading

```javascript
// Check skill metadata
const metadata = MySkill.metadata;
console.log('Name:', metadata.name);
console.log('Version:', metadata.version);

// Verify interface implementation
const skill = new MySkill();
console.log('Has execute:', typeof skill.execute === 'function');
console.log('Has initialize:', typeof skill.initialize === 'function');
```

### Event not firing

```javascript
// Enable debug logging
eventBus.on('*', (event, data) => {
  console.log(`Event: ${event}`, data);
});

// Check event names
logger.info('Available events:', Object.keys(eventMap));
```

---

## Resources

- [Skill API Reference](./API-REFERENCE.md)
- [Individual Skill Docs](../skills/)
- [User Guide](./USER-GUIDE.md)

---

**Last Updated**: 2026-02-13  
**Version**: 1.0.0  
**Status**: Production Ready
