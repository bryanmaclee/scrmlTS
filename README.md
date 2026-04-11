# scrmlTS

The working compiler for **scrml** — a single-file, full-stack reactive web language.
This is the TypeScript/JavaScript implementation that compiles `.scrml` source into
HTML, CSS, client JS, and server route handlers in a single pass.

scrml lets you write a complete app in one file: markup, reactive state, scoped CSS,
SQL, server functions, and inline tests — no build config, no separate server file,
no state management library.

## Quick start

```bash
# Install (Bun required)
bun install

# Compile a single file
bun compiler/src/cli.js compile examples/01-hello.scrml -o dist/

# Or use the CLI directly
bun run compiler/src/cli.js compile <file|dir>
bun run compiler/src/cli.js dev <file|dir>      # watch + serve
bun run compiler/src/cli.js build <dir>         # production build
bun run compiler/src/cli.js init <dir>          # scaffold a project

# Run the test suite
bun test compiler/tests/
```

## What's in here

- `compiler/` — compiler source, the authoritative `SPEC.md` / `SPEC-INDEX.md` / `PIPELINE.md`, 5,500+ tests, and reference self-host modules
- `examples/` — 14 runnable single-file scrml apps
- `samples/compilation-tests/` — 275 compilation tests covering every accepted construct
- `stdlib/` — 13 stdlib modules
- `benchmarks/` — runtime, build, and full-stack benchmarks vs React / Svelte / Vue
- `editors/vscode/`, `editors/neovim/` — editor integrations
- `lsp/server.js` — language server
- `dist/scrml-runtime.js` — shared reactive runtime

For a full inventory of what exists, what works, and what's open, see [`master-list.md`](./master-list.md).
For agent / contributor directives, see [`pa.md`](./pa.md).
