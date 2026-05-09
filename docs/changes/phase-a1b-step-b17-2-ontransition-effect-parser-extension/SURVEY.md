# SURVEY — B17.2 parser-extension for `<onTransition>` + `effect=`

**Dispatched:** 2026-05-09 (S74)
**Worktree:** `.claude/worktrees/agent-a940a102a633659e9`
**Authority:** SPEC §51.0.H (lines 20536-20585), §51.0.I (lines 20587-20605), kickstarter
v2 §4.4 (lines 331-362). PA Rule 4: spec wins.

## Three documented decisions

### Decision 1 — `if=` delimiter shape (paren-form vs `${...}` form)

**SPEC observation.** §51.0.H formal table (line 20570) describes `if=expr` (no
delimiter shown). The canonical worked example (line 20558) uses paren-form:

```scrml
<onTransition to=.Small if=(@gameOver == false)>${ log("regression") }</>
```

Kickstarter v2 §4.4 line 347 mirrors paren-form:

```scrml
<onTransition to=.Small if=(@gameOver == false)>${ log("regression") }</>
```

**Decision.** Parser captures `if=` value verbatim using the SAME greedy-stop
pattern used today for `rule=` / `after=` / `to=` (stop at next bareword
`<ident>=` OR self-close `/` OR end-of-string). This naturally accepts:

- `if=(@gameOver == false)` — paren-form (canonical)
- `if=${expr}` — logic-context form (B17.3 typer can normalise if encountered)
- `if=expr` — bare expression (rare; captured verbatim for typer)

The captured `ifExprRaw` retains the surrounding parens (or `${...}` wrapper)
verbatim so downstream typer / codegen can re-parse uniformly. No delimiter-
specific normalisation in the parser. **B17.3 typer (or downstream codegen)
unwraps as needed.**

### Decision 2 — Self-closing `<onTransition/>` legality

**SPEC observation.** SPEC §51.0.H lines 20552-20561 show `<onTransition>` only
in bare-body form `<onTransition to=.X>${...}</>`. SPEC line 20626 shows ONE
example of self-closing: `<onTransition from=.AtRisk effect=showDangerOverlay()/>`
(in §51.0.J derived-engine example) — but that uses an `effect=` ATTRIBUTE on
`<onTransition>` itself, NOT in the formal §51.0.H table.

**Decision.** Capture-with-empty-body. Self-closing `<onTransition to=.X/>` is
captured as a valid `OnTransitionEntry` with `bodyRaw: ""` and
`isColonShorthand: false`. Rationale:

- Mirrors A5-2's `<onTimeout/>` precedent (always self-closing per spec, captured
  cleanly).
- Defensive — if user authors a no-body handler (e.g., a placeholder) the parser
  doesn't lose the structural fact that an `<onTransition>` was declared.
- Typer (B17.3) is the right place to enforce semantic legality (an
  `<onTransition>` with no body is arguably useless but not necessarily a
  parser-level error).

The `effect=` attribute on `<onTransition>` itself (the §51.0.J derived-engine
example shorthand) is NOT captured by B17.2 — the formal §51.0.H attribute
table (lines 20563-20570) lists ONLY `to/from/once/if=`. If §51.0.J wants
`effect=` on `<onTransition>`, that surface is a separate spec disambiguation
concern (flag in HANDOFF for PA).

### Decision 3 — Malformed-attribute fallback

**SPEC observation.** §51.0.H names `<onTransition>` requires "one of {to, from}"
implicitly (the table lists both as alternative source attributes). No formal
error code is named for the absent-both case at parser layer; semantic enforcement
is typer territory.

**Decision.** Capture-with-null. An `<onTransition>` opener with neither `to=`
nor `from=` IS captured into `onTransitionElements` with both fields `null`.
Rationale:

- Mirrors A5-2 precedent — `OnTimeoutEntry` captures empty `to: ""` for malformed
  cases rather than skipping (`engine-statechild-parser.ts:265-275`); A5-3 typer
  surfaces the diagnostic on the captured-but-empty entry.
- Typer (B17.3) is the right place to fire `E-ONTRANSITION-MISSING-DIRECTION` (or
  similar code, naming TBD). Capturing the entry preserves span info for the
  diagnostic.
- For `if=` malformed (unbalanced parens / unclosed `${`), capture the partial
  text verbatim into `ifExprRaw`; typer flags shape mismatch.
- For `effect=` on state-child opener with unbalanced `${...}` braces, capture
  whatever the bracket-balanced scan returns; if scan exhausts source, set
  `effectRaw: null` and let typer infer parse-error from the absence of a closer
  in the broader source. (Same pattern as `rule=` extraction today —
  `engine-statechild-parser.ts:662-674` uses regex with greedy-stop, which
  similarly captures partial text.)

## Spec verification (PA Rule 4)

Quoted SPEC §51.0.H normative form (line 20563-20570):

| Attribute | Meaning |
|---|---|
| `to=.Variant` | Target — fires when leaving this from-state TOWARD `.Variant`. |
| `from=.Variant` | Source — placed in TARGET state-child to fire on incoming transitions FROM `.Variant`. Inverts directionality. |
| `once` | Bare attribute — handler runs at most ONCE for the engine's lifetime, then is dropped. |
| `if=expr` | Conditional gating — handler fires only when `expr` evaluates true at transition time. |

Quoted SPEC §51.0.I (line 20592-20598) — three legitimate body forms:

| Form | Job |
|---|---|
| `<Variant/>` | Self-closing. No body. State-child declares transitions only. |
| `<Variant>...</>` | Bare body. Markup body — text, `${}` interpolation, nested tags, child elements. |
| `<Variant> : expr` | Single-expression body shorthand. `expr` becomes the body. |

**Note on `:`-shorthand for `<onTransition>`:** SPEC §51.0.I describes the
shorthand for state-children (`<Variant>`). §51.0.H does NOT explicitly extend
it to `<onTransition>`. Kickstarter v2 §4.4 line 342-343 says: *"Note: when </>
closer is present, :-shorthand is unavailable. Use bare-body form (text or markup
directly between opener and </>)."*

**Decision (sub-3a):** B17.2 parser SUPPORTS `:`-shorthand on `<onTransition>`
defensively (the same opener-followed-by-colon scan used for state-children).
Per §51.0.I the shorthand is the universal block-grammar shorthand; structural
elements with optional bodies SHOULD admit it for uniformity. If the typer
(B17.3) decides shorthand is forbidden for `<onTransition>`, it can fire on the
`isColonShorthand: true` case post-capture. Capturing preserves more info than
rejecting.

**Decision (sub-3b):** `<onTransition>` body containing nested `<onTimeout>` —
the body region MUST be added to `skipRegions` of the outer `<onTimeout>` /
`<engine>` body-scan to avoid double-counting. Mirror the existing skipRegions
pattern at `engine-statechild-parser.ts:745-748`.

## Sequencing observation (for PA tracking)

The eventual **codegen C-step** that consumes B17.2's annotations to emit
`effect=` + `<onTransition>` firing SHOULD wait for **B17.3** (typer
`E-ENGINE-EFFECT-AMBIGUOUS` firing) to ship FIRST. Otherwise spec-violating
programs (`effect=` on multi-target `rule=`) compile to potentially-broken JS
without the loud-error guard. PA tracks this as the dependency chain
**B17.2 (parser) → B17.3 (typer diagnostic) → C-step (codegen)**.

## Verdict shape pre-committed

If all interface fields populated correctly and 0 regressions vs baseline:
**SHIP**.

If a parsing-shape decision needs PA arbitration mid-encoding (not anticipated
given the survey above): **SCOPE-CHANGE** with the decision documented for
pre-merge ratification.
