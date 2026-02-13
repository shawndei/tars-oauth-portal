/**
 * Local Embedding Model Integration
 * Provides local embedding generation using Hugging Face transformers
 * with automatic fallback to OpenAI when local models are unavailable
 */

import { pipeline, env } from '@xenova/transformers';
import OpenAI from 'openai';

// Configure transformers environment
env.allowLocalModels = true;
env.useBrowserCache = false;

/**
 * EmbeddingService class - handles local and remote embedding generation
 */
class EmbeddingService {
  constructor(options = {}) {
    this.modelName = options.modelName || 'Xenova/all-MiniLM-L6-v2';
    this.openaiApiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
    this.openaiModel = options.openaiModel || 'text-embedding-3-small';
    this.maxBatchSize = options.maxBatchSize || 32;
    this.useLocal = options.useLocal !== false;
    this.autoFallback = options.autoFallback !== false;
    
    this.pipeline = null;
    this.localAvailable = false;
    this.initializationAttempted = false;
    this.openaiClient = null;
    
    // Stats tracking
    this.stats = {
      localCalls: 0,
      remoteCalls: 0,
      errors: 0,
      totalTexts: 0,
      avgLocalTime: 0,
      avgRemoteTime: 0
    };
  }

  /**
   * Initialize the local model pipeline
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.initializationAttempted) {
      return this.localAvailable;
    }

    this.initializationAttempted = true;

    if (!this.useLocal) {
      console.log('[Embeddings] Local models disabled, will use OpenAI only');
      return false;
    }

    try {
      console.log(`[Embeddings] Initializing local model: ${this.modelName}`);
      const startTime = Date.now();
      
      this.pipeline = await pipeline('feature-extraction', this.modelName, {
        quantized: true, // Use quantized models for better performance
      });
      
      const loadTime = Date.now() - startTime;
      console.log(`[Embeddings] Local model loaded successfully in ${loadTime}ms`);
      
      this.localAvailable = true;
      return true;
    } catch (error) {
      console.error('[Embeddings] Failed to load local model:', error.message);
      this.localAvailable = false;
      
      if (this.autoFallback && this.openaiApiKey) {
        console.log('[Embeddings] Will fall back to OpenAI API');
      }
      
      return false;
    }
  }

  /**
   * Initialize OpenAI client if needed
   */
  initializeOpenAI() {
    if (!this.openaiClient && this.openaiApiKey) {
      this.openaiClient = new OpenAI({ apiKey: this.openaiApiKey });
    }
  }

  /**
   * Generate embeddings for a single text or array of texts
   * @param {string|string[]} texts - Text(s) to embed
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} Embedding vectors
   */
  async embed(texts, options = {}) {
    const isArray = Array.isArray(texts);
    const textArray = isArray ? texts : [texts];
    
    if (textArray.length === 0) {
      return [];
    }

    // Ensure initialization
    if (!this.initializationAttempted) {
      await this.initialize();
    }

    // Try local first if available
    if (this.localAvailable && this.pipeline) {
      try {
        const embeddings = await this._embedLocal(textArray, options);
        return isArray ? embeddings : embeddings[0];
      } catch (error) {
        console.error('[Embeddings] Local embedding failed:', error.message);
        this.stats.errors++;
        
        if (!this.autoFallback) {
          throw error;
        }
        
        console.log('[Embeddings] Falling back to OpenAI...');
      }
    }

    // Fallback to OpenAI
    if (this.openaiApiKey) {
      try {
        const embeddings = await this._embedOpenAI(textArray, options);
        return isArray ? embeddings : embeddings[0];
      } catch (error) {
        console.error('[Embeddings] OpenAI embedding failed:', error.message);
        this.stats.errors++;
        throw new Error(`Both local and OpenAI embedding failed: ${error.message}`);
      }
    }

    throw new Error('No embedding method available (local model not loaded and no OpenAI API key)');
  }

  /**
   * Generate embeddings using local model with batch processing
   * @private
   */
  async _embedLocal(texts, options = {}) {
    const startTime = Date.now();
    const batchSize = options.batchSize || this.maxBatchSize;
    const allEmbeddings = [];

    // Process in batches for efficiency
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      // Generate embeddings for batch
      const outputs = await this.pipeline(batch, {
        pooling: 'mean',
        normalize: true,
        ...options
      });

      // Extract embeddings
      if (batch.length === 1) {
        allEmbeddings.push(Array.from(outputs.data));
      } else {
        for (let j = 0; j < batch.length; j++) {
          const embedding = Array.from(outputs[j].data);
          allEmbeddings.push(embedding);
        }
      }
    }

    const elapsed = Date.now() - startTime;
    this.stats.localCalls++;
    this.stats.totalTexts += texts.length;
    this.stats.avgLocalTime = (this.stats.avgLocalTime * (this.stats.localCalls - 1) + elapsed) / this.stats.localCalls;

    console.log(`[Embeddings] Generated ${texts.length} local embeddings in ${elapsed}ms`);
    
    return allEmbeddings;
  }

  /**
   * Generate embeddings using OpenAI API with batch processing
   * @private
   */
  async _embedOpenAI(texts, options = {}) {
    this.initializeOpenAI();
    
    if (!this.openaiClient) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();
    const batchSize = options.batchSize || 100; // OpenAI can handle larger batches
    const allEmbeddings = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const response = await this.openaiClient.embeddings.create({
        model: options.model || this.openaiModel,
        input: batch,
      });

      allEmbeddings.push(...response.data.map(item => item.embedding));
    }

    const elapsed = Date.now() - startTime;
    this.stats.remoteCalls++;
    this.stats.totalTexts += texts.length;
    this.stats.avgRemoteTime = (this.stats.avgRemoteTime * (this.stats.remoteCalls - 1) + elapsed) / this.stats.remoteCalls;

    console.log(`[Embeddings] Generated ${texts.length} OpenAI embeddings in ${elapsed}ms`);
    
    return allEmbeddings;
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param {Array} embedding1 - First embedding vector
   * @param {Array} embedding2 - Second embedding vector
   * @returns {number} Similarity score between -1 and 1
   */
  cosineSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Find most similar texts to a query
   * @param {string} query - Query text
   * @param {Array<{text: string, embedding?: Array}>} corpus - Corpus to search
   * @param {number} topK - Number of results to return
   * @returns {Promise<Array>} Most similar items with scores
   */
  async findSimilar(query, corpus, topK = 5) {
    // Generate query embedding
    const queryEmbedding = await this.embed(query);

    // Generate corpus embeddings if not provided
    const corpusWithEmbeddings = [];
    const textsToEmbed = [];
    const indicesToEmbed = [];

    for (let i = 0; i < corpus.length; i++) {
      if (corpus[i].embedding) {
        corpusWithEmbeddings.push(corpus[i]);
      } else {
        textsToEmbed.push(corpus[i].text);
        indicesToEmbed.push(i);
      }
    }

    if (textsToEmbed.length > 0) {
      const newEmbeddings = await this.embed(textsToEmbed);
      for (let i = 0; i < indicesToEmbed.length; i++) {
        corpusWithEmbeddings.push({
          ...corpus[indicesToEmbed[i]],
          embedding: newEmbeddings[i]
        });
      }
    }

    // Calculate similarities
    const results = corpusWithEmbeddings.map(item => ({
      ...item,
      similarity: this.cosineSimilarity(queryEmbedding, item.embedding)
    }));

    // Sort by similarity and return top K
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  /**
   * Get service statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      localAvailable: this.localAvailable,
      modelName: this.modelName,
      openaiModel: this.openaiModel
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      localCalls: 0,
      remoteCalls: 0,
      errors: 0,
      totalTexts: 0,
      avgLocalTime: 0,
      avgRemoteTime: 0
    };
  }
}

/**
 * Create a new embedding service instance
 * @param {Object} options - Configuration options
 * @returns {EmbeddingService} Service instance
 */
export function createEmbeddingService(options = {}) {
  return new EmbeddingService(options);
}

export default EmbeddingService;
