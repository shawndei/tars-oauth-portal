# Multi-Channel Notification Router - Quick Start Guide

## 5-Minute Setup

### 1. Understand Your Config

Your `notification-routing.json` defines everything. Check these 3 sections:

```json
{
  "priorityRouting": { ... },  // P0/P1/P2/P3 rules
  "throttling": { ... },        // Rate limits per channel
  "formatting": { ... }         // Message rules per channel
}
```

### 2. Copy-Paste Templates

#### 🔴 Critical Alert (P0)
```javascript
async function criticalAlert(title) {
  const msg = `🔴 CRITICAL: ${title}`;
  await Promise.all([
    message({ action: "send", target: "whatsapp", message: msg }),
    message({ action: "send", target: "email@example.com", message: msg })
  ]);
}
```

#### 🟠 High Priority (P1)
```javascript
async function highPriorityAlert(title) {
  const msg = `⚠️ ${title}`;
  await message({
    action: "send",
    target: "whatsapp",
    message: msg
  }).catch(() => {
    // Fallback to email if WhatsApp fails
    message({ action: "send", target: "email@example.com", message: msg });
  });
}
```

#### 🟡 Medium (P2) - Queue for Batch
```javascript
const p2Queue = [];
function queueMedium(title) {
  p2Queue.push({ time: new Date(), title });
  // Will batch and send every 4 hours
}
```

#### 🟢 Low (P3) - Queue for Daily Digest
```javascript
const p3Queue = [];
function queueLow(title) {
  p3Queue.push({ time: new Date(), title });
  // Will batch and send daily
}
```

### 3. Common Scenarios

| Scenario | Priority | Code |
|----------|----------|------|
| Server down | P0 | `await criticalAlert("API Server is DOWN")` |
| Backup done | P1 | `await highPriorityAlert("Database backup completed")` |
| Disk 80% | P2 | `queueMedium("Disk usage at 80%")` |
| Health check pass | P3 | `queueLow("Daily health check passed")` |

## Routing Decision Matrix

```
Priority  → Channels            → Batch?  → Retry?  → Use When
P0        → WhatsApp + Email   → No      → Yes     → CRITICAL
P1        → WhatsApp (fallback) → No      → Yes     → URGENT
P2        → Email              → Yes (4h) → No      → MEDIUM
P3        → Email              → Yes (24h)→ No      → INFO
```

## Channel Limits

**Don't exceed these:**

| Channel | Limit | What happens |
|---------|-------|--------------|
| WhatsApp | 10/hour, 100/day | Queued or fallback to email |
| Email | 50/day | Queued for next day |
| SMS | 5/day | Queued or dropped |

## Message Formatting

### WhatsApp
- ✅ Emoji: Use them! 🎉
- ❌ Markdown: Don't use
- Max: 4096 chars

**Example:**
```
✅ Backup Complete
Size: 45GB
Time: 12 min
```

### Email
- ✅ HTML formatting
- ✅ Headers & footers auto-added
- Max: No limit

**Example:**
```html
<h2>Backup Complete</h2>
<p><strong>Size:</strong> 45GB</p>
```

### Discord
- ✅ Use embeds
- ✅ Markdown
- Max: 2000 chars

### Telegram
- ✅ Markdown
- ✅ Emoji
- Max: 4096 chars

## Real-World Examples

### Database Backup Completed

```javascript
await highPriorityAlert("✅ Database backup completed - 45GB in 12 minutes");
```

Routes to: **WhatsApp** (primary) → Email (if WhatsApp fails)

### CPU Alert

```javascript
// High: immediate
if (cpuUsage > 90) {
  await highPriorityAlert(`🔴 CPU critical: ${cpuUsage}%`);
}
// Medium: batch in 4 hours
else if (cpuUsage > 75) {
  queueMedium(`⚠️ CPU high: ${cpuUsage}%`);
}
// Low: daily report
else {
  queueLow(`📊 CPU normal: ${cpuUsage}%`);
}
```

### Security Event

```javascript
await criticalAlert("Unauthorized login attempt from 192.168.1.100");
```

Routes to: **WhatsApp AND Email** (simultaneously)

## Throttling in Action

```javascript
// This will work (under 10/hour limit)
for (let i = 0; i < 5; i++) {
  await highPriorityAlert(`Alert ${i + 1}`);
}

// This might throttle (over 10/hour)
for (let i = 0; i < 20; i++) {
  await highPriorityAlert(`Alert ${i + 1}`);
}
// Messages 11-20 will be queued or use email fallback
```

## Testing Your Notifications

### Test P1 Routing

```javascript
// Should go to WhatsApp
await message({
  action: "send",
  target: "+1-555-TEST",  // Use real number
  message: "✅ Test notification"
});
```

### Test Fallback

```javascript
// Simulate WhatsApp failure, test email fallback
try {
  await message({
    action: "send",
    target: "invalid-whatsapp",
    message: "Test"
  });
} catch (err) {
  // Fallback
  await message({
    action: "send",
    target: "ops@example.com",
    message: "Test"
  });
}
```

### Monitor Throttling

```javascript
const limits = {
  whatsapp: { daily: 0, perDay: 100 },
  email: { daily: 0, perDay: 50 }
};

function trackSend(channel) {
  limits[channel].daily++;
  const remaining = limits[channel].perDay - limits[channel].daily;
  console.log(`${channel}: ${limits[channel].daily}/${limits[channel].perDay}`);
  return remaining > 0;
}

// Usage
if (trackSend("whatsapp")) {
  // Send WhatsApp
} else {
  // Use email fallback
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Message not sent to WhatsApp | Check E.164 format (+1-555-1234), throttling (10/hour), network |
| Message delayed (P1) | Check if WhatsApp failed, fallback to email should trigger |
| P2/P3 messages queued | This is expected! They batch (4h or 24h) |
| Throttling exceeded | Use fallback channel, queue for later, or increase limits |
| Formatting broken | Check channel rules: WhatsApp (no markdown), Email (HTML), etc. |

## Config Reference

```json
{
  "P0": {
    "channels": ["whatsapp", "email"],
    "batch": false,
    "retry": true
  },
  "P1": {
    "channels": ["whatsapp"],
    "fallback": ["email"],
    "batch": false,
    "retry": true
  },
  "P2": {
    "channels": ["email"],
    "batch": true,
    "batchInterval": "4h"
  },
  "P3": {
    "channels": ["email"],
    "batch": true,
    "batchInterval": "24h"
  }
}
```

## Next Steps

1. ✅ Read `SKILL.md` for detailed patterns
2. ✅ Check `TEST_EXECUTION.md` for real example
3. ✅ Copy templates above for your use case
4. ✅ Test with real message() calls
5. ✅ Monitor throttling in production

---

**Need help?** See `SKILL.md` for advanced patterns and integration examples.
