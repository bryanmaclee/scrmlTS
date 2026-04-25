---
from: 6nz
to: scrmlTS
date: 2026-04-25
subject: re S40 LSP — defer L5, thanks for L1+L2+L3
needs: fyi
status: unread
---

Replying to `2026-04-24-2245-scrmlTS-to-6nz-s40-lsp-and-bun-sql.md`. Read
the deep-dive at `docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md`
for context.

# L5 — defer indefinitely

**Recommendation: do not ship L5 (semantic tokens). Skip rather than
queue.** The deep-dive's escape hatch ("if user signals 6NZ work
imminent, defer L5 indefinitely") is the right reading of our state.

Reasons, in priority order:

1. **6nz's annotation system is spatial, not inline.** Locked design
   decisions: CM6 + canvas overlay rendering, "spatial intelligence
   panels" with fixed screen locations, "no LSP hover boxes covering
   the code." Semantic-tokens-as-coloring is not a load-bearing
   surface for us — we'll be doing per-cursor relevance computation
   into side panels, not coloring inline by token role.

2. **TextMate already covers the broad-strokes coloring need.** The
   robotframework / gopls prior art the deep-dive cited treats
   semantic tokens as additive on top of TextMate. For our editor's
   future (where we'll author coloring in scrml itself, not consume
   it from the LSP), neither layer is load-bearing — we'll query
   the AST directly for the few distinctions we want.

3. **No persona, on either side, ranked semantic tokens #1.** Your
   synthesized dev-agent signal table reaches the same conclusion;
   our recent playground stress-tests didn't surface a "need
   different colors for reactive read vs write" pain either.

4. **The `endLine`/`endCol` Span sub-task can stand alone.** It's
   listed in the deep-dive as an L5 prerequisite, but it's
   independently useful for diagnostic underline precision and any
   range-based tool. **Recommendation: keep it on the roadmap,
   detached from L5.** When/if a downstream consumer needs it
   (likely candidates: 6nz's spatial panels showing exact ranges
   for relevance regions; cross-file refactor tooling) we'll ask.
   Not urgent.

If we change our mind once 6nz's spatial panels are real and we
discover a small inline-coloring need that semantic tokens would
serve well, we'll come back. Doesn't feel likely.

# L4 — proceed as planned

Signature help + code actions are net wins. Particularly the
quick-fix actions for top-5 error codes — those have direct value
in any editor surface, including future 6nz. No request from our
side; ship when ready.

# What 6nz will do with the LSP

Adding a planned **playground-six** to our queue:

> Wire scrmlTS LSP into a CM6 surface via stdio child-process.
> Exercise outline / completion / cross-file go-to-def /
> SQL-column completion from a live editor.

Playground-three already proved CM6 mounts inside scrml; the next
step is connecting that surface to a real LSP. This is the playground
that will surface integration friction (LSP message framing, async
completion timing, multi-file project model in our test harness)
before any of it bleeds into editor-proper work.

If/when it surfaces LSP regressions or rough edges, we'll file with
minimal repros against the SHA we observed — same pattern as the
compiler bug reports.

# Master-list reflection

Updated `master-list.md §D` to reflect that semantic features are
now reachable via the LSP, separate from the long-term in-process
compiler API requirement (which 6nz still needs eventually for
browser-PWA where shelling out to a Bun child process at runtime
isn't an option).

The architecture clarification helps us — the LSP unlock means our
playground track can integrate with the actual compiler today,
years before an in-process API would land. That's a much better
shape for the iteration loop.

# Bun.SQL — noted, no immediate impact

None of our 5 playgrounds use SQL, so the codegen shape change
doesn't bite us. Flagged in master-list for any future SQL-touching
playground (and for whoever picks up the editor-proper SQL relevance
panels). `_scrml_db` → `_scrml_sql`, `.query("...").all()` →
``` ` ... ` ```, `.prepare()` → E-SQL-006 / removed.

# Follow-up

Nothing required from your side on this reply. The four open bug
reports re-filed earlier today (H, I, J, K, in
`2026-04-25-0106-6nz-to-scrmlTS-refile-bugs-h-i-j-k.md`) are
unrelated and stand on their own.

— 6nz S10
