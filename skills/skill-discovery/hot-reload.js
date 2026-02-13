/**
 * Hot-Reload Integration - Dynamic Skill Discovery Updates
 * 
 * Monitors skill directory for changes and reloads the skill registry
 * without restarting the agent system. Integrates with multi-agent
 * routing to update agent assignments dynamically.
 */

const fs = require('fs');
const path = require('path');

class HotReloadManager {
  constructor(skillDiscovery, agentRouter) {
    this.skillDiscovery = skillDiscovery;
    this.agentRouter = agentRouter;
    this.skillsDir = skillDiscovery.skillsDir;
    this.watchers = [];
    this.reloadCallbacks = [];
    this.isInitialized = false;
    this.lastReload = null;
    this.reloadQueue = [];
    this.isReloading = false;
  }

  /**
   * Initialize hot-reload system
   */
  async initialize() {
    console.log('🔄 Initializing Hot-Reload Manager...');
    
    try {
      this._setupFileWatchers();
      this.isInitialized = true;
      console.log('✓ Hot-reload system ready');
      return true;
    } catch (error) {
      console.error('✗ Failed to initialize hot-reload:', error.message);
      return false;
    }
  }

  /**
   * Setup file system watchers on skill directories
   */
  _setupFileWatchers() {
    // Watch skills directory for new directories
    const mainWatcher = fs.watch(this.skillsDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // Ignore non-SKILL.md files and cache files
      if (!filename.includes('SKILL.md') || filename.includes('.skill-discovery-cache')) {
        return;
      }

      // Extract skill name from path
      const skillName = this._extractSkillName(filename);
      
      if (skillName) {
        this._queueSkillReload(skillName, eventType);
      }
    });

    this.watchers.push(mainWatcher);
    console.log('  ✓ File watchers installed');
  }

  /**
   * Extract skill name from file path
   */
  _extractSkillName(filepath) {
    const parts = filepath.split(path.sep);
    const skillIndex = parts.findIndex(p => p === 'skills') + 1;
    
    if (skillIndex > 0 && skillIndex < parts.length) {
      return parts[skillIndex];
    }

    return null;
  }

  /**
   * Queue a skill for reload
   */
  _queueSkillReload(skillName, eventType) {
    // Check if already queued
    const existing = this.reloadQueue.find(item => item.skill === skillName);
    
    if (existing) {
      existing.eventType = eventType;
      return;
    }

    this.reloadQueue.push({
      skill: skillName,
      eventType,
      timestamp: Date.now()
    });

    // Debounce: process queue after 1 second
    if (!this._debounceTimer) {
      this._debounceTimer = setTimeout(() => {
        this._processReloadQueue();
        this._debounceTimer = null;
      }, 1000);
    }
  }

  /**
   * Process queued skill reloads
   */
  async _processReloadQueue() {
    if (this.isReloading || this.reloadQueue.length === 0) return;

    this.isReloading = true;

    try {
      const skills = this.reloadQueue.map(item => item.skill);
      console.log(`\n🔄 Hot-reload triggered for ${skills.length} skill(s):`);
      skills.forEach(s => console.log(`   - ${s}`));

      // Reload affected skills
      const reloadResults = await this._reloadSkills(skills);

      // Update agent router with new skills
      await this._updateAgentRouter();

      // Execute callbacks
      await this._executeCallbacks(reloadResults);

      this.lastReload = new Date().toISOString();
      console.log(`✓ Hot-reload complete at ${this.lastReload}`);

    } catch (error) {
      console.error('✗ Hot-reload failed:', error.message);
    } finally {
      this.reloadQueue = [];
      this.isReloading = false;
    }
  }

  /**
   * Reload specific skills
   */
  async _reloadSkills(skillNames) {
    const results = {
      reloaded: [],
      failed: [],
      new: [],
      removed: []
    };

    for (const skillName of skillNames) {
      try {
        const skillDir = path.join(this.skillsDir, skillName);

        // Check if directory still exists
        if (!fs.existsSync(skillDir)) {
          // Skill removed
          if (this.skillDiscovery.skillRegistry[skillName]) {
            delete this.skillDiscovery.skillRegistry[skillName];
            results.removed.push(skillName);
            console.log(`  ✗ Removed: ${skillName} (directory deleted)`);
          }
          continue;
        }

        const skillPath = path.join(skillDir, 'SKILL.md');
        
        if (!fs.existsSync(skillPath)) {
          results.failed.push({ skill: skillName, error: 'SKILL.md not found' });
          continue;
        }

        // Parse updated SKILL.md
        const skillData = this.skillDiscovery.scanner.parseSkillMd(skillDir);

        if (!skillData) {
          results.failed.push({ skill: skillName, error: 'Failed to parse SKILL.md' });
          continue;
        }

        // Detect capabilities and tags
        skillData.capabilities = this.skillDiscovery.capabilityDetector.detect(skillData);
        skillData.tags = this.skillDiscovery.capabilityDetector.extractTags(skillData);

        // Check if new or updated
        const isNew = !this.skillDiscovery.skillRegistry[skillName];

        // Update registry
        this.skillDiscovery.skillRegistry[skillName] = skillData;

        if (isNew) {
          results.new.push(skillName);
          console.log(`  ✨ New: ${skillName}`);
        } else {
          results.reloaded.push(skillName);
          console.log(`  ✓ Reloaded: ${skillName}`);
        }

      } catch (error) {
        results.failed.push({ skill: skillName, error: error.message });
        console.log(`  ✗ Failed: ${skillName} - ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Update agent router with new skills
   */
  async _updateAgentRouter() {
    if (this.agentRouter) {
      // Clear routing cache to ensure fresh routing decisions
      this.agentRouter.clearCache();
      console.log('  ✓ Agent router updated and cache cleared');
    }
  }

  /**
   * Execute reload callbacks
   */
  async _executeCallbacks(results) {
    for (const callback of this.reloadCallbacks) {
      try {
        await callback(results);
      } catch (error) {
        console.warn('Callback error:', error.message);
      }
    }
  }

  /**
   * Register reload callback
   */
  onReload(callback) {
    if (typeof callback === 'function') {
      this.reloadCallbacks.push(callback);
    }
  }

  /**
   * Manual reload of all skills
   */
  async reloadAll(force = false) {
    if (this.isReloading && !force) {
      console.log('Reload already in progress');
      return false;
    }

    console.log('🔄 Force reloading all skills...');
    
    // Get all skill names
    const skillDirs = this.skillDiscovery.scanner.findSkillDirectories();
    const skillNames = skillDirs.map(dir => path.basename(dir));

    const results = await this._reloadSkills(skillNames);
    await this._updateAgentRouter();
    await this._executeCallbacks(results);

    this.lastReload = new Date().toISOString();
    console.log(`✓ All skills reloaded at ${this.lastReload}`);

    return results;
  }

  /**
   * Reload single skill
   */
  async reloadSkill(skillName) {
    const results = await this._reloadSkills([skillName]);
    await this._updateAgentRouter();
    await this._executeCallbacks(results);
    return results;
  }

  /**
   * Get hot-reload status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      isReloading: this.isReloading,
      lastReload: this.lastReload,
      queuedSkills: this.reloadQueue.map(item => item.skill),
      watchers: this.watchers.length,
      registrySize: Object.keys(this.skillDiscovery.skillRegistry || {}).length
    };
  }

  /**
   * Stop hot-reload monitoring
   */
  stop() {
    console.log('🛑 Stopping hot-reload manager...');

    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch (error) {
        // Ignore close errors
      }
    }

    this.watchers = [];
    this.reloadCallbacks = [];
    this.isInitialized = false;

    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }

    console.log('✓ Hot-reload manager stopped');
  }

  /**
   * Restart hot-reload manager
   */
  async restart() {
    this.stop();
    return await this.initialize();
  }
}

module.exports = { HotReloadManager };
