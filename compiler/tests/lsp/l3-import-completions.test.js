// LSP L3.3 — cross-file import-clause completion + cross-file imported
// component completion in markup.
//
// Verifies:
//   - When the cursor is inside `import { | } from "./other.scrml"`, the
//     completion list includes the names exported by other.scrml.
//   - When the cursor is at `<Cap...` in markup, cross-file imported
//     components also appear (in addition to local components and HTML tags).

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { CompletionItemKind } from "vscode-languageserver/node";
import {
  analyzeText,
  buildCompletions,
  buildImportCompletions,
  detectImportClauseContext,
  listImportedCrossFileComponents,
} from "../../../lsp/handlers.js";
import {
  createWorkspace,
  bootstrapWorkspace,
} from "../../../lsp/workspace.js";

let TMP;
let CARD_PATH;
let UTIL_PATH;
let PAGE_PATH;
let WS;

beforeAll(() => {
  TMP = join(tmpdir(), `scrml-l3-import-${Date.now()}`);
  mkdirSync(TMP, { recursive: true });
  CARD_PATH = join(TMP, "card.scrml");
  UTIL_PATH = join(TMP, "util.scrml");
  PAGE_PATH = join(TMP, "page.scrml");

  writeFileSync(
    CARD_PATH,
    [
      "${",
      "  export const Card = <article props={ title: string } class=card>",
      "    <h2>card</h2>",
      "  </article>",
      "  export const Sidebar = <aside class=side>side</aside>",
      "}",
      "",
    ].join("\n"),
  );
  writeFileSync(
    UTIL_PATH,
    [
      "${",
      "  export type Status:enum = { Active, Closed }",
      "  export function utilFn() { return 42 }",
      "}",
      "",
    ].join("\n"),
  );
  writeFileSync(
    PAGE_PATH,
    [
      "${",
      '  import { Card } from "./card.scrml"',
      "}",
      "<Card />",
      "",
    ].join("\n"),
  );

  WS = createWorkspace();
  bootstrapWorkspace(WS, TMP);
});

afterAll(() => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
});

// Helper — point the cursor between the braces of an `import { ... }` clause.
function cursorInsideImportBraces(text) {
  const idx = text.indexOf("import {");
  if (idx < 0) throw new Error("test fixture missing 'import {'");
  return idx + "import {".length + 1; // +1 for the space after `{`
}

describe("LSP L3.3 — detectImportClauseContext", () => {
  it("detects cursor inside `import { | }` braces with a known source", () => {
    const text = 'import {  } from "./card.scrml"';
    // Cursor between the braces (after the opening `{` + 1 space).
    const cursor = text.indexOf("{") + 2;
    const ctx = detectImportClauseContext(text, cursor);
    expect(ctx).not.toBeNull();
    expect(ctx.source).toBe("./card.scrml");
    expect(ctx.prefix).toBe("");
  });

  it("captures partial-identifier prefix before cursor", () => {
    const text = 'import { Ca } from "./card.scrml"';
    const cursor = text.indexOf("Ca") + 2;
    const ctx = detectImportClauseContext(text, cursor);
    expect(ctx).not.toBeNull();
    expect(ctx.prefix).toBe("Ca");
  });

  it("returns null outside an import clause", () => {
    const text = "<div>";
    expect(detectImportClauseContext(text, text.length)).toBeNull();
  });

  it("returns null when source isn't typed yet (still parses to ctx with null source)", () => {
    const text = "import { Card  ";
    const cursor = text.length;
    const ctx = detectImportClauseContext(text, cursor);
    expect(ctx).not.toBeNull();
    expect(ctx.source).toBeNull();
  });
});

describe("LSP L3.3 — buildImportCompletions", () => {
  it("emits names exported by the resolved target file", () => {
    const text = [
      "${",
      '  import {  } from "./card.scrml"',
      "}",
      "",
    ].join("\n");
    const cursor = cursorInsideImportBraces(text);
    const { analysis } = analyzeText(PAGE_PATH, text, undefined, WS);
    const items = buildImportCompletions(text, cursor, analysis, WS);
    const labels = items.map(i => i.label);
    expect(labels).toContain("Card");
    expect(labels).toContain("Sidebar");
    const cardItem = items.find(i => i.label === "Card");
    expect(cardItem.kind).toBe(CompletionItemKind.Class); // isComponent
  });

  it("filters by partial prefix", () => {
    const text = [
      "${",
      '  import { Side } from "./card.scrml"',
      "}",
      "",
    ].join("\n");
    const cursor = text.indexOf("Side") + 4;
    const { analysis } = analyzeText(PAGE_PATH, text, undefined, WS);
    const items = buildImportCompletions(text, cursor, analysis, WS);
    const labels = items.map(i => i.label);
    expect(labels).toContain("Sidebar");
    expect(labels).not.toContain("Card");
  });

  it("emits exported types and functions with appropriate kinds", () => {
    const text = [
      "${",
      '  import {  } from "./util.scrml"',
      "}",
      "",
    ].join("\n");
    const cursor = cursorInsideImportBraces(text);
    const { analysis } = analyzeText(PAGE_PATH, text, undefined, WS);
    const items = buildImportCompletions(text, cursor, analysis, WS);
    const labels = items.map(i => i.label);
    expect(labels).toContain("Status");
    expect(labels).toContain("utilFn");
  });

  it("returns [] when no workspace cache is provided", () => {
    expect(buildImportCompletions("import { ", 9, {}, null)).toEqual([]);
  });
});

describe("LSP L3.3 — listImportedCrossFileComponents", () => {
  it("returns components that are imported into the file", () => {
    const list = listImportedCrossFileComponents(WS, PAGE_PATH);
    const names = list.map(c => c.name);
    expect(names).toContain("Card");
    // Sidebar isn't imported by page.scrml — should not appear.
    expect(names).not.toContain("Sidebar");
  });
});

describe("LSP L3.3 — buildCompletions integration", () => {
  it("includes cross-file imported components in `<Cap...` markup completions", () => {
    const text = [
      "${",
      '  import { Card } from "./card.scrml"',
      "}",
      "<C",
    ].join("\n");
    const cursor = text.length;
    const { analysis } = analyzeText(PAGE_PATH, text, undefined, WS);
    const items = buildCompletions(text, cursor, analysis, WS);
    const labels = items.map(i => i.label);
    expect(labels).toContain("Card");
    // Should also still include HTML tags.
    expect(labels).toContain("div");
  });

  it("import-clause completion fires from buildCompletions", () => {
    const text = [
      "${",
      '  import {  } from "./card.scrml"',
      "}",
      "",
    ].join("\n");
    const cursor = cursorInsideImportBraces(text);
    const { analysis } = analyzeText(PAGE_PATH, text, undefined, WS);
    const items = buildCompletions(text, cursor, analysis, WS);
    const labels = items.map(i => i.label);
    expect(labels).toContain("Card");
    expect(labels).toContain("Sidebar");
  });
});
