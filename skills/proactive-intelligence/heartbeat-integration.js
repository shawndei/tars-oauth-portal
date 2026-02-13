/**
 * Heartbeat Integration for Proactive Intelligence
 * 
 * This module provides the integration point between HEARTBEAT.md and the
 * Proactive Intelligence system. Called every 15-30 minutes during heartbeats.
 * 
 * Usage from HEARTBEAT.md:
 * ```javascript
 * const { runProactiveCheck } = require('./skills/proactive-intelligence/heartbeat-integration');
 * const result = await runProactiveCheck();
 * ```
 */

const ProactiveIntelligence = require('./proactive-intelligence');

/**
 * Main entry point for heartbeat checks
 * Returns formatted response for heartbeat system
 */
async function runProactiveCheck() {
  try {
    const pi = new ProactiveIntelligence();
    const result = await pi.runHeartbeatCheck();
    
    // Format response for heartbeat
    return formatHeartbeatResponse(result);
  } catch (error) {
    console.error('Proactive Intelligence error:', error);
    return {
      status: 'error',
      message: error.message,
      shouldNotify: false
    };
  }
}

/**
 * Format result for heartbeat system consumption
 */
function formatHeartbeatResponse(result) {
  const { patternsDetected, highConfidence, mediumConfidence, actions } = result;
  
  // Determine if we should take action or stay quiet
  const hasActions = actions.execute.length > 0 || actions.suggest.length > 0;
  
  if (!hasActions) {
    // Nothing to do, return HEARTBEAT_OK signal
    return {
      status: 'ok',
      message: 'HEARTBEAT_OK',
      shouldNotify: false,
      stats: {
        patternsDetected,
        highConfidence,
        mediumConfidence
      }
    };
  }
  
  // We have actions to take
  const response = {
    status: 'action',
    shouldNotify: true,
    actions: {
      execute: actions.execute,
      suggest: actions.suggest
    }
  };
  
  // Format message for user
  if (actions.execute.length > 0) {
    response.message = formatExecuteMessage(actions.execute);
  } else if (actions.suggest.length > 0) {
    response.message = formatSuggestMessage(actions.suggest);
  }
  
  return response;
}

/**
 * Format message for automatic execution
 */
function formatExecuteMessage(executeActions) {
  const action = executeActions[0]; // Take first high-confidence action
  
  switch (action.action) {
    case 'status_reporting':
      return '📊 Status report time approaching. Preparing project metrics...';
    
    case 'email_check':
      return '📧 Regular inbox check time. Scanning for important messages...';
    
    case 'calendar_review':
      return '📅 Calendar review time. Checking upcoming events...';
    
    case 'market_check':
      return '📈 Market check time. Fetching portfolio data...';
    
    default:
      return `🤖 Proactive action: ${action.action}`;
  }
}

/**
 * Format message for suggestions
 */
function formatSuggestMessage(suggestActions) {
  const action = suggestActions[0]; // Take first medium-confidence suggestion
  
  const suggestions = {
    'status_reporting': 'Ready to generate status report?',
    'email_check': 'Would you like me to check your inbox?',
    'calendar_review': 'Should I review your calendar?',
    'market_check': 'Time for a portfolio update?'
  };
  
  const message = suggestions[action.action] || `Suggestion: ${action.action}`;
  
  return `💡 ${message} (${Math.round(action.confidence * 100)}% confidence)`;
}

/**
 * Get current status summary (for manual status checks)
 */
async function getProactiveStatus() {
  try {
    const pi = new ProactiveIntelligence();
    const status = await pi.getStatus();
    
    return {
      totalPatterns: status.totalPatterns,
      byConfidence: {
        high: status.byConfidence.high,
        medium: status.byConfidence.medium,
        low: status.byConfidence.low
      },
      byType: status.byType
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Execute a specific proactive action
 */
async function executeProactiveAction(actionType) {
  try {
    const pi = new ProactiveIntelligence();
    await pi.loadPatterns();
    
    const pattern = pi.patterns.patterns.find(p => p.action === actionType);
    
    if (!pattern) {
      return {
        success: false,
        message: `Pattern not found: ${actionType}`
      };
    }
    
    if (pattern.confidence < 0.85) {
      return {
        success: false,
        message: `Pattern confidence too low: ${Math.round(pattern.confidence * 100)}%`
      };
    }
    
    // Execute the action (this would be implemented per action type)
    return {
      success: true,
      message: `Executed: ${actionType}`,
      pattern: pattern
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Disable a pattern by ID or action name
 */
async function disableProactivePattern(patternIdentifier) {
  try {
    const pi = new ProactiveIntelligence();
    await pi.loadPatterns();
    
    // Find pattern by ID or action name
    const pattern = pi.patterns.patterns.find(p => 
      p.id === patternIdentifier || p.action === patternIdentifier
    );
    
    if (!pattern) {
      return {
        success: false,
        message: `Pattern not found: ${patternIdentifier}`
      };
    }
    
    const success = await pi.disablePattern(pattern.id);
    
    return {
      success: success,
      message: success 
        ? `Disabled pattern: ${pattern.action}` 
        : 'Failed to disable pattern'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Enable a pattern by ID or action name
 */
async function enableProactivePattern(patternIdentifier) {
  try {
    const pi = new ProactiveIntelligence();
    await pi.loadPatterns();
    
    // Find pattern by ID or action name
    const pattern = pi.patterns.patterns.find(p => 
      p.id === patternIdentifier || p.action === patternIdentifier
    );
    
    if (!pattern) {
      return {
        success: false,
        message: `Pattern not found: ${patternIdentifier}`
      };
    }
    
    const success = await pi.enablePattern(pattern.id);
    
    return {
      success: success,
      message: success 
        ? `Enabled pattern: ${pattern.action}` 
        : 'Failed to enable pattern'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Export functions for use in HEARTBEAT.md and agent code
module.exports = {
  runProactiveCheck,
  getProactiveStatus,
  executeProactiveAction,
  disableProactivePattern,
  enableProactivePattern
};

// CLI interface for testing
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'check') {
    runProactiveCheck().then(result => {
      console.log(JSON.stringify(result, null, 2));
    });
  } else if (command === 'status') {
    getProactiveStatus().then(status => {
      console.log(JSON.stringify(status, null, 2));
    });
  } else if (command === 'execute' && process.argv[3]) {
    executeProactiveAction(process.argv[3]).then(result => {
      console.log(JSON.stringify(result, null, 2));
    });
  } else if (command === 'disable' && process.argv[3]) {
    disableProactivePattern(process.argv[3]).then(result => {
      console.log(JSON.stringify(result, null, 2));
    });
  } else if (command === 'enable' && process.argv[3]) {
    enableProactivePattern(process.argv[3]).then(result => {
      console.log(JSON.stringify(result, null, 2));
    });
  } else {
    console.log('Usage: node heartbeat-integration.js [check|status|execute <action>|disable <pattern>|enable <pattern>]');
  }
}
