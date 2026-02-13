/**
 * Transactive Memory System
 * 
 * Distributed knowledge management across multiple agents with expertise tracking,
 * intelligent query routing, and collective knowledge retrieval.
 * 
 * @module transactive-memory
 */

const fs = require('fs').promises;
const path = require('path');
const QueryRouter = require('./query-router');
const KnowledgeRetrieval = require('./knowledge-retrieval');

class TransactiveMemory {
  /**
   * @param {Object} options
   * @param {string} options.expertiseDir - Path to expertise directory JSON
   * @param {string} options.workspaceDir - Workspace directory path
   * @param {boolean} options.learningEnabled - Enable automatic expertise learning
   * @param {number} options.updateInterval - Expertise update interval in ms
   */
  constructor(options = {}) {
    this.expertisePath = options.expertiseDir || 
      path.join(__dirname, 'expertise-directory.json');
    this.workspaceDir = options.workspaceDir || 
      process.env.OPENCLAW_WORKSPACE || 
      path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw', 'workspace');
    this.learningEnabled = options.learningEnabled !== false;
    this.updateInterval = options.updateInterval || 3600000; // 1 hour
    
    this.expertiseDirectory = null;
    this.router = null;
    this.retrieval = null;
    this.initialized = false;
    this.updateTimer = null;
    
    // Performance tracking
    this.metrics = {
      totalQueries: 0,
      successfulRoutes: 0,
      failedRoutes: 0,
      totalRoutingTime: 0,
      totalExecutionTime: 0,
      qualityScores: []
    };
  }
  
  /**
   * Initialize the transactive memory system
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Load expertise directory
      await this.loadExpertiseDirectory();
      
      // Initialize router
      this.router = new QueryRouter(this.expertiseDirectory);
      
      // Initialize retrieval system
      this.retrieval = new KnowledgeRetrieval(this);
      
      // Start periodic expertise updates if learning enabled
      if (this.learningEnabled) {
        this.startPeriodicUpdates();
      }
      
      this.initialized = true;
      console.log('✓ Transactive Memory System initialized');
    } catch (error) {
      console.error('Failed to initialize Transactive Memory:', error);
      throw error;
    }
  }
  
  /**
   * Load expertise directory from file
   */
  async loadExpertiseDirectory() {
    try {
      const data = await fs.readFile(this.expertisePath, 'utf8');
      this.expertiseDirectory = JSON.parse(data);
      console.log(`Loaded expertise directory: ${Object.keys(this.expertiseDirectory.agents).length} agents`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn('Expertise directory not found, creating default...');
        await this.createDefaultDirectory();
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Save expertise directory to file
   */
  async saveExpertiseDirectory() {
    try {
      this.expertiseDirectory.lastUpdated = new Date().toISOString();
      const data = JSON.stringify(this.expertiseDirectory, null, 2);
      await fs.writeFile(this.expertisePath, data, 'utf8');
    } catch (error) {
      console.error('Failed to save expertise directory:', error);
      throw error;
    }
  }
  
  /**
   * Create default expertise directory
   */
  async createDefaultDirectory() {
    this.expertiseDirectory = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      agents: {},
      domainIndex: {},
      performanceHistory: {
        totalQueries: 0,
        successfulRoutes: 0,
        failedRoutes: 0,
        avgRoutingTime: 0,
        avgResponseQuality: 0
      }
    };
    
    await this.saveExpertiseDirectory();
  }
  
  /**
   * Route query to appropriate agent(s)
   * @param {string} query - Query string
   * @param {Object} options - Routing options
   * @returns {Promise<Object>} Routing result with response
   */
  async routeQuery(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    this.metrics.totalQueries++;
    
    try {
      // Route query
      const routing = await this.router.route(query, options);
      const routingTime = Date.now() - startTime;
      this.metrics.totalRoutingTime += routingTime;
      
      // Execute based on strategy
      let result;
      if (routing.strategy.mode === 'collective') {
        result = await this.retrieval.collectiveRetrieval(query, routing);
      } else if (routing.strategy.mode === 'coordinated') {
        result = await this.retrieval.coordinatedRetrieval(query, routing);
      } else {
        result = await this.retrieval.singleAgentRetrieval(query, routing);
      }
      
      const totalTime = Date.now() - startTime;
      this.metrics.totalExecutionTime += totalTime;
      
      // Update expertise if learning enabled
      if (this.learningEnabled && result.success) {
        await this.updateExpertiseFromResult(result);
      }
      
      // Track metrics
      this.metrics.successfulRoutes++;
      if (result.quality) {
        this.metrics.qualityScores.push(result.quality);
      }
      
      return {
        query,
        routing,
        result,
        performance: {
          routingTime,
          totalTime
        }
      };
    } catch (error) {
      this.metrics.failedRoutes++;
      console.error('Query routing failed:', error);
      throw error;
    }
  }
  
  /**
   * Collective retrieval across multiple experts
   * @param {string} query - Query string
   * @param {Array<string>} expertIds - Expert agent IDs
   * @returns {Promise<Object>} Collective result
   */
  async collectiveRetrieve(query, expertIds) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const routing = {
      expert: {
        primary: { agentId: expertIds[0] },
        secondary: expertIds.slice(1).map(id => ({ agentId: id }))
      },
      strategy: { mode: 'collective' }
    };
    
    return this.retrieval.collectiveRetrieval(query, routing);
  }
  
  /**
   * Find best expert for given domain
   * @param {string} domain - Knowledge domain
   * @returns {Object|null} Expert info or null
   */
  findExpertForDomain(domain) {
    if (!this.expertiseDirectory) return null;
    
    const agentIds = this.expertiseDirectory.domainIndex[domain] || [];
    if (agentIds.length === 0) return null;
    
    // Score each agent for this domain
    const scored = agentIds.map(agentId => {
      const agent = this.expertiseDirectory.agents[agentId];
      if (!agent) return null;
      
      const domainExpertise = agent.domains[domain];
      if (!domainExpertise) return null;
      
      return {
        agentId,
        name: agent.name,
        expertiseLevel: domainExpertise.expertiseLevel,
        successRate: domainExpertise.successRate,
        avgQuality: domainExpertise.avgQuality,
        specializations: domainExpertise.specializations,
        confidenceScore: domainExpertise.confidenceScore
      };
    }).filter(x => x !== null);
    
    // Sort by expertise level
    scored.sort((a, b) => b.expertiseLevel - a.expertiseLevel);
    
    return scored[0] || null;
  }
  
  /**
   * Update agent expertise based on task outcome
   * @param {string} agentId - Agent identifier
   * @param {string} domain - Knowledge domain
   * @param {Object} metrics - Performance metrics
   */
  async updateExpertise(agentId, domain, metrics) {
    if (!this.learningEnabled) return;
    if (!this.expertiseDirectory.agents[agentId]) return;
    
    const agent = this.expertiseDirectory.agents[agentId];
    
    // Initialize domain if doesn't exist
    if (!agent.domains[domain]) {
      agent.domains[domain] = {
        expertiseLevel: 0.5,
        tasksCompleted: 0,
        successRate: 0,
        avgQuality: 0,
        avgResponseTime: 0,
        specializations: [],
        knowledgeAreas: [],
        lastUsed: new Date().toISOString(),
        confidenceScore: 0.5
      };
    }
    
    const domainData = agent.domains[domain];
    
    // Update metrics
    domainData.tasksCompleted++;
    domainData.lastUsed = new Date().toISOString();
    
    // Update success rate (exponential moving average)
    const alpha = 0.1; // Learning rate
    const success = metrics.success ? 1 : 0;
    domainData.successRate = alpha * success + (1 - alpha) * domainData.successRate;
    
    // Update quality (moving average)
    if (metrics.quality !== undefined) {
      domainData.avgQuality = alpha * metrics.quality + (1 - alpha) * domainData.avgQuality;
    }
    
    // Update response time (moving average)
    if (metrics.responseTime !== undefined) {
      domainData.avgResponseTime = alpha * metrics.responseTime + (1 - alpha) * domainData.avgResponseTime;
    }
    
    // Recalculate expertise level
    domainData.expertiseLevel = this.calculateExpertiseScore(domainData);
    
    // Recalculate confidence score
    domainData.confidenceScore = this.calculateConfidenceScore(domainData);
    
    // Update overall agent stats
    agent.totalTasks = Object.values(agent.domains)
      .reduce((sum, d) => sum + d.tasksCompleted, 0);
    agent.reliability = Object.values(agent.domains)
      .reduce((sum, d) => sum + d.successRate, 0) / Object.keys(agent.domains).length;
    agent.overallExpertise = Object.values(agent.domains)
      .reduce((sum, d) => sum + d.expertiseLevel, 0) / Object.keys(agent.domains).length;
    
    // Update domain index
    if (!this.expertiseDirectory.domainIndex[domain]) {
      this.expertiseDirectory.domainIndex[domain] = [];
    }
    if (!this.expertiseDirectory.domainIndex[domain].includes(agentId)) {
      this.expertiseDirectory.domainIndex[domain].push(agentId);
    }
    
    // Save
    await this.saveExpertiseDirectory();
  }
  
  /**
   * Calculate expertise score for domain
   * @private
   */
  calculateExpertiseScore(domainData) {
    const maxTasks = 200; // Normalize task count
    const taskScore = Math.min(domainData.tasksCompleted / maxTasks, 1.0);
    
    // Optimal response time (5 seconds)
    const optimalTime = 5000;
    const timeScore = domainData.avgResponseTime > 0 
      ? Math.min(optimalTime / domainData.avgResponseTime, 1.0)
      : 0.5;
    
    // Recency score (decay over 30 days)
    const daysSinceUse = domainData.lastUsed 
      ? (Date.now() - new Date(domainData.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
      : 30;
    const recencyScore = Math.max(0, 1 - (daysSinceUse / 30));
    
    // Weighted combination
    const score = (
      domainData.successRate * 0.35 +
      domainData.avgQuality * 0.30 +
      taskScore * 0.20 +
      timeScore * 0.10 +
      recencyScore * 0.05
    );
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Calculate confidence score for domain
   * @private
   */
  calculateConfidenceScore(domainData) {
    // Experience factor (0-1 based on tasks completed)
    const experienceFactor = Math.min(domainData.tasksCompleted / 100, 1.0);
    
    const score = (
      experienceFactor * 0.4 +
      domainData.successRate * 0.4 +
      domainData.avgQuality * 0.2
    );
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Update expertise from query result
   * @private
   */
  async updateExpertiseFromResult(result) {
    if (result.routing && result.routing.expert) {
      const agentId = result.routing.expert.primary.agentId;
      const domain = result.routing.classification?.primaryDomain || 'general';
      
      const metrics = {
        success: result.success || false,
        quality: result.quality || 0,
        responseTime: result.performance?.totalTime || 0
      };
      
      await this.updateExpertise(agentId, domain, metrics);
    }
  }
  
  /**
   * Transfer knowledge between agents
   * @param {string} fromAgent - Source agent ID
   * @param {string} toAgent - Target agent ID
   * @param {Object} knowledge - Knowledge object
   */
  async transferKnowledge(fromAgent, toAgent, knowledge) {
    if (!this.expertiseDirectory.agents[fromAgent] || 
        !this.expertiseDirectory.agents[toAgent]) {
      throw new Error('Invalid agent IDs for knowledge transfer');
    }
    
    const { domain, techniques, examples, successMetrics } = knowledge;
    
    // Get source agent's expertise in this domain
    const sourceExpertise = this.expertiseDirectory.agents[fromAgent].domains[domain];
    if (!sourceExpertise) {
      throw new Error(`Source agent has no expertise in domain: ${domain}`);
    }
    
    // Initialize or update target agent's domain
    const targetAgent = this.expertiseDirectory.agents[toAgent];
    if (!targetAgent.domains[domain]) {
      targetAgent.domains[domain] = {
        expertiseLevel: 0.3, // Start with base knowledge
        tasksCompleted: 0,
        successRate: 0.5,
        avgQuality: 0.5,
        avgResponseTime: 0,
        specializations: [],
        knowledgeAreas: [],
        lastUsed: new Date().toISOString(),
        confidenceScore: 0.3
      };
    }
    
    const targetDomain = targetAgent.domains[domain];
    
    // Transfer specializations
    if (techniques) {
      targetDomain.specializations = [
        ...new Set([...targetDomain.specializations, ...techniques])
      ];
    }
    
    // Boost expertise based on source quality (transfer 30% of source expertise)
    const transferFactor = 0.3;
    const expertiseBoost = sourceExpertise.expertiseLevel * transferFactor;
    targetDomain.expertiseLevel = Math.min(
      1.0,
      targetDomain.expertiseLevel + expertiseBoost
    );
    
    // Update confidence (knowledge transfer increases confidence)
    targetDomain.confidenceScore = Math.min(
      0.8, // Cap at 0.8 until real task experience
      targetDomain.confidenceScore + 0.1
    );
    
    await this.saveExpertiseDirectory();
    
    return {
      success: true,
      from: fromAgent,
      to: toAgent,
      domain,
      expertiseBoost,
      newExpertiseLevel: targetDomain.expertiseLevel
    };
  }
  
  /**
   * Get expertise directory
   * @returns {Object} Expertise directory
   */
  getExpertiseDirectory() {
    return this.expertiseDirectory;
  }
  
  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const avgRoutingTime = this.metrics.totalQueries > 0
      ? this.metrics.totalRoutingTime / this.metrics.totalQueries
      : 0;
    
    const avgExecutionTime = this.metrics.totalQueries > 0
      ? this.metrics.totalExecutionTime / this.metrics.totalQueries
      : 0;
    
    const avgQuality = this.metrics.qualityScores.length > 0
      ? this.metrics.qualityScores.reduce((a, b) => a + b, 0) / this.metrics.qualityScores.length
      : 0;
    
    const routingAccuracy = this.metrics.totalQueries > 0
      ? this.metrics.successfulRoutes / this.metrics.totalQueries
      : 0;
    
    return {
      totalQueries: this.metrics.totalQueries,
      successfulRoutes: this.metrics.successfulRoutes,
      failedRoutes: this.metrics.failedRoutes,
      routingAccuracy,
      avgRoutingTime: Math.round(avgRoutingTime),
      avgExecutionTime: Math.round(avgExecutionTime),
      avgResponseQuality: avgQuality.toFixed(2),
      expertiseGrowth: this.calculateExpertiseGrowth()
    };
  }
  
  /**
   * Calculate expertise growth over time
   * @private
   */
  calculateExpertiseGrowth() {
    // This would track historical expertise levels and calculate deltas
    // For now, return placeholder
    return {
      note: "Expertise growth tracking requires historical data"
    };
  }
  
  /**
   * Start periodic expertise updates
   * @private
   */
  startPeriodicUpdates() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    this.updateTimer = setInterval(async () => {
      try {
        await this.saveExpertiseDirectory();
        console.log('Expertise directory auto-saved');
      } catch (error) {
        console.error('Failed to auto-save expertise directory:', error);
      }
    }, this.updateInterval);
  }
  
  /**
   * Stop periodic updates and cleanup
   */
  async cleanup() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    if (this.learningEnabled) {
      await this.saveExpertiseDirectory();
    }
    
    this.initialized = false;
  }
}

module.exports = TransactiveMemory;
