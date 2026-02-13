# Multi-Modal Processing - Setup & Configuration Guide

**Date:** 2026-02-13  
**Status:** Ready for Configuration  

---

## Prerequisites

### Required
- ✅ OpenClaw installation with `image()` tool (vision model)
- ✅ OpenClaw installation with `tts()` tool (ElevenLabs)
- ✅ Node.js (for heartbeat handler)
- ✅ File system access

### Optional
- FFmpeg for video frame extraction
- Storage space for processed files (recommend 1GB+)

---

## Step 1: Verify Tools Are Available

### Test the image() Tool

Create a test script `test-image.js`:

```javascript
async function testImageTool() {
  try {
    console.log("Testing image() tool...");
    
    // You'll need an actual image file for this
    // Alternatively, test with a URL
    const result = await openclaw.image({
      image: "https://www.w3schools.com/css/img_5terre.jpg",
      prompt: "What do you see in this image?"
    });
    
    console.log("✅ image() tool is working!");
    console.log("Response:", result);
    return true;
    
  } catch (error) {
    console.log("❌ image() tool failed:", error.message);
    return false;
  }
}

testImageTool();
```

Run it:
```bash
node test-image.js
```

### Test the tts() Tool

Create a test script `test-tts.js`:

```javascript
async function testTTSTool() {
  try {
    console.log("Testing tts() tool...");
    
    const result = await openclaw.tts({
      text: "Hello, the multi-modal processing system is now active."
    });
    
    console.log("✅ tts() tool is working!");
    console.log("Audio output:", result);
    return true;
    
  } catch (error) {
    console.log("❌ tts() tool failed:", error.message);
    return false;
  }
}

testTTSTool();
```

Run it:
```bash
node test-tts.js
```

---

## Step 2: Set Up Directory Structure

Create necessary directories:

```bash
# Windows PowerShell
mkdir -p queue/images
mkdir -p queue/audio
mkdir -p queue/videos
mkdir -p memory
mkdir -p temp/video-frames

# Create .gitkeep files to preserve directories
New-Item -Path queue/images/.gitkeep -Force
New-Item -Path queue/audio/.gitkeep -Force
New-Item -Path queue/videos/.gitkeep -Force
```

Or manually create these folders:
- `queue/images/` - For images awaiting analysis
- `queue/audio/` - For text awaiting audio synthesis
- `queue/videos/` - For videos awaiting processing
- `memory/` - For logs and state files
- `temp/video-frames/` - For extracted video frames

---

## Step 3: Create Configuration File

Create `config/multimodal.json`:

```json
{
  "enabled": true,
  "tools": {
    "image": {
      "enabled": true,
      "model": "anthropic/claude-haiku-4-5",
      "maxImageSizeMB": 20,
      "timeout_seconds": 30,
      "supportedFormats": ["jpg", "jpeg", "png", "webp", "gif"]
    },
    "tts": {
      "enabled": true,
      "provider": "elevenlabs",
      "defaultVoice": "nova",
      "outputFormat": "mp3",
      "sampleRate": 44100,
      "bitrate": "128k"
    },
    "video": {
      "enabled": true,
      "ffmpeg_required": true,
      "frameExtractionFPS": 1,
      "maxFramesPerVideo": 10,
      "quality": 80,
      "supportedFormats": ["mp4", "avi", "mov", "mkv", "webm"]
    }
  },
  "queues": {
    "images": "./queue/images",
    "audio": "./queue/audio",
    "videos": "./queue/videos"
  },
  "memory": {
    "logDirectory": "./memory",
    "stateFile": "./memory/multimodal-state.json",
    "logFile": "./memory/multimodal-heartbeat.log",
    "analysisDir": "./memory/image-analysis",
    "audioDir": "./memory/audio-synthesis",
    "videoDir": "./memory/video-analysis"
  },
  "heartbeat": {
    "enabled": true,
    "interval_count": 3,
    "process_per_heartbeat": 5,
    "max_retries": 3,
    "retry_delay_ms": 1000
  },
  "performance": {
    "batch_size": 5,
    "concurrent_processing": 2,
    "compression": {
      "enabled": true,
      "quality": 85
    }
  }
}
```

---

## Step 4: Install FFmpeg (Optional, for Video)

### Windows

**Using Chocolatey:**
```powershell
choco install ffmpeg -y
```

**Manual Installation:**
1. Download from https://ffmpeg.org/download.html
2. Extract to a folder, e.g., `C:\ffmpeg`
3. Add to system PATH:
   - Settings → Environment Variables
   - Add `C:\ffmpeg\bin` to PATH
   - Restart your terminal

**Verify:**
```bash
ffmpeg -version
```

### macOS

```bash
brew install ffmpeg
ffmpeg -version
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install ffmpeg
ffmpeg -version
```

---

## Step 5: Configure HEARTBEAT

Add this to `HEARTBEAT.md`:

```markdown
## Multimodal Processing (Every 3 Heartbeats)

Process queued multimedia tasks automatically.

### Implementation

```javascript
// Load the handler
const mm = require('./skills/multimodal-processing/heartbeat-handler.js');

// Run multimodal heartbeat
const results = await mm.heartbeat_multimodal_handler();

// Log results
if (results.error) {
  console.error('Multimodal heartbeat error:', results.error);
} else {
  console.log('✅ Multimodal processing complete');
  console.log(`   Images: ${results.images.processed}/${results.images.queued}`);
  console.log(`   Audio:  ${results.audio.generated}/${results.audio.queued}`);
  console.log(`   Videos: ${results.videos.processed}/${results.videos.queued}`);
}
```

### Queue Management

Queue items are automatically processed on next heartbeat:

**Queue Images:**
```javascript
const mm = require('./skills/multimodal-processing/heartbeat-handler.js');
await mm.queueImage(
  "path/to/image.jpg",
  "Analyze this for quality"
);
```

**Queue Audio:**
```javascript
const mm = require('./skills/multimodal-processing/heartbeat-handler.js');
await mm.queueAudio(
  "Text to convert to speech",
  "discord_channel_id"  // optional destination
);
```

**Check Queue Status:**
```javascript
const status = await mm.getQueueStatus();
console.log(status);
```

### Monitoring

Check logs at:
- `memory/multimodal-heartbeat.log` - Execution log
- `memory/multimodal-state.json` - Current state
- `memory/image-analysis/` - Image results
- `memory/audio-synthesis/` - Audio results
- `memory/video-analysis/` - Video results
```

---

## Step 6: Create Utility Scripts

### Script 1: Analyze an Image

Create `scripts/analyze-image.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function analyzeImage(imagePath) {
  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found: ${imagePath}`);
    process.exit(1);
  }
  
  try {
    console.log(`Analyzing: ${imagePath}`);
    
    const analysis = await openclaw.image({
      image: imagePath,
      prompt: "Analyze this image in detail"
    });
    
    console.log("\n=== IMAGE ANALYSIS ===\n");
    console.log(analysis);
    
    // Save result
    const resultPath = imagePath + '.analysis.txt';
    fs.writeFileSync(resultPath, analysis);
    console.log(`\n✅ Analysis saved to: ${resultPath}`);
    
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Usage: node analyze-image.js <image_path>
const imagePath = process.argv[2];
if (!imagePath) {
  console.log("Usage: node analyze-image.js <image_path>");
  process.exit(1);
}

analyzeImage(imagePath);
```

### Script 2: Text to Speech

Create `scripts/text-to-speech.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs');

async function synthesizeText(text, outputName) {
  try {
    console.log("Synthesizing audio...");
    
    const audioPath = await openclaw.tts({ text: text });
    
    console.log("✅ Audio synthesized!");
    console.log("Output:", audioPath);
    
    if (outputName) {
      console.log(`Named: ${outputName}`);
    }
    
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Usage: node text-to-speech.js "Your text here"
const text = process.argv[2];
if (!text) {
  console.log('Usage: node text-to-speech.js "Your text"');
  process.exit(1);
}

synthesizeText(text);
```

---

## Step 7: Test the Complete Setup

### Full Integration Test

Create `test-complete.js`:

```javascript
const path = require('path');
const fs = require('fs').promises;

async function runCompleteTest() {
  console.log("🔄 COMPLETE MULTIMODAL SYSTEM TEST\n");
  console.log("=".repeat(50) + "\n");
  
  let passCount = 0;
  let failCount = 0;
  
  // Test 1: TTS
  console.log("1️⃣  Testing TTS...");
  try {
    const audio = await openclaw.tts({
      text: "Test message for text to speech synthesis"
    });
    console.log("   ✅ TTS: PASSED");
    console.log(`   Output: ${audio}\n`);
    passCount++;
  } catch (e) {
    console.log("   ❌ TTS: FAILED -", e.message + "\n");
    failCount++;
  }
  
  // Test 2: Directories
  console.log("2️⃣  Checking directories...");
  try {
    const dirs = [
      'queue/images',
      'queue/audio',
      'queue/videos',
      'memory'
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
    }
    
    console.log("   ✅ Directories: PASSED\n");
    passCount++;
  } catch (e) {
    console.log("   ❌ Directories: FAILED -", e.message + "\n");
    failCount++;
  }
  
  // Test 3: Heartbeat handler
  console.log("3️⃣  Checking heartbeat handler...");
  try {
    const handler = require('./skills/multimodal-processing/heartbeat-handler.js');
    if (handler && handler.heartbeat_multimodal_handler) {
      console.log("   ✅ Heartbeat handler: LOADED\n");
      passCount++;
    } else {
      throw new Error("Handler not properly exported");
    }
  } catch (e) {
    console.log("   ❌ Heartbeat handler: FAILED -", e.message + "\n");
    failCount++;
  }
  
  // Summary
  console.log("=".repeat(50));
  console.log(`\n📊 RESULTS: ${passCount} passed, ${failCount} failed\n`);
  
  if (failCount === 0) {
    console.log("✅ ALL TESTS PASSED - System is ready!\n");
  } else {
    console.log("⚠️  Some tests failed - see above for details\n");
  }
}

runCompleteTest();
```

Run it:
```bash
node test-complete.js
```

---

## Step 8: Create .env Configuration (Optional)

Create `.env.multimodal`:

```bash
# Multimodal Processing Configuration
MULTIMODAL_ENABLED=true
MULTIMODAL_IMAGE_MODEL=anthropic/claude-haiku-4-5
MULTIMODAL_TTS_VOICE=nova
MULTIMODAL_VIDEO_FPS=1
MULTIMODAL_MAX_QUEUE_SIZE=100
MULTIMODAL_LOG_LEVEL=info
FFMPEG_PATH=/usr/bin/ffmpeg
```

Load in your app:
```javascript
require('dotenv').config({ path: '.env.multimodal' });
```

---

## Verification Checklist

- [ ] `image()` tool tested and working
- [ ] `tts()` tool tested and working
- [ ] Queue directories created
- [ ] Configuration file created
- [ ] HEARTBEAT.md updated with multimodal handler
- [ ] FFmpeg installed (if using video)
- [ ] Memory/logging directories ready
- [ ] Test script passed successfully

---

## Troubleshooting Setup Issues

### Issue: "image() tool not found"

**Solution:**
1. Verify OpenClaw has vision model available
2. Check your model supports image analysis
3. Test with explicit model parameter:
```javascript
await image({
  image: "test.jpg",
  prompt: "test",
  model: "anthropic/claude-haiku-4-5"
});
```

### Issue: "tts() tool not found"

**Solution:**
1. Verify ElevenLabs integration is active in OpenClaw
2. Check API credentials are configured
3. Test basic call:
```javascript
const result = await tts({ text: "test" });
console.log(result);  // Should show MEDIA: path
```

### Issue: FFmpeg command not found

**Solution:**
```bash
# Windows: Add ffmpeg to PATH
# Then restart terminal/command prompt

# Verify:
ffmpeg -version

# Or use full path:
C:\ffmpeg\bin\ffmpeg -i video.mp4 frame_%03d.jpg
```

### Issue: Permission denied creating directories

**Solution:**
```bash
# Ensure you have write permissions
# Run with appropriate privileges:

# Windows (PowerShell Admin):
mkdir queue/images -Force

# Linux/Mac:
sudo mkdir -p queue/{images,audio,videos}
sudo chown $USER queue -R
```

---

## Production Deployment

When deploying to production:

1. **Security:**
   - Restrict access to queue directories
   - Validate all inputs before processing
   - Scan images for malware if processing user uploads
   - Use rate limiting for API calls

2. **Scaling:**
   - Use process queue management (Redis, RabbitMQ)
   - Implement worker pools for parallel processing
   - Cache results when possible

3. **Monitoring:**
   - Set up alerts for queue backlog
   - Monitor API usage and costs
   - Track processing times
   - Log all errors

4. **Backup:**
   - Archive processed results regularly
   - Backup state files
   - Maintain audit trail

---

## Next Steps

1. Follow verification checklist above
2. Run test-complete.js
3. Try example scripts in README.md
4. Add to HEARTBEAT.md for automation
5. Build custom workflows for your use cases

---

**Status:** Setup Complete ✅  
**Ready for:** Production Use  
**Support:** See SKILL.md for technical details
