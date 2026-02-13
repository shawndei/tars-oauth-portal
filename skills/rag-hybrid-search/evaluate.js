#!/usr/bin/env node

/**
 * RAG Hybrid Search - Evaluation Script
 * 
 * Systematically measure retrieval quality metrics:
 * - Precision@k
 * - Recall@k
 * - Mean Reciprocal Rank (MRR)
 * - Mean Average Precision (MAP)
 * - NDCG@k
 */

const { search } = require('./index.js');
const fs = require('fs').promises;
const path = require('path');

// ============================================================================
// EVALUATION QUERIES & GROUND TRUTH
// ============================================================================

const EVAL_QUERIES = [
  {
    query: "rate limiting implementation details",
    relevantDocs: [
      "skills/rate-limiting/SKILL.md",
      "RATE_LIMITING_IMPLEMENTATION_SUMMARY.md",
      "rate-limits.json"
    ]
  },
  {
    query: "TARS optimization phases and results",
    relevantDocs: [
      "OPTIMIZATION_COMPLETE.md",
      "PERFORMANCE_OPTIMIZATION_COMPLETE.md",
      "OPTIMIZATION_ANALYSIS.md"
    ]
  },
  {
    query: "episodic memory system architecture",
    relevantDocs: [
      "skills/episodic-memory/SKILL.md",
      "EPISODIC_MEMORY_COMPLETE.md",
      ".episodic-memory-db"
    ]
  },
  {
    query: "webhook integration patterns",
    relevantDocs: [
      "skills/webhook-automation/SKILL.md",
      "skills/advanced-webhooks/SKILL.md",
      "webhook-config.json"
    ]
  },
  {
    query: "security hardening checklist",
    relevantDocs: [
      "skills/security-hardening/SKILL.md",
      "SECURITY_AUDIT_CHECKLIST.md",
      "SECURITY_HARDENING_SUMMARY.md"
    ]
  },
  {
    query: "performance benchmarking methodology",
    relevantDocs: [
      "PERFORMANCE_BENCHMARKING.md",
      "load-test-scenarios.json",
      "LOAD_TEST_RESULTS.md"
    ]
  },
  {
    query: "multi-agent orchestration design",
    relevantDocs: [
      "skills/multi-agent-orchestration/SKILL.md",
      "MULTI-AGENT-CONSOLIDATION-COMPLETE.md",
      "multi-agent-config.json"
    ]
  },
  {
    query: "calendar integration API",
    relevantDocs: [
      "skills/calendar-integration/SKILL.md",
      "CALENDAR_INTEGRATION_SUMMARY.md",
      "calendar-config.json"
    ]
  },
  {
    query: "error recovery mechanisms",
    relevantDocs: [
      "skills/error-recovery/SKILL.md",
      "skills/self-healing-recovery/SKILL.md",
      "ERROR_PATTERNS.md"
    ]
  },
  {
    query: "continuous learning pipeline",
    relevantDocs: [
      "skills/continuous-learning/SKILL.md",
      "CONTINUOUS_LEARNING_DEPLOYMENT.md",
      "learning-patterns.json"
    ]
  }
];

// ============================================================================
// EVALUATION METRICS
// ============================================================================

/**
 * Check if retrieved document is relevant
 */
function isRelevant(retrievedSource, relevantDocs) {
  return relevantDocs.some(doc => 
    retrievedSource.includes(doc) || doc.includes(retrievedSource)
  );
}

/**
 * Calculate Precision@k
 */
function precisionAtK(retrieved, relevant, k) {
  const topK = retrieved.slice(0, k);
  const relevantCount = topK.filter(r => isRelevant(r, relevant)).length;
  return relevantCount / Math.min(k, retrieved.length);
}

/**
 * Calculate Recall@k
 */
function recallAtK(retrieved, relevant, k) {
  const topK = retrieved.slice(0, k);
  const found = relevant.filter(rel => 
    topK.some(r => isRelevant(r, [rel]))
  ).length;
  return found / relevant.length;
}

/**
 * Calculate Mean Reciprocal Rank
 */
function meanReciprocalRank(retrieved, relevant) {
  const firstRelevantIndex = retrieved.findIndex(r => isRelevant(r, relevant));
  
  if (firstRelevantIndex === -1) return 0;
  return 1 / (firstRelevantIndex + 1);
}

/**
 * Calculate Average Precision
 */
function averagePrecision(retrieved, relevant) {
  let sumPrecision = 0;
  let relevantCount = 0;
  
  for (let k = 1; k <= retrieved.length; k++) {
    if (isRelevant(retrieved[k - 1], relevant)) {
      relevantCount++;
      sumPrecision += precisionAtK(retrieved, relevant, k);
    }
  }
  
  return relevantCount > 0 ? sumPrecision / relevant.length : 0;
}

/**
 * Calculate Discounted Cumulative Gain
 */
function dcg(retrieved, relevant, k) {
  let score = 0;
  
  for (let i = 0; i < Math.min(k, retrieved.length); i++) {
    const rel = isRelevant(retrieved[i], relevant) ? 1 : 0;
    score += rel / Math.log2(i + 2); // i+2 because log2(1) = 0
  }
  
  return score;
}

/**
 * Calculate Ideal DCG (best possible ranking)
 */
function idealDCG(numRelevant, k) {
  let score = 0;
  
  for (let i = 0; i < Math.min(k, numRelevant); i++) {
    score += 1 / Math.log2(i + 2);
  }
  
  return score;
}

/**
 * Calculate Normalized DCG
 */
function ndcgAtK(retrieved, relevant, k) {
  const dcgScore = dcg(retrieved, relevant, k);
  const idcgScore = idealDCG(relevant.length, k);
  
  return idcgScore > 0 ? dcgScore / idcgScore : 0;
}

// ============================================================================
// EVALUATION RUNNER
// ============================================================================

async function runEvaluation(options = {}) {
  const {
    k = 10,
    outputFile = 'evaluation-results.json',
    verbose = true
  } = options;
  
  console.log('\n' + '='.repeat(70));
  console.log('  RAG HYBRID SEARCH - QUALITY EVALUATION');
  console.log('='.repeat(70));
  console.log(`\nEvaluating ${EVAL_QUERIES.length} queries...\n`);
  
  const results = {
    timestamp: new Date().toISOString(),
    queries: [],
    aggregateMetrics: {
      precision_at_1: [],
      precision_at_5: [],
      precision_at_10: [],
      recall_at_5: [],
      recall_at_10: [],
      mrr: [],
      map: [],
      ndcg_at_5: [],
      ndcg_at_10: []
    }
  };
  
  for (let i = 0; i < EVAL_QUERIES.length; i++) {
    const { query, relevantDocs } = EVAL_QUERIES[i];
    
    if (verbose) {
      console.log(`[${i + 1}/${EVAL_QUERIES.length}] "${query}"`);
    }
    
    try {
      // Run search
      const startTime = Date.now();
      const searchResults = await search(query, { k, includeCitations: true });
      const latency = Date.now() - startTime;
      
      // Extract retrieved sources
      const retrieved = searchResults.results.map(r => r.source);
      
      // Calculate metrics
      const metrics = {
        precision_at_1: precisionAtK(retrieved, relevantDocs, 1),
        precision_at_5: precisionAtK(retrieved, relevantDocs, 5),
        precision_at_10: precisionAtK(retrieved, relevantDocs, 10),
        recall_at_5: recallAtK(retrieved, relevantDocs, 5),
        recall_at_10: recallAtK(retrieved, relevantDocs, 10),
        mrr: meanReciprocalRank(retrieved, relevantDocs),
        map: averagePrecision(retrieved, relevantDocs),
        ndcg_at_5: ndcgAtK(retrieved, relevantDocs, 5),
        ndcg_at_10: ndcgAtK(retrieved, relevantDocs, 10)
      };
      
      // Store results
      results.queries.push({
        query,
        relevantDocs,
        retrieved: retrieved.slice(0, 5), // Store top 5
        metrics,
        latency
      });
      
      // Add to aggregate
      Object.keys(metrics).forEach(metric => {
        results.aggregateMetrics[metric].push(metrics[metric]);
      });
      
      if (verbose) {
        console.log(`  P@1: ${metrics.precision_at_1.toFixed(2)} | P@5: ${metrics.precision_at_5.toFixed(2)} | R@5: ${metrics.recall_at_5.toFixed(2)} | MRR: ${metrics.mrr.toFixed(2)}`);
        console.log(`  Latency: ${latency}ms\n`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
      
      results.queries.push({
        query,
        relevantDocs,
        error: error.message
      });
    }
  }
  
  // Calculate averages
  const averages = {};
  Object.keys(results.aggregateMetrics).forEach(metric => {
    const values = results.aggregateMetrics[metric];
    averages[metric] = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  });
  
  results.averages = averages;
  
  // Print summary
  console.log('='.repeat(70));
  console.log('  AGGREGATE RESULTS');
  console.log('='.repeat(70));
  console.log('\n📊 Average Metrics:\n');
  console.log(`  Precision@1:  ${averages.precision_at_1.toFixed(3)}`);
  console.log(`  Precision@5:  ${averages.precision_at_5.toFixed(3)}`);
  console.log(`  Precision@10: ${averages.precision_at_10.toFixed(3)}`);
  console.log(`  Recall@5:     ${averages.recall_at_5.toFixed(3)}`);
  console.log(`  Recall@10:    ${averages.recall_at_10.toFixed(3)}`);
  console.log(`  MRR:          ${averages.mrr.toFixed(3)}`);
  console.log(`  MAP:          ${averages.map.toFixed(3)}`);
  console.log(`  NDCG@5:       ${averages.ndcg_at_5.toFixed(3)}`);
  console.log(`  NDCG@10:      ${averages.ndcg_at_10.toFixed(3)}`);
  
  // Quality assessment
  console.log('\n📈 Quality Assessment:\n');
  
  const assessments = [
    { metric: 'Precision@5', value: averages.precision_at_5, excellent: 0.80, good: 0.60 },
    { metric: 'Recall@5', value: averages.recall_at_5, excellent: 0.75, good: 0.50 },
    { metric: 'MRR', value: averages.mrr, excellent: 0.85, good: 0.70 },
    { metric: 'NDCG@5', value: averages.ndcg_at_5, excellent: 0.80, good: 0.65 }
  ];
  
  assessments.forEach(({ metric, value, excellent, good }) => {
    let status, rating;
    if (value >= excellent) {
      status = '✅';
      rating = 'Excellent';
    } else if (value >= good) {
      status = '⚠️';
      rating = 'Good';
    } else {
      status = '❌';
      rating = 'Needs improvement';
    }
    
    console.log(`  ${status} ${metric}: ${value.toFixed(3)} (${rating})`);
  });
  
  // Save results
  await fs.writeFile(
    path.join(__dirname, outputFile),
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\n💾 Results saved to: ${outputFile}`);
  console.log('='.repeat(70) + '\n');
  
  return results;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    k: args.includes('--k') ? parseInt(args[args.indexOf('--k') + 1]) : 10,
    verbose: !args.includes('--quiet'),
    outputFile: args.includes('--output') 
      ? args[args.indexOf('--output') + 1]
      : 'evaluation-results.json'
  };
  
  const results = await runEvaluation(options);
  
  // Exit with error code if quality is poor
  if (results.averages.precision_at_5 < 0.60 || results.averages.mrr < 0.70) {
    console.error('⚠️  Quality metrics below acceptable threshold');
    process.exit(1);
  }
  
  console.log('✅ Quality evaluation complete');
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Evaluation failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runEvaluation,
  precisionAtK,
  recallAtK,
  meanReciprocalRank,
  averagePrecision,
  ndcgAtK
};
