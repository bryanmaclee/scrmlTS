# trucking-slice-2-decl-coupled-validators-2026-06-18 — progress

Append-only. Convert trucking forms from raw `<input bind:value=@cell required>` to
canonical scrml Shape-2 decl-coupled-with-render-spec + the auto-synth §55 validity surface.

## Baseline (app.scrml @ HEAD e14462a6)
- compile EXIT 0
- 5 warnings: 2 `[scrml] statement boundary not detected` (stdlib auth/crypto), 1 W-AUTH-LOGIN-MISSING, ...
- info: 1 I-AUTH-REDIRECT-UNRESOLVED, 3 W-SQL-ROW-UNTYPED
- lints: 3 I-FN-PROMOTABLE (ghost pattern)
- NONE validator-related. Conversion must NOT add ERRORS.

## Log

### login.scrml (2 fields) — DONE
- Grouped <email>/<password> into compound <loginForm> (Variant C).
- email: req pattern(/^[^@]+@[^@]+$/); password: req. (pattern is §55.1 universal-core; `email` bare-attr is NOT universal-core, used pattern instead.)
- Raw <input bind:value required> → render-by-tag <email/>/<password/> (input attrs id/autocomplete/class moved onto the Shape-2 RHS markup).
- submit() now reads @loginForm.email/.password, gates `if (!@loginForm.isValid) return`.
- Submit button: disabled=@submitting → disabled=!@loginForm.isValid (in-handler @submitting guard still prevents double-submit).
- @errorMessage/@submitting kept as Shape-1 cells (operational, not form fields).
- compile EXIT 0; app EXIT 0; no diagnostic delta. Validity surface emits (loginForm.isValid + per-field errors + scrml-error).

### COMPILER BUG FOUND — compound-field Shape-2 render-by-tag not expanded
- §55/§6.2 shape: a Shape-2 field declared as a CHILD of a Variant-C compound
  (`<form> <fieldName req ...> = <input/> </>`), referenced in markup as render-by-tag `<fieldName/>`.
- Minimal repro: /tmp/probe-compound-rbt.scrml (page with `<signup><uname req length(>=2)> = <input/></>` + `<uname/>` in markup).
- EXPECTED: `<uname/>` expands to the bound input (`<input ... data-scrml-render-by-tag>`), as TOP-LEVEL Shape-2 does (verified working: /tmp/probe-shape2-toplevel.scrml → `<input ... required minlength="2" data-scrml-render-by-tag>`).
- ACTUAL: emits a LITERAL `<uname />` tag in SSR HTML, silently (NO diagnostic). Input never renders.
- The §55 validity surface (`@compound.isValid`, per-field `.errors`, `<errors of=>`, touched) WIRES CORRECTLY — only the field's render-by-tag input element is dropped.
- WORKAROUND (keeps form working + still exercises §55): keep the compound + validator decls, render the input via raw `<input bind:value=@compound.field>` (verified: full bind + touched + validity wiring emits, /tmp/probe-compound-rawbind.scrml).

### login.scrml — DONE (revised to working form)
- compound <loginForm>{email,password} + validators; raw bind:value=@loginForm.<field> inputs (render-by-tag bug); <errors of=>; disabled=!@loginForm.isValid.
- compile EXIT 0; app EXIT 0; 5 inputs render + bound; validity surface emits.

### register.scrml — DONE
- compound <registerForm>{companyName,email,contactPhone,billingAddress(textarea),password}.
- companyName req length(>=2); email req pattern; contactPhone optional (no req); billingAddress req (textarea); password req length(>=6).
- raw bind:value=@registerForm.<field>; <errors of=>; disabled=!@registerForm.isValid; manual validation block replaced by isValid gate.
- compile EXIT 0; app EXIT 0; 4 inputs + 1 textarea render + bound; validity surface emits.

### messages.scrml (1 field, genuine form) — DONE
- compound <messageForm>{draft req} (single-field compound for the §55.5 rollup).
- <draft> textarea bound bind:value=@messageForm.draft; <errors of=>; disabled=!@messageForm.isValid.
- sendMessage(): `if (@draft=="")` → `if (!@messageForm.isValid)`; reads @messageForm.draft; `@draft=""` → reset(@messageForm.draft).
- compile EXIT 0; app EXIT 0; validity surface emits.

### SKIP — filter dropdowns (NOT form fields)
- drivers.scrml `<select bind:value=@statusFilter>` (status filter) — SKIP per brief (not validated input).
- billing.scrml `<select bind:value=@filter>` (invoice filter) — SKIP.
- loads.scrml `<select bind:value=@statusFilter>` (status filter) — SKIP.
- invoices.scrml `<select bind:value=@filter>` (invoice filter) — SKIP.

### SKIP — status-picker.scrml (no form field)
- grep "1" was a false positive: only `<select>` in a code comment. The component renders transition <button>s, no <input>/<select>/<textarea>. SKIP.

### profile.scrml (2 fields) — DONE
- compound <profileForm>{editName req, editPhone optional}.
- startEdit() pre-populates @profileForm.editName/.editPhone; saveProfile() gates `if (!@profileForm.isValid) return`, reads @profileForm.<field>.
- raw bind:value=@profileForm.<field>; <errors of=@profileForm.editName/>; disabled=!@profileForm.isValid.
- compile EXIT 0; app EXIT 0; validity surface emits.

### driver/load-detail.scrml (5 inputs across 4 inline forms) — DONE
- 4 compounds, one per inline form: <bolForm>{filename req}, <podForm>{filename req}, <fuelForm>{amount req, odometer req}, <breakdownForm>{description req(textarea)}.
- Each submit handler: `if (field=="")` → `if (!@<form>.isValid)`; reads @<form>.<field>; `@field=""` reset → reset(@<form>).
- raw bind:value=@<form>.<field>; <errors of=>; disabled=!@<form>.isValid per form.
- compile EXIT 0; app EXIT 0; all 4 validity surfaces emit; 5 inputs bound + 5 error anchors.

### dispatch/load-new.scrml (6 inputs + customer select + address fields) — DONE
- One compound <loadForm> holding ALL load fields incl. component-mediated address fields.
- Validators (parity with old manual checks): customerId min(1), originCity req, destinationCity req, pickupAt req, deliverBy req, commodity req, rateDollars gt(0). weightLbs/state/address optional.
- customer <select bind:value=@loadForm.customerId> — genuine form field (NOT a filter), kept.
- AddressForm component value=@loadForm.<field> + setters write @loadForm.<field> — verified component-mediated compound-field bind works (probe /tmp/probe-compound-consumer.scrml).
- submit(): 5 manual `if` checks replaced by single `if (!@loadForm.isValid)`; reads @loadForm.<field>.
- <errors of=> on customerId/originCity/destinationCity/pickupAt/deliverBy/commodity/rateDollars; disabled=!@loadForm.isValid.
- compile EXIT 0; app EXIT 0 (no diagnostic delta); 6 inputs bound + 7 error anchors; validity surface emits.
- NOTE: standalone compile surfaces a pre-existing E-DG-002 on @currentUser (assigned in refresh(), never read — present before this slice); app-context compile clean.

### customer/quote.scrml (10 inputs) — DONE
- One compound <quoteForm> with all 10 fields (inline address, no AddressForm component here).
- Validators: originCity req, destinationCity req, pickupAt req, deliverBy req, commodity req; addresses/states/weight optional.
- submit(): 3 manual `if` checks → single `if (!@quoteForm.isValid)`; reads @quoteForm.<field>.
- raw bind:value=@quoteForm.<field>; <errors of=> on the 5 req fields; disabled=!@quoteForm.isValid.
- compile EXIT 0; app EXIT 0 (no diagnostic delta); 10 inputs bound + 5 error anchors; validity surface emits.

### SKIP — components/address-form.scrml (5 inputs, component-mediated)
- This is a COMPONENT (multi-instance, §4.9): receives values via `value=` props + `oninput=` callbacks; does NOT own reactive cells.
- Shape-2 render-by-tag requires the cell to be declared in the SAME scope as the render-by-tag. A component takes props, not cells — so Shape-2 is structurally impossible inside the component.
- The address fields' STATE lives in the PARENT (load-new.scrml). The §55 validation for those fields now lives in load-new's <loadForm> compound (originCity/destinationCity `req`); the AddressForm inputs bind to @loadForm.<field> via value=/oninput= (verified working).
- Dissolving the component into the page to enable render-by-tag would be an architecture refactor beyond slice-2's "convert form FIELDS" remit. SKIP (component left as presentational primitive; its fields ARE validated via the parent compound).

## SLICE SUMMARY
- CONVERTED (9): login, register, messages, profile, driver/load-detail (4 inline forms), dispatch/load-new, customer/quote.
- SKIPPED (5): address-form (component-mediated), status-picker (no form field), drivers/billing/loads/invoices filter-selects (not validated input).
- COMPILER BUG: compound-field Shape-2 render-by-tag not expanded (silent literal tag). Workaround: raw bind:value=@compound.field everywhere; §55 surface still synthesizes.
- app compile EXIT 0 throughout; baseline 5 warnings + 3 lints preserved (NO new ERRORS, no new validator warnings).
