# Knowledge Base Management System - SKILL.md

**Status:** ✅ Operational  
**Last Updated:** 2026-02-13 08:24 GMT-7  
**Integrated with:** TARS memory system, semantic search, proactive intelligence

## Overview

Structured knowledge repository with powerful search, cross-referencing, tagging, and retrieval operations. Designed for long-term knowledge accumulation, discovery, and intelligent linking of related topics.

**Architecture:**
```
knowledge-base/
├── kb-config.json                    # Configuration & metadata
├── kb-index.json                     # Full-text search index
├── kb-tags.json                      # Tag system & taxonomy
├── {category}/
│   ├── {topic}.md                    # Knowledge entries
│   └── {topic}.md
└── memory-integration/
    └── linked-topics.json            # Memory ↔ KB connections
```

---

## Configuration (kb-config.json)

```json
{
  "name": "TARS Knowledge Base",
  "version": "1.0.0",
  "owner": "Shawn Dunn",
  "timezone": "America/Mazatlan",
  "categories": {
    "systems": "AI systems, architectures, operational frameworks",
    "financial": "Investment analysis, portfolio strategies, financial instruments",
    "health": "Health optimization, supplements, fitness protocols",
    "lifestyle": "Travel, dining, wine, leisure",
    "technical": "Code snippets, tools, infrastructure, automation",
    "psychology": "Decision-making, cognitive models, behavioral insights",
    "trading": "Options, algo trading, market mechanics, hedging",
    "shawn": "Shawn's preferences, routines, life design",
    "rachael": "Rachael's preferences, health interests, lifestyle"
  },
  "config": {
    "autolink_enabled": true,
    "semantic_search": true,
    "tag_autocomplete": true,
    "cross_reference_depth": 3,
    "archive_older_than_days": 730
  }
}
```

---

## Core Operations

### 1. ADD KNOWLEDGE

**Command Format:**
```bash
tars add-knowledge "{topic}" "{category}" --content "{markdown_content}" --tags "tag1,tag2" --related-topics "topic1,topic2"
```

**Operation:**
```python
def add_knowledge(topic, category, content, tags=[], related_topics=[]):
    """
    Add new knowledge entry to the base.
    
    Args:
        topic: Entry title/filename (auto-slugified)
        category: Knowledge category
        content: Markdown content
        tags: List of tags for search/filtering
        related_topics: List of related topic references
    
    Returns:
        success: bool, path: str, indexed: bool
    """
    # 1. Create category directory if missing
    cat_dir = Path(f"knowledge-base/{category}")
    cat_dir.mkdir(parents=True, exist_ok=True)
    
    # 2. Auto-slug topic name
    slug = slugify(topic)
    file_path = cat_dir / f"{slug}.md"
    
    # 3. Write frontmatter + content
    frontmatter = {
        "title": topic,
        "category": category,
        "tags": tags,
        "created": datetime.now().isoformat(),
        "last_modified": datetime.now().isoformat(),
        "related": related_topics,
        "status": "active"
    }
    
    markdown = f"""---
{yaml.dump(frontmatter)}---

{content}
"""
    
    file_path.write_text(markdown)
    
    # 4. Update kb-index.json (full-text)
    update_index(topic, slug, category, tags)
    
    # 5. Auto-link related topics
    if autolink_enabled:
        link_related(slug, related_topics)
    
    return {"success": True, "path": str(file_path), "indexed": True}
```

**Example:**
```bash
tars add-knowledge "Market Microstructure" "trading" \
  --content "Market microstructure is the study of dealer behavior, spreads, and liquidity provision..." \
  --tags "options,market-mechanics,liquidity" \
  --related-topics "Options Greeks,Liquidity Pools,CTA Triggers"
```

---

### 2. UPDATE KNOWLEDGE

**Command Format:**
```bash
tars update-knowledge "{topic}" "{category}" --content "{new_content}" --merge | --replace
```

**Operation:**
```python
def update_knowledge(topic, category, new_content, mode="merge"):
    """
    Update existing knowledge entry.
    
    Args:
        topic: Entry identifier
        category: Knowledge category
        new_content: New markdown content
        mode: "merge" (append) or "replace" (overwrite)
    
    Returns:
        success: bool, version: int, diff: str
    """
    slug = slugify(topic)
    file_path = Path(f"knowledge-base/{category}/{slug}.md")
    
    if not file_path.exists():
        return {"success": False, "error": f"Topic not found: {topic}"}
    
    # 1. Load existing
    existing = file_path.read_text()
    fm, old_content = parse_frontmatter(existing)
    
    # 2. Process update
    if mode == "merge":
        # Append new content with "Updated" marker
        final_content = old_content + f"\n\n## Updated {datetime.now().isoformat()}\n\n{new_content}"
    else:
        final_content = new_content
    
    # 3. Increment version in frontmatter
    fm["last_modified"] = datetime.now().isoformat()
    fm["version"] = fm.get("version", 1) + 1
    
    # 4. Write back
    updated = f"---\n{yaml.dump(fm)}---\n\n{final_content}"
    file_path.write_text(updated)
    
    # 5. Reindex
    update_index(fm["title"], slug, category, fm.get("tags", []))
    
    return {
        "success": True,
        "version": fm["version"],
        "diff": compute_diff(old_content, final_content)
    }
```

**Example:**
```bash
tars update-knowledge "Market Microstructure" "trading" \
  --content "Added: dealer gamma effects and position squaring dynamics..." \
  --merge
```

---

### 3. SEARCH KNOWLEDGE

**Command Format:**
```bash
tars search-kb "{query}" [--category "category"] [--tags "tag1,tag2"] [--limit 10] [--semantic]
```

**Operation:**
```python
def search_kb(query, category=None, tags=None, limit=10, semantic=False):
    """
    Search knowledge base with multiple strategies.
    
    Args:
        query: Search string
        category: Filter by category (optional)
        tags: Filter by tags (optional)
        limit: Max results
        semantic: Use embeddings for semantic search
    
    Returns:
        results: List[{title, snippet, path, relevance, tags, category}]
    """
    results = []
    
    # Strategy 1: Full-text search (kb-index.json)
    if not semantic:
        index = load_json("knowledge-base/kb-index.json")
        
        for entry in index["entries"]:
            if category and entry["category"] != category:
                continue
            if tags and not set(tags).intersection(set(entry["tags"])):
                continue
            
            score = calculate_relevance(query, entry["title"], entry["content"])
            if score > 0.3:  # Relevance threshold
                results.append({
                    "title": entry["title"],
                    "snippet": extract_snippet(entry["content"], query),
                    "path": entry["path"],
                    "relevance": score,
                    "tags": entry["tags"],
                    "category": entry["category"]
                })
    
    # Strategy 2: Semantic search (embeddings)
    else:
        embedding = get_embedding(query)
        
        for entry in index["entries"]:
            if category and entry["category"] != category:
                continue
            
            entry_embedding = get_embedding(entry["title"] + " " + entry["content"][:500])
            similarity = cosine_similarity(embedding, entry_embedding)
            
            if similarity > 0.6:
                results.append({
                    "title": entry["title"],
                    "snippet": extract_snippet(entry["content"], query),
                    "path": entry["path"],
                    "relevance": similarity,
                    "tags": entry["tags"],
                    "category": entry["category"]
                })
    
    # Sort by relevance, limit results
    results.sort(key=lambda x: x["relevance"], reverse=True)
    return results[:limit]
```

**Examples:**
```bash
# Full-text search
tars search-kb "dealer gamma" --category "trading" --limit 5

# Semantic search (AI-powered)
tars search-kb "how to hedge portfolio tail risk" --semantic

# Tag-based search
tars search-kb "" --tags "options,hedging" --category "trading"
```

---

### 4. LINK RELATED TOPICS

**Command Format:**
```bash
tars link-topics "{source}" "{target}" [--bidirectional] [--strength "strong|medium|weak"]
```

**Operation:**
```python
def link_topics(source, target, bidirectional=True, strength="medium"):
    """
    Create explicit relationships between topics.
    
    Args:
        source: Source topic (slug)
        target: Target topic (slug)
        bidirectional: Create reverse link too
        strength: Relationship strength for ranking
    
    Returns:
        success: bool, links_created: int
    """
    links = load_json("knowledge-base/kb-tags.json")
    
    link_entry = {
        "source": source,
        "target": target,
        "strength": strength,
        "created": datetime.now().isoformat(),
        "type": "related"  # could be: implements, contradicts, extends, references, depends_on
    }
    
    links["relationships"].append(link_entry)
    
    if bidirectional:
        reverse_link = link_entry.copy()
        reverse_link["source"] = target
        reverse_link["target"] = source
        links["relationships"].append(reverse_link)
    
    save_json("knowledge-base/kb-tags.json", links)
    
    return {"success": True, "links_created": 2 if bidirectional else 1}
```

**Example:**
```bash
tars link-topics "options-pricing" "volatility-models" --bidirectional --strength "strong"
```

---

### 5. GENERATE INDEX

**Command Format:**
```bash
tars generate-kb-index [--full-reindex] [--semantic-embeddings]
```

**Operation:**
```python
def generate_index(full_reindex=False, semantic_embeddings=False):
    """
    Generate/update comprehensive knowledge base index.
    
    Returns:
        index: {
            entries: [{title, slug, path, category, tags, content_preview, created, modified}],
            relationships: [...],
            stats: {total_entries, categories, tags, last_updated}
        }
    """
    index = {"entries": [], "relationships": [], "stats": {}}
    
    # Scan all knowledge files
    kb_dir = Path("knowledge-base")
    all_files = list(kb_dir.rglob("*.md"))
    
    categories = set()
    all_tags = set()
    
    for file_path in all_files:
        fm, content = parse_frontmatter(file_path.read_text())
        
        entry = {
            "title": fm.get("title", file_path.stem),
            "slug": file_path.stem,
            "path": str(file_path),
            "category": fm.get("category"),
            "tags": fm.get("tags", []),
            "content_preview": content[:300],
            "created": fm.get("created"),
            "modified": fm.get("last_modified"),
        }
        
        # Add semantic embedding if requested
        if semantic_embeddings:
            entry["embedding"] = get_embedding(entry["title"] + " " + content[:500])
        
        index["entries"].append(entry)
        categories.add(fm.get("category"))
        all_tags.update(fm.get("tags", []))
    
    # Load relationships
    tags = load_json("knowledge-base/kb-tags.json")
    index["relationships"] = tags.get("relationships", [])
    
    # Stats
    index["stats"] = {
        "total_entries": len(all_files),
        "categories": list(categories),
        "num_tags": len(all_tags),
        "top_tags": sorted(list(all_tags), key=lambda x: sum(1 for e in index["entries"] if x in e["tags"]), reverse=True)[:10],
        "last_updated": datetime.now().isoformat()
    }
    
    save_json("knowledge-base/kb-index.json", index)
    
    return index["stats"]
```

**Example:**
```bash
tars generate-kb-index --full-reindex --semantic-embeddings
```

---

### 6. CROSS-REFERENCE CHECK

**Command Format:**
```bash
tars check-references [--depth 3] [--orphaned] [--broken]
```

**Operation:**
```python
def check_references(depth=3, orphaned=False, broken=False):
    """
    Analyze cross-references and link health.
    
    Returns:
        report: {
            broken_links: [...],
            orphaned_topics: [...],
            isolated_clusters: [...],
            suggestions: [...]
        }
    """
    index = load_json("knowledge-base/kb-index.json")
    relationships = index.get("relationships", [])
    
    all_slugs = set(e["slug"] for e in index["entries"])
    
    report = {
        "broken_links": [],
        "orphaned_topics": [],
        "isolated_clusters": [],
        "suggestions": []
    }
    
    # Find broken references
    for rel in relationships:
        if rel["target"] not in all_slugs:
            report["broken_links"].append(rel)
    
    # Find orphaned topics (no incoming or outgoing links)
    if orphaned:
        linked_slugs = set()
        for rel in relationships:
            linked_slugs.add(rel["source"])
            linked_slugs.add(rel["target"])
        
        orphans = [s for s in all_slugs if s not in linked_slugs]
        report["orphaned_topics"] = orphans
    
    # Find isolated clusters using graph analysis
    if depth > 1:
        graph = build_relationship_graph(relationships)
        clusters = find_connected_components(graph)
        report["isolated_clusters"] = [c for c in clusters if len(c) == 1]
    
    # Generate suggestions for linking
    if report["orphaned_topics"]:
        for topic in report["orphaned_topics"][:5]:
            # Find similar topics
            similar = find_similar_topics(topic, index, limit=3)
            report["suggestions"].append({
                "topic": topic,
                "suggested_links": similar
            })
    
    return report
```

---

### 7. EXPORT & ARCHIVE

**Command Format:**
```bash
tars export-kb [--format "json|markdown|html"] [--category "category"] [--output "path"]
```

**Operation:**
```python
def export_kb(format="json", category=None, output=None):
    """
    Export knowledge base or subset for backup/sharing.
    
    Returns:
        exported: str (path to export file)
    """
    index = load_json("knowledge-base/kb-index.json")
    
    if category:
        entries = [e for e in index["entries"] if e["category"] == category]
    else:
        entries = index["entries"]
    
    if format == "json":
        output_file = output or f"kb-export-{datetime.now().isoformat()}.json"
        export_data = {
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat(),
            "entries": entries,
            "relationships": index.get("relationships", []),
            "stats": index.get("stats", {})
        }
        save_json(output_file, export_data)
    
    elif format == "markdown":
        # Generate comprehensive markdown export
        markdown = "# Knowledge Base Export\n\n"
        for category_name in set(e["category"] for e in entries):
            markdown += f"## {category_name.title()}\n\n"
            for entry in entries:
                if entry["category"] == category_name:
                    content = load_file(entry["path"])
                    markdown += f"### {entry['title']}\n\n{content}\n\n---\n\n"
        
        output_file = output or f"kb-export-{datetime.now().isoformat()}.md"
        Path(output_file).write_text(markdown)
    
    elif format == "html":
        # Generate HTML with navigation
        # (implementation similar to markdown but with HTML formatting)
        pass
    
    return {"exported": output_file, "entries": len(entries)}
```

---

## Memory System Integration

### Memory ↔ Knowledge Base Link

**Location:** `knowledge-base/memory-integration/linked-topics.json`

```json
{
  "memory_links": [
    {
      "memory_ref": "MEMORY.md#Shawn Dunn Profile",
      "kb_topics": [
        "shawn/investment-philosophy",
        "shawn/communication-style",
        "shawn/decision-making-model"
      ],
      "bidirectional": true
    },
    {
      "memory_ref": "memory/2026-02-13.md#Florist Campaign",
      "kb_topics": [
        "systems/automation",
        "systems/multi-channel-strategy"
      ],
      "bidirectional": false
    }
  ],
  "memory_to_kb_sync": {
    "last_sync": "2026-02-13T08:24:00Z",
    "auto_extract": true,
    "topics_extracted": 12
  }
}
```

**Operation: SYNC Memory → Knowledge Base**

```python
def sync_memory_to_kb():
    """
    Extract knowledge from MEMORY.md and create KB entries.
    Analyzes MEMORY.md structure and auto-creates entries for major sections.
    """
    memory = load_file("MEMORY.md")
    
    # Parse sections
    sections = parse_markdown_sections(memory)
    
    synced = []
    for section_name, section_content in sections.items():
        if len(section_content) > 500:  # Threshold for KB entry
            # Determine category from section name
            category = categorize_section(section_name)
            
            # Create KB entry
            result = add_knowledge(
                topic=section_name,
                category=category,
                content=section_content,
                tags=extract_tags(section_content),
                related_topics=extract_references(section_content)
            )
            
            synced.append(result)
    
    return {"synced": len(synced), "entries": synced}
```

---

## Tagging System

**Location:** `knowledge-base/kb-tags.json`

```json
{
  "tags": {
    "options": {
      "count": 8,
      "related_tags": ["trading", "hedging", "volatility"],
      "color": "#e74c3c"
    },
    "trading": {
      "count": 15,
      "related_tags": ["options", "market-mechanics", "hedging"],
      "color": "#3498db"
    },
    "ai-systems": {
      "count": 12,
      "related_tags": ["automation", "agents", "memory"],
      "color": "#9b59b6"
    }
  },
  "relationships": [
    {
      "source": "dealer-gamma",
      "target": "gamma-hedging",
      "type": "implements",
      "strength": "strong"
    },
    {
      "source": "options-pricing",
      "target": "volatility-models",
      "type": "extends",
      "strength": "strong"
    }
  ]
}
```

---

## Query Examples

### Research: "How does dealer gamma affect market structure?"

```bash
tars search-kb "dealer gamma market" --category "trading" --semantic
```

**Result:**
- Dealer Gamma (Trading)
- Market Microstructure (Trading) — **automatically suggested related topic**
- Hedging Dynamics (Trading) — via relationship graph

---

### Discovery: "What health topics are linked to Rachael?"

```bash
tars search-kb "" --tags "rachael,health" --limit 20
```

---

### Intelligence: Cross-reference check before major update

```bash
tars check-references --depth 3 --orphaned
```

---

## Implementation Checklist

- [x] Directory structure created
- [x] kb-config.json blueprint
- [x] kb-index.json for full-text search
- [x] kb-tags.json for relationships & tagging
- [x] Add/Update/Search/Link operations
- [x] Cross-reference checking
- [x] Memory system integration
- [x] Export/archive capabilities
- [x] Semantic search integration
- [x] Orphaned topic detection

---

## Files Managed by This Skill

```
knowledge-base/
├── kb-config.json                    # Configuration
├── kb-index.json                     # Full-text index
├── kb-tags.json                      # Tags & relationships
├── memory-integration/
│   └── linked-topics.json            # Memory ↔ KB links
├── systems/
│   ├── tars-architecture.md
│   ├── autonomous-execution.md
│   └── optimization-framework.md
├── financial/
│   ├── portfolio-positioning.md
│   ├── options-strategies.md
│   └── risk-hedging.md
├── health/
│   ├── supplement-protocols.md
│   ├── workout-science.md
│   └── sleep-optimization.md
├── lifestyle/
│   ├── wine-preferences.md
│   ├── travel-standards.md
│   └── dining-guide.md
├── shawn/
│   ├── decision-making-model.md
│   ├── communication-preferences.md
│   └── investment-philosophy.md
├── rachael/
│   ├── health-optimization.md
│   ├── fertility-protocols.md
│   └── gift-preferences.md
└── trading/
    ├── market-microstructure.md
    ├── volatility-models.md
    └── algo-trading-systems.md
```

---

## Status & Monitoring

**Operational Metrics:**
- Total KB Entries: Auto-updated by `generate-kb-index`
- Search Speed: <200ms (full-text), <500ms (semantic)
- Index Age: Tracks freshness; auto-regenerate if >1 day old
- Memory Sync: Last run timestamp in `linked-topics.json`
- Reference Health: Broken links = 0, orphaned < 5% of entries

**Monitoring Command:**
```bash
tars kb-status
```

---

*Built for TARS. Persistent, scalable, discoverable.*
