# mpa-entity-decoding-fix — S100 dispatch progress

## 2026-05-17 — start

Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a45680c02a7ffb9a5
Base SHA: a91699de52033ebba53c67146fdff58706e14c68

## Bug diagnosis (root cause located)

Initial hypothesis (from brief): HTML entity decoding in emit-html.ts.

ACTUAL ROOT CAUSE: regex-replacement-string `$&` injection bug at
compiler/src/codegen/index.ts:1211-1215.

The `String.prototype.replace(regex, replacementString)` call interprets
`$&` in the replacement string as "the matched substring." When the source
markup contains literal `$&` characters (e.g. `<code>$&#123;expr&#125;</code>`
used to render literal `${expr}` text in `<code>` blocks), the composed
body string substitutes each `$&` for the matched `<body>...</body>` chunk,
which itself contains the shell — producing 3+ recursive `<body>` blocks.

Source page docs/website/pages/reference/contexts/sql.scrml has 2 literal
`$&` sequences (lines 47 + 103 — `$&#123;expr&#125;` / `$&#123;name&#125;`).
The dist sql.html had 3 `<body>` blocks: 1 original + 2 from `$&` expansion.

Why earlier pages worked: their source content didn't include literal
`$&` sequences. Pages that demonstrate JS interpolation syntax for docs
purposes inevitably need `$&#123;...&#125;` to render `${expr}` as literal
text — these are the affected pages.

## Fix

compiler/src/codegen/index.ts:1211-1215 — use function form of `.replace()`
so the replacement string is treated as a literal (`$&` not interpreted).
Apply same fix to the CSS-link `</head>` replace at line 1227-1230 (same
class of bug — defensive).

## Anomalies surfaced

- Brief's hypothesis (entity decoding) was INCORRECT. Actual mechanism is
  `$&` backreference injection. Entities are NOT being decoded; they are
  being mangled by the regex-replacement-string special-meaning bug.
- Defense should still consider the LAST-body extraction (Fix B) since
  legitimate prose discussing `<body>` without escapes would still defeat
  the non-greedy regex match. Plan: keep the function-form replace primary
  fix; consider Fix B only if smoke tests still surface issues.

## Fix verification

- pre-commit gate: 12624 pass / 0 fail / 88 skip / 1 todo (baseline ~12624 — no regressions)
- docs rebuild: all dist HTMLs now have exactly 1 `<body>` block (verified via find sweep)
- entity escapes preserved verbatim in dist (e.g. `$&#123;expr&#125;` in sql.html)
- e2e:docs --project=chromium:
  - PRE-FIX (per brief): 4 failures (3 smoke + 1 link-integrity)
  - POST-FIX: 2 failures (both OUT OF SCOPE — bug #2 + bug #3)
    - `/reference/elements/errors` smoke fails on `Cannot read properties of undefined (reading 'isValid')` — that's bug #2 (`disabled=${!@signup.isValid}` parsed as live scrml; docs-authoring friction)
    - link-integrity fails on 5 broken-link writes — bug #3
  - All 28 in-scope tests PASS, including `/reference/contexts/sql`, `/articles/why-programming-for-the-browser`, `/articles/orm-trap` canary

## Deferred items (acknowledged out-of-scope per brief)

- bug #2: docs-authoring `${...}` parsed as live scrml inside `<code>` blocks
- bug #3: 5 broken-link writes (/learn, /about, /about/changelog, /about/philosophy, /reference/errors/I-MATCH-PROMOTABLE)
- defensive sweep: search compiler/src/ for other `String.replace(regex, stringWithUntrustedContent)` sites — same bug class. Not in dispatch scope.

## Fix B status

Applied both Fix A (function-form / literal-substring replace) AND Fix B
(slice+concat using first `<body>` + last `</body>`) as defense-in-depth.
The slice/concat approach is simultaneously:
  - the literal substring fix (no `$&` interpretation since no string-replace),
  - the last-`</body>` extraction (Fix B).

