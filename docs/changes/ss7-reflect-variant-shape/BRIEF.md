# BRIEF — ss7 item 1: g-reflect-variant-shape-inconsistent

**Dispatched by:** sPA ss7 (meta-reflect-l22) · **Branch to land on:** `spa/ss7`
**Agent:** scrml-js-codegen-engineer · isolation:worktree · model opus

## Diagnosis (already done — do NOT re-derive; verify then implement)

`reflect(EnumType).variants` returns **two different element shapes** depending on whether the
`^{}` block is evaluated at compile-time vs runtime:

- **Compile-time** `^{}` `reflect(Status).variants` → `compiler/src/meta-checker.ts:1463-1464`
  normalizes to **bare strings** `["Draft","Published",...]`. CORRECT.
- **Runtime** `meta.types.reflect("Status").variants` → `compiler/src/codegen/emit-logic.ts`
  `serializeTypeEntry()` :644-648 emits **`{name:"Draft"}` objects**. SPEC-DIVERGENT.

### Why strings is the answer (verified, not asserted)
- **SPEC §14.4.2** (SPEC.md:7659-7665): `.variants` "returns an array of all variant **names**";
  for unit variants "each element is the variant value itself" (a string in generated JS per §14.4.3).
- **Compile-time reflect** already returns strings (test-locked: `self-host-meta-checker.test.js:843`
  `expect(result.variants).toContain("Draft")`).
- **All corpus consumers** read variants as bare strings, never `.name`:
  `samples/compilation-tests/meta-001-reflect-enum.scrml:16` (`emit(\`<li>${v}</li>\`)`),
  `meta-007-reflect-enum-buttons.scrml` (`for (let f of filters) ... ${f}`),
  `meta-010-reflect-with-config.scrml` (`for (let theme of themeVariants) ... ${theme}`).
- The `{name}` runtime shape is NOT carrying payload metadata — `serializeTypeEntry` drops `payload`
  entirely, so `{name:"X"}` carries identical info to `"X"`, just wrapped. The "extensibility"
  hypothesis is refuted. It is purely an inconsistency, with a test locking the divergence (S96
  pattern: locked test locking spec-divergent behavior).

## The fix (minimal-blast — runtime-observable surface only)

**File 1 — `compiler/src/codegen/emit-logic.ts`, `serializeTypeEntry()` (~:643-648, the `enum` branch):**
Change the variants emit from `{name: ...}` objects to bare strings. Make it robust to BOTH input
shapes (the intermediate `TypeRegistryEntry.variants` admits `string | {name}`), mirroring the
existing normalize pattern at meta-checker.ts:1464 and :2210:

```ts
if (entry.kind === "enum") {
  const variants = (entry.variants as Array<{ name: string } | string> | undefined) ?? [];
  const variantStrings = variants.map(v =>
    JSON.stringify(typeof v === "string" ? v : v.name)
  );
  parts.push(`variants: [${variantStrings.join(", ")}]`);
}
```

Do NOT touch `serializeTypeRegistry` (meta-checker.ts:2209) — the intermediate `{name}` is
compiler-internal and harmless; the union-robust emit reads `v.name` from it fine. Do NOT touch
`toTypeDescriptor` / `type-encoding-phase3.test.js` — separate type-encoding surface, out of scope.

**File 2 (COUPLED — same commit) — `compiler/tests/unit/meta-type-registry-emission.test.js`:**
The test at ~:82-94 (`"enum variants are emitted as array of name objects"`) locks the divergent
shape. Update it to assert bare strings, and rename it to reflect the corrected contract:

```js
test("enum variants are emitted as bare name strings (§14.4.2)", () => {
  const node = makeMetaNodeWithTypes([makeBareExpr("x()")], 2, [
    { name: "Status", kind: "enum", variants: [{ name: "Active" }, { name: "Inactive" }] },
  ]);
  const output = emitLogicNode(node);
  expect(output).toContain('"Active"');
  expect(output).toContain('"Inactive"');
  expect(output).not.toContain('{name: "Active"}');
});
```
(The TR-2 test at :65-80 already asserts `toContain('"Red"')` etc. — still passes with bare strings.)

## Verify (R26 — empirical, before claiming DONE)
1. `bun test compiler/tests/unit/meta-type-registry-emission.test.js compiler/tests/unit/self-host-meta-checker.test.js compiler/tests/unit/meta-classifier-emit-raw.test.js` — all green.
2. Full suite `bun run test` (incl. browser) — green, no new failures. If any other test asserted
   the old `{name}` runtime shape, report it (do NOT mass-edit beyond the two files without flagging).
3. Spot-compile a sample that emits the registry literal and confirm the emitted JS shows
   `variants: ["Active", ...]` not `variants: [{name: ...}]`.

## Discipline
- F4 startup-verification: on boot, `pwd && git rev-parse --abbrev-ref HEAD` — confirm you are in
  YOUR isolated agent worktree (`.claude/worktrees/agent-*`), NOT main, NOT scrml-spa-ss7. ALL
  Write/Edit/Bash-writes use worktree-absolute paths under that CWD. NEVER write to a
  `/home/bryan-maclee/scrmlMaster/scrml/<path>` (main) absolute path.
- Commit-discipline: code + its coupled test = ONE commit (S113). Commit incrementally; `git status`
  clean before reporting DONE. WIP commits fine. NEVER `--no-verify` (pre-commit hook is the gate).
- Report: final commit SHA(s), files changed, suite result (pass counts), and any test you found
  asserting the old shape.
