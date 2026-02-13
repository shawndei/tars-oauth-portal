# WhatsApp Routing Fix - Deployment & Integration Guide

**Created:** 2026-02-13 13:25 GMT-7  
**Status:** Ready for Production Deployment  
**Estimated Downtime:** <2 minutes  
**Rollback Time:** <30 seconds  

---

## Quick Start

**TL;DR - For Experienced Operators:**

```bash
# 1. Backup current config
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup-20260213

# 2. Apply patches
jq -f config-patches/openclaw-json.patch ~/.openclaw/openclaw.json > /tmp/new-config.json
mv /tmp/new-config.json ~/.openclaw/openclaw.json

# 3. Restart gateway
openclaw gateway restart

# 4. Verify
openclaw status
openclaw doctor --channel-affinity

# 5. Test
# Send WhatsApp message → should reply via WhatsApp ✅
```

---

## Prerequisites

**System Requirements:**
- ✅ OpenClaw 2026.2.9 or later
- ✅ Gateway running and healthy
- ✅ WhatsApp connection stable
- ✅ 10MB free disk space (logs)
- ✅ Standard user permissions

**Required Access:**
- ✅ File system write access to ~/.openclaw
- ✅ Gateway restart capability
- ✅ Monitor read access

**Knowledge:**
- ✅ JSON configuration
- ✅ Basic troubleshooting
- ✅ Message logs interpretation

---

## Pre-Deployment Checklist

### Step 1: Verify System Health

```bash
# Check gateway status
openclaw status

# Expected output:
# ✅ OpenClaw: v2026.2.9 running
# ✅ Gateway: Connected (18789)
# ✅ WhatsApp: Linked (auth age 2m)
# ✅ Sessions: 2 active (main + 1 subagent)
```

### Step 2: Backup Current Configuration

```bash
# Create backup directory
mkdir -p ~/.openclaw/backups

# Backup main config
cp ~/.openclaw/openclaw.json ~/.openclaw/backups/openclaw-20260213-000.json

# Backup notification routing
cp ~/.openclaw/workspace/notification-routing.json ~/.openclaw/backups/notification-routing-20260213-000.json

echo "Backups created in ~/.openclaw/backups/"
```

### Step 3: Review Changes

```bash
# View patches that will be applied
cat workspace/config-patches/openclaw-json.patch
cat workspace/config-patches/notification-routing-json.patch

# Understand what changes:
# 1. Sub-agent context preservation enabled
# 2. WhatsApp health checks enabled
# 3. Channel affinity routing enabled
# 4. Audit logging enabled
```

### Step 4: Notify Users (Optional)

If this is a production system with active users:

```
📢 MAINTENANCE NOTICE

We're improving message routing to fix a bug where WhatsApp messages 
were being replied to via web chat instead of WhatsApp.

Expected downtime: <2 minutes
Time: 2026-02-13 13:30 GMT-7
Impact: Brief interruption of message processing

After fix:
✅ WhatsApp messages will reliably reply via WhatsApp
✅ Better message continuity
✅ More reliable channel handling
```

---

## Deployment Steps

### Phase 1: Pre-Deployment (5 minutes)

#### Step 1a: Verify Backup Safety

```bash
# Verify backup created successfully
ls -la ~/.openclaw/backups/

# Expected output shows recent backup files
```

#### Step 1b: Stop Gateway (Optional - Hot Reload)

**Option A: Hot Reload (Recommended)**
```bash
# No restart needed - changes apply on next message
# This is safest if system is stable
echo "Using hot reload - no restart needed"
```

**Option B: Graceful Restart**
```bash
# Stop accepting new messages
openclaw gateway pause

# Wait for current messages to complete
sleep 5

# Proceed with config update
```

---

### Phase 2: Configuration Update (2 minutes)

#### Step 2a: Update openclaw.json

**Option A: Using JSON Merge (Recommended)**

```bash
# Read current config
CURRENT=$(cat ~/.openclaw/openclaw.json)

# Apply patches manually (or use script)
# Add these fields to openclaw.json

# Create temporary file
cp ~/.openclaw/openclaw.json /tmp/openclaw-update.json

# Python script to apply patches
python3 << 'EOF'
import json

with open('/tmp/openclaw-update.json', 'r') as f:
    config = json.load(f)

# Add sub-agent context preservation
config['agents']['defaults']['subagents']['contextPreservation'] = {
    "preserveSourceChannel": True,
    "preserveChannelMetadata": True,
    "failoverStrategy": "source-first",
    "preservationChecks": {
        "onSpawn": True,
        "onResponse": True,
        "onFork": True
    }
}

# Add WhatsApp health checks
config['channels']['whatsapp']['sourceChannelAffinity'] = {
    "enabled": True,
    "priority": 100,
    "replyToSourceFirst": True
}

config['channels']['whatsapp']['healthCheck'] = {
    "enabled": True,
    "intervalSeconds": 30,
    "timeoutSeconds": 5,
    "retryOnFailure": True,
    "maxFailuresBeforeDown": 3,
    "autoReconnect": True,
    "reconnectDelayMs": 5000
}

config['channels']['whatsapp']['connectionMonitoring'] = {
    "enabled": True,
    "logStatus": True,
    "alertOnDown": True
}

# Add message channel affinity
config['messages']['channelAffinity'] = {
    "enabled": True,
    "sourceChannelPriority": 100,
    "preferSourceOverDefault": True,
    "auditLogging": {
        "enabled": True,
        "logFile": "logs/channel-routing.jsonl",
        "trackSource": True,
        "trackDestination": True,
        "trackDecisionLogic": True,
        "trackConnectionStatus": True,
        "trackExecutionTime": True
    }
}

with open('/tmp/openclaw-update.json', 'w') as f:
    json.dump(config, f, indent=2)

print("✅ Config updated successfully")
EOF

# Verify update
echo "Verifying configuration..."
python3 -m json.tool /tmp/openclaw-update.json > /dev/null && echo "✅ Valid JSON"

# Deploy update
mv /tmp/openclaw-update.json ~/.openclaw/openclaw.json
echo "✅ Configuration deployed"
```

**Option B: Manual Edit**

```bash
# Use your preferred text editor
nano ~/.openclaw/openclaw.json

# Add required fields (see CHANNEL_ROUTING_FIXES.md for complete schema)
# Ctrl+X to save (nano) or :wq (vim)
```

#### Step 2b: Update notification-routing.json

```bash
# Create backup
cp ~/.openclaw/workspace/notification-routing.json ~/.openclaw/workspace/notification-routing.json.backup-20260213

# Apply patches (see config-patches/notification-routing-json.patch)
# Or manually add:
# - "channelAffinity" section
# - "preserveSource": true to each priority level
# - "connectionStatus" section
```

**Python script to apply:**

```python
import json

with open('~/.openclaw/workspace/notification-routing.json', 'r') as f:
    config = json.load(f)

# Add channel affinity configuration
config['channelAffinity'] = {
    "enabled": True,
    "enforceSourceChannel": True,
    "sourceChannelPriority": 100,
    "fallbackDelay": 2000,
    "metrics": {
        "enabled": True,
        "trackAffinity": True,
        "trackFallbacks": True,
        "minAffinityTarget": 95.0,
        "alertOnLowAffinity": True
    }
}

# Add connection status tracking
config['connectionStatus'] = {
    "trackingEnabled": True,
    "updateInterval": 30000,
    "channels": {
        "whatsapp": {
            "required": True,
            "failoverAllowed": True,
            "criticalForP0": True,
            "criticalForP1": True
        },
        "email": {
            "required": True,
            "failoverAllowed": True
        },
        "webchat": {
            "fallbackOnly": True
        }
    }
}

# Update each priority level
for priority in ["P0", "P1", "P2", "P3"]:
    config["priorityRouting"][priority]["preserveSource"] = True
    if priority in ["P0", "P1"]:
        config["priorityRouting"][priority]["sourceChannelFirst"] = True

with open('~/.openclaw/workspace/notification-routing.json', 'w') as f:
    json.dump(config, f, indent=2)
```

#### Step 2c: Verify Configuration

```bash
# Validate JSON syntax
python3 -m json.tool ~/.openclaw/openclaw.json > /dev/null && echo "✅ openclaw.json valid"
python3 -m json.tool ~/.openclaw/workspace/notification-routing.json > /dev/null && echo "✅ notification-routing.json valid"

# Check required fields exist
echo "Checking for required fields..."
grep -q "contextPreservation" ~/.openclaw/openclaw.json && echo "✅ contextPreservation found"
grep -q "channelAffinity" ~/.openclaw/openclaw.json && echo "✅ channelAffinity found"
grep -q "healthCheck" ~/.openclaw/openclaw.json && echo "✅ healthCheck found"
```

---

### Phase 3: Gateway Restart (1 minute)

#### Step 3a: Restart Gateway

**Option A: Graceful Restart (Recommended)**

```bash
# Show current status
echo "Before restart:"
openclaw status

# Restart gateway
echo "Restarting gateway..."
openclaw gateway restart

# Wait for startup
sleep 3

# Verify restart successful
echo "After restart:"
openclaw status
```

**Option B: Manual Restart with Verification**

```bash
# Stop gateway
openclaw gateway stop
sleep 2

# Start gateway
openclaw gateway start
sleep 3

# Verify operational
openclaw status
openclaw doctor --fix
```

#### Step 3b: Verify Gateway Health

```bash
# Health check
openclaw doctor

# Expected output:
# ✅ Gateway: Running on port 18789
# ✅ WhatsApp: Connected
# ✅ Channel routing: Operational
# ✅ Health checks: Running
# ✅ Audit logging: Active
```

---

### Phase 4: Testing (5 minutes)

#### Step 4a: Basic Connectivity Test

```bash
# Verify WhatsApp connection
echo "Testing WhatsApp connection..."
curl -X GET http://localhost:18789/health \
  -H "Authorization: Bearer $(grep -o '"token":"[^"]*"' ~/.openclaw/openclaw.json | cut -d'"' -f4)" \
  -H "Content-Type: application/json"

# Expected: HTTP 200 with {"status": "healthy"}
```

#### Step 4b: Message Flow Test (Manual)

```
1. Send WhatsApp message from +17204873360:
   "Test message for routing fix"

2. Expected response:
   - Reply comes via WhatsApp ✅
   - NOT via web chat ❌

3. Check logs:
   grep "routing_logic.*reply-to-source" logs/channel-routing.jsonl

4. Verify metrics:
   grep "source_channel.*whatsapp" logs/channel-routing.jsonl | wc -l
   # Should show message was processed
```

#### Step 4c: Automated Test Suite (Optional)

```bash
# Run test suite if available
cd ~/.openclaw/workspace
python3 tests/test_channel_routing.py

# Expected output:
# test_whatsapp_source_tagging ... ok
# test_sub_agent_context_preservation ... ok
# test_reply_to_source_routing ... ok
# test_channel_affinity_metrics ... ok
# ====== 4 passed in 0.25s ======
```

#### Step 4d: Monitor Logs

```bash
# Watch channel routing decisions in real-time
tail -f ~/.openclaw/workspace/logs/channel-routing.jsonl

# Expected entries:
# {
#   "timestamp": "...",
#   "source_channel": "whatsapp",
#   "destination_channel": "whatsapp",
#   "routing_logic": "reply-to-source",
#   ...
# }
```

---

### Phase 5: Post-Deployment (Ongoing)

#### Step 5a: First 30 Minutes - Active Monitoring

```bash
# Monitor every 5 minutes
watch -n 5 'openclaw status'

# Watch for issues
tail -f ~/.openclaw/logs/boot.log | grep -i "error\|warning"

# Check affinity metrics
echo "Channel Affinity Report:"
jq -s 'group_by(.source_channel) | map({
  channel: .[0].source_channel,
  total: length,
  routed_correctly: map(select(.destination_channel == .source_channel)) | length
}) | .[] | "\(.channel): \(.routed_correctly)/\(.total) ✅"' logs/channel-routing.jsonl
```

#### Step 5b: First Hour - Continued Monitoring

```bash
# Verify no errors in gateway
grep -c "ERROR" ~/.openclaw/workspace/logs/boot.log

# Check health check status
tail -20 ~/.openclaw/workspace/monitoring_logs/monitoring_*.log | grep -i "health\|channel"

# Verify audit logging is working
wc -l ~/.openclaw/workspace/logs/channel-routing.jsonl
# Should be > 0 if messages processed
```

#### Step 5c: First 24 Hours - Daily Monitoring

```bash
# Generate affinity report
generate_affinity_report() {
  local logfile="~/.openclaw/workspace/logs/channel-routing.jsonl"
  echo "=== Channel Affinity Report ==="
  jq -s 'reduce .[] as $item ({}; 
    .[$item.source_channel] //= {total: 0, routed_to: {}} |
    .[$item.source_channel].total += 1 |
    .[$item.source_channel].routed_to[$item.destination_channel] //= 0 |
    .[$item.source_channel].routed_to[$item.destination_channel] += 1
  ) | 
  to_entries[] | 
  "\(.key): \(.value.routed_to[.key] // 0)/\(.value.total) correct routing"' "$logfile"
}

generate_affinity_report
```

---

## Rollback Procedure

**If issues occur, roll back immediately:**

```bash
# Step 1: Stop gateway
openclaw gateway stop

# Step 2: Restore backup
cp ~/.openclaw/backups/openclaw-20260213-000.json ~/.openclaw/openclaw.json
cp ~/.openclaw/backups/notification-routing-20260213-000.json ~/.openclaw/workspace/notification-routing.json

# Step 3: Restart
openclaw gateway start
sleep 3

# Step 4: Verify rollback
openclaw status
echo "✅ Rollback complete"
```

**Rollback is safe - takes <30 seconds total**

---

## Troubleshooting Guide

### Issue 1: Gateway Won't Start After Update

**Symptoms:**
- `openclaw status` shows gateway down
- `openclaw gateway start` fails

**Solution:**
```bash
# 1. Check JSON syntax
python3 -m json.tool ~/.openclaw/openclaw.json

# 2. If syntax error, restore backup
cp ~/.openclaw/backups/openclaw-20260213-000.json ~/.openclaw/openclaw.json

# 3. Restart
openclaw gateway restart

# 4. Contact support if persists
```

### Issue 2: WhatsApp Messages Still Going to Web Chat

**Symptoms:**
- WhatsApp message received
- Reply comes via web chat (not WhatsApp)

**Debug Steps:**
```bash
# 1. Check if configuration applied
grep "sourceChannelAffinity" ~/.openclaw/openclaw.json

# 2. Check if routing logs show correct decision
tail logs/channel-routing.jsonl | grep -o "routing_logic.*"

# 3. Verify WhatsApp connection
grep "whatsapp" ~/.openclaw/workspace/logs/boot.log | tail -5

# 4. Check for context loss in sub-agent
grep "source_channel" logs/channel-routing.jsonl | head -10
```

### Issue 3: High CPU Usage After Deployment

**Symptoms:**
- CPU usage jumps above 5%
- Gateway becomes sluggish

**Solution:**
```bash
# 1. Reduce health check frequency
# In openclaw.json, change:
# "intervalSeconds": 30  →  "intervalSeconds": 60

# 2. Or disable audit logging temporarily
# "auditLogging": { "enabled": false }

# 3. Restart gateway
openclaw gateway restart

# 4. Monitor CPU
top | grep openclaw
```

### Issue 4: Audit Logs Growing Too Fast

**Symptoms:**
- logs/channel-routing.jsonl growing rapidly
- Disk space warnings

**Solution:**
```bash
# 1. Archive old logs
gzip logs/channel-routing.jsonl
mv logs/channel-routing.jsonl.gz logs/channel-routing.$(date +%Y%m%d).jsonl.gz

# 2. Create new log file
touch logs/channel-routing.jsonl

# 3. Or disable detailed logging
# In openclaw.json, set "auditLogging": { "enabled": false }

# 4. Restart gateway
openclaw gateway restart
```

---

## Post-Deployment Validation

### Checklist (Complete All)

- [ ] **Gateway Health:** `openclaw status` shows all green ✅
- [ ] **Doctor Check:** `openclaw doctor` passes ✅
- [ ] **WhatsApp Connection:** Shows "Connected" ✅
- [ ] **Test Message Received:** Can accept WhatsApp message ✅
- [ ] **Test Message Replied:** Reply goes to WhatsApp (not web chat) ✅
- [ ] **Channel Routing Log:** `logs/channel-routing.jsonl` has entries ✅
- [ ] **Affinity Metrics:** Shows 100% for WhatsApp ✅
- [ ] **No Errors:** `grep ERROR logs/boot.log` returns nothing ✅
- [ ] **Normal CPU:** CPU <2% idle ✅
- [ ] **Normal Memory:** No memory leaks detected ✅

### Sign-Off

```bash
# If all checks pass:
echo "✅ DEPLOYMENT SUCCESSFUL"
echo "WhatsApp routing fix is now active"
echo "Channel affinity: 100% (WhatsApp → WhatsApp)"
echo "Next: Monitor for 24 hours and collect metrics"
```

---

## Monitoring Commands (Save for Later)

```bash
# Watch gateway health
watch -n 5 'openclaw status'

# Monitor routing decisions
tail -f logs/channel-routing.jsonl

# Generate hourly affinity report
for i in {1..24}; do 
  echo "Hour $i:"
  grep "$(date -d "$i hours ago" +%Y-%m-%d)T$(printf '%02d' $(($(date +%H) - $i))):" logs/channel-routing.jsonl | jq '.source_channel' | sort | uniq -c
done

# Check for any warnings/errors
grep "WARNING\|ERROR" logs/boot.log | tail -20

# View CPU/Memory usage
top -p $(pgrep -f "openclaw.*gateway") -b -n 1

# Check disk usage
du -sh logs/ monitoring_logs/
```

---

## Support & Escalation

**If deployment fails:**

1. **Check logs:** `tail -50 ~/.openclaw/workspace/logs/boot.log`
2. **Rollback immediately:** Use rollback procedure above
3. **Contact support** with:
   - Config changes made
   - Error messages from logs
   - Steps attempted
   - Rollback status

**Success indicators:**
- ✅ Gateway stable for >1 hour
- ✅ WhatsApp messages routing correctly
- ✅ No errors in logs
- ✅ Channel affinity >95%

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Collect baseline metrics
2. **Generate affinity report** - Verify routing working correctly
3. **Review audit logs** - Check for any anomalies
4. **Enable alerts** - Set up channel affinity alerts (threshold: >95%)
5. **Archive logs** - Compress old routing logs monthly

---

**Deployment Status:** ✅ Ready for Production  
**Last Updated:** 2026-02-13 13:25 GMT-7  
**Estimated Total Time:** 15-20 minutes  
**Rollback Time:** <30 seconds  
**Risk Level:** LOW (all changes are non-breaking)
