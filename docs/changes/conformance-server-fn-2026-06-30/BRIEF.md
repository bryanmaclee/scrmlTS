# BRIEF — Conformance W3 (b)-runtime: the server-fn §52 effects batch (the NET-NEW CENTER)

The D3 conformance suite's (b)-runtime layer is the real language oracle. P1 (errorBoundary/components/lifecycle) landed — corpus is now 63 cases. This batch is the **NET-NEW CENTER the W3 design flagged: server-fn (§52) effects** — call → server route → state hydrate. **Channels DEFER to v1.next (per the §-partition) — do NOT author channel cases.**

**Authority (read first):**
- `conformance/README.md` + `conformance/run.ts` + `conformance/adapters/impl1-ts.ts` + `conformance/normalize.ts` + `conformance/driver.ts` + a couple existing (b)-cases (`conformance/cases/reactive/counter-increment/`, `conformance/cases/lifecycle/boot-effect/`).
- `scrml-support/docs/deep-dives/conformance-runtime-layer-design-2026-06-29.md` — the W3 design (RATIFIED). Note especially OQ2 (the `wait:"settle"` verb) + OQ3 (the `__scrml_conformance` hook with `settled()` — ADAPTER-PROVIDED; reaches `_scrml_state`/flush via the harness, runtime UNTOUCHED) + OQ6 (server-fn = the net-new center driving `settled()` + a stubbed server boundary).
- `docs/changes/conformance-suite-d3-2026-06-29/SCOPE.md` §6 (the resolutions: domAnchored default, the schema so far — `codes`/`notCodes`/`notCodePrefixes`/`severity`/`input`/`dom`/`domAnchored`/`state`/`files`).

**The three build parts:**

**(1) The adapter server-stub mechanism (conformance/adapters/impl1-ts.ts).** A scrml `function` that touches a server resource auto-escalates to server (§12): the client call compiles to a `fetch` to a compiler-emitted server route; the server handler runs the body. In the conformance harness (happy-dom, no real server), `run()` must intercept that server-fn fetch and return a CASE-DECLARED deterministic response, then `settled()` drains the pending promise so the state hydrate completes before the snapshot. **Find the actual emitted server-fn route/fetch shape** (read the codegen — likely `/__server*` or similar; grep emit-* / runtime-template for the client-side server-fn call) and intercept it in the adapter (mock `globalThis.fetch` in the happy-dom env for the conformance run).

**(2) The schema extension — declaring server stubs (IMPL-NEUTRAL).** Add a new `expected.json` field for the case to declare server responses. **CONTRACT REQUIREMENT (D3 impl-freedom): key the stub by the IMPL-NEUTRAL scrml-SOURCE server-fn name, NOT the impl#1 route encoding** — keying by impl#1's emitted route (`/__server/<hash>`) would bake impl#1 internals into the agnostic case (impl#2 may encode routes differently). The ADAPTER maps source-fn-name → impl#1's route internally. Proposed shape (your call on the exact form — document it in README + wire into `run.ts` + `conformance-corpus.test.js`):
```
"serverStub": { "<sourceFnName>": <response-value> }
```
If a fn is called with args that select different responses, support a per-call form (`[{args, response}]`) OR keep v1 simple (fn → single response) + note the limit. Document the chosen shape in `conformance/README.md`.

**(3) Author ~4-6 §52 server-fn-effect (b)-cases** (`conformance/cases/server-fn/`):
- (a) **Basic load+hydrate**: a button `onclick=load()` where `load()` calls a server-fn returning rows → `@items` hydrates → assert the rendered list (domAnchored) + `@items` state. Input: `[{click: "#load"}, {wait: "settle"}]`.
- (b) **`T | not` server return (§57 wire absence envelope)**: a server-fn returning `User | not` → assert BOTH the present-path (renders user) and a `not`-path case (renders the empty/fallback). The wire envelope round-trips `not` (§57).
- (c) **CPS body-split (§19.9.3)**: a server-fn call inside an `if`/`match` arm (non-top-level → compiled-to-CPS) → continuation runs → hydrate → assert. Exercises the body-split + settle.
- (d) **An error path**: a `!`-failable server-fn whose stub triggers the error variant → assert the error-state DOM (composes with §19 / errorBoundary).
- Optionally (e) a multi-server-fn sequence if `settled()` cleanly drains both.

**domAnchored default** (OQ1 resolved). The `__scrml_conformance` hook is adapter-provided (runtime UNTOUCHED). **execute-never-string-compare** (contract invariant).

**THE OQ4 HONESTY GATE:** golden-capture PROPOSES, spec-anchor review DISPOSES. A surprising/empty/wrong capture (e.g. a hydrate that doesn't fire, a `not`-envelope that renders `"undefined"`) is a BUG-OR-SPEC-GAP candidate — FLAG it, do NOT bless it into `expected.json`. (Precedent: the P0 lift found g-inline-value-match this way.) Do NOT edit `compiler/src/**` to make a case pass — that's a flag.

**FLAG-DON'T-GUESS (load-bearing — this is the design-heavy center):** if you hit a genuine DESIGN FORK on the CONTRACT shape (how to deterministically intercept; whether the server-stub-as-case-input needs a different formalization; whether `settled()` actually drains server-fn promises or needs a hook change) — STOP and FLAG it with options + your lean. Do NOT silently commit a load-bearing contract decision. The impl#1-ADAPTER internals (route-mapping, fetch-mock wiring) are yours to design freely; the agnostic CONTRACT shape (the `expected.json` schema + impl-neutral keying) is the part to flag if uncertain.

**SCOPE GUARD:** write `conformance/**` ONLY (adapter + schema + cases + README + the BRIEF). ZERO `compiler/src/**` edits. If the stub mechanism genuinely REQUIRES a runtime/compiler change (e.g. a conformance-mode server hook the adapter can't provide), that is a FLAG — surface it, don't edit compiler/src.

**Verification before DONE:**
- `bun conformance/run.ts` — all cases (existing 63 + new) pass.
- `bun test compiler/tests/conformance/corpus-bridge.test.js` — gated bridge green.
- `bun run test` FULL suite (NOT the subset — S198) — zero regressions.
- `git status` clean before DONE.
