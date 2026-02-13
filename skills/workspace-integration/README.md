# Workspace Integration - Gmail & Google Calendar

**Complete email and calendar integration for TARS agent system with OAuth2 authentication.**

---

## 📋 Overview

This skill provides comprehensive Gmail and Google Calendar integration:

- **Gmail API** - Full email management (read, send, search, organize)
- **Google Calendar API** - Complete calendar operations (events, scheduling, conflicts)
- **Morning Briefing** - Combined email + calendar daily summary
- **OAuth2 Authentication** - Secure token management via OAuth portal
- **Smart Features** - Auto-categorization, priority detection, action extraction

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Gmail integration
cd skills/workspace-integration/gmail
npm install

# Calendar integration
cd ../calendar
npm install
```

### 2. Configure OAuth Tokens

The OAuth portal at `https://tars-oauth-api.railway.app` handles authentication.

**Required Scopes:**
- Gmail: `gmail.readonly`, `gmail.send`, `gmail.modify`, `gmail.compose`
- Calendar: `calendar.readonly`, `calendar.events`, `calendar`

Configuration files are pre-configured:
- `gmail-config.json` - Gmail settings
- `calendar-config.json` - Calendar settings

### 3. Test Integrations

```bash
# Test Gmail
cd skills/workspace-integration/gmail
node test-gmail.js

# Test Calendar
cd ../calendar
node test-calendar.js

# Test morning briefing
cd ..
node morning-briefing-workflow.js
```

---

## 📧 Gmail Integration

### Basic Usage

```javascript
const GmailClient = require('./gmail/gmail-client');

const gmail = new GmailClient();
await gmail.initialize();

// Fetch unread emails
const emails = await gmail.fetchUnreadEmails({ maxResults: 10 });

// Search emails
const results = await gmail.searchEmails('from:boss@company.com');

// Send email
await gmail.sendEmail({
  to: ['recipient@example.com'],
  subject: 'Hello',
  body: { text: 'Hello world!' }
});

// Generate morning briefing
const briefing = await gmail.generateMorningBriefing();
console.log(briefing.summary.briefText);
```

### Features

- **Email Operations**: Fetch, search, send, draft, mark, delete, archive
- **Label Management**: Get, add, remove, create labels
- **Smart Categorization**: Auto-classify emails (work, personal, finance, etc.)
- **Priority Detection**: Identify VIP senders and urgent emails
- **Action Extraction**: Parse tasks and deadlines from emails
- **Template Support**: 7 pre-built response templates

### Documentation

See [gmail/SKILL.md](gmail/SKILL.md) for complete API reference.

---

## 📅 Calendar Integration

### Basic Usage

```javascript
const CalendarClient = require('./calendar/calendar-client');

const calendar = new CalendarClient();
await calendar.initialize();

// Fetch upcoming events
const events = await calendar.fetchUpcomingEvents({ days: 7 });

// Create event
await calendar.createEvent({
  summary: 'Team Meeting',
  start: { dateTime: '2026-02-15T10:00:00-07:00' },
  end: { dateTime: '2026-02-15T11:00:00-07:00' },
  attendees: [{ email: 'team@example.com' }]
});

// Find free slots
const slots = await calendar.findFreeSlots({
  attendees: ['alice@example.com', 'bob@example.com'],
  duration: 60,
  startDate: '2026-02-15',
  endDate: '2026-02-19'
});

// Check availability
const availability = await calendar.checkAttendeeAvailability(
  ['person@example.com'],
  { start: '2026-02-15T10:00:00-07:00', end: '2026-02-15T11:00:00-07:00' }
);

// Generate calendar briefing
const briefing = await calendar.generateCalendarBriefing();
console.log(briefing.summary.briefText);
```

### Features

- **Event Management**: Create, read, update, delete events
- **Attendee Management**: Track RSVPs, check availability
- **Scheduling Intelligence**: Find free slots, suggest optimal times
- **Conflict Detection**: Identify scheduling conflicts
- **Meeting Preparation**: 30-minute pre-meeting briefings
- **Calendar Briefing**: Daily schedule summary

### Documentation

See [calendar/SKILL.md](calendar/SKILL.md) for complete API reference.

---

## 🌅 Morning Briefing Workflow

### Combined Email + Calendar Summary

```javascript
const MorningBriefingWorkflow = require('./morning-briefing-workflow');

const workflow = new MorningBriefingWorkflow();
await workflow.displayBriefing();
```

**Output:**
```
═══════════════════════════════════════════════════════════
📊 MORNING BRIEFING
═══════════════════════════════════════════════════════════

📅 TODAY'S SCHEDULE
─────────────────────────────────────────────────────────
  1. 09:00 AM - 09:30 AM - Team Standup
     📍 Conference Room A
     👥 3 attendees

📧 EMAIL SUMMARY
─────────────────────────────────────────────────────────
  Total Unread: 15
  Categories: work (8), personal (3), finance (2)

⚠️  PRIORITY EMAILS
─────────────────────────────────────────────────────────
  1. Urgent: Q1 Report Due Today
     From: boss@company.com

✅ ACTION ITEMS
─────────────────────────────────────────────────────────
  1. 🔴 Submit Q1 report (Due: 2/13/2026)
  2. 🟡 Approve invoice #12345 (Due: 2/15/2026)
```

### Briefing Components

1. **Overview** - Quick summary
2. **Today's Schedule** - All events with details
3. **Tomorrow's Preview** - Next day's events
4. **Email Summary** - Unread count and categories
5. **Priority Emails** - VIPs and urgent messages
6. **Action Items** - Tasks from email + calendar

---

## 📝 Email Templates

Pre-built templates in `skills/email-integration/templates/`:

1. **acknowledge.txt** - Quick acknowledgment
2. **answer.txt** - Detailed response
3. **escalate.txt** - Forward to appropriate person
4. **follow-up.txt** - Check-in on previous email
5. **fyi.txt** - Informational email
6. **meeting-request.txt** - Schedule meeting
7. **out-of-office.txt** - Auto-responder

**Usage:**
```javascript
const draft = await gmail.draftFromTemplate('acknowledge', {
  name: 'John',
  subject: 'project update',
  timeframe: 'by tomorrow'
});
```

---

## 🔧 Configuration

### Gmail Config (`gmail-config.json`)

```json
{
  "oauth": {
    "tokenEndpoint": "https://tars-oauth-api.railway.app/tokens/google",
    "refreshEndpoint": "https://tars-oauth-api.railway.app/auth/google/refresh"
  },
  "morning_briefing": {
    "enabled": true,
    "hours_lookback": 12,
    "max_emails": 20
  },
  "vips": ["boss@company.com", "client@important.com"]
}
```

### Calendar Config (`calendar-config.json`)

```json
{
  "oauth": {
    "tokenEndpoint": "https://tars-oauth-api.railway.app/tokens/google",
    "refreshEndpoint": "https://tars-oauth-api.railway.app/auth/google/refresh"
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

### Gmail Tests

```bash
cd skills/workspace-integration/gmail
node test-gmail.js
```

**Tests:**
1. Initialize client
2. OAuth connection
3. Fetch unread emails
4. Search emails
5. Get labels
6. Morning briefing
7. Email categorization

### Calendar Tests

```bash
cd skills/workspace-integration/calendar
node test-calendar.js
```

**Tests:**
1. Initialize client
2. OAuth connection
3. Fetch upcoming events
4. Calendar briefing
5. Check availability
6. Find free slots
7. Conflict detection
8. Meeting briefing

### All Tests

```bash
# Run all tests
cd skills/workspace-integration
npm test
```

---

## 🔒 Security

### OAuth2 Authentication

- Tokens managed by OAuth portal
- Automatic token refresh
- Never logged or exposed
- HTTPS encryption for all API calls

### Data Privacy

- Email content never stored permanently
- Only metadata cached for performance
- No data shared with third parties
- Compliant with Gmail and Calendar ToS

### Rate Limiting

- Gmail: 250 operations/minute
- Calendar: 500 operations/100 seconds
- Exponential backoff on rate limit errors

---

## 📊 Performance

### Gmail Client

- Initialize: < 1s
- Fetch 50 emails: < 2s
- Search: < 1.5s
- Send email: < 1s
- Morning briefing: < 5s

### Calendar Client

- Initialize: < 1s
- Fetch events: < 1s
- Find free slots: < 3s
- Create event: < 1s
- Morning briefing: < 2s

### Combined Workflow

- Full morning briefing: < 10s

---

## 🔗 Integration

### Heartbeat Integration

Add to `HEARTBEAT.md`:

```markdown
## Email Check (Every 2 hours)
- Check for new emails
- Alert on VIP emails
- Extract action items → TASKS.md

## Calendar Check (Daily 8:00 AM)
- Generate today's schedule
- Prepare meeting briefings
```

### Trigger Integration

Add to `triggers.json`:

```json
{
  "id": "morning-briefing",
  "name": "Morning Briefing (9:00 AM)",
  "schedule": "0 9 * * *",
  "action": "generate_morning_briefing"
}
```

---

## 🐛 Troubleshooting

### OAuth Connection Failed

**Problem:** `Failed to fetch token`

**Solution:**
1. Verify OAuth portal is online: `https://tars-oauth-api.railway.app`
2. Check configuration files have correct token endpoints
3. Re-authenticate if token expired

### Rate Limit Exceeded

**Problem:** `429 Rate limit exceeded`

**Solution:**
1. Wait for rate limit window to reset
2. Use batch operations for bulk tasks
3. Implement exponential backoff (already built-in)

### No Emails/Events Found

**Problem:** Test returns 0 results

**Solution:**
1. Verify Gmail has unread emails
2. Check Calendar has upcoming events
3. Confirm OAuth scopes include required permissions

---

## 🛠️ Development

### Project Structure

```
skills/workspace-integration/
├── gmail/
│   ├── SKILL.md              # Documentation
│   ├── gmail-client.js       # Implementation
│   ├── test-gmail.js         # Tests
│   └── package.json          # Dependencies
├── calendar/
│   ├── SKILL.md              # Documentation
│   ├── calendar-client.js    # Implementation
│   ├── test-calendar.js      # Tests
│   └── package.json          # Dependencies
├── morning-briefing-workflow.js  # Combined workflow
├── TEST_RESULTS.md           # Test documentation
└── README.md                 # This file
```

### Dependencies

- `googleapis` ^131.0.0 - Google APIs client
- `node-fetch` ^3.3.2 - HTTP client

### Contributing

1. Fork the repository
2. Create feature branch
3. Write tests for new features
4. Update documentation
5. Submit pull request

---

## 📚 Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎉 Status

**✅ Production Ready**

All features implemented and tested. Ready for daily use.

---

**Last Updated:** 2026-02-13  
**Version:** 1.0.0  
**Maintainer:** TARS Agent System
