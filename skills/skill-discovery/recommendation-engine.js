/**
 * Skill Recommendation Engine
 * 
 * Recommends relevant skills for user tasks using semantic matching
 */

class RecommendationEngine {
  constructor() {
    // Common action verbs and their skill domain mappings
    this.actionDomainMap = {
      'send': ['email', 'message', 'notification', 'webhook'],
      'read': ['file', 'data', 'parse', 'extract'],
      'write': ['file', 'data', 'generate', 'create'],
      'search': ['web', 'memory', 'database', 'index'],
      'monitor': ['analytics', 'alerting', 'tracking'],
      'schedule': ['calendar', 'cron', 'task'],
      'analyze': ['analytics', 'data', 'performance'],
      'backup': ['storage', 'version-control', 'recovery'],
      'optimize': ['performance', 'cache', 'efficiency'],
      'automate': ['workflow', 'pipeline', 'orchestration'],
      'transform': ['data', 'format', 'conversion'],
      'notify': ['notification', 'alert', 'message']
    };
  }

  /**
   * Search for skills matching a query
   */
  search(query, skillRegistry, options = {}) {
    const {
      limit = 10,
      minScore = 0.5,
      includeCapabilities = true,
      includeTags = true
    } = options;
    
    const results = [];
    const queryLower = query.toLowerCase();
    const queryWords = this.tokenize(queryLower);
    
    for (const [skillName, skill] of Object.entries(skillRegistry)) {
      const score = this.calculateMatchScore(
        query,
        queryWords,
        skill,
        { includeCapabilities, includeTags }
      );
      
      if (score >= minScore) {
        results.push({ skill, score });
      }
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Limit results
    return results.slice(0, limit);
  }

  /**
   * Recommend skills for a given task
   */
  recommend(task, skillRegistry, options = {}) {
    const {
      limit = 5,
      minScore = 0.6,
      includeReasoning = true
    } = options;
    
    const taskLower = task.toLowerCase();
    const taskWords = this.tokenize(taskLower);
    
    // Extract intent from task
    const intent = this.extractIntent(task, taskWords);
    
    // Find matching skills
    const recommendations = [];
    
    for (const [skillName, skill] of Object.entries(skillRegistry)) {
      const score = this.calculateRecommendationScore(
        task,
        taskWords,
        intent,
        skill
      );
      
      if (score >= minScore) {
        const recommendation = {
          skill,
          score
        };
        
        if (includeReasoning) {
          recommendation.reasoning = this.generateReasoning(task, intent, skill, score);
        }
        
        recommendations.push(recommendation);
      }
    }
    
    // Sort by score descending
    recommendations.sort((a, b) => b.score - a.score);
    
    // Limit results
    return recommendations.slice(0, limit);
  }

  /**
   * Calculate match score for search
   */
  calculateMatchScore(query, queryWords, skill, options) {
    let score = 0;
    const weights = {
      name: 0.3,
      description: 0.25,
      capabilities: 0.25,
      tags: 0.15,
      status: 0.05
    };
    
    // Name match
    if (skill.name.toLowerCase().includes(query.toLowerCase())) {
      score += weights.name;
    } else {
      const nameWords = this.tokenize(skill.name.toLowerCase());
      const commonWords = this.countCommonWords(queryWords, nameWords);
      score += (commonWords / queryWords.length) * weights.name;
    }
    
    // Description match
    if (skill.description) {
      const descLower = skill.description.toLowerCase();
      if (descLower.includes(query.toLowerCase())) {
        score += weights.description;
      } else {
        const descWords = this.tokenize(descLower);
        const commonWords = this.countCommonWords(queryWords, descWords);
        score += (commonWords / queryWords.length) * weights.description;
      }
    }
    
    // Capabilities match
    if (options.includeCapabilities && skill.capabilities) {
      let capScore = 0;
      for (const cap of skill.capabilities) {
        const capLower = cap.toLowerCase();
        if (capLower.includes(query.toLowerCase()) || query.toLowerCase().includes(capLower)) {
          capScore += 0.3;
        } else {
          const capWords = this.tokenize(capLower);
          const commonWords = this.countCommonWords(queryWords, capWords);
          capScore += (commonWords / Math.max(queryWords.length, 1)) * 0.1;
        }
      }
      score += Math.min(capScore, weights.capabilities);
    }
    
    // Tags match
    if (options.includeTags && skill.tags) {
      let tagScore = 0;
      for (const tag of skill.tags) {
        const tagLower = tag.toLowerCase();
        if (queryWords.some(word => tagLower.includes(word))) {
          tagScore += 0.2;
        }
      }
      score += Math.min(tagScore, weights.tags);
    }
    
    // Status boost
    if (skill.status === 'production') {
      score += weights.status;
    } else if (skill.status === 'experimental') {
      score += weights.status * 0.5;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate recommendation score
   */
  calculateRecommendationScore(task, taskWords, intent, skill) {
    let score = 0;
    
    // Base match score
    score += this.calculateMatchScore(task, taskWords, skill, {
      includeCapabilities: true,
      includeTags: true
    }) * 0.5;
    
    // Intent match
    if (intent.actions.length > 0) {
      for (const action of intent.actions) {
        // Check if skill name or description mentions this action
        const skillText = `${skill.name} ${skill.description}`.toLowerCase();
        
        if (skillText.includes(action)) {
          score += 0.1;
        }
        
        // Check action-domain mapping
        const domains = this.actionDomainMap[action] || [];
        for (const domain of domains) {
          if (skillText.includes(domain)) {
            score += 0.05;
          }
        }
      }
    }
    
    // Domain match
    if (intent.domains.length > 0) {
      const skillText = `${skill.name} ${skill.description}`.toLowerCase();
      
      for (const domain of intent.domains) {
        if (skillText.includes(domain)) {
          score += 0.15;
        }
      }
    }
    
    // Tags match with intent
    if (skill.tags) {
      for (const tag of skill.tags) {
        const tagLower = tag.toLowerCase();
        
        // Check if tag matches actions or domains
        if (intent.actions.some(action => tagLower.includes(action))) {
          score += 0.05;
        }
        
        if (intent.domains.some(domain => tagLower.includes(domain))) {
          score += 0.05;
        }
      }
    }
    
    // Boost production skills
    if (skill.status === 'production') {
      score *= 1.1;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Extract intent from task
   */
  extractIntent(task, taskWords) {
    const intent = {
      actions: [],
      domains: [],
      keywords: taskWords
    };
    
    // Extract actions (verbs)
    const actionVerbs = Object.keys(this.actionDomainMap);
    for (const action of actionVerbs) {
      if (taskWords.includes(action)) {
        intent.actions.push(action);
      }
    }
    
    // Extract domains
    const allDomains = new Set();
    for (const domains of Object.values(this.actionDomainMap)) {
      for (const domain of domains) {
        allDomains.add(domain);
      }
    }
    
    for (const domain of allDomains) {
      if (taskWords.includes(domain) || task.toLowerCase().includes(domain)) {
        intent.domains.push(domain);
      }
    }
    
    return intent;
  }

  /**
   * Generate reasoning for recommendation
   */
  generateReasoning(task, intent, skill, score) {
    const reasons = [];
    
    // Check name relevance
    if (task.toLowerCase().includes(skill.name.toLowerCase()) ||
        skill.name.toLowerCase().includes(task.toLowerCase().split(' ')[0])) {
      reasons.push(`skill name directly relates to "${task.split(' ')[0]}"`);
    }
    
    // Check action match
    if (intent.actions.length > 0) {
      const matchedActions = intent.actions.filter(action => {
        const skillText = `${skill.name} ${skill.description}`.toLowerCase();
        return skillText.includes(action);
      });
      
      if (matchedActions.length > 0) {
        reasons.push(`handles ${matchedActions.join(', ')} operations`);
      }
    }
    
    // Check domain match
    if (intent.domains.length > 0) {
      const matchedDomains = intent.domains.filter(domain => {
        const skillText = `${skill.name} ${skill.description}`.toLowerCase();
        return skillText.includes(domain);
      });
      
      if (matchedDomains.length > 0) {
        reasons.push(`works with ${matchedDomains.join(', ')}`);
      }
    }
    
    // Check capabilities
    if (skill.capabilities && skill.capabilities.length > 0) {
      const relevantCaps = skill.capabilities.filter(cap =>
        task.toLowerCase().split(' ').some(word =>
          word.length > 3 && cap.toLowerCase().includes(word)
        )
      );
      
      if (relevantCaps.length > 0) {
        reasons.push(`provides relevant capabilities: ${relevantCaps.slice(0, 2).join(', ')}`);
      }
    }
    
    // Status
    if (skill.status === 'production') {
      reasons.push('production-ready');
    }
    
    // Default reason
    if (reasons.length === 0) {
      reasons.push(`semantic match with score ${score.toFixed(2)}`);
    }
    
    return reasons.join('; ');
  }

  /**
   * Tokenize text into words
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter out very short words
  }

  /**
   * Count common words between two arrays
   */
  countCommonWords(words1, words2) {
    const set1 = new Set(words1);
    return words2.filter(word => set1.has(word)).length;
  }

  /**
   * Find related skills (similar to a given skill)
   */
  findRelatedSkills(skill, skillRegistry, limit = 5) {
    const related = [];
    
    for (const [skillName, otherSkill] of Object.entries(skillRegistry)) {
      if (skillName === skill.name) continue;
      
      const similarity = this.calculateSimilarity(skill, otherSkill);
      
      if (similarity > 0.3) {
        related.push({ skill: otherSkill, similarity });
      }
    }
    
    // Sort by similarity descending
    related.sort((a, b) => b.similarity - a.similarity);
    
    return related.slice(0, limit);
  }

  /**
   * Calculate similarity between two skills
   */
  calculateSimilarity(skill1, skill2) {
    let similarity = 0;
    
    // Tag overlap
    if (skill1.tags && skill2.tags) {
      const tags1 = new Set(skill1.tags);
      const commonTags = skill2.tags.filter(tag => tags1.has(tag));
      similarity += (commonTags.length / Math.max(skill1.tags.length, skill2.tags.length)) * 0.3;
    }
    
    // Description similarity
    if (skill1.description && skill2.description) {
      const words1 = this.tokenize(skill1.description);
      const words2 = this.tokenize(skill2.description);
      const commonWords = this.countCommonWords(words1, words2);
      similarity += (commonWords / Math.max(words1.length, words2.length)) * 0.3;
    }
    
    // Capability overlap
    if (skill1.capabilities && skill2.capabilities) {
      const caps1Words = skill1.capabilities.flatMap(c => this.tokenize(c));
      const caps2Words = skill2.capabilities.flatMap(c => this.tokenize(c));
      const commonWords = this.countCommonWords(caps1Words, caps2Words);
      similarity += (commonWords / Math.max(caps1Words.length, caps2Words.length)) * 0.4;
    }
    
    return Math.min(similarity, 1.0);
  }

  /**
   * Get skill recommendations for multiple tasks
   */
  recommendForMultipleTasks(tasks, skillRegistry, options = {}) {
    const results = [];
    
    for (const task of tasks) {
      const recommendations = this.recommend(task, skillRegistry, options);
      results.push({
        task,
        recommendations
      });
    }
    
    return results;
  }
}

module.exports = { RecommendationEngine };
