/**
 * Code Sandbox Examples
 * 
 * Demonstrates various use cases for the sandbox
 */

const Sandbox = require('./sandbox');

// Example 1: Simple Math
async function example1_SimpleMath() {
  console.log('\n=== Example 1: Simple Math (JavaScript) ===');
  
  const result = await Sandbox.execute({
    language: 'javascript',
    code: `
      function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n-1) + fibonacci(n-2);
      }
      
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(fibonacci(i));
      }
      
      console.log('Fibonacci sequence:', results.join(', '));
      results
    `
  });

  console.log('Success:', result.success);
  console.log('Output:', result.output);
  console.log('Time:', result.executionTime + 'ms');
}

// Example 2: Data Processing with Python
async function example2_PythonDataProcessing() {
  console.log('\n=== Example 2: Data Processing (Python) ===');
  
  const result = await Sandbox.execute({
    language: 'python',
    code: `
import json
import statistics

# Sample data
temperatures = [72, 75, 68, 70, 73, 71, 69, 74, 76, 72]

result = {
    "count": len(temperatures),
    "mean": statistics.mean(temperatures),
    "median": statistics.median(temperatures),
    "stdev": round(statistics.stdev(temperatures), 2),
    "min": min(temperatures),
    "max": max(temperatures)
}

print(json.dumps(result, indent=2))
    `
  });

  console.log('Success:', result.success);
  console.log('Output:', result.output);
  console.log('Time:', result.executionTime + 'ms');
}

// Example 3: String Manipulation with Bash
async function example3_BashStringManip() {
  console.log('\n=== Example 3: String Manipulation (Bash/PowerShell) ===');
  
  const code = process.platform === 'win32'
    ? `
$text = "Hello World from PowerShell"
$upper = $text.ToUpper()
$lower = $text.ToLower()
$length = $text.Length

echo "Original: $text"
echo "Uppercase: $upper"
echo "Lowercase: $lower"
echo "Length: $length"
    `
    : `
text="Hello World from Bash"
upper=$(echo "$text" | tr '[:lower:]' '[:upper:]')
lower=$(echo "$text" | tr '[:upper:]' '[:lower:]')
length=\${#text}

echo "Original: $text"
echo "Uppercase: $upper"
echo "Lowercase: $lower"
echo "Length: $length"
    `;

  const result = await Sandbox.execute({
    language: 'bash',
    code
  });

  console.log('Success:', result.success);
  console.log('Output:', result.output);
  console.log('Time:', result.executionTime + 'ms');
}

// Example 4: Error Handling
async function example4_ErrorHandling() {
  console.log('\n=== Example 4: Error Handling ===');
  
  // JavaScript error
  const jsResult = await Sandbox.execute({
    language: 'javascript',
    code: 'throw new Error("Something went wrong!")'
  });
  
  console.log('JavaScript Error:');
  console.log('  Success:', jsResult.success);
  console.log('  Error:', jsResult.error);

  // Python error
  const pyResult = await Sandbox.execute({
    language: 'python',
    code: 'raise ValueError("Invalid value!")'
  });
  
  console.log('\nPython Error:');
  console.log('  Success:', pyResult.success);
  console.log('  Error:', pyResult.error);
}

// Example 5: Timeout Demonstration
async function example5_Timeout() {
  console.log('\n=== Example 5: Timeout Protection ===');
  
  const result = await Sandbox.execute({
    language: 'javascript',
    code: `
      // This will timeout
      let count = 0;
      while(true) {
        count++;
        if (count > 1000000) {
          console.log("Still running...");
        }
      }
    `,
    timeout: 2000 // 2 second timeout
  });

  console.log('Success:', result.success);
  console.log('Error:', result.error);
  console.log('Time:', result.executionTime + 'ms');
}

// Example 6: JSON API Response
async function example6_JsonAPI() {
  console.log('\n=== Example 6: JSON API Response ===');
  
  const result = await Sandbox.execute({
    language: 'javascript',
    code: `
      // Simulate API data processing
      const users = [
        { id: 1, name: "Alice", age: 30, active: true },
        { id: 2, name: "Bob", age: 25, active: false },
        { id: 3, name: "Charlie", age: 35, active: true }
      ];
      
      const activeUsers = users.filter(u => u.active);
      const avgAge = users.reduce((sum, u) => sum + u.age, 0) / users.length;
      
      JSON.stringify({
        total: users.length,
        active: activeUsers.length,
        averageAge: avgAge,
        activeUsers: activeUsers.map(u => u.name)
      }, null, 2)
    `
  });

  console.log('Success:', result.success);
  console.log('Output:', result.output);
}

// Example 7: Safe User Input Execution
async function example7_UserInput() {
  console.log('\n=== Example 7: Safe User Input Execution ===');
  
  // Simulate user wanting to calculate something
  const userCode = '2 + 2 * 10';
  
  const result = await Sandbox.execute({
    language: 'javascript',
    code: userCode
  });

  console.log('User code:', userCode);
  console.log('Result:', result.output);
  
  // Now try malicious user input
  const maliciousCode = 'require("fs").readFileSync("/etc/passwd")';
  
  const maliciousResult = await Sandbox.execute({
    language: 'javascript',
    code: maliciousCode
  });

  console.log('\nMalicious code:', maliciousCode);
  console.log('Blocked:', !maliciousResult.success);
  console.log('Error:', maliciousResult.error);
}

// Run all examples
async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║       Code Sandbox Examples                       ║');
  console.log('╚════════════════════════════════════════════════════╝');

  try {
    await example1_SimpleMath();
    await example2_PythonDataProcessing();
    await example3_BashStringManip();
    await example4_ErrorHandling();
    await example5_Timeout();
    await example6_JsonAPI();
    await example7_UserInput();

    console.log('\n✓ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Example failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  example1_SimpleMath,
  example2_PythonDataProcessing,
  example3_BashStringManip,
  example4_ErrorHandling,
  example5_Timeout,
  example6_JsonAPI,
  example7_UserInput
};
