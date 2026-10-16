/**
 * Manual verification for MockMobileMoneyAdapter mode behaviour.
 *
 * Run: node scripts/test_mock_adapter_mode.mjs
 *
 * This script verifies by source inspection:
 * 1. When VITE_MOBILE_MONEY_MODE is "live", the adapter defines an
 *    assertNotLive() helper that throws PaymentError. The throw is
 *    per-call (not at module load) so the app still loads in live mode;
 *    each payment call fails with a clear message instead.
 * 2. assertNotLive() is called from both requestPayment and
 *    getPaymentStatus, so no payment can be processed in live mode.
 * 3. persist() and setSandboxUser() both guard on PERSIST_TO_LOCAL_STORAGE,
 *    so live mode never writes to localStorage.
 * 4. PERSIST_TO_LOCAL_STORAGE is only true for unset/empty/sandbox.
 * 5. No reference to VITE_MOBILE_MONEY_ENDPOINT (removed).
 *
 * The mock adapter uses import.meta.env which is Vite-specific, so a
 * runtime import in plain Node is not practical. Source inspection is
 * sufficient because the mode check is a top-level constant plus a
 * helper called at the start of each payment method.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const adapterPath = join(__dirname, "..", "src", "integrations", "mobile-money", "MockMobileMoneyAdapter.ts");
const src = readFileSync(adapterPath, "utf-8");

let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) {
    passed++;
    console.log(`PASS: ${label}`);
  } else {
    failed++;
    console.log(`FAIL: ${label}`);
    if (detail) console.log(`  ${detail}`);
  }
}

// 1. Live mode defines an assertNotLive() helper that throws PaymentError.
//    The throw is per-call (inside the helper), not at module load, so the
//    app still loads in live mode. Each payment call fails with a clear message.
const hasAssertNotLive = /function\s+assertNotLive\(\):\s*void\s*\{\s*if\s*\(LIVE_MODE\)\s*\{\s*throw\s+new\s+PaymentError\(/.test(src);
assert("live mode defines assertNotLive() that throws PaymentError", hasAssertNotLive,
  "Expected: function assertNotLive(): void { if (LIVE_MODE) { throw new PaymentError(...) } }");

// LIVE_MODE flag must be derived from MODE at module load.
const hasLiveModeFlag = /const\s+LIVE_MODE\s*=\s*MODE\s*===\s*["']live["']/.test(src);
assert("LIVE_MODE flag derived from MODE", hasLiveModeFlag,
  "Expected: const LIVE_MODE = MODE === 'live'");

// 2. assertNotLive() is called from both requestPayment and getPaymentStatus,
//    so no payment can be processed in live mode.
const assertCalls = (src.match(/assertNotLive\(\)/g) || []).length;
assert("assertNotLive() called from both payment methods", assertCalls >= 2,
  `Expected >= 2 calls, found ${assertCalls}`);
const requestPaymentCalls = /async\s+requestPayment[\s\S]*?assertNotLive\(\)/.test(src);
const getPaymentStatusCalls = /async\s+getPaymentStatus[\s\S]*?assertNotLive\(\)/.test(src);
assert("assertNotLive() called inside requestPayment", requestPaymentCalls);
assert("assertNotLive() called inside getPaymentStatus", getPaymentStatusCalls);

// 3. persist() guards on PERSIST_TO_LOCAL_STORAGE.
const persistGuard = /function persist\(\):\s*void\s*\{\s*if\s*\(!PERSIST_TO_LOCAL_STORAGE\)\s*return/.test(src);
assert("persist() guards on PERSIST_TO_LOCAL_STORAGE", persistGuard);

// 4. setSandboxUser() guards on PERSIST_TO_LOCAL_STORAGE.
const setUserGuard = /export function setSandboxUser\([^)]*\):\s*void\s*\{\s*if\s*\(!PERSIST_TO_LOCAL_STORAGE\)/.test(src);
assert("setSandboxUser() guards on PERSIST_TO_LOCAL_STORAGE", setUserGuard);

// 5. PERSIST_TO_LOCAL_STORAGE is only true for unset/empty/sandbox.
const persistFlag = /PERSIST_TO_LOCAL_STORAGE\s*=\s*\(MODE\s*===\s*undefined\s*\|\|\s*MODE\s*===\s*["']["']\s*\|\|\s*MODE\s*===\s*["']sandbox["']\)/.test(src);
assert("PERSIST_TO_LOCAL_STORAGE only true for sandbox", persistFlag);

// 6. No reference to VITE_MOBILE_MONEY_ENDPOINT (removed).
assert("no VITE_MOBILE_MONEY_ENDPOINT reference", !src.includes("VITE_MOBILE_MONEY_ENDPOINT"),
  "VITE_MOBILE_MONEY_ENDPOINT should have been removed");

console.log("");
console.log("=== SUMMARY ===");
console.log(`Total:  ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log("RESULT: FAIL");
  process.exit(1);
}
console.log("RESULT: PASS");
