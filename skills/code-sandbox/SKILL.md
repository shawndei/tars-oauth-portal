# Code Sandbox Skill

**SECURITY CRITICAL**: Safe execution of untrusted code in isolated environments

## Overview

Provides secure code execution for Python, JavaScript, and Bash with comprehensive isolation, resource limits, and timeout enforcement.

## Security Model

### Isolation Layers

1. **JavaScript**: Node.js `vm` module with context isolation (no Node.js APIs, restricted globals)
2. **Python/Bash**: Spawned child processes with:
   - No network access (enforced via process isolation)
   - Read-only filesystem (except temp directory)
   - CPU and memory limits
   - Execution timeout (30s default, configurable)

### Security Guarantees

- ✅ **Network isolation**: No network access in any sandbox
- ✅ **Filesystem isolation**: Limited to temporary working directory
- ✅ **Timeout enforcement**: Hard kill after timeout
- ✅ **Resource limits**: CPU and memory constraints
- ✅ **Output sanitization**: Captured and truncated to prevent DOS
- ✅ **Safe failure**: All errors handled gracefully, no crashes

### Known Limitations

- **Windows**: Process isolation is limited compared to Linux containers
- **Resource limits**: Windows doesn't support RLIMIT like Linux (best-effort)
- **Python/Bash filesystem**: Can read system files (read-only) but cannot modify
- **Not container-level**: For maximum security, use Docker/E2B on Linux

## Installation

No external dependencies required! Uses Node.js built-in modules.

```bash
cd skills/code-sandbox
# Ready to use - no npm install needed
```

## Usage

### From Code

```javascript
const Sandbox = require('./sandbox');

// Execute JavaScript
const jsResult = await Sandbox.execute({
  language: 'javascript',
  code: 'const x = 40 + 2; x',
  timeout: 5000 // 5 seconds
});

// Execute Python
const pyResult = await Sandbox.execute({
  language: 'python',
  code: 'print("Hello from Python")',
  timeout: 10000
});

// Execute Bash
const bashResult = await Sandbox.execute({
  language: 'bash',
  code: 'echo "Hello from Bash"',
  timeout: 10000
});

// Result structure
{
  success: true,
  output: "42",
  stderr: "",
  exitCode: 0,
  executionTime: 45,
  error: null
}
```

### As OpenClaw Skill

```javascript
// In agent skills
const result = await this.skills['code-sandbox'].execute({
  language: 'python',
  code: userCode,
  timeout: 30000
});

if (result.success) {
  return `Output: ${result.output}`;
} else {
  return `Error: ${result.error}`;
}
```

## API

### `Sandbox.execute(options)`

Execute code in a sandboxed environment.

**Parameters:**
- `language` (string): `'javascript'`, `'python'`, or `'bash'`
- `code` (string): Code to execute
- `timeout` (number, optional): Milliseconds before timeout (default: 30000)
- `maxOutputSize` (number, optional): Max output bytes (default: 1MB)

**Returns:** Promise resolving to:
```javascript
{
  success: boolean,      // Whether execution succeeded
  output: string,        // Stdout output
  stderr: string,        // Stderr output (if any)
  exitCode: number,      // Process exit code (0 = success)
  executionTime: number, // Milliseconds taken
  error: string|null     // Error message if failed
}
```

### Supported Languages

#### JavaScript
- Runs in Node.js `vm` module (context isolation)
- No access to Node.js APIs (fs, net, child_process, require, etc.)
- No access to process, Buffer, or global objects
- Pure computational sandbox with safe builtins only
- Can use: JSON, Math, Array, Object, String, Date, RegExp, etc.

#### Python
- Requires Python installed (`python` or `python3` in PATH)
- Spawned as child process with timeout
- No network access (process-level isolation)
- Can read filesystem (read-only) but not write outside temp dir

#### Bash
- Windows: Uses PowerShell as fallback
- Unix: Uses `/bin/bash`
- Spawned as child process with timeout
- Limited filesystem access

## Security Testing

Run the security test suite to verify isolation:

```bash
npm test
```

Tests include:
- Network access attempts (should fail)
- Filesystem escape attempts (should fail)
- Timeout enforcement (should kill)
- Resource exhaustion (should limit)
- Infinite loops (should timeout)
- Output bombing (should truncate)

## Examples

### Safe Math Computation (JS)
```javascript
const result = await Sandbox.execute({
  language: 'javascript',
  code: `
    function fibonacci(n) {
      if (n <= 1) return n;
      return fibonacci(n-1) + fibonacci(n-2);
    }
    fibonacci(10)
  `
});
// result.output: "55"
```

### Data Processing (Python)
```javascript
const result = await Sandbox.execute({
  language: 'python',
  code: `
import json
data = [1, 2, 3, 4, 5]
result = sum(data) / len(data)
print(json.dumps({"average": result}))
  `
});
// result.output: '{"average": 3.0}'
```

### System Info (Bash)
```javascript
const result = await Sandbox.execute({
  language: 'bash',
  code: 'echo "User: $USER"; echo "PWD: $PWD"'
});
```

## Error Handling

All errors are caught and returned in the result object:

```javascript
const result = await Sandbox.execute({
  language: 'python',
  code: 'import nonexistent_module'
});

// result.success: false
// result.error: "ModuleNotFoundError: No module named 'nonexistent_module'"
```

## Performance

- **JavaScript**: <5ms for simple expressions (vm module overhead minimal)
- **Python**: ~100-200ms startup + execution time
- **Bash**: ~50-100ms startup + execution time

## Architecture

```
┌─────────────────────────────────────┐
│         Sandbox.execute()           │
├─────────────────────────────────────┤
│  Language Router                    │
│  ├─ JS  → vm.Script (context)      │
│  ├─ Py  → child_process (python)    │
│  └─ Bash→ child_process (bash/pwsh) │
├─────────────────────────────────────┤
│  Timeout Manager (setTimeout)       │
│  Output Capture (stdout/stderr)     │
│  Error Handler (try/catch)          │
└─────────────────────────────────────┘
```

## Maintenance

### Adding New Languages

1. Add language executor to `sandbox.js`
2. Implement timeout and output capture
3. Add security tests
4. Document in this file

### Security Updates

- Review isolation on new Node.js versions
- Test against new attack vectors
- Monitor Node.js vm module security advisories
- Monitor CVEs for language runtimes

## Troubleshooting

**"Python not found"**: Install Python and add to PATH
**"Timeout kills not working"**: Check if processes spawn correctly
**"Output truncated"**: Increase `maxOutputSize` parameter
**"Permission denied"**: Check temp directory permissions

## License

Internal use only. Security-critical component.

## Changelog

- **2026-02-13**: Initial implementation with JS/Python/Bash support
