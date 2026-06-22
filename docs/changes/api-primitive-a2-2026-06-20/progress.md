# A2 W3 — `<api>` TYPER wave — progress

change-id: api-primitive-a2-2026-06-20 · wave W3 (type-system; resolve + CHECK, NO codegen)

## 2026-06-20 — startup
- Worktree verified at .claude/worktrees/agent-a80f17c2cb0c3c4bc; git clean; merge main already up to date.
- W2 api-decl node present (ast-builder.js, 3 hits); SPEC §60 present (line 32909).
- bun install + bun run pretest green.
- SPEC §60 read in full. SCOPE doc read (W3 is the type-system wave).
- W2 node shape confirmed via probe: ast.nodes carries `{kind:"api-decl", base, src, endpoints:[{name,reqShape?,method,path,responseType,span}]}`.
  reqShape/responseType are RAW type-ref text (null when absent).
- `<request api=X args=...>` ALREADY captures api=/args= in the generic markup `attrs` array
  (api= → string-literal value; args= → variable-ref w/ exprNode). No new PARSE code needed — typer reads existing attrs.
- api-decl survives CE into the typer (post-CE top kinds include "api-decl").
- §60.6 client-only ALREADY satisfied: a valid <api>+<request api=> app compiles exit-0 with NO serverJs
  (probe confirmed serverJs absent). <api> is not a §12.2 escalation trigger.

## Plan (TS-API pass in processFile, after TS-J)
1. Resolve endpoint reqShape/responseType via resolveTypeExpr; fire E-TYPE-UNKNOWN-NAME on undeclared type-refs
   (reuse forEachTypeNameLeaf + isUnrecognizedTypeNameAtom).
2. E-API-PATH-PARAM-UNBOUND — each `${param}` in path must be a field of the resolved reqShape struct.
3. <request api=X args=...>: E-API-ENDPOINT-UNKNOWN (X not declared); E-API-REQ-SHAPE-MISMATCH (args type vs reqShape).
4. §12.2 client-only confirming test.
5. §34 rows for the 3 new codes; §60.9 mark wired.

## 2026-06-20 — implementation DONE
- c89925a5 — checkApiDeclarations TS-API pass in type-system.ts (after TS-J in processFile):
  - Pass 1: collect api-decl nodes → per-file endpoint registry (first-name-wins).
  - Pass 2: resolve reqShape/responseType via resolveTypeExpr; undeclared → E-TYPE-UNKNOWN-NAME
    (reuse forEachTypeNameLeaf + isUnrecognizedTypeNameAtom, exempt = imported + machine names).
    E-API-PATH-PARAM-UNBOUND: each ${param} must be a field of the resolved reqShape struct
    (no-reqShape / non-struct reqShape → every param unbound).
  - Pass 3: deep-walk <request> markup; read EXISTING api=/args= attrs.
    E-API-ENDPOINT-UNKNOWN (api=X not in registry); E-API-REQ-SHAPE-MISMATCH (args=@cell struct
    missing a reqShape field; superset tolerated; unresolvable args → conservative skip).
  - Cell-type map deep-walks logic.body (state-decls live inside top-level logic, not file-top).
  - W2 test fixture updated (valid <api> now declares its types — W3 resolves them).
- 7976e61c — api-decl-typer.test.js (16 tests): one per code + valid-clean + §60.6 client-only.
- 56d01723 — §34 rows (3 W3 codes) + §60.9 wired + SPEC-INDEX line-range regen. §60 Nominal banner KEPT.

## Compile-verify (CLI)
- VALID  (/tmp/api-cv/valid.scrml):   `bun run compiler/src/cli.js compile valid.scrml -o out`   → exit 0;
  emits valid.client.js + valid.html + runtime; NO .server.js (pure client §60.6); NO base-URL leak.
- INVALID (/tmp/api-cv/invalid.scrml): same cmd → exit 1; fires E-API-PATH-PARAM-UNBOUND + E-API-ENDPOINT-UNKNOWN.

## DEFERRED to W4 (NOT in W3)
- The thin typed fetch callable codegen; automatic parseVariant(response, ResponseT) decode wiring;
  the actual <request> runtime integration (loading/data/error/stale + .data:ResponseT). A typed-and-
  checked <api> + <request api=> STILL emits nothing runtime at W3 (confirmed by compile-verify).

## W4 FINISH (S212, 2026-06-21 — PA-direct salvage apply + (b) honesty lint)
- Applied the crash-salvage (emit-parse-variant.ts + emit-reactive-wiring.ts + api-decl-typer.test.js) + typer-prep (type-system.ts responseEnum) off current main — ZERO drift (0 main-side commits on the 3 W4 files since base 612f92e6), 3-way clean.
- R26 verified: client `fetch(base+path)` with arg-substitution + method; full <request> reactive surface; ENUM ResponseT → parseVariant decode IIFE (→.data/::ParseError→.error); NO .server.js (client-only); node --check clean. Typer test 16/16.
- (b) RULING (user): a NON-VARIANT ResponseT was raw-passed silently (parseVariant §41.13 is variant-only). Added typer info-lint W-API-RESPONSE-NOT-VARIANT (type-system.ts checkApiDeclarations; resolved-non-enum only, excludes unknown/error/asIs — no double-report w/ E-TYPE-UNKNOWN-NAME; asIs = deliberate raw-boundary). + §34 row (Info) + §60.5 variant-vs-non-variant amendment + §60.9 wired note. +3 lint tests (19/19). SPEC-INDEX regen.
- §60 banner STAYS Nominal (W5 flips). Full suite 24821/0, within-node clean.

## W5 (S213, 2026-06-22 — tests + worked example + B-docs + §60 banner flip)
- Startup verified: worktree .claude/worktrees/agent-ac7add73304fd7c59; toplevel matches; tree clean;
  bun install + pretest green. Base HEAD ca712295.
- Maps read (primary task-shape routing: codegen + api + test). SPEC §60 read IN FULL (32913-33032) — all brief
  claims verify; §34 rows for all 7 E-API-* + W-API-RESPONSE-NOT-VARIANT ALREADY catalogued (17467-17474);
  §60.9 already documents W4 codegen as landed → banner flip + planned-framing reword only, NO new §34 rows.
- Emitted-JS shapes captured from emit-reactive-wiring.ts (api= branch ~1146-1254) + emit-parse-variant.ts:
  `// <request id="X" api="Y">` comment; `var _scrml_request_X = { loading:true, data:null, error:null, stale:false }`;
  GET → `await fetch(<base> + ... + encodeURIComponent(String(_args["id"])) + ..., { method: "GET" })`;
  POST/PUT/PATCH → method + `headers {"Content-Type":"application/json"}` + `body: JSON.stringify(_args)`;
  variant ResponseT → `var _decoded = ((_raw) => { ... switch(_v.tag) ... })(_body)` IIFE + `__scrml_error` route to .error/.data;
  non-variant → `_scrml_request_X.data = _body`. Client-only (no serverJs).
- Kickstarter v2 + anti-patterns read in full before writing scrml.

## W5 DONE (S213, 2026-06-22)
- DISCOVERY (R26 probe): a `<program>`-wrapped `<api>` (the canonical app shape) was SILENTLY broken:
  api-decl nests inside the `<program>` markup subtree, so the W4 codegen `buildApiEndpointRegistry(getNodes())`
  + the W3 typer Pass-1 (top-level-only walk, comment "the W2 parser only produces api-decl at the top") MISSED it
  → fetch dropped, responseEnum unannotated (variant raw-passed), all §60 typer checks skipped. W4 R26 "passed"
  only because the api-decl-typer.test.js fixtures are UN-wrapped (top-level api-decl).
- FIX (907cc8bc): deep-walk for api-decl in BOTH — typer (type-system.ts collectApiDecls, mirrors Pass 3 walkRequests)
  + codegen (emit-reactive-wiring.ts classifyMarkupNodes api-decl bucket → buildApiEndpointRegistry). ZERO new codes.
  Existing 39 api-decl tests stay green. R26 then GREEN: fetch(base+path)+method+arg-sub + parseVariant decode emit
  under <program>; E-API-ENDPOINT-UNKNOWN + W-API-RESPONSE-NOT-VARIANT fire under <program>.
- TESTS (64eff26e): compiler/tests/unit/api-decl-codegen.test.js — 11 cases (fetch shape, variant decode→.data/.error,
  POST JSON body, non-variant raw-pass + W-API-RESPONSE-NOT-VARIANT cross-stream, client-only no serverJs, node --check,
  + deep-walk regression: wrapped + doubly-nested <api> found, wrapped misspelled endpoint fires E-API-ENDPOINT-UNKNOWN).
- EXAMPLE (adebe1d8): examples/32-external-api.scrml — pure-client BYOB SPA, <api base=> + GET (variant) + POST (variant),
  <request api= args=@cell>. Compiles GREEN; R26 verified. + README row 32. + within-node allowlist re-baseline (new
  fixture, printed raw, printed key order). VERIFIED.md untouched.
- B-DOCS (committed): docs/adopter/byob-external-api.md — the five mandated points (BYOB path / adopter-owns-type-sync no
  migrate lever / untyped-silent-vs-typed-loud drift / prefer full-stack scrml / SSR-of-external-data structural gap NOT
  closeable in A2). + render-bridge limit + §34 code table. Cross-links §60.
- SPEC (committed): §60 banner Nominal → Implemented; §60.9 planned→wired framing; SPEC-INDEX §60 row Implemented.
  NO new §34 rows (all 7 E-API-* + W-API-RESPONSE-NOT-VARIANT already catalogued). known-gaps.md untouched.

## SURFACED TO PA (out of W5 scope)
- The §6.7.7 `<#id>.loading`/`.data`/`.error` MARKUP RENDER BRIDGE for `<request>` is UNWIRED (pre-existing,
  affects url= AND api= modes, untracked). Root: (1) the request state var `_scrml_request_<id>` is NEVER registered
  into `_scrml_input_state_registry` that `<#id>` markup refs resolve to → registry.get returns undefined → throws;
  (2) an input-state-ref is not detected as a reactive dep → the render binding never effect-wraps → no reactive update;
  (3) `if=<#id>.X` attribute → E-SCOPE-001; `<match on=<#id>.data>` → E-CODEGEN-INVALID-JS; `const <x> = <#id>.data`
  → file-scope `_scrml_input_state_registry.get("id").data` runs BEFORE the request var exists → module-init throw.
  So the worked example renders a STATIC status shell, not a live <match>/<engine> over the phase. The A2 fetch+decode
  CODEGEN is fully wired + R26-verified; the render-display is the separate gap. Recommend a follow-on `<request>`-render
  dispatch (register the request state into the input-state registry + reactive-dep detection + if=/match-on= paths).
