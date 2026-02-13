# Google Calendar Integration Skill

**Version:** 1.0.0  
**Purpose:** Full Google Calendar API integration with OAuth2 authentication  
**Status:** ✅ Operational  
**Last Updated:** 2026-02-13

---

## Overview

This skill provides complete Google Calendar API integration with OAuth2 authentication, enabling:
- **Event Management**: Create, read, update, delete calendar events
- **Scheduling Intelligence**: Find free slots, check availability, suggest optimal times
- **Meeting Preparation**: Automated briefings 30 minutes before meetings
- **Attendee Management**: Track RSVPs, manage attendees, check conflicts
- **Morning Briefing**: Daily calendar summary integration

All operations use OAuth2 tokens managed by the OAuth portal at `tars-oauth-api.railway.app`.

---

## Setup & Configuration

### 1. OAuth2 Authentication

The OAuth portal handles Google authentication. Tokens are stored and refreshed automatically.

**OAuth Scopes Required:**
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events
- `https://www.googleapis.com/auth/calendar.events` - Create/modify events
- `https://www.googleapis.com/auth/calendar` - Full calendar access

### 2. Configuration File

Create `calendar-config.json` in workspace root:

```json
{
  "oauth": {
    "tokenEndpoint": "https://tars-oauth-api.railway.app/tokens/google",
    "refreshEndpoint": "https://tars-oauth-api.railway.app/auth/google/refresh"
  },
  "defaults": {
    "calendarId": "primary",
    "timeZone": "America/Mazatlan",
    "maxResults": 100
  },
  "meeting_prep": {
    "enabled": true,
    "lead_time_minutes": 30,
    "include_attendee_research": true,
    "include_context_documents": false
  },
  "morning_briefing": {
    "enabled": true,
    "days_ahead": 1,
    "categories": ["meeting", "deadline", "appointment"]
  },
  "working_hours": {
    "start": 9,
    "end": 17,
    "days": ["mon", "tue", "wed", "thu", "fri"]
  }
}
```

---

## API Methods

### Event Operations

#### `fetchUpcomingEvents(options)`

Fetch upcoming calendar events.

**Parameters:**
```javascript
{
  days: 7,                    // Days ahead to fetch
  maxResults: 100,            // Max events to return
  types: ['meeting'],         // Event types filter
  orderBy: 'startTime',       // Sort order
  includeAttendees: true      // Include attendee details
}
```

**Returns:**
```javascript
{
  success: true,
  count: 5,
  events: [
    {
      id: "event_abc123",
      summary: "Team Standup",
      description: "Weekly team sync",
      start: {
        dateTime: "2026-02-13T09:00:00-07:00",
        timeZone: "America/Mazatlan"
      },
      end: {
        dateTime: "2026-02-13T09:30:00-07:00",
        timeZone: "America/Mazatlan"
      },
      duration: 30,
      location: "Conference Room A",
      attendees: [
        {
          email: "alice@example.com",
          displayName: "Alice Smith",
          responseStatus: "accepted",
          organizer: false
        },
        {
          email: "bob@example.com",
          displayName: "Bob Jones",
          responseStatus: "tentative",
          organizer: false
        }
      ],
      organizer: {
        email: "carol@example.com",
        displayName: "Carol White"
      },
      conferenceData: {
        entryPoints: [
          {
            entryPointType: "video",
            uri: "https://meet.google.com/abc-defg-hij"
          }
        ]
      },
      recurringEventId: null,
      created: "2026-02-10T14:23:00-07:00",
      updated: "2026-02-13T08:15:00-07:00"
    }
  ]
}
```

#### `getEventById(eventId)`

Fetch single event by ID.

**Returns:**
```javascript
{
  success: true,
  event: { /* event object */ }
}
```

#### `createEvent(eventData)`

Create new calendar event.

**Parameters:**
```javascript
{
  summary: "Quarterly Planning Meeting",
  description: "Review Q1 objectives and plan Q2",
  start: {
    dateTime: "2026-02-15T10:00:00-07:00",
    timeZone: "America/Mazatlan"
  },
  end: {
    dateTime: "2026-02-15T11:30:00-07:00",
    timeZone: "America/Mazatlan"
  },
  location: "Board Room B",
  attendees: [
    {
      email: "stakeholder1@company.com",
      displayName: "Stakeholder One"
    },
    {
      email: "stakeholder2@company.com",
      displayName: "Stakeholder Two"
    }
  ],
  conferenceData: {
    createRequest: {
      requestId: "unique-request-id",
      conferenceSolutionKey: {
        type: "hangoutsMeet"
      }
    }
  },
  reminders: {
    useDefault: false,
    overrides: [
      { method: "email", minutes: 1440 },
      { method: "popup", minutes: 15 }
    ]
  },
  sendUpdates: "all"  // Send invites to attendees
}
```

**Returns:**
```javascript
{
  success: true,
  eventId: "event_xyz789",
  htmlLink: "https://calendar.google.com/event?eid=...",
  created: "2026-02-13T09:00:00-07:00",
  conflictCheck: {
    hasConflicts: false,
    overlappingEvents: []
  }
}
```

#### `updateEvent(eventId, changes)`

Update existing event.

**Parameters:**
```javascript
{
  eventId: "event_xyz789",
  changes: {
    summary: "Quarterly Planning & Budget Review",
    end: {
      dateTime: "2026-02-15T12:00:00-07:00"
    },
    description: "Extended to include budget discussion",
    sendUpdates: "all"
  }
}
```

**Returns:**
```javascript
{
  success: true,
  eventId: "event_xyz789",
  updated: "2026-02-13T09:15:00-07:00"
}
```

#### `deleteEvent(eventId, options)`

Delete calendar event.

**Parameters:**
```javascript
{
  eventId: "event_xyz789",
  sendUpdates: "all",  // Notify attendees
  notificationMessage: "This meeting has been cancelled."
}
```

**Returns:**
```javascript
{
  success: true,
  eventId: "event_xyz789",
  deleted: "2026-02-13T09:20:00-07:00"
}
```

### Attendee Management

#### `addAttendees(eventId, attendees)`

Add attendees to existing event.

**Parameters:**
```javascript
{
  eventId: "event_xyz789",
  attendees: [
    {
      email: "newperson@company.com",
      displayName: "New Person"
    }
  ],
  sendUpdates: "all"
}
```

#### `removeAttendees(eventId, emails)`

Remove attendees from event.

**Parameters:**
```javascript
{
  eventId: "event_xyz789",
  emails: ["removed@company.com"],
  sendUpdates: "all"
}
```

#### `checkAttendeeAvailability(emails, timeWindow)`

Check if attendees are available.

**Parameters:**
```javascript
{
  emails: [
    "person1@company.com",
    "person2@company.com"
  ],
  timeWindow: {
    start: "2026-02-15T10:00:00-07:00",
    end: "2026-02-15T12:00:00-07:00"
  },
  bufferMinutes: 15
}
```

**Returns:**
```javascript
{
  success: true,
  timeWindow: {
    start: "2026-02-15T10:00:00-07:00",
    end: "2026-02-15T12:00:00-07:00"
  },
  availability: [
    {
      email: "person1@company.com",
      status: "available",
      busySlots: []
    },
    {
      email: "person2@company.com",
      status: "busy",
      busySlots: [
        {
          start: "2026-02-15T10:00:00-07:00",
          end: "2026-02-15T11:00:00-07:00"
        }
      ],
      conflictingEvent: "API Review Meeting"
    }
  ],
  allAvailable: false,
  suggestedAlternative: "2026-02-15T11:00:00-07:00"
}
```

### Scheduling Intelligence

#### `findFreeSlots(criteria)`

Find available meeting times.

**Parameters:**
```javascript
{
  attendees: [
    "alice@company.com",
    "bob@company.com"
  ],
  duration: 60,  // minutes
  startDate: "2026-02-13",
  endDate: "2026-02-19",
  preferredTimes: {
    dayOfWeek: ["mon", "tue", "wed", "thu"],
    startHour: 10,
    endHour: 16
  },
  constraints: {
    bufferBefore: 15,
    bufferAfter: 15,
    minimumAttendeeAvailability: 1.0
  },
  maxResults: 10
}
```

**Returns:**
```javascript
{
  success: true,
  availableSlots: [
    {
      start: "2026-02-16T10:00:00-07:00",
      end: "2026-02-16T11:00:00-07:00",
      day: "Monday",
      allAttendeesFree: true,
      score: 0.98,
      reasonsForScore: [
        "No conflicts for any attendee",
        "Preferred time slot",
        "Preferred day of week"
      ]
    },
    {
      start: "2026-02-16T14:00:00-07:00",
      end: "2026-02-16T15:00:00-07:00",
      day: "Monday",
      allAttendeesFree: true,
      score: 0.85,
      reasonsForScore: [
        "No conflicts",
        "Afternoon slot (less preferred)"
      ]
    }
  ]
}
```

#### `suggestOptimalTimes(preferences)`

AI-powered time suggestions based on patterns.

**Parameters:**
```javascript
{
  purpose: "Quarterly planning meeting",
  attendees: ["alice@company.com", "bob@company.com"],
  duration: 90,
  timezone: "America/Mazatlan",
  constraints: {
    earliestDate: "2026-02-15",
    latestDate: "2026-02-28",
    dayOfWeek: ["mon", "tue", "wed", "thu"],
    timeRange: [9, 16]
  },
  optimizationFactors: {
    attendeePreference: 0.3,
    timeOfDay: 0.2,
    dayOfWeek: 0.2,
    minimizeReschedules: 0.15,
    proximity: 0.15
  }
}
```

**Returns:**
```javascript
{
  success: true,
  suggestions: [
    {
      rank: 1,
      start: "2026-02-16T10:00:00-07:00",
      end: "2026-02-16T11:30:00-07:00",
      day: "Monday",
      score: 0.94,
      reasoning: [
        "Highest attendee preference for this time",
        "Morning slot aligns with productivity peak",
        "No conflicts detected"
      ],
      probabilityAcceptance: 0.92
    }
  ],
  historicalInsights: {
    userMeetingPattern: "Prefers mornings, Mondays-Wednesdays",
    commonMeetingDuration: 60,
    averageAcceptanceRate: 0.89
  }
}
```

#### `checkForConflicts(timeWindow)`

Detect scheduling conflicts.

**Parameters:**
```javascript
{
  start: "2026-02-16T10:00:00-07:00",
  end: "2026-02-16T11:30:00-07:00",
  attendees: ["alice@company.com", "bob@company.com"],
  tolerance: {
    bufferBefore: 15,
    bufferAfter: 15,
    allowTentativeConflicts: false
  }
}
```

**Returns:**
```javascript
{
  success: true,
  hasConflicts: false,
  attendeeConflicts: [],
  timeSlotAvailability: {
    "alice@company.com": { available: true, status: "free" },
    "bob@company.com": { available: true, status: "free" }
  },
  recommendedAction: "safe_to_schedule"
}
```

---

## Meeting Preparation Workflow

### Automated Meeting Briefing

Triggers 30 minutes before any meeting to generate comprehensive briefing.

**Function:** `prepareMeetingBriefing(eventId)`

**Returns:**
```javascript
{
  success: true,
  eventId: "event_abc123",
  meetingTitle: "Team Standup",
  briefingGenerated: "2026-02-13T08:30:00-07:00",
  briefingContent: {
    overview: {
      title: "Team Standup",
      time: "2026-02-13T09:00:00-07:00 - 09:30:00-07:00",
      duration: 30,
      location: "Conference Room A",
      organizer: "Carol White",
      attendeeCount: 3
    },
    attendees: [
      {
        name: "Alice Smith",
        email: "alice@company.com",
        role: "Engineering Lead",
        recentWork: [
          "API optimization project (85% complete)",
          "Code review queue management"
        ],
        keyPoints: [
          "Expecting API performance improvement of 20%"
        ]
      }
    ],
    agenda: {
      description: "Weekly team synchronization",
      items: [
        {
          topic: "Status Updates (15 min)",
          owner: "Carol White",
          keyPoints: [
            "API optimization progress",
            "Test automation status"
          ]
        }
      ]
    },
    checklist: {
      items: [
        { item: "Review attendee context", status: "completed" },
        { item: "Gather agenda", status: "completed" },
        { item: "Prepare decision template", status: "completed" }
      ],
      readyForMeeting: true
    }
  },
  metrics: {
    prepTime: 9.5,
    documentsFound: 3,
    attendeesResearched: 3
  }
}
```

### Integration with Triggers

Add to `triggers.json`:

```json
{
  "id": "meeting-prep-30min",
  "name": "Meeting Preparation (30 min before)",
  "enabled": true,
  "type": "event",
  "event": "calendar_event_upcoming",
  "leadTime": "30m",
  "eventType": "meeting",
  "action": "prepare_meeting_briefing",
  "priority": "high"
}
```

---

## Morning Briefing Integration

### Daily Calendar Summary

**Function:** `generateCalendarBriefing()`

**Returns:**
```javascript
{
  success: true,
  generatedAt: "2026-02-13T09:00:00-07:00",
  summary: {
    today: {
      date: "2026-02-13",
      totalEvents: 4,
      meetings: 3,
      appointments: 1,
      events: [
        {
          time: "09:00-09:30",
          title: "Team Standup",
          location: "Conference Room A",
          attendees: 3
        },
        {
          time: "10:00-11:00",
          title: "Client Call",
          location: "Zoom",
          attendees: 5,
          priority: "high"
        }
      ]
    },
    tomorrow: {
      date: "2026-02-14",
      totalEvents: 2,
      events: [
        {
          time: "14:00-15:00",
          title: "Project Review",
          location: "Board Room"
        }
      ]
    },
    upcomingDeadlines: [
      {
        date: "2026-02-15",
        title: "Q1 Report Due",
        daysAway: 2
      }
    ],
    briefText: "Today: 4 events including Team Standup (9:00 AM) and high-priority Client Call (10:00 AM). Tomorrow: 2 events. Q1 Report due in 2 days."
  }
}
```

---

## Security & Best Practices

### OAuth Token Management

- Tokens stored securely by OAuth portal
- Automatic token refresh when expired
- Never log or expose tokens
- Rate limiting to respect API quotas

### API Rate Limits

Google Calendar API limits:
- **Quota**: 1 million queries per day
- **Per user**: 500 requests per 100 seconds
- **Batch requests**: Up to 50 operations per batch

**Best Practices:**
- Use batch operations when possible
- Cache frequently accessed data
- Implement exponential backoff on rate limit errors
- Monitor quota usage

### Privacy & Data Handling

- Event details never stored permanently
- Only metadata cached for performance
- Sensitive meeting info encrypted in transit
- Respects Google Calendar Terms of Service
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
  requiredScope: "calendar.events",
  action: "reauthorize"
}
```

**429 Rate Limit**
```javascript
{
  error: "Rate limit exceeded",
  retryAfter: 60,
  action: "retry_later"
}
```

**404 Not Found**
```javascript
{
  error: "Event not found",
  eventId: "event_abc123",
  action: "verify_event_id"
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
        const delay = Math.pow(2, i) * 1000;
        await sleep(delay);
      } else if (error.status >= 500) {
        await sleep(1000);
      } else {
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
const calendar = require('./calendar-client');

// Initialize
await calendar.initialize();

// Test connection
const profile = await calendar.testConnection();
console.log(`Connected: ${profile.email}`);

// Fetch upcoming events
const events = await calendar.fetchUpcomingEvents({ days: 7 });
console.log(`Found ${events.count} upcoming events`);

// Create test event
const event = await calendar.createEvent({
  summary: "Test Meeting",
  start: { dateTime: "2026-02-15T10:00:00-07:00" },
  end: { dateTime: "2026-02-15T11:00:00-07:00" }
});
console.log(`Created event: ${event.eventId}`);
```

### Integration Testing

Run `test-calendar.js`:
```bash
node skills/workspace-integration/calendar/test-calendar.js
```

**Tests:**
1. OAuth token validation
2. Fetch upcoming events
3. Create event
4. Update event
5. Delete event
6. Find free slots
7. Check conflicts
8. Generate meeting briefing
9. Morning briefing generation

---

## Files

```
skills/workspace-integration/calendar/
├── SKILL.md                # This documentation
├── calendar-client.js      # Main Calendar API client
├── calendar-auth.js        # OAuth2 authentication
├── meeting-briefing.js     # Meeting preparation engine
├── scheduling-engine.js    # Free slot finder
├── test-calendar.js        # Integration tests
└── package.json            # Dependencies
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

### Example 1: Check Today's Schedule

```javascript
const calendar = require('./calendar-client');

await calendar.initialize();

const events = await calendar.fetchUpcomingEvents({ days: 1 });

console.log(`Today's Schedule (${events.count} events):`);
events.events.forEach(event => {
  const start = new Date(event.start.dateTime);
  console.log(`${start.toLocaleTimeString()} - ${event.summary}`);
});
```

### Example 2: Find Meeting Time

```javascript
const slots = await calendar.findFreeSlots({
  attendees: ['alice@company.com', 'bob@company.com'],
  duration: 60,
  startDate: '2026-02-15',
  endDate: '2026-02-19',
  preferredTimes: {
    dayOfWeek: ['mon', 'tue', 'wed'],
    startHour: 10,
    endHour: 15
  }
});

console.log('Available slots:');
slots.availableSlots.forEach((slot, i) => {
  console.log(`${i + 1}. ${slot.start} (score: ${slot.score})`);
});
```

### Example 3: Create Meeting with Auto-Conflict Check

```javascript
const newEvent = {
  summary: 'Project Planning',
  start: { dateTime: '2026-02-15T10:00:00-07:00' },
  end: { dateTime: '2026-02-15T11:00:00-07:00' },
  attendees: [
    { email: 'alice@company.com' },
    { email: 'bob@company.com' }
  ]
};

// Check for conflicts first
const conflicts = await calendar.checkForConflicts({
  start: newEvent.start.dateTime,
  end: newEvent.end.dateTime,
  attendees: newEvent.attendees.map(a => a.email)
});

if (conflicts.hasConflicts) {
  console.log('⚠️ Conflicts detected!');
  console.log(conflicts.attendeeConflicts);
} else {
  const result = await calendar.createEvent(newEvent);
  console.log(`✅ Event created: ${result.eventId}`);
}
```

---

## Future Enhancements

- [ ] Recurring event patterns
- [ ] Time zone handling for multi-timezone meetings
- [ ] Smart rescheduling suggestions
- [ ] Calendar analytics (meeting time trends)
- [ ] Integration with email for meeting notes
- [ ] Automatic agenda generation
- [ ] Meeting outcome tracking
- [ ] Video conference integration (Zoom, Teams)

---

**Status:** ✅ Fully operational  
**Last Updated:** 2026-02-13  
**Maintainer:** TARS Agent System
