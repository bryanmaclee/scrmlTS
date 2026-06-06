# scrmlTS — Session 168 (CLOSE)

**Date:** 2026-06-06
**Previous:** `handOffs/hand-off-172.md` (= S167 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-173.md` at next OPEN.
**Profile:** opened **A (FULL)** ("once session full start. start the map arc"; default A). Ultracode ON.

## 🏁 S168 CLOSE — map-arc Phase a+b LANDED (cycles-prereq + §59 SPEC) + language-inspiration audit (synthesis→critic→currency-corrected) · `wrap and push`

A heavy session. Opened on **"start the map arc"** → **caught that the cycles-FORBID disposition the
RATIFIED-DESIGN/master-list called "ratified" was actually UNRATIFIED PA-inference** (the DD's own
S95-corrigendum guardrail) → user ruled it (**cycles FORBID + make-acyclic-true**, **COW-all** impl) →
**Phase a: cycles-prereq LANDED** (`8d9db4e1`, pushed) → **Phase b: SPEC §59 Value-Native Maps LANDED**
(Nominal, `4c8063b6`, reviewer-gated rev-2). Mid-session the user added **"audit which languages inspired
scrml — credit where credit is due"** → a 5-phase workflow chain (synthesis → completeness-critic →
gap-closure → **currency-pass [user-flagged inaccuracy via the `bun.eval` probe] → correction**) produced
the corrected audit. Also: **README `=>`/`->`→`:>`** migration (pushed); **`:>`-provenance** proven public
(scrml8 2026-04-07 / scrmlTS 2026-04-14). `wrap and push`.

### SYNC / REPO STATE AT CLOSE
- **scrmlTS:** HEAD = the S168 wrap commit (maps refresh + hand-off/master-list/changelog) atop **§59
  `4c8063b6`** atop README `23ef9907` atop cycles-prereq `8d9db4e1`. **PUSHED this wrap.**
- **scrml-support:** HEAD `4d1b22e` (audit v3 + currency-changelog) atop `2127c00` (§59 draft + user-voice
  S168 ratifications). **PUSHED this wrap.**
- **Version:** v0.7.0 (no cut — SPEC §59 is Nominal/spec-ahead; cycles-prereq is reactivity-internal; no tag, no cross-repo notice [map unbuilt]).
- **Tests:** **23,091 pass / 0 fail / 220 skip / 1 todo / 916 files** (+16 cycles-prereq; §59 + maps + docs are non-test). within-node 1005/0 (confirmed at pre-push).
- **known-gaps:** HIGH 1 (Bug B — structural-compound deep-set mistarget, codegen, OPEN, unchanged) · MED 9 · LOW 16. (No bug work this session — map was design + the prereq.)
- **Maps:** **refreshed to `4c8063b6`** (wrap 6c — 5 maps: primary/structure/test/error/domain; project-mapper verified writes landed; watermark advanced).
- **Worktrees:** main only (both S168 dispatch worktrees cleaned at wrap).
- **Inbox:** empty. No outbound notices due (SPEC §59 Nominal, map unbuilt; no giti/6nz/scrml/master notice). **Hooks:** Config B.

### ★ THE GATING FINDING (must resolve before ANY map-prereq dispatch)
**The cycles-FORBID disposition is NOT user-ratified — it is PA inference that propagated into
"ratified"-labeled docs.** Verified against verbatim user-voice:
- S166 (you): *"I dont know how I feel about cyclic refs, its vestigial of oop in my opinion. I
  don't even know if I want to allow them."* — a LEAN, not a ruling.
- S166-close STILL-OPEN list (verbatim): *"the cycles disposition (forbid via bracket-write-fix+barrier,
  vs make-safe via cycle-guards) — NB the user has not explicitly ruled on value-CYCLES, only on
  OOP-identity constructs."*
- S167 user-voice: NO cycles ruling. Yet `RATIFIED-DESIGN.md` ship-gate says *"the S166 cycles
  ruling — already ratified"* and master-list S166 addendum lists *"cycles → FORBID"* as a
  ratification. **Both over-assert.** The DD (`scrml-support/docs/deep-dives/scrml-data-model-value-vs-object-2026-06-05.md`)
  EXPLICITLY flagged the S95-corrigendum guardrail on this exact point (lines 187/197): *"the user
  has NEVER spoken on value-cycles — 'acyclic' is PA inference; surface it explicitly, do not present
  as already-ratified."*

**The map arc's HARD ship-gate (the cycles-prereq) rests on this unratified axiom.** PA STOPPED before
dispatch and put the disposition question to the user (per Rule 4 verify-derived-claims + Rule 5
shoot-straight/ask + `feedback_no_batch_ratify_foundational_axioms` + `feedback_verify_before_claim`).

### THE MAP ARC STRUCTURE (S167 RATIFIED-DESIGN.md — the design IS landed)
`docs/changes/map-type-2026-06-06/RATIFIED-DESIGN.md` carries the full ratified surface (bracket-read
+ method-write hybrid; `[KeyT:ValT]`; any §45-comparable key; §47 codec key-hash; unordered+loud;
lossless codec). Three phases:
1. **(a) Cycles-prereq (HARD ship-gate) — BLOCKED on the disposition ruling above.** Two pieces:
   (i) seen-set guard in `_scrml_structural_eq` (runtime-template.js:2491 — verified: `a===b`
   fast-path at 2492, then recurses with NO seen/WeakSet guard → RangeError on `==` of two
   distinct-but-equal cyclic values; a real latent crash bug independent of maps); (ii) the
   cycles-forbid barrier (reject-on-cycle at cell-assignment + route `@arr[i]=x` bracket-write
   through COW). **Open impl sub-fork (DD line 202):** route-all-bracket-writes-through-COW (changes
   array-element-write semantics, consistent w/ dotted-path) vs statically-reject-self-referential-
   index-assignment-only (narrower; leaves non-self bracket writes raw-in-place). Root cause locus:
   `ast-builder.js:5455` (path-collector gates on `peek().text==="."`; bracket targets fall to
   bare-expr fallback ~5517 → verbatim in-place emit).
2. **(b) Map SPEC §** — grammar/literal/access/method-surface/key-hash/iteration/codec/E-codes (after prereq).
3. **(c) Build decomposition** — type-system → parser → runtime → codegen; Set follows decoupled;
   130 self-host `new Map`/`new Set` sites ride the P3 value-native-self-host bridge (NOT a v1 blocker).

### RULED S168 (the gating axiom — RESOLVED) + DISPATCH IN FLIGHT
- **CYCLES DISPOSITION:** user ruled **FORBID + make-acyclic-true** (AskUserQuestion). Closes the
  S166-open axiom; user-voice S168 appended; RATIFIED-DESIGN.md + master-list S166 "already ratified"
  label was a PA-inference propagation (to reconcile at wrap).
- **BRACKET-WRITE IMPL SHAPE:** user ruled **COW-all + seen-guard now; JS-host barrier follows**.
  Representation: extend `reactive-nested-assign.path` `string[]` → `(string | {index: ExprNode})[]`.
- **DISPATCH 1 — LANDED + PUSHED (`8d9db4e1`):** cycles-prereq — Landing 1 seen-set guard in
  `_scrml_structural_eq` + Landing 2 parser bracket-write COW + Landing 3 computed-index codegen
  (`reactive-nested-assign.path` → `(string|{index})[]`). Phase-0 confirm-gate PASS (rep cleanly covers
  all 11 consumers). PA-independent R26 PASS (computed COW / self-ref→stale snapshot / reads verbatim,
  all node --check clean). +16 tests, 0 regressions (23075→23091). agent `a938bb754f790271a`
  (FINAL_SHA 78a7fc81). Maps' "acyclic keys" precondition now TRUE by construction. JS-host
  Appendix-D barrier deferred (separate follow-on). Worktree retained until wrap (S67).
- **README doc-currency — LANDED + PUSHED (`23ef9907`):** migrated 6 match-arm + 1 handler-arm + 1
  prose arrow-separators `=>`/`->` → `:>` (S147 canonical; user S168 flagged). Arrow-fn lambdas +
  fn-return `->` + attribute `to=>`/`story=>` untouched. Resolved a pre-existing internal inconsistency
  (one `!{}` handler example was already `:>`). Kickstarter + primer already `:>`-canonical (README-only).
- **PUSH: DONE** (`7c3f4e6b..23ef9907 main→main`; pre-push full suite 23091/0 + TodoMVC PASS; origin synced 0/0). HEAD `23ef9907`.

### COMMITTED (held from push, per "commit then I'll read") + §59 LANDING IN FLIGHT
- **scrml-support `2127c00`** — value-native-map design records: user-voice S168 cycles/COW ratifications
  + the §59 reviewed draft. **scrml-support `edb299a`** — the language-inspiration audit doc
  (`docs/language-inspiration-audit-2026-06-06.md`). Both HELD (scrml-support 0/2 vs origin; user reads first).
- **⚠ AUDIT CURRENCY ISSUE (user-flagged) — currency-pass IN FLIGHT (`wo5hlo15v` / `wf_bb7ba0b0-325`).** The
  audit is corpus-synthesized (graded KIND, did NOT currency-check the scrml side) → carries stale claims.
  CONFIRMED: the Zig/`bun.eval` attribution describes a RETIRED user-facing surface — `bun.eval()` is
  COMPILER-INTERNAL ONLY today (SPEC §30; the `${ bun.eval() }` user surface retired S130 / §22.12 Approach C).
  Likely siblings: `<machine>`→`<engine>`, `@shared` removed, `->`→`to` lifecycle, `=>`→`:>` arm. The
  currency workflow runs 5 verifiers vs live SPEC/PRIMER/code → flags + corrections → collate.
  **CURRENCY PASS DONE: 26 of 67 scrml-side claims NON-CURRENT** (~23 nominal-spec-ahead / 20 changed / 11
  retired / 6 renamed / 4 never-existed occurrences). Clusters: the value-native MAP family ~10 (credited
  shipped — it's the IN-FLIGHT S168 arc); build-story §58 (Nominal); routing ~5 (file-based credited but
  scrml routing is INFERENCE §12); `bun.eval` (retired user surface); glyph migrations (`(A->B)`→`(A to B)`,
  `transitions{}`→`rule=`, `<machine>`→`<engine>`); event-payload "absence" CLOSED S154 §51.0.S; overload
  "scrml shipped by accident" DELETED S64. **CORRECTION DISPATCHED (agent `a7235a0517d063be9`):** rewords
  each stale claim in place with an accurate-today STATUS tag (shipped/ratified-design/nominal-spec-ahead/
  renamed/closed-deleted), preserves all credits + KIND, re-grounds in live SPEC. **DONE + LANDED + HELD
  (`4d1b22e`, scrml-support 0/2 vs origin — amended the audit commit; + sibling currency-changelog).**
  STATUS tags: shipped 10 / ratified-design 12 / nominal-spec-ahead 7 / closed-deleted 7 / renamed 2 /
  changed 3. The correction ALSO caught an error my own gap-closure introduced (the Remix `<page route=>`
  override is forbidden) + the routing SPEC-locus (§40/§47.9.2 not §20.4). Map family carries a post-pass
  note (§59 landed concurrently → it's [nominal-spec-ahead] §59, not [ratified-design]). (Lineage was
  sound; only currency framing was wrong — ~40% of scrml-side claims drifted because the corpus got ahead
  of the code. The layered synthesis→critic→revision→currency→correction caught it before publish.)
- **§59 SPEC.md landing — LANDED + HELD (`4c8063b6`, scrmlTS 0/1 vs origin).** Reviewer rev-2 applied,
  PA-reviewed (the §42.3.1 union-`not` rule, 7 §34 rows, §59.3 ternary-exclusion, additive TOC all verified
  in the diff), file-delta'd + committed, HELD from push. SPEC.md 31,551→31,754; section count 58→59; 0
  regressions. **MINOR FOLLOW-UP:** §6.2 "no anonymous record/map annotation type" now coexists with the
  §59 Nominal map type — a one-line §6.2 cross-ref to §59 (Nominal) would close the surface inconsistency
  (not blocking; §59's Nominal banner clarifies §6.2 reflects the shipped type system). (Original dispatch
  brief detail:) Applied reviewer
  rev-2 (B1 ternary-exclusion / B2 Acorn note / B3 §42 union-`not`-normalization micro-statement + 6 missing
  + 5 non-blocking) → lands §59 (Nominal) + §45/§47/§42/§57/§6.5/§14 amendments + 7 §34 rows (4 E-MAP-* + 3
  W-MAP-*; E-EQ-003 reused) + TOC + SPEC-INDEX regen. BRIEF.md archived
  `docs/changes/map-spec-section-59-2026-06-06/BRIEF.md`. **On completion:** PA review → S147 coherence →
  file-delta land (SPEC.md + SPEC-INDEX + any test) → PA commit (HOLD push) → Phase (c) build decomposition.

### §59 reviewer-gate detail (agent `a5d17ed5`, DONE: READY-WITH-CHANGES)
- Design HELD;
  reviewer independently VERIFIED soundness vs SPEC + the as-built prereq `8d9db4e1` (acyclic-keys
  termination via the real WeakMap seen-guard; hash-consistency from §45; the `E-MAP-BRACKET-WRITE`
  prereq-COW interaction is genuinely real; no-identity/reassignment alignment; Nominal matches §58).
  DRAFT at `scrml-support/archive/spec-drafts/value-native-map-S168-DRAFT.md`. **rev-2 to apply** (3
  BLOCKING: B1 §59.3 ternary-collision in the depth-1-colon rule [real grammar bug — exclude the ternary
  alt-colon]; B2 Acorn-path note [`["k":v]` isn't valid JS → needs preprocessForAcorn rewrite/plugin,
  word-or/and precedent]; B3 §42 cites a `not|not≡not` idempotence §42 doesn't state → the §42 amendment
  must INTRODUCE union-`not`-absorption as a NEW micro-statement) + 6 missing (W-MAP-STRUCT-KEY-LITERAL
  code; nested-map example; `.insertAll` pairs-shape; iteration positional-correspondence; map-vs-nonmap
  ==→E-EQ-001; duplicate-literal-key last-wins + optional W-MAP-DUPLICATE-LITERAL-KEY) + 5 non-blocking.
  **Forks resolved (reviewer, PA concurs):** Q2 bracket-write = HARD-ERROR+fix-it; Q6 struct-key-literal
  = parse-accept+codegen-defer+Info; Q1/Q3/Q4/Q5/Q7 = as drafted. **AWAITING user green-light** to apply
  rev-2 + land §59 in SPEC.md as Nominal (+ amendments + §34 rows + SPEC-INDEX regen, one commit) → then
  Phase (c) build decomposition.
- **Language-inspiration audit** (workflow `wf_8bc50c26-362` DONE → revision agent `af73736ba2bcc4410`
  IN FLIGHT). First synthesis: **153 attributions, 30 languages**, top-5 Roc / Rust / SPARK-Ada /
  Erlang-Elixir / Svelte-Vue → `/tmp/scrml-inspiration-audit.md`. Completeness critic caught real gaps
  (the value of the critic pass): 7 uncredited DECISIONS (markup control-flow `if=`/`for=`/`:key` →
  Vue/Svelte/Solid; key= reconciliation; auto-await colorless-async → Go/effect-handlers/React-use;
  **CPS server→state boundary → Elm Architecture gold-standard** + Next/Remix/SvelteKit; state-authority
  → Phoenix-LiveView/HTMX; file-routing → Next/SvelteKit/Nuxt/SolidStart; reactive-CSS/Tailwind) + 3
  under-credited (Go, HTMX, XState/SCXML/Harel for the engine lineage). Revision agent verifies each vs
  the named source docs + integrates → `/tmp/scrml-inspiration-audit-v2.md`. **DONE + PA-REVIEWED (PASS):**
  391 lines, 27 languages, KIND 44 borrowed / 13 convergent / 91 prior-art-compared / 30 rejected
  (conservative, not inflated); 9/10 gaps verified-and-integrated; 1 honest non-verification (auto-await
  "colorless/goroutine" lineage absent from corpus → credited only React-19 use()/Suspense; documented in
  Appendix). **READY TO LAND** at `scrml-support/docs/language-inspiration-audit-2026-06-06.md` (internal-
  first; seeds a public ACKNOWLEDGMENTS doc if user wants). **AWAITING user go** (scrml-support commit).

### OPEN QUESTIONS / NEXT (S168)
1. **MAP ARC Phase (b):** §59 drafted; reviewer-gate in flight (above). Phase (c) build decomposition
   follows the land (type-system → parser → runtime → codegen; Set decoupled; 130 self-host sites ride P3).
2. **Inspiration audit** in flight (above) — user directive "credit where credit is due."
3. **JS-host reject-on-cycle barrier** (Appendix-D hatch follow-on; part of make-acyclic-true; not a maps
   blocker; zero adopter usage).
4. Bug B (structural-compound deep-set mistarget, HIGH, codegen-retarget at emit-logic.ts:3003).
5. The JS-host scalar-gap (value-native parseInt/Math.round/Date.now) — queued JS-host sub-thread.
6. **Reconcile the ouroboros at wrap:** RATIFIED-DESIGN.md + master-list S166 both pre-asserted cycles
   "ratified"; genuinely ruled S168 — re-stamp as S168.
7. **`:>`-provenance** established this session (scrml8 `9555f7c` 2026-04-07 / scrmlTS `80c7d5d5`
   2026-04-14 "canonical match arm operator"; public) — user wanted proof vs Teej's screenshot. (No action; recorded.)

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter. Profile A/B. `full wrap` / 88% floor. wrap step 6c maps refresh.
- Dispatch discipline: S88 isolation explicit · F4 startup-verify · S112 merge-startup · S99/S126
  Bash-edit + no-`cd` (S100 hook) · S136 BRIEF.md archival · S138 R26 / PA-independent dual-verify ·
  S147 branch-leak coherence. S164 background-commit-race (wait for completion notification).
- `feedback_no_batch_ratify_foundational_axioms` (S166) — cycles disposition is axiom-level → one
  question, DD as substrate, NOT a batch rubber-stamp.

## Tags
#session-168 #profile-a-full-start #map-build-arc #cycles-disposition-unratified #ouroboros-caught #spec-rule-4 #s95-corrigendum-guardrail
