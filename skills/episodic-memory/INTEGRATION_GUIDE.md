# Episodic Memory - Quick Integration Guide

**For:** Main TARS Agent  
**Time to Deploy:** 10 minutes

---

## 1. Configure API Key (2 minutes)

```powershell
# Windows PowerShell - Set for this session
$env:OPENAI_API_KEY = "YOUR_OPENAI_KEY_HERE"

# Or permanently in Windows
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'YOUR_OPENAI_KEY_HERE', 'User')
```

**Where to get the key:**
- OpenClaw config: `openclaw.json` → search for "openai" (if configured)
- OpenAI dashboard: https://platform.openai.com/api-keys
- Create new key if needed

---

## 2. Initial Index (5 minutes)

```bash
cd skills/episodic-memory
node index.js index
```

**Expected output:**
```
=== INDEXING MEMORY FILES ===

Indexing: MEMORY.md
Generating embeddings for batch 1/1...
  ✓ Indexed 24 chunks
Indexing: 2026-02-13.md
Generating embeddings for batch 1/1...
  ✓ Indexed 9 chunks
...

✓ Indexing complete: 36 total chunks indexed
```

**Time:** 2-5 minutes depending on memory size

---

## 3. Test Search (1 minute)

```bash
# Test basic search
node index.js search "optimization phases"

# Test another query
node index.js search "Shawn preferences communication"
```

**Expected:** Results in <1 second with similarity scores >0.7

---

## 4. View Statistics (30 seconds)

```bash
node index.js stats
```

**Expected output:**
```
=== DATABASE STATISTICS ===

Total chunks indexed: 36
Unique sources: 3

Sources:
  - MEMORY.md
  - 2026-02-13.md
  - 2026-02-12.md

Database location: C:\Users\DEI\.openclaw\workspace\.episodic-memory-db
```

---

## 5. Add to HEARTBEAT.md (2 minutes)

Add daily indexing to your heartbeat routine:

```markdown
## Episodic Memory Indexing

**Frequency:** Once daily (when new daily log detected)
**Last Run:** Track in heartbeat-state.json

**Check:**
```bash
# Get current date
$today = Get-Date -Format "yyyy-MM-dd"
$logFile = "memory/$today.md"

# Check if today's log exists and has content
if (Test-Path $logFile) {
    $size = (Get-Item $logFile).Length
    if ($size -gt 1000) {  # More than 1KB
        # Index new content
        cd skills/episodic-memory
        node index.js index
        Write-Host "✓ Memory indexed: $today"
    }
}
```

**Expected frequency:** Once per day, ~10-20 seconds

---

## 6. Programmatic Usage (Optional)

Use in other skills/code:

```javascript
const episodicMemory = require('./skills/episodic-memory/index.js');

async function searchMemory(query) {
  const { db, table } = await episodicMemory.initializeDB();
  
  const results = await episodicMemory.searchMemory(
    table,
    query,
    8,      // limit
    0.7     // minScore
  );
  
  return results.results;  // Array of matches
}

// Usage
const results = await searchMemory("Shawn investment preferences");
console.log(results[0].text);  // Top match
```

---

## Common Usage Patterns

### 1. Before Responding to Complex Queries

```javascript
// Search relevant memory context
const context = await searchMemory("florist campaign valentine");

// Use top results to inform response
const relevantInfo = context.slice(0, 3).map(r => r.text).join('\n\n');

// Generate response with context
const response = generateResponseWithContext(query, relevantInfo);
```

### 2. Pattern Detection

```javascript
// Find all instances of a pattern
const patterns = await searchMemory("pattern detection confidence");

// Analyze across time
const byDate = patterns.sort((a, b) => a.date.localeCompare(b.date));
```

### 3. Knowledge Retrieval for RAG

```javascript
// Retrieve relevant knowledge
const knowledge = await searchMemory(userQuery);

// Augment LLM prompt with retrieved context
const augmentedPrompt = `
Context from memory:
${knowledge.map(k => k.text).join('\n\n')}

User question: ${userQuery}
`;
```

---

## Maintenance

### Daily (Automatic via HEARTBEAT)
- Index new daily logs

### Weekly
- Run stats to monitor growth
- Check query performance

### Monthly
- Review old memories for archival
- Consider full re-index if major reorganization

---

## Troubleshooting

### Issue: "Error generating embedding: 401"
**Fix:** API key not set or invalid
```bash
echo $env:OPENAI_API_KEY  # Check if set
# Re-configure with valid key
```

### Issue: "Cannot find module"
**Fix:** Dependencies not installed
```bash
cd skills/episodic-memory
npm install --legacy-peer-deps
```

### Issue: Slow indexing (>10 minutes)
**Fix:** Large memory files or slow network
- Check file sizes: `ls -lh memory/*.md`
- Test network: `curl https://api.openai.com`
- Consider indexing files individually

### Issue: No search results
**Fix:** Index not created or query too specific
```bash
node index.js stats  # Verify chunks indexed
node index.js search "TARS"  # Try broad query
```

---

## Performance Expectations

| Operation | Time | Notes |
|-----------|------|-------|
| Init DB | <100ms | Very fast |
| Index single file | 5-15s | Depends on size |
| Full index (30 days) | 2-5min | One-time |
| Search query | <1s | After init |
| Stats query | <50ms | Very fast |

---

## Next Steps After Integration

1. **Use for RAG (Task #10)**
   - Retrieve context before LLM calls
   - Augment prompts with relevant memory

2. **Continuous Learning (Task #8)**
   - Detect patterns in memory
   - Learn from past interactions
   - Improve responses over time

3. **Proactive Intelligence**
   - Search memory for proactive suggestions
   - Anticipate needs based on history

---

## Summary

**What you get:**
- ⚡ Fast semantic search (<1s)
- 🎯 Relevant context retrieval
- 💾 Persistent memory across restarts
- 📊 Rich metadata for analysis
- 🔍 Better than simple keyword search

**Integration effort:**
- Setup: 10 minutes
- Daily maintenance: <1 minute (automated)
- Query usage: Single function call

**ROI:**
- Enables advanced AI features (RAG, learning)
- Better context-aware responses
- Faster access to historical knowledge

---

**Ready to deploy!** Follow steps 1-4 above to go live in 10 minutes.
