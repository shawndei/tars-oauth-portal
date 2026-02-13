/**
 * Long-Horizon Planning - Core Planner
 * Handles multi-step goal decomposition, temporal reasoning, and adaptive replanning
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');

class LongHorizonPlanner extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      checkpointInterval: options.checkpointInterval || 3600000, // 1 hour default
      maxRetries: options.maxRetries || 3,
      stateDir: options.stateDir || path.join(process.cwd(), '.lhp-state'),
      ...options
    };
    
    this.plans = new Map();
    this.activeExecutions = new Map();
    this.checkpointTimer = null;
  }

  /**
   * Initialize the planner
   */
  async initialize() {
    await fs.mkdir(this.options.stateDir, { recursive: true });
    await this.loadState();
    this.startCheckpointTimer();
    this.emit('initialized');
  }

  /**
   * Create a new long-horizon plan
   * @param {Object} goal - The high-level goal
   * @param {Object} constraints - Temporal and resource constraints
   * @returns {Object} Plan object
   */
  async createPlan(goal, constraints = {}) {
    const planId = this.generatePlanId();
    
    const plan = {
      id: planId,
      goal,
      constraints,
      status: 'created',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [],
      dependencies: new Map(),
      timeline: {},
      checkpoints: [],
      metadata: {}
    };

    // Decompose goal into steps
    plan.steps = await this.decompose(goal, constraints);
    
    // Build dependency graph
    plan.dependencies = this.buildDependencyGraph(plan.steps);
    
    // Generate timeline
    plan.timeline = await this.generateTimeline(plan.steps, plan.dependencies, constraints);
    
    // Validate plan
    const validation = this.validatePlan(plan);
    if (!validation.valid) {
      throw new Error(`Plan validation failed: ${validation.errors.join(', ')}`);
    }

    this.plans.set(planId, plan);
    await this.saveState();
    
    this.emit('plan:created', { planId, plan });
    return plan;
  }

  /**
   * Decompose a high-level goal into executable steps
   * @param {Object} goal - The goal to decompose
   * @param {Object} constraints - Constraints to consider
   * @returns {Array} Array of step objects
   */
  async decompose(goal, constraints) {
    const steps = [];
    
    // Recursive decomposition based on goal type
    const decomposeFn = this.getDecompositionStrategy(goal.type);
    const subgoals = await decomposeFn(goal, constraints);
    
    for (const [index, subgoal] of subgoals.entries()) {
      const step = {
        id: `${goal.id || 'goal'}-step-${index}`,
        description: subgoal.description,
        type: subgoal.type,
        action: subgoal.action,
        inputs: subgoal.inputs || {},
        outputs: subgoal.outputs || {},
        estimatedDuration: subgoal.estimatedDuration,
        dependencies: subgoal.dependencies || [],
        constraints: subgoal.constraints || {},
        status: 'pending',
        retries: 0,
        metadata: subgoal.metadata || {}
      };
      
      // Recursively decompose if step is complex
      if (subgoal.complex) {
        const substeps = await this.decompose(subgoal, constraints);
        step.substeps = substeps;
      }
      
      steps.push(step);
    }
    
    return steps;
  }

  /**
   * Get appropriate decomposition strategy based on goal type
   */
  getDecompositionStrategy(goalType) {
    const strategies = {
      'sequential': this.decomposeSequential.bind(this),
      'parallel': this.decomposeParallel.bind(this),
      'conditional': this.decomposeConditional.bind(this),
      'iterative': this.decomposeIterative.bind(this),
      'default': this.decomposeDefault.bind(this)
    };
    
    return strategies[goalType] || strategies.default;
  }

  async decomposeSequential(goal, constraints) {
    // Break into ordered steps
    return goal.steps || [];
  }

  async decomposeParallel(goal, constraints) {
    // Break into parallelizable steps
    return goal.steps || [];
  }

  async decomposeConditional(goal, constraints) {
    // Create decision branches
    return goal.branches || [];
  }

  async decomposeIterative(goal, constraints) {
    // Create loop structure
    return goal.iterations || [];
  }

  async decomposeDefault(goal, constraints) {
    // Simple linear decomposition
    return goal.steps || [goal];
  }

  /**
   * Build dependency graph from steps
   */
  buildDependencyGraph(steps) {
    const graph = new Map();
    
    for (const step of steps) {
      graph.set(step.id, {
        step,
        dependsOn: new Set(step.dependencies),
        dependents: new Set(),
        satisfied: step.dependencies.length === 0
      });
    }
    
    // Build reverse dependencies
    for (const [stepId, node] of graph.entries()) {
      for (const depId of node.dependsOn) {
        if (graph.has(depId)) {
          graph.get(depId).dependents.add(stepId);
        }
      }
    }
    
    return graph;
  }

  /**
   * Generate timeline with temporal reasoning
   */
  async generateTimeline(steps, dependencies, constraints) {
    const timeline = {
      startTime: constraints.startTime || Date.now(),
      endTime: null,
      schedule: new Map(),
      criticalPath: []
    };
    
    // Topological sort for execution order
    const sorted = this.topologicalSort(dependencies);
    
    let currentTime = timeline.startTime;
    const completionTimes = new Map();
    
    for (const stepId of sorted) {
      const node = dependencies.get(stepId);
      const step = node.step;
      
      // Calculate earliest start time based on dependencies
      let earliestStart = currentTime;
      for (const depId of node.dependsOn) {
        const depEndTime = completionTimes.get(depId);
        if (depEndTime) {
          earliestStart = Math.max(earliestStart, depEndTime);
        }
      }
      
      // Apply time constraints
      if (step.constraints.notBefore) {
        earliestStart = Math.max(earliestStart, step.constraints.notBefore);
      }
      
      const duration = step.estimatedDuration || 0;
      const endTime = earliestStart + duration;
      
      timeline.schedule.set(stepId, {
        startTime: earliestStart,
        endTime,
        duration,
        slack: 0 // Calculate slack later
      });
      
      completionTimes.set(stepId, endTime);
      currentTime = Math.max(currentTime, endTime);
    }
    
    timeline.endTime = currentTime;
    timeline.criticalPath = this.findCriticalPath(dependencies, timeline.schedule);
    
    return timeline;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  topologicalSort(dependencies) {
    const sorted = [];
    const inDegree = new Map();
    const queue = [];
    
    // Calculate in-degrees
    for (const [stepId, node] of dependencies.entries()) {
      inDegree.set(stepId, node.dependsOn.size);
      if (node.dependsOn.size === 0) {
        queue.push(stepId);
      }
    }
    
    while (queue.length > 0) {
      const stepId = queue.shift();
      sorted.push(stepId);
      
      const node = dependencies.get(stepId);
      for (const dependent of node.dependents) {
        const degree = inDegree.get(dependent) - 1;
        inDegree.set(dependent, degree);
        if (degree === 0) {
          queue.push(dependent);
        }
      }
    }
    
    if (sorted.length !== dependencies.size) {
      throw new Error('Circular dependency detected in plan');
    }
    
    return sorted;
  }

  /**
   * Find critical path through plan
   */
  findCriticalPath(dependencies, schedule) {
    // Simplified critical path - steps with zero slack
    const criticalPath = [];
    
    for (const [stepId, timing] of schedule.entries()) {
      if (timing.slack === 0) {
        criticalPath.push(stepId);
      }
    }
    
    return criticalPath;
  }

  /**
   * Validate plan for feasibility
   */
  validatePlan(plan) {
    const errors = [];
    
    // Check for cycles
    try {
      this.topologicalSort(plan.dependencies);
    } catch (err) {
      errors.push('Circular dependencies detected');
    }
    
    // Check temporal constraints
    if (plan.constraints.deadline) {
      if (plan.timeline.endTime > plan.constraints.deadline) {
        errors.push('Plan exceeds deadline constraint');
      }
    }
    
    // Check resource constraints
    // (Simplified - could be expanded)
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute a plan
   */
  async executePlan(planId, executor) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }
    
    plan.status = 'executing';
    plan.startedAt = Date.now();
    
    const execution = {
      planId,
      status: 'running',
      currentStep: null,
      completedSteps: new Set(),
      failedSteps: new Map(),
      startedAt: Date.now()
    };
    
    this.activeExecutions.set(planId, execution);
    this.emit('execution:started', { planId, execution });
    
    try {
      await this.executeSteps(plan, execution, executor);
      
      execution.status = 'completed';
      execution.completedAt = Date.now();
      plan.status = 'completed';
      plan.completedAt = Date.now();
      
      this.emit('execution:completed', { planId, execution });
    } catch (err) {
      execution.status = 'failed';
      execution.error = err.message;
      plan.status = 'failed';
      
      this.emit('execution:failed', { planId, execution, error: err });
      throw err;
    } finally {
      await this.saveState();
    }
    
    return execution;
  }

  /**
   * Execute steps in dependency order
   */
  async executeSteps(plan, execution, executor) {
    const sorted = this.topologicalSort(plan.dependencies);
    
    for (const stepId of sorted) {
      const node = plan.dependencies.get(stepId);
      const step = node.step;
      
      // Check if dependencies are satisfied
      const depsSatisfied = Array.from(node.dependsOn).every(depId =>
        execution.completedSteps.has(depId)
      );
      
      if (!depsSatisfied) {
        throw new Error(`Dependencies not satisfied for step ${stepId}`);
      }
      
      // Execute step with retry logic
      await this.executeStepWithRetry(step, execution, executor);
      
      execution.completedSteps.add(stepId);
      
      // Checkpoint after each step
      await this.createCheckpoint(plan, execution);
    }
  }

  /**
   * Execute a single step with retry logic
   */
  async executeStepWithRetry(step, execution, executor) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        execution.currentStep = step.id;
        step.status = 'executing';
        step.startedAt = Date.now();
        
        this.emit('step:started', { step, attempt });
        
        const result = await executor(step);
        
        step.status = 'completed';
        step.completedAt = Date.now();
        step.result = result;
        
        this.emit('step:completed', { step, result });
        return result;
        
      } catch (err) {
        lastError = err;
        step.retries = attempt + 1;
        
        this.emit('step:failed', { step, error: err, attempt });
        
        if (attempt < this.options.maxRetries) {
          // Attempt replanning
          const replanned = await this.replanAfterFailure(step, err);
          if (replanned) {
            // Retry with new plan
            continue;
          }
        }
      }
    }
    
    step.status = 'failed';
    step.error = lastError.message;
    throw new Error(`Step ${step.id} failed after ${this.options.maxRetries} retries: ${lastError.message}`);
  }

  /**
   * Adaptive replanning after failure
   */
  async replanAfterFailure(step, error) {
    this.emit('replanning:started', { step, error });
    
    // Analyze failure
    const analysis = this.analyzeFailure(step, error);
    
    // Try alternative approaches
    if (analysis.recoverable) {
      // Modify step constraints or approach
      if (analysis.suggestion === 'relax-timing') {
        step.estimatedDuration *= 1.5;
        return true;
      } else if (analysis.suggestion === 'alternative-action') {
        // Switch to alternative action if available
        if (step.alternatives && step.alternatives.length > 0) {
          const alt = step.alternatives.shift();
          step.action = alt.action;
          step.inputs = alt.inputs;
          return true;
        }
      }
    }
    
    this.emit('replanning:failed', { step, analysis });
    return false;
  }

  /**
   * Analyze step failure
   */
  analyzeFailure(step, error) {
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes('timeout') || errorMsg.includes('time')) {
      return { recoverable: true, suggestion: 'relax-timing' };
    }
    
    if (errorMsg.includes('not found') || errorMsg.includes('unavailable')) {
      return { recoverable: true, suggestion: 'alternative-action' };
    }
    
    return { recoverable: false, suggestion: null };
  }

  /**
   * Create checkpoint
   */
  async createCheckpoint(plan, execution) {
    const checkpoint = {
      planId: plan.id,
      timestamp: Date.now(),
      completedSteps: Array.from(execution.completedSteps),
      currentStep: execution.currentStep,
      status: execution.status
    };
    
    plan.checkpoints.push(checkpoint);
    
    const checkpointPath = path.join(
      this.options.stateDir,
      `checkpoint-${plan.id}-${checkpoint.timestamp}.json`
    );
    
    await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
    
    this.emit('checkpoint:created', { checkpoint });
  }

  /**
   * Resume from checkpoint
   */
  async resumeFromCheckpoint(planId, checkpointIndex = -1) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }
    
    const checkpoint = checkpointIndex >= 0
      ? plan.checkpoints[checkpointIndex]
      : plan.checkpoints[plan.checkpoints.length - 1];
    
    if (!checkpoint) {
      throw new Error('No checkpoint found');
    }
    
    this.emit('checkpoint:resuming', { planId, checkpoint });
    
    // Restore execution state
    const execution = {
      planId,
      status: 'running',
      currentStep: checkpoint.currentStep,
      completedSteps: new Set(checkpoint.completedSteps),
      failedSteps: new Map(),
      resumedAt: Date.now(),
      resumedFrom: checkpoint.timestamp
    };
    
    return execution;
  }

  /**
   * Get plan progress
   */
  getProgress(planId) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }
    
    const execution = this.activeExecutions.get(planId);
    
    const totalSteps = plan.steps.length;
    const completedSteps = execution ? execution.completedSteps.size : 0;
    const progress = totalSteps > 0 ? completedSteps / totalSteps : 0;
    
    const now = Date.now();
    const elapsed = execution ? now - execution.startedAt : 0;
    const estimated = plan.timeline.endTime - plan.timeline.startTime;
    const remaining = Math.max(0, estimated - elapsed);
    
    return {
      planId,
      status: plan.status,
      progress,
      completedSteps,
      totalSteps,
      elapsed,
      estimated,
      remaining,
      currentStep: execution ? execution.currentStep : null
    };
  }

  /**
   * Save state to disk
   */
  async saveState() {
    const state = {
      plans: Array.from(this.plans.entries()).map(([id, plan]) => ({
        id,
        ...plan,
        dependencies: Array.from(plan.dependencies.entries())
      })),
      activeExecutions: Array.from(this.activeExecutions.entries())
    };
    
    const statePath = path.join(this.options.stateDir, 'state.json');
    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
  }

  /**
   * Load state from disk
   */
  async loadState() {
    const statePath = path.join(this.options.stateDir, 'state.json');
    
    try {
      const data = await fs.readFile(statePath, 'utf8');
      const state = JSON.parse(data);
      
      // Restore plans
      for (const planData of state.plans) {
        const plan = {
          ...planData,
          dependencies: new Map(planData.dependencies)
        };
        this.plans.set(plan.id, plan);
      }
      
      // Restore executions
      for (const [id, execution] of state.activeExecutions) {
        execution.completedSteps = new Set(execution.completedSteps);
        execution.failedSteps = new Map(execution.failedSteps);
        this.activeExecutions.set(id, execution);
      }
      
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      // No state file yet, that's okay
    }
  }

  /**
   * Start automatic checkpoint timer
   */
  startCheckpointTimer() {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
    }
    
    this.checkpointTimer = setInterval(async () => {
      await this.saveState();
    }, this.options.checkpointInterval);
  }

  /**
   * Generate unique plan ID
   */
  generatePlanId() {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup
   */
  async shutdown() {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
    }
    await this.saveState();
    this.emit('shutdown');
  }
}

module.exports = { LongHorizonPlanner };
