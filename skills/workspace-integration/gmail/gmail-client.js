/**
 * Gmail API Client
 * Full-featured Gmail integration with OAuth2 authentication
 */

const { google } = require('googleapis');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

class GmailClient {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(process.cwd(), 'gmail-config.json');
    this.config = null;
    this.auth = null;
    this.gmail = null;
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
      
      // Initialize Gmail API client
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      
      return { success: true, message: 'Gmail client initialized' };
    } catch (error) {
      console.error('Failed to initialize Gmail client:', error);
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
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return {
        success: true,
        email: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch unread emails
   */
  async fetchUnreadEmails(options = {}) {
    const {
      maxResults = 50,
      query = 'is:unread',
      includeBody = true,
      includeAttachments = false
    } = options;

    try {
      // List messages
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      const messages = listResponse.data.messages || [];
      
      if (messages.length === 0) {
        return { success: true, count: 0, emails: [] };
      }

      // Fetch full message details
      const emails = await Promise.all(
        messages.map(msg => this.getEmailById(msg.id, { 
          format: includeBody ? 'full' : 'metadata',
          includeHeaders: true 
        }))
      );

      return {
        success: true,
        count: emails.length,
        emails: emails.map(e => e.email)
      };
    } catch (error) {
      console.error('Failed to fetch unread emails:', error);
      return {
        success: false,
        error: error.message,
        count: 0,
        emails: []
      };
    }
  }

  /**
   * Search emails with Gmail query syntax
   */
  async searchEmails(query, options = {}) {
    const { maxResults = 50, includeBody = false } = options;

    try {
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      const messages = listResponse.data.messages || [];
      
      if (messages.length === 0) {
        return { success: true, count: 0, emails: [] };
      }

      const emails = await Promise.all(
        messages.map(msg => this.getEmailById(msg.id, { 
          format: includeBody ? 'full' : 'metadata' 
        }))
      );

      return {
        success: true,
        count: emails.length,
        query,
        emails: emails.map(e => e.email)
      };
    } catch (error) {
      console.error('Failed to search emails:', error);
      return {
        success: false,
        error: error.message,
        count: 0,
        emails: []
      };
    }
  }

  /**
   * Get email by ID
   */
  async getEmailById(id, options = {}) {
    const { format = 'full', includeHeaders = true } = options;

    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id,
        format
      });

      const message = response.data;
      
      // Parse headers
      const headers = {};
      if (message.payload && message.payload.headers) {
        message.payload.headers.forEach(header => {
          headers[header.name.toLowerCase()] = header.value;
        });
      }

      // Extract body
      let body = { text: '', html: '' };
      if (format === 'full' && message.payload) {
        body = this.extractBody(message.payload);
      }

      // Parse email
      const email = {
        id: message.id,
        threadId: message.threadId,
        from: this.parseAddress(headers.from || ''),
        to: this.parseAddressList(headers.to || ''),
        cc: this.parseAddressList(headers.cc || ''),
        subject: headers.subject || '(No Subject)',
        date: headers.date || message.internalDate,
        snippet: message.snippet || '',
        body,
        labels: message.labelIds || [],
        hasAttachments: this.hasAttachments(message.payload),
        size: message.sizeEstimate || 0
      };

      return {
        success: true,
        email
      };
    } catch (error) {
      console.error('Failed to get email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send email
   */
  async sendEmail(emailData) {
    const {
      to,
      cc = [],
      bcc = [],
      subject,
      body,
      replyTo = null,
      attachments = []
    } = emailData;

    try {
      // Build email message
      const email = this.buildEmailMessage({
        to,
        cc,
        bcc,
        subject,
        body,
        attachments
      });

      // Encode email
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
          threadId: replyTo || undefined
        }
      });

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId,
        sentAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create draft
   */
  async createDraft(emailData) {
    try {
      const email = this.buildEmailMessage(emailData);
      
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedEmail
          }
        }
      });

      return {
        success: true,
        draftId: response.data.id,
        messageId: response.data.message.id,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to create draft:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send draft
   */
  async sendDraft(draftId) {
    try {
      const response = await this.gmail.users.drafts.send({
        userId: 'me',
        requestBody: {
          id: draftId
        }
      });

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId,
        sentAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to send draft:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(messageIds) {
    try {
      await this.gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: {
          ids: Array.isArray(messageIds) ? messageIds : [messageIds],
          removeLabelIds: ['UNREAD']
        }
      });

      return { success: true, count: messageIds.length };
    } catch (error) {
      console.error('Failed to mark as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark messages as unread
   */
  async markAsUnread(messageIds) {
    try {
      await this.gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: {
          ids: Array.isArray(messageIds) ? messageIds : [messageIds],
          addLabelIds: ['UNREAD']
        }
      });

      return { success: true, count: messageIds.length };
    } catch (error) {
      console.error('Failed to mark as unread:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete messages (move to trash)
   */
  async deleteEmail(messageIds, permanent = false) {
    try {
      const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
      
      if (permanent) {
        // Permanently delete
        await Promise.all(
          ids.map(id => this.gmail.users.messages.delete({
            userId: 'me',
            id
          }))
        );
      } else {
        // Move to trash
        await this.gmail.users.messages.batchModify({
          userId: 'me',
          requestBody: {
            ids,
            addLabelIds: ['TRASH']
          }
        });
      }

      return { success: true, count: ids.length, permanent };
    } catch (error) {
      console.error('Failed to delete emails:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Archive emails (remove from inbox)
   */
  async archiveEmail(messageIds) {
    try {
      await this.gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: {
          ids: Array.isArray(messageIds) ? messageIds : [messageIds],
          removeLabelIds: ['INBOX']
        }
      });

      return { success: true, count: messageIds.length };
    } catch (error) {
      console.error('Failed to archive emails:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get labels
   */
  async getLabels() {
    try {
      const response = await this.gmail.users.labels.list({
        userId: 'me'
      });

      return {
        success: true,
        labels: response.data.labels || []
      };
    } catch (error) {
      console.error('Failed to get labels:', error);
      return { success: false, error: error.message, labels: [] };
    }
  }

  /**
   * Add labels to messages
   */
  async addLabels(messageIds, labelIds) {
    try {
      await this.gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: {
          ids: Array.isArray(messageIds) ? messageIds : [messageIds],
          addLabelIds: Array.isArray(labelIds) ? labelIds : [labelIds]
        }
      });

      return { success: true, count: messageIds.length };
    } catch (error) {
      console.error('Failed to add labels:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove labels from messages
   */
  async removeLabels(messageIds, labelIds) {
    try {
      await this.gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: {
          ids: Array.isArray(messageIds) ? messageIds : [messageIds],
          removeLabelIds: Array.isArray(labelIds) ? labelIds : [labelIds]
        }
      });

      return { success: true, count: messageIds.length };
    } catch (error) {
      console.error('Failed to remove labels:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create label
   */
  async createLabel(name, options = {}) {
    try {
      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name,
          messageListVisibility: 'show',
          labelListVisibility: 'labelShow',
          color: options.color
        }
      });

      return {
        success: true,
        label: response.data
      };
    } catch (error) {
      console.error('Failed to create label:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate morning briefing
   */
  async generateMorningBriefing() {
    const config = this.config.morning_briefing;
    
    if (!config.enabled) {
      return { success: false, error: 'Morning briefing disabled' };
    }

    try {
      // Calculate time window
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - config.hours_lookback);
      const timestamp = Math.floor(hoursAgo.getTime() / 1000);

      // Fetch recent unread emails
      const query = `is:unread after:${timestamp}`;
      const emails = await this.searchEmails(query, { 
        maxResults: config.max_emails,
        includeBody: true 
      });

      if (!emails.success || emails.count === 0) {
        return {
          success: true,
          generatedAt: new Date().toISOString(),
          summary: {
            totalUnread: 0,
            newSinceLastCheck: 0,
            categories: {},
            priority: [],
            actionItems: [],
            briefText: 'No unread emails.'
          }
        };
      }

      // Categorize emails
      const categories = this.categorizeEmails(emails.emails);
      
      // Identify priority emails
      const priority = this.identifyPriorityEmails(emails.emails);
      
      // Extract action items
      const actionItems = this.extractActionItems(emails.emails);

      // Generate brief text
      const briefText = this.generateBriefText({
        totalUnread: emails.count,
        categories,
        priority,
        actionItems
      });

      return {
        success: true,
        generatedAt: new Date().toISOString(),
        summary: {
          totalUnread: emails.count,
          newSinceLastCheck: emails.count,
          categories,
          priority,
          actionItems,
          briefText
        }
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
   * Categorize emails based on keywords
   */
  categorizeEmails(emails) {
    const categories = {
      work: 0,
      personal: 0,
      finance: 0,
      notifications: 0,
      newsletters: 0
    };

    emails.forEach(email => {
      const text = `${email.subject} ${email.snippet}`.toLowerCase();
      
      if (this.matchesCategory(text, this.config.filters.work)) {
        categories.work++;
      } else if (this.matchesCategory(text, this.config.filters.finance)) {
        categories.finance++;
      } else if (this.matchesCategory(text, this.config.filters.notifications)) {
        categories.notifications++;
      } else if (text.includes('newsletter') || text.includes('unsubscribe')) {
        categories.newsletters++;
      } else {
        categories.personal++;
      }
    });

    return categories;
  }

  /**
   * Identify priority emails
   */
  identifyPriorityEmails(emails) {
    const vips = this.config.vips || [];
    const urgentKeywords = ['urgent', 'asap', 'critical', 'deadline', 'important'];
    
    return emails
      .filter(email => {
        const isVip = vips.includes(email.from.email);
        const isUrgent = urgentKeywords.some(keyword => 
          email.subject.toLowerCase().includes(keyword) ||
          email.snippet.toLowerCase().includes(keyword)
        );
        return isVip || isUrgent;
      })
      .map(email => ({
        from: email.from.email,
        subject: email.subject,
        snippet: email.snippet,
        deadline: this.extractDeadline(email)
      }));
  }

  /**
   * Extract action items from emails
   */
  extractActionItems(emails) {
    const actionItems = [];
    const actionKeywords = ['please', 'need', 'required', 'must', 'review', 'approve', 'submit'];

    emails.forEach(email => {
      const text = `${email.subject} ${email.snippet}`.toLowerCase();
      
      const hasAction = actionKeywords.some(keyword => text.includes(keyword));
      if (hasAction) {
        const deadline = this.extractDeadline(email);
        const priority = deadline ? 'high' : 'medium';
        
        actionItems.push({
          task: email.subject,
          deadline,
          source: email.from.email,
          priority,
          emailId: email.id
        });
      }
    });

    return actionItems;
  }

  /**
   * Extract deadline from email
   */
  extractDeadline(email) {
    const text = `${email.subject} ${email.snippet}`.toLowerCase();
    
    // Simple deadline detection
    const today = /\b(today|eod)\b/i.test(text);
    const tomorrow = /\b(tomorrow)\b/i.test(text);
    
    if (today) {
      const deadline = new Date();
      deadline.setHours(17, 0, 0, 0);
      return deadline.toISOString();
    }
    
    if (tomorrow) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(17, 0, 0, 0);
      return deadline.toISOString();
    }
    
    return null;
  }

  /**
   * Generate brief summary text
   */
  generateBriefText({ totalUnread, categories, priority, actionItems }) {
    let text = `You have ${totalUnread} unread email${totalUnread !== 1 ? 's' : ''}`;
    
    if (priority.length > 0) {
      text += `. Priority: ${priority[0].subject} from ${priority[0].from}`;
    }
    
    if (actionItems.length > 0) {
      text += `. ${actionItems.length} action item${actionItems.length !== 1 ? 's' : ''}`;
    }
    
    const categoryText = Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([cat, count]) => `${count} ${cat}`)
      .join(', ');
    
    if (categoryText) {
      text += `. Categories: ${categoryText}`;
    }
    
    return text + '.';
  }

  // Helper methods

  matchesCategory(text, keywords) {
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  parseAddress(addressString) {
    const match = addressString.match(/(.*?)\s*<(.+?)>/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: addressString, email: addressString };
  }

  parseAddressList(addressString) {
    if (!addressString) return [];
    return addressString.split(',').map(addr => this.parseAddress(addr.trim()));
  }

  extractBody(payload) {
    let body = { text: '', html: '' };

    if (payload.body && payload.body.data) {
      const data = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      if (payload.mimeType === 'text/plain') {
        body.text = data;
      } else if (payload.mimeType === 'text/html') {
        body.html = data;
      }
    }

    if (payload.parts) {
      payload.parts.forEach(part => {
        if (part.mimeType === 'text/plain' && part.body.data) {
          body.text = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body.data) {
          body.html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      });
    }

    return body;
  }

  hasAttachments(payload) {
    if (!payload) return false;
    
    if (payload.parts) {
      return payload.parts.some(part => 
        part.filename && part.filename.length > 0
      );
    }
    
    return false;
  }

  buildEmailMessage({ to, cc = [], bcc = [], subject, body, attachments = [] }) {
    const boundary = 'boundary_' + Date.now();
    
    let message = [
      `To: ${Array.isArray(to) ? to.join(', ') : to}`,
      cc.length > 0 ? `Cc: ${cc.join(', ')}` : '',
      bcc.length > 0 ? `Bcc: ${bcc.join(', ')}` : '',
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      body.text || '',
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      '',
      body.html || body.text || '',
      '',
      `--${boundary}--`
    ].filter(line => line !== null && line !== undefined).join('\r\n');

    return message;
  }
}

module.exports = GmailClient;
