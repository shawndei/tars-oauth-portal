#!/usr/bin/env node
/**
 * Florist Campaign Caller
 * Autonomously call all florists to gather Valentine's Day information
 */

const BlandAICaller = require('./bland-ai-caller.js');
const fs = require('fs');
const path = require('path');

const FLORISTS = [
  { name: 'Floreria La Flor de Lis', phone: '+526242201535' },
  { name: 'La Floristería', phone: '+526241220663' },
  { name: 'Cabo Flowers & Cakes', phone: '+526241051451' },
  { name: 'Emporio Arte Floral (CSL)', phone: '+526241435604' },
  { name: 'Emporio Arte Floral (SJC)', phone: '+526241423992' },
  { name: 'Areté Florals', phone: '+526241438593' },
  { name: 'Areté Florals (alt)', phone: '+526241750364' },
  { name: 'Baja Flowers', phone: '+526241434088' },
  { name: 'Florería Patricia', phone: '+526241430718' },
  { name: 'Florenta Flower Design', phone: '+526241721720' },
  { name: 'Mrs. Flowers', phone: '+525518784901' },
  { name: 'Floreria Alba\'s', phone: '+526241281166' }
];

const TASK_SPANISH = `You are calling a florist in Los Cabos, Mexico to gather information.

IMPORTANT: Speak in Spanish throughout the entire call.

Introduction (Spanish):
"Hola, buenos días/tardes. Necesito información sobre un pedido de flores para el 14 de febrero."

Questions to ask (in Spanish):
1. "¿Tienen disponibilidad de 2 docenas de rosas rosadas de tallo largo?"
2. "¿Pueden entregar a la zona de Campestre, San José del Cabo el 14 de febrero?"
3. "¿Cuál sería el precio por 2 docenas de rosas rosadas de tallo largo con entrega?"
4. "¿A qué hora pueden hacer la entrega?"

Listen carefully to their responses. Take notes on:
- Availability (yes/no)
- Delivery to Campestre (yes/no)
- Price quote
- Delivery time options
- Any special requirements or notes

Be polite and professional. Thank them at the end:
"Muchas gracias por la información. Voy a considerar su oferta y me comunicaré pronto."

CRITICAL: If they ask for contact information, provide:
- Name: "Shawn Dunn"
- Phone: "624-264-0093" (say it slowly in Spanish: "seis, dos, cuatro, dos, seis, cuatro, cero, cero, nueve, tres")

Handle interruptions naturally and stay focused on gathering the 3 key pieces of info.`;

class FloristCaller {
  constructor(apiKey) {
    this.caller = new BlandAICaller(apiKey);
    this.results = [];
    this.resultsFile = path.join(__dirname, 'florist-results.json');
  }

  async callFlorist(florist, delayMs = 0) {
    if (delayMs > 0) {
      console.log(`⏱️  Waiting ${delayMs/1000}s before next call...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    console.log(`\n📞 Calling ${florist.name} at ${florist.phone}...`);
    
    try {
      const result = await this.caller.makeCall({
        phoneNumber: florist.phone,
        task: TASK_SPANISH,
        voice: 'maya',
        waitForGreeting: true,
        maxDuration: 300,
        firstSentence: "Hola, buenos días."
      });

      const callRecord = {
        florist: florist.name,
        phone: florist.phone,
        callId: result.call_id,
        status: result.status,
        timestamp: new Date().toISOString(),
        success: true
      };

      this.results.push(callRecord);
      this.saveResults();

      console.log(`✅ Call to ${florist.name} initiated - ID: ${result.call_id}`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to call ${florist.name}:`, error.message);
      
      const callRecord = {
        florist: florist.name,
        phone: florist.phone,
        error: error.message,
        timestamp: new Date().toISOString(),
        success: false
      };

      this.results.push(callRecord);
      this.saveResults();
      
      return null;
    }
  }

  async callAll(delayBetweenCalls = 10000) {
    console.log(`🚀 Starting florist campaign: ${FLORISTS.length} calls`);
    console.log(`⏱️  Delay between calls: ${delayBetweenCalls/1000}s\n`);

    for (let i = 0; i < FLORISTS.length; i++) {
      await this.callFlorist(FLORISTS[i], i > 0 ? delayBetweenCalls : 0);
    }

    console.log('\n✅ Campaign complete!');
    console.log(`📊 Results saved to: ${this.resultsFile}`);
    console.log(`\nSuccessful: ${this.results.filter(r => r.success).length}/${FLORISTS.length}`);
    console.log(`Failed: ${this.results.filter(r => !r.success).length}/${FLORISTS.length}`);
  }

  saveResults() {
    fs.writeFileSync(this.resultsFile, JSON.stringify(this.results, null, 2));
  }

  async getCallResults() {
    console.log('\n📋 Fetching call recordings and transcripts...\n');

    for (const result of this.results) {
      if (!result.success) continue;

      try {
        const status = await this.caller.getCallStatus(result.callId);
        result.duration = status.duration;
        result.recordingUrl = status.recording_url;
        result.transcript = status.transcript;
        result.summary = status.concatenated_transcript;
        
        console.log(`✅ ${result.florist}: ${status.duration}s - ${status.status}`);
      } catch (error) {
        console.error(`❌ Failed to get status for ${result.florist}:`, error.message);
      }
    }

    this.saveResults();
    console.log(`\n✅ Updated results saved to: ${this.resultsFile}`);
  }
}

// CLI
if (require.main === module) {
  const apiKey = process.env.BLAND_AI_API_KEY || process.argv[2];
  
  if (!apiKey) {
    console.error('❌ Error: BLAND_AI_API_KEY not set');
    console.error('Usage: BLAND_AI_API_KEY=your_key node florist-caller.js [command]');
    console.error('\nCommands:');
    console.error('  call     - Call all florists (default)');
    console.error('  results  - Fetch call results');
    process.exit(1);
  }

  const command = process.argv[3] || 'call';
  const floristCaller = new FloristCaller(apiKey);

  if (command === 'call') {
    floristCaller.callAll(10000) // 10 second delay between calls
      .then(() => {
        console.log('\n💡 Run "node florist-caller.js results" in 5-10 minutes to get transcripts');
      })
      .catch(error => {
        console.error('❌ Campaign failed:', error.message);
        process.exit(1);
      });
  } else if (command === 'results') {
    floristCaller.getCallResults()
      .then(() => {
        console.log('\n✅ Done! Check florist-results.json for full details');
      })
      .catch(error => {
        console.error('❌ Failed to fetch results:', error.message);
        process.exit(1);
      });
  } else {
    console.error(`❌ Unknown command: ${command}`);
    process.exit(1);
  }
}

module.exports = FloristCaller;
