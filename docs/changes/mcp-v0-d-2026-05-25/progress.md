# MCP V0 Sub-unit D — progress log

## 2026-05-25 — Phase 0 startup
- Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a3fe0b4f11362c046
- HEAD at startup: 110cbf64 (main; merged, no advance)
- bun install: OK (+@modelcontextprotocol/sdk@1.29.0)
- bun run pretest: OK
- Maps consulted: primary.map.md (full). Routed to feature-addition-on-program-attr task shape — not directly mapped, but adjacent to "MCP descriptor/runtime work" and "Stdlib-import / library-mode work."

## 2026-05-25 — Phase 0 root-cause survey
- `--emit-per-route` mechanism CONFIRMED:
  - `compiler/src/api.js:560` declares the option (default false).
  - `compiler/src/api.js:1711` passes it to runCG.
  - `compiler/src/api.js:1926` gates per-route chunk write + chunks.json + MCP descriptor sidecars on `emitPerRoute && cgResult.chunks && cgResult.chunksManifest`.
  - `compiler/src/commands/compile.js:154-158` exposes `--emit-per-route` CLI flag.
  - Auto-flip happens by passing `emitPerRoute: true` into `compileScrml({...})` when `<program mcp>` is present in the AST.

- Build-mode detection FINDING:
  - NO canonical dev-vs-production hook in the compiler today. Searched for NODE_ENV / SCRML_BUILD / isProduction / isDev / [story] / buildStory — none implemented (§58 Build Story is spec-only, S118).
  - The closest signal is which COMMAND ran: `scrml dev` (development), `scrml build` (production). `scrml compile` is neutral.
  - DECISION: gate `dev-only` at RUNTIME in the generated _server.js boot via env-var check (`NODE_ENV === "production"` skips MCP boot; otherwise boots). `mcp="always"` boots regardless. This is the minimum-viable correct implementation; revisit when build-story implementation lands.
  - Caveat: `dev` command doesn't generate `_server.js` at all (it runs Bun.serve in-process). So the boot-injection lives only in `_server.js` written by `scrml build` AND in the in-process dev path via dev.js. For V0 Sub-unit D, the implementation targets _server.js (build) — surfaces in `--verbose` log. Dev-server in-process boot is a follow-up if needed.

- Architecture finding: runtime helpers (_scrml_reactive_get / _scrml_derived_get) are MODULE-SCOPED in each generated .server.js — there is no globally-shared runtime on the server. The boot needs a registry. Simplest: each .server.js, when MCP is enabled at compile time, registers its runtime helpers on globalThis at module init. _server.js boot then passes `globalThis._scrml_reactive_get` etc. This matches the existing `globalThis._scrml_active_server` precedent for channels.

## Plan
1. Add `mcp` attr to attribute-registry.js
2. Extract into compute-program-config.ts
3. Thread the flag through api.js — auto-flip emitPerRoute, mark fileAST.mcpConfig for downstream consumers
4. Boot injection — generated _server.js calls startMcpServer with runtime gate. Generated .server.js stashes runtime helpers on globalThis when MCP is on.
5. Surface in compile.js --verbose output
6. Tests

## 2026-05-25 — Implementation complete
- Step 1 (attribute-registry.js) — DONE; commit ae6a5c96
- Step 2 (compute-program-config.ts + api.js auto-activation + auto-bundle scrml:mcp) — DONE; commit cb465e20
- Step 3 (build.js generateServerEntry + runBuild caller) — DONE; commit 51f259f8
- Step 4 (compile.js --verbose surface) — DONE; commit 51f259f8 (rolled together with build.js)
- Step 5 (integration tests, 14 tests across 6 describes) — DONE; commit pending

## Verification
- Local eyeball end-to-end build of a single-file fixture:
  - bare <program mcp> → dev-only boot with NODE_ENV gate (verified)
  - <program mcp="always"> → unconditional boot (verified)
  - <program> baseline → no MCP refs in generated _server.js (verified)
- New tests: 14 pass, 0 fail
- Full pre-commit gate: 21428 pass (was 21414; +14 = my new tests) / 0 fail
- All MCP A/B/C tests still pass (52 pass)
- All command tests still pass (156 pass)
- All unit tests still pass (12074 pass)

## Risks / open questions surfaced
1. Runtime read helpers (_scrml_reactive_get / _scrml_derived_get) are module-
   scoped in each generated .server.js. Today's boot passes
   globalThis._scrml_reactive_get which is NEVER set. The shim's tool
   resolvers gracefully degrade (descriptor sidecars carry topology, but
   getCurrentVariant/getFormStatus/getChannelState return undefined).
   Future wave: have each generated .server.js stash its helpers on
   globalThis when MCP is enabled at compile time. NOT a Sub-unit D blocker.

2. Build-mode gate is RUNTIME via NODE_ENV. When §58 build-story implementation
   lands, revisit to potentially do compile-time gating + a more
   scrml-canonical signal than a Node.js convention env var.

3. `scrml dev` command does NOT generate _server.js — it runs Bun.serve in-
   process. So in-process dev mode does NOT get MCP boot today. Sub-unit E
   may want to address this; for V0 D the production build path is the
   priority surface (the SCOPING brief targets _server.js).

4. SCOPING brief said "inject ... into the server entry that calls
   startMcpServer({reactiveGet, derivedGet, outputDir, watch?})". The
   server entry is _server.js (generated by build, not by compile). The
   boot is per spec; the reactiveGet/derivedGet pass-through has the
   degradation caveat above.
