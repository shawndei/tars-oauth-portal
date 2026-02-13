# Email Integration - Implementation Guide

**Status:** Ready for Integration  
**Target System:** TARS (Task Automation & Response System)  
**Last Updated:** 2026-02-13

## Quick Start

### 1. Configure Email Account

Edit `email-config.json` and set up your email provider credentials:

```json
{
  "accounts": [
    {
      "name": "primary",
      "provider": "gmail",
      "email": "your-email@gmail.com",
      "auth": {
        "method": "oauth2",
        "client_id": "YOUR_CLIENT_ID",
        "client_secret": "YOUR_SECRET",
        "refresh_token": "YOUR_REFRESH_TOKEN"
      }
    }
  ]
}
```

### 2. Enable Morning Briefing

The morning briefing workflow automatically runs at 9:00 AM and:
- Fetches your last 12 hours of unread emails
- Summarizes them by category
- Extracts action items
- Presents in TARS briefing output

No setup needed—already configured in `workflows/morning-briefing.json`

### 3. Test Email Operations

Use these commands to test the system:

#### Test 1: Fetch Unread Emails
```
fetch_unread_emails(account: "primary", limit: 10)
```
Expected: Returns list of 10 most recent unread emails with metadata

#### Test 2: Summarize Inbox
```
summarize_inbox(account: "primary", detail_level: "brief")
```
Expected: Returns markdown summary of inbox with categories and action items

#### Test 3: Draft Response
```
draft_response(email_id: "<email_id>", response_type: "acknowledge")
```
Expected: Returns draft reply ready for review

#### Test 4: Send Email (with approval)
```
send_email(
  recipient: "test@example.com",
  subject: "Test Email",
  body: "This is a test",
  approval_token: "<approval_token>"
)
```
Expected: Email sent with confirmation

## File Structure

```
skills/email-integration/
├── SKILL.md                      # Skill definition & API
├── IMPLEMENTATION.md             # This file
├── templates/
│   ├── acknowledge.txt
│   ├── answer.txt
│   ├── escalate.txt
│   ├── fyi.txt
│   ├── follow-up.txt
│   ├── out-of-office.txt
│   └── meeting-request.txt
├── workflows/
│   ├── morning-briefing.json     # Daily 9 AM briefing
│   ├── auto-response.json        # Draft & send responses
│   └── inbox-cleanup.json        # Weekly organization
└── examples/
    └── usage-examples.md         # Example interactions

email-config.json                 # Configuration & credentials
```

## Key Features Explained

### 1. Morning Briefing

**Trigger:** 9:00 AM daily (Monday-Friday)

**What it does:**
1. Fetches last 12 hours of unread emails
2. Auto-categorizes by work/personal/finance/notifications
3. Detects priority items (VIPs, urgent keywords)
4. Extracts action items with deadlines
5. Estimates time to read all emails

**Output example:**
```
## Email Briefing (5 unread)

### Priority
- [URGENT] Project deadline from boss@company.com (1 action: finish report by EOD)
- Invoice from accounting@bank.com (1 action: approve for payment)

### By Category
- Work (3) - project updates
- Finance (1) - billing
- Notifications (1) - system alert

### Action Items
1. Finish project report (deadline: today EOD) - from boss@company.com
2. Approve invoice for payment - from accounting@bank.com
3. Review meeting notes - from team@company.com

Estimated read time: 8 minutes
```

### 2. Smart Categorization

Emails are automatically sorted into:
- **work** - Job-related, projects, meetings
- **personal** - Friends, family, personal matters
- **finance** - Bills, invoices, payments
- **notifications** - Service alerts, confirmations
- **newsletter** - Subscriptions, digests
- **spam** - Unsolicited, phishing attempts

Each category has:
- Auto-triggering keywords
- Sender patterns
- Auto-label assignment
- Priority boost/reduction

### 3. Priority Detection

Scoring system (0-100) considers:
- **High signals:** Direct address, VIP sender, urgent keywords, few recipients
- **Low signals:** CC/BCC, template appearance, bulk mail characteristics
- **Learn:** System improves from user marking patterns

### 4. Response Templates

Pre-built templates for common scenarios:

| Template | Use Case |
|----------|----------|
| acknowledge.txt | Quick "got it" response |
| answer.txt | Detailed reply with info |
| escalate.txt | Pass to appropriate team |
| fyi.txt | Note for informational emails |
| follow-up.txt | Check-in on previous topic |
| out-of-office.txt | Auto-reply when away |
| meeting-request.txt | Suggest meeting times |

Each supports placeholders: `{name}`, `{sender_name}`, `{subject}`, `{context}`, etc.

### 5. Inline Filtering

Automatic rules apply labels and actions:
- Auto-archive newsletters
- Flag bills for attention
- Skip notifications from inbox
- Learn from user corrections

## Integration with TARS

### Morning Briefing Hook

In TARS morning briefing sequence:
```
1. Weather & Calendar
2. [EMAIL BRIEFING] ← Email skill output
3. Task Summary
4. News/Events
```

### Task System Link

Action items extracted from emails auto-create tasks:
- Task: "Finish project report"
- Due: Email deadline date
- Source: Email from boss
- Status: Open

### Response Workflow

When you ask TARS to respond to an email:
1. TARS finds the email
2. Drafts using template
3. Shows you the draft
4. Waits for approval
5. Sends on approval

## Configuration Details

### Email Providers Supported

- **Gmail** (OAuth2) ← Recommended
- **Outlook** (OAuth2)
- **Custom IMAP** (password or app token)

### Rate Limits

Gmail: 250 requests/day, 10 requests/minute

### Security

- Credentials encrypted at rest
- OAuth2 preferred over passwords
- All sends require approval token
- Audit log of all operations
- Respects email platform ToS

## Troubleshooting

### Issue: "Authentication failed"
**Solution:** Refresh your OAuth2 token in `email-config.json` or re-authenticate

### Issue: "Rate limit exceeded"
**Solution:** Wait 1 hour or upgrade to business Gmail account

### Issue: "No unread emails detected"
**Solution:** Check folder configuration in `email-config.json`

### Issue: "Draft not sending"
**Solution:** Ensure `approval_token` is provided (manual approval required)

## Testing Scenarios

### Scenario 1: Daily Briefing
1. Wait for 9:00 AM or manually trigger morning briefing
2. Check TARS briefing output for email section
3. Verify action items extracted correctly
4. Confirm unread count matches Gmail

### Scenario 2: Quick Response
1. Ask TARS: "respond to John's email with acknowledgment"
2. Review the drafted response
3. Say "send it"
4. Confirm email delivered

### Scenario 3: Inbox Cleanup
1. Ask TARS: "organize my inbox"
2. Wait for cleanup to complete
3. Check categorization results
4. Verify newsletters archived

### Scenario 4: Priority Detection
1. Send yourself a test email with "URGENT" in subject
2. Send VIP a regular email
3. Run morning briefing
4. Verify both show high priority

## Advanced Features

### Custom Rules

Add rules to `email-config.json` filters section:
```json
{
  "name": "My custom rule",
  "conditions": {
    "from": ["specific@person.com"],
    "subject": ["keyword1", "keyword2"]
  },
  "actions": [
    { "type": "label", "value": "MyLabel" },
    { "type": "flag", "value": true }
  ]
}
```

### VIP Contacts

Add important people to boost their priority:
```json
{
  "email": "boss@company.com",
  "priority_boost": 1.0,
  "name": "Boss"
}
```

### Custom Signature

Update signature in config:
```json
{
  "signature": {
    "enabled": true,
    "name": "Your Name",
    "title": "Your Title",
    "footer": "Custom footer"
  }
}
```

## Future Roadmap

- [ ] Calendar integration (detect meetings)
- [ ] Email scheduling (send later)
- [ ] Attachment handling (save, preview, organize)
- [ ] Advanced search and filtering UI
- [ ] Two-way sync with task system
- [ ] VIP notification sounds
- [ ] Email conversation threading
- [ ] Smart signature management

## Support

For issues or questions:
1. Check `SKILL.md` for API reference
2. Review workflow JSON files for examples
3. Check `email-config.json` for configuration options
4. See troubleshooting section above

---

**Ready to use!** Configure your email account in `email-config.json` and the system will be ready for your morning briefing tomorrow at 9:00 AM.
