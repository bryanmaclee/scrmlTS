# config.map.md
# project: scrmlts
# updated: 2026-05-22T00:00:00Z  commit: 5d2003dd

## Environment Variables
No `.env.example` / `.env.template` in the repo. Env vars referenced in source:

SCRML_PORT — optional — dev/serve server port (read in commands/dev.js / serve.js)
PORT       — optional — fallback server port

No secrets, API keys, or credential keys are configured anywhere in source.

## Feature Flags (compiler options, not env)
Passed to `compileScrml(options)` in compiler/src/api.js — recognized keys:
parser              — "scrml-native" ROUTES the per-file TAB stage through the native
                      parser's `nativeParseFile` (C2, S119) + emits I-PARSER-NATIVE-SHADOW;
                      any other value (incl. null default) uses the live BS+TAB path
emitPerRoute        — default false — per-route artifact splitter (SPEC §40.9.7)
testMode            — default false — emit `<base>.test.js` from `~{}` blocks (SPEC §19.12.7)
emitMachineTests    — default false — emit `.machine.test.js` (SPEC §51.13)
debugPerf           — default false — `--debug-perf` PGO sub-stage instrumentation
sourceMap           — default false — emit Source Map v3 .map files
convertLegacyCss    — default false — pre-process `<style>` blocks to `#{…}`
embedRuntime        — default false — inline runtime instead of separate file
gather              — default true  — auto-gather transitive .scrml import closure (SPEC §21.7)
gatherLimit         — default 5000  — GATHER_LIMIT cap; E-IMPORT-007 above
mode                — "browser" | "library" (default "browser")
chunkSizeBudgetBytes — `--chunk-size-budget=<bytes>`; default 100000 (W-CG-CHUNK-LARGE)
compilerSettings.lintTailwindUnrecognizedClass — "warn" | "off" (default "warn")
selfHostModules     — null — optional self-hosted pipeline-stage overrides

## Config Files
### bunfig.toml
[test] root: string — "compiler/tests/"
[test] timeout: number — 10000 (ms)

### package.json (root)
type: "module" | private: true | workspaces: ["compiler"]
bin.scrml → compiler/bin/scrml.js | engines.bun: ">=1.3.13"

### compiler/package.json
private sub-package; deps acorn + astring; devDep @happy-dom/global-registrator

## CI / Deployment Config
No `.github/workflows`, `.gitlab-ci.yml`, `Jenkinsfile`, `Dockerfile`, or
`docker-compose.*`. CI surface is the local git-hooks set (see build.map.md).

## Tags
#scrmlts #map #config #compiler-options

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
