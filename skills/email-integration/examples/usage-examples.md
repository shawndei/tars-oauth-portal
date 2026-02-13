# Email Integration - Usage Examples

**For:** TARS System  
**Examples:** Real-world email operation scenarios

## Example 1: Morning Email Briefing

**Time:** 9:00 AM  
**Trigger:** Automatic (or manual: "briefing morning email")  

**Process:**
```json
{
  "workflow": "morning-briefing.json",
  "steps": [
    "fetch_unread_emails(account: primary, since_hours: 12, limit: 20)",
    "categorize_emails()",
    "detect_priority()",
    "summarize_inbox(detail_level: brief)",
    "extract_action_items()",
    "format_briefing_output()"
  ]
}
```

**Output Example:**
```
📧 EMAIL BRIEFING (9 unread)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 PRIORITY ITEMS (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. [URGENT] Project Report Due Today
   From: boss@company.com
   Subject: Q1 Report - Need by EOD
   → Action: Finish report and send review
   → Deadline: Today 5:00 PM

2. Invoice #12345 Ready for Approval
   From: accounting@bank.com
   Subject: Invoice ready - $5,000
   → Action: Review and approve invoice
   → Deadline: By Friday

3. Team Meeting Notes - Action Items
   From: team@company.com
   Subject: Monday standup - your tasks
   → Action: Complete API documentation
   → Deadline: Wednesday

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 BY CATEGORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Work (5)          - Project updates, meetings, requests
Finance (2)       - Invoices, receipts
Notifications (2) - Service alerts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ACTION ITEMS (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Finish Q1 report (HIGH) - Due: Today 5:00 PM
2. Approve invoice #12345 (MEDIUM) - Due: Friday
3. Write API documentation (MEDIUM) - Due: Wednesday

Estimated read time: 12 minutes
Last check: 2:13 AM (caught up since 2:15 PM yesterday)
```

---

## Example 2: Quick Response to Email

**User:** "Respond to John's email with a quick acknowledgment"  
**Process:**

**Step 1: TARS finds the email**
```
User input: "Respond to John's email"
→ find email from john
→ Found: Email ID #54321 from john@company.com, subject "Project Timeline"
```

**Step 2: TARS drafts response**
```
Response type: acknowledge (auto-detected from email type)
Template: acknowledge.txt
Tone: professional

Draft generated:
─────────────────────────────────────
To: john@company.com
Subject: Re: Project Timeline

Hi John,

Thank you for your email. I've received your message and 
wanted to confirm that I'm looking into it.

I'll get back to you with a full response shortly.

Best regards,
Shawn
─────────────────────────────────────
```

**Step 3: User review**
```
TARS: "I've drafted a response. Does this look good?"
User: "Perfect, send it"
```

**Step 4: TARS sends**
```
Email sent successfully ✓
Message ID: msg_xyz123
Sent to: john@company.com
Time: 2:14 PM
```

**Step 5: Logged**
```
Action logged:
- Email ID: #54321
- Action: sent_reply
- Recipient: john@company.com
- Timestamp: 2:14 PM
```

---

## Example 3: Detailed Response to Work Question

**Email:** Boss asks about project status  
**User:** "Reply to boss with the project status update"  

**Process:**

```
1. Find email: "Project Status Update?" from boss@company.com
2. Auto-detect response type: "answer"
3. Extract context from recent emails about project
4. Generate draft with full details

Draft output:
─────────────────────────────────────
To: boss@company.com
Subject: Re: Project Status Update?

Hi Boss,

Thanks for checking in on the project. Here's where we 
stand as of today:

Current Status: 65% complete
Timeline: On track for March 15 delivery
Blockers: Waiting on design approval from Marketing
Next Steps: 
- Get design sign-off (this week)
- Complete backend API integration (next week)
- QA and testing (week after)

I'll send a detailed status report tomorrow with full 
metrics and timeline.

Please let me know if you need any clarification or have 
questions.

Best regards,
Shawn
─────────────────────────────────────

User approves → Email sent
```

---

## Example 4: Escalate Issue

**Email:** Customer support question outside my area  
**User:** "Escalate this to the support team"  

**Process:**

```
1. Detect email type: support_inquiry from customer
2. Auto-select template: escalate.txt
3. Draft escalation response

Draft:
─────────────────────────────────────
To: customer@external.com
Subject: Re: Can't login to account

Hi Customer,

Thanks for reaching out. Given the nature of this issue, 
I'm escalating it to our support team who can provide 
the best assistance.

You'll hear from them within 24 hours.

Best regards,
Shawn
─────────────────────────────────────

4. Also create internal note:
   To: support@company.com
   Subject: [ESCALATION] Customer login issue
   Body: Customer XYZ reported can't login...
```

---

## Example 5: Weekly Inbox Cleanup

**Trigger:** Sunday 6:00 PM  
**User:** "Organize my inbox" (or automatic weekly)  

**Process:**

```
1. fetch_emails(limit: 500)  → 487 emails in inbox

2. categorize_emails()
   - work: 145
   - personal: 38
   - finance: 42
   - notifications: 156
   - newsletter: 76
   - spam: 30

3. filter_spam() → Move 30 to spam

4. extract_newsletters() → Archive 76

5. tag_categories() → Apply labels to work/personal/finance/notifications

6. flag_priority() → Flag 23 high-priority items

Result Summary:
─────────────────────────────────────
✅ Inbox Cleanup Complete

📊 Stats:
- Total emails processed: 487
- Spam removed: 30
- Newsletters archived: 76
- Remaining inbox: 381
- Priority flagged: 23

📁 Organization:
- Work folder: 145 emails (labeled)
- Personal folder: 38 emails (labeled)
- Finance folder: 42 emails (labeled & flagged)
- Notifications: 156 (labeled, inbox skip)
- Spam: 30 (moved)

⏱️ Time saved: ~45 minutes of manual sorting!
─────────────────────────────────────
```

---

## Example 6: Extract Action Items from Email

**Email:** Team meeting notes with action items  

**Process:**

```
Email content:
"In yesterday's meeting we discussed:
- John will finish the API by Wednesday
- Sarah needs to approve budget by Friday
- I'm responsible for documentation by next Monday
- Team sync next Tuesday at 2 PM"

Extract action items:
1. API completion (John) - Due: Wednesday
2. Budget approval (Sarah) - Due: Friday
3. Documentation (Me/Shawn) - Due: Next Monday
4. Team sync meeting - Next Tuesday 2 PM

Output to task system:
□ API completion - John - Wednesday
□ Budget approval - Sarah - Friday
□ Documentation - Shawn - Next Monday
📅 Team sync - Tuesday 2 PM

TARS also creates corresponding calendar event and 
notifies relevant people.
```

---

## Example 7: Handle VIP Email

**Email:** Important client reaches out  

**Process:**

```
1. Detect sender: client@important-customer.com (configured VIP)
2. Priority score: 95/100 (high)
3. Alert TARS immediately

Alert:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 VIP EMAIL ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: John Smith <john@important-customer.com>
Subject: Quarterly Review Discussion
Time: Just now (2:05 PM)

This is an important contact. What would you like to do?

[Option A] Draft response now
[Option B] Schedule call
[Option C] Add to calendar
[Option D] Forward to team

User chooses: Draft response

Response template auto-selected: professional, detailed
Tone suggests: warm and accommodating

TARS: "Ready to draft? This should be detailed and 
warm tone."
```

---

## Example 8: Newsletter Management

**Scenario:** Too many newsletters cluttering inbox  

**User:** "Stop getting newsletters"  

**Process:**

```
1. Run newsletter_extraction()
   Found 76 active newsletters in last 30 days

2. Present options:
   a) Auto-archive all newsletters
   b) Digest mode (collect, summarize daily)
   c) Unsubscribe from selected ones
   d) Whitelist priority newsletters

User chooses: (b) Digest mode for key ones

3. Configure:
   - Newsletter digest: daily at 6 PM
   - Max items: 15
   - Whitelist: TechCrunch, Company Blog, HackerNews

4. Apply rules:
   - All newsletter emails auto-label "Newsletter"
   - Skip from inbox (archive)
   - Daily digest: "Newsletter Summary"

Result:
✅ Newsletter management enabled
- 76 incoming newsletters → 1 daily digest
- 3 whitelisted (stay in inbox)
- Read time saved: ~30 min/day
```

---

## Example 9: Finance Email Processing

**Emails:** Invoices and payment notifications  

**Process:**

```
System detects invoice emails:
1. Invoice #12345 from supplier@vendor.com ($500)
2. Payment receipt from bank.com ($1200)
3. Subscription renewal from software.com ($99/mo)

Actions:
1. Auto-label all as "Finance"
2. Flag as "Needs Review"
3. Extract key info:
   - Amount
   - Due date
   - Vendor
   - Reference number

4. Create task:
   □ Review vendor invoice #12345 ($500) - Due: Friday
   
5. Update task system with spending:
   - August spending: $1,799 this month
   - Budget remaining: $1,201

TARS briefing note:
"📊 Finance: 3 new items ($1,799 total)
 - 2 items need approval
 - Budget: 59% used"
```

---

## Example 10: Meeting Request Response

**Email:** Client wants to schedule meeting  

**Process:**

```
Email received:
From: client@external.com
Subject: "Let's catch up sometime this month?"

TARS response:
1. Check calendar availability
2. Detect response type: meeting_request
3. Draft with available time slots

Draft:
─────────────────────────────────────
To: client@external.com
Subject: Re: Let's catch up sometime this month?

Hi Client Name,

I'd be happy to meet and discuss our partnership!

I have availability on:
- Thursday 2-4 PM
- Friday 10 AM - 12 PM
- Next Monday 3-5 PM

Does any of these work for you? We can meet via Zoom 
or phone, whichever works best.

Looking forward to connecting.

Best regards,
Shawn
─────────────────────────────────────

User reviews and approves → Email sent
Calendar: Meeting with Client - TBD (awaiting response)
```

---

## Usage Summary

| Task | Command | Template Used |
|------|---------|---------------|
| Get briefing | briefing morning email | - |
| Quick response | respond to [name] with [type] | acknowledge |
| Detailed reply | reply to [name] with details | answer |
| Escalate | escalate this to [team] | escalate |
| FYI response | fyi to [name] | fyi |
| Follow-up | follow-up on [topic] | follow-up |
| Auto-reply | set out of office | out-of-office |
| Schedule meeting | meeting with [person] | meeting-request |

---

**All examples assume:**
- Email account configured in `email-config.json`
- TARS system initialized
- User has approved the email skill usage
- Morning briefing workflow enabled

---

Last Updated: 2026-02-13
