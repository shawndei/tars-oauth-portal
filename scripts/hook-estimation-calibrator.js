#!/usr/bin/env node
/**
 * OpenClaw Hook - Estimation Calibrator Integration
 * 
 * This hook integrates the Estimation Calibrator into OpenClaw's session lifecycle.
 * It intercepts:
 * - before:spawn — applies calibrated estimates
 * - after:complete — records actual times and updates model
 * 
 * Automatically loaded by OpenClaw when hook registration is enabled
 */

const bootstrap = require('./estimation-calibrator-bootstrap.js');

// Export hook handlers for OpenClaw
if (bootstrap) {
  module.exports = {
    'before:spawn': bootstrap.beforeSpawn,
    'after:complete': bootstrap.afterComplete,
    'get:stats': bootstrap.getStats,
    'get:calibrator': bootstrap.getCalibrator
  };
} else {
  console.error('Failed to load estimation calibrator');
  module.exports = {};
}
