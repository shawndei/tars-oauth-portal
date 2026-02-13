#!/usr/bin/env node
/**
 * Deep Research Orchestration Engine
 * Conducts comprehensive multi-source research with synthesis and citations
 * 
 * Usage:
 *   node deep-researcher.js "research query" --depth 2
 *   node deep-researcher.js "research query" --depth 3 --max-sources 50
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class DeepResearcher {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.env.OPENCLAW_WORKSPACE || process.cwd();
    this.maxDepth = options.maxDepth || 3;
    this.maxSources = options.maxSources || 50;
    this.useRealTools = options.useRealTools !== false; // Default to true
  }

  /**
   * Main research entry point
   * @param {string} topic - Research topic
   * @param {object} options - Research options
   * @returns {object} Research report
   */
  async research(topic, options = {}) {
    const depth = Math.min(options.depth || 2, this.maxDepth);
    const maxSources = options.maxSources || this.maxSources;
    const startTime = Date.now();
    
    console.log(`\n🔬 Starting Deep Research`);
    console.log(`📋 Topic: "${topic}"`);
    console.log(`📊 Depth: ${depth} | Max Sources: ${maxSources}\n`);
    
    const report = {
      topic,
      depth,
      maxSources,
      startTime: new Date().toISOString(),
      sources: [],
      findings: [],
      citations: new Map(),
      metadata: {
        searchQueries: [],
        sourcesVisited: 0,
        sourcesAnalyzed: 0,
        citationsFollowed: 0,
        crossReferences: 0,
        failedFetches: 0
      }
    };

    try {
      // Phase 1: Query Analysis & Search Strategy
      console.log('📝 Phase 1: Analyzing query and generating search strategy...');
      const searchStrategy = this.generateSearchQueries(topic);
      report.metadata.searchQueries = searchStrategy;
      
      // Phase 2: Initial Search Sweep (Depth 1)
      console.log(`🔍 Phase 2: Initial search sweep (${searchStrategy.length} queries)...`);
      const searchResults = await this.executeSearches(searchStrategy, report);
      console.log(`   Found ${searchResults.length} unique sources`);
      
      // Phase 3: Extract Information from Top Sources
      const sourcesToAnalyze = this.selectSourcesToAnalyze(searchResults, depth);
      console.log(`📖 Phase 3: Analyzing top ${sourcesToAnalyze.length} sources...`);
      const extracted = await this.extractFromSources(sourcesToAnalyze, report);
      console.log(`   Extracted ${extracted.length} source contents`);
      
      // Phase 4: Follow Citations (Depth 2+)
      if (depth >= 2) {
        console.log(`🔗 Phase 4: Following citations (depth ${depth})...`);
        await this.followCitations(extracted, depth, report);
        console.log(`   Followed ${report.metadata.citationsFollowed} citations`);
      }
      
      // Phase 5: Cross-Reference & Validate
      console.log('✅ Phase 5: Cross-referencing and validating findings...');
      await this.crossReferenceFindings(report);
      console.log(`   Validated ${report.metadata.crossReferences} cross-references`);
      
      // Phase 6: Synthesize Report
      console.log('📄 Phase 6: Synthesizing final report...');
      const synthesis = await this.synthesizeReport(report);
      report.synthesis = synthesis;
      
      // Finalize
      report.endTime = new Date().toISOString();
      report.durationMs = Date.now() - startTime;
      report.durationMinutes = Math.floor(report.durationMs / 1000 / 60);
      report.status = 'completed';
      
      // Save report
      const reportPath = await this.saveReport(report);
      
      console.log(`\n✅ Research Complete!`);
      console.log(`   Sources: ${report.metadata.sourcesVisited}`);
      console.log(`   Analyzed: ${report.metadata.sourcesAnalyzed}`);
      console.log(`   Duration: ${report.durationMinutes} minutes`);
      console.log(`   Report: ${reportPath}\n`);
      
      return report;
      
    } catch (error) {
      console.error(`\n❌ Research failed: ${error.message}`);
      report.error = error.message;
      report.status = 'failed';
      report.endTime = new Date().toISOString();
      await this.saveReport(report);
      return report;
    }
  }

  /**
   * Generate multiple search queries for comprehensive coverage
   */
  generateSearchQueries(topic) {
    const queries = [
      topic, // Primary query
      `${topic} comprehensive guide`,
      `${topic} research study`,
      `${topic} comparison analysis`,
      `best ${topic}`
    ];
    
    // For depth 3, add more variations
    if (this.maxDepth >= 3) {
      queries.push(
        `${topic} pros and cons`,
        `${topic} expert review`,
        `${topic} case study`
      );
    }
    
    return queries;
  }

  /**
   * Execute searches using OpenClaw web_search tool or fallback
   */
  async executeSearches(queries, report) {
    const allResults = [];
    const resultsPerQuery = 5;
    
    for (const query of queries) {
      try {
        const results = this.useRealTools 
          ? await this.openclawWebSearch(query, resultsPerQuery)
          : await this.mockWebSearch(query, resultsPerQuery);
        
        for (const result of results) {
          allResults.push({
            url: result.url,
            title: result.title,
            description: result.description || result.snippet || '',
            searchQuery: query,
            authorityScore: this.scoreAuthority(result.url, result.title),
            sourceType: this.inferSourceType(result.url),
            discoveredAt: 'Phase 2 - Initial Search'
          });
        }
      } catch (error) {
        console.error(`   ⚠️  Search failed for "${query}": ${error.message}`);
        continue;
      }
    }
    
    // Deduplicate by URL
    const uniqueResults = this.deduplicateByUrl(allResults);
    
    // Sort by authority score (descending)
    uniqueResults.sort((a, b) => b.authorityScore - a.authorityScore);
    
    report.sources.push(...uniqueResults);
    
    return uniqueResults;
  }

  /**
   * Call OpenClaw web_search tool
   */
  async openclawWebSearch(query, count = 5) {
    try {
      // This would ideally use OpenClaw's JavaScript API
      // For now, we'll use a workaround via command line
      const result = execSync(
        `echo "web_search('${query.replace(/'/g, "\\'")}', count=${count})" | openclaw --batch`,
        { encoding: 'utf8', timeout: 30000 }
      );
      
      // Parse results (format depends on OpenClaw output)
      return this.parseSearchResults(result);
    } catch (error) {
      console.error(`OpenClaw web_search failed, using fallback: ${error.message}`);
      return this.mockWebSearch(query, count);
    }
  }

  /**
   * Parse search results from OpenClaw output
   */
  parseSearchResults(output) {
    // Placeholder parser - adjust based on actual OpenClaw output format
    const results = [];
    
    try {
      const json = JSON.parse(output);
      if (json.results && Array.isArray(json.results)) {
        return json.results.map(r => ({
          url: r.url,
          title: r.title,
          description: r.description || r.snippet || ''
        }));
      }
    } catch (e) {
      // Fallback parsing
    }
    
    return results;
  }

  /**
   * Mock web search (fallback when real tools unavailable)
   */
  async mockWebSearch(query, count = 5) {
    console.log(`   [Mock] Searching: "${query}"`);
    
    return Array.from({ length: count }, (_, i) => ({
      url: `https://example.com/${query.replace(/\s+/g, '-')}-${i + 1}`,
      title: `${query} - Result ${i + 1}`,
      description: `Mock description for result ${i + 1} about ${query}`
    }));
  }

  /**
   * Select sources to analyze based on depth
   */
  selectSourcesToAnalyze(sources, depth) {
    const counts = {
      1: 5,
      2: 10,
      3: 15
    };
    
    const count = counts[depth] || 10;
    return sources.slice(0, count);
  }

  /**
   * Extract information from sources using web_fetch
   */
  async extractFromSources(sources, report) {
    const extracted = [];
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      
      try {
        console.log(`   [${i + 1}/${sources.length}] Fetching: ${source.title}`);
        
        const content = this.useRealTools
          ? await this.openclawWebFetch(source.url)
          : await this.mockWebFetch(source.url);
        
        const facts = this.extractKeyFacts(content, source);
        const citations = this.extractCitations(content);
        
        extracted.push({
          source,
          content,
          facts,
          citations,
          timestamp: new Date().toISOString()
        });
        
        report.metadata.sourcesAnalyzed++;
        report.findings.push(...facts);
        
        // Track citations in report
        for (const citationUrl of citations) {
          if (!report.citations.has(citationUrl)) {
            report.citations.set(citationUrl, {
              url: citationUrl,
              discoveredBy: [source.url],
              depth: 1
            });
          } else {
            report.citations.get(citationUrl).discoveredBy.push(source.url);
          }
        }
        
      } catch (error) {
        console.error(`   ⚠️  Failed to fetch ${source.url}: ${error.message}`);
        report.metadata.failedFetches++;
        continue;
      }
    }
    
    report.metadata.sourcesVisited += extracted.length;
    
    return extracted;
  }

  /**
   * Call OpenClaw web_fetch tool
   */
  async openclawWebFetch(url) {
    try {
      const result = execSync(
        `echo "web_fetch('${url.replace(/'/g, "\\'")}', extractMode='markdown')" | openclaw --batch`,
        { encoding: 'utf8', timeout: 30000 }
      );
      
      return this.parseWebFetchResult(result);
    } catch (error) {
      console.error(`OpenClaw web_fetch failed, using fallback: ${error.message}`);
      return this.mockWebFetch(url);
    }
  }

  /**
   * Parse web_fetch results
   */
  parseWebFetchResult(output) {
    try {
      const json = JSON.parse(output);
      if (json.content) {
        return json.content;
      }
    } catch (e) {
      // Return raw output if not JSON
    }
    
    return output;
  }

  /**
   * Mock web fetch (fallback)
   */
  async mockWebFetch(url) {
    return `# Mock Content from ${url}\n\nThis is sample content that would be fetched from the source.\n\n## Key Points\n- Point 1\n- Point 2\n- Point 3\n\nFor more information, see [Related Source](https://example.com/related).`;
  }

  /**
   * Extract key facts from content
   */
  extractKeyFacts(content, source) {
    // Simple heuristic-based extraction
    // In production, would use LLM for structured extraction
    
    const facts = [];
    const lines = content.split('\n');
    
    // Look for sentences with numbers/statistics
    const statPattern = /\d+(\.\d+)?%|\d+(\.\d+)?\s*(million|billion|thousand)/gi;
    
    for (const line of lines) {
      if (statPattern.test(line) && line.length > 20 && line.length < 200) {
        facts.push({
          statement: line.trim(),
          source: source.url,
          sourceTitle: source.title,
          confidence: 0.7, // Default confidence
          type: 'statistic'
        });
      }
    }
    
    // Look for bullet points or numbered lists (key findings)
    const bulletPattern = /^[\s]*[-*•]\s+(.+)$/;
    const numberedPattern = /^[\s]*\d+\.\s+(.+)$/;
    
    for (const line of lines) {
      const bulletMatch = line.match(bulletPattern);
      const numberedMatch = line.match(numberedPattern);
      
      if ((bulletMatch || numberedMatch) && line.length > 20 && line.length < 200) {
        facts.push({
          statement: (bulletMatch || numberedMatch)[1].trim(),
          source: source.url,
          sourceTitle: source.title,
          confidence: 0.6,
          type: 'key_point'
        });
      }
    }
    
    return facts.slice(0, 10); // Limit to top 10 facts per source
  }

  /**
   * Extract citations/URLs from content
   */
  extractCitations(content) {
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    const urls = content.match(urlPattern) || [];
    
    // Deduplicate and filter out common non-content URLs
    const filtered = [...new Set(urls)].filter(url => {
      const lower = url.toLowerCase();
      return !lower.includes('twitter.com/share') &&
             !lower.includes('facebook.com/sharer') &&
             !lower.includes('linkedin.com/share') &&
             !lower.endsWith('.jpg') &&
             !lower.endsWith('.png') &&
             !lower.endsWith('.gif');
    });
    
    return filtered;
  }

  /**
   * Follow citations to specified depth
   */
  async followCitations(extracted, depth, report) {
    const citationsToFollow = [];
    
    // Collect citations from all sources
    for (const item of extracted) {
      citationsToFollow.push(...item.citations);
    }
    
    // Deduplicate
    const uniqueCitations = [...new Set(citationsToFollow)];
    
    // Limit based on depth
    const limits = {
      2: 10,
      3: 20
    };
    const limit = limits[depth] || 10;
    
    // Select citations that haven't been visited yet
    const toVisit = uniqueCitations
      .filter(url => !report.sources.find(s => s.url === url))
      .slice(0, limit);
    
    console.log(`   Following ${toVisit.length} citations...`);
    
    for (let i = 0; i < toVisit.length; i++) {
      const url = toVisit[i];
      
      try {
        console.log(`   [${i + 1}/${toVisit.length}] Citation: ${url.substring(0, 60)}...`);
        
        const content = this.useRealTools
          ? await this.openclawWebFetch(url)
          : await this.mockWebFetch(url);
        
        const facts = this.extractKeyFacts(content, { url, title: 'Citation' });
        
        report.sources.push({
          url,
          title: 'Citation',
          description: 'Discovered via citation following',
          authorityScore: this.scoreAuthority(url),
          sourceType: this.inferSourceType(url),
          discoveredAt: `Phase 4 - Citation Following (Depth ${depth})`
        });
        
        report.findings.push(...facts);
        report.metadata.sourcesVisited++;
        report.metadata.citationsFollowed++;
        
      } catch (error) {
        console.error(`   ⚠️  Failed to follow citation ${url}: ${error.message}`);
        report.metadata.failedFetches++;
        continue;
      }
    }
  }

  /**
   * Cross-reference findings across sources
   */
  async crossReferenceFindings(report) {
    // Group findings by similarity (simplified - production would use embeddings)
    const grouped = new Map();
    
    for (const finding of report.findings) {
      // Simple grouping by first 50 characters (production: use semantic similarity)
      const key = finding.statement.substring(0, 50).toLowerCase();
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key).push(finding);
    }
    
    // Calculate confidence based on agreement
    for (const [key, findings] of grouped.entries()) {
      if (findings.length > 1) {
        const uniqueSources = new Set(findings.map(f => f.source));
        const confidence = Math.min(0.5 + (uniqueSources.size * 0.15), 1.0);
        
        // Update confidence for all findings in group
        for (const finding of findings) {
          finding.confidence = confidence;
          finding.agreementCount = uniqueSources.size;
        }
        
        report.metadata.crossReferences++;
      }
    }
  }

  /**
   * Synthesize final report
   */
  async synthesizeReport(report) {
    // Group findings by confidence
    const highConfidence = report.findings.filter(f => f.confidence >= 0.8);
    const mediumConfidence = report.findings.filter(f => f.confidence >= 0.5 && f.confidence < 0.8);
    const lowConfidence = report.findings.filter(f => f.confidence < 0.5);
    
    // Build synthesis
    const synthesis = {
      executiveSummary: this.generateExecutiveSummary(report),
      keyFindings: highConfidence.slice(0, 10).map((f, i) => ({
        rank: i + 1,
        statement: f.statement,
        confidence: Math.round(f.confidence * 100) + '%',
        sources: f.agreementCount || 1,
        citation: `[${f.sourceTitle}](${f.source})`
      })),
      detailedAnalysis: {
        totalFindings: report.findings.length,
        highConfidenceFindings: highConfidence.length,
        mediumConfidenceFindings: mediumConfidence.length,
        lowConfidenceFindings: lowConfidence.length
      },
      sourceBibliography: this.buildBibliography(report),
      confidenceBreakdown: {
        high: highConfidence.map(f => ({
          statement: f.statement,
          sources: f.agreementCount || 1,
          confidence: Math.round(f.confidence * 100) + '%'
        })),
        medium: mediumConfidence.slice(0, 5).map(f => ({
          statement: f.statement,
          sources: f.agreementCount || 1,
          confidence: Math.round(f.confidence * 100) + '%'
        })),
        low: lowConfidence.slice(0, 5).map(f => ({
          statement: f.statement,
          sources: 1,
          confidence: Math.round(f.confidence * 100) + '%'
        }))
      },
      methodology: {
        searchQueries: report.metadata.searchQueries,
        sourcesVisited: report.metadata.sourcesVisited,
        sourcesAnalyzed: report.metadata.sourcesAnalyzed,
        citationsFollowed: report.metadata.citationsFollowed,
        crossReferences: report.metadata.crossReferences,
        failedFetches: report.metadata.failedFetches,
        depth: report.depth
      }
    };
    
    return synthesis;
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(report) {
    const avgAuthority = report.sources.reduce((sum, s) => sum + s.authorityScore, 0) / report.sources.length;
    
    return `Research on "${report.topic}" completed with ${report.metadata.sourcesVisited} sources visited ` +
           `(${report.metadata.sourcesAnalyzed} deeply analyzed). ` +
           `Found ${report.findings.length} key findings with average source authority of ${avgAuthority.toFixed(1)}/10. ` +
           `${report.metadata.citationsFollowed} citations followed and ${report.metadata.crossReferences} cross-references validated. ` +
           `Research depth: ${report.depth}.`;
  }

  /**
   * Build source bibliography
   */
  buildBibliography(report) {
    return report.sources
      .sort((a, b) => b.authorityScore - a.authorityScore)
      .map((source, i) => ({
        rank: i + 1,
        title: source.title,
        url: source.url,
        authorityScore: source.authorityScore + '/10',
        sourceType: source.sourceType,
        discoveredAt: source.discoveredAt
      }));
  }

  /**
   * Score source authority (0-10)
   */
  scoreAuthority(url, title = '') {
    let score = 5; // Base score
    
    const lower = url.toLowerCase();
    
    // Domain-based scoring
    if (lower.includes('.edu')) score += 3;
    else if (lower.includes('.gov')) score += 3;
    else if (lower.includes('.org')) score += 1;
    else if (lower.includes('wikipedia.org')) score += 2;
    else if (lower.includes('arxiv.org')) score += 3;
    else if (lower.includes('nature.com') || lower.includes('science.org')) score += 4;
    
    // Title-based scoring
    const titleLower = title.toLowerCase();
    if (titleLower.includes('research') || titleLower.includes('study')) score += 1;
    if (titleLower.includes('peer-reviewed') || titleLower.includes('journal')) score += 1;
    
    return Math.min(score, 10);
  }

  /**
   * Infer source type from URL
   */
  inferSourceType(url) {
    const lower = url.toLowerCase();
    
    if (lower.includes('.edu')) return 'academic';
    if (lower.includes('.gov')) return 'government';
    if (lower.includes('arxiv.org') || lower.includes('nature.com') || lower.includes('science.org')) return 'research_paper';
    if (lower.includes('wikipedia.org')) return 'encyclopedia';
    if (lower.includes('github.com') || lower.includes('stackoverflow.com')) return 'technical';
    if (lower.includes('medium.com') || lower.includes('substack.com')) return 'blog';
    if (lower.includes('news') || lower.includes('times') || lower.includes('post')) return 'news';
    
    return 'website';
  }

  /**
   * Deduplicate sources by URL
   */
  deduplicateByUrl(sources) {
    const seen = new Set();
    return sources.filter(source => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });
  }

  /**
   * Save research report to file
   */
  async saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const sanitizedTopic = report.topic.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
    const filename = `research-${sanitizedTopic}-${timestamp}.json`;
    const reportsDir = path.join(this.workspaceRoot, 'research-reports');
    const filepath = path.join(reportsDir, filename);
    
    try {
      await fs.mkdir(reportsDir, { recursive: true });
      
      // Convert Map to object for JSON serialization
      const reportForSave = {
        ...report,
        citations: Array.from(report.citations.values())
      };
      
      await fs.writeFile(filepath, JSON.stringify(reportForSave, null, 2), 'utf-8');
      
      // Also save markdown version
      const markdownPath = filepath.replace('.json', '.md');
      await fs.writeFile(markdownPath, this.generateMarkdownReport(report), 'utf-8');
      
      return filepath;
    } catch (error) {
      console.error(`Failed to save report: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report) {
    const s = report.synthesis;
    
    let md = `# Research Report: ${report.topic}\n\n`;
    md += `**Research Depth:** ${report.depth}  \n`;
    md += `**Sources Visited:** ${report.metadata.sourcesVisited}  \n`;
    md += `**Sources Analyzed:** ${report.metadata.sourcesAnalyzed}  \n`;
    md += `**Duration:** ${report.durationMinutes} minutes  \n`;
    md += `**Completed:** ${report.endTime}  \n\n`;
    
    md += `## Executive Summary\n\n${s.executiveSummary}\n\n`;
    
    md += `## Key Findings\n\n`;
    for (const finding of s.keyFindings) {
      md += `${finding.rank}. **${finding.statement}**\n`;
      md += `   - Confidence: ${finding.confidence}\n`;
      md += `   - Sources: ${finding.sources}\n`;
      md += `   - Citation: ${finding.citation}\n\n`;
    }
    
    md += `## Source Bibliography\n\n`;
    for (const source of s.sourceBibliography.slice(0, 20)) {
      md += `${source.rank}. **${source.title}**\n`;
      md += `   - URL: ${source.url}\n`;
      md += `   - Authority: ${source.authorityScore}\n`;
      md += `   - Type: ${source.sourceType}\n`;
      md += `   - Discovered: ${source.discoveredAt}\n\n`;
    }
    
    md += `## Confidence Assessment\n\n`;
    md += `### High Confidence (80-100%)\n\n`;
    for (const item of s.confidenceBreakdown.high.slice(0, 10)) {
      md += `- ${item.statement} (${item.sources} sources, ${item.confidence})\n`;
    }
    
    md += `\n### Medium Confidence (50-79%)\n\n`;
    for (const item of s.confidenceBreakdown.medium) {
      md += `- ${item.statement} (${item.sources} sources, ${item.confidence})\n`;
    }
    
    md += `\n## Methodology\n\n`;
    md += `- **Search Queries:** ${s.methodology.searchQueries.join(', ')}\n`;
    md += `- **Sources Visited:** ${s.methodology.sourcesVisited}\n`;
    md += `- **Sources Analyzed:** ${s.methodology.sourcesAnalyzed}\n`;
    md += `- **Citations Followed:** ${s.methodology.citationsFollowed}\n`;
    md += `- **Cross-References:** ${s.methodology.crossReferences}\n`;
    md += `- **Depth:** ${s.methodology.depth}\n`;
    
    return md;
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Deep Research Orchestration Engine

Usage:
  node deep-researcher.js "research query" [options]

Options:
  --depth <1|2|3>       Research depth (default: 2)
  --max-sources <N>     Maximum sources to analyze (default: 50)
  --help                Show this help message

Examples:
  node deep-researcher.js "AI coding assistants productivity"
  node deep-researcher.js "quantum computing 2026" --depth 3
  node deep-researcher.js "web frameworks comparison" --depth 1 --max-sources 10
    `);
    process.exit(0);
  }
  
  const topic = args[0];
  const options = {};
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--depth') {
      options.depth = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--max-sources') {
      options.maxSources = parseInt(args[i + 1]);
      i++;
    }
  }
  
  const researcher = new DeepResearcher();
  
  researcher.research(topic, options)
    .then(report => {
      if (report.status === 'completed') {
        console.log('\n' + report.synthesis.executiveSummary);
        process.exit(0);
      } else {
        console.error('\nResearch failed:', report.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\nFatal error:', error.message);
      process.exit(1);
    });
}

module.exports = DeepResearcher;
