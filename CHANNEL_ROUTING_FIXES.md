# CHANNEL ROUTING FIXES - Implementation Guide

**Created:** 2026-02-13 13:05 GMT-7  
**Status:** Ready for Deployment  
**Priority:** CRITICAL  

---

## Overview

This document describes all code and configuration changes needed to fix the WhatsApp routing issue.

---

## Fix 1: Add Source Channel Metadata to Session Schema

### Location
`Message model / Session context handling`

### Problem
Session messages don't include source channel information.

### Solution

**Change session creation to include:**
```json
{
  "id": "msg-123",
  "text": "User message",
  "from": "+17204873360",
  "timestamp": "2026-02-13T12:57:00Z",
  "source_channel": "whatsapp",
  "channel_metadata": {
    "incoming_channel": "whatsapp",
    "incoming_number": "+17204873360",
    "reply_channel": "whatsapp",
    "channel_status": "active",
    "connection_verified": true
  },
  "context_id": "session-abc123"
}
```

### Implementation

**In gateway webhook handler (pseudo-code):**
```javascript
function handleIncomingWhatsAppMessage(webhookData) {
  const message = {
    text: webhookData.body,
    from: webhookData.sender,
    timestamp: Date.now(),
    // ADD THESE:
    source_channel: "whatsapp",
    channel_metadata: {
      incoming_channel: "whatsapp",
      incoming_number: webhookData.sender,
      reply_channel: "whatsapp",
      channel_status: "active",
      connection_verified: true
    }
  };
  
  // Store in session
  sessionContext.messages.push(message);
  return message;
}
```

### Verification
- [ ] Source channel is set to "whatsapp" for all WhatsApp messages
- [ ] Metadata persists in session file
- [ ] Message history includes channel info

---

## Fix 2: Preserve Channel Context in Sub-Agent Spawn

### Location
`Sub-agent creation / context fork logic`

### Problem
When main agent spawns sub-agent, channel metadata is not transferred.

### Solution

**Modify sub-agent context initialization:**
```javascript
function spawnSubAgent(parentContext, taskType) {
  // CURRENT: Only copies task and basic context
  const subAgentContext = {
    task: taskType,
    sessionId: parentContext.sessionId,
    // MISSING: source_channel
  };
  
  // FIXED: Include channel preservation
  const subAgentContext = {
    task: taskType,
    sessionId: parentContext.sessionId,
    // ADD CHANNEL INFO:
    source_channel: parentContext.source_channel || "web-chat",
    channel_metadata: parentContext.channel_metadata || {},
    reply_channel: parentContext.source_channel || "web-chat"
  };
  
  // Pass to sub-agent
  return createSubAgent(subAgentContext);
}
```

### Configuration Update (openclaw.json)

Add to `agents.defaults.subagents`:
```json
{
  "maxConcurrent": 5,
  "archiveAfterMinutes": 30,
  "model": "anthropic/claude-haiku-4-5",
  "thinking": "low",
  "contextPreservation": {
    "preserveSourceChannel": true,
    "preserveChannelMetadata": true,
    "failoverStrategy": "source-first"
  }
}
```

### Verification
- [ ] Sub-agent receives parent's source_channel
- [ ] Sub-agent responses tagged with same channel
- [ ] Multi-level sub-agents preserve channel through all levels
- [ ] Channel persists in sub-agent session logs

---

## Fix 3: Implement Reply-to-Source Routing Logic

### Location
`Message tool / response routing decision`

### Problem
Reply routing doesn't check source channel.

### Solution

**Create routing decision function:**
```javascript
function getReplyChannel(context) {
  // STEP 1: Check if source channel available and active
  if (context.source_channel && isChannelActive(context.source_channel)) {
    return context.source_channel;  // Prefer source (channel affinity)
  }
  
  // STEP 2: Check if reply_channel explicitly set
  if (context.reply_channel && isChannelActive(context.reply_channel)) {
    return context.reply_channel;
  }
  
  // STEP 3: Fall back based on priority/alertness
  if (context.priority === "P0" || context.priority === "P1") {
    // Critical alerts: prefer WhatsApp
    if (isChannelActive("whatsapp")) {
      return "whatsapp";
    }
  }
  
  // STEP 4: Final fallback to web-chat
  return "web-chat";
}

function isChannelActive(channel) {
  // Check connection status
  const connectionStatus = getChannelStatus(channel);
  return connectionStatus === "connected" && !connectionStatus.throttled;
}
```

**Message tool integration:**
```javascript
function message(options) {
  // If channel not explicitly specified, derive from context
  if (!options.channel) {
    options.channel = getReplyChannel(executionContext);
  }
  
  // Validate channel is active
  if (!isChannelActive(options.channel)) {
    // Implement fallback
    options.channel = getReplyChannel({
      ...executionContext,
      [executionContext.source_channel]: false  // Mark source unavailable
    });
  }
  
  // Add routing metadata for audit trail
  options._routing_metadata = {
    source_channel: executionContext.source_channel,
    requested_channel: options.channel,
    routing_decision: "reply-to-source",
    timestamp: Date.now()
  };
  
  // Send message
  return sendMessage(options);
}
```

### Configuration (notification-routing.json)

Add channel affinity rules:
```json
{
  "enabled": true,
  "channelAffinity": {
    "enabled": true,
    "preferSourceChannel": true,
    "sourceChannelPriority": 100,
    "fallbackDelay": 2000
  },
  "defaultChain": ["source-channel", "whatsapp", "email"],
  "priorityRouting": {
    "P0": {
      "channels": ["whatsapp", "email"],
      "preserveSource": true,
      "retry": true
    },
    "P1": {
      "channels": ["source-channel"],
      "fallback": ["whatsapp", "email"],
      "preserveSource": true,
      "retry": true
    },
    "P2": {
      "channels": ["source-channel"],
      "fallback": ["email"],
      "preserveSource": true,
      "batch": true,
      "batchInterval": "4h"
    },
    "P3": {
      "channels": ["source-channel"],
      "fallback": ["email"],
      "preserveSource": true,
      "batch": true,
      "batchInterval": "24h"
    }
  }
}
```

### Verification
- [ ] Messages routed to source channel first
- [ ] Fallback only when source unavailable
- [ ] Channel affinity metric = 100% for normal messages
- [ ] Connection status check works
- [ ] Audit trail shows routing decisions

---

## Fix 4: Add Connection Status Monitoring

### Location
`Gateway / channel management`

### Solution

**Create channel status tracker:**
```javascript
const channelStatus = {
  whatsapp: {
    connected: true,
    lastCheck: Date.now(),
    failureCount: 0,
    throttled: false,
    messageQueue: []
  },
  "web-chat": {
    connected: true,
    lastCheck: Date.now(),
    failureCount: 0,
    throttled: false,
    messageQueue: []
  },
  email: {
    connected: true,
    lastCheck: Date.now(),
    failureCount: 0,
    throttled: false,
    messageQueue: []
  }
};

function updateChannelStatus(channel, isHealthy) {
  const status = channelStatus[channel];
  
  if (isHealthy) {
    status.failureCount = 0;
    status.connected = true;
    
    // Flush queued messages when connection restored
    while (status.messageQueue.length > 0) {
      const msg = status.messageQueue.shift();
      sendMessage({...msg, channel});
    }
  } else {
    status.failureCount++;
    status.connected = status.failureCount < 3;  // Allow 2 failures before marking down
    
    if (!status.connected) {
      // Channel marked as down - queue for retry
      logEvent("channel_down", {channel, failure_count: status.failureCount});
    }
  }
  
  status.lastCheck = Date.now();
}

// Health check (run every 30 seconds)
setInterval(() => {
  for (const [channel, status] of Object.entries(channelStatus)) {
    checkChannelHealth(channel).then(isHealthy => {
      updateChannelStatus(channel, isHealthy);
    });
  }
}, 30000);
```

### Configuration

Add to `openclaw.json`:
```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "allowlist",
      "selfChatMode": false,
      "allowFrom": ["+17204873360", "+17205252675"],
      "groupPolicy": "allowlist",
      "mediaMaxMb": 50,
      "debounceMs": 0,
      "healthCheck": {
        "enabled": true,
        "intervalSeconds": 30,
        "timeoutSeconds": 5,
        "retryOnFailure": true,
        "maxFailuresBeforeDown": 3
      }
    },
    "web-chat": {
      "healthCheck": {
        "enabled": true,
        "intervalSeconds": 30,
        "timeoutSeconds": 5,
        "retryOnFailure": false,
        "maxFailuresBeforeDown": 10
      }
    }
  }
}
```

### Verification
- [ ] Health check runs every 30 seconds
- [ ] Channel status updates correctly
- [ ] Messages queued when channel down
- [ ] Queued messages resent when connection restored
- [ ] Status accessible via `openclaw status` command

---

## Fix 5: Add Channel Affinity Metrics

### Location
`Monitoring / metrics collection`

### Solution

**Create metrics tracker:**
```javascript
const channelAfinityMetrics = {
  total_messages_received: 0,
  messages_by_channel: {
    whatsapp: 0,
    email: 0,
    webchat: 0
  },
  replies_by_source_channel: {
    whatsapp: {
      routed_to_whatsapp: 0,
      routed_to_webchat: 0,
      routed_to_email: 0,
      affinity_percent: 0
    },
    email: {
      routed_to_email: 0,
      routed_to_whatsapp: 0,
      routed_to_webchat: 0,
      affinity_percent: 0
    },
    webchat: {
      routed_to_webchat: 0,
      routed_to_whatsapp: 0,
      routed_to_email: 0,
      affinity_percent: 0
    }
  },
  fallback_count: 0,
  fallback_reasons: {},
  routing_decisions: [],
  last_updated: Date.now()
};

function recordMessageRoute(sourceChannel, destinationChannel) {
  channelAfinityMetrics.total_messages_received++;
  channelAfinityMetrics.messages_by_channel[sourceChannel]++;
  
  const reply = `routed_to_${destinationChannel}`;
  channelAfinityMetrics.replies_by_source_channel[sourceChannel][reply]++;
  
  // Calculate affinity percent
  const sourceStats = channelAfinityMetrics.replies_by_source_channel[sourceChannel];
  const totalReplies = Object.values(sourceStats).reduce((a,b) => a+b, 0) - sourceStats.affinity_percent;
  sourceStats.affinity_percent = sourceStats[`routed_to_${sourceChannel}`] / totalReplies * 100;
  
  channelAfinityMetrics.routing_decisions.push({
    source: sourceChannel,
    destination: destinationChannel,
    timestamp: Date.now()
  });
}

// Save metrics every 5 minutes
setInterval(() => {
  saveMetrics(channelAfinityMetrics);
}, 5 * 60 * 1000);
```

**Monitoring output:**
```bash
=== CHANNEL AFFINITY METRICS ===
Total Messages: 150

WhatsApp: 120 received
  → Routed to WhatsApp: 120 (100% affinity) ✅
  → Routed to Web Chat: 0
  → Routed to Email: 0

Email: 20 received  
  → Routed to Email: 18 (90% affinity) ✅
  → Routed to WhatsApp: 2
  → Routed to Web Chat: 0

Web Chat: 10 received
  → Routed to Web Chat: 9 (90% affinity) ✅
  → Routed to WhatsApp: 1
  → Routed to Email: 0

Overall Channel Affinity: 96.7% ✅
Fallback Events: 5 (3.3%)
```

### Verification
- [ ] Metrics tracked for all messages
- [ ] Affinity calculated correctly
- [ ] Fallback reasons logged
- [ ] Metrics accessible via monitoring dashboard
- [ ] Alerts if affinity drops below 95%

---

## Fix 6: Add Comprehensive Audit Logging

### Location
`Logging system / audit trail`

### Solution

Create new log file: `logs/channel-routing.jsonl`

```javascript
function logRoutingDecision(metadata) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message_id: metadata.messageId,
    source_channel: metadata.sourceChannel,
    destination_channel: metadata.destinationChannel,
    routing_logic: metadata.routingLogic,  // "source-first", "fallback", etc.
    subagent_involved: !!metadata.subAgentId,
    subagent_id: metadata.subAgentId,
    connection_status: {
      whatsapp: getChannelStatus("whatsapp").connected,
      email: getChannelStatus("email").connected,
      webchat: getChannelStatus("webchat").connected
    },
    session_id: metadata.sessionId,
    user_id: metadata.userId,
    priority: metadata.priority,
    execution_time_ms: metadata.executionTimeMs
  };
  
  appendLog("logs/channel-routing.jsonl", logEntry);
}

// Every message routed calls this
logRoutingDecision({
  messageId: context.messageId,
  sourceChannel: context.source_channel,
  destinationChannel: selectedChannel,
  routingLogic: "reply-to-source",
  subAgentId: context.subagent_id,
  sessionId: context.sessionId,
  userId: context.user_id,
  priority: context.priority,
  executionTimeMs: Date.now() - startTime
});
```

**Audit query examples:**
```bash
# Find all WhatsApp messages routed to web chat (the bug)
grep "source_channel.*whatsapp.*destination_channel.*webchat" logs/channel-routing.jsonl

# Calculate affinity for WhatsApp over last 24 hours
jq 'select(.source_channel == "whatsapp") | .destination_channel' logs/channel-routing.jsonl \
  | sort | uniq -c

# Find fallback events
grep "fallback" logs/channel-routing.jsonl
```

### Verification
- [ ] All routing decisions logged
- [ ] Audit trail includes source and destination channel
- [ ] Connection status logged for each decision
- [ ] Sub-agent involvement tracked
- [ ] Timing metrics collected

---

## Configuration Changes Summary

### File: openclaw.json

**Add/Modify:**
```json
{
  "agents": {
    "defaults": {
      "subagents": {
        "contextPreservation": {
          "preserveSourceChannel": true,
          "preserveChannelMetadata": true,
          "failoverStrategy": "source-first"
        }
      }
    }
  },
  "channels": {
    "whatsapp": {
      "healthCheck": {
        "enabled": true,
        "intervalSeconds": 30,
        "timeoutSeconds": 5,
        "retryOnFailure": true,
        "maxFailuresBeforeDown": 3
      }
    }
  }
}
```

### File: notification-routing.json

**Add/Modify:**
```json
{
  "channelAffinity": {
    "enabled": true,
    "preferSourceChannel": true,
    "sourceChannelPriority": 100,
    "fallbackDelay": 2000
  },
  "priorityRouting": {
    "P1": {
      "preserveSource": true
    }
  }
}
```

### New File: monitoring/channel-affinity-config.json

```json
{
  "metrics": {
    "trackAffinity": true,
    "trackFallbacks": true,
    "trackConnectionStatus": true
  },
  "alerts": {
    "affinityThreshold": 95,
    "affinityCheckInterval": 3600,
    "lowAffinityAlert": true
  },
  "reportingInterval": 3600,
  "archiveAfter": 2592000
}
```

---

## Implementation Checklist

### Phase 1: Core Fixes (Implement First)
- [ ] Add source_channel to message schema
- [ ] Tag WhatsApp messages with source_channel
- [ ] Preserve channel in sub-agent context
- [ ] Implement reply-to-source routing logic
- [ ] Update message() tool integration
- [ ] Test single channel workflow (WhatsApp)

### Phase 2: Reliability (Implement Second)
- [ ] Add connection status monitoring
- [ ] Implement health checks for all channels
- [ ] Create fallback strategy
- [ ] Add channel affinity metrics
- [ ] Implement audit logging
- [ ] Test multi-channel failover

### Phase 3: Optimization (Implement Third)
- [ ] Performance test routing decision (<100ms)
- [ ] Load test multi-channel messages
- [ ] Create monitoring dashboard
- [ ] Document best practices
- [ ] Create runbook for troubleshooting

---

## Testing Requirements

### Unit Tests
- [ ] Source channel tagging for WhatsApp messages
- [ ] Sub-agent context preservation
- [ ] Routing logic with various channel states
- [ ] Metrics calculation
- [ ] Audit logging

### Integration Tests
- [ ] Message flow from WhatsApp to WhatsApp reply
- [ ] Message flow from Web Chat to Web Chat reply
- [ ] Channel fallback when primary unavailable
- [ ] Sub-agent spawning preserves channel
- [ ] Multi-level sub-agents preserve channel

### End-to-End Tests
- [ ] Real WhatsApp message triggers response to WhatsApp
- [ ] Web Chat message triggers response to Web Chat
- [ ] Channel affinity metrics show 100%
- [ ] Audit trail contains all routing decisions
- [ ] Rapid multi-channel messages handled correctly

---

## Rollback Plan

If issues arise:

1. **Keep copy of original openclaw.json**
2. **Revert message tool to original behavior**
3. **Disable channel affinity** (set `preserveSourceChannel: false`)
4. **Monitor for impact**
5. **Roll back routing logic**

```bash
# Rollback
cp openclaw.json.bak openclaw.json
openclaw gateway restart
```

---

## Deployment Notes

- Deploy during maintenance window (off-peak)
- Monitor channel affinity metrics for 1 hour post-deploy
- Keep alert thresholds conservative initially
- Have runbook ready for troubleshooting
- Monitor session logs for any context loss
- Track fallback events closely
