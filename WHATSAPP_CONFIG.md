# WhatsApp Configuration

**Last Updated:** 2026-02-13 09:36 GMT-7

## My WhatsApp Identity

**My Number:** +526242640093  
**JID:** 5216242640093:5@s.whatsapp.net  
**Status:** ✅ Connected and operational

## Authorized Users (Allowlist)

**Owner:**
- Shawn Dunn: +17204873360

**Co-user (Family):**
- Rachael Dunn: +17205252675

## Configuration

**Location:** `~/.openclaw/openclaw.json`

**Channel Settings:**
```json
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "allowlist",
      "selfChatMode": false,
      "allowFrom": [
        "+17204873360",
        "+17205252675"
      ],
      "groupPolicy": "allowlist",
      "mediaMaxMb": 50,
      "debounceMs": 0
    }
  }
}
```

**Elevated Tools Access:**
```json
{
  "tools": {
    "elevated": {
      "enabled": true,
      "allowFrom": {
        "whatsapp": [
          "+17204873360",
          "+17205252675"
        ]
      }
    }
  }
}
```

## Usage

**Sending Messages:**
```javascript
// Using message() tool
message({
  action: "send",
  channel: "whatsapp",
  target: "+17204873360",
  message: "Your message here"
})
```

**Capabilities:**
- ✅ Send text messages
- ✅ Receive messages from allowlist
- ✅ Media sharing (50MB max)
- ✅ Zero debounce (instant response)
- ✅ Elevated command execution (owner only)
- ✅ DM-only (self-chat disabled)

## Verification

**Gateway Status:**
```bash
openclaw gateway status
# Should show: WhatsApp: linked (auth age Xm)
# Should show: Web Channel: +5216242640093
```

**Doctor Check:**
```bash
openclaw doctor
# Verifies WhatsApp connection and configuration
```

## Notes

- Number is Mexico-based (+52 country code)
- 624 area code (Baja California Sur)
- Configured for personal/family use only (allowlist policy)
- All messages logged to session history
- Gateway restart preserves WhatsApp session
