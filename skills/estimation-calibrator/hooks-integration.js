/**
 * Hooks Integration for Estimation Calibrator
 * Intercepts sessions_spawn() and session_complete() events to apply calibration
 * 
 * Installation:
 * 1. Copy this file to .openclaw/hooks/ as estimation-calibrator.js
 * 2. Add hook reference to openclaw.json:
 *    "hooks": {
 *      "before:spawn": ["./hooks/estimation-calibrator.js::beforeSpawn"],
 *      "after:complete": ["./hooks/estimation-calibrator.js::afterComplete"]
 *    }
 * 
 * Version: 1.0.0
 */

const EstimationCalibrator = require('../skills/estimation-calibrator');
const path = require('path');

// Initialize calibrator singleton
const calibrator = new EstimationCalibrator(
  process.env.ESTIM_DATA_DIR || 
  path.join(process.env.OPENCLAW_HOME || './.openclaw', 'estimation-data')
);

/**
 * HOOK: Before spawning a sub-agent
 * Intercepts and applies calibrated estimate
 * 
 * Called by OpenClaw before sessions_spawn()
 * 
 * @param {object} event - Spawn event with estimate and task info
 * @returns {object} Modified event with calibrated estimate
 */
function beforeSpawn(event) {
  // Only process if estimate is provided
  if (!event.estimate_hours) {
    return event;
  }
  
  // Classify task from instructions/description
  const taskType = classifyTaskFromInstructions(event.instructions || event.description);
  
  // Get calibration
  const calibration = calibrator.calibrate(
    event.estimate_hours,
    taskType,
    { confidence_min: 0.75 }
  );
  
  // Store original estimate for later comparison
  event.original_estimate_hours = event.estimate_hours;
  event.estimated_task_type = calibration.task_type_classified;
  event.calibrated_prediction = calibration;
  
  // Replace ETA message with calibrated version
  const originalEta = event.eta_message || `Estimate: ${event.estimate_hours}h`;
  
  event.eta_message = 
    `📊 Estimate: ${calibration.estimate_hours}h ` +
    `(likely ${calibration.predicted_actual_hours}h, ` +
    `${Math.round(calibration.confidence * 100)}% confidence)`;
  
  // Log calibration for debugging
  if (process.env.VERBOSE_CALIBRATION) {
    console.log(`[CALIBRATION] ${event.eta_message}`);
    console.log(`  Original: ${originalEta}`);
    console.log(`  Factor: ${calibration.calibration_factor}`);
    console.log(`  Range: ${calibration.confidence_intervals.optimistic}h - ` +
                `${calibration.confidence_intervals.pessimistic}h`);
  }
  
  return event;
}

/**
 * HOOK: After session completion
 * Records actual time and updates calibration model via Bayesian learning
 * 
 * Called by OpenClaw after session completes
 * 
 * @param {object} event - Completion event with session metadata
 * @returns {object} Modified event with learning recorded
 */
function afterComplete(event) {
  // Only process successful completions with timing data
  if (!event.session_id || !event.duration_hours || 
      event.status !== 'completed') {
    return event;
  }
  
  // Only record if this was a spawned sub-agent (has original estimate)
  if (!event.original_estimate_hours) {
    return event;
  }
  
  // Assess task complexity from task description/results
  const complexity = assessComplexity(event);
  
  // Record completion and get learning update
  const learning = calibrator.recordCompletion(
    event.session_id,
    event.original_estimate_hours,
    event.duration_hours,
    event.estimated_task_type || 'mixed',
    {
      model_used: event.model || 'unknown',
      complexity: complexity,
      notes: event.description || ''
    }
  );
  
  // Attach learning metadata to event
  event.calibration_learning = learning;
  
  // Check if calibration needs recalibration warning
  const model = calibrator.getCalibrationModel();
  if (model.overall_accuracy.mape > 25) {
    event.calibration_warning = 
      `⚠️ Calibration drift detected (MAPE: ${model.overall_accuracy.mape}%). ` +
      `Recommend manual review.`;
  }
  
  // Log learning for debugging
  if (process.env.VERBOSE_CALIBRATION) {
    console.log(`[LEARNING] Task completed:`);
    console.log(`  Est: ${event.original_estimate_hours}h, Actual: ${event.duration_hours}h`);
    console.log(`  Factor: ${learning.factor_observed}`);
    console.log(`  Posterior: ${learning.updated_factor_mean}`);
    console.log(`  Confidence: ${learning.new_confidence}`);
    if (learning.outlier_detected) {
      console.log(`  ⚠️  OUTLIER DETECTED`);
    }
  }
  
  return event;
}

/**
 * Classify task type from instructions/description text
 * Uses simple keyword matching for rapid classification
 * 
 * @param {string} text - Instructions or task description
 * @returns {string} Classified task type
 */
function classifyTaskFromInstructions(text) {
  if (!text) return 'mixed';
  
  const lower = text.toLowerCase();
  
  // Configuration patterns
  if (lower.match(/config|setup|install|deploy|enable|disable|environment|api.?key|database/)) {
    return 'configuration';
  }
  
  // Implementation patterns
  if (lower.match(/implement|build|develop|code|write|create|feature|function|class/)) {
    return 'implementation';
  }
  
  // Research patterns
  if (lower.match(/research|analyze|investigate|explore|study|find|search|query|fetch/)) {
    return 'research';
  }
  
  // Debugging/fixing patterns
  if (lower.match(/debug|fix|error|bug|issue|crash|fail|problem|diagnose|broken/)) {
    return 'debugging';
  }
  
  // Documentation patterns
  if (lower.match(/document|write|explain|readme|guide|tutorial|comment|description/)) {
    return 'documentation';
  }
  
  return 'mixed';
}

/**
 * Assess task complexity from event metadata
 * 
 * @param {object} event - Completion event
 * @returns {string} Complexity level: 'low', 'medium', 'high', 'very_high'
 */
function assessComplexity(event) {
  // Simple heuristic: use estimate as proxy (Shawn tends optimistic on complex tasks)
  const estimate = event.original_estimate_hours || 1;
  const actual = event.duration_hours || 1;
  
  if (estimate <= 0.5) return 'low';
  if (estimate <= 2) return 'medium';
  if (estimate <= 6) return 'high';
  return 'very_high';
}

/**
 * Get current calibration model (for debugging/monitoring)
 * 
 * @returns {object} Full calibration state
 */
function getModel() {
  return calibrator.getCalibrationModel();
}

/**
 * Manually calibrate an estimate (for debugging)
 * 
 * @param {number} hours - Estimated hours
 * @param {string} taskType - Task type
 * @returns {object} Calibration prediction
 */
function calibrateDebug(hours, taskType = 'mixed') {
  return calibrator.calibrate(hours, taskType);
}

// Export hook functions
module.exports = {
  beforeSpawn,
  afterComplete,
  getModel,
  calibrateDebug,
  
  // Hook metadata for OpenClaw
  hooks: {
    'before:spawn': {
      handler: beforeSpawn,
      priority: 10, // Run early to modify estimate
      description: 'Calibrate task estimate using Bayesian factors'
    },
    'after:complete': {
      handler: afterComplete,
      priority: 5, // Run after other logging hooks
      description: 'Record completion and update calibration via Bayesian learning'
    }
  }
};

// CLI for debugging
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'test-classify') {
    const text = process.argv.slice(3).join(' ');
    console.log(`Classification: ${classifyTaskFromInstructions(text)}`);
  } else if (command === 'model') {
    console.log(JSON.stringify(getModel(), null, 2));
  } else if (command === 'calibrate') {
    const hours = parseFloat(process.argv[3]);
    const type = process.argv[4];
    console.log(JSON.stringify(calibrateDebug(hours, type), null, 2));
  } else {
    console.log('Estimation Calibrator Hooks Integration');
    console.log('Usage: node hooks-integration.js [test-classify|model|calibrate] ...');
    console.log('');
    console.log('Examples:');
    console.log('  node hooks-integration.js test-classify "Build a new feature"');
    console.log('  node hooks-integration.js model');
    console.log('  node hooks-integration.js calibrate 2 research');
  }
}
