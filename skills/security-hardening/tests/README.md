# Constitutional AI Safety Layer - Tests

This directory contains comprehensive tests for the Constitutional AI Safety Layer, including adversarial examples designed to test the robustness of safety mechanisms.

## Running Tests

### Prerequisites

```bash
npm install --save-dev jest @types/jest ts-jest
```

### Configuration

Create `jest.config.js` in the project root:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ]
};
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
npm test -- constitutional-ai.test.ts
```

### Run with Coverage

```bash
npm test -- --coverage
```

## Test Categories

### 1. Harm Prevention Tests
Tests blocking of:
- Violence and weapon-related requests
- Self-harm instructions
- Harassment and abuse
- Illegal activities

### 2. Privacy Protection Tests
Tests blocking of:
- Unauthorized data access
- Surveillance activities
- Credential exposure
- Doxxing attempts

### 3. Destructive Actions Tests
Tests blocking/approval requirements for:
- System-destructive commands
- Database deletions
- Mass file operations

### 4. Privilege Escalation Tests
Tests detection of:
- Sudo/root access attempts
- Permission bypass attempts
- Security circumvention

### 5. Context-Aware Tests
Tests risk adjustment based on:
- Authentication status
- MFA verification
- Recent violation history
- Elevated mode status

### 6. Safety Level Tests
Tests different safety level behaviors:
- Permissive (minimal blocking)
- Balanced (default)
- Strict (aggressive blocking)
- Paranoid (maximum security)

### 7. Adversarial Examples
Tests robustness against:
- Obfuscated harmful requests
- Indirect harm requests
- Compound/multi-step attacks
- Social engineering disguised as help

## Adversarial Test Design

Adversarial tests are designed to:

1. **Test Obfuscation Resistance**: Use leetspeak, typos, synonyms
2. **Test Indirect Requests**: Frame harmful requests as innocent questions
3. **Test Multi-Step Attacks**: Combine multiple steps to achieve harmful goal
4. **Test Social Engineering**: Disguise privilege escalation as troubleshooting
5. **Test Boundary Cases**: Actions that are almost-but-not-quite harmful

## Expected Coverage

Target test coverage:
- Overall: >85%
- SafetyChecker: >90%
- InterventionHandler: >85%
- PrinciplesMatcher: >80%
- AuditLogger: >75%

## Adding New Tests

When adding new tests:

1. **Follow naming convention**: `describe('Category') > test('should behavior')`
2. **Include context**: Always provide complete ActionContext
3. **Assert expectations**: Check `allowed`, `riskLevel`, `violations`, `principles`
4. **Test edge cases**: Include boundary conditions
5. **Document adversarial**: Explain why adversarial test is important

Example:

```typescript
test('should detect [attack type]', async () => {
  const context: ActionContext = {
    action: 'action_type',
    input: 'adversarial input',
    userId: 'test-user',
    sessionId: 'test-session',
    authenticated: true,
    mfaVerified: false,
    elevated: false
  };

  const result = await safetySystem.checkAction(context);

  expect(result.allowed).toBe(false);
  expect(result.riskLevel).toMatch(/high|critical/);
  expect(result.violations.length).toBeGreaterThan(0);
});
```

## Continuous Testing

Tests should be run:
- Before every commit (pre-commit hook)
- On every pull request (CI/CD)
- Nightly with full coverage report
- After any principle or safety level changes

## Security Validation

These tests validate that the Constitutional AI Safety Layer:

✓ Blocks harmful requests (harm prevention)
✓ Protects privacy (data protection)
✓ Prevents unauthorized access (authentication)
✓ Requires approval for risky actions (elevated mode)
✓ Logs all decisions (audit trail)
✓ Adapts to context (risk assessment)
✓ Resists adversarial attacks (robustness)

## Maintenance

- Review tests quarterly
- Update adversarial examples based on new attack patterns
- Add tests for new principles
- Update safety thresholds based on false positive/negative rates
