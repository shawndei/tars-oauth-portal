# Audio Processing - Integration Guide

**How to integrate audio transcription into TARS WhatsApp system**

---

## 1. WhatsApp Webhook Integration

### Add to Your Message Webhook Handler

```javascript
// In your WhatsApp webhook processor
const audio = require('./skills/audio-processing');

async function handleIncomingMessage(webhookData) {
  const message = webhookData.entry[0].changes[0].value.messages[0];
  const contact = webhookData.entry[0].changes[0].value.contacts[0];
  
  // Handle audio messages
  if (message.type === 'audio') {
    try {
      const transcript = await audio.transcribeFromUrl(
        message.audio.link,
        `Bearer ${process.env.WHATSAPP_TOKEN}`
      );
      
      // Store transcript
      saveTranscript({
        from: contact.wa_id,
        audio_id: message.audio.id,
        text: transcript.text,
        language: transcript.language,
        confidence: transcript.confidence,
        timestamp: new Date(),
        duration: transcript.duration
      });
      
      // Process the text (send to AI, etc.)
      const response = await generateResponse(transcript.text, contact);
      
      // Send back voice reply
      await sendVoiceReply(contact.wa_id, response);
      
    } catch (error) {
      console.error('Transcription failed:', error);
      
      // Notify user
      await message.send({
        target: contact.wa_id,
        text: 'Sorry, I had trouble transcribing your message. Please try again.'
      });
    }
  }
}
```

---

## 2. HEARTBEAT Integration (Batch Processing)

### Add to HEARTBEAT.md

```markdown
## Audio Processing - Batch Transcription (Every 2 Hours)

**Purpose:** Process queued audio files in bulk, reduce individual latency

- Check for files in `./queue/audio/`
- Batch transcribe up to 20 files
- Archive processed files
- Log results and costs

**Handler:** Call `heartbeat_audio_batch_handler()`

**Cost Impact:** ~$0.01-0.05 per heartbeat (depending on queue)
```

### Heartbeat Handler Code

```javascript
// In HEARTBEAT processing
const audio = require('./skills/audio-processing');
const fs = require('fs').promises;
const path = require('path');

async function heartbeat_audio_batch_handler() {
  const queueDir = './queue/audio';
  const archiveDir = './archive/audio-transcripts';
  
  try {
    // Create directories if needed
    await fs.mkdir(queueDir, { recursive: true });
    await fs.mkdir(archiveDir, { recursive: true });
    
    // Get pending files
    const files = await fs.readdir(queueDir);
    if (files.length === 0) {
      console.log('[AUDIO] No pending files');
      return { processed: 0, cost: 0 };
    }
    
    const filePaths = files
      .filter(f => ['.wav', '.mp3', '.opus', '.ogg'].some(ext => f.endsWith(ext)))
      .map(f => path.join(queueDir, f))
      .slice(0, 20); // Process max 20 per heartbeat
    
    console.log(`[AUDIO] Processing ${filePaths.length} queued files...`);
    
    // Batch transcribe
    const results = await audio.transcribeBatch(filePaths, {
      concurrency: 5,
      onProgress: (file, current, total) => {
        console.log(`[AUDIO] ${current}/${total} ${path.basename(file)}`);
      }
    });
    
    // Archive results
    let archivedCount = 0;
    for (const result of results.results) {
      const origFile = result.file;
      const origName = path.basename(origFile);
      const txtFile = path.join(archiveDir, origName.replace(/\.[^.]+$/, '.txt'));
      
      // Save transcript
      const metadata = {
        originalFile: origName,
        timestamp: new Date(),
        duration: result.duration,
        language: result.language,
        confidence: result.confidence
      };
      
      const content = `${JSON.stringify(metadata, null, 2)}\n\n${result.text}`;
      await fs.writeFile(txtFile, content);
      
      // Remove original
      await fs.unlink(origFile);
      archivedCount++;
    }
    
    // Log results
    console.log(`[AUDIO] ✅ Processed: ${results.results.length}`);
    console.log(`[AUDIO] ❌ Failed: ${results.errors.length}`);
    console.log(`[AUDIO] 💰 Cost: $${results.totalCost}`);
    
    if (results.errors.length > 0) {
      console.warn(`[AUDIO] Errors:`, results.errors);
    }
    
    // Update cost tracking
    updateCostTracking('audio-transcription', results.totalCost);
    
    return {
      processed: results.results.length,
      failed: results.errors.length,
      cost: results.totalCost,
      archived: archivedCount
    };
    
  } catch (error) {
    console.error('[AUDIO] Batch processing failed:', error);
    return { processed: 0, cost: 0, error: error.message };
  }
}
```

---

## 3. Voice Reply (Using Existing TTS)

### Integration with tts() tool

```javascript
const audio = require('./skills/audio-processing');

async function sendVoiceReply(contactId, responseText) {
  try {
    // Convert response to speech using existing tts() tool
    const voiceFile = await tts({
      text: responseText,
      voice: 'Nova' // Your preferred ElevenLabs voice
    });
    
    // voiceFile is in format: MEDIA:path/to/audio.mp3
    
    // Send via WhatsApp message tool
    await message.send({
      target: contactId,
      media: voiceFile,
      mediaType: 'audio/mpeg',
      caption: `Voice reply: "${responseText.substring(0, 50)}..."`
    });
    
  } catch (error) {
    console.error('Voice reply failed:', error);
    
    // Fallback to text if voice fails
    await message.send({
      target: contactId,
      text: responseText
    });
  }
}
```

---

## 4. Cost Tracking Integration

### Log costs in your cost tracking system

```javascript
// Add to cost tracking
const costs = require('./costs.json'); // or your cost system

function updateCostTracking(category, amount) {
  const now = new Date();
  const month = now.toISOString().slice(0, 7); // YYYY-MM
  
  if (!costs[month]) {
    costs[month] = {};
  }
  
  if (!costs[month][category]) {
    costs[month][category] = 0;
  }
  
  costs[month][category] += amount;
  
  // Save
  fs.writeFileSync('./costs.json', JSON.stringify(costs, null, 2));
  
  console.log(`[COST] ${category}: +$${amount.toFixed(4)} (Month total: $${costs[month][category].toFixed(2)})`);
}
```

---

## 5. Database Schema (Optional)

### Store transcripts for future reference

```javascript
// In your database
const transcriptSchema = {
  id: UUID,
  contact_id: string,
  message_id: string,
  audio_id: string,
  transcribed_text: string,
  language_detected: string,
  confidence: number,
  duration_seconds: number,
  file_size_bytes: number,
  cost: number,
  created_at: timestamp,
  processed_at: timestamp,
  archived: boolean
};

// Example usage
async function saveTranscript(data) {
  await db.transcripts.insert({
    contact_id: data.from,
    audio_id: data.audio_id,
    transcribed_text: data.text,
    language_detected: data.language,
    confidence: data.confidence,
    duration_seconds: data.duration,
    cost: calculateCost(data.duration),
    created_at: data.timestamp,
    processed_at: new Date()
  });
}
```

---

## 6. Error Handling

### Comprehensive error handling

```javascript
const audio = require('./skills/audio-processing');

async function robustTranscription(mediaUrl, bearer) {
  try {
    // Try primary transcription
    return await audio.transcribeFromUrl(mediaUrl, bearer);
    
  } catch (error) {
    // Handle specific errors
    
    if (error.message.includes('File not found')) {
      console.error('Media URL expired or invalid');
      throw new Error('Audio file no longer available');
    }
    
    if (error.message.includes('API rate limit exceeded')) {
      console.warn('Rate limited. Queuing for later processing...');
      // Queue for batch processing
      await queueForBatchProcessing(mediaUrl);
      throw new Error('Processing queued. Will transcribe shortly.');
    }
    
    if (error.message.includes('FFmpeg')) {
      console.error('Format conversion failed. Trying raw format...');
      // Try transcribing without conversion
      const filePath = await downloadMedia(mediaUrl, bearer);
      return await audio.transcribeFile(filePath); // May fail or work
    }
    
    if (error.message.includes('OPENAI_API_KEY')) {
      console.error('API credentials missing');
      throw new Error('System not configured for audio processing');
    }
    
    // Generic error
    console.error('Transcription failed:', error);
    throw error;
  }
}
```

---

## 7. Logging & Monitoring

### Monitor audio processing health

```javascript
// Create monitoring dashboard entries
async function logAudioProcessing(result) {
  const log = {
    timestamp: new Date(),
    type: 'audio-transcription',
    duration: result.duration,
    cost: result.cost,
    language: result.language,
    confidence: result.confidence,
    success: true
  };
  
  // Append to monitoring log
  const logFile = `./monitoring_logs/audio-${new Date().toISOString().slice(0, 10)}.jsonl`;
  fs.appendFileSync(logFile, JSON.stringify(log) + '\n');
  
  // Alert if high cost
  if (result.cost > 0.10) {
    console.warn(`⚠️ High transcription cost: $${result.cost}`);
    // Could send alert to Shawn
  }
}

// Daily summary
async function generateAudioSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const logFile = `./monitoring_logs/audio-${today}.jsonl`;
  
  const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(l => l);
  const entries = lines.map(l => JSON.parse(l));
  
  const summary = {
    date: today,
    total_transcriptions: entries.length,
    total_duration_hours: entries.reduce((s, e) => s + e.duration, 0) / 3600,
    total_cost: entries.reduce((s, e) => s + e.cost, 0),
    avg_confidence: entries.reduce((s, e) => s + e.confidence, 0) / entries.length,
    languages: [...new Set(entries.map(e => e.language))],
    failures: entries.filter(e => !e.success).length
  };
  
  console.log('[AUDIO DAILY SUMMARY]', summary);
  return summary;
}
```

---

## 8. Configuration

### Add to your environment

```bash
# .env
OPENAI_API_KEY=sk-...
WHATSAPP_TOKEN=EAABsbCS...
AUDIO_TEMP_DIR=./temp/audio
AUDIO_QUEUE_DIR=./queue/audio
AUDIO_ARCHIVE_DIR=./archive/audio-transcripts
AUDIO_MAX_FILE_SIZE=26214400  # 25MB
AUDIO_CONCURRENCY=5
```

### config.json

```json
{
  "audioProcessing": {
    "enabled": true,
    "provider": "whisper-api",
    "batchSize": 20,
    "concurrency": 5,
    "maxRetries": 3,
    "autoArchive": true,
    "costTracking": true,
    "logging": {
      "enabled": true,
      "level": "info",
      "logDir": "./logs/audio"
    }
  }
}
```

---

## 9. Quick Deployment Checklist

- [ ] Copy audio-processing skill to `./skills/audio-processing/`
- [ ] Ensure `OPENAI_API_KEY` is set in environment
- [ ] Add audio handler to WhatsApp webhook processor
- [ ] Add heartbeat batch processing task
- [ ] Create `./queue/audio/` and `./archive/audio-transcripts/` directories
- [ ] Test with sample audio file (under 25MB)
- [ ] Monitor costs for first week
- [ ] Integrate with tts() for voice replies
- [ ] Set up cost tracking integration
- [ ] Create monitoring dashboard for audio usage

---

## 10. Testing

### Test audio transcription

```javascript
const audio = require('./skills/audio-processing');

// Test 1: Local file
async function testLocalFile() {
  const result = await audio.transcribeFile('./test-voice.wav');
  console.log('✅ Local transcription:', result.text);
}

// Test 2: WhatsApp URL (if you have a test URL)
async function testWhatsAppUrl() {
  const result = await audio.transcribeFromUrl(
    'https://graph.instagram.com/...',
    'Bearer your_token'
  );
  console.log('✅ WhatsApp transcription:', result.text);
}

// Test 3: Metadata
async function testMetadata() {
  const meta = await audio.getAudioMetadata('./test-voice.wav');
  console.log('✅ Metadata:', meta);
}

// Test 4: Cost estimation
async function testCostEstimate() {
  const cost = audio.estimateCost(300); // 5 minutes
  console.log('✅ Cost for 5min audio:', cost);
}

// Run all tests
async function runAllTests() {
  console.log('Starting audio processing tests...');
  
  try {
    await testLocalFile();
    await testMetadata();
    await testCostEstimate();
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runAllTests();
```

---

## Next Steps

1. **Monitor Performance:** Track transcription latency and accuracy
2. **Optimize Routing:** Route sensitive audio through local Whisper if needed
3. **Scale Smartly:** Monitor costs, consider Deepgram if >100 hours/month
4. **Add Features:** Speaker identification, translation, summaries

---

**Ready to integrate!** Start with the WhatsApp webhook handler and build from there.
