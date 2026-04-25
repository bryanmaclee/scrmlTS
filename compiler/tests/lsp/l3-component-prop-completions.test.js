// LSP L3.2 — component prop completion.
//
// When the cursor is inside an open `<Card |...` tag, completion should
// surface the prop names declared in the component's `< props>` block,
// with the prop type as detail. Both same-file and cross-file (imported)
// component lookups are covered.

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { CompletionItemKind } from "vscode-languageserver/node";
import {
  analyzeText,
  buildCompletions,
  buildComponentPropCompletions,
  detectOpenComponentTag,
  extractComponentProps,
} from "../../../lsp/handlers.js";
import {
  createWorkspace,
  bootstrapWorkspace,
} from "../../../lsp/workspace.js";

let TMP;
let CARD_PATH;
let PAGE_PATH;
let WS;

beforeAll(() => {
  TMP = join(tmpdir(), `scrml-l3-comp-${Date.now()}`);
  mkdirSync(TMP, { recursive: true });
  CARD_PATH = join(TMP, "card.scrml");
  PAGE_PATH = join(TMP, "page.scrml");

  writeFileSync(
    CARD_PATH,
    [
      "${",
      "  export const Card = <article props={ title: string, body: string, publishedAt?: string } class=card>",
      "    <h2>card</h2>",
      "  </article>",
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

describe("LSP L3.2 — detectOpenComponentTag", () => {
  it("detects `<Card |` (cursor inside an open Card tag)", () => {
    const text = "${\n  const Card = <article>x</>\n}\n<Card ";
    const result = detectOpenComponentTag(text, text.length);
    expect(result).not.toBeNull();
    expect(result.componentName).toBe("Card");
    expect(result.prefix).toBe("");
  });

  it("detects partial-attribute prefix (`<Card ti`)", () => {
    const text = "<Card ti";
    const result = detectOpenComponentTag(text, text.length);
    expect(result).not.toBeNull();
    expect(result.componentName).toBe("Card");
    expect(result.prefix).toBe("ti");
  });

  it("returns null for HTML elements (lowercase tag)", () => {
    const text = "<div ";
    expect(detectOpenComponentTag(text, text.length)).toBeNull();
  });

  it("returns null when the tag is already closed", () => {
    const text = "<Card title=\"hi\">";
    expect(detectOpenComponentTag(text, text.length)).toBeNull();
  });
});

describe("LSP L3.2 — extractComponentProps (same-file)", () => {
  it("returns the propsDecl declared in `< props>`", () => {
    const src = [
      "${",
      "  const Card = <article props={ title: string, body?: string } class=card>",
      "    <h2>card</h2>",
      "  </article>",
      "}",
      "",
    ].join("\n");
    const { analysis } = analyzeText("/test.scrml", src);
    const card = analysis.components.find(c => c.name === "Card");
    expect(card).toBeTruthy();
    const props = extractComponentProps(card, "/test.scrml");
    const propNames = props.map(p => p.name);
    expect(propNames).toContain("title");
    expect(propNames).toContain("body");
    const titleProp = props.find(p => p.name === "title");
    expect(titleProp.type).toBe("string");
    const bodyProp = props.find(p => p.name === "body");
    expect(bodyProp.optional).toBe(true);
  });

  it("returns [] for a component without a props block", () => {
    const src = [
      "${",
      "  const Bare = <div class=plain>hello</div>",
      "}",
      "",
    ].join("\n");
    const { analysis } = analyzeText("/test.scrml", src);
    const bare = analysis.components.find(c => c.name === "Bare");
    expect(bare).toBeTruthy();
    const props = extractComponentProps(bare, "/test.scrml");
    expect(props).toEqual([]);
  });
});

describe("LSP L3.2 — buildComponentPropCompletions (same-file)", () => {
  it("emits prop names for the local component when cursor is in <Card |>", () => {
    const src = [
      "${",
      "  const Card = <article props={ title: string, body?: string } class=card>",
      "    <h2>x</h2>",
      "  </article>",
      "}",
      "<Card ",
    ].join("\n");
    const cursor = src.length;
    const { analysis } = analyzeText("/test.scrml", src);
    const items = buildComponentPropCompletions(src, cursor, analysis);
    const labels = items.map(i => i.label);
    expect(labels).toContain("title");
    expect(labels).toContain("body");
    const title = items.find(i => i.label === "title");
    expect(title.kind).toBe(CompletionItemKind.Property);
    expect(title.detail).toContain("string");
    expect(title.insertText).toBe("title=");
  });

  it("filters by prefix when the user has started typing an attribute", () => {
    const src = [
      "${",
      "  const Card = <article props={ title: string, body?: string } class=card>",
      "    <h2>x</h2>",
      "  </article>",
      "}",
      "<Card ti",
    ].join("\n");
    const cursor = src.length;
    const { analysis } = analyzeText("/test.scrml", src);
    const items = buildComponentPropCompletions(src, cursor, analysis);
    const labels = items.map(i => i.label);
    expect(labels).toContain("title");
    // body should NOT appear because the prefix `ti` doesn't match.
    expect(labels).not.toContain("body");
  });

  it("returns [] when cursor is not inside an open component tag", () => {
    const src = "<div >";
    expect(buildComponentPropCompletions(src, src.length, {})).toEqual([]);
  });
});

describe("LSP L3.2 — cross-file component prop completion", () => {
  it("resolves Card's props when imported from another file", () => {
    const pageText = [
      "${",
      '  import { Card } from "./card.scrml"',
      "}",
      "<Card ",
    ].join("\n");
    const cursor = pageText.length;
    const { analysis } = analyzeText(PAGE_PATH, pageText, undefined, WS);
    const items = buildComponentPropCompletions(pageText, cursor, analysis, WS);
    const labels = items.map(i => i.label);
    expect(labels).toContain("title");
    expect(labels).toContain("body");
    expect(labels).toContain("publishedAt");
    const title = items.find(i => i.label === "title");
    expect(title.documentation).toContain("defined in");
  });
});

describe("LSP L3.2 — buildCompletions integration", () => {
  it("integrates prop completion into buildCompletions", () => {
    const src = [
      "${",
      "  const Card = <article props={ title: string } class=card>",
      "    <h2>x</h2>",
      "  </article>",
      "}",
      "<Card ",
    ].join("\n");
    const cursor = src.length;
    const { analysis } = analyzeText("/test.scrml", src);
    const items = buildCompletions(src, cursor, analysis);
    const labels = items.map(i => i.label);
    expect(labels).toContain("title");
  });
});
