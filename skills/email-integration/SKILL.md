# Email Integration Skill

**Version:** 1.0  
**Purpose:** Email management, summarization, automated responses, and smart inbox handling  
**For:** TARS System (Shawn)  

## Overview

This skill enables comprehensive email operations including fetching, summarizing, categorizing, and responding to emails with intelligent automation. It integrates with the morning briefing workflow and provides smart inbox management.

## Capabilities

### 1. Email Operations

#### Fetch Unread Emails
**Function:** `fetch_unread_emails()`
- Retrieves unread emails from configured account
- Respects rate limits and pagination
- Returns metadata: sender, subject, timestamp, body preview
- Filters by folder (inbox, important, custom labels)
- Optional: filter by time range

**Parameters:**
```json
{
  "account": "string (email provider config key)",
  "folder": "string (inbox|important|custom)",
  "limit": "number (default: 50)",
  "since_hours": "number (last N hours, optional)"
}
```

**Returns:**
```json
{
  "success": boolean,
  "count": number,
  "emails": [
    {
      "id": "string",
      "from": "string",
      "subject": "string",
      "timestamp": "ISO8601",
      "preview": "string (first 200 chars)",
      "labels": ["string"],
      "is_priority": boolean,
      "category": "string"
    }
  ]
}
```

#### Summarize Inbox
**Function:** `summarize_inbox()`
- Generates executive summary of unread emails
- Groups by category/sender
- Highlights priority items
- Extracts action items
- Estimates time to process

**Parameters:**
```json
{
  "account": "string",
  "max_emails": "number (default: 20)",
  "detail_level": "brief|standard|detailed"
}
```

**Returns:**
```json
{
  "summary": "string (markdown formatted)",
  "stats": {
    "total_unread": number,
    "by_category": { "category": count },
    "priority_count": number
  },
  "action_items": ["string"],
  "estimated_read_time_minutes": number
}
```

#### Draft Response
**Function:** `draft_response(email_id, response_type)`
- Generates contextual draft response
- Applies templates
- Respects tone/style preferences
- Ready for human review before sending

**Parameters:**
```json
{
  "email_id": "string",
  "response_type": "acknowledge|answer|escalate|fyi",
  "tone": "professional|friendly|brief",
  "use_template": "boolean (default: true)"
}
```

**Returns:**
```json
{
  "draft": {
    "subject": "string",
    "body": "string",
    "suggested_template": "string"
  },
  "context": {
    "original_from": "string",
    "original_subject": "string"
  }
}
```

#### Send Email
**Function:** `send_email(recipient, subject, body, options)`
- Sends composed email
- Requires approval token (manual confirmation)
- Logs all sends
- Returns confirmation with timestamp/ID

**Parameters:**
```json
{
  "recipient": "string or string[]",
  "subject": "string",
  "body": "string",
  "cc": "string[] (optional)",
  "bcc": "string[] (optional)",
  "reply_to_id": "string (optional)",
  "template": "string (optional)",
  "approval_token": "string (required for actual send)"
}
```

**Returns:**
```json
{
  "success": boolean,
  "message_id": "string",
  "sent_at": "ISO8601",
  "recipients": ["string"]
}
```

#### Filter & Categorize Emails
**Function:** `categorize_email(email_id, category)` + `apply_filters(rule_set)`
- Auto-assigns categories: work|personal|finance|notifications|newsletter|spam
- Applies filter rules
- Moves/labels emails
- Learns from user actions

**Category System:**
- **work**: Project updates, meetings, work-related
- **personal**: Friends, family, personal matters
- **finance**: Bills, invoices, banking
- **notifications**: Services, alerts, automations
- **newsletter**: Subscriptions, digests
- **spam**: Junk, unwanted marketing

**Parameters:**
```json
{
  "email_id": "string or string[]",
  "category": "string",
  "auto_learn": "boolean (optional)"
}
```

#### Extract Action Items
**Function:** `extract_action_items(email_id)` / `extract_from_summary()`
- Parses email for action items
- Links to task system
- Identifies deadlines
- Returns structured task data

**Returns:**
```json
{
  "actions": [
    {
      "task": "string",
      "deadline": "ISO8601 or null",
      "assignee": "string (optional)",
      "priority": "high|medium|low",
      "email_id": "string"
    }
  ]
}
```

### 2. Smart Inbox Management

#### Priority Detection
**Function:** `detect_priority(email)`
- ML-based priority scoring (0-100)
- Considers: sender importance, keywords, recipient count, labels
- Learns from user marking habits
- Returns confidence score

**Signals:**
- Direct address (not CC/BCC)
- Known VIPs (configured contacts)
- Keywords: urgent, asap, deadline, critical
- Few recipients (not bulk mail)
- Personal touch (not template)

#### Auto-Categorization
- Automatic folder/label assignment
- Rule-based engine with ML fallback
- User training via corrections
- Customizable per-account rules

#### Spam Filtering
- Checks against blocklist
- Validates sender authenticity (SPF/DKIM)
- Detects phishing patterns
- Quarantines suspicious emails
- Auto-learning from user reports

#### Newsletter Handling
- Detects and separates newsletters
- Auto-unsubscribe option
- Digest mode (collect, summarize daily)
- Whitelist/priority newsletters

### 3. Email Templates

**Available Templates:**
```
templates/
├── acknowledge.txt      # Quick acknowledgment
├── answer.txt           # Detailed response
├── escalate.txt         # Move to manager/team
├── fyi.txt              # FYI/no action needed
├── follow-up.txt        # Check-in after action
├── out-of-office.txt    # Auto-reply
└── meeting-request.txt  # Schedule meeting
```

Each template has placeholders:
- `{name}`, `{sender_name}`, `{recipient_name}`
- `{subject}`, `{date}`, `{time}`
- `{action}`, `{deadline}`
- `{context}` (auto-filled from email)

### 4. Configuration

Uses `email-config.json` for:
- Email provider credentials (oauth2, app passwords)
- Account settings
- Filter rules
- VIP contacts
- Template preferences
- Automation rules
- Rate limits

See `email-config.json` for full schema.

## Integration Points

### Morning Briefing
Triggered by `briefing:morning` event:
1. Fetch unread emails (last 12 hours if overnight)
2. Generate summary (detail_level: "brief")
3. Extract priority items
4. Include in briefing output
5. Suggest top 3 action items

### Task System
- Extract action items to task manager
- Link emails to tasks
- Track task progress
- Update email status when task done

### Calendar System
- Extract meeting requests
- Suggest response with availability
- Flag deadline-driven emails

### Response Automation
- Draft responses for routine emails
- Suggest auto-replies for known senders
- Template-based composition
- Approval workflow for sending

## Security & Privacy

- All credentials in `email-config.json` (gitignored)
- OAuth2 preferred over passwords
- Rate limiting to avoid blocks
- Encrypted storage of sensitive data
- Audit log of all operations
- User approval required for sends
- Compliance: respects user's email platform ToS

## Error Handling

**Common Issues:**
- **Auth Failed**: Refresh token, re-authenticate
- **Rate Limited**: Backoff and retry, log attempt
- **Network Error**: Retry with exponential backoff
- **Invalid Email**: Return detailed error, skip
- **Large Attachment**: Warn, offer alternatives

## Limitations

- Does not automatically delete emails (safeguard)
- Send always requires approval token
- Cannot access email contents of other users
- Respects email platform rate limits (Gmail: 250/day per user)
- Newsletter detection may have false positives (requires tuning)

## Usage Examples

### Example 1: Morning Briefing
```
trigger: briefing:morning
→ fetch_unread_emails(limit: 20, since_hours: 12)
→ summarize_inbox(detail_level: "brief")
→ extract_action_items()
→ output: summary + top 3 actions
```

### Example 2: Quick Response
```
user: "respond to John's email with acknowledgment"
→ find email from john
→ draft_response(type: "acknowledge")
→ show draft to user
→ user approves
→ send_email(approval_token: "xxx")
```

### Example 3: Inbox Cleanup
```
user: "clean up my inbox"
→ fetch all emails
→ categorize each
→ move spam to trash
→ archive newsletters
→ report: "Organized 45 emails, 3 action items found"
```

## Files

- `SKILL.md` - This file (skill definition)
- `email-config.json` - Configuration and credentials
- `templates/` - Email response templates
- `workflows/` - Integration workflows
- `examples/` - Usage examples

## Implementation Notes

- Built for integration with TARS system
- Python/Node.js compatible
- Email provider-agnostic (adapters for Gmail, Outlook, etc.)
- Stateless operations (no local email storage)
- Extensible template system

## Future Enhancements

- Two-way sync with calendar (meeting requests)
- Email scheduling (send later)
- Attachment handling (save, preview, organize)
- VIP notifications
- Email search and advanced filtering
- Conversation threading
- Signature management
- Auto-responder chains

---

**Last Updated:** 2026-02-13  
**Status:** Ready for implementation
