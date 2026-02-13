# Message Templates - UI/UX Enhancement System

## Overview

This document contains formatted message templates for all supported channels (Discord, WhatsApp, Telegram, Slack) demonstrating the full range of UI/UX enhancements.

---

## 1. SUCCESS NOTIFICATIONS

### Discord
```json
{
  "embeds": [{
    "title": "✅ Success",
    "description": "Database migration completed successfully",
    "color": 3066993,
    "fields": [
      {"name": "Duration", "value": "4m 32s", "inline": true},
      {"name": "Records", "value": "1,250,000", "inline": true},
      {"name": "Status", "value": "✅ All systems operational", "inline": false}
    ],
    "footer": {"text": "Completed at 2026-02-13 14:32 UTC"}
  }]
}
```

### WhatsApp
```
✅ DATABASE MIGRATION SUCCESS

Duration: 4m 32s
Records: 1,250,000

✓ All systems operational
✓ Backup verified
✓ Rollback available

Contact support with /help
```

### Telegram
```
*✅ Success*

*Database migration* completed successfully

• Duration: 4m 32s
• Records: 1,250,000
• Status: All systems operational
• Rollback available

_Completed at 2026-02-13 14:32 UTC_
```

### Slack
```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "✅ Database Migration Success"}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Duration:*\n4m 32s"},
        {"type": "mrkdwn", "text": "*Records:*\n1,250,000"},
        {"type": "mrkdwn", "text": "*Status:*\n✅ Operational"}
      ]
    },
    {
      "type": "context",
      "elements": [{"type": "mrkdwn", "text": "Completed at 2026-02-13 14:32 UTC"}]
    }
  ]
}
```

---

## 2. ERROR NOTIFICATIONS

### Discord
```json
{
  "embeds": [{
    "title": "❌ Error",
    "description": "Database connection failed",
    "color": 15158332,
    "fields": [
      {"name": "Reason", "value": "Connection timeout after 30s", "inline": false},
      {"name": "Error Code", "value": "ERR_CONN_TIMEOUT", "inline": true},
      {"name": "Retry", "value": "Auto-retry in 30s", "inline": true},
      {"name": "Support", "value": "Contact: support@example.com", "inline": false}
    ],
    "footer": {"text": "Failed at 2026-02-13 14:32 UTC"}
  }]
}
```

### WhatsApp
```
❌ ERROR

Database Connection Failed

Reason: Connection timeout after 30s
Code: ERR_CONN_TIMEOUT

Action: Retrying in 30 seconds...

Contact /support for help
```

### Telegram
```
*❌ Error*

*Database connection failed*

*Reason:* `Connection timeout after 30s`
*Error Code:* `ERR_CONN_TIMEOUT`
*Retry:* Auto-retry in 30s
*Support:* support@example.com

_Failed at 2026-02-13 14:32 UTC_
```

### Slack
```json
{
  "blocks": [
    {
      "type": "section",
      "text": {"type": "mrkdwn", "text": "*❌ Database Connection Failed*\nConnection timeout after 30s"}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Error Code:*\nERR_CONN_TIMEOUT"},
        {"type": "mrkdwn", "text": "*Retry:*\nAuto-retry in 30s"}
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {"type": "mrkdwn", "text": "📧 Support: support@example.com"}
    }
  ]
}
```

---

## 3. WARNING NOTIFICATIONS

### Discord
```json
{
  "embeds": [{
    "title": "⚠️ Warning",
    "description": "High resource usage detected",
    "color": 16776960,
    "fields": [
      {"name": "CPU", "value": "[████████░░] 85%", "inline": true},
      {"name": "Memory", "value": "[███████░░░] 72%", "inline": true},
      {"name": "Disk", "value": "[██████░░░░] 65%", "inline": true},
      {"name": "Action Required", "value": "Optimize queries or scale horizontally", "inline": false},
      {"name": "Recommendation", "value": "• Enable query caching\n• Increase connection pool\n• Review slow logs", "inline": false}
    ]
  }]
}
```

### WhatsApp
```
⚠️ WARNING: HIGH RESOURCE USAGE

CPU: [████████░░] 85%
Memory: [███████░░░] 72%
Disk: [██████░░░░] 65%

ACTION REQUIRED:
• Enable query caching
• Increase connection pool
• Review slow logs

Contact /support
```

### Telegram
```
*⚠️ Warning*

High resource usage detected

*CPU:* \[████████░░\] 85%
*Memory:* \[███████░░░\] 72%
*Disk:* \[██████░░░░\] 65%

*Recommendations:*
• Enable query caching
• Increase connection pool
• Review slow logs
```

### Slack
```json
{
  "blocks": [
    {
      "type": "section",
      "text": {"type": "mrkdwn", "text": "*⚠️ High Resource Usage*"}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*CPU:*\n[████████░░] 85%"},
        {"type": "mrkdwn", "text": "*Memory:*\n[███████░░░] 72%"},
        {"type": "mrkdwn", "text": "*Disk:*\n[██████░░░░] 65%"}
      ]
    },
    {
      "type": "section",
      "text": {"type": "mrkdwn", "text": "*Recommendations:*\n• Enable query caching\n• Increase connection pool\n• Review slow logs"}
    }
  ]
}
```

---

## 4. PROGRESS INDICATORS

### Discord
```json
{
  "embeds": [{
    "title": "⏳ Progress Update",
    "description": "Data synchronization in progress",
    "color": 7419530,
    "fields": [
      {"name": "Progress", "value": "[████████░░░░░░░░░░] 45% (9/20 syncs)", "inline": false},
      {"name": "Current Step", "value": "→ Syncing User Profiles", "inline": false},
      {"name": "Status", "value": "Running", "inline": true},
      {"name": "Elapsed", "value": "2m 15s", "inline": true},
      {"name": "ETA", "value": "~3m 30s remaining", "inline": true}
    ]
  }]
}
```

### WhatsApp
```
⏳ DATA SYNCHRONIZATION

Progress:
[████████░░░░░░░░░░] 45% (9/20)

Current: Syncing User Profiles

Status: Running
Elapsed: 2m 15s
ETA: ~3m 30s

Reply /status for details
```

### Telegram
```
*⏳ Data Synchronization*

`[████████░░░░░░░░░░] 45%` \\(9\\/20 syncs\\)

*Current Step:* → Syncing User Profiles

*Status:* Running
*Elapsed:* 2m 15s
*ETA:* ~3m 30s remaining
```

### Slack
```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "⏳ Data Synchronization"}
    },
    {
      "type": "section",
      "text": {"type": "mrkdwn", "text": "`[████████░░░░░░░░░░] 45%`\n9 of 20 syncs complete"}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Status:*\nRunning"},
        {"type": "mrkdwn", "text": "*Elapsed:*\n2m 15s"},
        {"type": "mrkdwn", "text": "*ETA:*\n~3m 30s"}
      ]
    }
  ]
}
```

---

## 5. STATUS DASHBOARDS

### Discord
```json
{
  "embeds": [{
    "title": "📊 System Status Dashboard",
    "description": "Real-time status overview",
    "color": 3447003,
    "fields": [
      {"name": "🟢 API Server", "value": "Operational - 99.98% uptime", "inline": true},
      {"name": "🟢 Database", "value": "Healthy - 15ms avg latency", "inline": true},
      {"name": "🟡 Cache", "value": "Degraded - 45% hit rate", "inline": true},
      {"name": "🟢 Queue", "value": "Processing - 245 jobs pending", "inline": true},
      {"name": "Recent Alerts", "value": "None", "inline": false},
      {"name": "Last Updated", "value": "2 minutes ago", "inline": true}
    ]
  }]
}
```

### WhatsApp
```
📊 SYSTEM STATUS

🟢 API Server
   ✓ Operational
   ✓ 99.98% uptime

🟢 Database
   ✓ Healthy
   ✓ 15ms latency

🟡 Cache
   ⚠ Degraded
   ⚠ 45% hit rate

🟢 Queue
   ✓ Processing
   ✓ 245 jobs pending

Recent Alerts: None
Updated: 2 min ago
```

### Telegram
```
*📊 System Status Dashboard*

*🟢 API Server*
✓ Operational
✓ 99\\.98% uptime

*🟢 Database*
✓ Healthy
✓ 15ms avg latency

*🟡 Cache*
⚠ Degraded
⚠ 45% hit rate

*🟢 Queue*
✓ Processing
✓ 245 jobs pending

Recent Alerts: None
_Last updated: 2 minutes ago_
```

### Slack
```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "📊 System Status Dashboard"}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*🟢 API Server*\nOperational\n99.98% uptime"},
        {"type": "mrkdwn", "text": "*🟢 Database*\nHealthy\n15ms latency"}
      ]
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*🟡 Cache*\nDegraded\n45% hit rate"},
        {"type": "mrkdwn", "text": "*🟢 Queue*\nProcessing\n245 jobs pending"}
      ]
    },
    {
      "type": "context",
      "elements": [{"type": "mrkdwn", "text": "✅ No alerts | _Updated 2 minutes ago_"}]
    }
  ]
}
```

---

## 6. INTERACTIVE BUTTONS

### Discord
```json
{
  "content": "Approve or reject this deployment request?",
  "components": [{
    "type": 1,
    "components": [
      {
        "type": 2,
        "label": "✅ Approve",
        "style": 3,
        "custom_id": "deploy_approve_prod"
      },
      {
        "type": 2,
        "label": "❌ Reject",
        "style": 4,
        "custom_id": "deploy_reject_prod"
      },
      {
        "type": 2,
        "label": "📋 Details",
        "style": 1,
        "custom_id": "deploy_details"
      }
    ]
  }]
}
```

### Telegram
```json
{
  "text": "Approve or reject this deployment request?",
  "parse_mode": "MarkdownV2",
  "reply_markup": {
    "inline_keyboard": [
      [
        {"text": "✅ Approve", "callback_data": "deploy_approve_prod"},
        {"text": "❌ Reject", "callback_data": "deploy_reject_prod"}
      ],
      [
        {"text": "📋 Details", "callback_data": "deploy_details"}
      ]
    ]
  }
}
```

### Slack
```json
{
  "blocks": [
    {
      "type": "section",
      "text": {"type": "mrkdwn", "text": "Approve or reject this deployment request?"}
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {"type": "plain_text", "text": "✅ Approve"},
          "value": "deploy_approve_prod",
          "style": "primary"
        },
        {
          "type": "button",
          "text": {"type": "plain_text", "text": "❌ Reject"},
          "value": "deploy_reject_prod",
          "style": "danger"
        },
        {
          "type": "button",
          "text": {"type": "plain_text", "text": "📋 Details"},
          "value": "deploy_details"
        }
      ]
    }
  ]
}
```

---

## 7. MULTI-STEP OPERATION

### Discord Progress Sequence
```json
{
  "embeds": [{
    "title": "🔄 Backup & Restore Operation",
    "description": "Multi-step database operation in progress",
    "color": 3066993,
    "fields": [
      {"name": "Step 1: Backup", "value": "✅ Complete - 8.3 GB", "inline": false},
      {"name": "Step 2: Validation", "value": "✅ Complete - All checksums verified", "inline": false},
      {"name": "Step 3: Restore", "value": "→ In Progress... 60% complete", "inline": false},
      {"name": "Step 4: Verify", "value": "⏳ Pending", "inline": false},
      {"name": "Overall Progress", "value": "[████████████░░░░░░░░░░░░░░] 60% (3/5 steps)", "inline": false}
    ]
  }]
}
```

### WhatsApp Sequence
```
🔄 BACKUP & RESTORE OPERATION

Step 1: Backup
✓ Complete - 8.3 GB

Step 2: Validation
✓ Complete - All checksums verified

Step 3: Restore
→ In Progress... 60%

Step 4: Verify
⏳ Pending

Overall: [████████████░░░░░░░░░░░░░░] 60%

Reply /cancel to abort
```

---

## 8. RICH CODE BLOCK EXAMPLE

### Discord
````json
{
  "embeds": [{
    "title": "📝 Deployment Logs",
    "description": "Latest deployment output",
    "color": 3447003,
    "fields": [
      {
        "name": "Build Output",
        "value": "```\n✓ Compiling TypeScript... (2.3s)\n✓ Building Docker image... (4.1s)\n✓ Running tests... (12.4s)\n✓ Pushing to registry... (5.2s)\n✅ Build complete in 24.0s\n```",
        "inline": false
      }
    ]
  }]
}
````

### Telegram
```
*📝 Deployment Logs*

```
✓ Compiling TypeScript... (2.3s)
✓ Building Docker image... (4.1s)
✓ Running tests... (12.4s)
✓ Pushing to registry... (5.2s)
✅ Build complete in 24.0s
```

_Deployment ID: deploy_20260213_001_
```

---

## 9. TABLE FORMAT EXAMPLE

### Discord (Using Code Block)
```json
{
  "embeds": [{
    "title": "📊 Performance Metrics",
    "description": "Key performance indicators",
    "fields": [{
      "name": "Metrics Table",
      "value": "```\nMetric          Current    Baseline   Status\n─────────────────────────────────────────────\nResponse Time    145ms      120ms      ⚠️  HIGH\nThroughput       8,450 rps  10,000 rps ⚠️  LOW\nError Rate       0.12%      0.05%      ⚠️  HIGH\nAvailability     99.97%     99.95%     ✅ GOOD\n```",
      "inline": false
    }]
  }]
}
```

### Slack (Using Block Kit)
```json
{
  "blocks": [
    {
      "type": "section",
      "text": {"type": "mrkdwn", "text": "*📊 Performance Metrics*\n```\nMetric          Current    Baseline   Status\n─────────────────────────────────────────────\nResponse Time    145ms      120ms      ⚠️\nThroughput       8,450 rps  10,000 rps ⚠️\nError Rate       0.12%      0.05%      ⚠️\nAvailability     99.97%     99.95%     ✅\n```"}
    }
  ]
}
```

---

## Implementation Notes

### Discord
- Maximum embed description: 4096 characters
- Up to 25 fields per embed, max 1024 chars each
- Support for button components and select menus
- Color codes use decimal RGB (0-16777215)

### WhatsApp
- Plain text only - use UPPERCASE for emphasis
- Use emoji extensively for visual hierarchy
- Avoid special characters that may not render
- Keep messages concise (≤1000 chars recommended)

### Telegram
- MarkdownV2 requires escaping: `_*[]()~`\`` 
- Callback data limited to 64 bytes
- Inline keyboard buttons support emojis
- Code blocks preserve formatting

### Slack
- Block Kit supports rich layouts
- Use mrkdwn text type for markdown
- Block text max 3000 characters
- Context blocks show secondary information

---

## Testing Guide

1. **Success Case**: Send success template and verify emoji + formatting
2. **Error Case**: Trigger error and verify error details display correctly
3. **Progress**: Send progress indicator and verify bar renders correctly
4. **Buttons**: Click buttons and verify callback data is received
5. **Dashboard**: Load dashboard and verify all metrics update
6. **Multi-step**: Run multi-step operation and verify each step updates

---

## Best Practices

- **Always include context**: What is happening, why, what's next?
- **Use consistent emoji**: Same icons for same actions across all messages
- **Estimate time**: When possible, provide time estimates for operations
- **Provide options**: Always give users a clear next action or choice
- **Keep it readable**: Don't overload with information; use progressive disclosure
- **Test per channel**: Each platform has different rendering capabilities

