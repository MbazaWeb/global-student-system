#!/bin/bash
# Shared test helpers for GSS SQL test suites.
# Sourced by guardian_access_test.sh and extended_access_test.sh.
#
# Provides:
#   - Database connection setup from env vars with defaults.
#   - run_as <uid> <sql>  — run SQL as an authenticated user (SET + JWT claim).
#   - run_raw <sql>       — run SQL as superuser (no auth context).
#   - Assertion helpers: assert_denied, assert_count, assert_ok, assert_uuid,
#     assert_json, assert_null, assert_contains.
#   - Summary printing and non-zero exit on failure.

# ---------------------------------------------------------------------------
# Database connection from env with defaults. PGPASSWORD must be set by caller.
# ---------------------------------------------------------------------------
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-tester}"
PGDATABASE="${PGDATABASE:-gss}"

if [ -z "${PGPASSWORD:-}" ]; then
  echo "FATAL: PGPASSWORD must be set." >&2
  exit 2
fi

P="psql -X -tA -q -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE"

# ---------------------------------------------------------------------------
# Counters
# ---------------------------------------------------------------------------
PASSED=0
FAILED=0

# ---------------------------------------------------------------------------
# run_as <uid> <sql>
# Runs SQL as an authenticated user. Sets role to authenticated and the JWT
# claim sub to the given uid. Uses SET (not select set_config) so no extra
# output pollutes the result. Returns combined stdout+stderr.
# ---------------------------------------------------------------------------
run_as() {
  $P -v ON_ERROR_STOP=0 <<SQL 2>&1
set role authenticated;
set request.jwt.claim.sub to '$1';
$2
SQL
}

# ---------------------------------------------------------------------------
# run_raw <sql>
# Runs SQL as the superuser with no auth context. auth.uid() returns null.
# Used for unauthenticated function-call tests and direct table operations.
# ---------------------------------------------------------------------------
run_raw() {
  $P -v ON_ERROR_STOP=0 <<SQL 2>&1
$1
SQL
}

# ---------------------------------------------------------------------------
# Capture a single value from run_as output. Returns the last non-empty line
# that is NOT the set_config output (which is suppressed by SET, but kept as
# a safety net). Used when a UUID or scalar must be captured for later tests.
# ---------------------------------------------------------------------------
capture() {
  grep -v '^$' | tail -1
}

# ---------------------------------------------------------------------------
# Assertions. Each takes a label, the expectation, and the actual output.
# Prints PASS/FAIL and increments counters.
# ---------------------------------------------------------------------------

# Assert the output contains an ERROR line with the given message fragment.
assert_denied() { # assert_denied <label> <message-fragment> <output>
  local label="$1" frag="$2" output="$3"
  if echo "$output" | grep -qi "ERROR:.*$frag"; then
    PASSED=$((PASSED + 1))
    echo "PASS: $label"
  else
    FAILED=$((FAILED + 1))
    echo "FAIL: $label"
    echo "  expected: ERROR containing '$frag'"
    echo "  actual:   $output" | head -5
  fi
}

# Assert the output is a number satisfying <op> <n>. op: eq, ge, gt, le, lt.
assert_count() { # assert_count <label> <op> <n> <output>
  local label="$1" op="$2" n="$3" output="$4"
  local actual
  actual=$(echo "$output" | grep -E '^[0-9]+$' | tail -1)
  if [ -z "$actual" ]; then
    FAILED=$((FAILED + 1))
    echo "FAIL: $label"
    echo "  expected: numeric $op $n"
    echo "  actual:   non-numeric: $(echo "$output" | head -3)"
    return
  fi
  local ok=0
  case "$op" in
    eq) [ "$actual" -eq "$n" ] && ok=1 ;;
    ge) [ "$actual" -ge "$n" ] && ok=1 ;;
    gt) [ "$actual" -gt "$n" ] && ok=1 ;;
    le) [ "$actual" -le "$n" ] && ok=1 ;;
    lt) [ "$actual" -lt "$n" ] && ok=1 ;;
    *)  echo "BUG: unknown op '$op'" >&2; exit 2 ;;
  esac
  if [ "$ok" = 1 ]; then
    PASSED=$((PASSED + 1))
    echo "PASS: $label (got $actual)"
  else
    FAILED=$((FAILED + 1))
    echo "FAIL: $label"
    echo "  expected: $actual $op $n"
  fi
}

# Assert the output has no ERROR line.
assert_ok() { # assert_ok <label> <output>
  local label="$1" output="$2"
  if echo "$output" | grep -qi 'ERROR:'; then
    FAILED=$((FAILED + 1))
    echo "FAIL: $label"
    echo "  expected: no error"
    echo "  actual:   $(echo "$output" | head -5)"
  else
    PASSED=$((PASSED + 1))
    echo "PASS: $label"
  fi
}

# Assert the output contains a line matching a UUID pattern.
assert_uuid() { # assert_uuid <label> <output>
  local label="$1" output="$2"
  local actual
  actual=$(echo "$output" | grep -E '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' | tail -1)
  if [ -n "$actual" ]; then
    PASSED=$((PASSED + 1))
    echo "PASS: $label ($actual)"
  else
    FAILED=$((FAILED + 1))
    echo "FAIL: $label"
    echo "  expected: UUID"
    echo "  actual:   $(echo "$output" | head -3)"
  fi
}

# Assert the output contains a line starting with { (JSON object).
assert_json() { # assert_json <label> <output>
  local label="$1" output="$2"
  if echo "$output" | grep -qE '^\{'; then
    PASSED=$((PASSED + 1))
    echo "PASS: $label"
  else
    FAILED=$((FAILED + 1))
    echo "FAIL: $label"
    echo "  expected: JSON object"
    echo "  actual:   $(echo "$output" | head -3)"
  fi
}

# Assert the output's last non-empty line is 't' (for `is null` queries)
# or empty (for `select null` queries).
assert_null() { # assert_null <label> <output>
  local label="$1" output="$2"
  local last
  last=$(echo "$output" | grep -v '^$' | tail -1)
  if [ "$last" = "t" ] || [ -z "$last" ]; then
    PASSED=$((PASSED + 1))
    echo "PASS: $label"
  else
    FAILED=$((FAILED + 1))
    echo "FAIL: $label"
    echo "  expected: null (t or empty)"
    echo "  actual:   $last"
  fi
}

# Assert the output contains the given string fragment (case-insensitive).
assert_contains() { # assert_contains <label> <fragment> <output>
  local label="$1" frag="$2" output="$3"
  if echo "$output" | grep -qiF "$frag"; then
    PASSED=$((PASSED + 1))
    echo "PASS: $label"
  else
    FAILED=$((FAILED + 1))
    echo "FAIL: $label"
    echo "  expected: contains '$frag'"
    echo "  actual:   $(echo "$output" | head -3)"
  fi
}

# ---------------------------------------------------------------------------
# Print summary and exit. Call at the end of every test script.
# ---------------------------------------------------------------------------
print_summary() {
  local total=$((PASSED + FAILED))
  echo ""
  echo "=== SUMMARY ==="
  echo "Total:  $total"
  echo "Passed: $PASSED"
  echo "Failed: $FAILED"
  if [ "$FAILED" -gt 0 ]; then
    echo "RESULT: FAIL"
    exit 1
  fi
  echo "RESULT: PASS"
  exit 0
}
