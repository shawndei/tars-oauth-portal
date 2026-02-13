# Voice Calling Setup - Quick Start

## What I Built

✅ **Complete voice calling system** using Bland AI  
✅ **Test script** that calls you (Shawn)  
✅ **Florist campaign script** that calls all 12 florists in Spanish  
✅ **Auto-recording & transcription**  
✅ **Results tracking** (JSON output)

---

## What I Need From You

### 1. Bland AI API Key (5 minutes)

**Option A: Free Trial (Fastest)**
1. Go to https://www.bland.ai/
2. Click "Sign Up" or "Try it Free"
3. Complete signup
4. Go to Dashboard → API Keys
5. Copy your API key

**Option B: Contact Sales**
1. Go to https://www.bland.ai/enterprise
2. Click "Talk to Sales"
3. Request trial access
4. Get API key from dashboard

---

## Deployment (Instant)

### Test Call to You

```bash
cd voice-calling
BLAND_AI_API_KEY=your_actual_key_here node bland-ai-caller.js
```

**Expected:** You'll receive a call in ~3 seconds from TARS.

### Florist Campaign

```bash
BLAND_AI_API_KEY=your_key node florist-caller.js call
```

**Expected:**
- 12 calls over ~2 minutes (10-second spacing)
- Each call gathers: availability, delivery, pricing
- Results saved to `florist-results.json`

**After calls finish (wait 5-10 min):**

```bash
BLAND_AI_API_KEY=your_key node florist-caller.js results
```

**Expected:**
- Fetches recordings + transcripts
- Updates `florist-results.json` with all details
- Ready for review

---

## What Happens When It Calls

**Call Flow:**
1. Dials florist
2. Waits for greeting
3. Says (Spanish): "Hola, buenos días. Necesito información sobre un pedido de flores..."
4. Asks 3 questions:
   - 2 dozen long-stem pink roses available?
   - Deliver to Campestre Feb 14?
   - Price?
5. Records their answers
6. Says thanks and hangs up

**Natural conversation:**
- Handles interruptions
- Asks clarifying questions
- Takes detailed notes

---

## Cost

**Estimated:**
- Test call to you: ~$0.27 (3 min)
- 12 florist calls: ~$3.60 (avg 2 min each @ $0.09/min)
- **Total campaign:** ~$4

---

## Files Created

```
voice-calling/
├── README.md              # Full documentation
├── SETUP.md              # This file
├── bland-ai-caller.js    # Core API integration
├── florist-caller.js     # Campaign automation
└── florist-results.json  # Output (created after calls)
```

---

## Once You Have API Key

**Just send it to me via WhatsApp and I'll:**

1. Call you instantly (test)
2. Launch florist campaign (if you want)
3. Report results with recordings/transcripts

**Or you can run it yourself:**

```bash
BLAND_AI_API_KEY=sk_... node bland-ai-caller.js
```

---

## Alternative: I Can Test With My Own Account

If you want me to demo it first before you sign up, I can:
1. Create a test account
2. Call you to demonstrate
3. Then you decide if you want your own

**Your call.** Ready to deploy either way.

---

**Status:** ⚡ **Code Complete - Need API Key to Launch**
