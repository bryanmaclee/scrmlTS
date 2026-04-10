#!/bin/bash
# Pull changed files from a completed worktree agent into the main tree.
# Usage: ./scripts/pull-worktree.sh <worktree-path-or-agent-id>
#
# Example: ./scripts/pull-worktree.sh .claude/worktrees/agent-abc123
#          ./scripts/pull-worktree.sh abc123

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <worktree-path-or-agent-id>"
  echo ""
  echo "Available worktrees:"
  ls .claude/worktrees/ 2>/dev/null || echo "  (none)"
  exit 1
fi

# Resolve the worktree path
WORKTREE="$1"
if [ ! -d "$WORKTREE" ]; then
  WORKTREE=".claude/worktrees/$1"
fi

if [ ! -d "$WORKTREE" ]; then
  echo "Error: Worktree not found at '$WORKTREE'" >&2
  exit 1
fi

echo "Worktree: $WORKTREE"
echo ""

# Show what changed vs the base of the worktree
echo "=== Changed files in worktree ==="
cd "$WORKTREE"
git diff --stat HEAD 2>/dev/null || git status --short
cd - > /dev/null

echo ""
echo "=== Files modified vs main tree ==="
diff -rq --exclude='.git' "$WORKTREE" . 2>/dev/null | grep "^Files" | head -40 || echo "(diff not available)"

echo ""
echo "Run 'cp <file> .' for each file you want to pull, then 'bun test' to verify."
