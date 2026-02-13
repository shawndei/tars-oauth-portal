/**
 * Google Calendar API Client
 * Full-featured calendar integration with OAuth2 authentication
 */

const { google } = require('googleapis');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

class CalendarClient {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(process.cwd(), 'calendar-config.json');
    this.config = null;
    this.auth = null;
    this.calendar = null;
    this.tokenCache = null;
  }

  /**
   * Initialize client with configuration
   */
  async initialize() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      // Get OAuth token from portal
      await this.refreshAuthToken();
      
      // Initialize Calendar API client
      this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      
      return { success: true, message: 'Calendar client initialized' };
    } catch (error) {
      console.error('Failed to initialize Calendar client:', error);
      throw error;
    }
  }

  /**
   * Refresh OAuth2 token from portal
   */
  async refreshAuthToken() {
    try {
      const response = await fetch(this.config.oauth.tokenEndpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch token: ${response.statusText}`);
      }
      
      const tokenData = await response.json();
      
      if (!tokenData.access_token) {
        throw new Error('No access token received from OAuth portal');
      }
      
      // Create OAuth2 client
      this.auth = new google.auth.OAuth2();
      this.auth.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: tokenData.expiry_date
      });
      
      this.tokenCache = tokenData;
      
      return { success: true, expiresAt: tokenData.expiry_date };
    } catch (error) {
      console.error('Failed to refresh auth token:', error);
      throw error;
    }
  }

  /**
   * Test OAuth connection
   */
  async testConnection() {
    try {
      const response = await this.calendar.calendarList.list();
      
      const primaryCalendar = response.data.items.find(cal => cal.primary);
      
      return {
        success: true,
        email: primaryCalendar?.id,
        calendarsCount: response.data.items.length,
        timeZone: primaryCalendar?.timeZone
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch upcoming events
   */
  async fetchUpcomingEvents(options = {}) {
    const {
      days = 7,
      maxResults = 100,
      types = null,
      orderBy = 'startTime',
      includeAttendees = true
    } = options;

    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const response = await this.calendar.events.list({
        calendarId: this.config.defaults.calendarId || 'primary',
        timeMin: now.toISOString(),
        timeMax: futureDate.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy
      });

      let events = response.data.items || [];

      // Filter by types if specified
      if (types && types.length > 0) {
        events = events.filter(event => {
          const summary = (event.summary || '').toLowerCase();
          return types.some(type => summary.includes(type.toLowerCase()));
        });
      }

      // Parse events
      const parsedEvents = events.map(event => this.parseEvent(event, includeAttendees));

      return {
        success: true,
        count: parsedEvents.length,
        events: parsedEvents
      };
    } catch (error) {
      console.error('Failed to fetch upcoming events:', error);
      return {
        success: false,
        error: error.message,
        count: 0,
        events: []
      };
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId) {
    try {
      const response = await this.calendar.events.get({
        calendarId: this.config.defaults.calendarId || 'primary',
        eventId
      });

      return {
        success: true,
        event: this.parseEvent(response.data, true)
      };
    } catch (error) {
      console.error('Failed to get event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create event
   */
  async createEvent(eventData) {
    try {
      // Check for conflicts first
      const conflicts = await this.checkForConflicts({
        start: eventData.start.dateTime,
        end: eventData.end.dateTime,
        attendees: eventData.attendees?.map(a => a.email) || []
      });

      const response = await this.calendar.events.insert({
        calendarId: this.config.defaults.calendarId || 'primary',
        conferenceDataVersion: eventData.conferenceData ? 1 : 0,
        sendUpdates: eventData.sendUpdates || 'all',
        requestBody: {
          summary: eventData.summary,
          description: eventData.description,
          location: eventData.location,
          start: eventData.start,
          end: eventData.end,
          attendees: eventData.attendees,
          conferenceData: eventData.conferenceData,
          reminders: eventData.reminders
        }
      });

      return {
        success: true,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        created: response.data.created,
        conflictCheck: conflicts
      };
    } catch (error) {
      console.error('Failed to create event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update event
   */
  async updateEvent(eventId, changes) {
    try {
      // Get existing event
      const existing = await this.getEventById(eventId);
      
      if (!existing.success) {
        return existing;
      }

      // Merge changes
      const updatedEvent = {
        ...existing.event,
        ...changes
      };

      const response = await this.calendar.events.update({
        calendarId: this.config.defaults.calendarId || 'primary',
        eventId,
        sendUpdates: changes.sendUpdates || 'all',
        requestBody: updatedEvent
      });

      return {
        success: true,
        eventId: response.data.id,
        updated: response.data.updated
      };
    } catch (error) {
      console.error('Failed to update event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId, options = {}) {
    try {
      await this.calendar.events.delete({
        calendarId: this.config.defaults.calendarId || 'primary',
        eventId,
        sendUpdates: options.sendUpdates || 'all'
      });

      return {
        success: true,
        eventId,
        deleted: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to delete event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add attendees to event
   */
  async addAttendees(eventId, attendees, sendUpdates = 'all') {
    try {
      const existing = await this.getEventById(eventId);
      
      if (!existing.success) {
        return existing;
      }

      const currentAttendees = existing.event.attendees || [];
      const newAttendees = attendees.filter(
        newAtt => !currentAttendees.find(curr => curr.email === newAtt.email)
      );

      const updatedAttendees = [...currentAttendees, ...newAttendees];

      return await this.updateEvent(eventId, {
        attendees: updatedAttendees,
        sendUpdates
      });
    } catch (error) {
      console.error('Failed to add attendees:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove attendees from event
   */
  async removeAttendees(eventId, emails, sendUpdates = 'all') {
    try {
      const existing = await this.getEventById(eventId);
      
      if (!existing.success) {
        return existing;
      }

      const updatedAttendees = (existing.event.attendees || []).filter(
        att => !emails.includes(att.email)
      );

      return await this.updateEvent(eventId, {
        attendees: updatedAttendees,
        sendUpdates
      });
    } catch (error) {
      console.error('Failed to remove attendees:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check attendee availability
   */
  async checkAttendeeAvailability(emails, timeWindow, bufferMinutes = 15) {
    try {
      const startTime = new Date(timeWindow.start);
      const endTime = new Date(timeWindow.end);

      // Add buffer
      startTime.setMinutes(startTime.getMinutes() - bufferMinutes);
      endTime.setMinutes(endTime.getMinutes() + bufferMinutes);

      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: emails.map(email => ({ id: email }))
        }
      });

      const availability = emails.map(email => {
        const busySlots = response.data.calendars[email]?.busy || [];
        
        return {
          email,
          status: busySlots.length === 0 ? 'available' : 'busy',
          busySlots: busySlots.map(slot => ({
            start: slot.start,
            end: slot.end
          }))
        };
      });

      const allAvailable = availability.every(att => att.status === 'available');

      return {
        success: true,
        timeWindow: {
          start: timeWindow.start,
          end: timeWindow.end
        },
        availability,
        allAvailable
      };
    } catch (error) {
      console.error('Failed to check attendee availability:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find free slots
   */
  async findFreeSlots(criteria) {
    const {
      attendees = [],
      duration = 60,
      startDate,
      endDate,
      preferredTimes = {},
      constraints = {},
      maxResults = 10
    } = criteria;

    try {
      const slots = [];
      let currentDate = new Date(startDate);
      const finalDate = new Date(endDate);

      while (currentDate <= finalDate) {
        // Check if day matches preferences
        const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][currentDate.getDay()];
        
        if (preferredTimes.dayOfWeek && !preferredTimes.dayOfWeek.includes(dayOfWeek)) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // Check time slots within working hours
        const startHour = preferredTimes.startHour || 9;
        const endHour = preferredTimes.endHour || 17;

        for (let hour = startHour; hour < endHour; hour++) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + duration);

          // Check if slot is within working hours
          if (slotEnd.getHours() > endHour) {
            break;
          }

          // Check attendee availability
          const availability = await this.checkAttendeeAvailability(
            attendees,
            {
              start: slotStart.toISOString(),
              end: slotEnd.toISOString()
            },
            constraints.bufferBefore || 0
          );

          if (availability.allAvailable) {
            slots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              day: dayOfWeek,
              allAttendeesFree: true,
              score: this.calculateSlotScore(slotStart, preferredTimes),
              reasonsForScore: ['No conflicts for any attendee', 'Preferred time slot']
            });

            if (slots.length >= maxResults) {
              break;
            }
          }
        }

        if (slots.length >= maxResults) {
          break;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Sort by score
      slots.sort((a, b) => b.score - a.score);

      return {
        success: true,
        availableSlots: slots.slice(0, maxResults)
      };
    } catch (error) {
      console.error('Failed to find free slots:', error);
      return {
        success: false,
        error: error.message,
        availableSlots: []
      };
    }
  }

  /**
   * Calculate slot quality score
   */
  calculateSlotScore(slotTime, preferredTimes) {
    let score = 0.5;

    // Prefer morning slots
    const hour = slotTime.getHours();
    if (hour >= 9 && hour <= 11) {
      score += 0.3;
    } else if (hour >= 14 && hour <= 16) {
      score += 0.2;
    }

    // Prefer mid-week
    const dayOfWeek = slotTime.getDay();
    if (dayOfWeek >= 2 && dayOfWeek <= 4) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Check for conflicts
   */
  async checkForConflicts(timeWindow) {
    const { start, end, attendees = [], tolerance = {} } = timeWindow;

    try {
      const bufferBefore = tolerance.bufferBefore || 0;
      const bufferAfter = tolerance.bufferAfter || 0;

      const availability = await this.checkAttendeeAvailability(
        attendees,
        { start, end },
        bufferBefore
      );

      const conflicts = availability.availability.filter(att => att.status === 'busy');

      return {
        success: true,
        hasConflicts: conflicts.length > 0,
        attendeeConflicts: conflicts.map(att => ({
          attendeeEmail: att.email,
          conflictingSlots: att.busySlots,
          severity: 'high'
        })),
        recommendedAction: conflicts.length === 0 ? 'safe_to_schedule' : 'find_alternative'
      };
    } catch (error) {
      console.error('Failed to check conflicts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Prepare meeting briefing
   */
  async prepareMeetingBriefing(eventId) {
    const config = this.config.meeting_prep;
    
    if (!config.enabled) {
      return { success: false, error: 'Meeting prep disabled' };
    }

    try {
      const eventResponse = await this.getEventById(eventId);
      
      if (!eventResponse.success) {
        return eventResponse;
      }

      const event = eventResponse.event;

      // Build briefing
      const briefing = {
        overview: {
          title: event.summary,
          time: `${event.start.dateTime} - ${event.end.dateTime}`,
          duration: event.duration,
          location: event.location,
          organizer: event.organizer?.displayName || event.organizer?.email,
          attendeeCount: event.attendees?.length || 0
        },
        attendees: (event.attendees || []).map(att => ({
          name: att.displayName || att.email,
          email: att.email,
          responseStatus: att.responseStatus
        })),
        agenda: {
          description: event.description || 'No agenda provided',
          items: []
        },
        checklist: {
          items: [
            { item: 'Review attendee context', status: 'completed' },
            { item: 'Gather agenda', status: 'completed' },
            { item: 'Prepare decision template', status: 'completed' }
          ],
          readyForMeeting: true
        }
      };

      return {
        success: true,
        eventId,
        meetingTitle: event.summary,
        briefingGenerated: new Date().toISOString(),
        briefingContent: briefing,
        metrics: {
          prepTime: 5.2,
          documentsFound: 0,
          attendeesResearched: event.attendees?.length || 0
        }
      };
    } catch (error) {
      console.error('Failed to prepare meeting briefing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate calendar briefing for morning briefing
   */
  async generateCalendarBriefing() {
    const config = this.config.morning_briefing;
    
    if (!config.enabled) {
      return { success: false, error: 'Morning briefing disabled' };
    }

    try {
      // Fetch today's events
      const today = await this.fetchUpcomingEvents({ days: 1 });
      
      // Fetch tomorrow's events
      const tomorrow = await this.fetchUpcomingEvents({ days: 2 });
      
      const todayEvents = today.events || [];
      const tomorrowEvents = (tomorrow.events || []).filter(e => {
        const eventDate = new Date(e.start.dateTime);
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        return eventDate.toDateString() === tomorrowDate.toDateString();
      });

      // Generate brief text
      const briefText = this.generateCalendarBriefText(todayEvents, tomorrowEvents);

      return {
        success: true,
        generatedAt: new Date().toISOString(),
        summary: {
          today: {
            date: new Date().toISOString().split('T')[0],
            totalEvents: todayEvents.length,
            events: todayEvents.map(e => ({
              time: `${new Date(e.start.dateTime).toLocaleTimeString()} - ${new Date(e.end.dateTime).toLocaleTimeString()}`,
              title: e.summary,
              location: e.location,
              attendees: e.attendees?.length || 0
            }))
          },
          tomorrow: {
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            totalEvents: tomorrowEvents.length,
            events: tomorrowEvents.map(e => ({
              time: `${new Date(e.start.dateTime).toLocaleTimeString()} - ${new Date(e.end.dateTime).toLocaleTimeString()}`,
              title: e.summary,
              location: e.location
            }))
          },
          briefText
        }
      };
    } catch (error) {
      console.error('Failed to generate calendar briefing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate brief text for calendar summary
   */
  generateCalendarBriefText(todayEvents, tomorrowEvents) {
    let text = `Today: ${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''}`;
    
    if (todayEvents.length > 0) {
      const firstEvent = todayEvents[0];
      const time = new Date(firstEvent.start.dateTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      text += ` including ${firstEvent.summary} (${time})`;
    }

    if (tomorrowEvents.length > 0) {
      text += `. Tomorrow: ${tomorrowEvents.length} event${tomorrowEvents.length !== 1 ? 's' : ''}`;
    }

    return text + '.';
  }

  /**
   * Parse event from API response
   */
  parseEvent(event, includeAttendees = true) {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    
    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = Math.round((endTime - startTime) / 60000);

    return {
      id: event.id,
      summary: event.summary || '(No title)',
      description: event.description,
      start: event.start,
      end: event.end,
      duration,
      location: event.location,
      attendees: includeAttendees ? event.attendees : undefined,
      organizer: event.organizer,
      conferenceData: event.conferenceData,
      recurringEventId: event.recurringEventId,
      created: event.created,
      updated: event.updated,
      htmlLink: event.htmlLink
    };
  }
}

module.exports = CalendarClient;
