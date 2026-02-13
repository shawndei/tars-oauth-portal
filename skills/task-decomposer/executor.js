/**
 * Task Executor - Executes decomposed sub-tasks sequentially
 */

const fs = require('fs').promises;
const path = require('path');

class TaskExecutor {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot || process.env.OPENCLAW_WORKSPACE || './';
    this.executionLog = [];
  }

  /**
   * Execute a sequence of tasks with validation
   * @param {Array} tasks - Ordered list of sub-tasks
   * @param {object} options - Execution options
   * @returns {object} Execution results
   */
  async execute(tasks, options = {}) {
    const results = {
      goal: options.goal || 'Unknown',
      startTime: new Date().toISOString(),
      tasks: [],
      completed: 0,
      failed: 0,
      status: 'running'
    };

    for (const task of tasks) {
      const taskResult = await this.executeTask(task, options);
      results.tasks.push(taskResult);

      if (taskResult.success) {
        results.completed++;
      } else {
        results.failed++;
        
        // Stop on first failure unless continueOnError is set
        if (!options.continueOnError) {
          results.status = 'failed';
          results.failedAt = task.id;
          results.error = taskResult.error;
          break;
        }
      }
    }

    if (results.failed === 0) {
      results.status = 'completed';
    }

    results.endTime = new Date().toISOString();
    results.duration = this.calculateDuration(results.startTime, results.endTime);

    // Save execution log
    await this.saveExecutionLog(results);

    return results;
  }

  /**
   * Execute a single sub-task
   */
  async executeTask(task, options) {
    const result = {
      taskId: task.id,
      action: task.action,
      tool: task.tool,
      startTime: new Date().toISOString(),
      success: false,
      output: null,
      error: null
    };

    try {
      // Validate task before execution
      if (!this.validateTaskExecutability(task)) {
        throw new Error(`Task ${task.id} failed validation: missing required fields`);
      }

      // Execute based on tool type
      switch (task.tool) {
        case 'web_search':
          result.output = await this.executeWebSearch(task);
          break;
        case 'browser':
          result.output = await this.executeBrowser(task);
          break;
        case 'web_fetch':
          result.output = await this.executeWebFetch(task);
          break;
        case 'read':
          result.output = await this.executeRead(task);
          break;
        case 'write':
          result.output = await this.executeWrite(task);
          break;
        case 'exec':
          result.output = await this.executeCommand(task);
          break;
        default:
          throw new Error(`Unknown tool: ${task.tool}`);
      }

      // Validate output against success criteria
      if (this.validateOutput(result.output, task.successCriteria)) {
        result.success = true;
      } else {
        throw new Error(`Output did not meet success criteria: ${task.successCriteria}`);
      }

    } catch (error) {
      result.error = error.message;
      result.success = false;
    }

    result.endTime = new Date().toISOString();
    result.duration = this.calculateDuration(result.startTime, result.endTime);

    this.executionLog.push(result);

    return result;
  }

  /**
   * Validate task has all required fields for execution
   */
  validateTaskExecutability(task) {
    return task.action && task.tool && task.successCriteria;
  }

  /**
   * Execute web search task
   */
  async executeWebSearch(task) {
    // In real implementation, this would call OpenClaw's web_search tool
    // For now, return placeholder structure
    return {
      type: 'web_search',
      query: task.action,
      results: [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute browser automation task
   */
  async executeBrowser(task) {
    // In real implementation, this would call OpenClaw's browser tool
    return {
      type: 'browser',
      action: task.action,
      result: 'Browser task executed',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute web fetch task
   */
  async executeWebFetch(task) {
    // In real implementation, this would call OpenClaw's web_fetch tool
    return {
      type: 'web_fetch',
      url: task.action,
      content: '',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute file read task
   */
  async executeRead(task) {
    const filePath = this.extractFilePath(task.action);
    const content = await fs.readFile(path.join(this.workspaceRoot, filePath), 'utf-8');
    return {
      type: 'read',
      filePath,
      content,
      size: content.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute file write task
   */
  async executeWrite(task) {
    const { filePath, content } = this.extractWriteParams(task.action, task.expectedOutput);
    await fs.writeFile(path.join(this.workspaceRoot, filePath), content, 'utf-8');
    return {
      type: 'write',
      filePath,
      size: content.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute shell command task
   */
  async executeCommand(task) {
    // In real implementation, this would call OpenClaw's exec tool
    return {
      type: 'exec',
      command: task.action,
      result: 'Command executed',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate output meets success criteria
   */
  validateOutput(output, criteria) {
    // Basic validation - in production would use LLM to evaluate
    return output !== null && output !== undefined;
  }

  /**
   * Extract file path from action description
   */
  extractFilePath(action) {
    // Simple heuristic - in production would use smarter parsing
    const match = action.match(/['"](.*?\.[\w]+)['"]/);
    return match ? match[1] : 'output.txt';
  }

  /**
   * Extract write parameters from action
   */
  extractWriteParams(action, expectedOutput) {
    return {
      filePath: expectedOutput || 'output.txt',
      content: action // Would be parsed more intelligently in production
    };
  }

  /**
   * Calculate duration between two ISO timestamps
   */
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const ms = end - start;
    return {
      milliseconds: ms,
      seconds: Math.floor(ms / 1000),
      minutes: Math.floor(ms / 1000 / 60)
    };
  }

  /**
   * Save execution log to file
   */
  async saveExecutionLog(results) {
    const logPath = path.join(this.workspaceRoot, 'logs', 'task-executions.jsonl');
    const logEntry = JSON.stringify(results) + '\n';
    
    try {
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, logEntry, 'utf-8');
    } catch (error) {
      console.error('Failed to save execution log:', error.message);
    }
  }
}

module.exports = TaskExecutor;
