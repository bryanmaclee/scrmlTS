# DISPATCH BRIEF — Bug 61: `@compound.<synthProp>` rollup read emits member-access not `_scrml_derived_get(dotted)`

**Change-id:** `bug-61-compound-rollup-read-path-2026-05-28`
**Severity:** HIGH (silent-wrong; `@form.isValid` returns `undefined` → submit buttons gated on it stay disabled even when valid). General — all §55 compounds.
**Dispatched:** S140 (post-midnight 2026-05-29; session S140 opened 2026-05-28). Baseline HEAD at dispatch: see commit committed just before this dispatch (includes Bugs 57/58/59 landed + Bug 61 filed in known-gaps).
**Agent:** scrml-js-codegen-engineer · isolation: worktree
**Authority:** `docs/known-gaps.md` Bug 61 (PA-verified) · `docs/audits/bug-51-class-corpus-coverage-audit-2026-05-28.md` §3.2 · surfaced by Bug 58 (RESOLVED `29c33a6c`). **This is the READ-PATH sibling of Bug 58 — Bug 58 emits the surface; Bug 61 makes the compound-level rollup READABLE.**

---

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

This project (scrmlTS) has a documented history of sub-agent path leaks into the MAIN checkout (S99: 4 in one session) and `cd`/Edit-tool divergence (S126). Do not become the next incident.

1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under ANY other repo, STOP and report (S90). Save as `WORKTREE_ROOT`.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. **`git -C "$WORKTREE_ROOT" merge --no-edit main` — LOAD-BEARING for this bug.** Your worktree may be branched from a stale session-start commit (S112). Bug 61's fix is on the SAME §55 surface Bug 58 (RESOLVED `29c33a6c`) just touched (`emit-bindings.ts`, `emit-form-for.ts`, `type-system.ts`). You MUST merge `main` so you build on top of Bug 58's landed state — otherwise your view of those files is stale and your fix will be wrong. After merge, confirm `grep -c '_flatBindKey' compiler/src/codegen/emit-bindings.ts` ≥ 1 (Bug 58 marker present). If absent, STOP — the merge didn't bring Bug 58.
4. `git -C "$WORKTREE_ROOT" status --short` — confirm clean.
5. `cd "$WORKTREE_ROOT"` ONCE. **NEVER `cd` into the main repo** (any path NOT containing `.claude/worktrees/agent-`) for ANY command (S126 #14/#15). Use `--cwd "$WORKTREE_ROOT"`, `git -C "$WORKTREE_ROOT"`, worktree-absolute paths only.
6. `bun install`.
7. `bun run pretest`.

**Editing discipline (S126):** prefer Bash edits (`perl`/`python`/heredoc) on WORKTREE-ABSOLUTE paths including the `.claude/worktrees/agent-<id>/` segment. If you use Edit/Write, the path MUST contain `.claude/worktrees/agent-`. Echo target path before each write; re-verify via `git -C "$WORKTREE_ROOT" diff`/`grep`.

If ANY startup check fails: DO NOT proceed. Report and exit.

---

## MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` (worktree) first. §"Task-Shape Routing" → maps for a compiler-source codegen read-path fix. Watermark `1fed5588` (only docs-only past it). Verify against source via grep. Report maps feedback.

## READING LIST

- SPEC §55.5 (compound rollup validity surface) + §55.6 (per-field) + §55.7 (synthesized-property read semantics, read-only) — IN FULL (pa.md Rule 4).
- PRIMER §8 (validators + auto-synth validity surface).
- `docs/known-gaps.md` Bug 61 + Bug 58 entries.
- The per-field read path that ALREADY WORKS is your template — find how `@form.field.errors` (3-segment) lowers to `_scrml_derived_get("form.field.errors")` and mirror it for the 2-segment compound-rollup case.

---

## THE BUG (PA-verified, on Bug-58-landed baseline `29c33a6c`)

A compound-level §55 synth-property read — `@form.isValid` / `@form.errors` / `@form.touched` / `@form.submitted` (2-segment: `@<compound>.<synthProp>`) — emits `_scrml_reactive_get("form").isValid` (member access on the compound VALUE object, which holds the field values `{name, email}` and has NO `isValid` property → `undefined`) instead of `_scrml_derived_get("form.isValid")` (the dotted derived cell, which IS declared — verified `_scrml_derived_declare("form.isValid")` present).

Adopter impact: `@form.isValid` → `undefined`; `disabled=!@form.isValid` → `!undefined` → `true` → submit button stuck disabled even when valid. `node --check` clean; silent-wrong.

**PA-verified on BOTH:**
- formFor emit (canonical `<formFor>`): disabled-gate reads `_scrml_reactive_get("signup").isValid`.
- hand-authored §55 compound (`<form><name req length(>=2)>=<input/>...</> <button disabled=!@form.isValid>`): reads `_scrml_reactive_get("form").isValid` while `_scrml_derived_declare("form.isValid")` IS present (count 1).

**Per-field reads work:** `@form.field.errors` (3-segment) correctly emits `_scrml_derived_get(...)`. Only the 2-segment compound-rollup read is misrouted. The fix is to make the 2-segment compound-rollup `@`-read resolve like the working 3-segment per-field read.

**Reproduce yourself first** (minimal hand-authored compound):
```scrml
<program>
<form>
    <name req length(>=2)> = <input type="text"/>
    <email req> = <input type="email"/>
</>
<button disabled=!@form.isValid>Submit</button>
${@form.name/}${@form.email/}
</program>
```
Compile; grep client.js: expect `_scrml_reactive_get("form").isValid` (the bug) + `_scrml_derived_declare("form.isValid")` (declared but unread-via-correct-path).

---

## THE FIX (bounded — read-path resolution)

The `@compound.<prop>` read-path resolver must recognize a 2-segment access whose leaf is a registered COMPOUND-LEVEL synth property (`isValid`/`errors`/`touched`/`submitted`) on a compound parent, and emit `_scrml_derived_get("<compound>.<prop>")` — mirroring the per-field 3-segment path that already works. The synth-cell registry exists (B11/B12: `isSynthesizedCell`, `getSynthRecords`, `COMPOUND_SYNTH_PROPERTIES = [isValid, errors, touched, submitted]` in `symbol-table.ts`). Survey where `@`-member reads lower (likely `emit-expr.ts` / `emit-bindings.ts` / the `@`-access read-rewrite — find where `_scrml_reactive_get("X").prop` vs `_scrml_derived_get("X.prop")` is decided for member access on a compound); consult the synth registry there.

**Survey-first (depth-of-survey discount):** the per-field 3-segment path ALREADY resolves correctly — find that code and determine why the 2-segment compound-rollup case misses it (likely: the resolver descends to per-field synth via `lookupQualifiedStateCell` but the 2-segment compound-level synth lookup isn't wired, OR the member-access lowering short-circuits at depth 2 to `_scrml_reactive_get(base).member`). Fix at that decision point. Do NOT rebuild the synth registry. Keep the fix minimal + reuse `isSynthesizedCell`/`COMPOUND_SYNTH_PROPERTIES`.

**Scope discipline:** read-path only. Do NOT touch the write-path (`_flatBindKey`, Bug 58) or the surface-emission (Bug 58). Verify per-field 3-segment reads STILL emit `_scrml_derived_get` after your change (no regression). Verify a NON-synth 2-segment compound read (`@form.name` — a real field) still emits the correct field access (don't over-route real fields to derived-get).

---

## ACCEPTANCE GATE (both required — this is the point)

New test file (model happy-dom on an existing browser test; the Bug-58 `browser-form-for-validity-bug-58.test.js` documents the disabled-gate as NOT-asserted — your test FLIPS it to asserted):
1. **Targeted emit-regression** (FAIL pre-fix, PASS post-fix): compile a §55 compound with `disabled=!@form.isValid`; assert the read emits `_scrml_derived_get("form.isValid")` (NOT `_scrml_reactive_get("form").isValid`). Assert per-field `@form.field.errors` STILL emits `_scrml_derived_get` (no regression) AND a real-field read `@form.name` is unaffected. Prove it fails before your fix.
2. **happy-dom runtime drive:** mount a compound form; assert `@form.isValid` is reactive — false when invalid, true when valid; assert `disabled=!@form.isValid` ENABLES the submit button when the form becomes valid. (Extend/strengthen the Bug-58 formFor browser test's documented-but-unasserted disabled-gate to a real assertion.)

---

## R26 EMPIRICAL VERIFICATION (Phase 3 — mandatory; pa.md S138 doctrine)

HIGH codegen read-path fix. Before DONE: re-compile the canonical formFor source AND a hand-authored §55 compound AND any `<formFor`/compound adopter source in `samples/`/`examples/`. For each: `node --check`; grep confirming compound-rollup reads now emit `_scrml_derived_get(dotted)`; confirm per-field reads + real-field reads unchanged. **DO NOT mark DONE without empirical R26 verification passing** — specifically, the formFor submit button must be runtime-enableable (not stuck disabled).

---

## COMMIT DISCIPLINE (two-sided, S83)

- First commit message includes `pwd` verbatim: `WIP(bug-61): start at <pwd>`.
- Commit per edit; don't batch. `git -C "$WORKTREE_ROOT" status` clean before DONE.
- **NEVER `--no-verify`.** Env-race hook failure → STOP and report.
- Run the FULL pre-commit suite at each step (the `@`-read-path touches many sites — adjacent reactive-read/compound tests catch over-routing regressions; zero regressions required).
- Update `docs/changes/bug-61-compound-rollup-read-path-2026-05-28/progress.md` after each step (append-only).

## FINAL REPORT SHAPE

`WORKTREE_PATH` · `BRANCH` · `FINAL_SHA` · `FILES_TOUCHED` (worktree-absolute) · merge-main-confirmed (Bug 58 `_flatBindKey` present) · pre-fix-repro-confirmed (member-access) · post-fix-confirmed (`_scrml_derived_get` + button enables) · per-field + real-field reads unaffected · regression fails-before/passes-after · R26 results · full-suite counts · maps feedback · deferred items.
