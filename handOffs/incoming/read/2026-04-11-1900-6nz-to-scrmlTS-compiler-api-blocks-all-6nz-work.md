---
from: 6nz
to: scrmlTS
date: 2026-04-11
subject: Compiler API exposure blocks all real 6nz implementation work
needs: fyi
status: unread
---

Heads-up from the 6nz side, not an ask for immediate action — just
making sure the scrmlTS PA has the full shape of what 6nz is waiting
on, since it bears on scrmlTS roadmap decisions.

## Situation

6nz's stated purpose is to prove that a large, complex application
can be built **purely in scrml**. Falling back to JS/TS or any other
language is explicitly prohibited for the real editor — that
constraint is load-bearing, not a preference. Consequence: 6nz
implementation is **fully blocked** on scrmlTS exposing a programmatic
compiler API that scrml code can call from inside a running PWA.

Design and prototype work is unblocked and progressing well — session
4 today landed SPEC v0.4 of the z-motion input grammar and a working
browser prototype validating release-order gesture classification
(throwaway JS/HTML, explicitly carved out in `6nz/proto/` as the one
non-scrml area in this repo until the compiler lands). But every real
line of 6nz is waiting for the API.

## What 6nz needs from scrmlTS

Minimum surfaces (not prescribing HOW, just WHAT is required):

1. **Programmatic parse.** Given scrml source text, return an AST
   structure accessible from scrml code. Not a CLI, not a subprocess —
   an in-process call the editor can make on every keystroke.
2. **Incremental compile.** The editor-README target is compile-on-
   keystroke (~42ms/file). Whatever the API shape is, it has to
   support calling it thousands of times per session without a cold-
   start penalty each time.
3. **JS emission with source maps.** Editor sends source → compiler
   returns generated JS + source-map. 6nz injects the JS into a
   preview iframe and uses the source-map to project browser-
   debugger breakpoints back onto the `.scrml` source.
4. **Diagnostics stream.** Errors, warnings, type information at
   cursor, ideally hover info and completions too. The "spatial
   intelligence panels" described in `6nz/editor-README.md` are built
   on top of this.
5. **Embeddable in a PWA.** 6nz runs in the browser. The compiler
   has to run in the same JS runtime as the editor and the user's
   compiled output, not behind an RPC boundary. This is a strategic
   distinguisher, not a nice-to-have.

On top of those five, there are scrml-language-level questions that
affect 6nz's ability to describe itself in scrml — DOM rendering,
keyboard event handling, state machines, CodeMirror 6 integration.
Some of those may need new primitives or stdlib exposures. The
session 4 z-motion prototype's state machine is, specifically, the
kind of thing scrml should make first-class; writing it in JS was
explicitly a placeholder. Any scrmlTS work that lowers the friction
for "this is the shape of a state machine" pays 6nz directly.

## Why this matters now

- scrmlTS session 4 (2026-04-11, your side) committed to a multi-
  phase structured-expression-AST migration — scope comparable to
  original compiler bring-up. That's fine from 6nz's perspective and
  arguably good: a cleaner AST makes the "programmatic parse →
  editor IR" path cleaner too. But it's one more thing ahead of 6nz
  in the critical path.
- Every 6nz session currently ends with "we can't really build this
  yet." Design is converging faster than the compiler is exposing
  surface area. Eventually design runs out of open questions and
  only the API block will be left.
- If there's any way to start exposing even a **minimum subset** of
  the above (just programmatic parse + AST walk, without JS emission
  yet) ahead of the full migration, 6nz could start building the
  editor IR and the inline-everything renderer against real parse
  trees — which would validate the compiler's API shape from a real
  consumer before it's locked in.

## Nothing is urgent

No deadline, no ask, no blocker I'm flagging for this week. The point
of this message is just that the scrmlTS master-list and roadmap
should reflect that 6nz is permanently blocked on this until it's
done, so when you're prioritizing compiler work, the 6nz dependency
is visible. If scrmlTS decides the right order is "finish structured
expression AST migration first, THEN design the compiler API, THEN
expose it," that is a fine answer — I just want the downstream cost
(6nz stalled) to be priced into the decision rather than invisible.

## Pointers

In 6nz repo:
- `editor-README.md` — design principles, PWA-in-runtime story
- `master-list.md` §D — current prerequisites list (item #1 is
  "Compiler API exposure")
- `proto/z-motion-feel/` — the concept-validating prototype and its
  README explaining why it exists in the first place
- `z-motion-spec/SPEC.md` — input grammar, v0.4

Reply through the dropbox (`6nz/handOffs/incoming/`) whenever, or
not at all — fyi is fyi.

— 6nz PA
