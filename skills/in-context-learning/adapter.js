/**
 * In-Context Learning Adapter
 * 
 * Provides few-shot learning capabilities by dynamically constructing prompts
 * with relevant examples from a managed library.
 */

const fs = require('fs').promises;
const path = require('path');
const { ExampleLibrary } = require('./library');
const { SelectionStrategy } = require('./strategies');
const { PerformanceTracker } = require('./tracker');

class InContextAdapter {
  constructor(options = {}) {
    this.library = new ExampleLibrary(options.libraryPath);
    this.strategy = options.strategy || 'semantic';
    this.maxExamples = options.maxExamples || 5;
    this.tracker = new PerformanceTracker(options.trackerPath);
    this.selector = new SelectionStrategy(this.library, this.strategy);
  }

  /**
   * Initialize the adapter by loading library and tracker state
   */
  async initialize() {
    await this.library.load();
    await this.tracker.load();
  }

  /**
   * Adapt a prompt with relevant examples from the library
   * 
   * @param {string} prompt - The base prompt to adapt
   * @param {Object} options - Adaptation options
   * @returns {Object} - Adapted prompt and metadata
   */
  async adapt(prompt, options = {}) {
    const useCase = options.useCase || 'general';
    const maxExamples = options.maxExamples !== undefined ? options.maxExamples : this.maxExamples;
    const strategy = options.strategy || this.strategy;

    // Track the request
    const requestId = this.tracker.startRequest(useCase, prompt);

    try {
      // Select relevant examples
      const examples = await this.selector.select(
        prompt,
        useCase,
        maxExamples,
        { strategy }
      );

      // Construct the few-shot prompt
      const adaptedPrompt = this._constructPrompt(prompt, examples, options);

      // Record the adaptation
      this.tracker.recordAdaptation(requestId, {
        examples: examples.length,
        strategy,
        useCase
      });

      return {
        prompt: adaptedPrompt,
        examples,
        metadata: {
          requestId,
          useCase,
          strategy,
          exampleCount: examples.length
        }
      };
    } catch (error) {
      this.tracker.recordError(requestId, error);
      throw error;
    }
  }

  /**
   * Record feedback on a request to improve future selections
   * 
   * @param {string} requestId - The request ID from adapt()
   * @param {Object} feedback - Feedback data
   */
  async recordFeedback(requestId, feedback) {
    await this.tracker.recordFeedback(requestId, feedback);
  }

  /**
   * Add a new example to the library
   * 
   * @param {Object} example - Example to add
   */
  async addExample(example) {
    await this.library.addExample(example);
  }

  /**
   * Get performance statistics for a use case
   * 
   * @param {string} useCase - Use case to analyze
   * @returns {Object} - Performance statistics
   */
  async getStats(useCase) {
    return await this.tracker.getStats(useCase);
  }

  /**
   * Construct the final prompt with examples
   * 
   * @private
   */
  _constructPrompt(basePrompt, examples, options) {
    const format = options.format || 'standard';

    if (examples.length === 0) {
      return basePrompt;
    }

    let prompt = '';

    if (format === 'standard') {
      prompt = 'Here are some examples to help guide your response:\n\n';
      
      examples.forEach((ex, idx) => {
        prompt += `Example ${idx + 1}:\n`;
        prompt += `Input: ${ex.input}\n`;
        prompt += `Output: ${ex.output}\n\n`;
      });

      prompt += 'Now, please respond to the following:\n\n';
      prompt += basePrompt;
    } else if (format === 'conversational') {
      prompt = basePrompt + '\n\n';
      prompt += 'For context, here are similar examples:\n';
      
      examples.forEach((ex, idx) => {
        prompt += `\n${idx + 1}. "${ex.input}" → "${ex.output}"`;
      });
    } else if (format === 'xml') {
      prompt = '<prompt>\n';
      prompt += '  <examples>\n';
      
      examples.forEach((ex) => {
        prompt += '    <example>\n';
        prompt += `      <input>${this._escapeXml(ex.input)}</input>\n`;
        prompt += `      <output>${this._escapeXml(ex.output)}</output>\n`;
        prompt += '    </example>\n';
      });
      
      prompt += '  </examples>\n';
      prompt += `  <task>${this._escapeXml(basePrompt)}</task>\n`;
      prompt += '</prompt>';
    }

    return prompt;
  }

  _escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Save current state
   */
  async save() {
    await this.library.save();
    await this.tracker.save();
  }
}

module.exports = { InContextAdapter };
