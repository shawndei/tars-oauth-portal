# Security Hardening Skill

**Version:** 1.0.0  
**Status:** Production Ready  
**For:** Shawn's TARS System

## Overview

Comprehensive security hardening system providing production-grade protection against common attack vectors, threat actors, and compliance violations.

## Security Layers

### 1. Input Validation & Sanitization

**Purpose:** Prevent injection attacks and malformed input exploitation.

#### Functions

```typescript
// Validate and sanitize user input
validateInput(input: string, type: 'command' | 'json' | 'sql' | 'html', strict?: boolean): {
  valid: boolean;
  sanitized: string;
  threats: string[];
}

// Command input specific validation
validateCommandInput(cmd: string): {
  valid: boolean;
  sanitized: string;
  injectionRisks: string[];
}

// JSON validation
validateJSON(payload: string): {
  valid: boolean;
  parsed: object;
  violations: string[];
}

// HTML/Markdown safety check
sanitizeMarkdown(content: string): {
  safe: boolean;
  sanitized: string;
  blocked: string[];
}
```

#### Validation Rules

- **Command Input:** Reject pipes, redirects, backticks, $(), &&, ||, semicolons in untrusted input
- **SQL Input:** Parameterized queries only; block UNION, DROP, DELETE patterns
- **JSON:** Size limits (max 10MB); validate schema against whitelist
- **HTML:** Strip script tags, event handlers, iframes; allow only safe tags
- **Paths:** Reject traversal attempts (.., ~/, absolute paths from users)

#### Sanitization Techniques

```
Input Type          | Sanitization Method
--------------------|--------------------
Commands            | Escape special chars, quote args, use execFile not shell
URLs                | URL parse validation, protocol whitelist (http/https)
File paths          | Resolve to absolute, compare against basedir
User text           | Strip control chars, limit length, encode entities
Usernames           | Alphanumeric + underscore only, 3-32 chars
Passwords           | Never log, never echo, min entropy check
API keys            | Redact in logs, rotate on exposure, never in config
Email               | RFC5322 validation, DNS verification available
IP addresses        | CIDR validation, private range detection
```

### 2. Command Injection Prevention

**Purpose:** Secure shell command execution and external process calls.

#### Core Protection

```typescript
// Safe command execution
safeExec(command: string, args: string[], options: ExecOptions): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  securityEvents: AuditLog[];
}>

// Safe shell script execution
safeShellScript(script: string, context: Record<string, any>): Promise<any>

// Command approval workflow
requiresApproval(command: string): boolean
requestApproval(command: string, requester: string): Promise<boolean>
```

#### Protection Mechanisms

1. **Argument Separation**
   - Use `child_process.execFile()` instead of `shell: true`
   - Pass arguments as array, never string concatenation
   - Never interpolate user input into commands

2. **Whitelist Allowed Commands**
   ```json
   {
     "allowedCommands": [
       "git", "npm", "node", "python", "docker",
       "curl", "wget", "openssl", "ssh"
     ],
     "blockedPatterns": [
       "rm -rf", "sudo", ">", "|", "&&", "||", "`", "$("
     ]
   }
   ```

3. **Sandboxing**
   - Run with minimal privileges
   - Set resource limits (CPU, memory, timeout)
   - Isolated working directory
   - Limited environment variables

4. **Timeout Protection**
   - Default 30 seconds per command
   - Kill hanging processes
   - Log timeout incidents

#### Example: Safe vs Unsafe

```typescript
// ❌ UNSAFE
exec(`npm install ${packageName}`);

// ✅ SAFE
execFile('npm', ['install', packageName], {
  timeout: 30000,
  maxBuffer: 10 * 1024 * 1024,
  cwd: '/app'
});
```

### 3. Rate Limiting

**Purpose:** Prevent brute force, DoS, and resource exhaustion.

#### Rate Limiter API

```typescript
// Create rate limiter per user
rateLimiter = new PerUserRateLimiter({
  commands: { requests: 100, window: 60 },  // 100 cmds/min
  api: { requests: 1000, window: 60 },      // 1000 reqs/min
  login: { requests: 5, window: 300 },      // 5 attempts/5min
  dataDump: { requests: 10, window: 3600 }  // 10 dumps/hour
})

// Check limit
canExecute(userId: string, action: string): {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

// Track action
trackAction(userId: string, action: string): void

// Get metrics
getMetrics(userId: string): {
  actions: Record<string, number>;
  window: number;
  exceedances: number;
}
```

#### Rate Limit Tiers

```json
{
  "tiers": {
    "unauthenticated": {
      "commands": 5,
      "apiRequests": 100,
      "window": 3600
    },
    "authenticated": {
      "commands": 100,
      "apiRequests": 10000,
      "dataDump": 100,
      "window": 3600
    },
    "elevated": {
      "commands": 1000,
      "apiRequests": 100000,
      "dataDump": 1000,
      "window": 3600
    },
    "admin": {
      "commands": "unlimited",
      "apiRequests": "unlimited",
      "window": 3600
    }
  }
}
```

#### Behaviors

- **Threshold Hit:** Log incident, notify user, reject additional requests
- **Escalation:** If 3+ hits in 1 hour → require approval for next action
- **Persistent Violators:** Temporary account suspension, security review
- **Pattern Detection:** Flag unusual spike as potential attack

### 4. Authentication Verification

**Purpose:** Ensure only authorized users access system.

#### Verification Layers

```typescript
// Session validation
verifySession(sessionId: string): {
  valid: boolean;
  userId: string;
  roles: string[];
  permissions: string[];
  elevated: boolean;
  expiresAt: Date;
  warnings: string[];
}

// Multi-factor check
requiresMFA(userId: string, action: string): boolean
verifyMFA(userId: string, code: string): {
  success: boolean;
  attempts: number;
  lockedUntil?: Date;
}

// Permission check
hasPermission(userId: string, action: string, resource?: string): boolean

// Elevated mode requirement
requiresElevated(action: string): boolean
verifyElevatedMode(sessionId: string): {
  elevated: boolean;
  expiresAt: Date;
  reason?: string;
}
```

#### Auth Events

```
Event                    | Action
-------------------------|-------------------------------------------
Login attempt            | Validate credentials, enforce rate limits
Failed login (3+)        | Lock account, send alert, require CAPTCHA
MFA failure (5+)         | Temporary suspension, security review
Session timeout          | Force re-authentication
Permission denied        | Log attempt, increase scrutiny of user
Elevated mode request    | Require approval, audit log
Token exposure           | Revoke all sessions, force password reset
```

#### Token Management

- **Lifespan:** 1 hour (rotated every 15 mins)
- **Storage:** Secure http-only cookies, never localStorage
- **Revocation:** Immediate on logout, compromise, policy change
- **Audit:** Every token use logged with IP, user agent

### 5. Sensitive Data Redaction

**Purpose:** Prevent exposure of secrets in logs, errors, responses.

#### Redaction Targets

```typescript
// Automatic redaction patterns
const REDACTION_PATTERNS = {
  apiKeys: /api[_-]?key['":\s=]+([a-zA-Z0-9_\-]{32,})/gi,
  tokens: /(bearer|token)['":\s=]+([a-zA-Z0-9_\-\.]{20,})/gi,
  passwords: /(password|passwd)['":\s=]+([^"'\s]+)/gi,
  secrets: /(secret|private[_-]?key)['":\s=]+([^"'\s]+)/gi,
  dbConnStr: /(postgresql|mysql|mongodb)[:\w]+:\/\/[^\s]+/gi,
  awsKeys: /AKIA[0-9A-Z]{16}/g,
  creditCards: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
  emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  ipAddresses: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
};

// Redact sensitive data
redactSensitiveData(text: string, context?: 'log' | 'error' | 'response'): {
  redacted: string;
  findings: Array<{ type: string; count: number }>;
}

// Selective redaction for authorized users
redactForLevel(text: string, userLevel: 'user' | 'admin' | 'root'): string
```

#### Redaction Rules by Context

```
Context   | Action
----------|-----------------------------------------------------
Logs      | Replace with [REDACTED_TYPE], preserve pattern length
Errors    | Remove sensitive data, show generic message to user
Responses | Exclude secrets entirely, never include in API response
Audit Log | Full data recorded, but restricted access (admins only)
Debug     | User sees [REDACTED]; elevated users see actual value
Backups   | Encrypted separately, rotated keys, immutable
```

#### Sensitive Fields

```json
{
  "alwaysRedact": [
    "password", "passwd", "pwd", "secret", "api_key", "apiKey",
    "token", "auth_token", "access_token", "refresh_token",
    "private_key", "signing_key", "encryption_key",
    "aws_access_key_id", "aws_secret_access_key",
    "database_url", "db_connection_string",
    "stripe_key", "paypal_token", "twilio_auth_token",
    "ssh_key", "gpg_key", "bearer_token",
    "credit_card", "ssn", "social_security",
    "oauth_secret", "session_secret"
  ]
}
```

### 6. Audit Logging

**Purpose:** Track all security-relevant actions for compliance and investigation.

#### Audit Log Schema

```typescript
interface AuditLog {
  timestamp: Date;
  sessionId: string;
  userId: string;
  action: string;
  resource?: string;
  status: 'success' | 'failure' | 'blocked';
  details: {
    input?: string;           // Sanitized
    output?: string;          // Sanitized
    error?: string;           // Sanitized
    ip: string;
    userAgent: string;
    method: string;           // Command, API, GUI
    durationMs: number;
  };
  security: {
    elevated: boolean;
    mfaUsed: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    threats: string[];
    violations: string[];
  };
  context: {
    previousAction?: string;
    failureCount?: number;
    rateLimitStatus?: 'ok' | 'warning' | 'exceeded';
  };
}
```

#### Logged Events

```
Category            | Events
--------------------|--------------------------------------------
Authentication      | Login, logout, failed login, MFA use
Authorization       | Permission check, denied access, privilege escalation attempt
Commands            | Execution, injection attempt, sandbox violation
Data Access         | Read, write, delete, export, dump attempt
Configuration       | Changes, unauthorized read
Threats             | Injection attempt, malware pattern, DoS pattern
System              | Errors, crashes, resource limits, timeouts
Compliance          | Policy violation, audit log access, retention expired
```

#### Retention & Access

- **Retention:** 90 days live, 2 years archived (encrypted)
- **Access:** Only security team + automated analysis, logged separately
- **Immutability:** Write-once, cannot modify historical logs
- **Analysis:** Real-time threat detection against patterns
- **Export:** Quarterly security reports, incident investigation

#### Example Log Entry

```json
{
  "timestamp": "2026-02-13T15:23:45Z",
  "sessionId": "sess_abc123",
  "userId": "user_shawn",
  "action": "execute_command",
  "resource": "npm install",
  "status": "success",
  "details": {
    "input": "npm install [REDACTED_PACKAGE]",
    "ip": "192.168.1.100",
    "userAgent": "TARS/1.0",
    "durationMs": 2345
  },
  "security": {
    "elevated": false,
    "riskLevel": "low",
    "threats": []
  }
}
```

## Threat Detection

### 1. Social Engineering Attempts

**Patterns to Detect:**

```json
{
  "socialEngineeringPatterns": [
    {
      "name": "Credential request",
      "patterns": [
        "enter.*password",
        "verify.*account",
        "confirm.*identity",
        "re-?authenticate"
      ],
      "action": "block",
      "reason": "Potential credential harvesting"
    },
    {
      "name": "Urgency/pressure language",
      "patterns": [
        "immediately",
        "urgent",
        "must.*now",
        "before.*expires?",
        "act.*quick",
        "time.*running.*out"
      ],
      "action": "alert",
      "threshold": 3
    },
    {
      "name": "Authority impersonation",
      "patterns": [
        "from (admin|support|security|cto|cfo)",
        "official.*request",
        "authorized.*personnel",
        "management.*directive"
      ],
      "action": "alert",
      "requiresManualReview": true
    },
    {
      "name": "Suspicious file requests",
      "patterns": [
        "send.*file",
        "upload.*document",
        "share.*folder",
        "forward.*attachment.*to.*external"
      ],
      "action": "block",
      "exceptions": ["approved_recipients"]
    },
    {
      "name": "Permission escalation requests",
      "patterns": [
        "grant.*elevated.*access",
        "make.*admin",
        "promote.*permissions",
        "bypass.*restriction"
      ],
      "action": "alert",
      "requiresApproval": true
    }
  ]
}
```

**Detection Logic:**

```typescript
detectSocialEngineering(input: string, context: SecurityContext): {
  detected: boolean;
  patterns: string[];
  confidence: number;
  recommended: 'alert' | 'block' | 'log';
}
```

### 2. Privilege Escalation Attempts

**Patterns to Detect:**

```json
{
  "privescPatterns": [
    {
      "name": "sudo abuse",
      "patterns": [
        "^sudo\\s",
        "sudo.*-[isuH]",
        "sudo.*-E"
      ],
      "baseline": 0,
      "alert": 1,
      "block": 3
    },
    {
      "name": "setuid/setgid manipulation",
      "patterns": [
        "chmod.*[24][0-7]{3}",
        "setfattr.*cap_",
        "chown.*root"
      ],
      "requiresApproval": true
    },
    {
      "name": "Environment variable injection",
      "patterns": [
        "LD_PRELOAD=",
        "LD_LIBRARY_PATH=",
        "PATH=.*:.*:",
        "PYTHONPATH=.*:.*:"
      ],
      "action": "alert"
    },
    {
      "name": "File permission modification",
      "patterns": [
        "chmod.*000",
        "chmod.*644.*\\.ssh",
        "chmod.*666.*\\/etc\\/"
      ],
      "action": "alert"
    },
    {
      "name": "Capability escalation",
      "patterns": [
        "setcap",
        "getcap",
        "cap_sys_admin",
        "cap_net_admin"
      ],
      "action": "block"
    }
  ]
}
```

### 3. Data Exfiltration Attempts

**Patterns to Detect:**

```json
{
  "exfiltrationPatterns": [
    {
      "name": "Large data dump",
      "detection": "output > 100MB or duration > 60s",
      "action": "alert",
      "threshold": 2
    },
    {
      "name": "Database export",
      "patterns": [
        "mysqldump",
        "pg_dump",
        "mongodump",
        "sqlite.*\\.db",
        "export.*database"
      ],
      "requiresApproval": true,
      "audit": "detailed"
    },
    {
      "name": "External transmission",
      "patterns": [
        "curl.*http",
        "wget.*http",
        "scp.*@",
        "sftp.*@",
        "rsync.*@"
      ],
      "destinations": "check_against_whitelist",
      "externalOnly": "alert"
    },
    {
      "name": "Log/config access",
      "patterns": [
        "cat.*\\/var\\/log",
        "cat.*\\.env",
        "cat.*config",
        "grep.*password",
        "strings.*binary"
      ],
      "action": "alert",
      "requiresElevated": true
    },
    {
      "name": "Multiple file reads",
      "detection": "read_count > 50 in 60s",
      "action": "alert"
    },
    {
      "name": "Archive creation",
      "patterns": [
        "tar.*-czf",
        "zip.*-r",
        "7z.*a",
        "rar.*a"
      ],
      "action": "alert",
      "requiresApproval": true
    },
    {
      "name": "Search for sensitive files",
      "patterns": [
        "find.*-name.*\\*key\\*",
        "find.*-name.*\\*secret\\*",
        "find.*-name.*\\*password\\*",
        "grep.*-r.*api.?key"
      ],
      "action": "alert"
    }
  ]
}
```

**Detection Logic:**

```typescript
detectExfiltration(action: AuditLog, context: SecurityContext): {
  detected: boolean;
  patterns: string[];
  dataVolume: number;
  destination?: string;
  confidence: number;
  action: 'log' | 'alert' | 'block';
}
```

## Elevated Mode Integration

**Purpose:** Require explicit approval for dangerous operations.

```typescript
// Check if action requires elevated mode
requiresElevated(action: string): {
  required: boolean;
  reason: string;
  duration: number;  // Minutes
  approval?: {
    required: boolean;
    approvers: string[];
  };
}

// Request elevated mode
requestElevated(reason: string, duration: number): {
  tokenId: string;
  expiresAt: Date;
  requiresApproval: boolean;
}

// Approve elevated request
approveElevated(tokenId: string, approver: string): {
  approved: boolean;
  expiresAt: Date;
  auditLog: AuditLog;
}

// Verify elevated mode active
isElevated(sessionId: string): boolean
```

**Actions Requiring Elevated:**

- Database modifications (delete, update)
- User account modifications
- Permission changes
- System configuration changes
- Sensitive data export
- Security policy modifications
- Audit log access
- Key rotation

## Implementation Notes

### Dependencies

```json
{
  "rate-limiter": "^2.0.0",
  "helmet": "^7.0.0",
  "joi": "^17.0.0",
  "express-validator": "^7.0.0",
  "winston": "^3.8.0",
  "crypto": "builtin"
}
```

### Configuration

All security settings should be loaded from `security-config.json` and environment variables. Never hardcode secrets.

### Testing

Security features must be tested against:
- OWASP Top 10
- CWE Top 25
- Simulated attack patterns
- Threat model scenarios

### Compliance

Supports:
- SOC 2
- HIPAA
- PCI DSS
- GDPR

---

**Last Updated:** 2026-02-13  
**Reviewed By:** Security Team  
**Next Review:** 2026-05-13
