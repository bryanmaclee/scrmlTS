---
from: master
to: scrmlTS
date: 2026-05-07
subject: scrml.dev refresh, kickoff (scoping, no edits yet)
needs: fyi
status: unread
---

Heads-up. User authorized master PA to edit `scrmlTS/docs/` for a scrml.dev refresh. Per user instruction, I will send a hand-off message for every meaningful change so your session can validate, commit, and run any relevant checks. I will NOT commit, push, or run tests in scrmlTS. Edits land in your working tree; you own validation.

## Goals

1. Make scrml.dev the canonical home for articles. dev.to becomes the syndicated mirror.
2. Render the 14 dev.to-shaped articles in `docs/articles/*.md` to HTML at `https://scrml.dev/articles/<slug>/`.
3. Fill `canonical_url:` in each article's frontmatter with the scrml.dev URL. (User will update the live dev.to posts manually.)
4. Refresh the home page to be informational (current state of v0.1.0 + what's coming in v0.2.0). The 211-line `docs/website/v0.2.0-announce-2026-05-05.md` is folding INTO the home page rather than getting its own subpath.
5. Build approach: small Bun script (`docs/build.ts`) renders markdown to HTML against a shared template. No static site generator. When v0.2.0 ships, the site itself will be built with scrml; this is interim.

## Files I expect to add or touch in scrmlTS

- `docs/build.ts` (new) — Bun script: markdown to HTML.
- `docs/_template.html` (new) — shared per-article template.
- `docs/_styles.css` (new) — extracted from current `docs/index.html` `<style>` block.
- `docs/index.html` (modify) — link to `_styles.css`, fold in v0.2.0 announce content, replace the 3 dev.to article links with internal links + a "More articles" link to `/articles/`.
- `docs/articles/index.html` (new) — articles index page.
- `docs/articles/<slug>/index.html` (new, ~14 of these) — rendered articles.
- `docs/articles/*.md` (modify) — fill empty `canonical_url:` field with scrml.dev URL.
- `docs/README-website.md` (new, optional) — documents the build flow and how the site graduates to scrml-built when v0.2.0 ships.

## Out of scope this round

- Platform migration (Hostinger / Fly / Cloudflare Pages). User is evaluating; not part of this work.
- Full visual redesign. Same dark theme, just extracted into shared CSS.
- dev.to API backfill. User updates posts manually after we land local canonicals.
- New install/tutorial/spec subpages. Those wait until v0.2.0 ships.

## Workflow per change

I will send a message per logical commit-sized change. Each message:
- summarizes what changed and why
- lists the touched files
- flags anything you should validate (e.g. "build script must run cleanly under Bun X.Y", "no test suite implications expected")

You commit and push at your cadence. If you see anything you want me to revise, surface it back via your handOffs/incoming/ to master and I will adjust before the next change.

## Status

This message is `needs: fyi`. The next message (the first actual edit) will be `needs: action` to flag commit-readiness. No work is in flight as of this message.
