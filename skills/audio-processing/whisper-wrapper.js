/**
 * Whisper API Wrapper
 * Handles transcription via OpenAI Whisper API
 * 
 * Pricing: $0.006 per minute of audio
 * Format support: MP3, FLAC, M4A, MPEG, OGG, OPUS, PCM, WAV
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class WhisperWrapper {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY required for Whisper API');
    }
    this.apiKey = apiKey;
    this.endpoint = 'https://api.openai.com/v1/audio/transcriptions';
    this.model = 'whisper-1';
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }
  
  /**
   * Transcribe audio file
   * @param {string} filePath - Path to audio file
   * @param {object} options - Transcription options
   * @returns {Promise<{text, language, ...}>}
   */
  async transcribe(filePath, options = {}) {
    const {
      language = null,
      temperature = 0,
      prompt = '',
      task = 'transcribe' // or 'translate'
    } = options;
    
    // Validate file
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const fileSize = fs.statSync(filePath).size;
    if (fileSize === 0) {
      throw new Error('File is empty');
    }
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('model', this.model);
    form.append('temperature', temperature);
    form.append('task', task);
    
    if (language) {
      form.append('language', language);
    }
    if (prompt) {
      form.append('prompt', prompt);
    }
    
    // Make request with retry logic
    let lastError;
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        return await this._makeRequest(form);
      } catch (error) {
        lastError = error;
        
        // Log attempt
        console.warn(`Whisper API attempt ${attempt + 1}/${this.retryAttempts} failed:`, error.message);
        
        // Exponential backoff
        if (attempt < this.retryAttempts - 1) {
          await this._delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Make HTTP request to Whisper API
   * @private
   */
  async _makeRequest(form) {
    try {
      // Try using fetch (Node 18+)
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...form.getHeaders()
        },
        body: form
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Whisper API error (${response.status}): ${error.error?.message || JSON.stringify(error)}`);
      }
      
      return await response.json();
    } catch (error) {
      // Fallback to axios if fetch not available
      if (error.message.includes('fetch is not defined')) {
        return this._makeRequestAxios(form);
      }
      throw error;
    }
  }
  
  /**
   * Make request using axios (fallback)
   * @private
   */
  async _makeRequestAxios(form) {
    try {
      const axios = require('axios');
      const response = await axios.post(this.endpoint, form, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...form.getHeaders()
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Whisper API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
  
  /**
   * Delay utility for retries
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get API usage statistics
   */
  getStats() {
    return {
      model: this.model,
      endpoint: this.endpoint,
      retries: this.retryAttempts,
      pricing: '$0.006 per minute'
    };
  }
}

module.exports = WhisperWrapper;
