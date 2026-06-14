# progress — sym-cell-registration-completeness-2026-06-13

Stage 1 of bug-12-vkill Part 3 (Option-3 staged, user-ratified S192).
Closes three "declared-but-not-in-SYM-stateCells" read classes (A/C/D) so
`lookupStateCell` resolves them. Standalone value; the read-side
`E-STATE-UNDECLARED` fire (stage 2) lands later, NOT here.

---

## 2026-06-13 — STARTUP

- Worktree base was `1b207e6e` (S191 wrap), one commit BEHIND briefed base
  `4494baa5` (S192 Part-2 landing). Fast-forward merge `main` → HEAD now
  `4494baa5`. Part-2 source (engine-varname.ts, symbol-table.ts, ast-builder.js,
  type-system.ts, emit-machines.ts) now present. (S112 staleness protocol.)
- `bun install` + `bun run pretest` clean.

## 2026-06-13 — PHASE 0 SURVEY (empirical, via runSYM + lookupStateCell probes)

Phase-0 probes ran BS → buildAST → runSYM on synthetic + REAL census files,
then walked all `@`-reads and checked `lookupStateCell(fileScope, name)`.
NOTE: api.js/compileScrml suppresses SYM info-diagnostics; census run via
`runSYM` directly per brief.

### CLASS A — legacy `const @x = expr` (MIGRATE + DEPRECATE)

**Skip mechanism (refined vs brief model):** It is NOT a blanket "const @x never
registers." The real determinant is the SYNTACTIC CONTEXT:

- `const @x` in a logic context (`${...}`) OR at module top-level → ast-builder.js
  ~5942-5953 parses it as `state-decl {shape:"derived", isConst:true,
  structuralForm:FALSE}`; PASS-1 walker registers it; `lookupStateCell` RESOLVES.
- `const @x` directly inside a `<program>`/markup ELEMENT BODY (no `${}`) → the
  `@`-after-`const` is NOT routed to the derived-decl parser in markup context;
  the line is swallowed as markup text → NEVER becomes a state-decl → NULL. This
  is the real census-failing shape (svelte-dashboard `const @doubleCount` sits
  bare inside `<program>...</program>`).
- The canonical `const <x>` (structural `<` opener) IS recognized in markup
  context (triggers `tryParseStructuralDecl`, ast-builder.js ~5961), registers
  into fileScope, and RESOLVES — both inside a markup body and elsewhere.

**Compile-diff (brief Phase-0 step 1):**
- svelte-dashboard: `const @x`→`const <x>` migration: UNRESOLVED `[doubleCount,
  countSquared]` → `[]`. FULLY behavior-improving, no new SYM errors. CLEAN.
- quiz-app: migration `currentQuestion,hasPrev,hasNext,scorePercent` → leaves
  `hasPrev,hasNext` STILL unresolved. ROOT CAUSE is an INDEPENDENT block-splitter
  mis-split: the multiline `<questions> = [ ... ]` array + bare `<` comparison
  operator in `const @hasNext = @currentIndex < @questions.length - 1` spuriously
  opens a `state` block, sweeping later derived lines out of decl position. This
  is a PRE-EXISTING BS bug orthogonal to the `const @x` form — it persists under
  BOTH `const @x` and `const <x>`. Migration still strictly IMPROVES quiz-app
  (4→2 unresolved). The residual `hasPrev`/`hasNext` is out-of-scope BS-mis-split
  (filed as a deferred item, NOT a Class-A regression).

**Discriminant for the lint:** `state-decl && shape==="derived" && isConst===true
&& structuralForm===false` UNIQUELY identifies the legacy `const @x` form (typed
+ untyped both confirmed); canonical `const <x>` has `structuralForm===true`.

**SPEC §6.6.1 (Rule-4 read):** lines 2804-2809 — "The `const <name> = expr` form
SHALL be the sole declaration syntax for derived reactive values" + "valid ...
at file top-level, inside a logic context `${ }`, and at the top of a state
block." Confirms `const <x>` is canonical; `const @x` is the legacy-tolerated
(ADR Option-A FOLD, S60) non-canonical form → MIGRATE + DEPRECATE (NOT register
the legacy form — REJECTED per ruling).

**Enumeration (code-form `const @x =` decl sites, 11 corpus files):**
samples/{quiz-app, recipe-book, expense-tracker, blog-cms, kanban-r11,
gauntlet-r11-elixir-chat, gauntlet-r11-zig-buildconfig}.scrml +
samples/compilation-tests/{gauntlet-r10-bun-admin, gauntlet-r10-vue-datatable,
gauntlet-r10-svelte-dashboard, gauntlet-r10-zig-buildconfig}.scrml. Plus one
ARCHIVE file handOffs/incoming/read/2026-05-23-0735-bug-r-if-unmount-no-op.scrml
(archive — out of migration scope). Zero in compiler/tests/stdlib.

### CLASS C — `ref=@name` element-ref (REGISTER — separate commit per ruling)

CONFIRMED genuine gap. `<canvas ref=@c>` → `lookupStateCell(c) = NULL`. The ref
attr value is `{kind:"variable-ref", name:"@c"}`; codegen emit-bindings.ts:331-335
emits `_scrml_reactive_set(encode(c), querySelector('[data-scrml-ref="c"]'))` —
so the ref name IS a reactive cell at runtime, but never registered in SYM
stateCells. `ref-binding` kind exists in codegen/type-encoding.ts:108/621.
Lowest-coupling fix: register a lightweight resolvable StateCellRecord (synth-
record precedent makeSynthRecord ~4303) keyed on the ref name; codegen UNCHANGED.
Census: modern-007-dnd (`todoColumn,cardEl,doneColumn`), phase2-animationframe-*
(`c`/`canvasEl`) all NULL today.

### CLASS D — state-block bare-write `@x=init` inside `< db>` (MIGRATE + DEPRECATE)

CONFIRMED NON-CANONICAL DECL ATTEMPT (not a write to an auto-declared cell). The
`tables="products,..."` attr does NOT auto-declare a `@products` cell. bun-admin
declares `@products=[]` etc. bare DIRECTLY in the `< db>` element body (markup
context, lines 22-31, NOT in `${}`) → NULL (not even a state-decl).

CANONICAL form per the corpus + SPEC §6.6.1 "at the top of a state block" +
08-chat.scrml's own load-bearing comment ("logic inside `<db>` body stays in
`${...}` — `<db>` is a state-block markup context, not a logic context"):
03-contact-book / 08-chat / 17-schema-migrations ALL wrap cell decls in a `${ }`
logic block inside the `<db>` body, using structural `<x> = init`.

**Migration target:** bare `@x=init` (markup-context db body) → wrap in `${ ... }`
+ structural `<x> = init`. VERIFIED: `< db>${ <products> = [] }` registers +
resolves. (A bare `<x>=init` directly in the db markup body — without `${}` —
also fails to register, so structural-form alone is insufficient; the `${}`
logic wrapper is required.)

Enumeration: bun-admin is the sole corpus file with bare `@x=init` directly in a
`< db>` body (the 10 decls lines 22-31). Other `@x=` writes in bun-admin are
inside handler `${}` blocks (legitimate reassignments).

### PHASE-0 VERDICT: PROCEED.

No finding hard-contradicts the brief's GOAL (registration completeness →
lookupStateCell resolves). The brief's per-class MECHANISM model was refined
(Class A is context-gated on markup-vs-logic, not a blanket skip; quiz-app has an
independent BS mis-split that migration cannot fully fix but strictly improves).
Migration targets and the REGISTER decision for C are all confirmed. Proceeding
to Phase 1 (refs).

## 2026-06-13 — PHASE 1 (COMMIT 1): Class C refs REGISTERED

- symbol-table.ts: NEW `walkRegisterRefBindings` PASS 1.d + `registerRefBinding`
  helper (modeled on `walkRegisterEngines`); `_cellKind` type += `"ref"`. Walks
  markup `attrs`/`attributes` for `ref=@name` (`variable-ref` value), registers
  a lightweight resolvable StateCellRecord at FILE scope (no fresh decl node,
  markup element is span anchor; synth-record precedent). Recurses children/
  body/bodyChildren/consequent/alternate/nodes/arms + the `lift-expr` markup
  tree (`expr.node`) so `lift <div ref=@x>` inside `${ for ... }` registers.
  dev-intent-wins / first-writer-wins: skip if fileScope already has the name.
  Wired right after PASS 1.c (engines) in runSYM.
- Codegen VERIFIED BYTE-IDENTICAL: compiled a ref-bearing file before/after the
  change — `*.client.js` + `scrml-runtime.*.js` diff clean (SYM-only change; emit-
  bindings.ts untouched).
- Test: compiler/tests/unit/ref-binding-sym-registration.test.js (6 cases — plain
  canvas/div, for-lift nested, dev-intent-wins, shared-ref-once, no-spurious).
  6 pass. Full unit suite 14440 pass / 0 fail.

## 2026-06-13 — PHASE 2 (COMMIT 2): Class A `const @x` MIGRATE + DEPRECATE

- type-system.ts (`case "state-decl"`): NEW info-lint `W-CONST-AT-DEPRECATED`
  (severity "info" → result.warnings, non-fatal), gated on
  `shape==="derived" && isConst===true && structuralForm===false` (the unique
  legacy `const @x` discriminant; canonical `const <x>` is structuralForm:true).
  Mirrors W-PURE-DEPRECATED / W-MATCH-ARROW-LEGACY. Reserved E-CONST-AT-DEPRECATED.
- migrate.js: NEW Migration 4 `const @name`→`const <name>` (line-leading regex,
  comment-safe, idempotent, preserves indentation + `: type`); wired into the
  `migrations` count object + summary print + help text + top doc.
- SPEC.md: §6.6.1 deprecation note (legacy `const @name` DEPRECATED, steers to
  `const <name>`, the SOLE form per §6.6.1); §34 +2 rows (W-CONST-AT-DEPRECATED
  Info, E-CONST-AT-DEPRECATED reserved Error).
- Corpus: migrated ALL 24 code-form `const @x` decls across 11 files
  (quiz-app/recipe-book/expense-tracker/blog-cms/kanban-r11/elixir-chat/
  zig-buildconfig ×2/bun-admin/vue-datatable/svelte-dashboard) →
  `const <x>`. Exactly 24 ins / 24 del; comments untouched. VERIFIED migrated
  corpus is W-CONST-AT-DEPRECATED LINT-CLEAN (0 fires — no warn window; coupled).
  Census improvement: svelte-dashboard `[doubleCount,countSquared]`→`[]` (fully
  resolved); quiz-app 4→2 (residual is the orthogonal pre-existing BS mis-split).
- Tests: const-at-deprecated-lint.test.js (9 — lint fire/typed/canonical/plain +
  Migration-4 basic/typed/comment-safe/idempotent/lint-clean). 9 pass.
- PARSER-CANARY COUPLING (surfaced + fixed in-commit): bun-admin was the corpus's
  SOLE LIVE-PHANTOM exemplar (parser-conformance-canary.test.js smoke). Its legacy
  `const @lowStockCount = ...filter(p => p.q < p.t)...` created the phantom state
  admission; canonicalizing to `const <lowStockCount>` REMOVED it (a genuine
  improvement — the legacy form WAS the pathology; scan confirms zero other corpus
  LIVE-PHANTOM/state files). Fixed the smoke to reconstruct the legacy shape
  in-test (decoupling the parser-divergence canary from corpus canonicalization)
  + added a companion test asserting the MIGRATED file no longer admits the
  phantom. 76 pass.
- Full unit+integration+conformance: 17009 pass / 0 fail. Canary 76 pass.

## 2026-06-13 — PHASE 3 (COMMIT 3): Class D state-block bare-write MIGRATE + DEPRECATE

PHASE-0-DEEPENING (load-bearing, surfaced a compiler-comment bug): the ast-builder
comment at the state-block lift path CLAIMED bare `@x = []` in a `<db>` body is
"canonical reactive-cell declaration in V5-strict state-block grammar." That is
WRONG per SPEC §4 (line 359 — state-block body is markup context), §38.4 (line
18564 — "bare names are LOCALS only"), §6 V5-strict, and the canonical corpus
(03-contact-book/08-chat use `${ <x> = init }`). Empirically the bare form is
SILENTLY DROPPED (becomes inert text — not registered, not emitted). The
E-WRITE-NOT-IN-LOGIC-CONTEXT row deliberately excluded state-blocks; the brief
ruled INFO-lint (not hard-error extension). Confirmed Class D is a non-canonical
DECL attempt (STOP-condition "genuinely a write / auto-declared" did NOT apply).

- ast-builder.js: NEW `scanStateBlockBareWriteDecls` (called from
  `liftBareDeclarations` state-block path) — scans state-block direct text
  children for line-leading `@x = init` and emits the INFO lint
  W-STATE-BLOCK-BARE-WRITE-DECL (W- prefix → result.warnings) steering to
  `${ <x> = init }`. Fixed the stale ast-builder comment. (TAB-stage text-scan
  because the bare decls are dropped before they become AST nodes.)
- SPEC.md: §34 +2 rows (W-STATE-BLOCK-BARE-WRITE-DECL Info §38.4/§6/§40.8;
  E-STATE-BLOCK-BARE-WRITE-DECL reserved Error) + E-WRITE-NOT-IN-LOGIC-CONTEXT
  cross-ref ("surfaces W-STATE-BLOCK-BARE-WRITE-DECL instead").
- Corpus: bun-admin (the brief-named sole Class-D file) — the 10 markup-body
  bare `@x = init` decls + `const <lowStockCount>` re-homed into the existing
  `${...}` logic block as structural `<x> = init`. VERIFIED: all 11 cells now
  RESOLVE (PRE: all NULL). dashboard.scrml `@items`/`@counter` NOT migrated
  (deferred): its `<db>` block is MALFORMED (root `<article>` not `<program>`,
  no `</db>` closer — a v0.2 file) so BS never forms a state block there + the
  lint can't fire; full v0.3 migration is out of scope. Corpus scan: bun-admin
  was the sole clean Class-D site; post-migration ZERO corpus files fire the lint.
- Test: state-block-bare-write-decl-lint.test.js (5 — fire-per-line/info-
  partition/message-steer/canonical-no-fire/handler-no-fire/resolution-gap).
- PARSER-CANARY (re-fixed): Phase-3 fully removed bun-admin's LIVE-PHANTOM (the
  Phase-2 in-test reconstruction no longer reproduces it — corpus has NO
  LIVE-PHANTOM exemplar left). FROZE the pre-migration legacy shape as
  compiler/tests/parser-conformance/live-phantom-fixture.scrml (NOT in the
  conformance corpus-enumerator dirs) + pointed the smoke at it. Companion test
  asserts the migrated live file no longer admits the phantom.
- WITHIN-NODE ALLOWLIST regen (11 migrated-file entries): the live-vs-native
  divergence baseline shifted (migrations changed parse shapes). bun-admin's
  entry jumped (residual ~1284) because the migration makes the previously-
  dropped decls PARSE — the OPT-IN native parser has gaps on the canonical
  `${ <x> = init }` shape vs live (a native-parser-swap concern, not a default-
  pipeline regression). Other entries shifted modestly. Allowlist is a snapshot
  baseline; regenerated to current truth.

## BUN-ADMIN RESIDUAL ERRORS (surfaced, NOT a migration bug — expected stage-2)

The Class-D migration's now-surfaced-friction delta is **31 -> 32** (+1 genuinely
new), NOT "1 -> 32" (FIX 6 correction, S192). The raw pre-migration count IS 1 in a
normal compile, but that "1" is a SHORT-CIRCUITED count: the sole pre-migration error
is `E-CTX-003: Unclosed 'db'` at line 17 — the unclosed `< db>` swallows the entire
rest of the file (markup + handlers) as opaque body text, so the compiler never
reaches the real friction surface. The TRUE baseline once `products.db` resolves and
the parse is not short-circuited is 31 latent friction errors; the migration surfaces
them and adds just +1 net new. ROOT of the 32: the 24 E-SCOPE-001 are
`@newName`/`@editName`/`@adjustProductId`/etc. handler-only cells (declared-by-
first-write INSIDE handlers, never structurally declared) read by `bind:value` in
markup — the V-kill STAGE-2 read-side concern, EXPLICITLY deferred by the brief.
Pre-migration these were MASKED (the dropped Class-D decls + unclosed-`<db>` swallow
made the file bail early at the single E-CTX-003); making the Class-D cells resolve
lets the compiler reach the markup and surface the real read-side gaps. The +6 E-CPS-NONIDEM +2
E-RI-002 are bun-admin's own server-fn friction. bun-admin is a malformed v0.2
gauntlet file (no <program>, no </db>) that needs a full v0.3 migration to
compile clean — out of THIS dispatch's scope. NOT gated by any test (security/
pretest scripts don't include it; markup-test references it in comments only).

---

## FIXUP DISPATCH (S192 — "fix the impl, dispatch the fixup") — 6 items

Started from arc FINAL_SHA facdf204 (reset --hard). 6 fixup items from the
adversarial verification pass (0 blockers, real CONCERNS user-ruled FIX).

### FIX 1 (impl) — W-STATE-BLOCK-BARE-WRITE-DECL fires on CANONICAL `<db>` [DONE]
ROOT (verifier-proven, empirically reconfirmed): `scanStateBlockBareWriteDecls`
ran only in the `block.type==="state"` branch of `liftBareDeclarations`. BS
classifies the canonical no-space opener `<db>`/`<state>`/`<schema>` as
`type=markup` (only the DEPRECATED whitespace `< db>` is `type=state`). So the
lint was SILENT on exactly the canonical `<db>` an adopter writes — the
silent-drop danger it exists to catch. `buildBlock` normalizes the
markup-classified state-block names back to `type=state` (via
`_STATE_FORM_LIFECYCLE`) but that runs AFTER the lift pass.
FIX: new module-level `_STATE_BLOCK_BARE_WRITE_NAMES = {db,state,schema}`; re-run
`scanStateBlockBareWriteDecls` in the markup branch when `block.name` is in that
set. (engine/machine EXCLUDED — they route to engine-decl, a different grammar.)
Empirical before/after: canonical no-space `<db>` bare-write W-STATE-BLOCK
fires 0 -> 2; whitespace `< db>` unchanged at 2. +5 tests (canonical-`<db>` FIRE,
canonical-`<state>` FIRE, canonical structural `${ <x> = init }` NO-fire,
`@x == []` comparison NO-fire, `${} server function` body NO-fire). Suite green.
Commit 59b1b13e.

### FIX 2 (impl) — W-CONST-AT-DEPRECATED fires on markup-body const @x [DONE — bounded mirror, NOT SURVEY-STOP]
ROOT (empirically confirmed): legacy `const @x` directly in a markup element body
(non-decl-site element like <div>, or a state-block body <db>/<state>/<schema>)
is NOT recognized as a declaration — stays inert `type=text`, no derived AST node,
silently DROPPED. The AST-node-gated check (type-system.ts, shape==="derived" &&
isConst===true && structuralForm===false) is structurally blind there.
FIX: new `scanMarkupBodyConstAtDecls` (ast-builder.js) — the BOUNDED MIRROR of
scanStateBlockBareWriteDecls (same text-node walk / per-line regex / span / per-
match fire; only regex prefix differs: `const @name =` vs bare `@name =`). Wired in
liftBareDeclarations' markup branch gated on `childContext === "markup"` (so it
NEVER double-fires on the <program>/<page>/<channel> decl-site roots where
`const @x` lifts + the AST-path lint fires). SURVEY-STOP assessment: clean bounded
mirror — done as impl. Empirical: `const @x` in <div> 0 -> 1 fire; <program> body
unchanged 1; ${} logic unchanged 1; over-fire guards (`const @x == @y`, mid-prose,
canonical `const <x>` -> E-CTX not W-CONST-AT) all hold. Migration 4 already rewrites
the markup-body form text-wise (coupled). +6 tests. Commit 8f9b88b4.

### FIX 3 (Rule 4 — SPEC accuracy) — correct the "registers everywhere" over-claim [DONE]
§6.6.1 + §34 W-CONST-AT row + type-system.ts AST-path message all claimed the
canonical `<>`-form "registers everywhere" / is recognized inside a markup element
body. FALSE: `const <x>` in a RAW MARKUP body parses `<x>` as an element open-tag
and loud-errors E-CTX-001 — does NOT register there. Corrected (read §6.6.1 + §34
in full per Rule 4): in raw markup NEITHER form is a valid derived-decl — legacy
`const @x` silently drops (now caught by FIX 2), canonical `const <x>` loud-errors
E-CTX-001; the canonical derived-decl form `const <name>` is for logic / top-level
/ `${...}` contexts. Also updated W-CONST-AT/W-STATE-BLOCK §34 'Fires' clauses for
the new fire sites. SPEC-INDEX regenerated (net +5 SPEC lines). After FIX 1+2 the
"SHALL emit at every site" claim is now TRUE for both lints (verified). Commit (FIX 3).

### FIX 4 (corpus) — wrap 2 bare markup-context const decls in ${} [DONE]
The arc's Class-A migration rewrote `const @x` -> `const <x>` in place; 2 sat bare
in markup context (blog-cms publishedCount in a <db> body; recipe-book
filteredRecipes top-level markup). Bare `const <x>` mis-parses <x> as an element
open-tag -> +1 E-CTX-003 each vs the pre-migration `const @x` (silent drop). Wrapped
each in `${ ... }`. Verified vs pre-migration (main) baseline: blog-cms 7->6
(E-CTX-003 3->2 = matches pre-migration 6); recipe-book 13->12 (E-CTX-003 12->11 =
matches pre-migration 12). +1 eliminated; both now W-CONST-AT-clean;
parser-conformance-canary green. Commit (FIX 4).

### FIX 5 (wording) — Info-lint mirror precedent [DONE]
W-CONST-AT §34 row + type-system.ts comment cited W-PURE-DEPRECATED (Warning) as the
Info-lint mirror; the real Info precedent is W-MATCH-ARROW-LEGACY. Reframed:
W-MATCH-ARROW-LEGACY is the Info-severity mirror; the deprecation-CYCLE shape
(warn-window -> reserved hard error) is shared by W-PURE-DEPRECATED /
W-MATCH-ARROW-LEGACY both. Commit 5befa28d.

### FIX 6 (baseline) — bun-admin 1 -> 32 corrected to 31 -> 32 [DONE]
Only locus: this progress.md (known-gaps bug-12-vkill uses the SEPARATE census
metric "24" = unresolved-cells, NOT error-count, correct as-is; changelog has no
reg-completeness 32-error ref). The raw pre-migration error count IS 1, but that "1"
is a SHORT-CIRCUITED count: the sole pre-migration error is `E-CTX-003: Unclosed 'db'`
@line17 — the unclosed `< db>` swallows the rest of the file as opaque text so the
compiler never reaches the real friction. True baseline (parse not short-circuited)
is 31 latent friction; migration adds +1 net new -> 31 -> 32. Don't overstate the
delta. (See the BUN-ADMIN RESIDUAL ERRORS section above for the corrected text.)
