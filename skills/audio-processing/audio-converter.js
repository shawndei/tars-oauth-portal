/**
 * Audio Converter
 * Format conversion and metadata extraction using FFmpeg
 * 
 * Supported formats:
 * Input:  MP3, FLAC, M4A, MPEG, OGG, OPUS, PCM, WAV
 * Output: WAV (Whisper-compatible)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class AudioConverter {
  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
  }
  
  /**
   * Convert audio file to WAV (Whisper-compatible format)
   * 
   * Target: 16kHz, mono, 16-bit PCM
   * 
   * @param {string} inputPath - Source audio file
   * @param {string} outputPath - Destination WAV file
   * @param {object} options - Conversion options
   * @returns {Promise<void>}
   */
  async convert(inputPath, outputPath, options = {}) {
    const {
      sampleRate = 16000,
      channels = 1,
      format = 'wav'
    } = options;
    
    try {
      // Validate input file
      const inputStat = await fs.stat(inputPath);
      if (!inputStat.isFile()) {
        throw new Error(`Input is not a file: ${inputPath}`);
      }
      
      // Build FFmpeg command
      const cmd = [
        this.ffmpegPath,
        '-i', `"${inputPath}"`,
        '-acodec', 'pcm_s16le',
        '-ar', sampleRate,
        '-ac', channels,
        '-y', // Overwrite output
        `"${outputPath}"`
      ].join(' ');
      
      // Execute conversion
      const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      
      // Verify output
      const outputStat = await fs.stat(outputPath);
      if (outputStat.size === 0) {
        throw new Error('Output file is empty. FFmpeg may not be installed.');
      }
      
      return { outputPath, size: outputStat.size };
    } catch (error) {
      throw new Error(`Audio conversion failed: ${error.message}`);
    }
  }
  
  /**
   * Get audio file metadata using FFprobe
   * @param {string} filePath - Path to audio file
   * @returns {Promise<{duration, format, sample_rate, channels, bit_rate, ...}>}
   */
  async getMetadata(filePath) {
    try {
      // Validate file exists
      await fs.stat(filePath);
      
      // FFprobe command to get JSON metadata
      const cmd = [
        this.ffprobePath,
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        `"${filePath}"`
      ].join(' ');
      
      const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      const data = JSON.parse(stdout);
      
      // Extract audio stream
      const audioStream = data.streams?.find(s => s.codec_type === 'audio');
      const format = data.format || {};
      
      return {
        duration: parseFloat(format.duration) || 0,
        format: path.extname(filePath).slice(1) || format.format_name,
        sample_rate: audioStream?.sample_rate || 44100,
        channels: audioStream?.channels || 2,
        bit_rate: audioStream?.bit_rate || format.bit_rate || 128000,
        codec: audioStream?.codec_name || 'unknown',
        codec_long_name: audioStream?.codec_long_name || 'unknown'
      };
    } catch (error) {
      // If FFprobe not available, return defaults
      if (error.message.includes('ENOENT')) {
        console.warn('FFprobe not found. Using defaults. Install FFmpeg to get accurate metadata.');
        return {
          duration: null,
          format: path.extname(filePath).slice(1),
          sample_rate: 16000,
          channels: 1,
          bit_rate: 128000,
          error: 'FFprobe not installed'
        };
      }
      throw error;
    }
  }
  
  /**
   * Check if FFmpeg is installed
   * @returns {Promise<boolean>}
   */
  async isFfmpegAvailable() {
    try {
      await execAsync(`${this.ffmpegPath} -version`);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Ensure FFmpeg is available, with installation instructions if not
   * @returns {Promise<void>}
   */
  async ensureFfmpeg() {
    const available = await this.isFfmpegAvailable();
    
    if (!available) {
      const instructions = `
FFmpeg is required for audio format conversion.

Installation instructions:
- Windows: Download from https://ffmpeg.org/download.html or use: choco install ffmpeg
- macOS: brew install ffmpeg
- Linux: sudo apt-get install ffmpeg

After installation, ensure ffmpeg is in your PATH.
      `;
      throw new Error(`FFmpeg not found. ${instructions}`);
    }
  }
  
  /**
   * Normalize audio (optional enhancement)
   * Reduces volume peaks and ensures consistent levels
   * 
   * @param {string} filePath - Path to audio file
   * @returns {Promise<void>}
   */
  async normalizeAudio(filePath) {
    try {
      const tempPath = filePath + '.normalized.wav';
      
      // FFmpeg normalize filter
      const cmd = [
        this.ffmpegPath,
        '-i', `"${filePath}"`,
        '-af', 'loudnorm',
        '-y',
        `"${tempPath}"`
      ].join(' ');
      
      await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      
      // Replace original
      await fs.unlink(filePath);
      await fs.rename(tempPath, filePath);
    } catch (error) {
      console.warn(`Audio normalization failed: ${error.message}`);
      // Don't throw - normalization is optional
    }
  }
  
  /**
   * Extract audio from video file
   * @param {string} videoPath - Path to video file
   * @param {string} audioPath - Output audio file path
   * @returns {Promise<void>}
   */
  async extractAudioFromVideo(videoPath, audioPath) {
    try {
      const cmd = [
        this.ffmpegPath,
        '-i', `"${videoPath}"`,
        '-q:a', '9', // -q:a flag for audio quality
        '-n', // No overwrite
        `"${audioPath}"`
      ].join(' ');
      
      await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    } catch (error) {
      throw new Error(`Audio extraction failed: ${error.message}`);
    }
  }
  
  /**
   * Get list of supported input formats
   */
  getSupportedFormats() {
    return {
      input: ['mp3', 'flac', 'm4a', 'mpeg', 'ogg', 'opus', 'pcm', 'wav'],
      output: ['wav'], // Whisper-compatible
      description: 'All common audio formats converted to WAV (16kHz, mono, PCM)'
    };
  }
}

module.exports = AudioConverter;
