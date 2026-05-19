/**
 * §41.14 (S102 follow-on) — formFor stdlib runtime integration.
 *
 * End-to-end coverage: compile a scrml source that imports + calls
 * `registerLabels` from `scrml:data`, then execute the emitted JS in a
 * sandboxed runtime and assert the labels reach the runtime store.
 *
 * Coverage:
 *   §1 — registerLabels({...}) call → runtime store populates correctly.
 *   §2 — multiple registerLabels calls compose with last-write-wins
 *        across (struct, field) keys.
 *   §3 — registerLabels + formFor element-form in the same file both
 *        compile + emit; the label registration runs (via the inlined
 *        stdlib-data chunk) so future Level-2 consultation will find it.
 *
 * Mirrors the parse-variant-runtime integration pattern.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";
import { assembleRuntime, RUNTIME_CHUNK_ORDER } from "../../src/codegen/runtime-chunks.ts";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "form-for-stdlib-rt-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(relPath, source) {
  const abs = join(TMP, relPath);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}

function realErrors(result) {
  return (result.errors || []).filter(e => e && e.severity !== "warning");
}

function compile(filename, source) {
  const abs = fx(filename, source);
  return compileScrml({
    inputFiles: [abs],
    outputDir: join(TMP, "dist"),
    write: false,
    log: () => {},
  });
}

function getOutput(result) {
  const entries = [...(result.outputs || new Map()).entries()];
  return entries.length > 0 ? entries[0][1] : null;
}

/**
 * Execute the emitted clientJs in a sandboxed Function context and surface
 * the runtime label store for assertion. The clientJs assumes the shared
 * `scrml-runtime.js` was already loaded, so we PREPEND the full assembled
 * runtime (every chunk — so any cross-chunk reference resolves) before the
 * emitted code. The labels runtime lives in the messages chunk; both the
 * server + client emission paths reach the same registry by calling into
 * the runtime helper.
 *
 * The Function wrapper is implicitly strict-mode-free (classic-script
 * eval), matching the browser/script-tag environment scrml emits for.
 */
function execAndExtractLabels(result) {
  const out = getOutput(result);
  // The clientJs path is the user-facing emission for registerLabels (server-
  // emit may be empty when the file has no server boundaries). The clientJs
  // references `document` + `window` + module-init DOM calls (transitions chunk
  // calls document.createElement("style") at module-init). We provide a full-
  // surface DOM stub that no-ops; we only care about the registerLabels side
  // effect on _scrml_labels_registered. The labels runtime lives in the
  // messages chunk; the store is reached the moment registerLabels({...})
  // executes.
  const programCode = out?.clientJs || out?.serverJs || "";
  expect(programCode.length).toBeGreaterThan(0);
  // Assemble only the chunks we need — exclude any chunk that does module-
  // init DOM work that the stub can't satisfy. `core` gives us _scrml_stdlib
  // base + reactive state; `messages` gives us _scrml_labels_register +
  // _scrml_labels_registered; `stdlib-data` registers _scrml_stdlib.data with
  // the registerLabels shim that the emitted clientJs destructures.
  const runtime = assembleRuntime(new Set(["core", "messages", "stdlib-data"]));
  // Full no-op DOM stub. Every method returns a chainable proxy so any
  // method call surface in module-init code resolves without throwing.
  const domStub = `
    const __noopEl = new Proxy({}, {
      get: function(_t, k) {
        if (k === "appendChild" || k === "removeChild" || k === "addEventListener" ||
            k === "removeEventListener" || k === "setAttribute" || k === "remove" ||
            k === "click" || k === "focus" || k === "blur" || k === "insertBefore" ||
            k === "replaceChild" || k === "after" || k === "before") {
          return function() {};
        }
        if (k === "childNodes" || k === "children" || k === "attributes" ||
            k === "classList") return [];
        if (k === "parentNode" || k === "parentElement" || k === "nextSibling" ||
            k === "firstChild" || k === "lastChild") return null;
        if (k === "style") return {};
        if (k === "innerHTML" || k === "textContent" || k === "value") return "";
        return undefined;
      },
      set: function() { return true; }
    });
    const document = {
      addEventListener: function() {},
      removeEventListener: function() {},
      querySelector:    function() { return null; },
      querySelectorAll: function() { return []; },
      createElement:    function() { return __noopEl; },
      createTextNode:   function() { return __noopEl; },
      createComment:    function() { return __noopEl; },
      createTreeWalker: function() {
        return { nextNode: function() { return null; }, currentNode: null };
      },
      getElementById:   function() { return null; },
      head:             __noopEl,
      body:             __noopEl,
      documentElement:  __noopEl,
    };
    const window = {
      addEventListener: function() {},
      removeEventListener: function() {},
      requestAnimationFrame: function() { return 0; },
      cancelAnimationFrame:  function() {},
      location:         { pathname: "/", search: "", hash: "" },
      history:          { pushState: function() {}, replaceState: function() {} },
      setTimeout:       function() { return 0; },
      clearTimeout:     function() {},
    };
    const requestAnimationFrame = window.requestAnimationFrame;
    const cancelAnimationFrame  = window.cancelAnimationFrame;
    const NodeFilter = { SHOW_COMMENT: 128 };
  `;
  const probe = `\nreturn (typeof _scrml_labels_registered === "object") ? _scrml_labels_registered : null;\n`;
  return new Function(domStub + "\n" + runtime + "\n" + programCode + probe)();
}

// ---------------------------------------------------------------------------
// §1 — single registerLabels call populates the runtime store
// ---------------------------------------------------------------------------

describe("§1 registerLabels — single call populates runtime store", () => {
  test("single call lands in _scrml_labels_registered", () => {
    const result = compile("single/basic.scrml", `\${
  import { registerLabels } from 'scrml:data'

  registerLabels({
    Signup: {
      name:  "Full Name",
      email: "Email Address"
    }
  })
}
<program><p>x</p></program>
`);
    expect(realErrors(result)).toEqual([]);
    const labels = execAndExtractLabels(result);
    expect(labels).not.toBeNull();
    expect(labels.Signup).toEqual({
      name:  "Full Name",
      email: "Email Address",
    });
  });
});

// ---------------------------------------------------------------------------
// §2 — multiple registerLabels calls compose with last-write-wins
// ---------------------------------------------------------------------------

describe("§2 registerLabels — multiple calls compose", () => {
  test("two calls with disjoint structs both apply", () => {
    const result = compile("compose/disjoint.scrml", `\${
  import { registerLabels } from 'scrml:data'

  registerLabels({
    Signup: { name: "Full Name" }
  })

  registerLabels({
    Login: { email: "Login Email" }
  })
}
<program><p>x</p></program>
`);
    expect(realErrors(result)).toEqual([]);
    const labels = execAndExtractLabels(result);
    expect(labels.Signup).toEqual({ name: "Full Name" });
    expect(labels.Login).toEqual({ email: "Login Email" });
  });

  test("two calls with overlapping (struct, field) — last write wins", () => {
    const result = compile("compose/overlap.scrml", `\${
  import { registerLabels } from 'scrml:data'

  registerLabels({
    Signup: { email: "Email" }
  })

  registerLabels({
    Signup: { email: "Email Address" }
  })
}
<program><p>x</p></program>
`);
    expect(realErrors(result)).toEqual([]);
    const labels = execAndExtractLabels(result);
    expect(labels.Signup.email).toBe("Email Address");
  });
});

// ---------------------------------------------------------------------------
// §3 — registerLabels + formFor element-form coexist
// ---------------------------------------------------------------------------

describe("§3 registerLabels + formFor element-form coexist", () => {
  test("both imported + used in one file — no errors, both surfaces emit", () => {
    const result = compile("coexist/both.scrml", `\${
  import { formFor, registerLabels } from 'scrml:data'

  type Signup:struct = {
    name:  string req
    email: string req
  }

  registerLabels({
    Signup: { email: "Email Address" }
  })

  server function persistSignup(values: Signup) ! string {
    return "ok"
  }
}
<program>
  <formFor for=Signup onsubmit=persistSignup/>
</program>
`);
    expect(realErrors(result)).toEqual([]);
    const out = getOutput(result);

    // formFor element-form expansion fired — synthesized markup is present.
    expect(out.html).toContain(`data-scrml-formfor="Signup"`);
    expect(out.html).toContain(`data-scrml-formfor-field="name"`);
    expect(out.html).toContain(`data-scrml-formfor-field="email"`);

    // registerLabels call lowered into the emitted JS — the label string
    // "Email Address" appears in the clientJs (or serverJs) output.
    const allJs = (out.clientJs ?? "") + "\n" + (out.serverJs ?? "");
    expect(allJs).toContain("Email Address");

    // Defensive bare-call fallback did NOT execute — the rewrite-failed
    // throw-tag is not in the output.
    expect(allJs).not.toContain("call site was not rewritten at compile time");
  });
});
