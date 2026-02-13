# TARS Voice Conversation Website - Integration Notes
**Date:** 2026-02-13  
**Status:** Ready for Production Integration  

## Overview

This document explains how to integrate the TARS voice conversation website with the main TARS system and OpenClaw session.

---

## Architecture Integration Options

### Option 1: Standalone Deployment (Current - Recommended for MVP)

**Setup:** Independent chat system
- Frontend: Vercel (isolated)
- Backend: Railway (isolated)
- Database: SQLite on Railway
- Voice: ElevenLabs API
- LLM: Mock responses (v1.0) or OpenAI API (future)

**Pros:**
- ✅ Quick to deploy (current timeline)
- ✅ No dependencies on main TARS system
- ✅ Easy to test independently
- ✅ Scalable separately

**Cons:**
- ⚠️ Doesn't use main TARS conversation logic
- ⚠️ Separate conversation history
- ⚠️ Duplicate user management

**URL:** `https://tars-chat.vercel.app`

---

### Option 2: OpenClaw Session Integration (Future Enhancement)

**Setup:** Connect to OpenClaw session API
```
User Input
    ↓
TARS Website (Voice + UI)
    ↓
OpenClaw Session API
    ↓
Main TARS System + LLM
    ↓
Response → Voice → User
```

**Implementation Steps:**

#### 2.1 Modify Backend to Use OpenClaw Session

File: `backend/src/services/openclaw.ts` (create new)

```typescript
import axios from 'axios'

const OPENCLAW_SESSION_TOKEN = process.env.OPENCLAW_SESSION_TOKEN
const OPENCLAW_API_URL = process.env.OPENCLAW_API_URL || 'http://localhost:3000'

/**
 * Send message through OpenClaw session
 */
export async function sendThroughOpenClaw(message: string): Promise<string> {
  try {
    const response = await axios.post(
      `${OPENCLAW_API_URL}/api/message`,
      {
        text: message,
        conversationId: 'tars-voice-chat'
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENCLAW_SESSION_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    )

    // Extract response text from OpenClaw response
    return response.data.response || response.data.text
  } catch (error) {
    console.error('OpenClaw integration error:', error)
    throw error
  }
}

/**
 * Get conversation context from main TARS session
 */
export async function getTARSContext(): Promise<any> {
  try {
    const response = await axios.get(
      `${OPENCLAW_API_URL}/api/context`,
      {
        headers: {
          'Authorization': `Bearer ${OPENCLAW_SESSION_TOKEN}`
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('Failed to get TARS context:', error)
    return null
  }
}
```

#### 2.2 Update Chat Endpoint to Use OpenClaw

File: `backend/src/server.ts` modification:

```typescript
import { sendThroughOpenClaw } from './services/openclaw.ts'

// POST /api/chat - updated
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { conversationId, message, tone } = req.body
    
    // Store user message
    const userMessageId = uuidv4()
    addMessage(conversationId, userMessageId, 'user', message)

    // Use OpenClaw if available, else fallback to mock
    let responseText: string
    if (process.env.OPENCLAW_SESSION_TOKEN) {
      responseText = await sendThroughOpenClaw(message)
    } else {
      responseText = await generateResponse(message, tone || 'default')
    }
    
    // Rest of implementation...
  } catch (error) {
    // Error handling...
  }
})
```

#### 2.3 Environment Variables for OpenClaw

Add to `backend/.env`:
```
OPENCLAW_SESSION_TOKEN=<token_from_main_session>
OPENCLAW_API_URL=<main_tars_api_url>
```

**Deployment:** Same as Option 1, just add environment variables

---

### Option 3: Embedded Widget (Long-term)

Embed TARS chat as a widget in existing websites:

```html
<!-- On external website -->
<script>
  window.TARS_CHAT = {
    apiUrl: 'https://tars-api.railway.app',
    containerId: 'tars-widget',
    theme: 'dark'
  }
</script>
<script src="https://tars-chat.vercel.app/widget.js"></script>
<div id="tars-widget"></div>
```

---

## Integration Points

### 1. Conversation Context

**Current:** Each conversation is isolated in SQLite database

**Integration Option:** Sync with OpenClaw session

```typescript
// Get conversation history from OpenClaw
const contextPath = '/api/conversations/:id'
// Maps to OpenClaw: GET /api/context/conversations/:id

// Store locally for performance
// Sync periodically (every 5 minutes or on save)
```

### 2. User Authentication

**Current:** Anonymous (no user tracking)

**Future Integration:**

```typescript
// Add user ID to conversation
interface Conversation {
  id: string
  userId?: string  // Future
  title: string
  created: string
  messages: Message[]
}

// Store user context from OpenClaw
const getCurrentUser = async () => {
  const context = await getTARSContext()
  return context.user
}
```

### 3. TARS Personality & Voice

**Current:** Mock responses with pre-defined TARS voice

**Integration:**

```typescript
// Use OpenClaw to get TARS personality settings
const tarsPersonality = await getTARSContext()

// Apply personality to responses
const systemPrompt = `
  ${tarsPersonality.systemPrompt}
  Additional context: You are speaking through a voice interface.
  Keep responses concise (1-2 sentences).
`

// Use TARS voice ID from main system
const voiceId = tarsPersonality.voiceId || process.env.TARS_VOICE_ID
```

### 4. Conversation Export

**Integration with main TARS:**

```typescript
// Export conversation to OpenClaw session
app.post('/api/conversations/:id/export', async (req: Request, res: Response) => {
  const conversation = getConversationById(req.params.id)
  
  // Send to OpenClaw
  await axios.post(
    `${OPENCLAW_API_URL}/api/conversations/import`,
    conversation,
    {
      headers: {
        'Authorization': `Bearer ${OPENCLAW_SESSION_TOKEN}`
      }
    }
  )
  
  res.json({ success: true })
})
```

---

## Message Flow Diagram

### Current (Standalone)
```
User Browser
    ↓
React UI (Vercel)
    ↓
Express Backend (Railway)
    ↓ (mock response)
    ↓ (ElevenLabs TTS)
    ↓ (SQLite storage)
SQLite Database
```

### Future (Integrated)
```
User Browser
    ↓
React UI (Vercel) ← Conversation sync
    ↓
Express Backend (Railway)
    ↓ (if token available)
    ↓
OpenClaw Session API
    ↓
Main TARS System
    ↓
LLM Response ← TARS personality/context
    ↓
ElevenLabs TTS (TARS voice)
    ↓
React UI (Vercel)
    ↓
User
```

---

## API Compatibility

### OpenClaw Session Message Format

Incoming:
```json
{
  "type": "message",
  "text": "User input here",
  "conversationId": "tars-voice-chat",
  "sessionId": "..."
}
```

Response:
```json
{
  "type": "response",
  "text": "TARS response here",
  "conversationId": "tars-voice-chat",
  "metadata": {
    "personality": "tars",
    "voice": "tars_voice_id",
    "streaming": false
  }
}
```

### Conversation Sync API

```typescript
// GET /api/conversations?sync=true
// Returns conversations with OpenClaw metadata

// POST /api/conversations/:id/sync
// Merges local and remote conversations

// DELETE /api/conversations/:id?sync=true
// Removes from both local and OpenClaw
```

---

## Database Migration Path

### Phase 1: Current (SQLite)
- ✅ Development & testing
- ✅ Easy deployment
- ✅ Sufficient for < 100k messages

### Phase 2: With OpenClaw (Hybrid)
- SQLite local cache
- OpenClaw as source of truth
- Periodic sync (5 min intervals)

### Phase 3: Production Scale (PostgreSQL)
- Migrate from SQLite to PostgreSQL
- Full sync with OpenClaw session
- Distributed conversation storage

**Migration Script:**
```bash
# Export SQLite to JSON
sqlite3 tars.db ".mode json" ".tables" > backup.json

# Import to PostgreSQL
psql -U postgres -d tars < schema.sql
python3 migrate.py < backup.json
```

---

## Testing OpenClaw Integration

### Unit Test: OpenClaw Connection
```typescript
describe('OpenClaw Integration', () => {
  it('should connect to OpenClaw session', async () => {
    const response = await sendThroughOpenClaw('test message')
    expect(response).toBeDefined()
    expect(response.length).toBeGreaterThan(0)
  })

  it('should fallback to mock if OpenClaw unavailable', async () => {
    process.env.OPENCLAW_SESSION_TOKEN = undefined
    const response = await generateResponse('test')
    expect(response).toBeDefined()
  })
})
```

### Integration Test: Full Flow
```bash
# 1. Set OpenClaw token
export OPENCLAW_SESSION_TOKEN=<token>

# 2. Start backend
cd backend && npm run dev

# 3. Test message flow
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test","message":"Hello"}'

# 4. Verify response came from OpenClaw
# (Check logs for "Using OpenClaw integration")
```

---

## OpenClaw Session Format (Example)

If TARS is an existing OpenClaw agent:

```yaml
# OpenClaw agent config
name: TARS
type: agent:main:tars
capabilities:
  - chat
  - voice
  - context

# Voice chat connects via:
channels:
  - whatsapp
  - telegram
  - tars-voice-website (new!)
```

---

## Deployment with OpenClaw Integration

### New Environment Variables

```bash
# .env on Railway
OPENCLAW_SESSION_TOKEN=agent:main:tars:...
OPENCLAW_API_URL=http://openclaw-gateway:3000
```

### Test Integration Path

```
1. Main TARS session running
2. OpenClaw gateway accessible
3. Backend can reach gateway
4. Frontend connects to backend
5. Messages flow through OpenClaw
6. Responses + voice returned
```

---

## Migration Timeline

### Week 1: Current State (MVP)
- ✅ Standalone voice chat website
- ✅ Mock TARS responses
- ✅ Deploy to Vercel/Railway
- ✅ Functional demo

### Week 2-3: Integration Phase
- Connect to OpenClaw session
- Use real TARS logic
- Sync conversations
- Test end-to-end

### Week 4+: Production Hardening
- Scale database
- Multi-user support
- Advanced features
- Full monitoring

---

## Rollback Plan

If OpenClaw integration fails:

1. **Environment Variable:** Remove `OPENCLAW_SESSION_TOKEN`
2. **Restart Backend:** `railway redeploy`
3. **Fallback:** Automatically uses mock responses
4. **No User Impact:** Website continues working

---

## Contact & Support

For OpenClaw integration issues:
- Check OpenClaw session logs
- Verify session token is valid
- Ensure gateway URL is accessible
- Test with `curl` to gateway `/health` endpoint

---

## Summary

**Current Deployment (Option 1):**
- ✅ Ready now
- ✅ Fully functional
- ✅ Easy to test
- ⏳ Can integrate later

**Future Integration (Option 2):**
- 🔜 Planned for v1.1
- 🔜 Requires OpenClaw token
- 🔜 Full TARS system integration
- 🔜 Conversation sync

**Recommendation:** Deploy Option 1 first (MVP), integrate with OpenClaw when main TARS session is ready.
