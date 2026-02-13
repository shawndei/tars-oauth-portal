/**
 * Agent Router - Integrates Skill Discovery with Multi-Agent Orchestration
 * 
 * Provides intelligent task routing based on:
 * - Skill discovery and recommendations
 * - Agent capability matching
 * - Load balancing
 * - Dependency resolution
 * - Dynamic skill chain composition
 */

class AgentRouter {
  constructor(skillDiscovery, agentProfiles) {
    this.skillDiscovery = skillDiscovery;
    this.agentProfiles = agentProfiles || this.getDefaultAgents();
    this.taskRegistry = new Map();
    this.agentLoadState = new Map();
    this.routingCache = new Map();
    this.initializeLoadState();
  }

  /**
   * Get default agent profiles from multi-agent system
   */
  getDefaultAgents() {
    return {
      'researcher': {
        id: 'researcher-001',
        role: 'researcher',
        model: 'anthropic/claude-haiku-4-5',
        thinking: 'medium',
        capabilities: ['research', 'search', 'find', 'gather', 'investigate'],
        maxConcurrent: 3,
        costPerMToken: 1,
        qualityScore: 0.94
      },
      'coder': {
        id: 'coder-001',
        role: 'coder',
        model: 'anthropic/claude-sonnet-4-5',
        thinking: 'high',
        capabilities: ['code', 'build', 'debug', 'implement', 'refactor'],
        maxConcurrent: 2,
        costPerMToken: 15,
        qualityScore: 0.97
      },
      'analyst': {
        id: 'analyst-001',
        role: 'analyst',
        model: 'anthropic/claude-haiku-4-5',
        thinking: 'medium',
        capabilities: ['analyze', 'trends', 'patterns', 'metrics', 'statistics'],
        maxConcurrent: 3,
        costPerMToken: 1,
        qualityScore: 0.93
      },
      'writer': {
        id: 'writer-001',
        role: 'writer',
        model: 'anthropic/claude-sonnet-4-5',
        thinking: 'low',
        capabilities: ['write', 'document', 'compose', 'create', 'polish'],
        maxConcurrent: 2,
        costPerMToken: 15,
        qualityScore: 0.97
      },
      'coordinator': {
        id: 'coordinator-001',
        role: 'coordinator',
        model: 'anthropic/claude-sonnet-4-5',
        thinking: 'high',
        capabilities: ['coordinate', 'decompose', 'orchestrate'],
        maxConcurrent: 1,
        costPerMToken: 15,
        qualityScore: 0.99
      }
    };
  }

  /**
   * Initialize agent load tracking
   */
  initializeLoadState() {
    for (const [role, profile] of Object.entries(this.agentProfiles)) {
      this.agentLoadState.set(role, {
        active: 0,
        completed: 0,
        failed: 0,
        avgDuration: 0,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  /**
   * Route a task to the best agent(s)
   * 
   * Strategy:
   * 1. Check cache for recent routing decisions
   * 2. Get skill recommendations
   * 3. Map skills to agents
   * 4. Check load balancing
   * 5. Handle complex tasks via coordinator
   * 6. Return routing decision
   */
  async route(task, options = {}) {
    const {
      decompose = true,
      allowParallel = false,
      preferredRole = null,
      maxAgents = 1,
      timeout = 30000
    } = options;

    // Check routing cache
    const cacheKey = this._getCacheKey(task, options);
    const cached = this.routingCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 min cache
      return cached.routing;
    }

    // Step 1: Get skill recommendations
    const recommendations = this.skillDiscovery.recommend(task, {
      limit: 10,
      minScore: 0.5,
      includeReasoning: true
    });

    if (recommendations.length === 0) {
      return {
        status: 'no-match',
        task,
        error: 'No matching skills found'
      };
    }

    // Step 2: Check if task requires decomposition (multiple skills needed)
    const needsDecomposition = recommendations.length > 1 && decompose;

    if (needsDecomposition) {
      return this._routeComplex(task, recommendations, maxAgents, allowParallel);
    }

    // Step 3: Route to single best agent
    const bestSkill = recommendations[0];
    const routing = this._routeSimple(task, bestSkill, preferredRole);

    // Cache result
    this.routingCache.set(cacheKey, {
      routing,
      timestamp: Date.now()
    });

    return routing;
  }

  /**
   * Route simple task to single best agent
   */
  _routeSimple(task, skillRec, preferredRole) {
    const skill = skillRec.skill;
    const skillName = skill.name;

    // Determine agent role based on skill
    let targetRole = preferredRole || this._mapSkillToAgent(skillName);

    // Check agent availability
    const agent = this._selectAgent(targetRole);

    if (!agent) {
      return {
        status: 'no-capacity',
        task,
        skill: skillName,
        targetRole,
        error: `No available agents with role: ${targetRole}`
      };
    }

    const routing = {
      status: 'routed',
      task,
      type: 'simple',
      routing: {
        skillName: skillName,
        skillScore: skillRec.score,
        skillReasoning: skillRec.reasoning,
        agent: agent.role,
        agentId: agent.id,
        estimatedDuration: this._estimateDuration(skill),
        priority: this._calculatePriority(skillRec.score)
      }
    };

    // Update load
    this._updateAgentLoad(agent.role, 1);

    return routing;
  }

  /**
   * Route complex task requiring decomposition
   */
  _routeComplex(task, recommendations, maxAgents, allowParallel) {
    // Compose skill chain
    const chain = this.skillDiscovery.composeChain(task, {
      maxDepth: 5,
      allowParallel,
      optimizeForPerformance: true
    });

    if (chain.feasibility < 0.5) {
      return {
        status: 'low-feasibility',
        task,
        chain,
        error: 'Chain feasibility too low'
      };
    }

    // Map chain to execution plan with agents
    const executionPlan = this._mapChainToAgents(chain, maxAgents);

    const routing = {
      status: 'routed',
      task,
      type: 'complex',
      routing: {
        chain: chain.goal,
        subTasks: chain.subTasks.length,
        feasibility: chain.feasibility,
        executionPlan,
        totalDuration: this._estimateChainDuration(chain),
        parallelGroups: chain.parallelGroups,
        dependencies: this._extractDependencies(chain),
        priority: this._calculateComplexityPriority(chain)
      }
    };

    // Update loads for all assigned agents
    for (const phase of executionPlan.phases) {
      for (const step of phase.steps) {
        if (step.agent) {
          this._updateAgentLoad(step.agent.role, 1);
        }
      }
    }

    return routing;
  }

  /**
   * Map skill chain to agents with load balancing
   */
  _mapChainToAgents(chain, maxAgents) {
    const executionPlan = {
      phases: [],
      agentAssignments: [],
      dependencies: []
    };

    // Process each phase
    for (let phaseIdx = 0; phaseIdx < chain.executionPlan.phases.length; phaseIdx++) {
      const phase = chain.executionPlan.phases[phaseIdx];
      const phasePlan = {
        type: phase.type,
        steps: [],
        parallelizable: phase.type === 'parallel'
      };

      for (const step of phase.steps) {
        const skillName = step.skill;
        const targetRole = this._mapSkillToAgent(skillName);
        const agent = this._selectAgent(targetRole);

        if (agent) {
          phasePlan.steps.push({
            id: step.id,
            skill: skillName,
            task: step.task,
            status: step.status,
            agent: {
              role: agent.role,
              id: agent.id
            }
          });

          // Track assignment
          executionPlan.agentAssignments.push({
            stepId: step.id,
            agentRole: agent.role,
            agentId: agent.id,
            skill: skillName
          });
        } else {
          phasePlan.steps.push({
            id: step.id,
            skill: skillName,
            task: step.task,
            status: 'unassigned',
            error: `No available agents for role: ${targetRole}`
          });
        }
      }

      executionPlan.phases.push(phasePlan);
    }

    return executionPlan;
  }

  /**
   * Map skill name to agent role
   */
  _mapSkillToAgent(skillName) {
    // Extract action verbs from skill name/capabilities
    const actionMap = {
      'research': 'researcher',
      'search': 'researcher',
      'find': 'researcher',
      'gather': 'researcher',
      'investigate': 'researcher',
      'code': 'coder',
      'build': 'coder',
      'debug': 'coder',
      'implement': 'coder',
      'refactor': 'coder',
      'analyze': 'analyst',
      'pattern': 'analyst',
      'metric': 'analyst',
      'statistic': 'analyst',
      'trend': 'analyst',
      'write': 'writer',
      'document': 'writer',
      'compose': 'writer',
      'create': 'writer',
      'polish': 'writer'
    };

    // Check skill name for action verbs
    for (const [action, role] of Object.entries(actionMap)) {
      if (skillName.toLowerCase().includes(action)) {
        return role;
      }
    }

    // Default to analyst
    return 'analyst';
  }

  /**
   * Select best available agent for role
   */
  _selectAgent(role) {
    const profile = this.agentProfiles[role];
    if (!profile) return null;

    const load = this.agentLoadState.get(role);
    if (load.active >= profile.maxConcurrent) {
      return null; // At capacity
    }

    return profile;
  }

  /**
   * Update agent load state
   */
  _updateAgentLoad(role, increment = 1) {
    const load = this.agentLoadState.get(role);
    if (load) {
      load.active += increment;
      load.lastUpdated = new Date().toISOString();
    }
  }

  /**
   * Report task completion and update load
   */
  reportTaskCompletion(role, duration, success = true) {
    const load = this.agentLoadState.get(role);
    if (!load) return;

    load.active = Math.max(0, load.active - 1);

    if (success) {
      load.completed++;
      // Update average duration
      load.avgDuration = (load.avgDuration + duration) / 2;
    } else {
      load.failed++;
    }

    load.lastUpdated = new Date().toISOString();
  }

  /**
   * Estimate duration for a skill
   */
  _estimateDuration(skill) {
    // Base estimates by complexity
    const complexity = skill.complexity || 5;
    
    // Simple: 5s, Medium: 15s, Complex: 30s
    const baseEstimate = {
      1: 5,
      2: 5,
      3: 10,
      4: 15,
      5: 20,
      6: 25,
      7: 30,
      8: 40,
      9: 60,
      10: 90
    };

    return baseEstimate[Math.min(10, Math.max(1, complexity))] || 20;
  }

  /**
   * Estimate total duration for skill chain
   */
  _estimateChainDuration(chain) {
    let totalDuration = 0;

    for (const phase of chain.executionPlan.phases) {
      if (phase.type === 'sequential') {
        // Sequential: sum all steps
        for (const step of phase.steps) {
          // Estimate based on step type
          totalDuration += 10; // Default 10s per step
        }
      } else {
        // Parallel: max of all steps
        totalDuration += 10; // Default 10s for parallel group
      }
    }

    return totalDuration;
  }

  /**
   * Calculate priority based on skill score
   */
  _calculatePriority(score) {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Calculate priority based on chain complexity
   */
  _calculateComplexityPriority(chain) {
    const stepCount = chain.executionPlan.totalSteps;
    const feasibility = chain.feasibility;

    if (stepCount > 5 || feasibility < 0.7) return 'high';
    if (stepCount > 2) return 'medium';
    return 'low';
  }

  /**
   * Extract dependencies from chain
   */
  _extractDependencies(chain) {
    const deps = [];
    
    // Map phase dependencies
    for (let i = 0; i < chain.executionPlan.phases.length; i++) {
      const phase = chain.executionPlan.phases[i];
      
      if (i > 0 && phase.type === 'sequential') {
        // This phase depends on previous
        deps.push({
          dependsOn: i - 1,
          phase: i,
          type: 'sequential'
        });
      }
    }

    return deps;
  }

  /**
   * Get routing decision cache key
   */
  _getCacheKey(task, options) {
    // Simple hash of task + options
    const str = JSON.stringify({ task, options });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `routing-${Math.abs(hash)}`;
  }

  /**
   * Clear routing cache
   */
  clearCache() {
    this.routingCache.clear();
  }

  /**
   * Get current load state
   */
  getLoadState() {
    const state = {};
    for (const [role, load] of this.agentLoadState) {
      state[role] = { ...load };
    }
    return state;
  }

  /**
   * Get routing statistics
   */
  getStats() {
    const stats = {
      totalRouted: this.taskRegistry.size,
      agentLoad: this.getLoadState(),
      cacheSize: this.routingCache.size,
      agentProfiles: Object.keys(this.agentProfiles)
    };

    for (const [role, load] of this.agentLoadState) {
      const total = load.completed + load.failed;
      stats[`${role}SuccessRate`] = total > 0 ? (load.completed / total * 100).toFixed(1) : 0;
    }

    return stats;
  }
}

module.exports = { AgentRouter };
