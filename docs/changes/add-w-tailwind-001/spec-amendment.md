# SPEC.md amendment — W-TAILWIND-001 (S49)

**Date:** 2026-04-29
**Code:** W-TAILWIND-001
**Spec issue:** SPEC-ISSUE-012 (Tailwind variant + arbitrary-value system)
**Severity:** Warning (non-fatal)

## Why this amendment

§26.3 of `compiler/SPEC.md` lists three Tailwind features as TBD under
SPEC-ISSUE-012:

  - Arbitrary values (e.g. `p-[1.5rem]`)
  - Responsive and variant prefixes (e.g. `md:`, `hover:`)
  - Custom theme configuration

Today when an adopter writes `class="md:p-4 hover:bg-blue-500"` or
`class="p-[1.5rem]"`, the compiler scans, fails to match (or accidentally
strips an unrecognised prefix), and silently emits no CSS. The class
attribute lands in the HTML but produces zero visual effect — silent
failure with no diagnostic.

This change introduces W-TAILWIND-001 to surface that gap as the cheap
"stop the silent bleeding" fix while the actual variant + arbitrary-value
implementation (SPEC-ISSUE-012, Option 3) is being scoped.

## Spec text changes

### Change 1: §26.3 (compiler/SPEC.md, around line 11639–11643)

**Before:**

```markdown
### 26.3 Open Items

- Arbitrary values (e.g., `p-[1.5rem]`) — TBD (SPEC-ISSUE-012)
- Responsive and variant prefixes (e.g., `md:`, `hover:`) — TBD (SPEC-ISSUE-012)
- Custom theme configuration — TBD (SPEC-ISSUE-012)
```

**After:**

```markdown
### 26.3 Open Items

- Arbitrary values (e.g., `p-[1.5rem]`) — TBD (SPEC-ISSUE-012)
- Responsive and variant prefixes (e.g., `md:`, `hover:`) — TBD (SPEC-ISSUE-012)
- Custom theme configuration — TBD (SPEC-ISSUE-012)

While these features are TBD, the compiler SHALL emit W-TAILWIND-001 when a
class string in source resembles their syntax (a class name in a `class="..."`
attribute that contains `:` or `[`) but does not match a registered utility.
The warning is non-fatal — compilation produces output regardless. `${...}`
interpolation regions inside the class attribute value are masked before
scanning so dynamic-class expressions like `class="${cond ? 'a' : 'b'}"` do
not produce false positives on the ternary's `:`.
```

### Change 2: §34 Error Codes table (compiler/SPEC.md, around line 12242)

Insert a new row at the appropriate alphabetical position (after the
existing W-* warning rows, before the §35 section break). The §34 table
is sorted roughly by code; place this row near other W-* entries — for
example, after the existing W-PURE-REDUNDANT row.

**New row:**

```markdown
| W-TAILWIND-001 | §26.3 | Class name in `class="..."` looks like Tailwind variant/arbitrary syntax (contains `:` or `[`) but does not match a registered utility. SPEC-ISSUE-012. | Warning |
```

### Change 3: SPEC-INDEX.md regeneration

After applying Changes 1 and 2 to compiler/SPEC.md, the §26 line range
in compiler/SPEC-INDEX.md may shift slightly (one extra paragraph added
to §26.3). Run:

```
bash scripts/update-spec-index.sh
```

and update the `compiler/SPEC-INDEX.md` row for §26 so its line range
matches the new SPEC.md state. The script prints the new heading line
numbers; copy them into SPEC-INDEX.md manually.

## Why the amendment is in a side file (not inline)

The pipeline agent for this change had only the `Read` and `Write` tools
available for file edits — no `Edit`. SPEC.md is 20,442 lines / ~941 KB.
Performing the inline edit by reading and rewriting the entire file would
have consumed a disproportionate share of the agent's context budget for
two cosmetic insertions. The implementation is fully wired and tested in
code; this side file documents the spec text change so it can be applied
in a follow-up trivial commit (no implementation work required).

## Verification done in this branch

- New W-TAILWIND-001 detector lives in `compiler/src/tailwind-classes.js`
  (function `findUnsupportedTailwindShapes`).
- Wired into the pre-BS lint loop in `compiler/src/api.js` alongside
  `lintGhostPatterns`. Diagnostics flow through `lintDiagnostics[]` and
  print via the existing `formatLintDiagnostic` plumbing in
  `compiler/src/commands/compile.js`.
- 38 new unit tests pass (`compiler/tests/unit/compiler-warnings-tailwind.test.js`).
- Full suite: 7992 pass / 40 skip / 0 fail (was 7954/40/0 pre-change).
  +38 tests, 0 regressions.
- Real-sample compile on `samples/compilation-tests/gauntlet-r10-svelte-dashboard.scrml`
  no longer false-positives on `class="${cond ? 'a' : 'b'}"` ternaries.
