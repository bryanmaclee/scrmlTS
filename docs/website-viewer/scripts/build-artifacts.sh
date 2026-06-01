#!/usr/bin/env bash
# build-artifacts.sh — reproducible precompute of the C1 viewer's flagship
# artifacts. Thin wrapper over build-artifacts.mjs (the real work). Run from
# the repo root:
#
#   bash docs/website-viewer/scripts/build-artifacts.sh
#
# Produces, under docs/website-viewer/data/mario/:
#   14-mario-state-machine.client.js        — real compiled client JS
#   14-mario-state-machine.client.js.map    — real Source Map v3 (names + x_scrml_kinds)
#   14-mario-state-machine.html / .css      — real compiled output
#   mario.engine-graph.json                 — real --emit-engine-graph (single-file compile)
#   source.scrml.txt                        — verbatim source (map sourcesContent NOT embedded)
#   manifest.json                           — relative-path index the showcase reads
#
# NOTE: the CLI `scrml compile` has NO --sourceMap flag (sourceMap is a
# compileScrml() API option). build-artifacts.mjs drives the public API
# directly — the only new glue. Logged as a friction bug-candidate (add a
# `--sourceMap` / `--source-map` CLI flag wired to the existing API option).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../../.." && pwd)"
exec bun run "$HERE/build-artifacts.mjs"
