# TASK — g-inline-value-match-in-text-interp-empty + its class-wide twin: SUPPORT inline value-form control-flow in markup interpolation

**RULING (RATIFIED — user delegated to PA lean A).** Inline value-form control-flow as the SOLE content of a markup `${...}` interpolation IS a sanctioned scrml form, and the fix is a CODEGEN fix (no SPEC change). Authority: SPEC §18.0 (the JS-style `match expr {}` form "emits a VALUE … to compute a VALUE per variant have the arm return that value and interpolate it in markup" — `E-MATCH-ARM-MARKUP-IN-VALUE` row, SPEC.md:17564) + §17.6 (if-as-expression). A match/if expression is a value-producing expression; `${...}` interpolates value-producing expressions reactively (`${@count * 2}` already re-renders on dep change) — so `${ match @x {...} }` / `${ if cond {a} else {b} }` are just "value-form control-flow expressions in interp position" and MUST render their value + reactively update.

**The bug (CLASS-WIDE — both forms, confirmed reproducing on HEAD):**
- `${ match @x { .List :> "list view"  .Grid :> "grid view" } }` (newline-separated arms) as the sole content of a `<p>` → renders EMPTY, no diagnostic. client.js emits the match as a DEAD value-discarding IIFE (`(function(){ ...; if(...) return "grid view"; })()` as a bare statement, return value thrown away); NO `data-scrml-logic` render anchor.
- `${ if @n > 3 { "big" } else { "small" } }` → ALSO renders EMPTY. It DOES get a `<span data-scrml-logic>` slot (the classifier finds the branch bare-exprs) but client.js emits `if(...){ "big"; } else { "small"; }` — branch values discarded, slot stays empty.
- CONTROL (works — do NOT break): `const <label> = match @x {...}` then `${@label}` → derived path wraps it in `_scrml_derived_declare("label", () => (function(){...})())` + `_scrml_render_value` reactive wiring. THIS is the machinery to reuse for the inline path.

**Root cause (scoper-confirmed loci — verify in your worktree):**
- `compiler/src/codegen/emit-html.ts::stmtContainsRenderableLogic` [~132-143] recurses ONLY into `body`/`consequent`/`alternate` arrays looking for `bare-expr`/`lift-expr`. A `match-stmt`'s arms are `match-arm-inline`/`match-arm-block` nodes whose result is in `.result`/`.resultExpr` (NOT a `bare-expr` child) → classifier returns false → no render slot for `match`. The `if`-form gets a slot but its branch values are discarded at emit.
- `compiler/src/codegen/emit-html.ts::emitNode` logic-node branch [~2397-2531]: the bare-expr render gate (~2431, `body[0].kind === "bare-expr"`) + renderable gate (~2525, `if (!bodyHasRenderableContent) return;`) don't capture a value-form `match`/`if` body → no value, no slot, no wiring; emit-reactive-wiring then emits the body as a value-discarding file-scope effect.
- **Value-capture machinery to REUSE** (already correct for derived cells): `emit-logic.ts::emitMatchExprDecl` [~4095-4204] + `emit-control-flow.ts::emitMatchExpr` [~1839] (the value-returning IIFE-with-`return`); the analogous if-as-expression value form.

**The fix (codegen, class-wide):** when a markup `${...}` interpolation's SOLE content is a value-form control-flow construct (a `match` over a scrutinee returning per-arm values, OR an `if`/`else` returning per-branch values):
1. Capture its value via the existing value-returning expression form (`emitMatchExpr` / the if-expr equivalent — the IIFE-with-`return`, NOT the value-discarding statement emit).
2. Allocate a render slot (the `data-scrml-logic` anchor + `_scrml_render_value`-style wiring) exactly as the derived-cell path does.
3. Wire a reactive subscription to the scrutinee/condition's `@cell` deps so the slot re-renders when they change (mirror `_scrml_derived_declare` + the interp-reactivity path).
Both `match` AND `if` value-forms must be handled (the S215 class-wide escalation — do NOT fix match-only).

**ADVERSARIAL CARE (S215) — `stmtContainsRenderableLogic` + the logic-node interp branch are load-bearing for ALL `${...}` shapes. MUST NOT regress:**
- Declaration-only `${ <x> = 0 }` / `${ const <y> = @x*2 }` bodies (the phantom-span guard — these must NOT get a spurious render slot).
- Plain `${@cell}` / `${expr}` value interps (unchanged).
- `${ ...lift... }` Tier-0 iteration form (unchanged).
- A value-form `match`/`if` that is NOT the sole content (mixed with other statements) — keep current behavior unless clearly part of the bug; if ambiguous, FLAG don't guess.
- default-logic-mode `<program>`/`<page>` mount-effects (unchanged).
Construct adversarial repros for each and confirm no regression.

**Verification (before DONE):**
- Repros render: `${ match @x {...} }` → the selected arm's value; `${ if cond {a} else {b} }` → the selected branch's value (build a browser/happy-dom test).
- REACTIVITY: mutating the scrutinee/condition cell re-renders the slot (browser test — this is the load-bearing new behavior).
- The derived-cell twin (`const <label> = match...; ${@label}`) STILL works — no regression.
- `bun run test` FULL suite (NOT just the pre-commit subset — browser/lsp live only in the full suite, S198) — zero regressions.
- R26: compile a real adopter source using an inline value-form interp (or construct a representative one), `node --check` the emitted JS, confirm the slot renders.

**SCOPE GUARD — do NOT touch these (owned elsewhere / sequenced):**
- NO `SPEC.md` edit — the form is already sanctioned (§18.0/§17.6); this is codegen-only. If you believe a SPEC clarifying note is warranted, FLAG it in your report (PA lands it).
- NO `conformance/**` edit — a parallel agent owns it; the conformance case for the inline value-form is added later by the PA.
- NO `docs/known-gaps.md` edit — the PA owns the `@gap` tokens; REPORT the status change (`g-inline-value-match-in-text-interp-empty` → resolved, + note the `if`-form was folded in class-wide) in your final report.
- Your write surface = `compiler/src/codegen/**` + `compiler/tests/**` (unit + browser) + the BRIEF.md.

**FINAL REPORT (raw data):** WORKTREE_ROOT · FINAL_SHA · FILES_TOUCHED · before/after for BOTH the `match` and `if` repros · the reactivity test result · derived-cell-twin non-regression · full-suite pass/fail counts · R26 result · any flagged SPEC-clarification · the known-gaps status change to apply · Maps-consulted line.
