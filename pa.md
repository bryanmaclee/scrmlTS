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
- Always commit on feature branches, never directly to main
- Background agents use Sonnet, PA stays Opus

## Link + tag conventions

Same as scrml-support — markdown `[links]` + inline `#tags` + optional frontmatter. Grep-friendly, zero tooling required.

## What NOT to do

- Do not import stale or historical docs into this repo — they go to scrml-support
- Do not edit scrml8 (frozen)
- Do not commit to main directly
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

### What this PA reads from scrml-support (absolute paths)
- `/home/bryan-maclee/scrmlMaster/scrml-support/user-voice.md` — verbatim user log (read + append only; never truncate)
- `/home/bryan-maclee/scrmlMaster/scrml-support/.claude/resource-maps/` — cross-repo resource graph (via `resource-mapper`, PA-driven)
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/` — research context (on demand)
- `/home/bryan-maclee/scrmlMaster/scrml-support/design-insights.md` — debate outcomes (on demand)

### What this PA also writes (in scrml-support, the storage repo)
- `scrml-support/user-voice.md` — append-only verbatim log
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
3. Read the last ~10 entries from `/home/bryan-maclee/scrmlMaster/scrml-support/user-voice.md`
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

### Writing to user-voice.md
- Append-only, verbatim
- Absolute path: `/home/bryan-maclee/scrmlMaster/scrml-support/user-voice.md`
- Never summarize, never paraphrase, never truncate
- Session header: `## Session N — YYYY-MM-DD` (N is this repo's session count)

### What NOT to do
- Do not edit files in sibling project repos (scrml-support, giti, 6nz — user opens a different Claude instance). The single exception is dropping message files into `<sibling>/handOffs/incoming/` — see Cross-repo messaging below.
- Do not modify scrml8 (frozen)
- Do not commit to main directly
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
- giti:          `/home/bryan/scrmlMaster/giti/handOffs/incoming/`
- 6nz:           `/home/bryan/scrmlMaster/6NZ/handOffs/incoming/`

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

### Scope of the exception
- **Allowed:** creating new `.md` files inside `<sibling>/handOffs/incoming/`
- **NOT allowed:** reading, editing, or deleting anything else in a sibling repo. Messages are a one-way write; the sibling's PA reads them in its own session.
