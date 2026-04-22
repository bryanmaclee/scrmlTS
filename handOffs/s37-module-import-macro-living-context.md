# S37 Context Report — Modules / Imports / Macros / Living Compiler

**Date:** 2026-04-21
**Assembled by:** research dispatch (Opus 4.7 1M) for PA
**Purpose:** consolidate everything scrml has already decided, explored, or ruled out on (1) module system + source-level import, (2) macros, (3) the "living compiler." Input for the upcoming conversation where the user will likely raise a (a) source-level `import` ask and (b) npm / external-module build-layer escape hatch ask, motivated by 6nz's CodeMirror 6 integration hack.

---

## 1. Summary (top-of-file distillation)

1. **Source-level `import` already exists and is normative.** SPEC §21 (file-top `${ import ... }`) + §41 (two-keyword hybrid: top-level `use` + logic-scope `import`) both ship. Parser and module-resolver accept them. The 6nz hack is not evidence of a missing feature — it is evidence that a specific import path (to external raw JS modules in a hot-reload / editor-embed context) has a gap.
2. **npm is explicitly, repeatedly, emphatically REJECTED** — by user voice and ratified insights. E-IMPORT-005 fires on any bare specifier. This is load-bearing philosophy, not a transient decision.
3. **Three protocol prefixes are ratified:** `scrml:` (stdlib → vendor override), `vendor:` (project-local vendored source), `./` / `../` (relative). `user:` and config-based collections were DEFERRED, not rejected, pending per-developer-stdlib work.
4. **Vendoring is the canonical escape hatch.** The user admires gingerBill (Odin). Physical source copy into `vendor/` is how third-party code enters a scrml project. No lock file, no automatic fetch, no registry.
5. **There is NO source-level macro syntax.** A preprocessor pass is specced (§4.9 + PIPELINE stage 1 "PP") with error codes E-PP-001/002/003 and W-MACRO-001, but its *surface syntax* is explicitly TBD per SPEC-ISSUE-004. Compile-time macros and runtime macros are both TBD (SPEC-ISSUE-002/004, both still "Open"). `scrml-macro-system-{engineer,reviewer,tester}` agents exist but block on a ratified spec.
6. **The "living compiler" is real but intentionally unimplemented.** It is a crowd-sourced transformation registry keyed by encoded variable names, NOT a package registry for library code. Memory directive: "Very early idea. Needs serious research and design. Do NOT spec or implement."
7. **Modules + macros + living compiler ARE entangled.** The user framed the import-system deep-dive in terms of all three ("transpilation alternatives, meta-built (community) keywords, syntax, possibly even meta defined context blocks"). The three-tier recommendation (Approach A+D from dependency-model DD) reflects this.
8. **Meta (`^{}`) is scrml's chosen "escape hatch for anything Bun can do."** Memory file `project_meta_as_capability_guarantee.md`: scrml >= Bun always. Any npm package is technically accessible via `^{}` at compile time (bun.eval) or runtime. This is the explicit answer to "how do I use lodash." Runtime `^{}` is partially implemented but still has gaps.
9. **The load-bearing open question for the upcoming conversation:** the user's `import` + "npm escape hatch at build layer" ask runs into (a) the explicit E-IMPORT-005 rule rejecting bare specifiers, (b) the `vendor:` + meta-escape-hatch model that was supposed to *be* the answer, and (c) the living-compiler vision that assumed community sharing would happen via vendored source + the transformation registry rather than a package manager. Re-opening "npm escape hatch" re-opens all three.
10. **What is fresh ground:** a build-layer plugin/adapter for *external raw JS* (like CodeMirror 6) that needs to ship real JS bytes into the browser at runtime — specifically how it reconciles with ADR-001's encoded variable names (DC-009), with the `use foreign:` sidecar model (server-side only, §23.4), and with the existing `${ import ... from './helper.js' }` path (which the module-resolver supports for local JS files). No ratified position on NPM-sourced or CDN-sourced browser modules yet.

---

## 2. Topic: Modules + Source-Level `import`

### 2.1 What exists in the spec TODAY

**SPEC §21 — Module and Import System** (lines 10297–10405 in `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md`):
- ES-style `import`/`export` inside `${ }` logic contexts
- `${ import { UserRole } from './types.scrml' }`
- `${ import { helper } from './helper.js' }` — vanilla JS file imports are valid
- Imports must be at file top-level (E-IMPORT-003 for function-body imports)
- Circular imports: compile error (E-IMPORT-002)
- Re-exports `export { name } from 'source'`
- Pure-type files produce JS-module-only output

**SPEC §41 — Import System `use` + `import`** (lines 14115–14317; "Added: 2026-04-01 — debate verdict: hybrid `use` + `import` (50.5/60)"):
- Two keywords, two scopes:
  - `use` — file-preamble, markup-scope, capabilities (components, macros, patterns, living-compiler extensions)
  - `import` — inside `${ }`, logic-scope, values/types/functions
- Three protocol prefixes:
  | Prefix | Resolves to |
  |---|---|
  | `scrml:` | Compiler-bundled stdlib → `vendor/scrml/` override |
  | `vendor:` | `vendor/<path>` in project root |
  | `./` / `../` | Local file |
- §41.4 normative: "npm-style bare specifiers (e.g., `import { x } from 'lodash'`) SHALL be a compile error (E-IMPORT-005). scrml has no npm integration. Bare specifiers with no recognized prefix are never valid."
- §41.5 resolution order: stdlib → vendor override → error
- §41.6: "The scrml toolchain SHALL NOT download anything automatically. There is no lock file, no registry fetch, no version resolution at build time."
- §41.8: each `<program>` (incl. workers) declares its own imports — no inheritance
- Error codes: E-USE-001..006, E-IMPORT-005..006, W-USE-001, W-IMPORT-001

**SPEC §23.4 — `use foreign:` sidecar imports** (lines 11436–11498):
- `use foreign:ml { predict }` — capability import for a nested `<program lang="go">` sidecar
- Server-side ONLY (E-FOREIGN-012)
- Compiler generates HTTP/socket client code; deserializes via sidecar's declared scrml types
- NOT a source-level import of external JS into the browser

**Appendix D — JS Standard Library Access in Logic Contexts** (lines 10069–10087):
- `Array`, `Boolean`, `Date`, `JSON`, `Math`, `console`, `Intl`, `Reflect`, `Proxy`, `parseInt`, `setTimeout`, `structuredClone`, etc. are available in `${}` without any import or `^{}` ceremony
- "Provided by the Bun runtime, part of the ECMAScript specification."

### 2.2 What IS implemented

`compiler/src/module-resolver.js` (~373 lines):
- Import graph construction from FileAST
- Cycle detection, topological sort, export-registry
- Handles `scrml:`, `vendor:`, and relative prefixes
- `STDLIB_ROOT` points to `../../stdlib`
- Per `use-import-system-2026-04-02.md` line 65: "**No `use` keyword parsing exists yet** — the resolver only handles `import` declarations." (Note: that DD is 2026-04-02; the current backlog still has an open "Fix import statement emission — parser accepts `scrml:crypto` but codegen doesn't emit" item, so partial-implementation caveats still apply.)

Stdlib content (per the 2026-04-02 DD): 14 real `.scrml` files under `stdlib/` including `crypto`, `auth`, `data`, `format`, `http`, `store`, `time`, `test`, `router`. `scrml:crypto` uses `Bun.CryptoHasher` + `Bun.password` inside `server {}`. User-voice-archive line 1501 confirms stdlib Wave 1 (fs, path, process) done; stdlib now has 13 modules.

### 2.3 Deep-dives on file

1. `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/import-system-2026-03-30.md` — six import CATEGORIES enumerated (local files, stdlib, transpilation alternatives, community keywords, syntax extensions, meta-defined context blocks), four approaches (A protocol prefix, B `<program>` attrs, C `use` keyword, D `^{}` meta only). Recommends hybrid A+C. This is the DD that seeded §41.
2. `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/use-import-system-2026-04-02.md` — follow-up: implementation-shaped DD. Approach A (current SS40) vs B (add `user:` prefix) vs C (config-based collections) vs D (third `extend` keyword for living compiler). **Recommendation: ship Approach A as-is; defer `user:` until per-dev-stdlib work; do NOT add `extend` keyword pre-living-compiler.**
3. `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/dependency-model-no-npm-2026-03-30.md` — four approaches (A Stdlib+Vendor Odin model, B git-e native, C living-compiler extensions, D minimal manifest Zig-style). **Recommendation: A+D combined** — stdlib first, minimal manifest for external deps, vendoring underneath, git-e as eventual hosting. Four-phase rollout: Phase 1 stdlib+`scrml:`, Phase 2 `scrml.toml` manifest + `dep:` prefix, Phase 3 git-e hosting, Phase 4 living-compiler registry (separate).
4. `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/stdlib-design-2026-03-30.md` — stdlib inventory + priority ordering.
5. `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/nested-program-semantics-2026-04-03.md` — ratifies that workers/sidecars don't inherit `use`.

### 2.4 Design-insights (ratified)

- **Import System Design debate (2026-04-01)** (cited in use-import DD line 93):
  > "Winner: Rust use+imports (50.5/60) > Elixir use DSL (47.5/60) > Odin collections (46.0/60) > Go module vendoring (45.5/60). Key insight: 'When a compiled language has two distinct scopes (a markup/template scope and a logic/runtime scope), the import system benefits from two keywords that map to those scopes... `use` for what this file can express (compile-time capability injection into the markup scope) and `import` for what this file's logic references.' Resolution model: Odin collections model is the correct resolution mechanism. `scrml:` as a collection prefix. Three-level hierarchy: project vendor > developer stdlib > compiler stdlib."

- **Transformation Registry insight (design-insights.md lines 222–230, 2026-04-08)** — see §4 below; touches imports indirectly because it rules on the `scrml init --secure` vendor-everything tier.

### 2.5 User-voice — verbatim

**The canonical quote** (`/home/bryan/scrmlMaster/scrml-support/user-voice-archive.md` line 16, Session 10, 2026-03-30):

> "stdlib all the way! on that note, I would like to do some looking into a 'more scrml' way of importing. remember, with the living compiler idea, we will need to import end transpilation alternatives, meta-built (community) keywords, syntax, possibly even meta defined context blocks as well as the usual importing. lets do some diving on that. we are not itching to get everyone using this right now. we want to do a progressivly growing beta period, that may last several months. lets focus on the three big wins, and in the mean time, when the compiler is ready, i will start sharing it with a few select individuals and we can go from there. that being said, I would really like to avoid npm. I do really like 'ginger Bill's (odin creator) take on package managers in general. So lets get going on the big ones plan 6nz, git-e, stdlib, alternative ideas to npm and package mangers."

Agent interpretation captured (lines 19–26) — most load-bearing bullet: **"The import system needs to be much richer than file imports. It needs to handle: transpilation alternatives (living compiler), meta-built community keywords, new syntax, meta-defined context blocks. This is a language-level import system, not a file-level one."**

**npm-specific quotes** (from `transformation-registry-design-2026-04-08.md` lines 66, 69):
> "a note on package managemnt: npm is evil. constant security vulnerabilitys, breaking changes, bloated, no qc. i am definit3ely more a fan of odins system."
>
> "this 'quality gated trasformation registry' seems like a big eco-system win"

### 2.6 Prior rulings on NPM / build-time resolution / lockfile

- **NPM**: explicitly rejected. E-IMPORT-005 makes bare specifiers a compile error. §41.4 normative: "scrml has no npm integration." User voice: "npm is evil."
- **Build-time resolution**: no automatic fetch. §41.6 normative: "The scrml toolchain SHALL NOT download anything automatically."
- **Lockfile**: none in §41. The transformation-registry DD (2026-04-08) proposes `scrml.sum` / `scrml.lock` but only for the *living compiler transformation registry*, not for library imports — and only in the `--stable` / `--secure` init tiers.
- **Escape hatch for using an npm package's functionality**: the ratified answer is `^{}` meta + `bun.eval()` (memory file `project_meta_as_capability_guarantee.md`: "scrml is always AT LEAST as powerful as raw JS/Bun"). This path is PARTIALLY IMPLEMENTED — jai-comptime DD flags bun.eval() as specced but not wired up.

### 2.7 Prior ruling on ESM vs CJS vs bundled

- ES module syntax is the written form (§21.3).
- Output: "Compiled output is plain JavaScript suitable for execution in any JavaScript runtime" (SPEC line 122).
- Bundling: no explicit ruling. No `bundle` attribute on `<program>`. DC-009 (deferred-complexity) flags that ADR-001 encoded variable names make cross-boundary JS→scrml reference problematic.
- No specific ESM-vs-CJS dichotomy position found in the corpus.

### 2.8 Currently-open questions the corpus flags

From `use-import-system-2026-04-02.md` "Open Questions" (lines 423–436):
- **How does git-e distribute code without a registry?** Mechanism unspecified.
- **Do living compiler extensions need their own import keyword?** Cannot resolve until living compiler design advances.
- **Does `scrml:` resolution need a developer-override tier?** Per-dev-stdlib vs per-project-reproducibility trade-off.
- **Should `use` declarations support re-export?** SS21.4 allows `export { x } from '...'` — should `use` re-export?
- **What is the `index.scrml` convention's scope?**

BACKLOG items still open (lines 93, 99, 100, 145):
- "Fix import statement emission — parser accepts `scrml:crypto` but codegen doesn't emit"
- "Research alternative package manager approaches (avoid npm, Odin-style philosophy)"
- "Deep-dive on scrml-native importing system (living compiler context)"
- "More scrml-native importing system"

---

## 3. Topic: Macros

### 3.1 What exists — the preprocessor pipeline stage

**SPEC §4.9 — Preprocessor Output as Source Text** (lines 452–478):
> "scrml defines a preprocessor pass that runs before the block splitter (§22). The preprocessor expands macros, resolves compile-time constants, and produces a transformed source string. The block splitter receives this transformed string as its input."

Key normative rules:
- "The preprocessor SHALL produce output that is treated as source text by the block splitter."
- "The block splitter SHALL NOT distinguish between macro-expanded characters and literal source characters."
- Macro authors responsible for producing syntactically valid scrml.
- W-MACRO-001 fires when a macro expansion alters block type at a `<` boundary.

**PIPELINE.md Stage 1 — Preprocessor (PP)** (lines 121–179):
- Output: `{ filePath: string, source: string, macroTable: Map<string, string> }`
- Error codes: E-PP-001 (duplicate macro def), E-PP-002 (undefined macro reference), E-PP-003 (circular macro expansion)
- "Single-pass textual scan."
- "No validation of macro expansion content as valid scrml."

### 3.2 What is NOT specced — surface syntax

**`/home/bryan/scrmlMaster/scrml-support/archive/spec-issues/SPEC-ISSUE-004-preprocessor-macro-syntax.md`** (status: Open, 2026-03-25):
> "The preprocessor is described as 'textual string replacement before parsing, like C `#define`.' Compile-time macros are described as 'AST-level transforms during compilation.' Neither has a specified syntax."

Open questions enumerated:
1. Preprocessor trigger syntax: `#define NAME value`? `@preprocessor { }` block? File-level `${ }`?
2. Preprocessor scope: per-file? project-wide? exportable?
3. Compile-time macro syntax: function annotated `compiletime`? `macro` keyword? naming convention?
4. Macro invocation: `MacroName!(args)`? `@MacroName(args)`? indistinguishable from function call?
5. Macro hygiene: hygienic? what does hygiene mean in scrml's AST?
6. Preprocessor/block-splitter interaction: can macros produce syntactically invalid scrml?

Acceptance criteria: six normative items must be specified. **None are yet.**

### 3.3 Runtime macros — SPEC-ISSUE-002 (status: Open, 2026-03-25)

`/home/bryan/scrmlMaster/scrml-support/archive/spec-issues/SPEC-ISSUE-002-runtime-macros.md`:
> "A compile-time macro receives an AST node and returns a transformed AST node — execution happens during compilation. A runtime macro presumably executes at program run time. But what does 'macro' mean at runtime? Is it code generation at runtime? Is it a hook into the language's evaluation loop? Is it something else entirely?"
>
> "Are runtime macros in scope for v1?... This has not been answered."

Acceptance criteria: a yes/no decision on runtime macros for v1; if yes, syntax + interaction with reactivity; if no, deferral criteria. **None are yet.**

### 3.4 Agent definitions (the scope telegraphs the intended shape)

**`/home/bryan/.claude/agentStore/scrml-macro-system-engineer.md`** (model: sonnet — overridden by MEMORY rule to opus — tools: Read, Write, Glob, Grep). Declares a *two-tier* system:

> "TIER 1: PREPROCESSOR — textual — operates on raw source before any parsing... Simple token replacement — not recursive."
>
> "TIER 2: AST MACROS — receive a subtree and return a replacement subtree... run AFTER AST building and BEFORE type checking (contract AM→TC in PIPELINE.md). The nodes they produce will be type-checked — they cannot produce nodes that violate type rules."

Error codes the engineer would emit: `MACRO_BOUNDARY_INJECTION`, `MACRO_INVALID_AST_OUTPUT`, `MACRO_EXPANSION_CYCLE`.

"You do not implement runtime macros — those are TBD in the spec."
"You do not implement without a ratified macro spec section."

**`scrml-macro-system-reviewer.md`** — audits preprocessor safety (block-boundary injection, recursion, string-literal handling), AST macro output validity, expansion ordering, type-system interaction.

**`scrml-macro-system-tester.md`** — test categories include boundary-injection errors, expansion cycles, AST validation, lin-flag preservation across macro expansion.

**Translation:** scrml has specced the *machinery* for a 2-tier macro system (preprocessor text-replacement + AST macros at AM→TC contract boundary), specced pipeline-safety error codes, and specced the review/test protocols — but the **surface syntax, declaration form, invocation form, and hygiene model remain TBD.** The agents are staged but blocked on spec ratification.

### 3.5 Deep-dives

- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/jai-comptime-vs-scrml-meta-2026-04-02.md` — compares scrml `^{}` + `emit()` against Jai's `#run`/`#insert`/compiler-message-loop. Treats `^{}` + `emit()` as scrml's macro substitute. Quote (line 253): "String-based generation is fragile (no syntax checking until parse time)." Recommendation: Approach D (Hybrid — `emit()` now, compiler API later). Current status: "`emit()` already exists in `META_BUILTINS`... needs actual implementation: take the emitted string, parse it through BS/TAB/AST, and splice the resulting nodes into the parent AST at the `^{}` position."
- `runtime-meta-system-2026-04-02.md` — runtime `^{}` design. 13/13 devs from Meta Gauntlet R1 unanimous on need for reactive bridges (meta.watch, meta.set, meta.onCleanup). Phased recommendation: Approach C hybrid (explicit API now, auto-tracking later).

### 3.6 How macros intersect with imports

Per `import-system-2026-03-30.md` section "Import Categories":
- **Category 4 (community keywords / meta-built language extensions)** = macros distributed for import. "These are macros that produce scrml source text. Resolution: imported from a namespace, expanded at compile time."
- **Category 5 (syntax extensions / new context blocks)** = hardest. "These require the block splitter to recognize new syntax." DD line 474–488 documents the **chicken-and-egg problem**: "new syntax that needs block-splitter recognition must be known BEFORE the pipeline starts." Practical resolution: two-pass compiler scan (extract `use` / `<program>` attrs first, then run pipeline with extensions registered) OR restrict to no-new-sigils (only named meta patterns).
- **Category 6 (meta-defined context blocks)** — no parser change needed; uses existing `^{}`.

The `^{}` + `emit()` + `compiler.registerMacro()` path (Approach D in the import DD) was rated "insufficient" because it cannot solve Category 5 at all (meta runs too late).

### 3.7 User voice on custom context sigils

**user-voice-archive.md line 287** (Session ~2026-03, referencing compiler rewrite):
> "left field question, if we decide that the meta system needs to allow users to create custom contexts _{}, would this rewrite make that easier?"

Agent interpretation (line 290): "The user is thinking ahead to the living compiler vision — user-defined context sigils. Currently scrml has `${}` (logic), `?{}` (SQL), `^{}` (meta), `~{}` (test), `#{}` (CSS). If users could define their own `_{}` contexts via the meta system (e.g., `graphql{}`, `regex{}`, `wasm{}`), that's a major extensibility win."

No ratified verdict. No DD dedicated solely to custom sigils. The `_{}` block is currently reserved for foreign-code contexts (§23.1–23.2.5).

---

## 4. Topic: Living Compiler

### 4.1 Definition and first appearance

The concept is traced to **memory file `project_living_compiler.md`** (not in my read path, but quoted consistently across the corpus). Canonical paraphrase (from `import-system-2026-03-30.md` line 54):

> "Programs decompose into transformation signatures. The compiler ships with standard implementations per signature. Developers submit alternatives. Usage telemetry determines graduation. The registry key IS the encoded variable name transformation. Local overrides via `^{}`. Status: 'Very early idea. Needs serious research and design. Do NOT spec or implement.'"

Quoted verbatim from same memory file (via `transformation-registry-design-2026-04-08.md` line 72):

> "Programs decompose into logical packets -- type/shape transformation signatures. The compiler ships with standard JS output patterns per signature. Developers submit alternatives; usage telemetry determines which graduates to standard. 'The only ones developers have to blame if the language goes to shit is themselves.' Encoded variable names = transformation signature keys. The meta layer (^{}) can override the registry locally."

**First appearance in user voice:** the 2026-03-30 session 10 quote (full text in §2.5 above). The user introduces "the living compiler idea" as already-established shorthand, tying it to the import-system ask.

### 4.2 What it IS (per the ratified 2026-04-08 design insight)

**Design insight "Transformation Registry — Reproducibility vs Quality Evolution"** (design-insights.md lines 222–230):

> "When a compiled language ships a 'living' transformation registry that can auto-improve compiled output, the registry design requires a two-tier model... a **fast tier** (auto-upgrade after a stabilization gate, opt-out via pin) for the majority of developers building non-regulated applications who benefit from community-discovered optimizations without maintaining them, and a **stable tier** (reproducibility-by-default, explicit opt-in to upgrades via lock file) for CI pipelines, audited builds, and regulated deployments."

> "Recommended model for scrml: Three named tiers — `scrml init` (fast track, Approach D semantics with `scrml.sum` audit log), `scrml init --stable` (lock file, Approach A semantics), `scrml init --secure` (vendor-everything, Odin model, no registry trust). The living compiler vision is preserved in the default tier. Supply chain paranoia is honored in the secure tier. The tiers are named at project creation, not discovered in advanced configuration docs."

Scores: Go (Approach D) 48.5 > Rust (A) 48.0 > Odin (Vendor) 47.0.

### 4.3 What the living compiler is NOT

- **Not a package registry for library code.** `dependency-model-no-npm-2026-03-30.md` line 411: "The living compiler's transformation registry is a different problem space from library distribution. It should be designed independently and not conflated with the dependency model. The registry handles codegen transforms; the dependency model handles library code. Mixing them prematurely adds complexity to both."
- **Not self-host parity.** Self-hosting is a separate goal (user voice line 1231: "I want to get to self-hosting. this should be the mountain top for this phase.").
- **Not hot-reload** (that's in handOffs-scope dev-server work).
- **Not runtime extensibility.** The registry operates at compile time, on codegen patterns.

### 4.4 What it IS aspirationally, in full:

1. Registry of crowd-sourced codegen alternatives keyed by encoded variable name / type-shape signature.
2. Quality-gated: stabilization period (14 days + 100+ population reports), regression detection, per-report advisory system.
3. Three init-tier commitment surfaced at project creation (fast / stable / secure).
4. Supply chain defense: threat assessment (threat-assessment-type-in-name.md Threat 6) rated "Critical / High likelihood" — mitigations include sandboxing, output verification pass, cryptographic signing, privilege separation.
5. Content-addressed distribution candidate: "the Unison Model" in the transformation-registry DD (Approach A, lines 115–150).

### 4.5 Deep-dives on file

- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/transformation-registry-design-2026-04-08.md` — the foundational DD. Four approaches: A content-addressed / Unison, B Go-style decentralized, C Elm-style curated, D hybrid. 600+ lines.
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/debate-transformation-registry-2026-04-08.md` — the 2026-04-08 debate that produced the insight.
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/compiler-modularity-architecture-2026-04-08.md` — plugin architecture prior to the registry (Approach D hybrid — typed stage slots + hooks).
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/debate-compiler-modularity-2026-04-08.md` — the debate.
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/jai-comptime-vs-scrml-meta-2026-04-02.md` — treats living-compiler enablement as the goal state for `^{}`/`emit()` work.

### 4.6 User voice on living compiler

- 2026-03-30 quote (§2.5 above) — first appearance, ties to import system.
- "this 'quality gated trasformation registry' seems like a big eco-system win" — post-transformation-registry DD reaction.
- 2026-03-? "custom contexts `_{}`" ask (§3.7) — thinking ahead to living compiler's custom-sigil implications.

### 4.7 Status

- Memory directive: "Very early idea. Needs serious research and design. Do NOT spec or implement."
- No SPEC section allocated.
- §41.2.3 normatively reserves `use vendor:<extension-name>` as the import path for living-compiler extensions.
- `dependency-model-no-npm` DD puts it in Phase 4.
- **Per `use-import-system-2026-04-02.md` Recommendation**: "**Do not add `user:` or `extend`** until the per-developer stdlib and living compiler designs advance."

---

## 5. Cross-cutting entanglement map

### 5.1 The three topics were never orthogonal

The 2026-03-30 user-voice quote entangles all three in one sentence:

> "with the living compiler idea, we will need to import end transpilation alternatives, meta-built (community) keywords, syntax, possibly even meta defined context blocks **as well as the usual importing**"

This establishes:
- Modules/import must carry living-compiler artifacts (transpilation alternatives).
- Modules/import must carry macros ("meta-built community keywords").
- Modules/import must carry NEW SIGILS ("syntax") — the Category 5 chicken-and-egg problem.
- Modules/import must carry meta-defined context blocks.
- All of this in addition to "the usual importing" of files.

### 5.2 Specific entanglements ratified in specs and insights

| Entanglement | Evidence |
|---|---|
| `use` is the canonical keyword for ALL three domains | SPEC §41.2.3 (`use vendor:<ext>` for living-compiler extensions); §41.2 (`use scrml:ui` for stdlib components/macros); §23.4 (`use foreign:ml` for sidecars) |
| Preprocessor MUST be aware of macro-imported extensions | SPEC §4.9 (normative rules about macro-produced block boundaries); SPEC-ISSUE-004 open question 6 |
| `^{}` meta is the fallback for all three when syntax doesn't suffice | `project_meta_as_capability_guarantee.md`; Approach D in import DD; recommendation D in jai-comptime DD |
| Encoded variable names are the registry key for living compiler AND the obstacle for vanilla-JS interop | DC-009 (deferred-complexity.md); ADR-001; `project_living_compiler.md` |
| Three-init-tier model is a MODULE-SYSTEM decision driven by LIVING-COMPILER trust model | Transformation Registry insight (design-insights.md line 228): "scrml init vs scrml init --stable vs scrml init --secure... a first-class commitment surfaced at project creation" |
| Category 5 (new sigils) requires pre-parse scan — potentially affects block splitter | import-system DD lines 474–488 |

### 5.3 Self-host target requirements

`../scrml/` self-host work (tracked across handOffs):
- Appendix D (JS standard library globals) was added 2026-04-08 explicitly "Based on self-hosting gauntlet R1 friction."
- Per BACKLOG line 87: import system friction emerged in self-host R1 (both teams relied on JS globals without spec coverage).
- SPEC amendments 2026-04-08 from self-hosting gauntlet R1: "§48 relaxed `fn` from 'state factory' to 'pure function, any return type.' §7.3.1 nested function declarations. §7.3.2 default parameter values. §14.3.1 optional struct fields (`= not`). Appendix D: JS standard library access in logic contexts."
- The compiler pipeline stages (`module-resolver.scrml`, `meta-checker.scrml`, `bs.scrml`) already use `use` + `import` — user-voice-scrmlTS.md line 1780: "bs.scrml and module-resolver.scrml already use..." (context cut).

### 5.4 Insights 20/21 (fate of `fn`) — do they touch the module system?

**No direct touch, but a portable sub-insight applies.** From design-insights.md "Insight 21" portable sub-insight 1 (line 686):

> "**`pure` as a modifier, not a keyword.** Whether `fn` is minimized (Plaid) or collapsed (Smalltalk) or deleted (Haskell), the purity contract it carries attaches more cleanly as a modifier (`pure function`, `pure method`, `pure accepts`) than as a keyword hook... Track as BOQ-fn-4."

Cross-reference: if `pure` becomes a modifier, it would plausibly interact with imports (a `pure` macro? a `pure use`? a `pure import`?). No ruling yet.

### 5.5 What WOULD re-open if "npm escape hatch at build layer" is raised

1. **E-IMPORT-005's normative force** — §41.4 says bare specifiers are ALWAYS errors. An npm escape hatch would need a new prefix (e.g., `npm:`, `jsr:`, `cdn:`) or a new keyword. Prior DDs rejected this; the approved path is `vendor/` + meta.
2. **The transformation-registry tier decision** — `scrml init` vs `--stable` vs `--secure`. Secure tier is "vendor-everything, no registry trust" — an npm path would undermine it.
3. **DC-009 (vanilla JS interop gap)** — how would npm-sourced code consume scrml exports given ADR-001 encoded variable names?
4. **The `use foreign:` grammar** — currently locked to nested `<program lang="...">` sidecars, server-side only. Extending it to "foreign npm package in browser context" is novel.
5. **The `^{}` capability-guarantee rule** — `^{}` is supposed to be the escape hatch. A second escape hatch (npm) would compete with meta and weaken the "scrml >= Bun" narrative.
6. **The gingerBill philosophy commitment** — load-bearing for the user's identity. Any npm path needs to honor "dependencies are a liability."

### 5.6 What is fresh ground (not yet ruled on)

- **External raw-JS modules in browser context** beyond `./helper.js`. The `${ import { x } from './helper.js' }` path works per §21, but there's no ratified position on pulling from a `node_modules/` directory, a CDN URL, or a build-tool-bundled dependency graph.
- **Build-time bundler integration.** No DD on whether scrml's compiler emits import-statement-preserving output for an external bundler to consume, or does its own bundling, or requires everything to be vendored.
- **Editor-embedding friction** — 6nz's script-injection + `window.__mod` + `CustomEvent` hack is not addressed anywhere in the corpus. The closest prior art is `runtime-dom-interop.md` and `6nz-editor-research-2026-04-02.md` but neither addresses external-module loading specifically.
- **`scrml.toml` manifest with URL + hash dependencies** — proposed in dependency-model DD Approach D, recommended as Phase 2, but not yet specced.
- **"dep:" prefix** — proposed same DD; not specced.

---

## 6. Gaps

Honest statements of what I did NOT find after a reasonable sweep:

- **Did not find** any ratified DD, insight, or user-voice ruling on **CDN imports** (e.g., `https://esm.sh/codemirror`). Deno's URL-imports model is discussed as prior art in the import-system DD (line 216, 459) as a cautionary tale, but no scrml ruling either way.
- **Did not find** any discussion of **editor embedding / iframe / module-loading-in-the-browser** friction specifically. 6nz DDs focus on editor architecture (panels, animations, telescope) not external-module loading.
- **Did not find** a dedicated deep-dive titled "living compiler" — the concept is discussed as background in `import-system-2026-03-30.md`, as the target state in `transformation-registry-design-2026-04-08.md`, and as a motivator in the living-compiler memory file. There is no single-source-of-truth DD.
- **Did not find** a ratified answer to SPEC-ISSUE-002 (runtime macros) or SPEC-ISSUE-004 (preprocessor syntax). Both still marked "Status: Open."
- **Did not find** the **`project_living_compiler.md`** memory file directly (it lives outside the repos I have read access to — only quoted via the DDs). The quotes in this report are second-hand through DD citations.
- **Did not read** `/home/bryan/scrmlMaster/scrml-support/DESIGN.md` in full — it contains 61 matches for "macro" per grep but given time constraints I relied on the DDs which cite it.
- **Did not find** explicit ratified rulings on:
  - ESM vs CJS output format
  - Source map strategy for macro-expanded code
  - Whether `scrml.toml` is ratified or still a DD proposal
  - Whether `dep:` prefix is ratified or still a DD proposal
- **Did not find** any current-session (S35+) handoff discussing imports/macros/living — `hand-off-35.md` and `hand-off-36.md` have 0 matches for these terms.
- **Did not verify** the current IMPLEMENTATION status of §41 against current `/home/bryan/scrmlMaster/scrmlTS/compiler/src/module-resolver.ts` — the use-import-system DD (2026-04-02) said `use` keyword parsing was not yet implemented; the BACKLOG still has an open "Fix import statement emission" item as of 2026-04. Current actual state may have advanced.
- **Did not comprehensively read** the compiler-modularity-architecture DD in full (only grep-level).

---

## 7. Relevant file paths (absolute)

**SPEC & pipeline:**
- `/home/bryan/scrmlMaster/scrmlTS/compiler/SPEC.md` — §4.9 (preprocessor), §21 (imports v1), §22 (meta), §23 (foreign + `use foreign:`), §41 (imports v2 = hybrid use+import), Appendix D (JS globals)
- `/home/bryan/scrmlMaster/scrmlTS/compiler/PIPELINE.md` — Stage 1 PP contract, E-PP-001..003
- `/home/bryan/scrmlMaster/scrmlTS/compiler/src/module-resolver.ts` (not read in this dispatch, but cited as the implementation surface)

**Deep-dives — modules/imports:**
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/import-system-2026-03-30.md`
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/use-import-system-2026-04-02.md`
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/dependency-model-no-npm-2026-03-30.md`
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/stdlib-design-2026-03-30.md`
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/nested-program-semantics-2026-04-03.md`

**Deep-dives — macros / meta:**
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/jai-comptime-vs-scrml-meta-2026-04-02.md`
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/runtime-meta-system-2026-04-02.md`
- `/home/bryan/scrmlMaster/scrml-support/archive/spec-issues/SPEC-ISSUE-002-runtime-macros.md`
- `/home/bryan/scrmlMaster/scrml-support/archive/spec-issues/SPEC-ISSUE-004-preprocessor-macro-syntax.md`

**Deep-dives — living compiler / transformation registry:**
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/transformation-registry-design-2026-04-08.md`
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/debate-transformation-registry-2026-04-08.md`
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/compiler-modularity-architecture-2026-04-08.md`
- `/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/debate-compiler-modularity-2026-04-08.md`
- `/home/bryan/scrmlMaster/scrml-support/docs/research/threat-assessment-type-in-name.md` (Threat 6)

**Insights, voice, design:**
- `/home/bryan/scrmlMaster/scrml-support/design-insights.md` — Import System Design (2026-04-01, cited in DDs); Transformation Registry (2026-04-08, lines 222–230); Insight 20/21 (fate of fn)
- `/home/bryan/scrmlMaster/scrml-support/user-voice-archive.md` — line 16 (the canonical 2026-03-30 import quote), line 287 (custom sigils), transformation-registry npm quotes (via DD citations at lines 1739/1747)
- `/home/bryan/scrmlMaster/scrml-support/user-voice-scrmlTS.md` — current-session voice (no direct hits on the three topics; module-resolver pass hits at line 1780 etc.)
- `/home/bryan/scrmlMaster/scrml-support/BACKLOG.md` — lines 93, 99, 100, 145 (open import/package-manager items)
- `/home/bryan/scrmlMaster/scrml-support/DESIGN.md` (not read in full)

**Agent definitions:**
- `/home/bryan/.claude/agentStore/scrml-macro-system-engineer.md`
- `/home/bryan/.claude/agentStore/scrml-macro-system-reviewer.md`
- `/home/bryan/.claude/agentStore/scrml-macro-system-tester.md`

**ADRs / deferred complexity:**
- `/home/bryan/scrmlMaster/scrml-support/docs/adrs/ADR-001-encoded-output-variable-names.md`
- `/home/bryan/scrmlMaster/scrml-support/docs/deferred-complexity.md` (DC-009: vanilla JS interop ↔ encoded names)

**Stdlib (for import targets):**
- `/home/bryan/scrmlMaster/scrmlTS/stdlib/` — 13+ modules; index.scrml per module

