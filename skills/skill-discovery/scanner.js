/**
 * Skill Directory Scanner
 * 
 * Discovers skill directories and parses SKILL.md files
 */

const fs = require('fs');
const path = require('path');

class Scanner {
  constructor(skillsDir) {
    this.skillsDir = skillsDir;
  }

  /**
   * Find all directories in skills/ that contain a SKILL.md file
   */
  findSkillDirectories() {
    if (!fs.existsSync(this.skillsDir)) {
      throw new Error(`Skills directory not found: ${this.skillsDir}`);
    }

    const dirs = fs.readdirSync(this.skillsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(this.skillsDir, dirent.name))
      .filter(dir => fs.existsSync(path.join(dir, 'SKILL.md')));

    return dirs;
  }

  /**
   * Parse SKILL.md file and extract metadata
   */
  parseSkillMd(skillDir) {
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    
    if (!fs.existsSync(skillMdPath)) {
      return null;
    }

    const content = fs.readFileSync(skillMdPath, 'utf8');
    const skillName = path.basename(skillDir);

    // Parse frontmatter (YAML or JSON at top of file)
    const frontmatter = this.parseFrontmatter(content);
    
    // Parse markdown structure
    const sections = this.parseSections(content);
    
    // Extract key information
    const overview = this.extractSection(sections, ['Overview', 'Description']);
    const capabilities = this.extractCapabilities(sections);
    const integrationPoints = this.extractSection(sections, ['Integration Points', 'Integration', 'Integrations']);
    const dependencies = this.extractDependencies(content, sections);
    
    // Determine status
    const status = this.extractStatus(content, frontmatter);
    
    return {
      name: frontmatter.name || skillName,
      path: skillDir,
      description: frontmatter.description || this.extractFirstParagraph(overview),
      status: status,
      version: frontmatter.version || this.extractVersion(content),
      lastUpdated: frontmatter.last_updated || this.extractLastUpdated(content),
      overview: overview,
      sections: sections.map(s => s.title),
      rawContent: content,
      frontmatter: frontmatter,
      // These will be populated by other components
      capabilities: [],
      tags: [],
      dependencies: [],
      dependents: [],
      integrationPoints: integrationPoints
    };
  }

  /**
   * Parse YAML/JSON frontmatter from SKILL.md
   */
  parseFrontmatter(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      return {};
    }

    const frontmatterText = frontmatterMatch[1];
    const frontmatter = {};

    // Simple YAML parser (key: value)
    const lines = frontmatterText.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1].toLowerCase().replace(/-/g, '_');
        const value = match[2].trim();
        frontmatter[key] = value;
      }
    }

    return frontmatter;
  }

  /**
   * Parse markdown sections
   */
  parseSections(content) {
    const sections = [];
    const lines = content.split('\n');
    
    let currentSection = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for headers (##, ###, etc.)
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          level: level,
          title: title,
          content: '',
          startLine: i
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
    
    // Save last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Extract a specific section by title
   */
  extractSection(sections, possibleTitles) {
    for (const title of possibleTitles) {
      const section = sections.find(s => 
        s.title.toLowerCase().includes(title.toLowerCase())
      );
      
      if (section) {
        return section.content.trim();
      }
    }
    
    return '';
  }

  /**
   * Extract capabilities from sections
   */
  extractCapabilities(sections) {
    const capabilitiesSection = sections.find(s =>
      s.title.toLowerCase().includes('capabilit') ||
      s.title.toLowerCase().includes('features') ||
      s.title.toLowerCase().includes('what it does')
    );

    if (!capabilitiesSection) {
      return [];
    }

    // Extract bullet points or numbered lists
    const capabilities = [];
    const lines = capabilitiesSection.content.split('\n');
    
    for (const line of lines) {
      const bulletMatch = line.match(/^[\s]*[-*•]\s+(.+)$/);
      const numberedMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
      
      if (bulletMatch) {
        capabilities.push(bulletMatch[1].trim());
      } else if (numberedMatch) {
        capabilities.push(numberedMatch[1].trim());
      }
    }

    return capabilities;
  }

  /**
   * Extract dependencies from content
   */
  extractDependencies(content, sections) {
    const dependencies = [];
    
    // Look for dependency section
    const depSection = sections.find(s =>
      s.title.toLowerCase().includes('dependen') ||
      s.title.toLowerCase().includes('require')
    );
    
    if (depSection) {
      // Extract bullet points
      const lines = depSection.content.split('\n');
      for (const line of lines) {
        const bulletMatch = line.match(/^[\s]*[-*•]\s+(.+)$/);
        if (bulletMatch) {
          dependencies.push(bulletMatch[1].trim());
        }
      }
    }
    
    // Also scan for "requires", "depends on" mentions
    const requiresMatches = content.matchAll(/(?:requires?|depends? on|needs?|uses?)\s+(?:the\s+)?([a-z-]+(?:-[a-z]+)*)/gi);
    for (const match of requiresMatches) {
      const dep = match[1].toLowerCase();
      if (!dependencies.includes(dep)) {
        dependencies.push(dep);
      }
    }
    
    return dependencies;
  }

  /**
   * Extract status from content
   */
  extractStatus(content, frontmatter) {
    if (frontmatter.status) {
      return frontmatter.status.toLowerCase();
    }
    
    // Look for status indicators in content
    if (content.match(/✅.*(?:production|ready|deployed|complete)/i)) {
      return 'production';
    }
    
    if (content.match(/🚧.*(?:development|in progress|wip)/i)) {
      return 'development';
    }
    
    if (content.match(/⚠️.*(?:experimental|beta|alpha)/i)) {
      return 'experimental';
    }
    
    if (content.match(/❌.*(?:deprecated|obsolete)/i)) {
      return 'deprecated';
    }
    
    return 'unknown';
  }

  /**
   * Extract version from content
   */
  extractVersion(content) {
    const versionMatch = content.match(/\*\*Version:\*\*\s*([0-9.]+)/i);
    if (versionMatch) {
      return versionMatch[1];
    }
    
    const vMatch = content.match(/v?([0-9]+\.[0-9]+(?:\.[0-9]+)?)/);
    if (vMatch) {
      return vMatch[1];
    }
    
    return '1.0.0';
  }

  /**
   * Extract last updated date
   */
  extractLastUpdated(content) {
    const dateMatch = content.match(/\*\*Last Updated:\*\*\s*([0-9-]+)/i);
    if (dateMatch) {
      return dateMatch[1];
    }
    
    return null;
  }

  /**
   * Extract first paragraph from section
   */
  extractFirstParagraph(sectionContent) {
    if (!sectionContent) {
      return '';
    }
    
    const paragraphs = sectionContent.split('\n\n');
    
    for (const para of paragraphs) {
      const cleaned = para.trim().replace(/^[#\-*•\s]+/, '');
      if (cleaned.length > 20) {
        return cleaned;
      }
    }
    
    return sectionContent.substring(0, 150);
  }
}

module.exports = { Scanner };
