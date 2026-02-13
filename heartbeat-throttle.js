/**
 * Heartbeat Throttle Module
 * 
 * Prevents heartbeat flooding by enforcing a maximum frequency of once per 15 minutes.
 * Throttles regardless of sub-agent activity.
 * 
 * Usage:
 *   const throttle = require('./heartbeat-throttle');
 *   const shouldFire = throttle.shouldFireHeartbeat();
 *   if (shouldFire) {
 *     // Execute heartbeat logic
 *     throttle.recordHeartbeat();
 *   } else {
 *     console.log('HEARTBEAT_SKIP: Too soon since last heartbeat');
 *   }
 */

const fs = require('fs');
const path = require('path');

// Configuration
const THROTTLE_INTERVAL_SECONDS = 15 * 60; // 15 minutes
const STATE_FILE = path.join(
  process.env.OPENCLAW_WORKSPACE || __dirname,
  'heartbeat_state.json'
);

/**
 * Load heartbeat state from file
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`[HEARTBEAT-THROTTLE] Failed to load state: ${err.message}`);
  }
  return getDefaultState();
}

/**
 * Get default state structure
 */
function getDefaultState() {
  return {
    last_heartbeat_timestamp: null,
    last_heartbeat_iso: null,
    heartbeat_throttle_seconds: 900,
    heartbeat_throttle_enabled: true
  };
}

/**
 * Save state to file
 */
function saveState(state) {
  try {
    // Load current state to preserve other fields
    const current = loadState();
    const merged = { ...current, ...state };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[HEARTBEAT-THROTTLE] Failed to save state: ${err.message}`);
    return false;
  }
}

/**
 * Check if heartbeat should fire
 * Returns: { shouldFire: boolean, reason: string, timeSinceLastMs: number }
 */
function shouldFireHeartbeat() {
  const state = loadState();
  
  // If throttling is disabled, always fire
  if (!state.heartbeat_throttle_enabled) {
    return {
      shouldFire: true,
      reason: 'throttle_disabled',
      timeSinceLastMs: null
    };
  }
  
  const now = Date.now();
  const lastTimestamp = state.last_heartbeat_timestamp;
  
  // First heartbeat
  if (!lastTimestamp) {
    return {
      shouldFire: true,
      reason: 'first_heartbeat',
      timeSinceLastMs: 0
    };
  }
  
  const timeSinceLastMs = now - lastTimestamp;
  const throttleMs = (state.heartbeat_throttle_seconds || 900) * 1000;
  
  if (timeSinceLastMs >= throttleMs) {
    return {
      shouldFire: true,
      reason: 'interval_elapsed',
      timeSinceLastMs
    };
  }
  
  return {
    shouldFire: false,
    reason: 'throttle_active',
    timeSinceLastMs,
    nextFireMs: throttleMs - timeSinceLastMs
  };
}

/**
 * Record that a heartbeat has fired
 * Updates timestamp in state file
 */
function recordHeartbeat() {
  const now = Date.now();
  const isoNow = new Date(now).toISOString();
  
  const success = saveState({
    last_heartbeat_timestamp: now,
    last_heartbeat_iso: isoNow
  });
  
  if (success) {
    console.log(`[HEARTBEAT-THROTTLE] ✓ Heartbeat recorded at ${isoNow}`);
  }
  
  return success;
}

/**
 * Get current heartbeat status
 */
function getStatus() {
  const state = loadState();
  const check = shouldFireHeartbeat();
  
  return {
    enabled: state.heartbeat_throttle_enabled,
    throttleSeconds: state.heartbeat_throttle_seconds || 900,
    lastHeartbeatIso: state.last_heartbeat_iso || 'never',
    lastHeartbeatMs: state.last_heartbeat_timestamp || null,
    shouldFire: check.shouldFire,
    reason: check.reason,
    timeSinceLastMs: check.timeSinceLastMs,
    nextFireMs: check.nextFireMs || null
  };
}

/**
 * Force reset throttle (for testing/debugging)
 */
function resetThrottle() {
  saveState({
    last_heartbeat_timestamp: null,
    last_heartbeat_iso: null
  });
  console.log('[HEARTBEAT-THROTTLE] ⚠ Throttle reset for testing');
}

/**
 * Wrapper function: Execute heartbeat with automatic throttling
 * Usage: await executeHeartbeatWithThrottle(heartbeatFn)
 */
async function executeHeartbeatWithThrottle(heartbeatFn) {
  const check = shouldFireHeartbeat();
  
  if (!check.shouldFire) {
    const nextSeconds = Math.ceil((check.nextFireMs || 0) / 1000);
    console.log(
      `[HEARTBEAT-THROTTLE] Skipped (${check.reason}). ` +
      `Next heartbeat in ${nextSeconds}s.`
    );
    return {
      fired: false,
      reason: check.reason,
      nextFireSeconds: nextSeconds
    };
  }
  
  try {
    // Execute the actual heartbeat
    const result = await heartbeatFn();
    
    // Record successful heartbeat
    recordHeartbeat();
    
    return {
      fired: true,
      reason: 'executed',
      result
    };
  } catch (err) {
    console.error(`[HEARTBEAT-THROTTLE] Heartbeat execution failed: ${err.message}`);
    // Don't record on failure - let it retry sooner
    return {
      fired: false,
      reason: 'execution_error',
      error: err.message
    };
  }
}

// Export public API
module.exports = {
  shouldFireHeartbeat,
  recordHeartbeat,
  getStatus,
  resetThrottle,
  executeHeartbeatWithThrottle,
  THROTTLE_INTERVAL_SECONDS
};

console.log('[HEARTBEAT-THROTTLE] Module loaded. Max heartbeat frequency: once per 15 minutes.');
