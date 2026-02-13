/**
 * Smart Waiting Strategies
 * Intelligent wait conditions for reliable browser automation
 */

/**
 * Wait for element to appear
 */
async function element(page, selector, options = {}) {
  const { timeout = 30000, state = 'visible' } = options;
  
  try {
    await page.waitForSelector(selector, {
      timeout,
      state
    });
    return await page.$(selector);
  } catch (error) {
    throw new Error(`Element not found: ${selector} (timeout: ${timeout}ms)`);
  }
}

/**
 * Wait for element to disappear
 */
async function elementGone(page, selector, options = {}) {
  const { timeout = 30000 } = options;
  
  try {
    await page.waitForSelector(selector, {
      timeout,
      state: 'hidden'
    });
    return true;
  } catch (error) {
    throw new Error(`Element still visible: ${selector} (timeout: ${timeout}ms)`);
  }
}

/**
 * Wait for specific text to appear on page
 */
async function text(page, textContent, options = {}) {
  const { timeout = 30000, exact = false } = options;
  
  try {
    if (exact) {
      await page.waitForSelector(`text="${textContent}"`, { timeout });
    } else {
      await page.waitForSelector(`text=${textContent}`, { timeout });
    }
    return true;
  } catch (error) {
    throw new Error(`Text not found: "${textContent}" (timeout: ${timeout}ms)`);
  }
}

/**
 * Wait for text to disappear
 */
async function textGone(page, textContent, options = {}) {
  const { timeout = 30000, pollInterval = 500 } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const hasText = await page.evaluate((text) => {
      return document.body.innerText.includes(text);
    }, textContent);
    
    if (!hasText) {
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`Text still present: "${textContent}" (timeout: ${timeout}ms)`);
}

/**
 * Wait for network to be idle
 * Useful after form submissions or navigation
 */
async function networkIdle(page, options = {}) {
  const {
    timeout = 30000,
    idleTime = 2000, // Consider idle after 2s with no requests
    maxInflight = 0 // Max number of inflight requests
  } = options;
  
  try {
    await page.waitForLoadState('networkidle', { timeout });
    return true;
  } catch (error) {
    // Fallback: manual tracking
    let inflightRequests = 0;
    let lastActivity = Date.now();
    
    const requestHandler = () => {
      inflightRequests++;
      lastActivity = Date.now();
    };
    
    const responseHandler = () => {
      inflightRequests--;
      lastActivity = Date.now();
    };
    
    page.on('request', requestHandler);
    page.on('response', responseHandler);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (inflightRequests <= maxInflight && Date.now() - lastActivity >= idleTime) {
        page.off('request', requestHandler);
        page.off('response', responseHandler);
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    page.off('request', requestHandler);
    page.off('response', responseHandler);
    throw new Error(`Network not idle (timeout: ${timeout}ms, inflight: ${inflightRequests})`);
  }
}

/**
 * Wait for navigation to complete
 */
async function navigation(page, options = {}) {
  const { timeout = 30000, waitUntil = 'load' } = options;
  
  try {
    await page.waitForNavigation({
      timeout,
      waitUntil
    });
    return true;
  } catch (error) {
    throw new Error(`Navigation timeout (${timeout}ms)`);
  }
}

/**
 * Wait for URL to match pattern
 */
async function urlPattern(page, pattern, options = {}) {
  const { timeout = 30000, pollInterval = 500 } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const currentUrl = page.url();
    
    if (pattern instanceof RegExp) {
      if (pattern.test(currentUrl)) {
        return currentUrl;
      }
    } else if (typeof pattern === 'string') {
      if (currentUrl.includes(pattern)) {
        return currentUrl;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`URL did not match pattern: ${pattern} (timeout: ${timeout}ms)`);
}

/**
 * Wait for URL to change from current
 */
async function urlChange(page, newPattern, options = {}) {
  const { timeout = 30000 } = options;
  const initialUrl = page.url();
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const currentUrl = page.url();
    
    if (currentUrl !== initialUrl) {
      // If pattern provided, check it matches
      if (newPattern) {
        if (newPattern instanceof RegExp && newPattern.test(currentUrl)) {
          return currentUrl;
        } else if (typeof newPattern === 'string' && currentUrl.includes(newPattern)) {
          return currentUrl;
        }
      } else {
        // No pattern - any change is good
        return currentUrl;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`URL did not change (timeout: ${timeout}ms)`);
}

/**
 * Wait for custom condition function to return true
 */
async function condition(page, conditionFn, options = {}) {
  const { timeout = 30000, pollInterval = 500, args = [] } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await page.evaluate(conditionFn, ...args);
    
    if (result) {
      return result;
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`Condition not met (timeout: ${timeout}ms)`);
}

/**
 * Wait for element count to match
 */
async function elementCount(page, selector, count, options = {}) {
  const { timeout = 30000, pollInterval = 500 } = options;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const elements = await page.$$(selector);
    
    if (elements.length === count) {
      return elements;
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`Element count mismatch for "${selector}". Expected: ${count} (timeout: ${timeout}ms)`);
}

/**
 * Smart wait - tries multiple strategies in parallel
 * Returns as soon as ANY condition is met
 */
async function smart(page, options = {}) {
  const {
    element: elementSelector,
    text: textContent,
    networkIdle: waitNetworkIdle,
    urlPattern: urlPatternValue,
    timeout = 30000
  } = options;
  
  const promises = [];
  
  if (elementSelector) {
    promises.push(
      element(page, elementSelector, { timeout }).then(() => ({ type: 'element', value: elementSelector }))
    );
  }
  
  if (textContent) {
    if (Array.isArray(textContent)) {
      // Wait for any of multiple texts
      textContent.forEach(txt => {
        promises.push(
          text(page, txt, { timeout }).then(() => ({ type: 'text', value: txt }))
        );
      });
    } else {
      promises.push(
        text(page, textContent, { timeout }).then(() => ({ type: 'text', value: textContent }))
      );
    }
  }
  
  if (waitNetworkIdle) {
    promises.push(
      networkIdle(page, { timeout }).then(() => ({ type: 'networkIdle' }))
    );
  }
  
  if (urlPatternValue) {
    promises.push(
      urlPattern(page, urlPatternValue, { timeout }).then((url) => ({ type: 'urlPattern', value: url }))
    );
  }
  
  if (promises.length === 0) {
    throw new Error('No wait conditions specified');
  }
  
  try {
    const result = await Promise.race(promises);
    console.log(`Smart wait completed: ${result.type}`, result.value || '');
    return result;
  } catch (error) {
    throw new Error(`None of the wait conditions were met (timeout: ${timeout}ms)`);
  }
}

/**
 * Retry an action with exponential backoff
 */
async function retry(actionFn, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential', // 'exponential' or 'linear'
    onRetry = null
  } = options;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await actionFn();
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt < maxAttempts) {
        const waitTime = backoff === 'exponential' ? delay * Math.pow(2, attempt - 1) : delay * attempt;
        
        if (onRetry) {
          onRetry(attempt, maxAttempts, error, waitTime);
        }
        
        console.log(`Retry ${attempt}/${maxAttempts} failed. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Action failed after ${maxAttempts} attempts. Last error: ${lastError.message}`);
}

/**
 * Wait for animation to complete
 * Useful for CSS transitions/animations
 */
async function animation(page, selector, options = {}) {
  const { timeout = 5000 } = options;
  
  await page.waitForFunction(
    (sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;
      
      const styles = window.getComputedStyle(element);
      const animationDuration = parseFloat(styles.animationDuration || '0');
      const transitionDuration = parseFloat(styles.transitionDuration || '0');
      
      // If no animation/transition, consider it done
      if (animationDuration === 0 && transitionDuration === 0) {
        return true;
      }
      
      // Check if animation is running
      const isAnimating = styles.animationPlayState === 'running';
      return !isAnimating;
    },
    selector,
    { timeout }
  );
}

/**
 * Wait with progress indicator
 * Logs progress every interval
 */
async function withProgress(waitFn, message, options = {}) {
  const { progressInterval = 5000 } = options;
  
  let progressTimer;
  let elapsed = 0;
  
  progressTimer = setInterval(() => {
    elapsed += progressInterval;
    console.log(`${message}... (${elapsed / 1000}s)`);
  }, progressInterval);
  
  try {
    const result = await waitFn();
    clearInterval(progressTimer);
    console.log(`${message} ✓ (${elapsed / 1000}s)`);
    return result;
  } catch (error) {
    clearInterval(progressTimer);
    console.log(`${message} ✗ (${elapsed / 1000}s)`);
    throw error;
  }
}

module.exports = {
  element,
  elementGone,
  text,
  textGone,
  networkIdle,
  navigation,
  urlPattern,
  urlChange,
  condition,
  elementCount,
  smart,
  retry,
  animation,
  withProgress
};

// Export as waitFor object for cleaner imports
const waitFor = module.exports;
module.exports = { waitFor };
