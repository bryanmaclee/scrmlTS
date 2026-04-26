# Pre-snapshot — fix-component-def-block-ref-interpolation-in-body (A7)

**Branch:** `changes/fix-component-def-block-ref-interpolation-in-body`
**Compiler SHA:** `dbadb9e` (baseline at session start)
**Captured:** 2026-04-26

## Test suite baseline

```
 7937 pass
 40 skip
 0 fail
 28226 expect() calls
Ran 7977 tests across 380 files. [12.82s]
```

(One transient network failure observed in first run — `ECONNREFUSED` in a network-dependent test — re-run clean. Treating as pre-existing flake unrelated to this change.)

## E2E corpus state

Running `bun run compiler/src/cli.js compile examples/<file>.scrml -o /tmp/...` from the worktree root after a fresh `bun install` and `bun run pretest`:

- All 22 example files compile clean (verified spot-check via `examples/05-multi-step-form.scrml` — exits 0 with no E-COMPONENT-020 warnings).
- ex 05 currently uses an if-chain workaround for component dispatch; in this form ConfirmStep registers cleanly. The intake's claim "E-COMPONENT-020 from ConfirmStep" is NOT reproducible against the current HEAD because the current ex 05 uses an if-chain that does not re-enter the component-expander walk for if-chain branches (a separate observation, see below).
- A direct `<ConfirmStep/>` reference also compiles clean if it's in its own logic block alone.

## Reframe of the actual bug (after trace)

The intake hypothesized a BLOCK_REF interpolation issue. Trace via `compiler/src/ast-builder.js`'s `collectExpr` proved otherwise. The **actual** bug is:

> When a component-def body (collected by `collectExpr`) contains an HTML void element like `<input bind:value=@x>` or `<br>` (no `/>` self-close, no `</tag>` closer because HTML semantics make it implicitly closed), the angle-tracker increments `angleDepth` for the `<TAG` open but never decrements — there's no closer to match. After the wrapper element closes (`</div>`), `angleDepth` is still > 0. `collectExpr` thinks it's still inside markup, and the IDENT-`=` boundary guard at line 1226 (gated by `angleDepth === 0`) is bypassed. The next sibling `const Foo = <…>` is greedily consumed into the first component's `raw`. Only the first component registers; subsequent siblings are silently swallowed.

This is the same root cause as A8 (the `<select>` shape contains both `<select>` (non-void, properly closed) AND `<input type="checkbox" bind:value=@newsletter>` (void, no closer) in PreferencesStep). A8 is a side-effect of the same bug.

## Verified minimal repros

All in `/tmp/a7-work/`:

1. `min2.scrml` — `<div><input bind:value=@x></div>` + sibling `const Bar` — Bar gets swallowed
2. `min4.scrml` — `<div><br></div>` + sibling `const Bar` — Bar gets swallowed
3. `repro-ex05-shape.scrml` — full ex 05 InfoStep+PreferencesStep+ConfirmStep — only InfoStep registers; the rest are swallowed
4. `min3.scrml` (sanity) — `<div><p>x</p></div>` + sibling `const Bar` — both register correctly (no void elements present)

The trigger is **HTML void elements** (`<br>`, `<input>`, `<img>`, `<hr>`, etc.) used in scrml's natural form (no `/>` required). The original A7 BLOCK_REF interpolation hypothesis was a red herring — `${@x}` works fine when not following a void element.

## Tags
#bug #parser #ast-builder #component-def #void-elements #scope-c #s44 #t2 #post-a3 #pre-snapshot

## Links
- Intake: `docs/changes/fix-component-def-block-ref-interpolation-in-body/intake.md`
- A8 (same root cause): `docs/changes/fix-component-def-select-option-children/intake.md`
- A3 fix this builds on: commit `bcd4557`
- Test repros: `/tmp/a7-work/min*.scrml`, `repro-ex05-shape.scrml`
