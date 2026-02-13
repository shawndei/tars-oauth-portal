/**
 * Autonomous Task Decomposition Engine
 * Breaks high-level goals into executable sub-tasks
 */

class TaskDecomposer {
  constructor() {
    this.maxSubTasks = 8;
    this.minSubTasks = 3;
  }

  /**
   * Decompose a high-level goal into sub-tasks
   * @param {string} goal - High-level goal description
   * @param {object} context - Additional context (user preferences, constraints)
   * @returns {Array} List of sub-tasks with metadata
   */
  async decompose(goal, context = {}) {
    // Decomposition prompt for LLM
    const prompt = `
You are an expert task planner. Break down this goal into ${this.minSubTasks}-${this.maxSubTasks} concrete, executable sub-tasks.

GOAL: ${goal}

CONTEXT:
- Available tools: browser, exec, read, write, web_search, web_fetch, message
- Execution environment: Windows NucBoxG3, PowerShell
- User preferences: ${JSON.stringify(context.preferences || {})}

REQUIREMENTS FOR EACH SUB-TASK:
1. Must be concrete and specific (not vague)
2. Must be measurable (clear success criteria)
3. Must be executable with available tools
4. Must include realistic time estimate
5. Must specify expected output

OUTPUT FORMAT (JSON):
{
  "tasks": [
    {
      "id": 1,
      "action": "Specific action description",
      "tool": "primary tool to use (browser/exec/web_search/etc)",
      "expectedDuration": "time in minutes",
      "successCriteria": "How to know it succeeded",
      "expectedOutput": "What artifact/result is produced",
      "dependencies": [] // IDs of tasks that must complete first
    }
  ],
  "totalEstimate": "total minutes",
  "criticalPath": [1, 2, 3] // sequence for optimal execution
}

EXAMPLE:
Goal: "Research top 5 AI frameworks and create comparison table"
Output:
{
  "tasks": [
    {
      "id": 1,
      "action": "Search for 'top AI frameworks 2026' and identify 5 leading frameworks",
      "tool": "web_search",
      "expectedDuration": "5",
      "successCriteria": "List of 5 framework names with URLs",
      "expectedOutput": "frameworks.json with [name, url, description]",
      "dependencies": []
    },
    {
      "id": 2,
      "action": "For each framework, visit official site and extract key features",
      "tool": "browser",
      "expectedDuration": "20",
      "successCriteria": "Features extracted for all 5 frameworks",
      "expectedOutput": "features.json",
      "dependencies": [1]
    },
    {
      "id": 3,
      "action": "Create markdown comparison table with columns: Name, Features, Pros, Cons, Use Cases",
      "tool": "write",
      "expectedDuration": "10",
      "successCriteria": "Table is complete, formatted, readable",
      "expectedOutput": "comparison-table.md",
      "dependencies": [2]
    }
  ],
  "totalEstimate": "35",
  "criticalPath": [1, 2, 3]
}

Now decompose this goal:
`;

    // In a real implementation, this would call the LLM via OpenClaw's model system
    // For now, return the structure that would be populated
    return {
      goal,
      decomposed: true,
      timestamp: new Date().toISOString(),
      tasks: [], // Would be populated by LLM response
      totalEstimate: 0,
      criticalPath: []
    };
  }

  /**
   * Validate a sub-task meets quality criteria
   */
  validateTask(task) {
    const errors = [];
    
    if (!task.action || task.action.length < 10) {
      errors.push("Action must be specific and detailed");
    }
    
    if (!task.tool || !['browser', 'exec', 'web_search', 'web_fetch', 'read', 'write', 'message'].includes(task.tool)) {
      errors.push("Must specify valid tool");
    }
    
    if (!task.expectedDuration || isNaN(parseInt(task.expectedDuration))) {
      errors.push("Must include realistic time estimate");
    }
    
    if (!task.successCriteria) {
      errors.push("Must define clear success criteria");
    }
    
    if (!task.expectedOutput) {
      errors.push("Must specify expected output/artifact");
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create execution plan from decomposed tasks
   */
  createExecutionPlan(tasks) {
    // Topological sort for dependency resolution
    const sorted = [];
    const visited = new Set();
    
    const visit = (taskId) => {
      if (visited.has(taskId)) return;
      
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      // Visit dependencies first
      for (const depId of task.dependencies || []) {
        visit(depId);
      }
      
      visited.add(taskId);
      sorted.push(task);
    };
    
    // Visit all tasks
    tasks.forEach(task => visit(task.id));
    
    return {
      sequence: sorted,
      parallelizable: this.findParallelGroups(sorted),
      estimatedTime: sorted.reduce((sum, t) => sum + parseInt(t.expectedDuration || 0), 0)
    };
  }

  /**
   * Find tasks that can run in parallel
   */
  findParallelGroups(tasks) {
    const groups = [];
    const processed = new Set();
    
    for (const task of tasks) {
      if (processed.has(task.id)) continue;
      
      const group = [task];
      const deps = new Set(task.dependencies || []);
      
      // Find tasks with same dependencies
      for (const other of tasks) {
        if (other.id === task.id || processed.has(other.id)) continue;
        
        const otherDeps = new Set(other.dependencies || []);
        if (this.setsEqual(deps, otherDeps)) {
          group.push(other);
        }
      }
      
      group.forEach(t => processed.add(t.id));
      groups.push(group);
    }
    
    return groups;
  }

  setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }
}

module.exports = TaskDecomposer;
