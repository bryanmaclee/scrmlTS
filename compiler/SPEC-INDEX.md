# SPEC.md Section Index

> Auto-generated line numbers. Regenerate: `bash scripts/update-spec-index.sh`
> Last updated: 2026-04-11

Total lines: 18,863 | Total sections: 53 + appendices

> **Note on §49 heading format:** SPEC.md §49 uses a single `#` (H1) at line 15524 instead of the `## N.` pattern every other section uses. The regenerator script will not pick it up automatically — keep this in mind when running the script.

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
| 9 | CSS Contexts | 4722-4764 | 43 | Inline CSS (§9.1), style block, CSS files |
| 10 | The `lift` Keyword | 4765-5143 | 379 | Semantics, coercion, syntax forms, ordering, value-lift, accumulation (§10.8) |
| 11 | State Objects and `protect=` | 5144-5287 | 144 | State declaration, schema reading, protect types, authority relationship |
| 12 | Route Inference | 5288-5374 | 87 | Default placement, escalation triggers, generated infra, server return (§12.5) |
| 13 | Async Model | 5375-5643 | 269 | Developer-visible syntax, compiler-managed async, RemoteData enum (§13.5) |
| 14 | Type System | 5644-6166 | 523 | Structs (§14.3.2 enum fields), enums, pattern matching, asIs, schema types, snippet type |
| 15 | Component System | 6167-6897 | 731 | Definition, props, shapes, slots, callbacks, rendering syntax, reactive scope (§15.13) |
| 16 | Component Slots | 6898-7165 | 268 | Named slots, unnamed children, fill syntax, render validation |
| 17 | Control Flow | 7166-7840 | 675 | if=, show=, lifecycle, iteration, overloading, if-as-expression (§17.6) |
| 18 | Pattern Matching and Enums | 7841-8973 | 1133 | match syntax, exhaustiveness, guards, literals, `is` operator, `partial match` (§18.18) |
| 19 | Error Handling (Revised) | 8974-9830 | 857 | Renderable enum variants, fail, ?, !, errorBoundary, renders clause |
| A | Appendix A: Interaction Matrix | 9831-9849 | 19 | Error system feature interactions |
| B | Appendix B: Superseded Spec Text | 9850-9858 | 9 | What §19 replaced |
| C | Appendix C: Future Considerations | 9859-9867 | 9 | Error composition, retry, telemetry, async errors |
| D | Appendix D: JS Standard Library | 9868-9888 | 21 | JS stdlib access in logic contexts |
| E | Appendix E: `</>` Closer Migration | 9889-9923 | 35 | Migration guide for `/` → `</>` |
| 20 | Navigation API | 9924-10095 | 172 | navigate(), route params, session context |
| 21 | Module and Import System | 10096-10206 | 111 | Export/import syntax, re-export, pure-type files |
| 22 | Metaprogramming | 10207-10857 | 651 | `^{}` meta context, compile-time/runtime meta, Option D scope model |
| 23 | Foreign Code Contexts (`_{}`) | 10858-11300 | 443 | Level-marked braces, opaque passthrough, WASM sigils, sidecars |
| 24 | HTML Spec Awareness | 11301-11326 | 26 | Element registry, shape constraints |
| 25 | CSS Variable Syntax | 11327-11425 | 99 | Defining/using vars, hyphenated names, scoping |
| 26 | Tailwind Utility Classes | 11426-11446 | 21 | Integration model |
| 27 | Comment Syntax | 11447-11467 | 21 | Universal `//`, per-context native comments |
| 28 | Compiler Settings | 11468-11503 | 36 | html-content-model setting |
| 29 | Vanilla File Interop | 11504-11512 | 9 | Plain JS/CSS/HTML interop |
| 30 | Compile-Time Eval — `bun.eval()` | 11513-11543 | 31 | Scope, markup interpolation, security |
| 31 | Dependency Graph | 11544-11567 | 24 | Purpose, construction, route analysis |
| 32 | The `~` Keyword | 11568-11779 | 212 | Pipeline accumulator, lin variable, context boundary |
| 33 | The `pure` Keyword | 11780-11822 | 43 | Purity constraints |
| 34 | Error Codes | 11823-12017 | 195 | All error code definitions |
| 35 | Linear Types — `lin` | 12018-12400 | 383 | Declaration, consumption, control flow, closures, lin function params (§35.2.1 — Batch B) |
| 36 | Input State Types | 12401-12758 | 358 | `<keyboard>`, `<mouse>`, `<gamepad>` |
| 37 | Server-Sent Events | 12759-13000 | 242 | `server function*` SSE generators |
| 38 | WebSocket Channels | 13001-13306 | 306 | `<channel>`, @shared, broadcast/disconnect |
| 39 | Schema and Migrations | 13307-13582 | 276 | `< schema>`, column types, migration diff |
| 40 | Middleware and Request Pipeline | 13583-13806 | 224 | Auto middleware, handle() escape hatch |
| 41 | Import System — `use`/`import` | 13807-14011 | 205 | Capability imports, value imports, vendoring |
| 42 | `not` — Unified Absence Value | 14012-14243 | 232 | `not` keyword, `is not`, `is some`, `(x) =>`, `T | not`, compound exprs (§42.2.4) |
| 43 | Nested `<program>` | 14244-14326 | 83 | Execution contexts, shared-nothing, lifecycle, RPC |
| 44 | `?{}` Multi-Database Adaptation | 14327-14382 | 56 | Bun.SQL target, driver resolution, `.first()` → `T | not` |
| 45 | Equality Semantics | 14383-14444 | 62 | Single `==`, no `===`, structural, compiler-derived |
| 46 | Worker Lifecycle | 14445-14491 | 47 | `when ... from <#name>`, supervision attrs |
| 47 | Output Name Encoding | 14492-14831 | 340 | Encoded JS variable names, kind prefixes, hash scheme |
| 48 | The `fn` Keyword — Pure Functions | 14832-15523 | 692 | Body prohibitions, return-site completeness, lift in fn, calling conventions |
| 49 | `while` and `do...while` Loops | 15524-16226 | 703 | Grammar, break/continue, labels, lift in loops, E-LOOP errors (heading uses H1, not H2) |
| 50 | Assignment as Expression | 16227-16693 | 467 | Assign-expr syntax, semantics, type rules, fn interaction |
| 51 | State Transition Rules / `< machine>` | 16694-17398 | 705 | Type-level transitions, machine declarations, runtime guards, event object |
| 52 | State Authority Declarations | 17399-17927 | 529 | Two-tier authority, server @var, sync infrastructure |
| 53 | Inline Type Predicates | 17928-18863 | 936 | Value constraints, SPARK zones, named shapes, bind:value HTML attrs |

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
- CSS → §9 (4722-4764)
- CSS inline block → §9.1 (4726+)
- lift → §10 (4765-5143)
- lift accumulation order → §10.8 (5108+)
- state objects / protect= → §11 (5144-5287)
- route inference → §12 (5288-5374)
- server function return values → §12.5 (5334+)
- async → §13 (5375-5643)
- async loading / RemoteData → §13.5 (5462+)
- type system / structs / enums → §14 (5644-6166)
- enum types as struct fields → §14.3.2 (5660+)
- components / props → §15 (6167-6897)
- component reactive scope → §15.13 (6844+)
- slots → §16 (6898-7165)
- if= / show= / control flow → §17 (7166-7840)
- if-as-expression → §17.6 (7540-7840)
- match / pattern matching → §18 (7841-8973)
- is operator → §18.17 (~8580-8710)
- partial match → §18.18 (~8710-8973)
- error handling / fail / ? / ! → §19 (8974-9830)
- navigation / navigate() → §20 (9924-10095)
- module / import / export → §21 (10096-10206)
- meta / ^{} → §22 (10207-10857)
- foreign code / _{} → §23 (10858-11300)
- WASM sigils → §23.3 (~11080-11235)
- sidecars / use foreign: → §23.4 (~11235-11300)
- HTML elements → §24 (11301-11326)
- CSS variables → §25 (11327-11425)
- comments → §27 (11447-11467)
- compiler settings → §28 (11468-11503)
- bun.eval() → §30 (11513-11543)
- dependency graph → §31 (11544-11567)
- tilde / ~ → §32 (11568-11779)
- pure → §33 (11780-11822)
- error codes → §34 (11823-12017)
- linear types / lin → §35 (12018-12400)
- lin function params → §35.2.1 (12018+)
- keyboard / mouse / gamepad → §36 (12401-12758)
- SSE / server function* → §37 (12759-13000)
- WebSocket / channel → §38 (13001-13306)
- schema / migrations → §39 (13307-13582)
- middleware / handle() → §40 (13583-13806)
- use / import system → §41 (13807-14011)
- not keyword / absence → §42 (14012-14243)
- compound is not / is some → §42.2.4 (14022+)
- nested program / workers → §43 (14244-14326)
- multi-database / ?{} adaptation → §44 (14327-14382)
- equality / == → §45 (14383-14444)
- worker lifecycle / when...from → §46 (14445-14491)
- output name encoding → §47 (14492-14831)
- fn keyword / pure functions → §48 (14832-15523)
- while / do...while loops → §49 (15524-16226)
- assignment as expression → §50 (16227-16693)
- state transitions / machine → §51 (16694-17398)
- state authority / server @var → §52 (17399-17927)
- inline predicates / constraints → §53 (17928-18863)
