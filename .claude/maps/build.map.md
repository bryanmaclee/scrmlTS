# build.map.md
# project: scrmlts
# updated: 2026-05-22T00:00:00Z  commit: 5d2003dd

## Development Commands (root package.json scripts)
compile        — `bun run compiler/src/cli.js compile` — compile scrml source
watch          — `bun --watch compiler/src/cli.js compile` — recompile on change
test           — `bun test compiler/tests/` — full test suite (pretest compiles samples first)
pretest        — `bash scripts/compile-test-samples.sh` — runs automatically before `test`
test:coverage  — `bun test compiler/tests/ --coverage`
bench          — `bun run compiler/src/cli.js compile samples/compilation-tests/ --timing`
security       — compile compilation-tests + `node --check` every emitted client JS
lsp            — `bun run lsp/server.js --stdio` — start the Language Server
docs:build     — `bun run docs/build.ts` — build docs site
e2e            — `playwright test --config=e2e/playwright.config.ts`
e2e:ui         — Playwright UI mode
e2e:docs       — `playwright test --config=e2e/playwright.docs.config.ts`
e2e:install    — `playwright install chromium firefox webkit`

## CLI Subcommands (compiler/src/cli.js)
scrml compile <file|dir> [options]   — compile scrml source
scrml dev <file|dir> [options]       — dev server with watch
scrml build <dir> [options]          — production build
scrml migrate <file|dir> [options]   — source migration tooling
scrml promote --match|--engine <…>   — if-chain → match / fn → engine promotion
scrml generate / init / serve        — scaffolding + static serving
Flags of note: --no-gather, --test, --emit-per-route, --chunk-size-budget=<bytes>,
--debug-perf, --timing, --parser=scrml-native (C2 — ROUTES the per-file TAB stage
through the native parser's `nativeParseFile`; emits I-PARSER-NATIVE-SHADOW; strictly
opt-in, default off).

## Build & Release
No bundler step — scrml is run directly under Bun. Generated dist artifacts:
compiler/dist/, compiler/native-parser/dist/, dist/, examples/dist/, samples/dist/.
Native-parser dist rebuilt via scripts/rebuild-bs-dist.ts / rebuild-tab-dist.ts /
rebuild-self-host-dist.ts. SPEC-INDEX regenerated via scripts/regen-spec-index.ts.

## CI/CD Pipeline
No hosted CI (`.github/workflows`, GitLab, Jenkins all absent). Quality gates are
local git hooks; install via `bash scripts/git-hooks/install.sh`.

### Pre-commit hook  [scripts/git-hooks/pre-commit]
Warns on direct commits to `main`. Runs `bun test compiler/tests/unit
compiler/tests/integration compiler/tests/conformance --bail` (browser tests
excluded). Non-zero test exit blocks the commit.
Note (memory S100): never bypass with `--no-verify` without explicit user authorization.

### Pre-push hook  [scripts/git-hooks/pre-push]
Runs the full test suite + gauntlet quick check. README gate (extract-readme-scrml.js)
runs ONLY when the push payload contains a release-tag ref (`refs/tags/v*`).

## Test Runner Config
bunfig.toml: [test] root="compiler/tests/", timeout=10000.

## Docker
No Dockerfile / docker-compose. Not containerized.

## Tags
#scrmlts #map #build #bun #git-hooks #cli

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [test.map.md](./test.map.md)
