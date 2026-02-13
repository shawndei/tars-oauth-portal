/**
 * Advanced Browser Automation - Main Orchestrator
 * Ties together all advanced browser automation features
 */

const captchaSolver = require('./captcha-solver');
const authHandler = require('./auth-handler');
const formFiller = require('./form-filler');
const { waitFor } = require('./wait-strategies');
const { verifyVisual } = require('./visual-verifier');
const sessionManager = require('./session-manager');

/**
 * Auto-recovery wrapper
 * Wraps automation code in error recovery logic
 */
async function autoRecover(automationFn, options = {}) {
  const {
    maxAttempts = 3,
    screenshotOnError = true,
    resetOnError = false,
    page
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await automationFn(page);
      return {
        success: true,
        result,
        attempts: attempt
      };
      
    } catch (error) {
      lastError = error;
      
      console.error(`Attempt ${attempt}/${maxAttempts} failed:`, error.message);
      
      // Take screenshot for debugging
      if (screenshotOnError && page) {
        const timestamp = Date.now();
        const path = `./error-${timestamp}.png`;
        await page.screenshot({ path }).catch(() => {});
        console.log(`Error screenshot saved: ${path}`);
      }
      
      // Reset page if requested
      if (resetOnError && page && attempt < maxAttempts) {
        console.log('Resetting page...');
        await page.reload().catch(() => {});
        await page.waitForTimeout(1000);
      }
    }
  }
  
  return {
    success: false,
    error: lastError.message,
    attempts: maxAttempts
  };
}

/**
 * Complete automation flow example
 * Demonstrates using all features together
 */
async function automateComplexFlow(page, flowConfig) {
  const {
    startUrl,
    sessionName,
    authRequired = false,
    authProvider,
    authCredentials,
    formData,
    captchaService = '2captcha',
    verifySuccess
  } = flowConfig;
  
  const log = [];
  
  try {
    // Step 1: Load session if exists, otherwise navigate
    log.push('Loading session...');
    const sessionLoaded = await sessionManager.loadSession(page, sessionName, {
      navigateToUrl: false
    });
    
    if (!sessionLoaded.success) {
      log.push('Session not found, navigating to start URL...');
      await page.goto(startUrl);
    } else {
      log.push('Session loaded successfully');
    }
    
    // Step 2: Handle authentication if needed
    if (authRequired && !sessionLoaded.success) {
      log.push(`Authenticating with ${authProvider}...`);
      
      const authResult = await authHandler.handleOAuth(page, {
        provider: authProvider,
        ...authCredentials
      });
      
      if (!authResult.success) {
        // Check if 2FA is needed
        if (authResult.requires2FA && authCredentials.totpSecret) {
          log.push('2FA required, generating code...');
          await authHandler.handle2FA(page, {
            method: 'totp',
            secret: authCredentials.totpSecret
          });
        } else {
          throw new Error('Authentication failed');
        }
      }
      
      log.push('Authentication successful');
      
      // Save session after successful auth
      await sessionManager.saveSession(page, sessionName);
      log.push('Session saved');
    }
    
    // Step 3: Fill form if provided
    if (formData) {
      log.push('Filling form...');
      
      const fillResult = await formFiller.fillForm(page, formData, {
        validateFields: true,
        retryOnError: true
      });
      
      if (!fillResult.success) {
        throw new Error(`Form filling failed: ${JSON.stringify(fillResult.errors)}`);
      }
      
      log.push('Form filled successfully');
    }
    
    // Step 4: Handle CAPTCHA if present
    log.push('Checking for CAPTCHA...');
    const captchaResult = await captchaSolver.solveCaptcha(page, {
      service: captchaService
    });
    
    if (captchaResult.success) {
      log.push(`CAPTCHA solved (cost: $${captchaResult.cost})`);
    } else if (captchaResult.error && !captchaResult.error.includes('No CAPTCHA')) {
      throw new Error(`CAPTCHA solving failed: ${captchaResult.error}`);
    }
    
    // Step 5: Verify success
    if (verifySuccess) {
      log.push('Verifying success...');
      
      if (verifySuccess.text) {
        await waitFor.text(page, verifySuccess.text, { timeout: 15000 });
        log.push(`Success verified: found text "${verifySuccess.text}"`);
      }
      
      if (verifySuccess.urlPattern) {
        await waitFor.urlPattern(page, verifySuccess.urlPattern, { timeout: 15000 });
        log.push(`Success verified: URL matches ${verifySuccess.urlPattern}`);
      }
      
      if (verifySuccess.element) {
        await waitFor.element(page, verifySuccess.element, { timeout: 15000 });
        log.push(`Success verified: element "${verifySuccess.element}" found`);
      }
    }
    
    log.push('Automation completed successfully! ✓');
    
    return {
      success: true,
      log
    };
    
  } catch (error) {
    log.push(`Error: ${error.message}`);
    
    // Take screenshot on error
    const timestamp = Date.now();
    await page.screenshot({ path: `./error-${timestamp}.png` }).catch(() => {});
    
    return {
      success: false,
      error: error.message,
      log
    };
  }
}

/**
 * Load configuration from file
 */
async function loadConfig(configPath = './browser-advanced.config.json') {
  const fs = require('fs').promises;
  
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Return default config
    return {
      captcha: {
        enabled: true,
        service: '2captcha',
        timeout: 120000
      },
      auth: {
        sessionTTL: 86400000
      },
      forms: {
        validateFields: true,
        retryOnError: true
      },
      waits: {
        defaultTimeout: 30000
      },
      visual: {
        diffThreshold: 0.02
      }
    };
  }
}

// Export all modules for easy access
module.exports = {
  // Core functions
  autoRecover,
  automateComplexFlow,
  loadConfig,
  
  // CAPTCHA solving
  solveCaptcha: captchaSolver.solveCaptcha,
  detectCaptcha: captchaSolver.detectCaptcha,
  checkCaptchaBalance: captchaSolver.checkBalance,
  
  // Authentication
  handleOAuth: authHandler.handleOAuth,
  handle2FA: authHandler.handle2FA,
  extractTokens: authHandler.extractTokens,
  injectTokens: authHandler.injectTokens,
  
  // Form filling
  fillForm: formFiller.fillForm,
  fillField: formFiller.fillField,
  submitForm: formFiller.submitForm,
  extractFormData: formFiller.extractFormData,
  validateForm: formFiller.validateForm,
  
  // Waiting strategies
  waitFor,
  
  // Visual verification
  verifyVisual,
  
  // Session management
  saveSession: sessionManager.saveSession,
  loadSession: sessionManager.loadSession,
  deleteSession: sessionManager.deleteSession,
  listSessions: sessionManager.listSessions,
  cleanExpiredSessions: sessionManager.cleanExpiredSessions,
  
  // Direct module access
  modules: {
    captchaSolver,
    authHandler,
    formFiller,
    waitFor,
    verifyVisual,
    sessionManager
  }
};
