/**
 * Test Suite for Advanced Browser Automation
 * Tests all features with real-world scenarios
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const {
  solveCaptcha,
  detectCaptcha,
  handleOAuth,
  handle2FA,
  fillForm,
  waitFor,
  verifyVisual,
  saveSession,
  loadSession,
  autoRecover
} = require('./browser-advanced');

// Test results collector
const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

/**
 * Test runner utility
 */
async function runTest(name, testFn, options = {}) {
  const { skip = false, timeout = 60000 } = options;
  
  results.summary.total++;
  
  if (skip) {
    console.log(`⏭️  SKIPPED: ${name}`);
    results.tests.push({
      name,
      status: 'skipped',
      reason: 'Test skipped'
    });
    results.summary.skipped++;
    return;
  }
  
  console.log(`\n🧪 Testing: ${name}`);
  const startTime = Date.now();
  
  try {
    const testResult = await Promise.race([
      testFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Test timeout (${timeout}ms)`)), timeout)
      )
    ]);
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ PASSED: ${name} (${duration}ms)`);
    
    results.tests.push({
      name,
      status: 'passed',
      duration,
      ...testResult
    });
    
    results.summary.passed++;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
    
    results.tests.push({
      name,
      status: 'failed',
      duration,
      error: error.message,
      stack: error.stack
    });
    
    results.summary.failed++;
  }
}

/**
 * TEST CATEGORY 1: CAPTCHA Solving
 */

async function testCaptchaDetection() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to reCAPTCHA demo page
    await page.goto('https://www.google.com/recaptcha/api2/demo');
    
    // Detect CAPTCHA
    const captchaInfo = await detectCaptcha(page);
    
    if (captchaInfo.type === 'recaptcha-v2' && captchaInfo.sitekey) {
      return {
        success: true,
        captchaType: captchaInfo.type,
        sitekey: captchaInfo.sitekey
      };
    } else {
      throw new Error(`CAPTCHA detection failed: ${JSON.stringify(captchaInfo)}`);
    }
    
  } finally {
    await browser.close();
  }
}

async function testCaptchaSolving() {
  // Skip if no API key configured
  if (!process.env.CAPTCHA_2CAPTCHA_KEY) {
    return { success: false, reason: 'No 2Captcha API key configured' };
  }
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.google.com/recaptcha/api2/demo');
    
    const result = await solveCaptcha(page, {
      service: '2captcha',
      timeout: 120000
    });
    
    if (result.success) {
      // Verify token was injected
      const responseToken = await page.evaluate(() => {
        return document.getElementById('g-recaptcha-response')?.value;
      });
      
      return {
        success: !!responseToken,
        cost: result.cost,
        tokenLength: responseToken?.length
      };
    } else {
      throw new Error(result.error);
    }
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST CATEGORY 2: Authentication Flows
 */

async function testGitHubOAuthDetection() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to GitHub OAuth demo
    await page.goto('https://github.com/login');
    
    // Verify OAuth elements are present
    const hasEmailField = await page.isVisible('input[name="login"]');
    const hasPasswordField = await page.isVisible('input[name="password"]');
    const hasSubmitButton = await page.isVisible('input[type="submit"]');
    
    if (hasEmailField && hasPasswordField && hasSubmitButton) {
      return {
        success: true,
        fieldsDetected: ['email', 'password', 'submit']
      };
    } else {
      throw new Error('OAuth form elements not detected');
    }
    
  } finally {
    await browser.close();
  }
}

async function test2FACodeGeneration() {
  // Test TOTP generation (doesn't require real account)
  const speakeasy = require('speakeasy');
  
  const secret = 'JBSWY3DPEHPK3PXP'; // Test secret
  
  const token = speakeasy.totp({
    secret: secret,
    encoding: 'base32'
  });
  
  // Verify token is 6 digits
  if (token && /^\d{6}$/.test(token)) {
    return {
      success: true,
      tokenFormat: '6-digit',
      token: token
    };
  } else {
    throw new Error('Invalid TOTP token generated');
  }
}

/**
 * TEST CATEGORY 3: Form Filling
 */

async function testFormDetection() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Create a test form in-page
    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="test-form">
            <input type="text" name="firstName" placeholder="First Name">
            <input type="text" name="lastName" placeholder="Last Name">
            <input type="email" name="email" placeholder="Email">
            <input type="tel" name="phone" placeholder="Phone">
            <select name="country">
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
            <input type="checkbox" name="terms">
            <button type="submit">Submit</button>
          </form>
        </body>
      </html>
    `);
    
    const formFiller = require('./form-filler');
    const fields = await formFiller.findFormFields(page, '#test-form');
    
    if (fields.length >= 6) {
      return {
        success: true,
        fieldsFound: fields.length,
        fieldTypes: fields.map(f => f.type)
      };
    } else {
      throw new Error(`Only found ${fields.length} fields, expected 6+`);
    }
    
  } finally {
    await browser.close();
  }
}

async function testFormFilling() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="test-form">
            <input type="text" name="firstName" id="firstName">
            <input type="text" name="lastName" id="lastName">
            <input type="email" name="email" id="email">
            <input type="tel" name="phone" id="phone">
            <select name="country" id="country">
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
            <input type="checkbox" name="terms" id="terms">
          </form>
        </body>
      </html>
    `);
    
    const testData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      country: 'CA',
      terms: true
    };
    
    const result = await fillForm(page, testData, {
      formSelector: '#test-form',
      submit: false
    });
    
    if (!result.success) {
      throw new Error(`Form filling failed: ${JSON.stringify(result.errors)}`);
    }
    
    // Verify values were set
    const values = await page.evaluate(() => {
      return {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        country: document.getElementById('country').value,
        terms: document.getElementById('terms').checked
      };
    });
    
    const allCorrect = 
      values.firstName === 'John' &&
      values.lastName === 'Doe' &&
      values.email === 'john@example.com' &&
      values.phone === '+1-555-0123' &&
      values.country === 'CA' &&
      values.terms === true;
    
    if (allCorrect) {
      return {
        success: true,
        fieldsFilledCorrectly: 6
      };
    } else {
      throw new Error(`Values incorrect: ${JSON.stringify(values)}`);
    }
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST CATEGORY 4: Wait Strategies
 */

async function testElementWait() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="content" style="display:none">Hidden content</div>
          <script>
            setTimeout(() => {
              document.getElementById('content').style.display = 'block';
            }, 1000);
          </script>
        </body>
      </html>
    `);
    
    const startTime = Date.now();
    await waitFor.element(page, '#content', { state: 'visible', timeout: 5000 });
    const duration = Date.now() - startTime;
    
    if (duration >= 900 && duration <= 2000) {
      return {
        success: true,
        waitTime: duration
      };
    } else {
      throw new Error(`Wait duration unexpected: ${duration}ms`);
    }
    
  } finally {
    await browser.close();
  }
}

async function testSmartWait() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            setTimeout(() => {
              document.body.innerHTML = '<div id="result">Success!</div>';
            }, 500);
          </script>
        </body>
      </html>
    `);
    
    // Smart wait for multiple conditions
    const result = await waitFor.smart(page, {
      element: '#result',
      text: 'Success!',
      timeout: 5000
    });
    
    if (result.type === 'element' || result.type === 'text') {
      return {
        success: true,
        triggeredBy: result.type
      };
    } else {
      throw new Error('Smart wait did not trigger on expected condition');
    }
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST CATEGORY 5: Visual Verification
 */

async function testScreenshotCapture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body style="background: #ff0000; width: 100vw; height: 100vh;">
          <h1>Test Page</h1>
        </body>
      </html>
    `);
    
    const result = await verifyVisual.saveBaseline(page, 'test-baseline');
    
    // Verify file exists
    await fs.access(result.path);
    
    return {
      success: true,
      screenshotPath: result.path
    };
    
  } finally {
    await browser.close();
  }
}

async function testElementStateVerification() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('about:blank');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <button id="test-btn" class="primary">Click Me</button>
        </body>
      </html>
    `);
    
    const result = await verifyVisual.elementState(page, '#test-btn', {
      visible: true,
      enabled: true,
      text: 'Click Me',
      className: 'primary'
    });
    
    if (result.valid) {
      return {
        success: true,
        verificationsMatched: 4
      };
    } else {
      throw new Error(`Verification failed: ${JSON.stringify(result.errors)}`);
    }
    
  } finally {
    await browser.close();
  }
}

/**
 * TEST CATEGORY 6: Session Management
 */

async function testSessionSaveLoad() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto('https://example.com');
    
    // Set some cookies and localStorage
    await page.evaluate(() => {
      localStorage.setItem('test-key', 'test-value');
      document.cookie = 'test-cookie=test-value';
    });
    
    // Save session
    const saveResult = await saveSession(page, 'test-session');
    
    if (!saveResult.success) {
      throw new Error('Session save failed');
    }
    
    // Close and reopen
    await page.close();
    const page2 = await context.newPage();
    
    // Load session
    const loadResult = await loadSession(page2, 'test-session');
    
    if (!loadResult.success) {
      throw new Error('Session load failed');
    }
    
    // Verify localStorage was restored
    const restored = await page2.evaluate(() => {
      return localStorage.getItem('test-key');
    });
    
    if (restored === 'test-value') {
      return {
        success: true,
        sessionRestored: true
      };
    } else {
      throw new Error('Session data not restored correctly');
    }
    
  } finally {
    await browser.close();
    
    // Clean up test session
    const { deleteSession } = require('./session-manager');
    await deleteSession('test-session');
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Advanced Browser Automation Test Suite\n');
  console.log('=' .repeat(60));
  
  // CAPTCHA Tests
  console.log('\n📝 CAPTCHA Solving Tests');
  console.log('-'.repeat(60));
  await runTest('CAPTCHA Detection (reCAPTCHA v2)', testCaptchaDetection);
  await runTest('CAPTCHA Solving (2Captcha)', testCaptchaSolving, {
    skip: !process.env.CAPTCHA_2CAPTCHA_KEY,
    timeout: 150000
  });
  
  // Authentication Tests
  console.log('\n🔐 Authentication Tests');
  console.log('-'.repeat(60));
  await runTest('OAuth Form Detection (GitHub)', testGitHubOAuthDetection);
  await runTest('2FA TOTP Generation', test2FACodeGeneration);
  
  // Form Tests
  console.log('\n📋 Form Filling Tests');
  console.log('-'.repeat(60));
  await runTest('Form Field Detection', testFormDetection);
  await runTest('Form Data Filling', testFormFilling);
  
  // Wait Strategy Tests
  console.log('\n⏳ Wait Strategy Tests');
  console.log('-'.repeat(60));
  await runTest('Element Wait (delayed visibility)', testElementWait);
  await runTest('Smart Wait (multiple conditions)', testSmartWait);
  
  // Visual Verification Tests
  console.log('\n👁️  Visual Verification Tests');
  console.log('-'.repeat(60));
  await runTest('Screenshot Capture & Baseline', testScreenshotCapture);
  await runTest('Element State Verification', testElementStateVerification);
  
  // Session Management Tests
  console.log('\n💾 Session Management Tests');
  console.log('-'.repeat(60));
  await runTest('Session Save & Load', testSessionSaveLoad);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⏭️  Skipped: ${results.summary.skipped}`);
  console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  
  // Save results to file
  const resultsPath = path.join(__dirname, 'TEST_RESULTS.md');
  await saveTestResults(resultsPath);
  
  console.log(`\n📄 Full results saved to: ${resultsPath}`);
}

/**
 * Save test results to markdown file
 */
async function saveTestResults(outputPath) {
  const sections = [];
  
  sections.push('# Advanced Browser Automation - Test Results');
  sections.push('');
  sections.push(`**Test Date:** ${results.timestamp}`);
  sections.push(`**Total Tests:** ${results.summary.total}`);
  sections.push(`**Passed:** ${results.summary.passed} ✅`);
  sections.push(`**Failed:** ${results.summary.failed} ❌`);
  sections.push(`**Skipped:** ${results.summary.skipped} ⏭️`);
  sections.push(`**Success Rate:** ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  sections.push('');
  sections.push('---');
  sections.push('');
  sections.push('## Test Details');
  sections.push('');
  
  for (const test of results.tests) {
    const icon = test.status === 'passed' ? '✅' : 
                 test.status === 'failed' ? '❌' : '⏭️';
    
    sections.push(`### ${icon} ${test.name}`);
    sections.push('');
    sections.push(`**Status:** ${test.status.toUpperCase()}`);
    
    if (test.duration) {
      sections.push(`**Duration:** ${test.duration}ms`);
    }
    
    if (test.status === 'passed') {
      // Show test-specific results
      const testData = { ...test };
      delete testData.name;
      delete testData.status;
      delete testData.duration;
      
      if (Object.keys(testData).length > 0) {
        sections.push('');
        sections.push('**Results:**');
        sections.push('```json');
        sections.push(JSON.stringify(testData, null, 2));
        sections.push('```');
      }
    } else if (test.status === 'failed') {
      sections.push('');
      sections.push(`**Error:** ${test.error}`);
      sections.push('');
      sections.push('<details>');
      sections.push('<summary>Stack Trace</summary>');
      sections.push('');
      sections.push('```');
      sections.push(test.stack || 'No stack trace available');
      sections.push('```');
      sections.push('</details>');
    } else if (test.status === 'skipped') {
      sections.push('');
      sections.push(`**Reason:** ${test.reason}`);
    }
    
    sections.push('');
    sections.push('---');
    sections.push('');
  }
  
  // Add configuration section
  sections.push('## Test Environment');
  sections.push('');
  sections.push('**Configuration:**');
  sections.push('- Browser: Chromium (Playwright)');
  sections.push('- Headless: true (except for CAPTCHA solving)');
  sections.push(`- 2Captcha API Key: ${process.env.CAPTCHA_2CAPTCHA_KEY ? 'Configured ✓' : 'Not configured'}`);
  sections.push('');
  
  // Write to file
  await fs.writeFile(outputPath, sections.join('\n'));
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  results
};
