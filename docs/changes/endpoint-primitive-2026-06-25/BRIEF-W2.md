# BRIEF — W2 `<endpoint>` parser (ss18 item 1)

**Dispatched by sPA ss18 · branch `spa/ss18` · S219.** Agent: `scrml-js-codegen-engineer`, `isolation: worktree`, `model: opus`.

## Goal
Make the LIVE parser RECOGNIZE the `<endpoint path= method= accepts=> <Variant…> … </endpoint>` structural element and fire the THREE parse-time diagnostics. Parser-only — no typing, no codegen. A VALID `<endpoint>` parses to an `endpoint-decl` AST node and emits nothing (W3/W4 consume the node). This MIRRORS the §60 `<api>` W2 parser landing (`api-primitive-a2-2026-06-20`).

## Authoritative spec
- **SPEC §61** (`compiler/SPEC.md` ~L33193) — the normative section. §61.2 declaration grammar; §61.7 path/method; §61.9 the planned codes.
- **SCOPE** `docs/changes/endpoint-primitive-2026-06-25/SCOPE.md`.
- Per **Rule 4** the SPEC is normative — verify any claim here against §61 before encoding it.

## THE KEY ARCHITECTURAL POINT (read first)
`<endpoint>`'s body is **`<Variant>` arms** (like `<match>`), NOT bare lines (like `<api>`). So it does NOT use the `<api>` bare-line body path. It uses the **`<match>` structural-raw-body** path:
- The body arms REUSE `parseMatchArms()` from `compiler/src/match-statechild-parser.ts` **verbatim** (returns `{ arms: MatchArmEntry[], diagnostics: MatchParseDiagnostic[] }`). Each `MatchArmEntry` = `{ variantName, isWildcard, payloadBindingsRaw, attrs, bodyForm: "self-closing"|"shorthand"|"bare-body", bodyRaw, … spans }`. This is the §18.0.1 arm grammar + §51.0.B.1 payload binding the spec says to reuse — **add NO new arm machinery.**

## Exact edits

### 1. `compiler/src/block-splitter.js` — register `<endpoint>` as structural raw-body (like `<match>`/`<each>`)
- Add `"endpoint"` to `STRUCTURAL_RAW_BODY_ELEMENTS` (the `new Set([...])` at ~L126, currently `"match"`, `"each"`).
- Add `"endpoint"` to `COMPOUND_LIFT_EXEMPT_TAGS` (the `new Set([...])` at ~L152) — WITHOUT this, the compound-state-decl auto-lift heuristic misclassifies the `<Variant>` arm body as a compound state-decl and captures it as opaque text (the exact pre-S107 `<match>` failure; see the in-file comment at L154-165).
- This is why `<api>` needed NEITHER set (its bare-line body never trips the heuristic) but `<endpoint>` needs BOTH. Mirror the `<match>` entries' comment style.

### 2. `compiler/src/ast-builder.js` — `block.name === "endpoint"` dispatch
Add a dispatch branch beside the `<api>` (~L13901) and `<match>` (~L13622) branches. Pattern:
- **Opener parse** — mirror the `<api>` opener (L13901-13962): a brace/paren/bracket-aware `_findEndpointOpenerEnd(s)` (copy the `<api>`/`<match>` finder verbatim), slice the header, strip the `endpoint` prefix + trailing `/>`.
  - `path=` — string-literal attr; mirror the `<api>` `base=` capture (the `STR` regex at L13946-13949). Missing → **E-ENDPOINT-PATH-MISSING**.
  - `method=` — string-literal OR bareword; the value is one of `GET POST PUT PATCH DELETE` (the §60.2 set — REUSE `new Set(["GET","POST","PUT","PATCH","DELETE"])`). Not in set → **E-ENDPOINT-METHOD-INVALID**. (Accept both `method="POST"` and `method=POST`.)
  - `accepts=` — a **bareword type-ref** (NOT a string); mirror the `<match>` `for=` capture (the `M_IDENT` regex at L13664-13665). Capture as RAW type-ref text (do NOT resolve — resolution + non-enum check is W3). Missing → **E-ENDPOINT-ACCEPTS-MISSING**.
- **Body parse** — mirror the `<match>` armsRaw capture (L13719-13737: children-concat then raw-slice fallback, strip `</endpoint>`/`</>` closer), then call `parseMatchArms(armsRaw)`. Store `arms` (the `MatchArmEntry[]`) on the node and push each returned `diagnostics` entry as a parse error (mapping its local `spanStart/spanEnd` to a file span — mirror how match consumes them if it does; otherwise surface them as `TABError`s with the `endpoint` opener span as fallback).
- **AST node** — return `{ id: ++counter.next, kind: "endpoint-decl", path, method, acceptsRaw, arms, span, openerHadSpaceAfterLt: block.openerHadSpaceAfterLt === true }`. (Name the enum field `acceptsRaw` to signal it is unresolved — W3 resolves it.)
- A VALID `<endpoint>` must emit NOTHING: confirm `emit-html.ts` / `emit-server.ts` fall through on the unrecognized `endpoint-decl` kind (as they do for `api-decl`). If any walker chokes on the new kind, add a conservative no-op skip — but DO NOT add codegen (that is W4).

### 3. Error messages
Mirror the `<api>` message style (L13954-13961). Each message: `E-ENDPOINT-…: <reason>. Per SPEC §61.7/§61.2 …. <fix hint with a code example>.` Use `TABError(code, message, span)`.

### 4. `compiler/SPEC.md` — §34 rows + §61.9 currency (Rule 4 — lands WITH this wave)
- Add three §34 catalog rows in the `E-API-*` neighborhood (~L17593-17596), in the SAME ROW FORMAT (`| CODE | §refs | (S219 W2 — wired by the `<endpoint>` parser, endpoint-primitive-2026-06-25.) <description> Emitted by the `block.name === "endpoint"` dispatch in `compiler/src/ast-builder.js`. … Partitions into `result.errors`. | Error |`):
  - `E-ENDPOINT-PATH-MISSING` (§61.7, §61.9)
  - `E-ENDPOINT-METHOD-INVALID` (§61.7, §61.9)
  - `E-ENDPOINT-ACCEPTS-MISSING` (§61.9)
- In §61.9 (~L33331-33333), append **`**(wired S219 W2 — parse-time.)**`** to the PATH-MISSING / METHOD-INVALID / ACCEPTS-MISSING entries (leave NOT-EXHAUSTIVE + ACCEPTS-NOT-ENUM as `*(planned — W3 typer.)*`). Do NOT touch the §61 Nominal banner yet (W5 flips it).
- Do NOT add native-parser §34.1 rows (native mirror is skipped — see below).

### 5. Native-parser mirror — SKIP (follow the `<api>` precedent)
`<api>` (§60, the direct sibling) is **native-UNMIRRORED** (zero `api-decl` handling in `compiler/native-parser/*.js`). The native parser is NOT the production pipeline. Per S162 (native mirrors are feature-stale; conditional, not mandated) W2 mirrors the `<api>` precedent: **do NOT add `<endpoint>` to the native parser.** Leave a one-line comment at the native-parser `match`/`each` registration site noting `<endpoint>` is deferred-mirror like `<api>`. (If you discover `<api>` IS mirrored somewhere I missed, STOP and report — that changes the decision.)

### 6. Test — `compiler/tests/unit/endpoint-decl-parser.test.js` (lands WITH this wave)
Mirror `compiler/tests/unit/api-decl-parser.test.js` STRUCTURE exactly (same imports, the `parse()`/`endpointNode()`/`tabCodes()`/`compile()`/`errCodes()`/`warnCodes()` helper shape). Cover:
- VALID `<endpoint path="/fsp" method="POST" accepts=FspMethod>` with the SCOPE's 3-arm example (`<FleetStatus : fleetStatus()>` / `<Dispatch(prompt, proj) : dispatch(prompt, proj)>` / `<DeltaSince(seq) : deltasSince(seq)>`) → single `endpoint-decl` node, `path`/`method`/`acceptsRaw` captured, `arms.length === 3`, arm[0].variantName === "FleetStatus", payload-bearing arms carry `payloadBindingsRaw`. Fires NO `E-ENDPOINT-*`.
- E-ENDPOINT-PATH-MISSING (omit `path=`), E-ENDPOINT-METHOD-INVALID (`method="FETCH"`), E-ENDPOINT-ACCEPTS-MISSING (omit `accepts=`) — each via BOTH `tabCodes()` (parser stage) AND `compile()` partition (`result.errors`, NOT `result.warnings` — the diagnostic-stream partition rule).
- The 5 recognized methods gate clean; an unrecognized one fires METHOD-INVALID.
Note: the enum `FspMethod` need not be declared for the W2 parser test (W2 captures `acceptsRaw` without resolving; resolution is W3). If a missing-enum E-TYPE-UNKNOWN-NAME fires at full-compile, filter assertions to the `E-ENDPOINT-*` codes (as the api test filters to `E-API-`), or declare a minimal `${ type FspMethod:enum = { … } }` in the fixture.

## Out of scope (do NOT do — later waves)
- accepts= → enum RESOLUTION, E-ENDPOINT-ACCEPTS-NOT-ENUM, exhaustiveness / E-ENDPOINT-NOT-EXHAUSTIVE → **W3**.
- request decode (`parseVariant`), arm dispatch, JSON envelope, route registration, route-inference → **W4**.
- example + conformance → **W5**.

## Verify before DONE (mandatory)
1. `bun test compiler/tests/unit/endpoint-decl-parser.test.js` — green.
2. FULL suite: `cd compiler && bun run test` (incl. browser) — **zero regressions**. The pre-commit hook runs the full suite (~108-124s); foreground commit needs the time. NEVER `--no-verify`.
3. Re-compile a synthetic `<endpoint>` fixture and confirm the `endpoint-decl` node + the 3 codes — paste the evidence in your DONE report.

## Commit discipline (S88/S99/S113/S126)
- Work ONLY in your isolation worktree. **F4 startup-verification:** at startup run `pwd && git rev-parse --abbrev-ref HEAD && git status` and confirm you are in your OWN `.claude/worktrees/agent-*` worktree on your OWN branch — NOT the main checkout. Write ONLY via worktree-absolute or worktree-relative paths; NEVER write to `/home/bryan-maclee/scrmlMaster/scrml/<file>` (the main checkout). Verify every write target with `stat` + read-back if unsure.
- Coupled code+test = ONE commit. Commit INCREMENTALLY (BS reg → ast-builder dispatch → SPEC rows → test) — your branch is your crash-recovery anchor. `git status` clean before you report DONE.
- Report: the branch name, the final SHA, the list of files changed, and the R26 evidence (compile output showing the node + codes).
