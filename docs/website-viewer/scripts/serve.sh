#!/usr/bin/env bash
# serve.sh — serve the C1 viewer with its precomputed flagship artifacts.
#
#   bash docs/website-viewer/scripts/serve.sh [PORT]
#
# `scrml dev` serves the compiled OUTPUT dir (docs/website-viewer/dist). The
# flagship artifacts live in the SOURCE tree at docs/website-viewer/data/ (so
# they are committed + reproducible). The dev server has no public/ asset
# convention, so this script symlinks dist/data -> ../data after the first
# compile, making /data/mario/* resolve via the same Bun.serve static fallback.
# The symlink survives recompiles (the watcher rewrites .scrml outputs only).
#
# FRICTION NOTE (logged): `scrml dev` does not serve a sibling static-asset dir.
# A `--static <dir>` flag (or a `public/` convention) would remove this glue.
set -euo pipefail
PORT="${1:-8787}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIEWER="$(cd "$HERE/.." && pwd)"
REPO_ROOT="$(cd "$VIEWER/../.." && pwd)"

# Ensure artifacts exist.
if [ ! -f "$VIEWER/data/mario/manifest.json" ]; then
  echo "[serve] no artifacts — running build-artifacts.mjs first"
  bun run "$HERE/build-artifacts.mjs"
fi

# Pre-create dist + the data symlink so the very first request resolves.
mkdir -p "$VIEWER/dist"
ln -sfn ../data "$VIEWER/dist/data"

echo "[serve] scrml dev docs/website-viewer/  (port $PORT)  — /data/mario/* via dist/data symlink"
exec bun run "$REPO_ROOT/compiler/src/cli.js" dev "$VIEWER/" --port "$PORT"
