# Code Sandbox

Secure code execution sandbox for OpenClaw - **SECURITY CRITICAL**

## Quick Start

```bash
# No installation needed - uses Node.js built-in modules

# Run tests
node test.js

# Run examples
node examples.js
```

## Usage

```javascript
const Sandbox = require('./sandbox');

const result = await Sandbox.execute({
  language: 'javascript',
  code: 'const x = 40 + 2; x',
  timeout: 5000
});

console.log(result.output); // "42"
```

## Supported Languages

- **JavaScript**: Isolated V8 environment (no Node.js APIs)
- **Python**: Spawned process (requires Python in PATH)
- **Bash**: Spawned shell (bash on Unix, PowerShell on Windows)

## Security Features

- ✅ Timeout enforcement (default 30s)
- ✅ Memory limits (JavaScript: 128MB)
- ✅ No network access
- ✅ Limited filesystem access
- ✅ Output size limits (1MB default)
- ✅ Safe error handling

## Documentation

See `SKILL.md` for complete documentation.

## Testing

Run the security test suite:
```bash
npm test
```

This will generate `TEST_RESULTS.md` with detailed results.

## Examples

```bash
node examples.js
```

## Integration

```javascript
// In OpenClaw agent
const sandbox = require('./skills/code-sandbox/sandbox');

async function executeUserCode(language, code) {
  const result = await sandbox.execute({
    language,
    code,
    timeout: 30000
  });
  
  if (result.success) {
    return `✓ Output:\n${result.output}`;
  } else {
    return `✗ Error: ${result.error}`;
  }
}
```

## Files

- `sandbox.js` - Core sandbox implementation
- `test.js` - Security and functionality tests
- `examples.js` - Usage examples
- `SKILL.md` - Complete documentation
- `package.json` - Dependencies

## Requirements

- Node.js 18+
- Python 3 (for Python execution)
- Bash or PowerShell (for shell execution)

## License

Internal use only.
