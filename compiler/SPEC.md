# scrml Language Specification

> **Amendments applied:** 2026-04-02 — see `docs/spec-issues/SPEC-AMENDMENTS-2026-04-02.md` for full rationale.
> **Amendments applied:** 2026-04-03 — see `docs/changes/spec-s37-amendments/spec-amendments.md` for full rationale. S37-AM-001 through S37-AM-008.
> **Amendments applied:** 2026-04-05 — see `docs/spec-issues/SPEC-AMENDMENTS-2026-04-05.md` for full rationale. RH-001 through RH-006 (reflect(variable) hybrid API).
> **Amendments applied:** 2026-04-06 — see `docs/spec-issues/SPEC-AMENDMENTS-2026-04-06.md` for full rationale. R21-AM-001 through R21-AM-007 (<timeout> state type, partial match).
> **Amendments applied:** 2026-04-07 — §48 added: `fn` redefined as constrained state factory (E-FN-001..E-FN-009, W-FN-001). §7.3 updated to reflect `fn`/`function` distinction.
> **Amendments applied:** 2026-04-08 — Self-hosting gauntlet R1 findings: §48 relaxed `fn` from "state factory" to "pure function, any return type." §7.3.1 nested function declarations. §7.3.2 default parameter values. §14.3.1 optional struct fields (`= not`). Appendix D: JS standard library access in logic contexts.
> **Amendments applied:** 2026-04-07 — §49 added: `while`, `do...while`, `break`, `continue` with labeled control flow (E-LOOP-001..E-LOOP-007).
> **Amendments applied:** 2026-04-07 — §50 added: Assignment as Expression (W-ASSIGN-001, E-ASSIGN-001..E-ASSIGN-004).
> **Amendments applied:** 2026-04-08 — §51 added: State Transition Rules and `< machine>` state type (E-MACHINE-001..E-MACHINE-012, E-MACHINE-001-RT). §14.4 amended: `transitions {}` block grammar. §6.1 amended: machine-bound reactive variable declaration.
> **Amendments applied:** 2026-04-08 — §52 added: State Authority Declarations. Two-tier authority model (`server @var` Tier 2, `authority=` on `< Type>` Tier 1), compiler-generated sync infrastructure. §6.1.2 added: `server @var` grammar. §11.3.5 added: `protect=` / `authority=` relationship. E-AUTH-001..E-AUTH-005, W-AUTH-001.
> **Amendments applied:** 2026-04-08 — §51 revised: `for EnumTypeName` → `for TypeName` (machines govern structs too). `self.*` in guards, `[label]` named clauses, `* => *` wildcard rules, E-MACHINE-013. Radical doubt debate Approach C.
> **Amendments applied:** 2026-04-09 — §4.4 rewritten: three closer forms → two (`</tagname>` explicit, `</>` inferred). §4.8 deleted (bare `/` disambiguation no longer needed). §3.1 table updated. §3.2 E-CTX-002 wording updated. §4.5, §4.9 updated. §34 error codes updated. Appendix E added: migration guide. All examples updated throughout.
> **Amendments applied:** 2026-04-08 — §53 added: Inline Type Predicates. Stateless value constraints (`number(>0 && <10000)`, `string(email)`), three-zone SPARK enforcement, named shape registry, `bind:value` HTML attribute generation. E-CONTRACT-001..E-CONTRACT-004-WARN.

**Version:** 0.5.2-draft
**Date:** 2026-04-03
**Status:** Draft — reconstructed 2026-03-28 from update docs after truncation; §4.10-4.11 added 2026-03-25; §10.4-10.5 updated 2026-03-25; §10.5.5 added 2026-03-27 resolving SPEC-ISSUE-007; §14.8 added 2026-03-26 resolving SPEC-PA-017; §18 rewritten 2026-03-27 (588 lines, all 11 blocking issues resolved); §31/§33/§34 written 2026-03-27; §5.4/§15.10/§18.16/§20.3-20.4/§21 added 2026-03-27; §6.6 inserted 2026-03-30 — derived reactive values (const @name, lazy pull, dirty flags); §8 updated 2026-03-30 — bound parameter rules, deduplication, null-coalescing WHERE pattern; §6.5 written 2026-03-31 — reactive array mutation, mutating method interception, keyed iteration; §19 rewritten 2026-04-01 — complete error handling spec, resolves SPEC-ISSUE-011 (built-in types catalog, throw syntax), adds reactive error state, server boundary interaction, protect= audit (E-ERROR-001..005, W-ERROR-001..002)

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Format and Compilation Model](#2-file-format-and-compilation-model)
3. [Context Model](#3-context-model)
4. [Block Grammar — Tags, States, and Closer Forms](#4-block-grammar--tags-states-and-closer-forms)
   - [4.6 Rule: `<` Suppression Inside Brace-Delimited Contexts (PA-001)](#46-rule--suppression-inside-brace-delimited-contexts-pa-001)
   - [4.7 Rule: `//` Comment Suppression at Block-Splitter Level (PA-002)](#47-rule--comment-suppression-at-block-splitter-level-pa-002)
   - [4.9 Rule: Preprocessor Output as Source Text (Phase 0 Issue 1.1)](#49-rule-preprocessor-output-as-source-text-phase-0-issue-11)
   - [4.10 Rule: Newline Before Tag Identifier](#410-rule-newline-before-tag-identifier)
   - [4.11 Canonical Keywords](#411-canonical-keywords)
5. [Attribute Quoting Semantics](#5-attribute-quoting-semantics)
   - [5.4 Two-Way Binding — The `bind:` Prefix](#54-two-way-binding--the-bind-prefix)
   - [5.5 Dynamic Class Binding](#55-dynamic-class-binding)
6. [Reactivity — The `@` Sigil](#6-reactivity--the--sigil)
   - [6.5 Reactive Array Mutation](#65-reactive-array-mutation)
   - [6.6 Derived Reactive Values — `const @name`](#66-derived-reactive-values--const-name)
   - [6.7 Lifecycle and Timing Model](#67-lifecycle-and-timing-model)
7. [Logic Contexts](#7-logic-contexts)
8. [SQL Contexts](#8-sql-contexts)
   - [8.2 Bound Parameter Semantics](#82-bound-parameter-semantics)
   - [8.4 Conditional WHERE — Null-Coalescing Pattern](#84-conditional-where--null-coalescing-pattern)
   - [8.5 Full SQL Support — INSERT/UPDATE/DELETE](#85-full-sql-support--insertupdatedelete)
9. [CSS Contexts](#9-css-contexts)
10. [The `lift` Keyword](#10-the-lift-keyword)
    - [10.5 `lift` Ordering and Async Parallelism](#105-lift-ordering-and-async-parallelism)
    - [10.5.5 Lift Concurrent Detection Algorithm](#1055-lift-concurrent-detection-algorithm)
11. [State Objects and `protect=`](#11-state-objects-and-protect)
12. [Route Inference](#12-route-inference)
13. [Async Model](#13-async-model)
14. [Type System](#14-type-system)
    - [14.4.1 String-to-Enum Coercion — `toEnum()`](#1441-string-to-enum-coercion--toenum)
    - [14.4.2 Enum Iteration — `EnumType.variants`](#1442-enum-iteration--enumtypevariants)
    - [14.8 Database-Schema-Derived Types](#148-database-schema-derived-types)
15. [Component System](#15-component-system)
    - [15.10 Typed Props Declaration Block](#1510-typed-props-declaration-block)
    - [15.11 Callback Props](#1511-callback-props)
    - [15.12 Component Rendering Syntax](#1512-component-rendering-syntax)
16. [Component Slots](#16-component-slots)
17. [Control Flow](#17-control-flow)
18. [Pattern Matching and Enums](#18-pattern-matching-and-enums)
    - [18.16 Literal Match Arms — String, Number, Boolean](#1816-literal-match-arms--string-number-boolean)
19. [Error Handling](#19-error-handling)
20. [Navigation API](#20-navigation-api)
    - [20.3 Route Parameters](#203-route-parameters)
    - [20.4 Session Context](#204-session-context)
21. [Module and Import System](#21-module-and-import-system)
22. [Metaprogramming](#22-metaprogramming)
23. [Foreign Code Contexts (`_{}`)](#23-foreign-code-contexts-)
24. [HTML Spec Awareness](#24-html-spec-awareness)
25. [CSS Variable Syntax](#25-css-variable-syntax)
26. [Tailwind Utility Classes](#26-tailwind-utility-classes)
27. [Comment Syntax](#27-comment-syntax)
28. [Compiler Settings](#28-compiler-settings)
29. [Vanilla File Interop](#29-vanilla-file-interop)
30. [Compile-Time Evaluation — `bun.eval()`](#30-compile-time-evaluation--buneval)
31. [Dependency Graph](#31-dependency-graph)
32. [The `~` Keyword — Implicit Pipeline Accumulator](#32-the--keyword--implicit-pipeline-accumulator)
33. [The `pure` Keyword](#33-the-pure-keyword)
34. [Error Codes](#34-error-codes)
35. [Linear Types — `lin`](#35-linear-types--lin)
36. [Input State Types](#36-input-state-types)
37. [Server-Sent Events](#37-server-sent-events)
38. [WebSocket Channels](#38-websocket-channels)
39. [Schema and Migrations](#39-schema-and-migrations)
40. [Middleware and Request Pipeline](#40-middleware-and-request-pipeline)
41. [Import System — `use`/`import`](#41-import-system--useimport)
42. [`not` — Unified Absence Value](#42-not--the-unified-absence-value)
43. [Nested `<program>`](#43-nested-program)
44. [`?{}` Multi-Database Adaptation](#44--multi-database-adaptation)
45. [Equality Semantics](#45-equality-semantics)
46. [Worker Lifecycle](#46-worker-lifecycle)
47. [Output Name Encoding](#47-output-name-encoding)
48. [The `fn` Keyword — Pure Functions](#48-the-fn-keyword--pure-functions)
49. [`while` Loops, `do...while`, `break`, and `continue`](#49-while-loops-dowhile-break-and-continue)
50. [Assignment as Expression](#50-assignment-as-expression)
51. [State Transition Rules and `< machine>` State Type](#51-state-transition-rules-and--machine-state-type)
52. [State Authority Declarations](#52-state-authority-declarations)
53. [Inline Type Predicates](#53-inline-type-predicates)

---

## 1. Overview

scrml is a compiled language that takes `.scrml` source files and produces HTML, CSS, and JavaScript. The compiler decomposes a single-file source into its constituent output parts and generates all wiring automatically.

### 1.1 Design Principles

- **One file type.** `.scrml` is the only source format. Logic, markup, and style intermingle in a single file. The compiler decomposes them.
- **Progressive detail.** Standard behavior is implicit. A developer spells out specifics only when non-standard behavior is required. Simple things SHALL look simple.
- **Types are the primary unit of work.** A type carries validation rules, rendering intent, and behavioral rules.
- **State is a first-class type.** State implies a side effect: a render update, a database write, or an external API call. A trivial in-memory variable that is rendered to the user MAY be reactive without being a state object. A server-persisted value IS state and SHALL be declared inside a state block.
- **The compiler owns the wiring.** Server functions, routes, fetch calls, serialization, DOM wiring, async scheduling, and reactive dependency tracking are compiler concerns. The developer SHALL NOT write boilerplate for any of these.
- **Exhaustive pattern matching.** Rust-style enums with exhaustive match are a core construct. Rust's verbosity and ownership semantics are NOT adopted.
- **Not modeled after TypeScript.** The scrml type system is an independent design, developed progressively.

### 1.2 Runtime

The scrml compiler SHALL run on Bun. The compiler is a Bun program. Compiled output is plain JavaScript suitable for execution in any JavaScript runtime. The compiler MAY use `bun.eval()`, Bun's SQLite module, and other Bun-specific APIs at compile time. Generated output SHALL NOT contain compile-time-only Bun calls.

---

## 2. File Format and Compilation Model

### 2.1 Source Files

The scrml compiler SHALL recognize `.scrml` files as source input. Plain `.js`, `.html`, and `.css` files are valid alongside `.scrml` files; the compiler processes `.scrml` files and integrates or passes through the rest.

### 2.2 Output

A `.scrml` source file compiles to three output categories:
- HTML markup
- CSS stylesheets
- JavaScript (client-side and server-side route handlers)

The compiler SHALL generate all output from a single `.scrml` source. The developer SHALL NOT manually decompose a `.scrml` file into its output parts.

### 2.3 Entry Point

The compiler is invoked as:

```
bun run src/index.js <file.scrml>
```

### 2.4 Performance Requirement

Compilation speed is a first-class, non-negotiable requirement.

**Hard target:** A 4000-line project SHALL compile from scratch in under 1 second (wall time).

**Normative statements:**

- The compiler SHALL use Bun workers for file-level concurrency. Files SHALL compile concurrently across workers.
- The compiler SHALL use `SharedArrayBuffer` and `Atomics` wherever inter-worker coordination meaningfully impacts throughput. Spin-lock-free coordination is the goal.
- Independent compiler passes SHALL run in parallel where the dependency graph allows.
- Incremental rebuilds SHALL be measurably faster than from-scratch builds.
- This requirement SHALL be treated as a design constraint at every implementation decision. It SHALL NOT be bolted on after initial implementation.

Slow compilers kill adoption. Every architectural choice that trades compilation speed for implementation simplicity SHALL be explicitly justified and tracked.

---

## 3. Context Model

### 3.1 Contexts

scrml source is parsed as a nested stack of contexts. Each context type has distinct syntax rules. The following context types are defined in this specification version:

| Context | Delimiter (open) | Delimiter (close) | Parent context(s) |
|---|---|---|---|
| Markup/State | `<tagname>` / `< statename>` | `</>` or `</tagname>` (closer forms) | Top-level, any markup/state |
| Logic | `${` | `}` | Markup, State |
| SQL | `?{` | `}` | Logic |
| CSS inline | `#{` | `}` | Markup, State |
| Style block | `<style>` | `</style>` or `</>` | Top-level |

Additional context types MAY be added in future versions of this specification.

### 3.2 Context Stack Rules

The compiler SHALL maintain a context stack. Each context type has exactly one valid closer. Using the wrong closer for the current context-type at the top of the stack SHALL be a compile error (E-CTX-001).

The following closer rules SHALL apply:

- A `${ }` logic context closes with `}` and returns to the markup or state context that opened it.
- A `?{ }` SQL context closes with `}` and returns to the logic context that opened it.
- A `#{ }` CSS inline context closes with `}` and returns to the markup or state context that opened it.
- Markup tags and state blocks close with a closer form (see Section 4.4) and return to the enclosing markup, state, or top-level context.
- A `</>` inferred closer or `</tagname>` explicit closer inside a `${ }` logic context SHALL be a compile error (E-CTX-002). Markup/state closers cannot cross context boundaries.
- An unclosed context at end of file SHALL be a compile error (E-CTX-003).
- An unclosed context encountered before an outer closer SHALL be a compile error (E-CTX-003).

### 3.3 Context-Coercion Rules

When a logic context `${ }` exits and the parent context is markup, the value produced by the logic block SHALL be coerced to markup elements. If the yielded type is not coercible to valid markup, this SHALL be a compile error (E-TYPE-010).

When a logic context exits and the parent context is a style context `#{ }`, the compiler expects the yielded type to be `cssClass[]`. If the yielded type is not a CSS class array, this SHALL be a compile error (E-TYPE-011).

When a logic context exits and the parent context is another logic context, no coercion is applied and the result passes through as a plain value.

---

## 4. Block Grammar — Tags, States, and Closer Forms

This section defines the block grammar. The block splitter operates at this level before tokenization of any individual context's contents.

### 4.1 HTML Tag Syntax

An HTML element is introduced by `<` followed IMMEDIATELY by an identifier, with NO whitespace of any kind between `<` and the first character of the identifier.

**Formal rule:**

```
html-open ::= '<' identifier attribute* '>'
```

Where `identifier` begins at the character immediately following `<` with no intervening characters.

**Normative statements:**

- The block splitter SHALL classify any `<` immediately followed by an ASCII letter or underscore (with zero intervening characters) as the start of an HTML element.
- The element name SHALL be the maximal sequence of alphanumeric characters, hyphens, and underscores following `<`.
- The compiler SHALL validate the element name against the built-in HTML element registry (see Section 23). A name that is not a known HTML element and not a defined component SHALL be a compile error (E-MARKUP-001).

**Worked example — valid:**
```scrml
<button onclick=save()>Save</>
```
The `<` is immediately followed by `b`. The block splitter classifies this as an HTML `button` element.

**Worked example — invalid:**
```scrml
< button onclick=save()>Save</>
```
The space between `<` and `button` means this is NOT an HTML element; it is a state object named `button`. If no state named `button` is in scope, this is a compile error (E-STATE-001).

### 4.2 State Object Syntax

A state object is introduced by `<` followed by ANY amount of whitespace (one or more spaces, tabs, or newlines) before the identifier.

**Formal rule:**

```
state-open ::= '<' whitespace+ identifier attribute* '>'
```

Where `whitespace` is any Unicode whitespace character.

**Normative statements:**

- The block splitter SHALL classify any `<` followed by at least one whitespace character before an identifier as the start of a state object.
- The amount and type of whitespace between `<` and the identifier SHALL NOT affect the semantics; all whitespace-separated forms are equivalent.
- A state identifier SHALL match a known state type (e.g., `db`) or a user-declared state name in scope. An unrecognized state identifier SHALL be a compile error (E-STATE-001).
- A state block is a first-class context. Its content is markup context, with the state object's fields and reactive bindings in scope throughout.

**Worked example — valid:**
```scrml
< db src="db.sql" protect="password" tables="users">
    <p>Content here</>
</>
```
The space after `<` signals a state block. The state type is `db`.

**Worked example — valid (tab whitespace):**
```scrml
<	db src="db.sql" tables="users">
    <p>Content</>
</>
```
A tab between `<` and `db` is equally valid. The block splitter classifies this as a state object.

**Worked example — invalid (name collision):**
```scrml
< button>...<</>
```
This is a state object named `button`, not an HTML element. If `button` is not a known state type and not declared as a state variable in scope, this SHALL be a compile error (E-STATE-001).

### 4.3 The Disambiguation Rule

**The single rule that drives the block splitter:**

> If `<` is immediately followed by an identifier character (no whitespace), the block is an HTML element. If `<` is followed by whitespace before the identifier, the block is a state object.

This rule is determined entirely by the character or characters immediately following `<`. No lookahead beyond the first non-`<` character is required to make the HTML-vs-state determination.

This rule SHALL be applied at the block-splitting stage, before any tokenization of attributes or content. The result SHALL be stored as the block type for all downstream passes.

### 4.4 Closer Forms

scrml supports two closer forms for markup tags and state blocks. Both are semantically equivalent and produce the same compiled output. The `verbose closers` compiler setting governs which form appears in error messages and diagnostic output (see Section 28).

#### 4.4.1 Explicit close tag

The conventional `</tagname>` closer form is valid for any markup tag or state block.

**Formal rule:**

```
explicit-close ::= '</' identifier '>'
```

**Normative statements:**

- The explicit closer `</name>` SHALL match the innermost open tag whose name is `name`.
- If the innermost open tag's name does not match, this SHALL be a compile error (E-MARKUP-002).
- An explicit closer for a state block uses `</statename>` where `statename` is the identifier used in the state opener.
- An explicit closer `</name>` SHALL NOT be used inside a `${ }` logic context (E-CTX-002). Markup/state closers cannot cross context boundaries.

**Worked example — valid:**
```scrml
<button onclick=loadLast()>Get last user</button>
```

**Worked example — valid (state block):**
```scrml
< db src="db.sql" tables="users">
    <p>Content</p>
</db>
```

#### 4.4.2 Inferred close tag — `</>`

The `</>` token closes the innermost open tag or state block, regardless of its name.

**Formal rule:**

```
inferred-close ::= '</>'
```

**Normative statements:**

- `</>` SHALL close the innermost open markup tag or state block at the current position in the context stack.
- `</>` SHALL NOT be used inside a `${ }` logic context (E-CTX-002). Markup/state closers cannot cross context boundaries.
- The compiler SHALL know, at the point of `</>`, which block is being closed. This information SHALL be available in diagnostic output.
- When the `verbose closers` setting is enabled (see Section 28), all `</>` forms SHALL be normalized to `</tagname>` form in compiler diagnostic output, error messages, and formatted source output. This normalization is for developer-facing output only and SHALL NOT affect compiled output.

**Worked example — valid:**
```scrml
<button onclick=save()>Save</>
```
`</>` closes the `<button>` element. Equivalent to `<button onclick=save()>Save</button>`.

**Worked example — valid (nested):**
```scrml
< db src="db.sql" tables="users">
    <ul>${
        function loadList() {
            for (name of ?{`SELECT userName FROM users`}.all()) {
                lift <li value=name>;
            }
        }
    }</>
</>
```
The first `</>` closes `<ul>`. The second `</>` closes the `< db>` state block.

**Worked example — error:**
```scrml
${ if (condition) {
    </>
} }
```
`</>` is inside a `${ }` logic context. This SHALL be a compile error (E-CTX-002): cannot use a markup/state closer inside a logic context.

### 4.5 The `verbose closers` Compiler Setting

When the `verbose closers` setting is enabled:

- All `</>` inferred closer forms SHALL appear as `</tagname>` in compiler diagnostic output, error messages, and formatted source output.
- The developer MAY write either `</>` or `</tagname>` in source regardless of this setting.
- This setting affects compiler output only, not compiled output (HTML/JS/CSS).

See Section 28 for the full compiler settings reference.

### 4.6 Rule: `<` Suppression Inside Brace-Delimited Contexts (PA-001)

The block splitter maintains a context stack as it scans source text. When the splitter opens a brace-delimited context — one of `${`, `?{`, `#{`, or `!{` — and has not yet seen the matching `}`, the splitter is said to be in a **brace-delimited context**.

**Normative statements:**

- While the block splitter is inside any brace-delimited context (`${ }`, `?{ }`, `#{ }`, `!{ }`), the `<` character SHALL NOT be recognized as a tag opener or a state opener.
- The disambiguation rule (§4.3) SHALL NOT be evaluated for any `<` character encountered while a brace-delimited context is on the context stack.
- Inside a brace-delimited context, `<` SHALL be treated as a raw character and passed through as part of the block's content without any classification.
- The block splitter SHALL only recognize `<` as a block delimiter at the top-level markup or state context level — that is, when no brace-delimited context is currently open on the context stack.
- The block splitter MUST track brace-delimited context depth correctly. Nested braces within a brace-delimited context (e.g., `if (a < b) { ... }`) SHALL increment and decrement a brace depth counter; only when the depth counter returns to zero does the brace-delimited context close.

**Rationale:** This rule is required because `<` is a valid operator in JavaScript, SQL, and CSS expression syntax, all of which appear inside brace-delimited contexts. Without this rule, comparison expressions such as `if (count < limit)`, generic type parameters, and numeric inequalities inside `${ }` blocks would be misclassified as HTML element or state openers, silently corrupting the block stream.

**Worked example — valid (comparison inside logic context):**
```scrml
${ if (count < limit) { loadMore(); } }
```
The `<` in `count < limit` is inside a `${ }` brace-delimited context. The block splitter SHALL treat it as a raw character. No HTML or state block is opened.

**Worked example — valid (nested braces inside logic context):**
```scrml
${ users.filter(u => u.age < 18).map(u => { return <span>; }) }
```
Wait — the `<span>` here is OUTSIDE any brace-delimited context at the time it is encountered only if the inner `{ }` braces have been balanced. The block splitter SHALL correctly track brace depth: the `{` after `=>` opens a nested brace; the `}` after `return <span>;` closes it; the outer `${ }` then closes. The `<span>` in the example above IS inside brace depth > 0, so it is raw content. This is correct: JSX-like inline markup inside a logic context is not scrml syntax; it would be a compile error at the tokenizer level.

**Worked example — invalid (demonstrates misclassification without this rule):**
```scrml
${ if (items.length < MAX_ITEMS) { lift <li value=item>; } }
```
Without §4.6, the block splitter would see `< MAX_ITEMS` (with a space) and open a state block named `MAX_ITEMS`. With §4.6 applied, `<` is suppressed inside `${ }`. The `lift <li` pattern here starts with `lift` as a keyword followed by `<li` — since `<li` begins at the top-level context after `lift`, not inside a nested brace, the block splitter SHALL classify `<li` as an HTML element opener. (The `lift` keyword is parsed by the tokenizer, not the block splitter.)

---

### 4.7 Rule: `//` Comment Suppression at Block-Splitter Level (PA-002)

scrml defines `//` as the universal single-line comment syntax (§27). The block splitter runs before the tokenizer and must handle `//` independently of per-context tokenizers.

**Normative statements:**

- When the block splitter encounters the two-character sequence `//` while scanning source text, it SHALL immediately suppress all delimiter recognition from that position to the end of the current line (the next `\n` or `\r\n` or end of file).
- This suppression applies at ALL context levels — whether the block splitter is currently at top-level markup context, inside a brace-delimited context, or in any other scanning state.
- During suppression, the characters `<`, `${`, `?{`, `#{`, `!{`, `</>`, `}`, and `</` SHALL all be treated as raw content and SHALL NOT trigger any context-stack transition.
- The `//` sequence itself and all characters through the end of the line SHALL be treated as raw content of the current block.
- This suppression applies ONLY to `//`. The block splitter SHALL NOT handle `<!-- -->` (markup comments) or `/* */` (CSS/JS block comments) — those are concerns of the per-context tokenizers and SHALL NOT be processed at block-splitter level.
- Comment suppression applies even when `//` appears inside a brace-delimited context. Both §4.6 and §4.7 rules are in effect simultaneously; they are not mutually exclusive.

**Rationale:** Without this rule, a commented-out delimiter sequence such as `// < db src="db.sql">` or `// ${` would be scanned by the block splitter and would open a spurious block context, corrupting the block stream and all downstream passes.

**Worked example — valid (commented-out tag):**
```scrml
// < db src="db.sql">
<p>Content</>
```
The block splitter encounters `//` on line 1 and suppresses all delimiter scanning for that line. The `<` and `db` on line 1 are raw content. Line 2 is scanned normally; `<p>` opens an HTML element.

**Worked example — valid (commented-out logic opener):**
```scrml
// ${ let x = 10; }
```
The `${` is suppressed by the `//` comment. No logic context is opened.

**Worked example — invalid (demonstrates corruption without this rule):**
```scrml
// ${ if (a < b) {
    let x = 1;
}
```
Without §4.7, the block splitter opens a logic context at `${` on line 1 (inside the comment), then sees `<` in `a < b` and (without §4.6) would open a state context. With §4.7, the entire first line is suppressed and none of these delimiters are recognized.

---

### 4.9 Rule: Preprocessor Output as Source Text (Phase 0 Issue 1.1)

scrml defines a preprocessor pass that runs before the block splitter (§22). The preprocessor expands macros, resolves compile-time constants, and produces a transformed source string. The block splitter receives this transformed string as its input.

**Normative statements:**

- The preprocessor SHALL produce output that is treated as source text by the block splitter. The block splitter applies its rules — including §4.1 (HTML tag syntax), §4.2 (state object syntax), §4.3 (disambiguation rule), §4.6 (`<` suppression), and §4.7 (`//` comment suppression) — to the expanded text without knowledge of which characters originated from macro expansion and which originated from literal source.
- The block splitter SHALL NOT distinguish between macro-expanded characters and literal source characters. For block-splitting purposes, all input characters are equivalent regardless of origin.
- Macro authors are responsible for ensuring that macro expansions produce syntactically valid scrml at the block-grammar level. A macro expansion that produces an ill-formed block — for example, an unclosed `${` or an unmatched `<` at markup-context level — SHALL cause the block splitter to emit an error, and the error message SHALL reference the block-splitter input span, not the original pre-expansion macro invocation span.
- A macro expansion that collapses whitespace between `<` and an identifier — for example, expanding `OPEN_TAG(div)` to `<div` rather than `< div` — SHALL produce the HTML element interpretation. This is defined behavior, not an error. Macro authors who intend a state object opener MUST ensure their expansion includes at least one whitespace character between `<` and the identifier.
- A macro expansion that introduces whitespace between `<` and an identifier where no whitespace existed in the pre-expansion source — for example, expanding `<db` to `< db` — SHALL produce the state object interpretation. This is defined behavior, not an error. Macro authors who intend an HTML element opener MUST ensure their expansion produces `<` immediately followed by the identifier with no intervening whitespace.
- The compiler SHOULD emit a warning (W-MACRO-001) when a macro expansion alters the block type at a `<` boundary — that is, when the pre-expansion character sequence would have produced one block type and the post-expansion sequence produces a different block type. This warning is informational; it does not prevent compilation.

**Rationale:** The preprocessor runs as a text transformation pass. Requiring the preprocessor to be aware of block grammar, or requiring it to preserve whitespace context around all `<` boundaries, would couple the preprocessor implementation to the block splitter grammar. Instead, the rule establishes that the preprocessor's output is the ground truth that the block splitter consumes. The cost is that macro authors must reason about the block-grammar consequences of their expansions. The compiler warning W-MACRO-001 mitigates the discovery cost of unintentional block-type changes.

**Worked example — defined behavior (whitespace collapse produces tag):**

Suppose a macro `INLINE(name)` expands to `<${name}>` (a hypothetical macro syntax that substitutes `name`). If `name` is `div`, the expansion is `<div>` — `<` immediately followed by `d`, which is an HTML element opener. This is the tag interpretation. This is defined behavior.

**Worked example — defined behavior (whitespace insertion produces state):**

Suppose a macro `STATE(name)` expands to `< ${name}>`. If `name` is `db`, the expansion is `< db>` — `<` followed by a space, which is a state opener. This is the state interpretation. This is defined behavior.

**Worked example — warning case:**

Pre-expansion source contains `<db src="db.sql">`. A macro substitution replaces `db` with a value that includes a leading space, producing `< db src="db.sql">` in the expanded output. The pre-expansion sequence would have been classified as an HTML element opener; the post-expansion sequence is classified as a state opener. The compiler SHALL emit W-MACRO-001 identifying the `<` position in the expanded text and the block-type change.

### 4.10 Rule: Newline Before Tag Identifier

**Added:** 2026-03-25 — resolves Phase 0 Design Review Issue 1.2.

A newline between `<` and an identifier is whitespace per §4.3. The block is classified as a state object, not an HTML element. No multiline HTML element opening syntax exists in scrml. Attribute lists may still span multiple lines as long as `<` is immediately followed by the identifier (no whitespace). E-STATE-001 diagnostics SHOULD hint when the identifier is a known HTML element name.

**Normative statements:**

- A newline between `<` and an identifier SHALL cause the block to be classified as a state object per §4.3.
- No multiline HTML element opening syntax SHALL exist. `<` MUST be immediately followed by the identifier to produce an HTML element.
- Attribute lists after the tag identifier MAY span multiple lines. The multiline restriction applies only to the `<` + identifier boundary.
- When an E-STATE-001 error fires because the identifier is a known HTML element name (e.g., `< div`), the compiler SHOULD include a hint in the diagnostic: "Did you mean `<div>` (no space after `<`)?"

### 4.11 Canonical Keywords

**Added:** 2026-03-25 — resolves Phase 0 Design Review Issue 1.3.

#### 4.11.1 `lift` is the Canonical Keyword

`lift` is the single canonical keyword for emitting values from a logic context to a parent context (§10). The keyword `extract` is NOT valid. Any use of `extract` in a position where `lift` is expected SHALL be a compile error (E-SYNTAX-003).

**Normative statements:**

- `lift` SHALL be the only keyword recognized by the compiler for the value-emission operation defined in §10.
- `extract` SHALL NOT be a valid keyword. Any occurrence of `extract` in `lift` keyword position SHALL be a compile error (E-SYNTAX-003).
- All canonical documents, examples, and diagnostic messages SHALL use `lift`.

#### 4.11.2 `?{` is the Canonical SQL Context Sigil

`?{` is the canonical sigil for opening a SQL context (§8). `!{` is the error context sigil (§19). Using `!{` where SQL is intended is a semantic error (wrong type), not a special sigil error.

**Normative statements:**

- `?{` SHALL be the only sigil recognized by the compiler for SQL context opening.
- `!{` SHALL be recognized only as the error context sigil (§19).
- Using `!{` in a position where `?{` is intended produces a type error (the `!{` block returns an error handler, not a SQL result). The compiler SHALL NOT emit a special "wrong sigil" diagnostic; the normal type system will flag the mismatch.

#### 4.11.3 `is` Keyword

`is` is a context-sensitive keyword valid in two positions:
1. As the variant-check operator in a boolean expression: `expression is .VariantName`
2. In a `when` guard: `when expression is .VariantName { ... }`

In all other contexts, `is` is a valid identifier.

**Normative statements:**

- `is` SHALL be recognized as a keyword in variant-check position: between an expression
  and a `.VariantName` shorthand.
- `is` SHALL be recognized as a keyword in `when` guard position.
- In all other syntactic positions, `is` SHALL be treated as a valid identifier.
- The parser SHALL disambiguate `is` by context: after an expression that has an enum type,
  `is` begins a variant check. Elsewhere, it is an identifier.

#### 4.11.4 `given` Keyword — Static-Predicate Guard

**Added:** 2026-04-17 — ratified by radical-doubt debate (see
`scrml-support/design-insights.md`, "Machine cohesion: opener + guard keyword").

`given` is the guard keyword used inside `< machine>` rule bodies (§51.3.2). It is
**semantically distinct** from the runtime-Boolean `if` keyword used in markup `if=`
attributes (§17.1), logic `if (cond) { ... }` control flow, and `else-if=`. The
distinction is intentional and load-bearing:

- `if` denotes a **runtime branch**. The compiler does not, and is not expected to,
  statically reason about the satisfiability, reachability, or exhaustiveness of `if`
  conditions.
- `given` denotes a **rule predicate** on a machine transition. The compiler reserves
  the right to statically analyze `given` clauses for: reachability of machine states,
  unsatisfiability of guards, totality-with-guards over the source enum, and transition
  safety proofs. This preserves the scrml commitment (ratified 2026-04-08, see
  design-insights.md §machine/contract unification) to static analysis in the
  `E-MACHINE-*` family, which is what separates machines from the runtime-`if`
  vocabulary.

`given` SHALL NOT be used outside machine rule bodies. `if` SHALL NOT be used as a rule
predicate inside a machine body.

**Normative statements:**

- `given` SHALL be recognized as the keyword introducing a guard clause on a machine
  transition rule (§51.3.2). It SHALL take the form `given (expression)` with required
  parentheses.
- `given` SHALL NOT be recognized as a keyword in any other syntactic position. In all
  other contexts, `given` SHALL be a valid identifier.
- `if` SHALL NOT be recognized as a guard-clause keyword inside a machine rule body.
  Using `if` in machine rule guard position SHALL be a compile error (E-SYNTAX-004:
  `Use 'given (...)' for machine rule guards, not 'if'. See §4.11.4.`).
- The semantic distinction between `given` (static-predicate) and `if` (runtime branch)
  reserves the compile-time-analysis lane for machine guards. Future work on
  machine-level static analysis (reachability, unsatisfiability, totality) operates on
  `given` clauses.

### 4.12 Nested `<program>` Elements

A `<program>` element MAY appear as a direct child of another `<program>` element. Each
nested `<program>` creates a new, independent execution context boundary. Nesting `<program>`
is the primary mechanism for declaring inline workers, foreign language sidecars, WASM
modules, and scoped database contexts.

This design principle is **colocation**: workers, sidecars, and database scopes declared
adjacent to the code that uses them, in the same file, rather than in separate files.

#### 4.12.1 Shared-Nothing Scope Isolation

A nested `<program>` is a completely isolated compilation unit. It does NOT inherit any
lexical bindings from its parent `<program>`. Specifically:

- `const`, `let`, and `@reactive` variables declared in the parent are NOT accessible in the
  nested `<program>`.
- Types declared in the parent (`type Foo:struct`, `type Bar:enum`) are NOT automatically in
  scope in the nested `<program>`.
- `use` declarations from the parent do NOT propagate to the nested `<program>`.
- `?{}` SQL contexts in the nested `<program>` are governed by the nested `<program>`'s own
  `db=` attribute, not the parent's.

A nested `<program>` MUST declare its own `use` and `import` statements. If it needs types
from a shared module, it MUST import them explicitly.

**Normative statements:**

- A nested `<program>` SHALL be a separate compilation unit. The compiler SHALL compile
  nested `<program>` elements independently.
- No lexical binding, reactive variable, or type declaration from the parent `<program>`
  SHALL be accessible inside a nested `<program>`.
- A nested `<program>` SHALL declare its own `use` declarations independently. `use`
  declarations from the parent SHALL NOT propagate to any nested `<program>`.
- A `<program>` nested inside another `<program>` SHALL be subject to the same grammar rules
  as a top-level `<program>` (§4.1, §4.2, §4.3, §4.11).

#### 4.12.2 Nested `<program>` Attributes

The following `<program>` attributes are valid in nested positions:

| Attribute | Valid in nested? | Semantics |
|-----------|-----------------|-----------|
| `name=`   | YES | Assigns an identifier to the nested program for parent-side reference |
| `lang=`   | YES | Declares the foreign language toolchain for `_{}` blocks in this scope |
| `db=`     | YES | Scopes `?{}` to the declared database; overrides parent `db=` for this subtree |
| `mode=`   | YES | `"wasm"` for client-side WASM modules; omitted for sidecar processes |
| `build=`  | YES | Build command string for the external toolchain |
| `port=`   | YES | Port number for sidecar HTTP/socket communication |
| `health=` | YES | Health-check endpoint path for sidecar processes |
| `route=`  | YES | Declares the nested program as a server endpoint at the given route |
| `protect=` | YES | Declares protected field names for data isolation |
| `callchar=` | YES | Maps a single character to this nested program for call-char sigils (§23.3) |

The top-level `<program>` MUST NOT have a `name=` attribute (it is the implicit root).
Nested `<program>` elements SHOULD have a `name=` attribute for reference and diagnostics;
an unnamed nested `<program>` generates a compiler-assigned identifier (W-PROGRAM-001).

#### 4.12.3 Execution Context Types

Nested `<program>` covers four distinct execution context types determined by attribute
combination:

| Type | Attributes | Runtime model |
|------|-----------|---------------|
| Inline web worker | `name=`, no `lang=` | `new Worker()`, postMessage IPC |
| Foreign language sidecar | `name=`, `lang=` (non-WASM language) | Subprocess with HTTP/socket |
| WASM compute module | `name=`, `lang=`, `mode="wasm"` | `WebAssembly.instantiate()` |
| Scoped DB context | `name=` (optional), `db=` | New `?{}` driver scope |

#### 4.12.4 Inline Worker (Colocation Pattern)

A nested `<program>` with no `lang=` attribute is an inline web worker declaration. The
compiler generates a `Worker` instantiation and postMessage-based IPC. The nested program is
compiled as a separate worker bundle.

```scrml
<program db="./app.db">

@result = not
@loading = false

<program name="heavyCompute">
    // Separate compilation unit — no parent scope access
    ${ type ComputeResult:struct = { value: number, iterations: number } }

    ${ function compute(data) {
        let sum = 0
        for (let i = 0; i < data.length; i++) { sum += data[i] * data[i] }
        return { value: sum, iterations: data.length }
    } }

    when message(data) {
        let result = compute(data)
        send(result)
    }
</>

${ function runCompute() {
    @loading = true
    // <#name>.send() returns a Promise resolving to the worker's response
    @result = <#heavyCompute>.send([1, 2, 3, 4, 5])
    @loading = false
} }

<button onclick=runCompute()>Compute</>
<p>${@loading ? "Computing..." : @result?.value}</>

</>
```

**`when message(data) { ... }`** is a lifecycle hook valid inside worker `<program>` elements.
It fires when the worker receives a postMessage. `send(value)` posts a reply to the parent.

**`<#name>.send(value)`** in the parent calls the worker and returns a Promise.

#### 4.12.5 Foreign Language Sidecar (Colocation Pattern)

A nested `<program>` with `lang=` and no `mode="wasm"` is a sidecar process declaration.
The compiler generates process lifecycle management code and an HTTP/socket client in the
parent's compiled output.

```scrml
<program db="./app.db">

<program name="ml" lang="go"
    build="go build -o ./bin/ml ./cmd/ml"
    port=9001
    health="/health">

    // Interface declared in scrml types — compiler generates marshaling
    ${ type PredictionRequest:struct = { features: number[], modelId: string } }
    ${ type PredictionResult:struct = { prediction: number, confidence: number } }

    ${ export function predict(req: PredictionRequest) -> PredictionResult }
</>

use foreign:ml { predict }

${ server function getPrediction(features, modelId) {
    return predict({ features, modelId })
} }

</>
```

#### 4.12.6 Database-Scoped Context

A nested `<program>` with `db=` creates a new database driver scope. `?{}` blocks inside
the nested `<program>` resolve to that database, not the parent's. This enables multi-database
applications with clear scope boundaries.

```scrml
<program db="sqlite:./primary.db">

<program db="postgres://analytics:5432/metrics">
    ${ server function getMetrics(period) {
        return ?{`SELECT * FROM daily_metrics WHERE period = ${period}`}.all()
    } }
</>

${ server function getUser(id) {
    return ?{`SELECT * FROM users WHERE id = ${id}`}.get()
} }

</>
```

`getUser` uses bun:sqlite (the outer `db=`). `getMetrics` uses the postgres driver (the
inner `db=`).

#### 4.12.7 Nesting Depth

Nesting depth is NOT bounded. `<program>` elements MAY be nested arbitrarily. The compiler
SHALL process each nested level as an independent compilation unit. Circular nesting (a
`<program>` that is a descendant of itself) SHALL be a compile error (E-PROGRAM-001: circular
`<program>` nesting detected).

#### 4.12.8 Communication Between Nested Programs

Parent and nested programs communicate exclusively through message-passing interfaces. There
is no shared memory, no shared reactive state, and no shared scope. The specific communication
mechanism depends on the execution context type:

| Context type | Parent-to-child | Child-to-parent |
|---|---|---|
| Web worker | `<#name>.send(value)` | `send(value)` in `when message` handler |
| Sidecar | `use foreign:name { fn }` call | Return value of the function call |
| WASM module | `callchar{ fn(args) }` (§23.3) | Return value of the WASM call |
| DB scope | Calls cross-boundary via `use foreign:` or server functions | N/A (DB scope is stateless) |

**Normative statements:**

- A nested `<program>` SHALL NOT access any variable, reactive state, or type from its parent
  `<program>`'s scope directly.
- All data flow between nested programs SHALL pass through declared message-passing interfaces.
- The compiler SHALL extract each nested `<program>` as an independent compilation unit before
  running any analysis pass on its contents.
- A nested `<program>` with neither `name=` nor `lang=` nor `db=` SHALL emit a warning
  (W-PROGRAM-001: unnamed nested `<program>` with no distinguishing attributes; assign a
  `name=` for clarity).

#### 4.12.9 Error Conditions

| Code | Trigger | Severity |
|------|---------|---------|
| E-PROGRAM-001 | Circular `<program>` nesting (a `<program>` is a descendant of itself) | Error |
| W-PROGRAM-001 | Nested `<program>` has no `name=` attribute | Warning |

### 4.13 Rule: `angleDepth` Tracking in Expression Attribute Value Scanning (PA-005)

**Added:** 2026-04-04 — resolves snippet/slot OQ-2 (BS markup lambda parsing).

The block splitter scans expression attribute values (delimited by `{` and `}`) using a
brace-depth counter. However, if the attribute value contains a markup lambda — an expression
of the form `(param) => <tag>...</tag>` — the `>` that closes the inner tag can be
misidentified as the closing `>` of the outer attribute. To prevent this, the block splitter
SHALL maintain an `angleDepth` counter during expression attribute value scans.

**Formal algorithm: `advanceAttrValue(src, start)`**

```
advanceAttrValue(src, start):
  i = start + 1   // skip opening {
  braceDepth = 1
  angleDepth = 0

  while i < src.length and braceDepth > 0:
    ch = src[i]

    if ch == '{':
      braceDepth++

    else if ch == '}':
      braceDepth--

    else if ch == '<' and angleDepth >= 0:
      next = src[i + 1]
      if next matches /[a-zA-Z\/]/:
        angleDepth++

    else if ch == '>' and angleDepth > 0:
      angleDepth--
      // this '>' closes a tracked inner tag; NOT an outer tag boundary

    i++

  return i   // character after closing '}'
```

**Normative statements:**

- The block splitter SHALL track `angleDepth` during every expression attribute value scan.
  `angleDepth` is initialised to zero at the start of each attribute value.
- When the block splitter encounters `<` followed immediately by a letter (`[a-zA-Z]`) or
  `/` while scanning inside an expression attribute value, it SHALL increment `angleDepth`.
- When the block splitter encounters `>` while `angleDepth > 0`, it SHALL decrement
  `angleDepth`. This `>` SHALL NOT be treated as a tag boundary for the outer attribute scan.
- A `>` encountered while `angleDepth == 0` is not affected by this rule.
- A `<` not followed immediately by a letter or `/` (e.g., comparison `a < 5`) SHALL NOT
  increment `angleDepth`.
- This rule applies independently of and in addition to §4.6 (`<` suppression).
- No new AST node kind is required. TAB receives the full raw content of the expression
  attribute value as a single `ExprAttrValue`.

**Worked example — markup lambda inside attribute value:**

```scrml
<TabStrip
    tabs=@myTabs
    tabPanel={ (tab) => <article><h2>${tab.label}/<p>${tab.body}// }
/>
```

BS enters the `tabPanel` attribute value at `{`. It scans:
- `(tab) => ` — raw characters, `braceDepth = 1`, `angleDepth = 0`.
- `<article` — `<` followed by letter; `angleDepth` → 1.
- `>` after `<article` — `angleDepth > 0`; decrements to 0. NOT an outer tag boundary.
- Continues scanning `<h2>`, `<p>`, closers.
- `}` with `braceDepth = 1` — decrements to 0. Attribute value ends.

TAB receives the entire lambda as a single `ExprAttrValue`.

---

## 5. Attribute Quoting Semantics

### 5.1 The Three Attribute Forms

scrml attributes follow a three-way distinction based on quoting:

| Form | Example | Meaning |
|---|---|---|
| Quoted string | `attr="value"` | Static string literal. Value is fixed at compile time. |
| Unquoted identifier | `attr=name` | Variable or scope reference. Value is resolved at runtime from the current scope. |
| Unquoted call | `attr=fn()` | Logic invocation. Wired as an event listener or called at the expression site. |

### 5.2 Normative Rules

- `attr="value"` SHALL produce a static attribute with the literal string `value`. The compiler SHALL NOT interpret the string contents as an expression.
- `attr=name` SHALL resolve `name` as an identifier in the current scope at the point of use. The compiler SHALL emit code that passes the runtime value of `name` as the attribute value.
- `attr=fn()` on an event attribute (e.g., `onclick`, `onsubmit`, `onchange`) SHALL wire `fn` as an event listener for that event. The compiler wraps the call in a closure: `function(event) { fn(...args); }`. Arguments in the parentheses are forwarded to `fn` as-is. The native event object is NOT passed to `fn` — it is available only inside the wrapper closure. To access the event object, use a logic context wrapper: `onclick=${(event) => fn(event, arg)}`.
- `attr=fn()` on a non-event attribute SHALL be a compile error (E-ATTR-001) unless `fn` returns a value compatible with the attribute's expected type.
- The compiler SHALL validate unquoted identifiers against the current scope. An unquoted identifier that cannot be resolved SHALL be a compile error (E-SCOPE-001).

### 5.2.1 Event Handler Argument Passing

Event handler attributes support two equivalent forms for passing arguments:

1. **Call-ref form:** `onclick=handler(arg)` — the compiler auto-wraps the call in a
   closure: `function(event) { handler(arg); }`. Arguments are forwarded to the handler
   as-is. This does NOT invoke the function immediately at render time.

2. **Expression form:** `onclick=${() => handler(arg)}` — the `${...}` expression is
   used directly as the event handler. This form is useful when you need access to the
   event object, complex expressions, or closure captures (e.g., inside loops).

Both forms are valid. The expression form is required when:
- You need the event object: `onclick=${(e) => handler(e, arg)}`
- You need closure capture in a loop: `onclick=${() => deleteItem(item.id)}`
- The handler is a complex expression: `onclick=${() => { validate(); save(); }}`

**Normative statements:**

- `onclick=handler(arg)` on an event attribute SHALL be auto-wrapped by the compiler
  as `function(event) { handler(arg); }`. The function is NOT invoked at render time.
- `onclick=${expr}` on an event attribute SHALL use the `${...}` expression directly
  as the event handler, with `@var` references rewritten to reactive getters.
- `onclick=handler` (no parentheses, no arguments) is valid and wires `handler` directly
  as the event listener.
- `onclick=handler()` (parentheses, no arguments) follows the `attr=fn()` event wiring
  rule in §5.2.

**Worked example — expression form with closure capture (valid):**

```scrml
@items = [{ id: 1, name: "Alpha" }, { id: 2, name: "Beta" }]
${ server function deleteItem(id) {
    ?{`DELETE FROM items WHERE id = ${id}`}.run()
} }

<ul>${
    for (item of @items) {
        lift <li>
            ${item.name}
            <button onclick=${() => deleteItem(item.id)}>Delete</>
        </>;
    }
}</>
```

The `onclick=${() => deleteItem(item.id)}` wrapper creates a closure that captures
`item.id` and calls `deleteItem` only when the button is clicked.

**Worked example — call-ref form (also valid):**

```scrml
<button onclick=deleteItem(id)>Delete</>
```

The compiler auto-wraps this as `function(event) { deleteItem(id); }`, which is
equivalent to the expression form for simple cases.

#### 5.2.2 Event Handler Binding Forms — Complete Reference

**Added:** 2026-04-10 — DQ-4 normative summary.

All valid event handler binding forms:

| Form | Meaning | When to use |
|---|---|---|
| `onclick=fn()` | Auto-wrapped as `function(event){ fn(); }`. `fn` called on click, not at render. | Simple handler, no args |
| `onclick=fn(literal)` | Auto-wrapped as `function(event){ fn(literal); }`. Literal args forwarded at click time. | Literal (non-computed) arguments |
| `onclick=${fn(expr)}` | `${}` expression used as-is as the event handler. `expr` evaluated at click time. | Computed arguments, closure capture |
| `onclick=${(e) => fn(e, arg)}` | Full closure with access to the event object. | Needs `event` object or multiple statements |
| `onclick=handler` | `handler` wired directly as listener (no auto-wrap). | Pass handler reference directly |

**Normative statements (DQ-4):**

- `onclick=fn()` SHALL wire `fn` as a click handler. The compiler MUST auto-wrap the call as `function(event) { fn(); }`. `fn` is NOT invoked at render time.
- `onclick=fn(literal)` SHALL pass `literal` as an argument to `fn` at click time, not at render time.
- `onclick=${fn(expr)}` SHALL use the `${}` expression directly as the event handler. `expr` is evaluated inside the handler (at click time), not at render time.
- `onclick=handler` (no parentheses) SHALL wire `handler` directly as the event listener without wrapping.
- Use `onclick=${() => fn(item.id)}` (expression form) when inside a loop and closure capture is needed — `onclick=fn(item.id)` does not capture `item.id` per-iteration.

### 5.3 Boolean HTML Attributes

The compiler has full knowledge of which HTML attributes are boolean attributes (e.g., `disabled`, `checked`, `readonly`, `required`, `selected`, `multiple`, `open`, `hidden`).

- For a known boolean attribute with an unquoted variable reference (e.g., `disabled=submitting`), the compiler SHALL emit a property assignment (`element.disabled = submitting`) rather than a `setAttribute` call.
- Emitting `setAttribute("disabled", submitting)` for a boolean attribute SHALL be a compiler defect. The compiler SHALL never produce this output for a known boolean attribute.
- `disabled="true"` (quoted string) on a boolean attribute SHALL be a compile error (E-ATTR-002). The correct form is `disabled=expr` with an unquoted boolean expression.

**Worked example — valid:**
```scrml
<button disabled=submitting>Submit</>
```
Compiles to: `buttonEl.disabled = submitting`

**Worked example — invalid:**
```scrml
<button disabled="true">Submit</>
```
Error E-ATTR-002: Boolean attribute `disabled` must be assigned a boolean expression, not a string literal.

### 5.4 Two-Way Binding — The `bind:` Prefix

A `bind:` prefix on an attribute creates a two-way binding between an
input element and a reactive variable. It is syntactic sugar that the
compiler expands to both a value attribute and an `oninput` event handler.

**Syntax:**

```
bind-attr ::= 'bind:' attribute-name '=' '@' identifier ('.' identifier)*
```

**Supported forms:**

| Source form | Compiler expands to |
|---|---|
| `bind:value=@var` | `value=@var oninput=${@var = event.target.value}` |
| `bind:checked=@var` | `checked=@var onchange=${@var = event.target.checked}` |
| `bind:selected=@var` | `selected=@var onchange=${@var = event.target.value}` |
| `bind:group=@var` | Radio group binding: `checked=${@var === value} onchange=${@var = event.target.value}` |

**Normative statements:**

- `bind:value=@var` SHALL be valid on `<input>`, `<textarea>`, and `<select>` elements.
- `bind:checked=@var` SHALL be valid on `<input type="checkbox">` elements.
- `bind:selected=@var` SHALL be valid on `<select>` elements as an alternative to `bind:value`.
- `bind:group=@var` SHALL be valid on `<input type="radio">` elements. It binds a shared reactive variable to a radio group; the variable holds the `value` attribute of the currently selected radio.
- The right-hand side of a `bind:` attribute SHALL be an `@`-prefixed reactive
  variable. Using a plain (non-reactive) variable as the target of `bind:` SHALL
  be a compile error (E-ATTR-010).
- The compiler SHALL generate both (a) the value/checked attribute wired to the
  reactive variable and (b) the corresponding `oninput`/`onchange` handler that
  writes back to the reactive variable.
- `bind:` is valid only on the supported attribute names listed above. A `bind:`
  prefix on any other attribute name SHALL be a compile error (E-ATTR-011).
- The compiler SHALL NOT require the developer to write the event handler manually
  when `bind:` is used. Writing both `bind:value=@x` and an explicit `oninput=`
  handler on the same element SHALL be a compile error (E-ATTR-012: conflicting
  binding and event handler).
- When `bind:value` is used on a `<select>` element and the bound `@variable` is declared
  with an inferrable type that is not `string`, the compiler SHALL emit a type coercion
  in the generated `onchange` handler. The coercions are:
    - `number` (or any numeric refinement type): `Number(event.target.value)`
    - `boolean`: `event.target.value === "true"`
    - `enum`: `(EnumTypeName_toEnum[event.target.value] ?? event.target.value)` — where
      `EnumTypeName_toEnum` is the compiler-generated lookup table for the enum type (§14.4.1).
      The `?? event.target.value` fallback preserves the raw string if no variant matches.
    - `string` (or unknown/unannotated): no coercion; `event.target.value` is used as-is.
  The coercion is applied only at the write-back site (the generated `onchange` handler).
  The `value=` attribute binding (reading from `@variable` to the DOM) is unaffected;
  scrml's attribute rendering coerces the reactive variable to string for the DOM
  regardless of its declared type.
- A programmatic write to a `@variable` that is the target of a `bind:value` or
  `bind:checked` binding SHALL propagate to the bound DOM element through the reactive
  system. No separate bidirectional-sync mechanism exists or is required. The compiler
  desugars `bind:value=@var` to `value=@var oninput=${@var = event.target.value}`. The
  `value=@var` part is a reactive attribute expression: whenever `@var` is written — whether
  by the generated `oninput` handler (user input) or by any programmatic assignment in
  logic code — the reactive system re-evaluates `value=@var` and updates the DOM element's
  `value` property. Both directions of data flow traverse the same reactive write path.

**Worked example — valid:**

```scrml
@name = ""
<input bind:value=@name>
<p>Hello, ${@name}!</>
```

The compiler generates: `<input value=@name oninput=${@name = event.target.value}>`.
Typing in the input updates `@name` reactively. The `<p>` re-renders on each change.

**Worked example — valid (checkbox):**

```scrml
@agreed = false
<input type="checkbox" bind:checked=@agreed>
<button disabled=@agreed if=@agreed>Proceed</>
```

**Worked example — valid (radio group):**

```scrml
@color = "red"
<input type="radio" name="color" value="red" bind:group=@color>
<input type="radio" name="color" value="blue" bind:group=@color>
<input type="radio" name="color" value="green" bind:group=@color>
<p>Selected: ${@color}</>
```

**Worked example — invalid (plain variable):**

```scrml
let name = ""
<input bind:value=name>
```

Error E-ATTR-010: `bind:` requires a reactive `@` variable. `name` is not reactive.
Use `@name` or change `bind:value` to `value=name`.

**Error codes:**

| Code | Trigger | Severity |
|---|---|---|
| E-ATTR-010 | `bind:` target is not an `@` reactive variable | Error |
| E-ATTR-011 | `bind:` used on an unsupported attribute name | Error |
| E-ATTR-012 | `bind:` and an explicit event handler for the same event on the same element | Error |

### 5.5 Dynamic Class Binding

scrml provides three forms for binding CSS classes to elements. Static classes are string
literals. Conditional classes use the `class:` prefix directive. Dynamic class interpolation
uses template literal syntax inside a quoted string.

#### 5.5.1 Static Class

```scrml
<div class="card active">content</>
```

- `class="value"` SHALL produce a static `class` attribute on the compiled element.
- The value is fixed at compile time.
- Multiple space-separated class names are treated as a single static string by the compiler.
- This form is the attribute quoting model described in §5.1 — it is included here for
  completeness alongside the dynamic forms.

#### 5.5.2 Conditional Class — `class:name=expr`

The `class:` prefix directive conditionally applies a single named class based on a boolean
expression. The expression is evaluated at mount time and re-evaluated whenever any reactive
variable it references changes.

**Syntax:**

```
class-directive ::= 'class:' class-name '=' class-expr
class-name       ::= [a-zA-Z][a-zA-Z0-9_-]*
class-expr       ::= '@' identifier             // reactive variable
                   | identifier '.' identifier  // property access (obj.prop)
                   | '(' expression ')'         // parenthesized boolean expression
                   | identifier '(' args ')'    // function call
```

**Example:**

```scrml
@isActive = false
<button class:active=@isActive onclick=toggle()>Toggle</>
```

When `@isActive` is `true`, the element's `active` class is present. When `@isActive` is
`false`, the class is absent. Changes to `@isActive` update the class immediately with no
full re-render.

**Normative statements:**

- `class:name=expr` SHALL be valid on any HTML element and any component root element.
- The right-hand side SHALL be any of: an `@`-prefixed reactive variable, a property access
  expression (`obj.prop`), a parenthesized boolean expression (`(a == b)`), or a function call
  (`fn()`). A plain unqualified bare identifier (no `@`, no dot) SHALL be a compile error
  (E-ATTR-013). A string literal SHALL be a compile error (E-ATTR-013).
- When the right-hand side is an `@`-prefixed reactive variable, the compiler SHALL subscribe
  to that variable and call `classList.toggle(name, !!value)` on every change.
- When the right-hand side is a property access (`obj.prop`), the compiler SHALL subscribe
  to the root reactive variable (`obj`) and project the path on each update.
- When the right-hand side is a parenthesized expression, the compiler SHALL subscribe to
  each `@variable` referenced in the expression and re-evaluate on any change.
- When the right-hand side is a function call, the compiler SHALL call the function at mount
  time and re-evaluate on any reactive variable change detected in the call arguments.
- The compiler SHALL emit client-side wiring that calls `classList.toggle(name, !!condition)`
  on the target element when any dependency changes.
- The class named in the directive SHALL be applied on initial mount if the expression is
  truthy at mount time. It SHALL be absent on initial mount if the expression is falsy.
- Multiple `class:` directives MAY appear on the same element. Each is independent.
- `class:` directives and a static `class=` attribute MAY coexist on the same element.
  The static class is always present; each `class:` directive independently adds or removes
  its named class. The compiler SHALL NOT treat this as a conflict.
- A `class:` attribute is NOT emitted as a literal HTML attribute. The compiler substitutes
  a `data-scrml-class-name` marker attribute that client-side wiring uses as a querySelector
  anchor. The `class:` form does NOT appear in the HTML output.
- The Tailwind scanner SHALL treat class names in `class:` directives as used class names.
  If a class name in a `class:` directive matches a Tailwind utility, the compiler SHALL
  include that utility's CSS rule in the output.
- Component-scoped CSS (§24.6) applies to class names in `class:` directives that match
  class names defined in the enclosing component's style block. The compiler hashes those
  names consistently across `class:` directives and `class=` attributes.

**Worked example — multiple conditional classes:**

```scrml
@loading = false
@hasError = false

<div class="status" class:loading=@loading class:error=@hasError>
    ${@loading ? "Loading..." : @hasError ? "Error" : "OK"}</>
</>
```

The `status` class is always present. The `loading` and `error` classes toggle independently.

**Worked example — combined with bind:checked:**

```scrml
@agreed = false
<label class:agreed=@agreed>
    <input type="checkbox" bind:checked=@agreed>
    I agree to the terms
</>
```

**Worked example — property access expression:**

```scrml
@todo = { completed: false, text: "Buy milk" }
<li class:done=todo.completed>${@todo.text}</>
```

`class:done=todo.completed` subscribes to `@todo` and projects `.completed` on each update.

**Worked example — parenthesized expression:**

```scrml
@index = 0
@selectedIndex = 2

<ul>
    // for each item...
    <li class:active=(index == selectedIndex)>${item.label}</>
</>
```

**Error codes:**

| Code | Trigger | Severity |
|---|---|---|
| E-ATTR-013 | `class:` directive right-hand side is a bare identifier (no `@`, no dot), a string literal, or has no value | Error |

#### 5.5.3 Template Literal Class Interpolation

A `class` attribute value containing `${...}` interpolations is treated as a dynamic
template literal. The compiler evaluates the static parts at compile time and wires the
dynamic parts reactively at runtime.

**Syntax:**

```
class="<static-prefix>${<expression>}<static-suffix>"
```

**Example:**

```scrml
@status = "active"
<div class="item-${@status}">content</>
```

This emits `<div class="">` initially, with `data-scrml-attr-tpl-class` as a querySelector
anchor. On mount, client-side wiring evaluates the template literal and sets the full class
string. When `@status` changes, the class is re-evaluated and `setAttribute("class", ...)` is
called.

**Normative statements:**

- A `class` attribute value containing at least one `${...}` interpolation SHALL be compiled
  as a template literal attribute, not as a static string.
- The `${...}` interpolation inside a quoted attribute value SHALL be recognized by the
  compiler when the delimiters are `${` and `}`.
- Reactive variables referenced as `${@varName}` inside the template literal SHALL each
  subscribe to changes. Any change to any referenced `@variable` SHALL re-evaluate the
  full template and call `setAttribute("class", newValue)` on the element.
- Non-reactive expressions referenced as `${expr}` (without `@`) inside the template literal
  SHALL be evaluated once at mount time and do NOT subscribe to changes.
- Multiple `${...}` interpolations in a single `class` attribute are supported. Each
  reactive variable in any interpolation produces an independent reactive subscription.
- Template literal class interpolation and `class:` directives MAY coexist on the same
  element. The two mechanisms are independent. The template literal controls the full class
  string; the `class:` directives toggle individual classes.

**Worked example — prefix and reactive suffix:**

```scrml
@theme = "dark"
<div class="card card-${@theme}">content</>
```

Renders `class="card card-dark"` initially. Changing `@theme` to `"light"` updates to
`class="card card-light"` without re-rendering the element.

**Worked example — multiple reactive parts:**

```scrml
@size = "md"
@variant = "primary"
<button class="btn btn-${@size} btn-${@variant}">Click</>
```

Any change to `@size` or `@variant` updates the full class string.

#### 5.5.4 Dynamic Class Expression — `class={expression}` (Planned)

A braced expression as the `class` attribute value computes the entire class string from
an arbitrary JavaScript expression.

**Syntax:**

```
class-expr ::= 'class=' '{' js-expression '}'
```

**Example:**

```scrml
@isActive = false
@hasError = false
<div class=${isActive ? "active" : ""} ${hasError ? "error" : ""}>content</>
```

**Status:** This form is parsed at the block-splitter level but is NOT yet fully implemented
in the code generator. Gauntlet developers should use `class:name=@condition` (§5.5.2) or
template literal interpolation (§5.5.3) until this form is specified and implemented.

**Planned behavior (non-normative):**

- `class={expression}` will compute the full class string by evaluating `expression` as a
  JavaScript expression.
- If the expression references `@variables`, the class will update reactively when those
  variables change.
- The expression result SHALL be coerced to a string. An array result SHALL be joined with
  spaces (e.g., `["a", "b"]` → `"a b"`). A null or undefined result SHALL produce an empty
  class string.

This form will be fully specified and normalized in a future spec revision. SPEC-ISSUE-013 tracks it.

#### 5.5.5 Class Binding on Components

When a `class:` directive or template literal class interpolation is used at a component
call site, the class binding targets the root element of the component.

**Normative statements:**

- `class:name=@condition` at a component call site SHALL be forwarded to the component's
  root element, just as a static `class="value"` is appended to the root element's class
  list (§15.5).
- A static `class="value"` at a call site is APPENDED to the root element's existing class
  list. A `class:name=@condition` directive is ADDED as an additional reactive toggle on
  the root element.
- The component's own `class:` directives (if declared on its root element) and the caller's
  `class:` directives are both active simultaneously. They are independent.

**Worked example:**

```scrml
// Definition
const Card = <div class="card">
    ${children}
</>

// Usage
@featured = true
<Card class="featured-card" class:featured=@featured>
    Content
/Card>
```

The rendered element has `class="card featured-card"` at all times (static merge), and the
`featured` class is additionally toggled by `@featured`.

#### 5.5.6 Interaction with CSS Scoping

Component-scoped CSS (§24.6) interacts with class binding as follows:

- Class names in `class:` directives that match selector names in the component's `<style>`
  block are subject to the same auto-scoping hash transformation applied to other class names
  in that component.
- The compiler applies the scope hash consistently: if `.active` is defined in the style
  block, then `class:active=@cond` on an element inside that component binds to the
  scoped (hashed) version of `.active`.
- Tailwind utility class names are always global (§25.2). A `class:` directive toggling a
  Tailwind utility class SHALL NOT be hashed.
- Template literal interpolations that resolve to Tailwind utility class names are scanned
  by the Tailwind scanner at compile time. The scanner SHALL recognize static string portions
  of template literals and include matched utilities in the CSS output.
- Dynamic `class:` bindings that reference non-Tailwind class names defined outside any
  style block are treated as author-managed global class names. The compiler does not hash
  or scope them.

**Summary table — class binding forms:**

| Form | Reactive | Static/Dynamic | Implementation Status |
|---|---|---|---|
| `class="foo bar"` | No | Static at compile time | Implemented |
| `class:name=@cond` | Yes | Single class toggled by reactive boolean | Implemented |
| `class="prefix-${@var}"` | Yes | Full class string via template literal | Implemented |
| `class={expression}` | Conditional | Full class string from JS expression | Planned (SPEC-ISSUE-013) |

---

## 6. Reactivity — The `@` Sigil

### 6.1 Declaration

A reactive variable is declared by prefixing an assignment with `@`.

**Syntax:**
```scrml
@variableName = initialValue
```

#### 6.1.1 Machine-Bound Declaration

**Added:** 2026-04-08 — §51 cross-reference.

A reactive variable may be bound to a `< machine>` state type at declaration time:

```scrml
@variableName: MachineName = initialValue
```

The `: MachineName` annotation names the machine that governs this variable. All subsequent
assignments to `@variableName` are transition requests validated against `MachineName`'s
rules (§51.3).

The initial value `initialValue` is the seed state. It is not a transition from a prior
value and is not validated against the machine's rules.

The `: MachineName` annotation and the `: TypeName` annotation share the same syntactic
position. The compiler disambiguates: if the name resolves to a `< machine>` declaration,
it is a machine binding; if it resolves to a type, it is a type annotation. If the name
does not resolve to either, the compiler emits E-TYPE-001 (unresolved type or machine name).

**Normative statements:**

- `@var: MachineName = initValue` SHALL be valid when `MachineName` resolves to a
  `< machine>` declaration in scope.
- The initial value `initValue` SHALL be of the enum type governed by `MachineName`. A
  type mismatch SHALL be E-TYPE-001.
- The machine binding is immutable for the lifetime of the variable. It cannot be changed
  after declaration.
- `@var: MachineName` and `@var: TypeName` are disambiguated by name resolution. If the
  name resolves to a `< machine>` declaration, it is a machine binding; otherwise, it is a
  type annotation.

#### 6.1.2 `server @var` — Server-Authoritative Reactive Declarations

**Added:** 2026-04-08 — §52 cross-reference.

A reactive variable MAY be prefixed with the `server` modifier to declare it as server-authoritative.

**Syntax:**
```scrml
server @variableName = initialValue
```

The `server` modifier is syntactically placed before the `@` sigil. The initial value is the client-side placeholder displayed while the server fetch is in flight. It is not the authoritative value.

A `server @var` declaration is subject to all existing placement and scoping rules for `@var` declarations (§6.2), with the following additions:

- The `server` modifier is valid at file top-level and inside logic contexts `${ }`.
- The `server` modifier is NOT valid inside a function body. Authority is declared at the scope that owns the variable, not inside a function.
- A `server @var` SHALL NOT be declared inside a client-only component (a component with no server context). The compiler SHALL emit E-AUTH-005 if this is attempted.

See §52 (State Authority Declarations) for full semantics, sync infrastructure generation, and error codes.

### 6.2 Placement Rules

- `@variable` declarations SHALL be valid anywhere a value assignment is valid: at file top-level, at the top of a state block, inside a logic context `${ }`, and inside a function body.
- Scoping follows the nearest enclosing block. A `@variable` declared at file top-level is file-scoped. A `@variable` declared inside `${ }` is scoped to that logic block.
- A `@variable` SHALL be declared before its first use within its scope. Assigning to an undeclared `@variable` inside a function body SHALL be a compile error (E-REACTIVE-001) with a message pointing to the scope level where the declaration should appear.
- Implicit reactive variable creation on first assignment SHALL NOT be supported. The compiler SHALL require an explicit declaration.
- File-scope `@variable` declarations SHALL be hoisted by the compiler. A `@variable`
  declared at file top-level — whether directly in the file body or inside a file-level
  `${ }` block — is visible to all markup expressions and logic blocks in the same file,
  regardless of document order. The compiler SHALL collect all file-scope `@variable`
  declarations before resolving references, exactly as JavaScript hoists `var` declarations
  to function scope. A `@variable` declared inside a function body or inside a `${ }` block
  that is itself nested inside a function is NOT hoisted; those obey the existing
  declaration-before-use rule (E-REACTIVE-001).

### 6.3 Reactive Semantics

- Dependents of a `@variable` re-evaluate when the `@variable`'s value changes.
- A plain (non-`@`) variable assignment captures the value at the point of definition and does not create a reactive binding. Subsequent changes to the source value do NOT propagate.
- `@variable` bindings for client-only reactive state SHALL be valid at any scope level. A client-rendered counter that reads a `@variable` does NOT require a state block wrapper.
- The `< db>` and `< statename>` state block wrapper is for state that involves server resources. A `@variable` alone is sufficient for client-only reactive state.
- Server call results that must propagate reactively SHALL be assigned to `@variables`. The compiler MAY automatically assign server call results to `@variables` when the result is used in a reactive context; this inference is described in Section 30 (Dependency Graph).

### 6.4 Worked Examples

**Valid — file-level reactive variable:**
```scrml
@counter = 0
<button onclick=increment()>Count: ${@counter}</>
${ function increment() { @counter = @counter + 1 } }
```

**Valid — state-block-level reactive variable:**
```scrml
< db src="db.sql" tables="users">
    @errorMessage = ""
    ${ if (@errorMessage) { lift <div class="error">${@errorMessage}/ } }
</>
```

**Invalid — undeclared reactive variable:**
```scrml
${ function loadItems() {
    @loading = true    // Error: @loading not declared in scope
} }
```
Error E-REACTIVE-001: `@loading` is not declared. Declare it at the enclosing scope before first use.

### 6.5 Reactive Array Mutation

A reactive array is declared with `@` exactly like any other reactive variable:

```scrml
@items = []
@items = [1, 2, 3]
@items = ["alice", "bob", "carol"]
```

The array is a first-class reactive value. Any write to `@items` — whether by full
replacement or by a method that the compiler intercepts — triggers all subscribers of
`@items` exactly as a plain scalar write would.

---

#### 6.5.1 Mutating Method Syntax

The following mutating methods are valid on reactive array variables:

```
@arr.push(value)
@arr.pop()
@arr.shift()
@arr.unshift(value)
@arr.splice(start, deleteCount, ...items)
@arr.reverse()
@arr.sort()
@arr.sort(compareFn)
```

**Canonical update pattern (DQ-2):** Array mutation methods (`.push()`, `.splice()`, `.pop()`, etc.) do NOT trigger reactivity on their own. To update a reactive array, reassign it:

```scrml
@arr = [...@arr, newItem]              // canonical — always triggers reactivity
@arr = @arr.filter(x => x.id !== id)   // canonical removal
```

The compiler rewrites `@arr.push(x)` to the clone-mutate-replace pattern in development mode (described in the normative rule below), but this rewrite is NOT guaranteed in production builds. Code that relies on mutation interception for reactive updates is undefined behavior in production. Reassignment is the only guaranteed reactive update pattern.

**Normative rule:** When the compiler encounters a call of the form `@name.method(...)` where
`method` is one of the mutating methods listed above, it SHALL rewrite the call to:

1. Clone the current array value.
2. Apply the mutation to the clone.
3. Write the clone back to `@name` via `_scrml_reactive_set`, which triggers all subscribers.

The generated JavaScript for `@items.push(newItem)` is:

```js
(function() {
  const _a = _scrml_reactive_get("items").slice();
  _a.push(newItem);
  _scrml_reactive_set("items", _a);
})();
```

The clone-mutate-replace pattern ensures that reactive consumers receive a new array reference
on every mutation, which is required for identity-based change detection in keyed rendering
(§6.5.3).

**Mutation methods that return a value:** `pop()`, `shift()`, and `splice()` return the removed
element(s) in standard JavaScript. When used on a reactive array, the compiler preserves the
return value. Example:

```scrml
${ let removed = @items.pop() }
```

Compiles to:

```js
let removed;
(function() {
  const _a = _scrml_reactive_get("items").slice();
  removed = _a.pop();
  _scrml_reactive_set("items", _a);
})();
```

---

#### 6.5.2 Non-Mutating Derived Arrays

The standard non-mutating array methods (`filter`, `map`, `slice`, `concat`, `find`,
`findIndex`, `includes`, `some`, `every`, `reduce`) are NOT reactive array mutations.
They return new arrays and do NOT trigger subscribers of the source array.

Non-mutating methods are valid on reactive arrays and return plain (non-reactive) values:

```scrml
${ let active = @items.filter(i => i.done === false) }
```

This does not trigger reactive updates. If the derived value must be reactive, declare it
with `const @` (§6.6):

```scrml
const @active = @items.filter(i => i.done === false)
```

`@active` is a derived reactive value that re-evaluates whenever `@items` changes, per
the lazy pull + dirty flag semantics of §6.6.

---

#### 6.5.3 Iteration Over Reactive Arrays

Iterate over a reactive array using the standard `for/lift` pattern (§17.4):

```scrml
<ul>${
    for (item of @items) {
        lift <li>${item.name}</>;
    }
}</>
```

When `@items` changes (via mutation or full replacement), the compiler re-runs the enclosing
logic block and re-renders the list. This is consistent with how all reactive re-renders
work: a write to `@items` fires all subscribers of `@items`, and the subscriber for this
block re-evaluates the entire `for/lift` body.

**Keyed iteration:** To give the runtime a stable identity for each list item — enabling
efficient DOM reconciliation rather than full list teardown and rebuild — provide a `key=`
attribute on the `lift` element:

```scrml
<ul>${
    for (item of @items) {
        lift <li key=${item.id}>${item.name}</>;
    }
}</>
```

The `key=` value SHALL be a string or number that uniquely identifies the element within
the list. Keys SHALL be stable across re-renders (the same logical item should always
produce the same key).

**Normative key rules:**
- `key=` is optional. Without `key=`, the compiler renders using index-based reconciliation.
- `key=` SHALL appear on the element directly passed to `lift`. It is not valid on descendant
  elements inside the lifted element.
- `key=` is a compiler directive; it does not appear in the emitted HTML.
- Duplicate keys within a single `for/lift` block SHALL be a compile warning (W-KEY-001).
- A non-string, non-number `key=` value SHALL be a compile error (E-KEY-001).

---

#### 6.5.4 Array Length Reactivity

`@items.length` is a reactive expression. Reading `@items.length` inside a reactive context
(a template interpolation, a `when` dep-list, or a `const @` derived expression) creates a
subscription to `@items`. When `@items` changes, any consumer of `@items.length` re-evaluates.

```scrml
<p>Item count: ${@items.length}</>
```

This re-renders whenever `@items` is written — including after any mutating method call.

---

#### 6.5.5 Full Replacement

A reactive array may be replaced in full at any time:

```scrml
@items = newArray
@items = []
@items = fetchedData.map(d => ({ id: d.id, name: d.name }))
```

Full replacement uses standard reactive assignment and triggers all subscribers of `@items`
identically to a mutation call. There is no semantic distinction between mutation and
replacement from the subscriber's perspective — both result in a `_scrml_reactive_set` call.

---

#### 6.5.6 Nested Reactive Arrays

Nested arrays (arrays of arrays) are supported. Only the outermost reactive variable is
reactive. Mutating an inner array does NOT trigger subscribers of the outer variable unless
the outer array is explicitly written:

```scrml
@matrix = [[1, 2], [3, 4]]

${ function addToRow(rowIdx, val) {
    const newRow = @matrix[rowIdx].concat(val)
    const newMatrix = @matrix.slice()
    newMatrix[rowIdx] = newRow
    @matrix = newMatrix
} }
```

There is no implicit deep reactivity. This is consistent with scrml's philosophy of explicit
reactivity: only explicit `@variable` writes propagate.

---

#### 6.5.7 Reactive Arrays of State Objects

A reactive array may contain state objects:

```scrml
@todos = [
    { id: 1, text: "Buy groceries", done: false },
    { id: 2, text: "Walk the dog", done: true }
]
```

Mutating a field of an object inside a reactive array does NOT trigger subscribers. Only
writes to the array itself trigger subscribers. To update a field reactively:

```scrml
${ function toggleDone(id) {
    @todos = @todos.map(t => t.id === id ? { ...t, done: !t.done } : t)
} }
```

This replaces `@todos` with a new array, triggering all subscribers. The `map` call is a
plain JavaScript expression; the compiler does not intercept it (non-mutating, §6.5.2).

---

#### 6.5.8 Worked Examples

**Example 1 — Todo list with push and keyed rendering:**

```scrml
<program>
    @todos = []
    @newText = ""

    ${ function addTodo() {
        @todos.push({ id: Date.now(), text: @newText, done: false })
        @newText = ""
    } }

    ${ function removeTodo(id) {
        @todos = @todos.filter(t => t.id !== id)
    } }

    <input bind:value=@newText placeholder="New todo"/>
    <button onclick=addTodo()>Add</>

    <ul>${
        for (todo of @todos) {
            lift <li key=${todo.id}>
                ${todo.text}
                <button onclick=removeTodo(todo.id)>Remove</>
            </>;
        }
    }</>
</>
```

After `addTodo()`, `@todos.push(...)` is intercepted by the compiler, which clones the
array, pushes the new item, and writes back via `_scrml_reactive_set("todos", ...)`. The
`<ul>` subscriber re-renders with the new list.

**Example 2 — Derived reactive count:**

```scrml
<program>
    @items = []
    const @doneCount = @items.filter(i => i.done).length

    <p>Done: ${@doneCount} of ${@items.length}</>
</>
```

`@doneCount` is a derived reactive value (§6.6). It re-evaluates lazily when `@items`
changes. `@items.length` is also reactive and re-reads when `@items` changes. Both update
in the same flush after any mutation to `@items`.

**Example 3 — Sort with reactivity:**

```scrml
<program>
    @names = ["Charlie", "Alice", "Bob"]

    ${ function sortNames() {
        @names.sort()
    } }

    <button onclick=sortNames()>Sort</>
    <ul>${
        for (name of @names) {
            lift <li>${name}</>;
        }
    }</>
</>
```

`@names.sort()` is a mutating method (§6.5.1). The compiler intercepts it, clones the
array, calls `.sort()` on the clone, writes back. The `<ul>` re-renders in sorted order.

---

#### 6.5.9 Error and Warning Code Summary

| Code | Trigger | Severity |
|---|---|---|
| E-KEY-001 | `key=` value is not a string or number expression | Error |
| W-KEY-001 | Duplicate `key=` values within a single `for/lift` block | Warning |
| E-REACTIVE-006 | Mutating method called on a non-reactive (non-`@`) array variable | Error |

**E-REACTIVE-006 detail:** Calling a mutating method (push, pop, etc.) on a non-reactive
variable using the `@`-call syntax is a programmer error. The compiler SHALL detect the form
`nonReactiveVar.push(...)` and emit E-REACTIVE-006 if the variable is not declared with `@`.

Example:

```scrml
let items = [1, 2, 3]
@items.push(4)     // Error E-REACTIVE-006: `items` is not a reactive variable.
                   // Declare it as `@items = [...]` or use `items.push(4)` without `@`.
```

---

#### 6.5.10 Compiler Implementation Notes (Non-Normative)

These notes describe the expected implementation strategy. They are informational for
compiler implementers and do not constitute normative constraints.

**Mutation interception:** The CG stage detects `@name.method(args)` call expressions where
`method` is in the mutating-method set and `name` is a declared reactive variable. It emits
the clone-mutate-replace pattern shown in §6.5.1.

**Key reconciliation:** The runtime maintains a keyed map from `key=` value to DOM node for
each `for/lift` block with a `key=` attribute. On re-render, nodes with matching keys are
reused and moved; nodes with no matching key are created; nodes with keys that disappeared
are destroyed via the canonical teardown sequence (§6.7.2).

**Subscriber re-render:** When `_scrml_reactive_set("items", newArray)` fires, the subscriber
for the enclosing `for/lift` block re-runs the entire block body. For keyed lists, the runtime
performs reconciliation. For unkeyed lists, the runtime rebuilds the list from scratch.

---

#### 6.5.11 Interaction Notes

- **§6.3 (Reactive Semantics):** All normative statements in §6.3 apply to reactive arrays.
  A reactive array is a reactive value like any other.
- **§6.6 (Derived Reactive Values):** `const @derived = @arr.filter(...)` creates a derived
  reactive value that subscribes to `@arr`. Per §6.6, the derived value is re-evaluated lazily
  on the next read after `@arr` changes. The `.filter()` call is a plain JS expression in the
  derived body.
- **§6.7.3 (cleanup):** If a `for/lift` block is inside a conditionally mounted scope (§6.7.2),
  the keyed node map is destroyed as part of scope teardown. On re-mount, reconciliation
  starts from an empty map.
- **§17.4 (Iteration):** The `for/lift` pattern is the canonical scrml iteration primitive.
  Reactive arrays are iterated with `for/lift` exactly as non-reactive arrays are. The
  distinction is that the enclosing block re-runs when a reactive array changes.

#### 6.5.12 Multi-Step Array Mutations and Atomicity

Each intercepted array mutation method (§6.5.1) generates a separate `_scrml_reactive_set`
call, which notifies all subscribers of the reactive array immediately and synchronously.
Two mutation calls on the same reactive array in sequence therefore trigger two subscriber
notifications and two potential re-renders.

**Normative statements:**

- Each call to an intercepted mutating method on a reactive array SHALL trigger exactly one
  `_scrml_reactive_set` call and one synchronous subscriber notification, before the next
  statement in the enclosing block begins executing.
- Two or more intercepted mutation calls on the same reactive array in sequence SHALL each
  trigger their own subscriber notification independently. There is no implicit batching
  across sequential mutation calls.
- A developer who requires a single atomic multi-step mutation (one subscriber notification
  covering multiple structural changes) SHALL use clone-mutate-assign syntax: clone the
  current array value to a plain (non-reactive) variable, apply all mutations to the clone
  using plain JavaScript method calls, then assign the clone back to the reactive variable.
  The single assignment triggers one subscriber notification.

**Clone-mutate-assign pattern for atomic mutations:**

```scrml
${ function removeTwo(i, j) {
    // One reactive write. Subscribers see only the final state.
    let lo = Math.min(i, j)
    let hi = Math.max(i, j)
    let tmp = @arr.slice()          // plain clone; does NOT trigger subscribers
    tmp.splice(hi, 1)               // plain JS splice on non-reactive variable
    tmp.splice(lo, 1)               // plain JS splice on non-reactive variable
    @arr = tmp                      // single reactive write; one subscriber notification
} }
```

`tmp.splice(...)` calls are plain JavaScript method calls on a `let` variable. The compiler
does NOT intercept them (only `@`-prefixed method calls are intercepted per §6.5.1). The
single `@arr = tmp` assignment is the only reactive write.

**Worked example — two separate updates (non-atomic, sequential):**
```scrml
${ function swap(i, j) {
    let vi = @arr[i]
    @arr.splice(i, 1, @arr[j])   // reactive write 1: subscribers see intermediate state
    @arr.splice(j, 1, vi)        // reactive write 2: subscribers see final state
} }
```
Subscribers re-render twice. If the intermediate state is visually incorrect or the
re-render is expensive, use clone-mutate-assign instead.

**Future consideration (non-normative):** A `@arr.batch(() => { ... })` API that
accumulates mutations within a callback and triggers a single subscriber notification on
exit is a candidate for a future spec revision. It is NOT specified in this version. A
compiler SHALL NOT implement `@arr.batch(...)` as a recognized form; doing so would be a
non-conformant extension.

---

### 6.6 Derived Reactive Values — `const @name`

**Debate verdict:** Lazy pull with dirty flags (Approach C) wins 49.5/60. This section
encodes that verdict as normative spec. The previous TODO stub and the `_scrml_reactive_derived`
runtime stub (which evaluated once and never re-evaluated) are superseded in full by this
section.

---

#### 6.6.1 Syntax

A derived reactive value is declared with `const` applied to an `@`-prefixed identifier:

```
derived-decl ::= 'const' '@' identifier '=' expression
```

**Examples:**

```scrml
const @total   = @price * @quantity
const @taxed   = @total * 1.08
const @display = @taxed > 0 ? @taxed.toFixed(2) : "0.00"
```

The `const` keyword signals immutability of the binding. The `@` sigil signals that the
value is reactive — it is re-evaluated when any `@`-prefixed upstream dependency changes.

**Normative statements:**

- The `const @name = expr` form SHALL be the sole declaration syntax for derived reactive
  values. The form `@derived name = expr` (an alternative considered during design) SHALL
  NOT be recognized. Any use of `@derived` as a keyword SHALL be a compile error
  (E-REACTIVE-001) with a hint suggesting `const @name = expr`.
- A derived reactive value declaration SHALL be valid anywhere a `const-decl` is valid:
  at file top-level, inside a logic context `${ }`, and at the top of a state block.
- The right-hand side expression SHALL be evaluated lazily (see §6.6.3). The compiler
  SHALL NOT evaluate it at declaration time beyond recording the dependency edges.

---

#### 6.6.2 Distinction From Non-Reactive `const`

| Form | Behavior |
|---|---|
| `const total = @price * @quantity` | Static snapshot. Captures the value of `@price` and `@quantity` at declaration time. Does NOT update when either changes. |
| `const @total = @price * @quantity` | Derived reactive. Re-evaluates when `@price` or `@quantity` changes, per the lazy pull + dirty flag semantics of §6.6.3. |

- `const total = expr` (no `@` on the left-hand side) produces a static value at declaration
  time. It is not tracked by the reactive system. Subsequent changes to any `@variable`
  read in `expr` do NOT propagate to `total`.
- `const @total = expr` (with `@` on the left-hand side) is a derived reactive value. The
  compiler SHALL register it with the reactive dependency graph and emit dirty-propagation
  and re-evaluation wiring.

---

#### 6.6.3 Evaluation Strategy — Lazy Pull with Dirty Flags

The evaluation strategy is **lazy pull with dirty flags**. This is the normative evaluation
model. Eager push (recomputing immediately on every write) and runtime auto-tracking (used
by SolidJS) are rejected for static dependency contexts; they are not conformant evaluation
strategies for `const @name = expr` outside of `^{}` meta blocks.

**The three-phase model:**

**Phase 1 — Static graph construction (compile time).** The compiler walks the expression
on the right-hand side of every `const @name = expr` and extracts all `@variable` references
as static dependency edges. The result is a directed acyclic graph (or an error — see §6.6.10
for cycle detection). The compiler emits `_scrml_derived_subscribe` calls that wire each
derived node to its upstream dependencies. This wiring is a static artifact in the compiled
output; it is not discovered at runtime.

**Phase 2 — Dirty flag propagation (runtime, eager).** When any `@variable` is written
(via `_scrml_reactive_set`), the runtime SHALL immediately mark all direct and transitive
downstream derived nodes as **dirty**. Dirty flag propagation is synchronous and eager. It
runs before the call to `_scrml_reactive_set` returns. No re-evaluation occurs at this phase
— only the dirty flag is set.

**Phase 3 — Re-evaluation on read (runtime, deferred).** When a derived value is read (by
the render system or by any expression that accesses it), and its dirty flag is set, the
runtime SHALL re-evaluate the derived expression, clear the dirty flag, cache the new result,
and return it. If the dirty flag is not set, the cached value is returned with no
re-evaluation. Re-evaluation of all dirty derived nodes is completed within a single
microtask flush.

**Normative statements:**

- The compiler SHALL emit the complete subscription graph for all `const @name = expr`
  declarations as static calls in compiled output. The subscription graph SHALL NOT be
  discovered at runtime by tracking expression evaluation.
- When an upstream `@variable` is written, the runtime SHALL eagerly propagate dirty flags
  to all downstream derived nodes in the static subscription graph before the write
  completes. Dirty flag propagation SHALL be synchronous.
- A derived value SHALL NOT be re-evaluated until it is read AND its dirty flag is set.
  Re-evaluation SHALL NOT occur at write time.
- A derived value with a clean (unset) dirty flag SHALL return its cached value immediately
  on read, with no re-evaluation.
- Within a single microtask flush, every derived node in the graph SHALL be evaluated at
  most once, regardless of how many upstream paths converge on it. This is the structural
  solution to the diamond dependency problem (see §6.6.4).
- The compiler SHALL initialize all derived values by marking them dirty at startup. The
  first read of any derived value triggers its initial evaluation.
- The compiler SHALL track reactive dependencies transitively through function calls that
  appear in reactive positions. A reactive position is any of: a markup interpolation
  `${expr}`, a `const @name = expr` derived declaration, or a `when` dep-list entry. If
  a function `f()` is called in a reactive position and `f`'s body (as seen by the
  compiler's static call graph) reads one or more `@variable`s, those `@variable`s SHALL
  be recorded as dependencies of the enclosing reactive expression, exactly as if the
  reads occurred directly at the call site. Transitive tracking extends recursively through
  `f`'s callees: if `f` calls `g` and `g` reads `@x`, then `@x` is a dependency of the
  enclosing reactive expression. The depth of transitive tracking is bounded by the static
  call graph; recursive functions do not produce infinite traversal (the graph is a DAG
  after cycle detection). If `f` is not analyzable at compile time because its source is
  not available (e.g., imported from a vanilla `.js` file), the compiler SHALL emit warning
  W-REACTIVE-001 and the reactive reads inside `f` SHALL NOT be tracked.

---

#### 6.6.4 Diamond Dependency — Structural Solution

A diamond dependency arises when two derived values share a common upstream `@variable`
and a third derived value depends on both of them:

```scrml
@price    = 10
@quantity = 3

const @subtotal  = @price * @quantity         // depends on @price and @quantity
const @discount  = @price * 0.05              // depends on @price only
const @total     = @subtotal - @discount      // depends on both @subtotal and @discount
```

When `@price` changes, both `@subtotal` and `@discount` are marked dirty (Phase 2). When
`@total` is read, it needs `@subtotal` and `@discount`. If both are dirty, the runtime
evaluates each exactly once, caches the results, then evaluates `@total`. `@total` is
evaluated once per flush regardless of how many dirty upstream paths converge on it.

**The diamond is solved structurally, not by topological sort at flush time.** The flush
defers all evaluation to read time. Because each node is evaluated at most once per flush
(dirty flag is cleared on first evaluation, so a second read within the same flush returns
the cached value), no node is ever evaluated twice. No topological sort is needed at the
flush site.

**Normative statements:**

- The runtime SHALL guarantee that each derived node is re-evaluated at most once per
  microtask flush, regardless of the number of upstream paths that converge on it.
- The dirty flag SHALL be cleared immediately when re-evaluation begins, before the
  expression is evaluated. This prevents re-entrant re-evaluation of the same node within
  the same flush.

---

#### 6.6.5 Flush Boundary and Stale Reads

A synchronous read of a derived value between a write and the microtask flush will see the
**previously cached value** (stale), because dirty flag propagation is eager but re-evaluation
is deferred to read time. This is correct per §6.6.3: the dirty flag is set, so the next
read after the flush will trigger re-evaluation.

**This stale-read window is defined behavior, not a bug.** It is the cost of the lazy pull
model. The window is bounded to synchronous code between a `_scrml_reactive_set` call and
the first read of the dependent derived value.

**`flush` — explicit opt-in for immediate consistency:** A developer who needs to read a
derived value immediately after a write and see the updated result SHALL call `flush()` to
trigger synchronous re-evaluation of all dirty derived nodes before continuing.

```scrml
@price = newPrice
flush()                            // forces re-evaluation of all dirty derived nodes
let display = @display             // reads the updated (post-flush) value
```

**Normative statements:**

- A synchronous read of a derived value after a write to an upstream `@variable` and before
  a microtask flush SHALL return the previously cached value. This is defined behavior.
- The compiler SHALL NOT treat a stale read in this window as an error. It is a
  consequence of the lazy pull model.
- `flush()` SHALL be a built-in function that synchronously re-evaluates all dirty derived
  nodes in the current reactive graph before returning.
- After `flush()` returns, all dirty flags in the derived graph SHALL be cleared and all
  cached values SHALL reflect the most recent upstream writes.
- `flush()` SHALL be valid inside any `${ }` logic context and inside any function body.
- `flush()` SHALL NOT be called inside a derived expression. Calling `flush()` from within
  a derived re-evaluation is a compile error (E-REACTIVE-004: `flush()` not valid inside a
  derived expression).

---

#### 6.6.6 Meta Block Exception — Runtime Auto-Tracking Inside `^{}`

Inside `^{}` meta blocks (§22), the dependency graph of a derived expression is
**statically unknowable** because meta blocks can access arbitrary runtime state, call
dynamically resolved functions, and reference values whose identity is only known at
runtime.

For `const @name = expr` expressions whose right-hand side contains a `^{}` block, the
compiler SHALL use **runtime auto-tracking** instead of static graph construction. The
runtime auto-tracking implementation:

1. Wraps the derived expression in a tracking context before each evaluation.
2. Records every `@variable` read during evaluation as a dependency.
3. Subscribes the derived node to those dependencies for the next cycle.

**Normative statements:**

- For `const @name = expr` where `expr` does NOT contain a `^{}` block, the compiler SHALL
  use static subscription graph construction (§6.6.3). Runtime auto-tracking SHALL NOT be
  used.
- For `const @name = expr` where `expr` DOES contain a `^{}` block, the compiler SHALL use
  runtime auto-tracking. Static subscription graph construction SHALL NOT be attempted for
  `^{}` sub-expressions, as their dependency sets are unknowable at compile time.
- The choice between static and runtime tracking is made per derived declaration by the
  compiler, based on whether the expression contains a `^{}` sub-expression. The developer
  does not select the strategy.
- Runtime auto-tracking inside `^{}` SHALL use the same dirty flag + lazy pull mechanics as
  the static model. Only the subscription discovery mechanism differs.

---

#### 6.6.7 Compiler-Emitted Code Shape

For a declaration `const @total = @price * @quantity`, the compiler SHALL emit code
equivalent to the following (simplified for clarity; actual encoded variable names may
differ per §2 output conventions):

```javascript
// Initialization
_scrml_derived_declare("total", () => _scrml_get("price") * _scrml_get("quantity"));

// Subscription wiring (compiler-emitted static calls, not runtime discovery)
_scrml_derived_subscribe("total", "price");
_scrml_derived_subscribe("total", "quantity");
```

`_scrml_derived_declare(name, fn)` registers the derived node with its evaluation function
and marks it dirty for initial evaluation.

`_scrml_derived_subscribe(derived, upstream)` registers a dirty-propagation edge: when
`upstream` is written, `derived` is marked dirty.

The prior stub `_scrml_reactive_derived(name, fn)` which called `fn()` once at declaration
time and registered no subscriptions SHALL be replaced by this two-call pattern. The stub
behavior (evaluate once, never re-evaluate) is superseded and non-conformant.

**Normative statements:**

- The compiler SHALL emit one `_scrml_derived_declare` call per `const @name = expr`
  declaration.
- The compiler SHALL emit one `_scrml_derived_subscribe` call per upstream `@variable`
  reference found in `expr` during static graph construction. If `expr` reads `@price` and
  `@quantity`, two subscribe calls are emitted.
- The compiler SHALL NOT emit `_scrml_reactive_derived` for `const @name = expr`
  declarations. The old stub function name is retired; the runtime SHALL provide
  `_scrml_derived_declare` and `_scrml_derived_subscribe` instead.

---

#### 6.6.8 Assignment to a Derived Value — E-REACTIVE-002

A `const @name` binding is immutable. The compiler SHALL reject any attempt to assign a
new value to a derived reactive variable after its declaration.

```scrml
const @total = @price * @quantity

${ function reset() {
    @total = 0    // Error E-REACTIVE-002
} }
```

**Normative statements:**

- The compiler SHALL reject any assignment to a `const @name` identifier after its
  declaration site. This applies regardless of the enclosing context (top-level, function
  body, logic block, or event handler).
- E-REACTIVE-002 SHALL be: "Assignment to derived reactive value `@total`. `const @`
  bindings are immutable. To reset the value, modify one of its upstream dependencies
  (`@price`, `@quantity`)."
- The error message SHALL list the upstream dependencies of the target derived value, to
  guide the developer toward the correct fix.

---

#### 6.6.9 Derived Values Inside Server Functions — E-REACTIVE-003

Derived reactive values are client-side constructs. Their dirty flag, cache, and
subscription graph live in the browser. A server-escalated function (§12) runs in the Bun
process, not in the browser, and has no access to the client-side reactive graph.

**Declaring** a `const @name = expr` at file top-level is always valid. The compiler
generates the derived node on the client. The derived value is client-resident.

**Reading** a `const @name` value inside a server-escalated function is a compile error
(E-REACTIVE-003), because the server function cannot access the client-side reactive state
at the time of execution.

**Normative statements:**

- A `const @name = expr` declaration SHALL always be a client-side declaration. The
  compiler SHALL generate the derived node and its subscription graph in the client JS
  output, regardless of where in the source file the declaration appears.
- A server-escalated function body that reads a `const @name` derived reactive value SHALL
  be a compile error (E-REACTIVE-003): "Derived reactive value `@total` is a client-side
  construct and cannot be read inside a server-escalated function. Pass the value as a
  function argument instead."
- The error message SHALL suggest the fix: pass the current value as a parameter from the
  call site, where it is available as a client-side value.
- Reading a mutable `@variable` (not `const @`) inside a server-escalated function is
  governed by E-RI-002 (§12), which is a separate error code and a separate condition.
  E-REACTIVE-003 is specific to `const @` derived values.

---

#### 6.6.10 Circular Derived Dependencies — E-REACTIVE-005

The compiler constructs the static dependency graph for all `const @name = expr`
declarations during graph construction (§31). A cycle in this graph is a compile error.

```scrml
const @a = @b + 1    // @a depends on @b
const @b = @a + 1    // @b depends on @a — cycle!
```

The dependency graph is directed. A cycle exists when any node is reachable from itself by
following directed dependency edges.

**Cycle detection:** The compiler SHALL run cycle detection on the derived dependency
sub-graph during the dependency graph construction pass (Stage 7, §30). Cycle detection
uses a depth-first traversal of the derived node set. The algorithm SHALL complete before
code generation begins.

**Normative statements:**

- The compiler SHALL detect all cycles in the derived reactive dependency graph during
  Stage 7.
- A cycle involving any `const @name` declarations SHALL be a compile error
  (E-REACTIVE-005).
- The error message SHALL identify all nodes in the cycle and the dependency edges that
  form it.
- E-REACTIVE-005 SHALL block code generation. A file with a circular derived dependency
  SHALL NOT produce compiled output.
- Direct self-reference (`const @x = @x + 1`) is a degenerate one-node cycle and SHALL
  trigger E-REACTIVE-005 with the message identifying `@x` as both the source and the
  target of the cycle edge.

**Worked example — invalid (two-node cycle):**

```scrml
const @a = @b + 1
const @b = @a + 1
```

Expected compiler output:
```
Error E-REACTIVE-005: Circular derived dependency detected.
  @a depends on @b  [line 1]
  @b depends on @a  [line 2]
Cycle: @a → @b → @a
Derived reactive values must form a directed acyclic graph. Break the cycle
by introducing a mutable @variable as an intermediate value.
```

**Worked example — invalid (self-reference):**

```scrml
const @counter = @counter + 1
```

Expected compiler output:
```
Error E-REACTIVE-005: Derived reactive value `@counter` references itself.
  @counter depends on @counter  [line 1]
A derived value cannot depend on itself. Did you mean a mutable `@counter = @counter + 1`
inside a function body?
```

---

#### 6.6.11 No-Dependency Derived Value — W-DERIVED-001

A `const @name = expr` where `expr` contains no `@variable` references is a derived value
with no dependencies. Its value never changes after initial evaluation. This is not an
error but is almost certainly a mistake.

```scrml
const @x = 5 + 3    // W-DERIVED-001: no reactive dependencies; this is equivalent to const x = 8
```

**Normative statements:**

- The compiler SHALL emit W-DERIVED-001 when a `const @name = expr` declaration contains
  no `@variable` references in `expr`.
- The compiler SHALL still compile the declaration as a `const` (non-reactive) in the
  output, since there are no dependencies to subscribe to. The reactive overhead is elided.
- W-DERIVED-001 message: "Derived reactive value `@x` has no reactive dependencies. It
  will never re-evaluate after initial computation. If this is intentional, use `const x`
  instead. If `@x` was intended to depend on a reactive variable, check the expression."

---

#### 6.6.12 Error and Warning Code Summary

| Code | Trigger | Severity |
|---|---|---|
| E-REACTIVE-002 | Assignment to a `const @name` derived reactive value after declaration | Error |
| E-REACTIVE-003 | Reading a `const @name` derived value inside a server-escalated function | Error |
| E-REACTIVE-004 | `flush()` called inside a derived expression | Error |
| E-REACTIVE-005 | Circular dependency in the derived reactive graph | Error |
| W-DERIVED-001 | `const @name = expr` has no `@variable` references; value never re-evaluates | Warning |

---

#### 6.6.13 Worked Examples

**Valid — simple derived value:**

```scrml
<program>
    @price    = 10
    @quantity = 3
    const @total = @price * @quantity

    <p>Total: ${@total}</>
    <input type="number" bind:value=@price>
    <input type="number" bind:value=@quantity>
</>
```

When the user types in the price or quantity inputs, `@price` or `@quantity` is written.
The dirty flag on `@total` is set immediately. On the next read (the `${@total}` render),
`@total` re-evaluates to `@price * @quantity`, clears its dirty flag, and the DOM updates.

Compiler emits (simplified):

```javascript
_scrml_reactive_set("price", 10);
_scrml_reactive_set("quantity", 3);
_scrml_derived_declare("total", () => _scrml_get("price") * _scrml_get("quantity"));
_scrml_derived_subscribe("total", "price");
_scrml_derived_subscribe("total", "quantity");
```

**Valid — shopping cart diamond dependency:**

```scrml
<program>
    @price    = 100
    @quantity = 2

    const @subtotal = @price * @quantity          // depends on @price, @quantity
    const @discount = @price * 0.1                // depends on @price only
    const @total    = @subtotal - @discount        // depends on @subtotal, @discount

    <p>Subtotal: ${@subtotal}</>
    <p>Discount: ${@discount}</>
    <p>Total:    ${@total}</>

    <input type="number" bind:value=@price>
    <input type="number" bind:value=@quantity>
</>
```

When `@price` changes (say, from 100 to 120):

1. `_scrml_reactive_set("price", 120)` is called.
2. Dirty flags set eagerly: `@subtotal` dirty, `@discount` dirty, `@total` dirty.
   (All three are reachable from `@price` in the static graph.)
3. DOM render reads `@subtotal`: dirty flag set, evaluate `120 * 2` = `240`. Cache 240.
   Clear dirty flag.
4. DOM render reads `@discount`: dirty flag set, evaluate `120 * 0.1` = `12`. Cache 12.
   Clear dirty flag.
5. DOM render reads `@total`: dirty flag set, evaluate `240 - 12` = `228`. Both upstream
   nodes are clean; cached values are used. `@total` is evaluated exactly once. Cache 228.
   Clear dirty flag.

`@total` is evaluated exactly once per flush regardless of convergent upstream paths. The
diamond problem is solved structurally.

Compiler emits:

```javascript
_scrml_reactive_set("price", 100);
_scrml_reactive_set("quantity", 2);

_scrml_derived_declare("subtotal", () => _scrml_get("price") * _scrml_get("quantity"));
_scrml_derived_subscribe("subtotal", "price");
_scrml_derived_subscribe("subtotal", "quantity");

_scrml_derived_declare("discount", () => _scrml_get("price") * 0.1);
_scrml_derived_subscribe("discount", "price");

_scrml_derived_declare("total", () => _scrml_get("subtotal") - _scrml_get("discount"));
_scrml_derived_subscribe("total", "subtotal");
_scrml_derived_subscribe("total", "discount");
```

**Invalid — assignment to derived value (E-REACTIVE-002):**

```scrml
@price    = 10
@quantity = 3
const @total = @price * @quantity

${ function clearCart() {
    @total = 0    // Error E-REACTIVE-002
} }
```

```
Error E-REACTIVE-002: Assignment to derived reactive value `@total`. `const @` bindings
are immutable. To change the displayed total, modify one of its upstream dependencies:
@price, @quantity.
```

**Invalid — circular dependency (E-REACTIVE-005):**

```scrml
const @a = @b * 2
const @b = @a + 1
```

```
Error E-REACTIVE-005: Circular derived dependency detected.
  @a depends on @b  [line 1]
  @b depends on @a  [line 2]
Cycle: @a → @b → @a
```

**Invalid — reading derived value in server function (E-REACTIVE-003):**

```scrml
@price = 10
const @total = @price * 3

${ server function saveOrder() {
    let amount = @total    // Error E-REACTIVE-003
    ?{`INSERT INTO orders (amount) VALUES (${amount})`}.run()
} }
```

```
Error E-REACTIVE-003: Derived reactive value `@total` is a client-side construct and
cannot be read inside a server-escalated function. Pass the current value as a function
argument instead:

  saveOrder(@total)   // call site passes current value
  server function saveOrder(amount) { ... }
```

---

#### 6.6.14 Interaction Notes

- **§6.3 (Reactive Semantics):** A `const @name` derived value is a reactive binding. All
  normative statements in §6.3 about dependents re-evaluating when an upstream `@variable`
  changes apply to derived values. §6.6 specifies the mechanism (lazy pull, dirty flags);
  §6.3 specifies the intent.

- **§22 (`^{}` meta blocks):** Expressions inside `^{}` use runtime auto-tracking (§6.6.6)
  rather than static graph construction. This is the only case where the evaluation
  strategy for a derived expression differs from the static norm.

- **§30 (Dependency Graph):** The derived reactive dependency sub-graph is part of the
  full dependency graph constructed in Stage 7. Cycle detection (§6.6.10) runs as part of
  Stage 7 graph construction. The static subscription edges (`_scrml_derived_subscribe`)
  are derived from the same graph.

- **§5.4 (`bind:`):** A `bind:value=@var` binding writes to `@var` (a mutable reactive
  variable). Derived values that depend on `@var` receive dirty flags on each write. The
  `bind:` system and the derived system are orthogonal; no special interaction exists.

- **§12 (Route Inference):** Derived reactive values are always client-side. The route
  inference pass SHALL classify any function that reads a `const @name` derived value as a
  client-side function, not a server candidate. If that function also accesses server
  resources, E-REACTIVE-003 fires.

- **§34 (`lin`):** A `const @name` derived value is not a `lin` variable. It may be read
  any number of times without consuming it. The `lin` keyword and `const @` are orthogonal.

#### 6.6.15 Developer Summary — Canonical Pattern

> **Canonical pattern for derived reactive state:** `const @name = expr`

A `const @name = expr` declaration where `expr` reads one or more `@var` references SHALL be lazily memoized. The expression re-evaluates only when a referenced `@var` changes. The result is cached between evaluations; reading `@name` multiple times between upstream changes returns the cached result without re-evaluating the expression.

**Normative statements:**

- A `const @name = expr` derived declaration SHALL cache the last computed value. Between upstream `@var` changes, any number of reads SHALL return the cached value without re-evaluating.
- The cache SHALL be invalidated exactly when any upstream `@var` in the dependency graph is assigned a new value via `_scrml_reactive_set`.
- The compiler SHALL NOT emit re-evaluation code for reads of `@name` while the cache is clean.

---

### 6.7 Lifecycle and Timing Model


### 6.7.1 Overview

scrml defines four distinct lifecycle concerns. Each concern has a mechanism matched to its
nature. They are not unified into a single abstraction.

| Concern | Mechanism | Where specified |
|---------|-----------|-----------------|
| Mount — code that runs when a scope enters the DOM | Bare expression in `${}` (already spec'd §17.3) | §17.3 |
| Destroy / cleanup — code that runs when a scope exits the DOM | `cleanup()` (scope-aware; this section) | §6.7.3 |
| Reactive effect — code that re-runs when named `@variables` change | `when @var changes {}` (this section) | §6.7.4 |
| Timing — periodic or delayed execution | `<timer>` and `<poll>` state types (this section) | §6.7.5, §6.7.6 |

Animation frame scheduling is addressed separately in §6.7.9 (`animationFrame()`).

The design principle for this section is: each mechanism does exactly one thing, is visible
in the source, and has no hidden re-execution semantics. A developer reading a `.scrml` file
SHALL be able to determine, without compiler introspection, which code runs when.

### 6.7.1a `on mount {}` — Named Mount Block

`on mount { body }` is explicit syntactic sugar for the bare-expression-at-mount pattern documented in §17.3. It exists for discoverability.

**Syntax:** `on-mount-stmt ::= 'on' 'mount' '{' logic-content '}'`

**Normative statements:**

- `on mount { body }` SHALL execute `body` exactly once after the first DOM render of the enclosing `<program>` or component scope.
- `on mount { body }` SHALL NOT re-execute on reactive state changes.
- A scope that remounts SHALL re-execute the `on mount` body.
- Multiple `on mount {}` blocks in the same scope are valid and execute in source order.
- `on mount { body }` SHALL be desugared to a bare expression before the TAB pass completes.

**Worked example:**

```scrml
<program>
    @users = []
    on mount { @users = fetchUsers() }
    ${ for (u of @users) { lift <li>${u.name}/ } }
</>
```

`fetchUsers()` is called once when the program mounts. This is the canonical initial data loading pattern.

---

### 6.7.2 Scope as Lifecycle Boundary

Every element in the scrml program tree that is conditionally rendered (via `if=` — see
§17.1) creates a **lifecycle scope**. When an `if=` condition transitions from false to true,
the scope **mounts**. When it transitions from true to false, the scope **destroys**.

The `<program>` root element (§SS-program) is a permanent scope. It mounts once (on page
load) and destroys once (on page unload or navigation).

- Every `${}` logic block, `<timer>`, `<poll>`, and `cleanup()` registration is associated
  with the nearest enclosing element scope at compile time.
- When a scope destroys, all associated lifecycle resources are torn down in the following
  canonical order:
  1. All `when` effects registered in that scope are unregistered (no further executions
     will be triggered).
  2. All `<timer>` and `<poll>` instances declared in that scope are stopped.
  3. All `cleanup()` callbacks registered in that scope are fired in last-in-first-out
     (LIFO) order.
  4. All pending `animationFrame()` callbacks registered in that scope are cancelled.
- Scope destruction is depth-first: child scopes execute the above four-step teardown
  sequence before the parent scope begins its teardown sequence.
- A scope that remounts (i.e., `if=` transitions false → true a second time) SHALL re-run
  all bare expressions and re-start all `<timer>` and `<poll>` instances declared in that
  scope exactly as if the scope were mounting for the first time.

**Definition — "outside any element scope":** A construct is outside any element scope when
it appears at the file level without a `<program>` root element ancestor, or when it
appears directly inside a module-level `${}` block that has no enclosing element tag. A
construct that is inside `<program>` (the root permanent scope) is inside an element scope.
`<program>` counts as an element scope for the purposes of this section.

**Error condition:** The compiler SHALL emit E-LIFECYCLE-001 if a `cleanup()` call, a
`<timer>`, or a `<poll>` appears outside any element scope as defined above.

---

### 6.7.3 `cleanup()` — Scope-Exit Teardown

#### Syntax

```
cleanup-stmt ::= 'cleanup' '(' expression ')'
```

The argument to `cleanup()` SHALL be a function expression (arrow function, named function
reference, or `fn`-declared function). It SHALL NOT be a bare value or a call expression
that produces a non-function.

```scrml
// Valid forms
cleanup(() => { closeConnection() })
cleanup(teardownFn)

// Invalid — cleanup() argument is not a function
cleanup(closeConnection())   // E-LIFECYCLE-002
```

#### Semantics

- `cleanup()` registers a callback to be invoked when the enclosing scope destroys.
- The callback is called exactly once per scope destruction event. It is NOT called when
  the scope mounts, re-mounts, or at any other lifecycle point.
- `cleanup()` SHALL be called in a `${}` logic block (bare expression form or inside a
  function body that is itself called at mount time).
- Multiple `cleanup()` calls within a single scope are permitted. Registered callbacks
  SHALL fire in last-in-first-out (LIFO) order — the most recently registered callback
  fires first (consistent with the canonical teardown order in §6.7.2).
- `cleanup()` inside a `for` iteration body registers one callback per iteration. Each
  callback is scoped to the element produced by that iteration. The compiler SHALL emit
  W-LIFECYCLE-009 if `cleanup()` is detected inside a `for` loop body to alert the
  developer that N cleanup registrations will be created.

#### Scope Resolution for Imported Functions

If `cleanup()` is called inside a function that was imported from another module, the
registration SHALL bind to the scope that calls the function — not to the module that
defines it. Scope resolution is determined at the call site, not the definition site.

```scrml
// In utils.scrml
export fn setupSocket {
    const ws = new WebSocket(url)
    cleanup(() => ws.close())   // registers on CALLER's scope
    return ws
}

// In app.scrml
<div class="chat" if=@showChat>
    ${ setupSocket() }          // cleanup fires when <div if=@showChat> destroys
</>
```

#### Route Inference and Server Escalation

A function containing a `cleanup()` call SHALL be classified as a client-side function by
Route Inference (§12). It SHALL NOT be server-escalated, regardless of any other
characteristics that would otherwise cause RI to infer it as server-side.

E-LIFECYCLE-005 fires only when `cleanup()` appears inside a function that is EXPLICITLY
marked as server-side via a future §12 explicit annotation. It does NOT fire when
`cleanup()` appears in a function that Route Inference would independently infer as
server-side, because the presence of `cleanup()` overrides that inference to client-side
before the server-escalation decision is made.

Similarly, `when` blocks and `<timer>`/`<poll>` bodies are always classified as
client-side constructs. No function that contains them SHALL be server-escalated.

#### Normative Statements

- A `cleanup()` callback SHALL be invoked exactly once per scope destruction event.
- The compiler SHALL emit E-LIFECYCLE-004 if a `cleanup()` call is detected where the
  first argument is not a function-typed expression.
- `cleanup()` registrations inside a scope that never destroys (i.e., inside `<program>`
  with no `if=` ancestor) SHALL fire on page unload.
- The compiler SHALL emit E-LIFECYCLE-005 if a `cleanup()` call appears directly inside a
  function that is EXPLICITLY annotated as server-side (§12 explicit annotations). Cleanup
  is a client-side lifecycle concept.
- A function containing a `cleanup()` call SHALL be classified as client-side by Route
  Inference (§12). The compiler SHALL NOT server-escalate such a function.

#### Compiled Output Shape

The compiler emits cleanup registrations as calls to an internal runtime function. The
exact runtime binding is an implementation detail, but the observable semantics SHALL
match this section.

```js
// Conceptual compiler output for: cleanup(() => ws.close())
_scrml_scope_cleanup(_scope_id, () => ws.close());
```

---

### 6.7.4 `when @var changes {}` — Reactive Effects

#### Syntax

```
when-stmt     ::= 'when' dep-list 'changes' '{' logic-content '}'
dep-list      ::= '@' identifier
               | '(' dep-item (',' dep-item)* ')'
dep-item      ::= '@' identifier
```

Single-dependency shorthand (no parentheses) is permitted for one dependency:

```scrml
when @query changes {
    @page = 1
}
```

Multi-dependency form uses a parenthesized comma-separated list:

```scrml
when (@query, @minPrice, @maxPrice) changes {
    @page = 1
}
```

**Empty body:** The compiler SHALL emit W-LIFECYCLE-010 if a `when` block has an empty
body (`when @var changes {}`). An empty `when` block has no observable effect.

**Nested `when` blocks:** Nesting one `when` block directly inside the body of another
`when` block is not permitted. The compiler SHALL emit E-LIFECYCLE-016 if a `when` block
appears syntactically inside the body of another `when` block. If reactive logic inside a
`when` body requires additional reactive triggering, the developer SHALL declare the inner
effect as a top-level `when` block in the same scope.

#### Semantics

- A `when` statement declares a reactive effect. The body executes whenever any listed
  dependency changes value. Change detection is based on `_scrml_reactive_set` calls — any
  write to an `@variable` (including array mutations per §6.5, which clone-mutate-replace)
  triggers the effect. This is reference-identity-based, not deep-equality-based.
- The body does NOT execute on initial mount. It executes only in response to a change.
  If initial execution is required, a bare expression calling the same logic SHALL be used
  alongside the `when` block.
- The dependency list is **explicit and exhaustive**. The compiler does NOT auto-track
  `@variable` reads inside the body to infer additional dependencies. Only the variables
  listed in the `dep-list` trigger the effect.
- The body of a `when` block is a logic context (same rules as `${}`). It MAY read and
  write `@variables`, call functions, and contain `lift` expressions.
- A `when` statement is associated with the enclosing element scope. When that scope
  destroys, the effect is automatically unregistered as part of the canonical teardown
  sequence (§6.7.2, step 1). No explicit `cleanup()` is required to unregister a `when`
  effect.
- If the body of a `when` block writes to a variable that is also in the dependency list,
  the compiler SHALL emit E-LIFECYCLE-006. This is an error because it creates an
  immediate-reaction loop (the effect writes a variable that triggers itself).

```scrml
// Error: @page is both dependency and write target
when @page changes {
    @page = 1   // E-LIFECYCLE-006
}
```

#### Reactive Scheduler Flush Ordering

Before any `when` effect body executes, the reactive scheduler SHALL flush all dirty
derived values (`const @name` expressions declared per §6.6) in the same microtask. This
means a `when` effect body always reads up-to-date derived values, not stale cached
values.

Specifically: if `@price` changes, and `const @total = @price * @qty` is a derived value,
and `when @price changes { ... }` reads `@total` inside the body, then `@total` SHALL
reflect the post-change `@price` value when the `when` body executes.

Cross-reference: §6.6.5 (derived value invalidation and re-computation).

This flush ordering is part of the reactive scheduler contract and SHALL be observable by
any conforming implementation.

#### Dependency Listing Requirement

The explicit-dependency model is a deliberate design choice. The developer names the
triggers; the compiler names nothing on their behalf. This ensures:

1. A developer reading the source can determine all triggers without compiler introspection.
2. The compiler can statically verify that all listed dependencies are `@variable`
   declarations in scope.
3. Refactoring a `when` body does not silently change which variables trigger the effect.

The compiler SHALL emit E-LIFECYCLE-007 if a `dep-list` entry names a variable that is
not a declared `@variable` in scope at the point of the `when` statement.

Reading an unlisted `@variable` inside the `when` body is valid and is the dominant
pattern: the body reads the current value of that variable at the time the effect fires,
without making that variable a trigger. The compiler MAY emit H-LIFECYCLE-001 (a compiler
hint, off by default) if a `@variable` is read inside the `when` body but is not listed in
the `dep-list`. This hint is disabled by default because the pattern is correct and common.

To suppress H-LIFECYCLE-001 on a per-read basis, annotate the read with the `reads`
declaration in the `when` header:

```scrml
// Suppresses H-LIFECYCLE-001 for @qty — intentional non-trigger read
when @price changes reads @qty {
    @total = @price * @qty
}
```

The `reads` annotation is informational and does not change execution semantics. It
documents developer intent that `@qty` is read but is not a trigger.

#### Interaction with Server Functions

If the body of a `when` block calls a server-inferred function, the CPS transformation
(§13) applies. The effect body becomes async at the point of the server call. The compiler
inserts `await` automatically (§13.2). The developer does not write `async` or `await`.

If the server call fails, the error propagates through the `when` body's error context
(§19). The error does NOT propagate to the enclosing scope automatically; it must be
handled inside the `when` body or re-thrown explicitly.

#### Interaction with `@derived` (§6.6)

A `when` block and a `const @name` derived value are distinct constructs:

| Construct | Trigger | Executes on mount? | Can write `@variables`? |
|-----------|---------|-------------------|------------------------|
| `const @total = @price * @qty` | Any read of `@total` while dirty (lazy pull) | n/a — computed on demand | No — cannot assign inside |
| `when @price changes { ... }` | `@price` changes (push) | No | Yes |

Use `const @name` when you are computing a derived value to be read. Use `when` when you
need a side effect (navigation, resetting unrelated state, calling a server function) in
response to a state change.

The compiler SHALL emit W-LIFECYCLE-006 if both of the following conditions are true:

1. The `when` body's only effect is a single `@variable` assignment.
2. The right-hand side of that assignment is a pure expression of `@variables` (whether or
   not all referenced `@variables` are in the `dep-list`).

When both conditions hold, the pattern is strictly inferior to `const @name = expr`: the
derived form is reactive, executes on initial mount, requires no explicit dep-list, and
cannot fall out of sync. W-LIFECYCLE-006 is a Warning (not an error) and includes a
suggested replacement.

> Rationale: `when @price changes { @total = @price * @qty }` is semantically inferior to
> `const @total = @price * @qty`. The `when` form is push-based and does not execute on
> mount; the derived form is lazy-pull and self-consistent. W-LIFECYCLE-006 guides
> developers toward the correct construct. It is a warning rather than an error because
> there are rare cases (e.g., intentional deferred initialization) where the `when` form is
> chosen deliberately.

#### Edge Case EC-1: `when` dep-list with a `const @derived` variable

If a `dep-list` entry names a `const @name` derived variable (§6.6), the compiler SHALL
emit E-LIFECYCLE-007. Derived variables are not `@variables` in the sense of mutable
state; they have no "change event" independent of the underlying `@variables` they depend
on. To react to a derived value change, list the underlying `@variables` in the `dep-list`
and read the derived value inside the body.

#### Normative Statements

- The body of a `when` statement SHALL NOT execute on initial mount.
- The `dep-list` SHALL contain at least one entry. An empty `dep-list` is a syntax error.
- The compiler SHALL emit E-LIFECYCLE-007 if any `dep-list` entry is not a declared
  mutable `@variable` in the enclosing scope.
- The compiler SHALL emit E-LIFECYCLE-007 if any `dep-list` entry names a `const @name`
  derived variable.
- The compiler SHALL emit E-LIFECYCLE-006 if the body writes to any variable in the
  `dep-list`.
- A `when` effect SHALL be automatically unregistered when its enclosing scope destroys
  (§6.7.2, step 1).
- A `when` effect SHALL NOT be automatically unregistered on re-render. It persists for
  the lifetime of its enclosing scope.
- The reactive scheduler SHALL flush all dirty derived values (§6.6.5) before executing
  any `when` effect body in the same microtask.
- The compiler SHALL emit W-LIFECYCLE-010 if a `when` block has an empty body.
- The compiler SHALL emit E-LIFECYCLE-016 if a `when` block appears syntactically inside
  the body of another `when` block.

#### Canonical Pattern Statement

`when (@var) changes { body }` is the canonical mechanism for reactive side effects in scrml. Use it for operations that must occur when a reactive variable changes and that cannot be expressed as derived state.

**Normative statement:**

- `when @var changes { body }` SHALL execute `body` after the `_scrml_reactive_set` call completes and before the next microtask boundary. This is the canonical pattern for localStorage sync, analytics, and auto-save.

**Canonical use cases:**

| Use case | Correct construct |
|---|---|
| Derive a value from reactive state | `const @name = expr` (§6.6) |
| Run a side effect when state changes | `when @var changes { body }` |
| Sync to localStorage on change | `when @var changes { localStorage.setItem(key, @var) }` |
| Auto-save form fields | `when (@field1, @field2) changes { saveForm(@field1, @field2) }` |

---

### 6.7.5 `<timer>` — Interval State Type

#### Syntax

`<timer>` is a built-in state type. It is declared as a child element of any element
scope.

```
timer-decl   ::= '<timer' timer-attrs '>' logic-block '/'
               | '<timer' timer-attrs '/>'

timer-attrs  ::= (id-attr)? (interval-attr)? (running-attr)?
id-attr      ::= 'id=' string-literal
interval-attr::= 'interval=' integer-literal
running-attr ::= 'running=' '@' identifier | 'running=' boolean-literal
```

The `interval` attribute value is in milliseconds and SHALL be a positive integer literal
or a constant expression. It SHALL NOT be a reactive `@variable` reference (the interval
is fixed at compile time for a given `<timer>` instance). To change interval duration,
destroy and re-create the timer via `if=` or use a different `<timer>` declaration.

The `id` attribute is required if the timer instance is referenced by `<#id>` elsewhere
in the same scope. It is optional if the timer is self-contained.

The `running` attribute MAY be a reactive `@variable` reference (e.g., `running=@enabled`)
or a boolean literal (`true`). The value `running=false` as a boolean literal is
grammatically valid but has no useful effect — the timer is declared paused and has no way
to become un-paused without a reactive variable. The compiler SHALL emit W-LIFECYCLE-007 if
`running=false` is used as a boolean literal.

```scrml
// Minimal timer — fires every 1000ms, always running
<timer interval=1000>
    ${ @tick = @tick + 1 }
</>

// Named, conditionally running timer
<timer id="refresh" interval=5000 running=@autoRefreshEnabled>
    ${ @data = fetchData() }
</>

// Produces W-LIFECYCLE-007: running=false literal is useless
<timer interval=1000 running=false>
    ${ @tick = @tick + 1 }
</>
```

#### Semantics

- A `<timer>` instance starts when its enclosing scope mounts (or when added to the DOM
  via `if=`).
- The timer body (the `${}` logic block) executes on each interval tick.
- If the `running` attribute is present and evaluates to `false`, the timer is paused.
  It does not fire while paused. When `running` transitions to `true`, the timer resumes.
  The interval restarts from the moment of resumption (it does not fire immediately on
  resume).
- If no `running` attribute is present, the timer is always running.
- When the enclosing scope destroys, all `<timer>` instances in that scope are stopped
  as part of the canonical teardown sequence (§6.7.2, step 2). No explicit `cleanup()` is
  required.
- A `<timer>` with no logic body (self-closing form `<timer interval=1000/>`) is valid
  but produces W-LIFECYCLE-002 (timer has no body and no observable effect).

#### Async Tick Behavior

When a `<timer>` body calls a server-inferred function, the body executes asynchronously.
If the timer interval elapses before the previous async tick completes, the behavior is
governed by SPEC-ISSUE-012. Until SPEC-ISSUE-012 is resolved, the safe default is:

**Implementations SHALL queue the new tick. The timer body SHALL NOT execute again until
the previous async execution completes. W-LIFECYCLE-005 applies when a `<timer>` or
`<poll>` body calls a server function and the interval is less than 500ms, because rapid
queuing of server calls is likely a programming error.**

#### Referencing a Timer Instance

A named `<timer>` may be referenced using the `<#id>` reference syntax. The following
properties are available on a timer reference:

| Property | Type | Description |
|----------|------|-------------|
| `<#id>.running` | boolean | Whether the timer is currently active |
| `<#id>.interval` | number | The timer interval in milliseconds (read-only) |
| `<#id>.tickCount` | number | Number of times the body has executed since mount |

```scrml
<timer id="poller" interval=3000 running=@pollEnabled>
    ${ @messages = fetchMessages() }
</>

<p>Poll active: ${<#poller>.running}</>
<p>Poll count: ${<#poller>.tickCount}</>
```

#### `<timer>` Inside `for` Iteration

If a `<timer>` is declared inside a `for` iteration body, one timer instance is created
per iteration. The compiler SHALL emit W-LIFECYCLE-003 when a `<timer>` is detected
inside a `for/lift` loop body, because this pattern typically indicates accidental N-timer
creation rather than intentional per-item timers.

#### Edge Case EC-3: `running=` transition during in-flight async tick

If a `<timer>` body is executing an async server call (tick in flight) and `running`
transitions to `false`, the in-flight tick SHALL complete. No new ticks are queued from
the moment `running` becomes `false`. If `running` transitions back to `true` before the
in-flight tick completes, a new tick SHALL NOT start until the in-flight tick finishes
(consistent with the queuing default from SPEC-ISSUE-012). This behavior applies
regardless of the interval value.

#### Normative Statements

- A `<timer>` instance SHALL start automatically when its enclosing scope mounts.
- A `<timer>` instance SHALL stop automatically when its enclosing scope destroys
  (§6.7.2, step 2).
- The compiler SHALL emit E-LIFECYCLE-009 if the `interval` attribute is absent.
- The compiler SHALL emit E-LIFECYCLE-010 if the `interval` attribute value is zero or
  negative.
- The compiler SHALL emit E-LIFECYCLE-011 if the `running` attribute references a variable
  that is not a declared `@variable` in scope.
- The compiler SHALL emit W-LIFECYCLE-007 if the `running` attribute is the boolean literal
  `false`.
- The timer body SHALL execute within the reactive context of its enclosing scope. Writes
  to `@variables` inside a timer body SHALL trigger reactive updates exactly as if the
  write occurred in a `${}` logic block.
- The timer body SHALL NOT have access to the return value of the previous tick. It executes
  fresh each tick. If cross-tick state is required, the developer SHALL use a reactive
  `@variable` declared in the enclosing scope.
- Until SPEC-ISSUE-012 is resolved, the compiler SHALL emit code that queues a new tick
  rather than executing it concurrently when the previous async tick is still in flight.

---

### 6.7.6 `<poll>` — Periodic Fetch State Type

#### Complexity Budget Justification

`<poll>` is a distinct keyword from `<timer>` for the following reasons, which constitute
its earned complexity budget:

1. **Declarative intent:** `<poll>` signals to the reader (and future tooling) that the
   body performs a periodic data load. This is a distinct semantic category from general
   periodic logic, and the distinction surfaces in IDE tooling, dependency graphs, and
   network analysis tools.
2. **`.value` and `.lastUpdated` semantics:** These properties have defined meaning only
   in the context of a fetch — they represent the most recently fetched value and its
   timestamp. Adding them to `<timer>` would burden `<timer>` with fetch-specific
   semantics irrelevant to non-fetch uses.
3. **E-LIFECYCLE-012:** `<poll>` without a body is always an error (a poll that fetches
   nothing is nonsensical). `<timer>` without a body is merely a warning (W-LIFECYCLE-002)
   because a no-body timer might be used for tick-counting via `<#id>.tickCount`.

If a future revision determines that `<poll>` cannot justify these three distinctions, the
alternative is to remove `<poll>` and add `.value` and `.lastUpdated` to `<timer>` as
optional properties (see Alternatives, §6.7.14).

#### Syntax

`<poll>` is a built-in state type for periodic data fetching. It is a timer that is
specialized for the pattern of calling a function on an interval and storing the result.

```
poll-decl    ::= '<poll' poll-attrs '>' poll-body '/'
poll-attrs   ::= (id-attr)? interval-attr (running-attr)?
poll-body    ::= '$' '{' logic-content '}'
```

The `interval` attribute is required (same constraints as `<timer>`). The poll body is
a `${}` logic block that executes on each tick.

```scrml
<poll id="serverTime" interval=10000>
    ${ @serverTime = fetchServerTime() }
</>
```

#### Semantics

`<poll>` is syntactically and semantically a `<timer>` with the additional constraint
that its body is expected to perform a data fetch. The distinction is declarative intent:
`<timer>` for general periodic logic, `<poll>` for periodic data loading. The compiler
does not enforce that the body of a `<poll>` actually fetches data, but it SHALL emit
W-LIFECYCLE-004 if the `<poll>` body contains no function call (which would indicate the
poll body has no observable data-loading effect).

`<poll>` instances support the same `<#id>` reference properties as `<timer>`, plus:

| Property | Type | Description |
|----------|------|-------------|
| `<#id>.value` | any | The last value assigned by the poll body. See rules below. |
| `<#id>.lastUpdated` | number | Timestamp (ms since epoch) of the most recent successful tick |
| `<#id>.running` | boolean | Whether the poll is active |

**Rules for `<#id>.value`:**
- If the poll body contains exactly one assignment expression (`@variable = expr`),
  `<#id>.value` reflects the value most recently assigned by that expression.
- If the poll body contains zero assignment expressions or more than one assignment
  expression, `<#id>.value` is `undefined`. The compiler SHALL emit W-LIFECYCLE-008
  when a `<poll>` body contains multiple assignment expressions, because the developer
  may believe `.value` reflects one of them when it will be `undefined` for all.
- If the body calls a server function and the call fails, `value` retains its previous
  value. The error propagates through the poll body's error context (§19).

```scrml
<poll id="price" interval=5000>
    ${ @currentPrice = fetchPrice(@tickerId) }
</>

<p>Price: ${<#price>.value}</>
<p>As of: ${<#price>.lastUpdated}</>
```

#### Async Tick Behavior

The same async tick queuing default from §6.7.5 applies to `<poll>` identically. All
behavior under SPEC-ISSUE-012 applies.

#### Normative Statements

All normative statements for `<timer>` (§6.7.5) apply to `<poll>`.

- The compiler SHALL emit E-LIFECYCLE-012 if a `<poll>` element has no logic body.
- The compiler SHALL emit W-LIFECYCLE-004 if a `<poll>` body contains no function call.
- `<#id>.value` SHALL reflect the value of the most recent single-assignment expression
  in the poll body. If the body contains zero or multiple assignment expressions, `value`
  SHALL be `undefined`.
- The compiler SHALL emit W-LIFECYCLE-008 if a `<poll>` body contains multiple assignment
  expressions.

---

### 6.7.7 `<request>` — Single-Shot Async Fetch State Type

#### Complexity Budget Justification

`<request>` is a distinct built-in state type from `<poll>` for the following reasons:

1. **Trigger model:** `<poll>` executes on an interval. `<request>` executes once on mount, then re-executes only when its declared reactive dependencies change. Unifying them on a single element would require a mandatory `interval` attribute that means nothing for one-shot fetches, or an optional `interval` that bifurcates `<poll>` semantics.
2. **Four first-class state attributes:** `loading`, `data`, `error`, and `stale` are meaningful only for a one-shot fetch with a defined "settled" condition. `<poll>` has no notion of settled state — it perpetually re-fetches.
3. **Rendering tier split:** The compiler uses `<request>` declarations to identify the boundary between a loading-tier render and a data-tier render. `<poll>` does not create this boundary because a `<poll>` value is always available.

If a future revision determines that `<request>` cannot justify all three distinctions, the alternative is to add `loading`, `data`, `error`, and `stale` as optional properties of `<poll>` governed by the absence of `interval` (see Alternatives, §6.7.14).

#### Syntax

`<request>` is a built-in state type for single-shot async data fetching. It is declared as a child element of any element scope. The element body is a `${}` logic block containing the fetch expression.

```
request-decl  ::= '<request' request-attrs '>' request-body '/'
               | '<request' request-attrs '/>'

request-attrs ::= id-attr (deps-attr)?
id-attr       ::= 'id=' string-literal
deps-attr     ::= 'deps=' '[' deps-list ']'
deps-list     ::= ('@' identifier (',' '@' identifier)*)?

request-body  ::= '$' '{' assignment-expression '}'
```

The `id` attribute is required (E-LIFECYCLE-018). The body SHALL contain exactly one assignment expression of the form `@variable = expr`.

The `deps` attribute is optional. When absent, the compiler infers reactive dependencies from `@variable` reads within the fetch expression. When present, `deps` overrides inference.

```scrml
// Minimal — fetches on mount, re-fetches when @userId changes (inferred)
<request id="profile">
    ${ @user = fetchUser(@userId) }
</>

// Explicit deps — re-fetches when @page or @filter changes
<request id="results" deps=[@page, @filter]>
    ${ @items = fetchItems(@page, @filter) }
</>

// Fetch on mount only — no reactive deps
<request id="config" deps=[]>
    ${ @appConfig = fetchConfig() }
</>
```

#### Semantics

**Mount behavior:** When a `<request>` mounts, in order:

1. `<#id>.loading` is set to `true`.
2. `<#id>.data` retains its previous value if one exists, or is `not` on first mount.
3. `<#id>.error` is set to `not`.
4. `<#id>.stale` is set to `true` if `<#id>.data` is not `not`, otherwise `false`.
5. The fetch body executes asynchronously.

**Settled state (success):**

1. `<#id>.loading` → `false`.
2. `<#id>.data` → resolved value.
3. `<#id>.error` remains `not`.
4. `<#id>.stale` → `false`.

**Settled state (failure):**

1. `<#id>.loading` → `false`.
2. `<#id>.data` retains previous value (does NOT become `not` on error).
3. `<#id>.error` → caught error value.
4. `<#id>.stale` → `false`.

**Re-execution:** The fetch re-executes when:

- Any inferred `@variable` dependency changes, OR
- Any `@variable` in `deps=` changes, OR
- `<#id>.refetch()` is called.

On re-execution, `<#id>.data` is NOT cleared. `stale` is `true` during re-fetch if prior data exists.

**Destroy behavior:** On scope destroy, in-flight results are discarded. The compiler SHALL generate a cancellation guard.

**`<request>` is not a loop.** Unlike `<timer>` and `<poll>`, the body executes once on mount, then only on dependency change or `refetch()`.

#### Properties

| Property / Method | Type | Description |
|---|---|---|
| `<#id>.loading` | `boolean` | `true` while fetch is in flight |
| `<#id>.data` | `T \| not` | Most recent successful fetch result, or `not` before first success |
| `<#id>.error` | `Error \| not` | Error from most recent failed fetch, or `not` |
| `<#id>.stale` | `boolean` | `true` when data exists AND a new fetch is in flight |
| `<#id>.refetch()` | `() -> void` | Imperatively re-execute the fetch body |

**`stale` does not imply cache TTL.** Staleness is point-in-time: data exists and a fetch is in flight. No cache expiration, no max-age, no background revalidation. Cache semantics are a stdlib concern.

#### Integration with E-RI-002

The `<request>` body calls a server function. E-RI-002 does NOT apply to the single declared assignment in a `<request>` body — it is the sanctioned, compiler-managed write point. Additional `@variable` assignments in the body trigger E-RI-002 normally (and E-LIFECYCLE-020).

#### Edge Cases

**EC-1: Error then refetch.** A dependency change or `refetch()` clears `<#id>.error` to `not` and begins a new loading cycle. `<#id>.data` retains its value.

**EC-2: Rapid dependency changes.** Each change starts a new fetch. Previously in-flight fetches are superseded — only the most recently initiated fetch's result is applied. The compiler SHALL generate a sequence number per `<request>` instance.

**EC-3: Scope destroyed during in-flight fetch.** The resolution is discarded. The compiler SHALL generate a mounted-guard check.

**EC-4: `refetch()` while loading.** Starts a new fetch immediately, superseding the in-flight one (same as EC-2).

**EC-5: No reactive deps, no `refetch()`.** Fetch executes once on mount. Valid. The compiler SHALL emit W-LIFECYCLE-013 when a body references no reactive `@variables` and `deps=` is absent or empty (suppressed by explicit `deps=[]`).

**EC-6: `<request>` inside `for` iteration.** One instance per item. The compiler SHALL emit W-LIFECYCLE-014.

**EC-7: Optimistic updates.** No built-in mechanism. Developers write directly to the `@variable` before calling `refetch()`.

#### Normative Statements

- A `<request>` SHALL start its fetch automatically on mount.
- A `<request>` SHALL discard in-flight results on scope destroy.
- The compiler SHALL generate a mounted-guard check in every `<request>` resolution.
- The compiler SHALL generate a sequence number for every `<request>` instance (EC-2, EC-4).
- `<#id>.data` SHALL NOT be cleared on re-fetch. It SHALL retain its previous value until the new fetch settles.
- `<#id>.error` SHALL be reset to `not` at the start of each new fetch.
- `<#id>.stale` SHALL be `true` iff `<#id>.data` is not `not` and a fetch is in flight.
- The compiler SHALL NOT emit E-RI-002 for the single declared assignment in a `<request>` body.
- The compiler SHALL emit E-LIFECYCLE-018 if `<request>` has no `id` attribute.
- The compiler SHALL emit E-LIFECYCLE-019 if `<request>` is self-closing (no body).
- The compiler SHALL emit E-LIFECYCLE-020 if the body contains more than one assignment.
- The compiler SHALL emit E-LIFECYCLE-021 if the body contains logic but no `@var = expr`.
- The compiler SHALL emit E-LIFECYCLE-022 if a `deps=` entry names an undeclared or non-`@` variable.
- The compiler SHALL emit E-LIN-006 if a `lin` variable is referenced in a `<request>` body.
- The compiler SHALL emit W-LIFECYCLE-011 if the assigned `@variable` is never read in enclosing markup.
- The compiler SHALL emit W-LIFECYCLE-012 if `<#id>.refetch()` is called inside a `<timer>` or `<poll>` body.
- The compiler SHALL emit W-LIFECYCLE-013 when no reactive deps and no explicit `deps=[]`.
- The compiler SHALL emit W-LIFECYCLE-014 when `<request>` is inside a `for/lift` loop.

#### Worked Examples

**Example 1 — User profile with loading and error states**

```scrml
<program>
    @userId = 42

    <request id="profile">
        ${ @user = fetchUser(@userId) }
    </>

    <div>
        if (<#profile>.loading && not <#profile>.stale) {
            lift <p>Loading...</>
        } else if (<#profile>.error) {
            lift <p>Error: ${<#profile>.error.message}</>
            lift <button onclick=${<#profile>.refetch()}>Retry</>
        } else {
            lift <h1>${@user.name}</>
            lift <p>${@user.email}</>
        }
    </>
</>
```

**Example 2 — Fetch-once configuration**

```scrml
<program>
    <request id="config" deps=[]>
        ${ @appConfig = fetchConfig() }
    </>

    <div>
        if (@appConfig == not) {
            lift <p>Loading config...</>
        } else {
            lift <div class="app">
                /* render using @appConfig *</>
            </>
        }
    </>
</>
```

#### New Error/Warning Codes

| Code | Trigger | Severity |
|---|---|---|
| E-LIFECYCLE-018 | `<request>` has no `id` attribute | Error |
| E-LIFECYCLE-019 | `<request>` is self-closing (no body) | Error |
| E-LIFECYCLE-020 | `<request>` body has multiple assignments | Error |
| E-LIFECYCLE-021 | `<request>` body has logic but no `@var = expr` | Error |
| E-LIFECYCLE-022 | `deps=` entry names undeclared or non-`@` variable | Error |
| E-LIN-006 | `lin` variable in `<request>` body | Error |
| W-LIFECYCLE-011 | Assigned `@variable` never read in enclosing markup | Warning |
| W-LIFECYCLE-012 | `refetch()` called inside `<timer>`/`<poll>` body | Warning |
| W-LIFECYCLE-013 | No reactive deps, no explicit `deps=[]` | Warning |
| W-LIFECYCLE-014 | `<request>` inside `for/lift` loop | Warning |

### 6.7.8 `<timeout>` — Single-Shot Timer State Type

#### Complexity Budget Justification

`<timeout>` is a distinct built-in state type from `<timer>` for the following reasons,
which constitute its earned complexity budget:

1. **One-shot semantics:** `<timer>` fires repeatedly on every interval tick. `<timeout>`
   fires exactly once, then stops. Adding a one-shot mode to `<timer>` via a `once=true`
   attribute would require `<timer>` to carry both perpetual and one-shot execution models,
   making the element's default behavior conditional on an attribute — a reader-hostile
   design. `<timeout>` declares its intent unambiguously.
2. **No `interval` — `delay` instead:** `<timer>` requires `interval`. `<timeout>` requires
   `delay`. The distinct attribute name prevents the most common confusion between the two
   (using `<timeout>` where `<timer>` was intended or vice versa).
3. **`.fired` state:** `<timeout>` exposes a `.fired` boolean property that reports whether
   the one-shot has executed. This property has no meaningful parallel for `<timer>` (which
   has `.tickCount` instead). Merging the two would require documenting which properties are
   relevant in which mode.

If a future revision determines that `<timeout>` cannot justify these distinctions, the
alternative is to retire `<timeout>` and add `once=true` to `<timer>`. See §6.7.14
(Alternatives).

#### Syntax

`<timeout>` is a built-in state type. It is declared as a child element of any element
scope.

```
timeout-decl  ::= '<timeout' timeout-attrs '>' logic-block '/'
                | '<timeout' timeout-attrs '/>'

timeout-attrs ::= (id-attr)? delay-attr

id-attr       ::= 'id=' string-literal
delay-attr    ::= 'delay=' integer-literal
```

The `delay` attribute value is in milliseconds and SHALL be a positive integer literal
or a constant expression. It SHALL NOT be a reactive `@variable` reference (the delay
is fixed at compile time for a given `<timeout>` instance). To vary the delay at runtime,
use `if=` to destroy and re-create the timeout with a different `delay` value.

The `id` attribute is required when the timeout instance is referenced by `<#id>` elsewhere
in the same scope. It is optional when the timeout is self-contained.

`<timeout>` has no `running` attribute. A timeout either fires or has been cancelled.
Use `<#id>.cancel()` to prevent firing.

```scrml
// Minimal timeout — fires once after 5000ms
<timeout delay=5000>
    ${ @sessionExpired = true }
</>

// Named timeout — supports .cancel() and .fired
<timeout id="paymentGuard" delay=10000>
    ${ @paymentTimedOut = true }
</>

// Cancellable on user action
<button onclick=${<#paymentGuard>.cancel()}>Cancel</>
<p if=@paymentTimedOut>Payment window expired.</>
```

#### Semantics

- A `<timeout>` instance is armed when its enclosing scope mounts (or when added to the
  DOM via `if=`).
- After `delay` milliseconds, the timeout fires: its body (the `${}` logic block) executes
  exactly once, and `<#id>.fired` is set to `true`.
- The timeout SHALL NOT fire more than once. After firing, the timeout is permanently
  disarmed. No `running` attribute, no reset mechanism.
- If `<#id>.cancel()` is called before the delay elapses, the timeout is cancelled. Its
  body SHALL NOT execute. `<#id>.fired` remains `false`.
- `cancel()` called after the timeout has already fired has no effect. `<#id>.fired`
  remains `true`.
- When the enclosing scope destroys, any armed timeout in that scope is automatically
  cancelled as part of the canonical teardown sequence (§6.7.2, step 2). No explicit
  `cleanup()` is required.
- A `<timeout>` with no logic body (self-closing form `<timeout delay=5000/>`) is valid
  but produces W-LIFECYCLE-002 (same code reused: state type has no body and no observable
  effect).

#### Async Body Behavior

When a `<timeout>` body calls a server-inferred function, the body executes asynchronously.
The timeout has already fired (it will not re-fire) before the server call returns. If the
enclosing scope is destroyed while the server call is in flight, the result SHALL be
discarded. The compiler SHALL generate a mounted-guard check in the async continuation
of every `<timeout>` body that contains a server call.

#### Referencing a Timeout Instance

A named `<timeout>` may be referenced using the `<#id>` reference syntax. The following
properties and methods are available:

| Property / Method | Type | Description |
|---|---|---|
| `<#id>.fired` | `boolean` | `true` after the body has executed; `false` before firing or after cancel |
| `<#id>.cancel()` | `() -> void` | Prevent the timeout from firing. No-op if already fired. |

```scrml
<timeout id="paymentGuard" delay=10000>
    ${ @paymentTimedOut = true }
</>

when <#paymentGuard>.fired changes {
    ${ logPaymentTimeout() }
}

<p>${<#paymentGuard>.fired ? "Expired" : "Active"}</>
```

**`.fired` is reactive.** The compiler SHALL emit the assignment to `<#id>.fired` through
the reactive system so that any markup or `when` block that reads `<#id>.fired`
re-evaluates after the timeout fires.

#### `<timeout>` Inside `for` Iteration

If a `<timeout>` is declared inside a `for` iteration body, one timeout instance is created
per iteration. The compiler SHALL emit W-TIMEOUT-001 when a `<timeout>` is detected inside
a `for/lift` loop body, because this pattern typically indicates accidental N-timeout
creation rather than intentional per-item timeouts.

#### Interaction with Scope Destroy (EC-1)

If a `<timeout>` is armed and the enclosing scope is conditionally mounted (via `if=`) and
the `if=` condition becomes `false` before the delay elapses, the timeout is cancelled
during the canonical teardown sequence (§6.7.2, step 2). If the scope re-mounts (`if=`
returns `true`), a NEW timeout instance is armed from the moment of re-mount, not from the
original arm time. The original delay restarts from zero.

#### Interaction with `lin` (EC-2)

A `lin` variable SHALL NOT be referenced inside a `<timeout>` body. The body of a
`<timeout>` is a deferred execution context — it runs after the surrounding code has
completed. A `lin` variable consumed in a `<timeout>` body would be consumed at an
unpredictable future time, violating the straight-line consumption requirement. The
compiler SHALL emit E-LIN-004 if a `lin` variable is referenced inside a `<timeout>` body.

#### Normative Statements

- A `<timeout>` instance SHALL arm automatically when its enclosing scope mounts.
- A `<timeout>` instance SHALL disarm automatically when its enclosing scope destroys
  (§6.7.2, step 2), preventing firing after teardown.
- The `<timeout>` body SHALL execute exactly once, after `delay` milliseconds from arm time.
- After the body executes, `<#id>.fired` SHALL be set to `true` through the reactive system.
- `<#id>.fired` SHALL be `false` at arm time and SHALL remain `false` if `cancel()` is
  called before the delay elapses.
- `<#id>.cancel()` SHALL prevent the body from executing if called before the delay elapses.
  If called after the body has already executed, it SHALL have no effect.
- The compiler SHALL emit E-TIMEOUT-001 if the `delay` attribute is absent.
- The compiler SHALL emit E-TIMEOUT-002 if the `delay` attribute value is zero or negative.
- The compiler SHALL emit E-TIMEOUT-003 if `<timeout>` is used outside any element scope
  (as defined in §6.7.2). `<timeout>` requires an element scope for automatic cancellation.
- The compiler SHALL emit W-TIMEOUT-001 if `<timeout>` is detected inside a `for/lift`
  loop body.
- The `<timeout>` body SHALL execute within the reactive context of its enclosing scope.
  Writes to `@variables` inside the body SHALL trigger reactive updates exactly as if the
  write occurred in a `${}` logic block.
- The compiler SHALL generate a mounted-guard check in the async continuation of any
  `<timeout>` body that contains a server call, discarding results if the scope is
  destroyed before the call returns.
- The compiler SHALL emit E-LIN-004 if a `lin` variable is referenced inside a `<timeout>`
  body.

#### Worked Examples

**Example 1 — Valid: Session expiry guard**

```scrml
<program>
    @sessionExpired = false

    <timeout id="sessionGuard" delay=1800000>
        ${ @sessionExpired = true }
    </>

    <div if=@sessionExpired class="expired-banner">
        <p>Your session has expired. </>
        <button onclick=${location.reload()}>Refresh</>
    </>

    // Cancel on any user activity
    <div onclick=${<#sessionGuard>.cancel()}>
        ${/* app content */}
    </>
</>
```

Expected compiler output: one `setTimeout` call, a `clearTimeout` call in scope teardown,
and a reactive write to `<#sessionGuard>.fired` after the delay elapses. The `@sessionExpired`
write inside the body triggers reactive re-render of the conditional `<div>`.

**Example 2 — Invalid: missing `delay` attribute**

```scrml
<timeout id="guard">
    ${ @timedOut = true }
</>
```

```
Error E-TIMEOUT-001 at line 1: `<timeout>` requires a `delay` attribute.
  Add `delay=<milliseconds>` to specify when the timeout fires.
  Example: <timeout id="guard" delay=5000>
```

**Example 3 — Valid: Cancellable payment window**

```scrml
<program>
    @paymentTimedOut = false

    <timeout id="paymentGuard" delay=10000>
        ${ @paymentTimedOut = true }
    </>

    <div>
        <p if=@paymentTimedOut>Payment window has closed.</>
        <p if=${!@paymentTimedOut}>Complete your payment.</>
        <button onclick=${<#paymentGuard>.cancel()}>Cancel Payment</>
    </>
</>
```

**Example 4 — Invalid: `delay=0`**

```scrml
<timeout delay=0>
    ${ doSomething() }
</>
```

```
Error E-TIMEOUT-002 at line 1: `delay` must be a positive integer (milliseconds).
  `delay=0` is not valid. Use `delay=1` or higher.
```

#### Error and Warning Codes

| Code | Trigger | Severity |
|---|---|---|
| E-TIMEOUT-001 | `<timeout>` missing `delay` attribute | Error |
| E-TIMEOUT-002 | `delay` attribute is zero or negative | Error |
| E-TIMEOUT-003 | `<timeout>` used outside any element scope | Error |
| W-TIMEOUT-001 | `<timeout>` declared inside a `for/lift` loop body | Warning |

#### Interaction Notes

- **§6.7.2 (Scope Model):** `<timeout>` participates in the canonical teardown sequence.
  Armed timeouts are disarmed in step 2 (alongside `<timer>` and `<poll>` stops), before
  `cleanup()` callbacks run.
- **§6.7.5 (`<timer>`):** `<timer>` fires repeatedly; `<timeout>` fires once. Use `<timer>`
  for periodic logic and `<timeout>` for deferred one-shot actions.
- **§6.7.9 (`animationFrame`):** `animationFrame` and `<timeout>` both schedule deferred
  execution, but they operate in different scheduling domains. `animationFrame` is
  frame-rate-aligned. `<timeout>` is wall-clock-aligned. They SHALL NOT be used
  interchangeably.
- **§35 (Linear Types — `lin`):** `lin` variables are prohibited inside `<timeout>` bodies.
  E-LIN-004 applies (deferred execution context). See §35 for the full `lin` rule set.
- **§6.3 (Reactive Semantics):** Writes to `@variables` inside a `<timeout>` body trigger
  reactive updates through the standard reactive write path. The `<timeout>` body is a
  deferred reactive write site.

---

### 6.7.9 `animationFrame()` — Animation Loop Scheduling

`animationFrame(fn)` is a compiler-recognized built-in function for scheduling animation
loops. It is not a state type. It is a procedural construct because animation loops have
no identity, no attributes, and no pauseable state — they are just recursive callbacks.

```
animationFrame-call ::= 'animationFrame' '(' expression ')'
```

The argument SHALL be a function reference or function expression. The named function
reference form is required for recursive loops (a function must call `animationFrame` with
itself to continue looping).

#### `animationFrame()` Outside Element Scope

`animationFrame()` requires a scope for automatic cancellation. The compiler SHALL emit
E-LIFECYCLE-017 if `animationFrame()` is called outside any element scope (as defined in
§6.7.2).

```scrml
<canvas ref=@canvasEl width="800" height="600">
    ${
        function draw() {
            const ctx = @canvasEl.getContext('2d')
            ctx.clearRect(0, 0, 800, 600)
            for (shape of @shapes) {
                lift ctx.strokeRect(shape.x, shape.y, shape.w, shape.h)
            }
            animationFrame(draw)
        }
        animationFrame(draw)
    }
</>
```

#### Reactive Behavior Inside `animationFrame` Callbacks

**animationFrame callbacks are NOT reactive subscribers.** Reads of `@variables` inside
an `animationFrame` callback return the current value of the variable at frame time. They
do NOT create reactive subscriptions. The callback is NOT re-scheduled by the reactive
system when a referenced `@variable` changes.

This is a deliberate design choice: animation loops run on frame timing (60fps or display
refresh rate), not on state change events. If the loop were also a reactive subscriber,
a high-frequency state update (e.g., a physics simulation updating `@shapes` many times
per second) would schedule redundant rAF callbacks. The loop already reads fresh state
on every frame; no reactive wiring is needed or wanted.

SPEC-ISSUE-013 is closed by this normative statement. The resolution is: animationFrame
callbacks are frame-timed, not reactivity-timed, and do not subscribe to `@variables`.

Normative statement: The compiler SHALL NOT emit reactive subscription wiring for `@variable`
reads inside an `animationFrame` callback body.

#### Semantics

- `animationFrame(fn)` schedules `fn` to be called before the next repaint, using the
  browser's `requestAnimationFrame` mechanism.
- The compiler SHALL associate each `animationFrame()` call with its enclosing element
  scope. When that scope destroys, any pending frame for that scope SHALL be cancelled
  automatically (§6.7.2, step 4).
- If a function calls `animationFrame(draw)` recursively, the loop continues until the
  scope destroys or the function stops calling `animationFrame(draw)`.
- `animationFrame()` SHALL NOT be called inside a `<timer>` or `<poll>` body. Animation
  frames and interval timers serve different scheduling domains. The compiler SHALL emit
  E-LIFECYCLE-013 if this is detected.
- `animationFrame()` SHALL NOT be called inside a server-escalated function body (§12).
  The compiler SHALL emit E-LIFECYCLE-014 if this is detected.

#### Normative Statements

- animationFrame callbacks are NOT reactive subscribers. The compiler SHALL NOT emit
  reactive subscription wiring for `@variable` reads inside an animationFrame callback.
- The compiler SHALL emit E-LIFECYCLE-015 if `animationFrame()` is called with zero
  arguments or with a non-function-typed argument.
- All pending `animationFrame()` callbacks for a scope SHALL be cancelled on scope
  destruction (§6.7.2, step 4) without requiring an explicit `cleanup()` call.
- The compiler SHALL emit E-LIFECYCLE-017 if `animationFrame()` is called outside any
  element scope.

---

### 6.7.10 Error and Warning Code Summary

| Code | Trigger | Severity |
|------|---------|----------|
| E-LIFECYCLE-001 | `cleanup()`, `<timer>`, or `<poll>` used outside any element scope | Error |
| E-LIFECYCLE-002 | `cleanup()` argument is a call expression, not a function expression | Error |
| E-LIFECYCLE-004 | `cleanup()` first argument is not function-typed | Error |
| E-LIFECYCLE-005 | `cleanup()` inside a function EXPLICITLY annotated as server-side (§12) | Error |
| E-LIFECYCLE-006 | `when` body writes to a variable in the `dep-list` | Error |
| E-LIFECYCLE-007 | `dep-list` entry is not a declared mutable `@variable` in scope, OR is a `const @name` derived variable | Error |
| E-LIFECYCLE-009 | `<timer>` or `<poll>` missing `interval` attribute | Error |
| E-LIFECYCLE-010 | `interval` attribute is zero or negative | Error |
| E-LIFECYCLE-011 | `running` attribute references an undeclared or non-`@` variable | Error |
| E-LIFECYCLE-012 | `<poll>` has no logic body | Error |
| E-LIFECYCLE-013 | `animationFrame()` called inside a `<timer>` or `<poll>` body | Error |
| E-LIFECYCLE-014 | `animationFrame()` called inside a server-escalated function | Error |
| E-LIFECYCLE-015 | `animationFrame()` called with zero arguments or non-function argument | Error |
| E-LIFECYCLE-016 | `when` block nested inside another `when` block body | Error |
| E-LIFECYCLE-017 | `animationFrame()` called outside any element scope | Error |
| W-LIFECYCLE-002 | `<timer>` has no body (self-closing, no observable effect) | Warning |
| W-LIFECYCLE-003 | `<timer>` or `<poll>` declared inside a `for/lift` loop body | Warning |
| W-LIFECYCLE-004 | `<poll>` body contains no function call | Warning |
| W-LIFECYCLE-005 | `<timer>` or `<poll>` body calls a server function and `interval` < 500ms | Warning |
| W-LIFECYCLE-006 | `when` body sole effect is a single `@variable` assignment whose RHS is a pure `@variable` expression; a derived value is strictly superior | Warning |
| W-LIFECYCLE-007 | `running=false` boolean literal on `<timer>` or `<poll>` | Warning |
| W-LIFECYCLE-008 | `<poll>` body contains multiple assignment expressions (`.value` will be `undefined`) | Warning |
| W-LIFECYCLE-009 | `cleanup()` inside a `for` loop body (N registrations will be created) | Warning |
| W-LIFECYCLE-010 | `when` block has an empty body | Warning |
| H-LIFECYCLE-001 | `@variable` read inside `when` body is not in the `dep-list` (off by default; suppressed by `reads @var` annotation) | Hint |
| E-LIN-004 | `lin` variable referenced inside a recurring execution context (`when`, `<timer>`, `<poll>`, or `animationFrame` callback) | Error |

| E-LIFECYCLE-018 | `<request>` has no `id` attribute | Error |
| E-LIFECYCLE-019 | `<request>` is self-closing (no body) | Error |
| E-LIFECYCLE-020 | `<request>` body has multiple assignments | Error |
| E-LIFECYCLE-021 | `<request>` body has logic but no `@var = expr` | Error |
| E-LIFECYCLE-022 | `deps=` entry names undeclared or non-`@` variable | Error |
| E-LIN-006 | `lin` variable in `<request>` body | Error |
| W-LIFECYCLE-011 | Assigned `@variable` never read in enclosing markup | Warning |
| W-LIFECYCLE-012 | `refetch()` called inside `<timer>`/`<poll>` body | Warning |
| W-LIFECYCLE-013 | No reactive deps, no explicit `deps=[]` | Warning |
| W-LIFECYCLE-014 | `<request>` inside `for/lift` loop | Warning |
| E-TIMEOUT-001 | `<timeout>` missing `delay` attribute | Error |
| E-TIMEOUT-002 | `<timeout>` `delay` attribute is zero or negative | Error |
| E-TIMEOUT-003 | `<timeout>` used outside any element scope | Error |
| W-TIMEOUT-001 | `<timeout>` declared inside a `for/lift` loop body | Warning |

**Notes on removed/renamed codes from first draft:**
- E-LIFECYCLE-003 renamed to W-LIFECYCLE-009 (cleanup-in-for is a warning, not an error).
- E-LIFECYCLE-008 renamed to W-LIFECYCLE-006 and severity changed to Warning; condition broadened.
- W-LIFECYCLE-001 (unlisted @var in when body) replaced by H-LIFECYCLE-001 (hint, off by default).
- E-LIN-005 from the first draft is superseded by E-LIN-004, which is defined in §6.7.12 and the §34 lin section. The code E-LIN-005 is not assigned; future §34 additions use E-LIN-004 onwards.

---

### 6.7.11 Worked Examples

#### Example 1 — Valid: Dashboard with Auto-Refresh Timer

```scrml
<program>
    ${ loadDashboard() }

    @autoRefresh = false
    @intervalSecs = 30      // reactive @variable — this is NOT the timer interval attribute
    @countdown = 30

    <timer id="refresh" interval=1000 running=@autoRefresh>
        ${
            @countdown = @countdown - 1
            if (@countdown <= 0) {
                loadDashboard()
                @countdown = @intervalSecs   // reads current value of @intervalSecs
            }
        }
    </>

    <div class="dashboard">
        <p>Next refresh in: ${@countdown}s</>
        <p>Auto-refresh: ${<#refresh>.running ? "on" : "off"}</>
        <button onclick=${@autoRefresh = !@autoRefresh}>
            ${@autoRefresh ? "Pause" : "Resume"}</>
        </>
    </>
</>
```

**Annotation — `@intervalSecs` vs `interval=`:**
`@intervalSecs` is a reactive `@variable` holding a user-configurable countdown target.
`interval=1000` is a compile-time constant specifying the timer tick rate (one tick per
second). These are two different things. The timer ticks every 1000ms regardless of
`@intervalSecs`. `@intervalSecs` is only read inside the tick body to reset the countdown.
Changing `@intervalSecs` at runtime changes the reset target but does NOT change the tick
rate. The tick rate is fixed at compile time for a given `<timer>` instance.

Expected compiler output: one `setInterval` call bound to the `<program>` scope. The
`running=@autoRefresh` attribute generates reactive wiring that calls `clearInterval` and
`setInterval` on `@autoRefresh` transitions. Page unload fires no additional `cleanup()`
callbacks (none were registered).

#### Example 2 — Valid: Conditional Panel with Lifecycle-Scoped Timer

```scrml
<program>
    @showChat = false

    <button onclick=${@showChat = !@showChat}>Toggle Chat</>

    <div class="chat-panel" if=@showChat>
        <timer id="poll" interval=3000>
            ${ @messages = fetchMessages() }
        </>

        cleanup(() => { disconnectFromRoom() })

        <div class="messages">
            ${ for (m of @messages) { lift <p>${m.text}/ } }
        </>
    </>
</>
```

When `@showChat` transitions false → true:
- The `<div class="chat-panel">` scope mounts.
- The `<timer id="poll">` starts.
- The `cleanup()` callback is registered on this scope.

When `@showChat` transitions true → false, the canonical teardown sequence (§6.7.2) fires:
1. No `when` effects in this scope; step 1 is a no-op.
2. The `<timer id="poll">` stops (step 2).
3. `disconnectFromRoom()` fires via the registered `cleanup()` callback (step 3, LIFO).
4. No `animationFrame` callbacks in this scope; step 4 is a no-op.
5. The `<div>` scope destroys.

When `@showChat` transitions false → true a second time:
- All of the above mount behavior repeats exactly.

#### Example 3 — Valid: Multi-Dependency Reactive Effect

```scrml
<program>
    @query = ""
    @minPrice = 0
    @maxPrice = 1000
    @page = 1
    @results = []

    when (@query, @minPrice, @maxPrice) changes {
        @page = 1
        @results = searchItems(@query, @minPrice, @maxPrice)
    }

    <input bind:value=@query placeholder="Search..."/>
    <input bind:value=@minPrice type="number" placeholder="Min price"/>
    <input bind:value=@maxPrice type="number" placeholder="Max price"/>

    <p>Page: ${@page}</>
    ${ for (r of @results) { lift <p>${r.name}/ } }
</>
```

The `when` body does not run on initial mount. The initial `@results = []` is the
starting state. The body runs only when the user changes an input (via `bind:value`).
`searchItems` is a server function; the compiler inserts `await` automatically (§13.2).

Note that `@query`, `@minPrice`, and `@maxPrice` are read inside the body. Because they
are also in the `dep-list`, H-LIFECYCLE-001 does not fire for them. H-LIFECYCLE-001 would
only fire (if enabled) for `@variables` read in the body that are NOT in the dep-list.

#### Example 4 — Invalid: `when` body writes to its own dep-list (E-LIFECYCLE-006)

```scrml
<program>
    @page = 1

    when @page changes {
        @page = 1   // E-LIFECYCLE-006: writes to dep-list variable @page
    }
</>
```

Expected compiler error:

```
E-LIFECYCLE-006: `when` body writes to dependency `@page`, which is also in the dep-list.
This would trigger the effect immediately after each write, creating an infinite loop.
  at line 4: @page = 1
  Dependency listed at: line 3, dep-list entry `@page`
```

#### Example 5 — Invalid: `cleanup()` argument is a call expression (E-LIFECYCLE-002)

```scrml
<program>
    cleanup(closeConnection())   // E-LIFECYCLE-002
</>
```

Expected compiler error:

```
E-LIFECYCLE-002: `cleanup()` argument must be a function expression, not a call expression.
`closeConnection()` calls the function immediately and passes its return value to cleanup().
  at line 2: cleanup(closeConnection())
  Fix: cleanup(() => closeConnection())
```

#### Example 6 — Warning: `when` body is derivable (W-LIFECYCLE-006)

```scrml
<program>
    @price = 10
    @qty = 2
    @total = 0

    when @price changes {
        @total = @price * @qty   // W-LIFECYCLE-006
    }
</>
```

W-LIFECYCLE-006 fires here because:
1. The body's only effect is a single `@variable` assignment (`@total = ...`).
2. The RHS (`@price * @qty`) is a pure expression of `@variables`.

Note that `@qty` is NOT in the dep-list (`dep-list` contains only `@price`). The broadened
condition captures this case: the RHS reads `@variables` (whether or not all are in the
dep-list), and the result is a pure derivation.

Expected compiler warning:

```
W-LIFECYCLE-006: `when` body computes a derived value that can be expressed as a derived
reactive binding. Replace with:
  const @total = @price * @qty
This form is reactive, executes on initial mount, and requires no explicit dep-list.
  at line 6: when @price changes { @total = @price * @qty }
```

W-LIFECYCLE-006 fires only when the body is exactly and solely a single derivable
assignment. If the body also has side effects (server calls, navigation, writing to
unrelated variables), W-LIFECYCLE-006 does NOT fire.

#### Example 7 — Valid: `<poll>` with reference properties

```scrml
<program>
    @tickerId = "AAPL"
    @currentPrice = not

    <poll id="price" interval=5000>
        ${ @currentPrice = fetchPrice(@tickerId) }
    </>

    <p>Price: ${@currentPrice ?? "Loading..."}</>
    <p>Last updated: ${<#price>.lastUpdated}</>
    <p>Fetched ${<#price>.tickCount} times</>
</>
```

#### Example 8 — Valid: Canvas Animation Loop

```scrml
<program>
    @shapes = []

    <canvas ref=@canvasEl width="800" height="600">
        ${
            function draw() {
                const ctx = @canvasEl.getContext('2d')
                ctx.clearRect(0, 0, 800, 600)
                for (shape of @shapes) {
                    lift ctx.strokeRect(shape.x, shape.y, shape.w, shape.h)
                }
                animationFrame(draw)
            }
            animationFrame(draw)
        }
    </>
</>
```

**Annotation — reactive behavior:** The read of `@shapes` inside `draw()` does NOT create
a reactive subscription. The `draw` function is an `animationFrame` callback; per §6.7.9,
animationFrame callbacks are not reactive subscribers. `@shapes` is read at frame time
(the current value when the frame fires), not at state-change time. If `@shapes` changes
between frames, the next frame will see the new value without any reactive wiring.
This is the correct behavior: the animation loop reads fresh state every frame; no
reactive subscription is needed.

The `<canvas>` element is not conditionally rendered here, so its scope is permanent
(destroyed only on page unload). The animation loop runs for the lifetime of the page.

#### Example 9 — Valid: `cleanup()` de-escalation via imported function

```scrml
// In network.scrml
export fn openConnection(url) {
    const ws = new WebSocket(url)
    cleanup(() => ws.close())   // cleanup() inside this function => RI classifies as client-side
    return ws
}

// In app.scrml
<div if=@connected>
    ${ const conn = openConnection(@serverUrl) }
</>
```

`openConnection` contains `cleanup()`. Route Inference classifies it as client-side. It
is not server-escalated. When the `<div if=@connected>` scope destroys, `ws.close()` fires.

#### Example 10 — Edge Case EC-2: Conditional cleanup accumulation

```scrml
<program>
    @count = 0
    @enabled = true

    ${
        if (@enabled) {
            cleanup(() => { console.log("cleanup", @count) })
        }
    }
</>
```

The bare expression containing the `if` block runs once on mount. If `@enabled` is `true`
at mount time, one `cleanup()` is registered. If `@enabled` is `false`, no cleanup is
registered. The `if` is evaluated once (at mount); `@enabled` is not a trigger for
re-evaluating this block (that would require a `when @enabled changes` block). The cleanup
count is determined at mount time by the state of `@enabled` at that moment.

If the developer intends cleanup registration to respond to `@enabled` changes, they must
use `when @enabled changes { if (@enabled) { cleanup(...) } }`. This is outside the scope
of this example but is a valid pattern.

---

### 6.7.12 Interaction Notes

- **§6.3 (Reactive Semantics):** Writes to `@variables` inside `<timer>` bodies, `<poll>`
  bodies, and `when` blocks obey all §6.3 reactive rules. A write to `@messages` inside a
  timer body triggers the same downstream reactive updates as a write from a user event
  handler.

- **§6.6 (Derived Reactive Values):** `const @name` derived values and `when` blocks are
  complementary, not competing. `const @name` is for value derivation (lazy pull, no side
  effects). `when` is for side effects triggered by state change (push, explicit triggers).
  W-LIFECYCLE-006 enforces this boundary at compile time. Cross-reference §6.6.5 for
  derived value invalidation and the flush ordering guarantee described in §6.7.4.

- **§12 (Route Inference):** `cleanup()` and `when` are always client-side constructs. A
  function containing `cleanup()` SHALL be classified as client-side by RI (§6.7.3).
  `<timer>` and `<poll>` bodies are always client-side; their tick handlers run in the
  browser, though they MAY call server-inferred functions (which the CPS transform handles
  per §13).

- **§13 (Async Model):** `<timer>` and `<poll>` bodies that call server-inferred functions
  are async. The compiler inserts `await` automatically. The concurrent-tick model is
  deferred to SPEC-ISSUE-012. Until resolved, implementations SHALL queue new ticks rather
  than running them concurrently. W-LIFECYCLE-005 applies when interval < 500ms and the
  body calls a server function.

- **§17.1 (`if=`):** Conditional rendering is the primary mechanism for element-scoped
  lifecycle. When `if=@condition` toggles false → true, the element scope mounts, its
  `<timer>` instances start, and its bare expressions re-run. When it toggles true →
  false, the scope destroys in canonical order (§6.7.2): when effects, then timers, then
  cleanup callbacks (LIFO), then animationFrame cancellations.

- **§17.3 (Lifecycle of Bare Expressions):** Bare expressions in a `${}` block execute
  on mount. They are the "run once at mount" mechanism. `when` blocks execute on change,
  not on mount. These two mechanisms are complementary, not redundant. SPEC-ISSUE-010
  (whether bare expressions re-execute on reactive dependency change) remains open and
  does not affect the `when` construct, which has independent, fully specified trigger
  semantics.

- **§30 (Dependency Graph):** The compiler adds edges to the dependency graph for:
  (a) each `@variable` in a `when` dep-list → the `when` effect as a dependent, and
  (b) each `<timer running=@var>` running attribute → the timer's start/stop behavior.
  These edges are constructed in Stage 7 (graph construction) alongside derived value
  edges (§6.6.3). animationFrame callbacks do NOT add edges to the dependency graph
  for `@variable` reads inside the callback.

- **§34 (`lin`):** A `lin` variable SHALL NOT be consumed inside a `when` body, a
  `<timer>` body, a `<poll>` body, or an `animationFrame` callback. These contexts may
  execute more than once per scope lifetime, and a `lin` variable must be consumed exactly
  once. The compiler SHALL emit E-LIN-004 if a `lin` variable is read inside any of these
  recurring execution contexts. E-LIN-004 is the recurring-context form of E-LIN-002
  (multi-consumption), recorded in §34.5.

---

### 6.7.13 Open Spec Issues

The following questions are not resolved by this section and SHALL be tracked as open spec
issues. Issues are assigned real numbers; the corresponding files SHALL be created in
`docs/spec-issues/`.

**SPEC-ISSUE-010: `if=` remount and bare expression re-execution.**
This section specifies that a scope that remounts re-runs all bare expressions. §17.3
currently says bare expressions run at "initial render." "Initial render" is ambiguous:
does it mean first mount ever, or first mount of the current scope lifetime? This section
assumes the latter (re-runs on each mount, including re-mount). This assumption must be
ratified in §17.3 as part of closing SPEC-ISSUE-009. SPEC-ISSUE-010 tracks the dependency.

**SPEC-ISSUE-011: `<timer>` interval reactivity.**
This section specifies that `interval` is a compile-time constant. A developer may want
`<timer interval=@userSetting>` where the interval is reactive. The current decision
defers this: to change interval, use `if=` to destroy and recreate the timer. This
limitation is explicitly tracked. It may be revisited once the core timer codegen is
stable.

Acceptance criteria: Either (a) add a normative statement prohibiting reactive `interval`
permanently with rationale, or (b) specify the semantics of reactive `interval` fully,
including what happens to in-flight ticks when the interval changes, and update the
grammar accordingly.

**SPEC-ISSUE-012: Concurrent timer ticks.**
When a `<timer>` or `<poll>` body calls an async server function and the next tick fires
before the previous call resolves, the queuing model (queue, skip, or cancel prior call)
must be fully specified before the timer codegen pass is implemented.

The safe default installed by this section is: queue the new tick; the body does not
execute again until the previous execution completes. W-LIFECYCLE-005 applies.

Acceptance criteria: The resolution must specify: (1) which queuing strategy is normative
(queue/skip/cancel), (2) whether the strategy is configurable per `<timer>` instance via
an attribute, (3) what happens to queued ticks if the scope destroys while a tick is
in-flight, and (4) whether tick-count (`<#id>.tickCount`) counts queued ticks or only
completed ticks.

**SPEC-ISSUE-013: `animationFrame()` and reactive state reads — RESOLVED.**
Status: Closed. Resolution: animationFrame callbacks are NOT reactive subscribers. Reads
of `@variables` inside an animationFrame callback return the current value at frame time
and do NOT create reactive subscriptions. This is normative in §6.7.9. No spec issue file
is needed; this entry records the closure.

---

### 6.7.14 Alternatives Considered

This section records design alternatives that were evaluated and rejected for each
mechanism. The rejections are normative: they explain why the current design is correct
and guard against future re-proposals of the same alternatives.

#### A.1 `when` vs Auto-Tracking Effects

**Alternative:** Omit the explicit `dep-list` from `when`. The compiler auto-tracks every
`@variable` read inside the effect body, as Svelte 5 does with `$effect()` and Vue 3 does
with `watchEffect()`.

**Rejected because:**
1. Auto-tracking violates the readability principle: a developer reading the source cannot
   determine which state changes trigger the effect without compiler introspection.
2. Auto-tracking makes refactoring dangerous: adding a read of `@variable` inside the
   body silently adds a new trigger.
3. scrml's explicit-dependency model is consistent with `bind:value` and the dep-list for
   derived values. Introducing implicit tracking for `when` would create an inconsistency
   within the language.
4. The `reads @var` annotation in the explicit model provides a documented escape hatch
   for non-trigger reads, which is more explicit than suppression comments in auto-tracking
   systems.

#### A.2 `<timer>` vs `setInterval` Passthrough

**Alternative:** Expose `setInterval` directly via `^{}` meta context and require
developers to manage interval IDs and `clearInterval` calls manually (possibly via
`cleanup()`).

**Rejected because:**
1. Manual `setInterval`/`clearInterval` is a well-documented source of memory leaks when
   developers forget the `clearInterval` call.
2. `<timer>` as a state type integrates with the scope model automatically; the timer
   stops when the scope destroys without developer action.
3. `<timer>` is declarative in the markup tree, making it visible to readers and tools.
   A `^{ setInterval(...) }` call is invisible to the dependency graph and tooling.
4. `^{}` passthrough remains available for advanced cases where `<timer>` is insufficient.

#### A.3 `<poll>` vs Enhanced `<timer>`

**Alternative:** Remove `<poll>` and add `.value` and `.lastUpdated` as optional
properties on `<timer>`.

**Current position:** `<poll>` is retained. See §6.7.6 (Complexity Budget Justification)
for the three reasons. This alternative is tracked as a future revision candidate if
`<poll>` fails to justify its complexity budget after implementation experience.

**Conditions for revisiting:** If, after two gauntlet rounds with `<poll>` implemented,
no gauntlet dev agent uses `<#id>.value` or `<#id>.lastUpdated` directly (preferring
`@variable` reads instead), `<poll>` SHALL be collapsed into `<timer>` and the distinction
removed.

#### A.4 `cleanup()` vs Effect-Return Teardown

**Alternative:** Follow React/Svelte's pattern where an effect function can return a
teardown function. Instead of `cleanup(() => close())`, the developer writes:

```
when @connected changes {
    const ws = new WebSocket(url)
    return () => ws.close()   // teardown function returned from effect body
}
```

**Rejected because:**
1. The return-value-as-teardown pattern conflates effect logic with teardown logic in
   a single function body, which is harder to read for non-trivial effects.
2. `cleanup()` works for mount-time teardown (bare expressions in `${}`), not just
   `when` effects. A return-value pattern only applies to effect bodies.
3. `cleanup()` is explicit and scopeable: it registers on the enclosing element scope,
   which may not be the same as the `when` block's immediate context.
4. The current `cleanup()` design is already implemented in the compiler (tokenizer,
   AST, codegen). Changing to return-value teardown would require redesign of the
   cleanup pass for marginal readability benefit.

---



## 7. Logic Contexts

### 7.1 Syntax

A logic context is opened with `${` and closed with `}`.

```
logic-context ::= '${' logic-content '}'
```

Logic contexts are valid inside markup contexts and state blocks.

### 7.2 Content

The content of a `${ }` logic context is JavaScript, passed to the Bun runtime. All JavaScript that is valid in a Bun execution context is valid inside `${ }`. scrml-specific extensions to logic context content are:

- The `lift` keyword (Section 10)
- Markup-as-expression syntax (Section 7.4)
- SQL contexts `?{ }` (Section 8)
- The `@variable` reactive sigil (Section 6)
- `bun.eval()` for compile-time evaluation (Section 29)

### 7.3 Function Declaration Forms

Inside a logic context, two lazy function declaration forms are supported in addition to standard JavaScript function syntax:

| Form | Semantics |
|---|---|
| `function name() { ... }` | Standard JS function. Lazy — executes on call, not on render. Unconstrained. |
| `fn name { ... }` | Constrained state factory. **Not** a shorthand alias for `function`. See §48. |
| Bare expression | Executes immediately on render (initial mount). See Section 17.3. |

- A function body declared with `function` SHALL execute only when explicitly called.
- A `fn` body SHALL execute only when explicitly called and is subject to the five body prohibitions and return-site completeness checks defined in §48.
- `fn` and `function` are distinct declarations. `fn` enforces purity constraints; `function` is unconstrained. See §48.11.
- A bare expression in a logic context (not wrapped in a function declaration) SHALL execute at initial render.
- The compiler SHALL treat calls to server-inferred functions as async call sites and insert `await` automatically (see Section 13).

#### 7.3.1 Nested Function Declarations

Function declarations inside `${}` logic blocks MAY be nested. An inner function declared inside the body of an outer `function` or `fn` closes over the outer function's `let`, `const`, and `lin` bindings with standard JavaScript closure semantics.

```scrml
${ function tokenize(input) {
    let pos = 0
    function advance() { pos = pos + 1 }  // closes over `pos`
    function peek() { return input[pos] }  // closes over `input`, `pos`
    while (pos < input.length) {
        advance()
    }
} }
```

Inner `function` declarations MAY mutate outer `let` bindings. Inner `fn` declarations are subject to the same purity constraints as top-level `fn` (§48) — they may read outer bindings but may not mutate them (E-FN-003).

The compiler SHALL NOT hoist inner function declarations out of their enclosing function body. Each inner function's scope is the enclosing function body, not the `${}` block.

#### 7.3.2 Default Parameter Values

Both `function` and `fn` declarations support default parameter values using the `= value` syntax:

```scrml
${ function advance(n = 1) {
    for (let i = 0; i < n; i++) { pos = pos + 1 }
} }

${ fn clamp(value, min = 0, max = 100) {
    if (value < min) { return min }
    if (value > max) { return max }
    return value
} }
```

When a parameter with a default is omitted at the call site, the default value expression is evaluated at call time. Default values are arbitrary expressions and may reference earlier parameters in the same parameter list:

```scrml
${ function makeSpan(start, end, line = 1, col = start) { ... } }
```

Default parameters compile directly to JavaScript default parameter syntax.

### 7.4 Markup as Expression in Logic Context

Markup syntax is valid as an expression inside `${ }` logic contexts.

```scrml
let aDiv = <div id="staticId" class=dynamicClass()>;
```

- The `;` at the end of an inline markup expression closes the element (no block content). This is distinct from the block closer forms in Section 4.4.
- All attribute quoting rules from Section 5 apply to inline markup expressions.
- The compiler SHALL generate DOM construction code for inline markup expressions.
- An inline markup expression MAY be assigned to a variable, passed as a function argument, or returned from a function.

**Worked example:**
```scrml
${ function makeItem(name) {
    return <li class="item">${name}</>;
} }
```

### 7.5 Type Annotation Grammar

Type annotations appear on variable declarations, function parameters, and function return types throughout scrml logic contexts. The grammar below formalizes what is used informally in spec examples.

#### Syntax

```
type-expr       ::= primitive-type | identifier | type-expr '[]' | type-expr '|' type-expr | type-expr '?'
primitive-type  ::= 'string' | 'number' | 'boolean' | 'void' | 'not'
reactive-decl   ::= '@' identifier [ ':' type-expr ] '=' expr
param-decl      ::= identifier ':' type-expr | identifier '?' ':' type-expr
return-type     ::= '->' type-expr
```

#### Semantics

**Type annotations are optional.** The compiler infers types when annotations are omitted. When present, the compiler validates assignments (E-TYPE-031 on mismatch).

**`T?` sugar.** Postfix `?` is syntactic sugar for `T | not`. The compiler desugars before type checking.

**`T[]` array types.** Postfix `[]` denotes an array. `string[][]` is an array of arrays.

**Union types.** `T | U` is a union. `[]` binds tighter than `|`.

**Return type annotation.** `->` annotates function return types:

```scrml
function add(a: number, b: number) -> number { return a + b }
```

#### Normative Statements

- Type annotations SHALL be optional on all variable declarations and function parameters.
- When present, the compiler SHALL emit E-TYPE-031 if a non-assignable type is assigned.
- `T?` SHALL be desugared to `T | not` before type checking.
- `->` is the sole return-type annotation syntax for `function` and `fn` declarations.

#### Worked Examples

```scrml
@count: number = 0
@items: string[] = []
@selected: string? = not
function greet(name: string, formal?: boolean) -> string {
    if (formal) { return "Good day, " + name }
    return "Hey, " + name
}
```

### 7.6 File-Level `${}` Scope and Scope Sharing

**Added:** 2026-04-10 — DQ-5 normative statement.

Variables declared in a file-level `${}` block are accessible to all subsequent markup and nested `${}` blocks within the same file. `${}` blocks do not create isolated scopes — each `${}` block participates in the file's shared scope.

```scrml
${ let greeting = "Hello" }

<p>${greeting}</>               // accessible
${ let loud = greeting.toUpperCase() }
<p>${loud}</>
```

**Normative statements:**

- A variable declared with `let` or `const` at the top level of a file-level `${}` block SHALL be in scope for all subsequent `${}` blocks and markup interpolations in the same file.
- File-level `${}` blocks do NOT introduce an isolated scope boundary. A subsequent `${}` block does not shadow or reset the file scope.
- Reactive variables (`@var`) declared at file level (outside any `${}`) are in scope for all `${}` blocks and markup throughout the file (§6.1).
- Variables declared inside a function body within a `${}` block are scoped to that function. Only top-level declarations within the `${}` block participate in file scope.
- Re-declaring a name with `let` in a later file-level `${}` block when that name was already declared at file scope SHALL be a compile error (E-SCOPE-010: duplicate binding in file scope).

---

## 8. SQL Contexts

### 8.1 Syntax

A SQL context is opened with `?{` and closed with `}`. SQL contexts are valid only inside logic contexts.

```
sql-context     ::= '?{' sql-template '}'
sql-template    ::= '`' sql-content '`'
sql-content     ::= (sql-char | bound-param)*
bound-param     ::= '${' expression '}'
```

The content between backticks in `?{` \`...\` `}` is a **scrml SQL template**. It is NOT a JavaScript template literal. The backtick delimiters are part of the scrml SQL context syntax. `${}` inside a SQL template is compiled to a positional bound parameter — it is not string interpolation.

**Normative statements:**

- The compiler SHALL recognize `?{` \`...\` `}` as a SQL context. The backtick delimiters are SQL context syntax, not JavaScript template literal syntax.
- `${}` inside a SQL template SHALL be compiled to a positional bound parameter in the generated database driver call. It SHALL NOT be compiled to string interpolation.
- The compiler SHALL NOT compile `${}` inside `?{}` to string interpolation under any circumstance. All dynamic values inside a SQL template SHALL be bound parameters. This is a non-negotiable security requirement; violation is E-SQL-001 if detected in generated output (compiler defect, not user error).

### 8.1.1 Database Driver Resolution

A `?{}` context does NOT generate bun:sqlite calls unconditionally. The compiler resolves
the database driver by walking up the `<program>` ancestor tree from the `?{}` block's
position to find the closest `<program>` with a `db=` attribute. The connection string value
of that `db=` attribute determines the driver.

**Driver selection table:**

| `db=` value prefix | Driver generated | Notes |
|--------------------|-----------------|-------|
| `sqlite:./path` | `bun:sqlite` | Local SQLite file |
| `./path` or `./path.db` | `bun:sqlite` | Default; implicit `sqlite:` prefix |
| `:memory:` | `bun:sqlite` | In-memory SQLite |
| `postgres://...` or `postgresql://...` | Postgres driver | Connection string forwarded |
| `mysql://...` | MySQL driver | Connection string forwarded |
| `mongo://...` or `mongodb://...` | MongoDB driver | Connection string forwarded |

The compiler generates driver-appropriate calls. All scrml `?{}` query semantics (bound
parameters, `.all()`, `.get()`, `.run()`, `.prepare()`) are preserved across drivers. The
generated code uses the driver's equivalent API.

**Normative statements:**

- The compiler SHALL resolve the database driver for each `?{}` block by finding the closest
  ancestor `<program>` element with a `db=` attribute. "Closest" means fewest nesting levels
  up the `<program>` tree.
- If no ancestor `<program>` has a `db=` attribute, the `?{}` block SHALL be a compile error
  (E-SQL-004: `?{}` block has no `db=` declaration in any ancestor `<program>`).
- The compiler SHALL parse the `db=` connection string prefix to determine the driver. An
  unrecognized prefix SHALL be a compile error (E-SQL-005: unrecognized database connection
  string prefix; valid prefixes are `sqlite:`, `postgres:`, `postgresql:`, `mysql:`,
  `mongo:`, `mongodb:`).
- A plain path without prefix (e.g., `db="./app.db"`) SHALL be treated as `sqlite:./app.db`.
- The bound parameter security rule of §8.1 (E-SQL-001) applies regardless of driver.
  All `${}` interpolations inside `?{}` blocks SHALL be bound parameters, never string
  interpolation, across all drivers.
- When a nested `<program>` with its own `db=` attribute is an ancestor, it SHALL take
  precedence over any outer `<program>` `db=` attribute for `?{}` blocks inside the nested
  `<program>`.

**Worked Example — Valid (PostgreSQL driver):**

```scrml
<program db="postgres://user:pass@localhost:5432/myapp">
    ${ server function getUsers(role) {
        return ?{`SELECT id, name FROM users WHERE role = ${role}`}.all()
    } }
</>
```

Compiles to a postgres driver call (not bun:sqlite). The `${role}` becomes a parameterized
query (`$1` in postgres parameterized query syntax). The `.all()` maps to the postgres
driver's rows-returning method.

**Worked Example — Invalid (no `db=` in any ancestor):**

```scrml
<program>
    ${ server function getUsers() {
        return ?{`SELECT * FROM users`}.all()   // Error E-SQL-004
    } }
</>
```

```
Error E-SQL-004 at line 3: `?{}` block has no `db=` declaration in any ancestor `<program>`.
  Add a `db=` attribute to the enclosing `<program>` element.
  Example: `<program db="./app.db">` for SQLite or `<program db="postgres://...">` for Postgres.
```

### 8.2 Bound Parameter Semantics

When a SQL template contains one or more `${}` expressions, the compiler SHALL:

1. Extract each `${}` expression from the template string.
2. Assign each unique expression a positional parameter slot (`?1`, `?2`, `?3`, …).
3. Replace each `${}` occurrence in the SQL string with its assigned positional parameter.
4. Pass the parameter values as an array to the `bun:sqlite` prepared statement.

**Parameter deduplication:** If the same expression appears more than once in a single SQL template, the compiler SHALL assign it a single positional parameter slot and reuse that slot at every occurrence. Two expressions are the same for deduplication purposes when they are syntactically identical (same identifier or same literal value). Complex expressions (function calls, member accesses) are NOT deduplicated unless they are syntactically identical.

**Normative statements:**

- The compiler SHALL assign positional parameter slots starting at `?1` and incrementing by one for each distinct expression, in order of first appearance left-to-right in the template.
- If the same expression appears at positions P1 and P2 in the template, and P1 < P2, both positions SHALL use the parameter slot assigned at P1.
- The compiler SHALL emit a prepared statement of the form `db.prepare(sql).get(...params)` (or `.all()`, `.run()` per §8.3), where `sql` is the template string with `${...}` replaced by `?N` slots and `params` is the array of unique expression values in slot order.
- The compiler SHALL NOT emit string concatenation, template literal interpolation, or any form of string construction that embeds a runtime value into the SQL string.

**Worked example — valid (single parameter):**
```scrml
< db src="auth.sql" tables="users">
    ${ server function findUser(email) {
        let user = ?{`SELECT id, name FROM users WHERE email = ${email}`}.get();
        return user;
    } }
</>
```

Compiled to (illustrative — exact IR encoding not specified here):
```javascript
db.prepare("SELECT id, name FROM users WHERE email = ?1").get(email)
```

`${email}` becomes `?1`. `email` is passed as the first parameter value.

**Worked example — valid (two distinct parameters):**
```scrml
${ server function findPost(userId, category) {
    let posts = ?{`SELECT * FROM posts WHERE user_id = ${userId} AND category = ${category}`}.all();
    return posts;
} }
```

Compiled to:
```javascript
db.prepare("SELECT * FROM posts WHERE user_id = ?1 AND category = ?2").all(userId, category)
```

**Worked example — valid (parameter deduplication):**
```scrml
${ server function userActivity(userId) {
    let row = ?{`SELECT * FROM activity WHERE created_by = ${userId} OR updated_by = ${userId}`}.get();
    return row;
} }
```

`${userId}` appears twice. The compiler assigns it `?1` on first appearance and reuses `?1` at the second occurrence:

```javascript
db.prepare("SELECT * FROM activity WHERE created_by = ?1 OR updated_by = ?1").get(userId)
```

**Worked example — invalid (string interpolation in SQL — compiler defect if emitted):**

The following pattern is what the compiler SHALL NEVER produce:
```javascript
// FORBIDDEN — compiler SHALL NOT emit this
db.query(`SELECT * FROM users WHERE email = '${email}'`)
```

This is E-SQL-001. It is a compiler defect, not a source error — the developer cannot write this in scrml source. If a compiler pass produces this output, the code generation pass is non-conformant.

### 8.3 Chaining

The result of a `?{ }` context is a query result object. The following methods are supported:

| Method | Return type | Description |
|---|---|---|
| `.all()` | `Row[]` | All matching rows as an array |
| `.get()` | `Row \| not` | First matching row, or `not` if no rows (matches bun:sqlite convention) |
| `.run()` | `RunResult` | Execute without returning rows (INSERT/UPDATE/DELETE) |
| `.prepare()` | `PreparedStatement` | Return a reusable prepared statement |

These methods correspond directly to `bun:sqlite` APIs. The compiler passes through the call to the underlying prepared statement.

**Worked example — static query:**
```scrml
< db src="db.sql" protect="password" tables="users">
    <ul>${
        function loadList() {
            for (name of ?{`SELECT userName FROM users WHERE canSee = true`}.all()) {
                lift <li value=name>;
            }
        }
    </>
</>
```

**Worked example — dynamic query with bound parameter:**
```scrml
< db src="db.sql" tables="posts">
    ${ server function loadPosts(authorId) {
        let posts = ?{`SELECT title, body FROM posts WHERE author_id = ${authorId}`}.all();
        return posts;
    } }
</>
```

### 8.4 Conditional WHERE — Null-Coalescing Pattern

The canonical scrml pattern for optional filter parameters in a WHERE clause is the SQLite null-coalescing idiom: `($param IS NULL OR column = $param)`.

```scrml
${ server function getPosts(category) {
    // category may be null — pass null to retrieve all posts regardless of category
    let posts = ?{`SELECT * FROM posts WHERE (${category} IS NULL OR category = ${category})`}.all();
    return posts;
} }
```

When `category` is `null`, the condition `(NULL IS NULL OR category = NULL)` short-circuits to true on the first clause for every row, returning all posts. When `category` is a string value, the first clause is false and the second clause filters normally.

This is standard SQLite behavior. The pattern is verbose but correct, teachable, and requires no special compiler support beyond the bound parameter semantics of §8.2.

**Note on parameter deduplication:** In the example above, `${category}` appears twice. The compiler assigns it `?1` and reuses that slot for both occurrences (§8.2 deduplication rule):

```javascript
db.prepare("SELECT * FROM posts WHERE (?1 IS NULL OR category = ?1)").all(category)
```

**Canonical forms:**

| Use case | Pattern |
|---|---|
| Optional equality filter | `(${param} IS NULL OR column = ${param})` |
| Optional range lower bound | `(${minVal} IS NULL OR column >= ${minVal})` |
| Optional range upper bound | `(${maxVal} IS NULL OR column <= ${maxVal})` |
| Multiple optional filters | Combine with AND: `(${a} IS NULL OR col_a = ${a}) AND (${b} IS NULL OR col_b = ${b})` |

**Normative statements:**

- The null-coalescing WHERE pattern is the canonical scrml idiom for optional SQL filters. No compiler-level conditional SQL construction syntax exists in v1.
- Developers SHALL NOT construct SQL strings dynamically in JavaScript and pass them to `?{}`. The content between backticks in a `?{}` block is a fixed string template at compile time. Dynamic SQL string construction outside of `?{}` binding is not a supported pattern.
- The compiler SHALL validate the SQL template string (with `?N` placeholders substituted) against the schema at compile time. A syntactically invalid SQL template SHALL be a compile error (E-SQL-002).

**Worked example — valid (multi-filter optional search):**
```scrml
${ server function searchPosts(category, authorId) {
    let results = ?{`
        SELECT title, body, author_id, category
        FROM posts
        WHERE (${category} IS NULL OR category = ${category})
          AND (${authorId} IS NULL OR author_id = ${authorId})
        ORDER BY created_at DESC
    `}.all();
    return results;
} }
```

**Worked example — invalid (dynamic SQL construction — not supported):**
```scrml
${ server function badQuery(filterCol) {
    // INVALID: cannot construct the SQL template string at runtime
    // The content of ?{`...`} must be a fixed template, not a computed string
    let sql = "SELECT * FROM posts WHERE " + filterCol + " = 1";
    let results = ?{`${sql}`}.all();  // Error E-SQL-003: SQL template must be a literal string, not a runtime expression
} }
```

### 8.5 Full SQL Support — INSERT/UPDATE/DELETE

SQL write operations (INSERT, UPDATE, DELETE) use the same `?{}` syntax as SELECT queries.
The method determines the execution mode:

- `.run()` — execute a write statement; returns a `RunResult` object
- `.prepare()` — return a reusable `PreparedStatement` without executing

#### 8.5.1 Write Operations with `.run()`

`.run()` executes a SQL statement and returns an object with:

| Field | Type | Description |
|---|---|---|
| `changes` | `number` | Number of rows affected by the statement |
| `lastInsertRowid` | `number` | Row ID of the last inserted row (INSERT only; 0 for UPDATE/DELETE) |

This is a direct passthrough of the bun:sqlite `RunResult` shape. The compiler does not
transform or wrap the return value.

**Normative statements:**

- `.run()` SHALL be compiled to `db.query(sql).run(...params)` where `sql` is the
  parameterized SQL string and `params` is the bound parameter array per §8.2.
- The return value of `.run()` SHALL be the database driver's native write result object.
  For bun:sqlite, this is `{ changes: number, lastInsertRowid: number }`.
- The compiler SHALL NOT wrap, transform, or inspect the return value of `.run()`.
- All `?{}` SQL blocks, including write operations, are server-escalated by Route Inference
  (§12.2 Trigger 1). A function containing a `?{}` write operation SHALL be classified as
  server-side. This applies equally to INSERT, UPDATE, DELETE, and DDL statements.

**Worked example — INSERT and inspect result:**

```scrml
< db src="./app.db" tables="users">
    ${ server function createUser(name, email) {
        let result = ?{`INSERT INTO users (name, email) VALUES (${name}, ${email})`}.run()
        return result.lastInsertRowid
    } }
</>
```

**Worked example — DELETE:**

```scrml
${ server function deleteSession(token) {
    let result = ?{`DELETE FROM sessions WHERE token = ${token}`}.run()
    return result.changes
} }
```

#### 8.5.2 Prepared Statements with `.prepare()`

`.prepare()` returns a reusable `PreparedStatement` object without executing the query.
The statement is used for repeated execution with varying parameters.

**Normative statements:**

- `.prepare()` SHALL be compiled to `db.prepare(sql)` where `sql` is the parameterized
  SQL string with `?N` placeholders per §8.2.
- The bound parameter expressions from the `?{}` template SHALL NOT be passed to
  `db.prepare()`. Params are supplied at execution time on the returned statement.
- The return type of `.prepare()` is the database driver's `PreparedStatement` type.
  For bun:sqlite this is `Statement`. The compiler does not type-annotate the result.
- `.prepare()` calls, like all `?{}` SQL blocks, are server-escalated by RI.

**Worked example:**

```scrml
${ server function bulkInsert(users) {
    const stmt = ?{`INSERT INTO users (name, email) VALUES (?1, ?2)`}.prepare()
    for (u of users) {
        stmt.run(u.name, u.email)
    }
} }
```

#### 8.5.3 Transaction Blocks

Write operations that must succeed or fail atomically are wrapped in a `transaction` block:

```scrml
${ server function transferFunds(fromId, toId, amount) {
    transaction {
        ?{`UPDATE accounts SET balance = balance - ${amount} WHERE id = ${fromId}`}.run()
        ?{`UPDATE accounts SET balance = balance + ${amount} WHERE id = ${toId}`}.run()
    }
} }
```

**Normative statements:**

- A `transaction` block SHALL be compiled to BEGIN/COMMIT/ROLLBACK wrapping. On any
  exception thrown from within the block, the compiler-generated catch clause SHALL execute
  ROLLBACK and re-throw the exception.
- All SQL statements inside a `transaction` block use the same `_scrml_db` connection.
- `transaction` blocks, like all `?{}` SQL operations, are server-side constructs.
  A `transaction` block in a client-boundary function is E-CG-006.

#### 8.5.4 Server Escalation of Write Operations

All `?{}` SQL contexts — SELECT and write operations alike — trigger Route Inference
server escalation (§12.2 Trigger 1). The escalation mechanism does not distinguish between
read and write SQL; any function that contains a `?{}` block is server-escalated.

**Rationale:** Database connections are server-side resources. A write operation SHALL
never run in the browser. The blanket escalation rule is simpler and safer than a
read/write distinction.

### 8.6 Error Conditions

| Code | Trigger | Severity |
|---|---|---|
| E-SQL-001 | Compiler emits string interpolation into a SQL string (compiler defect, not user error) | Error |
| E-SQL-002 | SQL template string (after `?N` substitution) is syntactically invalid SQL | Error |
| E-SQL-003 | SQL template content is a runtime expression, not a literal string template | Error |
| E-SQL-004 | `?{}` block has no `db=` declaration in any ancestor `<program>` | Error |
| E-SQL-005 | Unrecognized database connection string prefix in `db=` attribute | Error |
| E-BATCH-001 | Explicit `transaction { }` composed with an implicit per-handler transaction (§8.9.3 / §19.10.5) | Error |
| E-BATCH-002 | Batched `IN (...)` parameter count exceeds `SQLITE_MAX_VARIABLE_NUMBER` and chunking is not applicable | Error |
| E-PROTECT-003 | A `BatchPlan.rowCacheColumns` entry includes a `protect` column that appears in the handler's client-visible return type (§8.10.7) | Error |
| D-BATCH-001 | For-loop nearly matches the Tier 2 syntactic template but was not rewritten; diagnostic lists the near-miss reason | Info |
| W-BATCH-001 | Explicit `?{BEGIN}` suppresses implicit per-handler transaction; use `transaction { }` or `.nobatch()` for clarity | Warning |

### 8.7 Runtime Errors

At runtime, `?{}` queries can fail (connection lost, constraint violation, invalid query). The error type is the built-in `SqlError` enum (§19.8.1):

- Inside a `!` function: SQL errors produce `SqlError` variants, propagated via the error channel. Handle with `!{}` arms matching `::QueryFailed`, `::ConstraintViolation`, `::ConnectionLost`.
- Outside a `!` function: failed `.get()` returns `not`, failed `.all()` returns `[]`. No error is raised.

See §19.8 for the full `SqlError` type definition and propagation rules.

### 8.8 Interaction Notes

- **§11.3 (`protect=`):** A SQL template that selects a protected field in a client-boundary function is E-PROTECT-001. The bound parameter rules of §8.2 apply regardless of whether the function is server-escalated. See §14.8.7 for the TS-level enforcement.
- **§12 (Route Inference):** Any function containing a `?{}` SQL context that accesses a `< db>` resource is a candidate for server escalation (§12.2 trigger 1). The SQL context itself does not force escalation — the resource access does.
- **§22.7 (Meta):** `^{}` meta blocks MAY contain `?{}` SQL contexts when the meta block is compile-time evaluated. At runtime, `?{}` SQL contexts require an active `< db>` scope binding.
- **§26 (Comments):** `--` SQL comments inside a SQL template are passed through to the database driver as part of the SQL string. The block splitter does not interpret `--` at the `?{}` level; comment handling inside SQL templates is the responsibility of the underlying driver.
- **§4.12 (Nested `<program>`):** A nested `<program>` with its own `db=` attribute creates
  a new database driver scope. All `?{}` blocks inside the nested `<program>` resolve to
  the nested program's driver. `?{}` blocks in the parent `<program>` are unaffected by the
  child's `db=`.

### 8.9 Per-Handler Query Coalescing (Tier 1)

**Added:** 2026-04-14. Resolves SQL batching design insight (S16) Alpha/Gamma clusters F4.A + F1.A.

Independent `?{}` queries within a single server handler SHALL share a prepare/lock cycle and, in `!` handlers, execute under a single implicit transactional envelope.

#### 8.9.1 Coalescing Candidate Set

Two `?{}` DGNodes are *coalescing candidates* iff all of the following hold:

1. Both belong to the same `RouteSpec.handlerDGNodeIds` set (same server handler).
2. Neither is transitively reachable from the other via an `'awaits'` edge in the DG.
3. Neither carries the `.nobatch()` chain modifier (§8.9.5).
4. Neither lies inside an explicit `transaction { }` block (§19.10.2).

The Batch Planner (PIPELINE.md Stage 7.5) computes this set from the finalized DG output.

#### 8.9.2 Coalescing Envelope

When two or more `?{}` calls in a server handler are coalescing candidates, the compiler SHALL coalesce their prepare/lock cycle. In `!` handlers ONLY, the compiler SHALL additionally wrap the handler body in `?{BEGIN DEFERRED}` / `?{COMMIT}` (`?{ROLLBACK}` on exception).

**Normative statements:**

- An implicit handler transaction SHALL apply only to server handlers whose signature declares `!`. A non-`!` handler SHALL NOT be implicitly wrapped; coalescing in a non-`!` handler shares only the prepare/lock cycle. *(Preserves §19.10.4 — transactions remain `!`-gated.)*
- An implicit handler transaction SHALL NOT compose with an explicit `transaction { }` block (§19.10.2). A handler containing both SHALL produce **E-BATCH-001**. Resolution: either `.nobatch()` the outer calls, or wrap the whole handler in the explicit `transaction { }`.
- An explicit `?{BEGIN}` inside the handler suppresses the implicit envelope and emits **W-BATCH-001**.
- Compiler diagnostics SHALL name the implicit envelope "implicit per-handler transaction (§8.9.2)" so users faced with E-BATCH-001 understand the source.

#### 8.9.3 Semantics Preserved

- Bound-parameter invariants (§8.2) are preserved per-`?{}`. Coalescing merges only the prepare/lock cycle and the transactional envelope; each logical query retains its own template and parameters.
- Parameter deduplication (§8.2) remains per-query. Coalescing does not dedupe across queries.
- Runtime error attribution follows §8.9.4.

#### 8.9.4 Error Model

Outside `!`: coalescing is never applied with a transactional envelope (§8.9.2). Each `?{}` retains §8.7 semantics — failed `.get()` → `not`, failed `.all()` → `[]`.

Inside `!`:
- **Prepare-phase errors** (a SQL syntax error detected while preparing the batched statements) surface as a single variant `SqlError::BatchPrepareFailed { sites: [<?{} source locations>] }`. The variant lists source locations of all coalesced `?{}` blocks so that `!{}` arms can attribute the failure.
- **Per-iteration runtime errors** (constraint violations, missing rows, etc.) are attributed to the original site per §8.7.

This mode-split preserves §8.7 pointwise for misses while accepting bundled attribution for prepare-phase defects where per-site attribution is not implementable.

#### 8.9.5 Opt-Out — `.nobatch()`

A `?{}` chain may include `.nobatch()` to exclude that query from any coalescing candidate set:

```scrml
let stale = ?{`SELECT snapshot FROM cache WHERE k = ${k}`}.nobatch().get()
```

**Normative statements:**

- `.nobatch()` SHALL be valid at any chain position; it is a compile-time marker with no runtime effect on the individual query.
- A query marked `.nobatch()` SHALL be excluded from §8.9.1 candidate sets and from §8.10 loop hoisting.
- The SQL-comment form `?{`--@no-batch\nSELECT ...`}` SHALL NOT be recognized as an opt-out. `.nobatch()` is the sole opt-out vector.

#### 8.9.6 Interaction with Lin

Batch rewriting SHALL run *after* lin-check (§35). E-LIN consumption counts use the pre-rewrite DG, so a coalesced statement does not collapse N consumptions into 1.

### 8.10 N+1 Loop Hoisting (Tier 2)

**Added:** 2026-04-14. Resolves SQL batching design insight (S16) Beta cluster F2.A + F3.A + F6.A + F7.A + F10.B.

A for-loop whose body contains a single keyed `?{}` read SHALL be rewritten to a single `WHERE IN (...)` pre-fetch plus per-iteration `Map` lookup.

#### 8.10.1 Detection (Syntactic)

A for-loop is a *Tier 2 candidate* iff all of the following hold, matched syntactically:

1. Loop header is `for (let x of xs)` or `for (const x of xs)` (iteration binding is a single identifier).
2. Loop body contains exactly one `?{}` block whose template matches `... WHERE <column> = ${x.<field>} ...` (single equality predicate on the loop binding).
3. The `?{}` block is terminated with `.get()` or `.all()`. `.run()` is excluded (see §8.10.5). `.prepare()` is excluded (no round trip to hoist).
4. No other `?{}` blocks appear in the loop body.
5. The query is not marked `.nobatch()` (§8.9.5).

A for-loop that *almost* matches (e.g., two equality predicates, or a `.run()` terminator, or `.forEach`) but fails one condition SHALL produce **D-BATCH-001** with the specific near-miss reason. This diagnostic closes the coverage gap of pure-syntactic detection without the opacity of dataflow-based detection.

#### 8.10.2 Rewrite (Map Lookup)

The compiler SHALL rewrite a Tier 2 candidate as follows (schematic):

```scrml
// source
for (let x of xs) {
    let row = ?{`SELECT ... FROM t WHERE id = ${x.id}`}.get()
    ...
}

// rewritten (conceptual; actual emit uses encoded names)
let _keys = xs.map(x => x.id)
let _rows = ?{`SELECT ... FROM t WHERE id IN (${_keys})`}.all()
let _byKey = new Map(_rows.map(r => [r.id, r]))
for (let x of xs) {
    let row = _byKey.get(x.id) ?? not
    ...
}
```

- `.all()` in the loop becomes `Map<key, Row[]>` with per-key grouping; per-iteration lookup yields a possibly-empty array.
- `.get()` in the loop becomes `Map<key, Row>`; missing keys yield `not`, preserving §8.7.

#### 8.10.3 Ordering

Per-iteration `Map` lookup preserves loop-iteration order for all body side effects — `lift`, reactive writes (`@x = ...`), nested server calls, `fail`, `break`, early `return`. The rewritten loop is observationally equivalent to the un-rewritten loop on all side-effect orderings.

#### 8.10.4 Key-Column Inference

The key column is the column referenced by the single equality predicate in the `?{}` template. Tuple-WHERE (`col1 = ${x.a} AND col2 = ${x.b}`) is OUT OF SCOPE for v1; such a loop does not match §8.10.1 condition 2 and SHALL instead produce D-BATCH-001.

#### 8.10.5 Writes Out of Scope for v1

`.run()` inside a loop (UPDATE/DELETE/INSERT) is NOT rewritten in v1. Write batching collides with `<machine>` transition enforcement (§51) and `server @var` optimistic-rollback granularity (§52.4.2). Tier 2 writes queued for post-v1 spec extension.

#### 8.10.6 Parameter Count Bound

If `xs.length` at runtime exceeds `SQLITE_MAX_VARIABLE_NUMBER`, the Tier 2 rewrite SHALL chunk the IN-list into segments of at most `SQLITE_MAX_VARIABLE_NUMBER` keys. If chunking is statically provable as impossible, **E-BATCH-002** fires at compile time; at runtime, an over-limit execution throws `SqlError::BatchTooLarge`.

#### 8.10.7 Lift-Checker Re-Run + Protect Verification

Tier 2 introduces a new sibling DGNode (the hoisted pre-loop query). The lift-checker (§10.5) SHALL be re-run on the post-rewrite DG to verify no new E-LIFT-001. The Batch Planner SHALL also verify that the hoisted SELECT's `rowCacheColumns` do not include any `protect` column that appears in the handler's client-visible return type — overlap is **E-PROTECT-003**.

### 8.11 Mount-Hydration Coalescing

**Added:** 2026-04-14. Resolves SQL batching design insight (S16) Gamma cluster F9.C.

#### 8.11.1 Scope

On-mount initial-load fetches for `server @var` declarations (§52.4.2) SHALL be coalesced into a single synthetic server handler named `__mountHydrate` per page/component. Individual `server @var` *assignments* (which carry optimistic-update + rollback semantics) SHALL remain 1:1 with their own routes.

#### 8.11.2 Synthetic Handler

The boundary pass SHALL emit a `__mountHydrate` RouteSpec whose handler body contains all `server @var` initial-read queries as sibling DGNodes. Because they share a handler, §8.9 Tier 1 coalescing applies automatically.

#### 8.11.3 Write Isolation

`server @var` assignments continue to generate per-var routes. Coalescing writes would collapse per-assignment rollback scopes (§52.4.2 (3)) and is forbidden.

---

## 9. CSS Contexts

Three CSS context forms are supported. All three support scrml's CSS variable syntax (Section 24) and Tailwind utility integration (Section 25).

### 9.1 Inline CSS Context

```
css-inline-context ::= '#{' css-content '}'
```

Valid inside markup and state contexts, and at program scope (top-level in the program body, not nested inside any element). Applies styles to the document globally when used at program scope, or inline at the element level when used inside a markup or state context.

**Normative statements (DQ-6):**

- A `#{}` block MAY appear at the top level of a file (outside any markup element). Top-level `#{}` is valid and SHALL compile.
- Top-level `#{}` compiles to a stylesheet that is included in the page's global styles, applied to the entire document.
- `#{}` inside a markup element applies styles at the element level (inline or scoped per compiler settings).
- Using `#{}` at top level SHALL NOT be a compile error or warning.

**Normative statements (DQ-7 — CSS Scoping):**

- `#{}` inside a **state type constructor** compiles to a native CSS `@scope ([data-scrml="ConstructorName"]) to ([data-scrml]) { ... }` block in the output `.css` file. Class names are NOT mangled.
- The constructor's root element SHALL carry the attribute `data-scrml="ConstructorName"` in the emitted HTML.
- **Flat-declaration `#{}` blocks** (blocks containing only bare `property: value;` pairs with no selectors) inside a constructor scope compile to inline `style="prop: value; ..."` on the containing element. They do NOT appear in the CSS file.
- **Donut scope** is implicit. The `@scope` block uses `to ([data-scrml])` as its limit — constructor CSS does not bleed into nested constructors.
- **Program-level `#{}` blocks** are emitted as global CSS without any `@scope` wrapper. Unchanged from DQ-6.
- **Tailwind utility classes** (§26) live outside `@scope` and are NOT affected by this scoping system.
- CSS variable bridge (`@var` references in `#{}`) continues to work inside `@scope` blocks unchanged.

### 9.2 Style Block

```
style-block ::= '<style' attribute* '>' css-content closer
```

Valid at file top-level. Closer follows standard closer forms (Section 4.4). Content is CSS with scrml variable syntax.

### 9.3 CSS Files

Plain `.css` files placed alongside `.scrml` source files are valid CSS. scrml's CSS variable syntax (Section 24) is available in `.css` files.

---

## 10. The `lift` Keyword

### 10.1 Semantics

`lift` emits a value from within a logic context up to its destination. Execution continues after `lift` — it does not terminate the logic block.

`lift` operates in two modes depending on the destination context:

1. **Accumulation mode** (original behavior). When `lift` appears in an anonymous `${}` block whose parent is a markup or style context, `lift` appends the value to the block's accumulator array. The accumulated array is coerced when the logic block exits, according to the parent context type (§10.2). This is the original lift behavior and is unchanged.

2. **Value-lift mode**. When `lift` appears inside an if-as-expression context (§17.6), `lift` designates the expression's result value. Each arm of an if-as-expression that wishes to produce a value SHALL contain exactly one `lift` statement. The lifted value becomes the result of the if-as-expression at the binding site.

In both modes, a `lift` call initializes `~` to the lifted value (§32.2).

`lift` was chosen over `yield` to avoid collision with JavaScript generator function semantics. JavaScript `yield` works only inside generator functions; scrml logic contexts accept real JS generators. Having two different `yield` behaviors in the same `${ }` block would be a footgun. `lift` is unambiguous.

### 10.2 Context-Coercion Rules for `lift`

| Parent context | Expected type | Coercion action |
|---|---|---|
| Markup context | Markup element(s) | Array coerced to rendered markup. Compile error if shapes are not coercible. |
| Style context `#{ }` | `cssClass[]` | Array coerced to CSS class list. Compile error if yielded type is not a CSS class. |
| Logic context | Any | No coercion. Result passes through as a plain array. |
| If-as-expression (§17.6) | Any | Lifted value becomes the expression result. Not accumulated into an array. No coercion applied. |

- A single `lift` call produces a one-element array. The same coercion rules apply.
- In value-lift mode (§17.6 if-as-expression), the lifted value SHALL NOT be accumulated into an array. It is the scalar result of the expression. The compiler SHALL distinguish accumulation mode from value-lift mode by examining whether the enclosing `${}` block is the direct body of an if-as-expression binding (§17.6.3).
- Yielding a value whose type is not coercible to the parent context's expected type SHALL be a compile error (E-TYPE-010 for markup, E-TYPE-011 for style).

### 10.3 Syntax Forms

`lift` may appear as a statement or as a method call in a chain:

```scrml
lift <li value=name>;                              // statement form
users.select(userName).get().lift(<li value=userName>)  // chain form
```

Both forms are equivalent. The chain form appends the argument to the `lift` accumulator for the current logic block.

### 10.4 Valid Use Sites for `lift`

`lift` is valid ONLY in anonymous logic contexts — that is, bare `${ }` blocks that are not the body of a named function declaration.

Named function forms (`function name() { ... }` and `fn name { ... }`) are NOT valid lift sites. A named function returns markup as a return value. The caller is responsible for lifting the returned value if needed. This restriction exists because named functions may be called from any context; there is no statically knowable parent context into which a `lift` inside a named function could accumulate.

**Normative statements:**

- `lift` SHALL be valid only inside an anonymous `${ }` logic context (including the arm bodies of an if-as-expression, which are anonymous `${}` contexts).
- `lift` inside a named function (`function name() { ... }` or `fn name { ... }`) SHALL be a compile error (E-SYNTAX-002).
- In value-lift mode (§17.6), `lift` SHALL appear at most once on any execution path through an arm body. If a single arm body contains two or more reachable `lift` statements on the same execution path, the compiler SHALL emit E-LIFT-002.
- In accumulation mode, `lift` MAY appear multiple times in a single logic block; each call appends one item. In value-lift mode, `lift` is a single-result designator, not an accumulator.
- The compiler SHALL track all `lift` calls within a logic block and accumulate them into a typed array (accumulation mode only).
- The compiler SHALL validate that all lifted values are of a compatible type. Lifting heterogeneous types that are not mutually coercible SHALL be a compile error (E-TYPE-012).
- Using `lift` outside any `${ }` logic context entirely SHALL be a compile error (E-SYNTAX-001).

**E-LIFT-002:**

> E-LIFT-002: Multiple `lift` statements on the same execution path in a value-lift arm. In an if-as-expression (§17.6), each arm body produces exactly one value. Remove or consolidate the extra `lift` calls, or restructure into a separate accumulation context if multiple values are needed.

**Worked example — valid (anonymous logic context):**
```scrml
<ul>${
    for (item of items) {
        lift <li>${item.name}</>;
    }
</>
```

**Worked example — invalid (`lift` inside named function):**
```scrml
<ul>${
    function buildRows(items) {
        for (item of items) {
            lift <li>${item.name}/;  // Error E-SYNTAX-002
        }
    }
    buildRows(data);
</>
```
Error E-SYNTAX-002: `lift` is not valid inside a named function. Named functions return markup as a value. Restructure to return the element and lift the return value at the call site, or use an anonymous logic context.

**Worked example — invalid (wrong closer):**
```scrml
<ul>${
    for (item of items) {
        lift <li>${item.name}</>;
    }
</>   // Error E-CTX-002: '</>' in logic context
}
```
Error E-CTX-002: Cannot use a markup/state closer (`</>` or `</tagname>`) inside a `${ }` logic context. Close the logic context with `}` first.

### 10.5 `lift` Ordering and Async Parallelism

**Added:** 2026-03-25 — resolves Phase 0 Design Review Issue 3.2.

#### 10.5.1 Accumulation Order

The order of values in the `lift` accumulator is the runtime call order. Each `lift` call appends one value to the accumulator array. The array preserves the order in which `lift` calls execute at runtime.

#### 10.5.2 Concurrent `lift` is Forbidden

If two branches containing `lift` calls would be parallelized by the compiler (i.e., scheduled with `Promise.all` because neither depends on the other's result), the compiler SHALL reject the program with E-LIFT-001.

**Rationale:** When two independent branches both contain `lift`, the compiler would schedule them concurrently. The `lift` calls in each branch would execute in non-deterministic order, producing a non-deterministic accumulation order. This violates the ordering guarantee of §10.5.1.

#### 10.5.3 Correct Pattern

The correct pattern is to collect all parallel results into named variables first, then lift sequentially after all results are available:

```scrml
<ul>${
    let listA = getListA();
    let listB = getListB();
    // compiler generates: const [listA, listB] = await Promise.all([...])
    for (item of listA) { lift <li class="a">${item}/; }
    for (item of listB) { lift <li class="b">${item}/; }
</>
```

This preserves both parallelism (the fetches run concurrently) and deterministic order (the lifts run sequentially after both fetches complete).

**Normative statements:**

- The accumulation order of `lift` SHALL be the runtime execution order of `lift` calls.
- Two independent branches in the same anonymous logic block that both contain `lift` calls SHALL be a compile error (E-LIFT-001: concurrent `lift` calls in the same logic block).
- E-LIFT-001 SHALL fire when the compiler's parallelism analysis determines that two `lift`-containing branches would be scheduled with `Promise.all`.
- The compiler SHALL NOT silently reorder `lift` calls. If deterministic ordering cannot be guaranteed, the program SHALL be rejected.

#### 10.5.4 Follow-On Issue — Resolved

This section previously deferred the lift concurrent detection algorithm to SPEC-ISSUE-007.
That issue is resolved. The detection algorithm is specified in §10.5.5 below.

#### 10.5.5 Lift Concurrent Detection Algorithm

**Resolved:** 2026-03-27 (SPEC-ISSUE-007)

This section specifies the algorithm by which the dependency graph pass (Stage 7, DG) detects
that two branches containing `lift` calls would be parallelized, triggering E-LIFT-001.

##### 10.5.5.1 Inputs

The detection algorithm examines the following information from the dependency graph:

1. **The `DependencyGraph.nodes` map** — specifically, the `hasLift` field on each `DGNode`.
   `hasLift` is `true` on a node N if the statement or statement sequence immediately following
   N's corresponding AST node in the same anonymous `${ }` logic block contains at least one
   `LiftExpr` node at the direct body level of that block (not inside any nested function body).

2. **The `DependencyGraph.edges` list** — specifically, all edges with `kind: 'awaits'`. These
   edges encode sequential ordering constraints: an `'awaits'` edge from P1 to P2 means P2
   cannot begin until P1 completes. Two nodes with no `'awaits'` path between them are
   independent and will be parallelized by the code generator using `Promise.all`.

3. **The block node set** — for each anonymous `${ }` logic block, the subset of `DGNode`
   entries whose corresponding AST positions are in the direct body of that block. This set is
   derived during Phase 1 graph construction by tracking which logic block each node originates
   from.

##### 10.5.5.2 The Detection Decision

Given two nodes P1 and P2 in the block node set of the same anonymous `${ }` logic block:

> **E-LIFT-001 fires if and only if all of the following are true:**
> 1. `P1.hasLift === true`
> 2. `P2.hasLift === true`
> 3. P1 ≠ P2
> 4. There is no `'awaits'` edge from P1 to P2, directly or transitively through any chain of
>    `'awaits'` edges.
> 5. There is no `'awaits'` edge from P2 to P1, directly or transitively through any chain of
>    `'awaits'` edges.

Conditions 4 and 5 together mean: neither node is reachable from the other via `'awaits'`
edges. These nodes are independent. The code generator would schedule them with `Promise.all`,
placing their `lift` calls in concurrent branches with non-deterministic execution order,
violating §10.5.1.

The check is performed for all pairs (P1, P2) in the block node set. If any pair satisfies all
five conditions, E-LIFT-001 fires for that logic block.

**Normative statements:**

- The DG pass SHALL annotate every `DGNode` with a `hasLift: boolean` field as defined above.
- The lift-checker sub-pass SHALL run after Phase 1 graph construction and `'awaits'` edge
  completion, within Stage 7, before the DependencyGraph is emitted.
- E-LIFT-001 SHALL fire for each anonymous logic block where two or more independent nodes
  (no `'awaits'` path between them) both have `hasLift: true`.
- The error message for E-LIFT-001 SHALL identify: (a) the span of the anonymous logic block,
  (b) the spans of both offending nodes, and (c) the spans of the `lift` calls in each branch.
- E-LIFT-001 SHALL block the DG output and prevent code generation from proceeding.
- The lift-checker sub-pass SHALL NOT be run independently of DG. It is a Phase 2 sub-pass
  within Stage 7.

##### 10.5.5.3 Conservatism

The detection algorithm is **conservative**. It rejects any program where two `DGNode` entries
with `hasLift: true` have no `'awaits'` dependency, regardless of whether non-`'awaits'` edges
(such as `'calls'` or `'reads'` edges) or other runtime factors would in practice serialize the
nodes.

The conservatism is intentional and bounded:

- **What is rejected:** Any pair of independent `hasLift: true` nodes in the same logic block,
  where independence is defined solely by the absence of an `'awaits'` path.
- **What is not rejected:** Nodes connected by any `'awaits'` path, even a transitive one, are
  never flagged — they are guaranteed to execute sequentially.
- **Why conservative is correct:** The compiler does not reason about `'calls'` edges or other
  non-`'awaits'` ordering constraints for the purpose of lift safety. Only `'awaits'` edges
  encode the sequential constraints that the code generator uses when deciding whether to emit
  `Promise.all`. Using a broader set of edges for lift safety would require the lift checker to
  mirror the code generator's full scheduling logic — creating a hidden coupling between two
  passes. The `'awaits'`-only rule is simple, auditable, and matches the code generator's
  actual parallelism model.
- **Fix:** A program rejected by E-LIFT-001 is always fixable without loss of parallelism by
  restructuring to separate parallel fetches from lift calls (§10.5.3 correct pattern). The
  conservatism never forces the developer to give up parallelism — only to express it in the
  form where all parallel work completes before any lift begins.

##### 10.5.5.4 How the DG Pass Communicates Parallelism to the Lift Checker

The lift checker is a Phase 2 sub-pass within Stage 7. It does not require a separate
communication channel. The DG pass communicates parallelism to the lift checker through two
fields already present on the merged `DependencyGraph`:

1. **`DGNode.hasLift`** — set during Phase 1 per-file subgraph construction. Records whether
   a given node is followed by a `lift` call in the same logic block's direct body.

2. **`DGEdge.kind === 'awaits'`** — the complete set of `'awaits'` edges in the merged graph.
   The lift checker uses these edges to determine reachability between nodes. The absence of an
   `'awaits'` path between two nodes means the code generator will parallelize them.

No additional fields, side tables, or inter-pass messages are required. The lift checker reads
the same `DependencyGraph` output that will be consumed by CG, making the lift check a
verification of the same structure that drives code generation.

##### 10.5.5.5 Worked Examples

**Worked example — valid (parallel fetch, sequential lift, no E-LIFT-001):**

```scrml
<ul>${
    let listA = getListA();     // node N_A in block node set
    let listB = getListB();     // node N_B in block node set
    // N_A and N_B are independent — no 'awaits' edge between them
    // N_A.hasLift === false (next statement after N_A is let listB = ..., not a lift)
    // N_B.hasLift === false (next statement after N_B is a for loop, not a lift)
    for (item of listA) {
        lift <li class="a">${item}</>;
    }
    for (item of listB) {
        lift <li class="b">${item}</>;
    }
</>
```

Analysis: N_A and N_B are independent (no `'awaits'` edge between them), but neither has
`hasLift: true` — the `lift` calls appear after both nodes complete, in sequential `for` loops
that are not themselves DG nodes with `hasLift` set on N_A or N_B. E-LIFT-001 does NOT fire.
The compiler parallelizes `getListA()` and `getListB()`, then executes the `lift` loops
sequentially. This is the correct pattern (§10.5.3).

**Worked example — invalid (lift interleaved with parallel calls, E-LIFT-001):**

```scrml
<ul>${
    getListA()             // node N_A, server call A; result discarded (sets ~)
    lift <li>${~}/;        // lift after A — N_A.hasLift === true
    getListB()             // node N_B, server call B; result discarded (sets ~)
    lift <li>${~}/;        // lift after B — N_B.hasLift === true
</>
```

Analysis: N_A and N_B are independent (no `'awaits'` edge between them, as neither depends on
the other's result). N_A.hasLift is `true` (the statement immediately following N_A in the
block body is `lift <li>${~}/`). N_B.hasLift is `true` (same reason). The five conditions are
met: E-LIFT-001 fires.

Expected compiler output:
```
Error E-LIFT-001: Two independent operations in the same logic block both precede `lift`
calls. If parallelized, the `lift` calls would execute in non-deterministic order, violating
the accumulator ordering guarantee (§10.5.1).

  Logic block:  <ul>${ ... /    [line 1]
  Branch 1:     getListA()       [line 2] — followed by lift at [line 3]
  Branch 2:     getListB()       [line 4] — followed by lift at [line 5]

Neither branch depends on the other's result (no sequential ordering constraint exists between
them). The code generator would schedule them with Promise.all, producing concurrent lift calls.

Fix: Collect all parallel results into named variables first, then lift sequentially:

  let listA = getListA();
  let listB = getListB();
  // compiler generates: const [listA, listB] = await Promise.all([...])
  for (item of listA) { lift <li>${item}/; }
  for (item of listB) { lift <li>${item}/; }
```

### 10.6 Nested `lift` — Scoping Rule

When `lift` appears inside a nested anonymous logic context (a `${}` block within lifted markup),
each `lift` call targets its own **immediate enclosing** element — not the outermost element.

**Example:**
```scrml
<ul>${
  for (group of groups) {
    lift <li>${
      for (item of group.items) {
        lift <span>${item.name}</>;
      }
    }</>;
  }
}</>
```

- The outer `lift <li>` targets `<ul>` — the parent of the outer `${}` block.
- The inner `lift <span>` targets `<li>` — the parent of the inner `${}` block.
- The `<span>` elements are appended to their nearest enclosing lifted element, not to `<ul>`.

**Normative statements:**

- Each anonymous `${}` logic context maintains its own lift accumulator, scoped to that block's parent element.
- A `lift` call inside a nested `${}` block SHALL append to the nearest enclosing element created by the outer `lift`, not to the root element of the outermost logic context.
- Nested `lift` does not violate the §10.4 restriction on named functions: nesting `${}` blocks inside lifted markup is valid. Each `${}` block is its own anonymous context.
- The compiler SHALL ensure that inner `lift` calls within a for-loop body pass the correct parent element reference (via `containerVar`) when the for-loop is itself inside a lifted element's content block.

### 10.7 Value-Lift Mode — Interaction with Accumulation Mode

When `lift` is used inside a logic block that is simultaneously an accumulation context (i.e., the block is inside a markup or style parent) AND that block is also an if-as-expression arm body, the compiler SHALL treat the block as being in value-lift mode only if the enclosing binding site (§17.6.3) is present. An ambiguous context — where both an accumulation parent and a value-lift binding site exist — is resolved in favor of value-lift mode; the accumulated result is not emitted to the markup parent.

In practice, if-as-expression bindings are always explicit (`const a = if (...) { ... }`), so the compiler can always determine the mode at the point of parsing.

**Normative statements:**

- The compiler SHALL determine lift mode (accumulation vs value-lift) by the presence or absence of an enclosing if-as-expression binding (§17.6.3).
- An explicit if-as-expression binding (`const a = if (...)`, `let a = if (...)`) SHALL always select value-lift mode for lift calls inside its arm bodies.
- The absence of an explicit if-as-expression binding SHALL default to accumulation mode.
- A `lift` in value-lift mode SHALL NOT contribute to any accumulation array.

### 10.8 `lift` Accumulation — Evaluation Order and Branch Semantics

**Added:** 2026-04-10 — DQ-3 resolution.

#### 10.8.1 Evaluation Order

Multiple `lift` statements within the same anonymous `${}` logic block accumulate in evaluation order — the order in which `lift` calls execute at runtime. There is no last-write-wins behavior. Every `lift` call appends one value to the accumulator regardless of prior `lift` calls in the same block.

#### 10.8.2 Conditional `lift` — Only the Taken Branch Emits

When `lift` appears inside an `if`/`else` block within an anonymous logic context, only the taken branch's `lift` calls are emitted. The not-taken branch contributes nothing to the accumulator.

```scrml
${
    if (item.featured) {
        lift <li class="featured">${item.name}</>;
    } else {
        lift <li>${item.name}</>;
    }
}
```

The compiler does not require both branches to contain `lift`.

#### 10.8.3 `${}` Nested Inside an Element Appends to That Element's Children

`lift` inside a `${}` block that is nested as the content of a markup element appends to that element's children list, not to any outer accumulator. Each nested `${}` block maintains its own accumulator scoped to its immediate parent element. (This is the rule of §10.6, restated here as a normative commitment alongside ordering and branch rules.)

**Normative statements:**

- Multiple `lift` calls in the same anonymous `${}` block SHALL accumulate in evaluation order. There is no last-write-wins; each `lift` appends one item.
- When `lift` appears in an `if`/`else` body, only the taken branch's `lift` calls SHALL be added to the accumulator. The not-taken branch SHALL contribute zero values.
- `lift` inside a `${}` nested within a lifted element SHALL append to that element's children list, not to any outer accumulator.

---

## 11. State Objects and `protect=`

### 11.1 State Object Declaration

A state object is declared using state syntax (Section 4.2). The `db` state type is a built-in state object backed by a SQLite database.

**Syntax:**
```scrml
< db src="path/to/db.sql" protect="field1, field2" tables="tablename">
    content
</>
```

Attributes on `< db>`:
- `src=` — path to the SQLite database file. SHALL be a quoted string.
- `protect=` — comma-separated list of column names to protect. SHALL be a quoted string. (See Section 11.3.)
- `tables=` — comma-separated list of table names to bring into scope. SHALL be a quoted string.

### 11.2 Compile-Time Schema Reading

When the compiler encounters a `< db>` state block, it SHALL:

1. Open the database file specified by `src=` at compile time using Bun's SQLite module.
2. Read the schema for all tables listed in `tables=`.
3. Infer a type for each table based on the column names and types in the schema.
4. Apply `protect=` field exclusions to the client-visible type (Section 11.3).
5. Make the resulting types available to all code inside the state block.

### 11.3 `protect=` — Type System and Routing Semantics

The `protect=` attribute names fields that SHALL NOT be accessible to client-side code.

#### 11.3.1 Client-visible type

For each table in scope of a `< db>` state block with a `protect=` list, the compiler SHALL construct two distinct types:

1. **Client type:** The table type with all protected fields OMITTED. Protected fields do not exist on this type.
2. **Full type:** The complete table type including all protected fields.

#### 11.3.2 Default type assignment

- All code in the state block SHALL use the **client type** by default.
- Accessing a protected field on the client type SHALL be a compile error (E-PROTECT-001): the field does not exist on the type.

#### 11.3.3 Server-escalated functions — full type access

A function that is server-escalated (either by compiler inference per Section 12.1 or by explicit `server` annotation per Section 11.4) and that executes within the lexical scope of a `< db>` state block SHALL receive the **full type**, including all protected fields.

**This is the only correct interpretation.** `protect=` is intended for authentication, access control, and data privacy use cases. If protected fields were excluded even from server-side functions in the same state block, writing authentication logic inside scrml would be impossible. `protect=` protects fields from the client; it does not prevent the server from reading them.

**Normative statements:**

- A server-escalated function inside the enclosing `< db>` state block's lexical scope SHALL have the full database type (including protected fields) in scope.
- A non-server-escalated function inside the same state block SHALL have only the client type in scope.
- The compiler SHALL verify at compile time that no function accessing protected fields executes on the client. Any code path that accesses a protected field and could run client-side SHALL be a compile error (E-PROTECT-002).
- The type distinction (client type vs. full type) SHALL be determined by the compiler's route analysis (Section 12), not by any developer annotation, except where the developer uses an explicit `server` annotation (Section 11.4).

**Worked example — valid:**
```scrml
< db src="auth.sql" protect="passwordHash" tables="users">
    <form onsubmit=authenticate(email, password)>
        <input type="email" name="email"/>
        <input type="password" name="password"/>
        <button>Login</>
    </form>
    ${ function authenticate(email, password) {
        // This function touches passwordHash — compiler escalates to server route.
        // Inside this server-escalated function, the FULL type is in scope,
        // including users.passwordHash.
        let user = ?{`SELECT passwordHash FROM users WHERE email = ${email}`}.get();
        if (!verifyHash(password, user.passwordHash)) {
            throw AuthError("Invalid credentials");
        }
        navigate("/dashboard");
    } }
</>
```

**Worked example — invalid (accessing protected field on client type):**
```scrml
< db src="auth.sql" protect="passwordHash" tables="users">
    ${ function displayUser(userId) {
        // This function does NOT touch any server resource other than a plain SELECT.
        // Compiler determines it can run client-side.
        // Client type does NOT include passwordHash.
        let user = ?{`SELECT passwordHash FROM users WHERE id = ${userId}`}.get();
        // ^ Error E-PROTECT-001: field 'passwordHash' does not exist on the client type.
        // The compiler will NOT silently escalate this — it is a type error.
        // To access passwordHash, this function must be server-escalated.
    } }
</>
```

Note: A plain `SELECT passwordHash` in a client-inferred function will fail the type check because `passwordHash` is not on the client type. The correct resolution is either to use the `server` annotation or to restructure so the password access is inside a server-escalated function.

#### 11.3.5 Relationship to State Authority

**Added:** 2026-04-08 — §52 cross-reference.

`protect=` is a field-level access control mechanism. It governs which fields of a state type are visible to client-side code.

State authority (§52) governs the source of truth for a state instance. It determines whether the database or the client is authoritative for the variable's value.

The two mechanisms are complementary. A state type MAY declare both:

```scrml
< User authority="server" table="users" protect="passwordHash">
    id: number
    email: string
    passwordHash: string
</>
```

In this case:
- `authority="server"` triggers sync infrastructure for `<User>` instances.
- `protect="passwordHash"` excludes `passwordHash` from client-visible types and optimistic update payloads.
- The protected field is accessible to server functions per §11.3.3.

See §52.7 for the full specification of how `protect=` and `authority=` interact.

### 11.4 Explicit `server` Annotation

A developer MAY annotate a function with `server` to explicitly force server-side execution regardless of compiler inference.

**Syntax:**
```scrml
server function name() { ... }
server fn name { ... }
```

**Security rationale:** Compiler inference is not guaranteed to be complete. Inference can fail to detect that a function touches protected data in cases involving derived values, dynamically constructed queries, or compiler analysis gaps. When inference fails, the compiler's default is client-side execution — which means protected data would be silently exposed to the client. The `server` annotation exists as a security escape hatch precisely because the consequences of an inference failure in the `protect=` context are a security vulnerability, not merely a performance or correctness issue.

Developers who write functions that handle authentication, authorization, or access-controlled data SHOULD always annotate those functions with `server` regardless of whether the compiler would infer it. The `server` annotation is an explicit correctness declaration, not a fallback.

**Normative statements:**

- A `server`-annotated function SHALL always be compiled to a server route, regardless of whether the compiler's inference rules would require it.
- A `server`-annotated function inside a `< db>` state block's lexical scope SHALL receive the full type (including protected fields).
- The compiler SHALL emit a warning when a function touches a protected field but is not server-escalated by inference AND does not have a `server` annotation. This warning SHALL suggest adding the `server` annotation. (W-PROTECT-001)
- The `server` annotation is a security escape hatch. It does not replace the compiler's inference. Both mechanisms SHALL work together.
- The `server` annotation MAY be used on any function, not only functions accessing protected fields. It is valid as a general "force server" directive.

---

## 12. Route Inference

### 12.1 Default Placement

The compiler SHALL decide where each function executes. The default is client-side execution.

### 12.2 Escalation Triggers

The compiler SHALL escalate a function to a server route if ANY of the following conditions is true:

1. The function accesses a resource not accessible from the client (e.g., a file-system-only database via Bun SQLite).
2. The function's inferred return type or any intermediate type in its body includes a protected field (from `protect=` on an enclosing state block).
3. Developer configuration declares that a specific module or function SHALL never run client-side.
4. The function has an explicit `server` annotation (Section 11.4).

Additional escalation triggers MAY be added in future versions of this specification.

### 12.3 Generated Infrastructure

For each server-escalated function, the compiler SHALL generate:
- A server-side route handler.
- A client-side fetch call that invokes the route.
- An event listener or reactive trigger that calls the fetch function at the appropriate time.
- Serialization and deserialization for all arguments and return values.

Route names are compiler-internal. The developer SHALL NOT reference, configure, or even observe the generated route names in scrml source. Route names are an implementation detail of the compiler.

### 12.4 Normative Statements

- The compiler SHALL perform route analysis before code generation. No function SHALL be split across client and server without the analysis completing.
- A function that the compiler cannot fully analyze for route placement SHALL be a compile error (E-ROUTE-001).
- A server-escalated function (whether inferred per §12.2 or explicitly annotated per §11.4)
  SHALL NOT call a function that the compiler has classified as client-only. A client-only
  function is any function determined by route analysis to execute exclusively on the client
  — for example, a function that reads a `const @name` derived reactive value, accesses
  any DOM API, or references a client-only import. The compiler SHALL emit E-ROUTE-002 if a
  server-escalated function's static call graph contains a direct or transitive call to a
  client-only function.
- When E-ROUTE-002 fires, the compiler error message SHALL identify: (a) the server function
  by name, (b) the client-only callee by name, and (c) the call chain between them. The
  message SHALL suggest one of the following resolutions: extract the shared logic into a
  pure function (§33) with no client or server classification; duplicate the logic inside
  the server function; or re-evaluate whether the callee is genuinely client-only.
- A function that has no client or server classification — a pure function per §32 — MAY be
  called from both server-escalated and client-only functions without restriction.

### 12.5 Server Function Return Values

**Added:** 2026-04-10 — Gauntlet Gap 1.

Server-escalated functions MAY return values to the client. The compiler generates serialization on the server and deserialization on the client automatically.

#### 12.5.1 Allowed Return Types

Return values are serialized as JSON. Supported return types:

- `string`, `number`, `boolean`
- `not` (serializes as `null`)
- Struct types (all fields must be JSON-serializable)
- Enum types (serialize as the variant name string)
- Arrays of any of the above
- `T | not` union types

#### 12.5.2 Client Receipt

The compiler-generated fetch wrapper deserializes the JSON response and returns it as the declared return type. The developer uses the return value directly — no manual `fetch`, `JSON.parse`, or `await` required:

```scrml
${ server function getUser(id) {
    return ?{`SELECT id, name, email FROM users WHERE id = ${id}`}.get()
} }

${ let user = getUser(userId) }   // `user` is the struct | not, deserialized
```

The compiler inserts `await` automatically per §13.

#### 12.5.3 Normative Statements

- A server function MAY return a value. The compiler SHALL generate serialization on the server and deserialization on the client for all return values.
- A server function MAY declare a return type with `->`: `server function name(args) -> ReturnType { ... }`. If absent, the compiler infers the return type from the body.
- Return types that are not JSON-serializable (functions, DOM nodes, class instances) SHALL be a compile error (E-ROUTE-003: non-serializable return type from server function).
- A server function returning `not` on some paths and `T` on others has inferred return type `T | not`. The client must handle the `not` case.
- The developer SHALL NOT write `JSON.stringify`, `JSON.parse`, or `fetch` to consume server function return values. These are compiler responsibilities.

---

## 13. Async Model

### 13.1 Developer-Visible Syntax

The developer SHALL NOT write `async`, `await`, `Promise`, `Promise.all`, or any other explicit asynchrony construct in scrml source code.

### 13.2 Compiler-Managed Asynchrony

The compiler SHALL:

1. Build a dependency graph of all operations in the program (see Section 30).
2. Identify which operations are independent (no data dependency between them).
3. Parallelize independent operations using `Promise.all` in generated code.
4. Sequence dependent operations using `await` in generated code.
5. Emit all generated async infrastructure without any developer input.

**Normative statements:**

- The compiler SHALL insert `await` at every call site where a server-generated fetch call is made.
- The compiler SHALL wrap any function containing at least one server call in an `async` function in generated code.
- The developer SHALL write flat, synchronous-looking code. The compiler SHALL produce optimal async execution patterns from this code.
- Independent server calls in the same function body SHALL be parallelized in generated code unless there is a data dependency between them.

### 13.3 Worked Example

**Developer writes (synchronous-looking):**
```scrml
${ function loadDashboard() {
    let user = getUser(userId);
    let items = getItems(userId);
    let stats = getStats(userId);
} }
```

**Compiler emits (simplified):**
```javascript
async function loadDashboard() {
    const [user, items, stats] = await Promise.all([
        fetchGetUser(userId),
        fetchGetItems(userId),
        fetchGetStats(userId)
    ]);
}
```
Because `user`, `items`, and `stats` have no data dependency on each other, the compiler parallelizes all three calls.

### 13.4 Server Function Composition

A server-escalated function MAY call another server-escalated function. Both execute in the
same server handler context. The callee does NOT generate a separate HTTP route — it is
inlined into the caller's server handler.

**Normative statements:**

- A server-escalated function SHALL be permitted to call another server-escalated function
  directly by name.
- The callee SHALL NOT generate an additional HTTP route when called from a server-escalated
  caller. The compiler SHALL inline the callee's logic into the caller's generated server
  handler.
- The developer SHALL NOT write the callee invocation differently when calling from a server
  context versus a client context. The form is the same; only the code-generation path differs.
- If function A (server-escalated) calls function B (server-escalated), and function B is
  also referenced from client code, the compiler SHALL generate TWO representations of B:
  one inlined version (used by A's server handler) and one fetch-based route handler (used
  by client call sites of B). These are independent code paths.

**Worked example — server function calling a helper server function (valid):**

```scrml
${ server function validateUser(id) {
    let user = ?{`SELECT * FROM users WHERE id = ${id}`}.get()
    if (not user) { throw "User not found" }
    return user
} }

${ server function getOrderHistory(userId) {
    let user = validateUser(userId)   // calls another server function
    let orders = ?{`SELECT * FROM orders WHERE user_id = ${userId}`}.all()
    return { user, orders }
} }
```

`validateUser` is server-escalated (it contains a `?{}` SQL block). `getOrderHistory` calls
`validateUser` directly. The compiler inlines `validateUser`'s logic into `getOrderHistory`'s
server handler. No separate HTTP route is generated for `validateUser` in this path.
`validateUser` still generates its own HTTP route if it is also called from client code.

### 13.5 Async Loading State Pattern — RemoteData Enum

**Added:** 2026-04-10 — DQ-9 resolution. Ratified via structured debate (Rust 45.0, Svelte 45.5, React 40.5, HTMX 36.0).

#### 13.5.1 The Problem

When client code calls a server function, there is a period where the call is in flight. The UI must represent this: loading indicators, error messages, success states. Without a canonical pattern, developers resort to manual boolean flags (`@isLoading = true/false`), which allow impossible states (loading AND error simultaneously) and scale poorly (3 variables per server call).

#### 13.5.2 The Canonical Pattern — RemoteData Enum

The idiomatic scrml approach models async operation state as an enum with transition rules. Each server call's lifecycle is a state machine with four states: not started, loading, success, and failure.

```scrml
type UsersState:enum = {
    NotAsked
    Loading
    Ready(users)
    Failed(message: string)

    transitions {
        .NotAsked => .Loading
        .Loading  => .Ready
        .Loading  => .Failed
        .Ready    => .Loading     // refetch
        .Failed   => .Loading     // retry
    }
}
```

**Why enums, not booleans:** The enum guarantees that the state is in exactly one variant at a time. `@usersState` cannot be both `.Loading` and `.Failed`. The `transitions` block (§51) enforces the legal state graph — the compiler rejects invalid transitions like `.NotAsked => .Ready` (skipping the loading phase).

#### 13.5.3 Worked Example — Data Fetch on Mount

```scrml
<program db="./app.db" tables="users">

${
    type UsersState:enum = {
        NotAsked
        Loading
        Ready(users)
        Failed(message: string)

        transitions {
            .NotAsked => .Loading
            .Loading  => .Ready
            .Loading  => .Failed
            .Ready    => .Loading
            .Failed   => .Loading
        }
    }

    @usersState = UsersState.NotAsked

    server function fetchUsers() {
        return ?{`SELECT id, name, email FROM users`}.all()
    }

    function loadUsers() {
        @usersState = UsersState.Loading
        let result = fetchUsers()
        @usersState = UsersState.Ready(result)
    }
}

on mount { loadUsers() }

match @usersState {
    .NotAsked => {}
    .Loading  => { <div class="spinner">Loading users...</> }
    .Ready(users) => {
        <ul>
            ${ for (user of users) {
                lift <li>${user.name} (${user.email})</>
            }}
        </>
    }
    .Failed(msg) => {
        <div class="error">
            ${msg}
            <button onclick=loadUsers()>Retry</>
        </>
    }
}

</program>
```

The `match @usersState` is exhaustive — the compiler verifies every variant is handled. Adding a new variant (e.g., `.Stale(users)`) forces every match site to be updated.

#### 13.5.4 Worked Example — Form Submission with Optimistic Update

For mutations, the enum carries in-flight data as variant payloads:

```scrml
${
    type OrderSubmit:enum = {
        Idle
        Saving(optimisticOrder)
        Committed(newOrder)
        Failed(message: string)

        transitions {
            .Idle      => .Saving
            .Saving    => .Committed
            .Saving    => .Failed
            .Committed => .Idle
            .Failed    => .Idle
            .Failed    => .Saving      // retry
        }
    }

    @submitState = OrderSubmit.Idle
    @orders = []

    server function createOrder(product, qty) {
        ?{`INSERT INTO orders (product, qty) VALUES (${product}, ${qty})`}.run()
        return ?{`SELECT * FROM orders ORDER BY id DESC`}.all()
    }

    function handleSubmit() {
        let optimistic = { id: -1, product: @product, qty: @qty }
        @submitState = OrderSubmit.Saving(optimistic)

        let freshOrders = createOrder(@product, @qty)
        @submitState = OrderSubmit.Committed(freshOrders[0])
        @orders = freshOrders
        @submitState = OrderSubmit.Idle
    }
}
```

The key insight: `Saving(optimisticOrder)` carries the in-flight data as a variant payload. The render logic can display the optimistic row by matching on `.Saving(opt)`. When the server responds, the transition to `.Committed` removes the optimistic entry by construction — no manual cleanup needed. This is strictly superior to a separate `@isSubmitting` boolean, which cannot carry the optimistic data and cannot guarantee cleanup on state transition.

#### 13.5.5 Worked Example — Parallel Data Fetch (Multiple Sources)

For dashboards with multiple server calls, each source gets its own enum:

```scrml
${
    type UsersState:enum = {
        Loading; Ready(users); Failed(message: string)
        transitions { .Loading => .Ready; .Loading => .Failed; .Ready => .Loading; .Failed => .Loading }
    }

    type MetricsState:enum = {
        Loading; Ready(metrics); Failed(message: string)
        transitions { .Loading => .Ready; .Loading => .Failed; .Ready => .Loading; .Failed => .Loading }
    }

    @usersState = UsersState.Loading
    @metricsState = MetricsState.Loading

    function loadDashboard() {
        @usersState = UsersState.Loading
        @metricsState = MetricsState.Loading

        let users = fetchUsers()
        @usersState = UsersState.Ready(users)

        let metrics = fetchMetrics()
        @metricsState = MetricsState.Ready(metrics)
    }
}

on mount { loadDashboard() }
```

Per §13.3, the compiler detects that `fetchUsers()` and `fetchMetrics()` are independent and parallelizes them with `Promise.all`. Each source transitions independently — users can be `.Ready` while metrics is still `.Loading`.

#### 13.5.6 Normative Statements

- The canonical pattern for async loading state in scrml SHALL be an enum type with variants representing the operation lifecycle (not-started, loading, success, failure).
- The `transitions` block (§51) SHOULD be used to enforce the legal state graph for async enum types.
- `match` on an async state enum in markup SHALL be exhaustive per §18 — all variants must be handled.
- The manual boolean pattern (`@isLoading = true; @data = serverFn(); @isLoading = false`) remains valid but is NOT the recommended idiom. It allows impossible states and does not compose with exhaustive matching.
- Optimistic update state SHOULD be carried as variant payloads (e.g., `Saving(optimisticData)`), not as separate boolean flags.
- Each independent server call SHOULD have its own enum state variable. Parallel calls transition independently.
- Future compiler sugar (e.g., a `loading` keyword) MAY desugar to this enum pattern. Any such sugar MUST preserve the enum's impossible-state guarantee and variant payload capability.

---

## 14. Type System

### 14.1 Overview

scrml has an independent type system. It is NOT modeled after TypeScript. The type system is developed progressively; this section defines the constructs specified in this version.

### 14.2 Type Declaration Syntax

```scrml
type name:kind = { ... }
```

- `name` — the type name.
- `:kind` — the kind annotation. Defined kinds: `:struct`, `:enum`. Additional kinds TBD.
- `{ ... }` — the type body (kind-dependent syntax).

### 14.3 Struct Types

```scrml
type user:struct = {
    id: number,
    email: string,
    passwordHash: (null -> string),
    metadata: (!null && !number)
}
```

**Field annotations:**

- `field: type` — field is of the given type.
- `(A -> B)` — lifecycle annotation. The field starts as type `A` and transitions to type `B`. The compiler tracks this transition; accessing the field before it has transitioned is a type error (E-TYPE-001).
- `!type` — type negation. The field's value SHALL NOT be of the given type.
- `(!A && !B)` — conjunction of constraints. The value must satisfy all constraints simultaneously.
- `A | B` — union. The value is one of the listed types.

#### 14.3.1 Optional Struct Fields

A struct field may be declared with a default value of `not`, making it optional at construction time:

```scrml
type:struct Token {
    kind: string;
    text: string;
    span: Span;
    block: Block = not;   // optional — defaults to `not` if not assigned
}
```

When a struct instance is created with `< Token>`, optional fields are initialized to `not`. They may be assigned normally:

```scrml
let tok = < Token>
tok.kind = "BLOCK_REF"
tok.block = someBlock    // optional field assigned
```

Optional fields have type `T | not` — they can hold either a value of type `T` or the absence value `not`. Code that reads an optional field must handle the `not` case:

```scrml
if (tok.block is not) {
    // no block reference
} else {
    // tok.block is a Block
}
```

E-FN-006 (return-site completeness in `fn` bodies, §48.4.3) does NOT fire for optional fields that remain `not` at return time — only required fields (those without `= not` default) must be assigned before return.

#### 14.3.2 Enum Types as Struct Field Types

**Added:** 2026-04-10 — Gauntlet Gap 2.

Enum types MAY be used as struct field types. The field holds an enum variant value.

```scrml
type Status:enum = { Pending | Active | Closed }

type Issue:struct = {
    id: number,
    title: string,
    status: Status
}
```

Pattern matching on an enum-typed struct field works normally:

```scrml
match issue.status {
    .Pending -> showPending()
    .Active  -> showActive()
    .Closed  -> showClosed()
}
```

**Normative statements:**

- An enum type name MAY appear as the type annotation of a struct field. This is valid and SHALL compile.
- The field value is an enum variant (including payload fields for payload variants).
- Pattern matching on an enum-typed struct field is valid and works identically to pattern matching on any enum-typed variable, including exhaustiveness checking.
- An enum-typed struct field without a default is required at construction. An enum-typed field with a default (e.g., `status: Status = .Pending`) is optional and initializes to the default variant.

### 14.4 Enum Types

```scrml
type Direction:enum = {
    North
    South
    East
    West
}

type Shape:enum = {
    Circle(radius:number)
    Rectangle(width:number, height:number)
    Point
}
```

- Variants are declared one per line inside `{ }`.
- A variant with no parentheses is a unit variant (carries no payload).
- A variant with `(field:type, ...)` is a payload variant. Each named field has a type annotation.
- Enum variant names SHALL begin with an uppercase letter.
- Enum type names SHALL begin with an uppercase letter.

#### 14.4.0 Transition Rules Cross-Reference

**Added:** 2026-04-08 — §51 cross-reference.

An enum type body MAY include a `transitions {}` block following the variant list. The
`transitions {}` block declares the default legal graph for this enum type. When present,
any assignment to a variable of this enum type is validated against the declared rules.

See §51 for the complete specification of type-level and machine-level transition rules.

An enum type without a `transitions {}` block is an **unrestricted enum**. Any variant may
be assigned at any time. This is the default behavior of all existing enum declarations and
is backwards-compatible.

**Normative statements:**

- The `transitions {}` block, when present, SHALL appear after all variant declarations and
  SHALL be the last item in the enum body.
- An enum type that has a `transitions {}` block SHALL NOT permit a `given` guard inside
  that block. Guards require a `< machine>` declaration (§51.3, E-MACHINE-010).
- An enum type without a `transitions {}` block is unrestricted. The absence of the block
  SHALL NOT generate any warning or error.

#### 14.4.1 String-to-Enum Coercion — `toEnum()`

The `toEnum()` function accepts a string value and returns the corresponding enum variant, or throws if no variant matches. Codegen emits a lookup table for O(1) conversion. See implementation: rewrite.ts `rewriteEnumToEnum()`.

**Syntax:** `let role = UserRole.toEnum(roleString)`

The return type is `UserRole | not` (`not` if the string does not match any variant name). The compiler generates a lookup table mapping variant name strings to enum values. String matching is case-sensitive — the string must exactly match the variant name as declared.

#### 14.4.2 Enum Iteration — `EnumType.variants`

The `.variants` static property returns an array of all variant names for the enum type. Codegen emits a `_variants` array alongside each enum definition.

**Syntax:** `for (variant of UserRole.variants) { ... }`

The array contains the variant values in declaration order. For unit variants, each element is the variant value itself. For payload variants, the array contains the variant constructors. This enables rendering all options of an enum (e.g., populating a `<select>` dropdown).

#### 14.4.3 Enum Coercion from DB Query Results

SQLite stores all values as text. When a query returns rows where a column maps to an enum
type, the raw value is a string (e.g., `"Todo"`) not an enum variant (`TaskStatus.Todo`).
In generated JS, `TaskStatus.Todo` compiles to the string `"Todo"`, so these are equivalent
at runtime. The issue is type clarity and developer intent, not runtime correctness.

**The recommended idiom** — use `toEnum()` in the row mapping:

```scrml
type TaskStatus:enum = { Todo | InProgress | Done }

< db src="./app.db" tables="tasks">
    @tasks = ?{`SELECT * FROM tasks`}.all()
</>

${ @tasks = @tasks.map(row => ({
    ...row,
    status: TaskStatus.toEnum(row.status) ?? row.status
})) }
```

The `?? row.status` fallback preserves the raw string if the DB contains an unrecognized
value. For strict validation, omit the fallback and handle `not` at the call site.

**Multiple enum fields in one struct:**

```scrml
type Priority:enum = { Low | Medium | High }
type Status:enum = { Open | Closed | Pending }

${ @issues = ?{`SELECT * FROM issues`}.all().map(row => ({
    ...row,
    priority: Priority.toEnum(row.priority) ?? row.priority,
    status: Status.toEnum(row.status) ?? row.status
})) }
```

**Normative statements:**

- `TypeName.toEnum(str)` SHALL return the matching enum variant string if `str` exactly
  matches a unit variant name (case-sensitive), or `not` if no match is found.
- The compiler SHALL emit a lookup table `const TypeName_toEnum = { ... }` in the client
  bundle for every enum type with at least one unit variant.
- Using `toEnum()` inside `.map()` on a query result is the standard idiom for enum-typed
  DB columns and is fully supported.
- Full auto-coercion (compiler-injected `.map()` at query boundaries) is deferred to the
  typed variable declaration milestone (§14.2 extension). This section will be updated when
  that feature lands.

**Return type:** `T | not` where `T` is the enum type. In generated JS, `not` compiles to
`null`. Use `?? fallback` or `is not` checks at the call site.

### 14.5 Enum Expression Syntax

- Fully qualified: `Direction.North`
- Shorthand (when type is inferred from context): `.North`
- Enum variant access uses `.` (dot notation). In fully qualified form `TypeName.VariantName`, the
  `.` separates the type name from the variant name. This is a distinct syntactic production from
  property access (§5) — the compiler disambiguates by whether the left-hand side resolves to an
  enum type. The shorthand form `.VariantName` is valid only where the enum type is inferable from
  context (e.g., inside a match arm for a known enum type, or in an assignment where the target has
  a declared enum type).
- The `::` sigil is a VALID ALIAS for `.` in enum variant access. `TypeName::VariantName` and
  `::VariantName` are accepted as equivalent to `TypeName.VariantName` and `.VariantName`
  respectively. The canonical form is `.` (dot notation). The compiler preference setting
  controls which form the formatter normalizes to.

**Normative statements:**

- A fully qualified enum variant SHALL be written `TypeName.VariantName` (canonical) or
  `TypeName::VariantName` (alias). The compiler SHALL resolve both `.` and `::` as variant
  access when the left-hand operand is an enum type name.
- A shorthand variant reference SHALL be written `.VariantName` (canonical) or `::VariantName`
  (alias) and SHALL be valid only in positions where the enum type is determinable from context.
  A shorthand variant reference in a position where the type cannot be inferred SHALL be a
  compile error (E-TYPE-061: cannot infer enum type for shorthand variant `.VariantName`).
- The canonical forms are `.` for enum variant access. The compiler preference setting controls
  which form the formatter normalizes to.

### 14.6 Pattern Matching

Pattern matching over enum types uses match arms. All variants must be covered or a default arm provided.

```scrml
match value {
    ::Circle(r) -> ...
    ::Rectangle(w, h) -> ...
    ::Point -> ...
}
```

- The compiler SHALL enforce exhaustiveness. A match expression that does not cover all variants of the matched type and has no default arm SHALL be a compile error (E-TYPE-020).
- An `else` arm is a valid default arm.

### 14.7 The `asIs` Type

`asIs` is a keyword meaning "accept any type, but resolve before scope exit or return." It is analogous to TypeScript's `unknown`, not `any`.

- A value of type `asIs` SHALL be resolved (narrowed to a concrete type) before it is returned from a function or goes out of scope.
- Using an `asIs` value past the point where resolution is required, without resolving it, SHALL be a compile error (E-TYPE-030).
- Component bare props follow `asIs` rules: the compiler infers the concrete type constraint from how the prop is used inside the component body (Section 15.2).

### 14.8 Database-Schema-Derived Types

**Added:** 2026-03-26 — resolves SPEC-PA-017.

This section specifies how the TS stage (Stage 6) translates the `ColumnDef[]` arrays
produced by PA (Stage 4) into named struct types accessible within the lexical scope of a
`< db>` state block. §11.2 and PIPELINE.md Stage 4 both defer this concern here. PA
implementers produce column data; this section governs how TS consumes it.

#### 14.8.1 Type Generation

For each table named in `tables=` on a `< db>` state block, the TS stage SHALL generate
two named struct types from the PA output:

1. **Full-schema type** — a struct containing one field per column in `fullSchema`.
2. **Client-schema type** — a struct containing one field per column in `clientSchema`
   (protected fields excluded).

These types are generated at compile time. They do not exist in the source text. They are
compiler-synthesized names inserted into the scope chain of the enclosing `< db>` block.

The generated types are **nominal**: two independently generated types for the same table
with identical fields are distinct types and are not interchangeable. Nominality prevents
accidental cross-block mixing of database row values from different `< db>` blocks even when
the underlying schemas happen to be identical.

#### 14.8.2 Naming Convention

The generated type name for a table is derived from the table name by applying the following
PascalCase algorithm:

1. Split the table name on `_` (underscore).
2. Capitalize the first letter of each resulting segment. Leave the remaining letters
   unchanged.
3. Concatenate the segments.

**Examples:**

| Table name        | Generated type name |
|-------------------|---------------------|
| `users`           | `Users`             |
| `user`            | `User`              |
| `UserProfiles`    | `UserProfiles`      |
| `user_profiles`   | `UserProfiles`      |
| `order_line_item` | `OrderLineItem`     |
| `ORDERS`          | `ORDERS`            |

Step 2 capitalizes only the first character of each segment. If the table name contains no
underscores, the algorithm capitalizes only the first character of the whole name and leaves
the rest unchanged. A table name already in PascalCase is preserved as-is (the algorithm
produces the same result).

**Normative statements:**

- The TS stage SHALL apply the PascalCase algorithm above to every table name in `tables=`
  to derive the generated type name. No other naming algorithm SHALL be used.
- The algorithm is case-sensitive. `users` and `Users` produce different table names in SQL
  (database-engine dependent) but the PascalCase result for both is `Users`. If a database
  contains two tables that resolve to the same generated type name (e.g., both `users` and
  `Users` in a case-insensitive SQLite database), this is a compile error (E-TYPE-050).

#### 14.8.3 SQLite Type Mapping

PA's `ColumnDef.sqlType` is a raw string from SQLite schema introspection. TS SHALL map this
string to a scrml type according to the following rules.

**Primary mapping (exact match on SQLite storage class keyword, case-insensitive):**

| SQLite type string (case-insensitive match) | scrml type  |
|---------------------------------------------|-------------|
| `INTEGER`, `INT`                            | `number`    |
| `TEXT`, `CHAR`, `CLOB`, `VARCHAR`           | `string`    |
| `REAL`, `FLOA`, `DOUB`                      | `number`    |
| `BLOB`                                      | `bytes`     |
| `NULL`                                      | `any`       |
| (empty string / absent)                     | `any`       |

**Affinity matching:** SQLite uses type affinity rules — a declared type of `VARCHAR(255)`
has TEXT affinity. TS SHALL apply SQLite's own five-class affinity algorithm to map any
declared type string that does not appear in the primary mapping table:

1. If the declared type contains the substring `INT` (case-insensitive), the scrml type is
   `number`.
2. Otherwise, if the declared type contains `CHAR`, `CLOB`, or `TEXT`, the scrml type is
   `string`.
3. Otherwise, if the declared type contains `BLOB` or is empty, the scrml type is `any`.
4. Otherwise, if the declared type contains `REAL`, `FLOA`, or `DOUB`, the scrml type is
   `number`.
5. Otherwise, the scrml type is `number` (SQLite NUMERIC affinity default).

If after applying affinity matching the scrml type still cannot be determined — for example,
because the `sqlType` string contains characters that prevent any substring match — the TS
stage SHALL emit E-TYPE-051 and treat the column type as `any` to allow compilation to
continue.

**Nullability:** If `ColumnDef.nullable` is `true`, the scrml type for that field is
`T | not`, where `T` is the mapped type from the table above. If `nullable` is `false`,
the type is `T` alone.

**Normative statements:**

- The TS stage SHALL apply the affinity algorithm above to every `ColumnDef` in both
  `fullSchema` and `clientSchema` before generating the struct type.
- A `ColumnDef` with `nullable: true` SHALL produce a field type of `T | not`.
- A `ColumnDef` with `nullable: false` SHALL produce a field type of `T`.

#### 14.8.4 Scope Insertion

The two generated types for each table SHALL be inserted into the lexical scope of the
enclosing `< db>` state block. They are accessible to all code within that block and its
children according to normal lexical scoping rules.

The two views for the same table share the same generated type name. TS resolves which view
is in scope at each usage site using the `RouteMap` produced by RI (Stage 5):

- At a usage site inside a **server-escalated** function (per `RouteMap`), the name resolves
  to the full-schema type (all columns).
- At a usage site inside a **client-boundary** function (per `RouteMap`), the name resolves
  to the client-schema type (protected columns excluded).

There is one name in scope, not two. The TS stage performs view selection transparently
during type resolution. Developer code references the type by its single generated name
(e.g., `Users`); the compiler selects the appropriate struct silently.

**Normative statements:**

- The TS stage SHALL insert generated table types into the scope chain of the `< db>` state
  block node during the scope-building pass, before type resolution of any expression inside
  that block.
- The generated type name SHALL shadow any user-declared type with the same name in the same
  scope. If a user-declared type and a generated table type share the same name, this SHALL
  be a compile error (E-TYPE-050).
- Outside the lexical scope of the enclosing `< db>` block, the generated type name SHALL NOT
  be accessible. It does not leak into sibling or parent scopes.
- The TS stage SHALL use the `RouteMap` from RI to select the full-schema or client-schema
  view at each expression that resolves to the generated type name. This selection is
  transparent to developer code.

#### 14.8.5 Error Conditions

| Code       | Trigger                                                                                         | Severity |
|------------|------------------------------------------------------------------------------------------------|----------|
| E-TYPE-050 | Two or more tables in `tables=` (or a table name and a user-declared type) produce the same    | Error    |
|            | generated type name after applying the PascalCase algorithm of §14.8.2.                        |          |
| E-TYPE-051 | A `ColumnDef.sqlType` string cannot be mapped to any scrml type after exhausting the affinity  | Warning  |
|            | algorithm of §14.8.3. The column is typed `any` and compilation continues.                     |          |

**E-TYPE-050 detail:** This error fires in two distinct cases:
- Two tables in the same `< db>` block resolve to the same PascalCase name (e.g., both `user`
  and `User` are listed in `tables=`). The compiler SHALL list both offending table names.
- A user-declared type in the enclosing scope has the same name as a generated table type.
  The compiler SHALL identify both the user declaration span and the `< db>` block span.

**E-TYPE-051 detail:** Unrecognized SQLite types are a warning, not an error, because SQLite
allows arbitrary type strings and the affinity algorithm handles most real-world cases. The
warning informs the developer that a column will be typed `any` and may lose static safety.
The compiler SHOULD include the offending `sqlType` string and the table/column name in the
warning message.

#### 14.8.6 Worked Examples

**Valid — full schema in server function, client schema in markup:**
```scrml
< db src="auth.sql" protect="passwordHash" tables="users">
    ${ function displayName(userId) {
        // This function is client-boundary (no protected field access).
        // In scope: Users (client schema) — id, email, createdAt only.
        let user = ?{`SELECT id, email FROM users WHERE id = ${userId}`}.get();
        // user has type: Users (client) = { id: number, email: string, createdAt: string }
        return user.email;
    } }
    ${ server function authenticate(email, password) {
        // This function is server-escalated (explicit annotation).
        // In scope: Users (full schema) — id, email, passwordHash, createdAt.
        let user = ?{`SELECT passwordHash FROM users WHERE email = ${email}`}.get();
        // user has type: Users (full) = { id: number, email: string, passwordHash: string, createdAt: string }
        return verifyHash(password, user.passwordHash);
    } }
</>
```

- `displayName` is client-boundary. TS resolves `Users` to the client schema. `passwordHash`
  does not exist on that type. Any attempt to access `user.passwordHash` inside
  `displayName` is E-PROTECT-001 (field does not exist on client type).
- `authenticate` is server-escalated. TS resolves `Users` to the full schema. `passwordHash`
  is present. The access is valid.

**Invalid — duplicate generated type name (E-TYPE-050):**
```scrml
< db src="app.sql" tables="users, Users">
```
Both `users` and `Users` resolve to the generated type name `Users` via the PascalCase
algorithm. The TS stage SHALL emit:

> E-TYPE-050: Tables `users` and `Users` both produce the generated type name `Users` within
> the same `< db>` block. Rename one table or adjust the schema to remove the collision.

**Invalid — protected field access on client type (E-PROTECT-001, detected via §14.8.4
view selection):**
```scrml
< db src="auth.sql" protect="passwordHash" tables="users">
    ${ function leakPassword(userId) {
        // Client-boundary function. Users resolves to client schema.
        let row = ?{`SELECT id FROM users WHERE id = ${userId}`}.get();
        return row.passwordHash;  // E-PROTECT-001: field does not exist on client type Users
    } }
</>
```

> E-PROTECT-001: Field `passwordHash` does not exist on type `Users` (client schema). To
> access protected fields, annotate the function with `server` or ensure the compiler
> escalates it via a protected-field access trigger (§12.2 Trigger 2).

#### 14.8.7 Interaction Notes

- **§11.3.3 (server-escalated functions):** The view selection rule in §14.8.4 is the
  concrete mechanism implementing §11.3.3's normative requirement that server-escalated
  functions receive the full type. §14.8.4 is authoritative on the TS mechanics; §11.3.3
  is authoritative on the security intent.
- **§12 (Route Inference):** TS consumes the `RouteMap` from RI to perform view selection.
  TS does not re-perform route inference. The `RouteMap` is the authoritative input.
- **§14.3 (Struct Types):** Generated table types are struct types in the sense of §14.3.
  However, they are synthesized by the compiler — they do not have a user-visible type
  declaration syntax. Developer code MAY NOT redeclare or extend a generated table type.
- **§8 (SQL Contexts):** SQL query result types are inferred using the generated table types.
  A `?{ SELECT id, email FROM users }` context produces a value whose type is a struct
  containing only the selected columns, derived from the appropriate `Users` view (full or
  client per §14.8.4). Selecting a protected column in a client-boundary function's SQL
  context is E-PROTECT-001, not merely a SQL error.
- **Multiple `< db>` blocks (§11.7):** Each `< db>` block has its own independent generated
  types. Two `< db>` blocks that both list `users` in `tables=` produce two independent
  `Users` types with nominal distinctness. They are not the same type even if the underlying
  schemas are identical.

### 14.9 The `snippet` Type Kind

A `snippet` is a deferred, parameterisable markup fragment. It is callable — it produces markup when invoked. `snippet` is a first-class type kind in the scrml type system.

| Form | Semantics |
|---|---|
| `snippet` | A zero-parameter deferred markup fragment. |
| `snippet(param: Type)` | A parametric deferred markup fragment. Produces markup given one argument. |
| `snippet?` (or `propName?: snippet`) | An optional snippet prop. Evaluates to `null` when the caller provides no value. |

`snippet` is distinct from all other type kinds. A `snippet`-typed value is NOT assignable to `string`, `number`, a struct type, an enum type, or `asIs` (E-TYPE-070).

A `snippet`-typed value is invoked with the `render` keyword. `render` is valid only inside a markup-producing context (E-TYPE-071). `render propName()` invokes a zero-parameter snippet. `render propName(expr)` invokes a parametric snippet. Arity mismatches are E-TYPE-072. Invoking an optional snippet without a null guard is E-TYPE-073.

| Code | Trigger | Severity |
|---|---|---|
| E-TYPE-070 | `snippet`-typed value used in non-render, non-null-check position | Error |
| E-TYPE-071 | `render` invocation outside a markup-producing context | Error |
| E-TYPE-072 | `render` invocation arity mismatch | Error |
| E-TYPE-073 | Optional snippet invoked without null guard | Error |

---

## 15. Component System

### 15.1 Component Definition

A component is defined with a `const` assignment to a markup expression:

```scrml
const name = <element prop1 prop2="default">
    children
</element>
```

- `name` — the component identifier. SHALL begin with an uppercase letter to distinguish it from HTML elements.
- `element` — the root HTML element. This determines the component's shape for placement validation.
- `prop1` — a bare prop (no value): required. Caller MUST provide a value.
- `prop2="default"` — a prop with a default value: optional. Caller MAY omit it.

#### 15.1.1 Inline Components — Same-File Declaration

Components MAY be declared in the same file as their usage. A `const Name = <element ...>` declaration at file scope or inside a `${}` block defines an inline component that can be instantiated with `<Name>` in the same file. No import is needed for same-file components.

**Normative statements:**

- The component expander (CE) SHALL resolve component references against same-file declarations before checking imports. Declaration order does not matter — the entire file is scanned.
- Same-file components follow all rules of §15: typed props, `bind:propName`, snippet/slot, and callback props.
- The compiler SHALL NOT emit W-CALLBACK-001 for callback props on same-file components where the callback is a named function declared in the same scope.

### 15.2 Bare Props and `asIs`

- A bare prop declared in the component definition (no value, no type annotation) follows `asIs` rules.
- The compiler SHALL infer the concrete type of a bare prop from how it is used inside the component body.
- If the inferred type cannot be determined before the prop goes out of scope or is returned, this SHALL be a compile error (E-TYPE-030).

### 15.3 Typed Props with Constraints

Props MAY carry explicit type annotations and constraints:

```scrml
const card = <div title:String using (length > 0)>
    <h2>${title}</>
</>
```

- `:String` — type annotation on the prop.
- `using (expr)` — a value constraint. The compiler SHALL enforce that the provided value satisfies the constraint at the call site. A value that fails the constraint SHALL be a compile error (E-TYPE-031).

### 15.4 Component Shape Inheritance

- A component inherits the shape of its root HTML element.
- `const card = <div>` means `card` is valid anywhere a `<div>` is valid.
- `div` and `span` are different shapes. The compiler SHALL enforce shape constraints.
- `const div = <span>` SHALL produce a warning (W-NAME-001): the component name misleadingly matches a different HTML element type. This warning is configurable (see Section 28).

### 15.5 Static Attributes and Class Merging

- Static attributes declared on the root element of a component definition are fixed on every instance.
- When a caller provides a `class` attribute, it is APPENDED to the component's existing class list, not replaced.
- Normal CSS cascade applies after class merging.
- Adding `id=` at a call site is allowed. Adding `id=` makes that instance a singleton.

### 15.6 Component Naming

- A component name SHALL NOT be the same as a built-in HTML element name. This would cause ambiguity at use sites. Violation SHALL be a compile error (E-NAME-001).
- A component name that misleadingly matches a different HTML element (e.g., `const div = <span>`) SHALL produce warning W-NAME-001. This warning MAY be configured to be an error.

### 15.7 The `fixed` Attribute

The `fixed` attribute on an element inside a component body marks that element and its entire subtree as non-overridable.

- `fixed` applies to the element it is placed on and all of its descendants.
- `fixed` MAY be placed on any element inside a component body. It is not restricted to the root element.
- A caller targeting a `fixed` element with slot content SHALL be a compile error (E-COMPONENT-001).
- A caller attempting to override a `fixed` attribute SHALL be a compile error (E-COMPONENT-001).

**Worked example:**
```scrml
const card = <div class="card">
    <div class="card__footer" fixed>
        <p>Footer content that cannot be overridden</>
    </>
</>
```

### 15.8 Component Usage

```scrml
<ComponentName prop="value" optionalProp="override">
    children
</ComponentName>
```

- Usage syntax is identical to HTML element syntax.
- The first character of the component name distinguishes it from HTML elements (uppercase vs. lowercase) in diagnostic output. The block splitter applies the same tag-vs-state rule (Section 4.3) for the open bracket.
- Caller-provided children flow to the `${...}` unnamed children spread inside the component body (Section 16.3).

### 15.9 Inline Prop Interpolation

`${prop}` inside component markup text interpolates the value of a prop or variable.

```scrml
const greeting = <p>Hello, ${name}!</>
```

### 15.10 Typed Props Declaration Block

A component MAY declare its props using a `props` attribute on the root element.
The `props` attribute accepts an inline type record. Props declared this way are
available as plain identifiers throughout the component body — they do not require
`${prop}` interpolation to reference; however `${prop}` interpolation in markup
text is still the mechanism for embedding prop values in text content.

**Syntax:**

```
props-attr   ::= 'props' '=' '{' prop-decl (',' prop-decl)* '}'
prop-decl    ::= identifier ':' type-expr
               | identifier '?' ':' type-expr           // optional prop
               | identifier ':' type-expr '=' literal   // prop with default
```

**Example:**

```scrml
const UserCard = <div props={ name: string, avatar: string, role: UserRole }>
    <img src=avatar>
    <h3>${name}</>
    <span>${role}</>
</>
```

**Rules:**

- The `props` attribute SHALL be valid only on the root element of a component
  definition (`const Name = <element ...>`). Using `props` on a non-root element
  inside a component body, or on any element outside a component definition, SHALL
  be a compile error (E-COMPONENT-010).
- Props declared in the `props` block are required by default. A required prop that
  is absent at the call site SHALL be a compile error (E-COMPONENT-010).
- A prop marked optional with `?` (e.g., `label?: string`) MAY be omitted at the
  call site. An optional prop without a default has value `null` when omitted.
- A prop with a default value (e.g., `size: string = "medium"`) MAY be omitted at
  the call site; the default value is used.
- Extra props provided at the call site that are not declared in the `props` block
  SHALL be a compile error (E-COMPONENT-011).
- Prop names SHALL be valid identifiers. They SHALL NOT shadow scrml keywords or
  built-in scope bindings (`route`, `session`, `match`, `lift`, etc.).
- A component definition using `props` MAY also use the bare-prop and inline-annotation
  forms from §15.1-§15.3. However, the same prop name SHALL NOT appear in both the
  `props` block and as a bare attribute on the root element (E-COMPONENT-012:
  duplicate prop declaration).
- Props declared via `props` are in scope throughout the entire component body,
  including in nested markup, logic contexts, and slot content.

**Normative statements:**

- A component root element `props` attribute SHALL declare the typed props interface
  for that component.
- The compiler SHALL verify at every call site that all required props are provided
  and that all provided props appear in the declaration. Missing required props SHALL
  be E-COMPONENT-010. Extra undeclared props SHALL be E-COMPONENT-011.
- Prop types SHALL be verified at the call site. A prop value that is not assignable
  to the declared prop type SHALL be a compile error (E-TYPE-031).
- Optional props not provided at the call site SHALL have type `T | not` inside the
  component body, where `T` is the declared prop type. The component body must handle
  the `not` case.

**Worked example — valid:**

```scrml
const UserCard = <div class="card" props={ name: string, role: UserRole, size?: string }>
    <h3>${name}</>
    <span class="role">${role}</>
    <span class="size">${size ?? "medium"}</>
</>

// Call site
<UserCard name="Alice" role=::Admin>
```

`size` is omitted; inside the body it is `null`.

**Worked example — invalid (missing required prop):**

```scrml
const Badge = <span props={ label: string, color: string }>
    ${label}</>

<Badge label="Admin">
```

Error E-COMPONENT-010: Component `Badge` requires prop `color`; not provided at call site.

**Worked example — invalid (extra undeclared prop):**

```scrml
<Badge label="Admin" color="red" icon="star">
```

Error E-COMPONENT-011: Component `Badge` does not declare prop `icon`.

**Error codes:**

| Code | Trigger | Severity |
|---|---|---|
| E-COMPONENT-010 | Required prop missing at call site, OR `props` attribute on non-root element | Error |
| E-COMPONENT-011 | Extra prop at call site not declared in `props` block | Error |
| E-COMPONENT-012 | Same prop name declared in both `props` block and as bare attribute | Error |

### 15.11 Callback Props

scrml components communicate child-to-parent using two mechanisms that together handle all
cases: **reactive binding (`bind:` on component props)** for simple state synchronisation,
and **state projection** for structured data communication. A third mechanism — function-typed
props — is available as an explicit escape hatch but carries a compiler warning.

The goal is the same as everywhere else in scrml: the compiler owns the wiring. The developer
names what should be shared; the compiler generates the subscription. Neither `dispatch()`
calls nor explicit handler wiring belong in scrml source code.

---

#### 15.11.1 Mechanism 1: `bind:` on Component Props

`bind:` extends from DOM form elements (§5.4) to component props. When a caller writes
`bind:propName=@var` on a component, the compiler generates a two-way synchronisation
channel between the caller's reactive variable and the component's named prop.

**Syntax (call site):**

```
component-bind-attr ::= 'bind:' identifier '=' '@' identifier
```

**Syntax (component definition — `props` block):**

```
bindable-prop-decl ::= 'bind' identifier ':' primitive-type
primitive-type     ::= 'string' | 'number' | 'boolean'
```

A prop declared with `bind` in the `props` block is a **bindable prop**. A bindable prop
declares that the component may write back to the caller's reactive variable through this
channel.

**What the compiler generates:**

For `<Modal bind:visible=@showModal>`, the compiler generates:
1. A prop pass-through that initialises the component's `visible` field from `@showModal`.
2. An automatic write-back: whenever the component's internal `visible` changes, `@showModal`
   is updated to match.
3. Reactive dependency tracking so that changes to `@showModal` from outside the component
   also propagate in.

The developer writes neither side of this wiring.

**Normative statements:**

- `bind:propName=@var` SHALL be valid on any component call where `propName` is declared
  as a `bind` prop in the component's `props` block.
- `bind:propName=@var` on a component call where `propName` is NOT declared as a `bind`
  prop SHALL be a compile error (E-COMPONENT-013: prop `propName` is not declared as
  bindable; use `bind propName: type` in the `props` block to make it bindable).
- The right-hand side of a `bind:` attribute on a component SHALL be an `@`-prefixed
  reactive variable. A plain variable SHALL be a compile error (E-ATTR-010).
- Bindable props SHALL be restricted to primitive types (`string`, `number`, `boolean`).
  Declaring a `bind` prop with a struct or state type SHALL be a compile error
  (E-COMPONENT-014: `bind` props must be primitive types; use state projection (§15.11.2)
  for structured data).
- The compiler SHALL generate bidirectional synchronisation for `bind:` component props.
  Changes to `@var` in the parent SHALL propagate into the component. Changes to the
  bindable prop inside the component SHALL propagate back to `@var` in the parent.
- A caller MAY provide a `bind:` attribute on a prop for which the component has also
  declared a default value. The caller-provided `@var` initial value overrides the default.

**Worked example — valid (modal toggle):**

```scrml
// modal.scrml
export const Modal = <div class="modal" props={ bind visible: boolean, title: string }>
    <div class="modal-header">
        <h2>${title}</>
        <button onclick=${ visible = false }>Close</>
    </>
    ${...}
</>

// Parent
<program>
    @showModal = false

    <button onclick=${ @showModal = true }>Open settings</>
    <Modal bind:visible=@showModal title="Settings">
        <p>Modal content here</>
    </>
</>
```

When the user clicks "Close" inside the modal, `visible = false` writes back through the
bind channel to `@showModal`, which the parent owns. No handler function, no callback prop,
no reactive guard needed. The compiler generates all subscription wiring.

**Worked example — invalid (bind: on non-bindable prop):**

```scrml
const Tag = <span props={ label: string }>
    ${label}</>

<Tag bind:label=@tagText>
```

Error E-COMPONENT-013: Prop `label` on component `Tag` is not declared as bindable.
Change the `props` block to `bind label: string` to allow two-way binding, or remove
the `bind:` prefix and pass a value directly.

**Worked example — invalid (bind: with struct type):**

```scrml
const Form = <form props={ bind result: FormResult }>
```

Error E-COMPONENT-014: `bind` prop `result` has type `FormResult` (a struct type). `bind`
props must be primitive types (`string`, `number`, `boolean`). To share structured data
between a parent and a component, use state projection (§15.11.2).

---

#### 15.11.2 Mechanism 2: State Projection

State projection is the scrml-native mechanism for complex structured communication between
a parent and a component. The parent instantiates a state type, passes the instance as a
regular prop, and the component reads and writes fields on it. The parent reacts via the
existing reactive dependency system — no new wiring required.

Communication IS state, not events. The component does not call a function or dispatch an
event; it mutates a shared state instance. The parent's reactive rendering observes field
changes automatically.

**State instance mutability:** State type definitions (`< typename>` declarations) are
immutable — the shape of the type is fixed at compile time. State instances (the runtime
objects that carry field values) are mutable. Field writes on a state instance trigger
reactive updates in all observers, exactly as writes to `@variables` do. This distinction is
normative: the immutability guarantee is on the TYPE DEFINITION, not on the instance.

**Syntax:**

State types used for projection are declared with state block syntax (§4.2). A state type
intended for use as a communication channel is declared at file scope or in a shared module:

```
state-type-decl  ::= '< ' identifier '>' field-decl* closer
field-decl       ::= identifier ':' type-expr '=' literal
```

A state instance is declared in the parent's markup context:

```
state-instance   ::= '<' identifier 'id=' string-literal '>'
```

The instance is referenced and passed to a component using the `<#id>` reference form:

```
state-ref        ::= '<#' identifier '>'
```

**Normative statements:**

- A state type field write on a state instance passed as a component prop SHALL trigger
  reactive updates in any expression in the parent that reads that field. The compiler SHALL
  generate reactive subscriptions on state instance fields, extending the reactive dependency
  graph (§31) to cover state instance field reads and writes.
- A state instance MAY be mutated from inside the component that received it as a prop.
  Ownership belongs to the declaring scope (the parent). The component writing to a received
  state instance is defined behaviour, not a violation.
- A component that receives a state instance prop MAY use `bind:value=stateRef.fieldName`
  on DOM inputs inside its body to bind directly to fields of the passed instance.
- The compiler SHALL verify at the call site that the prop type of the accepting component
  matches the type of the passed state instance. A type mismatch SHALL be E-TYPE-031.
  State types are nominal (§14.8.1): only an instance of the exact declared type is accepted.
- State instance field access inside a component body (`result.submitted`) SHALL be in scope
  as a plain identifier access, following the same scoping rules as all props declared via
  the `props` block.

**Worked example — valid (form submission with structured result):**

```scrml
// Shared type declaration (may be in a shared module)
< formResult>
    name: string = ""
    email: string = ""
    submitted: boolean = false
</>

// contact-form.scrml
export const ContactForm = <form
    props={ result: formResult }
    onsubmit=submitForm()
>
    <input bind:value=result.name placeholder="Name">
    <input bind:value=result.email placeholder="Email">
    <button type="submit">Send</>

    ${
        function submitForm() {
            event.preventDefault()
            result.submitted = true
        }
    }
</>

// Parent
<program>
    <formResult id="contact">

    <ContactForm result=<#contact>>

    <div if=<#contact>.submitted>
        <p>Thank you, ${<#contact>.name}!</>
    </>
</>
```

The `<div if=<#contact>.submitted>` re-renders automatically when the child writes
`result.submitted = true`. No callback, no event dispatch, no parent handler required.
The parent observes field changes through the reactive dependency system.

**Worked example — valid (filter panel with multi-field communication):**

```scrml
< filterState>
    query: string = ""
    sortBy: string = "date"
    showArchived: boolean = false
</>

export const FilterPanel = <div class="filters" props={ filters: filterState }>
    <input bind:value=filters.query placeholder="Search...">
    <select bind:value=filters.sortBy>
        <option value="date">Date</>
        <option value="name">Name</>
    </>
    <label>
        <input type="checkbox" bind:checked=filters.showArchived>
        Show archived
    </>
</>

<program>
    <filterState id="search">

    <FilterPanel filters=<#search>>

    <p>Results for: ${<#search>.query} (sorted by ${<#search>.sortBy})</>
</>
```

**Worked example — invalid (wrong state type at call site):**

```scrml
< formResult>
    name: string = ""
    submitted: boolean = false
</>

export const ContactForm = <form props={ result: formResult }>
    // ...
</>

< otherState>
    value: number = 0
</>

<program>
    <otherState id="s">
    <ContactForm result=<#s>>
</>
```

Error E-TYPE-031: Prop `result` on `ContactForm` expects type `formResult`; received type
`otherState`. State types are nominal — only a `formResult` instance may be passed here.

---

#### 15.11.3 Choosing Between the Two Mechanisms

The mechanisms are not interchangeable. The compiler enforces the boundary via E-COMPONENT-014.

| Use case | Correct mechanism |
|---|---|
| Boolean toggle (modal visible, sidebar open) | `bind:` on component props |
| Numeric or string sync (selected tab index, input value) | `bind:` on component props |
| Form submission payload (name, email, multiple fields) | State projection |
| Multi-field filter or search state | State projection |
| Any struct-shaped communication payload | State projection |

**Decision rule:** If the shared value is a primitive (`string`, `number`, `boolean`), use
`bind:`. If the shared value is structured (multiple fields, a named shape), define a state
type and use state projection. The compiler enforces this by rejecting `bind` props on
non-primitive types with E-COMPONENT-014, which includes a message directing the developer
to state projection.

---

#### 15.11.4 Escape Hatch: Function-Typed Props

Function-typed props are available when neither `bind:` nor state projection is appropriate.
Intended uses:
- Integration with vanilla JS callbacks that expect a function reference.
- One-shot trigger semantics where there is no state to persist.
- Directional, ephemeral notifications (fire-and-forget).

Function-typed props are declared in the `props` block using a function signature as the
type:

```
fn-prop-decl ::= identifier ':' '(' param-type-list ')' '=>' return-type
               | identifier '?' ':' '(' param-type-list ')' '=>' return-type
```

```scrml
export const NotificationItem = <div
    props={
        message: string,
        onDismiss: () => void,
        onRead?: () => void
    }
>
    <p>${message}</>
    <button onclick=onDismiss()>Dismiss</>
    <button onclick=${ if (onRead) { onRead() } }>Mark read</>
</>
```

At the call site, a function reference is passed as an unquoted attribute value:

```scrml
<NotificationItem message="New message" onDismiss=handleDismiss>
```

**The compiler SHALL emit W-COMPONENT-001** when a function-typed prop is declared in a
component `props` block. This warning is informational; it does not prevent compilation.

W-COMPONENT-001 message:
> Component `NotificationItem` declares function-typed prop `onDismiss`. In scrml,
> child-to-parent communication is typically handled by `bind:` (for simple state) or state
> projection (for structured data). Function props are an escape hatch — prefer the
> state-based mechanisms when possible.

**Normative statements:**

- Function-typed props SHALL be valid in a component `props` block. A function-typed prop
  is declared with a function signature type annotation.
- The compiler SHALL verify at the call site that the value provided for a function-typed
  prop is assignable to the declared function signature. A type mismatch SHALL be E-TYPE-031.
- An optional function-typed prop (declared with `?`) that is not provided at the call site
  SHALL have value `not` inside the component body. The component body SHALL guard against
  `not` before calling it; an unguarded call to a potentially-absent function-typed prop
  SHALL be a compile error (E-TYPE-031: cannot call a value of type `fn | not` without
  an absence check).
- The compiler SHALL emit W-COMPONENT-001 for each function-typed prop in a component
  `props` block. The warning is emitted once per declaration, not once per call site.
- W-COMPONENT-001 is a Warning, not an error. Compilation proceeds normally.

**Worked example — valid (optional callback with null guard):**

```scrml
export const Tabs = <div class="tabs"
    props={ activeTab: string, onTabChange?: (tab: string) => void }
>
    ${
        function selectTab(tab) {
            if (onTabChange) { onTabChange(tab) }
        }
    }
    // ...
</>
```

W-COMPONENT-001 is emitted for `onTabChange` at the component definition site. Compilation
proceeds.

**Worked example — invalid (unguarded optional callback call):**

```scrml
export const Tabs = <div class="tabs"
    props={ activeTab: string, onTabChange?: (tab: string) => void }
>
    ${
        function selectTab(tab) {
            onTabChange(tab)   // Error: onTabChange is (fn | not), not callable without guard
        }
    }
</>
```

Error E-TYPE-031: `onTabChange` has type `((tab: string) => void) | not`. Calling a
potentially-absent function is not valid. Guard with `if (onTabChange) { onTabChange(tab) }`.

---

#### 15.11.5 What Is Explicitly Rejected

The following patterns are not the scrml model for child-to-parent communication. Each
rejection is normative.

**React-style callback props as the primary mechanism.** The TODO stub that preceded this
section described `props={ onSubmit: (data: FormData) => void }` as the expected syntax.
This is rejected as the primary mechanism. Function-typed props are available as an escape
hatch (§15.11.4) but SHALL NOT be the recommended or default pattern. That implication in
the prior stub is superseded by this section.

**`dispatch()` or a custom event system.** No `dispatch()` function or custom event registry
exists in scrml. If data is worth communicating between components, it is worth persisting
in a state instance that both sides can read. Ephemeral events that fire and disappear
conflict with scrml's "state is everything" principle.

**`lift` across component boundaries.** `lift` is valid only inside anonymous `${ }` logic
contexts (§10.4). It SHALL NOT cross component call-site boundaries. Extending `lift` across
components would require redesigning its semantics (array accumulation for list rendering)
in ways that conflict with existing uses. This is a permanent rejection.

---

#### 15.11.6 Interaction Notes

- **§5.4 (`bind:` on DOM elements):** §15.11.1 extends `bind:` from DOM form elements to
  component props. The call-site syntax is identical. The compiler distinguishes DOM element
  bind from component prop bind by the target's classification (HTML element vs. component,
  per §15.1). Error codes E-ATTR-010 through E-ATTR-012 continue to apply to the DOM element
  form. E-COMPONENT-013 and E-COMPONENT-014 apply to the component prop form.

- **§4.2 (State object syntax) and §6 (Reactivity):** State projection relies on the reactive
  system tracking field writes on state instances. The dependency graph (§31) SHALL include
  edges for state instance field reads and writes, extending the existing `@variable` tracking
  to cover state instance fields accessed via a component prop of state type.

- **§15.10 (Typed Props Declaration Block):** Bindable props (`bind propName: type`) and
  function-typed props (`onEvent: () => void`) are declared inside the `props` block. The
  `props-attr` grammar from §15.10 is extended by this section to include `bindable-prop-decl`
  and `fn-prop-decl` forms. All other rules from §15.10 (required vs. optional, defaults,
  E-COMPONENT-010 through E-COMPONENT-012) apply to these extended forms.

- **§12 (Route Inference):** If the function passed as a function-typed prop is a
  server-escalated function, the call inside the component body crosses the server boundary.
  Route Inference SHALL detect this and emit the appropriate infrastructure. The component
  body does not declare server intent; the compiler resolves it from the passed reference.

- **§21 (Module and Import System):** A state type declared in one file and used as a prop
  type in a component in another file MUST be imported explicitly. State type declarations
  are not automatically available across file boundaries.

---

#### 15.11.7 Error and Warning Code Summary

| Code | Trigger | Severity |
|---|---|---|
| E-COMPONENT-013 | `bind:propName` at call site where `propName` is not declared as a `bind` prop in the component's `props` block | Error |
| E-COMPONENT-014 | `bind` prop declared with a non-primitive type (struct or state type) | Error |
| W-COMPONENT-001 | Component declares a function-typed prop (escape hatch advisory) | Warning |

*Note: E-ATTR-010 (§5.4) applies to both DOM element and component prop `bind:` forms when
the right-hand side is not an `@` reactive variable. E-TYPE-031 (§15.10) applies to all prop
forms including bindable props, state projection props, and function-typed props.*

### 15.12 Component Rendering Syntax

Components are instantiated using their PascalCase name as an HTML-like tag: `<MyComponent prop1=value prop2=@reactive />`. The component expander (CE stage) inlines the component body at the call site, binding props to the component's declared parameters.

**Name resolution:** The compiler resolves tag names by checking the first character: an uppercase initial letter indicates a component reference; a lowercase initial letter indicates an HTML element. A component name that collides with a built-in HTML element name is E-NAME-001 (§15.6).

**Prop passing:** Props are passed as attributes on the component tag. Required props (no `?` in the `props` block) must be provided; missing required props are E-COMPONENT-010. Extra undeclared props are E-COMPONENT-011. Prop values are validated against their declared types at the call site (E-TYPE-031).

**Children and slots:** Inline content between the opening and closing tags flows to the component's `${...}` or `${children}` spread (§16). Named slots are filled using `slot="name"` on child elements, which the compiler desugars to snippet prop assignment.

**Self-closing syntax:** `<ComponentName prop=value/>` is valid and equivalent to `<ComponentName prop=value></ComponentName>` with no children content.

### 15.13 Component Reactive Scope

**Added:** 2026-04-10 — Gauntlet Gap 3.

#### 15.13.1 Reactive Closure Model

Component definitions capture reactive bindings from the enclosing scope. When a component instance is used, reactive variables (`@var`) referenced in the component body maintain their reactivity — changes to `@var` in the parent scope re-render the component's dependent elements.

```scrml
@count = 0

const Counter = <div>
    <p>Count: ${@count}</>
    <button onclick=${() => @count = @count + 1}>+</>
</>

<Counter/>
```

When `@count` changes, the `<p>` inside `Counter` re-renders. The reactive subscription is established at instantiation time and is torn down when the component unmounts (§6.7.2).

#### 15.13.2 What Is Reactive Inside a Component

**Reactive:**
- `@var` references from the enclosing scope
- Props declared as `bind propName: type` (§15.11.1)
- `@var` declared inside the component body itself

**Not reactive (captured once at mount):**
- Non-`bind` props passed by value at the call site
- Non-`@` variables from the enclosing scope

#### 15.13.3 Prop Reactivity

A non-`bind` prop is evaluated once when the component instantiates. To pass a reactive value that updates when the parent changes, use `bind:propName=@var`:

```scrml
// Captured once at mount — does not update when @name changes:
<Greeting name=@name/>

// Live reactive link — Greeting re-renders when @name changes:
<Greeting bind:name=@name/>
```

#### 15.13.4 Normative Statements

- A component body SHALL maintain reactive subscriptions to all `@var` references it contains (from enclosing scope or declared inside the component).
- When an `@var` referenced in a component body is written, the component's dependent elements SHALL re-render in the same reactive flush.
- Non-`bind` props SHALL be evaluated at instantiation time and SHALL NOT re-evaluate when the source value changes in the parent scope.
- `bind:` props SHALL maintain a live two-way reactive link between the parent `@var` and the component prop (§15.11.1).
- A component that references `@var` from its enclosing scope SHALL establish a subscriber on `@var` during the component expansion phase, torn down at component unmount.

---

## 16. Component Slots

**Revised:** S39, 2026-04-03 — complete rewrite. The provisional whitespace-rule slot syntax (`< slotname>:(<shape>)/`) is **retired**. It created unresolvable parsing ambiguities (SPEC-ISSUE-007) and conflated slots with state object syntax. The new system treats named slots as snippet-typed props with syntactic call-site desugaring. SPEC-ISSUE-007 and SPEC-ISSUE-008 are closed by this revision.

### 16.1 Overview

Named content regions in a component are declared as `snippet`-typed props in the component's `props` block (§15.10). The `snippet` type kind is defined in §14.9. The component body renders snippet props with `${render propName()}`. At the call site, callers fill named slots using `slot="name"` on child elements — the compiler desugars this to snippet prop assignment.

### 16.2 Declaring Slots

Inside a component's `props` block, a slot is a `snippet`-typed prop:

```scrml
const Card = <div class="card" props={
    title: string,
    header: snippet,
    body?: snippet,
    actions?: snippet
}>
    <div class="card__header">${render header()}</>
    <div class="card__body">${render body() ?? <p>No content provided./}</>
    <div class="card__actions" if=actions>${render actions()}</>
</>
```

- `header` is required. Omitting it at the call site is E-COMPONENT-010.
- `body` and `actions` are optional (`?:`). Inside the component body their type is `snippet | not`. The `??` fallback and `if=` guard handle the absence case.

### 16.3 Rendering Snippets

Inside a component body, snippet props are invoked with `render`:

```scrml
${render header()}                     // zero-parameter
${render body() ?? <p>Default/}        // optional with fallback
${render tabPanel(tab)}                // parametric, passes argument
```

`render` emits markup at the call point. It is not an expression that produces an assignable value. See §14.9 for type rules.

### 16.4 Unnamed Children Spread

`${...}` inside a component body is the unnamed children spread. Content not assigned to a
named slot flows here. `${children}` is a legacy alias with identical semantics; both forms
are accepted.

TAB emits `{ kind: "bare-expr", expr: "..." }` for `${...}` and
`{ kind: "bare-expr", expr: "children" }` for `${children}`. CE detects both.

- A component body MAY contain zero or one spread (either form). More than one is
  E-COMPONENT-020.
- If no spread exists and the caller provides unslotted children, this is E-COMPONENT-021.
- A component body that contains both `${...}` and `${children}` SHALL be E-COMPONENT-020.

### 16.5 Call-Site — Zero-Parameter Slots

For zero-parameter snippets, callers use `slot="name"` on direct child elements:

```scrml
<Card title="Order Summary">
    <h3 slot="header">Your Order</>
    <ul slot="body">
        <li>Item one</>
        <li>Item two</>
    </>
    <button slot="actions">Confirm</>
</>
```

The compiler desugars each `slot="name"` child to a snippet prop assignment. Multiple children with the same `slot=` value are combined into one snippet in source order.

- `slot=` is valid only on direct children of a component call (E-COMPONENT-022).
- `slot="name"` targeting a non-snippet prop is E-COMPONENT-023.
- `slot=` is stripped from emitted output — it is compile-time only.
- `slot=` on an element inside a `lift` block SHALL be E-COMPONENT-022. The compiler SHALL
  use the specialized `lift`-context error message (see §16.9) when the `slot=` element is
  found inside a `lift` block specifically.

### 16.6 Call-Site — Parametric Slots (Slot Scope)

When a snippet prop accepts a parameter (`snippet(param: Type)`), the caller MUST provide a lambda. `slot=` desugaring does not apply to parametric snippets.

```scrml
const TabStrip = <div class="tabs" props={
    tabs: Tab[],
    tabPanel: snippet(tab: Tab)
}>
    <nav>${ for (t of tabs) { lift <button onclick=setActive(t)>${t.label}/ } }</>
    <div class="tab-content">${render tabPanel(activeTab)}</>
</>

<TabStrip
    tabs=@myTabs
    tabPanel={ (tab) => <article><h2>${tab.label}/<p>${tab.body}// }
/>
```

- Using `slot=` on a parametric snippet is E-COMPONENT-024.
- The lambda parameter type is inferred from the snippet's declared type.

### 16.7 Error Codes

| Code | Trigger | Raised By | Severity |
|---|---|---|---|
| E-COMPONENT-020 | More than one `${...}` or `${children}` spread in a component body | CE | Error |
| E-COMPONENT-021 | Caller provides unslotted children but component has no spread | CE | Error |
| E-COMPONENT-022 | `slot=` on element not a direct child of a component call, OR inside a `lift` block | CE | Error |
| E-COMPONENT-023 | `slot="name"` or `render name` targets a prop not declared as `snippet`-typed | CE | Error |
| E-COMPONENT-024 | `slot="name"` used to fill a parametric snippet prop | CE | Error |
| E-TYPE-070 | `snippet`-typed value used in non-render, non-null-check position | TS | Error |
| E-TYPE-071 | `render` invocation outside a component body context | CE (primary), TS (fallback) | Error |
| E-TYPE-072 | `render` arity mismatch — structural (CE) or type-level (TS) | CE / TS | Error |
| E-TYPE-073 | Optional snippet invoked without null guard | TS | Error |

Note: E-COMPONENT-010 (missing required prop) and E-COMPONENT-011 (extra undeclared prop) from §15.10 apply to snippet props exactly as they apply to value props.

### 16.8 `render` Validation: CE and TS Responsibilities

**Added:** 2026-04-04 — resolves snippet/slot OQ-1.

The `render` keyword is validated in two distinct passes. CE validates structural correctness
at expansion time. TS validates type correctness after CE expansion. This is consistent with
how `lift` (CE syntax, TS type coercion) and `cleanup()` (CE context, TS type) are divided.

#### 16.8.1 CE Structural Validation

The Component Expander SHALL validate the following properties of every `render` invocation
found in a component body during expansion:

1. **Known snippet prop.** The identifier following `render` SHALL be a prop name declared
   as `snippet`-typed. If not in the `snippetProps` map, emit E-COMPONENT-023.

2. **Inside component body.** A `render` invocation outside any component body context SHALL
   be E-TYPE-071.

3. **Arity structural match.**
   - `render propName()` — zero-argument form. Valid only on plain `snippet` (no parameter).
   - `render propName(expr)` — one-argument form. Valid only on `snippet(param: T)`.
   - Mismatch in either direction is E-TYPE-072 at CE phase.

CE SHALL emit a transient `render-expansion` node for every valid invocation, carrying
`propName`, `argExpr`, and `span`. TS consumes it; codegen sees only `inlinedChildren`.

**Normative statements:**

- CE SHALL reject `render propName()` where `propName` is not in `snippetProps` (E-COMPONENT-023).
- CE SHALL reject `render` outside a component body context (E-TYPE-071).
- CE SHALL reject zero-argument `render` on a parametric snippet (E-TYPE-072).
- CE SHALL reject one-argument `render` on a zero-parameter snippet (E-TYPE-072).
- The `render-expansion` node SHALL NOT appear in codegen input.

#### 16.8.2 TS Type Validation

TS SHALL process every `render-expansion` node emitted by CE:

1. **Arg type match (E-TYPE-072).** For parametric snippets, `argExpr` type SHALL be
   assignable to `snippetParamType`. If not, emit E-TYPE-072.

2. **Optional absence guard (E-TYPE-073).** For optional snippet props (`snippet?`), every
   `render` invocation SHALL appear inside an absence guard. Sufficient patterns:
   - `${render propName() ?? fallback}`
   - Enclosing `if=propName` attribute (since `not` is falsy per §42.4)
   - Enclosing `${ if (propName) { ... } }` logic block

3. **Fallback for render outside component body.** If a bare `render` token reaches TS
   without conversion to `render-expansion`, TS SHALL emit E-TYPE-071.

TS SHALL strip all `render-expansion` nodes before codegen.

**Worked example — valid zero-parameter snippet:**

```scrml
const Card = <div class="card" props={
    title: string,
    header: snippet,
    body?: snippet
}>
    <div class="card__header">${render header()}</>
    <div class="card__body">${render body() ?? <p>No content./}</>
</>
```

**Worked example — invalid optional without null guard (E-TYPE-073):**

```scrml
const Panel = <div props={ actions?: snippet }>
    <footer>${render actions()}</>
</>
```

```
Error E-TYPE-073: `actions` is an optional snippet prop (may be `not`). Call `render actions()`
inside an absence guard: `${render actions() ?? fallback}` or `<footer if=actions>`.
```

### 16.9 `slot=` Inside `lift` Is a Phase Violation

**Added:** 2026-04-04 — resolves snippet/slot OQ-3.

`slot=` SHALL NOT appear on any element inside a `lift` block, regardless of nesting depth.
`slot=` is a compile-time structural directive resolved by CE. `lift` is a runtime
accumulation mechanism. CE cannot statically determine which slot a lifted element belongs to.

**Normative statements:**

- An element bearing `slot=` inside a `lift` block SHALL be E-COMPONENT-022.
- This applies regardless of nesting depth within the `lift` block.
- The error message SHALL direct the developer to the correct alternative (parametric snippet).

**Error message (normative):**

```
Error E-COMPONENT-022: `slot=` cannot appear inside a `lift` block. `slot=` is a
compile-time directive; `lift` runs at runtime. The compiler cannot statically assign
lifted elements to named slots.

To provide per-item slot content, declare a parametric snippet prop:
  body: snippet(item: ItemType)
and pass a lambda at the call site:
  body={ (item) => <li>${item}/ }
```

**Correct idiom — slot content above the `lift` boundary:**

```scrml
<Card>
    <div slot="featured">
        ${ for (item of items) { if (item.important) { lift <li>${item}/ } } }
    </>
    <div slot="body">
        ${ for (item of items) { if (!item.important) { lift <li>${item}/ } } }
    </>
</>
```

Here `slot=` is on `<div>` elements that are direct children of `<Card>`. The `lift` blocks
are inside those divs. CE resolves the slot assignment at compile time. This is valid.

### 16.10 `${...}` Spread: TAB Output Shape and CE Detection

**Added:** 2026-04-04 — resolves snippet/slot OQ-4.

#### 16.10.1 TAB Output Shape

TAB SHALL emit `{ kind: "bare-expr", expr: "..." }` for `${ ... }` when `...` (three ASCII
period characters) is the sole content of the logic block. No new AST node kind is introduced.

#### 16.10.2 CE Detection

CE SHALL detect the unnamed children spread by checking:

```
isSpread = node.kind === "bare-expr" && node.expr.trim() === "..."
isChildrenLegacy = node.kind === "bare-expr" && node.expr.trim() === "children"
```

Both forms are semantically identical. The compiler SHALL NOT warn on either form. Both forms
SHALL be accepted in all versions implementing this spec.

**Normative statements:**

- TAB SHALL emit `{ kind: "bare-expr", expr: "..." }` for `${...}`.
- TAB SHALL NOT introduce a new node kind for the unnamed children spread.
- CE SHALL treat both `expr.trim() === "..."` and `expr.trim() === "children"` as the spread.
- More than one spread node (any combination of forms) is E-COMPONENT-020.

---

## 17. Control Flow

### 17.1 `if=` Attribute

The `if=` attribute is a structural boolean conditional.

```scrml
<element if=expr>content</element>
```

- When `expr` evaluates to false, the element is NOT rendered. It does not exist in the DOM.
- `if=` is sugar over `${ if(expr) { lift <element>...</element> } }`.
- `expr` SHALL be an unquoted expression (per Section 5 quoting rules).
- `if=expr` MAY appear on any HTML element or component. It SHALL NOT appear on a state object opener.

**Worked example:**
```scrml
<div class="error-banner" if=@errorMessage>${@errorMessage}</>
```

Equivalent to:
```scrml
${ if (@errorMessage) { lift <div class="error-banner">${@errorMessage}/ } }
```

### 17.1.1 `else` and `else-if=` Attributes

The `else` and `else-if=` attributes extend `if=` chains. They are bare attributes placed
directly on sibling elements immediately following an `if=` or `else-if=` element. They do
not introduce new elements — they annotate elements with conditional rendering membership.

#### Syntax

```
if-chain         ::= if-element else-if-element* else-element?
if-element       ::= element-with-attribute("if=", expr)
else-if-element  ::= element-with-attribute("else-if=", expr)
else-element     ::= element-with-attribute("else")
```

The `else` attribute is bare (no `=` and no value). The `else-if=` attribute takes an
unquoted expression following the same quoting rules as `if=` (§5).

An `if=` chain is the maximal contiguous sequence of sibling elements beginning with an
element carrying `if=` and followed immediately by zero or more elements carrying `else-if=`
and optionally one final element carrying `else`. The sequence ends at the first element that
carries none of `if=`, `else-if=`, or `else`.

"Immediately following" means no element, text node, or other syntactic construct appears
between the chain members at the same parent level. Intervening whitespace-only text nodes
are not considered to break a chain.

#### Normative Rules

- An element carrying `else` SHALL be immediately preceded at the same parent level by an
  element carrying `if=` or `else-if=`. The compiler SHALL reject any `else` attribute
  that does not satisfy this condition (E-CTRL-001).

- An element carrying `else-if=` SHALL be immediately preceded at the same parent level by
  an element carrying `if=` or `else-if=`. The compiler SHALL reject any `else-if=`
  attribute that does not satisfy this condition (E-CTRL-002).

- An `else` element SHALL be the terminal element of its chain. No element carrying `if=`,
  `else-if=`, or `else` SHALL appear immediately after an `else` element at the same parent
  level as part of the same chain. The compiler SHALL reject any element that would extend a
  chain past an `else` (E-CTRL-003).

- `else` and `else-if=` SHALL NOT appear on a state object opener. The compiler SHALL reject
  any such usage (E-CTRL-004).

- `else` and `else-if=` MAY appear on any HTML element or component that could independently
  carry `if=`.

- `if=`, `else-if=`, and `else` MAY coexist on the same element with `show=`. When `show=`
  is present alongside `if=` or `else-if=`, the element is first conditionally included in
  the DOM by the if-chain rule and then additionally subject to the `show=` visibility rule
  (§17.2). The two attributes compose without conflict.

- `else` and `else-if=` SHALL NOT appear on the same element as `if=`. A single element
  cannot simultaneously open and continue a chain. The compiler SHALL reject such usage
  (E-CTRL-005).

#### Desugaring

An if-chain desugars to a single `${ if / else if / else }` block in the containing markup
context. The chain members desugar in declaration order.

**Two-branch (if / else):**

```scrml
<div if=@loggedIn>Welcome</>
<div else>Please log in</>
```

Desugars to:

```scrml
${
  if (@loggedIn) {
    lift <div>Welcome</>
  } else {
    lift <div>Please log in</>
  }
}
```

**Multi-branch (if / else-if / else):**

```scrml
<section if=@step.is(Loading)>
  <Spinner />
</>
<section else-if=@step.is(Error)>
  <ErrorMessage msg=@step.message />
</>
<section else>
  <p>Done</>
</>
```

Desugars to:

```scrml
${
  if (@step.is(Loading)) {
    lift <section><Spinner /><</>
  } else if (@step.is(Error)) {
    lift <section><ErrorMessage msg=@step.message /><</>
  } else {
    lift <section><p>Done//
  }
}
```

The desugaring is mechanical. Each element in the chain, together with all its attributes
(other than `if=`, `else-if=`, and `else` themselves), its children, and its closing mark,
becomes the body of the corresponding `if`, `else if`, or `else` branch. The structural
attributes are consumed during desugaring and do not appear on the lifted element.

The chain desugars to a single AST node (`IfChainExpr`) that the compiler produces during
the TAB pass. `IfChainExpr` is not further decomposed until the RI pass generates the
equivalent `if`/`else if`/`else` logic. The TS pass performs type-checking over
`IfChainExpr` directly, treating each condition expression as `boolean`-coercible.

#### Error Code Summary

| Code | Condition | Severity |
|---|---|---|
| E-CTRL-001 | `else` attribute appears without a preceding `if=` or `else-if=` sibling | Error |
| E-CTRL-002 | `else-if=` attribute appears without a preceding `if=` or `else-if=` sibling | Error |
| E-CTRL-003 | An element appears to extend a chain after a terminal `else` element | Error |
| E-CTRL-004 | `else` or `else-if=` appears on a state object opener | Error |
| E-CTRL-005 | `else` or `else-if=` appears on the same element as `if=` | Error |

#### Error Messages

**E-CTRL-001:**
> `else` on line N has no preceding `if=` element at the same level. An `else` block must
> immediately follow an element with `if=` or `else-if=`.

**E-CTRL-002:**
> `else-if=` on line N has no preceding `if=` element at the same level. An `else-if=` block
> must immediately follow an element with `if=` or `else-if=`.

**E-CTRL-003:**
> The element on line N tries to extend a chain that already ended with `else` on line M.
> Once `else` appears, no further `else-if=` or `else` is allowed in the same chain.

**E-CTRL-004:**
> `else` (or `else-if=`) cannot appear on a state object opener. State object openers are
> not conditional render targets.

**E-CTRL-005:**
> `else` (or `else-if=`) and `if=` cannot appear on the same element. An element either
> opens a new chain (`if=`) or continues one (`else-if=` / `else`), not both.

#### Worked Examples

**Example 1 — Simple if/else toggle (valid):**

```scrml
<program>
  < session { loggedIn: bool }

  <div class="auth-area">
    <span if=@loggedIn>Welcome back</>
    <span else>Please log in</>
  </>
</>
```

The `<span else>` immediately follows `<span if=@loggedIn>` at the same parent level. This
is a valid two-branch chain. Only one span exists in the DOM at any time.

**Example 2 — Invalid: `else` with no preceding `if=` (E-CTRL-001):**

```scrml
<div class="container">
  <p>Static content</>
  <span else>Fallback</>
</>
```

Expected compiler output:
```
error E-CTRL-001: `else` on line 3 has no preceding `if=` element at the same level.
An `else` block must immediately follow an element with `if=` or `else-if=`.
```

**Example 3 — Multi-step wizard with else-if chain (valid):**

```scrml
<program>
  < wizard { step: int }

  <div class="wizard">
    <StepOne   if=@step.eq(1) />
    <StepTwo   else-if=@step.eq(2) />
    <StepThree else-if=@step.eq(3) />
    <div else>
      <p>All steps complete</>
    </>
  </>
</>
```

The chain opens with `if=`, continues with two `else-if=` arms, and terminates with `else`.
Components and HTML elements may be mixed freely in a chain.

**Example 4 — Error/loading/success pattern (valid):**

```scrml
<program>
  < fetch { status: Status }

  <div class="result-area">
    <div class="error"   if=@status.is(Error)>${@status.message}</>
    <div class="spinner" else-if=@status.is(Loading)></>
    <div class="content" else>${@status.data}</>
  </>
</>
```

Note: this pattern does NOT trigger enum exhaustiveness checking (§18.8). Exhaustiveness
over enums is guaranteed only by `match` expressions (§18). An `if=`/`else-if=`/`else`
chain is a structural conditional, not a pattern match.

**Example 5 — Invalid: extends chain past `else` (E-CTRL-003):**

```scrml
<div class="nav">
  <span if=@isAdmin>Admin panel</>
  <span else>User view</>
  <span else>Guest view</>
</>
```

Expected compiler output:
```
error E-CTRL-003: The element on line 4 tries to extend a chain that already ended
with `else` on line 3.
```

#### Interaction Notes

**Interaction with `show=`:** These compose. `<div if=@hasContent show=@visible>` means
"only in DOM when `@hasContent` is true; when present, visible only when `@visible` is true."
An `else` or `else-if=` element MAY also carry `show=`.

**Interaction with `match` (§18):** if-chains are structural conditionals without
exhaustiveness. When exhaustiveness over enum values is needed, use `match` (§18.9).

**Interaction with `lin` variables (§35):** A `lin` variable in an `if=` or `else-if=`
condition counts as a consumption. The compiler SHALL enforce that a `lin` variable in a
condition is not referenced in any other branch (standard linear branching rule, §34.4).

**Interaction with iteration (§17.4):** An `if=` chain MAY appear inside a `for` loop body.

---

### 17.2 `show=` Attribute

The `show=` attribute is a visibility conditional.

```scrml
<element show=expr>content</element>
```

- The element EXISTS in the DOM regardless of `expr`.
- When `expr` evaluates to false, the element is hidden. The compiler generates a CSS `display: none` toggle.
- When `expr` evaluates to true, the element is visible.
- `show=` is distinct from `if=`: `show=` hides, `if=` removes.

### 17.3 Lifecycle of Bare Expressions

A bare expression in a logic context (not wrapped in a function declaration) executes at initial render.

```scrml
${ loadItems() }
```

- This calls `loadItems()` once, at initial mount.
- It does NOT re-execute on reactive re-renders unless a reactive dependency (`@variable`) is read inside `loadItems()` and that dependency changes.
- The compiler tracks reactive dependencies automatically via the dependency graph (Section 30). Explicit re-execution declarations are not required for reactive functions.

**SPEC ISSUE:** Whether bare expressions re-execute on every reactive re-render or only on initial mount is tracked in SPEC-ISSUE-009. The current spec position is: bare expression = once on mount. Re-execution on dependency change is inferred from the dependency graph.

### 17.4 Iteration

Iteration is performed using `${ }` + `lift`. There is no dedicated `for=` attribute.

```scrml
<ul>${
    for (item of items) {
        lift <li>${item.name}</>;
    }
</>
```

The slight verbosity of this form is accepted for clarity. Keeping iteration out of element attributes keeps element tags clean.

### 17.4a `else` Block on `for/lift` — Empty State Rendering

A `for` loop with `lift` MAY include an `else` block. The `else` block executes when the collection is empty (length 0 or the collection is `not`). This is the canonical pattern for empty-state rendering.

**Syntax:** `for (let x of collection) { lift ... } else { lift ... }`

**Normative statements:**

- If `collection.length === 0` (or `collection is not`), the `for` body does not execute and the `else` body executes exactly once.
- If `collection.length > 0`, the `for` body executes for each element and the `else` body does not execute.
- The `else` body is valid only on a `for/lift` loop. A `for` loop without `lift` SHALL NOT accept an `else` block (E-CTRL-010).

**Worked example:**

```scrml
${ for (let item of @items) {
    lift <li>${item.name}</>;
} else {
    lift <li class="empty">No items yet.</>;
} }
```

### 17.4b `key` in Loop Header — Keyed Reconciliation

A `for` loop with `lift` MAY declare a key expression in the loop header. The key identifies each element for efficient DOM diffing during list updates.

**Syntax:** `for (let x of collection key x.id) { lift ... }`

**Normative statements:**

- When a `key` expression is declared, the compiler SHALL generate keyed reconciliation: elements are matched by key identity across updates, preserving DOM state (focus, animation, scroll position) for elements whose key persists.
- When no `key` is declared, the compiler MAY emit W-KEY-001 warning for collections that contain objects.
- The `key` expression is evaluated once per iteration and must produce a value that is unique within the collection.

**Worked example:**

```scrml
${ for (let card of @cards key card.id) {
    lift <div class="card">${card.title}</>;
} else {
    lift <p>No cards yet.</>;
} }
```

### 17.5 Component Overloading

Component overloading is the primary dispatch mechanism for structural variation based on type or value. Multiple definitions of the same component name with different prop type constraints are valid.

- The compiler SHALL dispatch to the correct definition based on the caller's prop types.
- For enum-typed props, the compiler SHALL enforce exhaustiveness: all enum variants must have a corresponding component overload, or a default overload must exist.

**SPEC ISSUE:** The exact syntax for component overloading is tracked in SPEC-ISSUE-010. This feature is confirmed but not yet fully specified.

### 17.6 If-as-Expression

**Date added:** 2026-04-08

An `if` statement inside a logic context MAY be used as a value-producing expression when bound to a variable or used directly in an expression context. This is called an **if-as-expression**.

If-as-expression does NOT replace the ternary operator `(cond) ? a : b`. Both forms are valid. Ternary is appropriate for simple inline two-branch choices. If-as-expression is appropriate when arm bodies require statements, intermediate computation, or multiple execution steps before producing a value.

#### 17.6.1 Syntax

```
if-as-expr    ::= 'if' '(' condition ')' arm-body
                  ('else' 'if' '(' condition ')' arm-body)*
                  ('else' arm-body)?

arm-body      ::= '{' statement* lift-stmt statement* '}'

lift-stmt     ::= 'lift' expression ';'
               |  'lift' expression        -- semicolon optional per §3 ASI rules

if-binding    ::= ('const' | 'let') identifier '=' if-as-expr
```

The grammar above applies when an `if` statement appears in expression position. An `if` is in expression position when:

1. It is the RHS of a `const` or `let` declaration: `const a = if (cond) { ... }`.
2. It is used directly as an expression operand: `const dbl = if (cond) { lift x } * 2`. (This form is valid only when the if-as-expression is fully self-contained; see §17.6.5 for operand chaining via `~`.)

An `if` statement NOT in expression position (i.e., a bare if-statement used for side effects) is NOT an if-as-expression. Standard if-statement semantics apply. The compiler determines expression position from syntactic context.

#### 17.6.2 Semantics

When an `if`-as-expression executes:

1. The condition is evaluated.
2. The matching arm body executes.
3. The arm body SHOULD contain a `lift` statement designating the result value.
4. If no arm body executes (condition false, no `else` arm), the expression result is `not`.
5. The result value (from the `lift` or `not`) is bound to the LHS variable or used as the expression value.

Execution within an arm body is unrestricted: the arm body MAY contain variable declarations, function calls, server calls, conditional logic, loops, and any other valid logic-context content. Only one `lift` statement designates the result; other statements are side effects or intermediate computation.

**Normative statements:**

- An if-as-expression arm body SHALL produce its result value via a `lift` statement.
- The result of an if-as-expression when no arm body executes SHALL be `not`.
- The type of an if-as-expression with no `else` arm SHALL be `T | not`, where `T` is the type of the lifted value in the `if` arm (and any `else if` arms).
- The type of an if-as-expression with a complete if/else chain (all branches covered) SHALL be the union of all lifted value types across all arms. If all arms lift the same type `T`, the result type is `T` (not `T | not`).
- The compiler SHALL NOT require all arms to lift the same concrete type. If arms lift different types, the result type is their union.
- An arm body that does not contain a `lift` statement MAY exist; its contribution to the result type is `not`. The compiler SHALL emit W-LIFT-001 (warning, not error) for an arm body that executes no `lift` on any reachable path, unless the arm is intentionally side-effect-only and the full if-as-expression type already includes `not`.

**W-LIFT-001:**
> W-LIFT-001: Arm body in if-as-expression has no `lift` on any reachable path. This arm contributes `not` to the expression type. If this is intentional (side-effect-only arm), annotate the binding with `: T | not` to suppress this warning.

#### 17.6.3 Binding Site

The **binding site** is the variable declaration that receives the if-as-expression value:

```scrml
const a = if (cond) {
    // do work
    lift 3
}
```

Here `const a` is the binding site. `a` has type `number | not` (no `else` arm, so the false path yields `not`).

```scrml
const b = if (x > 3) {
    lift "high"
} else if (x > 0) {
    lift "mid"
} else {
    lift "low"
}
```

Here `const b` is the binding site. All branches covered, all lift values are `string`, so `b` has type `string`.

**Normative statements:**

- A `const` binding site SHALL be inferred as the type of the if-as-expression result.
- A `let` binding site SHALL be inferred as the type of the if-as-expression result.
- If the developer annotates the binding site with a type that is incompatible with the inferred result type, the compiler SHALL emit E-TYPE-031.

#### 17.6.4 Else Arm and the `not` Type

When an if-as-expression has no `else` arm, the false-path result is `not`. The `not` type is the scrml absence primitive (§7.5 grammar, §42).

```scrml
const a = if (cond) { lift 3 }
// type of a: number | not
// a is 3 when cond is true, not when cond is false
```

This is intentional. If-as-expression without `else` is valid and useful when the developer wants to express "this value may not be present." It is NOT required to provide an `else` arm to make the expression valid.

**Normative statements:**

- An if-as-expression without an `else` arm SHALL have an implicit false-path type of `not`.
- The compiler SHALL NOT emit an error or warning for a missing `else` arm on an if-as-expression. Missing `else` is valid; the consequence is a `T | not` result type.
- If the binding site has a type annotation of `T` (not `T | not`) and the if-as-expression can produce `not`, the compiler SHALL emit E-TYPE-031.

#### 17.6.5 The `~` Accumulator and Chaining

`~` in an if-as-expression context holds the result of the most recently evaluated if-as-expression. This follows the general `~` initialization rule (§32.2): a `lift` statement initializes `~` to the lifted value.

When an if-as-expression appears as an unbound expression statement (not assigned to a variable), its `lift` result initializes `~`:

```scrml
if (cond) lift a; else lift b;
const dbl = ~ * 2;
```

Here:
- `if (cond) lift a; else lift b;` is an if-as-expression used as an unbound expression statement.
- The executed arm's `lift` initializes `~` to `a` or `b`.
- `const dbl = ~ * 2` consumes `~`.

This is the canonical pipeline pattern for if-as-expression. The `~` rules (§32) apply fully:
- `~` is initialized by the `lift` in the executed arm.
- `~` must be consumed exactly once (lin rule).
- If the if-as-expression has no `else` arm and the condition is false, no `lift` executes and `~` is NOT initialized. Referencing `~` after an if-as-expression with no `else` is potentially E-TILDE-001 (see §17.6.6 for the static analysis rule).

**Normative statements:**

- An if-as-expression used as an unbound expression statement SHALL initialize `~` to the lifted value from the executed arm, following the same rules as any other `lift` statement (§32.2).
- `~` initialized by an if-as-expression arm SHALL be subject to all `lin` rules (§32.3).
- An if-as-expression with an `else` arm guarantees `~` is initialized on all paths; the compiler MAY treat the post-expression `~` as unconditionally initialized.
- An if-as-expression WITHOUT an `else` arm does NOT guarantee `~` initialization on all paths. The compiler SHALL treat the post-expression `~` as conditionally initialized. Any reference to `~` after such an expression without a proof of the true-path is E-TILDE-001.

#### 17.6.6 Static Analysis of `~` After a Partial If-as-Expression

When a developer writes:

```scrml
if (cond) lift a;       // no else
const dbl = ~ * 2;     // reference to ~
```

The compiler detects that the if-as-expression has no `else` arm. On the false path, `~` is not initialized. The reference to `~` at `const dbl = ~ * 2` is therefore potentially uninitialized.

**The compiler SHALL emit E-TILDE-001 for `~` referenced after a partial if-as-expression (no `else` arm) unless the developer provides a complete if/else chain.**

The safe pattern is always to include an `else` arm when the `~` value is needed:

```scrml
if (cond) lift a; else lift defaultValue;
const dbl = ~ * 2;     // valid: both arms lift, ~ is always initialized
```

Or capture explicitly and avoid `~`:

```scrml
const a = if (cond) { lift a }   // a is number | not
const dbl = (a ?? 0) * 2         // ?? fallback handles not
```

#### 17.6.7 Interaction with Ternary

Both forms coexist. Neither replaces the other.

```scrml
// Ternary — valid, idiomatic for simple inline choices
const a = (cond) ? 1 : 2
```

Ternary as an unbound expression statement:
```scrml
(cond) ? 1 : 2;          // unbound; initializes ~ to 1 or 2
const dbl = ~ * 2;       // consumes ~
```

**Normative statements:**

- The ternary operator `(cond) ? a : b` used as an unbound expression statement SHALL initialize `~` to the evaluated result, following the standard §32.2 unassigned-expression rule.
- Ternary and if-as-expression MAY be freely mixed in the same logic context.
- The compiler SHALL NOT prefer one form over the other. Both are valid.

#### 17.6.8 Codegen

The compiler SHALL emit the if-as-expression as a JavaScript IIFE (immediately-invoked function expression) wrapping the arm bodies, or as equivalent inline branching code, at its discretion, provided the emitted code preserves the semantics of §17.6.2.

The preferred codegen form is a JavaScript conditional expression or variable-assign-in-branches pattern:

```javascript
// scrml source:
// const b = if (x > 3) { lift "high" } else if (x > 0) { lift "mid" } else { lift "low" }

let _scrml_iae_1;
if (x > 3) {
    _scrml_iae_1 = "high";
} else if (x > 0) {
    _scrml_iae_1 = "mid";
} else {
    _scrml_iae_1 = "low";
}
const b = _scrml_iae_1;
```

For simple single-lift arms, the compiler MAY optimize to a JavaScript ternary if the semantics are preserved and no side-effect statements exist in the arm body:

```javascript
// Optimized form (valid when arms contain only lift):
const b = x > 3 ? "high" : x > 0 ? "mid" : "low";
```

**Normative statements:**

- The compiler SHALL emit code that preserves the sequential execution semantics of arm bodies.
- The compiler MAY use an IIFE, variable-assign-in-branches, or ternary optimization depending on arm body complexity.
- The ternary optimization SHALL only apply when arm bodies are side-effect-free (contain only the `lift` statement).
- The result variable holding the lifted value SHALL have a stable, unique name in the generated JS.

#### 17.6.9 Worked Examples

**Example 1 — Basic value-lift with else (valid):**

```scrml
${
    const status = if (@count > 10) {
        lift "high"
    } else if (@count > 0) {
        lift "medium"
    } else {
        lift "low"
    }
    // status: string (all arms covered, all lift string)
}
```

**Example 2 — No else arm; result is `T | not` (valid):**

```scrml
${
    const a = if (cond) { lift 3 }
    // type of a: number | not
}
```

**Example 3 — Unbound if-as-expression with `~` chaining (valid, complete if/else):**

```scrml
${
    if (cond) lift a; else lift b;
    const dbl = ~ * 2;
}
```

**Example 4 — Arm body with intermediate computation (valid):**

```scrml
${
    const label = if (@user.role is .Admin) {
        const prefix = getOrgName(@user.orgId)
        lift prefix + " Admin"
    } else {
        lift @user.displayName
    }
}
```

**Example 5 — Invalid: `~` referenced after no-else if-as-expression (E-TILDE-001):**

```scrml
${
    if (cond) lift a;
    const dbl = ~ * 2;    // Error E-TILDE-001
}
```

**Example 6 — Invalid: multiple lifts on same path in value-lift arm (E-LIFT-002):**

```scrml
${
    const x = if (cond) {
        lift 1;
        lift 2;    // Error E-LIFT-002
    } else {
        lift 3;
    }
}
```

**Example 7 — if-as-expression inside a markup context (valid):**

```scrml
<div>${
    const label = if (@count > 0) {
        lift "Items: " + @count
    } else {
        lift "No items"
    }
    lift <p class="label">${label}</>;
</>
```

The if-as-expression produces `label`. The subsequent `lift <p>` is a separate accumulation lift targeting `<div>`. The two `lift` calls are in different modes: the if-as-expression `lift` is value-lift mode (produces `label`); the `lift <p>` is accumulation mode (appends to `<div>`). The compiler distinguishes by context (§10.7).

---

## 18. Pattern Matching and Enums

> **Alias note:** Throughout §18, both canonical and alias syntax forms are valid. The
> canonical forms are `.VariantName` (enum variant), `=>` (match arm separator), and `else`
> (default arm). The aliases `::VariantName`, `->`, and `_` are equally valid. Examples in
> this section may use either form. The compiler preference setting controls which form the
> formatter normalizes to.

**Revised:** 2026-03-27 — complete rewrite resolving all 11 blocking issues from
docs/reviews/language/spec-review-§18-TS-C-gate-2026-03-27.md. E-EXHAUST-001 retired;
E-TYPE-020 is the single canonical error code for non-exhaustive match. E-TYPE-006
retained for union-type match exhaustiveness (distinct case). See §18-007 below.

---

### 18.1 Overview and AST Status

A `match` expression is a dedicated AST node (`MatchExpr`). It is NOT desugared to
`if`/`else` at any compiler stage. `MatchExpr` nodes survive through the TAB, BPP, RI, and
TS stages as first-class nodes. The TS-C pass (Stage 6, exhaustiveness checking) operates
on `MatchExpr` nodes directly.

**Relationship to §17 (`if`/`else`):** `if`/`else` chains over enum-typed values do NOT
receive exhaustiveness checking. The exhaustiveness guarantee is exclusively provided by
`match`. A developer who dispatches over an enum with `if`/`else` receives no missing-case
error from the compiler. `match` is the only exhaustiveness-enforced branch form.

**Normative statements:**

- The compiler SHALL represent `match` as a `MatchExpr` AST node. The compiler SHALL NOT
  desugar `match` to `if`/`else` at TAB time, BPP time, or any stage before code generation.
- `if`/`else` chains SHALL NOT receive enum exhaustiveness checking. E-TYPE-020 SHALL NOT
  fire on an `if`/`else` chain, regardless of the type of the tested expression.
- PIPELINE.md Stage 6 (TS) SHALL include a `MatchExpr` handler. The TS-C sub-pass operates
  on `MatchExpr` nodes.

---

### 18.2 Syntax

**Formal grammar:**

```
match-expr      ::= 'match' expression '{' match-arm+ '}'
match-arm       ::= arm-pattern ('=>' | '->') arm-body
arm-pattern     ::= variant-pattern | wildcard-arm | is-pattern
variant-pattern ::= ('.' | '::') VariantName ('(' binding-list ')')?
                  | TypeName ('.' | '::') VariantName ('(' binding-list ')')?
binding-list    ::= binding (',' binding)*
binding         ::= Identifier
                  | FieldName ':' Identifier
wildcard-arm    ::= 'else' | '_'
arm-body        ::= expression | block-body
block-body      ::= '{' statement* expression? '}'
```

Note: `variant-pattern` accepts both `.` (canonical) and `::` (alias) notation (S37-AM-001).
`wildcard-arm` accepts both `else` (canonical) and `_` (alias) (S37-AM-003). Match arm
separators accept both `=>` (canonical) and `->` (alias). `is-pattern` defined in §18.17.
The compiler preference setting controls which forms the formatter normalizes to.

**Normative statements:**

- A match arm separator SHALL be `=>` (canonical) or `->` (alias). Both forms are accepted.
  The canonical form is `=>`. The compiler preference setting controls which form the formatter
  normalizes to.

**Worked example — unit variants:**
```scrml
match direction {
    .North => "up"
    .South => "down"
    .East  => "right"
    .West  => "left"
}
```

**Worked example — payload variants, positional binding:**
```scrml
match shape {
    .Circle(r)       => r * r * 3.14159
    .Rectangle(w, h) => w * h
    .Point           => 0
}
```

**Worked example — block arm body:**
```scrml
match shape {
    .Circle(r) => {
        let area = r * r * 3.14159
        let perimeter = 2 * r * 3.14159
        area + perimeter
    }
    .Rectangle(w, h) => w * h
    .Point            => 0
}
```

---

### 18.3 Match as Expression and Statement

A `match` construct is an **expression**. It produces a value. It MAY appear anywhere an
expression is valid: on the right-hand side of an assignment, as a function argument, as
the body of a logic context, or inside a `^{ }` meta context.

When all arms produce `void` (side-effect-only arms with no value-producing body), the
`match` construct is treated as a **statement**. A void match may not appear on the
right-hand side of an assignment.

**Normative statements:**

- A `match` expression SHALL produce the type common to all arm body types (the unified
  result type — see §18.4).
- A `match` expression MAY appear as the right-hand side of a variable declaration or
  assignment, as a function call argument, as the body of an arrow function, or as a
  returned expression.
- A `match` expression whose arms all produce `void` SHALL be valid as a statement. It
  SHALL NOT be assigned to a variable (E-TYPE-001: void not assignable).
- A `match` expression is valid in any expression position, including as the operand of
  `return`. Writing `return match expr { ... }` in a function body SHALL be valid and SHALL
  evaluate the match expression and return its result.

**Worked example — `return match` in a function body (valid):**

```scrml
${ function getLabel(status) {
    return match status {
        .Loading => "Loading..."
        .Success => "Done!"
        .Error   => "Failed"
        else     => "Unknown"
    }
} }
```

The `match status { ... }` is the operand of `return`. The compiler evaluates the match
expression, selects the arm matching the current `status` variant, and returns the resulting
string. The function's return type is inferred as `string`.

**Worked example — invalid (`return match` with void arms):**

```scrml
${ function logStatus(status) {
    return match status {
        .Loading => console.log("loading")
        .Success => console.log("done")
        .Error   => console.log("error")
        else     => console.log("unknown")
    }
} }
```

All arms produce `void`. The `match` expression has type `void` (§18.4). Returning a `void`
match expression from a function that has an inferred non-void return type is a type error
(E-TYPE-001). If the function is explicitly typed as `-> void`, this is valid.

---

### 18.4 Result Type Rule

All arm bodies of a single `match` expression MUST produce the same type, or types that
unify to a common supertype. The result type of the `match` expression is that unified type.

**Unification rules:**

1. If all arms produce the same concrete type `T`, the match expression has type `T`.
2. If arms produce types `A` and `B` where one is a union member of the other (e.g.,
   `string` and `string | not`), the result type is the union (`string | not`).
3. If arms produce types `A` and `B` with no subtype relationship, this SHALL be a compile
   error (E-TYPE-001) citing the two conflicting arm types and their source positions.
4. If all arms produce `void`, the match expression has type `void` and is treated as a
   statement (§18.3).

**Normative statements:**

- The compiler SHALL infer the result type of a `match` expression from the types of its
  arm bodies.
- If two or more arm bodies produce types that cannot be unified, the compiler SHALL emit
  E-TYPE-001 identifying each conflicting arm.
- The result type of a `match` expression is the unified type of all arm body types.

**Worked example — valid (all arms same type):**
```scrml
let label:string = match status {
    .Active  => "active"
    .Pending => "pending"
    .Closed  => "closed"
}
```
All arms produce `string`. Result type is `string`.

**Worked example — invalid (type mismatch across arms):**
```scrml
let x = match flag {
    .On  => "yes"
    .Off => 42        // Error: string vs number
}
```
Error E-TYPE-001: match arm at `.Off` produces `number`; earlier arms produce `string`.
Arms must produce the same type or types that unify to a common supertype.

---

### 18.5 Arm Body Forms

An arm body is either a single expression or a block body.

**Single-expression arm:**
```scrml
.Circle(r) => r * r * 3.14159
```
The expression is the arm's result value.

**Block arm:**
```scrml
.Circle(r) => {
    let scaled = r * scaleFactor
    scaled * scaled * 3.14159
}
```
A block arm is `{ statement* expression? }`. The block's result is its **last expression**.
If the block has no final expression (all statements, no trailing expression), the arm
produces `void`.

**Normative statements:**

- An arm body SHALL be either a single expression or a `{ }` block.
- A block arm body's result type SHALL be the type of its last expression. If the block
  ends with a statement and has no trailing expression, the arm result type is `void`.
- The result type rule from §18.4 applies to block arm bodies the same as to
  single-expression bodies: the last expression's type is the arm's contribution to the
  unified result type.

---

### 18.6 Default Arm (`else`)

`else` is the default arm. It matches any value of the matched type that is not matched by
a preceding arm.

**Position requirement:** The `else` arm SHALL be the last arm in the match expression. No
arm MAY appear after `else`. An `else` arm that is not the last arm is a compile error
(E-SYNTAX-010).

**Binding:** `else` does NOT bind the matched value. There is no way to access the matched
value inside an `else` arm body. `else` is a pure discard. If the developer needs access to
the matched value in the default arm, they must name a binding explicitly (future: this use
case is the motivation for a named default pattern, which is not part of v1).

**Payload access:** Because `else` does not bind the value, payload fields of unmatched
variants are inaccessible inside an `else` arm body. The developer who needs payload access
for a specific variant that would otherwise fall to `else` MUST add an explicit arm for
that variant.

**Redundant `else`:** When all variants of the matched type are already covered by explicit
arms, an `else` arm is unreachable. The compiler SHALL emit a warning (W-MATCH-001:
unreachable default arm) and SHALL NOT emit E-TYPE-020. A redundant `else` arm is a
warning, not an error.

**Normative statements:**

- `else` SHALL match any value of the matched type and SHALL be valid as the last arm of a
  match expression.
- The `else` arm SHALL be the last arm. An `else` arm that is not the last arm SHALL be a
  compile error (E-SYNTAX-010).
- `else` SHALL NOT bind the matched value. Accessing the matched value inside an `else` arm
  body is not possible.
- When all variants are already covered by explicit arms AND an `else` arm is also present,
  the compiler SHALL emit W-MATCH-001 (unreachable default arm) and SHALL NOT emit
  E-TYPE-020.
- W-MATCH-001 is a warning, not an error. Compilation proceeds.
- `_` is a VALID ALIAS for `else` in match arm default position. Both `_` and `else` are
  accepted as the default/wildcard match arm. The canonical form is `else`. The compiler
  preference setting controls which form the formatter normalizes to.

---

### 18.7 Payload Destructuring

Payload variants (§14.4) carry named fields. Match arms can bind those fields to local
variables in two forms:

**Positional form:** Bindings are assigned left-to-right in the order the fields were
declared in the enum definition.

```scrml
// Declaration: Rectangle(width:number, height:number)
.Rectangle(w, h) => w * h   // w binds width, h binds height
```

**Named form:** Bindings are assigned by field name. The order in the arm pattern does not
need to match the declaration order.

```scrml
.Rectangle(height: h, width: w) => w * h
```

**Type of bound variables:** A bound variable in a payload destructuring pattern has the
type declared for that field in the enum definition. In the example above, `w` has type
`number` (from `width:number`) and `h` has type `number` (from `height:number`). The
compiler infers this type; no annotation is required on the binding.

**Arity rules:**

- Providing fewer bindings than the variant has fields in the positional form SHALL be a
  compile error (E-TYPE-021: payload arity mismatch). All fields must be bound in positional
  form; there is no partial binding.
- Providing more bindings than the variant has fields SHALL be a compile error (E-TYPE-021).
- In the named form, providing a field name that does not exist in the variant declaration
  SHALL be a compile error (E-TYPE-022: unknown payload field name).
- In the named form, providing fewer field names than the variant has fields is valid: only
  the named fields are bound; other fields are not accessible. The compiler SHALL NOT warn
  on partial named binding.

**Normative statements:**

- Positional binding SHALL assign fields left-to-right in declaration order.
- The type of each bound variable SHALL be the declared type of the corresponding field in
  the enum variant definition.
- Positional arity mismatch (too few or too many bindings) SHALL be a compile error
  (E-TYPE-021).
- A named binding that references a nonexistent field name SHALL be a compile error
  (E-TYPE-022).
- Partial binding (naming fewer than all fields) is valid only in the named form.

**Worked example — valid, named form:**
```scrml
type Person:enum = {
    Employee(name:string, department:string, salary:number)
    Contractor(name:string, rate:number)
}

match person {
    .Employee(name: n, department: d) => "${n} works in ${d}"
    .Contractor(name: n)              => "${n} is a contractor"
}
```
`salary` is not bound in the `.Employee` arm; it is inaccessible but causes no error.

**Worked example — invalid, positional arity mismatch:**
```scrml
type Shape:enum = {
    Rectangle(width:number, height:number)
}

match shape {
    .Rectangle(w) => w   // Error E-TYPE-021: arity mismatch, 1 binding for 2 fields
    else          => 0
}
```
Error E-TYPE-021: `.Rectangle` has 2 payload fields; 1 binding provided. Use positional
form with all 2 bindings or use named form with a subset of field names.

---

### 18.8 Exhaustiveness Checking

#### 18.8.1 Match over Enum Types

A `match` over an enum type is exhaustive when every declared variant of the enum has a
corresponding arm, OR when an `else` arm is present.

The compiler SHALL check exhaustiveness at Stage 6 (TS-C). A `match` that is not
exhaustive SHALL be a compile error (E-TYPE-020).

**The canonical exhaustiveness check is variant-set coverage:** given the set of variants
declared in the enum type `V = {V1, V2, ..., Vn}` and the set of variant arms in the
match `A = {::V1, ::V3, ...}`, the match is exhaustive if and only if `V ⊆ A` or `else` is
present.

**Normative statements:**

- A `match` over an enum type SHALL be exhaustive. All variants of the matched type must
  be covered by explicit arms or by an `else` arm.
- A `match` that is not exhaustive SHALL be a compile error (E-TYPE-020). The error message
  SHALL list the missing variant names.
- An `else` arm covers all remaining variants for the purpose of exhaustiveness.
- Duplicate variant arms (two arms for the same variant) SHALL be a compile error
  (E-TYPE-023: duplicate match arm). The second arm is unreachable.

#### 18.8.2 Match over Union Types (`A | B | not`)

A `match` over a union type `A | B` (§14.3) is exhaustive when every member of the union
has a corresponding arm, or a `_` arm is present. Union-member arms use the same
`.VariantName` (or `::VariantName` alias) syntax when the member is an enum variant, and
use `.Some(value)` / `.None` when the union contains `not` (optional match).

**Optional match:** For a value of type `T | not`:
- `.Some(value)` matches the present case and binds the unwrapped value as `value` with
  type `T`.
- `.None` matches the `not` case.

```scrml
// val : string | not
match val {
    .Some(s) => "got: ${s}"
    .None    => "nothing"
}
```

A non-exhaustive union match (missing one or more union members, no `_` arm) SHALL be a
compile error (E-TYPE-006).

**Match over struct types and `asIs`:** Match is NOT valid over struct types. Attempting
to match a struct-typed value SHALL be a compile error (E-TYPE-024: match not valid over
struct type). Match is NOT valid over `asIs`-typed values. Attempting to match an
`asIs`-typed value SHALL be a compile error (E-TYPE-025: match not valid over asIs; resolve
the type before matching).

**Normative statements:**

- A `match` SHALL be valid over enum types and union types (`A | B | not`).
- A `match` SHALL NOT be valid over struct types. E-TYPE-024 fires.
- A `match` SHALL NOT be valid over `asIs`-typed values. E-TYPE-025 fires.
- For an optional type `T | not`, `.Some(value)` and `.None` are the valid arm patterns.
  The bound variable in `.Some(value)` has type `T`.
- A non-exhaustive union-type match SHALL be a compile error (E-TYPE-006).
- E-TYPE-020 is for non-exhaustive enum match. E-TYPE-006 is for non-exhaustive union-type
  match. These are distinct error codes for distinct cases.

#### 18.8.3 Error Code Consolidation

The error code `E-EXHAUST-001`, which appeared in PIPELINE.md Stage 6 as an alias for
non-exhaustive enum match, is **retired**. It is removed from the PIPELINE.md Stage 6
error contract. The single canonical error code for non-exhaustive enum match is
**E-TYPE-020**. All PIPELINE.md Stage 6 references to `E-EXHAUST-001` SHALL be replaced
with `E-TYPE-020`.

| Error code | Condition | Section |
|---|---|---|
| E-TYPE-020 | Non-exhaustive match over enum type | §18.8.1 |
| E-TYPE-006 | Non-exhaustive match over union type | §18.8.2 |

---

### 18.9 Valid Contexts

A `match` expression is valid in the following contexts:

| Context | Valid | Notes |
|---|---|---|
| Logic context (`${ }`) | YES | `match` is a value-producing expression in logic context |
| Meta context (`^{ }`) | YES | `match` is valid in compile-time meta computation |
| Function body | YES | `match` is valid anywhere an expression is valid in a function body |
| Markup context (direct) | NO | E-TYPE-026: `match` not valid as direct markup content |
| SQL context (`?{ }`) | NO | E-TYPE-026: `match` not valid inside SQL context |
| CSS context (`#{ }`) | NO | E-TYPE-026: `match` not valid inside CSS context |
| Attribute value position | NO | E-TYPE-026: `match` not valid as an attribute value |

**Match inside a logic-in-markup context:** When a `match` appears inside a `${ }` logic
context whose parent is markup, the `match` result is subject to the markup coercion rules
of §3.3. The arm bodies must produce markup-coercible types, or E-TYPE-010 fires. The
`match` expression itself is legal; the type check on its result type applies.

**Normative statements:**

- A `match` expression SHALL be valid inside a `${ }` logic context, a `^{ }` meta
  context, and any function body.
- A `match` expression SHALL NOT be valid as a direct child of markup context (outside a
  `${ }` block), as an attribute value, inside a `?{ }` SQL context, or inside a `#{ }`
  CSS context. Violations SHALL be a compile error (E-TYPE-026).
- When a `match` appears inside a `${ }` logic context whose parent is markup, the match
  result type must be markup-coercible per §3.3. If it is not, E-TYPE-010 fires.

---

### 18.10 Guard Clauses — Explicitly Excluded (v1)

Guard clauses (e.g., `.Circle(r) if r > 0 => ...`) are **NOT part of scrml v1 pattern
matching**. The syntax `if` after an arm pattern SHALL be a compile error (E-SYNTAX-011:
guard clause syntax is not supported in v1).

**Rationale:** Guard-free exhaustiveness checking is variant-set coverage — a simple,
deterministically implementable algorithm. Guard clauses require path-coverage analysis
(proving that multiple guarded arms for the same variant together cover all values of that
variant), which is substantially harder. An arm `.Circle(r) if r > 0 => ...` alone does
not cover all `Circle` values; the compiler cannot prove coverage in general without
solving a constraint-satisfaction problem. Guard-free match keeps TS-C tractable for v1.

This exclusion is tracked as **DC-017** in `docs/deferred-complexity.md`. The
exhaustiveness algorithm (variant-set coverage) must be explicitly replaced before any
guard clause syntax is added to §18.

**Normative statements:**

- Guard clause syntax (`if` after an arm pattern) SHALL NOT be recognized as valid match
  arm syntax in v1.
- The compiler SHALL emit E-SYNTAX-011 if `if` appears immediately after an arm pattern in
  a match expression.

---

### 18.11 Nested Patterns — Explicitly Excluded (v1)

Nested patterns (e.g., `.Add(.Lit(v), right) => ...`) are **NOT part of scrml v1
pattern matching**. Each arm pattern SHALL match only one level of variant structure. The
payload bindings in an arm are plain identifiers that bind to the payload field values;
they are not themselves patterns.

**Developer guidance:** To decompose a nested enum value, use sequential match expressions:
an outer `match` binds the top-level payload, and an inner `match` in the arm body
dispatches over the bound value.

```scrml
// Correct pattern for nested dispatch (sequential match)
match expr {
    .Add(left, right) => {
        let leftVal = match left {
            .Lit(v)    => v
            .Add(l, r) => l + r   // recursive; here simplified
        }
        leftVal + evalExpr(right)
    }
    .Lit(v) => v
}
```

This exclusion is tracked as **DC-018** in `docs/deferred-complexity.md`.

**Normative statements:**

- Nested patterns (a variant pattern in binding position) SHALL NOT be valid in v1 match
  arm syntax.
- A binding position that contains `.VariantName` instead of a plain identifier SHALL be
  a compile error (E-SYNTAX-012: nested pattern not supported in v1).

---

### 18.12 Linear Types and `match` (Cross-reference to §34.4)

This section records the full normative rules for `lin` x `match` interaction. The
authoritative `lin` rules are in §34. This section provides the §18-perspective
cross-reference and extends §34.4 with the gaps identified in the TS-C gate review.

**Match as a consumption event:** Matching a `lin` variable is a consumption event. The
expression `match token { ... }` consumes `token`. After the `match` expression, `token`
is consumed and SHALL NOT be used again (E-LIN-002 if used again, E-LIN-001 if the match
result falls to a branch that somehow doesn't execute — but since all arms execute on
exactly one path, the match always produces exactly one consumption).

**Default arm and `lin` set consistency:** The `else` arm is treated as an arm for the
purposes of §34.4's lin-set consistency rule. All arms, including `else`, MUST consume the
same set of `lin` variables. If the `else` arm consumes a `lin` variable that named-variant
arms do not, or vice versa, this is E-LIN-003.

**Destructured bindings and `lin` status:** Payload bindings introduced by a destructuring
pattern (`.Variant(x)`) inherit `lin` status if the matched value is a `lin` variable.
Specifically: if the matched variable is `lin`, all of its destructured bindings are also
`lin` and must each be consumed exactly once. Binding a field from a `lin` enum value does
not split the consumption — consuming any single destructured binding does not satisfy the
`lin` requirement for the others. Each bound variable is independently `lin` and must be
independently consumed.

**`lin` values produced by arm bodies:** If an arm body produces a `lin` value, the
`match` expression itself produces a `lin` value. The consuming code after the `match`
must consume the match result exactly once, as with any `lin` value.

**Normative statements:**

- A `match` over a `lin` variable IS a consumption event for that variable. The variable
  is consumed at the point of the `match` keyword.
- All arms, including the `else` arm, MUST consume the same set of outer `lin` variables
  (§34.4). An arm that consumes a `lin` variable that another arm does not is E-LIN-003.
- Destructured payload bindings from a `lin` enum variable SHALL each inherit `lin` status.
  Each destructured binding MUST be consumed exactly once.
- If all arm bodies produce a `lin` value of type `T`, the `match` expression produces a
  `lin` value of type `T`. The result must be consumed exactly once by the code following
  the `match` expression.

*See §34.4 for the full branching and loop interaction rules for `lin` variables.*

---

### 18.13 Arm Pattern Qualification

Both fully qualified and shorthand variant patterns are valid in the same match expression.

- Shorthand: `.VariantName` — valid when the matched type can be inferred from context.
- Fully qualified: `TypeName.VariantName` — always valid; anchors type inference.
- Mixed qualification within a single match expression is valid. The compiler uses the
  fully qualified arm(s) to anchor type inference for unqualified arm(s).

**Normative statements:**

- `.VariantName` (shorthand) SHALL be valid when the matched value's type can be inferred
  by the compiler from context.
- `TypeName.VariantName` (fully qualified) SHALL always be valid regardless of type
  inference state.
- Mixing qualified and unqualified arms in a single match expression SHALL be valid. The
  compiler SHALL use any fully qualified arm to resolve the type for unqualified arms in
  the same expression.
- If the compiler cannot infer the type of the matched value (e.g., it is `asIs` — which
  is separately an E-TYPE-025 error), unqualified arms SHALL be a compile error (E-TYPE-027:
  cannot infer enum type for shorthand pattern; use fully qualified `TypeName.VariantName`
  form).

---

### 18.14 Edge Cases

#### 18.14.1 Zero-Variant Enum

A zero-variant enum `type Void:enum = {}` is a valid type declaration. A `match` over a
value of type `Void` has no variants to cover. A match with no arms is exhaustive by
vacuous truth — there are no cases to miss. The compiler SHALL accept a match with zero
arms over a zero-variant enum type as exhaustive. A `_` arm over a zero-variant enum is
redundant and SHALL produce W-MATCH-001.

#### 18.14.2 Duplicate Arms

Two arms for the same variant in a single match expression:

```scrml
match shape {
    ::Circle(r) -> r * 2
    ::Circle(r) -> r * 3   // Error E-TYPE-023
    ::Point -> 0
}
```

The second `.Circle` arm is unreachable. This SHALL be a compile error (E-TYPE-023:
duplicate match arm). The first arm for a variant is used; the second is an error.

---

### 18.15 Error Code Summary

| Code | Condition | Severity |
|---|---|---|
| E-TYPE-020 | Non-exhaustive match over enum type (missing variant, no `_` arm) | Error |
| E-TYPE-006 | Non-exhaustive match over union type | Error |
| E-TYPE-021 | Payload arity mismatch in positional destructuring | Error |
| E-TYPE-022 | Named binding references nonexistent payload field | Error |
| E-TYPE-023 | Duplicate arm for the same variant | Error |
| E-TYPE-024 | Match over a struct type (not supported) | Error |
| E-TYPE-025 | Match over an `asIs`-typed value (resolve type first) | Error |
| E-TYPE-026 | Match expression in invalid context (markup, SQL, CSS, attribute) | Error |
| E-TYPE-027 | Shorthand pattern used when enum type cannot be inferred | Error |
| E-SYNTAX-010 | `else` default arm is not the last arm | Error |
| E-SYNTAX-011 | Guard clause syntax (`if` after arm pattern) — not supported in v1 | Error |
| E-SYNTAX-012 | Nested pattern in binding position — not supported in v1 | Error |
| W-MATCH-001 | Wildcard `_` arm is unreachable (all variants already covered) | Warning |
| E-TYPE-081 | `partial match` in rendering or lift context | Error |
| W-MATCH-003 | `partial` applied when all variants are already explicitly covered | Warning |

### 18.16 Literal Match Arms — String, Number, Boolean

`match` SHALL accept values of type `string`, `number`, and `boolean`. Arms for
these types use literal values directly — no variant prefix sigil, no `is` keyword.

#### 18.16.1 Syntax

```
literal-arm-pattern ::= string-literal
                       | number-literal
                       | boolean-literal
arm-pattern         ::= variant-pattern
                       | literal-arm-pattern     // added by §18.16
                       | wildcard-arm            // 'else' keyword
                       | is-pattern
```

**Worked example — string match:**

```scrml
match status {
    "active"  => handleActive()
    "banned"  => handleBanned()
    else      => handleOther()
}
```

**Worked example — number match:**

```scrml
match priority {
    1    => "high"
    2    => "medium"
    3    => "low"
    else => "unknown"
}
```

**Worked example — boolean match:**

```scrml
match isAdmin {
    true  => showAdminPanel()
    false => showUserPanel()
}
```

#### 18.16.2 Exhaustiveness Rules for Literal Match

Literal match operates under **non-exhaustive-by-default** semantics. The compiler
SHALL NOT require a `_` wildcard arm for `string` or `number` matches. A `_` arm
is allowed and covers all unmatched values.

For `boolean` match specifically: because `boolean` has exactly two values (`true`
and `false`), a `match` with both `true` and `false` arms and no `_` arm IS
exhaustive. The compiler SHALL recognize this as complete. A `match` with only
`true` or only `false` and no `_` arm is non-exhaustive and SHALL produce a
warning (W-MATCH-002), not an error.

**Normative statements:**

- `match` SHALL accept `string`-typed values. String literal arms are unquoted
  string values in arm-pattern position (e.g., `"active"` with quotes is the arm
  pattern).
- `match` SHALL accept `number`-typed values. Number literal arms are numeric
  literals in arm-pattern position.
- `match` SHALL accept `boolean`-typed values. Boolean literal arms are the
  keywords `true` or `false` in arm-pattern position.
- Exhaustiveness for `string` and `number` match SHALL NOT be enforced. The
  compiler SHALL NOT emit E-TYPE-020 for a non-exhaustive `string` or `number`
  match. An `else` arm is allowed but not required.
- A `string` or `number` match without an `else` arm is valid. It is permitted but
  the compiler SHALL emit warning W-MATCH-002 (non-exhaustive literal match;
  consider adding an `else` arm to handle unmatched values).
- Exhaustiveness for `boolean` match IS enforced when both arms are present. A
  `boolean` match with both `true` and `false` arms and no `_` arm SHALL be
  considered exhaustive. A `boolean` match missing one of the two values without
  a `_` arm SHALL produce W-MATCH-002.
- Duplicate literal arms (two arms with the same literal value) SHALL be a compile
  error (E-TYPE-023: duplicate match arm).
- The `else` arm in a literal match follows the same position rule as in
  enum match (§18.6): it SHALL be the last arm. An `else` arm that is not last SHALL
  be E-SYNTAX-010.
- Literal arms MAY be mixed with enum variant arms in a single match only when the
  matched type is a union that includes both an enum and a primitive (e.g.,
  `Status | string`). Mixing literal arms with variant arms over a pure enum type
  SHALL be a compile error (E-TYPE-028: literal arm not valid over enum type; use
  `.VariantName` arm syntax).

---

### 18.17 The `is` Operator — Single-Variant Check

The `is` operator tests whether an enum-typed value is a specific variant. It produces a
`boolean` value. It is NOT a match expression and does NOT produce exhaustiveness checking.

**Syntax:**

```
is-expression ::= expression 'is' '.' VariantName
```

The `.VariantName` form is always shorthand (no type prefix required); the type is inferred
from the left-hand operand.

**Semantics:**

`expr is .V` evaluates to `true` if and only if `expr`'s runtime value is the variant `V`
of its enum type. It evaluates to `false` for all other variants. No payload is bound or
accessible by the `is` expression itself.

**Worked example — conditional:**
```scrml
@filter:FilterMode = .All

${ if (@filter is .Active) {
    loadActiveItems()
} }
```

**Worked example — in markup attribute:**
```scrml
<button class=selected(@filter is .All) onclick={@filter = .All}>All</>
<button class=selected(@filter is .Active) onclick={@filter = .Active}>Active</>
```

**Worked example — with reactive variable:**
```scrml
type Tab:enum = { Overview, Activity, Settings }
@tab:Tab = .Overview

<nav>
    <a class=active(@tab is .Overview) onclick={@tab = .Overview}>Overview</>
    <a class=active(@tab is .Activity) onclick={@tab = .Activity}>Activity</>
    <a class=active(@tab is .Settings) onclick={@tab = .Settings}>Settings</>
</>
```

**Worked example — invalid (not an enum type):**
```scrml
let name = "Alice"
if (name is .Admin) { ... }   // Error E-TYPE-062
```

```
Error E-TYPE-062 at line 2: `is` operator requires an enum-typed left-hand operand.
  `name` has type `string`, not an enum type.
```

**Normative statements:**

- The `is` operator SHALL be valid only when the left-hand operand is of an enum type. If
  the operand is not an enum type, this SHALL be a compile error (E-TYPE-062: `is` operator
  requires an enum-typed operand).
- The `.VariantName` on the right-hand side of `is` SHALL be resolved against the enum type
  of the left-hand operand. An unknown variant name SHALL be a compile error (E-TYPE-063:
  unknown variant name in `is` expression).
- `expression is .VariantName` SHALL have result type `boolean`.
- The `is` operator SHALL NOT bind or expose payload fields. For payload access, use `match`.
- The `is` operator provides NO exhaustiveness guarantee. It is a boolean predicate, not a
  dispatch form.
- `is` MAY be used in: `if` conditions, `class=` dynamic binding expressions, ternary
  expressions, `when` guards, and any position where a boolean expression is valid.

---

#### 18.16.3 AST Representation

Literal arms produce a `LiteralArmPattern` node in the `MatchExpr` AST. This node
carries:
- `value`: the literal value (string, number, or boolean)
- `type`: `'string'` | `'number'` | `'boolean'`

The TS-C pass handles `LiteralArmPattern` nodes by emitting a comparison (`===`)
in generated code rather than an enum variant dispatch.

**Worked example — valid (string match, no `_`, warning):**

```scrml
match role {
    "admin"  -> showAdmin()
    "editor" -> showEditor()
}
```

Compiles. Emits W-MATCH-002: non-exhaustive string match; a role value other than
`"admin"` or `"editor"` will produce `undefined`. Consider adding an `else` arm.

**Worked example — valid (string match with `_`):**

```scrml
match role {
    "admin"  -> showAdmin()
    "editor" -> showEditor()
    _        -> showUser()
}
```

No warning. `_` covers all other string values.

**Worked example — invalid (literal arm over enum type):**

```scrml
type Status:enum = { Active, Banned }

match status {
    "active" -> handleActive()   // Error E-TYPE-028
    _        -> handleOther()
}
```

Error E-TYPE-028: literal arm `"active"` is not valid over enum type `Status`. Use
`.Active =>` instead.

#### 18.16.4 Error and Warning Code Summary

| Code | Condition | Severity |
|---|---|---|
| W-MATCH-002 | Non-exhaustive literal match (string/number/boolean without `_` arm) | Warning |
| E-TYPE-028 | Literal arm used over an enum type | Error |

---

### 18.18 `partial match` — Opt-Out of Exhaustiveness in Logic Context

#### Motivation

`match` is exhaustive by design (§18.8). In rendering contexts, exhaustiveness is
non-negotiable: a missing arm means missing UI, a runtime bug, or a blank screen. The
compiler enforcing exhaustiveness in rendering contexts is a feature, not a limitation.

In logic/expression contexts, exhaustiveness is still the correct default. However, there
are legitimate patterns where a developer intends to act on a subset of variants and
explicitly ignore the rest. The current workaround is an `else =>` arm that does nothing:

```scrml
match @status {
    .Failed(err) => console.log(err.message)
    .Timeout => retryPayment()
    else => {}   // deliberately ignoring Active, Pending, Cancelled
}
```

This satisfies the compiler but obscures intent. The reader cannot distinguish "I handled
everything I care about" from "I forgot the other variants." The `partial` keyword makes
the intent explicit.

#### Syntax

```
partial-match-expr ::= 'partial' match-expr

match-expr ::= 'match' expression '{' match-arms '}'
match-arms ::= match-arm+
match-arm  ::= is-pattern '=>' arm-body  // canonical; aliases valid per §18.1
```

`partial` is a modifier keyword placed immediately before `match`. It applies to the
single `match` expression that follows it. It cannot be stored or passed; it is purely
syntactic.

```scrml
// partial match — only handles the variants relevant here; others silently ignored
partial match @status {
    .Failed(err) => console.log(err.message)
    .Timeout => retryPayment()
}
```

#### Semantics

A `partial match` evaluates exactly like a standard `match` expression, except:

1. **No exhaustiveness check.** The compiler SHALL NOT emit E-TYPE-020 for an enum
   `partial match` that does not cover all variants. The compiler SHALL NOT emit E-TYPE-006
   for a union-type `partial match` that does not cover all union members.
2. **Unmatched variants are silently ignored.** At runtime, if the matched value is a
   variant not listed in any arm, execution falls through the `partial match` expression
   with no action taken. The result type of a `partial match` in statement position is
   `void`.
3. **The `else` arm is still valid** inside `partial match`. An `else` arm covers all
   remaining variants. The compiler SHALL emit W-MATCH-001 (unreachable default `else`
   arm) if all variants are already explicitly covered AND `else` is present.

**`partial match` in value position:** A `partial match` in a position where a value is
expected is only valid when the matched type is provably exhaustive given the arms
provided, OR when the `partial match` result is discarded (statement context). If neither
condition is met, the compiler SHALL emit E-TYPE-081.

In practice, `partial match` is intended for statement-context use where the result is
discarded (i.e., the match is for side effects only). For value-producing use, standard
`match` with an `else` arm is the correct form.

#### Restriction: Rendering and Lift Contexts

`partial match` SHALL NOT be used in rendering or `lift` contexts. A `partial match` in
a rendering context is a compile error (E-TYPE-081).

**Why?** In rendering contexts, a `partial match` would silently produce no output for
unmatched variants. This is indistinguishable from a bug (a variant whose rendering was
forgotten) and is exactly the class of error that exhaustive match was designed to prevent.

The compiler detects "rendering context" as any `match` expression that:
- Appears as the direct or indirect value of a `lift` expression, OR
- Appears inside a `${}` block whose parent context is markup, OR
- Appears as the right-hand side of a markup interpolation.

**Normative statement:** If `partial match` appears in any of the three rendering-context
positions above, the compiler SHALL emit E-TYPE-081 with a message explaining that
`partial match` is not valid in rendering/lift context and suggesting standard `match`
with an `else` arm.

#### Warning: Unnecessary `partial`

If `partial match` is used but all variants of the matched type are explicitly covered
by the provided arms, the `partial` modifier has no effect (the match is already
exhaustive). The compiler SHALL emit W-MATCH-003 in this case.

```scrml
type Status:enum = { Active, Pending }

// W-MATCH-003: `partial` is unnecessary — all variants are covered
partial match @status {
    .Active => handleActive()
    .Pending => handlePending()
}
```

```
Warning W-MATCH-003 at line 4: `partial` is unnecessary — all variants of `Status`
are explicitly covered. Remove `partial` to use standard exhaustive match, which will
protect against future variant additions.
```

This warning is intentional. If the enum gains a new variant in the future, a standard
exhaustive match would catch the missing arm at compile time. A `partial match` would
silently ignore it. The warning nudges developers toward exhaustive match when it is
achievable at no additional cost.

#### Valid and Invalid Contexts

| Context | `partial match` valid? | Notes |
|---|---|---|
| Logic context (`${}`) — statement position | YES | Primary intended use |
| Logic context (`${}`) — value position, result discarded | YES | `void` result |
| Logic context (`${}`) — value position, result used | Only if match is provably exhaustive over arms | Otherwise E-TYPE-081 |
| `lift` expression | NO | E-TYPE-081 |
| Markup interpolation (`${}` in markup parent) | NO | E-TYPE-081 |
| Function body — statement position | YES | Same as logic context statement |
| `^{}` meta context | YES | Meta blocks allow `partial match` |

#### Normative Statements

- The `partial` keyword placed immediately before `match` SHALL disable exhaustiveness
  checking for that `match` expression. The compiler SHALL NOT emit E-TYPE-020 or
  E-TYPE-006 for a `partial match` that does not cover all variants.
- `partial match` SHALL be valid only in logic contexts (`${}`) in statement position,
  function bodies in statement position, and `^{}` meta contexts.
- `partial match` in a rendering context (direct or indirect value of `lift`, inside a
  `${}` whose parent is markup, or in a markup interpolation) SHALL be a compile error
  (E-TYPE-081).
- `partial match` used when all variants of the matched enum type are already explicitly
  covered by arms SHALL produce a warning (W-MATCH-003). The `partial` modifier provides
  no protection in this case and removes future-proofing.
- All other `match` rules (§18) SHALL apply unchanged inside `partial match`. Arm syntax,
  payload destructuring, alias forms, and `else` arms are all valid. Only exhaustiveness
  checking is disabled.
- The compiler SHALL NOT allow `partial` to be stored as a value, passed as an argument,
  or used in any position other than immediately before a `match` keyword. `partial` is a
  syntactic modifier, not a first-class value.
- `partial match` SHALL produce `void` as its result type in statement position.

#### Worked Examples

**Example 1 — Valid: Logging subset of payment states**

```scrml
<program>
    type PaymentStatus:enum = {
        Active, Pending, Failed(err: Error), Timeout, Cancelled
    }

    @status:PaymentStatus = .Active

    ${ function handleTerminalStates() {
        partial match @status {
            .Failed(err) => console.log(err.message)
            .Timeout => retryPayment()
            // Active, Pending, Cancelled silently ignored
        }
    } }
</>
```

Compiles without error. No E-TYPE-020. The `Active`, `Pending`, and `Cancelled` variants
are intentionally unhandled.

**Example 2 — Invalid: `partial match` in `lift` context**

```scrml
<program>
    type Status:enum = { Active, Inactive }
    @status:Status = .Active

    <div>
        ${
            lift partial match @status {
                .Active => <p>Active</>
            }
        }
    </>
</>
```

```
Error E-TYPE-081 at line 6: `partial match` is not valid in a rendering context.
  `partial match` in a `lift` expression would produce no output for the unhandled
  variant `.Inactive`, making it indistinguishable from a missing-arm bug.
  Use `match` with an `else` arm instead:
    match @status {
        .Active => <p>Active/
        else => {}   // or provide markup for .Inactive
    }
```

**Example 3 — Warning: unnecessary `partial`**

```scrml
type Mode:enum = { Dark, Light }
@mode:Mode = .Light

${ function applyMode() {
    partial match @mode {
        .Dark => setDarkStyles()
        .Light => setLightStyles()
    }
} }
```

```
Warning W-MATCH-003 at line 4: `partial` is unnecessary — all variants of `Mode`
are covered (.Dark, .Light). Remove `partial` to use exhaustive match, which protects
against future variant additions.
```

**Example 4 — Valid: partial match in function body (statement position)**

```scrml
${ server function processEvent(event: AppEvent) {
    partial match event {
        .UserLogin(userId) => recordLogin(userId)
        .UserLogout(userId) => recordLogout(userId)
        // Other AppEvent variants (SystemAlert, ConfigChange, etc.) not handled here
    }
} }
```

Compiles. The function handles only the variants it cares about.

#### Error and Warning Code Summary

| Code | Condition | Severity |
|---|---|---|
| E-TYPE-081 | `partial match` in rendering or lift context | Error |
| W-MATCH-003 | `partial` applied when all variants are already explicitly covered | Warning |

#### Interaction Notes

- **§18.8 (Exhaustiveness):** `partial` is the sole opt-out from §18.8 exhaustiveness
  rules. It is scoped to the single expression it precedes. All other match expressions
  remain fully exhaustive by default.
- **§10 (lift Keyword):** `lift` is the primary rendering emission form. E-TYPE-081 fires
  when `partial match` is the direct or indirect value of a `lift` expression.
- **§18.9 (Valid Contexts):** The valid context table in §18.9 applies to the arms within
  `partial match` unchanged. The `partial` modifier only affects exhaustiveness checking.
- **§18.17 (`is` Operator):** The `is` operator provides a single-variant boolean check
  without any exhaustiveness requirement. For cases where a developer wants to act on
  exactly one variant, `is` in an `if` condition is idiomatic: `if (@status is .Failed)
  { ... }`. `partial match` is appropriate when multiple non-exhaustive cases need
  distinct handling.
- **§34 (Linear Types):** The linear type checker treats `partial match` as having
  zero-statement implicit arms for unhandled variants. A `lin` variable referenced in a
  `partial match` arm is potentially-unconsumed (the unhandled variants do not consume it).
  The compiler SHALL emit E-LIN-003 if a `lin` variable in scope at the `partial match`
  boundary is not provably consumed on all calling paths before the `partial match`.

## 19. Error Handling (Revised)

> **Alias note:** Throughout §19, both canonical and alias syntax forms are valid. The
> canonical forms are `.VariantName` (enum variant), `=>` (match arm separator), and `else`
> (default arm). The aliases `::VariantName`, `->`, and `_` are equally valid. Examples in
> this section may use either form. The compiler preference setting controls which form the
> formatter normalizes to.

### 19.1 Overview

scrml error handling is based on **Renderable Enum Variants**. Error types are enum types (§14.4). Error variants are enum variants. The `fail` keyword produces an error variant value. The `?` operator propagates errors. The `!` function signature modifier declares a function as failable. The `< errorBoundary>` state type catches errors in markup context.

There is NO try/catch. There are NO exceptions. Errors are values that flow through the type system and are checked at compile time.

### 19.2 The `renders` Clause on Enum Variants

#### 19.2.1 Syntax

An enum variant MAY carry a `renders` clause. The `renders` clause specifies markup that SHALL be used to display the variant when it appears in a markup context inside an `< errorBoundary>`.

**Formal grammar (extends §14.4):**

```
enum-variant     ::= VariantName payload? renders-clause?
payload          ::= '(' field-list ')'
renders-clause   ::= 'renders' markup-body
markup-body      ::= '<' identifier attribute* '>' content closer
```

**Syntax:**

```scrml
type PaymentError:enum = {
    InvalidAmount(reason: string)
        renders <div class="error">${reason}</>
    CustomerNotFound(id: string)
        renders <div class="error">Customer ${id} not found</>
    ExpiredCard
        renders <div class="error">Card has expired. Please update your payment method.</>
    NetworkError(detail: string)
        renders <div class="error">${detail} <button onclick=retry()>Retry//
}
```

#### 19.2.2 Semantics

- The `renders` clause is a **state constructor** (§35.2). It CAN contain logic. The logic runs when the variant is rendered in markup context.
- The `renders` clause body has access to the variant's payload fields. In the example above, `InvalidAmount`'s `renders` clause can reference `reason` because `reason` is a field of that variant.
- The `renders` clause is OPTIONAL. A variant without a `renders` clause is a pure data variant. It MUST be handled explicitly in all contexts (logic and markup).
- The `renders` clause does NOT affect logic-context behavior. In logic context, all variants (with or without `renders`) participate in exhaustive matching identically.

#### 19.2.3 Normative Statements

- The compiler SHALL parse `renders` as a contextual keyword following an enum variant declaration inside a `type:enum` body. `renders` SHALL NOT be a reserved word outside this position.
- The `renders` clause body SHALL be parsed as markup content (§4.1). The block splitter SHALL treat the content after `renders` as a markup scope.
- Variables referenced inside a `renders` clause body SHALL resolve to the variant's payload fields. A reference to an undefined variable inside a `renders` clause SHALL be a compile error: **E-ERROR-006** -- `renders clause on variant '{VariantName}' references undefined variable '{name}'. Only the variant's payload fields are in scope: {list of fields}.`
- The `renders` clause SHALL NOT affect exhaustive matching rules (§18.8). Whether a variant has a `renders` clause or not, it is a variant of the enum and MUST be covered in any `match` expression over that enum type.

---

### 19.3 The `fail` Keyword

#### 19.3.1 Syntax

```
fail-stmt ::= 'fail' enum-type ('.' | '::') variant-name ('(' arg-list ')')?
```

**Syntax:**

```scrml
fail PaymentError::InvalidAmount("Amount must be positive")
fail PaymentError::CustomerNotFound(customerId)
fail PaymentError::ExpiredCard
```

#### 19.3.2 Semantics

`fail` produces an error value and returns it from the enclosing function. `fail` is NOT an exception. It does NOT throw. It does NOT unwind the call stack. The function returns the error variant value to its caller exactly as if a `return` statement had been used.

`fail` is syntactic sugar for `return ErrorType::Variant(args)` with the additional constraint that the enclosing function MUST be declared with the `!` modifier (§19.4). Using `fail` in a function that is not declared with `!` is a compile error.

#### 19.3.3 Normative Statements

- `fail` SHALL be valid only inside a function body declared with the `!` modifier. Using `fail` in a function without `!` SHALL be a compile error: **E-ERROR-001** -- `'fail' used in function '{name}' which is not declared as failable. Add '!' to the function signature: 'function {name}(...)! -> {ErrorType}'.`
- `fail` SHALL produce a value of the error enum type declared in the function's `!` signature. The variant specified in the `fail` statement SHALL be a valid variant of that error enum type. A variant that does not belong to the declared error type SHALL be a compile error (E-TYPE-001).
- `fail` SHALL cause the enclosing function to return immediately with the error variant value. Statements after `fail` in the same block are unreachable. The compiler MAY emit a warning for unreachable code after `fail`.
- `fail` SHALL be valid inside any control flow construct (if/else, for, match) within a `!` function body. The `fail` returns from the function, not from the control flow construct.

---

### 19.4 The `!` Function Signature Modifier

#### 19.4.1 Syntax

```
failable-fn ::= 'function' identifier '(' param-list ')' '!' ('->' error-type)? block
```

**Syntax:**

```scrml
// Explicit error type
function processPayment(amount, customerId)! -> PaymentError {
    if (amount <= 0) fail PaymentError::InvalidAmount("Must be positive")
    // ... success path
}

// Default error type (uses built-in Error enum)
function quickCheck(value)! {
    if (!value) fail Error::Generic("Check failed")
}
```

#### 19.4.2 Semantics

The `!` modifier on a function signature declares that the function is **failable** -- it can produce either a success value or an error value.

- `!` with `-> ErrorType` declares the specific error enum type that this function can produce. The function's return type is implicitly `SuccessType | ErrorType`, where `SuccessType` is inferred from the function's return expressions.
- `!` without `-> ErrorType` uses a built-in default error enum: `Error`, which has a single variant `Error::Generic(message: string)`.
- The return type of a `!` function is a **tagged union** of the success type and the error type. The compiler tracks both branches.

#### 19.4.3 Calling a `!` Function

A call to a `!` function SHALL NOT be ignored. The caller MUST do one of the following:

1. **Match** the result: `match riskyFunction() { ::Ok(val) -> ... ::ErrorVariant -> ... }`
2. **Propagate** with `?`: `let x = riskyFunction()?`
3. **Catch** with `!{}` inline handler: `let x = riskyFunction() !{ ::ErrorVariant -> fallbackValue }`
4. **Contain** inside `< errorBoundary>`: in markup context, an `< errorBoundary>` catches the error

Failing to handle the result of a `!` function call in any of these ways SHALL be a compile error: **E-ERROR-002** -- `Result of failable function '{name}' is not handled. Either match the result, propagate with '?', catch with '!{}', or wrap in '<errorBoundary>'.`

#### 19.4.4 Normative Statements

- The `!` modifier SHALL appear after the parameter list and before `->` (if present) in a function declaration.
- A function with `!` SHALL accept `fail` statements in its body. A function without `!` SHALL NOT accept `fail` statements (E-ERROR-001).
- The caller of a `!` function SHALL handle the result via match, `?`, `!{}`, or `< errorBoundary>`. An unhandled `!` function call SHALL be a compile error (E-ERROR-002).
- The `!` modifier SHALL be part of the function's type signature. It is visible to the type system and participates in type checking.
- `server` and `!` modifiers MAY coexist: `server function loadUser(id)! -> UserError { ... }`.
- `pure` (§33) and `!` modifiers MAY coexist: `pure function validate(x)! -> ValidationError { ... }`. A `pure` failable function SHALL NOT have side effects but MAY produce error values.

---

### 19.5 The `?` Propagation Operator

#### 19.5.1 Syntax

```
propagation-expr ::= expression '?'
```

**Syntax:**

```scrml
function processOrder(orderId)! -> OrderError {
    let customer = loadCustomer(orderId)?    // propagates CustomerError
    let payment = chargeCard(customer.card)?  // propagates PaymentError
    let receipt = generateReceipt(payment)?   // propagates ReceiptError
    receipt
}
```

#### 19.5.2 Semantics

The `?` operator is postfix. When applied to the result of a `!` function call:

1. If the result is a success value, `?` unwraps it and produces the success value.
2. If the result is an error variant, `?` causes the enclosing function to return that error variant immediately.

`?` is syntactic sugar for:

```scrml
match riskyFunction() {
    ::Ok(val) -> val
    ::ErrorVariant(args) -> fail EnclosingErrorType::ErrorVariant(args)
}
```

#### 19.5.3 Error Type Compatibility

For `?` to propagate, the error variants of the called function MUST be compatible with the error type of the enclosing function. Specifically:

- Every error variant that the called function can produce MUST exist as a variant in the enclosing function's error type.
- If the called function produces error variants that are not present in the enclosing function's error type, the compiler SHALL emit a compile error (E-TYPE-001) identifying the incompatible variants.

This ensures that `?` never silently drops error information.

#### 19.5.4 Normative Statements

- `?` SHALL be valid only inside a `!` function body. Using `?` in a non-`!` function SHALL be a compile error: **E-ERROR-003** -- `'?' propagation operator used in function '{name}' which is not declared as failable. Add '!' to the function signature or handle the error with 'match' or '!{}'.`
- `?` SHALL be valid only when applied to a call to a `!` function. Applying `?` to a call to a non-`!` function SHALL be a compile error: **E-ERROR-004** -- `'?' applied to call to '{name}' which is not a failable function. Only '!' functions can be propagated with '?'.`
- `?` SHALL unwrap the success value when the called function succeeds.
- `?` SHALL cause the enclosing function to return the error variant when the called function fails.
- The error variants propagated by `?` SHALL be type-compatible with the enclosing function's declared error type. Incompatible error variants SHALL be a compile error (E-TYPE-001).

---

### 19.6 The `< errorBoundary>` State Type

#### 19.6.1 Overview

`< errorBoundary>` is a **pre-defined state type** (§11) that catches errors from `!` function calls within its markup content. It is the markup-context counterpart to `match` in logic context.

#### 19.6.2 Syntax

```scrml
< errorBoundary fallback={<div>Something went wrong/}>
    // content that may contain failable function calls
    ${loadUser(42)}
    ${processPayment(100)}
</>
```

**Attributes:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `fallback` | markup | No | Default markup to render when an error variant has no `renders` clause |

#### 19.6.3 Semantics

When a `!` function call inside an `< errorBoundary>` produces an error variant:

1. If the error variant has a `renders` clause (§19.2), the `renders` clause markup is displayed in place of the function call's expected output.
2. If the error variant has NO `renders` clause and the `< errorBoundary>` has a `fallback` attribute, the `fallback` markup is displayed.
3. If the error variant has NO `renders` clause and the `< errorBoundary>` has NO `fallback` attribute, this SHALL be a compile error: **E-ERROR-005** -- `Error variant '{EnumType}::{VariantName}' may occur inside '<errorBoundary>' at {location} but has no 'renders' clause and the boundary has no 'fallback' attribute. Either add a 'renders' clause to the variant or add a 'fallback' attribute to the boundary.`

#### 19.6.4 Nesting

`< errorBoundary>` elements are nestable. An inner boundary catches errors before an outer boundary.

```scrml
< errorBoundary fallback={<div>Page error/}>
    <header>${loadNav()}</>
    < errorBoundary fallback={<div>Content error/}>
        ${loadContent()}
    </>
    <footer>${loadFooter()}</>
</>
```

In this example:
- If `loadContent()` fails, the inner boundary catches it. The header and footer remain visible.
- If `loadNav()` or `loadFooter()` fail, the outer boundary catches them.

#### 19.6.5 Interaction with `renders` Clauses

When an error variant with a `renders` clause is caught by an `< errorBoundary>`, the `renders` clause takes precedence over the `fallback` attribute. The `fallback` is only used for variants that lack a `renders` clause.

**Priority order:**

1. Variant's own `renders` clause (highest priority)
2. Boundary's `fallback` attribute
3. Compile error E-ERROR-005 (if neither exists)

#### 19.6.6 Normative Statements

- `< errorBoundary>` SHALL be a pre-defined state type recognized by the compiler. It SHALL NOT be user-definable; the compiler provides it.
- `< errorBoundary>` SHALL catch error variants produced by any `!` function call in its direct or nested markup content.
- Within an `< errorBoundary>`, calling a `!` function without explicit match/propagation SHALL NOT trigger E-ERROR-002. The boundary satisfies the handling requirement.
- Nested `< errorBoundary>` elements SHALL follow inner-catches-first semantics. An error caught by an inner boundary SHALL NOT propagate to an outer boundary.
- The compiler SHALL verify, at compile time, that every error variant reachable inside an `< errorBoundary>` either has a `renders` clause or is covered by the boundary's `fallback` attribute. Failure to satisfy this SHALL be E-ERROR-005.

---

### 19.7 Exhaustive Matching

#### 19.7.1 Logic Context

In logic context, matching the result of a `!` function call follows the existing exhaustive matching rules (§18.8). All variants -- both success and error -- MUST be covered.

The success value is wrapped in an implicit `::Ok` variant. Error variants use their declared enum variant names.

```scrml
match processPayment(100, 42) {
    ::Ok(receipt) -> <div>Success: ${receipt.id}</>
    ::InvalidAmount(reason) -> <div class="error">${reason}</>
    ::CustomerNotFound(id) -> redirect("/customers")
    ::ExpiredCard -> <div>Please update payment method</>
    ::NetworkError(detail) -> <div>Network issue: ${detail}</>
}
```

Missing an error variant SHALL trigger E-TYPE-020 (non-exhaustive match over enum type).

#### 19.7.2 Markup Context with `< errorBoundary>`

Inside an `< errorBoundary>`, exhaustive matching is NOT required. The boundary handles error variants via `renders` clauses or `fallback`. The developer MAY still use explicit `match` inside a boundary for finer control.

#### 19.7.3 Normative Statements

- In logic context, matching a `!` function result SHALL require exhaustive coverage of all variants (success and error). Missing variants SHALL trigger E-TYPE-020.
- In markup context inside an `< errorBoundary>`, the boundary satisfies the error handling requirement. Exhaustive matching of error variants is NOT required.
- The `::Ok` variant SHALL be the implicit wrapper for the success value of a `!` function. The developer SHALL match `::Ok(value)` to access the success case in logic context.
- A `_` wildcard arm SHALL satisfy exhaustiveness for remaining unmatched variants, per existing §18.6 rules.

---

### 19.8 SQL Error Handling

#### 19.8.1 The `SqlError` Built-in Enum

SQL queries via `?{}` (§8) can fail. SQL errors are represented by a built-in enum type:

```scrml
// Built-in — compiler-provided, not user-defined
type SqlError:enum = {
    QueryFailed(message: string)
        renders <div class="sql-error">Query failed: ${message}</>
    ConstraintViolation(field: string)
        renders <div class="sql-error">Constraint violated on field: ${field}</>
    ConnectionLost
        renders <div class="sql-error">Database connection lost. Please try again.</>
}
```

#### 19.8.2 `?{}` Inside a `!` Function

When a `?{}` query is executed inside a `!` function, SQL errors are propagated automatically. The `?{}` expression behaves as if it were a `!` function call that can produce `SqlError` variants.

```scrml
function loadUser(id)! -> UserError {
    let row = ?{`SELECT * FROM users WHERE id = ${id}`}.get()
    // If the query fails, SqlError is propagated via implicit ?
    if (!row) fail UserError::NotFound(id)
    row
}
```

For `?` propagation to work, the enclosing function's error type MUST include the `SqlError` variants, OR the function must explicitly handle SQL errors with `!{}` or `match`.

#### 19.8.3 `?{}` Outside a `!` Function

When a `?{}` query is executed outside a `!` function (backwards-compatible mode):

- A failed query SHALL return `not` (for `.get()`) or an empty array (for `.all()`).
- No error is propagated. No compile error is emitted.
- This preserves backwards compatibility with existing `?{}` usage (§8).

#### 19.8.4 Normative Statements

- `SqlError` SHALL be a built-in enum type provided by the compiler. The developer SHALL NOT redefine it.
- `SqlError` SHALL have at least the three variants specified above: `QueryFailed`, `ConstraintViolation`, `ConnectionLost`. The compiler MAY add additional variants in future versions.
- Inside a `!` function, a `?{}` query that fails at runtime SHALL produce a `SqlError` variant. This variant SHALL be propagated if the enclosing function's error type is compatible, or SHALL be a compile error if incompatible.
- Outside a `!` function, a `?{}` query that fails at runtime SHALL return `not` (for `.get()`) or `[]` (for `.all()`). No error SHALL be raised.

---

### 19.9 Server Function Errors

#### 19.9.1 Serialization

Server `!` functions serialize error values across the server/client boundary. The CPS transformation (approved decision E-RI-002) preserves `!` semantics.

When a server `!` function fails:

1. The server serializes the error variant as a tagged JSON object: `{ __variant: "VariantName", __data: { ... } }`.
2. The HTTP response carries an appropriate status code (see §19.9.2).
3. The client CPS continuation deserializes the tagged object back into the error enum variant.
4. The client code handles the error via match, `?`, `!{}`, or `< errorBoundary>`.

#### 19.9.2 HTTP Status Code Mapping

The compiler SHALL generate HTTP status codes for server `!` function error responses. The default mapping is:

| Condition | HTTP Status |
|-----------|-------------|
| Success (`::Ok`) | 200 |
| Validation / client input error | 400 |
| Authentication / authorization error | 401 / 403 |
| Not found | 404 |
| All other error variants | 500 |

The developer MAY override the status code on a per-variant basis using an `httpStatus` attribute on the variant:

```scrml
type ApiError:enum = {
    NotFound(resource: string) httpStatus(404)
        renders <div class="error">${resource} not found</>
    Forbidden httpStatus(403)
        renders <div class="error">Access denied</>
    RateLimited httpStatus(429)
        renders <div class="error">Too many requests. Please wait.</>
    InternalError(detail: string) httpStatus(500)
        renders <div class="error">Something went wrong</>
}
```

If no `httpStatus` attribute is present, the compiler SHALL apply the following heuristic:

1. If the variant name contains "NotFound" (case-insensitive), use 404.
2. If the variant name contains "Auth", "Forbidden", or "Unauthorized" (case-insensitive), use 403.
3. If the variant name contains "Validation" or "Invalid" (case-insensitive), use 400.
4. Otherwise, use 500.

#### 19.9.3 CPS Preservation

If a server function is declared with `!`, the CPS-generated client wrapper SHALL also be `!`. The client wrapper's error type is the same enum type as the server function's error type.

```scrml
// Developer writes:
server function loadUser(id)! -> UserError { ... }

// Compiler generates client wrapper (conceptual):
// function loadUser(id)! -> UserError { /* CPS fetch call */ }
```

The client calling `loadUser(id)?` propagates the same `UserError` variants that the server function produces.

#### 19.9.4 Normative Statements

- Server `!` functions SHALL serialize error variants as tagged JSON objects across the CPS boundary.
- The HTTP status code SHALL be determined by the `httpStatus` attribute on the variant, or by the heuristic in §19.9.2, or by the default of 500.
- The CPS client wrapper of a server `!` function SHALL itself be `!` with the same error type.
- Client code SHALL handle server function errors identically to local function errors. The serialization boundary SHALL be transparent to the developer.

---

### 19.10 SQL Transactions

#### 19.10.1 Explicit Transactions

SQL transactions are expressed using explicit `?{}` blocks:

```scrml
function transferFunds(from, to, amount)! -> TransferError {
    ?{BEGIN}
    let fromBalance = ?{`SELECT balance FROM accounts WHERE id = ${from}`}.get()
    if (fromBalance.balance < amount) {
        ?{ROLLBACK}
        fail TransferError::InsufficientFunds(fromBalance.balance)
    }
    ?{`UPDATE accounts SET balance = balance - ${amount} WHERE id = ${from}`}.run()
    ?{`UPDATE accounts SET balance = balance + ${amount} WHERE id = ${to}`}.run()
    ?{COMMIT}
}
```

#### 19.10.2 The `transaction` Block

The `transaction` keyword provides a scoped alternative that auto-rolls-back on `fail`:

```scrml
function transferFunds(from, to, amount)! -> TransferError {
    transaction {
        let fromBalance = ?{`SELECT balance FROM accounts WHERE id = ${from}`}.get()
        if (fromBalance.balance < amount) {
            fail TransferError::InsufficientFunds(fromBalance.balance)
            // transaction auto-rolls-back because fail exited the block
        }
        ?{`UPDATE accounts SET balance = balance - ${amount} WHERE id = ${from}`}.run()
        ?{`UPDATE accounts SET balance = balance + ${amount} WHERE id = ${to}`}.run()
        // transaction auto-commits if block completes without fail
    }
}
```

#### 19.10.3 Semantics

- `?{BEGIN}`, `?{COMMIT}`, `?{ROLLBACK}` are direct bun:sqlite passthrough (per project decision: SQL is bun:sqlite passthrough).
- `transaction { }` is syntactic sugar. The compiler SHALL emit `?{BEGIN}` at the start of the block, `?{COMMIT}` at the end of normal completion, and `?{ROLLBACK}` before any `fail` statement within the block.
- If a `fail` occurs inside a `transaction` block, the compiler SHALL insert a `?{ROLLBACK}` before the fail's return. The `fail` then returns the error variant to the caller.
- If a SQL error occurs inside a `transaction` block (and the function is `!`), the transaction is automatically rolled back before the SQL error is propagated.

#### 19.10.4 Normative Statements

- `transaction { }` SHALL be valid only inside `!` functions. Using `transaction` in a non-`!` function SHALL be a compile error (E-ERROR-001 applies -- `fail` inside the transaction requires `!`).
- The compiler SHALL guarantee that every `transaction` block either commits (on success) or rolls back (on `fail` or SQL error). No transaction SHALL be left open.
- `transaction` blocks SHALL NOT nest. A `transaction` inside another `transaction` SHALL be a compile error: **E-ERROR-007** -- `Nested 'transaction' blocks are not supported. Use savepoints via '?{SAVEPOINT name}' for nested transaction semantics.`
- Explicit `?{BEGIN}` / `?{COMMIT}` / `?{ROLLBACK}` SHALL remain valid for developers who need manual transaction control (e.g., savepoints, deferred transactions).

#### 19.10.5 Implicit Per-Handler Transactions

**Added:** 2026-04-14. Cross-reference: §8.9.2.

The compiler MAY synthesize an implicit transactional envelope around the body of a server handler that declares `!`, as specified in §8.9.2. This implicit envelope is distinct from the explicit `transaction { }` block (§19.10.2) and the explicit `?{BEGIN}/?{COMMIT}/?{ROLLBACK}` pattern (§19.10.1).

**Normative statements:**

- An implicit per-handler transaction SHALL apply only when two or more `?{}` queries in the handler form a coalescing candidate set (§8.9.1).
- An implicit per-handler transaction SHALL apply only inside `!` handlers. This preserves §19.10.4 (transactions require `!`).
- An implicit per-handler transaction SHALL NOT compose with an explicit `transaction { }` block in the same handler. The compiler SHALL emit **E-BATCH-001** when both are present.
- An explicit `?{BEGIN}` inside the handler suppresses the implicit envelope and emits **W-BATCH-001** advising the developer to use `transaction { }` or `.nobatch()` for clarity.
- Users MAY suppress the implicit envelope at a single query site with `.nobatch()` (§8.9.5).
- Nesting rules of §19.10.4 (E-ERROR-007) SHALL treat the implicit envelope as a transaction block for the purpose of detecting illegal nesting.

---

### 19.11 Interaction with @reactive

#### 19.11.1 Reactive Error State

Error values from `!` functions can be stored in reactive variables (§6):

```scrml
@error = not

${
    function handlePayment() {
        match processPayment(100, 42) {
            ::Ok(receipt) -> @receipt = receipt
            ::InvalidAmount(reason) -> @error = PaymentError::InvalidAmount(reason)
            ::CustomerNotFound(id) -> @error = PaymentError::CustomerNotFound(id)
            ::ExpiredCard -> @error = PaymentError::ExpiredCard
            ::NetworkError(detail) -> @error = PaymentError::NetworkError(detail)
        }
    }
}

<div if=@error>
    ${match @error {
        ::InvalidAmount(reason) -> lift <div class="validation-error">${reason}</>
        ::CustomerNotFound(_) -> lift <div class="error">Customer not found</>
        ::ExpiredCard -> lift <div class="error">Card expired</>
        ::NetworkError(detail) -> lift <div class="error">${detail}</>
        _ -> lift <div></>
    }}
</>
```

#### 19.11.2 Reactive Propagation Shorthand

When a reactive variable is assigned the result of a `?` propagation, the error is captured into the reactive variable:

```scrml
@paymentResult = not

${
    function attemptPayment() {
        @paymentResult = processPayment(100, 42)
        // @paymentResult holds either ::Ok(receipt) or an error variant
    }
}

< errorBoundary fallback={<div>Payment failed/}>
    <div if=@paymentResult>
        ${match @paymentResult {
            ::Ok(receipt) -> lift <div>Paid: ${receipt.id}</>
            _ -> lift <div></>
        }}
    </>
</>
```

#### 19.11.3 Normative Statements

- A reactive variable MAY hold an error variant value. The type of the reactive variable SHALL be inferred as the union of success and error types if assigned from a `!` function result.
- Reactive variables holding error values SHALL trigger reactive updates when the error value changes, following standard reactivity rules (§6).
- The `< errorBoundary>` SHALL catch errors from reactive variables that hold error variant values when those variables are interpolated in markup context.

---

### 19.12 Interaction with ~{} Tests

#### 19.12.1 Testing Failable Functions

The `~{}` test context (test context draft) provides assertions for testing `!` functions:

```scrml
~{ "payment error handling"
    test "rejects negative amount" {
        assert.fails processPayment(-1, 42)
    }

    test "rejects negative amount with specific variant" {
        assert.fails.with processPayment(-1, 42) ::InvalidAmount
    }

    test "succeeds for valid amount" {
        let result = processPayment(100, 42)
        assert result is ::Ok
    }
}
```

#### 19.12.2 `assert.fails`

`assert.fails` verifies that a `!` function call produces an error variant (any error variant).

**Compiled to (bun:test):** `expect(() => fn()).toMatchObject({ __ok: false })`

#### 19.12.3 `assert.fails.with`

`assert.fails.with` verifies that a `!` function call produces a specific error variant.

**Syntax:**

```
assert.fails.with expression ('.' | '::') VariantName
```

**Compiled to (bun:test):** `expect(() => fn()).toMatchObject({ __ok: false, __variant: "VariantName" })`

#### 19.12.4 Formal Grammar Additions

The test context grammar (test context draft, §2.5) SHALL be extended with:

```
assert-stmt   ::= ... (existing forms)
                 | 'assert.fails' call-expression
                 | 'assert.fails.with' call-expression ('.' | '::') VariantName
```

#### 19.12.5 Normative Statements

- `assert.fails` SHALL accept a call expression to a `!` function. Applying `assert.fails` to a non-`!` function call SHALL be a compile error (E-ERROR-004 applies -- the function is not failable).
- `assert.fails.with` SHALL verify both that the function fails AND that the error variant matches the specified variant name.
- `assert.fails` and `assert.fails.with` SHALL NOT propagate the error. They capture it for assertion purposes.

---

### 19.13 Error Codes

The following error codes are introduced by this section. They SHALL be added to §34 (Error Codes).

| Code | Section | Trigger | Severity |
|------|---------|---------|----------|
| E-ERROR-001 | §19.3.3 | `fail` used in non-`!` function | Error |
| E-ERROR-002 | §19.4.3 | `!` function result not handled (no match, `?`, `!{}`, or boundary) | Error |
| E-ERROR-003 | §19.5.4 | `?` propagation used in non-`!` function | Error |
| E-ERROR-004 | §19.5.4 | `?` applied to non-`!` function call | Error |
| E-ERROR-005 | §19.6.3 | Error variant in markup without `renders` clause or boundary `fallback` | Error |
| E-ERROR-006 | §19.2.3 | `renders` clause references undefined variable | Error |
| E-ERROR-007 | §19.10.4 | Nested `transaction` blocks | Error |

---

### 19.14 Worked Examples

#### 19.14.1 Payment Processing Flow

Full end-to-end payment processing with error handling at every level.

**Error type definition:**

```scrml
type PaymentError:enum = {
    InvalidAmount(reason: string)
        renders <div class="error field-error">
            <span class="icon">!</span> ${reason}
        </>
    CustomerNotFound(id: string)
        renders <div class="error not-found">
            <h3>Customer Not Found</>
            <p>No customer with ID ${id} exists in our records.</>
        </>
    ExpiredCard
        renders <div class="error card-error">
            <h3>Card Expired</>
            <p>Your card has expired. Please update your payment method.</>
            <button onclick=navigate("/settings/payment")>Update Payment</>
        </>
    NetworkError(detail: string)
        renders <div class="error network-error">
            <h3>Connection Issue</>
            <p>${detail}</>
            <button onclick=retry()>Try Again</>
        </>
    InsufficientFunds(available: number, requested: number)
        renders <div class="error funds-error">
            <p>Insufficient funds. Available: $${available}, Requested: $${requested}</>
        </>
}
```

**Server function:**

```scrml
${
    server function processPayment(amount, customerId)! -> PaymentError {
        if (amount <= 0) fail PaymentError::InvalidAmount("Amount must be positive")
        if (amount > 10000) fail PaymentError::InvalidAmount("Amount exceeds maximum")

        let customer = ?{`SELECT * FROM customers WHERE id = ${customerId}`}.get()
        if (!customer) fail PaymentError::CustomerNotFound(customerId)
        if (customer.cardExpiry < now()) fail PaymentError::ExpiredCard

        let balance = ?{`SELECT balance FROM accounts WHERE customerId = ${customerId}`}.get()
        if (balance.balance < amount) {
            fail PaymentError::InsufficientFunds(balance.balance, amount)
        }

        transaction {
            ?{`UPDATE accounts SET balance = balance - ${amount} WHERE customerId = ${customerId}`}.run()
            ?{`INSERT INTO transactions (customerId, amount, date) VALUES (${customerId}, ${amount}, ${now()})`}.run()
        }

        let txn = ?{`SELECT * FROM transactions WHERE customerId = ${customerId} ORDER BY date DESC LIMIT 1`}.get()
        txn
    }
}
```

**Markup with error boundary (auto-rendering via `renders` clauses):**

```scrml
<div class="payment-form">
    <h2>Process Payment</>
    < errorBoundary>
        ${
            @receipt = not
            function handleSubmit() {
                @receipt = processPayment(@amount, @customerId)
            }
        }
        <form onsubmit=handleSubmit()>
            <input type="number" bind:value=@amount>
            <button type="submit">Pay</>
        </>
        <div if=@receipt>
            match @receipt {
                ::Ok(txn) -> <div class="success">Payment ${txn.id} confirmed!</>
            }
        </>
    </>
</>
```

In this example, if `processPayment` fails with any `PaymentError` variant, the `< errorBoundary>` catches it and renders the variant's `renders` clause automatically. No explicit match of error variants is needed in the markup.

#### 19.14.2 Authentication Flow with Validation Errors

```scrml
type AuthError:enum = {
    InvalidEmail(email: string)
        renders <div class="field-error">Invalid email format: ${email}</>
    WeakPassword(requirements: string)
        renders <div class="field-error">${requirements}</>
    EmailTaken(email: string)
        renders <div class="field-error">${email} is already registered.</>
    ServerError(detail: string)
        renders <div class="error">Registration failed. Please try again later.</>
}

${
    server function register(email, password)! -> AuthError {
        if (!isValidEmail(email)) fail AuthError::InvalidEmail(email)
        if (password.length < 8) fail AuthError::WeakPassword("Password must be at least 8 characters")

        let existing = ?{`SELECT id FROM users WHERE email = ${email}`}.get()
        if (existing) fail AuthError::EmailTaken(email)

        transaction {
            ?{`INSERT INTO users (email, passwordHash) VALUES (${email}, ${hashPassword(password)})`}.run()
        }

        let user = ?{`SELECT * FROM users WHERE email = ${email}`}.get()
        user
    }
}

<div class="register-form">
    < errorBoundary>
        <form onsubmit=handleRegister()>
            <label>Email <input type="email" bind:value=@email></>
            <label>Password <input type="password" bind:value=@password></>
            <button type="submit">Register</>
        </>
    </>
</>
```

#### 19.14.3 CRUD with SQL Transaction Rollback

```scrml
type CrudError:enum = {
    NotFound(resource: string, id: string)
        renders <div class="error">${resource} with ID ${id} not found</>
    ConstraintFailed(field: string)
        renders <div class="error">Invalid value for ${field}</>
    ConcurrencyConflict
        renders <div class="error">This record was modified by another user. Please refresh.</>
}

${
    server function updateUserProfile(userId, updates)! -> CrudError {
        transaction {
            let current = ?{`SELECT * FROM users WHERE id = ${userId}`}.get()
            if (!current) fail CrudError::NotFound("User", userId)

            let version = ?{`SELECT version FROM users WHERE id = ${userId}`}.get()
            if (version.version !== updates.expectedVersion) {
                fail CrudError::ConcurrencyConflict
            }

            if (updates.email) {
                let emailCheck = ?{`SELECT id FROM users WHERE email = ${updates.email} AND id != ${userId}`}.get()
                if (emailCheck) fail CrudError::ConstraintFailed("email")
            }

            ?{`UPDATE users SET
                name = COALESCE(${updates.name}, name),
                email = COALESCE(${updates.email}, email),
                version = version + 1
                WHERE id = ${userId}`}.run()
        }

        let updated = ?{`SELECT * FROM users WHERE id = ${userId}`}.get()
        updated
    }
}
```

#### 19.14.4 Nested Error Boundaries in a Dashboard Layout

```scrml
type DashboardError:enum = {
    WidgetLoadFailed(widget: string, reason: string)
        renders <div class="widget-error">
            <p>Failed to load ${widget}</>
            <small>${reason}</>
            <button onclick=retryWidget(widget)>Retry</>
        </>
    DataStale(lastUpdate: string)
        renders <div class="stale-warning">
            <p>Data may be outdated. Last update: ${lastUpdate}</>
        </>
}

type AnalyticsError:enum = {
    QueryTimeout
        renders <div class="analytics-error">
            <p>Analytics query timed out. Dashboard is showing cached data.</>
        </>
    NoData(period: string)
        renders <div class="analytics-empty">
            <p>No data available for ${period}</>
        </>
}

<div class="dashboard">
    // Outer boundary catches page-level errors
    < errorBoundary fallback={<div class="page-error">Dashboard unavailable/}>
        <header>
            ${loadDashboardHeader()}
        </>

        <div class="widgets">
            // Each widget has its own boundary — one widget failure does not bring down the page
            < errorBoundary>
                <div class="widget revenue">
                    ${loadRevenueWidget()}
                </>
            </>

            < errorBoundary>
                <div class="widget users">
                    ${loadUsersWidget()}
                </>
            </>

            // Analytics section has its own error type
            < errorBoundary>
                <div class="widget analytics">
                    ${loadAnalytics(@selectedPeriod)}
                </>
            </>
        </>

        <footer>${loadDashboardFooter()}</>
    </>
</>
```

In this example:
- Each widget is wrapped in its own `< errorBoundary>`. If `loadRevenueWidget()` fails, only the revenue widget shows an error. The users widget and analytics widget remain functional.
- The outer boundary catches errors from `loadDashboardHeader()` and `loadDashboardFooter()`. If either fails, the entire page falls back to "Dashboard unavailable."
- Error variants with `renders` clauses display context-specific error UIs (retry buttons, explanatory text) without any explicit match handling in the template.

---

## Appendix A: Interaction Matrix

| Feature | Error System Interaction |
|---------|------------------------|
| `fail` keyword | Produces error variant value; requires `!` function |
| `?` operator | Propagates error to caller; requires `!` function |
| `!` signature | Declares function as failable; error type in signature |
| `renders` clause | Optional markup on enum variants; auto-displays in boundary |
| `< errorBoundary>` | Catches errors in markup; uses `renders` or `fallback` |
| `match` (§18) | Exhaustive over success + error variants in logic context |
| `?{}` SQL (§8) | Produces `SqlError` in `!` functions; null/empty outside |
| `@reactive` (§6) | Reactive variables can hold error variants; trigger updates |
| `~{}` tests | `assert.fails` / `assert.fails.with` for failable functions |
| `server` functions (§12) | CPS preserves `!`; errors serialize as tagged JSON |
| `transaction` | Auto-rollback on `fail`; syntactic sugar over BEGIN/COMMIT/ROLLBACK |
| `pure` (§33) | `pure` and `!` coexist; pure functions can fail without side effects |
| `lin` (§35) | `lin` variables inside `!` functions follow normal linear rules; `fail` is a scope exit that must consume `lin` variables |
| `< state>` types (§11) | `< errorBoundary>` is a pre-defined state type |

## Appendix B: Superseded Spec Text

This section replaces the entirety of §19 (Error Handling) as it existed in the 0.5.0-draft spec. Specifically:

- **§19.1 (Error Context `!{}`):** The `!{}` inline handler syntax is retained as one of the four valid handling modes for `!` function results (§19.4.3, option 3). The arm syntax `| ::ErrorTypeA e -> handlerA` is retained.
- **§19.2 (Error Propagation):** Replaced by explicit `?` operator (§19.5) and `!` function signatures (§19.4). Propagation is no longer "inferred by the compiler" -- it is explicit via `?`.
- **§19.3 (Throwing Errors):** `throw` is replaced by `fail`. SPEC-ISSUE-011 is resolved by this document.
- **§19.4 (Error Arm Syntax):** Retained within `!{}` inline handler and `match` expressions.

## Appendix C: Future Considerations

The following are explicitly out of scope for this version but noted for future work:

1. **Error type composition** -- Combining multiple error types into a unified error type (e.g., `type AppError = PaymentError | AuthError | SqlError`). This requires union-of-enum support in the type system.
2. **Error recovery / retry policies** -- Declarative retry logic on `< errorBoundary>` (e.g., `< errorBoundary retries=3 delay=1000>`).
3. **Error logging / telemetry hooks** -- Automatic error reporting to external services when errors are caught by boundaries.
4. **Async error streams** -- Error handling for long-lived connections (WebSocket, SSE) where errors arrive asynchronously.

## Appendix D: JS Standard Library Access in Logic Contexts

**Added:** 2026-04-08. Based on self-hosting gauntlet R1 friction — both teams independently relied on JS globals without spec coverage.

Inside `${}` logic blocks, the following JavaScript standard globals are available without import or `^{}` ceremony. These are provided by the Bun runtime and are part of the ECMAScript specification.

**Value types and constructors:**
`Array`, `Boolean`, `Date`, `Error`, `Map`, `Number`, `Object`, `Promise`, `RegExp`, `Set`, `String`, `Symbol`, `TypeError`, `RangeError`, `WeakMap`, `WeakSet`, `WeakRef`, `BigInt`, `ArrayBuffer`, `DataView`, `Float32Array`, `Float64Array`, `Int8Array`, `Int16Array`, `Int32Array`, `Uint8Array`, `Uint16Array`, `Uint32Array`

**Utility objects:**
`JSON` (`.stringify()`, `.parse()`), `Math`, `console`, `Intl`, `Reflect`, `Proxy`

**Global functions:**
`parseInt`, `parseFloat`, `isNaN`, `isFinite`, `encodeURI`, `decodeURI`, `encodeURIComponent`, `decodeURIComponent`, `structuredClone`, `queueMicrotask`, `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`

**Note:** `setTimeout`, `setInterval`, and `Promise` are available but their use inside `fn` bodies is prohibited by E-FN-005 (async/timing constraints). Use them in regular `function` bodies only.

Instance methods on these types (`.map()`, `.filter()`, `.has()`, `.get()`, `.set()`, `.push()`, `.slice()`, `.trim()`, `.startsWith()`, etc.) are available on any value of the corresponding type.

---

## Appendix E: `</>` Closer Migration Guide

**Added:** 2026-04-09. Records the migration from bare `/` and trailing `content/` closer forms to `</>`.

### Background

Prior to S80, scrml supported three closer forms:
1. Trailing-slash: `<tag>content/`
2. Explicit: `</tagname>`
3. Bare-slash (inferred): `/` on its own line or trailing content

After debate (score 55/60 vs 24/60), the trailing-slash and bare-slash forms were unified into the `</>` inferred closer token. The bare `/` no longer has syntactic significance as a block delimiter.

### Migration Rules

| Old form | New form | Notes |
|---|---|---|
| `<tag>content/` | `<tag>content</>` | Trailing slash becomes `</>` |
| `/` (bare, own line) | `</>` | Bare slash becomes `</>` |
| `</tagname>` | `</tagname>` | No change |
| `/>` | `/>` | No change — self-closing, not a closer |

### What Does NOT Change

- `/` inside `${ }`, `?{ }`, `#{ }`, `^{ }`, `~{ }` contexts — these are division operators, regex delimiters, or URL path components, not block closers
- `//` comments — unchanged
- `/>` self-closing void-element syntax — unchanged
- `</tagname>` explicit closers — unchanged

### Normative Basis

The `</>` form is specified in §4.4.2. The removal of bare `/` as a closer is authoritative as of this amendment. Any source file using bare `/` or trailing content`/` closers SHALL be rejected by the compiler with a diagnostic pointing to §4.4. The diagnostic SHALL include a hint: "Did you mean `</>`?"

---

## 20. Navigation API

### 20.1 `navigate()` Built-in

`navigate(path)` is a built-in function for navigating between pages.

- `path` — a developer-defined URL string. SHALL NOT be a compiler-internal route name.
- The compiler SHALL infer the navigation type from context:
  - If the calling function is client-side: `navigate(path)` compiles to a history push (soft navigation).
  - If the calling function is server-escalated: `navigate(path)` compiles to a 302 redirect (hard navigation).

### 20.2 Explicit Navigation Type

The developer MAY override the inferred navigation type:

```scrml
navigate(path, .Hard)   // always 302 redirect
navigate(path, .Soft)   // always history push
```

`.Hard` and `.Soft` are built-in enum variants of the navigation type.

### 20.3 Normative Statements (Navigation)

- `navigate(path)` SHALL be valid inside any function in any context.
- The navigation type SHALL be inferred from the function's server/client classification unless explicitly overridden.
- Calling `navigate(path, .Hard)` from a client-side function SHALL cause the compiler to emit a server redirect. The compiler SHALL escalate the calling function to a server route if necessary, or emit a warning if the escalation is not possible (W-NAV-001).

### 20.4 Route Parameters

scrml files that serve as pages receive URL parameters through a built-in `route`
object. The `route` object is available in the top-level scope of any `.scrml`
file compiled as a page.

**Syntax (developer writes):**

```scrml
${ let userId = route.params.id }
```

`route` is a compiler-provided scope binding. The developer SHALL NOT declare a
variable named `route` at the top level of a scrml page (E-SCOPE-010: reserved
scope binding).

**The `route` object shape:**

```
route.params        // object — URL path parameters (e.g., /users/:id -> route.params.id)
route.query         // object — query string parameters (e.g., ?tab=settings -> route.query.tab)
route.path          // string — the current URL path (e.g., "/users/42")
```

Parameter values accessed via `route.params` and `route.query` are always typed
`string` (URL parameters are strings by nature). The developer is responsible for
parsing numeric IDs (e.g., `let id = parseInt(route.params.id)`).

**Normative statements:**

- The compiler SHALL inject `route` as a built-in scope binding in every `.scrml`
  file compiled as a page. It SHALL NOT be available in files compiled as
  pure-type or component-only modules (§21.3).
- `route.params` SHALL expose named path parameters derived from the file's
  position in the routing tree (§12). The exact parameter names are determined by
  the Route Inference pass (§12).
- `route.query` SHALL expose all query string key-value pairs present in the
  request URL.
- All values on `route.params` and `route.query` SHALL have type `string`.
- A top-level declaration `let route = ...` or `const route = ...` or
  `@route = ...` in a scrml page SHALL be a compile error (E-SCOPE-010).
- Accessing a path parameter that is not defined by the route pattern SHALL be a
  compile error (E-SCOPE-011: unknown route parameter).

**Worked example — valid:**

```scrml
${ let userId = route.params.id }
< db src="db.sql" tables="users">
    ${ server function loadProfile() {
        let user = ?{`SELECT name, avatar FROM users WHERE id = ${userId}`}.get()
        lift <div>
            <img src=user.avatar>
            <h1>${user.name}</>
        </>
    } }
    ${ loadProfile() }
</>
```

**Worked example — invalid (reserved binding):**

```scrml
let route = { params: {} }   // Error E-SCOPE-010
```

Error E-SCOPE-010: `route` is a reserved compiler scope binding and cannot be
declared as a variable.

### 20.5 Session Context

A built-in `session` object is available inside server-escalated functions. It
provides access to the authenticated session for the current request.

**Syntax (developer writes):**

```scrml
${ server function getProfile() {
    let currentUser = session.userId
} }
```

`session` is a compiler-provided scope binding available only inside
server-escalated function bodies.

**The `session` object shape:**

```
session.userId      // string | not — authenticated user ID, not if not logged in
session.isAuth      // boolean �� true if the user is authenticated
session.get(key)    // any — retrieve a custom session value by key
session.set(key, v) // void — store a custom session value
```

**Normative statements:**

- `session` SHALL be available only inside server-escalated function bodies. The
  compiler SHALL inject it as a scope binding at server function scope entry.
- Accessing `session` in a client-side function body SHALL be a compile error
  (E-SCOPE-012: `session` is not available in client-side functions; the function
  must be server-escalated).
- `session.userId` SHALL have type `string | not`. The value is `not` when no
  authenticated session exists.
- `session.isAuth` SHALL have type `boolean`.
- `session.get(key)` and `session.set(key, v)` are built-in methods for arbitrary
  session storage. `get` returns `asIs`; the developer must narrow the type before
  use.
- The compiler SHALL generate the session infrastructure (session middleware,
  cookie management, server-side session store) automatically. The developer SHALL
  NOT write session middleware in scrml source.
- A top-level `let session = ...` declaration SHALL be a compile error (E-SCOPE-010).

**Worked example — valid:**

```scrml
${ server function checkAuth() {
    if (!session.isAuth) {
        navigate("/login")
    }
    let uid = session.userId   // string | not, narrowed by isAuth check above
} }
```

**Worked example — invalid (session in client function):**

```scrml
${ function getUser() {
    let uid = session.userId   // Error E-SCOPE-012
} }
```

Error E-SCOPE-012: `session` is not available in client-side functions. Add the
`server` annotation: `server function getUser()`.

**Error codes:**

| Code | Trigger | Severity |
|---|---|---|
| E-SCOPE-010 | Developer declares a variable with a reserved binding name (`route`, `session`) | Error |
| E-SCOPE-011 | Access to an undeclared route parameter name | Error |
| E-SCOPE-012 | `session` accessed inside a non-server-escalated function | Error |

---

## 21. Module and Import System

### 21.1 Overview

scrml files MAY export and import types, components, and functions. The module
system uses ES module syntax (`import`/`export`) with scrml-specific constraints
on what can cross file boundaries.

### 21.2 Export Syntax

Exports are declared inside a logic context using the `export` keyword:

```scrml
${ export type UserRole:enum = { Admin, Moderator, User, Banned } }
${ export type Config:struct = { timeout: number, retries: number } }
${ export function formatDate(ts) { ... } }
```

A component definition MAY be exported by placing `export` before `const`:

```scrml
export const UserCard = <div props={ name: string, role: UserRole }>
    ...
</>
```

**Normative statements:**

- The `export` keyword SHALL be valid before `type`, `function`, `fn`, `const`
  (component), and `let`/`const` (value) declarations inside a logic context.
- `export` at the top level of a scrml page (outside a `${ }` context) SHALL be
  a compile error (E-IMPORT-001: export must appear inside a `${ }` logic context
  or before a component `const`).
- A file with no markup and no CSS (only `${ export ... }` blocks) is a
  **type/module file**. It SHALL produce no HTML or CSS output — only a JS module
  with exported bindings. The compiler SHALL recognize this pattern automatically;
  no special file extension or pragma is required.

### 21.3 Import Syntax

Imports use ES module `import` syntax inside a `${ }` logic context:

```scrml
${ import { UserRole } from './types.scrml' }
${ import { formatDate } from './utils.scrml' }
${ import { UserCard } from './components/user-card.scrml' }
```

Imports from plain `.js` files are also valid and follow standard ES module
semantics:

```scrml
${ import { helper } from './helper.js' }
```

**Normative statements:**

- `import` SHALL be valid inside a `${ }` logic context at the top level of a
  scrml file. Imports inside function bodies SHALL be a compile error (E-IMPORT-003:
  imports must be at file top level).
- Named imports (`{ name }`) and default imports (`name`) from `.scrml` files SHALL
  be resolved by the compiler against the exporting file's export list.
- Importing a name that is not exported by the target file SHALL be a compile error
  (E-IMPORT-004: `Name` is not exported by `./file.scrml`).
- Circular imports SHALL be a compile error (E-IMPORT-002). The compiler SHALL
  detect cycles in the import graph before any stage runs and report all files in
  the cycle.
- Type imports are first-class: a `type` exported from one file and imported in
  another IS usable as a type annotation, prop type, and in `match` expressions in
  the importing file.
- Component imports bring the component name into scope for use in markup: after
  `import { UserCard } from './user-card.scrml'`, `<UserCard ...>` is valid markup
  in the importing file.
- Import order within a file does not affect compilation. The compiler resolves all
  imports before running any per-file passes.

### 21.4 Re-export

A file MAY re-export bindings from another file:

```scrml
${ export { UserRole } from './types.scrml' }
```

Re-export follows standard ES module `export { name } from 'source'` syntax.

### 21.5 Pure-Type Files

A `.scrml` file that contains only `${ export type ... }` and `${ export function ... }`
blocks (no markup, no CSS) is a **pure-type file**. The compiler SHALL:

- Produce no HTML output for this file.
- Produce no CSS output for this file.
- Produce a JS module with the exported bindings as its sole output.
- NOT register this file as a page route. Pure-type files are library files, not
  pages.

Pure-type files are identified by the absence of any markup or CSS content after
the preprocessor pass. No pragma or special declaration is required.

### 21.6 Error Codes

| Code | Trigger | Severity |
|---|---|---|
| E-IMPORT-001 | `export` used outside a `${ }` context or component `const` | Error |
| E-IMPORT-002 | Circular import detected | Error |
| E-IMPORT-003 | `import` inside a function body (not file top-level) | Error |
| E-IMPORT-004 | Imported name not found in target file's exports | Error |

---

## 22. Metaprogramming

### 22.1 Overview

scrml supports metaprogramming through the `^{}` meta context. The meta context provides a
universal breakout mechanism that captures and exposes all bindings from the breakout point.
Meta contexts enable compile-time code generation, runtime DOM inspection, and runtime
reactive effects with type introspection.

Type reflection is exposed through the single `reflect()` call, which accepts either a
compile-time-constant type name or a runtime variable holding a type name. The compiler
selects the appropriate resolution strategy automatically (§22.4.2). Programmers always write
`reflect(expr)` regardless of whether the argument is statically known.

Meta blocks are classified as either compile-time or runtime by the compiler's meta-checker
pass. The classification determines which capabilities are available and what code is emitted.

### 22.2 The `^{}` Meta Context

**Syntax:**

```
meta-block ::= '^{' meta-body '}'
meta-body  ::= (any sequence of scrml statements and expressions)
```

The `^{}` sigil opens a meta context. Code inside `^{}` has access to compiler internals at
compile time or to a runtime `meta` API object at runtime. Which mode applies is determined
by the compiler's dependency analysis (§22.4).

### 22.3 Context Preservation

A `^{}` block preserves all bindings from its breakout point. Variables, types, and reactive
state that are in scope where `^{}` appears are accessible inside the meta block.

**Normative statements:**

- A `^{}` meta context SHALL have access to all `let`, `const`, `lin`, and `@var` bindings
  that are lexically in scope at the point where `^{}` appears.
- A `^{}` meta context SHALL have access to the type registry, including all user-declared
  types and compiler-synthesized types (e.g., §14.8 generated table types).
- A `^{}` meta context SHALL have access to the encoded variable name registry (see ADR-001).
- The mechanism by which access is provided SHALL differ between compile-time and runtime
  meta (see §22.4 and §22.5 respectively). Both modes SHALL satisfy the access guarantees
  stated above.

### 22.4 Compile-Time Meta

A `^{}` block is classified as compile-time when its body contains one or more of the
following API patterns and references no runtime-only values:

- `reflect(TypeName)` calls
- `emit(...)` calls
- `emit.raw(...)` calls
- `compiler.*` API calls
- `bun.eval(...)` calls

The compiler SHALL evaluate compile-time meta blocks during compilation and inline the result.
Compile-time meta blocks have access to the full compiler-internal type registry and AST via
the `compiler.*` API. Phase-separation rules (§22.8) apply to compile-time meta.

#### 22.4.1 Emit Escape-Sequence Semantics

`emit(html)` and `emit.raw(html)` differ only in whether the string argument is normalized
before it is passed to the block splitter.

**`emit(html)` — normalized (default)**

The compiler SHALL apply the following escape-sequence normalization to the `html` argument
before passing it to the block splitter:

| Escape sequence | Normalized to |
|---|---|
| `\\n` | U+000A LINE FEED (newline) |
| `\\"` | U+0022 QUOTATION MARK (`"`) |
| `\\t` | U+0009 CHARACTER TABULATION (tab) |
| `\\\\` | U+005C REVERSE SOLIDUS (`\\`) |

Normalization is applied in the order shown. The two-character sequence `\\\\` (a serialized
double-backslash) is protected before `\\n` expansion so that a literal `\\` followed by
the letter `n` in source does not become a newline.

**`emit.raw(html)` — verbatim (no normalization)**

The compiler SHALL pass the `html` argument to the block splitter verbatim, without any
escape-sequence normalization.

**Normative statements:**

- `emit(html)` SHALL normalize escape sequences as specified in the table above before the
  string is passed to the block splitter and AST builder.
- `emit.raw(html)` SHALL NOT apply any escape-sequence normalization. The string SHALL be
  passed to the block splitter exactly as provided.
- Both `emit(html)` and `emit.raw(html)` output SHALL pass through the block splitter and
  AST builder. Only escape normalization differs between the two forms; all subsequent
  pipeline stages treat them identically.
- If a string passed to `emit.raw(html)` contains no real newline characters (U+000A), the
  block splitter SHALL treat the entire string as a single line. This is intentional: the
  developer has opted out of normalization and accepted responsibility for block-splitter
  line-boundary detection.
- `emit.raw(html)` is the designated resolution for BUG-R15-005 (`\\n` literal in emit()
  HTML). A developer who needs a literal backslash-n in emitted markup SHALL use
  `emit.raw()` instead of `emit()`.

**Worked examples:**

*Valid — emit() with escape sequences:*

```scrml
^{
  emit("<p>Line 1\\nLine 2</p>")
}
```

Expected: the block splitter receives `<p>Line 1\nLine 2</p>` (with a real newline at
the `\n` position), producing two lines for parsing.

*Valid — emit.raw() preserving literal backslash-n:*

```scrml
^{
  emit.raw("<pre>literal\\nbackslash-n</pre>")
}
```

Expected: the block splitter receives `<pre>literal\\nbackslash-n</pre>` verbatim — no
newline is injected. The entire string is treated as one line. The rendered output contains
the two-character sequence `\n`, not a newline.

*Logical error — using emit() when literal backslash is intended:*

```scrml
^{
  emit("<pre>regex: \\n+</pre>")
}
```

Not a compiler error, but a logical error: `emit()` normalizes `\\n` to a real newline.
The developer SHALL use `emit.raw()` when a literal `\n` sequence is required in output.

**Interaction notes:**

- `emit.raw()` is a compile-time API pattern. A `^{}` block that uses only `emit.raw(...)`
  and references no runtime-only values is classified as compile-time (§22.4).
- `emit.raw()` has no runtime counterpart on the `meta` API object (see §22.5.1).
  The runtime meta system does not perform escape normalization; runtime `meta.emit(html)`
  always passes its string argument verbatim to the DOM insertion point. The compile-time
  `emit()` / `emit.raw()` distinction exists only in the compile-time meta evaluation
  layer (`reparseEmitted()` in meta-eval.ts).

#### 22.4.2 Hybrid `reflect()` Resolution Algorithm

`reflect()` is the single, unified API for type reflection in scrml. The programmer always
writes `reflect(expr)` regardless of whether the argument is known at compile time or only at
runtime. The compiler resolves which strategy to use based on the nature of the argument.

**The two resolution strategies:**

| Argument kind | Compiler strategy | Cost |
|---|---|---|
| Compile-time constant (`reflect(User)` or `reflect("User")` where `"User"` is a literal) | Direct registry lookup inlined at compile time | Zero runtime cost |
| Runtime variable (`reflect(typeName)` where `typeName` is a `let`, `const`, or `@var` binding) | `meta.types.reflect(typeName)` call emitted; type registry passed as fourth arg to `_scrml_meta_effect` | One hash-table lookup per call |

**Resolution algorithm (normative):**

Given a call `reflect(expr)` inside a `^{}` block:

1. If `expr` is a type-name literal (an unquoted identifier that resolves to a known type,
   e.g., `reflect(User)`) or a string literal that exactly matches a known type name
   (e.g., `reflect("User")`), the compiler SHALL resolve it at compile time and inline the
   type entry. This is the compile-time path.
2. If `expr` is a variable reference (a `let`, `const`, `lin`, or `@var` binding), the
   compiler SHALL emit `meta.types.reflect(expr)` in the compiled output and include all
   types that are in scope at the breakout point in the runtime type registry. This is the
   runtime path.
3. If `expr` is any other expression (property access, function call, ternary, template
   literal, etc.), the compiler SHALL treat it as a runtime path expression (strategy 2).
4. A `reflect(expr)` call that appears outside any `^{}` block SHALL be a compile error
   (E-META-008).

**Normative statements:**

- The compiler SHALL accept `reflect(expr)` as the single canonical reflect call form at all
  `^{}` call sites. The programmer SHALL NOT be required to choose between `reflect()` and
  `meta.types.reflect()` based on whether the argument is static or dynamic.
- When `reflect(expr)` resolves via the compile-time path (strategy 1), the compiler SHALL
  inline the type entry as a compile-time value. No `meta.types` lookup is emitted.
- When `reflect(expr)` resolves via the runtime path (strategy 2 or 3), the compiler SHALL
  emit `meta.types.reflect(<compiledExpr>)` in the compiled JavaScript output.
- The compiler SHALL NOT require the `^{}` block to be classified as compile-time merely
  because it contains a compile-time-path `reflect()` call. A block that also references
  runtime values is a runtime block; its `reflect()` calls that happen to have literal
  arguments are still emitted as `meta.types.reflect(...)` calls in the runtime block output.
  The inlining optimization (strategy 1) applies only when the ENTIRE block is compile-time.
- `reflect(unknownLiteral)` where the literal does not match any known type name SHALL be a
  compile error (E-META-003: reflect() called on unknown type).
- `reflect(variable)` where `variable` could hold an unknown type name at runtime SHALL
  return `not` (the scrml absence value, §42) at runtime. The runtime path SHALL NOT throw.
- `meta.types.reflect()` remains available as a lower-level escape hatch for programmers
  who need to explicitly force runtime dispatch. It is not the canonical form.

**Worked example — compile-time path (literal argument):**

```scrml
type User:struct = {
  name: string
  age:  number
}

^{
  const info = reflect(User)
  emit(`<p>Type has ${info.fields.length} fields</p>`)
}
```

The argument `User` is a type-name literal. The compiler resolves at compile time. No type
registry is emitted for this block. Emitted (simplified):

```javascript
// No _scrml_meta_effect — compile-time block, result inlined
document.body.insertAdjacentHTML("beforeend", "<p>Type has 2 fields</p>");
```

**Worked example — runtime path (variable argument):**

```scrml
type User:struct = {
  name: string
  age:  number
}

@selectedType = "User"

^{
  const info = reflect(@selectedType)
  if info is not {
    meta.emit("<p>Unknown type</p>")
  } else {
    meta.emit(`<p>${info.fields.length} fields</p>`)
  }
}
```

The argument `@selectedType` is a runtime variable. The compiler emits the runtime path.
Emitted (simplified):

```javascript
const _scrml_types_meta_1 = {
  User: { kind: "struct", fields: [{ name: "name", type: "string" }, { name: "age", type: "number" }] }
};

_scrml_meta_effect(
  "_scrml_meta_1",
  function(meta) {
    const info = meta.types.reflect(meta.get("_scrml_s_selectedType"));
    if (info === _scrml_not) {
      meta.emit("<p>Unknown type</p>");
    } else {
      meta.emit(`<p>${info.fields.length} fields</p>`);
    }
  },
  Object.freeze({ get selectedType() { return _scrml_reactive_get("_scrml_s_selectedType"); } }),
  _scrml_types_meta_1
);
```

**Worked example — invalid (outside `^{}`):**

```scrml
const info = reflect(User)   // Error: reflect() outside ^{} block
```

Compiler error E-META-008: `reflect()` is only valid inside a `^{}` meta block.

### 22.5 Runtime Meta

A `^{}` block is classified as runtime when it contains no compile-time API patterns (§22.4)
or when it references values that are only known at runtime.

The compiler SHALL emit a runtime meta block as a call to `_scrml_meta_effect`. The emitted
call SHALL pass all four of the following arguments:

1. A stable scope identifier string
2. The effect body function
3. A captured-bindings object (see §22.5.2)
4. A runtime type registry object (see §22.5.4)

**Emitted JavaScript shape:**

```javascript
_scrml_meta_effect(
  scopeId,           // string — stable, unique per meta block
  function(meta) {   // effect body; receives the meta API object
    // compiled body here
  },
  capturedBindings,  // frozen object — all lexical bindings at breakout point
  typeRegistry       // object — runtime-accessible type reflection data
);
```

The runtime SHALL accept this four-argument form. The runtime template function signature
SHALL be:

```javascript
function _scrml_meta_effect(scopeId, fn, capturedBindings, typeRegistry)
```

The `capturedBindings` and `typeRegistry` arguments are OPTIONAL in the runtime function
signature only to preserve backward compatibility with existing compiled output. When both
are absent, behavior is identical to the pre-Option-D implementation. New compilations SHALL
always pass all four arguments.

#### 22.5.1 The `meta` API Object

The runtime SHALL construct a `meta` object and pass it to the effect function on every run.
The `meta` object SHALL expose the following properties and methods:

| Member | Type | Description |
|---|---|---|
| `meta.get(varName)` | `(string) => any` | Read a reactive `@variable` by name. Establishes a reactive dependency — the effect re-runs when this variable changes. |
| `meta.set(varName, value)` | `(string, any) => void` | Write a reactive `@variable` by name. Triggers re-runs of all effects that depend on that variable. |
| `meta.subscribe(varName, callback)` | `(string, fn) => unsubscribe` | Subscribe to changes of a reactive variable. Returns an unsubscribe function. |
| `meta.emit(html)` | `(string) => void` | Emit an HTML string into the DOM at this meta block's scope ID. The string is subject to escape-sequence normalization (see §22.4.1). |
| `meta.emit.raw(html)` | `(string) => void` | Emit an HTML string into the DOM at this meta block's scope ID, bypassing escape-sequence normalization. Use when the emitted string contains intentional literal backslashes. Compile-time only — has no runtime counterpart (see §22.4.1). |
| `meta.cleanup(callback)` | `(fn) => void` | Register a cleanup function. Cleanup runs before each re-run and on scope destroy (LIFO order). |
| `meta.scopeId` | `string` | The stable scope identifier for this meta block. |
| `meta.bindings` | `Readonly<object>` | Frozen object containing all captured lexical bindings (see §22.5.2). |
| `meta.types` | `object` | Runtime type registry accessor (see §22.5.4). |

**Normative statements:**

- The `meta` object SHALL be constructed fresh on each run of the effect.
- `meta.get`, `meta.set`, `meta.subscribe`, `meta.emit`, `meta.cleanup`, and `meta.scopeId`
  SHALL be present on every `meta` object regardless of whether `capturedBindings` or
  `typeRegistry` were passed to `_scrml_meta_effect`.
- `meta.emit.raw` is a compile-time-only API. The runtime `meta` object SHALL NOT expose
  `meta.emit.raw`. If a `^{}` block containing `emit.raw(...)` is incorrectly classified
  as runtime meta, the compiler SHALL emit E-META-005 (compile-time/runtime pattern mix)
  rather than emitting a `meta.emit.raw` call into the runtime output.
- `meta.bindings` SHALL be present when `capturedBindings` was passed; if not passed, the
  runtime MAY omit `meta.bindings` or expose an empty frozen object.
- `meta.types` SHALL be present when `typeRegistry` was passed; if not passed, the runtime
  MAY omit `meta.types` or expose an object where `meta.types.reflect()` always returns `not`.

#### 22.5.2 Captured Bindings

The compiler SHALL construct a captured-bindings object containing the current values of all
lexical bindings that are in scope at the `^{}` breakout point.

**Which bindings are captured:**

- All `let` declarations in lexical scope at the breakout point
- All `const` declarations in lexical scope at the breakout point
- All `lin` declarations in lexical scope at the breakout point (see §22.5.3 for `lin`
  interaction rules)
- All `@var` reactive variables in scope at the breakout point

**Capture semantics by binding kind:**

| Kind | Capture mode | `meta.bindings.name` reads |
|---|---|---|
| `const` | By value at the moment of effect run | The constant's value at run time |
| `let` | By value at the moment of effect run | The `let` variable's value at run time |
| `lin` | By value at the moment of effect run | The `lin` variable's value (see §22.5.3) |
| `@var` | By reference (reactive) | The current reactive value, equivalent to `meta.get("varName")` |

**Normative statements:**

- The compiler SHALL emit `capturedBindings` as an object literal whose keys are the
  original source names of captured bindings (not encoded names).
- `meta.bindings` SHALL be frozen via `Object.freeze` before being exposed on the `meta`
  object.
- Writing to `meta.bindings` directly SHALL throw a `TypeError` (standard frozen-object
  behavior). The compiler SHALL NOT emit code that writes to `meta.bindings`.
- For `@var` bindings: `meta.bindings.varName` SHALL return the same value as
  `meta.get("varName")` at the moment of access. The `meta.bindings` object is frozen but
  `@var` values are reactive; reading `meta.bindings.varName` for a reactive variable reads
  the live reactive value through a getter, not a snapshotted copy.
- For non-`@var` bindings: `meta.bindings.varName` SHALL return the value that was current
  when the effect function was invoked for this run.

**Emitted JavaScript example — captured bindings:**

```javascript
let _scrml_v_localVar = "x";
// @count maps to encoded name _scrml_s_count

_scrml_meta_effect(
  "_scrml_meta_1",
  function(meta) {
    // body
  },
  Object.freeze({
    localVar: _scrml_v_localVar,
    get count() { return _scrml_reactive_get("_scrml_s_count"); }
  }),
  typeRegistry
);
```

Note: `@var` bindings use a getter on the frozen object to provide live reactive access while
maintaining the frozen structure. Non-reactive bindings are captured as plain values.

**Scope boundary:** The captured bindings object reflects the lexical scope at the `^{}`
breakout point only. Bindings that enter scope inside the `^{}` body (local variables
declared within the meta block) are NOT included in `meta.bindings`.

#### 22.5.3 `lin` Variables and Captured Bindings

A `lin` variable (§35) is consumed exactly once. Capturing a `lin` variable in a
`meta.bindings` object counts as a consumption of that `lin` variable.

**Normative statements:**

- If a `lin` variable is in scope at a `^{}` breakout point, the compiler SHALL count the
  `^{}` block as one consumption of that `lin` variable.
- A `lin` variable that is captured in `meta.bindings` SHALL NOT be used again after the
  `^{}` block (E-LIN-001 applies).
- A `lin` variable that is captured in `meta.bindings` inside a conditional branch SHALL be
  treated as consumed on that branch. The compiler SHALL require that all control-flow paths
  either (a) all capture the `lin` variable or (b) none capture it. A `lin` variable
  captured on only one branch of an `if`/`else` is a compile error (E-LIN-003).

#### 22.5.4 Runtime Type Registry

The compiler SHALL emit type registry data as the fourth argument to `_scrml_meta_effect` for
all types that are in scope at any runtime `^{}` breakout point.

**Emitted JavaScript shape of `typeRegistry`:**

```javascript
{
  TypeName: {
    kind: "struct" | "enum" | "union",
    fields: [          // present when kind === "struct"
      { name: "fieldName", type: "TypeName" | primitive },
      ...
    ],
    variants: [        // present when kind === "enum"
      { name: "VariantName" },
      ...
    ]
  },
  ...
}
```

The shape of each type entry SHALL be identical to what `reflect(TypeName)` produces in
compile-time meta (§22.4).

**The `meta.types` API:**

- `meta.types.reflect(TypeName: string)` — Returns the reflection entry for `TypeName` if it
  is present in the registry. Returns `not` (the scrml unit/absence value §42, not JavaScript
  `null` or `undefined`) if `TypeName` is not found.
- `meta.types.reflect(TypeName)` SHALL be callable with any string. Unknown names SHALL
  return `not`, not throw.

**Normative statements:**

- The compiler SHALL include in the runtime type registry all types that are in scope at the
  `^{}` breakout point.
- Types that are not in scope at any `^{}` breakout point in the compiled program MAY be
  omitted from the runtime type registry (tree-shaking permitted).
- `meta.types.reflect(unknownType)` SHALL return `not`.
- `meta.types.reflect(knownType)` SHALL return an object matching the shape above.
- The runtime SHALL NOT mutate the `typeRegistry` object passed to `_scrml_meta_effect`.

**Worked example — type introspection at runtime:**

```scrml
type User:struct = {
  name: string
  age:  number
}

@selectedType = "User"

^{
  const info = meta.types.reflect(meta.get("selectedType"))
  if info is not {
    // type not found
  } else {
    for field of info.fields {
      meta.emit(`<div>${field.name}: ${field.type}</div>`)
    }
  }
}
```

Emitted (simplified):

```javascript
const _scrml_typeRegistry_meta1 = {
  User: {
    kind: "struct",
    fields: [
      { name: "name", type: "string" },
      { name: "age",  type: "number" }
    ]
  }
};

_scrml_meta_effect(
  "_scrml_meta_1",
  function(meta) {
    const info = meta.types.reflect(meta.get("_scrml_s_selectedType"));
    if (info === _scrml_not) {
      // type not found
    } else {
      for (const field of info.fields) {
        meta.emit(`<div>${field.name}: ${field.type}</div>`);
      }
    }
  },
  Object.freeze({ get selectedType() { return _scrml_reactive_get("_scrml_s_selectedType"); } }),
  _scrml_typeRegistry_meta1
);
```

**Note on programmer-facing API:** The scrml source above uses `meta.types.reflect(...)` to
show the emitted form explicitly. In normal scrml source, programmers write `reflect(expr)`
(§22.4.2) and the compiler emits `meta.types.reflect(...)` automatically for variable
arguments. Programmers never write `meta.types.reflect()` directly; that is the compiled
output form, not the source form.

#### 22.5.5 Reactive Dependency Tracking and `meta.bindings`

Reading `meta.bindings.varName` for an `@var` binding SHALL establish a reactive dependency,
identical to calling `meta.get("varName")` directly. The effect SHALL re-run when the
underlying reactive variable changes, regardless of whether the value was read via
`meta.bindings.varName` or `meta.get("varName")`.

**Normative statement:**

- The compiler SHALL emit `@var` captured bindings as getters on the frozen bindings object.
  The getter SHALL delegate to `_scrml_reactive_get` (or equivalent) so that auto-tracking
  infrastructure intercepts the read.

### 22.6 Dependency Graph Tracking for Runtime Meta

The dependency graph pass (DG pass) SHALL recognize `@variable` references that appear inside
`^{}` runtime meta block bodies.

**Normative statements:**

- The DG pass SHALL recursively descend into AST nodes of kind `"meta"` when sweeping for
  `@variable` references.
- An `@variable` that is declared elsewhere in the program and read inside a `^{}` runtime
  meta block SHALL be considered consumed for the purposes of E-DG-002 detection.
- The compiler SHALL NOT emit E-DG-002 for an `@variable` that is read exclusively inside
  one or more `^{}` runtime meta blocks.

### 22.7 Runtime Meta Guard

A `^{}` block that requires runtime meta capabilities SHALL be valid only when the compiler
setting `meta.runtime` is `true` (default: `true`). If `meta.runtime` is `false` and a
`^{}` block requires runtime evaluation, this SHALL be a compile error (E-META-001).

**Normative statement:**

- E-META-001 SHALL fire when a runtime `^{}` block is present and `meta.runtime` is `false`.

### 22.8 Phase Separation

Compile-time meta (§22.4) executes during the compilation pass. Runtime meta (§22.5)
executes at program run time. These phases SHALL NOT be mixed in a single `^{}` block.

**Normative statements:**

- A `^{}` block SHALL NOT reference both compile-time API patterns (e.g., `reflect()`,
  `compiler.*`) and runtime-only values in the same block.
- The compiler SHALL reject any `^{}` block that mixes compile-time and runtime access
  patterns (E-META-005).
- `reflect(expr)` is the single programmer-facing API for type reflection. The compiler
  resolves `reflect(expr)` to either a compile-time inline (when `expr` is a literal) or a
  `meta.types.reflect(expr)` call (when `expr` is a runtime variable), per §22.4.2.
  Programmers SHALL NOT be required to choose between `reflect()` and `meta.types.reflect()`
  at the call site; the compiler makes that choice.
- `meta.types.reflect()` remains accessible as a low-level escape hatch for explicit runtime
  dispatch. Its direct use in scrml source is not prohibited but is not the canonical form.

### 22.9 Interaction with Other Features

**Normative statements:**

- `^{}` blocks MAY contain `match` expressions (§18.9).
- `^{}` blocks MAY read `@` reactive variables. In runtime meta, reads via `meta.get()` or
  via `meta.bindings.varName` (for captured `@var` bindings) both establish reactive
  dependencies and trigger re-runs on change.
- `^{}` blocks SHALL NOT contain `lift` calls. `lift` is a markup-context operation; meta
  is not markup context. (E-META-006)
- `^{}` blocks MAY contain `?{}` SQL contexts only when the meta block is compile-time
  evaluated. A `?{}` inside a runtime `^{}` block SHALL be a compile error (E-META-007).
- `^{}` SHALL be a valid context type recognized by the block splitter.
- `^{}` blocks SHALL be processed after the preprocessor pass and before code generation.
- The compiler SHALL determine whether each `^{}` block is compile-time or runtime based on
  its dependency analysis (§22.4).

### 22.10 Codegen Contract

The compiler's codegen pass SHALL produce the following structure for every runtime `^{}`
block:

```
_scrml_meta_effect(
  <scopeId>,
  function(meta) {
    <body>
  },
  <capturedBindings>,
  <typeRegistry>
)
```

Where:

- `<scopeId>` is a string literal of the form `"_scrml_meta_N"` where N is a stable
  integer assigned during the codegen pass. The same `^{}` block SHALL produce the same
  scope ID across compilations of the same source file (deterministic assignment).
- `<body>` is the compiled form of the meta block's statements, indented by two spaces.
- `<capturedBindings>` is `Object.freeze({...})` where `...` contains:
  - A plain property for each `const`, `let`, and `lin` binding:
    `bindingName: <encodedVarName>`
  - A getter for each `@var` binding:
    `get bindingName() { return _scrml_reactive_get("<encodedAtVarName>"); }`
- `<typeRegistry>` is an object literal declared as a `const` before the
  `_scrml_meta_effect` call (to avoid constructing it inline on every re-run). The variable
  SHALL be named `_scrml_types_meta_N` where N matches the scope ID integer.

**Normative statement on type registry hoisting:**

- The compiler SHALL emit the type registry as a hoisted `const` outside the enclosing
  reactive scope, not inline inside the `_scrml_meta_effect` call.
- This ensures the type registry object is allocated once per compilation unit, not once
  per effect run.

### 22.11 Error Code Summary (§22)

| Code | Condition | Severity |
|---|---|---|
| E-META-001 | Runtime `^{}` block used when `meta.runtime` is `false` | Error |
| E-META-002 | Invalid token inside `^{}` meta block (existing) | Error |
| E-META-003 | `reflect()` called on unknown type in compile-time meta (existing) | Error |
| E-META-005 | `^{}` block mixes compile-time API patterns with runtime-only values | Error |
| E-META-006 | `lift` call inside a `^{}` block | Error |
| E-META-007 | `?{}` SQL context inside a runtime `^{}` block | Error |
| E-META-008 | `reflect()` called outside any `^{}` meta block | Error |

---

## 23. Foreign Code Contexts (`_{}`)

### 23.1 Overview

scrml supports inline foreign code through the `_{}` sigil. Foreign code is opaque to the
scrml compiler — its content is not parsed, tokenized, or type-checked by any scrml pipeline
stage. The compiler extracts the verbatim source slice and delegates it to the external
toolchain declared by the closest parent `<program lang=...>` attribute.

`_{}` is the inline foreign code mechanism. It is distinct from:
- `^{}` meta context (§22) — scrml code that accesses compiler internals
- `r{}` / `c{}` / `z{}` call-char sigils (§23.3) — WASM function invocation
- `use foreign:` declarations (§23.4) — sidecar process interface declarations

### 23.2 Syntax

**Formal grammar:**

```
foreign-block   ::= '_' level-mark '{' foreign-content '}' level-mark
level-mark      ::= '='*
foreign-content ::= (any character sequence not containing '}' followed by the same level-mark)
```

The `level-mark` is zero or more `=` characters. The opening level-mark immediately follows
`_` and immediately precedes `{`. The closing level-mark immediately follows `}`. The opener
and closer MUST have the same number of `=` characters; mismatched levels SHALL be a compile
error (E-FOREIGN-001).

**Level-0 (basic, no markers):**

```scrml
_{
    // foreign code here
}
```

Level-0 uses the same brace-depth counting as all other scrml sigils (`${}`, `?{}`, etc.).
The compiler increments depth on `{` and decrements on `}`. Level-0 is adequate for foreign
code that has balanced braces but FAILS if the foreign code contains `}` inside a string
literal, comment, or language construct. Level-0 is NOT recommended for non-trivial foreign
code.

**Level-1 (recommended default):**

```scrml
_={
    // foreign code here — a lone } will not close this block
    // only }= closes this block
}=
```

**Level-2 (for foreign code that contains `}=`):**

```scrml
_=={
    // foreign code containing }= safely
}==
```

**Recommendation:** Use level-1 (`_={}=`) or higher for any foreign code block. The compiler
SHALL emit a warning (W-FOREIGN-001) when a level-0 `_{}` block is used, recommending
`_={}=` instead.

**Normative statements:**

- The block splitter SHALL recognize `_` followed by zero or more `=` followed by `{` as a
  foreign code block opener. The block splitter SHALL store the opener level (the count of
  `=` characters).
- The block splitter SHALL scan for the matching closer: `}` followed by the same number of
  `=` characters as the opener. No other character sequence closes the foreign code block.
- The interior of a `_{}` block is opaque. The compiler SHALL NOT parse, tokenize, or
  type-check the content. The compiler SHALL extract the verbatim source slice between the
  opener and closer as a raw string.
- A mismatched level (opener `_={` with closer `}==`) SHALL be a compile error (E-FOREIGN-001).
- A `_{}` block that reaches end-of-file without a matching closer SHALL be a compile error
  (E-FOREIGN-002: unclosed foreign code block at line N).
- The compiler SHALL emit W-FOREIGN-001 on any level-0 `_{` block, recommending `_={}=`.

### 23.2.1 Language Determination

The language for a `_{}` block is determined by the `lang=` attribute of the closest
ancestor `<program>` element in the scrml source. The compiler walks up the `<program>`
nesting tree; the first `<program>` with a `lang=` attribute wins.

```scrml
<program>
    <program name="compute" lang="go" build="go build -o ./bin/compute ./cmd/compute">
        _={
            package main

            import "fmt"

            func Add(a, b int) int {
                return a + b
            }
        }=
    </>
</>
```

Here `_={}=` is governed by `lang="go"`. The compiler passes the verbatim content to the Go
toolchain.

**Normative statements:**

- The compiler SHALL determine the language of a `_{}` block by resolving the `lang=`
  attribute of the closest ancestor `<program>` with that attribute set.
- A `_{}` block with no ancestor `<program lang=...>` in scope SHALL be a compile error
  (E-FOREIGN-003: foreign code block has no `lang=` declaration in any ancestor `<program>`).
- The compiler SHALL NOT interpret or modify the foreign code content. It SHALL pass the
  verbatim source slice to the declared external toolchain.

### 23.2.2 AST Representation

The TAB stage (Stage 3) SHALL produce an AST node of type `ForeignBlock` for each `_{}` block:

```
ForeignBlock {
    level: number          // count of '=' characters in the level mark
    lang: string           // resolved from closest ancestor <program lang=...>
    raw: string            // verbatim content between opener and closer
    span: SourceSpan       // position of the opener in the source file
    programRef: ProgramId  // ID of the governing <program> node
}
```

All downstream pipeline stages (PA, RI, TS, DG) SHALL skip `ForeignBlock` nodes. CG SHALL
hand off the `raw` content and `lang` to the external toolchain invocation.

### 23.2.3 Pipeline Stage Contracts

| Stage | Behavior for `ForeignBlock` |
|-------|----------------------------|
| PP (Preprocessor) | No action — `_{}` blocks are not macro-expanded |
| BS (Block Splitter) | Detects opener, counts level markers, scans for matching closer, emits Block with `type: 'foreign'` |
| TAB | Produces `ForeignBlock` AST node; does NOT tokenize interior |
| PA | Skips `ForeignBlock` nodes |
| RI | Skips `ForeignBlock` nodes — foreign code does not affect route analysis |
| TS | Skips `ForeignBlock` nodes — no type checking of foreign code |
| DG | Skips `ForeignBlock` nodes |
| CG | Extracts `raw` content, invokes declared external toolchain, emits toolchain output |

### 23.2.4 Valid Contexts

A `_{}` foreign code block is valid ONLY as a direct child of a `<program>` element. It is
NOT valid inside:
- Logic contexts (`${}`)
- SQL contexts (`?{}`)
- CSS contexts (`#{}`)
- Meta contexts (`^{}`)
- Markup element bodies (as a child of `<div>`, `<span>`, etc.)

A `_{}` block in any invalid context SHALL be a compile error (E-FOREIGN-004: foreign code
block is not valid in this context; it must be a direct child of a `<program>` element).

### 23.2.5 Worked Examples

**Valid — Go sidecar, level-1 (recommended):**

```scrml
<program>
    <program name="api" lang="go"
        build="go build -o ./bin/api ./cmd/api"
        port=9000
        health="/health">
        _={
            package main

            import (
                "net/http"
                "encoding/json"
            )

            func HandleRequest(w http.ResponseWriter, r *http.Request) {
                json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
            }
        }=
    </>
</>
```

**Valid — level-2 for foreign code containing `}=`:**

```scrml
<program name="proc" lang="zig">
    _=={
        const std = @import("std");
        // This contains }= literally in a comment:
        // closing marker would be }= but we're safe at level 2
        pub fn main() void {
            std.debug.print("Hello\n", .{});
        }
    }==
</>
```

**Invalid — no `lang=` in ancestor `<program>`:**

```scrml
<program>
    _={
        package main   // Error E-FOREIGN-003
    }=
</>
```

```
Error E-FOREIGN-003 at line 2: Foreign code block has no `lang=` declaration in any
ancestor `<program>`. Add `lang="go"` (or the appropriate language) to the enclosing
`<program>` element.
```

### 23.2.6 Error Conditions

| Code | Trigger | Severity |
|------|---------|---------|
| E-FOREIGN-001 | Level mismatch between `_{}` opener and closer | Error |
| E-FOREIGN-002 | `_{}` block reaches end-of-file without a matching closer | Error |
| E-FOREIGN-003 | `_{}` block has no `lang=` declaration in any ancestor `<program>` | Error |
| E-FOREIGN-004 | `_{}` block appears in an invalid context (not a direct child of `<program>`) | Error |
| W-FOREIGN-001 | Level-0 `_{` used; `_={}=` recommended | Warning |

### 23.3 Call-Char Sigils for WASM

Call-char sigils are single-character prefixes on a `{}` block that invoke a compiled WASM
function. They are syntactically identical to other scrml sigils (`${}`, `?{}`, etc.) but
their content is a function call expression targeting a foreign WASM module, not scrml code.

Call-char sigils are WASM-only. They are for client-side WASM compute kernels compiled from
languages like Rust, C, C++, and Zig. Server-side sidecar processes (Go, Python) use
`use foreign:` declarations (§23.4), not call-char sigils.

#### 23.3.1 Default Call-Char Registry

The compiler ships with a default registry mapping single characters to WASM-capable languages:

| Char | Language | Rationale |
|------|----------|-----------|
| `r`  | Rust | First letter; primary WASM language via wasm-bindgen / wasm-pack |
| `c`  | C | First letter; WASM via Emscripten |
| `C`  | C++ | Uppercase C; WASM via Emscripten |
| `z`  | Zig | First letter; native WASM output |
| `o`  | Odin | First letter; WASM target supported |
| `a`  | AssemblyScript | First letter; TypeScript-subset for WASM |

The registry is case-sensitive. `c` is C; `C` is C++. These are the only pairs where case
carries distinct meaning.

Go is NOT in the default call-char registry. Go WASM (via TinyGo) may be added via explicit
`callchar=` declaration (§23.3.2). Go is primarily a sidecar language and uses `use foreign:`
for server-side integration.

#### 23.3.2 Declaring a Call Char (Extending the Registry)

A nested `<program>` declares its call char via the `callchar=` attribute. This maps a single
character to the nested program for invocation.

```scrml
<program>
    <program name="math-kernel" lang="go" mode="wasm" callchar="g"
        build="tinygo build -o ./wasm/math.wasm -target wasm ./cmd/math"
        source="./cmd/math"/>

    ${ extern g computeFFT(data: number[]) -> number[] }

    ${ const @spectrum = g{ computeFFT(@audioData) } }
</>
```

When `callchar="g"` is declared on a nested `<program>`, `g{}` in the parent scope resolves
to that program's WASM module.

**Override:** A `callchar=` declaration on a nested `<program>` overrides the default registry
for that character within the parent's scope. If a project declares `callchar="r"` on a Ruby
WASM program, `r{}` in that parent resolves to Ruby, not Rust.

#### 23.3.3 The `extern` Declaration

Before a call-char sigil can be used, the foreign function interface MUST be declared with
`extern`:

```
extern-decl ::= 'extern' call-char identifier '(' param-list? ')' '->' type
              | 'extern' call-char identifier '(' param-list? ')'
call-char   ::= single-character-identifier
param-list  ::= param (',' param)*
param       ::= identifier ':' type
```

The `extern` keyword declares: which call char the function belongs to, the function name, its
parameter types (in scrml types), and its return type. The compiler uses this declaration to
generate WASM binding glue (type marshaling, WASM memory management, result deserialization).

**Placement:** `extern` declarations MUST appear inside a `${}` logic context at file top level
(not inside a function body).

```scrml
<program>
    <program name="image-filter" lang="rust" mode="wasm"
        build="cargo build --target wasm32-unknown-unknown -p image-filter"
        source="./crates/image-filter"/>

    ${ type FilterParams:struct = { brightness: number, contrast: number, saturation: number } }
    ${ type FilterResult:struct = { pixels: number[], width: number, height: number } }

    ${ extern r applyFilter(params: FilterParams, imageData: number[]) -> FilterResult }
    ${ extern r grayscale(imageData: number[]) -> number[] }

    @brightness = 1.0
    @imageData = []

    ${ const @filtered = r{ applyFilter({ brightness: @brightness, contrast: 1.0, saturation: 1.0 }, @imageData) } }
</>
```

#### 23.3.4 Normative Statements

- A call-char sigil SHALL be a single character followed immediately by `{`. The compiler
  SHALL resolve the character against the default registry (§23.3.1) and any `callchar=`
  declarations in ancestor `<program>` elements.
- An unresolved call char (not in the default registry and not declared via `callchar=`) SHALL
  be a compile error (E-WASM-001: unknown call char; check the default registry or add a
  `callchar=` attribute to the appropriate nested `<program>`).
- Every foreign function called via a call-char sigil MUST have a corresponding `extern`
  declaration. Calling a function with no `extern` declaration SHALL be a compile error
  (E-WASM-002: no `extern` declaration for function `name` using call char `x`).
- An `extern` declaration for a call char that does not resolve to any declared `<program>`
  SHALL be a compile error (E-WASM-003: `extern` declaration references call char `x` but no
  `<program>` with that call char is declared).
- Call-char sigils are client-side WASM invocations. The compiler SHALL generate
  `WebAssembly.instantiate()` loading code and type-marshaling calls for each declared
  `extern`. Call-char sigil calls SHALL appear only in client-side code paths.
- The content inside a call-char `{}` block IS scrml logic context — it may reference
  scrml variables and expressions, not foreign language syntax. The call-char sigil is a
  function call expression that happens to invoke WASM.

#### 23.3.5 Error Conditions

| Code | Trigger | Severity |
|------|---------|---------|
| E-WASM-001 | Call char not in default registry and no `callchar=` declaration | Error |
| E-WASM-002 | Call-char function called with no corresponding `extern` declaration | Error |
| E-WASM-003 | `extern` declaration references a call char with no matching `<program>` | Error |

#### 23.3.6 Worked Example — Valid (Rust image filter)

```scrml
<program>
    <program name="image-filter" lang="rust" mode="wasm"
        build="cargo build --target wasm32-unknown-unknown -p image-filter"
        source="./crates/image-filter"/>

    ${ extern r applyFilter(brightness: number, pixels: number[]) -> number[] }

    @brightness = 1.0
    @rawPixels = []

    ${ const @filtered = r{ applyFilter(@brightness, @rawPixels) } }

    <input type="range" bind:value=@brightness min=0 max=2 step=0.1/>
    <canvas width=800 height=600/>
</>
```

#### 23.3.7 Sidecar Processes — `use foreign:` (not call-char sigils)

Server-side sidecar processes (Go, Python, etc.) do NOT use call-char sigils. They use
`use foreign:name { fn }` declarations. See §23.4.

The distinction:

| Mechanism | For | Runs on |
|-----------|-----|---------|
| `r{}`, `c{}`, `z{}` call chars | WASM compute kernels | Client (browser) |
| `use foreign:name { fn }` | Sidecar HTTP/socket services | Server |

### 23.4 Sidecar Process Declarations (`use foreign:`)

Server-side sidecar processes (Go, Python, and other languages whose `<program>` does not
have `mode="wasm"`) are accessed via `use foreign:name { fn }` declarations, not call-char
sigils. The `use foreign:` form is a capability import that makes sidecar functions available
in the parent scrml file's server scope.

**Syntax:**

```
use foreign:name { fn-list }
fn-list ::= identifier (',' identifier)*
```

Where `name` is the `name=` attribute of the nested `<program>` that declares the sidecar,
and `identifier` is a function name exported from that sidecar (via an `export function`
declaration inside the nested `<program>`).

**Example:**

```scrml
<program>
    <program name="ml" lang="go"
        build="go build -o ./bin/ml ./cmd/ml"
        port=9001
        health="/health">

        ${ type PredRequest:struct = { features: number[], modelId: string } }
        ${ type PredResult:struct = { prediction: number, confidence: number } }
        ${ export function predict(req: PredRequest) -> PredResult }
    </>

    use foreign:ml { predict }

    ${ server function getPrediction(features, modelId) {
        return predict({ features, modelId })
    } }
</>
```

**Normative statements:**

- `use foreign:name { ... }` SHALL be valid at file top level, outside any `${}` block.
- The `name` in `use foreign:name` MUST match the `name=` attribute of a nested `<program>`
  declared within the same top-level `<program>`. An unresolved name SHALL be a compile error
  (E-FOREIGN-010: `use foreign:name` does not match any nested `<program name="...">` in scope).
- Functions listed in the `{ }` block MUST have corresponding `export function` declarations
  in the named nested `<program>`. An unlisted or unexported function SHALL be a compile error
  (E-FOREIGN-011: `fn` is not exported by `<program name="name">`).
- Functions brought into scope via `use foreign:` are available only in server-escalated
  functions (§12). Calling a foreign sidecar function from client-side code SHALL be a compile
  error (E-FOREIGN-012: sidecar functions are server-side only).
- The compiler SHALL generate HTTP/socket client code for each `use foreign:` import. The
  generated client makes the declared call to the sidecar's endpoint and deserializes the
  response using the scrml type declared in the sidecar's `export function`.

#### 23.4.1 Error Conditions

| Code | Trigger | Severity |
|------|---------|---------|
| E-FOREIGN-010 | `use foreign:name` references a name that matches no nested `<program>` | Error |
| E-FOREIGN-011 | Function listed in `use foreign:` is not exported by the named sidecar | Error |
| E-FOREIGN-012 | Sidecar function called from a client-side code path | Error |

---

## 24. HTML Spec Awareness

### 24.1 Built-in Element Registry

The compiler has full awareness of the HTML specification. Every HTML element is a built-in type with a known shape, including:

- Valid attributes per element, with their types (boolean, string, number, URL, enumerated, etc.)
- Content model — which children are valid for each element
- Boolean attribute list

### 24.2 Normative Rules

- An invalid attribute on a known HTML element SHALL be a compile error (E-HTML-001).
- A content model violation SHALL be configurable per the `html-content-model` setting (see Section 28). Under `strict` mode, content model violations SHALL be a compile error (E-HTML-002). Under `warn` mode, they produce a warning. Under `off` mode, they are not reported.
- Attribute type checking is always strict regardless of the `html-content-model` setting. Wrong attribute types SHALL always be a compile error (E-HTML-003).
- Boolean attribute coercion follows Section 5.3.
- The targeted HTML spec version is a compiler configuration concern. The default target version is TBD (SPEC-ISSUE-005).

### 24.3 Shape Constraints

- Component definitions inherit the shape of their root element.
- `const card = <div>` means `card` is valid anywhere `<div>` is valid.
- `div` and `span` are distinct shapes. The compiler SHALL enforce shape constraints at component use sites.

---

## 25. CSS Variable Syntax

### 25.1 Overview

Standard CSS property declarations are unchanged. Only CSS custom properties (variables) receive new scrml syntax. The `--` prefix and `var()` wrapper are compiler-generated; the developer never writes them.

### 25.2 Defining a Variable

Inside any CSS selector block:

```css
variable-name = value;
```

Compiles to:

```css
--variable-name: value;
```

### 25.3 Using a Variable

```css
property: variable-name fallback;
```

Compiles to:

```css
property: var(--variable-name, fallback);
```

### 25.4 Hyphenated Names

Both property names and variable names MAY be hyphenated. The parser tokenizes the property name as everything before the `:`, using standard CSS tokenization. The variable name follows the `:` and is delimited by the first whitespace.

```css
border-color: card-border #e2e8f0;
```

Compiles to:

```css
border-color: var(--card-border, #e2e8f0);
```

This is valid. The property name `border-color` is the full token before `:`. The variable name is `card-border`. The fallback is `#e2e8f0`.

### 25.5 Scoping

CSS variable scoping follows normal CSS custom property cascade rules. The compiler does not alter scoping behavior.

### 25.6 Constructor-Scoped CSS — Native `@scope` (DQ-7)

scrml compiles constructor-level `#{}` CSS to native CSS `@scope` blocks. Class names are never mangled. The compiled CSS is human-readable and 1:1 with the source CSS.

**Compilation rules:**

1. **Selector-based `#{}` inside a constructor** compiles to:
   ```css
   @scope ([data-scrml="ConstructorName"]) to ([data-scrml]) {
     /* original rules unchanged */
   }
   ```
   The constructor's root element carries `data-scrml="ConstructorName"` in the emitted HTML.

2. **Flat-declaration `#{}` blocks** (containing only `property: value;` pairs, no selectors) inside a constructor compile to `style="prop: value;"` on the containing element. They do not appear in the `.css` file.

3. **Program-level `#{}` blocks** (not inside any constructor) are emitted as global CSS without wrapping.

4. **Donut scope** is implicit. The `to ([data-scrml])` clause in every `@scope` block means constructor CSS does not leak into child constructors. No `:deep()` escape hatch is needed.

5. **Tailwind utility classes** (§26) are never wrapped in `@scope`. They remain globally scoped.

**Example:**

Source:
```scrml
< card title(string)>
    #{
        .card { padding: 16px; border: 1px solid #e5e7eb; }
    }
    <div class="card" data-scrml="card">
        <h2>${title}/
    </div>
/
```

Compiled CSS:
```css
@scope ([data-scrml="card"]) to ([data-scrml]) {
    .card { padding: 16px; border: 1px solid #e5e7eb; }
}
```

**SPEC-ISSUE-006 resolved.** The `to ([data-scrml])` donut boundary naturally prevents style leakage into child constructors. No deep-selector syntax is needed.

---

## 26. Tailwind Utility Classes

### 26.1 Integration Model

scrml supports Tailwind utility class names natively. No Tailwind CLI, PostCSS, content configuration, or purge step is required. The scrml compiler IS the build step.

### 26.2 Normative Statements

- The compiler SHALL scan all `.scrml` source files for used Tailwind utility class names.
- The compiler SHALL match used class names against built-in Tailwind utility definitions embedded in the compiler.
- The compiler SHALL emit ONLY the CSS rules for classes that are actually used. Unused Tailwind utilities SHALL NOT appear in compiled output.
- Tailwind utility classes SHALL remain globally scoped. The component-scoped CSS system (Section 24.6) SHALL NOT hash Tailwind utility class names.

### 26.3 Open Items

- Arbitrary values (e.g., `p-[1.5rem]`) — TBD (SPEC-ISSUE-012)
- Responsive and variant prefixes (e.g., `md:`, `hover:`) — TBD (SPEC-ISSUE-012)
- Custom theme configuration — TBD (SPEC-ISSUE-012)

---

## 27. Comment Syntax

### 27.1 Universal Comment

`//` is a single-line comment. It is valid in all scrml contexts.

### 27.2 Per-Context Native Comments

Each context type also accepts its native comment syntax:

| Context | Native comment syntax |
|---|---|
| Markup | `<!-- -->` |
| Logic (JS) | `//` and `/* */` |
| SQL | `--` and `/* */` |
| CSS | `/* */` and `//` |

The `//` form is universal and works in all contexts. A developer who uses only `//` will never encounter a comment syntax error.

---

## 28. Compiler Settings

The following compiler settings are defined in this version. Settings are specified in a compiler configuration file (format TBD) or on the command line.

| Setting | Values | Default | Description |
|---|---|---|---|
| `verbose closers` | `on` / `off` | `off` | When `on`, normalizes all `</>` inferred closer forms to `</tagname>` in diagnostic output and error messages. Does not affect compiled output. |
| `html-content-model` | `strict` / `warn` / `off` | `warn` | Controls how HTML content model violations are reported. See Section 28.1 for full semantics. |
| name-mismatch warning | `warn` / `error` | `warn` | Whether a component name that misleadingly matches an HTML element produces a warning or an error. |

Additional settings will be defined as features are specified.

### 28.1 `html-content-model` Setting

The `html-content-model` setting controls enforcement of the HTML content model — that is, whether a given element's children are valid per the HTML specification (e.g., `<ul>` only accepts `<li>` children).

**This setting does NOT affect attribute type checking.** Attribute type checking (wrong type for a known HTML attribute) is always strict regardless of this setting. Wrong attribute types SHALL always be a compile error (E-HTML-003). The rationale: wrong attribute types produce incorrect generated code. Content model violations may produce technically valid HTML in some cases and are a migration concern — teams adopting scrml on an existing project may have content model violations that would make a `strict` default blocking.

**Modes:**

| Value | Behavior |
|---|---|
| `strict` | Content model violations SHALL be a compile error (E-HTML-002). No exceptions. |
| `warn` | Content model violations produce a warning (W-HTML-001) and do not block compilation. The compiled output is emitted. |
| `off` | Content model violations are not reported. The compiled output is emitted without any diagnostic. |

**Default:** `warn`. The `warn` default enables detection and progressive correction without blocking migration from existing HTML that may contain content model violations.

**Normative statements:**

- The `html-content-model` setting SHALL apply to all content model checks defined in Section 23.
- The `html-content-model` setting SHALL NOT suppress attribute type checking (E-HTML-003 is always emitted regardless of this setting).
- A project MAY set `html-content-model: strict` once all content model violations are resolved. This is the recommended final state for new projects.

---

## 29. Vanilla File Interop

- `.js`, `.html`, and `.css` files MAY exist alongside `.scrml` files with no ceremony.
- The compiler processes `.scrml` files and integrates or passes through the rest.
- Progressive adoption of scrml is supported: an existing project MAY introduce `.scrml` files incrementally.
- The JS module import system (Section 21) is the mechanism for referencing vanilla files from scrml source.

---

## 30. Compile-Time Evaluation — `bun.eval()`

### 30.1 Scope of Use

The compiler (itself a Bun program) uses `bun.eval()` during compilation for:

- Evaluating constant and template expressions
- Running compiler-internal type helper functions written in JavaScript
- Evaluating user-written compile-time JavaScript expressions
- Opening `db.sql` via Bun's SQLite at compile time to validate SQL queries, infer return types from schema, and check `protect=` field coverage

Generated output SHALL NOT contain `bun.eval()` calls. `bun.eval()` is compile-time only.

### 30.2 `bun.eval()` Inside `${ }` Markup Interpolations

`bun.eval()` MAY be used inside a `${ }` markup interpolation as a compile-time constant:

```scrml
<footer>© ${ bun.eval("new Date().getFullYear()") }</>
```

- The compiler SHALL recognize a `bun.eval()` call inside a `${ }` block, evaluate it at compile time, and substitute the result as a literal in the compiled output.
- The result is inlined as a constant. The generated HTML SHALL contain the literal value (e.g., `2026`), not a JavaScript expression.
- If `bun.eval()` throws at compile time, this SHALL be a compile error (E-EVAL-001) with the eval error message included.

### 30.3 Security

`bun.eval()` executes arbitrary JavaScript at compile time in the context of the compiler process. The developer is responsible for ensuring that compile-time `bun.eval()` calls do not execute untrusted code.

---

## 31. Dependency Graph

### 31.1 Purpose

The compiler builds a single dependency graph of all operations in the program. This graph is the shared source of truth for multiple compiler passes:

- **Async scheduling** — determines what can parallelize vs. what must sequence (Section 13)
- **Reactivity** — determines which `@variables` invalidate which renders (Section 6)
- **Route inference** — determines which data accesses require server routes (Section 12)
- **`protect=` analysis** — determines which fields flow to which call sites (Section 11)

### 31.2 Construction Requirements

- The dependency graph SHALL be built before any code generation pass begins.
- The graph SHALL represent all data dependencies: every operation that consumes the output of another operation is a dependent edge.
- The graph SHALL represent all reactive dependencies: every expression that reads a `@variable` is a dependent edge on that variable.
- The graph SHALL be complete before any pass reads it. Partial graph construction is not permitted.

### 31.3 Route Analysis From the Graph

The route analysis pass reads the dependency graph to determine, for each function, whether server escalation is required. The escalation triggers in Section 12.2 are evaluated against the graph.

---

## 32. The `~` Keyword — Implicit Pipeline Accumulator

### 32.1 Overview

`~` is the implicit pipeline accumulator. It holds the result of the most recent expression whose value was not explicitly captured by an assignment. `~` is a tool for concise pipeline-style code where the output of one step flows implicitly into the next. It is intentionally narrow — misuse produces compile errors.

`~` is a power tool. It is intended for natural pipeline patterns where each step produces exactly one value of interest. Code that reads `~` in multiple places, or that mixes `~` consumption with complex control flow, SHALL be restructured using explicit variable names.

### 32.2 Initialization

`~` is initialized by exactly two source constructs:

1. **Unassigned expression statement.** Any expression whose value is not captured by a `let`, `const`, variable assignment, or other explicit binding. The expression value is placed into `~`.

   ```scrml
   fetchUser(id)             // fetchUser's return value initializes ~
   let user = fetchUser(id)  // captured in `user`; ~ is NOT initialized
   ```

2. **`lift` statement.** Each `lift` call, in either accumulation mode or value-lift mode (§10.7, §17.6), initializes `~` to the lifted value, in addition to its mode-specific action (accumulating or designating a result).

   ```scrml
   lift <li>${item.name}/;                         // accumulation mode — lifts to parent AND initializes ~
   if (cond) { lift 3 } else { lift 4 }           // value-lift mode — designates result AND initializes ~
   ```

**Declarations do not initialize `~`.** `let x = expr` captures the value in `x`; `~` is unaffected. `~` initialization is a property of unassigned expression position, not of expression evaluation in general.

**Normative statements:**

- An expression statement whose value is not bound to any identifier SHALL initialize `~` to the result of that expression.
- A `lift` statement SHALL initialize `~` to the value being lifted, in addition to accumulating it.
- A variable declaration (`let x = expr`, `const x = expr`) SHALL NOT initialize `~`.
- A function declaration (`function f() {}`, `fn f {}`) SHALL NOT initialize `~`.
- `~` is initialized at runtime; its value is the actual return value of the expression at execution time. The compiler tracks whether `~` has been initialized and consumed statically; the value itself is a runtime value.

### 32.3 `~` as a `lin` Variable

`~` is a built-in `lin` variable (§35). The exactly-once consumption rule applies.

- `~` SHALL be consumed exactly once between each initialization.
- If `~` is initialized and then initialized again before being consumed, the second initialization is E-TILDE-002.
- If `~` is initialized and the scope exits before `~` is consumed, that is E-TILDE-002.
- If `~` is referenced when it has not been initialized in the current scope, that is E-TILDE-001.

**Consuming `~`** means reading it in an expression: `let result = ~`, `if (~.ok)`, `process(~)`, `lift ~`, and so on. Any read of `~` as an expression is a consumption. A consumption can appear at most once between two initializations.

`~` is a read-once slot. After consumption, `~` is uninitialized until the next qualifying expression or `lift`.

**Normative statements:**

- `~` SHALL behave as a `lin` variable (§35). All `lin` enforcement rules apply.
- A consumption of `~` SHALL count as exactly one use of the current `~` value.
- The compiler SHALL track the initialization and consumption state of `~` statically, treating each control-flow path as a separate analysis path for `~` state.
- `~` used in both branches of an `if`/`else` where only one branch initialized `~` SHALL be a compile error under the `lin` branch consistency rule (E-LIN-003 applied to `~`).

### 32.4 Context Boundary Rule

`~` does NOT cross `${ }` logic context boundaries. Each logic context has its own independent `~` slot.

```scrml
<div>${
    fetchUser(id)   // initializes ~ in this outer context
    ${
        // ~ is NOT initialized here — this is a new nested context
        // referencing ~ here is E-TILDE-001
    }
    process(~)      // valid: consumes ~ from the outer context
</>
```

`~` also does not cross function body boundaries. A `~` initialized inside a named function body is local to that function body's scope; it does not propagate to the enclosing `${ }` context.

**Normative statements:**

- Each `${ }` logic context SHALL have an independent `~` slot.
- `~` initialized inside a nested `${ }` context SHALL NOT be accessible in an enclosing `${ }` context.
- `~` initialized in an enclosing `${ }` context SHALL NOT be accessible inside a nested `${ }` context.
- `~` initialized inside a function body (named or anonymous) SHALL be local to that function body and SHALL NOT propagate out.
- Referencing `~` across any context boundary SHALL be a compile error (E-TILDE-001).

### 32.5 Error Conditions

**E-TILDE-001: `~` referenced but not initialized.**

`~` is read in an expression but has not been initialized at that point in the current scope.

Triggers:
- `~` referenced in a fresh `${ }` context before any unassigned expression or `lift`.
- `~` referenced after it has been consumed (the previous `~` value was used up).
- `~` referenced inside a function body that has not itself initialized `~`.
- `~` referenced in a branch where the initialization path is conditional and the compiler cannot prove `~` is initialized on all reaching paths.
- `~` referenced after an if-as-expression (§17.6) with no `else` arm, when the compiler cannot prove the true-path was taken. The if-as-expression with no `else` does not initialize `~` on the false path (§17.6.6).

```scrml
${ process(~) }   // Error E-TILDE-001: ~ is not initialized at this point
```

> E-TILDE-001: `~` is not initialized at this point in the current logic context. `~` is set by an unassigned expression statement (e.g., `fetchUser(id)` with no binding) or by a `lift` statement. Add an expression that produces the value before referencing `~`, or capture the value explicitly with `let`.

**E-TILDE-002: `~` initialized but not consumed before scope exit or reinitialization.**

`~` was initialized but the value was never read before the scope ended or before a second initialization occurred.

Triggers:
- The logic context exits (closing `}`) with an unconsumed `~`.
- A second unassigned expression appears before the first `~` was consumed.
- A `lift` call appears when `~` is already initialized and unconsumed.

```scrml
${
    fetchUser(id)    // initializes ~
    fetchOrder(id)   // Error E-TILDE-002: ~ was initialized but not consumed before this reinit
}
```

```scrml
${
    fetchUser(id)    // initializes ~
}                    // Error E-TILDE-002: ~ initialized but not consumed before scope exit
```

> E-TILDE-002: `~` was initialized at line N but was not consumed before it was reinitialized (or before the scope exited). Either consume `~` between the two statements (e.g., `let x = ~`) or capture the first result explicitly (`let user = fetchUser(id)`) so `~` is not initialized.

**Normative statements:**

- The compiler SHALL emit E-TILDE-001 when `~` is read and the compiler cannot prove `~` is initialized on all reaching execution paths from the current scope entry.
- The compiler SHALL emit E-TILDE-002 when `~` is initialized and the compiler determines that `~` will not be read before the scope exits or before `~` is reinitialized.
- E-TILDE-001 and E-TILDE-002 SHALL be reported at the TS stage (Stage 6), after type resolution, as part of the linear type pass (§35).
- When E-LIFT-001 (concurrent `lift`) fires, `~` double-initialization analysis is pre-empted. The compiler SHALL report E-LIFT-001 and SHALL NOT additionally report E-TILDE-002 for the same concurrent `lift` pair. E-LIFT-001 takes priority.

### 32.6 Interaction with `lift`

Each `lift` call reinitializes `~`. In a sequential `lift` loop, `~` is reinitialized on every iteration.

**Exception — elision when `~` is unreferenced:** If the developer never references `~` anywhere in the current `${ }` body, the compiler SHALL NOT emit E-TILDE-002 for unconsumed `lift`-initialized `~` values. This is the common case — most `lift` loops do not use `~`, and requiring `~` consumption in every `lift` loop would make `lift` unusable.

If `~` IS referenced anywhere in the current `${ }` body, ALL `lift` calls in that body reinitialize `~` and the full `lin` obligation applies to every such reinitialization.

```scrml
// Valid: ~ never referenced — lin obligation elided
<ul>${
    for (item of items) {
        lift <li>${item.name}</>;
    }
</>

// Invalid: ~ referenced somewhere in context body; now all lift calls must be consumed
<ul>${
    getHeader()
    let hdr = ~               // ~ referenced — obligation is now active for ALL ~ in this context
    for (item of items) {
        lift <li>${item.name}/;   // Error E-TILDE-002: lift reinitializes ~ but it was not consumed
    }
</>
```

**Normative statements:**

- The `~` `lin` obligation from a `lift` call SHALL apply only if `~` is referenced anywhere in the same `${ }` body (including inside conditional branches).
- If `~` is NOT referenced at any point in the current `${ }` body, the compiler SHALL NOT emit E-TILDE-002 for unconsumed `lift`-initialized `~` values.
- If `~` IS referenced anywhere in the current `${ }` body, ALL `lift` calls in that body initialize `~` and the full `lin` obligation applies to every initialization.
- This rule is all-or-nothing per logic context: either `~` is in use (referenced somewhere) and all `lin` obligations apply, or `~` is not in use and none apply.
- A `lift` in value-lift mode (§17.6) SHALL initialize `~`, subject to the same elision rule. If `~` is not referenced anywhere in the enclosing `${}` body, the lin obligation is elided for value-lift mode `lift` calls, identical to accumulation mode.
- An if-as-expression used as a binding (`const a = if (...) { lift 3 }`) does NOT force a `~` consumption obligation when `~` is not separately referenced, because the `lift` result is captured in `a`.

### 32.7 Worked Examples

**Valid — simple pipeline:**
```scrml
${
    fetchUser(id)            // initializes ~
    let result = process(~)  // consumes ~; result captured in variable
}
```
`fetchUser(id)` initializes `~`. `process(~)` consumes `~`. `~` is consumed exactly once. Valid.

**Valid — `lift` without `~` reference:**
```scrml
<ul>${
    for (item of items) {
        lift <li>${item.name}</>;
    }
</>
```
`~` is never referenced in this logic context. The compiler elides the `lin` obligation for all `lift`-initialized `~` values. Valid.

**Invalid — `~` used without initialization (E-TILDE-001):**
```scrml
${
    let result = transform(~)   // Error E-TILDE-001
}
```
`~` is referenced but no unassigned expression or `lift` precedes it in this scope.

> E-TILDE-001: `~` is not initialized at this point. Add an expression before this use that produces a value without capturing it (e.g., `fetchData()` with no binding), or replace `~` with an explicit variable.

**Invalid — reinitialization without consumption (E-TILDE-002):**
```scrml
${
    fetchUser(id)    // initializes ~
    process(~)       // consumes ~ — valid so far
    fetchOrder(id)   // initializes ~ again
    fetchInvoice(id) // Error E-TILDE-002: previous ~ (from fetchOrder) not consumed
}
```
`fetchOrder(id)` initializes `~`. Before `~` is consumed, `fetchInvoice(id)` reinitializes it.

> E-TILDE-002: `~` was initialized at `fetchOrder(id)` (line N) but was not consumed before being reinitialized at `fetchInvoice(id)` (line N+1). Consume `~` between these two calls (e.g., `let order = ~`) or capture the first result explicitly (`let order = fetchOrder(id)`).

---

## 33. The `pure` Keyword

### 33.1 Overview

A `pure` function is a function that performs no side effects. The compiler statically verifies this constraint at compile time. `pure` functions are guaranteed to produce the same output for the same inputs, enabling aggressive optimization (memoization, dead-code elimination, compile-time evaluation).

### 33.2 Declaration

```scrml
${ pure function add(a, b) { return a + b; } }
```

The `pure` keyword precedes `function` in a function declaration. `pure` MAY also be used with `fn` shorthand:

```scrml
${ pure fn double { return ~ * 2; } }
```

### 33.3 Purity Constraints

A `pure` function SHALL NOT:

1. Mutate any value outside its own scope (no assignment to outer variables, no property mutation on external objects).
2. Perform server calls or database access (no `?{ }` SQL contexts, no `< db>` operations). Additionally, declaring a function `server` is itself a side-effect declaration from the caller's perspective — the function will be executed remotely, involving network I/O. Therefore `pure server` co-declaration is always E-RI-001, regardless of the function body's contents.
3. Mutate the DOM (no element creation, no attribute modification).
4. Use `lift` (§10) — `lift` accumulates into a parent context, which is a side effect.
5. Mutate `@` reactive variables (§6).
6. Call a non-`pure` function, unless the call is provably side-effect-free (e.g., built-in math functions).

### 33.4 Error Codes

- **E-PURE-001**: `pure` function body contains a purity violation (mutation, server call, DOM mutation, or `lift`).
- **E-PURE-002**: `pure` function calls a non-`pure` function.
- **E-RI-001**: A function that is both `pure` and server-escalated (§12.5). The `pure` guarantee and server execution are irreconcilable.

### 33.5 Normative Statements

- The compiler SHALL verify purity constraints at the TS stage (Stage 6). RI (Stage 5) detects the `pure` + server conflict (E-RI-001) but does not verify full purity.
- A `pure` function MAY be evaluated at compile time if all its arguments are compile-time constants.
- The `pure` keyword is an assertion by the developer. The compiler validates it; the developer does not need to prove purity manually.

---

## 34. Error Codes

*This section is a reference index. Each error code is defined normatively in the section that introduces it. This section provides a single lookup point. The authoritative definition — including full normative statements, error message text, and worked examples — is in the referenced section.*

| Code | Section | Trigger | Severity |
|---|---|---|---|
| E-CTX-001 | §3.2 | Wrong closer for context type | Error |
| E-CTX-002 | §3.2, §4.4 | `</>` or `</tagname>` closer used inside a `${ }` logic context | Error |
| E-CTX-003 | §3.2 | Unclosed context at end of file or before outer closer | Error |
| E-TYPE-001 | §14.3, §18.4 | Type mismatch (lifecycle field, match arm type conflict) | Error |
| E-TYPE-006 | §18.8.2 | Non-exhaustive match over union type | Error |
| E-TYPE-010 | §3.3, §10.2 | `${ }` result not coercible to markup in markup parent | Error |
| E-TYPE-011 | §3.3, §10.2 | `${ }` result not coercible to CSS class in style parent | Error |
| E-TYPE-012 | §10.4 | Heterogeneous `lift` values not mutually coercible | Error |
| E-TYPE-020 | §14.6, §18.8.1 | Non-exhaustive match over enum type | Error |
| E-TYPE-021 | §18.7 | Payload arity mismatch in positional destructuring | Error |
| E-TYPE-022 | §18.7 | Named binding references nonexistent payload field | Error |
| E-TYPE-023 | §18.8.1 | Duplicate arm for the same variant | Error |
| E-TYPE-024 | §18.8.2 | Match over a struct type (not supported) | Error |
| E-TYPE-025 | §18.8.2 | Match over an `asIs`-typed value (resolve type first) | Error |
| E-TYPE-026 | §18.9 | Match expression in invalid context (markup, SQL, CSS, attribute) | Error |
| E-TYPE-027 | §18.13 | Shorthand pattern used when enum type cannot be inferred | Error |
| E-TYPE-028 | §18.16 | Literal arm used over an enum type | Error |
| E-TYPE-061 | §14.5 | Shorthand `.VariantName` in a position where the enum type cannot be inferred | Error |
| E-TYPE-062 | §18.17 | `is` operator applied to a non-enum-typed operand | Error |
| E-TYPE-063 | §18.17 | Unknown variant name in `is` expression | Error |
| E-FOREIGN-001 | §23.2 | Level mismatch between `_{}` opener and closer | Error |
| E-FOREIGN-002 | §23.2 | `_{}` block reaches end-of-file without a matching closer | Error |
| E-FOREIGN-003 | §23.2 | `_{}` block has no `lang=` declaration in any ancestor `<program>` | Error |
| E-FOREIGN-004 | §23.2 | `_{}` block appears in an invalid context (not a direct child of `<program>`) | Error |
| E-PROGRAM-001 | §4.12 | Circular `<program>` nesting detected | Error |
| E-SQL-004 | §8.1.1 | `?{}` block has no `db=` declaration in any ancestor `<program>` | Error |
| E-SQL-005 | §8.1.1 | Unrecognized database connection string prefix in `db=` attribute | Error |
| E-WASM-001 | §23.3 | Call char not in default registry and no `callchar=` declaration | Error |
| E-WASM-002 | §23.3 | Call-char function called with no corresponding `extern` declaration | Error |
| E-WASM-003 | §23.3 | `extern` declaration references a call char with no matching `<program>` | Error |
| E-FOREIGN-010 | §23.4 | `use foreign:name` references a name that matches no nested `<program>` | Error |
| E-FOREIGN-011 | §23.4 | Function listed in `use foreign:` is not exported by the named sidecar | Error |
| E-FOREIGN-012 | §23.4 | Sidecar function called from a client-side code path | Error |
| W-FOREIGN-001 | §23.2 | Level-0 `_{` used; `_={}=` recommended | Warning |
| W-PROGRAM-001 | §4.12 | Unnamed nested `<program>` with no distinguishing attributes | Warning |
| E-TYPE-030 | §14.7, §15.2 | `asIs` value used past resolution requirement | Error |
| E-TYPE-031 | §15.3, §15.10 | Prop value fails declared type constraint | Error |
| E-TYPE-040 | §16.4 | Slot fill type incompatible with declared slot shape | Error |
| E-TYPE-050 | §14.8.5 | Two tables produce the same generated type name | Error |
| E-TYPE-051 | §14.8.5 | SQLite column type unmappable; typed `any` | Warning |
| E-MARKUP-001 | §4.1 | Unknown HTML element name | Error |
| E-MARKUP-002 | §4.4.1 | Explicit closer does not match open tag name (spec); attribute type mismatch on HTML element (implementation — collision, see H-03 audit note) | Error |
| E-MARKUP-003 | §4.4.1 | `</tagname>` closer used inside a `${ }` logic context | Error |
| E-MARKUP-004 | §4.4.2 | `</>` closer used inside a `${ }` logic context | Error |
| E-STATE-001 | §4.2 | Unrecognized state identifier | Error |
| E-SYNTAX-001 | §10.4 | `lift` outside any `${ }` logic context | Error |
| E-SYNTAX-002 | §10.4 | `lift` inside a function body | Error |
| E-SYNTAX-003 | §4.11.1 | `extract` in `lift` keyword position | Error |
| E-SYNTAX-010 | §18.6 | `else` default arm is not the last arm | Error |
| E-SYNTAX-011 | §18.10 | Guard clause syntax (`if` after arm pattern) — not supported in v1 | Error |
| E-SYNTAX-012 | §18.11 | Nested pattern in binding position — not supported in v1 | Error |
| E-ATTR-001 | §5.2 | Unquoted attribute value where quoted is required | Error |
| E-ATTR-002 | §5.3 | Boolean attribute assigned a string literal | Error |
| E-ATTR-010 | §5.4 | `bind:` target is not an `@` reactive variable | Error |
| E-ATTR-011 | §5.4 | `bind:` used on an unsupported attribute name | Error |
| E-ATTR-012 | §5.4 | `bind:` and explicit event handler conflict on same element | Error |
| E-SCOPE-001 | §5.2 | Unquoted identifier not resolvable in scope | Error |
| E-SCOPE-010 | §20.4 | Developer declares variable with reserved binding name (`route`, `session`) | Error |
| E-SCOPE-011 | §20.4 | Access to undeclared route parameter name | Error |
| E-SCOPE-012 | §20.5 | `session` accessed in non-server-escalated function | Error |
| E-REACTIVE-001 | §6.2 | `@variable` used before declaration | Error |
| E-REACTIVE-002 | §6.6.8 | Assignment to a `const @name` derived reactive value | Error |
| E-REACTIVE-003 | §6.6.9 | Reading a `const @name` derived value inside a server-escalated function | Error |
| E-REACTIVE-004 | §6.6.5 | `flush()` called inside a derived expression | Error |
| E-REACTIVE-005 | §6.6.10 | Circular dependency in the derived reactive graph | Error |
| E-LIFT-001 | §10.5.2 | Concurrent `lift` calls in same logic block | Error |
| E-PA-001 | §11.5 | `src=` file does not exist | Error |
| E-PA-003 | §11.5 | Bun SQLite schema introspection failed | Error |
| E-PA-004 | §11.5 | `tables=` references nonexistent table | Error |
| E-PA-005 | §11.5 | `tables=` attribute absent from `< db>` block | Error |
| E-PA-006 | §11.5 | `src=` attribute absent from `< db>` block | Error |
| E-PA-007 | §11.3 | `protect=` field name matches no table column | Error |
| E-PROTECT-001 | §11.3.2 | Protected field accessed on client type | Error |
| E-PROTECT-002 | §11.3.3 | Code accessing protected field may run client-side | Error |
| E-ROUTE-001 | §12.4 | Unresolvable callee or computed member access in route analysis | Warning |
| E-RI-001 | §33.5, §12 | Function declared both `pure` and server-escalated | Error |
| E-RI-002 | §12 | Server-escalated function mutates `@` reactive variable | Error |
| E-IMPORT-001 | §21.2 | `export` used outside a `${ }` context or component `const` | Error |
| E-IMPORT-002 | §21.3 | Circular import detected | Error |
| E-IMPORT-003 | §21.3 | `import` inside a function body (not file top-level) | Error |
| E-IMPORT-004 | §21.3 | Imported name not found in target file's exports | Error |
| E-COMPONENT-001 | §15.7 | Caller targets or overrides a `fixed` element | Error |
| E-COMPONENT-002 | §16.2 | Required slot not filled at call site | Error |
| E-COMPONENT-003 | §16.3 | Multiple `${...}` spreads in single component body | Error |
| E-COMPONENT-004 | §16.4 | Slot fill names a slot that does not exist in target component | Error |
| E-COMPONENT-005 | §16.4 | Caller provides children but component has no `${...}` spread | Error |
| E-COMPONENT-010 | §15.10 | Required prop missing at call site, or `props` on non-root element | Error |
| E-COMPONENT-011 | §15.10 | Extra prop at call site not declared in `props` block | Error |
| E-COMPONENT-012 | §15.10 | Same prop in both `props` block and bare attribute | Error |
| E-NAME-001 | §15.6 | Component name collides with built-in HTML element name | Error |
| E-EVAL-001 | §30.2 | `bun.eval()` call threw at compile time | Error |
| E-TILDE-001 | §32.5 | `~` referenced but not initialized in current scope | Error |
| E-TILDE-002 | §32.5 | `~` initialized but not consumed before scope exit or reinitialization | Error |
| E-LIN-001 | §35.5 | `lin` variable not consumed before scope exit | Error |
| E-LIN-002 | §35.5 | `lin` variable consumed more than once | Error |
| E-LIN-003 | §35.5 | `lin` variable consumed in some branches but not all | Error |
| E-META-001 | §22.6 | `^{ }` block requires runtime but `meta.runtime` is `false` | Error |
| E-PURE-001 | §33.4 | `pure` function contains a purity violation | Error |
| E-PURE-002 | §33.4 | `pure` function calls a non-`pure` function | Error |
| E-HTML-001 | §23.2 | Invalid attribute on known HTML element | Error |
| E-HTML-002 | §24.2 | Content model violation (only in `strict` mode) | Error |
| E-HTML-003 | §24.2 | Wrong type for HTML attribute | Error |
| W-HTML-001 | §28.1 | Content model violation under `warn` mode | Warning |
| W-MACRO-001 | §4.9 | Macro expansion alters block type at `<` boundary | Warning |
| W-PROTECT-001 | §11.4 | Function touches protected field but is not `server`-annotated | Warning |
| W-NAV-001 | §20.3 | `navigate(path, .Hard)` from client function cannot be escalated | Warning |
| W-NAME-001 | §15.6 | Component name misleadingly matches a different HTML element type | Warning |
| W-LIN-001 | §35.7 | `lin` variable passed to server-escalated function; guarantee does not extend to server copy | Warning |
| W-MATCH-001 | §18.6 | Unreachable default `else` arm (all variants already covered) | Warning |
| W-MATCH-002 | §18.16 | Non-exhaustive literal match (string/number/boolean without `_` arm) | Warning |
| W-DERIVED-001 | §6.6.11 | `const @name = expr` has no `@variable` references; value never re-evaluates | Warning |
| E-ERROR-001 | §19.3.3 | `fail` used in non-`!` function | Error |
| E-ERROR-002 | §19.4.3 | `!` function result not handled (no match, `?`, `!{}`, or boundary) | Error |
| E-ERROR-003 | §19.5.4 | `?` propagation used in non-`!` function | Error |
| E-ERROR-004 | §19.5.4 | `?` applied to non-`!` function call | Error |
| E-ERROR-005 | §19.6.3 | Error variant in markup without `renders` clause or boundary `fallback` | Error |
| E-ERROR-006 | §19.2.3 | `renders` clause references undefined variable | Error |
| E-ERROR-007 | §19.10.4 | Nested `transaction` blocks | Error |
| E-SSE-001 | §37.9 | `yield` used inside a non-generator `server function` body | Error |
| W-SSE-001 | §37.9 | `server function*` body contains no `yield` statements | Warning |
| E-CHANNEL-001 | §38.9 | `<channel>` missing required `name=` attribute | Error |
| E-CHANNEL-002 | §38.9 | `@shared` used outside a `<channel>` scope | Error |
| E-CHANNEL-003 | §38.9 | Duplicate channel name in same file | Error |
| E-CHANNEL-004 | §38.9 | `broadcast()` called outside a `<channel>` scope | Error |
| E-FN-001 | §48.3.1 | `?{}` SQL access inside a `fn` body | Error |
| E-FN-002 | §48.3.2 | DOM mutation call inside a `fn` body | Error |
| E-FN-003 | §48.3.3 | Outer-scope variable mutation inside a `fn` body, or call to a non-`pure`, non-`fn` function | Error |
| E-FN-004 | §48.3.4 | Non-deterministic call inside a `fn` body | Error |
| E-FN-005 | §48.3.5 | `async` on a `fn` declaration, or `await` inside a `fn` body | Error |
| E-FN-006 | §48.4.3 | `return` reached with one or more `<state>` fields in Unloaded phase | Error |
| E-FN-007 | §48.4.4 | Branches return incompatible `<state>` types without an explicit union return type | Error |
| E-FN-008 | §48.5.2 | `lift` inside `fn` body targets a `~` accumulator outside the `fn` boundary | Error |
| E-FN-009 | §48.5.4 | Reactive `@variable` captured as live subscription inside `fn` body | Error |
| W-FN-001 | §48.3.2 | `asIs`-typed value in DOM-mutation position inside `fn` body (probable violation) | Warning |
| E-LOOP-001 | §49.9 | `break` outside any loop | Error |
| E-LOOP-002 | §49.9 | `continue` outside any loop | Error |
| E-LOOP-003 | §49.9 | `break label` — label not found or not a loop | Error |
| E-LOOP-004 | §49.9 | `continue label` — label not found or not a loop | Error |
| E-LOOP-005 | §49.9 | `break`/`continue` crosses function scope boundary | Error |
| E-LOOP-006 | §49.9 | Duplicate label identifier within function scope | Error |
| E-LOOP-007 | §49.9 | `while` used as expression without `lift`/`~` | Error |
| W-ASSIGN-001 | §50.4 | `=` in condition position without double parentheses | Warning |
| E-ASSIGN-001 | §50.9 | Declaration form (`let`/`const`/`lin`) in expression position | Error |
| E-ASSIGN-002 | §50.9 | Type mismatch in chained assignment | Error |
| E-ASSIGN-003 | §50.9 | Undeclared identifier as assignment expression target | Error |
| E-ASSIGN-004 | §50.9 | `const` variable as assignment expression target | Error |
| E-AUTH-001 | §52.11 | Client-local `@var` used as bound parameter in `?{}` INSERT/UPDATE/DELETE outside server function | Error |
| E-AUTH-002 | §52.11 | `server @var` initial value directly derived from a client-local `@var` | Error |
| E-AUTH-003 | §52.11 | State type declares `authority="server"` without `table=` attribute | Error |
| E-AUTH-004 | §52.11 | Two declarations of the same state type with conflicting `authority=` values | Error |
| E-AUTH-005 | §52.11 | `server @var` declared inside a client-only component (no server context) | Error |
| W-AUTH-001 | §52.11 | `server @var` has no detectable initial load pattern | Warning |
| E-CONTRACT-001 | §53.11 | Inline predicate violation at compile time (statically provable) | Error |
| E-CONTRACT-001-RT | §53.11 | Inline predicate violation at runtime | Runtime |
| E-CONTRACT-002 | §53.11 | Named shape not found in registry | Error |
| E-CONTRACT-003 | §53.11 | Predicate references external state — use `< machine>` instead | Error |
| E-CONTRACT-004-WARN | §53.11 | `bind:value` HTML attribute conflicts with predicate-generated attribute | Warning |
| E-BPP-001 | §3.5 | Body pre-parser encountered unparseable logic block | Error |
| E-BS-000 | §4 | Block splitter encountered malformed block structure | Error |
| E-CG-001 | §47 | Codegen: unresolvable variable reference in output | Error |
| E-CG-002 | §47 | Codegen: conflicting output paths | Error |
| E-CG-003 | §47 | Codegen: unsupported AST node kind in emission | Error |
| E-COMPONENT-019 | §15.11 | Callback prop type mismatch | Error |
| E-COMPONENT-030 | §15.12 | Component render syntax: missing required children | Error |
| E-COMPONENT-031 | §15.12 | Component render syntax: unexpected extra content | Error |
| E-COMPONENT-033 | §16.8 | `render` call references unknown snippet | Error |
| E-COMPONENT-034 | §16.8 | `render` call arity mismatch with snippet declaration | Error |
| E-DG-001 | §31 | Dependency graph: circular dependency in reactive graph | Error |
| E-ERROR-008 | §19.2 | Error type variant uses reserved field name | Error |
| E-MARKUP-003 | §24.1 | Unknown attribute on known HTML element | Error |
| E-MU-001 | §35 | Must-use: return value of `!` function not captured | Error |
| E-PA-002 | §11.3 | Protect analyzer: invalid `protect=` syntax | Error |
| E-PARSE-001 | §4 | Parse error: unexpected token in block structure | Error |
| E-PARSE-002 | §4 | Parse error: unterminated block | Error |
| E-STATE-004 | §11.1 | State type: duplicate field name | Error |
| E-STATE-005 | §11.1 | State type: field type references unknown type | Error |
| E-STATE-006 | §11.1 | State type: invalid field default value | Error |
| E-STYLE-001 | §9 | CSS: syntax error in `#{}` style block | Error |
| E-TEST-001 | §~ | `~{}` test block: assertion failed | Test |
| E-TEST-002 | §~ | `~{}` test block: unexpected error during execution | Test |
| E-TEST-003 | §~ | `~{}` test block: timeout exceeded | Test |
| E-TEST-004 | §~ | `~{}` test block: references variable from outer scope | Test |
| E-TEST-005 | §~ | `~{}` test block: invalid test structure | Test |
| E-TYPE-004 | §14.3 | Struct field access on non-struct type | Error |
| E-TYPE-052 | §14.2 | InitCap algorithm: type name must be PascalCase | Error |
| E-TYPE-080 | §19.7 | Non-exhaustive error handler: not all error variants covered | Error |

---

## 35. Linear Types — `lin`

### 35.1 Overview

A `lin` variable must be consumed exactly once. This is a compile-time guarantee, not a runtime check. The compiler enforces it by static analysis of every execution path through the program.

`lin` is used when a value must not be silently discarded and must not be used twice. The canonical use cases are: values that carry identity or ownership (auth tokens, transaction handles, one-time resources), and `~` (§32), which is a built-in `lin` variable.

### 35.2 Declaration Syntax

```scrml
lin x = fetchToken()
```

`lin` is a declaration keyword. It takes the same syntactic position as `let` and `const`.

```
lin-declaration ::= 'lin' identifier '=' expression
```

A `lin` declaration binds a name to a value and marks that binding as linear. The binding is immutable — the developer cannot assign a new value to a `lin` variable after declaration.

**Normative statements:**

- `lin` SHALL be a declaration keyword valid inside any logic context `${ }` body and inside any function body.
- A `lin` declaration SHALL bind the identifier immutably. The compiler SHALL reject any reassignment to a `lin`-declared identifier after its initial declaration.
- A function parameter MAY be declared `lin` by prefixing it with the `lin` keyword (§35.2.1). A `lin`-annotated parameter is treated as a linear binding at function entry; the consume-exactly-once rule (§35.3) applies to it for the duration of the function body.

### 35.2.1 Linear Function Parameters

A function parameter may be declared linear by prefixing it with `lin`:

```scrml
function processToken(lin token: string) {
    useToken(token)   // consumed exactly once — valid
}

server function submitRequest(lin ticket: RequestTicket) {
    sendTicket(ticket)
}

fn transform(lin src: Data, dst: Data) {
    dst.value = src.value   // lin src consumed exactly once
}
```

The grammar extension is:

```
parameter ::= ['lin'] identifier [':' type-annotation]
```

**Semantics:**

- A `lin`-annotated parameter is **bound as linear at function entry**. Before the function returns on any execution path, the parameter must have been consumed exactly once.
- The consume-exactly-once rule (§35.3) applies identically to `lin` parameters as it does to `lin` local declarations. All five consumption events (expression read, function argument, closure capture, `lift`, match subject) apply.
- All three error conditions (E-LIN-001, E-LIN-002, E-LIN-003) apply to `lin` parameters originating from the function's parameter list.
- A `lin` parameter interacts with `lift`, closures, and `match` exactly as a `lin` local declaration declared immediately at the top of the function body.
- The `lin` parameter keyword does NOT affect the calling convention or JS output. It is a compile-time constraint only.

**Control flow (§35.4 rules apply):**

- If the function has an `if`/`else` conditional, the `lin` parameter must be consumed in both branches (E-LIN-003 if asymmetric).
- If the function body contains a `match`, every arm must consume the `lin` parameter exactly once.
- The `lin` parameter must not be consumed inside a loop body (E-LIN-002), per the outer-scope loop rule (§35.4.4).

**Normative statements:**

- A `lin`-annotated parameter SHALL be bound as linear at function entry. The compiler SHALL enforce the consume-exactly-once rule (§35.3) on every execution path through the function body.
- The compiler SHALL emit E-LIN-001 if a `lin` parameter is not consumed on at least one execution path through the function body.
- The compiler SHALL emit E-LIN-002 if a `lin` parameter is consumed more than once on any execution path.
- The compiler SHALL emit E-LIN-003 if a `lin` parameter is consumed in some branches but not all.
- A `lin` parameter annotation SHALL have no effect on the emitted JS output. The constraint is compile-time only.

### 35.3 Consumption Events

The following operations consume a `lin` variable. Each counts as exactly one use:

1. **Reading in an expression.** `let y = x` where `x` is `lin`. The identifier on the right-hand side is the consumption.
2. **Passing as a function argument.** `process(x)` where `x` is `lin`. Passing to a function is a consumption regardless of what the function does with the value.
3. **Capturing in a closure.** `let f = () => { use(x) }` where `x` is `lin`. The closure capture is the consumption event, even if `f` is never called.
4. **Lifting.** `lift x` where `x` is `lin`. The `lift` statement consumes `x` and initializes `~` to the lifted value (§32.2).
5. **Pattern match subject.** `match x { ... }` where `x` is `lin`. Providing a `lin` variable as the match subject is a consumption. Branch consistency rules apply (§34.4.3).

The key principle: the existence of a reference to a `lin` identifier in a consuming position is the consumption. Whether the consuming function reads the value, or whether the closure is ever invoked, is irrelevant to the static count.

**Normative statements:**

- The compiler SHALL count each appearance of a `lin` identifier in a consuming position as one use.
- The compiler SHALL verify, for every `lin` declaration, that exactly one consumption appears on every execution path from declaration to scope exit.
- Assigning a `lin` value into a data structure field (e.g., `obj.field = x`) SHALL count as one consumption.

### 35.4 Control Flow Interactions

#### 34.4.1 Sequential code

A `lin` variable declared and consumed once in straight-line code is trivially valid.

```scrml
lin token = fetchToken()
useToken(token)   // consumed exactly once — valid
```

#### 34.4.2 `if`/`else`

A `lin` variable consumed in both branches of an `if`/`else` is consumed exactly once on every execution path and is valid.

A `lin` variable consumed in only one branch is not consumed on the other branch's execution path — E-LIN-003.

An `if` without an `else` that consumes the `lin` variable in the `if` body is E-LIN-003, because the implicit else path (fall-through) does not consume the variable.

```scrml
// Valid — consumed in both branches
lin token = fetchToken()
if (admin) {
    useAdminToken(token)
} else {
    useToken(token)
}

// Invalid — E-LIN-003: no else; token unconsumed on false path
lin token = fetchToken()
if (admin) {
    useAdminToken(token)
}
```

**Normative statements:**

- A `lin` variable consumed inside an `if` block but not in the corresponding `else` (or where no `else` exists) SHALL be a compile error (E-LIN-003).
- A `lin` variable consumed in both the `if` and `else` blocks SHALL be valid.
- If neither branch consumes the `lin` variable and the variable exits scope after the conditional, E-LIN-001 fires.

#### 34.4.3 `match` arms

A `lin` variable used as the match subject (§34.3 rule 5) or consumed inside match arm bodies must be handled consistently across all arms. Every arm must consume the variable exactly once.

This rule is coordinated with the exhaustiveness checker (§18). The exhaustiveness checker SHALL run before the linear type checker on the same `match` expression. A non-exhaustive match is E-TYPE-020 and is reported before E-LIN-003 is evaluated; linear type analysis is deferred on non-exhaustive matches.

```scrml
// Valid — consumed in all arms
lin token = fetchToken()
match role {
    .Admin => useAdminToken(token)
    .User  => useToken(token)
    .Guest => discardToken(token)
}

// Invalid — E-LIN-003: .Guest arm does not consume token
lin token = fetchToken()
match role {
    .Admin => useAdminToken(token)
    .User  => useToken(token)
    .Guest => doSomethingElse()   // token not consumed — E-LIN-003
}
```

**Normative statements:**

- In an exhaustive `match` expression, every arm body SHALL consume any `lin` variable that was in scope and not yet consumed at the match expression boundary. Failure is E-LIN-003.
- The exhaustiveness checker SHALL run before the linear type checker on the same `match` expression. E-TYPE-020 is reported first; E-LIN-003 evaluation is deferred until exhaustiveness is satisfied.

#### 34.4.4 Loops

A `lin` variable consumed inside a loop body is potentially consumed zero times (if the loop does not execute) or many times (if it does). Either case is an error.

```scrml
lin token = fetchToken()
for (item of items) {
    useToken(token)   // Error E-LIN-002: token consumed on every iteration
}
```

`lin` variables from **outer scope** SHALL NOT be consumed inside loop bodies. To use a `lin` value from an outer scope in an iteration context, the developer must consume it once outside the loop or before the loop begins.

**Loop-body carve-out (§34.4.4.1):** A `lin` variable that is both **declared and consumed within the same loop iteration** is permitted. This allows each iteration to mint, use, and consume a fresh linear resource independently. The `lin` variable must not escape the iteration — it must be fully consumed before the iteration ends.

```scrml
// Valid — lin declared and consumed within each iteration
for (const item of items) {
    lin token = mintToken()
    submitOne(token)  // consumed within iteration — valid
}

// Invalid — outer lin consumed inside loop — E-LIN-002
lin token = mintToken()
for (const item of items) {
    submitOne(token)  // Error E-LIN-002: outer lin consumed inside loop
}

// Invalid — loop-local lin not consumed before iteration ends — E-LIN-001
for (const item of items) {
    lin token = mintToken()
    // token never consumed — Error E-LIN-001
}
```

**Normative statements:**

- A `lin` variable from an outer scope consumed inside any loop body (`for`, `while`, `do...while`) SHALL be a compile error (E-LIN-002).
- A `lin` variable declared inside a loop body and consumed within the **same iteration** SHALL be valid (loop-body carve-out, §34.4.4.1).
- A `lin` variable declared inside a loop body that is NOT consumed before the iteration scope ends SHALL be a compile error (E-LIN-001).
- The compiler SHALL verify, for each loop-local `lin` variable, that exactly one consumption appears on every path before the iteration scope exits.

### 35.5 Error Conditions

**E-LIN-001: `lin` variable not consumed before scope exit.**

The `lin` variable was declared but has zero consumption sites on at least one execution path before the scope exits.

```scrml
${
    lin token = fetchToken()
    let result = doWork()
    // token never used before scope exit — Error E-LIN-001
}
```

> E-LIN-001: `lin` variable `token` is declared at line N but is not consumed before scope exit. A `lin` variable must be used exactly once. Either consume `token` before the scope ends, or remove the `lin` keyword if single-use is not required.

**E-LIN-002: `lin` variable consumed more than once.**

The `lin` variable has more than one consumption site on the same execution path.

```scrml
${
    lin token = fetchToken()
    authenticate(token)   // first use
    log(token)            // Error E-LIN-002: second use
}
```

> E-LIN-002: `lin` variable `token` is used at line N and again at line M. A `lin` variable must be used exactly once. Remove one use, or use a regular `let` binding if the value needs to be referenced more than once.

**E-LIN-003: `lin` variable consumed in some branches but not all.**

The `lin` variable is consumed on at least one execution path but not consumed on at least one other execution path.

```scrml
${
    lin token = fetchToken()
    if (needsAuth) {
        authenticate(token)   // consumed here
    }
    // else path: token not consumed — Error E-LIN-003
}
```

> E-LIN-003: `lin` variable `token` is consumed in the `if` branch (line N) but not consumed in the `else` path. Add a consumption in the `else` path, or restructure to consume `token` unconditionally before the conditional.

**E-LIN-005: `let` / `const` / `lin` declaration shadows an in-scope `lin` variable.**

A declaration introduces a name that already resolves, via the lexical scope chain, to a `lin` binding in a strictly enclosing scope. Shadowing a `lin` variable prevents the compiler from determining which binding a consumption refers to, and the proposed rename is always safe.

```scrml
${
    function outer() {
        lin token = fetchToken()
        for (let i = 0; i < 3; i = i + 1) {
            let token = i   // Error E-LIN-005: shadows outer `lin token`
        }
        use(token)
    }
}
```

> E-LIN-005: `let token` shadows an in-scope `lin` variable of the same name. Shadowing a `lin` variable prevents the compiler from determining which binding a consumption refers to. Rename the new binding, or consume the outer `lin token` before this declaration.

**Normative statements:**

- The compiler SHALL emit E-LIN-001 when a `lin` variable has zero consumption sites on any execution path from its declaration to its scope exit.
- The compiler SHALL emit E-LIN-002 when a `lin` variable has more than one consumption site on any execution path.
- The compiler SHALL emit E-LIN-003 when a `lin` variable is consumed on some execution paths but not others.
- The compiler SHALL emit E-LIN-005 when a `let`, `const`, or `lin` declaration has the same name as an in-scope `lin` variable declared in a strictly enclosing scope. A same-scope rebinding is not shadowing in the hierarchical sense and is not covered by E-LIN-005.
- `~` is subject to the same rules; E-TILDE-001 and E-TILDE-002 (§32.5) are the `~`-specific forms of E-LIN-001 and E-LIN-002 respectively.
- All `lin` errors SHALL be reported at the TS stage (Stage 6) as part of the linear type pass, after type resolution and route inference.
- The linear type pass SHALL run after the exhaustiveness checker on `match` expressions (§34.4.3).

### 35.6 Interaction with Closures

Capturing a `lin` variable in a closure counts as one consumption (§34.3 rule 3). The capture is the consumption event regardless of whether the closure is ever called.

```scrml
lin token = fetchToken()
let process = () => { useToken(token) }   // token consumed here (captured)
useToken(token)                            // Error E-LIN-002: token used again
```

A `lin` variable may be captured in at most one closure. Capturing it in more than one closure is E-LIN-002.

```scrml
lin token = fetchToken()
let a = () => { useToken(token) }   // consumes token
let b = () => { useToken(token) }   // Error E-LIN-002: token used again
```

**Design rationale:** Closure capture is a consumption because the closure holds a reference to the value. The compiler cannot statically determine how many times or when the closure will be called. Treating capture as consumption prevents the use-count from depending on dynamic call patterns.

**Normative statements:**

- Capturing a `lin` variable in a closure (arrow function expression or `function` expression) SHALL count as one consumption of that `lin` variable.
- The compiler SHALL track closure captures as consumption events during the linear type pass.
- Capturing the same `lin` variable in more than one closure SHALL be a compile error (E-LIN-002).
- Capturing a `lin` variable in a closure AND referencing it outside the closure on the same execution path SHALL be a compile error (E-LIN-002).

### 35.7 Interaction with Server/Client Boundary

**Open question — tracked as core open question 3 (see §1):** The exact semantics of a `lin` variable consumed by a server-escalated function call are not yet fully resolved.

**Working position (subject to revision):** A `lin` variable passed as an argument to a server-escalated function is consumed at the call site on the client, per §34.3 rule 2. The server function receives a serialized copy. The `lin` guarantee applies to the client-side variable only; it does not extend to the serialized copy on the server.

**Normative statements (working position):**

- Passing a `lin` variable as an argument to a server-escalated function SHALL count as one consumption of that variable, at the call site on the client.
- The `lin` guarantee SHALL NOT extend across the server/client boundary. The server-side copy of the value is not tracked as `lin`.
- The compiler SHALL emit W-LIN-001 when a `lin` variable is passed to a server-escalated function, informing the developer that the `lin` guarantee does not apply to the server-side copy.

This working position SHALL remain in effect until core open question 3 is formally resolved. The resolution SHALL be recorded as a spec update and an ADR.

### 35.8 Interaction with `~`

`~` is a built-in `lin` variable. The full `lin` rule set applies to `~`.

- E-TILDE-001 (§32.5) is E-LIN-001 applied to `~`: `~` referenced but not initialized (zero uses of the uninitialized slot).
- E-TILDE-002 (§32.5) is E-LIN-002 applied to `~`: `~` initialized but not consumed before reinit or scope exit (more than one initialization without an intervening consumption).
- E-LIN-003 applies to `~` under the same branch consistency rules as any other `lin` variable.

The `~`-specific error codes exist for diagnostic clarity. The error messages for E-TILDE-001 and E-TILDE-002 refer to `~` by name and describe the `~`-specific initialization mechanics (unassigned expression, `lift`). The underlying enforcement is identical to E-LIN-001 and E-LIN-002.

**Normative statements:**

- `~` SHALL be tracked as a `lin` variable by the linear type checker. The same enforcement pass handles both named `lin` declarations and `~`.
- E-TILDE-001 and E-TILDE-002 SHALL be reported by the same pass that enforces E-LIN-001 and E-LIN-002. They are not a separate pass.

See §31 for the complete specification of `~` including initialization rules, context boundary rules, and the `lift`-interaction elision exception.

### 35.9 Worked Examples

**Valid — basic single use:**
```scrml
${
    lin token = fetchToken()
    authenticate(token)       // consumed exactly once
}
```

**Valid — consumed in all match arms:**
```scrml
${
    lin token = fetchToken()
    match role {
        .Admin => adminAuth(token)
        .User  => userAuth(token)
        .Guest => guestAuth(token)
    }
}
```

**Valid — captured in closure (single capture = one use):**
```scrml
${
    lin token = fetchToken()
    let handler = () => { authenticate(token) }   // consumed by capture
    registerHandler(handler)
}
```

**Invalid — E-LIN-001: zero uses:**
```scrml
${
    lin token = fetchToken()
    let result = doWork()
    // token never used — Error E-LIN-001
}
```

> E-LIN-001: `lin` variable `token` is declared at line N but is not consumed before scope exit. Either consume `token` before the scope ends, or remove the `lin` keyword if single-use is not required.

**Invalid — E-LIN-002: double use:**
```scrml
${
    lin token = fetchToken()
    authenticate(token)   // first use
    log(token)            // Error E-LIN-002: second use
}
```

> E-LIN-002: `lin` variable `token` is used at line N (`authenticate`) and again at line M (`log`). A `lin` variable must be used exactly once. Remove one use, or use a regular `let` binding if the value needs to be referenced more than once.

**Invalid — E-LIN-003: branch asymmetry:**
```scrml
${
    lin token = fetchToken()
    if (needsAuth) {
        authenticate(token)
    }
    // else path: token not consumed — Error E-LIN-003
}
```

> E-LIN-003: `lin` variable `token` is consumed in the `if` branch (line N) but not consumed in the `else` path. Add a consumption in the `else` path, or restructure to consume `token` unconditionally before the conditional.

## 36. Input State Types — `<keyboard>`, `<mouse>`, `<gamepad>`

### 36.1 Overview

Input state types are built-in state types that provide reactive access to keyboard, mouse,
and gamepad input. They follow the same lifecycle pattern as `<timer>` and `<poll>`:

- They are declared as markup elements in the program body.
- They emit no HTML output.
- The compiler generates JS runtime setup code that registers event listeners and starts
  polling on mount.
- They automatically clean up their listeners and polling loops on scope destruction.
- They expose a named state object accessible by the user-supplied `id`.

**Design rationale:** Without input state types, every interactive scrml application that
uses a canvas, game loop, or custom interaction model must write 5–15 lines of
addEventListener/removeEventListener boilerplate per input device. Input state types
eliminate this boilerplate by making the compiler responsible for listener management,
following the same guarantee the `<timer>` and `<poll>` built-ins provide for interval timers.

**Decision provenance:** Ratified by debate verdict (gaming-canvas-primitives-2026-04-01
deep-dive). The verdict: `<keyboard>`, `<mouse>`, and `<gamepad>` are built-in. Asset
loading and audio are stdlib-first (not language built-ins).

---

### 36.2 `<keyboard>`

The `<keyboard>` state type provides reactive access to keyboard state. It manages
`keydown` and `keyup` event listeners on `document`.

#### Syntax

```scrml
<keyboard id="keys"/>
```

#### Attributes

| Attribute | Type     | Required | Description                          |
|-----------|----------|----------|--------------------------------------|
| `id`      | string   | YES      | Name for `<#id>` reference access   |

#### Accessible Properties

After declaration, the keyboard state is accessible via `<#id>`:

```scrml
<keyboard id="keys"/>

${
    function gameLoop() {
        if (<#keys>.pressed("ArrowLeft"))  @x = @x - 5
        if (<#keys>.justPressed("Space"))  jump()
        if (<#keys>.justReleased("Shift")) endSprint()
        animationFrame(gameLoop)
    }
    animationFrame(gameLoop)
}
```

| Property / Method                      | Type                         | Description                                                   |
|----------------------------------------|------------------------------|---------------------------------------------------------------|
| `.pressed(key: string) -> boolean`     | method                       | True while the named key is currently held down               |
| `.justPressed(key: string) -> boolean` | method                       | True from the `keydown` event until the key is released       |
| `.justReleased(key: string) -> boolean`| method                       | True from the `keyup` event until the key is pressed again    |
| `.modifiers`                           | `{ shift, ctrl, alt, meta }` | Current state of modifier keys (booleans)                     |
| `.lastKey`                             | `string \| not`              | The most recently pressed key                                 |

**Key names:** Key names follow the `KeyboardEvent.key` Web API standard. Examples:
`"ArrowLeft"`, `"ArrowRight"`, `"Space"`, `"Enter"`, `"a"`, `"A"`, `"Shift"`, `"Control"`.

#### `justPressed` / `justReleased` Semantics

`justPressed(key)` returns `true` from the moment the `keydown` event fires for `key`
until the `keyup` event fires for the same key. This is edge-based (fires once per keydown
event), not frame-based.

`justReleased(key)` returns `true` from the moment the `keyup` event fires for `key`
until the next `keydown` event fires for the same key.

In animation loops, call `<#id>._clearFrameState()` at the top of each frame to reset
`justPressed` and `justReleased` to frame-accurate semantics (they become true for exactly
one frame per event):

```scrml
<keyboard id="keys"/>

${
    function gameLoop() {
        <#keys>._clearFrameState()          // reset just-state for this frame
        if (<#keys>.justPressed("Space")) shoot()
        animationFrame(gameLoop)
    }
    animationFrame(gameLoop)
}
```

#### Cleanup

On scope destruction, the compiler emits `document.removeEventListener` calls for both
`keydown` and `keyup` listeners. This is automatic — no developer action is required.

---

### 36.3 `<mouse>`

The `<mouse>` state type provides reactive access to mouse position and button state.
It manages `mousemove`, `mousedown`, `mouseup`, and `wheel` event listeners.

#### Syntax

```scrml
<mouse id="cursor"/>
<mouse id="canvasMouse" target=@canvasEl/>
```

#### Attributes

| Attribute | Type        | Required | Description                                              |
|-----------|-------------|----------|----------------------------------------------------------|
| `id`      | string      | YES      | Name for `<#id>` reference access                       |
| `target`  | element ref | NO       | Element to attach listeners to. Defaults to `document`. |

When `target=@canvasEl` is used, mouse events are scoped to that element.
When `target` is absent, events are captured on `document`.

#### Accessible Properties

```scrml
<mouse id="cursor"/>

${
    function gameLoop() {
        const mx = <#cursor>.x
        const my = <#cursor>.y
        if (<#cursor>.pressed(0)) @dragging = true   // left button
        if (<#cursor>.pressed(2)) openContextMenu()  // right button
        animationFrame(gameLoop)
    }
    animationFrame(gameLoop)
}
```

| Property / Method                       | Type     | Description                                                          |
|-----------------------------------------|----------|----------------------------------------------------------------------|
| `.x -> number`                          | property | Current mouse X position in pixels                                   |
| `.y -> number`                          | property | Current mouse Y position in pixels                                   |
| `.buttons -> number`                    | property | Bitmask of pressed mouse buttons (follows `MouseEvent.buttons`)      |
| `.pressed(button: number) -> boolean`   | method   | True if the given button is pressed. 0=left, 1=middle, 2=right       |
| `.wheel -> number`                      | property | Accumulated scroll delta since last `_clearFrameState()` or reset    |

**Button numbering:** Follows `MouseEvent.button` / `MouseEvent.buttons` Web API conventions.

#### Wheel Delta

`.wheel` accumulates `wheelEvent.deltaY` values. In game loops, call
`<#id>._clearFrameState()` at the top of each frame to reset `.wheel` to zero so each
frame sees only the scroll events from that frame.

#### Cleanup

On scope destruction, all four event listeners are removed from the target element (or
`document`) automatically via `_scrml_register_cleanup`.

---

### 36.4 `<gamepad>`

The `<gamepad>` state type provides reactive access to gamepad input. Unlike keyboard and
mouse, the Gamepad API is polling-based — it does not emit events. The `<gamepad>` runtime
polls `navigator.getGamepads()` on each `requestAnimationFrame` tick while the state type
is active.

#### Syntax

```scrml
<gamepad id="pad"/>
<gamepad id="pad1" index=1/>
```

#### Attributes

| Attribute | Type              | Required | Default | Description                          |
|-----------|-------------------|----------|---------|--------------------------------------|
| `id`      | string            | YES      |         | Name for `<#id>` reference access   |
| `index`   | 0 \| 1 \| 2 \| 3 | NO       | `0`     | Which gamepad to read                |

#### Accessible Properties

```scrml
<gamepad id="pad"/>

${
    function gameLoop() {
        if (<#pad>.connected) {
            const lx = <#pad>.axes[0]   // left stick X, range [-1, 1]
            const ly = <#pad>.axes[1]   // left stick Y, range [-1, 1]
            @playerX = @playerX + lx * @speed
            @playerY = @playerY + ly * @speed

            if (<#pad>.pressed(0)) fire()  // A button (Xbox) / Cross (PS)
        }
        animationFrame(gameLoop)
    }
    animationFrame(gameLoop)
}
```

| Property / Method                       | Type                                 | Description                                              |
|-----------------------------------------|--------------------------------------|----------------------------------------------------------|
| `.connected -> boolean`                 | property                             | True when a gamepad is connected at the given index      |
| `.axes -> number[]`                     | property                             | Axis values, each in range [-1, 1]                       |
| `.buttons -> { pressed: boolean, value: number }[]` | property              | Button state array                                       |
| `.pressed(index: number) -> boolean`    | method                               | True if the button at the given index is pressed         |

**Axis conventions:** Axis 0 = left stick X, Axis 1 = left stick Y, Axis 2 = right stick X,
Axis 3 = right stick Y (standard layout, but hardware varies).

**Button conventions:** Button 0 = A/Cross, Button 1 = B/Circle, Button 2 = X/Square,
Button 3 = Y/Triangle (standard layout). Check `navigator.getGamepads()[n].mapping` to
determine if the `"standard"` mapping applies.

#### Polling Model

The `<gamepad>` runtime starts a `requestAnimationFrame` polling loop when the state type
mounts. The loop calls `navigator.getGamepads()[index]` each frame and updates the internal
state. On scope destruction, `cancelAnimationFrame` stops the polling loop.

**Battery/performance note:** The polling loop runs at display refresh rate (~60fps or
higher). If gamepad input is not needed, do not declare `<gamepad>`.

#### `index` must be 0–3

The Gamepad API supports at most 4 simultaneously connected gamepads (indices 0–3).
Specifying `index` outside this range is a compile error (E-INPUT-004).

---

### 36.5 Scope Destruction and Cleanup Guarantee

All three input state types (`<keyboard>`, `<mouse>`, `<gamepad>`) guarantee automatic
cleanup on scope destruction. "Cleanup" means:

- `<keyboard>`: `document.removeEventListener("keydown", ...)` and
  `document.removeEventListener("keyup", ...)`
- `<mouse>`: `target.removeEventListener(...)` for all four event types
- `<gamepad>`: `cancelAnimationFrame(...)` for the polling loop

Cleanup is registered via `_scrml_register_cleanup` at element mount time. The cleanup
guarantee holds even if the scope is destroyed during an active animation frame.

**Normative statement:** The compiler SHALL emit a `_scrml_register_cleanup` call for
every `<keyboard>`, `<mouse>`, and `<gamepad>` element. Failure to emit this call is a
compiler bug, not a user error.

---

### 36.6 Interaction with `animationFrame`

Input state types are designed to be read in animation loops. The typical pattern:

```scrml
<keyboard id="keys"/>
<mouse id="cursor"/>

<canvas ref=@canvas width="800" height="600">
    ${
        const ctx = @canvas.getContext('2d')

        function gameLoop() {
            <#keys>._clearFrameState()    // optional: frame-accurate justPressed
            <#cursor>._clearFrameState()  // optional: per-frame wheel delta

            // Read input state
            if (<#keys>.pressed("ArrowRight")) @x = @x + 5
            if (<#keys>.justPressed("Space"))  jump()
            const mouseX = <#cursor>.x

            // Render
            ctx.clearRect(0, 0, 800, 600)
            ctx.fillRect(@x, @y, 32, 32)

            animationFrame(gameLoop)
        }
        animationFrame(gameLoop)
    }
</>
```

Input state is read at the moment of the `animationFrame` callback — no reactive
subscriptions are set up. This is intentional: input drives imperative game logic, not
reactive state updates. If you need to trigger a reactive update from input, assign to an
`@variable` inside the loop.

---

### 36.7 Error Codes

**E-INPUT-001: `<keyboard>` missing required `id` attribute.**

```scrml
<keyboard/>   // Error: no id
```

> E-INPUT-001: `<keyboard>` requires an `id` attribute. Without an id, the keyboard state
> cannot be referenced via `<#id>`. Add `id="yourName"` to the element.

**E-INPUT-002: `<mouse>` missing required `id` attribute.**

```scrml
<mouse/>   // Error: no id
```

> E-INPUT-002: `<mouse>` requires an `id` attribute. Without an id, the mouse state cannot
> be referenced via `<#id>`. Add `id="yourName"` to the element.

**E-INPUT-003: `<gamepad>` missing required `id` attribute.**

```scrml
<gamepad index=0/>   // Error: no id
```

> E-INPUT-003: `<gamepad>` requires an `id` attribute. Without an id, the gamepad state
> cannot be referenced via `<#id>`. Add `id="yourName"` to the element.

**E-INPUT-004: `<gamepad index=>` out of range.**

```scrml
<gamepad id="pad" index=5/>   // Error: index 5 is invalid
```

> E-INPUT-004: `<gamepad>` attribute `index` must be 0, 1, 2, or 3 (the Gamepad API
> supports at most 4 simultaneous gamepads). Got `5`. Use a value in [0, 1, 2, 3].

**E-INPUT-005: Duplicate input state type `id` within the same scope.**

```scrml
<keyboard id="keys"/>
<keyboard id="keys"/>   // Error: duplicate id "keys"
```

> E-INPUT-005: Duplicate input state id `"keys"`. Each input state type must have a unique
> id within its scope. Choose a different id for the second `<keyboard>`.

**Normative statements:**

- The compiler SHALL emit E-INPUT-001 when `<keyboard>` has no `id` attribute.
- The compiler SHALL emit E-INPUT-002 when `<mouse>` has no `id` attribute.
- The compiler SHALL emit E-INPUT-003 when `<gamepad>` has no `id` attribute.
- The compiler SHALL emit E-INPUT-004 when `<gamepad index=>` is not in [0, 1, 2, 3].
- The compiler SHALL emit E-INPUT-005 when two input state type elements in the same scope
  share the same `id`.
- All E-INPUT-* errors are CG stage errors (Stage 8). They do not block earlier stages.


---

## 37. Server-Sent Events — `server function*` SSE Generators

### 37.1 Overview

A `server function*` is a server-annotated generator function that compiles to a Server-Sent Events (SSE) endpoint. The compiler generates a `text/event-stream` GET route on the server and an `EventSource`-based stub on the client. Developers write standard generator syntax (`function*` with `yield`) inside the scrml logic block. No EventSource or ReadableStream code appears in the source — those are compiler-emitted infrastructure.

This feature composes three existing scrml concepts:
1. The `server` keyword — marks a function as executing on the server
2. `function*` — JavaScript generator function syntax, valid inside `${ }`
3. `yield` — sends one SSE event to all connected clients

**Design principle:** The `server function*` pattern is intended for use cases where the server pushes a finite or infinite stream of values to the client: live counters, real-time feeds, progress reporting, reactive data subscriptions. It is not a replacement for WebSockets; it is a long-lived GET stream from server to client.

### 37.2 Syntax

```scrml
${
    server function* name(params) {
        body — yield expressions send events
    }
}
```

The `*` immediately follows the `function` keyword with no whitespace required. The name, params, and body follow standard function declaration syntax. The body may contain `yield`, `let`, `const`, `@reactive` assignments, `for`, `if`, control flow, and calls to other functions.

**Valid examples:**

```scrml
${
    // Simple counter stream
    server function* countdown(from) {
        for (let i = from; i >= 0; i--) {
            yield i
        }
    }

    // Live data feed
    server function* livePrices() {
        while (true) {
            let price = ?{ SELECT price FROM stocks WHERE symbol = "AAPL" }
            yield price
        }
    }

    // Named events with structured payloads
    server function* activityFeed(userId) {
        for await (let event of watchUser(userId)) {
            yield { event: "activity", data: event, id: event.id }
        }
    }
}
```

**Invalid — yield in non-generator server function (E-SSE-001):**

```scrml
${
    server function badFn() {
        yield 1     // Error E-SSE-001: yield outside generator
    }
}
```

### 37.3 Route Assignment

The compiler assigns every `server function*` a GET route with `Content-Type: text/event-stream`. The route path follows the standard RI-generated naming convention: `/_scrml/<generated-route-name>`. No `method=` annotation is required or permitted on SSE generators — the method is always GET.

**Route properties for `server function*`:**
- Method: `GET` (compiler-enforced, not developer-configurable)
- Content-Type: `text/event-stream`
- Cache-Control: `no-cache`
- Connection: `keep-alive`
- Body: `ReadableStream` (async generator inside)

The route name is generated by RI using the same naming scheme as all server functions: `__ri_route_<functionName>_<n>` where `<n>` is a monotonic counter.

### 37.4 Event Shape

#### 36.4.1 Simple yield

When the yielded value is anything other than an object with both `event` and `data` fields, the compiler emits:

```
data: <JSON.stringify(value)>\n\n
```

Examples:
- `yield 42` → `data: 42\n\n`
- `yield "hello"` → `data: "hello"\n\n`
- `yield { x: 1 }` → `data: {"x":1}\n\n`

#### 36.4.2 Named events

When the yielded value is an object with the shape `{ event: string, data: any }`, the compiler emits a named SSE event:

```
event: <value.event>\n
data: <JSON.stringify(value.data)>\n\n
```

If the object also has an `id` field, a server-sent event ID is emitted:

```
event: <value.event>\n
id: <value.id>\n
data: <JSON.stringify(value.data)>\n\n
```

#### 36.4.3 Last-Event-ID reconnection

The SSE handler exposes `route.lastEventId` (from the HTTP `Last-Event-ID` header) to the generator body. Generators can use this to resume from the last acknowledged event after a reconnection.

```scrml
server function* resumableStream() {
    let cursor = route.lastEventId ?? 0
    // resume from cursor
}
```

### 37.5 Client-Side Binding

On the client, calling a `server function*` by name creates an `EventSource` connection and registers a message handler. The EventSource stub is auto-generated by the compiler; the developer calls the function as if it returns a stream.

#### 36.5.1 Reactive assignment

Assigning the result of a generator call to an `@` reactive variable binds the variable to the stream. Each SSE event updates the variable and triggers reactive re-render.

```scrml
${
    @latestPrice = livePrices()
}
<p>Current price: ${@latestPrice}</>
```

`@latestPrice` is updated on every SSE event. The reactive system treats each update as a normal `@variable` write — all computed values and DOM bindings derived from `@latestPrice` re-evaluate.

#### 36.5.2 for/lift integration

A generator call used as the iterable in `for/lift` re-lifts the body on each SSE event:

```scrml
${
    for (let update of activityFeed(@userId)) {
        lift <div class="update">${update.text}</>
    }
}
```

Each SSE event appends or updates the lifted DOM node using the standard `lift` reconciliation semantics (keyed or unkeyed, per §10).

### 37.6 Lifecycle and Cleanup

The compiler auto-registers a cleanup function for every `EventSource` connection created by a `server function*` call. When the component or scope that created the connection is destroyed, `eventSource.close()` is called automatically. Developers do not need to manage EventSource cleanup manually.

**Normative statements:**

- The compiler SHALL emit `_scrml_cleanup_register(() => es.close())` for every EventSource stub created from a `server function*` call.
- If `_scrml_cleanup_register` is not available in the calling scope, the cleanup registration is a no-op (the EventSource remains open until the page unloads).
- The developer SHALL NOT call `eventSource.close()` manually — cleanup is managed by the compiler-emitted lifecycle hooks.

### 37.7 E-RI-002 Exemption

`server function*` bodies are exempt from E-RI-002 (the prohibition on reactive variable assignment inside server-escalated functions). This exemption exists because the generator runs entirely on the server — it never crosses to the client. There are no reactive variables on the server; `@` references inside a generator body refer to query parameters or server-local state, not to client reactive state.

**Normative statement:**

- The compiler SHALL NOT emit E-RI-002 for reactive-assignment patterns inside a `server function*` body.

### 37.8 Security Invariants

The same security invariants that apply to standard server functions apply to SSE generators:

- The generator body (including any `?{}` SQL blocks, `protect=` field access, and server-only resources) SHALL be emitted only to the server JS output.
- The client JS output SHALL contain only the `EventSource` stub and auto-cleanup registration. No server-side logic shall appear in client JS.
- CSRF validation is NOT applied to SSE GET endpoints. SSE is read-only; GET requests are not state-mutating.

### 37.9 Error Codes

| Code | Trigger | Severity |
|---|---|---|
| E-SSE-001 | `yield` used inside a non-generator `server function` body | Error |
| W-SSE-001 | `server function*` body contains no `yield` statements | Warning |

**E-SSE-001 message:**

> E-SSE-001: `yield` inside `<functionName>` at line N. `yield` is only valid in generator functions (`function*`). To stream events, change `function` to `function*`.

**W-SSE-001 message:**

> W-SSE-001: `server function*` `<functionName>` at line N has no `yield` statements. An SSE generator with no yields will send no events and immediately close the stream. Add at least one `yield` or change `function*` to `function`.

### 37.10 Normative Statements

- A `server function*` declaration (using `function*` syntax after the `server` keyword) SHALL compile to a GET `text/event-stream` route handler on the server.
- The compiler SHALL set `isGenerator: true` on the `function-decl` AST node for `server function*` declarations.
- The compiler SHALL set `isSSE: true` and `explicitMethod: "GET"` on the `FunctionRoute` entry for `server function*` functions in the route map.
- The server handler SHALL wrap the generator body in an `async function*` and consume it with `for await`, encoding each yielded value as an SSE data frame.
- The client stub SHALL create an `EventSource` at the generated route path, attach an `onmessage` handler that JSON-parses the event data, and forward parsed values to the provided callback.
- The compiler SHALL NOT apply CPS analysis (E-RI-002) to `server function*` bodies.
- The compiler SHALL NOT apply CSRF validation to `server function*` routes.
- The generator body SHALL NOT appear in client JS output.

### 37.11 Worked Examples

**Basic live counter:**

```scrml
<program>
${
    server function* countdown(from) {
        for (let i = from; i >= 0; i--) {
            yield i
        }
    }

    @count = 0
    @count = countdown(10)
}
<p>Count: ${@count}</>
```

Compiles to server handler: GET route, ReadableStream, yields 10..0 as SSE events.
Compiles to client: EventSource stub; `@count` updated on each event.

**Resumable feed with named events:**

```scrml
${
    server function* activityFeed() {
        let cursor = route.lastEventId ?? ""
        for await (let item of db.watchActivity(cursor)) {
            yield { event: "activity", data: item, id: item.id }
        }
    }
}
```

Each item sends a named `activity` event with an ID. On reconnect, the browser sends `Last-Event-ID` and the generator resumes from that cursor.


---

## 38. WebSocket Channels — `<channel>`

### 38.1 Overview

A `<channel>` is a WebSocket state type that provides persistent bidirectional communication between client and server. Like `<timer>` and `<poll>`, it is a **lifecycle markup element** — it emits no HTML. The compiler generates the full WebSocket infrastructure: a client-side connection manager and a server-side upgrade route.

**Design principle:** `<channel>` follows the same lifecycle element pattern as `<timer>` and `<poll>`. The channel name identifies the endpoint, scopes the reactive namespace, and controls Bun pub/sub topic routing. No WebSocket or Bun-specific API appears in the scrml source.

### 38.2 Syntax

```scrml
<channel name="chat"
         topic=@room
         protect="auth"
         reconnect=2000
         onserver:open=handleOpen()
         onserver:message=handleMessage(msg)
         onserver:close=handleClose()
         onclient:open=onConnected()
         onclient:close=onDisconnected()
         onclient:error=onError(err)>
  ${
    @shared count = 0
  }
</>
```

### 38.3 Attributes

| Attribute | Required | Type | Description |
|---|---|---|---|
| `name` | **Yes** | string | Unique channel identifier. Sets WS URL: `/_scrml_ws/<name>`. |
| `topic` | No | string or `@var` | Pub/sub topic. Defaults to `name`. When the value is `not`, the channel connects but subscribes to no topic (see §38.6.2). |
| `protect` | No | string | Auth check on upgrade request. |
| `reconnect` | No | integer (ms) | Auto-reconnect delay. Default: 2000ms. 0 = disabled. |
| `onserver:open` | No | function call | Invoked server-side when a client connects. |
| `onserver:message` | No | function call | Invoked server-side when a message is received. The parameter name in the call expression is bound to the parsed message payload (see §38.6.1). |
| `onserver:close` | No | function call | Invoked server-side when a client disconnects. |
| `onclient:open` | No | function call | Invoked client-side when the WS connection opens. Does not involve the server (see §38.10). |
| `onclient:close` | No | function call | Invoked client-side when the WS connection closes. Does not involve the server (see §38.10). |
| `onclient:error` | No | function call | Invoked client-side when the WS encounters an error. The parameter name in the call expression is bound to the error object (see §38.10). |

### 38.4 Reactive Sync — `@shared`

Reactive variables declared with the `@shared` modifier inside a `<channel>` body are **automatically synchronized across all connected clients**. On every local write, the compiler emits a sync message via WebSocket. The sync wire format is: `{ __type: "__sync", __key: "<varName>", __val: <value> }`.

**E-CHANNEL-002:** `@shared` used outside a `<channel>` scope emits a compile error.

### 38.5 protect= Integration

The `protect=` attribute maps to a session cookie check in the upgrade handler. When present, the compiler injects an `_scrml_auth_check(req)` call before `server.upgrade()` is called.

### 38.6 broadcast() and disconnect() Built-ins

`broadcast(data)` and `disconnect()` are available inside **any server-annotated function or handler whose declaration appears within the lexical scope of a `<channel>` body**. This includes:

- `onserver:open`, `onserver:message`, and `onserver:close` handler functions
- Any `server function` declared inside the `${ }` body of the `<channel>` element

**Normative statements:**

- The compiler SHALL make `broadcast(data)` and `disconnect()` available in every `server function` and `onserver:*` handler declared inside a `<channel>` lexical scope.
- `broadcast(data)` SHALL publish `data` to all clients currently subscribed to the channel's active topic.
- The compiler SHALL reject (E-CHANNEL-004) any call to `broadcast()` or `disconnect()` that does not appear inside a function within a `<channel>` lexical scope.

**Worked example — valid (broadcast from a server function, not an onserver: handler):**

```scrml
<channel name="chat" topic=@room>
  ${
    @shared count = 0

    server function sendMessage(text) {
      ?{`INSERT INTO messages (body) VALUES (${text})`}.run()
      broadcast({ type: "new_message", body: text })
    }
  }
</>
```

The call to `broadcast()` inside `sendMessage` is valid because `sendMessage` is declared
within the `<channel name="chat">` lexical scope.

**Worked example — invalid (broadcast outside channel scope):**

```scrml
server function sendGlobal(text) {
  broadcast({ type: "msg", body: text })   // E-CHANNEL-004
}

<channel name="chat" topic=@room>
</>
```

The call to `broadcast()` inside `sendGlobal` is invalid because `sendGlobal` is declared
outside the `<channel>` lexical scope, even though a `<channel>` element exists in the file.

**E-CHANNEL-004:** `broadcast()` or `disconnect()` called from a function that does not appear within a `<channel>` lexical scope.

### 38.6.1 `onserver:message` Parameter Binding

The `onserver:message` attribute value is a function call expression of the form `handleMessage(param)`.
The identifier `param` is the **binding name** for the incoming message payload. The compiler generates:

```js
ws.addEventListener("message", (event) => {
  const param = JSON.parse(event.data);
  handleMessage(param);
});
```

This follows the same event-injection pattern as `onclick=handleClick(e)` (§5.2.2): the identifier
in the call expression names the value the compiler will inject, not a variable already in scope.

**Normative statements:**

- The compiler SHALL parse the call expression in `onserver:message=<call>` as `<handlerName>(<paramName>)`.
- The compiler SHALL generate a message event listener that calls `JSON.parse(event.data)`, assigns the result to `<paramName>`, and passes it as the first argument to `<handlerName>`.
- If the `onserver:message` handler expression contains no parameter (e.g., `onserver:message=handleMessage()`), the compiler SHALL still parse the message but SHALL NOT bind it to any name. The raw `event` SHALL NOT be passed to the handler in this case.
- The compiler SHALL emit an error (E-CHANNEL-005) if `onserver:message` contains more than one parameter in the call expression.

**Worked example — valid:**

```scrml
<channel name="chat"
         onserver:message=handleMessage(msg)>
  ${
    server function handleMessage(msg) {
      broadcast({ type: "echo", body: msg.text })
    }
  }
</>
```

The compiler generates a message listener that calls `JSON.parse(event.data)` and passes
the result as `msg` to `handleMessage`.

**Worked example — invalid (two parameters):**

```scrml
<channel name="chat"
         onserver:message=handleMessage(msg, extra)>
</>
// E-CHANNEL-005: onserver:message handler may only bind one parameter
```

**E-CHANNEL-005:** `onserver:message` call expression contains more than one parameter.

### 38.6.2 `topic=` Behavior When Value Is `not`

When `topic=@var` and `@var` evaluates to `not`, the `<channel>` element behaves as follows:

1. **The WebSocket connection remains open.** The HTTP upgrade handshake completes normally. `not` does not suppress connection establishment.
2. **The channel subscribes to no topic.** No pub/sub subscription is created on the server.
3. **`broadcast()` is a no-op.** Calling `broadcast()` while the topic is `not` has no effect — no message is sent to any client.
4. **`@shared` variables sync only with self.** Writes to `@shared` variables are still reflected locally in the client that made the write, but are not transmitted to any peer.
5. **Topic subscription is dynamic.** When `@var` transitions from `not` to a non-`not` value, the channel subscribes to that value as the new topic. When `@var` transitions from a non-`not` value back to `not`, the channel unsubscribes from the old topic.

**Normative statements:**

- The compiler SHALL emit a warning (W-CHANNEL-001) when `topic=@var` can be **statically proven** to always be `not` at the call site (e.g., `topic=not` as a literal, or `@var` is a `const` initialized to `not` with no writes). This is a warning, not an error.
- The compiler SHALL NOT emit W-CHANNEL-001 when the `not` state is dynamic (i.e., `@var` can hold `not` at some runtime states but a topic value at others).
- When `topic=@var` is dynamic, the compiler SHALL emit a topic subscription/unsubscription call in the client IIFE that fires on every write to `@var`. The subscription call SHALL be a no-op when the new value is `not`.

**Worked example — valid (dynamic topic, transitions through `not`):**

```scrml
@let selectedRoom = not

<channel name="chat" topic=@selectedRoom reconnect=2000>
  ${
    // When @selectedRoom is `not`:
    //   - WS is connected but subscribed to no topic
    //   - broadcast() is a no-op (W-CHANNEL-001 suppressed: dynamic)
    //   - @shared vars reflect local writes only
    // When @selectedRoom transitions to "room-42":
    //   - channel subscribes to "room-42"
    //   - @shared vars begin syncing with all clients on "room-42"
  }
</>
```

**Worked example — warning (static `not`):**

```scrml
<channel name="chat" topic=not>
</>
// W-CHANNEL-001: topic= is statically `not`; broadcast() will always be a no-op
```

**W-CHANNEL-001:** `broadcast()` will always be a no-op because `topic=` is statically proven to be `not`.

### 38.7 Client JS Output

The compiler emits a client-side IIFE: `const _scrml_ws_<safeName>`. It manages connect, reconnect (with exponential backoff), message dispatch, `@shared` sync, and cleanup registration.

The IIFE registers `onclient:open`, `onclient:close`, and `onclient:error` event listeners when those attributes are present on the `<channel>` element (see §38.10). These listeners are registered directly on the `WebSocket` instance created inside the IIFE and do not involve any server round-trip.

### 38.8 Server JS Output

The compiler emits a WebSocket upgrade route at `/_scrml_ws/<name>` and a `_scrml_ws_handlers` export for `Bun.serve()`'s `websocket:` option.

### 38.9 Error Codes

| Code | Trigger | Severity |
|---|---|---|
| E-CHANNEL-001 | `<channel>` missing required `name=` attribute | Error |
| E-CHANNEL-002 | `@shared` used outside a `<channel>` scope | Error |
| E-CHANNEL-003 | Duplicate channel name in the same file | Error |
| E-CHANNEL-004 | `broadcast()` or `disconnect()` called from a function not within a `<channel>` lexical scope | Error |
| E-CHANNEL-005 | `onserver:message` call expression contains more than one parameter | Error |
| E-CHANNEL-006 | `onclient:*` handler function declared as `server function` | Error |
| W-CHANNEL-001 | `topic=` is statically proven to be `not`; `broadcast()` will always be a no-op | Warning |

### 38.10 `onclient:*` — Client-Side Lifecycle Hooks

The `onclient:open`, `onclient:close`, and `onclient:error` attributes register event listeners on the client-side `WebSocket` instance. They are compiled to event registrations inside the client IIFE (§38.7). They do **not** involve the server and do not generate any server-side code.

#### 38.10.1 Syntax

The attribute value is a function call expression. The parameter binding follows the same event-injection pattern as §5.2.2:

| Attribute | Generated event | Injected value |
|---|---|---|
| `onclient:open` | `ws.onopen` | `event` (the WS open Event object) — bound to the parameter name in the call expression |
| `onclient:close` | `ws.onclose` | `event` (the WS CloseEvent object) — bound to the parameter name in the call expression |
| `onclient:error` | `ws.onerror` | `error` (the WS error Event object) — bound to the parameter name in the call expression |

If the call expression contains no parameter (e.g., `onclient:open=handleOpen()`), the event object is not passed to the handler.

#### 38.10.2 Normative Statements

- The compiler SHALL register `onclient:open` as the `ws.onopen` handler inside the client IIFE whenever that attribute is present on a `<channel>` element.
- The compiler SHALL register `onclient:close` as the `ws.onclose` handler inside the client IIFE whenever that attribute is present on a `<channel>` element.
- The compiler SHALL register `onclient:error` as the `ws.onerror` handler inside the client IIFE whenever that attribute is present on a `<channel>` element.
- `onclient:*` handlers SHALL execute on the client only. The compiler SHALL NOT emit any server-side code for these attributes.
- The compiler SHALL bind the parameter name in the call expression to the event object using the same injection mechanism as `onclick=handler(e)` (§5.2.2).

#### 38.10.3 Worked Examples

**Valid — connection status indicator:**

```scrml
@let connectionStatus = "connecting"

<channel name="chat"
         topic=@room
         onclient:open=handleOpen(e)
         onclient:close=handleClose(e)
         onclient:error=handleError(err)>
  ${
    function handleOpen(e) {
      @connectionStatus = "connected"
    }
    function handleClose(e) {
      @connectionStatus = "disconnected"
    }
    function handleError(err) {
      @connectionStatus = "error"
    }
  }
</>

<p>Status: {@connectionStatus}</>
```

The three `onclient:*` attributes compile to `ws.onopen`, `ws.onclose`, and `ws.onerror`
registrations inside the `_scrml_ws_chat` IIFE. No server code is generated for these handlers.

**Valid — no-parameter form:**

```scrml
<channel name="notifs"
         onclient:open=markConnected()
         onclient:close=markDisconnected()>
</>
```

The compiler generates `ws.onopen = () => { markConnected(); }` and
`ws.onclose = () => { markDisconnected(); }`. The event objects are not passed.

**Invalid — `onclient:*` handler declared with `server function`:**

```scrml
<channel name="chat"
         onclient:open=handleOpen(e)>
  ${
    server function handleOpen(e) {   // ERROR: onclient:* handlers run on client only
      broadcast({ type: "join" })
    }
  }
</>
// E-CHANNEL-006: onclient:* handler function must not be annotated server function
```

**E-CHANNEL-006:** A function designated as the handler for an `onclient:*` attribute SHALL NOT be declared `server function`. The compiler SHALL emit E-CHANNEL-006 and reject the program.

#### 38.10.4 Interaction Notes

- `onclient:*` hooks fire for each reconnect attempt, not just the initial connection. When `reconnect=` is set, `onclient:open` fires on every successful reconnect and `onclient:close` fires on every drop.
- `onclient:close` fires before the reconnect timer starts. A developer who wants to distinguish "clean close" from "unexpected drop" can inspect `e.wasClean` on the CloseEvent.
- `onclient:error` fires before `onclient:close` on error-induced disconnections (browser WebSocket model).
- `onclient:*` hooks do not interact with `@shared` sync. `@shared` sync is suspended when the connection is closed and resumes when it reopens.

---

## 39. Database Schema Declaration and Migrations — `< schema>`

**Added:** 2026-04-01 — debate verdict: declarative `< schema>` block (49.5/60). Schema-as-code with compiler-generated migration diffs.

### 39.1 Overview

scrml provides a `< schema>` state block for declaring the desired database schema directly in source. The compiler reads the declared schema at compile time, reads the actual schema from the database at the path named in the enclosing `<program db="...">` attribute, computes the diff, and generates migration SQL. The `scrml migrate` CLI command applies that SQL to the live database.

**Design principle:** The schema is code. The developer declares what the database SHOULD look like. The compiler figures out what it takes to get there. The developer never writes `ALTER TABLE` by hand.

This section extends §11 (`< db>` state blocks) and §8 (`?{}` SQL contexts). A `< schema>` block is a sibling construct to `< db>`: both are state blocks that reference the database; `< db>` scopes SQL queries, `< schema>` declares structure.

### 39.2 Syntax

```
schema-block ::= '< schema>' table-declaration* closer
table-declaration ::= table-name '{' column-declaration* '}'
column-declaration ::= column-name ':' column-type column-constraint*
column-type ::= 'text' | 'integer' | 'real' | 'blob' | 'boolean' | 'timestamp'
column-constraint ::= 'primary key' | 'not null' | 'unique' | 'default' '(' literal ')'
                    | 'references' table-name '(' column-name ')'
                    | 'rename from' identifier
```

A `< schema>` block appears at the top level of a file, alongside (not inside) `< db>` blocks. It does not require the `src=` or `tables=` attributes of `< db>` because the database path is read from `<program db="...">`.

**Worked example — valid:**

```scrml
<program db="./app.db" protect="password_hash">

< schema>
    users {
        id:         integer primary key
        email:      text not null unique
        name:       text not null
        password_hash: text not null
        created_at: timestamp default(CURRENT_TIMESTAMP)
    }
    posts {
        id:         integer primary key
        user_id:    integer not null references users(id)
        title:      text not null
        body:       text not null
        published:  boolean default(0)
        created_at: timestamp default(CURRENT_TIMESTAMP)
    }
</>

< db src="./app.db" protect="password_hash" tables="users, posts">
    ${ server function getUser(id) {
        return ?{`SELECT id, email, name FROM users WHERE id = ${id}`}.get()
    } }
</>

</program>
```

### 39.3 `< schema>` Block Attributes

The `< schema>` block takes no attributes. The database path is always read from the enclosing `<program db="...">` attribute.

**Normative statements:**

- A `< schema>` block SHALL be valid only inside a file whose `<program>` root element has a `db=` attribute. A `< schema>` block without an enclosing `<program db="...">` SHALL be a compile error (E-SCHEMA-001).
- A file SHALL NOT contain more than one `< schema>` block. A second `< schema>` block in the same file SHALL be a compile error (E-SCHEMA-002).
- A `< schema>` block SHALL appear at file top-level only. A `< schema>` block nested inside any other block SHALL be a compile error (E-SCHEMA-003).

### 39.4 Column Types

The `< schema>` block supports a fixed set of column type names that map directly to SQLite affinity types:

| scrml type  | SQLite affinity | Notes |
|---|---|---|
| `text`      | TEXT            | UTF-8 string |
| `integer`   | INTEGER         | 64-bit signed integer |
| `real`      | REAL            | 8-byte IEEE 754 float |
| `blob`      | BLOB            | Raw bytes |
| `boolean`   | INTEGER         | Stored as 0/1; scrml type system maps to `boolean` |
| `timestamp` | TEXT            | ISO 8601 string; `CURRENT_TIMESTAMP` default is valid |

**Normative statements:**

- The compiler SHALL map each `< schema>` column type to its SQLite affinity as specified in the table above.
- No other column type names SHALL be valid in a `< schema>` block. An unrecognized column type name SHALL be a compile error (E-SCHEMA-004).
- `boolean` columns SHALL be stored as `INTEGER` in SQLite with values `0` and `1`. The compiler-generated type for the column SHALL be `boolean` in the scrml type system. The compiler SHALL emit read-path coercion (`!!value`) and write-path coercion (`value ? 1 : 0`) in any generated migration or query helper.

### 39.5 Column Constraints

#### 38.5.1 `primary key`

Marks the column as the table's primary key. Exactly one column per table MAY be designated `primary key`.

- An `integer primary key` column in SQLite is an alias for the `rowid`. The compiler SHALL use this semantics directly.
- A `< schema>` table declaration with no `primary key` column SHALL generate a compile warning (W-SCHEMA-001: table has no primary key).

#### 38.5.2 `not null`

Marks the column as NOT NULL in SQLite. Violations at runtime cause SQLite to throw; the compiler does not inject runtime guards beyond the SQLite constraint.

#### 38.5.3 `unique`

Adds a UNIQUE index constraint on the column. The compiler emits `UNIQUE` in the `CREATE TABLE` statement and does not add a separate `CREATE UNIQUE INDEX` unless the migration diff requires it.

#### 38.5.4 `default(literal)`

Specifies a column default. The `literal` inside the parentheses is passed verbatim to the generated SQL `DEFAULT` clause.

- `default(CURRENT_TIMESTAMP)` — SQLite keyword, passed verbatim.
- `default(0)`, `default(1)` — integer literals.
- `default('')` — empty string.

**Normative statements:**

- The `literal` inside `default(...)` SHALL be passed verbatim to the generated SQL. The compiler SHALL NOT evaluate or transform it.
- A `default(...)` value that is syntactically invalid SQL SHALL be a compile error (E-SCHEMA-005) only when the compiler validates the generated migration SQL. Validation is performed via SQLite's `EXPLAIN` or statement preparation at compile time.

#### 38.5.5 `references table(column)`

Declares a foreign key relationship. The compiler emits a `REFERENCES` clause in the generated SQL.

**Normative statements:**

- The referenced table and column SHALL both exist in the `< schema>` declaration (or in the existing database schema, if the referenced table is not being created). A reference to a table not in scope SHALL be a compile error (E-SCHEMA-006).
- Foreign key enforcement in SQLite requires `PRAGMA foreign_keys = ON`. The compiler SHALL emit this pragma at the top of any generated migration script that includes `REFERENCES` clauses.

#### 38.5.6 `rename from identifier`

Signals that a column was previously named `identifier` in the database and should be renamed rather than dropped and re-created. Without this annotation, the compiler cannot distinguish a rename from a drop + add.

**Normative statement:**

- When a column in `< schema>` includes `rename from <old-name>`, and a column named `<old-name>` exists in the current database schema but a column named `<new-name>` does not, the compiler SHALL generate a `RENAME COLUMN` migration instead of a DROP + ADD pair.
- If neither `<old-name>` exists in the current database nor `<new-name>` is a new column, `rename from` SHALL be a compile error (E-SCHEMA-007: rename source column does not exist in database).

### 39.6 Migration Diff Algorithm

#### 38.6.1 Desired State vs. Actual State

At compile time, the compiler compares two schema representations:

- **Desired state:** The schema declared in `< schema>`.
- **Actual state:** The schema currently stored in the database file named by `<program db="...">`. The compiler reads `sqlite_master` at compile time using Bun's SQLite module.

The compiler produces a diff: a sequence of migration operations needed to bring the actual state to the desired state.

#### 38.6.2 Diff Operations

The compiler recognizes the following migration operations, in the order they must be applied:

| Operation | Trigger |
|---|---|
| `CREATE TABLE` | Table in desired state, not in actual state |
| `DROP TABLE` | Table in actual state, not in desired state |
| `ADD COLUMN` | Column in desired state, not in actual state for an existing table |
| `DROP COLUMN` | Column in actual state, not in desired state for an existing table |
| `RENAME COLUMN` | Column with `rename from` annotation (§38.5.6) |
| `CREATE INDEX` | Unique constraint added to existing non-unique column |
| `DROP INDEX` | Unique constraint removed from existing unique column |
| Full table rebuild | All other column-level changes (type changes, constraint changes) |

**Normative statements:**

- The compiler SHALL generate migration SQL only for operations listed in the table above. No other migration operations SHALL be generated automatically.
- `DROP TABLE` and `DROP COLUMN` operations SHALL be generated in the diff output but SHALL require explicit developer confirmation before `scrml migrate` applies them (see §38.8 for CLI behavior). The compiler SHALL emit a warning (W-SCHEMA-002) for each destructive operation in the diff.

#### 38.6.3 SQLite `ALTER TABLE` Limitations — Full Table Rebuild

SQLite does not support the full range of `ALTER TABLE` operations (no `MODIFY COLUMN`, no `DROP COLUMN` before SQLite 3.35.0, no constraint changes via `ALTER`). When a migration requires an operation that SQLite does not support directly, the compiler SHALL generate the standard 12-step SQLite full-table rebuild sequence:

1. `BEGIN TRANSACTION`
2. `CREATE TABLE <name>_migration_new (...)`  (new desired schema)
3. `INSERT INTO <name>_migration_new SELECT <mapped-columns> FROM <name>`
4. `DROP TABLE <name>`
5. `ALTER TABLE <name>_migration_new RENAME TO <name>`
6. Re-create any indexes that were on the old table and are still required
7. `COMMIT`

**Normative statements:**

- The compiler SHALL automatically generate the full-table rebuild sequence for any column change that SQLite cannot perform via simple `ALTER TABLE` syntax on the version of SQLite bundled with the current Bun release.
- The developer SHALL NOT write these steps manually. The `< schema>` diff compiler owns this generation entirely.
- The compiler SHALL name the intermediate table `<tablename>_migration_new`. If a table with that name already exists in the database at migration time, `scrml migrate` SHALL abort with a descriptive error (the interrupted migration case).

#### 38.6.4 Rename Ambiguity

The compiler cannot automatically distinguish between these two cases when a column disappears and a new column appears in the same diff:

- Case A: The developer renamed the column (wants a `RENAME COLUMN` or rebuild-with-rename).
- Case B: The developer deleted the old column and created a new unrelated column.

**Normative statements:**

- When the diff includes a column removal and a column addition in the same table and the developer has not used `rename from` (§38.5.6), the compiler SHALL emit a compile error (E-SCHEMA-008: rename ambiguity) rather than silently choosing either interpretation.
- The error message SHALL name the removed column, the added column, and the two interpretations. It SHALL instruct the developer to either add `rename from <old-name>` to the new column declaration (if it is a rename) or to confirm the drop-and-add by adding a `// scrml:confirm-drop <table>.<column>` annotation comment above the schema block (if it is a true deletion followed by a new column).
- A `// scrml:confirm-drop <table>.<column>` annotation comment SHALL suppress E-SCHEMA-008 for that specific column removal. The compiler SHALL then generate a DROP COLUMN (or full rebuild) followed by an ADD COLUMN.

### 39.7 Compile-Time Schema Validation

**Normative statements:**

- At compile time, the compiler SHALL validate the `< schema>` block against itself for internal consistency: all `references` targets exist, no duplicate column names within a table, no duplicate table names.
- The compiler SHALL NOT fail compilation when the database file does not exist. If the database file is absent, the diff is "all tables need to be created" and the compiler SHALL generate a full `CREATE TABLE` migration. This supports the workflow where the schema is written before the database file is created.
- The compiler SHALL fail compilation if the database file exists but is not a valid SQLite file (E-SCHEMA-009).
- The compiler SHALL fail compilation if a `< schema>` column type differs from the actual database column affinity in a way that is not auto-migrated (i.e., the diff requires a type change but the database is production-mode-locked). See §38.8 for `--check` mode.

### 39.8 The `scrml migrate` CLI

The migration workflow uses two compiler-generated artifacts and one CLI command.

#### 38.8.1 Generated Artifacts

At compile time, the compiler writes two files alongside the database path:

- `<db-path>.migration.sql` — the full migration SQL for the current diff. Overwritten on each compile.
- `<db-path>.migration.json` — machine-readable diff metadata: tables affected, operations, risk level (`safe` | `destructive`).

**Normative statements:**

- The compiler SHALL always regenerate `<db-path>.migration.sql` and `<db-path>.migration.json` when a `< schema>` block is present, even if the diff is empty. An empty diff produces a `.sql` file containing only a comment and a `.json` file with an empty operations array.
- If the diff is empty, `<db-path>.migration.sql` SHALL contain the comment `-- No migrations needed. Schema is up to date.`

#### 38.8.2 `scrml migrate` Flags

| Flag | Behavior |
|---|---|
| `scrml migrate` | Applies all non-destructive operations from `<db-path>.migration.sql`. Prompts before destructive operations. |
| `scrml migrate --dry` | Prints the migration SQL to stdout without applying it. Does not modify the database. |
| `scrml migrate --check` | Exits with code 1 if the diff is non-empty (schema and database are out of sync). Exits with code 0 if the diff is empty. Does not apply migrations. Suitable for CI. |
| `scrml migrate --force` | Applies all operations including destructive ones without prompting. Intended for CI environments where the developer has reviewed the diff. |

**Normative statements:**

- `scrml migrate` SHALL refuse to run if `<db-path>.migration.sql` is older than the source file containing the `< schema>` block. The developer MUST recompile before migrating. The error message SHALL say "Schema has changed since last compile. Run `scrml build` first."
- `scrml migrate` SHALL wrap all applied operations in a single SQLite transaction. If any statement fails, the transaction SHALL be rolled back and the database SHALL be unchanged.
- `scrml migrate` SHALL print a summary of applied operations to stdout on success.

### 39.9 Interaction with `< db>` and `?{}` SQL Contexts

- A `< schema>` block and a `< db>` block in the same file refer to the same database (from `<program db="..."`). They are complementary, not competing.
- `< schema>` declares structure. `< db>` scopes queries. The developer MAY have one without the other.
- A file with only `< schema>` and no `< db>` is valid. The compiler generates the migration artifacts but produces no SQL query infrastructure.
- A file with `< db>` but no `< schema>` is valid and is the pre-existing behavior from §11. No migration artifacts are generated.
- Types derived from `< schema>` declarations are available throughout the file, including inside `< db>` blocks and `?{}` SQL templates, without any additional import.

### 39.10 Interaction with `protect=`

The `< schema>` declaration lists columns by name. The `< db protect="...">` attribute uses column names from that same table. The compiler SHALL validate that every column name in `protect=` exists in either the `< schema>` declaration or the actual database schema. A `protect=` column name with no matching column SHALL be a compile error (E-PA-007, already in §11.3).

### 39.11 Type System Integration

The `< schema>` block is the authoritative source for table type generation. When both a `< schema>` block and a `< db>` block exist in the same file:

- The compiler generates struct types for each table in `< schema>` before running the `< db>` type inference pass (§14.8).
- If the database file is absent, the compiler uses `< schema>` alone to generate types (no introspection fallback needed).
- If the database file exists and the schema is out of sync with `< schema>`, the compiler generates types from the `< schema>` declaration (desired state), not the actual database. The compiler SHALL emit W-SCHEMA-003 when types are generated from `< schema>` and the database is out of sync: "Schema and database differ. Types reflect desired schema. Run `scrml migrate` to sync."

### 39.12 Error Codes

| Code | Trigger | Severity |
|---|---|---|
| E-SCHEMA-001 | `< schema>` block without `<program db="...">` attribute | Error |
| E-SCHEMA-002 | More than one `< schema>` block in the same file | Error |
| E-SCHEMA-003 | `< schema>` block nested inside another block | Error |
| E-SCHEMA-004 | Unrecognized column type name in `< schema>` | Error |
| E-SCHEMA-005 | `default(...)` value is syntactically invalid SQL | Error |
| E-SCHEMA-006 | `references` targets a table or column not in scope | Error |
| E-SCHEMA-007 | `rename from` source column does not exist in the database | Error |
| E-SCHEMA-008 | Rename ambiguity: column removed and column added with no `rename from` annotation | Error |
| E-SCHEMA-009 | Database file exists but is not a valid SQLite file | Error |
| W-SCHEMA-001 | Table declaration has no primary key | Warning |
| W-SCHEMA-002 | Migration diff contains a destructive operation (DROP TABLE or DROP COLUMN) | Warning |
| W-SCHEMA-003 | Types generated from `< schema>` desired state; database is out of sync | Warning |

---

## 40. Middleware and Request Pipeline

**Added:** 2026-04-01 — debate verdict: hybrid auto + `handle()` escape hatch (50/60).

### 40.1 Overview

scrml's request pipeline follows a two-tier model:

1. **Compiler-auto tier:** CORS, security headers, rate limiting, structured logging, and CSRF protection are declared as attributes on `<program>`. The compiler generates all handler code for these concerns with no developer-written middleware.
2. **Escape-hatch tier:** For custom concerns, `server function handle(request, resolve)` is the onion-model escape hatch. Code before `resolve()` is pre-middleware; code after `resolve()` is post-middleware.

**Design principle:** Most scrml applications need zero middleware code. The `handle()` function exists for cases that cannot be expressed through `<program>` attributes. The developer reaches for `handle()` only when the compiler-auto tier is insufficient.

### 40.2 Compiler-Auto Middleware — `<program>` Attributes

The following attributes on `<program>` enable automatic middleware generation:

| Attribute | Value form | What the compiler generates |
|---|---|---|
| `cors=` | `"*"` or `"https://example.com"` | CORS preflight handler (OPTIONS route) + `Access-Control-*` headers on all responses |
| `log=` | `"structured"` \| `"minimal"` \| `"off"` | Request/response logging with timestamp, method, path, status, duration |
| `csrf=` | `"on"` \| `"off"` | CSRF token generation, cookie injection, and validation on state-mutating requests |
| `ratelimit=` | `"100/min"` \| `"N/unit"` | In-memory sliding window rate limiter per IP; 429 response when exceeded |
| `headers=` | `"strict"` | Injects `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Content-Security-Policy: default-src 'self'` on all responses |

**Normative statements:**

- All `<program>` middleware attributes SHALL be processed before any route handler is invoked.
- Multiple `<program>` middleware attributes MAY be combined on a single `<program>` element. The compiler SHALL generate them in the order: CORS → rate limit → CSRF → route handler → security headers → logging.
- The compiler SHALL generate these middleware handlers as server-side code only. None of these constructs produce client-side JavaScript.
- A `<program>` element with none of these attributes generates no middleware infrastructure. The absence of a middleware attribute SHALL NOT be a compile error or warning.

#### 39.2.1 `cors=`

`cors="*"` allows any origin. `cors="https://example.com"` restricts to a specific origin.

The compiler generates:
- An `OPTIONS /<any>` catch-all route that returns `204 No Content` with `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` headers.
- `Access-Control-Allow-Origin` on all non-OPTIONS responses.

**Normative statements:**

- `cors="*"` SHALL NOT be the default. CORS is opt-in.
- The compiler SHALL NOT generate the CORS headers if `cors=` is absent.

#### 39.2.2 `log=`

`log="structured"` emits one log line per request in JSON format:

```json
{"ts":"2026-04-01T12:00:00.000Z","method":"GET","path":"/users","status":200,"ms":4}
```

`log="minimal"` emits a human-readable line: `GET /users 200 4ms`.
`log="off"` (or absence of `log=`) emits no logs.

**Normative statement:**

- The structured log output SHALL be written to `process.stdout`. The format is not configurable via `<program>` attributes; custom log formatting is a `handle()` use case.

#### 39.2.3 `csrf=`

`csrf="on"` enables CSRF protection for all state-mutating requests (POST, PUT, PATCH, DELETE).

The compiler generates:
- A server-side function that reads or creates a CSRF token in the current session.
- A script tag in the generated HTML that stores the CSRF token as a `<meta name="csrf-token">` element.
- A request interceptor (injected into the generated client fetch wiring) that adds `X-CSRF-Token: <token>` to all state-mutating requests.
- A server-side validator that checks the `X-CSRF-Token` header on state-mutating routes and returns `403 Forbidden` if the token is missing or invalid.

**Normative statements:**

- CSRF protection SHALL apply only to requests that mutate state (POST, PUT, PATCH, DELETE). GET requests SHALL NOT be subject to CSRF validation.
- `csrf="on"` SHALL require session infrastructure to be active (either `<program protect="...">` or equivalent session handling). Using `csrf="on"` without session infrastructure SHALL be a compile error (E-MW-001).

#### 39.2.4 `ratelimit=`

`ratelimit="N/unit"` where `unit` is one of `sec`, `min`, `hour`.

Examples: `ratelimit="100/min"`, `ratelimit="10/sec"`, `ratelimit="1000/hour"`.

The compiler generates an in-memory sliding window rate limiter keyed by client IP. Requests exceeding the limit receive a `429 Too Many Requests` response with a `Retry-After` header.

**Normative statements:**

- The rate limiter SHALL operate per-IP. IP is determined from `request.headers.get("x-forwarded-for")` (first value) if present, otherwise `server.requestIP(req).address`.
- The rate limiter state is in-memory and is NOT shared across Bun worker processes. For multi-worker deployments, the `ratelimit=` attribute provides best-effort limiting, not a hard guarantee.
- A `ratelimit=` value that does not match the `N/unit` form SHALL be a compile error (E-MW-002).

#### 39.2.5 `headers=`

`headers="strict"` injects the following headers on all responses:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | `default-src 'self'` |

**Normative statement:**

- `headers="strict"` is intended as a secure-by-default baseline. If the developer's application loads scripts or styles from external origins, the CSP will block them. In that case the developer MUST override the `Content-Security-Policy` via `handle()`.

### 40.3 The `handle()` Escape Hatch

`server function handle(request, resolve)` is a reserved function name. When defined in a file, the compiler weaves it into the request pipeline as an onion-model interceptor.

#### 39.3.1 Syntax

```scrml
<program db="./app.db" log="structured" cors="*">

${ server function handle(request, resolve) {
    // Pre-middleware: runs before the matched route handler
    const start = Date.now()

    const response = resolve(request)

    // Post-middleware: runs after the route handler returns
    response.headers.set("X-Response-Time", `${Date.now() - start}ms`)
    return response
} }

</program>
```

`resolve(request)` calls the remainder of the pipeline: all compiler-auto middleware that comes after the pre-middleware position, then the matched route handler, then all compiler-auto middleware in the post-middleware position.

#### 39.3.2 Signature

```
server function handle(request: Request, resolve: (req: Request) => Response) -> Response
```

- `request` is the raw Bun `Request` object.
- `resolve(request)` invokes the rest of the pipeline and returns a Bun `Response`. It MUST be called exactly once. Calling `resolve` zero times or more than once is a compile error (E-MW-003).
- The return type of `handle` is `Response`. Returning a non-`Response` value is a compile error (E-MW-004).
- `handle` is always `server`-escalated. The `server` keyword before `function` is required and is not implied.

#### 39.3.3 Position in the Pipeline

The compiler inserts `handle()` at this position in the full pipeline:

```
[CORS preflight] → [rate limit] → handle() PRE → [CSRF check] → [route dispatch] → handle() POST → [security headers] → [logging]
```

The compiler-auto middleware order relative to `handle()` is fixed. If the developer needs a different order (e.g., logging before CORS), they MUST implement that concern in `handle()` directly and omit the `<program>` attribute for it.

#### 39.3.4 `handle()` Rules

**Normative statements:**

- A file SHALL contain at most one `handle()` function definition. A second `handle()` definition in the same file SHALL be a compile error (E-MW-005).
- `handle()` SHALL be defined at file top level, inside a `${ }` logic context. A `handle()` definition inside a function body, component body, or any nested scope SHALL be a compile error (E-MW-006).
- `handle()` does NOT apply to WebSocket upgrade requests. WebSocket lifecycle handlers use `<channel>` (§38). An attempt to intercept WebSocket upgrades via `handle()` is not blocked by the compiler but the behavior is undefined and SHALL NOT be relied upon.
- `handle()` applies to all HTTP requests handled by the compiled server — including statically-served assets and the `/_scrml_ws/` upgrade routes. If the developer's `handle()` modifies a `/_scrml_ws/` request, behavior is undefined.

#### 39.3.5 Early Return from `handle()`

`handle()` MAY return a response directly without calling `resolve()`. This short-circuits the pipeline and prevents the route handler from running.

```scrml
${ server function handle(request, resolve) {
    if (!isAllowedIP(request)) {
        return new Response("Forbidden", { status: 403 })
    }
    return resolve(request)
} }
```

**Normative statement:**

- When `handle()` returns without calling `resolve()`, the route handler SHALL NOT run. The response returned by `handle()` SHALL be the final response. This is intentional and valid.
- The "exactly once" rule for `resolve()` (E-MW-003) applies only to execution paths that DO call `resolve()`. A branch that returns early without calling `resolve()` is valid.

### 40.4 `handle()` and Compiler-Auto Middleware Interaction

The developer MAY combine `<program>` attributes with `handle()`. They are not mutually exclusive.

**Worked example — combined:**

```scrml
<program db="./app.db" cors="*" log="structured" headers="strict">

${ server function handle(request, resolve) {
    // Add request ID before dispatch
    const reqId = crypto.randomUUID()
    const response = resolve(request)
    response.headers.set("X-Request-Id", reqId)
    return response
} }

</program>
```

The compiler generates: CORS → rate limit (absent) → `handle()` → CSRF (absent) → route dispatch → `handle()` post → security headers → logging. The developer's `handle()` adds a request ID without replacing CORS or security headers.

### 40.5 Progressive Disclosure

A scrml application that needs no custom middleware writes no middleware code:

```scrml
<program db="./app.db" log="structured" headers="strict">
    // ... routes, components, SQL queries
</program>
```

A scrml application with one custom concern adds one `handle()`. The common 80% of concerns (CORS, logging, CSRF, rate limiting, security headers) are single attributes. The `handle()` escape hatch handles the remaining 20%.

### 40.6 Error Codes

| Code | Trigger | Severity |
|---|---|---|
| E-MW-001 | `csrf="on"` used without session infrastructure | Error |
| E-MW-002 | `ratelimit=` value does not match `N/unit` pattern | Error |
| E-MW-003 | `resolve()` called zero times or more than once in `handle()` (per execution path) | Error |
| E-MW-004 | `handle()` returns a non-`Response` value | Error |
| E-MW-005 | More than one `handle()` definition in the same file | Error |
| E-MW-006 | `handle()` defined outside file top-level `${ }` | Error |

---

## 41. Import System — `use` and `import`

**Added:** 2026-04-01 — debate verdict: hybrid `use` + `import` (50.5/60). Two-keyword vocabulary with shared `scrml:` protocol prefix resolution.

### 41.1 Overview

scrml's import system uses two keywords with distinct roles:

- **`use`** — activates capabilities in markup scope: components, macros, syntax patterns, and living compiler extensions. `use` operates at the language level.
- **`import`** — brings values, types, and functions into logic scope. `import` operates at the code level.

The `scrml:` protocol prefix resolves against a three-tier hierarchy: compiler-bundled stdlib, then user's vendor directory, then project-local files (for the `./` prefix). The `vendor:` prefix resolves explicitly to the vendor directory.

This section extends and supersedes §21 (Module and Import System). The `import` syntax defined in §21 remains valid and is incorporated here with extensions. The `use` keyword is new in this section.

### 41.2 `use` — Capability Imports

#### 40.2.1 Syntax

```
use-declaration ::= 'use' module-specifier named-imports?
module-specifier ::= protocol-prefix ':' module-path
protocol-prefix  ::= 'scrml' | 'vendor'
named-imports    ::= '{' identifier (',' identifier)* '}'
```

`use` declarations appear at file top level, OUTSIDE any `${ }` context. They are not inside braces. They are part of the scrml file preamble, alongside `<program>`.

**Worked example — valid:**

```scrml
<program db="./app.db">

use scrml:ui
use scrml:chart { LineChart, BarChart }
use scrml:auth
use vendor:my-date-picker { DatePicker }

${ import { formatCurrency } from './utils.scrml' }

@count = 0

<div>
    <Button onclick=${() => @count++}>Increment</>
    <LineChart data=@chartData/>
    <DatePicker value=@selectedDate/>
</>

</program>
```

#### 40.2.2 What `use` Brings into Scope

`use scrml:ui` without named imports brings ALL exports of that module into markup scope. Named imports (`use scrml:chart { LineChart }`) bring only the named items.

**Normative statements:**

- Items brought into scope by `use` SHALL be available as markup elements (component names), logic identifiers (macros, utility functions), and type names — depending on what the module exports.
- `use` SHALL NOT be valid inside a `${ }` context, a component body, or any nested scope. `use` at any position other than file top level SHALL be a compile error (E-USE-001).
- The compiler SHALL resolve all `use` declarations before parsing the file body. `use` declarations MUST appear before the first markup element or logic context in the file. A `use` declaration that appears after the first markup or logic content SHALL be a compile error (E-USE-002).
- A named import in `use` that does not exist in the target module SHALL be a compile error (E-USE-003).
- When two `use` declarations bring the same name into scope, the later declaration wins. The compiler SHALL emit W-USE-001 for each shadowed name.

#### 40.2.3 `use` and the Living Compiler

Living compiler extensions (transformation alternatives) are imported via `use vendor:<extension-name>`. The extension is a vendored `.scrml` or `.js` file in the project's `vendor/` directory that registers transformation alternatives.

**Normative statement:**

- The `vendor:` prefix in a `use` declaration SHALL resolve to the `vendor/<module-path>` directory relative to the project root. The project root is the directory containing the `<program>` file. A `vendor:` import that does not resolve to a file or directory SHALL be a compile error (E-USE-004).

### 41.3 `import` — Value Imports

#### 40.3.1 Syntax (extended from §21)

The `import` syntax from §21 is retained exactly. This section adds the `scrml:` protocol prefix for stdlib value imports.

```scrml
// Local file import (unchanged from §21)
${ import { UserRole } from './types.scrml' }
${ import { formatDate } from './utils.scrml' }

// Stdlib value import (new in §40)
${ import { formatCurrency, parseDate } from 'scrml:utils' }
${ import { session } from 'scrml:auth' }
```

**Normative statements:**

- `import` SHALL be valid only inside a `${ }` logic context at file top level (unchanged from §21).
- The `scrml:` prefix in an `import` specifier SHALL trigger stdlib/vendor resolution (§40.5). Without this prefix, the specifier is treated as a relative file path.
- All other rules from §21 (E-IMPORT-001 through E-IMPORT-004) continue to apply.

### 41.4 Protocol Prefixes

scrml defines three protocol prefixes for non-relative module specifiers:

| Prefix | Resolves to | Example |
|---|---|---|
| `scrml:` | Compiler-bundled stdlib, then `vendor/scrml/` | `scrml:ui`, `scrml:auth`, `scrml:utils/string` |
| `vendor:` | `vendor/<path>` in project root | `vendor:my-date-picker`, `vendor:my-extension` |
| `./` or `../` | Local file (relative path) | `./utils.scrml`, `../shared/types.scrml` |

**Normative statements:**

- No other protocol prefixes SHALL be recognized. A specifier that does not begin with `scrml:`, `vendor:`, `./`, or `../` SHALL be a compile error (E-USE-005 for `use` declarations, E-IMPORT-005 for `import` statements).
- npm-style bare specifiers (e.g., `import { x } from 'lodash'`) SHALL be a compile error (E-IMPORT-005). scrml has no npm integration. Bare specifiers with no recognized prefix are never valid.

### 41.5 Resolution Hierarchy

For `scrml:` prefixed specifiers, the compiler resolves in this order:

1. **Compiler-bundled stdlib:** The set of modules shipped with the scrml compiler binary. `scrml:ui`, `scrml:auth`, `scrml:chart`, `scrml:utils` are examples of stdlib modules (exact catalog is defined in the stdlib release manifest, not in this spec).
2. **User vendor directory:** `vendor/scrml/<module-path>` relative to the project root. If a vendored copy exists, it takes precedence over the compiler-bundled stdlib. This is the override mechanism.
3. **Error:** If the specifier resolves to nothing in either tier, it is a compile error (E-USE-004 for `use`, E-IMPORT-006 for `import`).

**Normative statements:**

- The user vendor directory SHALL always take precedence over the compiler-bundled stdlib for the same module path. This is the per-developer stdlib philosophy: you own the source, you can override any stdlib module.
- The resolution algorithm SHALL be deterministic. Given the same project directory contents, the same specifier SHALL always resolve to the same module.
- The compiler SHALL log the resolved path for each `scrml:` import when the `--verbose` flag is passed to `scrml build`.

### 41.6 Vendoring Model

Following the Odin-inspired philosophy: dependencies are liabilities; vendor everything; no central registry at runtime.

A vendored module is a physical copy of the source placed in `vendor/` in the project root:

```
project/
  vendor/
    scrml/
      my-date-picker/
        index.scrml       # module entry point
      my-extension/
        index.scrml
  src/
    app.scrml
  <program file>.scrml
```

`use vendor:my-date-picker` resolves to `vendor/my-date-picker/index.scrml`.

**Normative statements:**

- The developer SHALL obtain vendored modules by copying source into `vendor/`. The scrml toolchain SHALL NOT download anything automatically. There is no lock file, no registry fetch, no version resolution at build time.
- A vendored override of a stdlib module (e.g., `vendor/scrml/ui/`) SHALL replace the stdlib module entirely for that project. The compiler SHALL NOT merge the vendored and stdlib versions.
- The `vendor/` directory MAY be committed to version control. The project's `vendor/` directory is part of the project, not a generated artifact.

### 41.7 Name Resolution and Conflict Rules

When names are brought into scope from multiple `use` declarations or `import` statements, the following rules apply:

**Normative statements:**

- Names from `use` declarations are in markup scope. Names from `import` statements are in logic scope. These are different scopes; a component name from `use scrml:ui` does not shadow a value named `Button` in a `${ import }` logic context.
- When two `use` declarations bring the same component name into markup scope, the later declaration WINS and a W-USE-001 warning is emitted.
- When a `use` declaration brings a name into scope that collides with a built-in HTML element name (e.g., `use scrml:ui { button }`), this SHALL be a compile error (E-USE-006). User-defined components that shadow HTML element names are never valid (existing rule from §15.6 / E-NAME-001).
- When an `import` statement imports a name that is already in scope from another `import` statement in the same file, the later import WINS and a W-IMPORT-001 warning is emitted.

### 41.8 `use` Declarations in Worker Programs

`<program name="worker">` files are separate compilation units. They do not inherit `use` declarations from the parent program file.

**Normative statement:**

- Each `<program>` file SHALL declare its own `use` and `import` statements independently. `use` declarations from one compilation unit SHALL NOT propagate to any other compilation unit.

### 41.9 Tree-Shaking Behavior

`use scrml:ui` without named imports brings all exports of that module into scope. The compiler SHALL apply tree-shaking: only the components and values that are actually referenced in the file body are included in the compiled output.

**Normative statement:**

- Unused exports from a `use` declaration SHALL NOT appear in the compiled output. The compiler SHALL NOT warn about unused `use` declarations (this would be noisy for `use scrml:ui` which provides many components).
- Tree-shaking for `use` declarations is resolved at compile time by static reference analysis. Dynamic component references (e.g., computed component names) are not possible in scrml's markup syntax; therefore static tree-shaking is always complete.

### 41.10 Interaction with §21

This section (§41) extends §21 without removing it. Specifically:

- The `export` syntax of §21.2 is unchanged.
- The `import` syntax of §21.3 is extended with the `scrml:` prefix.
- The re-export syntax of §21.4 is unchanged.
- The pure-type files rule of §21.5 is unchanged.
- Error codes E-IMPORT-001 through E-IMPORT-004 from §21.6 remain in force.
- New error codes E-IMPORT-005 and E-IMPORT-006 are added by this section.

### 41.11 Error Codes

| Code | Trigger | Severity |
|---|---|---|
| E-USE-001 | `use` declaration inside a `${ }` context or nested scope | Error |
| E-USE-002 | `use` declaration appears after first markup or logic content | Error |
| E-USE-003 | Named import in `use` does not exist in the target module | Error |
| E-USE-004 | `vendor:` or `scrml:` specifier does not resolve to any module | Error |
| E-USE-005 | `use` specifier uses an unrecognized protocol prefix | Error |
| E-USE-006 | `use` brings a name into scope that collides with a built-in HTML element name | Error |
| E-IMPORT-005 | `import` specifier uses an unrecognized protocol prefix or bare npm-style specifier | Error |
| E-IMPORT-006 | `scrml:` import specifier does not resolve to any module | Error |
| W-USE-001 | Two `use` declarations bring the same name into markup scope (later wins) | Warning |
| W-IMPORT-001 | Two `import` statements import the same name into logic scope (later wins) | Warning |

---

## 42. `not` — The Unified Absence Value

**Added:** S39, 2026-04-03. User voice: "instead of nothing i like not" / "a meant not = null || undefined. x is not"

### 42.1 Overview

scrml defines a single canonical value for the absence of a meaningful value: `not`. The keywords `null` and `undefined` are NOT valid scrml identifiers. `not` replaces both concepts uniformly.

`not` is both a value and a type. As a type, it is a singleton bottom type whose only member is the value `not`.

### 42.2 Syntax

#### 42.2.1 Assigning Absence

```scrml
${ let x = not }
${ @name = not }
```

#### 42.2.2 Checking for Absence — `is not`

```scrml
${ if (x is not) { handleAbsence() } }
```

`is not` is a two-keyword operator parsed as a single boolean test.

#### 42.2.2a Checking for Presence — `is some`

`expr is some` is the positive counterpart to `expr is not`. It evaluates to `true` when `expr` is not the absence value `not`, and `false` when `expr` is `not`.

```scrml
${ if (@name is some) { displayName(@name) } }
```

**Normative statements:**

- `expr is some` SHALL evaluate to `true` when `expr` is not `not`, and `false` when `expr` is `not`.
- `expr is some` is definitionally equivalent to `not (expr is not)`. The compiler MAY desugar either form to a single absence check.
- `expr is some` does NOT narrow the type of `expr`. To narrow from `T | not` to `T`, use `given expr => { ... }` (§42.2.3).
- `is some` is a two-keyword operator parsed as a single boolean test, symmetric to `is not`.

**Design note:** `is some` exists to avoid the double-negative `not (x is not)` in common presence checks.

**Codegen:** `x is some` → `x !== null && x !== undefined` in JavaScript output.

#### 42.2.3 Checking for Presence — `given`

**Syntax:**

```
given-guard       ::= 'given' identifier-list '=>' block
identifier-list   ::= identifier ( ',' identifier )*
```

The `given` keyword is the presence guard for `T | not` variables. It replaces the previously documented `(x) =>` form. The old form `(x) =>` is removed from the language. Any source file using `(x) =>` as a presence guard SHALL be a compile error (E-SYNTAX-043).

**Single-variable form:**

```scrml
${
    given x => {
        // x is narrowed from T | not to T inside this block
        use(x)
    }
}
```

**Multi-variable form:**

```scrml
${
    given x, y => {
        // x is narrowed from T1 | not to T1
        // y is narrowed from T2 | not to T2
        // body executes only when ALL listed variables are present
        use(x, y)
    }
}
```

Multi-narrowing is all-or-nothing. If any listed variable is `not`, the body is skipped entirely. There is no partial execution of the body with a subset of variables present.

`given` is the positive counterpart to `x is not`. Inside the body, each named variable is narrowed — the `| not` component is removed from each variable's type. No variable is rebound to a new name; each identifier is narrowed in place.

**In match arms**, the presence pattern in a `match` block uses `given` in the payload position:

```scrml
${
    match x {
        not        => handleAbsence()
        given x    => handlePresence(x)
    }
}
```

**Nesting:**

`given` guards MAY be nested. Prefer the multi-variable form `given x, y => { ... }` over nested single-variable guards when semantics are identical.

**Property path note (pending):**

Whether `given` accepts property paths (e.g., `given obj.field =>`) is under consideration. For v1, `given` SHALL accept only simple identifiers. A property path in `given` position SHALL be a compile error (E-SYNTAX-044, reserved).

#### 42.2.4 Compound Expression Operands

**Added:** 2026-04-10 — DQ-12 normative statement.

`is not` and `is some` MAY be applied to any expression, not only simple identifiers. The compiler evaluates the expression once, caches the result, and performs the absence check on the cached value.

```scrml
if ((arr.find(x => x.id == id)) is given) { ... }
if ((regex.exec(str)) is not) { handleNoMatch() }
if ((getUser(id)) is some) { renderUser() }
```

**Normative statements:**

- `expr is not` and `expr is some` SHALL be valid for any expression `expr`, including method calls, function calls, array access, and binary expressions.
- The compiler SHALL evaluate `expr` exactly once. Any side effects of `expr` occur exactly once.
- Parentheses around a compound expression — `(expr) is not` — are accepted and have no special meaning beyond grouping.
- `(expr) is given` is a valid alias for `(expr) is some` in an inline boolean position.

**Implementation note (DQ-12 Phase A):** The current compiler implements parenthesized compound operands — `(expr) is not`, `(expr) is some`, `(expr) is not not` — by rewriting them to a temp-var form that guarantees single evaluation. Bare compound expressions without parentheses (e.g., `regex.exec(str) is not`) are not yet supported and are tracked as DQ-12 Phase B; using bare compound expressions without parens will produce incorrect JS output until Phase B is complete.

### 42.3 Type Rules

#### 42.3.1 Optional Type Union

Any type may be made optional by forming the union `T | not`:

```scrml
${ let x: string | not = not }     // valid
${ let x: string | not = "hello" } // valid
${ let x: string = not }           // compile error E-TYPE-041
```

The compiler SHALL infer `T | not` when a variable is initialized with `not` and later assigned a value of type `T`.

#### 42.3.2 Equality and `is not`

`x is not` is the only normative absence check. Using `== not` or `=== not` SHALL be compile error E-TYPE-042. Comparing against `null` or `undefined` SHALL be compile error E-SYNTAX-042.

#### 42.3.3 `not` in Function Return Types

A function that may return no value SHALL declare its return type as `T | not`. A function declared `-> string` that has a code path returning `not` SHALL be compile error E-TYPE-043.

#### 42.3.4 Reactive State

`@x` MAY be of type `T | not`. Transition from `not` to `not` does not trigger re-render (no-change no-render rule).

### 42.4 Interaction with `if=` Markup Attribute

`not` is falsy. `<div if=@x>` where `@x: T | not` renders when `@x` has a value, unmounts when `@x is not`. The compiler narrows `@x` to `T` inside the `if=`-guarded scope.

### 42.5 Codegen

- `not` literal → `null` in JavaScript output
- `x is not` → `x === null || x === undefined` in JavaScript output
- `given x => body` → `if (x !== null && x !== undefined) { body }` in JavaScript output
- `given x, y => body` → `if (x !== null && x !== undefined && y !== null && y !== undefined) { body }` in JavaScript output
- `given x` in a match arm → the arm's generated condition is `x !== null && x !== undefined`

### 42.6 Error Codes

| Code | Trigger | Severity |
|---|---|---|
| E-SYNTAX-042 | `null` or `undefined` appears in scrml value position | Error |
| E-SYNTAX-043 | `(x) =>` presence guard syntax used — replaced by `given x =>` | Error |
| E-SYNTAX-044 | Property path in `given` position (reserved; not yet supported) | Error |
| E-TYPE-041 | `not` assigned to a variable of non-optional type `T` | Error |
| E-TYPE-042 | Absence checked with `== not`, `=== not`, `== null`, etc. | Error |
| E-TYPE-043 | Function with non-optional return type has a path returning `not` | Error |
| E-TYPE-044 | `given` applied to a variable whose type does not include `| not` | Error |
| E-TYPE-045 | `not` used in prefix position as boolean negation (`not (expr)`) | Error |
| E-MATCH-012 | `match` on `T | not` type lacks a `not` arm and lacks an `else` arm | Error |

### 42.7 Normative Statements

- `not` SHALL be the only value representing absence in scrml source.
- `null` and `undefined` SHALL NOT be valid scrml source tokens in value position.
- `x is not` SHALL be the only normative absence check.
- `given x => body` SHALL narrow `x` from `T | not` to `T` inside `body`.
- `given x, y => body` SHALL narrow `x` and `y` independently. The body SHALL execute only when all listed variables are not `not`.
- The old `(x) =>` presence guard form SHALL NOT be valid. Any occurrence SHALL be compile error E-SYNTAX-043.
- `given` SHALL accept only simple identifiers for v1. Property paths SHALL be compile error E-SYNTAX-044.
- A `match` on `T | not` without a `not` arm or `else` arm SHALL be compile error E-MATCH-012.
- `.get()` on `?{}` results SHALL return `T | not`, not `T | null`.

### 42.8 Runtime Representation

`not` is the scrml absence value. Its runtime representation in compiled JavaScript is `null`.

**Normative statements:**

- The `not` literal SHALL compile to the JavaScript value `null` in all output targets.
- The `is not` operator SHALL compile to `(x === null || x === undefined)` in JavaScript output. The check matches both JavaScript `null` and `undefined` because foreign code (JS libraries, `^{}` blocks, `?{}` SQL results) may produce either.
- The `is not not` double-negation pattern (presence check) SHALL compile to `(x !== null && x !== undefined)` in JavaScript output.
- No scrml program SHALL directly emit the JavaScript value `undefined`. The only way absence enters a scrml variable is through the value `not` (which compiles to `null`) or through the JS interop boundary.

**Rationale for `null` over `undefined`:** `null` is an explicit, assignable value in JavaScript; `undefined` is the implicit absence of assignment. Using `null` as the scrml `not` representation makes intentional absence explicit in generated code.

### 42.9 JS Interop Boundary

When scrml code receives a value from a JavaScript boundary — a `^{}` meta block, a `?{}` SQL query, a `server function` return value, or any other mechanism that crosses from JavaScript into scrml — the following interop rule applies:

**Normative statements:**

- At the JavaScript interop boundary, both JavaScript `null` and JavaScript `undefined` SHALL be treated as `not` when assigned to a scrml variable.
- A `?{}` SQL query result column that returns SQL `NULL` SHALL produce the scrml value `not`.
- A `^{}` meta block that returns JavaScript `undefined` SHALL produce `not` when the result is assigned to a scrml variable.
- A `server function` that returns JavaScript `undefined` (implicitly, by falling off the end of the function body) SHALL be treated as returning `not`. If the declared return type does not include `| not`, this SHALL be compile error E-TYPE-043.

### 42.10 Disambiguation: `not` as Absence vs. `!` as Negation

The keyword `not` serves exactly one role in scrml: it is the absence value. It is NOT a boolean negation operator.

**Normative statements:**

- `not` in assignment position (e.g., `let x = not`, `@x = not`) SHALL mean "this variable holds no value."
- `not` as the right-hand side of `is` (e.g., `x is not`) is the absence predicate operator.
- The boolean negation operator in scrml is `!`. `!(a == b)` is valid. `not (a == b)` is NOT valid.
- `not` SHALL NOT appear in prefix position before a boolean expression. The compiler SHALL emit E-TYPE-045.

| Code | Trigger | Severity |
|---|---|---|
| E-TYPE-045 | `not` used in prefix position as boolean negation (`not (expr)`) | Error |

**E-TYPE-045 message:** `not` is the absence value, not a negation operator. Use `!` for boolean negation: `!(expr)`. To check for absence, use `x is not`.

---

## 43. Nested `<program>` — Universal Execution Context Boundary

**Added:** S39, 2026-04-03. Source: docs/deep-dives/nested-program-semantics-2026-04-03.md.

### 43.1 Overview

A `<program>` element nested inside another `<program>` declares an independent execution context — a separate compilation unit with its own scope, lifecycle, and communication channel.

### 43.2 Execution Context Types

| Context | Identifying Attributes | Runtime Model |
|---|---|---|
| Web Worker | `name=` (no `lang=`, no `route=`) | `new Worker()`, postMessage |
| Foreign Sidecar | `name=`, `lang=` (not `mode="wasm"`) | Subprocess; HTTP or socket |
| WASM Module | `name=`, `lang=`, `mode="wasm"` | `WebAssembly.instantiate()` |
| Server Endpoint | `name=`, `route=` | Bun.serve() route handler |

### 43.3 Scope Isolation — Shared-Nothing

Nested programs are fully isolated. No bindings, types, `use`, or `import` declarations propagate across the `<program>` boundary. A reference to a parent-scope name from inside a nested `<program>` SHALL be compile error E-PROG-003.

Types needed in both parent and child SHALL be extracted to a shared module and imported independently.

### 43.4 Lifecycle

By default, a nested program starts when its enclosing scope mounts and stops when it unmounts (scope-tied). `autostart="false"` defers startup until `<#name>.start()`.

`restart=` declares a supervision strategy:

| Value | Behavior |
|---|---|
| `"always"` | Restart unconditionally on crash |
| `"never"` | Terminate on crash (default for workers) |
| `"on-error"` | Restart on abnormal termination only (default for sidecars) |

`max-restarts=N` and `within=S` limit restart frequency.

### 43.5 Communication

#### 43.5.1 RPC (Function-Call Syntax)

```scrml
<program name="compute">
    ${ export function add(a: number, b: number) -> number { return a + b } }
</>
${ const result = await <#compute>.add(1, 2) }
```

Cross-program calls return `Promise<T>`. Unawaited cross-program calls SHALL be compile error E-PROG-004.

#### 43.5.2 Message Passing

- `<#name>.send(data)` — send to nested program
- Inside nested: `when message(data) { ... }` — handle incoming
- Inside nested: `send(data)` — send to parent
- In parent: `when message from <#name> (data) { ... }` — handle response

#### 43.5.3 Lifecycle Events (Parent-Side)

```scrml
when message from <#worker> (data) { @price = data }
when error from <#worker> (e) { @status = .Crashed }
when terminate from <#worker> { @status = .Terminated }
```

No shared reactive state across program boundaries. State changes must be sent explicitly.

### 43.6 `db=` Scoping

A nested `<program db="...">` creates its own database driver scope. `?{}` blocks inside resolve to the nested program's `db=`, not the parent's.

### 43.7 Error Codes

| Code | Trigger | Severity |
|---|---|---|
| E-PROG-001 | Ambiguous `<program>` attribute combination | Error |
| E-PROG-002 | Missing required attribute for detected execution context | Error |
| E-PROG-003 | Reference to parent-scope name from inside nested `<program>` | Error |
| E-PROG-004 | Cross-program function call not awaited | Error |
| E-PROG-005 | Circular nested program dependency | Error |

---

## 44. `?{}` Multi-Database Adaptation

**Added:** S39, 2026-04-03. Source: docs/deep-dives/multi-db-query-methods-2026-04-03.md. Supersedes §8.1.1 (S37-AM-007).

### 44.1 Overview

`?{}` is a context-sensitive database query sigil that generates driver calls for the database declared in the closest ancestor `<program db="...">`. The compile target is **Bun.SQL** — a unified tagged-template SQL client covering SQLite, PostgreSQL, and MySQL.

### 44.2 Driver Resolution

1. Walk upward from the `?{}` block through enclosing `<program>` elements.
2. First `<program>` with `db=` determines the driver.
3. Parse the connection string prefix.
4. If no `db=` found, emit E-SQL-004.

| `db=` prefix | Driver |
|---|---|
| `./path`, `sqlite:` | bun:sqlite via Bun.SQL |
| `:memory:` | bun:sqlite via Bun.SQL |
| `postgres://`, `postgresql://` | PostgreSQL via Bun.SQL |
| `mysql://` | MySQL via Bun.SQL |
| `mongo://`, `mongodb://` | NOT VALID for `?{}` (use `^{}`) |

### 44.3 Method API

| Method | Return type (scrml) |
|---|---|
| `.all()` (or bare `?{}`) | `Row[]` |
| `.get()` | `Row | not` |
| `.run()` | `void` |

`.prepare()` is removed — Bun.SQL manages caching internally. Using `.prepare()` SHALL be compile error E-SQL-006.

### 44.4 Async Model

All `?{}` calls are async. The compiler inserts `await` automatically (§13). Developer does not write `await` in scrml source.

### 44.5 Security

Every `${}` interpolation inside `?{}` SHALL compile to a bound parameter, never string interpolation. There is no `sql.raw()` in scrml. Developers needing raw SQL use `^{}` meta context.

### 44.6 Transactions

Deferred to SPEC-ISSUE-018. Current workaround: `^{}` meta with direct Bun.SQL `sql.begin()`.

### 44.7 Error Codes

| Code | Trigger | Severity |
|---|---|---|
| E-SQL-004 | `?{}` has no `db=` in any ancestor `<program>` | Error |
| E-SQL-005 | Unsupported db prefix (e.g. `mongodb:`) | Error |
| E-SQL-006 | `.prepare()` called on `?{}` result | Error |
| E-SQL-007 | `?{}` in a non-async context | Error |

---

## 45. Equality Semantics

**Added:** S39, 2026-04-03. Source: equality operator debate (Roc model selected, 53/60).

### 45.1 Overview

`==` is scrml's sole equality operator. It performs structural value comparison. There is no `===`. There is no coercion.

`!=` is the negation of `==` with identical rules.

### 45.2 Comparability Rules

The compiler derives structural comparability automatically:

- **Primitives** (number, string, boolean): always comparable with `==`.
- **Structs**: comparable if all fields are comparable. Deep structural (recursive field-by-field).
- **Enums**: comparable. Unit variants compare by tag. Payload variants compare by tag + payload fields.
- **`not`**: `x == not` is NOT valid. Use `x is not` instead (compile error E-EQ-002).
- **Functions**: NOT comparable. `==` on a type containing function fields is compile error E-EQ-003.
- **`asIs` values**: `==` generates `===` in JS output with compiler warning W-EQ-001.

### 45.3 Cross-Type Comparison

`==` between incompatible types is a compile error. `0 == false` is E-EQ-001. The type system prevents cross-type comparison before the operator is evaluated.

### 45.4 Codegen

- `a == b` (primitives) → `a === b` in JavaScript
- `a == b` (structs) → deep structural comparison function call
- `a == b` (enums) → tag comparison + payload comparison if applicable
- `a != b` → negation of the above

### 45.5 Enum Comparison vs `is`

`==` compares two values of the same type: `direction1 == direction2`. `is` checks a value against a literal variant: `direction is .North`. Both are valid and serve different use cases.

### 45.6 Identity Comparison

There is no identity comparison operator in scrml. The reactive runtime handles identity checking internally for change detection. Exposing identity comparison as a language operator would be a JS abstraction leak.

### 45.7 Error Codes

| Code | Trigger | Severity |
|---|---|---|
| E-EQ-001 | `==` applied to incompatible types | Error |
| E-EQ-002 | `== not` used instead of `is not` | Error |
| E-EQ-003 | `==` applied to type containing function fields | Error |
| E-EQ-004 | `===` operator used (not valid in scrml) | Error |
| W-EQ-001 | `==` on `asIs`-typed values | Warning |

### 45.8 Normative Statements

- `==` SHALL be the sole equality operator in scrml.
- `===` SHALL NOT be valid scrml syntax (compile error E-EQ-004).
- `==` SHALL perform deep structural comparison for structs and enums.
- The compiler SHALL derive comparability automatically for all struct and enum types whose fields are comparable.
- `==` between incompatible types SHALL be a compile error (E-EQ-001).
- `x == not` SHALL be a compile error (E-EQ-002); use `x is not`.
- `==` on types containing function fields SHALL be a compile error (E-EQ-003).

---

## 46. Worker Lifecycle — Parent-Side Observation

**Added:** S39, 2026-04-03. Source: worker lifecycle debate (Approach A selected, 48/60).

### 46.1 Overview

The parent of a nested `<program>` (§43) observes the child's lifecycle through named event hooks using the `when ... from <#name>` syntax. This extends the existing `when @var changes` pattern (§6.7.4).

### 46.2 Event Hooks

```scrml
when message from <#worker> (data) { ... }   // worker sent data
when error from <#worker> (e) { ... }         // worker crashed
when terminate from <#worker> { ... }         // worker terminated
```

Each hook is a scrml statement-level construct. The `from <#name>` qualifier identifies the source. Multiple hooks for the same event type on the same worker are allowed; they execute in source order.

### 46.3 Supervision Attributes

Supervision policy is declared on the `<program>` element, not in observation syntax:

```scrml
<program name="tracker" restart="on-error" max-restarts=3 within=60>
    ...
</>
```

See §43.4 for the full attribute table.

### 46.4 Manual Restart

`<#name>.restart()` terminates and re-creates the worker. The `when terminate from` hook does NOT fire during a restart — only on final termination.

### 46.5 Open Question

Whether continuous-push workers should also support a reactive binding form (`@price = <#worker>.stream()`) alongside event hooks is deferred. The event model is normative; reactive bindings may be added as sugar in a future amendment.

### 46.6 Normative Statements

- `when message from <#name> (data)` SHALL fire when the nested program calls `send(data)`.
- `when error from <#name> (e)` SHALL fire when the nested program crashes with an unhandled error.
- `when terminate from <#name>` SHALL fire when the nested program terminates permanently (not during restart).
- The compiler SHALL synthesize termination detection; this is not a platform event.
- Supervision policy (`restart=`, `max-restarts=`, `within=`) SHALL be declared as attributes on the `<program>` element.
---

## 47. Output Name Encoding

**Added:** 2026-04-05. Resolves ADR-001 open questions OQ-1 through OQ-4.
Source: debate-confirmed resolutions, threat assessment `docs/research/threat-assessment-type-in-name.md`.

All JavaScript variable names in compiled output SHALL use encoded names as specified in this section. The compiled JS is an IR; encoded names are correct and intentional. Source maps (PIPELINE.md §Stage 8) are the specified debugging path back to `.scrml` source.

---

### 47.1 Encoding Scheme

**Resolved from ADR-001 OQ-1.** The encoding scheme is a hybrid prefix + content hash.

#### 47.1.1 Format

```
encoded-name ::= '_' kind hash seq
kind          ::= single ASCII character (see §47.1.2)
hash          ::= 8 base36 characters  [0-9a-z]
seq           ::= 1 or 2 base36 characters [0-9a-z]  (see §47.4)
```

- The `_` prefix is reserved for compiler-generated names. User-authored scrml identifiers and vanilla JS identifiers SHALL NOT begin with `_` followed by a `kind` character and 8 base36 characters. The compiler SHALL reject any user-authored identifier that would collide with this pattern (E-CG-012).
- The full alphabet of the encoded portion (excluding the `$` separator used in debug mode, §47.3) is `[_0-9a-z]`.

#### 47.1.2 Kind Markers

| Character | `ResolvedType` kind |
|-----------|-------------------|
| `s` | struct |
| `e` | enum |
| `p` | primitive |
| `a` | array |
| `u` | union |
| `t` | state |
| `r` | error |
| `h` | html-element |
| `f` | function |
| `m` | meta-splice |
| `b` | ref-binding |
| `x` | asIs |
| `n` | not |
| `k` | cssClass |

No other kind markers are defined. A `ResolvedType` with `kind: "unknown"` SHALL NOT reach the encoding function; PIPELINE.md §Stage 6 and §Stage 8 preconditions exclude it. If the encoding function receives a `kind: "unknown"` type, the compiler SHALL emit E-CG-013 (internal invariant violation) and halt.

#### 47.1.3 Hash

The hash is the lowercase base36 representation of the lower 32 bits of the FNV-1a hash of the normalized canonical string (§47.1.4), zero-padded to exactly 8 characters.

**FNV-1a parameters:** FNV prime `16777619` (32-bit), offset basis `2166136261` (32-bit). The hash is computed over the UTF-8 byte sequence of the canonical string.

**Rationale:** 8-char base36 provides ~41 bits of entropy after kind-marker separation. Debate confirmation: this is adequate over realistic scrml type counts when E-CG-010 (§47.1.5) is enforced as a hard error.

#### 47.1.4 Canonical String Normalization

The canonical string for each `ResolvedType` kind is defined below. These strings are the sole input to the hash function. Recursive types use name references to guarantee termination.

| Kind | Canonical String Form |
|------|----------------------|
| struct | `s:Name{field1:canonical(T1),field2:canonical(T2),...}` — fields sorted alphabetically by field name |
| enum | `e:Name{Variant1,Variant2,...}` — variants in declaration order |
| array | `a:[canonical(elementType)]` — recursive |
| union | `u:(canonical(M1)\|canonical(M2)\|...)` — members sorted lexicographically by their own canonical strings |
| primitive | `p:name` |
| state | `t:Name` |
| error | `r:Name{field1:canonical(T1),field2:canonical(T2),...}` — fields sorted alphabetically |
| html-element | `h:tag` |
| function | `f:Name(canonical(P1),canonical(P2),...):canonical(returnType)` |
| meta-splice | `m:canonical(resultType)` |
| ref-binding | `b:canonical(resolvedType)` |
| not | `n:` |
| asIs | `x:` |
| cssClass | `k:` |

**Recursive types:** A struct or enum whose field or payload type references the same named type (directly or transitively) SHALL use `&Name` as the canonical string for that recursive reference instead of structural inlining. This guarantees termination of canonical-string construction for any valid `ResolvedType` graph.

**Worked example — canonical string, struct:**
```
struct User { name: string, age: number }
```
Canonical string: `s:User{age:p:number,name:p:string}` (fields sorted alphabetically: `age` before `name`).

**Worked example — canonical string, recursive struct:**
```
struct Node { value: number, next: Node | not }
```
`next` field type is `union { Node, not }`, with `Node` as a recursive reference.
Canonical string for `next`: `u:(&Node|n:)` (members sorted: `&Node` before `n:`).
Full canonical string: `s:Node{next:u:(&Node|n:),value:p:number}`.

#### 47.1.5 Collision Detection

CG SHALL maintain a `Set<string>` of all encoded names (excluding the seq suffix) emitted per output file. Before emitting a new binding, CG computes `_<kind><hash>` and checks whether that prefix is already in the set with a different `ResolvedType` canonical string.

- If two distinct `ResolvedType` values produce the same `_<kind><hash>` prefix, the compiler SHALL emit E-CG-010 and halt. This is a hard error. Hash collisions in the encoding scheme are encoding-scheme defects, not recoverable conditions.
- If the same `ResolvedType` value produces the same prefix (i.e., the same type appears again in scope), this is expected and the seq suffix (§47.4) provides disambiguation. No error is emitted.

**Normative statements:**

- The encoding function SHALL be deterministic: the same `ResolvedType` value SHALL always produce the same `_<kind><hash>` prefix.
- The encoding function SHALL be injective over type identity: distinct `ResolvedType` canonical strings SHALL produce distinct `_<kind><hash>` prefixes. E-CG-010 enforces this at compile time.
- The encoded name SHALL be a valid JavaScript identifier: it starts with `_` (covered by the format) and contains only `[_0-9a-z$]` characters.

**Worked examples:**

Valid — first struct binding for `User` with hash `7km3f2x0`:
```
_s7km3f2x00
```
(`_` prefix, `s` kind, `7km3f2x0` hash, `0` seq — first binding of this type in scope.)

Valid — first string primitive binding with hash `pstr0000`:
```
_ppstr00000
```
(`_` prefix, `p` kind, `pstr0000` hash, `0` seq.)

---

### 47.2 Runtime Decode API — `reflect(variable)`

**Resolved from ADR-001 OQ-2.** The `reflect()` built-in is the single API for type introspection.

#### 47.2.1 Behavior by Evaluation Context

`reflect(variable)` is defined in §22 (Metaprogramming). Its behavior in the context of output name encoding:

- **Compile-time `^{}` blocks** (fully deterministic): `reflect()` is resolved by the meta-eval engine using the type registry directly. No decode table is accessed at runtime.
- **Runtime `^{}` blocks** (non-deterministic per §22.6): `reflect()` decodes the encoded variable name using the runtime decode table bundled in `clientJs`.

#### 47.2.2 Return Type

`reflect()` returns a `TypeDescriptor` object:

```typescript
interface TypeDescriptor {
  kind: string;
  name?: string;
  fields?: Array<{ name: string; type: TypeDescriptor }>;
  variants?: Array<{ name: string }>;
  element?: TypeDescriptor;
  params?: Array<TypeDescriptor>;
  returnType?: TypeDescriptor;
}
```

- For non-scrml bindings (imported vanilla JS values with no encoded name), `reflect()` SHALL return `{ kind: "foreign" }`.
- The decode table stores pre-built `TypeDescriptor` objects, not builder functions. There is no per-call descriptor allocation.

#### 47.2.3 Bundling — Opt-In

The decode table and the runtime `reflect()` implementation are bundled in `clientJs` only when at least one `^{}` block is classified as runtime-dependent by BPP (the Block Pass Processor, §22.6). When no runtime-dependent `^{}` blocks exist, the decode table and runtime implementation SHALL be tree-shaken from `clientJs`.

**Normative statements:**

- The runtime `reflect()` implementation and its decode table SHALL NOT be included in `clientJs` unless at least one runtime-dependent `^{}` block is present.
- In development mode (`output.debug: true`): calling `reflect()` when the decode table is not bundled SHALL throw a descriptive error identifying that the decode table was tree-shaken because no runtime meta blocks were detected.
- In production mode (`output.debug: false` or absent): calling `reflect()` when the decode table is not bundled SHALL return `{ kind: "foreign" }` silently.
- The decode table SHALL contain only client-visible types. Server-only types (those derived from the full schema view including `protect=` fields) SHALL NOT appear in the client-side decode table.

**Security note:** The decode table is a programmatic type-introspection surface accessible to all JavaScript executing on the page, including third-party scripts and browser extensions. Client-visible type structure is inherently observable; the decode table makes enumeration systematic. Server-protected fields (§11.3) are never present in the client-side decode table by the PIPELINE.md §Stage 8 invariant. See `docs/research/threat-assessment-type-in-name.md` §Threat 1 and §Threat 2 for the full threat model.

---

### 47.3 Debug-Mode Name Format

**Resolved from ADR-001 OQ-3.**

When `output.debug: true` is set in compiler configuration (§28), encoded names include the original developer-written variable name as a suffix:

```
debug-name ::= encoded-name '$' original-identifier
```

- `$` is the separator. `$` is a valid JavaScript identifier character and never appears in the encoded portion (which uses only `[_0-9a-z]`). The separator is therefore unambiguous.
- The full original variable name is appended, not initials or a truncated form.
- This is a per-compilation setting, not per-variable.

**Example:** A variable `user` with encoded name `_s7km3f2x00` in debug mode becomes `_s7km3f2x00$user`.

**Production guard:**

- Enabling `output.debug: true` together with `output.mode: "production"` SHALL be a build error (E-CG-011). This is a hard error, not a warning.
- Rationale: debug suffixes embed developer-chosen names (which may carry sensitive schema information) into the compiled output and are never appropriate for production deployment. The conflict must be explicit, not silent.

**Normative statements:**

- The `$` character SHALL appear in an encoded name if and only if `output.debug: true` is active.
- The encoded portion before `$` SHALL be identical to the production encoded name for the same binding.
- The compiler SHALL emit E-CG-011 when `output.debug: true` and `output.mode: "production"` are both active.

---

### 47.4 Binding-Level Disambiguator

**Resolved from ADR-001 OQ-4.**

Two bindings of the same type in the same scope would produce identical `_<kind><hash>` prefixes. The seq suffix (§47.1.1) disambiguates them.

#### 47.4.1 Seq Assignment

The seq suffix is assigned by CG during emit, in declaration order within each scope:

- First binding of a given `_<kind><hash>` prefix in scope: seq = `0`
- Second: seq = `1`
- ...tenth: seq = `9`
- Eleventh: seq = `a`
- ...thirty-sixth: seq = `z`
- Thirty-seventh through 1,332nd: two-character seq `00` through `zz` (1,296 slots)
- If a single scope contains more than 1,332 bindings of the same type, the compiler SHALL emit E-CG-014 (disambiguator overflow).

Seq values are single characters `[0-9a-z]` for the first 36 bindings and two-character sequences `[0-9a-z][0-9a-z]` thereafter.

#### 47.4.2 Decode Behavior

The runtime `reflect()` implementation SHALL strip the seq suffix before decoding. Decoding operates only on the `_<kind><hash>` portion. The seq suffix is an opaque binding-level counter with no semantic meaning to the type system.

#### 47.4.3 Stability Contract

Seq counters are assigned per-scope per-compilation-unit. They SHALL NOT be used as:
- Cache keys across compilation runs
- Cross-module references
- Persistent storage identifiers
- Any identifier that must survive a recompile that adds or removes a binding of the same type in the same scope

The seq suffix for a given binding is stable only within a single compilation run. A refactor that adds a same-type binding earlier in the same scope will renumber all subsequent seq values for that type in that scope.

**Normative statements:**

- The seq suffix SHALL be assigned in binding declaration order within each scope.
- The runtime `reflect()` SHALL decode only the `_<kind><hash>` portion and SHALL ignore the seq suffix.
- The seq suffix SHALL NOT be used as a stable cross-compilation identifier.
- The compiler SHALL emit E-CG-014 when a single scope contains more than 1,332 bindings of the same encoded type prefix.

---

### 47.5 Scope of Application

Encoded names apply to ALL JavaScript variable names in compiled output:
- Bindings from `let`, `@var` (reactive), `const`, and `lin` declarations in logic blocks
- Function parameters and local variables in compiled function bodies
- Component prop bindings
- Compiler-generated intermediate bindings (reactive subscription closures, fetch wrappers, etc.)

Encoded names do NOT apply to:
- CSS class names (governed by existing CSS scoping rules, §9)
- HTML element names and attribute names
- Export names in library mode (§29 public module boundary uses developer-chosen names; internal bindings use encoded names)
- Import names from vanilla JS modules (§29)

**Normative statements:**

- CG SHALL apply encoded names to every JavaScript variable binding it emits.
- CG SHALL NOT apply encoded names to CSS class names, HTML element names, HTML attribute names, or public export identifiers.
- The public module boundary (§29) SHALL use developer-chosen names for exported identifiers. Internal bindings behind that boundary SHALL use encoded names.

---

### 47.6 Interaction with `protect=`

The `protect=` attribute (§11.3) designates database fields that SHALL NOT be accessible to client-side code. The encoding scheme interacts with this guarantee as follows:

- CG encodes client-side variables using the **client schema view** of a type (protected fields excluded). Protected field names are not part of the client schema `ResolvedType` and therefore cannot appear in client-side encoded names.
- CG encodes server-side variables using the **full schema view**. Server-side encoded names MAY include protected field names in their canonical strings. `serverJs` output is executed on the server only and SHALL NOT be served to browsers.
- The encoding function being injective guarantees that client schema types and full schema types produce distinct encoded names, making it impossible to confuse a client-safe binding with a server-only binding by name alone.

**Normative statement:** The compiler SHALL verify that no `clientJs` output contains any encoded name whose canonical string includes a protected field name. This check is defense-in-depth beyond the type-system exclusion.

---

### 47.7 Error Codes

| Code | Description | Severity |
|------|-------------|----------|
| E-CG-010 | Type encoding hash collision — two distinct `ResolvedType` canonical strings produce the same `_<kind><hash>` prefix | Error |
| E-CG-011 | `output.debug: true` is set together with `output.mode: "production"` | Error |
| E-CG-012 | User-authored identifier matches the compiler-reserved encoded-name pattern (`_` + kind char + 8 base36 chars) | Error |
| E-CG-013 | Encoding function received a `kind: "unknown"` type — internal invariant violation | Error |
| E-CG-014 | Disambiguator overflow — more than 1,332 bindings of the same encoded type prefix in one scope | Error |

---

### 47.8 Worked Examples

#### 47.8.1 Valid — Multiple Types in One Scope

```scrml
${
  let user = getUser()       // User struct — encoded _s<hashU>0
  let name = user.name       // primitive string — encoded _p<hashS>0
  let user2 = getUser()      // User struct again — encoded _s<hashU>1  (seq=1)
}
```

`user` and `user2` share the same `_<kind><hash>` prefix because they have the same type. The seq suffix disambiguates them: `0` and `1` respectively. The compiled JS is valid.

#### 47.8.2 Valid — Debug Mode

With `output.debug: true`:

```
_s7km3f2x00$user
_ppstr00000$name
_s7km3f2x01$user2
```

The `$` separator is unambiguous because the encoded portion uses only `[_0-9a-z]`.

#### 47.8.3 Invalid — Production + Debug Conflict

Compiler configuration:
```
output.debug: true
output.mode: "production"
```

Expected compiler output:
```
E-CG-011: output.debug may not be enabled in production mode.
  Set output.debug: false or change output.mode to "development".
```

Compilation halts. No output is emitted.

#### 47.8.4 Invalid — Hash Collision (E-CG-010)

If the FNV-1a hash of canonical string `s:Foo{id:p:number}` and canonical string `s:Bar{id:p:number}` both produce the prefix `_s3a9f1c20` (a hash collision in the encoding scheme):

Expected compiler output:
```
E-CG-010: Encoded name collision detected.
  Type 1: s:Foo{id:p:number} → _s3a9f1c20
  Type 2: s:Bar{id:p:number} → _s3a9f1c20
  This is an encoding scheme defect. File a compiler bug.
```

Compilation halts.
---

## 48. The `fn` Keyword — Pure Functions

**Added:** 2026-04-07. Supersedes §7.3's description of `fn` as a `function` alias.
**Amended:** 2026-04-08. Relaxed from "constrained state factory" to "pure function, any return type" based on self-hosting gauntlet R1 friction (both teams independently blocked on returning primitives/arrays from `fn`).

### 48.1 Overview

`fn` declares a pure function with compiler-enforced purity constraints. It is **not** a shorthand alias for JavaScript's `function` keyword. `function` remains the declaration form for general-purpose callables. `fn` is the declaration form for pure, deterministic functions — including state factories, predicates, transformations, and any computation free of side effects.

`fn` may return any value type: `<state>` objects, primitives (boolean, number, string), arrays, or plain objects. When `fn` returns a `<state>` value, additional return-site completeness checks apply (§48.4). When `fn` returns a non-state value, the purity constraints still apply but return-site completeness checks are skipped.

The compiler enforces two independent layers of constraints on every `fn` body:

1. **Body prohibitions** — five classes of side-effectful operations are forbidden inside any `fn` body.
2. **Return-site completeness** — every `<state>` object constructed inside a `fn` body must have all declared fields assigned on every execution path before it is returned. This layer applies only when the returned value is a `<state>` type instance.

These constraints are verified statically at the TS stage (compiler Stage 6), after type resolution and route inference.

### 48.2 Syntax

```
fn-declaration ::= fn-prefix identifier fn-params? fn-body
fn-prefix       ::= 'fn' | 'export fn' | 'pure fn' | 'server fn'
fn-params       ::= '(' param-list ')'
fn-body         ::= '{' fn-statement* '}'
fn-statement    ::= let-decl | const-decl | lin-decl | if-stmt | match-expr
                  | for-stmt | while-stmt | do-while-stmt | return-stmt
                  | local-fn-decl | lift-stmt | expression-stmt
```

`fn` declarations are valid:
- Inside any logic context `${ }` body.
- At file top level (as an exported or unexported named declaration).
- As a value in a `let`/`const` binding (anonymous `fn` expressions; see §48.2.1).

`fn` declarations are **not** valid:
- Inside a `?{}` SQL context.
- Inside a `_{}` foreign code context.
- As a markup expression (a `fn` cannot be used where markup content is expected).

#### 48.2.1 Anonymous `fn` Expressions

`fn` may appear as an expression value without a name:

```scrml
let makePoint = fn(x, y) {
    let p = < Point>
    p.x = x
    p.y = y
    return p
}
```

All constraints of §48.3 through §48.6 apply to anonymous `fn` expressions identically to named declarations.

#### 48.2.2 Parameters

`fn` accepts zero or more parameters using identical syntax to `function`. Parameters may carry type annotations. Parameters are local to the `fn` body. Parameters do not inherit `@` reactivity from the caller — a parameter whose value came from a reactive expression is bound by value at call time.

```scrml
fn buildUser(name, age) {
    let u = < User>
    u.name = name
    u.age  = age
    return u
}
```

### 48.3 Layer 1 — Body Prohibitions

The following five constructs SHALL NOT appear anywhere inside a `fn` body, including inside nested closures, helper callables, or any reachable call chain from the `fn` body. Each is a distinct compile error.

#### 48.3.1 E-FN-001 — SQL Access

`?{}` SQL contexts SHALL NOT appear inside a `fn` body or any function transitively called from a `fn` body.

```scrml
// Invalid — E-FN-001
fn buildProfile(id) {
    let row = ?{ SELECT * FROM users WHERE id = $id }
    let p = < Profile>
    p.name = row.name
    return p
}
```

> E-FN-001: `fn` body contains a `?{}` SQL access at line N. `fn` is a pure state factory and may not perform database operations. Move the `?{}` query outside `fn` and pass the result as a parameter.

#### 48.3.2 E-FN-002 — DOM Mutation

Direct DOM manipulation SHALL NOT appear inside a `fn` body. This includes, but is not limited to: `document.createElement`, `document.appendChild`, `element.setAttribute` when the target is a live DOM node reference, `document.getElementById`, and any assignment to `document.body` or `document.head`.

The compiler detects DOM mutation via a known-identifier list at the TS stage. Use of an `asIs`-typed value as a DOM mutation target is treated conservatively as a probable DOM mutation and triggers W-FN-001 (warning). If the value is provably a live DOM node reference, it is E-FN-002.

```scrml
// Invalid — E-FN-002
fn buildWidget() {
    let el = document.createElement("div")   // Error
    let w = < Widget>
    w.el = el
    return w
}
```

> E-FN-002: `fn` body contains a DOM mutation call (`document.createElement`) at line N. `fn` is a pure state factory and may not mutate the DOM. Use `<state>` fields to hold configuration data; let the runtime render the DOM from state.

#### 48.3.3 E-FN-003 — Outer-Scope Variable Mutation

A `fn` body SHALL NOT write to any variable declared outside the `fn`'s own scope boundary. This includes:
- Assignment (`x = value`) where `x` is declared in an enclosing `${}` logic context or file scope.
- Property mutation on a value declared outside the `fn` body (`outer.field = value`).
- Calling a mutating method on an `@` reactive variable declared outside the `fn` body (e.g., `@list.push(item)` where `@list` is declared outside).
- Capturing a reactive reference as a live subscription (see also §48.3.5, E-FN-009).

Local `let`/`const`/`lin` variables declared inside the `fn` body may be freely mutated.

```scrml
${ 
    let counter = 0

    // Invalid — E-FN-003
    fn buildItem(name) {
        counter = counter + 1   // mutation of outer variable
        let item = < Item>
        item.name = name
        item.seq  = counter
        return item
    }
}
```

> E-FN-003: `fn` body writes to `counter` at line N, which is declared outside the `fn` boundary. `fn` may not mutate outer-scope variables. Declare `counter` inside the `fn` body, or pass it as a parameter and return an updated value alongside the state.

#### 48.3.4 E-FN-004 — Non-Deterministic Calls

The following built-in calls are known to be non-deterministic and SHALL NOT appear inside a `fn` body:

| Call | Reason |
|------|--------|
| `Date.now()` | Returns the current wall clock time — varies per call |
| `new Date()` | Equivalent non-determinism |
| `Math.random()` | Returns a pseudo-random number |
| `crypto.randomUUID()` | Returns a non-repeatable UUID |
| `crypto.getRandomValues()` | Non-deterministic random fill |
| `performance.now()` | Returns elapsed time — varies per call |

This list is exhaustive for the initial version. Future amendments MAY extend it.

```scrml
// Invalid — E-FN-004
fn buildSession(userId) {
    let s = < Session>
    s.userId = userId
    s.token  = crypto.randomUUID()   // Error
    return s
}
```

> E-FN-004: `fn` body calls `crypto.randomUUID()` at line N, which is non-deterministic. `fn` must be a pure function of its inputs. Generate the UUID outside `fn` and pass it as a parameter.

#### 48.3.5 E-FN-005 — `async` / `await`

`fn` is always synchronous. The `async` keyword SHALL NOT appear on a `fn` declaration. `await` SHALL NOT appear inside a `fn` body.

A `fn` that requires asynchronous data (e.g., a server call result) SHALL receive that data as a parameter at its call site, not perform the async operation internally.

```scrml
// Invalid — E-FN-005: async fn declaration
async fn buildProfile(id) {
    let p = < Profile>
    p.data = await fetchData(id)   // also E-FN-005
    return p
}
```

> E-FN-005: `fn` declaration at line N is marked `async`. `fn` is always synchronous. Perform the `await` at the call site and pass the resolved value as a parameter to `fn`.

### 48.4 Layer 2 — Return-Site Completeness

#### 48.4.1 Field Loading Phase Tracking

The compiler tracks each `<state>` object under construction inside a `fn` body using a **field phase** model. Each declared field of the `<state>` type is in one of two phases:

- **Unloaded** — not yet assigned in the current execution path.
- **Loaded** — assigned at least once on the current execution path.

A `<state>` object MAY only be returned from a `fn` body when all declared fields are in the **Loaded** phase on the execution path reaching the `return` statement. Returning an object with any field in the **Unloaded** phase is E-FN-006.

Field phase tracking is performed **per `<state>` instance** and **per execution path** through the `fn` body.

#### 48.4.2 Field Accumulation — Implicit vs. Explicit

Inside a `fn` body:

- **Unconditional assignments** (`p.name = value` in straight-line code) automatically move the field from Unloaded to Loaded. No `lift` is required.
- **Conditional assignments** (inside `if`/`else`, `match`, or `for` blocks) require `lift` to hoist the assignment into the enclosing scope's phase tracking (see §48.5). Without `lift`, an assignment inside a conditional arm is visible only on that execution path, and the compiler will report E-FN-006 on paths where the assignment was skipped.

#### 48.4.3 E-FN-006 — Returning Incomplete State

E-FN-006 only applies when the returned value is a `<state>` type instance. If a `fn` returns a primitive, array, or non-state object, E-FN-006 does not apply — the purity constraints (§48.3) are still enforced, but return-site completeness is skipped.

If a `return` statement is reached when any field of a `<state>` object is still in the Unloaded phase, the compiler emits E-FN-006.

```scrml
<state User>
    name: string
    age:  number
</>

fn buildUser(name) {
    let u = < User>
    u.name = name
    // u.age never assigned — E-FN-006
    return u
}
```

> E-FN-006: `fn` returns `u` (type `User`) at line N with field `age` unassigned. All fields of a `<state>` type must be assigned before the object is returned from `fn`. Assign `u.age` before the `return` statement.

#### 48.4.4 E-FN-007 — Branch Produces Different State Shape

When a `fn` contains branches (`if`/`else`, `match`) that construct different `<state>` types and return from inside the branches, both branches must produce the same type — OR — the declared return type of the `fn` must be an explicit union of the types produced by all branches.

If branches produce incompatible types and no explicit union return type is declared, the compiler emits E-FN-007.

```scrml
// Invalid — E-FN-007: branches return different types, no union declared
fn buildEntity(kind) {
    if (kind == "user") {
        let u = < User>
        u.name = "anon"
        u.age  = 0
        return u
    } else {
        let a = < Admin>
        a.name  = "anon"
        a.level = 1
        return a
    }
}
```

> E-FN-007: `fn buildEntity` returns `User` in one branch (line N) and `Admin` in another (line M). Declare an explicit union return type to allow this: `fn buildEntity(kind) -> User | Admin { ... }`. If the divergence is unintentional, make both branches return the same type.

**Valid resolution — explicit union return type:**

```scrml
fn buildEntity(kind) -> User | Admin {
    if (kind == "user") {
        let u = < User>
        u.name = "anon"
        u.age  = 0
        return u
    } else {
        let a = < Admin>
        a.name  = "anon"
        a.level = 1
        return a
    }
}
```

### 48.5 `lift` Inside `fn`

`lift` (§10) is permitted inside `fn` bodies with the following restrictions:

#### 48.5.1 Scope Boundary

`lift` inside a `fn` body hoists to the **`fn` body scope** — not to any enclosing logic context or caller scope. A `lift` inside a nested `if`/`for`/`match` block inside the `fn` body hoists to the fn-body level, not past the function boundary.

Attempting to `lift` a value past the `fn` boundary (i.e., lifting in a way that would accumulate into the caller's `~`) is E-FN-008.

```scrml
${
    fn buildItems(names) {
        for (name of names) {
            let item = < Item>
            item.name = name
            lift item      // lifts to fn body scope — this initializes ~ inside fn
        }
        return ~           // returns the accumulated list from fn body
    }
}
```

> Note: `lift` inside `fn` accumulates into `~` local to the `fn` body. The `fn` returns `~` explicitly. The caller's `~` is not affected.

#### 48.5.2 E-FN-008 — `lift` Targeting Outer Scope

If a `lift` inside a `fn` body would accumulate past the `fn`'s scope boundary, the compiler emits E-FN-008.

The compiler detects this when the `lift` appears inside a `fn` body but the `~` accumulator it would target was initialized in an enclosing `${}` logic context rather than within the `fn` body itself.

> E-FN-008: `lift` at line N inside `fn buildItems` targets a `~` accumulator initialized at line M, which is outside the `fn` boundary. `lift` inside `fn` may only accumulate into `~` initialized within the same `fn` body.

#### 48.5.3 Reactive Reference Reads — Pure Value vs. Live Subscription

Inside a `fn` body, a `lift` that reads an `@variable` performs a **pure value read** — it captures the current value of the reactive variable at the moment the `fn` executes. It does NOT establish a live subscription or dependency edge.

Capturing a reactive reference as a live subscription (i.e., in a way that would cause the `fn` to re-execute when the reactive variable changes) is a violation of the outer-scope mutation prohibition (§48.3.3) and is separately classified as E-FN-009.

#### 48.5.4 E-FN-009 — Reactive Reference Captured as Live Subscription

If a `fn` body contains an expression that would create a live reactive dependency on an `@variable` declared outside the `fn` boundary — such as wrapping the call in a reactive observer or registering a watcher — the compiler emits E-FN-009.

```scrml
${ 
    @count = 0

    // Invalid — E-FN-009
    fn buildSnapshot() {
        let s = < Snapshot>
        s.value = meta.subscribe("count", () => { ... })   // live subscription capture
        return s
    }
}
```

> E-FN-009: `fn buildSnapshot` captures `@count` as a live reactive subscription at line N. `fn` may only read the current value of an `@variable`, not register a dependency on it. Use `@count` directly as a value (`s.value = @count`) to capture the current value at call time.

### 48.6 Calling Conventions

#### 48.6.1 `fn` May Call `fn`

A `fn` body MAY call other `fn`-declared functions. The transitivity of `fn` constraints applies: if a called `fn` is valid, calling it does not introduce any body prohibition violations.

```scrml
fn buildAddress(city, country) {
    let a = < Address>
    a.city    = city
    a.country = country
    return a
}

fn buildUser(name, city, country) {
    let u    = < User>
    let addr = buildAddress(city, country)   // valid: fn calling fn
    u.name    = name
    u.address = addr
    return u
}
```

#### 48.6.2 `fn` SHALL NOT Call `function`

A `fn` body SHALL NOT call a `function`-declared callable (§7.3), because `function` declarations carry no purity guarantees and may contain any of the five prohibited constructs. Calling a `function` from inside `fn` is E-FN-003 (outer-scope mutation vector) unless the compiler can statically verify the `function` body satisfies all five prohibitions — which is only possible for `pure function` declarations.

**Exception:** A `fn` body MAY call a `pure function` (§33), because `pure function` satisfies a strict superset of `fn`'s body prohibitions.

```scrml
pure function double(x) { return x * 2; }

fn buildScaled(value) {
    let s = < Scaled>
    s.value = double(value)   // valid: pure function call from fn
    return s
}
```

```scrml
function effectfulHelper() { @counter = @counter + 1; }   // mutates reactive state

fn buildItem(name) {
    let i = < Item>
    i.name = name
    effectfulHelper()   // Invalid — E-FN-003: calls a non-pure function
    return i
}
```

> E-FN-003: `fn buildItem` calls `effectfulHelper` at line N. `effectfulHelper` is declared with `function` (not `pure function` or `fn`) and may contain side effects. A `fn` body may only call other `fn` functions or `pure function` declarations.

#### 48.6.3 `fn` as a Value

`fn` declarations MAY be:
- Assigned to `let`/`const`/`lin` variables.
- Passed as function arguments.
- Stored as fields of `<state>` objects (using a function type annotation).
- Returned from other `fn` bodies (the returned `fn` carries its constraints).

When a `fn` is stored in a `<state>` field, the field's type annotation carries the `fn` constraint. Calling the stored function is subject to the same constraints as calling any `fn` directly.

### 48.7 Multiple `<state>` Objects in One `fn`

A single `fn` body MAY construct multiple `<state>` objects. Each is tracked independently by the field phase system (§48.4.1). All must be fully Loaded before they appear in any `return` statement.

```scrml
fn buildPair(aName, bName) {
    let a = < Item>
    let b = < Item>
    a.name = aName
    b.name = bName
    return { first: a, second: b }   // both fully loaded — valid
}
```

If one object is Loaded and another is Unloaded at a `return` site, E-FN-006 fires for the Unloaded object. Both errors are reported in the same compilation pass; compilation does not halt after the first.

### 48.8 Return Type Annotation

`fn` declarations MAY carry an explicit return type annotation using the `->` syntax:

```
fn-return-annotation ::= '->' type-expr
fn-declaration       ::= fn-prefix identifier fn-params? fn-return-annotation? fn-body
```

When a return type annotation is present:
- The compiler verifies that all `return` statements in the body produce values assignable to the declared return type.
- For union return types, E-FN-007 is suppressed when the declared union covers all branch types.
- If the annotation declares a non-`<state>` return type, field phase tracking is still performed for any `<state>` objects constructed inside the body and returned.

When a return type annotation is absent:
- The compiler infers the return type from the `return` statements.
- If all `return` statements produce the same `<state>` type, the inferred return type is that type.
- If `return` statements produce different types, E-FN-007 fires.
- If `fn` is used as an anonymous expression in a typed position (e.g., assigned to a `const` with a type annotation), the annotation on the outer binding is used as the expected return type.

### 48.9 Relationship to `pure` (§33)

`pure fn` is a valid combination. `pure` adds the constraint that the function is memoization-safe and MAY be evaluated at compile time if all arguments are compile-time constants (§33.5). The five `fn` body prohibitions are a strict subset of `pure`'s purity constraints. Therefore:

- Every valid `fn` body is a subset of what `pure` allows.
- `pure fn` is valid and enforces both constraint sets.
- `pure function` (without `fn`) is NOT a state factory and does not trigger field phase tracking.

The combination `pure fn` does not add any constraints beyond what `fn` already enforces (since `fn`'s five prohibitions fully imply purity). `pure` adds the optimizer permission to memoize and evaluate at compile time.

### 48.10 Relationship to `server fn` (§12.5)

`server fn` designates a `fn` body that executes server-side. All five `fn` body prohibitions apply to the **server-side** execution context. This means E-FN-002 (DOM mutation) is always trivially satisfied for server-escalated `fn` (no DOM exists server-side), but the compiler still verifies it structurally by checking for DOM API call expressions.

`server fn` MAY call `?{}` SQL contexts only if the SQL is not inside the `fn` body itself — the `fn` receives query results as parameters. If `?{}` appears inside a `server fn` body, E-FN-001 fires regardless of the execution context.

Rationale: `fn` is a state factory, not a query executor. Database access is a coordination concern handled above the `fn` layer.

### 48.11 Supersession of §7.3

Section §7.3 previously described `fn` as a shorthand equivalent to `function`:

> `fn name { ... }` — scrml shorthand lazy form. Equivalent to `function name() { ... }`.

This description is superseded by this section. Effective from this amendment:

- `fn` and `function` are **distinct** declarations with distinct semantics.
- `fn` is a constrained state factory subject to §48.3 through §48.8.
- `function` is an unconstrained callable subject only to `pure` (§33) and `server` (§12.5) modifiers.
- Any existing scrml code using `fn` as a general-purpose function shorthand remains syntactically valid. The compiler will apply the new constraints and emit E-FN-001 through E-FN-009 where violations are present.

### 48.12 Error Code Reference

| Code | Trigger | Severity |
|------|---------|----------|
| E-FN-001 | `?{}` SQL access inside a `fn` body | Error |
| E-FN-002 | DOM mutation call inside a `fn` body | Error |
| E-FN-003 | Outer-scope variable mutation inside a `fn` body, or call to a non-`pure`, non-`fn` function | Error |
| E-FN-004 | Non-deterministic call (`Date.now`, `Math.random`, `crypto.randomUUID`, etc.) inside a `fn` body | Error |
| E-FN-005 | `async` on a `fn` declaration, or `await` inside a `fn` body | Error |
| E-FN-006 | `return` reached with one or more `<state>` fields still in Unloaded phase | Error |
| E-FN-007 | Branches produce incompatible `<state>` types without an explicit union return type | Error |
| E-FN-008 | `lift` inside `fn` body targets a `~` accumulator initialized outside the `fn` boundary | Error |
| E-FN-009 | Reactive `@variable` captured as a live subscription inside a `fn` body | Error |
| W-FN-001 | `asIs`-typed value used in DOM-mutation position inside `fn` body (probable violation, unverifiable) | Warning |

### 48.13 Normative Statements

- `fn` SHALL be a distinct declaration keyword from `function`. They are not aliases. (§48.11)
- A `fn` body SHALL NOT contain a `?{}` SQL context at any syntactic nesting depth. The compiler SHALL emit E-FN-001. (§48.3.1)
- A `fn` body SHALL NOT contain any DOM mutation call from the known-identifier list. The compiler SHALL emit E-FN-002. (§48.3.2)
- A `fn` body SHALL NOT write to any variable declared outside the `fn`'s scope boundary. The compiler SHALL emit E-FN-003. (§48.3.3)
- A `fn` body SHALL NOT call any non-`pure`, non-`fn` function. The compiler SHALL emit E-FN-003. (§48.6.2)
- A `fn` body SHALL NOT contain calls to any non-deterministic built-in from the enumerated list. The compiler SHALL emit E-FN-004. (§48.3.4)
- A `fn` declaration SHALL NOT carry the `async` keyword. The compiler SHALL emit E-FN-005. (§48.3.5)
- `await` SHALL NOT appear inside a `fn` body. The compiler SHALL emit E-FN-005. (§48.3.5)
- The compiler SHALL track each field of each `<state>` object constructed in a `fn` body as Unloaded until assigned. (§48.4.1)
- A `return` statement in a `fn` body SHALL NOT be reached when any `<state>` field is in the Unloaded phase. The compiler SHALL emit E-FN-006. (§48.4.3)
- When `fn` branches return different `<state>` types without an explicit union return type annotation, the compiler SHALL emit E-FN-007. (§48.4.4)
- `lift` inside a `fn` body SHALL accumulate into `~` at the `fn`-body level only. The compiler SHALL emit E-FN-008 if `lift` targets an outer scope's `~`. (§48.5.1–48.5.2)
- A `lift` of an `@variable` inside a `fn` body SHALL read the current value only; it SHALL NOT establish a reactive subscription. (§48.5.3)
- Establishing a live reactive dependency on an `@variable` declared outside the `fn` boundary SHALL be a compile error (E-FN-009). (§48.5.4)
- A `fn` body MAY call other `fn`-declared functions. (§48.6.1)
- A `fn` body MAY call `pure function` declarations. (§48.6.2)
- `fn` body constraints SHALL be verified at the TS stage (compiler Stage 6), after type resolution and route inference. (§48.1)
- All E-FN-001 through E-FN-009 errors SHALL be reported in a single pass. Compilation SHALL NOT halt after the first error in the set. (§48.7, implied)
- The `pure fn` combination is valid. `pure` adds memoization and compile-time evaluation permissions but does not add constraints beyond `fn`'s existing prohibitions. (§48.9)

### 48.14 Worked Examples

#### 48.14.1 Valid — Basic State Factory

```scrml
<state Point>
    x: number
    y: number
</>

fn makePoint(x, y) {
    let p = < Point>
    p.x = x
    p.y = y
    return p
}

${
    let origin = makePoint(0, 0)
    let corner = makePoint(100, 200)
}
```

Expected: Compiles without error. `makePoint` constructs fully-initialized `Point` objects. Both calls produce Loaded `Point` instances.

#### 48.14.2 Valid — fn Calling fn with Composition

```scrml
<state Rect>
    topLeft:     Point
    bottomRight: Point
    label:       string
</>

fn makeRect(x1, y1, x2, y2, label) {
    let r           = < Rect>
    r.topLeft       = makePoint(x1, y1)
    r.bottomRight   = makePoint(x2, y2)
    r.label         = label
    return r
}
```

Expected: Compiles without error. `makeRect` calls `fn makePoint` (valid), assigns all fields.

#### 48.14.3 Valid — Conditional Assignment with `lift`

```scrml
<state Tag>
    name:     string
    priority: number
</>

fn buildTags(names) {
    for (name of names) {
        let t      = < Tag>
        t.name     = name
        t.priority = 0
        lift t
    }
    return ~
}
```

Expected: Compiles without error. `lift t` inside the `for` loop hoists each fully-loaded `Tag` into `~` at the `fn`-body level. `return ~` returns the accumulated list.

#### 48.14.4 Valid — Union Return Type

```scrml
<state AdminUser>
    name:  string
    level: number
</>

<state GuestUser>
    name: string
</>

fn buildUser(isAdmin, name) -> AdminUser | GuestUser {
    if (isAdmin) {
        let u  = < AdminUser>
        u.name  = name
        u.level = 1
        return u
    } else {
        let u  = < GuestUser>
        u.name = name
        return u
    }
}
```

Expected: Compiles without error. Explicit `-> AdminUser | GuestUser` return type annotation suppresses E-FN-007.

#### 48.14.5 Invalid — Missing Field Assignment (E-FN-006)

```scrml
<state Product>
    name:  string
    price: number
    sku:   string
</>

fn buildProduct(name, price) {
    let p  = < Product>
    p.name  = name
    p.price = price
    // p.sku never assigned
    return p
}
```

Expected compiler output:
```
E-FN-006: `fn buildProduct` returns `p` (type `Product`) at line 11 with field `sku` unassigned.
  All fields of a `<state>` type must be assigned before the object is returned from `fn`.
  Assign `p.sku` before the `return` statement, or give `sku` a default value in the `<state>` declaration.
```

#### 48.14.6 Invalid — SQL Inside fn (E-FN-001)

```scrml
fn buildUserFromDb(id) {
    let row = ?{ SELECT name, age FROM users WHERE id = $id }
    let u   = < User>
    u.name  = row.name
    u.age   = row.age
    return u
}
```

Expected compiler output:
```
E-FN-001: `fn buildUserFromDb` contains a `?{}` SQL access at line 2.
  `fn` is a pure state factory and may not perform database operations.
  Move the `?{}` query outside `fn` and pass the result as a parameter:

    let row = ?{ SELECT name, age FROM users WHERE id = $id }
    let user = buildUserFromDb(row.name, row.age)
```

#### 48.14.7 Invalid — Non-Deterministic Call (E-FN-004)

```scrml
fn buildSession(userId) {
    let s     = < Session>
    s.userId  = userId
    s.id      = crypto.randomUUID()
    s.created = Date.now()
    return s
}
```

Expected compiler output:
```
E-FN-004: `fn buildSession` calls `crypto.randomUUID()` at line 4, which is non-deterministic.
E-FN-004: `fn buildSession` calls `Date.now()` at line 5, which is non-deterministic.
  `fn` must be a pure function of its inputs. Generate identifiers and timestamps outside `fn`
  and pass them as parameters.
```

Two errors reported in one pass; compilation continues to find all violations.

#### 48.14.8 Invalid — Branch Type Mismatch Without Union (E-FN-007)

```scrml
fn buildEntity(kind) {
    if (kind == "product") {
        let p    = < Product>
        p.name   = "Widget"
        p.price  = 9.99
        p.sku    = "W-001"
        return p
    } else {
        let c    = < Category>
        c.name   = "Widgets"
        c.count  = 0
        return c
    }
}
```

Expected compiler output:
```
E-FN-007: `fn buildEntity` returns `Product` at line 7 and `Category` at line 12.
  Both types must be the same, or declare an explicit union return type:

    fn buildEntity(kind) -> Product | Category { ... }
```

### 48.15 Interaction Notes

- **§7.3 (Function Declaration Forms)** — `fn` is no longer a `function` alias. Table row updated by §48.11.
- **§10 (lift)** — `lift` inside `fn` hoists to `fn`-body scope only. E-SYNTAX-002 ("lift inside a named function") is superseded for `fn` by E-FN-008 (scope-boundary violation) when the lift targets an outer `~`. E-SYNTAX-002 continues to apply to `function`-declared bodies only.
- **§11 (State Objects)** — Field phase tracking in §48.4 extends the state object model. `<state>` declarations remain the source of truth for field names and types; the `fn` compiler pass reads field lists from the state type registry.
- **§33 (pure)** — `pure fn` is valid. `pure` adds optimizer permissions. The five `fn` prohibitions are a strict subset of `pure`'s constraints, so `pure fn` does not require additional verification beyond what each keyword already enforces.
- **§35 (lin)** — `lin` declarations are valid inside `fn` bodies and follow the standard linear type rules (§35.3–35.5). A `lin` variable inside `fn` must be consumed exactly once within the `fn` body; it cannot be returned as unconsumed.
- **§47 (Output Name Encoding)** — The kind marker `f` (§47.1.2) applies to both `fn`-declared and `function`-declared callables. The encoding does not distinguish between them at the name-encoding level.

### 48.16 Future Considerations (Non-Normative)

The following design directions are noted for future specification work. They are not normative and SHALL NOT be implemented ahead of a future spec amendment.

**Effect rows.** The five `fn` body prohibitions (§48.3) are a strict subset of any correct effect-row encoding. A future version of scrml MAY introduce explicit effect row syntax (`fn<db>`, `fn<dom>`, `fn<rand>`) that allows selective permission grants per call site. The five prohibitions define the zero-effect baseline from which effect rows would be additive.

**Implicit builder context.** The current design requires explicit field assignments (`p.name = value`) with `lift` for control-flow-conditional paths. A future version MAY introduce a fully implicit builder pattern (inspired by Swift result builders) where field assignments inside the `fn` body are automatically accumulated without explicit `lift`, and the return statement is inferred. This would require resolving ambiguity between multiple `<state>` objects under construction simultaneously.
# §49. `while` Loops, `do...while`, `break`, and `continue`

**Added:** 2026-04-07. Motivation: self-hosting the compiler's parser files (tokenizer,
block-splitter, ast-builder), which are character-scanning state machines that require
`while`-bounded iteration with early exit and iteration skip.

---

## 49.1 Overview

scrml adds three imperative loop constructs:

- `while` — condition-tested loop (condition checked before each iteration).
- `do...while` — body-first loop (condition checked after each iteration; body executes at
  least once).
- `break` / `continue` — iteration control, with optional label targeting.

These constructs are STATEMENTS. Unlike `for...of`, a bare `while` does not produce a value.
`while` + `lift` (§49.6) produces an array using the same `~` accumulator mechanism as
`for...of` + `lift`.

These constructs compile directly to their JavaScript equivalents. They are not desugared
into any other scrml form. The compiler generates passthrough JS for all loop constructs in
this section.

---

## 49.2 Syntax

### 49.2.1 Grammar Productions

```ebnf
while-stmt       ::= label-prefix? 'while' '(' expression ')' loop-body
do-while-stmt    ::= label-prefix? 'do' loop-body 'while' '(' expression ')'
loop-body        ::= '{' loop-statement* '}'
loop-statement   ::= statement | break-stmt | continue-stmt
break-stmt       ::= 'break' label-ref? ';'?
continue-stmt    ::= 'continue' label-ref? ';'?
label-prefix     ::= Identifier ':'
label-ref        ::= Identifier
```

`statement` here is any statement valid in a logic context `${}` body (§7), including
`let`/`const`/`lin` declarations, `if`, `match`, `for...of`, nested `while`, `do...while`,
`lift`, function calls, and assignments.

### 49.2.2 Label Syntax

A label is a plain identifier immediately followed by `:` on the line before (or the same
line as) the loop keyword.

```scrml
outer: while (i < len) {
    inner: while (j < len) {
        break outer
    }
}
```

Labels are a statement-level annotation. They are not declarations and do not introduce
bindings into any scope. A label identifier does not shadow, and is not shadowed by, any
variable binding of the same name.

Label identifiers SHALL be unique within the enclosing function body (or top-level logic
block if not inside a function). Two loops at any nesting depth within the same function
body SHALL NOT share a label identifier. The compiler SHALL reject duplicate labels with
E-LOOP-006.

### 49.2.3 Condition Expression

The condition expression in `while (condition)` and `do...while (condition)` SHALL be any
expression valid in a logic context `${}`. The expression is evaluated as a boolean:
falsy values terminate the loop, truthy values continue it. The compiler applies the same
boolean coercion rules as `if`.

No special restriction applies to the type of the condition. The developer is responsible
for ensuring the condition eventually becomes falsy. The compiler does not check for
infinite loops.

---

## 49.3 Semantics

### 49.3.1 `while` Loop Execution

1. The condition expression is evaluated.
2. If the result is falsy, the loop exits. Execution continues with the next statement after
   the loop body.
3. If the result is truthy, the loop body executes from top to bottom.
4. After the body completes (or after a `continue` short-circuits to step 1), return to
   step 1.

A `while` loop MAY execute zero times if the condition is falsy on the first evaluation.

### 49.3.2 `do...while` Loop Execution

1. The loop body executes from top to bottom.
2. After the body completes (or after a `continue` short-circuits to step 2's condition
   check), the condition expression is evaluated.
3. If the result is falsy, the loop exits. Execution continues with the next statement after
   the `while (condition)` terminator.
4. If the result is truthy, return to step 1.

A `do...while` loop ALWAYS executes its body at least once.

### 49.3.3 `break` Semantics

`break` immediately exits the nearest enclosing loop. No remaining statements in the loop
body execute. Execution continues with the first statement after the closing `}` of the
exited loop.

`break label` immediately exits the loop whose `label-prefix` matches the given identifier.
The target loop does not have to be the nearest enclosing loop; it may be any ancestor loop
within the same function body. All intermediate loop iterations between the `break` site and
the labeled loop are also terminated.

After a `break label`, execution continues with the first statement after the closing `}` of
the labeled loop.

### 49.3.4 `continue` Semantics

`continue` skips the remaining statements in the current loop body iteration. For a `while`
loop, control returns to the condition check (step 1 of §49.3.1). For a `do...while` loop,
control returns to the condition check (step 2 of §49.3.2).

`continue label` skips the remaining statements of the current iteration of the loop with
the matching label. The same step-1/step-2 distinction applies based on the targeted loop
type.

`continue` does NOT exit the loop — it skips to the next iteration.

---

## 49.4 Normative Statements

### 49.4.1 Structural Validity

- A `while` statement SHALL be valid in any position where a statement is valid in a logic
  context `${}` body, inside `fn` bodies (§48), and inside `function` bodies.

- A `do...while` statement SHALL be valid in the same positions as `while`.

- `break` SHALL be valid only inside a loop body (`while`, `do...while`, or `for...of`). The
  compiler SHALL reject `break` that appears outside any enclosing loop with E-LOOP-001.

- `continue` SHALL be valid only inside a loop body. The compiler SHALL reject `continue`
  that appears outside any enclosing loop with E-LOOP-002.

### 49.4.2 Labeled Control Flow

- `break label` SHALL reference a label that is (a) defined in the same function body (or
  top-level logic block) as the `break` statement, and (b) annotates a loop statement. The
  compiler SHALL reject `break label` where the label does not exist or does not annotate a
  loop with E-LOOP-003.

- `continue label` SHALL reference a label that is (a) defined in the same function body (or
  top-level logic block) as the `continue` statement, and (b) annotates a loop statement.
  The compiler SHALL reject `continue label` where the label does not exist or does not
  annotate a loop with E-LOOP-004.

- Label identifiers SHALL be unique within the enclosing function body (or top-level logic
  block). The compiler SHALL reject duplicate label identifiers with E-LOOP-006.

### 49.4.3 Function Boundary Rule

- `break` inside a `fn` body (§48) or `function` body SHALL NOT target a loop declared
  outside that function's scope boundary. The compiler SHALL reject such usage with E-LOOP-005.

- `continue` inside a `fn` body or `function` body SHALL NOT target a loop declared outside
  that function's scope boundary. The compiler SHALL reject such usage with E-LOOP-005.

- The function boundary rule applies to all nested callable forms: `fn`, `function`, and
  arrow functions (`() => { ... }`). An arrow function inside a loop body does not
  participate in the enclosing loop's break/continue scope.

### 49.4.4 `while` as a Statement

- A bare `while` statement SHALL NOT be used as an expression. The compiler SHALL reject any
  attempt to use a `while` statement in an expression position (e.g., `let x = while (...) { ... }`)
  without the `lift` accumulator pattern (§49.6). The error is E-LOOP-007.

- A `while` statement in a `lift`-accumulating context (§49.6) is valid as an expression
  position assignment target via the `~` accumulator. This is the only exception.

---

## 49.5 Type Rules

### 49.5.1 Condition Type

The condition expression in `while (condition)` and `do...while (condition)` SHALL be any
type that is boolean-coercible. The compiler applies the same coercion rules as the `if`
condition expression (§17.1). No additional type constraint is imposed.

### 49.5.2 Loop Body Type

A bare `while` or `do...while` statement produces no value. Its type is `void`. It SHALL NOT
appear in a value position unless paired with `lift` (§49.6).

### 49.5.3 Interaction with `lin` (§35)

A `lin` variable declared outside a loop body SHALL NOT be consumed inside a loop body. The
compiler treats any loop body as a potential multi-execution site. Consuming a `lin` variable
inside a loop body is E-LIN-002 (consumed more than once on at least one execution path
where the loop executes more than once) and simultaneously E-LIN-001 (consumed zero times on
execution paths where the loop does not execute).

The compiler SHALL reject any `lin` consumption inside a `while`, `do...while`, or `for...of`
loop body unconditionally, regardless of any static analysis of the condition. This rule
mirrors the existing `for...of` rule in §35.4.4.

A `lin` variable declared INSIDE a loop body is in a new scope per iteration. The compiler
tracks it as a fresh binding on each iteration. Such a `lin` variable must be consumed within
the same iteration's scope before the next `continue` or the natural end of the loop body.
A `lin` declared inside a loop body that is not consumed before `break` or `continue` on the
fast-exit path is E-LIN-001 on that path.

**Normative statements:**

- A `lin` variable declared outside a loop body (`while`, `do...while`, `for...of`) SHALL NOT
  be consumed inside that loop body. The compiler SHALL reject such consumption with
  E-LIN-002.

- A `lin` variable declared inside a loop body SHALL be consumed on every execution path
  within that iteration's scope, including paths that reach `break` or `continue`. Failure on
  any path is E-LIN-001 or E-LIN-003 as appropriate.

---

## 49.6 `lift` Inside `while` and `do...while`

`lift` inside a `while` or `do...while` body works identically to `lift` inside a `for...of`
body. Each iteration may emit zero or more values via `lift`. The values accumulate into the
`~` accumulator for the enclosing anonymous logic context `${}`.

The result is an array of lifted values in iteration order. The `~` accumulator semantics of
§32 apply: `~` is a `lin` value, subject to exactly-one-consumption rules.

### 49.6.1 While-as-Expression Pattern

A `while` loop that lifts values may be used in the position of a value assignment via the
`~` accumulator:

```scrml
${
    let items = []
    while (hasNext()) {
        lift getNext()
    }
    // ~ holds the array of lifted values
    let result = ~
}
```

The assignment `let result = ~` is the single consumption of `~`. If the `while` loop lifts
nothing (executes zero times or no `lift` fires), `~` holds an empty array. The consumption
of `~` is still required.

### 49.6.2 Normative Statements for `lift` in Loops

- `lift` SHALL be valid inside `while` and `do...while` loop bodies when those loops appear
  in an anonymous logic context `${}`.

- Each `lift` call inside a loop body SHALL append one value to the `~` accumulator of the
  enclosing anonymous logic context.

- `lift` inside a loop body inside a named function (`function` or `fn`) SHALL be a compile
  error (E-SYNTAX-002), consistent with §10.4.

- The ordering guarantee of §10.5.1 applies: the accumulation order of `lift` is the runtime
  execution order. Values lifted from earlier iterations appear before values lifted from
  later iterations.

---

## 49.7 Interaction with `fn` (§48)

`while` and `do...while` are valid inside `fn` bodies. Pure computation loops — scanning
characters, accumulating computed values, iterating until a condition is met — are all
legitimate uses of `while` inside `fn`.

The body prohibitions of §48.3 apply inside `while` bodies that appear in `fn`: SQL access
(E-FN-001), DOM mutation (E-FN-002), outer-scope mutation (E-FN-003), non-deterministic
calls (E-FN-004), and async/await (E-FN-005) are all forbidden.

`break` and `continue` inside a `fn` body target only loops that are also inside the `fn`
body (§49.4.3, E-LOOP-005).

`lift` inside a `while` loop inside a `fn` body is E-SYNTAX-002, consistent with §10.4.

---

## 49.8 Codegen — Passthrough Compilation

`while`, `do...while`, `break`, `continue`, and loop labels compile to their direct
JavaScript equivalents. No transformation is applied beyond variable name encoding (§47).

| scrml construct | Compiled JavaScript |
|---|---|
| `while (cond) { body }` | `while (cond) { body }` |
| `do { body } while (cond)` | `do { body } while (cond)` |
| `break` | `break` |
| `break label` | `break label` |
| `continue` | `continue` |
| `continue label` | `continue label` |
| `label: while (cond) { body }` | `label: while (cond) { body }` |
| `label: do { body } while (cond)` | `label: do { body } while (cond)` |

Variable references inside loop bodies are subject to the same name encoding as all other
logic context variable references (§47).

The condition expression compiles as any other logic context expression.

---

## 49.9 Error Code Definitions

### E-LOOP-001: `break` Outside Any Loop

`break` appears in a position not enclosed by any `while`, `do...while`, or `for...of` loop.

```scrml
${ 
    let x = compute()
    break      // Error E-LOOP-001 — no enclosing loop
}
```

> E-LOOP-001: `break` at line N is not inside any loop. `break` may only appear inside a
> `while`, `do...while`, or `for...of` loop body. Remove `break` or move it inside a loop.

---

### E-LOOP-002: `continue` Outside Any Loop

`continue` appears in a position not enclosed by any `while`, `do...while`, or `for...of` loop.

```scrml
${
    continue   // Error E-LOOP-002 — no enclosing loop
}
```

> E-LOOP-002: `continue` at line N is not inside any loop. `continue` may only appear inside
> a `while`, `do...while`, or `for...of` loop body. Remove `continue` or move it inside a
> loop.

---

### E-LOOP-003: `break label` — Label Not Found or Not a Loop

`break label` references a label identifier that does not exist in the current function
scope, or that exists but does not annotate a loop statement.

```scrml
outer: while (true) {
    // 'inner' is not defined here
    break inner   // Error E-LOOP-003
}
```

```scrml
notALoop: let x = 5
while (true) {
    break notALoop   // Error E-LOOP-003 — label exists but not on a loop
}
```

> E-LOOP-003: `break notALoop` at line N references a label that does not exist or does not
> annotate a loop. Valid loop labels in this scope: `outer`. Check the label name and ensure
> it annotates a `while`, `do...while`, or `for...of` statement.

---

### E-LOOP-004: `continue label` — Label Not Found or Not a Loop

`continue label` references a label identifier that does not exist in the current function
scope, or that exists but does not annotate a loop statement.

```scrml
while (i < len) {
    continue missing   // Error E-LOOP-004
}
```

> E-LOOP-004: `continue missing` at line N references a label that does not exist or does
> not annotate a loop. Check the label name and ensure it annotates a `while`, `do...while`,
> or `for...of` statement.

---

### E-LOOP-005: `break`/`continue` Crosses Function Boundary

`break` or `continue` (labeled or unlabeled) inside a `fn`, `function`, or arrow function
body targets a loop that is declared outside that function's scope boundary.

```scrml
while (i < len) {
    let process = () => {
        break   // Error E-LOOP-005 — targets loop outside arrow function
    }
    process()
}
```

```scrml
outer: while (i < len) {
    fn step() {
        break outer   // Error E-LOOP-005 — 'outer' is outside fn boundary
    }
    step()
}
```

> E-LOOP-005: `break` at line N is inside a function body and attempts to exit a loop that
> is outside the function's scope boundary. `break` and `continue` cannot cross function
> boundaries. Restructure so the loop control logic is not inside a nested function, or
> return a signal value from the function and handle the break at the call site.

---

### E-LOOP-006: Duplicate Label in Function Scope

Two loops in the same function body (or top-level logic block) share a label identifier.

```scrml
fn scan() {
    loop: while (i < len) { ... }
    loop: while (j < len) { ... }   // Error E-LOOP-006
}
```

> E-LOOP-006: Label `loop` at line N is already used by the loop at line M in the same
> function scope. Label identifiers must be unique within a function body. Rename one of the
> labels.

---

### E-LOOP-007: `while` Statement in Expression Position Without `lift`

A `while` statement is used as the right-hand side of an assignment or in another expression
position without the `lift`/`~` pattern.

```scrml
let x = while (true) { 5 }   // Error E-LOOP-007
```

> E-LOOP-007: A `while` statement at line N is used as an expression value, but `while` is a
> statement, not an expression. To collect values from a loop, use `lift` inside the loop
> body and consume `~` after the loop. See §49.6.

---

## 49.10 Error Code Summary

| Code | Condition | Severity |
|---|---|---|
| E-LOOP-001 | `break` appears outside any loop | Error |
| E-LOOP-002 | `continue` appears outside any loop | Error |
| E-LOOP-003 | `break label` — label not found or not a loop | Error |
| E-LOOP-004 | `continue label` — label not found or not a loop | Error |
| E-LOOP-005 | `break`/`continue` crosses a function scope boundary | Error |
| E-LOOP-006 | Duplicate label identifier within the same function scope | Error |
| E-LOOP-007 | `while` used as an expression without `lift`/`~` pattern | Error |

All E-LOOP errors are reported at the TS stage (Stage 6), after AST construction and scope
resolution, as part of the loop control flow validation pass.

---

## 49.11 Worked Examples

### Example 1 — Valid: character scanner (canonical self-hosting use case)

```scrml
fn scanIdent(src, startPos) {
    let pos  = startPos
    let len  = src.length
    let buf  = ""

    while (pos < len) {
        let ch = src[pos]
        if (!isIdentChar(ch)) { break }
        buf = buf + ch
        pos = pos + 1
    }

    let result = < ScanResult>
    result.value  = buf
    result.endPos = pos
    return result
}
```

Expected: compiles without error. The `while` loop scans until a non-ident character is
found and breaks. All `<ScanResult>` fields are assigned before `return`. No `lin`
variables are involved.

---

### Example 2 — Valid: `do...while` — read-at-least-once pattern

```scrml
${
    let attempts = 0
    let success  = false

    do {
        success  = tryConnect()
        attempts = attempts + 1
    } while (!success && attempts < 5)
}
```

Expected: compiles without error. The body always executes at least once, retrying the
connection up to five times.

---

### Example 3 — Valid: labeled `break` for nested loop escape

```scrml
fn findPair(matrix) {
    let rows = matrix.length
    let cols = matrix[0].length
    let found = < Found>
    found.row = -1
    found.col = -1

    outer: while (let i = 0; i < rows; i = i + 1) {
        let j = 0
        inner: while (j < cols) {
            if (matrix[i][j] == 0) {
                found.row = i
                found.col = j
                break outer
            }
            j = j + 1
        }
    }

    return found
}
```

Expected: compiles without error. `break outer` exits both the inner and outer loops. After
`break outer`, execution continues after the outer loop's closing `}`. All `<Found>` fields
are assigned before `return` (the initial -1 assignments cover the not-found path).

---

### Example 4 — Valid: `continue` to skip iterations

```scrml
${
    let i = 0
    while (i < items.length) {
        i = i + 1
        if (items[i - 1].skip) { continue }
        lift processItem(items[i - 1])
    }
    let result = ~
}
```

Expected: compiles without error. Items marked `skip` are skipped via `continue`; only
non-skipped items are lifted into the `~` accumulator. `~` is consumed once after the loop.

---

### Example 5 — Invalid: `break` outside any loop (E-LOOP-001)

```scrml
${
    let done = false
    break
}
```

Expected compiler output:

```
E-LOOP-001 at line 3: `break` is not inside any loop. `break` may only appear inside a
`while`, `do...while`, or `for...of` loop body. Remove `break` or move it inside a loop.
```

---

### Example 6 — Invalid: `break` across function boundary (E-LOOP-005)

```scrml
${
    while (i < len) {
        let check = fn() {
            break   // attempts to break the while loop above
        }
        check()
    }
}
```

Expected compiler output:

```
E-LOOP-005 at line 4: `break` is inside a `fn` body and attempts to exit a loop that is
outside the `fn`'s scope boundary. `break` and `continue` cannot cross function boundaries.
Return a boolean signal from the `fn` and use it to control the outer loop.
```

---

### Example 7 — Invalid: `lin` consumed inside loop body (E-LIN-002)

```scrml
${
    lin token = fetchToken()
    while (retries < max) {
        useToken(token)   // Error: lin consumed inside loop body
        retries = retries + 1
    }
}
```

Expected compiler output:

```
E-LIN-002 at line 4: `lin` variable `token` is consumed inside a loop body. The loop may
execute more than once, causing `token` to be used multiple times. Consume `token` exactly
once outside the loop, or pass it as a parameter to a function called before the loop.
```

---

### Example 8 — Invalid: `while` used as expression without `lift` (E-LOOP-007)

```scrml
${
    let result = while (hasData()) {
        getData()
    }
}
```

Expected compiler output:

```
E-LOOP-007 at line 2: A `while` statement is used as an expression value. `while` is a
statement, not an expression. To collect values from a loop, use `lift` inside the loop body
and consume `~` after the loop. See §49.6.
```

---

## 49.12 Interaction Notes

### 49.12.1 Interaction with §10 (`lift`)

`lift` inside `while` and `do...while` behaves identically to `lift` inside `for...of`.
Values accumulate into the `~` accumulator of the enclosing anonymous logic context. The
`lift` is not valid inside named functions (E-SYNTAX-002), which includes `fn` bodies (§48).
See §49.6 for the complete specification.

### 49.12.2 Interaction with §32 (`~`)

`~` is a `lin` variable. It must be consumed exactly once after any `lift` inside the loop.
If the loop lifts values and the `~` accumulator is not consumed before scope exit,
E-TILDE-001 fires (§32.5). If `~` is consumed before the loop or between iterations,
E-LIN-002 fires.

### 49.12.3 Interaction with §35 (`lin`)

A `lin` variable declared outside a loop body SHALL NOT be consumed inside the loop body
(E-LIN-002). A `lin` variable declared inside a loop body is scoped to one iteration and
must be fully consumed within that iteration on every exit path (including `break` and
`continue` paths). See §49.5.3 for the full analysis.

### 49.12.4 Interaction with §48 (`fn`)

`while` and `do...while` are valid inside `fn` bodies. The §48.3 body prohibitions
(SQL, DOM, outer-scope mutation, non-determinism, async) apply inside loop bodies that appear
in `fn`. `break`/`continue` inside a `fn` body cannot target loops outside the `fn` boundary
(E-LOOP-005). See §49.7 for the complete specification.

### 49.12.5 Interaction with §17 (`for...of`)

`for...of` is the primary iteration form for arrays and iterables. `while` is the correct
choice when:
- The termination condition is not a collection length (e.g., `pos < len` over a string buffer).
- The loop requires labeled multi-level break/continue.
- At least-once semantics are needed (`do...while`).
- The loop advances position manually (state machine patterns).

Both `for...of` and `while` participate equally in `lift` accumulation, `lin` tracking, and
the function boundary rules for `break`/`continue`.

### 49.12.6 Interaction with §19 (Error Handling)

`break` and `continue` inside a `try` block (if try/catch is in scope from JavaScript
interop or `_{}` foreign code contexts) follow standard JavaScript semantics. scrml does not
define a `try` keyword. Error handling in scrml uses the `!{}` error context (§19). `break`
and `continue` inside an `!{}` block's handler arms behave identically to their behavior in
any other logic context: they target the nearest enclosing loop and obey the function
boundary rule.
## 50. Assignment as Expression

**Added:** 2026-04-07. Motivated by self-hosting the compiler's `ast-builder.js`, which uses the `while ((m = re.exec(str)) !== null)` regex iteration pattern throughout. Without assignment-as-expression, these patterns require a rewrite into a less natural two-statement form that diverges from idiomatic algorithmic code.

### 50.1 Overview

In scrml, a bare assignment (`x = value`) MAY appear in any expression position. The result of the assignment expression is the assigned value. This is a narrow, precisely scoped feature: only bare variable assignment is an expression. Declaration forms (`let`, `const`, `lin`) are statements and are never expressions.

The primary motivating use case is the regex iteration idiom:

```scrml
while ((m = re.exec(str)) !== null) {
    // process match m
}
```

Assignment-as-expression is intentionally low-friction for the common case and intentionally high-friction in condition positions to prevent the classic `if (x = 5)` accidental-assignment defect.

### 50.2 Syntax

#### 50.2.1 Grammar Productions

```
assign-expr       ::= lvalue '=' expr
                    | lvalue '=' assign-expr          (* right-associative chaining *)

lvalue            ::= identifier
                    | reactive-lvalue

reactive-lvalue   ::= '@' identifier

expr              ::= assign-expr
                    | ... (* all existing scrml expression forms *)

condition-expr    ::= '(' assign-expr ')'            (* double-parens form — intentional *)
                    | expr                            (* any non-assignment expression *)

while-stmt        ::= 'while' '(' condition-expr ')' block
if-stmt-logic     ::= 'if' '(' condition-expr ')' block else-clause?
```

The following are NOT expressions and SHALL NOT appear in expression position:

```
let-decl    ::= 'let'   identifier ('=' expr)?
const-decl  ::= 'const' identifier '=' expr
lin-decl    ::= 'lin'   identifier '=' expr
```

Attempting to use a declaration form as an expression is E-ASSIGN-001.

#### 50.2.2 Operator Precedence and Associativity

Assignment (`=`) has the **lowest precedence** of all infix operators. It is **right-associative**.

Chained assignment `a = b = c = value` parses as `a = (b = (c = value))`. Each inner assignment evaluates to the assigned value, which becomes the right-hand side of the outer assignment.

The precedence table entry for `=` as an expression operator:

| Precedence (low → high) | Operator | Associativity |
|-------------------------|----------|---------------|
| 1 (lowest)              | `=`      | Right         |
| 2                       | `\|\|`, `&&` | Left      |
| 3                       | `==`, `!=` | Left        |
| 4                       | `<`, `>`, `<=`, `>=` | Left |
| 5                       | `+`, `-` | Left         |
| 6                       | `*`, `/`, `%` | Left     |
| 7 (highest, excluding unary) | `.`, `()`, `[]` | Left |

#### 50.2.3 Condition-Position Disambiguation Rule

The compiler distinguishes intentional assignment-in-condition from accidental assignment-instead-of-comparison by the double-parentheses form:

- **`while ((x = expr))`** — double parens. The inner `(x = expr)` is the assignment expression. The outer parens are the while condition's required parens. This is unambiguously intentional. No warning is emitted.

- **`while (x = expr)`** — single parens. The `=` appears directly inside the condition parens. This triggers W-ASSIGN-001 (did you mean `==`?). The program is not rejected — the warning is advisory.

- **`if ((x = expr))`** — same rule applies. Double parens signals intent.

- **`if (x = expr)`** — triggers W-ASSIGN-001.

The double-parens requirement applies only when assignment appears as the **outermost** expression inside the condition. Assignment nested inside a larger expression (e.g., `while ((m = re.exec(str)) !== null)`) is NOT subject to the double-parens requirement because the assignment is not the outermost expression — the `!== null` comparison is outermost.

Formally: W-ASSIGN-001 is triggered when the direct child of the while/if condition's parens is an `assign-expr` node (i.e., the root of the condition expression tree is `=`). When the assign-expr appears at any non-root position in the condition expression tree, no warning is triggered.

### 50.3 Semantics

#### 50.3.1 Evaluation Order

An assignment expression `x = value` is evaluated as follows:

1. Evaluate `value` fully (including all side effects).
2. Assign the result to `x`.
3. Produce the assigned value as the result of the expression.

The assigned value (step 3) is identical to the value assigned (step 2). There is no copy; the value flows through.

#### 50.3.2 Chained Assignment

In `a = b = c = value`:

1. `value` is evaluated.
2. `c` is assigned the result. The expression `c = value` produces that result.
3. `b` is assigned the result. The expression `b = c = value` produces that result.
4. `a` is assigned the result.

All three variables hold the same value after the chain completes. Chaining is valid only when all lvalues have the same declared type, or when the type is inferred from context. Type mismatch across a chain is E-ASSIGN-002.

#### 50.3.3 Side Effects and Evaluation

The assigned value is produced exactly once. The right-hand side expression is evaluated once. The result is stored to the lvalue and is simultaneously the expression's result. Implementations SHALL NOT evaluate the right-hand side more than once in a single assignment expression.

#### 50.3.4 Reactive Variables (`@x = value`)

Assignment to a reactive variable as an expression is valid:

```scrml
@x = computeValue()
```

When `@x = computeValue()` is used as an expression:

1. `computeValue()` is evaluated.
2. `@x` is assigned the result, triggering the reactive update as a side effect.
3. The expression produces the newly assigned value.

The reactive update is a side effect of the assignment. The expression result is the value, not a reactive reference. Downstream reactive subscriptions re-evaluate after the assignment resolves; the expression value itself is the plain (non-reactive) result.

#### 50.3.5 Scope Rules

Assignment-as-expression does not introduce new scope. It assigns to the lvalue's existing binding. The lvalue SHALL be declared (via `let`, `const`, `lin`, `@`, or function parameter) before it is used as an assignment-expression target. Using an undeclared identifier on the left-hand side of an assignment expression is E-ASSIGN-003.

`const` variables are immutable; assigning to a `const` as an expression is E-ASSIGN-004 (same error as a statement-level `const` reassignment).

`lin` variables have single-use semantics. Assigning to a `lin` variable as an expression counts as a re-assignment of the binding, which violates linear type rules. This is E-LIN-004 (using the `lin` error code series from §35). Assignment to a `lin` variable using the assignment-as-expression form does NOT count as the single required consumption — the consumption is always a read.

### 50.4 Type Rules

#### 50.4.1 Type of an Assignment Expression

The type of `x = value` is the type of `value`, which must be assignable to the declared type of `x`. If `value`'s type is not assignable to `x`'s declared type, the compiler emits a type error at the assignment site.

The type of `a = b = value` is the type of `value` (the innermost right-hand side), which must be assignable to both `b` and `a`.

#### 50.4.2 Use in Typed Positions

Assignment expressions are typed values and MAY appear wherever a value of their type is expected:

- As a function argument: `process(x = getNext())` — passes the assigned value to `process`.
- As an element of an array literal: `[a = 1, b = 2]` — initializes `a` and `b` and collects the values.
- As the condition of a ternary: `(flag = computeFlag()) ? onTrue : onFalse`.
- As the right-hand side of another assignment (chaining, §50.3.2).
- As the operand of any comparison: `(m = re.exec(str)) !== null`.

#### 50.4.3 Declaration Forms Are Not Typed Expressions

`let x = value`, `const x = value`, and `lin x = value` are statements. They do not produce a value and SHALL NOT appear in expression positions. The compiler emits E-ASSIGN-001 if a declaration keyword appears in an expression context.

### 50.5 Interaction with `fn` (§48)

#### 50.5.1 Assignment to fn-Local Variables

Assignment to variables declared inside a `fn` body is valid as an expression. The fn body's constraints (§48.3) are not relaxed; the expression form of assignment is purely a parsing/evaluation concern, not a permissions concern.

```scrml
fn scanMatches(str, re) {
    let results = []
    let m = not
    while ((m = re.exec(str)) !== null) {
        results.push(m[0])
    }
    let out = < ScanResult>
    out.matches = results
    return out
}
```

This is valid. `m` is declared inside the `fn` body. Assigning to it as an expression does not violate any `fn` constraint.

#### 50.5.2 Assignment to Outer-Scope Variables from Inside `fn`

Assignment-as-expression to a variable declared outside the `fn` boundary is E-FN-003, identical to statement-form assignment. The expression form does not circumvent the outer-scope mutation prohibition.

```scrml
${
    let log = []

    // Invalid — E-FN-003
    fn buildItem(name) {
        let i = < Item>
        i.name = name
        // assignment-as-expression to outer-scope `log` — still E-FN-003
        log = [...log, name]
        return i
    }
}
```

### 50.6 Interaction with `lin` (§35)

Assignment to a `lin` variable as an expression is not the consumption event. A `lin` variable's single consumption is always a read (§35.3). Re-assigning a `lin` variable is illegal regardless of form (statement or expression). Use E-LIN-004 for this case.

```scrml
lin token = acquireToken()
token = refreshToken()   // E-LIN-004: re-assignment of lin variable
```

### 50.7 Codegen

Assignment-as-expression is a direct passthrough to JavaScript. JavaScript has native assignment-as-expression semantics identical to the scrml specification.

| scrml form | JavaScript output |
|---|---|
| `x = value` (in expression position) | `x = value` |
| `a = b = value` | `a = b = value` |
| `@x = value` (in expression position) | `__set_x(value)` (reactive setter call, returns assigned value) |
| `while ((m = re.exec(str)) !== null)` | `while ((m = re.exec(str)) !== null)` |

The double-parentheses form in conditions compiles identically to single-parentheses in JavaScript output. The outer parens are the while/if condition's required syntax; the inner parens are the assignment expression. The compiled output is `while ((x = expr))` which is standard JavaScript.

Reactive variable assignment-as-expression compiles to the reactive setter. The setter SHALL return the value that was set, so that downstream expression evaluation receives the assigned value.

### 50.8 Warning and Error Codes

#### 50.8.1 W-ASSIGN-001 — Assignment in Condition Without Double Parentheses

**Trigger:** `=` appears as the root (outermost) expression of a `while`, `if`, or `else-if` condition without being wrapped in an additional pair of parentheses.

**Severity:** Warning.

**Message:**
```
W-ASSIGN-001: Assignment (`=`) used as the condition of `while` at line N.
  Did you mean `==` for equality comparison?
  If assignment is intentional, use double parentheses to signal intent:

    while ((x = expr)) { ... }

  Single parentheses in a condition with `=` as the root expression are ambiguous.
```

W-ASSIGN-001 does not prevent compilation. The program compiles and runs with the assignment semantics. The warning is advisory.

#### 50.8.2 E-ASSIGN-001 — Declaration Form Used as Expression

**Trigger:** `let`, `const`, or `lin` appears in an expression position (e.g., as a function argument, in a condition, in the right-hand side of another assignment).

**Severity:** Error.

**Message:**
```
E-ASSIGN-001: `let` declaration at line N appears in an expression position.
  Declaration forms (`let`, `const`, `lin`) are statements and do not produce values.
  To assign a variable and use its value as an expression, declare it first:

    let x = initialValue
    someCall(x = newValue)   // bare assignment is an expression; declaration is not
```

#### 50.8.3 E-ASSIGN-002 — Type Mismatch in Chained Assignment

**Trigger:** In `a = b = value`, the type of `value` is not assignable to both `a` and `b`, or `a` and `b` have declared types that are incompatible with each other.

**Severity:** Error.

**Message:**
```
E-ASSIGN-002: Chained assignment at line N: `value` (type `string`) is not assignable to `a` (type `number`).
  All lvalues in a chained assignment must accept the same value type.
```

#### 50.8.4 E-ASSIGN-003 — Undeclared Identifier as Assignment Target

**Trigger:** An identifier that has not been declared appears on the left-hand side of an assignment expression.

**Severity:** Error.

**Message:**
```
E-ASSIGN-003: `x` at line N is used as an assignment target but has not been declared.
  Declare `x` before using it as an assignment target: `let x = initialValue`
```

Note: This is a runtime safety guard. Undeclared identifiers in expression-position assignment would otherwise create implicit globals in JavaScript output. scrml prohibits this.

#### 50.8.5 E-ASSIGN-004 — Assignment to `const` Variable

**Trigger:** A `const` binding appears on the left-hand side of an assignment expression.

**Severity:** Error.

**Message:**
```
E-ASSIGN-004: `x` at line N is declared `const` and cannot be reassigned.
  Use `let` if the variable needs to be updated after initialization.
```

This error applies equally to statement-form (`x = newValue` where `x` is `const`) and expression-form assignment.

### 50.9 Normative Statements

- A bare assignment expression `x = value` SHALL produce the assigned value as its result when appearing in any expression position. (§50.3.1)
- The right-hand side of an assignment expression SHALL be evaluated exactly once. (§50.3.3)
- Declaration forms (`let`, `const`, `lin`) SHALL NOT appear in expression positions. The compiler SHALL emit E-ASSIGN-001. (§50.4.3)
- In chained assignment `a = b = value`, evaluation SHALL be right-to-left and each lvalue SHALL receive the same value. (§50.3.2)
- All lvalues in a chained assignment SHALL have types that accept the value type. The compiler SHALL emit E-ASSIGN-002 when this condition is violated. (§50.4.2)
- An assignment expression to an `@variable` SHALL trigger the reactive update as a side effect. The expression result SHALL be the assigned value, not a reactive reference. (§50.3.4)
- When `=` appears as the root expression of a `while`, `if`, or `else-if` condition without double parentheses, the compiler SHALL emit W-ASSIGN-001. (§50.2.3)
- When `=` appears at a non-root position in a condition expression tree, W-ASSIGN-001 SHALL NOT be emitted. (§50.2.3)
- The double-parentheses form `while ((x = expr))` is unambiguously intentional assignment. The compiler SHALL NOT emit W-ASSIGN-001 for this form. (§50.2.3)
- An assignment expression to a `const` variable SHALL be a compile error (E-ASSIGN-004). (§50.8.5)
- An assignment expression to an undeclared identifier SHALL be a compile error (E-ASSIGN-003). (§50.8.4)
- Assignment-as-expression to an outer-scope variable from inside a `fn` body SHALL be E-FN-003, identical to statement-form assignment. The expression form does not affect the outer-scope mutation prohibition. (§50.5.2)
- Assignment to a `lin` variable using the expression form is not a valid consumption. It is a re-assignment and SHALL be E-LIN-004. (§50.6)
- Assignment-as-expression SHALL compile to direct JavaScript assignment passthrough. (§50.7)
- Reactive variable assignment-as-expression SHALL compile to the reactive setter call. The setter SHALL return the assigned value so that the expression result is the value. (§50.7)

### 50.10 Worked Examples

#### 50.10.1 Valid — Regex Iteration (Primary Use Case)

```scrml
${
    function extractAll(str, pattern) {
        const re = new RegExp(pattern, "g")
        let results = []
        let m = not
        while ((m = re.exec(str)) !== null) {
            results.push(m[0])
        }
        return results
    }
}
```

Expected: Compiles without error or warning. `m = re.exec(str)` is not the root expression of the while condition — `!== null` is — so W-ASSIGN-001 is not triggered. `m` is declared with `let` before the loop. The double-parens form around the assignment `(m = re.exec(str))` is the expression form; the outer condition parens are the while's required syntax.

Compiled JavaScript output (abbreviated):
```javascript
while ((m = re.exec(str)) !== null) {
    results.push(m[0]);
}
```

#### 50.10.2 Valid — Chained Assignment

```scrml
${
    let a = 0
    let b = 0
    a = b = 0
}
```

Expected: Compiles without error. `b = 0` is evaluated first, assigning `0` to `b` and producing `0`. Then `a = 0` assigns `0` to `a`. Both variables hold `0`.

```scrml
// In a single expression context:
${
    let x = 0
    let y = 0
    let z = 0
    x = y = z = computeValue()
}
```

Expected: Compiles without error. All three variables receive the result of `computeValue()`.

#### 50.10.3 Valid — Assignment in Ternary

```scrml
${
    let flag = false
    let result = (flag = computeFlag()) ? "yes" : "no"
}
```

Expected: Compiles without error. `flag = computeFlag()` is an assignment expression. Its result (the value assigned to `flag`) is used as the ternary condition. `result` receives `"yes"` or `"no"`. `flag` is also updated as a side effect.

Note: This is a dense expression. Its clarity in real code depends on context. W-ASSIGN-001 is NOT triggered here because `flag = computeFlag()` is not in a while/if condition — it is the condition of a ternary (`?:`), which is not subject to W-ASSIGN-001.

#### 50.10.4 Warning — Assignment in `if` Without Double Parens

```scrml
${
    let x = 0
    if (x = 5) {
        // ...
    }
}
```

Expected compiler output:
```
W-ASSIGN-001: Assignment (`=`) used as the condition of `if` at line 3.
  Did you mean `==` for equality comparison?
  If assignment is intentional, use double parentheses to signal intent:

    if ((x = 5)) { ... }

  Single parentheses in a condition with `=` as the root expression are ambiguous.
```

The program compiles with the assignment semantics (assigns `5` to `x`, then evaluates the truthiness of `5`). The warning does not block compilation.

#### 50.10.5 Valid — Assignment Inside `fn`, Local Variable

```scrml
fn parseTokens(input) {
    const tokenRe = /\w+/g
    let tokens = []
    let m = not
    while ((m = tokenRe.exec(input)) !== null) {
        let t   = < Token>
        t.value = m[0]
        t.start = m.index
        lift t
    }
    return ~
}
```

Expected: Compiles without error. `m` is local to the `fn` body. Assignment to it as an expression does not violate E-FN-003. `tokenRe.exec(input)` is not a non-deterministic built-in (§48.3.4 list does not include regex `exec`). The loop lifts fully-initialized `Token` instances into `~`.

#### 50.10.6 Invalid — Declaration Used as Expression (E-ASSIGN-001)

```scrml
${
    function process(val) { return val + 1 }
    const result = process(let x = 10)   // Error: let in expression position
}
```

Expected compiler output:
```
E-ASSIGN-001: `let` declaration at line 3 appears in an expression position.
  Declaration forms (`let`, `const`, `lin`) are statements and do not produce values.
  Declare `x` before calling `process`, then use a bare assignment expression:

    let x = 0
    const result = process(x = 10)
```

### 50.11 Error and Warning Code Reference

| Code | Trigger | Severity |
|---|---|---|
| W-ASSIGN-001 | `=` is the root expression of a while/if/else-if condition without double parentheses | Warning |
| E-ASSIGN-001 | `let`, `const`, or `lin` declaration form appears in an expression position | Error |
| E-ASSIGN-002 | Type mismatch in chained assignment — value type not assignable to all lvalues | Error |
| E-ASSIGN-003 | Undeclared identifier used as assignment expression target | Error |
| E-ASSIGN-004 | `const` variable used as assignment expression target | Error |

### 50.12 Interaction Notes

- **§45 (Equality Semantics)** — `==` is the structural equality operator. `=` is assignment. W-ASSIGN-001 exists specifically because `=` and `==` are visually similar and `=` in a condition is usually a defect. The warning bridges the two sections.
- **§48 (The `fn` Keyword — Pure Functions)** — E-FN-003 (outer-scope mutation) applies to assignment-as-expression identically to statement-form assignment. The expression form does not weaken `fn`'s constraints. §50.5 specifies the interaction in full.
- **§35 (Linear Types — `lin`)** — `lin` variables cannot be reassigned in any form. Assignment-as-expression to a `lin` variable is E-LIN-004. Separate from `lin`'s consumption rules: expression-form assignment is a re-assignment, not a consumption read. §50.6 specifies the interaction in full.
- **§49 (`while`, `break`, `continue`)** — The primary real-world motivation for this feature is the `while ((m = re.exec(str)) !== null)` pattern. §49 specifies `while` statement semantics; §50 extends the condition position to permit assignment expressions. The two sections compose: a valid `while` condition is either a non-assignment expression or a double-parenthesized assignment expression.
- **§6 (Reactivity — The `@` Sigil)** — Assignment-as-expression to `@variables` triggers reactive update as a side effect. The reactive update is synchronous within the assignment; the expression produces the plain value. The reactive scheduler then propagates the change to dependent computations per §6.7.
- **§7 (Logic Contexts)** — Assignment-as-expression is valid inside any `${}` logic context, `fn` body (subject to §48 constraints), and `function` body. It is not valid in `?{}` SQL contexts or `_{}` foreign code contexts (which are governed by their own syntactic rules).

### 50.13 Future Considerations (Non-Normative)

**Compound assignment operators as expressions.** `+=`, `-=`, `*=`, `/=`, `%=` are currently statement-only in scrml. A future amendment MAY extend expression semantics to compound assignment. If adopted, they would follow the same double-parentheses convention in condition positions and produce the post-assignment value. This is deferred pending evidence of need.

**Destructuring assignment as expression.** `[a, b] = fn()` and `{x, y} = obj` are currently not specified as expression forms. A future amendment MAY specify destructuring-assignment-as-expression. The result value of such an expression is non-obvious (the right-hand side value, or the destructured binding, or a tuple of bound values) and requires a dedicated spec section before implementation.
## 51. State Transition Rules and `< machine>` State Type

### 51.1 Overview

A scrml enum type defines what values exist. A **transition rule** defines which moves
between those values are legal. Transition rules are a first-class language feature; they
are not implemented as hand-coded validation functions.

The design is two-tiered:

- **Type-level transitions** (`transitions {}` block inside an enum declaration) define the
  default legal graph for all uses of the enum. These rules are structural: `From => To`
  with no reference to runtime state or identity. They are the tightest constraint a caller
  can assume unless overridden.

- **Machine-level transitions** (`< machine Name for EnumType>`) define a named override
  graph for a specific context. Machines are bound to reactive variables at declaration time.
  They may include `given` guards that reference runtime state. Multiple machines may govern
  the same enum type.

The enforcement model is:

- Transitions that are statically provable as invalid (compile-time-determinable
  `From`/`To` pair with no declared rule) SHALL be compile errors.
- Transitions that cannot be statically proven (dynamic `From` values, runtime guard
  evaluation) SHALL be runtime errors.

**Core invariant:** The compiler SHALL treat any assignment to a machine-bound reactive
variable as a transition request. An assignment to `@x: MachineName` that does not
correspond to a declared `From => To` rule in `MachineName` — and is statically provable
as illegal — SHALL be rejected at compile time with E-MACHINE-001.

---

### 51.2 Type-Level Transitions — `transitions {}` Block

#### 51.2.1 Syntax

```
enum-decl      ::= 'type' TypeName ':enum' '=' enum-body

enum-body      ::= '{' variant-list transitions-block? '}'

transitions-block ::= 'transitions' '{' transition-rule* '}'

transition-rule   ::= variant-ref '=>' variant-ref effect-block?

variant-ref    ::= '.' VariantName
                 | '::' VariantName

effect-block   ::= '{' logic-stmt* '}'
```

The `transitions {}` block is optional. An enum without a `transitions {}` block is an
**unrestricted enum**: any variant may be assigned at any time. This matches the existing
behavior of all current scrml enum types.

When a `transitions {}` block is present:

- The compiler enforces that every assignment to a variable of this enum type corresponds
  to a declared `From => To` rule.
- Variants not listed as a source in any rule are **terminal** — they have no legal
  outgoing transitions in the default graph.
- An assignment from a terminal variant SHALL be a compile error when the source is
  statically known (E-MACHINE-001), or a runtime error when it is not.

**Normative statements:**

- The `transitions {}` block inside an enum declaration SHALL contain only structural
  `VariantRef => VariantRef` rules. A `given` guard inside a type-level `transitions {}`
  block SHALL be a compile error (E-MACHINE-010: guards are not permitted in type-level
  `transitions` blocks; use `< machine>` for contextual transitions).
- Effect blocks inside a type-level `transitions {}` block SHALL be valid. An effect block
  on a transition SHALL execute every time the transition fires, regardless of which
  machine (if any) is governing the assignment.
- Type-level effect blocks SHALL NOT reference `@reactive` variables declared outside the
  enum's file scope. Cross-file reactive references in type-level effect blocks SHALL be a
  compile error (E-MACHINE-011).

#### 51.2.2 Semantics

A type-level `transitions {}` block defines the **default permission graph** for the enum.
Think of it as the base invariant: unless a machine overrides this, these are all the moves
that are legal.

When an enum has a `transitions {}` block:

1. Every assignment site for variables of this enum type is checked.
2. If the compiler can prove the prior value (`From`) and target value (`To`) at compile
   time, it validates the move against the declared rules.
3. If the prior value is not statically known, the compiler emits a runtime guard in the
   generated output. The runtime guard checks the move before applying it and throws
   E-MACHINE-001-RT if the move is illegal.
4. Effect blocks on matching transitions execute after the assignment is applied.

The effect block receives an implicit `event` object with the following shape:

```scrml
type TransitionEvent = struct {
    from: EnumType,
    to:   EnumType
}
```

Inside a type-level effect block, `event.from` and `event.to` are bound to the
pre-transition and post-transition values.

#### 51.2.3 Worked Example — Order Status with Type-Level Transitions

**Valid — forward-only order flow:**

```scrml
type OrderStatus:enum = {
    Pending
    Processing
    Shipped
    Delivered
    Cancelled

    transitions {
        .Pending    => .Processing
        .Pending    => .Cancelled
        .Processing => .Shipped
        .Processing => .Cancelled
        .Shipped    => .Delivered
    }
}

@status = OrderStatus.Pending

${ function advance() {
    @status = OrderStatus.Processing   // legal: .Pending => .Processing
} }

${ function complete() {
    @status = OrderStatus.Delivered    // compile error if @status is known to not be .Shipped
} }
```

**Invalid — terminal state violation (static):**

```scrml
type OrderStatus:enum = {
    Delivered
    transitions {
        // Delivered has no outgoing rules — it is terminal
    }
}

@status = OrderStatus.Delivered

${ function reopen() {
    @status = OrderStatus.Pending   // E-MACHINE-001: illegal transition .Delivered => .Pending;
                                     // no rule permits this move
} }
```

Expected compiler output:
```
E-MACHINE-001: Illegal transition.
  Variable: @status (type: OrderStatus)
  Move: .Delivered => .Pending
  OrderStatus has no transition rule from .Delivered.
  .Delivered is a terminal variant.
  Hint: add `.Delivered => .Pending` to OrderStatus.transitions if this move is intended,
        or bind @status to a < machine> that permits this move.
```

---

### 51.3 Machine-Level Transitions — `< machine>`

#### 51.3.1 Motivation

Type-level transitions define the tightest, most general contract for an enum. But real
applications need contextual variation: an admin can reopen a delivered order; a system
process can force-cancel at any stage; a test harness may bypass all guards.

The `< machine>` declaration provides this. A machine is a **named override graph** for a
specific enum type. It is separate from the enum. Multiple machines may exist for the same
enum. Each machine is bound to a specific variable at declaration time.

This preserves the core invariant that enums are pure data. The enum carries no behavior.
The machine carries all behavioral rules for a specific usage context.

#### 51.3.2 Syntax

```
machine-decl   ::= '< machine' MachineName 'for' TypeName '>'
                   machine-body
                   '/'

machine-body   ::= '{' machine-rule* '}'

machine-rule   ::= variant-ref-list '=>' variant-ref-list guard-clause? effect-block?
                 | wildcard-rule

variant-ref-list ::= variant-ref ('|' variant-ref)*

wildcard-rule  ::= '*' '=>' '*' guard-clause effect-block?

guard-clause   ::= 'given' '(' expr ')' clause-label?

clause-label   ::= '[' identifier ']'

variant-ref    ::= ('.' | '::') VariantName binding-group?
binding-group  ::= '(' binding-list ')'
binding-list   ::= binding (',' binding)*
binding        ::= Identifier
                 | FieldName ':' Identifier

effect-block   ::= '{' logic-stmt* '}'
```

Note: `binding-list` is the same form §18.7 uses for `match` variant destructuring.
Positional bindings match variant payload fields by declaration order; named bindings
(`FieldName: local`) match by field name. Both forms MAY mix within a single
`binding-list`. A `_` identifier in any binding position discards that field.

A machine declaration uses the `< machine` opener (space after `<` marks it as a state
type, per §4). The machine name is a plain identifier (PascalCase by convention). The
`for TypeName` clause names the type this machine governs.

**Amended:** 2026-04-08 — Radical doubt debate (Approach C). `for EnumTypeName` broadened
to `for TypeName`. Machines may now govern struct types (for cross-field invariants) in
addition to enum types (for transitions). `guard-clause` updated to require parentheses
and support optional `[label]` for named error reporting. Wildcard rule `* => *` added for
struct-governing machines.

**Amended:** 2026-04-17 — `|` alternation added to `variant-ref-list`. Either side of the
`=>` arrow may list multiple variants separated by `|`. A rule with alternation on either
side desugars to the cross-product of single-pair rules before type checking. Any
`guard-clause` and `effect-block` attached to the rule applies to every expanded pair.

**Amendment queued:** 2026-04-17 — ratified by radical-doubt debate (see
`scrml-support/design-insights.md`, "Machine cohesion: opener + guard keyword"). The
machine opener will migrate from the current sentence form `< machine Name for Type>`
to the attribute form `< machine name=Name for=Type>`, matching §5.1 attribute grammar
shared by all other state types (`< db>`, `< timer>`, `< poll>`, `< request>`,
`< timeout>`, `< errorBoundary>`). `name=` and `for=` SHALL be bareword-identifier
attribute values (§5.1 unquoted-identifier form); quoted-string values SHALL be a
compile error. Rule-body grammar, `given` guards (§4.11.4), and `[label]` suffix
remain unchanged. Execution of the migration is deferred to coincide with the next
§51 feature amendment (e.g., §51.9 audit clause, temporal transitions) so the parser
and fixtures change in a single coordinated commit. Until migration executes, the
current sentence form remains authoritative for parser input and fixture content.

```scrml
< machine MarioMachine for MarioState>
    .Small        => .Big | .Fire | .Cape
    .Big          => .Fire | .Cape | .Small
    .Fire | .Cape => .Small
</>
```

Expands to 8 single-pair rules (`Small=>Big`, `Small=>Fire`, ..., `Cape=>Small`). Duplicate
`(from, to)` pairs — whether produced by alternation within one line or by repetition
across lines — SHALL be a compile error: **E-MACHINE-014** — `Machine '{name}' has a
duplicate transition rule '{rule}'. A rule cannot repeat the same from→to pair. Remove the
duplicate.`

**Amended (landed S22):** §51.3.2 payload binding in machine rules. The
`variant-ref` grammar accepts an optional `binding-group` mirroring §18.7's match variant
destructuring. Bindings on the `From` side of `=>` expose the previous variant's payload
fields as local names inside `given` guards and `effect-block`s. Bindings on the `To` side
expose the incoming variant's payload fields.

```scrml
type CannonState:enum = {
    Idle
    Charging(level: number)
    Firing(shot: Shot)
    Reloading(reason: string)
}

< machine CannonMachine for CannonState>
    .Idle               => .Charging(level: l) given (l >= 0)
    .Charging(n)        => .Firing(shot: s)    given (n >= 50)
    .Charging(n)        => .Idle               given (n < 10)
    .Firing(s)          => .Reloading(reason: r) { log("fired " + s.id + " → reloading: " + r) }
    .Reloading          => .Idle
</>
```

In the third rule, `n` binds to the pre-transition `Charging.level` value; the guard reads
it directly. In the fourth rule, `s` binds to the pre-transition `Firing.shot`, and `r`
binds to the post-transition `Reloading.reason`. The effect block may reference both.

**Relationship to `event.from` / `event.to`:** Bindings are syntactic sugar over
`event.from.data` and `event.to.data` field access, but they enable static type resolution
(guard and effect see typed locals) and catch typos at compile time — an invalid field
name in a binding is **E-MACHINE-015**: `Machine '{name}' rule for '.{Variant}' binds
field '{name}' which is not a field of the variant. Declared fields: {list}.`

**Relationship to `|` alternation.** When `binding-group`s appear on an alternated
`variant-ref-list`, every alternative SHALL declare an identically-named binding set, or
no bindings at all — mixed shapes in a single list are a compile error:
**E-MACHINE-016** — `Machine '{name}' rule uses '|' alternation with mismatched variant
payload bindings. Either every alternative binds the same names, or none bind. Got:
{list}.`

**Prerequisite (landed S22):** enum payload variant construction emits a compiler-
generated constructor function per payload variant inside the frozen enum object.
`Shape.Circle(10)` calls `Shape.Circle` and returns `{ variant: "Circle", data: { r: 10 } }`
(the field-name keys are the declared payload field names). Unit variants stay as
string literals (`Shape.Square === "Square"`). The object shape matches §19.3.2 `fail`
(minus the `__scrml_error` sentinel) so one runtime dispatches both error and regular
variants by inspecting `.variant`. Payload-binding in machine rules (§51.3.2) layers
on top of this construction contract.

**Implementation notes (S22):** Payload bindings in machine rules are resolved at
compile time against the governed enum's declared payload fields. Positional bindings
map to declared field order; named bindings (`field: local`) name the field directly;
`_` discards drop a positional slot. The resolved bindings are emitted as
`var <local> = __prev.data.<field>;` (from-side) or `var <local> = __next.data.<field>;`
(to-side) **inside the keyed `if (__key === "From:To") { ... }` block**, so each
rule's locals are only visible within that rule's guard and effect body — never
leaking across sibling rules. Bindings against unit variants emit E-MACHINE-015
at compile time; mismatched bindings across `|` alternatives emit E-MACHINE-016.

When governing a **struct type**, a machine's rules use `* => *` wildcard syntax with
`given` guards that reference fields via `self.*`:

```scrml
< machine DateRange for Booking {
    * => * given (self.start < self.end) [valid_date_range]
    * => * given (self.nights > 0 && self.nights < 365) [valid_nights]
}
</>
```

Struct-governing machines fire their guards after every mutation to any field of a bound
instance. The `self` keyword inside a guard refers to the post-mutation state of the
struct. If any guard evaluates to false, the mutation is rejected with E-MACHINE-001-RT
and the clause label (if present) is included in the error message.

A machine declaration is a top-level declaration. It SHALL NOT be nested inside a function,
loop, or conditional. It MAY be declared inside a `${}` logic block at file scope.

**Normative statements:**

- `< machine Name for TypeName>` SHALL declare a named machine governing variables of type
  `TypeName`. `TypeName` may be an enum type or a struct type.
- The machine name SHALL be unique within the file scope. Duplicate machine names in the
  same file SHALL be a compile error (E-MACHINE-003).
- `TypeName` SHALL resolve to an enum type or struct type declared in the same file or
  imported via `use`. Referencing an unknown type or a primitive type SHALL be a compile
  error (E-MACHINE-004). Primitive value constraints use inline predicates (§53), not machines.
- When governing a struct type, `self.*` references in `given` guards SHALL resolve to
  fields of the struct. Referencing an undefined field SHALL be E-MACHINE-013.
- A `given` clause MAY include a `[label]` suffix. The label is a plain identifier used in
  error messages. When a labeled guard fails at runtime, E-MACHINE-001-RT SHALL include
  the label text.
- A machine body SHALL NOT be empty. A machine with no transition rules serves no purpose
  and SHALL be a compile error (E-MACHINE-005: empty machine body).
- `given` guards are permitted in machine rules. A `given` clause SHALL be a boolean
  expression. The guard is evaluated at the moment of the transition attempt. If the guard
  evaluates to false, the transition is rejected with E-MACHINE-001-RT at runtime.
- `given` guards in machine rules SHALL be permitted to reference reactive `@variables`,
  server-derived values, and other runtime state. This is the distinguishing capability of
  machines over type-level transitions.
- A `variant-ref` MAY include a `binding-group` (pending implementation). Bindings SHALL
  expose the variant's payload fields as typed local names. `From`-side bindings expose
  pre-transition payload; `To`-side bindings expose post-transition payload. Guards and
  effect blocks SHALL see the bindings in scope. An invalid field name SHALL be
  E-MACHINE-015. Mismatched bindings across an alternated list SHALL be E-MACHINE-016.
- A `binding-group` on a unit variant (no payload) SHALL be a compile error: reuse
  E-MACHINE-015 with the message form `Variant '.{Variant}' is a unit variant and has
  no fields to bind`.

#### 51.3.3 Machine Binding — `@var: MachineName`

A reactive variable is bound to a machine at its declaration site using the type annotation
syntax:

```scrml
@status: UserFlow = OrderStatus.Pending
```

This syntax is an extension of the existing type annotation form `@var: Type = val` (§6.1,
type annotation). When the annotated name resolves to a machine (not a primitive type,
struct, or enum), the variable is **machine-bound**.

A machine-bound variable obeys the following rules:

1. All assignments to the variable are validated against the machine's transition rules.
2. If the machine has no rule permitting `From => To`, the assignment is rejected.
3. `given` guards on matching rules are evaluated at runtime; a false guard rejects the
   transition.
4. Effect blocks on matching rules execute after the assignment is applied.

**Normative statements:**

- `@var: MachineName = initValue` SHALL bind `@var` to `MachineName`. All subsequent
  assignments to `@var` SHALL be validated against `MachineName`'s transition rules.
- The initial value `initValue` is exempt from transition validation. It is the seed state
  and does not represent a transition from a prior value.
- If `@var` is assigned to a value that is not of the machine's governed `EnumType`, the
  compiler SHALL emit E-TYPE-001 (type mismatch) before any machine validation occurs.
- A machine-bound variable SHALL NOT be rebound to a different machine after declaration.
  Reassigning the machine binding (e.g., by shadowing with a new declaration) SHALL be a
  compile error (E-MACHINE-006).
- An unbound variable (no `: MachineName` annotation) whose type is an enum with a
  `transitions {}` block is governed by the type-level transitions. Machine binding is not
  required for type-level transition enforcement.

#### 51.3.4 Machine Override Semantics

When a variable is bound to a machine, the machine's rules **replace** the type-level
transitions for that variable. They do not extend or merge with the type-level rules.

Rationale: type-level transitions define the default constraint. A machine is an explicit
contextual override. If a developer creates an `AdminFlow` machine and binds `@status` to
it, they are saying: "for this variable, AdminFlow's rules — not OrderStatus's default
rules — apply." Merging would silently dilute the machine's override intent.

**Normative statements:**

- When a variable is bound to a machine via `@var: MachineName`, the type-level
  `transitions {}` block of the variable's enum type SHALL NOT be enforced for that
  variable. The machine's rules are the sole authority.
- Type-level effect blocks are NOT bypassed by machine binding. If the enum type declares
  an effect on `.Processing => .Done`, that effect SHALL fire regardless of whether the
  transition was governed by the type-level rules or a machine override.

#### 51.3.5 Worked Examples

**Example 1 — Admin override machine (kanban board):**

```scrml
type Column:enum = {
    Todo
    InProgress
    Done
}

// Default machine: forward-only, no reopening
< machine UserFlow for Column {
    .Todo       => .InProgress
    .InProgress => .Done
}
</>

// Admin machine: full flexibility
< machine AdminFlow for Column {
    .Todo       => .InProgress
    .InProgress => .Done
    .InProgress => .Todo
    .Done       => .Todo   given @currentUser.isAdmin
    .Done       => .InProgress given @currentUser.isAdmin
}
</>

@currentUser = { name: "alice", isAdmin: false }
@auditLog    = []

// Regular user — governed by UserFlow
@cardColumn: UserFlow = Column.Todo

// Admin — governed by AdminFlow
@adminColumn: AdminFlow = Column.Todo
```

Transition attempt by regular user:
```scrml
${ @cardColumn = Column.InProgress }  // legal — .Todo => .InProgress in UserFlow
${ @cardColumn = Column.Todo }        // E-MACHINE-001: no rule .InProgress => .Todo in UserFlow
```

Transition attempt by admin:
```scrml
${ @adminColumn = Column.Done }       // legal — .InProgress => .Done in AdminFlow
${ @adminColumn = Column.Todo }       // runtime check: .Done => .Todo given @currentUser.isAdmin
                                       // If isAdmin is false: E-MACHINE-001-RT at runtime
```

**Example 2 — Order fulfillment with type-level transitions and effects:**

```scrml
type OrderStatus:enum = {
    Pending
    Processing
    Shipped
    Delivered
    Cancelled

    transitions {
        .Pending    => .Processing
        .Pending    => .Cancelled
        .Processing => .Shipped
        .Processing => .Cancelled
        .Shipped    => .Delivered {
            // Effect: fires on every .Shipped => .Delivered transition, in any machine
            @deliveryLog = [...@deliveryLog, {
                orderId: event.from,
                deliveredAt: Date.now()
            }]
        }
    }
}

@deliveryLog = []
@order       = OrderStatus.Pending

${ function shipOrder() {
    @order = OrderStatus.Processing   // .Pending => .Processing — legal
    @order = OrderStatus.Shipped      // .Processing => .Shipped — legal
} }

${ function markDelivered() {
    @order = OrderStatus.Delivered    // .Shipped => .Delivered — legal; effect fires
} }
```

Expected behavior: `@deliveryLog` is updated automatically when `markDelivered()` is called.
No `when @order changes` block is needed. The effect lives with the transition rule.

**Example 3 — Auth state machine (invalid: unreachable transition detected at compile time):**

```scrml
type AuthState:enum = {
    Anonymous
    Authenticating
    Authenticated
    Locked

    transitions {
        .Anonymous      => .Authenticating
        .Authenticating => .Authenticated
        .Authenticating => .Anonymous    // login failed — back to start
        .Authenticated  => .Anonymous    // logout
        .Authenticated  => .Locked       // too many suspicious actions
        // Locked has no outgoing rules — it is terminal
    }
}

@authState = AuthState.Locked

${ function unlockAccount() {
    @authState = AuthState.Anonymous   // E-MACHINE-001: .Locked is terminal in AuthState
} }
```

Expected compiler output:
```
E-MACHINE-001: Illegal transition.
  Variable: @authState (type: AuthState, governed by: type-level transitions)
  Move: .Locked => .Anonymous
  AuthState has no transition rule from .Locked.
  .Locked is a terminal variant — no outgoing transitions are declared.
  Hint: to permit unlocking, add `.Locked => .Anonymous` to AuthState.transitions,
        or create a < machine AdminUnlock for AuthState> with this rule.
```

---

### 51.4 Multiple Machines per Enum

A single enum type MAY be governed by an unlimited number of machines. Each machine is a
standalone declaration. Different variables may be bound to different machines.

```scrml
type TaskStatus:enum = {
    Backlog
    Active
    InReview
    Done
    Rejected
}

< machine DeveloperFlow for TaskStatus {
    .Backlog  => .Active
    .Active   => .InReview
    .InReview => .Active    // reviewer requests changes
    .InReview => .Done
    .InReview => .Rejected
}
</>

< machine QAFlow for TaskStatus {
    .InReview => .Done
    .InReview => .Rejected
    .Done     => .InReview  given @currentUser.role === "qa"  // QA can reopen Done
}
</>

< machine PMFlow for TaskStatus {
    .Backlog  => .Active
    .Active   => .Backlog    // PM deprioritizes
    .Done     => .Active     // PM reopens
    .Rejected => .Backlog    // PM reconsiders
}
</>

@devTask: DeveloperFlow = TaskStatus.Backlog
@qaTask:  QAFlow        = TaskStatus.InReview
@pmTask:  PMFlow        = TaskStatus.Backlog
```

**Normative statement:**

- Multiple `< machine>` declarations for the same `EnumType` SHALL be permitted. Each is
  an independent named graph. Having two machines for the same enum type is NOT a conflict
  and SHALL NOT produce a compile error or warning.

---

### 51.5 Compile-Time vs Runtime Enforcement

The compiler applies a two-phase enforcement strategy.

#### 51.5.1 Compile-Time Enforcement

The compiler SHALL perform static transition analysis when:

1. The source variant (`From`) is statically known at the assignment site (e.g., the
   variable was just assigned a literal variant, or the only path into the assignment
   branches all lead to the same variant).
2. The target variant (`To`) is a literal variant expression (not a variable).

In these cases, if no transition rule covers `From => To`, the compiler SHALL emit
E-MACHINE-001 as a compile error and halt compilation.

The compiler SHALL perform data-flow analysis to determine the statically known variant set
at each assignment site. This analysis is conservative: if the compiler cannot determine
the prior value, it defaults to runtime enforcement.

#### 51.5.2 Runtime Enforcement

When the source variant is not statically known (e.g., assigned from a server response,
determined by a match branch with multiple outgoing edges, or passed as a function
parameter), the compiler SHALL emit a runtime transition guard in the generated output.

The generated runtime guard:

1. Reads the current value of the reactive variable before applying the assignment.
2. Looks up the `(currentValue, targetValue)` pair in the machine's compiled transition
   table (a constant object generated at compile time).
3. If no rule matches, throws a runtime transition error (E-MACHINE-001-RT).
4. If a `given` guard is attached to the matching rule, evaluates the guard expression. If
   it returns false, throws E-MACHINE-001-RT with the guard expression source text included
   in the message.
5. If validation passes, applies the assignment and runs any attached effect blocks.

**Normative statements:**

- The compiler SHALL generate a transition lookup table for every enum type that has a
  `transitions {}` block and for every `< machine>` declaration.
- The lookup table SHALL be a constant object `{ "From.Variant:To.Variant": true }` or
  equivalent O(1) structure.
- The compiler SHALL NOT emit a runtime guard for a transition that has been statically
  proven legal. Redundant runtime checks are a performance defect.
- The compiler SHALL emit a runtime guard for every transition that cannot be statically
  proven legal or illegal. Omitting a runtime guard for a non-static transition is a
  correctness defect.

---

### 51.6 The `event` Object in Effect Blocks

Effect blocks in both `transitions {}` (type-level) and `< machine>` rules receive an
implicit `event` binding:

```scrml
type TransitionEvent = struct {
    from: EnumType,
    to:   EnumType
}
```

- `event.from` — the value of the variable before the transition.
- `event.to` — the value of the variable after the transition (the target value).

`event` is read-only inside an effect block. Assigning to `event.from` or `event.to` SHALL
be a compile error (E-MACHINE-007: `event` is read-only in transition effect blocks).

The `event` object is valid only inside an effect block. Referencing `event` outside an
effect block SHALL be a compile error (E-MACHINE-008: `event` is not in scope here).

---

### 51.7 Interaction with Existing Features

#### 51.7.1 Interaction with `when @var changes {}`

`when @var changes {}` remains the post-assignment reactive effect mechanism (§6.7.4). It
fires after the assignment is applied, regardless of whether the assignment was a transition
request.

Transition effect blocks and `when @var changes` blocks are complementary:

- Transition effect blocks are attached to specific `From => To` pairs. They fire only
  when that exact transition occurs.
- `when @var changes` fires on every change to the variable, regardless of transition path.

Neither replaces the other. A developer MAY use both. The execution order is:

1. Transition validation (compile-time or runtime).
2. Assignment applied.
3. Transition effect blocks fire (in declaration order if multiple rules match, which
   cannot happen in a deterministic machine but could in a degenerate one).
4. `when @var changes` fires.

**Normative statement:**

- Transition effect blocks SHALL execute before `when @var changes {}` handlers for the
  same variable.

#### 51.7.2 Interaction with `match`

Pattern matching on a machine-bound variable operates on the current value. Match arms
are not transition requests. A `match @status { .Pending => ... }` arm reads the value; it
does not change it. No transition validation occurs during a `match` expression.

#### 51.7.3 Interaction with `lin` Variables

A `lin` variable bound to a machine: the linear consumption rule applies first (§35). The
variable must be consumed exactly once. The machine's transition rules apply to any write
that would constitute re-use of the variable. Because `lin` prohibits re-use, a `lin`
machine-bound variable can only ever undergo zero transitions (the initial seed value is
consumed, not transitioned). This is a degenerate case.

**Normative statement:**

- Binding a `lin` variable to a machine (`lin @x: MachineName = val`) SHALL be a compile
  error (E-MACHINE-009: linear variables cannot be machine-bound; a `lin` variable is
  consumed exactly once and undergoes no transitions).

#### 51.7.4 Interaction with Struct Fields

A struct field may be typed as an enum that has a `transitions {}` block. In this case,
every assignment to `structInstance.fieldName` is subject to transition validation.

```scrml
type Card = struct {
    id:     number,
    column: Column
}
```

When `aCard.column` is assigned, the compiler validates the transition against `Column`'s
`transitions {}` block (or against the machine governing `aCard.column` if one was declared
for that field access path).

Machine binding on struct fields is deferred to a future spec revision. The current version
supports machine binding only on `@reactive` variables declared with `@var: MachineName`.
Struct field machine binding SHALL produce E-MACHINE-012 (not yet supported: machine
binding on struct fields; bind the enclosing `@var` to a machine instead).

---

### 51.8 Error Codes

| Code | Condition | Phase |
|------|-----------|-------|
| E-MACHINE-001 | Illegal transition: no rule permits `From => To` in the governing machine or type-level transitions block | Compile (static) |
| E-MACHINE-001-RT | Illegal transition at runtime: no rule permits `From => To`, or `given` guard evaluated to false | Runtime |
| E-MACHINE-003 | Duplicate machine name in the same file scope | Compile |
| E-MACHINE-004 | Machine `for` clause references an unknown type or a primitive type (enum and struct types are valid `for` targets) | Compile |
| E-MACHINE-005 | Machine body is empty (no transition rules declared) | Compile |
| E-MACHINE-006 | Machine rebinding: attempt to shadow a machine-bound variable with a different machine | Compile |
| E-MACHINE-007 | Assignment to `event.from` or `event.to` inside an effect block (`event` is read-only) | Compile |
| E-MACHINE-008 | Reference to `event` outside an effect block (`event` is not in scope) | Compile |
| E-MACHINE-009 | Machine binding on a `lin` variable (incompatible with linear type semantics) | Compile |
| E-MACHINE-010 | `given` guard inside a type-level `transitions {}` block (guards require `< machine>`) | Compile |
| E-MACHINE-011 | Type-level effect block references a reactive variable outside the enum's file scope | Compile |
| E-MACHINE-012 | Machine binding on a struct field (not yet supported; bind the enclosing `@var` instead) | Compile |
| E-MACHINE-013 | `self.fieldName` in a struct-governing machine guard references an undefined field | Compile |
| E-MACHINE-014 | Duplicate `(from, to)` transition pair in a machine body (including pairs produced by `\|` alternation) | Compile |
| E-MACHINE-015 | Machine rule binds a variant field that doesn't exist (or binds a field on a unit variant) | Compile |
| E-MACHINE-016 | Machine rule uses `\|` alternation with mismatched variant payload bindings | Compile |
| E-MACHINE-017 | Assignment to a derived-machine projected variable (§51.9 — projections are read-only) | Compile |
| E-MACHINE-018 | Derived machine's projection rules are not exhaustive over the source enum's variants | Compile |
| E-MACHINE-019 | Machine `audit @varName` clause references an undeclared reactive, or the clause appears more than once per machine (§51.11) | Compile |

**Error message format — E-MACHINE-001:**

```
E-MACHINE-001: Illegal transition.
  Variable: @<name> (type: <EnumType>, governed by: <MachineName or "type-level transitions">)
  Move: .<From> => .<To>
  <EnumType or MachineName> has no transition rule from .<From> to .<To>.
  [if terminal:] .<From> is a terminal variant — no outgoing transitions are declared.
  Hint: <actionable suggestion>
```

All error messages SHALL be plain English. No jargon that requires compiler internals
knowledge to decode.

---

### 51.9 Derived / Projection Machines

**Added (landed S22):** 2026-04-17. Resolves
the debate outcome in
`scrml-support/docs/deep-dives/machine-cluster-expressiveness-2026-04-17.md` Candidate (I).
Eliminates the "shadow-boolean drift" pattern observed across gauntlet rounds R11/R13/R14,
where developers hand-maintained `@isLoading`/`@isSuccess`/`@isError` alongside the source
enum and had to re-derive them on every transition.

**Implementation notes (S22 slice 2):** The projected variable's read path is wired
via the existing `_scrml_derived_fns` / `_scrml_derived_downstreams` infrastructure
(see §6.6's derived scalars). `generateClientJs` emits, per derived machine:

```js
function _scrml_project_UI(src) {
  var tag = (src != null && typeof src === "object") ? src.variant : src;
  if (tag === "Draft") return "Editable";
  if (tag === "Submitted") return "ReadOnly";
  // ... top-to-bottom, first match wins; guards emit `&& (guardExpr)`
  return undefined;
}
_scrml_derived_fns["ui"] = function() { return _scrml_project_UI(_scrml_reactive_get("order")); };
_scrml_derived_dirty["ui"] = true;
(_scrml_derived_downstreams["order"] = _scrml_derived_downstreams["order"] || new Set()).add("ui");
```

`_scrml_reactive_get("ui")` already delegates to `_scrml_derived_get` for names
registered in `_scrml_derived_fns`. Writes to `@order` propagate a dirty flag to
`@ui` through `_scrml_propagate_dirty`, so DOM bindings re-read the projection on
the next microtask.

#### 51.9.1 Motivation

A common pattern in real scrml code is deriving a simplified state from a richer one:

```scrml
// Source machine: the real thing
type OrderState:enum = { Draft, Submitted, Paid, Shipping, Delivered, Cancelled, Refunded }

// Projection: just "what should the UI look like?"
type UIMode:enum = { Editable, ReadOnly, Terminal }
```

Today, the projection has to be hand-maintained: either as a `~derived` scalar computed in
a `match`, or as a `server @var` that's re-assigned after every `@order` write. Both forms
drift. Hand-maintenance is the bug: the projection's transition graph is **implicit in the
source machine's transition graph**, and the compiler should derive it.

#### 51.9.2 Syntax

```
derived-machine-decl ::= '< machine' MachineName 'for' TypeName 'derived' 'from' '@' SourceVar '>'
                         projection-body
                         '/'

projection-body      ::= projection-rule*
projection-rule      ::= variant-ref-list '=>' variant-ref                -- map source variants → projection variant
                       | variant-ref-list 'given' '(' expr ')' '=>' variant-ref   -- conditional projection
```

**Example:**

```scrml
< machine UI for UIMode derived from @order>
    .Draft                                  => .Editable
    .Submitted | .Paid | .Shipping          => .ReadOnly
    .Delivered | .Cancelled | .Refunded     => .Terminal
</>

@order: OrderMachine = OrderState.Draft
// No @ui declaration required — the compiler synthesizes it from the derived machine.
// Reading @ui: resolves via the projection. Writing @ui: compile error (E-MACHINE-017).
```

The arrow direction matches §51.3: `.From => .To` reads as "when source is `From`,
projection becomes `To`." Unlike a regular machine, the `To` side is always a single
variant-ref (no alternation): a projection maps many source variants to one destination,
never the reverse.

#### 51.9.3 Semantics

- The declared `SourceVar` SHALL be a machine-bound reactive variable (`@order:
  OrderMachine`) declared in the same file or imported.
- The projected variable (`@ui` in the example) is **synthesized by the compiler** — the
  developer does NOT declare it explicitly. It appears as a normal reactive variable to
  readers: `${@ui}` in markup, `match @ui { ... }` in logic.
- Writes to the projected variable SHALL be a compile error: **E-MACHINE-017** — `Cannot
  assign to '@{name}' — it is a derived projection of '@{source}' (see < machine
  {MachineName}>). Assign to the source instead.`
- The projection SHALL be total: every variant of the source type MUST be covered by the
  projection rules (directly or via alternation). Non-exhaustive projections SHALL be
  **E-MACHINE-018** — `Derived machine '{name}' does not project variant '.{Variant}' of
  '{SourceType}'. Every source variant must be mapped, or use 'else => .Variant' for a
  catch-all.`
- The projection MAY use `given` guards that reference runtime state beyond the source
  variant (e.g. `@currentUser.role`). Guarded rules are evaluated top-to-bottom at read
  time; the first matching rule wins. Unguarded rules always match and SHALL appear last
  in their alternation group.
- When the source variable transitions, the compiler emits a reactive dependency so that
  every element bound to `@ui` re-reads the projection. The projection is a **pure
  derivation**, not a persisted store — there is no separate reactive cell for `@ui`.

#### 51.9.4 Why Not `~derived` (§6.6)?

Derived scalars (`~var = match @source { ... }`) already solve the simple case. The
difference:

| | `~derived` match | `< machine derived>` |
|---|---|---|
| Enforces exhaustiveness? | Yes (§18) | Yes (E-MACHINE-018) |
| Integrates with machine runtime guards? | No | Yes (shares machine event wiring) |
| Appears in type system as a machine? | No | Yes — `@ui: UI` is machine-governed |
| Supports `given` on runtime state? | Via `if` inside match body | First-class `given` clause |
| Supports `@ui: UI = ...` external bindings? | N/A | Yes, for introspection / tooling |
| Reserves the binding name against writes? | No | Yes (E-MACHINE-017) |

A `~derived` variable can be reassigned by a later `~` reassignment; a derived machine
guarantees the projection is the only source of truth. For trivial string-to-string
projections prefer `~derived`; for enum-to-enum projections with compile-time
exhaustiveness and write-blocking, prefer a derived machine.

#### 51.9.5 Worked Example — Shadow Booleans Eliminated

Before (observed in `samples/gauntlet-r11/rust-state-machine.scrml`):

```scrml
${
  @state: FetchState = FetchState.Idle
  @isIdle = true
  @isLoading = false
  @isSuccess = false
  @isError = false

  function setState(next) {
    @state = next
    @isIdle    = next == FetchState.Idle
    @isLoading = next == FetchState.Loading
    @isSuccess = next == FetchState.Success
    @isError   = next == FetchState.Error
  }
}
```

After (with derived machine):

```scrml
${
  @state: FetchMachine = FetchState.Idle
}

< machine FetchMachine for FetchState>
    .Idle    => .Loading
    .Loading => .Success | .Error
    .Success | .Error => .Idle
</>

type UIFlag:enum = { Idle, Busy, Done, Failed }

< machine UI for UIFlag derived from @state>
    .Idle              => .Idle
    .Loading           => .Busy
    .Success           => .Done
    .Error             => .Failed
</>
```

The four shadow booleans collapse to one projection. Never-drift by construction.

#### 51.9.6 Normative Statements

- A derived-machine declaration SHALL use the form `< machine Name for TypeName derived
  from @SourceVar>`. The `derived from @SourceVar` clause SHALL name a machine-bound
  reactive variable in the current file's scope.
- The projected variable — named by the **machine name** with its leading uppercase
  run lowercased (`UI` → `@ui`, `OrderStatus` → `@orderStatus`, `HTTPStatus` →
  `@httpStatus`) — SHALL be synthesized by the compiler. The developer SHALL NOT
  write an explicit `@var: Name = ...` declaration for a projected variable.
- Writes to a projected variable SHALL be a compile error: E-MACHINE-017.
- The projection rules SHALL be exhaustive over the source enum's variants: E-MACHINE-018.
- A `projection-rule` RHS SHALL be a single `variant-ref` (no alternation, no binding
  group in this revision).
- Projection rules MAY include `given` guards evaluated at read time. The first matching
  rule (top-to-bottom) wins; an unguarded rule terminates its alternation group.
- The projected variable SHALL be observable by `match`, `${...}` interpolation,
  `when @var changes`, and all other reactive-read sites as if it were a normal reactive
  variable. The only distinction is write-rejection.

#### 51.9.7 Future Work

- **Transitive projection.** A derived machine could derive from another derived machine.
  The initial revision requires `SourceVar` to be a non-projected machine-bound var;
  transitive projections deferred.
- **Projection binding.** Payload-binding (§51.3.2 A amendment) on projection LHS could
  let a projection extract information from source variant payloads (e.g. `.Charging(n)
  given (n > 50) => .Charged`). Deferred until A lands; then a small grammar extension
  admits it.
- **Cross-machine projection.** Projecting from two independent sources simultaneously is
  the classical "parallel region" problem; out of scope for this revision.

---

### 51.11 Audit Clause — `audit @varName`

**Added:** 2026-04-18 — implementation of §2b G (machine-cluster-expressiveness
deep-dive). Opt-in audit/replay/time-travel support for `< machine>`-governed
reactive variables. Prior art: Redux DevTools, Elm Debugger, XState Inspector.

#### 51.11.1 Motivation

Every transition through a machine-bound variable passes the transition-table
lookup (§51.3) and any declared guards (§51.3.2) before state commits. The
compiler therefore knows, at the moment of every successful transition, the
full tuple `(from, to, at)`. Capturing that tuple into a user-supplied reactive
array at zero additional cost gives applications replay-from-bug-report,
time-travel debugging, and server-side audit logs (§52) "for free" — features
that otherwise require bespoke transition logging, a state-management library,
or both.

The feature is opt-in because the memory cost is linear in transition count
and most production machines don't want the overhead.

#### 51.11.2 Syntax

```
audit-clause   ::= 'audit' '@' identifier

machine-body   ::= '{' machine-rule* audit-clause? '}'
```

The audit clause is optional and SHALL appear at most once per machine body.
It MAY appear at any position in the body (convention: last, after all
transition rules).

**Worked example:**

```scrml
${
    @auditLog = []
    @order: OrderFlow = OrderStatus.Pending
    function advance() { @order = OrderStatus.Processing }
}

< machine OrderFlow for OrderStatus>
    .Pending    => .Processing
    .Processing => .Shipped
    .Shipped    => .Delivered
    audit @auditLog
</>

// After `advance()` runs, @auditLog contains:
//   [{ from: "Pending", to: "Processing", at: 1713456789012 }]
```

#### 51.11.3 Semantics

- The referenced `@varName` SHALL be a declared reactive variable (§6.1).
  Referencing an undeclared name SHALL be a compile error **E-MACHINE-019**:
  `Machine '{name}' audit clause references '@{target}', but no reactive
  variable with that name is declared in scope.`
- The audit target SHALL NOT be a derived (projected) variable (§51.9) — those
  are read-only (E-MACHINE-017). Pointing an audit clause at one is a compile
  error under the same rule.
- Multiple audit clauses in a single machine body SHALL be a compile error
  (same **E-MACHINE-019** — message form: `Machine '{name}' has more than one
  'audit' clause.`).
- After a successful transition (guard passed, state committed, effect block
  executed), the compiler SHALL append a fresh entry to the audit target
  using an immutable update pattern (`concat` on a new array). Mutation via
  `push` is NOT used — the audit var is reactive, so subscribers must see a
  fresh array identity each transition.
- **Rejected transitions are NOT audited.** A guard that fails fires
  E-MACHINE-001-RT before any state commit or audit push. Applications that
  want rejected-transition logging may wire a separate `!{}` error boundary.
- The audit target's type is the user's declaration. For best ergonomics
  declare it as an array (`@auditLog = []` or `@auditLog: Array<...> = []`).
  The entry shape below is the compiler's contract.

#### 51.11.4 Entry Shape

Each audit entry is a frozen object with three fields:

```
{
  from: <previous value>,
  to:   <new value>,
  at:   <timestamp, Number — Date.now() at transition site>
}
```

Both `from` and `to` are the raw reactive values: variant identifiers for
enum-governed machines, struct objects for struct-governing machines. For
derived machines (§51.9), the audit entry records the transition on the
SOURCE variable — the projection is computed on read, not on transition.

Future revisions MAY extend the entry shape (e.g. adding a `label` field for
labeled guards or `cause` for event-sourced transitions). Extensions SHALL be
additive only; existing fields SHALL NOT be renamed or retyped.

#### 51.11.5 Interaction with Other Features

- **Effect blocks (§51.3.2):** audit push happens AFTER the effect body
  runs, so an effect that further mutates state is visible in the audit
  entry's `to` field only if the mutation targets the machine-bound var
  (which would itself fire a nested transition and audit).
- **Derived machines (§51.9):** audit attaches to the source machine. A
  derived projection cannot itself be audited directly — audit its source.
- **Server-authoritative machines (§52):** the audit target may be a
  `server @var` declared with `db=`. In that case audit entries persist
  to the server; the client sees only the projection. This is the
  intended shape of "server-side audit log" support. Full spec for the
  server-side audit machinery is deferred to a §52 amendment.
- **Reactive subscribers:** since the audit target is a reactive array,
  any markup, derived reactive, or logic block that reads `@varName`
  observes transitions in real time. `<p>${@auditLog.length}</>` updates
  on every transition for free.

#### 51.11.6 Normative Statements

- `< machine>` bodies MAY contain an `audit @varName` clause.
- `@varName` SHALL be a declared non-derived reactive variable (E-MACHINE-019
  for violations).
- The clause SHALL appear at most once per machine (E-MACHINE-019 for
  duplicates).
- On every successful transition (table lookup + guards both pass + state
  commits + effects run), the compiler SHALL append a new entry
  `{from, to, at}` to the audit target using an immutable-update pattern.
- Rejected transitions SHALL NOT produce audit entries.
- The audit entry shape SHALL be `{from, to, at}` with the semantics above.
  Future additions to the shape SHALL be additive and SHALL NOT break
  consumers of existing fields.

---

### 51.10 Open Questions (Tracked as Spec Issues)

The following questions are not resolved by this section. They SHALL become tracked spec
issues before §51 is considered fully ratified.

1. **Machine binding on struct fields** — The current text defers this (E-MACHINE-012).
   The spec needs a resolution: either define the syntax (`@cards[i].column: UserFlow`) or
   officially defer with a milestone target. See §51.7.4.

2. **Effect block variable capture** — Type-level effect blocks currently prohibit
   cross-file `@variable` references (E-MACHINE-011). Machine-level effect blocks should
   explicitly permit capture of any in-scope reactive variable. The rule should be made
   explicit in a future revision.

3. **Transition table code generation** — The spec requires a compile-time lookup table
   with O(1) lookup. The exact representation (object literal, Map, switch statement) is an
   implementation decision, but the O(1) guarantee SHALL be confirmed normatively in the
   next revision.

4. **`via MachineName` inline override** — Inline struct field transition syntax
   (`{ ...c, column: nextCol via activeMachine }`) is not included in this revision.
   If machine binding on struct fields is added (resolving open question 1), `via` syntax
   may be needed. Track as a follow-on spec issue.

5. **Machine composition** — Formal composition (A's rules plus B's rules) is not
   specified. If needed, raise a dedicated spec issue.

---

## 52. State Authority Declarations

**Added:** 2026-04-08. Resolves debate-state-authority-2026-04-08.md (A-B Hybrid recommendation). Introduces two-tier model for declaring reactive variable authority (server vs. client-local), compiler-generated sync infrastructure, and authority boundary enforcement.

### 52.1 Motivation

A scrml reactive variable (`@var`) carries no implicit claim about where its data lives. Developers working in previous gauntlet rounds consistently annotated authority in comments because the language provided no way to express it: "source of truth is server," "these are CLIENT-SIDE reactive vars, not server state," "server owns the write, client owns the state."

Authority declarations give the compiler enough information to:

- Enforce that client-local variables are never persisted to the database (E-AUTH-001).
- Enforce that server-authoritative variables are not derived from client-local values without an explicit crossing point (E-AUTH-002).
- Generate server-sync infrastructure automatically (initial load, optimistic update, rollback, re-fetch).
- Distinguish variables that SHALL be pre-rendered in SSR from variables that are client-only and SHALL be skipped during SSR.
- Derive DDL and schema from structured state type definitions (interacting with §39 Schema and Migrations).

### 52.2 Two-Tier Model

State authority in scrml uses a **two-tier model**. The tier is chosen based on whether the state is structured (mapped to a database table) or primitive (a flag, counter, or simple scalar).

**Tier 1 — Type-level authority** applies to state types declared with `< TypeName>`. The `authority=` attribute on the type definition carries the authority contract. Every instance of that type inherits its authority.

**Tier 2 — Instance-level authority** applies to primitive reactive variables (`@var`). The `server` modifier on the variable declaration marks that variable as server-authoritative.

**Default — local.** A reactive variable or state type instance with no authority declaration is client-local. No sync infrastructure is generated for it. It is never pre-rendered in SSR output.

**Form state — no declaration required.** Data that lives inside `<input>`, `<select>`, `<textarea>`, and `<form>` elements until submission is treated as ephemeral form state. The compiler SHALL NOT require an authority declaration for in-flight form input. This is the correct model for data the user is actively composing; it should not enter the reactive state model until it is submitted to a server function.

### 52.3 Tier 1 — Type-Level Authority

#### 52.3.1 Syntax

```ebnf
state-type-decl ::= "<" ws TypeName (ws authority-attr)? (ws table-attr)? (ws protect-attr)? ">"
                    field-list
                    "/"

authority-attr   ::= 'authority="' authority-value '"'
authority-value  ::= "server" | "local"
table-attr       ::= 'table="' identifier '"'
protect-attr     ::= 'protect="' identifier ("," ws identifier)* '"'
```

`authority="local"` is the default. The attribute MAY be omitted when the intent is local.

`table=` is required when `authority="server"` is present. See §52.3.3.

#### 52.3.2 Semantics

A state type declaration bearing `authority="server"` declares that all instances of that type are server-authoritative. The database table identified by `table=` is the source of truth. The compiler generates all sync infrastructure for every instance of this type.

A state type declaration bearing `authority="local"` or no `authority=` attribute declares that instances of this type are client-local. No sync infrastructure is generated.

Authority is a property of the type. The same type cannot be instantiated with differing authority in the same program. If a type is needed in two authority contexts, two distinct types SHALL be declared.

#### 52.3.3 Required `table=` When `authority="server"`

A state type with `authority="server"` SHALL also specify `table=` naming the database table it maps to.

The compiler uses `table=` for:

- Schema derivation: the declared fields are checked against (or used to generate) the table DDL.
- Query generation: the initial load query, optimistic INSERT/UPDATE, and rollback logic all reference this table.
- SSR: instances of this type are pre-rendered from the table on the server.

A state type with `authority="server"` and no `table=` attribute SHALL be a compile error (E-AUTH-003).

#### 52.3.4 Normative Statements — Type-Level Authority

- A state type with `authority="server"` SHALL have a `table=` attribute. The compiler SHALL reject any state type declaration that has `authority="server"` and no `table=` (E-AUTH-003).
- Every instance of a `authority="server"` state type SHALL be treated as server-authoritative regardless of the variable name or the scope where it is instantiated.
- A state type with `authority="local"` (or no `authority=` attribute) SHALL produce no sync infrastructure.
- The compiler SHALL verify at compile time that no `?{}` block attempts to INSERT or UPDATE using a field from a client-local type instance as the source value, unless that value has been explicitly passed to a server function (E-AUTH-001).
- `protect=` and `authority=` MAY coexist on the same state type declaration. `protect=` governs field-level access; `authority=` governs sync source-of-truth. They are complementary and SHALL NOT conflict.
- Two state type declarations with the same name but differing `authority=` values SHALL be a compile error (E-AUTH-004).

#### 52.3.5 Worked Example — Valid (Type-Level Authority)

```scrml
<program db="sqlite:./kanban.db">

${
    type Column:enum = { Todo, InProgress, Done }

    // Tier 1: Card is server-authoritative, backed by the `cards` table.
    // Every <Card> instance inherits this contract.
    < Card authority="server" table="cards">
        id: number
        title: string
        description: string
        column: Column
        position: number
    </>

    // Tier 1: EditState is client-local (no authority= — default).
    // Compiler generates no sync for <EditState> instances.
    < EditState>
        editingId: number | null
        draftTitle: string
        draftDescription: string
        addingToColumn: Column
    </>

    // Instances inherit authority from their type.
    <Card> @cards        // server-authoritative because Card.authority = "server"
    <EditState> @ui      // client-local because EditState has no authority attribute

    // Derived values (§6.6) are always local and always consistent with the
    // server-authoritative source they derive from.
    const @todoCards = @cards.filter(c => c.column == Column.Todo)

    server function createCard(title, desc, col) {
        ?{`INSERT INTO cards (title, description, column_name, position)
           VALUES (${title}, ${desc}, ${col}, ${@cards.length})`}.run()
        return ?{`SELECT * FROM cards WHERE id = last_insert_rowid()`}.get()
    }

    server function updateCard(id, title, desc) {
        ?{`UPDATE cards SET title = ${title}, description = ${desc} WHERE id = ${id}`}.run()
    }

    function addCard() {
        @cards = [...@cards, createCard(@ui.draftTitle, @ui.draftDescription, @ui.addingToColumn)]
        @ui.draftTitle = ""
        @ui.draftDescription = ""
    }

    function startEdit(card) {
        @ui.editingId = card.id
        @ui.draftTitle = card.title
        @ui.draftDescription = card.description
    }

    function commitEdit() {
        updateCard(@ui.editingId, @ui.draftTitle, @ui.draftDescription)
        @ui.editingId = null
    }
}

</program>
```

Expected compiler output: no errors. `@cards` is server-authoritative (type contract). Compiler generates initial load from `cards` table on mount, optimistic update on assignment, rollback on server error. `@ui` is client-local; no sync. `@todoCards` is a derived value.

#### 52.3.6 Worked Example — Invalid (Missing `table=` on Server-Authority Type)

```scrml
// Error: authority="server" requires table=
< BadCard authority="server">
    id: number
    title: string
</>

<BadCard> @cards
```

Expected compiler output:
```
E-AUTH-003: State type 'BadCard' declares authority="server" but has no table= attribute.
  The compiler cannot generate sync infrastructure without a database table mapping.
  Add table="<tablename>" to the < BadCard> declaration.
  → < BadCard authority="server" table="your_table_name">
```

#### 52.3.7 Worked Example — Invalid (Type Used in Conflicting Authority Contexts)

This restriction prevents a single type from appearing in two authority contexts in the same program. If the same data shape is needed in two authority contexts, declare two distinct types.

```scrml
< Card authority="server" table="cards">
    id: number
    title: string
</>

// This is the correct pattern for the "composing before submit" case.
// CardDraft is a DIFFERENT TYPE — client-local.
// They happen to share fields, but they have different lifecycles.
< CardDraft>
    title: string
    column: string
</>

<Card> @cards           // server-authoritative
<CardDraft> @draft      // client-local

// The authority boundary is explicit: submitDraft is the crossing point.
server function submitDraft(draft: CardDraft): Card {
    ?{`INSERT INTO cards (title, column_name) VALUES (${draft.title}, ${draft.column})`}.run()
    return ?{`SELECT * FROM cards WHERE id = last_insert_rowid()`}.get()
}

function submit() {
    @cards = [...@cards, submitDraft(@draft)]
    @draft = { title: "", column: "Todo" }
}
```

Expected compiler output: no errors. `@draft` is `CardDraft` (local). `@cards` is `Card[]` (server-authoritative). `submitDraft` is the explicit authority crossing point. The compiler enforces the separation at the type level.

### 52.4 Tier 2 — Instance-Level Authority

#### 52.4.1 Syntax

```ebnf
reactive-decl      ::= (server-modifier ws)? "@" identifier ws "=" ws expr
server-modifier    ::= "server"
```

`server @var = expr` declares that `@var` is server-authoritative. The initial value `expr` is a placeholder; the compiler replaces it with a server-fetch on mount.

`@var = expr` (no modifier) declares a client-local reactive variable. This is unchanged from §6.1.

The `server` modifier in this position extends the `server` keyword already used for function declarations (§11.4). The semantics are consistent: `server` marks a construct as server-side.

#### 52.4.2 Semantics

A `server @var` declaration tells the compiler:

1. **Initial value on mount:** The compiler generates a fetch from the server to populate `@var` on component/page mount. The initial value in the declaration (e.g., `server @cards = []`) is the client-side placeholder displayed until the fetch completes.
2. **Optimistic update:** When `@var` is assigned in client code, the compiler generates: (a) an immediate local update for responsiveness, and (b) a server write call. If the server write fails, the previous value is restored.
3. **Rollback on error:** If the server write returns an error, the compiler restores `@var` to its pre-assignment value and surfaces the error through the standard error state (§19).
4. **Re-fetch on success:** After a successful server write, the compiler MAY re-fetch the authoritative value from the server to ensure the local value matches the persisted state.
5. **SSR pre-render:** Server-authoritative vars are populated on the server during SSR and emitted into the initial HTML. Client-local vars are not pre-rendered; they use their declared initial value.

A `server @var` declaration at the instance level is appropriate for primitive reactive state: loading flags, counters, IDs, simple scalar values. For structured data that maps to a database table, Tier 1 (type-level authority via `< Type authority="server" table="...">`) SHOULD be used instead.

#### 52.4.3 Initial Value Semantics

The expression on the right-hand side of a `server @var = expr` declaration is the **client placeholder**. It is displayed while the server fetch is in flight. It is NOT sent to the server. It is NOT the authoritative initial value.

A `server @var` with an initial value of `not` (§42) means "no placeholder — render nothing until the server responds."

```scrml
server @userProfile = not     // renders nothing until profile loads
server @count = 0             // renders 0 until server responds with authoritative count
```

#### 52.4.4 Normative Statements — Instance-Level Authority

- `server @var` SHALL cause the compiler to generate an initial load fetch on mount.
- `server @var` SHALL cause the compiler to generate optimistic update logic on every assignment to `@var` in client code.
- `server @var` SHALL cause the compiler to generate rollback logic that restores the pre-assignment value if the server write returns an error.
- A `server @var` SHALL be treated as server-authoritative for all E-AUTH rule checks.
- An unmodified `@var` SHALL be treated as client-local. No sync infrastructure SHALL be generated for it.
- The compiler SHALL emit an error (E-AUTH-002) when a `server @var` is declared with an initial value that is derived from a client-local reactive variable, unless the derivation passes through an explicit server function call.
- The compiler SHALL emit an error (E-AUTH-001) when a client-local `@var` appears directly in a `?{}` block as a persisted value (as a bound parameter in INSERT/UPDATE/DELETE), outside of a server function.

#### 52.4.5 Worked Example — Valid (Instance-Level Authority)

```scrml
<program db="sqlite:./kanban.db">

${
    // Tier 2: server-authoritative primitive var.
    // Compiler generates initial load on mount.
    // Assignment triggers optimistic update + server write.
    server @cards = []

    // Client-local vars: no sync, no server interaction.
    @editingId = null
    @draftTitle = ""
    @draftDescription = ""
    @addingToColumn = "Todo"

    // Derived values are local by definition.
    const @todoCards = @cards.filter(c => c.column == "Todo")

    server function loadCards() {
        return ?{`SELECT * FROM cards ORDER BY position ASC`}.all()
    }

    server function createCard(title, desc, col, pos) {
        ?{`INSERT INTO cards (title, description, column_name, position)
           VALUES (${title}, ${desc}, ${col}, ${pos})`}.run()
        return ?{`SELECT * FROM cards WHERE id = last_insert_rowid()`}.get()
    }

    function addCard() {
        let newCard = createCard(@draftTitle, @draftDescription, @addingToColumn, @cards.length)
        @cards = [...@cards, newCard]    // optimistic update + server write (auto-generated)
        @draftTitle = ""
        @draftDescription = ""
    }
}

</program>
```

Expected compiler output: no errors. `@cards` is server-authoritative (instance-level). Compiler generates initial load (calls `loadCards` on mount), optimistic update on `@cards =` assignment, rollback on error. Client-local vars (`@editingId`, `@draftTitle`, etc.) generate no sync.

#### 52.4.6 Worked Example — Invalid (E-AUTH-001: Local var in `?{}`)

```scrml
<program db="sqlite:./kanban.db">

${
    @editingId = null    // client-local

    // ERROR: @editingId is client-local. It cannot appear as a bound
    // parameter in a ?{} block outside of a server function.
    ?{`INSERT INTO audit_log (object_id) VALUES (${@editingId})`}.run()
}

</program>
```

Expected compiler output:
```
E-AUTH-001: '@editingId' is client-local and cannot be used as a bound parameter
  in a ?{} persistence block.
  Only server-authoritative variables and values derived from server function arguments
  may appear as bound parameters in INSERT/UPDATE/DELETE statements.
  To persist a client-local value, pass it to a server function first:
    server function logEdit(id) {
        ?{`INSERT INTO audit_log (object_id) VALUES (${id})`}.run()
    }
  Then call: logEdit(@editingId)
```

#### 52.4.7 Worked Example — Invalid (E-AUTH-002: Server var derived from local var)

```scrml
<program db="sqlite:./kanban.db">

${
    @localCount = 0                      // client-local
    server @doubleCount = @localCount * 2  // ERROR: server var derives from local var
}

</program>
```

Expected compiler output:
```
E-AUTH-002: 'server @doubleCount' is declared server-authoritative, but its initial
  value derives from '@localCount', which is client-local.
  A server-authoritative variable's initial value must not derive directly from a
  client-local variable. Use a server function as the authority boundary:
    server function computeDouble(n) { return n * 2 }
    server @doubleCount = computeDouble(@localCount)
  Or reconsider whether @doubleCount should be server-authoritative.
```

### 52.5 Authority Rules — Summary Table

| Construct | Authority | Sync Generated | SSR Pre-Rendered | `?{}` Access |
|-----------|-----------|---------------|------------------|-------------|
| `@var = expr` | Local | None | No | Blocked (E-AUTH-001) |
| `server @var = expr` | Server | Load + optimistic update + rollback | Yes | Allowed (inside server fn) |
| `<Type> @var` where `Type.authority = "server"` | Server | Load + optimistic update + rollback | Yes | Allowed (inside server fn) |
| `<Type> @var` where `Type.authority = "local"` | Local | None | No | Blocked (E-AUTH-001) |
| `const @derived = expr` | Derived (always local) | None (derived from source) | Only if source is server | Read-only (cannot be persisted) |
| `<input>` / `<form>` fields | Form (ephemeral) | None | No | Not applicable |

### 52.6 Compiler-Generated Sync Infrastructure

When a variable is server-authoritative (either Tier 1 or Tier 2), the compiler generates the following infrastructure. The developer SHALL NOT write any of this manually.

#### 52.6.1 Initial Load

On component/page mount, the compiler generates a fetch call to load the authoritative value from the server. For Tier 1 types with `table=`, the compiler generates a `SELECT *` from the table. For Tier 2 `server @var` declarations, the compiler expects a corresponding `server function` that returns the initial value (see §52.6.5 for the load function convention).

The initial value in the declaration is displayed while the fetch is in flight (the placeholder). Once the fetch resolves, the placeholder is replaced by the authoritative value and dependents re-render.

#### 52.6.2 Optimistic Update

When client code assigns to a server-authoritative variable:

```scrml
@cards = [...@cards, newCard]
```

The compiler generates:
1. Immediate local update: `@cards` is set to the new value client-side for responsiveness.
2. Server write call: a generated server route receives the new value and persists it.
3. The UI reflects the new value immediately (optimistic).

If the server write succeeds, the optimistic value is confirmed. If it fails, rollback (§52.6.3) is triggered.

#### 52.6.3 Rollback on Error

If a server write for an optimistic update returns an error:
1. The compiler restores `@var` to its pre-assignment value.
2. The error is surfaced through the standard reactive error state (§19).
3. Dependents re-render with the rolled-back value.

The developer MAY handle the error state explicitly using `on error` blocks (§19). If no explicit error handler is present, the default behavior is rollback + silent error state update.

#### 52.6.4 Re-fetch on Success

After a successful server write, the compiler MAY generate a re-fetch of the authoritative value. This ensures that server-side transformations (auto-generated IDs, server-computed defaults, timestamps) are reflected in the client-side value.

Whether a re-fetch is generated is a compiler optimization decision, not a developer-facing API. The developer SHALL assume the client-side value is eventually consistent with the server after any write.

#### 52.6.5 Load Function Convention for Tier 2 `server @var`

For a `server @var` declaration to generate an initial load, the compiler needs to know how to fetch the value. Two patterns are supported:

**Pattern A — Inferred from assignment:**

```scrml
server @cards = []

// Somewhere in the logic block:
@cards = loadCards()

server function loadCards() {
    return ?{`SELECT * FROM cards ORDER BY position ASC`}.all()
}
```

The compiler detects that `@cards` is assigned from `loadCards()` — a server function. It uses `loadCards()` as the mount-time initial fetch.

**Pattern B — Explicit `on mount` block (§6.7.1a):**

```scrml
server @cards = []

on mount {
    @cards = ?{`SELECT * FROM cards ORDER BY position ASC`}.all()
}
```

If neither pattern is present on a `server @var`, the compiler SHALL emit a warning (W-AUTH-001) indicating that no initial load was detected. The variable will display its placeholder value until an explicit assignment occurs.

### 52.7 Interaction with `protect=` (§11)

`protect=` and `authority=` address different concerns and SHALL NOT conflict:

- `authority=` declares the **source of truth**: who owns the data and where it lives.
- `protect=` declares **field-level access control**: which fields are visible to client code.

A state type MAY have both:

```scrml
< User authority="server" table="users" protect="passwordHash, sessionToken">
    id: number
    email: string
    displayName: string
    passwordHash: string        // protected: server-only
    sessionToken: string        // protected: server-only
    createdAt: string
</>
```

In this example:
- `authority="server"` means all `<User>` instances are server-authoritative; the compiler generates sync.
- `protect="passwordHash, sessionToken"` means `passwordHash` and `sessionToken` are excluded from the client-visible type (§11.3.1).
- The client sees `{ id, email, displayName, createdAt }`.
- Server functions inside the enclosing scope see the full type including protected fields (§11.3.3).

**Normative statements:**

- The combination of `authority="server"` and `protect=` on a single state type declaration SHALL be valid.
- The compiler SHALL apply `protect=` field exclusion to the client-visible projection of the server-authoritative type. The protected fields SHALL NOT appear in client-side code or optimistic update payloads.
- The protected fields SHALL be accessible to server functions in the enclosing scope per §11.3.3.

### 52.8 Interaction with SSR

The authority model directly controls which state is pre-rendered during SSR.

**Server-authoritative variables** (Tier 1 or Tier 2) SHALL be populated on the server during SSR and included in the initial HTML. The client receives the pre-rendered value; no loading placeholder is shown on first paint.

**Client-local variables** SHALL NOT be pre-rendered. They use their declared initial value until client-side hydration runs.

**Derived values (`const @derived`)** are pre-rendered only if all their source variables are server-authoritative. If any source is client-local, the derived value is client-only.

**Form state** is never pre-rendered; it is ephemeral.

**Normative statements:**

- The compiler SHALL include all server-authoritative reactive variables in the SSR output.
- The compiler SHALL NOT include client-local reactive variables in the SSR output.
- The compiler SHALL pre-render a derived value (`const @derived`) if and only if all of its reactive dependencies are server-authoritative.

### 52.9 Interaction with `<request>` (§6.7.7)

`<request>` (§6.7.7) is a single-shot async fetch primitive. It is not a continuous authority declaration.

`server @var` and `< Type authority="server">` are continuous authority declarations: the compiler generates sync infrastructure that persists for the lifetime of the component.

The two constructs are not interchangeable:

| Feature | `<request>` | `server @var` / Tier 1 authority |
|---------|-------------|----------------------------------|
| Load on mount | Yes | Yes |
| Re-fetch on trigger | Yes (explicit) | Yes (on error, on mutation) |
| Optimistic update | No | Yes (auto-generated) |
| Rollback on error | No | Yes (auto-generated) |
| SSR pre-render | Yes (§6.7.7 supports SSR) | Yes |
| Mutation / write | No | Yes |

A developer who needs read-only server data with manual re-fetch control SHOULD use `<request>`. A developer who needs read-write server state with automatic optimistic update SHOULD use `server @var` (primitive) or a type with `authority="server"` (structured).

### 52.10 Interaction with `server function` (§11.4)

The `server` keyword on a function declaration and the `server` modifier on a reactive variable declaration share the same keyword but have distinct semantics:

- `server function name() { ... }` — forces server-side execution for the named function (§11.4).
- `server @var = expr` — declares the reactive variable as server-authoritative.

The two constructs are syntactically unambiguous. The parser identifies the token following `server`: if it is `function` or `fn`, it is a function declaration; if it is `@`, it is a reactive variable declaration.

**Normative statement:** The parser SHALL distinguish `server function` from `server @var` by the token immediately following `server`. No ambiguity is possible.

### 52.11 Error Codes

| Code | Trigger | Message (normative form) |
|------|---------|--------------------------|
| E-AUTH-001 | A client-local `@var` appears as a bound parameter in a `?{}` INSERT, UPDATE, or DELETE block outside of a server function. | `'@{name}' is client-local and cannot be used as a bound parameter in a ?{} persistence block. Pass it to a server function first.` |
| E-AUTH-002 | A `server @var` declaration has an initial value that is directly derived from a client-local `@var`. | `'server @{name}' derives from '{source}', which is client-local. Use a server function as the authority boundary.` |
| E-AUTH-003 | A state type declares `authority="server"` without a `table=` attribute. | `State type '{TypeName}' declares authority="server" but has no table= attribute. Add table="<tablename>".` |
| E-AUTH-004 | Two declarations of the same state type use conflicting `authority=` values. | `Conflicting authority declarations for type '{TypeName}': cannot be both server-authoritative and local.` |
| E-AUTH-005 | A `server @var` declaration appears inside a client-only component (a component with no server context). | `'server @{name}' declared in a client-only component. Server-authoritative variables require a server context. Add db= to the enclosing <program> or move the declaration.` |

| Code | Trigger | Message (normative form) |
|------|---------|--------------------------|
| W-AUTH-001 | A `server @var` declaration has no detectable initial load pattern (no mount assignment, no `on mount` block). | `'server @{name}' has no detected initial load. The variable will display its placeholder until explicitly assigned. Add an 'on mount' block or assign from a server function.` |

### 52.12 Open Questions

The following questions are not resolved by this spec section. Each is a tracked spec issue.

**SPEC-ISSUE-025** (raised by this section): Does the compiler-generated initial load for `server @var` happen in parallel with other mount-time fetches, or sequentially? Interaction with `lift` ordering and concurrent detection (§10.5.5) is underspecified.

**SPEC-ISSUE-026** (raised by this section): When a Tier 2 `server @var` is assigned a value derived from multiple server function calls (e.g., `@cards = mergeLocalAndRemote(loadCards(), @localEdits)`), does the compiler generate optimistic update for the assignment, or does it require explicit authority handling? The spec does not currently address partial-authority expressions.

**SPEC-ISSUE-027** (raised by this section): For Tier 1 state types, the compiler generates `SELECT *` for initial load. Does the developer have a way to constrain the initial load query (e.g., load only the first page, add a WHERE clause)? The current spec has no syntax for this; it may require an `on mount` override pattern analogous to §52.6.5 Pattern B.

## 53. Inline Type Predicates

**Added:** 2026-04-08. Stateless value constraints via inline type predicates. Approach C (Partial Unification) from radical doubt debate. See `docs/deep-dives/radical-doubt-machine-contract-unification-2026-04-08.md`. Cross-references: §51, §52, §15.3, §12.


---

## §53.1 Motivation

scrml distinguishes two categories of value constraint:

**Contextual constraints** — the validity of a mutation depends on prior state, sibling fields,
or external reactive references. These are governed by `< machine>` (§51). Examples:
- Enum transition rules (depends on current variant)
- Cross-field struct invariants (depends on sibling field values)
- Constraints referencing reactive variables (`<=@maxMana`)

**Stateless constraints** — the validity of a value can be determined from the incoming value
alone. No prior state, no sibling fields, no reactive references need to be consulted. These
are governed by **inline type predicates** (this section). Examples:
- Numeric range checks (`number(>0 && <10000)`)
- String property checks (`string(.length > 7)`)
- Named validation shapes (`string(email)`, `string(url)`)

The semantic distinction is clean and binary. Developers apply the **stateless test** at
declaration time: "Can I validate this incoming value without knowing what the variable held
before, or what any sibling field currently holds?" If yes — inline predicate. If no — machine.

This separation is motivated by two concrete requirements:

1. **Enforcement efficiency.** A stateless predicate can be verified by evaluating a single
   boolean expression over the incoming value. It never needs to consult prior state or related
   fields. This permits aggressive compile-time elision and minimal runtime overhead — an O(1)
   boolean expression, not a machine lookup. Collapsing stateless and contextual constraints
   into one mechanism (machines) would impose machine-check overhead on every scalar assignment.

2. **Syntactic honesty.** The machine metaphor — `From => To given (guard)` — implies that
   the prior state of the variable matters. For a stateless predicate it does not. Forcing
   `number(>0 && <10000)` through `* => * given (value > 0 && value < 10000)` machine syntax
   creates a false implication that the prior value was considered. The inline predicate form
   `number(>0 && <10000)` expresses exactly what is true: "this value must satisfy this
   predicate," with no implication about transitions.

---

## §53.2 Syntax

### §53.2.1 Grammar (EBNF)

```ebnf
inline-predicate    = base-type "(" predicate-expr ")"

base-type           = "number" | "string" | "boolean" | "integer"

predicate-expr      = simple-predicate
                    | "!" predicate-expr
                    | predicate-expr "&&" predicate-expr
                    | predicate-expr "||" predicate-expr
                    | "(" predicate-expr ")"
                    | named-shape

simple-predicate    = comparison-predicate
                    | property-predicate

comparison-predicate = comparison-op numeric-literal
                     | numeric-literal comparison-op "value" comparison-op numeric-literal

comparison-op       = ">" | ">=" | "<" | "<=" | "==" | "!="

property-predicate  = "." identifier comparison-op value-literal
                    | "." identifier comparison-op numeric-literal

named-shape         = identifier               (* e.g. email, url, uuid, phone *)

value-literal       = numeric-literal | string-literal

named-constraint    = inline-predicate "[" identifier "]"
```

Within a `predicate-expr`, the implicit subject is the incoming value. `.length`, `.size`, etc.
refer to properties of that value. No external identifiers MAY appear — if they do, the
compiler SHALL emit `E-CONTRACT-003`.

### §53.2.2 Usage Positions

An inline predicate MAY appear in any position where a type annotation is valid:

```
variable declaration:   let x: number(>0 && <10000) = expr
reactive variable:      @amount: number(>0 && <10000) = expr
function parameter:     fn process(amount: number(>0 && <10000))
struct field:           type Invoice:struct = { amount: number(>0 && <10000) }
return type:            fn computeFee() number(>=0): ...
```

### §53.2.3 Named Constraint Labels

An inline predicate MAY be annotated with a name in square brackets immediately following the
closing parenthesis. The name is used in error messages only — it has no effect on enforcement
semantics.

```scrml
@price: number(>0 && <10000) [valid_price] = userInput
```

If the constraint is violated, the error message SHALL include the label name.

---

## §53.3 Semantics

### §53.3.1 Core Semantics

An inline type predicate is a **type annotation** that narrows the base type to the subset of
values satisfying the predicate. It is evaluated as a pure boolean expression over the incoming
value at every assignment or binding site. The expression has access to:

- The incoming value directly (numeric comparisons: `>0`, `<10000`)
- Named properties of the incoming value via `.property` notation (`.length`, `.size`)
- Logical connectives `&&`, `||`, `!`
- Named shapes from the shape registry (§53.6)

The expression SHALL NOT access:
- The variable's prior value
- Any sibling field of a struct
- Any reactive variable (`@name`)
- Any function parameter or outer binding

If any of these appear in the predicate expression, the compiler SHALL emit `E-CONTRACT-003`
and reject the program.

### §53.3.2 The Stateless Test

The canonical decision rule for when to use an inline predicate vs a `< machine>`:

> A constraint is **stateless** if its validity can be determined from the incoming value alone,
> without consulting the variable's prior value, any sibling field, or any reactive reference.

| Constraint | Test result | Correct mechanism |
|---|---|---|
| `number(>0 && <10000)` | Stateless | Inline predicate |
| `string(.length > 7 && .length < 255)` | Stateless | Inline predicate |
| `string(email)` | Stateless | Inline predicate (named shape) |
| `start < end` on a struct | Contextual (needs sibling) | `< machine for Struct>` |
| `.Pending => .Processing` | Contextual (needs prior state) | `< machine>` |
| `number(>=0 && <=@maxMana)` | Contextual (references reactive var) | `< machine>` |

The boundary case `number(>=0 && <=@maxMana)` SHALL be rejected with `E-CONTRACT-003` if
written as an inline predicate, because `@maxMana` is an external reactive reference. The
developer SHALL express this constraint as a `< machine>` guard instead.

### §53.3.3 Assignment Semantics

When a value is assigned to a variable of a constrained type, the compiler performs an
assignment-site check. Depending on the three-zone model (§53.4), this check either:

a. Produces a compile-time error (static zone)
b. Emits a runtime check at the assignment site (boundary zone)
c. Is elided entirely (trusted zone)

The assignment is applied if and only if the predicate evaluates to `true`. If the predicate
evaluates to `false` at runtime, the compiler-generated check SHALL throw a runtime error with
code `E-CONTRACT-001-RT` before the assignment is applied. The variable retains its prior value.

### §53.3.4 Type Compatibility

A `number(>0 && <10000)` value IS a `number`. The constrained type is a subtype of the base
type. The following rules apply:

- A `number(>0 && <10000)` MAY be assigned to a `number` variable without check.
- A `number` MAY NOT be assigned to a `number(>0 && <10000)` variable without a boundary check.
- A `number(>0 && <5000)` value satisfies `number(>0 && <10000)` — the compiler MAY prove this
  statically and elide the check.
- Arithmetic on a `number(>0 && <10000)` value produces a `number`, not
  `number(>0 && <10000)`. Constraint arithmetic is NOT performed. The developer MUST re-annotate
  derived values if constraint propagation is desired.

```scrml
fn discountAmount(amount: number(>0 && <10000)) {
    let discounted = amount * 0.9     // type: number (constraint not propagated)
    // E-CONTRACT boundary check emitted on next line:
    let safe: number(>0 && <10000) = discounted
}
```

---

## §53.4 Three-Zone Enforcement (SPARK Model)

### §53.4.1 Overview

The compiler applies a three-zone model derived from SPARK/Ada when determining whether to emit
a runtime check for an inline predicate constraint:

| Zone | Condition | Compiler action |
|---|---|---|
| **Static zone** | Compiler can prove the value satisfies the constraint at compile time | No runtime check emitted |
| **Boundary zone** | Compiler cannot prove — the value comes from an unproven source | Runtime check emitted at assignment site |
| **Trusted zone** | Value is already proven within the current function scope | No runtime check emitted |

An exhaustively provable function body SHALL emit zero runtime checks for inline predicate
constraints.

### §53.4.2 Static Zone Conditions

The compiler SHALL treat a value as statically proven if:

1. The value is a numeric literal and the literal satisfies the predicate.
   `let x: number(>0) = 5` — literal 5 > 0 — proven.

2. The value is a string literal and the predicate is a named shape with a pure structural check.
   `let e: string(email) = "user@example.com"` — literal format is provable — proven.

3. The value was already checked as the same constrained type in the current scope and has not
   been mutated since.

4. The value is a function parameter with the same or a tighter constraint annotation.
   `fn f(x: number(>0 && <100))` called with `y: number(>0 && <10000)` — the caller's constraint
   does NOT imply the callee's (100 < 10000 does not hold in general). This case is boundary zone.
   `fn f(x: number(>0 && <10000))` called with `y: number(>0 && <100)` — the callee's constraint
   is wider; the caller's value is provably within range — static zone.

### §53.4.3 Boundary Zone Conditions

The compiler SHALL emit a runtime check when:

1. The value comes from an unconstrained source (external input, unconstrained variable, raw
   function return value).

2. The value comes from arithmetic on constrained values (constraint arithmetic is not performed —
   §53.3.4).

3. The value is a function parameter where the caller's constraint does not imply the callee's
   (see §53.4.2 rule 4).

4. The value is a reactive variable of unconstrained type being assigned to a constrained binding.

### §53.4.4 Trusted Zone Conditions

Once a value has passed a boundary check within a function body, it is trusted for the remainder
of its lexical scope, unless it is:

- Reassigned from a new unconstrained source
- Passed through an arithmetic operation (which strips constraints — §53.3.4)
- Returned from a function call that does not carry the same constraint annotation

```scrml
fn process(rawAmount: number) {
    let amount: number(>0 && <10000) = rawAmount  // BOUNDARY CHECK — runtime check emitted
    // From here, `amount` is in the trusted zone.
    // No further checks on `amount` in this scope.
    doSomething(amount)   // callee has: fn doSomething(a: number(>0 && <10000)) — NO check
    doSomethingElse(amount)  // callee has: fn doSomethingElse(a: number) — no check needed
}
```

### §53.4.5 Runtime Check Semantics

A compiler-generated runtime check SHALL:

1. Evaluate the predicate expression over the incoming value.
2. If the predicate is `true`, proceed with the assignment.
3. If the predicate is `false`, halt execution and emit a runtime error `E-CONTRACT-001-RT`
   with: the constraint expression, the actual value, the failing clause (if decomposable), and
   the variable name and location.

The check SHALL be emitted at the assignment site, not at a later use site.

---

## §53.5 Type Rules

### §53.5.1 Formal Rules

**T-PRED-1 (Static Literal):**
```
literal L satisfies predicate P statically
----------------------------------------------
⊢ L : base-type(P)
```

**T-PRED-2 (Boundary Check):**
```
⊢ e : base-type    P is not statically proven for e
-----------------------------------------------------
⊢ [check(P, e)] e : base-type(P)
```
Where `[check(P, e)]` denotes the emission of a runtime predicate check.

**T-PRED-3 (Subtype):**
```
⊢ e : base-type(P)
-------------------
⊢ e : base-type
```
A constrained type is a subtype of its base type. Assignments upward (to base) are free.

**T-PRED-4 (Widening):**
```
⊢ e : base-type(P1)    P1 implies P2 statically
-------------------------------------------------
⊢ e : base-type(P2)
```
If the compiler can prove that P1 implies P2 (e.g., `>0 && <100` implies `>0 && <10000`),
the assignment is free.

**T-PRED-5 (Constraint Loss on Arithmetic):**
```
⊢ e1 : base-type(P)    ⊢ e2 : base-type
------------------------------------------
⊢ e1 op e2 : base-type
```
Arithmetic on constrained types produces unconstrained base types. Constraint arithmetic
(propagating P through arithmetic operations) is not performed.

---

## §53.6 Named Shape Registry

### §53.6.1 Built-in Shapes

The compiler SHALL maintain a built-in named shape registry. The following shapes SHALL be
defined in the initial release:

| Shape name | Base type | Predicate (informative) | HTML attribute generated |
|---|---|---|---|
| `email` | `string` | RFC 5322 local+domain structure | `type="email"` |
| `url` | `string` | URL.canParse(value) passes | `type="url"` |
| `uuid` | `string` | `[0-9a-f]{8}-[0-9a-f]{4}-...` pattern | `pattern="..."` |
| `phone` | `string` | E.164 or local 7-15 digit format | `type="tel"` |
| `date` | `string` | ISO 8601 `YYYY-MM-DD` | `type="date"` |
| `time` | `string` | ISO 8601 `HH:MM` or `HH:MM:SS` | `type="time"` |
| `color` | `string` | Hex `#RRGGBB` or CSS color name | `type="color"` |

The normative predicate implementations are compiler-defined. The informative predicates above
describe the intent.

### §53.6.2 Registry Extensibility

The named shape registry MAY be extended within a `^{}` meta block. Extension syntax is TBD and
SHALL be tracked as SPEC-ISSUE-[N].

> **SPEC-ISSUE (open):** Named shape registry extension via `^{}` — syntax and semantics for
> registering custom validation shapes. See §53.10.

### §53.6.3 Shape Lookup Failure

If a named shape identifier does not match any entry in the built-in or extended registry, the
compiler SHALL emit `E-CONTRACT-002` at compile time. Named shapes are resolved at compile
time — there is no runtime shape lookup.

---

## §53.7 `bind:value` Interaction

### §53.7.1 HTML Attribute Generation

When a variable of constrained type is bound to a form input via `bind:value`, the compiler
SHALL automatically generate HTML validation attributes derived from the predicate. This
behavior is not opt-in — it fires whenever the variable's declared type carries an inline
predicate.

**Numeric range predicates:**

| Predicate clause | HTML attribute |
|---|---|
| `>N` | `min="N+ε"` (smallest representable value above N) |
| `>=N` | `min="N"` |
| `<N` | `max="N-ε"` |
| `<=N` | `max="N"` |

Where ε is `1` for integer constraints and the smallest step value for floating point.

```scrml
@amount: number(>0 && <10000) = 0

<input type="number" bind:value=@amount>
// Compiled HTML: <input type="number" min="1" max="9999" ...>
```

**String length predicates:**

| Predicate clause | HTML attribute |
|---|---|
| `.length > N` | `minlength="N+1"` |
| `.length >= N` | `minlength="N"` |
| `.length < N` | `maxlength="N-1"` |
| `.length <= N` | `maxlength="N"` |

```scrml
@password: string(.length > 7 && .length < 255) = ""

<input type="password" bind:value=@password>
// Compiled HTML: <input type="password" minlength="8" maxlength="254" ...>
```

**Named shapes:**

A named shape with a corresponding HTML type SHALL emit that type attribute, overriding any
`type` attribute already present on the element. If the element already declares a `type`
attribute, the compiler SHALL emit a warning and use the shape-derived type.

```scrml
@email: string(email) = ""

<input bind:value=@email>
// Compiled HTML: <input type="email" ...>
```

### §53.7.2 Runtime Validation on Input

In addition to static HTML attributes, `bind:value` on a constrained variable SHALL emit a
runtime check at every input event, before the reactive assignment is applied. If the check
fails, the assignment is not applied and the reactive variable retains its prior value.

The runtime check fires at the boundary zone (the input event is an unconstrained source).
The static HTML attributes serve as a first-line browser-native filter, but the compiler-emitted
runtime check is authoritative.

### §53.7.3 Conflict with Explicit `type` Attribute

If the element carries an explicit `type` attribute that conflicts with the shape-derived type,
the compiler SHALL emit `E-CONTRACT-004-WARN` (a warning, not an error). The shape-derived type
SHALL take precedence in the compiled output.

---

## §53.8 Interaction with `< machine>`

### §53.8.1 Orthogonality

Inline predicates and `< machine>` are orthogonal enforcement mechanisms. They govern different
aspects of the same variable:

- Inline predicate: "is this incoming value valid on its own?"
- Machine: "is this transition (or mutation) valid given the current state?"

Both MAY apply to the same variable. The canonical case is a struct field that has an inline
predicate AND the struct is governed by a machine:

```scrml
type Booking:struct = {
    start:  string,
    end:    string,
    nights: number(>0 && <365)     // inline predicate on the field
}

< machine ValidBooking for Booking {
    * => * given (self.start < self.end)   // machine governing the struct
}
</>

@booking: ValidBooking = { start: "2026-06-01", end: "2026-06-08", nights: 7 }
```

### §53.8.2 Execution Order

When both an inline predicate and a machine guard govern the same mutation, the execution order
SHALL be:

1. **Field-level inline predicate evaluated** (stateless, fast — `E-CONTRACT-*`)
2. If the field check passes, **struct machine guard evaluated** (contextual — `E-MACHINE-*`)
3. If both checks pass, **assignment applied**
4. `when @var changes {}` reactive effects fire

This order ensures the cheap, local check runs first. The machine guard is not evaluated if the
field-level check already rejects the value.

### §53.8.3 Disambiguation Rule — The `@reactive` Reference Rejection

If a predicate expression contains any reference to a reactive variable (`@name`), sibling field
reference (`self.field`), or any identifier that resolves outside the incoming-value scope, the
compiler SHALL emit `E-CONTRACT-003` at compile time with a message directing the developer to
use `< machine>` instead.

```scrml
// INVALID — @maxMana is an external reactive reference
@hp: number(>=0 && <=@maxMana) = 100
// E-CONTRACT-003: predicate references external reactive variable '@maxMana'.
// Inline predicates must be stateless.
// For constraints that reference reactive state, use < machine>.
// Example:
//   < machine HpRange for number {
//       * => * given (value >= 0 && value <= @maxMana)
//   }
//   /
//   @hp: HpRange = 100
```

---

## §53.9 Interaction with Function Boundaries

### §53.9.1 Parameter Constraints

A function parameter MAY carry an inline predicate annotation. The annotation is visible in the
function signature and communicates to callers what range of values the function accepts.

```scrml
fn processPayment(amount: number(>0 && <10000)) {
    // amount is in the trusted zone for the entire function body
    // No runtime checks on `amount` unless it passes through arithmetic
}
```

The constraint annotation at the parameter site is a boundary zone declaration. The compiler
SHALL emit a runtime check when the function is called with an unconstrained argument, and SHALL
elide the check when the caller's constraint implies the callee's.

### §53.9.2 Caller/Callee Constraint Matching

| Caller type | Callee parameter type | Check emitted? |
|---|---|---|
| `number(>0 && <100)` | `number(>0 && <10000)` | No — caller's range is within callee's |
| `number(>0 && <10000)` | `number(>0 && <100)` | Yes — caller's range exceeds callee's |
| `number` (unconstrained) | `number(>0 && <10000)` | Yes — boundary check at call site |
| `number(>0 && <10000)` | `number(>0 && <10000)` | No — same constraint |

### §53.9.3 Return Type Constraints

A function MAY declare a constrained return type. The compiler SHALL verify that all return
expressions satisfy the constraint, applying the three-zone model to each return site.

```scrml
fn computeTax(amount: number(>0 && <10000)) number(>0 && <1000) {
    let tax = amount * 0.08
    // `tax` is `number` (unconstrained — arithmetic strips constraint)
    // The return site is a boundary zone: runtime check emitted
    return tax
}
```

### §53.9.4 Interaction with Server Functions

Inline predicate constraints on server function parameters SHALL be enforced at the server
boundary. The compiler SHALL generate server-side validation code that runs before any database
write or business logic, independently of any client-side check. A server function's parameter
constraint cannot be bypassed by raw HTTP requests.

```scrml
server function submitPayment(amount: number(>0 && <10000)) {
    // Compiler emits server-side boundary check at function entry
    // This check runs even if the client has already validated the value
    ?{`INSERT INTO payments (amount) VALUES (${amount})`}.run()
}
```

---

## §53.10 Interaction with `protect=`

Inline predicate constraints are orthogonal to `protect=` field-level access control (§52).

- `protect=` governs **who may read or write** a field (authorization).
- Inline predicates govern **what values** a field may hold (validation).

Both MAY apply simultaneously. When both apply, the authorization check fires at the server
boundary first (before the predicate check), because an unauthorized write should be rejected
before any validation logic runs.

The interaction is fully composable:

```scrml
< db src="app.db" tables="payments" protect="internalNotes">
    server function submitPayment(amount: number(>0 && <10000)) {
        // protect= enforced: caller must have permission to call this server function
        // predicate enforced: amount must satisfy (>0 && <10000)
        // Both are compiler-generated, not developer-written
        ?{`INSERT INTO payments (amount) VALUES (${amount})`}.run()
    }
</>
```

---

## §53.11 Error Codes

### E-CONTRACT-001: Value constraint violated (compile-time)

Emitted when the compiler can prove at compile time that a literal or statically-known value
violates an inline predicate.

```
E-CONTRACT-001: Value constraint violated.
  Type:              number(>0 && <10000)
  Value:             -50
  Failing condition: value > 0
  Variable:          @amount (line N)

  To fix: use a value satisfying (>0 && <10000).
```

Normative statements:
> The compiler SHALL emit E-CONTRACT-001 when a literal value is assigned to a constrained
> type variable and the literal demonstrably fails the predicate.
> The compiler SHALL NOT emit E-CONTRACT-001 for values that require runtime evaluation.

### E-CONTRACT-001-RT: Value constraint violated (runtime)

Emitted at runtime when a compiler-generated boundary check fails.

```
E-CONTRACT-001-RT: Value constraint violated at runtime.
  Type:              number(>0 && <10000)
  Value:             15000
  Failing condition: value < 10000
  Location:          processPayment, parameter 'amount' (line N)

  The value 15000 does not satisfy the constraint (>0 && <10000).
  Required: greater than 0 and less than 10000.
```

Normative statements:
> The compiler SHALL emit a runtime check for every boundary-zone assignment that it cannot
> statically elide.
> The runtime check SHALL halt execution and produce E-CONTRACT-001-RT before the assignment
> is applied.
> The prior value of the variable SHALL be preserved when E-CONTRACT-001-RT fires.

### E-CONTRACT-002: Named shape not found in registry

Emitted when a named shape identifier in a predicate expression does not match any built-in or
registered shape.

```
E-CONTRACT-002: Named shape 'ssn' not found in the shape registry.
  Type:     string(ssn)
  Location: line N

  Built-in shapes: email, url, uuid, phone, date, time, color
  To register a custom shape, use a ^{} meta block.
  (Custom shape registration syntax: SPEC-ISSUE pending.)
```

Normative statements:
> The compiler SHALL emit E-CONTRACT-002 when a named shape identifier is used in an inline
> predicate and is not present in the built-in or extended shape registry.
> Named shape resolution SHALL occur at compile time. There is no runtime shape lookup.
> The compiler SHALL list available built-in shapes in the E-CONTRACT-002 error message.

### E-CONTRACT-002-RT: Named shape registry lookup at runtime

Reserved. Named shapes are resolved at compile time. E-CONTRACT-002-RT SHALL NOT be emitted by
a conforming compiler. If a runtime lookup were ever introduced via meta extension, this code
would be used.

### E-CONTRACT-003: Predicate references external state

Emitted when a predicate expression references a reactive variable, a sibling field, or any
identifier outside the incoming-value scope.

```
E-CONTRACT-003: Inline predicate references external reactive variable '@maxMana'.
  Type:     number(>=0 && <=@maxMana)
  Variable: @hp (line N)

  Inline predicates must be stateless — they may only reference the incoming value
  and its properties. They may not reference reactive variables, sibling fields,
  or any external binding.

  For constraints that depend on external state, use < machine>:

    < machine HpRange for number {
        * => * given (value >= 0 && value <= @maxMana)
    }
    /
    @hp: HpRange = 100
```

Normative statements:
> The compiler SHALL emit E-CONTRACT-003 when a predicate expression contains any reference
> that resolves outside the incoming-value scope.
> The compiler SHALL include an example of the equivalent `< machine>` construct in the
> E-CONTRACT-003 message.
> E-CONTRACT-003 SHALL be emitted at compile time. It is never a runtime error.

### E-CONTRACT-004-WARN: `bind:value` type attribute conflict

Emitted as a warning (not an error) when an element with `bind:value` carries an explicit
`type` attribute that conflicts with the shape-derived type.

```
E-CONTRACT-004-WARN: bind:value attribute conflict.
  Element:        <input> (line N)
  Declared type:  "text"
  Shape-derived:  "email" (from string(email))

  The shape-derived type 'email' will override the declared type 'text' in compiled output.
  Remove the explicit type= attribute to eliminate this warning.
```

Normative statements:
> The compiler SHALL emit E-CONTRACT-004-WARN when an explicit `type` attribute conflicts
> with a shape-derived type.
> The shape-derived type SHALL take precedence in the compiled output.
> E-CONTRACT-004-WARN SHALL NOT prevent compilation.

---

## §53.12 Worked Examples

### §53.12.1 Valid: Numeric Range on a Server Function Parameter

```scrml
<program>

server function submitInvoice(amount: number(>0 && <10000) [invoice_amount]) {
    ?{`INSERT INTO invoices (amount) VALUES (${amount})`}.run()
}

@invoiceAmount: number(>0 && <10000) = 0

markup {
    <form>
        <input type="number" bind:value=@invoiceAmount>
        // Compiler generates: min="1" max="9999" on this input

        <button onclick=submitInvoice(@invoiceAmount)>Submit</button>
    </form>
}
```

Compiler analysis:
- `@invoiceAmount` has inline predicate `(>0 && <10000)`.
- `<input bind:value=@invoiceAmount>` — compiler generates `min="1" max="9999"`.
- The call `submitInvoice(@invoiceAmount)`:
  - `@invoiceAmount` has constraint `(>0 && <10000)`, same as parameter — constraint matches.
  - No boundary check emitted at the call site.
- Server function entry still emits a server-side boundary check (§53.9.4), independent of
  client check.
- The `[invoice_amount]` label will appear in error messages if the constraint is violated.

Expected compiler output: No errors. Compiled HTML includes `min="1" max="9999"` on the input.

---

### §53.12.2 Valid: String Length Constraint with Named Shape Composition

```scrml
<program>

@username: string(.length > 2 && .length < 32) = ""
@email:    string(email) = ""

markup {
    <input bind:value=@username placeholder="Username">
    // Compiler generates: minlength="3" maxlength="31"

    <input bind:value=@email placeholder="Email">
    // Compiler generates: type="email"
}
```

Compiler analysis:
- `@username` has inline predicate `(.length > 2 && .length < 32)`.
- HTML attributes: `minlength="3" maxlength="31"`.
- `@email` has named shape `email`.
- HTML attribute: `type="email"`.
- No E-CONTRACT errors. Shapes `email` is in the built-in registry.

Expected compiler output: No errors. Compiled HTML includes the above attributes.

---

### §53.12.3 Valid: Three-Zone Elision in a Function Body

```scrml
<program>

fn computeShipping(weight: number(>0 && <500), baseRate: number(>0)) number(>0) {
    // weight: proven at parameter boundary (trusted zone)
    // baseRate: proven at parameter boundary (trusted zone)
    
    let rate = weight * baseRate          // arithmetic: result is `number` (constraint lost)
    let shipping: number(>0) = rate       // BOUNDARY CHECK emitted here — rate is unconstrained
    
    return shipping                       // return type is number(>0)
                                          // shipping is proven at this point — no additional check
}

let result: number(>0) = computeShipping(10, 1.5)
// Call site: 10 is a literal, 10 > 0 && 10 < 500 — static zone, no check
// Call site: 1.5 is a literal, 1.5 > 0 — static zone, no check
// result: proven at function boundary (return type) — no check
```

Compiler analysis:
- Parameter `weight = 10`: literal 10 satisfies `(>0 && <500)` statically — no runtime check.
- Parameter `baseRate = 1.5`: literal 1.5 satisfies `(>0)` statically — no runtime check.
- `let rate = weight * baseRate`: arithmetic — produces unconstrained `number`.
- `let shipping: number(>0) = rate`: boundary zone — one runtime check emitted.
- Return: `shipping` is proven in the trusted zone after the boundary check — no check.
- Total runtime checks emitted in function body: 1 (the `shipping` assignment).
- Call site checks: 0.

Expected compiler output: No errors. Single runtime check emitted at `shipping` assignment.

---

### §53.12.4 Invalid: Predicate References External Reactive Variable

```scrml
<program>

@maxScore: number = 100
@playerScore: number(>=0 && <=@maxScore) = 0
// ERROR
```

Expected compiler output:

```
E-CONTRACT-003: Inline predicate references external reactive variable '@maxScore'.
  Type:     number(>=0 && <=@maxScore)
  Variable: @playerScore (line 4)

  Inline predicates must be stateless — they may only reference the incoming value
  and its properties. They may not reference reactive variables, sibling fields,
  or any external binding.

  For constraints that depend on external state, use < machine>:

    < machine ScoreRange for number {
        * => * given (value >= 0 && value <= @maxScore)
    }
    /
    @playerScore: ScoreRange = 0
```

---

### §53.12.5 Invalid: Named Shape Not in Registry

```scrml
<program>

@ssn: string(ssn) = ""
// ERROR
```

Expected compiler output:

```
E-CONTRACT-002: Named shape 'ssn' not found in the shape registry.
  Type:     string(ssn)
  Location: line 3

  Built-in shapes: email, url, uuid, phone, date, time, color
  To register a custom shape, use a ^{} meta block.
  (Custom shape registration syntax: SPEC-ISSUE pending.)
```

---

### §53.12.6 Invalid: Compile-Time Literal Violation

```scrml
<program>

let taxRate: number(>0 && <=1) = 1.5
// ERROR
```

Expected compiler output:

```
E-CONTRACT-001: Value constraint violated.
  Type:              number(>0 && <=1)
  Value:             1.5
  Failing condition: value <= 1
  Variable:          taxRate (line 3)

  To fix: use a value satisfying (>0 && <=1).
  Valid values include: 0.01, 0.1, 0.25, 0.5, 0.99, 1.0
```

---

## §53.13 Open Questions

The following questions are open at time of drafting. Each SHALL become a formal SPEC-ISSUE.

### §53.13.1 Named Shape Registry Extension (SPEC-ISSUE pending)

How does a developer register a custom named shape? The `^{}` meta block is the planned
extension point, but the exact syntax is not specified. Questions:
- What is the structure of a custom shape declaration?
- Does a custom shape carry its own HTML attribute mapping?
- Can custom shapes be composed from built-in shapes?
- What is the scope of a custom shape — file-level, program-level, global?

Acceptance criteria: a spec section defining custom shape registration syntax, scope rules,
HTML mapping behavior, and conflict resolution when two shapes with the same name are registered.

### §53.13.2 Constraint Arithmetic Propagation (SPEC-ISSUE pending)

Currently (§53.3.4), arithmetic on constrained types produces unconstrained types. This means:
```scrml
let discounted: number(>0 && <9000) = amount * 0.9   // runtime check
```
is always a boundary zone, even when the compiler could prove that `amount * 0.9 < 9000` when
`amount < 10000`.

Whether the compiler SHOULD perform constraint arithmetic (proving that the result type is a
subset of the target constraint) is an open question. The current spec does NOT require it.

Acceptance criteria: a decision on whether constraint arithmetic is in scope, and if so, a
spec section defining which arithmetic operations preserve constraints and the proof obligations.

### §53.13.3 Type Alias for Named Inline Predicates (SPEC-ISSUE pending)

Currently, `number(>0 && <10000)` is anonymous. If the same predicate is used in multiple
places, the developer must repeat it. A named type alias mechanism would allow:

```scrml
type ValidAmount = number(>0 && <10000)
@price: ValidAmount = ...
@fee:   ValidAmount = ...
```

This is different from a `< machine>` named binding because the alias is stateless. Whether
`type AliaName = base-type(predicate)` is valid scrml syntax is not specified in this section.

Acceptance criteria: a spec section or amendment to §5 (type declarations) defining named
inline predicate aliases, their binding syntax, and their interaction with `E-CONTRACT-*` error
messages.

### §53.13.4 Boolean Predicates (SPEC-ISSUE pending)

The grammar in §53.2.1 includes `boolean` as a `base-type`. It is unclear what predicate
expressions are valid for `boolean`. `boolean(true)` — a boolean that must be `true` — is
syntactically valid in the grammar but semantically unusual. This needs clarification.

Acceptance criteria: either spec the valid predicate expressions for `boolean(predicate)`,
or remove `boolean` from the inline predicate grammar and restrict it to `number`, `string`,
and `integer`.
