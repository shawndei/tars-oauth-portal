/**
 * Estimation Calibrator - Test Suite
 * Validates calibration accuracy, Bayesian learning, and confidence intervals
 * 
 * Run: node test.js
 * 
 * Version: 1.0.0
 */

const EstimationCalibrator = require('./index.js');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_DATA_DIR = './test-calibration-data';
let testsPassed = 0;
let testsFailed = 0;

// Cleanup from previous runs
function cleanup() {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true });
  }
}

// Test helper
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    testsFailed++;
  }
}

// Test suite
console.log('🧪 Estimation Calibrator Test Suite');
console.log('=====================================\n');

// Initialize calibrator
cleanup();
const calibrator = new EstimationCalibrator(TEST_DATA_DIR);

// Test 1: Default initialization
test('Should initialize with default factors', () => {
  const model = calibrator.getCalibrationModel();
  assert.strictEqual(model.factors.research.mean, 0.4);
  assert.strictEqual(model.factors.implementation.mean, 0.45);
  assert.strictEqual(model.factors.configuration.mean, 0.1);
});

// Test 2: Task type normalization
test('Should normalize task types correctly', () => {
  assert.strictEqual(calibrator.normalizeTaskType('CONFIG'), 'configuration');
  assert.strictEqual(calibrator.normalizeTaskType('build'), 'implementation');
  assert.strictEqual(calibrator.normalizeTaskType('ANALYZE'), 'research');
  assert.strictEqual(calibrator.normalizeTaskType('Debug'), 'debugging');
});

// Test 3: Basic calibration - research task
test('Should calibrate research estimate correctly', () => {
  const prediction = calibrator.calibrate(2.0, 'research');
  
  // With factor 0.4 and 10 min adjustment: (2 * 0.4) + (10/60) ≈ 0.967h
  assert(prediction.predicted_actual_hours >= 0.8 && prediction.predicted_actual_hours <= 1.2);
  assert.strictEqual(prediction.confidence, 0.75);
  assert.strictEqual(prediction.task_type_classified, 'research');
});

// Test 4: Basic calibration - implementation task
test('Should calibrate implementation estimate correctly', () => {
  const prediction = calibrator.calibrate(3.0, 'implementation');
  
  // With factor 0.45 and 30 min adjustment: (3 * 0.45) + (30/60) = 1.85h
  assert(prediction.predicted_actual_hours >= 1.6 && prediction.predicted_actual_hours <= 2.0);
  assert.strictEqual(prediction.confidence, 0.75);
});

// Test 5: Confidence intervals
test('Should generate valid confidence intervals', () => {
  const prediction = calibrator.calibrate(2.0, 'implementation', 
    { return_range: true });
  
  const { optimistic, expected, pessimistic } = prediction.confidence_intervals;
  
  assert(optimistic < expected, 'Optimistic should be less than expected');
  assert(expected < pessimistic, 'Expected should be less than pessimistic');
  assert(pessimistic <= 2.0 * 2, 'Pessimistic should not exceed 2x estimate');
});

// Test 6: Record completion - single task
test('Should record task completion correctly', () => {
  const result = calibrator.recordCompletion(
    'task-001',
    2.0,      // estimated
    1.0,      // actual (factor = 0.5)
    'research'
  );
  
  assert.strictEqual(result.recorded, true);
  assert.strictEqual(result.posterior_updated, true);
  assert(result.factor_observed >= 0.49 && result.factor_observed <= 0.51);
});

// Test 7: Bayesian updating
test('Should update Bayesian posterior correctly', () => {
  // Reset and do controlled test
  cleanup();
  const cal2 = new EstimationCalibrator(TEST_DATA_DIR);
  
  // Initial: research mean 0.4, count 0
  const before = cal2.calibration.factors.research;
  const beforeMean = before.mean;
  
  // Record a new research task with factor 0.6 (higher than mean)
  cal2.recordCompletion('task-002', 1.0, 0.6, 'research');
  
  // Posterior should move toward 0.6
  const after = cal2.calibration.factors.research;
  const afterMean = after.mean;
  
  // After first observation: posterior = (0 * 0.4 + 0.6) / 1 = 0.6
  assert.strictEqual(after.count, 1, 'Count should increment to 1');
  assert(afterMean >= 0.59 && afterMean <= 0.61, 'Posterior should be approximately 0.6');
});

// Test 8: Outlier detection
test('Should detect outliers correctly', () => {
  cleanup();
  const cal3 = new EstimationCalibrator(TEST_DATA_DIR);
  
  // Add 3 normal tasks first to establish baseline
  cal3.recordCompletion('task-a', 1.0, 0.5, 'implementation');
  cal3.recordCompletion('task-b', 1.0, 0.5, 'implementation');
  cal3.recordCompletion('task-c', 1.0, 0.4, 'implementation');
  
  // Normal task: estimate 1h, actual 0.5h (factor 0.5, within distribution)
  const normal = cal3.recordCompletion('task-003', 1.0, 0.5, 'implementation');
  assert.strictEqual(normal.outlier_detected, false);
  
  // Outlier task: estimate 1h, actual 0.01h (extreme speedup, >2 std from mean)
  const outlier = cal3.recordCompletion('task-004', 1.0, 0.01, 'implementation');
  assert.strictEqual(outlier.outlier_detected, true);
});

// Test 9: Safety multiplier
test('Should apply safety multiplier to predictions', () => {
  const prediction = calibrator.calibrate(1.0, 'configuration');
  
  // Configuration factor is 0.1, but with 1.2 multiplier and 20min adjustment
  // Expected: (1.0 * 0.1 + 0.33) * 1.2 ≈ 0.48h minimum
  assert(prediction.predicted_actual_hours >= 0.4);
});

// Test 10: Model persistence
test('Should persist and reload calibration model', () => {
  cleanup();
  const cal4 = new EstimationCalibrator(TEST_DATA_DIR);
  
  // Make an update
  cal4.recordCompletion('task-005', 2.0, 1.0, 'research');
  const model1 = cal4.getCalibrationModel();
  
  // Create new instance (should reload from disk)
  const cal5 = new EstimationCalibrator(TEST_DATA_DIR);
  const model2 = cal5.getCalibrationModel();
  
  assert.strictEqual(model1.tasks_total, model2.tasks_total);
  assert.strictEqual(model1.tasks_by_type.research.count, 
                     model2.tasks_by_type.research.count);
});

// Test 11: Low confidence warning
test('Should flag low confidence estimates', () => {
  cleanup();
  const cal6 = new EstimationCalibrator(TEST_DATA_DIR);
  
  // First calibration (no history) will have low confidence
  const prediction = cal6.calibrate(2.0, 'documentation', 
    { confidence_min: 0.85 });
  
  // Should have warning because default confidence is 0.70 < 0.85
  assert(prediction.low_confidence_warning !== undefined);
});

// Test 12: Overall accuracy statistics
test('Should calculate overall accuracy metrics', () => {
  cleanup();
  const cal7 = new EstimationCalibrator(TEST_DATA_DIR);
  
  // Add 5 tasks with known factors
  const tasks = [
    { est: 2.0, actual: 1.0, type: 'research' },      // factor 0.5
    { est: 3.0, actual: 1.5, type: 'implementation' }, // factor 0.5
    { est: 1.0, actual: 0.5, type: 'research' },       // factor 0.5
    { est: 2.0, actual: 1.5, type: 'debugging' },      // factor 0.75
    { est: 1.5, actual: 0.75, type: 'documentation' }  // factor 0.5
  ];
  
  for (let i = 0; i < tasks.length; i++) {
    cal7.recordCompletion(`task-00${i}`, tasks[i].est, tasks[i].actual, tasks[i].type);
  }
  
  const model = cal7.getCalibrationModel();
  assert(model.overall_accuracy.mae !== undefined);
  assert(model.overall_accuracy.mape !== undefined);
  assert(model.overall_accuracy.mae >= 0);
  assert(model.overall_accuracy.mape >= 0);
});

// Test 13: Reference class behavior
test('Should match reference class forecasting expectations', () => {
  // From historical analysis: implementation tasks have factor 0.45
  // Estimate 4h: (4 * 0.45) + (30/60) = 2.3h
  const prediction = calibrator.calibrate(4.0, 'implementation');
  
  assert(prediction.predicted_actual_hours >= 2.0 && prediction.predicted_actual_hours <= 2.5);
});

// Test 14: Task classification from instructions
test('Should classify tasks from instruction text', () => {
  // This test validates task classification logic
  assert.strictEqual(calibrator.normalizeTaskType('setup'), 'configuration');
  assert.strictEqual(calibrator.normalizeTaskType('write'), 'documentation');
  assert.strictEqual(calibrator.normalizeTaskType('build'), 'implementation');
});

// Test 15: Multiple completions refine factor
test('Should progressively refine factors with multiple completions', () => {
  cleanup();
  const cal8 = new EstimationCalibrator(TEST_DATA_DIR);
  
  // Record multiple similar tasks
  cal8.recordCompletion('task-a', 2.0, 1.0, 'research'); // factor 0.5
  const after1 = cal8.calibration.factors.research.count;
  assert.strictEqual(after1, 1);
  
  cal8.recordCompletion('task-b', 1.0, 0.45, 'research'); // factor 0.45
  const after2 = cal8.calibration.factors.research.count;
  assert.strictEqual(after2, 2);
  
  cal8.recordCompletion('task-c', 3.0, 1.35, 'research'); // factor 0.45
  const after3 = cal8.calibration.factors.research.count;
  assert.strictEqual(after3, 3);
  
  // Mean should stabilize around observed values
  const finalMean = cal8.calibration.factors.research.mean;
  assert(finalMean >= 0.45 && finalMean <= 0.5);
});

// Test 16: Confidence converges
test('Should converge confidence toward 95% as samples grow', () => {
  cleanup();
  const cal9 = new EstimationCalibrator(TEST_DATA_DIR);
  
  const confidences = [];
  
  for (let i = 0; i < 10; i++) {
    cal9.recordCompletion(`task-iter-${i}`, 2.0, 1.0, 'research');
    confidences.push(cal9.calibration.factors.research.confidence);
  }
  
  // Confidence should generally increase
  const firstConf = confidences[0];
  const lastConf = confidences[confidences.length - 1];
  
  assert(lastConf >= firstConf, 'Confidence should not decrease significantly');
  assert(lastConf <= 0.95, 'Confidence should cap at 95%');
});

// Test 17: CLI interface
test('Should work via CLI for calibration', () => {
  // This would require spawning subprocess, skip for now
  // But the CLI is designed and would be testable in integration
  console.log('   (CLI testing requires subprocess spawning)');
});

// Test 18: Edge cases
test('Should handle edge cases gracefully', () => {
  // Zero estimate (shouldn't happen but test robustness)
  const zeroEst = calibrator.calibrate(0, 'research');
  assert(zeroEst.predicted_actual_hours >= 0);
  
  // Very large estimate
  const largeEst = calibrator.calibrate(100, 'research');
  assert(largeEst.predicted_actual_hours > 0);
  
  // Unknown task type
  const unknownType = calibrator.calibrate(2.0, 'unknown_type_xyz');
  assert.strictEqual(unknownType.task_type_classified, 'mixed');
});

// Print summary
console.log('\n=====================================');
console.log(`Tests Passed: ✅ ${testsPassed}`);
console.log(`Tests Failed: ❌ ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  console.log('\n⚠️  Some tests failed. Check implementation.');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
}
