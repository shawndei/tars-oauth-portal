# TARS Voice Conversation Website - Research Report
**Date:** 2026-02-13  
**Status:** Complete  

## 1. ChatGPT & Grok UI/UX Analysis

### ChatGPT Features (2025+)
- **Voice Integration**: Voice mode now integrated directly into chat (no separate interface)
- **Model Selection**: Users can choose between "Auto", "Fast", and "Thinking" modes
- **Message Streaming**: Real-time streaming responses visible as they generate
- **Conversation History**: Persistent sidebar with conversation list and search
- **Message Actions**: Edit, regenerate, copy messages
- **Message Formatting**: Markdown, code blocks with syntax highlighting, LaTeX
- **Dark/Light Mode**: Full theme toggle support
- **Rich Media**: Images, maps, and shared visuals inline with conversations
- **Mobile Responsive**: Full mobile support with touch-optimized UI

### Grok Features
- **Voice Mode**: Integrated voice chat with speaker icon in upper right
- **Response Styles**: Customizable voice response personalities
- **Dark Theme**: Dark UI by default with light mode option
- **Mobile First**: Primary interface on mobile with swipe navigation
- **Real-time Responses**: Similar streaming to ChatGPT

## 2. Voice Synthesis Research - TARS Voice Clone

### Solution: ElevenLabs Professional Voice Cloning

**Best Option for TARS:**
- **Method**: Professional Voice Cloning from TARS voice actor (Matthew McConaughey's dialogue partner)
- **Quality**: Near-perfect clone of the original voice
- **Latency**: ~300-500ms for typical text-to-speech responses
- **Cost**: ElevenLabs starter plan ~$10-50/month depending on usage

**Implementation Evidence:**
1. "Built a functional TARS replica from Interstellar using ElevenLabs" - Victor (X, June 2025)
   - Successfully cloned voice actor voice
   - Integrated with conversational AI
   - Added TARS personality and sarcasm

2. Starfield TARS voice mod using ElevenLabs API
   - Created personal voice clone model
   - Batch processed dialogue via API
   - Full voice replacement achieved

3. Multiple Reddit/GitHub projects confirm approach works well

**Voice Options:**
1. **Professional Voice Cloning** (Recommended)
   - Train from voice actor clips (5-20 minutes of high-quality audio)
   - Results: Near-perfect clone, includes all intricacies and personality
   - Time: Training takes ~24 hours
   - Cost: Included in API subscription

2. **Pre-built Voice Library**
   - Fallback: "Joshua" or similar deep male voices available in ElevenLabs library
   - Quality: Professional but not exact TARS clone

3. **Instant Voice Cloning**
   - Alternative: Quicker cloning (minutes) but lower quality
   - Use case: Testing or if professional cloning unavailable

### Other Voice Providers (Considered & Rejected)
- **Azure Speech Services**: Good quality but less suitable for character cloning
- **Google Cloud TTS**: Limited voice personality customization
- **Native Web Speech API**: Robotic, doesn't suit TARS character

## 3. Speech Recognition Strategy

### Recommended: Web Speech API + Fallback to Whisper

**Primary: Web Speech API**
- Browser-native, no external dependencies
- Real-time transcription as user speaks
- Works offline (with browser support)
- Free, no API keys needed
- Voice activity detection built-in

**Fallback: OpenAI Whisper API**
- Better accuracy for complex/accented speech
- Supports 99+ languages
- Costs ~$0.02 per minute
- Use if Web Speech fails or for critical transcriptions

## 4. Architecture Overview

**Technology Stack:**
- **Frontend**: React 18 + TypeScript (fastest to deploy)
- **Backend**: Express.js + Node.js (simple, proven)
- **Voice I/O**: Web Audio API + ElevenLabs REST API
- **Storage**: SQLite (simple, zero-config) with in-memory session cache
- **Deployment**: Vercel (frontend) + Railway (backend)
- **TTS**: ElevenLabs API with TARS voice
- **STT**: Web Speech API (browser-native)

**Key Components:**
1. Message list with streaming support (React hooks)
2. Voice input button with live transcription display
3. Voice output with playback controls
4. Conversation sidebar with history
5. Settings panel (theme, voice, model selection)

## 5. Deployment Plan

- **Frontend**: Vercel (git-connected, zero-config)
- **Backend**: Railway (Node.js ready, PostgreSQL/SQLite support)
- **Environment Variables**: ElevenLabs API key, OpenClaw session token
- **CORS**: Backend allows requests from Vercel domain
- **Live Domain**: `[name].railway.app` (backend) + `[name].vercel.app` (frontend)

## 6. Performance Targets

- Message send → response: < 1000ms
- Voice transcription latency: < 500ms (Web Speech API native)
- Voice playback: Starts within 500ms of TTS response
- Page load: < 2s on 4G
- Mobile rendering: 60 FPS

## Summary

**TARS voice cloning via ElevenLabs Professional is proven, battle-tested, and delivers excellent results.** Multiple independent projects confirm this approach works. Voice integration combines Web Speech API (STT) with ElevenLabs (TTS) for a seamless conversational experience.

**Ready to build:** Full-featured chat interface inspired by ChatGPT, with integrated voice I/O and TARS personality.
