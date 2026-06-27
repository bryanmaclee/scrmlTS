# BRIEF — g-endpoint-multi-statement-arm-invalid-js (ss34 item 1)

**Dispatched by:** sPA ss34 · **Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **model:** opus
**Base:** `spa/ss34` @ `5fb41cb9` (post-ss38 HAMT; §61 surface present)
**Change-id:** `g-endpoint-multi-statement-arm-diagnostic-2026-06-26`

## The bug

A multi-statement bare-body `<endpoint>` arm emits invalid JS, caught only by the generic
`E-CODEGEN-INVALID-JS` emit gate (a cryptic "compiler defect" message). There is no clean,
adopter-actionable endpoint diagnostic. ss18-W4 build-surfaced this.

Bug site is **exact**: `emitEndpointArmEnvelope` in
`compiler/src/codegen/emit-server.ts:2384–2402`. It lowers the arm body as a SINGLE
value-expression via `emitExprField`, then wraps it:

```js
const expr = emitExprField(null, bodyRaw, { mode: "server", ... });
out.push(`const _scrml_result = await (${expr});`);
```

If `bodyRaw` is a multi-statement body (e.g. a local decl + a value expr), the lowered
`expr` is not a single JS expression, so `await (${expr})` is invalid JS — the whole-file
`--validate-emit` acorn gate rejects it with the generic `E-CODEGEN-INVALID-JS`.

## SCOPE — diagnostic ONLY. Do NOT build multi-statement lowering.

**Read SPEC §61 line ~33366 ("Limits / future waves") FIRST.** It is normative and
explicit:

> **Multi-statement bare-body arms** — ... A MULTI-statement bare body ... is **NOT yet
> lowered** ... **Multi-statement handler bodies are a future wave**.

So multi-statement arm-body LOWERING is a SPEC-deferred future wave (it would god-ify the
primitive against the §60.7 LIMIT-PRIMITIVES boundary). **DO NOT implement multi-statement
lowering.** Your ONLY task is to replace the cryptic generic gate-rejection with a clean,
named `E-ENDPOINT-MULTI-STATEMENT-ARM` Error that fires at the arm span and tells the
author this is a not-yet-supported future wave + the workaround.

## The fix

1. **Detect** a multi-statement bare-body arm in `emitEndpointArmEnvelope` (or just before
   it) and, instead of emitting the invalid `await (${expr})`, push a clean
   `E-ENDPOINT-MULTI-STATEMENT-ARM` CGError anchored at the arm span.
   - The three SUPPORTED forms (must keep working byte-identical): the `:`-shorthand
     single-expression arm, the single-expression bare body (`<Variant>expr</>`), and the
     self-closing no-op arm (→ 204). Only a 2+-statement bare body is the error case.
   - **Recommended detection:** parse the LOWERED `expr` with acorn as a single expression
     (the emit-validation gate already uses acorn — reuse that path). If it does not parse
     as exactly one expression that consumes the whole string, it is multi-statement → fire
     the diagnostic. Confirm the cleanest mechanism against the existing gate machinery;
     do NOT hand-roll a fragile raw-text statement counter if acorn gives a clean signal.
   - Make sure the self-closing / empty-body 204 path (bodyRaw === "") still short-circuits
     BEFORE the detection (it already returns early at line 2387).

2. **Diagnostic text** (adopter-actionable, name the workaround):
   `E-ENDPOINT-MULTI-STATEMENT-ARM: the <Variant> arm of <endpoint ...> has a multi-statement
   body. <endpoint> arm bodies are currently a single value-expression (the value the
   compiler envelopes as the JSON response, §61.5); multi-statement handler bodies are a
   future wave (SPEC §61 limits). Resolution: reduce the arm to a single expression, or
   extract the logic into a server function and call it from the arm (e.g.
   `<Variant : computeResult(...)>`).`
   - Use the right severity (Error) and the existing CGError construction pattern in this
     file (see the E-CG-016 push at ~2588). Partition into `errors` (it's an Error, CLI exit 1).

3. **Catalog the new code** (this is the "clean diagnostic" the footprint authorizes):
   - Add the `E-ENDPOINT-MULTI-STATEMENT-ARM` row to the §34 diagnostics table in
     `compiler/SPEC.md` (alongside the other five `E-ENDPOINT-*` rows ~line 17617–17621).
   - Add it to the §61.9 diagnostics list (~line 33355).
   - Update the §61 "Limits / future waves" multi-statement note (~line 33366): change
     "the `--validate-emit` gate rejects it" to "→ the clean `E-ENDPOINT-MULTI-STATEMENT-ARM`
     Error (the future-wave gap is now loud + named, not the generic invalid-JS gate)".

## Verification (MANDATORY — R26 + adversarial, S215)

- **Reproducer:** author a minimal canonical-scrml `<endpoint>` (base it on
  `examples/33-endpoint.scrml`) with ONE multi-statement bare-body arm. It MUST parse +
  type clean (W2/W3 green) and fail ONLY at codegen. Confirm it currently emits
  `E-CODEGEN-INVALID-JS` on `spa/ss34` base, then your fix turns it into
  `E-ENDPOINT-MULTI-STATEMENT-ARM` at the arm span. Follow canonical decl form (V5-strict
  `<x> = …` at top-level; the arm body is a code-default body §4.18).
- **Regression / no-op proof:** compile `examples/33-endpoint.scrml` (all single-expression
  arms) and the endpoint conformance test
  (`compiler/tests/integration/endpoint-conformance-integration.test.js`) — the supported
  forms MUST stay byte-identical (no new diagnostic, no codegen drift).
- **Adversarial edges:** (a) a `:`-shorthand body that contains a `;` inside an object/array
  literal or string — MUST NOT false-positive (it's a single expression); (b) a single
  call expression spanning multiple lines — MUST NOT false-positive; (c) the self-closing
  204 arm and the empty-body arm — unaffected; (d) the wildcard `<_>` arm with a
  multi-statement body — MUST also fire the diagnostic (same envelope path, line ~2503).
- Add a regression test for the new diagnostic (mirror the existing E-ENDPOINT-* test
  shape; find it via `grep -rl E-ENDPOINT-NOT-EXHAUSTIVE compiler/tests`).
- Run the project test suite for the touched surface. Pre-commit hook runs the full suite —
  commit incrementally in your worktree (crash-recovery anchor).

## Commit discipline

- Work in your worktree on your branch. Commit incrementally (code + its coupled test in
  ONE commit — they're one logical unit). Never `--no-verify`.
- Report: list of changed files (absolute paths under YOUR worktree), the new diagnostic
  code name, the reproducer path, and the final SHA of your branch. The sPA file-deltas
  your work onto `spa/ss34` as a single sPA-authored commit.

## Path discipline (S99/S100/S176)

Write ONLY inside your allocated worktree. Before any Write/Edit, `stat` the target and
confirm it resolves under your worktree path, NOT the main checkout
(`/home/bryan-maclee/scrmlMaster/scrml/...`). Bash heredoc/perl writes bypass the
PreToolUse hook — self-check every path. Post-task, `git status` in your worktree must show
only your intended files; the main checkout must be untouched.
