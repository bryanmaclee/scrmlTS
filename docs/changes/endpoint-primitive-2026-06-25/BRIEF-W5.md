# BRIEF — W5 `<endpoint>` example + integration + banner flip (ss18 item 4, SCOPED)

**Dispatched by sPA ss18 · branch `spa/ss18` (W2+W3+W4 landed) · S219.** Agent: `scrml-js-codegen-engineer`, `isolation: worktree`, `model: opus`.

## SCOPE NOTE (read first)
The list's W5 names "the flogence conformance smoke (`fsp-wire-smoke` 11 assertions re-hosted against the scrml-served `/fsp`)". After scoping (sPA): the full flogence re-host is **CROSS-REPO + carries a wire-shape-mapping design decision** (JSON-RPC `{method, params}` ↔ `<endpoint>` parseVariant enum-discriminator decode; flogence-domain) and **flogence retiring its production `scripts/fsp-wire.ts`** — both belong to PA/flogence coordination, NOT this scrml-compiler sPA. **The sPA ESCALATES that part to the PA.** Your W5 deliverables are the **scrml-compiler-side** parts below, which prove the `<endpoint>` request/response capability the conformance bar rests on, WITHOUT touching the flogence repo.

## Your deliverables (scrml-repo only)
1. **`examples/33-endpoint.scrml`** — a worked `<endpoint>` over a small enum. Template: `examples/32-external-api.scrml` (rich design-narrative comments). The narrative: `<endpoint>` is the typed **INBOUND** mirror of §60 `<api>` (outbound) — a foreign client calls a scrml-served route; the compiler owns the decode + exhaustive dispatch + JSON envelope; the author fills per-variant arms. Use the SCOPE's `FspMethod`-style enum (e.g. a small JSON-RPC-convention-shaped enum: `{ FleetStatus, Dispatch(prompt: string, project: string), DeltaSince(seq: int) }`) with `:`-shorthand arms returning typed values. Show: the inbound-honesty guarantee (add a variant → compile error without its arm, §61.4), `path=`/`method=`, server-only (no client stub, §61.6), CSRF-exempt (§61.7), the direct-serialize envelope (§61.5 — author models the JSON-RPC wire by returning the exact shape; JSON-RPC is a convention, not a baked-in mode). MUST compile clean (`compileScrml` exit-0) — include any `${ fn … }`/types the arms call. Verify it compiles + emits a `.server.js` with the route at the declared `path=`.
2. **Integration test `compiler/tests/integration/endpoint-conformance-integration.test.js`** — the request/response conformance PROOF (the scrml-side analog of flogence's 9 non-SSE `fsp-wire-smoke` assertions). Compile a multi-method `<endpoint>` (model the FSP request/response surface: several methods incl. payload-bearing ones), import the emitted `fetch`/handler, and assert end-to-end over the wire:
   - Each method dispatches to its arm and returns the typed value serialized directly as JSON (200) — the "8 methods over the wire" analog.
   - A malformed/unknown-variant request → the compiler-owned `{ error: { kind, message } }` (400) — the decode-failure path.
   - A method whose arm models a JSON-RPC error result (the author returns an error-shaped value) serializes verbatim (200, author-owned wire) — the "terminal-reject propagates over the wire" analog (the error is modeled in the return value per §61.5, NOT the compiler decode-error).
   - `node --check` the emitted `.server.js`; confirm the route registers at the verbatim `path=`/`method=` in `routes`/`fetch`; confirm NO client endpoint surface (§61.6).
   (The 2 SSE assertions — replay-from-0 + resume-from-Last-Event-ID — are the §37 `server function* route=` SSE leg's territory, ALREADY LANDED, NOT `<endpoint>`. Do NOT test SSE here; note it in a comment.)
3. **Flip the §61 Nominal banner** in `compiler/SPEC.md`:
   - The §61.0 banner (~L33197, "**No `<endpoint>` implementation exists in the compiler as of S219.**") → rewrite to an "Implemented" banner mirroring §60's (~L33075 "**Implemented — A2 default-pipeline landed**"): the W2 parser + W3 typer + W4 codegen are landed; the `E-ENDPOINT-*` codes are wired + catalogued in §34; an `<endpoint>` app compiles + serves end-to-end. Note the worked example (`examples/33-endpoint.scrml`). State the remaining out-of-scope follow-on: the flogence `fsp-wire-smoke` production re-host + `fsp-wire.ts` retirement (cross-repo, PA-coordinated) and the deferred `raw` path-bound escape (§61.8).
   - §61.10's "**Nominal — no implementation as of S219**" bullet → update to reflect W2-W4 landed (keep the genuine remaining limits: deferred `raw`, first-class auth, non-enum shapes, multi-statement bare-body arms — see W4's deferred note).
4. **SPEC-INDEX.md currency:** W4 noted the §61 line-range drifted ~+1 after the §61.5 rewrite, and W5 shifts it more. Regen: `bun scripts/regen-spec-index.ts` (if it exists; else update the §61 range by hand). No test asserts it, but keep the derived doc current on the branch.

## Out of scope → ESCALATE to PA (the sPA will flag these in re-integration)
- The flogence `scripts/fsp-wire-smoke.ts` re-host against the scrml-served `/fsp` (cross-repo; needs the JSON-RPC `{method,params}` ↔ parseVariant enum-discriminator mapping decision).
- flogence retiring `scripts/fsp-wire.ts` as the production transport.
- The 2 SSE conformance assertions (the §37 SSE leg, already landed).

## Verify before DONE
1. `cd compiler && bun test tests/integration/endpoint-conformance-integration.test.js` — green.
2. The example compiles clean: compile `examples/33-endpoint.scrml` → exit-0 + a `.server.js` with the route.
3. `cd compiler && bun run test` — FULL suite, ZERO regressions (never `--no-verify`).
4. R26: paste the example's emitted `.server.js` route record + the integration test's end-to-end assertions passing.

## F4 startup + path discipline
- FIRST: `pwd && git rev-parse --abbrev-ref HEAD && git status` — confirm your OWN worktree. **PULL IN W2+W3+W4:** `git merge spa/ss18 --no-edit` (fast — pre-merge-commit). Confirm: `grep -c '_scrml_endpoint_' compiler/src/codegen/emit-server.ts` > 0 (if 0, merge failed — STOP). Write ONLY inside your worktree.
- Commit INCREMENTALLY (example → integration test → SPEC banner flip → SPEC-INDEX); coupled = one commit; clean `git status` before DONE.
- Report (final message = return value): branch · final SHA · W5 commit SHAs AFTER your merge commit · files changed · full-suite result · R26 evidence.