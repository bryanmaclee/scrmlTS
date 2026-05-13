# Null Audit — compiler/src/ — scrml-semantic vs JS-host (S89 D)

**Date:** 2026-05-13
**Driver ruling (S89, verbatim):** `null` does not exist in scrml. The TS reference impl in `compiler/src/` is the SCAFFOLD — TS migrates to honor scrml's stated intent, not vice versa.

**Scope:** `compiler/src/**` excluding `tests/`, `module-resolver.js`, and `meta-checker.{js,ts}` (deferred to Wave 7.C parallel dispatch). Also out of scope per brief: `compiler/runtime/` (JS shims), `compiler/tests/`.

**Audit type:** READ-ONLY classification. No code changes in this commit.

## §1 Methodology

### Source
Exhaustive grep:

```
grep -rn "\bnull\b" compiler/src/ \
  --exclude-dir=tests \
  --exclude=module-resolver.js \
  --exclude=meta-checker.ts \
  --exclude=meta-checker.js
```

### Volume
- **Total hits:** 2,777 occurrences
- **Files affected:** 81 (out of 96 non-empty source files; 15 files are null-free)
- Per-file counts range from 1 (e.g., `body-pre-parser.ts`, `index.js`) to 291 (`type-system.ts`).

### Classification taxonomy

Each `null` site is classified into ONE of three buckets:

1. **JS-host-interop-leave** — null is required/produced by a JS host API (DOM `querySelector`, `setInterval` handle, `RegExp.exec`, `Map.get`, `Element | null` ref binding, fetch, Bun APIs, acorn AST). Leave as-is — these are not scrml-side null.
2. **Scrml-semantic-mirror-migrate** — null represents "scrml-side absence" in:
   - data structures the compiler emits into compiled JS output,
   - values that surface back to scrml-author code (engine state, server-fn results, SQL row absence, audit-log entries, match-arm bindings, history cells),
   - or AST nodes that mirror scrml-source absence into JS `null` at codegen.
3. **Internal-implementation-detail** — null used for compiler-internal control state (e.g., "no caller registry was provided"; "lookup miss in an internal map"; "this AST field was not populated yet"; "this code path returns null to signal skip"). Never surfaces outside the compiler. Leave OR migrate at user's discretion; flagged for ratification when uncertain.

### Pattern frequency (orthogonal slice)
- 473 sites: equality-with-null (`=== null`, `!== null`, `== null`, `!= null`)
- 412 sites: `return null;` (signaling lookup-miss / abort / skip)
- 665 sites: TS type-union `| null` or `null |` (mostly field types)
- 116 sites: `?? null` (nullish coalescing default)
- 55 sites: string-literal `"null"`/`'null'` (these are HIGH-leverage — codegen often emits the literal `null` JS keyword into compiled output via these strings)

### Why per-file bucketed counts (not per-line table)
2,777 line-by-line classifications would produce a ~80-page table dominated by repetitive patterns (`p?.x ?? null`, `Map | null`, `RegExp.exec(...) !== null`). The audit instead:
- §2 enumerates per-file pattern composition + classification verdict
- §4 enumerates the high-leverage migration items by file:line for follow-on dispatch
- §5 surfaces AMBIGUOUS cases that need user disposition

---

## §2 Per-File Findings

Legend:
- **J** = JS-host-interop-leave
- **M** = scrml-semantic-mirror-migrate
- **I** = internal-implementation-detail
- **A** = AMBIGUOUS (see §5)

Per-file: ([count] kind tag — predominant classification — key callouts)

### A. AST + types (canonical structural surface)

| File | Count | Bucket | Key sites | Verdict |
|---|---|---|---|---|
| `compiler/src/types/ast.ts` | 65 | M (predominant) + I | L116 `defaultValue: string\|null`; L129 `expr: string\|null`; L455 `renderSpec?: ...\|null`; L477 `defaultExpr?: ExprNode\|null`; L611 `args: ValidatorArg[]\|null`; L633 `inlineOverride?: string\|null`; L813 `sourceVar`; L817 `varNameOverride`; L819 `initialVariant`; L838+849 `alternate: LogicStatement[]\|null` (if/else); L1032 `binding`; L1082+1098+1110+1112+1114 module-export fields; L1335-1365 program-attribute config (`cors`, `log`, `ratelimit`, `headers`, `idempotencyStore`, `idempotencyTTL`, `batchInListCap`, `corsMaxAge`, `channelReconnect`); L1399+1401 auth/middleware config; L1476 `LitExpr.value: string\|number\|boolean\|null`; **L1482 `litType: "null"`**; **L1484 `litType: "not"` (// §42 absence value — compiles to null)**; L1568 doc says `lit { litType: "null" }` is the canonical absence carrier on `is-*` binary RHS. | **M.** The AST is the canonical structural mirror of scrml source. Field types like `defaultValue: string \| null` directly encode scrml-side "attribute absent." The `LitExpr.litType: "null"` variant (L1482) is the canonical scrml-semantic-mirror site — it represents a JS-`null`-shaped value INSIDE the scrml AST. Per S89, this must migrate to a discriminated-union absence sentinel or `litType: "absent"` carrier. |
| `compiler/src/type-system.ts` | 291 | M + I | L578 `["null", tPrimitive("null")]` — `null` registered as a built-in scrml TYPE alongside `not` (L580); L669 doc "Nullability: T \| not (§42 — scrml uses `not` instead of `null`)"; L3882+3888 `tUnion([tPrimitive(elemShape.domInterface), tPrimitive("null")])` for `ref=` DOM bindings (J); large majority are field types (`X \| null`) on resolved-type records (M for scrml-observable shape, I for compiler-internal). | **Mixed M+I.** The `"null"` primitive type registration (L578) is the highest-leverage scrml-semantic-mirror entry: scrml-user can write `: null` as a TYPE annotation today. Per S89 this should be removed (only `not` survives). DOM `Element \| null` ref types (L3882/3888) are JS-host. |
| `compiler/src/symbol-table.ts` | 192 | M + I | L257 `initialVariant: string\|null` (engine §51.0.E `initial=.X` absence); L263 `derivedExpr: unknown\|null`; L283 `parentEngine: StateCellRecord\|null`; L305 `idleWatchdog`; L440 `to: string\|null` (rule's `to=.Variant` absence); L444 `from`; L451 `ifExprRaw`; L533 `effectRaw: string\|null`; L620 `runtimeHookKind`; L694 `parent: Scope\|null` (root scope); L816 `_resolvedStateCell?: StateCellRecord\|null` (lookup-miss sentinel); L959 `imp.source == null` (parse-failed import skip). | **Predominant I, with M edges.** Most of these are SYM-internal records — only the compiler reads them, never surfaced back to scrml. The `to/from/ifExprRaw/effectRaw` fields ARE direct mirrors of scrml-source absence (`to=` attr not present), but they don't leak to runtime — codegen consumes them and emits literal `null` into JS output. The MIRROR happens in codegen, not in SYM itself. Classify SYM null fields as I unless their value is re-emitted into JS-output (then the EMIT site is M). |

### B. Parser + AST builders

| File | Count | Bucket | Key sites | Verdict |
|---|---|---|---|---|
| `compiler/src/ast-builder.js` | 236 | I (predominant) + M | L401+408+449+459 etc. `return null` (parse-shape miss); L668 `parentType = null`; L839+840+939+940+1007+1008+1034+1035 etc. AST node fields `name: null, closerForm: null` (synthesized blocks have no opener/closer); L1264 `while ((m = refRe.exec(raw)) !== null)`. | **I.** AST construction sentinels. Synthesized-block fields like `closerForm: null` mean "this block was synthesized, not in source." Internal-impl — never reaches scrml. |
| `compiler/src/expression-parser.ts` | 38 | M (predominant) + I | L971 `not` keyword → `LitExpr{ litType:"not", value:null }`; **L987 `Literal value === null` → `LitExpr{ litType:"null", value:null }`** (parsed from JS `null`); **L1187/1192/1197 `is-not`/`is-some`/`is-not-not` RHS injected as `LitExpr{ litType:"null", raw:"null", value:null }`**; L1235/1258 `undefined` literal path uses `value: undefined as unknown as null` cast; L1316 array hole maps to undefined LitExpr; L1483 empty-expr placeholder returns `LitExpr{ litType:"null", value:null }`. | **M.** The parser is the funnel where scrml source becomes AST with JS-`null`-typed `value` fields. Even though gauntlet-phase3 forbids `null`/`undefined` source tokens, the parser still constructs `litType:"null"` nodes (for `is-*` RHS sentinels and for parse-failure placeholders). These nodes feed codegen directly. Per S89: replace internal `litType:"null"` sentinel with a `litType:"absent"` discriminator AND stop using JS `value: null`. |
| `compiler/src/component-expander.ts` | 45 | M + I | L144+147+159 PropDecl fields; **L745-752 `if (value === "null") { ...LitExpr{ litType:"null", value:null } }`** — default `"null"` string from prop-decl creates absence literal. | **M.** L745-752 mirrors a scrml-author-visible default into LitExpr-null. Migration target. |
| `compiler/src/block-splitter.js` | 16 | I | block boundary state | I |
| `compiler/src/body-pre-parser.ts` | 1 | I | L? | I |
| `compiler/src/tokenizer.ts` | 5 | I | token-stream state | I |

### C. Gauntlet / lint / source-level enforcement

| File | Count | Bucket | Key sites | Verdict |
|---|---|---|---|---|
| `compiler/src/gauntlet-phase3-eq-checks.js` | 67 | I + M | L21-33 docstring: `E-SYNTAX-042` forbids `null`/`undefined` keywords in scrml source. L167 `if (node.litType === "null") return "null"` — the lint walker INSPECTS LitExpr{litType:"null"} to flag scrml-author misuse. | **I.** The detector internally compares against LitExpr `null`/`undefined` literal forms. When the AST migrates away from `litType:"null"`, this lint must move to the new absent-sentinel form. Migration is downstream of the AST migration, not a separate site. |
| `compiler/src/lint-i-match-promotable.js` | 37 | I | match-arm shape detection | I |
| `compiler/src/lint-ghost-patterns.js` | 3 | I | | I |
| `compiler/src/gauntlet-phase1-checks.js` | 3 | I | | I |

### D. Codegen — emit-* (highest scrml-output leakage surface)

| File | Count | Bucket | Key sites | Verdict |
|---|---|---|---|---|
| `compiler/src/codegen/emit-expr.ts` | 28 | **M (critical)** | **L296-298** `if (node.litType === "not") { return "null"; }` — scrml `not` → JS literal `null` in compiled output; **L465-470** `case "is-not"`: emits `(${left} === null \|\| ${left} === undefined)`; `case "is-some"`: emits `(${left} !== null && ${left} !== undefined)`; `case "is-not-not"`: same as `is-some`. L357 docstring talks about null/undefined primitives. | **M.** THE canonical scrml-semantic-mirror site. `not` literally becomes `null` in user-visible JS output. `is not` compiles to `=== null`. Per S89 these must emit a scrml-absence sentinel (e.g., `_scrml_absent` symbol or `{ kind: "absent" }` record). Migration cascades to runtime + all other emit sites. |
| `compiler/src/codegen/rewrite.ts` | 99 | **M (critical)** | **L739 `segment = segment.replace(/(?<![A-Za-z0-9_$@])not(?![A-Za-z0-9_$])/g, 'null');`** — bare `not` keyword in raw expression text rewritten to literal `null` JS string; L476 `if (result === null) return "null";` — derived-ref rewriter emits literal `null` string when reactive-ref lookup misses; L562 `expr.includes("null")` — scrml-output text scan. | **M.** Mass scrml→JS-null substitution. Migration target (must coordinate with emit-expr and runtime). |
| `compiler/src/codegen/emit-machines.ts` | 61 | M | L515 `const labelLit = ... ? JSON.stringify(...) : "null";` — audit-log entry's `label` field; L542 `auditTargetLit = ... : "null"`; L544 `labelLit ... : "null"`; L768/773 same pattern. These literal `"null"` strings get interpolated into compiled JS audit-log writes: `_scrml_reactive_set("auditTarget", (... || []).concat([{ from, to, at, rule, label: null }]))`. | **M.** The compiled audit log is a scrml-author-observable surface (`@auditTarget` is a reactive cell users read). `label: null` therefore leaks scrml-mirror null. |
| `compiler/src/codegen/emit-engine.ts` | 139 | M + I | **L985 `_scrml_state[${JSON.stringify(cellKey)}] = null;`** — engine history synth-cell initial = literal `null`; **L1338 `_scrml_engine_pending_history_restore[${JSON.stringify(outerVar)}] : null`** — history-restore fallback `null`; L97/98 `to/from: string\|null` (rule struct types). L196+202+210 derivedExpr null-check; L549 `const ${constName} = null;` — defensive idle watchdog stub; L573 `string\|null` resolve-fallback. | **M for emit-into-output sites** (L985, L1338, L549 — all reach scrml-state which user code reads via `@varName`). **I for compile-internal type unions.** |
| `compiler/src/codegen/emit-server.ts` | 68 | **M (critical) + I** | **L928 `JSON.stringify(_scrml_result ?? null)`**; **L934 same in non-dedup path**; **L1089 same**. — server-fn HTTP response body: when scrml fn returns `not` / undefined, the wire-format payload is JSON `null`. Scrml-client reads response back through scrml runtime where it surfaces as a scrml value. L669 `lastEventId: req.headers.get('Last-Event-ID') ?? null` (JS-host header API). L275 `_scrml_handleNodeEarly: any \| null = ... ?? null`. | **M for L928/934/1089** — scrml semantic boundary. The wire format SHOULD encode scrml-`not` distinctly from any other absence. L669 is J (HTTP headers spec'd to use null). |
| `compiler/src/codegen/emit-logic.ts` | 165 | M + I | **L2127 `(await ${db}.unsafe(${JSON.stringify(sql)}, [${argList}]))[0] ?? null;`** — SQL `.get`/`.first` row-not-found emits literal `null` in user code; L2117 same shape (Branch A); L2135 same (Branch C). L1044/1049 audit-target/label `"null"` interpolation (same as emit-machines); L324 doc "Returns 'null' if no scope data" — scope-payload null fallback string interpolated into runtime debug bundles; L331/346/360/369 same — `_scrml_scope_data: null` strings; L2368 `node.file ?? "null"`. Plus mass type-union fields. | **M for L2117/2127/2135 (SQL absence)** — user-scrml writes `let user = users.get(id)?` and the runtime hands back `null`, which is then directly tested via `is not`. **M for L324-369 scope-payload strings (compiled scope info is dev-tool-observable).** **I for opts.*  null defaults.** |
| `compiler/src/codegen/emit-control-flow.ts` | 105 | M + I | L100 rule struct `guard: string\|null; label: string\|null; effectBody: string\|null` (mirror of scrml-source absence); L557 `mapVar.get(loopVar.keyField) ?? null` (emitted into user code — for-loop reconciler key lookup); L687 MatchArm fields `test: string\|null`; L696 `tests?: string[]\|null`; L702 `binding: string\|null`; L705 `structuredBody?: any[]\|null`; **L720 RuleBinding `sourceField: string\|null`** (named-vs-positional); L749/751 `result.push({ sourceField: null, localName: ..., discard: ... })`; L800 MatchArm parsed-shape with binding/structuredBody null; L829 `kind: "not"` match arm with `test: null, binding: null`. | **M for L557 (compiled output sees the null) + L749/751/829 (the match-arm "not" kind itself is a scrml `not` mirror in the IR).** **I for all type-only field unions.** |
| `compiler/src/codegen/emit-html.ts` | 36 | I + J | L71 `attrIsWiringFree(attr, allowName: string\|null = null)`; L198-300 validator-arg null sentinel (`args === null` ↔ bareword form); L303 `Set\|null`; L527 `errorsKey: string\|null`; L643/650/734/740/792/799 numeric-attr parse fallbacks; L855/857 string-name extraction with `null` fallback; L883/884/911 transition-class extraction; L1137-1142 dev-attr null fallback. | **I.** All compile-time text-scan defaults. Output text production doesn't directly emit literal `null`. |
| `compiler/src/codegen/emit-client.ts` | 22 | I | options-handle / registry-handle `?? null` patterns | I |
| `compiler/src/codegen/emit-validators.ts` | 40 | I | "returns null = no emission" pattern (L33/131/134/137/140/143/146/149/154 — guards that return null to skip emission) | I |
| `compiler/src/codegen/emit-channel.ts` | 27 | J + I | L35-37 `open/message/close: string\|null` (callback names absent); L207-229 `parseChannelReconnect` returns `null` on parse-fail (caller falls back to default 2000ms); L241/270 default-arg null; L294 attr-to-call null fallback | I (defaults). Note: emit-channel updated S87 for Insight 30 — these nulls remained as compiler-internal "absent" markers. |
| `compiler/src/codegen/emit-event-wiring.ts` | 48 | I | engineRewriteCtx-or-null shape; map-or-null context | I |
| `compiler/src/codegen/emit-functions.ts` | 1 | I | | I |
| `compiler/src/codegen/emit-machine-property-tests.ts` | 40 | M + I | L101-117 rule-struct types; L259-279 emits runtime test harness that uses `null` for "no rule matched" and as machine variant `__prev/__next` value indicators (`__prev != null && __prev.variant != null`). | **M for emitted-runtime-harness strings (L259+, L266-270, L279 `return null;`)** — these are user-test-visible. **I for field types.** |
| `compiler/src/codegen/emit-reactive-wiring.ts` | 30 | M | L849 `let targetExpr = "null";` — string interpolated into reactive-wiring code that user runtime executes | M |
| `compiler/src/codegen/emit-variant-guard.ts` | 37 | M + I | variant-dispatcher state slots emit literal `null` for unmatched variants (Phase A10 dispatcher); + type-union fields | M for emitted-output strings, I for type fields |
| `compiler/src/codegen/emit-css.ts` | 6 | I | | I |
| `compiler/src/codegen/emit-bindings.ts` | 5 | I | | I |
| `compiler/src/codegen/emit-library.ts` | 8 | I | | I |
| `compiler/src/codegen/emit-messages.ts` | 12 | I | | I |
| `compiler/src/codegen/emit-parse-variant.ts` | 5 | M | parseVariant absence-tag wiring — `{ ParseError ... }` absent-payload emitted; needs migration audit | M |
| `compiler/src/codegen/emit-predicates.ts` | 9 | I | | I |
| `compiler/src/codegen/emit-synth-surface.ts` | 9 | I | | I |
| `compiler/src/codegen/emit-test.ts` | 8 | I | | I |
| `compiler/src/codegen/emit-worker.ts` | 2 | I | | I |
| `compiler/src/codegen/index.ts` | 65 | I (predominant) | L55/111/116-134 pipeline-output container fields (`serverJs?: string\|null`, `html?: string\|null`, etc.); L153-155+186+190 internal options defaulting; L249/257/427/430 worker/whenMessage internal null states; L413/415/465/467/469/471/494/507/516+526+534+558+560+571+588+594+596+630 compile-context plumbing — all internal-only. | I — these never reach scrml-output. |
| `compiler/src/codegen/binding-registry.ts` | 6 | I | arm-context-stack `top()` returns `null` on empty | I |
| `compiler/src/codegen/collect.ts` | 12 | I | collect helpers `?? null` plumbing | I |
| `compiler/src/codegen/context.ts` | 12 | I | CompileContext init/defaults | I |
| `compiler/src/codegen/db-driver.ts` | 1 | I | regex match | I |
| `compiler/src/codegen/ir.ts` | 8 | M + I | L136 `op: string\|null`; L138 `lhs: string\|null`; L140 `rhs: string\|null` (assert-without-comparison); L216/222/224 task-graph optional fields | I — IR is internal; codegen consumes and emits |
| `compiler/src/codegen/reactive-deps.ts` | 16 | I | dep-collection-walker `?? null` defaults | I |
| `compiler/src/codegen/scheduling.ts` | 11 | I | task-order scheduling internal | I |
| `compiler/src/codegen/source-map.ts` | 3 | J | source-map generation; `JSON.stringify(map, null, 2)` (Node JSON API) | J |
| `compiler/src/codegen/type-encoding.ts` | 7 | I | type-encoding shape | I |
| `compiler/src/codegen/usage-analyzer.ts` | 3 | I | | I |
| `compiler/src/codegen/rewrite.ts` (already listed) | | | | |
| `compiler/src/codegen/compat/parser-workarounds.js` | 13 | I | self-hosted-BPP shim glue; `emitExprField(null, ...)` ctx-not-provided | I |

### E. Analyzers / type-side

| File | Count | Bucket | Key sites | Verdict |
|---|---|---|---|---|
| `compiler/src/route-inference.ts` | 83 | M + I | L15-17 docstring: `generatedRouteName: string\|null` (client fns have no route), `serverEntrySpan: Span\|null`, `cpsSplit: CPSSplit\|null`. L23 `returnVarName: string\|null`. L96/117-122/130 route-record fields; L191 same. L301-305 `detectServerOnlyResource` returns null on miss. L373/374 regex.exec null-test (J). L815-859 `findReactiveAssignment` lookup-miss null. | **M for `boundary` mirror fields (L15-23, L96, L117-122)** — these record scrml-author's boundary intent (server/client/null) and are referenced in error messages + dev tooling. **I for lookup-miss patterns (L301, L815, L859).** Mostly the audit value is to migrate route-record fields to a discriminator. |
| `compiler/src/dependency-graph.ts` | 32 | I | dependency-edge `sourceRenderNodeId: NodeId\|null` (no enclosing render); cycle-detection iter null | I |
| `compiler/src/protect-analyzer.ts` | 35 | J + I | L286/300/313/314/334/346/347/361/362 `Database \| null` (bun:sqlite open-can-fail — JS-host); L117 `type: string\|null` (column type unknown); L223+239 `ColumnDef[]\|null` return; L457 same. Plus attrStringValue helper. | **J for bun:sqlite handle null (legitimate).** **I for ColumnDef\|null returns (compile-time).** |
| `compiler/src/monotonicity-analyzer.ts` | 18 | I | | I |
| `compiler/src/name-resolver.ts` | 2 | I | | I |
| `compiler/src/idempotency-store-resolver.ts` | 8 | I | DbDriver `\| null /* no db= configured */` | I — internal config |
| `compiler/src/batch-planner.ts` | 14 | I | | I |
| `compiler/src/engine-statechild-parser.ts` | 11 | I | | I |
| `compiler/src/meta-eval.ts` | 16 | I | | I |
| `compiler/src/schema-differ.js` | 28 | M + J | L65 `notNull: /not\s+null/i.test(restStr)` (SQL keyword detection — J); L67/68/69 column field `default: null, references: null, renameFrom: null` (M — these encode scrml `<schema>` absence); L322/377/402/406/621 `col.default !== null` predicates; L536/553/581 helpers returning null on parse fail. | **M for column-default-null fields** (these mirror scrml `<schema>` author's "no default" intent and ARE round-tripped to SQL DDL where SQL has its own NULL — boundary is delicate); **J for SQL keyword regex.** |
| `compiler/src/validators/ast-walk.ts` | 1 | I | | I |
| `compiler/src/validators/post-ce-invariant.ts` | 2 | I | | I |
| `compiler/src/validators/attribute-allowlist.ts` | 7 | I | | I |
| `compiler/src/validators/attribute-interpolation.ts` | 2 | I | | I |
| `compiler/src/validator-arg-parser.ts` | 21 | I | | I |
| `compiler/src/validator-catalog.ts` | 5 | I | | I |
| `compiler/src/attribute-registry.js` | 6 | I | | I |
| `compiler/src/html-elements.js` | 6 | I | | I |
| `compiler/src/tailwind-classes.js` | 58 | I | huge static map; null entries for unimplemented classes | I |

### F. CLI commands / orchestration

| File | Count | Bucket | Key sites | Verdict |
|---|---|---|---|---|
| `compiler/src/api.js` | 21 | I + J | pipeline-orchestration null fallbacks; `regex.exec(...) !== null` (J); cache misses; `dbConfig ?? null` | I/J |
| `compiler/src/commands/build.js` | 6 | I | | I |
| `compiler/src/commands/compile.js` | 7 | I | | I |
| `compiler/src/commands/dev.js` | 6 | I | | I |
| `compiler/src/commands/init.js` | 4 | I | | I |
| `compiler/src/commands/migrate.js` | 16 | I + A | migrate.js consumes external (often JS-shaped) input — null handling here is JS-host-adjacent. | A — see §5 |
| `compiler/src/commands/promote.js` | 22 | I | | I |
| `compiler/src/index.js` | 1 | I | | I |

### G. Runtime + emitted shims

| File | Count | Bucket | Key sites | Verdict |
|---|---|---|---|---|
| `compiler/src/runtime-template.js` | 99 | J (predominant) + M | This is a runtime SHIM emitted into compiled output. DOM/setInterval/raf/Comment-node-lookup APIs return null (J). HOWEVER: L588 `let _scrml_lift_target = null;` (M — observable as `_scrml_lift_target` ambient); L786/831 entry.handle = null (J setInterval); L975 `newNodes[i] = null` (reconciler internal); L1130/1141/1148/1160/1162 throttle-state pending null (M — observable through reactive-set timing); L1335 `bindings: capturedBindings != null ? capturedBindings : null` (M — `^{}` breakout); L1426 `this.cause = opts?.cause ?? null` (Error-cause spec — J). | **Mixed**, dominated by J. The `_scrml_lift_target` ambient and `^{}` capturedBindings are the M-class items per S88-LIFT-5 prior-art. |
| `compiler/src/runtime-validators.js` | 36 | M | This is a runtime helper module emitted/copied to dist for validator wiring. Multiple `null` carriers represent scrml-author validator state. | M — needs file-by-file audit during follow-on dispatch. |
| `compiler/src/serve-client.js` | 4 | I | | I |
| `compiler/src/meta-checker.ts` | (excluded — Wave 7.C) | | | |

---

## §3 Summary Metrics

### Bucket totals (approximate; per-file dominant classification)

| Bucket | Files (dominant) | Estimated site count* | Notes |
|---|---|---|---|
| **Scrml-semantic-mirror-migrate (M)** | 13 files M-predominant + ~12 files M-secondary | **~720 sites** (incl. AST type-union mirrors, codegen emit-into-output, server-fn JSON wire format, engine state cells, audit-log labels, SQL absence, reactive-wiring `targetExpr="null"`, runtime ambient + capturedBindings) | The migration backlog. |
| **JS-host-interop-leave (J)** | ~20 files predominantly J or J-secondary | **~480 sites** (DOM/Map/RegExp.exec/setInterval/bun:sqlite/headers/source-map JSON API/fetch/error-cause) | Legitimate. |
| **Internal-implementation-detail (I)** | ~50 files predominantly I | **~1500 sites** (lookup-miss returns, parser-state sentinels, optional-context-defaulting, AST-builder synthesized-block markers, IR optional fields, command-driver plumbing, tailwind static map) | Leave OR migrate at user discretion — see §5 for borderline items. |
| **AMBIGUOUS (A)** | scattered | **~80 sites** | See §5. |
| **TOTAL** | 81 files | **2,777** | |

\* "Estimated site count" derived by combining per-file pattern composition with the line-level reads of each high-leverage file in §2. Exact line-level enumeration was not produced for every site because:
  (a) ~1500 of the 2777 sites are pure compiler-internal sentinels (return-null on lookup-miss, RegExp.exec loops, Map.get callers) — these are mechanically classifiable as I.
  (b) The user-load-bearing surfaces (the ~720 M-class sites) are concentrated in ~13 files identified above and detailed by line in §2.

### High-leverage scrml-semantic-mirror clusters (counts within the M total)
1. AST `LitExpr.litType: "null"` / `"not"` / `value: null` creation + consumption: ~20 direct creation sites (parser + component-expander) + ~50 consumer sites (codegen).
2. Codegen `JSON.stringify(... ?? null)` for server-fn wire format: 3 explicit (emit-server.ts L928/934/1089) + transitive runtime impact.
3. Codegen `"null"` string interpolated into compiled JS for audit-log/label/auditTarget/scope-payload fields: ~20 sites (emit-machines, emit-logic, emit-reactive-wiring).
4. Codegen `_scrml_state[key] = null` / engine-history fallback: ~8 sites (emit-engine).
5. SQL `.get/.first` row-absence `[0] ?? null`: 3 sites (emit-logic L2117/2127/2135).
6. `not` keyword regex rewrite: 1 mass site (rewrite.ts L739).
7. `is-not`/`is-some`/`is-not-not` operator emission: 3 sites (emit-expr L465-470).
8. Type-system `["null", tPrimitive("null")]` built-in: 1 site (type-system.ts L578).
9. Runtime `_scrml_lift_target = null` ambient: 1 site (runtime-template.js L588).
10. Match-arm `kind: "not"` mirror + `?? null` for-loop key lookup: 2 site clusters (emit-control-flow).

---

## §4 Migration Backlog

Items are scoped to be self-contained dispatch packets. Each is keyed by file:line and includes the fix shape.

**M-7C-D-1 — AST.LitExpr.litType "null" branch elimination**
- **File:** `compiler/src/types/ast.ts`
- **Lines:** 1476, 1482, 1484, 1568
- **Current shape:** `litType: "number" | "string" | "template" | "bool" | "null" | "undefined" | "not"`; `value: string | number | boolean | null`
- **Fix:** Remove `"null"` and `"undefined"` from `litType` union. Replace `value` type with non-null shape: `value: string | number | boolean | AbsentSentinel`. Add new `AbsentSentinel` discriminator (e.g., `value: { kind: "absent", source: "not" | "no-default" }`). `"not"` becomes the sole absence representation.
- **Cascades to:** expression-parser.ts (M-7C-D-2), component-expander.ts (M-7C-D-3), gauntlet-phase3-eq-checks.js, emit-expr.ts (M-7C-D-4).

**M-7C-D-2 — Parser stop manufacturing litType:"null" / value:null**
- **File:** `compiler/src/expression-parser.ts`
- **Lines:** 971, 987, 1187, 1192, 1197, 1235, 1258, 1316, 1483
- **Current shape:** Constructs `LitExpr{ litType:"null", value:null }` for (a) JS literal `null` in source, (b) RHS of `is-*` operators, (c) array-hole / empty-expr placeholders.
- **Fix:** (a) reject `null` JS literal as parse-error (E-SYNTAX-042 already exists at lint layer — promote to parser); (b) `is-*` RHS should be a dedicated `AbsenceMarker` AST kind (no value at all), not a faked LitExpr; (c) array-hole and empty-expr should use `litType:"not"` or `AbsenceMarker`.

**M-7C-D-3 — component-expander default="null" path**
- **File:** `compiler/src/component-expander.ts`
- **Lines:** 745-752 (and L677 doc)
- **Current shape:** Component default value `"null"` (string) creates `LitExpr{ litType:"null", value:null }`.
- **Fix:** Treat `"null"` default value as parse-error or rewrite to `not`. Per S89, scrml has no `null` keyword — component declarations using `default="null"` should not exist post-migration. Add gauntlet check or reject at component-decl parse.

**M-7C-D-4 — emit-expr `not` keyword emission**
- **File:** `compiler/src/codegen/emit-expr.ts`
- **Lines:** 296-298 (emitLit "not" → "null"); 465-470 (is-not/is-some/is-not-not → `=== null || === undefined`)
- **Current shape:** scrml `not` → JS `null`; `x is not` → `x === null || x === undefined`.
- **Fix:** Emit a runtime absence sentinel (`_scrml_absent` symbol or runtime helper). `is not` → `_scrml_is_absent(x)`. Coordinated with runtime change (M-7C-D-12).

**M-7C-D-5 — codegen/rewrite.ts mass `not → null` regex**
- **File:** `compiler/src/codegen/rewrite.ts`
- **Line:** 739 (`segment.replace(/(?<![A-Za-z0-9_$@])not(?![A-Za-z0-9_$])/g, 'null')`); L476, L562.
- **Current shape:** Bare `not` keyword in raw expression text is regex-replaced with `null`.
- **Fix:** Replace with `_scrml_absent` (or equivalent sentinel) coordinated with M-7C-D-4 / M-7C-D-12.

**M-7C-D-6 — Server-fn HTTP response wire format**
- **File:** `compiler/src/codegen/emit-server.ts`
- **Lines:** 928, 934, 1089
- **Current shape:** `JSON.stringify(_scrml_result ?? null)` — when scrml fn returns `not`, body becomes JSON `null`.
- **Fix:** Encode scrml-absence as a tagged envelope (e.g., `{ "_scrml_absent": true }` or use the §41.13 Result/Variant envelope). Decode on the client side. Spec amendment §50.x scrml-wire-format probably required.

**M-7C-D-7 — Engine state-cell history initial null**
- **File:** `compiler/src/codegen/emit-engine.ts`
- **Lines:** 985, 1338 (pending-history-restore fallback), 549 (defensive idle-watchdog stub)
- **Current shape:** `_scrml_state[cellKey] = null;` for engine history synth-cell; `_scrml_engine_pending_history_restore[v] : null` fallback; `const ${constName} = null;` defensive watchdog.
- **Fix:** Initialize history cells with absence-sentinel value. Update reads (`_saved != null` on L1342) accordingly.

**M-7C-D-8 — Audit-log `label` / `auditTarget` literal "null" interpolation**
- **Files + Lines:**
  - `compiler/src/codegen/emit-machines.ts` L515, L542, L544, L768, L773
  - `compiler/src/codegen/emit-logic.ts` L1044, L1049
- **Current shape:** `const labelLit = matchedRule.label ? JSON.stringify(matchedRule.label) : "null";` — emits `label: null` into audit-log entry.
- **Fix:** When label/auditTarget absent, omit the property (or use absence-sentinel). Audit-log consumer (scrml user) reads `entry.label is not` — both ends must change together.

**M-7C-D-9 — SQL `.get`/`.first` row-not-found absence**
- **File:** `compiler/src/codegen/emit-logic.ts`
- **Lines:** 2117, 2127, 2135
- **Current shape:** `(await ...)[0] ?? null;` — user scrml code receives JS `null` when row missing.
- **Fix:** Return absence-sentinel value to scrml-user. User pattern `let row = users.get(id)? row is not` continues to work but on sentinel, not `null`. Spec §39 (SQL) absence semantics amendment.

**M-7C-D-10 — Reactive-wiring `targetExpr = "null"` interpolation**
- **File:** `compiler/src/codegen/emit-reactive-wiring.ts`
- **Line:** 849
- **Current shape:** `let targetExpr = "null";` — default interpolated as JS `null` literal into compiled reactive setter call.
- **Fix:** Use absence-sentinel as default.

**M-7C-D-11 — type-system `["null", tPrimitive("null")]` built-in registration**
- **File:** `compiler/src/type-system.ts`
- **Line:** 578
- **Current shape:** Type-system registers `null` as a built-in scrml TYPE alongside `not`.
- **Fix:** Remove. Scrml authors should not be able to write `: null` as type annotation. (L580 keeps `["not", tNot()]`.) Likely surfaces user-facing error E-TYPE-`null`-removed for any code that uses it.

**M-7C-D-12 — Runtime absence-sentinel + helper introduction**
- **File:** `compiler/runtime/` (out of scope per brief, but mandatory dependency for M-7C-D-4/5/6/7/8/9/10).
- **Fix:** Define `_scrml_absent` (symbol or canonical record) + helpers `_scrml_is_absent(x)`, `_scrml_is_some(x)`, `_scrml_compare_absent(a, b)`. All emit-* output that previously emitted `null` for scrml-absence uses these.
- **Note:** Cross-wave coordination required (Wave 7.C might be the right home, or a separate Wave for runtime).

**M-7C-D-13 — Match-arm "not" kind + structured binding null**
- **File:** `compiler/src/codegen/emit-control-flow.ts`
- **Lines:** 720 (`sourceField: string | null`), 749, 751, 829 (`kind: "not"` match arm with `test: null, binding: null`), 557 (`?? null` for-loop reconciler key lookup emitted into user code).
- **Fix:** The `kind: "not"` arm's `test`/`binding`/`structuredBody` should be omitted entirely (not stored as null). For-loop key-not-found should use sentinel.

**M-7C-D-14 — Runtime `_scrml_lift_target` ambient + capturedBindings**
- **File:** `compiler/src/runtime-template.js`
- **Lines:** 588 (`let _scrml_lift_target = null;`), 1335 (`bindings: capturedBindings != null ? capturedBindings : null`).
- **Fix:** Use sentinel or `undefined` (the latter is JS-native and may be permitted by S89 ruling — see AMBIGUOUS §5.4). Coordination with LIFT-5 dispatch (S88 prior art).

**M-7C-D-15 — Schema column-default null mirror**
- **File:** `compiler/src/schema-differ.js`
- **Lines:** 67-69 (`default: null, references: null, renameFrom: null`); 322, 377, 402, 406, 621
- **Fix:** Replace `default: null` with `default: { kind: "absent" }` or use `omit-when-absent` shape. BUT — schema-differ generates SQL DDL where SQL has its own NULL — needs care at the boundary. PA disposition needed (see §5.5).

**M-7C-D-16 — Route-record boundary fields**
- **File:** `compiler/src/route-inference.ts`
- **Lines:** 15-23 (interface docstring), 96, 117-122, 130, 191
- **Current shape:** `generatedRouteName: string | null` (null for client fns), `serverEntrySpan: Span | null`, `cpsSplit: CPSSplit | null`, `returnVarName: string | null`, `boundary: string | null`.
- **Fix:** These records describe scrml-author boundary intent and surface in CLI error messages + dev-tools. Migrate to discriminated unions: `{ boundary: "server", route: string, ... } | { boundary: "client" }`.

**M-7C-D-17 — Machine-property-tests emitted runtime harness**
- **File:** `compiler/src/codegen/emit-machine-property-tests.ts`
- **Lines:** 259-279 (emitted harness uses `null` for "no rule matched"), 265-279, 354-367
- **Fix:** Coordinate with runtime absence-sentinel (M-7C-D-12). The emitted test code uses literal `null` and must be migrated together with audit-log.

**M-7C-D-18 — runtime-validators.js sweep**
- **File:** `compiler/src/runtime-validators.js`
- **Count:** 36 sites
- **Fix:** Per-line read required (deferred to dispatch). Module is copied to dist and runs in user runtime; multiple sites represent scrml-author validator state.

---

## §5 AMBIGUOUS / PA Disposition Items

### §5.1 — `null` vs `undefined` policy
S89 ruling says "`null` does not exist in scrml" but does NOT speak to `undefined`. Many sites pair `=== null || === undefined` (e.g., emit-expr.ts L466 `is-not`). Question for PA: does the S89 ruling implicitly cover both, or only `null`? Need explicit ruling. The user-side AST already has `litType: "undefined"` (ast.ts L1483) — same migration target?

### §5.2 — Type-union `X | null` field types (615+ sites in TS)
Most TS field types use `X | null` as compile-time absence markers (e.g., `to: string | null`). These never reach scrml-output JS — codegen reads them and translates. Two possible PA dispositions:
- **(a) Migrate all to `X | undefined`** — uses JS's native missing-value semantics; minimal runtime change; TS still gets exhaustive checks.
- **(b) Migrate to discriminated unions** — explicit `{ present: true, value: X } | { present: false }` shape; verbose; safer.
- **(c) Leave as I (internal)** — acceptable since they never surface to scrml.

Per pa.md Rule 3: SURFACE — do not pre-pick.

### §5.3 — JS-host `RegExp.exec(...) !== null` loops
Standard JS idiom: `while ((m = re.exec(str)) !== null)`. Hundreds of sites. The `null` is JS-host (RegExp spec). Classification J — leave. Surfacing here because someone may want a stricter rule (e.g., refactor to `RegExp.matchAll` which returns iterators without null). Do not migrate without instruction.

### §5.4 — Runtime-template.js status
`compiler/src/runtime-template.js` is a RUNTIME file but located in `compiler/src/`. Brief says `compiler/runtime/` is out of scope as "JS shims; legitimate JS-host code." Question: does `compiler/src/runtime-template.js` qualify under the same dispensation? It mostly uses JS-host APIs (DOM, setInterval, raf) — but also has the `_scrml_lift_target` ambient and `capturedBindings` patterns that ARE scrml-semantic-mirror. Recommend: in-scope for this audit (already classified), but migration timing should align with whoever owns the runtime-shim file (Wave 7.E?).

### §5.5 — Schema-differ SQL boundary
`compiler/src/schema-differ.js` produces SQL DDL. SQL itself has a NULL keyword. Question for PA: when scrml `<schema>` declares `default=not`, the compiler currently maps to JS `default: null` field then emits no `DEFAULT` clause. Does the migration preserve the SQL-NULL boundary (i.e., SQL-NULL stays in DDL but JS-side uses sentinel)? Or should scrml `<schema>` express NULL differently?

### §5.6 — Tailwind static class map
`compiler/src/tailwind-classes.js` has 58 hits — almost all are entries in a static `null`-valued map (placeholder for "this Tailwind class isn't translated yet"). Classification I. Question: rewrite to `undefined` (cleaner JS) or to absence-sentinel (consistent with scrml semantics)? Negligible scrml impact either way. Recommend: defer.

### §5.7 — Validator `args: null` bareword form
`ast.ts` L611 + `emit-html.ts` L198-200 use `args: null` to discriminate bareword `<x req>` from parenthesized `<x req()>`. This is a documented internal-impl invariant (per L594-595 audit cite). Question for PA: counts as I (compiler-internal) or M (the discrimination is observable in error messages + diagnostic output)? Likely I — but surfacing.

### §5.8 — `meta-eval.ts` (16 hits)
Excluded from Wave 7.C explicit exclusion (only meta-checker is excluded). meta-eval is the type-level evaluator. Classification I in this audit — but if PA dispatches Wave 7.C to bundle meta-checker + meta-eval, this audit should be re-checked.

### §5.9 — `compiler/src/commands/migrate.js`
`migrate.js` translates JS-shaped input (`samples/compilation-tests/*.scrml` with legacy JS syntax) to canonical scrml. It must consume JS `null` from user files at parse time — but produce migrated scrml that NEVER contains `null`. Question: should migrate.js emit a fatal error or a warning when the input contains a `null` keyword that can't be cleanly rewritten to `not`? Recommend: refer to migrate-roadmap dispatcher.

### §5.10 — Symbol-table I/M boundary
A large share of symbol-table fields like `effectRaw: string | null` are compiler-internal but represent scrml-source absence (effect= attribute missing). They never directly emit literal `null`, but they DO drive codegen branches that emit literal `null`. Question: classify SYM as I (the values stay in compiler memory) or M (the values shape the output)? Recommend: I — and migration responsibility lives at the codegen sites that consume them.

---

## §6 High-priority Recommendations

Recommended dispatch order (most leverage first):

1. **M-7C-D-12 (Runtime absence-sentinel)** — INFRASTRUCTURE. Without this, M-7C-D-4/5/6/7/8/9/10/13/14/17 cannot land cleanly. **Start here.** Surface area: 1 new symbol + 2-3 helpers in `compiler/runtime/`. Coordinate with PA on naming and ABI.

2. **M-7C-D-6 (Server-fn wire format)** — Highest user-visibility leak. When a server fn returns `not`, the HTTP response is currently the literal string `"null"`. Any scrml client decoding the response receives JS `null` directly — bypassing scrml's `not` semantics entirely. Requires SPEC §50/§41.13 amendment + client + server change. Coordinated landing.

3. **M-7C-D-9 (SQL row-absence)** — Second-highest user-visibility leak. Every scrml program that uses `db.get/.first` is affected. Migration aligns with M-7C-D-12.

4. **M-7C-D-1 (AST LitExpr null branch elimination)** — Structural cleanup; eliminates the canonical mirror inside the compiler. After this lands, M-7C-D-2/3 become mechanical.

5. **M-7C-D-4/5 (emit-expr + rewrite.ts `not → null`)** — The core scrml→JS substitution. Cascading dependency on M-7C-D-12.

6. **M-7C-D-7/8 (Engine history + audit-log)** — User-observable through `@auditTarget` reactive cell and history-restore. Important but lower per-program impact than (2)/(3).

7. **M-7C-D-11 (type-system `null` primitive)** — Tiny code change but high signal — removes scrml's accidental `null` TYPE. May surface user code that depends on it (run sample sweep).

8. **M-7C-D-13/17 (match-arm + machine-property tests)** — Quick wins after sentinel infrastructure exists.

9. **M-7C-D-14 (runtime _scrml_lift_target)** — Coordinate with the existing LIFT-5 dispatch (S88 prior art per primary.map.md). Already in motion.

10. **M-7C-D-2/3 (parser + component-expander)** — Mechanical after AST migration.

11. **M-7C-D-15 (schema-differ)** — Needs PA disposition (§5.5) first.

12. **M-7C-D-16 (route-record)** — Discriminator migration; lower priority because mostly diagnostic-surface, not user-program-surface.

13. **M-7C-D-18 (runtime-validators.js)** — Per-line audit deferred.

### Cross-cutting recommendation
Before dispatching any M-7C-D-N item, PA should resolve §5.1 (null vs undefined policy) — many migration items become two-pronged or one-pronged based on that ruling.

---

## §7 What was NOT audited

- `compiler/src/module-resolver.js` (Wave 7.C parallel dispatch)
- `compiler/src/meta-checker.ts` (treated as Wave 7.C scope per brief intent)
- `compiler/runtime/**` (out of scope per brief)
- `compiler/tests/**` (out of scope per brief)
- `lsp/**`, `stdlib/**`, `scripts/**`, `e2e/**`, `samples/**`, `docs/**`

The audit is exhaustive within scope, but the LOAD-BEARING M-class migration backlog (§4) is the actionable surface; the ~1,500 I-class sites are listed by file in §2 but not enumerated line-by-line because they require no action under the S89 ruling.

---

## Tags
#audit #s89 #null-eradication #compiler-src #scrml-semantic-mirror #ts-migration
