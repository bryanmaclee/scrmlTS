# fix-bs-string-aware-brace-counter — Intake (Bug L)

**Surfaced:** 2026-04-25, by 6nz via inbox `2026-04-25-0155-6nz-to-scrmlTS-bug-l-bs-unbalanced-brace-in-string.md`.
**Status:** RECEIVED with sidecar; queued for triage.
**Sidecar:** `handOffs/incoming/read/2026-04-25-0155-bug-l-bs-unbalanced-brace-in-string.scrml`
**Priority:** medium — no urgency from 6nz (mechanical workaround), but the failure mode is misleading ("Unclosed program/logic" with no string-literal hint).

## Symptom

A single string literal containing an unmatched `{` or `}` desyncs BS's brace counter, which feeds `${...}` logic-block close detection. The parser then reports `E-CTX-003 Unclosed 'logic'` / `Unclosed 'program'` even though scrml-level braces are balanced.

```scrml
<program>
${
    @doc = ""
    function buildDoc() {
        const nl = String.fromCharCode(10)
        @doc =
            "function greet(name) {" + nl +
            "    return 'hello';"     + nl +
            "}"                       + nl
    }
}

<div>${@doc.length}</>
<button onclick=buildDoc()>build</>
</program>
```

Each string literal is itself well-formed; the JS function declaration is split across three strings. BS sees `{` in one string and `}` in another and miscounts.

Tested against `c51ad15`.

## Root cause (verified)

`compiler/src/block-splitter.js:647-669` (the explicit `// Brace-in-string detection for brace-delimited contexts (§4.6)` block). The current heuristic only matches the **exact 3-char patterns** `'{'`, `'}'`, `"{"`, `"}"` — a brace character surrounded by matching quotes. Anything longer is treated as raw braces.

The block's own comment acknowledges the gap:
> "Full string-state tracking is impractical at the BS level because the BS cannot reliably distinguish string delimiters from other uses of quote characters (regex patterns, template interpolation boundaries, apostrophes in comments, etc.)."
>
> "For longer strings containing braces (e.g., `"{ hello }"`), users should use `String.fromCharCode(123/125)` as a workaround."

So this is a **known design tension**, not a missed case. Bug L is the symptom of the workaround footprint being too large — once you split JS across multiple lines (canonical idiom for embedding sample doc text), the workaround surfaces immediately.

## Sibling bug

The earlier `\n` issue 6nz flagged in playground-two has the same root cause class: incomplete string-literal handling in BS preprocessing. Different fix sites, same family. Both should ideally be resolved by a single pass that gives BS a small but principled string-state tracker.

## Suggested fix scope (conditional — needs design decision first)

Three approaches:

**A. Conservative widen.** Keep the heuristic, just widen the surrounded-by-quotes pattern to "any run of non-quote chars between matching quotes on the same line, containing a single brace." Handles the cited multi-line case but still fails on regex literals (`/\{/`), template strings, and comments. Smallest patch.

**B. Real string tokenizer.** Add a small lexer state machine to BS that tracks `"..."`, `'...'`, line comments, block comments, and possibly template strings. Brace counting suppressed inside any of these. Closes Bug L AND the `\n` sibling. Larger patch; risk of subtly changing existing edge cases.

**C. Push string-awareness up to TAB and have BS count blocks more cheaply.** Bigger refactor; defer.

Recommend **B** as the right shape, but it deserves a quick mini-deep-dive: enumerate the "unreliable" cases the existing comment cites, decide which BS can actually handle (string + line comment + block comment are all well-defined; regex and template strings are the genuinely hard ones), and pick a scope.

## Reproducer

Sidecar in inbox archive: `handOffs/incoming/read/2026-04-25-0155-bug-l-bs-unbalanced-brace-in-string.scrml`. Self-contained, version-stamped against `c51ad15`. Expected vs actual documented in the sidecar's leading comment + closing HTML comment.

## Reference

- 6nz report: `handOffs/incoming/read/2026-04-25-0155-6nz-to-scrmlTS-bug-l-bs-unbalanced-brace-in-string.md`
- Sibling: earlier `\n` issue (no formal intake yet — 6nz playground-two inline note)
- Existing heuristic: `compiler/src/block-splitter.js:647-669`
- Spec ref: §4.6 (brace-delimited block bounds)

## Tags
#bug #block-splitter #string-literal #brace-counting #bug-l #6nz #sidecar-in-read
