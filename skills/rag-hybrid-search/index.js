#!/usr/bin/env node
/**
 * RAG Hybrid Search System - Core Implementation
 * Combines vector search + BM25 keyword search with reranking
 * 
 * Features:
 * - Hybrid search: Vector similarity + BM25 keyword matching
 * - Score fusion: Reciprocal Rank Fusion (RRF)
 * - Reranking: Multiple strategies (RRF, weighted, max)
 * - Episodic memory integration
 * - Production-ready performance (<1s query time)
 * 
 * Architecture:
 * 1. Vector search via LanceDB (semantic similarity)
 * 2. BM25 search via in-memory index (keyword matching)
 * 3. Score fusion to combine rankings
 * 4. Reranking to optimize final results
 */

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const lancedb = require('@lancedb/lancedb');

// Configuration
const WORKSPACE_PATH = process.env.OPENCLAW_WORKSPACE || path.join(process.env.USERPROFILE || process.env.HOME, '.openclaw', 'workspace');
const LANCE_DB_PATH = path.join(WORKSPACE_PATH, '.episodic-memory-db');
const BM25_INDEX_PATH = path.join(WORKSPACE_PATH, '.bm25-index.json');
const TABLE_NAME = 'episodic_memory';

// OpenAI client (lazy initialization to avoid errors on import)
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set. Please configure it in your environment or OpenClaw config.');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// BM25 parameters (tuned for short documents)
const BM25_K1 = 1.2;  // Term frequency saturation parameter
const BM25_B = 0.75;   // Length normalization parameter

/**
 * BM25 Implementation
 * Classic probabilistic information retrieval algorithm
 */
class BM25Index {
  constructor() {
    this.documents = [];
    this.docFrequency = new Map(); // How many docs contain each term
    this.avgDocLength = 0;
    this.totalDocs = 0;
  }

  /**
   * Tokenize text into terms (words)
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
      .split(/\s+/)
      .filter(term => term.length > 2); // Filter short terms
  }

  /**
   * Build BM25 index from documents
   */
  buildIndex(documents) {
    this.documents = documents.map(doc => {
      const terms = this.tokenize(doc.text);
      return {
        ...doc,
        terms,
        termFrequency: this.calculateTermFrequency(terms),
        docLength: terms.length
      };
    });

    this.totalDocs = this.documents.length;

    // Calculate average document length
    this.avgDocLength = this.documents.reduce((sum, doc) => sum + doc.docLength, 0) / this.totalDocs;

    // Calculate document frequency for each term
    this.docFrequency.clear();
    this.documents.forEach(doc => {
      const uniqueTerms = new Set(doc.terms);
      uniqueTerms.forEach(term => {
        this.docFrequency.set(term, (this.docFrequency.get(term) || 0) + 1);
      });
    });

    console.log(`✓ BM25 index built: ${this.totalDocs} documents, ${this.docFrequency.size} unique terms`);
  }

  /**
   * Calculate term frequency for terms in document
   */
  calculateTermFrequency(terms) {
    const tf = new Map();
    terms.forEach(term => {
      tf.set(term, (tf.get(term) || 0) + 1);
    });
    return tf;
  }

  /**
   * Calculate IDF (Inverse Document Frequency) for a term
   */
  idf(term) {
    const df = this.docFrequency.get(term) || 0;
    if (df === 0) return 0;
    return Math.log((this.totalDocs - df + 0.5) / (df + 0.5) + 1);
  }

  /**
   * Calculate BM25 score for a document given query terms
   */
  score(doc, queryTerms) {
    let score = 0;

    queryTerms.forEach(term => {
      const tf = doc.termFrequency.get(term) || 0;
      if (tf === 0) return;

      const idf = this.idf(term);
      const numerator = tf * (BM25_K1 + 1);
      const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * (doc.docLength / this.avgDocLength));

      score += idf * (numerator / denominator);
    });

    return score;
  }

  /**
   * Search documents using BM25
   */
  search(query, limit = 20) {
    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) return [];

    const results = this.documents.map(doc => ({
      ...doc,
      bm25_score: this.score(doc, queryTerms)
    }));

    // Sort by BM25 score descending
    results.sort((a, b) => b.bm25_score - a.bm25_score);

    // Return top results with non-zero scores
    return results.filter(r => r.bm25_score > 0).slice(0, limit);
  }

  /**
   * Save index to disk
   */
  save(filepath) {
    const data = {
      documents: this.documents.map(doc => ({
        id: doc.id,
        text: doc.text,
        source: doc.source,
        source_type: doc.source_type,
        date: doc.date,
        chunk_index: doc.chunk_index,
        terms: doc.terms,
        termFrequency: Array.from(doc.termFrequency.entries()),
        docLength: doc.docLength
      })),
      docFrequency: Array.from(this.docFrequency.entries()),
      avgDocLength: this.avgDocLength,
      totalDocs: this.totalDocs
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`✓ BM25 index saved to ${filepath}`);
  }

  /**
   * Load index from disk
   */
  static load(filepath) {
    if (!fs.existsSync(filepath)) {
      throw new Error(`BM25 index not found at ${filepath}`);
    }

    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const index = new BM25Index();

    index.documents = data.documents.map(doc => ({
      ...doc,
      termFrequency: new Map(doc.termFrequency)
    }));
    index.docFrequency = new Map(data.docFrequency);
    index.avgDocLength = data.avgDocLength;
    index.totalDocs = data.totalDocs;

    console.log(`✓ BM25 index loaded: ${index.totalDocs} documents`);
    return index;
  }
}

/**
 * Reciprocal Rank Fusion (RRF)
 * Combines multiple ranked lists without requiring score normalization
 * 
 * Formula: RRF(d) = Σ 1/(k + rank(d))
 * where k is a constant (typically 60)
 */
function reciprocalRankFusion(rankedLists, k = 60) {
  const rrfScores = new Map();

  rankedLists.forEach(list => {
    list.forEach((item, rank) => {
      const id = item.id;
      const rrfScore = 1 / (k + rank + 1); // +1 because rank is 0-indexed
      rrfScores.set(id, (rrfScores.get(id) || 0) + rrfScore);
    });
  });

  return rrfScores;
}

/**
 * Weighted score fusion
 * Combines scores from different sources with configurable weights
 */
function weightedScoreFusion(results, vectorWeight = 0.5, bm25Weight = 0.5) {
  const fusedScores = new Map();

  results.forEach(result => {
    const vectorScore = result.vector_score || 0;
    const bm25Score = result.bm25_score || 0;
    
    // Normalize BM25 scores (0-1 range) for fair comparison
    const normalizedBM25 = bm25Score > 0 ? Math.min(bm25Score / 10, 1) : 0;
    
    const fusedScore = (vectorScore * vectorWeight) + (normalizedBM25 * bm25Weight);
    fusedScores.set(result.id, fusedScore);
  });

  return fusedScores;
}

/**
 * Max score fusion
 * Takes the maximum score from either source
 */
function maxScoreFusion(results) {
  const maxScores = new Map();

  results.forEach(result => {
    const vectorScore = result.vector_score || 0;
    const bm25Score = result.bm25_score || 0;
    const normalizedBM25 = bm25Score > 0 ? Math.min(bm25Score / 10, 1) : 0;
    
    const maxScore = Math.max(vectorScore, normalizedBM25);
    maxScores.set(result.id, maxScore);
  });

  return maxScores;
}

/**
 * Initialize LanceDB connection
 */
async function initializeVectorDB() {
  const db = await lancedb.connect(LANCE_DB_PATH);
  const table = await db.openTable(TABLE_NAME);
  return { db, table };
}

/**
 * Generate embedding for query using OpenAI
 */
async function generateEmbedding(text) {
  try {
    const client = getOpenAIClient();
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000)
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Vector search using LanceDB
 */
async function vectorSearch(table, query, limit = 20) {
  const queryEmbedding = await generateEmbedding(query);
  
  const results = await table
    .search(queryEmbedding)
    .limit(limit)
    .toArray();

  return results.map(result => ({
    id: result.id,
    text: result.text,
    source: result.source,
    source_type: result.source_type,
    date: result.date,
    chunk_index: result.chunk_index,
    vector_score: result._distance ? (1 - result._distance) : 0 // Convert distance to similarity
  }));
}

/**
 * Hybrid search: Combines vector search + BM25
 */
async function hybridSearch(table, bm25Index, query, options = {}) {
  const {
    limit = 8,
    minScore = 0.7,
    fusionMethod = 'rrf', // 'rrf', 'weighted', 'max'
    vectorWeight = 0.5,
    bm25Weight = 0.5,
    vectorLimit = 20,
    bm25Limit = 20
  } = options;

  const startTime = Date.now();

  // 1. Parallel search: Vector + BM25
  const [vectorResults, bm25Results] = await Promise.all([
    vectorSearch(table, query, vectorLimit),
    Promise.resolve(bm25Index.search(query, bm25Limit))
  ]);

  console.log(`  Vector: ${vectorResults.length} results, BM25: ${bm25Results.length} results`);

  // 2. Merge results by ID
  const mergedResults = new Map();
  
  vectorResults.forEach(result => {
    mergedResults.set(result.id, { ...result });
  });

  bm25Results.forEach(result => {
    if (mergedResults.has(result.id)) {
      mergedResults.get(result.id).bm25_score = result.bm25_score;
    } else {
      mergedResults.set(result.id, {
        id: result.id,
        text: result.text,
        source: result.source,
        source_type: result.source_type,
        date: result.date,
        chunk_index: result.chunk_index,
        vector_score: 0,
        bm25_score: result.bm25_score
      });
    }
  });

  const allResults = Array.from(mergedResults.values());

  // 3. Score fusion
  let fusedScores;
  
  if (fusionMethod === 'rrf') {
    // Reciprocal Rank Fusion
    const vectorRanked = vectorResults.map(r => ({ id: r.id }));
    const bm25Ranked = bm25Results.map(r => ({ id: r.id }));
    fusedScores = reciprocalRankFusion([vectorRanked, bm25Ranked]);
  } else if (fusionMethod === 'weighted') {
    fusedScores = weightedScoreFusion(allResults, vectorWeight, bm25Weight);
  } else if (fusionMethod === 'max') {
    fusedScores = maxScoreFusion(allResults);
  } else {
    throw new Error(`Unknown fusion method: ${fusionMethod}`);
  }

  // 4. Apply fused scores and sort
  allResults.forEach(result => {
    result.fused_score = fusedScores.get(result.id) || 0;
  });

  allResults.sort((a, b) => b.fused_score - a.fused_score);

  // 5. Filter by minimum score
  const filteredResults = allResults.filter(r => {
    // For RRF, use fused score directly
    // For weighted/max, can also check individual scores
    return r.fused_score > 0 && (r.vector_score > minScore || r.bm25_score > 0);
  });

  const elapsed = Date.now() - startTime;

  return {
    results: filteredResults.slice(0, limit),
    stats: {
      query_time_ms: elapsed,
      total_candidates: allResults.length,
      vector_results: vectorResults.length,
      bm25_results: bm25Results.length,
      fusion_method: fusionMethod,
      filtered_results: filteredResults.length,
      returned_results: Math.min(filteredResults.length, limit)
    }
  };
}

/**
 * Build BM25 index from LanceDB table
 */
async function buildBM25Index(table) {
  console.log('Building BM25 index from episodic memory...');
  
  // Fetch all documents from LanceDB
  const allDocs = await table.toArray();
  
  console.log(`Fetched ${allDocs.length} documents from vector database`);

  // Build BM25 index
  const bm25Index = new BM25Index();
  bm25Index.buildIndex(allDocs.map(doc => ({
    id: doc.id,
    text: doc.text,
    source: doc.source,
    source_type: doc.source_type,
    date: doc.date,
    chunk_index: doc.chunk_index
  })));

  // Save to disk
  bm25Index.save(BM25_INDEX_PATH);

  return bm25Index;
}

/**
 * Load or build BM25 index
 */
async function loadBM25Index(table, force = false) {
  if (!force && fs.existsSync(BM25_INDEX_PATH)) {
    try {
      return BM25Index.load(BM25_INDEX_PATH);
    } catch (error) {
      console.log('Failed to load BM25 index, rebuilding...');
    }
  }

  return await buildBM25Index(table);
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`
RAG Hybrid Search - Usage:

  node index.js search "query text" [options]
    Search using hybrid (vector + BM25) search
    Options:
      --fusion=rrf|weighted|max   Fusion method (default: rrf)
      --vector-weight=0.5          Vector score weight (weighted fusion)
      --bm25-weight=0.5            BM25 score weight (weighted fusion)
      --limit=8                    Max results to return
      --min-score=0.7              Minimum score threshold

  node index.js build-index [--force]
    Build BM25 index from episodic memory
    --force: Rebuild even if index exists

  node index.js compare "query text"
    Compare hybrid search vs vector-only search

  node index.js help
    Show this help message

Examples:
  node index.js search "optimization performance"
  node index.js search "Shawn preferences" --fusion=weighted --vector-weight=0.7
  node index.js compare "florist campaign"
  node index.js build-index --force
`);
    return;
  }

  try {
    const { db, table } = await initializeVectorDB();

    if (command === 'build-index') {
      const force = args.includes('--force');
      await buildBM25Index(table);
      console.log('\n✓ BM25 index build complete');
      return;
    }

    if (command === 'search') {
      const query = args[1];
      if (!query) {
        console.error('Error: Query text required');
        return;
      }

      // Parse options
      const options = {};
      args.slice(2).forEach(arg => {
        if (arg.startsWith('--fusion=')) {
          options.fusionMethod = arg.split('=')[1];
        } else if (arg.startsWith('--vector-weight=')) {
          options.vectorWeight = parseFloat(arg.split('=')[1]);
        } else if (arg.startsWith('--bm25-weight=')) {
          options.bm25Weight = parseFloat(arg.split('=')[1]);
        } else if (arg.startsWith('--limit=')) {
          options.limit = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--min-score=')) {
          options.minScore = parseFloat(arg.split('=')[1]);
        }
      });

      console.log(`\nSearching: "${query}"`);
      console.log(`Fusion method: ${options.fusionMethod || 'rrf'}\n`);

      const bm25Index = await loadBM25Index(table);
      const result = await hybridSearch(table, bm25Index, query, options);

      console.log(`\n=== HYBRID SEARCH RESULTS ===\n`);
      console.log(`Query time: ${result.stats.query_time_ms}ms`);
      console.log(`Total candidates: ${result.stats.total_candidates}`);
      console.log(`Vector results: ${result.stats.vector_results}, BM25 results: ${result.stats.bm25_results}`);
      console.log(`Returned: ${result.stats.returned_results} results\n`);

      result.results.forEach((r, i) => {
        console.log(`${i + 1}. [${r.source}] (fused: ${r.fused_score.toFixed(3)}, vec: ${r.vector_score.toFixed(3)}, bm25: ${r.bm25_score.toFixed(2)})`);
        console.log(`   ${r.text.substring(0, 150)}...\n`);
      });

      return;
    }

    if (command === 'compare') {
      const query = args[1];
      if (!query) {
        console.error('Error: Query text required');
        return;
      }

      console.log(`\nComparing search methods for: "${query}"\n`);

      const bm25Index = await loadBM25Index(table);

      // Vector-only search
      console.log('=== VECTOR-ONLY SEARCH ===');
      const vectorStart = Date.now();
      const vectorResults = await vectorSearch(table, query, 8);
      const vectorTime = Date.now() - vectorStart;
      console.log(`Time: ${vectorTime}ms, Results: ${vectorResults.length}\n`);
      vectorResults.slice(0, 3).forEach((r, i) => {
        console.log(`${i + 1}. [${r.source}] (score: ${r.vector_score.toFixed(3)})`);
        console.log(`   ${r.text.substring(0, 120)}...\n`);
      });

      // Hybrid search
      console.log('\n=== HYBRID SEARCH (RRF) ===');
      const hybridResult = await hybridSearch(table, bm25Index, query, { limit: 8 });
      console.log(`Time: ${hybridResult.stats.query_time_ms}ms, Results: ${hybridResult.stats.returned_results}\n`);
      hybridResult.results.slice(0, 3).forEach((r, i) => {
        console.log(`${i + 1}. [${r.source}] (fused: ${r.fused_score.toFixed(3)}, vec: ${r.vector_score.toFixed(3)}, bm25: ${r.bm25_score.toFixed(2)})`);
        console.log(`   ${r.text.substring(0, 120)}...\n`);
      });

      return;
    }

    console.error(`Unknown command: ${command}`);
    console.log('Run "node index.js help" for usage information');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = {
  BM25Index,
  reciprocalRankFusion,
  weightedScoreFusion,
  maxScoreFusion,
  hybridSearch,
  buildBM25Index,
  loadBM25Index,
  vectorSearch,
  generateEmbedding,
  initializeVectorDB
};

// Run CLI if called directly
if (require.main === module) {
  main();
}
