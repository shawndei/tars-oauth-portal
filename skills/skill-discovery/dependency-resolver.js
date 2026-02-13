/**
 * Dependency Resolver
 * 
 * Builds and manages skill dependency graph
 */

class DependencyResolver {
  constructor() {
    this.dependencyGraph = new Map();
    this.reverseGraph = new Map(); // For finding dependents
  }

  /**
   * Build dependency graph from all skills
   */
  buildDependencyGraph(skills) {
    // Initialize graph
    this.dependencyGraph.clear();
    this.reverseGraph.clear();
    
    for (const skill of skills) {
      this.dependencyGraph.set(skill.name, new Set());
      this.reverseGraph.set(skill.name, new Set());
    }
    
    // Build dependency relationships
    for (const skill of skills) {
      const deps = this.detectDependencies(skill, skills);
      
      for (const depName of deps) {
        // Add to forward graph
        if (this.dependencyGraph.has(skill.name)) {
          this.dependencyGraph.get(skill.name).add(depName);
        }
        
        // Add to reverse graph
        if (this.reverseGraph.has(depName)) {
          this.reverseGraph.get(depName).add(skill.name);
        }
      }
    }
  }

  /**
   * Detect dependencies for a single skill
   */
  detectDependencies(skill, allSkills) {
    const dependencies = new Set();
    
    // Check explicit dependencies from parser
    if (skill.dependencies) {
      for (const dep of skill.dependencies) {
        const normalizedDep = this.normalizeSkillName(dep);
        
        // Verify dependency exists
        if (this.skillExists(normalizedDep, allSkills)) {
          dependencies.add(normalizedDep);
        }
      }
    }
    
    // Check content for skill mentions
    if (skill.rawContent) {
      const skillNames = allSkills.map(s => s.name);
      
      for (const otherSkillName of skillNames) {
        if (otherSkillName === skill.name) continue;
        
        // Look for mentions of other skills
        const pattern = new RegExp(`\\b${otherSkillName}\\b`, 'gi');
        
        if (pattern.test(skill.rawContent)) {
          // Verify it's a real dependency, not just a mention
          if (this.verifyDependency(skill, otherSkillName)) {
            dependencies.add(otherSkillName);
          }
        }
      }
    }
    
    return Array.from(dependencies);
  }

  /**
   * Verify that a mention is actually a dependency
   */
  verifyDependency(skill, mentionedSkillName) {
    if (!skill.rawContent) return false;
    
    const content = skill.rawContent;
    
    // Strong dependency signals
    const strongPatterns = [
      new RegExp(`requires?\\s+${mentionedSkillName}`, 'i'),
      new RegExp(`depends? on\\s+${mentionedSkillName}`, 'i'),
      new RegExp(`uses?\\s+${mentionedSkillName}`, 'i'),
      new RegExp(`integrates? with\\s+${mentionedSkillName}`, 'i'),
      new RegExp(`built on\\s+${mentionedSkillName}`, 'i')
    ];
    
    for (const pattern of strongPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    // Check if mentioned in Dependencies section
    const depSectionMatch = content.match(/##\s+(?:Dependencies|Requirements)[^\n]*\n([\s\S]*?)(?=\n##|$)/i);
    
    if (depSectionMatch) {
      const depSection = depSectionMatch[1];
      if (depSection.includes(mentionedSkillName)) {
        return true;
      }
    }
    
    // Check if mentioned in Integration Points section
    const integrationMatch = content.match(/##\s+Integration\s+Points[^\n]*\n([\s\S]*?)(?=\n##|$)/i);
    
    if (integrationMatch) {
      const integrationSection = integrationMatch[1];
      if (integrationSection.includes(mentionedSkillName)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Normalize skill name for matching
   */
  normalizeSkillName(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Check if skill exists in the list
   */
  skillExists(skillName, allSkills) {
    return allSkills.some(s => s.name === skillName);
  }

  /**
   * Get dependencies for a skill
   */
  getSkillDependencies(skill) {
    if (!this.dependencyGraph.has(skill.name)) {
      return [];
    }
    
    return Array.from(this.dependencyGraph.get(skill.name));
  }

  /**
   * Get skills that depend on this skill
   */
  getSkillDependents(skill) {
    if (!this.reverseGraph.has(skill.name)) {
      return [];
    }
    
    return Array.from(this.reverseGraph.get(skill.name));
  }

  /**
   * Get all transitive dependencies (dependencies of dependencies)
   */
  getTransitiveDependencies(skillName, visited = new Set()) {
    if (visited.has(skillName)) {
      return []; // Circular dependency detected
    }
    
    visited.add(skillName);
    
    const directDeps = this.dependencyGraph.get(skillName);
    if (!directDeps || directDeps.size === 0) {
      return [];
    }
    
    const allDeps = new Set(directDeps);
    
    for (const dep of directDeps) {
      const transitiveDeps = this.getTransitiveDependencies(dep, visited);
      for (const transitiveDep of transitiveDeps) {
        allDeps.add(transitiveDep);
      }
    }
    
    return Array.from(allDeps);
  }

  /**
   * Check for circular dependencies
   */
  detectCircularDependencies() {
    const circular = [];
    
    for (const [skillName] of this.dependencyGraph) {
      const cycle = this.findCycle(skillName, new Set(), new Set());
      if (cycle.length > 0) {
        circular.push({
          skill: skillName,
          cycle: cycle
        });
      }
    }
    
    return circular;
  }

  /**
   * Find cycle in dependency graph using DFS
   */
  findCycle(skillName, visited, recursionStack, path = []) {
    if (recursionStack.has(skillName)) {
      // Found cycle
      const cycleStart = path.indexOf(skillName);
      return path.slice(cycleStart).concat(skillName);
    }
    
    if (visited.has(skillName)) {
      return [];
    }
    
    visited.add(skillName);
    recursionStack.add(skillName);
    path.push(skillName);
    
    const deps = this.dependencyGraph.get(skillName) || new Set();
    
    for (const dep of deps) {
      const cycle = this.findCycle(dep, visited, recursionStack, [...path]);
      if (cycle.length > 0) {
        return cycle;
      }
    }
    
    recursionStack.delete(skillName);
    
    return [];
  }

  /**
   * Get dependency tree (for visualization)
   */
  getDependencyTree(skillName, maxDepth = 5, currentDepth = 0, visited = new Set()) {
    if (currentDepth >= maxDepth || visited.has(skillName)) {
      return null;
    }
    
    visited.add(skillName);
    
    const deps = this.dependencyGraph.get(skillName);
    
    const tree = {
      name: skillName,
      depth: currentDepth,
      dependencies: []
    };
    
    if (deps && deps.size > 0) {
      for (const dep of deps) {
        const subTree = this.getDependencyTree(dep, maxDepth, currentDepth + 1, new Set(visited));
        if (subTree) {
          tree.dependencies.push(subTree);
        }
      }
    }
    
    return tree;
  }

  /**
   * Get topological sort of skills (execution order)
   */
  getTopologicalSort() {
    const sorted = [];
    const visited = new Set();
    const tempMark = new Set();
    
    const visit = (skillName) => {
      if (tempMark.has(skillName)) {
        throw new Error(`Circular dependency detected: ${skillName}`);
      }
      
      if (visited.has(skillName)) {
        return;
      }
      
      tempMark.add(skillName);
      
      const deps = this.dependencyGraph.get(skillName);
      if (deps) {
        for (const dep of deps) {
          visit(dep);
        }
      }
      
      tempMark.delete(skillName);
      visited.add(skillName);
      sorted.push(skillName);
    };
    
    // Visit all nodes
    for (const [skillName] of this.dependencyGraph) {
      if (!visited.has(skillName)) {
        try {
          visit(skillName);
        } catch (error) {
          console.warn(`⚠️  ${error.message}`);
        }
      }
    }
    
    return sorted;
  }

  /**
   * Calculate dependency metrics for a skill
   */
  getDependencyMetrics(skillName) {
    const directDeps = this.dependencyGraph.get(skillName) || new Set();
    const directDependents = this.reverseGraph.get(skillName) || new Set();
    const transitiveDeps = this.getTransitiveDependencies(skillName);
    
    return {
      directDependencies: directDeps.size,
      transitiveDependencies: transitiveDeps.length,
      directDependents: directDependents.size,
      totalDependencies: transitiveDeps.length + directDeps.size,
      dependencyDepth: this.calculateDependencyDepth(skillName),
      isCritical: directDependents.size >= 3, // Many skills depend on it
      isLeaf: directDeps.size === 0, // No dependencies
      isRoot: directDependents.size === 0 // Nothing depends on it
    };
  }

  /**
   * Calculate maximum depth of dependency chain
   */
  calculateDependencyDepth(skillName, visited = new Set()) {
    if (visited.has(skillName)) {
      return 0;
    }
    
    visited.add(skillName);
    
    const deps = this.dependencyGraph.get(skillName);
    if (!deps || deps.size === 0) {
      return 0;
    }
    
    let maxDepth = 0;
    for (const dep of deps) {
      const depth = this.calculateDependencyDepth(dep, new Set(visited));
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth + 1;
  }

  /**
   * Export dependency graph for caching
   */
  exportGraph() {
    const exported = {
      forward: {},
      reverse: {}
    };
    
    for (const [key, value] of this.dependencyGraph) {
      exported.forward[key] = Array.from(value);
    }
    
    for (const [key, value] of this.reverseGraph) {
      exported.reverse[key] = Array.from(value);
    }
    
    return exported;
  }

  /**
   * Load dependency graph from cache
   */
  loadFromCache(cached) {
    this.dependencyGraph.clear();
    this.reverseGraph.clear();
    
    if (cached.forward) {
      for (const [key, value] of Object.entries(cached.forward)) {
        this.dependencyGraph.set(key, new Set(value));
      }
    }
    
    if (cached.reverse) {
      for (const [key, value] of Object.entries(cached.reverse)) {
        this.reverseGraph.set(key, new Set(value));
      }
    }
  }
}

module.exports = { DependencyResolver };
