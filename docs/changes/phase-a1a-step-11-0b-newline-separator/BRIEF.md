# Phase A1a Step 11.0b — Newline-as-statement-separator in `parseLogicBody`

**Status:** DRAFT — queued for dispatch after 11.0a lands. Surfaced by Step 11 smoke test as a deferred parser gap.
**Predecessor:** Step 11 (`bcca1e6`) demonstrated that multi-decl bodies separated by newlines (no `;`) eat sibling decls into the first decl's init string.
**Estimate:** 1-2 h focused work. Single-file extension in `compiler/src/ast-builder.js` — `parseLogicBody` (or wherever logic-body statement boundaries are detected; survey to confirm).
**Authority:** SPEC §6.1 + §6.2 — V5-strict access principle and three RHS shapes; multi-decl is a normal scrml shape. Kickstarter v2 §3 (lines 132-249) uses newline-separated multi-decl extensively as the canonical demonstration.

---

## §1 What lands

Newline-only separators between state-decls in a logic body must end the first decl's RHS expression and start the next decl. Today only `;` works.

```scrml
${
    <count> = 0
    <name>  = ""
    <items> = []
}
```

Today this parses as a single decl `count` with init string `0\n    <name>  = ""\n    <items> = []` — sibling decls eaten. Step 11.0b makes the newlines act as statement boundaries when the lookahead at the next non-trivia token is a state-decl-shape opener (`<` IDENT `>` or `const` `<` IDENT `>`).

Semicolon-separated form continues to work:

```scrml
${  <count> = 0; <name> = ""; <items> = [] }
```

Semicolons + newlines mixed must work too.

---

## §2 Scope

### §2.1 In-scope
1. Locate the logic-body parser (`parseLogicBody` per BRIEF assumption; survey will confirm).
2. Identify the RHS-collection / boundary-detection point — likely where `collectExpr` sweeps tokens until the end of the expression.
3. Extend boundary detection: a newline followed (after whitespace/trivia) by `<` IDENT lookahead suggesting a state-decl OR `const` `<` lookahead OR a `}`-closer ⇒ end the current expression.
4. Critical disambiguation: `<` inside an expression (markup-as-value RHS, JSX-shaped derived RHS) MUST NOT be confused with the start of a sibling decl. The existing `angleDepth` tracking (per Step 5 progress) handles markup-RHS depth; rely on it.
5. Test fixtures covering all the kickstarter §3 patterns + edge cases.
6. Re-run Step 11's anti-test memorials with `TODO[step-11.0b]` markers — flip them to positive assertions.

### §2.2 Out-of-scope
- Top-level body parsing (`<program>` body) — survey to confirm whether the same boundary-detection code is reused; if so, fix lifts naturally; if not, document divergence and keep this step scoped to logic-bodies.
- Compound-body parsing — Step 11.0a's territory.
- Semicolon insertion (ASI-style) for arbitrary expression statements — explicitly NOT in scope. This step is JUST about state-decl statement boundaries.

---

## §3 Survey-first mandate (depth-of-survey discount; **9× confirmed locus**)

Step 11.0a may also surface the candidate Discount #9; Step 11.0b is small enough that a similar shape is plausible.

Survey questions:
1. Locate `parseLogicBody`. Document file:line + the RHS-collection logic.
2. How does `collectExpr` (or equivalent) currently terminate the RHS? On `;`, on `}`, on EOF? Document.
3. What does `angleDepth` tracking look like (per Step 5 progress)? Confirm markup-RHS still nests cleanly so `<input/>` inside a Shape 2 RHS doesn't trip false-positive boundaries.
4. Are there existing samples that DO use newline-separated multi-decls and DO compile-clean today? If yes, what makes them work? (Possibly they're at top-level `<program>` body with different parser entry, OR they use semicolons.)
5. Probe an existing kickstarter §3 example through the parser — observe the exact failure shape.
6. Does the same boundary-detection code path serve `<program>` body parsing too? If so, the fix is universal; if not, scope is narrower.

**You are AUTHORIZED** to correct the touchpoint if survey reveals divergent locus.

Document survey findings in `$WORKTREE_ROOT/docs/changes/phase-a1a-step-11-0b-newline-separator/progress.md` BEFORE source edits.

---

## §4 Test plan

Add to `compiler/tests/integration/parse-shapes-v0next.test.js` or new file:

- §S11B.1: `${ <count> = 0\n<name> = "" }` — two decls, newline-separated; assert TWO state-decl AST nodes, not one
- §S11B.2: 4-decl block with newlines, mixed Shape 1 / 2 / 3 — each decl correctly bounded
- §S11B.3: mixed `;` + newline separators — both work, no double-counting
- §S11B.4: Shape 2 RHS with markup `<input/>` followed by newline + sibling decl — angleDepth tracking preserves markup intact
- §S11B.5: Shape 3 derived RHS spanning multiple lines (legitimately multi-line expression `@count *\n2`) — newline INSIDE expression doesn't end RHS prematurely; only newline at expression-statement-boundary terminates
- §S11B.6: regression — single-decl body still works
- §S11B.7: regression — semicolon-only separator still works
- §S11B.8: anti-html-fragment guard on every positive case
- §S11B.9: kickstarter §3 examples — flip the `TODO[step-11.0b]` memorials in `kickstarter-v2-smoke.test.js`

Aim: ~6-10 new cases + flipped memorials.

---

## §5 Definition of done

1. ✅ `compiler/src/ast-builder.js` boundary detection extended to recognize newline-followed-by-decl-opener as RHS terminator.
2. ✅ Multi-line legitimate expressions (e.g., `@a +\n@b`) NOT terminated prematurely.
3. ✅ Step 11's `TODO[step-11.0b]` memorials flipped to positive assertions in `kickstarter-v2-smoke.test.js`.
4. ✅ ~6-10 new positive cases + regression baselines.
5. ✅ Anti-html-fragment guard on every positive case.
6. ✅ Pre-commit + full `bun run test`: 0 fail, 43 skip, 0 regressions on existing 8,845 (or the post-11.0a baseline at dispatch time). Delta +6 to +10 pass + memorial flips.
7. ✅ Branch clean. NO `--no-verify`.
8. ✅ progress.md updated.

---

## §6 Branch + commit hygiene

- Per-step branch: `phase-a1a-step-11-0b-newline-separator`, parented from main HEAD at dispatch time.
- WIP commits expected:
  - `WIP(a1a-step-11-0b): survey notes`
  - `WIP(a1a-step-11-0b): boundary-detection branch in parseLogicBody`
  - `WIP(a1a-step-11-0b): tests`
  - `WIP(a1a-step-11-0b): flip Step 11 TODO[step-11-0b] memorials`
  - Final: `compile(a1a-step-11-0b): newline-as-statement-separator for state-decls`
- After each meaningful step, append timestamped line to `progress.md`.

---

## §7 Risk surface

- **Ambiguity with multi-line legitimate expressions.** A user-written `<x> = @a +\n@b` is ONE decl with a multi-line expression. Today this works because the newline is just whitespace inside the expression. Step 11.0b must NOT regress this — the newline-as-separator rule fires only when the next non-trivia token is itself a decl-opener.
- **Interaction with Shape 2 markup-RHS.** A `<x> = <input\n type="text"/>` decl spans newlines inside markup. The `angleDepth` tracking (from Step 5) handles this; verify regression-clean.
- **Top-level vs nested-body parser entries.** If `<program>` body uses a different parser entry than `${...}` blocks, the fix may need to land in two places. Survey clarifies.
- **Comment-line interaction.** A `// comment` line between decls: newline-after-comment must still trigger separator. Easy if newlines are detected post-trivia-skip.

---

## §8 Tags

#phase-a1a #step-11-0b #newline-separator #parseLogicBody #parser-only #step-11-escalation
