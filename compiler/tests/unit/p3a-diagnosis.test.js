/**
 * P3.A diagnosis test — F-CHANNEL-003 closure proof.
 *
 * Pre-P3.A, exporting `<channel name="X" ...>...</>` from one file and
 * importing in another failed with `E-IMPORT-001` + cascade. Post-P3.A,
 * the same shape compiles clean and the consumer's import-reference is
 * inlined as a `<channel>` markup node by CHX (CE phase 2 under UCD).
 *
 * Per P3 deep-dive §4.4 + §6.2 worked example.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "p3a-diagnosis-"));
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

describe("P3.A diagnosis — cross-file <channel> export/import", () => {
  test("F-CHANNEL-003 closure: cross-file channel export+import compiles cleanly", () => {
    fx("d1/channels.scrml", `export <channel name="chat" topic="lobby">
  ${"$"}{
    @shared messages = []
    server function postMessage(author, body) {
      messages = [...messages, { author, body, ts: Date.now() }]
    }
  }
</>
`);
    const consumer = fx("d1/consumer.scrml", `<program>

${"$"}{ import { chat } from './channels.scrml' }

<chat/>

<button onclick=postMessage("user", "hello")>Send</button>
<ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m.author}: ${"$"}{m.body}/ } }</>

</program>
`);

    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: join(TMP, "d1-out"),
      write: false,
      log: () => {},
    });

    // Post-P3.A acceptance: zero errors.
    expect(result.errors ?? []).toEqual([]);

    // The consumer's emitted client.js contains the channel topic name
    // (proves CHX inlined the channel and CG ran on it).
    const consumerOut = result.outputs?.get(consumer);
    expect(consumerOut).toBeDefined();
    const cj = consumerOut?.clientJs ?? "";
    expect(cj.length).toBeGreaterThan(0);
    expect(cj).toMatch(/chat/);

    // The source channels.scrml does NOT emit a duplicate WS route
    // (PURE-CHANNEL-FILE pattern — its exporter-side <channel> is
    // skipped by emit-channel because `_p3aIsExport` is set).
    const channelsOut = result.outputs?.get(join(TMP, "d1/channels.scrml"));
    if (channelsOut) {
      const sj = channelsOut.serverJs ?? "";
      // The source's serverJs MUST NOT register the /_scrml_ws/chat route.
      expect(sj).not.toMatch(/_scrml_ws[\w/-]*chat/);
    }
  });
});
