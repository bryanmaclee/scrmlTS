# Stage 0b — Dispatch 1 Brief: Foundation Rewrite

**Target agent:** `scrml-dev-pipeline` (T3 tier, worktree-isolated)
**Scope:** Tiers 1-3 of `IMPACT-ASSESSMENT.md` §6 — SPEC.md §1 Overview + §3 Context Model + §6 Reactivity + §11 fold + relevant §34 error codes
**Output:** rewritten SPEC.md sections + updated SPEC-INDEX.md (regenerate via script)
**Authorization:** scoped to this brief; "no holds barred" carries forward from S56 deliberation phase per user re-confirmation.
**Date drafted:** 2026-05-04 (S56)
**Drafted by:** PA (this conversation)

---

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: `<ABSOLUTE-WORKTREE-PATH-FILL-AT-DISPATCH-TIME>`

### Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal the worktree path above. Save the
   output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean (or matches the
   expected pre-snapshot).

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

### Path discipline (enforce on EVERY Read/Write/Edit call)

- For Read: relative paths or paths under WORKTREE_ROOT are safe. Reading
  from main via absolute path will give you the wrong file content (main
  may be AHEAD of your worktree, with parallel-different in-flight work).
- For Write/Edit: ONLY use paths under WORKTREE_ROOT. NEVER use absolute
  paths starting with the main repo root directly — those point to main and
  will leak your work product into main's working tree.
- If an intake doc / hand-off doc / conversation context references a path
  like `/home/bryan-maclee/scrmlMaster/scrmlTS/foo/bar.ts`, translate it to
  `$WORKTREE_ROOT/foo/bar.ts` (or the relative equivalent) before writing.

If you find yourself about to write to a path starting with the main repo
root, STOP. Re-derive the path from WORKTREE_ROOT.

---

## §1 What this dispatch is

This is the FIRST of 4 staged dispatches that rewrite `compiler/SPEC.md` and `compiler/PIPELINE.md` to reflect the v0.next deliberation arc (S52-S56). This dispatch covers the FOUNDATION layer — the sections that name pillars and define the access model the rest of the language references.

**You are NOT changing compiler source code.** The compiler will fail many tests after the spec rewrite — that is EXPECTED. Subsequent dispatches (Phase A1-A5 in the implementation roadmap) will bring the compiler into compliance with the new spec. Your job is to PRODUCE THE SPEC ENGINEERING TARGET, not to maintain test parity.

### Sources you must read in full before any edit

These are LOAD-BEARING for the rewrite. Do not skim. Read in this order:

1. `docs/changes/v0next-spec-impact/IMPACT-ASSESSMENT.md` — your master plan. §2 disposition table covers your scope (rows for §1, §3, §6, §11, §34 partial). §6 ordering rules. §7 open questions (resolve during rewrite).
2. `../scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md` — locks L1-L20 with full §3.x detail. The decisions you're encoding into spec.
3. `../scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md` — moves M1-M20 (M7+M21 dropped). Companion to L1-L20.
4. `../scrml-support/docs/deep-dives/state-as-primitive-redesign-synthesis-2026-05-03.md` — narrative context for the moves.
5. `docs/articles/llm-kickstarter-v2-2026-05-04.md` — the LOCKED kickstarter that an LLM uses to write v0.next scrml. Your spec rewrite must NOT contradict the kickstarter. If you find a contradiction, the kickstarter is the authoritative tiebreaker (it's user-ratified at S56) — surface the contradiction and align the spec to match. Cross-reference §3, §3.1, §6 (validators), §11 recipes when shaping §6 of SPEC.
6. `compiler/SPEC.md` — the current spec. Your starting point.
7. `compiler/SPEC-INDEX.md` — the section table-of-contents.
8. `pa.md` (project root) — for repo conventions, link/tag conventions, what NOT to do.

### Anti-patterns brief (mandatory)

You will be writing SPEC text, not scrml code. But you will REFERENCE scrml code in examples. Read these BEFORE writing any code examples in the spec rewrite:

- `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — the canonical anti-patterns table. The rewrite must NOT introduce React/Vue/JSX-style code in scrml examples.
- `docs/articles/llm-kickstarter-v2-2026-05-04.md` — particularly §7 anti-pattern table — your scrml code examples must match these idioms.

---

## §2 Crash recovery directives (PERMANENT — pa.md global rules)

This is a long dispatch. Crashes happen. Make partial progress recoverable.

1. **Commit after each meaningful change** — don't batch commits. After each subsection rewritten or each error-code added, commit with a short WIP message: `WIP: §6.3 Variant C compound state` or `WIP: add E-DERIVED-WRITE error code`.
2. **Update progress.md after each step** — append-only, timestamped. Path: `docs/changes/v0next-spec-impact/progress-dispatch-1.md`. Format:
   ```
   ## YYYY-MM-DD HH:MM — <short summary>

   Just done: <what>
   Next: <what>
   Blockers: <any>
   ```
3. **WIP commits are EXPECTED.** Final cleanup commit can squash if desired, but never delay committing to wait for a "clean" state.
4. **If you crash, your commits + progress.md are how the next agent picks up.** Write them defensively.

---

## §3 Scope — what to do, in order

### §3.1 Tier 1 — §1 Overview (SMALL EDIT, but foundational)

Read current §1 (lines 106-125 per SPEC-INDEX). It's currently 20 lines covering "Design principles, Bun runtime."

**Add three NEW subsections after the existing §1 content:**

#### §1.4 Markup-as-first-class-value (pillar)

Statement: scrml treats markup as a first-class value type. Markup elements may sit anywhere expressions sit — passed as function arguments, stored in reactive state cells, returned from functions, on the right-hand side of `=` declarations.

Cite: held since the scrml8 era; explicitly pinned in S56 deliberations (cross-ref `scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md` §1).

Touchpoints (cross-ref): §3 (context model — markup-as-value rules per locus), §6 (markup-typed cells, decl-coupled-with-render-spec), §7 (markup-as-expression in logic contexts), §10 (lift), §15 (components-as-markup-values), §50 (assignment-as-expression).

#### §1.5 The north star + Tier 0/1/2 ladder

Statement: The UI of a scrml application SHOULD be a fully-handled state machine (engine, in scrml's vocabulary). The structural shape of the UI tree IS the structural shape of the application's state.

Process clause: apps don't START at the north star; they EVOLVE toward it. Booleans-as-lifecycle in early sketch code are not violations; they're in-progress pins. The compiler nudges via lints (W-LIFECYCLE-CANDIDATE) but does not enforce.

The Tier 0/1/2 commitment ladder for case analysis on enums:
- **Tier 0** — `if=` chains / `${ if (...) lift ... }` blocks (prototype, no exhaustiveness check). Cross-ref §17.
- **Tier 1** — `<match for=Type [on=expr]>` block (structural exhaustiveness, no transition enforcement; rules legal but inert). Cross-ref §18.
- **Tier 2** — `<engine for=Type initial=...>` (full deal: exhaustiveness + active rules + transition handlers). Cross-ref §51.

Promotion is mechanical/additive — state-children carry forward verbatim; the wrapper swap is the commitment moment.

#### §1.6 V5-strict access model (the access principle)

Statement: scrml has TWO access forms for reactive state cells:
- **Structural form `<varname>`** — declaration site, render-by-tag in markup, engine state-child tags
- **Canonical expression access `@varname`** — reads, writes, compound assignments

Bare names in expressions are LOCAL identifiers only. They do NOT resolve to reactive state. Local names cannot shadow registered state names (E-NAME-COLLIDES-STATE).

Cross-ref §6 for full treatment.

**Implementation notes for this rewrite:**
- Existing §1 design-principle bullets stay if they're still true; remove or update any that contradict the post-S56 framing (e.g., if any existing bullet calls `@` a "concession," correct that — `@` is canonical, NOT concession).
- Each new subsection should be 15-30 lines: claim, sentence on rationale, cross-ref bullets. Not a treatise — just the named principle that downstream sections reference.

### §3.2 Tier 2 — §3 Context Model (SMALL EDIT)

Read current §3 (lines 167-206 per SPEC-INDEX). 40 lines covering "Contexts, stack rules, coercion."

**Add a new subsection at the end of §3:**

#### §3.X V5-strict access form per context

Per locus rules, derived from §1.6 + §6:

| Context | Decl form | Read form | Write form | Notes |
|---|---|---|---|---|
| Logic (`${...}`) | `<x> = init` | `@x` | `@x = newval` | Bare names = locals; can't shadow state names |
| Markup body | (declarations not allowed here) | `${@x}` interpolation | (writes via event handlers) | `<x/>` render-by-tag if cell has render-spec |
| Attribute value | (declarations not allowed) | `=@x` after `=` (binding); `${@x}` for interpolated string | (writes via event handlers) | Bare strings without `@` = literal values |
| Engine state-child tag | `<Variant ...>` | matched against engine variable | (set via direct write or `.advance()`) | Match-by-name to enum variants |

Cross-refs:
- Full V5-strict treatment: §6
- Markup-as-value pillar: §1.4
- Render-by-tag rules: §6.4 (your new §6 will introduce this)

**Implementation notes:**
- 30-50 lines.
- The table is the load-bearing artifact; surrounding paragraph just frames it.
- Existing §3 content (contexts, stack rules, coercion) stays intact.

### §3.3 Tier 3a — §6 Reactivity MAJOR REWRITE

This is the big one. Current §6 is 2,812 lines (lines 1375-4186). Target: 3,500-4,500 lines.

**Title change:** rename from "Reactivity — The `@` Sigil" to "Reactivity and the V5-Strict Access Model" (or similar — pick a tight phrase). The renaming reflects the framing shift; `@` is no longer THE sigil under naming, it's HALF of the V5-strict pair.

**Proposed new structure:**

| Subsection | Disposition | Estimated lines |
|---|---|---|
| §6.1 V5-strict access — the two forms | NEW | 60-90 |
| §6.2 Three RHS shapes for state declarations | NEW | 100-150 |
| §6.3 Compound state — Variant C | NEW | 120-180 |
| §6.4 Render-by-tag semantics | NEW | 80-120 |
| §6.5 Reactive arrays | PRESERVE existing | (existing) |
| §6.6 Derived values — `const @x` and `const <x>` (in-compound) | PARTIAL REWRITE | 200-300 |
| §6.7 Lifecycle / cleanup / `<timeout>` etc. | PRESERVE existing | (existing) |
| §6.8 The `default=` attribute and `reset(@cell)` keyword | NEW | 150-220 |
| §6.9 Hoisting model | NEW | 100-150 |
| §6.10 The `pinned` keyword | NEW | 80-120 |
| §6.11 Auto-synthesized validity surface (cross-ref §55) | NEW (stub + cross-ref) | 30-50 |
| §6.12 Migration / inheritance from §11 (formerly State Objects) | NEW (folded content) | 80-150 |

#### §6.1 V5-strict access — the two forms

Cover:
- The structural form `<varname>` — declaration, render-by-tag, engine state-child
- The canonical form `@varname` — reads, writes, compound assignments
- Bare names = LOCALS only
- E-NAME-COLLIDES-STATE: local cannot shadow registered state name (cite §34)
- Why two forms (load-bearing rationale): every state touch is visually distinguishable; prover and reader can see where state is in play; supports the exhaustiveness goal (north star §1.5)
- Cross-ref §1.6 (the principle), §3 (per-context rules)

#### §6.2 Three RHS shapes for state declarations

Cover the three shapes from kickstarter v2 §3.1:

**Shape 1 — plain reactive cell.** RHS is a literal or expression value.
```scrml
<count> = 0
<name>  = ""
<items> = []
```
No render-spec; no render-by-tag. Display via `${@x}` interpolation only.

**Shape 2 — decl-coupled-with-render-spec.** RHS is bindable markup.
```scrml
<userName req length(>=2)> = <input type="text"/>
<agree    req>             = <input type="checkbox"/>
```
Render-by-tag `<userName/>` in markup expands to the bound input element with appropriate `bind:value` / `bind:checked` dispatch (see §5 attribute quoting + §17 / forthcoming §55 validators). Validators sit as bare attributes on the decl. Markup-as-value pillar in motion (§1.4).

**Shape 3 — derived (read-only).** RHS is an expression that recomputes.
```scrml
const @doubled    = @count * 2
const @greeting   = "Hello, " + @userName
const @badge      = <span class="badge">${@userName}</span>     // markup-typed derived
```
No render-spec; `<derivedName/>` in markup is E-CELL-NO-RENDER-SPEC (cite §34). Markup-typed derived cells ARE legal under L1 — the derived "value" IS markup, recomputes reactively when dependencies change.

**Optional `default=` attribute** — any state cell may declare an explicit default used by `reset(@cell)`:
```scrml
<startTime default=null> = Date.now()
```
Cross-ref §6.8.

#### §6.3 Compound state — Variant C

Cover:
- Tier 1 single-value: `<count> = 0` (degenerate)
- Tier 2 ad-hoc compound — Variant C structural-children:
  ```scrml
  <formRes>
    <name>  = ""
    <email> = ""
    <error> = ""
  </>
  ```
- Field access via canonical dot navigation: `@formRes.name`, `@formRes.error`
- Tier 3 predefined-shape compound — positional sugar legal:
  ```scrml
  type UserInfo:struct = { name: string, age: number, active: boolean }
  <userInfo>: UserInfo = ("alice", 30, true)
  ```
- Tier 4 engine-typed state — positional sugar via the engine's known shape (cross-ref §51)

**Tier ladder rule:** positional binding (`<x> = (a, b, c)`) is legal ONLY when the structure of `x` is fixed by a predefined type. Ad-hoc compound state must use the structural-children form.

**Cross-cell field access composes with V5-strict:** `<formRes><name/></>` is structural rendering (engine state-child shape elsewhere); `@formRes.name` is canonical expression access; `formRes.name` (no `@`) is local identifier lookup which fails because there's no local `formRes`.

#### §6.4 Render-by-tag semantics

When does `<varname/>` in markup work?
- If the cell has a render-spec (Shape 2 from §6.2), it expands to that render-spec with binding wired up (via §5 dispatch table)
- If the cell has no render-spec (Shape 1 plain or Shape 3 derived), `<varname/>` is `E-CELL-NO-RENDER-SPEC` (cite §34)
- For Shape 3 markup-typed derived cells (`const @badge = <span>...`), `<badge/>` invokes the markup expression at read time — the markup IS the cell's value

Multi-render contexts: there's NO override syntax for the render-spec. If a developer wants alternate renderings:
- Use `${@x}` interpolation for bare-value text rendering
- Use a component that takes the value as a prop: `<MyDisplay value=@x/>`
- Declare a second `const <derived>` cell with a different render-form

Cross-ref §1.4 (markup-as-value), §16 (multi-render via component slots).

#### §6.5 (PRESERVE existing) Reactive arrays

Lines ~1489-1901 in current §6. Arrays + array mutation. **Keep verbatim** unless you find content that contradicts the new framing — in which case surface the contradiction in your progress.md and propose specific edits.

#### §6.6 Derived values — `const @x` and `const <x>` (in-compound)

Cover:
- Top-level `const @derived = expr` — existing form, preserve semantics
- In-compound `const <derived> = expr` — NEW, locked at S56 L15
  ```scrml
  <signup>
    <name req>  = <input type="text"/>
    <email req> = <input type="email"/>
    const <displayName> = @signup.name.toUpperCase()
  </>
  ```
- Read at `@signup.displayName`. Writes are E-DERIVED-WRITE (cite §34).
- Markup-typed derived cells (per §6.2 Shape 3 / L1):
  ```scrml
  const <badge> = <span class="badge">${@signup.name}</span>
  ```
  `<badge/>` in markup invokes the markup expression at read time; recomputes reactively.
- Auto-recomputation — when ANY referenced cell changes, the derived recomputes.
- Cross-ref §31 dependency graph for the recomputation order.

#### §6.7 (PRESERVE existing) Lifecycle / cleanup / `<timeout>`

Existing content. Preserve.

#### §6.8 The `default=` attribute and `reset(@cell)` keyword

Cover:
- `default=` is an OPTIONAL attribute on any state-cell declaration
  ```scrml
  <startTime default=null>          = Date.now()
  <retries   default=0>             = nextRetryCount()
  <token     default=null>          = generateUUID()
  ```
- `default=` accepts arbitrary expressions including cross-cell references (Edge V1 from L18)
- `reset(@cell)` is a LANGUAGE KEYWORD (not stdlib import)
- Mutates the cell in place; no return value
- Per-cell semantics:
  1. If `default=` is present, evaluate that expression at reset time and write the result
  2. Else, re-evaluate the init expression at reset time and write the result
- Per-field reset on compound: `reset(@signup.name)` — same rule applied to the field
- Compound reset: `reset(@signup)` — applies the same rule to every field
- `reset` is a RESERVED IDENTIFIER (E-RESERVED-IDENTIFIER, cite §34) — local `function reset() {...}` is forbidden
- Explicit cell argument REQUIRED — `reset()` with no arg is `E-RESET-NO-ARG` (cite §34)

#### §6.9 Hoisting model

Cover:
- State declarations hoist to their nearest enclosing structural scope: file, `<program>` body, engine body, channel body, schema body
- Reads inside that scope can refer to declarations regardless of source order
- Cross-scope reads still require explicit imports
- TDZ-1 model: compiler topologically sorts initialization so all state declarations in a scope initialize before any reactive read or render in that scope can fire
- There is no user-visible TDZ window; reads are guaranteed safe at point-of-evaluation

#### §6.10 The `pinned` keyword

Cover:
- Per-declaration attribute (S55 Move 11) that opts OUT of hoisting
- Forward read of a `pinned` declaration: E-STATE-PINNED-FORWARD-REF (cite §34)
- On engines: `pinned` covers BOTH the engine identifier AND the auto-declared variable (cross-ref §51)
- On imports: `import { MarioMachine pinned } from './engines.scrml'` (cross-ref §21)
- Lint policy framing (durable from S55): "lint rules teach people the scrml way; turning them off is the developer's prerogative." `pinned` is the per-decl-explicit form for "force the lint to error on me."

#### §6.11 Auto-synthesized validity surface (cross-ref §55)

Brief stub:
- When a compound state declaration contains any field with validators (`req`, `length`, `pattern`, etc.), the compiler auto-synthesizes a reactive validity surface accessible at TWO levels — compound rollup and per-field — both reactive and read-only.
- Full treatment: §55 (NEW section, future dispatch).
- Mention `@x.isValid`, `@x.errors`, `@x.touched`, `@x.submitted` as the synthesized properties.
- Note E-SYNTHESIZED-WRITE for write attempts (cite §34).

Length: 30-50 lines; this is a stub pointing forward.

#### §6.12 Migration / inheritance from §11 (folded content)

This subsection captures content folded from old §11 (State Objects and `protect=`). See §3.4 of this brief for the fold protocol.

### §3.4 Tier 3b — §11 fold

Read current §11 (lines 5330-5473 per SPEC-INDEX). 144 lines covering "State declaration, schema reading, protect types, authority relationship."

**Fold decision protocol:**

1. **Audit §11 content** in detail. Identify each subsection / paragraph.
2. **Categorize each piece into ONE of:**
   - (a) **Subsumed by §6 V5-strict** — folds into §6.1, §6.2, §6.3 (basic state declaration). These pieces get DELETED from §11.
   - (b) **Distinct from §6 — preserves into §6.12** — content that doesn't naturally fit §6.1-§6.10 but is state-cell-related (e.g., `protect=` attribute semantics on state cells). Move into §6.12 with appropriate framing.
   - (c) **Belongs to §52 (State Authority Declarations)** — the schema-reading + authority-relationship content. Move into §52 (cross-repo cross-ref noted; §52 itself is in a later dispatch).
3. **At end:** §11 should be either:
   - DELETED entirely, OR
   - Reduced to a brief stub: `## §11 (Reserved — content folded into §6 and §52)` with cross-refs

**Specific known content categorizations (from PA preliminary read):**

- "State declaration" → (a) folds into §6.1-§6.3
- "Schema reading" → (c) belongs in §52 (or possibly the future §39 schema content; verify during fold)
- "Protect types" → (b) preserves into §6.12 if it's about cell decls; (c) if it's about server/client authority
- "Authority relationship" → (c) belongs in §52

**Output:** §11 either deleted (preferred) or stubbed; content distributed; cross-references throughout the spec updated to point to new homes.

**Cross-reference sweep:** after the fold, grep SPEC.md for "§11" references and rewrite them to point to the new location. Critical to do this thoroughly — broken cross-refs are a documentation regression.

### §3.5 Tier 3c — §34 partial: error codes for this dispatch

Read current §34 (lines 12120-12324 per SPEC-INDEX). Add the following error codes:

- **E-NAME-COLLIDES-STATE** (compile error) — local identifier shadows a registered state name. Triggered by `<count> = 0; ... let count = 5;` patterns. Reference §6.1.
- **E-DERIVED-WRITE** (compile error) — write to a `const`-derived cell. Triggered by `@displayName = "x"` when `displayName` was declared `const`. Reference §6.6.
- **E-STATE-PINNED-FORWARD-REF** (compile error) — read of a `pinned` declaration before its declaration site. Reference §6.10.
- **E-CELL-NO-RENDER-SPEC** (compile error) — `<varname/>` in markup when the cell has no render-spec (Shape 1 plain or Shape 3 non-markup-derived). Reference §6.4.
- **E-CELL-RENDER-SPEC-NOT-BINDABLE** (compile error) — Shape 2 declaration where the RHS markup is non-input (e.g., `<x req> = <div class="status"/>`). Writable cells require bindable render-specs. Use Shape 3 (`const <derived>`) for display-only. Reference §6.2 / §6.4.
- **E-RESERVED-IDENTIFIER** (compile error) — local identifier shadows a reserved language keyword. Specific case: `function reset() {...}` shadows the `reset` keyword. Reference §6.8.
- **E-SYNTHESIZED-WRITE** (compile error) — assignment to an auto-synthesized property (e.g., `@signup.isValid = false`). Synthesized properties are read-only. Reference §55 (future dispatch) but cite §6.11.
- **E-RESET-NO-ARG** (compile error) — `reset()` called with no argument. Explicit cell argument required. Reference §6.8.
- **W-LIFECYCLE-CANDIDATE** (warning, lint) — a `<program>` body or function body has more than 2 reactive booleans gating the same UI. Suggest promotion to engine. Reference §1.5.

For each: add an entry following the existing §34 format (error code, severity, description, example trigger, fix recommendation).

---

## §4 Cross-cutting work

### §4.1 SPEC-INDEX.md regeneration

After all the above:
1. Run `bash scripts/update-spec-index.sh` (per pa.md / SPEC-INDEX header)
2. Verify line numbers align with the rewritten sections
3. Add new Quick Lookup entries under "Topic → Section":
   - "V5-strict access" → §6.1
   - "three RHS shapes" → §6.2
   - "Variant C compound state" → §6.3
   - "render-by-tag" → §6.4
   - "default= attribute" → §6.8
   - "reset keyword" → §6.8
   - "hoisting" → §6.9
   - "pinned" → §6.10
   - "validity surface (auto-synthesized)" → §6.11 + §55
   - "markup-as-value pillar" → §1.4
   - "north star + Tier ladder" → §1.5
4. Update existing entries that reference §11 to point to §6.

### §4.2 Cross-reference sweep

Before declaring done, grep SPEC.md for:
- `§11` — should be 0 references except for the stubbed section itself
- `§6.X` — verify all subsection references resolve
- "@ Sigil" or "@ as concession" or similar deprecated framings — update to V5-strict / canonical

---

## §5 What you do NOT do in this dispatch

- **DO NOT** rewrite §51 (engines), §18 (match), §38 (channels), §53 (predicates), §39 (schema), or §55 NEW (validators). Those are future dispatches.
- **DO NOT** modify compiler source code (`compiler/src/`). The compiler will fail many tests after this dispatch — that is EXPECTED.
- **DO NOT** modify tests. Test breakage from spec drift is expected. The dispatch's success metric is spec quality, not test parity.
- **DO NOT** modify kickstarter v2. It's the user-ratified anchor; align spec to kickstarter, not the other way.
- **DO NOT** modify `pa.md`, `master-list.md`, `hand-off.md`. PA-only files.

---

## §6 Success criteria

The dispatch is DONE when:

1. **§1 has §1.4, §1.5, §1.6 added.** Existing §1 content preserved or updated as required.
2. **§3 has the V5-strict-per-context table added.** Existing content preserved.
3. **§6 has the new structure:** §6.1-§6.4 NEW, §6.5 PRESERVED, §6.6 PARTIAL REWRITE, §6.7 PRESERVED, §6.8-§6.12 NEW. Title updated. Renaming applied.
4. **§11 is FOLDED.** Either deleted entirely or reduced to a stub with cross-refs. Original content distributed to §6 + §52 (or §6.12 + future §52 dispatch flag).
5. **§34 has 9 new error codes added** in the existing §34 format.
6. **SPEC-INDEX.md regenerated** + new Quick Lookup entries added + §11 references updated.
7. **Cross-reference sweep complete.** No dangling `§11` refs; no deprecated framings (`@` concession etc.).
8. **Each subsection committed independently** per crash-recovery directive. Progress.md captures the timeline.
9. **Final commit message:** "spec(dispatch-1): foundation rewrite — §1 pillars, §3 contexts, §6 V5-strict, §11 fold, §34 +9 codes" or similar.

The dispatch is NOT required to make `bun test` pass. Test breakage from spec changes is expected and will be addressed in Phase A1+ implementation dispatches.

---

## §7 Open questions you may need to resolve

These are listed in IMPACT-ASSESSMENT.md §7. The ones most likely to affect THIS dispatch:

### §7.1 §11 fold decision

You will resolve this in §3.4 above. Document your fold decisions in progress.md so the next dispatch's PA can verify.

### §7.10 The `<channel>` body under V5-strict

If you encounter §38 references in §6 or §11 (channels declaring state), note them but do NOT rewrite §38 — that's Dispatch 3. Just ensure cross-refs from §6 point forward correctly.

### §7.4 `<errors of=expr/>` body override syntax

You will reference §55 in §6.11. The body override syntax is locked but §55 hasn't been written yet. Use a forward cross-ref ("see §55 (forthcoming)") in your §6.11 stub.

---

## §8 Estimated wall-time

- §1 Overview additions: 1-2 hours
- §3 Context Model addition: 30-60 min
- §6 Reactivity rewrite: 8-16 hours (the big one)
- §11 audit + fold: 2-4 hours
- §34 error code additions: 1-2 hours
- SPEC-INDEX regen + cross-ref sweep: 1-2 hours

**Total: 14-27 hours of focused dispatch work.** Plan accordingly. Make commits and progress.md updates frequent.

---

## §9 Dispatch authorization

- **Worktree-isolated** per pa.md F4 path discipline.
- **Pre-commit hook** must NOT be bypassed without explicit authorization. If the hook fails on intermediate WIP commits, fix the underlying issue (most likely: lint or markdown linting on the spec file) rather than `--no-verify`.
- **No destructive operations without prompting** per S56 user directive ("I am terrified of agents autonomously deleting things"). Rejected destructive ops include: `rm`, `git reset --hard`, force-push, deletion of files outside this dispatch's scope. The §11 fold permits DELETION of §11 content within SPEC.md (that's the explicit scope of the fold), but not deletion of files in the repository.

---

## §10 Cross-references

- **Master plan:** `docs/changes/v0next-spec-impact/IMPACT-ASSESSMENT.md`
- **S56 outcomes ledger:** `../scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md`
- **S55 outcomes ledger:** `../scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md`
- **S54 synthesis:** `../scrml-support/docs/deep-dives/state-as-primitive-redesign-synthesis-2026-05-03.md`
- **Kickstarter v2 (locked anchor):** `docs/articles/llm-kickstarter-v2-2026-05-04.md`
- **Anti-patterns brief:** `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- **User-voice S55 + S56:** `../scrml-support/user-voice-scrmlTS.md`
- **Repo PA directives:** `pa.md`
- **Worktree path discipline source:** `pa.md` §"Worktree-isolation: startup verification + path discipline (S42 finding F4)"
- **Progress.md target:** `docs/changes/v0next-spec-impact/progress-dispatch-1.md`

---

## §11 Tags

#stage-0b #dispatch-1 #foundation-rewrite #spec-major #§1-pillars #§3-context #§6-V5-strict-major-rewrite #§11-fold #§34-error-codes #scrml-dev-pipeline-T3 #worktree-isolated
