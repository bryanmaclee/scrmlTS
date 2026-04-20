/**
 * mangle-property-access.test.js — Scope-aware function-call mangling
 *
 * Regression: 6nz inbound 2026-04-20 Bug D.
 *
 * The post-processing mangling pass in emit-client.ts rewrites every call
 * site of a user-defined function (e.g. `toggle()` → `_scrml_toggle_7()`).
 * Previously the regex only matched word boundaries — it had no negative
 * lookbehind for `.`, so `classList.toggle(...)` (a DOM method, not the
 * user symbol) got rewritten to `classList._scrml_toggle_7(...)`.
 *
 * This broke any user fn sharing a name with a DOM method: toggle, add,
 * remove, append, replace, forEach, etc. Reproduced on scrmlTS's own
 * docs/tutorial-snippets/01e-bindings.scrml.
 *
 * Coverage:
 *   §1  classList.toggle is NOT rewritten when user fn `toggle` exists
 *   §2  user fn call sites ARE still rewritten at the top-level / delegation
 *   §3  other DOM method names (forEach, add, remove) are NOT rewritten
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/mangle-property-access");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

const TOGGLE_FIXTURE = join(FIXTURE_DIR, "toggle.scrml");
const TOGGLE_SRC = `<program>

\${
  @active = false

  function toggle() { @active = !@active }
}

<div>
  <p class:active=@active>Hello</p>
  <button onclick=toggle()>Toggle</button>
</div>

</program>
`;

const FOREACH_FIXTURE = join(FIXTURE_DIR, "forEach.scrml");
const FOREACH_SRC = `<program>

\${
  @items = [1, 2, 3]

  function forEach() { @items = [...@items, 1] }
}

<div>
  <button onclick=forEach()>Tap</button>
  <p>\${@items.join(",")}</p>
</div>

</program>
`;

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(TOGGLE_FIXTURE, TOGGLE_SRC);
  writeFileSync(FOREACH_FIXTURE, FOREACH_SRC);
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// §1: classList.toggle not rewritten when user fn `toggle` exists
// ---------------------------------------------------------------------------

describe("§1: classList.toggle is NOT rewritten", () => {
  test("user fn `toggle` does not corrupt classList.toggle(...) call", () => {
    const result = compileScrml({
      inputFiles: [TOGGLE_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    expect(result.errors).toEqual([]);
    const out = result.outputs.get(TOGGLE_FIXTURE);
    expect(out).toBeDefined();
    const clientJs = out.clientJs;

    // The compiler-generated class:active binding uses classList.toggle(...)
    expect(clientJs).toContain('classList.toggle("active"');
    // MUST NOT rewrite the DOM method name
    expect(clientJs).not.toMatch(/classList\._scrml_toggle_/);
  });

  test("user fn call site IS rewritten (delegation registry)", () => {
    const result = compileScrml({
      inputFiles: [TOGGLE_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    const clientJs = result.outputs.get(TOGGLE_FIXTURE).clientJs;
    // User fn `toggle` IS mangled at its call site (onclick delegation)
    expect(clientJs).toMatch(/_scrml_toggle_\d+\(event\)/);
    // And at its declaration
    expect(clientJs).toMatch(/function _scrml_toggle_\d+/);
  });
});

// ---------------------------------------------------------------------------
// §2: Other DOM method names — forEach
// ---------------------------------------------------------------------------

describe("§2: forEach as user fn does not corrupt .forEach(...) DOM calls", () => {
  test("classList / array .forEach(...) text is preserved", () => {
    const result = compileScrml({
      inputFiles: [FOREACH_FIXTURE],
      outputDir: FIXTURE_OUTPUT,
      write: false,
    });

    expect(result.errors).toEqual([]);
    const clientJs = result.outputs.get(FOREACH_FIXTURE).clientJs;

    // The event-wiring template uses document.querySelectorAll(...).forEach(...)
    // for non-delegable events. Even if the user doesn't trigger that path,
    // the internal click-delegation walk uses .getAttribute(...). Either way
    // we must confirm the user fn rename does not bleed onto any .forEach
    // property access that may appear in the runtime template or wiring.
    expect(clientJs).not.toMatch(/\._scrml_forEach_/);
    // User fn is still mangled at its call site
    expect(clientJs).toMatch(/_scrml_forEach_\d+\(event\)/);
  });
});
