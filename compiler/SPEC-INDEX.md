# SPEC.md Section Index

> Auto-generated line numbers. Regenerate: `bash scripts/update-spec-index.sh`
> Last updated: 2026-04-20 (S33 open — post-S32 regen; reflects §33 reach-extension, §48 minimize, §51.15 cross-check, §54 new).

Total lines: 20,439 | Total sections: 54 + appendices

> **Note on §49 heading format:** SPEC.md §49 uses a single `#` (H1) at line 15791 instead of the `## N.` pattern every other section uses. The regenerator script will not pick it up automatically — keep this in mind when running the script.

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
| 21 | Module and Import System | 10297-10407 | 111 | Export/import syntax, re-export, pure-type files |
| 22 | Metaprogramming | 10408-11058 | 651 | `^{}` meta context, compile-time/runtime meta, Option D scope model |
| 23 | Foreign Code Contexts (`_{}`) | 11059-11501 | 443 | Level-marked braces, opaque passthrough, WASM sigils, sidecars |
| 24 | HTML Spec Awareness | 11502-11527 | 26 | Element registry, shape constraints |
| 25 | CSS Variable Syntax | 11528-11626 | 99 | Defining/using vars, hyphenated names, scoping |
| 26 | Tailwind Utility Classes | 11627-11647 | 21 | Integration model |
| 27 | Comment Syntax | 11648-11668 | 21 | Universal `//`, per-context native comments |
| 28 | Compiler Settings | 11669-11704 | 36 | html-content-model setting |
| 29 | Vanilla File Interop | 11705-11713 | 9 | Plain JS/CSS/HTML interop |
| 30 | Compile-Time Eval — `bun.eval()` | 11714-11744 | 31 | Scope, markup interpolation, security |
| 31 | Dependency Graph | 11745-11768 | 24 | Purpose, construction, route analysis |
| 32 | The `~` Keyword | 11769-11980 | 212 | Pipeline accumulator, lin variable, context boundary |
| 33 | The `pure` Keyword | 11981-12041 | 61 | Purity constraints, **§33.6 fn ≡ pure function (S32)**, W-PURE-REDUNDANT |
| 34 | Error Codes | 12042-12242 | 201 | All error code definitions (+6/-1 S32: E-STATE-COMPLETE, E-MACHINE-DIVERGENCE, E-STATE-SUBSTATE-*, E-STATE-TERMINAL-*) |
| 35 | Linear Types — `lin` | 12243-12704 | 462 | Declaration (exactly-once + restricted intermediate visibility), consumption, control flow, closures, lin function params (§35.2.1), cross-`${}` block lin (§35.2.2), E-LIN-005 shadowing + E-LIN-006 deferred-ctx (§35.5) |
| 36 | Input State Types | 12705-13062 | 358 | `<keyboard>`, `<mouse>`, `<gamepad>` |
| 37 | Server-Sent Events | 13063-13304 | 242 | `server function*` SSE generators |
| 38 | WebSocket Channels | 13305-13610 | 306 | `<channel>`, @shared, broadcast/disconnect |
| 39 | Schema and Migrations | 13611-13886 | 276 | `< schema>`, column types, migration diff |
| 40 | Middleware and Request Pipeline | 13887-14110 | 224 | Auto middleware, handle() escape hatch |
| 41 | Import System — `use`/`import` | 14111-14315 | 205 | Capability imports, value imports, vendoring |
| 42 | `not` — Unified Absence Value | 14316-14547 | 232 | `not` keyword, `is not`, `is some`, `(x) =>`, `T | not`, compound exprs (§42.2.4) |
| 43 | Nested `<program>` | 14548-14630 | 83 | Execution contexts, shared-nothing, lifecycle, RPC |
| 44 | `?{}` Multi-Database Adaptation | 14631-14686 | 56 | Bun.SQL target, driver resolution, `.get()` → `T | not` |
| 45 | Equality Semantics | 14687-14748 | 62 | Single `==`, no `===`, structural, compiler-derived |
| 46 | Worker Lifecycle | 14749-14795 | 47 | `when ... from <#name>`, supervision attrs |
| 47 | Output Name Encoding | 14796-15135 | 340 | Encoded JS variable names, kind prefixes, hash scheme |
| 48 | The `fn` Keyword — Pure Functions | 15136-15790 | 655 | Body prohibitions, return-site completeness, lift in fn, calling conventions; **S32: Layer 2 retired, §54 cross-ref** |
| 49 | `while` and `do...while` Loops | 15791-16493 | 703 | Grammar, break/continue, labels, lift in loops, E-LOOP errors (heading uses H1, not H2) |
| 50 | Assignment as Expression | 16494-16960 | 467 | Assign-expr syntax, semantics, type rules, fn interaction |
| 51 | State Transition Rules / `< machine>` | 16961-18683 | 1723 | Type-level transitions, machine declarations, runtime guards, event object, `\|` alternation, payload binding, derived/projection machines, §51.11 audit clause, §51.3.2 attribute-form opener, §51.12 temporal transitions (`after Ns =>`), §51.13 auto-property-tests (`--emit-machine-tests`), **§51.15 three-sites cross-check (S32)** |
| 52 | State Authority Declarations | 18684-19212 | 529 | Two-tier authority, server @var, sync infrastructure |
| 53 | Inline Type Predicates | 19213-20151 | 939 | Value constraints, SPARK zones, named shapes, bind:value HTML attrs |
| 54 | Nested Substates and State-Local Transitions | 20152-20439 | 288 | **S32 (2026-04-20).** Nested substate grammar (§54.2), state-local transitions (§54.3), field narrowing (§54.4), terminal states (§54.5), 4 new error codes (§54.6), interaction matrix (§54.7). Companion to §51.15 cross-check. |

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
- module / import / export → §21 (10297-10407)
- meta / ^{} → §22 (10408-11058)
- foreign code / _{} → §23 (11059-11501)
- WASM sigils → §23.3 (~11281-11436)
- sidecars / use foreign: → §23.4 (~11436-11501)
- HTML elements → §24 (11502-11527)
- CSS variables → §25 (11528-11626)
- comments → §27 (11648-11668)
- compiler settings → §28 (11669-11704)
- bun.eval() → §30 (11714-11744)
- dependency graph → §31 (11745-11768)
- tilde / ~ → §32 (11769-11980)
- pure → §33 (11981-12041)
- error codes → §34 (12042-12242)
- linear types / lin → §35 (12243-12704)
- lin function params → §35.2.1 (12243+)
- keyboard / mouse / gamepad → §36 (12705-13062)
- SSE / server function* → §37 (13063-13304)
- WebSocket / channel → §38 (13305-13610)
- schema / migrations → §39 (13611-13886)
- middleware / handle() → §40 (13887-14110)
- use / import system → §41 (14111-14315)
- not keyword / absence → §42 (14316-14547)
- compound is not / is some → §42.2.4 (14326+)
- nested program / workers → §43 (14548-14630)
- multi-database / ?{} adaptation → §44 (14631-14686)
- equality / == → §45 (14687-14748)
- worker lifecycle / when...from → §46 (14749-14795)
- output name encoding → §47 (14796-15135)
- fn keyword / pure functions → §48 (15136-15790)
- while / do...while loops → §49 (15791-16493)
- assignment as expression → §50 (16494-16960)
- state transitions / machine → §51 (16961-18683)
- §51.15 machine cross-check (S32) → §51 (~18430+)
- state authority / server @var → §52 (18684-19212)
- inline predicates / constraints → §53 (19213-20151)
- nested substates / state-local transitions → §54 (20152-20439)
- E-STATE-COMPLETE (S32) → §54.6 (20318+)
- state-local transitions (S32) → §54.3 (20215+)
- field narrowing on substates (S32) → §54.4 (20290+)
- terminal states (S32) → §54.5 (20307+)
