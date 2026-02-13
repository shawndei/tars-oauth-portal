/**
 * Agent Profile Router
 * Routes tasks to optimal specialist agents
 */

const fs = require('fs');
const path = require('path');

class AgentRouter {
  constructor(profilesPath = './agent-profiles.json') {
    this.profilesPath = profilesPath;
    this.profiles = this.loadProfiles();
  }

  /**
   * Load agent profiles from JSON
   */
  loadProfiles() {
    try {
      const data = fs.readFileSync(
        path.join(__dirname, this.profilesPath),
        'utf-8'
      );
      const config = JSON.parse(data);
      return config.profiles;
    } catch (error) {
      console.error('[Router] Failed to load profiles:', error.message);
      return {};
    }
  }

  /**
   * Route task to best-fit agent profile
   */
  routeTask(taskDescription) {
    const lowerTask = taskDescription.toLowerCase();
    
    // Score each profile based on trigger word matches
    const scores = Object.entries(this.profiles).map(([id, profile]) => {
      const triggerMatches = profile.triggers.filter(trigger =>
        lowerTask.includes(trigger)
      ).length;
      
      return {
        id,
        profile,
        score: triggerMatches,
        matchedTriggers: profile.triggers.filter(trigger =>
          lowerTask.includes(trigger)
        )
      };
    });

    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);

    // Return best match, or coordinator as fallback
    if (scores[0].score > 0) {
      return {
        agent: scores[0].profile,
        confidence: scores[0].score / scores[0].profile.triggers.length,
        matchedTriggers: scores[0].matchedTriggers
      };
    }

    // Default to coordinator for complex/unmatched tasks
    return {
      agent: this.profiles.coordinator,
      confidence: 0.5,
      matchedTriggers: []
    };
  }

  /**
   * Get profile by ID
   */
  getProfile(profileId) {
    return this.profiles[profileId] || null;
  }

  /**
   * List all available profiles
   */
  listProfiles() {
    return Object.entries(this.profiles).map(([id, profile]) => ({
      id,
      name: profile.name,
      specialization: profile.specialization,
      model: profile.model,
      costPerMToken: profile.costPerMToken
    }));
  }

  /**
   * Get fallback chain for a profile
   */
  getFallbackChain(profileId) {
    const config = JSON.parse(
      fs.readFileSync(path.join(__dirname, this.profilesPath), 'utf-8')
    );
    return config.fallback_chains[profileId] || [];
  }

  /**
   * Check if agent is available (not at max load)
   */
  isAvailable(profileId) {
    const profile = this.getProfile(profileId);
    if (!profile) return false;

    // In production, check actual running instances
    // For now, assume always available
    return true;
  }

  /**
   * Route complex task with decomposition
   */
  routeComplexTask(taskDescription, subtasks = []) {
    if (subtasks.length === 0) {
      // Simple task, route directly
      return this.routeTask(taskDescription);
    }

    // Complex task with subtasks
    const routedSubtasks = subtasks.map(subtask => ({
      description: subtask,
      agent: this.routeTask(subtask).agent
    }));

    return {
      coordinator: this.profiles.coordinator,
      subtasks: routedSubtasks,
      strategy: this.determineStrategy(routedSubtasks)
    };
  }

  /**
   * Determine execution strategy (parallel, sequential, hybrid)
   */
  determineStrategy(routedSubtasks) {
    // Simple heuristic: if all subtasks can run independently, use parallel
    // Otherwise, use sequential or coordinator orchestration
    
    const hasCodeGen = routedSubtasks.some(t => t.agent.id === 'coder');
    const hasResearch = routedSubtasks.some(t => t.agent.id === 'researcher');
    const hasAnalysis = routedSubtasks.some(t => t.agent.id === 'analyst');

    if (hasCodeGen && (hasResearch || hasAnalysis)) {
      return 'sequential'; // Research/analysis before code
    }

    if (routedSubtasks.length > 3) {
      return 'coordinator'; // Complex orchestration
    }

    return 'parallel'; // Default to parallel
  }

  /**
   * Calculate estimated cost for task
   */
  estimateCost(taskDescription, estimatedTokens = 50000) {
    const routing = this.routeTask(taskDescription);
    const costPerToken = routing.agent.costPerMToken / 1000000;
    return {
      agent: routing.agent.name,
      estimatedCost: (estimatedTokens * costPerToken).toFixed(4),
      tokens: estimatedTokens,
      model: routing.agent.model
    };
  }
}

module.exports = AgentRouter;

// CLI usage
if (require.main === module) {
  const router = new AgentRouter();
  const task = process.argv[2] || 'Research the latest AI breakthroughs';

  console.log(`\n🎯 Routing Task: "${task}"\n`);

  const result = router.routeTask(task);
  console.log(`✓ Agent: ${result.agent.name}`);
  console.log(`✓ Model: ${result.agent.model}`);
  console.log(`✓ Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`✓ Matched Triggers: ${result.matchedTriggers.join(', ')}`);
  console.log(`✓ Cost: $${result.agent.costPerMToken}/M tokens`);

  const costEstimate = router.estimateCost(task);
  console.log(`\n💰 Estimated Cost: $${costEstimate.estimatedCost}`);
  console.log(`   (for ${costEstimate.tokens.toLocaleString()} tokens)\n`);
}
