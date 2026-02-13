/**
 * Example Usage - Continuous Learning System
 * Demonstrates how to integrate with OpenClaw agent
 */

const { ContinuousLearning } = require('./index');
const path = require('path');

async function demonstrateUsage() {
  console.log('📚 Continuous Learning System - Usage Examples\n');
  
  // Initialize system with workspace path
  const workspacePath = process.cwd();
  const learning = new ContinuousLearning(workspacePath);
  await learning.initialize();
  
  console.log('✅ System initialized\n');
  
  // ============================================================
  // Example 1: Process user messages (auto-detect feedback)
  // ============================================================
  console.log('Example 1: Auto-detect feedback in messages');
  console.log('─'.repeat(60));
  
  const result1 = await learning.processMessage(
    'I prefer bullet lists over long paragraphs',
    { source: 'whatsapp', messageId: 'msg001' }
  );
  
  console.log(`Detected: ${result1.signalsDetected} signals`);
  console.log(`Applied: ${result1.adaptationsApplied} adaptations`);
  
  if (result1.adaptations.length > 0) {
    result1.adaptations.forEach(adaptation => {
      console.log(`  → ${adaptation.category}: ${(adaptation.newConfidence * 100).toFixed(1)}%`);
    });
  }
  console.log();
  
  // ============================================================
  // Example 2: Capture explicit corrections
  // ============================================================
  console.log('Example 2: Capture explicit correction');
  console.log('─'.repeat(60));
  
  const result2 = await learning.captureCorrection(
    'Here is a detailed explanation...',
    'Actually, just give me the TL;DR version',
    { messageId: 'msg002' }
  );
  
  console.log(`Signal type: ${result2.signal.type}`);
  console.log(`Category: ${result2.signal.category}`);
  console.log(`Strength: ${result2.signal.strength}`);
  console.log();
  
  // ============================================================
  // Example 3: Capture user reactions
  // ============================================================
  console.log('Example 3: Capture user reactions');
  console.log('─'.repeat(60));
  
  await learning.captureReaction('👍', 'msg003', {});
  await learning.captureReaction('👎', 'msg004', {});
  await learning.captureReaction('😕', 'msg005', {});
  
  console.log('Captured 3 reactions: 👍 👎 😕');
  console.log();
  
  // ============================================================
  // Example 4: Simulate learning over time
  // ============================================================
  console.log('Example 4: Simulate learning over multiple interactions');
  console.log('─'.repeat(60));
  
  // User consistently prefers artifact-first format
  for (let i = 0; i < 8; i++) {
    await learning.processMessage(
      'Great! I love when you give me the code first',
      { messageId: `msg${100 + i}` }
    );
  }
  
  const preferences = await learning.getActivePreferences();
  console.log(`Learned ${preferences.length} high-confidence preferences:`);
  
  preferences.forEach(pref => {
    console.log(`  → ${pref.category}: ${(pref.preference.confidence * 100).toFixed(1)}% confidence`);
  });
  console.log();
  
  // ============================================================
  // Example 5: Get learning summary
  // ============================================================
  console.log('Example 5: Learning summary');
  console.log('─'.repeat(60));
  
  const summary = await learning.getSummary();
  
  console.log('Pattern Summary:');
  console.log(`  Total preferences: ${summary.patterns.totalPreferences}`);
  console.log(`  High confidence: ${summary.patterns.highConfidence}`);
  console.log(`  Moderate confidence: ${summary.patterns.moderateConfidence}`);
  console.log(`  Low confidence: ${summary.patterns.lowConfidence}`);
  console.log(`  Average confidence: ${(summary.patterns.averageConfidence * 100).toFixed(1)}%`);
  
  console.log('\nMetrics Summary:');
  console.log(`  Signals received: ${summary.metrics.signalsReceived}`);
  console.log(`  Adaptations applied: ${summary.metrics.adaptationsApplied}`);
  console.log(`  Success rate: ${(summary.metrics.successRate * 100).toFixed(1)}%`);
  console.log(`  User satisfaction: ${(summary.metrics.satisfactionMetrics.rate * 100).toFixed(1)}%`);
  console.log();
  
  // ============================================================
  // Example 6: Scan episodic memory
  // ============================================================
  console.log('Example 6: Scan episodic memory for patterns');
  console.log('─'.repeat(60));
  
  const scanResult = await learning.scanMemory(7); // Last 7 days
  console.log(`Scanned memory and found: ${scanResult.signalsFound} signals`);
  
  if (scanResult.adaptations.length > 0) {
    console.log('New adaptations from memory:');
    scanResult.adaptations.forEach(adaptation => {
      console.log(`  → ${adaptation.category}: ${(adaptation.newConfidence * 100).toFixed(1)}%`);
    });
  }
  console.log();
  
  // ============================================================
  // Example 7: Validate adaptation success
  // ============================================================
  console.log('Example 7: Validate adaptation');
  console.log('─'.repeat(60));
  
  // Simulate successful adaptation
  await learning.validateAdaptation('outputFormat', true);
  console.log('✅ Adaptation validated as successful');
  console.log('   Confidence will increase slightly');
  
  // Simulate failed adaptation
  await learning.validateAdaptation('communicationStyle', false);
  console.log('❌ Adaptation validated as failed');
  console.log('   Confidence will decrease, may revert behavior');
  console.log();
  
  // ============================================================
  // Example 8: Generate metrics report
  // ============================================================
  console.log('Example 8: Generate comprehensive report');
  console.log('─'.repeat(60));
  
  const report = await learning.generateReport();
  console.log('Generated metrics report at:');
  console.log('  skills/continuous-learning/metrics-report.md');
  console.log();
  
  console.log('Report preview:');
  console.log(report.split('\n').slice(0, 15).join('\n'));
  console.log('  ...\n');
  
  // ============================================================
  // Integration with Agent Session
  // ============================================================
  console.log('Integration Pattern: Agent Session');
  console.log('─'.repeat(60));
  console.log(`
// In agent initialization:
const learning = new ContinuousLearning(workspacePath);
await learning.initialize();

// Apply learned preferences to response generation:
const preferences = await learning.getActivePreferences();
const outputFormat = preferences.find(p => p.category === 'outputFormat');
if (outputFormat && outputFormat.preference.confidence > 0.85) {
  // Use learned format preference
  useArtifactFirst = (outputFormat.preference.default === 'artifact_first');
}

// After each user message:
await learning.processMessage(userMessage, { messageId, source });

// On user reaction:
await learning.captureReaction(emoji, messageId, {});

// In heartbeat (periodic analysis):
const scanResult = await learning.scanMemory(1);
if (scanResult.adaptations.length > 0) {
  // Log new learnings to user
  notifyUserOfNewLearnings(scanResult.adaptations);
}
  `);
  
  console.log('\n✅ All examples completed!\n');
}

// Run examples
if (require.main === module) {
  demonstrateUsage().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { demonstrateUsage };
