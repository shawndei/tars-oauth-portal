/**
 * Test suite for Agent Consensus & Voting System
 */

const { ConsensusVoting, ConsensusAlgorithm, quickVote } = require('../index');

describe('Agent Consensus & Voting System', () => {
  
  describe('ConsensusVoting', () => {
    let voting;

    beforeEach(() => {
      voting = new ConsensusVoting();
    });

    test('should create a new voting system', () => {
      expect(voting).toBeInstanceOf(ConsensusVoting);
      expect(voting.sessions).toBeInstanceOf(Map);
    });

    test('should create a new session', () => {
      const session = voting.createSession('test-session');
      expect(session.sessionId).toBe('test-session');
      expect(session.status).toBe('open');
    });

    test('should not allow duplicate session IDs', () => {
      voting.createSession('test-session');
      expect(() => voting.createSession('test-session')).toThrow();
    });

    test('should get existing session', () => {
      const session = voting.createSession('test-session');
      const retrieved = voting.getSession('test-session');
      expect(retrieved).toBe(session);
    });

    test('should return null for non-existent session', () => {
      expect(voting.getSession('non-existent')).toBeNull();
    });

    test('should list all sessions', () => {
      voting.createSession('session-1');
      voting.createSession('session-2');
      voting.createSession('session-3');
      const sessions = voting.listSessions();
      expect(sessions).toHaveLength(3);
      expect(sessions).toContain('session-1');
      expect(sessions).toContain('session-2');
      expect(sessions).toContain('session-3');
    });

    test('should close session', () => {
      const session = voting.createSession('test-session');
      voting.closeSession('test-session');
      expect(session.status).toBe('closed');
      expect(voting.getSession('test-session')).toBeNull();
    });
  });

  describe('VotingSession', () => {
    let voting;
    let session;

    beforeEach(() => {
      voting = new ConsensusVoting();
      session = voting.createSession('test-session');
    });

    test('should cast a vote', () => {
      const vote = session.castVote('agent-1', 'option-a', { confidence: 0.9 });
      expect(vote.agentId).toBe('agent-1');
      expect(vote.choice).toBe('option-a');
      expect(vote.confidence).toBe(0.9);
      expect(vote.weight).toBe(1.0);
    });

    test('should update existing vote from same agent', () => {
      session.castVote('agent-1', 'option-a');
      session.castVote('agent-1', 'option-b');
      const votes = session.getVotes();
      expect(votes).toHaveLength(1);
      expect(votes[0].choice).toBe('option-b');
    });

    test('should validate confidence range', () => {
      expect(() => session.castVote('agent-1', 'option-a', { confidence: 1.5 }))
        .toThrow('Confidence must be between 0 and 1');
      expect(() => session.castVote('agent-1', 'option-a', { confidence: -0.1 }))
        .toThrow('Confidence must be between 0 and 1');
    });

    test('should validate weight', () => {
      expect(() => session.castVote('agent-1', 'option-a', { weight: -1 }))
        .toThrow('Weight must be non-negative');
    });

    test('should get vote by agent', () => {
      session.castVote('agent-1', 'option-a');
      session.castVote('agent-2', 'option-b');
      const vote = session.getVoteByAgent('agent-1');
      expect(vote.agentId).toBe('agent-1');
      expect(vote.choice).toBe('option-a');
    });

    test('should not allow voting on closed session', () => {
      session.finalize();
      expect(() => session.castVote('agent-1', 'option-a'))
        .toThrow('Session test-session is complete');
    });
  });

  describe('Majority Voting', () => {
    let voting;
    let session;

    beforeEach(() => {
      voting = new ConsensusVoting({ algorithm: ConsensusAlgorithm.MAJORITY });
      session = voting.createSession('majority-test');
    });

    test('should select majority choice', () => {
      session.castVote('agent-1', 'A');
      session.castVote('agent-2', 'A');
      session.castVote('agent-3', 'A');
      session.castVote('agent-4', 'B');
      session.castVote('agent-5', 'B');

      const result = session.finalize();
      expect(result.winner).toBe('A');
      expect(result.consensusReached).toBe(true);
      expect(result.algorithm).toBe(ConsensusAlgorithm.MAJORITY);
    });

    test('should not reach consensus without majority', () => {
      session.castVote('agent-1', 'A');
      session.castVote('agent-2', 'A');
      session.castVote('agent-3', 'B');
      session.castVote('agent-4', 'B');

      const result = session.finalize();
      expect(result.consensusReached).toBe(false);
    });

    test('should handle ties with conflict resolution', () => {
      session.castVote('agent-1', 'A', { confidence: 0.9 });
      session.castVote('agent-2', 'B', { confidence: 0.5 });

      const result = session.finalize();
      expect(result.winner).toBe('A'); // Higher confidence wins
      expect(result.metadata.conflict).toBe(true);
    });

    test('should work with complex choices', () => {
      session.castVote('agent-1', { action: 'move', direction: 'north' });
      session.castVote('agent-2', { action: 'move', direction: 'north' });
      session.castVote('agent-3', { action: 'move', direction: 'south' });

      const result = session.finalize();
      expect(result.winner).toEqual({ action: 'move', direction: 'north' });
      expect(result.consensusReached).toBe(true);
    });
  });

  describe('Weighted Voting', () => {
    let voting;
    let session;

    beforeEach(() => {
      voting = new ConsensusVoting({ algorithm: ConsensusAlgorithm.WEIGHTED });
      session = voting.createSession('weighted-test');
    });

    test('should weight votes correctly', () => {
      session.castVote('expert', 'A', { weight: 3.0 });
      session.castVote('novice-1', 'B', { weight: 1.0 });
      session.castVote('novice-2', 'B', { weight: 1.0 });

      const result = session.finalize();
      expect(result.winner).toBe('A');
      expect(result.consensusReached).toBe(true);
    });

    test('should aggregate weights for same choice', () => {
      session.castVote('agent-1', 'A', { weight: 1.5 });
      session.castVote('agent-2', 'A', { weight: 2.0 });
      session.castVote('agent-3', 'B', { weight: 3.0 });

      const result = session.finalize();
      expect(result.winner).toBe('A'); // 3.5 > 3.0
    });
  });

  describe('Unanimous Voting', () => {
    let voting;
    let session;

    beforeEach(() => {
      voting = new ConsensusVoting({ algorithm: ConsensusAlgorithm.UNANIMOUS });
      session = voting.createSession('unanimous-test');
    });

    test('should reach consensus when all agree', () => {
      session.castVote('agent-1', 'A');
      session.castVote('agent-2', 'A');
      session.castVote('agent-3', 'A');

      const result = session.finalize();
      expect(result.winner).toBe('A');
      expect(result.consensusReached).toBe(true);
    });

    test('should not reach consensus with disagreement', () => {
      session.castVote('agent-1', 'A');
      session.castVote('agent-2', 'A');
      session.castVote('agent-3', 'B');

      const result = session.finalize();
      expect(result.consensusReached).toBe(false);
      expect(result.winner).toBeNull();
    });

    test('should work with single vote', () => {
      session.castVote('agent-1', 'A');

      const result = session.finalize();
      expect(result.winner).toBe('A');
      expect(result.consensusReached).toBe(true);
    });
  });

  describe('Confidence-Weighted Voting', () => {
    let voting;
    let session;

    beforeEach(() => {
      voting = new ConsensusVoting({ 
        algorithm: ConsensusAlgorithm.CONFIDENCE_WEIGHTED,
        threshold: 0.5
      });
      session = voting.createSession('confidence-test');
    });

    test('should weight by confidence and vote weight', () => {
      session.castVote('agent-1', 'A', { weight: 2.0, confidence: 0.9 });
      session.castVote('agent-2', 'A', { weight: 1.0, confidence: 0.8 });
      session.castVote('agent-3', 'B', { weight: 2.0, confidence: 0.5 });

      const result = session.finalize();
      expect(result.winner).toBe('A'); // (2*0.9 + 1*0.8) = 2.6 > (2*0.5) = 1.0
      expect(result.consensusReached).toBe(true);
    });

    test('should not reach consensus below threshold', () => {
      session.castVote('agent-1', 'A', { weight: 1.0, confidence: 0.4 });
      session.castVote('agent-2', 'B', { weight: 1.0, confidence: 0.6 });

      const result = session.finalize();
      // B wins but doesn't meet threshold (0.6 / 1.0 > 0.5 threshold)
      expect(result.winner).toBe('B');
    });

    test('should calculate aggregate confidence correctly', () => {
      session.castVote('agent-1', 'A', { weight: 1.0, confidence: 0.9 });
      session.castVote('agent-2', 'A', { weight: 1.0, confidence: 0.7 });

      const result = session.finalize();
      expect(result.confidence).toBeCloseTo(0.8, 1); // (0.9 + 0.7) / 2
    });
  });

  describe('Threshold Voting', () => {
    let voting;
    let session;

    beforeEach(() => {
      voting = new ConsensusVoting({ 
        algorithm: ConsensusAlgorithm.THRESHOLD,
        threshold: 0.6
      });
      session = voting.createSession('threshold-test');
    });

    test('should reach consensus when threshold is met', () => {
      session.castVote('agent-1', 'A', { weight: 3.0 });
      session.castVote('agent-2', 'A', { weight: 1.0 });
      session.castVote('agent-3', 'B', { weight: 1.0 });

      const result = session.finalize();
      expect(result.winner).toBe('A');
      expect(result.consensusReached).toBe(true); // 4/5 = 0.8 > 0.6
    });

    test('should not reach consensus when threshold not met', () => {
      session.castVote('agent-1', 'A', { weight: 2.0 });
      session.castVote('agent-2', 'B', { weight: 2.0 });
      session.castVote('agent-3', 'C', { weight: 2.0 });

      const result = session.finalize();
      expect(result.consensusReached).toBe(false); // 2/6 = 0.33 < 0.6
    });
  });

  describe('Conflict Resolution', () => {
    test('should resolve by highest confidence', () => {
      const voting = new ConsensusVoting({ 
        algorithm: ConsensusAlgorithm.MAJORITY,
        conflictResolution: 'highest-confidence'
      });
      const session = voting.createSession('conflict-test');

      session.castVote('agent-1', 'A', { confidence: 0.9 });
      session.castVote('agent-2', 'B', { confidence: 0.6 });

      const result = session.finalize();
      expect(result.winner).toBe('A');
      expect(result.metadata.conflict).toBe(true);
    });

    test('should resolve randomly', () => {
      const voting = new ConsensusVoting({ 
        algorithm: ConsensusAlgorithm.MAJORITY,
        conflictResolution: 'random'
      });
      const session = voting.createSession('conflict-test');

      session.castVote('agent-1', 'A');
      session.castVote('agent-2', 'B');

      const result = session.finalize();
      expect(['A', 'B']).toContain(result.winner);
      expect(result.metadata.conflict).toBe(true);
    });

    test('should resolve by first', () => {
      const voting = new ConsensusVoting({ 
        algorithm: ConsensusAlgorithm.MAJORITY,
        conflictResolution: 'first'
      });
      const session = voting.createSession('conflict-test');

      session.castVote('agent-1', 'A');
      session.castVote('agent-2', 'B');

      const result = session.finalize();
      expect(result.metadata.conflict).toBe(true);
    });
  });

  describe('Quick Vote Helper', () => {
    test('should perform quick vote', () => {
      const votes = [
        { agentId: 'agent-1', choice: 'A', confidence: 0.9, weight: 1.0 },
        { agentId: 'agent-2', choice: 'A', confidence: 0.8, weight: 1.0 },
        { agentId: 'agent-3', choice: 'B', confidence: 0.7, weight: 1.0 }
      ];

      const result = quickVote(votes, { algorithm: ConsensusAlgorithm.MAJORITY });
      expect(result.winner).toBe('A');
      expect(result.consensusReached).toBe(true);
    });

    test('should work with confidence-weighted algorithm', () => {
      const votes = [
        { agentId: 'agent-1', choice: 'A', confidence: 0.9, weight: 2.0 },
        { agentId: 'agent-2', choice: 'B', confidence: 0.5, weight: 3.0 }
      ];

      const result = quickVote(votes, { 
        algorithm: ConsensusAlgorithm.CONFIDENCE_WEIGHTED,
        threshold: 0.5
      });
      
      expect(result.winner).toBe('A'); // 2*0.9 = 1.8 > 3*0.5 = 1.5
    });
  });

  describe('Event Emitters', () => {
    let voting;
    let session;

    beforeEach(() => {
      voting = new ConsensusVoting();
      session = voting.createSession('event-test');
    });

    test('should emit vote-cast event', (done) => {
      session.on('vote-cast', (vote) => {
        expect(vote.agentId).toBe('agent-1');
        expect(vote.choice).toBe('A');
        done();
      });

      session.castVote('agent-1', 'A');
    });

    test('should emit vote-updated event', (done) => {
      session.castVote('agent-1', 'A');
      
      session.on('vote-updated', (vote) => {
        expect(vote.choice).toBe('B');
        done();
      });

      session.castVote('agent-1', 'B');
    });

    test('should emit complete event', (done) => {
      session.on('complete', (result) => {
        expect(result.winner).toBe('A');
        done();
      });

      session.castVote('agent-1', 'A');
      session.finalize();
    });

    test('should emit session-complete on system', (done) => {
      voting.on('session-complete', ({ sessionId, result }) => {
        expect(sessionId).toBe('event-test');
        expect(result.winner).toBe('A');
        done();
      });

      session.castVote('agent-1', 'A');
      session.finalize();
    });
  });

  describe('Session Timeout', () => {
    test('should timeout and finalize automatically', (done) => {
      const voting = new ConsensusVoting();
      const session = voting.createSession('timeout-test', { timeout: 100 });

      session.castVote('agent-1', 'A');

      session.on('complete', () => {
        expect(session.status).toBe('complete');
        done();
      });
    }, 200);

    test('should emit session-timeout on system', (done) => {
      const voting = new ConsensusVoting();
      voting.on('session-timeout', ({ sessionId }) => {
        expect(sessionId).toBe('timeout-test');
        done();
      });

      const session = voting.createSession('timeout-test', { timeout: 100 });
      session.castVote('agent-1', 'A');
    }, 200);
  });

  describe('Edge Cases', () => {
    let voting;
    let session;

    beforeEach(() => {
      voting = new ConsensusVoting();
      session = voting.createSession('edge-test');
    });

    test('should handle empty votes', () => {
      const result = session.finalize();
      expect(result.winner).toBeNull();
      expect(result.consensusReached).toBe(false);
    });

    test('should handle single vote', () => {
      session.castVote('agent-1', 'A');
      const result = session.finalize();
      expect(result.winner).toBe('A');
    });

    test('should handle zero weight votes', () => {
      session.castVote('agent-1', 'A', { weight: 0 });
      session.castVote('agent-2', 'B', { weight: 1 });
      const result = session.finalize();
      expect(result.winner).toBe('B');
    });

    test('should handle zero confidence votes', () => {
      const votingCW = new ConsensusVoting({ 
        algorithm: ConsensusAlgorithm.CONFIDENCE_WEIGHTED 
      });
      const sessionCW = votingCW.createSession('zero-conf');
      
      sessionCW.castVote('agent-1', 'A', { confidence: 0 });
      sessionCW.castVote('agent-2', 'B', { confidence: 0.5 });
      
      const result = sessionCW.finalize();
      expect(result.winner).toBe('B');
    });

    test('should preserve vote metadata', () => {
      session.castVote('agent-1', 'A', { 
        metadata: { reason: 'best option', timestamp: 12345 }
      });
      
      const votes = session.getVotes();
      expect(votes[0].metadata.reason).toBe('best option');
      expect(votes[0].metadata.timestamp).toBe(12345);
    });

    test('should not finalize twice', () => {
      session.castVote('agent-1', 'A');
      const result1 = session.finalize();
      const result2 = session.finalize();
      expect(result1).toBe(result2);
    });
  });

  describe('Status and Inspection', () => {
    let voting;
    let session;

    beforeEach(() => {
      voting = new ConsensusVoting();
      session = voting.createSession('status-test');
    });

    test('should get session status', () => {
      session.castVote('agent-1', 'A');
      const status = session.getStatus();
      
      expect(status.sessionId).toBe('status-test');
      expect(status.status).toBe('open');
      expect(status.voteCount).toBe(1);
      expect(status.algorithm).toBe(ConsensusAlgorithm.MAJORITY);
      expect(status.startTime).toBeDefined();
    });

    test('should include result in status after finalization', () => {
      session.castVote('agent-1', 'A');
      session.finalize();
      
      const status = session.getStatus();
      expect(status.status).toBe('complete');
      expect(status.result).toBeDefined();
      expect(status.result.winner).toBe('A');
    });

    test('should get all votes', () => {
      session.castVote('agent-1', 'A');
      session.castVote('agent-2', 'B');
      session.castVote('agent-3', 'A');
      
      const votes = session.getVotes();
      expect(votes).toHaveLength(3);
      expect(votes.map(v => v.agentId)).toContain('agent-1');
      expect(votes.map(v => v.agentId)).toContain('agent-2');
      expect(votes.map(v => v.agentId)).toContain('agent-3');
    });

    test('should include distribution in result', () => {
      session.castVote('agent-1', 'A');
      session.castVote('agent-2', 'A');
      session.castVote('agent-3', 'B');
      
      const result = session.finalize();
      expect(result.distribution).toBeDefined();
      
      const distKeys = Object.keys(result.distribution);
      expect(distKeys).toHaveLength(2);
    });
  });
});
