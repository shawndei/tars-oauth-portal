# TARS iOS Companion - Technical Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TARS iOS Companion                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Install   │ -> │   Setup     │ -> │  Dashboard  │    │
│  │   Page      │    │   Wizard    │    │             │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│         │                  │                  │            │
│         v                  v                  v            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Service Worker (sw.js)                  │  │
│  │  - Offline caching                                   │  │
│  │  - Background sync                                   │  │
│  │  - Push notifications                                │  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                               │
│                           v                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              TARS Backend API                        │  │
│  │  - Data sync                                         │  │
│  │  - User preferences                                  │  │
│  │  - Push subscription                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## PWA Installation Detection

### Display Mode Detection
```javascript
// Check if running as installed PWA
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                    window.navigator.standalone === true;
```

### First Run Detection
```javascript
const isFirstRun = !localStorage.getItem('tars_setup_complete');
```

### iOS Detection
```javascript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
```

## Auto-Setup Flow

```
User clicks install link
         │
         v
┌─────────────────────┐
│  Install Page       │  (install.html)
│  - Shortcut link    │
│  - Manual guide     │
│  - QR code          │
└─────────────────────┘
         │
         v (User adds to home screen)
┌─────────────────────┐
│  PWA Opens          │  (index.html)
│  - Detects install  │
│  - Checks first run │
└─────────────────────┘
         │
         v (First run detected)
┌─────────────────────┐
│  Setup Wizard       │
│  Step 1: Welcome    │
│  Step 2: Permissions│
│  Step 3: Sync Config│
│  Step 4: Initial Sync│
│  Step 5: Complete   │
└─────────────────────┘
         │
         v
┌─────────────────────┐
│  Dashboard          │
│  - Auto-sync active │
│  - Data displayed   │
└─────────────────────┘
```

## Files Structure

```
tars-ios-companion/
├── index.html                    # Main PWA with setup wizard
├── install.html                  # Installation landing page
├── manifest.json                 # PWA manifest
├── sw.js                         # Service worker
├── _headers                      # CloudFlare headers
├── tars-shortcut-definition.json # iOS Shortcut JSON definition
├── .well-known/
│   └── apple-app-site-association # Universal links config
├── icons/
│   └── *.svg                     # App icons
├── TARS_iOS_AUTO_INSTALL_GUIDE.md    # User guide
└── TARS_iOS_AUTO_SETUP_TECHNICAL.md  # This file
```

## iOS Shortcut Integration

### Shortcut Definition (JSON)
The `tars-shortcut-definition.json` file contains:

1. **Show Welcome Message** - Explains what will happen
2. **Open URL** - Opens PWA with `?action=setup` parameter
3. **Show Instructions** - Guides user to add to home screen
4. **Wait to Return** - Pauses until user returns
5. **Show Completion** - Confirms installation

### Converting to .shortcut File
The JSON definition can be imported using:
- **Shortcuts app** on iOS (manual creation)
- **Third-party tools** that convert JSON to .shortcut
- **iCloud link** for sharing

### Hosting the Shortcut
Options:
1. **iCloud Links** - `https://www.icloud.com/shortcuts/[SHORTCUT_ID]`
2. **Direct Download** - Host .shortcut file
3. **Shortcuts Gallery** - Submit to Apple

## Universal Links Configuration

### apple-app-site-association
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.tars.companion",
        "paths": ["/install", "/setup", "/open", "/*"]
      }
    ]
  }
}
```

**Note:** Universal links require:
- HTTPS domain
- Valid SSL certificate
- File served with `application/json` content type
- File at `/.well-known/apple-app-site-association`

For PWA (no native app), universal links redirect to web app.

## Auto-Sync Implementation

### Sync Intervals
```javascript
const CONFIG = {
  syncIntervals: {
    realtime: 1000,      // 1 second
    '5min': 300000,      // 5 minutes
    manual: null         // No auto-sync
  }
};
```

### Background Sync (Service Worker)
```javascript
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});
```

### Visibility-Based Sync
```javascript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isStandalone && !isFirstRun) {
    onAppOpen(); // Triggers sync
  }
});
```

## Permission Handling

### Location
```javascript
async function requestLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Store location
        localStorage.setItem('tars_location', JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: Date.now()
        }));
      },
      (error) => { /* Handle denial */ }
    );
  }
}
```

### Notifications
```javascript
async function requestNotifications() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      subscribeToPush();
    }
  }
}
```

## Local Storage Schema

```javascript
// Setup state
localStorage.setItem('tars_setup_complete', 'true');
localStorage.setItem('tars_setup_date', Date.now().toString());
localStorage.setItem('tars_setup_state', JSON.stringify({
  locationGranted: true,
  notificationsGranted: true,
  syncInterval: '5min',
  initialSyncComplete: true
}));

// Sync preferences
localStorage.setItem('auto_sync_enabled', 'true');
localStorage.setItem('tars_sync_interval', '5min');

// Location cache
localStorage.setItem('tars_location', JSON.stringify({
  lat: 40.7128,
  lng: -74.0060,
  timestamp: 1677654321000
}));
```

## CloudFlare Deployment

### _headers File
```
/*
  Access-Control-Allow-Origin: *
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff

/.well-known/apple-app-site-association
  Content-Type: application/json
```

### Deploy Command
```bash
# Using Wrangler
wrangler pages deploy tars-ios-companion --project-name=tars-companion

# Or via CloudFlare Dashboard
# Upload files to Pages project
```

## Testing Checklist

### Installation Flow
- [ ] Install page loads correctly
- [ ] "Add to Home Screen" prompt shows
- [ ] PWA installs to home screen
- [ ] App opens from home screen
- [ ] Setup wizard appears on first launch

### Setup Wizard
- [ ] All steps navigate correctly
- [ ] Location permission request works
- [ ] Notification permission request works
- [ ] Sync interval selection works
- [ ] Initial sync completes
- [ ] Celebration animation plays

### Dashboard
- [ ] Data cards display
- [ ] Manual sync button works
- [ ] Auto-sync triggers on schedule
- [ ] Activity feed updates
- [ ] Status indicators accurate

### Offline
- [ ] App loads offline
- [ ] Cached data displays
- [ ] Sync queues when offline
- [ ] Syncs when back online

## API Endpoints (Future)

```
POST /api/sync
  - body: { dataType, data, deviceId }
  - response: { success, synced, timestamp }

GET /api/status
  - response: { online, lastSync, dataTypes }

POST /api/push/subscribe
  - body: { subscription, deviceId }
  - response: { success }
```

## Security Considerations

1. **HTTPS Required** - All connections must be HTTPS
2. **CORS Headers** - Properly configured for API calls
3. **No Sensitive Storage** - Don't store passwords/tokens in localStorage
4. **Permission Minimization** - Only request needed permissions
5. **Data Encryption** - Encrypt sensitive data before sync

## Known iOS PWA Limitations

1. **No programmatic install** - Users must manually add to home screen
2. **Limited background execution** - Background sync limited
3. **No app clips for PWA** - Only native apps get app clips
4. **Push notifications** - Require web push, not APNs
5. **No health data access** - HealthKit not available to PWAs

## Future Enhancements

1. **React Native App** - Full native experience
2. **Apple Watch App** - Companion for wrist
3. **Siri Shortcuts** - Voice-activated actions
4. **Widget Support** - iOS home screen widgets
5. **App Clips** - Instant app experiences
