# Tutorial Pass 2 — Concrete Edit List (RECON)

**Date:** 2026-04-29
**Source audit:** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/tutorial-freshness-audit-2026-04-29.md`
**Live tutorial:** `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial.md` (1,651 lines)
**Snippets dir:** `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial-snippets/` (33 .scrml + 3 .db fixtures)
**Pass 1 commit:** `9873e0e` (S48, 2026-04-29) — verified landed
**Status:** RECON ONLY. No code changes. No commits.

---

## 1. Pass 2 Scope Confirmation

The audit's "Rewrite plan recommendation" lists five passes. **Pass 2 is the Layer 1 ordering rewrite** — exactly two items, items 11 and 12 in the audit's numbering.

### Verbatim quote from the audit (lines 345–351 of the audit)

> ### Pass 2 — Layer 1 ordering rewrite
>
> 11. **Move `if=` introduction to Layer 1.** Currently in §2.5. Promote to a new §1.8 ("Conditional rendering: `if=`, `else=`, `else-if=`"). This dissolves Ordering Issue 1 and Ordering Issue 2 simultaneously, and makes presence-checks (§2.8) less surprising.
> 12. **Add §1.1 state-opener list.** When introducing tags, name `<program>`, `<db>`, `<channel>`, `<errorBoundary>`, `<machine>`, `<schema>`, `<keyboard>`, `<mouse>`, `<gamepad>`, `<timer>`, `<timeout>` as the language-level openers. This pre-pays the cost of every later "this is a state opener" footnote.
>
> **Estimated effort:** 1 work-block (3h).

### What Pass 2 IS

- **Item 11 — `if=` promotion to Layer 1.** Create new §1.8 "Conditional rendering" introducing `if=`, `else=`, `else-if=` (per SPEC §17.1, §17.1.1). Rewrite §2.5 to reference §1.8 for the basics and to focus on the harder `match`-vs-`if=` choice and ternary interpolation.
- **Item 12 — §1.1 state-opener list.** Replace the casual line 199 ("A few tags (`<program>`, `<db>`, `<channel>`, `<errorBoundary>`) are built-in *language* elements") with a complete, named list of all 11 state-object openers per SPEC §4.2.

### What Pass 2 is NOT

| Pass | Audit items | Out of Pass 2 scope |
|---|---|---|
| **Pass 3** | 13–16 | New sections: §2.11 component overloading, §2.x named shapes, §3.7 schema/migrations, §3.x state authority |
| **Pass 4** | 17–21 | New sections: §4.x SSE, §4.x navigation, §2.10.x temporal transitions, §2.10.x §54 substates, §4.x input states |
| **Pass 5** | 22–27 | Polish: `<db>`/`<db>` cosmetics, `?` propagation, spec-form arm syntax, Promise form `<#worker>.send`, glossary additions, `fn`↔inline-tests cross-link |

Pass 2 ships **two new sections + one rewrite + ~10 anchor / cross-reference touches**. No new feature surface. No new sections beyond §1.8.

### Pass 1 prerequisite confirmed landed

`git show --stat 9873e0e`: tutorial Track A items #2 (line 339 onkeydown rewrite + 01e snippet), #3 (line 1170 `@@user` reframe), #4 (line 1129 `@server` deletion), #10 (Recipe 3 quoted-string handler) all landed. Other Pass 1 items (snippet 02k arrow form, 04d writer, 02j MarioMachine comment, 00a `remove(item)`, 02e `if=`/`show=` Phase 1) all visible in the live snippet files. **Pass 2 has no blocking-prereq friction.**

---

## 2. Concrete Edit List

| # | Tutorial anchor | Lines | Edit category | Before-quote | After-sketch | Snippet involved |
|---|---|---|---|---|---|---|
| **E2-01** | §1.1 line 199 | 199 | GAP-fill | "A few tags (`<program>`, `<db>`, `<channel>`, `<errorBoundary>`) are built-in *language* elements that the compiler treats specially." | Replace with complete state-opener list per SPEC §4.2: "A handful of tags are language-level *state object openers*, not regular HTML: `<program>`, `<db>` (database), `<channel>` (WebSocket), `<errorBoundary>`, `<machine>` (state machine), `<schema>` (DB schema), `<keyboard>`, `<mouse>`, `<gamepad>`, `<timer>`, `<timeout>`. The opener syntax is `< name ...>` with whitespace after the `<` to disambiguate from HTML elements (per SPEC §4.2). Each opener introduces a state context and is covered in the section that uses it. They cannot carry `if=`, `else=`, or `else-if=` (§1.8) and their content rules are specific to the kind." | none |
| **E2-02** | §1.1 line 203 | 203 | DRIFT-fix | "Attributes inside markup mostly behave like regular HTML. The few that do not are the scrml extensions you will meet across Layer 1: `bind:value`, `class:name`, `onclick` (and other event names), `if=`, `show=`, `slot=`, `protect=`, and `auth=`." | Trim to truly-Layer-1 only: "...the scrml extensions you will meet across Layer 1: `bind:value`, `class:name`, `onclick` (and other event names), and `if=` / `else=` / `else-if=` (§1.8). The remaining scrml-specific attributes — `slot=` (§2.7), `protect=` (§3.4), `auth=` (§3.4), `show=` (§2.5) — are introduced where they belong." | none |
| **E2-03** | §1.5 line 307 (header) → §1.7 → §1.8 | 307–408 → new §1.8 | SUPERSEDED-rewrite (renumber) | (Existing §1.5 Bindings, §1.6 Scoped CSS, §1.7 Tailwind) | Insert new §1.8 _before_ the "Checkpoint" at line 409. The Checkpoint stays at the end of Layer 1. | (none — new prose only) |
| **E2-04** | new §1.8 (after line 408) | 408+ | GAP-fill | (no existing prose) | New section: "**1.8 Conditional rendering: `if=`, `else=`, `else-if=`**". Body teaches `if=` as a directive that conditionally _includes_ the element subtree (per SPEC §17.1 wording — keep the language ambiguous about mount/unmount-vs-display-toggle since Phase 2 of the codegen flip is mid-flight; cite §17.1.1 for chains). Show two-branch and three-branch examples lifted directly from SPEC §17.1.1. Cross-reference §2.5 (which now covers `show=` and ternary). Note the state-opener prohibition: "`if=` cannot appear on a state object opener (E-CTRL-004)" — references the §1.1 list. | new snippet `01h-if-chains.scrml` (see §2.E2-12 below) |
| **E2-05** | §2.5 header line 643 | 643 | SUPERSEDED-rewrite | "### 2.5 Control flow: `if=`, `show=`, ternary" | Rename to: "### 2.5 Control flow: `show=` and ternary (and when to reach for `match`)". The `if=` part moved to §1.8. Section now opens with "By §1.8 you have already seen `if=`/`else=`/`else-if=` chains. For the remaining two control-flow tools..." | (existing 02e-control-flow.scrml needs trimming — see E2-13) |
| **E2-06** | §2.5 prose line 645 | 645 | SUPERSEDED-rewrite | "For conditional markup scrml gives you three tools, each with a different trade-off. `if=` mounts or un-mounts an element entirely; `show=` keeps it in the DOM but toggles its visibility; a ternary inside an interpolation substitutes one of two expressions." | "For the remaining two conditional-markup tools: `show=` keeps the element in the DOM and toggles its CSS `display`; a ternary inside an interpolation substitutes one of two expressions. (For mount-style branching, see §1.8 `if=`/`else=`.)" | none |
| **E2-07** | §2.5 prose lines 667–669 | 667–669 | SUPERSEDED-rewrite | "Use `if=` when you need the absence ... `if=` is cheaper when the element is usually absent, because no DOM is created unless needed. `show=` is cheaper when the element toggles frequently, because the DOM is built once and then its `display` is flipped." | Drop the entire if-vs-show paragraph. Replace with one-paragraph framing about `show=` use cases (form inputs you want to keep mounted across tabs; media elements; expensive subtrees that toggle often) and one paragraph about ternary-inside-interpolation. **Note:** trade-off framing in current text gold-plates the `if=`/`show=` pair; better to be terse and let SPEC §17.2 carry the detail. | none |
| **E2-08** | §2.5 prose line 671 | 671 | SUPERSEDED-rewrite | "You cannot use `if=` on `<program>`, `<db>`, `<channel>`, or `<errorBoundary>` — these are language-level elements that must always be present." | Move this sentence to §1.8 (where `if=` is now introduced). In §1.8 it should reference the §1.1 state-opener list and cite E-CTRL-004 / SPEC §17.1.1. **§2.5 keeps a one-line caveat for `show=`:** "Like `if=`, `show=` does not apply to state-object openers — see §1.1." | none |
| **E2-09** | §2.5 prose line 673 | 673 | SUPERSEDED-rewrite | "For 'either-or' blocks, a two-`if=` pattern works: `<p if=@loading>Loading...</p><div if=(not @loading)>...</div>`. For anything more elaborate (three or more branches), reach for `match` on an enum; it will read better than a chain of `if=`s." | Delete the "two-`if=`" sentence (§1.8 now covers `else=`). Keep the "reach for `match`" guidance, retargeted: "For exhaustive branching over an enum's variants, reach for `match` (§2.4) rather than long `if=`/`else-if=` chains." | none |
| **E2-10** | §2.8 line 798 (snippet 02h ordering footnote) | 798 + snippet 02h:12 | DRIFT-fix | Snippet 02h line 12 uses `if=` two sections before §2.5 currently introduces it. | After §1.8 lands, this is **resolved automatically** — `if=` is now in §1.8, three sections _before_ §2.8. No code edit needed; ordering becomes natural. | snippet 02h-presence-checks.scrml (no content change required, just stops being out-of-order) |
| **E2-11** | Glossary lines 1604, 1615 | 1604, 1615 | DRIFT-fix (cross-ref) | Line 1605/1606/1607 `Section 1.5` references for `bind:`, `class:`, `on<event>` — UNCHANGED. Line 1615: `if=expr / show=expr — mount vs. toggle-visibility. Section 2.5.` | Update glossary line 1615 to two entries: "`if=expr` / `else` / `else-if=expr` — conditional rendering chain. **Section 1.8.**" and "`show=expr` — visibility toggle (DOM stays). **Section 2.5.**". The §2.5 cross-ref keeps for `show=`; new §1.8 cross-ref for `if=` family. | none |
| **E2-12** | new snippet `01h-if-chains.scrml` | new file | GAP-fill | (does not exist) | New file at `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial-snippets/01h-if-chains.scrml`. Contents: a single `<program>` with `@step: number = 1`, three sibling tags using `if=`/`else-if=`/`else` per SPEC §17.1.1 Example 3 (multi-step wizard). One `<button>` to advance `@step`. ~25 lines. Follows file-naming and header-comment conventions of existing 01* snippets. | new file |
| **E2-13** | snippet `02e-control-flow.scrml` | snippet 02e (whole file) | DRIFT-fix | Snippet currently shows `<p if=@loggedIn>Welcome back.</p>` + `<p show=@verbose>Extra diagnostic info.</p>` + ternary, all in one program. The header comment names "if= (mount/unmount), show= (toggle visibility)". | After §1.8 lands, the `if=` line and the comment claim about `if=` move to a new snippet (E2-12). 02e shrinks to: a `<p show=@verbose>` line + a ternary + a comment that no longer claims anything about `if=`. The header becomes "`02e — show= and a ternary inside interpolation. (if= and chains: see 01h.)`". **Important — Phase 2 codegen drift:** The current `if=` impl is display-toggle (`emit-event-wiring.ts:380–381`); SPEC §17.1 says "is NOT rendered." Phase 2c+ will flip impl to mount/unmount. **Pass 2 prose should NOT pin the rendering mechanism** — keep the wording aligned with what the user observes ("the element does not appear when the condition is false") rather than mount-vs-display-toggle internals. See FLAG-01 below. | edited file |
| **E2-14** | snippet `01a-program.scrml` (header comment) | snippet 01a:1–2 | (optional) DRIFT-fix | Header comment names three closer forms only. | Optional: extend header to mention "every state-object opener uses the same `< name>` (whitespace after `<`) form — see tutorial §1.1." Tiny comment-only edit. **[INFERRED]** Not strictly required by Pass 2; nice-to-have. | snippet 01a-program.scrml |

---

## 3. Cross-References That Need Updating

Anchors are sticky — section numbers in the tutorial leak into the glossary, into snippet headers, into footnotes, into hand-off docs and audits. **Pass 2 changes one section number and adds one new section number**; nothing else moves.

### Section number map (before → after)

| Layer 1 before | Layer 1 after |
|---|---|
| §1.1 program/markup | §1.1 program/markup (**now contains state-opener list**) |
| §1.2 logic block | §1.2 logic block |
| §1.3 reactive state | §1.3 reactive state |
| §1.4 derived | §1.4 derived |
| §1.5 bindings | §1.5 bindings |
| §1.6 scoped CSS | §1.6 scoped CSS |
| §1.7 Tailwind | §1.7 Tailwind |
| (none) | **§1.8 conditional rendering: `if=`/`else=`/`else-if=`** ← NEW |
| Checkpoint | Checkpoint (unchanged position) |

| Layer 2 before | Layer 2 after |
|---|---|
| §2.5 Control flow: `if=`, `show=`, ternary | §2.5 Control flow: `show=` and ternary (**`if=` moved to §1.8**) |

### Cross-references to update

| Source | Line | Before-text | After-text | Reason |
|---|---|---|---|---|
| `tutorial.md` glossary | 1615 | `` `if=expr` / `show=expr` — mount vs. toggle-visibility. Section 2.5. `` | Split into two glossary entries: §1.8 for `if=`/`else=`/`else-if=`, §2.5 for `show=`. | New section + scope-narrowed §2.5. |
| `tutorial.md` line 514 | 514 | "the `is some` / `is not not` operators from Section 2.8" | UNCHANGED | §2.8 number unaffected. |
| `tutorial.md` line 260, 725, 1601, 1603, 1604, 1608, 1622 | various | `Section 1.x` references for `<program>`, `@var`, `const @`, `#{}`, `function` | UNCHANGED | None of §1.1–§1.7 number-shifts. Only `if=` migrates. |
| `tutorial.md` line 671 → moved into §1.8 prose | n/a | "You cannot use `if=` on `<program>`, `<db>`, `<channel>`, or `<errorBoundary>`..." | Generalize to "any state-object opener (see §1.1)" + cite E-CTRL-004. | List was incomplete before; §1.1 now has the full list. |
| `tutorial.md` Checkpoint line 411 | 411 | "The todo list in Section 0.1 uses exactly these primitives and nothing else..." | Slightly amend: §0.1 todo list **does** use `for`/`lift` and basic `class`/`onclick`, but NOT `if=`. The Checkpoint claim still holds, but consider a note: "§0.1 was a sneak preview; §1.8's `if=`/`else=` is the new tool from this layer." **[INFERRED]** Optional. | Optional polish. |
| `tutorial.md` line 943 (Layer 2 Checkpoint) | 943 | "With Layer 2 in hand you can build non-trivial client-side UIs. You can iterate typed collections, destructure enums exhaustively, decompose the UI into components with slots, and separate pure code from impure code." | UNCHANGED — `if=`/`else=` framing is now part of Layer 1, doesn't disrupt Layer 2 framing. | None |
| `tutorial.md` line 1322 (§4.1 footnote about `=>`/`->`/`:>`) | 1322 | UNCHANGED | UNCHANGED | Unrelated. |
| `tutorial.md` line 1396 (§4.3 worker `<p if=...>`) | 1396 | `<p if=(@result.result != 0)>` | UNCHANGED | `if=` works the same as a primitive; reader has it from §1.8. |
| Snippet `01h-if-chains.scrml` (NEW) | snippet 01h:1 | (does not exist) | New snippet header: `// 01h — Conditional rendering. if=, else-if=, else as an attribute chain.` | New file. |
| Snippet `02e-control-flow.scrml` line 1 | snippet 02e:1 | `// 02e — Control flow: if= (mount/unmount), show= (toggle visibility), and a ternary inside interpolation.` | `// 02e — show= visibility toggle and a ternary inside interpolation. (For if=/else=/else-if= chains, see 01h.)` | Header now matches the trimmed body. |
| Snippet `02h-presence-checks.scrml` | snippet 02h | UNCHANGED (`if=` already used at line 12; with §1.8 in place, this is no longer an out-of-order forward-reference) | n/a | Audit Ordering Issue 1 dissolves. |
| `compiler/SPEC.md` §17.1 | n/a | (spec is reference, not affected by tutorial reorg) | UNCHANGED | Spec is the source of truth; no migration. |
| `hand-off.md` §3 task list | hand-off.md:60 | "Tutorial Pass 2-5 ... pending; ~30h estimated" | After Pass 2 lands: change to "Pass 3-5 pending; ~25h remaining (Pass 2 done in `<commit>`)." | Hand-off bookkeeping; not in Pass 2 scope. |
| `master-list.md` (root) | n/a | flagged for S48 refresh, separately tracked | UNCHANGED by Pass 2 itself | Hand-off bookkeeping. |
| Audit doc itself (`tutorial-freshness-audit-2026-04-29.md`) | (not under scrmlTS) | UNCHANGED | UNCHANGED | Audit is historical; do not edit. |

### No anchors break

- The only "moved" content is `if=` from §2.5 → §1.8. **§2.5 still exists** (now scoped to `show=`/ternary), so any external link `tutorial.md#25-control-flow` still resolves to a valid section about control flow.
- No section number 1.1–1.7 changes. No section number 2.x changes. No glossary anchors except the one entry split (line 1615).
- **No spec section number changes.** Pass 2 is tutorial-internal.

---

## 4. Order of Operations (Sub-grouping)

Pass 2 has natural seams. Bias toward atomic-and-revertable.

### Subgroup A — §1.8 new section + new snippet (1 commit)

**Commit message sketch:** `docs(tutorial): add §1.8 conditional rendering — if=/else=/else-if= promoted to Layer 1`

**Files touched:**
- `docs/tutorial.md` — insert new §1.8 between line 408 (end of §1.7 Tailwind body) and line 409 (Checkpoint header). ~80 lines of new prose.
- `docs/tutorial-snippets/01h-if-chains.scrml` — new file, ~25 lines (E2-12).

**Tests / verification:**
- `bun compiler/bin/scrml.js compile docs/tutorial-snippets/01h-if-chains.scrml` should succeed and emit working HTML.
- Search for any ext-link `tutorial.md#18-` — none should be in the repo (this is the first §1.8).

**Why a commit on its own:** purely additive. Reader can read tutorial through §1.7 → new §1.8 → existing Checkpoint with no friction even if §2.5 hasn't been touched yet. Worst case (Subgroup B doesn't land), the tutorial has a redundant `if=` introduction in both §1.8 and §2.5 — survivable.

### Subgroup B — §2.5 trim and §1.1 state-opener list (1 commit)

**Commit message sketch:** `docs(tutorial): trim §2.5 to show= + ternary; list state-object openers in §1.1`

**Files touched:**
- `docs/tutorial.md` — edits to §1.1 (E2-01, E2-02), edits to §2.5 (E2-05, E2-06, E2-07, E2-08, E2-09), glossary (E2-11).
- `docs/tutorial-snippets/02e-control-flow.scrml` — trim out `if=` line, update header comment (E2-13).

**Tests / verification:**
- `bun compiler/bin/scrml.js compile docs/tutorial-snippets/02e-control-flow.scrml` should still succeed.
- All existing cross-references "Section 2.5" still target a valid section.

**Why second:** depends on §1.8 existing — §2.5 now references §1.8 ("By §1.8 you have already seen `if=`/`else=`..."), and §1.1 references §1.8 ("They cannot carry `if=`, `else=`, or `else-if=` (§1.8)"). If you reverse the order, you have dangling forward refs to a section that does not yet exist for one commit.

### Optional Subgroup C — header comments cosmetic touch (1 commit, defer-able)

**Commit message sketch:** `docs(tutorial): tidy 01a-program header to reference §1.1 state-opener list`

**Files touched:**
- `docs/tutorial-snippets/01a-program.scrml` — comment-only edit (E2-14).

**Why optional:** strictly polish; could ship with Subgroup B or wait for Pass 5. Skip if you want Pass 2 to be exactly two commits.

### Recommendation

Two commits. Subgroup A → Subgroup B, in order. Each commit reads as a coherent change. If Subgroup A lands and Subgroup B is interrupted, the tutorial is _redundant but not wrong_ (a reader meets `if=` in both §1.8 and §2.5; the §2.5 version is a duplicate but not contradictory). If Subgroup B lands first, the tutorial _is_ wrong (§1.1 and §2.5 reference §1.8 but §1.8 doesn't exist).

---

## 5. Spec-vs-Impl Flags Surfaced

Pass 2 surfaces drift between tutorial / SPEC / impl that **the Pass 2 author cannot resolve unilaterally**. The fix-it agent should flag each one for user decision rather than picking a side in prose.

### FLAG-01: `if=` mount/unmount-vs-display-toggle drift (CANONICAL EXAMPLE)

- **Tutorial today (line 645):** "`if=` mounts or un-mounts an element entirely."
- **SPEC §17.1 line 7351:** "If `expr` evaluates to false, the element ... is NOT rendered. It does not exist in the DOM."
- **Impl today (`emit-event-wiring.ts:380–381` per audit):** `el.style.display = ${conditionCode} ? "" : "none"` — visibility toggle, element stays in DOM.
- **Phase 2 codegen plan (per hand-off §2):** Phase 2c+ flips impl to true mount/unmount. Phase 2a (runtime helpers) committed in `90f8d16`; Phase 2b deferred in `e62a11f`. Phases 2c–2h not started.
- **Resolution path:** Pass 2 prose for §1.8 should describe the **observable behavior** without committing to mount-vs-display-toggle implementation. Suggested wording: "When the condition is false, the element is not visible and reads as not-present from the user's view. (The compiler may achieve this by removing the DOM node or by toggling its `display`; either way, the visible result is the same.)" Once Phase 2 lands, a follow-up edit can sharpen the wording.
- **Needs:** [user decision] — confirm Pass 2 should use observable-behavior wording, OR wait for Phase 2c to land first (would block Pass 2 Subgroup A on Phase 2c — see §7).

### FLAG-02: SPEC §17.1.1 includes `<span else>` examples (bare attribute, no `=`) — tutorial introduces this for the first time

- **SPEC §17.1.1 line 7378:** "`else` attribute is bare (no `=` and no value)."
- **Tutorial today:** does not teach `else=` or `else` at all.
- **Pass 2 §1.8 must teach the bare-attribute syntax for `else`** — readers who have only seen quoted/unquoted `attr=value` pairs will be confused by `<span else>`. SPEC examples 1, 3, 4, 5 all use bare `else` (no `=`).
- **Audit (line 273):** missing-sections matrix lists `else=`/`else-if=` chains as feature #1 (recommended slot in §1.x or §2.5; Pass 2 picks §1.8).
- **Needs:** [no decision needed, just careful wording] — tutorial should explicitly call out "bare attribute `else` (no `=`, no value)" since this is otherwise novel in the language. Cite E-CTRL-001 / E-CTRL-002 / E-CTRL-003 for the chain rules.

### FLAG-03: `show=` Pass 1 Phase 1 just landed; tutorial prose at §2.5 still uses pre-Phase-1 framing

- **Pass 1 commit `9873e0e`:** Phase 1 makes `show=` a real reactive directive (data-scrml-bind-show placeholder + display-toggle codegen). Prior to Phase 1, `show=@var` was a literal HTML attribute (no-op).
- **Tutorial §2.5 line 645:** "`show=` keeps it in the DOM but toggles its visibility." This is now **correct as of `9873e0e`**.
- **Tutorial §2.5 lines 667–669 (use-cases paragraph):** still aligned with audit Top 5 #1 critique. Pass 2 Subgroup B trims this paragraph (E2-07).
- **Needs:** [no flag — landed]. Just confirming Pass 1 closed the `show=` half of the original audit Top-5 #1.

### FLAG-04: §1.1 state-opener list will mention `<schema>`, `<keyboard>`, etc. that the tutorial does not yet teach

- **Tutorial today:** §1.1 names only four openers. The audit's recommended 11-element list includes openers for sections that don't yet exist in the tutorial (§39 schema, §36 input states, §6.7.5 timer, §6.7.8 timeout).
- **Risk:** a §1.1 list that names `<keyboard>` then never returns to it reads as a tease.
- **Resolution path:** name the full list as "state-object openers" with a one-line gloss per opener and a clear note: "Each opener is introduced where it is used; some are advanced and live in Layer 4 or in `SPEC.md` until a later tutorial pass adds dedicated sections." The audit's Pass 3/Pass 4 add dedicated sections for several of these.
- **Needs:** [no flag — wording choice] — Pass 2 should list all 11 openers but explicitly mark which are taught in this tutorial vs. which are SPEC-only-for-now. **[INFERRED]**

### FLAG-05: Audit Top-5 #2 (`@@user` ghost) was reframed in Pass 1, not deleted

- **Pass 1 commit `9873e0e`:** "§3.4 @@user ghost paragraph reframed (points at SPEC §40 + loginRedirect)."
- **Tutorial §3.4 line 1170 today:** "details of how the authenticated session is exposed to your code ... are covered in `SPEC.md` §40."
- **Pass 2 does not touch §3.4.** Just noting it landed in Pass 1.
- **Needs:** [no flag — landed].

---

## 6. Estimated Effort

The audit's total estimate was ~30h across Passes 1–5; ~7 work-blocks. **Pass 2 is one work-block (3h).**

### Slice into subgroups

| Subgroup | Items | Effort | Notes |
|---|---|---|---|
| **A — new §1.8 + 01h snippet** | E2-03, E2-04, E2-12 | 1.5h | Most of Pass 2's complexity. ~80 lines of new prose modeled on SPEC §17.1.1 examples (which are well-shaped). One new ~25-line snippet. Compile-test it. |
| **B — §2.5 trim + §1.1 state-opener list + glossary update + 02e snippet trim** | E2-01, E2-02, E2-05, E2-06, E2-07, E2-08, E2-09, E2-11, E2-13 | 1h | Mechanical edits + one paragraph rewrite at §1.1 (the state-opener list). Snippet 02e edits are minor. |
| **C — optional 01a header polish** | E2-14 | 0.25h | Cosmetic; defer to Pass 5 if rushing. |
| **Verification** | (compile new + edited snippets, search for broken anchors) | 0.25h | `bun compiler/bin/scrml.js compile` on 01h, 02e. Grep for `Section 2.5` in any external linked artifact. |
| **Total Pass 2** | | **~3h (matches audit estimate)** | |

The audit's "1 work-block (3h)" estimate matches the bottom-up slice. No surprise scope.

---

## 7. Open Dependencies

Pass 2 has **one soft dependency** (FLAG-01) and no hard blockers.

### Soft dependency: Phase 2 codegen flip

- **Status:** Phase 2a committed (`90f8d16`); Phase 2b deferred (`e62a11f`); Phase 2c–2h not started.
- **Effect on Pass 2:** if Pass 2 §1.8 prose uses observable-behavior wording (per FLAG-01 resolution path), Pass 2 can land BEFORE Phase 2c without lying. If Pass 2 §1.8 commits to "removes from DOM" wording, Pass 2 should land AFTER Phase 2c so the prose matches impl.
- **Recommendation:** observable-behavior wording. Pass 2 lands now; a one-paragraph prose tightening can ride along with Phase 2c when it lands ("the compiler now removes the element from the DOM rather than toggling display, but the observable behavior is the same as in earlier versions").

### No hard blockers

- Pass 2 does not depend on Pass 3, 4, or 5.
- Pass 2 does not depend on any unmerged spec change.
- Pass 2 does not depend on any compiler change.
- Pass 1 prereqs all confirmed landed in `9873e0e` (verified via `git log` and inspection of live snippets).

### Not blocking but worth noting

- **`master-list.md` and `docs/changelog.md` need S48 refresh** (per hand-off §1, items #1 and #2). Pass 2 should update both with its commit info, but neither is a precondition for Pass 2 itself.
- **`docs/changes/<change-id>/progress.md`** convention from CLAUDE.md applies: if a background agent runs Pass 2, it should write to `docs/changes/tutorial-pass2/progress.md` with WIP commits per subgroup.
- **5 staged dev.to drafts** at `docs/articles/*-devto-2026-04-29.md` are unrelated; do not touch.

---

## 8. Inferred items / open questions

Marked `[INFERRED]` in the body where I made a judgment call:

1. **E2-14 (01a snippet header polish)** — mentioned but optional; defer-able.
2. **E2-Checkpoint amendment** — line 411 mention of §0.1's primitives is technically still correct, but reading the new §1.8 raises whether the Checkpoint should call out `if=` as "the new Layer 1 thing." Optional polish.
3. **FLAG-04 §1.1 list framing** — "name all 11 openers but mark which are taught vs. SPEC-only-for-now." This is my call; the user might prefer a 4-opener list that grows in Pass 3/4 as those sections are added. **Decision wanted.**
4. **Footnote ordering** — line 1640 footnotes section is unchanged by Pass 2; audit Pass 5 covers the lin/`:>` updates. Confirmed Pass 5 territory.
5. **Whether to add a §1.8 _renders_ E-CTRL-00X test** — Pass 2 §1.8 should at least mention E-CTRL-001 / E-CTRL-002 / E-CTRL-003 / E-CTRL-004 / E-CTRL-005 codes inline so readers can recognize them; the audit's footnote-style is "name codes by E-XXX-NNN for adopter friction reduction." **[INFERRED]** Suggest doing this.

---

## 9. Provenance

Files read for this recon:
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/tutorial-freshness-audit-2026-04-29.md` (419 lines, full)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial.md` (1,651 lines, in chunks: 1–500, 500–1300, 1300–1651)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial-snippets/00a-hook-client.scrml` (verifies Pass 1 #9 landed)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial-snippets/01a-program.scrml`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial-snippets/01e-bindings.scrml` (verifies Pass 1 #2 landed)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial-snippets/02e-control-flow.scrml`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial-snippets/02h-presence-checks.scrml`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial-snippets/02j-machine.scrml` (verifies Pass 1 #8 landed)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial-snippets/02k-payload-variants.scrml` (verifies Pass 1 #6 landed)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial-snippets/03e-error-handling.scrml`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/tutorial-snippets/04d-channel.scrml` (verifies Pass 1 #7 landed)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC-INDEX.md` (full)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md` §4.2 (state-object syntax, lines 241–290), §17.1 (`if=`, lines 7352–7365), §17.1.1 (`else`/`else-if=`, lines 7366–7618), §17.2 (`show=`, lines 7621–7633)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/hand-off.md` (S49 open, full)
- `git log --oneline -25`
- `git show --stat 9873e0e` (Pass 1 commit — confirms Track A items landed)
- `grep -n "Section 1\.\|Section 2\.\|§1\.\|§2\." docs/tutorial.md` (cross-ref enumeration)
- `grep -n "if=\|else=\|else-if=\|show=" docs/tutorial.md` (anchor map)

## Tags

#tutorial #pass2 #recon #if-attribute #else-attribute #state-object-opener #layer-1 #ordering-rewrite #scrmlTS #s49 #pre-fix-list #adopter-friction
