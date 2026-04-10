# SPEC.md Section Index

> Auto-generated line numbers. Regenerate: `bash scripts/update-spec-index.sh`
> Last updated: 2026-04-10

Total lines: 18,521 | Total sections: 53 + appendices

## Sections

| § | Section | Lines | Size | Summary |
|---|---------|-------|------|---------|
| — | Table of Contents | 23-104 | 82 | Section listing |
| 1 | Overview | 105-124 | 20 | Design principles, Bun runtime |
| 2 | File Format and Compilation Model | 125-165 | 41 | Source files, output, entry point, perf target |
| 3 | Context Model | 166-205 | 40 | Contexts, stack rules, coercion |
| 4 | Block Grammar | 206-816 | 611 | Tags, states, closer forms, PA rules, keywords, angleDepth (PA-005) |
| 5 | Attribute Quoting Semantics | 817-1333 | 517 | Three forms, bind:, dynamic class, event handler binding (§5.2.2) |
| 6 | Reactivity — The `@` Sigil | 1334-4145 | 2812 | Declaration, placement, arrays (§6.5 mutation), derived, lifecycle, `<timeout>` (§6.7.8) |
| 7 | Logic Contexts | 4146-4319 | 174 | `{}` syntax, function forms, markup-as-expr, type annotations, file-level scope (§7.6) |
| 8 | SQL Contexts | 4320-4721 | 402 | `?{}` syntax, bound params, chaining, WHERE, INSERT/UPDATE/DELETE |
| 9 | CSS Contexts | 4722-4754 | 33 | Inline CSS (§9.1), style block, CSS files |
| 10 | The `lift` Keyword | 4755-5133 | 379 | Semantics, coercion, syntax forms, ordering, value-lift, accumulation (§10.8) |
| 11 | State Objects and `protect=` | 5134-5277 | 144 | State declaration, schema reading, protect types, authority relationship |
| 12 | Route Inference | 5278-5364 | 87 | Default placement, escalation triggers, generated infra, server return (§12.5) |
| 13 | Async Model | 5365-5633 | 269 | Developer-visible syntax, compiler-managed async, RemoteData enum (§13.5) |
| 14 | Type System | 5634-6156 | 523 | Structs (§14.3.2 enum fields), enums, pattern matching, asIs, schema types, snippet type |
| 15 | Component System | 6157-6887 | 731 | Definition, props, shapes, slots, callbacks, rendering syntax, reactive scope (§15.13) |
| 16 | Component Slots | 6888-7155 | 268 | Named slots, unnamed children, fill syntax, render validation |
| 17 | Control Flow | 7156-7830 | 675 | if=, show=, lifecycle, iteration, overloading, if-as-expression (§17.6) |
| 18 | Pattern Matching and Enums | 7831-8963 | 1133 | match syntax, exhaustiveness, guards, literals, `is` operator, `partial match` (§18.18) |
| 19 | Error Handling (Revised) | 8964-9820 | 857 | Renderable enum variants, fail, ?, !, errorBoundary, renders clause |
| A | Appendix A: Interaction Matrix | 9821-9839 | 19 | Error system feature interactions |
| B | Appendix B: Superseded Spec Text | 9840-9848 | 9 | What §19 replaced |
| C | Appendix C: Future Considerations | 9849-9857 | 9 | Error composition, retry, telemetry, async errors |
| D | Appendix D: JS Standard Library | 9858-9878 | 21 | JS stdlib access in logic contexts |
| E | Appendix E: `</>` Closer Migration | 9879-9913 | 35 | Migration guide for `/` → `</>` |
| 20 | Navigation API | 9914-10085 | 172 | navigate(), route params, session context |
| 21 | Module and Import System | 10086-10196 | 111 | Export/import syntax, re-export, pure-type files |
| 22 | Metaprogramming | 10197-10847 | 651 | `^{}` meta context, compile-time/runtime meta, Option D scope model |
| 23 | Foreign Code Contexts (`_{}`) | 10848-11290 | 443 | Level-marked braces, opaque passthrough, WASM sigils, sidecars |
| 24 | HTML Spec Awareness | 11291-11316 | 26 | Element registry, shape constraints |
| 25 | CSS Variable Syntax | 11317-11387 | 71 | Defining/using vars, hyphenated names, scoping |
| 26 | Tailwind Utility Classes | 11388-11408 | 21 | Integration model |
| 27 | Comment Syntax | 11409-11429 | 21 | Universal `//`, per-context native comments |
| 28 | Compiler Settings | 11430-11465 | 36 | html-content-model setting |
| 29 | Vanilla File Interop | 11466-11474 | 9 | Plain JS/CSS/HTML interop |
| 30 | Compile-Time Eval — `bun.eval()` | 11475-11505 | 31 | Scope, markup interpolation, security |
| 31 | Dependency Graph | 11506-11529 | 24 | Purpose, construction, route analysis |
| 32 | The `~` Keyword | 11530-11741 | 212 | Pipeline accumulator, lin variable, context boundary |
| 33 | The `pure` Keyword | 11742-11784 | 43 | Purity constraints |
| 34 | Error Codes | 11785-11979 | 195 | All error code definitions |
| 35 | Linear Types — `lin` | 11980-12292 | 313 | Declaration, consumption, control flow, closures |
| 36 | Input State Types | 12293-12650 | 358 | `<keyboard>`, `<mouse>`, `<gamepad>` |
| 37 | Server-Sent Events | 12651-12892 | 242 | `server function*` SSE generators |
| 38 | WebSocket Channels | 12893-12966 | 74 | `<channel>`, @shared, broadcast/disconnect |
| 39 | Schema and Migrations | 12967-13242 | 276 | `< schema>`, column types, migration diff |
| 40 | Middleware and Request Pipeline | 13243-13466 | 224 | Auto middleware, handle() escape hatch |
| 41 | Import System — `use`/`import` | 13467-13671 | 205 | Capability imports, value imports, vendoring |
| 42 | `not` — Unified Absence Value | 13672-13901 | 230 | `not` keyword, `is not`, `is some`, `(x) =>`, `T | not`, compound exprs (§42.2.4) |
| 43 | Nested `<program>` | 13902-13984 | 83 | Execution contexts, shared-nothing, lifecycle, RPC |
| 44 | `?{}` Multi-Database Adaptation | 13985-14040 | 56 | Bun.SQL target, driver resolution, `.first()` → `T | not` |
| 45 | Equality Semantics | 14041-14102 | 62 | Single `==`, no `===`, structural, compiler-derived |
| 46 | Worker Lifecycle | 14103-14149 | 47 | `when ... from <#name>`, supervision attrs |
| 47 | Output Name Encoding | 14150-14489 | 340 | Encoded JS variable names, kind prefixes, hash scheme |
| 48 | The `fn` Keyword — Pure Functions | 14490-15189 | 700 | Body prohibitions, return-site completeness, lift in fn, calling conventions |
| 49 | `while` and `do...while` Loops | 15190-15884 | 695 | Grammar, break/continue, labels, lift in loops, E-LOOP errors |
| 50 | Assignment as Expression | 15885-16351 | 467 | Assign-expr syntax, semantics, type rules, fn interaction |
| 51 | State Transition Rules / `< machine>` | 16352-17056 | 705 | Type-level transitions, machine declarations, runtime guards, event object |
| 52 | State Authority Declarations | 17057-17585 | 529 | Two-tier authority, server @var, sync infrastructure |
| 53 | Inline Type Predicates | 17586-18521 | 936 | Value constraints, SPARK zones, named shapes, bind:value HTML attrs |

## Quick Lookup: Topic → Section

- attribute parsing → §5 (817-1333)
- bind:value → §5 (~914-1050)
- event handler binding → §5.2.2 (~837-870)
- dynamic class → §5 (1050-1333)
- reactive declaration → §6 (1334-1400)
- reactive arrays → §6 (~1448-1860)
- reactive array mutation → §6.5 (1448+)
- derived values → §6 (~1860-2460)
- lifecycle / cleanup → §6 (~2460-4145)
- timeout / single-shot timer → §6.7.8 (~3270-3540)
- logic context → §7 (4146-4319)
- file-level scope sharing → §7.6 (4296+)
- SQL / ?{} → §8 (4320-4721)
- CSS → §9 (4722-4754)
- CSS inline block → §9.1 (4726+)
- lift → §10 (4755-5133)
- lift accumulation order → §10.8 (5098+)
- state objects / protect= → §11 (5134-5277)
- route inference → §12 (5278-5364)
- server function return values → §12.5 (5324+)
- async → §13 (5365-5633)
- async loading / RemoteData → §13.5 (5452+)
- type system / structs / enums → §14 (5634-6156)
- enum types as struct fields → §14.3.2 (5650+)
- components / props → §15 (6157-6887)
- component reactive scope → §15.13 (6834+)
- slots → §16 (6888-7155)
- if= / show= / control flow → §17 (7156-7830)
- if-as-expression → §17.6 (7530-7830)
- match / pattern matching → §18 (7831-8963)
- is operator → §18.17 (~8570-8700)
- partial match → §18.18 (~8700-8963)
- error handling / fail / ? / ! → §19 (8964-9820)
- navigation / navigate() → §20 (9914-10085)
- module / import / export → §21 (10086-10196)
- meta / ^{} → §22 (10197-10847)
- foreign code / _{} → §23 (10848-11290)
- WASM sigils → §23.3 (~11070-11225)
- sidecars / use foreign: → §23.4 (~11225-11290)
- HTML elements → §24 (11291-11316)
- CSS variables → §25 (11317-11387)
- comments → §27 (11409-11429)
- compiler settings → §28 (11430-11465)
- bun.eval() → §30 (11475-11505)
- dependency graph → §31 (11506-11529)
- tilde / ~ → §32 (11530-11741)
- pure → §33 (11742-11784)
- error codes → §34 (11785-11979)
- linear types / lin → §35 (11980-12292)
- keyboard / mouse / gamepad → §36 (12293-12650)
- SSE / server function* → §37 (12651-12892)
- WebSocket / channel → §38 (12893-12966)
- schema / migrations → §39 (12967-13242)
- middleware / handle() → §40 (13243-13466)
- use / import system → §41 (13467-13671)
- not keyword / absence → §42 (13672-13901)
- compound is not / is some → §42.2.4 (13682+)
- nested program / workers → §43 (13902-13984)
- multi-database / ?{} adaptation → §44 (13985-14040)
- equality / == → §45 (14041-14102)
- worker lifecycle / when...from → §46 (14103-14149)
- output name encoding → §47 (14150-14489)
- fn keyword / pure functions → §48 (14490-15189)
- while / do...while loops → §49 (15190-15884)
- assignment as expression → §50 (15885-16351)
- state transitions / machine → §51 (16352-17056)
- state authority / server @var → §52 (17057-17585)
- inline predicates / constraints → §53 (17586-18521)
