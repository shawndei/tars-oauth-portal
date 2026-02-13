# Advanced Browser Automation Skill

## Overview
Enterprise-grade browser automation with CAPTCHA solving, advanced authentication flows, intelligent form filling, smart waiting strategies, and visual verification. Built on top of OpenClaw's existing browser capabilities.

## Core Capabilities

✅ **CAPTCHA Solving** - Automated CAPTCHA resolution via 2Captcha/AntiCaptcha services  
✅ **Advanced Authentication** - OAuth, SSO, 2FA, cookie management, session persistence  
✅ **Intelligent Form Filling** - Auto-detect fields, smart population, validation handling  
✅ **Smart Waiting** - Element detection, network idle, dynamic content loading  
✅ **Visual Verification** - Screenshot comparison, element presence validation  
✅ **Session Management** - Cookie persistence, authentication state, profile isolation  

---

## Architecture

### Integration with OpenClaw Browser

This skill **extends** the existing OpenClaw browser tool with advanced automation capabilities:

```
OpenClaw Browser (Base)
  ├─ Managed profile (isolated)
  ├─ JavaScript evaluation
  ├─ Basic navigation
  └─ Screenshot capture
        ↓
Advanced Browser Automation (This Skill)
  ├─ CAPTCHA detection & solving
  ├─ Auth flow orchestration
  ├─ Form intelligence
  ├─ Smart waits & retries
  └─ Visual verification
```

---

## Implementation

### Files

- **browser-advanced.js** - Core automation orchestration
- **captcha-solver.js** - CAPTCHA service integration (2Captcha, AntiCaptcha)
- **auth-handler.js** - OAuth, SSO, 2FA flow management
- **form-filler.js** - Intelligent form detection and filling
- **wait-strategies.js** - Smart waiting logic (elements, network, custom conditions)
- **visual-verifier.js** - Screenshot comparison and validation
- **session-manager.js** - Cookie/auth state persistence
- **SKILL.md** - This documentation
- **TEST_RESULTS.md** - Real-world test scenarios and proofs

---

## Feature: CAPTCHA Solving

### Supported Services

1. **2Captcha** (recommended) - Cost: $2.99/1000 solves
2. **AntiCaptcha** - Alternative provider
3. **Custom solvers** - Extensible architecture

### Supported CAPTCHA Types

- ✅ reCAPTCHA v2 (image selection)
- ✅ reCAPTCHA v3 (invisible)
- ✅ hCaptcha
- ✅ Image CAPTCHA (text recognition)
- ✅ FunCaptcha/RotateCaptcha

### Usage

```javascript
const { solveCaptcha } = require('./captcha-solver');

// Auto-detect and solve CAPTCHA on current page
const result = await solveCaptcha(page, {
  service: '2captcha',
  apiKey: process.env.CAPTCHA_API_KEY,
  type: 'auto', // auto-detect CAPTCHA type
  timeout: 120000 // 2 minutes
});

// result: { success: true, token: '03AGd...', cost: 0.003 }
```

### Detection Strategy

1. Scan page for common CAPTCHA iframe patterns
2. Identify CAPTCHA type (reCAPTCHA, hCaptcha, etc.)
3. Extract site key and required parameters
4. Submit to solving service
5. Wait for solution token
6. Inject token and submit form
7. Verify success (page transition or error message)

### Configuration

```json
{
  "captcha": {
    "enabled": true,
    "service": "2captcha",
    "apiKey": "YOUR_API_KEY",
    "timeout": 120000,
    "retries": 3,
    "autoSolve": true
  }
}
```

---

## Feature: Advanced Authentication

### Supported Auth Flows

1. **OAuth 2.0** - Google, GitHub, Microsoft, custom providers
2. **SAML/SSO** - Enterprise single sign-on
3. **2FA/MFA** - TOTP, SMS, email verification
4. **Cookie-based** - Session persistence across runs
5. **API key injection** - Bearer tokens, custom headers

### OAuth Flow Handler

```javascript
const { handleOAuth } = require('./auth-handler');

// Handle OAuth login with automatic redirect following
const auth = await handleOAuth(page, {
  provider: 'google',
  email: 'user@example.com',
  password: process.env.GOOGLE_PASSWORD,
  redirectUrl: 'https://app.example.com/callback',
  scopes: ['email', 'profile']
});

// Returns: { success: true, tokens: {...}, cookies: [...] }
```

### 2FA Handling

```javascript
const { handle2FA } = require('./auth-handler');

// Auto-detect 2FA prompt and handle TOTP
const result = await handle2FA(page, {
  method: 'totp',
  secret: process.env.TOTP_SECRET,
  backupCodes: ['123456', '789012'] // fallback
});
```

### Session Persistence

```javascript
const { saveSession, loadSession } = require('./session-manager');

// Save authenticated session
await saveSession(page, 'my-site-session');

// Later: restore session without re-authenticating
await loadSession(page, 'my-site-session');
```

Sessions are stored in `~/.openclaw/browser-sessions/{session-name}.json` with:
- Cookies
- localStorage
- sessionStorage
- Auth tokens
- Expiration tracking

---

## Feature: Intelligent Form Filling

### Auto-Detection

The form filler automatically detects field types:

```javascript
const { fillForm } = require('./form-filler');

// Auto-detect and fill form fields
await fillForm(page, {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1-555-0123',
  address: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102'
  },
  submit: true // automatically click submit button
});
```

### Field Detection Strategy

**Name/ID matching:**
- `first.*name`, `fname`, `given.*name` → firstName
- `email`, `e-mail`, `user.*email` → email
- `phone`, `tel`, `mobile` → phone
- `password`, `passwd`, `pwd` → password

**Type matching:**
- `<input type="email">` → email field
- `<input type="tel">` → phone field
- `<select>` with state options → state dropdown

**Placeholder/label matching:**
- Text near field: "First Name" → firstName
- Placeholder: "Enter email" → email

### Smart Population

```javascript
// Handles complex scenarios
await fillForm(page, {
  // Radio buttons
  gender: 'male', // finds and clicks male radio
  
  // Checkboxes
  terms: true, // checks terms checkbox
  newsletter: false, // unchecks newsletter
  
  // Dropdowns
  country: 'United States', // selects by text
  state: 'CA', // or by value
  
  // File uploads
  resume: './files/resume.pdf',
  
  // Date pickers
  birthdate: '1990-05-15',
  
  // Rich text editors
  bio: 'Long text here...' // handles TinyMCE, CKEditor
});
```

### Validation Handling

```javascript
// Wait for validation and retry if needed
const result = await fillForm(page, data, {
  validateFields: true, // wait for validation feedback
  retryOnError: true, // retry if validation fails
  maxRetries: 3
});

// result: { success: true, errors: [], attempts: 1 }
```

---

## Feature: Smart Waiting Strategies

### Built-in Wait Strategies

```javascript
const { waitFor } = require('./wait-strategies');

// Wait for element to appear
await waitFor.element(page, '#submit-button', { timeout: 10000 });

// Wait for element to disappear (loading spinner)
await waitFor.elementGone(page, '.loading-spinner');

// Wait for text content
await waitFor.text(page, 'Success!', { timeout: 5000 });

// Wait for network idle
await waitFor.networkIdle(page, { timeout: 30000, maxInflight: 0 });

// Wait for navigation
await waitFor.navigation(page, { timeout: 15000 });

// Wait for function to return true
await waitFor.condition(page, () => {
  return document.querySelector('.result-count').textContent !== '0';
}, { timeout: 10000, pollInterval: 500 });

// Wait for URL change
await waitFor.urlChange(page, /\/dashboard/, { timeout: 10000 });
```

### Intelligent Wait Strategy

```javascript
// Automatically choose best wait strategy
await waitFor.smart(page, {
  // Wait for ANY of these conditions
  element: '#content',
  text: 'Loaded',
  networkIdle: true,
  timeout: 30000
});
```

### Retry Logic

```javascript
const { retry } = require('./wait-strategies');

// Retry action until success
await retry(async () => {
  await page.click('#flaky-button');
  await waitFor.text(page, 'Success');
}, {
  maxAttempts: 5,
  delay: 2000, // wait 2s between attempts
  backoff: 'exponential' // 2s, 4s, 8s, 16s...
});
```

---

## Feature: Visual Verification

### Screenshot Comparison

```javascript
const { verifyVisual } = require('./visual-verifier');

// Take baseline screenshot
await verifyVisual.saveBaseline(page, 'login-page', {
  fullPage: false,
  element: '#login-form'
});

// Later: compare current page to baseline
const result = await verifyVisual.compare(page, 'login-page', {
  threshold: 0.02, // 2% difference allowed
  element: '#login-form'
});

// result: { match: true, diff: 0.01, diffImage: 'path/to/diff.png' }
```

### Element Verification

```javascript
// Verify element attributes/properties
await verifyVisual.elementState(page, '#submit-button', {
  visible: true,
  enabled: true,
  text: 'Submit',
  className: 'btn-primary'
});

// Verify element position/size
await verifyVisual.elementBounds(page, '#modal', {
  x: { min: 100, max: 200 },
  y: { min: 50, max: 100 },
  width: { min: 400 },
  height: { min: 300 }
});
```

### Viewport Verification

```javascript
// Verify responsive behavior
await verifyVisual.responsive(page, '#sidebar', {
  desktop: { visible: true, width: 250 },
  tablet: { visible: true, width: 200 },
  mobile: { visible: false }
});
```

---

## Complete Example: Complex Automation

```javascript
const {
  solveCaptcha,
  handleOAuth,
  fillForm,
  waitFor,
  verifyVisual,
  saveSession
} = require('./browser-advanced');

async function automateSignup(page, userData) {
  try {
    // 1. Navigate to signup page
    await page.goto('https://example.com/signup');
    
    // 2. Wait for form to load
    await waitFor.element(page, 'form#signup');
    
    // 3. Fill form intelligently
    await fillForm(page, {
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      terms: true
    });
    
    // 4. Detect and solve CAPTCHA if present
    const captchaResult = await solveCaptcha(page, { service: '2captcha' });
    if (captchaResult.solved) {
      console.log('CAPTCHA solved:', captchaResult.cost);
    }
    
    // 5. Submit form
    await page.click('button[type="submit"]');
    
    // 6. Wait for verification email step or 2FA
    await waitFor.smart(page, {
      text: ['Verify your email', 'Enter code'],
      timeout: 15000
    });
    
    // 7. Handle 2FA if needed
    if (await page.textContent('body').includes('Enter code')) {
      await handle2FA(page, { method: 'totp', secret: userData.totpSecret });
    }
    
    // 8. Wait for dashboard
    await waitFor.urlChange(page, /\/dashboard/);
    
    // 9. Verify success
    await verifyVisual.elementState(page, '.welcome-message', {
      visible: true,
      text: `Welcome, ${userData.firstName}`
    });
    
    // 10. Save session for future use
    await saveSession(page, 'example-com-session');
    
    return { success: true, sessionSaved: true };
    
  } catch (error) {
    // Take screenshot on failure for debugging
    await page.screenshot({ path: 'signup-error.png' });
    throw error;
  }
}
```

---

## Configuration

### Environment Variables

```bash
# CAPTCHA Services
CAPTCHA_2CAPTCHA_KEY=your_api_key_here
CAPTCHA_ANTICAPTCHA_KEY=your_api_key_here

# Auth Credentials (example - use secure vault in production)
GOOGLE_EMAIL=user@gmail.com
GOOGLE_PASSWORD=secure_password
TOTP_SECRET=BASE32_SECRET_HERE

# Browser Settings
BROWSER_HEADLESS=false
BROWSER_SLOW_MO=100
BROWSER_TIMEOUT=30000
```

### Config File: `browser-advanced.config.json`

```json
{
  "captcha": {
    "enabled": true,
    "service": "2captcha",
    "timeout": 120000,
    "autoSolve": true
  },
  "auth": {
    "sessionDir": "~/.openclaw/browser-sessions",
    "sessionTTL": 86400000
  },
  "forms": {
    "validateFields": true,
    "retryOnError": true,
    "maxRetries": 3
  },
  "waits": {
    "defaultTimeout": 30000,
    "pollInterval": 500,
    "networkIdleTimeout": 2000
  },
  "visual": {
    "screenshotDir": "./screenshots",
    "diffThreshold": 0.02
  }
}
```

---

## API Reference

### Main Functions

#### `solveCaptcha(page, options)`
Detect and solve CAPTCHA on current page.

**Options:**
- `service` (string): '2captcha' or 'anticaptcha'
- `apiKey` (string): Service API key
- `type` (string): 'auto', 'recaptcha-v2', 'recaptcha-v3', 'hcaptcha', 'image'
- `timeout` (number): Max wait time in ms

**Returns:** `{ success: boolean, token?: string, cost?: number, error?: string }`

#### `handleOAuth(page, options)`
Handle OAuth authentication flow.

**Options:**
- `provider` (string): 'google', 'github', 'microsoft', 'custom'
- `email` (string): User email
- `password` (string): User password
- `redirectUrl` (string): Expected callback URL
- `scopes` (array): OAuth scopes

**Returns:** `{ success: boolean, tokens: {...}, cookies: [...] }`

#### `fillForm(page, data, options)`
Intelligently fill form fields.

**Parameters:**
- `data` (object): Field values (key-value pairs)
- `options` (object): Configuration options

**Returns:** `{ success: boolean, errors: [], attempts: number }`

#### `waitFor.element(page, selector, options)`
Wait for element to appear.

**Returns:** `Promise<ElementHandle>`

#### `verifyVisual.compare(page, baselineName, options)`
Compare current page to baseline screenshot.

**Returns:** `{ match: boolean, diff: number, diffImage?: string }`

---

## Testing Strategy

### Test Categories

1. **CAPTCHA Solving** (5 real sites)
   - reCAPTCHA v2 demo site
   - hCaptcha demo site
   - Real signup form with CAPTCHA
   - Image CAPTCHA
   - Invisible reCAPTCHA

2. **Authentication Flows** (5 scenarios)
   - OAuth (Google)
   - OAuth (GitHub)
   - 2FA with TOTP
   - SSO (Microsoft)
   - Cookie-based session restore

3. **Form Filling** (5 complex forms)
   - Multi-step signup form
   - Checkout form with validation
   - Job application form
   - Profile update form
   - Survey with conditional logic

4. **Waiting Strategies** (5 edge cases)
   - Dynamic content loading
   - Infinite scroll
   - Progressive form reveal
   - SPA navigation
   - WebSocket-based updates

5. **Visual Verification** (3 scenarios)
   - Layout regression detection
   - Element state verification
   - Responsive behavior validation

### Test Execution

```bash
node test-browser-advanced.js
```

Results documented in `TEST_RESULTS.md` with:
- ✅ Pass/❌ Fail status
- Screenshots
- Execution time
- Error logs (if any)
- Cost analysis (for CAPTCHA tests)

---

## Error Handling

### Built-in Recovery

```javascript
const { autoRecover } = require('./browser-advanced');

// Wrap automation in auto-recovery
await autoRecover(async (page) => {
  // Your automation code
  await fillForm(page, data);
  await solveCaptcha(page);
  await page.click('button');
}, {
  maxAttempts: 3,
  screenshotOnError: true,
  resetOnError: true // reload page on error
});
```

### Error Types

- `CaptchaError` - CAPTCHA solving failed
- `AuthError` - Authentication failed
- `FormError` - Form filling/validation error
- `TimeoutError` - Wait condition not met
- `VerificationError` - Visual verification failed

---

## Performance

### Benchmarks

| Operation | Average Time | Cost |
|-----------|-------------|------|
| CAPTCHA solve (2Captcha) | 20-40s | $0.003 |
| OAuth flow | 3-8s | Free |
| Form fill (10 fields) | 2-5s | Free |
| Smart wait (element) | <1s | Free |
| Screenshot compare | <500ms | Free |

### Optimization Tips

1. **Reuse sessions** - Save/load authenticated sessions instead of re-authenticating
2. **Batch operations** - Fill multiple fields in one pass
3. **Parallel waits** - Use `Promise.race()` for multiple wait conditions
4. **Cache baselines** - Store screenshot baselines to avoid regeneration
5. **Selective solving** - Only solve CAPTCHAs when detected

---

## Security Considerations

⚠️ **Credential Storage**
- Never hardcode passwords in scripts
- Use environment variables or secure vault (e.g., 1Password CLI)
- Rotate credentials regularly

⚠️ **Session Management**
- Sessions stored in `~/.openclaw/browser-sessions/` (excluded from git)
- Encrypt session files if sharing across machines
- Set appropriate session TTLs

⚠️ **CAPTCHA Services**
- Use API keys, not account credentials
- Monitor usage to prevent unexpected charges
- Set spending limits on CAPTCHA service accounts

⚠️ **Rate Limiting**
- Respect site rate limits (add delays if needed)
- Use proxies for high-volume automation
- Monitor for IP blocks

---

## Troubleshooting

### CAPTCHA Not Solving

**Symptoms:** CAPTCHA detected but not solved  
**Solutions:**
1. Check API key is valid: `curl https://2captcha.com/res.php?key=YOUR_KEY&action=getbalance`
2. Verify CAPTCHA type detection: Add `debug: true` to options
3. Increase timeout: Some CAPTCHAs take 60-120s
4. Check balance: CAPTCHA services require prepaid balance

### Form Fields Not Filling

**Symptoms:** Fields remain empty after `fillForm()`  
**Solutions:**
1. Enable debug mode: `fillForm(page, data, { debug: true })`
2. Check field selectors: Fields may have unusual names/IDs
3. Add custom mappings: `{ customMappings: { 'weird-email-field': 'email' } }`
4. Try slower typing: `{ typeDelay: 100 }` (100ms between keystrokes)

### Authentication Failing

**Symptoms:** OAuth/2FA not completing  
**Solutions:**
1. Check credentials are correct
2. Verify TOTP secret is valid: `node -e "console.log(require('speakeasy').totp({ secret: 'YOUR_SECRET' }))"`
3. Enable headless mode: `BROWSER_HEADLESS=false` to watch the flow
4. Check for additional verification steps (email, phone)

### Wait Timeouts

**Symptoms:** `TimeoutError` thrown frequently  
**Solutions:**
1. Increase timeout: `waitFor.element(page, selector, { timeout: 60000 })`
2. Use smarter wait: `waitFor.smart()` instead of fixed element wait
3. Check if element is in iframe: `page.frameLocator('iframe').locator(selector)`
4. Verify selector is correct: Use browser DevTools to test

---

## Roadmap

### Future Enhancements

- [ ] **Proxy Support** - Rotate IPs for high-volume automation
- [ ] **Mobile Emulation** - Test mobile-specific flows
- [ ] **A/B Test Detection** - Handle variant UIs automatically
- [ ] **CAPTCHA V4 Support** - Support latest reCAPTCHA versions
- [ ] **ML-based Field Detection** - Train model for unusual form layouts
- [ ] **Video Recording** - Record automation sessions for debugging
- [ ] **Performance Tracing** - Lighthouse-style performance metrics
- [ ] **Cloud Browser Support** - Run on Browserless, Selenium Grid

---

## Credits

**Author:** OpenClaw Subagent (browser-advanced-builder)  
**Date:** 2026-02-13  
**Version:** 1.0.0  
**License:** MIT  

**Dependencies:**
- OpenClaw Browser (base)
- 2Captcha API (optional)
- AntiCaptcha API (optional)
- Playwright (underlying engine)

---

## Support

**Issues:** Report bugs in `skills/browser-advanced/ISSUES.md`  
**Examples:** See `skills/browser-advanced/examples/` for sample scripts  
**Tests:** Run `node test-browser-advanced.js` to verify setup  

For questions, check the main OpenClaw documentation or create a discussion thread.
