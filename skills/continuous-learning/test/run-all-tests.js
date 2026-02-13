/**
 * Test Runner - Execute All Tests
 */

const { exec } = require('child_process');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

const tests = [
  'test-feedback-capture.js',
  'test-pattern-analysis.js',
  'test-integration.js'
];

async function runTest(testFile) {
  const testPath = path.join(__dirname, testFile);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${testFile}`);
  console.log('='.repeat(60));
  
  try {
    const { stdout, stderr } = await execPromise(`node "${testPath}"`);
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    return { success: true, testFile };
  } catch (error) {
    console.error(`\n❌ ${testFile} FAILED\n`);
    console.error(error.stdout || error.message);
    return { success: false, testFile, error };
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting Continuous Learning Test Suite\n');
  
  const results = [];
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.testFile}`);
  });
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('-'.repeat(60));
  
  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED\n');
    process.exit(0);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
