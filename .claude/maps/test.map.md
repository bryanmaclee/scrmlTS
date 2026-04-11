# test.map.md
# project: scrmlTS
# updated: 2026-04-10T22:00:00Z  commit: 482373c

## Test Framework

Runner: bun:test (built into Bun runtime)
Config: `bunfig.toml` — root: `compiler/tests/`, timeout: 10000ms
Run all: `bun test compiler/tests/`
Run single: `bun test compiler/tests/unit/<file>.test.js`
Coverage: `bun test compiler/tests/ --coverage`

## Test Categories

| Category | Path | Count | Focus |
|---|---|---|---|
| Unit | `compiler/tests/unit/` | 147 files | Per-module: block-splitter, AST builder, codegen emitters, individual features |
| Browser | `compiler/tests/browser/` | 11 files | happy-dom + Puppeteer: reactive arrays, bind, forms, components, TodoMVC |
| Integration | `compiler/tests/integration/` | 2 files | self-compilation + self-host smoke (compiler compiles itself) |
| Self-host | `compiler/tests/self-host/` | 4 files | Self-host stage verification: bs.scrml, tab.scrml, bpp.scrml, ast.scrml |
| Conformance | `compiler/tests/conformance/` | 2 dirs | block-grammar and tab grammar suites |
| Commands | `compiler/tests/commands/` | 2 files | CLI command tests: init, build-adapters |
| **Total** | | **~168 files** | **5,542 pass, 2 skip, 0 fail** |

## Assertion Style and Structure Pattern

Tests use `bun:test` native API: `describe`, `test`, `expect`. Tests import directly from
compiler source (no intermediate abstraction layer). Example from `block-splitter.test.js`:

```js
import { describe, test, expect } from "bun:test";
import { splitBlocks, BSError } from "../../src/block-splitter.js";

describe("block-splitter", () => {
  test("splits a simple block", () => {
    const result = splitBlocks("test.scrml", source);
    expect(result.blocks).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});
```

Error-path tests call the stage function and assert on the returned `errors[]` array (stages
collect rather than throw). Snapshot testing is not used.

## Fixtures & Mocks

No `__fixtures__/` or `mocks/` directories detected.
`compiler/tests/conformance/` dirs contain grammar conformance inputs.
`samples/compilation-tests/` (275 files) serve as integration fixtures for the bench/security scripts.

## Notable Test Files

| File | What it covers |
|---|---|
| `unit/block-splitter.test.js` | Full BS grammar — closers, machines, programs, new syntax |
| `unit/code-generator.test.js` | Top-level CG output for representative .scrml constructs |
| `unit/channel.test.js` | §35 WebSocket channel codegen |
| `unit/callback-props.test.js` | Callback prop codegen (2 tests currently skipped) |
| `browser/browser-todomvc.test.js` | Full TodoMVC app in headless browser |
| `integration/self-compilation.test.js` | Compiler compiles its own .scrml source |
| `self-host/bs.test.js` | Block-splitter self-host module correctness |

## Tags
#scrmlTS #map #test #bun #compiler #conformance

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
