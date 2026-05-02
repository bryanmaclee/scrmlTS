/**
 * P3.A — Multi-page broadcast integration tests.
 *
 * Per P3 deep-dive §6.3 (case 3 — multi-page broadcast verification).
 *
 * Verifies that when multiple consumer pages import the same exported
 * channel, every consumer subscribes to the same WS topic by virtue of
 * shared `name=` identity. This is the wire-layer-by-name property: the
 * channel CG emits identical `_scrml_ws/<name>` routes for each consumer,
 * and `@shared` mirrors stay in sync via the shared topic.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "p3a-multi-page-"));
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

describe("P3.A multi-page broadcast — case 3 of dive §6.3", () => {
  test("two consumer pages share the same wire identity by `name=`", () => {
    fx("a/channels.scrml", `export <channel name="chat" topic="lobby">
  ${"$"}{
    @shared messages = []
    server function postMessage(author, body) {
      messages = [...messages, { author, body, ts: Date.now() }]
    }
  }
</>
`);

    // Page A: publishes new messages
    const pageA = fx("a/page-a.scrml", `<program>
${"$"}{ import { chat } from './channels.scrml' }
<chat/>
<button onclick=postMessage("user-a", "hello from A")>Send from A</button>
<ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m.author}: ${"$"}{m.body}/ } }</>
</program>
`);

    // Page B: also imports + uses the same channel
    const pageB = fx("a/page-b.scrml", `<program>
${"$"}{ import { chat } from './channels.scrml' }
<chat/>
<button onclick=postMessage("user-b", "hello from B")>Send from B</button>
<ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m.author}: ${"$"}{m.body}/ } }</>
</program>
`);

    const result = compileScrml({
      inputFiles: [pageA, pageB],
      outputDir: join(TMP, "a-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);

    // Both pages must emit the same WS route name `chat`.
    const aOut = result.outputs?.get(pageA);
    const bOut = result.outputs?.get(pageB);
    expect(aOut?.clientJs).toMatch(/chat/);
    expect(bOut?.clientJs).toMatch(/chat/);
    // Both pages register the WS route on the server side.
    expect(aOut?.serverJs).toMatch(/_scrml_ws[\w/-]*chat/);
    expect(bOut?.serverJs).toMatch(/_scrml_ws[\w/-]*chat/);
  });

  test("3 consumer pages — all share the channel; PURE-CHANNEL-FILE doesn't emit duplicate routes", () => {
    fx("b/channels.scrml", `export <channel name="updates">
  ${"$"}{
    @shared count:number = 0
  }
</>
`);
    const pageA = fx("b/page-a.scrml", `<program>
${"$"}{ import { updates } from './channels.scrml' }
<updates/>
<p>A count: ${"$"}{@count}</p>
</program>
`);
    const pageB = fx("b/page-b.scrml", `<program>
${"$"}{ import { updates } from './channels.scrml' }
<updates/>
<p>B count: ${"$"}{@count}</p>
</program>
`);
    const pageC = fx("b/page-c.scrml", `<program>
${"$"}{ import { updates } from './channels.scrml' }
<updates/>
<p>C count: ${"$"}{@count}</p>
</program>
`);

    const result = compileScrml({
      inputFiles: [pageA, pageB, pageC],
      outputDir: join(TMP, "b-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);

    // All 3 consumers emit the route.
    const aOut = result.outputs?.get(pageA);
    const bOut = result.outputs?.get(pageB);
    const cOut = result.outputs?.get(pageC);
    expect(aOut?.serverJs).toMatch(/_scrml_ws[\w/-]*updates/);
    expect(bOut?.serverJs).toMatch(/_scrml_ws[\w/-]*updates/);
    expect(cOut?.serverJs).toMatch(/_scrml_ws[\w/-]*updates/);

    // PURE-CHANNEL-FILE: the source channels.scrml does NOT emit a route.
    const channelsOut = result.outputs?.get(join(TMP, "b/channels.scrml"));
    if (channelsOut) {
      expect(channelsOut.serverJs ?? "").not.toMatch(/_scrml_ws[\w/-]*updates/);
    }
  });

  test("eliminates ~180 LOC duplication: per-page channels coalesce to one declaration", () => {
    // This test validates the eliminated-duplication promise from
    // FRICTION.md §F-CHANNEL-003: 5 channels × ~3 redeclarations = ~180 LOC.
    fx("c/channels.scrml", `export <channel name="ch1">
  ${"$"}{ @shared a:number = 0 }
</>

export <channel name="ch2">
  ${"$"}{ @shared b:number = 0 }
</>

export <channel name="ch3">
  ${"$"}{ @shared c:number = 0 }
</>
`);
    // 3 pages, each importing all 3 channels.
    const pages = ["c/p1.scrml", "c/p2.scrml", "c/p3.scrml"].map(rel => fx(rel, `<program>
${"$"}{ import { ch1, ch2, ch3 } from './channels.scrml' }
<ch1/>
<ch2/>
<ch3/>
</program>
`));

    const result = compileScrml({
      inputFiles: pages,
      outputDir: join(TMP, "c-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);

    // Each page emits all 3 channels.
    for (const page of pages) {
      const out = result.outputs?.get(page);
      expect(out?.serverJs).toMatch(/_scrml_ws[\w/-]*ch1/);
      expect(out?.serverJs).toMatch(/_scrml_ws[\w/-]*ch2/);
      expect(out?.serverJs).toMatch(/_scrml_ws[\w/-]*ch3/);
    }
  });
});
