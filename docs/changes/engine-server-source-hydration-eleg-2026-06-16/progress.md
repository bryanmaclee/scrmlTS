# Progress — engine-server-source-hydration-eleg-2026-06-16 (the E-leg)

`server=@source` server-authoritative engine: hydrate guard-free from a server-owned
source cell reactively; client writes stay guarded transitions.

## 2026-06-16 — Phase 0 SURVEY + STOP GATE (PASS)

pwd: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a3eafd6196921f173
Base confirmed: 7532bd8f (F-primitive `_scrml_engine_hydrate_init`) reachable in `git log -6`.

Phase-0 load-bearing finding (subscription-separability):
- `_scrml_derived_subscribe` (runtime-template.js:1122) is NOT a plain cell-change
  callback — it registers a DIRTY-PROPAGATION edge for the LAZY recompute machinery
  (`_scrml_derived_declare`/`_scrml_derived_fns`/`_scrml_derived_cache`), the read-only
  projection mechanism. NOT reusable for the E-leg (wrong semantic: recompute, not hydrate).
- The CORRECT seam is `_scrml_reactive_subscribe(source, fn)` (runtime-template.js:860) —
  a plain cell-change callback. The E-leg reuses THIS, routing to `_scrml_engine_hydrate_init`.
- Read-only enforcement (`E-DERIVED-ENGINE-NO-WRITE`) lives in SYM (symbol-table.ts ~7286),
  keyed on `derivedExpr`. A `serverSource` engine keeps `derivedExpr === null`, so it stays
  fully writable via the C12 path (`isC12EngineDecl` returns true) and never triggers
  read-only enforcement. => Subscription is SEPARABLE from read-only. STOP-GATE PASS.
- `_scrml_engine_hydrate_init` (runtime-template.js:3841) is a guard-free bare
  `_scrml_reactive_set` + decoder-boundary check — idempotent-safe, callable reactively.
- The dev-write path (`_scrml_engine_direct_set`, transition guard) + the source-subscription
  (hydrate) coexist on the same writable cell; a source-change hydrate is authoritative
  (last-write, server's word wins). STOP-GATE PASS.

Seams located:
- Parser: ast-builder.js ~13923 (initial=@cell regex), node object ~14327.
- SYM: symbol-table.ts EngineMetadata ~359 (initialCell), capture ~5184, validate ~7112.
- Codegen: emit-engine.ts emitEngineCellHydrationInit ~1633 (A-leg template),
  emitEngineCellHydrationInitsForFile ~1734; emit-client.ts wiring ~1690.
- Engine stays writable: isC12EngineDecl (emit-engine.ts:265) gates on derivedExpr==null only.

## NEXT: Phase 1 parser/ast-builder + SYM (server=@source recognition + serverSource capture + validation + mutual-exclusion)

## 2026-06-16 — Phase 1 parser + SYM (DONE)

- ast-builder.js: `serverSourceMatch` regex (~13937) captures `server=@source` with
  dotted field-access path (`@driver.current_status`); `serverSource` extraction (~14184);
  `serverSource` node-object key (~14354).
- symbol-table.ts: `EngineMetadata.serverSource` field; capture in makeEngineRecord;
  lifted onto engineMeta; Step-2.5 E-leg validation block (E-ENGINE-SERVER-WITH-DERIVED,
  E-ENGINE-SERVER-WITH-INITIAL-CELL mutual-exclusion); W-ENGINE-INITIAL-MISSING suppressed
  when serverSource present; `validateServerSourceHydration` helper (existence reuses
  E-ENGINE-INITIAL-CELL-UNDECLARED; type-compat reuses E-ENGINE-INITIAL-CELL-TYPE, bare-root
  only — field access passes conservatively; W-ENGINE-SERVER-SOURCE-NOT-AUTHORITATIVE info nudge).
- Smoke test PASS: parser serverSource="status", SYM engineMeta.serverSource="status",
  only diagnostic W-ENGINE-SERVER-SOURCE-NOT-AUTHORITATIVE (info, expected for plain cell).

## NEXT: Phase 2 codegen (emit-engine.ts subscription → _scrml_engine_hydrate_init reactively + emit-client.ts wiring)

## 2026-06-16 — Phase 1b within-node parity (FIXED, no allowlist re-baseline needed)

The new always-present `serverSource: null` key on every engine-decl node tripped 15
MISSING-FIELD over-budget failures in the M6.5.b.0 within-node parity gate (native parser
doesn't produce the field). FIX: added `serverSource` to STRIP_KEYS in
within-node-classifier.ts — the established pattern for LIVE-only engine-decl fields the
native parser doesn't yet recognize (same class as derivedExprText/derivedExprNode/
_notPrefixNegation). MORE correct than allowlist re-baseline: keeps parity budgets honest
(a null field that's never a real divergence shouldn't consume allowlist budget).
within-node parity test now 1012/0. NO allowlist re-baseline needed.

## 2026-06-16 — S199 RE-DISPATCH crashed (env 500) → PA-DIRECT finish (user-authorized "PA-direct, go")

The S199 re-dispatch (agent a3eafd6196921f173) ran ~21 min / 92 tool-uses, committed
Phase 0+1 (parser + SYM + within-node fix, tip c8c14311), then died on a transient
API 500 (dispatch-path, not the PA loop). 3rd crash on this build (S198 ×2 pre-edit).
PA reviewed Phase 0+1 (sound, exactly per brief), file-delta'd it into main, and
finished Phase 2-4 PA-direct.

### Phase 2 — codegen (PA-direct, DONE)
- `emit-engine.ts`: NEW `emitEngineServerSourceHydration(meta)` + `emitEngineServerSourceHydrationsForFile(fileAST)`.
  Mirrors the A-leg `emitEngineCellHydrationInit` but REACTIVE: emits an IIFE that
  reads the source null-safely (root cell + dotted-tail walk), SKIPS if absent
  (`if (__v == null) return` — unresolved source waits, no throw), hydrates via the
  reused `_scrml_engine_hydrate_init` (guard-free), and `_scrml_reactive_subscribe`s
  the ROOT cell so every change re-hydrates. NO new runtime helper (per brief).
- `emit-client.ts`: import + wire `emitEngineServerSourceHydrationsForFile` right
  after the A-leg `emitEngineCellHydrationInitsForFile` (post-reactive-wiring ordering).
- `dependency-graph.ts`: credit the server-source ROOT cell as a reader (mirrors the
  A-leg `initialCell` credit) — fixes a FALSE E-DG-002 ("@source declared but never
  consumed") that the dog-food surfaced.
- Phase-0 finding (from the agent, confirmed): the derived-engine subscription seam
  (`_scrml_derived_subscribe`) is the WRONG one (dirty-propagation/recompute); the
  correct seam is `_scrml_reactive_subscribe` (plain cell-change). Separable from the
  read-only path (serverSource keeps derivedExpr=null → isC12 true → writable). PASS.

### Phase 3 — SPEC §51/§52 + §34 (PA-direct, DONE)
- §51.0.E: NEW "Server-authoritative reactive hydration (`server=@source`)" subsection
  (model, worked HOS example, rides-existing-source, initial=.Literal placeholder,
  §38-composes, persist-via-dev-?{}, mutual-exclusion, validation); forward-ref at the
  A-leg `<engine server>` mention corrected to the ratified `server=@source`.
- §51.0 attribute table: NEW `server=@source` row.
- §34: +3 rows (E-ENGINE-SERVER-WITH-DERIVED, E-ENGINE-SERVER-WITH-INITIAL-CELL,
  W-ENGINE-SERVER-SOURCE-NOT-AUTHORITATIVE); E-ENGINE-INITIAL-INVALID-VARIANT +
  E-ENGINE-INITIAL-CELL-TYPE rows extended to note E-leg reuse.
- §52.4.4: reciprocal normative statement (a §52 cell MAY be consumed by an
  `<engine server=@source>` — bidirectional discoverability).
- SPEC-INDEX regenerated (61 rows).

### Phase 4 — tests + R26 (PA-direct, DONE)
- NEW `compiler/tests/unit/engine-hydration-server-source.test.js` (18 tests, all
  green): parser capture (bare + field-access), SYM validation (existence / type /
  mutual-exclusion / MISSING-suppressed / info-nudge / field-access-conservative /
  initial=.Literal-coexist), codegen IIFE shape (subscribe root + hydrate-init not
  direct-set + skip-if-absent + field-access null-safe walk), runtime helpers present.
- R26 dog-food (bare-root `server=@status` + field-access `server=@driver.current_status`):
  both compile exit 0, emit the correct IIFE, node --check OK, E-DG-002 gone, dev
  write routes through `_scrml_engine_direct_set` (guarded coexistence confirmed).
- Full `bun run test`: <pending — running>.
