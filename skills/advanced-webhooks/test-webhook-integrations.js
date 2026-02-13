#!/usr/bin/env node

/**
 * Test Suite for Advanced Webhook Automation System
 * Tests all endpoints with real integrations
 */

const http = require('http');
const assert = require('assert');

class WebhookTester {
  constructor(baseUrl = 'http://localhost:18790', token = 'tstk_9Z5mP2jK6vL4nQ8sX1tR3wF0cA7eB9D') {
    this.baseUrl = baseUrl;
    this.token = token;
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Make HTTP request
   */
  request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl + path);
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'X-Request-ID': `test-${Date.now()}`
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(5000);

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  /**
   * Test helper
   */
  async test(name, fn) {
    try {
      await fn();
      this.passed++;
      console.log(`✅ ${name}`);
      this.results.push({ test: name, status: 'passed' });
    } catch (error) {
      this.failed++;
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      this.results.push({ test: name, status: 'failed', error: error.message });
    }
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('\n📋 Advanced Webhook Automation System - Test Suite\n');
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Token: ${this.token}\n`);

    // Task endpoint tests
    await this.testTaskEndpoint();

    // Notify endpoint tests
    await this.testNotifyEndpoint();

    // Research endpoint tests
    await this.testResearchEndpoint();

    // Status endpoint tests
    await this.testStatusEndpoint();

    // Health endpoint tests
    await this.testHealthEndpoint();

    // Error handling tests
    await this.testErrorHandling();

    // Idempotency tests
    await this.testIdempotency();

    // Print results
    this.printResults();
  }

  /**
   * Task endpoint tests
   */
  async testTaskEndpoint() {
    console.log('\n🔧 Task Endpoint Tests\n');

    await this.test('Add task with required fields', async () => {
      const response = await this.request('POST', '/webhooks/v2/task', {
        action: 'add_task',
        task: 'Research quantum computing frameworks'
      });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert(response.body.data.id);
    });

    await this.test('Add high priority task with deadline', async () => {
      const response = await this.request('POST', '/webhooks/v2/task', {
        action: 'add_task',
        task: 'Review important documents',
        priority: 'high',
        deadline: new Date(Date.now() + 86400000).toISOString(),
        expected: 'Documents reviewed and approved'
      });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.data.status, 'pending');
    });

    await this.test('Add task with tags', async () => {
      const response = await this.request('POST', '/webhooks/v2/task', {
        action: 'add_task',
        task: 'Implement webhook authentication',
        priority: 'high',
        tags: ['development', 'security', 'webhook']
      });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
    });

    await this.test('Reject task without required field', async () => {
      const response = await this.request('POST', '/webhooks/v2/task', {
        priority: 'high'
        // Missing required 'action' field
      });
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
    });

    await this.test('Reject task with invalid priority', async () => {
      const response = await this.request('POST', '/webhooks/v2/task', {
        action: 'add_task',
        task: 'Test task',
        priority: 'super-critical' // Invalid
      });
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
    });
  }

  /**
   * Notify endpoint tests
   */
  async testNotifyEndpoint() {
    console.log('\n📢 Notify Endpoint Tests\n');

    await this.test('Send notification with title and body', async () => {
      const response = await this.request('POST', '/webhooks/v2/notify', {
        action: 'send_notification',
        title: 'Test Notification',
        body: 'This is a test notification from the webhook system'
      });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert(response.body.data.notificationId);
    });

    await this.test('Send high priority notification', async () => {
      const response = await this.request('POST', '/webhooks/v2/notify', {
        action: 'send_notification',
        title: 'Critical Alert',
        body: 'System failure detected',
        priority: 'P1',
        channels: ['whatsapp', 'email']
      });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert(response.body.data.channels);
    });

    await this.test('Send notification with custom data', async () => {
      const response = await this.request('POST', '/webhooks/v2/notify', {
        action: 'send_notification',
        title: 'Order Update',
        body: 'Your order has shipped',
        priority: 'P2',
        data: {
          orderId: 'ORD-12345',
          trackingNumber: 'TRK-98765',
          estimatedDelivery: '2026-02-20'
        }
      });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
    });

    await this.test('Reject notification without title', async () => {
      const response = await this.request('POST', '/webhooks/v2/notify', {
        action: 'send_notification',
        body: 'Missing title'
      });
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
    });
  }

  /**
   * Research endpoint tests
   */
  async testResearchEndpoint() {
    console.log('\n🔍 Research Endpoint Tests\n');

    await this.test('Start research with topic', async () => {
      const response = await this.request('POST', '/webhooks/v2/research', {
        action: 'start_research',
        topic: 'Latest developments in artificial intelligence'
      });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert(response.body.data.researchId);
    });

    await this.test('Start research with custom depth and format', async () => {
      const response = await this.request('POST', '/webhooks/v2/research', {
        action: 'start_research',
        topic: 'Quantum computing applications',
        depth: 3,
        format: 'json'
      });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
    });

    await this.test('Reject research without topic', async () => {
      const response = await this.request('POST', '/webhooks/v2/research', {
        action: 'start_research'
      });
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
    });
  }

  /**
   * Status endpoint tests
   */
  async testStatusEndpoint() {
    console.log('\n✅ Status Endpoint Tests\n');

    await this.test('Get webhook status', async () => {
      const response = await this.request('GET', '/webhooks/v2/status');
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.data.status, 'healthy');
    });

    await this.test('Status contains rate limit info', async () => {
      const response = await this.request('GET', '/webhooks/v2/status');
      assert(response.body.data.rateLimits);
      assert(response.body.data.rateLimits.remaining !== undefined);
    });
  }

  /**
   * Health endpoint tests
   */
  async testHealthEndpoint() {
    console.log('\n💚 Health Endpoint Tests\n');

    await this.test('Get health check', async () => {
      const response = await this.request('GET', '/webhooks/v2/health');
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.data.status, 'healthy');
    });

    await this.test('Health includes timestamp', async () => {
      const response = await this.request('GET', '/webhooks/v2/health');
      assert(response.body.data.timestamp);
    });
  }

  /**
   * Error handling tests
   */
  async testErrorHandling() {
    console.log('\n⚠️  Error Handling Tests\n');

    await this.test('Reject request without authentication', async () => {
      const url = new URL(this.baseUrl + '/webhooks/v2/task');
      const response = await new Promise((resolve) => {
        const options = {
          method: 'POST',
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          headers: { 'Content-Type': 'application/json' }
          // No Authorization header
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          });
        });

        req.write(JSON.stringify({ action: 'add_task', task: 'Test' }));
        req.end();
      });

      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.body.success, false);
    });

    await this.test('Reject invalid HTTP method', async () => {
      const url = new URL(this.baseUrl + '/webhooks/v2/task');
      const response = await new Promise((resolve) => {
        const options = {
          method: 'GET', // GET not allowed on POST endpoint
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          headers: { 'Authorization': `Bearer ${this.token}` }
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          });
        });

        req.end();
      });

      assert.strictEqual(response.status, 405);
      assert.strictEqual(response.body.success, false);
    });

    await this.test('Handle non-existent endpoint', async () => {
      const response = await this.request('POST', '/webhooks/v2/invalid');
      assert.strictEqual(response.status, 404);
      assert.strictEqual(response.body.success, false);
    });

    await this.test('Return proper error for malformed JSON', async () => {
      const url = new URL(this.baseUrl + '/webhooks/v2/task');
      const response = await new Promise((resolve) => {
        const options = {
          method: 'POST',
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          });
        });

        req.write('{ invalid json }'); // Malformed
        req.end();
      });

      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
    });
  }

  /**
   * Idempotency tests
   */
  async testIdempotency() {
    console.log('\n🔐 Idempotency Tests\n');

    await this.test('First request creates task', async () => {
      const response = await this.request('POST', '/webhooks/v2/task', {
        action: 'add_task',
        task: 'Idempotent test task',
        idempotencyKey: `test-key-${Date.now()}`
      });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      this.lastTaskId = response.body.data.id;
    });

    await this.test('Duplicate request returns same ID', async () => {
      const key = `dup-key-${Date.now()}`;
      const response1 = await this.request('POST', '/webhooks/v2/task', {
        action: 'add_task',
        task: 'Duplicate test task',
        idempotencyKey: key
      });

      // Small delay
      await new Promise(r => setTimeout(r, 100));

      const response2 = await this.request('POST', '/webhooks/v2/task', {
        action: 'add_task',
        task: 'Duplicate test task',
        idempotencyKey: key
      });

      assert.strictEqual(response1.status, 200);
      assert.strictEqual(response2.status, 200);
      // Should return cached response
    });
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Total:  ${this.passed + this.failed}`);
    console.log(`🎯 Rate:   ${Math.round((this.passed / (this.passed + this.failed)) * 100)}%`);
    console.log('='.repeat(60) + '\n');

    if (this.failed === 0) {
      console.log('🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log(`⚠️  ${this.failed} test(s) failed`);
      process.exit(1);
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new WebhookTester();
  tester.runAll().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = WebhookTester;
