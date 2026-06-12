/**
 * Integration: auth-redirect-tightening end-to-end.
 *
 * S94 dispatch — verifies the tightened I-AUTH-REDIRECT-UNRESOLVED +
 * W-AUTH-LOGIN-MISSING messages fire with the new prose contract when
 * compiling a real-shaped project.
 *
 * **Critical finding surfaced during this dispatch's Phase 2:**
 * Today's `buildPageRouteTree` in route-inference.ts keys on `/routes/`
 * subdirectories (NOT `/pages/`). The v0.3 corpus convention is
 * `pages/**`, and the `scrml generate auth` scaffold lands under
 * `pages/`. As a result, the scaffold's filesystem location IS NOT seen
 * by the route-inference page tree — every file outside a `routes/`
 * subtree is treated as a single-page-app mount at urlPattern `"/"`.
 * The auth-graph redirect cross-ref therefore can't resolve
 * `/auth/login` or `/signin` to the scaffold even when adopter runs
 * `scrml generate auth`.
 *
 * This is route-inference debt (the function's own doc-comment flags
 * v0.4 follow-up: "harmonize this function's `routes/` keying with the
 * v0.3 corpus convention `pages/**`"). It is OUT OF SCOPE for this
 * dispatch (would require modifying route-inference.ts beyond the
 * auth-graph + generate.js surface the brief authorized).
 *
 * The integration tests in this file:
 *  §1 — verifies tightened message contracts fire when no scaffold
 *       exists (the primary contract this dispatch pins).
 *  §2 — exercises the post-`generate auth` state under a `routes/`
 *       layout (which DOES route-resolve), confirming the scaffold's
 *       contents are correct + matching the redirect path silences
 *       the diagnostics through the working route-inference path.
 *
 * Deferred items surfaced:
 *  D-RI-PAGES — buildPageRouteTree must accept `/pages/` as a route
 *               prefix alongside `/routes/` for the v0.3 corpus
 *               convention to be reachable. Without it,
 *               `scrml generate auth`'s pages/auth/login.scrml scaffold
 *               cannot resolve the default `/login` redirect.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml, scanDirectory } from "../../src/api.js";

let TMP;

function setupTmp() {
  TMP = join(tmpdir(), `scrml-auth-tight-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(TMP, { recursive: true });
}

function teardownTmp() {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
}

/**
 * Invoke runGenerate with cwd set to TMP. Captures stdout/stderr.
 */
async function runGenerateInTmp(args = []) {
  const origCwd = process.cwd();
  process.chdir(TMP);

  const logs = [];
  const warns = [];
  const errors = [];

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  const origExit = process.exit;

  console.log = (...a) => logs.push(a.join(" "));
  console.warn = (...a) => warns.push(a.join(" "));
  console.error = (...a) => errors.push(a.join(" "));
  process.exit = () => { throw new Error("__EXIT_CAPTURED__"); };

  try {
    const { runGenerate } = await import("../../src/commands/generate.js");
    try {
      await runGenerate(args);
    } catch (err) {
      if (!/^__EXIT_/.test(String(err && err.message))) throw err;
    }
  } finally {
    console.log = origLog;
    console.warn = origWarn;
    console.error = origError;
    process.exit = origExit;
    process.chdir(origCwd);
  }

  return { logs, warns, errors };
}

// ---------------------------------------------------------------------------
// §1 — auth-required project without login page → tightened diagnostics
// ---------------------------------------------------------------------------

describe("§1 auth-required project without login page emits tightened diagnostics", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("compile fires both tightened messages naming `scrml generate auth` + `pages/auth/login.scrml`", async () => {
    const appPath = join(TMP, "app.scrml");
    writeFileSync(appPath, `<program auth="required">\n  <div>\n    <h1>Protected</h1>\n  </div>\n</program>\n`, "utf8");

    const result = await compileScrml({
      inputFiles: [appPath],
      outputDir: join(TMP, "dist"),
      write: false,
    });

    // Diagnostics live in warnings (info-level diagnostics are non-fatal
    // per S93 partition rule).
    const all = result.warnings || [];
    const info = all.filter(w => w.code === "I-AUTH-REDIRECT-UNRESOLVED");
    const warn = all.filter(w => w.code === "W-AUTH-LOGIN-MISSING");

    expect(info).toHaveLength(1);
    expect(warn).toHaveLength(1);

    // Tightened contract — both must contain the scaffold command + path.
    expect(warn[0].message).toContain("`scrml generate auth`");
    expect(warn[0].message).toContain("`pages/auth/login.scrml`");
    expect(info[0].message).toContain("`scrml generate auth`");
    expect(info[0].message).toContain("`pages/auth/login.scrml`");

    // De-jargonization — no internal OQ-A2-E reference.
    expect(info[0].message).not.toContain("OQ-A2-E");
  });
});

// ---------------------------------------------------------------------------
// §2 — generated scaffold contents are runnable scrml (not a placeholder)
// ---------------------------------------------------------------------------

describe("§2 generated scaffold contains a working login page (not a placeholder)", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  test("default scaffold has working form + server fn + canonical scrml absence shapes", async () => {
    writeFileSync(
      join(TMP, "app.scrml"),
      `<program auth="required">\n  <div>\n    <h1>Protected</h1>\n  </div>\n</program>\n`,
      "utf8",
    );

    await runGenerateInTmp(["auth"]);
    const scaffoldPath = join(TMP, "pages", "auth", "login.scrml");
    expect(existsSync(scaffoldPath)).toBe(true);

    const scaffolded = readFileSync(scaffoldPath, "utf8");

    // <page auth="optional"> override prevents the global gate
    // re-redirecting /login back to /login (infinite-loop avoidance).
    expect(scaffolded).toContain(`<page auth="optional">`);
    // verifyPassword (not raw bcrypt) — stdlib boundary.
    expect(scaffolded).toContain("verifyPassword");
    expect(scaffolded).toMatch(/import\s+\{\s*verifyPassword\s*\}\s+from\s+'scrml:auth'/);
    // Form scaffolding present.
    expect(scaffolded).toContain("bind:value=@email");
    expect(scaffolded).toContain("bind:value=@password");
    expect(scaffolded).toContain("onsubmit=submit()");
    // Server-side login fn with ?{} SQL query.
    expect(scaffolded).toMatch(/\?\{`SELECT\s+id,\s+email,\s+password_hash\s+FROM\s+users/);
    // Error-display path.
    expect(scaffolded).toContain("@errorMessage");
    // S89 absolute rule — no null / undefined.
    expect(scaffolded).not.toMatch(/\bnull\b/);
    expect(scaffolded).not.toMatch(/\bundefined\b/);
    // Canonical absence check (`is not`) + boolean negation via `!` (§42.10 / S188).
    expect(scaffolded).toContain("row is not");
    expect(scaffolded).toContain("if (!ok)");
    // No try/catch (canonical scrml).
    expect(scaffolded).not.toMatch(/\bcatch\b/);
    expect(scaffolded).not.toMatch(/\bthrow\b/);
  });

  test("non-default loginRedirect derives scaffold output to matching filesystem path", async () => {
    writeFileSync(
      join(TMP, "app.scrml"),
      `<program auth="required" loginRedirect="/signin">\n  <div><h1>Hi</h1></div>\n</program>\n`,
      "utf8",
    );

    const { logs } = await runGenerateInTmp(["auth"]);
    expect(existsSync(join(TMP, "pages", "signin.scrml"))).toBe(true);
    expect(existsSync(join(TMP, "pages", "auth", "login.scrml"))).toBe(false);
    // Next-steps echoes the actual login route.
    expect(logs.join("\n")).toContain("visit /signin");
  });
});

// ---------------------------------------------------------------------------
// §3 — diagnostics resolve when the redirect resolves via a routes/ layout
// ---------------------------------------------------------------------------

describe("§3 W-AUTH-LOGIN-MISSING silenced when redirect resolves via filesystem routing", () => {
  beforeEach(setupTmp);
  afterEach(teardownTmp);

  // route-inference's buildPageRouteTree keys on /routes/ today. To
  // exercise a "redirect-resolves" scenario end-to-end through real
  // compile + auth-graph, we use a routes/ layout (which the
  // route-inference page tree picks up correctly).
  //
  // The deferred D-RI-PAGES item tracks the v0.3 corpus convention
  // (pages/**) being wired through buildPageRouteTree.

  test("auth-required with a matching /login route page → no W-AUTH-LOGIN-MISSING", async () => {
    // app.scrml at TMP/routes/index.scrml + scrml/routes/login.scrml.
    // (Co-locating the program declaration at routes/index.scrml is the
    // closest routes/-keyed analogue of a single-file SPA.)
    mkdirSync(join(TMP, "routes"), { recursive: true });
    writeFileSync(
      join(TMP, "routes", "index.scrml"),
      `<program auth="required">\n  <div>\n    <h1>Home</h1>\n  </div>\n</program>\n`,
      "utf8",
    );
    writeFileSync(
      join(TMP, "routes", "login.scrml"),
      `<page auth="optional">\n  <div>\n    <h1>Sign in</h1>\n  </div>\n</page>\n`,
      "utf8",
    );

    const inputFiles = scanDirectory(TMP);
    const result = await compileScrml({
      inputFiles,
      outputDir: join(TMP, "dist"),
      write: false,
    });

    const all = result.warnings || [];
    expect(all.filter(w => w.code === "W-AUTH-LOGIN-MISSING")).toHaveLength(0);
    expect(all.filter(w => w.code === "I-AUTH-REDIRECT-UNRESOLVED")).toHaveLength(0);
  });
});
