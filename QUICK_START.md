# TARS Voice Chat - Quick Start Guide
**For Immediate Deployment (30-45 minutes)**

## 🚀 Ultra-Fast Deployment

### Step 1: Prepare Code (2 minutes)

```bash
# Ensure both directories are ready
ls frontend/src/
ls backend/src/

# Verify package files exist
ls frontend/package.json
ls backend/package.json
```

### Step 2: Deploy Backend to Railway (10 minutes)

```bash
# 1. Go to https://railway.app
# 2. Click "New Project" → "Create a Project"
# 3. Select "Deploy from GitHub"
# 4. Connect GitHub account
# 5. Select backend directory
# 6. Railway auto-detects Node.js and builds

# OR use Railway CLI:
npm install -g @railway/cli
railway login
cd backend
railway init
railway variable set ELEVENLABS_API_KEY=sk_xxx
railway variable set TARS_VOICE_ID=voice_id_here
railway variable set CORS_ORIGIN=https://tars-chat.vercel.app
railway up

# Get your Railway URL (example): https://tars-api-prod.railway.app
```

**Expected Result:** Backend running at `https://your-railway-url.railway.app`

### Step 3: Deploy Frontend to Vercel (10 minutes)

```bash
# 1. Go to https://vercel.com/new
# 2. Click "Create a new project"
# 3. Import frontend repository from GitHub
# 4. Framework: Vite
# 5. Set environment variables:
#    - VITE_API_URL = https://your-railway-url.railway.app/api
# 6. Click Deploy

# OR use Vercel CLI:
npm install -g vercel
cd frontend
vercel login
vercel env add VITE_API_URL
# Enter: https://your-railway-url.railway.app/api
vercel deploy --prod

# Get your Vercel URL (example): https://tars-chat.vercel.app
```

**Expected Result:** Frontend running at `https://your-tars-chat.vercel.app`

### Step 4: Configure Voice (5 minutes)

**Option A: Quick Setup (Pre-built Voice)**
```bash
# 1. Go to https://elevenlabs.io/app/voices
# 2. Find a deep male voice (e.g., "Joshua", "Daniel")
# 3. Copy the voice ID
# 4. In Railway dashboard: variable set TARS_VOICE_ID=<voice_id>
```

**Option B: TARS Voice Clone (24 hours)**
```bash
# 1. Go to https://elevenlabs.io/app/voice-lab
# 2. Click "Create a voice"
# 3. Select "Professional Voice Cloning"
# 4. Upload TARS audio samples (15-30 min of dialogue)
# 5. Wait 24 hours for training
# 6. Copy trained voice ID
# 7. In Railway dashboard: variable set TARS_VOICE_ID=<trained_id>
```

### Step 5: Test Live (5 minutes)

```bash
# Test 1: Visit frontend
open https://tars-chat.vercel.app

# Test 2: Send a message
# Expected: Message appears, TARS responds

# Test 3: Click microphone (optional)
# Expected: Browser asks for microphone permission

# Test 4: Listen for voice response (optional)
# Expected: Hear TARS voice reply (if ElevenLabs configured)
```

---

## ✅ Verification Checklist

- [ ] Frontend builds without errors
- [ ] Backend starts and health endpoint responds
- [ ] Can visit Vercel URL in browser
- [ ] Can type and send messages
- [ ] TARS responds with messages
- [ ] Conversations persist on refresh
- [ ] Dark mode toggle works
- [ ] (Optional) Microphone works for voice input
- [ ] (Optional) Audio plays for voice response

---

## 🔧 Environment Variables Needed

### Railway Backend (.env)
```
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-tars-chat.vercel.app
ELEVENLABS_API_KEY=sk_xxxxx
TARS_VOICE_ID=voice_id_here
DB_PATH=tars.db
```

### Vercel Frontend
```
VITE_API_URL=https://your-tars-api.railway.app/api
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot connect to API" | Check VITE_API_URL in Vercel env vars |
| "CORS error" | Update CORS_ORIGIN in Railway to match Vercel URL |
| "No voice response" | Verify ELEVENLABS_API_KEY is set in Railway |
| "Microphone not working" | Check browser permissions, only works in Chrome/Safari/Edge |
| "Build failed on Vercel" | Run `npm run build` locally to debug |
| "Build failed on Railway" | Check Railway logs: `railway logs` |

---

## 📊 Expected Costs

| Service | Cost | Notes |
|---------|------|-------|
| Vercel | FREE | Frontend hosting included |
| Railway | $5/mo | Basic backend + database |
| ElevenLabs | $10-50/mo | Voice synthesis (optional, can mock responses first) |
| **Total** | ~$5-50/mo | Very affordable |

---

## 🎯 Deployment Timeline

| Step | Time | Status |
|------|------|--------|
| 1. Prepare code | 2 min | ✅ Quick |
| 2. Deploy backend | 10 min | ✅ Fast |
| 3. Deploy frontend | 10 min | ✅ Fast |
| 4. Setup voice | 5 min | ✅ Quick |
| 5. Test | 5 min | ✅ Quick |
| **Total** | **32 min** | **✅ Under 1 hour** |

---

## 📱 What You Get

After deployment:

✅ **Live Website**
- Modern chat interface
- Dark/light mode
- Mobile responsive
- Conversation history
- Professional styling

✅ **Voice Features** (optional)
- Microphone button for voice input
- Real-time transcription display
- TARS voice responses
- Play/pause controls

✅ **Scalability**
- Handles 1000+ concurrent users
- Auto-scaling on Vercel
- Persistent database on Railway
- No maintenance needed

---

## 🔗 Live Deployment URLs (After Deploy)

Replace with your actual URLs:

```
Frontend: https://tars-chat.vercel.app
Backend:  https://tars-api.railway.app
API:      https://tars-api.railway.app/api
Health:   https://tars-api.railway.app/health
```

---

## 📞 Support

**Deployment Issues?**
- Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
- ElevenLabs docs: https://elevenlabs.io/docs

**Code Issues?**
- Check logs on Vercel dashboard
- Check logs with: `railway logs`
- Local testing: `npm run dev` in both directories

---

## 🎉 Success!

Once you see:
1. ✅ Vercel deployment "Ready"
2. ✅ Railway deployment green
3. ✅ Frontend loads at Vercel URL
4. ✅ Can send messages
5. ✅ Receive TARS responses

**You've successfully deployed the TARS voice chat website! 🚀**

---

## 🔄 Next Steps (Optional)

- Integrate with OpenClaw main session (see INTEGRATION_NOTES.md)
- Train TARS voice clone if using pre-built for now
- Set up monitoring & alerts
- Add user authentication
- Custom domain (instead of vercel.app)
- CDN configuration

---

**Estimated Total Deployment Time: 30-45 minutes**  
**No technical expertise required beyond following these steps**

Ready? Let's deploy! 🚀
