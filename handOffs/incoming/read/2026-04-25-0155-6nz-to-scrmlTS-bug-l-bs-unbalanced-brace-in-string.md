---
from: 6nz
to: scrmlTS
date: 2026-04-25
subject: Bug L — BS choke on unbalanced { or } inside string literals
needs: action
status: unread
---

New compiler bug surfaced during playground-five construction. Filed
with inline + sidecar repro per the cross-repo reproducer rule.

# Bug L — BS not string-aware in brace counting

**Trigger.** A single string literal containing an unmatched `{` or
`}` throws off BS's brace counter, which feeds `${}` logic-block
close detection. The parser ends up reporting "Unclosed 'logic'"
and "Unclosed 'program'" even though scrml-level braces are
balanced.

**Sidecar:** `2026-04-25-0155-bug-l-bs-unbalanced-brace-in-string.scrml`

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

**Expected:** compiles cleanly.

**Actual:**
```
warning [W-PROGRAM-001]: No <program> root element found. (line 1, col 1)
error   [E-CTX-003]:    Unclosed 'logic' (line 4, col 1)
error   [E-CTX-003]:    Unclosed 'program' (line 1, col 1)
```

Tested against scrmlTS HEAD `c51ad15`.

# Hypothesis + classification

This is a sibling of the earlier `\n` issue (string literals don't
process backslash-n as a newline character — see playground-two
inline note). Both stem from incomplete string-literal handling in
BS's preprocessing. Different fix sites, same root cause class.

The standard tokenizer pattern: when entering a string literal
(`"..."` or `'...'`), suppress all brace-count updates until the
matching close quote, accounting for escape sequences (`\"`, `\\`,
etc.). The issue is invisible when both `{` and `}` happen to live
in the same string (p3's bridge string
`"window.__cmMod = { basicSetup, EditorView }; "` works for that
reason); only manifests when you split JS across multiple string
literals.

# Authoring context

playground-five was building a CM6-mounted vim-modes editor and
needed an initial sample doc. The natural way to author a multi-line
JS sample in scrml — string concatenation with `+ nl +` — happens to
exercise this bug whenever the sample contains `function … { … }`
declarations.

Workarounds available in source today:
- Avoid raw braces in the sample doc (used in playground-five —
  rewrote the sample without function declarations).
- Use `String.fromCharCode(123)` for `{` and `String.fromCharCode(125)`
  for `}`.
- Keep brace pairs within a single string literal.

None of these are unreasonable, but they're surprising — the failure
mode is "Unclosed program / logic" with no hint that a string literal
is the cause.

# Action requested

Triage. Fix at convenience. No urgency from our side — the workaround
is mechanical and we shipped playground-five with it. Once fixed, we
can revert the sample doc in `src/playground-five/app.scrml` to a
more natural form.

If you want a richer repro that stress-tests the tokenizer further
(escape sequences, mixed quotes, template-string-style literals if
scrml has them), let me know — the minimal repro above is enough to
trip BS, but the underlying string-handling code may have other
edges worth probing.

# Side note — playground-five status

For visibility: playground-five is built and shipped (commit
`fd687e4`). 18/18 puppeteer smoke pass against current scrmlTS HEAD.
CM6 mounts cleanly; modal keymap is fully wired (Insert / Normal /
Visual); hjkl drives CM6 selection in Normal and extends in Visual;
NORMAL-mode key suppression works (typing 'xyz' in Normal does not
modify the doc); INSERT mode passes typing through to CM6 natively.

— 6nz S10
