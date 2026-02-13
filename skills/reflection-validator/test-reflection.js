/**
 * Reflection & Self-Correction Loop - Test Script
 * 
 * This script demonstrates the reflection system with real test cases.
 * Run with: node test-reflection.js --scenario=<scenario_name>
 */

const fs = require('fs');
const path = require('path');

// Load reflection patterns
const patternsPath = path.join(__dirname, 'reflection-patterns.json');
const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));

// Test scenarios
const scenarios = {
  basic: {
    name: 'Basic Reflection Test',
    question: 'What is the capital of France?',
    response: 'The capital of France is Paris.',
    expectedIssues: [],
    expectedOutcome: 'pass'
  },
  
  hallucination: {
    name: 'Hallucinated Statistics',
    question: 'Is TypeScript popular?',
    response: 'Yes, 87% of developers prefer TypeScript according to the 2023 Stack Overflow survey, and the median salary is $142,000.',
    expectedIssues: ['Uncited statistics', 'Specific claims without sources'],
    expectedOutcome: 'fail_then_revise'
  },
  
  incomplete: {
    name: 'Incomplete Answer',
    question: 'What is React and why should I use it?',
    response: 'React is a JavaScript library for building user interfaces.',
    expectedIssues: ['Only answered "what" but not "why"'],
    expectedOutcome: 'fail_then_revise'
  },
  
  unclear: {
    name: 'Overly Technical',
    question: 'How does OAuth work?',
    response: 'OAuth 2.0 implements an authorization framework whereby the resource owner delegates access to a client application through the authorization server, which issues access tokens validated by the resource server bearer token authentication scheme.',
    expectedIssues: ['Jargon heavy', 'No examples', 'Too complex'],
    expectedOutcome: 'fail_then_revise'
  },
  
  formatting: {
    name: 'WhatsApp Markdown Table',
    question: 'What are your pricing plans?',
    response: '# Pricing\n\n| Plan | Price |\n|------|-------|\n| Basic | $10 |',
    platform: 'whatsapp',
    expectedIssues: ['Markdown headers not supported', 'Tables not supported'],
    expectedOutcome: 'fail_then_revise'
  },
  
  confidence: {
    name: 'Confidence Scoring Test',
    tests: [
      {
        response: 'Hello! How can I help?',
        expectedConfidence: 'high',
        shouldReflect: false
      },
      {
        response: 'I think the answer is probably around 42, but I\'m not entirely sure.',
        expectedConfidence: 'low',
        shouldReflect: true
      },
      {
        response: 'According to the official documentation at example.com, the answer is X.',
        expectedConfidence: 'high',
        shouldReflect: false
      }
    ]
  }
};

// Confidence scoring function (simplified)
function calculateConfidence(response, context = {}) {
  let confidence = patterns.confidence_scoring.base_confidence;
  
  // Apply boosters
  patterns.confidence_scoring.boosters.forEach(booster => {
    if (booster.condition.includes('citations') && 
        (response.includes('According to') || response.includes('Source:'))) {
      confidence += booster.boost;
    }
    if (booster.condition.includes('greeting') && 
        response.length < 200 && 
        response.toLowerCase().includes('hello')) {
      confidence += booster.boost;
    }
  });
  
  // Apply penalties
  patterns.confidence_scoring.penalties.forEach(penalty => {
    if (penalty.condition.includes('hedging') && 
        (response.includes('I think') || response.includes('probably') || 
         response.includes('maybe'))) {
      confidence -= penalty.penalty;
    }
    if (penalty.condition.includes('unsure') && 
        (response.includes('unsure') || response.includes('not certain') || 
         response.includes('might be'))) {
      confidence -= penalty.penalty;
    }
  });
  
  return Math.max(0, Math.min(100, confidence));
}

// Critique function (simplified - in real implementation this would call LLM)
function critique(response, question, depth = 'medium') {
  const issues = [];
  
  // Accuracy check
  if (response.match(/\d+%/) && !response.includes('According to') && !response.includes('Source:')) {
    issues.push({
      type: 'accuracy',
      severity: 'high',
      message: 'Specific percentage without citation',
      suggestion: 'Add source or use approximate language'
    });
  }
  
  if (response.match(/\$[\d,]+/) && !response.includes('approximately') && !response.includes('around')) {
    issues.push({
      type: 'accuracy',
      severity: 'medium',
      message: 'Specific dollar amount without qualification',
      suggestion: 'Add approximation qualifier or cite source'
    });
  }
  
  // Completeness check
  if (question.includes('why') && !response.toLowerCase().includes('because') && 
      !response.includes('reason') && !response.includes('✓')) {
    issues.push({
      type: 'completeness',
      severity: 'high',
      message: 'Question asks "why" but response doesn\'t explain reasons',
      suggestion: 'Add explanation of reasoning or benefits'
    });
  }
  
  // Clarity check
  if (response.split(' ').length > 40 && !response.includes('\n')) {
    issues.push({
      type: 'clarity',
      severity: 'medium',
      message: 'Long response without structure',
      suggestion: 'Add bullet points or paragraphs for readability'
    });
  }
  
  // Check for overly long sentences
  const sentences = response.split(/[.!?]+/);
  sentences.forEach((sentence, idx) => {
    if (sentence.split(' ').length > 30) {
      issues.push({
        type: 'clarity',
        severity: 'medium',
        message: `Sentence ${idx + 1} is too long (${sentence.split(' ').length} words)`,
        suggestion: 'Break into shorter sentences'
      });
    }
  });
  
  // Formatting check
  if (response.includes('|') && response.includes('---')) {
    issues.push({
      type: 'formatting',
      severity: 'high',
      message: 'Markdown table detected',
      suggestion: 'Convert to bullet list for WhatsApp/Discord'
    });
  }
  
  if (response.startsWith('#')) {
    issues.push({
      type: 'formatting',
      severity: 'medium',
      message: 'Markdown header detected',
      suggestion: 'Use **bold** instead for WhatsApp'
    });
  }
  
  return {
    issues,
    passed: issues.length === 0,
    confidence: calculateConfidence(response)
  };
}

// Revision function (simplified)
function revise(response, issues) {
  let revised = response;
  
  issues.forEach(issue => {
    switch (issue.type) {
      case 'accuracy':
        // Remove specific percentages/numbers without citations
        revised = revised.replace(/(\d+)%/g, 'a significant percentage');
        revised = revised.replace(/\$[\d,]+/g, 'competitive compensation');
        if (!revised.includes('approximately') && !revised.includes('Based on')) {
          revised = 'Based on available information: ' + revised;
        }
        break;
      
      case 'completeness':
        if (issue.message.includes('why')) {
          revised += '\n\nBenefits include:\n• [Add specific benefits]\n• [Add more details]\n\nWould you like me to elaborate on any of these points?';
        }
        break;
      
      case 'clarity':
        if (issue.message.includes('too long')) {
          // Add line breaks for readability
          revised = revised.replace(/\. /g, '.\n\n');
        }
        break;
      
      case 'formatting':
        if (issue.message.includes('table')) {
          revised = revised.replace(/\|/g, '').replace(/---/g, '');
          revised = '**Pricing:**\n\n' + revised.split('\n').filter(line => line.trim()).map(line => '• ' + line.trim()).join('\n');
        }
        if (revised.startsWith('#')) {
          revised = revised.replace(/^# /, '**').replace(/\n/, '**\n');
        }
        break;
    }
  });
  
  return revised;
}

// Main reflection loop
function reflectionLoop(response, question, maxIterations = 2) {
  console.log('\n' + '='.repeat(80));
  console.log('REFLECTION LOOP STARTING');
  console.log('='.repeat(80));
  
  let currentResponse = response;
  let iteration = 0;
  
  console.log(`\n📝 Original Response:\n${response}\n`);
  console.log(`❓ Original Question: ${question}\n`);
  
  // Calculate initial confidence
  const initialConfidence = calculateConfidence(currentResponse);
  console.log(`🎯 Initial Confidence: ${initialConfidence}/100\n`);
  
  if (initialConfidence >= patterns.confidence_scoring.thresholds.skip_reflection) {
    console.log('✅ Confidence high enough - skipping reflection\n');
    return { final: currentResponse, iterations: 0, issues: [] };
  }
  
  const allIssues = [];
  
  while (iteration < maxIterations) {
    iteration++;
    console.log(`\n🔍 Iteration ${iteration}: Critiquing...\n`);
    
    const critiqueResult = critique(currentResponse, question);
    
    if (critiqueResult.issues.length === 0) {
      console.log('✅ No issues found - reflection complete\n');
      break;
    }
    
    console.log(`⚠️  Found ${critiqueResult.issues.length} issue(s):\n`);
    critiqueResult.issues.forEach((issue, idx) => {
      console.log(`${idx + 1}. [${issue.type.toUpperCase()}] ${issue.message}`);
      console.log(`   💡 Suggestion: ${issue.suggestion}\n`);
      allIssues.push(issue);
    });
    
    // Revise
    console.log(`🔧 Revising response...\n`);
    currentResponse = revise(currentResponse, critiqueResult.issues);
    
    console.log(`📝 Revised Response:\n${currentResponse}\n`);
  }
  
  const finalConfidence = calculateConfidence(currentResponse);
  console.log(`\n🎯 Final Confidence: ${finalConfidence}/100`);
  console.log(`🔄 Total Iterations: ${iteration}`);
  console.log(`📊 Total Issues Found: ${allIssues.length}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('REFLECTION LOOP COMPLETE');
  console.log('='.repeat(80) + '\n');
  
  return {
    final: currentResponse,
    iterations: iteration,
    issues: allIssues,
    initialConfidence,
    finalConfidence
  };
}

// Run tests
function runTest(scenarioName) {
  const scenario = scenarios[scenarioName];
  
  if (!scenario) {
    console.error(`❌ Unknown scenario: ${scenarioName}`);
    console.log('\nAvailable scenarios:');
    Object.keys(scenarios).forEach(name => console.log(`  - ${name}`));
    process.exit(1);
  }
  
  console.log(`\n🧪 Running Test: ${scenario.name}\n`);
  
  if (scenarioName === 'confidence') {
    // Special handling for confidence tests
    console.log('Testing confidence scoring...\n');
    scenario.tests.forEach((test, idx) => {
      console.log(`Test ${idx + 1}:`);
      console.log(`Response: "${test.response}"`);
      const confidence = calculateConfidence(test.response);
      const shouldReflect = confidence < patterns.confidence_scoring.thresholds.skip_reflection;
      console.log(`Confidence: ${confidence}/100`);
      console.log(`Should Reflect: ${shouldReflect}`);
      console.log(`Expected: ${test.expectedConfidence} confidence, should ${test.shouldReflect ? '' : 'NOT '}reflect`);
      
      const passed = (
        (test.expectedConfidence === 'high' && confidence >= 80) ||
        (test.expectedConfidence === 'low' && confidence < 50)
      ) && (shouldReflect === test.shouldReflect);
      
      console.log(passed ? '✅ PASS\n' : '❌ FAIL\n');
    });
    return;
  }
  
  const result = reflectionLoop(
    scenario.response,
    scenario.question,
    patterns.config.max_iterations
  );
  
  console.log('\n📋 Test Results:');
  console.log(`Expected Issues: ${scenario.expectedIssues.join(', ') || 'None'}`);
  console.log(`Found Issues: ${result.issues.map(i => i.message).join(', ') || 'None'}`);
  console.log(`Expected Outcome: ${scenario.expectedOutcome}`);
  
  const passed = scenario.expectedIssues.length === 0 
    ? result.issues.length === 0 
    : result.issues.length > 0;
  
  console.log(passed ? '\n✅ TEST PASSED' : '\n❌ TEST FAILED');
}

// CLI
const args = process.argv.slice(2);
const scenarioArg = args.find(arg => arg.startsWith('--scenario='));

if (!scenarioArg) {
  console.log('Usage: node test-reflection.js --scenario=<scenario_name>');
  console.log('\nAvailable scenarios:');
  Object.keys(scenarios).forEach(name => {
    console.log(`  - ${name}: ${scenarios[name].name || 'Confidence tests'}`);
  });
  process.exit(1);
}

const scenarioName = scenarioArg.split('=')[1];
runTest(scenarioName);
