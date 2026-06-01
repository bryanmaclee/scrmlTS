# scrml.dev viewer — C1 self-demo (increment 1)

A credibility-first showcase: a scrml app that dissects another scrml app. The
viewer runs a REAL compiled flagship next to its REAL `.scrml` source, its REAL
compiled JS/HTML/CSS, and a REAL engine "what-comes-next" diagram — with
hover-provenance driven by the REAL compiler-emitted `.js.map`.

## Serve it

```
scrml dev docs/website-viewer/
```

This compiles ONLY `docs/website-viewer/*.scrml` (its own `<program>` root +
pages + components) and serves it with hot reload on its own port. The
precomputed flagship artifacts under `data/` are served as static files by the
same Bun.serve static fallback.

### Path coexistence guarantee

The viewer is a SEPARATE compile unit. The existing 97-page site
(`docs/website/app.scrml` + `docs/website/pages/`) is untouched and still works
exactly as before via `scrml dev docs/website/`. Full replacement of the site by
the viewer is a later increment.

## Regenerate the flagship artifacts

```
bash docs/website-viewer/scripts/build-artifacts.sh
# (or directly:)  bun docs/website-viewer/scripts/build-artifacts.mjs
```

This single-file-compiles `examples/14-mario-state-machine.scrml` with
`sourceMap` + engine-graph on, copies the verbatim source, and writes
`data/mario/manifest.json`. Single-file ON PURPOSE — it dodges the engine-graph
multi-file write-loop bug (only mis-writes when many inputs compile together).

## What's REAL vs faked

- REAL: the `.js.map` (the exact bytes the compiler emitted), the VLQ decode
  (validated byte-exact against a reference decoder), the line→span hover
  mapping, the engine-graph JSON, the live flagship (its own compiled artifact
  in an iframe).
- Faked (S148-permitted): the syntax-highlight COLORING (a cheap keyword
  classifier, not a real tokenizer). The MAPPING is real; only the colors are
  cosmetic.

## Provenance mechanism (line-granularity)

`lib/provenance.scrml` (pure scrml) parses the map: VLQ-decode `mappings` into
per-line segments, read `names` (author ids) + `x_scrml_kinds` (per-line
`source`/`synthetic`). It builds two indexes — forward (source line → JS lines)
and reverse (JS line → source line). `synthetic` generated lines have no author
origin and are excluded from highlighting by design (the "some lines dead" read
is intentional). Hover a source `@state` line → its JS spans light up; hover a
JS line → its source line lights up. JS tab only for inc1 (the `.js.map` covers
JS; HTML/CSS provenance is Phase 2).

## Layout

- `app.scrml` — viewer program root (theme, plain nav, `<main>` slot).
- `pages/index.scrml` — the showcase (`/`).
- `pages/dashboard.scrml` — the `/dashboard` embed STUB (live dashboard = inc2).
- `components/` — nav-skeleton, source-pane, output-tabs, engine-graph-pane,
  showcase-layout (helper fns + presentational components).
- `lib/provenance.scrml` — pure VLQ + index helpers.
- `data/mario/` — precomputed flagship artifacts.
- `scripts/build-artifacts.{sh,mjs}` — the reproducible precompute.

## DONE (inc1) vs DEFERRED (inc2)

DONE: viewer shell as a scrml app; real `.js.map` hover-provenance (line-gran);
engine what-comes-next box from the engine-graph JSON; one engine-heavy flagship
(mario) wired end-to-end; plain nav + dashboard stub; the precompute pipeline.

DEFERRED to inc2: live-pane↔source bidirectional hover (postMessage across the
iframe); HTML/CSS-tab provenance; column-precision highlights (offset-threading);
the live server-side dashboard embed; multi-file flagships (needs the
engine-graph write-loop fix); col-accurate span highlighting.
