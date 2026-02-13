# TARS Quick Start Guide

**Time to Complete**: 10-15 minutes  
**Level**: Beginner  
**Objective**: Get your first TARS workflow running

---

## Prerequisites

- Node.js 14+ installed
- Basic JavaScript knowledge
- Text editor
- Terminal access

**Verify prerequisites**:
```bash
node --version  # Should be v14 or higher
npm --version
```

---

## Step 1: Create Your Project (2 minutes)

Create a new directory and initialize the project:

```bash
# Create project directory
mkdir my-tars-project
cd my-tars-project

# Initialize npm
npm init -y

# Install TARS
npm install tars-core
```

---

## Step 2: Create Your First Script (3 minutes)

Create `app.js` with a basic workflow:

```javascript
// app.js
const TARS = require('tars-core');

async function main() {
  // Create SkillManager
  const manager = new TARS.SkillManager();
  
  // Register a simple skill
  const taskDecomposer = new TARS.TaskDecomposer();
  manager.register({
    name: 'decompose',
    constructor: TARS.TaskDecomposer
  });
  
  // Execute skill
  try {
    const result = await manager.execute('decompose', {
      title: 'My First Task',
      description: 'Breaking down a task',
      complexity: 'low'
    });
    
    console.log('✓ Success!');
    console.log('Subtasks:', result);
  } catch (error) {
    console.error('✗ Failed:', error.message);
  }
}

main();
```

Run your script:

```bash
node app.js
```

**Expected Output**:
```
✓ Success!
Subtasks: [
  { id: '1', title: 'Subtask 1', ... },
  { id: '2', title: 'Subtask 2', ... }
]
```

---

## Step 3: Add Event Handling (2 minutes)

Monitor skill execution with events:

```javascript
// app.js (updated)
const TARS = require('tars-core');

async function main() {
  const manager = new TARS.SkillManager();
  const eventBus = new TARS.EventBus();
  
  // Listen to skill events
  eventBus.on('skill-completed', (data) => {
    console.log(`✓ ${data.skill} completed in ${data.duration}ms`);
  });
  
  eventBus.on('skill-error', (data) => {
    console.error(`✗ ${data.skill} failed:`, data.error.message);
  });
  
  // Register skill with event bus
  manager.register({
    name: 'decompose',
    constructor: TARS.TaskDecomposer,
    config: { eventBus }
  });
  
  // Execute
  try {
    const result = await manager.execute('decompose', {
      title: 'Task with Events',
      complexity: 'medium'
    });
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

---

## Step 4: Add Error Recovery (2 minutes)

Make your workflow resilient:

```javascript
// app.js (updated)
const TARS = require('tars-core');

async function main() {
  const manager = new TARS.SkillManager();
  
  // Register error recovery skill
  manager.register({
    name: 'recover',
    constructor: TARS.ErrorRecovery
  });
  
  // Execute with recovery
  const result = await manager.execute('recover', {
    operation: async () => {
      // Simulated operation that might fail
      return Math.random() > 0.3 ? 'success' : null;
    },
    strategy: 'retry-exponential',
    maxRetries: 3
  });
  
  console.log('Result:', result);
}

main().catch(console.error);
```

---

## Step 5: Add Notifications (2 minutes)

Send notifications on completion:

```javascript
// app.js (complete example)
const TARS = require('tars-core');

async function main() {
  const manager = new TARS.SkillManager();
  
  // Register all skills
  manager.register({
    name: 'decompose',
    constructor: TARS.TaskDecomposer
  });
  
  manager.register({
    name: 'notify',
    constructor: TARS.MultiChannelNotifier,
    config: {
      channels: {
        email: {
          from: 'notifications@example.com',
          // Add your email config
        },
        console: {
          // Console notifications for demo
        }
      }
    }
  });
  
  try {
    // Execute task decomposition
    const subtasks = await manager.execute('decompose', {
      title: 'Complete Example',
      complexity: 'high'
    });
    
    // Send notification
    await manager.execute('notify', {
      message: `Successfully decomposed task into ${subtasks.length} subtasks`,
      channels: ['console'],
      recipients: ['user@example.com'],
      priority: 'normal'
    });
    
    console.log('✓ Workflow complete!');
  } catch (error) {
    console.error('✗ Workflow failed:', error);
  }
}

main();
```

---

## Complete Example

Here's a complete, working example combining all concepts:

```javascript
// app.js - Complete working example
const TARS = require('tars-core');

async function runWorkflow() {
  // Initialize TARS
  const manager = new TARS.SkillManager();
  const eventBus = new TARS.EventBus();
  
  // Setup logging
  eventBus.on('*', (event, data) => {
    console.log(`[${new Date().toISOString()}] ${event}`);
  });
  
  // Register skills
  const skills = [
    { name: 'decompose', skill: TARS.TaskDecomposer },
    { name: 'recover', skill: TARS.ErrorRecovery },
    { name: 'notify', skill: TARS.MultiChannelNotifier }
  ];
  
  for (const { name, skill } of skills) {
    manager.register({
      name,
      constructor: skill,
      config: { eventBus }
    });
  }
  
  // Execute workflow
  try {
    console.log('🚀 Starting workflow...\n');
    
    // Step 1: Decompose task
    console.log('📋 Step 1: Decomposing task...');
    const subtasks = await manager.execute('decompose', {
      title: 'Deploy new feature',
      description: 'Build, test, and deploy feature v2.0',
      complexity: 'high',
      estimatedDuration: 3600000
    });
    console.log(`✓ Created ${subtasks.length} subtasks\n`);
    
    // Step 2: Execute with recovery
    console.log('🔄 Step 2: Executing with error recovery...');
    const execution = await manager.execute('recover', {
      operation: async () => {
        // Simulate processing
        await new Promise(r => setTimeout(r, 1000));
        return { status: 'completed', itemsProcessed: subtasks.length };
      },
      strategy: 'retry-exponential',
      maxRetries: 2
    });
    console.log('✓ Execution completed\n');
    
    // Step 3: Notify
    console.log('📢 Step 3: Sending notification...');
    const notification = await manager.execute('notify', {
      message: `Workflow completed successfully. ${subtasks.length} tasks processed.`,
      channels: ['console'],
      recipients: ['team@example.com'],
      priority: 'high'
    });
    console.log('✓ Notification sent\n');
    
    console.log('✅ Workflow completed successfully!');
    return { subtasks, execution, notification };
  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
    throw error;
  }
}

// Run the workflow
runWorkflow()
  .then(result => {
    console.log('\n📊 Final Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal Error:', error);
    process.exit(1);
  });
```

Save and run:

```bash
node app.js
```

---

## Next Steps

### 1. Explore Skills

Read individual skill documentation:

```bash
cat ../skills/task-decomposer/SKILL.md
cat ../skills/error-recovery/SKILL.md
cat ../skills/multi-channel-notifications/SKILL.md
```

### 2. Build a Real Workflow

Use TARS for your own project:

```javascript
const workflow = async () => {
  // Your workflow here
};
```

### 3. Read Documentation

- [User Guide](./USER-GUIDE.md): Understand TARS concepts
- [Developer Guide](./DEVELOPER-GUIDE.md): Extend TARS
- [API Reference](./API-REFERENCE.md): Complete API docs
- [Troubleshooting](./TROUBLESHOOTING.md): Fix common issues

### 4. Configure for Production

- Set up proper error handling
- Enable logging
- Configure notifications
- Monitor performance
- Add security

---

## Common Patterns

### Pattern 1: Parallel Execution

```javascript
const tasks = ['task1', 'task2', 'task3'];

const results = await Promise.all(
  tasks.map(task => 
    manager.execute('process', task)
  )
);
```

### Pattern 2: Sequential Execution

```javascript
let result = input;

for (const task of tasks) {
  result = await manager.execute('process', result);
}
```

### Pattern 3: Error Handling

```javascript
try {
  const result = await manager.execute('skill', input);
} catch (error) {
  console.error('Operation failed:', error);
  // Use recovery skill
  return await manager.execute('recover', {
    operation: () => manager.execute('skill', input)
  });
}
```

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Module not found | `npm install tars-core` |
| Skill not found | Check skill is registered |
| Timeout errors | Increase timeout value |
| Events not firing | Ensure eventBus is passed to skill |
| Notification fails | Verify channel configuration |

---

## Key Concepts in 60 Seconds

- **Skill**: A specialized function
- **SkillManager**: Manages and executes skills
- **EventBus**: Allows skills to communicate
- **Workflow**: Sequence of skills
- **Error Recovery**: Automatic error handling
- **Notifications**: Send messages to users

---

## Tips for Success

✅ **Do**:
- Start simple, add complexity gradually
- Use error recovery
- Monitor with events
- Test each skill individually
- Read skill documentation

❌ **Don't**:
- Skip input validation
- Ignore error messages
- Use infinite retries
- Mix synchronous and asynchronous code
- Ignore timeout errors

---

## Getting Help

1. Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Read [API Reference](./API-REFERENCE.md)
3. Review skill-specific documentation
4. Check error messages and logs

---

## What You Learned

✓ Created a TARS project  
✓ Executed your first skill  
✓ Added event handling  
✓ Implemented error recovery  
✓ Sent notifications  
✓ Built a complete workflow  

---

## Continue Learning

- **[User Guide](./USER-GUIDE.md)** - Learn all TARS concepts
- **[Developer Guide](./DEVELOPER-GUIDE.md)** - Create custom skills
- **[API Reference](./API-REFERENCE.md)** - Detailed API documentation
- **[Individual Skills](../skills/)** - Explore each skill

---

**Congratulations!** 🎉 You've completed the TARS Quick Start Guide.

**Next**: Build something awesome with TARS!

---

**Last Updated**: 2026-02-13  
**Version**: 1.0.0  
**Status**: Production Ready
