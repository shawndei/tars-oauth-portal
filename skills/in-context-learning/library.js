/**
 * Example Library Management
 * 
 * Manages a collection of examples organized by use case with metadata
 * for intelligent selection.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ExampleLibrary {
  constructor(libraryPath) {
    this.libraryPath = libraryPath || path.join(__dirname, 'examples', 'library.json');
    this.examples = new Map(); // useCase -> examples[]
    this.index = new Map(); // exampleId -> example
    this.metadata = {
      version: '1.0.0',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      totalExamples: 0
    };
  }

  /**
   * Load the library from disk
   */
  async load() {
    try {
      const data = await fs.readFile(this.libraryPath, 'utf8');
      const parsed = JSON.parse(data);
      
      this.metadata = parsed.metadata || this.metadata;
      
      // Rebuild indices
      for (const [useCase, examples] of Object.entries(parsed.examples || {})) {
        this.examples.set(useCase, examples);
        
        for (const example of examples) {
          this.index.set(example.id, example);
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Library doesn't exist yet, that's ok
        await this._initializeDefault();
      } else {
        throw error;
      }
    }
  }

  /**
   * Save the library to disk
   */
  async save() {
    const data = {
      metadata: {
        ...this.metadata,
        updated: new Date().toISOString(),
        totalExamples: this.index.size
      },
      examples: Object.fromEntries(this.examples)
    };

    await fs.mkdir(path.dirname(this.libraryPath), { recursive: true });
    await fs.writeFile(this.libraryPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Add a new example to the library
   * 
   * @param {Object} example - Example with input, output, useCase, and optional metadata
   */
  async addExample(example) {
    if (!example.input || !example.output) {
      throw new Error('Example must have input and output fields');
    }

    const useCase = example.useCase || 'general';
    const id = example.id || this._generateId(example);

    const fullExample = {
      id,
      input: example.input,
      output: example.output,
      useCase,
      tags: example.tags || [],
      metadata: example.metadata || {},
      created: new Date().toISOString(),
      usageCount: 0,
      successRate: 0
    };

    // Add to use case collection
    if (!this.examples.has(useCase)) {
      this.examples.set(useCase, []);
    }
    this.examples.get(useCase).push(fullExample);

    // Add to index
    this.index.set(id, fullExample);

    await this.save();
    return id;
  }

  /**
   * Get examples for a specific use case
   * 
   * @param {string} useCase - The use case to filter by
   * @returns {Array} - Array of examples
   */
  getExamples(useCase) {
    if (useCase === 'all') {
      return Array.from(this.index.values());
    }
    return this.examples.get(useCase) || [];
  }

  /**
   * Get a specific example by ID
   * 
   * @param {string} id - Example ID
   * @returns {Object} - The example or null
   */
  getExample(id) {
    return this.index.get(id) || null;
  }

  /**
   * Update example statistics
   * 
   * @param {string} id - Example ID
   * @param {Object} stats - Statistics to update
   */
  updateStats(id, stats) {
    const example = this.index.get(id);
    if (!example) return;

    if (stats.used) {
      example.usageCount = (example.usageCount || 0) + 1;
    }

    if (stats.success !== undefined) {
      const total = example.usageCount || 1;
      const currentSuccesses = Math.floor((example.successRate || 0) * total);
      const newSuccesses = currentSuccesses + (stats.success ? 1 : 0);
      example.successRate = newSuccesses / total;
    }
  }

  /**
   * Search examples by tags
   * 
   * @param {Array} tags - Tags to search for
   * @returns {Array} - Matching examples
   */
  searchByTags(tags) {
    const results = [];
    
    for (const example of this.index.values()) {
      const exampleTags = example.tags || [];
      const matches = tags.filter(tag => exampleTags.includes(tag));
      
      if (matches.length > 0) {
        results.push({
          example,
          matchScore: matches.length / tags.length
        });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Remove an example from the library
   * 
   * @param {string} id - Example ID to remove
   */
  async removeExample(id) {
    const example = this.index.get(id);
    if (!example) return false;

    // Remove from use case collection
    const useCase = example.useCase;
    if (this.examples.has(useCase)) {
      const filtered = this.examples.get(useCase).filter(ex => ex.id !== id);
      this.examples.set(useCase, filtered);
    }

    // Remove from index
    this.index.delete(id);

    await this.save();
    return true;
  }

  /**
   * Get library statistics
   */
  getStats() {
    const useCases = {};
    
    for (const [useCase, examples] of this.examples.entries()) {
      useCases[useCase] = {
        count: examples.length,
        avgUsage: examples.reduce((sum, ex) => sum + (ex.usageCount || 0), 0) / examples.length,
        avgSuccess: examples.reduce((sum, ex) => sum + (ex.successRate || 0), 0) / examples.length
      };
    }

    return {
      totalExamples: this.index.size,
      useCases,
      metadata: this.metadata
    };
  }

  /**
   * Initialize with default examples
   * @private
   */
  async _initializeDefault() {
    // Add some seed examples for common use cases
    await this.addExample({
      useCase: 'code-explanation',
      input: 'Explain this code: const arr = [1,2,3].map(x => x * 2)',
      output: 'This code creates an array [1,2,3] and uses the map() method to transform each element by multiplying it by 2, resulting in [2,4,6].',
      tags: ['javascript', 'array', 'functional']
    });

    await this.addExample({
      useCase: 'code-explanation',
      input: 'What does async/await do?',
      output: 'async/await is syntax for handling Promises in JavaScript. The async keyword marks a function as asynchronous, and await pauses execution until a Promise resolves, making async code look synchronous.',
      tags: ['javascript', 'async', 'promises']
    });

    await this.addExample({
      useCase: 'summarization',
      input: 'Summarize: Climate change is affecting ecosystems worldwide. Rising temperatures are causing ice caps to melt and sea levels to rise.',
      output: 'Climate change impacts: melting ice caps, rising seas, ecosystem disruption.',
      tags: ['summary', 'climate']
    });
  }

  /**
   * Generate a unique ID for an example
   * @private
   */
  _generateId(example) {
    const hash = crypto.createHash('sha256');
    hash.update(example.input + example.output);
    return hash.digest('hex').substring(0, 16);
  }
}

module.exports = { ExampleLibrary };
