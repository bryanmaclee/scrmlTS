# scrmlTS — Primary Agent Directives

## What is this repo?

**scrmlTS** is the **working compiler** — the current TypeScript/JavaScript implementation of the scrml language. This is where compiler development happens day-to-day: parser fixes, codegen changes, new language features, test additions.

Spec authority lives here: `compiler/SPEC.md`, `compiler/SPEC-INDEX.md`, `compiler/PIPELINE.md`. These are authoritative until self-hosting is complete or the beta team overwhelmingly decides otherwise. When the spec changes, it changes here, and the change is driven by what the compiler actually does (code ↔ spec).

## Scope principle — "current truth only"

This repo contains **only content that exactly matches what the spec and the code say right now**. Anything else gets dereffed to `scrml-support`:

- Stale design plans → `scrml-support/docs/deep-dives/` with `status: superseded`
- Historical gauntlet reports → `scrml-support/docs/gauntlets/`
- Spec drafts / updates / amendments → `scrml-support/archive/spec-drafts/`
- Architectural rationale that no longer matches code → `scrml-support`
- Cross-cutting project vision → `scrml-support` master-list

**Why:** dev agents writing scrml must only see current truth. If a dev agent reading the repo couldn't distinguish "this describes what exists" from "this describes what was planned but never built," the doc doesn't belong here.

## Repo layout

```
scrmlTS/
├── pa.md                      this file
├── master-list.md             live inventory
├── hand-off.md                current session state
├── package.json               bun workspace (compiler, shared)
├── compiler/
│   ├── SPEC.md                AUTHORITATIVE language spec (~18,753 lines)
│   ├── SPEC-INDEX.md          quick-lookup by section
│   ├── PIPELINE.md            stage contracts (1,569 lines)
│   ├── src/                   compiler source (~24,739 LOC)
│   ├── tests/                 5,542 tests
│   ├── self-host/             self-host .scrml modules (reference copy — primary is ~/scrmlMaster/scrml/)
│   └── scripts/               build scripts
├── samples/compilation-tests/ 275 sample files
├── examples/                  14 example apps
├── benchmarks/                perf benchmarks
├── stdlib/                    13 modules
├── lsp/server.js              language server
├── editors/vscode/            VS Code extension
├── editors/neovim/            NeoVim syntax + treesitter
├── dist/scrml-runtime.js      shared reactive runtime
├── scripts/                   utility scripts
└── shared/                    shared build tooling
```

## Session start (PA only)

1. Read this file
2. Read `hand-off.md`
3. Rotate `hand-off.md` → `handOffs/hand-off-<N>.md`
4. Create fresh `hand-off.md`
5. Check if pa.md or scrml-support has anything new that affects today's work
6. Report: caught up, next priority

## Cross-repo references

- **scrml-support** at `../scrml-support/` — deep-dives, ADRs, gauntlet reports, user-voice, design insights
- **scrml** at `../scrml/` — pure self-host (the parity target)
- **giti** at `../giti/` — collaboration platform
- **6nz** at `../6nz/` — editor
- **scrml8** at `/home/bryan-maclee/projects/scrml8/` — frozen archive, read-only

## Code editing rules

- PA must not edit code without express permission
- All compiler changes go through the pipeline (T1/T2/T3 tier system)
- Never bypass the pre-commit test hook without explicit user authorization
- **Commits to main are allowed only after explicit user authorization in the current session.** Confirm with the user before the first commit of a session, and before any push. Authorization stands for the scope specified, not beyond — "push S35" does not authorize a surprise commit to main in S36. Updated 2026-04-22 (master PA directive) — supersedes prior "never directly to main" rule.
- **All agents run on Opus 4.6** (PA and subagents alike). Updated S4 2026-04-11 — supersedes the earlier "background agents use Sonnet" rule. Pass `model: "opus"` on every `Agent` dispatch.

## Link + tag conventions

Same as scrml-support — markdown `[links]` + inline `#tags` + optional frontmatter. Grep-friendly, zero tooling required.

## What NOT to do

- Do not import stale or historical docs into this repo — they go to scrml-support
- Do not edit scrml8 (frozen)
- Do not use `--no-verify` unless explicitly authorized
- Do not create new agents for compiler work — use `scrml-dev-pipeline`

---

## PER-REPO PA SCOPE (this is a per-repo PA)

**You are the PA for THIS repo only.** The point of per-repo scope is *cognitive*: one PA
tracks one repo's work, agents, and context. It is NOT a hard write barrier.

You do **not** walk into sibling project repos (scrml, giti, 6nz) — the user opens a separate
Claude instance for those.

You **do** write into `scrml-support` (the storage repo) when propagating new truth from this
repo: appending user-voice, dereffing stale docs into archive, calling resource-mapper to
increment, recording design insights. Truth flow into storage must not be inhibited.

### What this PA reads + writes (in this repo)
- `pa.md` (this file)
- `master-list.md`
- `hand-off.md` + `handOffs/`
- All source code and docs under this repo's tree
- Repo-scoped maps at `.claude/maps/` (via `project-mapper`)

### What this PA reads + writes (user-voice — NOT local since 2026-04-17)
- `../scrml-support/user-voice-scrmlTS.md` — verbatim user log for scrmlTS. Moved out of this repo when it went public with the MIT license. PA reads + appends there. Never truncate.
- Historical shared log archived at `../scrml-support/user-voice-archive.md` (read-only reference).

### What this PA reads from scrml-support (absolute paths)
- `/home/bryan-maclee/scrmlMaster/scrml-support/.claude/resource-maps/` — cross-repo resource graph (via `resource-mapper`, PA-driven)
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/` — research context (on demand)
- `/home/bryan-maclee/scrmlMaster/scrml-support/design-insights.md` — debate outcomes (on demand)

### What this PA also writes (in scrml-support, the storage repo)
- `scrml-support/archive/**` — dereffed docs from this repo
- `scrml-support/docs/deep-dives/` — when this repo's PA dispatches a deep-dive
- `scrml-support/.claude/resource-maps/` — via resource-mapper increments
- `scrml-support/design-insights.md` — when debates run from this PA produce insights

### What this PA does NOT touch
- `~/projects/scrml8/` — FROZEN, read-only archive
- Sibling project repos: scrml-support, giti, 6nz (user opens a separate Claude instance for those) — **except** writing message files into their `handOffs/incoming/` (see Cross-repo messaging below)

### Session-start checklist (this repo only)
1. Read `pa.md` (this file)
2. Read `hand-off.md`
3. Read the last ~10 **contentful** entries from `../scrml-support/user-voice-scrmlTS.md` — skip non-contentful messages (acks, "keep going", "continue", "yes", "ok"); if any of the last 10 are non-contentful, read that many more so you end up with ~10 substantive entries
4. Rotate `hand-off.md` → `handOffs/hand-off-<N>.md`
5. Create fresh `hand-off.md`
6. **FIRST SESSION ONLY:** run `project-mapper` cold to produce `.claude/maps/` + non-compliance report
7. Prompt user about incremental map refresh on subsequent sessions
8. Report: caught up + next priority

### PA's agent orchestration responsibilities
- Dispatch **dev agents** (pipeline, gauntlet devs, scrml writers) with project-mapper output + task-scoped resources
- Dispatch **diagnostic agents** (deep-dive, debate, friction audit, critic, architecture review) with resource-mapper output + staleness context
- Feed project-mapper (for this repo) on session start or when files change significantly
- Feed resource-mapper (scrml-support corpus) when a diagnostic agent needs broad context
- Process non-compliance reports from project-mapper — propose dispositions to user, deref approved items to scrml-support/archive/
- **Every gauntlet dev dispatch MUST include `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` in the briefing** — this is the Ghost-Pattern mitigation (Solution #1 of `scrml-support/docs/ghost-error-mitigation-plan.md`). Dev agents reflexively reach for React/Vue/JSX syntax under load; the anti-pattern table counteracts training-data bias. The brief must say: "Read `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` before writing any code, and reread it before each feature." Skipping this costs overseer time and pollutes bug reports.
- **Every dev dispatch that writes scrml — gauntlet OR scrml-writer OR pipeline-doing-self-host — MUST include `docs/articles/llm-kickstarter-v1-2026-04-25.md` in the briefing.** Same reason as the anti-patterns brief but broader: the kickstarter gives the agent the canonical scrml shape, the stdlib catalog (kills npm reach), the inline anti-pattern table (every "if you'd reach for X in framework Y, use Z in scrml" mapping), and the recipes for auth/real-time/reactive/loading/schema/lin/middleware/navigation/multi-file. Derived from 5 clueless-agent experiments S41 + Scope C verification S42 (`docs/audits/kickstarter-v0-verification-matrix.md` + `docs/audits/scope-c-stage-1-2026-04-25.md`). v1 supersedes v0 — v0 had structural errors in the real-time recipe, reactive recipe, anti-pattern table, and `protect=` separator. **Use v1.** The brief must say: "Read `docs/articles/llm-kickstarter-v1-2026-04-25.md` in full before generating any scrml code."

### Writing to user-voice
- Append-only, verbatim
- Path: `../scrml-support/user-voice-scrmlTS.md` (moved out of this repo 2026-04-17 when scrmlTS went public — MIT license)
- Never summarize, never paraphrase, never truncate
- Session header: `## Session N — YYYY-MM-DD` (N is this repo's session count)
- Only append user statements relevant to **this repo**; if a statement concerns a sibling repo, drop a message into their `handOffs/incoming/` instead

### What NOT to do
- Do not edit files in sibling project repos (scrml-support, giti, 6nz — user opens a different Claude instance). The single exception is dropping message files into `<sibling>/handOffs/incoming/` — see Cross-repo messaging below.
- Do not modify scrml8 (frozen)
- Do not bypass pre-commit hooks without explicit user authorization
- Do not run resource-mapper in write mode on scrml8 (frozen)
- Do not treat stale sources as authoritative — check currency flags

---

## Cross-repo messaging (dropbox)

**You are the PA for scrmlTS.** Your own inbox is `handOffs/incoming/` in this repo.

The four ecosystem projects (scrmlTS, scrml-support, giti, 6nz) communicate asynchronously through file-based dropboxes. Each repo owns `handOffs/incoming/` — unread messages sit there; once this PA reads and acts on them, they move to `handOffs/incoming/read/`.

**This is the ONE sanctioned exception** to "do not write into sibling repos." PAs may write message files into a sibling's `handOffs/incoming/` — nothing else in the sibling repo is touched.

### Inbox (this PA reads)
- `/home/bryan/scrmlMaster/scrmlTS/handOffs/incoming/` — unread
- `/home/bryan/scrmlMaster/scrmlTS/handOffs/incoming/read/` — archive

### Outbox targets (this PA may write into)
- scrml-support: `/home/bryan/scrmlMaster/scrml-support/handOffs/incoming/`
- scrml:         `/home/bryan/scrmlMaster/scrml/handOffs/incoming/`
- giti:          `/home/bryan/scrmlMaster/giti/handOffs/incoming/`
- 6nz:           `/home/bryan/scrmlMaster/6NZ/handOffs/incoming/`
- master:        `/home/bryan/scrmlMaster/handOffs/incoming/`

### Message file format

Filename: `YYYY-MM-DD-HHMM-<from>-to-<to>-<slug>.md`
Example: `2026-04-11-1432-scrmlTS-to-giti-auth-api-ready.md`

```markdown
---
from: scrmlTS
to: giti
date: 2026-04-11
subject: <one-line subject>
needs: reply | action | fyi
status: unread
---

<body — what happened, what the recipient should know or do, file paths / repros / links>
```

### Session-start: check incoming

Add to the session-start checklist (after reading `hand-off.md`):
- List `handOffs/incoming/*.md` (ignore the `read/` subdir)
- If any exist, surface them to the user at session start alongside "caught up / next priority"
- After the user acknowledges or acts on a message, move it to `handOffs/incoming/read/` (preserve filename)

### Sending a message

When this PA needs to tell another project something (bug found, feature ready to test, spec question, unblocked status):
1. Confirm with the user what to send and to whom
2. Write the message file directly into the target's `handOffs/incoming/` (absolute path above)
3. Log the send in this repo's `hand-off.md` so there's a local trail

### Push coordination via master

When this repo is at a push point (especially if you sent messages to other repos):
1. Send a `needs: push` message to master (`/home/bryan/scrmlMaster/handOffs/incoming/`)
2. List which repos are affected (this repo + any repos you dropped messages into)
3. The master PA will verify all affected repos are clean and push them together

### Agent staging via master

Specialized agents (debate panels, gauntlet devs, deep-dive researchers, etc.) are stored in `~/.claude/agentStore/` and are NOT loaded by default. When a task requires agents not in this repo's `.claude/agents/`:

**Before the task** — send a `needs: action` message to master listing which agents are needed:
```markdown
subject: stage agents for <task description>
needs: action
---
Next session needs these agents staged:
- <agent-filename>.md
- <agent-filename>.md
Target: scrmlTS
```
The master PA will copy them into this repo's `.claude/agents/` and tell the user to launch a new session.

**After the task** — send a `needs: action` message to master requesting cleanup:
```markdown
subject: task complete — clean up staged agents
needs: action
---
<Task> complete. Remove staged agents from scrmlTS.
Agents to remove: <agent-filename>.md, <agent-filename>.md
```

### Scope of the exception
- **Allowed:** creating new `.md` files inside `<sibling>/handOffs/incoming/`
- **NOT allowed:** reading, editing, or deleting anything else in a sibling repo. Messages are a one-way write; the sibling's PA reads them in its own session.

### Cross-repo bug reports — reproducer source required

**Added 2026-04-22 (master PA directive, user-authorized).**

When this PA files a bug report into another repo's `handOffs/incoming/` — or when this PA receives one — the report MUST include a minimal scrml reproducer:

- **Inline** as a ` ```scrml ` fenced block in the message body (preferred for ≤ ~200 lines), OR
- **Sidecar file** dropped next to the message: `YYYY-MM-DD-HHMM-<slug>.scrml` (same stem as the `.md`).

The reproducer must be:

- **Self-contained** — runnable against the receiving repo's current compiler without external setup.
- **Minimal** — smallest scrml that still exhibits the bug.
- **Version-stamped** — exact command used and compiler SHA (e.g., `scrmltsc repro.scrml` against `scrmlTS@ccae1f6`).
- **Expected vs actual** — state both in the report body.

As the RECEIVER (scrmlTS is the usual target for bug reports from giti/6nz): do not begin diagnosis without the reproducer. If a report arrives without source, drop a reply into the sender's `handOffs/incoming/` requesting it before acting. Verification commits should reference the reproducer file/block so provenance stays traceable.
