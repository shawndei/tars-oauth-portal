/**
 * Test Suite - Feedback Capture
 */

const assert = require('assert');
const { FeedbackCapture, SIGNAL_TYPES, LEARNING_CATEGORIES } = require('../feedback-capture');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Create temp workspace for testing
const tempWorkspace = path.join(os.tmpdir(), 'openclaw-test-' + Date.now());
fs.mkdirSync(tempWorkspace, { recursive: true });
fs.mkdirSync(path.join(tempWorkspace, 'memory'), { recursive: true });
fs.mkdirSync(path.join(tempWorkspace, 'skills', 'continuous-learning'), { recursive: true });

async function testFeedbackCapture() {
  console.log('🧪 Testing Feedback Capture...');
  
  const capture = new FeedbackCapture(tempWorkspace);
  
  // Test 1: Capture explicit correction
  const correction = capture.captureCorrection(
    'Use tables for data',
    'Actually, I prefer bullet lists',
    { messageId: 'msg1' }
  );
  
  assert.strictEqual(correction.type, 'EXPLICIT_CORRECTION', 'Should capture correction type');
  assert.strictEqual(correction.category, LEARNING_CATEGORIES.OUTPUT_FORMAT, 'Should categorize as output format');
  assert.strictEqual(correction.strength, 1.0, 'Should have maximum strength');
  console.log('✅ Explicit correction capture works');
  
  // Test 2: Capture preference statement
  const preference = capture.capturePreference(
    'I always want you to search memory first',
    { messageId: 'msg2' }
  );
  
  assert.strictEqual(preference.type, 'EXPLICIT_PREFERENCE', 'Should capture preference type');
  assert.strictEqual(preference.category, LEARNING_CATEGORIES.TOOL_PREFERENCES, 'Should categorize as tool preference');
  console.log('✅ Preference capture works');
  
  // Test 3: Capture positive reaction
  const reaction = capture.captureReaction('👍', 'msg3', {});
  
  assert.strictEqual(reaction.type, 'REACTION_POSITIVE', 'Should capture positive reaction');
  assert(reaction.strength > 0, 'Should have positive strength');
  console.log('✅ Reaction capture works');
  
  // Test 4: Capture negative reaction
  const negativeReaction = capture.captureReaction('👎', 'msg4', {});
  
  assert.strictEqual(negativeReaction.type, 'REACTION_NEGATIVE', 'Should capture negative reaction');
  assert(negativeReaction.strength < 0, 'Should have negative strength');
  console.log('✅ Negative reaction capture works');
  
  // Test 5: Capture follow-up request
  const followUp = capture.captureFollowUp(
    'Summarize this article',
    'Can you give me more detail on the methodology?',
    { messageId: 'msg5' }
  );
  
  assert.strictEqual(followUp.type, 'FOLLOW_UP_REQUEST', 'Should capture follow-up');
  assert(followUp.strength < 0, 'Follow-up should have negative strength (indicates unclear response)');
  console.log('✅ Follow-up request capture works');
  
  // Test 6: Signal storage
  const signals = capture.getSignals();
  assert.strictEqual(signals.length, 5, 'Should store all 5 signals');
  console.log('✅ Signal storage works');
  
  // Test 7: Save to memory
  await capture.saveToMemory();
  const memoryFile = path.join(tempWorkspace, 'memory', `${capture._getTodayDate()}.md`);
  assert(fs.existsSync(memoryFile), 'Should create memory file');
  console.log('✅ Save to memory works');
  
  console.log('✅ All Feedback Capture tests passed!');
}

async function testSignalCategorization() {
  console.log('🧪 Testing Signal Categorization...');
  
  const capture = new FeedbackCapture(tempWorkspace);
  
  // Test format correction
  const formatCorrection = capture.captureCorrection('', 'Use bullets not paragraphs', {});
  assert.strictEqual(formatCorrection.category, LEARNING_CATEGORIES.OUTPUT_FORMAT, 'Should categorize format correction');
  
  // Test depth correction
  const depthCorrection = capture.captureCorrection('', 'Give me more detail', {});
  assert.strictEqual(depthCorrection.category, LEARNING_CATEGORIES.CONTENT_DEPTH, 'Should categorize depth correction');
  
  // Test directness correction
  const directnessCorrection = capture.captureCorrection('', 'Be more concise and direct', {});
  assert.strictEqual(directnessCorrection.category, LEARNING_CATEGORIES.DIRECTNESS, 'Should categorize directness correction');
  
  // Test source correction
  const sourceCorrection = capture.captureCorrection('', 'Always cite your sources', {});
  assert.strictEqual(sourceCorrection.category, LEARNING_CATEGORIES.SOURCE_VERIFICATION, 'Should categorize source correction');
  
  console.log('✅ All Signal Categorization tests passed!');
}

// Run tests
(async () => {
  try {
    await testFeedbackCapture();
    await testSignalCategorization();
    console.log('\n✅ ALL FEEDBACK CAPTURE TESTS PASSED\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
})();
