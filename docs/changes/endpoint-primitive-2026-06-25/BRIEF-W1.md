# BRIEF — endpoint-primitive W1 (SPEC §-author)

Dispatched S219 2026-06-25 to `general-purpose` (isolation:worktree, opus, run_in_background), agent `aab0314d3bbc75e4c`. S136 archive. Standard F4 startup-verification + path-discipline (Bash-edits, worktree-absolute, no-`cd`, WIP-pwd) block INCLUDED.

## Mission
W1 of the ratified `<endpoint>` typed-inbound-endpoint build (a+b, `<endpoint>`-first). Author a NEW Nominal/spec-ahead SPEC section (§61 "Typed Inbound Endpoint `<endpoint>`"), mirroring §60 `<api>` (the typed-OUTBOUND mirror). AUTHORITATIVE design source: `docs/changes/endpoint-primitive-2026-06-25/SCOPE.md`. Context: the DD `scrml-support/docs/deep-dives/raw-route-primitive-reopen-2026-06-25.md` (the inbound-edge honesty insight).

Subsections §61.1-§61.10: overview + the `<api>` mirror · the `<endpoint path= method= accepts=Enum>` grammar + arms (reuse §18.0.1/§51.0.B.1) · decode via parseVariant §41.13 · exhaustiveness (E-ENDPOINT-NOT-EXHAUSTIVE — the inbound honesty) · the JSON envelope · client-codegen-skip · method/path/auth (drop csrf strawman) · relationship (§60/§37-SSE-landed/§40-handle/§12/deferred-raw) · planned E-ENDPOINT-* codes NAMED (NOT added to §34 — reserved for impl per Rule 4, like §60) · Nominal gaps/limits/xrefs. Plus §4.15/§24.4 structural-element registry rows + SPEC-INDEX regen (Sections row + Quick-Lookup + footer 60→61).

CONSTRAINTS: SPEC-text + SPEC-INDEX ONLY; zero compiler/src; no §34 rows; no within-node/R26 (no codegen). PA reviews (Rule 4) + lands via file-delta. W2-W5 (parser/typer/codegen/tests) follow as `ss18-endpoint-primitive`.
