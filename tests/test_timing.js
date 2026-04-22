// Test: Verify timing randomization and Groq-only API wiring

const fs = require('fs');
const path = require('path');

console.log('=== Testing: Timing + Groq Wiring ===\n');

const backgroundPath = path.join(__dirname, '..', 'background.js');
const backgroundJS = fs.readFileSync(backgroundPath, 'utf8');

// Test 1: Verify random delay code exists
console.log('Test 1: Random delay implementation');
const hasRandomDelay = backgroundJS.includes('Math.random()') &&
                       backgroundJS.includes('setTimeout');
if (!hasRandomDelay) {
  console.log('❌ FAIL: Random delay code not found');
  process.exit(1);
} else {
  console.log('✅ PASS: Random delay code exists');
}

// Test 2: Verify delay range is 100-1000ms
console.log('\nTest 2: Delay range validation');
const delayPattern = /Math\.floor\(Math\.random\(\)\s*\*\s*901\)\s*\+\s*100/g;
const delayMatches = backgroundJS.match(delayPattern);
if (!delayMatches || delayMatches.length < 2) {
  console.log('❌ FAIL: Expected delay pattern Math.floor(Math.random() * 901) + 100 in solve + train paths');
  process.exit(1);
} else {
  console.log(`✅ PASS: Found ${delayMatches.length} delay implementations (100-1000ms)`);
}

// Test 3: Verify delay uses await
console.log('\nTest 3: Delay uses async/await');
const hasAwaitDelay = backgroundJS.includes('await new Promise(resolve => setTimeout(resolve, randomDelay));');
if (!hasAwaitDelay) {
  console.log('❌ FAIL: Delay should use await Promise-based sleep');
  process.exit(1);
} else {
  console.log('✅ PASS: Delay uses async/await correctly');
}

// Test 4: Verify Groq endpoint abstraction exists
console.log('\nTest 4: Groq endpoint abstraction');
const hasGroqUrlHelper = backgroundJS.includes('const getGroqUrl = () =>') &&
                         backgroundJS.includes('/groq/openai/v1/chat/completions') &&
                         backgroundJS.includes('https://api.groq.com/openai/v1/chat/completions');
if (!hasGroqUrlHelper) {
  console.log('❌ FAIL: Groq endpoint helper missing');
  process.exit(1);
} else {
  console.log('✅ PASS: Groq endpoint helper present');
}

// Test 5: Verify Gemini API path was removed
console.log('\nTest 5: Gemini removal');
const hasGeminiRuntimePath = /generativelanguage|getGemini|solveBatchWithGemini|\/gemini\//i.test(backgroundJS);
if (hasGeminiRuntimePath) {
  console.log('❌ FAIL: Gemini runtime path still present in background.js');
  process.exit(1);
} else {
  console.log('✅ PASS: Gemini runtime path removed');
}

// Test 6: Simulate delay calculation
console.log('\nTest 6: Simulate delay calculation (100 samples)');
const delays = [];
for (let i = 0; i < 100; i++) {
  const delay = Math.floor(Math.random() * 901) + 100;
  delays.push(delay);
}

const min = Math.min(...delays);
const max = Math.max(...delays);
const avg = delays.reduce((a, b) => a + b, 0) / delays.length;

console.log(`   Min: ${min}ms, Max: ${max}ms, Avg: ${avg.toFixed(0)}ms`);

if (min < 100 || max > 1000) {
  console.log('❌ FAIL: Delay range outside expected bounds');
  process.exit(1);
} else {
  console.log('✅ PASS: Delay range within expected bounds');
}

console.log('\n=== All Tests Passed ✅ ===');
