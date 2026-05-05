# Phase A1a Step 12 — Existing-test deltas: rewrite + drop

**Status:** DRAFT — queued for dispatch after Steps 6, 7, 9, 10, 11 land.
**Predecessor:** All Step 1-11 source changes done. Step 12 is the long-tail cleanup: existing tests/samples that bake in pre-v0.next access patterns (e.g., `let count = 5` collisions; bare-name access to state cells; legacy `@NAME = init` decl forms outside `${}` blocks where they should be `<NAME> =`) get rewritten or dropped.
**Estimate:** 4-8 h focused work. Multi-file, mechanical-with-judgment.
**Authority:** S59 user pre-authorization for batch test-rewrite under S56 destructive-ops directive — single CHANGELOG enumeration at close. (Per `docs/changes/phase-a1a-lex-parse/DISPATCH-A1A-BRIEF.md` §1.)

---

## §1 What lands

Two categories:

### §1.1 REWRITE
Tests/samples that exercise the OLD shape but conceptually still test something v0.next-relevant. Migrate them to the new shape. Examples:
- A test that did `@count = 0; @count++` to verify reactivity should now use `<count> = 0; @count++`.
- A sample that declared a derived as `@doubled = @count * 2` (no `const`, but reactive-derived semantics) needs to become `const <doubled> = @count * 2`.

### §1.2 DROP
Tests that exclusively probe behaviors that no longer make sense in v0.next. Examples:
- Tests asserting bare-name access to state cells (post-V5-strict, this is `E-NAME-COLLIDES-STATE` / local-only).
- Tests asserting old `loose` flag behavior (L9 dropped).
- Tests for the old `reset()` no-arg keyword (L10, superseded by L18 `reset(@cell)`).

---

## §2 Scope

### §2.1 In-scope
1. Survey: enumerate every test file and sample affected by Steps 1-11 changes.
2. Per file: classify as rewrite / drop / unaffected.
3. Execute: edit rewrites, delete drops, leave unaffected alone.
4. Document the dispositions in `progress.md` so the CHANGELOG entry has the full enumeration.
5. Maintain 0-regression contract: after Step 12, full `bun run test` passes with the new test count.

### §2.2 Out-of-scope
- New tests for v0.next-only behaviors that aren't covered by Steps 1-11 specific test files. Those belong with their feature step.
- A1b/A1c-specific tests. Defer to A1b/A1c dispatches.

---

## §3 Strategy

### §3.1 Inventory pass first
Before editing, produce `progress.md` enumeration:
- File path
- Disposition: REWRITE | DROP | UNAFFECTED
- Brief rationale (one line)
- Estimate of edit size

PA reviews enumeration before agent proceeds with edits. (Optional gate; agent may proceed without PA review per S56 destructive-ops directive — but PA review reduces re-work.)

### §3.2 Edit pass
Mechanical execution. Commit per ~5-10 file batch with WIP commits naming the test areas covered.

### §3.3 Final cleanup
- Confirm no orphan imports / dead test scaffolding.
- Run full `bun run test`. Iterate until clean.
- Final commit `compile(a1a-step-12): existing-test deltas — N rewrites, M drops`.

---

## §4 Risk surface

- **Test count drops.** Drops will reduce the test count. Document expected delta in `progress.md` before edits so the post-edit count can be verified against the prediction.
- **Sample regression.** Examples are the gauntlet's substrate. Any sample drop must be confirmed-redundant with kickstarter v2 §3 + Steps 1-11 fixtures. If a sample drop would erase a behavioral assertion, REWRITE instead.
- **Deceptive-success during rewrite.** Anti-html-fragment guard MUST be added to any rewritten positive parse-test. The point of the rewrite is to upgrade coverage to the v0.next shape — if the rewrite drops the AST-shape assertion, the rewrite is incomplete.

---

## §5 Definition of done

1. ✅ `progress.md` has full enumeration: every affected file with disposition + rationale.
2. ✅ All REWRITEs landed. All DROPs landed. UNAFFECTEDs untouched.
3. ✅ Pre-commit + full `bun run test`: 0 fail, 43 skip. Total count matches the predicted delta from §3.1 inventory ± documented variance.
4. ✅ NO orphan / dead test files.
5. ✅ Anti-html-fragment guard on every rewritten positive parse-test.
6. ✅ Branch clean. NO `--no-verify`.
7. ✅ CHANGELOG draft ready for Step 13's final aggregate.

---

## §6 Branch

`phase-a1a-step-12-existing-test-deltas`.

---

## §7 Tags

#phase-a1a #step-12 #test-deltas #cleanup #destructive-ops-pre-authorized
