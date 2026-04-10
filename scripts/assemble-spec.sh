#!/bin/bash
# Assemble SPEC.md from its two part files.
# Run this from the project root: bash scripts/assemble-spec.sh

set -e

PART1="SPEC.md.part1"
PART2="SPEC.md.part2"
OUTPUT="SPEC.md"

if [[ ! -f "$PART1" ]]; then
  echo "ERROR: $PART1 not found"
  exit 1
fi
if [[ ! -f "$PART2" ]]; then
  echo "ERROR: $PART2 not found"
  exit 1
fi

cat "$PART1" "$PART2" > "$OUTPUT"

echo "Written: $OUTPUT"
echo "Lines: $(wc -l < "$OUTPUT")"

# Clean up part files
rm "$PART1" "$PART2"
echo "Removed part files."
