/**
 * Session Cost Hook - Integrates with OpenClaw session lifecycle
 * Captures token usage at session end and records costs
 */

const CostTracker = require('./cost-tracker');

class SessionCostHook {
  constructor(options = {}) {
    this.costTracker = new CostTracker(options);
    this.sessionData = new Map(); // Track session metadata
  }

  /**
   * Called at session start - store metadata
   */
  onSessionStart(sessionInfo) {
    const {
      sessionId,
      sessionKey,
      model = 'claude-sonnet-4-5',
      taskType = 'general'
    } = sessionInfo;

    this.sessionData.set(sessionId, {
      sessionId,
      sessionKey,
      model,
      taskType,
      startTime: new Date().toISOString(),
      startTokens: sessionInfo.initialTokens || 0
    });

    console.log(`[SessionCostHook] Session started: ${sessionKey} with model ${model}`);
  }

  /**
   * Called at session end - record costs
   * This is the critical integration point
   */
  async onSessionEnd(sessionInfo) {
    const {
      sessionId,
      sessionKey,
      inputTokens = 0,
      outputTokens = 0,
      totalTokens = 0,
      apiCalls = 1,
      model = 'claude-sonnet-4-5'
    } = sessionInfo;

    const sessionMetadata = this.sessionData.get(sessionId) || {};
    
    try {
      // Record the actual session cost
      const result = await this.costTracker.recordSessionCost({
        sessionId,
        sessionKey,
        model,
        inputTokens,
        outputTokens,
        apiCalls,
        taskType: sessionMetadata.taskType,
        startTime: sessionMetadata.startTime,
        endTime: new Date().toISOString()
      });

      if (result.success) {
        console.log(
          `[SessionCostHook] Cost recorded: $${result.cost.toFixed(4)} ` +
          `(${result.tokens} tokens) for session ${sessionKey}. Status: ${result.status}`
        );
      } else {
        console.error(`[SessionCostHook] Failed to record cost: ${result.error}`);
      }

      // Cleanup
      this.sessionData.delete(sessionId);
      
      return result;
      
    } catch (error) {
      console.error(`[SessionCostHook] Error during session end: ${error.message}`);
      this.sessionData.delete(sessionId);
      return { success: false, error: error.message };
    }
  }

  /**
   * Manual cost recording (for testing/debugging)
   */
  async recordManualCost(sessionData) {
    return this.costTracker.recordSessionCost(sessionData);
  }

  /**
   * Get current costs summary
   */
  async getCostsSummary() {
    return this.costTracker.getCostsSummary();
  }

  /**
   * Get today's costs
   */
  async getTodaysCosts() {
    return this.costTracker.getTodaysCosts();
  }
}

module.exports = SessionCostHook;
