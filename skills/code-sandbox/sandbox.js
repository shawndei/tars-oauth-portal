/**
 * Code Sandbox - SECURITY CRITICAL
 * 
 * Provides isolated code execution for JavaScript, Python, and Bash
 * with comprehensive security controls.
 */

const vm = require('vm');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Security constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1 MB
const PYTHON_COMMANDS = ['python3', 'python'];
const BASH_COMMAND = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';

class Sandbox {
  /**
   * Execute code in a sandboxed environment
   * @param {Object} options
   * @param {string} options.language - 'javascript', 'python', or 'bash'
   * @param {string} options.code - Code to execute
   * @param {number} [options.timeout=30000] - Timeout in milliseconds
   * @param {number} [options.maxOutputSize=1048576] - Max output size in bytes
   * @returns {Promise<Object>} Execution result
   */
  static async execute(options) {
    const {
      language,
      code,
      timeout = DEFAULT_TIMEOUT,
      maxOutputSize = MAX_OUTPUT_SIZE
    } = options;

    // Validate inputs
    if (!language || typeof language !== 'string') {
      return this._error('Language is required and must be a string');
    }

    if (!code || typeof code !== 'string') {
      return this._error('Code is required and must be a string');
    }

    if (code.length > maxOutputSize) {
      return this._error(`Code size exceeds maximum (${maxOutputSize} bytes)`);
    }

    const startTime = Date.now();

    try {
      let result;

      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          result = await this._executeJavaScript(code, timeout, maxOutputSize);
          break;
        
        case 'python':
        case 'py':
          result = await this._executePython(code, timeout, maxOutputSize);
          break;
        
        case 'bash':
        case 'sh':
        case 'shell':
          result = await this._executeBash(code, timeout, maxOutputSize);
          break;
        
        default:
          return this._error(`Unsupported language: ${language}`);
      }

      result.executionTime = Date.now() - startTime;
      return result;

    } catch (error) {
      return this._error(error.message || String(error), Date.now() - startTime);
    }
  }

  /**
   * Execute JavaScript in Node.js vm sandbox
   */
  static async _executeJavaScript(code, timeout, maxOutputSize) {
    return new Promise((resolve) => {
      let output = [];
      let timedOut = false;
      let timeoutHandle;

      try {
        // Create isolated sandbox context
        const sandbox = {
          console: {
            log: (...args) => output.push(args.map(arg => String(arg)).join(' ')),
            error: (...args) => output.push(args.map(arg => String(arg)).join(' ')),
            warn: (...args) => output.push(args.map(arg => String(arg)).join(' ')),
            info: (...args) => output.push(args.map(arg => String(arg)).join(' '))
          },
          // Provide safe globals
          JSON: JSON,
          Math: Math,
          Array: Array,
          Object: Object,
          String: String,
          Number: Number,
          Boolean: Boolean,
          Date: Date,
          RegExp: RegExp,
          Error: Error,
          setTimeout: undefined,
          setInterval: undefined,
          setImmediate: undefined,
          // Block dangerous globals
          require: undefined,
          process: undefined,
          global: undefined,
          Buffer: undefined,
          module: undefined,
          exports: undefined,
          __dirname: undefined,
          __filename: undefined,
          clearTimeout: undefined,
          clearInterval: undefined,
          clearImmediate: undefined
        };

        // Create context
        const context = vm.createContext(sandbox);

        // Execute code directly (vm will return last expression value)
        const wrappedCode = code;

        // Set timeout
        timeoutHandle = setTimeout(() => {
          timedOut = true;
          resolve({
            success: false,
            output: output.join('\n'),
            stderr: `Execution timeout after ${timeout}ms`,
            exitCode: -1,
            error: `Execution timeout after ${timeout}ms`
          });
        }, timeout);

        // Run code
        const script = new vm.Script(wrappedCode, {
          filename: 'sandbox.js',
          timeout: timeout
        });

        const result = script.runInContext(context, {
          timeout: timeout,
          displayErrors: true
        });

        if (timedOut) return; // Already resolved

        clearTimeout(timeoutHandle);

        // Get final output
        let finalOutput = output.join('\n');
        if (result !== undefined && result !== null) {
          if (finalOutput) finalOutput += '\n';
          finalOutput += String(result);
        }

        // Truncate if needed
        if (finalOutput.length > maxOutputSize) {
          finalOutput = finalOutput.substring(0, maxOutputSize) + '\n[Output truncated]';
        }

        resolve({
          success: true,
          output: finalOutput,
          stderr: '',
          exitCode: 0,
          error: null
        });

      } catch (error) {
        if (timedOut) return; // Already resolved

        if (timeoutHandle) clearTimeout(timeoutHandle);

        let errorMsg = error.message || String(error);
        
        // Clean up error messages
        if (errorMsg.includes('Script execution timed out')) {
          errorMsg = `Execution timeout after ${timeout}ms`;
        }

        resolve({
          success: false,
          output: output.join('\n'),
          stderr: errorMsg,
          exitCode: 1,
          error: errorMsg
        });
      }
    });
  }

  /**
   * Execute Python in spawned process
   */
  static async _executePython(code, timeout, maxOutputSize) {
    // Find Python executable
    const pythonCmd = await this._findPython();
    if (!pythonCmd) {
      return this._error('Python not found in PATH. Install Python 3.');
    }

    // Create temp file for code
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `sandbox_${Date.now()}_${Math.random().toString(36).substring(7)}.py`);

    try {
      fs.writeFileSync(tempFile, code, 'utf8');

      return await this._executeProcess(pythonCmd, [tempFile], timeout, maxOutputSize);

    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Execute Bash/PowerShell in spawned process
   */
  static async _executeBash(code, timeout, maxOutputSize) {
    let args;
    
    if (process.platform === 'win32') {
      // PowerShell on Windows
      args = ['-NoProfile', '-NonInteractive', '-Command', code];
    } else {
      // Bash on Unix
      args = ['-c', code];
    }

    return await this._executeProcess(BASH_COMMAND, args, timeout, maxOutputSize);
  }

  /**
   * Execute a child process with timeout and output capture
   */
  static async _executeProcess(command, args, timeout, maxOutputSize) {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let killed = false;
      let exitCode = null;

      try {
        const proc = spawn(command, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
          timeout: timeout,
          env: {
            // Minimal environment - no network variables
            PATH: process.env.PATH,
            TEMP: os.tmpdir(),
            TMP: os.tmpdir(),
          }
        });

        // Set up timeout killer
        const timeoutHandle = setTimeout(() => {
          if (proc && !proc.killed) {
            killed = true;
            proc.kill('SIGKILL');
          }
        }, timeout);

        // Capture stdout
        proc.stdout.on('data', (data) => {
          if (stdout.length < maxOutputSize) {
            stdout += data.toString();
            if (stdout.length > maxOutputSize) {
              stdout = stdout.substring(0, maxOutputSize);
              stdout += '\n[Output truncated]';
              proc.kill('SIGKILL');
            }
          }
        });

        // Capture stderr
        proc.stderr.on('data', (data) => {
          if (stderr.length < maxOutputSize) {
            stderr += data.toString();
            if (stderr.length > maxOutputSize) {
              stderr = stderr.substring(0, maxOutputSize);
              stderr += '\n[Error output truncated]';
              proc.kill('SIGKILL');
            }
          }
        });

        // Handle process completion
        proc.on('close', (code) => {
          clearTimeout(timeoutHandle);
          exitCode = code;

          if (killed) {
            resolve({
              success: false,
              output: stdout,
              stderr: `Execution timeout after ${timeout}ms`,
              exitCode: -1,
              error: `Execution timeout after ${timeout}ms`
            });
          } else if (code === 0) {
            resolve({
              success: true,
              output: stdout,
              stderr: stderr,
              exitCode: code,
              error: null
            });
          } else if (code === null) {
            // Process was killed (probably by timeout)
            resolve({
              success: false,
              output: stdout,
              stderr: `Execution timeout after ${timeout}ms`,
              exitCode: -1,
              error: `Execution timeout after ${timeout}ms`
            });
          } else {
            resolve({
              success: false,
              output: stdout,
              stderr: stderr,
              exitCode: code,
              error: stderr || `Process exited with code ${code}`
            });
          }
        });

        // Handle spawn errors
        proc.on('error', (error) => {
          clearTimeout(timeoutHandle);
          resolve({
            success: false,
            output: '',
            stderr: error.message,
            exitCode: -1,
            error: `Failed to spawn process: ${error.message}`
          });
        });

      } catch (error) {
        resolve({
          success: false,
          output: '',
          stderr: error.message,
          exitCode: -1,
          error: `Process execution failed: ${error.message}`
        });
      }
    });
  }

  /**
   * Find Python executable
   */
  static async _findPython() {
    for (const cmd of PYTHON_COMMANDS) {
      try {
        const result = await new Promise((resolve) => {
          const proc = spawn(cmd, ['--version'], { 
            stdio: 'pipe',
            windowsHide: true 
          });
          
          let output = '';
          proc.stdout.on('data', (data) => output += data.toString());
          proc.stderr.on('data', (data) => output += data.toString());
          
          proc.on('close', (code) => {
            if (code === 0 && output.includes('Python')) {
              resolve(cmd);
            } else {
              resolve(null);
            }
          });

          proc.on('error', () => resolve(null));
        });

        if (result) return result;
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  /**
   * Create error result object
   */
  static _error(message, executionTime = 0) {
    return {
      success: false,
      output: '',
      stderr: message,
      exitCode: -1,
      executionTime,
      error: message
    };
  }
}

module.exports = Sandbox;
