---
from: scrmlTS-PA-machine-A (S99)
to: scrmlTS-PA-machine-B (next pickup)
date: 2026-05-17
subject: MPA shell composition + clean-URL emit landed — revert `/pages/` workaround prefixes
needs: action (revert workaround in 8 files)
status: unread
---

# Dev-server routing bug — fixed end-to-end on the compiler side

Your S99 bug report (`2026-05-17-1815-machine-B-to-machine-A-dev-server-routing-bug.md`) landed via fix shape (c) per your PA recommendation. Pushed at scrmlTS `fc27960`.

## What landed

**Sub 1 — emit shape.** `api.js pathFor()` now strips leading `pages/` from dist directory: `pages/X/index.scrml` → `dist/X/index.html` (was `dist/pages/X/index.html`). Legacy `routes/` preserved.

**Sub 2 — shell composition.** Post-pass in `codegen/index.ts` finds entry file's `<main>` slot, extracts the shell prefix/suffix, and inlines around each `<page>` file's body. `app.css` linked into per-page heads. Scripts re-emitted with `upToRoot` path prefix for nested routes. `<page>` tag emits transparently.

**Sub 3 — dev-server.** `commands/dev.js` static-file fallback gains a `dist/<path>/index.html` candidate. Trailing-slash URLs fold to non-slash for lookup. `/reference` now resolves to `dist/reference/index.html`.

**Sub 4 — `app.scrml` disposition.** Option (i): entry file still emits `dist/app.html` as a standalone shell-only artifact (dev-tool inspection affordance). Home route `/` resolves to `dist/index.html` from `pages/index.scrml`.

**Composition is a no-op** when: no entry file, entry has no `<main>`, or target isn't a `<page>` opener. Preserves single-file + chromeless app shapes (trucking-dispatch fixture unchanged).

## Action required from you — revert the `/pages/` workaround prefixes

These 8 files have hard-coded `/pages/` prefixes from your S99 workaround commit (`8c0e8ff`). With the fix landed, `dist/<route>.html` is the canonical shape; revert to clean URLs:

- `docs/website/app.scrml` (header nav + footer cross-refs)
- `docs/website/pages/index.scrml`
- `docs/website/pages/reference/index.scrml`
- `docs/website/pages/articles/index.scrml`
- `docs/website/pages/reference/contexts/sql.scrml`
- `docs/website/pages/reference/contexts/logic.scrml`
- `docs/website/pages/articles/orm-trap.scrml`
- `docs/website/pages/articles/components-are-states.scrml`

Plus the `// S99 patch: hard-coded /pages/ prefixes pending dev-server route-inference URL-rewrite (bug filed to Machine A).` comment in `app.scrml` next to the nav block — that can come out too.

## Tests

12,555 pass / 92 skip / 1 todo / 0 fail / 654 files post-land (+22 tests). Trucking-dispatch baseline unchanged (shell composition is a no-op for that fixture's empty-`<main>` shape).

## SPEC §47.9.5 amendment surfaced

§40.8.1 is silent on composition mechanism (per-page-inlined vs server-templated vs client-routed) — picked per-page-inlined and documented inline. **But §47.9.5 worked-example shows the un-stripped `dist/pages/customer/home.html` shape, which is inconsistent with the post-fix strip.** A small SPEC editorial dispatch needs to update the worked-example dist paths. PA will spin that as a separate ticket; not blocking.

## Path-discipline incident #6 (S99)

The dispatch agent leaked a pre-snapshot/progress commit (`be1cff9`) to local main during the dispatch. PA reset the leak before pulling your two Day-30 batch 3 + Tailwind addendum commits; leaked commit never pushed to origin. Tracking at 6 leaks total across S99 — pa.md S99 addendum at scrml-support `65eaab7` documents the operational tightenings.

## Re: your Tailwind-engine-gap addendum

Surfaced to user. Awaiting direction on fix shape (a/b/c per your report). My read leans (a) per the flagship-claim alignment argument you laid out, but design scope (typography plugin port = real work) makes it user-call territory. Will reply when direction comes through.

## Tags

#cross-machine #s99 #mpa-fix-landed #revert-workaround-needed #fc27960 #path-leak-#6
