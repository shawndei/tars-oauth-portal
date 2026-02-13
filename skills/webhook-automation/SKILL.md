# Webhook-Based Automation

**Purpose:** Receives triggers from external services (Zapier, Make, n8n, IFTTT) and executes TARS actions automatically.

## How It Works

External services send HTTP POST requests to TARS webhook endpoints:
1. **Webhook receives** POST request with action payload
2. **Authenticates** request via secret token
3. **Parses** action from payload
4. **Executes** action (add task, send message, run research, etc.)
5. **Returns** result to caller

## Webhook Endpoints

Base URL: `http://localhost:18789/webhooks/` (or your gateway URL)

### Endpoint: `/webhooks/task`
**Purpose:** Add task to TASKS.md for autonomous execution

**Request:**
```json
POST /webhooks/task
Headers:
  Authorization: Bearer YOUR_WEBHOOK_SECRET
  Content-Type: application/json

Body:
{
  "action": "add_task",
  "task": "Research AI frameworks and create comparison",
  "priority": "high",
  "deadline": "2026-02-13",
  "expected": "Markdown table with comparisons"
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "task-1234567890",
  "message": "Task added to queue",
  "estimatedExecution": "within 15 minutes"
}
```

### Endpoint: `/webhooks/notify`
**Purpose:** Send notification to user

**Request:**
```json
POST /webhooks/notify
Headers:
  Authorization: Bearer YOUR_WEBHOOK_SECRET
  Content-Type: application/json

Body:
{
  "action": "notify",
  "priority": "P1",
  "title": "Gmail: New urgent email",
  "body": "From: boss@company.com",
  "data": {
    "subject": "Q4 Report Due Tomorrow",
    "from": "boss@company.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "channel": "whatsapp",
  "deliveredAt": "2026-02-12T23:01:00Z"
}
```

### Endpoint: `/webhooks/research`
**Purpose:** Trigger deep research

**Request:**
```json
POST /webhooks/research
Headers:
  Authorization: Bearer YOUR_WEBHOOK_SECRET
  Content-Type: application/json

Body:
{
  "action": "research",
  "topic": "Latest AI safety developments",
  "depth": 2,
  "format": "summary"
}
```

**Response:**
```json
{
  "success": true,
  "reportId": "research-1234567890",
  "status": "queued",
  "estimatedCompletion": "15-20 minutes"
}
```

### Endpoint: `/webhooks/execute`
**Purpose:** Execute arbitrary TARS action

**Request:**
```json
POST /webhooks/execute
Headers:
  Authorization: Bearer YOUR_WEBHOOK_SECRET
  Content-Type: application/json

Body:
{
  "action": "execute",
  "command": "web_search",
  "params": {
    "query": "OpenClaw latest updates",
    "count": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "results": [...]
  }
}
```

## Security

**Authentication:**
- All webhook endpoints require `Authorization: Bearer YOUR_WEBHOOK_SECRET` header
- Secret stored in `webhook-config.json` (generate random 32-char string)
- Requests without valid token return `401 Unauthorized`

**Rate Limiting:**
- Max 100 requests/hour per IP
- Max 1000 requests/day per token
- Exceeded limits return `429 Too Many Requests`

**Validation:**
- All payloads validated against schema
- Invalid payloads return `400 Bad Request`
- Unknown actions return `404 Not Found`

## Integration Examples

### Zapier: Gmail → TARS Notification
```
Trigger: New email in Gmail (filtered by label "Important")
Action: Webhook POST to /webhooks/notify
Payload:
{
  "action": "notify",
  "priority": "P1",
  "title": "Important Email",
  "body": "{{subject}}",
  "data": {
    "from": "{{from}}",
    "preview": "{{body_plain_preview}}"
  }
}
```

### Make: Calendar Event → TARS Meeting Prep
```
Trigger: Calendar event starting in 30 minutes
Action: Webhook POST to /webhooks/task
Payload:
{
  "action": "add_task",
  "task": "Prepare meeting notes for {{event_title}}",
  "priority": "high",
  "deadline": "{{event_start_time}}",
  "expected": "Meeting notes with attendee research"
}
```

### n8n: RSS Feed → TARS Research
```
Trigger: New RSS item matching keyword "AI"
Action: Webhook POST to /webhooks/research
Payload:
{
  "action": "research",
  "topic": "{{item_title}}",
  "depth": 1,
  "format": "brief"
}
```

### IFTTT: Tweet Mention → TARS Alert
```
Trigger: You're mentioned on Twitter
Action: Webhook POST to /webhooks/notify
Payload:
{
  "action": "notify",
  "priority": "P2",
  "title": "Twitter Mention",
  "body": "{{UserName}}: {{Text}}",
  "data": {
    "link": "{{LinkToTweet}}"
  }
}
```

## Configuration

**Location:** `workspace/webhook-config.json`

```json
{
  "enabled": true,
  "secret": "YOUR_WEBHOOK_SECRET_32_CHARS",
  "port": 18789,
  "basePath": "/webhooks",
  "rateLimits": {
    "perHour": 100,
    "perDay": 1000
  },
  "endpoints": {
    "task": true,
    "notify": true,
    "research": true,
    "execute": false
  },
  "logging": {
    "enabled": true,
    "logPath": "logs/webhooks.jsonl"
  }
}
```

## Setup Instructions

1. Generate webhook secret:
   ```powershell
   # Generate random 32-character secret
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
   ```

2. Update `webhook-config.json` with secret

3. Expose gateway (if using remote webhooks):
   - Option A: Use Tailscale (recommended for security)
   - Option B: Use ngrok/cloudflare tunnel
   - Option C: Direct port forward (least secure)

4. Configure external service (Zapier, Make, etc.) with:
   - Webhook URL: `http://YOUR_GATEWAY_URL:18789/webhooks/ENDPOINT`
   - Authorization header: `Bearer YOUR_WEBHOOK_SECRET`

5. Test with curl:
   ```powershell
   $headers = @{
     "Authorization" = "Bearer YOUR_WEBHOOK_SECRET"
     "Content-Type" = "application/json"
   }
   $body = @{
     action = "notify"
     priority = "P2"
     title = "Test Webhook"
     body = "This is a test"
   } | ConvertTo-Json
   
   Invoke-RestMethod -Uri "http://localhost:18789/webhooks/notify" -Method POST -Headers $headers -Body $body
   ```

## Files Created

- `webhook-handler.js` - Core webhook server
- `webhook-auth.js` - Authentication & rate limiting
- `webhook-actions.js` - Action executors
- `webhook-config.json` - Configuration

---

**Status:** ✅ Deployed (2026-02-12 23:02)  
**Confidence:** 100% (integrates with OpenClaw gateway HTTP server)
