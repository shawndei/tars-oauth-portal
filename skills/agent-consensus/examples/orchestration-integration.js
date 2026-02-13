/**
 * Integration Examples: Multi-Agent Orchestration
 * 
 * Demonstrates how to integrate consensus voting with multi-agent systems
 */

const { ConsensusVoting, ConsensusAlgorithm, quickVote } = require('../index');

// ============================================================================
// Example 1: Task Assignment Coordination
// ============================================================================

class TaskAssignmentCoordinator {
  constructor() {
    this.voting = new ConsensusVoting({
      algorithm: ConsensusAlgorithm.CONFIDENCE_WEIGHTED,
      threshold: 0.6,
      conflictResolution: 'highest-confidence'
    });
  }

  /**
   * Let agents vote on who should handle a task
   */
  async assignTask(task, agents) {
    const sessionId = `task-${task.id}-${Date.now()}`;
    const session = this.voting.createSession(sessionId, { timeout: 10000 });

    console.log(`\n=== Task Assignment Vote for "${task.name}" ===`);

    // Each agent evaluates themselves and others for the task
    for (const agent of agents) {
      const evaluation = await agent.evaluateTaskFit(task, agents);
      
      session.castVote(agent.id, evaluation.recommendedAgent, {
        confidence: evaluation.confidence,
        weight: agent.reputation,
        metadata: {
          reasoning: evaluation.reasoning,
          selfNomination: evaluation.recommendedAgent === agent.id
        }
      });

      console.log(`${agent.id} voted for ${evaluation.recommendedAgent} (confidence: ${evaluation.confidence})`);
    }

    const result = session.finalize();

    console.log(`\nResult: ${result.winner} wins`);
    console.log(`Consensus: ${result.consensusReached ? 'YES' : 'NO'}`);
    console.log(`Confidence: ${result.confidence.toFixed(2)}`);

    return result;
  }
}

// ============================================================================
// Example 2: Distributed Route Planning
// ============================================================================

class DistributedRoutePlanner {
  constructor() {
    this.voting = new ConsensusVoting({
      algorithm: ConsensusAlgorithm.WEIGHTED
    });
  }

  /**
   * Multiple agents evaluate possible routes and vote
   */
  async planRoute(start, destination, agents) {
    const sessionId = `route-${start}-${destination}`;
    const session = this.voting.createSession(sessionId);

    console.log(`\n=== Route Planning: ${start} → ${destination} ===`);

    // Agents propose and vote on routes
    for (const agent of agents) {
      const proposal = await agent.proposeRoute(start, destination);
      
      // Weight by agent's navigation expertise
      session.castVote(agent.id, proposal.route, {
        weight: agent.navigationExpertise,
        confidence: proposal.confidence,
        metadata: {
          estimatedTime: proposal.estimatedTime,
          estimatedCost: proposal.estimatedCost,
          riskLevel: proposal.riskLevel
        }
      });

      console.log(`${agent.id} proposes: ${proposal.route.path.join(' → ')}`);
      console.log(`  Time: ${proposal.estimatedTime}min, Risk: ${proposal.riskLevel}`);
    }

    const result = session.finalize();

    if (result.consensusReached) {
      console.log(`\nConsensus reached: ${result.winner.path.join(' → ')}`);
      return result.winner;
    } else {
      console.log(`\nNo consensus - using highest-weighted route`);
      return result.winner;
    }
  }
}

// ============================================================================
// Example 3: Safety-Critical Decision (Unanimous)
// ============================================================================

class SafetyMonitor {
  constructor() {
    this.voting = new ConsensusVoting({
      algorithm: ConsensusAlgorithm.UNANIMOUS
    });
  }

  /**
   * All safety agents must approve before proceeding
   */
  async checkSafety(action, safetyAgents) {
    const sessionId = `safety-${action.id}`;
    const session = this.voting.createSession(sessionId);

    console.log(`\n=== Safety Check: "${action.description}" ===`);

    for (const agent of safetyAgents) {
      const assessment = await agent.assessSafety(action);
      
      session.castVote(agent.id, assessment.approved ? 'APPROVE' : 'REJECT', {
        confidence: assessment.confidence,
        metadata: {
          concerns: assessment.concerns,
          mitigations: assessment.mitigations
        }
      });

      const status = assessment.approved ? '✓ APPROVE' : '✗ REJECT';
      console.log(`${agent.id}: ${status} (${assessment.concerns.length} concerns)`);
    }

    const result = session.finalize();

    if (result.consensusReached && result.winner === 'APPROVE') {
      console.log(`\n✓ Safety approved by all agents`);
      return { safe: true, proceed: true };
    } else {
      console.log(`\n✗ Safety check failed - action blocked`);
      return { safe: false, proceed: false, votes: result };
    }
  }
}

// ============================================================================
// Example 4: Dynamic Resource Allocation
// ============================================================================

class ResourceAllocator {
  constructor() {
    this.voting = new ConsensusVoting({
      algorithm: ConsensusAlgorithm.CONFIDENCE_WEIGHTED,
      threshold: 0.5
    });
  }

  /**
   * Agents bid for resources based on need and priority
   */
  async allocateResource(resource, requestingAgents, allAgents) {
    const sessionId = `resource-${resource.id}-${Date.now()}`;
    const session = this.voting.createSession(sessionId);

    console.log(`\n=== Resource Allocation: ${resource.name} (${resource.units} units) ===`);

    // All agents vote on who should get the resource
    for (const voter of allAgents) {
      const evaluation = await voter.evaluateResourceNeeds(resource, requestingAgents);
      
      session.castVote(voter.id, evaluation.recommendedRecipient, {
        confidence: evaluation.confidence,
        weight: voter.priority,
        metadata: {
          justification: evaluation.justification,
          urgency: evaluation.urgency
        }
      });

      console.log(`${voter.id} → ${evaluation.recommendedRecipient} (urgency: ${evaluation.urgency})`);
    }

    const result = session.finalize();

    console.log(`\nAllocating to: ${result.winner}`);
    console.log(`Confidence: ${result.confidence.toFixed(2)}`);

    return {
      recipient: result.winner,
      confidence: result.confidence,
      allocation: resource
    };
  }
}

// ============================================================================
// Example 5: Adaptive Strategy Selection
// ============================================================================

class StrategySelector {
  constructor() {
    this.voting = new ConsensusVoting({
      algorithm: ConsensusAlgorithm.WEIGHTED
    });
    this.performanceHistory = new Map();
  }

  /**
   * Select strategy based on agent votes weighted by past performance
   */
  async selectStrategy(situation, agents) {
    const sessionId = `strategy-${Date.now()}`;
    const session = this.voting.createSession(sessionId);

    console.log(`\n=== Strategy Selection ===`);
    console.log(`Situation: ${situation.description}`);

    for (const agent of agents) {
      const recommendation = await agent.recommendStrategy(situation);
      
      // Weight by historical success rate
      const weight = this.getAgentWeight(agent.id);
      
      session.castVote(agent.id, recommendation.strategy, {
        weight: weight,
        confidence: recommendation.confidence,
        metadata: {
          expectedOutcome: recommendation.expectedOutcome,
          riskAssessment: recommendation.risk
        }
      });

      console.log(`${agent.id} (weight: ${weight.toFixed(2)}): ${recommendation.strategy.name}`);
    }

    const result = session.finalize();

    console.log(`\nSelected strategy: ${result.winner.name}`);
    console.log(`Aggregate confidence: ${result.confidence.toFixed(2)}`);

    // Update performance weights after execution
    this.schedulePerformanceUpdate(result.winner, agents);

    return result.winner;
  }

  getAgentWeight(agentId) {
    const history = this.performanceHistory.get(agentId) || { successes: 0, total: 0 };
    if (history.total === 0) return 1.0;
    
    // Weight based on success rate, minimum 0.5
    const successRate = history.successes / history.total;
    return Math.max(0.5, successRate * 2);
  }

  schedulePerformanceUpdate(strategy, agents) {
    // After strategy execution, update agent weights
    // Implementation depends on how you track outcomes
  }
}

// ============================================================================
// Example 6: Quick Decision Helper
// ============================================================================

/**
 * Quick voting for simple yes/no decisions
 */
async function quickConsensusCheck(question, agents) {
  console.log(`\n=== Quick Vote: "${question}" ===`);

  const votes = [];
  
  for (const agent of agents) {
    const response = await agent.quickDecision(question);
    votes.push({
      agentId: agent.id,
      choice: response.answer, // 'yes' or 'no'
      confidence: response.confidence,
      weight: 1.0
    });

    console.log(`${agent.id}: ${response.answer.toUpperCase()} (${response.confidence})`);
  }

  const result = quickVote(votes, { 
    algorithm: ConsensusAlgorithm.CONFIDENCE_WEIGHTED 
  });

  console.log(`\nResult: ${result.winner}`);
  console.log(`Consensus: ${result.consensusReached ? 'YES' : 'NO'}`);

  return result.winner === 'yes';
}

// ============================================================================
// Example 7: Multi-Stage Voting
// ============================================================================

class MultiStageDecisionMaker {
  constructor() {
    this.voting = new ConsensusVoting({
      algorithm: ConsensusAlgorithm.CONFIDENCE_WEIGHTED
    });
  }

  /**
   * Multi-stage voting: proposal → refinement → final approval
   */
  async multiStageDecision(problem, agents) {
    console.log(`\n=== Multi-Stage Decision Process ===`);
    console.log(`Problem: ${problem.description}\n`);

    // Stage 1: Proposal Generation
    console.log('Stage 1: Generating Proposals...');
    const proposals = await this.generateProposals(problem, agents);

    // Stage 2: Proposal Evaluation
    console.log('\nStage 2: Evaluating Proposals...');
    const topProposals = await this.evaluateProposals(proposals, agents);

    // Stage 3: Final Selection
    console.log('\nStage 3: Final Selection...');
    const finalDecision = await this.finalSelection(topProposals, agents);

    console.log(`\n=== Final Decision ===`);
    console.log(`Selected: ${finalDecision.winner.id}`);
    console.log(`Confidence: ${finalDecision.confidence.toFixed(2)}`);

    return finalDecision;
  }

  async generateProposals(problem, agents) {
    const proposals = [];
    for (const agent of agents) {
      const proposal = await agent.generateProposal(problem);
      proposals.push({ ...proposal, author: agent.id });
    }
    return proposals;
  }

  async evaluateProposals(proposals, agents) {
    const session = this.voting.createSession(`eval-${Date.now()}`);

    for (const agent of agents) {
      const rankings = await agent.rankProposals(proposals);
      session.castVote(agent.id, rankings.topChoice, {
        confidence: rankings.confidence,
        weight: agent.analyticalSkill
      });
    }

    const result = session.finalize();
    
    // Return top 3 proposals for final round
    const distribution = Object.values(result.distribution);
    distribution.sort((a, b) => b.count - a.count);
    return distribution.slice(0, 3).map(d => d.choice);
  }

  async finalSelection(topProposals, agents) {
    const session = this.voting.createSession(`final-${Date.now()}`);

    for (const agent of agents) {
      const evaluation = await agent.finalEvaluation(topProposals);
      session.castVote(agent.id, evaluation.selected, {
        confidence: evaluation.confidence,
        weight: 1.0
      });
    }

    return session.finalize();
  }
}

// ============================================================================
// Mock Agent Interface (for demonstration)
// ============================================================================

class MockAgent {
  constructor(id, attributes) {
    this.id = id;
    Object.assign(this, attributes);
  }

  async evaluateTaskFit(task, agents) {
    // Mock implementation
    const scores = agents.map(a => ({
      agent: a.id,
      score: Math.random()
    }));
    scores.sort((a, b) => b.score - a.score);
    
    return {
      recommendedAgent: scores[0].agent,
      confidence: 0.7 + Math.random() * 0.3,
      reasoning: `Best skill match for ${task.name}`
    };
  }

  async proposeRoute(start, destination) {
    const routes = [
      ['A', 'B', 'C'],
      ['A', 'D', 'C'],
      ['A', 'E', 'F', 'C']
    ];
    const route = routes[Math.floor(Math.random() * routes.length)];
    
    return {
      route: { path: route },
      confidence: 0.6 + Math.random() * 0.4,
      estimatedTime: 10 + Math.floor(Math.random() * 20),
      estimatedCost: 50 + Math.floor(Math.random() * 100),
      riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    };
  }

  async assessSafety(action) {
    const approved = Math.random() > 0.2; // 80% approval rate
    return {
      approved,
      confidence: 0.8 + Math.random() * 0.2,
      concerns: approved ? [] : ['Potential hazard detected'],
      mitigations: []
    };
  }

  async evaluateResourceNeeds(resource, requestingAgents) {
    return {
      recommendedRecipient: requestingAgents[Math.floor(Math.random() * requestingAgents.length)].id,
      confidence: 0.7 + Math.random() * 0.3,
      justification: 'Highest priority need',
      urgency: Math.floor(Math.random() * 10)
    };
  }

  async recommendStrategy(situation) {
    const strategies = [
      { name: 'aggressive', description: 'Fast but risky' },
      { name: 'conservative', description: 'Slow but safe' },
      { name: 'balanced', description: 'Moderate approach' }
    ];
    
    return {
      strategy: strategies[Math.floor(Math.random() * strategies.length)],
      confidence: 0.6 + Math.random() * 0.4,
      expectedOutcome: 'positive',
      risk: 'medium'
    };
  }

  async quickDecision(question) {
    return {
      answer: Math.random() > 0.5 ? 'yes' : 'no',
      confidence: 0.5 + Math.random() * 0.5
    };
  }
}

// ============================================================================
// Demo Runner
// ============================================================================

async function runExamples() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Agent Consensus & Voting - Integration Examples        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Create mock agents
  const agents = [
    new MockAgent('alpha', { reputation: 0.9, navigationExpertise: 0.8, priority: 1.5, analyticalSkill: 0.9 }),
    new MockAgent('beta', { reputation: 0.7, navigationExpertise: 0.9, priority: 1.0, analyticalSkill: 0.7 }),
    new MockAgent('gamma', { reputation: 0.8, navigationExpertise: 0.6, priority: 1.2, analyticalSkill: 0.8 }),
    new MockAgent('delta', { reputation: 0.6, navigationExpertise: 0.7, priority: 0.8, analyticalSkill: 0.6 })
  ];

  try {
    // Example 1: Task Assignment
    const taskCoordinator = new TaskAssignmentCoordinator();
    await taskCoordinator.assignTask(
      { id: '001', name: 'Data Analysis', complexity: 'high' },
      agents
    );

    // Example 2: Route Planning
    const routePlanner = new DistributedRoutePlanner();
    await routePlanner.planRoute('LocationA', 'LocationB', agents.slice(0, 3));

    // Example 3: Safety Check
    const safetyMonitor = new SafetyMonitor();
    await safetyMonitor.checkSafety(
      { id: 'act-001', description: 'Execute high-voltage operation' },
      agents
    );

    // Example 4: Resource Allocation
    const allocator = new ResourceAllocator();
    await allocator.allocateResource(
      { id: 'res-001', name: 'Processing Power', units: 100 },
      agents.slice(0, 2),
      agents
    );

    // Example 5: Strategy Selection
    const strategySelector = new StrategySelector();
    await strategySelector.selectStrategy(
      { description: 'Market volatility detected' },
      agents
    );

    // Example 6: Quick Consensus
    await quickConsensusCheck('Should we proceed with deployment?', agents);

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║   All examples completed successfully!                   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if called directly
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = {
  TaskAssignmentCoordinator,
  DistributedRoutePlanner,
  SafetyMonitor,
  ResourceAllocator,
  StrategySelector,
  quickConsensusCheck,
  MultiStageDecisionMaker
};
