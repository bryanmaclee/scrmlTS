# BRIEF — W3 `<endpoint>` typer (ss18 item 2)

**Dispatched by sPA ss18 · branch `spa/ss18` (base has W2, `8253f562`) · S219.** Agent: `scrml-js-codegen-engineer`, `isolation: worktree`, `model: opus`.

## Goal
Type-check the `endpoint-decl` AST node W2 produced: resolve `accepts=` to its `:enum`, run exhaustiveness over the enum, bind each arm's payload type. Typer-only — NO codegen. Wires TWO error codes: **E-ENDPOINT-ACCEPTS-NOT-ENUM** + **E-ENDPOINT-NOT-EXHAUSTIVE** (and REUSES E-TYPE-UNKNOWN-NAME for an undeclared `accepts=` ref). Mirrors the §60 `<api>` W3 typer (`checkApiDeclarations`).

## The W2 node you consume (already landed on your base)
`{ kind: "endpoint-decl", path: string, method: string, acceptsRaw: string, arms: MatchArmEntry[] }`. Each `MatchArmEntry` (from `compiler/src/match-statechild-parser.ts`) = `{ variantName, isWildcard, payloadBindingsRaw, attrs, bodyForm, bodyRaw, … }`. `acceptsRaw` is the RAW type-ref text (e.g. `"FspMethod"`) — W2 deliberately did NOT resolve it; that is YOUR job.

## Authoritative spec
SPEC §61.3 (decode → accepts must be `:enum`), §61.4 (exhaustiveness = the inbound-honesty guarantee), §61.9 (the two W3 codes). **Rule 4: verify against §61 before encoding.**

## Template — mirror `checkApiDeclarations` (type-system.ts L18697)
Add a sibling `checkEndpointDeclarations(topNodes, typeRegistry, exemptTypeNames, errors, fileSpan)`:

1. **Collect** — deep-walk for `endpoint-decl` nodes (copy `collectApiDecls` L18728-18741: recurse `body`/`children`/`bodyChildren`/`branches`; a `<endpoint>` nests in the `<program>`/`<page>` subtree, NOT top-level — a shallow scan misses it). Short-circuit if none.

2. **Resolve `acceptsRaw`** (per decl):
   - **Undeclared ref → E-TYPE-UNKNOWN-NAME** — reuse the `checkEndpointTypeRef` pattern (L18761-18783): `forEachTypeNameLeaf` + `isUnrecognizedTypeNameAtom(leaf, typeRegistry, exemptTypeNames)`. Same §14.1.2 reuse as `<api>`.
   - **`resolveTypeExpr(acceptsRaw, typeRegistry)`** (mirror L18826-18861) — if `resolved.kind === "enum"` → capture the `EnumType` for exhaustiveness. If it resolves to a CONCRETE non-enum (`kind` not `"unknown"`/`"error"`/`"asIs"`) → **E-ENDPOINT-ACCEPTS-NOT-ENUM** (§61.9).
   - **CRITICAL DIVERGENCE FROM `<api>`:** the `<api>` non-variant case is an **Info-lint** (`W-API-RESPONSE-NOT-VARIANT`, severity `"info"`) because raw-passing a foreign *response* is a knowing escape. For `<endpoint>` the non-enum `accepts=` is a hard **Error** (severity `"error"`): `parseVariant` (§41.13) is a tagged-variant decoder and CANNOT decode the request body against a non-enum — there is literally nothing to decode/dispatch (§61.3). Do NOT copy the Info severity. Message style: `E-ENDPOINT-ACCEPTS-NOT-ENUM: \`<endpoint>\` \`accepts=${acceptsRaw}\` resolves to a non-enum type … parseVariant decodes tagged variants only … declare an \`:enum\` accepts= type. See SPEC §61.3 / §61.9.`

3. **Exhaustiveness** (only when `accepts=` resolved to an `EnumType`):
   - Build `ArmPattern[]` from `node.arms`: `arms.map(a => ({ kind: a.isWildcard ? "wildcard" : "variant", variantName: a.variantName }))` (`ArmPattern` = `{kind, variantName?, typeName?}`, L13495).
   - Call **`checkEnumExhaustiveness(enumType, armPatterns, subsetVariants?)`** (L13520) — the SAME engine `<match>` uses. `result.missing.length > 0` → **E-ENDPOINT-NOT-EXHAUSTIVE** (ONE Error per decl, listing the missing variant names; §61.4). `result.deadArms` / `result.duplicateArms` → reuse the EXISTING §18.0.1 arm-validity diagnostic (a dead/unknown/duplicate arm is NOT an `E-ENDPOINT-*` code — §61.4 + §61.9 are explicit: `<endpoint>` reuses that surface, does not mint a parallel code). Find the match-block dead/dup diagnostic and emit the same one (or, if it is structurally tied to match-block, emit the closest existing §18.0.1 code — do NOT invent an endpoint code).
   - **Subset narrowing (§61.4, optional/where-proven):** if `acceptsRaw` resolves to a `PredicatedType` carrying `subsetVariants` (the `parseEnumSubsetRefinement` path, §53.15), pass that set as the 3rd arg so the obligation narrows to the proven subset. Reuse — do not re-specify. Absent a subset proof, cover the full enum.

4. **Payload-type binding** (the "bind each arm's payload type" deliverable): for each arm, resolve its positional payload bindings to the variant's field types — reuse the lookup at L10852-10870 (`enumT.variants.find(v => v.name === variant).payload` is a `Map<field,type>`; position i → `Array.from(payload.values())[i]`). This makes the per-arm locals correctly typed for W4 codegen + any in-arm checks. (The load-bearing W3 deliverables are the two codes + exhaustiveness; payload binding enables W4.)

5. **Call site** — invoke `checkEndpointDeclarations(...)` right AFTER the `checkApiDeclarations(...)` call (L19620), inside the same `if (allNodes.length > 0) { … }` block; reuse the `apiExemptTypeNames` set (or build the equivalent the same way).

## SPEC.md — §34 rows + §61.9 currency (Rule 4 — lands WITH this wave)
- Add TWO §34 catalog rows near the W2 `E-ENDPOINT-*` rows, same format, tagged `(S219 W3 — wired by the `<endpoint>` typer, endpoint-primitive-2026-06-25.) … Emitted by `checkEndpointDeclarations` in `compiler/src/type-system.ts`. … Partitions into `result.errors`. | Error`:
  - `E-ENDPOINT-NOT-EXHAUSTIVE` (§61.4, §61.9)
  - `E-ENDPOINT-ACCEPTS-NOT-ENUM` (§61.3, §61.9)
- In §61.9, flip those two entries from `*(planned — W3 typer.)*` to `**(wired S219 W3 — typer.)**`. Leave the §61 Nominal banner (W5). E-TYPE-UNKNOWN-NAME is REUSED — no new row.

## Test — `compiler/tests/unit/endpoint-decl-typer.test.js` (lands WITH this wave)
Mirror `compiler/tests/unit/api-decl-typer.test.js` structure. Cover, via full `compileScrml` (errors partition into `result.errors`, never `result.warnings`):
- VALID exhaustive endpoint over a declared `:enum` (all variants have arms) → NO `E-ENDPOINT-*`.
- Missing-arm (enum has a variant with no arm) → `E-ENDPOINT-NOT-EXHAUSTIVE` naming the missing variant.
- `accepts=` resolving to a `:struct` / primitive → `E-ENDPOINT-ACCEPTS-NOT-ENUM` (Error, NOT an info warning).
- `accepts=UndeclaredType` → `E-TYPE-UNKNOWN-NAME` (reuse, no endpoint-specific code).
- A wildcard `<_>` arm satisfies exhaustiveness (no NOT-EXHAUSTIVE).
- (If feasible) a `<.subset>`-narrowed accepts= covers only the subset cleanly.

## Out of scope (later waves)
parseVariant decode emission, arm dispatch, JSON envelope, route registration, route-inference, client-skip → **W4**. example + flogence conformance → **W5**.

## Verify before DONE (mandatory)
1. `cd compiler && bun test tests/unit/endpoint-decl-typer.test.js` — green.
2. `cd compiler && bun run test` — FULL suite, ZERO regressions (pre-commit hook runs it; ~110s+, possibly slow in this worktree — that is the dist-symlink env, not a failure; never `--no-verify`).
3. R26: compile fixtures for each code; paste the evidence (the 4 outcomes above).

## F4 startup + path discipline (S88/S99/S126)
- FIRST: `pwd && git rev-parse --abbrev-ref HEAD && git status`. Confirm you are in your OWN `.claude/worktrees/agent-*` worktree, NOT a main checkout. Write ONLY inside your worktree; never a `/home/bryan-maclee/scrmlMaster/scrml*/…` non-worktree absolute path.
- **PULL IN W2 (your base is main `26ffea4e`, which LACKS W2):** run `git merge spa/ss18 --no-edit` at startup. This brings the W2 `endpoint-decl` parser into your worktree (clean — spa/ss18's W2 files don't conflict with main's docs-only WRAP). The merge uses `pre-merge-commit` (NOT the full-suite `pre-commit`), so it is fast. **Then confirm:** `grep -c 'endpoint-decl' compiler/src/ast-builder.js` MUST be > 0 (if 0, the merge failed — STOP and report). Your W3 commits land ON TOP of this merge.
- Commit INCREMENTALLY; coupled code+test = one commit; `git status` clean before DONE.
- Report: branch · final SHA · files changed · full-suite result · R26 evidence (the 4 outcomes).
