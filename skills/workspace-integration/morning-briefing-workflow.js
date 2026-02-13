/**
 * Morning Briefing Workflow
 * Combines Gmail and Google Calendar integrations for daily briefing
 */

const GmailClient = require('./gmail/gmail-client');
const CalendarClient = require('./calendar/calendar-client');
const path = require('path');

class MorningBriefingWorkflow {
  constructor() {
    this.gmail = new GmailClient(path.join(process.cwd(), 'gmail-config.json'));
    this.calendar = new CalendarClient(path.join(process.cwd(), 'calendar-config.json'));
    this.initialized = false;
  }

  /**
   * Initialize both clients
   */
  async initialize() {
    try {
      await this.gmail.initialize();
      await this.calendar.initialize();
      this.initialized = true;
      return { success: true, message: 'Morning briefing workflow initialized' };
    } catch (error) {
      console.error('Failed to initialize morning briefing workflow:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate comprehensive morning briefing
   */
  async generateBriefing() {
    if (!this.initialized) {
      const init = await this.initialize();
      if (!init.success) {
        return init;
      }
    }

    try {
      console.log('📊 Generating morning briefing...\n');

      // Fetch email briefing
      console.log('📧 Fetching email summary...');
      const emailBriefing = await this.gmail.generateMorningBriefing();
      
      // Fetch calendar briefing
      console.log('📅 Fetching calendar summary...');
      const calendarBriefing = await this.calendar.generateCalendarBriefing();

      if (!emailBriefing.success || !calendarBriefing.success) {
        return {
          success: false,
          error: 'Failed to generate complete briefing',
          emailError: emailBriefing.error,
          calendarError: calendarBriefing.error
        };
      }

      // Combine briefings
      const briefing = this.combineBriefings(emailBriefing, calendarBriefing);

      return {
        success: true,
        generatedAt: new Date().toISOString(),
        briefing
      };
    } catch (error) {
      console.error('Failed to generate morning briefing:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Combine email and calendar briefings
   */
  combineBriefings(emailBriefing, calendarBriefing) {
    const email = emailBriefing.summary;
    const calendar = calendarBriefing.summary;

    // Build comprehensive briefing
    const briefing = {
      overview: this.generateOverview(email, calendar),
      email: {
        totalUnread: email.totalUnread,
        categories: email.categories,
        priority: email.priority,
        actionItems: email.actionItems
      },
      calendar: {
        today: calendar.today,
        tomorrow: calendar.tomorrow,
        upcomingDeadlines: calendar.upcomingDeadlines || []
      },
      combinedActionItems: this.combineActionItems(email.actionItems, calendar.upcomingDeadlines || []),
      formattedBriefing: this.formatBriefing(email, calendar)
    };

    return briefing;
  }

  /**
   * Generate overview summary
   */
  generateOverview(email, calendar) {
    const urgentEmails = email.priority.length;
    const todayEvents = calendar.today.totalEvents;
    const unreadEmails = email.totalUnread;

    let overview = `Good morning! `;

    if (todayEvents > 0) {
      overview += `You have ${todayEvents} event${todayEvents !== 1 ? 's' : ''} today. `;
    } else {
      overview += `Your calendar is clear today. `;
    }

    if (unreadEmails > 0) {
      overview += `${unreadEmails} unread email${unreadEmails !== 1 ? 's' : ''}`;
      if (urgentEmails > 0) {
        overview += ` (${urgentEmails} priority)`;
      }
      overview += '. ';
    } else {
      overview += `Inbox is clear. `;
    }

    return overview;
  }

  /**
   * Combine action items from email and calendar
   */
  combineActionItems(emailActions, calendarDeadlines) {
    const combined = [...emailActions];

    // Add calendar deadlines as action items
    calendarDeadlines.forEach(deadline => {
      combined.push({
        task: deadline.title,
        deadline: deadline.date,
        source: 'calendar',
        priority: deadline.daysAway <= 1 ? 'high' : 'medium',
        daysAway: deadline.daysAway
      });
    });

    // Sort by priority and deadline
    combined.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      }
      
      return 0;
    });

    return combined;
  }

  /**
   * Format briefing for display
   */
  formatBriefing(email, calendar) {
    const lines = [];
    
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('📊 MORNING BRIEFING');
    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('');

    // Calendar section
    lines.push('📅 TODAY\'S SCHEDULE');
    lines.push('─────────────────────────────────────────────────────────');
    
    if (calendar.today.totalEvents === 0) {
      lines.push('  No events scheduled');
    } else {
      calendar.today.events.forEach((event, i) => {
        lines.push(`  ${i + 1}. ${event.time} - ${event.title}`);
        if (event.location) {
          lines.push(`     📍 ${event.location}`);
        }
        if (event.attendees > 0) {
          lines.push(`     👥 ${event.attendees} attendees`);
        }
      });
    }
    lines.push('');

    // Tomorrow's preview
    if (calendar.tomorrow.totalEvents > 0) {
      lines.push('📅 TOMORROW\'S PREVIEW');
      lines.push('─────────────────────────────────────────────────────────');
      calendar.tomorrow.events.slice(0, 3).forEach((event, i) => {
        lines.push(`  ${i + 1}. ${event.time} - ${event.title}`);
      });
      lines.push('');
    }

    // Email section
    lines.push('📧 EMAIL SUMMARY');
    lines.push('─────────────────────────────────────────────────────────');
    lines.push(`  Total Unread: ${email.totalUnread}`);
    
    const categories = Object.entries(email.categories)
      .filter(([_, count]) => count > 0)
      .map(([cat, count]) => `${cat} (${count})`)
      .join(', ');
    
    if (categories) {
      lines.push(`  Categories: ${categories}`);
    }
    lines.push('');

    // Priority emails
    if (email.priority.length > 0) {
      lines.push('⚠️  PRIORITY EMAILS');
      lines.push('─────────────────────────────────────────────────────────');
      email.priority.slice(0, 3).forEach((item, i) => {
        lines.push(`  ${i + 1}. ${item.subject}`);
        lines.push(`     From: ${item.from}`);
        if (item.deadline) {
          const deadline = new Date(item.deadline);
          lines.push(`     ⏰ Deadline: ${deadline.toLocaleString()}`);
        }
      });
      lines.push('');
    }

    // Action items
    const combinedActions = this.combineActionItems(email.actionItems, calendar.upcomingDeadlines || []);
    
    if (combinedActions.length > 0) {
      lines.push('✅ ACTION ITEMS');
      lines.push('─────────────────────────────────────────────────────────');
      combinedActions.slice(0, 5).forEach((item, i) => {
        const priorityIcon = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
        lines.push(`  ${i + 1}. ${priorityIcon} ${item.task}`);
        if (item.deadline) {
          const deadline = new Date(item.deadline);
          lines.push(`     Due: ${deadline.toLocaleDateString()}`);
        }
        if (item.source) {
          lines.push(`     Source: ${item.source}`);
        }
      });
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push(`Generated at: ${new Date().toLocaleString()}`);
    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Display briefing
   */
  async displayBriefing() {
    const result = await this.generateBriefing();
    
    if (!result.success) {
      console.error('❌ Failed to generate briefing:', result.error);
      return;
    }

    console.log('\n' + result.briefing.formattedBriefing + '\n');
  }
}

// Export for use in other modules
module.exports = MorningBriefingWorkflow;

// Run if called directly
if (require.main === module) {
  const workflow = new MorningBriefingWorkflow();
  workflow.displayBriefing().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
