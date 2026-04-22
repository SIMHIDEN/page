const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

console.log("--- TEST V1: Integrity Check ---");

// 1. Verify Plaintext Code
const backgroundPath = path.join(__dirname, '../background.js');
const popupPath = path.join(__dirname, '../popup.js');
const popupHtmlPath = path.join(__dirname, '../popup.html');

if (!fs.existsSync(backgroundPath)) throw new Error("background.js missing");
const bgContent = fs.readFileSync(backgroundPath, 'utf8');

if (bgContent.includes('nacl.sign.detached.verify')) {
    console.warn("WARN: background.js contains signature verification logic (unexpected for V1).");
} else {
    console.log("PASS: background.js is plaintext/unprotected as expected for V1.");
}

// 2. Verify UI Unlocked (No License Logic)
// Mock Browser API
const mockStorage = {};
const mockBrowser = {
    storage: {
        local: {
            get: (keys, cb) => {
                const res = {};
                if (Array.isArray(keys)) keys.forEach(k => res[k] = mockStorage[k]);
                else res[keys] = mockStorage[keys];
                if (cb) cb(res);
                return Promise.resolve(res);
            },
            set: (obj, cb) => {
                Object.assign(mockStorage, obj);
                if (cb) cb();
                return Promise.resolve();
            }
        }
    }
};
global.browser = mockBrowser;
global.chrome = mockBrowser;

// Load popup.js logic via JSDOM
// Using actual popup.html content to ensure ID matches
const popupHtml = fs.readFileSync(popupHtmlPath, 'utf8');

const dom = new JSDOM(popupHtml);

global.document = dom.window.document;
global.window = dom.window;

// Check if input is password type
const apiKeyInput = document.getElementById('apiKey');
if (apiKeyInput.type !== 'password') {
    throw new Error("FAIL: apiKey input should be type='password' (from previous task). Found: " + apiKeyInput.type);
} else {
    console.log("PASS: apiKey input is masked (type='password').");
}

// Load popup.js
const popupJsContent = fs.readFileSync(popupPath, 'utf8');

// We expect NO license locking logic.
if (popupJsContent.includes('lockUI') || popupJsContent.includes('license_key')) {
    console.warn("WARN: popup.js contains license logic (unexpected for V1).");
} else {
    console.log("PASS: popup.js has no license locking logic.");
}

// 3. Verify Settings Save (Functional Test)
// Eval popup.js
try {
    // Need to clean up popup.js content if it references things JSDOM doesn't support or if it uses 'const' which might conflict if we run this multiple times.
    // Assuming clean run.
    
    // Wrap in IIFE
    // const script = new Function('require', popupJsContent);
    // Use eval directly
    eval(popupJsContent);

    // Trigger DOMContentLoaded
    const event = new dom.window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
    
    // Simulate user entering key
    apiKeyInput.value = "gsk_test_key_123";
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.click();

    // Wait for async storage
    setTimeout(() => {
        if (mockStorage.groq_key === "gsk_test_key_123") {
            console.log("PASS: Settings saved correctly (Groq Key).");
        } else {
            console.error("FAIL: Settings not saved. Storage:", mockStorage);
            process.exit(1);
        }
        
        console.log("\n--- V1 TESTS COMPLETE ---");
    }, 200);

} catch (e) {
    console.error("Error executing popup.js:", e);
    process.exit(1);
}
