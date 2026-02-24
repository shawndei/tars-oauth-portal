// TARS Companion Service Worker v2.0.0
// Enhanced with auto-setup support

const CACHE_NAME = 'tars-companion-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/install.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

// Install event - cache all assets
self.addEventListener('install', event => {
  console.log('[SW] Installing v2.0.0');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating v2.0.0');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response for caching
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Background sync
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
  
  if (event.tag === 'initial-sync') {
    event.waitUntil(initialSync());
  }
});

// Sync data function
async function syncData() {
  console.log('[SW] Syncing data...');
  
  try {
    // Get stored sync queue
    const cache = await caches.open('tars-sync-queue');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const cachedResponse = await cache.match(request);
        const data = await cachedResponse.json();
        
        // Attempt to sync
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          // Remove from queue on success
          await cache.delete(request);
        }
      } catch (e) {
        console.log('[SW] Sync item failed:', e);
      }
    }
    
    // Notify clients of sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE', timestamp: Date.now() });
    });
    
  } catch (e) {
    console.error('[SW] Sync error:', e);
  }
}

// Initial sync for new installations
async function initialSync() {
  console.log('[SW] Running initial sync...');
  
  try {
    // Notify clients that initial sync started
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'INITIAL_SYNC_START' });
    });
    
    // Perform initial sync steps
    const steps = ['connect', 'calendar', 'location', 'settings'];
    
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 500));
      
      clients.forEach(client => {
        client.postMessage({ type: 'INITIAL_SYNC_STEP', step });
      });
    }
    
    // Complete
    clients.forEach(client => {
      client.postMessage({ type: 'INITIAL_SYNC_COMPLETE' });
    });
    
  } catch (e) {
    console.error('[SW] Initial sync error:', e);
  }
}

// Periodic sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'auto-sync') {
    event.waitUntil(syncData());
  }
});

// Push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push received');
  
  const data = event.data?.json() || {};
  const title = data.title || 'TARS Companion';
  const options = {
    body: data.body || 'New update available',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-72.svg',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const action = event.action;
  
  if (action === 'dismiss') {
    return;
  }
  
  // Default: open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Check if app is already open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Message handler (from main app)
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'QUEUE_SYNC') {
    // Add to sync queue
    caches.open('tars-sync-queue').then(cache => {
      const request = new Request(`/sync-queue/${Date.now()}`);
      cache.put(request, new Response(JSON.stringify(event.data.payload)));
    });
    
    // Request background sync
    self.registration.sync.register('sync-data').catch(() => {
      // Background sync not supported, sync now
      syncData();
    });
  }
  
  if (event.data.type === 'TRIGGER_INITIAL_SYNC') {
    self.registration.sync.register('initial-sync').catch(() => {
      initialSync();
    });
  }
});

console.log('[SW] Service Worker loaded v2.0.0');
