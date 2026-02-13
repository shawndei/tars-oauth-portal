/**
 * Multi-Channel Notification Router - Example Implementation
 * 
 * This demonstrates how to implement the routing logic using OpenClaw's message() tool
 * and the notification-routing.json configuration.
 * 
 * NOTE: This is a reference implementation. In production, you would:
 * - Load the actual notification-routing.json config
 * - Implement persistent queue for P2/P3 batching
 * - Use proper logging/monitoring
 * - Add error handling and recovery
 */

const path = require('path');
const fs = require('fs');

// ============================================================================
// 1. Configuration Loader
// ============================================================================

class NotificationConfig {
  constructor(configPath) {
    this.config = JSON.parse(
      fs.readFileSync(configPath, 'utf-8')
    );
  }

  getPriorityRoute(priority) {
    return this.config.priorityRouting[priority];
  }

  getThrottleConfig(channel) {
    return this.config.throttling[channel];
  }

  getFormattingRules(channel) {
    return this.config.formatting[channel];
  }
}

// ============================================================================
// 2. Throttling Manager
// ============================================================================

class ThrottleManager {
  constructor(configPath) {
    this.config = new NotificationConfig(configPath);
    this.counters = {};
    this.queues = {};
    this.initializeCounters();
    this.startResetTimers();
  }

  initializeCounters() {
    for (const [channel, limits] of Object.entries(this.config.config.throttling)) {
      this.counters[channel] = {
        hourly: 0,
        daily: 0,
        perHour: limits.perHour || Infinity,
        perDay: limits.perDay || Infinity
      };
      this.queues[channel] = [];
    }
  }

  startResetTimers() {
    // Reset hourly counters every hour
    setInterval(() => {
      for (const channel of Object.keys(this.counters)) {
        if (this.counters[channel].perHour !== Infinity) {
          this.counters[channel].hourly = 0;
          console.log(`[THROTTLE] Reset hourly counter for ${channel}`);
        }
      }
    }, 60 * 60 * 1000);

    // Reset daily counters at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        for (const channel of Object.keys(this.counters)) {
          this.counters[channel].daily = 0;
          console.log(`[THROTTLE] Reset daily counter for ${channel}`);
        }
      }
    }, 60 * 1000);
  }

  canSend(channel) {
    const counter = this.counters[channel];
    if (!counter) return false;

    // Check hourly limit
    if (counter.perHour !== Infinity && counter.hourly >= counter.perHour) {
      return false;
    }

    // Check daily limit
    if (counter.perDay !== Infinity && counter.daily >= counter.perDay) {
      return false;
    }

    return true;
  }

  recordSend(channel) {
    if (this.counters[channel]) {
      this.counters[channel].hourly++;
      this.counters[channel].daily++;
      console.log(
        `[THROTTLE] ${channel}: ${this.counters[channel].daily}/${this.counters[channel].perDay} daily`
      );
    }
  }

  queueMessage(channel, message) {
    this.queues[channel].push({
      timestamp: new Date(),
      message: message
    });
    console.log(`[QUEUE] Message queued for ${channel}. Queue size: ${this.queues[channel].length}`);
  }

  getStatus(channel) {
    const counter = this.counters[channel];
    return {
      hourly: `${counter.hourly}/${counter.perHour}`,
      daily: `${counter.daily}/${counter.perDay}`,
      queued: this.queues[channel].length
    };
  }
}

// ============================================================================
// 3. Message Formatter
// ============================================================================

class MessageFormatter {
  constructor(configPath) {
    this.config = new NotificationConfig(configPath);
  }

  format(message, channel) {
    const rules = this.config.getFormattingRules(channel);
    if (!rules) return message;

    let formatted = message;

    // Apply channel-specific rules
    switch (channel) {
      case 'whatsapp':
        formatted = this.formatWhatsApp(formatted, rules);
        break;
      case 'email':
        formatted = this.formatEmail(formatted, rules);
        break;
      case 'discord':
        formatted = this.formatDiscord(formatted, rules);
        break;
      case 'telegram':
        formatted = this.formatTelegram(formatted, rules);
        break;
      case 'sms':
        formatted = this.formatSMS(formatted, rules);
        break;
    }

    return formatted;
  }

  formatWhatsApp(message, rules) {
    // Check length
    if (message.length > rules.maxLength) {
      console.warn(`[FORMAT] WhatsApp message truncated to ${rules.maxLength} chars`);
      return message.substring(0, rules.maxLength - 3) + '...';
    }

    // Emoji already included in message, markdown disabled
    return message;
  }

  formatEmail(message, rules) {
    if (rules.format === 'html') {
      return `
<html>
  <body>
    <h2>${message.split('\n')[0]}</h2>
    <p>${message.split('\n').slice(1).join('<br>')}</p>
    <footer style="color: #888; font-size: 12px;">
      <p>Message sent via Multi-Channel Notification Router</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
    </footer>
  </body>
</html>
      `;
    }
    return message;
  }

  formatDiscord(message, rules) {
    // Return as Discord embed
    return {
      embeds: [{
        description: message.substring(0, rules.maxLength),
        timestamp: new Date().toISOString()
      }]
    };
  }

  formatTelegram(message, rules) {
    // Check length
    if (message.length > rules.maxLength) {
      console.warn(`[FORMAT] Telegram message truncated to ${rules.maxLength} chars`);
      return message.substring(0, rules.maxLength - 3) + '...';
    }
    // Markdown already in message
    return message;
  }

  formatSMS(message, rules) {
    // SMS is limited to 160 chars
    if (message.length > 160) {
      console.warn('[FORMAT] SMS message truncated to 160 chars');
      return message.substring(0, 157) + '...';
    }
    return message;
  }
}

// ============================================================================
// 4. Notification Router (Main Class)
// ============================================================================

class NotificationRouter {
  constructor(configPath) {
    this.config = new NotificationConfig(configPath);
    this.throttle = new ThrottleManager(configPath);
    this.formatter = new MessageFormatter(configPath);
    this.batchQueues = {
      p2: [],
      p3: []
    };
    this.startBatchTimers();
  }

  async sendNotification(message, priority = 'P1') {
    console.log(`\n[SEND] ${priority}: ${message.substring(0, 50)}...`);

    const route = this.config.getPriorityRoute(priority);
    if (!route) {
      throw new Error(`Unknown priority: ${priority}`);
    }

    // Route by priority
    switch (priority) {
      case 'P0':
        return await this.routeP0(message, route);
      case 'P1':
        return await this.routeP1(message, route);
      case 'P2':
        return await this.routeP2(message, route);
      case 'P3':
        return await this.routeP3(message, route);
      default:
        throw new Error(`Invalid priority: ${priority}`);
    }
  }

  async routeP0(message, route) {
    console.log('[ROUTE] P0 - Sending to ALL channels immediately');

    const results = [];

    // Send to all channels in parallel
    for (const channel of route.channels) {
      try {
        const formatted = this.formatter.format(message, channel);
        const result = await this.sendViaChannel(channel, formatted);
        results.push({ channel, status: 'SUCCESS', result });
        this.throttle.recordSend(channel);
      } catch (error) {
        console.error(`[ERROR] Failed to send to ${channel}:`, error.message);
        results.push({ channel, status: 'FAILED', error: error.message });
      }
    }

    return results;
  }

  async routeP1(message, route) {
    console.log('[ROUTE] P1 - Primary: WhatsApp, Fallback: Email');

    const primaryChannel = route.channels[0];
    const fallbackChannels = route.fallback || [];

    try {
      // Try primary channel
      if (this.throttle.canSend(primaryChannel)) {
        const formatted = this.formatter.format(message, primaryChannel);
        const result = await this.sendViaChannel(primaryChannel, formatted);
        this.throttle.recordSend(primaryChannel);
        console.log(`[SUCCESS] Sent to ${primaryChannel}`);
        return { channel: primaryChannel, status: 'SUCCESS', result };
      } else {
        console.log(`[THROTTLED] ${primaryChannel} limit reached, using fallback`);
        throw new Error(`${primaryChannel} throttled`);
      }
    } catch (error) {
      // Fallback to secondary channels
      for (const fallback of fallbackChannels) {
        try {
          if (this.throttle.canSend(fallback)) {
            const formatted = this.formatter.format(message, fallback);
            const result = await this.sendViaChannel(fallback, formatted);
            this.throttle.recordSend(fallback);
            console.log(`[FALLBACK] Sent to ${fallback}`);
            return { channel: fallback, status: 'FALLBACK', result };
          } else {
            console.log(`[THROTTLED] ${fallback} also throttled, queueing`);
            this.throttle.queueMessage(fallback, message);
            return { channel: fallback, status: 'QUEUED' };
          }
        } catch (err) {
          console.error(`[ERROR] Fallback ${fallback} failed:`, err.message);
        }
      }
      throw error;
    }
  }

  async routeP2(message, route) {
    console.log('[ROUTE] P2 - Queuing for batch (4h)');
    this.batchQueues.p2.push({
      timestamp: new Date(),
      message: message
    });
    console.log(`[QUEUE] P2 messages queued: ${this.batchQueues.p2.length}`);
    return { status: 'QUEUED', queue: 'P2', size: this.batchQueues.p2.length };
  }

  async routeP3(message, route) {
    console.log('[ROUTE] P3 - Queuing for daily batch');
    this.batchQueues.p3.push({
      timestamp: new Date(),
      message: message
    });
    console.log(`[QUEUE] P3 messages queued: ${this.batchQueues.p3.length}`);
    return { status: 'QUEUED', queue: 'P3', size: this.batchQueues.p3.length };
  }

  async sendViaChannel(channel, message) {
    // This would call OpenClaw's message() tool in real implementation
    console.log(`  → message({ action: "send", target: "${channel}", message: "${typeof message === 'string' ? message.substring(0, 40) : 'object'}" })`);

    // Simulate sending (in real code, this calls OpenClaw's message() tool)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          channel,
          messageId: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString()
        });
      }, 100);
    });
  }

  startBatchTimers() {
    // P2 batch every 4 hours
    setInterval(async () => {
      if (this.batchQueues.p2.length > 0) {
        await this.flushBatch('P2', 'email', 4);
      }
    }, 4 * 60 * 60 * 1000);

    // P3 batch daily (check every minute for 9 AM)
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        if (this.batchQueues.p3.length > 0) {
          await this.flushBatch('P3', 'email', 24);
        }
      }
    }, 60 * 1000);
  }

  async flushBatch(priority, channel, interval) {
    const queue = priority === 'P2' ? this.batchQueues.p2 : this.batchQueues.p3;
    if (queue.length === 0) return;

    const digest = queue
      .map((n, i) => `${i + 1}. [${n.timestamp.toISOString()}] ${n.message}`)
      .join('\n\n');

    const subject = `${priority} ${channel.toUpperCase()} Batch (${interval}h interval)`;
    const batch = `${subject}\n\n${digest}`;

    console.log(`\n[BATCH] Flushing ${queue.length} ${priority} messages to ${channel}`);

    try {
      const formatted = this.formatter.format(batch, channel);
      await this.sendViaChannel(channel, formatted);
      this.throttle.recordSend(channel);
      queue.length = 0; // Clear queue
      console.log(`[BATCH-SUCCESS] ${priority} batch sent`);
    } catch (error) {
      console.error(`[BATCH-ERROR] Failed to send ${priority} batch:`, error.message);
    }
  }

  getStatus() {
    return {
      throttle: {
        whatsapp: this.throttle.getStatus('whatsapp'),
        email: this.throttle.getStatus('email'),
        sms: this.throttle.getStatus('sms')
      },
      batches: {
        p2: this.batchQueues.p2.length,
        p3: this.batchQueues.p3.length
      }
    };
  }
}

// ============================================================================
// 5. Usage Examples
// ============================================================================

async function runExamples() {
  const configPath = path.join(__dirname, '../notification-routing.json');

  // Initialize router
  const router = new NotificationRouter(configPath);

  console.log('='.repeat(80));
  console.log('Multi-Channel Notification Router - Example Execution');
  console.log('='.repeat(80));

  // Example 1: P1 Notification (High Priority)
  console.log('\n📋 EXAMPLE 1: P1 Notification (High Priority)\n');
  await router.sendNotification(
    '✅ Database backup completed successfully\nSize: 45GB\nDuration: 12 minutes',
    'P1'
  );

  // Example 2: P0 Notification (Critical)
  console.log('\n\n📋 EXAMPLE 2: P0 Notification (Critical)\n');
  await router.sendNotification(
    '🔴 CRITICAL: Authentication service is down\nStatus: Service unreachable\nHTTP: 503',
    'P0'
  );

  // Example 3: P2 Notification (Medium - Batching)
  console.log('\n\n📋 EXAMPLE 3: P2 Notification (Medium - Batching)\n');
  await router.sendNotification(
    '⚠️ Disk usage alert: /data partition at 80%',
    'P2'
  );

  // Example 4: P3 Notification (Low - Daily Digest)
  console.log('\n\n📋 EXAMPLE 4: P3 Notification (Low - Daily Digest)\n');
  await router.sendNotification(
    '📊 Daily health check completed: All systems nominal',
    'P3'
  );

  // Status Report
  console.log('\n\n' + '='.repeat(80));
  console.log('System Status');
  console.log('='.repeat(80));
  console.log(JSON.stringify(router.getStatus(), null, 2));
}

// Run if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

// ============================================================================
// 6. Module Exports
// ============================================================================

module.exports = {
  NotificationConfig,
  ThrottleManager,
  MessageFormatter,
  NotificationRouter
};
