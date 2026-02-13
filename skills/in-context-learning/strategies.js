/**
 * Example Selection Strategies
 * 
 * Different approaches for selecting the most relevant examples
 * for a given prompt.
 */

const crypto = require('crypto');

class SelectionStrategy {
  constructor(library, defaultStrategy = 'semantic') {
    this.library = library;
    this.defaultStrategy = defaultStrategy;
  }

  /**
   * Select examples using the specified strategy
   * 
   * @param {string} prompt - The input prompt
   * @param {string} useCase - The use case
   * @param {number} maxExamples - Maximum number of examples to return
   * @param {Object} options - Additional options
   * @returns {Array} - Selected examples
   */
  async select(prompt, useCase, maxExamples, options = {}) {
    const strategy = options.strategy || this.defaultStrategy;
    
    switch (strategy) {
      case 'random':
        return this._selectRandom(useCase, maxExamples);
      
      case 'recent':
        return this._selectRecent(useCase, maxExamples);
      
      case 'performance':
        return this._selectByPerformance(useCase, maxExamples);
      
      case 'semantic':
        return this._selectSemantic(prompt, useCase, maxExamples);
      
      case 'keyword':
        return this._selectByKeyword(prompt, useCase, maxExamples);
      
      case 'hybrid':
        return this._selectHybrid(prompt, useCase, maxExamples, options);
      
      default:
        throw new Error(`Unknown selection strategy: ${strategy}`);
    }
  }

  /**
   * Random selection - baseline strategy
   * @private
   */
  _selectRandom(useCase, maxExamples) {
    const examples = this.library.getExamples(useCase);
    const shuffled = [...examples].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxExamples);
  }

  /**
   * Select most recently added examples
   * @private
   */
  _selectRecent(useCase, maxExamples) {
    const examples = this.library.getExamples(useCase);
    const sorted = [...examples].sort((a, b) => 
      new Date(b.created) - new Date(a.created)
    );
    return sorted.slice(0, maxExamples);
  }

  /**
   * Select examples with best historical performance
   * @private
   */
  _selectByPerformance(useCase, maxExamples) {
    const examples = this.library.getExamples(useCase);
    
    // Score based on success rate and usage count
    const scored = examples.map(ex => ({
      example: ex,
      score: (ex.successRate || 0) * 0.7 + 
             Math.min(ex.usageCount || 0, 10) / 10 * 0.3
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxExamples).map(s => s.example);
  }

  /**
   * Select examples based on semantic similarity
   * Uses simple text similarity heuristics
   * @private
   */
  _selectSemantic(prompt, useCase, maxExamples) {
    const examples = this.library.getExamples(useCase);
    
    if (examples.length === 0) {
      return [];
    }

    const scored = examples.map(ex => ({
      example: ex,
      score: this._calculateSimilarity(prompt, ex.input)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxExamples).map(s => s.example);
  }

  /**
   * Select examples by keyword matching
   * @private
   */
  _selectByKeyword(prompt, useCase, maxExamples) {
    const examples = this.library.getExamples(useCase);
    const keywords = this._extractKeywords(prompt);
    
    const scored = examples.map(ex => {
      const exampleKeywords = this._extractKeywords(ex.input);
      const matches = keywords.filter(k => exampleKeywords.includes(k)).length;
      
      return {
        example: ex,
        score: matches / Math.max(keywords.length, 1)
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxExamples).map(s => s.example);
  }

  /**
   * Hybrid strategy combining multiple approaches
   * @private
   */
  _selectHybrid(prompt, useCase, maxExamples, options) {
    const examples = this.library.getExamples(useCase);
    
    if (examples.length === 0) {
      return [];
    }

    const weights = options.weights || {
      semantic: 0.4,
      performance: 0.3,
      keyword: 0.3
    };

    const scored = examples.map(ex => {
      const semanticScore = this._calculateSimilarity(prompt, ex.input);
      const performanceScore = (ex.successRate || 0) * 0.7 + 
                               Math.min(ex.usageCount || 0, 10) / 10 * 0.3;
      
      const keywords = this._extractKeywords(prompt);
      const exampleKeywords = this._extractKeywords(ex.input);
      const keywordScore = keywords.filter(k => exampleKeywords.includes(k)).length / 
                          Math.max(keywords.length, 1);

      const finalScore = 
        semanticScore * weights.semantic +
        performanceScore * weights.performance +
        keywordScore * weights.keyword;

      return {
        example: ex,
        score: finalScore,
        breakdown: { semanticScore, performanceScore, keywordScore }
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxExamples).map(s => s.example);
  }

  /**
   * Calculate similarity between two texts
   * Simple implementation using token overlap
   * @private
   */
  _calculateSimilarity(text1, text2) {
    const tokens1 = this._tokenize(text1);
    const tokens2 = this._tokenize(text2);
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Extract keywords from text
   * @private
   */
  _extractKeywords(text) {
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    return this._tokenize(text)
      .filter(token => token.length > 2 && !stopwords.has(token))
      .filter((token, index, self) => self.indexOf(token) === index);
  }

  /**
   * Tokenize text into words
   * @private
   */
  _tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }
}

module.exports = { SelectionStrategy };
