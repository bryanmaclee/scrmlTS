# scrmlTS — Session 31 Wrap

**Date opened:** 2026-04-19
**Date closed:** 2026-04-20 (crossed midnight during the debate arc)
**Previous:** `handOffs/hand-off-31.md` (S30 wrap, rotated in as S31 starting brief)
**Baseline entering S31:** 7,222 pass / 10 skip / 2 fail (26,480 expects / 315 files) at `a6ce8c6`.
**Final at S31 close:** 7,238 pass / 10 skip / 2 fail (26,503 expects / 316 files) at `26df45d`, pushed to origin/main.

---

## 0. Close state

### S31 commits — 2 commits, both pushed to origin/main under one-time push auth

- `ebd4d1d` — `fix(scope/§5.2): F5 — bare ident referencing reactive without @ sigil is now E-SCOPE-001`
- `26df45d` — `fix(cli+docs): F6 init-safety + F10 README bun link step (S31 adopter polish)`

Push range: `a6ce8c6..26df45d`. Clean fast-forward. No external commits mid-session.

### Uncommitted at wrap

- `docs/SEO-LAUNCH.md` — still uncommitted, **9 sessions running**. Untouched for a ninth session. Decide and move on (commit as-is, revert, or archive to scrml-support).

### Incoming

- `handOffs/incoming/` empty (only `read/` archive) at the moment of this write. **When master PA replies with "fn debate experts staged," that confirmation will land here first. See §8 below.**

### Cross-repo

- scrmlTSPub retirement still pending at master since S25.
- **New outgoing message to master at wrap:** `/home/bryan/scrmlMaster/handOffs/incoming/2026-04-20-0030-scrmlTS-to-master-stage-fn-debate-experts.md` — requests forging + staging of 5 debate expert agents. User is holding S31 open until master confirms landing.
- **Design-insights ledger gained a 20th entry:** `/home/bryan/scrmlMaster/scrml-support/design-insights.md` — "Fate of `fn()` and Completeness of State + Machine Subsystems — Rust-Typestate vs Plaid-Typestate-Oriented vs Koka-Algebraic-Effects vs Haskell-Purity-Minimalist — 2026-04-19".

---

## 1. Session theme — "adopter polish + fate-of-`fn` debate"

Two arcs, both opened by the user this session:

1. **Adopter friction (continuation of S30 pivot).** Pick three highest-leverage items from the F1–F13 audit; fix, test, push. F5 was the single critical remaining; F6/F7/F10 were the scaffold/CLI polish batch.
2. **Tangent investigation — comprehensive debate on `fn()`.** User asked whether `fn` is worth keeping, is missing an integrating superpower, and added the explicit second question "are state + machine subsystems complete?" as a falsifier for the first. Debate ran, verdict landed, user elevated the re-run to full fidelity before any amendments land.

The self-host pivot from S30 remains in force — no P3 work this session, no bug (a)/(b)/(c) work.

---

## 2. Session log

### Arc 1 — F5 (missing-`@`-sigil silent break)

**Reproduced three shapes, all silent:**

1. `<p>${count}</p>` when `@count` declared → HTML `<span></span>` (empty), JS emits bare `count;` (undefined at runtime). E-DG-002 unused-var was the only user-visible signal.
2. `<input value=${count}>` → `value` attribute silently dropped entirely (`<input />` in output).
3. `<div class=count>hi</div>` (unquoted attr) → same root cause, same silent compile.

**Root cause:** `reactive-decl` / `reactive-derived-decl` / `reactive-debounced-decl` in `compiler/src/type-system.ts` double-bind into the scope chain:

```
scopeChain.bind("@" + name, { kind: "reactive", ... });  // sigil form
scopeChain.bind(name,       { kind: "reactive", ... });  // bare form — F5 bug
```

Three sites: 3648-3649, 4043-4044, 4280-4281. The bare-form bind means `checkLogicExprIdents` (2849) and `visitAttr` (4438) look up a bare `count`, find the reactive entry, and silently resolve. Codegen then emits `count;` or drops the attribute.

**Fix (surgical, keeps the double-bind so other resolution paths aren't disturbed):**

1. In `checkLogicExprIdents`: after `scopeChain.lookup(base)` succeeds, if `entry.kind === "reactive"` AND the raw ident did NOT start with `@`, emit E-SCOPE-001 with a tailored "bare identifier references the reactive variable `@name` without its `@` sigil — write `@name`" message.
2. In `visitAttr`: same kind-check for `value.kind === "variable-ref"` path. Also **extended** visitAttr to handle `value.kind === "expr"` — attribute interpolation values like `value=${count}` (previously unvisited, which is WHY attr interp was dropping silently).

**Spec:** added normative bullet to §5.2: "A bare identifier in an attribute value or logic expression (`${ }`) whose name matches a declared reactive variable SHALL be a compile error (E-SCOPE-001). Reactive reads require the `@` sigil — `@name` — so the compiler can wire reactivity. The diagnostic SHALL name the reactive variable and point the author at the sigil form."

**Tests:** new file `compiler/tests/unit/gauntlet-s31/missing-sigil-scope.test.js` with 11 tests (6 negative-expected shapes + 5 positive regression guards).

**Suite:** 7222 → 7233 pass (+11), 2 pre-existing fails unchanged, **zero regressions.**

**Commit:** `ebd4d1d`.

### Arc 2 — F6 / F10 scaffold + CLI polish (F7 invalidated)

**F7 dismissed as audit error.** The S30 audit claimed `.gitignore` containing `dist/` would miss `src/dist/`. Verified against git: a bare pattern without leading/middle slash matches at any depth. `git check-ignore -v dist/a.js src/dist/b.js` confirms both are ignored by `dist/` alone. Scaffold was correct; audit was wrong. Noting here so future sessions don't re-open.

**F6 — `scrml init` bare-arg safety.** Before: `scrml init` with no arg silently scaffolded into CWD, scattering `src/app.scrml` + `.gitignore` across whatever project the user happened to be in (audit reporter accidentally scaffolded into scrmlTS itself during the S30 walkthrough). After: `compiler/src/commands/init.js` rejects bare `scrml init` when CWD contains any non-dotfile content, with an explicit message: "`scrml init` requires a target directory. Use `scrml init <name>` for a new subdirectory, or `scrml init .` to scaffold into the current directory." Dotfiles (`.git/`, `.envrc`, etc.) don't trigger the guard, so freshly `git init`-ed dirs still accept bare init. `--help` text updated to show the new explicit form.

**F10 — README `bun link` step.** Before: Quick-start showed `bun install` then `scrml compile …` but `scrml` wasn't on PATH without an unstated `bun link` step. After: Quick-start now walks the adopter-friendly path — `bun install` → `bun link` → `scrml init my-app` → `cd my-app && scrml dev src/app.scrml`. The `init my-app` form also implicitly demonstrates the F6-safe behavior.

**Tests:** `compiler/tests/commands/init.test.js` §8 no-overwrite tests now pass `.` explicitly (they pre-seed the dir and would otherwise trigger F6). Added §11 with 5 new F6 tests (bare-arg rejection, dotfile-only dir success, explicit `.` opt-in, named-subdir safety, bare-arg-in-empty-dir-still-works).

**Suite:** 7233 → 7238 pass (+5), zero regressions.

**Commit:** `26df45d`.

### Arc 3 — one-time push auth

**User:** "push those, one time auth."

Pushed `a6ce8c6..26df45d` to origin/main. Clean FF. Per `feedback_push_protocol`: normal protocol routes pushes through master PA, but user explicitly authorized this push direct. Logging here so the exception is traceable. No NEEDS:PUSH sent to master for these two commits (superseded by user's direct auth).

### Arc 4 — fate-of-`fn` debate

**User's question** (full verbatim preserved in user-voice-scrmlTS.md):
> is fn() worth keeping in the language? in its current form? is it missing some superpower that actually ties it into the state and machine systems?

Plus the critical vocabulary distinction:
- **Life-time** (already covered by `const` / `lin` / reactive lifetimes): how long does a binding exist.
- **Life-cycle** (what `fn` might integrate with): what FORMS can the variable take, AT WHAT TIME. Example: starts as `not`; becomes `number` only where the contract allows; when the contract ends, mutation ends.

This is type-progression / typestate / refinement-progression territory, not lifetime/ownership.

**User's frustration signal:** every concrete use-case they invent for `fn`-with-life-cycle feels contrived. That's the primary design signal the debate was asked to reckon with.

**User-added Q2 on the second prompt:**
> I suppose the question should also be asked, Are the state and machine patterns already complete?

Q2 is the proper falsifier for Q1. If state+machines are complete, the missing superpower can't be in `fn`'s neighborhood and Q1 devolves to "delete or minimize."

**Curator dispatch** with both questions wired in, dependency requirement explicit, 4-6 expert panel from contrasting philosophies, `<Submission>: not → <Draft> → <Validated> → <Submitted>` challenge, ergonomics as primary metric, output to `scrml-support/design-insights.md`.

**Result: inline-mode synthesis, not true 4-expert adversarial debate.** The 4 selected experts (rust-typestate-progression, plaid-typestate-oriented, koka-algebraic-effects, haskell-purity-minimalist) don't exist in `~/.claude/agents/` or `~/.claude/agentStore/`. Curator flagged the limitation explicitly and carried all 4 philosophies inline based on documented prior art. Content is substantive; method is single-agent.

**Inline verdict** (full text in insight 20 at `/home/bryan/scrmlMaster/scrml-support/design-insights.md`):

- **Q2:** state + machines are ~95% complete. The narrow real gap is **positive, local declaration of a state's legal outgoing transitions at the state's point of declaration** — today the legal-edge graph is expressed externally in `<machine>` blocks, forcing transition logic to live at a distance from the state it transitions. Plaid's model diagnoses this most precisely. Other experts' proposed Q2 gaps (Rust phantom parameters, Koka effect rows, Haskell "no gap") don't survive scrutiny.
- **Q1:** MINIMIZE `fn`. Don't delete, don't promote to typestate. The user's hypothesis — "`fn` should become the integrating site for type-progression" — is the right instinct on the wrong tool. Purity IS the precondition for state evolution, but evolution belongs to the **state**, not to the pure function.
- **Meta dependency:** If Q2 were fully complete → delete `fn` (Haskell). If Q2 were incomplete in `fn`'s neighborhood → promote `fn` to typestate (Rust). Actual: narrow gap in *state's* neighborhood → Plaid wins diagnosis, fix goes on state, `fn` stays minimal. Only coherent pairing of Q1 and Q2.

**Spec-amendment delta proposed by the inline verdict** (NOT yet ratified — waiting on the full-fidelity re-run per user's close message):

- §48 (fn): retain E-FN-001..005 (purity) + E-FN-007 + E-FN-009. **Remove E-FN-006**, promote to §state as E-STATE-COMPLETE on every `<State ...>` construction site. Keep 2026-04-08 "any return type" relaxation. Update §48 opening prose: `fn` is a plain pure function, not a "state factory" or a "life-cycle site."
- §state (new): add **E-STATE-COMPLETE** (all fields of a constructed `<State>` must be assigned on every path); add **state-local transition declarations** (Plaid-minimal — `transitionName(...) => <StateNext>` inside a `<State>` decl); add **E-STATE-TRANSITION-ILLEGAL** and **E-STATE-TERMINAL-MUTATION**.
- §51 (machines): clarify that machines and state-local transitions are two views of the same graph (authoritative aggregated view vs distributed view); no new error codes here.
- error-code registry: +3 (E-STATE-COMPLETE, E-STATE-TRANSITION-ILLEGAL, E-STATE-TERMINAL-MUTATION), -1 (E-FN-006 retired).

### Arc 5 — user elevates re-run to full fidelity; staging request to master

**User's close message** (verbatim preserved in user-voice-scrmlTS.md):
> the finding make sense. But <machine>s have emerged as one of the truly differentiating features of the language. Lets make sure even if the same results are found, that the ergonics of the system are as good as they can be. lets have master stage those. I wont exit this session until you confirm they have landed. if there are any more agents that need staged given what we see now, add those to the list. I want a full plan sent to the next pa, not a tiny summary. and keep track of the progress of the original thread of this session. update everything and wrap.

Wrote `needs:action` message to master at `/home/bryan/scrmlMaster/handOffs/incoming/2026-04-20-0030-scrmlTS-to-master-stage-fn-debate-experts.md` with 5 experts and full forge briefs. See §8.

---

## 3. Files changed this session — full list with tier and purpose

| File | Commit | Purpose |
|---|---|---|
| `compiler/src/type-system.ts` | `ebd4d1d` | F5 fix — reactive-shadow detection in `checkLogicExprIdents` + `visitAttr` + attr-value-interpolation walk |
| `compiler/tests/unit/gauntlet-s31/missing-sigil-scope.test.js` | `ebd4d1d` | 11 new F5 tests (new directory for gauntlet-s31) |
| `compiler/SPEC.md` | `ebd4d1d` | §5.2 normative bullet for F5 |
| `compiler/src/commands/init.js` | `26df45d` | F6 — bare-arg rejection in non-empty CWD; null-default parseArgs + dirHasContent helper |
| `compiler/tests/commands/init.test.js` | `26df45d` | §8 updated to pass `.` explicitly; §11 new (5 F6 tests) |
| `README.md` | `26df45d` | F10 — Quick-start rewritten; `bun link` step added; golden path |
| `hand-off.md` | this wrap | S31 full log (you are reading this) |
| `handOffs/hand-off-31.md` | rotated | S30 wrap preserved verbatim |
| `../scrml-support/user-voice-scrmlTS.md` | this wrap | S31 verbatim + agent interpretations |
| `../scrml-support/design-insights.md` | via curator | 20th insight — fn/state/machine debate |
| `../handOffs/incoming/2026-04-20-0030-scrmlTS-to-master-stage-fn-debate-experts.md` | this wrap | needs:action to master |

---

## 4. Adopter-friction audit — updated status

Original audit: `/home/bryan/scrmlMaster/scrml-support/docs/adopter-friction-audit-2026-04-19.md` (13 findings, F1–F13).

- **Critical — fixed:** F1 CSS tokenizer (S30 2eb4513), F2 package bin (S30 8217dd9), F3 lint hidden (S30 f0e7222), F4 Vue/Svelte lint (S30 e8ddc8d), **F5 missing-@-sigil (S31 ebd4d1d)**.
- **Critical — open:** *(none)*.
- **High — fixed:** **F6 bare-init safety (S31 26df45d)**, **F10 README bun link (S31 26df45d)**.
- **High — dismissed (audit error):** **F7 `.gitignore` dist/** — verified via `git check-ignore` that `dist/` matches at any depth including `src/dist/`; scaffold is correct.
- **High — open:** F8 scaffold lacks `package.json` + `README.md`, F9 scaffold lacks inline orientation comments.
- **Medium — open:** F11 ugly relative paths past project root, F12 CSS output no trailing newline.
- **Low — open:** F13 CLI help grammar drift vs README/tutorial.

Remaining for future sessions: F8, F9 (high), F11, F12 (medium), F13 (low). None critical.

---

## 5. Test suite health

- Pre-S31: 7,222 pass / 10 skip / 2 fail (315 files).
- Post-F5: 7,233 pass / 10 skip / 2 fail (316 files). +11 F5 tests, +1 file.
- Post-F6/F10: 7,238 pass / 10 skip / 2 fail (316 files). +5 F6 tests.
- **Close: 7,238 pass / 10 skip / 2 fail (26,503 expects / 316 files). Zero regressions this session.**
- The same 2 pre-existing fails carry through: Bootstrap L3 perf, tab.js-path test. Neither blocks any adopter or self-host path.

---

## 6. Non-compliance from map refresh (carried from S30, still unaddressed)

- `master-list.md` header is now **8 sessions stale** (last updated S23). Needs refresh with S28/S29/S30/S31 commits, F-series tracking, the 20th design-insight, and the S30 public-pivot / deferred self-host note.
- `compiler/SPEC.md.pre-request-patch` — 12,414-line pre-amendment backup still sitting next to SPEC.md. Grep-trap. Deref to `scrml-support/archive/spec-drafts/` or delete. **Note for next PA:** do this before any SPEC.md amendment work per §7 below, so grep hits for E-FN-006 etc. don't surface the stale copy.
- `docs/SEO-LAUNCH.md` uncommitted **9 sessions**. User hasn't mentioned it since S23; at this point recommend asking once and either committing or archiving.
- `benchmarks/fullstack-react/CLAUDE.md` — agent-tooling instructions inside a framework-comparison dir. Out of place. Move to repo root `.claude/` or delete.

---

## 7. User memory touched this session

- **No new memories written.** The S30 `project_public_pivot.md` remains in force (deferred self-host, adopter-friction primary). The S30 `feedback_verify_compilation.md` was honored (I compiled every fix independently before claiming pass).
- **Memories consulted and honored:**
  - `feedback_agent_model` — opus for every agent dispatch (enforced in the curator brief and the master forge briefs).
  - `feedback_persist_plans` — this hand-off is the persist; written at wrap without deferral.
  - `feedback_user_voice` — appended verbatim S31 block to `user-voice-scrmlTS.md`.
  - `feedback_push_protocol` — normally push-through-master; this session's push used one-time user auth which is a documented exception.
  - `feedback_agent_staging` — triggered when the curator couldn't find the 4 experts. Sent to master per protocol, awaiting staging confirmation.
  - `feedback_batch_size` — kept the forge briefs tight; 5 experts instead of the full 8 candidate list.
  - `feedback_language_cohesion` — the fn/state/machine debate explicitly honored this by refusing to debate syntax and debating integrating models instead.
  - `user_truck_driver` — the inline-mode debate was expensive (~100K tokens in the curator alone); the re-run is gated on user's explicit ratification of the re-staging cost.

---

## 8. Next PA job — priority-ordered

### 8.1 FIRST — process master's staging confirmation (unblocked by the time you read this)

**Expected state when you open:**
- `handOffs/incoming/` contains a reply from master: `<YYYY-MM-DD-HHMM>-master-to-scrmlTS-fn-debate-experts-staged.md` (approximate filename).
- `.claude/agents/` contains 5 new files: `rust-typestate-progression-expert.md`, `plaid-typestate-oriented-expert.md`, `koka-algebraic-effects-expert.md`, `haskell-purity-minimalist-expert.md`, `smalltalk-message-state-expert.md`.

**Your job:**
1. Read the master reply. Verify the 5 files landed at the paths master claims.
2. `ls /home/bryan/scrmlMaster/scrmlTS/.claude/agents/` — count should be 36 + 5 = 41 files (or thereabouts; the current 36 may have drifted).
3. Move master's reply to `handOffs/incoming/read/` preserving filename.
4. Report to the user: "5 experts staged — re-debate is go. Launching curator now (or waiting for your green light)."

### 8.2 SECOND — re-run the fn/state/machine debate at full fidelity

**Invoke `debate-curator`** with the brief below and `model: "opus"`. The curator should dispatch each of the 5 experts as a real Agent subagent call, not inline. The debate challenge is the same `<Submission>: not → <Draft> → <Validated> → <Submitted>` scenario.

**Brief template for the curator:**

> Re-run the fate-of-`fn` + state/machine-completeness debate at full adversarial fidelity. The 5 experts are staged in `.claude/agents/`. Invoke each via Agent subagent call (not inline). Shared context: `/home/bryan/scrmlMaster/scrml-support/design-insights.md` insight 20 (inline verdict from S31) + `compiler/SPEC.md` §48 + §51. User priority is ERGONOMICS — any proposal that produces contrived-looking scrml code loses on the primary axis regardless of theoretical elegance. Challenge: `<Submission>: not → <Draft> → <Validated> → <Submitted>`, read-only after submission, must catch (a) reading `.submittedAt` while in `<Draft>`, (b) mutating a `<Submitted>`. Each expert answers Q1 (fn fate), Q2 (state+machine completeness), dependency between them, and proposes scrml syntax + spec-amendment delta. Debate-judge scores; Design Insight appended as insight 21 in `scrml-support/design-insights.md`. Do NOT truncate the ledger.

### 8.3 THIRD — compare full-fidelity verdict against inline verdict from S31

**Expected outcomes:**

- **Convergence (most likely).** Full debate ratifies "minimize `fn`, promote E-FN-006 → E-STATE-COMPLETE, add state-local transitions." Proceed to §8.4.
- **Divergence.** Full debate ratifies a different verdict (e.g., Smalltalk's message-passing model wins on ergonomics over Plaid's transition-method model; or Rust-typestate's phantom-param wins because the re-debate's challenge surfaces a case inline-mode missed). **Do NOT proceed to amendments.** Surface the divergence to the user and get explicit direction. Quote both insights (20 vs 21) side by side.
- **Partial convergence.** Full debate agrees on Q2 (narrow state-local gap) but splits on Q1 (Plaid's methods vs Smalltalk's messages vs "keep fn minimal, add machines-on-state"). Surface to user; likely the user picks the ergonomic winner on the challenge examples.

### 8.4 FOURTH — if verdict ratified, start spec-amendment drafting

**DO NOT start amendment drafting without user's explicit ratification.** Show the user the verdict, show the amendment delta (quoted from the insight), ask "ratify?" and wait.

If ratified:

1. **Deref the stale `compiler/SPEC.md.pre-request-patch` first.** It's a 12K-line grep trap that will pollute any search for E-FN-006 or state-transition text. Move to `scrml-support/archive/spec-drafts/2026-04-pre-request-patch.md` (append a note documenting when and why it was dereffed).
2. **Draft §48 amendment.** Dispatch `scrml-language-spec-author` if available (primary agent?) or write directly per PA code-editing protocol. Changes:
   - Retain E-FN-001 through E-FN-005 unchanged.
   - Remove E-FN-006 from §48; replace with a cross-reference to §state E-STATE-COMPLETE.
   - Retain E-FN-007 (divergent branches) and E-FN-009 (live subscription).
   - Rewrite §48.1 overview: `fn` is a plain pure function primitive. Any reach for `fn` to express life-cycle or state factoring should be read as a signal to look at state or machine.
   - Retain 2026-04-08 "any return type" relaxation unchanged. Add an explicit note: "Return-site completeness (formerly E-FN-006) moved to §state; applies to all state-literal construction sites."
3. **Draft §state amendment** (new subsection, probably §52 or wherever state's canonical spec section is — check SPEC-INDEX.md):
   - E-STATE-COMPLETE: every `<StateName ...>` constructor expression must assign every declared field on every evaluation path. Detection at TS stage.
   - State-local transition declaration grammar: `transition <name>(<params>) => <StateNext> { body }` inside a `<StateName>` declaration. Body is a standard `fn`-style pure expression.
   - E-STATE-TRANSITION-ILLEGAL: calling a transition not declared on the current state.
   - E-STATE-TERMINAL-MUTATION: any write to a field of a state with zero outgoing transitions.
4. **Draft §51 amendment:**
   - Add a subsection explaining machines and state-local transitions are two views of the same graph; the machine's aggregated graph can be derived when all edges appear in state-local declarations.
   - No new error codes; existing E-MACHINE-001 generalizes.
5. **Each draft goes through `scrml-language-design-reviewer` (primary agent) BEFORE ratification.** This is an absolute gate — do not skip per `feedback_push_protocol`-adjacent discipline.
6. **Error-code registry update** (SPEC.md §47.7 or wherever the authoritative registry sits — check SPEC-INDEX.md): +3, -1.
7. **Conformance tests.** For every new normative statement, one test per statement per `scrml-language-conformance-tester` protocol.

### 8.5 FIFTH — back to adopter friction (parallelizable with 8.4)

F5/F6/F10 are closed. Remaining from the audit, priority order:
1. **F8 — scaffold package.json + README.md.** Cheap (~30 min). Good F8+F9 combo.
2. **F9 — scaffold inline orientation comments.** Cheap. Bundle with F8.
3. **F11 — ugly relative paths past project root.** Medium. Requires CLI path-normalization pass.
4. **F12 — CSS output missing trailing newline.** Low. One-line fix in CSS codegen emit.
5. **F13 — CLI help grammar drift vs README/tutorial.** Low. Audit + update pass.

Recommendation: do F8+F9 batch next session (before or after 8.4 amendments depending on user preference). Both are pure adopter polish.

### 8.6 Non-compliance to close

Per §6:
- Master-list refresh (8 sessions stale).
- Deref SPEC.md.pre-request-patch (must happen before §8.4).
- Ask about SEO-LAUNCH.md once and close the loop.
- Relocate/delete benchmarks/fullstack-react/CLAUDE.md.

---

## 9. Blocked open questions tracked (from insight 20)

- **BOQ-fn-1:** Should `fn` support an opt-in phantom-type parameter (watered-down Rust-typestate answer) for advanced users who want consuming transition witnesses? Set aside per the inline verdict; revisit if gauntlet data shows users still reaching for `fn` to express transitions two years from now.
- **BOQ-fn-2:** Should state-local transition declarations allow `given` guards, or is that redundant with the aggregated machine? Decide at §state amendment-drafting stage.
- **BOQ-fn-3:** The 2026-04-08 "any return type" relaxation is confirmed correct by the inline verdict. R1 self-hosting teams' need for primitive/array returns is real; rolling it back would re-create the pressure that caused the relaxation.

---

## 10. Flip conditions — when the current verdict should be re-opened

- If scrml grows in a direction where life-cycles routinely have 8+ phases with cancellation, retry, and parallel sub-flows (enterprise workflow territory), Koka's effect-row answer starts to look right.
- If gauntlet data AFTER §state amendment ships shows users still producing contrived `fn` examples at the same rate, the diagnosis was wrong and Rust-typestate becomes the fallback.
- If state-local transition declaration form proves syntactically irreconcilable with existing `<State>` literal grammar, Plaid's fix is unachievable at spec-amendment cost and Haskell's "delete `fn` cleanly, live with the external-machine distance" becomes the cheapest alternative.

---

## 11. Staged agents required to progress (inbox dependency)

5 experts must land in `/home/bryan/scrmlMaster/scrmlTS/.claude/agents/` before §8.2 can run:

1. `rust-typestate-progression-expert.md`
2. `plaid-typestate-oriented-expert.md`
3. `koka-algebraic-effects-expert.md`
4. `haskell-purity-minimalist-expert.md`
5. `smalltalk-message-state-expert.md`

Full forge briefs for each are in the master message at `/home/bryan/scrmlMaster/handOffs/incoming/2026-04-20-0030-scrmlTS-to-master-stage-fn-debate-experts.md`.

**Why the 5th (`smalltalk-message-state-expert`) was added beyond the curator's original 4:** the user's close message elevated ergonomics and `<machine>`-as-differentiator to primary re-debate priority. Plaid's model puts transitions on state as **methods**; Smalltalk's model puts transitions on state as **messages**. Same half of the design space, different ergonomic feel. Without Smalltalk, Plaid runs uncontested for the "transitions-on-state" camp and the re-debate would be weaker exactly where the user's priority is highest. Explicit user invitation in their close ("if there are any more agents that need staged given what we see now, add those to the list") authorized this.

---

## 12. If master rejects or questions the staging request

The master message explicitly invites questions over silent-forge-a-weak-agent behavior. If master replies with clarifying questions:

- Read the questions.
- Don't wing the answer. Preserve what's in scope (the debate brief, the verdict, the S31 context) and ask the user to clarify any unclear point.
- If master can't forge one or more experts, the re-debate can still run with fewer — minimum viable is Rust + Plaid + Haskell (the three ends of the design space). Koka and Smalltalk are high-value additions but not gating.

---

## 13. Summary for the next PA — one paragraph

S31 closed 2 adopter fixes (F5 + F6/F10), dismissed F7 as audit error, pushed both to origin/main under one-time user auth, and ran a comprehensive debate on the fate of `fn` with user-added Q2 on state/machine completeness. The curator ran in inline-mode (experts not staged) and produced a credible verdict (insight 20 in scrml-support/design-insights.md): state+machines are ~95% complete with a narrow state-local-transition gap, `fn` should be MINIMIZED not deleted or promoted, E-FN-006 should move to a state-construction-site rule, the 2026-04-08 fn relaxation stays. User elevated the re-run to full fidelity before any amendments land; requested 4+ experts be staged via master; invited additions. Master message sent with 5 experts (curator's 4 + smalltalk-message-state-expert for ergonomic counterpoint). Next PA: process master's staging confirmation, re-run debate with 5 live experts, compare full-fidelity verdict against inline verdict, if ratified draft §48 + §state + §51 amendments through scrml-language-design-reviewer gates. Parallel adopter polish (F8+F9) available if user prefers adopter-first sequencing. Test suite is 7,238 pass / 10 skip / 2 fail, clean. Repo is clean except `docs/SEO-LAUNCH.md` uncommitted 9 sessions (ask once and close).
