const https = require('https');

const apiKey = '4f4e4bea-f55a-4b0c-8294-4f723912c65b';
const phoneNumber = '+17204873360';
const message = "Hey Shawn, it's TARS. Voice calling is live. This is a test. Ready for florist campaign.";

const requestBody = JSON.stringify({
  phone_number: phoneNumber,
  task: message
});

const options = {
  hostname: 'api.bland.ai',
  port: 443,
  path: '/v1/calls',
  method: 'POST',
  headers: {
    'Authorization': apiKey,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestBody)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
    
    try {
      const jsonResponse = JSON.parse(data);
      if (jsonResponse.call_id) {
        console.log('\n✓ Call initiated successfully!');
        console.log('Call ID:', jsonResponse.call_id);
      }
    } catch (e) {
      // Response may not be JSON, that's okay
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(requestBody);
req.end();
