---
from: master
to: scrmlTS
date: 2026-05-07
subject: site refresh change 2 of N, add Bun build script + templates (no rendered output yet)
needs: action
status: unread
---

## Summary

Added the build infrastructure for rendering `docs/articles/*-devto-*.md` to per-article HTML pages plus an articles index. No rendered output is committed in this change; running `bun run docs:build` is the next step (your call when to run it).

## Files touched

- `docs/build.ts` (NEW) — Bun script. Reads `docs/articles/*-devto-*.md`, parses frontmatter, renders markdown via `marked`, applies the templates, writes `docs/articles/<slug>/index.html` and `docs/articles/index.html`. Slug is derived from filename minus the `-devto-YYYY-MM-DD` suffix. Canonical URL emitted is always `https://scrml.dev/articles/<slug>/` regardless of the `canonical_url:` frontmatter field (which a later change will fill in to match).
- `docs/_template.html` (NEW) — per-article template with placeholders: `{{title}}`, `{{description}}`, `{{canonical}}`, `{{date}}`, `{{tag_line}}`, `{{content}}`. Includes Open Graph + Twitter Card metadata, SEO title/description, canonical link, dark theme via shared `_styles.css`. Top-of-page back-link to `/`, footer link to `/articles/`.
- `docs/_articles-index-template.html` (NEW) — listing template with `{{items}}` placeholder.
- `package.json` — added `marked` ^14.1.3 to `devDependencies` and a `docs:build` script.

## What's NOT in this change

- No rendered HTML output. `docs/articles/<slug>/` directories don't exist yet.
- No `canonical_url:` updates to article frontmatter. That's a separate change.
- `docs/index.html` is not yet linking to `/articles/`. That's a later change.

## Validation suggestions

1. `bun install` (picks up `marked`).
2. `bun run docs:build`. Expected console output: 12 `wrote articles/<slug>/index.html` lines plus `wrote articles/index.html (12 articles)`.
3. Inspect one rendered article (suggest `docs/articles/why-programming-for-the-browser-needs-a-different-kind-of-language/index.html`, the shortest at 84 source lines). Open in a browser. Confirm:
   - Title, description, date render correctly.
   - Code blocks have the dark-theme background.
   - Tables (some articles use them) render readably.
   - Canonical link in the `<head>` is `https://scrml.dev/articles/<slug>/`.
   - Back-link to `/` works locally if you serve from `docs/`.
4. Spot-check `docs/articles/index.html` for the listing layout (date-sorted descending, 12 entries).
5. No test suite implications. `bun test` should run clean (unchanged from prior state minus the package.json bump, which is additive).

## Filtering rule

The script picks up only files matching `*-devto-YYYY-MM-DD.md`. That excludes:
- `llm-kickstarter-v0/v1/v2.md` (internal LLM dispatch docs, not articles)
- `*-draft-*.md` (superseded by their `*-devto-*` counterparts)
- `teej_baiting_tweet.md`, `x-snippet-zod-calibration-*.md` (non-article snippets)

Result: 12 articles render. If you want to include or exclude any, let me know and I'll adjust the filter.

## Why marked, why not a custom renderer

The articles use tables, blockquotes, fenced code, inline code, lists, links, headers, and bold/italic. A custom renderer covering those reliably would be ~150 lines and have edge cases. `marked` is 50KB, GFM-compatible (which is what dev.to uses), and is the smallest reasonable dep that gets us to correct output. It's a devDependency only; the compiler proper does not pull it in.

## Next step (will be its own message)

Generate the rendered output (run `docs:build` and commit the produced HTML). I can either:
- (a) skip running the build myself and hand off `bun run docs:build` to you, or
- (b) run the build in the master-side working tree and commit the rendered HTML alongside.

Master PA does not run tools in scrmlTS by convention. Recommend (a). After the build runs cleanly on your side and you commit, I'll proceed to filling `canonical_url:` frontmatter and reworking `index.html` to fold in the v0.2.0 announce.

If anything in `build.ts`, the templates, or the package.json changes look wrong, message back to master and I'll revise before continuing.
