# Pre-Snapshot: lin-batch-c-step1

Recorded: 2026-04-11, before any code changes.

## Unit Tests (bun test compiler/tests/unit/type-system.test.js)

- 234 pass, 0 fail
- Lin unit tests (§33–§37, B1–B5) all passing via direct checkLinear calls

## Integration Tests (bun test compiler/tests/integration/)

- 23 pass, 3 fail (pre-existing), 1 error (pre-existing)
- Failures are NOT related to lin enforcement:
  - Self-host: block-splitter parity > compiled bs.js exists (missing artifact)
  - Self-host: tokenizer parity > compiled tab.js exists (missing artifact)
  - 1 unhandled error: Cannot find package 'acorn' from expression-parser.ts
- There are no integration tests for lin enforcement at all (the gap this change addresses)

## Gap State Confirmed

- `fileAST.linNodes` is never populated by ast-builder.js
- TS-G entry at type-system.ts:4263-4265 reads `linNodes`, which is always empty
- Result: `bun scrml compile file.scrml` never emits E-LIN-001/002/003 errors
- Unit tests pass only because they call checkLinear directly with hand-crafted AST nodes

## Tags
#scrmlTS #lin #pre-snapshot #lin-batch-c-step1

## Links
- [progress.md](./progress.md)
- [compiler/src/type-system.ts](../../compiler/src/type-system.ts)
