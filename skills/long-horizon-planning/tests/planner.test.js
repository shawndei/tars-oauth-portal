/**
 * Tests for Long-Horizon Planning
 */

const { LongHorizonPlanner } = require('../src/planner');
const { ConstraintSolver, CommonConstraints } = require('../src/constraints');
const { parseTimeExpression, formatDuration } = require('../src/temporal');
const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Long-Horizon Planning', () => {
  let planner;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `lhp-test-${Date.now()}`);
    planner = new LongHorizonPlanner({
      stateDir: testDir,
      checkpointInterval: 1000
    });
    await planner.initialize();
  });

  afterEach(async () => {
    await planner.shutdown();
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('Plan Creation', () => {
    it('should create a simple sequential plan', async () => {
      const goal = {
        id: 'test-goal',
        type: 'sequential',
        steps: [
          {
            description: 'Step 1',
            type: 'action',
            action: 'doThing1',
            estimatedDuration: 1000
          },
          {
            description: 'Step 2',
            type: 'action',
            action: 'doThing2',
            estimatedDuration: 2000,
            dependencies: ['test-goal-step-0']
          }
        ]
      };

      const plan = await planner.createPlan(goal);
      
      assert.ok(plan.id);
      assert.strictEqual(plan.status, 'created');
      assert.strictEqual(plan.steps.length, 2);
      assert.ok(plan.timeline);
      assert.ok(plan.timeline.endTime > plan.timeline.startTime);
    });

    it('should build correct dependency graph', async () => {
      const goal = {
        id: 'dep-goal',
        type: 'sequential',
        steps: [
          {
            description: 'A',
            estimatedDuration: 1000,
            dependencies: []
          },
          {
            description: 'B',
            estimatedDuration: 1000,
            dependencies: ['dep-goal-step-0']
          },
          {
            description: 'C',
            estimatedDuration: 1000,
            dependencies: ['dep-goal-step-0']
          },
          {
            description: 'D',
            estimatedDuration: 1000,
            dependencies: ['dep-goal-step-1', 'dep-goal-step-2']
          }
        ]
      };

      const plan = await planner.createPlan(goal);
      
      const depGraph = plan.dependencies;
      assert.strictEqual(depGraph.size, 4);
      
      const nodeD = depGraph.get('dep-goal-step-3');
      assert.strictEqual(nodeD.dependsOn.size, 2);
      assert.ok(nodeD.dependsOn.has('dep-goal-step-1'));
      assert.ok(nodeD.dependsOn.has('dep-goal-step-2'));
    });

    it('should detect circular dependencies', async () => {
      const goal = {
        id: 'circular-goal',
        type: 'sequential',
        steps: [
          {
            description: 'A',
            estimatedDuration: 1000,
            dependencies: ['circular-goal-step-1']
          },
          {
            description: 'B',
            estimatedDuration: 1000,
            dependencies: ['circular-goal-step-0']
          }
        ]
      };

      await assert.rejects(
        async () => await planner.createPlan(goal),
        /circular dependency/i
      );
    });

    it('should generate valid timeline', async () => {
      const goal = {
        id: 'timeline-goal',
        type: 'sequential',
        steps: [
          { description: 'A', estimatedDuration: 1000, dependencies: [] },
          { description: 'B', estimatedDuration: 2000, dependencies: ['timeline-goal-step-0'] },
          { description: 'C', estimatedDuration: 1500, dependencies: ['timeline-goal-step-1'] }
        ]
      };

      const plan = await planner.createPlan(goal);
      
      const schedule = plan.timeline.schedule;
      const timingA = schedule.get('timeline-goal-step-0');
      const timingB = schedule.get('timeline-goal-step-1');
      const timingC = schedule.get('timeline-goal-step-2');
      
      // B should start after A ends
      assert.ok(timingB.startTime >= timingA.endTime);
      // C should start after B ends
      assert.ok(timingC.startTime >= timingB.endTime);
    });
  });

  describe('Plan Execution', () => {
    it('should execute a simple plan successfully', async () => {
      const goal = {
        id: 'exec-goal',
        type: 'sequential',
        steps: [
          { description: 'Task 1', estimatedDuration: 100, dependencies: [] },
          { description: 'Task 2', estimatedDuration: 100, dependencies: ['exec-goal-step-0'] }
        ]
      };

      const plan = await planner.createPlan(goal);
      
      const results = [];
      const executor = async (step) => {
        results.push(step.id);
        return { success: true };
      };

      const execution = await planner.executePlan(plan.id, executor);
      
      assert.strictEqual(execution.status, 'completed');
      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0], 'exec-goal-step-0');
      assert.strictEqual(results[1], 'exec-goal-step-1');
    });

    it('should retry failed steps', async () => {
      const goal = {
        id: 'retry-goal',
        type: 'sequential',
        steps: [
          { description: 'Flaky task', estimatedDuration: 100, dependencies: [] }
        ]
      };

      const plan = await planner.createPlan(goal);
      
      let attempts = 0;
      const executor = async (step) => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      };

      planner.options.maxRetries = 2;
      const execution = await planner.executePlan(plan.id, executor);
      
      assert.strictEqual(execution.status, 'completed');
      assert.strictEqual(attempts, 2);
    });

    it('should fail after max retries', async () => {
      const goal = {
        id: 'fail-goal',
        type: 'sequential',
        steps: [
          { description: 'Always fails', estimatedDuration: 100, dependencies: [] }
        ]
      };

      const plan = await planner.createPlan(goal);
      
      const executor = async (step) => {
        throw new Error('Permanent failure');
      };

      planner.options.maxRetries = 2;
      
      await assert.rejects(
        async () => await planner.executePlan(plan.id, executor),
        /failed after 2 retries/i
      );
    });

    it('should create checkpoints during execution', async () => {
      const goal = {
        id: 'checkpoint-goal',
        type: 'sequential',
        steps: [
          { description: 'Task 1', estimatedDuration: 100, dependencies: [] },
          { description: 'Task 2', estimatedDuration: 100, dependencies: ['checkpoint-goal-step-0'] },
          { description: 'Task 3', estimatedDuration: 100, dependencies: ['checkpoint-goal-step-1'] }
        ]
      };

      const plan = await planner.createPlan(goal);
      
      let checkpointCount = 0;
      planner.on('checkpoint:created', () => checkpointCount++);
      
      const executor = async (step) => ({ success: true });
      await planner.executePlan(plan.id, executor);
      
      assert.ok(checkpointCount >= 3);
      assert.ok(plan.checkpoints.length >= 3);
    });
  });

  describe('Progress Monitoring', () => {
    it('should track execution progress', async () => {
      const goal = {
        id: 'progress-goal',
        type: 'sequential',
        steps: [
          { description: 'Task 1', estimatedDuration: 100, dependencies: [] },
          { description: 'Task 2', estimatedDuration: 100, dependencies: ['progress-goal-step-0'] },
          { description: 'Task 3', estimatedDuration: 100, dependencies: ['progress-goal-step-1'] }
        ]
      };

      const plan = await planner.createPlan(goal);
      
      const progressSnapshots = [];
      
      const executor = async (step) => {
        const progress = planner.getProgress(plan.id);
        progressSnapshots.push(progress.progress);
        return { success: true };
      };

      await planner.executePlan(plan.id, executor);
      
      // Progress should increase over time
      assert.ok(progressSnapshots[0] < progressSnapshots[1]);
      assert.ok(progressSnapshots[1] < progressSnapshots[2]);
      
      const finalProgress = planner.getProgress(plan.id);
      assert.strictEqual(finalProgress.progress, 1.0);
    });
  });

  describe('State Persistence', () => {
    it('should save and load state', async () => {
      const goal = {
        id: 'persist-goal',
        type: 'sequential',
        steps: [
          { description: 'Task', estimatedDuration: 100, dependencies: [] }
        ]
      };

      const plan = await planner.createPlan(goal);
      await planner.saveState();
      
      // Create new planner instance
      const planner2 = new LongHorizonPlanner({ stateDir: testDir });
      await planner2.initialize();
      
      const loadedPlan = planner2.plans.get(plan.id);
      assert.ok(loadedPlan);
      assert.strictEqual(loadedPlan.goal.id, goal.id);
      
      await planner2.shutdown();
    });
  });

  describe('Temporal Reasoning', () => {
    it('should parse time expressions', () => {
      const now = Date.now();
      
      const tomorrow = parseTimeExpression('tomorrow');
      assert.ok(tomorrow > now);
      assert.ok(tomorrow < now + 2 * 24 * 60 * 60 * 1000);
      
      const nextWeek = parseTimeExpression('next week');
      assert.ok(nextWeek > tomorrow);
    });

    it('should format durations', () => {
      assert.strictEqual(formatDuration(1000), '1s');
      assert.strictEqual(formatDuration(60000), '1m 0s');
      assert.strictEqual(formatDuration(3600000), '1h 0m');
      assert.strictEqual(formatDuration(86400000), '1d 0h');
    });
  });

  describe('Constraint Satisfaction', () => {
    it('should check deadline constraints', () => {
      const solver = new ConstraintSolver();
      const deadline = Date.now() + 10000;
      
      solver.addConstraint('deadline', CommonConstraints.deadline(deadline));
      
      const step = { id: 'test-step' };
      const context = {
        schedule: new Map([
          ['test-step', { startTime: Date.now(), endTime: Date.now() + 5000 }]
        ])
      };
      
      const result = solver.checkConstraints(step, context);
      assert.strictEqual(result.satisfied, true);
    });

    it('should detect resource conflicts', () => {
      const solver = new ConstraintSolver();
      solver.registerResource('cpu', 100);
      
      const steps = [
        { id: 'step1', resources: { cpu: 60 } },
        { id: 'step2', resources: { cpu: 60 } }
      ];
      
      const schedule = new Map([
        ['step1', { startTime: 1000, endTime: 3000 }],
        ['step2', { startTime: 2000, endTime: 4000 }]
      ]);
      
      const conflicts = solver.findConflicts(steps, schedule);
      assert.ok(conflicts.length > 0);
      assert.strictEqual(conflicts[0].type, 'resource');
    });
  });

  describe('Multi-Day Plans', () => {
    it('should handle multi-day project plan', async () => {
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      const goal = {
        id: 'project',
        type: 'sequential',
        steps: [
          {
            description: 'Phase 1: Planning',
            estimatedDuration: 2 * oneDayMs,
            dependencies: []
          },
          {
            description: 'Phase 2: Development',
            estimatedDuration: 5 * oneDayMs,
            dependencies: ['project-step-0']
          },
          {
            description: 'Phase 3: Testing',
            estimatedDuration: 3 * oneDayMs,
            dependencies: ['project-step-1']
          },
          {
            description: 'Phase 4: Deployment',
            estimatedDuration: 1 * oneDayMs,
            dependencies: ['project-step-2']
          }
        ]
      };

      const constraints = {
        startTime: Date.now(),
        deadline: Date.now() + (15 * oneDayMs)
      };

      const plan = await planner.createPlan(goal, constraints);
      
      assert.strictEqual(plan.steps.length, 4);
      
      const totalDuration = plan.timeline.endTime - plan.timeline.startTime;
      assert.ok(totalDuration >= 11 * oneDayMs);
      assert.ok(totalDuration <= constraints.deadline - constraints.startTime);
      
      // Check that phases are properly sequenced
      const schedule = plan.timeline.schedule;
      for (let i = 0; i < 3; i++) {
        const currentPhase = schedule.get(`project-step-${i}`);
        const nextPhase = schedule.get(`project-step-${i + 1}`);
        assert.ok(nextPhase.startTime >= currentPhase.endTime);
      }
    });

    it('should handle complex project with parallel tasks', async () => {
      const hourMs = 60 * 60 * 1000;
      
      const goal = {
        id: 'complex-project',
        type: 'sequential',
        steps: [
          {
            description: 'Setup',
            estimatedDuration: 2 * hourMs,
            dependencies: []
          },
          {
            description: 'Frontend dev',
            estimatedDuration: 8 * hourMs,
            dependencies: ['complex-project-step-0']
          },
          {
            description: 'Backend dev',
            estimatedDuration: 8 * hourMs,
            dependencies: ['complex-project-step-0']
          },
          {
            description: 'Integration',
            estimatedDuration: 4 * hourMs,
            dependencies: ['complex-project-step-1', 'complex-project-step-2']
          }
        ]
      };

      const plan = await planner.createPlan(goal);
      
      // Frontend and backend can run in parallel, but both must complete before integration
      const schedule = plan.timeline.schedule;
      const frontend = schedule.get('complex-project-step-1');
      const backend = schedule.get('complex-project-step-2');
      const integration = schedule.get('complex-project-step-3');
      
      // Integration must start after both frontend and backend
      assert.ok(integration.startTime >= frontend.endTime);
      assert.ok(integration.startTime >= backend.endTime);
    });
  });

  describe('Adaptive Replanning', () => {
    it('should replan after timeout failure', async () => {
      const goal = {
        id: 'replan-goal',
        type: 'sequential',
        steps: [
          {
            description: 'Slow task',
            estimatedDuration: 1000,
            dependencies: [],
            alternatives: [
              { action: 'fastMethod', inputs: {} }
            ]
          }
        ]
      };

      const plan = await planner.createPlan(goal);
      
      let attemptCount = 0;
      const executor = async (step) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Timeout: operation took too long');
        }
        return { success: true, method: 'fast' };
      };

      planner.options.maxRetries = 2;
      const execution = await planner.executePlan(plan.id, executor);
      
      assert.strictEqual(execution.status, 'completed');
      assert.ok(attemptCount >= 2);
    });

    it('should emit replanning events', async () => {
      const goal = {
        id: 'events-goal',
        type: 'sequential',
        steps: [
          { description: 'Task', estimatedDuration: 100, dependencies: [] }
        ]
      };

      const plan = await planner.createPlan(goal);
      
      let replanningStarted = false;
      planner.on('replanning:started', () => {
        replanningStarted = true;
      });
      
      const executor = async (step) => {
        throw new Error('Timeout error');
      };

      planner.options.maxRetries = 1;
      
      try {
        await planner.executePlan(plan.id, executor);
      } catch (err) {
        // Expected to fail
      }
      
      assert.ok(replanningStarted);
    });
  });
});

// Simple test runner
async function runTests() {
  console.log('Running Long-Horizon Planning Tests\n');
  
  const testSuite = describe('Long-Horizon Planning', () => {});
  
  let passed = 0;
  let failed = 0;
  
  for (const suite of testSuite.suites) {
    console.log(`\n${suite.name}`);
    
    for (const test of suite.tests) {
      try {
        if (suite.beforeEach) await suite.beforeEach();
        await test.fn();
        if (suite.afterEach) await suite.afterEach();
        
        console.log(`  ✓ ${test.name}`);
        passed++;
      } catch (err) {
        console.log(`  ✗ ${test.name}`);
        console.log(`    ${err.message}`);
        failed++;
      }
    }
  }
  
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Test framework helpers
function describe(name, fn) {
  const suite = {
    name,
    tests: [],
    suites: [],
    beforeEach: null,
    afterEach: null
  };
  
  const currentSuite = suite;
  
  global.it = (testName, testFn) => {
    currentSuite.tests.push({ name: testName, fn: testFn });
  };
  
  global.beforeEach = (fn) => {
    currentSuite.beforeEach = fn;
  };
  
  global.afterEach = (fn) => {
    currentSuite.afterEach = fn;
  };
  
  global.describe = (suiteName, suiteFn) => {
    const nested = describe(suiteName, suiteFn);
    currentSuite.suites.push(nested);
    return nested;
  };
  
  fn();
  
  return suite;
}

if (require.main === module) {
  runTests();
}

module.exports = { describe, runTests };
