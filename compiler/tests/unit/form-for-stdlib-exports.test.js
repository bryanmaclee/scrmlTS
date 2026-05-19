/**
 * §41.14 (S102 follow-on) — formFor + registerLabels stdlib surface.
 *
 * Covers the stdlib re-export wiring landed alongside emit-form-for.ts:
 *
 *   §1 — `import { formFor, registerLabels } from 'scrml:data'` resolves
 *        cleanly at MOD stage (no E-MOD-* / E-NAME-* / E-IMPORT-* errors).
 *   §2 — registerLabels({...}) call lowers correctly through the codegen
 *        pipeline (emits a call to the _scrml_labels_register runtime
 *        helper either directly or via the stdlib shim wrapper).
 *   §3 — registerLabels last-write-wins composition across multiple calls
 *        per (struct, field) key. Exercises the runtime helper directly via
 *        a sandbox so we don't have to roundtrip through compileScrml.
 *   §4 — Regression coverage — the canonical element-form
 *        `<formFor for=Signup onsubmit=fn/>` still compiles end-to-end +
 *        emits the expected synthesized markup AFTER the stdlib re-export
 *        lands. Guards against the defensive bare-call fallback displacing
 *        the element-form expansion.
 *
 * Cross-references:
 *   - SPEC §41.14    — formFor (canonical surface)
 *   - SPEC §41.14.7  — label resolution chain (registerLabels Level 2)
 *   - SPEC §41.14.10 — Pillar 5 invariant
 *   - SPEC §41.12    — registerMessages precedent
 *   - compiler/src/runtime-template.js — _scrml_labels_register helper
 *   - compiler/runtime/stdlib/data.js — registerLabels shim wrapper
 *   - stdlib/data/form-for.scrml — source-level re-export
 *   - stdlib/data/index.scrml — index re-export
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";
import {
  RUNTIME_CHUNKS,
  RUNTIME_CHUNK_ORDER,
  assembleRuntime,
} from "../../src/codegen/runtime-chunks.ts";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "form-for-stdlib-"));
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
 * Sandbox the runtime so the labels helpers can be exercised directly. Each
 * sandbox is fresh — the registry doesn't leak across tests. Mirrors the C10
 * messages sandbox pattern.
 */
function buildLabelsSandbox() {
  const runtime = assembleRuntime(new Set(RUNTIME_CHUNK_ORDER));
  const probe = `
    return {
      register:   _scrml_labels_register,
      labelFor:   _scrml_label_for,
      registered: _scrml_labels_registered,
    };
  `;
  return new Function(runtime + probe)();
}

// ---------------------------------------------------------------------------
// §1 — import resolution at MOD stage
// ---------------------------------------------------------------------------

describe("§1 stdlib import resolution — formFor + registerLabels", () => {
  test("import { formFor, registerLabels } from 'scrml:data' resolves cleanly", () => {
    const result = compile("imports/both.scrml", `\${
  import { formFor, registerLabels } from 'scrml:data'

  type Signup:struct = {
    name:  string req
    email: string req
  }

  server function persistSignup(values: Signup) ! string {
    return "ok"
  }
}
<program>
  <formFor for=Signup onsubmit=persistSignup/>
</program>
`);
    const errs = realErrors(result);
    const importErrs = errs.filter(e =>
      typeof e.code === "string" &&
      (e.code.startsWith("E-MOD-") || e.code.startsWith("E-NAME-") || e.code.startsWith("E-IMPORT-"))
    );
    expect(importErrs).toEqual([]);
  });

  test("import { registerLabels } alone (no formFor) resolves cleanly", () => {
    const result = compile("imports/labels-only.scrml", `\${
  import { registerLabels } from 'scrml:data'

  registerLabels({
    Signup: {
      email: "Email address"
    }
  })
}
<program><p>x</p></program>
`);
    const errs = realErrors(result);
    const importErrs = errs.filter(e =>
      typeof e.code === "string" &&
      (e.code.startsWith("E-MOD-") || e.code.startsWith("E-NAME-") || e.code.startsWith("E-IMPORT-"))
    );
    expect(importErrs).toEqual([]);
  });

  test("import { formFor } alone (no registerLabels) resolves cleanly", () => {
    const result = compile("imports/formfor-only.scrml", `\${
  import { formFor } from 'scrml:data'

  type Signup:struct = {
    name: string req
  }
}
<program>
  <formFor for=Signup/>
</program>
`);
    const errs = realErrors(result);
    const importErrs = errs.filter(e =>
      typeof e.code === "string" &&
      (e.code.startsWith("E-MOD-") || e.code.startsWith("E-NAME-") || e.code.startsWith("E-IMPORT-"))
    );
    expect(importErrs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §2 — registerLabels codegen lowering
// ---------------------------------------------------------------------------

describe("§2 registerLabels codegen lowering", () => {
  test("registerLabels call reaches the runtime helper either directly or via shim", () => {
    const result = compile("codegen/register.scrml", `\${
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
    const errs = realErrors(result);
    expect(errs).toEqual([]);
    const out = getOutput(result);
    // The helper is reachable via either:
    //   (a) the serverJs path through compiler/runtime/stdlib/data.js shim,
    //   (b) the clientJs path through the inlined _scrml_stdlib.data chunk.
    // We probe both — the labels map shape ("Full Name", "Email Address")
    // appears in whichever output carries the call.
    const allJs = (out?.serverJs ?? "") + "\n" + (out?.clientJs ?? "") + "\n" + (out?.libraryJs ?? "");
    expect(allJs).toContain("Full Name");
    expect(allJs).toContain("Email Address");
    // The call site itself appears under the local-name `registerLabels`.
    expect(allJs).toMatch(/registerLabels\s*\(/);
  });
});

// ---------------------------------------------------------------------------
// §3 — registerLabels runtime composition (sandboxed)
// ---------------------------------------------------------------------------

describe("§3 registerLabels last-write-wins composition", () => {
  test("two register calls with disjoint structs both apply", () => {
    const api = buildLabelsSandbox();
    api.register({ Signup: { name: "Full Name" } });
    api.register({ Login:  { email: "Email" } });
    expect(api.labelFor("Signup", "name")).toBe("Full Name");
    expect(api.labelFor("Login",  "email")).toBe("Email");
  });

  test("two register calls with disjoint fields on same struct both apply", () => {
    const api = buildLabelsSandbox();
    api.register({ Signup: { name: "Full Name" } });
    api.register({ Signup: { email: "Email Address" } });
    expect(api.labelFor("Signup", "name")).toBe("Full Name");
    expect(api.labelFor("Signup", "email")).toBe("Email Address");
  });

  test("two register calls with overlapping (struct, field) keys — last write wins", () => {
    const api = buildLabelsSandbox();
    api.register({ Signup: { email: "Email" } });
    api.register({ Signup: { email: "Email Address" } });
    expect(api.labelFor("Signup", "email")).toBe("Email Address");
  });

  test("Level 4 mechanical fallback when no registration exists", () => {
    const api = buildLabelsSandbox();
    expect(api.labelFor("Signup", "email")).toBe("Email");
    expect(api.labelFor("Signup", "emailAddress")).toBe("Email Address");
    expect(api.labelFor("Signup", "agreeToTerms")).toBe("Agree To Terms");
  });

  test("Level 4 fallback also fires per-field — registered for one field doesn't suppress others", () => {
    const api = buildLabelsSandbox();
    api.register({ Signup: { email: "Email Address" } });
    expect(api.labelFor("Signup", "email")).toBe("Email Address"); // L2
    expect(api.labelFor("Signup", "name")).toBe("Name");           // L4
  });

  test("register ignores non-object inner values gracefully", () => {
    const api = buildLabelsSandbox();
    api.register({ Signup: "not an object" });
    api.register({ Login:  42 });
    // Falls through to L4 fallback — no entries added.
    expect(api.labelFor("Signup", "name")).toBe("Name");
  });

  test("register ignores non-string field values gracefully", () => {
    const api = buildLabelsSandbox();
    api.register({ Signup: { email: 42, name: null, phone: { obj: "no" } } });
    // None of those values are strings → no entries added → L4 fallback.
    expect(api.labelFor("Signup", "email")).toBe("Email");
    expect(api.labelFor("Signup", "name")).toBe("Name");
    expect(api.labelFor("Signup", "phone")).toBe("Phone");
  });

  test("register ignores null / undefined / non-object maps gracefully", () => {
    const api = buildLabelsSandbox();
    api.register(null);
    api.register(undefined);
    api.register("not an object");
    api.register(42);
    // No throws — and no entries added.
    expect(api.labelFor("Signup", "email")).toBe("Email");
  });
});

// ---------------------------------------------------------------------------
// §4 — Element-form regression coverage
// ---------------------------------------------------------------------------

describe("§4 element-form regression — <formFor for=.../> still compiles after re-export", () => {
  let result;
  let html;
  let clientJs;

  beforeAll(() => {
    result = compile("regression/canonical.scrml", `\${
  import { formFor, registerLabels } from 'scrml:data'

  type Signup:struct = {
    name:  string req length(>=2)
    email: string req pattern(/^[^@]+@[^@]+$/)
    agree: boolean req
  }

  registerLabels({
    Signup: {
      email: "Email Address"
    }
  })

  server function persistSignup(values: Signup) ! string {
    return "ok"
  }
}
<program>
  <formFor for=Signup onsubmit=persistSignup/>
</program>
`);
    const out = getOutput(result);
    html = out?.html ?? "";
    clientJs = out?.clientJs ?? "";
  });

  test("compiles cleanly — no E-FORMFOR-* errors after re-export landed", () => {
    const errs = realErrors(result);
    const ffErrs = errs.filter(e => e.code && e.code.startsWith("E-FORMFOR-"));
    expect(ffErrs).toEqual([]);
  });

  test("element-form rewrite still fires — synthesized <form> wrapper present", () => {
    expect(html).toContain(`data-scrml-formfor="Signup"`);
    expect(html).toContain(`data-scrml-formfor-field="name"`);
    expect(html).toContain(`data-scrml-formfor-field="email"`);
    expect(html).toContain(`data-scrml-formfor-field="agree"`);
  });

  test("defensive bare-call fallback does NOT execute — no thrown shim error in output", () => {
    // If the type-system rewrite missed the element form, the codegen would
    // emit a bare call to `formFor(Signup, ...)` and the runtime shim would
    // throw at first invocation. We assert the throw-message tag-string does
    // NOT appear in the emitted output (which would indicate the rewrite ran
    // but the call lowering also fired).
    const allJs = clientJs + "\n" + (getOutput(result)?.serverJs ?? "");
    expect(allJs).not.toContain("call site was not rewritten at compile time");
  });

  test("submit button + per-field <errors> anchors still emit", () => {
    expect(html).toContain(`<button type="submit"`);
    const anchors = html.match(/data-scrml-errors-anchor=/g) || [];
    expect(anchors.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// §5 — Runtime chunk wiring sanity
// ---------------------------------------------------------------------------

describe("§5 runtime chunk wiring — labels helpers co-located with messages", () => {
  test("'messages' chunk content includes _scrml_labels_register", () => {
    expect(RUNTIME_CHUNKS.messages).toContain("function _scrml_labels_register");
  });

  test("'messages' chunk content includes _scrml_label_for", () => {
    expect(RUNTIME_CHUNKS.messages).toContain("function _scrml_label_for");
  });

  test("core-only assembly does NOT include labels helpers (tree-shaken)", () => {
    const minimal = assembleRuntime(new Set(["core"]));
    expect(minimal).not.toContain("_scrml_labels_register");
    expect(minimal).not.toContain("_scrml_label_for");
  });

  test("core+messages assembly includes labels helpers (co-located)", () => {
    const withMessages = assembleRuntime(new Set(["core", "messages"]));
    expect(withMessages).toContain("function _scrml_labels_register");
    expect(withMessages).toContain("function _scrml_label_for");
  });
});
