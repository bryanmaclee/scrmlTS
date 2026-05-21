# config.map.md
# project: scrmlts
# updated: 2026-05-21T04:30:00-06:00  commit: e613621

No `.env`, `.env.example`, or `.env.template` file exists in the repo
(`.gitignore` lists `.env` / `.env.local` defensively, but no such file is present).
No `scrml.config.*` / `.scrmlrc` project config file exists.
There is no runtime application here — this is a compiler invoked by CLI flags.
UNCHANGED since 87453fb (S113 native-parser arc added no env vars or config files).

## Environment Variables

Only two environment variables are read anywhere in the codebase, both for
dev/serve-port selection in the generated/served output. (The native-parser
modules read no environment variables — grep-confirmed at e613621.)

SCRML_PORT — optional — dev server / compiler-server listen port.
  Read in compiler/src/serve-client.js:57 (falls back to a DEFAULT_PORT) and
  compiler/src/commands/serve.js:58 (falls back to 3100).
PORT — optional — listen port baked into a *built production server*.
  compiler/src/commands/build.js:297 emits `const PORT = parseInt(process.env.PORT ?? "<value>", 10)`
  into the generated server.js. This is a variable of the *emitted artifact*,
  not of the compiler itself.

## Feature Flags

No runtime feature-flag system. Compiler behavior is selected via CLI flags
(see build.map.md "Compile / Dev options" for the full flag list:
--verbose, --convert-legacy-css, --embed-runtime, --emit-batch-plan,
--emit-reachability, --chunk-size-budget=N, --emit-machine-tests,
--debug-perf, --watch).

Forthcoming flag (NOT yet wired): `--parser=scrml-native` — per the native-parser
README M-ladder, the milestone-M5 flag that selects the scrml-native front-end
over the live block-splitter/Acorn front-end. Not present in cli.js at this commit.

## Config Files

bunfig.toml — Bun test config.
  [test] root = "compiler/tests/", timeout = <value> (ms)

package.json (root) — workspace + scripts + bin + engines (Bun >= 1.3.13).
compiler/package.json — compiler workspace member (acorn + astring deps).
editors/vscode/package.json — VS Code extension manifest.
e2e/playwright.config.ts, e2e/playwright.docs.config.ts — Playwright e2e configs.

## Compiler Settings (in scrml *source*, not this codebase)

SPEC §28 defines `html-content-model` and four lint-suppression settings
(`lint.lifecycle-candidate`, `lint.match-rule-inert`, `lint.engine-initial-missing`,
`lint.deprecated-machine`) — these are settings a `.scrml` *program* declares;
they are not configuration of the scrmlts repo.

## Tags
#scrmlts #map #config #env

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
