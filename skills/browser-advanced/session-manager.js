/**
 * Session Manager - Cookie & Auth State Persistence
 * Save and restore browser sessions across runs
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Default session directory
const SESSION_DIR = path.join(os.homedir(), '.openclaw', 'browser-sessions');

/**
 * Ensure session directory exists
 */
async function ensureSessionDir() {
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
  } catch (error) {
    // Ignore if already exists
  }
}

/**
 * Save current browser session
 */
async function saveSession(page, sessionName, options = {}) {
  const {
    includeLocalStorage = true,
    includeSessionStorage = true,
    includeCookies = true,
    ttl = 86400000 // 24 hours default
  } = options;
  
  await ensureSessionDir();
  
  const sessionData = {
    name: sessionName,
    url: page.url(),
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl
  };
  
  // Get cookies
  if (includeCookies) {
    sessionData.cookies = await page.context().cookies();
  }
  
  // Get localStorage and sessionStorage
  if (includeLocalStorage || includeSessionStorage) {
    const storage = await page.evaluate((opts) => {
      const data = {};
      
      if (opts.includeLocalStorage) {
        data.localStorage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data.localStorage[key] = localStorage.getItem(key);
        }
      }
      
      if (opts.includeSessionStorage) {
        data.sessionStorage = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          data.sessionStorage[key] = sessionStorage.getItem(key);
        }
      }
      
      return data;
    }, { includeLocalStorage, includeSessionStorage });
    
    sessionData.localStorage = storage.localStorage;
    sessionData.sessionStorage = storage.sessionStorage;
  }
  
  // Save to file
  const sessionPath = path.join(SESSION_DIR, `${sessionName}.json`);
  await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
  
  console.log(`Session saved: ${sessionPath}`);
  
  return {
    success: true,
    path: sessionPath,
    expiresAt: new Date(sessionData.expiresAt).toISOString()
  };
}

/**
 * Load saved browser session
 */
async function loadSession(page, sessionName, options = {}) {
  const {
    navigateToUrl = true,
    checkExpiration = true
  } = options;
  
  const sessionPath = path.join(SESSION_DIR, `${sessionName}.json`);
  
  try {
    const content = await fs.readFile(sessionPath, 'utf-8');
    const sessionData = JSON.parse(content);
    
    // Check expiration
    if (checkExpiration && sessionData.expiresAt < Date.now()) {
      throw new Error(`Session expired on ${new Date(sessionData.expiresAt).toISOString()}`);
    }
    
    // Navigate to saved URL first
    if (navigateToUrl && sessionData.url) {
      await page.goto(sessionData.url, { waitUntil: 'domcontentloaded' });
    }
    
    // Restore cookies
    if (sessionData.cookies) {
      await page.context().addCookies(sessionData.cookies);
    }
    
    // Restore localStorage and sessionStorage
    if (sessionData.localStorage || sessionData.sessionStorage) {
      await page.evaluate((storage) => {
        if (storage.localStorage) {
          Object.keys(storage.localStorage).forEach(key => {
            localStorage.setItem(key, storage.localStorage[key]);
          });
        }
        
        if (storage.sessionStorage) {
          Object.keys(storage.sessionStorage).forEach(key => {
            sessionStorage.setItem(key, storage.sessionStorage[key]);
          });
        }
      }, sessionData);
    }
    
    // Reload page to apply session
    if (navigateToUrl && sessionData.url) {
      await page.reload();
    }
    
    console.log(`Session loaded: ${sessionPath}`);
    
    return {
      success: true,
      name: sessionData.name,
      url: sessionData.url,
      savedAt: new Date(sessionData.timestamp).toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete saved session
 */
async function deleteSession(sessionName) {
  const sessionPath = path.join(SESSION_DIR, `${sessionName}.json`);
  
  try {
    await fs.unlink(sessionPath);
    console.log(`Session deleted: ${sessionPath}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * List all saved sessions
 */
async function listSessions() {
  await ensureSessionDir();
  
  try {
    const files = await fs.readdir(SESSION_DIR);
    const sessions = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(SESSION_DIR, file), 'utf-8');
        const sessionData = JSON.parse(content);
        
        sessions.push({
          name: sessionData.name,
          url: sessionData.url,
          savedAt: new Date(sessionData.timestamp).toISOString(),
          expiresAt: new Date(sessionData.expiresAt).toISOString(),
          expired: sessionData.expiresAt < Date.now()
        });
      }
    }
    
    return sessions;
    
  } catch (error) {
    return [];
  }
}

/**
 * Clean up expired sessions
 */
async function cleanExpiredSessions() {
  const sessions = await listSessions();
  let cleaned = 0;
  
  for (const session of sessions) {
    if (session.expired) {
      await deleteSession(session.name);
      cleaned++;
    }
  }
  
  return { cleaned };
}

/**
 * Export session to another format
 */
async function exportSession(sessionName, format = 'json') {
  const sessionPath = path.join(SESSION_DIR, `${sessionName}.json`);
  const content = await fs.readFile(sessionPath, 'utf-8');
  const sessionData = JSON.parse(content);
  
  if (format === 'json') {
    return sessionData;
  } else if (format === 'curl') {
    // Export as curl command with cookies
    const cookies = sessionData.cookies || [];
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    return `curl '${sessionData.url}' \\\n  -H 'Cookie: ${cookieString}'`;
  }
  
  throw new Error(`Unsupported export format: ${format}`);
}

module.exports = {
  saveSession,
  loadSession,
  deleteSession,
  listSessions,
  cleanExpiredSessions,
  exportSession,
  SESSION_DIR
};
