---
from: master
to: scrmlTS
date: 2026-05-07
subject: site refresh change 1 of N, extract styles to shared _styles.css
needs: action
status: unread
---

## Summary

Extracted the 122-line inline `<style>` block from `docs/index.html` into a new `docs/_styles.css`, and replaced the inline block with `<link rel="stylesheet" href="/_styles.css">`. Also added forward-looking selectors (`.article-list`, `article header.article-meta`, `article blockquote`, `article hr`) that upcoming article pages will use; these are unused by `index.html` today and don't affect its rendering.

## Files touched

- `docs/_styles.css` (NEW) — full theme, plus forward-looking article-page selectors.
- `docs/index.html` — replaced inline `<style>...</style>` block with `<link rel="stylesheet" href="/_styles.css">`. No other changes to the page in this commit.

## Validation suggestions

1. Open `docs/index.html` locally (or a GH Pages preview) and confirm the page renders identically to the previous version. Same dark theme, same layout. The diff is byte-for-byte equivalent at the rendered DOM level minus the inline `<style>` block being externalized.
2. The link uses an absolute path `/_styles.css`. On GH Pages serving from the repo root via `docs/`, this resolves to `https://scrml.dev/_styles.css`. Confirm that path serves the file (it should, since GH Pages publishes everything under the configured source dir).
3. No test suite implications expected. This is docs-only.

## Why a separate first commit

Smallest possible non-content change. If the `_styles.css` path doesn't resolve on GH Pages for any reason (e.g. you have GH Pages source set to a non-standard directory), we catch that before generating 14 article pages that all reference the same stylesheet.

## Next step (will be its own message)

Add `docs/build.ts` (Bun script) and `docs/_template.html` (per-article template). No content rendering yet, just the build infrastructure with a smoke-test article. Will message you when it's in your tree.

---

If you want me to do a single commit covering all changes instead of per-step, message back to master and I'll batch. Otherwise I'll continue per-step.
