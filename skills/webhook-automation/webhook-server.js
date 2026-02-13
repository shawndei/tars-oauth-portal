/**
 * Webhook Automation Server
 * Standalone HTTP server for receiving webhook triggers
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class WebhookServer {
  constructor(configPath) {
    this.configPath = configPath || path.join(process.env.OPENCLAW_WORKSPACE || './', 'webhook-config.json');
    this.config = null;
    this.server = null;
    this.rateLimits = new Map(); // IP → {count, resetAt}
  }

  /**
   * Load configuration
   */
  async load() {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      console.log('[Webhook Server] Configuration loaded');
    } catch (error) {
      console.error('[Webhook Server] Failed to load config:', error.message);
      throw error;
    }
  }

  /**
   * Start webhook server
   */
  async start() {
    if (!this.config || !this.config.enabled) {
      console.log('[Webhook Server] Disabled in configuration');
      return;
    }

    const port = 18790; // Use different port from gateway

    this.server = http.createServer(async (req, res) => {
      await this.handleRequest(req, res);
    });

    this.server.listen(port, '127.0.0.1', () => {
      console.log(`[Webhook Server] Listening on http://localhost:${port}`);
      console.log(`[Webhook Server] Endpoints: task, notify, research`);
    });
  }

  /**
   * Handle incoming webhook request
   */
  async handleRequest(req, res) {
    const startTime = Date.now();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Only accept POST
    if (req.method !== 'POST') {
      this.sendError(res, 405, 'Method Not Allowed');
      return;
    }

    // Parse URL path
    const urlPath = req.url.split('?')[0];
    
    // Check if webhook endpoint
    if (!urlPath.startsWith('/webhooks/')) {
      this.sendError(res, 404, 'Not Found');
      return;
    }

    const endpoint = urlPath.replace('/webhooks/', '');
    
    // Check if endpoint is enabled
    if (!this.config.endpoints[endpoint]) {
      this.sendError(res, 404, `Endpoint '${endpoint}' not found or disabled`);
      return;
    }

    // Authentication
    const authHeader = req.headers.authorization;
    if (!this.authenticate(authHeader)) {
      await this.logWebhook({
        endpoint,
        status: 'unauthorized',
        ip: req.socket.remoteAddress,
        timestamp: new Date().toISOString()
      });
      this.sendError(res, 401, 'Unauthorized');
      return;
    }

    // Rate limiting
    const clientIP = req.socket.remoteAddress;
    if (this.isRateLimited(clientIP)) {
      await this.logWebhook({
        endpoint,
        status: 'rate_limited',
        ip: clientIP,
        timestamp: new Date().toISOString()
      });
      this.sendError(res, 429, 'Too Many Requests');
      return;
    }

    // Parse body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        
        // Execute action
        const result = await this.executeAction(endpoint, payload);
        
        // Log webhook
        await this.logWebhook({
          endpoint,
          payload,
          result,
          status: 'success',
          ip: clientIP,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });

        // Send response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          ...result
        }));

      } catch (error) {
        await this.logWebhook({
          endpoint,
          error: error.message,
          status: 'error',
          ip: clientIP,
          timestamp: new Date().toISOString()
        });

        this.sendError(res, 400, error.message);
      }
    });
  }

  /**
   * Authenticate webhook request
   */
  authenticate(authHeader) {
    if (!this.config.security.requireAuth) {
      return true;
    }

    if (!authHeader) {
      return false;
    }

    const expectedAuth = `Bearer ${this.config.secret}`;
    return authHeader === expectedAuth;
  }

  /**
   * Check if client is rate limited
   */
  isRateLimited(clientIP) {
    const now = Date.now();
    const limit = this.rateLimits.get(clientIP);

    if (!limit) {
      this.rateLimits.set(clientIP, {
        count: 1,
        resetAt: now + (60 * 60 * 1000) // 1 hour
      });
      return false;
    }

    // Reset if time window passed
    if (now >= limit.resetAt) {
      this.rateLimits.set(clientIP, {
        count: 1,
        resetAt: now + (60 * 60 * 1000)
      });
      return false;
    }

    // Check limit
    if (limit.count >= this.config.rateLimits.perHour) {
      return true;
    }

    // Increment count
    limit.count++;
    return false;
  }

  /**
   * Execute webhook action
   */
  async executeAction(endpoint, payload) {
    switch (endpoint) {
      case 'task':
        return await this.handleTaskWebhook(payload);
      case 'notify':
        return await this.handleNotifyWebhook(payload);
      case 'research':
        return await this.handleResearchWebhook(payload);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  /**
   * Handle task webhook
   */
  async handleTaskWebhook(payload) {
    const { task, priority = 'medium', deadline, expected } = payload;

    if (!task) {
      throw new Error('Missing required field: task');
    }

    // Read TASKS.md
    const tasksPath = path.join(process.env.OPENCLAW_WORKSPACE || './', 'TASKS.md');
    let content = await fs.readFile(tasksPath, 'utf-8');

    // Add task to Pending section
    const pendingMarker = '## Pending';
    const taskEntry = `\n- [ ] ${task} (Priority: ${priority})${expected ? `\n  Expected: ${expected}` : ''}${deadline ? `\n  Deadline: ${deadline}` : ''}\n`;
    
    content = content.replace(pendingMarker, pendingMarker + taskEntry);

    // Write back
    await fs.writeFile(tasksPath, content, 'utf-8');

    return {
      message: 'Task added to queue',
      taskId: `task-${Date.now()}`,
      estimatedExecution: 'within 15 minutes'
    };
  }

  /**
   * Handle notify webhook
   */
  async handleNotifyWebhook(payload) {
    const { priority = 'P2', title, body, data } = payload;

    if (!title || !body) {
      throw new Error('Missing required fields: title, body');
    }

    // Queue notification via notification router
    const notification = {
      priority,
      title,
      body,
      data,
      source: 'webhook',
      timestamp: new Date().toISOString()
    };

    // Add to notification queue
    const queuePath = path.join(process.env.OPENCLAW_WORKSPACE || './', 'logs', 'notification-queue.jsonl');
    await fs.mkdir(path.dirname(queuePath), { recursive: true });
    await fs.appendFile(queuePath, JSON.stringify(notification) + '\n', 'utf-8');

    return {
      message: 'Notification queued',
      channel: priority === 'P0' || priority === 'P1' ? 'whatsapp' : 'email',
      deliveredAt: new Date().toISOString()
    };
  }

  /**
   * Handle research webhook
   */
  async handleResearchWebhook(payload) {
    const { topic, depth = 2, format = 'summary' } = payload;

    if (!topic) {
      throw new Error('Missing required field: topic');
    }

    // Add research task to TASKS.md
    const tasksPath = path.join(process.env.OPENCLAW_WORKSPACE || './', 'TASKS.md');
    let content = await fs.readFile(tasksPath, 'utf-8');

    const pendingMarker = '## Pending';
    const taskEntry = `\n- [ ] Deep research: ${topic} (Priority: medium)\n  Expected: Research report (depth ${depth}, format: ${format})\n  Source: Webhook trigger\n`;
    
    content = content.replace(pendingMarker, pendingMarker + taskEntry);
    await fs.writeFile(tasksPath, content, 'utf-8');

    return {
      message: 'Research task queued',
      reportId: `research-${Date.now()}`,
      status: 'queued',
      estimatedCompletion: '15-20 minutes'
    };
  }

  /**
   * Log webhook activity
   */
  async logWebhook(data) {
    if (!this.config.logging.enabled) return;

    const logPath = path.join(
      process.env.OPENCLAW_WORKSPACE || './',
      this.config.logging.logPath
    );

    try {
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, JSON.stringify(data) + '\n', 'utf-8');
    } catch (error) {
      console.error('[Webhook Server] Failed to log:', error.message);
    }
  }

  /**
   * Send error response
   */
  sendError(res, code, message) {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: message
    }));
  }

  /**
   * Stop server
   */
  stop() {
    if (this.server) {
      this.server.close();
      console.log('[Webhook Server] Stopped');
    }
  }
}

// Export for use as module
module.exports = WebhookServer;

// If run directly, start server
if (require.main === module) {
  const server = new WebhookServer();
  server.load().then(() => {
    server.start();
  }).catch(error => {
    console.error('[Webhook Server] Startup failed:', error.message);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Webhook Server] Shutting down...');
    server.stop();
    process.exit(0);
  });
}
