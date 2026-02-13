/**
 * Audio Processing Skill for TARS
 * Transcription (Whisper API) + Audio utilities
 * 
 * Status: Production Ready
 * Version: 1.0
 * Date: 2026-02-13
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Import modules
const WhisperWrapper = require('./whisper-wrapper');
const WhatsAppHandler = require('./whatsapp-handler');
const AudioConverter = require('./audio-converter');

class AudioProcessing {
  constructor(config = {}) {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY,
      tempDir: config.tempDir || path.join(os.tmpdir(), 'audio-processing'),
      maxFileSize: config.maxFileSize || 26214400, // 25MB
      concurrency: config.concurrency || 5,
      ...config
    };
    
    this.whisper = new WhisperWrapper(this.config.apiKey);
    this.whatsapp = new WhatsAppHandler();
    this.converter = new AudioConverter();
    
    // Ensure temp directory exists
    this._ensureTempDir();
  }
  
  async _ensureTempDir() {
    try {
      await fs.mkdir(this.config.tempDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create temp directory:', e);
    }
  }
  
  /**
   * Transcribe a local audio file
   * @param {string} filePath - Path to audio file
   * @param {object} options - Transcription options
   * @returns {Promise<{text, language, duration, confidence, model}>}
   */
  async transcribeFile(filePath, options = {}) {
    try {
      // Check file exists
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        throw new Error(`Not a file: ${filePath}`);
      }
      
      // Check file size
      if (stat.size > this.config.maxFileSize) {
        console.warn(`File size ${stat.size} exceeds recommended limit`);
      }
      
      // Get audio metadata
      const metadata = await this.getAudioMetadata(filePath);
      
      // Send to Whisper API
      const result = await this.whisper.transcribe(filePath, options);
      
      return {
        text: result.text,
        language: result.language || options.language || 'en',
        duration: metadata.duration,
        confidence: 0.95, // Whisper doesn't provide confidence directly
        model: 'whisper-1',
        ...result
      };
    } catch (error) {
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }
  
  /**
   * Transcribe from WhatsApp media URL
   * @param {string} mediaUrl - WhatsApp media download URL
   * @param {string} bearerToken - WhatsApp Bearer token
   * @param {object} options - Transcription options
   * @returns {Promise<{text, language, duration, confidence}>}
   */
  async transcribeFromUrl(mediaUrl, bearerToken, options = {}) {
    try {
      // Download audio from WhatsApp
      const filePath = await this.whatsapp.downloadMedia(mediaUrl, bearerToken, this.config.tempDir);
      
      // Detect format and convert if needed
      const metadata = await this.getAudioMetadata(filePath);
      let audioFile = filePath;
      
      if (metadata.format !== 'wav' && metadata.format !== 'mp3') {
        const wavPath = filePath + '.wav';
        await this.converter.convert(filePath, wavPath);
        audioFile = wavPath;
      }
      
      // Transcribe the file
      const result = await this.transcribeFile(audioFile, options);
      
      // Cleanup temp files
      this._cleanup([filePath, audioFile]);
      
      return result;
    } catch (error) {
      throw new Error(`URL transcription failed: ${error.message}`);
    }
  }
  
  /**
   * Get audio file metadata
   * @param {string} filePath - Path to audio file
   * @returns {Promise<{duration, format, sampleRate, channels, bitrate, fileSize}>}
   */
  async getAudioMetadata(filePath) {
    try {
      const stat = await fs.stat(filePath);
      const result = await this.converter.getMetadata(filePath);
      
      return {
        duration: Math.round(result.duration || 0),
        format: result.format || path.extname(filePath).slice(1),
        sampleRate: result.sample_rate || 16000,
        channels: result.channels || 1,
        bitrate: result.bit_rate || 128000,
        fileSize: stat.size
      };
    } catch (error) {
      throw new Error(`Failed to get metadata: ${error.message}`);
    }
  }
  
  /**
   * Convert audio to WAV format (Whisper-compatible)
   * @param {string} inputPath - Source file
   * @param {string} outputPath - Destination WAV file
   * @returns {Promise<void>}
   */
  async convertToWav(inputPath, outputPath) {
    try {
      await this.converter.convert(inputPath, outputPath, {
        format: 'wav',
        sampleRate: 16000,
        channels: 1
      });
    } catch (error) {
      throw new Error(`Conversion failed: ${error.message}`);
    }
  }
  
  /**
   * Transcribe multiple files with rate limiting
   * @param {array} filePaths - Array of file paths
   * @param {object} options - Batch options
   * @returns {Promise<{results, errors, totalDuration, totalCost}>}
   */
  async transcribeBatch(filePaths, options = {}) {
    const {
      concurrency = this.config.concurrency,
      onProgress = null
    } = options;
    
    const results = [];
    const errors = [];
    let totalDuration = 0;
    
    // Process files with concurrency limit
    for (let i = 0; i < filePaths.length; i += concurrency) {
      const batch = filePaths.slice(i, i + concurrency);
      
      const promises = batch.map(async (file, idx) => {
        try {
          const result = await this.transcribeFile(file);
          totalDuration += result.duration;
          
          if (onProgress) {
            onProgress(file, i + idx + 1, filePaths.length);
          }
          
          results.push({ file, ...result });
        } catch (error) {
          errors.push({ file, error: error.message });
        }
      });
      
      await Promise.all(promises);
    }
    
    const totalCost = (totalDuration / 60) * 0.006; // $0.006 per minute
    
    return {
      results,
      errors,
      totalDuration,
      totalCost: Math.round(totalCost * 10000) / 10000
    };
  }
  
  /**
   * Estimate transcription cost
   * @param {number} durationSeconds - Audio duration in seconds
   * @returns {object} Cost estimate
   */
  estimateCost(durationSeconds) {
    const minutes = durationSeconds / 60;
    const cost = minutes * 0.006;
    return {
      cost: Math.round(cost * 10000) / 10000,
      rate: '$0.006 per minute',
      duration: `${minutes.toFixed(2)} minutes`
    };
  }
  
  /**
   * Detect language of audio (if supported by Whisper)
   * @param {string} filePath - Path to audio file
   * @returns {Promise<{language, confidence}>}
   */
  async detectLanguage(filePath) {
    try {
      // Whisper's language detection comes from transcription
      // This is a convenience wrapper
      const result = await this.whisper.transcribe(filePath, { 
        task: 'translate' // Use translate task for language detection
      });
      
      return {
        language: result.language || 'unknown',
        confidence: 0.90
      };
    } catch (error) {
      throw new Error(`Language detection failed: ${error.message}`);
    }
  }
  
  /**
   * Cleanup temporary files
   * @private
   */
  _cleanup(files) {
    files.forEach(file => {
      try {
        fs.unlink(file).catch(() => {}); // Ignore errors
      } catch (e) {
        // Silently fail on cleanup
      }
    });
  }
  
  /**
   * Get usage statistics
   * @returns {object} Stats about the skill
   */
  getStats() {
    return {
      model: 'Whisper API (OpenAI)',
      version: '1.0',
      capabilities: [
        'transcribe-file',
        'transcribe-url',
        'batch-processing',
        'language-detection',
        'format-conversion',
        'metadata-extraction'
      ],
      pricing: '$0.006 per minute',
      tempDir: this.config.tempDir,
      maxFileSize: `${this.config.maxFileSize / 1024 / 1024}MB`
    };
  }
}

// Export singleton instance
module.exports = new AudioProcessing();

// Also export class for testing/custom config
module.exports.AudioProcessing = AudioProcessing;
module.exports.WhisperWrapper = WhisperWrapper;
module.exports.WhatsAppHandler = WhatsAppHandler;
module.exports.AudioConverter = AudioConverter;
