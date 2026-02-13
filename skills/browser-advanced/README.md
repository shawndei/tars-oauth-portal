# Advanced Browser Automation for OpenClaw

Enterprise-grade browser automation with CAPTCHA solving, advanced authentication, intelligent form filling, smart waiting, and visual verification.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd skills/browser-advanced
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
# Edit .env and add your 2Captcha API key
```

### 3. Run Tests

```bash
npm test
```

## 📚 Features

### ✅ CAPTCHA Solving
- **Supported:** reCAPTCHA v2/v3, hCaptcha, image CAPTCHAs
- **Services:** 2Captcha, AntiCaptcha
- **Auto-detection:** Automatically identifies CAPTCHA type
- **Cost tracking:** Monitors solving costs

### 🔐 Advanced Authentication
- **OAuth 2.0:** Google, GitHub, Microsoft, custom providers
- **2FA/MFA:** TOTP, SMS, email verification
- **Session persistence:** Save/restore authenticated sessions
- **Cookie management:** Automatic cookie handling

### 📋 Intelligent Form Filling
- **Auto-detection:** Recognizes field types automatically
- **Smart population:** Handles text, dropdowns, checkboxes, file uploads
- **Validation:** Waits for and handles form validation
- **Error recovery:** Retries on validation errors

### ⏳ Smart Waiting Strategies
- **Element waits:** Wait for appearance/disappearance
- **Network idle:** Wait for all requests to complete
- **Text waits:** Wait for specific content
- **Custom conditions:** Flexible condition functions
- **Smart waits:** Race multiple conditions

### 👁️ Visual Verification
- **Screenshot comparison:** Compare current vs baseline
- **Element state:** Verify attributes, visibility, position
- **Responsive testing:** Test across viewport sizes
- **Debug screenshots:** Capture on errors

### 💾 Session Management
- **Save sessions:** Cookies, localStorage, sessionStorage
- **Restore sessions:** Skip re-authentication
- **Expiration:** Automatic cleanup of old sessions
- **Export:** Export to curl, JSON

## 💡 Usage Examples

### Basic Form Automation

```javascript
const { fillForm, submitForm } = require('./browser-advanced');

await fillForm(page, {
  email: 'user@example.com',
  password: 'secure123',
  firstName: 'John',
  lastName: 'Doe',
  terms: true
});

await submitForm(page);
```

### CAPTCHA Solving

```javascript
const { solveCaptcha } = require('./browser-advanced');

const result = await solveCaptcha(page, {
  service: '2captcha',
  timeout: 120000
});

if (result.success) {
  console.log(`CAPTCHA solved! Cost: $${result.cost}`);
}
```

### OAuth Authentication

```javascript
const { handleOAuth, handle2FA } = require('./browser-advanced');

// Handle OAuth login
const authResult = await handleOAuth(page, {
  provider: 'google',
  email: process.env.GOOGLE_EMAIL,
  password: process.env.GOOGLE_PASSWORD
});

// Handle 2FA if required
if (authResult.requires2FA) {
  await handle2FA(page, {
    method: 'totp',
    secret: process.env.GOOGLE_TOTP_SECRET
  });
}
```

### Session Management

```javascript
const { saveSession, loadSession } = require('./browser-advanced');

// After successful login
await saveSession(page, 'my-app-session');

// Later: restore without re-authenticating
await loadSession(page, 'my-app-session');
```

### Smart Waiting

```javascript
const { waitFor } = require('./browser-advanced');

// Wait for any of these conditions
await waitFor.smart(page, {
  element: '#dashboard',
  text: 'Welcome back',
  urlPattern: /\/dashboard/,
  timeout: 30000
});
```

### Visual Verification

```javascript
const { verifyVisual } = require('./browser-advanced');

// Save baseline
await verifyVisual.saveBaseline(page, 'login-page');

// Later: compare current state
const result = await verifyVisual.compare(page, 'login-page', {
  threshold: 0.02
});

if (!result.match) {
  console.log('Layout changed!');
}
```

### Complete Automation Flow

```javascript
const { automateComplexFlow } = require('./browser-advanced');

const result = await automateComplexFlow(page, {
  startUrl: 'https://example.com/signup',
  sessionName: 'example-session',
  authRequired: true,
  authProvider: 'google',
  authCredentials: {
    email: process.env.GOOGLE_EMAIL,
    password: process.env.GOOGLE_PASSWORD,
    totpSecret: process.env.GOOGLE_TOTP_SECRET
  },
  formData: {
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme Inc'
  },
  captchaService: '2captcha',
  verifySuccess: {
    text: 'Welcome',
    urlPattern: /\/dashboard/
  }
});

console.log(result.log);
```

## 🧪 Testing

Run the complete test suite:

```bash
npm test
```

Test categories:
- ✅ CAPTCHA detection and solving
- ✅ OAuth and 2FA flows
- ✅ Form detection and filling
- ✅ Wait strategies (element, text, network)
- ✅ Visual verification (screenshots, element state)
- ✅ Session save/load/restore

Results are saved to `TEST_RESULTS.md`.

## 📊 Performance

| Operation | Average Time | Cost |
|-----------|-------------|------|
| CAPTCHA solve | 20-40s | $0.003 |
| OAuth flow | 3-8s | Free |
| Form fill (10 fields) | 2-5s | Free |
| Smart wait | <1s | Free |
| Screenshot compare | <500ms | Free |

## 🔒 Security Best Practices

### Credential Management
- **Never hardcode** passwords or API keys
- Use environment variables or secure vaults (1Password CLI)
- Rotate credentials regularly
- Use session persistence to minimize credential exposure

### Session Storage
- Sessions stored in `~/.openclaw/browser-sessions/`
- Add to `.gitignore` to prevent commits
- Set appropriate TTLs (default: 24 hours)
- Clean expired sessions regularly

### Rate Limiting
- Respect site rate limits
- Use delays between actions when needed
- Monitor for IP blocks
- Consider using proxies for high-volume automation

### CAPTCHA Services
- Monitor spending limits
- Set budget alerts on service accounts
- Use API keys (not account credentials)
- Check balance regularly: `checkCaptchaBalance()`

## 🛠️ Configuration

Edit `browser-advanced.config.json` to customize behavior:

```json
{
  "captcha": {
    "enabled": true,
    "service": "2captcha",
    "timeout": 120000
  },
  "waits": {
    "defaultTimeout": 30000
  },
  "forms": {
    "retryOnError": true,
    "maxRetries": 3
  }
}
```

## 📝 API Reference

See [SKILL.md](./SKILL.md) for complete API documentation.

### Main Functions

- `solveCaptcha(page, options)` - Solve CAPTCHAs automatically
- `handleOAuth(page, options)` - Handle OAuth flows
- `handle2FA(page, options)` - Handle 2FA/MFA
- `fillForm(page, data, options)` - Fill forms intelligently
- `waitFor.smart(page, options)` - Smart waiting with multiple conditions
- `verifyVisual.compare(page, baseline, options)` - Compare screenshots
- `saveSession(page, name)` - Save authenticated session
- `loadSession(page, name)` - Restore session

## 🐛 Troubleshooting

### CAPTCHA not solving
1. Check API key: `curl https://2captcha.com/res.php?key=YOUR_KEY&action=getbalance`
2. Verify balance is sufficient
3. Increase timeout (some CAPTCHAs take 60-120s)
4. Enable debug mode: `{ debug: true }`

### Form fields not filling
1. Enable debug: `fillForm(page, data, { debug: true })`
2. Check field selectors match
3. Add custom mappings: `{ customMappings: { 'unusual-field-name': 'email' } }`
4. Try slower typing: `{ typeDelay: 100 }`

### Authentication failing
1. Verify credentials are correct
2. Enable headless mode: `BROWSER_HEADLESS=false` to watch
3. Check for additional verification steps
4. Test TOTP generation: `node -e "console.log(require('speakeasy').totp({ secret: 'YOUR_SECRET' }))"`

### Wait timeouts
1. Increase timeout: `{ timeout: 60000 }`
2. Use smarter waits: `waitFor.smart()`
3. Check if element is in iframe
4. Verify selector with DevTools

## 📚 Examples

See `examples/` directory for complete working examples:
- `signup-flow.js` - Complete signup with CAPTCHA
- `oauth-login.js` - OAuth authentication
- `form-automation.js` - Complex form filling
- `session-reuse.js` - Session persistence

## 🗺️ Roadmap

Future enhancements:
- [ ] Proxy rotation support
- [ ] Mobile device emulation
- [ ] A/B test detection
- [ ] reCAPTCHA v4 support
- [ ] ML-based field detection
- [ ] Video recording
- [ ] Performance tracing

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please see CONTRIBUTING.md for guidelines.

## 📬 Support

- **Issues:** Create an issue in the OpenClaw repository
- **Documentation:** See SKILL.md for detailed docs
- **Examples:** Check the examples/ directory

---

**Built with ❤️ for the OpenClaw project**
