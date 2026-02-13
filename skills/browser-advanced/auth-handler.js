/**
 * Authentication Handler - OAuth, SSO, 2FA, Session Management
 * Handles complex authentication flows automatically
 */

const speakeasy = require('speakeasy');
const { waitFor } = require('./wait-strategies');

/**
 * Handle OAuth authentication flow
 * Supports Google, GitHub, Microsoft, and custom providers
 */
async function handleOAuth(page, options = {}) {
  const {
    provider,
    email,
    password,
    redirectUrl,
    scopes = [],
    timeout = 60000
  } = options;

  const startTime = Date.now();

  try {
    if (provider === 'google') {
      return await handleGoogleOAuth(page, email, password, redirectUrl, timeout);
    } else if (provider === 'github') {
      return await handleGitHubOAuth(page, email, password, redirectUrl, timeout);
    } else if (provider === 'microsoft') {
      return await handleMicrosoftOAuth(page, email, password, redirectUrl, timeout);
    } else {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Google OAuth flow
 */
async function handleGoogleOAuth(page, email, password, redirectUrl, timeout) {
  console.log('Starting Google OAuth flow...');

  // Wait for Google login page
  await waitFor.urlPattern(page, /accounts\.google\.com/, { timeout });

  // Enter email
  await waitFor.element(page, 'input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.click('#identifierNext, button:has-text("Next")');

  // Wait for password page
  await page.waitForTimeout(2000); // Google's transition delay
  await waitFor.element(page, 'input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', password);
  await page.click('#passwordNext, button:has-text("Next")');

  // Handle potential 2FA
  const has2FA = await Promise.race([
    page.waitForSelector('input[name="totpPin"]', { timeout: 5000 }).then(() => true),
    page.waitForNavigation({ timeout: 5000 }).then(() => false)
  ]).catch(() => false);

  if (has2FA) {
    console.log('Google 2FA detected - waiting for TOTP...');
    // 2FA will be handled by handle2FA if needed
    return { success: false, requires2FA: true };
  }

  // Wait for redirect back to app
  if (redirectUrl) {
    await waitFor.urlPattern(page, new RegExp(redirectUrl), { timeout });
  }

  // Extract cookies and tokens
  const cookies = await page.context().cookies();
  
  return {
    success: true,
    provider: 'google',
    cookies,
    redirected: page.url()
  };
}

/**
 * GitHub OAuth flow
 */
async function handleGitHubOAuth(page, email, password, redirectUrl, timeout) {
  console.log('Starting GitHub OAuth flow...');

  // Wait for GitHub login
  await waitFor.urlPattern(page, /github\.com\/login/, { timeout });

  // Fill credentials
  await page.fill('input[name="login"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('input[type="submit"]');

  // Check for 2FA
  const has2FA = await Promise.race([
    page.waitForSelector('input[name="otp"]', { timeout: 5000 }).then(() => true),
    page.waitForNavigation({ timeout: 5000 }).then(() => false)
  ]).catch(() => false);

  if (has2FA) {
    console.log('GitHub 2FA detected');
    return { success: false, requires2FA: true };
  }

  // Handle authorization page (if first time)
  const needsAuth = await page.isVisible('button[name="authorize"]').catch(() => false);
  if (needsAuth) {
    await page.click('button[name="authorize"]');
  }

  // Wait for redirect
  if (redirectUrl) {
    await waitFor.urlPattern(page, new RegExp(redirectUrl), { timeout });
  }

  const cookies = await page.context().cookies();

  return {
    success: true,
    provider: 'github',
    cookies,
    redirected: page.url()
  };
}

/**
 * Microsoft OAuth flow
 */
async function handleMicrosoftOAuth(page, email, password, redirectUrl, timeout) {
  console.log('Starting Microsoft OAuth flow...');

  // Wait for Microsoft login
  await waitFor.urlPattern(page, /login\.microsoftonline\.com|login\.live\.com/, { timeout });

  // Enter email
  await waitFor.element(page, 'input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', email);
  await page.click('input[type="submit"]');

  // Wait for password page
  await page.waitForTimeout(2000);
  await waitFor.element(page, 'input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', password);
  await page.click('input[type="submit"]');

  // Handle "Stay signed in?" prompt
  const staySignedIn = await page.isVisible('input[type="submit"][value="Yes"]').catch(() => false);
  if (staySignedIn) {
    await page.click('input[type="submit"][value="Yes"]');
  }

  // Wait for redirect
  if (redirectUrl) {
    await waitFor.urlPattern(page, new RegExp(redirectUrl), { timeout });
  }

  const cookies = await page.context().cookies();

  return {
    success: true,
    provider: 'microsoft',
    cookies,
    redirected: page.url()
  };
}

/**
 * Handle 2FA/MFA authentication
 * Supports TOTP, SMS, and backup codes
 */
async function handle2FA(page, options = {}) {
  const {
    method = 'totp', // 'totp', 'sms', 'backup'
    secret, // TOTP secret (base32)
    backupCodes = [],
    smsCode, // Manual SMS code
    timeout = 30000
  } = options;

  try {
    if (method === 'totp' && secret) {
      // Generate TOTP code
      const token = speakeasy.totp({
        secret: secret,
        encoding: 'base32'
      });

      console.log(`Generated TOTP code: ${token}`);

      // Find 2FA input field (various patterns)
      const selectors = [
        'input[name="totpPin"]', // Google
        'input[name="otp"]', // GitHub
        'input[type="tel"]', // Generic
        'input[autocomplete="one-time-code"]',
        'input[placeholder*="code" i]'
      ];

      let input;
      for (const selector of selectors) {
        input = await page.$(selector);
        if (input) break;
      }

      if (!input) {
        throw new Error('Could not find 2FA input field');
      }

      // Enter code
      await input.fill(token);

      // Find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Verify")',
        'button:has-text("Continue")'
      ];

      for (const selector of submitSelectors) {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          break;
        }
      }

      // Wait for navigation or success indicator
      await page.waitForNavigation({ timeout }).catch(() => {});

      return { success: true, method: 'totp' };

    } else if (method === 'backup' && backupCodes.length > 0) {
      // Use backup code
      const code = backupCodes[0];
      
      const input = await page.$('input[name="otp"], input[type="text"]');
      if (!input) {
        throw new Error('Could not find backup code input field');
      }

      await input.fill(code);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ timeout }).catch(() => {});

      return { success: true, method: 'backup', usedCode: code };

    } else if (method === 'sms' && smsCode) {
      // Manual SMS code entry
      const input = await page.$('input[type="tel"], input[name="otp"]');
      if (!input) {
        throw new Error('Could not find SMS code input field');
      }

      await input.fill(smsCode);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ timeout }).catch(() => {});

      return { success: true, method: 'sms' };

    } else {
      throw new Error(`Invalid 2FA configuration. Method: ${method}, has secret: ${!!secret}`);
    }

  } catch (error) {
    return {
      success: false,
      error: error.message,
      method
    };
  }
}

/**
 * Extract authentication tokens from page
 * Looks for JWT tokens, OAuth tokens in localStorage/sessionStorage
 */
async function extractTokens(page) {
  return await page.evaluate(() => {
    const tokens = {};

    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      
      // Look for token-like keys
      if (key.match(/token|auth|jwt|bearer|access|refresh/i)) {
        tokens[`localStorage.${key}`] = value;
      }
    }

    // Check sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);
      
      if (key.match(/token|auth|jwt|bearer|access|refresh/i)) {
        tokens[`sessionStorage.${key}`] = value;
      }
    }

    return tokens;
  });
}

/**
 * Inject authentication tokens into page
 */
async function injectTokens(page, tokens) {
  await page.evaluate((tokens) => {
    Object.keys(tokens).forEach(key => {
      if (key.startsWith('localStorage.')) {
        localStorage.setItem(key.replace('localStorage.', ''), tokens[key]);
      } else if (key.startsWith('sessionStorage.')) {
        sessionStorage.setItem(key.replace('sessionStorage.', ''), tokens[key]);
      }
    });
  }, tokens);
}

module.exports = {
  handleOAuth,
  handle2FA,
  extractTokens,
  injectTokens,
  handleGoogleOAuth,
  handleGitHubOAuth,
  handleMicrosoftOAuth
};
