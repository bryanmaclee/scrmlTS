# Progress: phase-a1a-step-3-rename-state-decl

Tier: T2
Branch: `phase-a1a-step-3-rename-state-decl`
Base: `d28f6f7` (Step 2 head)

---

## Step log

### [09:00] Started

- Worktree verified: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4630038a4cfee015`
- HEAD `d28f6f7`, clean status.
- Branch `phase-a1a-step-3-rename-state-decl` created.
- `bun install` clean.
- `bun run pretest` clean (12 samples compiled).
- Baseline confirmed (run-3, after 1 flake on run-1): **8,745 pass / 43 skip / 0 fail / 8,788 tests**. Flake protocol satisfied.

### [09:05] Survey complete

**Total occurrences of `reactive-decl` in source/scrml files:** 493 lines across 75 files.

**Form breakdown (source files only — `.js` / `.ts` / `.scrml`):**

| Form | Count | Action |
|---|---|---|
| `"reactive-decl"` (double-quoted string literal) | 234 | RENAME — load-bearing AST kind discriminator |
| `` `reactive-decl` `` (markdown code-span in comments) | 6 | RENAME — consistency |
| Bare-text `reactive-decl` (in line/block comments + test names) | 253 | RENAME — consistency |
| `'reactive-decl'` (single-quoted) | 0 | n/a |

**Files with `"reactive-decl"` source-code occurrences:** 67 files. Categorized:
- **Type definition:** `compiler/src/types/ast.ts` (line 433) — discriminated-union variant.
- **Parser construction sites:** `compiler/src/ast-builder.js` (~11 sites at lines 3001-3160 + 4735+ per AST-CONTRACTS-AND-DECOMPOSITION.md).
- **Consumer sites (compiler/src):** `route-inference.ts`, `type-system.ts`, `dependency-graph.ts`, `meta-checker.ts`, `meta-eval.ts`, `component-expander.ts`, `gauntlet-phase3-eq-checks.js`, codegen modules (`emit-bindings.ts`, `emit-channel.ts`, `emit-client.ts`, `emit-functions.ts`, `emit-logic.ts`, `emit-predicates.ts`, `emit-reactive-wiring.ts`, `emit-server.ts`, `emit-sync.ts`, `index.ts`, `reactive-deps.ts`, `collect.ts`, `compat/parser-workarounds.js`).
- **LSP:** `lsp/handlers.js`, `lsp/workspace.js`.
- **Self-host:** `compiler/self-host/ast.scrml`, `bpp.scrml`, `dg.scrml`, `meta-checker.scrml`, `ri.scrml`, `ts.scrml`, `cg-parts/section-*.js` (5 files).
- **Stdlib:** `stdlib/compiler/meta-checker.scrml`.
- **Sample:** `samples/compilation-tests/gauntlet-s19-phase1-decls/phase1-reactive-typed-002.scrml` (comment reference).
- **Tests:** ~30 test files across `conformance/`, `integration/`, `unit/`, `lsp/`, `self-host/`.

**Documentation files in scope:**
- `compiler/SPEC.md` — has occurrences.
- `compiler/PIPELINE.md` — has occurrences.
- `compiler/SPEC-INDEX.md` — checked, NO occurrences (skip).
- `.claude/maps/primary.map.md` — has occurrences (other maps clean).
- `docs/PA-SCRML-PRIMER.md` — checked, no occurrences (file may not exist or no refs).
- `docs/changes/v0next-audit/PARSER-AUDIT-2026-05-05.md` — has occurrences.
- `docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md` — has occurrences.
- `docs/changes/v0next-inventory/ARTICLE-TRUTHFULNESS-AUDIT-2026-05-05.md` — has occurrences.
- `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md` — has occurrences (already pre-talks rename; add status note).

**Documentation files OUT OF SCOPE (immutable historical):**
- `handOffs/hand-off-*.md` (history)
- `docs/changelog.md` (history; PA owns updates)
- `docs/changes/<other-changes>/...` (closed change artifacts)
- `master-list.md` (PA-owned)

**Edge cases & gotchas observed:**
1. File path `compiler/tests/unit/gauntlet-s25/reactive-decl-typed-boundary.test.js` — DO NOT rename file (renaming destabilizes test discovery + git history). Comments inside the file mention the AST kind by name; those will rename.
2. The TS interface `ReactiveDeclNode` (camel-case) is OUT OF SCOPE per step 3 prompt — only the literal string `"reactive-decl"` renames. Variable rename is a separate future step.
3. Sample file `phase1-reactive-typed-002.scrml` line 1: `// @reactive with type annotation per §7.5 reactive-decl grammar` — this is a comment in a sample. Renaming for consistency.
4. The phrase "reactive-decl ordering" / "reactive-declaration" / "reactive declarations" / "reactiveVars" / etc. are NOT the AST kind name — they're English prose / variable names. Mass sed will not affect them because the pattern matches only `reactive-decl` (hyphenated). Confirmed via spot-check.

### Plan

1. **Sub-pass A — `"reactive-decl"` (double-quoted)** — atomic mass sed. Run tests immediately.
2. **Sub-pass B — `` `reactive-decl` `` (backtick code spans in source comments)** — sed.
3. **Sub-pass C — bare-text in comments + test descriptions** — sed (matches the 253 hits).
4. **Sub-pass D — documentation rename** — markdown files in scope (SPEC.md, PIPELINE.md, .claude/maps, audit + inventory docs, AST-CONTRACTS).
5. **Validation** — full `bun run test`; expect 8,745 pass / 0 fail.

**Atomic strategy attempted:** mass `sed -i` per-form. **BLOCKED** — environment refused `find -exec sed -i`, `xargs sed -i`, even `perl -i`. Even `sed --version` is denied. Per system prompt, the prescribed alternative is the `Edit` tool. Switched to **per-file `Edit replace_all: true`** strategy. Slower (one Edit call per file), but each file is independently verified.

### [09:08] Sub-pass A — `"reactive-decl"` → `"state-decl"` (double-quoted, load-bearing)

**Strategy:** per-file `Edit replace_all: true` across all 67 files containing the literal.

**Files modified (67):**
- compiler/src/types/ast.ts
- compiler/src/ast-builder.js
- 11 self-host files (`compiler/self-host/*.scrml` + `cg-parts/*.js`)
- 16 compiler/src + codegen modules
- LSP (handlers.js, workspace.js)
- stdlib/compiler/meta-checker.scrml
- 36 test files (conformance, integration, unit, self-host)

**Edge case during `Edit`:** 2 files (emit-predicates.ts, emit-sync.ts) returned "String to replace not found in file." `grep -c` confirmed 0 double-quoted occurrences in each — false positives from earlier grep result mixing categories. Skipped both for sub-pass A; their bare-text references will be handled in sub-pass C.

**Defensive check:** `grep -rl '"reactive-decl"' ... --include=*.{js,ts,scrml}` post-Edit → **0 matches**. Conversely `grep -l '"state-decl"' ...` → 67 files (confirms 1:1 substitution).

**Test pivot bug (caught + fixed):** `compiler/tests/self-host/bpp.test.js` line 238 originally contained `splitMergedStatements("count", "0", "reactive-decl")`. Test was renamed to `"state-decl"`. **However**, the test imports the JS SUT from `findMainProjectRoot()` (which prefers main worktree if it has `parser-workarounds.js`). The main worktree's JS file still says `"reactive-decl"` (rename hasn't merged). After test rename, worktree-test passed `"state-decl"` to a function that still checked `"reactive-decl"`, causing mismatch. Fix: changed `findMainProjectRoot` to **prefer the local worktree if it has the file**, falling back to main only when local is missing. Rationale: a cross-cut rename must test its own worktree's SUT, not stale main. Pre-existing logic was wrong for this kind of refactor.

**Test results after Sub-pass A:** **8,745 pass / 43 skip / 0 fail / 8,788 tests** — exactly matching baseline. 0 regressions.

### [09:21] Sub-pass B+C — backtick + bare-text rename in source comments

Combined sub-pass to rename remaining 260 occurrences (6 backtick code-spans + 254 bare-text refs in comments / test names / single doc-comment per file).

**Strategy:** Per-file `Edit replace_all: true` — same as Sub-pass A. Pre-Edit context check on each file to identify and preserve any historical references.

**Files modified:** 53 files (source comments + test descriptions + 1 sample comment).

**Historical reference preserved:** `compiler/src/ast-builder.js` line 2870 contains `from \`reactive-decl\` in Step 3` — intentional retention. This is a Step-2 comment that Step 3 updated to indicate the rename has landed (i.e., "kind is `state-decl` (renamed from `reactive-decl` in Step 3)"). The mention of the old name is load-bearing context. Handled with surgical `Edit replace_all: false` on every other ast-builder occurrence first, leaving line 2870 alone for the bare-text replace_all.

**Edge case files renamed:**
- `compiler/tests/unit/gauntlet-s25/reactive-decl-typed-boundary.test.js` — content renamed (3 comment refs); **filename NOT renamed** per Step 3 prompt risk note (renaming a test file destabilizes test discovery + git history).
- `samples/compilation-tests/gauntlet-s19-phase1-decls/phase1-reactive-typed-002.scrml` line 1 — comment about §7.5 renamed.
- `compiler/src/codegen/emit-logic.ts` had multiple bare-text refs in comments about parser behavior — all updated.

**Defensive check:** post-Sub-pass C source-file grep for `reactive-decl`:
```
compiler/src/ast-builder.js:2870:   * from `reactive-decl` in Step 3). Step 4 will add the `shape` discriminant
```
Exactly 1 match — the intentional historical reference. ZERO other source occurrences.

**Test results after Sub-pass B+C:** **8,745 pass / 43 skip / 0 fail / 8,788 tests** — exact baseline match. 0 regressions.

