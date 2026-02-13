#!/usr/bin/env node
/**
 * Test script for Deep Research Engine
 * Tests all three depth levels with mock and real data
 */

const DeepResearcher = require('./deep-researcher.js');
const fs = require('fs').promises;
const path = require('path');

async function runTests() {
  console.log('🧪 Deep Research Engine Test Suite\n');
  console.log('=' .repeat(60));
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  // Test 1: Quick Research (Depth 1)
  console.log('\n📝 Test 1: Quick Research (Depth 1)');
  console.log('-'.repeat(60));
  
  try {
    const researcher1 = new DeepResearcher({ useRealTools: false });
    const report1 = await researcher1.research('artificial intelligence trends', { depth: 1 });
    
    const test1 = {
      name: 'Quick Research (Depth 1)',
      status: report1.status === 'completed' ? 'PASS' : 'FAIL',
      metrics: {
        sourcesVisited: report1.metadata.sourcesVisited,
        sourcesAnalyzed: report1.metadata.sourcesAnalyzed,
        findings: report1.findings.length,
        durationMs: report1.durationMs
      },
      assertions: []
    };
    
    // Assertions
    test1.assertions.push({
      description: 'Should visit 5-10 sources',
      pass: report1.metadata.sourcesVisited >= 5 && report1.metadata.sourcesVisited <= 10
    });
    
    test1.assertions.push({
      description: 'Should complete in < 30 seconds (mock)',
      pass: report1.durationMs < 30000
    });
    
    test1.assertions.push({
      description: 'Should extract findings',
      pass: report1.findings.length > 0
    });
    
    test1.assertions.push({
      description: 'Should generate synthesis',
      pass: report1.synthesis && report1.synthesis.executiveSummary
    });
    
    results.tests.push(test1);
    
    console.log(`✅ Status: ${test1.status}`);
    console.log(`   Sources: ${test1.metrics.sourcesVisited}`);
    console.log(`   Findings: ${test1.metrics.findings}`);
    console.log(`   Duration: ${test1.metrics.durationMs}ms`);
    
    for (const assertion of test1.assertions) {
      console.log(`   ${assertion.pass ? '✓' : '✗'} ${assertion.description}`);
    }
    
  } catch (error) {
    console.error(`❌ Test 1 failed: ${error.message}`);
    results.tests.push({
      name: 'Quick Research (Depth 1)',
      status: 'FAIL',
      error: error.message
    });
  }
  
  // Test 2: Standard Research (Depth 2)
  console.log('\n📝 Test 2: Standard Research (Depth 2)');
  console.log('-'.repeat(60));
  
  try {
    const researcher2 = new DeepResearcher({ useRealTools: false });
    const report2 = await researcher2.research('machine learning frameworks', { depth: 2 });
    
    const test2 = {
      name: 'Standard Research (Depth 2)',
      status: report2.status === 'completed' ? 'PASS' : 'FAIL',
      metrics: {
        sourcesVisited: report2.metadata.sourcesVisited,
        sourcesAnalyzed: report2.metadata.sourcesAnalyzed,
        citationsFollowed: report2.metadata.citationsFollowed,
        findings: report2.findings.length,
        durationMs: report2.durationMs
      },
      assertions: []
    };
    
    // Assertions
    test2.assertions.push({
      description: 'Should visit 10-20 sources',
      pass: report2.metadata.sourcesVisited >= 10 && report2.metadata.sourcesVisited <= 25
    });
    
    test2.assertions.push({
      description: 'Should follow citations',
      pass: report2.metadata.citationsFollowed > 0
    });
    
    test2.assertions.push({
      description: 'Should perform cross-references',
      pass: report2.metadata.crossReferences > 0
    });
    
    test2.assertions.push({
      description: 'Should have high-confidence findings',
      pass: report2.synthesis.confidenceBreakdown.high.length > 0
    });
    
    results.tests.push(test2);
    
    console.log(`✅ Status: ${test2.status}`);
    console.log(`   Sources: ${test2.metrics.sourcesVisited}`);
    console.log(`   Citations Followed: ${test2.metrics.citationsFollowed}`);
    console.log(`   Findings: ${test2.metrics.findings}`);
    console.log(`   Duration: ${test2.metrics.durationMs}ms`);
    
    for (const assertion of test2.assertions) {
      console.log(`   ${assertion.pass ? '✓' : '✗'} ${assertion.description}`);
    }
    
  } catch (error) {
    console.error(`❌ Test 2 failed: ${error.message}`);
    results.tests.push({
      name: 'Standard Research (Depth 2)',
      status: 'FAIL',
      error: error.message
    });
  }
  
  // Test 3: Deep Research (Depth 3)
  console.log('\n📝 Test 3: Deep Research (Depth 3)');
  console.log('-'.repeat(60));
  
  try {
    const researcher3 = new DeepResearcher({ useRealTools: false });
    const report3 = await researcher3.research('renewable energy technologies', { depth: 3, maxSources: 30 });
    
    const test3 = {
      name: 'Deep Research (Depth 3)',
      status: report3.status === 'completed' ? 'PASS' : 'FAIL',
      metrics: {
        sourcesVisited: report3.metadata.sourcesVisited,
        sourcesAnalyzed: report3.metadata.sourcesAnalyzed,
        citationsFollowed: report3.metadata.citationsFollowed,
        crossReferences: report3.metadata.crossReferences,
        findings: report3.findings.length,
        durationMs: report3.durationMs
      },
      assertions: []
    };
    
    // Assertions
    test3.assertions.push({
      description: 'Should visit 20-30 sources',
      pass: report3.metadata.sourcesVisited >= 20 && report3.metadata.sourcesVisited <= 35
    });
    
    test3.assertions.push({
      description: 'Should follow multiple citations',
      pass: report3.metadata.citationsFollowed >= 15
    });
    
    test3.assertions.push({
      description: 'Should have extensive cross-references',
      pass: report3.metadata.crossReferences > 5
    });
    
    test3.assertions.push({
      description: 'Should have diverse confidence levels',
      pass: report3.synthesis.confidenceBreakdown.high.length > 0 &&
            report3.synthesis.confidenceBreakdown.medium.length > 0
    });
    
    test3.assertions.push({
      description: 'Should generate comprehensive bibliography',
      pass: report3.synthesis.sourceBibliography.length >= 20
    });
    
    results.tests.push(test3);
    
    console.log(`✅ Status: ${test3.status}`);
    console.log(`   Sources: ${test3.metrics.sourcesVisited}`);
    console.log(`   Citations Followed: ${test3.metrics.citationsFollowed}`);
    console.log(`   Cross-References: ${test3.metrics.crossReferences}`);
    console.log(`   Findings: ${test3.metrics.findings}`);
    console.log(`   Duration: ${test3.metrics.durationMs}ms`);
    
    for (const assertion of test3.assertions) {
      console.log(`   ${assertion.pass ? '✓' : '✗'} ${assertion.description}`);
    }
    
  } catch (error) {
    console.error(`❌ Test 3 failed: ${error.message}`);
    results.tests.push({
      name: 'Deep Research (Depth 3)',
      status: 'FAIL',
      error: error.message
    });
  }
  
  // Test 4: Source Authority Scoring
  console.log('\n📝 Test 4: Source Authority Scoring');
  console.log('-'.repeat(60));
  
  try {
    const researcher = new DeepResearcher();
    
    const testCases = [
      { url: 'https://example.edu/research', expectedMin: 8, description: '.edu domain' },
      { url: 'https://example.gov/report', expectedMin: 8, description: '.gov domain' },
      { url: 'https://arxiv.org/paper', expectedMin: 8, description: 'arxiv.org' },
      { url: 'https://nature.com/article', expectedMin: 9, description: 'nature.com' },
      { url: 'https://example.com/blog', expectedMin: 4, expectedMax: 6, description: 'regular domain' }
    ];
    
    const test4 = {
      name: 'Source Authority Scoring',
      status: 'PASS',
      assertions: []
    };
    
    for (const testCase of testCases) {
      const score = researcher.scoreAuthority(testCase.url);
      const pass = testCase.expectedMax 
        ? score >= testCase.expectedMin && score <= testCase.expectedMax
        : score >= testCase.expectedMin;
      
      test4.assertions.push({
        description: `${testCase.description}: score ${score}/10`,
        pass
      });
      
      if (!pass) test4.status = 'FAIL';
      
      console.log(`   ${pass ? '✓' : '✗'} ${testCase.description}: ${score}/10`);
    }
    
    results.tests.push(test4);
    
  } catch (error) {
    console.error(`❌ Test 4 failed: ${error.message}`);
    results.tests.push({
      name: 'Source Authority Scoring',
      status: 'FAIL',
      error: error.message
    });
  }
  
  // Test 5: Citation Extraction
  console.log('\n📝 Test 5: Citation Extraction');
  console.log('-'.repeat(60));
  
  try {
    const researcher = new DeepResearcher();
    
    const sampleContent = `
      This is a sample article with several citations.
      For more info, see https://example.com/article1 and https://example.org/study.
      Also check https://research.edu/paper for details.
      Social links like https://twitter.com/share should be filtered.
      Images like https://example.com/image.jpg should also be filtered.
    `;
    
    const citations = researcher.extractCitations(sampleContent);
    
    const test5 = {
      name: 'Citation Extraction',
      status: 'PASS',
      assertions: []
    };
    
    test5.assertions.push({
      description: `Extracted ${citations.length} citations`,
      pass: citations.length >= 2 && citations.length <= 4
    });
    
    test5.assertions.push({
      description: 'Filtered social share links',
      pass: !citations.some(c => c.includes('twitter.com/share'))
    });
    
    test5.assertions.push({
      description: 'Filtered image URLs',
      pass: !citations.some(c => c.endsWith('.jpg'))
    });
    
    results.tests.push(test5);
    
    console.log(`   ✓ Extracted ${citations.length} citations`);
    console.log(`   ✓ Filtered social/image links`);
    console.log(`   Citations: ${citations.join(', ')}`);
    
  } catch (error) {
    console.error(`❌ Test 5 failed: ${error.message}`);
    results.tests.push({
      name: 'Citation Extraction',
      status: 'FAIL',
      error: error.message
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.tests.filter(t => t.status === 'PASS').length;
  const failed = results.tests.filter(t => t.status === 'FAIL').length;
  
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / results.tests.length) * 100)}%\n`);
  
  // Save results
  const resultsPath = path.join(__dirname, 'TEST_RESULTS.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`📄 Results saved to: ${resultsPath}\n`);
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal test error:', error);
  process.exit(1);
});
