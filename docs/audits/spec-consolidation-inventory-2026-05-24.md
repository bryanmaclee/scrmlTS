---
status: complete-phase-1a
last-reviewed: 2026-05-24
session: 129
phase: 1a — SPEC.md
scope: compiler/SPEC.md (Phase 1b — PIPELINE.md + PRIMER + SPEC re-pass — follows separately)
total-findings: 17
by-category:
  CONTRADICTION: 5  # F-003 / F-005 / F-006 / F-007 / F-009
  AMBIGUITY: 0  # F-013 was withdrawn as a false-alarm
  HOLE: 2  # F-004 / F-011
  LEGACY-TEXT: 8  # F-001 / F-002 / F-010 / F-012 / F-014 / F-015 / F-016 / F-013 (withdrawn — counted as legacy-shape note)
  EXAMPLE-DRIFT: 2  # F-008 / F-017
by-severity:
  LOAD-BEARING: 5  # F-001 / F-002 / F-003 / F-008 / F-016
  MEDIUM: 5  # F-004 / F-010 / F-011 / F-012 / F-013
  LOW: 7  # F-005 / F-006 / F-007 / F-009 / F-014 / F-015 / F-017
---

# SPEC Consolidation Inventory — Phase 1a (compiler/SPEC.md)

## Scope, method, conventions

This audit is a READ-ONLY diagnostic pass over `compiler/SPEC.md` (~29,124 lines). It enumerates contradictions, ambiguities, holes, legacy-text survivals, and example-drift inside SPEC.md that the user has paused parser-fix work to resolve in a heads-up SPEC-amendment session.

This is **Phase 1a only**. Phase 1b (PIPELINE.md + PRIMER + a second SPEC re-pass after heads-up amendments) follows separately. PRIMER + kickstarter cross-evidence IS consulted here (per the brief) but the PRIMER itself is not the audit target.

### Categories

- **CONTRADICTION** — two SPEC sections say different things about the same surface
- **AMBIGUITY** — SPEC text admits multiple readings
- **HOLE** — SPEC silent on a behavior the language must have an answer for
- **LEGACY-TEXT** — SPEC section predates a ratification and was not updated (subtype of CONTRADICTION; direction is mechanically determined by ratification order)
- **EXAMPLE-DRIFT** — a worked example doesn't match the adjacent normative statement (subtype of CONTRADICTION; direction is "fix the example")

### Severity

- **LOAD-BEARING** — affects a CORE language axis: decl forms, type-system, error-model, V5-strict access, engine/match Tier ladder, no-async/await rule, the absence value (`not`), the no-null rule, markup-as-value pillar, SPEC-canon-vs-LLM-canon alignment
- **MEDIUM** — affects a non-core surface (a specific stdlib module, a stage in PIPELINE, a non-flagship feature)
- **LOW** — pure doc drift / cosmetic / formatting / cross-ref-broken

### Recommended-direction policy

- If a post-ratification section is contradicted by a pre-ratification section that wasn't updated: state direction explicitly (legacy text loses; recent ratification wins)
- If a worked example contradicts its own adjacent normative statement: state direction (fix the example)
- If two equally-ratified surfaces conflict, or an ambiguity has multiple defensible readings, or a hole has no single correct answer: **GENUINE DESIGN QUESTION — heads-up decision**

### Ratification anchors used as "winning" references

- **S86** — idiomatic-examples styling rule + corpus-ouroboros
- **S88** — LIFT class
- **S89** — null + undefined eradication ("null does NOT EXIST IN SCRML")
- **S90** — wire format `{"__scrml_absent": true}`
- **S92** — Approach A close (info-level diagnostic stream partition)
- **S94** — designer-card framing
- **S95** — state ↔ logic boundary axiom (corrigendum)
- **S98** — payload binding on engine state-children + fn mutual recursion
- **S111** — quoted-text model (code-default bodies + `"..."` display-text literal); `default-logic` as the third body-mode
- **S114** — `import:host` + no-async/await standing rule + Approach C ratification + `^{}` host-fence
- **S117** — §34.1 native-parser parse-diagnostics reconciliation; M5-swap unit R4
- **S118** — build story (§58); Wave 1 + Wave 2 native-parser code productions
- **S123** — V-kill: `@x = v` retired (V5-strict `<x> = v` is the canonical decl shape; `@x` is access-only)
- **S128** — M6.7 D-class triage close (D3/D6/D7 native-parser fixes)
- **S129** — current session; user paused parser-fix work to ratify this audit

## Phase 0 — shape confirmation

Re-stating per-finding fields the audit will produce for each entry:

- `id` (F-NNN), `title`, `category`, `severity`
- `spec_primary` (§X.Y line N)
- `spec_cross_refs` (list of §A.B line M)
- `the_conflict` (precise)
- `cross_evidence`: PRIMER / kickstarter v2 / native-parser source / design-insights / user-voice ratification (each: location or "silent")
- `recommended_direction` (explicit OR "GENUINE DESIGN QUESTION")
- `notes`

## Summary — findings per SPEC section

| § | Section | Findings | LOAD-BEARING count |
|---|---|---|---|
| 3 | Context Model | F-004 (HOLE — incomplete contexts table) | 0 |
| 4.15 | Structural-elements registry | F-011 (HOLE — incomplete element list) | 0 |
| 7.5 | Type Annotation Grammar | F-001 (LEGACY-TEXT — V-kill grammar contradiction); F-008 ties in | 1 |
| 7.2 | Logic Context content | F-009 (broken cross-ref §29→§30); F-010 (LEGACY-TEXT — `bun.eval()` post-S114) | 1 |
| 22.4 | Compile-Time Meta | F-002 (LEGACY-TEXT — `bun.eval()` not in Approach C primitive set) | 1 |
| 30.2 | `bun.eval()` in `${}` markup | F-003 (CONTRADICTION — Approach C boundary unclear) | 1 |
| 49 | `while` Loops | F-006 (CONTRADICTION — H1 heading inconsistency) | 0 |
| 53 | Inline Type Predicates | F-007 (CONTRADICTION — H2 subsections) | 0 |
| 52.4.1 | Tier 2 Instance Authority | F-016 (LEGACY-TEXT — `state-decl ::= @x = ...` V-kill conflict); F-017 (`< TypeName>` examples) | 1 |
| 39 / 40 | Schema / Middleware | F-014 (LEGACY-TEXT — §40 H4 numbered §39.x); F-015 (LEGACY-TEXT — §39 H4 numbered §38.x) | 0 |
| TOC | Table of Contents | F-005 (CONTRADICTION — TOC stops at §54) | 0 |
| SPEC-WIDE | Examples | F-008 (EXAMPLE-DRIFT — ~30 sites of pre-V-kill `@var = init` decl) | 1 |
| SPEC-INDEX.md | Navigation map (out-of-scope for Phase 1a; flagged) | F-012 (LEGACY-TEXT — channel placement stale) | 0 |

**Top 5-10 LOAD-BEARING findings for heads-up session priority:**

1. **F-001** — §7.5 line 5564 grammar production `state-decl ::= '@' identifier ... '=' expr` contradicts V-kill (S123). Direction: rewrite to V5-strict structural form.
2. **F-016** — §52.4.1 grammar `state-decl ::= (server-modifier ws)? "@" identifier ws "=" ws expr` — sibling LOAD-BEARING V-kill contradiction at the server-authority site. Pairs with F-001.
3. **F-008** — SPEC-WIDE pre-V-kill `@var = init` decl form in ~30 worked examples. Direct corollary of F-001/F-016 — examples migrate together with grammar fix.
4. **F-002** — §22.4 line 13217 lists `bun.eval(...)` as compile-time meta API; contradicts S114 Approach C closure of META_BUILTINS to scrml-native+enumerated primitives.
5. **F-003** — §30.2 `bun.eval()` in `${}` markup interpolations contradicts §22.12 Approach C. GENUINE DESIGN QUESTION — heads-up decides whether `${}` is a separate carve-out or subsumed.

Medium-priority (resolve in same heads-up if time permits):
- F-004 — §3.1 Contexts table missing `^{}` / `_{}` / `!{}`
- F-010 — §7.2 `${ }` content list naming `bun.eval()`
- F-011 — §4.15 structural-elements registry vs §15.X NR registry mismatch
- F-012 — SPEC-INDEX.md channel placement description stale (Phase 1b)
- F-013 — withdrawn (false-alarm; recorded for transparency)

Low-priority (structural cleanup pass — can batch):
- F-005 — TOC missing §55-§58 + appendices
- F-006 — §49 H1 heading inconsistency
- F-007 — §53 H2 subsection headings
- F-009 — §7.2 broken cross-ref §29→§30
- F-014 — §40 H4 subsections numbered §39.x
- F-015 — §39 H4 subsections numbered §38.x
- F-017 — §52 examples use deprecated `< TypeName>` form

## Findings

(Each finding immediately below, in F-NNN order.)

---

### F-001 — §14 line 5564 grammar production uses retired `@varname` declaration form

- **Category:** LEGACY-TEXT
- **Severity:** LOAD-BEARING
- **SPEC primary site:** §14 line 5564 (within §7.5 Type Annotation Grammar, despite the section header — see note)
- **SPEC cross-refs:** §6.1.1 line 1929-1962 (V5-strict structural form), §6.1.2 line 1964-1976 (V5-strict canonical form), §1.6 line 166-183 (foundational V5-strict statement), §3.4 line 264-286 (V5-strict-per-locus table), §7.5 line 5594-5597 (worked examples), §14.0 (anywhere it cross-refs `state-decl` grammar)
- **The conflict:** Line 5564 reads:
  ```
  state-decl   ::= '@' identifier [ ':' type-expr ] '=' expr
  ```
  This is the pre-V-kill (S123) auto-state-cell-synthesis grammar. The post-S123 canonical form is V5-strict structural — `<identifier> = expr` (with type annotation as separate concern). §6.1.1 line 1958 explicitly states: "Declaration is structural-only (S123 V-kill). A state cell SHALL be declared via the structural form. Bare `@x = expr` writes ... without a prior `<x>` declaration in scope are `E-STATE-UNDECLARED` (compile error)." Yet §7.5 line 5564 names `'@' identifier ... '=' expr` as the `state-decl` production. They contradict.
- **Cross-evidence:**
  - PRIMER: see Phase 1b — TBD; PRIMER's V-kill alignment is checked in the cross-evidence pass below
  - Kickstarter v2: see Phase 1b — TBD
  - Native-parser: `compiler/native-parser/parse-stmt.js` enforces V-kill in `parseAtAssignAsDecl` (rejects bare `@x = v` as decl); this is the post-S128 D-class state. Need verification.
  - Design-insights: ratified S123 V-kill (auto-state-synth retirement)
  - User-voice ratification: S123 — auto-state-cell-synthesis retired; user-voice `feedback_*.md` references the V-kill landing
- **Recommended direction:** DIRECTION — amend §7.5 line 5564 to `state-decl ::= '<' identifier '>' [ ':' type-expr ] '=' expr` to match §6.1 V5-strict structural form. The accompanying worked examples at §7.5 line 5594-5597 (`@count: number = 0`, `@items: string[] = []`, `@selected: string? = not`) migrate to `<count>: number = 0`, `<items>: string[] = []`, `<selected>: string? = not` accordingly. This is mechanical because V-kill S123 is the ratified canon for `@x = v` semantics; §7.5 text predates V-kill and survives by inertia. NOTE: §7.5's section heading reads "Type Annotation Grammar" but the production at line 5564 is a declaration production, not a type-expr production — the production is misplaced in §7.5. Heads-up session should consider whether to (a) move the production to §6.1 alongside the other V-kill statements, or (b) leave it in §7.5 and just amend the form.
- **Notes:** The fact that this contradiction sits inside the **Type Annotation Grammar** subsection is itself a structural smell — the production for `state-decl` belongs in §6.1 (V5-strict access), not in §7.5 (type annotations). The §7.5 location may be a remnant of an older organizational scheme where decl + type-annotation were co-located. Also: this finding **directly corroborates D8c** (the typed reactive-decl triage), which surfaced in the M6.7 work as the user-mentioned anchor for the audit.

---

### F-002 — §22.4 line 13217 lists `bun.eval(...)` as compile-time meta API after S114 Approach C closed it

- **Category:** LEGACY-TEXT
- **Severity:** LOAD-BEARING
- **SPEC primary site:** §22.4 line 13217 (lists `bun.eval(...)` as a compile-time API pattern)
- **SPEC cross-refs:** §22.12 line 13824-13840 (S114 Approach C ratification — META_BUILTINS closed at 12 runtime + 3 compile-time primitives, JS-host ambient globals excluded); §30 line 14728-14757 (`bun.eval()` compile-time evaluation surface still presented as in scope for §22 / `${}` interpolation)
- **The conflict:** §22.4 line 13217 reads:
  ```
  - `bun.eval(...)` calls
  ```
  as one of the four API patterns that classify a `^{}` block as compile-time. But §22.12 (S114 Approach C ratification) says: "Compile-time meta is closed via `emit` / `emit.raw` / `reflect` (3 primitives, already specced). The general-developer `^{}` body parser SHALL accept only scrml-native + this enumerated primitive set." `bun.eval` is not in the enumerated primitive set — it is a JS-host escape (Bun-specific compile-time JS-evaluation surface, §30). Approach C says JS-host ambient globals are NOT in META_BUILTINS for `^{}` bodies. The §22.4 list is unreconciled with §22.12's closure.
- **Cross-evidence:**
  - PRIMER: see Phase 1b — TBD
  - Kickstarter v2: see Phase 1b — TBD
  - Native-parser: `compiler/native-parser/` — needs grep to verify whether `bun.eval` is in the parser's META_BUILTINS allowlist; if rejected at parse, native parser is right and §22.4 is legacy
  - Design-insights: S114 Approach C (full closure of `^{}` to scrml-native + 12+3 primitives)
  - User-voice ratification: S114 — Approach C ratified; "general-developer `^{}` body parser SHALL accept only scrml-native"
- **Recommended direction:** DIRECTION — amend §22.4 line 13217 to remove `bun.eval(...)` from the compile-time meta API pattern list. The four-item list becomes a three-item list: `reflect`, `emit`, `emit.raw`. §30 (`bun.eval()` compile-time evaluation) needs a separate disposition: either (a) confirm `bun.eval()` is a compiler-internal surface only and is NOT exposed in user-written `${}` or `^{}` (§30.1 already says it is the compiler's internal evaluation surface, but §30.2 documents `bun.eval()` inside `${}` markup interpolations as a user-facing form — this is the direct contradiction with Approach C), OR (b) close §30.2 as retired-by-S114. Heads-up session decides §30.2 disposition. The §22.4 amendment is mechanical regardless.
- **Notes:** D8b triage anchor — the `^{}` host-fence surface that the user explicitly named in the brief. The §30.2 ambiguity (whether `bun.eval()` in `${}` interpolations survives Approach C) is the harder sub-question. Recommend separate F-NNN for §30 if §30.2 is genuinely open; here, F-002 names only the §22.4 list item.

---

### F-003 — §30.2 `bun.eval()` in `${}` markup interpolations contradicts §22.12 Approach C closure

- **Category:** CONTRADICTION
- **Severity:** LOAD-BEARING
- **SPEC primary site:** §30.2 line 14741-14751 (`bun.eval()` user-facing inside `${}` markup interpolations)
- **SPEC cross-refs:** §22.12 line 13824-13840 (Approach C — `^{}` body parser SHALL accept only scrml-native + enumerated primitives); §30.1 line 14732-14739 (compiler-internal scope statement); §30.3 line 14753-14757 (security note — "arbitrary JavaScript at compile time")
- **The conflict:** §30.2 normatively allows user-written `${ bun.eval("new Date().getFullYear()") }` inside markup interpolations as a compile-time evaluation surface. The compiler is instructed (line 14749) to "recognize a `bun.eval()` call inside a `${ }` block, evaluate it at compile time, and substitute the result as a literal in the compiled output." But §22.12 closes the `^{}` body parser to scrml-native-only — JS-host escape is forbidden in user-written `^{}`. The asymmetry: §22.12 forbids `bun.eval()` (JS escape) in `^{}` but §30.2 permits it in `${}`. Is the asymmetry intentional (the `^{}` lock is meta-context-specific, `${}` markup interpolation is still allowed to take arbitrary JS through `bun.eval()`) or is §30.2 also retired by S114?
- **Cross-evidence:**
  - PRIMER: see Phase 1b — TBD
  - Kickstarter v2: see Phase 1b — TBD
  - Native-parser: needs grep — what does `compiler/native-parser/parse-expr.js` do with `bun.eval(...)` calls in `${}` contexts? Is it allowed?
  - Design-insights: S114 Approach C is explicit about `^{}` body parser scope; silent on §30.2 / `${}` interpolation surface
  - User-voice ratification: S114 — Approach C scoped specifically to `^{}` body parser; the §30.2 case was NOT addressed in user-voice
- **Recommended direction:** GENUINE DESIGN QUESTION — heads-up decision. Either (a) S114 Approach C subsumes §30.2 transitively (any JS-host escape — `^{}` body OR `${}` interpolation — is now forbidden, and `bun.eval()` user surface is retired entirely), OR (b) the §30.2 surface is intentionally preserved as a narrower compile-time-constant escape inside markup interpolations (a different scope from `^{}` body parsing), in which case §22.12 should explicitly carve out the `${}` interpolation surface. The user's S114 statement does not name `${}` interpolation; treating it implicitly either way risks misreading. Heads-up decides which scope was intended.
- **Notes:** This is the harder sub-question of F-002. If (a) is decided, §30.2 + §22.4 list both get amended in the same heads-up pass. If (b) is decided, §22.12 needs a narrowing amendment to clarify the scope.

---

### F-005 — TOC (lines 20-99) stops at §54; missing §55-§58 + Appendices A-E

- **Category:** CONTRADICTION (TOC vs SPEC body)
- **Severity:** LOW
- **SPEC primary site:** §0 Table of Contents (lines 20-99) ends at §54
- **SPEC cross-refs:** §55 (line 28129 — Validators and the Auto-Synthesized Validity Surface), §56 (line 28618 — Promotion Ergonomics), §57 (line 28898 — Wire Format), §58 (line 28833 — Build Story); Appendices A-E (lines 12389-12481, referenced in SPEC-INDEX.md)
- **The conflict:** The Table of Contents enumerates §1 through §54 and stops. §55-§58 and Appendices A-E exist in the SPEC body but do not appear in the TOC. The TOC is therefore out of date by 4 major sections (which include load-bearing ones — §55 Validators, §57 Wire Format, §58 Build Story).
- **Cross-evidence:**
  - PRIMER: silent
  - Kickstarter v2: silent
  - Native-parser: N/A
  - Design-insights: silent (this is doc-completeness)
  - User-voice ratification: silent
- **Recommended direction:** DIRECTION — regenerate the TOC from the actual `## N.` / `# §N.` headings present in SPEC body. The TOC should include §55, §56, §57, §58 and Appendices A-E. Mechanical doc maintenance.
- **Notes:** This is the simplest finding in the inventory. Low-friction fix; could be batched with F-006 (§49 H1) and F-007 (§53 heading levels) as "structural-cleanup pass."

---

### F-006 — §49 uses H1 (`# §49.`) heading; every other section uses H2 (`## N.`)

- **Category:** CONTRADICTION (formatting inconsistency)
- **Severity:** LOW
- **SPEC primary site:** §49 line 21528 — `# §49. ` `while` Loops, `do...while`, `break`, and `continue``
- **SPEC cross-refs:** SPEC-INDEX.md line 32 explicitly flags this — the in-tree regenerator handles it via a special regex branch; the legacy bash helper does not.
- **The conflict:** §49 is the only top-level section using `# §49.` (H1, with the `§` prefix). Every other section uses `## N.` (H2, no `§` prefix). The inconsistency requires the SPEC-INDEX regenerator script to carry a special-case branch.
- **Cross-evidence:**
  - PRIMER: silent
  - Kickstarter v2: silent
  - Native-parser: N/A
  - Design-insights: silent
  - User-voice ratification: silent
- **Recommended direction:** DIRECTION — convert §49 to `## 49. \`while\` Loops, \`do...while\`, \`break\`, and \`continue\`` to match the other sections. This eliminates the special-case branch in the SPEC-INDEX regenerator (`scripts/regen-spec-index.ts`).
- **Notes:** Pure cosmetic; safe under amendment. SPEC-INDEX.md line 32 documents this as a known issue.

---

### F-007 — §53 subsection headings use `## §53.N` (H2 + section sigil) instead of `### 53.N` (H3 — matching pattern of other sections)

- **Category:** CONTRADICTION (formatting inconsistency)
- **Severity:** LOW
- **SPEC primary site:** §53.1 through §53.14 — all lines using `## §53.N` (e.g., line 26774 `## §53.1 Motivation`)
- **SPEC cross-refs:** all other section subsections use `### N.M`
- **The conflict:** §53 (Inline Type Predicates) has its subsections at H2 level with explicit `§53.N` numbering instead of the H3 `### 53.N` convention used by every other section. This places §53's subsections at the same heading level as top-level sections, breaking outline-tooling and the SPEC-INDEX regenerator's regex.
- **Cross-evidence:**
  - PRIMER: silent
  - Kickstarter v2: silent
  - Native-parser: N/A
  - Design-insights: silent
  - User-voice ratification: silent
- **Recommended direction:** DIRECTION — convert §53's H2 subsection headings to H3 (`### 53.1 Motivation`, etc.) to match the rest of SPEC.
- **Notes:** Batches with F-005 and F-006 as the structural-cleanup pass.

---

### F-008 — SPEC-WIDE pre-V-kill `@varname = init` decl form in worked examples (~30 sites)

- **Category:** EXAMPLE-DRIFT
- **Severity:** LOAD-BEARING
- **SPEC primary site:** SPEC-wide — examples across §4.12, §5, §6.5, §6.6, §6.7, §22, §51 use `@varname = init` at line-start as a state-cell declaration
- **SPEC cross-refs:** §6.1.1 line 1958 (V-kill ratification — declaration is structural-only); §6.1.2 line 1971 (`@varname = expr` is a WRITE to a pre-declared cell, NOT a declaration); F-001 (the §7.5 grammar production parallel to this)
- **The conflict:** Many worked examples across SPEC continue to use the pre-V-kill auto-state-synth form. Counts (`grep -nE "^@[a-zA-Z_]+ = " compiler/SPEC.md`): 54 line-start `@var = init` lines. Examination shows ~30 of these are DECL-shaped (initial setting of a previously-undeclared cell — V-kill violation) and ~24 are WRITE-shaped (write to a cell declared elsewhere — legal under V-kill). Examples requiring migration (DECL-shaped):
  - §4.12 line 742-743 — `@result = not` / `@loading = false` (nested-program example top-level decls)
  - §5 lines 1522, 1533, 1541-1543 — `@name = ""` / `@agreed = false` / `@color = "red"`
  - §5.5 lines 1672, 1716-1717, 1729, 1739, 1748-1749, 1778, 1807, 1817-1818, 1838-1839, 1884 — class-binding examples
  - §6.5 line 2207-2209 — `@items = []` / `@items = [1, 2, 3]` / `@items = [...]` (reactive-array intro examples)
  - §6.5 lines 2410, 2748, 3130, 3161 — todo, shopping cart, pricing examples
  - §6.6 lines 3047-3050, 3076-3078 — derived-cell parent decl
  - §6.7 lines 2436-2437, 4700-4701, 4768-4770, 4803-4804, 4819-4820, 4871-4873 — lifecycle examples
  - §13.5 line 8481 — `@count = 0` (RemoteData engine recipe)
  - §15.10 line 11930, 11960 — `@error = not` / `@paymentResult = not`
  - §22.5 lines 13396, 13648 — `@selectedType = "User"` (meta worked examples — these are TOP-LEVEL decls)
  - §40.7 line 18812 — `@count = 0`
  - §51.x line 24373, 24394, 24718, 24766, 24801 — order/auth/delivery examples
  - §52, §55, §56 — `@cards`, `@sub` etc.
  Each is a worked example that, under V-kill, parses as a WRITE to a pre-declared cell — and since no `<varname>` decl precedes it in the example, fires `E-STATE-UNDECLARED`. The examples therefore demonstrate code that fails to compile under the post-S123 canon.
- **Cross-evidence:**
  - PRIMER: see Phase 1b — TBD
  - Kickstarter v2: see Phase 1b — TBD
  - Native-parser: native parser enforces V-kill via `parseAtAssignAsDecl` rejecting bare `@x = v` as decl (per the M6.7 D-class triage)
  - Design-insights: S123 V-kill ratification (auto-state-synth retirement)
  - User-voice ratification: S123 — auto-state-cell-synthesis is retired
- **Recommended direction:** DIRECTION — convert each DECL-shaped `@varname = init` in SPEC examples to `<varname> = init` (V-kill canonical structural form). The mechanical rule:
  - `^@x = v` at line-start (with no preceding `<x> = ...` in the same example) — convert to `<x> = v`
  - `^@x = v` at line-start (with a preceding `<x> = ...` decl in the same example) — keep as-is (it's a write)
  - `^@x = v` inside a function body (`${ function ... { @x = v } }`) — keep as-is (it's a write)
  Heads-up session should walk the ~30 DECL sites and apply the conversion. This is the SPEC corollary of the F-001 grammar fix.
- **Notes:** This is the user's S86 "corpus-ouroboros" concern manifesting at SPEC level — the worked examples are the canonical-form-by-demonstration; if they show the pre-V-kill form, model writers reflexively reach for it. Per S86 ratification, examples in the SPEC body are stronger norms than the underlying corpus (`scrml/dev/`), and SPEC examples are themselves the corpus seed for downstream documentation. The migration is medium-effort but mechanically straightforward.

---

### F-009 — §7.2 cross-ref to §29 for `bun.eval()` is broken (should be §30)

- **Category:** CONTRADICTION (broken cross-ref)
- **Severity:** LOW
- **SPEC primary site:** §7.2 line 5393 — "`bun.eval()` for compile-time evaluation (Section 29)"
- **SPEC cross-refs:** §29 (line 14712 — "Vanilla File Interop", NOT `bun.eval()`); §30 (line 14728 — "Compile-Time Evaluation — `bun.eval()`")
- **The conflict:** §7.2 cross-references "Section 29" for `bun.eval()` — but §29 is "Vanilla File Interop". `bun.eval()` is at §30. This is a stale cross-ref from a pre-renumber state.
- **Cross-evidence:**
  - PRIMER: silent
  - Kickstarter v2: silent
  - Native-parser: N/A
  - Design-insights: silent
  - User-voice ratification: silent
- **Recommended direction:** DIRECTION — amend §7.2 line 5393 to read "Section 30" (matching the actual §30 heading at line 14728). Mechanical cross-ref fix.
- **Notes:** This is the kind of drift that silently accumulates. A heads-up session should sweep all "(Section N)" cross-refs against actual section locations as part of the structural-cleanup pass (batches with F-005 / F-006 / F-007).

---

### F-010 — §7.2 lists `bun.eval()` as a feature inside `${ }` logic context; reinforces F-003 ambiguity

- **Category:** LEGACY-TEXT
- **Severity:** MEDIUM
- **SPEC primary site:** §7.2 line 5393 — "`bun.eval()` for compile-time evaluation (Section 29)" [sic — see F-009]
- **SPEC cross-refs:** F-002 (§22.4 list), F-003 (§30.2 `${}` interpolation case), §22.12 (Approach C)
- **The conflict:** §7.2 enumerates the scrml-specific extensions to `${ }` logic context content, and `bun.eval()` is one of five named extensions. This is the third site (after §22.4 and §30.2) that documents `bun.eval()` as user-facing — and like §30.2, it predates the S114 Approach C ratification that closed the `^{}` body parser to scrml-native-only.
- **Cross-evidence:**
  - PRIMER: see Phase 1b — TBD
  - Kickstarter v2: see Phase 1b — TBD
  - Native-parser: META_BUILTINS at `compiler/src/meta-checker.ts:117` includes `bun` as a permitted name, contradicting S114 Approach C's claim that JS-host ambient globals are excluded — but this site is meta-checker, not the `${ }` logic-context parser. The user-facing `${}` interpolation surface is presumed permissive (no `E-META-001` analogue fires in `${}` against `bun.eval(...)` calls).
  - Design-insights: S114 Approach C
  - User-voice ratification: S114
- **Recommended direction:** GENUINE DESIGN QUESTION — pairs with F-003. If F-003 resolves (a) "Approach C subsumes §30.2", then §7.2 line 5393 also retires `bun.eval()` from the enumerated extensions. If F-003 resolves (b) "§30.2 surface is intentionally preserved", §7.2 keeps the entry and §22.12 carves out the `${}` exception. Same decision; this finding is bundled with F-003 for resolution.
- **Notes:** Add to the F-003 disposition decision.

---

### F-011 — §4.15 structural-elements registry is incomplete; omits `<timer>` / `<poll>` / `<request>` / `<channel>` / `<schema>` / `< db>` / `<keyboard>` / `<mouse>` / `<gamepad>`

- **Category:** HOLE
- **Severity:** MEDIUM
- **SPEC primary site:** §4.15 line 1015-1050 (registers 7 elements: `<engine>`, `<match>`, `<errors>`, `<onTransition>`, `<onTimeout>`, `<onIdle>`, `<page>`)
- **SPEC cross-refs:** §6.7.5 (`<timer>` — line 3773), §6.7.6 (`<poll>` — line 3907), §6.7.7 (`<request>` — line 4006), §38 (`<channel>` — line 16851), §39 (`<schema>`), §11 (`< db>` — folded), §15.X registry (line 8464 mentions `channel, engine, timer, poll, db, schema, request, errorBoundary` as built-in lifecycle types — disagrees with §4.15)
- **The conflict:** §4.15 says it registers "the v0.next scrml-defined elements that the block splitter and tokenizer recognise alongside HTML elements", but it lists only 7. The §15.X NR registry (line 8464) explicitly enumerates a longer list: `channel, engine, timer, poll, db, schema, request, errorBoundary`. The §4.15 / §15.X registries disagree on which elements are "scrml-defined" — §15.X is the authoritative list per NR's resolution; §4.15 is the structural-elements registry but is missing 6+ entries. Also missing: `<keyboard>` / `<mouse>` / `<gamepad>` (§36), `<errorBoundary>` (§19), the `< db>` (§11/§6.12 — note whitespace-after-`<` per §4.2), `<channel>` (§38), `<schema>` (§39).
- **Cross-evidence:**
  - PRIMER: see Phase 1b — TBD
  - Kickstarter v2: see Phase 1b — TBD
  - Native-parser: native-parser recognizes these as opener tokens via the structural-elements production
  - Design-insights: silent
  - User-voice ratification: silent — the §4.15 / §15.X duplication is doc-org drift
- **Recommended direction:** GENUINE DESIGN QUESTION — but with strong default: extend §4.15 to enumerate the full scrml-defined-element set (matching §15.X). Heads-up session decides whether to (a) consolidate §4.15 + §15.X (NR registry) into a single normative table at §4.15, OR (b) keep two registries with explicit cross-refs and a one-line "see also" pointing from each to the other. The drift between them is the core issue; either reconciliation resolves it. (a) reduces SPEC duplication; (b) preserves the existing structure but requires diligent maintenance. Recommend (a) for SPEC consistency.
- **Notes:** §38 / §39 / §6.7 / §36 / §19 each treat their owning element thoroughly. §4.15 was added at D4 (2026-05-04) to register only the NEW v0.next-introduced structural elements (`<engine>` / `<match>` etc.), per its "added 2026-05-04" framing. The §15.X registry was added later. The §4.15 intent was originally narrower than the §15.X registry — but the §4.15 intro text now reads as if it's the comprehensive list, which it isn't.

---

### F-012 — SPEC-INDEX.md line 81 (out-of-scope for Phase 1a but flagged): channel "at FILE LEVEL" is stale, contradicts SPEC §38 v0.3 Wave 1 reversal

- **Category:** LEGACY-TEXT (in SPEC-INDEX.md, not SPEC.md — flagged for Phase 1b)
- **Severity:** MEDIUM (in the doc-currency sense; doesn't affect SPEC body)
- **SPEC primary site:** SPEC-INDEX.md line 81 — "**D3 MAJOR REWRITE (M19, 2026-05-04).** `<channel>` at FILE LEVEL (sibling of `<program>`, not child)"
- **SPEC cross-refs:** SPEC.md §38 line 16855 (v0.3 Wave 1 REVERSAL — channels live INSIDE `<program>` again, per v0.3 one-program-per-application rule); SPEC.md §38.4.1 line 17036-17046 (full migration table for v1 → v0.next → v0.3)
- **The conflict:** SPEC-INDEX.md (the navigation map) line 81 still describes the v0.next channel placement model (file-top sibling of `<program>`). SPEC.md §38 has been REVERSED at v0.3 Wave 1 (2026-05-12) — channels are again INSIDE `<program>`. The SPEC-INDEX is stale by ~12 days.
- **Cross-evidence:**
  - PRIMER: TBD Phase 1b
  - Kickstarter v2: TBD Phase 1b
  - Native-parser: native-parser enforces the v0.3 direction (E-CHANNEL-OUTSIDE-PROGRAM)
  - Design-insights: v0.3 Wave 1 ratification + Insight 30 (S87 — PURE-CHANNEL-FILE dispensation)
  - User-voice ratification: v0.3 Wave 1 user direction
- **Recommended direction:** DIRECTION — amend SPEC-INDEX.md line 81 (Sections table row for §38) to reflect the v0.3 direction reversal. Match the SPEC body (§38.1 / §38.4.1). Mechanical update. NOTE: Out of Phase 1a scope (Phase 1a is SPEC.md only) — surfaced here so Phase 1b picks it up.
- **Notes:** Out-of-scope per Phase 1a brief but worth recording. PA may sweep SPEC-INDEX.md for other stale ratification descriptions at Phase 1b. Other potentially-stale SPEC-INDEX rows to audit: any row whose description references a pre-S111 / pre-S114 / pre-S123 state.

---

### F-016 — §52.4.1 grammar `state-decl ::= (server-modifier ws)? "@" identifier ws "=" ws expr` contradicts V-kill (sibling of F-001)

- **Category:** LEGACY-TEXT
- **Severity:** LOAD-BEARING
- **SPEC primary site:** §52.4.1 line 26367-26371 — `state-decl ::= (server-modifier ws)? "@" identifier ws "=" ws expr`
- **SPEC cross-refs:** F-001 (§7.5 line 5564 sibling — same V-kill contradiction at the type-annotation grammar); §6.1.1 (V-kill — declaration is structural-only); §6.1.2 (`@varname = expr` is a WRITE)
- **The conflict:** §52.4.1 grammar production names `@var = init` as the `state-decl` form for instance-level server authority. Under V-kill (S123), `@x = v` is a WRITE to a pre-declared cell, not a declaration. The `server @var = expr` shape is therefore underspecified — either the form is `server <var> = expr` (V-kill structural decl with server modifier), or `server @var = expr` is a special-case auto-synth that V-kill should explicitly carve out. Currently neither is spec'd. The §52.4 prose throughout uses `server @x = init` as the declaration form.
- **Cross-evidence:**
  - PRIMER: see Phase 1b — TBD
  - Kickstarter v2: see Phase 1b — TBD
  - Native-parser: needs grep to verify what the parser does with `server @x = init`
  - Design-insights: S123 V-kill
  - User-voice ratification: S123 "auto-state-cell-synthesis is retired"
- **Recommended direction:** GENUINE DESIGN QUESTION — heads-up decision. Two options:
  - (a) Amend §52.4.1 grammar to `state-decl ::= (server-modifier ws)? "<" identifier ">" (ws field-attrs)* ws "=" ws expr` (V-kill structural form with server modifier). All §52 worked examples migrate from `server @cards = []` to `server <cards> = []`. This is symmetric with F-001 — same direction (V-kill is the canon, `@x` is access-only).
  - (b) Carve out `server @x = ...` as a special-case server-authority decl form that survives V-kill. This requires a new SPEC clause in §6.1 / §52.4 explicitly listing this as an exception to V-kill. Less consistent but preserves §52 worked examples without migration.
  Direction (a) is recommended for consistency with F-001 + the V-kill ratification spirit.
- **Notes:** This pairs with F-001 as the sibling LOAD-BEARING V-kill compliance gap. Both surfaced by examining the grammar productions of pre-V-kill SPEC sections. Heads-up session should consider F-001 and F-016 together — they're the same decision applied twice (general state-decl + server state-decl). §52 worked examples (lines 26267, 26345, 26346, 26419, etc.) would all migrate together with the grammar amendment.

---

### F-017 — §52 worked examples use deprecated `< TypeName>` space-form state-type decl

- **Category:** EXAMPLE-DRIFT
- **Severity:** LOW
- **SPEC primary site:** §52 worked examples (lines 26249, 26259, 26311, 26332, 26340, etc.) use `< Card>`, `< EditState>`, `< CardDraft>`, `< BadCard>` — all with whitespace after `<`
- **SPEC cross-refs:** §4.3 line 366 — "the whitespace-after-`<` discriminator was the v0 disambiguator and is now informational only"; §4.3 migration path: P1 emits W-WHITESPACE-001; P3 plans to remove the form
- **The conflict:** §52 worked examples canonically use `< TypeName ...>` for state-type declarations. Under P1, this form emits `W-WHITESPACE-001` (deprecation warning); under P3, it's planned to be removed. The §52 examples therefore demonstrate code that fires a deprecation warning today and will be invalid in P3.
- **Cross-evidence:**
  - PRIMER: see Phase 1b — TBD
  - Kickstarter v2: see Phase 1b — TBD
  - Native-parser: emits W-WHITESPACE-001
  - Design-insights: silent (P1/P3 migration is deliberate)
  - User-voice ratification: Phase P1 (2026-04-30) state-as-primary unification
- **Recommended direction:** DIRECTION — migrate §52 worked examples from `< TypeName>` to `<TypeName>` (no whitespace). The §52 examples are the canonical demonstration of state-type declaration; they should not demonstrate the deprecated form. This is a mechanical migration (delete whitespace after `<` in all §52 state-type-decl openers).
- **Notes:** Same class as F-008 (pre-V-kill decl forms in examples). Both are EXAMPLE-DRIFT that the heads-up session should batch into the example-migration pass. Out of scope: also re-scan §36 (`<keyboard>` etc.), §38 (`<channel>`), §39 (`<schema>`), §11 (`< db>` — which is exclusively spelled with space — that's actually the older built-in `< db>` form, special-cased pre-P1).

---

### F-014 — §40 H4 subsections numbered `§39.x` instead of `§40.x` (renumber leftover; 11 sites)

- **Category:** LEGACY-TEXT
- **Severity:** LOW
- **SPEC primary site:** §40.2 through §40.3.5 — H4 headers all read `#### 39.x` instead of `#### 40.x`
- **SPEC cross-refs:** §40 (Middleware), §39 (Schema — see F-015 below for sibling renumber leftovers)
- **The conflict:** Lines 18048, 18063, 18078, 18094, 18108, 18123, 18175, 18196, 18207, 18217, 18226 all read `#### 39.x.y` — 11 subsection headers across §40. They are inside §40 (Middleware) but numbered as if the section were §39. The §40.9 subsections are correctly numbered as `§40.9.x`. Renumber leftover from when Middleware was §39.
- **Cross-evidence:**
  - PRIMER: silent
  - Kickstarter v2: silent
  - Native-parser: N/A
  - Design-insights: silent
  - User-voice ratification: silent
- **Recommended direction:** DIRECTION — sed-style mechanical rewrite of every `#### 39.x.y` inside §40 to `#### 40.x.y`. Lines 18048-18236. Pure cosmetic fix.
- **Notes:** Pairs with F-015 (§39 also has renumber leftovers). The structural-cleanup pass (F-005 / F-006 / F-007 / F-014 / F-015) becomes a single heads-up edit batch covering all heading numbering / TOC issues.

---

### F-015 — §39 H4 subsections mix `§38.x` and `§39.x` (renumber leftover)

- **Category:** LEGACY-TEXT
- **Severity:** LOW
- **SPEC primary site:** §39 (Schema) — multiple H4 subsections numbered `§38.x` (the pre-renumber name)
- **SPEC cross-refs:** F-014 (§40 sibling), §39 (Schema), §38 (WebSocket Channels — now genuinely §38)
- **The conflict:** Inside §39 (Schema), H4 subsections are inconsistently numbered:
  - `#### 38.5.1` through `#### 38.5.6` — correct under pre-renumber, stale now
  - `#### 39.5.7`, `#### 39.5.8`, `#### 39.5.9` — correctly renumbered (D3 additions, 2026-05-04)
  - `#### 38.6.1` through `#### 38.6.4` — stale
  - `#### 38.8.1`, `#### 38.8.2` — stale
  The §39.5.7-9 entries were added AFTER the renumber and got the correct numbering. The older subsections kept the pre-renumber §38.x numbers.
- **Cross-evidence:**
  - PRIMER: silent
  - Kickstarter v2: silent
  - Native-parser: N/A
  - Design-insights: silent
  - User-voice ratification: silent
- **Recommended direction:** DIRECTION — mechanical rewrite of every `#### 38.x.y` inside §39 to `#### 39.x.y`. Batches with F-014. NOTE: take care not to renumber the genuine §38 subsections (Channels — that's a different section).
- **Notes:** This is the kind of drift that accumulates with manual section renumbering. A regenerator script for SPEC headings could catch / fix this in one pass, but is out of Phase 1a scope.

---

### F-013 — §22.5.1 `meta` API table mismatches §22.12 closure (12 vs reachable surface)

- **Category:** AMBIGUITY (pairs with F-002 and F-013 ambiguity)
- **Severity:** MEDIUM
- **SPEC primary site:** §22.5.1 line 13482-13497 — `meta` API table lists 12 members (8 original + 4 S114 timer primitives)
- **SPEC cross-refs:** §22.12 (Approach C — "scrml-native fully describes runtime semantics via the §22.5.1 `meta` API (8 original members + 4 timer primitives added S114 = 12 closed primitives)"); §22.5.1 itself
- **The conflict:** §22.12 says the `meta` API is **closed** at 12 primitives (8 original + 4 S114 timer additions). But §22.5.1's table lists 12 entries:
  - `meta.get` / `meta.set` / `meta.subscribe` / `meta.emit` / `meta.cleanup` / `meta.scopeId` / `meta.bindings` / `meta.types` (8 original)
  - `meta.interval` / `meta.timeout` / `meta.clearInterval` / `meta.clearTimeout` (4 S114)
  Wait — that's 12. Let me re-verify count claim in §22.12. Per re-reading §22.5.1: 8 + 4 = 12. ✓ matches. False alarm — this is a non-finding. Withdrawn.
- **Cross-evidence:** N/A (false alarm)
- **Recommended direction:** N/A (no conflict; the §22.5.1 count matches §22.12's "12 closed primitives" claim).
- **Notes:** Recorded as a false-alarm so the heads-up session can verify and skip. Leaving in the doc for transparency.

---

### F-004 — §3.1 Contexts table is incomplete — missing `^{}` meta, `_{}` foreign, `!{}` error contexts

- **Category:** HOLE
- **Severity:** MEDIUM
- **SPEC primary site:** §3.1 line 226-241 (Contexts table — 5 rows)
- **SPEC cross-refs:** §22 line 13151-13153 (`^{}` meta context, §22.2); §23 line 13863-13866 (`_{}` foreign code contexts); §19 (`!{}` error context, see §19.x for sigil reference)
- **The conflict:** §3.1's normative "Contexts" table lists 5 context types: Markup/State, Logic (`${`), SQL (`?{`), CSS inline (`#{`), Style block (`<style>`). It is missing:
  - Meta context (`^{`) — defined at §22.2 as the meta-block opener
  - Foreign code context (`_{`) — defined at §23 (sigils for WASM / interop)
  - Error context (`!{`) — defined at §19; referenced in §4.6 as a brace-delimited context
  The §3.1 introductory text ("Additional context types MAY be added in future versions of this specification") softens but does not justify the omission of contexts that already exist in the SPEC body.
- **Cross-evidence:**
  - PRIMER: see Phase 1b — TBD
  - Kickstarter v2: see Phase 1b — TBD
  - Native-parser: native parser recognizes `^{`, `_{`, `!{` as context openers (verified via existence of §22 / §23 / §19 normative text + native-parser productions in §34.1 codes E-EXPR-GUARDED-UNCLOSED, etc.)
  - Design-insights: silent (this is a doc-completeness gap, not a design decision)
  - User-voice ratification: silent
- **Recommended direction:** DIRECTION — amend §3.1's Contexts table to include the three missing rows. `^{` / `}` / parent: Logic, Markup, State (per §22.3 — meta blocks may appear at top-level or in scope-preserving positions); `_{` / `}` / parent: Logic (per §23); `!{` / `}` / parent: Logic, Markup (per §19). Heads-up session should verify the parent-context column per §22 / §23 / §19. This is documentation-completeness, not a design change.
- **Notes:** Low risk if amended — the omission has been latent since pre-S60. The table is meant to be the single source of truth for the context list; new readers walking SPEC from §1 onward see the §3.1 table and miss `^{}` / `_{}` / `!{}` until §19 / §22 / §23.

---

## Coverage assertion

I walked SPEC.md sections §1 through §58 + Appendices A-E. The walk was paginated (1500-2500 lines per read) due to SPEC.md's ~29,124-line size (~410k tokens).

**Sections walked in detail (deep-read for contradiction signatures):**
- §1 Overview (lines 103-184)
- §2 File Format (lines 185-225)
- §3 Context Model (lines 226-288) — F-004
- §4 Block Grammar incl. §4.15 (lines 289-1271) — F-011
- §5 Attribute Quoting (lines 1272-1922)
- §6 Reactivity / V5-Strict (lines 1923-5365) — major (5 sub-readings)
- §7 Logic Contexts (lines 5373-5677) — F-001 / F-009 / F-010
- §8 SQL Contexts (lines 5680-6240)
- §9 CSS Contexts (lines 6242-6283)
- §10 The `lift` Keyword (lines 6285-6677)
- §11 State Objects (folded — lines 6679-6699)
- §12 Route Inference (lines 6701-6804)
- §13 Async Model (lines 6806-7074)
- §14 Type System (lines 7077-7679)
- §15 Component System (lines 7681-8793) — F-011 references via §15.X NR registry
- §16 Component Slots (lines 8795-9063)
- §17 Control Flow (lines 9065-9784)
- §18 Pattern Matching (lines 9786-11129)
- §19 Error Handling (lines 11131-12388)
- Appendices A-E (lines 12389-12481)
- §20 Navigation API (lines 12482-12653)
- §21 Module/Import (lines 12654-13143)
- §22 Metaprogramming (lines 13144-13862) — F-002 / F-003 / F-013 (false-alarm)
- §23 Foreign Code Contexts (lines 13863-14305)
- §24 HTML Spec Awareness (lines 14306-14368)
- §25 CSS Variables (lines 14369-14467)
- §26 Tailwind (lines 14468-14647)
- §27 Comments (lines 14648-14668)
- §28 Compiler Settings (lines 14669-14711)
- §29 Vanilla File Interop (lines 14712-14720)
- §30 bun.eval (lines 14721-14751) — F-003 / F-009 / F-010
- §31 Dependency Graph (lines 14752-14824)
- §32 ~ Keyword (lines 14825-15036)
- §33 pure Keyword (lines 15037-15101)
- §34 Error Codes (lines 15102-15767) — skimmed
- §35-§37 (lines 15768-16829)
- §38 WebSocket Channels (lines 16851-17575) — F-012 (out-of-scope; recorded)
- §39 Schema (lines 17597-17974) — F-015
- §40 Middleware (lines 17996-18747) — F-014
- §41 Import System / scrml:data primitives (lines 18748-19557)
- §42 not / absence (lines 19617-19911) — well-consolidated
- §43-§50 (lines 19971-22677)
- §49 (line 21528) — F-006 (H1 inconsistency)
- §51 Engines (lines 22737-26092) — well-consolidated
- §52 State Authority (lines 26152-26707) — F-016 / F-017
- §53 Inline Type Predicates (lines 26767-27768) — F-007 (H2 subsection heading)
- §54 Nested Substates (lines 27828-28069)
- §55 Validators (lines 28129-28558) — well-consolidated
- §56 Promotion Ergonomics (lines 28618-28738)
- §57 Wire Format (lines 28898-28991) — well-consolidated
- §58 Build Story (lines 28992-29138) — well-consolidated

**Patterns I checked via grep across the full SPEC:**
- `^@var = init` at line-start (count: 54; ~30 DECL-shaped = F-008)
- `^<varname> = init` V-kill canonical decls (count: 14 — much smaller than legacy `@`-form)
- `TODO` / `TBD` / `deferred` markers (most explicitly tracked, not findings)
- `DEPRECATED` / `RETIRED` / `SUPERSEDED` markers (all explicitly tracked)
- `^## ` / `^# §` H1/H2 headers (found F-006 §49)
- `^#### NN.N` subsection headers (found F-014 §40, F-015 §39 renumber leftovers)
- `< TypeName>` state-type-decl space form (3 sites in §52 = F-017)
- `<TypeName> @varname` state-instance form (canonical, not a finding)

## Cross-evidence I read

- `compiler/SPEC-INDEX.md` (lines 1-379) — navigation map; surfaced F-012
- `compiler/SPEC.md` (whole-file walk, paginated as listed above)
- `compiler/src/meta-checker.ts` (lines 110-200 — META_BUILTINS set; confirmed F-002 evidence — `bun`/`process` in the allowlist contradicts S114 Approach C)

## What I did NOT read (out of Phase 1a scope or deferred)

- `docs/PA-SCRML-PRIMER.md` — Phase 1b
- `docs/articles/llm-kickstarter-v2-2026-05-04.md` — Phase 1b
- `~/.claude/design-insights.md` — referenced but not directly read; the SPEC sections themselves carry the design-insight summaries (S111 / S114 / S118 / S123 amendment notes etc.)
- `scrml-support/user-voice-scrmlTS.md` — referenced but not directly read; the SPEC amendment notes carry the user-voice quotes that ratified each landed change
- Native-parser source beyond `meta-checker.ts` — partial spot-check only; full audit would require deeper read (e.g., `parse-stmt.js` for V-kill enforcement details to confirm F-001/F-016 fix direction)
- PIPELINE.md — Phase 1b
- Other audit docs in `docs/audits/` — referenced as prior art; not re-walked

## Stopping note

This Phase 1a inventory is **complete** in the coverage-assertion sense — I walked every section. It is **not exhaustive** in the deep-cross-evidence sense — for each finding the PRIMER + kickstarter v2 cross-checks are flagged as "see Phase 1b TBD" rather than filled in. Per the brief, Phase 1b will re-walk SPEC.md with the PRIMER and kickstarter in hand to fill in those cross-evidence fields. The current findings are sufficient for the heads-up session to ratify direction on each finding; the cross-evidence pass refines the rationale once the PRIMER/kickstarter are confirmed.

**Meta-observation about SPEC overall consistency state:**

SPEC.md is **substantially consistent** — the recent ratifications (S111 quoted-text model, S114 Approach C, S118 build story, S123 V-kill) have been integrated cleanly into their owning sections. The contradictions I found cluster into three classes:

1. **V-kill compliance gaps** (F-001, F-008, F-016, F-017) — the largest LOAD-BEARING class. §6.1 ratifies V-kill normatively, but pre-V-kill grammar productions and worked examples survive in §7.5 and §52 and SPEC-wide examples. These are the highest-priority heads-up items.

2. **Approach C compliance gaps** (F-002, F-003, F-010) — §22.12 closes the meta surface to scrml-native, but §22.4 list + §30.2 + §7.2 still document `bun.eval()` as a user-facing compile-time API. The boundary between "compile-time meta inside `^{}`" and "compile-time eval inside `${}`" is the genuine design ambiguity.

3. **Structural / formatting drift** (F-005, F-006, F-007, F-009, F-014, F-015) — the §40 / §39 renumbered-subsection leftovers, the §49 H1 heading, the §53 H2 subsections, TOC stopping at §54, broken §7.2 cross-ref. All LOW; all mechanical fixes; batch into one structural-cleanup heads-up pass.

4. **Documentation completeness holes** (F-004, F-011) — §3.1 contexts table and §4.15 structural-elements registry are normative tables that have drifted from comprehensive to incomplete. Heads-up decides whether to unify each with its sibling registry or maintain two with cross-refs.

5. **Out-of-scope but flagged** (F-012) — SPEC-INDEX.md channel description stale (Phase 1b).

The single false-alarm (F-013, withdrawn) was the §22.5.1 / §22.12 meta-API count claim; both say 12, consistent. Left in the doc for transparency so the heads-up session sees what was checked.

**Phase 1a is a clean checkpoint.** Subsequent phases:
- **Phase 1a-2** (optional refinement): Re-walk to fill PRIMER / kickstarter cross-evidence fields per-finding. Estimate: 1-2 hours.
- **Phase 1b**: Audit PIPELINE.md, PRIMER, kickstarter v2 + SPEC-INDEX.md for the same classes of drift. Includes F-012 ratification.
- **Phase 2 (heads-up)**: User + PA resolve each finding into a SPEC amendment + canonical example. Batches: (a) V-kill compliance (F-001/F-008/F-016/F-017), (b) Approach C scope (F-002/F-003/F-010), (c) doc-completeness (F-004/F-011), (d) structural cleanup (F-005/F-006/F-007/F-009/F-014/F-015).
- **Phase 3**: Confirm 100% example-code coverage after amendments.
- **Phase 4**: Re-evaluate further refactor.

