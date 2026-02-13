# Multi-Channel Notification Router Skill

**Route notifications to the right channels based on priority, throttling, and formatting rules.**

This is an OpenClaw skill for Shawn's TARS system that implements intelligent notification routing using the native `message()` tool.

## What It Does

Intelligently routes notifications across multiple channels:

- 🚨 **P0 (Critical)**: WhatsApp + Email immediately, with retry
- ⚠️ **P1 (High)**: WhatsApp first, email fallback if needed
- 📧 **P2 (Medium)**: Email, batched every 4 hours
- 📄 **P3 (Low)**: Email, batched daily

**Features:**
- ✅ Priority-based routing (P0-P3)
- ✅ Per-channel throttling enforcement
- ✅ Automatic fallback (WhatsApp → email)
- ✅ Message batching for non-urgent alerts
- ✅ Channel-specific formatting (emoji, markdown, length limits)
- ✅ Retry logic for critical alerts

## Files

| File | Purpose |
|------|---------|
| **SKILL.md** | Complete implementation guide with patterns and examples |
| **QUICKSTART.md** | 5-minute guide with copy-paste templates |
| **TEST_EXECUTION.md** | Test case proof for P1 routing |
| **README.md** | This file |

## Quick Example

Send a P1 (high-priority) notification:

```javascript
// P1: Route to WhatsApp with email fallback
await message({
  action: "send",
  target: "whatsapp",  // Primary channel
  message: "✅ Database backup completed - 45GB in 12 minutes"
});

// If WhatsApp fails/throttled, fallback to email:
// await message({
//   action: "send",
//   target: "ops@tars-system.local",
//   message: "✅ Database backup completed..."
// });
```

## Configuration

The skill uses `notification-routing.json` (in your workspace root):

```json
{
  "priorityRouting": {
    "P0": { "channels": ["whatsapp", "email"], "batch": false, "retry": true },
    "P1": { "channels": ["whatsapp"], "fallback": ["email"], "batch": false, "retry": true },
    "P2": { "channels": ["email"], "batch": true, "batchInterval": "4h" },
    "P3": { "channels": ["email"], "batch": true, "batchInterval": "24h" }
  },
  "throttling": {
    "whatsapp": { "perHour": 10, "perDay": 100 },
    "email": { "perDay": 50 },
    "sms": { "perDay": 5 }
  },
  "formatting": {
    "whatsapp": { "maxLength": 4096, "useEmoji": true, "useMarkdown": false },
    "email": { "format": "html", "includeHeader": true, "includeFooter": true },
    "discord": { "useEmbed": true, "maxLength": 2000 },
    "telegram": { "useMarkdown": true, "maxLength": 4096 }
  }
}
```

## How It Works

### 1. Identify Priority

```javascript
const priority = "P1";  // High priority
// Lookup rules: P1 → channels=[whatsapp], fallback=[email]
```

### 2. Check Throttling

```javascript
// WhatsApp: 10/hour, 100/day
// Current: 5/100 daily → ✓ OK to send
```

### 3. Format Message

```javascript
// WhatsApp rules: emoji enabled, 4096 char limit
// Message: "✅ Backup complete"
```

### 4. Route via message()

```javascript
// Send to WhatsApp (primary)
await message({
  action: "send",
  target: "whatsapp",  // E.164 format required
  message: "✅ Backup complete"
});

// If fails → fallback to email
if (error) {
  await message({
    action: "send",
    target: "ops@example.com",
    message: "✅ Backup complete"
  });
}
```

## Supported Channels

| Channel | Format | Limit | Config |
|---------|--------|-------|--------|
| WhatsApp | Emoji, plain text | 4096 chars, 10/hour | `"useEmoji": true, "useMarkdown": false` |
| Email | HTML | 50/day | `"format": "html", "includeHeader": true` |
| Discord | Embeds + markdown | 2000 chars | `"useEmbed": true` |
| Telegram | Markdown | 4096 chars | `"useMarkdown": true` |
| SMS | Plain text | 160 chars, 5/day | Plain text only |

## Common Patterns

### Pattern 1: Critical Alert (P0)

```javascript
async function criticalAlert(message) {
  // Send to BOTH channels immediately
  await Promise.all([
    message({ action: "send", target: "whatsapp", message }),
    message({ action: "send", target: "email@example.com", message })
  ]);
}

// Usage
await criticalAlert("🔴 CRITICAL: Server down!");
```

### Pattern 2: High Priority (P1)

```javascript
async function highPriorityAlert(msg) {
  try {
    // Try WhatsApp first
    return await message({
      action: "send",
      target: "whatsapp",
      message: msg
    });
  } catch (err) {
    // Fallback to email
    return await message({
      action: "send",
      target: "email@example.com",
      message: msg
    });
  }
}

// Usage
await highPriorityAlert("⚠️ Database backup completed");
```

### Pattern 3: Medium Priority (P2) - Batch

```javascript
const p2Queue = [];

function queueMedium(title, details) {
  p2Queue.push({ time: new Date(), title, details });
}

// Send batch every 4 hours
setInterval(async () => {
  if (p2Queue.length === 0) return;
  
  const digest = p2Queue
    .map(n => `• ${n.title}: ${n.details}`)
    .join("\n");
  
  await message({
    action: "send",
    target: "email@example.com",
    message: `Medium Priority Alerts\n\n${digest}`
  });
  
  p2Queue = [];
}, 4 * 60 * 60 * 1000);

// Usage
queueMedium("Disk Space", "Usage at 80% on /data");
```

### Pattern 4: Low Priority (P3) - Daily Digest

```javascript
const p3Queue = [];

function queueLow(title, details) {
  p3Queue.push({ time: new Date(), title, details });
}

// Send daily at 9 AM
const dailyTimer = setInterval(async () => {
  const now = new Date();
  if (now.getHours() === 9 && now.getMinutes() === 0) {
    if (p3Queue.length === 0) return;
    
    const digest = p3Queue
      .map(n => `• ${n.title}: ${n.details}`)
      .join("\n");
    
    await message({
      action: "send",
      target: "email@example.com",
      message: `Daily Status Report\n\n${digest}`
    });
    
    p3Queue = [];
  }
}, 60 * 1000);
```

## Test Case

### Scenario: Database Backup Notification

**Input:**
```javascript
sendNotification("Database backup completed", priority="P1")
```

**Configuration Applied:**
- Priority: P1
- Primary channel: WhatsApp
- Fallback channel: Email
- Formatting: Emoji enabled, no markdown
- Throttling: Check 1/100 daily
- Retry: Enabled

**Routing Decision:**
```
P1 priority detected
  ↓
Select WhatsApp (primary)
  ↓
Check throttling: 1/100 ✓
  ↓
Format message with emoji
  ↓
Call message(target="whatsapp", message="✅ Database backup completed")
  ↓
If fails → Fallback to email
  ↓
Update throttling: 2/100 daily
```

**Result:** Message sent to WhatsApp with email as fallback

See `TEST_EXECUTION.md` for complete test proof.

## Integration with OpenClaw

Use the native `message()` tool:

```javascript
// Full signature
message({
  action: "send",           // send, broadcast, react, poll
  target: "whatsapp",       // whatsapp, email, discord, telegram, sms
  message: "Your message"   // Content to send
});
```

## Getting Started

1. **Read QUICKSTART.md** for copy-paste templates (5 minutes)
2. **Read SKILL.md** for detailed patterns and advanced usage
3. **Check TEST_EXECUTION.md** for real example walkthrough
4. **Copy templates** and adapt to your use case
5. **Test** with real message() calls

## Use Cases

| Use Case | Priority | Pattern |
|----------|----------|---------|
| Security breach | P0 | Critical alert (all channels) |
| Server down | P1 | High priority (WhatsApp + fallback) |
| Disk warning | P2 | Medium (batch in 4h) |
| Health check | P3 | Low (daily digest) |
| Database backup | P1 | High priority (WhatsApp) |
| API errors | P0 | Critical (all channels) |
| Slow query | P2 | Medium (batch) |
| Status update | P3 | Low (daily) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Message not sent | Check E.164 format for WhatsApp (+1-555-1234), verify network |
| Throttled | Message queued or fallback to email, wait for rate limit window |
| Wrong channel | Verify priority level in config, check channel routing rules |
| Format issues | WhatsApp (no markdown), Email (HTML OK), Discord (embeds), Telegram (markdown OK) |
| Fallback not working | Ensure fallback channels configured in priority rules |

## Summary

**This skill provides:**
- ✅ Intelligent routing based on priority
- ✅ Multi-channel support (WhatsApp, email, Discord, Telegram, SMS)
- ✅ Throttling enforcement
- ✅ Automatic fallback
- ✅ Message batching for non-urgent alerts
- ✅ Channel-specific formatting

**For Shawn's TARS system:** Reliable, config-driven notification delivery with zero missed critical alerts.

---

**Questions?** See `SKILL.md` for implementation details or `QUICKSTART.md` for quick examples.

**Testing proof:** `TEST_EXECUTION.md` shows actual P1 routing test case.
