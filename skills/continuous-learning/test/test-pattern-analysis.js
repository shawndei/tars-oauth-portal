/**
 * Test Suite - Pattern Analysis
 */

const assert = require('assert');
const { PatternAnalysis, CONFIDENCE_THRESHOLDS } = require('../pattern-analysis');
const { FeedbackSignal, LEARNING_CATEGORIES } = require('../feedback-capture');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Create temp workspace for testing
const tempWorkspace = path.join(os.tmpdir(), 'openclaw-test-pattern-' + Date.now());
fs.mkdirSync(tempWorkspace, { recursive: true });
fs.mkdirSync(path.join(tempWorkspace, 'skills', 'continuous-learning'), { recursive: true });

async function testPatternInitialization() {
  console.log('🧪 Testing Pattern Initialization...');
  
  const analysis = new PatternAnalysis(tempWorkspace);
  await analysis.loadPatterns();
  
  assert(analysis.patterns !== null, 'Should initialize patterns');
  assert(analysis.patterns.preferences, 'Should have preferences object');
  assert(analysis.patterns.preferences.outputFormat, 'Should have outputFormat preference');
  assert.strictEqual(analysis.patterns.preferences.outputFormat.confidence, 0, 'Should start with 0 confidence');
  
  console.log('✅ Pattern initialization works');
}

async function testConfidenceCalculation() {
  console.log('🧪 Testing Confidence Calculation...');
  
  const analysis = new PatternAnalysis(tempWorkspace);
  
  // Test 1: All positive signals
  const conf1 = analysis.calculateConfidence(10, 0, 10);
  assert(conf1 > 0.9, 'All positive should give high confidence');
  console.log(`  All positive (10/10): ${(conf1 * 100).toFixed(1)}%`);
  
  // Test 2: Mixed signals
  const conf2 = analysis.calculateConfidence(7, 3, 10);
  assert(conf2 > 0.5 && conf2 < 0.8, 'Mixed signals should give moderate confidence');
  console.log(`  Mixed (7+/3-): ${(conf2 * 100).toFixed(1)}%`);
  
  // Test 3: Mostly negative
  const conf3 = analysis.calculateConfidence(2, 8, 10);
  assert(conf3 < 0.5, 'Mostly negative should give low confidence');
  console.log(`  Mostly negative (2+/8-): ${(conf3 * 100).toFixed(1)}%`);
  
  // Test 4: No data
  const conf4 = analysis.calculateConfidence(0, 0, 0);
  assert.strictEqual(conf4, 0, 'No data should give 0 confidence');
  console.log(`  No data: ${(conf4 * 100).toFixed(1)}%`);
  
  console.log('✅ Confidence calculation works');
}

async function testSignalProcessing() {
  console.log('🧪 Testing Signal Processing...');
  
  const analysis = new PatternAnalysis(tempWorkspace);
  await analysis.loadPatterns();
  
  // Create test signals
  const signals = [];
  
  // Add 5 positive signals for output format
  for (let i = 0; i < 5; i++) {
    signals.push(new FeedbackSignal(
      'EXPLICIT_PREFERENCE',
      LEARNING_CATEGORIES.OUTPUT_FORMAT,
      { preference: 'artifact-first' },
      {}
    ));
  }
  
  // Add 1 negative signal
  signals.push(new FeedbackSignal(
    'REACTION_NEGATIVE',
    LEARNING_CATEGORIES.OUTPUT_FORMAT,
    { emoji: '👎' },
    {}
  ));
  
  // Process signals
  const adaptations = await analysis.processSignals(signals);
  
  const outputFormatPref = analysis.patterns.preferences.outputFormat;
  assert(outputFormatPref.observations.total === 6, 'Should record 6 observations');
  assert(outputFormatPref.observations.positive > 0, 'Should have positive observations');
  assert(outputFormatPref.observations.negative > 0, 'Should have negative observations');
  assert(outputFormatPref.confidence > 0, 'Should have non-zero confidence');
  
  console.log(`  Processed 6 signals -> ${(outputFormatPref.confidence * 100).toFixed(1)}% confidence`);
  console.log('✅ Signal processing works');
}

async function testAdaptationThresholds() {
  console.log('🧪 Testing Adaptation Thresholds...');
  
  const analysis = new PatternAnalysis(tempWorkspace);
  await analysis.loadPatterns();
  
  // Test 1: Low confidence - should not adapt
  analysis.patterns.preferences.outputFormat.confidence = 0.6;
  assert(!analysis.shouldAdapt('outputFormat'), 'Should not adapt at 60% confidence');
  
  // Test 2: Moderate confidence - should adapt
  analysis.patterns.preferences.outputFormat.confidence = 0.8;
  assert(analysis.shouldAdapt('outputFormat'), 'Should adapt at 80% confidence');
  
  // Test 3: High confidence - should adapt
  analysis.patterns.preferences.outputFormat.confidence = 0.95;
  assert(analysis.shouldAdapt('outputFormat'), 'Should adapt at 95% confidence');
  
  console.log('✅ Adaptation threshold logic works');
}

async function testAdaptationHistory() {
  console.log('🧪 Testing Adaptation History...');
  
  const analysis = new PatternAnalysis(tempWorkspace);
  await analysis.loadPatterns();
  
  analysis.logAdaptation(
    'outputFormat',
    'Switched to artifact-first format',
    0.92,
    '10 observations'
  );
  
  assert(analysis.patterns.adaptationHistory.length > 0, 'Should record adaptation');
  const latest = analysis.patterns.adaptationHistory[analysis.patterns.adaptationHistory.length - 1];
  assert.strictEqual(latest.category, 'outputFormat', 'Should record correct category');
  assert.strictEqual(latest.confidence, 0.92, 'Should record confidence');
  
  console.log('✅ Adaptation history works');
}

async function testValidation() {
  console.log('🧪 Testing Adaptation Validation...');
  
  const analysis = new PatternAnalysis(tempWorkspace);
  await analysis.loadPatterns();
  
  // Set initial confidence
  analysis.patterns.preferences.outputFormat.confidence = 0.8;
  
  // Validate as successful
  await analysis.validateAdaptation('outputFormat', true);
  assert(analysis.patterns.preferences.outputFormat.confidence > 0.8, 'Successful validation should increase confidence');
  
  // Validate as failed
  const beforeFail = analysis.patterns.preferences.outputFormat.confidence;
  await analysis.validateAdaptation('outputFormat', false);
  assert(analysis.patterns.preferences.outputFormat.confidence < beforeFail, 'Failed validation should decrease confidence');
  
  console.log('✅ Validation works');
}

async function testHighConfidenceRetrieval() {
  console.log('🧪 Testing High Confidence Retrieval...');
  
  const analysis = new PatternAnalysis(tempWorkspace);
  await analysis.loadPatterns();
  
  // Set various confidence levels
  analysis.patterns.preferences.outputFormat.confidence = 0.95;
  analysis.patterns.preferences.directness.confidence = 0.85;
  analysis.patterns.preferences.communicationStyle.confidence = 0.60;
  
  const highConf = analysis.getHighConfidencePreferences(0.8);
  
  assert.strictEqual(highConf.length, 2, 'Should return 2 high-confidence preferences');
  assert(highConf.some(p => p.category === 'outputFormat'), 'Should include outputFormat');
  assert(highConf.some(p => p.category === 'directness'), 'Should include directness');
  
  console.log('✅ High confidence retrieval works');
}

// Run tests
(async () => {
  try {
    await testPatternInitialization();
    await testConfidenceCalculation();
    await testSignalProcessing();
    await testAdaptationThresholds();
    await testAdaptationHistory();
    await testValidation();
    await testHighConfidenceRetrieval();
    console.log('\n✅ ALL PATTERN ANALYSIS TESTS PASSED\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
})();
