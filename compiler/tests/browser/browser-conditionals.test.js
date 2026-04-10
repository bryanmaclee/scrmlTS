/**
 * Browser tests for conditional rendering samples.
 *
 * Covers:
 *   control-001-if-basic — basic if with non-reactive local variable
 *   control-002-if-else — if/else branching with non-reactive local variable
 *   control-011-if-reactive — reactive conditional with @loggedIn
 *
 * Uses happy-dom GlobalRegistrator to simulate a browser environment.
 */

import { describe, test, expect } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";
import { readFileSync } from "fs";
import { resolve } from "path";

if (!globalThis.document) GlobalRegistrator.register();

const DIST = resolve(import.meta.dir, "../../../samples/compilation-tests/dist");

function loadSample(baseName) {
  const htmlFile = resolve(DIST, `${baseName}.html`);
  const jsFile = resolve(DIST, `${baseName}.client.js`);

  const htmlContent = readFileSync(htmlFile, "utf-8");
  const clientJs = readFileSync(jsFile, "utf-8");

  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : htmlContent;
  const cleanHtml = bodyHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/g, "").trim();

  document.body.innerHTML = cleanHtml;

  const code = `(function() {\n${SCRML_RUNTIME}\n${clientJs}\n` +
    `window._scrml_reactive_get = _scrml_reactive_get;\n` +
    `window._scrml_reactive_set = _scrml_reactive_set;\n` +
    `window._scrml_reactive_subscribe = _scrml_reactive_subscribe;\n` +
    `})();`;
  eval(code);

  document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));

  return {
    get: (name) => window._scrml_reactive_get(name),
    set: (name, val) => window._scrml_reactive_set(name, val),
  };
}

// ---------------------------------------------------------------------------
// control-001-if-basic
// ---------------------------------------------------------------------------

describe("If Basic (control-001): static conditional", () => {
  test("sample loads without errors", () => {
    const api = loadSample("control-001-if-basic");
    // The sample uses plain let (non-reactive), so no reactive state expected
    // It should just execute without throwing
    expect(true).toBe(true);
  });

  test("DOM contains the expected structure", () => {
    loadSample("control-001-if-basic");
    const div = document.querySelector("div");
    expect(div).not.toBeNull();
    const p = div.querySelector("p");
    expect(p).not.toBeNull();
    expect(p.textContent).toBe("Age checked");
  });

  test("logic span is present for the if block", () => {
    loadSample("control-001-if-basic");
    const logicSpan = document.querySelector("[data-scrml-logic]");
    expect(logicSpan).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// control-002-if-else
// ---------------------------------------------------------------------------

describe("If-Else (control-002): static branching", () => {
  test("sample loads without errors", () => {
    const api = loadSample("control-002-if-else");
    // Uses plain let variables, no reactive state
    expect(true).toBe(true);
  });

  test("DOM contains the expected structure", () => {
    loadSample("control-002-if-else");
    const div = document.querySelector("div");
    expect(div).not.toBeNull();
    const p = div.querySelector("p");
    expect(p).not.toBeNull();
    expect(p.textContent).toBe("Score evaluated");
  });

  test("logic span is present for the if-else block", () => {
    loadSample("control-002-if-else");
    const logicSpan = document.querySelector("[data-scrml-logic]");
    expect(logicSpan).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// control-011-if-reactive
// ---------------------------------------------------------------------------

describe("If Reactive (control-011): reactive conditional", () => {
  test("@loggedIn starts as true", () => {
    const api = loadSample("control-011-if-reactive");
    expect(api.get("loggedIn")).toBe(true);
  });

  test("setting @loggedIn to false updates reactive state", () => {
    const api = loadSample("control-011-if-reactive");
    api.set("loggedIn", false);
    expect(api.get("loggedIn")).toBe(false);
  });

  test("toggling @loggedIn back to true restores state", () => {
    const api = loadSample("control-011-if-reactive");
    api.set("loggedIn", false);
    api.set("loggedIn", true);
    expect(api.get("loggedIn")).toBe(true);
  });

  test("DOM contains the expected structure", () => {
    loadSample("control-011-if-reactive");
    const div = document.querySelector("div");
    expect(div).not.toBeNull();
    const p = div.querySelector("p");
    expect(p).not.toBeNull();
    expect(p.textContent).toBe("Auth check done");
  });

  test("logic span is present for reactive if block", () => {
    loadSample("control-011-if-reactive");
    const logicSpan = document.querySelector("[data-scrml-logic]");
    expect(logicSpan).not.toBeNull();
  });
});
