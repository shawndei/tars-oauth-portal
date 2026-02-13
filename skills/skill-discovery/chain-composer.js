/**
 * Skill Chain Composer
 * 
 * Dynamically composes chains of skills to accomplish complex goals
 */

class ChainComposer {
  constructor() {
    this.maxChainLength = 10;
  }

  /**
   * Compose a skill chain to accomplish a goal
   */
  compose(goal, skillRegistry, dependencyResolver, options = {}) {
    const {
      maxDepth = 5,
      allowParallel = true,
      optimizeForPerformance = true
    } = options;
    
    console.log(`🔗 Composing skill chain for goal: "${goal}"`);
    
    // Step 1: Break down goal into sub-tasks
    const subTasks = this.decomposeGoal(goal);
    console.log(`   Identified ${subTasks.length} sub-tasks`);
    
    // Step 2: Find skills for each sub-task
    const steps = [];
    for (const subTask of subTasks) {
      const matchedSkills = this.findSkillsForTask(subTask, skillRegistry);
      
      if (matchedSkills.length === 0) {
        console.warn(`   ⚠️  No skills found for: "${subTask.description}"`);
        steps.push({
          task: subTask,
          skills: [],
          status: 'missing'
        });
      } else {
        const bestSkill = matchedSkills[0];
        steps.push({
          task: subTask,
          skill: bestSkill.skill,
          score: bestSkill.score,
          status: 'matched'
        });
      }
    }
    
    // Step 3: Resolve dependencies and order steps
    const orderedSteps = this.orderSteps(steps, dependencyResolver);
    
    // Step 4: Identify parallel opportunities
    let parallelGroups = [];
    if (allowParallel) {
      parallelGroups = this.identifyParallelSteps(orderedSteps, dependencyResolver);
    }
    
    // Step 5: Optimize chain
    let optimizedChain = orderedSteps;
    if (optimizeForPerformance) {
      optimizedChain = this.optimizeChain(orderedSteps, dependencyResolver);
    }
    
    // Step 6: Build execution plan
    const executionPlan = this.buildExecutionPlan(optimizedChain, parallelGroups);
    
    return {
      goal: goal,
      subTasks: subTasks,
      steps: optimizedChain,
      parallelGroups: parallelGroups,
      executionPlan: executionPlan,
      estimatedDuration: this.estimateDuration(executionPlan),
      feasibility: this.calculateFeasibility(steps),
      missingCapabilities: steps.filter(s => s.status === 'missing').map(s => s.task.description)
    };
  }

  /**
   * Decompose goal into sub-tasks
   */
  decomposeGoal(goal) {
    const subTasks = [];
    
    // Simple heuristic-based decomposition
    // In a real implementation, this could use LLM for smarter decomposition
    
    // Check for common patterns
    
    // Pattern: "A and B"
    if (goal.match(/\band\b/i)) {
      const parts = goal.split(/\band\b/i);
      for (let i = 0; i < parts.length; i++) {
        subTasks.push({
          order: i,
          description: parts[i].trim(),
          type: 'parallel'
        });
      }
      return subTasks;
    }
    
    // Pattern: "A then B"
    if (goal.match(/\bthen\b/i)) {
      const parts = goal.split(/\bthen\b/i);
      for (let i = 0; i < parts.length; i++) {
        subTasks.push({
          order: i,
          description: parts[i].trim(),
          type: 'sequential'
        });
      }
      return subTasks;
    }
    
    // Pattern: multi-step process (numbered or bulleted)
    const stepMatches = goal.matchAll(/(?:^|\n)[\s]*(?:\d+\.|[-*])\s+(.+)/g);
    let stepIndex = 0;
    for (const match of stepMatches) {
      subTasks.push({
        order: stepIndex++,
        description: match[1].trim(),
        type: 'sequential'
      });
    }
    
    if (subTasks.length > 0) {
      return subTasks;
    }
    
    // Pattern: "X from Y" or "X using Y"
    if (goal.match(/\b(?:from|using|with)\b/i)) {
      const parts = goal.split(/\b(?:from|using|with)\b/i);
      
      subTasks.push({
        order: 0,
        description: `Retrieve data ${parts[1] ? 'from ' + parts[1].trim() : ''}`,
        type: 'sequential'
      });
      
      subTasks.push({
        order: 1,
        description: parts[0].trim(),
        type: 'sequential'
      });
      
      return subTasks;
    }
    
    // Default: treat as single task
    subTasks.push({
      order: 0,
      description: goal,
      type: 'single'
    });
    
    return subTasks;
  }

  /**
   * Find skills that can accomplish a task
   */
  findSkillsForTask(task, skillRegistry) {
    const matches = [];
    const taskLower = task.description.toLowerCase();
    
    for (const [skillName, skill] of Object.entries(skillRegistry)) {
      let score = 0;
      
      // Check name match
      if (taskLower.includes(skillName.toLowerCase())) {
        score += 0.5;
      }
      
      // Check description match
      if (skill.description) {
        const descLower = skill.description.toLowerCase();
        const taskWords = taskLower.split(/\s+/);
        const matchingWords = taskWords.filter(word => 
          word.length > 3 && descLower.includes(word)
        );
        score += (matchingWords.length / taskWords.length) * 0.3;
      }
      
      // Check capabilities match
      if (skill.capabilities) {
        for (const cap of skill.capabilities) {
          const capLower = cap.toLowerCase();
          if (taskLower.includes(capLower) || capLower.includes(taskLower)) {
            score += 0.2;
          }
        }
      }
      
      // Check tags match
      if (skill.tags) {
        for (const tag of skill.tags) {
          const tagLower = tag.toLowerCase();
          if (taskLower.includes(tagLower)) {
            score += 0.1;
          }
        }
      }
      
      // Boost production-ready skills
      if (skill.status === 'production') {
        score *= 1.2;
      }
      
      if (score > 0.2) {
        matches.push({ skill, score });
      }
    }
    
    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    
    return matches;
  }

  /**
   * Order steps based on dependencies
   */
  orderSteps(steps, dependencyResolver) {
    // Build step dependency graph
    const stepGraph = new Map();
    
    for (let i = 0; i < steps.length; i++) {
      stepGraph.set(i, new Set());
    }
    
    // Add dependencies based on skill dependencies
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      if (!step.skill) continue;
      
      const deps = dependencyResolver.getSkillDependencies(step.skill);
      
      // Find steps that provide these dependencies
      for (let j = 0; j < steps.length; j++) {
        if (i === j) continue;
        
        const otherStep = steps[j];
        if (!otherStep.skill) continue;
        
        if (deps.includes(otherStep.skill.name)) {
          stepGraph.get(i).add(j);
        }
      }
    }
    
    // Topological sort
    const sorted = [];
    const visited = new Set();
    
    const visit = (index) => {
      if (visited.has(index)) return;
      
      visited.add(index);
      
      const deps = stepGraph.get(index);
      for (const dep of deps) {
        visit(dep);
      }
      
      sorted.push(steps[index]);
    };
    
    for (let i = 0; i < steps.length; i++) {
      visit(i);
    }
    
    return sorted;
  }

  /**
   * Identify steps that can run in parallel
   */
  identifyParallelSteps(steps, dependencyResolver) {
    const parallelGroups = [];
    const processed = new Set();
    
    for (let i = 0; i < steps.length; i++) {
      if (processed.has(i)) continue;
      
      const group = [i];
      processed.add(i);
      
      // Find other steps that can run in parallel
      for (let j = i + 1; j < steps.length; j++) {
        if (processed.has(j)) continue;
        
        // Check if j has no dependency on any step in group
        let canParallel = true;
        
        for (const groupIndex of group) {
          if (this.hasDependency(steps[j], steps[groupIndex], dependencyResolver)) {
            canParallel = false;
            break;
          }
        }
        
        if (canParallel) {
          group.push(j);
          processed.add(j);
        }
      }
      
      if (group.length > 1) {
        parallelGroups.push({
          stepIndices: group,
          steps: group.map(idx => steps[idx])
        });
      }
    }
    
    return parallelGroups;
  }

  /**
   * Check if stepA depends on stepB
   */
  hasDependency(stepA, stepB, dependencyResolver) {
    if (!stepA.skill || !stepB.skill) return false;
    
    const deps = dependencyResolver.getSkillDependencies(stepA.skill);
    return deps.includes(stepB.skill.name);
  }

  /**
   * Optimize chain for performance
   */
  optimizeChain(steps, dependencyResolver) {
    // Remove redundant steps
    const optimized = [];
    const seen = new Set();
    
    for (const step of steps) {
      if (!step.skill) {
        optimized.push(step);
        continue;
      }
      
      // Skip if we already have this skill in the chain
      if (seen.has(step.skill.name)) {
        continue;
      }
      
      seen.add(step.skill.name);
      optimized.push(step);
    }
    
    return optimized;
  }

  /**
   * Build execution plan with timing
   */
  buildExecutionPlan(steps, parallelGroups) {
    const plan = {
      phases: [],
      totalSteps: steps.length,
      parallelSteps: 0
    };
    
    const processed = new Set();
    
    // Add parallel groups first
    for (const group of parallelGroups) {
      const phase = {
        type: 'parallel',
        steps: group.steps.map((step, idx) => ({
          id: group.stepIndices[idx],
          skill: step.skill ? step.skill.name : null,
          task: step.task.description,
          status: step.status
        }))
      };
      
      plan.phases.push(phase);
      plan.parallelSteps += group.steps.length;
      
      for (const idx of group.stepIndices) {
        processed.add(idx);
      }
    }
    
    // Add remaining sequential steps
    for (let i = 0; i < steps.length; i++) {
      if (processed.has(i)) continue;
      
      const step = steps[i];
      
      const phase = {
        type: 'sequential',
        steps: [{
          id: i,
          skill: step.skill ? step.skill.name : null,
          task: step.task.description,
          status: step.status
        }]
      };
      
      plan.phases.push(phase);
    }
    
    // Sort phases by dependency order
    plan.phases.sort((a, b) => {
      const aMinId = Math.min(...a.steps.map(s => s.id));
      const bMinId = Math.min(...b.steps.map(s => s.id));
      return aMinId - bMinId;
    });
    
    return plan;
  }

  /**
   * Estimate duration of execution plan (in seconds)
   */
  estimateDuration(plan) {
    let totalDuration = 0;
    
    for (const phase of plan.phases) {
      if (phase.type === 'parallel') {
        // Parallel steps: use max duration
        const durations = phase.steps.map(s => this.estimateStepDuration(s));
        totalDuration += Math.max(...durations);
      } else {
        // Sequential steps: sum durations
        for (const step of phase.steps) {
          totalDuration += this.estimateStepDuration(step);
        }
      }
    }
    
    return Math.round(totalDuration);
  }

  /**
   * Estimate duration of a single step (in seconds)
   */
  estimateStepDuration(step) {
    // Simple heuristic: 30 seconds per step
    // In real implementation, could look at skill metadata
    return 30;
  }

  /**
   * Calculate feasibility score (0-1)
   */
  calculateFeasibility(steps) {
    const matched = steps.filter(s => s.status === 'matched').length;
    const total = steps.length;
    
    if (total === 0) return 0;
    
    return matched / total;
  }
}

module.exports = { ChainComposer };
