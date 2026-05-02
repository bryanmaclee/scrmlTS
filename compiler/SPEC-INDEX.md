# SPEC.md Section Index

> Auto-generated line numbers. Regenerate: `bash scripts/update-spec-index.sh`
> Last updated: 2026-04-29 (S49 — Tailwind 3 (§26 substantially extended: §26.3 retitled, new §26.4 arbitrary values, new §26.5 open items); W-TAILWIND-001 + E-TAILWIND-001 added to §34. Sections from §22 onward have minor accumulated drift; comprehensive realign deferred to next session-wrap.)

Total lines: 20,521 | Total sections: 54 + appendices

> **Note on §49 heading format:** SPEC.md §49 uses a single `#` (H1) at line 15800 instead of the `## N.` pattern every other section uses. The regenerator script will not pick it up automatically — keep this in mind when running the script.

## Sections

| § | Section | Lines | Size | Summary |
|---|---------|-------|------|---------|
| — | Table of Contents | 23-105 | 83 | Section listing |
| 1 | Overview | 106-125 | 20 | Design principles, Bun runtime |
| 2 | File Format and Compilation Model | 126-166 | 41 | Source files, output, entry point, perf target |
| 3 | Context Model | 167-206 | 40 | Contexts, stack rules, coercion |
| 4 | Block Grammar | 207-856 | 650 | Tags, states, closer forms, PA rules, keywords, angleDepth (PA-005) |
| 5 | Attribute Quoting Semantics | 857-1374 | 518 | Three forms, bind:, dynamic class, event handler binding (§5.2.2) |
| 6 | Reactivity — The `@` Sigil | 1375-4186 | 2812 | Declaration, placement, arrays (§6.5 mutation), derived, lifecycle, `<timeout>` (§6.7.8) |
| 7 | Logic Contexts | 4187-4360 | 174 | `{}` syntax, function forms, markup-as-expr, type annotations, file-level scope (§7.6) |
| 8 | SQL Contexts | 4361-4907 | 547 | `?{}` syntax, bound params, chaining, WHERE, INSERT/UPDATE/DELETE, **§8.9 per-handler coalescing, §8.10 N+1 loop hoist, §8.11 mount hydration** |
| 9 | CSS Contexts | 4908-4950 | 43 | Inline CSS (§9.1), style block, CSS files |
| 10 | The `lift` Keyword | 4951-5329 | 379 | Semantics, coercion, syntax forms, ordering, value-lift, accumulation (§10.8) |
| 11 | State Objects and `protect=` | 5330-5473 | 144 | State declaration, schema reading, protect types, authority relationship |
| 12 | Route Inference | 5474-5560 | 87 | Default placement, escalation triggers, generated infra, server return (§12.5) |
| 13 | Async Model | 5561-5829 | 269 | Developer-visible syntax, compiler-managed async, RemoteData enum (§13.5) |
| 14 | Type System | 5830-6352 | 523 | Structs (§14.3.2 enum fields), enums, pattern matching, asIs, schema types, snippet type |
| 15 | Component System | 6353-7083 | 731 | Definition, props, shapes, slots, callbacks, rendering syntax, reactive scope (§15.13) |
| 16 | Component Slots | 7084-7351 | 268 | Named slots, unnamed children, fill syntax, render validation |
| 17 | Control Flow | 7352-8026 | 675 | if=, show=, lifecycle, iteration, overloading, if-as-expression (§17.6) |
| 18 | Pattern Matching and Enums | 8027-9159 | 1133 | match syntax, exhaustiveness, guards, literals, `is` operator, `partial match` (§18.18) |
| 19 | Error Handling (Revised) | 9160-10031 | 872 | Renderable enum variants, fail, ?, !, errorBoundary, renders clause, **§19.10.5 implicit per-handler tx** |
| A | Appendix A: Interaction Matrix | 10032-10050 | 19 | Error system feature interactions |
| B | Appendix B: Superseded Spec Text | 10051-10059 | 9 | What §19 replaced |
| C | Appendix C: Future Considerations | 10060-10068 | 9 | Error composition, retry, telemetry, async errors |
| D | Appendix D: JS Standard Library | 10069-10089 | 21 | JS stdlib access in logic contexts |
| E | Appendix E: `</>` Closer Migration | 10090-10124 | 35 | Migration guide for `/` → `</>` |
| 20 | Navigation API | 10125-10296 | 172 | navigate(), route params, session context |
| 21 | Module and Import System | 10505-10770 | 266 | Export/import syntax (incl. §21.2 Form 1 / Form 2 — P2 2026-04-30), re-export, pure-type files |
| 22 | Metaprogramming | 10408-11061 | 654 | `^{}` meta context, compile-time/runtime meta, Option D scope model |
| 23 | Foreign Code Contexts (`_{}`) | 11062-11504 | 443 | Level-marked braces, opaque passthrough, WASM sigils, sidecars |
| 24 | HTML Spec Awareness | 11505-11530 | 26 | Element registry, shape constraints |
| 25 | CSS Variable Syntax | 11531-11629 | 99 | Defining/using vars, hyphenated names, scoping |
| 26 | Tailwind Utility Classes | 11630-11721 | 92 | Integration model; **§26.3 Variant Prefixes (S49)** with W-TAILWIND-001 emission rule; **§26.4 Arbitrary Values (S49 NEW)** with §26.4.1 validation + §26.4.2 cross-feature; **§26.5 Open Items (S49)** group-*/peer-*/custom-theme deferred |
| 27 | Comment Syntax | 11722-11742 | 21 | Universal `//`, per-context native comments |
| 28 | Compiler Settings | 11672-11707 | 36 | html-content-model setting |
| 29 | Vanilla File Interop | 11708-11716 | 9 | Plain JS/CSS/HTML interop |
| 30 | Compile-Time Eval — `bun.eval()` | 11717-11747 | 31 | Scope, markup interpolation, security |
| 31 | Dependency Graph | 11748-11771 | 24 | Purpose, construction, route analysis |
| 32 | The `~` Keyword | 11772-11983 | 212 | Pipeline accumulator, lin variable, context boundary |
| 33 | The `pure` Keyword | 11984-12048 | 65 | Purity constraints, **§33.6 fn ≡ pure function (S32)**, W-PURE-REDUNDANT |
| 34 | Error Codes | 12120-12324 | 205 | All error code definitions (+6/-1 S32: E-STATE-COMPLETE, E-MACHINE-DIVERGENCE, E-STATE-SUBSTATE-*, E-STATE-TERMINAL-*; +2 S48: E-META-009, E-META-010; +2 S49: W-TAILWIND-001, E-TAILWIND-001) |
| 35 | Linear Types — `lin` | 12252-12713 | 462 | Declaration (exactly-once + restricted intermediate visibility), consumption, control flow, closures, lin function params (§35.2.1), cross-`${}` block lin (§35.2.2), E-LIN-005 shadowing + E-LIN-006 deferred-ctx (§35.5) |
| 36 | Input State Types | 12714-13071 | 358 | `<keyboard>`, `<mouse>`, `<gamepad>` |
| 37 | Server-Sent Events | 13072-13313 | 242 | `server function*` SSE generators |
| 38 | WebSocket Channels | 13314-13619 | 306 | `<channel>`, @shared, broadcast/disconnect |
| 39 | Schema and Migrations | 13620-13895 | 276 | `< schema>`, column types, migration diff |
| 40 | Middleware and Request Pipeline | 13896-14119 | 224 | Auto middleware, handle() escape hatch |
| 41 | Import System — `use`/`import` | 14120-14326 | 207 | Capability imports, value imports, vendoring |
| 42 | `not` — Unified Absence Value | 14327-14558 | 232 | `not` keyword, `is not`, `is some`, `(x) =>`, `T | not`, compound exprs (§42.2.4) |
| 43 | Nested `<program>` | 14559-14641 | 83 | Execution contexts, shared-nothing, lifecycle, RPC |
| 44 | `?{}` Multi-Database Adaptation | 14969-15055 | 87 | Bun.SQL target, driver resolution, `.get()` → `T | not`; **§44.8 bracket-matched `?{` scanner (F-SQL-001)** + E-SQL-008 hard-error |
| 45 | Equality Semantics | 14698-14759 | 62 | Single `==`, no `===`, structural, compiler-derived |
| 46 | Worker Lifecycle | 14760-14806 | 47 | `when ... from <#name>`, supervision attrs |
| 47 | Output Name Encoding | 14807-15146 | 340 | Encoded JS variable names, kind prefixes, hash scheme |
| 48 | The `fn` Keyword — Pure Functions | 15147-15799 | 653 | Body prohibitions, return-site completeness, lift in fn, calling conventions; **S32: Layer 2 retired, §54 cross-ref** |
| 49 | `while` and `do...while` Loops | 15800-16502 | 703 | Grammar, break/continue, labels, lift in loops, E-LOOP errors (heading uses H1, not H2) |
| 50 | Assignment as Expression | 16503-16969 | 467 | Assign-expr syntax, semantics, type rules, fn interaction |
| 51 | State Transition Rules / `< machine>` | 16970-18692 | 1723 | Type-level transitions, machine declarations, runtime guards, event object, `\|` alternation, payload binding, derived/projection machines, §51.11 audit clause, §51.3.2 attribute-form opener, §51.12 temporal transitions (`after Ns =>`), §51.13 auto-property-tests (`--emit-machine-tests`), **§51.15 three-sites cross-check (S32)** |
| 52 | State Authority Declarations | 18693-19221 | 529 | Two-tier authority, server @var, sync infrastructure |
| 53 | Inline Type Predicates | 19222-20160 | 939 | Value constraints, SPARK zones, named shapes, bind:value HTML attrs |
| 54 | Nested Substates and State-Local Transitions | 20161-20448 | 288 | **S32 (2026-04-20).** Nested substate grammar (§54.2), state-local transitions (§54.3), field narrowing (§54.4), terminal states (§54.5), 4 new error codes (§54.6), interaction matrix (§54.7). Companion to §51.15 cross-check. |

## Quick Lookup: Topic → Section

- attribute parsing → §5 (857-1374)
- bind:value → §5 (~954-1090)
- event handler binding → §5.2.2 (~877-910)
- dynamic class → §5 (1090-1374)
- reactive declaration → §6 (1375-1441)
- reactive arrays → §6 (~1489-1901)
- reactive array mutation → §6.5 (1489+)
- derived values → §6 (~1901-2501)
- lifecycle / cleanup → §6 (~2501-4186)
- timeout / single-shot timer → §6.7.8 (~3311-3581)
- logic context → §7 (4187-4360)
- file-level scope sharing → §7.6 (4337+)
- SQL / ?{} → §8 (4361-4907)
- SQL per-handler coalescing (Tier 1) → §8.9 (4763+)
- SQL N+1 loop hoisting (Tier 2) → §8.10 (~4811+)
- SQL mount-hydration coalescing → §8.11 (~4881+)
- CSS → §9 (4908-4950)
- CSS inline block → §9.1 (4912+)
- lift → §10 (4951-5329)
- lift accumulation order → §10.8 (5294+)
- state objects / protect= → §11 (5330-5473)
- route inference → §12 (5474-5560)
- server function return values → §12.5 (5520+)
- async → §13 (5561-5829)
- async loading / RemoteData → §13.5 (5648+)
- type system / structs / enums → §14 (5830-6352)
- enum types as struct fields → §14.3.2 (5846+)
- components / props → §15 (6353-7083)
- component reactive scope → §15.13 (7030+)
- slots → §16 (7084-7351)
- if= / show= / control flow → §17 (7352-8026)
- if-as-expression → §17.6 (7726-8026)
- match / pattern matching → §18 (8027-9159)
- is operator → §18.17 (~8766-8896)
- partial match → §18.18 (~8896-9159)
- error handling / fail / ? / ! → §19 (9160-10031)
- implicit per-handler transactions → §19.10.5 (9612+)
- navigation / navigate() → §20 (10125-10296)
- module / import / export → §21 (10505-10770)
- export <ComponentName> Form 1 / Form 2 (P2 §21.2) → §21.2 (10513-10615)
- meta / ^{} → §22 (10408-11061)
- foreign code / _{} → §23 (11062-11504)
- WASM sigils → §23.3 (~11284-11439)
- sidecars / use foreign: → §23.4 (~11439-11504)
- HTML elements → §24 (11505-11530)
- CSS variables → §25 (11531-11629)
- comments → §27 (11651-11671)
- compiler settings → §28 (11672-11707)
- bun.eval() → §30 (11717-11747)
- dependency graph → §31 (11748-11771)
- tilde / ~ → §32 (11772-11983)
- pure → §33 (11984-12048)
- error codes → §34 (12049-12251)
- linear types / lin → §35 (12252-12713)
- lin function params → §35.2.1 (12252+)
- keyboard / mouse / gamepad → §36 (12714-13071)
- SSE / server function* → §37 (13072-13313)
- WebSocket / channel → §38 (13314-13619)
- schema / migrations → §39 (13620-13895)
- middleware / handle() → §40 (13896-14119)
- use / import system → §41 (14120-14326)
- not keyword / absence → §42 (14327-14558)
- compound is not / is some → §42.2.4 (14337+)
- nested program / workers → §43 (14559-14641)
- multi-database / ?{} adaptation → §44 (14642-14697)
- equality / == → §45 (14698-14759)
- worker lifecycle / when...from → §46 (14760-14806)
- output name encoding → §47 (14807-15146)
- fn keyword / pure functions → §48 (15147-15799)
- while / do...while loops → §49 (15800-16502)
- assignment as expression → §50 (16503-16969)
- state transitions / machine → §51 (16970-18692)
- §51.15 machine cross-check (S32) → §51 (~18439+)
- state authority / server @var → §52 (18693-19221)
- inline predicates / constraints → §53 (19222-20160)
- nested substates / state-local transitions → §54 (20161-20448)
- E-STATE-COMPLETE (S32) → §54.6 (20327+)
- state-local transitions (S32) → §54.3 (20224+)
- field narrowing on substates (S32) → §54.4 (20299+)
- terminal states (S32) → §54.5 (20316+)
