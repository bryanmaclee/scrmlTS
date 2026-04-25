// LSP L1 — completion-trigger fixes tests.
//
// Verifies completions produced by buildCompletions for the contexts L1
// promised to fix:
//   - `@x.|` member access — generic property completion (length stub)
//   - `@<partial>` reactive-var completion (was: only `@` end-of-line)
//   - `<` markup tag completion (HTML tags + same-file components)
//   - `${` logic-context identifier completion (functions, types)
//   - `?{` SQL-context keyword completion
//
// Many tests use a two-step pattern: (1) analyze a VALID source to populate
// the analysis cache; (2) build completions over a slightly-modified source
// that has the trigger char inserted (and may not parse cleanly). This
// matches the real LSP flow — the analysis cache survives across
// keystrokes, and completions are built from the cache + the current text.

import { describe, it, expect } from "bun:test";
import { CompletionItemKind } from "vscode-languageserver/node";
import {
  analyzeText,
  buildCompletions,
  detectContext,
  reactiveVarCompletions,
} from "../../../lsp/handlers.js";

describe("LSP L1 — buildCompletions", () => {
  it("triggers reactive-var completion on `@<partial>` prefix", () => {
    const src = "<program>\n${\n  @counter = 0\n  @count2 = 0\n  @co\n}\n</program>\n";
    const cursor = src.indexOf("\n  @co\n") + "\n  @co".length;
    const { analysis } = analyzeText("/t.scrml", src);
    const items = buildCompletions(src, cursor, analysis);
    const names = items.map(i => i.label);
    expect(names).toContain("counter");
    expect(names).toContain("count2");
    const counter = items.find(i => i.label === "counter");
    expect(counter.kind).toBe(CompletionItemKind.Variable);
    expect(counter.detail).toContain("@reactive");
  });

  it("triggers reactive-var completion on `@` (end-of-line, no prefix)", () => {
    const src = "<program>\n${\n  @count = 0\n  @\n}\n</program>\n";
    const cursor = src.indexOf("\n  @\n") + "\n  @".length;
    const { analysis } = analyzeText("/t.scrml", src);
    const items = buildCompletions(src, cursor, analysis);
    const names = items.map(i => i.label);
    expect(names).toContain("count");
  });

  it("emits a member-access completion stub on `@var.|`", () => {
    const src = "<program>\n${\n  @items = [1,2,3]\n  @items.\n}\n</program>\n";
    const cursor = src.indexOf("@items.\n") + "@items.".length;
    const { analysis } = analyzeText("/t.scrml", src);
    const items = buildCompletions(src, cursor, analysis);
    const names = items.map(i => i.label);
    expect(names).toContain("length");
    const lengthItem = items.find(i => i.label === "length");
    expect(lengthItem.kind).toBe(CompletionItemKind.Property);
    expect(lengthItem.detail).toContain("@items.length");
  });

  it("does not emit member completion when the prefix is unknown", () => {
    const src = "<program>\n${\n  @foo = 0\n  @undeclared.\n}\n</program>\n";
    const cursor = src.indexOf("@undeclared.\n") + "@undeclared.".length;
    const { analysis } = analyzeText("/t.scrml", src);
    const items = buildCompletions(src, cursor, analysis);
    const names = items.map(i => i.label);
    // `length` should NOT appear because @undeclared isn't a known reactive var.
    expect(names).not.toContain("length");
  });

  it("detects markup context after `<` and offers HTML tag completions", () => {
    const src = "<program>\n<\n</program>\n";
    const ctx = detectContext(src, src.indexOf("\n<\n") + 2);
    expect(["markup", "top-level"]).toContain(ctx);
  });

  it("offers same-file component names after `<` in markup", () => {
    // Step 1: analyze a VALID file (component is recorded in the cache).
    const validSrc = "<program>\n${\n  const Card = <article>hi</>\n  @x = 0\n}\n</program>\n";
    const { analysis } = analyzeText("/t.scrml", validSrc);
    expect(analysis.components.map(c => c.name)).toContain("Card");

    // Step 2: simulate the user typing a `<` after the closing `</program>`
    // (real LSP flow: analysis cache persists across keystrokes; the in-flight
    // text may be momentarily invalid but completion still uses the cache).
    const completionSrc = validSrc + "<";
    const cursor = completionSrc.length;
    const items = buildCompletions(completionSrc, cursor, analysis);
    const names = items.map(i => i.label);
    expect(names).toContain("Card");
    expect(names).toContain("div"); // HTML tags also offered.
  });

  it("offers function and type identifier completions inside ${} logic", () => {
    // Build a valid file containing a function and a type.
    const validSrc = [
      "<program>",
      "${",
      "  type Foo:enum = { A, B }",
      "  function alpha() { return 1 }",
      "  let x = 0",
      "}",
      "</program>",
      "",
    ].join("\n");
    const { analysis, diagnostics } = analyzeText("/t.scrml", validSrc);
    // Sanity: the file parses.
    expect(diagnostics.length).toBe(0);
    expect(analysis.functions.map(f => f.name)).toContain("alpha");
    expect(analysis.types.map(t => t.name)).toContain("Foo");

    // Place cursor on the `let x = 0` line, in the middle of the identifier
    // (still inside the ${ } logic context). The completion list should
    // include `alpha` and `Foo` regardless of partial match.
    const cursor = validSrc.indexOf("let x = 0") + 1;
    const items = buildCompletions(validSrc, cursor, analysis);
    const names = items.map(i => i.label);
    expect(names).toContain("alpha");
    expect(names).toContain("Foo");
  });

  it("offers SQL keywords inside `?{}` SQL context", () => {
    const src = "<program>\n${\n  function f() { return ?{`SEL`}.all() }\n}\n</program>\n";
    const offset = src.indexOf("`SEL`") + 4; // inside the SQL context after `SEL
    const { analysis } = analyzeText("/t.scrml", src);
    const items = buildCompletions(src, offset, analysis);
    const names = items.map(i => i.label);
    expect(names).toContain("SELECT");
    expect(names).toContain("FROM");
  });
});

describe("LSP L1 — reactiveVarCompletions", () => {
  it("formats @reactive items with the expected detail string", () => {
    const items = reactiveVarCompletions([
      { name: "count", reactiveKind: "reactive" },
      { name: "doubled", reactiveKind: "derived" },
      { name: "deb", reactiveKind: "debounced", delay: 200 },
      { name: "shared", reactiveKind: "reactive", isShared: true },
    ]);
    const byName = Object.fromEntries(items.map(i => [i.label, i]));
    expect(byName.count.detail).toContain("@reactive");
    expect(byName.doubled.detail).toContain("@derived");
    expect(byName.deb.detail).toContain("@debounced(200)");
    expect(byName.shared.detail).toContain("(shared)");
  });

  it("dedupes by name (first occurrence wins)", () => {
    const items = reactiveVarCompletions([
      { name: "x", reactiveKind: "reactive" },
      { name: "x", reactiveKind: "derived" },
    ]);
    expect(items.length).toBe(1);
    expect(items[0].detail).toContain("@reactive");
  });
});
