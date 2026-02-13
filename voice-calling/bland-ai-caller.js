#!/usr/bin/env node
/**
 * Bland AI Voice Calling Integration
 * Bleeding-edge voice calling with conversational AI
 * 
 * API: https://docs.bland.ai/api-v1/post/calls
 * Cost: $0.09/minute
 */

const https = require('https');

class BlandAICaller {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'api.bland.ai';
  }

  /**
   * Make an outbound AI phone call
   * @param {Object} options - Call options
   * @param {string} options.phoneNumber - E.164 format (+17204873360)
   * @param {string} options.task - What the AI should say/do
   * @param {string} options.voice - Voice ID (default: 'maya')
   * @param {boolean} options.waitForGreeting - Wait for person to say hello
   * @param {number} options.maxDuration - Max call duration in seconds
   * @returns {Promise<Object>} Call result
   */
  async makeCall(options) {
    const {
      phoneNumber,
      task = "Say hello and introduce yourself as TARS, an AI assistant.",
      voice = 'maya',
      waitForGreeting = true,
      maxDuration = 300,
      firstSentence = null,
      model = 'enhanced',
      temperature = 0.7
    } = options;

    const payload = {
      phone_number: phoneNumber,
      task: task,
      voice: voice,
      wait_for_greeting: waitForGreeting,
      max_duration: maxDuration,
      model: model,
      temperature: temperature,
      // Interruption handling
      interruption_threshold: 100,
      // Recording
      record: true,
      // Webhook for call events (optional)
      // webhook: 'https://your-server.com/webhook'
    };

    if (firstSentence) {
      payload.first_sentence = firstSentence;
    }

    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);

      const req = https.request({
        hostname: this.baseUrl,
        path: '/v1/calls',
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (res.statusCode === 200) {
              resolve(result);
            } else {
              reject(new Error(`API Error ${res.statusCode}: ${body}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Get call status
   * @param {string} callId - Call ID from makeCall
   * @returns {Promise<Object>} Call status
   */
  async getCallStatus(callId) {
    return new Promise((resolve, reject) => {
      https.get({
        hostname: this.baseUrl,
        path: `/v1/calls/${callId}`,
        headers: {
          'Authorization': this.apiKey
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Test call to Shawn
   */
  async callShawn() {
    console.log('⚡ Initiating call to Shawn...');
    
    const result = await this.makeCall({
      phoneNumber: '+17204873360',
      task: `You are TARS, Shawn's AI assistant. 
      
Call purpose: Testing the new voice calling system that Shawn requested.

Say: "Hey Shawn, it's TARS. The voice calling system is live and operational. I can now make and receive phone calls autonomously. This is a test call to confirm everything is working. The implementation uses Bland AI's conversational API - ultra-low latency, natural conversation flow, and I can handle interruptions. Ready to use for the florist campaign or any other calling tasks you need. Let me know if you want me to proceed with calling the florists now."

Tone: Direct, competent, brief - Shawn's style.
Wait for his response and have a natural conversation.`,
      voice: 'maya', // Natural, clear female voice
      waitForGreeting: true,
      maxDuration: 180, // 3 minutes
      firstSentence: "Hey Shawn, it's TARS."
    });

    console.log('✅ Call initiated successfully');
    console.log(`Call ID: ${result.call_id}`);
    console.log(`Status: ${result.status}`);
    
    return result;
  }
}

// CLI interface
if (require.main === module) {
  const apiKey = process.env.BLAND_AI_API_KEY || process.argv[2];
  
  if (!apiKey) {
    console.error('❌ Error: BLAND_AI_API_KEY environment variable not set');
    console.error('Usage: BLAND_AI_API_KEY=your_key node bland-ai-caller.js');
    console.error('   or: node bland-ai-caller.js YOUR_API_KEY');
    process.exit(1);
  }

  const caller = new BlandAICaller(apiKey);
  
  caller.callShawn()
    .then(result => {
      console.log('\n📞 Call Details:');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('❌ Call failed:', error.message);
      process.exit(1);
    });
}

module.exports = BlandAICaller;
