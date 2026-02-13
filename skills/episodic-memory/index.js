#!/usr/bin/env node
/**
 * Episodic Memory System - Core Implementation
 * LanceDB-based vector search over TARS memory files
 * 
 * Features:
 * - Fast local vector search (<1s query time)
 * - Automatic indexing of memory files
 * - Semantic similarity search
 * - Metadata tracking (timestamp, source, context)
 * - Integration with OpenAI embeddings
 */

// Load environment variables from workspace/.env
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const lancedb = require('@lancedb/lancedb');

// Configuration
const WORKSPACE_PATH = process.env.OPENCLAW_WORKSPACE || path.join(process.env.USERPROFILE || process.env.HOME, '.openclaw', 'workspace');
const MEMORY_PATH = path.join(WORKSPACE_PATH, 'memory');
const LANCE_DB_PATH = path.join(WORKSPACE_PATH, '.episodic-memory-db');
const TABLE_NAME = 'episodic_memory';

// OpenAI client (uses OPENAI_API_KEY from environment)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Embedding configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const CHUNK_SIZE = 800; // Characters per chunk
const CHUNK_OVERLAP = 100; // Character overlap between chunks

/**
 * Initialize LanceDB connection and table
 */
async function initializeDB() {
  const db = await lancedb.connect(LANCE_DB_PATH);
  
  try {
    // Try to open existing table
    const table = await db.openTable(TABLE_NAME);
    return { db, table };
  } catch (error) {
    // Table doesn't exist, create it
    console.log('Creating new episodic memory table...');
    
    // Create with schema
    const table = await db.createTable(TABLE_NAME, [
      {
        id: 'init',
        text: 'Initialization entry',
        vector: Array(EMBEDDING_DIMENSIONS).fill(0),
        source: 'system',
        source_type: 'init',
        timestamp: new Date().toISOString(),
        date: '2026-01-01',
        chunk_index: 0,
        total_chunks: 1,
        metadata: JSON.stringify({})
      }
    ]);
    
    return { db, table };
  }
}

/**
 * Split text into overlapping chunks for better semantic coverage
 */
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    
    chunks.push({
      text: chunk,
      start_pos: start,
      end_pos: end
    });
    
    start += chunkSize - overlap;
  }
  
  return chunks;
}

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000) // OpenAI limit
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Generate embeddings in batches for efficiency
 */
async function generateEmbeddingsBatch(texts, batchSize = 100) {
  const embeddings = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(`Generating embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}...`);
    
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch.map(t => t.slice(0, 8000))
      });
      
      embeddings.push(...response.data.map(d => d.embedding));
    } catch (error) {
      console.error(`Error in batch ${i}:`, error.message);
      // Generate individually for this batch as fallback
      for (const text of batch) {
        try {
          const emb = await generateEmbedding(text);
          embeddings.push(emb);
        } catch (e) {
          console.error('Failed to generate embedding for text:', e.message);
          embeddings.push(Array(EMBEDDING_DIMENSIONS).fill(0));
        }
      }
    }
  }
  
  return embeddings;
}

/**
 * Parse memory file and extract metadata
 */
function parseMemoryFile(filePath, content) {
  const filename = path.basename(filePath);
  const isDaily = /^\d{4}-\d{2}-\d{2}\.md$/.test(filename);
  
  const metadata = {
    filename,
    file_size: content.length,
    is_daily_log: isDaily,
    sections: [],
    word_count: content.split(/\s+/).length
  };
  
  // Extract date from filename if daily log
  let date = null;
  if (isDaily) {
    date = filename.replace('.md', '');
  }
  
  // Extract sections (headers)
  const headerRegex = /^#{1,3}\s+(.+)$/gm;
  let match;
  while ((match = headerRegex.exec(content)) !== null) {
    metadata.sections.push(match[1]);
  }
  
  return { date, metadata };
}

/**
 * Index a single memory file
 */
async function indexMemoryFile(table, filePath) {
  console.log(`Indexing: ${path.basename(filePath)}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const { date, metadata } = parseMemoryFile(filePath, content);
  
  // Chunk the content
  const chunks = chunkText(content);
  
  // Generate embeddings for all chunks
  const texts = chunks.map(c => c.text);
  const embeddings = await generateEmbeddingsBatch(texts);
  
  // Prepare records for insertion
  const records = chunks.map((chunk, idx) => ({
    id: `${path.basename(filePath)}_chunk_${idx}`,
    text: chunk.text,
    vector: embeddings[idx],
    source: path.basename(filePath),
    source_type: path.basename(filePath) === 'MEMORY.md' ? 'long_term' : 'daily_log',
    timestamp: fs.statSync(filePath).mtime.toISOString(),
    date: date || 'unknown',
    chunk_index: idx,
    total_chunks: chunks.length,
    metadata: JSON.stringify({
      ...metadata,
      chunk_start: chunk.start_pos,
      chunk_end: chunk.end_pos
    })
  }));
  
  // Add records to table
  await table.add(records);
  
  console.log(`  ✓ Indexed ${chunks.length} chunks`);
  
  return records.length;
}

/**
 * Index all memory files
 */
async function indexAllMemory(table, force = false) {
  console.log('\n=== INDEXING MEMORY FILES ===\n');
  
  let totalChunks = 0;
  
  // Index MEMORY.md (long-term memory)
  const memoryMdPath = path.join(WORKSPACE_PATH, 'MEMORY.md');
  if (fs.existsSync(memoryMdPath)) {
    totalChunks += await indexMemoryFile(table, memoryMdPath);
  }
  
  // Index all daily logs in memory/ directory
  if (fs.existsSync(MEMORY_PATH)) {
    const files = fs.readdirSync(MEMORY_PATH)
      .filter(f => f.endsWith('.md') && /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse(); // Most recent first
    
    for (const file of files) {
      totalChunks += await indexMemoryFile(table, path.join(MEMORY_PATH, file));
    }
  }
  
  console.log(`\n✓ Indexing complete: ${totalChunks} total chunks indexed`);
  
  return totalChunks;
}

/**
 * Search episodic memory
 */
async function searchMemory(table, query, limit = 8, minScore = 0.5) {
  console.log(`\nSearching for: "${query}"`);
  
  const startTime = Date.now();
  
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // Perform vector search
  const results = await table
    .search(queryEmbedding)
    .limit(limit * 2) // Get more, then filter
    .toArray(); // Convert to array properly
  
  const searchTime = Date.now() - startTime;
  
  console.log(`Raw results count: ${results.length}`);
  if (results.length > 0) {
    console.log(`Sample distance:`, results[0]._distance);
    console.log(`Distance range:`, Math.min(...results.map(r => r._distance)), 'to', Math.max(...results.map(r => r._distance)));
  }
  
  // Filter by score and format results
  // LanceDB returns L2 distance (0 = perfect match, higher = less similar)
  // Convert distance to similarity score (0-1 range)
  const formattedResults = results
    .slice(0, limit)
    .map(r => ({
      text: r.text,
      source: r.source,
      source_type: r.source_type,
      date: r.date,
      chunk_index: r.chunk_index,
      distance: r._distance,
      score: Math.max(0, 1 - (r._distance / 2)), // Normalize L2 distance to 0-1 similarity
      timestamp: r.timestamp,
      metadata: JSON.parse(r.metadata)
    }));
  
  console.log(`✓ Found ${formattedResults.length} results in ${searchTime}ms`);
  
  return {
    query,
    results: formattedResults,
    search_time_ms: searchTime,
    total_found: formattedResults.length
  };
}

/**
 * Delete all indexed data (for re-indexing)
 */
async function clearIndex(db) {
  console.log('Clearing existing index...');
  
  try {
    await db.dropTable(TABLE_NAME);
    console.log('✓ Index cleared');
  } catch (error) {
    console.log('No existing index to clear');
  }
}

/**
 * Get database statistics
 */
async function getStats(table) {
  const count = await table.countRows();
  
  // Get unique sources
  const allRecords = await table.search(Array(EMBEDDING_DIMENSIONS).fill(0)).limit(10000).toArray();
  const sources = new Set(allRecords.map(r => r.source));
  
  return {
    total_chunks: count,
    unique_sources: sources.size,
    sources: Array.from(sources),
    db_path: LANCE_DB_PATH
  };
}

/**
 * CLI Interface
 */
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  try {
    const { db, table } = await initializeDB();
    
    switch (command) {
      case 'index':
        const force = args.includes('--force');
        if (force) {
          await clearIndex(db);
          const { table: newTable } = await initializeDB();
          await indexAllMemory(newTable, force);
        } else {
          await indexAllMemory(table, false);
        }
        break;
        
      case 'search':
        const query = args.join(' ');
        if (!query) {
          console.error('Error: Please provide a search query');
          process.exit(1);
        }
        const results = await searchMemory(table, query);
        console.log('\n=== SEARCH RESULTS ===\n');
        results.results.forEach((r, i) => {
          console.log(`${i + 1}. [${r.source}] (score: ${r.score.toFixed(3)})`);
          console.log(`   Date: ${r.date} | Chunk: ${r.chunk_index}`);
          console.log(`   ${r.text.slice(0, 200)}...`);
          console.log('');
        });
        break;
        
      case 'stats':
        const stats = await getStats(table);
        console.log('\n=== DATABASE STATISTICS ===\n');
        console.log(`Total chunks indexed: ${stats.total_chunks}`);
        console.log(`Unique sources: ${stats.unique_sources}`);
        console.log(`\nSources:`);
        stats.sources.forEach(s => console.log(`  - ${s}`));
        console.log(`\nDatabase location: ${stats.db_path}`);
        break;
        
      case 'clear':
        await clearIndex(db);
        break;
        
      default:
        console.log('Episodic Memory System - CLI');
        console.log('');
        console.log('Usage:');
        console.log('  node index.js index [--force]    Index all memory files');
        console.log('  node index.js search <query>     Search memory');
        console.log('  node index.js stats              Show database stats');
        console.log('  node index.js clear              Clear all indexed data');
        break;
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = {
  initializeDB,
  indexMemoryFile,
  indexAllMemory,
  searchMemory,
  getStats,
  clearIndex
};

// Run CLI if called directly
if (require.main === module) {
  main();
}
