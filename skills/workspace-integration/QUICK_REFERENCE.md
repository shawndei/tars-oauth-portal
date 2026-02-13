# Workspace Integration - Quick Reference

**Fast reference for common operations**

---

## 🚀 Quick Start

```bash
# Run morning briefing
node skills/workspace-integration/morning-briefing-workflow.js

# Test Gmail
node skills/workspace-integration/gmail/test-gmail.js

# Test Calendar
node skills/workspace-integration/calendar/test-calendar.js
```

---

## 📧 Gmail Operations

### Initialize
```javascript
const GmailClient = require('./gmail/gmail-client');
const gmail = new GmailClient();
await gmail.initialize();
```

### Common Operations
```javascript
// Fetch unread
const emails = await gmail.fetchUnreadEmails({ maxResults: 10 });

// Search
const results = await gmail.searchEmails('from:boss@company.com is:unread');

// Send email
await gmail.sendEmail({
  to: ['someone@example.com'],
  subject: 'Subject',
  body: { text: 'Message' }
});

// Mark as read
await gmail.markAsRead(['message-id']);

// Archive
await gmail.archiveEmail(['message-id']);

// Get labels
const labels = await gmail.getLabels();

// Morning briefing
const briefing = await gmail.generateMorningBriefing();
```

### Gmail Search Syntax
```javascript
// By sender
'from:alice@example.com'

// By date
'after:2026/02/01 before:2026/02/13'

// Unread with attachment
'is:unread has:attachment'

// Subject search
'subject:invoice'

// Multiple conditions
'from:boss@company.com is:unread has:attachment'
```

---

## 📅 Calendar Operations

### Initialize
```javascript
const CalendarClient = require('./calendar/calendar-client');
const calendar = new CalendarClient();
await calendar.initialize();
```

### Common Operations
```javascript
// Get upcoming events
const events = await calendar.fetchUpcomingEvents({ days: 7 });

// Create event
await calendar.createEvent({
  summary: 'Meeting',
  start: { dateTime: '2026-02-15T10:00:00-07:00' },
  end: { dateTime: '2026-02-15T11:00:00-07:00' },
  attendees: [{ email: 'person@example.com' }]
});

// Update event
await calendar.updateEvent('event-id', {
  summary: 'Updated Meeting'
});

// Delete event
await calendar.deleteEvent('event-id');

// Check availability
const availability = await calendar.checkAttendeeAvailability(
  ['person@example.com'],
  {
    start: '2026-02-15T10:00:00-07:00',
    end: '2026-02-15T11:00:00-07:00'
  }
);

// Find free slots
const slots = await calendar.findFreeSlots({
  attendees: ['alice@example.com', 'bob@example.com'],
  duration: 60,
  startDate: '2026-02-15',
  endDate: '2026-02-19',
  preferredTimes: {
    dayOfWeek: ['mon', 'tue', 'wed'],
    startHour: 10,
    endHour: 16
  }
});

// Meeting briefing
const briefing = await calendar.prepareMeetingBriefing('event-id');

// Calendar briefing
const briefing = await calendar.generateCalendarBriefing();
```

---

## 🌅 Morning Briefing

### Run Workflow
```javascript
const MorningBriefingWorkflow = require('./morning-briefing-workflow');
const workflow = new MorningBriefingWorkflow();
await workflow.displayBriefing();
```

### Output Includes
- Today's schedule
- Tomorrow's preview
- Unread email count
- Priority emails
- Action items (from email + calendar)
- Category breakdown

---

## 🔧 Configuration

### Gmail Config (`gmail-config.json`)
```json
{
  "oauth": {
    "tokenEndpoint": "https://tars-oauth-api.railway.app/tokens/google"
  },
  "morning_briefing": {
    "enabled": true,
    "hours_lookback": 12,
    "max_emails": 20
  },
  "vips": ["important@example.com"]
}
```

### Calendar Config (`calendar-config.json`)
```json
{
  "oauth": {
    "tokenEndpoint": "https://tars-oauth-api.railway.app/tokens/google"
  },
  "meeting_prep": {
    "enabled": true,
    "lead_time_minutes": 30
  },
  "working_hours": {
    "start": 9,
    "end": 17,
    "days": ["mon", "tue", "wed", "thu", "fri"]
  }
}
```

---

## 🧪 Testing

### Run All Tests
```bash
# Gmail tests
cd skills/workspace-integration/gmail
node test-gmail.js

# Calendar tests
cd ../calendar
node test-calendar.js

# Verify installation
cd ..
node verify-installation.js
```

---

## 🔐 OAuth

### Token Endpoint
```
https://tars-oauth-api.railway.app/tokens/google
```

### Required Scopes
**Gmail:**
- `gmail.readonly` - Read emails
- `gmail.send` - Send emails
- `gmail.modify` - Modify labels
- `gmail.compose` - Create drafts

**Calendar:**
- `calendar.readonly` - Read calendar
- `calendar.events` - Modify events
- `calendar` - Full access

---

## 📝 Email Templates

**Location:** `skills/email-integration/templates/`

**Available:**
- `acknowledge.txt` - Quick ack
- `answer.txt` - Detailed response
- `escalate.txt` - Forward to team
- `follow-up.txt` - Check-in
- `fyi.txt` - Informational
- `meeting-request.txt` - Schedule meeting
- `out-of-office.txt` - Auto-reply

**Usage:**
```javascript
const draft = await gmail.draftFromTemplate('acknowledge', {
  name: 'John',
  subject: 'project update',
  timeframe: 'tomorrow'
});
```

---

## 🐛 Troubleshooting

### OAuth Connection Failed
```bash
# Check portal status
curl https://tars-oauth-api.railway.app

# Verify config files
cat gmail-config.json
cat calendar-config.json
```

### Dependencies Missing
```bash
# Reinstall
cd gmail && npm install && cd ..
cd calendar && npm install && cd ..
```

### Tests Failing
```bash
# Check OAuth first
curl https://tars-oauth-api.railway.app

# Run individual tests
node gmail/test-gmail.js
node calendar/test-calendar.js
```

---

## 📊 Performance

| Operation | Time |
|-----------|------|
| Fetch 50 emails | < 2s |
| Search emails | < 1.5s |
| Send email | < 1s |
| Fetch 7-day events | < 1s |
| Find free slots | < 3s |
| Morning briefing | < 10s |

---

## 🔗 Integration

### Heartbeat
Add to `HEARTBEAT.md`:
```markdown
## Email Check (Every 2 hours)
cd skills/workspace-integration/gmail
node -e "const g = require('./gmail-client'); const c = new g(); c.initialize().then(() => c.generateMorningBriefing()).then(console.log);"
```

### Cron
```bash
# Daily at 9 AM
0 9 * * * cd /path/to/workspace && node skills/workspace-integration/morning-briefing-workflow.js
```

### Triggers
Add to `triggers.json`:
```json
{
  "id": "morning-briefing",
  "schedule": "0 9 * * *",
  "command": "node skills/workspace-integration/morning-briefing-workflow.js"
}
```

---

## 📚 Full Documentation

- [README.md](README.md) - Complete guide
- [INSTALL.md](INSTALL.md) - Installation
- [TEST_RESULTS.md](TEST_RESULTS.md) - Test docs
- [gmail/SKILL.md](gmail/SKILL.md) - Gmail API
- [calendar/SKILL.md](calendar/SKILL.md) - Calendar API

---

## 🆘 Support

1. Check documentation
2. Run `verify-installation.js`
3. Review test output
4. Verify OAuth portal status

---

**Quick Start:** `node morning-briefing-workflow.js`  
**Status:** ✅ Production Ready  
**Version:** 1.0.0
