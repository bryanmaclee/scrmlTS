# Progress: websocket-cli-batch

- [start] Tier: T2 Standard. 6 bugs identified across dev.js and emit-channel.ts.
- [start] Baseline: 5,549 pass, 2 skip, 0 fail.
- [start] Branch: changes/websocket-cli-batch (to be created by runner with Bash access)
- [analysis] Bash tool denied in this agent session. All fixes written via Write tool.
- [fixes written] All 6 bugs fixed and written to source files.
- [tests written] channel.test.js: §16 corrected + §21-23 added (13 new tests).
- [tests written] build-adapters.test.js: §38 WS channel section added (8 new tests).
- [sample written] samples/compilation-tests/channel-basic.scrml created.

## Bug Catalog

### Bug 1 — CRITICAL: `Bun.readdir` does not exist (dev.js)
- File: compiler/src/commands/dev.js line 146 (original)
- `Bun.readdir(outputDir)` — Bun has no such API. Catch silently swallows error.
- Effect: loadServerRoutes always returns early. No routes, no WS handlers ever load.
- Fix: `readdirSync(outputDir)` (already imported from "fs").
- Status: FIXED
- Tier: T1

### Bug 2 — CRITICAL: `routes.push(...)` instead of exported constant (emit-channel.ts)
- File: compiler/src/codegen/emit-channel.ts lines 265-280 (original)
- `emitChannelServerJs` emitted `routes.push({...})` — `routes` never declared in .server.js.
- Effect: ReferenceError at runtime when _server.js imports channel's .server.js.
- Fix: `export const _scrml_route_ws_<safeName> = { path, method, isWebSocket, handler }`.
- Status: FIXED
- Tier: T1

### Bug 3 — WebSocket URL hardcodes `ws://` scheme (emit-channel.ts)
- File: compiler/src/codegen/emit-channel.ts line 191 (original)
- `ws://${location.host}/...` breaks on HTTPS.
- Fix: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/...`
- Status: FIXED
- Tier: T1

### Bug 4 — `onclient:` handlers not wired in client JS (emit-channel.ts)
- File: compiler/src/codegen/emit-channel.ts (original emitChannelClientJs)
- Used `extractChannelHandlers` (reads `onserver:*`) for browser ws.onopen/ws.onmessage.
- Effect: onclient:open/close/error silently ignored; onserver:open wired to browser.
- Fix: Added `extractClientHandlers` reading `onclient:open/close/error`.
  Use for ws.onopen/ws.onclose/ws.onerror in client IIFE.
- Status: FIXED
- Tier: T1

### Bug 5 — `close(ws)` missing `code, reason` params (emit-channel.ts)
- File: compiler/src/codegen/emit-channel.ts line 341 (original)
- Emitted `close(ws)` but Bun calls `close(ws, code, reason)`.
- Effect: onserver:close cannot access close code/reason.
- Fix: Emit `close(ws, code, reason)`.
- Status: FIXED
- Tier: T1

### Bug 6 — §16 test asserts wrong behavior (channel.test.js)
- File: compiler/tests/unit/channel.test.js lines 607-611 (original)
- Tests asserted `routes.push` — now must assert `export const _scrml_route_ws_chat`.
- Fix: Updated §16 tests. Added regression §21 (Bug 3), §22 (Bug 4), §23 (Bug 5).
- Also added build-adapters §38 section (8 tests for WS channel discovery + entry gen).
- Status: FIXED
- Tier: T1

## Files Modified
- compiler/src/commands/dev.js (Bug 1)
- compiler/src/codegen/emit-channel.ts (Bugs 2, 3, 4, 5)
- compiler/tests/unit/channel.test.js (Bug 6 + §21-23 regression tests, 13 new tests)
- compiler/tests/commands/build-adapters.test.js (§38 WS regression tests, 8 new tests)
- samples/compilation-tests/channel-basic.scrml (new E2E test sample)
- docs/changes/websocket-cli-batch/pre-snapshot.md
- docs/changes/websocket-cli-batch/progress.md (this file)

## Test Count Expectation
- Baseline: 5,549 pass, 2 skip, 0 fail
- After fix: 5,570+ pass, 2 skip, 0 fail
  (52 channel tests → 65 channel tests: +13)
  (44 build-adapter tests → 52 build-adapter tests: +8)
  (Total new: +21)
- Note: §16 tests changed behavior — now assert correct output. No regressions.

## Pending (requires Bash access — git + bun test)
- [ ] git checkout -b changes/websocket-cli-batch  (from main)
- [ ] git add compiler/src/commands/dev.js
  git commit -m "fix(websocket-cli-batch): Bug 1 — replace Bun.readdir with readdirSync"
- [ ] git add compiler/src/codegen/emit-channel.ts
  git commit -m "fix(websocket-cli-batch): Bugs 2-5 — route export, URL scheme, onclient:, close sig"
- [ ] git add compiler/tests/unit/channel.test.js compiler/tests/commands/build-adapters.test.js
  git commit -m "test(websocket-cli-batch): Bug 6 — fix §16 assertions + add §21-23 regression tests"
- [ ] git add samples/compilation-tests/channel-basic.scrml docs/changes/websocket-cli-batch/
  git commit -m "WIP(websocket-cli-batch): add channel sample + artifacts"
- [ ] bun test compiler/tests/ — verify 5570+ pass, 0 fail
- [ ] Compile channel-basic.scrml and verify output:
    node compiler/src/index.js samples/compilation-tests/channel-basic.scrml
    OR: bun compiler/src/cli.js compile samples/compilation-tests/channel-basic.scrml
    Expected in .server.js: export const _scrml_route_ws_chat
    Expected in .server.js: export const _scrml_ws_handlers  
    Expected in .server.js: close(ws, code, reason)
    Expected in client JS: location.protocol === 'https:'
    Expected in client JS: onclient:open wired (if present in source)
    NOT expected: routes.push anywhere
    NOT expected: ws:// hardcoded
- [ ] Write anomaly report
- [ ] Present for user merge approval

## CHECKPOINT (for next agent if crash occurs)
All code fixes are written to disk. No commits yet (Bash denied).
To resume: create branch, run bun test, commit.
If tests fail, check:
  1. emit-channel.ts §22 test: node has makeCallAttr("onclient:open", ...) not "onserver:open"
  2. §16 tests now assert "export const _scrml_route_ws_" not "routes.push"
  3. §23 tests assert "close(ws, code, reason)" in emitChannelWsHandlers output
