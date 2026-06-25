# BRIEF — W4 `<endpoint>` codegen (ss18 item 3)

**Dispatched by sPA ss18 · branch `spa/ss18` (W2+W3 landed) · S219.** Agent: `scrml-js-codegen-engineer`, `isolation: worktree`, `model: opus`. **R26 MANDATORY** (HIGH codegen-adjacent — S138).

## Goal
Emit the SERVER route-handler for an `<endpoint>`: decode the request body via `parseVariant` (§41.13) against the `accepts=` enum → dispatch to the matching arm → serialize the arm's typed return value as the JSON response → register at `path=`/`method=`. **Skip** CSRF (§61.7) and **skip** the paired client fetch-stub (§61.6). NO new error codes (all 5 wired in W2/W3). Authors the §61.5 default-envelope schema normatively.

## The W2+W3 node you consume (on your base after `git merge spa/ss18`)
`endpoint-decl` = `{ kind, path: string, method: string, acceptsRaw: string, arms: MatchArmEntry[] }`. W3 annotated it (check the exact field names in `checkEndpointDeclarations`, `compiler/src/type-system.ts`): the resolved `accepts=` EnumType + per-arm `payloadBindingTypes` (positional `ResolvedType[]` from the variant's payload). Each `MatchArmEntry` = `{ variantName, isWildcard, payloadBindingsRaw, bodyForm: "self-closing"|"shorthand"|"bare-body", bodyRaw, … }`. The arm body (`:`-shorthand `bodyRaw`, e.g. `dispatch(prompt, proj)`) is a CODE expr that RETURNS a value.

## Authoritative spec
SPEC §61.3 (decode), §61.4 (dispatch over the exhaustive arms), §61.5 (envelope — YOU author its normative schema), §61.6 (server-only, no client stub), §61.7 (path/method/CSRF-exempt). **Rule 4: verify against §61 before encoding.**

## Architecture (the integration point — reuse, net-new is small)
`generateServerJs(ctx)` (emit-server.ts L741) already has `fileAST` + the route-collection regex (L2466) that auto-wires any emitted `export const __ri_route_* = { path:…, method:…, handler:… }` into `routes` + `fetch`. So:

1. **emit-server.ts** — in `generateServerJs`, after the function-handler loop, deep-walk `fileAST` for `endpoint-decl` nodes (mirror `checkEndpointDeclarations`'s collect — body/children/bodyChildren/branches; NOT top-level). For each, emit:
   - **Handler** `async function _scrml_endpoint_<id>(_scrml_req) { … }`:
     - `const _scrml_body = await _scrml_req.json();`
     - **Decode** via the `parseVariant` machinery (REUSE `emitParseVariantCall` / the IIFE helper in `emit-parse-variant.ts` L163 — the decode is compiler-SYNTHESIZED, not a user call-site, so you synthesize the decode against the resolved `accepts=` EnumType; do NOT write a new decoder, §61.3). A `::ParseError` (§41.13 `::MissingDiscriminator`/`::UnknownVariant`/`::InvalidPayload`) → **structured-error envelope** (see §61.5 below), status 400.
     - **Dispatch**: `switch` on the decoded variant tag. Per arm: bind the payload locals positionally (the `payloadBindingsRaw` names → the decoded variant's payload values, typed per `payloadBindingTypes`), then evaluate the arm's `bodyRaw` as an `await`-ed server expression (REUSE the existing expr-lowering used for `:`-shorthand / code-default bodies — do NOT hand-roll). The wildcard `<_>` arm is the default case.
     - **Envelope** the arm's returned value (see §61.5 below), status 200.
     - NO CSRF block (contrast the function handler at L1680-1721 — the endpoint is CSRF-exempt by construction, §61.7). NO auth/session injection unless the author reads it in-arm.
   - **Route record** `export const __ri_route_endpoint_<id> = { path: "<path>", method: "<method>", handler: _scrml_endpoint_<id> };` — match the L2466 regex SHAPE exactly so routes/fetch auto-collect it. The author-declared `path=` is the route `path:` verbatim (§61.7 — never a compiler hash); the handler binding name MAY be compiler-internal.
2. **route-inference.ts** — ensure a file that contains an `endpoint-decl` EMITS a `.server.js` even when it has NO server functions (the "explicit endpoint ⇒ emit server handler" gate). Find the server-emission gate and include endpoint-presence. The data-layer ser/deser + CSRF gate are NOT applied (the endpoint handler is emitted directly, bypassing the function-route path).
3. **Client-codegen SKIP** — confirm emit-client / the client pipeline does NOT emit a fetch-stub for the endpoint and does NOT choke on the `endpoint-decl` kind (§61.6 — the consumer is a foreign client with its own SDK). If a walker errors on the kind, add a conservative no-op skip.

## §61.5 default envelope — YOU define this normatively (the spec-ahead clause lands with W4)
Adopt the MINIMAL, idiomatic schema (LIMIT-PRIMITIVES — no baked-in mode, no magic wrap):
- **Success:** serialize the arm's typed return value **directly** as the JSON response body — `200`, `Content-Type: application/json`. The author models the exact success wire by returning the exact shape (e.g. a JSON-RPC `{ jsonrpc:"2.0", id, result }` value); JSON-RPC is thus a convention expressed via the return value, NOT a baked-in mode (§61.1/§61.5). A self-closing `<Variant/>` arm returns the default-success with no body (e.g. `204` or `200` + empty — pick + spec it).
- **Decode failure (§61.3):** a compiler-owned structured error body `{ error: { kind: <ParseError variant>, message: <string> } }` — `400`, `Content-Type: application/json`. (kind ∈ MissingDiscriminator / UnknownVariant / InvalidPayload.)
- **Author-override:** because success serializes the return value directly, the author already owns the exact success wire — there is NO separate wrap to override (this is the idiomatic collapse of §61.5's "override path": the default IS full author control of the success body). State this in §61.5.
- **Write it into SPEC §61.5** (replace the spec-ahead "[spec-ahead — W4]" normative statements with the concrete schema), and flip the `[spec-ahead — W4]` markers in §61.3/§61.5/§61.6/§61.7 to wired-W4 where this wave implements them. Leave the §61.10 Nominal banner for W5.
- **⚠️ This default-envelope schema is a W4 design micro-decision** (§61.5 delegated it to W4). Flag it clearly in your DONE report so the sPA surfaces it to the PA for confirmation at re-integration.

## Test — `compiler/tests/unit/endpoint-decl-codegen.test.js` (mirror `api-decl-codegen.test.js`)
Via full `compileScrml` + `node --check` on the emitted `.server.js`:
- A valid `<endpoint>` over a 3-variant enum emits a `.server.js` with: the handler fn, the `parseVariant` decode, a dispatch over all 3 variants, the `__ri_route_*` record carrying the verbatim `path=`/`method=`, registered into `routes`/`fetch`. `node --check` passes.
- The emitted handler reads `_scrml_req.json()`, binds payloads, serializes the arm result. NO CSRF block in the endpoint handler. NO client fetch-stub for the endpoint.
- A malformed-variant body path emits the structured 400 error envelope.
- (Exercise the decode/dispatch if feasible — import the emitted handler + feed a synthetic request.)

## Out of scope (W5): the worked `examples/NN-endpoint.scrml` + the flogence `fsp-wire-smoke` conformance re-host + flipping the §61 Nominal banner.

## Verify before DONE (mandatory — R26 is REQUIRED for this wave)
1. `cd compiler && bun test tests/unit/endpoint-decl-codegen.test.js` — green.
2. `cd compiler && bun run test` — FULL suite, ZERO regressions (pre-commit hook; never `--no-verify`).
3. **R26:** compile a real `<endpoint>` fixture → READ the emitted `.server.js` → `node --check` it → paste (a) the handler source, (b) the `__ri_route_*` record, (c) proof it's in `routes`/`fetch`, (d) the decode + dispatch + envelope shape. This is the load-bearing evidence.

## F4 startup + path discipline (S88/S99/S126)
- FIRST: `pwd && git rev-parse --abbrev-ref HEAD && git status` — confirm your OWN `.claude/worktrees/agent-*` worktree (NOT a main checkout). Write ONLY inside it.
- **PULL IN W2+W3:** `git merge spa/ss18 --no-edit` at startup (fast — `pre-merge-commit`, not the full-suite `pre-commit`). Confirm: `grep -c 'checkEndpointDeclarations' compiler/src/type-system.ts` > 0 AND `grep -c 'endpoint-decl' compiler/src/ast-builder.js` > 0 (if either 0, the merge failed — STOP and report). Your W4 commits land on top of the merge.
- Commit INCREMENTALLY (emit-server handler → route-inference gate → SPEC §61.5 → test); coupled code+test = one commit; `git status` clean before DONE.
- Report (your final message IS the return value): branch · final SHA · the W4 commit SHAs AFTER your merge commit (I cherry-pick those) · files changed · full-suite result · the R26 evidence · **the §61.5 default-envelope decision flagged for PA**.
