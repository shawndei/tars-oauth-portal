/**
 * Multi-Agent Orchestrator (Enhanced)
 * Routes tasks to specialist agents with coordination protocol
 */

const fs = require('fs').promises;
const path = require('path');
const CoordinationProtocol = require('./coordination-protocol');

class MultiAgentOrchestrator {
  constructor(options = {}) {
    this.workspaceDir = options.workspaceDir || process.env.OPENCLAW_WORKSPACE || './';
    this.profilesPath = options.profilesPath || path.join(__dirname, 'agent-profiles.json');
    this.coordination = new CoordinationProtocol(this.workspaceDir);
    this.profiles = null;
    this.activeAgents = new Map(); // agentType → count
  }

  async initialize() {
    // Load agent profiles
    const content = await fs.readFile(this.profilesPath, 'utf-8');
    this.profiles = JSON.parse(content);
    
    // Initialize coordination protocol
    await this.coordination.initialize();
    
    console.log('[Orchestrator] Initialized with', Object.keys(this.profiles.profiles).length, 'agent profiles');
  }

  /**
   * Route task to appropriate specialist(s)
   */
  async route(task, options = {}) {
    const taskType = options.taskType || this.classifyTask(task);
    
    if (taskType === 'complex') {
      return await this.coordinateComplexTask(task, options);
    }
    
    const specialist = this.selectSpecialist(task, options.preferredAgent);
    return await this.executeTask(specialist, task, options);
  }

  /**
   * Classify task type
   */
  classifyTask(task) {
    const taskLower = task.toLowerCase();
    
    // Check for multi-step indicators
    const multiStepIndicators = [
      'and then',
      'after that',
      'followed by',
      'first.*then',
      'research.*analyz.*write',
      'complex',
      'comprehensive',
      'full',
      'complete'
    ];
    
    for (const indicator of multiStepIndicators) {
      if (new RegExp(indicator).test(taskLower)) {
        return 'complex';
      }
    }
    
    // Count how many specializations are triggered
    let triggeredCount = 0;
    for (const [agentId, profile] of Object.entries(this.profiles.profiles)) {
      for (const trigger of profile.triggers) {
        if (taskLower.includes(trigger)) {
          triggeredCount++;
          break;
        }
      }
    }
    
    if (triggeredCount > 1) {
      return 'parallel';
    }
    
    return 'simple';
  }

  /**
   * Select appropriate specialist
   */
  selectSpecialist(task, preferredAgent = null) {
    if (preferredAgent && this.profiles.profiles[preferredAgent]) {
      return this.profiles.profiles[preferredAgent];
    }
    
    const taskLower = task.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;
    
    for (const [agentId, profile] of Object.entries(this.profiles.profiles)) {
      if (agentId === 'coordinator') continue; // Skip coordinator for simple tasks
      
      let score = 0;
      for (const trigger of profile.triggers) {
        if (taskLower.includes(trigger)) {
          score += 1;
        }
      }
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = profile;
      }
    }
    
    return bestMatch || this.profiles.profiles.researcher; // Default to researcher
  }

  /**
   * Execute simple task with single agent
   */
  async executeTask(specialist, task, options = {}) {
    const taskId = await this.coordination.registerTask({
      type: 'simple',
      agent: specialist.id,
      task,
      priority: options.priority || 'normal',
      estimatedCost: this._estimateCost(task, specialist)
    });
    
    await this.coordination.updateTaskStatus(taskId, 'in-progress');
    
    // Update load state
    const currentLoad = this.activeAgents.get(specialist.id) || 0;
    this.activeAgents.set(specialist.id, currentLoad + 1);
    await this.coordination.updateLoadState(specialist.id, {
      active: currentLoad + 1,
      capacity: specialist.maxConcurrent,
      utilization: ((currentLoad + 1) / specialist.maxConcurrent * 100).toFixed(1) + '%'
    });
    
    // Check if agent is overloaded
    if (currentLoad >= specialist.maxConcurrent) {
      console.log(`[Orchestrator] ${specialist.id} at capacity, considering fallback...`);
      const fallbackAgent = await this._getFallbackAgent(specialist.id);
      if (fallbackAgent) {
        console.log(`[Orchestrator] Using fallback: ${fallbackAgent.id}`);
        specialist = fallbackAgent;
      }
    }
    
    // Simulate task execution (in production, this would spawn actual agent)
    const result = await this._mockAgentExecution(specialist, task, taskId);
    
    // Cache result
    await this.coordination.cacheResult(taskId, result, {
      reusable: true,
      metadata: {
        agent: specialist.id,
        model: specialist.model,
        quality: result.quality
      }
    });
    
    await this.coordination.updateTaskStatus(taskId, 'completed', {
      completedAt: Date.now(),
      result: result
    });
    
    // Update load state
    this.activeAgents.set(specialist.id, Math.max(0, currentLoad));
    
    return {
      taskId,
      specialist: specialist.name,
      result,
      executionTime: result.executionTime,
      cost: result.cost
    };
  }

  /**
   * Coordinate complex multi-agent task
   */
  async coordinateComplexTask(task, options = {}) {
    console.log('[Orchestrator] Complex task detected, decomposing...');
    
    const coordinator = this.profiles.profiles.coordinator;
    const decomposition = this._decomposeTask(task);
    
    // Create task chain
    const chain = await this.coordination.createTaskChain({
      chainType: decomposition.type,
      tasks: decomposition.subtasks
    });
    
    console.log(`[Orchestrator] Created ${decomposition.type} chain with ${decomposition.subtasks.length} subtasks`);
    
    // Execute based on chain type
    let results;
    if (decomposition.type === 'parallel') {
      results = await this._executeParallel(decomposition.subtasks, chain);
    } else if (decomposition.type === 'sequential') {
      results = await this._executeSequential(decomposition.subtasks, chain);
    } else {
      // Hybrid: some parallel, some sequential
      results = await this._executeHybrid(decomposition.subtasks, chain);
    }
    
    // Aggregate and synthesize results
    const synthesis = await this._synthesizeResults(results, task);
    
    // Cache final result
    await this.coordination.cacheResult(chain.chainId, synthesis, {
      reusable: true,
      metadata: {
        type: 'synthesized',
        subtaskCount: results.length,
        totalCost: synthesis.totalCost
      }
    });
    
    await this.coordination.updateTaskStatus(chain.chainId, 'completed', {
      completedAt: Date.now(),
      synthesis
    });
    
    return {
      taskId: chain.chainId,
      type: 'complex',
      subtasks: results,
      synthesis,
      totalCost: synthesis.totalCost,
      totalTime: synthesis.totalTime
    };
  }

  /**
   * Decompose complex task into subtasks
   */
  _decomposeTask(task) {
    const taskLower = task.toLowerCase();
    const subtasks = [];
    
    // Simple heuristic-based decomposition
    // In production, this would use LLM for intelligent decomposition
    
    if (taskLower.includes('research') || taskLower.includes('find') || taskLower.includes('gather')) {
      subtasks.push({
        agent: 'researcher',
        task: 'Research and gather information',
        instruction: task,
        dependencies: []
      });
    }
    
    if (taskLower.includes('analyz') || taskLower.includes('compare') || taskLower.includes('evaluate')) {
      subtasks.push({
        agent: 'analyst',
        task: 'Analyze data and identify patterns',
        instruction: task,
        dependencies: subtasks.length > 0 ? [subtasks[0].task] : []
      });
    }
    
    if (taskLower.includes('code') || taskLower.includes('implement') || taskLower.includes('build')) {
      subtasks.push({
        agent: 'coder',
        task: 'Implement solution',
        instruction: task,
        dependencies: subtasks.filter(s => s.agent === 'analyst' || s.agent === 'researcher').map(s => s.task)
      });
    }
    
    if (taskLower.includes('write') || taskLower.includes('document') || taskLower.includes('report')) {
      subtasks.push({
        agent: 'writer',
        task: 'Create final documentation',
        instruction: task,
        dependencies: subtasks.map(s => s.task)
      });
    }
    
    // Determine execution type
    const hasParallel = subtasks.some(s => s.dependencies.length === 0) && subtasks.length > 1;
    const hasSequential = subtasks.some(s => s.dependencies.length > 0);
    
    let type = 'sequential';
    if (hasParallel && !hasSequential) {
      type = 'parallel';
    } else if (hasParallel && hasSequential) {
      type = 'hybrid';
    }
    
    return { type, subtasks };
  }

  /**
   * Execute subtasks in parallel
   */
  async _executeParallel(subtasks, chain) {
    console.log('[Orchestrator] Executing', subtasks.length, 'tasks in parallel...');
    
    const promises = subtasks.map(async (subtask, index) => {
      const specialist = this.profiles.profiles[subtask.agent];
      const taskId = chain.subtasks[index];
      
      await this.coordination.updateTaskStatus(taskId, 'in-progress');
      
      const result = await this._mockAgentExecution(specialist, subtask.instruction, taskId);
      
      await this.coordination.cacheResult(taskId, result);
      await this.coordination.updateTaskStatus(taskId, 'completed', { result });
      
      return { subtask, result, taskId };
    });
    
    return await Promise.all(promises);
  }

  /**
   * Execute subtasks sequentially
   */
  async _executeSequential(subtasks, chain) {
    console.log('[Orchestrator] Executing', subtasks.length, 'tasks sequentially...');
    
    const results = [];
    const contextAccumulator = {};
    
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      const taskId = chain.subtasks[i];
      const specialist = this.profiles.profiles[subtask.agent];
      
      // Check dependencies
      const depsReady = await this.coordination.areDependenciesSatisfied(taskId);
      if (!depsReady) {
        console.log(`[Orchestrator] Dependencies not satisfied for task ${taskId}, waiting...`);
        // In production, implement proper waiting/polling
      }
      
      await this.coordination.updateTaskStatus(taskId, 'in-progress');
      
      // Pass accumulated context
      const result = await this._mockAgentExecution(
        specialist,
        subtask.instruction,
        taskId,
        contextAccumulator
      );
      
      // Update context for next task
      contextAccumulator[subtask.agent] = result;
      
      await this.coordination.cacheResult(taskId, result);
      await this.coordination.updateTaskStatus(taskId, 'completed', { result });
      
      results.push({ subtask, result, taskId });
    }
    
    return results;
  }

  /**
   * Execute hybrid (mix of parallel and sequential)
   */
  async _executeHybrid(subtasks, chain) {
    console.log('[Orchestrator] Executing hybrid workflow...');
    
    // Group tasks by dependency level
    const levels = this._groupByDependencyLevel(subtasks);
    const results = [];
    const contextAccumulator = {};
    
    for (const level of levels) {
      // Execute all tasks at this level in parallel
      const levelResults = await Promise.all(
        level.map(async ({ subtask, index }) => {
          const taskId = chain.subtasks[index];
          const specialist = this.profiles.profiles[subtask.agent];
          
          await this.coordination.updateTaskStatus(taskId, 'in-progress');
          
          const result = await this._mockAgentExecution(
            specialist,
            subtask.instruction,
            taskId,
            contextAccumulator
          );
          
          contextAccumulator[subtask.agent] = result;
          
          await this.coordination.cacheResult(taskId, result);
          await this.coordination.updateTaskStatus(taskId, 'completed', { result });
          
          return { subtask, result, taskId };
        })
      );
      
      results.push(...levelResults);
    }
    
    return results;
  }

  /**
   * Group tasks by dependency level for hybrid execution
   */
  _groupByDependencyLevel(subtasks) {
    const levels = [];
    const processed = new Set();
    
    while (processed.size < subtasks.length) {
      const currentLevel = [];
      
      subtasks.forEach((subtask, index) => {
        if (processed.has(index)) return;
        
        // Check if all dependencies are processed
        const depsProcessed = subtask.dependencies.every(dep => {
          const depIndex = subtasks.findIndex(s => s.task === dep);
          return depIndex === -1 || processed.has(depIndex);
        });
        
        if (depsProcessed) {
          currentLevel.push({ subtask, index });
          processed.add(index);
        }
      });
      
      if (currentLevel.length > 0) {
        levels.push(currentLevel);
      } else {
        break; // Prevent infinite loop if there's a circular dependency
      }
    }
    
    return levels;
  }

  /**
   * Synthesize results from multiple agents
   */
  async _synthesizeResults(results, originalTask) {
    console.log('[Orchestrator] Synthesizing results from', results.length, 'agents...');
    
    const synthesis = {
      summary: `Completed ${results.length} subtasks for: "${originalTask}"`,
      results: results.map(r => ({
        agent: r.subtask.agent,
        output: r.result.output,
        quality: r.result.quality,
        cost: r.result.cost
      })),
      totalCost: results.reduce((sum, r) => sum + r.result.cost, 0),
      totalTime: Math.max(...results.map(r => r.result.executionTime)),
      overallQuality: results.reduce((sum, r) => sum + r.result.quality, 0) / results.length,
      insights: this._extractInsights(results)
    };
    
    return synthesis;
  }

  /**
   * Extract key insights from multi-agent results
   */
  _extractInsights(results) {
    const insights = [];
    
    // Cost analysis
    const totalCost = results.reduce((sum, r) => sum + r.result.cost, 0);
    const avgCost = totalCost / results.length;
    insights.push(`Average cost per subtask: $${avgCost.toFixed(3)}`);
    
    // Quality analysis
    const avgQuality = results.reduce((sum, r) => sum + r.result.quality, 0) / results.length;
    insights.push(`Average quality score: ${(avgQuality * 100).toFixed(1)}%`);
    
    // Agent participation
    const agentCounts = {};
    results.forEach(r => {
      agentCounts[r.subtask.agent] = (agentCounts[r.subtask.agent] || 0) + 1;
    });
    insights.push(`Agents involved: ${Object.entries(agentCounts).map(([a, c]) => `${a}(${c})`).join(', ')}`);
    
    return insights;
  }

  /**
   * Get fallback agent for overloaded specialist
   */
  async _getFallbackAgent(agentId) {
    const fallbackChain = this.profiles.fallback_chains[agentId];
    if (!fallbackChain || fallbackChain.length === 0) return null;
    
    for (const fallbackId of fallbackChain) {
      const currentLoad = this.activeAgents.get(fallbackId) || 0;
      const maxLoad = this.profiles.profiles[fallbackId].maxConcurrent;
      
      if (currentLoad < maxLoad) {
        return this.profiles.profiles[fallbackId];
      }
    }
    
    return null;
  }

  /**
   * Estimate task cost
   */
  _estimateCost(task, specialist) {
    // Simple heuristic: ~1000 tokens per task
    const estimatedTokens = 1000;
    const costPerToken = specialist.costPerMToken / 1000000;
    return estimatedTokens * costPerToken;
  }

  /**
   * Mock agent execution (replace with real agent spawning in production)
   */
  async _mockAgentExecution(specialist, task, taskId, context = {}) {
    const startTime = Date.now();
    
    // Simulate execution time
    const executionTime = Math.random() * 3000 + 2000; // 2-5 seconds
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    const result = {
      taskId,
      agent: specialist.id,
      output: `[${specialist.name}] Completed: ${task.substring(0, 50)}...`,
      quality: specialist.qualityScore + (Math.random() * 0.05 - 0.025), // ±2.5%
      executionTime: Math.round(executionTime),
      cost: this._estimateCost(task, specialist),
      context: Object.keys(context).length > 0 ? 'Used previous results' : 'Fresh execution'
    };
    
    return result;
  }

  /**
   * Get system status
   */
  async getStatus() {
    const activeTasks = await this.coordination.getActiveTasks();
    const loadState = await this.coordination.getLoadState();
    
    return {
      activeTasks: activeTasks.length,
      agents: Object.entries(this.profiles.profiles).map(([id, profile]) => ({
        id,
        name: profile.name,
        load: loadState[id] || { active: 0, capacity: profile.maxConcurrent, utilization: '0%' }
      }))
    };
  }
}

module.exports = MultiAgentOrchestrator;
