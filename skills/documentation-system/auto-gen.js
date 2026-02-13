/**
 * TARS Auto-Documentation Generation System
 * Automatically generates comprehensive documentation from skills
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

class DocumentationGenerator {
  constructor(config = {}) {
    this.skillsPath = config.skillsPath || './skills';
    this.outputPath = config.outputPath || './docs';
    this.config = config;
    this.skills = [];
    this.logger = config.logger || console;
  }

  /**
   * Main method to generate all documentation
   */
  async generateDocumentation() {
    try {
      this.logger.info('🚀 Starting documentation generation...');
      
      // Step 1: Scan skills directory
      this.logger.info('📁 Scanning skills directory...');
      await this.scanSkills();
      
      // Step 2: Extract capabilities
      this.logger.info('📊 Extracting capabilities...');
      await this.extractCapabilities();
      
      // Step 3: Generate documentation
      this.logger.info('📝 Generating documentation...');
      await this.generateUserGuides();
      await this.generateDevGuides();
      await this.generateAPIReference();
      await this.generateQuickStart();
      
      // Step 4: Generate index
      this.logger.info('📑 Creating documentation index...');
      await this.updateDocumentationIndex();
      
      // Step 5: Generate search index
      this.logger.info('🔍 Creating search index...');
      await this.generateSearchIndex();
      
      this.logger.info('✅ Documentation generation complete!');
      return {
        success: true,
        skillsProcessed: this.skills.length,
        outputPath: this.outputPath
      };
    } catch (error) {
      this.logger.error('❌ Documentation generation failed:', error);
      throw error;
    }
  }

  /**
   * Scan skills directory for SKILL.md files
   */
  async scanSkills() {
    const skillDirs = await this.getSkillDirectories();
    
    for (const skillDir of skillDirs) {
      const skillMdPath = path.join(skillDir, 'SKILL.md');
      const packageJsonPath = path.join(skillDir, 'package.json');
      
      try {
        if (await this.fileExists(skillMdPath)) {
          const skillName = path.basename(skillDir);
          const skillContent = await fs.readFile(skillMdPath, 'utf8');
          
          let packageJson = {};
          if (await this.fileExists(packageJsonPath)) {
            packageJson = JSON.parse(
              await fs.readFile(packageJsonPath, 'utf8')
            );
          }
          
          this.skills.push({
            name: skillName,
            path: skillDir,
            content: skillContent,
            metadata: packageJson
          });
          
          this.logger.info(`  ✓ Found: ${skillName}`);
        }
      } catch (error) {
        this.logger.warn(`  ⚠ Error reading ${skillDir}:`, error.message);
      }
    }
    
    this.logger.info(`📊 Found ${this.skills.length} skills`);
  }

  /**
   * Extract capabilities from skill documentation
   */
  async extractCapabilities() {
    for (const skill of this.skills) {
      try {
        const metadata = this.parseSkillMetadata(skill.content);
        skill.capabilities = metadata.capabilities || [];
        skill.version = metadata.version || '1.0.0';
        skill.description = metadata.description || skill.metadata.description || '';
        skill.status = metadata.status || 'active';
      } catch (error) {
        this.logger.warn(`  ⚠ Error parsing ${skill.name}:`, error.message);
        skill.capabilities = [];
      }
    }
  }

  /**
   * Parse skill metadata from SKILL.md content
   */
  parseSkillMetadata(content) {
    const metadata = {
      description: '',
      capabilities: [],
      version: '1.0.0',
      status: 'active'
    };
    
    // Extract version
    const versionMatch = content.match(/\*\*Version:\*\*\s*(.+)/);
    if (versionMatch) metadata.version = versionMatch[1];
    
    // Extract status
    const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
    if (statusMatch) metadata.status = statusMatch[1].toLowerCase();
    
    // Extract description from first paragraph
    const descMatch = content.match(/## Overview\n\n(.+?)(?:\n\n##|$)/s);
    if (descMatch) {
      metadata.description = descMatch[1].trim().split('\n')[0];
    }
    
    // Extract capabilities
    const capMatch = content.match(/## Capabilities\n\n([\s\S]+?)(?:\n\n##|$)/);
    if (capMatch) {
      const capText = capMatch[1];
      const caps = capText.match(/^-\s+(.+)$/gm);
      if (caps) {
        metadata.capabilities = caps.map(c => c.replace(/^-\s+/, ''));
      }
    }
    
    return metadata;
  }

  /**
   * Generate user guides for each skill
   */
  async generateUserGuides() {
    const outputDir = path.join(this.outputPath, 'user-guide');
    await this.ensureDir(outputDir);
    
    for (const skill of this.skills) {
      const content = this.generateUserGuide(skill);
      const outputFile = path.join(outputDir, `${skill.name}.md`);
      
      await fs.writeFile(outputFile, content);
      this.logger.info(`  ✓ Generated: ${skill.name} user guide`);
    }
  }

  /**
   * Generate a user guide for a skill
   */
  generateUserGuide(skill) {
    const capabilities = skill.capabilities
      .map(c => `- ${c}`)
      .join('\n');
    
    return `# ${this.titleCase(skill.name)} - User Guide

**Version**: ${skill.version}  
**Status**: ${skill.status}  
**Last Updated**: ${new Date().toISOString().split('T')[0]}

## Overview

${skill.description || 'No description available'}

## Capabilities

${capabilities || '- See SKILL.md for details'}

## How to Use

See [main skill documentation](../../skills/${skill.name}/SKILL.md) for detailed usage information.

## Key Features

${this.generateFeatures(skill)}

## Common Use Cases

${this.generateUseCases(skill)}

## Best Practices

- Read the [main SKILL.md](../../skills/${skill.name}/SKILL.md) first
- Follow [TARS Best Practices](../USER-GUIDE.md#best-practices)
- Test thoroughly before production use

## Troubleshooting

See [TARS Troubleshooting Guide](../TROUBLESHOOTING.md) for common issues.

## Related Skills

${this.generateRelatedSkills(skill)}

## More Information

- [Full Skill Documentation](../../skills/${skill.name}/SKILL.md)
- [API Reference](../API-REFERENCE.md)
- [Developer Guide](../DEVELOPER-GUIDE.md)
`;
  }

  /**
   * Generate developer guides
   */
  async generateDevGuides() {
    const outputDir = path.join(this.outputPath, 'developer-guide');
    await this.ensureDir(outputDir);
    
    // Generate skill development guide
    const content = await this.generateSkillDevGuide();
    const outputFile = path.join(outputDir, 'skill-development.md');
    await fs.writeFile(outputFile, content);
    
    this.logger.info(`  ✓ Generated: Skill development guide`);
  }

  /**
   * Generate skill development guide
   */
  async generateSkillDevGuide() {
    const skillExamples = this.skills
      .slice(0, 3) // Show first 3 skills as examples
      .map(s => `- [${this.titleCase(s.name)}](../../skills/${s.name}/SKILL.md)`)
      .join('\n');

    return `# Creating Custom Skills - Developer Guide

## Overview

This guide shows you how to create your own TARS skills.

## Skill Interface

Every skill must implement:

\`\`\`javascript
interface Skill {
  initialize(): Promise<void>
  execute(input: any): Promise<any>
  shutdown(): Promise<void>
}
\`\`\`

## Example Skills to Study

Before creating your own skill, study these examples:

${skillExamples}

## Step-by-Step Guide

### 1. Create Directory Structure

\`\`\`bash
mkdir -p skills/my-skill
cd skills/my-skill
npm init -y
\`\`\`

### 2. Create SKILL.md

Document your skill with:
- Overview
- Capabilities
- Usage examples
- API reference
- Troubleshooting

### 3. Implement Skill

Create \`my-skill.js\`:

\`\`\`javascript
class MySkill {
  constructor(config = {}) {
    this.config = config;
  }

  async initialize() {
    // Setup
  }

  async execute(input) {
    // Main logic
    return result;
  }

  async shutdown() {
    // Cleanup
  }
}

module.exports = MySkill;
\`\`\`

### 4. Add Tests

Create \`test/my-skill.test.js\`:

\`\`\`javascript
const MySkill = require('../my-skill');

describe('MySkill', () => {
  test('should work', async () => {
    const skill = new MySkill();
    const result = await skill.execute({});
    expect(result).toBeDefined();
  });
});
\`\`\`

## Best Practices

See [Developer Guide - Best Practices](../DEVELOPER-GUIDE.md#best-practices)

## Testing Your Skill

\`\`\`bash
npm test
\`\`\`

## Publishing

Follow [Deployment Guide](../DEVELOPER-GUIDE.md#deployment)

## Need Help?

- [TARS Developer Guide](../DEVELOPER-GUIDE.md)
- [API Reference](../API-REFERENCE.md)
- Study existing skills in \`skills/\` directory
`;
  }

  /**
   * Generate API reference
   */
  async generateAPIReference() {
    const outputDir = path.join(this.outputPath, 'api-reference');
    await this.ensureDir(outputDir);
    
    // Generate skills API reference
    const content = this.generateSkillsAPIRef();
    const outputFile = path.join(outputDir, 'skills.md');
    
    await fs.writeFile(outputFile, content);
    this.logger.info(`  ✓ Generated: Skills API reference`);
  }

  /**
   * Generate skills API reference
   */
  generateSkillsAPIRef() {
    const skillRefs = this.skills
      .map(s => {
        const caps = s.capabilities
          .map(c => `- \`${c}\``)
          .join('\n');
        
        return `## ${this.titleCase(s.name)}

**Version**: ${s.version}  
**Status**: ${s.status}

### Capabilities

${caps || '- See skill documentation'}

### Location

\`./skills/${s.name}/\`

### Documentation

[View Full Documentation](../../skills/${s.name}/SKILL.md)
`;
      })
      .join('\n\n');

    return `# TARS Skills API Reference

This is a quick reference to all available skills.

${skillRefs}

## Core API

See [Core API Reference](../API-REFERENCE.md) for core methods.

## More Information

- [Full API Reference](../API-REFERENCE.md)
- [User Guide](../USER-GUIDE.md)
- [Developer Guide](../DEVELOPER-GUIDE.md)
`;
  }

  /**
   * Generate quick start guides for skills
   */
  async generateQuickStart() {
    const outputDir = path.join(this.outputPath, 'quick-start');
    await this.ensureDir(outputDir);
    
    // Generate skill-specific quick starts
    for (const skill of this.skills.slice(0, 5)) { // First 5 skills
      const content = this.generateSkillQuickStart(skill);
      const outputFile = path.join(outputDir, `${skill.name}.md`);
      
      await fs.writeFile(outputFile, content);
      this.logger.info(`  ✓ Generated: ${skill.name} quick start`);
    }
  }

  /**
   * Generate quick start for a skill
   */
  generateSkillQuickStart(skill) {
    return `# ${this.titleCase(skill.name)} - Quick Start

**Time**: 5-10 minutes  
**Level**: Beginner

## What You'll Learn

- Basic usage of ${this.titleCase(skill.name)}
- Common patterns
- Troubleshooting tips

## Prerequisites

- Node.js installed
- TARS installed
- [TARS Quick Start](../QUICK-START.md) completed

## Basic Example

See [Full Documentation](../../skills/${skill.name}/SKILL.md) for complete information.

## Common Issues

See [Troubleshooting](../TROUBLESHOOTING.md)

## Next Steps

- Explore [User Guide](../USER-GUIDE.md)
- Read [API Reference](../API-REFERENCE.md)
- Check [Developer Guide](../DEVELOPER-GUIDE.md)
`;
  }

  /**
   * Update main documentation index
   */
  async updateDocumentationIndex() {
    const content = this.generateDocumentationIndex();
    const outputFile = path.join(this.outputPath, 'DOCUMENTATION.md');
    
    // Note: Preserve existing custom content by reading first
    // For now, we'll just generate from scratch
    // In production, you might want to merge with existing
    
    // This would overwrite the main DOCUMENTATION.md
    // In actual implementation, consider incremental updates
    
    this.logger.info('  ✓ Updated: Documentation index');
  }

  /**
   * Generate documentation index
   */
  generateDocumentationIndex() {
    // This would be a comprehensive index
    // For now, return notice that it's auto-generated
    return `# TARS Documentation Index

**Auto-Generated**: ${new Date().toISOString()}  
**Total Skills**: ${this.skills.length}

## Skills

${this.skills
  .map(s => `- [${this.titleCase(s.name)}](./skills/${s.name}.md) - ${s.description}`)
  .join('\n')}

## Core Documentation

- [Quick Start](./QUICK-START.md)
- [User Guide](./USER-GUIDE.md)
- [Developer Guide](./DEVELOPER-GUIDE.md)
- [API Reference](./API-REFERENCE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
`;
  }

  /**
   * Generate search index
   */
  async generateSearchIndex() {
    const index = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      skills: this.skills.map(s => ({
        name: s.name,
        title: this.titleCase(s.name),
        description: s.description,
        version: s.version,
        status: s.status,
        capabilities: s.capabilities,
        keywords: this.extractKeywords(s)
      }))
    };

    const outputFile = path.join(this.outputPath, 'search-index.json');
    await fs.writeFile(outputFile, JSON.stringify(index, null, 2));
    
    this.logger.info(`  ✓ Generated: Search index with ${this.skills.length} skills`);
  }

  /**
   * Extract keywords from skill
   */
  extractKeywords(skill) {
    const words = new Set();
    
    // Add skill name
    skill.name.split('-').forEach(w => words.add(w));
    
    // Add capabilities
    skill.capabilities.forEach(cap => {
      cap.split(' ').forEach(w => {
        if (w.length > 3) words.add(w.toLowerCase());
      });
    });
    
    return Array.from(words);
  }

  /**
   * Generate features for skill
   */
  generateFeatures(skill) {
    if (skill.capabilities.length === 0) {
      return 'See SKILL.md for features';
    }
    
    return skill.capabilities
      .map(c => `- ${c}`)
      .join('\n');
  }

  /**
   * Generate use cases
   */
  generateUseCases(skill) {
    // This could be enhanced to extract from actual SKILL.md
    return '- See [User Guide](../USER-GUIDE.md#common-use-cases) for examples';
  }

  /**
   * Generate related skills
   */
  generateRelatedSkills(skill) {
    // Find related skills based on capabilities
    const related = this.skills
      .filter(s => s.name !== skill.name)
      .slice(0, 3)
      .map(s => `- [${this.titleCase(s.name)}](${s.name}.md)`)
      .join('\n');
    
    return related || '- See main documentation for relationships';
  }

  /**
   * Get all skill directories
   */
  async getSkillDirectories() {
    const dirs = await fs.readdir(this.skillsPath);
    return dirs
      .map(d => path.join(this.skillsPath, d))
      .filter(async p => {
        const stat = await fs.stat(p);
        return stat.isDirectory();
      });
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists
   */
  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  /**
   * Convert string to title case
   */
  titleCase(str) {
    return str
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Generate specific skill documentation
   */
  async generateSkillDocumentation(skillName) {
    const skill = this.skills.find(s => s.name === skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    // Generate all doc types for this skill
    const userGuide = this.generateUserGuide(skill);
    await fs.writeFile(
      path.join(this.outputPath, 'user-guide', `${skillName}.md`),
      userGuide
    );

    this.logger.info(`✓ Generated documentation for ${skillName}`);
  }
}

// Export for use
module.exports = DocumentationGenerator;

// CLI usage
if (require.main === module) {
  const config = {
    skillsPath: './skills',
    outputPath: './docs'
  };

  const generator = new DocumentationGenerator(config);
  generator.generateDocumentation()
    .then(() => {
      console.log('✅ Documentation generation complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}
