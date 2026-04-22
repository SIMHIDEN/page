// Test: Verify duplicate question text removal
// This test ensures nested .qtext divs and .prompt elements are excluded

const { JSDOM } = require('jsdom');

console.log('=== Testing: Duplicate Question Text Removal ===\n');

// Test 1: Simple question (no duplicates)
console.log('Test 1: Simple question text extraction');
const dom1 = new JSDOM(`
    <div class="que multichoice">
        <div class="qtext">
            <p>What is 2+2?</p>
        </div>
    </div>
`);

const qtext1 = dom1.window.document.querySelector('.qtext');
const clone1 = qtext1.cloneNode(true);
clone1.querySelectorAll('.prompt, .explanation, div.qtext').forEach(el => el.remove());
const text1 = clone1.textContent.trim();

if (text1 === 'What is 2+2?') {
    console.log('✅ PASS: Simple question extracted correctly');
} else {
    console.log(`❌ FAIL: Expected "What is 2+2?", got "${text1}"`);
    process.exit(1);
}

// Test 2: Question with nested .prompt (blueish duplicate)
console.log('\nTest 2: Question with nested .prompt element');
const dom2 = new JSDOM(`
    <div class="que multichoice">
        <div class="qtext">
            <p>Main question text</p>
            <div class="prompt" style="color: #0066cc;">
                <p>Duplicate explanation (blueish)</p>
            </div>
        </div>
    </div>
`);

const qtext2 = dom2.window.document.querySelector('.qtext');
const clone2 = qtext2.cloneNode(true);
clone2.querySelectorAll('.prompt, .explanation, div.qtext').forEach(el => el.remove());
const text2 = clone2.textContent.trim();

console.log(`   Extracted: "${text2}"`);
if (text2 === 'Main question text' && !text2.includes('Duplicate')) {
    console.log('✅ PASS: Prompt removed, no duplicate');
} else {
    console.log(`❌ FAIL: Duplicate still present`);
    process.exit(1);
}

// Test 3: Question with nested .explanation
console.log('\nTest 3: Question with nested .explanation element');
const dom3 = new JSDOM(`
    <div class="que multichoice">
        <div class="qtext">
            <p>Core question?</p>
            <div class="explanation">
                <p>Additional clarification text</p>
            </div>
        </div>
    </div>
`);

const qtext3 = dom3.window.document.querySelector('.qtext');
const clone3 = qtext3.cloneNode(true);
clone3.querySelectorAll('.prompt, .explanation, div.qtext').forEach(el => el.remove());
const text3 = clone3.textContent.trim();

if (text3 === 'Core question?' && !text3.includes('clarification')) {
    console.log('✅ PASS: Explanation removed');
} else {
    console.log(`❌ FAIL: Explanation still present`);
    process.exit(1);
}

// Test 4: Question with nested div.qtext (double nesting)
console.log('\nTest 4: Question with nested div.qtext');
const dom4 = new JSDOM(`
    <div class="que multichoice">
        <div class="qtext">
            <p>Question text here</p>
            <div class="qtext">
                <p>Nested qtext duplicate</p>
            </div>
        </div>
    </div>
`);

const qtext4 = dom4.window.document.querySelector('.qtext');
const clone4 = qtext4.cloneNode(true);
clone4.querySelectorAll('.prompt, .explanation, div.qtext').forEach(el => el.remove());
const text4 = clone4.textContent.trim();

if (text4 === 'Question text here' && !text4.includes('Nested')) {
    console.log('✅ PASS: Nested qtext removed');
} else {
    console.log(`❌ FAIL: Nested qtext still present: "${text4}"`);
    process.exit(1);
}

// Test 5: Complex question with multiple nested elements
console.log('\nTest 5: Complex question with multiple nested elements');
const dom5 = new JSDOM(`
    <div class="que multichoice">
        <div class="qtext">
            <p>Primary question?</p>
            <div class="prompt"><p>Prompt text 1</p></div>
            <div class="explanation"><p>Explanation text</p></div>
            <div class="qtext"><p>Nested qtext</p></div>
        </div>
    </div>
`);

const qtext5 = dom5.window.document.querySelector('.qtext');
const clone5 = qtext5.cloneNode(true);
clone5.querySelectorAll('.prompt, .explanation, div.qtext').forEach(el => el.remove());
const text5 = clone5.textContent.trim();

if (text5 === 'Primary question?' && 
    !text5.includes('Prompt') && 
    !text5.includes('Explanation') && 
    !text5.includes('Nested')) {
    console.log('✅ PASS: All nested elements removed');
} else {
    console.log(`❌ FAIL: Some nested elements remain: "${text5}"`);
    process.exit(1);
}

// Test 6: Question with legitimate nested formatting (should preserve)
console.log('\nTest 6: Question with legitimate nested spans/strong tags');
const dom6 = new JSDOM(`
    <div class="que multichoice">
        <div class="qtext">
            <p>Question with <strong>bold</strong> and <span>formatted</span> text</p>
        </div>
    </div>
`);

const qtext6 = dom6.window.document.querySelector('.qtext');
const clone6 = qtext6.cloneNode(true);
clone6.querySelectorAll('.prompt, .explanation, div.qtext').forEach(el => el.remove());
const text6 = clone6.textContent.trim();

if (text6.includes('bold') && text6.includes('formatted')) {
    console.log('✅ PASS: Legitimate formatting preserved');
} else {
    console.log(`❌ FAIL: Legitimate formatting removed`);
    process.exit(1);
}

console.log('\n=== All Tests Passed ✅ ===');
console.log('\nSummary:');
console.log('- Simple questions: Extracted correctly ✓');
console.log('- .prompt elements: Removed ✓');
console.log('- .explanation elements: Removed ✓');
console.log('- Nested .qtext divs: Removed ✓');
console.log('- Complex nesting: All removed ✓');
console.log('- Legitimate formatting: Preserved ✓');
console.log('\n⚠️  Manual Testing:');
console.log('1. Load extension on Moodle with question that has blue duplicate text');
console.log('2. Press Ctrl+Shift+Y');
console.log('3. Check console (F12) - should see only main question, no duplicate');
console.log('4. Verify AI receives clean question text without duplicates');
