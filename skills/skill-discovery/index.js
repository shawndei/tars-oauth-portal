#!/usr/bin/env node

/**
 * Skill Auto-Discovery & Composition Engine
 * 
 * Main entry point for skill discovery, capability detection,
 * dependency resolution, and skill chain composition.
 */

const fs = require('fs');
const path = require('path');
const { Scanner } = require('./scanner');
const { CapabilityDetector } = require('./capability-detector');
const { DependencyResolver } = require('./dependency-resolver');
const { ChainComposer } = require('./chain-composer');
const { RecommendationEngine } = require('./recommendation-engine');

class SkillDiscovery {
  constructor(workspaceRoot = null) {
    this.workspaceRoot = workspaceRoot || process.env.OPENCLAW_WORKSPACE || path.join(process.env.USERPROFILE || process.env.HOME, '.openclaw', 'workspace');
    this.skillsDir = path.join(this.workspaceRoot, 'skills');
    this.cacheFile = path.join(this.workspaceRoot, '.skill-discovery-cache.json');
    
    this.scanner = new Scanner(this.skillsDir);
    this.capabilityDetector = new CapabilityDetector();
    this.dependencyResolver = new DependencyResolver();
    this.chainComposer = new ChainComposer();
    this.recommendationEngine = new RecommendationEngine();
    
    this.skillRegistry = null;
    this.lastScanTime = null;
  }

  /**
   * Initialize and scan all skills
   */
  async initialize(forceRescan = false) {
    console.log('🔍 Initializing Skill Discovery System...');
    
    // Try to load from cache first
    if (!forceRescan && this.loadCache()) {
      console.log(`✓ Loaded ${Object.keys(this.skillRegistry).length} skills from cache`);
      return this.skillRegistry;
    }
    
    // Perform fresh scan
    await this.scan();
    
    return this.skillRegistry;
  }

  /**
   * Scan all skills and build registry
   */
  async scan() {
    console.log(`📂 Scanning skills directory: ${this.skillsDir}`);
    
    // Step 1: Discover all skill directories
    const skillDirs = this.scanner.findSkillDirectories();
    console.log(`   Found ${skillDirs.length} potential skills`);
    
    // Step 2: Parse SKILL.md files
    const skills = [];
    for (const dir of skillDirs) {
      try {
        const skillData = this.scanner.parseSkillMd(dir);
        if (skillData) {
          skills.push(skillData);
        }
      } catch (error) {
        console.warn(`   ⚠️  Failed to parse ${dir}: ${error.message}`);
      }
    }
    
    console.log(`   Parsed ${skills.length} valid SKILL.md files`);
    
    // Step 3: Detect capabilities
    console.log('🎯 Detecting capabilities...');
    for (const skill of skills) {
      skill.capabilities = this.capabilityDetector.detect(skill);
      skill.tags = this.capabilityDetector.extractTags(skill);
    }
    
    // Step 4: Resolve dependencies
    console.log('🔗 Resolving dependencies...');
    this.dependencyResolver.buildDependencyGraph(skills);
    
    for (const skill of skills) {
      skill.dependencies = this.dependencyResolver.getSkillDependencies(skill);
      skill.dependents = this.dependencyResolver.getSkillDependents(skill);
    }
    
    // Step 5: Build registry
    this.skillRegistry = {};
    for (const skill of skills) {
      this.skillRegistry[skill.name] = skill;
    }
    
    this.lastScanTime = new Date().toISOString();
    
    console.log(`✓ Skill discovery complete: ${skills.length} skills indexed`);
    
    // Cache results
    this.saveCache();
    
    return this.skillRegistry;
  }

  /**
   * Find skills matching a query
   */
  search(query, options = {}) {
    if (!this.skillRegistry) {
      throw new Error('Skill registry not initialized. Call initialize() first.');
    }
    
    const {
      limit = 10,
      minScore = 0.5,
      includeCapabilities = true,
      includeTags = true
    } = options;
    
    const results = this.recommendationEngine.search(
      query,
      this.skillRegistry,
      { limit, minScore, includeCapabilities, includeTags }
    );
    
    return results;
  }

  /**
   * Recommend skills for a given task
   */
  recommend(task, options = {}) {
    if (!this.skillRegistry) {
      throw new Error('Skill registry not initialized. Call initialize() first.');
    }
    
    const {
      limit = 5,
      minScore = 0.6,
      includeReasoning = true
    } = options;
    
    const recommendations = this.recommendationEngine.recommend(
      task,
      this.skillRegistry,
      { limit, minScore, includeReasoning }
    );
    
    return recommendations;
  }

  /**
   * Compose a skill chain to accomplish a goal
   */
  composeChain(goal, options = {}) {
    if (!this.skillRegistry) {
      throw new Error('Skill registry not initialized. Call initialize() first.');
    }
    
    const {
      maxDepth = 5,
      allowParallel = true,
      optimizeForPerformance = true
    } = options;
    
    const chain = this.chainComposer.compose(
      goal,
      this.skillRegistry,
      this.dependencyResolver,
      { maxDepth, allowParallel, optimizeForPerformance }
    );
    
    return chain;
  }

  /**
   * Get detailed information about a specific skill
   */
  getSkill(skillName) {
    if (!this.skillRegistry) {
      throw new Error('Skill registry not initialized. Call initialize() first.');
    }
    
    return this.skillRegistry[skillName] || null;
  }

  /**
   * List all skills with optional filtering
   */
  listSkills(filter = {}) {
    if (!this.skillRegistry) {
      throw new Error('Skill registry not initialized. Call initialize() first.');
    }
    
    let skills = Object.values(this.skillRegistry);
    
    // Apply filters
    if (filter.status) {
      skills = skills.filter(s => s.status === filter.status);
    }
    
    if (filter.tag) {
      skills = skills.filter(s => s.tags && s.tags.includes(filter.tag));
    }
    
    if (filter.hasCapability) {
      skills = skills.filter(s => {
        return s.capabilities && s.capabilities.some(cap => 
          cap.toLowerCase().includes(filter.hasCapability.toLowerCase())
        );
      });
    }
    
    return skills;
  }

  /**
   * Get statistics about the skill registry
   */
  getStats() {
    if (!this.skillRegistry) {
      throw new Error('Skill registry not initialized. Call initialize() first.');
    }
    
    const skills = Object.values(this.skillRegistry);
    
    const stats = {
      totalSkills: skills.length,
      byStatus: {},
      byTag: {},
      totalCapabilities: 0,
      averageCapabilitiesPerSkill: 0,
      skillsWithDependencies: 0,
      totalDependencies: 0,
      lastScanTime: this.lastScanTime,
      cacheLocation: this.cacheFile
    };
    
    // Count by status
    for (const skill of skills) {
      const status = skill.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Count capabilities
      if (skill.capabilities) {
        stats.totalCapabilities += skill.capabilities.length;
      }
      
      // Count dependencies
      if (skill.dependencies && skill.dependencies.length > 0) {
        stats.skillsWithDependencies++;
        stats.totalDependencies += skill.dependencies.length;
      }
      
      // Count tags
      if (skill.tags) {
        for (const tag of skill.tags) {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        }
      }
    }
    
    stats.averageCapabilitiesPerSkill = skills.length > 0 
      ? (stats.totalCapabilities / skills.length).toFixed(2)
      : 0;
    
    return stats;
  }

  /**
   * Load cached skill registry
   */
  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        this.skillRegistry = data.skillRegistry;
        this.lastScanTime = data.lastScanTime;
        
        // Re-initialize components with cached data
        this.dependencyResolver.loadFromCache(data.dependencyGraph);
        
        return true;
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load cache: ${error.message}`);
    }
    
    return false;
  }

  /**
   * Save skill registry to cache
   */
  saveCache() {
    try {
      const data = {
        version: '1.0.0',
        lastScanTime: this.lastScanTime,
        skillRegistry: this.skillRegistry,
        dependencyGraph: this.dependencyResolver.exportGraph()
      };
      
      fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2), 'utf8');
      console.log(`💾 Cache saved: ${this.cacheFile}`);
    } catch (error) {
      console.error(`❌ Failed to save cache: ${error.message}`);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        fs.unlinkSync(this.cacheFile);
        console.log('✓ Cache cleared');
      }
    } catch (error) {
      console.error(`❌ Failed to clear cache: ${error.message}`);
    }
  }
}

// CLI interface
if (require.main === module) {
  const discovery = new SkillDiscovery();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  (async () => {
    try {
      switch (command) {
        case 'scan':
          await discovery.initialize(true);
          console.log('\n✨ Scan complete!');
          break;

        case 'search':
          if (args.length === 0) {
            console.error('Usage: node index.js search <query>');
            process.exit(1);
          }
          await discovery.initialize();
          const searchResults = discovery.search(args.join(' '));
          console.log('\n📋 Search Results:\n');
          for (const result of searchResults) {
            console.log(`${result.score.toFixed(3)} - ${result.skill.name}: ${result.skill.description}`);
          }
          break;

        case 'recommend':
          if (args.length === 0) {
            console.error('Usage: node index.js recommend <task>');
            process.exit(1);
          }
          await discovery.initialize();
          const recommendations = discovery.recommend(args.join(' '));
          console.log('\n💡 Recommendations:\n');
          for (const rec of recommendations) {
            console.log(`${rec.score.toFixed(3)} - ${rec.skill.name}`);
            console.log(`   ${rec.reasoning}\n`);
          }
          break;

        case 'compose':
          if (args.length === 0) {
            console.error('Usage: node index.js compose <goal>');
            process.exit(1);
          }
          await discovery.initialize();
          const chain = discovery.composeChain(args.join(' '));
          console.log('\n🔗 Skill Chain:\n');
          console.log(JSON.stringify(chain, null, 2));
          break;

        case 'list':
          await discovery.initialize();
          const skills = discovery.listSkills();
          console.log(`\n📚 ${skills.length} Skills:\n`);
          for (const skill of skills) {
            console.log(`  - ${skill.name} (${skill.status || 'unknown'})`);
          }
          break;

        case 'stats':
          await discovery.initialize();
          const stats = discovery.getStats();
          console.log('\n📊 Skill Registry Statistics:\n');
          console.log(JSON.stringify(stats, null, 2));
          break;

        case 'clear-cache':
          discovery.clearCache();
          break;

        default:
          console.log(`
Skill Discovery & Composition Engine

Usage:
  node index.js scan              Scan all skills and rebuild registry
  node index.js search <query>    Search for skills
  node index.js recommend <task>  Get skill recommendations for a task
  node index.js compose <goal>    Compose a skill chain for a goal
  node index.js list             List all skills
  node index.js stats            Show registry statistics
  node index.js clear-cache      Clear the cache
          `);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { SkillDiscovery };
