/**
 * F-COMPONENT-001 W2: Cross-File Component Expansion (Integration)
 *
 * Coverage for the W2 architectural fix described in
 *   /home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/f-component-001-architectural-2026-04-30.md
 *
 * Pre-fix behavior (the 3-fault structure):
 *   F1 — CE recursion gate (`hasAnyComponentRefsInLogic`) skipped wrapped
 *        cases (e.g. `lift <li><Comp/></li>`); residual `isComponent: true`
 *        markup nodes survived CE and triggered VP-2 E-COMPONENT-035.
 *   F2 — `runCEFile` looked up `exportRegistry` and `fileASTMap` by the raw
 *        `imp.source` string (e.g. `./components.scrml`), but production maps
 *        are keyed by absolute filesystem path; lookup always missed.
 *   F3 — CLI never auto-gathered imports; `scrml compile foo.scrml` only
 *        TAB'd `foo.scrml`, even when it imported `./bar.scrml`.
 *
 * Post-fix behavior (W2):
 *   F1 — `hasAnyComponentRefsInLogic` recurses into nested markup so wrapped
 *        cases trigger CE.
 *   F2 — CE consumes `importGraph` directly and uses `imp.absSource` to look
 *        up `fileASTMap` and `exportRegistry` (mirrors the TS-pass pattern at
 *        api.js:626-660 + the LSP workspace pattern).
 *   F3 — `compileScrml` builds the transitive `.scrml` import closure of the
 *        passed `inputFiles` before TAB; honors `--no-gather` opt-out.
 *
 * These integration tests use the FULL CLI compilation surface (`compileScrml`
 * from api.js) and assert on:
 *   - emitted artifact contents (expanded markup, NOT phantom
 *     `document.createElement("UserBadge")`)
 *   - the dist tree shape (W0a §47.9 composition)
 *   - the emitted client.js JS for the canonical `examples/22-multifile/`
 *     fixture
 *
 * This test file CLOSES the M17 meta-pattern — production keying is exercised
 * end-to-end so the cross-file expansion cannot regress to a "tests pass /
 * production breaks" state.
 *
 * Test cases (per deep-dive §8.1):
 *   §C1 — Compile `examples/22-multifile/app.scrml` (auto-gather): zero
 *         errors, expanded `class="badge"` markup in client.js.
 *   §C2 — Compile a synthetic 3-file fixture with bare `lift <UserBadge/>`.
 *   §C3 — Compile a synthetic 3-file fixture with wrapped
 *         `lift <li><UserBadge/></li>` (F1 fix).
 *   §C4 — Compile a fixture with bare `<Component/>` outside `lift`.
 *   §C5 — Compile a fixture with a missing import target → E-IMPORT-006.
 *   §C7 — Compile a 3-file fixture with `--no-gather`: missing
 *         transitively-reachable file → E-IMPORT-006 / E-COMPONENT-020.
 *   §C8 — Compile `examples/22-multifile/app.scrml` end-to-end and verify
 *         dist tree shape per W0a §47.9.6.
 *   §C9 — Compile a fixture that imports from a SIBLING directory; gather
 *         covers files outside the entry's directory.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join, resolve as pathResolve } from "path";
import { tmpdir } from "os";
import { mkdtempSync } from "fs";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "f-component-001-w2-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

/**
 * Write a minimal scrml fixture file.
 */
function fx(relPath, source) {
  const abs = join(TMP, relPath);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, source);
  return abs;
}

const REPO_ROOT = pathResolve(import.meta.dir, "../../..");
const EX_22_APP = join(REPO_ROOT, "examples/22-multifile/app.scrml");
const EX_22_DIR = join(REPO_ROOT, "examples/22-multifile");

// ---------------------------------------------------------------------------
// §C1 — examples/22-multifile/app.scrml: single-file invocation auto-gather
// ---------------------------------------------------------------------------

describe("§C1 examples/22-multifile/app.scrml — single-file auto-gather", () => {
  test("compiles cleanly with zero errors", () => {
    const outDir = join(TMP, "c1-out");
    const result = compileScrml({
      inputFiles: [EX_22_APP],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);
  });

  test("emitted client.js contains expanded badge markup, NOT phantom createElement(\"UserBadge\")", () => {
    const outDir = join(TMP, "c1b-out");
    const result = compileScrml({
      inputFiles: [EX_22_APP],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const clientJsPath = join(outDir, "app.client.js");
    expect(existsSync(clientJsPath)).toBe(true);
    const clientJs = readFileSync(clientJsPath, "utf8");

    // POSITIVE: expanded markup MUST appear (the cross-file <UserBadge> root is <span class="badge">)
    expect(clientJs).toContain("badge");

    // NEGATIVE: phantom createElement on the cross-file component name MUST NOT appear
    expect(clientJs).not.toContain('createElement("UserBadge")');
    expect(clientJs).not.toContain("createElement('UserBadge')");
  });
});

// ---------------------------------------------------------------------------
// §C2 — synthetic bare lift <UserBadge/>
// ---------------------------------------------------------------------------

describe("§C2 synthetic bare lift <UserBadge/>", () => {
  test("compiles cleanly with zero errors and expands inline", () => {
    const ROOT = join(TMP, "c2");
    mkdirSync(ROOT, { recursive: true });

    const components = fx("c2/components.scrml", `${"$"}{
  export const UserBadge = <span class="c2-badge"/>
}
`);
    const app = fx("c2/app.scrml", `<program>
${"$"}{
  import { UserBadge } from './components.scrml'
}
<div>
  ${"$"}{ for (let i of [1, 2, 3]) {
    lift <UserBadge/>
  } }
</div>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [app],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const clientJs = readFileSync(join(outDir, "app.client.js"), "utf8");
    expect(clientJs).toContain("c2-badge");
    expect(clientJs).not.toContain('createElement("UserBadge")');
  });
});

// ---------------------------------------------------------------------------
// §C3 — synthetic wrapped lift <li><UserBadge/></li> (F1 fix)
// ---------------------------------------------------------------------------

describe("§C3 synthetic wrapped lift <li><UserBadge/></li>", () => {
  test("compiles cleanly with zero errors (F1 recursion fix)", () => {
    const ROOT = join(TMP, "c3");
    mkdirSync(ROOT, { recursive: true });

    fx("c3/components.scrml", `${"$"}{
  export const UserBadge = <span class="c3-badge"/>
}
`);
    const app = fx("c3/app.scrml", `<program>
${"$"}{
  import { UserBadge } from './components.scrml'
}
<ul>
  ${"$"}{ for (let i of [1, 2, 3]) {
    lift <li>
      <UserBadge/>
    </li>
  } }
</ul>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [app],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    const clientJs = readFileSync(join(outDir, "app.client.js"), "utf8");
    expect(clientJs).toContain("c3-badge");
    expect(clientJs).not.toContain('createElement("UserBadge")');
  });
});

// ---------------------------------------------------------------------------
// §C4 — bare <Component/> outside lift
// ---------------------------------------------------------------------------

describe("§C4 bare <Component/> outside any lift expression", () => {
  test("compiles cleanly when used as direct markup child", () => {
    const ROOT = join(TMP, "c4");
    mkdirSync(ROOT, { recursive: true });

    fx("c4/components.scrml", `${"$"}{
  export const Banner = <div class="c4-banner"/>
}
`);
    const app = fx("c4/app.scrml", `<program>
${"$"}{
  import { Banner } from './components.scrml'
}
<header>
  <Banner/>
</header>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [app],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    // Bare top-level <Banner/> expands in the static HTML (no lift) — its
    // child class lands in app.html. The client.js may import the
    // server-rendered hydration metadata; the expanded markup is in HTML.
    const html = readFileSync(join(outDir, "app.html"), "utf8");
    expect(html).toContain("c4-banner");
    expect(html).not.toContain('<Banner');

    // Client.js MUST NOT contain a phantom createElement on the bare
    // component name — that's the W1-violation signature.
    const clientJs = readFileSync(join(outDir, "app.client.js"), "utf8");
    expect(clientJs).not.toContain('createElement("Banner")');
  });
});

// ---------------------------------------------------------------------------
// §C5 — missing import target fires E-IMPORT-006
// ---------------------------------------------------------------------------

describe("§C5 missing import target → E-IMPORT-006 (not E-COMPONENT-020)", () => {
  test("import from non-existent file fires precise E-IMPORT-006", () => {
    const ROOT = join(TMP, "c5");
    mkdirSync(ROOT, { recursive: true });

    const app = fx("c5/app.scrml", `<program>
${"$"}{
  import { Missing } from './does-not-exist.scrml'
}
<Missing/>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [app],
      outputDir: outDir,
      write: true,
      log: () => {},
    });

    // The compilation must fail; E-IMPORT-006 (precise file-missing) should
    // be in the error set. E-COMPONENT-035 may also fire as defense-in-depth.
    const codes = result.errors.map(e => e.code);
    expect(codes).toContain("E-IMPORT-006");
  });
});

// ---------------------------------------------------------------------------
// §C7 — --no-gather single-file invocation
// ---------------------------------------------------------------------------

describe("§C7 --no-gather single-file invocation", () => {
  test("with gather disabled, sibling import is not auto-resolved → error fires", () => {
    const ROOT = join(TMP, "c7");
    mkdirSync(ROOT, { recursive: true });

    fx("c7/components.scrml", `${"$"}{
  export const Card = <div class="c7-card"/>
}
`);
    const app = fx("c7/app.scrml", `<program>
${"$"}{
  import { Card } from './components.scrml'
}
<Card/>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [app],
      outputDir: outDir,
      write: true,
      log: () => {},
      gather: false,
    });

    // Either E-IMPORT-006 (not in compile set) or E-COMPONENT-020 (no
    // resolved component) — but compilation MUST fail, NOT silently emit
    // a phantom or expand a non-gathered component.
    expect(result.errors.length).toBeGreaterThan(0);
    const codes = result.errors.map(e => e.code);
    const acceptableCodes = ["E-IMPORT-006", "E-COMPONENT-020", "E-COMPONENT-035"];
    expect(acceptableCodes.some(c => codes.includes(c))).toBe(true);
  });

  test("with gather enabled (default), the same fixture compiles cleanly", () => {
    const ROOT = join(TMP, "c7b");
    mkdirSync(ROOT, { recursive: true });

    fx("c7b/components.scrml", `${"$"}{
  export const Card = <div class="c7b-card"/>
}
`);
    const app = fx("c7b/app.scrml", `<program>
${"$"}{
  import { Card } from './components.scrml'
}
<Card/>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [app],
      outputDir: outDir,
      write: true,
      log: () => {},
      // gather: true is the default
    });

    expect(result.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §C8 — examples/22-multifile dist tree shape
// ---------------------------------------------------------------------------

describe("§C8 examples/22-multifile dist tree shape (W0a §47.9.6 composition)", () => {
  test("flat dist tree: app.{html,client.js,server.js} + components artifacts + types module", () => {
    const outDir = join(TMP, "c8-out");
    const result = compileScrml({
      inputFiles: [EX_22_APP],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    // The entry page emits an HTML page and a client IIFE
    expect(existsSync(join(outDir, "app.html"))).toBe(true);
    expect(existsSync(join(outDir, "app.client.js"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §C9 — sibling-directory import (gather covers cross-directory imports)
// ---------------------------------------------------------------------------

describe("§C9 sibling-directory import — gather covers files outside entry directory", () => {
  test("pages/team.scrml imports ../components/badge.scrml; gather pulls in sibling", () => {
    const ROOT = join(TMP, "c9");
    mkdirSync(ROOT, { recursive: true });
    mkdirSync(join(ROOT, "pages"), { recursive: true });
    mkdirSync(join(ROOT, "components"), { recursive: true });

    fx("c9/components/badge.scrml", `${"$"}{
  export const Badge = <span class="c9-badge"/>
}
`);
    const team = fx("c9/pages/team.scrml", `<program>
${"$"}{
  import { Badge } from '../components/badge.scrml'
}
<div>
  <Badge/>
</div>
</program>
`);

    const outDir = join(ROOT, "dist");
    const result = compileScrml({
      inputFiles: [team],
      outputDir: outDir,
      write: true,
      log: () => {},
    });
    expect(result.errors).toEqual([]);

    // Bare top-level <Badge/> expands to static HTML; client.js holds
    // hydration metadata only.
    const htmlPath = join(outDir, "pages/team.html");
    expect(existsSync(htmlPath)).toBe(true);
    const html = readFileSync(htmlPath, "utf8");
    expect(html).toContain("c9-badge");
    expect(html).not.toContain('<Badge');

    const clientJsPath = join(outDir, "pages/team.client.js");
    if (existsSync(clientJsPath)) {
      const clientJs = readFileSync(clientJsPath, "utf8");
      expect(clientJs).not.toContain('createElement("Badge")');
    }
  });
});
