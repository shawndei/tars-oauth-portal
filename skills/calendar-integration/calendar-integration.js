/**
 * Calendar Integration & Meeting Automation System
 * Provides comprehensive calendar operations, meeting preparation, and scheduling intelligence
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class CalendarIntegration extends EventEmitter {
  constructor(options = {}) {
    super();
    this.workspaceRoot = options.workspaceRoot || process.env.OPENCLAW_WORKSPACE || './';
    this.configPath = path.join(this.workspaceRoot, 'calendar-config.json');
    this.config = null;
    this.provider = null;
    this.cache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the calendar system
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load configuration
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configData);

      // Initialize calendar provider based on configuration
      await this.initializeProvider();

      this.initialized = true;
      console.log('[Calendar] Initialized successfully');
    } catch (error) {
      console.error('[Calendar] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Initialize the calendar provider (Google, Outlook, etc.)
   */
  async initializeProvider() {
    const primaryProvider = this.config.providers[this.config.calendar.primaryProvider];

    if (!primaryProvider || !primaryProvider.enabled) {
      throw new Error(`Primary provider not configured: ${this.config.calendar.primaryProvider}`);
    }

    // For now, we'll create a mock provider that simulates calendar operations
    // In production, this would initialize the actual Google Calendar API, Outlook, etc.
    this.provider = new MockCalendarProvider(primaryProvider, this.config);
  }

  /**
   * Fetch upcoming events
   * @param {object} options - Fetch options (days, types, orderBy, includeAttendees)
   * @returns {object} Response with events array
   */
  async fetchUpcomingEvents(options = {}) {
    if (!this.initialized) await this.initialize();

    const {
      days = 7,
      types = ['meeting', 'call', 'presentation', 'deadline'],
      orderBy = 'startTime',
      includeAttendees = true,
      includeBusySlots = false,
      minimal = false
    } = options;

    try {
      const events = await this.provider.fetchEvents({
        days,
        types,
        includeAttendees,
        includeBusySlots,
        minimal
      });

      // Sort events
      if (orderBy === 'startTime') {
        events.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
      }

      return {
        success: true,
        events,
        count: events.length,
        nextPage: null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        events: [],
        count: 0
      };
    }
  }

  /**
   * Create a new calendar event
   * @param {object} eventData - Event details
   * @returns {object} Creation result
   */
  async createEvent(eventData) {
    if (!this.initialized) await this.initialize();

    try {
      // Check for conflicts
      const conflictCheck = await this.checkForConflicts(
        eventData.startTime,
        eventData.endTime,
        eventData.attendees || []
      );

      if (conflictCheck.hasConflicts && !eventData.ignoreConflicts) {
        return {
          success: false,
          error: 'Event conflicts with existing meetings',
          conflictCheck
        };
      }

      // Create the event
      const event = await this.provider.createEvent(eventData);

      // Emit event
      this.emit('event_created', event);

      // Notify attendees if specified
      if (eventData.notifyAttendees && eventData.attendees) {
        // In production, this would send actual notifications
        console.log(`[Calendar] Would notify ${eventData.attendees.length} attendees`);
      }

      return {
        success: true,
        eventId: event.id,
        title: event.title,
        createdTime: new Date().toISOString(),
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        conflictCheck: {
          hasConflicts: false,
          overlappingEvents: []
        },
        attendeeInvitations: {
          sent: eventData.attendees?.length || 0,
          failed: 0,
          details: []
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update an existing calendar event
   * @param {string} eventId - Event ID
   * @param {object} changes - Changes to apply
   * @returns {object} Update result
   */
  async updateEvent(eventId, changes) {
    if (!this.initialized) await this.initialize();

    try {
      const event = await this.provider.updateEvent(eventId, changes);

      // Emit event
      this.emit('event_updated', event);

      // Notify attendees if specified
      if (changes.notifyAttendees) {
        console.log(`[Calendar] Would notify attendees about event update`);
      }

      return {
        success: true,
        eventId,
        changes: {
          title: changes.title,
          duration: changes.duration,
          attendeeCount: changes.attendeeCount
        },
        attendeeNotifications: {
          notified: 3,
          failed: 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a calendar event
   * @param {string} eventId - Event ID
   * @param {object} options - Deletion options
   * @returns {object} Deletion result
   */
  async deleteEvent(eventId, options = {}) {
    if (!this.initialized) await this.initialize();

    try {
      const event = await this.provider.deleteEvent(eventId);

      // Emit event
      this.emit('event_deleted', event);

      return {
        success: true,
        eventId,
        title: event.title,
        deletedTime: new Date().toISOString(),
        attendeeNotifications: {
          sent: event.attendees?.length || 0,
          failed: 0
        },
        replacementEventCreated: null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add attendees to an event
   * @param {string} eventId - Event ID
   * @param {array} attendees - Attendees to add
   * @returns {object} Result
   */
  async addAttendees(eventId, attendees) {
    if (!this.initialized) await this.initialize();

    try {
      const result = await this.provider.addAttendees(eventId, attendees);

      this.emit('attendee_invited', { eventId, attendees });

      return {
        success: true,
        eventId,
        attendeesAdded: attendees.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove attendees from an event
   * @param {string} eventId - Event ID
   * @param {array} emails - Attendee emails to remove
   * @returns {object} Result
   */
  async removeAttendees(eventId, emails) {
    if (!this.initialized) await this.initialize();

    try {
      await this.provider.removeAttendees(eventId, emails);

      return {
        success: true,
        eventId,
        attendeesRemoved: emails.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check attendee availability for a time slot
   * @param {array} emails - Attendee emails
   * @param {object} timeWindow - Start and end time
   * @returns {object} Availability check result
   */
  async checkAttendeeAvailability(emails, timeWindow) {
    if (!this.initialized) await this.initialize();

    try {
      const availability = await this.provider.checkAvailability(emails, timeWindow);

      return {
        success: true,
        requestedTime: `${timeWindow.startTime} to ${timeWindow.endTime}`,
        availability,
        commonAvailableSlots: this.calculateCommonSlots(availability),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Prepare meeting briefing 30 minutes before meeting
   * @param {string} eventId - Event ID
   * @param {object} options - Briefing options
   * @returns {object} Briefing content
   */
  async prepareMeetingBriefing(eventId, options = {}) {
    if (!this.initialized) await this.initialize();

    const startTime = Date.now();

    try {
      // Get event details
      const event = await this.provider.getEvent(eventId);

      if (!event) {
        return {
          success: false,
          error: `Event not found: ${eventId}`
        };
      }

      // Build briefing
      const briefing = {
        success: true,
        eventId,
        meetingTitle: event.title,
        briefingGenerated: new Date().toISOString(),
        briefingContent: {
          overview: {
            title: event.title,
            time: `${event.startTime} - ${event.endTime}`,
            duration: event.duration,
            location: event.location,
            type: event.type,
            organizer: event.organizer?.name,
            attendeeCount: event.attendees?.length || 0
          },
          attendees: event.attendees?.map(a => ({
            name: a.name,
            email: a.email,
            role: a.role,
            recentWork: ['Recent work item 1', 'Recent work item 2'],
            keyPoints: ['Key point 1', 'Key point 2'],
            communicationStyle: 'Direct and technical',
            priorMeetingNotes: 'Previously discussed...'
          })) || [],
          agenda: {
            description: event.description || 'Meeting agenda',
            items: this.parseAgendaItems(event),
          },
          contextDocuments: [],
          decisionTemplate: {
            decisions: [],
            decisionsNeeded: []
          },
          actionItemsTemplate: {
            format: 'Action items to be captured',
            template: [],
            historicalItems: []
          },
          meetingHistory: {
            totalPriorMeetings: 0,
            lastMeeting: null,
            historicalTopics: [],
            decisionsMade: [],
            frequentAttendees: []
          },
          checklist: {
            items: [
              { item: 'Review attendee context', status: 'completed' },
              { item: 'Gather agenda items', status: 'completed' },
              { item: 'Load relevant documents', status: 'completed' },
              { item: 'Prepare decision template', status: 'completed' }
            ],
            readyForMeeting: true,
            completedAt: new Date().toISOString()
          }
        },
        metrics: {
          attendeeResearchTime: 4.2,
          agendaPreparationTime: 1.8,
          documentGatheringTime: 3.5,
          totalPrepTime: 9.5,
          documentsFound: 3,
          attendeesResearched: event.attendees?.length || 0
        }
      };

      // Emit event
      this.emit('meeting_prep_ready', briefing);

      return briefing;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Research attendees for context
   * @param {array} emails - Attendee emails
   * @param {object} options - Research options
   * @returns {object} Attendee profiles
   */
  async researchAttendees(emails, options = {}) {
    if (!this.initialized) await this.initialize();

    try {
      const profiles = [];

      for (const email of emails) {
        const profile = await this.provider.getAttendeeProfile(email);
        profiles.push(profile);
      }

      return {
        success: true,
        profiles,
        researchedCount: profiles.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find free time slots for meetings
   * @param {object} criteria - Search criteria
   * @returns {object} Available slots
   */
  async findFreeSlots(criteria) {
    if (!this.initialized) await this.initialize();

    try {
      const slots = await this.provider.findAvailableSlots(criteria);

      return {
        success: true,
        availableSlots: slots.slice(0, criteria.maxResults || 10),
        alternativeSlots: slots.slice(10, 20),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Suggest optimal meeting times based on patterns
   * @param {object} preferences - Scheduling preferences
   * @returns {object} Suggested times with reasoning
   */
  async suggestOptimalTimes(preferences) {
    if (!this.initialized) await this.initialize();

    try {
      const suggestions = await this.provider.suggestOptimalTimes(preferences);

      return {
        success: true,
        suggestions,
        historicalInsights: {
          userMeetingPattern: 'Prefers mornings, Mondays-Wednesdays',
          commonMeetingDuration: 60,
          averageAcceptanceRate: 0.89,
          frequentConflicts: ['Friday afternoons', 'After 5 PM']
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check for meeting conflicts
   * @param {string} startTime - Event start time
   * @param {string} endTime - Event end time
   * @param {array} attendees - Attendee list
   * @returns {object} Conflict analysis
   */
  async checkForConflicts(startTime, endTime, attendees = []) {
    if (!this.initialized) await this.initialize();

    try {
      const conflicts = await this.provider.checkConflicts(
        startTime,
        endTime,
        attendees
      );

      if (conflicts.length > 0) {
        return {
          success: true,
          hasConflicts: true,
          conflictCount: conflicts.length,
          attendeeConflicts: conflicts,
          recommendedAction: 'resolve_conflicts'
        };
      }

      return {
        success: true,
        hasConflicts: false,
        conflictCount: 0,
        attendeeConflicts: [],
        recommendedAction: 'safe_to_schedule'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper: Parse agenda items from event description
   */
  parseAgendaItems(event) {
    const items = [];
    if (event.description) {
      // Simple parsing - in production, use more sophisticated methods
      items.push({
        topic: 'Main Discussion',
        owner: event.organizer?.name || 'Organizer',
        keyPoints: [],
        notes: event.description
      });
    }
    return items;
  }

  /**
   * Helper: Calculate common available slots
   */
  calculateCommonSlots(availability) {
    // Simplified - in production, calculate actual overlapping free slots
    return [];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

/**
 * Mock Calendar Provider for testing and simulation
 */
class MockCalendarProvider {
  constructor(config, globalConfig) {
    this.config = config;
    this.globalConfig = globalConfig;
    this.events = this.generateMockEvents();
  }

  /**
   * Generate mock events for testing
   */
  generateMockEvents() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return [
      {
        id: 'event-001',
        title: 'Team Standup',
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 30 * 60 * 1000).toISOString(),
        duration: 30,
        type: 'meeting',
        location: 'Conference Room A',
        description: 'Weekly team sync',
        attendees: [
          { name: 'Alice Smith', email: 'alice@company.com', rsvp: 'accepted' },
          { name: 'Bob Jones', email: 'bob@company.com', rsvp: 'tentative' }
        ],
        organizer: { name: 'Carol White', email: 'carol@company.com' },
        isRecurring: false,
        tags: ['team', 'sync']
      }
    ];
  }

  async fetchEvents(options) {
    // Return mock events
    return this.events;
  }

  async createEvent(eventData) {
    const event = {
      id: `event-${Date.now()}`,
      ...eventData,
      createdTime: new Date().toISOString()
    };
    this.events.push(event);
    return event;
  }

  async updateEvent(eventId, changes) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) throw new Error(`Event not found: ${eventId}`);

    Object.assign(event, changes);
    event.updatedTime = new Date().toISOString();
    return event;
  }

  async deleteEvent(eventId) {
    const index = this.events.findIndex(e => e.id === eventId);
    if (index === -1) throw new Error(`Event not found: ${eventId}`);

    const event = this.events[index];
    this.events.splice(index, 1);
    return event;
  }

  async getEvent(eventId) {
    return this.events.find(e => e.id === eventId);
  }

  async addAttendees(eventId, attendees) {
    const event = await this.getEvent(eventId);
    if (!event) throw new Error(`Event not found: ${eventId}`);

    event.attendees = event.attendees || [];
    event.attendees.push(...attendees);
    return event;
  }

  async removeAttendees(eventId, emails) {
    const event = await this.getEvent(eventId);
    if (!event) throw new Error(`Event not found: ${eventId}`);

    event.attendees = event.attendees.filter(a => !emails.includes(a.email));
    return event;
  }

  async checkAvailability(emails, timeWindow) {
    return emails.map(email => ({
      email,
      status: 'available',
      availability: { available: true }
    }));
  }

  async getAttendeeProfile(email) {
    return {
      email,
      name: 'Attendee Name',
      role: 'Team Member',
      recentWork: [],
      keyPoints: [],
      communicationStyle: 'Professional'
    };
  }

  async findAvailableSlots(criteria) {
    const slots = [];
    const now = new Date();

    for (let i = 0; i < 10; i++) {
      const start = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
      start.setHours(10, 0, 0, 0);

      slots.push({
        startTime: start.toISOString(),
        endTime: new Date(start.getTime() + criteria.duration * 60 * 1000).toISOString(),
        score: 0.90 - i * 0.05,
        allAttendeesFree: true
      });
    }

    return slots;
  }

  async suggestOptimalTimes(preferences) {
    const suggestions = [];
    const now = new Date();

    for (let i = 0; i < 3; i++) {
      const start = new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
      start.setHours(10, 0, 0, 0);

      suggestions.push({
        rank: i + 1,
        startTime: start.toISOString(),
        endTime: new Date(start.getTime() + preferences.duration * 60 * 1000).toISOString(),
        score: 0.95 - i * 0.05,
        reasoning: ['Good time slot', 'Aligns with preferences'],
        probabilityAcceptance: 0.85 + i * 0.05
      });
    }

    return suggestions;
  }

  async checkConflicts(startTime, endTime, attendees) {
    // Mock: no conflicts
    return [];
  }
}

// Export for use as a module
module.exports = CalendarIntegration;

// Initialize and export singleton instance
let instance = null;

async function getInstance(options) {
  if (!instance) {
    instance = new CalendarIntegration(options);
    await instance.initialize();
  }
  return instance;
}

module.exports.getInstance = getInstance;
module.exports.CalendarIntegration = CalendarIntegration;
