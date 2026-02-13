#!/usr/bin/env node

/**
 * Monitoring Alert Simulator
 * Generates simulated alert conditions for testing the monitoring system
 */

const fs = require('fs');
const path = require('path');

// Alert simulation configurations
const scenarios = {
  'cpu-spike': {
    name: 'CPU Usage Spike',
    duration: 300,
    metrics: {
      'system.cpu.percent': 95,
      'performance.avgResponseTime': 450
    }
  },
  'memory-pressure': {
    name: 'Memory Pressure',
    duration: 300,
    metrics: {
      'system.memory.percent': 92,
      'system.memory.available': 1.2
    }
  },
  'error-spike': {
    name: 'Error Rate Spike',
    duration: 300,
    metrics: {
      'errors.errorRate': 8.5,
      'errors.byType.timeout': 15,
      'errors.byType.validation': 8
    }
  },
  'latency-degradation': {
    name: 'Latency Degradation',
    duration: 600,
    metrics: {
      'performance.avgResponseTime': 1850,
      'performance.p95ResponseTime': 3200,
      'performance.p99ResponseTime': 5400
    }
  },
  'cost-warning': {
    name: 'Cost Budget Warning',
    duration: 60,
    metrics: {
      'costs.dailyBudgetPercent': 85,
      'costs.daily': 8.5
    }
  },
  'auth-errors': {
    name: 'Authentication Error Spike',
    duration: 300,
    metrics: {
      'errors.byType.auth': 12,
      'errors.errorRate': 4.2
    }
  },
  'disk-full': {
    name: 'Disk Space Critical',
    duration: 300,
    metrics: {
      'system.disk.percent': 95
    }
  },
  'network-latency': {
    name: 'High Network Latency',
    duration: 600,
    metrics: {
      'system.network.latency': 150,
      'performance.p95ResponseTime': 1500
    }
  },
  'multi-failure': {
    name: 'Multiple Failures (CPU + Errors)',
    duration: 600,
    metrics: {
      'system.cpu.percent': 92,
      'errors.errorRate': 6.5,
      'performance.avgResponseTime': 1200
    }
  },
  'cost-spike': {
    name: 'Cost Spike Anomaly',
    duration: 300,
    metrics: {
      'costs.hourly': 2.5,
      'costs.dailyBudgetPercent': 90
    }
  }
};

function generateAlert(scenario, timestamp = null) {
  const now = timestamp || new Date().toISOString();
  const alert = {
    timestamp: now,
    scenario: scenario.name,
    metrics: scenario.metrics,
    duration: scenario.duration,
    endTime: new Date(new Date(now).getTime() + scenario.duration * 1000).toISOString()
  };
  return alert;
}

function writeAlertLog(alert) {
  const logsDir = 'monitoring_logs';
  const alertFile = path.join(logsDir, 'alerts.jsonl');

  // Create directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Append alert to log file
  const line = JSON.stringify(alert) + '\n';
  fs.appendFileSync(alertFile, line);
  
  return alertFile;
}

function writeHealthLog(metrics) {
  const logsDir = 'monitoring_logs';
  const healthFile = path.join(logsDir, 'health.jsonl');

  // Create directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const health = {
    timestamp: new Date().toISOString(),
    metrics: metrics
  };

  const line = JSON.stringify(health) + '\n';
  fs.appendFileSync(healthFile, line);
  
  return healthFile;
}

function displayScenarios() {
  console.log('\n📊 Available Monitoring Alert Scenarios:\n');
  Object.entries(scenarios).forEach(([key, scenario]) => {
    console.log(`  ${key.padEnd(25)} - ${scenario.name}`);
  });
  console.log('\n');
}

function runScenario(scenarioKey) {
  if (!scenarios[scenarioKey]) {
    console.error(`❌ Unknown scenario: ${scenarioKey}`);
    displayScenarios();
    process.exit(1);
  }

  const scenario = scenarios[scenarioKey];
  console.log(`\n🚨 Simulating: ${scenario.name}`);
  console.log(`⏱️  Duration: ${scenario.duration} seconds\n`);
  
  // Generate and log the alert
  const alert = generateAlert(scenario);
  const alertFile = writeAlertLog(alert);
  writeHealthLog(scenario.metrics);

  console.log(`✅ Alert logged to: ${alertFile}`);
  console.log(`📈 Simulated Metrics:`);
  
  Object.entries(scenario.metrics).forEach(([metric, value]) => {
    console.log(`   ${metric}: ${value}`);
  });

  console.log(`\n⏰ Alert Duration: ${alert.duration} seconds`);
  console.log(`🕐 End Time: ${alert.endTime}\n`);
}

function runAllScenarios() {
  console.log('\n🎯 Running All Alert Scenarios...\n');
  
  Object.keys(scenarios).forEach(key => {
    const scenario = scenarios[key];
    const alert = generateAlert(scenario);
    writeAlertLog(alert);
    writeHealthLog(scenario.metrics);
    console.log(`✅ ${scenario.name}`);
  });

  console.log('\n✨ All scenarios completed!\n');
}

function queryAlerts(filter = null) {
  const alertFile = 'monitoring_logs/alerts.jsonl';
  
  if (!fs.existsSync(alertFile)) {
    console.log('No alerts logged yet.');
    return;
  }

  const alerts = fs
    .readFileSync(alertFile, 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  console.log(`\n📋 Alert History (${alerts.length} total):\n`);

  if (filter) {
    const filtered = alerts.filter(a => a.scenario.toLowerCase().includes(filter.toLowerCase()));
    filtered.forEach(alert => {
      console.log(`⏰ ${alert.timestamp} - ${alert.scenario}`);
      console.log(`   Duration: ${alert.duration}s | Metrics: ${Object.keys(alert.metrics).length}`);
    });
  } else {
    alerts.slice(-10).forEach(alert => {
      console.log(`⏰ ${alert.timestamp} - ${alert.scenario}`);
      console.log(`   Duration: ${alert.duration}s | Metrics: ${Object.keys(alert.metrics).length}`);
    });
    console.log(`\n   (showing last 10, total: ${alerts.length})`);
  }

  console.log('\n');
}

// CLI handling
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
  console.log(`
🚨 Monitoring Alert Simulator

Usage:
  node simulate-monitoring-alerts.js [COMMAND] [OPTION]

Commands:
  list              List available scenarios
  run <scenario>    Run a specific scenario
  all               Run all scenarios
  query [filter]    Query alert history
  
Examples:
  node simulate-monitoring-alerts.js list
  node simulate-monitoring-alerts.js run cpu-spike
  node simulate-monitoring-alerts.js run error-spike
  node simulate-monitoring-alerts.js all
  node simulate-monitoring-alerts.js query cpu

Scenarios:
${Object.entries(scenarios)
  .map(([key, s]) => `  ${key.padEnd(25)} - ${s.name}`)
  .join('\n')}
  `);
  process.exit(0);
}

const command = args[0];

switch (command) {
  case 'list':
    displayScenarios();
    break;
  case 'run':
    if (!args[1]) {
      console.error('❌ Scenario name required');
      displayScenarios();
      process.exit(1);
    }
    runScenario(args[1]);
    break;
  case 'all':
    runAllScenarios();
    break;
  case 'query':
    queryAlerts(args[1]);
    break;
  default:
    console.error(`❌ Unknown command: ${command}`);
    displayScenarios();
    process.exit(1);
}
