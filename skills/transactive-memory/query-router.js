/**
 * Query Router
 * 
 * Intelligent query routing to appropriate expert agents based on
 * query classification, expertise directory, and agent availability.
 * 
 * @module query-router
 */

class QueryRouter {
  /**
   * @param {Object} expertiseDirectory - Expertise directory
   */
  constructor(expertiseDirectory) {
    this.expertiseDirectory = expertiseDirectory;
    
    // Domain keyword mappings
    this.domainKeywords = {
      'research': ['research', 'find', 'gather', 'investigate', 'lookup', 'search', 'discover'],
      'programming': ['code', 'build', 'implement', 'debug', 'refactor', 'develop', 'function', 'class'],
      'data-analysis': ['analyze', 'trends', 'patterns', 'metrics', 'statistics', 'data', 'insights'],
      'content-creation': ['write', 'compose', 'create', 'document', 'article', 'blog', 'report'],
      'task-coordination': ['coordinate', 'organize', 'plan', 'manage', 'orchestrate', 'workflow'],
      'system-architecture': ['architecture', 'design', 'system', 'structure', 'scalability'],
      'web-search': ['web', 'online', 'internet', 'website', 'url'],
      'debugging': ['debug', 'fix', 'error', 'bug', 'issue', 'problem'],
      'pattern-recognition': ['pattern', 'detect', 'identify', 'recognize'],
      'technical-writing': ['documentation', 'guide', 'manual', 'tutorial'],
      'summarization': ['summarize', 'summary', 'brief', 'synopsis', 'overview']
    };
  }
  
  /**
   * Route query to appropriate agent(s)
   * @param {string} query - Query string
   * @param {Object} options - Routing options
   * @returns {Promise<Object>} Routing decision
   */
  async route(query, options = {}) {
    // Step 1: Classify query
    const classification = this.classifyQuery(query);
    
    // Step 2: Select expert(s)
    const expertSelection = this.selectExpert(classification, options);
    
    // Step 3: Determine execution strategy
    const strategy = this.determineStrategy(classification, expertSelection, options);
    
    return {
      classification,
      expert: expertSelection,
      strategy
    };
  }
  
  /**
   * Classify query to determine domain and complexity
   * @param {string} query - Query string
   * @returns {Object} Classification
   */
  classifyQuery(query) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);
    
    // Detect domains based on keywords
    const domainScores = {};
    
    for (const [domain, keywords] of Object.entries(this.domainKeywords)) {
      let score = 0;
      for (const keyword of keywords) {
        if (queryLower.includes(keyword)) {
          score += 1;
          // Boost for exact word match
          if (words.includes(keyword)) {
            score += 0.5;
          }
        }
      }
      if (score > 0) {
        domainScores[domain] = score;
      }
    }
    
    // Sort domains by score
    const sortedDomains = Object.entries(domainScores)
      .sort((a, b) => b[1] - a[1])
      .map(([domain, score]) => domain);
    
    const primaryDomain = sortedDomains[0] || 'general';
    const secondaryDomains = sortedDomains.slice(1, 3);
    
    // Detect complexity
    const complexity = this.assessComplexity(query, sortedDomains);
    
    // Detect intent
    const intent = this.detectIntent(query);
    
    return {
      query,
      keywords: this.extractKeywords(query),
      primaryDomain,
      secondaryDomains,
      domainScores,
      complexity,
      intent
    };
  }
  
  /**
   * Extract important keywords from query
   * @private
   */
  extractKeywords(query) {
    // Simple keyword extraction (could be enhanced with NLP)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = query.toLowerCase().split(/\s+/);
    return words.filter(w => w.length > 3 && !stopWords.has(w));
  }
  
  /**
   * Assess query complexity
   * @private
   */
  assessComplexity(query, domains) {
    let complexity = 'simple';
    
    // Multiple domains = more complex
    if (domains.length > 2) {
      complexity = 'complex';
    } else if (domains.length > 1) {
      complexity = 'moderate';
    }
    
    // Multiple sentences = more complex
    const sentences = query.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 2) {
      complexity = 'complex';
    } else if (sentences.length > 1 && complexity === 'simple') {
      complexity = 'moderate';
    }
    
    // Long query = potentially complex
    if (query.split(/\s+/).length > 50) {
      complexity = 'complex';
    }
    
    // Multi-step indicators
    const multiStepIndicators = ['then', 'after', 'following', 'next', 'finally', 'and then'];
    const hasMultiStep = multiStepIndicators.some(ind => query.toLowerCase().includes(ind));
    if (hasMultiStep) {
      complexity = 'complex';
    }
    
    return complexity;
  }
  
  /**
   * Detect query intent
   * @private
   */
  detectIntent(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.match(/\b(what|who|where|when|which)\b/)) {
      return 'information';
    }
    if (queryLower.match(/\b(how|explain|describe)\b/)) {
      return 'explanation';
    }
    if (queryLower.match(/\b(create|build|make|generate|write)\b/)) {
      return 'creation';
    }
    if (queryLower.match(/\b(analyze|compare|evaluate|assess)\b/)) {
      return 'analysis';
    }
    if (queryLower.match(/\b(fix|debug|solve|resolve)\b/)) {
      return 'problem-solving';
    }
    
    return 'general';
  }
  
  /**
   * Select best expert for query
   * @param {Object} classification - Query classification
   * @param {Object} options - Selection options
   * @returns {Object} Expert selection
   */
  selectExpert(classification, options = {}) {
    const { primaryDomain, secondaryDomains } = classification;
    
    // Get candidates from primary domain
    let candidates = this.expertiseDirectory.domainIndex[primaryDomain] || [];
    
    // If no candidates, fall back to coordinator
    if (candidates.length === 0) {
      candidates = ['coordinator'];
    }
    
    // Preferred agent override
    if (options.preferredAgent && this.expertiseDirectory.agents[options.preferredAgent]) {
      return {
        primary: {
          agentId: options.preferredAgent,
          agent: this.expertiseDirectory.agents[options.preferredAgent],
          score: 1.0,
          reasoning: { override: true }
        },
        fallbacks: [],
        allCandidates: []
      };
    }
    
    // Score each candidate
    const scoredCandidates = candidates.map(agentId => {
      const agent = this.expertiseDirectory.agents[agentId];
      if (!agent) return null;
      
      const domain = agent.domains[primaryDomain];
      if (!domain) return null;
      
      // Calculate match score
      const expertiseScore = domain.expertiseLevel;
      const reliabilityScore = agent.reliability || 0.5;
      const availabilityScore = this.checkAvailability(agentId);
      const confidenceScore = domain.confidenceScore;
      
      const totalScore = (
        expertiseScore * 0.40 +
        reliabilityScore * 0.25 +
        availabilityScore * 0.20 +
        confidenceScore * 0.15
      );
      
      return {
        agentId,
        agent,
        domain,
        score: totalScore,
        reasoning: {
          expertise: expertiseScore.toFixed(2),
          reliability: reliabilityScore.toFixed(2),
          availability: availabilityScore.toFixed(2),
          confidence: confidenceScore.toFixed(2)
        }
      };
    }).filter(x => x !== null);
    
    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    // Secondary experts for multi-domain queries
    const secondaryExperts = secondaryDomains.map(domain => {
      const domainCandidates = this.expertiseDirectory.domainIndex[domain] || [];
      if (domainCandidates.length === 0) return null;
      
      const agentId = domainCandidates[0]; // Take top expert
      const agent = this.expertiseDirectory.agents[agentId];
      if (!agent || !agent.domains[domain]) return null;
      
      return {
        agentId,
        agent,
        domain: agent.domains[domain],
        score: agent.domains[domain].expertiseLevel
      };
    }).filter(x => x !== null);
    
    return {
      primary: scoredCandidates[0] || { agentId: 'coordinator', score: 0.5 },
      fallbacks: scoredCandidates.slice(1, 3),
      secondary: secondaryExperts,
      allCandidates: scoredCandidates
    };
  }
  
  /**
   * Check agent availability (placeholder - would integrate with orchestrator)
   * @private
   */
  checkAvailability(agentId) {
    // Placeholder: Real implementation would check orchestrator load state
    // For now, assume all agents are available
    return 1.0;
  }
  
  /**
   * Determine execution strategy
   * @param {Object} classification - Query classification
   * @param {Object} expertSelection - Expert selection
   * @param {Object} options - Strategy options
   * @returns {Object} Execution strategy
   */
  determineStrategy(classification, expertSelection, options = {}) {
    const { complexity, secondaryDomains } = classification;
    const { primary, fallbacks, secondary } = expertSelection;
    
    // Force mode if specified
    if (options.mode) {
      return this.buildStrategy(options.mode, primary, secondary, fallbacks);
    }
    
    // Simple query → single agent
    if (complexity === 'simple' && secondaryDomains.length === 0) {
      return this.buildStrategy('single', primary, secondary, fallbacks);
    }
    
    // Multi-domain query → collective retrieval
    if (secondaryDomains.length > 0 && secondary.length > 0) {
      return this.buildStrategy('collective', primary, secondary, fallbacks);
    }
    
    // Complex query → coordinator
    if (complexity === 'complex') {
      return this.buildStrategy('coordinated', primary, secondary, fallbacks);
    }
    
    // Moderate complexity → single with fallback
    return this.buildStrategy('single', primary, secondary, fallbacks);
  }
  
  /**
   * Build execution strategy object
   * @private
   */
  buildStrategy(mode, primary, secondary, fallbacks) {
    const strategy = { mode };
    
    switch (mode) {
      case 'single':
        strategy.primary = primary.agentId;
        strategy.fallbacks = fallbacks.map(f => f.agentId);
        break;
      
      case 'collective':
        strategy.primary = primary.agentId;
        strategy.secondary = secondary.map(e => e.agentId);
        strategy.synthesizer = 'coordinator';
        break;
      
      case 'coordinated':
        strategy.coordinator = 'coordinator';
        strategy.expert = primary.agentId;
        strategy.fallbacks = fallbacks.map(f => f.agentId);
        break;
      
      case 'parallel':
        strategy.experts = [primary.agentId, ...(secondary || []).map(e => e.agentId)];
        strategy.synthesizer = 'coordinator';
        break;
      
      case 'sequential':
        strategy.chain = [primary.agentId, ...(secondary || []).map(e => e.agentId)];
        strategy.coordinator = 'coordinator';
        break;
    }
    
    return strategy;
  }
}

module.exports = QueryRouter;
