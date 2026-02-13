/**
 * Capability Detector
 * 
 * Analyzes SKILL.md content to detect and categorize capabilities
 */

class CapabilityDetector {
  constructor() {
    // Capability patterns to look for
    this.capabilityPatterns = [
      // Action verbs
      /(?:can|able to|provides|enables|allows)\s+([^.]+)/gi,
      // Capability bullets
      /[-*•]\s*\*\*([^*]+)\*\*/g,
      // Feature lists
      /(?:feature|capability|function)s?:\s*([^.]+)/gi
    ];
    
    // Tag extraction patterns
    this.tagPatterns = {
      // Technology tags
      technology: /(?:uses?|integrates?|built with|powered by)\s+([A-Z][a-zA-Z0-9.]+)/g,
      // Domain tags
      domain: /(email|calendar|webhook|search|memory|analytics|monitoring|notification|security|backup|browser|database|api|file|pdf|image|video|audio|data)/gi,
      // Action tags
      action: /(read|write|parse|transform|analyze|monitor|detect|generate|send|receive|schedule|automate|orchestrate|index|search|query)/gi
    };
  }

  /**
   * Detect capabilities from skill data
   */
  detect(skill) {
    const capabilities = new Set();
    
    // Extract from frontmatter description
    if (skill.description) {
      this.extractCapabilitiesFromText(skill.description, capabilities);
    }
    
    // Extract from overview
    if (skill.overview) {
      this.extractCapabilitiesFromText(skill.overview, capabilities);
    }
    
    // Extract from raw content
    if (skill.rawContent) {
      // Look for "Core Capabilities" or "Features" sections
      const capSectionMatch = skill.rawContent.match(/##\s+(?:Core\s+)?(?:Capabilities|Features)[^\n]*\n([\s\S]*?)(?=\n##|$)/i);
      
      if (capSectionMatch) {
        const capSection = capSectionMatch[1];
        this.extractCapabilitiesFromText(capSection, capabilities);
        
        // Extract bullet points specifically
        const bulletMatches = capSection.matchAll(/^[\s]*[-*•]\s+(.+)$/gm);
        for (const match of bulletMatches) {
          const cap = this.cleanCapability(match[1]);
          if (cap) {
            capabilities.add(cap);
          }
        }
      }
    }
    
    // Convert set to array
    return Array.from(capabilities);
  }

  /**
   * Extract capabilities from a text block
   */
  extractCapabilitiesFromText(text, capabilities) {
    // Try each pattern
    for (const pattern of this.capabilityPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const cap = this.cleanCapability(match[1]);
        if (cap) {
          capabilities.add(cap);
        }
      }
    }
  }

  /**
   * Clean and normalize capability text
   */
  cleanCapability(text) {
    if (!text) return null;
    
    // Remove markdown formatting
    let cleaned = text.replace(/[*_`]/g, '');
    
    // Remove emoji
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
    
    // Remove extra whitespace
    cleaned = cleaned.trim().replace(/\s+/g, ' ');
    
    // Remove "the" at beginning
    cleaned = cleaned.replace(/^the\s+/i, '');
    
    // Skip if too short or too long
    if (cleaned.length < 10 || cleaned.length > 150) {
      return null;
    }
    
    return cleaned;
  }

  /**
   * Extract tags from skill data
   */
  extractTags(skill) {
    const tags = new Set();
    
    const text = [
      skill.name,
      skill.description,
      skill.overview,
      skill.rawContent
    ].filter(Boolean).join(' ');
    
    // Extract technology tags
    const techMatches = text.matchAll(this.tagPatterns.technology);
    for (const match of techMatches) {
      const tag = match[1].toLowerCase();
      if (this.isValidTag(tag)) {
        tags.add(tag);
      }
    }
    
    // Extract domain tags
    const domainMatches = text.matchAll(this.tagPatterns.domain);
    for (const match of domainMatches) {
      const tag = match[1].toLowerCase();
      tags.add(`domain:${tag}`);
    }
    
    // Extract action tags
    const actionMatches = text.matchAll(this.tagPatterns.action);
    const actionCounts = {};
    
    for (const match of actionMatches) {
      const action = match[1].toLowerCase();
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    }
    
    // Only include actions mentioned multiple times (strong signal)
    for (const [action, count] of Object.entries(actionCounts)) {
      if (count >= 2) {
        tags.add(`action:${action}`);
      }
    }
    
    // Add status tag
    if (skill.status) {
      tags.add(`status:${skill.status}`);
    }
    
    // Add special tags based on name patterns
    if (skill.name.includes('integration')) {
      tags.add('integration');
    }
    
    if (skill.name.includes('system')) {
      tags.add('system');
    }
    
    if (skill.name.includes('advanced')) {
      tags.add('advanced');
    }
    
    return Array.from(tags);
  }

  /**
   * Check if a tag is valid
   */
  isValidTag(tag) {
    // Must be alphanumeric with hyphens/dots
    if (!/^[a-z0-9.-]+$/i.test(tag)) {
      return false;
    }
    
    // Skip common words
    const skipWords = ['the', 'and', 'for', 'with', 'from', 'this', 'that'];
    if (skipWords.includes(tag.toLowerCase())) {
      return false;
    }
    
    return true;
  }

  /**
   * Categorize capabilities
   */
  categorizeCapabilities(capabilities) {
    const categories = {
      data: [],
      communication: [],
      automation: [],
      analysis: [],
      system: [],
      other: []
    };
    
    for (const cap of capabilities) {
      const lower = cap.toLowerCase();
      
      if (lower.match(/read|write|parse|transform|extract|index|store|retrieve/)) {
        categories.data.push(cap);
      } else if (lower.match(/email|message|send|notify|webhook|post|publish/)) {
        categories.communication.push(cap);
      } else if (lower.match(/automat|schedule|trigger|orchestrat|workflow|pipeline/)) {
        categories.automation.push(cap);
      } else if (lower.match(/analyz|monitor|detect|track|measure|calculate|predict/)) {
        categories.analysis.push(cap);
      } else if (lower.match(/system|manage|config|deploy|maintain|backup|recovery/)) {
        categories.system.push(cap);
      } else {
        categories.other.push(cap);
      }
    }
    
    return categories;
  }

  /**
   * Calculate capability complexity score (1-10)
   */
  calculateComplexityScore(skill) {
    let score = 1;
    
    // More capabilities = higher complexity
    if (skill.capabilities) {
      score += Math.min(skill.capabilities.length * 0.5, 3);
    }
    
    // Dependencies increase complexity
    if (skill.dependencies && skill.dependencies.length > 0) {
      score += Math.min(skill.dependencies.length * 0.3, 2);
    }
    
    // More sections = more complex
    if (skill.sections) {
      score += Math.min(skill.sections.length * 0.1, 1);
    }
    
    // Status affects perceived complexity
    if (skill.status === 'production') {
      score += 1; // Production-ready is more complex
    } else if (skill.status === 'experimental') {
      score -= 0.5; // Experimental might be simpler
    }
    
    // Integration points increase complexity
    if (skill.integrationPoints && skill.integrationPoints.length > 100) {
      score += 1;
    }
    
    // Cap at 10
    return Math.min(Math.round(score * 10) / 10, 10);
  }
}

module.exports = { CapabilityDetector };
