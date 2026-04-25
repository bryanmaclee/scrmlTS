// L3 smoke test — exercises each L3 sub-feature via the public handlers
// and prints sample CompletionItem[] responses for the anomaly report.
//
// This file is run as a regular `bun test` so it stays in CI. The assertions
// match the bare-minimum success criteria for each sub-feature.

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { Database } from "bun:sqlite";

import {
  analyzeText,
  buildCompletions,
} from "../../../lsp/handlers.js";
import {
  createWorkspace,
  bootstrapWorkspace,
} from "../../../lsp/workspace.js";

let TMP;
let DB_PATH;
let CARD_PATH;
let PAGE_PATH;
let SQL_PATH;
let WS;

beforeAll(() => {
  TMP = join(tmpdir(), `scrml-l3-smoke-${Date.now()}`);
  mkdirSync(TMP, { recursive: true });
  DB_PATH = join(TMP, "smoke.db");
  CARD_PATH = join(TMP, "card.scrml");
  PAGE_PATH = join(TMP, "page.scrml");
  SQL_PATH = join(TMP, "queries.scrml");

  // Real SQLite DB so PA can introspect.
  const db = new Database(DB_PATH, { create: true });
  try {
    db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT)`);
  } finally {
    db.close();
  }

  writeFileSync(CARD_PATH, [
    "${",
    "  export const Card = <article props={ title: string, body?: string, publishedAt: string } class=card>",
    "    <h2>card</h2>",
    "  </article>",
    "}",
    "",
  ].join("\n"));

  writeFileSync(PAGE_PATH, [
    "${",
    '  import { Card } from "./card.scrml"',
    "}",
    "",
  ].join("\n"));

  writeFileSync(SQL_PATH, [
    `< db src="${DB_PATH}" tables="users">`,
    "  ${",
    "    server function f() {",
    `      return ?{${"`"}SELECT ${"`"}}.all()`,
    "    }",
    "  }",
    "</db>",
    "",
  ].join("\n"));

  WS = createWorkspace();
  bootstrapWorkspace(WS, TMP);
});

afterAll(() => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
});

describe("L3 SMOKE — SQL column completion (?{} context)", () => {
  it("returns column items inside `?{ SELECT |`", () => {
    const text = [
      `< db src="${DB_PATH}" tables="users">`,
      "  ${",
      "    server function f() {",
      `      return ?{${"`"}SELECT ${"`"}}.all()`,
      "    }",
      "  }",
      "</db>",
      "",
    ].join("\n");
    const cursor = text.indexOf("`SELECT `") + "`SELECT ".length;
    const { analysis } = analyzeText(SQL_PATH, text);
    const items = buildCompletions(text, cursor, analysis);
    const sample = items
      .filter(i => ["id", "name", "email"].includes(i.label))
      .map(i => ({ label: i.label, kind: i.kind, detail: i.detail }));
    console.log("\n[L3.1 SQL completion] sample response:");
    console.log(JSON.stringify(sample, null, 2));
    expect(sample.length).toBe(3);
  });
});

describe("L3 SMOKE — component prop completion (<Card |...)", () => {
  it("returns prop items inside `<Card |` (cross-file)", () => {
    const pageText = [
      "${",
      '  import { Card } from "./card.scrml"',
      "}",
      "<Card ",
    ].join("\n");
    const cursor = pageText.length;
    const { analysis } = analyzeText(PAGE_PATH, pageText, undefined, WS);
    const items = buildCompletions(pageText, cursor, analysis, WS);
    // Pick the prop-shaped items (have an insertText ending in "=").
    // HTML's `title` attribute also matches the label but lacks insertText.
    const propLabels = ["title", "body", "publishedAt"];
    const sample = items
      .filter(i => propLabels.includes(i.label) && i.insertText && i.insertText.endsWith("="))
      .map(i => ({ label: i.label, kind: i.kind, detail: i.detail, insertText: i.insertText }));
    console.log("\n[L3.2 component prop completion] sample response:");
    console.log(JSON.stringify(sample, null, 2));
    expect(sample.length).toBe(3);
  });
});

describe("L3 SMOKE — cross-file import completion (import { | })", () => {
  it("returns exports inside `import { | } from \"./card.scrml\"`", () => {
    const text = [
      "${",
      '  import {  } from "./card.scrml"',
      "}",
      "",
    ].join("\n");
    const cursor = text.indexOf("import {") + "import {".length + 1;
    const { analysis } = analyzeText(PAGE_PATH, text, undefined, WS);
    const items = buildCompletions(text, cursor, analysis, WS);
    const sample = items
      .filter(i => i.label === "Card")
      .map(i => ({ label: i.label, kind: i.kind, detail: i.detail }));
    console.log("\n[L3.3 cross-file import completion] sample response:");
    console.log(JSON.stringify(sample, null, 2));
    expect(sample.length).toBeGreaterThan(0);
  });
});
