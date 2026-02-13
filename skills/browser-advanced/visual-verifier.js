/**
 * Visual Verifier - Screenshot Comparison & Element Validation
 * Verify UI state through visual checks
 */

const fs = require('fs').promises;
const path = require('path');

// Default screenshot directory
const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');

/**
 * Ensure screenshot directory exists
 */
async function ensureScreenshotDir() {
  try {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    await fs.mkdir(path.join(SCREENSHOT_DIR, 'baselines'), { recursive: true });
    await fs.mkdir(path.join(SCREENSHOT_DIR, 'diffs'), { recursive: true });
  } catch (error) {
    // Ignore if already exists
  }
}

/**
 * Save baseline screenshot
 */
async function saveBaseline(page, name, options = {}) {
  const {
    fullPage = false,
    element: elementSelector = null
  } = options;
  
  await ensureScreenshotDir();
  
  const baselinePath = path.join(SCREENSHOT_DIR, 'baselines', `${name}.png`);
  
  const screenshotOptions = {
    path: baselinePath,
    fullPage
  };
  
  if (elementSelector) {
    const element = await page.$(elementSelector);
    if (!element) {
      throw new Error(`Element not found: ${elementSelector}`);
    }
    await element.screenshot({ path: baselinePath });
  } else {
    await page.screenshot(screenshotOptions);
  }
  
  console.log(`Baseline saved: ${baselinePath}`);
  
  return {
    success: true,
    path: baselinePath
  };
}

/**
 * Compare current page to baseline
 * Note: For production use, integrate pixelmatch or similar library
 */
async function compare(page, baselineName, options = {}) {
  const {
    threshold = 0.02, // 2% difference allowed
    element: elementSelector = null,
    fullPage = false
  } = options;
  
  await ensureScreenshotDir();
  
  const baselinePath = path.join(SCREENSHOT_DIR, 'baselines', `${baselineName}.png`);
  const currentPath = path.join(SCREENSHOT_DIR, `${baselineName}-current.png`);
  const diffPath = path.join(SCREENSHOT_DIR, 'diffs', `${baselineName}-diff.png`);
  
  // Check if baseline exists
  try {
    await fs.access(baselinePath);
  } catch (error) {
    return {
      success: false,
      error: 'Baseline not found. Use saveBaseline() first.'
    };
  }
  
  // Take current screenshot
  if (elementSelector) {
    const element = await page.$(elementSelector);
    if (!element) {
      throw new Error(`Element not found: ${elementSelector}`);
    }
    await element.screenshot({ path: currentPath });
  } else {
    await page.screenshot({ path: currentPath, fullPage });
  }
  
  // Simple comparison: file size difference (basic approach)
  // For production, use pixelmatch or Playwright's built-in comparison
  const baselineStats = await fs.stat(baselinePath);
  const currentStats = await fs.stat(currentPath);
  
  const sizeDiff = Math.abs(baselineStats.size - currentStats.size) / baselineStats.size;
  
  const match = sizeDiff <= threshold;
  
  return {
    match,
    diff: sizeDiff,
    threshold,
    baselinePath,
    currentPath,
    diffPath: match ? null : diffPath
  };
}

/**
 * Verify element state
 */
async function elementState(page, selector, expectedState = {}) {
  const element = await page.$(selector);
  
  if (!element) {
    return {
      valid: false,
      error: `Element not found: ${selector}`
    };
  }
  
  const actualState = await page.evaluate(({ sel, expected }) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    
    const state = {};
    
    // Check visibility
    if ('visible' in expected) {
      const rect = el.getBoundingClientRect();
      state.visible = rect.width > 0 && rect.height > 0 && 
                     window.getComputedStyle(el).visibility !== 'hidden' &&
                     window.getComputedStyle(el).display !== 'none';
    }
    
    // Check enabled/disabled
    if ('enabled' in expected) {
      state.enabled = !el.disabled && !el.hasAttribute('aria-disabled');
    }
    
    // Check text content
    if ('text' in expected) {
      state.text = el.textContent.trim();
    }
    
    // Check value
    if ('value' in expected) {
      state.value = el.value;
    }
    
    // Check class
    if ('className' in expected) {
      state.className = el.className;
    }
    
    // Check attributes
    if ('attributes' in expected) {
      state.attributes = {};
      Object.keys(expected.attributes).forEach(attr => {
        state.attributes[attr] = el.getAttribute(attr);
      });
    }
    
    return state;
  }, { sel: selector, expected: expectedState });
  
  if (!actualState) {
    return {
      valid: false,
      error: 'Element disappeared during check'
    };
  }
  
  // Compare states
  const errors = [];
  
  for (const [key, expectedValue] of Object.entries(expectedState)) {
    if (key === 'attributes') {
      for (const [attr, val] of Object.entries(expectedValue)) {
        if (actualState.attributes[attr] !== val) {
          errors.push(`Attribute ${attr}: expected "${val}", got "${actualState.attributes[attr]}"`);
        }
      }
    } else if (actualState[key] !== expectedValue) {
      errors.push(`${key}: expected "${expectedValue}", got "${actualState[key]}"`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    actualState,
    expectedState
  };
}

/**
 * Verify element bounds (position & size)
 */
async function elementBounds(page, selector, expectedBounds = {}) {
  const element = await page.$(selector);
  
  if (!element) {
    return {
      valid: false,
      error: `Element not found: ${selector}`
    };
  }
  
  const bounds = await element.boundingBox();
  
  if (!bounds) {
    return {
      valid: false,
      error: 'Element has no bounding box (may be hidden)'
    };
  }
  
  const errors = [];
  
  // Check x position
  if (expectedBounds.x) {
    if (expectedBounds.x.min !== undefined && bounds.x < expectedBounds.x.min) {
      errors.push(`x: ${bounds.x} < minimum ${expectedBounds.x.min}`);
    }
    if (expectedBounds.x.max !== undefined && bounds.x > expectedBounds.x.max) {
      errors.push(`x: ${bounds.x} > maximum ${expectedBounds.x.max}`);
    }
  }
  
  // Check y position
  if (expectedBounds.y) {
    if (expectedBounds.y.min !== undefined && bounds.y < expectedBounds.y.min) {
      errors.push(`y: ${bounds.y} < minimum ${expectedBounds.y.min}`);
    }
    if (expectedBounds.y.max !== undefined && bounds.y > expectedBounds.y.max) {
      errors.push(`y: ${bounds.y} > maximum ${expectedBounds.y.max}`);
    }
  }
  
  // Check width
  if (expectedBounds.width) {
    if (expectedBounds.width.min !== undefined && bounds.width < expectedBounds.width.min) {
      errors.push(`width: ${bounds.width} < minimum ${expectedBounds.width.min}`);
    }
    if (expectedBounds.width.max !== undefined && bounds.width > expectedBounds.width.max) {
      errors.push(`width: ${bounds.width} > maximum ${expectedBounds.width.max}`);
    }
  }
  
  // Check height
  if (expectedBounds.height) {
    if (expectedBounds.height.min !== undefined && bounds.height < expectedBounds.height.min) {
      errors.push(`height: ${bounds.height} < minimum ${expectedBounds.height.min}`);
    }
    if (expectedBounds.height.max !== undefined && bounds.height > expectedBounds.height.max) {
      errors.push(`height: ${bounds.height} > maximum ${expectedBounds.height.max}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    actualBounds: bounds,
    expectedBounds
  };
}

/**
 * Verify responsive behavior
 * Tests element at different viewport sizes
 */
async function responsive(page, selector, breakpoints = {}) {
  const results = {};
  
  const defaultBreakpoints = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 },
    ...breakpoints
  };
  
  for (const [name, viewport] of Object.entries(defaultBreakpoints)) {
    // Set viewport size
    await page.setViewportSize(viewport);
    
    // Wait for any animations to complete
    await page.waitForTimeout(500);
    
    // Check element state
    const element = await page.$(selector);
    
    if (!element) {
      results[name] = {
        error: 'Element not found'
      };
      continue;
    }
    
    const state = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      
      return {
        visible: rect.width > 0 && rect.height > 0 && 
                styles.visibility !== 'hidden' && 
                styles.display !== 'none',
        width: rect.width,
        height: rect.height,
        display: styles.display
      };
    }, selector);
    
    results[name] = state;
  }
  
  return results;
}

/**
 * Take screenshot for debugging
 */
async function debugScreenshot(page, name, options = {}) {
  await ensureScreenshotDir();
  
  const timestamp = Date.now();
  const filename = `${name}-${timestamp}.png`;
  const screenshotPath = path.join(SCREENSHOT_DIR, filename);
  
  await page.screenshot({
    path: screenshotPath,
    fullPage: options.fullPage || false
  });
  
  console.log(`Debug screenshot saved: ${screenshotPath}`);
  
  return {
    path: screenshotPath,
    timestamp
  };
}

module.exports = {
  saveBaseline,
  compare,
  elementState,
  elementBounds,
  responsive,
  debugScreenshot,
  SCREENSHOT_DIR
};

// Export as verifyVisual object
const verifyVisual = module.exports;
module.exports = { verifyVisual };
