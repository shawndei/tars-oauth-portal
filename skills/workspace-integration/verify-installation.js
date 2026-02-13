#!/usr/bin/env node

/**
 * Installation Verification Script
 * Verifies that workspace integration is properly installed and configured
 */

const fs = require('fs').promises;
const path = require('path');

console.log('🔍 Workspace Integration - Installation Verification\n');
console.log('='.repeat(60));

async function verifyInstallation() {
  const checks = [];
  
  // Check 1: Gmail directory exists
  console.log('\n📁 Checking directory structure...');
  try {
    await fs.access('gmail');
    console.log('  ✅ gmail/ directory exists');
    checks.push(true);
  } catch {
    console.log('  ❌ gmail/ directory missing');
    checks.push(false);
  }
  
  try {
    await fs.access('calendar');
    console.log('  ✅ calendar/ directory exists');
    checks.push(true);
  } catch {
    console.log('  ❌ calendar/ directory missing');
    checks.push(false);
  }
  
  // Check 2: Core files exist
  console.log('\n📄 Checking core files...');
  const coreFiles = [
    'gmail/SKILL.md',
    'gmail/gmail-client.js',
    'gmail/test-gmail.js',
    'gmail/package.json',
    'calendar/SKILL.md',
    'calendar/calendar-client.js',
    'calendar/test-calendar.js',
    'calendar/package.json',
    'morning-briefing-workflow.js',
    'README.md',
    'TEST_RESULTS.md'
  ];
  
  for (const file of coreFiles) {
    try {
      await fs.access(file);
      console.log(`  ✅ ${file}`);
      checks.push(true);
    } catch {
      console.log(`  ❌ ${file} missing`);
      checks.push(false);
    }
  }
  
  // Check 3: Configuration files
  console.log('\n⚙️  Checking configuration files...');
  try {
    const gmailConfig = await fs.readFile('../../gmail-config.json', 'utf8');
    const config = JSON.parse(gmailConfig);
    if (config.oauth && config.oauth.tokenEndpoint) {
      console.log('  ✅ gmail-config.json exists and valid');
      console.log(`     Token endpoint: ${config.oauth.tokenEndpoint}`);
      checks.push(true);
    } else {
      console.log('  ⚠️  gmail-config.json missing OAuth configuration');
      checks.push(false);
    }
  } catch {
    console.log('  ⚠️  gmail-config.json not found (optional)');
    checks.push(true); // Not critical
  }
  
  try {
    const calendarConfig = await fs.readFile('../../calendar-config.json', 'utf8');
    const config = JSON.parse(calendarConfig);
    if (config.oauth && config.oauth.tokenEndpoint) {
      console.log('  ✅ calendar-config.json exists and valid');
      console.log(`     Token endpoint: ${config.oauth.tokenEndpoint}`);
      checks.push(true);
    } else {
      console.log('  ⚠️  calendar-config.json missing OAuth configuration');
      checks.push(false);
    }
  } catch {
    console.log('  ⚠️  calendar-config.json not found (optional)');
    checks.push(true); // Not critical
  }
  
  // Check 4: Dependencies installed
  console.log('\n📦 Checking dependencies...');
  try {
    await fs.access('gmail/node_modules');
    console.log('  ✅ Gmail dependencies installed');
    checks.push(true);
  } catch {
    console.log('  ❌ Gmail dependencies NOT installed');
    console.log('     Run: cd gmail && npm install');
    checks.push(false);
  }
  
  try {
    await fs.access('calendar/node_modules');
    console.log('  ✅ Calendar dependencies installed');
    checks.push(true);
  } catch {
    console.log('  ❌ Calendar dependencies NOT installed');
    console.log('     Run: cd calendar && npm install');
    checks.push(false);
  }
  
  // Check 5: OAuth portal connectivity
  console.log('\n🔐 Checking OAuth portal...');
  try {
    const fetch = require('node-fetch');
    const response = await fetch('https://tars-oauth-api.railway.app', { 
      timeout: 5000 
    });
    
    if (response.ok) {
      console.log('  ✅ OAuth portal is reachable');
      console.log('     URL: https://tars-oauth-api.railway.app');
      checks.push(true);
    } else {
      console.log('  ⚠️  OAuth portal returned non-200 status');
      console.log(`     Status: ${response.status}`);
      checks.push(false);
    }
  } catch (error) {
    console.log('  ⚠️  OAuth portal not reachable');
    console.log(`     Error: ${error.message}`);
    checks.push(false);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  const passed = checks.filter(c => c === true).length;
  const total = checks.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`\n📊 Verification Results: ${passed}/${total} checks passed (${percentage}%)`);
  
  if (percentage === 100) {
    console.log('\n✅ Installation is COMPLETE and READY!');
    console.log('\nNext steps:');
    console.log('  1. Run tests: cd gmail && node test-gmail.js');
    console.log('  2. Run tests: cd calendar && node test-calendar.js');
    console.log('  3. Generate briefing: node morning-briefing-workflow.js');
  } else if (percentage >= 80) {
    console.log('\n⚠️  Installation is MOSTLY complete');
    console.log('\nReview warnings above and fix any critical issues.');
  } else {
    console.log('\n❌ Installation is INCOMPLETE');
    console.log('\nPlease follow INSTALL.md to complete setup.');
  }
  
  console.log('\n' + '='.repeat(60));
  
  return percentage === 100;
}

// Run verification
verifyInstallation().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('\n❌ Verification failed:', error.message);
  process.exit(1);
});
