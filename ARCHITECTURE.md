# TARS Voice Conversation Website - Architecture Design
**Date:** 2026-02-13  
**Timeline:** 4 hours aggressive build  

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER (Vercel)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React App: TarsChat                                 │   │
│  │  ├── Message List (streaming)                        │   │
│  │  ├── Voice Input (Web Speech API)                    │   │
│  │  ├── Voice Output (ElevenLabs TTS)                   │   │
│  │  ├── Conversation Sidebar                            │   │
│  │  └── Settings Panel                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↕ (HTTP/WebSocket)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND API (Railway)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express.js Server (Node.js)                         │   │
│  │  ├── POST /chat (message handler)                    │   │
│  │  ├── GET /conversations (list)                       │   │
│  │  ├── POST /conversations (create)                    │   │
│  │  ├── GET /conversations/:id (get messages)           │   │
│  │  ├── POST /voice-synthesis (text → audio)            │   │
│  │  └── WebSocket /voice-stream (real-time)             │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↕                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SQLite Database (conversations, messages)            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌─────────────────┐  ┌─────────────┐  ┌───────────────┐
    │ ElevenLabs API  │  │  OpenClaw   │  │ OpenAI API    │
    │ (Voice Synth)   │  │ (Messages)  │  │ (Chat Logic)  │
    └─────────────────┘  └─────────────┘  └───────────────┘
```

## 2. Frontend Components (React)

### Layout Structure
```
├── App.tsx (main container)
│   ├── Header (logo, settings button)
│   ├── Sidebar (conversations list)
│   │   ├── Conversation List
│   │   ├── "New Chat" button
│   │   └── Settings toggle
│   ├── MainChat (current conversation)
│   │   ├── MessageList (scrollable, streaming)
│   │   ├── MessageInput (text + voice)
│   │   └── VoiceTranscription (live display)
│   └── SettingsPanel (modal, dark/light, voice)
```

### Component Responsibilities

**App.tsx**
- State management: current conversation, messages, theme
- API communication
- Voice context setup

**MessageList.tsx**
- Display messages with streaming support
- Avatar + timestamp for each message
- Markdown rendering for code blocks
- Audio playback for assistant messages

**MessageInput.tsx**
- Text input field
- Voice recording button (mic icon)
- Real-time transcription display
- Send button

**Sidebar.tsx**
- List of recent conversations
- New conversation button
- Settings toggle
- Dark/light mode switch

**VoicePlayer.tsx**
- Audio playback with play/pause/speed controls
- Queue management for multiple audio segments
- Integration with ElevenLabs audio response

### State Management
```javascript
{
  conversations: [
    {
      id: "conv_123",
      title: "Getting Started with TARS",
      created: "2026-02-13T13:00:00Z",
      messages: [/* message array */]
    }
  ],
  currentConversation: "conv_123",
  messages: [
    {
      id: "msg_456",
      role: "user" | "assistant",
      content: "What is your humor setting?",
      timestamp: "2026-02-13T13:05:00Z",
      audioUrl?: "https://..."
    }
  ],
  theme: "dark" | "light",
  voiceSettings: {
    enabled: true,
    autoPlay: true,
    speed: 1.0,
    selectedVoice: "tars_clone"
  },
  isRecording: false,
  transcription: "Live text as user speaks..."
}
```

## 3. Backend API Endpoints

### Authentication
```
Header: Authorization: Bearer {token}
```

### Endpoints

**POST /chat**
```
Request: { conversationId, message, tone: "default|humorous|professional" }
Response: { id, content, audioUrl, streaming }
(Stream chunked text-to-speech synthesis)
```

**POST /conversations**
```
Request: { title?: string }
Response: { id, title, created }
```

**GET /conversations**
```
Response: [ { id, title, created, preview }, ... ]
```

**GET /conversations/:id**
```
Response: { id, title, messages: [ message objects ] }
```

**POST /voice-synthesis**
```
Request: { text, voice: "tars_clone", speed: 1.0 }
Response: { audioUrl: "data:audio/mp3;base64,...", duration }
```

**WebSocket /voice-stream**
```
Client: { type: "start_recording" }
Server: { type: "transcription", text: "live..." }
Client: { type: "stop_recording" }
Server: { type: "final", text: "complete transcription" }
```

## 4. Database Schema (SQLite)

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  created TIMESTAMP,
  updated TIMESTAMP
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  role TEXT ("user" | "assistant"),
  content TEXT,
  audio_url TEXT,
  timestamp TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE TABLE voice_settings (
  user_id TEXT,
  voice_id TEXT,
  speed REAL,
  auto_play BOOLEAN,
  theme TEXT ("dark" | "light"),
  updated TIMESTAMP
);
```

## 5. Voice Integration Flow

### Text-to-Speech (User → TARS)
1. User types message
2. Click send
3. Backend receives message
4. Backend sends to LLM (OpenAI/OpenClaw API)
5. LLM generates response
6. Backend calls ElevenLabs API with response text + TARS voice ID
7. ElevenLabs returns audio URL (MP3/WAV)
8. Frontend receives audio URL
9. Audio automatically plays (or user clicks play button)

### Speech-to-Text (TARS → User)
1. User clicks microphone button
2. Web Speech API starts recording
3. Browser captures audio stream
4. Transcription appears in real-time under input
5. User clicks stop or 1.5s of silence detected
6. Final transcription sent to backend
7. Backend processes as normal message

## 6. Deployment Configuration

### Frontend (Vercel)
```yaml
Framework: Next.js / React
Build: npm run build
Install: npm install
Environment Variables:
  - REACT_APP_API_URL=https://tars-api.railway.app
  - REACT_APP_ELEVENLABS_KEY=${ELEVENLABS_API_KEY}
```

### Backend (Railway)
```yaml
Runtime: Node.js 20
Build: npm install && npm run build
Start: npm start
Environment Variables:
  - NODE_ENV=production
  - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
  - TARS_VOICE_ID=${TARS_VOICE_ID}
  - OPENAI_API_KEY=${OPENAI_API_KEY}
  - DATABASE_URL=file:./tars.db
  - CORS_ORIGIN=https://tars-chat.vercel.app
```

## 7. Integration with TARS Main Session

**Two Options:**

### Option A: OpenClaw Messaging (Recommended)
- Backend connects to OpenClaw session via WebSocket
- Messages routed through OpenClaw conversation API
- Uses existing TARS context and personality
- Backend relays user messages to OpenClaw
- Receives responses with formatting intact
- Integrates voice on top of existing TARS logic

### Option B: Standalone LLM Integration
- Backend uses OpenAI GPT API directly
- Implement TARS personality via system prompt
- Standalone operation (no OpenClaw dependency)
- Simpler setup, less coupled architecture

**Recommended:** Option A for true TARS integration

## 8. Voice Synthesis Details

### ElevenLabs Integration
```javascript
// Example API call
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Headers: {
  xi-api-key: process.env.ELEVENLABS_API_KEY
}
Body: {
  text: "I'm a bulk lander exploring a strange planet",
  model_id: "eleven_monolingual_v1",
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75
  }
}
Response: Binary audio stream (MP3)
```

### TARS Voice ID Setup
1. Record voice samples from Interstellar movie clips or voice actor
2. Upload to ElevenLabs professional voice cloning
3. Wait 24 hours for model training
4. Receive TARS voice ID (e.g., "tars_clone_xyz123")
5. Store in environment variable: `TARS_VOICE_ID`
6. Use in all TTS API calls

## 9. Fallback Strategy

- **No Microphone?** Show text-only mode, disable voice button
- **ElevenLabs API Down?** Use Web Speech API native synthesis (robotic fallback)
- **Network Issues?** Queue messages locally, retry on reconnect
- **Browser doesn't support Web Speech?** Show hint to use Chrome/Edge
- **Missing voice ID?** Fall back to "Rachel" or generic voice

## 10. Performance Optimization

1. **Message streaming**: Implement chunked HTTP responses
2. **Audio lazy loading**: Only download TTS audio when user clicks play
3. **Conversation caching**: Keep recent 10 conversations in memory
4. **Conversation pagination**: Load 50 messages at a time
5. **Code splitting**: Lazy load settings panel
6. **Image optimization**: Compress any shared media
7. **Service Worker**: Cache static assets + conversations

## Timeline Breakdown

1. **Research** (45 min): ✓ Complete
2. **Architecture & Design** (30 min): ✓ Complete (this doc)
3. **Frontend Build** (60 min): React components, styling, voice UI
4. **Backend Build** (45 min): API endpoints, database, ElevenLabs integration
5. **Voice Integration** (30 min): Web Speech API + ElevenLabs wiring
6. **Deployment** (30 min): Vercel + Railway setup, environment variables
7. **Testing** (20 min): Conversation flow, voice, persistence, mobile

**Total: 4 hours aggressive target**

---

**Status:** Ready for implementation phase. Architecture is solid, dependencies are minimal, deployment is straightforward. Proceed with frontend build.
