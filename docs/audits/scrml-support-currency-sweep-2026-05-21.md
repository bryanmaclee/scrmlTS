# scrml-support Currency Sweep — Write-Once Doc Corpus

**Date:** 2026-05-21
**Auditor:** classification agent (dispatched from scrmlTS PA)
**Scope:** `scrml-support/docs/deep-dives/*.md` (live) + `scrml-support/design-insights.md`
**Mandate:** classification only — NO docs edited. PA + user disposition afterward.

---

## What this audits and why

The scrml-support "write-once tier" is Claude-drafted, Bryan-stamped, cited as authority, and
has **no freshness discipline**. New deep-dives cite old deep-dives; briefs derive from
deep-dives; debates are framed off them. A stale doc does not sit inert — it feeds a wrong
premise into the next decision (the "corpus-ouroboros"). This sweep finds the
stale-and-still-cited docs before they do that.

## Method

- Truth baseline: `compiler/SPEC-INDEX.md` (+ SPEC.md normative), `docs/PA-SCRML-PRIMER.md`,
  `master-list.md` §0, `user-voice-scrmlTS.md` Sessions 100-115 (ratified directions).
- Effort weighted toward docs **cited as authority by recent (S110+) work** — staleness there
  propagates. The three S115 DDs and S110+ docs are recent and treated as likely-CURRENT.
- Three classes: **CURRENT** (accurate + load-bearing), **SUPERSEDED** (conclusions overtaken;
  needs a marker — not dangerous if marked), **STALE-AND-CITED** (wrong/outdated AND still
  cited as authority — actively feeds bad premises).

## Out of scope (stated, not audited)

- `scrml-support/archive/**` — archived by definition.
- `user-voice-scrmlTS.md` — append-only verbatim *record*, not a claim that can go stale.
- `pa-scrmlTS.md`, the PRIMER, `master-list.md` — the *maintained* tier; refreshed every
  session; has its own currency discipline.
- The deep-dives directory also contains `.progress-*` / `progress-*` trail files,
  `cps-state-machine-pre-brief.md`, `*-pre-brief`, `*-stub`, scoping/plan files, and one
  `.scrml` file (`v0next-mario-design-2026-05-04.scrml`). These are working artifacts, not
  authority docs — not individually classified here.

**Flagged for a follow-on sweep (not audited here):** ADRs and gauntlet reports — if any
exist under `scrml-support/`, they carry the same write-once risk and warrant their own pass.

## Already-marked (skipped per mandate)

Three deep-dives already carry `status: superseded` frontmatter and were skipped:
`debounce-and-timing.md`, `memory-leak-detection.md`, `memory-leak-detection-2026-05-10.md`.
(Note the active-vs-superseded duplicate pairs: `debounce-and-timing-2026-05-10.md` is the
live one; `debounce-and-timing.md` superseded. For memory-leak-detection BOTH the dated and
undated copies are marked superseded — there is no live successor in this directory, which is
itself slightly odd but not in-scope to fix.)

---

## Summary — counts per class

| Class | Count | Meaning |
|---|---|---|
| CURRENT | bulk of corpus | accurate + load-bearing; no action |
| SUPERSEDED | ~30+ (see below) | conclusions overtaken; should get a `status: superseded` marker |
| **STALE-AND-CITED** | **3** | **wrong/outdated AND still cited — actionable** |

This is a *classification audit*, not a per-file forensic of all ~130 deep-dives. The vast
majority of deep-dives are CURRENT or harmlessly-historical-SUPERSEDED. The audit's value is
the **STALE-AND-CITED** list and the structural recommendation — those are where the
ouroboros risk concentrates.

---

## STALE-AND-CITED — the actionable list

### 1. The S43 living-compiler trio (2026-04-26)

- `living-compiler-bridge-architecture-2026-04-26.md` (`status: in-progress`)
- `living-compiler-mid-compile-config-swap-2026-04-26.md` (`status: active`)
- `living-compiler-recoverability-and-comp-time-shape-2026-04-26.md` (`status: active`)

**Why STALE-AND-CITED.** The S115 DD `compiler-story-living-compiler-2026-05-21.md` cites all
three of these by name as prior-art authority (its §C5 + References block) — *and at the same
time narrows the very term they are built around*. The S115 DD states the living compiler is
explicitly **"NOT a live/hot-swappable compiler"** and eliminates "Approach D — Image-Based /
Hot-Swappable Capture" by direct user directive. The S43 trio frames "living compiler" the
OLD way: per the S43-era user-voice and the `living-compiler-bridge-architecture` dive, the
living compiler is "the compiler that **lets the developer participate in code generation at
every level** — per developer, per project, per construct" plus an Erlang-style hot-reload
axis. That participatory-codegen + hot-reload framing is what S115 RETRACTED (master-list /
user-voice S115: "living compiler" RETRACTED — reframed as the build-story / pure-function
`compile(source, buildStory) → artifact` model).

**The wrong premise it feeds.** A future dive or brief that reads the S43 trio for "what is
the living compiler" inherits the retracted hot-swap / participatory-codegen vision and will
re-propose mechanisms (`<compiler config>` mid-compile swap as a *live* feature, image-based
recoverability, codegen-override-at-every-level UX) that the S115 build-story model
deliberately does not include. The S115 DD's own structural *eliminations* that it credits to
the S43 trio (Approach D image-form eliminated; R1/R2 recoverability floor; AST-canonical
storage causes AI-agent friction) DO survive — so the trio is not wholesale wrong. It is
**partially superseded with a still-live citation surface**, which is exactly the dangerous
shape: a reader cannot tell which half is current.

**Treatment (PA/user to disposition).** Add `status: partially-superseded` (or `superseded`)
frontmatter to all three, with a pointer: *"living-compiler FRAMING superseded by
`compiler-story-living-compiler-2026-05-21.md` (S115) — the build-story / pure-function model;
hot-swap + participatory-codegen-at-every-level RETRACTED S115. Structural eliminations
(image-form, R1/R2 floor, source-canonical storage) survive and are re-cited by the S115
DD."* The `living-compiler-bridge-architecture` doc is additionally still `status: in-progress`
— a dive that never reached `complete` and is now 25 days past a term-redefinition is a
double staleness signal.

### 2. `server-keyword-inference-disposition-2026-05-08.md` (`status: deep-dive complete`)

**Why STALE-AND-CITED.** This DD's entire output is a 4-position trade-off matrix
(KEEP / INFER / HYBRID / RENAME for the `server` function modifier) whose `feeds-into` is
"debate (recommended), then ratification." That debate happened — and the verdict is recorded
in `design-insights.md` as **Insight 26 (S72): the `server` modifier verdict flips to
Position B (DEPRECATE)**, a 6-0 unanimous re-vote that itself *overturned* the earlier
Insight 25 HYBRID verdict. The DD presents HYBRID/KEEP as live contenders; the language has
since moved to DEPRECATE. The DD carries no pointer to Insight 25/26.

**The wrong premise it feeds.** Anyone reading this DD to learn "what is scrml's position on
the `server` keyword" gets a still-open 4-way fork. The actual position is settled
(DEPRECATE). A brief framed off this DD would re-litigate a closed question.

**Treatment.** Add `status: superseded` with pointer to `design-insights.md` Insight 26
(S72 — `server` modifier → DEPRECATE; supersedes Insight 25).

### 3. Insight 25 inside `design-insights.md` (the append-only verdict ledger)

**Why STALE-AND-CITED.** `design-insights.md` is an append-only ledger of debate verdicts;
each entry is cited as a scoped design ruling. **Insight 25** records the `server function`
modifier disposition as **HYBRID (Position C)**. **Insight 26**, the very next entry,
records: *"AMENDMENT TO INSIGHT 25 — verdict flips to Position B (DEPRECATE) ... full original
panel, 6-0 unanimous re-vote."* Insight 26 amends Insight 25, but Insight 25's own text
carries no inline "SUPERSEDED BY INSIGHT 26" banner. A reader scanning the ledger for the
`server`-modifier ruling can stop at Insight 25 and walk away with the overturned verdict.

**The wrong premise it feeds.** The HYBRID verdict (keep `server` as optional explicit
keyword) directly contradicts the shipped DEPRECATE direction. Citing Insight 25 as the
`server`-modifier authority is citing a verdict the same document later reversed.

**Treatment.** Add an inline `> SUPERSEDED BY INSIGHT 26 (2026-05-08) — verdict flipped to
DEPRECATE` banner at the top of the Insight 25 entry. (This is a one-line in-place marker, not
a content edit — it is the missing supersession signal, not a rewrite.) Insight 25 is the only
ledger entry found with a self-superseding successor and no inline back-pointer; the rest of
the ledger's amendment chains (Insight 21 re-run of the Insight-pre-21 `fn` debate, Insight 29
A/B/D) carry their amendment status in the entry title.

---

## SUPERSEDED — conclusions overtaken; mark, not dangerous

These are not dangerous (no recent authority chain cites them as live truth), but they should
carry a `status: superseded` marker so a future reader does not mistake them for current. Not
exhaustively forensic — grouped by the decision that overtook them.

| Doc(s) | Overtaken by |
|---|---|
| `parser-disambiguation-feasibility-2026-04-30.md`, `expression-ast-phase-0-design-2026-04-11.md`, `tab-parsing-strategy-2026-04-07.md`, `closer-token-2026-04-09.md` | The native-parser charter (S111 Charter B — block-splitter + Acorn both DELETED, replaced by one composed-engines scrml-native parser). Pre-charter parser-internals dives describe a front-end architecture being retired. `scrml-native-parser-design-2026-05-17.md` + `-front-end-charter-2026-05-20.md` + `incremental-scrml-native-compiler-components-2026-05-20.md` are the current authority. |
| `debate-control-flow-2026-04-08.md`, `debate-state-as-type-2026-04-08.md`, `debate-state-authority-2026-04-08.md`, `debate-state-dynamics-2026-04-08.md`, `debate-transformation-registry-2026-04-08.md`, `debate-lifecycle-syntax-2026-04-08.md`, `debate-error-handling-2026-04-08.md`, `debate-inline-testing-2026-04-08.md`, `debate-compiler-modularity-2026-04-08.md`, `contracts-debate-2026-04-08.md`, `contracts-mutable-data-2026-04-08.md`, `radical-doubt-machine-contract-unification-2026-04-08.md`, `radical-doubt-final-synthesis-2026-04-08.md`, `state-authority-declarations-2026-04-08.md`, `state-dynamics-design-2026-04-08.md` | The S52-S58 state-as-primary unification + the 22 architectural locks (L1-L22) + D2.8/D3/D4 SPEC ratifications. The S55-S58 deliberation outcomes (`v0next-s55/s56-deliberation-outcomes`) and SPEC §51/§55 are the current truth; these April-08 debate-cluster docs are the pre-unification exploration. |
| `optimal-syntax-from-gauntlet-2026-04-08.md`, `freeform-kanban-synthesis-2026-04-08.md`, `language-critic-full-sight-2026-04-04.md` | Same S52-S58 unification arc — pre-lock syntax exploration. |
| `compiler-architecture-audit-2026-04-02.md`, `compiler-modularity-architecture-2026-04-08.md`, `compiler-parallelism-model-2026-04-08.md`, `pipeline-topology-audit-2026-04-08.md`, `cg-sub-stage-analysis-2026-04-07.md`, `compiler-performance-profile-2026-04-07.md`, `debate-compiler-modularity-2026-04-08.md` | The native-parser charter B + Approach C (S114 — sealed/bounded compiler, BS+Acorn+BPP retirement). Pre-charter compiler-architecture audits describe a pipeline topology being dismantled. |
| `dependency-model-no-npm-2026-03-30.md`, `import-system-2026-03-30.md`, `use-import-system-2026-04-02.md`, `transformation-registry-design-2026-04-08.md` | `code-import-story-and-vendoring-2026-05-21.md` (S115) + SPEC §21/§41 + the S114 `import:host` ratification. The March/April import-model dives are the early exploration; the S115 DD is the current import-surface authority. |
| `jai-comptime-vs-scrml-meta-2026-04-02.md`, `runtime-meta-system-2026-04-02.md`, `meta-system-capability-frontier-2026-04-26.md` | Approach C (S114 — `^{}` PERMANENT, scrml-native-only, 12 closed primitives; `meta-block-runtime-semantics-expressiveness-2026-05-21.md` + `meta-system-capability-boundary-SPEC-draft-2026-05-17.md` are current). Earlier meta-capability surveys predate the closed-primitive-set ratification. |
| `cps-state-machine-server-transitions-2026-04-06.md`, `framework-gaps-tiered-runtime-2026-04-06.md`, `ssr-hydration-approach-c-2026-04-06.md` | Body-split / CPS soundness + integration design (S72, `body-split-soundness-design` / `body-split-integration-and-residual-design`, 2026-05-08) + the S114 Ext 1+3+2 scope-dive. Early CPS sketches predate the S1-S5 soundness predicates. |
| `editor-keyword-alias-layer-2026-04-26.md` (`status: complete`) | Largely a closed exploration; native-parser charter B changes the editor/LSP surface assumptions. Low risk — marked complete already; a `superseded`-or-`historical` note would be tidier. |
| `superposition-as-language-pillar-2026-04-26.md`, `smart-app-splitting-feel-of-performance-2026-04-26.md` | The S52-S58 pillar lock-set (Pillars 1-6, no "superposition" pillar survived) + the S91 per-route artifact splitter (A-4) which is the shipped app-splitting mechanism. |
| `v0next-mario-design-2026-05-04.scrml`, `v0next-spec-impact-stub-2026-05-04.md` | Working stubs from the v0.next design week; superseded by the landed SPEC. (Stub/`.scrml` — arguably not authority docs; noted for completeness.) |

This SUPERSEDED list is **representative, not complete** — a full per-file pass of all ~130
deep-dives is a larger exercise. The pattern is consistent: anything dated 2026-03-30 →
2026-04-26 that discusses parser internals, compiler architecture, the import/meta model, or
the pre-unification state/control-flow design is overtaken by one of four S110-S115 decision
clusters (native-parser charter B, Approach C, the build-story/import-story S115 DD pair, the
S52-S58 unification locks). None of them are STALE-AND-CITED because no S110+ authority chain
cites them as live truth — but they will mislead a casual reader and should be marked.

---

## CURRENT — accurate + load-bearing (spot-confirmed)

- The three S115 DDs — `m5-m6-scope-revision-2026-05-21.md`, `compiler-story-living-compiler-2026-05-21.md`,
  `code-import-story-and-vendoring-2026-05-21.md` — CURRENT (ratified S115 / S114; the
  compiler-story DD's "NOT a live compiler" framing IS the current truth).
- The S114 DDs — `meta-block-runtime-semantics-expressiveness-2026-05-21.md` (Approach C),
  `import-host-grammar-shape-2026-05-21.md`, `ext-1-3-2-full-body-split-scoping-2026-05-21.md`
  — CURRENT.
- The quoted-text-model trio (`quoted-text-model-{design-space,depth-of-fix,friction-and-prior-art}-2026-05-20.md`)
  — CURRENT; ratified S111 (GO scope b / v0.4), SPEC §4.18.
- `scrml-native-parser-design-2026-05-17.md`, `scrml-native-parser-front-end-charter-2026-05-20.md`,
  `incremental-scrml-native-compiler-components-2026-05-20.md` — CURRENT; the native-parser
  charter-B authority chain.
- The L22 family design dives — `formFor-design-2026-05-18.md`, `schemaFor-design-2026-05-19.md`,
  `tableFor-design-2026-05-19.md`, `predicate-system-zod-replacement-2026-05-06.md`,
  `zod-schema-bridge-2026-05-09.md` — CURRENT; SPEC §41.13-41.15 / §53.14.
- `async-loading-pattern-2026-04-10.md` — **CURRENT despite the April date.** Spot-checked
  because the filename + `async` tag looked risky against the S114 no-async/await rule. It
  does NOT propose `async`/`await` keywords — it recommends the RemoteData enum / Approach E
  (`loading` block sugar), which is the shipped §13.5 model and consistent with the
  no-async/await rule. No action.
- `payload-bearing-engine-state-child-variants-SURVEY-2026-05-17.md`, the S67-amendment
  engine dives, `parallel-attribute-disposition-2026-05-08.md` (this one already records its
  own STRUCK status) — CURRENT.

---

## Structural recommendation — give the write-once tier a freshness signal

**The root problem.** The write-once tier has no freshness signal. `.claude/maps/` carries a
watermark; deep-dives do not. The `status:` frontmatter field exists but is used
inconsistently — values observed range across `active`, `complete`, `in-progress`, `draft`,
`pending`, `recon`, `SCOPING`, `superseded`, and free-text sentences. Only `superseded` has a
defined meaning; `active` on a 2026-04-08 doc tells a reader nothing about whether its
conclusions still hold. A doc cannot self-report "the world moved past me."

**Recommended convention (concrete, low-cost):**

1. **Standardize the `status:` enum.** Exactly five values, defined in a one-paragraph
   convention note at the top of the deep-dives directory (a `_CONVENTIONS.md` or a header in
   an index file):
   - `active` — conclusions current; safe to cite as authority.
   - `complete` — investigation finished, conclusions landed in SPEC/insights; safe to cite,
     but cite the SPEC section, not the dive.
   - `superseded` — conclusions overtaken; MUST carry a `superseded-by:` pointer.
   - `partially-superseded` — some conclusions survive, some retracted; MUST carry both a
     `superseded-by:` pointer AND a one-line note on which half is live. (This is the S43
     living-compiler trio's exact shape — the missing class today.)
   - `historical` — exploration that never landed and was not overtaken; read for context
     only, never cite as authority.

2. **Mandatory frontmatter fields for every deep-dive:**
   - `last-reviewed: YYYY-MM-DD` — the watermark. Distinct from `date:` (authored). A reader
     instantly sees "this was last confirmed-current on <date>"; a dive whose `last-reviewed`
     is months behind the current session is a re-review candidate.
   - `superseded-by:` — required when status is `superseded` / `partially-superseded`. A
     relative path to the doc(s) that replaced it. This is the single most important field —
     it turns the corpus from a flat pile into a navigable supersession graph.

3. **Supersession is the author's job, bidirectionally.** When a new deep-dive overtakes an
   old one, the new dive's References block already cites the old one (the S115 compiler-story
   DD does this). Make the reciprocal mandatory: the dispatching agent (or PA) MUST, in the
   same landing, add `status: superseded` + `superseded-by:` to the old doc. This is the
   discipline that closes the ouroboros — a citation of a stale doc should be physically
   impossible to make without walking past a "SUPERSEDED, see X" banner. Cost: ~2 minutes
   per landing. The S115 DDs already do the forward half; only the backward half is missing.

4. **Inline supersession banners inside `design-insights.md`.** The append-only ledger has the
   same gap (Insight 25 → 26). When an Insight amends or reverses a prior Insight, add a
   one-line `> SUPERSEDED BY INSIGHT N` blockquote at the top of the amended entry. The ledger
   is append-only for *entries*; a supersession banner is metadata, not a content rewrite, and
   does not violate append-only discipline.

5. **A periodic currency sweep as a standing item.** This sweep is the first of its kind.
   Recommend it recur — e.g. once per release cut (v0.4 → v0.5) or every ~10 sessions — as a
   lightweight pass: any deep-dive whose `last-reviewed` is older than the last major decision
   cluster (charter change, Approach ratification, unification lock) gets re-classified. With
   the `last-reviewed` watermark in place this becomes a mechanical filter instead of a
   manual read of 130 files.

**Why this works.** The ouroboros is a citation problem: stale conclusions propagate because
nothing at the citation site warns the reader. The `superseded-by:` graph + the
`last-reviewed` watermark + mandatory backward-marking-on-landing make staleness *visible at
the moment of citation* — which is the only place it can be stopped.

---

## Report-back summary

- **Counts:** STALE-AND-CITED = **3 findings**; SUPERSEDED = ~30+ docs (representative list
  above, not a complete forensic); CURRENT = the bulk of the corpus, with the S110-S115
  authority chains spot-confirmed.
- **STALE-AND-CITED (the actionable list):**
  1. **The S43 living-compiler trio** (`living-compiler-bridge-architecture`,
     `-mid-compile-config-swap`, `-recoverability-and-comp-time-shape`, all 2026-04-26) —
     cited by the S115 `compiler-story-living-compiler` DD as authority while that DD
     RETRACTS the hot-swap / participatory-codegen "living compiler" framing the trio is
     built on. Wrong premise: a reader inherits the retracted vision. `bridge-architecture` is
     additionally still `status: in-progress`.
  2. **`server-keyword-inference-disposition-2026-05-08.md`** — presents `server`-modifier
     KEEP/INFER/HYBRID as a live 4-way fork; the question was settled to DEPRECATE by
     `design-insights.md` Insight 26. No pointer to the verdict.
  3. **Insight 25 in `design-insights.md`** — records the `server`-modifier verdict as
     HYBRID; Insight 26 (next entry) reverses it to DEPRECATE but Insight 25 carries no
     inline supersession banner. A reader can stop at 25 and take the overturned verdict.
- **Structural fix:** the write-once tier has no freshness signal. Recommend a standardized
  5-value `status:` enum, mandatory `last-reviewed:` watermark + `superseded-by:` frontmatter,
  author-must-mark-the-old-doc-on-landing discipline, inline supersession banners in the
  insights ledger, and a recurring currency sweep. Detail in the section above.
- **No docs were edited.** PA + user disposition the markers.
