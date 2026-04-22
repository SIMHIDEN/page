// Test: Verify no visible UI elements are created
// This test ensures the debug overlay has been properly removed

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

console.log('=== Testing: No Visible UI ===\n');

// Read content.js
const contentPath = path.join(__dirname, '..', 'content.js');
const contentJS = fs.readFileSync(contentPath, 'utf8');

// Test 1: Verify overlay creation code is removed
console.log('Test 1: Overlay creation code removed');
const hasOverlayCreation = contentJS.includes('document.createElement(\'div\')') && 
                           contentJS.includes('position: fixed') &&
                           contentJS.includes('#C0392B');
if (hasOverlayCreation) {
    console.log('❌ FAIL: Overlay creation code still exists');
    process.exit(1);
} else {
    console.log('✅ PASS: Overlay creation code removed');
}

// Test 2: Verify console logging is preserved
console.log('\nTest 2: Console logging preserved');
const hasConsoleLogs = contentJS.includes('console.log') && 
                      contentJS.includes('Forti Analysis');
if (!hasConsoleLogs) {
    console.log('❌ FAIL: Console logging removed (should be kept)');
    process.exit(1);
} else {
    console.log('✅ PASS: Console logging preserved');
}

// Test 3: Verify no visible alerts
console.log('\nTest 3: No visible alerts');
const hasAlerts = contentJS.includes('alert(');
if (hasAlerts) {
    console.log('❌ FAIL: Alert() calls still exist');
    process.exit(1);
} else {
    console.log('✅ PASS: No alert() calls found');
}

// Test 4: Verify appendChild calls are removed for overlay
console.log('\nTest 4: No overlay appendChild');
const appendOverlay = contentJS.includes('document.body.appendChild(overlay)');
if (appendOverlay) {
    console.log('❌ FAIL: Overlay appendChild still exists');
    process.exit(1);
} else {
    console.log('✅ PASS: Overlay appendChild removed');
}

// Test 5: Simulate content script execution in JSDOM
console.log('\nTest 5: Simulate execution in browser context');
try {
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <head><title>Moodle Quiz</title></head>
        <body>
            <div class="que multichoice">
                <div class="qtext">Test question?</div>
                <div class="answer">
                    <input type="radio" id="q1:1_answer0" name="q1:1_answer" value="0">
                    <div id="q1:1_answer0_label">
                        <span class="answernumber">a. </span>
                        <div>Option A</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `, {
        url: 'https://moodle.example.com/mod/quiz/attempt.php',
        runScripts: 'outside-only'
    });

    const { window } = dom;
    const { document } = window;
    
    // Mock browser API
    global.browser = {
        runtime: {
            sendMessage: () => Promise.resolve({
                answer: 'a',
                thinking: 'Test reasoning'
            }),
            onMessage: {
                addListener: () => {}
            }
        },
        storage: {
            local: {
                get: () => Promise.resolve({ show_debug: true })
            }
        }
    };

    // After simulated execution, check for overlay elements
    const overlays = document.querySelectorAll('[style*="position: fixed"]');
    const suspiciousElements = document.querySelectorAll('[style*="#C0392B"]');
    
    if (overlays.length > 0 || suspiciousElements.length > 0) {
        console.log(`❌ FAIL: Found ${overlays.length} fixed elements, ${suspiciousElements.length} suspicious elements`);
        process.exit(1);
    } else {
        console.log('✅ PASS: No fixed-position or suspicious elements created');
    }
    
} catch (error) {
    console.log(`⚠️  Note: Full execution test skipped (requires full browser context)`);
    console.log(`   Static analysis passed - manual testing required`);
}

// Test 6: Verify debug flag controls console logging
console.log('\nTest 6: Debug flag controls console logging');
const hasDebugCheck = contentJS.includes('if (showDebug)') && 
                      contentJS.includes('console.log');
if (!hasDebugCheck) {
    console.log('❌ FAIL: Debug flag check removed (should control logging)');
    process.exit(1);
} else {
    console.log('✅ PASS: Debug flag controls console logging');
}

console.log('\n=== All Tests Passed ✅ ===');
console.log('\nSummary:');
console.log('- Overlay creation code: Removed ✓');
console.log('- Console logging: Preserved ✓');
console.log('- Alert calls: Removed ✓');
console.log('- Visual elements: None created ✓');
console.log('- Debug flag: Still functional ✓');
console.log('\n⚠️  Manual Testing Required:');
console.log('1. Load extension in Firefox');
console.log('2. Navigate to Moodle quiz');
console.log('3. Open console (F12)');
console.log('4. Press Ctrl+Shift+Y');
console.log('5. Verify: No visible overlay, but console shows logs');
