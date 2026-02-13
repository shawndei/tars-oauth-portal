# Calendar Integration & Meeting Automation System

**Purpose:** Enable comprehensive calendar event management, intelligent meeting preparation, and smart scheduling automation for seamless productivity workflow integration.

**Status:** ✅ Operational (2026-02-13)

---

## Overview

The Calendar Integration system provides:

1. **Calendar Operations** — Fetch, create, update, delete events; manage attendees
2. **Meeting Preparation** — Automated briefing 30 minutes before meetings
3. **Scheduling Intelligence** — Find free slots, suggest optimal times, prevent conflicts
4. **Context Loading** — Pre-load meeting materials, attendee research, agenda

This skill integrates with:
- **triggers.json** — Pre-meeting preparation trigger (30 minutes before)
- **deep-researcher** — Attendee research and background information
- **predictive-scheduling** — Learn meeting patterns and suggest recurring slots
- **TASKS.md** — Schedule meeting preparation tasks
- **MEMORY.md** — Track meeting decisions, outcomes, patterns

---

## 1. Calendar Operations

### 1.1 Fetch Upcoming Events

Retrieve calendar events with flexible filtering and pagination.

**API Method:**
```javascript
const calendar = require('./calendar-integration');

// Fetch next 7 days of events
const events = await calendar.fetchUpcomingEvents({
  days: 7,
  types: ['meeting', 'call', 'presentation', 'deadline'],
  orderBy: 'startTime',
  includeAttendees: true
});

// Response structure
{
  success: true,
  events: [
    {
      id: "event-001",
      title: "Team Standup",
      startTime: "2026-02-13T09:00:00-07:00",
      endTime: "2026-02-13T09:30:00-07:00",
      duration: 30, // minutes
      type: "meeting",
      location: "Conference Room A",
      description: "Weekly team sync",
      attendees: [
        {
          name: "Alice Smith",
          email: "alice@company.com",
          rsvp: "accepted",
          role: "required"
        },
        {
          name: "Bob Jones",
          email: "bob@company.com",
          rsvp: "tentative",
          role: "optional"
        }
      ],
      organizer: {
        name: "Carol White",
        email: "carol@company.com"
      },
      isRecurring: false,
      recurringPattern: null,
      createdTime: "2026-02-10T14:23:00-07:00",
      updatedTime: "2026-02-13T08:15:00-07:00",
      conferenceLink: "https://meet.google.com/abc-defg-hij",
      reminders: [
        { method: "email", minutesBefore: 1440 },
        { method: "notification", minutesBefore: 15 }
      ],
      tags: ["team", "sync", "weekly"],
      importance: "high"
    }
  ],
  count: 12,
  nextPage: null
}
```

**Usage Examples:**
```javascript
// Get all meetings this week
const meetings = await calendar.fetchUpcomingEvents({
  days: 7,
  types: ['meeting']
});

// Get today's schedule
const today = await calendar.fetchUpcomingEvents({
  days: 1,
  orderBy: 'startTime'
});

// Get deadlines for next 30 days
const deadlines = await calendar.fetchUpcomingEvents({
  days: 30,
  types: ['deadline']
});

// Get busy times (for availability checking)
const busySlots = await calendar.fetchUpcomingEvents({
  days: 14,
  includeBusySlots: true,
  minimal: true // Only return time slots, not full details
});
```

### 1.2 Create Events

Create new calendar events with automatic conflict detection.

**API Method:**
```javascript
// Create a new meeting
const result = await calendar.createEvent({
  title: "Quarterly Planning Meeting",
  startTime: "2026-02-15T10:00:00-07:00",
  endTime: "2026-02-15T11:30:00-07:00",
  location: "Board Room B",
  description: "Review Q1 objectives and plan Q2 strategy",
  attendees: [
    {
      email: "stakeholder1@company.com",
      role: "required",
      invitationSent: true
    },
    {
      email: "stakeholder2@company.com",
      role: "optional"
    }
  ],
  conferenceLink: {
    type: "google-meet",
    autoAdd: true
  },
  tags: ["planning", "quarterly"],
  reminders: [
    { method: "email", minutesBefore: 1440 },
    { method: "notification", minutesBefore: 15 }
  ],
  transparency: "opaque", // Show as busy
  visibility: "default",  // Can be: default, public, private
  colorId: 3, // Color category
  notifyAttendees: true
});

// Response
{
  success: true,
  eventId: "event-002",
  title: "Quarterly Planning Meeting",
  createdTime: "2026-02-13T08:30:00-07:00",
  startTime: "2026-02-15T10:00:00-07:00",
  endTime: "2026-02-15T11:30:00-07:00",
  conflictCheck: {
    hasConflicts: false,
    overlappingEvents: []
  },
  attendeeInvitations: {
    sent: 2,
    failed: 0,
    details: []
  }
}
```

### 1.3 Update Events

Modify existing calendar events with change tracking.

**API Method:**
```javascript
const updated = await calendar.updateEvent('event-002', {
  title: "Quarterly Planning & Budget Review",
  endTime: "2026-02-15T12:00:00-07:00", // Extend by 30 min
  description: "Review Q1 objectives, plan Q2 strategy, and discuss budget allocation",
  addAttendees: [
    {
      email: "finance@company.com",
      role: "required"
    }
  ],
  removeAttendees: [],
  updateDescription: "Meeting duration extended to include budget discussion",
  notifyAttendees: true,
  notificationMessage: "Meeting extended by 30 minutes - now until 12:00 PM"
});

// Response
{
  success: true,
  eventId: "event-002",
  changes: {
    title: "Quarterly Planning & Budget Review",
    duration: 120,
    attendeeCount: 3,
    updateMessage: "Meeting duration extended to include budget discussion"
  },
  attendeeNotifications: {
    notified: 3,
    failed: 0
  },
  timestamp: "2026-02-13T08:35:00-07:00"
}
```

### 1.4 Delete Events

Remove calendar events with notification handling.

**API Method:**
```javascript
const deleted = await calendar.deleteEvent('event-002', {
  sendNotification: true,
  notificationMessage: "This meeting has been cancelled. Rescheduling to next Friday at 10:00 AM.",
  updateAttendeeStatus: true
});

// Response
{
  success: true,
  eventId: "event-002",
  title: "Quarterly Planning Meeting",
  deletedTime: "2026-02-13T08:40:00-07:00",
  attendeeNotifications: {
    sent: 3,
    failed: 0
  },
  replacementEventCreated: null
}
```

### 1.5 Add & Manage Attendees

Add, remove, or update attendee information.

**API Methods:**
```javascript
// Add attendees to existing event
const attendeeUpdate = await calendar.addAttendees('event-001', [
  {
    email: "newperson@company.com",
    name: "New Attendee",
    role: "required",
    sendInvitation: true,
    message: "Added to meeting - please review agenda"
  }
]);

// Remove attendees
const removed = await calendar.removeAttendees('event-001', [
  'removed@company.com'
]);

// Check attendee availability
const availability = await calendar.checkAttendeeAvailability([
  'person1@company.com',
  'person2@company.com',
  'person3@company.com'
], {
  startTime: "2026-02-15T10:00:00-07:00",
  endTime: "2026-02-15T12:00:00-07:00",
  bufferMinutes: 15, // Don't suggest slots back-to-back
  preferredDuration: 60 // Prefer 60-minute slots
});

// Response - availability check
{
  success: true,
  requestedTime: "2026-02-15T10:00:00-07:00 to 12:00:00-07:00",
  availability: [
    {
      email: "person1@company.com",
      name: "Person One",
      status: "available",
      availability: {
        "10:00-10:30": "free",
        "10:30-11:00": "tentative", // Has conflicting tentative meeting
        "11:00-12:00": "free"
      }
    },
    {
      email: "person2@company.com",
      name: "Person Two",
      status: "busy",
      reason: "Has conflicting meeting 10:00-11:00",
      suggestedAlternative: "2026-02-15T11:00:00-07:00"
    }
  ],
  commonAvailableSlots: [
    {
      startTime: "2026-02-15T11:00:00-07:00",
      endTime: "2026-02-15T12:00:00-07:00",
      availableAttendees: 3,
      conflictsResolved: ["person2@company.com"]
    }
  ]
}
```

---

## 2. Meeting Preparation Workflow

### 2.1 30-Minute Pre-Meeting Trigger

Integrated with **triggers.json** (`meeting-prep-30min`), automatically activates 30 minutes before any calendar meeting.

**Trigger Configuration:**
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

### 2.2 Meeting Briefing Generation

Automatically prepare comprehensive meeting briefing before the event.

**API Method:**
```javascript
const briefing = await calendar.prepareMeetingBriefing('event-001', {
  includeAttendeeResearch: true,
  includeAgenda: true,
  includeContextDocuments: true,
  includeDecisionTemplate: true,
  includeActionItems: true,
  researchDepth: 2, // Uses deep-researcher skill
  timeLimit: 25 // Must complete in 25 minutes (safety margin before meeting)
});

// Response structure
{
  success: true,
  eventId: "event-001",
  meetingTitle: "Team Standup",
  briefingGenerated: "2026-02-13T08:30:00-07:00",
  briefingContent: {
    
    // 1. Meeting Overview
    overview: {
      title: "Team Standup",
      time: "2026-02-13T09:00:00-07:00 - 09:30:00-07:00",
      duration: 30,
      location: "Conference Room A",
      type: "meeting",
      organizer: "Carol White",
      attendeeCount: 3
    },

    // 2. Attendee Research & Background
    attendees: [
      {
        name: "Alice Smith",
        email: "alice@company.com",
        role: "Engineering Lead",
        recentWork: [
          "API optimization project (85% complete)",
          "Code review queue management",
          "Performance monitoring setup"
        ],
        keyPoints: [
          "Expecting API performance improvement of 20%",
          "Reviewing junior developer code"
        ],
        communicationStyle: "Direct, technical, appreciates data",
        priorMeetingNotes: "Requested weekly sync on performance metrics"
      },
      {
        name: "Bob Jones",
        email: "bob@company.com",
        role: "QA Engineer",
        recentWork: [
          "Test automation for payment flows",
          "Bug fix verification"
        ],
        keyPoints: [
          "Testing API changes in new version",
          "Identified 3 critical bugs"
        ],
        communicationStyle: "Detail-oriented, asks detailed questions"
      },
      {
        name: "Carol White",
        email: "carol@company.com",
        role: "Engineering Manager",
        recentWork: [
          "Team capacity planning",
          "Resource allocation",
          "Stakeholder updates"
        ],
        keyPoints: [
          "Needs team status for board update"
        ],
        communicationStyle: "Big picture thinker, wants executive summary"
      }
    ],

    // 3. Agenda
    agenda: {
      description: "Weekly team synchronization",
      items: [
        {
          topic: "Status Updates (15 min)",
          owner: "Carol White",
          keyPoints: [
            "API optimization progress",
            "Test automation status",
            "Blockers and risks"
          ],
          notes: "Alice and Bob should have updates ready"
        },
        {
          topic: "API Performance Metrics (10 min)",
          owner: "Alice Smith",
          keyPoints: [
            "Current performance baseline",
            "Expected improvement from optimization",
            "Monitoring and alerts setup"
          ],
          notes: "Alice mentioned this is high priority"
        },
        {
          topic: "Open Discussion (5 min)",
          owner: "Carol White",
          keyPoints: [
            "Other blockers",
            "Team concerns",
            "Next week priorities"
          ]
        }
      ]
    },

    // 4. Contextual Documents
    contextDocuments: [
      {
        title: "API Optimization Project Status",
        url: "https://docs.company.com/api-optimization",
        lastUpdated: "2026-02-12T16:00:00-07:00",
        relevanceScore: 0.95,
        summary: "Project 85% complete, performance tests passing, ready for production"
      },
      {
        title: "Q1 Team Goals",
        url: "https://docs.company.com/q1-goals",
        lastUpdated: "2026-02-01T10:00:00-07:00",
        relevanceScore: 0.80,
        summary: "Key metrics include 20% API performance improvement and 95% test coverage"
      },
      {
        title: "Performance Monitoring Dashboard",
        url: "https://monitoring.company.com/team/dashboard",
        relevanceScore: 0.85,
        summary: "Real-time API performance metrics and alerts"
      }
    ],

    // 5. Decision Template
    decisionTemplate: {
      decisions: [],
      decisionsNeeded: [
        {
          question: "Approve API optimization for production?",
          options: ["Yes - approve for prod", "Yes - with conditions", "No - needs more testing"],
          owner: "Carol White",
          deadline: "End of meeting",
          notes: "Alice needs sign-off before release"
        },
        {
          question: "Allocate resources to bug fixes?",
          options: ["Yes - reallocate current sprint", "Yes - next sprint", "No - defer"],
          owner: "Carol White",
          deadline: "End of meeting",
          notes: "3 critical bugs identified by Bob"
        }
      ]
    },

    // 6. Action Items Template
    actionItemsTemplate: {
      format: "Use this template to capture action items during meeting",
      template: [
        {
          action: "[Describe action]",
          owner: "[Who will do it]",
          dueDate: "[When]",
          priority: "[High/Medium/Low]",
          status: "pending"
        }
      ],
      historicalItems: [
        {
          action: "Set up performance monitoring alerts",
          owner: "Alice Smith",
          dueDate: "2026-02-13",
          status: "completed",
          completedDate: "2026-02-13T08:00:00-07:00"
        }
      ]
    },

    // 7. Meeting History
    meetingHistory: {
      totalPriorMeetings: 12,
      lastMeeting: "2026-02-06T09:00:00-07:00",
      historicalTopics: ["Status updates", "Blockers", "Performance metrics"],
      decisionsMade: [
        {
          date: "2026-02-06",
          decision: "Approved API optimization timeline",
          outcome: "Project proceeding on schedule"
        }
      ],
      frequentAttendees: ["Carol White", "Alice Smith", "Bob Jones"]
    },

    // 8. Preparation Checklist
    checklist: {
      items: [
        { item: "Review attendee recent work and context", status: "completed" },
        { item: "Gather agenda and discussion points", status: "completed" },
        { item: "Load relevant documents (3 found)", status: "completed" },
        { item: "Prepare decision template", status: "completed" },
        { item: "Set up action item capture", status: "completed" },
        { item: "Review historical decisions and outcomes", status: "completed" }
      ],
      readyForMeeting: true,
      completedAt: "2026-02-13T08:35:00-07:00"
    }
  },

  // Performance metrics
  metrics: {
    attendeeResearchTime: 4.2,  // seconds
    agendaPreparationTime: 1.8, // seconds
    documentGatheringTime: 3.5, // seconds
    totalPrepTime: 9.5,        // seconds
    documentsFound: 3,
    attendeesResearched: 3
  }
}
```

### 2.3 Attendee Research

Deep research on meeting attendees and their context.

**Integration with deep-researcher skill:**
```javascript
// Automatic attendee research during meeting prep
const attendeeProfiles = await calendar.researchAttendees(
  ['alice@company.com', 'bob@company.com'],
  {
    depth: 2, // Uses deep-researcher skill
    includeRecentWork: true,
    includeCommitmentHistory: true,
    includeCommunicationStyle: true,
    maxTimePerAttendee: 5, // seconds
  }
);
```

---

## 3. Scheduling Intelligence

### 3.1 Find Free Slots

Automatically find available meeting times.

**API Method:**
```javascript
const slots = await calendar.findFreeSlots({
  attendees: [
    'alice@company.com',
    'bob@company.com',
    'carol@company.com'
  ],
  duration: 60, // minutes
  startDate: "2026-02-13",
  endDate: "2026-02-19",
  preferredTimes: {
    dayOfWeek: ["mon", "tue", "wed", "thu"], // Avoid Friday
    startHour: 10,   // 10 AM
    endHour: 16      // 4 PM
  },
  constraints: {
    bufferBefore: 15,  // 15 min before
    bufferAfter: 15,   // 15 min after
    avoidMornings: false,
    avoidAfternoons: false,
    minimumAttendeeAvailability: 0.95 // All attendees must be free
  },
  maxResults: 10
});

// Response
{
  success: true,
  availableSlots: [
    {
      startTime: "2026-02-16T10:00:00-07:00",
      endTime: "2026-02-16T11:00:00-07:00",
      day: "Monday",
      allAttendeesFree: true,
      availableAttendees: 3,
      score: 0.98, // Quality score (100 = perfect for everyone)
      reasonsForScore: [
        "No conflicts for any attendee",
        "Preferred time slot",
        "Preferred day of week"
      ],
      conflictFree: true
    },
    {
      startTime: "2026-02-16T14:00:00-07:00",
      endTime: "2026-02-16T15:00:00-07:00",
      day: "Monday",
      allAttendeesFree: true,
      availableAttendees: 3,
      score: 0.85, // Slightly lower - afternoon slot
      reasonsForScore: [
        "No conflicts for any attendee",
        "Afternoon slot (less preferred)",
        "Good time for west coast attendees"
      ]
    }
  ],
  alternativeSlots: [
    {
      startTime: "2026-02-17T09:00:00-07:00",
      endTime: "2026-02-17T10:00:00-07:00",
      availableAttendees: 2,
      conflicts: [
        {
          email: "alice@company.com",
          reason: "Has tentative meeting",
          moveability: "maybe" // Could potentially reschedule
        }
      ],
      score: 0.72
    }
  ]
}
```

### 3.2 Suggest Optimal Times

Use AI to suggest the best meeting times based on patterns and preferences.

**API Method:**
```javascript
const suggestions = await calendar.suggestOptimalTimes({
  purpose: "Quarterly planning meeting",
  attendees: [
    'alice@company.com',
    'bob@company.com',
    'stakeholder@company.com'
  ],
  duration: 90,
  timezone: "America/Mazatlan",
  constraints: {
    earliestDate: "2026-02-15",
    latestDate: "2026-02-28",
    dayOfWeek: ["mon", "tue", "wed", "thu"], // Working days
    timeRange: [9, 16], // 9 AM - 4 PM
    avoidConflictsForAtLeast: 2, // At least 2 attendees free
  },
  optimizationFactors: {
    attendeePreference: 0.3, // Use historical patterns
    timeOfDay: 0.2,          // Morning vs afternoon preference
    dayOfWeek: 0.2,          // Which days people prefer
    minimizeReschedules: 0.15, // Avoid moving other meetings
    proximity: 0.15          // Cluster with other meetings
  }
});

// Response
{
  success: true,
  suggestions: [
    {
      rank: 1,
      startTime: "2026-02-16T10:00:00-07:00",
      endTime: "2026-02-16T11:30:00-07:00",
      day: "Monday",
      score: 0.94,
      reasoning: [
        "Highest attendee preference for this time (historical data)",
        "Morning slot aligns with user's productivity peak",
        "All attendees are typically free Monday mornings",
        "No conflicts detected",
        "Close to user's preferred meeting time"
      ],
      attendeeReadiness: {
        "alice@company.com": "optimal",
        "bob@company.com": "optimal",
        "stakeholder@company.com": "good"
      },
      probabilityAcceptance: 0.92 // Estimated chance attendees will accept
    },
    {
      rank: 2,
      startTime: "2026-02-18T13:00:00-07:00",
      endTime: "2026-02-18T14:30:00-07:00",
      day: "Wednesday",
      score: 0.87,
      reasoning: [
        "Wednesday is secondary preference",
        "Afternoon slot, but less busy than morning",
        "2 of 3 attendees prefer afternoon slots"
      ],
      probabilityAcceptance: 0.84
    }
  ],
  historicalInsights: {
    userMeetingPattern: "Prefers mornings, Mondays-Wednesdays",
    commonMeetingDuration: 60,
    averageAcceptanceRate: 0.89,
    frequentConflicts: ["Friday afternoons", "After 5 PM"]
  }
}
```

### 3.3 Avoid Conflicts

Smart conflict detection and resolution.

**API Method:**
```javascript
// Check for conflicts
const conflictCheck = await calendar.checkForConflicts({
  startTime: "2026-02-16T10:00:00-07:00",
  endTime: "2026-02-16T11:30:00-07:00",
  attendees: [
    'alice@company.com',
    'bob@company.com'
  ],
  eventType: "meeting",
  tolerance: {
    bufferBefore: 15, // minutes
    bufferAfter: 15,
    allowTentativeConflicts: false
  }
});

// Response
{
  success: true,
  hasConflicts: false,
  attendeeConflicts: [],
  timeSlotAvailability: {
    "alice@company.com": {
      available: true,
      status: "free"
    },
    "bob@company.com": {
      available: true,
      status: "free"
    }
  },
  conflictResolutionOptions: null,
  recommendedAction: "safe_to_schedule"
}

// If conflicts exist
{
  success: true,
  hasConflicts: true,
  conflictCount: 1,
  attendeeConflicts: [
    {
      attendeeEmail: "alice@company.com",
      conflictingEvent: "API Review Meeting",
      conflictTime: "2026-02-16T10:00:00-07:00 - 11:00:00-07:00",
      eventOwner: "engineering-lead@company.com",
      severity: "high", // high/medium/low
      moveability: "maybe", // possible/maybe/unlikely
      resolutionOptions: [
        {
          option: "Move new meeting to 11:30 AM (30 min buffer)",
          impact: "alice will have no break between meetings",
          feasibility: "high"
        },
        {
          option: "Move API Review to Wednesday 10:00 AM",
          impact: "alice prefers mornings, eventOwner may accept",
          feasibility: "medium",
          requiresApproval: "engineering-lead@company.com"
        },
        {
          option: "Keep time, alice attends API Review first, then joins new meeting at 10:45",
          impact: "alice will join meeting 15 minutes late",
          feasibility: "high",
          notes: "Less important than API Review per historical patterns"
        }
      ]
    }
  ]
}
```

---

## 4. Integration with Triggers & Workflow

### 4.1 Meeting Prep Trigger Flow

When meeting-prep-30min trigger fires:

```
T-30min: Trigger fires for upcoming meeting
         ↓
         Fetch calendar event details
         ↓
         Generate meeting briefing (from section 2.2)
         ↓
         Research attendees (from section 2.3)
         ↓
         Load context documents
         ↓
         Display briefing to user
         ↓
         Store in memory for decision tracking
         ↓
         Log action item templates
         ↓
T-5min:  Gentle reminder notification
         ↓
T+0:     Meeting starts
```

### 4.2 Integration with TASKS.md

Meeting preparation tasks can be manually triggered:

```markdown
## Calendar & Meetings

- [ ] Prepare briefing for team standup (Priority: Auto, Schedule: 8:30 AM, ID: task-prep-001)
  Trigger: Meeting at 09:00 | Type: Auto-generated | Status: Ready
  
- [ ] Research attendees for quarterly planning (Priority: High, ID: task-research-001)
  Meeting: Quarterly Planning | Date: 2026-02-15 | Due: 2026-02-15 10:00

- [ ] Find available slots for stakeholder meeting (Priority: Medium, ID: task-slots-001)
  Attendees: 4 | Duration: 90 min | Window: 2026-02-20 to 2026-02-28
```

### 4.3 Integration with MEMORY.md

Track meeting decisions and patterns:

```markdown
## Meeting Patterns

### Weekly Standup (Team)
- Time: Monday 9:00 AM (consistent)
- Attendees: Alice, Bob, Carol
- Duration: 30 minutes
- Key topics: Status updates, blockers, performance
- Decision rate: 2-3 decisions per meeting
- Approval rate: 95% (decisions rarely revisited)

### Quarterly Planning
- Time: Mid-month (always)
- Attendees: ~8-10 people
- Duration: 90-120 minutes
- Key topics: Goals, resource allocation, budget
- Decisions: Strategic alignment needed
- Follow-up: 70% result in action items

## Meeting Decisions Made
- 2026-02-06: Approved API optimization timeline
  Status: On track, 85% complete
- 2026-02-06: Deferred payment system rewrite
  Status: Scheduled for Q2
```

---

## 5. Implementation & APIs

### 5.1 Core Methods

```javascript
const calendar = require('./calendar-integration');

// Calendar Operations
await calendar.fetchUpcomingEvents(options);
await calendar.createEvent(eventData);
await calendar.updateEvent(eventId, changes);
await calendar.deleteEvent(eventId, options);
await calendar.addAttendees(eventId, attendees);
await calendar.removeAttendees(eventId, emails);
await calendar.checkAttendeeAvailability(emails, timeWindow);

// Meeting Preparation
await calendar.prepareMeetingBriefing(eventId, options);
await calendar.researchAttendees(emails, options);

// Scheduling Intelligence
await calendar.findFreeSlots(criteria);
await calendar.suggestOptimalTimes(preferences);
await calendar.checkForConflicts(timeWindow);

// Event Listeners
calendar.on('event_created', (event) => {});
calendar.on('event_updated', (event) => {});
calendar.on('event_deleted', (event) => {});
calendar.on('meeting_prep_ready', (briefing) => {});
```

### 5.2 Calendar Providers

Supported integrations:
- **Google Calendar** — Full read/write support
- **Microsoft Outlook** — Full read/write support
- **Apple Calendar** — Read-only (iCloud)
- **CalDAV** — Standard protocol support

Configuration in `calendar-config.json`

---

## 6. Configuration

See `calendar-config.json` for:
- Calendar provider credentials
- Meeting types and categories
- Preparation templates
- Notification preferences
- Integration settings

---

## 7. Performance & Safety

### Performance Targets
- Fetch upcoming events: <500ms
- Meeting briefing generation: <30s
- Free slot calculation: <2s
- Attendee research: <5s per person

### Safety Guardrails
1. **No Auto-Accept** — Never automatically accept meeting invitations
2. **Verification** — Always show attendee changes before sending
3. **Notification** — Always notify attendees when events are modified
4. **Conflict Warning** — Warn before creating conflicting events
5. **Approval** — Require user confirmation for significant changes
6. **Rate Limiting** — Don't send more than 10 meeting invitations per minute
7. **Privacy** — Don't expose sensitive meeting details without need

---

## 8. Testing & Validation

### Unit Tests
```bash
npm test
# Tests calendar operations, meeting prep, scheduling algorithms
```

### Integration Tests
- Create test meeting event
- Generate briefing 30 minutes before
- Verify attendee research completion
- Check free slot calculation accuracy
- Confirm trigger integration with triggers.json

### User Acceptance Criteria
✅ Calendar operations work reliably  
✅ Meeting prep generates useful briefings  
✅ Attendee research provides value  
✅ Free slot finding is accurate  
✅ Conflict detection prevents double-booking  
✅ Trigger integration works seamlessly  

---

## 9. Files in This Skill

- **SKILL.md** — This documentation
- **calendar-integration.js** — Core calendar operations
- **meeting-briefing.js** — Meeting preparation engine
- **attendee-researcher.js** — Attendee background research
- **scheduling-intelligence.js** — Free slot/conflict logic
- **calendar-provider.js** — Multi-provider abstraction
- **package.json** — Dependencies

---

**Last Updated:** 2026-02-13 08:45 GMT-7  
**Status:** ✅ Operational and integrated with triggers.json  
**Version:** 1.0.0
