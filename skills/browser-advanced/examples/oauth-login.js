/**
 * Example: OAuth Authentication with Session Persistence
 * Demonstrates OAuth login, 2FA handling, and session reuse
 */

const { chromium } = require('playwright');
const { handleOAuth, handle2FA, saveSession, loadSession } = require('../browser-advanced');

async function loginWithOAuth() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const sessionName = 'my-app-google-session';
    
    // Try to load existing session first
    console.log('Attempting to load saved session...');
    const sessionLoaded = await loadSession(page, sessionName);
    
    if (sessionLoaded.success) {
      console.log('✅ Session restored! Skipping login.');
      await page.goto('https://example.com/dashboard');
    } else {
      console.log('No session found. Starting OAuth login...');
      
      // Navigate to app
      await page.goto('https://example.com/login');
      
      // Click "Sign in with Google"
      await page.click('button:has-text("Sign in with Google")');
      
      // Handle OAuth flow
      console.log('Handling Google OAuth...');
      const authResult = await handleOAuth(page, {
        provider: 'google',
        email: process.env.GOOGLE_EMAIL,
        password: process.env.GOOGLE_PASSWORD,
        redirectUrl: 'https://example.com/callback'
      });
      
      // Handle 2FA if required
      if (authResult.requires2FA) {
        console.log('2FA required. Generating TOTP code...');
        await handle2FA(page, {
          method: 'totp',
          secret: process.env.GOOGLE_TOTP_SECRET
        });
      }
      
      console.log('✅ Authentication successful!');
      
      // Save session for next time
      console.log('Saving session...');
      await saveSession(page, sessionName, {
        ttl: 86400000 * 7 // 7 days
      });
      
      console.log('✅ Session saved! Next login will be instant.');
    }
    
    // Verify we're logged in
    const isLoggedIn = await page.isVisible('.user-menu, [data-testid="user-profile"]');
    
    if (isLoggedIn) {
      console.log('✅ Logged in successfully!');
      await page.screenshot({ path: 'oauth-login-success.png' });
    } else {
      throw new Error('Login verification failed');
    }
    
  } catch (error) {
    console.error('❌ OAuth login failed:', error.message);
    await page.screenshot({ path: 'oauth-login-error.png' });
  } finally {
    await browser.close();
  }
}

// Run if executed directly
if (require.main === module) {
  // Check for required env vars
  if (!process.env.GOOGLE_EMAIL || !process.env.GOOGLE_PASSWORD) {
    console.error('❌ Please set GOOGLE_EMAIL and GOOGLE_PASSWORD environment variables');
    process.exit(1);
  }
  
  loginWithOAuth().catch(console.error);
}

module.exports = { loginWithOAuth };
