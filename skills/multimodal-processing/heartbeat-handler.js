/**
 * HEARTBEAT Integration Handler for Multimodal Processing
 * 
 * This handler processes queued multimodal tasks on each heartbeat.
 * Add to HEARTBEAT.md to activate:
 * 
 * ## Multimodal Processing (Every 3 Heartbeats)
 * Call: heartbeat_multimodal_handler()
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  workspaceRoot: process.env.WORKSPACE || './workspace',
  queues: {
    images: 'queue/images',
    audio: 'queue/audio',
    videos: 'queue/videos'
  },
  logFile: 'memory/multimodal-heartbeat.log',
  stateFile: 'memory/multimodal-state.json'
};

// Initialize state
let processingState = {
  lastRun: null,
  imagesProcessed: 0,
  audioGenerated: 0,
  videosProcessed: 0,
  errors: [],
  activeQueues: {}
};

/**
 * Main heartbeat handler - called periodically
 */
async function heartbeat_multimodal_handler() {
  console.log('🔄 Multimodal Processing Heartbeat');
  console.log('─'.repeat(50));
  
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    images: { queued: 0, processed: 0, errors: 0 },
    audio: { queued: 0, generated: 0, errors: 0 },
    videos: { queued: 0, processed: 0, errors: 0 },
    duration_ms: 0
  };
  
  try {
    // Load current state
    await loadState();
    
    // Process each queue
    console.log('\n📸 Checking image queue...');
    results.images = await processImageQueue();
    
    console.log('\n🎤 Checking audio queue...');
    results.audio = await processAudioQueue();
    
    console.log('\n🎬 Checking video queue...');
    results.videos = await processVideoQueue();
    
    // Update statistics
    processingState.lastRun = new Date().toISOString();
    processingState.imagesProcessed += results.images.processed;
    processingState.audioGenerated += results.audio.generated;
    processingState.videosProcessed += results.videos.processed;
    
    // Save state
    await saveState();
    
    results.duration_ms = Date.now() - startTime;
    
    // Log results
    await logResults(results);
    
    console.log('\n✅ Heartbeat complete');
    console.log(`⏱️  Duration: ${results.duration_ms}ms`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Heartbeat error:', error.message);
    processingState.errors.push({
      timestamp: new Date().toISOString(),
      error: error.message
    });
    await saveState();
    return { error: error.message };
  }
}

/**
 * Process image analysis queue
 */
async function processImageQueue() {
  const results = {
    queued: 0,
    processed: 0,
    errors: 0,
    files: []
  };
  
  try {
    const queueDir = path.join(CONFIG.workspaceRoot, CONFIG.queues.images);
    const files = await getQueueFiles(queueDir);
    results.queued = files.length;
    
    if (files.length === 0) {
      console.log('  ✓ No images in queue');
      return results;
    }
    
    console.log(`  📊 Found ${files.length} images to process`);
    
    for (const file of files) {
      try {
        const filePath = path.join(queueDir, file);
        const metadata = JSON.parse(
          await fs.readFile(filePath + '.json', 'utf8')
        );
        
        console.log(`  → Processing: ${metadata.image_path}`);
        
        // Call vision analysis
        const analysis = await analyzeImageWithVision(
          metadata.image_path,
          metadata.prompt || 'Analyze this image'
        );
        
        // Save results
        const resultFile = path.join(
          CONFIG.workspaceRoot,
          'memory/image-analysis',
          file + '.result.json'
        );
        
        await fs.mkdir(path.dirname(resultFile), { recursive: true });
        await fs.writeFile(
          resultFile,
          JSON.stringify({
            image: metadata.image_path,
            analysis: analysis,
            processedAt: new Date().toISOString()
          }, null, 2)
        );
        
        // Remove from queue
        await fs.unlink(filePath);
        await fs.unlink(filePath + '.json');
        
        results.processed++;
        results.files.push({
          file: file,
          status: 'completed',
          resultPath: resultFile
        });
        
        console.log(`    ✓ Completed`);
        
      } catch (error) {
        console.error(`    ✗ Error: ${error.message}`);
        results.errors++;
      }
    }
    
  } catch (error) {
    console.error(`  Error processing image queue: ${error.message}`);
  }
  
  return results;
}

/**
 * Process audio synthesis queue
 */
async function processAudioQueue() {
  const results = {
    queued: 0,
    generated: 0,
    errors: 0,
    files: []
  };
  
  try {
    const queueDir = path.join(CONFIG.workspaceRoot, CONFIG.queues.audio);
    const files = await getQueueFiles(queueDir);
    results.queued = files.length;
    
    if (files.length === 0) {
      console.log('  ✓ No audio requests in queue');
      return results;
    }
    
    console.log(`  📊 Found ${files.length} audio requests`);
    
    for (const file of files) {
      try {
        const filePath = path.join(queueDir, file);
        const metadata = JSON.parse(
          await fs.readFile(filePath + '.json', 'utf8')
        );
        
        console.log(`  → Synthesizing: ${metadata.text.substring(0, 50)}...`);
        
        // Call TTS
        const audioPath = await synthesizeAudio(metadata.text);
        
        // Save metadata
        const resultFile = path.join(
          CONFIG.workspaceRoot,
          'memory/audio-synthesis',
          file + '.result.json'
        );
        
        await fs.mkdir(path.dirname(resultFile), { recursive: true });
        await fs.writeFile(
          resultFile,
          JSON.stringify({
            text: metadata.text,
            audio_path: audioPath,
            destination: metadata.destination,
            processedAt: new Date().toISOString()
          }, null, 2)
        );
        
        // Deliver if destination specified
        if (metadata.destination) {
          await deliverAudio(audioPath, metadata.destination);
        }
        
        // Remove from queue
        await fs.unlink(filePath);
        await fs.unlink(filePath + '.json');
        
        results.generated++;
        results.files.push({
          file: file,
          status: 'generated',
          audioPath: audioPath
        });
        
        console.log(`    ✓ Audio generated`);
        
      } catch (error) {
        console.error(`    ✗ Error: ${error.message}`);
        results.errors++;
      }
    }
    
  } catch (error) {
    console.error(`  Error processing audio queue: ${error.message}`);
  }
  
  return results;
}

/**
 * Process video summarization queue
 */
async function processVideoQueue() {
  const results = {
    queued: 0,
    processed: 0,
    errors: 0,
    files: []
  };
  
  try {
    const queueDir = path.join(CONFIG.workspaceRoot, CONFIG.queues.videos);
    const files = await getQueueFiles(queueDir);
    results.queued = files.length;
    
    if (files.length === 0) {
      console.log('  ✓ No videos in queue');
      return results;
    }
    
    console.log(`  📊 Found ${files.length} videos to process`);
    
    for (const file of files) {
      try {
        const filePath = path.join(queueDir, file);
        const metadata = JSON.parse(
          await fs.readFile(filePath + '.json', 'utf8')
        );
        
        console.log(`  → Processing: ${metadata.video_path}`);
        
        // Extract frames and summarize
        const summary = await summarizeVideoFrames(
          metadata.video_path,
          metadata.options || { fps: 1, max_frames: 5 }
        );
        
        // Save results
        const resultFile = path.join(
          CONFIG.workspaceRoot,
          'memory/video-analysis',
          file + '.result.json'
        );
        
        await fs.mkdir(path.dirname(resultFile), { recursive: true });
        await fs.writeFile(
          resultFile,
          JSON.stringify({
            video: metadata.video_path,
            summary: summary.narrative,
            frames: summary.frames,
            audio: summary.audio,
            processedAt: new Date().toISOString()
          }, null, 2)
        );
        
        // Remove from queue
        await fs.unlink(filePath);
        await fs.unlink(filePath + '.json');
        
        results.processed++;
        results.files.push({
          file: file,
          status: 'summarized',
          resultPath: resultFile
        });
        
        console.log(`    ✓ Video summarized`);
        
      } catch (error) {
        console.error(`    ✗ Error: ${error.message}`);
        results.errors++;
      }
    }
    
  } catch (error) {
    console.error(`  Error processing video queue: ${error.message}`);
  }
  
  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get queue files for processing
 */
async function getQueueFiles(queueDir) {
  try {
    const entries = await fs.readdir(queueDir);
    return entries
      .filter(f => !f.endsWith('.json') && !f.startsWith('.'))
      .slice(0, 5); // Process max 5 items per heartbeat
  } catch (error) {
    // Queue directory may not exist yet
    return [];
  }
}

/**
 * Analyze image with vision model
 * (This would call the OpenClaw image() tool)
 */
async function analyzeImageWithVision(imagePath, prompt) {
  // Placeholder - would use: await openclaw.image({ image, prompt })
  console.log(`    [Vision API would analyze: ${imagePath}]`);
  return `Analyzed: ${imagePath}`;
}

/**
 * Synthesize audio from text
 * (This would call the OpenClaw tts() tool)
 */
async function synthesizeAudio(text) {
  // Placeholder - would use: await openclaw.tts({ text })
  console.log(`    [TTS would synthesize: ${text.substring(0, 30)}...]`);
  return 'MEDIA:/path/to/audio.mp3';
}

/**
 * Deliver audio to destination
 */
async function deliverAudio(audioPath, destination) {
  console.log(`    [Delivering audio to: ${destination}]`);
}

/**
 * Summarize video frames
 * (This would call vision on extracted frames)
 */
async function summarizeVideoFrames(videoPath, options) {
  console.log(`    [Would extract frames from: ${videoPath}]`);
  return {
    narrative: 'Video summary text',
    frames: [],
    audio: 'MEDIA:/path/to/narration.mp3'
  };
}

/**
 * Load processing state
 */
async function loadState() {
  try {
    const stateFile = path.join(CONFIG.workspaceRoot, CONFIG.stateFile);
    const data = await fs.readFile(stateFile, 'utf8');
    processingState = JSON.parse(data);
  } catch (error) {
    // State file may not exist yet
  }
}

/**
 * Save processing state
 */
async function saveState() {
  try {
    const stateFile = path.join(CONFIG.workspaceRoot, CONFIG.stateFile);
    await fs.mkdir(path.dirname(stateFile), { recursive: true });
    await fs.writeFile(
      stateFile,
      JSON.stringify(processingState, null, 2)
    );
  } catch (error) {
    console.error('Error saving state:', error.message);
  }
}

/**
 * Log results to file
 */
async function logResults(results) {
  try {
    const logFile = path.join(CONFIG.workspaceRoot, CONFIG.logFile);
    await fs.mkdir(path.dirname(logFile), { recursive: true });
    
    const logEntry = JSON.stringify(results, null, 2) + '\n';
    await fs.appendFile(logFile, logEntry);
  } catch (error) {
    console.error('Error logging results:', error.message);
  }
}

// ============================================================================
// QUEUE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Add image to processing queue
 */
async function queueImage(imagePath, prompt = 'Analyze this image') {
  const queueDir = path.join(CONFIG.workspaceRoot, CONFIG.queues.images);
  await fs.mkdir(queueDir, { recursive: true });
  
  const id = Date.now() + Math.random().toString(36).substring(7);
  const filePath = path.join(queueDir, `image_${id}`);
  
  await fs.writeFile(
    filePath + '.json',
    JSON.stringify({
      image_path: imagePath,
      prompt: prompt,
      queuedAt: new Date().toISOString()
    }, null, 2)
  );
  
  await fs.writeFile(filePath, ''); // Empty marker file
  
  console.log(`✓ Image queued: ${imagePath}`);
  return id;
}

/**
 * Add text to audio synthesis queue
 */
async function queueAudio(text, destination = null) {
  const queueDir = path.join(CONFIG.workspaceRoot, CONFIG.queues.audio);
  await fs.mkdir(queueDir, { recursive: true });
  
  const id = Date.now() + Math.random().toString(36).substring(7);
  const filePath = path.join(queueDir, `audio_${id}`);
  
  await fs.writeFile(
    filePath + '.json',
    JSON.stringify({
      text: text,
      destination: destination,
      queuedAt: new Date().toISOString()
    }, null, 2)
  );
  
  await fs.writeFile(filePath, ''); // Empty marker file
  
  console.log(`✓ Audio request queued`);
  return id;
}

/**
 * Add video to processing queue
 */
async function queueVideo(videoPath, options = {}) {
  const queueDir = path.join(CONFIG.workspaceRoot, CONFIG.queues.videos);
  await fs.mkdir(queueDir, { recursive: true });
  
  const id = Date.now() + Math.random().toString(36).substring(7);
  const filePath = path.join(queueDir, `video_${id}`);
  
  await fs.writeFile(
    filePath + '.json',
    JSON.stringify({
      video_path: videoPath,
      options: options,
      queuedAt: new Date().toISOString()
    }, null, 2)
  );
  
  await fs.writeFile(filePath, ''); // Empty marker file
  
  console.log(`✓ Video queued: ${videoPath}`);
  return id;
}

/**
 * Get queue status
 */
async function getQueueStatus() {
  const status = {
    images: (await getQueueFiles(
      path.join(CONFIG.workspaceRoot, CONFIG.queues.images)
    )).length,
    audio: (await getQueueFiles(
      path.join(CONFIG.workspaceRoot, CONFIG.queues.audio)
    )).length,
    videos: (await getQueueFiles(
      path.join(CONFIG.workspaceRoot, CONFIG.queues.videos)
    )).length,
    state: processingState
  };
  
  return status;
}

// Export for use in HEARTBEAT
module.exports = {
  heartbeat_multimodal_handler,
  queueImage,
  queueAudio,
  queueVideo,
  getQueueStatus
};

// Usage in HEARTBEAT.md:
// ```
// const mm = require('./skills/multimodal-processing/heartbeat-handler.js');
// await mm.heartbeat_multimodal_handler();
// ```
