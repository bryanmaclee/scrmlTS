# `compiler.*` API Decision Recon

**Date:** 2026-04-29
**Recon agent:** scrmlTS recon (read-only, no compilations run)
**Caller:** S48 language-status follow-up (post-audit)
**Type:** decision-driving inventory + 3-option analysis
**Source-of-truth:** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md` (S48 audit) and `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/meta-system-capability-frontier-2026-04-26.md` (S43 deep-dive)

---

## TL;DR

The `compiler.*` symbol is a **classification-only stub**. SPEC §22.4 (line 10461) names `compiler.*` as one of five compile-time API patterns. The meta-checker (`compiler/src/meta-checker.ts:165-170`) implements that classification literally — both via regex string-fallback (`/\bcompiler\s*\./`) and via `exprNodeContainsIdentNamed(exprNode, "compiler")`. The meta-eval pass (`compiler/src/meta-eval.ts:443`) then injects only `emit` and `reflect` into the `new Function(...)` body. Any user-written `compiler.X(...)` in a `^{}` block:

1. Passes meta-checker classification cleanly (block flagged compile-time).
2. Hits `ReferenceError: compiler is not defined` at meta-eval, surfaced as `E-META-EVAL-001` with the JS error message attached.

There is **zero implementation** behind any `compiler.X` member. There is **zero spec** beyond the line-10461 mention and the line-10978 phase-separation reference. There are **zero samples, examples, or compilation-tests** that exercise `compiler.X` in user code. The only tests that touch the symbol are 4 classification-only fixtures.

**Recommendation: Option B (remove `compiler.*` from §22.4 classification).** Cheapest fix, ends the contradiction, deletes 3 small code sites + 1 spec line + 4 test fixtures. Preserves design optionality — `compiler.*` can be reintroduced later as part of a designed API surface (the OQ-1 deep-dive). Aligns with the "radical-doubt + simplicity-defender" lineage and the language's posture of removing phantoms rather than papering over them.

---

## 1. Surface inventory

### 1a. SPEC §22.4 grammar surface

| File | Line | Reference | Context |
|---|---|---|---|
| `compiler/SPEC.md` | 10461 | `` - `compiler.*` API calls `` | §22.4 — list of 5 compile-time API patterns that classify a `^{}` block |
| `compiler/SPEC.md` | 10465-10466 | "Compile-time meta blocks have access to the full compiler-internal type registry and AST via the `compiler.*` API" | §22.4 — claims access via `compiler.*` API |
| `compiler/SPEC.md` | 10978 | `` `compiler.*` `` | §22.8 — phase-separation rule example: "block SHALL NOT reference both compile-time API patterns (e.g., `reflect()`, `compiler.*`) and runtime-only values" |

That is the **entire spec surface for `compiler.*`**: three lines of text, two sections (§22.4, §22.8). No member is defined. No semantics for `compiler.types`, `compiler.ast`, `compiler.options`, `compiler.warn`, `compiler.error`, `compiler.registerMacro`, or any other identifier appears anywhere in `SPEC.md`. The phrase "full compiler-internal type registry and AST" at §22.4:10465 is purely aspirational — it does not bind to any defined member.

### 1b. Compiler source — classification sites (active code paths)

| File | Line | Exact Reference | Role |
|---|---|---|---|
| `compiler/src/meta-checker.ts` | 12 | `// APIs (reflect, bun.eval, emit, compiler.*) execute at compile time` | Doc comment in module header |
| `compiler/src/meta-checker.ts` | 165-170 | `COMPILE_TIME_API_PATTERNS` array — 4 regexes; entry at line **168**: `/\bcompiler\s*\./` | Regex string-fallback classification (used when ExprNode unavailable) |
| `compiler/src/meta-checker.ts` | 367-388 | `exprNodeContainsIdentNamed` helper, comment at lines 370-378 explicitly cites `compiler.*` | ExprNode-path classification — added in S40 Phase 4d Step 8 strict cleanup |
| `compiler/src/meta-checker.ts` | 397 | `\|\| exprNodeContainsIdentNamed(exprNode, "compiler")` | Wired into `bodyUsesCompileTimeApis.testExprNode` |
| `compiler/src/meta-checker.ts` | 1554 | Error message text: "compile-time APIs (reflect, compiler.*, emit, bun.eval)" | E-META-005 phase-separation diagnostic — names `compiler.*` to user |
| `compiler/self-host/meta-checker.scrml` | 11, 120 | Same regex `\bcompiler\s*\.` | Self-hosted classifier mirror |
| `compiler/dist/self-host/meta-checker.js` | 13, 120 | Built output of the self-host file | Generated artifact (rebuilt by self-compilation) |

### 1c. Compiler source — meta-eval injection site (the missing implementation)

| File | Line | Exact Reference | Role |
|---|---|---|---|
| `compiler/src/meta-eval.ts` | 443 | `const fn = new Function("emit", "reflect", bodyCode);` | **The contract.** Only `emit` and `reflect` are bound. No `compiler` is injected. |
| `compiler/src/meta-eval.ts` | 444 | `fn(emitFn, reflectFn);` | Invocation — same two-arg pair |
| `compiler/src/meta-eval.ts` | 446-451 | `errors.push(new MetaEvalError("E-META-EVAL-001", ...))` | The catch site that turns `ReferenceError: compiler is not defined` into a generic `E-META-EVAL-001` |

There is **no** `if (...) injectedNames.push("compiler")`. There is **no** scaffold object built from anywhere. There is **no** `compiler` variable in any surrounding lexical scope that `new Function` could capture (`new Function` only captures global scope). The phantom is total.

### 1d. Test fixtures — classification-only (no functional invocation)

| File | Line | Exact Reference | What it asserts |
|---|---|---|---|
| `compiler/tests/unit/meta-checker.test.js` | 61 | Doc comment: "§53 bodyUsesCompileTimeApis — returns true when compiler.* is present" | Test doc |
| `compiler/tests/unit/meta-checker.test.js` | 881-884 | `test("§53 returns true when compiler.* is present"...)` body: `[makeBareExpr("compiler.registerMacro('foo', () => {})")]`; asserts `bodyUsesCompileTimeApis(body)` returns `true` | Pure classification check — never executes |
| `compiler/tests/unit/self-host-meta-checker.test.js` | 201-204 | `test("detects compiler. access in bare-expr"...)` body: `[makeBareExpr("compiler.registerMacro('foo', fn)")]`; asserts true | Same — classification only |
| `compiler/tests/unit/meta-classifier-emit-raw.test.js` | 98-112 | Test name says `"^{ compiler.* }"` but the **body** uses `reflect(Color)` instead of `compiler.X(...)` | **Misleading test name.** The body actually exercises `reflect()`, not `compiler.*`. Asserts that the block classifies compile-time and emits no `_scrml_meta_effect`. [INFERRED: the test name is a left-over from earlier iterations or a deliberate "regression guard" placeholder; the body never invokes any compiler member.] |

**Verdict on test exposure:** 2 unit tests (meta-checker + self-host) directly reference `compiler.registerMacro(...)` as a string fixture and assert the classifier returns `true`. **Neither runs the meta-eval pass on that body.** A 3rd test (the emit-raw classifier) names `compiler.*` in the title but uses `reflect()` in the body — false flag. **Zero tests exercise an actual `compiler.X(...)` call through meta-eval.**

### 1e. Samples / examples / compilation-tests

`grep -rn "compiler\." samples/ examples/ docs/tutorial-snippets/`: **zero hits** that reference `compiler.X(...)` as user code. Hits in `samples/htmx-debate-dashboard.scrml:82` and `samples/compilation-tests/gauntlet-r10-ts-components.scrml:251` are English prose comments ("trust the compiler"), not API invocations.

`samples/compilation-tests/meta-*.scrml` (20 files including `meta-001…meta-013`, plus `meta-after-markup-001`, `meta-bindings-capture-001`, `meta-bun-eval-001`, `meta-cleanup-001`, `meta-compile-time-pure-001`, `meta-emit-raw-001/002`, `meta-empty-block-001`, `meta-in-component-001`, `meta-in-function-001`, `meta-lift-006`, `meta-lin-capture-001`, `meta-lin-double-consume-001`, `meta-match-in-meta-001`, `meta-multiple-blocks-001`, `meta-nested-deep-001`, `meta-phase-sep-005`, `meta-reflect-hybrid-001/002`, `meta-reflect-outside-008`, `meta-reflect-unknown-003`, `meta-runtime-reactive-001`, `meta-scopeid-001`, `meta-sql-runtime-007`, `meta-type-registry-001`, plus 8 from gauntlet-s20-meta): **zero use `compiler.*`**.

`examples/11-meta-programming.scrml` (the canonical user-facing meta example): uses `emit()` + `reflect()`. **Does not touch `compiler.*`**.

### 1f. Documentation — tutorial / articles

| File | Hits |
|---|---|
| `docs/tutorial.md` | Many "the compiler does X" prose hits. Zero `compiler.X(...)` API references. |
| `docs/external-js.md` | Zero hits |
| `docs/tutorial-snippets/*.scrml` | Zero hits |

### 1g. Summary — what keys exist?

**Zero.** The only "members" mentioned anywhere in the codebase are in fixtures and comments:

| "Member" | Source | Status |
|---|---|---|
| `compiler.registerMacro` | meta-checker.ts:168 comment, meta-checker.ts:370 comment, 2 test fixtures | Doc-comment example only — never implemented, never invoked |
| `compiler.registerKeyword` | scrml-support/.../jai-comptime-vs-scrml-meta-2026-04-02.md (Approach C discussion) | Discussed in deep-dive only |
| `compiler.types`, `compiler.ast`, `compiler.options`, `compiler.warn`, `compiler.error`, `compiler.fetchSchema`, `compiler.typeRegistry`, `compiler.extensions` | All cited in the S43 capability-frontier deep-dive as "what could exist" — none implemented, none specced |
| `compiler.X(...)` (any other) | None |

**The actual surface is the empty set.** What is "the API" is whatever a user happens to type after the dot, which always errors at eval.

---

## 2. Current behavior trace

### 2a. Code path for a hypothetical fixture using `compiler.version`

There is no fixture today. Construct one mentally — equivalent to what a user would write:

```scrml
<program>
${
  type Color:enum = Red | Blue
}
^{
  const v = compiler.version
  emit(`<p>Built with scrml ${v}</p>`)
}
</program>
```

**Stage-by-stage trace (read-only walk through the pipeline):**

1. **Block splitter / AST builder** — produces a `kind: "meta"` node with `body: [const-decl, bare-expr]`.

2. **Type system (TS, Stage 6)** — does not specifically validate the `compiler.*` reference. `compiler` is not a known identifier in the type registry, but the meta-block's body is parsed as a logic context where unknown references are permitted (the type system defers ^{}-block-internal validation to the meta-checker).

3. **Meta-checker (between TS and DG)** — `bodyUsesCompileTimeApis(body)` walks the body:
   - Hits the `const-decl` `v = compiler.version`, calls `testExprNode(initExpr)`.
   - `testExprNode` calls `exprNodeContainsIdentNamed(exprNode, "compiler")` → returns `true` (line 397).
   - Block classifies as **compile-time**.
   - Phase-separation check (`bodyMixesPhases`) does not fire — no runtime values referenced.
   - **No diagnostic is emitted.**

4. **Dependency graph (DG)** — proceeds as normal. The block has no `@var` dependencies.

5. **Meta-eval (after DG, before CG)** — `evaluateMetaBlock` runs:
   - `serializeBody` produces JS string: `const v = compiler.version;\nemit(`<p>Built with scrml ${v}</p>`);`
   - Line 443: `const fn = new Function("emit", "reflect", bodyCode);`
   - Line 444: `fn(emitFn, reflectFn);`
   - **At runtime within `new Function`:** the body executes. `compiler.version` is read. `compiler` is looked up: not in formal parameters (only `emit`, `reflect`), not in global scope of the compiler process (no `globalThis.compiler` exists in the Bun compiler).
   - **Throws:** `ReferenceError: compiler is not defined`
   - Lines 445-451: caught by the try-catch.
   - Line 446-450: an `E-META-EVAL-001` is pushed:
     ```
     E-META-EVAL-001: Compile-time meta evaluation failed: compiler is not defined
     ```
   - `evaluateMetaBlock` returns `null` (no replacement nodes).

6. **CG (codegen)** — the meta node is left in place because eval failed. [INFERRED] Subsequent codegen treats it as a regular runtime meta block? No — this is the worst case.

   Looking at `processNodeList` lines 549-565: when `replacementNodes !== null` we splice; when it is `null` we leave the node in place but **still** the block was classified compile-time, so codegen does not emit a `_scrml_meta_effect` for it. The block is dropped from output entirely (or its nodes pass through to runtime emission paths with surprising semantics — exact behavior here is `[INFERRED]` because I have not traced CG with a failed-eval fixture).

7. **Compile result** — `compiler.errors` array contains one `E-META-EVAL-001` with the JS error string. The user sees:
   ```
   E-META-EVAL-001: Compile-time meta evaluation failed: compiler is not defined
   ```
   No suggestion that `compiler.*` is a phantom. No suggestion to remove. No spec citation.

### 2b. Worst-of-both-worlds confirmation

The S48 audit's framing is exact: **classification matches, evaluation does not**. The user wrote what the spec at §22.4:10461 says works. The compiler classified it correctly per spec. The compiler then errored at eval with no spec-aligned diagnostic. The error is generic (`E-META-EVAL-001`) and traceable only via JS error text, not a scrml error code.

### 2c. What IS implemented in meta-eval

For completeness, the actual injected names are:

- `emit` — the function defined at `meta-eval.ts:428-434`. Pushes to an `emitted` array; subsequently re-parsed via `reparseEmitted`.
- `emit.raw` — the property on `emitFn` defined at `meta-eval.ts:435-437`. Same array, with `raw: true`.
- `reflect` — the function returned by `createReflect(typeRegistry)` (defined in meta-checker.ts; called at meta-eval.ts:439).

JS standard globals (`Math`, `JSON`, `Date`, `Object`, etc.) are accessible via `new Function`'s normal global scope. `bun.eval(...)` is rewritten to its evaluated literal **before** meta-eval runs (`rewriteBunEval` in `codegen/rewrite.ts:449`), so by the time the body executes, `bun.eval(...)` has been replaced with the result string.

**No other compile-time-API symbol is injected.** `compiler` is uniquely the named-but-not-injected case.

---

## 3. Test-impact inventory

### 3a. Tests that exercise `compiler.*` (positive)

| Test file | Test name (line) | Currently passes? | Under Option A (implement)? | Under Option B (remove)? |
|---|---|---|---|---|
| `compiler/tests/unit/meta-checker.test.js` | "§53 returns true when compiler.* is present" (881-884) | YES (classifier returns true) | YES (classifier still returns true) | **NO — would need to be deleted or updated** |
| `compiler/tests/unit/self-host-meta-checker.test.js` | "detects compiler. access in bare-expr" (201-204) | YES | YES | **NO — would need to be deleted or updated** |
| `compiler/tests/unit/meta-classifier-emit-raw.test.js` | "^{ compiler.* } still classifies compile-time (regression guard)" (98-112) | YES — but the body uses `reflect()`, not `compiler.X` | YES (still passes — body is unaffected) | YES (still passes — body unaffected; only the test name is misleading and should be updated for clarity) |

**Total tests directly exercising `compiler.*`: 2.** Both classification-only. Neither invokes meta-eval on a body containing `compiler.X(...)`.

### 3b. Tests that exercise `compiler.*` (negative)

**Zero.** There is no test that asserts an error is emitted when `compiler.X(...)` is used. There is no `E-META-NNN` test guarding against undefined member access. The current behavior — classify-then-ReferenceError — is **completely untested**.

### 3c. Test impact prediction per option

**Option A (implement minimal read-only API):**
- Existing 2 tests still pass (classification unchanged).
- **New tests required:** assert `compiler.version`, `compiler.mode`, `compiler.options.X`, etc. each return correct values; assert that unknown members error cleanly (E-META-NNN) rather than ReferenceError.
- Estimated additions: 6-12 new tests in `meta-eval.test.js` or a new `compiler-api.test.js`.
- Risk: every API addition adds test surface. Scope creep.

**Option B (remove from classification):**
- 2 existing tests **fail** and must be deleted or rewritten. Trivial diff (replace `[makeBareExpr("compiler.registerMacro(...)")]` with another compile-time trigger like `[makeBareExpr("reflect(Foo)")]`).
- 1 misleadingly-named test (meta-classifier-emit-raw.test.js:98) should be renamed for clarity; its body remains valid as a `reflect()` regression guard.
- **New tests required:** assert that `compiler.X(...)` in `^{}` no longer auto-classifies compile-time; instead either falls through to runtime classification (likely producing a different downstream error) or fires a fresh `E-META-NNN` "`compiler.*` is reserved but not implemented".
- Estimated additions: 2-3 new tests covering the error path.

**Option C (partial — implement some keys, error on the rest):**
- Existing 2 tests still pass (classification unchanged).
- **New tests required:** assert each implemented key returns correct values; assert each non-implemented key fires a specific E-META-NNN with member name in the diagnostic.
- Estimated additions: 8-15 new tests.
- Risk: matrix of "what's implemented, what's deferred" must be tested per-member; the partial state itself becomes a maintenance surface.

---

## 4. Three options

### Option A — Implement minimal read-only API

**What gets implemented:**

The minimum honest set, keys that have unambiguous compile-time meaning today:

| Key | Type | Source | Where in compiler |
|---|---|---|---|
| `compiler.version` | string | Read from `compiler/package.json` `"version"` field | Inject into meta-eval scope |
| `compiler.mode` | `"compile"` \| `"check"` \| `"dev"` \| `"build"` | Whatever subcommand is running | `compiler/src/cli.js` already knows; thread through to meta-eval |
| `compiler.boundary` | `"client"` \| `"server"` \| `"compile-time"` | `"compile-time"` always inside `^{}` (compile-time meta) — see Open Question 7a | trivial constant |
| `compiler.options.htmlContentModel` | `"strict" \| "warn" \| "off"` | §28 setting, default `"warn"` | Read from compiler config (TBD per §28) |
| `compiler.options.verboseClosers` | `"on" \| "off"` | §28 setting | Same |
| `compiler.options.nameMismatchWarning` | `"warn" \| "error"` | §28 setting | Same |
| `compiler.warn(code: string, message: string)` | function | Push a warning into the diagnostics stream | New code in meta-eval.ts |
| `compiler.error(code: string, message: string)` | function | Push an error into the diagnostics stream | New code in meta-eval.ts |

**What is NOT implemented (deferred):**

- `compiler.types.register(...)` — type creation (Approach C territory; defer to OQ-1 deep-dive)
- `compiler.ast.read(...)` / `compiler.ast.replaceCurrentBlock(...)` — AST mutation (architecturally large; phasing inversion concerns per S43 deep-dive Dimension 14)
- `compiler.registerKeyword(...)` / `compiler.registerMacro(...)` — reader macros (architecturally blocked per S43 dim 14)
- `compiler.fetchSchema(...)` — async at compile time (intentionally forbidden per §13.1 + meta-eval sync constraint)
- `compiler.extensions[...]` — living-compiler integration (gated on OQ-7)

**Files touched:**

- `compiler/src/meta-eval.ts` — line 443: extend `new Function("emit", "reflect", "compiler", bodyCode)`. Build a `compilerAPI` object before the call. Lines 446-451: refine error handling for unknown member access.
- `compiler/src/meta-checker.ts` — no changes to classification (already detects `compiler.*`). Add `META_BUILTINS` entry for `"compiler"` so phase-separation checks treat it correctly.
- `compiler/SPEC.md` §22.4 — replace the bare bullet `- `compiler.*` API calls` with a sub-section §22.4.3 enumerating the implemented members + their semantics.
- `compiler/SPEC.md` §22.11 — add `E-META-010` (compiler.X member not implemented) or similar.
- `compiler/SPEC.md` §34 — add the error code to the index.
- `compiler/self-host/meta-checker.scrml` — leave the regex alone (still wants the classification trigger).

**Test additions:** 6-12 new tests as enumerated in §3c.

**Test deletions:** 0.

**Risk: scope-creep to mutating API.**

The single biggest risk per the S43 deep-dive (OQ-1): once a `compiler.*` API is partially defined, every future "we need X at compile time" feature requests a new member. Within 2-3 sessions there is pressure to add `compiler.types.register` (downstream of §53.13.1 named-shape registry extension), `compiler.ast.read` (Jai-comparison Approach C), and `compiler.fetchSchema` (Tier 1 server-authority extension hopes). Each step toward AST mutation reopens the phasing-inversion debate (S43 OQ-3) that the meta-system is currently architecturally clean about avoiding.

**Risk: half-spec.**

§22.4 currently says "compile-time meta blocks have access to the full compiler-internal type registry and AST via the `compiler.*` API" (line 10465-10466). Implementing the small set above does **not** match that description. Either the description must be amended to enumerate the small set, or the description remains aspirational and Option A becomes "Option C with extra steps."

**Risk: OQ-2 (determinism) couples in.**

If `compiler.options` exposes settings, then ^{} can read configuration. If a user gates emit() on `compiler.options.verboseClosers`, the build is no longer deterministic across configurations (build cache behavior under §47 content-addressing becomes config-dependent). This is a downstream design consideration the S43 deep-dive flagged as OQ-2.

**Estimated effort:** Medium. ~8-15 hours for the minimum surface above, plus debate framing for which exact keys ship. The S43 deep-dive recommends this be its own spec deep-dive — that recommendation still stands.

### Option B — Remove `compiler.*` from §22.4 classification entirely

**What gets removed:**

- `compiler/src/meta-checker.ts:168` — the regex `/\bcompiler\s*\./` (delete entry from `COMPILE_TIME_API_PATTERNS`)
- `compiler/src/meta-checker.ts:367-388` — the `exprNodeContainsIdentNamed` helper (or just drop the call at line 397)
- `compiler/src/meta-checker.ts:397` — `|| exprNodeContainsIdentNamed(exprNode, "compiler")` line in `testExprNode`
- `compiler/src/meta-checker.ts:1554` — error message text mentioning `compiler.*` (rephrase)
- `compiler/src/meta-checker.ts:12` — doc comment mentioning `compiler.*`
- `compiler/self-host/meta-checker.scrml:11, 120` — same in self-hosted version
- `compiler/SPEC.md:10461` — the bullet `- `compiler.*` API calls`
- `compiler/SPEC.md:10465-10466` — the sentence claiming access via `compiler.*` API
- `compiler/SPEC.md:10978` — the `compiler.*` example in the §22.8 phase-separation rule
- `compiler/tests/unit/meta-checker.test.js:881-884` — delete or rewrite the §53 test
- `compiler/tests/unit/self-host-meta-checker.test.js:201-204` — delete or rewrite

**What gets added:**

A new diagnostic, since `compiler.X(...)` was previously classification-recognized. Rather than silently downgrading to "this looks like a runtime meta block calling a runtime function" (which would produce a confusing E-META-EVAL-001 about `compiler is not defined` at runtime emission), emit a clear error:

- **E-META-010** (next free in §22.11 — E-META-009 already used in source): "`compiler.*` API is not implemented in this revision. The `compiler.*` namespace is reserved for future use. Remove or rename the reference."

Wired in the meta-checker as a top-level rejection: "if a `^{}` body contains an identifier `compiler` followed by a dot, fire E-META-010".

**Files touched:**

- `compiler/src/meta-checker.ts` — ~10 lines deleted across 5 sites; 1 new error-emission site (~15 lines). Net delta: ~+5 lines.
- `compiler/src/meta-eval.ts` — no changes (the symbol no longer reaches eval).
- `compiler/SPEC.md` §22.4 — delete bullet line, amend prose at 10465-10466, amend example at 10978. Net delta: -5 lines.
- `compiler/SPEC.md` §22.11 — add E-META-010 row (+1 line).
- `compiler/SPEC.md` §34 — add E-META-010 entry to the index (+1 line).
- `compiler/self-host/meta-checker.scrml` — same 2-line delete (will be regenerated by `dist/self-host/meta-checker.js`).
- `compiler/SPEC-INDEX.md` — no change (line numbers shift by ~3, regenerate via `bash scripts/update-spec-index.sh`).

**Test additions:** 2-3 new tests:
- "E-META-010 fires when `compiler.X(...)` appears in a `^{}` block"
- "E-META-010 fires for `compiler.options.X` (member access depth)"
- "removing `compiler.*` does not break existing reflect/emit/bun.eval classification"

**Test deletions:** 2 (or rewrites).

**Risk: any user code currently relying on it.**

Per §1d-1f: zero samples, zero examples, zero tutorial mentions, zero compilation-tests use `compiler.X(...)` as user code. The only references are 2 classification-only fixtures (deleted) and 1 misleadingly-named regression test (rename for clarity, body untouched). **Risk is essentially zero.**

**Risk: future regret if a future scrml release wants `compiler.*`.**

Mitigated by the design: E-META-010 explicitly says "reserved for future use." A future spec amendment that adds `compiler.X` semantics deletes E-META-010 and reintroduces classification. No data, no API contract, is destroyed by removal — only the empty stub.

The radical-doubt framing (per the user's prior writing): the current state asserts a contract the compiler does not honor. Option B removes the false assertion. A future spec can re-assert with backing implementation. Nothing is lost.

**Risk: the deep-dive E (S43) recommended a deep-dive, not removal.**

S43 OQ-1 listed three options: (a) eliminate classification, (b) implement minimal read-only, (c) implement full AST. The deep-dive's recommendation was "warrants its own deep-dive" — i.e., do not pick from those three without further investigation. **Option B as recommended below is option (a) of OQ-1.** This recon is reading-only, not designing — but the deep-dive's option (a) is exactly the cheapest fix surfaced.

**Estimated effort:** Small. ~2-4 hours. Near-pure deletion plus a small new diagnostic.

### Option C — Partial: implement some keys, error on the rest

**What gets implemented:**

The clearest-semantics keys: `compiler.version`, `compiler.mode`. That's it. Everything else fires E-META-NNN with the member name in the diagnostic.

**Why this set:**

These two have unambiguous compile-time meaning (the compiler version is a constant of the compilation; `compiler.mode` is the running command, knowable at the point of eval). They have no determinism-leakage risk (version is determined by the compiler binary; mode is determined by user invocation but is observable elsewhere via `bun compiler/bin/scrml.js compile` vs `check`).

`compiler.options.*` is **deferred** — coupling to §28 (settings, "format TBD") means committing to the §28 surface before §28 is complete.

`compiler.warn(...)` / `compiler.error(...)` are **deferred** — they require diagnostic-emission integration, which the S43 deep-dive (Dimension 10) noted is one of the most-requested but architecturally non-trivial features.

`compiler.types.*`, `compiler.ast.*`, `compiler.registerMacro(...)` — all deferred (Approach C territory).

**What gets added:**

- **E-META-010** — "Unknown `compiler.*` member: `compiler.X` is reserved for future use" — message includes the specific member name.
- A specific allow-list at meta-eval that injects only `version` and `mode` on the `compiler` object.

**Files touched:**

- `compiler/src/meta-eval.ts` — extend `new Function` with a 4th argument; build a `compiler` object containing `{ version, mode }` and an opaque proxy that throws E-META-010 for any other member access. ~25 lines added.
- `compiler/src/meta-checker.ts` — add a check: if a `^{}` body's `compiler.*` member name is not in the allow-list, fire E-META-010 at checker time (catch the error before meta-eval). ~15 lines added.
- `compiler/SPEC.md` §22.4 — replace the bare bullet with a §22.4.3 enumerating exactly `compiler.version` and `compiler.mode`; explicit "all other members reserved" clause. ~20 lines added.
- `compiler/SPEC.md` §22.11 — add E-META-010.
- `compiler/SPEC.md` §34 — add E-META-010 entry.

**Test additions:** 8-15 new tests:
- `compiler.version` returns string in expected form
- `compiler.mode` returns the running command
- `compiler.options.X` (any X) fires E-META-010
- `compiler.types.X` fires E-META-010
- `compiler.ast.X` fires E-META-010
- `compiler.registerMacro(...)` fires E-META-010
- `compiler.warn(...)` fires E-META-010 (yes — even though it sounds related)
- Classification still recognizes `compiler.X` patterns regardless of whether X is allowed
- Phase-separation interaction (don't classify a block as compile-time merely because it contains a banned `compiler.X`)

**Test deletions:** 0 (existing classification tests still pass).

**Risk: intermediate complexity.**

The maintenance surface for Option C is a per-member whitelist that grows. Every addition requires: spec text, error code carve-out (member moves from "reserved" to "implemented"), test additions, source allow-list update. This is the worst of Option A's scope-creep AND Option B's complexity.

**Risk: which keys "clear" vs "fuzzy" is itself a design call.**

The set `{version, mode}` is the smallest defensible set. Some readers will argue `compiler.options.*` is also clearly compile-time (the compiler knows its own options) — but §28's TBD format makes it fuzzy. Some will argue `compiler.boundary` (compile-time vs server vs client) is clear — but inside `^{}` compile-time, the answer is always `"compile-time"`, which is tautological and useless.

**Risk: it doesn't end the contradiction.**

Option C still leaves §22.4's prose at line 10465-10466 partially false: "the full compiler-internal type registry and AST via the `compiler.*` API" is still aspirational because Option C exposes neither. The SPEC text needs the same amendment as Option A.

**Estimated effort:** Medium-large. ~10-20 hours. Most effort is in spec drafting (carving the surface), test design (per-member behaviors), and a deferred-debate against future "but `compiler.options` is also clearly compile-time" pressure.

---

## 5. Recommendation

**Recommendation: Option B — remove `compiler.*` from §22.4 classification.**

### Rationale

**1. Radical-doubt + simplicity-defender alignment.** The user's writing repeatedly frames scrml as a "first-principles, full-stack language" that earns trust by removing phantoms, not by adding fallback behaviors that paper over them. The S43 capability-frontier deep-dive named this finding "the single biggest UNKNOWN in the entire matrix" and explicitly listed deletion as option (a). The S48 audit named it the worst-of-both-worlds state. Both prior investigations point at the same direction: stop asserting a contract the compiler doesn't honor.

**2. The cost-benefit is one-sided.** Option B touches ~15 lines across source, ~5 lines across spec, deletes 2 tests, adds 2-3 new tests. Option A's minimum honest surface is ~50 lines of code, ~30 lines of spec amendment, debate framing for which keys, plus 6-12 new tests. Option C is the worst of both.

**3. There is nothing to lose by removing.** Zero samples, zero examples, zero tutorial coverage, zero compilation-tests use `compiler.*` in user code. The 2 tests that exist are pure classification fixtures. No published article advertises `compiler.*`. No user complaint thread exists about its absence. The phantom is internal-only.

**4. There is everything to gain by re-asserting later.** Removing `compiler.*` from §22.4 today does not foreclose its future. A future scrml session that wants `compiler.types.register(...)` (downstream of §53.13.1) or `compiler.ast.read(...)` (downstream of an Approach C debate) can re-introduce the classification trigger as part of a designed surface — at which point the API has spec, semantics, tests, and worked examples. The S43 deep-dive's own recommendation was "this warrants its own deep-dive" — Option B clears the room for that deep-dive without committing to a half-built surface in the meantime.

**5. Phasing inversion (S43 OQ-3) is unresolved.** The biggest dimensional pressure on `compiler.*` is for AST mutation / custom syntax (Dimensions 4, 14, 16 in the S43 deep-dive). The phasing inversion is decisive: `^{}` runs after the AST is built, so AST-mutation `compiler.ast.X` cannot exist without architectural changes (a pre-parse meta phase, OQ-3 option (b)). Option A or C invites users to assume the rest of the matrix will materialize. Option B is honest: that surface does not exist today and may not be the right shape when it eventually does.

**6. Future regret is asymmetric.** Picking Option B and later wishing we had Option A: introduce A in a future session, deleting E-META-010, with a designed surface. Picking Option A or C and later wishing we had Option B: deprecate the API, give users migration time, ship a removal across multiple sessions. **A is reversible at low cost; B is not. Pick B.**

**7. Aligns with how scrml has handled prior phantoms.** Per `docs/recon/` precedent and the audit's "fix the cracks" framing: `show=` (taught-but-not-handled), `migrate` CLI (referenced-but-doesn't-exist), nested `<program>` WASM/sidecar (specced-but-not-codegen'd) are all flagged for resolution toward "match implementation reality." The pattern is "either ship the thing or stop claiming to ship it." Option B applies that same pattern.

**8. Bias toward minimizing future regret.** From the user's voice on the language: "the worst possible state is one in which the spec asserts something the compiler doesn't honor" (paraphrased from the audit's framing). Option B removes the assertion. The cost of being wrong about Option B is small. The cost of being wrong about Option A is design-debt that compounds.

### What about the `compiler.warn` / `compiler.error` request from S43 dim 10?

This was named as one of the most-requested deep-dive capabilities. Option B does not foreclose it. A future spec amendment can introduce `compiler.warn(...)` as part of a designed diagnostic-emission surface — including the design choices that surface implies (custom error codes? severities? positions? cross-block accumulation?). Today, throwing inside `^{}` produces E-META-EVAL-001; users can encode their own intent in the throw message. That's not great, but it is honest.

### What about `compiler.options` for §28 settings access?

Per §28: "Settings are specified in a compiler configuration file (format TBD) or on the command line." The §28 settings surface itself is incomplete. Option B does not require completing §28 first. Future: when §28's config-file format is fixed, a future spec amendment can introduce `compiler.options.*` with the same care.

---

## 6. Estimated commit shape

### Single commit for Option B (recommended):

**Commit title:** `fix(s48): close compiler.* phantom — remove §22.4 classification + add E-META-010`

**Files touched (estimated 8-10):**

| File | Change | Lines (approx) |
|---|---|---|
| `compiler/src/meta-checker.ts` | Delete regex entry, helper, line 397 wire-up, doc comment, error-message text mention | -15, +5 (E-META-010 site) |
| `compiler/src/meta-eval.ts` | No code change; doc-comment cleanup if `compiler` mentioned | -2 |
| `compiler/self-host/meta-checker.scrml` | Mirror deletion | -2 |
| `compiler/SPEC.md` (§22.4) | Delete bullet + sentence | -3 |
| `compiler/SPEC.md` (§22.4 — new prose) | Add note: "`compiler.*` namespace reserved for future use; today fires E-META-010" | +5 |
| `compiler/SPEC.md` (§22.8 example) | Drop `compiler.*` from the §22.8 phase-separation rule example | -1 |
| `compiler/SPEC.md` (§22.11 table) | Add E-META-010 row | +1 |
| `compiler/SPEC.md` (§34 index) | Add E-META-010 entry | +1 |
| `compiler/SPEC-INDEX.md` | Regenerate via `bash scripts/update-spec-index.sh` | small line-shift only |
| `compiler/tests/unit/meta-checker.test.js` | Delete the §53 test, add E-META-010 test, update the §53-numbered tests downstream | net +0 |
| `compiler/tests/unit/self-host-meta-checker.test.js` | Same: delete the `compiler.` test, add E-META-010 test | net +0 |
| `compiler/tests/unit/meta-classifier-emit-raw.test.js` | Rename misleading test name (line 98) — body unchanged | 1 line rename |

**Net spec amendment text for SPEC.md §22.4 (replacement for the bullet at 10461 and prose at 10465-10466):**

```diff
- - `compiler.*` API calls
- - `bun.eval(...)` calls
+ - `bun.eval(...)` calls

  The compiler SHALL evaluate compile-time meta blocks during compilation and inline the result.
- Compile-time meta blocks have access to the full compiler-internal type registry and AST via
- the `compiler.*` API. Phase-separation rules (§22.8) apply to compile-time meta.
+ Compile-time meta blocks have access to the type registry via `reflect()` (see §22.4.2).
+ Phase-separation rules (§22.8) apply to compile-time meta.
+
+ The `compiler.*` namespace is reserved for future use. A `^{}` block containing any
+ `compiler.X` reference SHALL fire E-META-010 (see §22.11).
```

**Net spec amendment text for §22.11 (add row):**

```diff
+ | E-META-010 | `compiler.*` namespace reference; reserved for future use | Error |
```

**Worked example for the new diagnostic:**

```scrml
^{
  emit(`<p>Built with ${compiler.version}</p>`)  // ← E-META-010
}
```

**Compiler diagnostic:**

```
E-META-010: The `compiler.*` namespace is reserved for future use. The reference
`compiler.version` is not implemented in this revision. Remove the reference or
use a different compile-time mechanism (reflect, emit, bun.eval).
```

### Single commit vs multi-commit?

**Single commit is appropriate.** The change is small, atomic, and the spec/source/test changes must land together (otherwise tests fail or spec drifts). Multi-commit suggested only if the user wants the spec amendment as a separate commit — which is a reviewer-preference decision, not a technical one.

---

## 7. Open questions for user

1. **Confirm Option B is the right call.** This recon recommends removal, but the prior S43 deep-dive's recommendation was "this warrants its own deep-dive" before any of {a, b, c} is selected. Is the user comfortable picking option (a) of OQ-1 directly, or does this still warrant a downstream debate / second deep-dive first?

2. **Error-code numbering: E-META-010 or E-META-NEW?** E-META-009 is in source (`meta-checker.ts:1568` — nested `^{}` inside compile-time meta) but **not yet in §22.11 or §34** (verified by grep on `SPEC.md`). Should the spec amendment also add E-META-009 to those tables, OR pick E-META-010 to leave room for E-META-009 to be added separately later? [INFERRED: cleaner to add both in the same commit since they are sister bookkeeping fixes, but the S48 audit described this as a single decision about `compiler.*`, so a focused commit may prefer adding only E-META-010.]

3. **Self-hosted compiler regeneration.** `compiler/dist/self-host/meta-checker.js` is a built artifact (regenerated by `bun compiler/bin/scrml.js compile` against `compiler/self-host/meta-checker.scrml`). Should the regenerated artifact be included in the same commit, or in a follow-up "rebuild self-host" commit? [INFERRED: prior practice in this repo includes the rebuilt artifact in the same commit.]

4. **Should `compiler.boundary` (compile-time | server | client) be exposed even under Option B?** This recon recommends Option B for `compiler.*` as a whole. But `compiler.boundary` is interesting: inside `^{}` compile-time, the answer is the literal string "compile-time" — not useful. Inside `^{}` runtime, the question is "where is this block executing?" and the answer can be inferred from the runtime context. **This is a separate primitive from `compiler.*` API.** [INFERRED: handle as a separate deep-dive if the user wants client/server/compile-time observation; do not couple it to the `compiler.*` decision.]

5. **Articles and tutorial corrections.** The audit's "fix the cracks" queue has Item 4 (this issue) at rank 4. Should the audit's queue itself be updated post-decision? [INFERRED: yes, but that's a follow-up doc-task, not part of this commit.]

6. **How to communicate the change to early adopters?** No published article mentions `compiler.*`. No tutorial mentions it. The change is invisible to current scrml users. [INFERRED: no announcement needed; the audit's changelog entry suffices.]

7. **Should §22.11 also note that E-META-004 is missing from the numbering?** Per the existing table (lines 11048-11054), E-META-001/002/003/005/006/007/008 — E-META-004 is **absent**. [INFERRED: separate housekeeping; not coupled to this decision.]

---

## 8. Provenance

- **Spec:** `compiler/SPEC.md` lines 10408-11058 (§22), 10461 (the bullet), 10465-10466 (the prose), 10978 (the §22.8 example), 11044-11054 (§22.11 error code table), 12042-12241 (§34 error index).
- **Compiler source:**
  - `compiler/src/meta-checker.ts` (1968 lines). Key sites: 12, 165-170 (regex array), 367-388 (helper), 397 (wire-up), 1554 (error message), 1568-1574 (E-META-009 site).
  - `compiler/src/meta-eval.ts` (647 lines). Key sites: 24-25 (E-META-EVAL doc), 443-444 (the new Function call), 446-451 (the catch site).
  - `compiler/src/codegen/rewrite.ts:449` (rewriteBunEval, separate compile-time API).
  - `compiler/self-host/meta-checker.scrml:11, 120` (self-hosted mirror).
- **Tests:**
  - `compiler/tests/unit/meta-checker.test.js:881-884`
  - `compiler/tests/unit/self-host-meta-checker.test.js:201-204`
  - `compiler/tests/unit/meta-classifier-emit-raw.test.js:98-112` (misleadingly-named, body uses `reflect()`)
- **Samples / examples:** none reference `compiler.*` as user code; verified by grep across `samples/`, `examples/`, `docs/tutorial-snippets/`.
- **Prior audits / dives:**
  - `scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md` (S48 audit, finding row "compiler.* API surface" classified phantom; rank-4 in fix-the-cracks queue)
  - `scrml-support/docs/deep-dives/meta-system-capability-frontier-2026-04-26.md` (S43 deep-dive Dimensions 4 + 16; OQ-1 the headline UNKNOWN)
  - `scrml-support/docs/deep-dives/jai-comptime-vs-scrml-meta-2026-04-02.md` (referenced by S43; Approach C territory for any expansion)

## 9. Tags

#recon #s48 #compiler-dot-api #phantom #language-status #spec-vs-implementation #meta-system #§22.4 #e-meta-010 #fix-the-cracks #decision-driving #remove-the-stub #scrmlTS
