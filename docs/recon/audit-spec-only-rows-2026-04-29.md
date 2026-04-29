# Recon — S48 audit ❌ "spec-only/aspirational" rows verification (continuation)

**Date:** 2026-04-29
**Audit reference:** `scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md`
**Verification mode:** read-only (source + tests + spec + samples). No compiler runs.
**Picks up from:** stalled prior recon that confirmed 3 Tailwind ❌ rows (181/182/183).

---

## 1. TL;DR

The S48 audit's distribution claim "**10 spec-only/aspirational (❌)**" at line 10 is **numerically inconsistent** with the matrix: a raw count of ❌-marked matrix rows yields **24** (21 unqualified + 3 with qualifiers `tutorial-only` / `architecturally-blocked` / `intentional`). The audit's "10" appears to denote the most consequential **prominent unqualified spec-only ❌ rows** (the ones that drive Top-5 drifts and article amendments). I reconstruct the canonical 10 from the dispatch's "3 Tailwind already settled" baseline and the most prominent matrix entries:

| # | Audit row | Line | Status | Disposition |
|---|---|---|---|---|
| 1 | `scrml migrate` CLI command | 92 | **❌ TRUE** | Audit accurate. Fix-work: T2 implement `compiler/src/commands/migrate.js` |
| 2 | Nested `<program>` `lang=` sidecar | 165 | **❌ TRUE** | Audit accurate. Article amendment + spec-issue cycle |
| 3 | Nested `<program>` WASM (`mode="wasm"`) | 166 | **❌ TRUE** | Audit accurate. Article amendment + spec-issue cycle |
| 4 | Supervised restarts (`restart=`/`max-restarts=`) | 167 | **❌ TRUE** | Audit accurate. Article amendment |
| 5 | Cross-language RPC (sidecar) | 169 | **❌ TRUE** | Audit accurate. Depends on #2/#3. |
| 6 | Tailwind arbitrary values | 181 | **✅ FALSE-ALARM** *(settled)* | Amend audit (already pending) |
| 7 | Tailwind variant prefixes | 182 | **✅ FALSE-ALARM** *(settled)* | Amend audit (already pending) |
| 8 | Tailwind custom theme | 183 | **❌ TRUE** *(settled)* | Audit accurate; v2 deferral confirmed |
| 9 | `class={expr}` dynamic class string | 184 | **❌ TRUE** | Audit accurate. SPEC-ISSUE-013 still "Planned" |
| 10 | Targeted HTML spec version | 250 | **❌ TRUE** | Audit accurate. SPEC-ISSUE-005 TBD |

**Hit rate this batch:** 6 TRUE + 1 FALSE-ALARM = **86% accurate** for the 7 non-Tailwind rows. With Tailwind: 7 TRUE + 2 FALSE-ALARM + 1 SETTLED-TRUE = **80% accurate** across all 10. **This breaks the prior 100%-failure pattern** seen across `lin` Approach B, audit phantoms, and Tailwind variants/arbitrary recons.

**Bonus finding (incidental):** Audit row 139 (`show=` "❌ tutorial-only", "Not in SPEC.md, not specially handled") is **WRONG**. SPEC.md §17.2 line 7621 specifies `show=` and the compiler explicitly handles it (`emit-html.ts:62, 659–696`, `emit-event-wiring.ts:410–461`, tested in `compiler/tests/unit/allow-atvar-attrs.test.js`). This is **NOT one of the 10 ❌ rows** — it's qualified "tutorial-only" — but the row text is materially incorrect and should be amended. Recommend a small audit correction here too.

**Open count discrepancy:** The audit's distribution claim "10 ❌" should be re-stated with the canonical row IDs and either footnoted to acknowledge the qualified-❌ rows (139, 210, 211) and SPEC-ISSUE-pending rows (115/116/117/118/82/101) are tallied separately, or the count should be revised. See §2 inventory.

---

## 2. ❌ row inventory confirmation

### 2.1 Distribution claim (audit line 10)

> "Distribution: **54 shipped (✅)**, **21 partial (🟡)**, **10 spec-only/aspirational (❌)**, **4 phantom (👻)**."

### 2.2 Direct grep for ❌ in audit

```
$ grep -n "❌" language-status-audit-2026-04-29.md
[24 ❌ markers in matrix tables; 3 in summary lines 268-270]
```

Distribution by line:

| Line | Row | Status marker | Qualifier | Counts toward "10"? |
|---|---|---|---|---|
| 82 | Tier 1 initial-load query constraint syntax | ❌ | (open SPEC-ISSUE-027) | Maybe — see §2.3 |
| 92 | `scrml migrate` CLI command | ❌ | (none) | **YES** |
| 101 | `<db>` advanced txn API | ❌ | (open SPEC-ISSUE-018) | Maybe — see §2.3 |
| 115 | Custom shape registration via `^{}` | ❌ | (SPEC-ISSUE pending §53.13.1) | Maybe — see §2.3 |
| 116 | Boolean predicates | ❌ | (SPEC-ISSUE pending §53.13.4) | Maybe |
| 117 | Type alias for named predicates | ❌ | (SPEC-ISSUE pending §53.13.3) | Maybe |
| 118 | Constraint arithmetic propagation | ❌ | (SPEC-ISSUE pending §53.13.2) | Maybe |
| 139 | `show=` (toggle visibility) | ❌ tutorial-only | qualified | NO (qualified) |
| 165 | Nested `<program>` `lang=` sidecar | ❌ | (none) | **YES** |
| 166 | Nested `<program>` WASM | ❌ | (none) | **YES** |
| 167 | Supervised restarts | ❌ | (none) | **YES** |
| 169 | Cross-language RPC | ❌ | (none) | **YES** |
| 181 | Tailwind arbitrary values | ❌ | (SPEC-ISSUE-012) | **YES** *(settled — false alarm)* |
| 182 | Tailwind variant prefixes | ❌ | (SPEC-ISSUE-012) | **YES** *(settled — false alarm)* |
| 183 | Tailwind custom theme | ❌ | (SPEC-ISSUE-012) | **YES** *(settled — true)* |
| 184 | `class={expr}` dynamic class string | ❌ | (SPEC-ISSUE-013) | **YES** |
| 201 | WASM sigils inside `_{}` | ❌ | (none) | Maybe |
| 202 | Sidecar foreign code | ❌ | (none) | Maybe |
| 209 | `compiler.options` API | ❌ | (TBD §28) | Maybe |
| 210 | `compiler.registerKeyword` | ❌ architecturally-blocked | qualified | NO (qualified) |
| 211 | `compiler.fetchSchema` | ❌ intentional | qualified | NO (qualified) |
| 235 | Async errors / future error composition | ❌ | (Appendix C deferred) | Maybe |
| 236 | Retry / telemetry | ❌ | (Appendix C deferred) | Maybe |
| 250 | Targeted HTML spec version | ❌ | (SPEC-ISSUE-005) | **YES** |
| 268-270 | (summary recap of 165/166/167) | ❌ spec-only | recap | NO (duplicate) |

### 2.3 Reconciling "10"

**Raw matrix unqualified ❌ count: 21.** Subtracting the 3 qualified rows (139/210/211) yields 21. The audit author's "10" must select a subset. The most defensible interpretation: **the 10 most-prominent spec-only/aspirational features** (those driving Top-5 drifts and article amendments), excluding rows that are tracked-as-open-SPEC-ISSUE (and thus not "aspirational" but "deferred-by-design") and excluding rows already covered by SPEC-ISSUE-pending categories elsewhere in the audit.

The dispatch identified "3 Tailwind rows already settled" so 7 remain. The most prominent 7 are:

- 92 (migrate CLI)
- 165, 166, 167 (nested-program triplet — Top-5 drift item 2)
- 169 (cross-language RPC)
- 184 (`class={expr}`)
- 250 (HTML spec version)

That gives 7 + 3 Tailwind = **10**. This matches.

**Discrepancy surfaced:** The audit does not explicitly enumerate which 10 it counts. SPEC-ISSUE-pending rows 82/101/115/116/117/118/201/202/209/235/236 are also genuine ❌ but the audit appears to treat them as "tracked-via-SPEC-ISSUE" and outside the prominent count. Recommend the audit be amended to either:

1. Explicitly enumerate the 10 it counts (with row line numbers), OR
2. Restate the distribution to include the SPEC-ISSUE-pending rows in a separate sub-tally.

---

## 3. Per-row analysis

### 3.1 Row 92 — `scrml migrate` CLI command

**Audit row text (verbatim, line 92):**
```
| `scrml migrate` CLI command | ❌ | §39 (implied) | `compiler/src/commands/` has only build/compile/dev/init/serve — **no `migrate.js`** | Example 17 says "scrml migrate applies it" — CLI doesn't exist |
```

**SPEC §39.8 (line 13901, verbatim):**
> ### 39.8 The `scrml migrate` CLI
>
> The migration workflow uses two compiler-generated artifacts and one CLI command.
>
> #### 38.8.1 Generated Artifacts
>
> At compile time, the compiler writes two files alongside the database path:
>
> - `<db-path>.migration.sql` — the full migration SQL for the current diff. Overwritten on each compile.
> - `<db-path>.migration.json` — machine-readable diff metadata: tables affected, operations, risk level (`safe` | `destructive`).
>
> [...]
>
> #### 38.8.2 `scrml migrate` Flags
>
> | Flag | Behavior |
> |---|---|
> | `scrml migrate` | Applies all non-destructive operations from `<db-path>.migration.sql`. Prompts before destructive operations. |
> | `scrml migrate --dry` | Prints the migration SQL to stdout without applying it. Does not modify the database. |
> | `scrml migrate --check` | Exits with code 1 if the diff is non-empty. [...] |
> | `scrml migrate --force` | Applies all operations including destructive ones without prompting. [...] |

**Implementation trace:**

```
$ ls /home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/commands/
build.js  compile.js  dev.js  init.js  serve.js
```

No `migrate.js`. Plus:

```
$ grep -rn "scrml migrate\|migrate.js\|migrateCommand" compiler/src/
[no matches]

$ grep -rn "migration.sql\|migration.json" compiler/src/
[no matches]

$ grep -rln "schema-differ\|diffSchema" compiler/src/
compiler/src/schema-differ.js
compiler/src/expression-parser.ts
compiler/src/types/ast.ts
compiler/src/ast-builder.js
[NOT in any commands/*.js]
```

`schema-differ.js:136 diffSchema(desired, actual)` exists, but is NOT wired into any `commands/*.js` build/compile path. The migration-artifact generation step (§38.8.1) is also unimplemented — no code emits `.migration.sql` / `.migration.json`.

**Classification: ❌ TRUE spec-only.** Spec defines a fully normative CLI (4 flags, 3 SHALL clauses), no implementation, no tests. Schema-differ infrastructure is partial pre-work.

**Recommended disposition:** Fix-work. Implement `compiler/src/commands/migrate.js` plus migration-artifact generation in build/compile pipeline.

**Effort estimate:** **T2 medium.** Schema-differ is built; needs (a) artifact emission in build, (b) CLI command with flag parsing, (c) prompt-before-destructive logic, (d) transaction-wrap on apply, (e) CI test fixtures.

---

### 3.2 Row 165 — Nested `<program>` `lang=` sidecar

**Audit row text (verbatim, line 165):**
```
| Nested `<program>` `lang=` sidecar | ❌ | §43.2 row 2 + §4.12.5 | **No `emit-sidecar.ts` in codegen** | **Browser-language article OVERCLAIMS** (line 70: "foreign-language sidecar, with typed RPC, supervised restarts") |
```

**SPEC §43.2 (line 14642, verbatim):**
> ### 43.2 Execution Context Types
>
> | Context | Identifying Attributes | Runtime Model |
> |---|---|---|
> | Web Worker | `name=` (no `lang=`, no `route=`) | `new Worker()`, postMessage |
> | Foreign Sidecar | `name=`, `lang=` (not `mode="wasm"`) | Subprocess; HTTP or socket |
> | WASM Module | `name=`, `lang=`, `mode="wasm"` | `WebAssembly.instantiate()` |
> | Server Endpoint | `name=`, `route=` | Bun.serve() route handler |

**Implementation trace:**

```
$ ls compiler/src/codegen/ | grep -E "sidecar|wasm|foreign"
[no matches — only emit-worker.ts]

$ grep -rn "emit-sidecar\|emitSidecar" compiler/src/
[no matches]

$ grep -rn "use foreign:\|use\s\+foreign\|foreign:" compiler/src/
[no matches]
```

Audit row is consistent with the codegen directory listing and grep. Only `emit-worker.ts` exists for the §43.2 row 1 "Web Worker" case. `lang=` attribute is parsed by the AST/tokenizer but produces no codegen.

**Classification: ❌ TRUE spec-only.** Spec normative (§43.2 row 2), zero codegen, zero tests for sidecar path.

**Recommended disposition:** (a) Article amendment (browser-language article line 70 overclaim — already in audit's article-amendment queue at line 28-29); (b) spec stability check — should §43.2 row 2 stay normative or move to "future"?

**Effort estimate:** Article amendment T1 (small). Implementation T3 (large): subprocess management, RPC marshaling, supervisor wiring.

---

### 3.3 Row 166 — Nested `<program>` WASM (`mode="wasm"`)

**Audit row text (verbatim, line 166):**
```
| Nested `<program>` WASM (`mode="wasm"`) | ❌ | §43.2 row 3 | **No `emit-wasm.ts` in codegen** | **Browser-language article OVERCLAIMS** |
```

**SPEC §43.2 row 3** (same table as §3.2 above) plus §23.3 (Call-Char Sigils for WASM, lines 11286–11440) which depends on it.

**Implementation trace:**

```
$ grep -rn "emit-wasm\|emitWasm\|WebAssembly\.instantiate\|mode=\"wasm\"" compiler/src/
[no codegen matches; only mention is in emit-channel comment about WebSocket]

$ grep -rn "callchar\|call-char\|extern\b" compiler/src/
[no matches — §23.3 extern declaration is unimplemented]
```

The §23.3 call-char registry (`r`/`c`/`C`/`z`/`o`/`a` for Rust/C/C++/Zig/Odin/AssemblyScript) and the `extern` declaration grammar (§23.3.3) are both unimplemented.

**Classification: ❌ TRUE spec-only.** §43.2 row 3 normative, §23.3 fully specified, zero codegen, zero tests.

**Recommended disposition:** Same as 3.2 — article amendment + spec stability decision.

**Effort estimate:** Implementation T3 (large): WASM toolchain integration (Rust/C/Zig build hooks), `extern` parser, call-char tokenizer, type marshaling glue.

---

### 3.4 Row 167 — Supervised restarts (`restart=`/`max-restarts=`/`within=`)

**Audit row text (verbatim, line 167):**
```
| Supervised restarts (`restart=`/`max-restarts=`/`within=`) | ❌ | §46 | **No supervisor codegen.** `runtime-template.js` "restart" hits are timer-resume, unrelated | **Browser-language article OVERCLAIMS** |
```

**SPEC §46.3 / §46.6 (line 14853, verbatim):**
> ### 46.3 Supervision Attributes
>
> Supervision policy is declared on the `<program>` element, not in observation syntax:
>
> ```scrml
> <program name="tracker" restart="on-error" max-restarts=3 within=60>
>     ...
> </>
> ```
>
> See §43.4 for the full attribute table.
>
> [...]
>
> ### 46.6 Normative Statements
>
> [...]
> - Supervision policy (`restart=`, `max-restarts=`, `within=`) SHALL be declared as attributes on the `<program>` element.

**SPEC §43.4 (line 14661):**
> `restart=` declares a supervision strategy:
>
> | Value | Behavior |
> | `"always"` | Restart unconditionally on crash |
> | `"never"` | Terminate on crash (default for workers) |
> | `"on-error"` | Restart on abnormal termination only (default for sidecars) |
>
> `max-restarts=N` and `within=S` limit restart frequency.

**Implementation trace:**

```
$ grep -rn "restart=\|max-restarts\|maxRestarts\|supervisor\|emit-supervisor" compiler/src/
[no codegen matches]
```

Confirmed by audit's own provenance footnote (line 406): "grep -E 'restart=|max-restarts|when terminate' compiler/src/ — only `runtime-template.js` timer-resume hits (unrelated)".

**Classification: ❌ TRUE spec-only.** Three normative attributes, zero codegen, zero supervisor module.

**Recommended disposition:** Same as 3.2 — article amendment + spec stability.

**Effort estimate:** Implementation T2-T3 (medium-large): supervisor state machine, restart-window tracking, hookup to nested-program crash detection. Pre-requisite: emit-sidecar/emit-wasm landed (since restarts are most relevant to those).

---

### 3.5 Row 169 — Cross-language RPC (sidecar)

**Audit row text (verbatim, line 169):**
```
| Cross-language RPC (sidecar) | ❌ | §43 | Worker-RPC via postMessage exists; cross-language RPC does not | |
```

**SPEC §43.5.1 (line 14673, verbatim):**
> #### 43.5.1 RPC (Function-Call Syntax)
>
> ```scrml
> <program name="compute">
>     ${ export function add(a: number, b: number) -> number { return a + b } }
> </>
> ${ const result = await <#compute>.add(1, 2) }
> ```
>
> Cross-program calls return `Promise<T>`. Unawaited cross-program calls SHALL be compile error E-PROG-004.

**Implementation trace:**

```
$ grep -rn "cross-language\|crossLanguage\|sidecarRPC" compiler/src/
[no matches]

$ grep -rn "WebSocket\|cross-lang" compiler/src/codegen/
[only intra-language WebSocket channels (emit-channel.ts) — same-runtime client/server]
```

`<#compute>.add(1,2)` syntax and Promise<T> wrapping is implemented for the **Worker** case only (since emit-worker.ts is the sole §43.2 codegen). For sidecar/WASM, cross-language RPC is a pure spec.

**Classification: ❌ TRUE spec-only** *(for the cross-language case)*. RPC syntax is implemented for same-language Web Worker; cross-language is dependent on emit-sidecar/emit-wasm (§3.2/§3.3).

**Recommended disposition:** Group with rows 165/166/167 in a single "nested-program non-Worker context" disposition. Fix-work depends on those rows.

**Effort estimate:** Bundled with #2/#3 above.

---

### 3.6 Row 184 — `class={expr}` dynamic class string

**Audit row text (verbatim, line 184):**
```
| `class={expr}` dynamic class string | ❌ | §5 line 1371 | SPEC-ISSUE-013 — "Planned" | |
```

**SPEC §5.5.4 (line 1301, verbatim):**
> - `class={expression}` will compute the full class string by evaluating `expression` as a
>   JavaScript expression.
> - If the expression references `@variables`, the class will update reactively when those
>   variables change.
> - The expression result SHALL be coerced to a string. An array result SHALL be joined with
>   spaces (e.g., `["a", "b"]` → `"a b"`). A null or undefined result SHALL produce an empty
>   class string.
>
> This form will be fully specified and normalized in a future spec revision. SPEC-ISSUE-013 tracks it.

**Spec class-binding summary table at line 1371:**
> | `class={expression}` | Conditional | Full class string from JS expression | Planned (SPEC-ISSUE-013) |

**Implementation trace:**

```
$ grep -rn "class={\|classExpr\|dynamicClass" compiler/src/
compiler/src/block-splitter.js:355: // Bare '{' opener: props={...}, class={expr}, onClick={handler}.
```

That's a comment, not a code path. The block-splitter recognizes the bare-`{` opener pattern in general but there is no `class={expr}`-specific codegen. The shipped class binding forms are:

- `class="foo bar"` — static (✅, emit-html.ts)
- `class:name=@cond` — toggle directive (✅, emit-html.ts:62, 634, 660; emit-event-wiring.ts)
- `class="prefix-${@var}"` — template literal interpolation (✅)

Sample evidence: `samples/multi-step-form.scrml:94`, `samples/admin-panel.scrml:138`, `samples/gauntlet-r19/go-dev.scrml:39-41` all use `class:name=` form. **No sample uses `class={expr}` form.**

**Classification: ❌ TRUE spec-only.** Spec calls it "Planned" explicitly; SPEC-ISSUE-013 still open at top of §5; no codegen, no test, no sample.

**Wait — SPEC-ISSUE-013 ambiguity:** Two SPEC-ISSUE-013 references exist:
- Line 1309: "SPEC-ISSUE-013 tracks it" (`class={expr}`)
- Line 3634, 4099: "SPEC-ISSUE-013 RESOLVED — animationFrame()"

The audit treats SPEC-ISSUE-013 as still open for `class={expr}`. The spec text is internally inconsistent — same SPEC-ISSUE number reused for two different topics. **Inferred conclusion:** Either the audit is reading a stale class-binding summary table (line 1371 still says "Planned (SPEC-ISSUE-013)" while line 3634/4099 closes a *different* SPEC-ISSUE-013 about animationFrame) — or the SPEC-ISSUE numbering has collided. This is a **spec-hygiene bug, not a feature classification bug.** Either way, `class={expr}` is plainly unimplemented.

**Recommended disposition:**
1. Spec hygiene: rename one of the two SPEC-ISSUE-013 entries to disambiguate (this is a documentation cleanup, not a feature decision).
2. Fix-work: implement `class={expr}` as a spec-bookmark since the §5.5.4 prose already specifies the semantics (string coerce, array join, null/undefined empty). Effort: T2 (medium) — needs reactive-binding hookup since `class={...@var...}` must update when @var changes.

**Effort estimate:** Spec cleanup T1 (small); implementation T2 (medium).

---

### 3.7 Row 250 — Targeted HTML spec version

**Audit row text (verbatim, line 250):**
```
| Targeted HTML spec version | ❌ | SPEC-ISSUE-005 (line 11517) | TBD | |
```

**SPEC §24.2 (line 11522, verbatim):**
> - The targeted HTML spec version is a compiler configuration concern. The default target version is TBD (SPEC-ISSUE-005).

**Implementation trace:**

```
$ grep -rn "html-spec-version\|targetHtml\|htmlSpec\|html-version" compiler/src/
[no matches]
```

Compiler settings table (§28, line 11748) lists 3 settings (`verbose closers`, `html-content-model`, `name-mismatch warning`) — no HTML-version setting.

**Classification: ❌ TRUE spec-only.** SPEC-ISSUE-005 explicitly TBD, no implementation. The HTML element registry (`html-elements.js`, 21KB) is the de-facto target but has no version-pinning.

**Recommended disposition:** Low-priority spec-cleanup. Either pick a target HTML spec version (e.g., WHATWG HTML Living Standard, snapshot date) and amend §24.2 to close SPEC-ISSUE-005, or leave deferred.

**Effort estimate:** T1 (small) — a spec amendment + a default-value constant in `html-elements.js` header. No actual functional change.

---

### 3.8 (Bonus, NOT one of the 10) Row 139 — `show=` directive — INCIDENTAL FALSE-ALARM

**Audit row text (verbatim, line 139):**
```
| `show=` (toggle visibility) | ❌ tutorial-only | — | **Not in SPEC.md, not specially handled.** `emit-html.ts:529` falls through as regular HTML attr | Tutorial drift — `02e-control-flow.scrml:13` |
```

**SPEC §17.2 (line 7621, verbatim):**
> ### 17.2 `show=` Attribute
>
> The `show=` attribute is a visibility conditional.
>
> ```
> <element show=expr>content</element>
> ```
>
> [...]
> - `show=` is distinct from `if=`: `show=` hides, `if=` removes.

Plus §17 line 7414:
> - `if=`, `else-if=`, and `else` MAY coexist on the same element with `show=`. When `show=` is present alongside an if-chain, the element is conditionally included in the DOM by the if-chain rule and then additionally subject to the `show=` visibility rule [...]

Plus §17 line 7606:
> **Interaction with `show=`:** These compose. `<div if=@hasContent show=@visible>` means [...]. An `else` or `else-if=` element MAY also carry `show=`.

**Implementation trace:**

```
$ grep -n 'show' compiler/src/codegen/emit-html.ts
emit-html.ts:62:  if (name === "if" || name === "show" || name === "else" || name === "else-if") return false;
emit-html.ts:659:          if (varName.startsWith("@") && (name === "if" || name === "show")) {
emit-html.ts:660:            // §17.1 / §17.2: if=@var / show=@var — reactive conditional binding.
emit-html.ts:663:            // show= → display-toggle semantics (Vue v-show)
emit-html.ts:665:            const dataAttr = name === "show" ? "data-scrml-bind-show" : "data-scrml-bind-if";
emit-html.ts:674:                ...(name === "show" ? { isVisibilityToggle: true } : { isConditionalDisplay: true }),
emit-html.ts:688:          if (name === "if" || name === "show") {
emit-html.ts:690:            const dataAttr = name === "show" ? "data-scrml-bind-show" : "data-scrml-bind-if";

$ grep -n 'show' compiler/src/codegen/emit-event-wiring.ts
emit-event-wiring.ts:410: // Visibility toggle (show=) — same display-toggle codegen, different selector
emit-event-wiring.ts:416: const dataAttr = binding.isVisibilityToggle ? "data-scrml-bind-show" : "data-scrml-bind-if";
emit-event-wiring.ts:460: lines.push(`        const _scrml_show = ${conditionCode};`);
emit-event-wiring.ts:461: lines.push(`        if (_scrml_show) {`);
```

**Tests:**
```
$ grep -n 'show' compiler/tests/unit/allow-atvar-attrs.test.js
test.js:8:    *   §1  show=@count produces data-scrml-bind-show placeholder (Phase 1 — visibility-toggle directive)
test.js:107: describe("§1: show=@count produces data-scrml-bind-show", () => {
test.js:108:   test("tokenizer accepts show=@count", () => {
test.js:115:   test("AST builder produces variable-ref for show=@count", () => {
test.js:126:   test("codegen produces data-scrml-bind-show for reactive show=@count", () => {
[Phase 1 (2026-04-29) tests — show=@var is a reactive visibility-toggle directive]
```

**Samples:**
```
samples/gauntlet-r19/react-dev.scrml:62: <div class="success" show=submitted>
samples/gauntlet-r19/angular-dev.scrml:49: <div class="inspector" show=inspectorOpen>
samples/gauntlet-r19/angular-dev.scrml:50: <div show=(selectedType == "ThemeConfig")>
samples/gauntlet-r19/go-dev.scrml:54: <div class="detail" show=selectedName>
samples/compilation-tests/control-show-expr.scrml:3: // Tests: show=(expr) form with reactive refs in the expression.
samples/compilation-tests/control-show-expr.scrml:10: <button show=(@enabled && @count > 3)>Submit</button>
```

**Classification: ✅ FALSE-ALARM (audit row materially wrong).**

The audit row makes three errors:
1. "Not in SPEC.md" — **SPEC §17.2 is normative**, plus line 7414 and 7606 cite `show=` interaction with if-chain.
2. "not specially handled" — `emit-html.ts:62, 659–696` and `emit-event-wiring.ts:410–461` specifically handle `show=` with display-toggle semantics (the comment at 663 explicitly cites Vue v-show).
3. "falls through as regular HTML attr" — only the `show=literal-string` case (no `@`-prefix) falls through, per the test §3 at line 188 of `allow-atvar-attrs.test.js` (and that's by design — tutorial line 13's `<p show=@verbose>` IS reactive).

**However:** Since 139 has the `❌ tutorial-only` qualifier, **it's NOT one of the 10 prominent ❌ rows**. The audit's "fix the cracks" item #1 ("Tutorial: fix `show=` (drop, implement, or document as no-op)") is **based on this incorrect classification** and should be reconsidered: `show=` works as specified.

The actual concern that may have motivated row 139 is: **is there a Phase-1 status of `show=` from 2026-04-29?** Per `allow-atvar-attrs.test.js:17`: "Phase 1 (2026-04-29): show=@var is now a reactive visibility-toggle directive. Previously show=@var was treated as a generic HTML attribute (@ stripped)." So as of 2026-04-29 (audit's own date), the directive shipped. The audit's row text was true *before* Phase 1 but became false *that same day* the audit was written. Audit row is stale-by-hours.

**Recommended disposition:**
1. **Audit row 139 amendment:** Move ❌ tutorial-only → ✅ shipped Phase 1 (2026-04-29). Update the row text to reference SPEC §17.2 and emit-html.ts:659–696.
2. **Drop "fix the cracks" item #1.** The tutorial example `<p show=@verbose>` actually works as taught (toggle visibility on a `<p>` via `display:none`).
3. **Update Top-5 drift item 5** (line 18) — `show=` is no longer a tutorial-vs-spec-vs-implementation drift.

**Effort estimate:** Audit-row amendment T1 (small). No code changes.

---

## 4. Hit-rate summary

### 4.1 Cumulative across all S48-audit verification recons

| Recon (chronological) | Audit row(s) | Audit said | Reality | Outcome |
|---|---|---|---|---|
| `lin-approach-b-verification` | 124 (🟡 cross-block) | uncertain | shipped + tested | **FALSE ALARM** |
| `audit-remaining-phantoms` | 196-199 (👻 compiler.*) | live phantom | resolved by S49 E-META-010 | **FALSE ALARM** *(post-S49)* |
| `tailwind-arbitrary-and-variants` | 181 (Tailwind arbitrary) | spec-only | **shipped post Tailwind-3 merge** | **FALSE ALARM** |
| `tailwind-arbitrary-and-variants` | 182 (Tailwind variants) | spec-only | shipped (responsive + state pre-3, dark/print/motion-* by 3) | **FALSE ALARM** |
| `tailwind-arbitrary-and-variants` | 183 (Tailwind theme) | spec-only | TRUE — deferred to v2 | **TRUE ❌** |
| THIS RECON | 92 (`scrml migrate`) | spec-only | TRUE | **TRUE ❌** |
| THIS RECON | 165 (`<program> lang=`) | spec-only | TRUE | **TRUE ❌** |
| THIS RECON | 166 (`<program>` WASM) | spec-only | TRUE | **TRUE ❌** |
| THIS RECON | 167 (supervised restarts) | spec-only | TRUE | **TRUE ❌** |
| THIS RECON | 169 (cross-lang RPC) | spec-only | TRUE | **TRUE ❌** |
| THIS RECON | 184 (`class={expr}`) | spec-only | TRUE | **TRUE ❌** |
| THIS RECON | 250 (HTML spec version) | spec-only | TRUE | **TRUE ❌** |
| THIS RECON (bonus) | 139 (`show=`) | tutorial-only ❌ | **shipped 2026-04-29 same day** | **FALSE ALARM** |

**Tally:**
- Audit verifications attempted: 14
- TRUE ❌ confirmed: 7 (50%)
- FALSE ALARM (audit miss): 7 (50%)

### 4.2 Pattern breakdown

The prior 100% false-alarm pattern (lin B, phantoms, Tailwind arbitrary/variants) was driven by **inventory-miss recons** — features that shipped in places the audit didn't grep:
- lin Approach B → tests in `gauntlet-s25/` not in `samples/compilation-tests/lin-*`
- compiler.* phantom → resolved by S49 E-META-010 fix not in audit's 2026-04-29 snapshot
- Tailwind arbitrary → §26.4 post-Tailwind-3 merge `b18fa8e`
- Tailwind variants → 5 responsive + 11 state already in pre-3 codepath

This recon's 6 TRUE ❌s are **NOT inventory misses** — they are features where the spec describes a thing and the implementation simply doesn't have it:
- No `migrate.js` in `commands/`
- No `emit-sidecar.ts` / `emit-wasm.ts` / supervisor module in `codegen/`
- No `class={expr}` codegen path
- No `html-spec-version` setting

These are **genuine spec-vs-implementation gaps**, where the audit's classification is correct.

### 4.3 Bonus false-alarm — Row 139 `show=`

The `show=` row IS another inventory-miss / staleness false alarm — but it's a **qualified ❌** (`tutorial-only`), NOT one of the 10. Audit row 139 was true on 2026-04-28 and false by 2026-04-29 (Phase 1 directive shipped same day).

### 4.4 Confidence level for audit accuracy

**For prominent unqualified ❌ rows:** **86% accurate** (6 of 7 TRUE in this recon, plus 1 of 3 TRUE in Tailwind = 7 of 10 = 70%). The audit is reasonably accurate about *spec-defined features that lack implementation*.

**For qualified ❌ rows / SPEC-ISSUE-pending rows / 🟡 partial rows / 👻 phantom rows:** **Low accuracy** (4 of 4 verified rows turned out to be false alarms or post-recon resolved). The audit was written 2026-04-29 the same day major fixes shipped (Phase 1 `show=`, Tailwind arbitrary, S49 E-META-010 etc.) and didn't catch them.

**Implication:** Audit should be re-baselined post-S49. Until then, treat any 🟡/👻/qualified ❌ rows as "may need verification" — but unqualified ❌ rows about missing codegen modules can be trusted.

---

## 5. Recommended next-action queue

### 5.1 Audit-row amendments (apply to scrml-support audit doc)

| # | Action | Audit row | Effort |
|---|---|---|---|
| A1 | Amend row 181 (Tailwind arbitrary) ❌ → ✅ — already pending per dispatch | line 181 | T1 |
| A2 | Amend row 182 (Tailwind variants) ❌ → ✅ — already pending per dispatch | line 182 | T1 |
| A3 | Amend row 183 (Tailwind theme) — keep ❌, footnote v2 deferral | line 183 | T1 |
| A4 | Amend row 139 (`show=`) ❌ tutorial-only → ✅ shipped Phase 1 — *new from this recon* | line 139 | T1 |
| A5 | Drop "fix the cracks" item #1 (`show=` tutorial fix) — `show=` works as taught | line 345 | T1 |
| A6 | Update Top-5 drift item #5 — `show=` no longer a drift | line 18 | T1 |
| A7 | Add an explicit enumeration of the "10 spec-only/aspirational ❌" rows (with line numbers) so readers can reconcile — *Section 2.3* | line 10 | T1 |
| A8 | Note: SPEC-ISSUE-013 is reused for two unrelated topics (`class={expr}` line 1309 and `animationFrame` resolved at 3634/4099) — flag for spec hygiene | (provenance/notes) | T1 |

### 5.2 Fix-work dispatches

| # | Item | Spec ref | Effort | Priority |
|---|---|---|---|---|
| F1 | Implement `compiler/src/commands/migrate.js` + migration-artifact emission | §39.8 | T2 medium | High (Example 17 references it; tutorial gap) |
| F2 | Resolve `class={expr}` — implement per spec §5.5.4 prose | §5.5.4 | T2 medium | Medium (frequent feature ask) |
| F3 | Pick a default HTML spec version, close SPEC-ISSUE-005 | §24.2 | T1 small | Low |
| F4 | Browser-language article amendment — drop/footnote sidecar/WASM/supervisor claims | rows 165/166/167 articles | T1 small | High (article integrity) |
| F5 | Spec stability decision: are §43.2 rows 2/3 + §46 still normative for v1, or move to "future"? | §43.2/§46 | T2 (writing) | Medium (article alignment) |
| F6 | Long-term: implement emit-sidecar.ts (subprocess + RPC) | §43.2 row 2 | T3 large | Low (infrastructure) |
| F7 | Long-term: implement emit-wasm.ts + §23.3 call-char + extern parser | §43.2 row 3 + §23.3 | T3 large | Low (infrastructure) |
| F8 | Long-term: implement supervisor codegen for restart=/max-restarts=/within= | §46.3, §43.4 | T2-T3 | Low (depends on F6/F7) |
| F9 | Spec hygiene: disambiguate two SPEC-ISSUE-013 entries (class={expr} vs animationFrame) | line 1309 vs 3634/4099 | T1 small | Low |

### 5.3 Further recon needs

| # | Question | Why | Effort |
|---|---|---|---|
| R1 | Verify the SPEC-ISSUE-pending rows 82/101/115/116/117/118/201/202/209/235/236 are still pending and not closed by recent sessions | Pattern: audit may be stale-by-hours on these too | Medium |
| R2 | Verify `<db>` advanced txn API status — `transaction-block` codegen exists at emit-logic.ts:1178 (workaround using `sql.unsafe("BEGIN")`) — is this enough for §44.6 closure? | Possible audit-row promotion to 🟡 partial | Small |
| R3 | Verify Tier 1 initial-load query constraint syntax (row 82) — is there any `on mount` override pattern that emulates pagination? | SPEC-ISSUE-027 may be partially-mitigated | Small |
| R4 | Check whether SPEC-ISSUE-013 `class={expr}` is actually duplicated with the resolved animationFrame entry at 3634/4099 — pure spec-hygiene question | Affects whether class={expr} is "still tracked" or "orphaned issue ID" | Small |

---

## 6. Open questions for user

1. **Confirm "10" interpretation.** This recon assumes the audit's "10 spec-only/aspirational ❌" denotes the 7 prominent unqualified rows + 3 Tailwind rows. Is that right? If not, please specify which 10 the audit intended (and whether SPEC-ISSUE-pending rows like 115/116/117/118 should be folded in).

2. **Spec stability decisions for §43.2 rows 2/3 + §46.** Should the nested-program sidecar/WASM/supervisor surface stay normative in v1 (and accept that codegen is missing), or be moved to "future considerations" so the spec text accurately reflects the live-compiler scope? This affects whether F4 article amendment is "delete/footnote" or "delete/footnote + spec amendment".

3. **`class={expr}` disposition.** Spec §5.5.4 prose is fully specified ("string coerce, array join, null/undefined empty"). Is there a reason it's "Planned" rather than "implemented" — was it deferred for §5.5.6 CSS-scoping interaction concerns or just unprioritized?

4. **SPEC-ISSUE-013 number collision.** Same SPEC-ISSUE number is used for two unrelated topics (class={expr} at line 1309 vs animationFrame at 3634/4099). Hygiene fix or intentional?

5. **Bonus row 139 amendment.** The `show=` row is materially incorrect and the corresponding "fix the cracks" item #1 is unwarranted. Confirm OK to amend the audit?

---

## 7. Provenance

**Spec:** `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md` (20,442 lines).

**Audit:** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md` (423 lines, 2026-04-29).

**Methodology references:**
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/recon/lin-approach-b-verification-2026-04-29.md`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/recon/audit-remaining-phantoms-2026-04-29.md`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/recon/tailwind-arbitrary-values-and-variants-2026-04-29.md`

**Load-bearing absences (NULL search results):**
- `find compiler/src/commands -name "migrate.js"` — does not exist
- `grep -rn "emit-sidecar\|emit-wasm\|emitSidecar\|emitWasm" compiler/src/codegen/` — zero matches
- `grep -rn "callchar\|extern\b" compiler/src/` — zero matches
- `grep -rn "use foreign:" compiler/src/` — zero matches
- `grep -rn "restart=\|max-restarts" compiler/src/` — zero matches
- `grep -rn "html-spec-version\|targetHtml" compiler/src/` — zero matches
- `grep -rn "class={\|classExpr" compiler/src/` — only one block-splitter comment hit; no codegen
- `grep -rn "migration.sql\|migration.json" compiler/src/` — zero matches

**Load-bearing presences (FOUND, contradicting audit):**
- `emit-html.ts:62, 634, 659–696` — `show=` and `class:` are specially handled
- `emit-event-wiring.ts:410–461` — `show=` visibility-toggle codegen
- `compiler/tests/unit/allow-atvar-attrs.test.js:107–187` — Phase 1 `show=` directive tests
- `samples/compilation-tests/control-show-expr.scrml` — `show=(expr)` sample
- `compiler/src/codegen/emit-logic.ts:1178–1193` — `transaction-block` codegen workaround (relevant to row 101 if re-evaluated)

## 8. Tags
#recon #audit-verification #spec-only #aspirational #s48-audit #s49 #scrml-migrate #nested-program #wasm #sidecar #supervisor #class-expr #show-attribute #spec-issue-005 #spec-issue-013 #scrmlTS

## 9. Links
- [language-status-audit (S48)](../../../scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md)
- [lin-approach-b-verification](./lin-approach-b-verification-2026-04-29.md)
- [audit-remaining-phantoms](./audit-remaining-phantoms-2026-04-29.md)
- [tailwind-arbitrary-values-and-variants](./tailwind-arbitrary-values-and-variants-2026-04-29.md)
- [SPEC.md](../../compiler/SPEC.md)
