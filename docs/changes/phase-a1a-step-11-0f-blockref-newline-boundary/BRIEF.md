# Phase A1a Step 11.0f — `<x> = ?{SQL}\n<y>` BLOCK_REF newline-as-separator boundary fix (P-FUP-3)

**Status:** DRAFT — surfaced as P-FUP-3 by Step 11.0e dispatch (S61, 2026-05-05). Step 11.0e (`6ceca5f`) fixed the `not` keyword case via universal `VALUE_KEYWORDS` extension; same-locus same-shape bug surfaces with BLOCK_REF trailing token.
**Estimate:** 1-3h focused work. Likely 1-LOC source change + tests + sample restoration. Same parser locus as Steps 11.0b and 11.0e.
**Authority:** Same as 11.0e — preserves Step 11.0b's universal-fix property at `collectExpr` ASI-NEWLINE branch (`compiler/src/ast-builder.js` L1985-2030).

---

## §1 What lands

The V5-strict structural form `<x> = ?{SQL}\n<y>` (where `?{SQL}` is a SQL passthrough block expression — BLOCK_REF token kind) parses correctly with BOTH state-decl siblings preserved.

**Before Step 11.0f:**
- `<x> = ?{SELECT * FROM users}\n<y> = ""` → parser stops scanning at the BLOCK_REF; `<y>` is dropped from the AST OR greedily absorbed into `x.init`.
- The `lastEndsValue` check in Step 11.0b's ASI-NEWLINE branch doesn't recognize BLOCK_REF as value-producing.
- Step 11.0e's `not`-fix at the same locus did NOT cover this case — Step 11.0e was scope-limited to the keyword shape.
- Surfaced by Step 11.0e dispatch's per-sample decl-count verification: `combined-007-crud.scrml` blocked.

**After Step 11.0f:**
- `<x> = ?{SQL}\n<y>` parses to two `state-decl` siblings.
- Step 11.0e's universal-fix property preserved (no BLOCK_REF-specific branch; just extending `lastEndsValue`'s value-classifier to cover BLOCK_REF).
- The 1 reverted Step 12 sample (`combined-007-crud.scrml`) migrates to V5-strict canon cleanly.

---

## §2 Scope

### §2.1 In-scope
1. **Locate the `lastEndsValue` predicate** in `compiler/src/ast-builder.js` `collectExpr` ASI-NEWLINE branch (~L1985-2030 per Steps 11.0b + 11.0e). Step 11.0e added `"not"` to a `VALUE_KEYWORDS` Set at L1970 (or thereabouts). The classifier likely doesn't currently flag BLOCK_REF as value-producing.
2. **Extend the classifier to recognize BLOCK_REF as value-producing.** Either (a) add BLOCK_REF to whatever the kind-based check is, OR (b) refactor the check to be purely value-shape-driven rather than kind-list-driven. Mirror Step 11.0e's universal pattern.
3. **Restore `samples/compilation-tests/combined-007-crud.scrml`** to V5-strict canon. Per Step 11.0e's report, decl-count regression detection caught this sample (delta -6 decls) — verify post-fix decl-count parity.
4. **Verify all four trailing-value-producing token kinds** in the same classifier are covered: keywords (Step 11.0e), identifiers (Step 11.0b), literals (Step 11.0b), BLOCK_REF (this step). Surface any remaining gap as P-FUP-4 (e.g., template literals if not already covered).
5. Update progress.md cumulative log.

### §2.2 Out-of-scope
- Wider refactor of `collectExpr`'s ASI-NEWLINE branch — keep the patch narrow.
- Any other parser-locus changes — Step 11.0e established the same-locus pattern; this step continues it.
- Self-host parity — defer per Step 4-7 policy.

---

## §3 Survey-first mandate (depth-of-survey discount)

Apply rigorously. Step 11.0e's report explicitly identified the locus and mechanism — Step 11.0f survey is largely confirmation:

1. **Confirm the locus.** Per 11.0e's progress.md: `compiler/src/ast-builder.js` L1970 `VALUE_KEYWORDS` Set + `lastEndsValue` check at L1985-2030. File:line confirmation expected.
2. **Inspect what kinds `lastEndsValue` recognizes.** Probe with `<x> = ?{SELECT 1}\n<y>` and minimal compile to confirm the bug shape matches 11.0e's diagnosis (boundary check fails because BLOCK_REF isn't in the value-classifier).
3. **Verify the legacy `@x = ?{SQL}\n@y` form preserves both decls.** Per Step 12's evidence, the legacy form worked. Difference between V5-strict and legacy paths at this junction confirms the fix locus.
4. **Probe template literals + other expression-shape forms** that could be value-producing trailing tokens. Surface any uncovered cases as P-FUP-4. Specifically check:
   - Template literals (`<x> = `${...}`\n<y>`).
   - Member access (`<x> = obj.prop\n<y>`).
   - Call expressions ending in `)` (`<x> = fn()\n<y>`).
   - Index access ending in `]` (`<x> = arr[0]\n<y>`).
   - Object literals ending in `}` (`<x> = {a:1}\n<y>`).
   - These should already work via Step 11.0b's identifier/literal coverage; verify but don't fix what's not broken.

**You are AUTHORIZED to correct the touchpoint** if survey reveals divergent locus.

Document findings in `$WORKTREE_ROOT/docs/changes/phase-a1a-step-11-0f-blockref-newline-boundary/progress.md` BEFORE source edits.

---

## §4 Test plan

### §4.1 Update existing samples
- Restore `samples/compilation-tests/combined-007-crud.scrml` to V5-strict canon. Pre-Step-11.0f delta was -6 decls; verify decl-count parity post-fix.

### §4.2 New positive cases
Add to `parse-shapes-v0next.test.js` §S11F (or `collectexpr-newline-boundary.test.js` — Step 11.0b's home if a closer fit). ~5-7 cases:
- §S11F.1: `<x> = ?{SELECT 1}\n<y> = 0` — V5-strict structural with BLOCK_REF + sibling.
- §S11F.2: `<x> = ?{SQL}\n@y = 0` — V5-strict + legacy mix.
- §S11F.3: `<x> = ?{SQL}\nconst <y> = expr` — BLOCK_REF + derived sibling.
- §S11F.4: `<x> = ?{SQL}\n<y>: T = init` — BLOCK_REF + typed-decl sibling (Step 11.0c interaction).
- §S11F.5: `<x> = ?{SQL}\n<formRes>\n  <a> = 0\n</>` — BLOCK_REF + Variant C compound sibling (Step 11.0a interaction).
- §S11F.6: anti-html-fragment guard.
- §S11F.7: regression — legacy `@x = ?{SQL}\n@y = 0` STILL parses (preserve legacy path).

### §4.3 Coverage gap probes (if surfaced)
Per §3.4 — if any other expression-shape form produces a similar boundary bug, surface as P-FUP-4 in progress.md (don't fix here unless trivial AND universal).

### §4.4 No-regression check
After source rewire, full `bun run test` MUST pass with 0 regressions. Test count delta: ~5-7 new cases in §S11F + sample restoration (no test count change from sample restoration).

---

## §5 Definition of done

1. ✅ Locus confirmed + minimal patch applied (extending value-classifier for BLOCK_REF).
2. ✅ `samples/compilation-tests/combined-007-crud.scrml` restored to V5-strict canon; decl-count parity verified.
3. ✅ §S11F test block landed (~5-7 cases including legacy regression).
4. ✅ Pre-commit + full `bun run test`: 0 fail, 44 skip (or fewer; surface count delta), 0 regressions.
5. ✅ Branch clean. NO `--no-verify`.
6. ✅ progress.md updated with cumulative log + survey findings + decl-count parity verification.
7. ✅ Universality preserved — no BLOCK_REF-specific branch introduced; mirrors Step 11.0e's universal-fix pattern.

---

## §6 Risk surface

- **Step 11.0b + 11.0e interaction.** The fix should preserve the universal-fix property at `collectExpr` ASI-NEWLINE. If a BLOCK_REF-specific branch is needed, surface as a regression of universality.
- **Legacy path preservation.** `@x = ?{SQL}\n@y` MUST continue to parse. §S11F.7 enforces.
- **Wider class of bugs.** Per §3.4 — survey may surface P-FUP-4 (template literals, member access, etc.). Document but don't fix unless trivial.
- **BLOCK_REF as expression vs. as decl-RHS.** `?{SQL}` may be an expression in multiple positions (function arg, array element, etc.). Verify the fix at the decl-RHS boundary doesn't change semantics in those other positions.

---

## §7 Branch + commit hygiene

- Per-step branch: `phase-a1a-step-11-0f-blockref-newline-boundary`, parented from main HEAD at dispatch time.
- WIP commits expected:
  - `WIP(a1a-step-11-0f): survey + locus-confirm`
  - `WIP(a1a-step-11-0f): blockref boundary patch`
  - `WIP(a1a-step-11-0f): sample restoration + tests`
  - Final: `compile(a1a-step-11-0f): <x> = ?{SQL} BLOCK_REF newline-as-separator boundary fix`

---

## §8 Tags

#phase-a1a #step-11-0f #p-fup-3 #blockref #newline-as-separator #step-11-0b-extension #step-11-0e-extension #v5-strict #parser-only
