# expr-ast-self-host-bs-bug-l-parity — Intake

**Surfaced:** 2026-04-25, by `fix-bs-string-aware-brace-counter` implementation.
**Status:** QUEUED — Bug L fix attempted S41 then **REVERTED** (commits `2a5f4a0`+`5c5cdba` reverted by `529f031`+`87b3c7d`). The string-state lexer landed but a follow-up pipeline agent stalled trying to handle regex literals containing braces. The honest scope of "fix Bug L" is string + regex + template + comment in one pass, not just strings. Re-attempt next session with the wider scope.
**Priority:** medium — Bug L itself isn't blocking any sibling repo (6nz explicitly said no urgency, has a workaround; giti doesn't track it).
**Blocked self-host tests after the failed attempt:** 8 listed below — these will fail again the moment the BS fix re-lands without the parity work; both must ship together.

## Symptom

After landing the BS string-state lexer (`fix-bs-string-aware-brace-counter`),
three self-host `.scrml` source files no longer parse via the corrected BS:

- `compiler/self-host/bs.scrml` — `Unclosed 'logic'` / `Unclosed 'program'`
  OR `Unexpected '}'` (depending on which trailing closer is hit first).
- `compiler/self-host/ast.scrml` — same family.
- `stdlib/compiler/meta-checker.scrml` — same family.

Affected tests:

- `tests/self-host/bs.test.js` (compile bs.scrml end-to-end)
- `tests/unit/self-host-meta-checker.test.js` (compile meta-checker.scrml)
- `tests/integration/self-compilation.test.js` —
  - `Bootstrap: bs.scrml — self-hosted output matches standard`
  - `Bootstrap: ast.scrml — self-hosted output matches standard`
  - `Bootstrap: meta-checker.scrml — self-hosted output matches standard`
  - `Bootstrap L3: bs.scrml — self-hosted API output matches standard API`
  - `Bootstrap L3: ast.scrml — self-hosted API output matches standard API`
  - `Bootstrap L3: meta-checker.scrml — self-hosted API output matches standard API`

## Root cause (verified)

These three .scrml source files contain string literals with unmatched
braces (e.g., `if (c == "{")`, `if (c == "}")`, `'<#identifier>'`). Under
the OLD broken BS, those in-string braces were COUNTED toward the brace
counter feeding `${...}` close detection. The files were authored against
that broken behavior — they have additional REAL braces (or strings) that
balance the in-string braces under the old counting.

Concretely (analysis from `fix-bs-string-aware-brace-counter`):

- `bs.scrml`: 21 `{` and 6 `}` inside double-quoted string literals.
  Under old BS those contributed +15 to depth; under new BS they
  contribute 0. Real braces don't balance under the new model.
- `ast.scrml`: similar pattern (count not tabulated yet).
- `meta-checker.scrml`: similar.

This is NOT a bug in the new BS — the new BS is correct. The bug is in
the .scrml twins, which were authored against the buggy old behavior.
Bug L's intake explicitly describes the old behavior as a "design
tension" and the workaround footprint being too large.

## Fix scope

Three options:

**A. Manual rebalance.** Walk each file, find which in-string braces
were being counted, and add or remove REAL braces (or comments
containing braces, or no-op statements) to balance. Tedious but local.

**B. Use `String.fromCharCode(123/125)` workaround.** Replace
`if (c == "{")` with `if (c.charCodeAt(0) == 123)` etc. Mechanical
search-and-replace, but changes file readability and may impact any
downstream tooling that reads the files literally.

**C. Use char escapes inside string literals.** No, scrml strings don't
have a "no-count-this-brace" escape.

**D. Add string-suppression sentinels in BS.** No — that defeats the
fix. Bug L's whole point is to honor in-string braces correctly.

Recommend **A** (manual rebalance) as the right fix. The files are not
huge (894 LOC for bs.scrml). Each fix is a small, mechanical edit.

## Reproducer

After landing `fix-bs-string-aware-brace-counter` (commit on
`changes/fix-bs-string-aware-brace-counter`), run:
```
bun compiler/src/index.js compiler/self-host/bs.scrml
bun compiler/src/index.js compiler/self-host/ast.scrml
bun compiler/src/index.js stdlib/compiler/meta-checker.scrml
```
Each fails with `E-CTX-003 Unclosed 'logic'` or `E-CTX-001 Unexpected '}'`.

## Reference

- Implementing change: `docs/changes/fix-bs-string-aware-brace-counter/`
- Bug L sidecar: `handOffs/incoming/read/2026-04-25-0155-bug-l-bs-unbalanced-brace-in-string.scrml`
- Affected source files:
  - `compiler/self-host/bs.scrml`
  - `compiler/self-host/ast.scrml`
  - `stdlib/compiler/meta-checker.scrml`

## Tags
#self-host #bs.scrml #ast.scrml #meta-checker.scrml #bug-l-followup #parity #block-splitter
