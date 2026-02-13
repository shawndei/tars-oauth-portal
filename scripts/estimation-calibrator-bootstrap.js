#!/usr/bin/env node
/**
 * ESTIMATION CALIBRATOR BOOTSTRAP
 * 
 * Integrates the Estimation Calibrator System into OpenClaw's session lifecycle
 * Wires beforeSpawn() and afterComplete() hooks into sessions management
 * 
 * This module:
 * 1. Loads on OpenClaw startup
 * 2. Initializes the calibration model from persistent storage
 * 3. Intercepts session spawn events to apply estimates
 * 4. Intercepts session completion to update the Bayesian model
 * 5. Monitors accuracy metrics in real-time
 * 
 * Version: 1.0.0
 * Status: PRODUCTION LIVE
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG = {
  WORKSPACE: process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw/workspace'),
  DATA_DIR: path.join(process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw/workspace'), 'estimation-data'),
  SKILL_DIR: path.join(process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw/workspace'), 'skills/estimation-calibrator'),
  PERSISTENCE_FILE: path.join(process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw/workspace'), 'estimation-data/calibration.json'),
  HISTORY_FILE: path.join(process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw/workspace'), 'estimation-data/history.jsonl'),
  STATUS_FILE: path.join(process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw/workspace'), 'estimation-data/status.json'),
  VERBOSE: process.env.VERBOSE_CALIBRATION === 'true' || process.env.DEBUG === 'true'
};

// Global state
let calibrator = null;
let sessionHooks = null;
let stats = {
  spawned: 0,
  completed: 0,
  lastUpdate: null,
  modelAccuracy: null
};

/**
 * Initialize the estimation calibrator system
 */
function initializeCalibrator() {
  try {
    // Ensure data directory exists
    if (!fs.existsSync(CONFIG.DATA_DIR)) {
      fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
    }

    // Dynamically require the EstimationCalibrator skill
    let EstimationCalibrator;
    try {
      EstimationCalibrator = require(path.join(CONFIG.SKILL_DIR, 'index.js'));
    } catch (e) {
      console.error('❌ Failed to load EstimationCalibrator skill:', e.message);
      return false;
    }

    // Initialize calibrator instance
    calibrator = new EstimationCalibrator(CONFIG.DATA_DIR);
    
    // Ensure factors is initialized
    if (!calibrator.factors) {
      calibrator.factors = {
        'configuration': { mean: 0.10, std: 0.05, count: 0, confidence: 0.6, samples: [] },
        'research': { mean: 0.40, std: 0.08, count: 0, confidence: 0.6, samples: [] },
        'implementation': { mean: 0.45, std: 0.10, count: 0, confidence: 0.6, samples: [] },
        'debugging': { mean: 0.55, std: 0.15, count: 0, confidence: 0.6, samples: [] },
        'documentation': { mean: 0.20, std: 0.05, count: 0, confidence: 0.6, samples: [] },
        'mixed': { mean: 0.35, std: 0.12, count: 0, confidence: 0.6, samples: [] }
      };
    }
    
    // Load existing calibration data from disk
    loadCalibrationData();
    
    if (CONFIG.VERBOSE) {
      console.log('✅ [CALIBRATOR] Initialization complete');
      console.log(`   Data directory: ${CONFIG.DATA_DIR}`);
      console.log(`   Calibration file: ${CONFIG.PERSISTENCE_FILE}`);
      console.log(`   History file: ${CONFIG.HISTORY_FILE}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ [CALIBRATOR] Initialization failed:', error.message);
    return false;
  }
}

/**
 * Load calibration data from persistent storage
 */
function loadCalibrationData() {
  try {
    if (fs.existsSync(CONFIG.PERSISTENCE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.PERSISTENCE_FILE, 'utf8'));
      if (data && data.factors) {
        calibrator.factors = data.factors;
        if (CONFIG.VERBOSE) {
          console.log(`✅ [CALIBRATOR] Loaded calibration data with ${Object.keys(data.factors).length} task types`);
        }
      }
    }
  } catch (error) {
    console.error('⚠️  [CALIBRATOR] Failed to load calibration data:', error.message);
  }
}

/**
 * Save calibration data to persistent storage
 */
function saveCalibrationData() {
  try {
    if (!calibrator) return;
    
    const model = calibrator.getCalibrationModel();
    const data = {
      timestamp: new Date().toISOString(),
      factors: calibrator.factors,
      accuracy: model.overall_accuracy,
      samples_count: Object.values(calibrator.factors)
        .reduce((sum, f) => sum + (f.count || 0), 0)
    };
    
    fs.writeFileSync(CONFIG.PERSISTENCE_FILE, JSON.stringify(data, null, 2));
    
    if (CONFIG.VERBOSE) {
      console.log(`💾 [CALIBRATOR] Saved calibration data`);
    }
  } catch (error) {
    console.error('❌ [CALIBRATOR] Failed to save calibration data:', error.message);
  }
}

/**
 * HOOK: beforeSpawn
 * Called before a new session/agent is spawned
 * Applies calibrated time estimates
 */
function beforeSpawn(event) {
  if (!calibrator || !event) return event;

  try {
    stats.spawned++;

    // Extract estimate from event
    const estimate = event.estimate_hours || event.estimate || 1;
    const description = event.instructions || event.description || '';

    // Classify task type
    const taskType = classifyTask(description);

    // Apply calibration
    const calibration = calibrator.calibrate(estimate, taskType, { 
      confidence_min: 0.60 
    });

    // Store original for later comparison
    event._original_estimate = estimate;
    event._task_type = taskType;
    event._calibration = calibration;

    // Update ETA with calibrated prediction
    const oldEta = event.eta_message || `${estimate}h`;
    const newEta = formatEstimateMessage(calibration, estimate);

    if (CONFIG.VERBOSE) {
      console.log(`\n📊 [CALIBRATION APPLIED]`);
      console.log(`   Task: ${taskType}`);
      console.log(`   Original: ${estimate}h`);
      console.log(`   Predicted: ${calibration.predicted_actual_hours}h`);
      console.log(`   Confidence: ${(calibration.confidence * 100).toFixed(0)}%`);
      console.log(`   Range: ${calibration.confidence_intervals.optimistic.toFixed(2)}h - ${calibration.confidence_intervals.pessimistic.toFixed(2)}h`);
    }

    event.eta_message = newEta;
    saveStatus();

    return event;
  } catch (error) {
    console.error('❌ [CALIBRATOR] beforeSpawn error:', error.message);
    return event; // Return unchanged on error
  }
}

/**
 * HOOK: afterComplete
 * Called after a session/agent completes
 * Records actual time and updates Bayesian model
 */
function afterComplete(event) {
  if (!calibrator || !event) return event;

  try {
    // Only process successful completions with timing
    if (!event.duration_hours || event.status !== 'completed') {
      return event;
    }

    // Only process if we have original estimate (was a spawned task)
    if (!event._original_estimate) {
      return event;
    }

    stats.completed++;

    const estimate = event._original_estimate;
    const actual = event.duration_hours;
    const taskType = event._task_type || 'mixed';

    // Record the completion and get Bayesian learning
    const learning = calibrator.recordCompletion(
      event.session_id || `session_${Date.now()}`,
      estimate,
      actual,
      taskType,
      {
        model_used: event.model || 'unknown',
        status: event.status,
        output_tokens: event.output_tokens
      }
    );

    // Attach learning result
    event._learning = learning;

    if (CONFIG.VERBOSE) {
      console.log(`\n📈 [LEARNING RECORDED]`);
      console.log(`   Task: ${taskType}`);
      console.log(`   Estimate: ${estimate}h → Actual: ${actual}h`);
      console.log(`   Error: ${((actual - estimate) / estimate * 100).toFixed(0)}%`);
      console.log(`   Updated Factor: ${learning.updated_factor_mean.toFixed(3)}`);
      console.log(`   New Confidence: ${(learning.new_confidence * 100).toFixed(0)}%`);
    }

    // Save updated calibration
    saveCalibrationData();
    saveStatus();

    return event;
  } catch (error) {
    console.error('❌ [CALIBRATOR] afterComplete error:', error.message);
    return event;
  }
}

/**
 * Classify task type from description text
 */
function classifyTask(text) {
  if (!text) return 'mixed';
  
  const lower = text.toLowerCase();
  
  if (lower.match(/config|setup|install|deploy|environment/i)) {
    return 'configuration';
  }
  if (lower.match(/implement|build|develop|code|create|write|feature/i)) {
    return 'implementation';
  }
  if (lower.match(/research|analyze|investigate|explore|study/i)) {
    return 'research';
  }
  if (lower.match(/debug|fix|error|bug|crash|problem/i)) {
    return 'debugging';
  }
  if (lower.match(/document|write|readme|guide|explain/i)) {
    return 'documentation';
  }
  
  return 'mixed';
}

/**
 * Format estimate message for user display
 */
function formatEstimateMessage(calibration, original) {
  const pred = calibration.predicted_actual_hours.toFixed(1);
  const conf = (calibration.confidence * 100).toFixed(0);
  const factor = calibration.calibration_factor.toFixed(2);
  
  return `📊 Est: ${original}h → Predicted: ${pred}h (${conf}% confidence, factor: ${factor})`;
}

/**
 * Save status/statistics to file
 */
function saveStatus() {
  try {
    const model = calibrator ? calibrator.getCalibrationModel() : null;
    const status = {
      timestamp: new Date().toISOString(),
      spawned_count: stats.spawned,
      completed_count: stats.completed,
      integration_active: !!calibrator,
      model_accuracy: model ? model.overall_accuracy : null,
      task_types_tracked: calibrator && calibrator.factors ? Object.keys(calibrator.factors) : []
    };

    fs.writeFileSync(CONFIG.STATUS_FILE, JSON.stringify(status, null, 2));
  } catch (error) {
    // Silently fail on status write (non-critical)
  }
}

/**
 * EXPORT: Initialize and return hook handlers
 */
function initialize() {
  if (!initializeCalibrator()) {
    console.error('❌ Failed to initialize estimation calibrator');
    return null;
  }

  console.log('✅ [CALIBRATOR] System initialized and ready');
  console.log(`   📍 Location: ${CONFIG.WORKSPACE}`);
  console.log(`   🎯 Status: LIVE AND OPERATIONAL`);

  return {
    beforeSpawn,
    afterComplete,
    getStats: () => ({ ...stats, model: calibrator.getCalibrationModel() }),
    getCalibrator: () => calibrator
  };
}

/**
 * STARTUP HOOK - This executes on module load
 */
if (require.main === module) {
  console.log('\n🚀 [CALIBRATOR] Bootstrap starting...\n');
  const hooks = initialize();
  if (hooks) {
    console.log('\n✅ ESTIMATION CALIBRATOR SYSTEM LIVE\n');
    console.log('Ready to intercept and calibrate all session estimates.\n');
  } else {
    console.error('\n❌ ESTIMATION CALIBRATOR FAILED TO INITIALIZE\n');
  }
  // Keep process alive briefly to ensure init completes
  setTimeout(() => process.exit(hooks ? 0 : 1), 100);
}

module.exports = initialize();
