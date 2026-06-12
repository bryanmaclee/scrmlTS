---
title: Tutorial Staleness Audit — docs/tutorial.md
status: current
last-reviewed: 2026-06-12
audited-doc: docs/tutorial.md
audited-doc-last-edit: 2026-05-14
auditor: tutorial-staleness-audit workflow (S186)
---

# Tutorial Staleness Audit — `docs/tutorial.md`

## VERDICT

**Substantially stale — needs a full refresh pass before it is safe to put in front of an adopter.** The tutorial was last edited 2026-05-14 (S93) and predates ~95 sessions of ratifications (v0.4 through v0.7.0). It is not catastrophically wrong — most concepts it teaches are still real — but it ships **three HIGH-severity defects that produce wrong adopter behavior**, the worst being a **non-compiling persisted-counter snippet (02b)** that an adopter will hit on their first stateful program. The single highest-leverage cluster is the **deprecated `=>` / `->` arm separator**, which is pervasive: it appears in match arms and `!{}` handler arms across §4, §5, §6, §10, and the glossary — every one fires `W-MATCH-ARROW-LEGACY` and the canonical separator is now `:>` (S147). Remediation is moderate: roughly a dozen mechanical `=>`/`->` → `:>` substitutions in arm context (sed-able with care), three real snippet/prose fixes (02b `<schema>` placement, the `not`-as-negation inversion in §7, the unshipped-block-form-`<match>` claim), a handful of version/section-ref touch-ups, and adding `<each>` as the canonical iteration primitive (currently mentioned **zero** times). **Most important single fix: the broken 02b snippet (`<schema>` must move inside `<program>`) plus the global `=>`→`:>` arm migration.**

## Counts (after dedup + false-positive removal)

| Severity | Count |
|----------|-------|
| HIGH     | 4     |
| MED      | 11    |
| LOW      | 11    |
| **Total**| **26**|
| Adversary-refuted / dropped | 1 |

(Source rows: 36 auditor findings + 9 critic-missed = 45 raw; deduped to 26 distinct after merging the `=>`/`->` arm-arrow cluster, the `<each>`-missing cluster, the block-form-`<match>` cluster, the `<onTransition>` model cluster, the engine-placement cluster, and the version-claim cluster; 1 dropped as adversary-refuted.)

---

## HIGH

- **Broken 02b snippet — `<schema>` placed at file root.**
  Location: `docs/tutorial.md` lines 158–204 (inline) + `docs/tutorial-snippets/02b-counter-persisted.scrml` lines 3–8; reinforced by prose at lines 153 & 209.
  Stale → current: `<schema>` as a file-root sibling of `<program>` → **`<schema>` MUST be an immediate child of `<program>`** (move it inside the `<program>` opener, alongside `<db>`).
  Category: broken-snippet + superseded-canonical.
  Evidence: live compile of `02b-counter-persisted.scrml` **FAILS** with `E-SCHEMA-003` ("`<schema>` SHALL appear as an immediate child of the `<program>` root only"); moving it inside compiles clean. SPEC §39.12 line 19205 normative; placement rule dates to S130 phase-2 D (post the tutorial's last edit).

- **§7 negation framing inverted — teaches `not x` as canonical boolean negation.**
  Location: `docs/tutorial.md` lines 807 (negation table row), 811 (canonical-form prose), 1095 (anti-pattern table RIGHT/use-this column); usage sites 601, 626, 690, 762, 825. Supersedes/merges auditor finding #9 (snippet `03-todos.scrml` `not t.done`).
  Stale → current: `not x` "preferred / canonical" for boolean negation, anti-pattern table tells adopters to **replace `!x` with `not x`** → **`!` is the boolean negation operator; `not` is the absence value ONLY** (SPEC §42.10). Reverse the table row and the anti-pattern RIGHT column; switch usage sites to `!`.
  Category: superseded-canonical.
  Evidence: SPEC line 21678 "`not` ... is the absence value. It is NOT a boolean negation operator"; line 21684 "The boolean negation operator in scrml is `!`"; line 21685 `not` in prefix-boolean position SHALL emit `E-TYPE-045`. **Live note:** compiler currently *under-enforces* (`not @loggedIn` compiles clean, no `E-TYPE-045`), so this is a live SPEC-vs-compiler divergence — but SPEC is normative (Rule 4) and the tutorial teaches the SPEC-invalid direction as canonical.

- **`scrml init` scaffold prose wrong.**
  Location: `docs/tutorial.md` line 26 + setup block lines 19–24.
  Stale → current: "creates a directory with a single top-level `.scrml` file, a `package.json`, and a `bunfig.toml`" → **creates `src/app.scrml` (starter counter app) + `.gitignore`; no `package.json`, no `bunfig.toml`; entry file is `src/app.scrml`.** The dev command should be `scrml dev src/app.scrml` (init's own "Next steps" prints this).
  Category: other (factual scaffold drift).
  Evidence: ran `scrml init init-test` → exactly `src/app.scrml` + `.gitignore`, "2 files created"; `find` confirms no `package.json`/`bunfig.toml`; `scrml init --help` documents the same set.

- **Block-form `<match>` claimed unshipped / "future release."**
  Location: `docs/tutorial.md` line 487 (Note block) + snippet `04a` header lines 3–6; reinforced by §5.6 prose (lines 686–688) teaching JS-style-match-with-`lift` as "the canonical Tier-2 idiom."
  Stale → current: "A first-class `<match for=Type on=expr>` markup form is in the spec and tracked for a future release ... until that parser lands, JS-style `match expr { ... }` is canonical" → **block-form `<match for=Type on=expr> <Variant>...</> </>` is SHIPPED and is the canonical Tier-1 markup/UI-dispatch shape (§18.0.1); JS-style `match expr { arm :> value }` is the value-RETURN form for derivations/server logic.**
  Category: superseded-canonical.
  Evidence: block-form repro compiles clean (exit 0, only `W-PROGRAM-SPA-INFERRED`); SPEC §17.0 line 9936 + §18.0.1 line 11112; `E-MATCH-ON-REQUIRED` gates a missing `on=`. The "future release" claim is directly contradicted by a clean compile.

---

## MED

- **Deprecated `=>` / `->` arm separator — use `:>` (S147). [MERGED — 14 locations]**
  Locations:
  - match arms: `tutorial.md` lines 464–469, 520–525, 615/629/630, 758/765/766/770, 988–995, glossary 1053; snippets `04a` 31–36, `04b` 33–39, `05-signup-form.scrml` 47–67, `06-failable.scrml` 58/65/66/70.
  - `!{}` handler arms: `tutorial.md` lines 748–750, 786, 795, 974, glossary 1063, anti-pattern table 1089; snippet `06-failable.scrml` 47–49.
  Stale → current: `.Variant => { ... }` / `| .Variant -> { ... }` → `.Variant :> { ... }` / `| .Variant :> { ... }`.
  Category: deprecated-form.
  Evidence: every site fires `W-MATCH-ARROW-LEGACY` on live compile (verified on `04a`/`04b`/`05`/`06` snippets); `:>` repro compiles clean. SPEC §18.2 line 11326 (`:>` canonical; `=>`/`->` deprecated aliases); §19 line 11331 (`!{}` arms follow in lockstep). **Mechanical** in arm context — but DO NOT touch the `->` **fn-return** separator (e.g. `function persist(...)! -> Err`, lines 967/746) nor `=>` as a JS arrow-function glyph; those stay valid.

- **`<onTransition>` model misrepresented as a single `from=A to=B` pair-form. [MERGED]**
  Locations: `tutorial.md` line 542 (prose) + glossary line 1056.
  Stale → current: "`<onTransition from=A to=B>` runs when the engine moves from A to B" → **directional, one attribute per element: `to=.Variant` placed in the FROM state-child fires when leaving toward X; `from=.Variant` placed in the TARGET state-child fires on arrival; `E-ONTRANSITION-NO-TARGET` requires exactly one of `to=`/`from=`.** No canonical single-element pair-form.
  Category: superseded-canonical / misrepresented-model.
  Evidence: SPEC §51.0.H lines 25282–25289 + registry line 1066 (`to=Variant`, `from=Variant`, `once`, `if=expr`); `E-ONTRANSITION-NO-TARGET` line 16902. (Compiler is permissive — both attrs on one element compiles — but SPEC contradicts the taught model.)

- **`<schema>` placement prose teaches file-top sibling.**
  (Companion to the HIGH 02b snippet fix; the prose at lines 153 & 209 actively instructs the wrong placement.)
  Stale → current: "declare the `<schema>` block at the top of the file" → "as a direct child of `<program>`, alongside `<db>`."
  Category: superseded-canonical. Evidence: SPEC §39.12 line 19205; `E-SCHEMA-003`. *(Counted under the HIGH 02b row in the table; listed here for the remediation prose pass.)*

- **§3.3 const-component `${...}` wrapper taught as required-due-to-a-gap; gap is resolved.**
  Location: `tutorial.md` lines 305–309 (prose comment) + 310–316 (inline example).
  Stale → current: drop the explanatory comment and the `${...}` wrapper around the bare `const TodoRow = <markup/>` — under v0.3 default-logic mode it auto-lifts and compiles clean; the wrapper now fires `W-PROGRAM-REDUNDANT-LOGIC`.
  Category: superseded-canonical.
  Evidence: bare form (no wrapper) compiles with 0 `E-` errors and no redundant-logic lint; wrapped form fires 2× `W-PROGRAM-REDUNDANT-LOGIC`. The cited compiler gap no longer exists.

- **Snippet FILES wrap all top-level logic in a redundant file-top `${...}`. [critic-missed]**
  Locations: `03-todos.scrml` line 5, `04a` line 10, `04b` line 8, `05-signup-form.scrml` lines 10/22, `06-failable.scrml` lines 7/28.
  Stale → current: drop the file-top `${...}` wrapper — bare top-level decls auto-lift (the shape the tutorial PROSE teaches at lines 51, 66, 82–84).
  Category: superseded-canonical / prose-snippet divergence.
  Evidence: `W-PROGRAM-REDUNDANT-LOGIC` fires on each (SPEC §40.8 line 16939: warning in v0.3, **escalates to ERROR in v0.4**).

- **`<engine>` placement contradiction (snippet & glossary say "file level"; prose says inside `<program>`). [MERGED]**
  Locations: snippet `04b` header lines 3–6 + code 22–27 vs prose lines 491/537; glossary line 1054 parenthetical "(file level)".
  Stale → current: align to **engine as a direct child of `<program>`** (the prose, the v0.3 sweep footer, and shipped `examples/14-mario-state-machine.scrml` all use this). Both placements compile, but the defect is the prose↔snippet↔glossary contradiction.
  Category: cross-section inconsistency.
  Evidence: both forms compile (exit 0); SPEC §51 S67 footnote line 25493 permits file-scope, but §40.8 v0.3 direction + the shipped mario example place it inside `<program>`.

- **`<schema> .get()` returns `null` — should be `not`.**
  Location: `tutorial.md` line 213 (prose).
  Stale → current: "`.get()` (single row or null)" → "single row, or `not` / absence if no rows."
  Category: deprecated-form (null-framing).
  Evidence: SPEC line 6095 `.get()` returns `Row | not`; line 6325 "failed `.get()` returns `not`". `null` does not exist in scrml (S89). Internally inconsistent with the tutorial's own line-9 warning. *(MED here per the absence-rule sensitivity; snippet code itself correctly uses `row is some`.)*

- **`server function` modifier is deprecated.**
  Location: `tutorial.md` line 849 + `07-channel-chat.scrml` line 8.
  Stale → current: `server function postMessage(...)` → `function postMessage(...)` (server is structurally inferred from channel cell-write / broadcast escalation).
  Category: deprecated-form.
  Evidence: live compile fires `W-DEPRECATED-SERVER-MODIFIER` ("`'server'` modifier ... is redundant ... deprecated; remove from new code", Insight 26); dropping it clears the lint. SPEC-INDEX §38.4/§38.6 (D2 server-keyword-eliminate, 2026-06-10).

- **`§6` line-791 auto-await prose: wrong mechanism + inverted `E-PROG-004` severity. [critic-missed]**
  Location: `tutorial.md` line 791 (§6 Note block) + the §13.1 cross-ref on the same line.
  Stale → current: "The compiler auto-awaits every statically-known `Promise<T>` ... cross-program await emits Info-level lint `E-PROG-004`" → **canonical async surface is compiler-managed body-split/CPS (§19.9.3/§19.9.8, S114), uncolored at source; an UNAWAITED cross-program call is a compile ERROR `E-PROG-004` (§40.4), not an Info-level lint.** Also re-cite the no-async/await SHALL-NOT rule to **§19.9.8**, not §13.1.
  Category: stale-mechanism / wrong-severity / stale-section-ref.
  Evidence: `grep 'auto-await' SPEC.md` → 0 hits; SPEC line 21743 "Unawaited cross-program calls SHALL be compile error E-PROG-004"; §34 catalog line 17156 lists `E-PROG-004` severity **Error**; §13.1 line 7090 is "Developer-Visible Syntax", not the prohibition. (Distinct from the refuted line-1088 anti-pattern cell — see Dropped.)

- **Glossary `<Variant rule=.A | .B>` missing required parens. [critic-missed]**
  Location: `tutorial.md` glossary line 1055.
  Stale → current: `<Variant rule=.A | .B>` → **`<Variant rule=(.A | .B)>`** (multi-target `rule=` MUST be parenthesized; §51.0.F forms are single `.X`, multi `(.A | .B)`, wildcard `*`).
  Category: broken/invalid-form.
  Evidence: bare repro `<Loading rule=.Loaded | .Failed>` **FAILS** `E-ENGINE-RULE-INVALID-VARIANT`; SPEC §51.0.F lines 16915/25032. The tutorial's working snippets (04b 512/723) correctly parenthesize — only the glossary entry is wrong.

- **Markup-position UI dispatch teaches only JS-style-match-with-`lift`.**
  Location: `tutorial.md` lines 612–636 + §5.6 prose 686–688.
  Stale → current: UI case-analysis canonically uses the structural block-form `<match for=SignupPhase on=@signupPhase> <Editing>...</> <Submitting>...</> <Done>...</> </>`; JS-style `match expr { arm :> value }` is for value-return contexts.
  Category: superseded-canonical.
  Evidence: SPEC §18.0 table lines 11091–11094 + §18.0.1 line 11114/11191; block-form repro compiles clean. *(Coupled with the HIGH "block-form unshipped" fix; this is the §5 application site.)*

---

## LOW

- **`<each>` is the canonical iteration primitive and is mentioned ZERO times. [MERGED]**
  Locations: §1 markup-extensions list (lines 68–69), §3.2 (357–371), §3.5 (405–409), §8 (866–870 + `07-channel-chat.scrml` 28–31), §10 (lines 992), glossary line 1050. `grep -c '<each' docs/tutorial.md` = 0.
  Stale → current: keep Tier-0 `for`/`lift` (still valid) but present **`<each in=@coll as x>...</each>` (SPEC §17.7, S130 HU-1) as the canonical Tier-1 structural form**; add `<each>` to the markup-extensions list and the glossary iteration entry.
  Category: missing-now-canonical.
  Evidence: `for`/`lift` repros fire `W-EACH-PROMOTABLE` ("Promote to `<each ...>` ... the canonical iteration shape per S130 HU-1"); `<each>` form compiles clean. SPEC §17.7.1 line 10696 marks `<each>` Canonical, §17.4 line 10302 marks for/lift Tier 0.
  **CRITICAL FIXER NOTE (adversary-confirmed):** the canonical binder is the **space form `as x`**, NOT `as=x`. `<each in=@items as=x>` FAILS `E-SCOPE-001` "Undeclared identifier `x`". Several auditor findings proposed `as=x` — do not copy that; use `as x`.

- **Block-form `<match>` absent from glossary (Tier-1 markup shape).**
  Location: glossary line 1053. Stale → current: add the block-form `<match for=Type on=expr> <Variant>...</> </>` alongside the JS-style entry. Category: missing-now-canonical. Evidence: block-form repro compiles clean; SPEC-INDEX §18 row documents both shapes.

- **`E-SYNTAX-042` cross-ref cites §7; correct section is §42.**
  Location: `tutorial.md` line 831. Stale → current: cite **§42 ("`not` — The Unified Absence Value")**, not §7 (Logic Contexts). The error code and the "no null/undefined" claim are correct; only the section number is wrong. Category: stale-section-ref. Evidence: SPEC line 21335 §42; §7 body has no absence rule; §34 `E-SYNTAX-042` row cross-refs §17.6/§45.

- **`is some` / `is not` semantics described via "null or undefined." [critic-missed]**
  Location: `tutorial.md` line 215. Stale → current: define `is some` = present, `is not` = absent (`not`); scrml has no null/undefined in source (§42.1/S89) — don't define the absence semantics in terms of runtime null/undefined states. Category: null-framing. Evidence: SPEC §42.1; the §7 anti-pattern table middle column is fine because it's explicitly labeled "JavaScript."

- **`§13.1` cross-ref for the no-async/await prohibition is the wrong section. [critic-missed, partially folded into line-791 MED]**
  Location: `tutorial.md` line 791. Stale → current: cite **§19.9.8** (S114 language-wide standing rule). Category: stale-section-ref. Evidence: §13.1 line 7090 = "Developer-Visible Syntax"; the SHALL-NOT rule lives at §19.9.8 (lines 7363/7436/13121–13135). *(Same line as the MED auto-await finding; track together.)*

- **Anti-pattern table "compiler auto-awaits" parenthetical — wording.**
  Location: `tutorial.md` line 1088. Stale → current: optionally reword to "(compiler-managed; no `await` needed)". Category: other. Evidence: the replacement code `const user = fetchUser()` is already correct. **NOTE: see Dropped — the *anti-pattern-cell* reword was adversary-refuted (SPEC itself uses "the compiler inserts `await` automatically"). Retained at LOW only as an optional clarity touch, NOT a correctness fix. The real auto-await correctness defect is at line 791 (MED), a different location.**

- **`<engine>` glossary parenthetical "(file level)".** *(Folded into the MED engine-placement merge; the glossary line 1054 instance is LOW on its own.)* Stale → current: "(direct child of `<program>`)". Evidence: contradicts prose 491/537/544 + footer.

- **Version claim — header/intro (line 9).** Stale → current: drop the "v0.2.6 + v0.3.0-alpha.0 in flight / v0.3.0 stable pending Wave 4 / S52–S92 arc as current" parenthetical; current shipped binary is **v0.7.0**. Category: stale-version-claim. Evidence: `scrml --version` → `0.7.0`; `package.json` = "0.7.0".

- **Version claim — "v0.3 surface" (line 641) + glossary heading "v0.3 primitives" (1032) + footer "v0.3.0 STABLE shipped" (1112). [MERGED]** Stale → current: relabel to v0.7.0; the program-as-container shape is still canonical but the version tags predate v0.4–v0.7. Category: stale-version-claim. Evidence: `package.json` 0.7.0; SPEC-INDEX footer at S185.

- **SPEC line-count "about 26,000 lines" (line 1026).** Stale → current: **about 32,000** (`wc -l SPEC.md` = 32,241). Category: stale-version-claim. Evidence: empirical `wc -l`.

- **`verify-tutorial.sh` header names "the v0.2.4 compiler." [critic-missed]** Location: `docs/tutorial-snippets/verify-tutorial.sh` line 3. Stale → current: "the v0.7.0 compiler." Category: stale-version-claim. Evidence: current shipped is v0.7.0; harness header even older than tutorial.md's v0.2.6 claims.

---

## Dropped (adversary-refuted)

- **Auditor finding #35 — line 1088 "compiler auto-awaits" reword to "body-split/CPS."** **(adversary-refuted: "the compiler inserts `await` automatically" is SPEC-normative verbatim phrasing — SPEC §44.4 line 21813, lines 4858/5054/7057/7106. The suggested reword pushes adopter prose toward implementation-detail wording the SPEC does not mandate; the replacement code is already correct.)** Note: this does NOT excuse the *separate* line-791 prose, which has a real mechanism + severity defect and is retained at MED.

---

## Remediation plan

### A. Snippet fixes (need-rewrite — compile-verify each after)
1. **02b `<schema>` → inside `<program>`** (HIGH). Edit both `tutorial.md` lines 158–204 and `02b-counter-persisted.scrml` lines 3–8; move `<schema>` to be a direct child of `<program>`, alongside `<db>`. Recompile to confirm `E-SCHEMA-003` clears.
2. **Glossary `rule=.A | .B` → `rule=(.A | .B)`** (MED), line 1055. Add parens.
3. **Drop file-top `${...}` wrapper** from snippet files `03`, `04a`, `04b`, `05`, `06` (MED) and the §3.3 inline const-component example (MED, tutorial lines 305–316). Recompile to confirm `W-PROGRAM-REDUNDANT-LOGIC` clears.
4. **Align `<engine>` placement** to inside `<program>` in `04b` (header + code) and glossary (MED).

### B. Prose-syntax migrations (mostly mechanical; one is a careful sed)
5. **`=>` / `->` arm separators → `:>`** (MED, 14 locations) — **mechanical but context-sensitive.** Apply only in match-arm and `!{}`-handler-arm positions. **MUST NOT touch:** `->` fn-return separators (`function f(...)! -> Err`), or `=>` JS arrow-function glyphs (`(e) => fn(e)`). Recommend a targeted regex anchored on `^\s*\|?\s*\.?\w+(\([^)]*\))?\s*(=>|->)\s*\{` then manual review, NOT a blind global replace.
6. **§7 `not`-as-negation inversion → `!`** (HIGH) — **need-rewrite.** Flip the negation table row (lines 807/811) so `!` is canonical boolean negation and `not` is documented as absence-only; flip the anti-pattern table RIGHT column (line 1095); switch usage sites 601/626/690/762/825 to `!`. Note in the report margin that the compiler currently under-enforces `E-TYPE-045` — but follow SPEC (Rule 4).
7. **`scrml init` scaffold prose** (HIGH) — rewrite line 26 + setup block 19–24 to `src/app.scrml` + `.gitignore`, `scrml dev src/app.scrml`.
8. **Block-form `<match>` is shipped** (HIGH) — rewrite the line-487 Note + `04a` header + §5.6 prose (686–688) + §5 markup-dispatch (612–636) to teach block-form as canonical UI dispatch and JS-style as value-return.
9. **`<onTransition>` directional model** (MED) — rewrite line 542 + glossary 1056 to the `to=`/`from=` single-attribute placement model.
10. **`server function` → `function`** (MED), line 849 + `07-channel-chat.scrml` line 8.
11. **§6 line-791 auto-await prose** (MED) — rewrite to body-split/CPS, fix `E-PROG-004` to compile-ERROR polarity, re-cite §19.9.8.
12. **`.get()` returns `not` not `null`** (MED), line 213.
13. **`is some` / `is not` framing** (LOW), line 215 — drop "null or undefined."

### C. Version-claim updates (mechanical)
14. Line 9 version parenthetical → v0.7.0 (or drop speculative metadata).
15. Lines 641 / 1032 / 1112 "v0.3" labels → v0.7.0.
16. Line 1026 "about 26,000 lines" → "about 32,000."
17. `verify-tutorial.sh` line 3 "v0.2.4" → "v0.7.0."

### D. Section-ref fixes (mechanical)
18. Line 831 `E-SYNTAX-042` cross-ref §7 → §42.
19. Line 791 no-async/await prohibition cross-ref §13.1 → §19.9.8.

### E. New-canonical additions (need-rewrite)
20. **Add `<each in=@coll as x>...</each>`** as the canonical Tier-1 iteration primitive: markup-extensions list (§1 line 68), §3.2, §8, §10, glossary line 1050 — keep `for`/`lift` as the documented Tier-0 form. **Use the space binder `as x`, never `as=x`.**
21. **Add block-form `<match>`** to the glossary (line 1053) alongside the JS-style entry.

---

## Verified-clean (do NOT touch)

- **Derived/projection-engine `=>` arrows** — `.Small => .AtRisk` / `.Big | .Fire => .Safe` in §4.5 (lines 562–569) and glossary `<engine for=T derived=@source>` (line 1057). The §51.9 projection-rule grammar uses `=>` as the canonical separator; the real `examples/14-mario-state-machine.scrml` compiles clean with no `W-MATCH-ARROW-LEGACY`. **The arm-arrow migration MUST NOT touch projection-rule arrows.**
- **`fn`-return separator `->`** — `function persist(...)! -> Err` (lines 967, 746) stays valid; only ARM-context `->` migrates.
- **`if=` / `else-if=` / bare `else` conditional-rendering chain** — §3.5 (401–412) and §4.1 (428–432) compile clean; still canonical.
- **Schema field syntax** — both comma-separated single-line and newline-separated field forms compile clean; the prose comma form (lines 209, 938) is fine. (Only the `<schema>` *placement* is wrong, not the DDL.)
- **`row is some` presence check in the 02b/§2.2 snippet code** — correct (it's the prose line 213 that drifts to "null").
- **Anti-pattern table `const user = fetchUser()` replacement code** (line 1088) — correct as written; only the optional parenthetical wording is debatable (and the reword was adversary-refuted).
- **The `not` *absence-value* usages** (e.g. `value is not`, `.get()` → `not`, `null`/`undefined` → `not` migrations) — correct; only the `not`-as-*negation* usages are the §7 defect.
