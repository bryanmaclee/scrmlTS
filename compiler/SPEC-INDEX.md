# SPEC.md Section Index

> Auto-generated line numbers. Regenerate: `bash scripts/update-spec-index.sh`
> Last updated: 2026-04-14 (S16 — SQL batching §8.9/8.10/8.11 + §19.10.5)

Total lines: 19,023 | Total sections: 53 + appendices

> **Note on §49 heading format:** SPEC.md §49 uses a single `#` (H1) at line 15684 instead of the `## N.` pattern every other section uses. The regenerator script will not pick it up automatically — keep this in mind when running the script.

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
| 8 | SQL Contexts | 4320-4866 | 547 | `?{}` syntax, bound params, chaining, WHERE, INSERT/UPDATE/DELETE, **§8.9 per-handler coalescing, §8.10 N+1 loop hoist, §8.11 mount hydration** |
| 9 | CSS Contexts | 4867-4909 | 43 | Inline CSS (§9.1), style block, CSS files |
| 10 | The `lift` Keyword | 4910-5288 | 379 | Semantics, coercion, syntax forms, ordering, value-lift, accumulation (§10.8) |
| 11 | State Objects and `protect=` | 5289-5432 | 144 | State declaration, schema reading, protect types, authority relationship |
| 12 | Route Inference | 5433-5519 | 87 | Default placement, escalation triggers, generated infra, server return (§12.5) |
| 13 | Async Model | 5520-5788 | 269 | Developer-visible syntax, compiler-managed async, RemoteData enum (§13.5) |
| 14 | Type System | 5789-6311 | 523 | Structs (§14.3.2 enum fields), enums, pattern matching, asIs, schema types, snippet type |
| 15 | Component System | 6312-7042 | 731 | Definition, props, shapes, slots, callbacks, rendering syntax, reactive scope (§15.13) |
| 16 | Component Slots | 7043-7310 | 268 | Named slots, unnamed children, fill syntax, render validation |
| 17 | Control Flow | 7311-7985 | 675 | if=, show=, lifecycle, iteration, overloading, if-as-expression (§17.6) |
| 18 | Pattern Matching and Enums | 7986-9118 | 1133 | match syntax, exhaustiveness, guards, literals, `is` operator, `partial match` (§18.18) |
| 19 | Error Handling (Revised) | 9119-9990 | 872 | Renderable enum variants, fail, ?, !, errorBoundary, renders clause, **§19.10.5 implicit per-handler tx** |
| A | Appendix A: Interaction Matrix | 9991-10009 | 19 | Error system feature interactions |
| B | Appendix B: Superseded Spec Text | 10010-10018 | 9 | What §19 replaced |
| C | Appendix C: Future Considerations | 10019-10027 | 9 | Error composition, retry, telemetry, async errors |
| D | Appendix D: JS Standard Library | 10028-10048 | 21 | JS stdlib access in logic contexts |
| E | Appendix E: `</>` Closer Migration | 10049-10083 | 35 | Migration guide for `/` → `</>` |
| 20 | Navigation API | 10084-10255 | 172 | navigate(), route params, session context |
| 21 | Module and Import System | 10256-10366 | 111 | Export/import syntax, re-export, pure-type files |
| 22 | Metaprogramming | 10367-11017 | 651 | `^{}` meta context, compile-time/runtime meta, Option D scope model |
| 23 | Foreign Code Contexts (`_{}`) | 11018-11460 | 443 | Level-marked braces, opaque passthrough, WASM sigils, sidecars |
| 24 | HTML Spec Awareness | 11461-11486 | 26 | Element registry, shape constraints |
| 25 | CSS Variable Syntax | 11487-11585 | 99 | Defining/using vars, hyphenated names, scoping |
| 26 | Tailwind Utility Classes | 11586-11606 | 21 | Integration model |
| 27 | Comment Syntax | 11607-11627 | 21 | Universal `//`, per-context native comments |
| 28 | Compiler Settings | 11628-11663 | 36 | html-content-model setting |
| 29 | Vanilla File Interop | 11664-11672 | 9 | Plain JS/CSS/HTML interop |
| 30 | Compile-Time Eval — `bun.eval()` | 11673-11703 | 31 | Scope, markup interpolation, security |
| 31 | Dependency Graph | 11704-11727 | 24 | Purpose, construction, route analysis |
| 32 | The `~` Keyword | 11728-11939 | 212 | Pipeline accumulator, lin variable, context boundary |
| 33 | The `pure` Keyword | 11940-11982 | 43 | Purity constraints |
| 34 | Error Codes | 11983-12177 | 195 | All error code definitions |
| 35 | Linear Types — `lin` | 12217-12678 | 462 | Declaration (exactly-once + restricted intermediate visibility), consumption, control flow, closures, lin function params (§35.2.1), cross-`${}` block lin (§35.2.2), E-LIN-005 shadowing + E-LIN-006 deferred-ctx (§35.5) |
| 36 | Input State Types | 12561-12918 | 358 | `<keyboard>`, `<mouse>`, `<gamepad>` |
| 37 | Server-Sent Events | 12919-13160 | 242 | `server function*` SSE generators |
| 38 | WebSocket Channels | 13161-13466 | 306 | `<channel>`, @shared, broadcast/disconnect |
| 39 | Schema and Migrations | 13467-13742 | 276 | `< schema>`, column types, migration diff |
| 40 | Middleware and Request Pipeline | 13743-13966 | 224 | Auto middleware, handle() escape hatch |
| 41 | Import System — `use`/`import` | 13967-14171 | 205 | Capability imports, value imports, vendoring |
| 42 | `not` — Unified Absence Value | 14172-14403 | 232 | `not` keyword, `is not`, `is some`, `(x) =>`, `T | not`, compound exprs (§42.2.4) |
| 43 | Nested `<program>` | 14404-14486 | 83 | Execution contexts, shared-nothing, lifecycle, RPC |
| 44 | `?{}` Multi-Database Adaptation | 14487-14542 | 56 | Bun.SQL target, driver resolution, `.get()` → `T | not` |
| 45 | Equality Semantics | 14543-14604 | 62 | Single `==`, no `===`, structural, compiler-derived |
| 46 | Worker Lifecycle | 14605-14651 | 47 | `when ... from <#name>`, supervision attrs |
| 47 | Output Name Encoding | 14652-14991 | 340 | Encoded JS variable names, kind prefixes, hash scheme |
| 48 | The `fn` Keyword — Pure Functions | 14992-15683 | 692 | Body prohibitions, return-site completeness, lift in fn, calling conventions |
| 49 | `while` and `do...while` Loops | 15684-16386 | 703 | Grammar, break/continue, labels, lift in loops, E-LOOP errors (heading uses H1, not H2) |
| 50 | Assignment as Expression | 16387-16853 | 467 | Assign-expr syntax, semantics, type rules, fn interaction |
| 51 | State Transition Rules / `< machine>` | 16972-18310 | 1339 | Type-level transitions, machine declarations, runtime guards, event object, `\|` alternation, payload binding, derived/projection machines, §51.11 audit clause, §51.3.2 attribute-form opener, §51.12 temporal transitions (`after Ns =>`), §51.13 auto-property-tests (`--emit-machine-tests`) |
| 52 | State Authority Declarations | 17559-18087 | 529 | Two-tier authority, server @var, sync infrastructure |
| 53 | Inline Type Predicates | 18088-19023 | 936 | Value constraints, SPARK zones, named shapes, bind:value HTML attrs |

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
- SQL / ?{} → §8 (4320-4866)
- SQL per-handler coalescing (Tier 1) → §8.9 (4722+)
- SQL N+1 loop hoisting (Tier 2) → §8.10 (~4770+)
- SQL mount-hydration coalescing → §8.11 (~4840+)
- CSS → §9 (4867-4909)
- CSS inline block → §9.1 (4871+)
- lift → §10 (4910-5288)
- lift accumulation order → §10.8 (5253+)
- state objects / protect= → §11 (5289-5432)
- route inference → §12 (5433-5519)
- server function return values → §12.5 (5479+)
- async → §13 (5520-5788)
- async loading / RemoteData → §13.5 (5607+)
- type system / structs / enums → §14 (5789-6311)
- enum types as struct fields → §14.3.2 (5805+)
- components / props → §15 (6312-7042)
- component reactive scope → §15.13 (6989+)
- slots → §16 (7043-7310)
- if= / show= / control flow → §17 (7311-7985)
- if-as-expression → §17.6 (7685-7985)
- match / pattern matching → §18 (7986-9118)
- is operator → §18.17 (~8725-8855)
- partial match → §18.18 (~8855-9118)
- error handling / fail / ? / ! → §19 (9119-9990)
- implicit per-handler transactions → §19.10.5 (9571+)
- navigation / navigate() → §20 (10084-10255)
- module / import / export → §21 (10256-10366)
- meta / ^{} → §22 (10367-11017)
- foreign code / _{} → §23 (11018-11460)
- WASM sigils → §23.3 (~11240-11395)
- sidecars / use foreign: → §23.4 (~11395-11460)
- HTML elements → §24 (11461-11486)
- CSS variables → §25 (11487-11585)
- comments → §27 (11607-11627)
- compiler settings → §28 (11628-11663)
- bun.eval() → §30 (11673-11703)
- dependency graph → §31 (11704-11727)
- tilde / ~ → §32 (11728-11939)
- pure → §33 (11940-11982)
- error codes → §34 (11983-12177)
- linear types / lin → §35 (12178-12560)
- lin function params → §35.2.1 (12178+)
- keyboard / mouse / gamepad → §36 (12561-12918)
- SSE / server function* → §37 (12919-13160)
- WebSocket / channel → §38 (13161-13466)
- schema / migrations → §39 (13467-13742)
- middleware / handle() → §40 (13743-13966)
- use / import system → §41 (13967-14171)
- not keyword / absence → §42 (14172-14403)
- compound is not / is some → §42.2.4 (14182+)
- nested program / workers → §43 (14404-14486)
- multi-database / ?{} adaptation → §44 (14487-14542)
- equality / == → §45 (14543-14604)
- worker lifecycle / when...from → §46 (14605-14651)
- output name encoding → §47 (14652-14991)
- fn keyword / pure functions → §48 (14992-15683)
- while / do...while loops → §49 (15684-16386)
- assignment as expression → §50 (16387-16853)
- state transitions / machine → §51 (16854-17558)
- state authority / server @var → §52 (17559-18087)
- inline predicates / constraints → §53 (18088-19023)
