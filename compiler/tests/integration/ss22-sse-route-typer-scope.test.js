/**
 * ss22 item 1 — g-sse-route-object-typer-scope (typer-scope false-fire).
 *
 * A `server function*` (SSE generator) body that reads `route.query` /
 * `route.lastEventId` previously false-fired E-SCOPE-001 ("Undeclared
 * identifier `route`"). Codegen SYNTHESIZES a `route` object
 * (`{ query, lastEventId }`) into the generated SSE handler (emit-server.ts
 * SSE branch), but the typer never registered it in the server-fn (generator)
 * scope, so the scope-check pass flagged a `route` the codegen will provide.
 *
 * Fix: type-system.ts function-decl case binds `route` as an auto-injected
 * local for SSE generators ONLY (server boundary + `isGenerator`), mirroring
 * the §38.6 channel-builtin auto-injection. Scoped to SSE generators — does
 * NOT broaden to non-SSE server fns (which synthesize no `route`).
 *
 * Repro provenance:
 * docs/changes/escalation-2-sse-author-route-app-mode-2026-06-23/repro/.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "ss22-sse-route-scope-"));
});

afterAll(() => {
  if (TMP) rmSync(TMP, { recursive: true, force: true });
});

/** Compile a source string through the full pipeline (incl. typer). */
function compile(name, source) {
  const filePath = join(TMP, `${name}.scrml`);
  writeFileSync(filePath, source);
  const result = compileScrml({
    inputFiles: [filePath],
    outputDir: join(TMP, `${name}.dist`),
    write: false,
    log: () => {},
  });
  const scopeErrors = [...(result.errors || []), ...(result.warnings || [])]
    .filter((d) => d.code === "E-SCOPE-001");
  return { result, scopeErrors };
}

describe("ss22 item 1 — SSE generator `route` is in typer scope", () => {
  test("SSE generator with author route= reading route.lastEventId does NOT fire E-SCOPE-001", () => {
    const src = `<program>

\${
  server function* fspTicks() route="/fsp/ticks" {
    let n = Number(route.lastEventId ?? 0)
    for (let i = n; i < n + 5; i = i + 1) {
      yield { event: "tick", id: i, data: i }
    }
  }
}

<h1>Ticks host</h1>
</program>`;
    const { scopeErrors } = compile("sse-route-only", src);
    const routeFires = scopeErrors.filter((d) => /\broute\b/.test(d.message ?? ""));
    expect(routeFires).toHaveLength(0);
  });

  test("SSE generator WITHOUT author route= reading route.query does NOT fire E-SCOPE-001", () => {
    const src = `<program>

\${
  server function* fspStream() {
    let q = route.query
    let since = Number(route.lastEventId ?? 0)
    for (let i = since; i < since + 3; i = i + 1) {
      yield { event: "row", id: i, data: q }
    }
  }
}

<h1>host</h1>
</program>`;
    const { scopeErrors } = compile("sse-noroute", src);
    const routeFires = scopeErrors.filter((d) => /\broute\b/.test(d.message ?? ""));
    expect(routeFires).toHaveLength(0);
  });

  test("a genuinely-undeclared identifier in an SSE generator body STILL fires E-SCOPE-001 (no over-allowlist)", () => {
    const src = `<program>

\${
  server function* fspBad() route="/fsp/bad" {
    let n = Number(route.lastEventId ?? 0)
    let bad = bogusUndeclared + n
    for (let i = n; i < n + 5; i = i + 1) {
      yield { event: "tick", id: i, data: bad }
    }
  }
}

<h1>Bad host</h1>
</program>`;
    const { scopeErrors } = compile("sse-undeclared", src);
    const bogusFires = scopeErrors.filter((d) => /\bbogusUndeclared\b/.test(d.message ?? ""));
    expect(bogusFires.length).toBeGreaterThan(0);
  });

  test("a NON-SSE server fn reading `route` STILL fires E-SCOPE-001 (fix scoped to SSE generators only)", () => {
    const src = `<program>

\${
  server function getThing() {
    let x = route.lastEventId
    return x
  }
}

<h1>host</h1>
</program>`;
    const { scopeErrors } = compile("nonsse-route", src);
    const routeFires = scopeErrors.filter((d) => /\broute\b/.test(d.message ?? ""));
    expect(routeFires.length).toBeGreaterThan(0);
  });
});
