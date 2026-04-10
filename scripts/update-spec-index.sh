#!/bin/bash
# Regenerates line numbers in SPEC-INDEX.md from SPEC.md headings.
# Usage: bash scripts/update-spec-index.sh
# Run from project root after editing compiler/SPEC.md.

SPEC="compiler/SPEC.md"
INDEX="compiler/SPEC-INDEX.md"

if [ ! -f "$SPEC" ]; then
  echo "Error: $SPEC not found. Run from project root."
  exit 1
fi

TOTAL=$(wc -l < "$SPEC")
echo "SPEC.md: $TOTAL lines"
echo ""
echo "## headings with line numbers:"
grep -n "^## " "$SPEC"
echo ""
echo "### headings with line numbers:"
grep -n "^### " "$SPEC"
echo ""
echo "Update $INDEX manually with the new line numbers above."
echo "The summaries in SPEC-INDEX.md are hand-maintained — only update line numbers."
