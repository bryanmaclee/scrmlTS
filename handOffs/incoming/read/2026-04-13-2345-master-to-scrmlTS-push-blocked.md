---
from: master
to: scrmlTS
date: 2026-04-13
subject: push blocked — dirty files in scrmlTS and scrml-support
needs: action
status: unread
---

4 push requests pending (S10, S11, S12, S13). Cannot push until both repos are clean.

## scrmlTS — 2 modified files + 1 untracked

Modified (unstaged):
- `docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.json`
- `docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.md`

Untracked:
- `.claude/agents/` (staged debate-curator + debate-judge for S13)

Commit or discard these before next push request.

## scrml-support — 1 modified file

Modified (unstaged):
- `user-voice.md`

This also needs a commit before push.

## Once clean

Master will push scrmlTS, scrml-support, and scrml (1 unpushed commit) together.
