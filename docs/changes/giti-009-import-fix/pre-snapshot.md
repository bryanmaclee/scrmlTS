# Pre-Snapshot: giti-009-import-fix

## Test State
- bun test: 7,498 pass / 40 skip / 0 fail
- 27,078 expect() calls across 349 files

## Reproducer State
- Reproducer compiles without errors
- Generated server.js contains: `import { helper } from "./repro-06-relative-imports-helper.js";`
- This path resolves from source location (correct) but NOT from output location (bug)

## E2E State
- Not applicable (this is a codegen path rewriting issue, not a runtime compilation error)

## Pre-existing Failures
- None observed
