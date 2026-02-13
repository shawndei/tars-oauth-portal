/**
 * Coordination Protocol
 * Handles inter-agent communication and message passing
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CoordinationProtocol {
  constructor(workspaceDir) {
    this.workspaceDir = workspaceDir || process.env.OPENCLAW_WORKSPACE || './';
    this.sharedMemoryDir = path.join(this.workspaceDir, 'memory', 'shared');
    this.taskRegistryPath = path.join(this.sharedMemoryDir, 'task-registry.json');
    this.resultsCachePath = path.join(this.sharedMemoryDir, 'results-cache.json');
    this.coordinationPath = path.join(this.sharedMemoryDir, 'coordination.json');
    this.loadStatePath = path.join(this.sharedMemoryDir, 'load-state.json');
  }

  /**
   * Initialize shared memory structure
   */
  async initialize() {
    await fs.mkdir(this.sharedMemoryDir, { recursive: true });
    
    // Initialize files if they don't exist
    await this._ensureFile(this.taskRegistryPath, { tasks: {}, activeCount: 0 });
    await this._ensureFile(this.resultsCachePath, { results: {}, totalCached: 0 });
    await this._ensureFile(this.coordinationPath, { messages: [], inbox: {} });
    await this._ensureFile(this.loadStatePath, { agents: {} });
  }

  /**
   * Register a new task
   */
  async registerTask(taskConfig) {
    const taskId = taskConfig.taskId || this._generateTaskId();
    const registry = await this._readJSON(this.taskRegistryPath);
    
    registry.tasks[taskId] = {
      ...taskConfig,
      taskId,
      status: 'registered',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    registry.activeCount = Object.values(registry.tasks)
      .filter(t => ['registered', 'in-progress', 'queued'].includes(t.status))
      .length;
    
    await this._writeJSON(this.taskRegistryPath, registry);
    return taskId;
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId, status, metadata = {}) {
    const registry = await this._readJSON(this.taskRegistryPath);
    
    if (!registry.tasks[taskId]) {
      throw new Error(`Task ${taskId} not found in registry`);
    }
    
    registry.tasks[taskId] = {
      ...registry.tasks[taskId],
      status,
      ...metadata,
      updatedAt: Date.now()
    };
    
    registry.activeCount = Object.values(registry.tasks)
      .filter(t => ['registered', 'in-progress', 'queued'].includes(t.status))
      .length;
    
    await this._writeJSON(this.taskRegistryPath, registry);
  }

  /**
   * Cache task result
   */
  async cacheResult(taskId, result, options = {}) {
    const cache = await this._readJSON(this.resultsCachePath);
    const cacheKey = options.cacheKey || taskId;
    
    cache.results[cacheKey] = {
      taskId,
      result,
      createdAt: Date.now(),
      expiresAt: options.ttl ? Date.now() + options.ttl : null,
      accessCount: 0,
      reusable: options.reusable !== false,
      metadata: options.metadata || {}
    };
    
    cache.totalCached = Object.keys(cache.results).length;
    
    await this._writeJSON(this.resultsCachePath, cache);
    return cacheKey;
  }

  /**
   * Retrieve cached result
   */
  async getCachedResult(cacheKey) {
    const cache = await this._readJSON(this.resultsCachePath);
    const entry = cache.results[cacheKey];
    
    if (!entry) return null;
    
    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      delete cache.results[cacheKey];
      cache.totalCached = Object.keys(cache.results).length;
      await this._writeJSON(this.resultsCachePath, cache);
      return null;
    }
    
    // Increment access count
    entry.accessCount++;
    await this._writeJSON(this.resultsCachePath, cache);
    
    return entry.result;
  }

  /**
   * Send message to agent
   */
  async sendMessage(fromAgent, toAgent, messageType, payload) {
    const coordination = await this._readJSON(this.coordinationPath);
    const messageId = this._generateMessageId();
    
    const message = {
      messageId,
      from: fromAgent,
      to: toAgent,
      type: messageType,
      payload,
      timestamp: Date.now(),
      status: 'sent'
    };
    
    coordination.messages.push(message);
    
    // Add to recipient's inbox
    if (!coordination.inbox[toAgent]) {
      coordination.inbox[toAgent] = [];
    }
    coordination.inbox[toAgent].push(messageId);
    
    await this._writeJSON(this.coordinationPath, coordination);
    return messageId;
  }

  /**
   * Read messages for agent
   */
  async readMessages(agentId, markAsRead = true) {
    const coordination = await this._readJSON(this.coordinationPath);
    const messageIds = coordination.inbox[agentId] || [];
    
    const messages = coordination.messages.filter(m => 
      messageIds.includes(m.messageId) && m.status !== 'read'
    );
    
    if (markAsRead) {
      messages.forEach(msg => {
        const idx = coordination.messages.findIndex(m => m.messageId === msg.messageId);
        if (idx !== -1) {
          coordination.messages[idx].status = 'read';
        }
      });
      await this._writeJSON(this.coordinationPath, coordination);
    }
    
    return messages;
  }

  /**
   * Update agent load state
   */
  async updateLoadState(agentId, loadInfo) {
    const loadState = await this._readJSON(this.loadStatePath);
    
    loadState.agents[agentId] = {
      ...loadInfo,
      updatedAt: Date.now()
    };
    
    await this._writeJSON(this.loadStatePath, loadState);
  }

  /**
   * Get agent load state
   */
  async getLoadState(agentId = null) {
    const loadState = await this._readJSON(this.loadStatePath);
    
    if (agentId) {
      return loadState.agents[agentId] || null;
    }
    
    return loadState.agents;
  }

  /**
   * Get all active tasks
   */
  async getActiveTasks() {
    const registry = await this._readJSON(this.taskRegistryPath);
    return Object.values(registry.tasks).filter(t => 
      ['registered', 'in-progress', 'queued'].includes(t.status)
    );
  }

  /**
   * Get task by ID
   */
  async getTask(taskId) {
    const registry = await this._readJSON(this.taskRegistryPath);
    return registry.tasks[taskId] || null;
  }

  /**
   * Create task chain
   */
  async createTaskChain(chainConfig) {
    const chainId = chainConfig.chainId || this._generateTaskId();
    
    // Register master task
    const masterTaskId = await this.registerTask({
      taskId: chainId,
      type: 'chain',
      chainType: chainConfig.chainType || 'linear',
      totalSteps: chainConfig.tasks.length,
      completedSteps: 0
    });
    
    // Register subtasks
    const subtaskIds = [];
    for (const task of chainConfig.tasks) {
      const subtaskId = await this.registerTask({
        ...task,
        parentTask: masterTaskId,
        dependencies: task.dependencies || []
      });
      subtaskIds.push(subtaskId);
    }
    
    // Update master task with subtask references
    await this.updateTaskStatus(masterTaskId, 'registered', {
      subtasks: subtaskIds
    });
    
    return { chainId: masterTaskId, subtasks: subtaskIds };
  }

  /**
   * Check if task dependencies are satisfied
   */
  async areDependenciesSatisfied(taskId) {
    const task = await this.getTask(taskId);
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      return true;
    }
    
    const registry = await this._readJSON(this.taskRegistryPath);
    
    for (const depId of task.dependencies) {
      const depTask = registry.tasks[depId];
      if (!depTask || depTask.status !== 'completed') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Aggregate results from multiple tasks
   */
  async aggregateResults(taskIds) {
    const results = [];
    
    for (const taskId of taskIds) {
      const result = await this.getCachedResult(taskId);
      if (result) {
        results.push({ taskId, result });
      }
    }
    
    return results;
  }

  /**
   * Clean up old entries
   */
  async cleanup(maxAge = 86400000) { // Default 24 hours
    const now = Date.now();
    
    // Clean task registry
    const registry = await this._readJSON(this.taskRegistryPath);
    const tasksToKeep = {};
    Object.entries(registry.tasks).forEach(([id, task]) => {
      if (task.status === 'completed' && (now - task.updatedAt) < maxAge) {
        tasksToKeep[id] = task;
      } else if (task.status !== 'completed') {
        tasksToKeep[id] = task;
      }
    });
    registry.tasks = tasksToKeep;
    registry.activeCount = Object.values(tasksToKeep)
      .filter(t => ['registered', 'in-progress', 'queued'].includes(t.status))
      .length;
    await this._writeJSON(this.taskRegistryPath, registry);
    
    // Clean results cache
    const cache = await this._readJSON(this.resultsCachePath);
    const resultsToKeep = {};
    Object.entries(cache.results).forEach(([key, entry]) => {
      const shouldKeep = (!entry.expiresAt || entry.expiresAt > now) &&
                         ((now - entry.createdAt) < maxAge);
      if (shouldKeep) {
        resultsToKeep[key] = entry;
      }
    });
    cache.results = resultsToKeep;
    cache.totalCached = Object.keys(resultsToKeep).length;
    await this._writeJSON(this.resultsCachePath, cache);
    
    // Clean messages
    const coordination = await this._readJSON(this.coordinationPath);
    coordination.messages = coordination.messages.filter(msg => 
      (now - msg.timestamp) < maxAge
    );
    await this._writeJSON(this.coordinationPath, coordination);
  }

  // Private helper methods
  
  async _ensureFile(filePath, defaultContent) {
    try {
      await fs.access(filePath);
    } catch {
      await this._writeJSON(filePath, defaultContent);
    }
  }

  async _readJSON(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  async _writeJSON(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  _generateTaskId() {
    return `task-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  _generateMessageId() {
    return `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}

module.exports = CoordinationProtocol;
