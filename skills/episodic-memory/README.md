# Episodic Memory System - Setup Guide

## Quick Start

**No manual configuration needed!** The system automatically uses the OpenAI API key from the gateway.

1. **Index your memory:**
   ```bash
   cd skills/episodic-memory
   node index.js index
   ```

2. **Search:**
   ```bash
   cd skills/episodic-memory
   node index.js search "your query"
   ```

## Automatic Configuration

The system is pre-configured to work automatically:

- **API Key:** Automatically loaded from `workspace/.env` (sourced from gateway's `auth/credentials.json`)
- **Embeddings:** Uses OpenAI `text-embedding-3-small` model (configured in gateway)
- **Database:** LanceDB stored in `workspace/.episodic-memory-db`
- **Sources:** Indexes `MEMORY.md` and all daily logs in `memory/YYYY-MM-DD.md`

### How It Works

1. Gateway stores the OpenAI API key in `~/.openclaw/auth/credentials.json`
2. Configuration script extracts it to `workspace/.env` as `OPENAI_API_KEY`
3. `episodic-memory/index.js` loads environment variables using `dotenv`
4. OpenAI client automatically picks up the API key

**No manual setup required!**

## What This System Does

- **Fast semantic search** over all TARS memory files
- **Local vector database** (LanceDB) for <1s queries
- **Persistent storage** - survives restarts
- **Rich metadata** - track source, date, context
- **Production-ready** - error handling, batch processing

## Files Created

- `index.js` - Core implementation (11KB)
- `SKILL.md` - Complete documentation (17KB)
- `test.js` - Comprehensive test suite (16KB)
- `README.md` - This file
- `package.json` - Dependencies

## Documentation

See `SKILL.md` for full documentation including:
- Architecture
- API reference
- Performance benchmarks
- Troubleshooting
- Integration guides

## Testing

Run the test suite:
```bash
node skills/episodic-memory/test.js
```

Ensure `OPENAI_API_KEY` is set before running tests.

## Configuration Details

### Environment Variables

The system uses the following environment variables from `workspace/.env`:

```env
# OpenAI API Key (for embeddings)
OPENAI_API_KEY=sk-proj-...

# LanceDB API Key (optional, for cloud features)
LANCEDB_API_KEY=sk_...
```

### File Locations

- **Config:** `C:\Users\DEI\.openclaw\workspace\.env`
- **Database:** `C:\Users\DEI\.openclaw\workspace\.episodic-memory-db\`
- **Memory Files:** `C:\Users\DEI\.openclaw\workspace\memory\`
- **Gateway Auth:** `C:\Users\DEI\.openclaw\auth\credentials.json`

## Troubleshooting

### "Missing API Key" Error

If you see an API key error:
1. Check that `workspace/.env` contains `OPENAI_API_KEY`
2. Verify the gateway has the key: `type C:\Users\DEI\.openclaw\auth\credentials.json`
3. Re-run configuration if needed

### "No Results" from Search

If search returns 0 results:
1. Verify data is indexed: `node index.js stats`
2. Re-index if needed: `node index.js index --force`
3. Try broader search terms

### Dependency Conflicts

If you see `apache-arrow` version conflicts:
```bash
npm install --legacy-peer-deps
```

## Advanced Usage

### Re-indexing

To clear and rebuild the index:
```bash
node index.js clear
node index.js index
```

Or use the force flag:
```bash
node index.js index --force
```

### Database Statistics

View index statistics:
```bash
node index.js stats
```

## Next Steps

1. Run initial index: `node index.js index`
2. Test search: `node index.js search "optimization"`
3. Review `SKILL.md` for advanced features
4. Integrate with gateway memory search (automatic on startup)

---

**Configuration Date:** 2026-02-13  
**Configured By:** openai-key-config subagent  
**Status:** ✅ Fully automated - no manual setup required  
**Gateway Integration:** Uses OpenAI key from gateway auth system
