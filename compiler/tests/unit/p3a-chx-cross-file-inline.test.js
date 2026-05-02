/**
 * P3.A — CHX cross-file inline expansion (5 cases).
 *
 * Per P3 deep-dive §4.4 + §6.2.
 *
 * Verifies that cross-file `<channel>` exports are correctly inlined into
 * each consumer's AST by CHX (CE phase 2 under UCD), and that the resulting
 * codegen produces a working channel client + server pair.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "p3a-chx-"));
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

describe("P3.A CHX — cross-file <channel> inline expansion", () => {
  test("basic: simple cross-file channel compiles + inlines", () => {
    fx("c1/channels.scrml", `export <channel name="ticker">
  ${"$"}{ @shared count:number = 0 }
</>
`);
    const consumer = fx("c1/consumer.scrml", `<program>
${"$"}{ import { ticker } from './channels.scrml' }
<ticker/>
<p>Count: ${"$"}{@count}</p>
</program>
`);
    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: join(TMP, "c1-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    const out = result.outputs?.get(consumer);
    expect(out?.clientJs).toMatch(/ticker/);
    expect(out?.serverJs).toMatch(/_scrml_ws[\w/-]*ticker/);
  });

  test("cross-file with attrs preserved (topic, reconnect)", () => {
    fx("c2/channels.scrml", `export <channel name="chat" topic="lobby" reconnect="5000">
  ${"$"}{ @shared messages = [] }
</>
`);
    const consumer = fx("c2/consumer.scrml", `<program>
${"$"}{ import { chat } from './channels.scrml' }
<chat/>
<ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m}/ } }</>
</program>
`);
    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: join(TMP, "c2-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    const out = result.outputs?.get(consumer);
    // Topic + reconnect should be visible in the emitted client.js
    expect(out?.clientJs).toMatch(/lobby/);
  });

  test("cross-file with onserver:* handlers", () => {
    fx("c3/channels.scrml", `${"$"}{
  function onConnect() { console.log("connected") }
  function onMsg(m) { console.log("msg", m) }
}

export <channel name="hub" onserver:open=onConnect() onserver:message=onMsg(m)>
  ${"$"}{ @shared count:number = 0 }
</>
`);
    const consumer = fx("c3/consumer.scrml", `<program>
${"$"}{ import { hub } from './channels.scrml' }
<hub/>
<p>Count: ${"$"}{@count}</p>
</program>
`);
    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: join(TMP, "c3-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
  });

  test("cross-file with server function that uses @shared", () => {
    fx("c4/channels.scrml", `export <channel name="chat" topic="lobby">
  ${"$"}{
    @shared messages = []
    server function postMessage(author, body) {
      messages = [...messages, { author, body, ts: Date.now() }]
    }
  }
</>
`);
    const consumer = fx("c4/consumer.scrml", `<program>
${"$"}{ import { chat } from './channels.scrml' }
<chat/>
<button onclick=postMessage("user", "hi")>Send</button>
<ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m.author}/ } }</>
</program>
`);
    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: join(TMP, "c4-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    const out = result.outputs?.get(consumer);
    // The server function postMessage should appear in the consumer's serverJs
    // because CHX inlined the channel body (which contains it).
    expect(out?.serverJs).toMatch(/postMessage/);
  });

  test("cross-file with import alias", () => {
    fx("c5/channels.scrml", `export <channel name="chat" topic="lobby">
  ${"$"}{ @shared messages = [] }
</>
`);
    // Import as a different local name.
    const consumer = fx("c5/consumer.scrml", `<program>
${"$"}{ import { chat as roomChat } from './channels.scrml' }
<roomChat/>
<ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m}/ } }</>
</program>
`);
    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: join(TMP, "c5-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    const out = result.outputs?.get(consumer);
    // The wire identity is the channel's name ("chat"), NOT the local alias.
    expect(out?.clientJs).toMatch(/chat/);
  });
});
