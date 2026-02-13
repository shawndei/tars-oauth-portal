# Voice Calling System - TARS

**Status:** ✅ **Code Complete** - Ready to deploy with API key

**Implementation:** Bland AI conversational voice API  
**Cost:** $0.09/minute  
**Latency:** <1 second response time  
**Quality:** Human-like, handles interruptions naturally

---

## Why Bland AI?

After researching all bleeding-edge options (OpenAI Realtime + SIP, Vapi, Retell, etc.), **Bland AI wins** for:

1. **Simplest API** - 10 lines of code to make a call
2. **Production-ready** - Used by Samsara, Snapchat, Gallup
3. **Best price/performance** - $0.09/min flat rate
4. **No infrastructure** - No WebSocket servers, no SIP trunks, no complexity
5. **Natural conversations** - Handles interruptions, natural flow

---

## Quick Start

### Step 1: Get API Key (5 minutes)

1. Go to https://www.bland.ai/
2. Click "Talk to Sales" or sign up
3. Get your API key from dashboard
4. Set environment variable:
   ```bash
   export BLAND_AI_API_KEY="your_api_key_here"
   ```

### Step 2: Test Call to Shawn

```bash
cd voice-calling
BLAND_AI_API_KEY=your_key node bland-ai-caller.js
```

**OR:**

```bash
node bland-ai-caller.js YOUR_API_KEY
```

---

## What Happens When You Run It

1. **Instant call** to +17204873360 (Shawn)
2. **TARS introduces himself** as your AI assistant
3. **Explains** the voice calling system is live
4. **Natural conversation** - you can interrupt, ask questions
5. **Call recording** saved automatically

---

## Features

- ✅ **Outbound calls** to any number worldwide
- ✅ **Natural conversation** with interruption handling
- ✅ **Custom voice** (using 'maya' - clear, natural female voice)
- ✅ **Task-based prompts** - tell TARS what to accomplish
- ✅ **Call recording** - auto-saved for review
- ✅ **Real-time status** - track call progress
- ✅ **Webhook support** - get notified of call events

---

## Use Cases Ready

### 1. Florist Campaign
Call all 12 florists autonomously:
- Ask about 2 dozen long-stem pink roses
- Confirm Campestre delivery availability  
- Get pricing
- Record responses automatically

### 2. Information Gathering
Any phone-based research task.

### 3. Appointment Setting
Call to schedule meetings/appointments.

### 4. Customer Support
Handle inbound support calls.

---

## API Documentation

### Make a Call

```javascript
const BlandAICaller = require('./bland-ai-caller.js');
const caller = new BlandAICaller('YOUR_API_KEY');

const result = await caller.makeCall({
  phoneNumber: '+17204873360',
  task: 'Your instructions for the AI...',
  voice: 'maya',
  waitForGreeting: true,
  maxDuration: 300 // seconds
});

console.log('Call ID:', result.call_id);
```

### Get Call Status

```javascript
const status = await caller.getCallStatus(callId);
console.log('Status:', status.status);
console.log('Duration:', status.duration);
console.log('Recording URL:', status.recording_url);
```

---

## Pricing

- **Per-minute:** $0.09/min
- **No setup fees**
- **No monthly minimums**
- **Pay only for call duration**

**Example:**
- 3-minute call = $0.27
- 10-minute call = $0.90
- 100 calls x 2 min avg = $18

---

## Next Steps

**TO ACTIVATE:**

1. Sign up at https://www.bland.ai/
2. Get your API key
3. Run: `BLAND_AI_API_KEY=your_key node bland-ai-caller.js`
4. TARS will call you in ~3 seconds

**Once verified working:**

Ready to deploy for florist campaign or any other calling tasks.

---

## Technical Details

**Stack:**
- Pure Node.js (no dependencies)
- HTTPS API calls
- E.164 phone format
- Real-time WebSocket for audio streaming (handled by Bland)

**Voice Model:**
- Bland's enhanced conversational AI
- Sub-1-second latency
- Natural prosody and timing
- Interruption handling

**Security:**
- API key authentication
- Encrypted audio streams
- Recording storage (optional)
- Webhook verification (optional)

---

**Ready to launch. Just need your Bland AI API key.**
