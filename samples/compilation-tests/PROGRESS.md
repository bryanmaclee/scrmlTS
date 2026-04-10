# Compilation Test Suite Progress

**Date:** 2026-03-28
**Status:** COMPLETE - 180/180 samples compiling (100%)

## Summary

Created 180 scrml samples covering every aspect of the language that the compiler currently accepts. All 180 compile successfully through the full 8-stage pipeline.

## Sample Counts by Category

| Category | Count | Status |
|----------|-------|--------|
| Basic Markup (basic-*) | 15 | All pass |
| Logic Contexts (logic-*) | 15 | All pass |
| Reactive State (reactive-*) | 15 | All pass |
| Control Flow (control-*) | 15 | All pass |
| Functions & Events (func-*) | 15 | All pass |
| Lift Keyword (lift-*) | 10 | All pass |
| SQL Queries (sql-*) | 10 | All pass |
| Server/Client (server-*) | 10 | All pass |
| Type System (type-*) | 15 | All pass |
| Components/UI (comp-*) | 15 | All pass |
| Combined Features (combined-*) | 20 | All pass |
| CSS Inline (css-*) | 5 | All pass |
| Meta Blocks (meta-*) | 5 | All pass |
| Error Effects (error-*) | 5 | All pass |
| Edge Cases (edge-*) | 10 | All pass |
| **Total** | **180** | **100% pass** |

## Compiler Bugs Found and Fixed

### Bug 1: E-DG-002 false positive treated as error (severity field ignored)
- **File:** `src/index.js`
- **Issue:** The dependency graph stage emits E-DG-002 (unused reactive variable) with `severity: "warning"`, but the pipeline only checked error code prefix `W-` to filter warnings. E-DG-002 was treated as a hard error even though it's a warning.
- **Fix:** Updated `collectErrors()` to check both `e.code?.startsWith("W-")` and `e.severity === "warning"`.

### Bug 2: Error message "undefined" in pipeline output
- **File:** `src/index.js`
- **Issue:** `collectErrors()` used `{ stage, ...e }` to spread Error-derived objects. Since `message` is a prototype property on Error subclasses (TABError, etc.), the spread didn't capture it, leading to "undefined" in error output.
- **Fix:** Explicitly copy `code`, `message`, and `severity` before spreading.

### Bug 3: `@reactive` variables not accepted in attribute values
- **File:** `src/tokenizer.js`
- **Issue:** The attribute tokenizer (`tokenizeAttributes()`) only recognized `[A-Za-z_]` as the start of an unquoted attribute value. The `@` sigil (used for reactive variable references like `if=@step`) was not in that character class, causing E-ATTR-001 errors.
- **Fix:** Added `@` to the attribute value start pattern and the identifier continuation pattern.

### Bug 4: `//` comment suppression fires inside quoted strings
- **File:** `src/block-splitter.js`
- **Issue:** The `//` comment check at the top of the scan loop fired unconditionally, even when the scanner was inside a double-quoted or single-quoted string. URLs like `https://example.com` inside string literals triggered false comment detection, causing unclosed context errors.
- **Fix:** Added `&& !inDoubleQuote && !inSingleQuote` guard to the comment detection check.

## Sample Fixes (not compiler bugs)

- `//` used as double inferred closer (e.g., `<li><a>text//`) is treated as a comment by the block splitter. This is by-design behavior. Fixed samples to use explicit closers: `</a></li>`.
- `< db>` state blocks require `tables=` attribute (enforced by PA stage). Fixed samples to include this.
- `< db>` state blocks require `src=` to point to an existing SQLite file. Created `test.db` with schema for test samples.

## Test Suite Status

All 832 existing unit tests pass after the compiler fixes:
```
832 pass, 0 fail, 2308 expect() calls
```

## Infrastructure

- `test.db` — SQLite database with tables: users, posts, comments, orders, sessions, articles, logs
- `create-test-db.js` — Script to recreate the test database
- `run-all.js` — Script to compile all samples and report results
