#!/usr/bin/env node

/**
 * Cost Tracking System - Comprehensive Test Suite
 * 
 * Tests:
 * 1. Session cost recording (daily/hourly/session breakdown)
 * 2. Budget threshold detection (80%, 90%, 95%, 100%)
 * 3. Alert firing and logging
 * 4. analytics/costs.json population
 * 5. Model pricing calculations
 */

const fs = require('fs');
const path = require('path');
const CostTracker = require('../skills/rate-limiter/cost-tracker');
const SessionCostHook = require('../skills/rate-limiter/session-cost-hook');

const WORKSPACE = path.join(__dirname, '..');
const COSTS_BACKUP = path.join(WORKSPACE, 'costs.json.test-backup');

let testsPassed = 0;
let testsFailed = 0;

// ============================================================================
// Test Utilities
// ============================================================================

function log(message, level = 'info') {
  const levels = { info: '✓', warn: '⚠', error: '✗', success: '✅' };
  console.log(`[${levels[level]}] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    log(message, 'error');
    testsFailed++;
    throw new Error(message);
  }
  testsPassed++;
}

async function backupCosts() {
  try {
    const costsPath = path.join(WORKSPACE, 'costs.json');
    if (fs.existsSync(costsPath)) {
      fs.copyFileSync(costsPath, COSTS_BACKUP);
      log('Backed up costs.json');
    }
  } catch (error) {
    log(`Failed to backup: ${error.message}`, 'error');
  }
}

async function restoreCosts() {
  try {
    const costsPath = path.join(WORKSPACE, 'costs.json');
    if (fs.existsSync(COSTS_BACKUP)) {
      fs.copyFileSync(COSTS_BACKUP, costsPath);
      fs.unlinkSync(COSTS_BACKUP);
      log('Restored costs.json');
    }
  } catch (error) {
    log(`Failed to restore: ${error.message}`, 'error');
  }
}

// ============================================================================
// Test Suite
// ============================================================================

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('COST TRACKING SYSTEM - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(70) + '\n');

  try {
    // Backup original data
    await backupCosts();

    // Run tests
    await testCostCalculation();
    await testSessionCostRecording();
    await testBudgetThresholds();
    await testAnalyticsCostsPopulation();
    await testAlertFiring();
    await testDailyHourlyBreakdown();
    await testSessionHook();

    // Print results
    printResults();

    // Cleanup
    await restoreCosts();

  } catch (error) {
    log(`Test suite error: ${error.message}`, 'error');
    await restoreCosts();
    process.exit(1);
  }
}

// ============================================================================
// Individual Tests
// ============================================================================

async function testCostCalculation() {
  console.log('\n📊 TEST 1: Cost Calculation');
  console.log('-'.repeat(70));

  const tracker = new CostTracker({ workspaceRoot: WORKSPACE });

  // Test Sonnet pricing
  const sonnetCost = tracker.calculateCost(100000, 50000, 'claude-sonnet-4-5');
  log(`Sonnet (100k input + 50k output): $${sonnetCost.cost.toFixed(4)}`);
  assert(sonnetCost.cost > 0, 'Sonnet cost should be > 0');
  assert(sonnetCost.totalTokens === 150000, 'Total tokens should be 150k');

  // Test Haiku pricing (should be much cheaper)
  const haikuCost = tracker.calculateCost(100000, 50000, 'claude-haiku-4-5');
  log(`Haiku (100k input + 50k output): $${haikuCost.cost.toFixed(4)}`);
  assert(haikuCost.cost > 0, 'Haiku cost should be > 0');
  assert(haikuCost.cost < sonnetCost.cost, 'Haiku should be cheaper than Sonnet');
  
  const savings = ((sonnetCost.cost - haikuCost.cost) / sonnetCost.cost * 100).toFixed(1);
  log(`Cost savings: ${savings}% (Haiku vs Sonnet)`);
  assert(savings > 90, 'Haiku should save >90% vs Sonnet');
}

async function testSessionCostRecording() {
  console.log('\n💾 TEST 2: Session Cost Recording');
  console.log('-'.repeat(70));

  const tracker = new CostTracker({ workspaceRoot: WORKSPACE });

  // Record a session
  const result = await tracker.recordSessionCost({
    sessionId: 'test-session-1',
    sessionKey: 'main:test123',
    model: 'claude-sonnet-4-5',
    inputTokens: 100000,
    outputTokens: 50000,
    apiCalls: 25,
    taskType: 'test',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString()
  });

  assert(result.success === true, 'Session cost recording should succeed');
  assert(result.cost > 0, 'Cost should be recorded');
  assert(result.tokens === 150000, 'Token count should be correct');

  log(`Session cost recorded: $${result.cost.toFixed(4)} (${result.tokens} tokens)`);

  // Verify costs.json was updated
  const costsPath = path.join(WORKSPACE, 'costs.json');
  assert(fs.existsSync(costsPath), 'costs.json should exist');

  const costs = JSON.parse(fs.readFileSync(costsPath, 'utf-8'));
  const today = new Date().toISOString().split('T')[0];
  assert(costs[today], `Today's entry should exist in costs.json`);
  assert(costs[today].sessions, 'Sessions section should exist');
  assert(costs[today].sessions['main:test123'], 'Session detail should be recorded');

  log(`Session detail: $${costs[today].sessions['main:test123'].cost.toFixed(4)}`);
}

async function testBudgetThresholds() {
  console.log('\n⏰ TEST 3: Budget Threshold Detection');
  console.log('-'.repeat(70));

  const tracker = new CostTracker({ workspaceRoot: WORKSPACE });
  const today = new Date().toISOString().split('T')[0];

  // Read current costs
  const costsPath = path.join(WORKSPACE, 'costs.json');
  const costs = JSON.parse(fs.readFileSync(costsPath, 'utf-8'));

  // Test at 80% (Warning threshold)
  costs[today].daily.cost = 8.00;
  fs.writeFileSync(costsPath, JSON.stringify(costs, null, 2));

  let status = await tracker.checkBudgetAndAlert(costs, today);
  assert(status.status === 'warning', '80% should trigger WARNING');
  log(`✓ 80% threshold: WARNING (${status.message})`);

  // Test at 90% (Degradation)
  costs[today].daily.cost = 9.00;
  fs.writeFileSync(costsPath, JSON.stringify(costs, null, 2));

  status = await tracker.checkBudgetAndAlert(costs, today);
  assert(status.status === 'degradation', '90% should trigger DEGRADATION');
  log(`✓ 90% threshold: DEGRADATION (${status.message})`);

  // Test at 95% (Critical)
  costs[today].daily.cost = 9.50;
  fs.writeFileSync(costsPath, JSON.stringify(costs, null, 2));

  status = await tracker.checkBudgetAndAlert(costs, today);
  assert(status.status === 'critical', '95% should trigger CRITICAL');
  log(`✓ 95% threshold: CRITICAL (${status.message})`);

  // Test at 100% (Blocked)
  costs[today].daily.cost = 10.00;
  fs.writeFileSync(costsPath, JSON.stringify(costs, null, 2));

  status = await tracker.checkBudgetAndAlert(costs, today);
  assert(status.status === 'blocked', '100% should trigger BLOCKED');
  log(`✓ 100% threshold: BLOCKED (${status.message})`);
}

async function testAnalyticsCostsPopulation() {
  console.log('\n📈 TEST 4: Analytics/Costs.json Population');
  console.log('-'.repeat(70));

  const tracker = new CostTracker({ workspaceRoot: WORKSPACE });

  // Record a session
  const result = await tracker.recordSessionCost({
    sessionId: 'test-analytics',
    sessionKey: 'analytics:test',
    model: 'claude-haiku-4-5',
    inputTokens: 50000,
    outputTokens: 25000,
    apiCalls: 10,
    taskType: 'analytics_test'
  });

  assert(result.success === true, 'Analytics cost should be recorded');

  // Check analytics/costs.json
  const analyticsPath = path.join(WORKSPACE, 'analytics', 'costs.json');
  assert(fs.existsSync(analyticsPath), 'analytics/costs.json should exist');

  const analytics = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));
  assert(Array.isArray(analytics.sessions), 'Sessions should be an array');
  assert(analytics.sessions.length > 0, 'Sessions array should be populated');

  const latestSession = analytics.sessions[analytics.sessions.length - 1];
  assert(latestSession.sessionKey === 'analytics:test', 'Session key should match');
  assert(latestSession.cost > 0, 'Cost should be recorded');
  assert(latestSession.tokens === 75000, 'Token count should be correct');

  log(`✓ Session added to analytics: $${latestSession.cost.toFixed(4)}`);
  log(`✓ Sessions array now has ${analytics.sessions.length} entries`);
}

async function testAlertFiring() {
  console.log('\n🚨 TEST 5: Alert Firing & Logging');
  console.log('-'.repeat(70));

  const tracker = new CostTracker({ workspaceRoot: WORKSPACE });
  const today = new Date().toISOString().split('T')[0];

  // Read costs
  const costsPath = path.join(WORKSPACE, 'costs.json');
  const costs = JSON.parse(fs.readFileSync(costsPath, 'utf-8'));

  // Trigger a critical alert
  costs[today].daily.cost = 9.75;
  fs.writeFileSync(costsPath, JSON.stringify(costs, null, 2));

  const status = await tracker.checkBudgetAndAlert(costs, today);
  assert(status.status === 'critical', 'Should trigger critical status');

  // Check if log files were created/updated
  const budgetLogPath = path.join(WORKSPACE, 'monitoring_logs', 'budget-status.log');
  const alertsLogPath = path.join(WORKSPACE, 'monitoring_logs', 'cost-alerts.jsonl');

  assert(fs.existsSync(budgetLogPath), 'Budget status log should exist');
  assert(fs.existsSync(alertsLogPath), 'Cost alerts JSONL should exist');

  const budgetLog = fs.readFileSync(budgetLogPath, 'utf-8');
  assert(budgetLog.length > 0, 'Budget log should have entries');
  assert(budgetLog.includes('CRITICAL') || budgetLog.includes('DEGRADATION'), 'Log should contain threshold events');

  const alertsLog = fs.readFileSync(alertsLogPath, 'utf-8');
  const alertLines = alertsLog.trim().split('\n');
  const lastAlert = JSON.parse(alertLines[alertLines.length - 1]);
  assert(lastAlert.level === 'critical', 'Latest alert should be critical');

  log(`✓ Budget status log contains ${budgetLog.split('\n').length - 1} entries`);
  log(`✓ Alerts JSONL contains ${alertLines.length} events`);
  log(`✓ Latest alert: ${lastAlert.status} at ${lastAlert.percentage.toFixed(1)}%`);
}

async function testDailyHourlyBreakdown() {
  console.log('\n🕐 TEST 6: Daily/Hourly Breakdown');
  console.log('-'.repeat(70));

  const tracker = new CostTracker({ workspaceRoot: WORKSPACE });

  // Create a clean test date (not today, to avoid existing data)
  const testDate = '2026-02-15'; // Use a fixed test date
  const costsPath = path.join(WORKSPACE, 'costs.json');

  // Clear the test date from costs.json
  let costs = JSON.parse(fs.readFileSync(costsPath, 'utf-8'));
  if (costs[testDate]) {
    delete costs[testDate];
  }
  fs.writeFileSync(costsPath, JSON.stringify(costs, null, 2));

  // Record a clean session with known breakdown
  // This will create perHour entry for current hour
  const result = await tracker.recordSessionCost({
    sessionId: 'test-breakdown-' + testDate,
    sessionKey: 'test:breakdown',
    model: 'claude-sonnet-4-5',
    inputTokens: 100000,
    outputTokens: 50000,
    apiCalls: 25,
    taskType: 'breakdown_test'
  });

  assert(result.success === true, 'Should record cost successfully');

  // Read back and verify structure
  costs = JSON.parse(fs.readFileSync(costsPath, 'utf-8'));
  const today = new Date().toISOString().split('T')[0];

  // Verify daily total
  assert(costs[today].daily.cost > 0, 'Daily cost should be accumulated');
  assert(costs[today].daily.tokens > 0, 'Daily tokens should be accumulated');

  log(`Daily cost: $${costs[today].daily.cost.toFixed(2)}`);
  log(`Daily tokens: ${costs[today].daily.tokens.toLocaleString()}`);

  // Verify sessions are recorded individually
  assert(Object.keys(costs[today].sessions).length > 0, 'Should have session records');
  log(`Sessions recorded: ${Object.keys(costs[today].sessions).length}`);

  // Verify hourly breakdown exists
  assert(costs[today].perHour, 'Should have hourly breakdown object');
  const hours = Object.keys(costs[today].perHour).filter(h => costs[today].perHour[h].cost > 0).sort();
  log(`Hourly breakdown hours with data: ${hours.join(', ')}`);

  // Verify structure (at minimum, today's hour should have data)
  assert(hours.length > 0, 'Should have at least one hour with data');
  assert(costs[today].perHour[hours[0]].cost > 0, 'Hour should have cost');
  assert(costs[today].perHour[hours[0]].tokens > 0, 'Hour should have tokens');

  log(`✓ Hourly breakdown structure verified`);
}

async function testSessionHook() {
  console.log('\n🎣 TEST 7: Session Cost Hook Integration');
  console.log('-'.repeat(70));

  const hook = new SessionCostHook({ workspaceRoot: WORKSPACE });

  // Simulate session lifecycle
  const sessionId = 'hook-test-' + Date.now();
  const sessionKey = 'test:hook:' + sessionId;

  // Session start
  hook.onSessionStart({
    sessionId,
    sessionKey,
    model: 'claude-haiku-4-5',
    taskType: 'test_hook'
  });
  log(`✓ Session started: ${sessionKey}`);

  // Session execution (simulated)
  await new Promise(r => setTimeout(r, 100));

  // Session end with token counts
  const result = await hook.onSessionEnd({
    sessionId,
    sessionKey,
    inputTokens: 75000,
    outputTokens: 25000,
    totalTokens: 100000,
    apiCalls: 15,
    model: 'claude-haiku-4-5'
  });

  assert(result.success === true, 'Hook should successfully record cost');
  assert(result.cost > 0, 'Cost should be calculated');
  log(`✓ Session ended with cost: $${result.cost.toFixed(4)}`);
  log(`✓ Status: ${result.status}`);

  // Get costs summary
  const summary = await hook.getCostsSummary();
  assert(summary !== null, 'Should be able to get costs summary');
  assert(summary.totalCost > 0, 'Total cost should be > 0');
  log(`✓ Total cost across all sessions: $${summary.totalCost.toFixed(2)}`);
  log(`✓ Projected monthly: $${summary.projectedMonthlyAtCurrentRate.toFixed(2)}`);
}

// ============================================================================
// Results
// ============================================================================

function printResults() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST RESULTS');
  console.log('='.repeat(70));

  const total = testsPassed + testsFailed;
  const percentage = ((testsPassed / total) * 100).toFixed(1);

  console.log(`\n✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📊 Total: ${total}`);
  console.log(`📈 Success Rate: ${percentage}%\n`);

  if (testsFailed === 0) {
    console.log('🎉 All tests passed! Cost tracking system is operational.\n');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed. Please review the output above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
