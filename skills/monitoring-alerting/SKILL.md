# Monitoring & Alerting System Skill

**Purpose:** Comprehensive system health monitoring with multi-channel alerting for TARS platform. Tracks system metrics, performance, errors, costs, and usage patterns with intelligent threshold-based, trend-based, and anomaly-detection alerts.

**Maintainer:** TARS System | **Status:** Production Ready

---

## Overview

The monitoring system provides 24/7 visibility into system health with automatic alerts on five core dimensions:

| Dimension | Metrics | Alert Type | Channels |
|-----------|---------|-----------|----------|
| **System Health** | CPU, Memory, Disk, Network | Threshold | WhatsApp, Email, Log |
| **Performance** | Response time, Throughput, Latency | Trend, Threshold | WhatsApp, Email, Log |
| **Error Tracking** | Error rates, Error types, Stack traces | Threshold, Anomaly | WhatsApp, Email, Log |
| **Cost Monitoring** | Daily/Hourly spend, Budget utilization | Threshold, Trend | Email, Log |
| **Usage Patterns** | API calls, Sessions, User activity | Trend, Anomaly | Log, Dashboard |

---

## Core Architecture

### 1. Metrics Collection

#### System Health Metrics
```javascript
{
  "timestamp": "2026-02-13T08:30:00Z",
  "system": {
    "cpu": { percent: 45.2, cores: 8 },
    "memory": { used: 8.2, total: 16, percent: 51.25 },
    "disk": { used: 256, total: 512, percent: 50 },
    "network": { inbound: 1024, outbound: 512, latency: 15 }
  }
}
```

#### Performance Metrics
```javascript
{
  "timestamp": "2026-02-13T08:30:00Z",
  "performance": {
    "avgResponseTime": 245,  // ms
    "p95ResponseTime": 850,
    "p99ResponseTime": 1200,
    "throughput": 450,  // requests/min
    "activeConnections": 127
  }
}
```

#### Error Metrics
```javascript
{
  "timestamp": "2026-02-13T08:30:00Z",
  "errors": {
    "totalErrors": 12,
    "errorRate": 2.1,  // % of all requests
    "byType": {
      "timeout": 5,
      "auth": 2,
      "validation": 3,
      "server": 2
    },
    "criticalCount": 2
  }
}
```

#### Cost Metrics
```javascript
{
  "timestamp": "2026-02-13T08:30:00Z",
  "costs": {
    "hourly": 0.35,
    "daily": 8.5,
    "dailyBudgetPercent": 85,
    "monthlyRunningTotal": 125.50,
    "projectedMonthly": 258,
    "budgetStatus": "warning"
  }
}
```

#### Usage Metrics
```javascript
{
  "timestamp": "2026-02-13T08:30:00Z",
  "usage": {
    "apiCalls": 234,
    "activeSessions": 12,
    "uniqueUsers": 8,
    "peakHour": "07:00",
    "dataProcessed": 512  // MB
  }
}
```

---

### 2. Alert Rules Engine

#### Rule Structure
```javascript
{
  "id": "cpu-high",
  "name": "High CPU Usage",
  "enabled": true,
  "type": "threshold",  // threshold | trend | anomaly
  "metric": "system.cpu.percent",
  "condition": { "gt": 80 },
  "duration": 300,  // seconds
  "severity": "warning",  // critical | warning | info
  "channels": ["whatsapp", "email"],
  "cooldown": 1800,  // seconds
  "action": "alert"
}
```

#### Alert Types

##### Threshold-Based (Boundary Crossing)
- **Metric:** Single value against fixed limit
- **Triggers:** CPU > 80%, Memory > 85%, Errors > 5/hour
- **Response:** Immediate alert
- **Example:**
  ```javascript
  {
    "type": "threshold",
    "metric": "system.memory.percent",
    "condition": { "gt": 85 },
    "severity": "critical"
  }
  ```

##### Trend-Based (Rate of Change)
- **Metric:** Change over time window
- **Triggers:** Costs increasing 20%+, Latency trending up
- **Response:** Alert after sustained trend
- **Example:**
  ```javascript
  {
    "type": "trend",
    "metric": "costs.daily",
    "window": 3600,  // 1 hour
    "percentageIncrease": 20,
    "severity": "warning"
  }
  ```

##### Anomaly Detection (Statistical Deviation)
- **Metric:** Deviation from baseline
- **Triggers:** Error rate spike, Unusual usage pattern
- **Response:** Alert if > 2σ from baseline
- **Example:**
  ```javascript
  {
    "type": "anomaly",
    "metric": "errors.rate",
    "baseline": "7d_average",
    "stdDevThreshold": 2,
    "severity": "warning"
  }
  ```

---

### 3. Alert Channels

#### WhatsApp Notifications
```javascript
{
  "channel": "whatsapp",
  "config": {
    "enabled": true,
    "phoneNumber": "+1234567890",
    "useTemplate": true,
    "rateLimit": 10,  // alerts per hour
    "format": "compact"  // compact | detailed
  }
}
```

**Message Format:**
```
🚨 CRITICAL: High CPU Usage
System: cpu-01
Current: 95% (threshold: 80%)
Duration: 5 min
Action: Investigate immediately
```

#### Email Alerts
```javascript
{
  "channel": "email",
  "config": {
    "enabled": true,
    "to": ["ops@tars.io", "shawn@tars.io"],
    "from": "alerts@tars.io",
    "digest": {
      "enabled": true,
      "frequency": "hourly",  // realtime | hourly | daily
      "groupBy": "severity"
    }
  }
}
```

**Email Template:**
```html
<h2>System Alert - {severity}</h2>
<p><strong>Alert:</strong> {alertName}</p>
<p><strong>Metric:</strong> {metric} = {value}</p>
<p><strong>Threshold:</strong> {threshold}</p>
<p><strong>Duration:</strong> {duration}</p>
<hr>
<p><a href="{dashboardUrl}">View Dashboard</a></p>
```

#### Logging
```javascript
{
  "channel": "logging",
  "config": {
    "enabled": true,
    "logFile": "monitoring_logs/alerts.jsonl",
    "format": "jsonl",
    "retention": 30  // days
  }
}
```

**Log Format:**
```json
{
  "timestamp": "2026-02-13T08:30:45Z",
  "severity": "critical",
  "alert": "High CPU Usage",
  "metric": "system.cpu.percent",
  "value": 95,
  "threshold": 80,
  "duration": 300,
  "channels": ["whatsapp", "email"],
  "id": "alert-12345",
  "acknowledged": false
}
```

---

### 4. Alert Rules Catalog

#### System Health Rules

**CPU Usage**
```javascript
{
  "id": "cpu-warning",
  "name": "High CPU Usage (Warning)",
  "type": "threshold",
  "metric": "system.cpu.percent",
  "condition": { "gt": 75 },
  "duration": 300,
  "severity": "warning",
  "channels": ["email"]
}
```

**Memory Pressure**
```javascript
{
  "id": "memory-critical",
  "name": "Critical Memory Usage",
  "type": "threshold",
  "metric": "system.memory.percent",
  "condition": { "gt": 90 },
  "duration": 60,
  "severity": "critical",
  "channels": ["whatsapp", "email"]
}
```

**Disk Space**
```javascript
{
  "id": "disk-low",
  "name": "Low Disk Space",
  "type": "threshold",
  "metric": "system.disk.percent",
  "condition": { "gt": 85 },
  "duration": 300,
  "severity": "warning",
  "channels": ["email"]
}
```

#### Performance Rules

**High Latency**
```javascript
{
  "id": "latency-high",
  "name": "High Response Latency",
  "type": "threshold",
  "metric": "performance.p95ResponseTime",
  "condition": { "gt": 1000 },
  "duration": 600,
  "severity": "warning",
  "channels": ["email"]
}
```

**Latency Trending Up**
```javascript
{
  "id": "latency-trend",
  "name": "Latency Degradation",
  "type": "trend",
  "metric": "performance.avgResponseTime",
  "window": 3600,
  "percentageIncrease": 15,
  "severity": "warning",
  "channels": ["email"]
}
```

#### Error Rules

**Error Rate Spike**
```javascript
{
  "id": "errors-high",
  "name": "High Error Rate",
  "type": "threshold",
  "metric": "errors.errorRate",
  "condition": { "gt": 5 },
  "duration": 300,
  "severity": "critical",
  "channels": ["whatsapp", "email"]
}
```

**Specific Error Type**
```javascript
{
  "id": "timeout-errors",
  "name": "Timeout Errors Spike",
  "type": "threshold",
  "metric": "errors.byType.timeout",
  "condition": { "gt": 10 },
  "duration": 600,
  "severity": "warning",
  "channels": ["email"]
}
```

#### Cost Rules

**Daily Budget Warning**
```javascript
{
  "id": "cost-warning",
  "name": "Daily Cost at 80%",
  "type": "threshold",
  "metric": "costs.dailyBudgetPercent",
  "condition": { "gte": 80 },
  "duration": 60,
  "severity": "warning",
  "channels": ["email"]
}
```

**Cost Trend Alert**
```javascript
{
  "id": "cost-increasing",
  "name": "Costs Increasing 20%+",
  "type": "trend",
  "metric": "costs.hourly",
  "window": 86400,  // 24 hours
  "percentageIncrease": 20,
  "severity": "warning",
  "channels": ["email"]
}
```

---

### 5. Health Check Dashboard

#### Dashboard Components

```javascript
{
  "dashboard": {
    "name": "TARS System Health",
    "refreshInterval": 30000,  // ms
    "sections": [
      {
        "title": "System Status",
        "widgets": [
          { "type": "gauge", "metric": "cpu", "warning": 75, "critical": 90 },
          { "type": "gauge", "metric": "memory", "warning": 80, "critical": 90 },
          { "type": "gauge", "metric": "disk", "warning": 80, "critical": 90 }
        ]
      },
      {
        "title": "Performance",
        "widgets": [
          { "type": "line-chart", "metric": "avgResponseTime", "window": "1h" },
          { "type": "line-chart", "metric": "throughput", "window": "1h" },
          { "type": "number", "metric": "activeConnections" }
        ]
      },
      {
        "title": "Errors",
        "widgets": [
          { "type": "number", "metric": "errorRate" },
          { "type": "bar-chart", "metric": "errorsByType", "window": "1h" },
          { "type": "list", "metric": "recentErrors", "limit": 10 }
        ]
      },
      {
        "title": "Costs",
        "widgets": [
          { "type": "gauge", "metric": "dailyBudgetPercent" },
          { "type": "line-chart", "metric": "costTrend", "window": "7d" },
          { "type": "number", "metric": "projectedMonthly" }
        ]
      },
      {
        "title": "Active Alerts",
        "widgets": [
          { "type": "alert-list", "filter": "active", "sortBy": "severity" }
        ]
      }
    ]
  }
}
```

---

### 6. Integration with HEARTBEAT

The monitoring system integrates with HEARTBEAT for continuous automated checks:

```javascript
// In HEARTBEAT.md - Run every heartbeat

### 5. System Health Monitoring Check
// Call: checkSystemHealth()
// Metrics: CPU, Memory, Disk, Network, Performance
// Alerts: If thresholds breached
// Duration: ~2 seconds
```

**HEARTBEAT Integration Points:**

1. **Every heartbeat (all checks):**
   - Cost monitoring (budget enforcement)
   - Error rate tracking

2. **Every 5 minutes (via heartbeat):**
   - System resource checks
   - Performance baseline validation

3. **Every hour (via heartbeat):**
   - Trend analysis (costs, latency)
   - Anomaly detection
   - Alert digest compilation

4. **Daily (once per day):**
   - Baseline updates
   - Pattern analysis
   - Report generation

---

## Implementation Guide

### 1. Installation

```bash
# Copy monitoring configuration
cp monitoring-config.json ~/.openclaw/workspace/

# Initialize alert logs
mkdir -p monitoring_logs/
touch monitoring_logs/alerts.jsonl
touch monitoring_logs/health.jsonl
```

### 2. Configuration

**monitoring-config.json** defines:
- Alert rules
- Channel settings
- Thresholds
- Baselines for anomaly detection

### 3. Running Checks

```javascript
// Manual health check
const health = await checkSystemHealth();

// Check specific metric
const cpuStatus = await checkMetric('system.cpu.percent');

// Trigger alert evaluation
await evaluateAlerts(metrics);

// Get alert summary
const summary = await getAlertSummary(timeRange: '24h');
```

---

## Alert Handling

### Alert Lifecycle

```
Detection → Evaluation → Deduplication → Enrichment → Dispatch → Tracking
```

### Cooldown Period
- Prevents alert fatigue by preventing duplicates
- Default: 30 minutes per alert rule
- Configurable per rule in monitoring-config.json

### Alert Acknowledgment
```javascript
{
  "alertId": "alert-12345",
  "acknowledged": true,
  "acknowledgedBy": "shawn",
  "acknowledgedAt": "2026-02-13T08:35:00Z",
  "note": "Known issue, investigating"
}
```

### Alert History
```bash
# Query recent alerts
jq '.[] | select(.timestamp > "2026-02-13T00:00:00Z")' monitoring_logs/alerts.jsonl

# Group by severity
jq 'group_by(.severity)' monitoring_logs/alerts.jsonl
```

---

## Metrics Reference

### System Health Metrics
- `system.cpu.percent` - CPU utilization (0-100)
- `system.memory.percent` - Memory utilization (0-100)
- `system.memory.available` - Available memory (GB)
- `system.disk.percent` - Disk utilization (0-100)
- `system.network.latency` - Network latency (ms)

### Performance Metrics
- `performance.avgResponseTime` - Average response time (ms)
- `performance.p95ResponseTime` - 95th percentile latency (ms)
- `performance.p99ResponseTime` - 99th percentile latency (ms)
- `performance.throughput` - Requests per minute
- `performance.activeConnections` - Active connections

### Error Metrics
- `errors.errorRate` - % of requests that error
- `errors.totalErrors` - Total error count in period
- `errors.byType.*` - Count by error type (timeout, auth, validation, etc.)
- `errors.criticalCount` - Count of critical errors

### Cost Metrics
- `costs.hourly` - Hourly cost ($)
- `costs.daily` - Daily cost ($)
- `costs.dailyBudgetPercent` - % of daily budget used
- `costs.monthlyRunningTotal` - Month-to-date cost ($)
- `costs.projectedMonthly` - Projected monthly cost ($)

### Usage Metrics
- `usage.apiCalls` - API calls in period
- `usage.activeSessions` - Current active sessions
- `usage.uniqueUsers` - Unique users in period
- `usage.dataProcessed` - Data processed (MB)

---

## Testing & Validation

### Simulated Alert Conditions

```bash
# Trigger CPU alert
./simulate-alerts.sh --metric=cpu --value=95 --duration=300

# Trigger error spike
./simulate-alerts.sh --metric=errors --errorRate=10 --count=50

# Trigger cost warning
./simulate-alerts.sh --metric=costs --dailySpend=8.50 --dailyBudget=10
```

### Alert Testing Checklist
- [ ] Threshold alerts trigger correctly
- [ ] Trend alerts detect sustained changes
- [ ] Anomaly detection identifies spikes
- [ ] Cooldown prevents duplicates
- [ ] WhatsApp notifications deliver
- [ ] Email alerts format correctly
- [ ] Log entries contain full context
- [ ] Dashboard updates in real-time
- [ ] Alert history is queryable

---

## Troubleshooting

### Alert Not Triggering
1. Check alert is enabled in monitoring-config.json
2. Verify metric collection is working
3. Check cooldown hasn't suppressed alert
4. Review alert rule syntax

### False Positives
1. Adjust threshold (if too aggressive)
2. Increase duration requirement
3. Review baseline for anomaly detection
4. Add context conditions

### Missing Metrics
1. Verify collector script is running
2. Check metric name matches schema
3. Review collector logs for errors
4. Validate time series database

---

## Related Skills

- `rate-limiting` - Budget enforcement & cost control
- `multi-channel-notifications` - Alert delivery
- `error-recovery` - Error remediation
- `predictive-scheduler` - Proactive scaling

---

## Contact & Support

- **Issues:** monitoring-alerting@tars.io
- **Escalations:** shawn@tars.io
- **Dashboard:** https://monitoring.tars.io
