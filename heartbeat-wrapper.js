/**
 * Heartbeat Wrapper - Integrates throttle into agent heartbeat loop
 * 
 * This wrapper:
 * 1. Intercepts all heartbeat triggers
 * 2. Applies throttle before execution
 * 3. Skips execution if throttle is active (<15 min since last)
 * 4. Logs all heartbeat activities
 * 
 * Integration points:
 * - Patch this into agent context before heartbeat loop starts
 * - Or call executeHeartbeat() instead of direct heartbeat logic
 */

const Throttle = require('./heartbeat-throttle');

/**
 * Throttled heartbeat executor
 * Replaces direct heartbeat calls
 */
async function executeHeartbeat(context) {
  const startMs = Date.now();
  
  // Check throttle
  const check = Throttle.shouldFireHeartbeat();
  
  console.log('[HEARTBEAT-WRAPPER] Heartbeat triggered');
  console.log(`[HEARTBEAT-WRAPPER] Throttle status: ${JSON.stringify(check)}`);
  
  if (!check.shouldFire) {
    const nextSeconds = Math.ceil((check.nextFireMs || 0) / 1000);
    console.log(
      `[HEARTBEAT-WRAPPER] ⏭ SKIPPED (throttle active, next in ${nextSeconds}s)`
    );
    
    return {
      executed: false,
      throttled: true,
      reason: check.reason,
      nextFireSeconds: nextSeconds,
      status: 'HEARTBEAT_SKIP'
    };
  }
  
  try {
    console.log('[HEARTBEAT-WRAPPER] 🔄 Executing heartbeat...');
    
    // Execute heartbeat logic (passed as context.fn or inline)
    let result = null;
    if (context.fn && typeof context.fn === 'function') {
      result = await context.fn(context);
    } else if (context.execute) {
      result = await context.execute();
    } else {
      console.warn('[HEARTBEAT-WRAPPER] No heartbeat function provided');
      result = { warning: 'no_heartbeat_fn' };
    }
    
    // Record successful heartbeat
    Throttle.recordHeartbeat();
    
    const elapsedMs = Date.now() - startMs;
    console.log(`[HEARTBEAT-WRAPPER] ✓ Heartbeat completed in ${elapsedMs}ms`);
    
    return {
      executed: true,
      throttled: false,
      status: 'HEARTBEAT_OK',
      elapsedMs,
      result
    };
    
  } catch (error) {
    const elapsedMs = Date.now() - startMs;
    console.error(
      `[HEARTBEAT-WRAPPER] ✗ Heartbeat failed after ${elapsedMs}ms: ${error.message}`
    );
    
    // Don't record on failure - let retry happen sooner
    return {
      executed: false,
      throttled: false,
      status: 'HEARTBEAT_ERROR',
      error: error.message,
      elapsedMs
    };
  }
}

/**
 * Create a heartbeat handler for agent context
 * Usage: agent.heartbeatHandler = createHeartbeatHandler(heartbeatLogic);
 */
function createHeartbeatHandler(heartbeatLogic) {
  return async function handler(context) {
    return executeHeartbeat({
      ...context,
      fn: heartbeatLogic
    });
  };
}

/**
 * Patch agent context with throttled heartbeat
 * Usage: patchAgentContext(agent);
 */
function patchAgentContext(agent) {
  if (!agent) {
    console.warn('[HEARTBEAT-WRAPPER] No agent context provided');
    return false;
  }
  
  // Store original heartbeat if it exists
  const originalHeartbeat = agent.heartbeat;
  
  // Replace with throttled version
  agent.heartbeat = async function(context) {
    return executeHeartbeat({
      ...context,
      fn: originalHeartbeat ? originalHeartbeat.bind(agent) : null
    });
  };
  
  console.log('[HEARTBEAT-WRAPPER] ✓ Agent context patched with throttled heartbeat');
  return true;
}

/**
 * Get heartbeat metrics
 */
function getMetrics() {
  const status = Throttle.getStatus();
  return {
    throttleEnabled: status.enabled,
    throttleSeconds: status.throttleSeconds,
    lastHeartbeat: status.lastHeartbeatIso,
    nextHeartbeatSeconds: status.nextFireMs ? Math.ceil(status.nextFireMs / 1000) : 0,
    shouldFireNow: status.shouldFire,
    reason: status.reason
  };
}

/**
 * CLI interface for heartbeat control
 */
function printStatus() {
  const status = Throttle.getStatus();
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('HEARTBEAT THROTTLE STATUS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Enabled:           ${status.enabled ? '✓ YES' : '✗ NO'}`);
  console.log(`  Throttle Interval: ${status.throttleSeconds} seconds`);
  console.log(`  Last Heartbeat:    ${status.lastHeartbeatIso}`);
  
  if (status.shouldFire) {
    console.log(`  Status:            🟢 READY TO FIRE`);
  } else {
    const nextSeconds = Math.ceil((status.nextFireMs || 0) / 1000);
    console.log(`  Status:            🔴 THROTTLED`);
    console.log(`  Time Since Last:   ${Math.round(status.timeSinceLastMs / 1000)}s`);
    console.log(`  Next Fire In:      ${nextSeconds}s`);
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

// Export API
module.exports = {
  executeHeartbeat,
  createHeartbeatHandler,
  patchAgentContext,
  getMetrics,
  printStatus,
  
  // Re-export throttle for direct access
  throttle: Throttle
};

console.log('[HEARTBEAT-WRAPPER] Module loaded. Ready to wrap heartbeat logic.');
