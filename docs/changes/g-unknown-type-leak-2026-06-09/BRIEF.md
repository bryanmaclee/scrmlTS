# DISPATCH BRIEF — g-unknown-type-leak (close the unrecognized-type-name silent-asIs leak)

change-id: `g-unknown-type-leak-2026-06-09`
repo: /home/bryan-maclee/scrmlMaster/scrmlTS (the working scrml compiler, TS/JS)
baseline HEAD at dispatch: efdec093 (S175 wrap)
agent: scrml-js-codegen-engineer · isolation: worktree

You are implementing a HIGH-value type-system diagnostic: reject unrecognized (truly-undefined) type names that today silently resolve to `asIs`. This is the COMMITTED S174 follow-on to the `any`-reject. The design below is the product of a 6-reader + adversarial-risk-audit investigation; it is precise. Survey-confirm it (Phase 0), then build it.

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). The §"Task-Shape Routing" section tells you which additional maps to consult; this is a **compiler-source bug fix** (type-system diagnostic). Follow that routing.

Map currency: maps reflect HEAD `049954e0` as of 2026-06-09 (HEAD `efdec093` is only the maps-refresh commit on top of `049954e0` — no source changed between them, so the maps are current for `compiler/src/type-system.ts`). If your work touches files modified after that point, treat map content as a starting hypothesis to verify via grep/Read.

Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing — [which map you expected to help]". The second answer is fine and valuable.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

S99/S126 leak history: this project has had repeated path-discipline leaks where a worktree dispatch's edits land in MAIN. Do not become the next incident.

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is the S90 CWD-routing failure. Save the output as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `bun install` (worktrees do NOT inherit node_modules; the pre-commit hook's `bun test` fails with "cannot find package 'acorn'" otherwise).
5. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests; gitignored, empty in fresh worktrees).
6. Baseline: `bun run test` — record the pass/skip/fail counts. The contract is **0 fail**; you add tests + new fires, never regress.

If ANY check fails: STOP and report.

## Path discipline (EVERY Read/Write/Edit/Bash)
- **Apply ALL file edits via Bash** (`perl`/`python3`/heredoc/`cp`) on worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools (S126 interim mitigation: Edit/Write have leaked to MAIN twice). Echo the target path before each write; re-verify with `git diff`/`grep` after.
- NEVER `cd` into the main repo (or anywhere) from this worktree. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"` (or run from WORKTREE_ROOT), and worktree-absolute paths exclusively. `cd` leaks (S126 incident #14/#15).
- First commit message MUST embed your startup `pwd`: `WIP(g-unknown-type-leak): start at <pwd-output>`.

---

# THE TASK

## Problem (CONFIRMED live on HEAD)
`compiler/src/type-system.ts` `resolveTypeExpr` ends (~line 2594-2595) with "Unresolvable — return tAsIs() (conservative; no error here)". An unrecognized type NAME — a typo'd or undefined type like `Frobnicate` — silently resolves to `asIs` with ZERO diagnostic. Verified: `type Bad:struct = { a: Frobnicate }` + `<x>: Frobnicate = 0` compiles exit 0, no warning. Also verified leaking: enum-payload `{ Ok(p: Frobnicate) }`, type-alias `type A = Frobnicate`, AND the same loci for the literal `any` token (the S174 any-check MISSES enum-payload + alias-RHS + tuple).

`resolveTypeExpr` is SPAN-FREE and runs in many contexts (docstring: "callers decide whether unknown is an error"). So the fix fires at decl-binding SITES that carry a span + errors array — NOT inside `resolveTypeExpr`. Mirror the S174 precedent (`checkAnyTypeForbidden`).

## Decisions ALREADY MADE (do not re-litigate; survey-confirm only)
- **Severity = HARD ERROR** (`result.errors` → CLI exit 1). Corpus blast radius across 1,103 `.scrml` is ≈ 0 genuine fires after exemptions; matches the any-reject + the no-`async`/no-`null` hard-line template.
- **Error code = `E-TYPE-UNKNOWN-NAME`** (avoid the retired/colliding E-TYPE-005 + E-STATE-005). Place its §34 row adjacent to E-TYPE-ANY-FORBIDDEN.
- **Scope = BROAD (user-ratified):** v1 fires at ALL leak loci, and you SYMMETRICALLY extend `E-TYPE-ANY-FORBIDDEN` to the same loci so the two checks stay consistent (an undefined NAME and the `any` token must be treated identically at every locus). Loci: named struct/error/**enum/tuple** decl bodies (incl. **enum-variant payload field types**), **type-alias RHS**, cell/let/const `typeAnnotation`, fn/function **param + return** types, and the recursive leaf positions (inline-struct field types, array element, map key+value, union members, snippet param type, lifecycle pre+post). Both `E-TYPE-UNKNOWN-NAME` and `E-TYPE-ANY-FORBIDDEN` fire at ALL of these.

## The predicate (THE core logic — do NOT copy the any-check's flat token-atomize)
The any-check uses `typeTextMentionsAnyToken` (flat: atomize on non-ident chars, look for the bare token `any`). That is correct for a fixed token but WRONG for unknown-name detection. You need a **position-aware leaf-base classifier**:

`isUnrecognizedTypeNameAtom(name, typeRegistry, importSpecifierNames)` → true iff ALL of:
- `/^[A-Z]/` — leading uppercase (PascalCase). **Load-bearing**: this auto-exempts `email`/`url`/`uuid`/`phone`/`time`/`color` (NAMED_SHAPES ~998-1006), the lowercase type-vocabulary (`to`/`oneOf`/`notIn`/`ordered`/`req`/`lin`/`snippet`/predicate idents), and primitives. A `.`-leading variant literal (`.Admin`) fails the leading-`[A-Za-z]` match → no fire.
- `!BUILTIN_TYPES.has(name)` (incl. the 8 PascalCase built-in error/enum types).
- `name !== "asIs"` (the sanctioned escape hatch — NEVER fires; verify it's in BUILTIN_TYPES ~962).
- `!typeRegistry.has(name)` — **PRESENCE, not kind.** A same-file forward-ref AND a type-alias both transiently resolve to `tUnknown()` (indistinguishable by KIND from a genuine unknown). `buildTypeRegistry` Pass-1 (~3049-3052) registers EVERY decl name as a `tUnknown()` placeholder before bodies parse, so presence is the forward-ref-safe test. Do NOT require `kind !== "unknown"`.
- `!importSpecifierNames.has(name)` — the single-file-mode landmine guard (see ordering below).

**Leaf extraction:** before lookup, from each type-expression position extract ONLY the leading bare identifier — strip trailing validators / `?` / paren-tails (e.g. `Status req`, `string req length(>=2)`, `Status?`, `number(>0)`, `lin string`) via the existing leading-ident regex (~1553); strip trailing `[]`; recurse into union members (split `|`), array element, map key+value, inline-struct field types, snippet param, lifecycle pre+post; CARVE OUT `oneOf([...])` / `notIn([...])` / predicate-arg regions (do not classify atoms inside them). Drive off `resolveTypeExpr`'s own branch structure, NOT a flat string atomize.

PREFER a refactor where ONE locus-traversal yields `(leafBaseName, hostSpan, label)` tuples and TWO predicates run per leaf — `isAnyToken` (existing) and `isUnrecognizedTypeNameAtom` (new) — each firing its own code. This is how you keep the two checks symmetric by construction. If a full shared-traversal refactor is too invasive, at minimum both checks must cover identical loci; survey and pick the cleanest integration in Phase 0.

## Span acquisition (SOLVED by precedent — no per-field span from the resolver)
`checkAnyTypeForbidden` takes spans from the HOST node: named decls via `scanStructBodyRaw(decl.raw, decl.name, decl.span ?? fileSpan)`; nested inline-struct via recursion reusing the host span (per-field precision in the LABEL `Parent.field`, not the span); cells via `n.span`; fn via `n.span`. Replicate exactly. (NOTE: there appear to be two `scanStructBodyRaw` definitions ~3524 and ~3746 — confirm which belongs to the any-check at 3720-3834; the dead param-string branch ~3808-3818 is unreachable because params are objects `{name, typeAnnotation}`, not strings — do NOT copy it; rely on the generic deep-walk for params.)

## Ordering (the cross-file landmine — MANDATORY)
- `checkAnyTypeForbidden` is currently invoked ~line 15924, which is BEFORE the importedTypes seeder (~15931-15938). That's fine for a token-scan but FATAL for a registry-dependent unknown-name check (it would see zero imported types).
- Add `checkUnknownTypeNames(...)` as a SEPARATE SIBLING call placed AFTER the importedTypes seed (after ~15938). Do NOT move `checkAnyTypeForbidden`.
- The symmetric any-extension (new loci) can stay in `checkAnyTypeForbidden` at its current site (token-scan, registry-independent) OR move with the shared traversal — your Phase-0 call, but if you share the traversal you must run it post-seed and confirm the any-check's existing fire-timing/tests don't regress.

## Exemptions (single-file mode — THE real landmine)
A single-file compile of an importing file has `importedTypes` empty → the imported name is genuinely absent from `typeRegistry`. Verified: single-file `board.scrml` exits 0 today with `LoadCardRow` silently asIs; a naive check would newly RED-FIRE the flagship. Mitigation: collect `importSpecifierNames` = the set of imported specifier names (AND aliased local names) from THIS file's `import { X } / import { X as Y } from '...'` nodes, and exempt them regardless of whether the dep was compiled in-set. Also covers the uncovered cross-file gaps (renamed re-exports `export {X as Y}`, `export *`, deps outside the compile set, stdlib re-export chains). `LoadCardRow` is `export type LoadCardRow:struct` in `components/load-card.scrml`, imported into `board.scrml` — the import-specifier exemption must keep it clean in BOTH single-file and multi-file modes.

## Out of v1 scope (state in your report; do NOT implement)
- **DB-block explicit annotations** (`<x>: Users` inside `<db>`): generated DB type names are bound into the SCOPE CHAIN (kind `db-type`), never into `typeRegistry`; a raw-text registry-scoped check would false-fire. Zero corpus instances (db-types flow via inference, not author annotation). EXEMPT/skip db-block-scoped annotations in v1; note it.
- **native-parser `/*.scrml`** mirrors (e.g. `tag-frame.scrml` references undeclared `Span`): CONFIRMED not in any compile gate (S162 feature-stale). Do NOT touch them, do NOT add `type Span`. They cannot redden the suite.

## Type-as-argument args do NOT flow through this path (no false-fire)
`parseVariant(json, T)` 2nd arg, `formFor for=T` / `schemaFor(T)` / `tableFor for=T`, `reflect(TypeName)` are call-arg idents / markup `for=` attrs carrying NO `typeAnnotation` field; they have their OWN checks (`_resolveAndCheckL22TypeName` ~13887-13909 → E-PARSEVARIANT-TYPE-NOT-ENUM / E-FORMFOR/SCHEMAFOR/TABLEFOR-TYPE-NOT-STRUCT / reflect→E-META-003). Your scan MUST restrict to `{struct/error/enum/tuple decl bodies, type-alias RHS, cell typeAnnotation, fn param+return}` and MUST NOT scan call-argument idents. Confirm zero collision in Phase 0.

---

# PHASES (commit per phase; code + its coupled test = ONE commit)

**PHASE 0 — survey-confirm gate (REQUIRED, report before implementing).** Verify against current source: the leak site (2594), the any-check structure (3678 / 3720-3834, the two scanStructBodyRaw, the 3778 struct/error gate, the deep-walk typeAnnotation branch ~3794-3801, the dead param branch), the invocation site (~15924) + importedTypes seeder (~15931-15938) + buildTypeRegistry passes (~3049-3052 / ~3087-3105), BUILTIN_TYPES (~962) + NAMED_SHAPES (~998-1006) + leading-ident regex (~1553), and the L22 type-arg path (~13887-13909, confirm it does NOT carry typeAnnotation). Confirm the predicate edge cases empirically (probe `Status req`, `lin string`, `email`, `.Admin`, a forward-ref, an imported name). Report your chosen integration shape (shared-traversal vs two-driver) + any line-number drift. If anything contradicts this brief, STOP and report.

**PHASE 1 — predicate + unit test.** `isUnrecognizedTypeNameAtom` + the leaf-extraction helper, unit-tested in isolation: Frobnicate→true; asIs/string/number/int→false; email/url/uuid→false (PascalCase gate); the 8 PascalCase builtins + NetworkError/ValidationError→false; same-file struct name→false; forward-ref name→false; imported-specifier name→false; `Status req`/`lin string`/`Status?`/`number(>0)`→false (leaf-strip); `.Admin`→false.

**PHASE 2 — driver + the symmetric any-extension + tests.** `checkUnknownTypeNames` (copy the `fire()` + `seenSpans` de-dupe from checkAnyTypeForbidden) firing `E-TYPE-UNKNOWN-NAME`. Broaden the locus traversal so BOTH checks cover enum-variant-payload + type-alias RHS + tuple bodies (broaden the 3778 struct/error gate). Tests for both checks at the NEW loci.

**PHASE 3 — wiring + ordering.** Collect `importSpecifierNames` from the file AST import nodes; invoke `checkUnknownTypeNames` AFTER the importedTypes seed (post ~15938). Confirm multi-file board.scrml AND single-file board.scrml BOTH stay clean (LoadCardRow exempt).

**PHASE 4 — full test file.** `compiler/tests/unit/unknown-type-forbidden.test.js` mirroring `any-type-forbidden.test.js`. Use a **cross-stream diagnostic helper** + assert the errors/warnings partition (memory: `result.errors.filter(...)` on a W-/I- code silently passes; E-TYPE-UNKNOWN-NAME is severity:error → result.errors, but lock the partition). POSITIVES: cell / struct-field / enum-payload / alias-RHS / fn-param / fn-return / array-elem / inline-struct-field all fire. NEGATIVES: primitive / asIs-at-every-locus / same-file-declared / cross-file-imported (multi-file AND aliased) / forward-ref / PascalCase-substring-guard (`Company` must NOT fire) all clean. INTERACTION: an unknown MAP KEY still fires `E-MAP-KEY-NOT-COMPARABLE` (add a guard that the existing code still fires — decide consciously whether a 2nd code is desired; default: let the existing map-key code own that locus, don't double-fire).

**PHASE 5 — SPEC (compiler/SPEC.md, normative).** New **§14.1.2** "Unrecognized type names — every type must be defined" immediately after §14.1.1 (after ~line 7437), riding the §14.1.1 hard-line template (canonical-rule + asIs-escape + parallel-shape bullets). REWRITE/RETIRE the §14.1.1 deferral NOTE at ~7437 (currently "a separate, broader gap tracked as a follow-on") to point at the now-shipped §14.1.2. Add the rule to the "what scrml is NOT" parallel-shape bullet lists at §14.1.1 (~7435), §19.9.8 (~13079), §42.1 (bidirectional hole-detection). Anchor the forward-ref/cross-file resolution semantics to §53.14.5 (~29981) + §53.14.6 (~29993; the forward-ref prereq is already stated ~29997). Add the §34 row `E-TYPE-UNKNOWN-NAME` adjacent to E-TYPE-ANY-FORBIDDEN (~16621): name the fire loci, state it resolves against typeRegistry per §53.14.5, name asIs as the never-fires escape hatch, note cross-file imports resolve via §21.8/§53.14.6, cite the emit site (the decl-binding sites, NOT resolveTypeExpr), severity Error. Also amend the §34 E-TYPE-ANY-FORBIDDEN row + §14.1.1 to reflect that the any-check now ALSO covers enum-payload/alias/tuple (symmetric).

**PHASE 6 — corpus re-sweep (the Broad-scope new loci).** The original corpus sweep was oriented to the any-check's loci. BROAD adds enum-payload + alias-RHS + tuple. Re-sweep ALL `.scrml` (samples/ examples/ stdlib/ self-host/ — EXCLUDING native-parser/ which is out of gate) for undefined type NAMES in those NEW positions AND for the literal `any` in those new positions (S174's any-migration only touched the old loci — extending the any-check may newly fire on an un-migrated `any`-in-enum-payload). Migrate any genuine finds (→ a real named type where one exists, else `asIs`). The migration MUST land WITH the reject (else the suite reddens). Report exactly what newly fired + how you resolved each.

**PHASE 7 — R26 EMPIRICAL VERIFICATION (MANDATORY before claiming DONE).** This is a type-system diagnostic that fires on real source. Re-compile real adopter source on the post-fix baseline and verify symptom-gone + zero false-fire:
```
W="$WORKTREE_ROOT"
# 1. the leak reproducers MUST now fire E-TYPE-UNKNOWN-NAME at every locus:
#    cell / struct-field / enum-payload / alias-RHS / fn-param / fn-return / array-elem
# 2. the flagship + corpus MUST stay clean (0 false-fire):
bun "$W"/compiler/bin/scrml.js compile "$W"/examples/23-trucking-dispatch --output-dir /tmp/r26-gunk/flagship 2>&1 | tail -5
#    expect: compiles clean, NO E-TYPE-UNKNOWN-NAME (LoadCardRow + all imports resolve)
# 3. asIs / imported / forward-ref / builtin / named-shape probes MUST stay clean.
```
Report the R26 table. End-state: every leak reproducer fires; flagship + full corpus + full `bun run test` are GREEN (0 fail). DO NOT mark DONE without R26 passing.

---

# COMMIT DISCIPLINE
- Commit after each phase; code + its coupled test = ONE commit (no transiently-red window). WIP commits expected.
- `git status` MUST be clean before you report DONE ("work in worktree, no commits" is NOT an acceptable terminal report).
- NEVER `--no-verify`. The pre-commit hook runs the unit/integration/conformance subset; let it gate.
- Update `docs/changes/g-unknown-type-leak-2026-06-09/progress.md` after each phase (timestamped, append-only).

# COMPLETION REPORT
Report: WORKTREE_PATH (your startup pwd) · FINAL_SHA · FILES_TOUCHED · per-phase summary · the Phase-0 survey findings (integration shape chosen + any line drift) · the Phase-6 corpus re-sweep result (what newly fired + resolution) · the Phase-7 R26 table · baseline-vs-final `bun run test` counts · deferred items (db-block, native-parser Span) · maps feedback.
