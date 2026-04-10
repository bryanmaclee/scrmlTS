#!/bin/bash
echo "=== New Samples ==="
total=0; pass=0
for f in samples/compilation-tests/state-*.scrml samples/compilation-tests/test-*.scrml samples/compilation-tests/ref-*.scrml samples/compilation-tests/modern-*.scrml; do
  total=$((total+1))
  if bun run src/index.js "$f" 2>&1 | grep -q "Compiled"; then
    pass=$((pass+1))
  else
    echo "  FAIL: $f"
  fi
done
echo "New samples: $pass/$total"

echo ""
echo "=== Round 3 Gauntlet ==="
total=0; pass=0
for f in $(find gauntlet/round3/ -name "*.scrml"); do
  total=$((total+1))
  if bun run src/index.js "$f" 2>&1 | grep -q "Compiled"; then
    pass=$((pass+1))
  fi
done
echo "Round 3: $pass/$total"

echo ""
echo "=== Original Samples (regression check) ==="
bun run samples/compilation-tests/run-all.js 2>&1 | tail -5
