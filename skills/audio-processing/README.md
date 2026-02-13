# Audio Processing Skill - Quick Start

**Production Ready** | **Version 1.0** | **For TARS**

---

## What It Does

Transcribe audio files and WhatsApp voice messages using Whisper API.

```javascript
const audio = require('./skills/audio-processing');

// Transcribe local file
const { text } = await audio.transcribeFile('./voice.wav');
console.log(text); // "Hello Shawn..."

// Transcribe from WhatsApp
const { text } = await audio.transcribeFromUrl(mediaUrl, bearerToken);

// Batch process files
const results = await audio.transcribeBatch(['msg1.wav', 'msg2.wav']);
console.log(results.totalCost); // $0.0045
```

---

## Quick Examples

### Example 1: Transcribe a Voice Message

```javascript
const audio = require('./skills/audio-processing');

async function processVoiceMessage(filePath) {
  const transcript = await audio.transcribeFile(filePath);
  console.log(`Transcript: ${transcript.text}`);
  console.log(`Duration: ${transcript.duration}s`);
  console.log(`Language: ${transcript.language}`);
}

processVoiceMessage('./shawn-voice.wav');
```

### Example 2: WhatsApp Integration

```javascript
// In your WhatsApp webhook handler
const audio = require('./skills/audio-processing');

async function handleAudioMessage(webhookData, bearerToken) {
  // Extract media from webhook
  const handler = new audio.WhatsAppHandler();
  const media = handler.extractMediaFromWebhook(webhookData);
  
  // Transcribe
  const { text } = await audio.transcribeFromUrl(media.url, bearerToken);
  
  // Process with AI
  const response = generateResponse(text);
  
  // Convert to voice (using existing tts tool)
  const voiceFile = await tts({ text: response });
  
  // Send back
  return {
    audio: voiceFile,
    caption: text // Show what we heard
  };
}
```

### Example 3: Batch Processing

```javascript
const audio = require('./skills/audio-processing');
const fs = require('fs');

async function transcribeFolder(folderPath) {
  const files = fs.readdirSync(folderPath)
    .filter(f => f.endsWith('.wav'))
    .map(f => `${folderPath}/${f}`);
  
  const results = await audio.transcribeBatch(files, {
    concurrency: 5,
    onProgress: (file, current, total) => {
      console.log(`Processing ${current}/${total}`);
    }
  });
  
  console.log(`Total cost: $${results.totalCost}`);
  console.log(`Failed: ${results.errors.length}`);
  
  // Save transcripts
  results.results.forEach(r => {
    const txtFile = r.file.replace('.wav', '.txt');
    fs.writeFileSync(txtFile, r.text);
  });
}

transcribeFolder('./audio-files');
```

### Example 4: Audio Metadata

```javascript
const audio = require('./skills/audio-processing');

async function checkAudioQuality(filePath) {
  const meta = await audio.getAudioMetadata(filePath);
  
  console.log(`Duration: ${meta.duration}s`);
  console.log(`Sample Rate: ${meta.sampleRate}Hz`);
  console.log(`Channels: ${meta.channels} (${meta.channels === 1 ? 'mono' : 'stereo'})`);
  console.log(`File Size: ${(meta.fileSize / 1024).toFixed(2)}KB`);
  
  // Check if suitable for transcription
  if (meta.sampleRate < 8000) {
    console.warn('Warning: Sample rate is very low. Accuracy may suffer.');
  }
}

checkAudioQuality('./voice.wav');
```

### Example 5: Cost Estimation

```javascript
const audio = require('./skills/audio-processing');

// Estimate cost before transcribing
const durationSeconds = 120; // 2 minutes
const cost = audio.estimateCost(durationSeconds);

console.log(`Cost to transcribe: $${cost.cost}`);
console.log(`Rate: ${cost.rate}`);
console.log(`Duration: ${cost.duration}`);
```

---

## Installation

No installation needed! The skill is built into TARS.

**Requirements:**
- OpenAI API key (already in TARS)
- FFmpeg (optional, for format conversion) `brew install ffmpeg`

---

## API Reference

### Core Functions

| Function | Purpose | Cost |
|----------|---------|------|
| `transcribeFile(path)` | Transcribe local audio | $0.006/min |
| `transcribeFromUrl(url, token)` | Transcribe from WhatsApp | $0.006/min |
| `transcribeBatch(paths)` | Batch process multiple files | $0.006/min |
| `getAudioMetadata(path)` | Get file info (duration, sample rate) | Free |
| `convertToWav(input, output)` | Convert format to WAV | Free |
| `estimateCost(seconds)` | Calculate cost | Free |

---

## Common Tasks

### Task: Process all voice messages from a day

```javascript
const audio = require('./skills/audio-processing');

async function processDailyMessages(dateString) {
  const folder = `./messages/${dateString}`;
  const files = fs.readdirSync(folder).map(f => `${folder}/${f}`);
  
  const results = await audio.transcribeBatch(files);
  
  console.log(`Processed ${results.results.length} files`);
  console.log(`Cost: $${results.totalCost}`);
  console.log(`Total duration: ${results.totalDuration}s`);
  
  return results;
}
```

### Task: Get transcription with language detection

```javascript
const audio = require('./skills/audio-processing');

const result = await audio.transcribeFile('./voice.wav');
console.log(`Language detected: ${result.language}`);
console.log(`Text: ${result.text}`);
```

### Task: Monitor transcription quality

```javascript
const audio = require('./skills/audio-processing');

async function qualityCheck(filePath) {
  const meta = await audio.getAudioMetadata(filePath);
  const result = await audio.transcribeFile(filePath);
  
  console.log('Quality Assessment:');
  console.log(`- Audio length: ${meta.duration}s (good if >10s)`);
  console.log(`- Sample rate: ${meta.sampleRate}Hz (good if >=16000)`);
  console.log(`- Confidence: ${result.confidence * 100}%`);
}
```

---

## Cost Examples

| Scenario | Duration | Cost |
|----------|----------|------|
| Single 30s voice note | 30s | $0.003 |
| 5-minute meeting | 5 min | $0.03 |
| Hour-long recording | 60 min | $0.36 |
| 100 daily voice messages | 50 min/day | $9/month |

**Pro tip:** Using Whisper API is 3x cheaper than hiring a transcriber and instant!

---

## Troubleshooting

**Q: "OPENAI_API_KEY required"**  
A: Add to environment: `export OPENAI_API_KEY=sk-...`

**Q: "FFmpeg not found"**  
A: Install FFmpeg, then ensure it's in your PATH
   - Windows: `choco install ffmpeg`
   - Mac: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

**Q: Transcription is inaccurate**  
A: Check audio quality
   ```javascript
   const meta = await audio.getAudioMetadata(file);
   console.log(meta); // Check sample rate, channels, etc.
   ```
   Whisper works best with:
   - Clean audio (minimal background noise)
   - 16kHz+ sample rate
   - Mono or stereo

**Q: File size error**  
A: Whisper API has a 25MB limit. Large files are chunked automatically.

---

## What's Next?

After basic transcription, you might want:

1. **Voice Cloning** (Pro tier ElevenLabs) - Create a voice that sounds like Shawn
2. **Real-time Transcription** (Deepgram) - For live calls
3. **Speaker Identification** - Know who spoke in a meeting
4. **Auto-Translation** - Transcribe + translate in one step

---

## Support

Questions? Check `SKILL.md` for detailed API documentation.

---

**Ready to use!** Start with:
```javascript
const audio = require('./skills/audio-processing');
const { text } = await audio.transcribeFile('./voice.wav');
```
