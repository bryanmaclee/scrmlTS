# TASK — g-nominal-foreign-forms-not-failclosed: make §23.3 + §23.4 Nominal forms FAIL-CLOSED with honest diagnostics

**The bug (RULED S231, user "Honest Nominal-unimplemented code"; gap `g-nominal-foreign-forms-not-failclosed` MED).** SPEC §23.3 (WASM call-char sigils `r{}`/`c{}`/`z{}` + `extern`) and §23.4 (`use foreign:` sidecars) are Nominal/spec-ahead but DON'T fail-closed — they're entirely unbuilt in the parser:
- **§23.3 (N5):** `extern r applyFilter(...)` + `r{ applyFilter(...) }` → `extern` and `r` fall through as bare identifiers → MISLEADING `E-SCOPE-001` ("Undeclared identifier 'r' … did you mean '@r'") instead of an honest unimplemented code. (`callchar` is a recognized `<program>` attribute at `ast-builder.js:~17294`, but the sigil + `extern` grammar is absent.)
- **§23.4 (N6):** `use foreign:ml { predict }` → SILENTLY MISCOMPILES — compiles clean (exit 0, ZERO diagnostics), leaks the `use foreign:` line AND the following `server function` body as LITERAL HTML text, and compiles the nested `<program lang=...>`'s `export function` as a client-side scrml stub. `use` is a `STMT_KEYWORD` (`ast-builder.js:~3715`/`~4496`) but the `use foreign:name { … }` form is unrouted → the unrecognized statement drops the parser to text mode → the leak cascade.

**The ratified fix (Option B — discipline-forward V1; the v1.0 fail-closed-Nominal INVARIANT).** Do NOT wire real WASM/sidecar codegen (the MECHANISMS defer to scrml-language v1.next). Instead, **recognize both forms at the parse layer and fail-closed with an HONEST unimplemented diagnostic** of the shape: *"`<form>` is Nominal/spec-ahead; not implemented in scrmlc <version>; tracked for scrml-language v1.next."* This is the FIRST concrete instance of the D3 conformance contract (which-codes-fire) biting a real section.

**Build:**
1. **§23.3 recognizer (N5):** recognize the `extern <call-char> name(params) [-> type]` declaration AND the `<call-char>{ … }` sigil-call form. Fail-closed at parse/typer with a new honest code (suggested `E-WASM-NOMINAL`). Must NOT keep firing the misleading `E-SCOPE-001` for `extern`/the call-char.
2. **§23.4 recognizer (N6):** recognize the `use foreign:<name> { fn-list }` statement BEFORE the default-logic-mode text fallback (so it never leaks as HTML). Fail-closed with a new honest code (suggested `E-FOREIGN-SIDECAR-NOMINAL`).
3. **§34 + SPEC (Rule 4 — land WITH the impl):** add the two new §34 catalog rows; flip the §23.3 + §23.4 SPEC sections' Nominal banners to state explicitly that the forms are RECOGNIZED-AND-FAIL-CLOSED (not silently dropped), citing the new codes. SPEC §23.3 lives at SPEC.md ~16025-16178, §23.4 ~16179-16244; §34 catalog ~17262-18034.

**ADVERSARIAL CARE (S215) — do NOT mis-fire on the working siblings:**
- The `<program callchar=X>` ATTRIBUTE (declaring a call-char) stays legal — only the `extern`/sigil USE forms fail-closed.
- `import:host` (the recognized §21.3.1 host-import form) must be UNAFFECTED.
- Plain `use` directives / CSS `use`/`using` / any other `use`-prefixed form must be UNAFFECTED — only `use foreign:` routes to the new recognizer.
- Construct adversarial repros for each sibling and confirm zero new fires.

**Repros (the scoper confirmed these reproduce on HEAD — re-derive in your worktree):**
- N5: a `<program><program name=.. lang="rust" mode="wasm".../>` with `${ extern r applyFilter(brightness, pixels) -> number[] }` + `${ const <filtered> = r{ applyFilter(@brightness, @rawPixels) } }` (SPEC §23.3.6 worked example).
- N6: a nested `<program name="ml" lang="go" port="9001">` with `export function predict(...)` + a top-level `use foreign:ml { predict }` + a `server function` calling it (SPEC §23.4 worked example).

**Verification (R26 + adversarial, before DONE):**
- N5 repro → fires `E-WASM-NOMINAL` (honest), NO misleading `E-SCOPE-001`.
- N6 repro → fires `E-FOREIGN-SIDECAR-NOMINAL` (honest), NO HTML leak, NO client stub, fail-CLOSED (the program does NOT compile clean).
- The 4 adversarial siblings (callchar attr / import:host / plain use / CSS use) → ZERO new fires; compile exactly as before.
- `bun run test` FULL suite (not just the pre-commit subset — S198) — zero regressions. If any conformance corpus case asserts the OLD (misleading/silent) behavior, that's a fixture to update IN THIS LANDING (it was asserting a bug).
- Update the `docs/known-gaps.md` `<!-- @gap id=g-nominal-foreign-forms-not-failclosed … status=open -->` token to `status=resolved` (the honest-diagnostic build is the V1 disposition; the MECHANISM stays v1.next — note that in the entry).

**FINAL REPORT (raw data, not prose):** WORKTREE_ROOT · FINAL_SHA · FILES_TOUCHED · the two new code names as actually wired · N5/N6 repro outputs (before/after) · the 4 adversarial-sibling results · full-suite pass/fail counts · any conformance-fixture updates · the §23.3/§23.4 banner + §34 row diffs · Maps-consulted line.
