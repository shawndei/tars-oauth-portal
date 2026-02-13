#!/usr/bin/env node
/**
 * Trigger System Test Script
 * Tests context-aware trigger evaluation
 */

const path = require('path');
const ContextTriggers = require('./skills/context-triggers/context-triggers.js');

async function runTriggerTest() {
  console.log('🧪 Context-Aware Trigger System Test');
  console.log('=====================================\n');

  const triggerEngine = new ContextTriggers();
  
  console.log('📝 Step 1: Loading trigger configuration...');
  try {
    await triggerEngine.load();
    console.log(`✅ Loaded ${triggerEngine.triggers.length} triggers`);
    console.log(`✅ Loaded ${triggerEngine.patterns.length} pattern definitions\n`);
  } catch (error) {
    console.error('❌ Failed to load triggers:', error.message);
    process.exit(1);
  }

  // Build test context
  const now = new Date();
  const testContext = {
    cost: 8.5,
    budget: 10,
    time: now,
    timestamp: now.toISOString()
  };

  console.log('📋 Step 2: Building evaluation context...');
  console.log(`   Current time: ${now.toLocaleTimeString()}`);
  console.log(`   Current date: ${now.toLocaleDateString()}`);
  console.log(`   Day of week: ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]}`);
  console.log(`   Cost: $${testContext.cost} / $${testContext.budget}`);
  console.log(`   Cost %: ${Math.round((testContext.cost / testContext.budget) * 100)}%\n`);

  console.log('⚡ Step 3: Evaluating all triggers...\n');

  const firedTriggers = await triggerEngine.checkTriggers(testContext);

  console.log(`📊 Results:`);
  console.log(`   Total triggers checked: ${triggerEngine.triggers.length}`);
  console.log(`   Triggered actions: ${firedTriggers.length}\n`);

  if (firedTriggers.length > 0) {
    console.log('🔥 TRIGGERS FIRED:\n');
    firedTriggers.forEach((action, index) => {
      console.log(`   ${index + 1}. ✅ ${action.triggerName} (ID: ${action.triggerId})`);
      console.log(`      Action: ${action.action}`);
      console.log(`      Context: ${action.context.type} trigger\n`);
    });
  } else {
    console.log('⚠️  No triggers fired in this evaluation cycle.');
    console.log('   This could be expected if no conditions are met.\n');
  }

  // Show trigger details
  console.log('📋 Trigger Details:\n');
  triggerEngine.triggers.forEach((trigger, index) => {
    const status = trigger.enabled ? '✅' : '⏸️';
    console.log(`${index + 1}. ${status} ${trigger.name} (${trigger.id})`);
    
    if (trigger.type === 'time') {
      console.log(`   Type: Time-based | Schedule: ${trigger.schedule} | Days: ${trigger.days.join(', ')}`);
    } else if (trigger.type === 'state') {
      console.log(`   Type: State-based | Condition: ${trigger.condition}`);
    } else if (trigger.type === 'event') {
      console.log(`   Type: Event-based | Event: ${trigger.event} | Lead time: ${trigger.leadTime}`);
    } else if (trigger.type === 'pattern') {
      console.log(`   Type: Pattern-based | Pattern: ${trigger.pattern}`);
    }
    
    console.log(`   Action: ${trigger.action}`);
    console.log(`   Priority: ${trigger.priority} | Cooldown: ${trigger.cooldown}\n`);
  });

  // Specific test for the test trigger
  console.log('🔬 Special Test: Time-Based Trigger Evaluation\n');
  
  const testTrigger = triggerEngine.triggers.find(t => t.id === 'test-trigger-now');
  if (testTrigger) {
    console.log(`Testing: "${testTrigger.name}"`);
    console.log(`Schedule: ${testTrigger.schedule}`);
    
    const hour = now.getHours();
    const minute = now.getMinutes();
    const [schedHour, schedMinute] = testTrigger.schedule.split(':').map(Number);
    
    console.log(`\nTime Analysis:`);
    console.log(`   Current: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    console.log(`   Scheduled: ${schedHour.toString().padStart(2, '0')}:${schedMinute.toString().padStart(2, '0')}`);
    console.log(`   Difference: ${Math.abs(minute - schedMinute)} minutes`);
    
    const shouldFire = testTrigger.days.includes(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]);
    const withinWindow = Math.abs(minute - schedMinute) <= 15;
    
    console.log(`   Within 15-min window: ${withinWindow ? '✅ YES' : '❌ NO'}`);
    console.log(`   Correct day: ${shouldFire ? '✅ YES' : '❌ NO'}`);
    
    const wouldFire = testTrigger.days.includes(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]) && 
                      hour === schedHour && 
                      Math.abs(minute - schedMinute) <= 15;
    
    console.log(`\n   ➜ Would trigger: ${wouldFire ? '✅ YES' : '❌ NO'}`);
  }

  console.log('\n=====================================');
  console.log('✅ Trigger test completed successfully!');
}

// Run the test
runTriggerTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
