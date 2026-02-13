# Multi-Channel Notification Router

Route notifications to the right channels based on priority, throttling, and formatting rules using OpenClaw's native `message()` tool.

## Overview

This skill implements intelligent notification routing using the `notification-routing.json` config. It handles:

- **Priority-based routing** (P0/P1/P2/P3) → different channels and retry strategies
- **Throttling** → respects per-hour and per-day limits per channel
- **Batching** → groups P2/P3 notifications for digest delivery
- **Channel-specific formatting** → emoji, markdown, length limits

## Quick Start

Send a notification with priority routing:

```javascript
// Send a P1 (high priority) notification
const notification = {
  message: "🔴 Database backup completed successfully",
  priority: "P1",           // Triggers WhatsApp + email fallback
  channel: "primary"        // Route through notification system
};

// Call the message() tool with routing
await message({
  action: "send",
  target: "whatsapp",       // Primary channel for P1
  message: notification.message
});
```

## Configuration Reference

Your `notification-routing.json` defines the routing policy:

### Priority Levels

| Priority | Channels | Batch | Retry | Use Case |
|----------|----------|-------|-------|----------|
| **P0** | WhatsApp + Email | No | Yes | Critical outages, security alerts |
| **P1** | WhatsApp (Email fallback) | No | Yes | High-priority operational events |
| **P2** | Email | Yes (4h) | No | Medium alerts, daily tasks |
| **P3** | Email | Yes (24h) | No | Low-priority logs, status updates |

### Throttling Limits

```json
{
  "whatsapp": { "perHour": 10, "perDay": 100 },
  "email": { "perDay": 50 },
  "sms": { "perDay": 5 }
}
```

**What it means:**
- WhatsApp: max 10 messages/hour, 100/day
- Email: max 50 messages/day
- SMS: max 5 messages/day

**When throttled:** Queue message, send when rate limit allows, or use fallback channel.

### Formatting Rules

#### WhatsApp
- Max length: 4096 chars
- Emoji: ✅ enabled
- Markdown: ❌ disabled
- **Example:**
  ```
  🔴 CRITICAL: Server down
  - CPU: 95%
  - Memory: 88%
  - Uptime: 2h 15m
  ```

#### Email
- Format: HTML with header/footer
- **Example:**
  ```html
  <h2>🟡 Medium Priority Alert</h2>
  <p>Database query slow:</p>
  <ul><li>Query time: 8.5s (threshold: 5s)</li></ul>
  ```

#### Discord
- Use embeds: ✅ enabled
- Max length: 2000 chars
- **Example:**
  ```json
  {
    "embeds": [{
      "title": "🟢 Task Complete",
      "description": "Backup finished in 45 seconds",
      "color": 65280
    }]
  }
  ```

#### Telegram
- Markdown: ✅ enabled
- Max length: 4096 chars
- **Example:**
  ```
  **🔵 Info Update**
  _Timestamp: 2024-02-13 08:00 UTC_
  ```

## Implementation Patterns

### Pattern 1: Critical Alert (P0)

Sends immediately to WhatsApp AND email simultaneously with retry enabled.

```javascript
const criticalAlert = {
  message: "🔴 **CRITICAL**: Security breach detected in auth service",
  priority: "P0",
  timestamp: new Date().toISOString()
};

// Send to WhatsApp
await message({
  action: "send",
  target: "whatsapp",
  message: criticalAlert.message
});

// Send to Email (parallel)
await message({
  action: "send",
  target: "your-email@example.com",
  message: `CRITICAL ALERT\n\n${criticalAlert.message}\n\nTime: ${criticalAlert.timestamp}`
});
```

### Pattern 2: High Priority (P1)

Sends to WhatsApp immediately. If WhatsApp fails/throttled, fallback to email.

```javascript
async function sendP1Notification(title, details) {
  const message = `📊 ${title}\n${details}`;
  
  try {
    // Try WhatsApp first
    await message({
      action: "send",
      target: "whatsapp",
      message: message
    });
  } catch (error) {
    // Fallback to email
    console.log("WhatsApp failed, using email fallback");
    await message({
      action: "send",
      target: "your-email@example.com",
      message: message
    });
  }
}

// Usage
await sendP1Notification("Database Backup", "Completed in 12 minutes");
```

### Pattern 3: Medium Priority (P2) - Batching

Collect P2 notifications and send as a batched digest every 4 hours.

```javascript
// Store P2 notifications in a queue (pseudocode)
const p2Queue = [];

function queueP2Notification(title, details) {
  p2Queue.push({
    timestamp: new Date(),
    title: title,
    details: details
  });
  
  // Set batch timer if not already running (every 4h)
  if (!batchTimer) {
    batchTimer = setInterval(async () => {
      if (p2Queue.length > 0) {
        await sendP2Batch();
      }
    }, 4 * 60 * 60 * 1000);
  }
}

async function sendP2Batch() {
  const digest = p2Queue
    .map((n, i) => `${i + 1}. [${n.timestamp.toISOString()}] ${n.title}: ${n.details}`)
    .join("\n");
  
  const emailBody = `Medium Priority Alerts - Batch Digest\n\n${digest}`;
  
  await message({
    action: "send",
    target: "your-email@example.com",
    message: emailBody
  });
  
  p2Queue = []; // Clear queue after sending
}

// Usage
queueP2Notification("Disk Space", "Usage at 75% on /data partition");
queueP2Notification("Memory", "Process XYZ using 4.2GB");
```

### Pattern 4: Low Priority (P3) - Daily Digest

Collect P3 notifications and send once per day.

```javascript
const p3Queue = [];

function queueP3Notification(title, details) {
  p3Queue.push({
    timestamp: new Date(),
    title: title,
    details: details
  });
}

async function sendP3DailyDigest() {
  const digest = p3Queue
    .map((n, i) => `${i + 1}. [${n.timestamp.toTimeString()}] ${n.title}: ${n.details}`)
    .join("\n");
  
  const emailBody = `Daily Status Report\n\nLow Priority Updates:\n\n${digest}`;
  
  await message({
    action: "send",
    target: "your-email@example.com",
    message: emailBody
  });
  
  p3Queue = []; // Clear after send
}

// Schedule once daily (e.g., 9 AM)
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 9 && now.getMinutes() === 0) {
    sendP3DailyDigest();
  }
}, 60000); // Check every minute
```

### Pattern 5: Throttling Management

Track rate limits and queue when exceeded.

```javascript
const channelLimits = {
  whatsapp: { perHour: 10, perDay: 100, hourlyCount: 0, dailyCount: 0 },
  email: { perDay: 50, dailyCount: 0 },
  sms: { perDay: 5, dailyCount: 0 }
};

async function sendWithThrottling(channel, message) {
  const limits = channelLimits[channel];
  
  if (!limits) {
    throw new Error(`Unknown channel: ${channel}`);
  }
  
  // Check daily limit
  if (limits.dailyCount >= limits.perDay) {
    console.log(`${channel} daily limit reached. Queuing message.`);
    queueMessage(channel, message); // Queue for tomorrow
    return;
  }
  
  // Check hourly limit (if exists)
  if (limits.perHour && limits.hourlyCount >= limits.perHour) {
    console.log(`${channel} hourly limit reached. Queuing message.`);
    queueMessage(channel, message); // Queue for later
    return;
  }
  
  // Send message
  await message({
    action: "send",
    target: channel,
    message: message
  });
  
  limits.dailyCount++;
  if (limits.perHour) limits.hourlyCount++;
  
  console.log(`Sent to ${channel}. Daily: ${limits.dailyCount}/${limits.perDay}`);
}

// Reset counters at midnight
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    channelLimits.whatsapp.dailyCount = 0;
    channelLimits.email.dailyCount = 0;
    channelLimits.sms.dailyCount = 0;
    console.log("Daily limits reset");
  }
}, 60000);

// Reset hourly counters
setInterval(() => {
  channelLimits.whatsapp.hourlyCount = 0;
}, 60 * 60 * 1000);
```

## Common Use Cases

### Use Case: System Health Alert

```javascript
async function sendHealthAlert(service, status, details) {
  const emoji = status === "up" ? "🟢" : "🔴";
  const title = `${emoji} ${service} Status`;
  const priority = status === "up" ? "P2" : "P1"; // Down = urgent
  
  const message = `${title}\n${details}`;
  
  if (priority === "P1") {
    await sendWithThrottling("whatsapp", message);
  } else {
    queueP2Notification(service, details);
  }
}

// Usage
await sendHealthAlert("API Server", "down", "Response timeout after 30s");
```

### Use Case: Backup Completion Notification

```javascript
async function sendBackupComplete(backupName, durationSec, sizeGB) {
  const message = `✅ Backup Complete\n\nName: ${backupName}\nDuration: ${durationSec}s\nSize: ${sizeGB}GB`;
  
  // P1: Important operational event
  await message({
    action: "send",
    target: "whatsapp",
    message: message
  });
}

// Usage
await sendBackupComplete("Database Backup", 720, 45);
```

### Use Case: Error Rate Escalation

```javascript
async function sendErrorAlert(errorRate, threshold) {
  const priority = errorRate > threshold * 2 ? "P0" : "P1";
  const emoji = priority === "P0" ? "🔴" : "🟡";
  
  const message = `${emoji} High Error Rate Detected\n\nCurrent: ${(errorRate * 100).toFixed(2)}%\nThreshold: ${(threshold * 100).toFixed(2)}%`;
  
  // P0 = all channels; P1 = WhatsApp + fallback
  if (priority === "P0") {
    await Promise.all([
      message({ action: "send", target: "whatsapp", message }),
      message({ action: "send", target: "your-email@example.com", message })
    ]);
  } else {
    await message({ action: "send", target: "whatsapp", message });
  }
}

// Usage
await sendErrorAlert(0.15, 0.05); // 15% error rate, 5% threshold
```

## Testing & Validation

### Test 1: Simple P1 Notification

```bash
# Send the database backup notification
node -e "
const message = async () => {
  return await message({
    action: 'send',
    target: 'whatsapp',
    message: '✅ Database backup completed successfully - Size: 45GB, Duration: 12min'
  });
};
message().then(() => console.log('Sent!')).catch(e => console.error(e));
"
```

### Test 2: Multi-Channel P0 Alert

```javascript
async function testP0Alert() {
  const alertMessage = "🔴 CRITICAL: Authentication service is down";
  
  const whatsappResult = await message({
    action: "send",
    target: "whatsapp",
    message: alertMessage
  });
  
  const emailResult = await message({
    action: "send",
    target: "your-email@example.com",
    message: `CRITICAL ALERT\n\n${alertMessage}\n\nSent: ${new Date().toISOString()}`
  });
  
  return { whatsapp: whatsappResult, email: emailResult };
}

// Run test
await testP0Alert();
```

### Test 3: Throttling Behavior

```javascript
async function testThrottling() {
  const testMessages = [];
  for (let i = 0; i < 15; i++) {
    testMessages.push(
      sendWithThrottling("whatsapp", `Test message ${i + 1}`)
    );
  }
  
  const results = await Promise.allSettled(testMessages);
  console.log("Sent:", results.filter(r => r.status === "fulfilled").length);
  console.log("Queued:", results.filter(r => r.status === "rejected").length);
}

await testThrottling();
```

## Integration with OpenClaw

The `message()` tool in OpenClaw is your primary interface:

```javascript
// Full signature
message({
  action: "send",           // send, broadcast, react, poll
  target: "whatsapp",       // whatsapp, email, discord, telegram, sms
  message: "Your message",  // Message content
  channel: "target-channel" // (optional) Explicit channel ID
});
```

### Supported Targets

| Target | Tool | Format | Notes |
|--------|------|--------|-------|
| `whatsapp` | message() | Plain text + emoji | 4096 char limit |
| `your-email@example.com` | message() | HTML or plain text | Includes header/footer |
| `discord` | message() | JSON embeds | 2000 char limit per embed |
| `telegram` | message() | Markdown | 4096 char limit |
| `sms` | message() | Plain text | 160 char limit (pay attention!) |

## Summary

**To route notifications:**

1. **Identify priority** (P0-P3) based on severity
2. **Check throttling** limits for the target channel
3. **Format the message** according to channel rules
4. **Send via message()** tool with correct target
5. **Handle fallback** (e.g., P1 WhatsApp → email if needed)
6. **Queue if needed** (P2/P3 for batch delivery)

**Example workflow:**

```javascript
async function sendNotification(title, details, priority = "P1") {
  // Format for WhatsApp
  const msg = `📌 ${title}\n${details}`;
  
  // Route by priority
  if (priority === "P0") {
    // Critical: all channels
    await Promise.all([
      message({ action: "send", target: "whatsapp", message: msg }),
      message({ action: "send", target: "email@example.com", message: msg })
    ]);
  } else if (priority === "P1") {
    // High: WhatsApp primary
    await message({ action: "send", target: "whatsapp", message: msg });
  } else if (priority === "P2") {
    // Medium: batch in 4h
    queueP2Notification(title, details);
  } else {
    // Low: daily digest
    queueP3Notification(title, details);
  }
}

// Send example
await sendNotification("Database Backup", "Completed successfully - 45GB", "P1");
```

That's it! Now go build amazing notifications. 📬
