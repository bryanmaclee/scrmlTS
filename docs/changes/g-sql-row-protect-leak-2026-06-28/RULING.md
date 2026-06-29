# g-sql-row-protect-leak — RULING + floor-build decomposition

**Status:** DESIGN RATIFIED S230 (dpa-017, user "go with your recos"). SPEC §14.8.9 authored (Nominal/spec-ahead). This doc is the BUILD scope for the load-bearing FLOOR. sPA-slot-able.

**Authority:** debate artifact `scrml-support/docs/debates/sql-row-protect-leak-contract-2026-06-28.md` · design-insight `~/.claude/design-insights.md` (dpa-017, S230) · normative spec **SPEC §14.8.9** + §34 (`E-PROTECT-004`, `I-PROTECT-STRIP-001`).

## The ruling (one line)
Server→client confidentiality for `protect=` columns = **structural redaction by column-origin at the single compiler-emitted egress sink** (server-fn return + SSR `/__serverLoad`), keyed on resolved `(table,column)` origin (alias-safe), descriptor-propagated through every compiler-emitted construction step (no value-flow obligation). `reveal("col")` = sole sink-checked declassification. The static-prove (A) layer is the **deferred** DX layer, not load-bearing.

## What's already there (reuse, not new analysis)
- **Alias-origin map** — `resolveSqlRowType` (§14.8.7 Tranche-1) already resolves every SELECTed column to `(table,column)` through the FROM/JOIN alias map. Net-new = *carry* the `protected` bit + origin one stage further onto a runtime descriptor instead of discarding after view selection.
- **Protect analyzer** — `compiler/src/protect-analyzer.ts` (`fullSchema` / `clientSchema` / `protectedFields`) — the source of the protected-column set.
- **Boundary gate infra** — `compiler/src/type-system.ts:3791–4006` runs E-ROUTE-003/004 at the server-fn return boundary; the (deferred) A-layer's natural home.
- **`inferReturnTypeFromBody`** (`type-system.ts:7262`) — object-literal-only; **irrelevant to the floor** (the floor reads a tag at the sink, doesn't analyze the body). This is exactly why B beats A-as-floor.

## Build decomposition (FLOOR = the load-bearing scrml-compiler work)

**RESOLVE FIRST — OQ-1 (descriptor-lifetime audit).** Before scoping the strip, enumerate every compiler-emitted construction step the descriptor must survive — `{...row}` spread, helper return, `.map`/iteration, JOIN row assembly, struct construction — and confirm each is a tag-preserving emit site. Enumerate the **raw-egress escapes** that must be gated/fail-closed: `_{}` foreign code (§23), manual `Response`/`handle()` body (§40), `asIs`-typed values (§14.1.1). This audit gates the rest.

1. **Origin descriptor at query-lowering.** At `?{}` lowering, attach the resolved `(table,column,protected)` origin to each output column as a runtime descriptor on the row. Reuse the `resolveSqlRowType` alias map.
2. **Descriptor propagation.** Thread the descriptor through the construction sites from OQ-1 (spread/helper/map/JOIN/struct). Tag-union on JOIN; preserve on spread.
3. **Egress-serializer strip.** At the compiler-emitted server-fn response serializer, drop every column whose descriptor origin ∈ `protectedFields`, UNLESS it bears a `reveal` stamp. Emit `I-PROTECT-STRIP-001` (Info) naming each stripped column.
4. **`reveal("col")` construct.** Field-level. Stamps the named column's descriptor as declassified-at-this-value; the serializer admits a protected-origin column iff stamped at the sink. Greppable in source + emitted handler. Compose with `pick`/`omit` + §14.8.8 width-contract (operates pre-serialization; no contract widening).
5. **Fail-closed gates.** (a) Raw/FFI egress (OQ-1 list) carrying a protected-origin column that can't be proven redacted → `E-PROTECT-004` (Error). (b) Unresolvable dynamic SQL (origin can't be statically resolved) → strip-all wholesale + `I-PROTECT-STRIP-001`; never accept-unknown. Compose with the existing `W-SQL-ROW-UNTYPED` degrade.
6. **SSR coverage.** The SAME egress filter applies to the SSR `/__serverLoad` prerender payload. Today it runs `SELECT *` with no redaction (delta-log [207]; `W-AUTH-002`). The `g-tier1-ssr-prerender` build MUST NOT ship its boundary without this — they compose; coordinate.
7. **Codes land here.** `E-PROTECT-004` + `I-PROTECT-STRIP-001` are NAMED in §34 (S230) and FIRE when this floor lands (Rule 4 / §60/§61/§26.8 precedent). Flip the §14.8.9 Nominal banner.

## DEFERRED (not this build)
- **A-layer (early static-prove error)** — reads the same provenance map at `type-system.ts:3791` to flag a protected-origin return at authoring time (teaching + minimal-wire SELECT-projection optimization). Incremental; the security property never depends on it. (OQ-4: judge says build the floor first.)
- **Derived/implicit flow + covert channels** — out of scope by the §14.8.9 normative bound (would need full expression-label IFC). Do NOT let the floor's prose or this build claim coverage of them.

## Remaining OQs (resolve in-build)
- **OQ-2 — `reveal` grain confirmed field-level** (`u.reveal("col")`); must NOT re-widen `clientSchema` globally; sole admit path. (Ratified S230.)
- **OQ-3 — dynamic-SQL = strip-all+lint** (ratified S230). Implement as step 5(b).
- **OQ-5 — code naming confirmed** `E-PROTECT-004` + `I-PROTECT-STRIP-001` (S230); A-layer reject code (if ever built) decided with the A-layer.

## Verification (when built)
Pure-floor codegen → no R26 needed for the SPEC text (done); the BUILD needs: adversarial repros for each A1–A3 attack from the artifact (bare `return u` over `SELECT *`; `SELECT pw AS h`; launder-through-helper+spread) → all must strip; A4 (derived `{hasPw: ...}`) must be documented-as-out-of-scope, not silently "caught"; `reveal` round-trip; raw-egress fail-closed. Full suite + R26 on a real adopter source with a `protect=` column.
