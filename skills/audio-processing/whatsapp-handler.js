/**
 * WhatsApp Media Handler
 * Download and manage media files from WhatsApp Cloud API
 */

const fs = require('fs').promises;
const path = require('path');

class WhatsAppHandler {
  /**
   * Download media from WhatsApp Media URL
   * 
   * WhatsApp audio files are typically OPUS format (.opus or .ogg)
   * These will be converted to WAV by the main audio processor
   * 
   * @param {string} mediaUrl - WhatsApp media download URL
   * @param {string} bearerToken - WhatsApp Bearer token (format: "Bearer token123...")
   * @param {string} tempDir - Temporary directory for storing files
   * @returns {Promise<string>} - Path to downloaded file
   */
  async downloadMedia(mediaUrl, bearerToken, tempDir) {
    try {
      // Validate inputs
      if (!mediaUrl) throw new Error('mediaUrl required');
      if (!bearerToken) throw new Error('bearerToken required');
      
      // Extract token if full Bearer header passed
      const token = bearerToken.replace(/^Bearer\s+/i, '');
      
      // Ensure temp directory exists
      await fs.mkdir(tempDir, { recursive: true });
      
      // Download the file
      const buffer = await this._fetchMedia(mediaUrl, token);
      
      // Save to temp file
      const filename = `audio-${Date.now()}.opus`;
      const filePath = path.join(tempDir, filename);
      
      await fs.writeFile(filePath, buffer);
      
      return filePath;
    } catch (error) {
      throw new Error(`WhatsApp media download failed: ${error.message}`);
    }
  }
  
  /**
   * Fetch media from WhatsApp CDN
   * @private
   */
  async _fetchMedia(mediaUrl, token) {
    try {
      // Use fetch if available (Node 18+)
      const response = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.arrayBuffer().then(buf => Buffer.from(buf));
    } catch (error) {
      if (error.message.includes('fetch is not defined')) {
        return this._fetchMediaAxios(mediaUrl, token);
      }
      throw error;
    }
  }
  
  /**
   * Fetch using axios (fallback)
   * @private
   */
  async _fetchMediaAxios(mediaUrl, token) {
    try {
      const axios = require('axios');
      const response = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'arraybuffer'
      });
      return response.data;
    } catch (error) {
      throw new Error(`Media download failed: ${error.message}`);
    }
  }
  
  /**
   * Extract media info from WhatsApp webhook
   * 
   * Usage from webhook handler:
   * const media = handler.extractMediaFromWebhook(webhookData);
   * const transcript = await audio.transcribeFromUrl(media.url, bearerToken);
   */
  extractMediaFromWebhook(webhookData) {
    try {
      // Expected structure from WhatsApp webhook
      const message = webhookData.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      
      if (!message) {
        throw new Error('Invalid webhook structure');
      }
      
      const mediaType = Object.keys(message).find(key => 
        ['audio', 'image', 'document', 'video'].includes(key)
      );
      
      if (!mediaType) {
        throw new Error('No media in message');
      }
      
      const media = message[mediaType];
      
      return {
        type: mediaType,
        id: media.id,
        url: media.link || null,
        mimeType: media.mime_type || null,
        caption: media.caption || null,
        filename: media.filename || null
      };
    } catch (error) {
      throw new Error(`Failed to extract media: ${error.message}`);
    }
  }
  
  /**
   * Format audio for WhatsApp send
   * 
   * WhatsApp accepts: MP3, OGG, Opus
   * Returns metadata for the message tool
   */
  prepareAudioForSend(filePath, caption = null) {
    return {
      media: filePath,
      mediaType: 'audio/mpeg', // MP3 is most compatible
      caption: caption
    };
  }
  
  /**
   * Get media info without downloading
   * Useful for size checks before downloading
   */
  async getMediaInfo(mediaUrl, bearerToken) {
    try {
      const token = bearerToken.replace(/^Bearer\s+/i, '');
      
      const response = await fetch(mediaUrl, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return {
        size: parseInt(response.headers.get('content-length') || 0),
        type: response.headers.get('content-type') || 'unknown',
        lastModified: response.headers.get('last-modified')
      };
    } catch (error) {
      // HEAD requests might not be supported, fall back to GET
      return { size: null, type: 'unknown', error: error.message };
    }
  }
}

module.exports = WhatsAppHandler;
