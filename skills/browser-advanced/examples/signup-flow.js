/**
 * Example: Complete Signup Flow with CAPTCHA
 * Demonstrates form filling, CAPTCHA solving, and verification
 */

const { chromium } = require('playwright');
const { fillForm, solveCaptcha, waitFor } = require('../browser-advanced');

async function automateSignup() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to signup page...');
    await page.goto('https://example.com/signup');
    
    console.log('Filling signup form...');
    await fillForm(page, {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'SecurePassword123!',
      phone: '+1-555-0123',
      terms: true
    }, {
      validateFields: true,
      retryOnError: true
    });
    
    console.log('Checking for CAPTCHA...');
    const captchaResult = await solveCaptcha(page, {
      service: '2captcha',
      timeout: 120000
    });
    
    if (captchaResult.success) {
      console.log(`CAPTCHA solved! Cost: $${captchaResult.cost}`);
    }
    
    console.log('Submitting form...');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for confirmation...');
    await waitFor.smart(page, {
      text: ['Welcome', 'Success', 'Check your email'],
      urlPattern: /\/dashboard|\/verify/,
      timeout: 30000
    });
    
    console.log('✅ Signup completed successfully!');
    
    // Take screenshot
    await page.screenshot({ path: 'signup-success.png' });
    
  } catch (error) {
    console.error('❌ Signup failed:', error.message);
    await page.screenshot({ path: 'signup-error.png' });
  } finally {
    await browser.close();
  }
}

// Run if executed directly
if (require.main === module) {
  automateSignup().catch(console.error);
}

module.exports = { automateSignup };
