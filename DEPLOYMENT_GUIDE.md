# TARS Voice Conversation Website - Deployment Guide
**Date:** 2026-02-13  
**Target:** Vercel (frontend) + Railway (backend)  

## Prerequisites

1. **Accounts Required:**
   - Vercel account (free tier sufficient)
   - Railway account (free tier sufficient, ~$5 for persistent database)
   - ElevenLabs account with API key
   - GitHub account (for pushing code)

2. **Environment Variables Needed:**
   - `ELEVENLABS_API_KEY` - Get from https://elevenlabs.io/app/api-keys
   - `TARS_VOICE_ID` - Your trained TARS voice model ID or pre-built voice ID
   - `OPENAI_API_KEY` (optional) - For more sophisticated responses

## Step-by-Step Deployment

### Part 1: Backend Deployment (Railway)

#### 1.1 Create Railway Project
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init
```

#### 1.2 Configure Environment Variables
```bash
# Set variables in Railway dashboard or via CLI:
railway variable set ELEVENLABS_API_KEY=sk_xxx
railway variable set TARS_VOICE_ID=your_voice_id
railway variable set NODE_ENV=production
railway variable set CORS_ORIGIN=https://your-frontend.vercel.app
```

#### 1.3 Deploy Backend
```bash
# From backend directory
cd backend
railway up
```

**Note:** Railway will automatically:
- Detect Node.js project
- Run `npm install`
- Run `npm run build` (if build script exists)
- Run `npm start`
- Assign you a public URL like `https://tars-api-prod.railway.app`

#### 1.4 Verify Backend
```bash
# Test health endpoint
curl https://your-railway-url/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

### Part 2: Frontend Deployment (Vercel)

#### 2.1 Push Frontend to GitHub
```bash
# Initialize git in frontend directory
cd frontend
git init
git add .
git commit -m "Initial TARS frontend"
git remote add origin https://github.com/YOUR_USERNAME/tars-chat-frontend.git
git push -u origin main
```

#### 2.2 Create Vercel Project
1. Go to https://vercel.com/new
2. Import repository: `tars-chat-frontend`
3. Configure project:
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

#### 2.3 Set Environment Variables
In Vercel dashboard → Settings → Environment Variables:
```
VITE_API_URL=https://your-railway-url/api
```

#### 2.4 Deploy
- Click "Deploy"
- Wait for deployment to complete
- You'll receive a URL like: `https://tars-chat.vercel.app`

---

### Part 3: Configure TARS Voice (ElevenLabs)

#### 3.1 Option A: Use Pre-built Voice (Quick)
If you don't have time to train a custom voice, use a pre-built deep male voice:

1. Go to https://elevenlabs.io/app/voices
2. Find a suitable voice (e.g., "Daniel", "Josh")
3. Copy the voice ID
4. Update environment variable:
   ```bash
   railway variable set TARS_VOICE_ID=<voice_id>
   ```

#### 3.2 Option B: Clone TARS Voice (Recommended)
To create the actual TARS voice clone:

1. **Gather Audio Samples:**
   - Download 15-30 minutes of clean audio from TARS dialogue in Interstellar
   - Or record the voice actor reading TARS lines
   - Must be high quality, no background noise

2. **Upload to ElevenLabs:**
   - Go to https://elevenlabs.io/app/voice-lab
   - Click "Create a voice"
   - Choose "Professional Voice Cloning"
   - Upload samples
   - Wait 24 hours for training

3. **Get Voice ID:**
   - Once trained, copy the voice ID
   - Update backend environment variable:
     ```bash
     railway variable set TARS_VOICE_ID=<your_trained_voice_id>
     ```

---

### Part 4: Post-Deployment Configuration

#### 4.1 Update CORS
Update backend CORS to allow your Vercel domain:

**In Railway dashboard:**
```
CORS_ORIGIN=https://your-tars-frontend.vercel.app
```

#### 4.2 Test Full Integration
```bash
# From your browser or curl:
curl -X POST https://your-railway-url/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Conversation"}'

# Response should include conversation ID
```

#### 4.3 Test Voice Synthesis
```bash
curl -X POST https://your-railway-url/api/voice-synthesis \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, I am TARS"}'

# Should return base64-encoded audio
```

---

## Deployment Checklist

- [ ] Backend deployed to Railway with valid environment variables
- [ ] Frontend deployed to Vercel
- [ ] VITE_API_URL points to Railway backend
- [ ] ElevenLabs API key configured
- [ ] TARS voice ID configured
- [ ] CORS origin updated to Vercel URL
- [ ] Database initialized (automatic on first run)
- [ ] Health endpoint responds with OK
- [ ] Can create new conversations
- [ ] Can send messages
- [ ] Voice synthesis working (with audio response)
- [ ] Voice input (Web Speech) working in browser
- [ ] Theme toggle working
- [ ] Dark/light mode persisting

---

## Production Best Practices

### Security
- [ ] Never commit `.env` to git (use `.env.example`)
- [ ] Use strong, unique API keys
- [ ] Enable CORS only for your domain
- [ ] Consider rate limiting (add middleware if needed)

### Performance
- [ ] Enable Vercel edge caching
- [ ] Set up Railway autoscaling
- [ ] Monitor database size
- [ ] Archive old conversations monthly

### Monitoring
```bash
# Monitor Railway logs
railway logs

# Monitor Vercel
# Check Vercel dashboard for deployment logs and errors
```

### Scaling (if needed)
- **Frontend:** Vercel auto-scales to edge
- **Backend:** Railway allows manual/auto scaling
- **Database:** SQLite works up to ~10GB, migrate to PostgreSQL if larger

---

## Troubleshooting

### Frontend can't reach backend
- Check CORS_ORIGIN in Railway environment variables
- Ensure VITE_API_URL in Vercel environment variables
- Test with: `curl https://your-backend/health`

### No audio response
- Verify ElevenLabs API key is valid
- Check TARS_VOICE_ID exists in your ElevenLabs account
- Monitor Railway logs for ElevenLabs API errors

### Conversations not persisting
- Check Railway database volume is mounted
- Verify SQLite file has write permissions
- Check for disk space issues in Railway

### Web Speech API not working
- Only works in Chrome, Edge, Safari (not Firefox yet)
- Requires HTTPS in production
- Check browser console for permission errors

---

## Local Development Setup

To test locally before deploying:

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Environment Variables (local)
Create `backend/.env`:
```
ELEVENLABS_API_KEY=sk_xxx
TARS_VOICE_ID=your_id
CORS_ORIGIN=http://localhost:5173
```

Create `frontend/.env.local`:
```
VITE_API_URL=http://localhost:3000
```

---

## Rollback Plan

If something breaks in production:

### Backend Rollback
```bash
cd backend
railway logs  # Check what failed
git revert <commit_hash>
git push
railway up  # Redeploy
```

### Frontend Rollback
1. Go to Vercel dashboard
2. Click "Deployments"
3. Find previous working deployment
4. Click "..." → "Promote to Production"

---

## Cost Estimates (Monthly)

| Service | Free Tier | Paid Tier | Notes |
|---------|-----------|-----------|-------|
| Vercel | ✅ Included | - | Frontend hosting |
| Railway | $5 credit | $5-20 | Backend + database |
| ElevenLabs | 10k API calls | Per usage | Voice synthesis |
| **Total** | Mostly Free | $5-20 | + ElevenLabs usage |

---

## Support & Documentation

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **ElevenLabs Docs:** https://elevenlabs.io/docs
- **React Docs:** https://react.dev
- **Express.js Docs:** https://expressjs.com

---

**Status:** Deployment guide complete. Ready to deploy!
