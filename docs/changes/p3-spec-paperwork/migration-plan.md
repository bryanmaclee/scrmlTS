# Migration Plan: SPEC.md `<machine>` → `<engine>` worked-example sweep

**Change-id:** p3-spec-paperwork
**Tier:** T1-small
**Scope:** SPEC.md worked examples only (no compiler/src/*, no examples/*, no tests/*)
**Phase:** P3 (state-as-primary unification)

## Inventory

86 occurrences total. Each occurrence is classified as **REPLACE** (clean engine usage in worked
example, swap to `<engine>`) or **KEEP** (deprecation reference, normative concept text discussing
the deprecated keyword, or W-DEPRECATED demo).

## Classification Rule

Per dispatch contract:
- **REPLACE** worked-example occurrences showing clean engine usage (§51.3+ examples).
- **KEEP** these:
  - Normative text discussing `< machine>` keyword as a concept ("The `< machine>` declaration provides…", "machines are bound to…")
  - Deprecation references (W-DEPRECATED-001 documentation, §51.16.4)
  - Backwards-compat notes ("legacy `<machine for=ImportedType>` continues to compile")
  - The worked example in §51.3.2 demonstrating the syntax-form change (lines 18465 — `MarioMachine` example illustrating the keyword change context). This is contextually about the `<machine>` form being permissible. **DECISION:** since this section's body is normatively documenting the syntax for the deprecated keyword, REPLACE the example openers (these are clean state-machine examples) — but NOTE: line 18465 is in the alternation amendment example where `< machine` is actually the example syntax the prose is teaching. Need careful read.

## Per-occurrence migration table

| Line | Snippet | Action | Rationale |
|---|---|---|---|
| 11 | "§51 added: State Transition Rules and `< machine>` State Type" | KEEP | Amendment log entry — historical record of when §51 was added under that name. Don't rewrite history. |
| 99 | "[State Transition Rules and `< machine>` State Type](#…)" | KEEP | TOC entry mirrors the section heading at line 18191. Section heading also kept (see 18191). |
| 544 | "`given` is the guard keyword used inside `< machine>` rule bodies (§51.3.2)" | KEEP | Normative text describing the `< machine>` concept. P3 keeps deprecation prose intact. |
| 1396 | "A reactive variable may be bound to a `< machine>` state type at declaration time" | KEEP | Normative concept text. The keyword IS the deprecated form here. |
| 1410 | "if the name resolves to a `< machine>` declaration" | KEEP | Normative concept text. |
| 1417 | "`< machine>` declaration in scope" | KEEP | Normative concept text. |
| 1423 | "name resolves to a `< machine>` declaration" | KEEP | Normative concept text. |
| 4876 | "Write batching collides with `<machine>` transition enforcement" | KEEP | Cross-reference to feature, not worked example. |
| 5978 | "Guards require a `< machine>` declaration (§51.3, E-MACHINE-010)" | KEEP | Normative concept text in error description. |
| 12725 | "the unified purity contract preserves the `< machine>` subsystem's replay" | KEEP | Normative concept text. |
| 12773 | "The `<machine>` keyword is deprecated; use the canonical `<engine>` keyword" | KEEP | This is the W-DEPRECATED-001 documentation itself. |
| 12910 | "Predicate references external state — use `< machine>` instead" | KEEP | E-CONTRACT-003 message-text — references the conceptual feature. |
| 16376 | "rules live on `< StateName>` blocks (§54) and `< machine>` declarations (§51)" | KEEP | Normative concept text. |
| 18191 | Section heading "## 51. State Transition Rules and `< machine>` State Type" | KEEP | Section title is amended-2026-04-08 historical name; spec amendment 2026-04-30 layered the rename in §51.3.2 prose. Heading itself is part of historical structure. |
| 18206 | "Machine-level transitions (`< machine name=Name for=EnumType>`) define a named override" | KEEP | Normative concept text — §51.1 overview discussing the feature. |
| 18226 | "**Machine-level transitions** (`< machine name=Name for=EnumType>`, §51.3)" | KEEP | Normative concept text. |
| 18270 | "use `< machine>` for contextual transitions" | KEEP | Normative error-rationale text. |
| 18364 | "or bind @status to a < machine> that permits this move" | REPLACE | Hint text inside an E-MACHINE-001 worked-example error message. The hint is teaching new users to ADD an engine, so should reference `<engine>`. |
| 18369 | Section heading "### 51.3 Machine-Level Transitions — `< machine>`" | KEEP | Sub-heading naming the feature; mirrors 18191. |
| 18377 | "The `< machine>` declaration provides this. A machine is a **named override graph**" | KEEP | Normative concept text introducing the §51.3 feature. |
| 18387 | EBNF grammar: `machine-decl ::= '< machine' MachineName 'for' TypeName '>'` | KEEP | Grammar rule for the deprecated keyword's parsing. The grammar must specify both `< machine` and `< engine` openers. **This is the grammar OF the deprecated keyword; the spec section explicitly says both forms compile (line 18421).** |
| 18421 | "Both `< engine name=N for=T>` and `< machine name=N for=T>` produce identical AST" | KEEP | Deprecation policy text — references the deprecated form by name. |
| 18427 | "W-DEPRECATED-001: `<machine>` keyword is deprecated; use `<engine>` instead" | KEEP | This IS the W-DEPRECATED-001 message text. |
| 18428 | "Both forms compile in P1; `<machine>` becomes E-DEPRECATED-001 in P3" | KEEP | W-DEPRECATED-001 message text. |
| 18433 | "only the `< machine` / `< engine` opener token is renamed" | KEEP | Deprecation/rename rationale text. |
| 18438 | "or the deprecated `< machine` opener" | KEEP | Deprecation prose. |
| 18456 | "`< machine name=Name for=Type>`, matching §5.1 attribute grammar" | KEEP | S25 amendment text describing the shared attribute grammar; deprecation alias must continue to share grammar. |
| 18461 | "pre-S25 sentence form `< machine Name for Type>` is rejected" | KEEP | Deprecation/migration error rationale. |
| 18465 | Worked example `< machine name=MarioMachine for=MarioState>` | REPLACE | Worked example of clean usage. The context (alternation amendment) is about `\|` alternation, NOT about the keyword. Since the spec encourages `<engine>` as canonical, the example should use the canonical form. |
| 18492 | Worked example `< machine name=CannonMachine for=CannonState>` | REPLACE | Worked example of payload binding (S22 amendment). Demonstrates a feature, not the keyword. Use canonical. |
| 18541 | Worked example `< machine name=DateRange for=Booking>` | REPLACE | Worked example of struct-governing machine + `* => *` wildcards. Use canonical. |
| 18558 | "`< machine name=Name for=TypeName>` SHALL declare a named machine" | KEEP | Normative statement formally specifying both keywords' behavior — the deprecated form must continue to "SHALL declare" the same thing. The grammar rule covers both forms. |
| 18656 | Worked example `< machine name=UserFlow for=Column>` | REPLACE | §51.3.5 Example 1 worked example. Clean usage. |
| 18663 | Worked example `< machine name=AdminFlow for=Column>` | REPLACE | Companion example. |
| 18770 | "or create a < machine name=AdminUnlock for=AuthState> with this rule" | REPLACE | Hint text in §51.3.5 Example 3 E-MACHINE-001 expected output. Hint teaches user to ADD a NEW engine — canonical form. |
| 18789 | Worked example `< machine name=DeveloperFlow for=TaskStatus>` | REPLACE | §51.4 worked example. Clean usage. |
| 18798 | Worked example `< machine name=QAFlow for=TaskStatus>` | REPLACE | Companion example. |
| 18805 | Worked example `< machine name=PMFlow for=TaskStatus>` | REPLACE | Companion example. |
| 18820 | "Multiple `< machine>` declarations for the same `EnumType` SHALL be permitted" | KEEP | Normative statement using the keyword as feature reference. |
| 18866 | "for every `< machine>` declaration" | KEEP | Normative statement using keyword as feature reference. |
| 18891 | "Effect blocks in both `transitions {}` (type-level) and `< machine>` rules" | KEEP | Normative concept text in §51.6. |
| 18995 | E-MACHINE-010 description: "guards require `< machine>`" | KEEP | Error code description text. |
| 19073 | EBNF: `derived-machine-decl ::= '< machine' MachineName ...` | KEEP | Grammar rule (analogous to 18387). |
| 19085 | Worked example `< machine name=UI for=UIMode derived=@order>` | REPLACE | §51.9.2 worked example. Clean usage. |
| 19109 | "Assign to '@{name}' — it is a derived projection of '@{source}' (see < machine {MachineName}>)" | KEEP | E-MACHINE-017 error message format text — implementation must produce this message text using whichever keyword the user chose; spec text leaves `< machine` as the conceptual hint. **Reverted from earlier consideration to REPLACE — this is literal compiler-output template text and the implementation may emit either form depending on user keyword.** |
| 19129 | Comparison table column header `< machine derived>` | KEEP | Refers to the syntactic feature; both forms work. Header references the feature concept. |
| 19172 | Worked example `< machine name=FetchMachine for=FetchState>` | REPLACE | §51.9.5 worked example. Clean usage. |
| 19180 | Worked example `< machine name=UI for=UIFlag derived=@state>` | REPLACE | §51.9.5 worked example. Clean usage. |
| 19192 | "A derived-machine declaration SHALL use the form `< machine name=Name for=TypeName derived=@SourceVar>`" | KEEP | Normative statement specifying the grammar form. Grammar applies to both keywords. |
| 19226 | "machine-cluster-expressiveness deep-dive). Opt-in audit/replay/time-travel support for `< machine>`-governed reactive variables" | KEEP | Normative concept text in §51.11.1 motivation. |
| 19264 | Worked example `< machine name=OrderFlow for=OrderStatus>` | REPLACE | §51.11.2 audit clause worked example. Clean usage. |
| 19363 | "`< machine>` bodies MAY contain an `audit @varName` clause" | KEEP | Normative statement using keyword as feature reference. |
| 19456 | Worked example `< machine name=FetchMachine for=Fetch>` | REPLACE | §51.12.2 temporal transitions worked example. Clean usage. |
| 19548 | "exercises each `< machine>` declaration against a small set of invariants" | KEEP | Normative concept text in §51.13. |
| 19560 | "For each non-derived `< machine>` declaration with a non-empty transition" | KEEP | Normative statement in §51.13.1. |
| 19734 | Worked example `< machine name=OrderFlow for=S>` | REPLACE | §51.14.2 replay primitive worked example. Clean usage. |
| 19792 | "is a declared reactive that lacks a `< machine>` binding" | KEEP | E-REPLAY-001 error description. Concept reference. |
| 19862 | "When a `< machine name=Name for=StateType>` declaration targets a state type that has state-local transitions" | KEEP | Normative concept text in §51.15.1. |
| 19891 | Worked example `bind @sub -> < machine SubmissionFlow>` | REPLACE | §51.15.3 Case 1 worked example. Clean usage. |
| 19912 | Worked example `bind @sub -> < machine SubmissionFlow>` | REPLACE | §51.15.3 Case 3 worked example. Clean usage. |
| 20013 | Section heading: "#### 51.16.4 Interaction with the Deprecated `<machine>` Keyword" | KEEP | This sub-section is specifically about the deprecated keyword. |
| 20015 | "The legacy `<machine for=ImportedType>` form continues to compile" | KEEP | Backwards-compat note explicitly about the deprecated form. |
| 20017 | "P1 introduced W-DEPRECATED-001 to warn that `<machine>` is the deprecated alias" | KEEP | Deprecation policy text. |
| 20033 | "An `<engine for=Type>` (or legacy `<machine for=Type>`) clause SHALL" | KEEP | Normative statement covering both forms with deprecation pointer. |
| 20043 | "legacy `<machine>` openers regardless of whether the governed `Type` is" | KEEP | Deprecation policy text. |
| 20623 | "`<page>`, `<channel>`, `<program>`, `<machine>`, `<errorBoundary>` have closed attribute sets" | **KEEP (revised)** | Originally planned REPLACE. **Reversed during execution:** this list explicitly cross-references `compiler/src/attribute-registry.js`. The attribute registry uses `"machine"` as the internal key (per P1's bounded-blast-radius "kind: machine-decl" preservation, line 18422). The implementation key remains `"machine"` until P3 internal-rename. Keeping the spec list as `<machine>` keeps documentation consistent with the live registry. Re-classified as backwards-compat note. |
| 20647 | "These are governed by `< machine>` (§51)" | KEEP | Normative cross-reference text. |
| 20768 | "decision rule for when to use an inline predicate vs a `< machine>`" | KEEP | Normative concept text in §53.3.2. |
| 20778 | Table cell: "`< machine for Struct>`" | KEEP | Decision table column referencing feature concept. |
| 20779 | Table cell: "`< machine>`" | KEEP | Decision table column. |
| 20780 | Table cell: "`< machine>`" | KEEP | Decision table column. |
| 20784 | "developer SHALL express this constraint as a `< machine>` guard instead" | KEEP | Normative concept text. |
| 21062 | Section heading: "## §53.8 Interaction with `< machine>`" | KEEP | Section heading naming the feature. |
| 21066 | "Inline predicates and `< machine>` are orthogonal enforcement mechanisms" | KEEP | Normative concept text. |
| 21082 | Worked example `< machine name=ValidBooking for=Booking>` | REPLACE | §53.8.1 worked example. Clean usage. |
| 21108 | "use `< machine>` instead" | KEEP | E-CONTRACT-003 error rationale text. |
| 21115 | "// For constraints that reference reactive state, use < machine>" | KEEP | E-CONTRACT-003 message-template content showing `< machine` example. |
| 21117 | "//   < machine name=HpRange for=number>" | KEEP | Same rationale. |
| 21295 | "For constraints that depend on external state, use < machine>" | KEEP | Same E-CONTRACT-003 message-template body. |
| 21297 | "    < machine name=HpRange for=number>" | KEEP | Same rationale. |
| 21307 | "include an example of the equivalent `< machine>` construct in the" | KEEP | Normative statement. |
| 21455 | "For constraints that depend on external state, use < machine>" | KEEP | Same E-CONTRACT-003 message rationale. |
| 21457 | "    < machine name=ScoreRange for=number>" | KEEP | Same rationale. |
| 21555 | "This is different from a `< machine>` named binding because the alias is stateless" | KEEP | Normative concept text in §53.13.3. |
| 21590 | "Interaction with `< machine>` declarations (cross-reference to §51.15)" | KEEP | Normative concept text in §54.1. |
| 21819 | Sub-heading: "#### 54.7.1 State-local transitions × `< machine derived=@source>` (§51.9 projection)" | KEEP | Sub-heading referencing the feature concept. |

## Summary (final, after execution)

- **REPLACE** count: **19** occurrences (worked examples and instructive hint text)
- **KEEP** count: **67** occurrences (deprecation refs, normative concept text, error-message templates, backwards-compat notes, grammar rules, section headings, attribute-registry cross-reference list)

## Replacement targets (REPLACE list — final, executed)

1. Line 18364 — hint text inside E-MACHINE-001 expected output
2. Line 18465 — `MarioMachine` worked example
3. Line 18492 — `CannonMachine` worked example
4. Line 18541 — `DateRange` worked example
5. Line 18656 — `UserFlow` worked example
6. Line 18663 — `AdminFlow` worked example
7. Line 18770 — hint text inside E-MACHINE-001 expected output
8. Line 18789 — `DeveloperFlow` worked example
9. Line 18798 — `QAFlow` worked example
10. Line 18805 — `PMFlow` worked example
11. Line 19085 — `UI for=UIMode derived=@order` worked example
12. Line 19172 — `FetchMachine` derived-machine worked example
13. Line 19180 — `UI for=UIFlag derived=@state` worked example
14. Line 19264 — `OrderFlow` audit-clause worked example
15. Line 19456 — `FetchMachine` temporal-transitions worked example
16. Line 19734 — `OrderFlow for=S` replay worked example
17. Line 19891 — `bind @sub -> < engine SubmissionFlow>` Case 1 binding example
18. Line 19912 — `bind @sub -> < engine SubmissionFlow>` Case 3 binding example
19. Line 21082 — `ValidBooking` struct-engine worked example

(Note: line numbers reference pre-edit positions. Post-edit line numbers may shift slightly; the
text replacements are unambiguous because each target string was unique in the file.)

## Closer-form audit

For each REPLACE worked-example, the corresponding `</>` closer form is **identical** for both
keywords — `</>` is generic-close. No `</machine>` explicit closers exist in the inventoried
worked examples (verified: the spec uses `</>` everywhere for engine declarations).

## Migration batches (executed)

1. **§51.3.x worked examples** (lines 18364, 18465, 18492, 18541, 18656, 18663, 18770, 18789, 18798, 18805) — 10 changes, commit 802fed8
2. **§51.9 derived/projection examples** (19085, 19172, 19180) — 3 changes, commit f4b5fad
3. **§51.11/§51.12/§51.14 (audit, temporal, replay)** (19264, 19456, 19734) — 3 changes, commit f6885a3
4. **§51.15 state-local case examples** (19891, 19912) — 2 changes, commit 51fb9e2
5. **§53.8 worked example** (21082) — 1 change, commit (in flight). Line 20623 reclassified to KEEP.

Total replacements: **19**. Pre-pipeline plan was 20; line 20623 reversed during execution per
attribute-registry.js cross-reference (see migration table for full rationale).

## Tests

`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance` (pre-commit
hook scope). Baseline: 7826 pass / 30 skip / 0 fail / 7856 tests / 397 files. Zero regressions
across all 5 batches.

## Tags

#p3 #spec #engine-keyword #worked-examples #paperwork #t1-small

## Links

- /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aaf530b1363a61104/compiler/SPEC.md
- /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aaf530b1363a61104/docs/changes/p3-spec-paperwork/progress.md
- /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aaf530b1363a61104/compiler/src/attribute-registry.js (cross-referenced for line 20623 reversal)
