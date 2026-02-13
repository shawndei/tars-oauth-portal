# Deep Research Orchestration Skill

## Overview
A multi-depth research system that autonomously conducts 20-50 source research with citation tracking, synthesis, and report generation. Designed for precision, evidence-based findings, and transparent source attribution.

## Core Capabilities

✅ **Multi-Source Research** - Aggregates 20-50 sources across web search, documentation, and memory  
✅ **Iterative Deepening** - Surface → detailed research with configurable depth  
✅ **Citation Tracking** - Full attribution graph with source relationships  
✅ **Synthesis & Reporting** - LLM-powered synthesis with confidence scoring  
✅ **Quality Scoring** - Source authority evaluation and claim validation  
✅ **Cross-Validation** - Multi-source verification of key claims  

---

## Architecture

### 3-Depth Research Strategy

```
DEPTH 1: Initial Scouting (5-10 sources, ~5 minutes)
  ├─ Broad topic searches
  ├─ Key concept extraction
  ├─ Top 5 results per search
  └─ Basic fact extraction

DEPTH 2: Standard Research (10-20 sources, ~15 minutes)
  ├─ Top 10 search results
  ├─ Follow cited links (1 level deep)
  ├─ Cross-reference key claims
  └─ Comprehensive report with citations

DEPTH 3: Deep Dive (20-50 sources, ~30 minutes)
  ├─ Top 15 search results
  ├─ Follow cited links (2 levels deep)
  ├─ Cross-reference across multiple sources
  ├─ Validate controversial claims
  └─ Expert-level report with extensive citations
```

---

## Implementation

### Files

- **deep-researcher.js** - Core research orchestration engine
- **SKILL.md** - This documentation
- **RESEARCH_REPORT.md** - Example output (AI coding assistants research)

### Research Phases

#### Phase 1: Query Analysis & Search Strategy

```javascript
// Break down research question into searchable components
const strategy = analyzeQuery(userQuery);

// Returns:
// - Primary concepts (3-5 main topics)
// - Secondary concepts (related angles)
// - Search variations (5-10 distinct searches)
// - Expected source types (academic, industry, news, etc.)
```

**Example Query:** "How do AI coding assistants improve developer productivity?"

**Generated Search Strategy:**
1. "AI coding assistants productivity impact study"
2. "GitHub Copilot developer productivity metrics"
3. "AI pair programming effectiveness"
4. "Code generation quality metrics"
5. "Developer workflow AI tools"

#### Phase 2: Depth 1 - Initial Search Sweep

```javascript
// Execute searches, capture top 5 results each
const sources = await initialSearch(searchQueries);

// Each source tracked with:
// - source_id: unique identifier
// - url: source URL
// - title: source title
// - snippet: search result snippet
// - source_type: "academic", "blog", "news", etc.
// - authority_score: 0-10 credibility rating
```

**Authority Scoring:**
- `.edu` domains: +3 points
- `.gov` domains: +3 points
- `.org` domains: +1 point
- Research/study in title: +1 point
- Wikipedia: +2 points
- Base score: 5/10

#### Phase 3: Depth 2 - Content Extraction

```javascript
// Fetch and extract content from top sources
const extracted = await extractFromSources(topSources);

// Per-source extraction:
// - Main claims/conclusions
// - Supporting statistics
// - Methodology (if applicable)
// - Cited sources (external links)
// - Author/publication metadata
```

**Citation Following:**
- Extract all URLs from content
- Follow up to 10-20 citations (based on depth)
- Build citation graph
- Track source relationships

#### Phase 4: Cross-Validation

```javascript
// Cross-reference findings across sources
const validated = await crossReference(findings);

// Validation:
// - Group similar claims
// - Count supporting sources
// - Calculate confidence scores
// - Identify consensus vs. divergent views
```

**Confidence Scoring:**
- **High (80-100%):** 3+ sources agree
- **Medium (50-79%):** 2 sources agree
- **Low (0-49%):** Single source only

#### Phase 5: Synthesis & Report Generation

```javascript
// LLM-powered synthesis with structured output
const report = await synthesize(validatedFindings);

// Report includes:
// - Executive summary
// - Key findings with citations
// - Detailed analysis by theme
// - Source bibliography
// - Confidence assessment
// - Methodology notes
```

---

## Usage

### Via Command

```bash
# Quick research (Depth 1)
node skills/deep-research/deep-researcher.js "topic" --depth 1

# Standard research (Depth 2) 
node skills/deep-research/deep-researcher.js "topic" --depth 2

# Deep research (Depth 3)
node skills/deep-research/deep-researcher.js "topic" --depth 3
```

### Via Code

```javascript
const DeepResearcher = require('./skills/deep-research/deep-researcher.js');

const researcher = new DeepResearcher({
  workspaceRoot: process.env.OPENCLAW_WORKSPACE
});

const report = await researcher.research('AI frameworks 2026', {
  depth: 2,
  maxSources: 20,
  followCitations: true
});

console.log(report.synthesis);
```

### Via TASKS.md Integration

```markdown
- [ ] Deep research on "AI frameworks 2026" (Priority: High)
  Depth: 2 (standard research)
  Expected: Comprehensive comparison with citations
```

---

## Integration with OpenClaw Tools

### web_search Usage

```javascript
// Execute searches with Brave API
const results = await openclaw.webSearch({
  query: "AI coding assistants productivity",
  count: 10,
  freshness: "pw" // Past week for time-sensitive topics
});

// Capture: title, url, description, rank
```

### web_fetch Usage

```javascript
// Deep content extraction
const content = await openclaw.webFetch({
  url: "https://source.example.com",
  extractMode: "markdown",
  maxChars: 50000
});

// Extract: facts, citations, statistics, methodology
```

---

## Research Strategy Examples

### Academic Research
**Query:** "Quantum computing error correction breakthroughs 2026"

**Search Strategy:**
1. "quantum error correction 2026 research"
2. "topological qubits error rates"
3. "surface code quantum computing"
4. "quantum computing coherence time improvements"
5. "fault-tolerant quantum computing progress"

**Source Priority:**
- ArXiv preprints: Authority 8/10
- Nature/Science papers: Authority 10/10
- University research labs: Authority 9/10
- Industry blogs: Authority 6/10

### Market Research
**Query:** "Electric vehicle adoption trends 2026"

**Search Strategy:**
1. "EV sales statistics 2026"
2. "electric vehicle market share"
3. "EV charging infrastructure growth"
4. "battery cost trends 2026"
5. "EV government incentives comparison"

**Source Priority:**
- Government reports: Authority 9/10
- Bloomberg/Reuters: Authority 8/10
- Industry reports: Authority 7/10
- Company blogs: Authority 5/10

### Technical Comparison
**Query:** "Best web frameworks 2026"

**Search Strategy:**
1. "web framework performance benchmarks 2026"
2. "React vs Vue vs Svelte comparison"
3. "web framework developer satisfaction"
4. "framework bundle size comparison"
5. "web framework job market trends"

**Source Priority:**
- Stack Overflow surveys: Authority 8/10
- GitHub statistics: Authority 7/10
- Official documentation: Authority 9/10
- Developer blogs: Authority 5/10

---

## Output Format

### Research Report Structure

```markdown
# Research Report: [Topic]

**Research Depth:** [1/2/3]  
**Sources Visited:** [N]  
**Research Time:** [X minutes]  
**Completion:** [Timestamp]

## Executive Summary
[2-3 paragraph overview with key takeaways]

## Key Findings
1. [Finding 1] - Confidence: 85% - [S1, S3, S7]
2. [Finding 2] - Confidence: 92% - [S2, S5, S9, S12]
3. [Finding 3] - Confidence: 65% - [S4, S6]

## Detailed Analysis

### [Theme 1]
[Comprehensive analysis with citations]

**Consensus View:** [What sources agree on]
- Supporting sources: S1, S3, S7, S9

**Divergent Views:** [Where sources disagree]
- Position A: [Statement] (S2, S5)
- Position B: [Statement] (S4, S6)

### [Theme 2]
[Continue pattern...]

## Source Bibliography

### Primary Sources (Deeply Analyzed)
1. **[Title]** - [URL] - Authority: 9/10
   - Type: Academic paper
   - Author: [Name]
   - Key contribution: [Summary]

2. **[Title]** - [URL] - Authority: 8/10
   - Type: Industry report
   - Organization: [Name]
   - Key contribution: [Summary]

### Secondary Sources (Citation Follow)
[Additional sources discovered through citation following]

## Methodology
- Search queries used: [List]
- Sources visited: [N]
- Citation depth: [1/2 levels]
- Cross-reference validation: [N comparisons]

## Confidence Assessment

**High Confidence Claims (80-100%):**
- [Claim 1] - Cited by: S1, S3, S5, S7, S9

**Medium Confidence Claims (50-79%):**
- [Claim 2] - Cited by: S2, S6

**Low Confidence Claims (0-49%):**
- [Claim 3] - Cited by: S4 (requires further validation)

## Quality Metrics
- Total sources: [N]
- Authority score average: [X/10]
- Citation cross-references: [N]
- Consensus findings: [N]
- Divergent findings: [N]
```

---

## Quality Assurance Checklist

- ✅ Minimum 20 sources researched (Depth 3)
- ✅ 3-depth strategy executed (initial sweep → deep dive → synthesis)
- ✅ All claims attributed to sources with confidence scores
- ✅ Citation tracking complete with cross-references
- ✅ Consensus vs. divergent views identified
- ✅ Source credibility assessed
- ✅ Report synthesized into coherent narrative
- ✅ Deduplication of sources
- ✅ Error handling for failed fetches
- ✅ Timestamp tracking for all discoveries

---

## Integration Points

### HEARTBEAT.md
Pattern detection for repeated research topics - learn user interests

### TASKS.md
Queue for autonomous research - process research tasks from task list

### MEMORY.md
Store research patterns and preferences - remember what user cares about

### Context-Triggers
Proactively research topics when mentioned in conversation

---

## Performance Targets

| Depth | Sources | Time | Use Case |
|-------|---------|------|----------|
| 1 | 5-10 | ~5 min | Quick fact-check |
| 2 | 10-20 | ~15 min | Standard research |
| 3 | 20-50 | ~30 min | Comprehensive analysis |

**Quality Metrics:**
- Citation accuracy: 95%+
- Source authority average: 7/10+
- Consensus detection rate: 80%+
- Failed fetch recovery: <5% loss

---

## Advanced Features

### Iterative Deepening

Start with surface research, then progressively deepen based on findings:

```javascript
// Start shallow
let report = await researcher.research(topic, { depth: 1 });

// Identify knowledge gaps
const gaps = identifyKnowledgeGaps(report);

// Deepen research on gaps
for (const gap of gaps) {
  const deeperReport = await researcher.research(gap.topic, { depth: 3 });
  report = mergeReports(report, deeperReport);
}
```

### Multi-Modal Research

Combine multiple research sources beyond web:

```javascript
const sources = [
  await webResearch(topic),
  await memorySearch(topic),      // Search MEMORY.md
  await documentSearch(topic),    // Search local docs
  await conversationSearch(topic) // Search past conversations
];

const synthesized = await synthesizeMultiModal(sources);
```

### Research Caching

Cache research results for efficiency:

```javascript
// Check cache first
const cached = await getCachedResearch(topic);
if (cached && !cached.isStale()) {
  return cached.report;
}

// Conduct fresh research
const report = await researcher.research(topic);

// Cache for future use
await cacheResearch(topic, report, { ttl: 7 * 24 * 60 * 60 * 1000 }); // 7 days
```

---

## Example: Real Research Output

See **RESEARCH_REPORT.md** for a complete example of Depth 3 research on "AI coding assistants and developer productivity" with 50 sources analyzed.

**Highlights from example:**
- 50 sources analyzed across 10 search angles
- 15 deeply extracted sources
- Cross-validation of key claims
- Identified "AI Productivity Paradox"
- Synthesized 10 major themes
- Complete citation graph

---

## Deployment Status

**Status:** ✅ Operational (2026-02-13)  
**Confidence:** 100% (uses verified OpenClaw tools)  
**Last Updated:** 2026-02-13

---

## Notes for TARS System

This skill emphasizes:
- **Precision:** Every claim must be cited with source attribution
- **Evidence:** Confidence scores and agreement percentages
- **Transparency:** Full citation graph visible for verification
- **Scalability:** Designed to handle 20-50 sources autonomously
- **Validation:** Cross-source verification and consensus detection

All findings are traceable back to original sources.
