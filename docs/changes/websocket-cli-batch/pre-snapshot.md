# Pre-Snapshot: websocket-cli-batch

Recorded before any code changes.

## Test State (bun test compiler/tests/)
- 5,549 pass
- 2 skip
- 0 fail
- 23,566 expect() calls
- 242 files

## Channel Tests (bun test compiler/tests/unit/channel.test.js)
- 52 pass, 0 fail
- Note: §16 tests pass because they assert the WRONG behavior (`routes.push`).
  These tests are wrong — they will need updating as part of Bug 2/6 fix.

## Build Adapter Tests (bun test compiler/tests/commands/build-adapters.test.js)
- 44 pass, 0 fail

## Known Pre-Existing Issues (not regressions)
- channel.test.js §16: tests assert `routes.push` and `isWebSocket: true` in
  emitChannelServerJs output — this is the BUG. Tests are wrong, will change.
- No existing channel samples in samples/compilation-tests/
