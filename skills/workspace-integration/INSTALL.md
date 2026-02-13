# Workspace Integration - Installation Guide

**Quick installation guide for Gmail and Google Calendar integrations.**

---

## Prerequisites

- ✅ Node.js v24.13.0 or higher
- ✅ OAuth portal operational (`https://tars-oauth-api.railway.app`)
- ✅ Google account with Gmail and Calendar enabled
- ✅ OAuth2 credentials configured in portal

---

## Step-by-Step Installation

### 1. Navigate to Workspace Integration

```bash
cd skills/workspace-integration
```

### 2. Install Gmail Dependencies

```bash
cd gmail
npm install
```

**Expected output:**
```
added 150 packages in 5s
```

### 3. Install Calendar Dependencies

```bash
cd ../calendar
npm install
```

**Expected output:**
```
added 150 packages in 5s
```

### 4. Configure OAuth Endpoints

The configuration files are already set up:
- `gmail-config.json` - Gmail settings
- `calendar-config.json` - Calendar settings

Both point to: `https://tars-oauth-api.railway.app`

**Verify OAuth portal is online:**
```bash
curl https://tars-oauth-api.railway.app/health
```

Expected: `200 OK`

### 5. (Optional) Customize Settings

Edit configuration files to customize:

**Gmail (`gmail-config.json`):**
- Add VIP email addresses
- Adjust morning briefing settings
- Configure email filters

**Calendar (`calendar-config.json`):**
- Set working hours
- Configure meeting prep lead time
- Adjust scheduling preferences

### 6. Test Gmail Integration

```bash
cd gmail
node test-gmail.js
```

**Expected output:**
```
🧪 Gmail Integration Test Suite
============================================================

📋 Test 1: Initialize Gmail Client
------------------------------------------------------------
✅ PASS
Message: Gmail client initialized

📋 Test 2: Test OAuth Connection
------------------------------------------------------------
✅ PASS
Email: your-email@gmail.com
Total Messages: 1234
Total Threads: 890

...

🎉 All tests passed!
```

### 7. Test Calendar Integration

```bash
cd ../calendar
node test-calendar.js
```

**Expected output:**
```
🧪 Google Calendar Integration Test Suite
============================================================

📋 Test 1: Initialize Calendar Client
------------------------------------------------------------
✅ PASS
Message: Calendar client initialized

📋 Test 2: Test OAuth Connection
------------------------------------------------------------
✅ PASS
Email: your-email@gmail.com
Calendars: 3
Timezone: America/Mazatlan

...

🎉 All tests passed!
```

### 8. Test Morning Briefing

```bash
cd ..
node morning-briefing-workflow.js
```

**Expected output:**
```
📊 Generating morning briefing...

📧 Fetching email summary...
📅 Fetching calendar summary...

═══════════════════════════════════════════════════════════
📊 MORNING BRIEFING
═══════════════════════════════════════════════════════════

[Briefing content displayed here]

═══════════════════════════════════════════════════════════
```

---

## Verification Checklist

After installation, verify:

- [ ] Gmail client initializes without errors
- [ ] Calendar client initializes without errors
- [ ] OAuth connection test passes
- [ ] Emails can be fetched
- [ ] Calendar events can be fetched
- [ ] Morning briefing generates successfully
- [ ] No error messages in console

---

## Troubleshooting

### Problem: "ENOENT: no such file or directory, open 'gmail-config.json'"

**Solution:**
```bash
# Copy sample config from workspace root
cp ../../gmail-config.json ./gmail/
cp ../../calendar-config.json ./calendar/
```

### Problem: "Failed to fetch token: 503 Service Unavailable"

**Solution:**
1. Check OAuth portal status: `https://tars-oauth-api.railway.app`
2. Wait 1 minute and retry
3. Verify backend is deployed and running

### Problem: "Module not found: googleapis"

**Solution:**
```bash
# Reinstall dependencies
cd gmail
rm -rf node_modules package-lock.json
npm install

cd ../calendar
rm -rf node_modules package-lock.json
npm install
```

### Problem: "Token expired"

**Solution:**
Token refresh is automatic. If you see this error repeatedly:
1. Clear token cache
2. Re-authenticate via OAuth portal
3. Restart the application

---

## Quick Start Commands

```bash
# Install everything
cd skills/workspace-integration
cd gmail && npm install && cd ..
cd calendar && npm install && cd ..

# Run all tests
cd gmail && node test-gmail.js && cd ..
cd calendar && node test-calendar.js && cd ..
node morning-briefing-workflow.js

# Daily use
node morning-briefing-workflow.js
```

---

## Integration with TARS

### Add to Heartbeat

Edit `HEARTBEAT.md`:

```markdown
## Morning Briefing (Daily 9:00 AM)
cd skills/workspace-integration
node morning-briefing-workflow.js
```

### Add to Cron

```bash
# Add to crontab
0 9 * * * cd /path/to/workspace/skills/workspace-integration && node morning-briefing-workflow.js
```

### Add to Triggers

Edit `triggers.json`:

```json
{
  "id": "morning-briefing",
  "name": "Morning Briefing",
  "schedule": "0 9 * * *",
  "command": "node skills/workspace-integration/morning-briefing-workflow.js"
}
```

---

## Uninstallation

To remove workspace integration:

```bash
cd skills/workspace-integration
rm -rf gmail/node_modules calendar/node_modules
rm -rf gmail calendar morning-briefing-workflow.js
```

---

## Next Steps

1. **Customize VIP List** - Add important senders to `gmail-config.json`
2. **Set Working Hours** - Configure your schedule in `calendar-config.json`
3. **Schedule Daily Briefing** - Add to cron or triggers
4. **Explore Templates** - Check `skills/email-integration/templates/`
5. **Read Documentation** - See `README.md` for full API reference

---

## Support

For issues:
1. Check `TEST_RESULTS.md` for known issues
2. Review `README.md` for troubleshooting
3. Verify OAuth portal is online
4. Check console output for error details

---

**Installation Time:** ~5 minutes  
**Status:** Ready for production use

---

**Last Updated:** 2026-02-13  
**Version:** 1.0.0
