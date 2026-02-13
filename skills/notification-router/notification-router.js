/**
 * Multi-Channel Notification Router
 * Smart routing of alerts to appropriate channels
 */

const fs = require('fs').promises;
const path = require('path');

class NotificationRouter {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.env.OPENCLAW_WORKSPACE || './';
    this.configPath = path.join(this.workspaceRoot, 'notification-routing.json');
    this.config = null;
    this.batchQueue = new Map(); // Priority → messages[]
    this.throttleCounters = new Map(); // Channel → count
    this.lastBatchSent = new Map(); // Priority → timestamp
  }

  /**
   * Load configuration
   */
  async load() {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
    } catch (error) {
      console.log('[Notification Router] No config found, using defaults');
      await this.createDefaultConfig();
    }
  }

  /**
   * Create default configuration
   */
  async createDefaultConfig() {
    this.config = {
      enabled: true,
      defaultChain: ['whatsapp', 'email'],
      priorityRouting: {
        P0: {
          channels: ['whatsapp', 'email'],
          batch: false,
          retry: true
        },
        P1: {
          channels: ['whatsapp'],
          fallback: ['email'],
          batch: false,
          retry: true
        },
        P2: {
          channels: ['email'],
          batch: true,
          batchInterval: '4h'
        },
        P3: {
          channels: ['email'],
          batch: true,
          batchInterval: '24h'
        }
      },
      throttling: {
        whatsapp: {
          perHour: 10,
          perDay: 100
        },
        email: {
          perDay: 50
        }
      },
      formatting: {
        whatsapp: {
          maxLength: 4096,
          useEmoji: true,
          useMarkdown: false
        },
        email: {
          format: 'html',
          includeHeader: true,
          includeFooter: true
        }
      }
    };

    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  /**
   * Send notification with smart routing
   * @param {object} notification - Notification object
   * @returns {object} Delivery result
   */
  async notify(notification) {
    if (!this.config || !this.config.enabled) {
      console.log('[Notification Router] Routing disabled');
      return { status: 'disabled' };
    }

    const { priority = 'P2', title, body, data } = notification;
    
    // Get routing config for priority
    const routing = this.config.priorityRouting[priority];
    if (!routing) {
      console.error(`[Notification Router] Unknown priority: ${priority}`);
      return { status: 'error', error: 'Unknown priority' };
    }
    
    // Check if should batch
    if (routing.batch) {
      return await this.addToBatch(priority, notification);
    }
    
    // Send immediately
    return await this.sendImmediate(notification, routing);
  }

  /**
   * Send notification immediately
   */
  async sendImmediate(notification, routing) {
    const results = [];
    
    // Try primary channels
    for (const channel of routing.channels) {
      if (await this.isThrottled(channel)) {
        console.log(`[Notification Router] Channel ${channel} throttled, skipping`);
        continue;
      }
      
      const result = await this.sendToChannel(notification, channel);
      results.push(result);
      
      if (result.status === 'success') {
        return {
          status: 'delivered',
          channel,
          results
        };
      }
    }
    
    // Try fallback channels if configured
    if (routing.fallback) {
      for (const channel of routing.fallback) {
        if (await this.isThrottled(channel)) {
          continue;
        }
        
        const result = await this.sendToChannel(notification, channel);
        results.push(result);
        
        if (result.status === 'success') {
          return {
            status: 'delivered_fallback',
            channel,
            results
          };
        }
      }
    }
    
    // All channels failed
    return {
      status: 'failed',
      error: 'All channels failed or throttled',
      results
    };
  }

  /**
   * Send to specific channel
   */
  async sendToChannel(notification, channel) {
    console.log(`[Notification Router] Sending to ${channel}: ${notification.title}`);
    
    try {
      // Format message for channel
      const formatted = this.formatForChannel(notification, channel);
      
      // In production, this would call OpenClaw's message tool
      // For now, simulate the delivery
      const delivered = await this.mockDelivery(channel, formatted);
      
      if (delivered) {
        await this.incrementThrottle(channel);
        return {
          status: 'success',
          channel,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          status: 'failed',
          channel,
          error: 'Delivery failed'
        };
      }
      
    } catch (error) {
      return {
        status: 'error',
        channel,
        error: error.message
      };
    }
  }

  /**
   * Format message for specific channel
   */
  formatForChannel(notification, channel) {
    const formatting = this.config.formatting[channel] || {};
    const { title, body, data, priority } = notification;
    
    // Priority emoji
    const emoji = {
      P0: '🚨',
      P1: '⚠️',
      P2: 'ℹ️',
      P3: '📋'
    }[priority] || '';
    
    // Channel-specific formatting
    switch (channel) {
      case 'whatsapp':
        return this.formatWhatsApp(emoji, title, body, data, formatting);
      case 'email':
        return this.formatEmail(emoji, title, body, data, formatting);
      case 'discord':
        return this.formatDiscord(emoji, title, body, data);
      case 'telegram':
        return this.formatTelegram(emoji, title, body, data);
      default:
        return this.formatPlainText(emoji, title, body, data);
    }
  }

  /**
   * Format for WhatsApp (plain text, emoji)
   */
  formatWhatsApp(emoji, title, body, data, formatting) {
    let message = '';
    
    if (formatting.useEmoji && emoji) {
      message += `${emoji} `;
    }
    
    message += `${title}\n`;
    message += `${body}\n`;
    
    if (data) {
      message += '\n';
      for (const [key, value] of Object.entries(data)) {
        message += `${key}: ${value}\n`;
      }
    }
    
    // Truncate if needed
    if (formatting.maxLength && message.length > formatting.maxLength) {
      message = message.substring(0, formatting.maxLength - 3) + '...';
    }
    
    return message;
  }

  /**
   * Format for Email (HTML)
   */
  formatEmail(emoji, title, body, data, formatting) {
    if (formatting.format === 'html') {
      let html = '';
      
      if (formatting.includeHeader) {
        html += '<div style="font-family: Arial, sans-serif;">';
      }
      
      html += `<h2>${emoji} ${title}</h2>`;
      html += `<p>${body}</p>`;
      
      if (data) {
        html += '<table style="border-collapse: collapse; margin-top: 20px;">';
        for (const [key, value] of Object.entries(data)) {
          html += `<tr><td style="padding: 5px; font-weight: bold;">${key}:</td><td style="padding: 5px;">${value}</td></tr>`;
        }
        html += '</table>';
      }
      
      if (formatting.includeFooter) {
        html += '<hr style="margin-top: 30px;"><p style="color: #666; font-size: 12px;">Sent by TARS</p>';
      }
      
      if (formatting.includeHeader) {
        html += '</div>';
      }
      
      return html;
    } else {
      // Plain text fallback
      return this.formatPlainText(emoji, title, body, data);
    }
  }

  /**
   * Format for Discord (rich embed)
   */
  formatDiscord(emoji, title, body, data) {
    const embed = {
      title: `${emoji} ${title}`,
      description: body,
      color: this.getPriorityColor(emoji),
      fields: [],
      timestamp: new Date().toISOString()
    };
    
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        embed.fields.push({
          name: key,
          value: String(value),
          inline: true
        });
      }
    }
    
    return { embeds: [embed] };
  }

  /**
   * Format for Telegram (markdown)
   */
  formatTelegram(emoji, title, body, data) {
    let message = `${emoji} *${title}*\n\n${body}`;
    
    if (data) {
      message += '\n\n';
      for (const [key, value] of Object.entries(data)) {
        message += `*${key}:* ${value}\n`;
      }
    }
    
    return message;
  }

  /**
   * Format as plain text
   */
  formatPlainText(emoji, title, body, data) {
    let message = `${emoji} ${title}\n${body}`;
    
    if (data) {
      message += '\n\n';
      for (const [key, value] of Object.entries(data)) {
        message += `${key}: ${value}\n`;
      }
    }
    
    return message;
  }

  /**
   * Get Discord color based on priority
   */
  getPriorityColor(emoji) {
    const colors = {
      '🚨': 0xff0000, // Red
      '⚠️': 0xffa500, // Orange
      'ℹ️': 0x0088ff, // Blue
      '📋': 0x888888  // Gray
    };
    return colors[emoji] || 0x0088ff;
  }

  /**
   * Add notification to batch queue
   */
  async addToBatch(priority, notification) {
    if (!this.batchQueue.has(priority)) {
      this.batchQueue.set(priority, []);
    }
    
    this.batchQueue.get(priority).push({
      ...notification,
      queuedAt: Date.now()
    });
    
    console.log(`[Notification Router] Added to ${priority} batch (${this.batchQueue.get(priority).length} in queue)`);
    
    return {
      status: 'batched',
      priority,
      queueSize: this.batchQueue.get(priority).length
    };
  }

  /**
   * Send batched notifications (called by HEARTBEAT)
   */
  async sendBatches() {
    const results = [];
    
    for (const [priority, messages] of this.batchQueue) {
      if (messages.length === 0) continue;
      
      const routing = this.config.priorityRouting[priority];
      if (!routing || !routing.batch) continue;
      
      // Check if batch interval elapsed
      const lastSent = this.lastBatchSent.get(priority) || 0;
      const intervalMs = this.parseBatchInterval(routing.batchInterval);
      const elapsed = Date.now() - lastSent;
      
      if (elapsed < intervalMs) {
        console.log(`[Notification Router] ${priority} batch not ready (${Math.floor((intervalMs - elapsed) / 1000 / 60)}m remaining)`);
        continue;
      }
      
      // Send batch
      const batchResult = await this.sendBatch(priority, messages, routing);
      results.push(batchResult);
      
      // Clear batch and update last sent time
      this.batchQueue.set(priority, []);
      this.lastBatchSent.set(priority, Date.now());
    }
    
    return results;
  }

  /**
   * Send batch of messages as digest
   */
  async sendBatch(priority, messages, routing) {
    console.log(`[Notification Router] Sending ${priority} batch (${messages.length} messages)`);
    
    // Create digest message
    const digest = {
      priority,
      title: `${priority} Digest (${messages.length} notifications)`,
      body: 'Batched notifications:',
      data: {
        count: messages.length,
        period: routing.batchInterval
      },
      messages
    };
    
    // Send to configured channels
    return await this.sendImmediate(digest, routing);
  }

  /**
   * Parse batch interval to milliseconds
   */
  parseBatchInterval(interval) {
    const match = interval.match(/(\d+)([hmd])/);
    if (!match) return 0;
    
    const [, value, unit] = match;
    const num = parseInt(value);
    
    switch (unit) {
      case 'h': return num * 60 * 60 * 1000;
      case 'm': return num * 60 * 1000;
      case 'd': return num * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  /**
   * Check if channel is throttled
   */
  async isThrottled(channel) {
    const throttle = this.config.throttling[channel];
    if (!throttle) return false;
    
    const counter = this.throttleCounters.get(channel) || { count: 0, resetAt: Date.now() };
    
    // Check if need to reset counter
    if (Date.now() >= counter.resetAt) {
      counter.count = 0;
      counter.resetAt = Date.now() + (60 * 60 * 1000); // Reset in 1 hour
      this.throttleCounters.set(channel, counter);
    }
    
    // Check throttle limit
    if (throttle.perHour && counter.count >= throttle.perHour) {
      return true;
    }
    
    return false;
  }

  /**
   * Increment throttle counter
   */
  async incrementThrottle(channel) {
    const counter = this.throttleCounters.get(channel) || { count: 0, resetAt: Date.now() + (60 * 60 * 1000) };
    counter.count++;
    this.throttleCounters.set(channel, counter);
  }

  /**
   * Mock delivery (would use real OpenClaw message tool in production)
   */
  async mockDelivery(channel, message) {
    // Simulate 95% success rate
    return Math.random() > 0.05;
  }
}

module.exports = NotificationRouter;
