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
