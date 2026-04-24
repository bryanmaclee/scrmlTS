---
from: master
to: scrmlTS
date: 2026-04-22
subject: README — add giti to "Related projects" (+ adjacent: fix broken ../6NZ relative link)
needs: action
status: unread
---

# Ask: add giti to scrmlTS README's "Related projects" section

User raised this on 2026-04-22.

## Context

`scrmlTS/README.md` §"Related projects" (~line 398) currently lists **6nz only**. giti is missing. Since scrmlTS is publicly hosted under MIT, the README is an entry point for adopters looking at the broader scrml ecosystem, and giti is a first-class ecosystem repo.

## Current state of the section (line 398+)

```markdown
## Related projects

- **[6nz](../6NZ)** — a purpose-built code editor for the scrml ecosystem. An "Interactive Development Experience" written entirely in scrml, with a focus-centered viewport, NeoVim-superset keybindings plus mouse, CodeMirror 6 + canvas overlay, and offline-first PWA delivery. Currently in design phase, awaiting compiler API exposure in scrmlTS. The companion [Z-motion input spec](../6NZ/z-motion-spec) is released under CC0 so others can adopt it.
```

## Suggested addition — giti entry

Drop this in as a second bullet (either above or below 6nz; user preference — I'd suggest giti first since it's closer to compiler infrastructure, but either works):

```markdown
- **[giti](https://github.com/bryanmaclee/giti)** — a collaboration platform and git alternative designed around scrml's compiler strengths. The CLI (10 commands: save, switch, merge, undo, history, status, land, init, describe, sync) currently wraps jj (jujutsu) as the engine until the scrml compiler can do AST-level conflict resolution natively (giti spec §3.7). Ratified design emphasizes jj-style conflict-as-data, layered collaboration, and typed change review. Long-term vision is a hosted forge, not CLI-only; GitHub is the stopgap for now.
```

*Adjust wording to match README voice; the above matches the length and tone of the 6nz entry.*

## Adjacent issue to fix in the same edit — broken relative link

The existing 6nz entry uses `[6nz](../6NZ)` — a **relative sibling-directory link**. This resolves correctly when browsing the `scrmlMaster` workspace locally, but **breaks on github.com/bryanmaclee/scrmlTS** (the 6NZ repo is a separate GitHub repo, not a subdirectory). Same problem with the `[Z-motion input spec](../6NZ/z-motion-spec)` inner link.

Since scrmlTS is now public (MIT, 2026-04-17), these links point adopters at 404s.

**Suggested fix** for the 6nz entry (apply alongside the giti addition):

```markdown
- **[6nz](https://github.com/bryanmaclee/6NZ)** — a purpose-built code editor for the scrml ecosystem. An "Interactive Development Experience" written entirely in scrml, with a focus-centered viewport, NeoVim-superset keybindings plus mouse, CodeMirror 6 + canvas overlay, and offline-first PWA delivery. Currently in design phase, awaiting compiler API exposure in scrmlTS. The companion [Z-motion input spec](https://github.com/bryanmaclee/6NZ/tree/main/z-motion-spec) is released under CC0 so others can adopt it.
```

(Verify the z-motion-spec path exists at that URL before committing — I didn't verify the `tree/main/z-motion-spec` subpath, only that the repo URL resolves.)

## Scope note

scrml (the self-host compiler, `github.com/bryanmaclee/scrml`) is also a public sibling. Worth considering whether to add it here too, but it's earlier-stage than giti. User's ask was specifically "add a link to the giti repo" — leaving scrml out of this batch unless user says otherwise.

## Reply

Acknowledge back via `master/handOffs/incoming/` once the README is updated (and include the commit SHA so I can include scrmlTS in the next coordinated push).

— master PA
