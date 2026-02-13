# Agent Specialization Profiles

Smart agent routing for cost-optimized, high-quality task execution.

## Quick Start

### Test the Router

```bash
node router.js "Research quantum computing breakthroughs"
```

Output:
```
🎯 Routing Task: "Research quantum computing breakthroughs"

✓ Agent: Researcher Agent
✓ Model: anthropic/claude-haiku-4-5
✓ Confidence: 100.0%
✓ Matched Triggers: research
✓ Cost: $1/M tokens

💰 Estimated Cost: $0.0500
   (for 50,000 tokens)
```

### Available Profiles

| Profile | Model | Cost | Specialty |
|---------|-------|------|-----------|
| 🔬 Researcher | Haiku | $1/M | Research, data gathering |
| 💻 Coder | Sonnet | $15/M | Code, debugging, architecture |
| 📊 Analyst | Haiku | $1/M | Data analysis, trends |
| ✍️ Writer | Sonnet | $15/M | Content, documentation |
| 🎯 Coordinator | Sonnet | $15/M | Orchestration, synthesis |

## Usage

### Route a Task

```javascript
const AgentRouter = require('./router');
const router = new AgentRouter();

const result = router.routeTask('Find top 5 AI companies');
console.log(result.agent.name); // "Researcher Agent"
```

### Estimate Cost

```javascript
const cost = router.estimateCost('Build a CLI tool', 100000);
console.log(`Cost: $${cost.estimatedCost}`); // "Cost: $1.5000"
```

### Get Fallback Chain

```javascript
const fallbacks = router.getFallbackChain('researcher');
console.log(fallbacks); // ["analyst", "coordinator"]
```

## Cost Savings

**Example:** Research + Analysis + Report

**Without Profiles (all Sonnet):**
- Research: 50K tokens × $15/M = $0.75
- Analysis: 30K tokens × $15/M = $0.45
- Writing: 40K tokens × $15/M = $0.60
- **Total: $1.80**

**With Profiles:**
- Research: 50K tokens × $1/M = $0.05 [Haiku]
- Analysis: 30K tokens × $1/M = $0.03 [Haiku]
- Writing: 40K tokens × $15/M = $0.60 [Sonnet]
- **Total: $0.68 (62% savings!)**

## Files

- `SKILL.md` — Complete documentation
- `agent-profiles.json` — Profile definitions
- `router.js` — Routing logic
- `package.json` — npm package config
- `README.md` — This file

## Documentation

See `SKILL.md` for full documentation including:
- Profile details
- Routing strategies
- Integration guide
- Testing procedures
- Best practices

---

**Status:** ✅ Production Ready  
**Version:** 2.0.0  
**Last Updated:** 2026-02-13
