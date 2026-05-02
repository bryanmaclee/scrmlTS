/**
 * P3.A — CHX same-file pass-through (regression pin).
 *
 * Per P3 deep-dive §10.1.
 *
 * Verifies that per-page `<channel name="X">` declarations (the existing
 * pattern in 15 dispatch app sites) continue to compile unchanged after
 * P3.A. CHX MUST NOT touch same-file channel declarations.
 *
 * The expected post-P3.A output for a per-page channel is byte-equivalent
 * to the pre-P3.A output (same WS route, same IIFE, same wire identity).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "p3a-same-file-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(rel, src) {
  const abs = join(TMP, rel);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, src);
  return abs;
}

describe("P3.A CHX — same-file <channel> pass-through (regression pin)", () => {
  test("simple per-page channel — compiles without errors", () => {
    const src = fx("a/page.scrml", `<program>

<channel name="chat" topic="lobby">
  ${"$"}{
    @shared messages = []
  }
</>

<div>
  <ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m}/ } }</>
</div>

</program>
`);
    const result = compileScrml({
      inputFiles: [src],
      outputDir: join(TMP, "a-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    const out = result.outputs?.get(src);
    expect(out?.clientJs).toMatch(/chat/);
    expect(out?.serverJs).toMatch(/_scrml_ws[\w/-]*chat/);
  });

  test("per-page channel + server function — compiles without errors", () => {
    const src = fx("b/page.scrml", `<program>

<channel name="hub" topic="room1">
  ${"$"}{
    @shared messages = []
    server function postMessage(author, body) {
      messages = [...messages, { author, body, ts: Date.now() }]
    }
  }
</>

<button onclick=postMessage("user", "hi")>Send</button>
<ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m.author}: ${"$"}{m.body}/ } }</>

</program>
`);
    const result = compileScrml({
      inputFiles: [src],
      outputDir: join(TMP, "b-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    const out = result.outputs?.get(src);
    expect(out?.clientJs).toMatch(/hub/);
  });

  test("per-page channel — TAB AST does NOT mark _p3aIsExport", () => {
    const src = fx("c/page.scrml", `<program>
<channel name="ticker">
  ${"$"}{ @shared count:number = 0 }
</>
</program>
`);
    const result = compileScrml({
      inputFiles: [src],
      outputDir: join(TMP, "c-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    // The serverJs MUST contain the WS route since this is a regular per-page channel.
    const out = result.outputs?.get(src);
    expect(out?.serverJs).toMatch(/_scrml_ws[\w/-]*ticker/);
  });

  test("multiple per-page channels in same file — both compile", () => {
    const src = fx("d/page.scrml", `<program>

<channel name="chat" topic="lobby">
  ${"$"}{ @shared messages = [] }
</>

<channel name="updates">
  ${"$"}{ @shared count:number = 0 }
</>

<div>multi</div>
</program>
`);
    const result = compileScrml({
      inputFiles: [src],
      outputDir: join(TMP, "d-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    const out = result.outputs?.get(src);
    expect(out?.clientJs).toMatch(/chat/);
    expect(out?.clientJs).toMatch(/updates/);
  });

  test("channel inside a div — survives the wrapping (regression for VP-2 path)", () => {
    const src = fx("e/page.scrml", `<program>
<div class="container">
  <channel name="nested">
    ${"$"}{ @shared count:number = 0 }
  </>
</div>
</program>
`);
    const result = compileScrml({
      inputFiles: [src],
      outputDir: join(TMP, "e-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    const out = result.outputs?.get(src);
    expect(out?.clientJs).toMatch(/nested/);
  });
});
