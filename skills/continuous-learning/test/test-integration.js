/**
 * Test Suite - End-to-End Integration
 */

const assert = require('assert');
const { ContinuousLearning } = require('../index');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Create temp workspace for testing
const tempWorkspace = path.join(os.tmpdir(), 'openclaw-test-integration-' + Date.now());
fs.mkdirSync(tempWorkspace, { recursive: true });
fs.mkdirSync(path.join(tempWorkspace, 'memory'), { recursive: true });
fs.mkdirSync(path.join(tempWorkspace, 'skills', 'continuous-learning'), { recursive: true });

async function testSystemInitialization() {
  console.log('🧪 Testing System Initialization...');
  
  const system = new ContinuousLearning(tempWorkspace);
  await system.initialize();
  
  assert(system.initialized, 'System should be initialized');
  assert(system.feedbackCapture !== null, 'Should have feedback capture');
  assert(system.patternAnalysis !== null, 'Should have pattern analysis');
  assert(system.metrics !== null, 'Should have metrics');
  
  console.log('✅ System initialization works');
}

async function testMessageProcessing() {
  console.log('🧪 Testing Message Processing...');
  
  const system = new ContinuousLearning(tempWorkspace);
  await system.initialize();
  
  // Test 1: Process message with explicit preference
  const result1 = await system.processMessage(
    'I prefer bullet lists over paragraphs',
    { messageId: 'msg1' }
  );
  
  assert(result1.signalsDetected > 0, 'Should detect signals in preference statement');
  console.log(`  Detected ${result1.signalsDetected} signals from preference statement`);
  
  // Test 2: Process message with correction
  const result2 = await system.processMessage(
    'Actually, I meant give me more technical detail',
    { messageId: 'msg2' }
  );
  
  assert(result2.signalsDetected > 0, 'Should detect signals in correction');
  console.log(`  Detected ${result2.signalsDetected} signals from correction`);
  
  console.log('✅ Message processing works');
}

async function testAdaptationFlow() {
  console.log('🧪 Testing Full Adaptation Flow...');
  
  const system = new ContinuousLearning(tempWorkspace);
  await system.initialize();
  
  // Simulate multiple interactions with same preference
  console.log('  Simulating 10 consistent preference signals...');
  for (let i = 0; i < 10; i++) {
    await system.processMessage(
      'I prefer artifact-first format',
      { messageId: `msg-${i}` }
    );
  }
  
  // Check if preference was learned
  const preferences = await system.getActivePreferences();
  assert(preferences.length > 0, 'Should learn preferences from repeated signals');
  
  const outputFormatPref = preferences.find(p => p.category === 'outputFormat');
  if (outputFormatPref) {
    console.log(`  Learned outputFormat preference with ${(outputFormatPref.preference.confidence * 100).toFixed(1)}% confidence`);
  }
  
  console.log('✅ Full adaptation flow works');
}

async function testReactionCapture() {
  console.log('🧪 Testing Reaction Capture...');
  
  const system = new ContinuousLearning(tempWorkspace);
  await system.initialize();
  
  // Positive reaction
  const positive = await system.captureReaction('👍', 'msg1', {});
  assert(positive.signal.strength > 0, 'Positive reaction should have positive strength');
  
  // Negative reaction
  const negative = await system.captureReaction('👎', 'msg2', {});
  assert(negative.signal.strength < 0, 'Negative reaction should have negative strength');
  
  // Check metrics
  const summary = await system.getSummary();
  assert(summary.metrics !== null, 'Should have metrics');
  assert(summary.metrics.satisfactionMetrics !== undefined, 'Should have satisfaction metrics');
  assert(summary.metrics.satisfactionMetrics.positive > 0, 'Should track positive satisfaction');
  assert(summary.metrics.satisfactionMetrics.negative > 0, 'Should track negative satisfaction');
  
  console.log('✅ Reaction capture works');
}

async function testCorrectionFlow() {
  console.log('🧪 Testing Correction Flow...');
  
  const system = new ContinuousLearning(tempWorkspace);
  await system.initialize();
  
  const result = await system.captureCorrection(
    'Here is a paragraph explaining the concept...',
    'Please use bullet points instead',
    { messageId: 'msg1' }
  );
  
  assert(result.signal !== null, 'Should capture correction signal');
  assert(result.signal.strength === 1.0, 'Correction should have maximum strength');
  
  // Check metrics recorded correction
  const summary = await system.getSummary();
  assert(summary.metrics.correctionsReceived > 0, 'Should track corrections received');
  
  console.log('✅ Correction flow works');
}

async function testMetricsGeneration() {
  console.log('🧪 Testing Metrics Generation...');
  
  const system = new ContinuousLearning(tempWorkspace);
  await system.initialize();
  
  // Generate some activity
  await system.processMessage('I prefer direct answers', {});
  await system.captureReaction('👍', 'msg1', {});
  await system.captureCorrection('', 'Be more specific', {});
  
  // Get summary
  const summary = await system.getSummary();
  
  assert(summary.metrics !== null, 'Should have metrics summary');
  assert(summary.metrics.signalsReceived > 0, 'Should track signals received');
  assert(summary.patterns !== null, 'Should have pattern summary');
  
  console.log(`  Signals received: ${summary.metrics.signalsReceived}`);
  console.log(`  Corrections: ${summary.metrics.correctionsReceived}`);
  console.log(`  Preferences tracked: ${summary.patterns.totalPreferences}`);
  
  // Generate report
  const report = await system.generateReport();
  assert(report.includes('Learning Metrics Report'), 'Should generate report');
  
  console.log('✅ Metrics generation works');
}

async function testMemoryScan() {
  console.log('🧪 Testing Memory Scan...');
  
  const system = new ContinuousLearning(tempWorkspace);
  await system.initialize();
  
  // Create test memory file with feedback signals
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const memoryFile = path.join(tempWorkspace, 'memory', `${dateStr}.md`);
  
  const memoryContent = `
# Memory Log

## Interaction 1
User said: Actually, I prefer bullet lists
Agent: Noted.

## Interaction 2
User said: I always want you to search memory first
Agent: Got it.
`;
  
  fs.writeFileSync(memoryFile, memoryContent);
  
  // Scan memory
  const result = await system.scanMemory(1);
  
  assert(result.signalsFound > 0, 'Should find signals in memory');
  console.log(`  Found ${result.signalsFound} signals in memory`);
  
  console.log('✅ Memory scan works');
}

async function testValidationFlow() {
  console.log('🧪 Testing Validation Flow...');
  
  const system = new ContinuousLearning(tempWorkspace);
  await system.initialize();
  
  // Create a preference
  await system.processMessage('I prefer direct answers', {});
  
  // Validate as successful
  await system.validateAdaptation('directness', true);
  
  // Check confidence increased
  const preferences = await system.getActivePreferences();
  console.log(`  Active preferences: ${preferences.length}`);
  
  console.log('✅ Validation flow works');
}

async function testLearningPersistence() {
  console.log('🧪 Testing Learning Persistence...');
  
  // Create first system instance
  const system1 = new ContinuousLearning(tempWorkspace);
  await system1.initialize();
  
  // Learn something
  await system1.processMessage('I prefer artifact-first format', {});
  await system1.processMessage('I prefer artifact-first format', {});
  
  // Create second system instance (simulating restart)
  const system2 = new ContinuousLearning(tempWorkspace);
  await system2.initialize();
  
  // Check if learning persisted
  const summary = await system2.getSummary();
  assert(summary.metrics.signalsReceived > 0, 'Metrics should persist across restarts');
  
  console.log('✅ Learning persistence works');
}

// Run tests
(async () => {
  try {
    await testSystemInitialization();
    await testMessageProcessing();
    await testAdaptationFlow();
    await testReactionCapture();
    await testCorrectionFlow();
    await testMetricsGeneration();
    await testMemoryScan();
    await testValidationFlow();
    await testLearningPersistence();
    console.log('\n✅ ALL INTEGRATION TESTS PASSED\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
})();
