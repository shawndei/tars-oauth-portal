# Gmail Integration Skill

**Version:** 1.0.0  
**Purpose:** Full Gmail API integration with OAuth2 authentication for email management  
**Status:** ✅ Operational  
**Last Updated:** 2026-02-13

---

## Overview

This skill provides complete Gmail API integration with OAuth2 authentication, enabling:
- **Email Operations**: Read, search, send, draft, delete
- **Label Management**: Create, apply, remove labels
- **Batch Operations**: Process multiple emails efficiently
- **Smart Filtering**: Search with Gmail query syntax
- **Morning Briefing**: Automated email summaries

All operations use OAuth2 tokens managed by the OAuth portal at `tars-oauth-api.railway.app`.

---

## Setup & Configuration

### 1. OAuth2 Authentication

The OAuth portal handles Google authentication. Tokens are stored and refreshed automatically.

**OAuth Scopes Required:**
- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/gmail.modify` - Modify labels, mark read/unread
- `https://www.googleapis.com/auth/gmail.compose` - Create drafts

### 2. Configuration File

Create `gmail-config.json` in workspace root:

```json
{
  "oauth": {
    "tokenEndpoint": "https://tars-oauth-api.railway.app/tokens/google",
    "refreshEndpoint": "https://tars-oauth-api.railway.app/auth/google/refresh"
  },
  "defaults": {
    "maxResults": 50,
    "pageSize": 100,
    "labelIds": ["INBOX", "UNREAD"]
  },
  "morning_briefing": {
    "enabled": true,
    "hours_lookback": 12,
    "max_emails": 20,
    "categories": ["work", "personal", "finance", "notifications", "newsletters"]
  },
  "filters": {
    "work": ["project", "meeting", "deadline", "review"],
    "finance": ["invoice", "payment", "bill", "receipt"],
    "notifications": ["notification", "alert", "confirm"]
  },
  "vips": [
    "boss@company.com",
    "important@client.com"
  ]
}
```

---

## API Methods

### Email Operations

#### `fetchUnreadEmails(options)`

Fetch unread emails from inbox.

**Parameters:**
```javascript
{
  maxResults: 50,           // Maximum emails to fetch
  query: 'is:unread',       // Gmail search query
  includeBody: true,        // Include full email body
  includeAttachments: false // Include attachment metadata
}
```

**Returns:**
```javascript
{
  success: true,
  count: 15,
  emails: [
    {
      id: "18d4f2a1c8e3b9f0",
      threadId: "18d4f2a1c8e3b9f0",
      from: {
        name: "John Smith",
        email: "john@example.com"
      },
      to: ["you@example.com"],
      subject: "Project Update",
      snippet: "Here's the latest on the project...",
      body: {
        text: "Plain text version",
        html: "<html>HTML version</html>"
      },
      date: "2026-02-13T08:30:00-07:00",
      labels: ["INBOX", "UNREAD", "IMPORTANT"],
      hasAttachments: false,
      size: 15234
    }
  ]
}
```

#### `searchEmails(query, options)`

Search emails using Gmail query syntax.

**Examples:**
```javascript
// Search by sender
await gmail.searchEmails('from:john@example.com');

// Search by date range
await gmail.searchEmails('after:2026/02/01 before:2026/02/13');

// Search with multiple criteria
await gmail.searchEmails('subject:invoice is:unread has:attachment');

// Search in specific folder
await gmail.searchEmails('in:sent to:client@example.com');
```

**Query Syntax:**
- `from:email` - Sender
- `to:email` - Recipient
- `subject:text` - Subject contains
- `is:unread` - Unread emails
- `is:starred` - Starred emails
- `has:attachment` - Has attachments
- `after:YYYY/MM/DD` - After date
- `before:YYYY/MM/DD` - Before date
- `label:name` - Has label
- `in:folder` - In folder (inbox, sent, trash)

#### `getEmailById(id, options)`

Fetch single email by ID.

**Parameters:**
```javascript
{
  id: "18d4f2a1c8e3b9f0",
  format: "full",  // full, metadata, minimal
  includeHeaders: true
}
```

#### `sendEmail(emailData)`

Send new email.

**Parameters:**
```javascript
{
  to: ["recipient@example.com"],
  cc: ["cc@example.com"],        // Optional
  bcc: ["bcc@example.com"],      // Optional
  subject: "Email Subject",
  body: {
    text: "Plain text version",
    html: "<html>HTML version</html>"
  },
  replyTo: "18d4f2a1c8e3b9f0",   // Optional - reply to message ID
  attachments: [                 // Optional
    {
      filename: "document.pdf",
      mimeType: "application/pdf",
      data: "base64-encoded-data"
    }
  ]
}
```

**Returns:**
```javascript
{
  success: true,
  messageId: "18d4f2b3d9e4c1a2",
  threadId: "18d4f2a1c8e3b9f0",
  sentAt: "2026-02-13T09:00:00-07:00"
}
```

#### `createDraft(emailData)`

Create email draft without sending.

**Parameters:** Same as `sendEmail()`

**Returns:**
```javascript
{
  success: true,
  draftId: "r-8234982347234",
  messageId: "18d4f2b3d9e4c1a2",
  createdAt: "2026-02-13T09:00:00-07:00"
}
```

#### `markAsRead(messageIds)`

Mark emails as read.

**Parameters:**
```javascript
{
  messageIds: ["18d4f2a1c8e3b9f0", "18d4f2a1c8e3b9f1"]
}
```

#### `markAsUnread(messageIds)`

Mark emails as unread.

#### `deleteEmail(messageIds)`

Delete emails (move to trash).

**Parameters:**
```javascript
{
  messageIds: ["18d4f2a1c8e3b9f0"],
  permanent: false  // If true, permanently delete (bypass trash)
}
```

#### `archiveEmail(messageIds)`

Archive emails (remove from inbox).

### Label Operations

#### `getLabels()`

Fetch all available labels.

**Returns:**
```javascript
{
  success: true,
  labels: [
    {
      id: "Label_1",
      name: "Work",
      type: "user",
      messageListVisibility: "show",
      labelListVisibility: "labelShow"
    }
  ]
}
```

#### `addLabels(messageIds, labelIds)`

Add labels to emails.

**Parameters:**
```javascript
{
  messageIds: ["18d4f2a1c8e3b9f0"],
  labelIds: ["Label_1", "STARRED"]
}
```

#### `removeLabels(messageIds, labelIds)`

Remove labels from emails.

#### `createLabel(name, options)`

Create new label.

**Parameters:**
```javascript
{
  name: "Projects",
  color: {
    backgroundColor: "#16a765",
    textColor: "#ffffff"
  }
}
```

### Batch Operations

#### `batchProcess(operations)`

Process multiple operations in one API call.

**Example:**
```javascript
await gmail.batchProcess([
  { action: 'markAsRead', messageIds: ['id1', 'id2'] },
  { action: 'addLabels', messageIds: ['id3'], labelIds: ['Label_1'] },
  { action: 'archive', messageIds: ['id4', 'id5'] }
]);
```

---

## Morning Briefing Workflow

### Automated Email Summary

The morning briefing runs automatically (integrated with heartbeat system) and generates:

1. **Unread Count** - Total unread emails
2. **Category Breakdown** - Emails grouped by category
3. **Priority Items** - Emails from VIPs or with urgent keywords
4. **Action Items** - Extracted tasks and deadlines
5. **Quick Summary** - One-paragraph overview

**Function:** `generateMorningBriefing()`

**Returns:**
```javascript
{
  success: true,
  generatedAt: "2026-02-13T09:00:00-07:00",
  summary: {
    totalUnread: 15,
    newSinceLastCheck: 5,
    categories: {
      work: 8,
      personal: 3,
      finance: 2,
      notifications: 2
    },
    priority: [
      {
        from: "boss@company.com",
        subject: "Urgent: Q1 Report Due Today",
        snippet: "Need the Q1 report by 5 PM...",
        deadline: "2026-02-13T17:00:00-07:00"
      }
    ],
    actionItems: [
      {
        task: "Submit Q1 report",
        deadline: "2026-02-13T17:00:00-07:00",
        source: "boss@company.com",
        priority: "high"
      },
      {
        task: "Approve invoice #12345",
        deadline: "2026-02-15",
        source: "accounting@company.com",
        priority: "medium"
      }
    ],
    briefText: "You have 15 unread emails (5 new). Priority: Urgent Q1 report due today at 5 PM from boss. 2 invoices need approval. 3 personal emails and 2 notifications."
  }
}
```

### Integration with HEARTBEAT.md

Add to `HEARTBEAT.md`:

```markdown
## Email Check (Every 2 hours during work hours)

- Check for new emails
- Generate briefing if > 5 unread
- Alert on VIP emails immediately
- Extract action items → TASKS.md
```

---

## Email Response Templates

Templates are stored in `email-integration/templates/` and can be used with `draftResponse()`.

### Available Templates

**1. Acknowledge (acknowledge.txt)**
```
Hi {name},

Thanks for your email about {subject}. I've received it and will review the details.

I'll get back to you {timeframe}.

Best regards,
{signature}
```

**2. Answer (answer.txt)**
```
Hi {name},

Thanks for reaching out about {subject}.

{response}

Let me know if you need any clarification.

Best regards,
{signature}
```

**3. Escalate (escalate.txt)**
```
Hi {name},

Thanks for your email. I'm forwarding this to {escalation_target} who can better assist with {subject}.

They should be in touch shortly.

Best regards,
{signature}
```

**4. Follow-up (follow-up.txt)**
```
Hi {name},

Following up on {subject} from {original_date}.

{follow_up_message}

Looking forward to hearing from you.

Best regards,
{signature}
```

**5. Meeting Request (meeting-request.txt)**
```
Hi {name},

Thanks for your email. I'd be happy to discuss {subject}.

Are any of these times convenient for you?
- {time_option_1}
- {time_option_2}
- {time_option_3}

Let me know what works best.

Best regards,
{signature}
```

### Using Templates

```javascript
const draft = await gmail.draftFromTemplate('acknowledge', {
  name: 'John',
  subject: 'project update',
  timeframe: 'by tomorrow',
  signature: 'Your Name'
});

// Review draft
console.log(draft.body);

// Send if approved
await gmail.sendDraft(draft.draftId);
```

---

## Smart Features

### Auto-Categorization

Emails are automatically categorized based on keywords:

- **Work**: project, meeting, deadline, review, approval
- **Personal**: family, friend, personal
- **Finance**: invoice, payment, bill, receipt, bank
- **Notifications**: notification, alert, confirm, subscription
- **Newsletter**: newsletter, digest, weekly, monthly

### Priority Detection

Emails are marked high priority if:
- From VIP sender (configured in `gmail-config.json`)
- Contains urgent keywords: urgent, asap, critical, deadline, important
- Direct recipient (not CC/BCC)
- Has deadline mentioned in subject/body

### Action Item Extraction

Automatically extracts tasks from emails:
- Deadline detection: "by Friday", "due tomorrow", "before 5 PM"
- Action verbs: "please review", "need approval", "submit by"
- Question detection: emails asking for specific actions

---

## Security & Best Practices

### OAuth Token Management

- Tokens are stored securely by OAuth portal
- Automatic token refresh when expired
- Never log or expose tokens
- Rate limiting to respect Gmail API quotas

### API Rate Limits

Gmail API limits:
- **Quota**: 1 billion quota units per day
- **Read operations**: 250 quota units per request
- **Send operations**: 100 quota units per request
- **Batch requests**: Up to 100 operations per batch

**Best Practices:**
- Use batch operations when possible
- Cache frequently accessed data
- Implement exponential backoff on rate limit errors
- Monitor quota usage

### Privacy & Data Handling

- Email content never stored permanently
- Only metadata cached for performance
- Sensitive data encrypted in transit
- Respects Gmail's Terms of Service
- User consent required for all operations

---

## Error Handling

### Common Errors

**401 Unauthorized**
```javascript
{
  error: "Token expired",
  action: "refresh_token",
  retryable: true
}
```

**403 Forbidden**
```javascript
{
  error: "Insufficient permissions",
  requiredScope: "gmail.send",
  action: "reauthorize"
}
```

**429 Rate Limit**
```javascript
{
  error: "Rate limit exceeded",
  retryAfter: 60,  // seconds
  action: "retry_later"
}
```

**500 Server Error**
```javascript
{
  error: "Gmail API error",
  message: "Backend service unavailable",
  retryable: true
}
```

### Retry Strategy

```javascript
async function withRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 429) {
        // Rate limit - exponential backoff
        const delay = Math.pow(2, i) * 1000;
        await sleep(delay);
      } else if (error.status >= 500) {
        // Server error - retry
        await sleep(1000);
      } else {
        // Client error - don't retry
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Testing

### Manual Testing

```javascript
// Test OAuth connection
await gmail.testConnection();

// Test fetching emails
const emails = await gmail.fetchUnreadEmails({ maxResults: 5 });
console.log(`Fetched ${emails.count} emails`);

// Test search
const results = await gmail.searchEmails('from:test@example.com');

// Test sending (with approval)
const sent = await gmail.sendEmail({
  to: ['test@example.com'],
  subject: 'Test Email',
  body: { text: 'This is a test' }
});
```

### Integration Testing

Run `test-gmail.js`:
```bash
node skills/workspace-integration/gmail/test-gmail.js
```

**Tests:**
1. OAuth token validation
2. Fetch unread emails
3. Search with various queries
4. Create and send draft
5. Label management
6. Morning briefing generation
7. Template rendering
8. Error handling

---

## Files

```
skills/workspace-integration/gmail/
├── SKILL.md              # This documentation
├── gmail-client.js       # Main Gmail API client
├── gmail-auth.js         # OAuth2 authentication
├── gmail-templates.js    # Template engine
├── morning-briefing.js   # Morning briefing generator
├── test-gmail.js         # Integration tests
└── package.json          # Dependencies
```

**Dependencies:**
```json
{
  "googleapis": "^131.0.0",
  "node-fetch": "^3.3.2"
}
```

---

## Usage Examples

### Example 1: Check Inbox

```javascript
const gmail = require('./gmail-client');

const emails = await gmail.fetchUnreadEmails({ maxResults: 10 });
console.log(`You have ${emails.count} unread emails`);

emails.emails.forEach(email => {
  console.log(`From: ${email.from.email}`);
  console.log(`Subject: ${email.subject}`);
  console.log(`Snippet: ${email.snippet}`);
  console.log('---');
});
```

### Example 2: Morning Briefing

```javascript
const briefing = await gmail.generateMorningBriefing();

console.log(briefing.summary.briefText);
console.log(`\nPriority Items: ${briefing.summary.priority.length}`);
console.log(`Action Items: ${briefing.summary.actionItems.length}`);
```

### Example 3: Send Reply

```javascript
// Get email
const email = await gmail.getEmailById('18d4f2a1c8e3b9f0');

// Draft reply using template
const draft = await gmail.draftFromTemplate('answer', {
  name: email.from.name,
  subject: email.subject,
  response: 'The project is on track. Expected completion by Friday.',
  signature: 'Your Name'
});

// Send draft
await gmail.sendDraft(draft.draftId);
```

### Example 4: Search and Archive

```javascript
// Find old newsletters
const newsletters = await gmail.searchEmails(
  'from:newsletter@example.com older_than:30d'
);

// Archive them
if (newsletters.count > 0) {
  const ids = newsletters.emails.map(e => e.id);
  await gmail.archiveEmail(ids);
  console.log(`Archived ${newsletters.count} old newsletters`);
}
```

---

## Future Enhancements

- [ ] Attachment download and preview
- [ ] Email threading and conversation view
- [ ] Smart compose (AI-generated responses)
- [ ] Scheduled sending
- [ ] Auto-responder rules
- [ ] Email analytics and insights
- [ ] Integration with task management
- [ ] Spam and phishing detection
- [ ] Signature management
- [ ] Email forwarding rules

---

**Status:** ✅ Fully operational  
**Last Updated:** 2026-02-13  
**Maintainer:** TARS Agent System
