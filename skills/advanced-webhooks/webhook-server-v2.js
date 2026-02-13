/**
 * Advanced Webhook Automation Server v2
 * Enterprise-grade webhooks with auth, validation, rate limiting, bidirectional events
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

class AdvancedWebhookServer extends EventEmitter {
  constructor(configPath) {
    super();
    this.configPath = configPath || path.join(
      process.env.OPENCLAW_WORKSPACE || './',
      'webhook-config.json'
    );
    this.config = null;
    this.server = null;
    this.rateLimits = new Map(); // IP → {hourly, daily, reset}
    this.idempotencyCache = new Map(); // key → {response, timestamp}
    this.eventSubscriptions = new Map(); // url → {events, secret, active}
    this.webhookTokens = new Map(); // token → {type, rateLimit, endpoints}
    this.eventQueue = [];
    this.serverSentEventsClients = new Set();
  }

  /**
   * Load configuration and tokens
   */
  async load() {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      
      // Load webhook tokens
      const tokensPath = path.join(
        process.env.OPENCLAW_WORKSPACE || './',
        'data/webhook-tokens.json'
      );
      
      try {
        const tokensContent = await fs.readFile(tokensPath, 'utf-8');
        const tokens = JSON.parse(tokensContent);
        Object.entries(tokens.tokens || {}).forEach(([name, token]) => {
          this.webhookTokens.set(token.key, {
            name,
            type: token.type,
            rateLimit: token.rateLimit || 1000,
            endpoints: token.endpoints || [],
            active: token.active !== false
          });
        });
        console.log(`[Webhook Server] Loaded ${this.webhookTokens.size} API tokens`);
      } catch (error) {
        console.log('[Webhook Server] No tokens file found, creating default test token');
        // Add default test token
        this.webhookTokens.set('tstk_9Z5mP2jK6vL4nQ8sX1tR3wF0cA7eB9D', {
          name: 'Integration Testing',
          type: 'testing',
          rateLimit: 10000,
          endpoints: ['task', 'notify', 'research'],
          active: true
        });
      }

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

    const port = this.config.port || 18790;

    this.server = http.createServer(async (req, res) => {
      await this.handleRequest(req, res);
    });

    this.server.listen(port, '127.0.0.1', () => {
      console.log(`[Webhook Server] Listening on http://localhost:${port}`);
      console.log(`[Webhook Server] Endpoints: task, notify, research, events, status, metrics, health`);
    });

    // Cleanup expired entries periodically
    setInterval(() => this.cleanupExpired(), 60000);
  }

  /**
   * Handle incoming request
   */
  async handleRequest(req, res) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key, X-Request-ID');
    res.setHeader('X-Request-ID', requestId);

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const urlPath = req.url.split('?')[0];
    const basePath = this.config.basePath || '/webhooks/v2';

    // Check if webhook path
    if (!urlPath.startsWith(basePath)) {
      this.sendError(res, 404, 'Not Found', requestId);
      return;
    }

    const endpoint = urlPath.replace(basePath + '/', '').split('/')[0];

    try {
      // Route to handler
      switch (endpoint) {
        case 'task':
          await this.handleTaskEndpoint(req, res, requestId, startTime);
          break;
        case 'notify':
          await this.handleNotifyEndpoint(req, res, requestId, startTime);
          break;
        case 'research':
          await this.handleResearchEndpoint(req, res, requestId, startTime);
          break;
        case 'events':
          await this.handleEventsEndpoint(req, res, requestId, startTime);
          break;
        case 'status':
          await this.handleStatusEndpoint(req, res, requestId, startTime);
          break;
        case 'metrics':
          await this.handleMetricsEndpoint(req, res, requestId, startTime);
          break;
        case 'health':
          await this.handleHealthEndpoint(req, res, requestId, startTime);
          break;
        case 'subscribe':
          await this.handleSubscribeEndpoint(req, res, requestId, startTime);
          break;
        default:
          this.sendError(res, 404, `Endpoint '${endpoint}' not found`, requestId);
      }
    } catch (error) {
      console.error('[Webhook Server] Error:', error);
      this.sendError(res, 500, 'Internal Server Error', requestId);
    }
  }

  /**
   * Task endpoint handler
   */
  async handleTaskEndpoint(req, res, requestId, startTime) {
    if (req.method !== 'POST') {
      this.sendError(res, 405, 'Method not allowed', requestId);
      return;
    }

    const clientIP = req.socket.remoteAddress;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    // Authenticate
    if (!this.authenticate(authToken, 'task')) {
      await this.logWebhook({
        endpoint: 'task',
        status: 'unauthorized',
        ip: clientIP,
        requestId,
        timestamp: new Date().toISOString()
      });
      this.sendError(res, 401, 'Unauthorized', requestId);
      return;
    }

    // Rate limiting
    if (this.isRateLimited(authToken, clientIP, 'task')) {
      await this.logWebhook({
        endpoint: 'task',
        status: 'rate_limited',
        ip: clientIP,
        requestId,
        timestamp: new Date().toISOString()
      });
      this.sendError(res, 429, 'Too Many Requests', requestId, true);
      return;
    }

    // Parse body
    const payload = await this.parseBody(req);
    
    // Validate schema
    const validation = this.validateSchema(payload, 'task');
    if (!validation.valid) {
      this.sendError(res, 400, validation.error, requestId);
      return;
    }

    // Check idempotency
    const idempotencyKey = req.headers['idempotency-key'] || payload.idempotencyKey;
    if (idempotencyKey) {
      const cached = this.idempotencyCache.get(idempotencyKey);
      if (cached && Date.now() - cached.timestamp < 86400000) { // 24 hours
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cached.response));
        await this.logWebhook({
          endpoint: 'task',
          status: 'success_cached',
          ip: clientIP,
          requestId,
          idempotencyKey,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    // Execute task
    const result = await this.executeTask(payload);

    // Cache if idempotency key provided
    if (idempotencyKey) {
      this.idempotencyCache.set(idempotencyKey, {
        response: { success: true, data: result },
        timestamp: Date.now()
      });
    }

    // Log and broadcast event
    await this.logWebhook({
      endpoint: 'task',
      payload,
      status: 'success',
      ip: clientIP,
      requestId,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    this.broadcastEvent({
      type: 'task.created',
      data: result,
      timestamp: new Date().toISOString()
    });

    // Response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: result,
      meta: {
        requestId,
        processingTime: Date.now() - startTime,
        apiVersion: '2.0'
      }
    }));
  }

  /**
   * Notify endpoint handler
   */
  async handleNotifyEndpoint(req, res, requestId, startTime) {
    if (req.method !== 'POST') {
      this.sendError(res, 405, 'Method not allowed', requestId);
      return;
    }

    const clientIP = req.socket.remoteAddress;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    if (!this.authenticate(authToken, 'notify')) {
      this.sendError(res, 401, 'Unauthorized', requestId);
      return;
    }

    if (this.isRateLimited(authToken, clientIP, 'notify')) {
      this.sendError(res, 429, 'Too Many Requests', requestId, true);
      return;
    }

    const payload = await this.parseBody(req);
    const validation = this.validateSchema(payload, 'notify');
    
    if (!validation.valid) {
      this.sendError(res, 400, validation.error, requestId);
      return;
    }

    const result = await this.executeNotification(payload);

    await this.logWebhook({
      endpoint: 'notify',
      payload,
      status: 'success',
      ip: clientIP,
      requestId,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    this.broadcastEvent({
      type: 'notify.sent',
      data: result,
      timestamp: new Date().toISOString()
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: result,
      meta: {
        requestId,
        processingTime: Date.now() - startTime,
        apiVersion: '2.0'
      }
    }));
  }

  /**
   * Research endpoint handler
   */
  async handleResearchEndpoint(req, res, requestId, startTime) {
    if (req.method !== 'POST') {
      this.sendError(res, 405, 'Method not allowed', requestId);
      return;
    }

    const clientIP = req.socket.remoteAddress;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    if (!this.authenticate(authToken, 'research')) {
      this.sendError(res, 401, 'Unauthorized', requestId);
      return;
    }

    if (this.isRateLimited(authToken, clientIP, 'research')) {
      this.sendError(res, 429, 'Too Many Requests', requestId, true);
      return;
    }

    const payload = await this.parseBody(req);
    const validation = this.validateSchema(payload, 'research');
    
    if (!validation.valid) {
      this.sendError(res, 400, validation.error, requestId);
      return;
    }

    const result = await this.startResearch(payload);

    await this.logWebhook({
      endpoint: 'research',
      payload,
      status: 'success',
      ip: clientIP,
      requestId,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    this.broadcastEvent({
      type: 'research.started',
      data: result,
      timestamp: new Date().toISOString()
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: result,
      meta: {
        requestId,
        processingTime: Date.now() - startTime,
        apiVersion: '2.0'
      }
    }));
  }

  /**
   * Events endpoint (SSE)
   */
  async handleEventsEndpoint(req, res, requestId, startTime) {
    if (req.method !== 'GET') {
      this.sendError(res, 405, 'Method not allowed', requestId);
      return;
    }

    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!this.authenticate(authToken)) {
      this.sendError(res, 401, 'Unauthorized', requestId);
      return;
    }

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send queued events
    this.eventQueue.forEach(event => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    // Add to active clients
    this.serverSentEventsClients.add(res);

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    req.on('close', () => {
      this.serverSentEventsClients.delete(res);
      clearInterval(keepAlive);
    });
  }

  /**
   * Status endpoint
   */
  async handleStatusEndpoint(req, res, requestId, startTime) {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!this.authenticate(authToken)) {
      this.sendError(res, 401, 'Unauthorized', requestId);
      return;
    }

    const tokenInfo = this.webhookTokens.get(authToken);
    const remaining = tokenInfo ? 
      (tokenInfo.rateLimit - (this.rateLimits.get(authToken)?.hourly || 0)) : 
      0;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        status: 'healthy',
        endpoints: {
          task: { status: 'healthy' },
          notify: { status: 'healthy' },
          research: { status: 'healthy' }
        },
        rateLimits: {
          remaining,
          reset: new Date(Date.now() + 3600000).toISOString()
        }
      },
      meta: {
        requestId,
        processingTime: Date.now() - startTime,
        apiVersion: '2.0'
      }
    }));
  }

  /**
   * Metrics endpoint
   */
  async handleMetricsEndpoint(req, res, requestId, startTime) {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!this.authenticate(authToken)) {
      this.sendError(res, 401, 'Unauthorized', requestId);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        uptime: process.uptime(),
        eventQueueSize: this.eventQueue.length,
        activeSseClients: this.serverSentEventsClients.size,
        cachedIdempotencies: this.idempotencyCache.size,
        rateLimitStates: this.rateLimits.size
      },
      meta: {
        requestId,
        processingTime: Date.now() - startTime,
        apiVersion: '2.0'
      }
    }));
  }

  /**
   * Health check endpoint
   */
  async handleHealthEndpoint(req, res, requestId, startTime) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    }));
  }

  /**
   * Subscribe endpoint (for outbound webhooks)
   */
  async handleSubscribeEndpoint(req, res, requestId, startTime) {
    if (req.method !== 'POST') {
      this.sendError(res, 405, 'Method not allowed', requestId);
      return;
    }

    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!this.authenticate(authToken)) {
      this.sendError(res, 401, 'Unauthorized', requestId);
      return;
    }

    const payload = await this.parseBody(req);
    const { url, events, secret } = payload;

    if (!url || !events || !Array.isArray(events)) {
      this.sendError(res, 400, 'Invalid subscription payload', requestId);
      return;
    }

    const subscriptionId = this.generateRequestId();
    this.eventSubscriptions.set(subscriptionId, {
      url,
      events,
      secret: secret || crypto.randomBytes(32).toString('hex'),
      active: true,
      createdAt: new Date().toISOString()
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        subscriptionId,
        status: 'active',
        events,
        url
      },
      meta: {
        requestId,
        processingTime: Date.now() - startTime,
        apiVersion: '2.0'
      }
    }));
  }

  /**
   * Authenticate request
   */
  authenticate(token, endpoint = null) {
    if (!this.config.authentication.requireAuth) return true;
    if (!token) return false;

    const tokenInfo = this.webhookTokens.get(token);
    if (!tokenInfo || !tokenInfo.active) return false;

    if (endpoint && tokenInfo.endpoints.length > 0) {
      return tokenInfo.endpoints.includes(endpoint);
    }

    return true;
  }

  /**
   * Check rate limits
   */
  isRateLimited(token, clientIP, endpoint) {
    const key = token || clientIP;
    const now = Date.now();
    const limit = this.rateLimits.get(key) || { hourly: 0, daily: 0, resetAt: now + 3600000 };

    // Get rate limit for this token/endpoint
    let maxPerHour = this.config.rateLimits.global.perHour;
    if (endpoint && this.config.rateLimits.perEndpoint[endpoint]) {
      maxPerHour = this.config.rateLimits.perEndpoint[endpoint];
    }

    const tokenInfo = this.webhookTokens.get(token);
    if (tokenInfo) {
      maxPerHour = Math.min(maxPerHour, tokenInfo.rateLimit);
    }

    // Reset if window passed
    if (now >= limit.resetAt) {
      limit.hourly = 0;
      limit.resetAt = now + 3600000;
    }

    // Check limit
    if (limit.hourly >= maxPerHour) {
      return true;
    }

    limit.hourly++;
    this.rateLimits.set(key, limit);
    return false;
  }

  /**
   * Validate against schema
   */
  validateSchema(payload, endpoint) {
    if (!this.config.validation.enabled) return { valid: true };

    const schemas = {
      task: {
        type: 'object',
        required: ['action', 'task'],
        properties: {
          action: { type: 'string', enum: ['add_task'] },
          task: { type: 'string', minLength: 5 },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          deadline: { type: 'string' },
          expected: { type: 'string' }
        }
      },
      notify: {
        type: 'object',
        required: ['action', 'title', 'body'],
        properties: {
          action: { type: 'string', enum: ['send_notification'] },
          title: { type: 'string', minLength: 3 },
          body: { type: 'string', minLength: 5 },
          priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          channels: { type: 'array' }
        }
      },
      research: {
        type: 'object',
        required: ['action', 'topic'],
        properties: {
          action: { type: 'string', enum: ['start_research'] },
          topic: { type: 'string', minLength: 3 },
          depth: { type: 'number', minimum: 1, maximum: 3 },
          format: { type: 'string', enum: ['markdown', 'json', 'text'] }
        }
      }
    };

    const schema = schemas[endpoint];
    if (!schema) return { valid: true };

    // Check required fields
    for (const field of schema.required) {
      if (!(field in payload)) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    // Check property types
    for (const [key, value] of Object.entries(payload)) {
      const prop = schema.properties[key];
      if (!prop) continue;

      if (prop.type && typeof value !== prop.type) {
        return { valid: false, error: `Invalid type for ${key}: expected ${prop.type}` };
      }

      if (prop.minLength && value.length < prop.minLength) {
        return { valid: false, error: `${key} too short: minimum ${prop.minLength}` };
      }

      if (prop.enum && !prop.enum.includes(value)) {
        return { valid: false, error: `Invalid value for ${key}: ${value}` };
      }
    }

    return { valid: true };
  }

  /**
   * Execute task
   */
  async executeTask(payload) {
    const taskId = `task-${Date.now()}`;
    const tasksPath = path.join(
      process.env.OPENCLAW_WORKSPACE || './',
      'TASKS.md'
    );

    try {
      let content = await fs.readFile(tasksPath, 'utf-8');
      const taskEntry = `\n- [ ] ${payload.task} (Priority: ${payload.priority || 'medium'})${payload.deadline ? `\n  Deadline: ${payload.deadline}` : ''}${payload.expected ? `\n  Expected: ${payload.expected}` : ''}\n`;
      content = content.replace('## Pending', '## Pending' + taskEntry);
      await fs.writeFile(tasksPath, content, 'utf-8');
    } catch (error) {
      console.error('[Webhook] Failed to add task:', error.message);
    }

    return {
      id: taskId,
      status: 'pending',
      estimatedStart: new Date(Date.now() + 600000).toISOString(),
      estimatedCompletion: new Date(Date.now() + 3600000).toISOString()
    };
  }

  /**
   * Execute notification
   */
  async executeNotification(payload) {
    const notifId = `notif-${Date.now()}`;
    const channels = payload.channels || ['email'];

    return {
      notificationId: notifId,
      channels: Object.fromEntries(
        channels.map(ch => [ch, {
          status: 'queued',
          estimatedDelivery: new Date(Date.now() + 300000).toISOString()
        }])
      )
    };
  }

  /**
   * Start research task
   */
  async startResearch(payload) {
    const researchId = `res-${Date.now()}`;
    
    try {
      const tasksPath = path.join(
        process.env.OPENCLAW_WORKSPACE || './',
        'TASKS.md'
      );
      let content = await fs.readFile(tasksPath, 'utf-8');
      const taskEntry = `\n- [ ] Deep research: ${payload.topic} (Priority: medium)\n  Expected: Research report (format: ${payload.format || 'markdown'})\n  Source: Webhook trigger\n`;
      content = content.replace('## Pending', '## Pending' + taskEntry);
      await fs.writeFile(tasksPath, content, 'utf-8');
    } catch (error) {
      console.error('[Webhook] Failed to add research task:', error.message);
    }

    return {
      researchId,
      status: 'started',
      estimatedCompletion: new Date(Date.now() + 1800000).toISOString()
    };
  }

  /**
   * Parse request body
   */
  parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
        if (body.length > 10 * 1024 * 1024) { // 10MB limit
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Broadcast event to subscribers
   */
  broadcastEvent(event) {
    // Add to queue
    this.eventQueue.push(event);
    if (this.eventQueue.length > 1000) {
      this.eventQueue.shift(); // Keep queue size reasonable
    }

    // Send to SSE clients
    this.serverSentEventsClients.forEach(res => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    // Send to webhook subscriptions
    this.eventSubscriptions.forEach(subscription => {
      if (subscription.active && subscription.events.includes(event.type)) {
        this.sendWebhookEvent(subscription, event).catch(error => {
          console.error('[Webhook] Failed to send event:', error.message);
        });
      }
    });
  }

  /**
   * Send webhook event to subscriber
   */
  async sendWebhookEvent(subscription, event) {
    const signature = crypto
      .createHmac('sha256', subscription.secret)
      .update(JSON.stringify(event))
      .digest('hex');

    const postData = JSON.stringify({
      id: this.generateRequestId(),
      type: event.type,
      timestamp: event.timestamp,
      data: event.data
    });

    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Timestamp': Date.now(),
          'X-Webhook-ID': this.generateRequestId()
        }
      };

      const req = http.request(subscription.url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.setTimeout(30000);
      req.write(postData);
      req.end();
    });
  }

  /**
   * Log webhook activity
   */
  async logWebhook(data) {
    if (!this.config.logging.enabled) return;

    const logPath = path.join(
      process.env.OPENCLAW_WORKSPACE || './',
      this.config.logging.logPath || 'logs/webhooks.jsonl'
    );

    try {
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.appendFile(logPath, JSON.stringify(data) + '\n', 'utf-8');
    } catch (error) {
      console.error('[Webhook Server] Logging failed:', error.message);
    }
  }

  /**
   * Send error response
   */
  sendError(res, code, message, requestId, retryable = false) {
    const response = {
      success: false,
      error: message,
      code: this.getErrorCode(code),
      requestId,
      timestamp: new Date().toISOString(),
      retryable
    };

    if (code === 429) {
      response.retryAfter = 60;
    }

    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  /**
   * Generate request ID
   */
  generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get error code
   */
  getErrorCode(httpCode) {
    const codes = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR'
    };
    return codes[httpCode] || 'UNKNOWN_ERROR';
  }

  /**
   * Cleanup expired entries
   */
  cleanupExpired() {
    const now = Date.now();

    // Cleanup old idempotency cache
    for (const [key, value] of this.idempotencyCache.entries()) {
      if (now - value.timestamp > 86400000) { // 24 hours
        this.idempotencyCache.delete(key);
      }
    }

    // Cleanup old rate limit entries
    for (const [key, value] of this.rateLimits.entries()) {
      if (now >= value.resetAt) {
        this.rateLimits.delete(key);
      }
    }
  }

  /**
   * Stop server
   */
  stop() {
    if (this.server) {
      this.server.close();
      this.serverSentEventsClients.forEach(res => res.end());
      console.log('[Webhook Server] Stopped');
    }
  }
}

module.exports = AdvancedWebhookServer;

// Start if run directly
if (require.main === module) {
  const server = new AdvancedWebhookServer();
  server.load().then(() => {
    server.start();
  }).catch(error => {
    console.error('[Webhook Server] Startup failed:', error.message);
    process.exit(1);
  });

  process.on('SIGINT', () => {
    console.log('\n[Webhook Server] Shutting down...');
    server.stop();
    process.exit(0);
  });
}
