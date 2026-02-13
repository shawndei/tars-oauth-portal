# Security Hardening Skill - Constitutional AI Safety Layer

## Overview

The Constitutional AI Safety Layer provides production-grade protection by evaluating every action against a set of constitutional principles before execution. It implements a comprehensive safety check system with intervention logic, audit logging, and configurable safety levels.

## Features

✅ **Safety Check System** - Evaluates actions before execution
✅ **Constitutional Principles** - Enforces ethical and safety guidelines
✅ **Intervention Logic** - Blocks, warns, modifies, or requires approval
✅ **Audit Logging** - Comprehensive logging of all safety decisions
✅ **Configurable Safety Levels** - From permissive to paranoid
✅ **Adversarial Testing** - Robust against attack patterns
✅ **Context-Aware** - Considers user authentication, MFA, elevation status
✅ **Approval Workflow** - Requires manual approval for high-risk actions

## Quick Start

### Installation

```bash
cd skills/security-hardening
npm install
```

### Basic Usage

```typescript
import { ConstitutionalAI } from './src/constitutional-ai';

// Initialize
const safety = new ConstitutionalAI({
  defaultSafetyLevel: 'balanced',
  auditLogPath: './logs/safety-audit',
  retentionDays: 90
});

await safety.initialize();

// Check an action
const context = {
  action: 'delete_file',
  resource: '/important/data.txt',
  userId: 'user-123',
  sessionId: 'session-456',
  authenticated: true,
  mfaVerified: false,
  elevated: false
};

const result = await safety.checkAction(context);

if (!result.allowed) {
  console.log('Action blocked:', result.intervention?.reason);
  console.log('Violations:', result.violations);
  console.log('Alternatives:', result.intervention?.alternatives);
} else {
  console.log('Action allowed - proceed with caution');
}
```

### Execute with Safety

```typescript
// Automatically check and execute
const execution = await safety.executeWithSafety(
  context,
  async () => {
    // Your action here
    return performDeletion('/important/data.txt');
  }
);

if (execution.success) {
  console.log('Action completed:', execution.result);
} else {
  console.log('Action blocked:', execution.intervention?.message);
}
```

## Constitutional Principles

The system enforces five core principles:

### 1. Harm Prevention (severity: 0.95)
- Prevents violence, weapons, self-harm
- Blocks illegal activities
- Prevents harassment and abuse

### 2. Privacy Protection (severity: 0.85)
- Protects user data and credentials
- Prevents unauthorized surveillance
- Blocks data exfiltration

### 3. User Autonomy (severity: 0.70)
- Requires consent for destructive actions
- Provides clear information about risks
- Respects user preferences

### 4. Fairness & Equity (severity: 0.80)
- Prevents discrimination
- Ensures fair treatment
- Mitigates bias

### 5. Transparency & Accountability (severity: 0.65)
- Explains safety decisions
- Comprehensive audit logging
- Acknowledges limitations

## Safety Levels

### Permissive
- Minimal blocking
- Only critical threats
- Best for: Development, trusted environments

### Balanced (Default)
- Reasonable security/usability balance
- Moderate thresholds
- Best for: Most production environments

### Strict
- Enhanced safety checks
- Low tolerance for risk
- Best for: Sensitive data handling

### Paranoid
- Maximum security
- Blocks most risky actions
- Best for: High-security environments

### Changing Safety Levels

```typescript
safety.setSafetyLevel('strict');
console.log('Current level:', safety.getSafetyLevel()?.name);
```

## Intervention Types

### Block
- Action completely prevented
- High-risk violations
- Provides alternatives

### Warn
- Action allowed with warning
- Medium-risk concerns
- User proceeds with caution

### Modify
- Action modified to be safer
- Parameters sanitized
- Execution proceeds with changes

### Require Approval
- Action needs manual approval
- High-risk but potentially legitimate
- Waits for authorized approval

## Approval Workflow

```typescript
// Check returns approval required
const intervention = await safety.checkAndIntervene(context);

if (intervention.requiresApproval) {
  const requestId = intervention.approvalRequestId;
  
  // Wait for approval (or handle asynchronously)
  const approved = await safety.approveAction(requestId, 'admin-user');
  
  if (approved.success) {
    // Proceed with action
  }
}

// Check pending approvals
const pending = safety.getPendingApprovals();
console.log('Pending approvals:', pending.length);
```

## Audit Logging

All safety decisions are logged for compliance and analysis.

### Query Logs

```typescript
const logs = await safety.queryAuditLogs({
  userId: 'user-123',
  startDate: new Date('2026-02-01'),
  endDate: new Date(),
  riskLevel: 'high',
  limit: 100
});

console.log(`Found ${logs.length} high-risk actions`);
```

### Generate Reports

```typescript
const report = await safety.generateReport('weekly');

console.log('Total checks:', report.totalChecks);
console.log('Blocked:', report.blocked);
console.log('Risk distribution:', report.riskDistribution);
console.log('Top violations:', report.topViolations);
```

## Testing

Comprehensive test suite with adversarial examples:

```bash
npm test
```

Tests include:
- ✓ Harm prevention (violence, weapons, self-harm)
- ✓ Privacy protection (data theft, surveillance)
- ✓ Illegal activities (hacking, fraud)
- ✓ Destructive actions (deletions, system changes)
- ✓ Privilege escalation (sudo, permission bypass)
- ✓ Adversarial examples (obfuscation, social engineering)

See `tests/README.md` for detailed test documentation.

## Configuration

### Constitutional Principles
Edit `config/constitutional-principles.json` to customize:
- Core principles and rules
- Prohibited patterns
- Severity levels
- Examples

### Safety Levels
Edit `config/safety-levels.json` to customize:
- Risk thresholds
- Enabled checks
- Logging preferences

## Integration with Existing Security Layers

The Constitutional AI Safety Layer complements other security-hardening features:

1. **Input Validation** (Layer 1) - Sanitize inputs first
2. **Command Injection Prevention** (Layer 2) - Safe command execution
3. **Rate Limiting** (Layer 3) - Prevent abuse
4. **Authentication** (Layer 4) - Verify users
5. **Sensitive Data Redaction** (Layer 5) - Protect secrets
6. **Constitutional AI** (Layer 6) ← **You are here**

## Performance

- Average check time: <50ms
- Negligible overhead for safe actions
- Async logging (non-blocking)
- Buffered audit writes

## Security Considerations

- **Fail secure**: Errors block by default
- **Defense in depth**: Multiple check layers
- **Audit everything**: Complete decision trail
- **Regular updates**: Keep principles current
- **Adversarial testing**: Test against attacks

## Maintenance

### Update Principles

```typescript
// Reload from file
await safety.reloadPrinciples();

// Or programmatically
await safety.updatePrinciples(newPrinciples);
```

### Cleanup Old Logs

```typescript
// Remove logs older than retention period
await safety.cleanup();
```

### Shutdown

```typescript
// Flush logs before exit
await safety.shutdown();
```

## Architecture

```
┌─────────────────────────────────────────┐
│         ConstitutionalAI                │
│         (Main Interface)                │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌─────▼──────────┐
│SafetyChecker│  │InterventionH.  │
└──────┬──────┘  └─────┬──────────┘
       │                │
┌──────▼──────┐  ┌─────▼──────────┐
│Principles   │  │AuditLogger     │
│Matcher      │  │                │
└─────────────┘  └────────────────┘
```

## Contributing

When adding new features:

1. Update constitutional principles if needed
2. Add corresponding tests (including adversarial)
3. Update audit logging
4. Document in SKILL.md
5. Test all safety levels

## License

Part of the TARS Security Hardening Skill  
© 2026 - Production Ready

## Support

For issues, questions, or feature requests, see the main SKILL.md documentation.

---

**Remember**: Safety systems are only as good as their testing. Regularly update adversarial examples and review audit logs for patterns.
