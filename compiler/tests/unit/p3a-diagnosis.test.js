/**
 * P3.A diagnosis test — demonstrates F-CHANNEL-003 mechanism today.
 *
 * Today (pre-P3.A): exporting `<channel name="X" ...>...</>` from one file
 * and importing in another fails. The TAB pre-pass `liftBareDeclarations`
 * detects the trailing bare-`export` text + following PascalCase markup
 * pattern (component case), but does NOT detect the trailing bare-`export`
 * text + following channel markup pattern (block.isComponent === false).
 *
 * Concrete failure mode (probed 2026-05-02 against base 4a36ae3):
 *   Compiling a consumer that imports a channel from a separate file
 *   produces:
 *     - E-IMPORT-001: `export` declaration outside ${ } logic block
 *       (TAB rejected the bare `export` text without matching it to the
 *       channel markup that follows)
 *     - E-IMPORT-004: name not exported (cascade — exporter never registered)
 *     - E-RI-002, E-SCOPE-001 (cascading downstream errors)
 *
 * Post-P3.A: this fixture compiles cleanly (zero errors). The consumer's
 * `<dispatchBoard/>` tag is replaced (by CHX in CE phase 2) with an inlined
 * copy of the source's `<channel name="dispatch-board" topic=@dispatcherId>{...}`
 * markup; channel CG runs unchanged on the inlined node.
 *
 * Per P3 deep-dive §6.2 worked example.
 *
 * Status: SKIPPED until CHX (CE phase 2) lands. The unskipped acceptance
 * tests live in `p3a-chx-cross-file-inline.test.js` +
 * `p3a-cross-file-multi-page-broadcast.test.js`.
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
  test.skip("after P3.A — cross-file channel export+import compiles cleanly (post-fix expectation)", () => {
    fx("d1/channels.scrml", `${"$"}{ @let dispatcherId = "test-user" }

export <channel name="dispatch-board" topic=@dispatcherId>
  ${"$"}{
    @shared loads:list = []
    server function refreshBoard() {
      @loads = ["a", "b", "c"]
      broadcast({ type: "refresh", count: 3 })
    }
  }
</>
`);
    const consumer = fx("d1/consumer.scrml", `<page>

${"$"}{ import { "dispatch-board" as dispatchBoard } from './channels.scrml' }

<dispatchBoard/>

<button onclick=refreshBoard()>Refresh</button>
<ul>${"$"}{ for (l of @loads) { lift <li>${"$"}{l}/ } }</>

</page>
`);

    const outDir = join(TMP, "d1-out");
    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: outDir,
      write: false,
      log: () => {},
    });

    // Post-P3.A acceptance: zero errors; channel topic name visible in the
    // emitted client.js (proves CHX inlined the channel and CG ran on it).
    expect(result.errors ?? []).toEqual([]);

    // Find the consumer's emitted client.js.
    const consumerClient = (result.outputs ?? []).find(
      (o) => (o.filePath || "").endsWith("consumer.client.js")
    );
    if (consumerClient) {
      const js = consumerClient.contents || consumerClient.code || "";
      expect(js).toMatch(/dispatch[-_]board/);
    }
  });
});
