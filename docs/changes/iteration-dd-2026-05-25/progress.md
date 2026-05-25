# Iteration Design Surface DD — Progress Log

## 2026-05-25 Phase 1: Scope Lock

- Read SPEC-INDEX.md for navigation
- Read SPEC.md §17.4 (current iteration), §17.4a (else block), §17.4b (key)
- Read SPEC.md §10 (lift keyword)
- Read SPEC.md §1.4 (markup-as-value pillar), §1.5 (Tier ladder), §1.6 (V5-strict)
- Read SPEC.md §4.14 (`:`-shorthand body form), §4.15 (scrml-defined structural elements)
- Read SPEC.md §18.0 (match block-form, the established Tier 1 pattern)

## Scope-lock conclusion

**Central question:** What does scrml's structural-markup-first iteration surface look like? Should we ship a `<each>` structural element, and if so, what are its semantics?

**In scope:**
- `<each>` structural-element design: attributes, body grammar, semantics
- Item-binding surface (`as`, `@`-bare, bare-attribute)
- `:`-shorthand template-body extension
- Multi-child body grammar
- Empty-state handling (else=, <empty>, composition with match)
- key= attribute for keyed reconciliation
- Composition with engines, match, components, V5-strict
- Migration from current `for...of` + `lift` form
- Relationship to existing `<match>` Tier 1 form

**Out of scope:**
- Performance benchmarking of compiler-emitted iteration code
- Tier 0 (current) deprecation — current `for...of` + lift remains as fallback
- JS-style match (§18.1+) — iteration is structural-element-domain, not match-domain
- Lazy/streamed iteration / virtualized lists
- Server-paginated iteration (separate concern from local-iteration surface)
- Reactivity guarantees on iter-bound name (covered by existing §6.5 reactive array rules)

**Already known:**
- Current §17.4 syntax: `${ for (let x of @items) { lift <li>...</> } else { lift <li>empty</> } }`
- Current §17.4b `key`: `for (let x of @items key x.id) { ... }`
- Current §17.4a `else`: empty-state block on for/lift
- §4.14: `:`-shorthand body form is universal (engine state-children + match arms)
- §4.15: scrml-defined structural elements registry — adding `<each>` requires registry update
- §17.0: Tier ladder for case analysis (if= → match → engine); same shape applies to iteration?
- §1.4: markup-as-value pillar — bodies ARE values
- §18.0.1: `<match for=Type>` block-form is the canonical "structural element wraps logic" pattern in scrml; the `<each>` analog must mirror this idiom
- §10.4: `lift` is anonymous-${}-only; named functions return markup. This constrains how an `<each>` body composes with `lift`.

**Need to find out:**
- Actual count of iteration sites in `samples/` + `examples/` corpus
- What shapes are actually used (single `<li>` vs multi-child vs nested logic)
- Prior art: Svelte, Vue, Solid, React, Marko, Astro, Imba, Lit, Angular, Vento
- 3-5 viable `<each>` designs with tradeoff analysis
- Cohesion analysis with V5-strict, engines, match, components

## Phase 2 next steps

1. Corpus survey of `samples/` + `examples/` iteration sites — count + classify
2. Prior art research (WebSearch + framework docs)
3. Read PA-SCRML-PRIMER.md for Tier ladder + pillars
4. Read llm-kickstarter-v2-2026-05-04.md for current canonical recipes
5. Read examples/03-contact-book.scrml (hero) + 15-channel-chat.scrml

## Phase 2 — Corpus survey complete

**Iteration site counts in current corpus (2026-05-25 snapshot):**

- Total `for (... of ...)` sites in `.scrml` files (examples/ + samples/): **173**
- Files containing iteration: **113 unique `.scrml` files**
- Sites paired with `lift` in same logic block: **93** of 113 (82%)
- Sites with `key=` clause (§17.4b): **5** test-fixture (`phase2-for-keyed-reconcile-051`) — ZERO live use in `examples/` apps
- Sites with `else { lift ... }` empty-state (§17.4a): handful (e.g. `phase2-for-lift-else-empty-049`); zero live use in `examples/`
- Bulk of iteration: simple `${ for (let x of @items) { lift <li>...</li> } }`

**Canonical shape (recurring across 70+ sites):**

```scrml
<ul>
  ${ for (let item of @items) {
    lift <li class="row">
      <span>${item.title}</span>
      <button onclick=remove(item.id)>×</button>
    </li>
  } }
</ul>
```

**Variations observed:**

1. **`if/continue` filtering pattern** (kanban + live-search) — pre-filter inside loop
2. **Component-row pattern** (trucking-dispatch) — `lift <div><LoadCard load=l/></div>`
3. **`match` inside `lift` body** (phase2-match-in-for-lift-098) — match expression for per-item branching
4. **Chained array operations** (`@tasks.filter(t => t.column == col).sort(...)`) — fluent inside for-head
5. **Multi-child body** (contact-book, 03) — `<li>` with multiple `<span>` siblings; this is the majority shape
6. **Component-only emit** (trucking-dispatch board.scrml) — `lift <div><LoadCard .../></div>` wrapper-div hack for single-component case
7. **Numbered/indexed access** — `@tasks.filter(...)` evaluated in for-head (reactive dependency)

**No live use of `key=` in production examples — ZERO files.** This is one of the load-bearing finding for the DD: the keyed-reconciliation surface exists in SPEC but is not used.

**No live use of `else { lift ... }` in examples/ — empty-state is currently handled via separate `if (@items.length == 0)` check OR omitted.**

**Kickstarter explicit:** "There are no `<for>` or `<if>` markup tags. Iteration uses `${ for (let x of xs) { ... lift ... } }`."
(`docs/articles/llm-kickstarter-v2-2026-05-04.md` §7 line 688, §8.5 line 729)

This is the single load-bearing prior commitment this DD must address: any `<each>` proposal directly contradicts the kickstarter's stated negative-space.

**Gauntlet R10 (2026-04-08, `optimal-syntax-from-gauntlet-2026-04-08.md`) friction:**

- 9-10 of 13 dev agents wrote tripled-markup kanban columns because they DID NOT REACH for `for/lift` iteration over `Column.variants` (enum-iteration was unattempted by most)
- 2/13 used `for` over `Column.variants` (Vue + Rust)
- Quote: "This problem has two solutions: A (enum iteration `for (let col of Column.variants)`)..."

**User-voice signal (elevator-pitch.md line 144):** "If scrml added keyed iteration, transitions, and file routing, I would switch for new projects."
Iteration is on record as a name-axis ergonomics surface.

