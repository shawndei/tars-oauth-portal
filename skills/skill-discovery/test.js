#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Skill Discovery System
 */

const { SkillDiscovery } = require('./index');
const { Scanner } = require('./scanner');
const { CapabilityDetector } = require('./capability-detector');
const { DependencyResolver } = require('./dependency-resolver');
const { ChainComposer } = require('./chain-composer');
const { RecommendationEngine } = require('./recommendation-engine');
const path = require('path');

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async test(name, fn) {
    try {
      await fn();
      this.passed++;
      console.log(`✓ ${name}`);
    } catch (error) {
      this.failed++;
      console.error(`✗ ${name}`);
      console.error(`  Error: ${error.message}`);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertGreaterThan(actual, expected, message) {
    if (actual <= expected) {
      throw new Error(message || `Expected ${actual} > ${expected}`);
    }
  }

  assertExists(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || 'Expected value to exist');
    }
  }

  summary() {
    console.log('\n' + '='.repeat(60));
    console.log(`Test Results: ${this.passed} passed, ${this.failed} failed`);
    console.log('='.repeat(60));
    
    return this.failed === 0;
  }
}

async function runTests() {
  const runner = new TestRunner();
  
  console.log('🧪 Running Skill Discovery Test Suite\n');
  
  // Initialize system
  const discovery = new SkillDiscovery();
  
  // Test 1: Scanner - Find skill directories
  await runner.test('Scanner finds skill directories', () => {
    const scanner = new Scanner(discovery.skillsDir);
    const dirs = scanner.findSkillDirectories();
    
    runner.assertGreaterThan(dirs.length, 0, 'Should find at least one skill directory');
  });
  
  // Test 2: Scanner - Parse SKILL.md
  await runner.test('Scanner parses SKILL.md correctly', () => {
    const scanner = new Scanner(discovery.skillsDir);
    const dirs = scanner.findSkillDirectories();
    
    if (dirs.length === 0) {
      throw new Error('No skill directories found to test parsing');
    }
    
    const skillData = scanner.parseSkillMd(dirs[0]);
    
    runner.assertExists(skillData, 'Should return skill data');
    runner.assertExists(skillData.name, 'Should have name');
    runner.assertExists(skillData.path, 'Should have path');
  });
  
  // Test 3: Initialize and scan
  await runner.test('Initialize and scan all skills', async () => {
    await discovery.initialize(true); // Force rescan
    
    runner.assertExists(discovery.skillRegistry, 'Should create skill registry');
    runner.assertGreaterThan(
      Object.keys(discovery.skillRegistry).length,
      0,
      'Should have at least one skill'
    );
  });
  
  // Test 4: Capability Detection
  await runner.test('Capability detector extracts capabilities', () => {
    const skills = Object.values(discovery.skillRegistry);
    
    if (skills.length === 0) {
      throw new Error('No skills in registry');
    }
    
    let foundCapabilities = false;
    for (const skill of skills) {
      if (skill.capabilities && skill.capabilities.length > 0) {
        foundCapabilities = true;
        break;
      }
    }
    
    runner.assert(foundCapabilities, 'At least one skill should have capabilities');
  });
  
  // Test 5: Tag Extraction
  await runner.test('Capability detector extracts tags', () => {
    const skills = Object.values(discovery.skillRegistry);
    
    let foundTags = false;
    for (const skill of skills) {
      if (skill.tags && skill.tags.length > 0) {
        foundTags = true;
        break;
      }
    }
    
    runner.assert(foundTags, 'At least one skill should have tags');
  });
  
  // Test 6: Dependency Resolution
  await runner.test('Dependency resolver builds graph', () => {
    const stats = discovery.getStats();
    
    runner.assertExists(stats.totalDependencies, 'Should track total dependencies');
    // Dependencies may be 0 if skills are independent, so we just check it exists
  });
  
  // Test 7: Search functionality
  await runner.test('Search finds relevant skills', () => {
    const results = discovery.search('memory');
    
    runner.assert(Array.isArray(results), 'Should return array of results');
    
    // If results found, verify structure
    if (results.length > 0) {
      const first = results[0];
      runner.assertExists(first.skill, 'Result should have skill');
      runner.assertExists(first.score, 'Result should have score');
    }
  });
  
  // Test 8: Recommendation engine
  await runner.test('Recommendation engine suggests skills', () => {
    const recommendations = discovery.recommend('send email notifications');
    
    runner.assert(Array.isArray(recommendations), 'Should return array of recommendations');
    
    if (recommendations.length > 0) {
      const first = recommendations[0];
      runner.assertExists(first.skill, 'Recommendation should have skill');
      runner.assertExists(first.score, 'Recommendation should have score');
    }
  });
  
  // Test 9: Skill chain composition
  await runner.test('Chain composer creates execution plans', () => {
    const chain = discovery.composeChain('search memory and send email');
    
    runner.assertExists(chain, 'Should return chain object');
    runner.assertExists(chain.goal, 'Should have goal');
    runner.assertExists(chain.steps, 'Should have steps');
    runner.assertExists(chain.executionPlan, 'Should have execution plan');
    runner.assert(Array.isArray(chain.subTasks), 'Should have subTasks array');
  });
  
  // Test 10: List skills with filters
  await runner.test('List skills with status filter', () => {
    const allSkills = discovery.listSkills();
    runner.assertGreaterThan(allSkills.length, 0, 'Should have skills');
    
    // Try filtering by production status
    const productionSkills = discovery.listSkills({ status: 'production' });
    runner.assert(Array.isArray(productionSkills), 'Filtered results should be array');
  });
  
  // Test 11: Get specific skill
  await runner.test('Get specific skill by name', () => {
    const allSkills = discovery.listSkills();
    
    if (allSkills.length === 0) {
      throw new Error('No skills to test');
    }
    
    const skillName = allSkills[0].name;
    const skill = discovery.getSkill(skillName);
    
    runner.assertExists(skill, 'Should return skill');
    runner.assertEqual(skill.name, skillName, 'Should return correct skill');
  });
  
  // Test 12: Statistics
  await runner.test('Get statistics about skill registry', () => {
    const stats = discovery.getStats();
    
    runner.assertExists(stats.totalSkills, 'Should have totalSkills');
    runner.assertExists(stats.byStatus, 'Should have byStatus');
    runner.assertExists(stats.totalCapabilities, 'Should have totalCapabilities');
    runner.assertGreaterThan(stats.totalSkills, 0, 'Should have at least one skill');
  });
  
  // Test 13: Cache functionality
  await runner.test('Cache save and load', () => {
    // Save cache
    discovery.saveCache();
    
    // Create new instance and try to load cache
    const discovery2 = new SkillDiscovery();
    const loaded = discovery2.loadCache();
    
    runner.assert(loaded, 'Should load cache successfully');
    runner.assertGreaterThan(
      Object.keys(discovery2.skillRegistry).length,
      0,
      'Cached registry should have skills'
    );
  });
  
  // Test 14: Dependency metrics
  await runner.test('Calculate dependency metrics', () => {
    const skills = Object.values(discovery.skillRegistry);
    
    if (skills.length === 0) {
      throw new Error('No skills to test');
    }
    
    const skill = skills[0];
    const metrics = discovery.dependencyResolver.getDependencyMetrics(skill.name);
    
    runner.assertExists(metrics, 'Should return metrics');
    runner.assertExists(metrics.directDependencies, 'Should have directDependencies');
    runner.assertExists(metrics.totalDependencies, 'Should have totalDependencies');
  });
  
  // Test 15: Circular dependency detection
  await runner.test('Detect circular dependencies', () => {
    const circular = discovery.dependencyResolver.detectCircularDependencies();
    
    runner.assert(Array.isArray(circular), 'Should return array');
    // It's okay if no circular dependencies found
  });
  
  // Test 16: Topological sort
  await runner.test('Generate topological sort', () => {
    const sorted = discovery.dependencyResolver.getTopologicalSort();
    
    runner.assert(Array.isArray(sorted), 'Should return array');
    runner.assertGreaterThan(sorted.length, 0, 'Should have at least one skill in sort');
  });
  
  // Test 17: Parallel step identification
  await runner.test('Identify parallel steps in chain', () => {
    const chain = discovery.composeChain('search memory and analyze data and send notification');
    
    runner.assertExists(chain.parallelGroups, 'Should have parallelGroups');
    runner.assert(Array.isArray(chain.parallelGroups), 'parallelGroups should be array');
  });
  
  // Test 18: Search with minimum score threshold
  await runner.test('Search respects minimum score threshold', () => {
    const results = discovery.search('email', { minScore: 0.8 });
    
    for (const result of results) {
      runner.assertGreaterThan(
        result.score,
        0.79,
        `Score ${result.score} should be >= 0.8`
      );
    }
  });
  
  // Test 19: Recommendation reasoning
  await runner.test('Recommendations include reasoning', () => {
    const recommendations = discovery.recommend('backup files', {
      includeReasoning: true
    });
    
    if (recommendations.length > 0) {
      const first = recommendations[0];
      runner.assertExists(first.reasoning, 'Should have reasoning');
      runner.assert(
        typeof first.reasoning === 'string',
        'Reasoning should be a string'
      );
    }
  });
  
  // Test 20: Clear cache
  await runner.test('Clear cache', () => {
    discovery.clearCache();
    // Just verify it doesn't throw
    runner.assert(true, 'Cache cleared without error');
  });
  
  // Performance Tests
  console.log('\n⚡ Performance Tests\n');
  
  await runner.test('Performance: Scan completes in reasonable time', async () => {
    const start = Date.now();
    await discovery.scan();
    const duration = Date.now() - start;
    
    console.log(`     Scan took ${duration}ms`);
    runner.assert(duration < 10000, 'Scan should complete in under 10 seconds');
  });
  
  await runner.test('Performance: Search is fast', () => {
    const start = Date.now();
    discovery.search('email');
    const duration = Date.now() - start;
    
    console.log(`     Search took ${duration}ms`);
    runner.assert(duration < 1000, 'Search should complete in under 1 second');
  });
  
  await runner.test('Performance: Recommendation is fast', () => {
    const start = Date.now();
    discovery.recommend('send notification');
    const duration = Date.now() - start;
    
    console.log(`     Recommendation took ${duration}ms`);
    runner.assert(duration < 1000, 'Recommendation should complete in under 1 second');
  });
  
  // Integration Tests
  console.log('\n🔗 Integration Tests\n');
  
  await runner.test('Integration: End-to-end workflow', async () => {
    // Fresh instance
    const testDiscovery = new SkillDiscovery();
    
    // Initialize
    await testDiscovery.initialize();
    
    // Search
    const searchResults = testDiscovery.search('memory');
    runner.assert(Array.isArray(searchResults), 'Search should return array');
    
    // Recommend
    const recommendations = testDiscovery.recommend('analyze data');
    runner.assert(Array.isArray(recommendations), 'Recommend should return array');
    
    // Compose
    const chain = testDiscovery.composeChain('search and analyze and report');
    runner.assertExists(chain, 'Compose should return chain');
    
    // Stats
    const stats = testDiscovery.getStats();
    runner.assertGreaterThan(stats.totalSkills, 0, 'Should have skills');
  });
  
  return runner.summary();
}

// Run tests
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = { runTests };
