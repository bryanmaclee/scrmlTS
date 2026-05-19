# schemaFor impl — DISPATCH BRIEF

**Session:** S104 (2026-05-18)
**Agent:** scrml-js-codegen-engineer, model: opus, isolation: worktree, background: yes
**HEAD at dispatch:** `5f4ada4`
**Maps watermark:** `84c736e` (S103 open; HEAD is 22 commits ahead — treat maps as starting hypothesis, verify against current source via grep/Read where they're load-bearing for your task)
**Baseline tests:** 12,807 pass / 88 skip / 1 todo / 0 fail / 668 files / 43,219 expect

---

## Mission

Implement `schemaFor(StructType)` — the THIRD active L22 type-as-argument family member (after parseVariant S65 + formFor S102-S103). schemaFor closes the §39 + L4 vocabulary-unification loop by emitting `<schema>` SQL DDL from a struct type definition.

**The narrative lead — frame this in the changelog, NOT as a side feature:** OQ-SCH-12 enum lowering is the FLAGSHIP value-add. schemaFor closes the enum-knowledge-loss-at-DB-boundary gap that hand-authored `<schema>` blocks leave open. Bare-variant enums on struct fields lower to `text req oneOf([variants...])` automatically; today, hand-authored `<schema>` columns routinely lose the variant-set constraint. 23-trucking-dispatch has 7 enum columns currently stored as bare `text not null` — `INSERT INTO loads VALUES (..., 'BogusStatus')` is unstoppable. schemaFor mechanically encodes the constraint.

Form B function-call form `${ schemaFor(Users) }` interpolated inside `<schema>` block is the canonical surface (per OQ-SCH-1 debate verdict 50/60 vs 39/60 vs 37/60). NOT markup-element form. NOT block-attribute form. SPEC §41.15.9 + §53.14.5 + the deep-dive verdict are LOAD-BEARING — do not re-litigate.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: **<HARNESS-ASSIGNED-WORKTREE-PATH>** (the harness fills this in at provisioning; capture from your first `pwd` call)

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If the path is under any other repo (e.g., `scrml-support/.claude/worktrees/`), STOP and report — that's the S90 CWD-routing failure mode. Save the output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Tree should be clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules` from main.
5. Run `bun run pretest` via Bash. Populates `samples/compilation-tests/dist/` (gitignored; fresh worktrees have it empty).

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Path discipline — S99 had FOUR path-discipline leaks. This would be incident #5 if it happens.

- For Read: paths under WORKTREE_ROOT are safe. Reading from main via absolute path will give you wrong content (main is at `5f4ada4`; your worktree base may differ).
- For Write/Edit: **ALWAYS use ABSOLUTE paths under WORKTREE_ROOT.** Never use `/home/bryan-maclee/scrmlMaster/scrmlTS/<path>` directly — that's main; translate to `$WORKTREE_ROOT/<path>` first.
- If you find yourself about to write to a path starting with the main repo root, STOP. Re-derive the path from WORKTREE_ROOT.
- **Echo-pwd-in-first-commit discipline aid (S99):** your first commit message MUST include the verbatim `pwd` output, e.g.: `WIP(schemaFor-survey): start at $(pwd)`. PA verifies on landing that the recorded pwd starts with the worktree prefix.

## Commit discipline — two-sided rule (S83 — agent side)

- After EVERY edit: `git diff <file>` to verify, `git add <file>`, commit IMMEDIATELY. Don't batch — commit per sub-bucket / per fix.
- Before reporting "DONE": `git status` MUST be clean (no uncommitted changes). If `git status` shows modified-but-uncommitted files, COMMIT them before reporting. "HEAD unchanged — work in worktree, no commits" is NOT an acceptable terminal report shape.
- WIP commits are expected and encouraged — they're the crash-recovery checkpoint. Final commit may squash/amend if desired, but never delay committing to wait for a "clean" state.

## Progress reporting

Update `docs/changes/schemaFor-impl/progress.md` after each meaningful step — timestamped append-only lines. Format: `[HH:MM] <what was just done> // next: <what's next>`. The progress file is the next-agent pickup if you crash.

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context (kickstarter / anti-patterns / SPEC sections / source files), read `.claude/maps/primary.map.md` in full. It is ~100 lines.

The §"Task-Shape Routing" section in that file tells you which additional maps to consult based on your task shape. For this dispatch the relevant task shapes are:
- **compiler-source bug fix / new feature** (this dispatch is "new feature" — schemaFor is greenfield in the compiler)
- **test authoring**

Map currency: maps reflect HEAD `84c736e` as of 2026-05-18. HEAD is now `5f4ada4` (22 commits ahead). If your work touches files modified in those 22 commits (Phase 3 select-row Candidate A + `!=` extension + SPEC §41.15 + Playwright bench), treat the map content as a starting hypothesis to verify via grep / Read against current source — not as ground truth.

In your final report, include either:
- "Maps consulted: [list]; load-bearing finding: <one sentence on what the map content told you>"
- "Maps consulted but not load-bearing — [optional: which map you expected to help but didn't]"

The second answer is fine and valuable.

---

# REQUIRED CONTEXT READS (in order)

**1. Kickstarter v2** (CANONICAL scrml shape — required for any agent writing scrml code):
- `docs/articles/llm-kickstarter-v2-2026-05-04.md` IN FULL

**2. Anti-patterns** (counteracts React/Vue/JSX reflex bias):
- `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` IN FULL

**3. SPEC §41.15 schemaFor — NORMATIVE** (this is what you're implementing):
- `compiler/SPEC.md` lines **18548-18701** IN FULL (~154 lines, 10 normative subsections §41.15.1-§41.15.10)

**4. SPEC §39.5.7-§39.5.8 — shared-core vocabulary + SQL DDL lowering** (the structural enabler):
- `compiler/SPEC.md` lines **17046-17139** IN FULL

**5. SPEC §53.14.5 — type-as-argument compile-time recognition pattern** (structural template):
- `compiler/SPEC.md` lines **26851-26861** IN FULL (or §53.14 entirety at 26802-26877)

**6. SPEC §34 — 8 E-SCHEMAFOR-* error codes** (NORMATIVE message text — emit verbatim):
- `compiler/SPEC.md` lines **14873-14880** IN FULL

**7. Deep-dive** (12 OQs closed; Form B verdict; pluralization edge cases — note SPEC §41.15.2 is authoritative on lowercase-no-snake_case):
- `../scrml-support/docs/deep-dives/schemaFor-design-2026-05-19.md` (1581 lines; verdicts section at line 1288+)

**8. SCOPE-AND-DECOMPOSITION** (this dispatch's authority — your contract):
- `docs/changes/schemaFor-impl/SCOPE-AND-DECOMPOSITION.md` IN FULL

**9. Precedent files** (read in survey phase per Step 1):
- `compiler/src/type-system.ts` lines 3920-4070 (parseVariant + formFor recognition) + line 9800+ (`walkAndValidateParseVariantCalls`) + line 9988+ (`walkAndExpandFormForNodes`)
- `compiler/src/codegen/emit-parse-variant.ts` IN FULL (219 lines — closer mirror; function-call form)
- `compiler/src/codegen/emit-form-for.ts` IN FULL (761 lines — sister file; the struct-walk + validator-clause-parse helpers are reusable patterns)
- `stdlib/data/form-for.scrml` IN FULL (~106 lines — stdlib re-export stub pattern)
- `stdlib/data/index.scrml` (the re-export aggregator)
- `compiler/tests/unit/form-for.test.js` for test-shape precedent
- `compiler/tests/integration/form-for*.test.js` for integration-test-shape precedent

---

# THE WORK — STEPS PER SCOPE §4

Follow the step decomposition in `docs/changes/schemaFor-impl/SCOPE-AND-DECOMPOSITION.md` §4 verbatim. Summary:

1. **Step 1 — Survey + dispatch baseline (~1h)**
2. **Step 2 — stdlib re-export stub (~30min)**
3. **Step 3 — Type-system recognition + validation walker (~3-5h)**
4. **Step 4 — Codegen expander `emit-schema-for.ts` (~2-3h)**
5. **Step 5 — Tests (~3-5h)**
6. **Step 6 — Sample + example (~1-2h)**
7. **Step 7 — Final pre-push baseline + close report (~30min)**

Total estimate: **~12-18h.**

## Architectural decisions made up-front (do NOT re-litigate)

Per SCOPE §3 — these are ratified:

- **§3.1 AST rewrite shape:** **survey-authorized — agent decides.** SCOPE's lean is source-level expansion at type-system stage (mirror formFor), but if implementation-time survey reveals the `<schema>` block pipeline orders differently (e.g., `<schema>` body parsed BEFORE type-system runs), the agent picks the right hook point. Report decision + rationale in survey commit.
- **§3.2:** Do NOT extract `validateTypeArgument` helper this dispatch. Inline matching formFor's pattern.
- **§3.3:** Do NOT extract `walkStructFields` helper this dispatch unless survey reveals formFor already extracted it (then reuse verbatim).
- **§3.4 Enum lowering:** bare-variant → `text req oneOf([<variant-name-string>, ...])` matching SPEC §41.15.6 worked example.
- **Pluralization rule:** SPEC §41.15.2 wins — "lowercase + trailing `s`" — `User → users`, `LoadAssignment → loadassignments` (NOT snake_case). The deep-dive's snake_case framing is superseded by SPEC text. SPEC wins per pa.md Rule 4.

## Sample location (PA decision)

NEW `examples/26-type-derived-schema.scrml` (Step 6). Do NOT modify `examples/17-schema-migrations.scrml` — that stays as the SQL-mirror reference.

## Pre-commit + pre-push gate

- Pre-commit subset (unit + integration + conformance) MUST pass on every commit. Baseline 12,807; final count should be ~12,807+30-50 (your new tests).
- Pre-push gate runs full `bun run test`; MUST pass before final report.
- **DO NOT use `--no-verify`** on commit or push without explicit user authorization. If a gate fails, investigate the actual cause, fix, re-stage, re-commit (new commit, NOT --amend).

## Survey-first authorization (per SCOPE §3.1)

If your Step 1 survey reveals SPEC §41.15.9's pipeline framing doesn't match the actual `<schema>` block pipeline, you are AUTHORIZED to correct the brief's hypothesis. Report the discovered pipeline shape + your hook-point choice in your survey commit, then proceed. Do NOT halt for PA re-ratification unless the SPEC itself appears wrong.

## Spec-derived claims discipline (pa.md Rule 4)

The SPEC §41.15 text is normative; the deep-dive and SCOPING are derived. If you find any deep-dive claim that contradicts SPEC §41.15 (the pluralization snake_case issue is one example), SPEC wins. Report the drift in your final report so PA can footnote-correct the deep-dive.

---

# FINAL REPORT SHAPE (in your closing message)

Required fields:
- WORKTREE_PATH: <absolute>
- BRANCH: <name>
- FINAL_SHA: <hash>
- FILES_TOUCHED: <list of absolute paths with line counts>
- Tests pre/post: pass/skip/todo/fail counts before + after
- Survey findings (Step 1): pipeline-ordering decision + rationale
- Per-error-code coverage: 8/8 fire + 8/8 no-fire tests confirmed
- Deferred items: anything not in this dispatch (`@table`, `@column`, FK derivation, payload-enum lowering, array-form, etc.)
- Maps consulted: [list] + one-sentence load-bearing finding (or "not load-bearing")
- Spec-derived-claim corrections needed (pa.md Rule 4): any deep-dive / SCOPING drift surfaced
- PATH-DISCIPLINE INCIDENT: report ONLY if a leak occurred + recovery taken

If you cannot complete the work (rate limit, fundamental architectural block, etc.), DO NOT pretend success. Commit what you have, update progress.md with the blocker, and report the truncation.

---

# WHAT NOT TO DO

- Do NOT use markup-element form for schemaFor. Form B function-call is normative. SPEC §41.15.9 + OQ-SCH-1 debate verdict.
- Do NOT introduce a `validateTypeArgument` helper this dispatch (per SCOPE §3.2).
- Do NOT extract `walkStructFields` to a shared module unless formFor already did so (per SCOPE §3.3).
- Do NOT use snake_case in pluralization rule. SPEC §41.15.2 is verbatim "lowercase + trailing `s`".
- Do NOT implement `@table` / `@column` annotations (v1.next).
- Do NOT implement FK derivation (v1.next per OQ-SCH-4 ratified out-of-scope).
- Do NOT implement variant-payload-enum lowering (v1.next).
- Do NOT implement `partial: true` option (NOT-APPLICABLE per §41.15.4).
- Do NOT modify `examples/17-schema-migrations.scrml`.
- Do NOT touch marketing content (README / scrml.dev / dev.to). Per pa.md Rule 1.
- Do NOT use `--no-verify` without explicit user authorization (must be surfaced).

---

# WHY THIS DISPATCH MATTERS

- L22 family third member. After parseVariant + formFor, schemaFor completes the type-as-argument trio that closes the L4 vocabulary-unification loop: `req` / `length` / `pattern` / `min` / `max` / `oneOf` / etc. authored ONCE in the struct type definition fire in three loci (state-validator, refinement-type, schema-column).
- Closes the enum-knowledge-loss-at-DB-boundary gap (the FLAGSHIP per OQ-SCH-12). Real data-integrity bug class — `loads.status: text not null` accepts any string today; with schemaFor, the type system's variant set is preserved at the DBMS layer.
- Frees the next L22 member (tableFor) to harvest schemaFor's struct-walk + per-field-lowering infrastructure.

Form B was won by argument quality, not PA-lean carry-forward (50/60 vs 39/60 vs 37/60 in the OQ-SCH-1 debate). The output-kind match principle (string→function-call; markup→markup-element) is the load-bearing argument and applies symmetrically to future family members.

---

# CROSS-REFERENCES

- SCOPE: `docs/changes/schemaFor-impl/SCOPE-AND-DECOMPOSITION.md`
- SPEC §41.15: `compiler/SPEC.md:18548-18701`
- SPEC §39.5.7-§39.5.8: `compiler/SPEC.md:17046-17139`
- SPEC §53.14: `compiler/SPEC.md:26802-26877`
- SPEC §34 (8 codes): `compiler/SPEC.md:14873-14880`
- Deep-dive: `../scrml-support/docs/deep-dives/schemaFor-design-2026-05-19.md`
- SCOPING (pre-flight gate-walk): `docs/changes/schemaFor-scoping/SCOPING.md`
- formFor SCOPING (precedent shape): `docs/changes/formFor-scoping/SCOPING.md`
- formFor impl progress (precedent): `docs/changes/formFor-impl/progress.md`
- pa.md (PA contract): `../scrml-support/pa-scrmlTS.md`
- Primer (mandatory scrml mindset): `docs/PA-SCRML-PRIMER.md`
- Kickstarter v2 (canonical scrml shape): `docs/articles/llm-kickstarter-v2-2026-05-04.md`
- Anti-patterns (counteracts framework reflex): `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
