/**
 * CAPTCHA Solver - 2Captcha & AntiCaptcha Integration
 * Automatically detects and solves CAPTCHAs on web pages
 */

const axios = require('axios');

// CAPTCHA service endpoints
const SERVICES = {
  '2captcha': {
    submitUrl: 'https://2captcha.com/in.php',
    resultUrl: 'https://2captcha.com/res.php',
    cost: 0.003 // per solve
  },
  'anticaptcha': {
    submitUrl: 'https://api.anti-captcha.com/createTask',
    resultUrl: 'https://api.anti-captcha.com/getTaskResult',
    cost: 0.003
  }
};

/**
 * Detect CAPTCHA type on current page
 */
async function detectCaptcha(page) {
  return await page.evaluate(() => {
    // Check for reCAPTCHA v2
    const recaptchaV2 = document.querySelector('.g-recaptcha, iframe[src*="google.com/recaptcha"]');
    if (recaptchaV2) {
      const sitekey = recaptchaV2.getAttribute('data-sitekey') || 
                      document.querySelector('iframe[src*="google.com/recaptcha"]')?.src.match(/k=([^&]+)/)?.[1];
      return { type: 'recaptcha-v2', sitekey, element: 'found' };
    }

    // Check for reCAPTCHA v3 (invisible)
    const scripts = Array.from(document.querySelectorAll('script'));
    const recaptchaV3Script = scripts.find(s => s.src.includes('recaptcha') && s.src.includes('render='));
    if (recaptchaV3Script) {
      const sitekey = recaptchaV3Script.src.match(/render=([^&]+)/)?.[1];
      return { type: 'recaptcha-v3', sitekey };
    }

    // Check for hCaptcha
    const hcaptcha = document.querySelector('.h-captcha, iframe[src*="hcaptcha.com"]');
    if (hcaptcha) {
      const sitekey = hcaptcha.getAttribute('data-sitekey') ||
                      document.querySelector('iframe[src*="hcaptcha.com"]')?.src.match(/sitekey=([^&]+)/)?.[1];
      return { type: 'hcaptcha', sitekey, element: 'found' };
    }

    // Check for image CAPTCHA (generic)
    const imgCaptcha = document.querySelector('img[src*="captcha"], img[alt*="captcha" i]');
    if (imgCaptcha) {
      return { type: 'image', src: imgCaptcha.src };
    }

    return { type: 'none' };
  });
}

/**
 * Solve reCAPTCHA v2 using 2Captcha
 */
async function solveRecaptchaV2(page, sitekey, apiKey, service = '2captcha') {
  const pageUrl = page.url();
  
  if (service === '2captcha') {
    // Submit CAPTCHA to 2Captcha
    const submitResponse = await axios.get(SERVICES['2captcha'].submitUrl, {
      params: {
        key: apiKey,
        method: 'userrecaptcha',
        googlekey: sitekey,
        pageurl: pageUrl,
        json: 1
      }
    });

    if (submitResponse.data.status !== 1) {
      throw new Error(`2Captcha submit failed: ${submitResponse.data.request}`);
    }

    const captchaId = submitResponse.data.request;

    // Poll for result (typically takes 20-40 seconds)
    let attempts = 0;
    const maxAttempts = 40; // 40 * 3s = 2 minutes

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s between polls

      const resultResponse = await axios.get(SERVICES['2captcha'].resultUrl, {
        params: {
          key: apiKey,
          action: 'get',
          id: captchaId,
          json: 1
        }
      });

      if (resultResponse.data.status === 1) {
        // Success! Got the token
        return {
          success: true,
          token: resultResponse.data.request,
          cost: SERVICES['2captcha'].cost
        };
      }

      if (resultResponse.data.request !== 'CAPCHA_NOT_READY') {
        throw new Error(`2Captcha solve failed: ${resultResponse.data.request}`);
      }

      attempts++;
    }

    throw new Error('2Captcha timeout: CAPTCHA not solved within 2 minutes');
  }

  throw new Error(`Unsupported service: ${service}`);
}

/**
 * Solve hCaptcha using 2Captcha
 */
async function solveHCaptcha(page, sitekey, apiKey, service = '2captcha') {
  const pageUrl = page.url();
  
  if (service === '2captcha') {
    const submitResponse = await axios.get(SERVICES['2captcha'].submitUrl, {
      params: {
        key: apiKey,
        method: 'hcaptcha',
        sitekey: sitekey,
        pageurl: pageUrl,
        json: 1
      }
    });

    if (submitResponse.data.status !== 1) {
      throw new Error(`2Captcha hCaptcha submit failed: ${submitResponse.data.request}`);
    }

    const captchaId = submitResponse.data.request;
    let attempts = 0;
    const maxAttempts = 40;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const resultResponse = await axios.get(SERVICES['2captcha'].resultUrl, {
        params: {
          key: apiKey,
          action: 'get',
          id: captchaId,
          json: 1
        }
      });

      if (resultResponse.data.status === 1) {
        return {
          success: true,
          token: resultResponse.data.request,
          cost: SERVICES['2captcha'].cost
        };
      }

      if (resultResponse.data.request !== 'CAPCHA_NOT_READY') {
        throw new Error(`2Captcha hCaptcha failed: ${resultResponse.data.request}`);
      }

      attempts++;
    }

    throw new Error('2Captcha hCaptcha timeout');
  }

  throw new Error(`Unsupported service: ${service}`);
}

/**
 * Inject CAPTCHA token into page
 */
async function injectToken(page, token, captchaType) {
  if (captchaType === 'recaptcha-v2') {
    await page.evaluate((token) => {
      // Set the response token
      document.getElementById('g-recaptcha-response').innerHTML = token;
      
      // Trigger callback if exists
      if (typeof window.___grecaptcha_cfg !== 'undefined') {
        const clients = window.___grecaptcha_cfg.clients;
        for (const clientId in clients) {
          const client = clients[clientId];
          if (client && client.callback) {
            client.callback(token);
          }
        }
      }
    }, token);
  } else if (captchaType === 'hcaptcha') {
    await page.evaluate((token) => {
      const textarea = document.querySelector('textarea[name="h-captcha-response"]');
      if (textarea) {
        textarea.innerHTML = token;
      }
      
      // Trigger hCaptcha callback
      if (typeof window.hcaptcha !== 'undefined') {
        window.hcaptcha.setResponse(token);
      }
    }, token);
  }
}

/**
 * Main CAPTCHA solver function
 * Auto-detects CAPTCHA type and solves it
 */
async function solveCaptcha(page, options = {}) {
  const {
    service = '2captcha',
    apiKey = process.env.CAPTCHA_2CAPTCHA_KEY,
    type = 'auto',
    timeout = 120000,
    autoInject = true
  } = options;

  if (!apiKey) {
    throw new Error('CAPTCHA API key not provided. Set CAPTCHA_2CAPTCHA_KEY environment variable.');
  }

  let captchaInfo;

  if (type === 'auto') {
    // Auto-detect CAPTCHA type
    captchaInfo = await detectCaptcha(page);
    
    if (captchaInfo.type === 'none') {
      return { success: false, error: 'No CAPTCHA detected on page' };
    }
  } else {
    // Manual type specification
    captchaInfo = { type };
  }

  console.log(`Detected CAPTCHA type: ${captchaInfo.type}`);

  let result;

  try {
    if (captchaInfo.type === 'recaptcha-v2') {
      result = await solveRecaptchaV2(page, captchaInfo.sitekey, apiKey, service);
    } else if (captchaInfo.type === 'hcaptcha') {
      result = await solveHCaptcha(page, captchaInfo.sitekey, apiKey, service);
    } else {
      return { success: false, error: `Unsupported CAPTCHA type: ${captchaInfo.type}` };
    }

    // Inject token into page if autoInject is enabled
    if (autoInject && result.success) {
      await injectToken(page, result.token, captchaInfo.type);
      console.log('CAPTCHA token injected successfully');
    }

    return result;

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check 2Captcha balance
 */
async function checkBalance(apiKey = process.env.CAPTCHA_2CAPTCHA_KEY) {
  try {
    const response = await axios.get(SERVICES['2captcha'].resultUrl, {
      params: {
        key: apiKey,
        action: 'getbalance',
        json: 1
      }
    });

    if (response.data.status === 1) {
      return {
        balance: parseFloat(response.data.request),
        currency: 'USD'
      };
    } else {
      throw new Error(response.data.request);
    }
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = {
  solveCaptcha,
  detectCaptcha,
  solveRecaptchaV2,
  solveHCaptcha,
  injectToken,
  checkBalance
};
