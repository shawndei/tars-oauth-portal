const https = require('https');

const apiKey = '4f4e4bea-f55a-4b0c-8294-4f723912c65b';
const phoneNumber = '+17204873360';

const payload = JSON.stringify({
  phone_number: phoneNumber,
  task: `You are TARS, Shawn's AI assistant. 

Call purpose: Testing the new voice calling system.

Say: "Hey Shawn, it's TARS. The voice calling system is live and operational. I can now make phone calls autonomously. This is a test to confirm everything is working. The implementation uses Bland AI - ultra-low latency, natural conversation. Ready to use for the florist campaign. Let me know if you want me to proceed."

Tone: Direct, competent, brief.`,
  voice: 'maya',
  wait_for_greeting: true,
  max_duration: 180,
  first_sentence: "Hey Shawn, it's TARS.",
  model: 'enhanced',
  temperature: 0.7,
  interruption_threshold: 100,
  record: true
});

const req = https.request({
  hostname: 'api.bland.ai',
  path: '/v1/calls',
  method: 'POST',
  headers: {
    'Authorization': apiKey,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(payload);
req.end();
