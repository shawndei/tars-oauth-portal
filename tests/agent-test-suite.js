/**
 * Comprehensive Test Suite for All 5 Specialist Agents
 * Tests: Researcher, Analyst, Coder, Writer, Coordinator
 */

const { AgentTestHarness } = require('./agent-test-harness');

/**
 * Test Suite Factory
 */
class AgentTestSuiteFactory {
  static createResearcherTests() {
    return [
      {
        name: 'researcher-simple-query',
        agentId: 'researcher-primary',
        input: {
          query: 'What are the latest trends in AI agents?',
          type: 'research',
          depth: 'shallow'
        },
        expectedOutput: {
          type: 'research-result',
          hasContext: true,
          hasSources: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 50;
          return {
            passed,
            reason: passed ? 'Valid response' : 'Response too short',
            checks: {
              hasText: !!output.text,
              hasMetadata: !!output.timestamp,
              isComplete: output.text.length > 50
            }
          };
        }
      },
      {
        name: 'researcher-synthesis',
        agentId: 'researcher-primary',
        input: {
          topics: ['machine learning', 'reliability', 'testing'],
          type: 'synthesis',
          depth: 'deep'
        },
        expectedOutput: {
          type: 'synthesis-result',
          hasConnections: true,
          isComprehensive: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 100;
          return {
            passed,
            reason: passed ? 'Synthesis complete' : 'Incomplete synthesis',
            checks: {
              isSynthesis: output.text.includes('connection') || output.text.includes('relation'),
              depth: output.text.length > 100,
              coherence: output.text.split('\n').length > 2
            }
          };
        }
      },
      {
        name: 'researcher-fact-checking',
        agentId: 'researcher-primary',
        input: {
          claim: 'Claude is the most capable AI model',
          type: 'fact-check'
        },
        expectedOutput: {
          type: 'fact-check-result',
          hasSources: true,
          hasAnalysis: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 50;
          return {
            passed,
            reason: passed ? 'Fact check complete' : 'Incomplete analysis',
            checks: {
              isFactCheck: true,
              hasSupport: output.text.includes('evidence') || output.text.includes('source'),
              isObjective: !output.text.includes('opinion')
            }
          };
        }
      },
      {
        name: 'researcher-data-aggregation',
        agentId: 'researcher-primary',
        input: {
          sources: ['source1', 'source2', 'source3'],
          type: 'aggregation',
          format: 'structured'
        },
        expectedOutput: {
          type: 'aggregation-result',
          isStructured: true,
          isComprehensive: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 50;
          return {
            passed,
            reason: passed ? 'Data aggregated' : 'Incomplete aggregation',
            checks: {
              isAggregated: true,
              hasStructure: output.text.length > 100,
              completeness: output.text.split('source').length > 2
            }
          };
        }
      }
    ];
  }

  static createAnalystTests() {
    return [
      {
        name: 'analyst-data-analysis',
        agentId: 'analyst-primary',
        input: {
          data: [
            { month: 'Jan', value: 100, trend: 'up' },
            { month: 'Feb', value: 120, trend: 'up' },
            { month: 'Mar', value: 115, trend: 'down' }
          ],
          type: 'trend-analysis'
        },
        expectedOutput: {
          type: 'analysis-result',
          hasTrends: true,
          hasInsights: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 50;
          return {
            passed,
            reason: passed ? 'Analysis complete' : 'Incomplete analysis',
            checks: {
              hasTrend: output.text.toLowerCase().includes('trend') || output.text.toLowerCase().includes('increase'),
              hasNumbers: /\d+/.test(output.text),
              hasInsight: output.text.length > 100
            }
          };
        }
      },
      {
        name: 'analyst-pattern-recognition',
        agentId: 'analyst-primary',
        input: {
          dataset: 'multiple_time_series',
          type: 'pattern-detection',
          sensitivity: 'high'
        },
        expectedOutput: {
          type: 'pattern-result',
          patterns: [],
          confidence: 0
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 30;
          return {
            passed,
            reason: passed ? 'Patterns identified' : 'No patterns found',
            checks: {
              hasPatterns: output.text.toLowerCase().includes('pattern'),
              isSignificant: output.text.length > 50,
              hasConfidence: output.text.toLowerCase().includes('confidence') || output.text.toLowerCase().includes('likely')
            }
          };
        }
      },
      {
        name: 'analyst-metrics-calculation',
        agentId: 'analyst-primary',
        input: {
          metrics: ['accuracy', 'precision', 'recall', 'f1'],
          type: 'calculation'
        },
        expectedOutput: {
          type: 'metrics-result',
          hasCalculations: true,
          isAccurate: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && /\d+/.test(output.text);
          return {
            passed,
            reason: passed ? 'Metrics calculated' : 'Calculation failed',
            checks: {
              hasNumbers: /[\d.]+%?/.test(output.text),
              isCalculated: output.text.toLowerCase().includes('metric') || output.text.toLowerCase().includes('score'),
              hasContext: output.text.length > 50
            }
          };
        }
      },
      {
        name: 'analyst-report-generation',
        agentId: 'analyst-primary',
        input: {
          title: 'Q1 Performance Report',
          sections: ['executive-summary', 'metrics', 'recommendations'],
          type: 'report'
        },
        expectedOutput: {
          type: 'report-result',
          hasStructure: true,
          isComplete: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 100;
          return {
            passed,
            reason: passed ? 'Report generated' : 'Incomplete report',
            checks: {
              hasStructure: output.text.includes('\n'),
              hasContent: output.text.length > 100,
              hasRecommendations: output.text.toLowerCase().includes('recommend') || output.text.toLowerCase().includes('suggest')
            }
          };
        }
      }
    ];
  }

  static createCoderTests() {
    return [
      {
        name: 'coder-code-generation',
        agentId: 'coder-primary',
        input: {
          prompt: 'Generate a function to calculate fibonacci',
          language: 'javascript',
          complexity: 'simple'
        },
        expectedOutput: {
          type: 'code-result',
          hasCode: true,
          isValid: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && (output.text.includes('function') || output.text.includes('const'));
          return {
            passed,
            reason: passed ? 'Code generated' : 'Invalid code generation',
            checks: {
              hasCode: output.text.includes('function') || output.text.includes('const'),
              hasSyntax: output.text.includes('{') && output.text.includes('}'),
              isComplete: output.text.length > 50
            }
          };
        }
      },
      {
        name: 'coder-bug-fixing',
        agentId: 'coder-primary',
        input: {
          buggyCode: 'function add(a, b) { return a + c; }',
          language: 'javascript',
          type: 'bug-fix'
        },
        expectedOutput: {
          type: 'fix-result',
          hasFix: true,
          isCorrect: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && (output.text.includes('b') || output.text.includes('fix'));
          return {
            passed,
            reason: passed ? 'Bug fixed' : 'Fix incomplete',
            checks: {
              identifiesBug: output.text.toLowerCase().includes('bug') || output.text.toLowerCase().includes('error'),
              hasCorrection: output.text.includes('b'),
              isExplained: output.text.length > 50
            }
          };
        }
      },
      {
        name: 'coder-architecture-design',
        agentId: 'coder-primary',
        input: {
          requirement: 'Design a multi-agent system',
          scale: 'large',
          type: 'architecture'
        },
        expectedOutput: {
          type: 'architecture-result',
          hasDesign: true,
          isScalable: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 100;
          return {
            passed,
            reason: passed ? 'Architecture designed' : 'Incomplete design',
            checks: {
              hasComponents: output.text.toLowerCase().includes('component') || output.text.toLowerCase().includes('module'),
              hasScaling: output.text.toLowerCase().includes('scale') || output.text.toLowerCase().includes('distributed'),
              isComprehensive: output.text.length > 100
            }
          };
        }
      },
      {
        name: 'coder-code-review',
        agentId: 'coder-primary',
        input: {
          code: 'function process(data) { let result = []; for(let i=0; i<data.length; i++) { result.push(data[i]*2); } return result; }',
          type: 'review',
          focusAreas: ['performance', 'readability']
        },
        expectedOutput: {
          type: 'review-result',
          hasFeedback: true,
          hasImprovements: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && (output.text.toLowerCase().includes('improve') || output.text.toLowerCase().includes('suggest'));
          return {
            passed,
            reason: passed ? 'Review complete' : 'Incomplete review',
            checks: {
              hasAnalysis: output.text.length > 50,
              hasSuggestions: output.text.toLowerCase().includes('suggest') || output.text.toLowerCase().includes('consider'),
              isConstructive: !output.text.toLowerCase().includes('wrong')
            }
          };
        }
      }
    ];
  }

  static createWriterTests() {
    return [
      {
        name: 'writer-content-creation',
        agentId: 'writer-primary',
        input: {
          topic: 'The Future of AI',
          style: 'formal',
          length: 'medium',
          type: 'article'
        },
        expectedOutput: {
          type: 'content-result',
          hasContent: true,
          isPolished: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 100;
          return {
            passed,
            reason: passed ? 'Content created' : 'Content too short',
            checks: {
              hasContent: output.text.length > 100,
              hasStructure: output.text.includes('\n') || output.text.split(' ').length > 20,
              isProfessional: !output.text.toLowerCase().includes('error')
            }
          };
        }
      },
      {
        name: 'writer-documentation',
        agentId: 'writer-primary',
        input: {
          subject: 'Agent test harness API',
          type: 'documentation',
          format: 'markdown'
        },
        expectedOutput: {
          type: 'documentation-result',
          hasStructure: true,
          isComplete: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 100;
          return {
            passed,
            reason: passed ? 'Documentation complete' : 'Incomplete documentation',
            checks: {
              hasStructure: output.text.includes('#') || output.text.includes('##'),
              hasExamples: output.text.toLowerCase().includes('example') || output.text.toLowerCase().includes('usage'),
              isComplete: output.text.length > 100
            }
          };
        }
      },
      {
        name: 'writer-editing',
        agentId: 'writer-primary',
        input: {
          text: 'The ai agent was very smart and it could do alot of things very good.',
          type: 'editing',
          focusAreas: ['grammar', 'clarity']
        },
        expectedOutput: {
          type: 'edited-result',
          isImproved: true,
          isGrammatical: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 50;
          return {
            passed,
            reason: passed ? 'Editing complete' : 'Editing failed',
            checks: {
              hasCorrections: output.text.toLowerCase().includes('improved') || output.text.toLowerCase().includes('correct'),
              isClean: !output.text.includes('alot'),
              isPolished: output.text.length > 50
            }
          };
        }
      },
      {
        name: 'writer-summarization',
        agentId: 'writer-primary',
        input: {
          text: 'Long document with many paragraphs and detailed information about various topics including history, science, and technology.',
          type: 'summary',
          length: 'short'
        },
        expectedOutput: {
          type: 'summary-result',
          isConcise: true,
          isAccurate: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 20 && output.text.length < 500;
          return {
            passed,
            reason: passed ? 'Summary complete' : 'Summary invalid',
            checks: {
              isConcise: output.text.length < 300,
              capturesEssence: output.text.length > 30,
              isShorter: true
            }
          };
        }
      }
    ];
  }

  static createCoordinatorTests() {
    return [
      {
        name: 'coordinator-task-decomposition',
        agentId: 'coordinator-primary',
        input: {
          task: 'Research AI trends, analyze the data, and write a report',
          complexity: 'high',
          type: 'decomposition'
        },
        expectedOutput: {
          type: 'decomposition-result',
          hasTasks: true,
          isLogical: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && (output.text.toLowerCase().includes('task') || output.text.toLowerCase().includes('step'));
          return {
            passed,
            reason: passed ? 'Decomposition complete' : 'Incomplete decomposition',
            checks: {
              hasSteps: output.text.toLowerCase().includes('task') || output.text.toLowerCase().includes('step'),
              isOrdered: output.text.includes('1') || output.text.includes('first'),
              isLogical: output.text.length > 50
            }
          };
        }
      },
      {
        name: 'coordinator-agent-delegation',
        agentId: 'coordinator-primary',
        input: {
          decomposedTasks: [
            { task: 'research', description: 'Find latest data' },
            { task: 'analysis', description: 'Analyze patterns' },
            { task: 'writing', description: 'Create report' }
          ],
          type: 'delegation'
        },
        expectedOutput: {
          type: 'delegation-result',
          hasAssignments: true,
          isOptimal: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && (output.text.toLowerCase().includes('assign') || output.text.toLowerCase().includes('delegate'));
          return {
            passed,
            reason: passed ? 'Delegation complete' : 'Incomplete delegation',
            checks: {
              hasAssignments: output.text.toLowerCase().includes('assign') || output.text.toLowerCase().includes('delegate'),
              isClear: output.text.length > 50,
              isRational: !output.text.toLowerCase().includes('error')
            }
          };
        }
      },
      {
        name: 'coordinator-result-synthesis',
        agentId: 'coordinator-primary',
        input: {
          results: [
            { from: 'researcher', data: 'Trends found' },
            { from: 'analyst', data: 'Patterns identified' },
            { from: 'writer', data: 'Report drafted' }
          ],
          type: 'synthesis'
        },
        expectedOutput: {
          type: 'synthesis-result',
          isComplete: true,
          isCoherent: true
        },
        validator: async (output, expected) => {
          const passed = output && output.text && output.text.length > 100;
          return {
            passed,
            reason: passed ? 'Synthesis complete' : 'Incomplete synthesis',
            checks: {
              isSynthesized: output.text.length > 100,
              hasAllResults: output.text.split('\n').length > 2,
              isCoherent: !output.text.includes('error')
            }
          };
        }
      },
      {
        name: 'coordinator-quality-validation',
        agentId: 'coordinator-primary',
        input: {
          output: 'Complete research report with data and analysis',
          expectedQuality: 'high',
          type: 'validation'
        },
        expectedOutput: {
          type: 'validation-result',
          isValid: true,
          qualityScore: 0
        },
        validator: async (output, expected) => {
          const passed = output && output.text && (output.text.toLowerCase().includes('valid') || output.text.toLowerCase().includes('quality'));
          return {
            passed,
            reason: passed ? 'Validation complete' : 'Validation failed',
            checks: {
              hasQualityCheck: output.text.toLowerCase().includes('quality') || output.text.toLowerCase().includes('valid'),
              hasScore: /\d+/.test(output.text),
              hasRecommendation: output.text.length > 50
            }
          };
        }
      }
    ];
  }

  static getAllTests() {
    return {
      researcher: this.createResearcherTests(),
      analyst: this.createAnalystTests(),
      coder: this.createCoderTests(),
      writer: this.createWriterTests(),
      coordinator: this.createCoordinatorTests()
    };
  }

  static getTestsByAgent(agentId) {
    const allTests = this.getAllTests();
    const agent = agentId.split('-')[0];
    return allTests[agent] || [];
  }
}

module.exports = { AgentTestSuiteFactory };
