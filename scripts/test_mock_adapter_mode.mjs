/**
 * Manual verification for MockMobileMoneyAdapter mode behaviour.
 *
 * Run: node scripts/test_mock_adapter_mode.mjs
 *
 * This script verifies by source inspection:
 * 1. When VITE_MOBILE_MONEY_MODE is "live", the adapter throws at module
 *    load before any function is called.
 * 2. The throw happens before PERSIST_TO_LOCAL_STORAGE is set.
 * 3. persist() and setSandboxUser() both guard on PERSIST_TO_LOCAL_STORAGE.
 * 4. PERSIST_TO_LOCAL_STORAGE is only true for unset/empty/sandbox.
 * 5. No reference to VITE_MOBILE_MONEY_ENDPOINT (removed).
 *
 * The mock adapter uses import.meta.env which is Vite-specific, so a
 * runtime import in plain Node is not practical. Source inspection is
 * sufficient because the mode check is a top-level if/throw that runs
 * before any other code in the module.
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

// 1. Live mode throws at module load.
const hasLiveThrow = /if\s*\(MODE\s*===\s*["']live["']\)\s*\{[^}]*throw/.test(src);
assert("live mode throws at module load", hasLiveThrow,
  "Expected: if (MODE === 'live') { throw ... }");

// 2. The throw happens before PERSIST_TO_LOCAL_STORAGE is set.
const throwPos = src.indexOf('if (MODE === "live")');
const persistPos = src.indexOf("PERSIST_TO_LOCAL_STORAGE");
assert("live-mode throw is before persistence flag", throwPos > 0 && throwPos < persistPos,
  `throw at ${throwPos}, persist at ${persistPos}`);

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
