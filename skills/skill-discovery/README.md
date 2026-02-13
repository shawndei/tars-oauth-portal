# Skill Auto-Discovery & Composition

> Intelligent skill discovery, recommendation, and dynamic composition engine

## Quick Start

```bash
# Scan all skills
node index.js scan

# Search for skills
node index.js search "email notification"

# Get recommendations
node index.js recommend "send daily reports"

# Compose skill chain
node index.js compose "analyze data and generate report"

# View statistics
node index.js stats
```

## Features

- 🔍 **Automatic Discovery** - Scans and indexes all SKILL.md files
- 🎯 **Capability Detection** - Extracts skills' capabilities automatically
- 🔗 **Dependency Resolution** - Builds dependency graphs
- ⛓️ **Dynamic Composition** - Creates skill chains for complex goals
- 💡 **Smart Recommendations** - Suggests relevant skills for tasks
- 🚀 **Fast** - Sub-second search with persistent caching

## Programmatic Usage

```javascript
const { SkillDiscovery } = require('./skills/skill-discovery');

const discovery = new SkillDiscovery();
await discovery.initialize();

// Search
const results = discovery.search('email');

// Recommend
const recommendations = discovery.recommend('send notifications');

// Compose chain
const chain = discovery.composeChain('backup and notify');

// Get skill info
const skill = discovery.getSkill('episodic-memory');
```

## Documentation

See [SKILL.md](SKILL.md) for comprehensive documentation.

## Testing

```bash
node test.js
```

## Architecture

- `index.js` - Main discovery engine
- `scanner.js` - Directory scanning and SKILL.md parsing
- `capability-detector.js` - Capability and tag extraction
- `dependency-resolver.js` - Dependency graph management
- `chain-composer.js` - Dynamic skill chain composition
- `recommendation-engine.js` - Semantic search and recommendations

## Status

✅ **Production Ready** - v1.0.0 (2026-02-13)
