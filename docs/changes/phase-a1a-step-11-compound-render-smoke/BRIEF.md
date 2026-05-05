# Phase A1a Step 11 — Variant C compound + render-by-tag verification + kickstarter v2 §3 smoke

**Status:** DRAFT — queued for dispatch after Steps 6, 7, 9, 10 land.
**Predecessor:** Steps 1-10 land the new shapes. Step 11 verifies that the AGGREGATE — Variant C compound + render-by-tag (`<varName/>`) + kickstarter v2 §3 example code — parses cleanly. No new source code expected; this is **verification + tests only**.
**Estimate:** 1-1.5 h focused work. New test files only. ZERO source changes likely.
**Authority:** SPEC §6.3 (Variant C compound), §6.4 (render-by-tag); kickstarter v2 §3 examples are the smoke corpus.

---

## §1 What lands

Three verification dimensions:

### §1.1 Variant C compound
Confirms compound state with structural-children body parses to:
```
state-decl (parent, shape:"plain", initExpr:null, children: [...])
  ├── state-decl (child)
  ├── state-decl (child)
  └── ...
```

```scrml
<formRes>
  <name>  = ""
  <email> = ""
  <error> = ""
</>
```

### §1.2 Render-by-tag
Confirms `<varName/>` in markup expands correctly when `varName` is a Shape 2 decl-coupled-with-render-spec cell:
```scrml
<userName req length(>=2)> = <input type="text"/>

<form>
  <userName/>     // ← render-by-tag at use site
</form>
```

Step 11 confirms parser produces a markup node tagged with the cell name; A1c does the actual render-spec expansion.

### §1.3 Kickstarter v2 §3 smoke
The kickstarter v2 article (`docs/articles/llm-kickstarter-v1-2026-04-25.md` or v2 successor) §3 has canonical scrml examples covering all three shapes + compound + engine. Step 11 imports those examples (or paraphrases them) into a smoke-test fixture and asserts:
- Each parses without errors.
- AST shapes match Steps 1-10 contracts.
- Anti-html-fragment guard fires on every fixture (no deceptive-success).

---

## §2 Scope

### §2.1 In-scope
1. Survey current Variant C parser path. Confirm structural-children compound parses correctly TODAY (no new source needed).
2. Survey render-by-tag at use site — confirm parser already produces a markup node, even if it doesn't classify as a render-spec call yet (A1c work).
3. Pull ~6-12 examples from kickstarter v2 §3 into smoke-test fixtures.
4. Tests asserting parse-clean + AST shape matches the contracts from Steps 1-10.

### §2.2 Out-of-scope
- Render-spec EXPANSION at A1c. Step 11 only confirms parser doesn't reject the use-site syntax.
- Engine parsing — separate scope (probably A1b/A1c).
- Validator firing — A1b/A2.

---

## §3 Survey-first mandate

Strong likelihood Step 11 is "no source changes needed":
1. Variant C compound — survey AST output for `<formRes>... </>`. If state-decl with children, ✅ done.
2. Render-by-tag — survey AST for `<userName/>` use site. If markup node with tag matching a cell name, ✅ done (A1c handles classification).
3. Kickstarter v2 §3 examples — pull each, run through parser, log shape.

If surprises surface (e.g., compound parent doesn't carry `shape: "plain"` or `initExpr: null` consistently), document divergence and either fix in this step OR queue for A1b.

Document in progress.md before code edits.

---

## §4 Test plan

New file: `compiler/tests/integration/kickstarter-v2-smoke.test.js`.

- §K11.1-K11.6 (or however many): one assertion per kickstarter §3 example. Each asserts compile-clean + key AST shape invariants (state-decl kinds, shape discriminants, validators, render-spec presence).
- §K11.compound: explicit Variant C parse fixture asserting parent + children shape.
- §K11.render-tag: explicit render-by-tag use-site fixture asserting markup node + tag.
- Anti-html-fragment guard on every fixture.

Aim: ~10-15 cases (kickstarter §3 likely has ~6 examples + ~4 explicit micro-fixtures).

---

## §5 Definition of done

1. ✅ Smoke test file added.
2. ✅ Variant C compound shape verified.
3. ✅ Render-by-tag verified at parse level.
4. ✅ Kickstarter v2 §3 examples all parse-clean with correct AST shapes.
5. ✅ Anti-html-fragment guard on every positive fixture.
6. ✅ Pre-commit + full `bun run test`: 0 fail, 43 skip, 0 regressions. Delta +10 to +15 pass.
7. ✅ NO source-code changes expected. If any are required, document divergence in progress.md and surface to PA before committing source edits.

---

## §6 Branch

`phase-a1a-step-11-smoke`.

---

## §7 Tags

#phase-a1a #step-11 #verification #kickstarter-smoke #compound #render-by-tag
