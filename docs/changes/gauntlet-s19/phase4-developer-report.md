---
tags: [gauntlet, s19, phase4, developer-report]
status: draft
date: 2026-04-15
---

# S19 Phase 4 — Dev-persona report: nested-comments thread

Source: `/home/bryan/scrmlMaster/scrmlTS/samples/gauntlet-s19-phase4/nested-comments.scrml`

Feature built: threaded comments with per-node reply forms, recursive `<Comment>`, named slots, default slot, `bind:value` on `<textarea>`, `class:active`, `for/lift key ...`, nested lift per §10.6, `if=` on the reply form, and `</>` throughout.

## Ambiguities / gaps

**A1. `class:x` and `if=` on a component definition header.**
I wrote `const Comment = <article ... class:active = @activeReplyId == comment.id>` and `const ReplyForm = <form ... if=visible ...>`. §15 and §16 describe props and slots but don't explicitly say whether `class:` / `if=` attributes on the *definition* tag are promoted to the rendered root, or are considered call-site-only. Spec-silent. I assumed: attributes on the definition tag apply to the component's rendered root, which is the only sensible reading.
Proposed resolution: add a one-liner to §15 confirming that non-prop attributes on the definition tag render on the component root.

**A2. Reactive object-property writes.**
I wrote `@drafts = { ...@drafts, [id]: "" }` and `bind:value=@drafts[commentId]`. §6.5 covers array mutation interception but not object-shaped reactive state. Does `bind:value` on a computed member access write back through a proxy, or do I need to re-assign `@drafts` each keystroke? I assumed the former (two-way bind synthesizes the right setter); but the spec doesn't promise it.
Proposed resolution: extend §5.4 (`bind:`) to state whether member-expression lvalues are supported as bind targets.

**A3. `class:x = expr` with an expression containing `==`.**
`class:active = @activeReplyId == comment.id`. Is the RHS parsed as a full expression or just an identifier/reactive ref? §5.5 uses a bare `@var` example. I need an expression. I assumed expression; if only identifiers are allowed, I'd have to introduce a `const @isActive = ...` derived binding, which is fine but noisy.
Proposed resolution: §5.5 should say "expression" explicitly, or require parens for anything beyond a single `@ref`.

**A4. `else` branch of `for/lift` placing `if=` on the empty-state element.**
`lift <p class="muted" if=(depth == 0)>No replies yet./` — I want the empty-state to only render at depth 0. §17.4a says the else body runs when the collection is empty; combining `if=` inside it is not discussed. Assumed: legal and composable. It also raises the question of whether `if=` evaluating to false in an `else` body produces *nothing* (correct) or an empty text node.
Proposed resolution: note in §17.4a that the body is ordinary markup and all attribute semantics apply.

**A5. Named slot containing multiple elements — wrapper required?**
`<span slot="header"> <Avatar .../> <strong>...</> </>` — I wrapped the header contents in a `<span>` because §16.5 says "multiple children with the same `slot=` value are combined into one snippet in source order," which suggests I could have written them as siblings without a wrapper. I kept the wrapper for clarity; spec allows both. Not a bug, but a style question the spec could address.

**A6. Default content for snippet fallback with inline markup.**
`${render footer() ?? <span class="muted">no actions/}` — §16.2 shows `?? <p>No content provided./` with an inferred-closer. This is fine. But for a fallback containing a logic `${}` block, I couldn't tell if the precedence of `??` versus markup content is unambiguous. Didn't hit it here; flagging for later.

## Compiler-bug candidates (to verify in overseer compile)

**B1.** Recursive component reference inside its own body: `<Comment comment=child depth=(depth + 1) ...>` is used *inside* `const Comment = ...`. If the name-resolution pass resolves `Comment` at definition time rather than at use time, it will fail. The natural fix is late-binding for component identifiers. Flag for the overseer to confirm.

**B2.** `for ... key expr` with a parenthesized member access (`key c.id`) should work, but if the parser requires an identifier token after `key`, it will misfire. Worth checking.

**B3.** The nested-lift case — `<Comment>` renders a `for/lift` inside its own body that contains another `<Comment>` invocation, which itself contains a `for/lift`. Each lift accumulator must scope to its own immediate parent (§10.6). If the lift-accumulator plumbing passes `containerVar` by the wrong scope, inner replies will end up attached to the outer list. Hot regression candidate.

## Ergonomics friction

**F1.** `@drafts = { ...@drafts, [id]: "" }` for object-shaped state is the most common real-world pattern (per-row drafts, per-tab flags) and reads painfully. A `@drafts[id] = ""` short form that is interception-aware would remove a lot of noise. §6.5 did this for arrays; objects deserve the same.

**F2.** I wanted `onclick=toggleReply(c.id)` to be unambiguous — and it is — but the nearby `onsubmit=submitReply(commentId)` on a component definition tag reads as "call this at definition time" for half a second before I remember it's an event-handler attribute being promoted to the rendered root. Consider a doc example that shows this exact case so readers don't second-guess it.

**F3.** Declaring a snippet prop whose default rendering is complex (`header`) is easy; declaring an *optional* snippet with a *non-trivial* fallback forces the `?? <markup>` form to fit on one expression. Not a bug; just awkward when the fallback wants its own small tree.

**F4.** No way to name the top-level `@drafts` entry's type cleanly — `@drafts = {}` is inferred as an empty record and I had to check `== not` before indexing. An annotation syntax at the declaration site would help.

## No surprises worth reporting

- `</>` self-closer behaved intuitively everywhere I used it.
- `for @items key x.id ... else { ... }` composed cleanly with slotted children.
- Named + default slot on the same component (§16.4 + §16.5) was exactly as advertised.
