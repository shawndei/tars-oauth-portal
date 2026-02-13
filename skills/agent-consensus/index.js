/**
 * Agent Consensus & Voting System
 * 
 * Multi-agent voting system with consensus algorithms, result aggregation,
 * and conflict resolution for distributed agent decision-making.
 * 
 * @module agent-consensus
 */

const { EventEmitter } = require('events');

/**
 * Vote cast by an agent
 * @typedef {Object} Vote
 * @property {string} agentId - Unique identifier for the voting agent
 * @property {*} choice - The vote choice (can be any type: string, number, object)
 * @property {number} confidence - Confidence level (0-1)
 * @property {number} weight - Vote weight (default 1.0)
 * @property {Object} [metadata] - Additional metadata about the vote
 * @property {number} timestamp - When the vote was cast
 */

/**
 * Consensus result
 * @typedef {Object} ConsensusResult
 * @property {*} winner - The winning choice
 * @property {boolean} consensusReached - Whether consensus was achieved
 * @property {number} confidence - Aggregate confidence in the result (0-1)
 * @property {Object} distribution - Vote distribution by choice
 * @property {Array<Vote>} votes - All votes cast
 * @property {string} algorithm - Algorithm used
 * @property {Object} [metadata] - Additional result metadata
 */

/**
 * Consensus algorithms
 */
const ConsensusAlgorithm = {
  MAJORITY: 'majority',
  WEIGHTED: 'weighted',
  UNANIMOUS: 'unanimous',
  CONFIDENCE_WEIGHTED: 'confidence-weighted',
  RANKED_CHOICE: 'ranked-choice',
  THRESHOLD: 'threshold'
};

/**
 * Main consensus voting system
 */
class ConsensusVoting extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      algorithm: ConsensusAlgorithm.MAJORITY,
      threshold: 0.5, // For threshold-based consensus
      unanimityRequired: false,
      allowAbstentions: true,
      conflictResolution: 'highest-confidence', // or 'random', 'first', 'weighted-random'
      timeout: null, // Voting timeout in ms (null = no timeout)
      ...options
    };
    
    this.sessions = new Map(); // Active voting sessions
  }

  /**
   * Create a new voting session
   * @param {string} sessionId - Unique session identifier
   * @param {Object} options - Session-specific options
   * @returns {VotingSession}
   */
  createSession(sessionId, options = {}) {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Voting session ${sessionId} already exists`);
    }

    const session = new VotingSession(sessionId, {
      ...this.options,
      ...options
    });

    this.sessions.set(sessionId, session);
    
    session.on('complete', (result) => {
      this.emit('session-complete', { sessionId, result });
    });

    session.on('timeout', () => {
      this.emit('session-timeout', { sessionId });
    });

    return session;
  }

  /**
   * Get an existing session
   * @param {string} sessionId
   * @returns {VotingSession|null}
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Close and remove a session
   * @param {string} sessionId
   */
  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.close();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * List all active sessions
   * @returns {Array<string>}
   */
  listSessions() {
    return Array.from(this.sessions.keys());
  }
}

/**
 * Individual voting session
 */
class VotingSession extends EventEmitter {
  constructor(sessionId, options) {
    super();
    this.sessionId = sessionId;
    this.options = options;
    this.votes = [];
    this.status = 'open'; // open, closed, complete
    this.result = null;
    this.startTime = Date.now();
    this.timeoutHandle = null;

    if (options.timeout) {
      this.timeoutHandle = setTimeout(() => {
        this.handleTimeout();
      }, options.timeout);
    }
  }

  /**
   * Cast a vote
   * @param {string} agentId - Voting agent identifier
   * @param {*} choice - Vote choice
   * @param {Object} options - Vote options (confidence, weight, metadata)
   * @returns {Vote}
   */
  castVote(agentId, choice, options = {}) {
    if (this.status !== 'open') {
      throw new Error(`Session ${this.sessionId} is ${this.status}`);
    }

    // Check if agent already voted
    const existingVoteIndex = this.votes.findIndex(v => v.agentId === agentId);
    
    const vote = {
      agentId,
      choice,
      confidence: options.confidence !== undefined ? options.confidence : 1.0,
      weight: options.weight !== undefined ? options.weight : 1.0,
      metadata: options.metadata || {},
      timestamp: Date.now()
    };

    // Validate confidence and weight
    if (vote.confidence < 0 || vote.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }
    if (vote.weight < 0) {
      throw new Error('Weight must be non-negative');
    }

    if (existingVoteIndex >= 0) {
      // Update existing vote
      this.votes[existingVoteIndex] = vote;
      this.emit('vote-updated', vote);
    } else {
      // Add new vote
      this.votes.push(vote);
      this.emit('vote-cast', vote);
    }

    return vote;
  }

  /**
   * Get all votes
   * @returns {Array<Vote>}
   */
  getVotes() {
    return [...this.votes];
  }

  /**
   * Get vote by agent
   * @param {string} agentId
   * @returns {Vote|null}
   */
  getVoteByAgent(agentId) {
    return this.votes.find(v => v.agentId === agentId) || null;
  }

  /**
   * Calculate consensus using the configured algorithm
   * @returns {ConsensusResult}
   */
  calculateConsensus() {
    const algorithm = this.options.algorithm;

    switch (algorithm) {
      case ConsensusAlgorithm.MAJORITY:
        return this.calculateMajority();
      case ConsensusAlgorithm.WEIGHTED:
        return this.calculateWeighted();
      case ConsensusAlgorithm.UNANIMOUS:
        return this.calculateUnanimous();
      case ConsensusAlgorithm.CONFIDENCE_WEIGHTED:
        return this.calculateConfidenceWeighted();
      case ConsensusAlgorithm.RANKED_CHOICE:
        return this.calculateRankedChoice();
      case ConsensusAlgorithm.THRESHOLD:
        return this.calculateThreshold();
      default:
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }
  }

  /**
   * Simple majority voting
   * @private
   */
  calculateMajority() {
    const distribution = this.getDistribution();
    const entries = Object.entries(distribution);
    
    if (entries.length === 0) {
      return this.createResult(null, false, 0, distribution);
    }

    entries.sort((a, b) => b[1].count - a[1].count);
    const [winner, winnerData] = entries[0];
    
    const totalVotes = this.votes.length;
    const winnerCount = winnerData.count;
    const consensusReached = winnerCount > totalVotes / 2;

    // Handle ties
    if (entries.length > 1 && entries[1][1].count === winnerCount) {
      return this.resolveConflict(entries.filter(e => e[1].count === winnerCount));
    }

    const confidence = this.calculateAggregateConfidence(winnerData.votes);

    return this.createResult(
      this.parseChoice(winner),
      consensusReached,
      confidence,
      distribution
    );
  }

  /**
   * Weighted voting (by vote weight)
   * @private
   */
  calculateWeighted() {
    const distribution = this.getWeightedDistribution();
    const entries = Object.entries(distribution);
    
    if (entries.length === 0) {
      return this.createResult(null, false, 0, distribution);
    }

    entries.sort((a, b) => b[1].totalWeight - a[1].totalWeight);
    const [winner, winnerData] = entries[0];
    
    const totalWeight = this.votes.reduce((sum, v) => sum + v.weight, 0);
    const winnerWeight = winnerData.totalWeight;
    const consensusReached = winnerWeight > totalWeight / 2;

    // Handle ties
    if (entries.length > 1 && entries[1][1].totalWeight === winnerWeight) {
      return this.resolveConflict(entries.filter(e => e[1].totalWeight === winnerWeight));
    }

    const confidence = this.calculateAggregateConfidence(winnerData.votes);

    return this.createResult(
      this.parseChoice(winner),
      consensusReached,
      confidence,
      distribution
    );
  }

  /**
   * Unanimous voting (all must agree)
   * @private
   */
  calculateUnanimous() {
    const distribution = this.getDistribution();
    const entries = Object.entries(distribution);
    
    if (entries.length === 0) {
      return this.createResult(null, false, 0, distribution);
    }

    const consensusReached = entries.length === 1;
    const [winner, winnerData] = entries[0];
    const confidence = consensusReached 
      ? this.calculateAggregateConfidence(winnerData.votes)
      : 0;

    return this.createResult(
      consensusReached ? this.parseChoice(winner) : null,
      consensusReached,
      confidence,
      distribution
    );
  }

  /**
   * Confidence-weighted voting (weight * confidence)
   * @private
   */
  calculateConfidenceWeighted() {
    const distribution = this.getConfidenceWeightedDistribution();
    const entries = Object.entries(distribution);
    
    if (entries.length === 0) {
      return this.createResult(null, false, 0, distribution);
    }

    entries.sort((a, b) => b[1].confidenceWeight - a[1].confidenceWeight);
    const [winner, winnerData] = entries[0];
    
    const totalConfidenceWeight = Object.values(distribution)
      .reduce((sum, d) => sum + d.confidenceWeight, 0);
    const winnerConfidenceWeight = winnerData.confidenceWeight;
    const consensusReached = winnerConfidenceWeight > totalConfidenceWeight * this.options.threshold;

    // Handle ties
    if (entries.length > 1 && entries[1][1].confidenceWeight === winnerConfidenceWeight) {
      return this.resolveConflict(entries.filter(e => e[1].confidenceWeight === winnerConfidenceWeight));
    }

    const confidence = winnerData.avgConfidence;

    return this.createResult(
      this.parseChoice(winner),
      consensusReached,
      confidence,
      distribution
    );
  }

  /**
   * Threshold-based voting
   * @private
   */
  calculateThreshold() {
    const distribution = this.getWeightedDistribution();
    const entries = Object.entries(distribution);
    
    if (entries.length === 0) {
      return this.createResult(null, false, 0, distribution);
    }

    const totalWeight = this.votes.reduce((sum, v) => sum + v.weight, 0);
    const threshold = totalWeight * this.options.threshold;

    entries.sort((a, b) => b[1].totalWeight - a[1].totalWeight);
    const [winner, winnerData] = entries[0];
    
    const consensusReached = winnerData.totalWeight >= threshold;
    const confidence = this.calculateAggregateConfidence(winnerData.votes);

    return this.createResult(
      consensusReached ? this.parseChoice(winner) : null,
      consensusReached,
      confidence,
      distribution
    );
  }

  /**
   * Ranked choice voting (not fully implemented - placeholder)
   * @private
   */
  calculateRankedChoice() {
    // Simplified ranked choice - treat as weighted for now
    // Full implementation would require ranked ballot structure
    return this.calculateWeighted();
  }

  /**
   * Get vote distribution by choice
   * @private
   */
  getDistribution() {
    const distribution = {};
    
    for (const vote of this.votes) {
      const key = JSON.stringify(vote.choice);
      if (!distribution[key]) {
        distribution[key] = {
          choice: vote.choice,
          count: 0,
          votes: []
        };
      }
      distribution[key].count++;
      distribution[key].votes.push(vote);
    }

    return distribution;
  }

  /**
   * Get weighted distribution
   * @private
   */
  getWeightedDistribution() {
    const distribution = {};
    
    for (const vote of this.votes) {
      const key = JSON.stringify(vote.choice);
      if (!distribution[key]) {
        distribution[key] = {
          choice: vote.choice,
          count: 0,
          totalWeight: 0,
          votes: []
        };
      }
      distribution[key].count++;
      distribution[key].totalWeight += vote.weight;
      distribution[key].votes.push(vote);
    }

    return distribution;
  }

  /**
   * Get confidence-weighted distribution
   * @private
   */
  getConfidenceWeightedDistribution() {
    const distribution = {};
    
    for (const vote of this.votes) {
      const key = JSON.stringify(vote.choice);
      if (!distribution[key]) {
        distribution[key] = {
          choice: vote.choice,
          count: 0,
          confidenceWeight: 0,
          avgConfidence: 0,
          votes: []
        };
      }
      distribution[key].count++;
      distribution[key].confidenceWeight += vote.weight * vote.confidence;
      distribution[key].votes.push(vote);
    }

    // Calculate average confidence
    for (const key in distribution) {
      const data = distribution[key];
      data.avgConfidence = data.votes.reduce((sum, v) => sum + v.confidence, 0) / data.votes.length;
    }

    return distribution;
  }

  /**
   * Calculate aggregate confidence from votes
   * @private
   */
  calculateAggregateConfidence(votes) {
    if (votes.length === 0) return 0;
    
    // Weighted average of confidence values
    const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
    const weightedConfidence = votes.reduce((sum, v) => sum + (v.confidence * v.weight), 0);
    
    return totalWeight > 0 ? weightedConfidence / totalWeight : 0;
  }

  /**
   * Resolve conflicts when there's a tie
   * @private
   */
  resolveConflict(tiedEntries) {
    const strategy = this.options.conflictResolution;

    let winner;
    switch (strategy) {
      case 'highest-confidence':
        // Choose the option with highest average confidence
        tiedEntries.sort((a, b) => {
          const aConf = this.calculateAggregateConfidence(a[1].votes);
          const bConf = this.calculateAggregateConfidence(b[1].votes);
          return bConf - aConf;
        });
        winner = tiedEntries[0];
        break;

      case 'random':
        // Random selection
        winner = tiedEntries[Math.floor(Math.random() * tiedEntries.length)];
        break;

      case 'weighted-random':
        // Weighted random based on total weight
        const totalWeight = tiedEntries.reduce((sum, e) => {
          return sum + (e[1].totalWeight || e[1].count);
        }, 0);
        let random = Math.random() * totalWeight;
        winner = tiedEntries[0];
        for (const entry of tiedEntries) {
          const weight = entry[1].totalWeight || entry[1].count;
          random -= weight;
          if (random <= 0) {
            winner = entry;
            break;
          }
        }
        break;

      case 'first':
      default:
        // First one in the tied list
        winner = tiedEntries[0];
        break;
    }

    const [winnerKey, winnerData] = winner;
    const confidence = this.calculateAggregateConfidence(winnerData.votes);
    const distribution = this.getDistribution();

    return this.createResult(
      this.parseChoice(winnerKey),
      false, // Consensus not reached due to tie
      confidence,
      distribution,
      { conflict: true, tiedChoices: tiedEntries.map(e => this.parseChoice(e[0])) }
    );
  }

  /**
   * Create a consensus result object
   * @private
   */
  createResult(winner, consensusReached, confidence, distribution, metadata = {}) {
    return {
      winner,
      consensusReached,
      confidence,
      distribution,
      votes: this.votes,
      algorithm: this.options.algorithm,
      metadata: {
        sessionId: this.sessionId,
        voteCount: this.votes.length,
        timestamp: Date.now(),
        ...metadata
      }
    };
  }

  /**
   * Parse choice from JSON string
   * @private
   */
  parseChoice(key) {
    try {
      return JSON.parse(key);
    } catch {
      return key;
    }
  }

  /**
   * Finalize the session and return result
   * @returns {ConsensusResult}
   */
  finalize() {
    if (this.status === 'complete') {
      return this.result;
    }

    this.status = 'closed';
    this.result = this.calculateConsensus();
    this.status = 'complete';

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }

    this.emit('complete', this.result);
    return this.result;
  }

  /**
   * Handle timeout
   * @private
   */
  handleTimeout() {
    if (this.status === 'open') {
      this.emit('timeout');
      this.finalize();
    }
  }

  /**
   * Close the session without finalizing
   */
  close() {
    this.status = 'closed';
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }
  }

  /**
   * Get session status
   */
  getStatus() {
    return {
      sessionId: this.sessionId,
      status: this.status,
      voteCount: this.votes.length,
      algorithm: this.options.algorithm,
      startTime: this.startTime,
      result: this.result
    };
  }
}

/**
 * Quick voting helper for simple use cases
 * @param {Array<Vote>} votes - Array of votes
 * @param {Object} options - Voting options
 * @returns {ConsensusResult}
 */
function quickVote(votes, options = {}) {
  const system = new ConsensusVoting(options);
  const session = system.createSession('quick-vote', options);
  
  for (const vote of votes) {
    session.castVote(
      vote.agentId,
      vote.choice,
      {
        confidence: vote.confidence,
        weight: vote.weight,
        metadata: vote.metadata
      }
    );
  }

  return session.finalize();
}

module.exports = {
  ConsensusVoting,
  VotingSession,
  ConsensusAlgorithm,
  quickVote
};
